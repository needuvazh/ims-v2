# Part 5 – API Contracts

## Module 09 – Faculty / Trainer Management

## 1. Purpose

This document defines the production API contract for Module 09. The module runs inside the ASTI IMS modular monolith and exposes authenticated REST route handlers and narrowly scoped internal server actions. The contracts preserve domain ownership: Trainer Management owns `TrainerProfile`, `TrainerQualification`, `TrainerAvailability`, `TrainerCourseAuthorization`, and `TrainerCompensationRate`; Person, Course, Batch, Session, Document, IAM, Reporting, and Audit records remain owned by their respective contexts.

All business dates and times are interpreted using Oman GST (`Asia/Muscat`, UTC+4) unless an explicit offset is supplied and accepted by the route contract. All identifiers are opaque UUID/CUID strings. All list routes exclude soft-deleted records by default.

## 2. Common API Conventions

### 2.1 Base Path

`/api/v1/faculty`

### 2.2 Authentication

Every endpoint requires an authenticated ASTI IMS session. Internal server actions require an authenticated server context or trusted in-process caller identity. Anonymous access is not supported.

### 2.3 Branch Scope Resolution

The server derives `effectiveBranchScope` from the authenticated user's `UserBranchAccess`, current branch context, parent/child visibility rules, and consolidated-report permission. A client-supplied `branchId` is treated only as a narrowing filter. It never expands access.

Write rules:

1. Resolve authenticated user.
2. Resolve required permission.
3. Resolve writable branch scope.
4. Load target entity using `id AND branchId IN writableScope AND isDeleted = false`.
5. Validate business rules.
6. Persist transaction.
7. Persist audit entry for sensitive action.
8. Publish in-process domain event only after successful commit.

### 2.4 Standard Success Envelope

```json
{
  "data": {},
  "meta": {
    "requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9",
    "timestamp": "2026-07-04T12:00:00+04:00"
  }
}
```

List responses use:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 0,
    "totalPages": 0,
    "requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9",
    "timestamp": "2026-07-04T12:00:00+04:00"
  }
}
```

### 2.5 Standard Error Envelope

```json
{
  "error": {
    "code": "ERR_FTM_VALIDATION_FAILED",
    "message": "The request contains invalid values.",
    "fieldErrors": {
      "effectiveEndDate": ["effectiveEndDate must be on or after effectiveStartDate."]
    },
    "details": {},
    "requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9"
  }
}
```

### 2.6 Common Pagination and Sorting Schema

```ts
const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(25).max(100).default(25),
});

