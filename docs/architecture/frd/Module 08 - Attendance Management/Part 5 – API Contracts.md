# Part 5 – API Contracts

## Module 08 – Attendance Management

| Attribute        | Value                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| Product          | ASTI Integrated Institute Management System (IMS)                                                                 |
| Module           | Module 08 – Attendance Management                                                                                 |
| Module Code      | `M08-ATT`                                                                                                         |
| Bounded Context  | Attendance Management                                                                                             |
| API Style        | Next.js Route Handlers + Server Actions inside modular monolith                                                   |
| Package Boundary | `packages/attendance` owns attendance services, DTOs, schemas, policies, and repositories                         |
| Timezone         | Persist UTC timestamps; render business dates in Oman GST UTC+4                                                   |
| Branch Rule      | All queries and mutations must be server-scoped by authenticated active branch or allowed consolidated branch set |

---

## 1. API Contract Principles

1. APIs must use the central `Enrollment` aggregate for learner participation. Attendance must not create independent learner-course-batch lifecycle records.
2. APIs may reference `Branch`, `Course`, `Batch`, `Session`, `Enrollment`, `StudentProfile`, `TrainerProfile`, `User`, `Document`, `NotificationRequest`, and `AuditLog`; ownership remains with their respective bounded contexts.
3. Every endpoint requires authentication, fine-grained permission checks, and server-side branch scoping.
4. Trainer access is additionally restricted to assigned `Session` or active `BatchTrainer` assignment.
5. Student access is self-scoped to the authenticated `Person -> StudentProfile -> Enrollment`.
6. All mutations must enforce optimistic locking with `expectedVersion` where the record is user-editable.
7. Submitted, approved, corrected, cancelled, and locked attendance cannot be directly edited. Official changes must use correction workflows.
8. Every sensitive mutation must write an audit event in the same transaction.
9. No hard delete APIs are exposed for Attendance Management.
10. Error responses must use stable `ERR_ATT_*` codes.

---

## 2. Shared Headers and Envelopes

### 2.1 Request Headers

```http
Authorization: Bearer <ims-session-token>
X-Branch-Id: <active-branch-uuid>
Accept-Language: en | ar
Content-Type: application/json
```

`X-Branch-Id` is the requested active branch. The server must verify this branch exists in `UserBranchAccess`. When the user has multiple assigned branches and no active branch is supplied, return `400 ERR_ATT_BRANCH_CONTEXT_REQUIRED`.

### 2.2 Success Envelope

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_01JZ6G5W8Z7K9T6G3Q4S2P1M0N",
    "branchId": "8d983798-5a2f-4780-b546-a27674a33d0d",
    "generatedAt": "2026-07-04T08:30:00.000Z"
  }
}
```

### 2.3 Error Envelope

```json
{
  "success": false,
  "error": {
    "code": "ERR_ATT_RECORD_LOCKED",
    "message": "Attendance has already been submitted and cannot be edited directly.",
    "fieldErrors": [
      {
        "field": "records[0].status",
        "code": "ERR_ATT_RECORD_LOCKED",
        "message": "Submit a correction request to change official attendance."
      }
    ],
    "traceId": "req_01JZ6G5W8Z7K9T6G3Q4S2P1M0N"
  }
}
```

---

## 3. Shared Zod Schemas

```ts
import { z } from 'zod';

export const UuidSchema = z.string().uuid();
export const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD.');
export const TimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm.');
export const ReasonSchema = z.string().trim().min(10).max(1000);

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
  sortBy: z
    .enum([
      'attendanceDate',
      'sessionDate',
      'batchCode',
      'courseName',
      'studentName',
      'attendancePercentage',
      'status',
      'createdAt',
      'updatedAt',
    ])
    .default('attendanceDate'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});

export const AttendanceSessionStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'RETURNED_FOR_CORRECTION',
  'CORRECTION_PENDING',
  'CORRECTED',
  'CANCELLED',
  'LOCKED',
]);

export const AttendanceRecordStatusSchema = z.enum([
  'PRESENT',
  'ABSENT',
  'LATE',
  'EXCUSED',
  'NOT_MARKED',
]);

