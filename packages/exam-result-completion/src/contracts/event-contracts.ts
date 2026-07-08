// Domain Event Payload Contracts for Exam, Result & Completion Management

export interface ExamScheduledEvent {
  examId: string;
  batchId: string;
  courseId: string;
  examDate: string;
  examName: string;
}

export interface ExamRescheduledEvent {
  examId: string;
  oldDate: string;
  newDate: string;
}

export interface ExamCancelledEvent {
  examId: string;
  reason?: string;
}

export interface ExamOpenedForResultEntryEvent {
  examId: string;
  batchId: string;
}

export interface ExamClosedEvent {
  examId: string;
}

export interface ExamArchivedEvent {
  examId: string;
}

export interface ResultRecordedEvent {
  resultId: string;
  examId: string;
  enrollmentId: string;
  marksObtained: number;
  grade?: string;
  isPass: boolean;
}

export interface ResultFinalizedEvent {
  resultId: string;
  examId: string;
  enrollmentId: string;
  marksObtained: number;
  grade?: string;
  isPass: boolean;
  finalizedBy: string;
}

export interface ResultCorrectedEvent {
  resultId: string;
  examId: string;
  enrollmentId: string;
  oldMarks: number;
  newMarks: number;
  oldGrade?: string;
  newGrade?: string;
  reason: string;
  correctedBy: string;
}

export interface CompletionEvaluationCompletedEvent {
  completionId: string;
  enrollmentId: string;
  courseId: string;
  attendancePercentage: number | null;
  attendanceOutcome: string | null;
  examRequired: boolean;
  examOutcome: string | null;
  paymentRequired: boolean;
  paymentOutcome: string | null;
  completionStatus: string;
  certificateAllowed: boolean;
}

export interface CompletionEvaluationFailedEvent {
  completionId: string;
  enrollmentId: string;
  courseId: string;
  reason: string;
  missingEvidence: string[];
}

export interface CompletionRecommendedEvent {
  completionId: string;
  enrollmentId: string;
  recommendedBy: string;
}

export interface CoordinatorReviewApprovedEvent {
  completionId: string;
  enrollmentId: string;
  reviewedBy: string;
}

export interface CourseCompletionApprovedEvent {
  completionId: string;
  enrollmentId: string;
  courseId: string;
  certificateAllowed: boolean;
  approvedBy: string;
}

export interface CourseCompletionRejectedEvent {
  completionId: string;
  enrollmentId: string;
  courseId: string;
  reason?: string;
  rejectedBy: string;
}

export interface CompletionReevaluationRequiredEvent {
  completionId: string;
  enrollmentId: string;
  courseId: string;
  requestedBy: string;
}

export interface CertificateEligibleEvent {
  enrollmentId: string;
  courseId: string;
  completionId: string;
  studentProfileId: string;
}

export interface EnrollmentCompletionSyncedEvent {
  enrollmentId: string;
  completionStatus: string;
  completedAt: string;
}

// Event type constants
export const EXAM_RESULT_COMPLETION_EVENTS = {
  EXAM_SCHEDULED: 'ExamScheduled',
  EXAM_RESCHEDULED: 'ExamRescheduled',
  EXAM_CANCELLED: 'ExamCancelled',
  EXAM_OPENED_FOR_RESULT_ENTRY: 'ExamOpenedForResultEntry',
  EXAM_CLOSED: 'ExamClosed',
  EXAM_ARCHIVED: 'ExamArchived',
  RESULT_RECORDED: 'ResultRecorded',
  RESULT_FINALIZED: 'ResultFinalized',
  RESULT_CORRECTED: 'ResultCorrected',
  COMPLETION_EVALUATION_COMPLETED: 'CompletionEvaluationCompleted',
  COMPLETION_EVALUATION_FAILED: 'CompletionEvaluationFailed',
  COMPLETION_RECOMMENDED: 'CompletionRecommended',
  COORDINATOR_REVIEW_APPROVED: 'CoordinatorReviewApproved',
  COURSE_COMPLETION_APPROVED: 'CourseCompletionApproved',
  COURSE_COMPLETION_REJECTED: 'CourseCompletionRejected',
  COMPLETION_REEVALUATION_REQUIRED: 'CompletionReevaluationRequired',
  CERTIFICATE_ELIGIBLE: 'CertificateEligible',
  ENROLLMENT_COMPLETION_SYNCED: 'EnrollmentCompletionSynced',
} as const;

export type ExamResultCompletionEventType =
  (typeof EXAM_RESULT_COMPLETION_EVENTS)[keyof typeof EXAM_RESULT_COMPLETION_EVENTS];
