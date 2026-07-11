import { z } from 'zod';

// Exam Schemas
export const CreateExamSchemaBase = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  batchId: z.string().uuid('Invalid batch ID'),
  courseExamTemplateId: z.string().uuid('Invalid template ID').nullable().optional(),
  examName: z
    .string()
    .trim()
    .min(3, 'Exam name must be at least 3 characters')
    .max(200, 'Exam name must be at most 200 characters'),
  examDate: z.coerce.date({ message: 'Invalid exam date' }),
  maxMarks: z.coerce
    .number()
    .positive('Max marks must be greater than 0')
    .max(99999999.99, 'Max marks exceeds maximum allowed value'),
  passMarks: z.coerce.number().min(0, 'Pass marks must be >= 0'),
});

export const CreateExamSchema = CreateExamSchemaBase.refine(
  (data) => data.passMarks <= data.maxMarks,
  {
    message: 'Pass marks must be <= max marks',
    path: ['passMarks'],
  },
).refine(
  (data) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return data.examDate.getTime() > today.getTime();
  },
  {
    message: 'Exam date must be in the future',
    path: ['examDate'],
  },
);

export const UpdateExamSchema = CreateExamSchemaBase.partial()
  .omit({ courseId: true, batchId: true })
  .refine(
    (data) => {
      if (data.maxMarks !== undefined && data.passMarks !== undefined) {
        return data.passMarks <= data.maxMarks;
      }
      return true;
    },
    {
      message: 'Pass marks must be <= max marks',
      path: ['passMarks'],
    },
  );

export const ScheduleExamSchema = z.object({
  examDate: z.coerce.date({ message: 'Invalid exam date' }).optional(),
});

export const CancelExamSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, 'Reason must be at most 500 characters')
    .optional(),
});

export const ExamStateActionSchema = z.object({
  action: z.enum(['schedule', 'activate', 'close', 'cancel', 'archive']),
  reason: z.string().trim().max(500).optional(),
  examDate: z.coerce.date().optional(),
});

// Result Schemas
export const RecordResultSchema = z.object({
  examId: z.string().uuid('Invalid exam ID'),
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  marksObtained: z.coerce
    .number()
    .min(0, 'Marks must be >= 0')
    .max(99999999.99, 'Marks exceeds maximum allowed value'),
  grade: z
    .string()
    .trim()
    .max(20, 'Grade must be at most 20 characters')
    .optional(),
});

export const BulkResultRowSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  marksObtained: z.coerce
    .number()
    .min(0, 'Marks must be >= 0')
    .max(99999999.99, 'Marks exceeds maximum allowed value'),
  grade: z
    .string()
    .trim()
    .max(20, 'Grade must be at most 20 characters')
    .optional(),
});

export const BulkResultValidationSchema = z.object({
  examId: z.string().uuid('Invalid exam ID'),
  results: z
    .array(BulkResultRowSchema)
    .min(1, 'At least one result is required')
    .max(500, 'Maximum 500 results per batch'),
});

export const BulkResultSubmitSchema = BulkResultValidationSchema.extend({
  validationToken: z.string().uuid('Invalid validation token').optional(),
});

export const FinalizeResultSchema = z.object({
  resultId: z.string().uuid('Invalid result ID'),
});

export const CorrectResultSchema = z.object({
  marksObtained: z.coerce
    .number()
    .min(0, 'Marks must be >= 0')
    .max(99999999.99, 'Marks exceeds maximum allowed value'),
  grade: z
    .string()
    .trim()
    .max(20, 'Grade must be at most 20 characters')
    .optional(),
  reason: z
    .string()
    .trim()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be at most 500 characters'),
});

// Completion Schemas
export const EvaluateCompletionSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
});

export const ReevaluateCompletionSchema = z.object({
  completionId: z.string().uuid('Invalid completion ID'),
});

export const TrainerRecommendationSchema = z.object({
  remarks: z
    .string()
    .trim()
    .max(1000, 'Remarks must be at most 1000 characters')
    .optional(),
});

export const CoordinatorReviewSchema = z.object({
  approved: z.boolean(),
  remarks: z
    .string()
    .trim()
    .max(1000, 'Remarks must be at most 1000 characters')
    .optional(),
});

export const FinalApprovalSchema = z.object({
  approved: z.boolean(),
  remarks: z
    .string()
    .trim()
    .max(1000, 'Remarks must be at most 1000 characters')
    .optional(),
});

// Query Schemas
export const SearchExamsQuerySchema = z.object({
  batchId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  status: z
    .enum([
      'Draft',
      'Scheduled',
      'OpenForResultEntry',
      'Closed',
      'Cancelled',
      'Archived',
    ])
    .optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const SearchResultsQuerySchema = z.object({
  examId: z.string().uuid().optional(),
  enrollmentId: z.string().uuid().optional(),
  status: z.enum(['Pending', 'Recorded', 'Finalized', 'Corrected']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const SearchCompletionsQuerySchema = z.object({
  enrollmentId: z.string().uuid().optional(),
  status: z
    .enum([
      'Pending',
      'EvidenceIncomplete',
      'AwaitingTrainerRecommendation',
      'AwaitingCoordinatorReview',
      'AwaitingFinalApproval',
      'Approved',
      'Rejected',
      'ReevaluationRequired',
      'ExceptionReview',
    ])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