export const AttendanceCorrectionStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);
```

---

## 4. Endpoint Inventory

| No. | Route / Server Action                                              | Method        | Purpose                                           | Permission                                                  |
| --: | ------------------------------------------------------------------ | ------------- | ------------------------------------------------- | ----------------------------------------------------------- |
|   1 | `/api/attendance/sessions`                                         | `GET`         | Search attendance sessions                        | `attendance.session.read`                                   |
|   2 | `/api/attendance/sessions`                                         | `POST`        | Create attendance session from training session   | `attendance.session.create`                                 |
|   3 | `/api/attendance/sessions/{attendanceSessionId}`                   | `GET`         | Read attendance session with roster               | `attendance.session.read`                                   |
|   4 | `/api/attendance/sessions/{attendanceSessionId}`                   | `PATCH`       | Update draft/returned attendance session metadata | `attendance.session.update`                                 |
|   5 | `/api/attendance/sessions/{attendanceSessionId}/roster-sync`       | `POST`        | Add missing roster rows from active enrollments   | `attendance.session.roster.sync`                            |
|   6 | `/api/attendance/sessions/{attendanceSessionId}/records/bulk-mark` | `POST`        | Mark multiple attendance records                  | `attendance.record.mark`                                    |
|   7 | `/api/attendance/sessions/{attendanceSessionId}/submit`            | `POST`        | Submit attendance officially                      | `attendance.session.submit`                                 |
|   8 | `/api/attendance/sessions/{attendanceSessionId}/return`            | `POST`        | Return submitted attendance for correction        | `attendance.session.return`                                 |
|   9 | `/api/attendance/sessions/{attendanceSessionId}/approve`           | `POST`        | Approve submitted attendance                      | `attendance.session.approve`                                |
|  10 | `/api/attendance/sessions/{attendanceSessionId}/cancel`            | `POST`        | Cancel attendance session                         | `attendance.session.cancel`                                 |
|  11 | `/api/attendance/sessions/{attendanceSessionId}/lock`              | `POST`        | Lock attendance session after closure             | `attendance.session.lock`                                   |
|  12 | `/api/attendance/sessions/{attendanceSessionId}/unlock`            | `POST`        | Unlock attendance session with reason             | `attendance.session.unlock`                                 |
|  13 | `/api/attendance/records/{attendanceRecordId}`                     | `GET`         | Read one attendance record                        | `attendance.record.read`                                    |
|  14 | `/api/attendance/records/{attendanceRecordId}`                     | `PATCH`       | Update one draft attendance record                | `attendance.record.update`                                  |
|  15 | `/api/attendance/corrections`                                      | `GET`         | Search correction requests                        | `attendance.correction.read`                                |
|  16 | `/api/attendance/corrections`                                      | `POST`        | Create correction request                         | `attendance.correction.create`                              |
|  17 | `/api/attendance/corrections/{correctionId}`                       | `GET`         | Read correction request                           | `attendance.correction.read`                                |
|  18 | `/api/attendance/corrections/{correctionId}/submit`                | `POST`        | Submit draft correction                           | `attendance.correction.submit`                              |
|  19 | `/api/attendance/corrections/{correctionId}/approve`               | `POST`        | Approve correction and update official record     | `attendance.correction.approve`                             |
|  20 | `/api/attendance/corrections/{correctionId}/reject`                | `POST`        | Reject correction request                         | `attendance.correction.reject`                              |
|  21 | `/api/attendance/corrections/{correctionId}/cancel`                | `POST`        | Cancel correction before approval                 | `attendance.correction.cancel`                              |
|  22 | `/api/attendance/summaries/enrollments/{enrollmentId}`             | `GET`         | Read enrollment attendance summary                | `attendance.summary.read` or `attendance.self.summary.read` |
|  23 | `/api/attendance/summaries/enrollments/{enrollmentId}/recalculate` | `POST`        | Recalculate enrollment attendance summary         | `attendance.summary.recalculate`                            |
|  24 | `/api/attendance/summaries/batches/{batchId}`                      | `GET`         | Read batch attendance summary grid                | `attendance.summary.batch.read`                             |
|  25 | `/api/attendance/alerts`                                           | `GET`         | Search low attendance alerts                      | `attendance.alert.read`                                     |
|  26 | `/api/attendance/alerts/detect`                                    | `POST`        | Run low attendance detection                      | `attendance.alert.detect`                                   |
|  27 | `/api/attendance/alerts/{alertId}/acknowledge`                     | `POST`        | Acknowledge alert                                 | `attendance.alert.acknowledge`                              |
|  28 | `/api/attendance/alert-rules`                                      | `GET`         | Search alert rules                                | `attendance.alertRule.read`                                 |
|  29 | `/api/attendance/alert-rules`                                      | `POST`        | Create alert rule                                 | `attendance.alertRule.create`                               |
|  30 | `/api/attendance/alert-rules/{ruleId}`                             | `PATCH`       | Update alert rule                                 | `attendance.alertRule.update`                               |
|  31 | `/api/attendance/alert-rules/{ruleId}/activate`                    | `POST`        | Activate alert rule                               | `attendance.alertRule.activate`                             |
|  32 | `/api/attendance/alert-rules/{ruleId}/suspend`                     | `POST`        | Suspend alert rule                                | `attendance.alertRule.suspend`                              |
|  33 | `/api/attendance/reports/session-register`                         | `GET`         | Export session register                           | `attendance.report.sessionRegister`                         |
|  34 | `/api/attendance/reports/low-attendance`                           | `GET`         | Export low attendance report                      | `attendance.report.lowAttendance`                           |
|  35 | `/api/attendance/reports/student-history`                          | `GET`         | Export student attendance history                 | `attendance.report.studentHistory`                          |
|  36 | `markAttendanceAction`                                             | Server Action | UI optimized bulk marking                         | `attendance.record.mark`                                    |
|  37 | `submitAttendanceAction`                                           | Server Action | UI optimized submit                               | `attendance.session.submit`                                 |
|  38 | `requestAttendanceCorrectionAction`                                | Server Action | UI optimized correction create                    | `attendance.correction.create`                              |
|  39 | `approveAttendanceCorrectionAction`                                | Server Action | UI optimized correction approval                  | `attendance.correction.approve`                             |
|  40 | `recalculateAttendanceSummaryAction`                               | Server Action | UI optimized summary recalculation                | `attendance.summary.recalculate`                            |

---

## 5. Common DTOs

### 5.1 Attendance Session DTO

```json
{
  "id": "4a7ebde1-9a7a-42df-a69f-228f98ef7ff7",
  "branchId": "8d983798-5a2f-4780-b546-a27674a33d0d",
  "courseId": "e0e92d6e-8cb2-4125-a97c-3c925dd2aa11",
  "batchId": "6b416d98-d8cf-4736-99c8-19a40a5de1af",
  "sessionId": "21b8a2de-7a0d-406c-a5c7-44b352fe6c20",
  "sessionNumber": 8,
  "batchCode": "HSE-MCT-2026-07-A",
  "courseName": {
    "en": "Health and Safety Training",
    "ar": "تدريب الصحة والسلامة"
  },
  "attendanceDate": "2026-07-04",
  "startTime": "09:00",
  "endTime": "12:00",
  "markedByTrainerId": "9ef0608e-a6f7-4703-8117-b37a1fa634e9",
  "status": "DRAFT",
  "recordCounts": {
    "total": 24,
    "present": 0,
    "late": 0,
    "absent": 0,
    "excused": 0,
    "notMarked": 24
  },
  "version": 1
}
```

### 5.2 Attendance Record DTO

```json
{
  "id": "9a3e80a3-7f0c-42ea-a618-eec29f39c1b8",
  "attendanceSessionId": "4a7ebde1-9a7a-42df-a69f-228f98ef7ff7",
  "enrollmentId": "fe0156e2-9c78-48a9-a03e-76b183c42f8a",
  "studentProfileId": "fb0fe846-9f39-46a5-b1e9-a4a4190ce268",
  "studentNumber": "ASTI-STU-2026-000251",
  "studentName": { "en": "Ahmed Al Balushi", "ar": "أحمد البلوشي" },
  "enrollmentNumber": "ASTI-ENR-2026-000742",
  "status": "PRESENT",
  "arrivalTime": "09:04",
  "remarks": "Arrived within grace period.",
  "markedAt": "2026-07-04T05:06:00.000Z",
  "markedBy": "941da94d-6138-4b4e-a219-d1cd5df7d1fe",
  "hasPendingCorrection": false,
  "version": 3
}
```

### 5.3 Attendance Summary DTO

```json
{
  "enrollmentId": "fe0156e2-9c78-48a9-a03e-76b183c42f8a",
  "studentNumber": "ASTI-STU-2026-000251",
  "courseName": {
    "en": "Health and Safety Training",
    "ar": "تدريب الصحة والسلامة"
  },
  "batchCode": "HSE-MCT-2026-07-A",
  "totalCountedSessions": 12,
  "presentCount": 9,
  "lateCount": 2,
  "absentCount": 1,
  "excusedCount": 0,
  "attendancePercentage": 91.67,
  "minimumRequiredPercentage": 80,
  "attendanceEligibilityStatus": "MEETS_REQUIREMENT",
  "lastCalculatedAt": "2026-07-04T09:15:00.000Z",
  "version": 14
}
```

---

## 6. Detailed Endpoint Contracts

### 6.1 `/api/attendance/sessions` GET – Search Attendance Sessions

| Item           | Contract                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Authentication | Required                                                                                                                |
| Permission     | `attendance.session.read`                                                                                               |
| Branch Scope   | Filter to active branch unless `attendance.consolidated.read` is granted; explicit `branchId` must be assigned to user. |
| Query Schema   | `SearchAttendanceSessionsQuerySchema`                                                                                   |
| Success DTO    | Paginated list of Attendance Session DTO summaries.                                                                     |

```ts
export const SearchAttendanceSessionsQuerySchema = PaginationQuerySchema.extend(
  {
    branchId: UuidSchema.optional(),
    courseId: UuidSchema.optional(),
    batchId: UuidSchema.optional(),
    trainerId: UuidSchema.optional(),
    status: AttendanceSessionStatusSchema.optional(),
    attendanceDateFrom: DateOnlySchema.optional(),
    attendanceDateTo: DateOnlySchema.optional(),
    search: z.string().trim().min(2).max(100).optional(),
  },
).superRefine((value, ctx) => {
  if (
    value.attendanceDateFrom &&
    value.attendanceDateTo &&
    value.attendanceDateFrom > value.attendanceDateTo
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['attendanceDateTo'],
      message: 'ERR_ATT_INVALID_DATE_RANGE',
    });
  }
});
```

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "4a7ebde1-9a7a-42df-a69f-228f98ef7ff7",
        "attendanceDate": "2026-07-04",
        "branchName": { "en": "Muscat Branch", "ar": "فرع مسقط" },
        "courseName": {
          "en": "Health and Safety Training",
          "ar": "تدريب الصحة والسلامة"
        },
        "batchCode": "HSE-MCT-2026-07-A",
        "sessionNumber": 8,
        "trainerName": "Salim Al Riyami",
        "status": "SUBMITTED",
        "recordCounts": {
          "total": 24,
          "present": 20,
          "late": 2,
          "absent": 1,
          "excused": 1,
          "notMarked": 0
        },
        "version": 4
      }
    ],
    "page": 1,
    "pageSize": 25,
    "totalItems": 1,
    "totalPages": 1
  },
  "meta": {
    "requestId": "req_01JZ6G5W8Z7K9T6G3Q4S2P1M0N",
    "branchId": "8d983798-5a2f-4780-b546-a27674a33d0d",
    "generatedAt": "2026-07-04T08:30:00.000Z"
  }
}
```

