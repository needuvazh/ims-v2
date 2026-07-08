# Part 7 – Validation Rules, Error Catalog, Notifications

## Module 09 – Faculty / Trainer Management

## 1. Purpose

This document defines validation schemas, domain validation algorithms, structured error codes, and notification event contracts for Module 09. Communication delivery is owned by Communication & Notification Management; Module 09 emits in-process domain events and supplies exact template variables. It does not directly send Email, SMS, or WhatsApp messages.

## 2. Validation Architecture

Validation occurs in five layers:

1. **Transport validation** – Zod parsing of route parameters, queries, and request bodies.
2. **Authorization validation** – authentication, permission, branch scope, and sensitive-field permission.
3. **Referential validation** – existence and accessibility of Person, Branch, Course, Batch, Session, and Document references through owning boundaries.
4. **Domain validation** – uniqueness, effective-date rules, overlap checks, status transitions, eligibility, and compensation specificity.
5. **Persistence validation** – database uniqueness, foreign key, optimistic version, and soft-delete invariants.

Client validation improves UX but is never authoritative.

---

## 3. Reusable Zod Schemas

```ts
import { z } from 'zod';

export const EntityIdSchema = z.string().trim().min(1).max(64);

export const OmanBusinessDateSchema = z.coerce.date();

export const TimeHHmmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must use 24-hour HH:mm format.');

export const ReasonSchema = z.string().trim().min(10).max(1000);

export const TrainerTypeSchema = z.enum(['FullTime', 'PartTime', 'Freelance']);

export const TrainerStatusSchema = z.enum(['Active', 'Inactive', 'Suspended']);

export const WeekdaySchema = z.enum([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);

export const AuthorizationStatusSchema = z.enum([
  'Active',
  'Inactive',
  'Suspended',
  'Expired',
]);

export const PaymentBasisSchema = z.enum([
  'PerHour',
  'PerSession',
  'PerStudent',
  'Fixed',
]);

export const OMRAmountSchema = z.coerce
  .number()
  .positive()
  .multipleOf(0.001)
  .max(999999999.999);
```

## 4. Trainer Profile Validation Rules

| Rule ID     | Validation                                                                                                               | Enforcement                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| VAL-FTM-001 | `personId` must reference an existing canonical Person.                                                                  | Referential service check.                                |
| VAL-FTM-002 | One Person may have at most one non-deleted TrainerProfile.                                                              | Service pre-check + unique partial constraint/equivalent. |
| VAL-FTM-003 | `trainerCode` is system-generated when numbering series is configured and unique among non-deleted profiles.             | Numbering service + unique constraint.                    |
| VAL-FTM-004 | `trainerType` must be FullTime, PartTime, or Freelance.                                                                  | Zod enum + database enum/check.                           |
| VAL-FTM-005 | Initial status may be Active or Inactive only.                                                                           | Create schema.                                            |
| VAL-FTM-006 | `specialization` length 2–500 after trimming.                                                                            | Zod.                                                      |
| VAL-FTM-007 | `qualificationSummary` maximum length 2,000.                                                                             | Zod.                                                      |
| VAL-FTM-008 | `effectiveEndDate >= effectiveStartDate` when end date exists.                                                           | Zod superRefine + domain service.                         |
| VAL-FTM-009 | Person-owned names, Civil ID, passport, nationality, email, and phone cannot be mutated through TrainerProfile endpoint. | Strict schema + ownership check.                          |
| VAL-FTM-010 | Update `version` must equal persisted version.                                                                           | Optimistic concurrency compare.                           |

### 4.1 Trainer Profile Schema

```ts
export const CreateTrainerProfileSchema = z
  .object({
    personId: EntityIdSchema,
    branchId: EntityIdSchema,
    trainerType: TrainerTypeSchema,
    specialization: z.string().trim().min(2).max(500),
    qualificationSummary: z.string().trim().max(1000).nullable().optional(),
    status: z.enum(['Active', 'Inactive']),
    effectiveStartDate: OmanBusinessDateSchema,
    effectiveEndDate: OmanBusinessDateSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.effectiveEndDate &&
      value.effectiveEndDate < value.effectiveStartDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['effectiveEndDate'],
        message: 'effectiveEndDate must be on or after effectiveStartDate.',
      });
    }
  });
```

