# Part 5 – API Contracts

## Module 10 – Exam, Result & Completion Management

## 1. Purpose

This document defines the REST API and optional Next.js Server Action contracts for Module 10 – Exam, Result & Completion Management.

The API contracts are derived from:

```text
UC-EXC-001 Create Exam
UC-EXC-002 Manage Exam Lifecycle
UC-EXC-003 Record Results
UC-EXC-004 Finalize Result Set
UC-EXC-005 Correct Finalized Result
UC-EXC-006 Evaluate Completion
UC-EXC-007 Execute Manual Completion Approval
UC-EXC-008 Re-evaluate Completion After Evidence Change
UC-EXC-009 View Pending Work Queue
UC-EXC-010 Export Exam, Result, or Completion Data
```

The API design preserves the bounded-context rules that:

- Module 10 owns `Exam`, `Result`, `CourseCompletion`, and `CompletionApproval`.
- Course Catalog owns `CourseCompletionRule`.
- Admission & Enrollment owns `Enrollment`.
- Training Delivery owns `Batch` and `BatchTrainer`.
- Attendance owns attendance evidence.
- Finance & Receivables owns payment validation truth.
- Certificate Management owns certificate creation, issue, revocation, and verification.
- IAM owns authentication, permissions, and branch access.
- Audit & Compliance owns shared audit conventions.

---

# 2. API Design Principles

## 2.1 Base Route

Recommended REST route prefix:

```text
/api/v1/exams-completion
```

Suggested route groups:

```text
/api/v1/exams-completion/exams
/api/v1/exams-completion/results
/api/v1/exams-completion/completions
/api/v1/exams-completion/approvals
/api/v1/exams-completion/queues
/api/v1/exams-completion/exports
```

## 2.2 Authentication

All endpoints require authenticated application session except where a future public result/certificate feature is explicitly designed in another bounded context.

Authentication result must resolve:

```text
userId
personId where applicable
defaultBranchId
assigned branches
consolidated-read capability
child-branch capability
permissions
session state
```

## 2.3 Authorization

Every mutation requires:

```text
authenticated user
AND required permission
AND entity-derived branch mutation scope
AND valid entity state
AND domain eligibility
AND optimistic version match
```

Every query requires:

```text
authenticated user
AND required read permission
AND requested filters intersected with effective read branches
```

## 2.4 Branch Scoping

The API must derive branch scope from authoritative relationships:

```text
Exam
→ Batch
→ branchId

Result
→ Exam
→ Batch
→ branchId

CourseCompletion
→ Enrollment
→ branchId

CompletionApproval
→ CourseCompletion
→ Enrollment
→ branchId
```

The API must never authorize mutation based only on client-submitted:

```text
branchId
batchId
courseId
enrollmentId
```

All identifiers must be resolved server-side.

## 2.5 Idempotency

Recommended for high-impact POST operations:

```text
Idempotency-Key: <opaque client-generated key>
```

Apply to:

- bulk result submission;
- completion evaluation;
- completion reevaluation;
- approval decisions;
- export generation when persisted jobs are supported.

## 2.6 Optimistic Concurrency

All mutation requests for existing records must include:

```json
{
  "expectedVersion": 4
}
```

or HTTP equivalent:

```text
If-Match: "4"
```

Recommended error:

```text
409 CONCURRENCY_CONFLICT
```

## 2.7 Date and Time

- Date-only fields use ISO date format: `YYYY-MM-DD`.
- Timestamps use ISO-8601 UTC or canonical application format.
- UI localizes to configured Oman timezone.
- API must not shift date-only values because of timezone conversion.

---

# 3. Common Error Contract

## 3.1 Standard Error DTO

```json
{
  "error": {
    "code": "EXAM_INVALID_STATE_TRANSITION",
    "message": "The exam cannot be closed from its current state.",
    "fieldErrors": [],
    "traceId": "01JXYZ...",
    "details": {
      "currentState": "SCHEDULED",
      "requestedState": "CLOSED"
    }
  }
}
```