const SortDirectionSchema = z.enum(["asc", "desc"]).default("asc");
```

## 3. Endpoint Inventory

| ID | Method | Route / Action | Purpose | Permission |
|---|---|---|---|---|
| API-FTM-001 | GET | `/api/v1/faculty/trainers` | Search and list trainers. | `trainer.read` |
| API-FTM-002 | POST | `/api/v1/faculty/trainers` | Create trainer profile. | `trainer.create` |
| API-FTM-003 | GET | `/api/v1/faculty/trainers/{trainerId}` | Read complete trainer profile subject to section permissions. | `trainer.read` |
| API-FTM-004 | PATCH | `/api/v1/faculty/trainers/{trainerId}` | Update TrainerProfile-owned fields. | `trainer.update` |
| API-FTM-005 | POST | `/api/v1/faculty/trainers/{trainerId}/status-transitions` | Execute trainer status transition. | `trainer.status.manage` |
| API-FTM-006 | GET | `/api/v1/faculty/trainers/{trainerId}/qualifications` | List qualifications. | `trainer.qualification.read` |
| API-FTM-007 | POST | `/api/v1/faculty/trainers/{trainerId}/qualifications` | Add qualification. | `trainer.qualification.manage` |
| API-FTM-008 | PATCH | `/api/v1/faculty/trainers/{trainerId}/qualifications/{qualificationId}` | Update qualification. | `trainer.qualification.manage` |
| API-FTM-009 | DELETE | `/api/v1/faculty/trainers/{trainerId}/qualifications/{qualificationId}` | Soft delete qualification. | `trainer.qualification.manage` |
| API-FTM-010 | GET | `/api/v1/faculty/trainers/{trainerId}/availability` | List availability windows. | `trainer.availability.read` |
| API-FTM-011 | POST | `/api/v1/faculty/trainers/{trainerId}/availability` | Create availability window. | `trainer.availability.manage` |
| API-FTM-012 | PATCH | `/api/v1/faculty/trainers/{trainerId}/availability/{availabilityId}` | Update/deactivate availability window. | `trainer.availability.manage` |
| API-FTM-013 | DELETE | `/api/v1/faculty/trainers/{trainerId}/availability/{availabilityId}` | Soft delete availability window. | `trainer.availability.manage` |
| API-FTM-014 | GET | `/api/v1/faculty/trainers/{trainerId}/authorizations` | List course authorizations. | `trainer.authorization.read` |
| API-FTM-015 | POST | `/api/v1/faculty/trainers/{trainerId}/authorizations` | Create course authorization. | `trainer.authorization.manage` |
| API-FTM-016 | POST | `/api/v1/faculty/trainers/{trainerId}/authorizations/{authorizationId}/transitions` | Change authorization state. | `trainer.authorization.manage` |
| API-FTM-017 | GET | `/api/v1/faculty/eligible-trainers` | Find eligible trainers for course, branch, and optional interval. | `trainer.eligibility.read` |
| API-FTM-018 | POST | `/api/v1/faculty/eligibility/validate-assignment` | Validate assignment eligibility for Training Delivery. | `trainer.eligibility.read` or trusted in-process caller |
| API-FTM-019 | POST | `/api/v1/faculty/availability/validate` | Validate availability for Scheduling. | `trainer.eligibility.read` or trusted in-process caller |
| API-FTM-020 | GET | `/api/v1/faculty/trainers/{trainerId}/compensation-rates` | List compensation rate structures. | `trainer.compensation.read` |
| API-FTM-021 | POST | `/api/v1/faculty/trainers/{trainerId}/compensation-rates` | Create compensation rate. | `trainer.compensation.manage` |
| API-FTM-022 | PATCH | `/api/v1/faculty/trainers/{trainerId}/compensation-rates/{rateId}` | Update/deactivate compensation rate. | `trainer.compensation.manage` |
| API-FTM-023 | POST | `/api/v1/faculty/compensation-rates/resolve` | Resolve applicable rate by specificity. | `trainer.compensation.read` or trusted in-process caller |
| API-FTM-024 | GET | `/api/v1/faculty/trainers/{trainerId}/assignments` | Read Batch/Session assignment references. | `trainer.read` |
| API-FTM-025 | GET | `/api/v1/faculty/reports/{reportCode}` | Read trainer operational report. | `trainer.report.view` |
| API-FTM-026 | POST | `/api/v1/faculty/reports/{reportCode}/exports` | Export report dataset. | `trainer.report.export` |
| API-FTM-027 | GET | `/api/v1/faculty/trainers/{trainerId}/audit-history` | Read immutable audit history. | `trainer.audit.read` |

---

## 4. Detailed Endpoint Contracts

## API-FTM-001 – Search and List Trainers

**Method/Route:** `GET /api/v1/faculty/trainers`  
**Purpose:** Implements FR-FTM-001.

**Authentication & Permission:** Authenticated session; `trainer.read`.

**Branch Scope:** Server intersects optional `branchId` filter with readable branch scope. Consolidated query requires explicit consolidated-report capability and visible branches.

**Zod Query Schema:**

```ts
const TrainerListQuerySchema = PaginationSchema.extend({
  q: z.string().trim().min(1).max(120).optional(),
  branchId: z.string().min(1).max(64).optional(),
  trainerType: z.enum(["FullTime", "PartTime", "Freelance"]).optional(),
  status: z.enum(["Active", "Inactive", "Suspended"]).optional(),
  specialization: z.string().trim().max(200).optional(),
  effectiveOn: z.coerce.date().optional(),
  sortBy: z.enum(["trainerCode", "displayName", "trainerType", "status", "effectiveStartDate", "createdAt"]).default("displayName"),
  sortDirection: SortDirectionSchema,
});
```

**Success DTO:**

```json
{
  "data": [
    {
      "id": "trn_01J8B0L3N5R7T9V1X2Z4C6D8F0H2",
      "personId": "per_01J9C1M4P6S8U0W2Y3A5E7G9J1K3",
      "trainerCode": "TRN-MCT-00042",
      "displayName": {"en": "Ahmed Al Harthy", "ar": "أحمد الحارثي"},
      "branch": {"id": "br_mct", "code": "MCT", "name": {"en": "Muscat", "ar": "مسقط"}},
      "trainerType": "Freelance",
      "specialization": "Occupational Health and Safety",
      "status": "Active",
      "effectiveStartDate": "2026-01-01",
      "effectiveEndDate": null,
      "version": 4
    }
  ],
  "meta": {"page": 1, "pageSize": 25, "totalItems": 1, "totalPages": 1, "requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9", "timestamp": "2026-07-04T12:00:00+04:00"}
}
```

**Errors:** 400 `ERR_FTM_INVALID_QUERY`; 401 `ERR_AUTH_UNAUTHENTICATED`; 403 `ERR_AUTH_PERMISSION_DENIED`; 403 `ERR_FTM_BRANCH_SCOPE_DENIED`.

## API-FTM-002 – Create Trainer Profile

**Method/Route:** `POST /api/v1/faculty/trainers`  
**Purpose:** Implements FR-FTM-002.

**Authentication & Permission:** `trainer.create`.

**Branch Scope:** `branchId` must be inside writable branch scope.

**Zod Request Schema:**

```ts
const CreateTrainerProfileSchema = z.object({
  personId: z.string().min(1).max(64),
  branchId: z.string().min(1).max(64),
  trainerType: z.enum(["FullTime", "PartTime", "Freelance"]),
  specialization: z.string().trim().min(2).max(500),
  qualificationSummary: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["Active", "Inactive"]),
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.coerce.date().optional().nullable(),
}).superRefine(validateEffectiveDateRange);
```

**Processing Rules:** Verify Person exists; enforce one non-deleted TrainerProfile per Person; generate unique trainer code from numbering series where configured; create audit record; publish `TrainerCreated` after commit.

**Success DTO:** HTTP 201.

```json
{
  "data": {
    "id": "trn_01J8B0L3N5R7T9V1X2Z4C6D8F0H2",
    "personId": "per_01J9C1M4P6S8U0W2Y3A5E7G9J1K3",
    "trainerCode": "TRN-MCT-00042",
    "branchId": "br_mct",
    "trainerType": "Freelance",
    "specialization": "Occupational Health and Safety",
    "qualificationSummary": "NEBOSH IGC; IOSH Managing Safely",
    "status": "Active",
    "effectiveStartDate": "2026-08-01",
    "effectiveEndDate": null,
    "version": 1,
    "createdAt": "2026-07-04T12:00:00+04:00"
  },
  "meta": {"requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9", "timestamp": "2026-07-04T12:00:00+04:00"}
}
```

**Errors:** 400 `ERR_FTM_VALIDATION_FAILED`; 404 `ERR_PTY_PERSON_NOT_FOUND`; 409 `ERR_FTM_DUPLICATE_TRAINER_PROFILE`; 409 `ERR_FTM_TRAINER_CODE_CONFLICT`; 403 `ERR_FTM_BRANCH_SCOPE_DENIED`.

## API-FTM-003 – Read Complete Trainer Profile

**Method/Route:** `GET /api/v1/faculty/trainers/{trainerId}`  
**Permission:** `trainer.read`.

**Branch Scope:** Trainer must exist inside readable scope.

**Zod Path Schema:**

```ts
const TrainerIdParamSchema = z.object({ trainerId: z.string().min(1).max(64) });
```

**Success DTO:** Section-level data is included only when corresponding read permission is present.

```json
{
  "data": {
    "profile": {
      "id": "trn_01J8B0L3N5R7T9V1X2Z4C6D8F0H2",
      "trainerCode": "TRN-MCT-00042",
      "person": {"id": "per_01J9C1M4P6S8U0W2Y3A5E7G9J1K3", "displayName": {"en": "Ahmed Al Harthy", "ar": "أحمد الحارثي"}},
      "branch": {"id": "br_mct", "code": "MCT"},
      "trainerType": "Freelance",
      "specialization": "Occupational Health and Safety",
      "status": "Active",
      "effectiveStartDate": "2026-01-01",
      "effectiveEndDate": null,
      "version": 4
    },
    "qualifications": [],
    "availability": [],
    "authorizations": [],
    "compensationRates": null,
    "assignmentSummary": {"activeBatches": 2, "futureSessions": 6}
  },
  "meta": {"requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9", "timestamp": "2026-07-04T12:00:00+04:00"}
}
```

**Errors:** 401, 403, 404 `ERR_FTM_TRAINER_NOT_FOUND`.

## API-FTM-004 – Update Trainer Profile

**Method/Route:** `PATCH /api/v1/faculty/trainers/{trainerId}`  
**Permission:** `trainer.update`.

**Branch Scope:** Existing trainer and target branch, when changed, must both be writable.

**Zod Request Schema:**

```ts
const UpdateTrainerProfileSchema = z.object({
  branchId: z.string().min(1).max(64).optional(),
  trainerType: z.enum(["FullTime", "PartTime", "Freelance"]).optional(),
  specialization: z.string().trim().min(2).max(500).optional(),
  qualificationSummary: z.string().trim().max(1000).nullable().optional(),
  effectiveStartDate: z.coerce.date().optional(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
  version: z.number().int().min(1),
}).strict();
```

Person-owned fields are rejected if present.

**Success DTO:** Updated profile object with incremented `version`.

**Errors:** 400 `ERR_FTM_PERSON_FIELD_OWNERSHIP_VIOLATION`; 404 `ERR_FTM_TRAINER_NOT_FOUND`; 409 `ERR_FTM_VERSION_CONFLICT`; 422 `ERR_FTM_EFFECTIVE_DATE_INVALID`.

## API-FTM-005 – Execute Trainer Status Transition

**Method/Route:** `POST /api/v1/faculty/trainers/{trainerId}/status-transitions`  
**Permission:** `trainer.status.manage`.

**Zod Request Schema:**

```ts
const TrainerStatusTransitionSchema = z.object({
  toStatus: z.enum(["Active", "Inactive", "Suspended"]),
  effectiveAt: z.coerce.date(),
  reason: z.string().trim().min(10).max(1000),
  version: z.number().int().min(1),
});
```

**Success DTO:**

```json
{
  "data": {
    "trainerId": "trn_01J8B0L3N5R7T9V1X2Z4C6D8F0H2",
    "fromStatus": "Active",
    "toStatus": "Suspended",
    "effectiveAt": "2026-07-05T00:00:00+04:00",
    "version": 5
  },
  "meta": {"requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9", "timestamp": "2026-07-04T12:00:00+04:00"}
}
```

**Errors:** 409 `ERR_FTM_INVALID_STATUS_TRANSITION`; 409 `ERR_FTM_ACTIVE_ASSIGNMENT_IMPACT_REVIEW_REQUIRED`; 409 `ERR_FTM_VERSION_CONFLICT`; 422 `ERR_FTM_STATUS_EFFECTIVE_DATE_INVALID`.

## API-FTM-006 to API-FTM-009 – Qualification Contracts

### List Qualifications

`GET /trainers/{trainerId}/qualifications`; permission `trainer.qualification.read`.

Query schema:

```ts
const QualificationListQuerySchema = PaginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  sortBy: z.enum(["qualificationName", "institution", "yearCompleted", "createdAt"]).default("yearCompleted"),
  sortDirection: SortDirectionSchema.default("desc"),
});
```

### Create Qualification

`POST /trainers/{trainerId}/qualifications`; permission `trainer.qualification.manage`.

```ts
const QualificationMutationSchema = z.object({
  qualificationName: z.string().trim().min(2).max(200),
  institution: z.string().trim().min(2).max(200),
  yearCompleted: z.number().int().min(1900).max(2100),
  documentId: z.string().min(1).max(64).optional().nullable(),
});
```

`yearCompleted` is additionally bounded by the current Oman business year.

### Update Qualification

`PATCH /trainers/{trainerId}/qualifications/{qualificationId}` uses the same schema plus `version`.

### Soft Delete Qualification

`DELETE /trainers/{trainerId}/qualifications/{qualificationId}` body:

```ts
const SoftDeleteSchema = z.object({
  reason: z.string().trim().min(10).max(1000),
  version: z.number().int().min(1),
});
```

**Success DTO:**

```json
{
  "data": {
    "id": "qual_01J2D4N6Q8T0W2Z4B6E8H0K2M4P6",
    "trainerId": "trn_01J8B0L3N5R7T9V1X2Z4C6D8F0H2",
    "qualificationName": "NEBOSH International General Certificate",
    "institution": "NEBOSH",
    "yearCompleted": 2024,
    "document": {"id": "doc_01J3E5P7R9U1X3A5C7F9J1L3N5Q7", "verificationStatus": "Approved"},
    "version": 2
  },
  "meta": {"requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9", "timestamp": "2026-07-04T12:00:00+04:00"}
}
```

**Errors:** `ERR_FTM_QUALIFICATION_NOT_FOUND`, `ERR_FTM_QUALIFICATION_YEAR_IN_FUTURE`, `ERR_DOC_DOCUMENT_NOT_FOUND`, `ERR_DOC_DOCUMENT_SCOPE_DENIED`, `ERR_FTM_VERSION_CONFLICT`.

## API-FTM-010 to API-FTM-013 – Availability Contracts

### List Availability

`GET /trainers/{trainerId}/availability`; permission `trainer.availability.read`.

```ts
const AvailabilityListQuerySchema = PaginationSchema.extend({
  branchId: z.string().max(64).optional(),
  dayOfWeek: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]).optional(),
  status: z.enum(["Active", "Inactive"]).optional(),
  effectiveOn: z.coerce.date().optional(),
});
```

### Create Availability

```ts
const AvailabilityMutationSchema = z.object({
  branchId: z.string().min(1).max(64),
  dayOfWeek: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  status: z.enum(["Active", "Inactive"]),
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.coerce.date().optional().nullable(),
}).superRefine(validateTimeOrderAndDateRange);
```

Create/update permission: `trainer.availability.manage`.

### Update/Deactivate Availability

PATCH uses partial mutable fields plus mandatory `version`. Deactivation sets `status = Inactive`; it does not hard delete.

### Soft Delete Availability

DELETE uses `SoftDeleteSchema`.

**Success DTO:**

```json
{
  "data": {
    "id": "avl_01J4F6Q8S0V2Y4B6D8G0K2M4P6R8",
    "trainerId": "trn_01J8B0L3N5R7T9V1X2Z4C6D8F0H2",
    "branchId": "br_mct",
    "dayOfWeek": "Monday",
    "startTime": "09:00",
    "endTime": "13:00",
    "status": "Active",
    "effectiveStartDate": "2026-08-01",
    "effectiveEndDate": null,
    "version": 1
  },
  "meta": {"requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9", "timestamp": "2026-07-04T12:00:00+04:00"}
}
```

**Errors:** `ERR_FTM_AVAILABILITY_TIME_ORDER_INVALID`, `ERR_FTM_AVAILABILITY_OVERLAP`, `ERR_FTM_AVAILABILITY_NOT_FOUND`, `ERR_FTM_EFFECTIVE_DATE_INVALID`, `ERR_FTM_BRANCH_SCOPE_DENIED`.

## API-FTM-014 to API-FTM-016 – Course Authorization Contracts

### List Authorizations

`GET /trainers/{trainerId}/authorizations`; permission `trainer.authorization.read`.

```ts
const AuthorizationListQuerySchema = PaginationSchema.extend({
  courseId: z.string().max(64).optional(),
  status: z.enum(["Active", "Inactive", "Suspended", "Expired"]).optional(),
  effectiveOn: z.coerce.date().optional(),
});
```

### Create Authorization

```ts
const CreateAuthorizationSchema = z.object({
  courseId: z.string().min(1).max(64),
  status: z.enum(["Active", "Inactive"]),
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.coerce.date().optional().nullable(),
  reason: z.string().trim().min(10).max(1000),
}).superRefine(validateEffectiveDateRange);
```

### Transition Authorization

```ts
const AuthorizationTransitionSchema = z.object({
  toStatus: z.enum(["Active", "Inactive", "Suspended", "Expired"]),
  effectiveAt: z.coerce.date(),
  reason: z.string().trim().min(10).max(1000),
  version: z.number().int().min(1),
});
```

**Success DTO:**

```json
{
  "data": {
    "id": "authz_01J5G7R9T1W3Z5C7E9H1L3N5Q7S9",
    "trainerId": "trn_01J8B0L3N5R7T9V1X2Z4C6D8F0H2",
    "course": {"id": "crs_01J6H8S0U2X4A6D8F0J2M4P6R8T0", "courseCode": "HSE-101", "name": {"en": "HSE Fundamentals", "ar": "أساسيات الصحة والسلامة"}},
    "status": "Active",
    "effectiveStartDate": "2026-08-01",
    "effectiveEndDate": "2027-07-31",
    "version": 1
  },
  "meta": {"requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9", "timestamp": "2026-07-04T12:00:00+04:00"}
}
```

**Errors:** `ERR_CAT_COURSE_NOT_FOUND`, `ERR_FTM_AUTHORIZATION_OVERLAP`, `ERR_FTM_AUTHORIZATION_NOT_FOUND`, `ERR_FTM_AUTHORIZATION_TRANSITION_INVALID`, `ERR_FTM_AUTHORIZATION_EFFECTIVE_DATE_INVALID`.

## API-FTM-017 – Find Eligible Trainers

**Method/Route:** `GET /api/v1/faculty/eligible-trainers`  
**Permission:** `trainer.eligibility.read`.

**Branch Scope:** `branchId` is mandatory and must be inside readable branch scope.

```ts
const EligibleTrainerQuerySchema = PaginationSchema.extend({
  courseId: z.string().min(1).max(64),
  branchId: z.string().min(1).max(64),
  targetDate: z.coerce.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  trainerType: z.enum(["FullTime", "PartTime", "Freelance"]).optional(),
  q: z.string().trim().max(120).optional(),
}).superRefine(requireBothTimesOrNeither);
```

**Eligibility Algorithm:**

1. Trainer profile is not soft-deleted.
2. Trainer branch is within requested/authorized scope.
3. Profile status is `Active`.
4. Profile effective period contains `targetDate`.
5. Active/effective course authorization exists.
6. When interval supplied, an active/effective availability window fully contains requested interval.
7. Scheduling conflict status is not asserted by this route; consumers must perform Scheduling conflict validation before final assignment.

**Success DTO:**

```json
{
  "data": [
    {
      "trainerId": "trn_01J8B0L3N5R7T9V1X2Z4C6D8F0H2",
      "trainerCode": "TRN-MCT-00042",
      "displayName": {"en": "Ahmed Al Harthy", "ar": "أحمد الحارثي"},
      "trainerType": "Freelance",
      "authorizationId": "authz_01J5G7R9T1W3Z5C7E9H1L3N5Q7S9",
      "availabilityId": "avl_01J4F6Q8S0V2Y4B6D8G0K2M4P6R8",
      "eligibility": "ELIGIBLE",
      "schedulingConflictCheckRequired": true
    }
  ],
  "meta": {"page": 1, "pageSize": 25, "totalItems": 1, "totalPages": 1, "requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9", "timestamp": "2026-07-04T12:00:00+04:00"}
}
```

**Errors:** `ERR_FTM_ELIGIBILITY_INPUT_INVALID`, `ERR_FTM_BRANCH_SCOPE_DENIED`, `ERR_CAT_COURSE_NOT_FOUND`.

## API-FTM-018 – Validate Assignment Eligibility

**Method/Route:** `POST /api/v1/faculty/eligibility/validate-assignment`

**Authentication & Permission:** `trainer.eligibility.read` for user calls; trusted in-process call from Training Delivery may use service-to-module identity.

```ts
const AssignmentEligibilitySchema = z.object({
  trainerId: z.string().min(1).max(64),
  courseId: z.string().min(1).max(64),
  branchId: z.string().min(1).max(64),
  assignmentDate: z.coerce.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
}).superRefine(requireBothTimesOrNeither);
```

**Success DTO:**

```json
{
  "data": {
    "eligible": false,
    "reasonCodes": ["TRAINER_NOT_AVAILABLE"],
    "profileEffective": true,
    "courseAuthorized": true,
    "available": false,
    "schedulingConflictCheckRequired": true
  },
  "meta": {"requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9", "timestamp": "2026-07-04T12:00:00+04:00"}
}
```

Business ineligibility returns HTTP 200 with `eligible=false`; malformed or unauthorized requests return errors.

## API-FTM-019 – Validate Availability

`POST /api/v1/faculty/availability/validate`; permission `trainer.eligibility.read` or trusted Scheduling caller.

```ts
const AvailabilityValidationSchema = z.object({
  trainerId: z.string().min(1).max(64),
  branchId: z.string().min(1).max(64),
  date: z.coerce.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
}).superRefine(validateTimeOrder);
```

**Success DTO:**

```json
{
  "data": {
    "status": "AVAILABLE",
    "availabilityId": "avl_01J4F6Q8S0V2Y4B6D8G0K2M4P6R8",
    "timezone": "Asia/Muscat"
  },
  "meta": {"requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9", "timestamp": "2026-07-04T12:00:00+04:00"}
}
```

Possible business results: `AVAILABLE`, `NOT_AVAILABLE`, `PROFILE_INACTIVE`, `PROFILE_OUTSIDE_EFFECTIVE_PERIOD`.

## API-FTM-020 to API-FTM-023 – Compensation Rate Contracts

### List Rates

`GET /trainers/{trainerId}/compensation-rates`; permission `trainer.compensation.read`.

```ts
const RateListQuerySchema = PaginationSchema.extend({
  paymentBasis: z.enum(["PerHour", "PerSession", "PerStudent", "Fixed"]).optional(),
  status: z.enum(["Active", "Inactive"]).optional(),
  effectiveOn: z.coerce.date().optional(),
  batchId: z.string().max(64).optional(),
  sessionId: z.string().max(64).optional(),
});
```

### Create Rate

```ts
const CreateRateSchema = z.object({
  batchId: z.string().min(1).max(64).optional().nullable(),
  sessionId: z.string().min(1).max(64).optional().nullable(),
  paymentBasis: z.enum(["PerHour", "PerSession", "PerStudent", "Fixed"]),
  amount: z.coerce.number().positive().multipleOf(0.001),
  currency: z.literal("OMR").default("OMR"),
  status: z.enum(["Active", "Inactive"]),
  remarks: z.string().trim().max(1000).optional().nullable(),
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.coerce.date().optional().nullable(),
}).superRefine(validateRateSpecificityAndDates);
```

Rules: `sessionId` implies session-specific rate; `batchId` may be present with session only when the Session belongs to that Batch. Session and Batch references are validated against Training Delivery. Ambiguous overlapping active rates at the same specificity, trainer, basis, and effective period are rejected.

### Update Rate

PATCH uses mutable fields plus mandatory `version`. Historical rate changes should normally end-date old rate and create a new rate when commercial terms change after usage has occurred.

### Resolve Rate

`POST /compensation-rates/resolve`:

```ts
const ResolveRateSchema = z.object({
  trainerId: z.string().min(1).max(64),
  paymentBasis: z.enum(["PerHour", "PerSession", "PerStudent", "Fixed"]),
  effectiveOn: z.coerce.date(),
  batchId: z.string().min(1).max(64).optional(),
  sessionId: z.string().min(1).max(64).optional(),
});
```

Precedence: Session-specific → Batch-specific → Trainer-level.

**Success DTO:**

```json
{
  "data": {
    "rateId": "rate_01J7J9T1V3Y5B7E9G1K3N5Q7S9U1",
    "trainerId": "trn_01J8B0L3N5R7T9V1X2Z4C6D8F0H2",
    "specificity": "SESSION",
    "paymentBasis": "PerSession",
    "amount": "75.000",
    "currency": "OMR",
    "effectiveStartDate": "2026-06-01",
    "effectiveEndDate": null
  },
  "meta": {"requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9", "timestamp": "2026-07-04T12:00:00+04:00"}
}
```

**Errors:** `ERR_FTM_COMPENSATION_PERMISSION_DENIED`, `ERR_FTM_RATE_AMOUNT_INVALID`, `ERR_FTM_RATE_OVERLAP`, `ERR_FTM_RATE_AMBIGUOUS`, `ERR_FTM_RATE_NOT_FOUND`, `ERR_TRD_BATCH_NOT_FOUND`, `ERR_TRD_SESSION_NOT_FOUND`, `ERR_TRD_SESSION_BATCH_MISMATCH`.

## API-FTM-024 – Read Assignment References

**Method/Route:** `GET /trainers/{trainerId}/assignments`  
**Permission:** `trainer.read`.

```ts
const AssignmentReferenceQuerySchema = PaginationSchema.extend({
  kind: z.enum(["Batch", "Session", "All"]).default("All"),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  status: z.string().trim().max(50).optional(),
});
```

**Success DTO:** Read-only projection sourced from Training Delivery.

```json
{
  "data": [
    {
      "kind": "Batch",
      "referenceId": "batch_01J8K0U2W4Z6C8F0H2L4P6R8T0V2",
      "code": "HSE-2026-08-A",
      "courseCode": "HSE-101",
      "branchId": "br_mct",
      "startDate": "2026-08-01",
      "endDate": "2026-08-31",
      "status": "Scheduled"
    }
  ],
  "meta": {"page": 1, "pageSize": 25, "totalItems": 1, "totalPages": 1, "requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9", "timestamp": "2026-07-04T12:00:00+04:00"}
}
```

No assignment mutation is allowed through this module.

## API-FTM-025 and API-FTM-026 – Reports and Exports

Supported `reportCode` values:

- `trainer-roster`
- `authorization-coverage`
- `availability-coverage`
- `trainer-utilization-reference`
- `qualification-compliance`
- `compensation-configuration-coverage`

Compensation coverage requires both `trainer.report.view` and `trainer.compensation.read`.

### Report Query Schema

```ts
const TrainerReportQuerySchema = PaginationSchema.extend({
  branchId: z.string().max(64).optional(),
  fromDate: z.coerce.date(),
  toDate: z.coerce.date(),
  trainerType: z.enum(["FullTime", "PartTime", "Freelance"]).optional(),
  status: z.enum(["Active", "Inactive", "Suspended"]).optional(),
  courseId: z.string().max(64).optional(),
});
```

### Export Request Schema

```ts
const TrainerReportExportSchema = z.object({
  format: z.enum(["csv", "xlsx"]),
  filters: TrainerReportQuerySchema.omit({page: true, pageSize: true}),
  locale: z.enum(["en", "ar"]),
});
```

**Success DTO:** report returns paginated rows; export returns a generated artifact reference after synchronous generation within configured export bounds.

```json
{
  "data": {
    "fileName": "trainer-roster-2026-07-04.xlsx",
    "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "downloadToken": "exp_01J9L1V3X5A7D9G1J3M5Q7S9U1W3",
    "expiresAt": "2026-07-04T13:00:00+04:00",
    "rowCount": 842
  },
  "meta": {"requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9", "timestamp": "2026-07-04T12:00:00+04:00"}
}
```

**Errors:** `ERR_FTM_REPORT_CODE_INVALID`, `ERR_FTM_REPORT_RANGE_TOO_LARGE`, `ERR_FTM_REPORT_EXPORT_LIMIT_EXCEEDED`, `ERR_FTM_CONSOLIDATED_REPORT_PERMISSION_REQUIRED`, `ERR_FTM_COMPENSATION_PERMISSION_DENIED`.

## API-FTM-027 – Audit History

**Method/Route:** `GET /trainers/{trainerId}/audit-history`  
**Permission:** `trainer.audit.read`.

```ts
const AuditHistoryQuerySchema = PaginationSchema.extend({
  action: z.string().trim().max(100).optional(),
  entityType: z.enum(["TrainerProfile", "TrainerQualification", "TrainerAvailability", "TrainerCourseAuthorization", "TrainerCompensationRate"]).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});