## 5. Trainer Status Transition Validation

Allowed transitions:

| From      | To         | Allowed                                            |
| --------- | ---------- | -------------------------------------------------- |
| Inactive  | Active     | Yes                                                |
| Active    | Inactive   | Yes                                                |
| Active    | Suspended  | Yes                                                |
| Suspended | Active     | Yes                                                |
| Suspended | Inactive   | Yes                                                |
| Inactive  | Suspended  | No                                                 |
| Any       | Same state | Idempotent no-op; no duplicate state-change event. |

Validation sequence:

1. Load trainer inside writable branch scope.
2. Compare request version.
3. Verify requested transition appears in matrix.
4. Verify effective timestamp is not before profile `effectiveStartDate`.
5. For transition to Active, verify current business date/effective timestamp is within profile effective period.
6. For transition away from Active, query Training Delivery assignment references for active/future impact.
7. When impact exists, require explicit acknowledgement/impact review flag if Part 1 policy requires it; otherwise reject with impact-review error.
8. Require reason length 10–1000.
9. Write status, audit delta, and lifecycle event atomically.

## 6. Qualification Validation

| Rule ID     | Validation                                                                         |
| ----------- | ---------------------------------------------------------------------------------- |
| VAL-FTM-020 | `qualificationName` length 2–200.                                                  |
| VAL-FTM-021 | `institution` length 2–200.                                                        |
| VAL-FTM-022 | `yearCompleted` integer from 1900 through current Oman business year.              |
| VAL-FTM-023 | Optional `documentId` must exist and be visible through Document Management scope. |
| VAL-FTM-024 | Document verification status is read-only in this module.                          |
| VAL-FTM-025 | Soft deletion requires reason and audit record.                                    |

```ts
export const TrainerQualificationSchema = z
  .object({
    qualificationName: z.string().trim().min(2).max(200),
    institution: z.string().trim().min(2).max(200),
    yearCompleted: z.number().int().min(1900),
    documentId: EntityIdSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const omanYear = getOmanBusinessYear();
    if (value.yearCompleted > omanYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['yearCompleted'],
        message: `yearCompleted cannot be later than ${omanYear}.`,
      });
    }
  });
```

## 7. Availability Validation

### 7.1 Input Rules

| Rule ID     | Validation                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| VAL-FTM-030 | `dayOfWeek` must be Monday–Sunday enum.                                                               |
| VAL-FTM-031 | `startTime` and `endTime` use `HH:mm` 24-hour format.                                                 |
| VAL-FTM-032 | `startTime < endTime`.                                                                                |
| VAL-FTM-033 | Cross-midnight windows are not stored in one record; use two weekday records.                         |
| VAL-FTM-034 | Effective end date must not precede start date.                                                       |
| VAL-FTM-035 | Active windows for same trainer, branch, weekday, and intersecting effective period must not overlap. |
| VAL-FTM-036 | Proposed assignment interval must be fully contained within one effective active availability window. |
| VAL-FTM-037 | Weekday calculations use `Asia/Muscat`.                                                               |

### 7.2 Overlap Algorithm

Two availability records conflict when all conditions are true:

```text
same trainerId
AND same branchId
AND same dayOfWeek
AND both status = Active
AND business-effective date ranges intersect
AND time intervals overlap
```

Date-range intersection:

```text
existing.start <= candidate.end_or_infinity
AND candidate.start <= existing.end_or_infinity
```

Time overlap:

```text
candidate.startTime < existing.endTime
AND existing.startTime < candidate.endTime
```

Adjacent windows are allowed: `09:00–12:00` and `12:00–15:00` do not overlap.

## 8. Course Authorization Validation

| Rule ID     | Validation                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| VAL-FTM-040 | `courseId` must reference existing Course owned by Course Catalog.                                               |
| VAL-FTM-041 | Initial authorization status may be Active or Inactive.                                                          |
| VAL-FTM-042 | Effective end date must be on/after start date.                                                                  |
| VAL-FTM-043 | Overlapping Active authorization periods for same trainer/course are prohibited.                                 |
| VAL-FTM-044 | An authorization past `effectiveEndDate` is ineffective even if stored status has not yet normalized to Expired. |
| VAL-FTM-045 | Course authorization grants delivery eligibility only; it never grants IAM access.                               |
| VAL-FTM-046 | Transition reason is mandatory for suspension, reactivation, expiry override, or deactivation.                   |

