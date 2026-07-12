import { prisma } from '@ims/database';
import { DomainError, ErrorCodes } from '../domain/errors';
import {
  SubmitReissueRequest,
  SubmitReissueRequestSchema,
  ReviewReissueRequest,
  ReviewReissueRequestSchema,
  GenerateReplacementCertificate,
  GenerateReplacementCertificateSchema,
} from '../domain/validators';
import { AuditPort, NumberingPort, EnrollmentReadPort } from '../ports';
import { savePdfToBlob } from '../infrastructure/PdfHelper';

export class ReissueService {
  constructor(
    private readonly auditPort: AuditPort,
    private readonly numberingPort: NumberingPort,
    private readonly enrollmentReadPort: EnrollmentReadPort,
  ) {}

  // 1. Submit reissue request
  async submitRequest(
    command: SubmitReissueRequest,
    actorUserId: string,
  ): Promise<string> {
    const validated = SubmitReissueRequestSchema.parse(command);

    // Verify certificate exists and is issued
    const certificate = await prisma.certificate.findUnique({
      where: { id: validated.certificateId },
    });

    if (!certificate) {
      throw new DomainError(
        ErrorCodes.CERTIFICATE_NOT_FOUND,
        'Certificate not found',
      );
    }

    if (certificate.certificateStatus !== 'Issued') {
      throw new DomainError(
        ErrorCodes.INVALID_STATE_TRANSITION,
        `Cannot request reissue for certificate in status: ${certificate.certificateStatus}`,
      );
    }

    // Check if there is an active (PendingReview or Approved) request already
    const openRequest = await prisma.certificateReissueRequest.findFirst({
      where: {
        certificateId: validated.certificateId,
        status: { in: ['PendingReview', 'Approved'] },
      },
    });

    if (openRequest) {
      throw new DomainError(
        ErrorCodes.REISSUE_REQUEST_ALREADY_OPEN,
        'Another reissue request is already open for this certificate',
      );
    }

    // Create request
    const request = await prisma.certificateReissueRequest.create({
      data: {
        certificateId: validated.certificateId,
        requestedBy: actorUserId,
        reason: validated.reason,
        status: 'PendingReview',
        createdBy: actorUserId,
      },
    });

    // Audit action
    await this.auditPort.logAction(
      'CERTIFICATE_REISSUE_SUBMITTED',
      actorUserId,
      certificate.id,
      {
        requestId: request.id,
        reason: validated.reason,
      },
    );

    return request.id;
  }

  // 2. Review and approve/reject reissue request
  async reviewRequest(
    command: ReviewReissueRequest,
    actorUserId: string,
  ): Promise<void> {
    const validated = ReviewReissueRequestSchema.parse(command);

    const request = await prisma.certificateReissueRequest.findUnique({
      where: { id: validated.requestId },
    });

    if (!request) {
      throw new DomainError(
        ErrorCodes.INVALID_OR_NOT_FOUND,
        'Reissue request not found',
      );
    }

    if (request.status !== 'PendingReview') {
      throw new DomainError(
        ErrorCodes.INVALID_STATE_TRANSITION,
        `Cannot review request in status: ${request.status}`,
      );
    }

    const nextStatus =
      validated.decision === 'APPROVE' ? 'Approved' : 'Rejected';

    await prisma.certificateReissueRequest.update({
      where: { id: validated.requestId },
      data: {
        status: nextStatus,
        approvedBy: actorUserId,
        approvedAt: new Date(),
        version: { increment: 1 },
      },
    });

    // Audit decision
    await this.auditPort.logAction(
      `CERTIFICATE_REISSUE_${validated.decision}D`,
      actorUserId,
      request.certificateId,
      {
        requestId: request.id,
        remarks: validated.remarks,
      },
    );
  }

  // 3. Generate replacement certificate
  async generateReplacement(
    command: GenerateReplacementCertificate,
    actorUserId: string,
  ): Promise<string> {
    const validated = GenerateReplacementCertificateSchema.parse(command);

    const request = await prisma.certificateReissueRequest.findUnique({
      where: { id: validated.reissueRequestId },
      include: { certificate: true },
    });

    if (!request) {
      throw new DomainError(
        ErrorCodes.INVALID_OR_NOT_FOUND,
        'Reissue request not found',
      );
    }

    if (request.status !== 'Approved') {
      throw new DomainError(
        ErrorCodes.REISSUE_NOT_APPROVED,
        `Cannot generate replacement for request status: ${request.status}`,
      );
    }

    const originalCert = request.certificate;

    // Fetch enrollment context
    const context = await this.enrollmentReadPort.getEnrollmentContext(
      originalCert.enrollmentId,
    );
    if (!context) {
      throw new DomainError(
        ErrorCodes.ENROLLMENT_NOT_FOUND,
        'Enrollment not found',
      );
    }

    // Allocate new certificate number & verification code
    const certNumber = await this.numberingPort.allocateCertificateNumber(
      context.branchId,
    );
    const verificationCode = `VER-${context.courseCode}-${Date.now().toString().slice(-4)}-REP`;

    // Upload replacement PDF to Vercel Blob and obtain public URL
    const certificateUrl = await savePdfToBlob(
      certNumber,
      context.studentProfileId,
      verificationCode,
    );
    const qrCodeUrl = `https://asti-ims.local/verify/${verificationCode}`;

    // Execute database operations in a transaction to guarantee atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update original certificate status to Replaced first to prevent unique constraint violation on enrollmentId
      await tx.certificate.update({
        where: { id: originalCert.id },
        data: {
          certificateStatus: 'Replaced',
          version: { increment: 1 },
        },
      });

      // Create new certificate (Issued status directly)
      const newCert = await tx.certificate.create({
        data: {
          certificateNumber: certNumber,
          enrollmentId: originalCert.enrollmentId,
          studentProfileId: originalCert.studentProfileId,
          courseId: originalCert.courseId,
          batchId: originalCert.batchId,
          certificateStatus: 'Issued',
          certificateUrl,
          verificationCode,
          qrCodeUrl,
          language: validated.language ?? originalCert.language,
          issuedDate: new Date(),
          issuedBy: actorUserId,
          createdBy: actorUserId,
        },
      });

      // Complete the reissue request
      await tx.certificateReissueRequest.update({
        where: { id: request.id },
        data: {
          status: 'Completed',
          newCertificateId: newCert.id,
          version: { increment: 1 },
        },
      });

      return newCert;
    });

    // Audit the replacement
    await this.auditPort.logAction(
      'CERTIFICATE_REPLACED',
      actorUserId,
      originalCert.id,
      {
        requestId: request.id,
        newCertificateId: result.id,
        newCertificateNumber: certNumber,
      },
    );

    return result.id;
  }
}