### 6.2 `/api/attendance/sessions` POST – Create Attendance Session

| Item           | Contract                                                          |
| -------------- | ----------------------------------------------------------------- |
| Authentication | Required                                                          |
| Permission     | `attendance.session.create`                                       |
| Branch Scope   | Source `Session -> Batch.branchId` must be in allowed branch set. |
| Request Schema | `CreateAttendanceSessionSchema`                                   |
| Success DTO    | Attendance Session DTO with initialized counts.                   |

```ts
export const CreateAttendanceSessionSchema = z.object({
  sessionId: UuidSchema,
  attendanceDate: DateOnlySchema.optional(),
  initializeRoster: z.boolean().default(true),
  defaultStatus: z.enum(['NOT_MARKED', 'ABSENT']).default('NOT_MARKED'),
  remarks: z.string().trim().max(1000).optional(),
});
```

Processing:

1. Load source `Session`, `Batch`, `Course`, `Branch`, assigned trainer, and classroom.
2. Reject cancelled, deleted, or incomplete source sessions.
3. Check active branch permission.
4. Ensure no undeleted attendance session already exists for the source `sessionId`.
5. Create `AttendanceSession` as `DRAFT`.
6. When `initializeRoster = true`, create one `AttendanceRecord` for each active enrollment in the batch with enrollment status `CONFIRMED`, `ACTIVE`, or `COMPLETED`.
7. Audit `ATTENDANCE_SESSION_CREATED`.

