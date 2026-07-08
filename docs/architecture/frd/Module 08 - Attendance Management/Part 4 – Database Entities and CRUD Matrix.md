# Part 4 – Database Entities and CRUD Matrix

## Module 08 – Attendance Management

| Attribute          | Value                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Product            | ASTI Integrated Institute Management System (IMS)                                                             |
| Module             | Module 08 – Attendance Management                                                                             |
| Module Code        | M08-ATT                                                                                                       |
| Bounded Context    | Attendance Management                                                                                         |
| Primary Package    | `packages/attendance`                                                                                         |
| Application Scope  | Admin Portal Phase 1; Trainer Portal and Student Portal read-only views where applicable                      |
| Architecture Style | Next.js TypeScript modular monolith                                                                           |
| Database           | PostgreSQL                                                                                                    |
| ORM                | Prisma                                                                                                        |
| Timezone Rule      | Store timestamps in UTC; render business dates/times in Oman GST UTC+4                                        |
| Deletion Rule      | Soft delete only; no hard delete from application services                                                    |
| Branch Rule        | Every operational attendance query must be server-scoped by `branchId` derived from authenticated user access |

---

## 1. Database Ownership Boundary

Attendance Management owns the persistence of attendance participation evidence, attendance submission lifecycle, correction workflows, low-attendance alerting, and enrollment-level attendance summary records used by downstream completion evaluation.

The Attendance context **does not own** the following records, but references them by foreign key:

| Referenced Entity     | Owning Context                            | Attendance Usage                                                                                         |
| --------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Branch`              | Organization Management                   | Server-side branch isolation and reporting scope.                                                        |
| `Course`              | Course Catalog Management                 | Display, filtering, completion threshold interpretation, and reporting.                                  |
| `Batch`               | Training Delivery Management              | Attendance is captured against sessions in a batch.                                                      |
| `Session`             | Training Delivery / Scheduling Management | Source event for each `AttendanceSession`.                                                               |
| `Enrollment`          | Admission & Enrollment Management         | Central aggregate for the learner lifecycle. Attendance must attach to enrollment.                       |
| `StudentProfile`      | Admission & Enrollment Management         | Student display identity and roster participant reference.                                               |
| `TrainerProfile`      | Faculty / Trainer Management              | Trainer who marks or owns the session.                                                                   |
| `User`                | Identity & Access Management              | User identity for audit fields, approvals, corrections, and permissions.                                 |
| `LookupValue`         | Configuration / Master Data               | Optional configured reason/status labels. Attendance domain still enforces allowed internal enum values. |
| `AuditLog`            | Audit & Compliance                        | Sensitive and state-changing attendance operations produce audit records.                                |
| `NotificationRequest` | Communication & Notification Management   | Optional alert dispatch in Phase 2. Attendance owns alert detection, not message delivery.               |

---

## 2. Naming and Conventions

### 2.1 Table Naming

| Concept                        | Database Table                    | Prisma Model                  |
| ------------------------------ | --------------------------------- | ----------------------------- |
| Attendance session header      | `attendance_sessions`             | `AttendanceSession`           |
| Attendance record line         | `attendance_records`              | `AttendanceRecord`            |
| Attendance correction workflow | `attendance_corrections`          | `AttendanceCorrection`        |
| Attendance alert rule          | `attendance_alert_rules`          | `AttendanceAlertRule`         |
| Attendance alert instance      | `attendance_alerts`               | `AttendanceAlert`             |
| Enrollment attendance summary  | `enrollment_attendance_summaries` | `EnrollmentAttendanceSummary` |

### 2.2 Common Transaction Columns

Every Attendance-owned transactional table must include:

| Field        | PostgreSQL Type  | Prisma Type                    | Nullability | Rule                                                                      |
| ------------ | ---------------- | ------------------------------ | ----------- | ------------------------------------------------------------------------- |
| `id`         | `uuid`           | `String @db.Uuid`              | Not null    | Primary key generated by application using UUID v7 or database-safe UUID. |
| `created_at` | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | Not null    | Set once at create time.                                                  |
| `created_by` | `uuid`           | `String @db.Uuid`              | Not null    | FK to `users.id`; set from authenticated user or system user.             |
| `updated_at` | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | Not null    | Updated on each mutation.                                                 |
| `updated_by` | `uuid`           | `String @db.Uuid`              | Not null    | FK to `users.id`; set from authenticated user or system user.             |
| `deleted_at` | `timestamptz(3)` | `DateTime? @db.Timestamptz(3)` | Nullable    | Set only during soft delete.                                              |
| `deleted_by` | `uuid`           | `String? @db.Uuid`             | Nullable    | FK to `users.id`; required when `deleted_at` is set.                      |
| `is_deleted` | `boolean`        | `Boolean`                      | Not null    | Defaults to `false`; all application queries must filter `false`.         |
| `version`    | `integer`        | `Int`                          | Not null    | Defaults to `1`; incremented on every update for optimistic locking.      |

### 2.3 Status and Enum Storage

Status fields are stored as PostgreSQL enum types and Prisma enums where the values are domain-critical. Reason codes and display labels may reference `lookup_values` where business wants configurable bilingual labels.

---

## 3. Domain Enums

### 3.1 `AttendanceSessionStatus`

| Value                     | Meaning                                                                                 |                  Mutable Records Allowed | Completion Impact                                                |
| ------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------: | ---------------------------------------------------------------- |
| `DRAFT`                   | Attendance session initialized and not submitted.                                       |                                      Yes | No downstream completion calculation.                            |
| `SUBMITTED`               | Trainer or coordinator submitted attendance for official use.                           |    No direct edits; correction required. | Included in attendance percentage.                               |
| `APPROVED`                | Optional academic approval completed where branch policy requires approval.             |    No direct edits; correction required. | Included in attendance percentage.                               |
| `RETURNED_FOR_CORRECTION` | Reviewer returned session before approval.                                              |    Yes, by assigned trainer/coordinator. | Not final until resubmitted.                                     |
| `CORRECTION_PENDING`      | One or more correction requests are pending.                                            | Existing official records remain locked. | Current official values remain active until correction approval. |
| `CORRECTED`               | At least one approved correction has been applied after submission.                     |    No direct edits; correction required. | Included using corrected values.                                 |
| `CANCELLED`               | Attendance session cancelled because the training session was cancelled or invalidated. |                                       No | Excluded from attendance percentage denominator.                 |
| `LOCKED`                  | Attendance is administratively locked after period closure.                             |                                       No | Included if previously submitted, approved, or corrected.        |

### 3.2 `AttendanceRecordStatus`

| Value        | Meaning                                                     |                                                                                                                 Percentage Numerator Rule |
| ------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------: |
| `PRESENT`    | Learner attended the session.                               |                                                                                                                       Counts as attended. |
| `ABSENT`     | Learner did not attend and has no approved excuse.          |                                                                                                               Does not count as attended. |
| `LATE`       | Learner attended after the allowed start time grace window. |                                                             Counts as attended by default; configurable reports may show late separately. |
| `EXCUSED`    | Learner absence is accepted with a reason.                  | Does not count as attended for certificate eligibility unless branch policy explicitly treats excused as attended for internal reporting. |
| `NOT_MARKED` | Roster row generated but no final attendance mark exists.   |                                                             Blocks submission unless user has override permission and reason is captured. |

### 3.3 `AttendanceCorrectionStatus`

| Value       | Meaning                                                     |
| ----------- | ----------------------------------------------------------- |
| `DRAFT`     | Correction created but not submitted for approval.          |
| `SUBMITTED` | Correction request submitted.                               |
| `APPROVED`  | Correction accepted and official attendance record updated. |
| `REJECTED`  | Correction rejected; official attendance remains unchanged. |
| `CANCELLED` | Request cancelled by requester before approval.             |

### 3.4 `AttendanceAlertRuleStatus`

| Value       | Meaning                                                                              |
| ----------- | ------------------------------------------------------------------------------------ |
| `DRAFT`     | Rule is being configured and is not evaluated.                                       |
| `ACTIVE`    | Rule is evaluated during summary recalculation and scheduled/manual alert detection. |
| `SUSPENDED` | Rule is temporarily disabled without deletion.                                       |
| `EXPIRED`   | Rule effective end date has passed.                                                  |
| `ARCHIVED`  | Rule is retired and hidden from active configuration lists.                          |

### 3.5 `AttendanceAlertStatus`

| Value          | Meaning                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| `OPEN`         | Low-attendance condition detected and not acknowledged.                 |
| `ACKNOWLEDGED` | Responsible user has seen or acknowledged the alert.                    |
| `IN_PROGRESS`  | Follow-up is being handled.                                             |
| `RESOLVED`     | Issue has been resolved or no longer applies.                           |
| `DISMISSED`    | Alert dismissed with a mandatory reason.                                |
| `SUPERSEDED`   | A newer alert replaced the previous alert for the same enrollment/rule. |

### 3.6 `AttendanceSummaryStatus`

| Value           | Meaning                                                                                 |
| --------------- | --------------------------------------------------------------------------------------- |
| `CURRENT`       | Summary reflects latest official attendance records.                                    |
| `STALE`         | Source attendance records changed and recalculation is required.                        |
| `RECALCULATING` | Summary recalculation is running in the current request or job.                         |
| `LOCKED`        | Summary is locked because completion is approved or certificate issuance is in process. |

---

## 4. Entity Specifications

## 4.1 `attendance_sessions`

### 4.1.1 Purpose

`attendance_sessions` is the Attendance context header record for marking participation against one scheduled training session. It ensures that each scheduled `Session` has at most one active attendance sheet per attendance date and branch.

### 4.1.2 Field Specification

| Field Name             | PostgreSQL Type             | Prisma Equivalent                        | Null | Key   | Default   | Description / Validation                                                                                   |
| ---------------------- | --------------------------- | ---------------------------------------- | ---: | ----- | --------- | ---------------------------------------------------------------------------------------------------------- |
| `id`                   | `uuid`                      | `String @id @db.Uuid`                    |   No | PK    | Generated | Unique attendance session ID.                                                                              |
| `branch_id`            | `uuid`                      | `String @db.Uuid`                        |   No | FK    | None      | FK to `branches.id`; copied from batch/session branch for branch isolation.                                |
| `course_id`            | `uuid`                      | `String @db.Uuid`                        |   No | FK    | None      | FK to `courses.id`; denormalized for filtering/reporting. Must match batch course.                         |
| `batch_id`             | `uuid`                      | `String @db.Uuid`                        |   No | FK    | None      | FK to `batches.id`; attendance is always batch-bound.                                                      |
| `session_id`           | `uuid`                      | `String @db.Uuid`                        |   No | FK    | None      | FK to `sessions.id`; one active attendance session per scheduled session.                                  |
| `attendance_date`      | `date`                      | `DateTime @db.Date`                      |   No | Index | None      | Business date of attendance in Oman GST. Must equal session date unless admin override permission is used. |
| `scheduled_start_time` | `time(0)`                   | `DateTime @db.Time(0)`                   |   No | None  | Copied    | Copied from session start time to preserve historical attendance context.                                  |
| `scheduled_end_time`   | `time(0)`                   | `DateTime @db.Time(0)`                   |   No | None  | Copied    | Copied from session end time. Must be after start time.                                                    |
| `marked_by_trainer_id` | `uuid`                      | `String? @db.Uuid`                       |  Yes | FK    | Null      | FK to `trainer_profiles.id`; set when trainer marks or submits.                                            |
| `submitted_by_user_id` | `uuid`                      | `String? @db.Uuid`                       |  Yes | FK    | Null      | FK to `users.id`; set at submission.                                                                       |
| `submitted_at`         | `timestamptz(3)`            | `DateTime? @db.Timestamptz(3)`           |  Yes | None  | Null      | Set once when status moves to `SUBMITTED`; must be after `created_at`.                                     |
| `approved_by_user_id`  | `uuid`                      | `String? @db.Uuid`                       |  Yes | FK    | Null      | FK to `users.id`; optional if branch requires approval.                                                    |
| `approved_at`          | `timestamptz(3)`            | `DateTime? @db.Timestamptz(3)`           |  Yes | None  | Null      | Required when status is `APPROVED`.                                                                        |
| `status`               | `attendance_session_status` | `AttendanceSessionStatus`                |   No | Index | `DRAFT`   | Current lifecycle status.                                                                                  |
| `total_roster_count`   | `integer`                   | `Int`                                    |   No | None  | `0`       | Count of active attendance records included in roster. Must be >= 0.                                       |
| `present_count`        | `integer`                   | `Int`                                    |   No | None  | `0`       | Official count of `PRESENT` records. Must be >= 0.                                                         |
| `absent_count`         | `integer`                   | `Int`                                    |   No | None  | `0`       | Official count of `ABSENT` records. Must be >= 0.                                                          |
| `late_count`           | `integer`                   | `Int`                                    |   No | None  | `0`       | Official count of `LATE` records. Must be >= 0.                                                            |
| `excused_count`        | `integer`                   | `Int`                                    |   No | None  | `0`       | Official count of `EXCUSED` records. Must be >= 0.                                                         |
| `not_marked_count`     | `integer`                   | `Int`                                    |   No | None  | `0`       | Count of `NOT_MARKED` records. Must be zero for normal submission.                                         |
| `is_locked`            | `boolean`                   | `Boolean`                                |   No | None  | `false`   | True when status is `LOCKED` or period is closed.                                                          |
| `lock_reason`          | `varchar(300)`              | `String? @db.VarChar(300)`               |  Yes | None  | Null      | Mandatory when manually locking.                                                                           |
| `remarks`              | `varchar(1000)`             | `String? @db.VarChar(1000)`              |  Yes | None  | Null      | Optional operational notes; must not contain HTML.                                                         |
| `created_at`           | `timestamptz(3)`            | `DateTime @db.Timestamptz(3)`            |   No | None  | `now()`   | Audit create timestamp.                                                                                    |
| `created_by`           | `uuid`                      | `String @db.Uuid`                        |   No | FK    | None      | FK to `users.id`.                                                                                          |
| `updated_at`           | `timestamptz(3)`            | `DateTime @updatedAt @db.Timestamptz(3)` |   No | None  | `now()`   | Audit update timestamp.                                                                                    |
| `updated_by`           | `uuid`                      | `String @db.Uuid`                        |   No | FK    | None      | FK to `users.id`.                                                                                          |
| `deleted_at`           | `timestamptz(3)`            | `DateTime? @db.Timestamptz(3)`           |  Yes | None  | Null      | Soft delete timestamp.                                                                                     |
| `deleted_by`           | `uuid`                      | `String? @db.Uuid`                       |  Yes | FK    | Null      | FK to `users.id`. Required if deleted.                                                                     |
| `is_deleted`           | `boolean`                   | `Boolean`                                |   No | Index | `false`   | Soft delete flag.                                                                                          |
| `version`              | `integer`                   | `Int`                                    |   No | None  | `1`       | Optimistic locking version.                                                                                |

### 4.1.3 Indexes and Constraints

| Name                               | Type           | Columns / Expression                                                                              | Rule                                                                               |
| ---------------------------------- | -------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `pk_attendance_sessions`           | Primary key    | `id`                                                                                              | Unique row identity.                                                               |
| `uq_att_sess_active_session_date`  | Partial unique | `(session_id, attendance_date) WHERE is_deleted = false`                                          | Prevents duplicate active attendance sessions for the same scheduled session/date. |
| `idx_att_sess_branch_date`         | B-tree         | `(branch_id, attendance_date)`                                                                    | Required for branch-scoped list screens.                                           |
| `idx_att_sess_batch_date`          | B-tree         | `(batch_id, attendance_date)`                                                                     | Required for batch attendance history.                                             |
| `idx_att_sess_course_status`       | B-tree         | `(course_id, status)`                                                                             | Required for course attendance dashboards.                                         |
| `idx_att_sess_trainer_date`        | B-tree         | `(marked_by_trainer_id, attendance_date)`                                                         | Required for trainer workload views.                                               |
| `idx_att_sess_status_date`         | B-tree         | `(status, attendance_date)`                                                                       | Required for pending submission/approval queues.                                   |
| `chk_att_sess_counts_non_negative` | Check          | All count columns `>= 0`                                                                          | Prevents invalid rollup counts.                                                    |
| `chk_att_sess_time_order`          | Check          | `scheduled_end_time > scheduled_start_time`                                                       | Prevents invalid session duration.                                                 |
| `chk_att_sess_approval_fields`     | Check          | `status <> 'APPROVED' OR (approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL)`           | Approved sessions must identify approver.                                          |
| `chk_att_sess_submit_fields`       | Check          | `status NOT IN ('SUBMITTED','APPROVED','CORRECTED','LOCKED') OR submitted_by_user_id IS NOT NULL` | Official sessions must identify submitter.                                         |
| `chk_att_sess_delete_fields`       | Check          | `is_deleted = false OR deleted_at IS NOT NULL`                                                    | Soft delete timestamp required.                                                    |

### 4.1.4 Foreign Keys

| FK Name                      | Column                 | References             | On Delete  | On Update | Reason                                                           |
| ---------------------------- | ---------------------- | ---------------------- | ---------- | --------- | ---------------------------------------------------------------- |
| `fk_att_sess_branch`         | `branch_id`            | `branches(id)`         | `RESTRICT` | `CASCADE` | Branch cannot be removed if attendance exists.                   |
| `fk_att_sess_course`         | `course_id`            | `courses(id)`          | `RESTRICT` | `CASCADE` | Course history must remain intact.                               |
| `fk_att_sess_batch`          | `batch_id`             | `batches(id)`          | `RESTRICT` | `CASCADE` | Batch history must remain intact.                                |
| `fk_att_sess_session`        | `session_id`           | `sessions(id)`         | `RESTRICT` | `CASCADE` | Scheduled session cannot be hard-deleted when attendance exists. |
| `fk_att_sess_marked_trainer` | `marked_by_trainer_id` | `trainer_profiles(id)` | `SET NULL` | `CASCADE` | Preserve attendance if trainer profile is deactivated.           |
| `fk_att_sess_submitted_by`   | `submitted_by_user_id` | `users(id)`            | `RESTRICT` | `CASCADE` | Submission audit must remain traceable.                          |
| `fk_att_sess_approved_by`    | `approved_by_user_id`  | `users(id)`            | `RESTRICT` | `CASCADE` | Approval audit must remain traceable.                            |
| `fk_att_sess_created_by`     | `created_by`           | `users(id)`            | `RESTRICT` | `CASCADE` | Audit identity required.                                         |
| `fk_att_sess_updated_by`     | `updated_by`           | `users(id)`            | `RESTRICT` | `CASCADE` | Audit identity required.                                         |
| `fk_att_sess_deleted_by`     | `deleted_by`           | `users(id)`            | `RESTRICT` | `CASCADE` | Deletion audit identity required.                                |

---

## 4.2 `attendance_records`

### 4.2.1 Purpose

`attendance_records` stores one learner attendance decision for one `AttendanceSession` and one `Enrollment`. It is the authoritative row-level attendance evidence used for summaries, low-attendance alerts, completion evaluation, corporate attendance reports, and audit review.

### 4.2.2 Field Specification

| Field Name              | PostgreSQL Type            | Prisma Equivalent                        | Null | Key   | Default      | Description / Validation                                                                                                              |
| ----------------------- | -------------------------- | ---------------------------------------- | ---: | ----- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                    | `uuid`                     | `String @id @db.Uuid`                    |   No | PK    | Generated    | Unique attendance record ID.                                                                                                          |
| `attendance_session_id` | `uuid`                     | `String @db.Uuid`                        |   No | FK    | None         | FK to `attendance_sessions.id`.                                                                                                       |
| `branch_id`             | `uuid`                     | `String @db.Uuid`                        |   No | FK    | Copied       | Copied from attendance session for branch isolation.                                                                                  |
| `course_id`             | `uuid`                     | `String @db.Uuid`                        |   No | FK    | Copied       | Copied from attendance session.                                                                                                       |
| `batch_id`              | `uuid`                     | `String @db.Uuid`                        |   No | FK    | Copied       | Copied from attendance session.                                                                                                       |
| `session_id`            | `uuid`                     | `String @db.Uuid`                        |   No | FK    | Copied       | Copied from attendance session.                                                                                                       |
| `enrollment_id`         | `uuid`                     | `String @db.Uuid`                        |   No | FK    | None         | FK to `enrollments.id`; central learning lifecycle reference.                                                                         |
| `student_profile_id`    | `uuid`                     | `String @db.Uuid`                        |   No | FK    | None         | FK to `student_profiles.id`; must match enrollment.                                                                                   |
| `status`                | `attendance_record_status` | `AttendanceRecordStatus`                 |   No | Index | `NOT_MARKED` | Learner attendance mark.                                                                                                              |
| `late_minutes`          | `integer`                  | `Int?`                                   |  Yes | None  | Null         | Required for `LATE`; must be `1..sessionDurationMinutes`. Null for other statuses.                                                    |
| `excuse_reason_code`    | `varchar(80)`              | `String? @db.VarChar(80)`                |  Yes | None  | Null         | Required for `EXCUSED`; references configured reason code when configured.                                                            |
| `excuse_document_id`    | `uuid`                     | `String? @db.Uuid`                       |  Yes | FK    | Null         | Optional FK to `documents.id` for supporting evidence.                                                                                |
| `remarks`               | `varchar(1000)`            | `String? @db.VarChar(1000)`              |  Yes | None  | Null         | Optional note; mandatory when overriding validation rules.                                                                            |
| `marked_at`             | `timestamptz(3)`           | `DateTime? @db.Timestamptz(3)`           |  Yes | Index | Null         | Set when status changes from `NOT_MARKED` to a real status.                                                                           |
| `marked_by`             | `uuid`                     | `String? @db.Uuid`                       |  Yes | FK    | Null         | FK to `users.id`; required when status is not `NOT_MARKED`.                                                                           |
| `is_official`           | `boolean`                  | `Boolean`                                |   No | Index | `false`      | True after attendance session is submitted, approved, corrected, or locked.                                                           |
| `officialized_at`       | `timestamptz(3)`           | `DateTime? @db.Timestamptz(3)`           |  Yes | None  | Null         | Timestamp when record first became official.                                                                                          |
| `officialized_by`       | `uuid`                     | `String? @db.Uuid`                       |  Yes | FK    | Null         | FK to `users.id`; submitter/approver/system user.                                                                                     |
| `last_correction_id`    | `uuid`                     | `String? @db.Uuid`                       |  Yes | FK    | Null         | FK to most recent approved `attendance_corrections.id`.                                                                               |
| `source_type`           | `varchar(30)`              | `String @db.VarChar(30)`                 |   No | Index | `MANUAL`     | Allowed Phase 1 value: `MANUAL`; future allowed values may include `BIOMETRIC_IMPORT` but biometric is not in current implementation. |
| `created_at`            | `timestamptz(3)`           | `DateTime @db.Timestamptz(3)`            |   No | None  | `now()`      | Audit create timestamp.                                                                                                               |
| `created_by`            | `uuid`                     | `String @db.Uuid`                        |   No | FK    | None         | FK to `users.id`.                                                                                                                     |
| `updated_at`            | `timestamptz(3)`           | `DateTime @updatedAt @db.Timestamptz(3)` |   No | None  | `now()`      | Audit update timestamp.                                                                                                               |
| `updated_by`            | `uuid`                     | `String @db.Uuid`                        |   No | FK    | None         | FK to `users.id`.                                                                                                                     |
| `deleted_at`            | `timestamptz(3)`           | `DateTime? @db.Timestamptz(3)`           |  Yes | None  | Null         | Soft delete timestamp.                                                                                                                |
| `deleted_by`            | `uuid`                     | `String? @db.Uuid`                       |  Yes | FK    | Null         | FK to `users.id`.                                                                                                                     |
| `is_deleted`            | `boolean`                  | `Boolean`                                |   No | Index | `false`      | Soft delete flag.                                                                                                                     |
| `version`               | `integer`                  | `Int`                                    |   No | None  | `1`          | Optimistic locking version.                                                                                                           |

### 4.2.3 Indexes and Constraints

| Name                                      | Type           | Columns / Expression                                                                                                 | Rule                                                       |
| ----------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `pk_attendance_records`                   | Primary key    | `id`                                                                                                                 | Unique row identity.                                       |
| `uq_att_record_active_session_enrollment` | Partial unique | `(attendance_session_id, enrollment_id) WHERE is_deleted = false`                                                    | One active record per enrollment per attendance session.   |
| `idx_att_record_branch_date_status`       | B-tree         | `(branch_id, marked_at, status)`                                                                                     | Branch attendance reporting.                               |
| `idx_att_record_enrollment_status`        | B-tree         | `(enrollment_id, status)`                                                                                            | Enrollment summary calculation.                            |
| `idx_att_record_student_profile`          | B-tree         | `(student_profile_id)`                                                                                               | Student attendance history.                                |
| `idx_att_record_batch_session`            | B-tree         | `(batch_id, session_id)`                                                                                             | Batch/session roster lookup.                               |
| `idx_att_record_official`                 | B-tree         | `(is_official, attendance_session_id)`                                                                               | Official percentage calculation.                           |
| `idx_att_record_source`                   | B-tree         | `(source_type)`                                                                                                      | Source-based review and future integration analysis.       |
| `chk_att_record_late_minutes`             | Check          | `(status = 'LATE' AND late_minutes IS NOT NULL AND late_minutes > 0) OR (status <> 'LATE' AND late_minutes IS NULL)` | Late minutes required only for late records.               |
| `chk_att_record_excuse_reason`            | Check          | `(status = 'EXCUSED' AND excuse_reason_code IS NOT NULL) OR status <> 'EXCUSED'`                                     | Excused status requires reason.                            |
| `chk_att_record_marked_fields`            | Check          | `(status = 'NOT_MARKED') OR (marked_at IS NOT NULL AND marked_by IS NOT NULL)`                                       | Marked records must identify marker.                       |
| `chk_att_record_official_fields`          | Check          | `is_official = false OR (officialized_at IS NOT NULL AND officialized_by IS NOT NULL)`                               | Official records must identify officialization.            |
| `chk_att_record_source_type`              | Check          | `source_type IN ('MANUAL','SYSTEM_ADJUSTMENT','BIOMETRIC_IMPORT')`                                                   | Allows current manual and controlled future source labels. |
| `chk_att_record_delete_fields`            | Check          | `is_deleted = false OR deleted_at IS NOT NULL`                                                                       | Soft delete timestamp required.                            |

### 4.2.4 Foreign Keys

| FK Name                         | Column                  | References                | On Delete  | On Update | Reason                                                |
| ------------------------------- | ----------------------- | ------------------------- | ---------- | --------- | ----------------------------------------------------- |
| `fk_att_record_session_header`  | `attendance_session_id` | `attendance_sessions(id)` | `RESTRICT` | `CASCADE` | Header must not be removed while records exist.       |
| `fk_att_record_branch`          | `branch_id`             | `branches(id)`            | `RESTRICT` | `CASCADE` | Branch history required.                              |
| `fk_att_record_course`          | `course_id`             | `courses(id)`             | `RESTRICT` | `CASCADE` | Course reporting required.                            |
| `fk_att_record_batch`           | `batch_id`              | `batches(id)`             | `RESTRICT` | `CASCADE` | Batch reporting required.                             |
| `fk_att_record_session`         | `session_id`            | `sessions(id)`            | `RESTRICT` | `CASCADE` | Scheduled session history required.                   |
| `fk_att_record_enrollment`      | `enrollment_id`         | `enrollments(id)`         | `RESTRICT` | `CASCADE` | Attendance belongs to enrollment lifecycle.           |
| `fk_att_record_student`         | `student_profile_id`    | `student_profiles(id)`    | `RESTRICT` | `CASCADE` | Student attendance history required.                  |
| `fk_att_record_excuse_document` | `excuse_document_id`    | `documents(id)`           | `SET NULL` | `CASCADE` | Document may be archived without invalidating record. |
| `fk_att_record_marked_by`       | `marked_by`             | `users(id)`               | `RESTRICT` | `CASCADE` | Marker audit required.                                |
| `fk_att_record_officialized_by` | `officialized_by`       | `users(id)`               | `RESTRICT` | `CASCADE` | Officialization audit required.                       |
| `fk_att_record_created_by`      | `created_by`            | `users(id)`               | `RESTRICT` | `CASCADE` | Audit identity required.                              |
| `fk_att_record_updated_by`      | `updated_by`            | `users(id)`               | `RESTRICT` | `CASCADE` | Audit identity required.                              |
| `fk_att_record_deleted_by`      | `deleted_by`            | `users(id)`               | `RESTRICT` | `CASCADE` | Deletion audit identity required.                     |

---

## 4.3 `attendance_corrections`

### 4.3.1 Purpose

`attendance_corrections` records the controlled workflow for changing an official attendance record after submission, approval, correction, or locking. The table preserves old and new attendance values and enforces approval for sensitive changes.

### 4.3.2 Field Specification

| Field Name               | PostgreSQL Type                | Prisma Equivalent                        | Null | Key   | Default     | Description / Validation                                                                                      |
| ------------------------ | ------------------------------ | ---------------------------------------- | ---: | ----- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `id`                     | `uuid`                         | `String @id @db.Uuid`                    |   No | PK    | Generated   | Unique correction request ID.                                                                                 |
| `attendance_record_id`   | `uuid`                         | `String @db.Uuid`                        |   No | FK    | None        | FK to official attendance record being corrected.                                                             |
| `attendance_session_id`  | `uuid`                         | `String @db.Uuid`                        |   No | FK    | Copied      | FK to attendance session for queue and status updates.                                                        |
| `branch_id`              | `uuid`                         | `String @db.Uuid`                        |   No | FK    | Copied      | Server-side branch scope.                                                                                     |
| `course_id`              | `uuid`                         | `String @db.Uuid`                        |   No | FK    | Copied      | Reporting/filtering.                                                                                          |
| `batch_id`               | `uuid`                         | `String @db.Uuid`                        |   No | FK    | Copied      | Reporting/filtering.                                                                                          |
| `enrollment_id`          | `uuid`                         | `String @db.Uuid`                        |   No | FK    | Copied      | Enrollment lifecycle reference.                                                                               |
| `student_profile_id`     | `uuid`                         | `String @db.Uuid`                        |   No | FK    | Copied      | Student reference.                                                                                            |
| `old_status`             | `attendance_record_status`     | `AttendanceRecordStatus`                 |   No | None  | None        | Official status before correction. Cannot be `NOT_MARKED` unless correcting incomplete overridden submission. |
| `new_status`             | `attendance_record_status`     | `AttendanceRecordStatus`                 |   No | None  | None        | Requested replacement status. Must be different from `old_status`.                                            |
| `old_late_minutes`       | `integer`                      | `Int?`                                   |  Yes | None  | Null        | Previous late minutes.                                                                                        |
| `new_late_minutes`       | `integer`                      | `Int?`                                   |  Yes | None  | Null        | Required if `new_status = LATE`.                                                                              |
| `old_excuse_reason_code` | `varchar(80)`                  | `String? @db.VarChar(80)`                |  Yes | None  | Null        | Previous excuse reason.                                                                                       |
| `new_excuse_reason_code` | `varchar(80)`                  | `String? @db.VarChar(80)`                |  Yes | None  | Null        | Required if `new_status = EXCUSED`.                                                                           |
| `reason`                 | `varchar(1000)`                | `String @db.VarChar(1000)`               |   No | None  | None        | Mandatory correction justification. Minimum 10 characters, maximum 1000 characters, no HTML.                  |
| `evidence_document_id`   | `uuid`                         | `String? @db.Uuid`                       |  Yes | FK    | Null        | Optional support document.                                                                                    |
| `requested_by`           | `uuid`                         | `String @db.Uuid`                        |   No | FK    | None        | FK to `users.id`.                                                                                             |
| `requested_at`           | `timestamptz(3)`               | `DateTime @db.Timestamptz(3)`            |   No | Index | `now()`     | Request timestamp.                                                                                            |
| `approved_by`            | `uuid`                         | `String? @db.Uuid`                       |  Yes | FK    | Null        | FK to `users.id`; required if approved.                                                                       |
| `approved_at`            | `timestamptz(3)`               | `DateTime? @db.Timestamptz(3)`           |  Yes | None  | Null        | Approval timestamp.                                                                                           |
| `rejected_by`            | `uuid`                         | `String? @db.Uuid`                       |  Yes | FK    | Null        | FK to `users.id`; required if rejected.                                                                       |
| `rejected_at`            | `timestamptz(3)`               | `DateTime? @db.Timestamptz(3)`           |  Yes | None  | Null        | Rejection timestamp.                                                                                          |
| `approval_remarks`       | `varchar(1000)`                | `String? @db.VarChar(1000)`              |  Yes | None  | Null        | Mandatory for rejection; optional for approval.                                                               |
| `status`                 | `attendance_correction_status` | `AttendanceCorrectionStatus`             |   No | Index | `SUBMITTED` | Workflow status.                                                                                              |
| `applied_at`             | `timestamptz(3)`               | `DateTime? @db.Timestamptz(3)`           |  Yes | None  | Null        | Set when approved change is applied to record.                                                                |
| `applied_by`             | `uuid`                         | `String? @db.Uuid`                       |  Yes | FK    | Null        | Usually same as approver or system user.                                                                      |
| `created_at`             | `timestamptz(3)`               | `DateTime @db.Timestamptz(3)`            |   No | None  | `now()`     | Audit create timestamp.                                                                                       |
| `created_by`             | `uuid`                         | `String @db.Uuid`                        |   No | FK    | None        | FK to `users.id`.                                                                                             |
| `updated_at`             | `timestamptz(3)`               | `DateTime @updatedAt @db.Timestamptz(3)` |   No | None  | `now()`     | Audit update timestamp.                                                                                       |
| `updated_by`             | `uuid`                         | `String @db.Uuid`                        |   No | FK    | None        | FK to `users.id`.                                                                                             |
| `deleted_at`             | `timestamptz(3)`               | `DateTime? @db.Timestamptz(3)`           |  Yes | None  | Null        | Soft delete timestamp.                                                                                        |
| `deleted_by`             | `uuid`                         | `String? @db.Uuid`                       |  Yes | FK    | Null        | FK to `users.id`.                                                                                             |
| `is_deleted`             | `boolean`                      | `Boolean`                                |   No | Index | `false`     | Soft delete flag.                                                                                             |
| `version`                | `integer`                      | `Int`                                    |   No | None  | `1`         | Optimistic locking version.                                                                                   |

### 4.3.3 Indexes and Constraints

| Name                              | Type           | Columns / Expression                                                                                                                               | Rule                                                                                          |
| --------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `pk_attendance_corrections`       | Primary key    | `id`                                                                                                                                               | Unique row identity.                                                                          |
| `idx_att_corr_record_status`      | B-tree         | `(attendance_record_id, status)`                                                                                                                   | Prevents duplicate active pending corrections through service validation and supports review. |
| `idx_att_corr_branch_status`      | B-tree         | `(branch_id, status, requested_at)`                                                                                                                | Branch correction approval queue.                                                             |
| `idx_att_corr_session_status`     | B-tree         | `(attendance_session_id, status)`                                                                                                                  | Session correction status rollup.                                                             |
| `idx_att_corr_requested_by`       | B-tree         | `(requested_by, requested_at)`                                                                                                                     | My correction requests view.                                                                  |
| `uq_att_corr_one_open_per_record` | Partial unique | `(attendance_record_id) WHERE is_deleted = false AND status IN ('DRAFT','SUBMITTED')`                                                              | Only one open correction request per attendance record.                                       |
| `chk_att_corr_status_changed`     | Check          | `old_status <> new_status OR old_late_minutes IS DISTINCT FROM new_late_minutes OR old_excuse_reason_code IS DISTINCT FROM new_excuse_reason_code` | Correction must change at least one official value.                                           |
| `chk_att_corr_reason_length`      | Check          | `char_length(reason) BETWEEN 10 AND 1000`                                                                                                          | Enforces meaningful correction reason.                                                        |
| `chk_att_corr_new_late`           | Check          | `(new_status = 'LATE' AND new_late_minutes IS NOT NULL AND new_late_minutes > 0) OR (new_status <> 'LATE' AND new_late_minutes IS NULL)`           | Validates new late value.                                                                     |
| `chk_att_corr_new_excuse`         | Check          | `(new_status = 'EXCUSED' AND new_excuse_reason_code IS NOT NULL) OR new_status <> 'EXCUSED'`                                                       | Validates new excuse reason.                                                                  |
| `chk_att_corr_approval_fields`    | Check          | `status <> 'APPROVED' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND applied_at IS NOT NULL)`                                         | Approved correction must identify approval and application.                                   |
| `chk_att_corr_rejection_fields`   | Check          | `status <> 'REJECTED' OR (rejected_by IS NOT NULL AND rejected_at IS NOT NULL AND approval_remarks IS NOT NULL)`                                   | Rejected correction must capture reason.                                                      |
| `chk_att_corr_delete_fields`      | Check          | `is_deleted = false OR deleted_at IS NOT NULL`                                                                                                     | Soft delete timestamp required.                                                               |

### 4.3.4 Foreign Keys

| FK Name                    | Column                  | References                | On Delete  | On Update | Reason                                                            |
| -------------------------- | ----------------------- | ------------------------- | ---------- | --------- | ----------------------------------------------------------------- |
| `fk_att_corr_record`       | `attendance_record_id`  | `attendance_records(id)`  | `RESTRICT` | `CASCADE` | Correction history cannot exist without original official record. |
| `fk_att_corr_session`      | `attendance_session_id` | `attendance_sessions(id)` | `RESTRICT` | `CASCADE` | Queue and status rollup require header.                           |
| `fk_att_corr_branch`       | `branch_id`             | `branches(id)`            | `RESTRICT` | `CASCADE` | Branch history required.                                          |
| `fk_att_corr_course`       | `course_id`             | `courses(id)`             | `RESTRICT` | `CASCADE` | Course reporting required.                                        |
| `fk_att_corr_batch`        | `batch_id`              | `batches(id)`             | `RESTRICT` | `CASCADE` | Batch reporting required.                                         |
| `fk_att_corr_enrollment`   | `enrollment_id`         | `enrollments(id)`         | `RESTRICT` | `CASCADE` | Enrollment lifecycle reference required.                          |
| `fk_att_corr_student`      | `student_profile_id`    | `student_profiles(id)`    | `RESTRICT` | `CASCADE` | Student reference required.                                       |
| `fk_att_corr_evidence_doc` | `evidence_document_id`  | `documents(id)`           | `SET NULL` | `CASCADE` | Evidence may be archived independently.                           |
| `fk_att_corr_requested_by` | `requested_by`          | `users(id)`               | `RESTRICT` | `CASCADE` | Requester audit required.                                         |
| `fk_att_corr_approved_by`  | `approved_by`           | `users(id)`               | `RESTRICT` | `CASCADE` | Approval audit required.                                          |
| `fk_att_corr_rejected_by`  | `rejected_by`           | `users(id)`               | `RESTRICT` | `CASCADE` | Rejection audit required.                                         |
| `fk_att_corr_applied_by`   | `applied_by`            | `users(id)`               | `RESTRICT` | `CASCADE` | Application audit required.                                       |

---

## 4.4 `attendance_alert_rules`

### 4.4.1 Purpose

`attendance_alert_rules` stores Attendance-owned rules for detecting low attendance and operational follow-up conditions. These rules are not completion rules. Completion eligibility thresholds remain owned by Course Catalog through course completion rules. Attendance alert rules exist to notify trainers, coordinators, branch managers, and learners before completion risk becomes final.

### 4.4.2 Field Specification

| Field Name                      | PostgreSQL Type                | Prisma Equivalent                        | Null | Key          | Default             | Description / Validation                                                            |
| ------------------------------- | ------------------------------ | ---------------------------------------- | ---: | ------------ | ------------------- | ----------------------------------------------------------------------------------- |
| `id`                            | `uuid`                         | `String @id @db.Uuid`                    |   No | PK           | Generated           | Unique alert rule ID.                                                               |
| `branch_id`                     | `uuid`                         | `String? @db.Uuid`                       |  Yes | FK           | Null                | Branch-specific rule. Null means all branches if user has configuration permission. |
| `course_id`                     | `uuid`                         | `String? @db.Uuid`                       |  Yes | FK           | Null                | Course-specific rule. Null means all courses under branch scope.                    |
| `batch_id`                      | `uuid`                         | `String? @db.Uuid`                       |  Yes | FK           | Null                | Batch-specific rule. Highest specificity.                                           |
| `rule_code`                     | `varchar(60)`                  | `String @db.VarChar(60)`                 |   No | Unique scope | None                | Format `ATT-RULE-[A-Z0-9-]{3,40}`.                                                  |
| `name_en`                       | `varchar(150)`                 | `String @db.VarChar(150)`                |   No | None         | None                | English rule name.                                                                  |
| `name_ar`                       | `varchar(150)`                 | `String? @db.VarChar(150)`               |  Yes | None         | Null                | Arabic rule name.                                                                   |
| `threshold_percentage`          | `numeric(5,2)`                 | `Decimal @db.Decimal(5,2)`               |   No | None         | None                | Low attendance threshold. Must be `0.00..100.00`.                                   |
| `evaluation_basis`              | `varchar(30)`                  | `String @db.VarChar(30)`                 |   No | None         | `OFFICIAL_SESSIONS` | Allowed: `OFFICIAL_SESSIONS`, `ALL_SCHEDULED_SESSIONS`.                             |
| `include_late_as_attended`      | `boolean`                      | `Boolean`                                |   No | None         | `true`              | Whether `LATE` counts as attended for alert calculation.                            |
| `include_excused_as_attended`   | `boolean`                      | `Boolean`                                |   No | None         | `false`             | Whether `EXCUSED` counts as attended for alert calculation.                         |
| `minimum_sessions_before_alert` | `integer`                      | `Int`                                    |   No | None         | `1`                 | Must be `1..100`. Prevents alerting after too few sessions.                         |
| `notify_trainer`                | `boolean`                      | `Boolean`                                |   No | None         | `true`              | Whether trainer should be a recipient when communication module is enabled.         |
| `notify_academic_coordinator`   | `boolean`                      | `Boolean`                                |   No | None         | `true`              | Whether academic coordinator should be notified.                                    |
| `notify_student`                | `boolean`                      | `Boolean`                                |   No | None         | `false`             | Whether learner should be notified.                                                 |
| `notify_corporate_contact`      | `boolean`                      | `Boolean`                                |   No | None         | `false`             | Whether corporate contact should be notified for corporate enrollments.             |
| `effective_start_date`          | `date`                         | `DateTime @db.Date`                      |   No | Index        | Current Oman date   | Rule validity start date.                                                           |
| `effective_end_date`            | `date`                         | `DateTime? @db.Date`                     |  Yes | Index        | Null                | Must be null or greater than or equal to start date.                                |
| `status`                        | `attendance_alert_rule_status` | `AttendanceAlertRuleStatus`              |   No | Index        | `DRAFT`             | Rule lifecycle status.                                                              |
| `created_at`                    | `timestamptz(3)`               | `DateTime @db.Timestamptz(3)`            |   No | None         | `now()`             | Audit create timestamp.                                                             |
| `created_by`                    | `uuid`                         | `String @db.Uuid`                        |   No | FK           | None                | FK to `users.id`.                                                                   |
| `updated_at`                    | `timestamptz(3)`               | `DateTime @updatedAt @db.Timestamptz(3)` |   No | None         | `now()`             | Audit update timestamp.                                                             |
| `updated_by`                    | `uuid`                         | `String @db.Uuid`                        |   No | FK           | None                | FK to `users.id`.                                                                   |
| `deleted_at`                    | `timestamptz(3)`               | `DateTime? @db.Timestamptz(3)`           |  Yes | None         | Null                | Soft delete timestamp.                                                              |
| `deleted_by`                    | `uuid`                         | `String? @db.Uuid`                       |  Yes | FK           | Null                | FK to `users.id`.                                                                   |
| `is_deleted`                    | `boolean`                      | `Boolean`                                |   No | Index        | `false`             | Soft delete flag.                                                                   |
| `version`                       | `integer`                      | `Int`                                    |   No | None         | `1`                 | Optimistic locking version.                                                         |

### 4.4.3 Indexes and Constraints

| Name                               | Type           | Columns / Expression                                                                                                                                                                                                         | Rule                                          |
| ---------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `pk_attendance_alert_rules`        | Primary key    | `id`                                                                                                                                                                                                                         | Unique row identity.                          |
| `uq_att_alert_rule_code_scope`     | Partial unique | `(coalesce(branch_id, '00000000-0000-0000-0000-000000000000'), coalesce(course_id, '00000000-0000-0000-0000-000000000000'), coalesce(batch_id, '00000000-0000-0000-0000-000000000000'), rule_code) WHERE is_deleted = false` | Prevents duplicate rule codes for same scope. |
| `idx_att_alert_rule_scope_active`  | B-tree         | `(branch_id, course_id, batch_id, status, effective_start_date, effective_end_date)`                                                                                                                                         | Rule resolution by specificity.               |
| `idx_att_alert_rule_status`        | B-tree         | `(status)`                                                                                                                                                                                                                   | Active rule administration.                   |
| `chk_att_alert_rule_threshold`     | Check          | `threshold_percentage >= 0 AND threshold_percentage <= 100`                                                                                                                                                                  | Valid percentage.                             |
| `chk_att_alert_rule_min_sessions`  | Check          | `minimum_sessions_before_alert BETWEEN 1 AND 100`                                                                                                                                                                            | Valid evaluation bound.                       |
| `chk_att_alert_rule_dates`         | Check          | `effective_end_date IS NULL OR effective_end_date >= effective_start_date`                                                                                                                                                   | Valid effective dating.                       |
| `chk_att_alert_rule_basis`         | Check          | `evaluation_basis IN ('OFFICIAL_SESSIONS','ALL_SCHEDULED_SESSIONS')`                                                                                                                                                         | Valid calculation basis.                      |
| `chk_att_alert_rule_code`          | Check          | `rule_code ~ '^ATT-RULE-[A-Z0-9-]{3,40}$'`                                                                                                                                                                                   | Enforces readable code.                       |
| `chk_att_alert_rule_delete_fields` | Check          | `is_deleted = false OR deleted_at IS NOT NULL`                                                                                                                                                                               | Soft delete timestamp required.               |

### 4.4.4 Foreign Keys

| FK Name                        | Column       | References     | On Delete  | On Update | Reason                                         |
| ------------------------------ | ------------ | -------------- | ---------- | --------- | ---------------------------------------------- |
| `fk_att_alert_rule_branch`     | `branch_id`  | `branches(id)` | `RESTRICT` | `CASCADE` | Branch-specific rules preserve branch history. |
| `fk_att_alert_rule_course`     | `course_id`  | `courses(id)`  | `RESTRICT` | `CASCADE` | Course-specific rules preserve course history. |
| `fk_att_alert_rule_batch`      | `batch_id`   | `batches(id)`  | `RESTRICT` | `CASCADE` | Batch-specific rules preserve batch history.   |
| `fk_att_alert_rule_created_by` | `created_by` | `users(id)`    | `RESTRICT` | `CASCADE` | Audit identity required.                       |
| `fk_att_alert_rule_updated_by` | `updated_by` | `users(id)`    | `RESTRICT` | `CASCADE` | Audit identity required.                       |
| `fk_att_alert_rule_deleted_by` | `deleted_by` | `users(id)`    | `RESTRICT` | `CASCADE` | Deletion audit identity required.              |

---

## 4.5 `attendance_alerts`

### 4.5.1 Purpose

`attendance_alerts` stores detected low-attendance conditions for an enrollment. Alerts are generated from official attendance records and attendance summaries using active `attendance_alert_rules`.

### 4.5.2 Field Specification

| Field Name                | PostgreSQL Type           | Prisma Equivalent                        | Null | Key   | Default     | Description / Validation                                           |
| ------------------------- | ------------------------- | ---------------------------------------- | ---: | ----- | ----------- | ------------------------------------------------------------------ |
| `id`                      | `uuid`                    | `String @id @db.Uuid`                    |   No | PK    | Generated   | Unique alert ID.                                                   |
| `alert_rule_id`           | `uuid`                    | `String @db.Uuid`                        |   No | FK    | None        | Rule that generated the alert.                                     |
| `branch_id`               | `uuid`                    | `String @db.Uuid`                        |   No | FK    | Copied      | Branch scope.                                                      |
| `course_id`               | `uuid`                    | `String @db.Uuid`                        |   No | FK    | Copied      | Course reference.                                                  |
| `batch_id`                | `uuid`                    | `String @db.Uuid`                        |   No | FK    | Copied      | Batch reference.                                                   |
| `enrollment_id`           | `uuid`                    | `String @db.Uuid`                        |   No | FK    | None        | Enrollment with low attendance.                                    |
| `student_profile_id`      | `uuid`                    | `String @db.Uuid`                        |   No | FK    | None        | Student reference.                                                 |
| `attendance_percentage`   | `numeric(5,2)`            | `Decimal @db.Decimal(5,2)`               |   No | None  | None        | Percentage that triggered alert. Must be `0.00..100.00`.           |
| `threshold_percentage`    | `numeric(5,2)`            | `Decimal @db.Decimal(5,2)`               |   No | None  | None        | Threshold copied from rule at detection time.                      |
| `attended_session_count`  | `integer`                 | `Int`                                    |   No | None  | None        | Numerator used for calculation. Must be >= 0.                      |
| `eligible_session_count`  | `integer`                 | `Int`                                    |   No | None  | None        | Denominator used for calculation. Must be >= 1.                    |
| `detected_at`             | `timestamptz(3)`          | `DateTime @db.Timestamptz(3)`            |   No | Index | `now()`     | Detection timestamp.                                               |
| `status`                  | `attendance_alert_status` | `AttendanceAlertStatus`                  |   No | Index | `OPEN`      | Alert lifecycle status.                                            |
| `assigned_to_user_id`     | `uuid`                    | `String? @db.Uuid`                       |  Yes | FK    | Null        | Coordinator/trainer responsible for follow-up.                     |
| `acknowledged_by`         | `uuid`                    | `String? @db.Uuid`                       |  Yes | FK    | Null        | User who acknowledged alert.                                       |
| `acknowledged_at`         | `timestamptz(3)`          | `DateTime? @db.Timestamptz(3)`           |  Yes | None  | Null        | Acknowledgement timestamp.                                         |
| `resolved_by`             | `uuid`                    | `String? @db.Uuid`                       |  Yes | FK    | Null        | User who resolved/dismissed alert.                                 |
| `resolved_at`             | `timestamptz(3)`          | `DateTime? @db.Timestamptz(3)`           |  Yes | None  | Null        | Resolution/dismissal timestamp.                                    |
| `resolution_note`         | `varchar(1000)`           | `String? @db.VarChar(1000)`              |  Yes | None  | Null        | Mandatory for `RESOLVED` and `DISMISSED`.                          |
| `notification_request_id` | `uuid`                    | `String? @db.Uuid`                       |  Yes | FK    | Null        | Optional FK to communication request when notification is created. |
| `created_at`              | `timestamptz(3)`          | `DateTime @db.Timestamptz(3)`            |   No | None  | `now()`     | Audit create timestamp.                                            |
| `created_by`              | `uuid`                    | `String @db.Uuid`                        |   No | FK    | System/User | FK to `users.id`.                                                  |
| `updated_at`              | `timestamptz(3)`          | `DateTime @updatedAt @db.Timestamptz(3)` |   No | None  | `now()`     | Audit update timestamp.                                            |
| `updated_by`              | `uuid`                    | `String @db.Uuid`                        |   No | FK    | System/User | FK to `users.id`.                                                  |
| `deleted_at`              | `timestamptz(3)`          | `DateTime? @db.Timestamptz(3)`           |  Yes | None  | Null        | Soft delete timestamp.                                             |
| `deleted_by`              | `uuid`                    | `String? @db.Uuid`                       |  Yes | FK    | Null        | FK to `users.id`.                                                  |
| `is_deleted`              | `boolean`                 | `Boolean`                                |   No | Index | `false`     | Soft delete flag.                                                  |
| `version`                 | `integer`                 | `Int`                                    |   No | None  | `1`         | Optimistic locking version.                                        |

### 4.5.3 Indexes and Constraints

| Name                                | Type           | Columns / Expression                                                                                                              | Rule                                                          |
| ----------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `pk_attendance_alerts`              | Primary key    | `id`                                                                                                                              | Unique row identity.                                          |
| `uq_att_alert_open_rule_enrollment` | Partial unique | `(alert_rule_id, enrollment_id) WHERE is_deleted = false AND status IN ('OPEN','ACKNOWLEDGED','IN_PROGRESS')`                     | Prevents duplicate active alerts for same rule/enrollment.    |
| `idx_att_alert_branch_status`       | B-tree         | `(branch_id, status, detected_at)`                                                                                                | Branch alert queue.                                           |
| `idx_att_alert_enrollment`          | B-tree         | `(enrollment_id, detected_at)`                                                                                                    | Student/enrollment alert history.                             |
| `idx_att_alert_assigned`            | B-tree         | `(assigned_to_user_id, status)`                                                                                                   | My action queue.                                              |
| `idx_att_alert_batch_status`        | B-tree         | `(batch_id, status)`                                                                                                              | Batch risk dashboard.                                         |
| `chk_att_alert_percentages`         | Check          | `attendance_percentage BETWEEN 0 AND 100 AND threshold_percentage BETWEEN 0 AND 100`                                              | Valid percentages.                                            |
| `chk_att_alert_counts`              | Check          | `attended_session_count >= 0 AND eligible_session_count >= 1 AND attended_session_count <= eligible_session_count`                | Valid calculation counts.                                     |
| `chk_att_alert_ack_fields`          | Check          | `status NOT IN ('ACKNOWLEDGED','IN_PROGRESS') OR acknowledged_by IS NOT NULL`                                                     | Acknowledged/in-progress alert must identify acknowledgement. |
| `chk_att_alert_resolve_fields`      | Check          | `status NOT IN ('RESOLVED','DISMISSED') OR (resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND resolution_note IS NOT NULL)` | Resolution requires user, time, and note.                     |
| `chk_att_alert_delete_fields`       | Check          | `is_deleted = false OR deleted_at IS NOT NULL`                                                                                    | Soft delete timestamp required.                               |

### 4.5.4 Foreign Keys

| FK Name                     | Column                    | References                   | On Delete  | On Update | Reason                                                 |
| --------------------------- | ------------------------- | ---------------------------- | ---------- | --------- | ------------------------------------------------------ |
| `fk_att_alert_rule`         | `alert_rule_id`           | `attendance_alert_rules(id)` | `RESTRICT` | `CASCADE` | Alert must remain linked to triggering rule.           |
| `fk_att_alert_branch`       | `branch_id`               | `branches(id)`               | `RESTRICT` | `CASCADE` | Branch history required.                               |
| `fk_att_alert_course`       | `course_id`               | `courses(id)`                | `RESTRICT` | `CASCADE` | Course reporting required.                             |
| `fk_att_alert_batch`        | `batch_id`                | `batches(id)`                | `RESTRICT` | `CASCADE` | Batch reporting required.                              |
| `fk_att_alert_enrollment`   | `enrollment_id`           | `enrollments(id)`            | `RESTRICT` | `CASCADE` | Enrollment reference required.                         |
| `fk_att_alert_student`      | `student_profile_id`      | `student_profiles(id)`       | `RESTRICT` | `CASCADE` | Student reference required.                            |
| `fk_att_alert_assigned_to`  | `assigned_to_user_id`     | `users(id)`                  | `SET NULL` | `CASCADE` | Assigned user may be deactivated without losing alert. |
| `fk_att_alert_ack_by`       | `acknowledged_by`         | `users(id)`                  | `RESTRICT` | `CASCADE` | Acknowledgement audit required.                        |
| `fk_att_alert_resolved_by`  | `resolved_by`             | `users(id)`                  | `RESTRICT` | `CASCADE` | Resolution audit required.                             |
| `fk_att_alert_notification` | `notification_request_id` | `notification_requests(id)`  | `SET NULL` | `CASCADE` | Notification may be archived independently.            |

---

## 4.6 `enrollment_attendance_summaries`

### 4.6.1 Purpose

`enrollment_attendance_summaries` stores the latest official attendance rollup for one enrollment. It allows Completion Management, dashboards, student views, corporate reports, and low-attendance alerting to read a stable calculated result without scanning all attendance records on every screen.

### 4.6.2 Field Specification

| Field Name                   | PostgreSQL Type             | Prisma Equivalent                        | Null | Key         | Default     | Description / Validation                                                |
| ---------------------------- | --------------------------- | ---------------------------------------- | ---: | ----------- | ----------- | ----------------------------------------------------------------------- |
| `id`                         | `uuid`                      | `String @id @db.Uuid`                    |   No | PK          | Generated   | Unique summary ID.                                                      |
| `branch_id`                  | `uuid`                      | `String @db.Uuid`                        |   No | FK          | Copied      | Branch scope from enrollment/batch.                                     |
| `course_id`                  | `uuid`                      | `String @db.Uuid`                        |   No | FK          | Copied      | Course reference.                                                       |
| `batch_id`                   | `uuid`                      | `String @db.Uuid`                        |   No | FK          | Copied      | Batch reference.                                                        |
| `enrollment_id`              | `uuid`                      | `String @db.Uuid`                        |   No | FK / Unique | None        | One active summary per enrollment.                                      |
| `student_profile_id`         | `uuid`                      | `String @db.Uuid`                        |   No | FK          | None        | Student reference.                                                      |
| `official_session_count`     | `integer`                   | `Int`                                    |   No | None        | `0`         | Count of official sessions included in denominator.                     |
| `present_count`              | `integer`                   | `Int`                                    |   No | None        | `0`         | Official present count.                                                 |
| `late_count`                 | `integer`                   | `Int`                                    |   No | None        | `0`         | Official late count.                                                    |
| `absent_count`               | `integer`                   | `Int`                                    |   No | None        | `0`         | Official absent count.                                                  |
| `excused_count`              | `integer`                   | `Int`                                    |   No | None        | `0`         | Official excused count.                                                 |
| `attended_count`             | `integer`                   | `Int`                                    |   No | None        | `0`         | `present_count + late_count` by default.                                |
| `attendance_percentage`      | `numeric(5,2)`              | `Decimal @db.Decimal(5,2)`               |   No | Index       | `0.00`      | Calculated as attended count divided by eligible denominator times 100. |
| `last_attendance_session_id` | `uuid`                      | `String? @db.Uuid`                       |  Yes | FK          | Null        | Most recent official attendance session included.                       |
| `last_calculated_at`         | `timestamptz(3)`            | `DateTime @db.Timestamptz(3)`            |   No | None        | `now()`     | Last successful calculation timestamp.                                  |
| `status`                     | `attendance_summary_status` | `AttendanceSummaryStatus`                |   No | Index       | `CURRENT`   | Summary lifecycle status.                                               |
| `calculation_version`        | `integer`                   | `Int`                                    |   No | None        | `1`         | Increment when calculation algorithm changes.                           |
| `created_at`                 | `timestamptz(3)`            | `DateTime @db.Timestamptz(3)`            |   No | None        | `now()`     | Audit create timestamp.                                                 |
| `created_by`                 | `uuid`                      | `String @db.Uuid`                        |   No | FK          | System/User | FK to `users.id`.                                                       |
| `updated_at`                 | `timestamptz(3)`            | `DateTime @updatedAt @db.Timestamptz(3)` |   No | None        | `now()`     | Audit update timestamp.                                                 |
| `updated_by`                 | `uuid`                      | `String @db.Uuid`                        |   No | FK          | System/User | FK to `users.id`.                                                       |
| `deleted_at`                 | `timestamptz(3)`            | `DateTime? @db.Timestamptz(3)`           |  Yes | None        | Null        | Soft delete timestamp.                                                  |
| `deleted_by`                 | `uuid`                      | `String? @db.Uuid`                       |  Yes | FK          | Null        | FK to `users.id`.                                                       |
| `is_deleted`                 | `boolean`                   | `Boolean`                                |   No | Index       | `false`     | Soft delete flag.                                                       |
| `version`                    | `integer`                   | `Int`                                    |   No | None        | `1`         | Optimistic locking version.                                             |

### 4.6.3 Summary Calculation Rule

```text
eligible_session_count = official_session_count
attended_count = present_count + late_count
attendance_percentage =
  if eligible_session_count = 0 then 0.00
  else round((attended_count / eligible_session_count) * 100, 2)