### 8.1 Effective Authorization Evaluation

```text
authorization.isDeleted = false
AND authorization.status = Active
AND targetDate >= effectiveStartDate
AND (effectiveEndDate IS NULL OR targetDate <= effectiveEndDate)
```

## 9. Compensation Rate Validation

| Rule ID     | Validation                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| VAL-FTM-050 | `paymentBasis` limited to PerHour, PerSession, PerStudent, Fixed.                                                        |
| VAL-FTM-051 | `amount > 0`.                                                                                                            |
| VAL-FTM-052 | OMR amount supports maximum 3 decimal places.                                                                            |
| VAL-FTM-053 | Currency is OMR in current ASTI scope.                                                                                   |
| VAL-FTM-054 | Effective end date must be on/after start date.                                                                          |
| VAL-FTM-055 | Same trainer, basis, specificity level, and intersecting effective period may not have multiple active applicable rates. |
| VAL-FTM-056 | Session-specific reference must identify an existing Session.                                                            |
| VAL-FTM-057 | Batch-specific reference must identify an existing Batch.                                                                |
| VAL-FTM-058 | When both sessionId and batchId are provided, Session must belong to Batch.                                              |
| VAL-FTM-059 | Resolution precedence is Session → Batch → Trainer.                                                                      |
| VAL-FTM-060 | Compensation access requires explicit compensation permission.                                                           |

### 9.1 Rate Ambiguity Algorithm

For candidate active rate, calculate specificity:

```text
SESSION if sessionId exists
BATCH if sessionId absent and batchId exists
TRAINER if both absent
```

Reject when another non-deleted Active rate exists with same:

```text
trainerId
paymentBasis
specificity
specific target reference at that specificity
intersecting effective date range
```

## 10. Eligibility Validation

A trainer is assignment-eligible only when all applicable checks pass:

1. TrainerProfile exists and is not soft-deleted.
2. Requested branch is inside caller scope.
3. Profile status is Active.
4. Target date falls within TrainerProfile effective period.
5. Active/effective TrainerCourseAuthorization exists for course.
6. When a time interval is supplied, one Active/effective availability window fully contains the interval.
7. Scheduling conflict check is still required before final timetable commitment.
8. Training Delivery remains owner of BatchTrainer and Session assignment creation.

Business ineligibility returns a structured reason set rather than an exception when called through validation endpoints.

## 11. Soft Delete and Referential Protection Validation

| Rule ID     | Validation                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------- |
| VAL-FTM-070 | No hard delete is permitted.                                                                    |
| VAL-FTM-071 | TrainerProfile with active or future Batch/Session references cannot be soft-deleted.           |
| VAL-FTM-072 | Qualification, availability, authorization, and compensation soft deletes require audit reason. |
| VAL-FTM-073 | Soft-deleted records are excluded from normal search and eligibility calculations.              |
| VAL-FTM-074 | Historical audit records remain immutable after source record soft deletion.                    |

---

# 12. Structured Error Catalog

## 12.1 Authentication and Authorization Errors

| Error Code                                        | HTTP | Meaning                                                        | Client Handling                                           |
| ------------------------------------------------- | ---: | -------------------------------------------------------------- | --------------------------------------------------------- |
| `ERR_AUTH_UNAUTHENTICATED`                        |  401 | No valid authenticated session.                                | Redirect to sign-in.                                      |
| `ERR_AUTH_PERMISSION_DENIED`                      |  403 | Required action permission missing.                            | Show access-denied state; do not retry automatically.     |
| `ERR_FTM_BRANCH_SCOPE_DENIED`                     |  403 | Requested branch/entity is outside authorized scope.           | Show scope denial without exposing hidden entity details. |
| `ERR_FTM_CONSOLIDATED_REPORT_PERMISSION_REQUIRED` |  403 | Cross-branch consolidated report requested without permission. | Remove consolidated mode and show message.                |
| `ERR_FTM_COMPENSATION_PERMISSION_DENIED`          |  403 | Compensation data requested without explicit permission.       | Hide compensation surface; do not cache response.         |