### 6.3 `/api/attendance/sessions/{attendanceSessionId}` GET – Read Session Detail

| Item         | Contract                                                                               |
| ------------ | -------------------------------------------------------------------------------------- |
| Permission   | `attendance.session.read`                                                              |
| Branch Scope | Parent attendance session branch must be allowed.                                      |
| Query        | `includeRecords?: boolean`, `recordStatus?: AttendanceRecordStatus`, `search?: string` |
| Success DTO  | Session header, roster, allowed actions, and correction flags.                         |

### 6.4 `/api/attendance/sessions/{attendanceSessionId}` PATCH – Update Session Metadata

```ts
export const UpdateAttendanceSessionSchema = z.object({
  remarks: z.string().trim().max(1000).nullable().optional(),
  markedByTrainerId: UuidSchema.optional(),
  expectedVersion: z.number().int().min(1),
});
```

Rules:

1. Only `DRAFT` or `RETURNED_FOR_CORRECTION` sessions can be updated.
2. `markedByTrainerId` must be assigned to the batch/session.
3. Version must match.
4. Audit old and new metadata.

### 6.5 `/api/attendance/sessions/{attendanceSessionId}/roster-sync` POST

```ts
export const RosterSyncSchema = z.object({
  defaultStatus: z.enum(['NOT_MARKED', 'ABSENT']).default('NOT_MARKED'),
  includeEnrollmentIds: z.array(UuidSchema).max(500).optional(),
  reason: ReasonSchema,
  expectedVersion: z.number().int().min(1),
});
```