```

Default completion-facing rule:

```text
PRESENT counts as attended.
LATE counts as attended.
ABSENT does not count as attended.
EXCUSED does not count as attended for certificate eligibility unless a formal policy explicitly overrides this in a later approved requirement.
CANCELLED attendance sessions are excluded from denominator.
DRAFT, RETURNED_FOR_CORRECTION, and CORRECTION_PENDING sessions are excluded from denominator until official status is restored.
```

### 4.6.4 Indexes and Constraints

| Name                                       | Type           | Columns / Expression                           | Rule                               |
| ------------------------------------------ | -------------- | ---------------------------------------------- | ---------------------------------- |
| `pk_enrollment_attendance_summaries`       | Primary key    | `id`                                           | Unique row identity.               |
| `uq_att_summary_active_enrollment`         | Partial unique | `(enrollment_id) WHERE is_deleted = false`     | One active summary per enrollment. |
| `idx_att_summary_branch_batch`             | B-tree         | `(branch_id, batch_id)`                        | Batch attendance dashboard.        |
| `idx_att_summary_student`                  | B-tree         | `(student_profile_id)`                         | Student attendance history.        |
| `idx_att_summary_percentage`               | B-tree         | `(attendance_percentage)`                      | Low attendance queries.            |
| `idx_att_summary_status`                   | B-tree         | `(status)`                                     | Stale/recalculation queues.        |
| `chk_att_summary_counts_non_negative`      | Check          | All count columns `>= 0`                       | Prevents invalid rollups.          |
| `chk_att_summary_attended_lte_denominator` | Check          | `attended_count <= official_session_count`     | Prevents impossible percentage.    |
| `chk_att_summary_percentage`               | Check          | `attendance_percentage BETWEEN 0 AND 100`      | Valid percentage.                  |
| `chk_att_summary_delete_fields`            | Check          | `is_deleted = false OR deleted_at IS NOT NULL` | Soft delete timestamp required.    |

### 4.6.5 Foreign Keys

| FK Name                       | Column                       | References                | On Delete  | On Update | Reason                                                 |
| ----------------------------- | ---------------------------- | ------------------------- | ---------- | --------- | ------------------------------------------------------ |
| `fk_att_summary_branch`       | `branch_id`                  | `branches(id)`            | `RESTRICT` | `CASCADE` | Branch history required.                               |
| `fk_att_summary_course`       | `course_id`                  | `courses(id)`             | `RESTRICT` | `CASCADE` | Course reporting required.                             |
| `fk_att_summary_batch`        | `batch_id`                   | `batches(id)`             | `RESTRICT` | `CASCADE` | Batch reporting required.                              |
| `fk_att_summary_enrollment`   | `enrollment_id`              | `enrollments(id)`         | `RESTRICT` | `CASCADE` | Completion dependency requires stable enrollment link. |
| `fk_att_summary_student`      | `student_profile_id`         | `student_profiles(id)`    | `RESTRICT` | `CASCADE` | Student reporting required.                            |
| `fk_att_summary_last_session` | `last_attendance_session_id` | `attendance_sessions(id)` | `SET NULL` | `CASCADE` | Historical pointer optional.                           |

---

## 5. Relationship Model

### 5.1 1:1 Relationships

| Relationship                                                | Cardinality | Enforcement                                                                                              | Delete Rule                                                                                                        |
| ----------------------------------------------------------- | ----------: | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Enrollment` → `EnrollmentAttendanceSummary`                |   1 to 0..1 | Partial unique index on `enrollment_id WHERE is_deleted = false`                                         | `RESTRICT`; summary soft-deleted only if enrollment is cancelled before attendance exists and user has permission. |
| `AttendanceRecord` → latest approved `AttendanceCorrection` |   1 to 0..1 | Nullable `last_correction_id` and service-level validation that only approved correction may be assigned | `SET NULL` if correction is administratively archived; audit remains in AuditLog.                                  |