## 3.2 Validation Error DTO

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "fieldErrors": [
      {
        "field": "passMarks",
        "code": "PASS_MARKS_EXCEED_MAX",
        "message": "Pass marks cannot exceed maximum marks."
      }
    ],
    "traceId": "01JXYZ..."
  }
}
```

## 3.3 Common HTTP Status Mapping

| HTTP | Error Code Category | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request validation failed |
| 401 | `UNAUTHENTICATED` | No valid session |
| 403 | `FORBIDDEN` | Permission or branch scope denied |
| 404 | `NOT_FOUND` | Entity not found within authorized scope |
| 409 | `CONCURRENCY_CONFLICT` | Version mismatch |
| 409 | `DUPLICATE_RESOURCE` | Unique/business duplicate |
| 409 | `INVALID_STATE_TRANSITION` | Entity state does not allow action |
| 422 | `BUSINESS_RULE_VIOLATION` | Domain invariant failed |
| 424 | `DEPENDENCY_VALIDATION_FAILED` | Required cross-context validation unavailable or failed |
| 429 | `RATE_LIMITED` | Platform rate limit |
| 500 | `INTERNAL_ERROR` | Unexpected error without data leakage |
| 503 | `DEPENDENCY_UNAVAILABLE` | Required dependency temporarily unavailable |

---

# 4. Endpoint Inventory

## 4.1 Exam Endpoints

| ID | Method | Route | Purpose |
|---|---|---|---|
| API-EXC-001 | GET | `/api/v1/exams-completion/exams` | Search Exams |
| API-EXC-002 | POST | `/api/v1/exams-completion/exams` | Create Exam |
| API-EXC-003 | GET | `/api/v1/exams-completion/exams/{examId}` | Get Exam detail |
| API-EXC-004 | PATCH | `/api/v1/exams-completion/exams/{examId}` | Update editable Exam fields |
| API-EXC-005 | POST | `/api/v1/exams-completion/exams/{examId}/schedule` | Schedule/reschedule Exam |
| API-EXC-006 | POST | `/api/v1/exams-completion/exams/{examId}/activate` | Open Exam for result entry |
| API-EXC-007 | POST | `/api/v1/exams-completion/exams/{examId}/close` | Close Exam |
| API-EXC-008 | POST | `/api/v1/exams-completion/exams/{examId}/cancel` | Cancel Exam |
| API-EXC-009 | POST | `/api/v1/exams-completion/exams/{examId}/archive` | Soft archive/deactivate Exam |

## 4.2 Result Endpoints

| ID | Method | Route | Purpose |
|---|---|---|---|
| API-EXC-010 | GET | `/api/v1/exams-completion/exams/{examId}/result-roster` | Get eligible result-entry roster |
| API-EXC-011 | PUT | `/api/v1/exams-completion/exams/{examId}/results/{enrollmentId}` | Record/update one Result |
| API-EXC-012 | POST | `/api/v1/exams-completion/exams/{examId}/results/bulk/validate` | Validate bulk result payload |
| API-EXC-013 | POST | `/api/v1/exams-completion/exams/{examId}/results/bulk` | Submit bulk Results |
| API-EXC-014 | GET | `/api/v1/exams-completion/results/{resultId}` | Get Result detail |
| API-EXC-015 | POST | `/api/v1/exams-completion/results/{resultId}/finalize` | Finalize one Result |
| API-EXC-016 | POST | `/api/v1/exams-completion/exams/{examId}/results/finalize` | Finalize selected Result set |
| API-EXC-017 | POST | `/api/v1/exams-completion/results/{resultId}/correct` | Correct finalized Result |

## 4.3 Completion Endpoints

| ID | Method | Route | Purpose |
|---|---|---|---|
| API-EXC-018 | GET | `/api/v1/exams-completion/completions` | Search completion records |
| API-EXC-019 | GET | `/api/v1/exams-completion/completions/{courseCompletionId}` | Get completion detail |
| API-EXC-020 | GET | `/api/v1/exams-completion/enrollments/{enrollmentId}/completion-evaluation` | Get evaluation evidence |
| API-EXC-021 | POST | `/api/v1/exams-completion/enrollments/{enrollmentId}/completion-evaluate` | Evaluate completion |
| API-EXC-022 | POST | `/api/v1/exams-completion/completions/{courseCompletionId}/reevaluate` | Reevaluate completion |
| API-EXC-023 | GET | `/api/v1/exams-completion/completions/{courseCompletionId}/approval-timeline` | Get completion approval timeline |

## 4.4 Approval Endpoints

| ID | Method | Route | Purpose |
|---|---|---|---|
| API-EXC-024 | POST | `/api/v1/exams-completion/completions/{id}/trainer-recommendation/approve` | Trainer recommends completion |
| API-EXC-025 | POST | `/api/v1/exams-completion/completions/{id}/trainer-recommendation/reject` | Trainer does not recommend |
| API-EXC-026 | POST | `/api/v1/exams-completion/completions/{id}/coordinator-review/approve` | Coordinator approves review |
| API-EXC-027 | POST | `/api/v1/exams-completion/completions/{id}/coordinator-review/reject` | Coordinator rejects |
| API-EXC-028 | POST | `/api/v1/exams-completion/completions/{id}/final-approval/approve` | Final completion approval |
| API-EXC-029 | POST | `/api/v1/exams-completion/completions/{id}/final-approval/reject` | Final completion rejection |

## 4.5 Queue, Search, Audit, and Export Endpoints

| ID | Method | Route | Purpose |
|---|---|---|---|
| API-EXC-030 | GET | `/api/v1/exams-completion/queues/work` | Unified pending work queue |
| API-EXC-031 | GET | `/api/v1/exams-completion/queues/missing-results` | Missing Results queue |
| API-EXC-032 | GET | `/api/v1/exams-completion/queues/completion-evaluation` | Pending completion evaluation queue |
| API-EXC-033 | GET | `/api/v1/exams-completion/queues/trainer-recommendation` | Pending trainer recommendation queue |
| API-EXC-034 | GET | `/api/v1/exams-completion/queues/coordinator-review` | Pending coordinator review queue |
| API-EXC-035 | GET | `/api/v1/exams-completion/queues/final-approval` | Pending final approval queue |
| API-EXC-036 | GET | `/api/v1/exams-completion/queues/reevaluation` | Reevaluation/exception queue |
| API-EXC-037 | GET | `/api/v1/exams-completion/search` | Cross-entity academic outcome search |
| API-EXC-038 | GET | `/api/v1/exams-completion/entities/{entityType}/{entityId}/audit` | Read audit timeline |
| API-EXC-039 | POST | `/api/v1/exams-completion/exports` | Generate authorized export |
| API-EXC-040 | GET | `/api/v1/exams-completion/exports/options` | Get allowed export filters/formats/columns |

---

# 5. Common DTOs

## 5.1 Page DTO

```json
{
  "items": [],
  "page": {
    "number": 1,
    "size": 25,
    "totalElements": 125,
    "totalPages": 5
  }
}
```

## 5.2 Branch Scope DTO

```json
{
  "scope": {
    "mode": "SINGLE_BRANCH",
    "branchIds": ["BR-001"],
    "readOnly": false
  }
}
```

Possible modes:

```text
SINGLE_BRANCH
MULTI_BRANCH
CONSOLIDATED
```

## 5.3 Actor Summary DTO

```json
{
  "userId": "USR-001",
  "displayName": "Academic Coordinator"
}
```

## 5.4 Localized Label DTO

```json
{
  "code": "CRS-101",
  "label": {
    "en": "Health and Safety Training",
    "ar": "تدريب الصحة والسلامة"
  }
}
```

---

# 6. Detailed Exam API Contracts

# 6.1 API-EXC-001 — Search Exams

## Route

```http
GET /api/v1/exams-completion/exams
```

## Purpose

Search Exams within effective read branch scope.

## Authentication

Required.

## Permission

```text
exam.read
```

## Branch Scoping

1. Resolve user's effective read branches.
2. Apply requested `branchIds` only as a narrowing filter.
3. Join Exam to Batch and filter by `Batch.branchId`.
4. Never return Exams outside effective read scope.

## Query Parameters

```text
search?: string
courseId?: string
batchId?: string
branchIds?: string[]
status?: string[]
examDateFrom?: YYYY-MM-DD
examDateTo?: YYYY-MM-DD
page?: number default 1
size?: 25|50|100
sort?: examDate|examName|status|updatedAt
direction?: asc|desc
```

## Success DTO — 200

```json
{
  "items": [
    {
      "id": "EX-001",
      "examName": "Final Assessment",
      "course": {
        "id": "CRS-101",
        "code": "HSE-101",
        "name": {
          "en": "Health and Safety",
          "ar": "الصحة والسلامة"
        }
      },
      "batch": {
        "id": "BAT-001",
        "code": "HSE-JUL-26",
        "name": "July 2026 Batch"
      },
      "branch": {
        "id": "BR-001",
        "name": "Muscat"
      },
      "examDate": "2026-08-20",
      "maxMarks": "100.00",
      "passMarks": "50.00",
      "status": "SCHEDULED",
      "resultProgress": {
        "eligible": 40,
        "recorded": 34,
        "finalized": 30
      },
      "version": 4,
      "updatedAt": "2026-07-05T06:00:00Z"
    }
  ],
  "page": {
    "number": 1,
    "size": 25,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

## Errors

| HTTP | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid filter/date range |
| 401 | `UNAUTHENTICATED` | Session missing |
| 403 | `FORBIDDEN` | Missing `exam.read` |

---

# 6.2 API-EXC-002 — Create Exam

## Route

```http
POST /api/v1/exams-completion/exams
```

## Purpose

Create a new Exam.

## Authentication

Required.

## Permission

```text
exam.create
```

## Branch Scoping

- Server resolves Batch.
- Server derives `batch.branchId`.
- Mutation permitted only when user has mutation access to that branch.
- Client `branchId` is not trusted for authorization.

## Request Schema

```json
{
  "courseId": "CRS-101",
  "batchId": "BAT-001",
  "examName": "Final Assessment",
  "examDate": "2026-08-20",
  "maxMarks": "100.00",
  "passMarks": "50.00"
}
```

## Validation

```text
courseId required
batchId required
examName required and trimmed non-empty
examDate required
maxMarks > 0
passMarks >= 0
passMarks <= maxMarks
Batch.courseId == courseId
Batch.branchId inside mutation scope
semantic duplicate policy passes
```

## Success DTO — 201

```json
{
  "id": "EX-001",
  "courseId": "CRS-101",
  "batchId": "BAT-001",
  "examName": "Final Assessment",
  "examDate": "2026-08-20",
  "maxMarks": "100.00",
  "passMarks": "50.00",
  "status": "DRAFT",
  "version": 1,
  "createdAt": "2026-07-05T06:00:00Z"
}
```

## Errors

| HTTP | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid input |
| 403 | `FORBIDDEN` | Missing permission or branch mutation access |
| 404 | `COURSE_NOT_FOUND` | Course not found/visible |
| 404 | `BATCH_NOT_FOUND` | Batch not found/visible |
| 422 | `COURSE_BATCH_MISMATCH` | Batch does not belong to Course |
| 409 | `DUPLICATE_EXAM` | Semantic duplicate active Exam |

---

# 6.3 API-EXC-003 — Get Exam Detail

## Route

```http
GET /api/v1/exams-completion/exams/{examId}
```

## Permission

```text
exam.read
```

## Branch Scoping

Derived from Exam → Batch → Branch.

## Success DTO — 200

```json
{
  "id": "EX-001",
  "examName": "Final Assessment",
  "examDate": "2026-08-20",
  "maxMarks": "100.00",
  "passMarks": "50.00",
  "status": "OPEN_FOR_RESULT_ENTRY",
  "course": {
    "id": "CRS-101",
    "code": "HSE-101",
    "name": {
      "en": "Health and Safety",
      "ar": "الصحة والسلامة"
    }
  },
  "batch": {
    "id": "BAT-001",
    "code": "HSE-JUL-26",
    "branchId": "BR-001"
  },
  "resultProgress": {
    "eligible": 40,
    "recorded": 34,
    "finalized": 30,
    "missing": 6
  },
  "allowedActions": [
    "EDIT",
    "CLOSE",
    "ENTER_RESULTS",
    "FINALIZE_RESULTS"
  ],
  "version": 4,
  "createdAt": "2026-07-01T07:00:00Z",
  "updatedAt": "2026-07-05T06:00:00Z"
}
```

## Errors

```text
401 UNAUTHENTICATED
403 FORBIDDEN
404 EXAM_NOT_FOUND
```

---

# 6.4 API-EXC-004 — Update Exam

## Route

```http
PATCH /api/v1/exams-completion/exams/{examId}
```

## Permission

```text
exam.update
```

## Request Schema

```json
{
  "examName": "Updated Final Assessment",
  "maxMarks": "100.00",
  "passMarks": "55.00",
  "expectedVersion": 4
}
```

All fields except `expectedVersion` are optional, but at least one mutable field must be supplied.

## Branch Scoping

Derived from existing Exam → Batch → Branch.

## Success DTO — 200

Returns updated Exam detail DTO.

## Errors

```text
400 VALIDATION_ERROR
403 FORBIDDEN
404 EXAM_NOT_FOUND
409 CONCURRENCY_CONFLICT
409 EXAM_FIELD_IMMUTABLE
422 RESULT_EVIDENCE_WOULD_BE_INVALIDATED
```

---

# 6.5 API-EXC-005 — Schedule or Reschedule Exam

## Route

```http
POST /api/v1/exams-completion/exams/{examId}/schedule
```

## Permission

```text
exam.schedule
```

## Request

```json
{
  "examDate": "2026-08-22",
  "reason": "Batch timetable updated",
  "expectedVersion": 4
}
```

## Success DTO — 200

```json
{
  "id": "EX-001",
  "status": "SCHEDULED",
  "examDate": "2026-08-22",
  "version": 5,
  "updatedAt": "2026-07-05T06:30:00Z"
}
```

## Errors

```text
403 FORBIDDEN
404 EXAM_NOT_FOUND
409 CONCURRENCY_CONFLICT
409 EXAM_INVALID_STATE_TRANSITION
422 FINALIZED_RESULTS_PREVENT_RESCHEDULE
422 EXAM_DATE_INVALID
```

---

# 6.6 API-EXC-006 — Activate Exam

## Route

```http
POST /api/v1/exams-completion/exams/{examId}/activate
```

## Permission

```text
exam.activate
```

## Request

```json
{
  "expectedVersion": 5
}
```

## Success DTO

```json
{
  "id": "EX-001",
  "status": "OPEN_FOR_RESULT_ENTRY",
  "version": 6
}
```

## Errors

```text
403 FORBIDDEN
404 EXAM_NOT_FOUND
409 CONCURRENCY_CONFLICT
409 EXAM_INVALID_STATE_TRANSITION
422 EXAM_NOT_READY_FOR_RESULT_ENTRY
```

---

# 6.7 API-EXC-007 — Close Exam

## Route

```http
POST /api/v1/exams-completion/exams/{examId}/close
```

## Permission

```text
exam.close
```

## Request

```json
{
  "expectedVersion": 6
}
```

## Success DTO

```json
{
  "id": "EX-001",
  "status": "CLOSED",
  "version": 7
}
```

## Errors

```text
403 FORBIDDEN
404 EXAM_NOT_FOUND
409 CONCURRENCY_CONFLICT
409 EXAM_INVALID_STATE_TRANSITION
422 RESULT_COMPLETENESS_POLICY_FAILED
```

---

# 6.8 API-EXC-008 — Cancel Exam

## Route

```http
POST /api/v1/exams-completion/exams/{examId}/cancel
```

## Permission

```text
exam.cancel
```

## Request

```json
{
  "reason": "Batch delivery rescheduled",
  "expectedVersion": 6
}
```

## Success DTO

```json
{
  "id": "EX-001",
  "status": "CANCELLED",
  "version": 7,
  "cancelledAt": "2026-07-05T06:30:00Z"
}
```

`cancelledAt` may be derived from audit history if not physically stored.

## Errors

```text
400 CANCELLATION_REASON_REQUIRED
403 FORBIDDEN
404 EXAM_NOT_FOUND
409 CONCURRENCY_CONFLICT
409 EXAM_INVALID_STATE_TRANSITION
422 FINALIZED_EVIDENCE_REQUIRES_EXCEPTION_PROCESS
```

---

# 6.9 API-EXC-009 — Archive Exam

## Route

```http
POST /api/v1/exams-completion/exams/{examId}/archive
```

## Permission

Use repository-approved archive/deactivate permission.

Do not invent role-name authorization.

## Request

```json
{
  "reason": "Administrative archival after lifecycle completion",
  "expectedVersion": 7
}
```

## Success DTO

```json
{
  "id": "EX-001",
  "archived": true,
  "isActive": false,
  "version": 8
}
```

## Errors

```text
403 FORBIDDEN
404 EXAM_NOT_FOUND
409 CONCURRENCY_CONFLICT
422 EXAM_ARCHIVE_NOT_ALLOWED
```

---

# 7. Detailed Result API Contracts

# 7.1 API-EXC-010 — Get Result Roster

## Route

```http
GET /api/v1/exams-completion/exams/{examId}/result-roster
```

## Permission

```text
result.read
```

For result-entry UI:

```text
result.record
```

may additionally be required to receive mutation-capability flags.

## Branch Scoping

Derived from Exam branch.

Roster returned only from authorized Enrollment scope.

## Query Parameters

```text
search?: string
state?: MISSING|RECORDED|FINALIZED|CORRECTED
resultOutcome?: PASSED|FAILED
page?: number
size?: number
```

## Success DTO

```json
{
  "exam": {
    "id": "EX-001",
    "examName": "Final Assessment",
    "maxMarks": "100.00",
    "passMarks": "50.00",
    "status": "OPEN_FOR_RESULT_ENTRY"
  },
  "summary": {
    "eligible": 40,
    "recorded": 34,
    "missing": 6,
    "finalized": 30
  },
  "items": [
    {
      "enrollmentId": "ENR-001",
      "enrollmentNumber": "ENR-2026-0001",
      "student": {
        "studentNumber": "STU-0001",
        "displayName": "Student Name"
      },
      "enrollmentStatus": "ACTIVE",
      "result": {
        "id": "RES-001",
        "marksObtained": "78.00",
        "grade": "B",
        "resultStatus": "PASSED",
        "lifecycleState": "RECORDED",
        "recordedBy": {
          "userId": "USR-010",
          "displayName": "Trainer Name"
        },
        "recordedAt": "2026-08-20T11:30:00Z",
        "version": 2
      },
      "allowedActions": [
        "EDIT",
        "FINALIZE"
      ]
    }
  ],
  "page": {
    "number": 1,
    "size": 25,
    "totalElements": 40,
    "totalPages": 2
  }
}
```

## Errors

```text
401 UNAUTHENTICATED
403 FORBIDDEN
404 EXAM_NOT_FOUND
```

---

# 7.2 API-EXC-011 — Record or Update One Result

## Route

```http
PUT /api/v1/exams-completion/exams/{examId}/results/{enrollmentId}
```

## Permission

```text
result.record
```

## Branch Scoping

Server validates:

```text
Exam.Batch.branchId in mutation scope
Enrollment.branchId == Exam.Batch.branchId
Enrollment.courseId == Exam.courseId
Enrollment.batchId == Exam.batchId
```

## Request Schema

For create:

```json
{
  "marksObtained": "78.00"
}
```

For update:

```json
{
  "marksObtained": "82.00",
  "expectedVersion": 2
}
```

`resultStatus` must not be accepted as trusted input.

## Success DTO — 200/201

```json
{
  "id": "RES-001",
  "examId": "EX-001",
  "enrollmentId": "ENR-001",
  "marksObtained": "82.00",
  "grade": "B",
  "resultStatus": "PASSED",
  "lifecycleState": "RECORDED",
  "recordedBy": {
    "userId": "USR-010",
    "displayName": "Trainer Name"
  },
  "recordedAt": "2026-08-20T11:30:00Z",
  "version": 3
}
```

## Errors

```text
400 VALIDATION_ERROR
403 FORBIDDEN
404 EXAM_NOT_FOUND
404 ENROLLMENT_NOT_FOUND
409 CONCURRENCY_CONFLICT
409 RESULT_ALREADY_FINALIZED
422 ENROLLMENT_NOT_ELIGIBLE_FOR_EXAM
422 MARKS_EXCEED_MAXIMUM
422 EXAM_NOT_OPEN_FOR_RESULT_ENTRY
```

---

# 7.3 API-EXC-012 — Validate Bulk Results

## Route

```http
POST /api/v1/exams-completion/exams/{examId}/results/bulk/validate
```

## Permission

```text
result.bulk-record
```

## Request

```json
{
  "rows": [
    {
      "rowNumber": 1,
      "enrollmentId": "ENR-001",
      "marksObtained": "80.00",
      "expectedVersion": 2
    },
    {
      "rowNumber": 2,
      "enrollmentId": "ENR-002",
      "marksObtained": "110.00"
    }
  ]
}
```

## Success DTO — 200

```json
{
  "examId": "EX-001",
  "valid": false,
  "summary": {
    "totalRows": 2,
    "validRows": 1,
    "invalidRows": 1,
    "duplicateRows": 0
  },
  "rows": [
    {
      "rowNumber": 1,
      "enrollmentId": "ENR-001",
      "status": "VALID",
      "derivedResultStatus": "PASSED",
      "errors": []
    },
    {
      "rowNumber": 2,
      "enrollmentId": "ENR-002",
      "status": "INVALID",
      "derivedResultStatus": null,
      "errors": [
        {
          "code": "MARKS_EXCEED_MAXIMUM",
          "message": "Marks exceed maximum marks of 100."
        }
      ]
    }
  ],
  "validationToken": "opaque-validation-token"
}
```

The validation token is optional but recommended to bind validated payload to subsequent submission.

## Errors

```text
400 VALIDATION_ERROR
403 FORBIDDEN
404 EXAM_NOT_FOUND
422 EXAM_NOT_OPEN_FOR_RESULT_ENTRY
```

---

# 7.4 API-EXC-013 — Submit Bulk Results

## Route

```http
POST /api/v1/exams-completion/exams/{examId}/results/bulk
```

## Permission

```text
result.bulk-record
```

## Request

```json
{
  "validationToken": "opaque-validation-token",
  "rows": [
    {
      "enrollmentId": "ENR-001",
      "marksObtained": "80.00",
      "expectedVersion": 2
    },
    {
      "enrollmentId": "ENR-002",
      "marksObtained": "65.00"
    }
  ]
}
```

## Transaction Rule

Recommended:

```text
Validate all confirmed rows
Then write atomically for the bounded submission
```

No silent partial success.

## Success DTO — 200

```json
{
  "examId": "EX-001",
  "savedCount": 2,
  "createdCount": 1,
  "updatedCount": 1,
  "results": [
    {
      "enrollmentId": "ENR-001",
      "resultId": "RES-001",
      "resultStatus": "PASSED",
      "version": 3
    },
    {
      "enrollmentId": "ENR-002",
      "resultId": "RES-002",
      "resultStatus": "PASSED",
      "version": 1
    }
  ]
}
```

## Errors

```text
400 VALIDATION_ERROR
403 FORBIDDEN
409 BULK_RESULT_PAYLOAD_CHANGED_AFTER_VALIDATION
409 CONCURRENCY_CONFLICT
422 BULK_RESULT_VALIDATION_FAILED
```

---

# 7.5 API-EXC-014 — Get Result Detail

## Route

```http
GET /api/v1/exams-completion/results/{resultId}
```

## Permission

```text
result.read
```

## Branch Scoping

Derived through Result → Exam → Batch → Branch.

## Success DTO

```json
{
  "id": "RES-001",
  "exam": {
    "id": "EX-001",
    "examName": "Final Assessment",
    "maxMarks": "100.00",
    "passMarks": "50.00"
  },
  "enrollment": {
    "id": "ENR-001",
    "enrollmentNumber": "ENR-2026-0001"
  },
  "student": {
    "studentNumber": "STU-0001",
    "displayName": "Student Name"
  },
  "marksObtained": "78.00",
  "grade": "B",
  "resultStatus": "PASSED",
  "lifecycleState": "FINALIZED",
  "recordedBy": {
    "userId": "USR-010",
    "displayName": "Trainer Name"
  },
  "recordedAt": "2026-08-20T11:30:00Z",
  "allowedActions": [
    "CORRECT"
  ],
  "version": 3
}
```

---

# 7.6 API-EXC-015 — Finalize One Result

## Route

```http
POST /api/v1/exams-completion/results/{resultId}/finalize
```

## Permission

```text
result.finalize
```

## Request

```json
{
  "expectedVersion": 3
}
```

## Success DTO

```json
{
  "id": "RES-001",
  "lifecycleState": "FINALIZED",
  "version": 4,
  "finalizedAt": "2026-08-20T13:00:00Z"
}
```

If finalization timestamp is not a physical field, DTO may be populated from lifecycle/audit projection.

## Errors

```text
403 FORBIDDEN
404 RESULT_NOT_FOUND
409 CONCURRENCY_CONFLICT
409 RESULT_INVALID_STATE_TRANSITION
422 RESULT_NOT_FINALIZABLE
```

---

# 7.7 API-EXC-016 — Finalize Selected Result Set

## Route

```http
POST /api/v1/exams-completion/exams/{examId}/results/finalize
```

## Permission

```text
result.finalize
```

## Request

```json
{
  "results": [
    {
      "resultId": "RES-001",
      "expectedVersion": 3
    },
    {
      "resultId": "RES-002",
      "expectedVersion": 1
    }
  ]
}
```

## Success DTO

```json
{
  "examId": "EX-001",
  "finalizedCount": 2,
  "results": [
    {
      "resultId": "RES-001",
      "lifecycleState": "FINALIZED",
      "version": 4
    },
    {
      "resultId": "RES-002",
      "lifecycleState": "FINALIZED",
      "version": 2
    }
  ]
}
```

## Errors

```text
400 VALIDATION_ERROR
403 FORBIDDEN
409 CONCURRENCY_CONFLICT
422 RESULT_SET_FINALIZATION_FAILED
```

---

# 7.8 API-EXC-017 — Correct Finalized Result

## Route

```http
POST /api/v1/exams-completion/results/{resultId}/correct
```

## Permission

```text
result.correct
```

## Request

```json
{
  "correctedMarks": "65.00",
  "reason": "Verified transcription error",
  "expectedVersion": 4
}
```

## Branch Scoping

Derived from Result branch.

## Success DTO

```json
{
  "result": {
    "id": "RES-001",
    "marksObtained": "65.00",
    "resultStatus": "PASSED",
    "lifecycleState": "CORRECTED_FINAL",
    "version": 5
  },
  "completionImpact": {
    "courseCompletionId": "CC-001",
    "reevaluationRequired": true,
    "state": "REEVALUATION_REQUIRED"
  },
  "auditReference": "AUD-REF-001"
}
```

## Errors

```text
400 CORRECTION_REASON_REQUIRED
400 VALIDATION_ERROR
403 FORBIDDEN
404 RESULT_NOT_FOUND
409 CONCURRENCY_CONFLICT
409 RESULT_NOT_CORRECTABLE
422 CORRECTED_MARKS_UNCHANGED
422 MARKS_EXCEED_MAXIMUM
```

---

# 8. Detailed Completion API Contracts

# 8.1 API-EXC-018 — Search Completion Records

## Route

```http
GET /api/v1/exams-completion/completions
```

## Permission

```text
completion.read
```

## Query Parameters

```text
search?: string
courseId?: string
batchId?: string
branchIds?: string[]
completionStatus?: string[]
evaluatedFrom?: timestamp/date
evaluatedTo?: timestamp/date
page?: number
size?: number
sort?: updatedAt|approvedAt|completionStatus
direction?: asc|desc
```

## Branch Scoping

Derived from CourseCompletion → Enrollment → branchId.

## Success DTO

```json
{
  "items": [
    {
      "id": "CC-001",
      "enrollment": {
        "id": "ENR-001",
        "enrollmentNumber": "ENR-2026-0001"
      },
      "student": {
        "studentNumber": "STU-0001",
        "displayName": "Student Name"
      },
      "course": {
        "id": "CRS-101",
        "name": {
          "en": "Health and Safety",
          "ar": "الصحة والسلامة"
        }
      },
      "batch": {
        "id": "BAT-001",
        "code": "HSE-JUL-26"
      },
      "completionStatus": "AWAITING_COORDINATOR_REVIEW",
      "attendancePercentage": "90.00",
      "examPassed": true,
      "paymentCompleted": true,
      "version": 4,
      "updatedAt": "2026-08-21T10:00:00Z"
    }
  ],
  "page": {
    "number": 1,
    "size": 25,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

---

# 8.2 API-EXC-019 — Get Completion Detail

## Route

```http
GET /api/v1/exams-completion/completions/{courseCompletionId}
```

## Permission

```text
completion.read
```

## Success DTO

```json
{
  "id": "CC-001",
  "enrollment": {
    "id": "ENR-001",
    "enrollmentNumber": "ENR-2026-0001",
    "status": "ACTIVE"
  },
  "student": {
    "studentNumber": "STU-0001",
    "displayName": "Student Name"
  },
  "course": {
    "id": "CRS-101",
    "code": "HSE-101",
    "name": {
      "en": "Health and Safety",
      "ar": "الصحة والسلامة"
    }
  },
  "batch": {
    "id": "BAT-001",
    "code": "HSE-JUL-26"
  },
  "completionStatus": "AWAITING_COORDINATOR_REVIEW",
  "evidence": {
    "attendance": {
      "required": true,
      "percentage": "90.00",
      "minimumRequired": "75.00",
      "outcome": "PASSED",
      "sourceUpdatedAt": "2026-08-20T10:00:00Z"
    },
    "exam": {
      "required": true,
      "outcome": "PASSED",
      "resultId": "RES-001"
    },
    "payment": {
      "required": true,
      "outcome": "PASSED",
      "validatedAt": "2026-08-20T10:30:00Z"
    }
  },
  "rule": {
    "manualApprovalRequired": true,
    "certificateAllowed": true
  },
  "recommendedByTrainer": {
    "trainerId": "TR-001",
    "displayName": "Trainer Name"
  },
  "approvedBy": null,
  "approvedAt": null,
  "allowedActions": [
    "COORDINATOR_APPROVE",
    "COORDINATOR_REJECT"
  ],
  "version": 4
}
```

---

# 8.3 API-EXC-020 — Get Completion Evaluation Evidence

## Route

```http
GET /api/v1/exams-completion/enrollments/{enrollmentId}/completion-evaluation
```

## Permission

```text
completion.read
```

or:

```text
completion.evaluate
```

for action-capable users.

## Branch Scoping

Derived from Enrollment branch.

## Success DTO

```json
{
  "enrollmentId": "ENR-001",
  "courseCompletionId": "CC-001",
  "rule": {
    "minAttendancePercentage": "75.00",
    "examRequired": true,
    "paymentRequired": true,
    "manualApprovalRequired": true,
    "certificateAllowed": true
  },
  "evidence": {
    "attendance": {
      "status": "AVAILABLE",
      "percentage": "90.00",
      "outcome": "PASSED"
    },
    "exam": {
      "status": "AVAILABLE",
      "resultId": "RES-001",
      "outcome": "PASSED"
    },
    "payment": {
      "status": "AVAILABLE",
      "outcome": "PASSED"
    }
  },
  "currentEvaluation": {
    "status": "AWAITING_TRAINER_RECOMMENDATION",
    "evaluatedAt": "2026-08-21T09:00:00Z",
    "stale": false,
    "version": 2
  }
}
```

## Errors

```text
403 FORBIDDEN
404 ENROLLMENT_NOT_FOUND
424 COURSE_COMPLETION_RULE_UNAVAILABLE
503 ATTENDANCE_DEPENDENCY_UNAVAILABLE
503 FINANCE_DEPENDENCY_UNAVAILABLE
```

---

# 8.4 API-EXC-021 — Evaluate Completion

## Route

```http
POST /api/v1/exams-completion/enrollments/{enrollmentId}/completion-evaluate
```

## Permission

```text
completion.evaluate
```

Authorized system workflow may call internal application service without impersonating a human permission.

## Request

For first evaluation:

```json
{
  "reason": "End-of-course completion evaluation"
}
```

For update of existing completion:

```json
{
  "reason": "End-of-course completion evaluation",
  "expectedVersion": 2
}
```

Important:

The request must not contain trusted booleans such as:

```text
attendancePassed
examPassed
paymentCompleted
```

The server loads authoritative evidence.

## Success DTO — 200/201

```json
{
  "courseCompletionId": "CC-001",
  "enrollmentId": "ENR-001",
  "completionStatus": "AWAITING_TRAINER_RECOMMENDATION",
  "evaluation": {
    "attendancePercentage": "90.00",
    "examPassed": true,
    "paymentCompleted": true,
    "allMandatoryCriteriaPassed": true
  },
  "nextAction": "TRAINER_RECOMMENDATION",
  "version": 3
}
```

## Errors

```text
403 FORBIDDEN
404 ENROLLMENT_NOT_FOUND
409 CONCURRENCY_CONFLICT
422 ENROLLMENT_NOT_ELIGIBLE_FOR_COMPLETION_EVALUATION
424 COURSE_COMPLETION_RULE_NOT_CONFIGURED
503 ATTENDANCE_DEPENDENCY_UNAVAILABLE
503 FINANCE_DEPENDENCY_UNAVAILABLE
```

---

# 8.5 API-EXC-022 — Reevaluate Completion

## Route

```http
POST /api/v1/exams-completion/completions/{courseCompletionId}/reevaluate
```

## Permission

```text
completion.reevaluate
```

Authorized system trigger may use internal application service authority.

## Request

```json
{
  "triggerType": "RESULT_CORRECTED",
  "triggerReference": "RES-001",
  "reason": "Reevaluate after authorized result correction",
  "expectedVersion": 4
}
```

Allowed trigger types must be server-enumerated.

Examples:

```text
RESULT_CORRECTED
ATTENDANCE_CORRECTED
PAYMENT_VALIDATION_CHANGED
MANUAL_REEVALUATION
```

## Success DTO

```json
{
  "courseCompletionId": "CC-001",
  "previousStatus": "NOT_ELIGIBLE",
  "currentStatus": "AWAITING_TRAINER_RECOMMENDATION",
  "outcomeChanged": true,
  "approvalHistoryPreserved": true,
  "certificateEligibilityChanged": false,
  "version": 5
}
```

## Errors

```text
403 FORBIDDEN
404 COURSE_COMPLETION_NOT_FOUND
409 CONCURRENCY_CONFLICT
409 REEVALUATION_NOT_ALLOWED
422 INVALID_REEVALUATION_TRIGGER
503 DEPENDENCY_UNAVAILABLE
```

---

# 8.6 API-EXC-023 — Get Approval Timeline

## Route

```http
GET /api/v1/exams-completion/completions/{courseCompletionId}/approval-timeline
```

## Permission

```text
completion.read
```

Detailed audit remarks may additionally require:

```text
completion.audit.read
```

## Success DTO

```json
{
  "courseCompletionId": "CC-001",
  "stages": [
    {
      "approvalLevel": "TRAINER_RECOMMENDATION",
      "status": "APPROVED",
      "actor": {
        "userId": "USR-010",
        "displayName": "Trainer Name"
      },
      "remarks": "Learner completed practical requirements.",
      "actedAt": "2026-08-21T09:30:00Z"
    },
    {
      "approvalLevel": "ACADEMIC_COORDINATOR_REVIEW",
      "status": "PENDING",
      "actor": null,
      "remarks": null,
      "actedAt": null
    },
    {
      "approvalLevel": "BRANCH_MANAGER_APPROVAL",
      "status": "NOT_STARTED",
      "actor": null,
      "remarks": null,
      "actedAt": null
    }
  ]
}
```

---

# 9. Detailed Approval API Contracts

# 9.1 API-EXC-024 — Trainer Recommend Completion

## Route

```http
POST /api/v1/exams-completion/completions/{id}/trainer-recommendation/approve
```

## Permission

```text
completion.recommend
```

## Branch Scoping

Server validates:

```text
CourseCompletion → Enrollment → branch
AND authenticated person maps to TrainerProfile
AND Trainer assigned/authorized for relevant Batch
```

## Request

```json
{
  "remarks": "Learner completed practical training satisfactorily.",
  "expectedVersion": 3
}
```

## Success DTO

```json
{
  "courseCompletionId": "CC-001",
  "previousStatus": "AWAITING_TRAINER_RECOMMENDATION",
  "currentStatus": "AWAITING_COORDINATOR_REVIEW",
  "approval": {
    "approvalLevel": "TRAINER_RECOMMENDATION",
    "status": "APPROVED",
    "actedAt": "2026-08-21T09:30:00Z"
  },
  "version": 4
}
```

## Errors

```text
403 FORBIDDEN
403 TRAINER_NOT_AUTHORIZED_FOR_BATCH
404 COURSE_COMPLETION_NOT_FOUND
409 CONCURRENCY_CONFLICT
409 INVALID_APPROVAL_STAGE
422 COMPLETION_EVIDENCE_STALE
```

---

# 9.2 API-EXC-025 — Trainer Does Not Recommend

## Route

```http
POST /api/v1/exams-completion/completions/{id}/trainer-recommendation/reject
```

## Permission

```text
completion.recommend
```

## Request

```json
{
  "remarks": "Required practical competency evidence is incomplete.",
  "expectedVersion": 3
}
```

## Success DTO

```json
{
  "courseCompletionId": "CC-001",
  "currentStatus": "REJECTED",
  "approval": {
    "approvalLevel": "TRAINER_RECOMMENDATION",
    "status": "REJECTED",
    "actedAt": "2026-08-21T09:30:00Z"
  },
  "version": 4
}
```

## Errors

```text
400 REJECTION_REASON_REQUIRED
403 FORBIDDEN
403 TRAINER_NOT_AUTHORIZED_FOR_BATCH
409 CONCURRENCY_CONFLICT
409 INVALID_APPROVAL_STAGE
```

---

# 9.3 API-EXC-026 — Coordinator Approve Review

## Route

```http
POST /api/v1/exams-completion/completions/{id}/coordinator-review/approve
```

## Permission

```text
completion.coordinator-review
```

## Request

```json
{
  "remarks": "Evidence reviewed and accepted.",
  "expectedVersion": 4
}
```

## Success DTO

```json
{
  "courseCompletionId": "CC-001",
  "previousStatus": "AWAITING_COORDINATOR_REVIEW",
  "currentStatus": "AWAITING_FINAL_APPROVAL",
  "approval": {
    "approvalLevel": "ACADEMIC_COORDINATOR_REVIEW",
    "status": "APPROVED",
    "actedAt": "2026-08-21T10:00:00Z"
  },
  "version": 5
}
```

## Errors

```text
403 FORBIDDEN
404 COURSE_COMPLETION_NOT_FOUND
409 CONCURRENCY_CONFLICT
409 INVALID_APPROVAL_STAGE
422 TRAINER_RECOMMENDATION_REQUIRED
422 COMPLETION_EVIDENCE_STALE
```

---

# 9.4 API-EXC-027 — Coordinator Reject Review

## Route

```http
POST /api/v1/exams-completion/completions/{id}/coordinator-review/reject
```

## Permission

```text
completion.coordinator-review
```

or separately:

```text
completion.reject
```

depending on final IAM permission design.

## Request

```json
{
  "remarks": "Attendance correction requires verification.",
  "expectedVersion": 4
}
```

## Success DTO

```json
{
  "courseCompletionId": "CC-001",
  "currentStatus": "REJECTED",
  "approval": {
    "approvalLevel": "ACADEMIC_COORDINATOR_REVIEW",
    "status": "REJECTED"
  },
  "version": 5
}
```

## Errors

```text
400 REJECTION_REASON_REQUIRED
403 FORBIDDEN
409 CONCURRENCY_CONFLICT
409 INVALID_APPROVAL_STAGE
```

---

# 9.5 API-EXC-028 — Final Approve Completion

## Route

```http
POST /api/v1/exams-completion/completions/{id}/final-approval/approve
```

## Permission

```text
completion.final-approve
```

## Branch Scoping

Entity branch must be in effective mutation scope.

Consolidated read scope is insufficient.

## Request

```json
{
  "remarks": "Final completion approval granted.",
  "expectedVersion": 5
}
```

## Success DTO

```json
{
  "courseCompletionId": "CC-001",
  "completionStatus": "APPROVED",
  "approvedBy": {
    "userId": "USR-100",
    "displayName": "Branch Manager"
  },
  "approvedAt": "2026-08-21T11:00:00Z",
  "certificateEligibility": {
    "eligible": true,
    "handoffStatus": "READY_FOR_CERTIFICATE_CONTEXT"
  },
  "version": 6
}
```

Important:

This endpoint must not return a newly created Certificate because Module 10 does not own Certificate creation.

## Errors

```text
403 FORBIDDEN
404 COURSE_COMPLETION_NOT_FOUND
409 CONCURRENCY_CONFLICT
409 INVALID_APPROVAL_STAGE
422 COORDINATOR_APPROVAL_REQUIRED
422 COMPLETION_EVIDENCE_STALE
422 CERTIFICATE_NOT_ALLOWED_BY_COURSE_RULE
```

The last error applies only if the implementation couples final approval response with eligibility evaluation. Final completion approval itself may still succeed even when certificate issuance is not allowed; API behavior must keep those decisions distinct.

---

# 9.6 API-EXC-029 — Final Reject Completion

## Route

```http
POST /api/v1/exams-completion/completions/{id}/final-approval/reject
```

## Permission

```text
completion.reject
```

## Request

```json
{
  "remarks": "Required evidence remains incomplete.",
  "expectedVersion": 5
}
```

## Success DTO

```json
{
  "courseCompletionId": "CC-001",
  "completionStatus": "REJECTED",
  "approval": {
    "approvalLevel": "BRANCH_MANAGER_APPROVAL",
    "status": "REJECTED",
    "actedAt": "2026-08-21T11:00:00Z"
  },
  "version": 6
}
```

## Errors

```text
400 REJECTION_REASON_REQUIRED
403 FORBIDDEN
409 CONCURRENCY_CONFLICT
409 INVALID_APPROVAL_STAGE
```

---

# 10. Queue API Contracts

# 10.1 API-EXC-030 — Unified Work Queue

## Route

```http
GET /api/v1/exams-completion/queues/work
```

## Permission

At least one relevant permission:

```text
exam.read
result.record
result.finalize
completion.evaluate
completion.recommend
completion.coordinator-review
completion.final-approve
completion.reevaluate
```

## Query Parameters

```text
queueType?:
  EXAMS_TO_ACTIVATE
  MISSING_RESULTS
  RESULTS_TO_FINALIZE
  COMPLETION_EVALUATION
  TRAINER_RECOMMENDATION
  COORDINATOR_REVIEW
  FINAL_APPROVAL
  REEVALUATION

branchIds?: string[]
courseId?: string
batchId?: string
search?: string
page?: number
size?: number
sort?: pendingSince|updatedAt
direction?: asc|desc
```

## Success DTO

```json
{
  "summary": {
    "examsToActivate": 2,
    "missingResults": 14,
    "resultsToFinalize": 9,
    "completionEvaluation": 18,
    "trainerRecommendation": 6,
    "coordinatorReview": 4,
    "finalApproval": 3,
    "reevaluation": 1
  },
  "items": [
    {
      "workItemType": "FINAL_APPROVAL",
      "entityId": "CC-001",
      "reference": "ENR-2026-0001",
      "title": "Student Name",
      "course": "Health and Safety",
      "batch": "HSE-JUL-26",
      "branchId": "BR-001",
      "currentState": "AWAITING_FINAL_APPROVAL",
      "pendingSince": "2026-08-21T10:00:00Z",
      "allowedActions": [
        "VIEW",
        "FINAL_APPROVE",
        "REJECT"
      ]
    }
  ],
  "page": {
    "number": 1,
    "size": 25,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

---

# 10.2 API-EXC-031 — Missing Results Queue

## Route

```http
GET /api/v1/exams-completion/queues/missing-results
```

## Permission

```text
result.read
```

or action permission:

```text
result.record
```

## Success Item DTO

```json
{
  "examId": "EX-001",
  "enrollmentId": "ENR-001",
  "enrollmentNumber": "ENR-2026-0001",
  "student": {
    "studentNumber": "STU-0001",
    "displayName": "Student Name"
  },
  "course": {
    "id": "CRS-101",
    "name": "Health and Safety"
  },
  "batch": {
    "id": "BAT-001",
    "code": "HSE-JUL-26"
  },
  "examDate": "2026-08-20",
  "missingReason": "RESULT_NOT_RECORDED"
}
```

---

# 10.3 API-EXC-032 — Completion Evaluation Queue

## Route

```http
GET /api/v1/exams-completion/queues/completion-evaluation
```

## Permission

```text
completion.evaluate
```

## Success Item

```json
{
  "enrollmentId": "ENR-001",
  "courseCompletionId": null,
  "enrollmentNumber": "ENR-2026-0001",
  "studentName": "Student Name",
  "courseName": "Health and Safety",
  "batchCode": "HSE-JUL-26",
  "evidenceSummary": {
    "attendance": "AVAILABLE",
    "exam": "AVAILABLE",
    "payment": "AVAILABLE"
  },
  "pendingReason": "NOT_EVALUATED"
}
```

---

# 10.4 API-EXC-033 — Trainer Recommendation Queue

## Permission

```text
completion.recommend
```

## Branch and Domain Scope

Additionally scoped to:

```text
authenticated TrainerProfile
AND assigned/authorized Batch
```

## Route

```http
GET /api/v1/exams-completion/queues/trainer-recommendation
```

## Success Item

```json
{
  "courseCompletionId": "CC-001",
  "enrollmentNumber": "ENR-2026-0001",
  "studentName": "Student Name",
  "courseName": "Health and Safety",
  "batchCode": "HSE-JUL-26",
  "evidence": {
    "attendance": "PASSED",
    "exam": "PASSED",
    "payment": "PASSED"
  },
  "evaluatedAt": "2026-08-21T09:00:00Z",
  "pendingSince": "2026-08-21T09:00:00Z"
}
```

---

# 10.5 API-EXC-034 — Coordinator Review Queue

## Route

```http
GET /api/v1/exams-completion/queues/coordinator-review
```

## Permission

```text
completion.coordinator-review
```

## Branch Scope

Effective read branch scope.

Mutation action separately rechecks mutation scope.

---

# 10.6 API-EXC-035 — Final Approval Queue

## Route

```http
GET /api/v1/exams-completion/queues/final-approval
```

## Permission

```text
completion.final-approve
```

or read-only capability for authorized auditors/managers.

## Important Scope Rule

A user may see consolidated records where read permission allows but final approval action must be omitted when the entity branch is outside mutation scope.

---

# 10.7 API-EXC-036 — Reevaluation Queue

## Route

```http
GET /api/v1/exams-completion/queues/reevaluation
```

## Permission

```text
completion.reevaluate
```

## Success Item

```json
{
  "courseCompletionId": "CC-001",
  "enrollmentNumber": "ENR-2026-0001",
  "studentName": "Student Name",
  "previousStatus": "APPROVED",
  "triggerType": "RESULT_CORRECTED",
  "triggerReference": "RES-001",
  "triggeredAt": "2026-08-21T12:00:00Z",
  "currentExceptionState": "REEVALUATION_REQUIRED"
}
```

---

# 11. Search, Audit, and Export Contracts

# 11.1 API-EXC-037 — Academic Outcome Search

## Route

```http
GET /api/v1/exams-completion/search
```

## Permission

At least one:

```text
exam.read
result.read
completion.read
```

Results are filtered by entity-specific permissions.

## Query Parameters

```text
q?: string
entityTypes?: EXAM|RESULT|COMPLETION
branchIds?: string[]
courseId?: string
batchId?: string
dateFrom?: date
dateTo?: date
resultOutcome?: PASSED|FAILED
completionStatus?: string[]
page?: number
size?: number
```

## Success DTO

```json
{
  "items": [
    {
      "entityType": "RESULT",
      "entityId": "RES-001",
      "primaryReference": "ENR-2026-0001",
      "title": "Student Name",
      "subtitle": "Final Assessment",
      "course": "Health and Safety",
      "batch": "HSE-JUL-26",
      "branchId": "BR-001",
      "status": "PASSED",
      "updatedAt": "2026-08-20T13:00:00Z"
    }
  ],
  "page": {
    "number": 1,
    "size": 25,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

---

# 11.2 API-EXC-038 — Get Audit Timeline

## Route

```http
GET /api/v1/exams-completion/entities/{entityType}/{entityId}/audit
```

## Permission

```text
completion.audit.read
```

or equivalent audit permission catalog mapping.

## Supported Entity Types

```text
EXAM
RESULT
COURSE_COMPLETION
COMPLETION_APPROVAL
```

## Branch Scoping

Server resolves target entity branch before returning audit data.

## Success DTO

```json
{
  "entityType": "RESULT",
  "entityId": "RES-001",
  "events": [
    {
      "action": "RESULT_CORRECTED",
      "actor": {
        "userId": "USR-200",
        "displayName": "Academic Administrator"
      },
      "performedAt": "2026-08-21T12:00:00Z",
      "reason": "Verified transcription error",
      "changes": [
        {
          "field": "marksObtained",
          "oldValue": "45.00",
          "newValue": "65.00"
        },
        {
          "field": "resultStatus",
          "oldValue": "FAILED",
          "newValue": "PASSED"
        }
      ]
    }
  ]
}
```

## Errors

```text
400 UNSUPPORTED_ENTITY_TYPE
403 FORBIDDEN
404 ENTITY_NOT_FOUND
```

---

# 11.3 API-EXC-039 — Generate Export

## Route

```http
POST /api/v1/exams-completion/exports
```

## Permission

```text
completion.export
```

or entity-specific export permission if IAM catalog separates them.

## Request

```json
{
  "exportType": "COMPLETION_APPROVAL_REPORT",
  "filters": {
    "branchIds": ["BR-001"],
    "dateFrom": "2026-08-01",
    "dateTo": "2026-08-31",
    "courseId": "CRS-101"
  },
  "format": "XLSX",
  "language": "en",
  "columns": [
    "enrollmentNumber",
    "studentName",
    "courseName",
    "batchCode",
    "completionStatus",
    "approvedAt"
  ]
}
```

## Branch Scoping

Requested branches are intersected with effective export/read scope.

## Success DTO

For synchronous export:

```json
{
  "exportId": "EXP-001",
  "status": "COMPLETED",
  "fileName": "completion-approval-report-2026-08.xlsx",
  "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "downloadToken": "opaque-short-lived-token",
  "expiresAt": "2026-08-21T13:00:00Z"
}
```

For asynchronous export only when architecture explicitly supports it:

```json
{
  "exportId": "EXP-001",
  "status": "QUEUED"
}
```

Do not claim asynchronous behavior if the platform has no supported background job mechanism.

## Errors

```text
400 VALIDATION_ERROR
400 UNSUPPORTED_EXPORT_FORMAT
400 UNSUPPORTED_EXPORT_COLUMN
403 FORBIDDEN
422 NO_DATA_FOR_EXPORT
```

---

# 11.4 API-EXC-040 — Get Export Options

## Route

```http
GET /api/v1/exams-completion/exports/options
```

## Permission

```text
completion.export
```

## Success DTO

```json
{
  "exportTypes": [
    {
      "code": "EXAM_REGISTER",
      "label": {
        "en": "Exam Register",
        "ar": "سجل الاختبارات"
      },
      "formats": ["CSV", "XLSX", "PDF"],
      "allowedColumns": [
        "examName",
        "courseName",
        "batchCode",
        "examDate",
        "status"
      ]
    },
    {
      "code": "COMPLETION_APPROVAL_REPORT",
      "label": {
        "en": "Completion Approval Report",
        "ar": "تقرير اعتماد الإكمال"
      },
      "formats": ["CSV", "XLSX", "PDF"],
      "allowedColumns": [
        "enrollmentNumber",
        "studentName",
        "courseName",
        "batchCode",
        "completionStatus",
        "approvedAt"
      ]
    }
  ],
  "languages": ["en", "ar"]
}
```

---

# 12. Optional Next.js Server Action Mapping

The same application services may be invoked through Server Actions for internal form mutations.

REST routes remain the canonical integration contract.

Recommended Server Action mapping:

| Server Action | Underlying Application Service |
|---|---|
| `createExamAction` | `CreateExamCommand` |
| `updateExamAction` | `UpdateExamCommand` |
| `scheduleExamAction` | `ScheduleExamCommand` |
| `activateExamAction` | `ActivateExamCommand` |
| `closeExamAction` | `CloseExamCommand` |
| `cancelExamAction` | `CancelExamCommand` |
| `recordResultAction` | `RecordResultCommand` |
| `bulkRecordResultsAction` | `SubmitBulkResultsCommand` |
| `finalizeResultAction` | `FinalizeResultCommand` |
| `correctResultAction` | `CorrectFinalizedResultCommand` |
| `evaluateCompletionAction` | `EvaluateCompletionCommand` |
| `reevaluateCompletionAction` | `ReevaluateCompletionCommand` |
| `recommendCompletionAction` | `RecommendCompletionCommand` |
| `rejectTrainerRecommendationAction` | `DeclineCompletionRecommendationCommand` |
| `approveCoordinatorReviewAction` | `ApproveCoordinatorReviewCommand` |
| `rejectCoordinatorReviewAction` | `RejectCoordinatorReviewCommand` |
| `approveCompletionAction` | `ApproveCompletionCommand` |
| `rejectCompletionAction` | `RejectCompletionCommand` |

## 12.1 Server Action Security Rule

A Server Action must not be considered secure merely because it is called from a protected page.

Each action must repeat:

```text
session validation
permission check
entity branch derivation
branch mutation authorization
domain state validation
optimistic version validation
audit capture
```

---

# 13. Cross-Context Application Contracts

Module 10 may need internal application contracts that are not public REST endpoints.

## 13.1 Course Completion Rule Reader

Owner:

```text
Course Catalog
```

Contract:

```ts
type GetActiveCourseCompletionRule = {
  courseId: string;
  asOfDate: string;
};

type CourseCompletionRuleDTO = {
  courseId: string;
  minAttendancePercentage: string | null;
  examRequired: boolean;
  paymentRequired: boolean;
  manualApprovalRequired: boolean;
  certificateAllowed: boolean;
  ruleVersion?: string;
};
```

Module 10 must not update this DTO.

## 13.2 Enrollment Completion Context Reader

Owner:

```text
Admission & Enrollment
```

Contract:

```ts
type EnrollmentCompletionContextDTO = {
  enrollmentId: string;
  enrollmentNumber: string;
  studentProfileId: string;
  courseId: string;
  batchId: string;
  branchId: string;
  enrollmentStatus: string;
};
```

## 13.3 Attendance Evidence Reader

Owner:

```text
Attendance Management
```

Contract:

```ts
type AttendanceCompletionEvidenceDTO = {
  enrollmentId: string;
  attendancePercentage: string | null;
  evidenceStatus: "AVAILABLE" | "MISSING" | "UNAVAILABLE";
  calculatedAt: string | null;
  sourceVersion?: string;
};
```

## 13.4 Finance Payment Validation Reader

Owner:

```text
Fee, Billing & Receivables
```

Contract:

```ts
type CompletionPaymentValidationDTO = {
  enrollmentId: string;
  requiredValidationOutcome:
    | "PASSED"
    | "FAILED"
    | "MISSING"
    | "UNAVAILABLE";
  validatedAt: string | null;
  sourceVersion?: string;
};
```

Module 10 must not recompute this from copied payment rows.

## 13.5 Trainer Assignment Reader

Owners:

```text
Training Delivery
Faculty / Trainer Management
```

Contract:

```ts
type TrainerCompletionAuthorityDTO = {
  trainerProfileId: string;
  batchId: string;
  assigned: boolean;
  authorizedForCourse: boolean;
  active: boolean;
};
```

## 13.6 Certificate Eligibility Handoff

Consumer:

```text
Certificate Management
```

Recommended internal application event/contract:

```ts
type CertificateEligibilityAvailable = {
  enrollmentId: string;
  courseCompletionId: string;
  eligibilityVersion: number;
  completionApprovedAt: string;
  paymentValidationPassed: boolean;
  certificateAllowed: boolean;
};
```

Invalidation contract:

```ts
type CertificateEligibilityChanged = {
  enrollmentId: string;
  courseCompletionId: string;
  previousEligible: boolean;
  currentEligible: boolean;
  reasonCode: string;
  changedAt: string;
};
```

Module 10 must not call Certificate repository directly.

---

# 14. Security Requirements by Endpoint Type

## 14.1 Query Endpoints

Must:

- derive read branches from IAM;
- intersect requested branch filters;
- minimize personal data;
- avoid returning Civil ID, passport, visa details;
- return `404` rather than leaking existence where appropriate;
- paginate large result sets.

## 14.2 Mutation Endpoints

Must:

- authenticate;
- authorize permission;
- derive branch from entity;
- validate domain state;
- check expected version;
- validate actor-specific eligibility;
- write audit evidence;
- prevent hard delete.

## 14.3 Bulk Endpoints

Must:

- apply payload size limits;
- validate duplicate enrollment rows;
- not leak cross-branch student identity;
- apply deterministic transaction policy;
- return row-level validation results;
- prevent CSV formula injection in exports where relevant.

## 14.4 Export Endpoints

Must:

- apply export permission;
- apply branch intersection;
- use approved columns only;
- exclude sensitive fields by default;
- use short-lived download tokens where generated;
- audit export action where policy requires.

---

# 15. API-to-Use-Case Traceability

| API | Use Case |
|---|---|
| API-EXC-001 to 009 | UC-EXC-001, UC-EXC-002 |
| API-EXC-010 to 017 | UC-EXC-003, UC-EXC-004, UC-EXC-005 |
| API-EXC-018 to 023 | UC-EXC-006, UC-EXC-008 |
| API-EXC-024 to 029 | UC-EXC-007 |
| API-EXC-030 to 036 | UC-EXC-009 |
| API-EXC-037 | Read/search use case |
| API-EXC-038 | Audit read use case |
| API-EXC-039 to 040 | UC-EXC-010 |

---

# 16. API-to-Entity Ownership Matrix

| Endpoint Group | Owned Entities Mutated | Referenced Contexts | Forbidden Mutation |
|---|---|---|---|
| Exam APIs | Exam | Course, Batch, IAM | Course, Batch |
| Result APIs | Result | Enrollment, Batch, Person, IAM | Enrollment, StudentProfile |
| Completion APIs | CourseCompletion | Course Rule, Attendance, Finance, Enrollment | AttendanceRecord, Payment, CourseCompletionRule |
| Approval APIs | CompletionApproval, CourseCompletion | Trainer, BatchTrainer, IAM | TrainerProfile, BatchTrainer |
| Queue APIs | None | Multiple read models | No mutation |
| Export APIs | None | Multiple read projections | No transactional mutation |
| Certificate eligibility handoff | None in Certificate context | Certificate Management | Certificate |

---

# 17. API Versioning and Compatibility

## 17.1 Route Version

Use:

```text
/api/v1
```

Breaking changes require:

```text
/api/v2
```

## 17.2 Non-Breaking Changes

Allowed:

- adding nullable response fields;
- adding optional request fields;
- adding new enum values only when clients are designed for unknown values;
- adding new endpoints.

## 17.3 Breaking Changes

Examples:

- renaming response fields;
- removing fields;
- changing required fields;
- changing semantics of status;
- changing numeric string to number if precision behavior changes;
- changing branch-scope semantics.

---

# 18. OpenAPI Readiness Checklist

Each endpoint must eventually include:

```text
operationId
summary
description
tags
security
path parameters
query parameters
request body schema
response schemas
error schemas
examples
permission extension if the project uses one
branch-scope documentation
idempotency behavior
concurrency behavior
```

Suggested tag:

```text
ExamResultCompletion
```

Suggested operation IDs:

```text
searchExams
createExam
getExam
updateExam
scheduleExam
activateExam
closeExam
cancelExam
archiveExam
getExamResultRoster
recordExamResult
validateBulkExamResults
submitBulkExamResults
getResult
finalizeResult
finalizeExamResults
correctFinalizedResult
searchCompletions
getCompletion
getCompletionEvaluation
evaluateCompletion
reevaluateCompletion
getCompletionApprovalTimeline
approveTrainerRecommendation
rejectTrainerRecommendation
approveCoordinatorReview
rejectCoordinatorReview
approveFinalCompletion
rejectFinalCompletion
getAcademicWorkQueue
getMissingResultsQueue
getCompletionEvaluationQueue
getTrainerRecommendationQueue
getCoordinatorReviewQueue
getFinalApprovalQueue
getReevaluationQueue
searchAcademicOutcomes
getAcademicAuditTimeline
createAcademicExport
getAcademicExportOptions
```

---

# 19. Implementation Validation Checklist

Before implementation, verify against the actual repository:

```text
1. Exact permission naming convention.
2. Existing REST vs Server Action preference.
3. Existing authentication/session helper.
4. Existing branch authorization policy helper.
5. Existing error envelope.
6. Existing pagination envelope.
7. Existing decimal serialization convention.
8. Existing date/time serialization convention.
9. Exact Prisma enum values for Exam.status.
10. Exact Prisma enum values for Result.resultStatus.
11. Result finalization persistence support.
12. CourseCompletion.completionStatus values.
13. CompletionApproval.approvalLevel values.
14. CompletionApproval.status values.
15. Existing audit writer/event convention.
16. Existing export infrastructure.
17. Idempotency support.
18. Background job support before returning QUEUED export status.
19. Existing API versioning conventions.
20. Existing OpenAPI generation conventions.
```

---

# 20. Final API Boundary

Module 10 API owns commands and queries for:

```text
Exam
Result
CourseCompletion
CompletionApproval
```

It consumes, but does not own:

```text
CourseCompletionRule
Enrollment
Batch
BatchTrainer
Attendance evidence
Finance payment validation
TrainerProfile
User permission and branch access
Certificate issuance
Audit persistence
```

The defining API rule is:

```text
The client requests an academic action.
The server authorizes the user,
derives branch scope,
loads authoritative cross-context evidence,
executes Module 10 domain logic,
persists only Module 10-owned entities,
and exposes downstream outcomes through bounded-context contracts.
```