Rules:

1. Allowed only in `DRAFT` or `RETURNED_FOR_CORRECTION`.
2. Add records only for eligible active enrollments in the same batch.
3. Never duplicate an attendance record for the same attendance session and enrollment.
4. Audit `ATTENDANCE_ROSTER_SYNCED`.

### 6.6 `/api/attendance/sessions/{attendanceSessionId}/records/bulk-mark` POST

```ts
export const AttendanceRecordMarkSchema = z
  .object({
    attendanceRecordId: UuidSchema,
    status: AttendanceRecordStatusSchema,
    arrivalTime: TimeSchema.nullable().optional(),
    remarks: z.string().trim().max(500).nullable().optional(),
    excuseReasonCode: z.string().trim().min(2).max(50).nullable().optional(),
    expectedVersion: z.number().int().min(1),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'LATE' && !value.arrivalTime)
      ctx.addIssue({
        code: 'custom',
        path: ['arrivalTime'],
        message: 'ERR_ATT_LATE_TIME_REQUIRED',
      });
    if (value.status === 'EXCUSED' && !value.excuseReasonCode)
      ctx.addIssue({
        code: 'custom',
        path: ['excuseReasonCode'],
        message: 'ERR_ATT_EXCUSE_REASON_REQUIRED',
      });
  });

export const BulkMarkAttendanceSchema = z.object({
  marks: z.array(AttendanceRecordMarkSchema).min(1).max(300),
  markAllRemainingAbsent: z.boolean().default(false),
  bulkRemarks: z.string().trim().max(1000).optional(),
});
```

Rules:

1. Parent session must be `DRAFT` or `RETURNED_FOR_CORRECTION`.
2. Every record must belong to the path attendance session.
3. Payload must not contain duplicate record IDs.
4. `LATE` requires arrival time; `EXCUSED` requires reason.
5. Apply all updates in one transaction.
6. Recalculate session counts and audit changed records.

### 6.7 `/api/attendance/sessions/{attendanceSessionId}/submit` POST

```ts
export const SubmitAttendanceSessionSchema = z.object({
  expectedVersion: z.number().int().min(1),
  submissionNote: z.string().trim().max(1000).optional(),
  allowNotMarkedOverride: z.boolean().default(false),
  notMarkedOverrideReason: z.string().trim().min(10).max(1000).optional(),
});
```

Rules:

1. Session must be `DRAFT` or `RETURNED_FOR_CORRECTION`.
2. Roster must not be empty.
3. `NOT_MARKED` records block submission unless user has `attendance.session.submitWithUnmarked` and provides reason.
4. Set status to `SUBMITTED`.
5. Recalculate affected enrollment summaries.
6. Detect low attendance alerts.
7. Audit `ATTENDANCE_SESSION_SUBMITTED`.

### 6.8 Session Approval, Return, Cancel, Lock, Unlock Endpoints