### 5.2 1:N Relationships

| Parent                | Child                  |   Cardinality | Cascade / Restrict Rule | Reason                                                                           |
| --------------------- | ---------------------- | ------------: | ----------------------- | -------------------------------------------------------------------------------- |
| `Branch`              | `AttendanceSession`    |           1:N | `RESTRICT`              | Attendance history must remain branch-auditable.                                 |
| `Course`              | `AttendanceSession`    |           1:N | `RESTRICT`              | Course attendance history must remain available.                                 |
| `Batch`               | `AttendanceSession`    |           1:N | `RESTRICT`              | Batch attendance records must survive batch closure.                             |
| `Session`             | `AttendanceSession`    | 1:0..1 active | `RESTRICT`              | Scheduled session is source event for attendance.                                |
| `AttendanceSession`   | `AttendanceRecord`     |           1:N | `RESTRICT`              | Header cannot be hard-deleted; records soft-deleted only through domain service. |
| `Enrollment`          | `AttendanceRecord`     |           1:N | `RESTRICT`              | Enrollment is central aggregate; attendance evidence cannot be orphaned.         |
| `StudentProfile`      | `AttendanceRecord`     |           1:N | `RESTRICT`              | Student attendance history must remain.                                          |
| `AttendanceRecord`    | `AttendanceCorrection` |           1:N | `RESTRICT`              | Correction history required for audit.                                           |
| `AttendanceAlertRule` | `AttendanceAlert`      |           1:N | `RESTRICT`              | Alerts must remain linked to rule that generated them.                           |
| `Enrollment`          | `AttendanceAlert`      |           1:N | `RESTRICT`              | Alert history belongs to enrollment.                                             |

