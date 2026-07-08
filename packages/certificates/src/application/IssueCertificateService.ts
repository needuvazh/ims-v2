import { prisma } from '@ims/database';
import { DomainError, ErrorCodes } from '../domain/errors';
import {
  IssueCertificateCommand,
  IssueCertificateCommandSchema,
} from '../domain/validators';
import { AuditPort, NotificationPort } from '../ports';

export class IssueCertificateService {
  constructor(
    private readonly auditPort: AuditPort,
    private readonly notificationPort: NotificationPort,
  ) {}

  async execute(
    command: IssueCertificateCommand,
    actorUserId: string,
  ): Promise<void> {
    const validated = IssueCertificateCommandSchema.parse(command);

    // 1. Fetch certificate
    const certificate = await prisma.certificate.findUnique({
      where: { id: validated.certificateId },
    });

    if (!certificate) {
      throw new DomainError(
        ErrorCodes.CERTIFICATE_NOT_FOUND,
        `Certificate ${validated.certificateId} not found`,
      );
    }

    // 2. Validate state transition (must be Generated to be Issued)
    if (certificate.certificateStatus !== 'Generated') {
      throw new DomainError(
        ErrorCodes.INVALID_STATE_TRANSITION,
        `Cannot issue certificate in status: ${certificate.certificateStatus}`,
      );
    }

    // 3. Optimistic concurrency check (version check)
    if (certificate.version !== validated.expectedVersion) {
      throw new DomainError(
        ErrorCodes.VERSION_CONFLICT,
        `Certificate version conflict: expected ${validated.expectedVersion}, got ${certificate.version}`,
      );
    }

    // 4. Update status in database
    await prisma.certificate.update({
      where: { id: validated.certificateId },
      data: {
        certificateStatus: 'Issued',
        issuedDate: new Date(),
        issuedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    // 5. Audit the issuance
    await this.auditPort.logAction(
      'CERTIFICATE_ISSUED',
      actorUserId,
      validated.certificateId,
      {
        certificateNumber: certificate.certificateNumber,
        issuedReason: validated.issueReason,
      },
    );

    // 6. Notify student via recipient userId (studentProfile holds user account references or direct lookup)
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: certificate.studentProfileId },
    });
    if (studentProfile) {
      await this.notificationPort.requestNotification(
        'CERTIFICATE_ISSUED',
        studentProfile.personId, // Recipient is the person / student
        {
          certificateNumber: certificate.certificateNumber,
          verificationCode: certificate.verificationCode,
        },
      );
    }
  }
}
