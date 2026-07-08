## 1. Schema Foundation

- [x] 1.1 Add 5 Prisma enums: ExamStatus, ResultStatus, CompletionStatus, ApprovalLevel, ApprovalStatus to schema.prisma
- [x] 1.2 Add Exam model with fields: id, courseId, batchId, examName, examDate, maxMarks, passMarks, status, version, createdAt, createdBy, updatedAt, updatedBy, deletedAt, deletedBy
- [x] 1.3 Add Result model with fields: id, examId, enrollmentId, marksObtained, resultStatus, grade, finalizedAt, finalizedBy, version, createdAt, createdBy, updatedAt, updatedBy, deletedAt, deletedBy
- [x] 1.4 Add CourseCompletion model with fields: id, enrollmentId, attendancePercentage, attendanceOutcome, examRequired, examOutcome, paymentRequired, paymentOutcome, manualApprovalRequired, completionStatus, certificateAllowed, attendanceUpdatedAt, resultUpdatedAt, paymentUpdatedAt, lastEvaluatedAt, evidenceStale, version, createdAt, createdBy, updatedAt, updatedBy, deletedAt, deletedBy
- [x] 1.5 Add CompletionApproval model with fields: id, courseCompletionId, approvalLevel, status, actorId, actionDate, remarks, version, createdAt, createdBy, updatedAt, updatedBy, deletedAt, deletedBy
- [x] 1.6 Add relations: Exam→Batch, Exam→Course, Result→Exam, Result→Enrollment, CourseCompletion→Enrollment, CompletionApproval→CourseCompletion
- [x] 1.7 Add unique constraints: Result(examId, enrollmentId) where deletedAt is null, CourseCompletion(enrollmentId) where deletedAt is null
- [x] 1.8 Add indexes: exam(batchId, status), result(examId, enrollmentId), courseCompletion(enrollmentId, completionStatus), completionApproval(courseCompletionId, approvalLevel)
- [x] 1.9 Generate Prisma migration: `prisma migrate dev --name add-module-10-aggregates`
- [x] 1.10 Validate migration SQL for backward compatibility and constraint correctness

## 2. Domain Layer - Aggregates

- [x] 2.1 Create packages/exam-result-completion/ directory structure: domain/, application/, infrastructure/, contracts/, tests/
- [x] 2.2 Implement Exam aggregate root with state machine: Draft→Scheduled→OpenForResultEntry→Closed, Scheduled→Cancelled, any→Archived
- [x] 2.3 Implement Exam invariants: passMarks <= maxMarks, maxMarks > 0, passMarks >= 0, semantic duplicate detection
- [x] 2.4 Implement Result aggregate root with state machine: Pending→Recorded→Finalized→Corrected
- [x] 2.5 Implement Result invariants: marksObtained >= 0, marksObtained <= maxMarks, one active Result per Exam+Enrollment, server-derived resultStatus
- [x] 2.6 Implement CourseCompletion aggregate root with state machine: Pending→EvidenceIncomplete/AwaitingTrainerRecommendation/Approved, AwaitingTrainerRecommendation→AwaitingCoordinatorReview/Rejected, AwaitingCoordinatorReview→AwaitingFinalApproval/Rejected, AwaitingFinalApproval→Approved/Rejected, Approved→ReevaluationRequired→ExceptionReview
- [x] 2.7 Implement CourseCompletion invariants: one active per Enrollment, evidence staleness detection, fail-safe dependency handling
- [x] 2.8 Implement CompletionApproval aggregate with stage sequencing: TrainerRecommendation→CoordinatorReview→FinalApproval
- [x] 2.9 Implement CompletionApproval invariants: stage ordering, actor eligibility, version matching, approval history preservation
- [x] 2.10 Define domain events: ExamScheduled, ExamRescheduled, ExamCancelled, ResultRecorded, ResultFinalized, ResultCorrected, CompletionEvaluationCompleted, CompletionEvaluationFailed, CompletionRecommended, CoordinatorReviewApproved, CourseCompletionApproved, CourseCompletionRejected, CompletionReevaluationRequired, CertificateEligible

## 3. Domain Layer - Repository Interfaces & Cross-Context Readers

- [x] 3.1 Define ExamRepository interface in domain/
- [x] 3.2 Define ResultRepository interface in domain/
- [x] 3.3 Define CourseCompletionRepository interface in domain/
- [x] 3.4 Define CompletionApprovalRepository interface in domain/
- [x] 3.5 Define CourseCompletionRuleReader interface in domain/
- [x] 3.6 Define AttendanceEvidenceReader interface in domain/
- [x] 3.7 Define FinanceValidationReader interface in domain/
- [x] 3.8 Define TrainerAssignmentReader interface in domain/
- [x] 3.9 Define EnrollmentReader interface in domain/

## 4. Infrastructure Layer - Repository Implementations

