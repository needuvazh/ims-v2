# Part 7 – Validation Rules, Error Catalog, Notifications

## Module 10 – Exam, Result & Completion Management

## 1. Purpose

This document defines:

1. custom business validation schemas;
2. field-level, cross-field, state-transition, authorization, and cross-context validation rules;
3. structured error codes and HTTP mapping;
4. notification events emitted or triggered by Module 10 domain events;
5. notification recipient, channel, template, and deduplication rules;
6. ownership classification for each validation rule.

The module owns validation related to:

```text
Exam
Result
CourseCompletion
CompletionApproval
```

The module must delegate authoritative validation for:

```text
CourseCompletionRule
Enrollment validity
Batch ownership and delivery context
Trainer assignment and authorization
Attendance evidence
Payment validation
Certificate state
User permission and branch access
```

The fundamental rule is:

```text
Module 10 validates academic workflow and completion decisions.

It must not duplicate the business truth of:
- Course Catalog,
- Admission & Enrollment,
- Training Delivery,
- Attendance,
- Finance,
- Certificate Management,
- IAM.
```

---

# 2. Validation Architecture

## 2.1 Validation Layers

Validation is applied in this order:

```text
1. Transport Validation
   - required fields
   - type validation
   - enum syntax
   - date syntax
   - numeric syntax

2. Shared-Kernel Validation
   - ID format
   - pagination rules
   - localization code
   - file/export format
   - common reason text policy
   - version token format

3. Module Domain Validation
   - marks thresholds
   - Result lifecycle
   - Exam lifecycle
   - completion evaluation state
   - approval sequencing
   - correction rules
   - reevaluation rules

4. Cross-Context Validation
   - Course-Batch relationship
   - Enrollment Course/Batch relationship
   - Trainer assignment
   - attendance evidence
   - payment validation
   - completion rule resolution
   - Certificate downstream state where relevant

5. Authorization Validation
   - authentication
   - permission
   - branch scope
   - own-assignment eligibility
   - consolidated-read vs mutation distinction

6. Concurrency Validation
   - expected version
   - stale evidence
   - stale approval state
```

---

# 3. Custom Validation Schema Conventions

The examples in this document use Zod-style TypeScript schemas because the implementation context is a TypeScript/Next.js monorepo.

These schemas are illustrative application contracts. The repository's existing validation library and conventions must take precedence where already standardized.

## 3.1 Common Scalar Schemas

```ts
import { z } from "zod";

export const EntityIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128);

export const VersionSchema = z
  .number()
  .int()
  .min(1);

export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/);

export const ReasonSchema = z
  .string()
  .trim()
  .min(3)
  .max(2000);

export const OptionalRemarksSchema = z
  .string()
  .trim()
  .max(4000)
  .optional();

export const DecimalStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/);

export const PositiveDecimalStringSchema =
  DecimalStringSchema.refine((value) => Number(value) > 0);

export const NonNegativeDecimalStringSchema =
  DecimalStringSchema.refine((value) => Number(value) >= 0);
```

## 3.2 Pagination Schema

```ts
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.union([
    z.literal(25),
    z.literal(50),
    z.literal(100),
  ]).default(25),
});
```

## 3.3 Branch Filter Schema

```ts
export const BranchFilterSchema = z.object({
  branchIds: z.array(EntityIdSchema).max(100).optional(),
});
```

Important:

```text
BranchFilterSchema validates shape only.

Authorization is performed separately by intersecting
requested branchIds with effective IAM read scope.
```

---

# 4. Exam Validation Schemas

## 4.1 Create Exam Schema

```ts
export const CreateExamSchema = z
  .object({
    courseId: EntityIdSchema,
    batchId: EntityIdSchema,
    examName: z.string().trim().min(1).max(200),
    examDate: IsoDateSchema,
    maxMarks: PositiveDecimalStringSchema,
    passMarks: NonNegativeDecimalStringSchema,
  })
  .superRefine((value, ctx) => {
    if (Number(value.passMarks) > Number(value.maxMarks)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passMarks"],
        message: "Pass marks cannot exceed maximum marks.",
      });
    }
  });
```

Server-only validations after schema success:

```text
Course exists
Batch exists
Batch.courseId == courseId
Batch branch is in mutation scope
Exam date is valid for policy
Semantic duplicate policy passes
```

## 4.2 Update Exam Schema

```ts
export const UpdateExamSchema = z
  .object({
    examName: z.string().trim().min(1).max(200).optional(),
    maxMarks: PositiveDecimalStringSchema.optional(),
    passMarks: NonNegativeDecimalStringSchema.optional(),
    expectedVersion: VersionSchema,
  })
  .superRefine((value, ctx) => {
    if (
      value.maxMarks !== undefined &&
      value.passMarks !== undefined &&
      Number(value.passMarks) > Number(value.maxMarks)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passMarks"],
        message: "Pass marks cannot exceed maximum marks.",
      });
    }
  });
```

Server must also compare partial updates against persisted values.

Example:

```text
Stored maxMarks = 100
Request passMarks = 120

Request omits maxMarks.

Server must still reject:
passMarks > stored maxMarks
```

## 4.3 Schedule Exam Schema

```ts
export const ScheduleExamSchema = z.object({
  examDate: IsoDateSchema,
  reason: ReasonSchema.optional(),
  expectedVersion: VersionSchema,
});
```

## 4.4 Cancel Exam Schema

```ts
export const CancelExamSchema = z.object({
  reason: ReasonSchema,
  expectedVersion: VersionSchema,
});
```

## 4.5 Exam State Action Schema

```ts
export const ExamStateActionSchema = z.object({
  expectedVersion: VersionSchema,
});
```

Used for:

```text
activate
close
```

---

# 5. Result Validation Schemas

## 5.1 Record Result Schema

```ts
export const RecordResultSchema = z.object({
  marksObtained: NonNegativeDecimalStringSchema,
  expectedVersion: VersionSchema.optional(),
});
```

Server-only validations:

```text
Exam exists
Exam open for result entry
Enrollment exists
Enrollment belongs to Exam Course
Enrollment belongs to Exam Batch
Enrollment branch matches Exam Batch branch
marksObtained <= Exam.maxMarks
Result not finalized unless correction flow used
duplicate Result invariant
permission and branch scope
```

## 5.2 Bulk Result Row Schema

```ts
export const BulkResultRowSchema = z.object({
  rowNumber: z.number().int().min(1),
  enrollmentId: EntityIdSchema,
  marksObtained: NonNegativeDecimalStringSchema,
  expectedVersion: VersionSchema.optional(),
});
```

## 5.3 Bulk Result Validation Schema