```

**Success DTO:**

```json
{
  "data": [
    {
      "auditId": "aud_01J0M2W4Y6B8E0H2K4N6R8T0V2X4",
      "entityType": "TrainerCourseAuthorization",
      "entityId": "authz_01J5G7R9T1W3Z5C7E9H1L3N5Q7S9",
      "action": "STATUS_CHANGED",
      "oldValue": {"status": "Active"},
      "newValue": {"status": "Suspended"},
      "reason": "Authorization suspended pending qualification renewal.",
      "performedBy": {"userId": "usr_01J1N3X5Z7C9F1J3L5P7S9U1W3Y5", "displayName": "Branch Manager"},
      "performedAt": "2026-07-04T11:15:00+04:00",
      "ipAddressMasked": "10.20.xxx.xxx"
    }
  ],
  "meta": {"page": 1, "pageSize": 25, "totalItems": 1, "totalPages": 1, "requestId": "req_01J7A9K2M4Q6R8T0V1W3X5Y7Z9", "timestamp": "2026-07-04T12:00:00+04:00"}
}
```

**Errors:** `ERR_AUTH_PERMISSION_DENIED`, `ERR_FTM_BRANCH_SCOPE_DENIED`, `ERR_FTM_TRAINER_NOT_FOUND`.

---

## 5. Internal Server Actions / In-Process Contracts

These are not public browser APIs. They are module boundary functions used inside the modular monolith.

```ts
export type ValidateTrainerAssignmentInput = {
  trainerId: string;
  courseId: string;
  branchId: string;
  assignmentDate: Date;
  startTime?: string;
  endTime?: string;
};