### 5.3 N:M Relationships

Attendance Management does not own physical N:M bridge tables in Phase 1. N:M associations are resolved through existing external aggregates:

| Relationship                                  | Existing Bridge / Owner                                                        | Attendance Usage                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| User ↔ Branch                                 | `UserBranchAccess`, IAM                                                        | Determines branch-scoped attendance access.          |
| User ↔ Role ↔ Permission                      | `UserRole`, `RolePermission`, IAM                                              | Determines action-level attendance permissions.      |
| Batch ↔ Trainer                               | `BatchTrainer`, Training Delivery / Trainer Management                         | Determines trainer visibility and marking authority. |
| CorporateAccount ↔ Participants ↔ Enrollments | `CorporateParticipant`, `CorporateEnrollment`, Corporate Training / Enrollment | Enables corporate attendance reporting.              |

---

## 6. Referential Integrity and Deletion Policy

| Rule ID    | Rule                                                                                                                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB-ATT-001 | Attendance-owned records must never be hard-deleted by application code.                                                                                                                                                                       |
| DB-ATT-002 | A soft-deleted `AttendanceSession` must also soft-delete or supersede draft `AttendanceRecord` rows in the same transaction. Official records must not be soft-deleted unless correction/audit permission is present and a reason is captured. |
| DB-ATT-003 | A submitted, approved, corrected, or locked `AttendanceSession` cannot be soft-deleted through normal UI actions. It may only be cancelled or corrected.                                                                                       |
| DB-ATT-004 | FK delete behavior must be `RESTRICT` for Branch, Course, Batch, Session, Enrollment, StudentProfile, and User audit references.                                                                                                               |
| DB-ATT-005 | Nullable user assignment fields may use `SET NULL` only where the business record remains valid without the user, such as alert assignment.                                                                                                    |
| DB-ATT-006 | All attendance queries must filter `is_deleted = false` unless the user has explicit audit/recovery permission.                                                                                                                                |
| DB-ATT-007 | All mutation commands must pass expected `version`; stale versions must return an optimistic locking error.                                                                                                                                    |
| DB-ATT-008 | Domain services must copy `branch_id`, `course_id`, `batch_id`, and `session_id` from trusted source aggregates. UI/client input for these fields must be ignored during creation.                                                             |