```ts
export const BulkResultValidationSchema = z
  .object({
    rows: z.array(BulkResultRowSchema).min(1).max(1000),
  })
  .superRefine((value, ctx) => {
    const seen = new Map<string, number>();

    value.rows.forEach((row, index) => {
      const existing = seen.get(row.enrollmentId);

      if (existing !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rows", index, "enrollmentId"],
          message: "Duplicate enrollment in bulk result payload.",
        });
      } else {
        seen.set(row.enrollmentId, index);
      }
    });
  });
```

## 5.4 Bulk Submit Schema

```ts
export const BulkResultSubmitSchema = z.object({
  validationToken: z.string().trim().min(16).max(2048).optional(),
  rows: z.array(
    z.object({
      enrollmentId: EntityIdSchema,
      marksObtained: NonNegativeDecimalStringSchema,
      expectedVersion: VersionSchema.optional(),
    })
  ).min(1).max(1000),
});
```

## 5.5 Finalize Result Schema

```ts
export const FinalizeResultSchema = z.object({
  expectedVersion: VersionSchema,
});
```

## 5.6 Finalize Result Set Schema

```ts
export const FinalizeResultSetSchema = z.object({
  results: z.array(
    z.object({
      resultId: EntityIdSchema,
      expectedVersion: VersionSchema,
    })
  ).min(1).max(1000),
});
```

## 5.7 Correct Result Schema

```ts
export const CorrectFinalizedResultSchema = z.object({
  correctedMarks: NonNegativeDecimalStringSchema,
  reason: ReasonSchema,
  expectedVersion: VersionSchema,
});
```

Server-only validations:

```text
Result exists
Result is correctable
correctedMarks <= Exam.maxMarks
correctedMarks differs from current marks
permission = result.correct
entity branch in mutation scope
completion impact identified
audit write succeeds according to transaction policy
```

---

# 6. Completion Validation Schemas

## 6.1 Evaluate Completion Schema

```ts
export const EvaluateCompletionSchema = z.object({
  reason: ReasonSchema.optional(),
  expectedVersion: VersionSchema.optional(),
});
```

The request schema intentionally excludes:

```text
attendancePassed
examPassed
paymentCompleted
completionStatus
certificateEligible
```

These values are server-derived.

## 6.2 Reevaluation Schema

```ts
export const ReevaluationTriggerTypeSchema = z.enum([
  "RESULT_CORRECTED",
  "ATTENDANCE_CORRECTED",
  "PAYMENT_VALIDATION_CHANGED",
  "MANUAL_REEVALUATION",
]);

export const ReevaluateCompletionSchema = z.object({
  triggerType: ReevaluationTriggerTypeSchema,
  triggerReference: EntityIdSchema.optional(),
  reason: ReasonSchema,
  expectedVersion: VersionSchema,
});
```

Cross-field rule:

```text
RESULT_CORRECTED
requires
triggerReference = Result ID

ATTENDANCE_CORRECTED
requires
triggerReference = Attendance correction/reference ID where available

PAYMENT_VALIDATION_CHANGED
requires
triggerReference = Finance validation reference where available

MANUAL_REEVALUATION
may omit triggerReference but requires reason
```

## 6.3 Trainer Recommendation Approve Schema

```ts
export const TrainerRecommendationApproveSchema = z.object({
  remarks: OptionalRemarksSchema,
  expectedVersion: VersionSchema,
});
```

## 6.4 Trainer Recommendation Reject Schema

```ts
export const TrainerRecommendationRejectSchema = z.object({
  remarks: ReasonSchema,
  expectedVersion: VersionSchema,
});
```

## 6.5 Coordinator Review Approve Schema

```ts
export const CoordinatorReviewApproveSchema = z.object({
  remarks: OptionalRemarksSchema,
  expectedVersion: VersionSchema,
});
```

## 6.6 Coordinator Review Reject Schema

```ts
export const CoordinatorReviewRejectSchema = z.object({
  remarks: ReasonSchema,
  expectedVersion: VersionSchema,
});
```

## 6.7 Final Approval Schema

```ts
export const FinalApprovalSchema = z.object({
  remarks: OptionalRemarksSchema,
  expectedVersion: VersionSchema,
});
```

## 6.8 Final Rejection Schema

```ts
export const FinalRejectionSchema = z.object({
  remarks: ReasonSchema,
  expectedVersion: VersionSchema,
});
```

---

# 7. Export Validation Schema

```ts
export const AcademicExportTypeSchema = z.enum([
  "EXAM_REGISTER",
  "RESULT_REGISTER",
  "MISSING_RESULT_REPORT",
  "COMPLETION_EVALUATION_REPORT",
  "COMPLETION_APPROVAL_REPORT",
  "REEVALUATION_EXCEPTION_REPORT",
]);

export const ExportFormatSchema = z.enum([
  "CSV",
  "XLSX",
  "PDF",
]);

export const ExportLanguageSchema = z.enum([
  "en",
  "ar",
]);

export const AcademicExportSchema = z.object({
  exportType: AcademicExportTypeSchema,
  filters: z.object({
    branchIds: z.array(EntityIdSchema).max(100).optional(),
    dateFrom: IsoDateSchema.optional(),
    dateTo: IsoDateSchema.optional(),
    courseId: EntityIdSchema.optional(),
    batchId: EntityIdSchema.optional(),
  }),
  format: ExportFormatSchema,
  language: ExportLanguageSchema,
  columns: z.array(z.string().trim().min(1)).min(1).max(100),
});
```

Server-only validations:

```text
dateFrom <= dateTo
requested branches intersect authorized export scope
columns belong to export-type allowlist
format supported for export type
language supported
result set size within sync/async policy
```

---

# 8. Validation Rule Catalog

## 8.1 Exam Validation Rules

| Rule ID | Rule | Owner |
|---|---|---|
| VAL-EXC-001 | Exam Name is required and non-blank after trim | Module 10 |
| VAL-EXC-002 | Exam Date must be valid ISO date | Shared Kernel |
| VAL-EXC-003 | Maximum Marks must be greater than zero | Module 10 |
| VAL-EXC-004 | Pass Marks must be zero or greater | Module 10 |
| VAL-EXC-005 | Pass Marks must not exceed Maximum Marks | Module 10 |
| VAL-EXC-006 | Course must exist | Course Catalog delegated |
| VAL-EXC-007 | Batch must exist | Training Delivery delegated |
| VAL-EXC-008 | Batch must belong to selected Course | Training Delivery/Course relationship delegated, enforced by Module 10 application service |
| VAL-EXC-009 | Batch branch must be in mutation scope | IAM shared authorization |
| VAL-EXC-010 | Semantic duplicate Exam must be rejected | Module 10 |
| VAL-EXC-011 | Exam state transition must be allowed | Module 10 |
| VAL-EXC-012 | Standard edit must not invalidate finalized Result evidence | Module 10 |
| VAL-EXC-013 | Exam cancellation requires reason where policy mandates | Module 10 |
| VAL-EXC-014 | Exam archive is soft only | Shared persistence convention + Module 10 enforcement |
| VAL-EXC-015 | Exam mutation version must match | Shared concurrency convention |