| Route      | Request Schema                                                               | Main Rules                                                                                     | Success Status                   |
| ---------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------- |
| `/return`  | `{ reason: ReasonSchema, expectedVersion: number }`                          | Only `SUBMITTED` can be returned. Reason required. Audit required.                             | `RETURNED_FOR_CORRECTION`        |
| `/approve` | `{ approvalNote?: string, expectedVersion: number }`                         | Only `SUBMITTED` can be approved. Self-approval blocked when policy enabled.                   | `APPROVED`                       |
| `/cancel`  | `{ reason: ReasonSchema, cancelRecords?: boolean, expectedVersion: number }` | Not allowed for `LOCKED` without unlock. Cancelled sessions excluded from summary denominator. | `CANCELLED`                      |
| `/lock`    | `{ reason: ReasonSchema, expectedVersion: number }`                          | Only official sessions can be locked; no pending corrections allowed.                          | `LOCKED`                         |
| `/unlock`  | `{ reason: ReasonSchema, expectedVersion: number }`                          | Only locked sessions can be unlocked; high privilege only.                                     | Last official status before lock |

### 6.9 Correction Endpoints

```ts
export const CreateAttendanceCorrectionSchema = z.object({
  attendanceRecordId: UuidSchema,
  newStatus: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
  arrivalTime: TimeSchema.nullable().optional(),
  reason: ReasonSchema,
  supportingDocumentId: UuidSchema.nullable().optional(),
  submitImmediately: z.boolean().default(true),
  expectedRecordVersion: z.number().int().min(1),
});

export const ApproveAttendanceCorrectionSchema = z.object({
  expectedVersion: z.number().int().min(1),
  expectedRecordVersion: z.number().int().min(1),
  approvalRemarks: z.string().trim().max(1000).optional(),
});

export const RejectAttendanceCorrectionSchema = z.object({
  rejectionReason: ReasonSchema,
  expectedVersion: z.number().int().min(1),
});
```

Rules:

1. Corrections are allowed only for `SUBMITTED`, `APPROVED`, `CORRECTION_PENDING`, or `CORRECTED` sessions.
2. Corrections are blocked for `DRAFT`, `RETURNED_FOR_CORRECTION`, `CANCELLED`, and `LOCKED` sessions.
3. New status must differ from current official status.
4. Only one unresolved correction is allowed per attendance record.
5. Approval updates the official record, recalculates summary, evaluates alerts, and audits changes in one transaction.
6. Rejection does not change official attendance.

### 6.10 Summary Endpoints

```ts
export const RecalculateEnrollmentAttendanceSummarySchema = z.object({
  reason: ReasonSchema,
  force: z.boolean().default(false),
});
```

Calculation:

```text
eligibleRecords =
  record.enrollmentId = target enrollment
  AND record.isDeleted = false
  AND attendanceSession.isDeleted = false
  AND attendanceSession.status IN (SUBMITTED, APPROVED, CORRECTED, LOCKED)
  AND attendanceSession.status != CANCELLED

totalCountedSessions = count(eligibleRecords)
presentCount = count(PRESENT)
lateCount = count(LATE)
absentCount = count(ABSENT)
excusedCount = count(EXCUSED)
attendedSessions = presentCount + lateCount
attendancePercentage = 0.00 when totalCountedSessions = 0
attendancePercentage = round((attendedSessions / totalCountedSessions) * 100, 2) otherwise
```

### 6.11 Alert and Alert Rule Endpoints

```ts
export const DetectAttendanceAlertsSchema = z.object({
  branchId: UuidSchema.optional(),
  batchId: UuidSchema.optional(),
  courseId: UuidSchema.optional(),
  enrollmentIds: z.array(UuidSchema).max(1000).optional(),
  attendanceDateFrom: DateOnlySchema.optional(),
  attendanceDateTo: DateOnlySchema.optional(),
  createNotifications: z.boolean().default(true),
  reason: z
    .string()
    .trim()
    .min(5)
    .max(500)
    .default('Manual low attendance detection run'),
});

export const CreateAttendanceAlertRuleSchema = z.object({
  ruleName: z.string().trim().min(3).max(150),
  branchId: UuidSchema.nullable().optional(),
  courseId: UuidSchema.nullable().optional(),
  batchId: UuidSchema.nullable().optional(),
  thresholdPercentage: z.coerce.number().min(1).max(100),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
  notifyStudent: z.boolean().default(true),
  notifyTrainer: z.boolean().default(true),
  notifyBranchAdmin: z.boolean().default(true),
  effectiveStartDate: DateOnlySchema,
  effectiveEndDate: DateOnlySchema.nullable().optional(),
  status: z.enum(['DRAFT', 'ACTIVE']).default('DRAFT'),
});
```