export type ValidateTrainerAssignmentResult = {
  eligible: boolean;
  reasonCodes: Array<
    | "TRAINER_NOT_FOUND"
    | "PROFILE_INACTIVE"
    | "PROFILE_OUTSIDE_EFFECTIVE_PERIOD"
    | "COURSE_NOT_AUTHORIZED"
    | "TRAINER_NOT_AVAILABLE"
  >;
  authorizationId?: string;
  availabilityId?: string;
  schedulingConflictCheckRequired: boolean;
};
```

```ts
export type ResolveCompensationRateInput = {
  trainerId: string;
  paymentBasis: "PerHour" | "PerSession" | "PerStudent" | "Fixed";
  effectiveOn: Date;
  batchId?: string;
  sessionId?: string;
};

export type ResolveCompensationRateResult = {
  rateId: string;
  specificity: "SESSION" | "BATCH" | "TRAINER";
  paymentBasis: "PerHour" | "PerSession" | "PerStudent" | "Fixed";
  amount: string;
  currency: "OMR";
};
```

## 6. HTTP Status Strategy

| HTTP | Meaning in Module 09 |
|---|---|
| 200 | Successful read, update, validation result, or transition. |
| 201 | New resource created. |
| 400 | Malformed query or schema validation failure. |
| 401 | No valid authenticated session. |
| 403 | Permission denied or branch scope denied. |
| 404 | Resource not found inside accessible scope. |
| 409 | Duplicate, overlap, invalid state transition, ambiguity, or optimistic concurrency conflict. |
| 422 | Semantically invalid dates, time bounds, status effective date, or domain validation. |
| 429 | Rate limit exceeded for report/export or abusive API use. |
| 500 | Unexpected server error with request ID; no stack trace returned to client. |
| 503 | Required owning module temporarily unavailable for synchronous validation. |

## 7. API Security Requirements

1. Compensation fields must never be serialized unless explicit compensation-read permission is present.
2. Audit history requires `trainer.audit.read` independent of `trainer.read`.
3. All mutation requests use server-side branch scope and entity reloading; no client trust.
4. Export endpoints apply the same row-level branch filtering and field-level redaction as interactive views.
5. Person fields are never updated through TrainerProfile routes.
6. Soft-deleted records are excluded from normal list, eligibility, availability, authorization, and rate-resolution queries.
7. Version-controlled mutations reject stale writes using HTTP 409 and `ERR_FTM_VERSION_CONFLICT`.
8. Error details must not reveal existence of out-of-scope trainers, qualifications, or rates.
9. Sensitive request/response fields must be excluded from application logs; identifiers and action metadata may be logged.
10. In-process domain events are emitted only after commit and do not transfer aggregate ownership.