## 8.2 Result Validation Rules

| Rule ID | Rule | Owner |
|---|---|---|
| VAL-EXC-016 | Result must reference existing Exam | Module 10 |
| VAL-EXC-017 | Enrollment must exist | Admission & Enrollment delegated |
| VAL-EXC-018 | Enrollment Course must equal Exam Course | Module 10 orchestration using Enrollment and Exam facts |
| VAL-EXC-019 | Enrollment Batch must equal Exam Batch | Module 10 orchestration using Enrollment and Exam facts |
| VAL-EXC-020 | Enrollment branch must equal Exam Batch branch | Module 10 orchestration |
| VAL-EXC-021 | Marks must be non-negative | Module 10 |
| VAL-EXC-022 | Marks must not exceed Exam maxMarks | Module 10 |
| VAL-EXC-023 | Pass/fail Result status must be derived from marks and passMarks | Module 10 |
| VAL-EXC-024 | Client-supplied contradictory Result status must not be trusted | Module 10 |
| VAL-EXC-025 | One active Result per Exam + Enrollment | Module 10 |
| VAL-EXC-026 | Ordinary Result update forbidden after finalization | Module 10 |
| VAL-EXC-027 | Finalized Result correction requires `result.correct` | IAM permission + Module 10 |
| VAL-EXC-028 | Correction requires business reason | Module 10 |
| VAL-EXC-029 | Corrected marks must differ from current marks | Module 10 |
| VAL-EXC-030 | Correction must trigger/mark completion reevaluation when impacted | Module 10 |
| VAL-EXC-031 | Bulk payload cannot contain duplicate Enrollment rows | Module 10 |
| VAL-EXC-032 | Bulk result rows must all be branch-authorized | IAM + Module 10 orchestration |
| VAL-EXC-033 | Bulk transaction must not silently partially succeed | Shared transaction convention + Module 10 |

## 8.3 Completion Validation Rules

| Rule ID | Rule | Owner |
|---|---|---|
| VAL-EXC-034 | Enrollment must exist and be valid for completion evaluation | Admission & Enrollment delegated |
| VAL-EXC-035 | Enrollment must have Course and Batch | Admission & Enrollment delegated |
| VAL-EXC-036 | Active CourseCompletionRule must resolve | Course Catalog delegated |
| VAL-EXC-037 | Attendance percentage/outcome must come from Attendance owner | Attendance delegated |
| VAL-EXC-038 | Exam evidence must come from Module 10 Result truth | Module 10 |
| VAL-EXC-039 | Payment validation must come from Finance owner | Finance delegated |
| VAL-EXC-040 | Missing required evidence must never be treated as passed | Module 10 |
| VAL-EXC-041 | Unavailable dependency must never false-approve completion | Module 10 orchestration |
| VAL-EXC-042 | One active CourseCompletion per Enrollment | Module 10 |
| VAL-EXC-043 | Manual approval starts only after mandatory criteria pass | Module 10 |
| VAL-EXC-044 | Certificate eligibility requires approved completion and rule allowance | Module 10 evaluates eligibility using Course rule |
| VAL-EXC-045 | Module 10 must not create Certificate | Certificate context boundary |
| VAL-EXC-046 | Approved completion invalidated by evidence change must enter controlled reevaluation/exception path | Module 10 |
| VAL-EXC-047 | Prior approval history must not be deleted during reevaluation | Module 10 + Audit convention |
| VAL-EXC-048 | Reevaluation trigger must be traceable | Module 10 |
| VAL-EXC-049 | Current evidence must be reloaded during reevaluation | Module 10 orchestration |
| VAL-EXC-050 | Completion mutation version must match | Shared concurrency convention |

## 8.4 Approval Validation Rules

| Rule ID | Rule | Owner |
|---|---|---|
| VAL-EXC-051 | Trainer Recommendation requires correct workflow state | Module 10 |
| VAL-EXC-052 | Trainer must be assigned/authorized for Batch | Training Delivery/Trainer context delegated |
| VAL-EXC-053 | Trainer Recommendation cannot be skipped when manual approval is required | Module 10 |
| VAL-EXC-054 | Coordinator Review requires approved Trainer Recommendation | Module 10 |
| VAL-EXC-055 | Final Approval requires approved Coordinator Review | Module 10 |
| VAL-EXC-056 | Rejection requires remarks | Module 10 |
| VAL-EXC-057 | Approval action requires stage-specific permission | IAM + Module 10 |
| VAL-EXC-058 | Approval action requires mutation access to entity branch | IAM shared authorization |
| VAL-EXC-059 | Approval cannot proceed on stale evidence | Module 10 |
| VAL-EXC-060 | Approval stage version must match | Shared concurrency convention |

---

# 9. Structured Error Code Catalog

## 9.1 Error Naming Convention

Format:

```text
<AREA>_<CONDITION>
```

Examples:

```text
EXAM_INVALID_STATE_TRANSITION
RESULT_ALREADY_FINALIZED
COMPLETION_EVIDENCE_STALE
APPROVAL_STAGE_INVALID
```

The error response format follows Part 5:

```json
{
  "error": {
    "code": "RESULT_ALREADY_FINALIZED",
    "message": "The result is finalized and cannot be edited through the standard result-entry flow.",
    "fieldErrors": [],
    "traceId": "01JXYZ..."
  }
}
```

---

# 10. Exam Error Catalog