- [x] 4.1 Implement PrismaExamRepository in infrastructure/
- [x] 4.2 Implement PrismaResultRepository in infrastructure/
- [x] 4.3 Implement PrismaCourseCompletionRepository in infrastructure/
- [x] 4.4 Implement PrismaCompletionApprovalRepository in infrastructure/
- [x] 4.5 Implement PrismaCourseCompletionRuleReader in infrastructure/ (reads from course-catalog tables)
- [x] 4.6 Implement PrismaAttendanceEvidenceReader in infrastructure/ (reads from attendance tables)
- [x] 4.7 Implement PrismaFinanceValidationReader in infrastructure/ (reads from finance tables)
- [x] 4.8 Implement PrismaTrainerAssignmentReader in infrastructure/ (reads from trainer-management tables)
- [x] 4.9 Implement PrismaEnrollmentReader in infrastructure/ (reads from admission-enrollment tables)

## 5. Application Layer - Command/Query Handlers

- [x] 5.1 Implement createExam command handler with authorization, branch scoping, validation
- [x] 5.2 Implement updateExam command handler with state machine validation
- [x] 5.3 Implement scheduleExam, activateExam, closeExam, cancelExam, archiveExam command handlers
- [x] 5.4 Implement recordResult command handler with Enrollment validation, marks validation, server-derived status
- [x] 5.5 Implement validateBulkResults command handler with row-level validation, duplicate detection
- [x] 5.6 Implement submitBulkResults command handler with atomic commit, validation token verification
- [x] 5.7 Implement finalizeResult command handler with state validation, audit logging
- [x] 5.8 Implement correctResult command handler with permission check, reason validation, reevaluation trigger
- [x] 5.9 Implement evaluateCompletion command handler with cross-context evidence loading, rule evaluation, fail-safe handling
- [x] 5.10 Implement reevaluateCompletion command handler with trigger validation, evidence reload, exception handling
- [x] 5.11 Implement recommendCompletion command handler with Trainer assignment verification, evidence staleness check
- [x] 5.12 Implement coordinatorReview command handler with stage validation, evidence staleness check
- [x] 5.13 Implement finalApproveCompletion command handler with stage validation, evidence staleness check, eligibility handoff
- [x] 5.14 Implement searchExams, getExamDetail, searchResults, getResultDetail, searchCompletions, getCompletionDetail query handlers
- [x] 5.15 Implement approval timeline query handler
- [x] 5.16 Implement work queue query handlers (missing results, evaluation queue, trainer queue, coordinator queue, final approval queue, reevaluation queue)

## 6. Contracts Layer - Zod Schemas & DTOs

- [x] 6.1 Define CreateExamSchema, UpdateExamSchema, ScheduleExamSchema, CancelExamSchema, ExamStateActionSchema
- [x] 6.2 Define RecordResultSchema, BulkResultRowSchema, BulkResultValidationSchema, BulkResultSubmitSchema, FinalizeResultSchema, CorrectFinalizedResultSchema
- [x] 6.3 Define EvaluateCompletionSchema, ReevaluateCompletionSchema, TrainerRecommendationApproveSchema, CoordinatorReviewApproveSchema, FinalApprovalSchema
- [x] 6.4 Define ExamDTO, ResultDTO, CourseCompletionDTO, CompletionApprovalDTO, and list response DTOs
- [x] 6.5 Define error code constants and HTTP mapping functions
- [x] 6.6 Define domain error classes: ExamInvalidStateTransitionError, ResultAlreadyFinalizedError, CompletionEvidenceStaleError, TrainerNotAuthorizedError, BranchMutationForbiddenError, etc.

## 7. API Layer - Route Handlers

- [x] 7.1 Implement POST /api/exams (create Exam) with Zod validation, auth, branch scoping
- [x] 7.2 Implement GET /api/exams (search Exams) with pagination, branch filtering
- [x] 7.3 Implement GET /api/exams/:id (Exam detail)
- [x] 7.4 Implement PATCH /api/exams/:id (update Exam)
- [x] 7.5 Implement POST /api/exams/:id/schedule, /activate, /close, /cancel, /archive
- [x] 7.6 Implement POST /api/results (record Result)
- [x] 7.7 Implement GET /api/results (search Results)
- [x] 7.8 Implement GET /api/results/:id (Result detail)
- [x] 7.9 Implement POST /api/results/bulk/validate
- [x] 7.10 Implement POST /api/results/bulk/submit
- [x] 7.11 Implement POST /api/results/:id/finalize
- [x] 7.12 Implement POST /api/results/:id/correct
- [x] 7.13 Implement POST /api/completions/evaluate
- [x] 7.14 Implement POST /api/completions/:id/reevaluate
- [x] 7.15 Implement POST /api/completions/:id/recommend
- [x] 7.16 Implement POST /api/completions/:id/coordinator-review
- [x] 7.17 Implement POST /api/completions/:id/final-approve
- [x] 7.18 Implement GET /api/completions (search Completions)
- [x] 7.19 Implement GET /api/completions/:id (Completion detail)

## 8. Admin Portal UI