## 12.2 Trainer Profile Errors

| Error Code                                         | HTTP | Meaning                                                         |
| -------------------------------------------------- | ---: | --------------------------------------------------------------- |
| `ERR_FTM_VALIDATION_FAILED`                        |  400 | Request failed schema validation.                               |
| `ERR_FTM_INVALID_QUERY`                            |  400 | Query filter/sort/paging values invalid.                        |
| `ERR_FTM_TRAINER_NOT_FOUND`                        |  404 | Trainer not found in accessible scope.                          |
| `ERR_FTM_DUPLICATE_TRAINER_PROFILE`                |  409 | Person already has a non-deleted TrainerProfile.                |
| `ERR_FTM_TRAINER_CODE_CONFLICT`                    |  409 | Generated or imported trainer code conflicts.                   |
| `ERR_FTM_VERSION_CONFLICT`                         |  409 | Optimistic concurrency version mismatch.                        |
| `ERR_FTM_INVALID_STATUS_TRANSITION`                |  409 | Requested trainer status transition not allowed.                |
| `ERR_FTM_ACTIVE_ASSIGNMENT_IMPACT_REVIEW_REQUIRED` |  409 | Status change requires active/future assignment impact review.  |
| `ERR_FTM_EFFECTIVE_DATE_INVALID`                   |  422 | Effective date range invalid.                                   |
| `ERR_FTM_STATUS_EFFECTIVE_DATE_INVALID`            |  422 | Status transition effective time conflicts with profile period. |
| `ERR_FTM_PERSON_FIELD_OWNERSHIP_VIOLATION`         |  400 | Request attempted to mutate Person-owned fields.                |
| `ERR_FTM_SOFT_DELETE_BLOCKED_BY_ASSIGNMENTS`       |  409 | Trainer profile has active or future assignments.               |

## 12.3 Qualification and Document Errors

| Error Code                                    | HTTP | Meaning                                                 |
| --------------------------------------------- | ---: | ------------------------------------------------------- |
| `ERR_FTM_QUALIFICATION_NOT_FOUND`             |  404 | Qualification not found in trainer scope.               |
| `ERR_FTM_QUALIFICATION_YEAR_IN_FUTURE`        |  422 | Completion year exceeds current Oman business year.     |
| `ERR_DOC_DOCUMENT_NOT_FOUND`                  |  404 | Evidence document does not exist.                       |
| `ERR_DOC_DOCUMENT_SCOPE_DENIED`               |  403 | Caller cannot access selected evidence document.        |
| `ERR_FTM_DOCUMENT_STATUS_OWNERSHIP_VIOLATION` |  400 | Module attempted to change Document verification state. |

## 12.4 Availability Errors

| Error Code                                        |                HTTP | Meaning                                                |
| ------------------------------------------------- | ------------------: | ------------------------------------------------------ |
| `ERR_FTM_AVAILABILITY_NOT_FOUND`                  |                 404 | Availability record not found.                         |
| `ERR_FTM_AVAILABILITY_TIME_FORMAT_INVALID`        |                 400 | Time is not valid `HH:mm`.                             |
| `ERR_FTM_AVAILABILITY_TIME_ORDER_INVALID`         |                 422 | Start time is not earlier than end time.               |
| `ERR_FTM_AVAILABILITY_CROSS_MIDNIGHT_NOT_ALLOWED` |                 422 | Single recurring window crosses midnight.              |
| `ERR_FTM_AVAILABILITY_OVERLAP`                    |                 409 | Candidate overlaps effective Active window.            |
| `ERR_FTM_AVAILABILITY_NOT_COVERED`                | 200/Business Result | Proposed interval not fully contained in availability. |

Example overlap error details:

```json
{
  "error": {
    "code": "ERR_FTM_AVAILABILITY_OVERLAP",
    "message": "The availability window overlaps an existing active window.",
    "fieldErrors": {},
    "details": {
      "conflictingAvailabilityId": "avl_01J4F6Q8S0V2Y4B6D8G0K2M4P6R8",
      "dayOfWeek": "Monday",
      "existingStartTime": "09:00",
      "existingEndTime": "13:00"
    },
    "requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9"
  }
}
```