| Error Code | HTTP | Trigger | User-Facing Meaning |
|---|---:|---|---|
| `EXAM_NOT_FOUND` | 404 | Exam missing or inaccessible | Exam could not be found |
| `EXAM_NAME_REQUIRED` | 400 | Blank Exam name | Exam name is required |
| `EXAM_DATE_INVALID` | 400/422 | Invalid date/policy | Exam date is invalid |
| `MAX_MARKS_INVALID` | 400 | maxMarks <= 0 | Maximum marks must be greater than zero |
| `PASS_MARKS_INVALID` | 400 | passMarks < 0 | Pass marks cannot be negative |
| `PASS_MARKS_EXCEED_MAX` | 400 | passMarks > maxMarks | Pass marks cannot exceed maximum marks |
| `COURSE_NOT_FOUND` | 404 | Course unresolved | Selected course is not available |
| `BATCH_NOT_FOUND` | 404 | Batch unresolved | Selected batch is not available |
| `COURSE_BATCH_MISMATCH` | 422 | Batch belongs to different Course | Selected batch does not belong to selected course |
| `DUPLICATE_EXAM` | 409 | Semantic duplicate | A matching active exam already exists |
| `EXAM_INVALID_STATE_TRANSITION` | 409 | Invalid lifecycle transition | Requested exam action is not allowed in current state |
| `EXAM_FIELD_IMMUTABLE` | 409 | Protected field edit | Field cannot be changed in current state |
| `RESULT_EVIDENCE_WOULD_BE_INVALIDATED` | 422 | Edit conflicts with finalized Result | Standard edit would invalidate academic evidence |
| `CANCELLATION_REASON_REQUIRED` | 400 | Cancel without reason | Cancellation reason is required |
| `EXAM_ARCHIVE_NOT_ALLOWED` | 422 | Unsafe archive attempt | Exam cannot be archived in current state |
| `EXAM_NOT_READY_FOR_RESULT_ENTRY` | 422 | Activate preconditions fail | Exam is not ready for Result entry |
| `RESULT_COMPLETENESS_POLICY_FAILED` | 422 | Close policy fails | Exam cannot be closed because Result requirements are not satisfied |

---

# 11. Result Error Catalog

| Error Code | HTTP | Trigger | User-Facing Meaning |
|---|---:|---|---|
| `RESULT_NOT_FOUND` | 404 | Result missing/inaccessible | Result could not be found |
| `ENROLLMENT_NOT_FOUND` | 404 | Enrollment unresolved | Enrollment could not be found |
| `ENROLLMENT_NOT_ELIGIBLE_FOR_EXAM` | 422 | Course/Batch mismatch | Enrollment is not valid for this Exam |
| `MARKS_REQUIRED` | 400 | Marks omitted | Marks are required |
| `MARKS_NEGATIVE` | 400 | Marks < 0 | Marks cannot be negative |
| `MARKS_EXCEED_MAXIMUM` | 422 | Marks > Exam maxMarks | Marks exceed Exam maximum |
| `RESULT_DUPLICATE` | 409 | Active Result already exists | Result already exists for this Exam and Enrollment |
| `RESULT_ALREADY_FINALIZED` | 409 | Ordinary edit after finalize | Finalized Result requires correction workflow |
| `RESULT_NOT_FINALIZABLE` | 422 | Finalization preconditions fail | Result cannot be finalized |
| `RESULT_INVALID_STATE_TRANSITION` | 409 | Invalid Result lifecycle action | Requested Result action is invalid |
| `CORRECTION_REASON_REQUIRED` | 400 | Correction without reason | Correction reason is required |
| `RESULT_NOT_CORRECTABLE` | 409 | Correction state invalid | Result cannot be corrected in current state |
| `CORRECTED_MARKS_UNCHANGED` | 422 | New marks equal old marks | Corrected marks must differ from current marks |
| `BULK_RESULT_DUPLICATE_ENROLLMENT` | 400 | Duplicate Enrollment row | Enrollment appears more than once |
| `BULK_RESULT_VALIDATION_FAILED` | 422 | One or more invalid rows | Bulk Result validation failed |
| `BULK_RESULT_PAYLOAD_CHANGED_AFTER_VALIDATION` | 409 | Validation token mismatch | Submission changed after validation |
| `RESULT_SET_FINALIZATION_FAILED` | 422 | Selected set invalid | One or more Results cannot be finalized |

---

# 12. Completion Error Catalog

| Error Code | HTTP | Trigger | User-Facing Meaning |
|---|---:|---|---|
| `COURSE_COMPLETION_NOT_FOUND` | 404 | Completion missing | Completion record could not be found |
| `ENROLLMENT_NOT_ELIGIBLE_FOR_COMPLETION_EVALUATION` | 422 | Enrollment lifecycle invalid | Enrollment cannot be evaluated for completion |
| `COURSE_COMPLETION_RULE_NOT_CONFIGURED` | 424 | Rule missing | Completion rule is not configured |
| `ATTENDANCE_EVIDENCE_MISSING` | 422 | Required attendance evidence missing | Attendance evidence is incomplete |
| `ATTENDANCE_DEPENDENCY_UNAVAILABLE` | 503 | Attendance source unavailable | Attendance validation is temporarily unavailable |
| `EXAM_EVIDENCE_MISSING` | 422 | Required Result missing | Required Exam Result is missing |
| `PAYMENT_VALIDATION_FAILED` | 422 | Finance says fail | Payment validation failed |
| `FINANCE_DEPENDENCY_UNAVAILABLE` | 503 | Finance source unavailable | Payment validation is temporarily unavailable |
| `COMPLETION_EVIDENCE_INCOMPLETE` | 422 | Missing required evidence | Completion evidence is incomplete |
| `COMPLETION_EVIDENCE_STALE` | 422/409 | Evidence changed | Completion evidence changed and must be reevaluated |
| `COMPLETION_INVALID_STATE_TRANSITION` | 409 | Invalid workflow transition | Completion action is invalid in current state |
| `REEVALUATION_NOT_ALLOWED` | 409 | Invalid reevaluation state | Completion cannot be reevaluated now |
| `INVALID_REEVALUATION_TRIGGER` | 422 | Trigger invalid/untraceable | Reevaluation trigger is invalid |
| `CERTIFICATE_NOT_ALLOWED_BY_COURSE_RULE` | 422 | Rule disallows certificate | Course rule does not allow certificate issuance |
| `COMPLETION_ALREADY_APPROVED` | 409 | Duplicate approval attempt | Completion is already approved |
| `COMPLETION_ALREADY_REJECTED` | 409 | Duplicate rejection attempt | Completion is already rejected |

---

# 13. Approval Error Catalog

| Error Code | HTTP | Trigger | User-Facing Meaning |
|---|---:|---|---|
| `INVALID_APPROVAL_STAGE` | 409 | Stage action out of order | Approval action is not valid in current stage |
| `TRAINER_NOT_AUTHORIZED_FOR_BATCH` | 403 | Trainer assignment fails | Trainer is not authorized for this Batch |
| `TRAINER_RECOMMENDATION_REQUIRED` | 422 | Coordinator action too early | Trainer Recommendation is required first |
| `COORDINATOR_APPROVAL_REQUIRED` | 422 | Final action too early | Coordinator Review approval is required first |
| `REJECTION_REASON_REQUIRED` | 400 | Reject without reason | Rejection reason is required |
| `APPROVAL_ALREADY_RECORDED` | 409 | Duplicate stage action | Approval decision already exists |
| `APPROVAL_EVIDENCE_STALE` | 409/422 | Evidence changed | Approval cannot continue until reevaluation |
| `APPROVAL_ACTOR_INELIGIBLE` | 403 | Actor domain rule fails | Actor is not eligible for this approval action |
| `APPROVAL_BRANCH_FORBIDDEN` | 403 | Branch mutation denied | User cannot approve for this branch |