- [x] 8.1 Create Exam List page with filters (branch, course, batch, date range, status)
- [x] 8.2 Create Exam Detail page with status timeline, action buttons (schedule, activate, close, cancel)
- [x] 8.3 Create Create Exam form with Course/Batch selectors, marks validation
- [x] 8.4 Create Result Entry page with roster view, individual marks input, validation feedback
- [x] 8.5 Create Bulk Result Entry page with CSV upload, validation preview, submit confirmation
- [x] 8.6 Create Result Finalization page with batch finalize option
- [x] 8.7 Create Result Correction page with reason field, audit history display
- [x] 8.8 Create Completion Evaluation page with evidence summary (Attendance, Exam, Payment), evaluation button
- [x] 8.9 Create Approval Queue pages: Trainer Recommendation, Coordinator Review, Final Approval
- [x] 8.10 Create Module Dashboard with widgets: Exams Awaiting Activation, Missing Results, Pending Evaluations, Pending Approvals, Pass Rate Trend
- [x] 8.11 Implement permission-based UI visibility (menu items, action buttons)
- [x] 8.12 Implement branch-scoped data filtering in all UI components
- [x] 8.13 Implement responsive layout for all pages (mobile, tablet, desktop)

## 9. Audit & Event Integration

- [x] 9.1 Integrate with packages/shared/audit for all sensitive mutations
- [x] 9.2 Implement outbox event publishing for all domain events
- [x] 9.3 Implement event payload contracts matching FRD Part 7 notification events
- [x] 9.4 Implement CertificateEligible event emission on CourseCompletion approval
- [x] 9.5 Implement EnrollmentCompletionSynced event emission on CourseCompletion approval
- [x] 9.6 Verify audit transactional consistency (audit write + business state in same transaction)

## 10. Permission Seeds

- [x] 10.1 Define permission seed data for exam._, result._, completion._, report._ permissions
- [x] 10.2 Define default role bundles: Academic Administrator, Academic Coordinator, Trainer, Branch Manager, Auditor, Read-Only Academic, Executive Viewer
- [x] 10.3 Implement permission seed script
- [x] 10.4 Register menu permissions for exam-completion module

## 11. Unit Tests - Domain

- [x] 11.1 Write Exam state machine transition tests (all valid/invalid transitions)
- [x] 11.2 Write Exam invariant tests (marks validation, duplicate detection)
- [x] 11.3 Write Result state machine transition tests
- [x] 11.4 Write Result invariant tests (marks range, uniqueness, server-derived status)
- [x] 11.5 Write CourseCompletion state machine transition tests
- [x] 11.6 Write CourseCompletion invariant tests (one per Enrollment, evidence staleness, fail-safe)
- [x] 11.7 Write CompletionApproval state machine tests (stage ordering, concurrency)
- [x] 11.8 Write domain event payload tests

## 12. Integration Tests

- [x] 12.1 Write repository integration tests for Exam CRUD with constraints
- [x] 12.2 Write repository integration tests for Result CRUD with unique constraints
- [x] 12.3 Write repository integration tests for CourseCompletion CRUD with unique constraints
- [x] 12.4 Write repository integration tests for CompletionApproval CRUD
- [x] 12.5 Write cross-context reader integration tests (CourseCompletionRule, Attendance, Finance, Trainer, Enrollment)
- [x] 12.6 Write audit integration tests for sensitive mutations
- [x] 12.7 Write outbox event publishing tests

## 13. API Tests

- [x] 13.1 Write API contract tests for all 19 endpoints (request validation, response shape, error codes)
- [x] 13.2 Write authorization tests for all endpoints (missing permission, branch scope, own-assignment)
- [x] 13.3 Write IDOR tests for cross-branch data leakage
- [x] 13.4 Write concurrency tests for approval race conditions
- [x] 13.5 Write bulk Result validation/submit tests with edge cases

## 14. E2E Tests (Playwright)

- [x] 14.1 Write E2E test: Create Exam → Record Results → Finalize → Evaluate Completion → Approve
- [x] 14.2 Write E2E test: Bulk Result entry with validation errors
- [x] 14.3 Write E2E test: Result correction triggers reevaluation
- [x] 14.4 Write E2E test: Branch isolation (user sees only authorized branch data)
- [x] 14.5 Write E2E test: Trainer own-assignment flow (sees only assigned batches)
- [x] 14.6 Write E2E test: Approval stage skipping blocked
- [x] 14.7 Write E2E test: Dependency failure (Attendance unavailable) blocks completion evaluation

## 15. Verification & Cleanup

- [x] 15.1 Run TypeScript type check: `pnpm tsc --noEmit`
- [x] 15.2 Run lint: `pnpm lint`
- [x] 15.3 Run unit tests: `pnpm test --filter=@ims/exam-result-completion`
- [x] 15.4 Run integration tests
- [x] 15.5 Run API tests
- [x] 15.6 Run Playwright E2E tests
- [x] 15.7 Validate Prisma schema: `pnpm prisma validate`
- [x] 15.8 Run migration check: `pnpm prisma migrate status`
- [x] 15.9 Build affected packages: `pnpm turbo build --filter=@ims/exam-result-completion`
- [x] 15.10 Build admin portal: `pnpm turbo build --filter=admin-portal`
- [x] 15.11 Update docs/project-status.md with Module 10 implementation status
- [x] 15.12 Review and update API inventory documentation