---

## 7. Prisma Model Blueprint

The following blueprint describes the Prisma implementation shape. Relation field names may be adjusted to match existing package naming, but scalar fields, constraints, and indexes must remain semantically equivalent.

```prisma
enum AttendanceSessionStatus {
  DRAFT
  SUBMITTED
  APPROVED
  RETURNED_FOR_CORRECTION
  CORRECTION_PENDING
  CORRECTED
  CANCELLED
  LOCKED
}

enum AttendanceRecordStatus {
  PRESENT
  ABSENT
  LATE
  EXCUSED
  NOT_MARKED
}

enum AttendanceCorrectionStatus {
  DRAFT
  SUBMITTED
  APPROVED
  REJECTED
  CANCELLED
}

enum AttendanceAlertRuleStatus {
  DRAFT
  ACTIVE
  SUSPENDED
  EXPIRED
  ARCHIVED
}

enum AttendanceAlertStatus {
  OPEN
  ACKNOWLEDGED
  IN_PROGRESS
  RESOLVED
  DISMISSED
  SUPERSEDED
}

enum AttendanceSummaryStatus {
  CURRENT
  STALE
  RECALCULATING
  LOCKED
}

model AttendanceSession {
  id                 String                  @id @db.Uuid
  branchId           String                  @map("branch_id") @db.Uuid
  courseId           String                  @map("course_id") @db.Uuid
  batchId            String                  @map("batch_id") @db.Uuid
  sessionId          String                  @map("session_id") @db.Uuid
  attendanceDate     DateTime                @map("attendance_date") @db.Date
  scheduledStartTime DateTime                @map("scheduled_start_time") @db.Time(0)
  scheduledEndTime   DateTime                @map("scheduled_end_time") @db.Time(0)
  markedByTrainerId  String?                 @map("marked_by_trainer_id") @db.Uuid
  submittedByUserId  String?                 @map("submitted_by_user_id") @db.Uuid
  submittedAt        DateTime?               @map("submitted_at") @db.Timestamptz(3)
  approvedByUserId   String?                 @map("approved_by_user_id") @db.Uuid
  approvedAt         DateTime?               @map("approved_at") @db.Timestamptz(3)
  status             AttendanceSessionStatus @default(DRAFT)
  totalRosterCount   Int                     @default(0) @map("total_roster_count")
  presentCount       Int                     @default(0) @map("present_count")
  absentCount        Int                     @default(0) @map("absent_count")
  lateCount          Int                     @default(0) @map("late_count")
  excusedCount       Int                     @default(0) @map("excused_count")
  notMarkedCount     Int                     @default(0) @map("not_marked_count")
  isLocked           Boolean                 @default(false) @map("is_locked")
  lockReason         String?                 @map("lock_reason") @db.VarChar(300)
  remarks            String?                 @db.VarChar(1000)
  createdAt          DateTime                @default(now()) @map("created_at") @db.Timestamptz(3)
  createdBy          String                  @map("created_by") @db.Uuid
  updatedAt          DateTime                @updatedAt @map("updated_at") @db.Timestamptz(3)
  updatedBy          String                  @map("updated_by") @db.Uuid
  deletedAt          DateTime?               @map("deleted_at") @db.Timestamptz(3)
  deletedBy          String?                 @map("deleted_by") @db.Uuid
  isDeleted          Boolean                 @default(false) @map("is_deleted")
  version            Int                     @default(1)

  records            AttendanceRecord[]
  corrections        AttendanceCorrection[]

  @@index([branchId, attendanceDate], map: "idx_att_sess_branch_date")
  @@index([batchId, attendanceDate], map: "idx_att_sess_batch_date")
  @@index([courseId, status], map: "idx_att_sess_course_status")
  @@index([markedByTrainerId, attendanceDate], map: "idx_att_sess_trainer_date")
  @@index([status, attendanceDate], map: "idx_att_sess_status_date")
  @@map("attendance_sessions")
}

model AttendanceRecord {
  id                   String                 @id @db.Uuid
  attendanceSessionId  String                 @map("attendance_session_id") @db.Uuid
  branchId             String                 @map("branch_id") @db.Uuid
  courseId             String                 @map("course_id") @db.Uuid
  batchId              String                 @map("batch_id") @db.Uuid
  sessionId            String                 @map("session_id") @db.Uuid
  enrollmentId         String                 @map("enrollment_id") @db.Uuid
  studentProfileId     String                 @map("student_profile_id") @db.Uuid
  status               AttendanceRecordStatus @default(NOT_MARKED)
  lateMinutes          Int?                   @map("late_minutes")
  excuseReasonCode     String?                @map("excuse_reason_code") @db.VarChar(80)
  excuseDocumentId     String?                @map("excuse_document_id") @db.Uuid
  remarks              String?                @db.VarChar(1000)
  markedAt             DateTime?              @map("marked_at") @db.Timestamptz(3)
  markedBy             String?                @map("marked_by") @db.Uuid
  isOfficial           Boolean                @default(false) @map("is_official")
  officializedAt       DateTime?              @map("officialized_at") @db.Timestamptz(3)
  officializedBy       String?                @map("officialized_by") @db.Uuid
  lastCorrectionId     String?                @map("last_correction_id") @db.Uuid
  sourceType           String                 @default("MANUAL") @map("source_type") @db.VarChar(30)
  createdAt            DateTime               @default(now()) @map("created_at") @db.Timestamptz(3)
  createdBy            String                 @map("created_by") @db.Uuid
  updatedAt            DateTime               @updatedAt @map("updated_at") @db.Timestamptz(3)
  updatedBy            String                 @map("updated_by") @db.Uuid
  deletedAt            DateTime?              @map("deleted_at") @db.Timestamptz(3)
  deletedBy            String?                @map("deleted_by") @db.Uuid
  isDeleted            Boolean                @default(false) @map("is_deleted")
  version              Int                    @default(1)

  attendanceSession    AttendanceSession      @relation(fields: [attendanceSessionId], references: [id], onDelete: Restrict)
  corrections          AttendanceCorrection[]

  @@index([branchId, markedAt, status], map: "idx_att_record_branch_date_status")
  @@index([enrollmentId, status], map: "idx_att_record_enrollment_status")
  @@index([studentProfileId], map: "idx_att_record_student_profile")
  @@index([batchId, sessionId], map: "idx_att_record_batch_session")
  @@index([isOfficial, attendanceSessionId], map: "idx_att_record_official")
  @@index([sourceType], map: "idx_att_record_source")
  @@map("attendance_records")
}
```

