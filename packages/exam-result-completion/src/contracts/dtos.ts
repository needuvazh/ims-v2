import { z } from 'zod';

// Exam DTOs
export const ExamDTO = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  batchId: z.string().uuid(),
  examName: z.string(),
  examDate: z.string(),
  maxMarks: z.number(),
  passMarks: z.number(),
  status: z.enum(['Draft', 'Scheduled', 'OpenForResultEntry', 'Closed', 'Cancelled', 'Archived']),
  version: z.number(),
  createdAt: z.string(),
  createdBy: z.string().uuid().nullable(),
  updatedAt: z.string().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type ExamDTO = z.infer<typeof ExamDTO>;

export const ExamListResponse = z.object({
  exams: z.array(ExamDTO),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type ExamListResponse = z.infer<typeof ExamListResponse>;

export const ExamDetailResponse = z.object({
  exam: ExamDTO,
  results: z.array(z.object({
    id: z.string().uuid(),
    enrollmentId: z.string().uuid(),
    marksObtained: z.number(),
    resultStatus: z.enum(['Pending', 'Recorded', 'Finalized', 'Corrected']),
    grade: z.string().nullable(),
    finalizedAt: z.string().nullable(),
  })),
  resultStats: z.object({
    total: z.number(),
    recorded: z.number(),
    finalized: z.number(),
    pending: z.number(),
  }),
});

export type ExamDetailResponse = z.infer<typeof ExamDetailResponse>;

// Result DTOs
export const ResultDTO = z.object({
  id: z.string().uuid(),
  examId: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  marksObtained: z.number(),
  resultStatus: z.enum(['Pending', 'Recorded', 'Finalized', 'Corrected']),
  grade: z.string().nullable(),
  finalizedAt: z.string().nullable(),
  finalizedBy: z.string().uuid().nullable(),
  version: z.number(),
  createdAt: z.string(),
  createdBy: z.string().uuid().nullable(),
  updatedAt: z.string().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type ResultDTO = z.infer<typeof ResultDTO>;

export const ResultListResponse = z.object({
  results: z.array(ResultDTO),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type ResultListResponse = z.infer<typeof ResultListResponse>;

export const ResultDetailResponse = z.object({
  result: ResultDTO,
  exam: ExamDTO.nullable(),
});

export type ResultDetailResponse = z.infer<typeof ResultDetailResponse>;

export const BulkResultValidationResponse = z.object({
  validationToken: z.string().uuid(),
  results: z.array(z.object({
    rowIndex: z.number(),
    enrollmentId: z.string().uuid(),
    valid: z.boolean(),
    error: z.string().nullable(),
  })),
  validCount: z.number(),
  invalidCount: z.number(),
});

export type BulkResultValidationResponse = z.infer<typeof BulkResultValidationResponse>;

// Completion DTOs
export const CourseCompletionDTO = z.object({
  id: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  attendancePercentage: z.number().nullable(),
  attendanceOutcome: z.string().nullable(),
  examRequired: z.boolean(),
  examOutcome: z.string().nullable(),
  paymentRequired: z.boolean(),
  paymentOutcome: z.string().nullable(),
  manualApprovalRequired: z.boolean(),
  completionStatus: z.enum([
    'Pending',
    'EvidenceIncomplete',
    'AwaitingTrainerRecommendation',
    'AwaitingCoordinatorReview',
    'AwaitingFinalApproval',
    'Approved',
    'Rejected',
    'ReevaluationRequired',
    'ExceptionReview',
  ]),
  certificateAllowed: z.boolean(),
  attendanceUpdatedAt: z.string().nullable(),
  resultUpdatedAt: z.string().nullable(),
  paymentUpdatedAt: z.string().nullable(),
  lastEvaluatedAt: z.string().nullable(),
  evidenceStale: z.boolean(),
  version: z.number(),
  createdAt: z.string(),
  createdBy: z.string().uuid().nullable(),
  updatedAt: z.string().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type CourseCompletionDTO = z.infer<typeof CourseCompletionDTO>;

export const CompletionListResponse = z.object({
  completions: z.array(CourseCompletionDTO),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type CompletionListResponse = z.infer<typeof CompletionListResponse>;

// Approval DTOs
export const CompletionApprovalDTO = z.object({
  id: z.string().uuid(),
  courseCompletionId: z.string().uuid(),
  approvalLevel: z.enum(['TrainerRecommendation', 'CoordinatorReview', 'FinalApproval']),
  status: z.enum(['Pending', 'Approved', 'Rejected']),
  actorId: z.string().uuid(),
  actionDate: z.string().nullable(),
  remarks: z.string().nullable(),
  version: z.number(),
  createdAt: z.string(),
  createdBy: z.string().uuid().nullable(),
  updatedAt: z.string().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type CompletionApprovalDTO = z.infer<typeof CompletionApprovalDTO>;

export const CompletionDetailResponse = z.object({
  completion: CourseCompletionDTO,
  approvalTimeline: z.array(CompletionApprovalDTO),
});

export type CompletionDetailResponse = z.infer<typeof CompletionDetailResponse>;

// Work Queue DTOs
export const WorkQueueItemDTO = z.object({
  type: z.enum([
    'missing_result',
    'evaluation',
    'trainer_recommendation',
    'coordinator_review',
    'final_approval',
    'reevaluation',
  ]),
  id: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  examId: z.string().uuid().nullable(),
  completionId: z.string().uuid().nullable(),
  status: z.string(),
  priority: z.number(),
  createdAt: z.string(),
});

export type WorkQueueItemDTO = z.infer<typeof WorkQueueItemDTO>;

export const WorkQueueResponse = z.object({
  missingResults: z.array(WorkQueueItemDTO),
  evaluationQueue: z.array(WorkQueueItemDTO),
  trainerQueue: z.array(WorkQueueItemDTO),
  coordinatorQueue: z.array(WorkQueueItemDTO),
  finalApprovalQueue: z.array(WorkQueueItemDTO),
  reevaluationQueue: z.array(WorkQueueItemDTO),
});

export type WorkQueueResponse = z.infer<typeof WorkQueueResponse>;