Rules:

1. Alert detection requires at least one scope.
2. Rule priority is batch > course > branch > global.
3. Active rules cannot overlap at the same specificity and effective date range.
4. Duplicate open alerts for the same enrollment and rule are suppressed.
5. Acknowledgement requires action taken text.

### 6.12 Report Endpoints

| Route                                      | Query Schema                                                                                    | Output                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `/api/attendance/reports/session-register` | `attendanceSessionId` or `batchId + dateFrom + dateTo`, `format=json/csv/pdf`, `language=en/ar` | Session register with roster statuses, counts, and signature-ready metadata.           |
| `/api/attendance/reports/low-attendance`   | `branchId`, `courseId`, `batchId`, `thresholdPercentage`, `status`, `format`, `language`        | Low attendance report with student, course, batch, percentage, threshold, alert state. |
| `/api/attendance/reports/student-history`  | `studentProfileId` or `enrollmentId`, optional date range, `format`, `language`                 | Student attendance history and summary.                                                |

Reports must enforce report permissions, branch scoping, and student/corporate self-scope rules.

---

## 7. Error Response Catalog

| HTTP | Code                                        | Meaning                                                                    |
| ---: | ------------------------------------------- | -------------------------------------------------------------------------- |
|  400 | `ERR_ATT_BRANCH_CONTEXT_REQUIRED`           | Active branch context is required.                                         |
|  400 | `ERR_ATT_INVALID_DATE_RANGE`                | Date range is invalid.                                                     |
|  400 | `ERR_ATT_INVALID_ATTENDANCE_DATE`           | Attendance date does not match source session and override is not allowed. |
|  400 | `ERR_ATT_SESSION_ALREADY_EXISTS`            | Attendance session already exists for the source session.                  |
|  400 | `ERR_ATT_SESSION_EMPTY_ROSTER`              | No eligible roster records exist.                                          |
|  400 | `ERR_ATT_SESSION_NOT_EDITABLE`              | Session cannot be edited in current state.                                 |
|  400 | `ERR_ATT_SESSION_NOT_SUBMITTABLE`           | Session cannot be submitted in current state.                              |
|  400 | `ERR_ATT_SESSION_NOT_APPROVABLE`            | Session cannot be approved in current state.                               |
|  400 | `ERR_ATT_SESSION_NOT_RETURNABLE`            | Session cannot be returned in current state.                               |
|  400 | `ERR_ATT_SESSION_NOT_CANCELLABLE`           | Session cannot be cancelled in current state.                              |
|  400 | `ERR_ATT_SESSION_NOT_LOCKABLE`              | Session cannot be locked in current state.                                 |
|  400 | `ERR_ATT_SESSION_NOT_LOCKED`                | Session is not locked.                                                     |
|  400 | `ERR_ATT_RECORD_LOCKED`                     | Official record cannot be edited directly.                                 |
|  400 | `ERR_ATT_UNMARKED_RECORDS_EXIST`            | Submission blocked by unmarked records.                                    |
|  400 | `ERR_ATT_LATE_TIME_REQUIRED`                | Late status requires arrival time.                                         |
|  400 | `ERR_ATT_EXCUSE_REASON_REQUIRED`            | Excused status requires reason.                                            |
|  400 | `ERR_ATT_CORRECTION_NOT_ALLOWED_FOR_STATUS` | Correction not allowed for parent session status.                          |
|  400 | `ERR_ATT_CORRECTION_NO_STATUS_CHANGE`       | Correction must change status.                                             |
|  400 | `ERR_ATT_ALERT_SCOPE_REQUIRED`              | Alert detection scope is required.                                         |
|  400 | `ERR_ATT_ALERT_RULE_OVERLAP`                | Alert rule overlaps an active rule.                                        |
|  401 | `ERR_AUTH_REQUIRED`                         | Authentication is missing or expired.                                      |
|  403 | `ERR_ATT_PERMISSION_DENIED`                 | Required permission missing.                                               |
|  403 | `ERR_ATT_BRANCH_SCOPE_DENIED`               | Requested branch is outside allowed scope.                                 |
|  403 | `ERR_ATT_TRAINER_NOT_ASSIGNED_TO_SESSION`   | Trainer is not assigned to session.                                        |
|  403 | `ERR_ATT_STUDENT_RECORD_SCOPE_DENIED`       | Student attempted to access another student's record.                      |
|  403 | `ERR_ATT_SELF_APPROVAL_BLOCKED`             | User cannot approve own correction.                                        |
|  404 | `ERR_ATT_SESSION_NOT_FOUND`                 | Attendance session not found.                                              |
|  404 | `ERR_ATT_RECORD_NOT_FOUND`                  | Attendance record not found.                                               |
|  404 | `ERR_ATT_CORRECTION_NOT_FOUND`              | Correction request not found.                                              |
|  404 | `ERR_ATT_BATCH_NOT_FOUND`                   | Batch not found or outside scope.                                          |
|  404 | `ERR_ATT_ENROLLMENT_NOT_FOUND`              | Enrollment not found or outside scope.                                     |
|  409 | `ERR_ATT_CONCURRENT_MODIFICATION`           | Optimistic lock version mismatch.                                          |
|  409 | `ERR_ATT_CORRECTION_PENDING_EXISTS`         | Pending correction already exists.                                         |
|  422 | `ERR_ATT_RECORD_SESSION_MISMATCH`           | Record does not belong to path session.                                    |
|  422 | `ERR_ATT_INVALID_THRESHOLD`                 | Threshold must be between 1 and 100.                                       |
|  422 | `ERR_ATT_REASON_REQUIRED`                   | Reason is required and must have at least 10 characters.                   |
|  500 | `ERR_ATT_AUDIT_WRITE_FAILED`                | Audit write failed for sensitive mutation.                                 |