> PostgreSQL partial unique indexes and advanced check constraints must be implemented in Prisma migrations using raw SQL because Prisma schema syntax does not fully represent partial index predicates and every required check expression.

---

## 8. CRUD Matrix

### 8.1 Actor Legend

| Actor Code | Actor                                 | Type                                 |
| ---------- | ------------------------------------- | ------------------------------------ |
| `TRN`      | Trainer                               | Human internal                       |
| `ACO`      | Academic Coordinator                  | Human internal                       |
| `REG`      | Registrar / Front Office              | Human internal                       |
| `BRM`      | Branch Manager                        | Human internal                       |
| `ADM`      | System Administrator                  | Human internal                       |
| `AUD`      | Internal Auditor / Compliance Officer | Human internal                       |
| `STU`      | Student / Learner                     | Human external/read-only portal user |
| `COR`      | Corporate Contact / Coordinator       | Human external/read-only portal user |
| `SYS`      | System Scheduler / Domain Service     | System actor                         |
| `CMP`      | Completion Management Service         | System actor                         |
| `COM`      | Communication Service                 | System actor                         |
| `RPT`      | Reporting Service                     | System actor                         |

### 8.2 Action Legend

| Symbol | Meaning                                        |
| ------ | ---------------------------------------------- |
| `C`    | Create                                         |
| `R`    | Read                                           |
| `U`    | Update                                         |
| `SD`   | Soft delete                                    |
| `A`    | Audit/read audit trail or generate audit event |
| `-`    | Not allowed                                    |

### 8.3 CRUD Permissions and Branch Scoping