---

# 14. Shared Error Catalog

| Error Code | HTTP | Meaning |
|---|---:|---|
| `VALIDATION_ERROR` | 400 | Generic input validation failure |
| `UNAUTHENTICATED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Missing permission |
| `BRANCH_MUTATION_FORBIDDEN` | 403 | Read access exists but mutation scope denied |
| `NOT_FOUND` | 404 | Resource unavailable in authorized scope |
| `CONCURRENCY_CONFLICT` | 409 | Version mismatch |
| `DUPLICATE_RESOURCE` | 409 | Unique/business duplicate |
| `DEPENDENCY_VALIDATION_FAILED` | 424 | Delegated validation failed |
| `DEPENDENCY_UNAVAILABLE` | 503 | Required dependency unavailable |
| `RATE_LIMITED` | 429 | Request rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected failure |
| `UNSUPPORTED_EXPORT_FORMAT` | 400 | Export format unsupported |
| `UNSUPPORTED_EXPORT_COLUMN` | 400 | Export column not allowed |
| `NO_DATA_FOR_EXPORT` | 422 | Export filters return no rows |
| `UNSUPPORTED_ENTITY_TYPE` | 400 | Audit/search target unsupported |

---

# 15. Notification Architecture

## 15.1 Ownership

Module 10 owns domain events such as:

```text
ExamScheduled
ExamRescheduled
ExamCancelled
ResultRecorded
ResultFinalized
ResultCorrected
CompletionEvaluationRequested
CompletionEvaluationCompleted
CompletionEvaluationFailed
CompletionRecommendationRequested
CompletionRecommended
CompletionRecommendationRejected
CoordinatorReviewRequested
CoordinatorReviewApproved
CoordinatorReviewRejected
FinalCompletionApprovalRequested
CourseCompletionApproved
CourseCompletionRejected
CompletionReevaluationRequired
CompletionReevaluated
CertificateEligible
```

Communication & Notification Management owns:

```text
CommunicationTemplate
NotificationRequest
NotificationLog
delivery channel
retry/provider status
message history
```

Therefore Module 10 emits business events or notification intents but does not persist notification delivery truth.

---

# 16. Notification Event Catalog

## 16.1 Exam Notification Events

| Event Code | Trigger | Primary Recipients | Channel Priority | Template Code |
|---|---|---|---|---|
| `EXC_EXAM_SCHEDULED` | Exam becomes Scheduled | Assigned Trainer, Academic Coordinator | System, Email | `exam_scheduled` |
| `EXC_EXAM_RESCHEDULED` | Exam date changes | Assigned Trainer, affected Students where policy allows, Coordinator | System, Email, SMS optional | `exam_rescheduled` |
| `EXC_EXAM_CANCELLED` | Exam cancelled | Assigned Trainer, affected Students where policy allows, Coordinator | System, Email, SMS optional | `exam_cancelled` |
| `EXC_EXAM_OPENED_FOR_RESULTS` | Exam opens for Result entry | Assigned Trainer(s) | System, Email | `exam_result_entry_opened` |
| `EXC_RESULTS_MISSING_REMINDER` | Missing Results remain after configured threshold | Assigned Trainer, Coordinator | System, Email | `missing_results_reminder` |

## 16.2 Result Notification Events

| Event Code | Trigger | Primary Recipients | Channel Priority | Template Code |
|---|---|---|---|---|
| `EXC_RESULT_RECORDED` | Result recorded | Academic Coordinator; Student only if publication policy permits | System | `result_recorded_internal` |
| `EXC_RESULT_FINALIZED` | Result finalized | Academic Coordinator; Student only if result publication policy permits | System, Email optional | `result_finalized` |
| `EXC_RESULT_CORRECTED` | Finalized Result corrected | Academic Administrator, Coordinator, impacted workflow actors | System, Email | `result_corrected` |
| `EXC_RESULT_CORRECTION_IMPACT` | Correction changes completion eligibility | Coordinator, Branch Manager when applicable | System, Email | `result_correction_completion_impact` |

## 16.3 Completion Workflow Notifications

| Event Code | Trigger | Primary Recipients | Channel Priority | Template Code |
|---|---|---|---|---|
| `EXC_COMPLETION_EVALUATION_READY` | Enrollment ready for evaluation | Academic Coordinator | System | `completion_evaluation_ready` |
| `EXC_COMPLETION_EVALUATION_FAILED` | Evaluation cannot complete due to configuration/evidence issue | Academic Admin, Coordinator | System, Email | `completion_evaluation_failed` |
| `EXC_TRAINER_RECOMMENDATION_REQUIRED` | Completion enters Trainer Recommendation stage | Assigned Trainer | System, Email | `trainer_recommendation_required` |
| `EXC_COORDINATOR_REVIEW_REQUIRED` | Trainer Recommendation approved | Academic Coordinator | System, Email | `coordinator_review_required` |
| `EXC_FINAL_APPROVAL_REQUIRED` | Coordinator Review approved | Branch Manager / final approver pool | System, Email | `final_completion_approval_required` |
| `EXC_COMPLETION_REJECTED` | Any rejection terminal outcome | Relevant prior actors, Academic Admin | System, Email | `completion_rejected` |
| `EXC_COMPLETION_APPROVED` | Final completion approved | Academic Coordinator, Trainer, Student when policy allows | System, Email | `completion_approved` |
| `EXC_REEVALUATION_REQUIRED` | Evidence change invalidates current evaluation basis | Academic Admin, Coordinator | System, Email | `completion_reevaluation_required` |
| `EXC_REEVALUATION_EXCEPTION` | Prior approval becomes questionable | Academic Admin, Branch Manager | System, Email, escalation | `completion_reevaluation_exception` |
| `EXC_CERTIFICATE_ELIGIBLE` | Completion approved and certificate conditions pass | Certificate Management consumer; Student notification only after Certificate context confirms issue | Internal event first | `certificate_eligible_internal` |

---

# 17. Notification Payload Contracts

## 17.1 Exam Scheduled Event

```ts
type ExamScheduledEvent = {
  eventId: string;
  eventType: "ExamScheduled";
  occurredAt: string;
  examId: string;
  courseId: string;
  batchId: string;
  branchId: string;
  examDate: string;
  actorUserId: string;
};
```

## 17.2 Exam Rescheduled Event

```ts
type ExamRescheduledEvent = {
  eventId: string;
  eventType: "ExamRescheduled";
  occurredAt: string;
  examId: string;
  batchId: string;
  branchId: string;
  oldExamDate: string;
  newExamDate: string;
  reason?: string;
  actorUserId: string;
};
```

## 17.3 Result Corrected Event

```ts
type ResultCorrectedEvent = {
  eventId: string;
  eventType: "ResultCorrected";
  occurredAt: string;
  resultId: string;
  examId: string;
  enrollmentId: string;
  branchId: string;
  previousMarks: string;
  correctedMarks: string;
  previousResultStatus: string;
  currentResultStatus: string;
  reason: string;
  actorUserId: string;
};
```

## 17.4 Completion Evaluation Completed Event

```ts
type CompletionEvaluationCompletedEvent = {
  eventId: string;
  eventType: "CompletionEvaluationCompleted";
  occurredAt: string;
  courseCompletionId: string;
  enrollmentId: string;
  branchId: string;
  completionStatus: string;
  manualApprovalRequired: boolean;
  nextAction:
    | "NONE"
    | "TRAINER_RECOMMENDATION"
    | "COORDINATOR_REVIEW"
    | "FINAL_APPROVAL";
};
```

## 17.5 Final Completion Approved Event

```ts
type CourseCompletionApprovedEvent = {
  eventId: string;
  eventType: "CourseCompletionApproved";
  occurredAt: string;
  courseCompletionId: string;
  enrollmentId: string;
  courseId: string;
  batchId: string;
  branchId: string;
  approvedByUserId: string;
  approvedAt: string;
  certificateAllowed: boolean;
  paymentValidationPassed: boolean;
};
```

## 17.6 Completion Reevaluation Required Event

```ts
type CompletionReevaluationRequiredEvent = {
  eventId: string;
  eventType: "CompletionReevaluationRequired";
  occurredAt: string;
  courseCompletionId: string;
  enrollmentId: string;
  branchId: string;
  triggerType:
    | "RESULT_CORRECTED"
    | "ATTENDANCE_CORRECTED"
    | "PAYMENT_VALIDATION_CHANGED"
    | "MANUAL_REEVALUATION";
  triggerReference?: string;
  previousCompletionStatus: string;
};
```

---

# 18. Notification Recipient Resolution Rules

## 18.1 Assigned Trainer

Resolved through:

```text
CourseCompletion
→ Enrollment
→ Batch
→ BatchTrainer
→ TrainerProfile
→ Person
```

Module 10 must not maintain a duplicate trainer-recipient table.

## 18.2 Academic Coordinator

Recipient resolution must use:

```text
configured role/permission assignment
AND branch access
AND notification policy
```

Do not hardcode a user named "Academic Coordinator".

## 18.3 Branch Manager

Resolve through Organization/IAM configuration:

```text
Branch.branchManagerId
or
permission-based approver assignment
```

Exact source must match repository implementation.

## 18.4 Student

Resolve:

```text
Enrollment
→ StudentProfile
→ Person
```

Student notification must use Person contact data or Communication context recipient resolution.

## 18.5 Auditor

Auditors are generally not notification recipients for routine operational events.

Only high-risk events may notify configured compliance recipients:

```text
Result correction
Approval override
Reevaluation exception
Repeated dependency failure
```

---

# 19. Notification Template Requirements

Templates should support English and Arabic where required.

Example template:

```text
Template Code:
completion_approved