## 12.5 Course Authorization Errors

| Error Code                                     |                HTTP | Meaning                                                             |
| ---------------------------------------------- | ------------------: | ------------------------------------------------------------------- |
| `ERR_FTM_AUTHORIZATION_NOT_FOUND`              |                 404 | Authorization not found.                                            |
| `ERR_FTM_AUTHORIZATION_OVERLAP`                |                 409 | Active authorization period overlaps existing Active authorization. |
| `ERR_FTM_AUTHORIZATION_TRANSITION_INVALID`     |                 409 | Requested authorization lifecycle transition is not allowed.        |
| `ERR_FTM_AUTHORIZATION_EFFECTIVE_DATE_INVALID` |                 422 | Authorization effective range invalid.                              |
| `ERR_FTM_COURSE_NOT_AUTHORIZED`                | 200/Business Result | Trainer is not effectively authorized on target date.               |
| `ERR_CAT_COURSE_NOT_FOUND`                     |                 404 | Course reference does not exist.                                    |

## 12.6 Eligibility Errors and Results

| Code                                | Transport       | Meaning                                          |
| ----------------------------------- | --------------- | ------------------------------------------------ |
| `ERR_FTM_ELIGIBILITY_INPUT_INVALID` | HTTP 400        | Required course/branch/date inputs invalid.      |
| `TRAINER_NOT_FOUND`                 | Business result | Trainer absent or inaccessible.                  |
| `PROFILE_INACTIVE`                  | Business result | Trainer status not Active.                       |
| `PROFILE_OUTSIDE_EFFECTIVE_PERIOD`  | Business result | Date outside trainer profile effective range.    |
| `COURSE_NOT_AUTHORIZED`             | Business result | No effective Active authorization.               |
| `TRAINER_NOT_AVAILABLE`             | Business result | Time interval not fully covered by availability. |

## 12.7 Compensation Errors

| Error Code                            | HTTP | Meaning                                                                         |
| ------------------------------------- | ---: | ------------------------------------------------------------------------------- |
| `ERR_FTM_RATE_NOT_FOUND`              |  404 | No applicable or requested rate found.                                          |
| `ERR_FTM_RATE_AMOUNT_INVALID`         |  422 | Amount is zero, negative, over precision, or above maximum.                     |
| `ERR_FTM_RATE_OVERLAP`                |  409 | Candidate rate overlaps an active same-specificity rate.                        |
| `ERR_FTM_RATE_AMBIGUOUS`              |  409 | Multiple applicable rates found at same resolution level; data integrity issue. |
| `ERR_FTM_RATE_EFFECTIVE_DATE_INVALID` |  422 | Rate date range invalid.                                                        |
| `ERR_TRD_BATCH_NOT_FOUND`             |  404 | Batch reference not found.                                                      |
| `ERR_TRD_SESSION_NOT_FOUND`           |  404 | Session reference not found.                                                    |
| `ERR_TRD_SESSION_BATCH_MISMATCH`      |  422 | Session does not belong to supplied Batch.                                      |

## 12.8 Reporting and Export Errors

| Error Code                               | HTTP | Meaning                                                     |
| ---------------------------------------- | ---: | ----------------------------------------------------------- |
| `ERR_FTM_REPORT_CODE_INVALID`            |  400 | Unsupported report code.                                    |
| `ERR_FTM_REPORT_RANGE_TOO_LARGE`         |  422 | Requested period exceeds configured report bound.           |
| `ERR_FTM_REPORT_EXPORT_LIMIT_EXCEEDED`   |  422 | Export row count exceeds synchronous export limit.          |
| `ERR_FTM_REPORT_FIELD_PERMISSION_DENIED` |  403 | Requested report field requires extra sensitive permission. |
| `ERR_FTM_EXPORT_RATE_LIMITED`            |  429 | Export request frequency exceeds policy.                    |

## 12.9 Dependency and System Errors

