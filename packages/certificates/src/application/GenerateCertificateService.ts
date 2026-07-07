import { prisma } from '@ims/database';
import { DomainError, ErrorCodes } from '../domain/errors';
import { GenerateCertificateCommand, GenerateCertificateCommandSchema } from '../domain/validators';
import {
  EnrollmentReadPort,
  CompletionReadPort,
  FinanceValidationPort,
  NumberingPort,
  AuditPort
} from '../ports';
import { saveLocalMockPdf } from '../infrastructure/PdfHelper';

export class GenerateCertificateService {
  constructor(
    private readonly enrollmentReadPort: EnrollmentReadPort,
    private readonly completionReadPort: CompletionReadPort,
    private readonly financeValidationPort: FinanceValidationPort,
    private readonly numberingPort: NumberingPort,
    private readonly auditPort: AuditPort
  ) {}

  async execute(command: GenerateCertificateCommand, actorUserId: string): Promise<string> {
    const validated = GenerateCertificateCommandSchema.parse(command);

    // 1. Fetch enrollment context
    const context = await this.enrollmentReadPort.getEnrollmentContext(validated.enrollmentId);
    if (!context) {
      throw new DomainError(ErrorCodes.ENROLLMENT_NOT_FOUND, `Enrollment ${validated.enrollmentId} not found`);
    }

    // 2. Check branch-scoping if requestedBranchId is provided
    if (validated.requestedBranchId && context.branchId !== validated.requestedBranchId) {
      throw new DomainError(ErrorCodes.BRANCH_SCOPE_DENIED, 'Access denied for this branch');
    }

    // 3. Verify completion approval
    const isCompleted = await this.completionReadPort.isCompletionApproved(validated.enrollmentId);
    if (!isCompleted) {
      throw new DomainError(
        ErrorCodes.COMPLETION_NOT_APPROVED,
        'Course completion is not approved or certificate is not allowed'
      );
    }

    // 4. Verify finance validation
    if (context.paymentValidationRequired) {
      const isPaid = await this.financeValidationPort.isPaymentValidationPassed(validated.enrollmentId);
      if (!isPaid) {
        throw new DomainError(
          ErrorCodes.PAYMENT_VALIDATION_FAILED,
          'Enrollment has outstanding dues and is blocked from certificate generation'
        );
      }
    }

    // 5. Prevent duplicate active certificate (Generated or Issued)
    const existingActive = await prisma.certificate.findFirst({
      where: {
        enrollmentId: validated.enrollmentId,
        certificateStatus: { in: ['Generated', 'Issued'] }
      }
    });
    if (existingActive) {
      throw new DomainError(
        ErrorCodes.DUPLICATE_ACTIVE_CERTIFICATE,
        'An active certificate already exists for this enrollment'
      );
    }

    // 6. Allocate unique certificate number and generate verification code
    const certNumber = await this.numberingPort.allocateCertificateNumber(context.branchId);
    const verificationCode = `VER-${context.courseCode}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).slice(-4).toUpperCase()}`;

    // 7. Render local PDF and set public URL
    const certificateUrl = saveLocalMockPdf(certNumber, context.studentProfileId, verificationCode);
    const qrCodeUrl = `https://asti-ims.local/verify/${verificationCode}`;

    // 8. Create database record
    const certificate = await prisma.certificate.create({
      data: {
        certificateNumber: certNumber,
        enrollmentId: validated.enrollmentId,
        studentProfileId: context.studentProfileId,
        courseId: context.courseId,
        batchId: context.batchId,
        certificateStatus: 'Generated',
        certificateUrl,
        verificationCode,
        qrCodeUrl,
        language: validated.language,
        createdBy: actorUserId
      }
    });

    // 9. Audit action
    await this.auditPort.logAction('CERTIFICATE_GENERATED', actorUserId, certificate.id, {
      certificateNumber: certNumber,
      enrollmentId: validated.enrollmentId
    });

    return certificate.id;
  }
}
