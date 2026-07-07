import { prisma } from '@ims/database';
import { DomainError, ErrorCodes } from '../domain/errors';
import { RevokeCertificate, RevokeCertificateSchema } from '../domain/validators';
import { AuditPort } from '../ports';

export class RevocationService {
  constructor(private readonly auditPort: AuditPort) {}

  async execute(command: RevokeCertificate, actorUserId: string): Promise<void> {
    const validated = RevokeCertificateSchema.parse(command);

    const certificate = await prisma.certificate.findUnique({
      where: { id: validated.certificateId }
    });

    if (!certificate) {
      throw new DomainError(ErrorCodes.CERTIFICATE_NOT_FOUND, 'Certificate not found');
    }

    if (certificate.certificateStatus !== 'Issued' && certificate.certificateStatus !== 'Generated') {
      throw new DomainError(
        ErrorCodes.INVALID_STATE_TRANSITION,
        `Cannot revoke certificate in status: ${certificate.certificateStatus}`
      );
    }

    if (certificate.version !== validated.expectedVersion) {
      throw new DomainError(
        ErrorCodes.VERSION_CONFLICT,
        `Certificate version conflict: expected ${validated.expectedVersion}, got ${certificate.version}`
      );
    }

    // Perform database update, setting revocation columns physically
    await prisma.certificate.update({
      where: { id: validated.certificateId },
      data: {
        certificateStatus: 'Revoked',
        revokedAt: new Date(),
        revokedBy: actorUserId,
        revocationReason: validated.reason,
        version: { increment: 1 }
      }
    });

    // Audit the revocation
    await this.auditPort.logAction('CERTIFICATE_REVOKED', actorUserId, validated.certificateId, {
      certificateNumber: certificate.certificateNumber,
      reason: validated.reason
    });
  }
}
