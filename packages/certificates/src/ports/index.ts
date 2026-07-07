export interface EnrollmentContext {
  id: string;
  enrollmentNumber: string;
  studentProfileId: string;
  courseId: string;
  batchId: string;
  branchId: string;
  paymentValidationRequired: boolean;
  studentDisplayName: string;
  studentNumber: string;
  courseCode: string;
  courseNameEnglish: string;
  courseNameArabic: string;
  batchCode: string;
  batchName: string;
}

export interface EnrollmentReadPort {
  getEnrollmentContext(enrollmentId: string): Promise<EnrollmentContext | null>;
}

export interface CompletionReadPort {
  isCompletionApproved(enrollmentId: string): Promise<boolean>;
}

export interface FinanceValidationPort {
  isPaymentValidationPassed(enrollmentId: string): Promise<boolean>;
}

export interface NumberingPort {
  allocateCertificateNumber(branchId: string): Promise<string>;
}

export interface AuditPort {
  logAction(action: string, actorId: string, resourceId: string, details?: Record<string, any>): Promise<void>;
}

export interface NotificationPort {
  requestNotification(templateCode: string, recipientId: string, placeholders: Record<string, string>): Promise<void>;
}