Subject EN:
Course completion approved

Subject AR:
تم اعتماد إكمال الدورة

Body Parameters:
studentDisplayName
courseName
batchCode
approvalDate
branchName
```

Do not embed:

```text
Civil ID
Passport Number
Visa Number
full financial ledger
internal audit reason
```

unless a specific secure workflow explicitly requires it.

---

# 20. Notification Deduplication Rules

Notification requests must be idempotent.

Recommended deduplication key:

```text
eventId + templateCode + recipientPersonId + channel
```

Examples:

```text
EVT-001:trainer_recommendation_required:PERSON-100:EMAIL
EVT-001:trainer_recommendation_required:PERSON-100:SYSTEM
```

Repeated event delivery must not create duplicate outbound messages.

---

# 21. Notification Suppression Rules

Suppress notification when:

1. event is replayed and deduplication key already processed;
2. recipient has no valid contact for selected channel;
3. notification preference disables optional channel;
4. event is internal-only;
5. Student Result is not yet approved for Student publication;
6. Certificate is only eligible but not yet issued;
7. approval action was reverted before notification request creation according to transaction design.

Important:

```text
CertificateEligible
must not produce
"Your certificate has been issued"

Only CertificateGenerated/CertificateIssued
from Certificate context
may trigger issue confirmation.
```

---

# 22. Notification Escalation Rules

## 22.1 Missing Results Escalation

Suggested policy:

```text
T0:
Exam closes / Result entry due point reached

T+1 configured reminder interval:
Notify assigned Trainer

T+2 configured escalation interval:
Notify Academic Coordinator