| Error Code                                      | HTTP | Meaning                                                                                                        |
| ----------------------------------------------- | ---: | -------------------------------------------------------------------------------------------------------------- |
| `ERR_FTM_DEPENDENCY_UNAVAILABLE`                |  503 | Required owning module unavailable for synchronous validation.                                                 |
| `ERR_FTM_EVENT_PUBLICATION_FAILED_AFTER_COMMIT` |  500 | Post-commit in-process event publication failed; operation is committed and requires operational retry/repair. |
| `ERR_FTM_INTERNAL`                              |  500 | Unexpected server error; request ID required for support.                                                      |

---

# 13. Notification Architecture

## 13.1 Ownership Rule

Module 09 emits domain events. Communication & Notification Management decides channel eligibility, template status, recipient preference, opt-out rules, provider delivery, retries, and delivery logs.

No notification failure may roll back an already committed Trainer Management business transaction.

## 13.2 Notification Event Matrix

| Domain Event                           | Notification Purpose                                                                     | Default Channels           | Recipient Audience                                | Template Code                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------- | ------------------------------------- |
| `TrainerCreated`                       | Welcome/registration notice when trainer communication is enabled.                       | Email, WhatsApp            | Trainer                                           | `FTM_TRAINER_CREATED`                 |
| `TrainerStatusChanged`                 | Inform trainer of activation, suspension, or deactivation.                               | Email, SMS, WhatsApp       | Trainer                                           | `FTM_TRAINER_STATUS_CHANGED`          |
| `TrainerQualificationAdded`            | Confirm qualification record addition.                                                   | Email                      | Trainer, optional Compliance distribution         | `FTM_QUALIFICATION_ADDED`             |
| `TrainerAvailabilityUpdated`           | Confirm material availability change.                                                    | Email, WhatsApp            | Trainer                                           | `FTM_AVAILABILITY_UPDATED`            |
| `TrainerCourseAuthorized`              | Inform trainer of course authorization.                                                  | Email, WhatsApp            | Trainer                                           | `FTM_COURSE_AUTHORIZED`               |
| `TrainerCourseAuthorizationSuspended`  | Notify authorization suspension.                                                         | Email, SMS, WhatsApp       | Trainer                                           | `FTM_COURSE_AUTHORIZATION_SUSPENDED`  |
| `TrainerCourseAuthorizationExpired`    | Inform trainer that authorization expired.                                               | Email, WhatsApp            | Trainer                                           | `FTM_COURSE_AUTHORIZATION_EXPIRED`    |
| `TrainerCompensationRateConfigured`    | Notify authorized internal finance recipient; trainer notification is policy-controlled. | Email                      | Authorized finance recipients; optionally Trainer | `FTM_COMPENSATION_RATE_CONFIGURED`    |
| `TrainerAssignmentEligibilityFailed`   | Operational alert when assignment validation fails during planning.                      | System Notification, Email | Training Coordinator / Academic Coordinator       | `FTM_ASSIGNMENT_ELIGIBILITY_FAILED`   |
| `TrainerQualificationEvidenceExpiring` | Compliance reminder derived from Document expiry event correlation.                      | Email, SMS, WhatsApp       | Trainer, Compliance Officer                       | `FTM_QUALIFICATION_EVIDENCE_EXPIRING` |

## 13.3 Exact Template Variables

### Template `FTM_TRAINER_CREATED`

Required variables:

```text
{{trainer.fullName.en}}
{{trainer.fullName.ar}}
{{trainer.trainerCode}}
{{trainer.trainerType}}
{{branch.name.en}}
{{branch.name.ar}}
{{profile.effectiveStartDate}}
{{institute.name.en}}
{{institute.name.ar}}
{{support.email}}
{{support.phone}}
```

### Template `FTM_TRAINER_STATUS_CHANGED`

```text
{{trainer.fullName.en}}
{{trainer.fullName.ar}}
{{trainer.trainerCode}}
{{status.from}}
{{status.to}}
{{status.effectiveAt}}
{{status.reason}}
{{branch.name.en}}
{{branch.name.ar}}
{{performedBy.displayName}}
{{support.email}}
{{support.phone}}
```

### Template `FTM_QUALIFICATION_ADDED`