| Entity                        | TRN           | ACO     | REG | BRM     | ADM        | AUD | STU            | COR                      | SYS   | CMP | COM                | RPT | Required Permission Codes                                                                                                                                               | Branch-Scoping Logic                                                                                                                                                                                                                                                                         |
| ----------------------------- | ------------- | ------- | --- | ------- | ---------- | --- | -------------- | ------------------------ | ----- | --- | ------------------ | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AttendanceSession`           | C/R/U/A       | C/R/U/A | R/A | R/U/A   | R/U/SD/A   | R/A | R              | R                        | C/U/A | R   | R                  | R   | `attendance.session.create`, `attendance.session.read`, `attendance.session.submit`, `attendance.session.approve`, `attendance.session.cancel`, `attendance.audit.read` | Human users may access only sessions where `branch_id` is in resolved `allowedBranchIds`. Trainer users additionally require assignment to the session trainer or batch trainer unless they hold `attendance.session.read.all`. Consolidated reads require `attendance.report.consolidated`. |
| `AttendanceRecord`            | C/R/U/A       | C/R/U/A | R/A | R/A     | R/U/SD/A   | R/A | R own          | R corporate own          | C/U/A | R   | R                  | R   | `attendance.record.mark`, `attendance.record.read`, `attendance.record.bulkMark`, `attendance.record.override`, `attendance.record.delete`, `attendance.audit.read`     | Create/update allowed only through active attendance session branch. Student reads restricted to own `student_profile_id`. Corporate contact reads restricted to enrollments linked to their corporate account and branch-visible corporate contract.                                        |
| `AttendanceCorrection`        | C/R/A         | C/R/U/A | R/A | R/U/A   | R/U/SD/A   | R/A | -              | -                        | U/A   | R   | R                  | R   | `attendance.correction.request`, `attendance.correction.review`, `attendance.correction.approve`, `attendance.correction.reject`, `attendance.audit.read`               | Requester must be in same branch as record. Approver must have approval permission for the same branch and must not approve own request unless explicit `attendance.correction.selfApprove` is granted.                                                                                      |
| `AttendanceAlertRule`         | R             | R       | R   | C/R/U/A | C/R/U/SD/A | R/A | -              | -                        | R     | R   | R                  | R   | `attendance.alertRule.create`, `attendance.alertRule.read`, `attendance.alertRule.update`, `attendance.alertRule.archive`, `attendance.audit.read`                      | Branch managers can manage only their assigned branch rules. Null branch/global rules require `attendance.alertRule.global.manage`. Course/batch references must belong to managed branch unless global permission exists.                                                                   |
| `AttendanceAlert`             | R/U own queue | C/R/U/A | R   | R/U/A   | R/U/SD/A   | R/A | R own optional | R corporate own optional | C/U/A | R   | U notification ref | R   | `attendance.alert.read`, `attendance.alert.acknowledge`, `attendance.alert.resolve`, `attendance.alert.dismiss`, `attendance.audit.read`                                | Alert visibility is based on `branch_id`. Student/corporate visibility is optional and must be filtered to own enrollment/corporate account. Communication service may update only `notification_request_id` and notification-related metadata.                                              |
| `EnrollmentAttendanceSummary` | R             | C/R/U/A | R   | R/A     | R/U/SD/A   | R/A | R own          | R corporate own          | C/U/A | R   | R                  | R   | `attendance.summary.read`, `attendance.summary.recalculate`, `attendance.summary.lock`, `attendance.audit.read`                                                         | Summary reads must filter by branch. Completion service can read by enrollment ID only after server validates module-to-module call and branch context. Student reads own enrollment only. Corporate contact reads linked participant enrollments only.                                      |

---

## 9. Actor-Specific Data Access Rules

| Actor                             | Data Access Rule                                                                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trainer                           | Can see sessions where the trainer is the session trainer or assigned batch trainer. Cannot see another trainer’s sessions unless granted branch-level academic permission. |
| Academic Coordinator              | Can manage attendance for batches in assigned branches. Can review submissions and initiate correction workflows within branch.                                             |
| Registrar / Front Office          | Can read attendance for learner service and certificate desk support but cannot alter official attendance unless separately granted marking/correction permission.          |
| Branch Manager                    | Can approve corrections, monitor branch compliance, configure branch alert rules, and view branch reports.                                                                  |
| System Administrator              | Can manage configuration and exceptional administrative actions, but still requires explicit consolidated branch permission to view data across all branches.               |
| Auditor                           | Can read active and soft-deleted records, audit history, correction history, and export compliance evidence; cannot mutate business data.                                   |
| Student                           | Can read own official attendance history and percentage only; draft or pending correction details are hidden.                                                               |
| Corporate Contact                 | Can read official attendance for corporate participants linked to their corporate account, subject to corporate portal permission and contract/reporting visibility.        |
| System Scheduler / Domain Service | Can initialize sessions, mark stale summaries, recalculate summaries, and generate alerts using system service identity.                                                    |
| Completion Management Service     | Can read official attendance summaries but cannot change attendance records.                                                                                                |
| Reporting Service                 | Can consume read models and summaries only through branch-scoped reporting queries.                                                                                         |

---

## 10. Branch-Scoping Enforcement

### 10.1 Server-Side Scope Resolution

Every attendance command/query must resolve branch access using this sequence:

```text
1. Read authenticated user ID from server session.
2. Load active UserBranchAccess rows from IAM where user_id = current user and is_deleted = false.
3. Build allowedBranchIds from directly assigned branches.
4. If canViewChildBranches is true, append child branch IDs from Organization hierarchy.
5. If requested consolidated mode is true, require canViewConsolidated = true and permission attendance.report.consolidated or attendance.audit.consolidated.
6. Never trust branchId received from client as proof of access.
7. Apply WHERE branch_id IN allowedBranchIds to every Attendance-owned entity query.
8. For mutation, load target row first using allowedBranchIds before applying changes.
```

### 10.2 Branch Scope by Entity

| Entity                        | Mandatory Scope Column | Creation Source                         | Mutation Check                                        |
| ----------------------------- | ---------------------- | --------------------------------------- | ----------------------------------------------------- |
| `AttendanceSession`           | `branch_id`            | Copied from linked `Session`/`Batch`    | User must have access to copied branch.               |
| `AttendanceRecord`            | `branch_id`            | Copied from `AttendanceSession`         | User must have access to attendance session branch.   |
| `AttendanceCorrection`        | `branch_id`            | Copied from `AttendanceRecord`          | Requester/reviewer must have access to record branch. |
| `AttendanceAlertRule`         | `branch_id` nullable   | User-selected but validated server-side | Null branch requires global management permission.    |
| `AttendanceAlert`             | `branch_id`            | Copied from summary/enrollment          | User must have access to alert branch.                |
| `EnrollmentAttendanceSummary` | `branch_id`            | Copied from enrollment/batch            | User/service must have access to enrollment branch.   |

---

## 11. CRUD Operation Rules by Entity

### 11.1 Attendance Session CRUD Rules

| Operation   | Rule                                                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Create      | Allowed only for valid non-deleted scheduled sessions in accessible branch. Duplicate active session/date is rejected.              |
| Read        | Allowed by branch scope, trainer assignment, and permission.                                                                        |
| Update      | Allowed in `DRAFT` and `RETURNED_FOR_CORRECTION`; official statuses require correction workflow or administrative state transition. |
| Soft Delete | Allowed only if status is `DRAFT` and no official attendance records exist. Requires reason and audit event.                        |
| Audit       | Create, submit, approve, return, cancel, lock, unlock, and soft delete must create AuditLog entries.                                |

### 11.2 Attendance Record CRUD Rules

| Operation   | Rule                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Create      | Created by roster generation or manual marking. Must link to valid enrollment in same batch and branch.                                    |
| Read        | Official rows visible based on portal and branch rules. Draft rows visible only to staff with marking/review permission.                   |
| Update      | Direct update allowed only before officialization. After officialization, update is allowed only through approved correction.              |
| Soft Delete | Allowed only for draft rows or invalid duplicate cleanup with admin permission. Official records cannot be soft-deleted through normal UI. |
| Audit       | Status changes, late minutes changes, excuse reason changes, overrides, and soft deletes must be audited.                                  |

### 11.3 Attendance Correction CRUD Rules

| Operation   | Rule                                                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create      | Allowed only for official attendance records. Must capture old values, requested new values, and reason.                                           |
| Read        | Visible to requester, reviewers in same branch, managers, admins, and auditors.                                                                    |
| Update      | Requester can update only `DRAFT`; reviewers can approve/reject only `SUBMITTED`.                                                                  |
| Soft Delete | Not allowed after submission. Draft cancellation updates status to `CANCELLED`. Admin archival is soft delete with audit only if created in error. |
| Audit       | Request, approval, rejection, cancellation, and application must be audited.                                                                       |

### 11.4 Attendance Alert Rule CRUD Rules

| Operation   | Rule                                                                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create      | Branch manager/admin can create branch/course/batch-specific rules. Global rules require global permission.                                           |
| Read        | Staff can read active rules applicable to their branch. Auditors can read inactive and soft-deleted rules.                                            |
| Update      | Active rules can be updated only by ending current effective period and creating a new effective version when historical interpretation would change. |
| Soft Delete | Prefer `ARCHIVED`; soft delete only for erroneous draft rules.                                                                                        |
| Audit       | Create, activate, suspend, expire, archive, and effective date changes must be audited.                                                               |

### 11.5 Attendance Alert CRUD Rules

| Operation   | Rule                                                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Create      | Generated by system or authorized coordinator from recalculation results.                                                                |
| Read        | Branch staff can read branch alerts. Students/corporate contacts see only official learner-facing alerts if enabled.                     |
| Update      | Acknowledge, assign, mark in-progress, resolve, dismiss, or supersede according to status transition rules.                              |
| Soft Delete | Not allowed for normal users. Dismiss or supersede should be used. Admin soft delete only for erroneous generated duplicates with audit. |
| Audit       | All status transitions and assignment changes must be audited.                                                                           |

### 11.6 Enrollment Attendance Summary CRUD Rules

| Operation   | Rule                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Create      | Created by summary recalculation after first official attendance submission or when enrollment joins a batch.                                                            |
| Read        | Used by completion, reporting, staff dashboards, student portal, and corporate portal under scoped access.                                                               |
| Update      | Updated only by Attendance domain service after official session submission, approved correction, session cancellation, or enrollment/batch state changes.               |
| Soft Delete | Allowed only when enrollment is soft-deleted before any official attendance exists or when merging duplicate enrollment records under administrative recovery procedure. |
| Audit       | Recalculation, locking, unlocking, and administrative adjustment must be audited.                                                                                        |

---

## 12. Migration and Database Implementation Notes

| Area                   | Requirement                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL enums       | Create enum types before table creation. Migration must be reversible only if no dependent rows exist.                                                                    |
| Partial unique indexes | Implement using raw SQL migrations after Prisma table creation.                                                                                                           |
| Check constraints      | Implement using raw SQL migrations for every check listed in this document.                                                                                               |
| Soft delete filters    | Repository/query builders must default to `is_deleted = false`. Audit screens may opt in to include deleted rows.                                                         |
| Optimistic locking     | Update statements must include `WHERE id = :id AND version = :expectedVersion`; if zero rows affected, return conflict error.                                             |
| AuditLog integration   | Application transaction must write audit event in the same database transaction for create/update/submit/approve/correction/delete operations.                            |
| Timezone               | `attendance_date` is Oman business date. Timestamps use UTC storage. UI renders in Oman GST unless user preference explicitly changes display timezone.                   |
| Seed data              | Seed Attendance permissions, status labels, and default alert rule only through controlled configuration seed script.                                                     |
| Data backfill          | When sessions already exist before Attendance module activation, create attendance sessions lazily on first access or through controlled one-time initialization command. |

---

## 13. Required Permission Codes

| Permission Code                      | Purpose                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `attendance.session.create`          | Initialize attendance session.                                                    |
| `attendance.session.read`            | View attendance sessions.                                                         |
| `attendance.session.read.all`        | View all trainer sessions within assigned branch.                                 |
| `attendance.session.submit`          | Submit draft attendance as official.                                              |
| `attendance.session.approve`         | Approve attendance session where branch policy requires approval.                 |
| `attendance.session.return`          | Return submitted session for correction before approval.                          |
| `attendance.session.cancel`          | Cancel invalid attendance session.                                                |
| `attendance.session.lock`            | Lock attendance session after period closure.                                     |
| `attendance.record.read`             | View attendance records.                                                          |
| `attendance.record.mark`             | Mark individual attendance.                                                       |
| `attendance.record.bulkMark`         | Bulk mark roster records.                                                         |
| `attendance.record.override`         | Submit with allowed not-marked override or exceptional status change.             |
| `attendance.record.delete`           | Soft-delete erroneous draft attendance records.                                   |
| `attendance.correction.request`      | Request correction for official attendance.                                       |
| `attendance.correction.review`       | View correction approval queue.                                                   |
| `attendance.correction.approve`      | Approve correction requests.                                                      |
| `attendance.correction.reject`       | Reject correction requests.                                                       |
| `attendance.correction.selfApprove`  | Exceptional permission to approve own correction request. Not granted by default. |
| `attendance.alertRule.create`        | Create low-attendance alert rules.                                                |
| `attendance.alertRule.read`          | Read alert rules.                                                                 |
| `attendance.alertRule.update`        | Update/suspend/expire alert rules.                                                |
| `attendance.alertRule.archive`       | Archive alert rules.                                                              |
| `attendance.alertRule.global.manage` | Manage global/null-branch alert rules.                                            |
| `attendance.alert.read`              | Read alerts.                                                                      |
| `attendance.alert.acknowledge`       | Acknowledge alerts.                                                               |
| `attendance.alert.resolve`           | Resolve alerts.                                                                   |
| `attendance.alert.dismiss`           | Dismiss alerts.                                                                   |
| `attendance.summary.read`            | Read enrollment attendance summaries.                                             |
| `attendance.summary.recalculate`     | Trigger summary recalculation.                                                    |
| `attendance.summary.lock`            | Lock summary used by completion/certificate process.                              |
| `attendance.report.read`             | View branch-level attendance reports.                                             |
| `attendance.report.export`           | Export branch-level reports.                                                      |
| `attendance.report.consolidated`     | View consolidated reports across permitted branches.                              |
| `attendance.audit.read`              | Read audit history for accessible branch.                                         |
| `attendance.audit.consolidated`      | Read audit history across permitted consolidated branches.                        |

---

## 14. Data Quality and Validation Rules

| Rule ID    | Validation Rule                                                                                                        | Enforced By                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| DQ-M08-001 | Attendance record enrollment must belong to the same batch as the attendance session.                                  | Domain service and database FK/reference checks.      |
| DQ-M08-002 | Attendance record student profile must match enrollment student profile.                                               | Domain service.                                       |
| DQ-M08-003 | Attendance session branch, course, and batch must match linked session/batch source data.                              | Domain service.                                       |
| DQ-M08-004 | An official attendance session cannot contain `NOT_MARKED` records unless override permission and reason are captured. | Domain service.                                       |
| DQ-M08-005 | Late minutes are required only for `LATE` status and must not exceed scheduled session duration.                       | Domain service and database check for positive value. |
| DQ-M08-006 | Excuse reason is required for `EXCUSED` status.                                                                        | Domain service and database check.                    |
| DQ-M08-007 | Correction request must change at least one official value.                                                            | Database check and domain service.                    |
| DQ-M08-008 | One open correction request is allowed per attendance record.                                                          | Partial unique index.                                 |
| DQ-M08-009 | Low-attendance active alert must not duplicate for same rule/enrollment.                                               | Partial unique index.                                 |
| DQ-M08-010 | Attendance summary percentages must remain between 0 and 100.                                                          | Database check.                                       |
| DQ-M08-011 | Global alert rules require explicit global manage permission.                                                          | Authorization service.                                |
| DQ-M08-012 | Every soft delete requires `deleted_at`, `deleted_by`, and audit reason.                                               | Domain service and database check.                    |
| DQ-M08-013 | Arabic labels must be stored in Unicode-capable varchar/text fields.                                                   | Database encoding and UI validation.                  |
| DQ-M08-014 | HTML input is not allowed in remarks, reasons, names, or resolution notes.                                             | UI and server validation.                             |

---

## 15. Cross-Context Data Access Contracts

| Consumer / Provider                         | Direction                   | Entity / Data                                              | Access Pattern                                                                   | Consistency Rule                                                                                                  |
| ------------------------------------------- | --------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Scheduling / Training Delivery → Attendance | Provider to Attendance      | `Session`, `Batch`, `BatchTrainer`                         | Attendance queries source data when initializing sessions and validating roster. | Attendance copies branch/course/batch/session fields for historical reporting but does not mutate source session. |
| Enrollment → Attendance                     | Provider to Attendance      | `Enrollment`, `StudentProfile`, corporate participant link | Attendance reads active enrollments for roster generation.                       | Only confirmed/active eligible enrollments are included by default.                                               |
| Attendance → Completion                     | Provider to Consumer        | `EnrollmentAttendanceSummary`                              | Completion reads official summary by enrollment ID.                              | Completion cannot compute or alter attendance records.                                                            |
| Attendance → Certificate                    | Indirect through Completion | Completion-approved attendance evidence                    | Certificate must not directly evaluate attendance.                               | Certificate relies on Completion eligibility.                                                                     |
| Attendance → Reporting                      | Provider to Consumer        | Sessions, records, summaries, alerts                       | Reporting reads branch-scoped views or materialized report queries.              | Reporting does not own attendance transaction state.                                                              |
| Attendance → Audit                          | Provider to Consumer        | Critical attendance events                                 | Same-transaction audit log write.                                                | Failure to write audit for sensitive operation must fail the transaction.                                         |
| Attendance → Communication                  | Provider to Consumer        | Low-attendance alerts                                      | Attendance creates alert; Communication sends notification request.              | Communication delivery failure must not roll back official attendance records.                                    |

---

## 16. Acceptance Checklist for Database Design Review

| Checklist ID | Item                                                                        | Expected Result                                                                                                         |
| ------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| DBR-M08-001  | All Attendance-owned tables include soft delete and audit columns.          | Pass if `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`, `isDeleted`, and `version` exist. |
| DBR-M08-002  | Attendance sessions have active uniqueness by scheduled session/date.       | Pass if partial unique index exists.                                                                                    |
| DBR-M08-003  | Attendance records have active uniqueness by attendance session/enrollment. | Pass if partial unique index exists.                                                                                    |
| DBR-M08-004  | All operational tables include `branch_id`.                                 | Pass if all transaction/query tables support server-side branch scope.                                                  |
| DBR-M08-005  | Official attendance records cannot be edited directly.                      | Pass if services route post-submission changes through corrections.                                                     |
| DBR-M08-006  | Correction workflow preserves old and new values.                           | Pass if old/new status, late minutes, and excuse reason columns exist.                                                  |
| DBR-M08-007  | Low-attendance alerts prevent duplicate open alerts.                        | Pass if partial unique index exists.                                                                                    |
| DBR-M08-008  | Enrollment attendance summary has one active row per enrollment.            | Pass if partial unique index exists.                                                                                    |
| DBR-M08-009  | FK delete rules protect historical attendance evidence.                     | Pass if Branch, Course, Batch, Session, Enrollment, StudentProfile, and audit User FKs use restrict semantics.          |
| DBR-M08-010  | Prisma migration includes raw SQL for partial indexes/check constraints.    | Pass if migration file contains the documented SQL constraints.                                                         |
| DBR-M08-011  | Query repositories enforce branch scope server-side.                        | Pass if branch IDs come from IAM context, not request body.                                                             |
| DBR-M08-012  | Summary calculation excludes draft and cancelled attendance sessions.       | Pass if calculation query filters official statuses only.                                                               |