---

## 8. Server Action Contracts

| Server Action                        | Input                                                           | Behavior                                                                                          | Returned DTO                                |
| ------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `markAttendanceAction`               | `attendanceSessionId` + `BulkMarkAttendanceSchema`              | Calls `AttendanceApplicationService.bulkMarkRecords`, revalidates session and summary cache tags. | Updated counts and updated record IDs.      |
| `submitAttendanceAction`             | `attendanceSessionId` + `SubmitAttendanceSessionSchema`         | Calls `submitSession`, recalculates summaries, detects alerts.                                    | Submitted session status and summary count. |
| `requestAttendanceCorrectionAction`  | `CreateAttendanceCorrectionSchema`                              | Creates correction and optionally submits immediately.                                            | Correction DTO.                             |
| `approveAttendanceCorrectionAction`  | `correctionId` + `ApproveAttendanceCorrectionSchema`            | Applies approved correction and recalculates summary.                                             | Corrected record and updated summary.       |
| `recalculateAttendanceSummaryAction` | `enrollmentId` + `RecalculateEnrollmentAttendanceSummarySchema` | Rebuilds summary from official records.                                                           | Enrollment Attendance Summary DTO.          |

---

## 9. Cache Revalidation Rules

| Mutation           | Cache Tags                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Create session     | `attendance:sessions:{branchId}`, `attendance:session:{attendanceSessionId}`, `batch:{batchId}:attendance`                       |
| Bulk mark          | `attendance:session:{attendanceSessionId}`, `attendance:summary:batch:{batchId}`, `attendance:summary:enrollment:{enrollmentId}` |
| Submit             | Bulk mark tags + `attendance:alerts:{branchId}`, `completion:eligibility:{enrollmentId}`                                         |
| Approve correction | Submit tags + `attendance:corrections:{branchId}`                                                                                |
| Alert rule change  | `attendance:alertRules:{branchId}`, `attendance:alerts:{branchId}`                                                               |
| Acknowledge alert  | `attendance:alerts:{branchId}`, `attendance:alert:{alertId}`                                                                     |

---

## 10. API Acceptance Criteria

1. All endpoints reject unauthenticated requests with `401 ERR_AUTH_REQUIRED`.
2. All endpoints reject missing permissions with `403 ERR_ATT_PERMISSION_DENIED`.
3. Branch scoping is enforced server-side and cannot be bypassed by query parameters.
4. Trainer operations are restricted to assigned sessions or batches.
5. Student operations are restricted to own attendance data.
6. Official attendance changes only through correction approval.
7. Summary recalculation is deterministic and auditable.
8. Every sensitive action writes audit data with old value, new value, actor, timestamp, branch, IP address, and reason where applicable.