```text
{{trainer.fullName.en}}
{{trainer.fullName.ar}}
{{trainer.trainerCode}}
{{qualification.name}}
{{qualification.institution}}
{{qualification.yearCompleted}}
{{qualification.documentVerificationStatus}}
{{qualification.recordedAt}}
{{branch.name.en}}
{{branch.name.ar}}
```

### Template `FTM_AVAILABILITY_UPDATED`

```text
{{trainer.fullName.en}}
{{trainer.fullName.ar}}
{{trainer.trainerCode}}
{{availability.branchName.en}}
{{availability.branchName.ar}}
{{availability.dayOfWeek.en}}
{{availability.dayOfWeek.ar}}
{{availability.startTime}}
{{availability.endTime}}
{{availability.effectiveStartDate}}
{{availability.effectiveEndDate}}
{{availability.status}}
{{timezone}}
```

`{{timezone}}` value is `Asia/Muscat`.

### Template `FTM_COURSE_AUTHORIZED`

```text
{{trainer.fullName.en}}
{{trainer.fullName.ar}}
{{trainer.trainerCode}}
{{course.code}}
{{course.name.en}}
{{course.name.ar}}
{{authorization.effectiveStartDate}}
{{authorization.effectiveEndDate}}
{{authorization.status}}
{{branch.name.en}}
{{branch.name.ar}}
```

### Template `FTM_COURSE_AUTHORIZATION_SUSPENDED`

```text
{{trainer.fullName.en}}
{{trainer.fullName.ar}}
{{trainer.trainerCode}}
{{course.code}}
{{course.name.en}}
{{course.name.ar}}
{{authorization.previousStatus}}
{{authorization.currentStatus}}
{{authorization.effectiveAt}}
{{authorization.reason}}
{{support.email}}
{{support.phone}}
```

### Template `FTM_COURSE_AUTHORIZATION_EXPIRED`

```text
{{trainer.fullName.en}}
{{trainer.fullName.ar}}
{{trainer.trainerCode}}
{{course.code}}
{{course.name.en}}
{{course.name.ar}}
{{authorization.effectiveEndDate}}
{{authorization.expiredAt}}
{{support.email}}
{{support.phone}}
```

### Template `FTM_COMPENSATION_RATE_CONFIGURED`

Because compensation is sensitive, channel payload generation requires compensation-read authorization for recipients.

```text
{{trainer.fullName.en}}
{{trainer.trainerCode}}
{{compensation.paymentBasis}}
{{compensation.amount}}
{{compensation.currency}}
{{compensation.specificity}}
{{compensation.batchCode}}
{{compensation.sessionTitle}}
{{compensation.effectiveStartDate}}
{{compensation.effectiveEndDate}}
{{compensation.status}}
{{configuredBy.displayName}}
```

`batchCode` and `sessionTitle` may be empty only when specificity does not use them.

### Template `FTM_ASSIGNMENT_ELIGIBILITY_FAILED`

```text
{{trainer.fullName.en}}
{{trainer.fullName.ar}}
{{trainer.trainerCode}}
{{course.code}}
{{course.name.en}}
{{course.name.ar}}
{{branch.name.en}}
{{branch.name.ar}}
{{assignment.date}}
{{assignment.startTime}}
{{assignment.endTime}}
{{eligibility.reasonCodes}}
{{requestedBy.displayName}}
{{timezone}}
```

### Template `FTM_QUALIFICATION_EVIDENCE_EXPIRING`

```text
{{trainer.fullName.en}}
{{trainer.fullName.ar}}
{{trainer.trainerCode}}
{{qualification.name}}
{{document.documentType}}
{{document.fileName}}
{{document.expiryDate}}
{{document.daysUntilExpiry}}
{{branch.name.en}}
{{branch.name.ar}}
{{support.email}}
{{support.phone}}
```

## 13.4 Channel Eligibility Rules

| Channel             | Rules                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Email               | Recipient must have valid email in canonical Person/contact data; template must be Active in requested language or fallback language.    |
| SMS                 | Recipient must have valid E.164-compatible mobile number; message length and provider constraints are enforced by Communication context. |
| WhatsApp            | Recipient must have valid opted-in WhatsApp-capable number according to configured communication policy.                                 |
| System Notification | Internal authenticated user recipient only; stored and delivered by Communication context.                                               |

