import { prisma } from '@ims/database';
import {
  EnrollmentReadPort,
  EnrollmentContext,
  CompletionReadPort,
  FinanceValidationPort,
  NumberingPort,
  AuditPort,
  NotificationPort
} from '../ports';

export class PrismaEnrollmentReadAdapter implements EnrollmentReadPort {
  async getEnrollmentContext(enrollmentId: string): Promise<EnrollmentContext | null> {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        studentProfile: {
          include: {
            person: true
          }
        },
        course: true,
        batch: true,
        branch: true
      }
    });

    if (!enrollment) return null;

    return {
      id: enrollment.id,
      enrollmentNumber: enrollment.enrollmentNumber,
      studentProfileId: enrollment.studentProfileId,
      courseId: enrollment.courseId,
      batchId: enrollment.batchId,
      branchId: enrollment.branchId,
      paymentValidationRequired: enrollment.paymentValidationRequired,
      studentDisplayName: `${enrollment.studentProfile.person.firstName} ${enrollment.studentProfile.person.lastName}`,
      studentNumber: enrollment.studentProfile.studentNumber,
      courseCode: enrollment.course.courseCode,
      courseNameEnglish: enrollment.course.nameEnglish,
      courseNameArabic: enrollment.course.nameArabic,
      batchCode: enrollment.batch.batchCode,
      batchName: enrollment.batch.batchNameEnglish
    };
  }
}

export class PrismaCompletionReadAdapter implements CompletionReadPort {
  async isCompletionApproved(enrollmentId: string): Promise<boolean> {
    const completion = await prisma.courseCompletion.findFirst({
      where: { enrollmentId }
    });
    return completion?.completionStatus === 'Approved' && completion?.certificateAllowed === true;
  }
}

export class PrismaFinanceValidationAdapter implements FinanceValidationPort {
  async isPaymentValidationPassed(enrollmentId: string): Promise<boolean> {
    const invoices = await prisma.invoice.findMany({
      where: { enrollmentId }
    });

    if (invoices.length === 0) {
      return false; // Block if there are no invoices but validation is required
    }

    const unpaid = invoices.some(
      inv => inv.outstandingAmount.toNumber() > 0 && inv.status !== 'Paid'
    );
    return !unpaid;
  }
}

export class PrismaNumberingAdapter implements NumberingPort {
  async allocateCertificateNumber(branchId: string): Promise<string> {
    const prefix = branchId.slice(0, 3).toUpperCase();
    const uniqueSuffix = Date.now().toString().slice(-6);
    return `CERT-${prefix}-${uniqueSuffix}`;
  }
}

export class PrismaAuditAdapter implements AuditPort {
  async logAction(action: string, actorId: string, resourceId: string, details?: Record<string, any>): Promise<void> {
    await prisma.auditLog.create({
      data: {
        performedBy: actorId,
        performedAt: new Date(),
        entityType: 'Certificate',
        entityId: resourceId,
        action,
        newValue: (details as any) ?? null,
        module: 'CertificateManagement'
      }
    });
  }
}

export class PrismaNotificationAdapter implements NotificationPort {
  async requestNotification(templateCode: string, recipientId: string, placeholders: Record<string, string>): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: recipientId }
    });
    if (!user) return;

    await prisma.notification.create({
      data: {
        type: templateCode,
        recipientUserId: user.id,
        recipientEmail: user.email,
        subject: `Certificate Notification: ${templateCode}`,
        body: `Hello, your certificate is ready. Details: ${JSON.stringify(placeholders)}`,
        status: 'Pending'
      }
    });
  }
}