T+3 configured escalation interval:
Notify Academic Administrator
```

Exact durations belong to configuration/NFR policy.

## 22.2 Approval Aging Escalation

Applicable queues:

```text
Trainer Recommendation
Coordinator Review
Final Approval
Reevaluation Exception
```

Escalation recipients must be resolved dynamically by branch and permission.

---

# 23. Validation Ownership Comparison Matrix

Status values:

```text
MODULE
DELEGATED
SHARED-KERNEL
ORCHESTRATED
```

Meaning:

- `MODULE`: business rule is owned by Module 10.
- `DELEGATED`: another bounded context is authoritative.
- `SHARED-KERNEL`: generic platform rule/convention.
- `ORCHESTRATED`: Module 10 combines facts from multiple owners without taking ownership of those facts.

| Validation Rule | Classification | Owner / Source | Module 10 Behavior |
|---|---|---|---|
| Exam name required | MODULE | Module 10 | Validate directly |
| ISO date syntax | SHARED-KERNEL | Shared validation | Reuse common schema |
| maxMarks > 0 | MODULE | Module 10 | Validate directly |
| passMarks >= 0 | MODULE | Module 10 | Validate directly |
| passMarks <= maxMarks | MODULE | Module 10 | Validate directly |
| Course exists | DELEGATED | Course Catalog | Resolve/read |
| Batch exists | DELEGATED | Training Delivery | Resolve/read |
| Batch belongs to Course | ORCHESTRATED | Training Delivery + Course reference | Compare authoritative IDs |
| Batch branch access | SHARED-KERNEL | IAM branch policy | Apply authorization result |
| Semantic duplicate Exam | MODULE | Module 10 | Reject |
| Exam transition allowed | MODULE | Module 10 | Validate state machine |
| Standard edit cannot invalidate finalized Result | MODULE | Module 10 | Reject unsafe edit |
| Cancellation reason required | MODULE | Module 10 | Validate |
| Soft delete only | SHARED-KERNEL | Repository convention | Enforce |
| Version match | SHARED-KERNEL | Concurrency convention | Enforce |
| Exam exists for Result | MODULE | Module 10 | Resolve |
| Enrollment exists | DELEGATED | Admission & Enrollment | Resolve |
| Enrollment Course matches Exam Course | ORCHESTRATED | Enrollment + Module 10 | Compare facts |
| Enrollment Batch matches Exam Batch | ORCHESTRATED | Enrollment + Module 10 | Compare facts |
| Enrollment branch matches Exam branch | ORCHESTRATED | Enrollment + Training Delivery | Compare facts |
| Marks non-negative | MODULE | Module 10 | Validate |
| Marks <= maxMarks | MODULE | Module 10 | Validate |
| Result status derived from marks | MODULE | Module 10 | Derive |
| One Result per Exam + Enrollment | MODULE | Module 10 | Unique invariant |
| Result finalization rule | MODULE | Module 10 | Validate |
| Result correction permission | SHARED-KERNEL + MODULE | IAM + Module 10 | Authorize and validate state |
| Correction reason required | MODULE | Module 10 | Validate |
| Bulk duplicate Enrollment rows | MODULE | Module 10 | Validate |
| Bulk branch authorization | SHARED-KERNEL + ORCHESTRATED | IAM + Enrollment/Exam | Authorize |
| Enrollment completion eligibility | DELEGATED | Admission & Enrollment | Resolve lifecycle validity |
| CourseCompletionRule | DELEGATED | Course Catalog | Consume |
| Attendance percentage | DELEGATED | Attendance | Consume |
| Exam pass evidence | MODULE | Module 10 | Resolve Result |
| Payment validation | DELEGATED | Finance | Consume |
| Missing required evidence blocks approval | MODULE | Module 10 | Evaluate |
| Dependency unavailable blocks false approval | MODULE | Module 10 orchestration | Fail safe |
| One CourseCompletion per Enrollment | MODULE | Module 10 | Unique invariant |
| Manual approval stage sequencing | MODULE | Module 10 | Enforce |
| Trainer assigned to Batch | DELEGATED | Training Delivery | Consume assignment truth |
| Trainer identity | DELEGATED | Faculty/Trainer + Person | Resolve |
| Stage-specific permission | SHARED-KERNEL + MODULE | IAM + Module 10 | Authorize action |
| Branch mutation access | SHARED-KERNEL | IAM | Enforce |
| Evidence stale check | MODULE + ORCHESTRATED | Module 10 using dependency versions/timestamps | Block approval |
| Certificate allowed by Course rule | ORCHESTRATED | Course Catalog + Module 10 | Evaluate eligibility |
| Certificate issue state | DELEGATED | Certificate Management | Read/notify only |
| Audit reason retention | SHARED-KERNEL | Audit & Compliance | Write through convention |
| Export format validation | SHARED-KERNEL | Platform export convention | Validate |
| Export branch intersection | SHARED-KERNEL | IAM | Enforce |
| Export allowed columns | MODULE | Module 10 report contract | Validate allowlist |

---

# 24. Validation Responsibility by Layer

## 24.1 Client

May validate:

```text
required field presence
text length
numeric syntax
simple cross-field comparison
date format
duplicate rows in current payload
```

Must not decide:

```text
permission
branch access
Course-Batch validity
Enrollment eligibility
Trainer assignment
Result finalization authority
Completion eligibility
Attendance pass
Payment pass
Certificate eligibility
```

## 24.2 API/Application Layer

Must:

```text
authenticate
authorize
derive branch
resolve cross-context facts
check expectedVersion
orchestrate domain validation
map domain errors
```

## 24.3 Domain Layer

Must own:

```text
Exam transitions
marks rules
Result derivation
Result lifecycle
completion evaluation decision
approval sequence
reevaluation state
```

## 24.4 Database

Should enforce where practical:

```text
primary keys
foreign keys
unique constraints
check constraints
non-null constraints
version minimum
one active CourseCompletion per Enrollment
one active Result per Exam + Enrollment
```

Database must not replace domain checks that require cross-context facts.

---

# 25. Notification Ownership Comparison

| Notification Concern | Owner | Module 10 Role |
|---|---|---|
| Domain event occurrence | Module 10 | Emit |
| Recipient business context | Module 10 + owning context facts | Provide references |
| Template storage | Communication | No ownership |
| Language rendering | Communication | Supply locale/person reference |
| Email delivery | Communication | No ownership |
| SMS delivery | Communication | No ownership |
| WhatsApp delivery | Communication | No ownership |
| Retry/provider tracking | Communication | No ownership |
| Notification history | Communication | Read if needed |
| Deduplication key input | Module 10 event ID | Provide stable event identity |
| Audit of business action | Audit & Compliance | Module emits/writes through convention |

---

# 26. Domain Event to Notification Mapping

| Domain Event | Notification Event | Notify? | Reason |
|---|---|---:|---|
| `ExamCreated` | none by default | No | Draft creation is internal |
| `ExamScheduled` | `EXC_EXAM_SCHEDULED` | Yes | Operational action required |
| `ExamRescheduled` | `EXC_EXAM_RESCHEDULED` | Yes | Schedule changed |
| `ExamCancelled` | `EXC_EXAM_CANCELLED` | Yes | High-impact operational change |
| `ResultRecorded` | `EXC_RESULT_RECORDED` | Conditional | Internal operational awareness |
| `ResultFinalized` | `EXC_RESULT_FINALIZED` | Conditional | Depends on publication policy |
| `ResultCorrected` | `EXC_RESULT_CORRECTED` | Yes | Sensitive academic change |
| `CompletionEvaluationRequested` | none | Usually No | Internal process event |
| `CompletionEvaluationCompleted` | next-stage event | Conditional | Notify next actor if action required |
| `CompletionEvaluationFailed` | `EXC_COMPLETION_EVALUATION_FAILED` | Yes | Requires operational resolution |
| `CompletionRecommendationRequested` | `EXC_TRAINER_RECOMMENDATION_REQUIRED` | Yes | Trainer action required |
| `CompletionRecommended` | `EXC_COORDINATOR_REVIEW_REQUIRED` | Yes | Coordinator action required |
| `CoordinatorReviewApproved` | `EXC_FINAL_APPROVAL_REQUIRED` | Yes | Final approver action required |
| `CourseCompletionApproved` | `EXC_COMPLETION_APPROVED` | Yes | Final outcome |
| `CourseCompletionRejected` | `EXC_COMPLETION_REJECTED` | Yes | Final/negative outcome |
| `CompletionReevaluationRequired` | `EXC_REEVALUATION_REQUIRED` | Yes | Operational exception |
| `CompletionReevaluated` | depends on changed outcome | Conditional | Notify only material outcome change |
| `CertificateEligible` | internal handoff | Internal | Certificate context owns issue notification |

---

# 27. Notification Template Variable Catalog

## 27.1 Common Variables

```text
recipientDisplayName
studentDisplayName
trainerDisplayName
courseName
batchCode
branchName
examName
examDate
oldExamDate
newExamDate
enrollmentNumber
completionStatus
approvalStage
actionRequiredBy
actionUrl
```

## 27.2 Prohibited Default Variables

Do not include by default:

```text
civilId
passportNumber
visaNumber
full payment history
password/reset token
internal stack trace
raw database IDs where user-facing reference exists
```

---

# 28. Error Localization Requirements

Error codes remain stable and language-neutral.

Persist/transport:

```text
PASS_MARKS_EXCEED_MAX
```

Display EN:

```text
Pass marks cannot exceed maximum marks.
```

Display AR:

```text
لا يمكن أن تتجاوز درجة النجاح الدرجة القصوى.
```

Rules:

1. client maps code to localized label where appropriate;
2. server may return safe default English message;
3. code is authoritative for programmatic handling;
4. localized text must not replace domain code;
5. validation field paths remain stable.

---

# 29. Error Logging Requirements

For all server errors:

Log:

```text
traceId
errorCode
route/action
userId when authenticated
entityType
entityId where safe
derivedBranchId
timestamp
dependency name when applicable
version conflict metadata
```

Do not log:

```text
passwords
session tokens
full PII payloads
unmasked Civil ID
passport number
visa number
full payment card data
```

---

# 30. High-Risk Error Handling

## 30.1 Result Correction Failure After Audit Write

Transaction design must prevent:

```text
audit says correction succeeded
but Result did not change
```

or:

```text
Result changed
but no audit evidence exists
```

Use repository-supported transactional or reliable audit convention.

## 30.2 Completion Evaluation Dependency Failure

If Attendance or Finance is unavailable:

```text
do not assume pass
do not preserve old pass as current truth without stale marker
do not advance approval workflow
return dependency-unavailable/evaluation-pending outcome
```

## 30.3 Notification Failure

Notification delivery failure must not roll back a successfully committed academic transaction unless architecture explicitly defines synchronous notification as critical, which is not recommended.

Business transaction truth remains in Module 10.

Communication context handles:

```text
delivery retry
failure log
provider error
reconciliation
```

---

# 31. Validation-to-Error Mapping

| Validation Rule | Error Code |
|---|---|
| Exam name blank | `EXAM_NAME_REQUIRED` |
| maxMarks <= 0 | `MAX_MARKS_INVALID` |
| passMarks < 0 | `PASS_MARKS_INVALID` |
| passMarks > maxMarks | `PASS_MARKS_EXCEED_MAX` |
| Course missing | `COURSE_NOT_FOUND` |
| Batch missing | `BATCH_NOT_FOUND` |
| Course/Batch mismatch | `COURSE_BATCH_MISMATCH` |
| duplicate Exam | `DUPLICATE_EXAM` |
| invalid Exam transition | `EXAM_INVALID_STATE_TRANSITION` |
| marks < 0 | `MARKS_NEGATIVE` |
| marks > max | `MARKS_EXCEED_MAXIMUM` |
| invalid Enrollment for Exam | `ENROLLMENT_NOT_ELIGIBLE_FOR_EXAM` |
| duplicate Result | `RESULT_DUPLICATE` |
| standard edit after finalize | `RESULT_ALREADY_FINALIZED` |
| missing correction reason | `CORRECTION_REASON_REQUIRED` |
| unchanged corrected marks | `CORRECTED_MARKS_UNCHANGED` |
| missing completion rule | `COURSE_COMPLETION_RULE_NOT_CONFIGURED` |
| attendance unavailable | `ATTENDANCE_DEPENDENCY_UNAVAILABLE` |
| payment validation unavailable | `FINANCE_DEPENDENCY_UNAVAILABLE` |
| stale completion evidence | `COMPLETION_EVIDENCE_STALE` |
| invalid reevaluation trigger | `INVALID_REEVALUATION_TRIGGER` |
| trainer not assigned | `TRAINER_NOT_AUTHORIZED_FOR_BATCH` |
| missing trainer stage | `TRAINER_RECOMMENDATION_REQUIRED` |
| missing coordinator stage | `COORDINATOR_APPROVAL_REQUIRED` |
| reject without remarks | `REJECTION_REASON_REQUIRED` |
| stale version | `CONCURRENCY_CONFLICT` |
| mutation outside branch | `BRANCH_MUTATION_FORBIDDEN` |

---

# 32. Implementation Validation Checklist

Before implementation, verify:

```text
1. Existing validation library and schema patterns.
2. Existing error envelope.
3. Existing error code naming convention.
4. Existing localization mechanism for error codes.
5. Existing reason-field min/max conventions.
6. Existing decimal serialization convention.
7. Exact Result finalization persistence.
8. Actual completionStatus enum.
9. Actual CompletionApproval status enum.
10. Whether evidence version/timestamp is available for stale checks.
11. Existing Communication event contract.
12. Existing Notification template naming conventions.
13. Existing notification preference model.
14. Existing deduplication mechanism.
15. Existing audit transaction convention.
16. Existing service/system principal mechanism.
17. Existing branch authorization policy helper.
18. Existing export allowlist mechanism.
19. Existing retry behavior for notification delivery.
20. Whether student Result publication policy exists.
```

---

# 33. Final Validation Boundary

The final rule is:

```text
Module 10 owns validation of:
- Exam lifecycle,
- marks and Result behavior,
- completion evaluation logic,
- approval sequencing,
- reevaluation workflow.

Module 10 delegates validation of:
- Course rules,
- Enrollment truth,
- Batch truth,
- Trainer assignment,
- Attendance truth,
- Finance truth,
- Certificate issue state,
- IAM authorization.

Shared Kernel provides:
- common schema rules,
- IDs,
- pagination,
- version checks,
- soft delete conventions,
- error envelope,
- branch authorization framework,
- audit conventions.

Communication Management owns:
- templates,
- channels,
- delivery,
- retry,
- notification log.

Module 10 emits business events and notification intents,
but does not become a second source of truth
for another bounded context.
```