## 13.5 Bilingual Template Resolution

1. Use recipient preferred language when available.
2. Otherwise use User preferred language for internal recipients.
3. Otherwise use ASTI default language.
4. English and Arabic template variants must be maintained under the same `templateCode` and channel.
5. Missing localized Person/Course/Branch value falls back to available English value, then canonical display name.
6. Dates are formatted for locale but interpreted in Oman GST.
7. Numeric compensation values use OMR precision of three decimal places in authorized templates.

## 13.6 Notification Suppression Rules

1. Same-state idempotent trainer status request emits no `TrainerStatusChanged` event and no notification.
2. Validation failures emit no external notification.
3. Failed transaction emits no business event.
4. Compensation rate notification is suppressed for recipients lacking compensation authorization.
5. Soft-deleted trainer records receive no new operational notifications except legally required audit/compliance communication approved by policy.
6. Bulk data repair actions may suppress per-record notifications only when an authorized maintenance mode is explicitly recorded and audited.
7. Notification delivery failure never reverses Trainer Management state.

## 13.7 Domain Event Payload Contracts

### `TrainerStatusChanged`

```json
{
  "eventId": "evt_01J2P4Y6A8D0G2K4M6Q8T0V2X4Z6",
  "eventType": "TrainerStatusChanged",
  "occurredAt": "2026-07-04T12:00:00+04:00",
  "trainerId": "trn_01J8B0L3N5R7T9V1X2Z4C6D8F0H2",
  "personId": "per_01J9C1M4P6S8U0W2Y3A5E7G9J1K3",
  "branchId": "br_mct",
  "fromStatus": "Active",
  "toStatus": "Suspended",
  "effectiveAt": "2026-07-05T00:00:00+04:00",
  "reason": "Qualification authorization review required.",
  "performedByUserId": "usr_01J1N3X5Z7C9F1J3L5P7S9U1W3Y5"
}
```

### `TrainerCourseAuthorized`

```json
{
  "eventId": "evt_01J2P4Y6A8D0G2K4M6Q8T0V2X4Z6",
  "eventType": "TrainerCourseAuthorized",
  "occurredAt": "2026-07-04T12:00:00+04:00",
  "trainerId": "trn_01J8B0L3N5R7T9V1X2Z4C6D8F0H2",
  "personId": "per_01J9C1M4P6S8U0W2Y3A5E7G9J1K3",
  "branchId": "br_mct",
  "authorizationId": "authz_01J5G7R9T1W3Z5C7E9H1L3N5Q7S9",
  "courseId": "crs_01J6H8S0U2X4A6D8F0J2M4P6R8T0",
  "effectiveStartDate": "2026-08-01",
  "effectiveEndDate": "2027-07-31"
}
```

### `TrainerAvailabilityUpdated`

```json
{
  "eventId": "evt_01J2P4Y6A8D0G2K4M6Q8T0V2X4Z6",
  "eventType": "TrainerAvailabilityUpdated",
  "occurredAt": "2026-07-04T12:00:00+04:00",
  "trainerId": "trn_01J8B0L3N5R7T9V1X2Z4C6D8F0H2",
  "personId": "per_01J9C1M4P6S8U0W2Y3A5E7G9J1K3",
  "availabilityId": "avl_01J4F6Q8S0V2Y4B6D8G0K2M4P6R8",
  "branchId": "br_mct",
  "dayOfWeek": "Monday",
  "startTime": "09:00",
  "endTime": "13:00",
  "effectiveStartDate": "2026-08-01",
  "effectiveEndDate": null,
  "status": "Active"
}
```

## 14. Notification Audit Requirements

For every NotificationRequest derived from Module 09 event, Communication context must preserve:

- source event ID;
- source event type;
- template code;
- template version;
- channel;
- recipient Person/User reference;
- resolved recipient contact destination in protected form;
- preferred/resolved language;
- request timestamp;
- delivery status;
- provider message ID when available;
- sent timestamp;
- failure code/message when applicable.

Module 09 audit logs must preserve the business action that originated the event, but must not duplicate provider delivery history.
