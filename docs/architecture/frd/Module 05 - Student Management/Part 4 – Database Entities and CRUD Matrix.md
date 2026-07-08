# Part 4 – Database Entities and CRUD Matrix

## Module 5 – Student Management

## 1. Purpose

This document defines the database entities owned by **Module 5 – Student Management**, their field-level specifications, relationships, referential rules, indexing strategy, audit columns, effective-dating rules where applicable, and the CRUD matrix across human and system actors.

This module is aligned to the ASTI shared `Party` / `Person` model and the enrollment-centric architecture. Therefore:

- **Student Management owns the `StudentProfile` aggregate and student-specific operational support tables.**
- **Student Management does not re-own `Party`, `Person`, `Branch`, `Admission`, `Enrollment`, `CorporateParticipant`, `Document`, or global `AuditLog`.**
- Those external entities are referenced through foreign keys or integration contracts, but their lifecycle remains in their owning bounded contexts.

The schema is intended for PostgreSQL with Prisma ORM in a modular monolith.

---

## 2. Context Ownership Boundary

## 2.1 Entities Owned by Student Management

1. `student_profiles`
2. `student_status_history`
3. `student_id_card_history`
4. `student_duplicate_cases`
5. `student_duplicate_case_items`
6. `student_merge_logs`
7. `student_export_logs`

## 2.2 Referenced but Not Owned by Student Management

| External Entity          | Owning Context              | Reason Referenced                                     |
| ------------------------ | --------------------------- | ----------------------------------------------------- |
| `parties`                | Shared / Party Model        | Root identity reference through person linkage        |
| `persons`                | Shared / Party Model        | Student is always linked to a real person             |
| `branches`               | Organization Management     | Branch scoping, default operational ownership         |
| `users`                  | Identity & Access           | Actor references for create/update/audit/approval     |
| `admissions`             | Admission & Enrollment      | Student may be created from approved admission        |
| `enrollments`            | Admission & Enrollment      | Student detail requires enrollment summary references |
| `corporate_participants` | Corporate Training          | Corporate participant may convert to student          |
| `documents`              | Document Management         | Related document summary only                         |
| `audit_logs`             | Audit & Compliance          | Central immutable audit sink                          |
| `numbering_series`       | Configuration / Master Data | Student number generation                             |

---

## 3. Shared Database Conventions

## 3.1 Primary Key Convention

- PostgreSQL type: `uuid`
- Prisma type: `String @db.Uuid`
- Generation: application-side UUID or database-side `gen_random_uuid()`
- All owned tables use surrogate UUID primary keys.

## 3.2 Audit Column Convention

All owned tables include the following columns unless explicitly stated otherwise:

| Column       | PostgreSQL Type  | Prisma Type                    | Nullability | Notes                         |
| ------------ | ---------------- | ------------------------------ | ----------- | ----------------------------- |
| `created_at` | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | Not null    | default current timestamp     |
| `created_by` | `uuid`           | `String @db.Uuid`              | Not null    | FK to `users.id`              |
| `updated_at` | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | Not null    | updated on each mutation      |
| `updated_by` | `uuid`           | `String @db.Uuid`              | Not null    | FK to `users.id`              |
| `deleted_at` | `timestamptz(3)` | `DateTime? @db.Timestamptz(3)` | Null        | populated only on soft delete |
| `is_deleted` | `boolean`        | `Boolean`                      | Not null    | default false                 |

## 3.3 Effective-Dating Convention

Where lifecycle windows apply, the following columns are used:

| Column                 | PostgreSQL Type | Prisma Type              | Nullability | Notes                                                         |
| ---------------------- | --------------- | ------------------------ | ----------- | ------------------------------------------------------------- |
| `effective_start_date` | `date`          | `DateTime @db.Date`      | Not null    | business-effective start                                      |
| `effective_end_date`   | `date`          | `DateTime? @db.Date`     | Null        | inclusive or open-ended by rule                               |
| `status`               | `varchar(30)`   | `String @db.VarChar(30)` | Not null    | enum-like domain value enforced by check constraint or lookup |

## 3.4 Soft Delete Rule

- No hard deletes are permitted from application workflows.
- `is_deleted = true` and `deleted_at` populated represent archival/soft delete.
- Unique indexes on owned tables must ignore deleted records using partial indexes where supported.

## 3.5 Branch Scope Rule

- Every operationally scoped owned record must either store `branch_id` directly or derive branch scope from parent aggregate.
- Queries must always include authorized branch predicates server-side unless the actor has consolidated permission.

---

## 4. Entity Specifications

# 4.1 `student_profiles`

### Purpose

Aggregate root for the ASTI student master. Represents the institutional student identity linked to a shared person.

### Table Definition Summary

- PostgreSQL table: `student_profiles`
- Prisma model: `StudentProfile`

### Field Specification

| Field Name                        | PostgreSQL Type  | Prisma Type                    | Nullable | Keys   | Index / Constraint                                  | Description                                                                                                         |
| --------------------------------- | ---------------- | ------------------------------ | -------- | ------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `id`                              | `uuid`           | `String @db.Uuid`              | No       | PK     | PK                                                  | Aggregate root identifier                                                                                           |
| `person_id`                       | `uuid`           | `String @db.Uuid`              | No       | FK     | Unique, FK                                          | FK to `persons.id`; one student profile per person in current phase                                                 |
| `student_number`                  | `varchar(50)`    | `String @db.VarChar(50)`       | No       | Unique | Unique partial on `is_deleted = false`              | Institutional student number                                                                                        |
| `branch_id`                       | `uuid`           | `String @db.Uuid`              | No       | FK     | Indexed, FK                                         | Operational branch ownership                                                                                        |
| `student_status`                  | `varchar(30)`    | `String @db.VarChar(30)`       | No       |        | Indexed, check constraint                           | `Pending`, `Active`, `Suspended`, `Archived`                                                                        |
| `id_card_issued`                  | `boolean`        | `Boolean`                      | No       |        |                                                     | Default false                                                                                                       |
| `id_card_number`                  | `varchar(50)`    | `String? @db.VarChar(50)`      | Yes      | Unique | Unique partial on non-null and `is_deleted = false` | Current active ID card number                                                                                       |
| `joined_at`                       | `date`           | `DateTime @db.Date`            | No       |        | Indexed                                             | Institutional joining date                                                                                          |
| `creation_source`                 | `varchar(30)`    | `String @db.VarChar(30)`       | No       |        | Indexed                                             | `ApprovedAdmission`, `DirectRegistration`, `CorporateConversion`, `WalkInHandoff`, `OnlineHandoff`, `MergeSurvivor` |
| `source_admission_id`             | `uuid`           | `String? @db.Uuid`             | Yes      | FK     | Indexed, FK                                         | Admission used for creation                                                                                         |
| `source_corporate_participant_id` | `uuid`           | `String? @db.Uuid`             | Yes      | FK     | Indexed, FK                                         | Corporate participant used for conversion                                                                           |
| `duplicate_review_required`       | `boolean`        | `Boolean`                      | No       |        | Indexed                                             | Marks unresolved duplicate suspicion                                                                                |
| `remarks`                         | `text`           | `String?`                      | Yes      |        |                                                     | Free-text operational notes                                                                                         |
| `effective_start_date`            | `date`           | `DateTime @db.Date`            | No       |        | Indexed                                             | Usually same as `joined_at` or status activation date                                                               |
| `effective_end_date`              | `date`           | `DateTime? @db.Date`           | Yes      |        | Indexed                                             | Set when closed/ended if policy requires                                                                            |
| `status`                          | `varchar(30)`    | `String @db.VarChar(30)`       | No       |        | Indexed                                             | Record lifecycle status, generally aligned with `student_status` but kept for generic effective-dating pattern      |
| `version`                         | `integer`        | `Int`                          | No       |        |                                                     | Optimistic concurrency counter                                                                                      |
| `created_at`                      | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | No       |        | Indexed                                             | Audit                                                                                                               |
| `created_by`                      | `uuid`           | `String @db.Uuid`              | No       | FK     | FK                                                  | Actor who created                                                                                                   |
| `updated_at`                      | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | No       |        | Indexed                                             | Audit                                                                                                               |
| `updated_by`                      | `uuid`           | `String @db.Uuid`              | No       | FK     | FK                                                  | Actor who updated                                                                                                   |
| `deleted_at`                      | `timestamptz(3)` | `DateTime? @db.Timestamptz(3)` | Yes      |        | Indexed partial                                     | Soft delete timestamp                                                                                               |
| `is_deleted`                      | `boolean`        | `Boolean`                      | No       |        | Indexed                                             | Soft delete flag                                                                                                    |

### Constraints

1. `person_id` unique among non-deleted student profiles.
2. `student_number` required and unique among non-deleted records.
3. `id_card_number` unique among non-deleted records when not null.
4. `joined_at <= CURRENT_DATE`.
5. `effective_end_date IS NULL OR effective_end_date >= effective_start_date`.
6. `id_card_issued = false` requires `id_card_number IS NULL`.
7. `id_card_issued = true` requires `id_card_number IS NOT NULL`.
8. At least one source path may be null, but only valid combinations allowed:
   - admission-based create: `source_admission_id` set
   - corporate conversion: `source_corporate_participant_id` set
   - direct registration: both source references null
9. `student_status = 'Archived'` implies `is_deleted = true`.
10. `is_deleted = true` implies `deleted_at IS NOT NULL`.

### Recommended Indexes

- `ux_student_profiles_person_active` unique (`person_id`) where `is_deleted = false`
- `ux_student_profiles_student_number_active` unique (`student_number`) where `is_deleted = false`
- `ux_student_profiles_id_card_number_active` unique (`id_card_number`) where `id_card_number IS NOT NULL AND is_deleted = false`
- `ix_student_profiles_branch_status` btree (`branch_id`, `student_status`) where `is_deleted = false`
- `ix_student_profiles_branch_joined_at` btree (`branch_id`, `joined_at`) where `is_deleted = false`
- `ix_student_profiles_source_admission` btree (`source_admission_id`)
- `ix_student_profiles_source_corporate_participant` btree (`source_corporate_participant_id`)
- `ix_student_profiles_duplicate_review` btree (`duplicate_review_required`) where `is_deleted = false`

### Prisma Model Sketch

```prisma
model StudentProfile {
  id                         String   @id @db.Uuid
  personId                   String   @map("person_id") @db.Uuid
  studentNumber              String   @map("student_number") @db.VarChar(50)
  branchId                   String   @map("branch_id") @db.Uuid
  studentStatus              String   @map("student_status") @db.VarChar(30)
  idCardIssued               Boolean  @default(false) @map("id_card_issued")
  idCardNumber               String?  @map("id_card_number") @db.VarChar(50)
  joinedAt                   DateTime @map("joined_at") @db.Date
  creationSource             String   @map("creation_source") @db.VarChar(30)
  sourceAdmissionId          String?  @map("source_admission_id") @db.Uuid
  sourceCorporateParticipantId String? @map("source_corporate_participant_id") @db.Uuid
  duplicateReviewRequired    Boolean  @default(false) @map("duplicate_review_required")
  remarks                    String?
  effectiveStartDate         DateTime @map("effective_start_date") @db.Date
  effectiveEndDate           DateTime? @map("effective_end_date") @db.Date
  status                     String   @db.VarChar(30)
  version                    Int      @default(1)
  createdAt                  DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  createdBy                  String   @map("created_by") @db.Uuid
  updatedAt                  DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)
  updatedBy                  String   @map("updated_by") @db.Uuid
  deletedAt                  DateTime? @map("deleted_at") @db.Timestamptz(3)
  isDeleted                  Boolean  @default(false) @map("is_deleted")

  @@map("student_profiles")
  @@index([branchId, studentStatus])
  @@index([branchId, joinedAt])
  @@index([sourceAdmissionId])
  @@index([sourceCorporateParticipantId])
}
```

---

# 4.2 `student_status_history`

### Purpose

Immutable effective-dated history of student lifecycle status changes.

### Table Definition Summary

- PostgreSQL table: `student_status_history`
- Prisma model: `StudentStatusHistory`

### Field Specification

| Field Name             | PostgreSQL Type  | Prisma Type                    | Nullable | Keys | Index / Constraint | Description                                        |
| ---------------------- | ---------------- | ------------------------------ | -------- | ---- | ------------------ | -------------------------------------------------- |
| `id`                   | `uuid`           | `String @db.Uuid`              | No       | PK   | PK                 | History row identifier                             |
| `student_profile_id`   | `uuid`           | `String @db.Uuid`              | No       | FK   | Indexed, FK        | FK to `student_profiles.id`                        |
| `branch_id`            | `uuid`           | `String @db.Uuid`              | No       | FK   | Indexed            | Copied for branch-scoped history query             |
| `old_status`           | `varchar(30)`    | `String @db.VarChar(30)`       | No       |      |                    | Previous status                                    |
| `new_status`           | `varchar(30)`    | `String @db.VarChar(30)`       | No       |      | Indexed            | New status                                         |
| `change_reason`        | `varchar(500)`   | `String @db.VarChar(500)`      | No       |      |                    | Mandatory reason                                   |
| `effective_start_date` | `date`           | `DateTime @db.Date`            | No       |      | Indexed            | Status effective start                             |
| `effective_end_date`   | `date`           | `DateTime? @db.Date`           | Yes      |      |                    | Optional end                                       |
| `status`               | `varchar(30)`    | `String @db.VarChar(30)`       | No       |      |                    | Record state, typically `Active`                   |
| `requested_by`         | `uuid`           | `String @db.Uuid`              | No       | FK   | FK                 | User who initiated                                 |
| `approved_by`          | `uuid`           | `String? @db.Uuid`             | Yes      | FK   | FK                 | Approver where workflow applies                    |
| `created_at`           | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | No       |      | Indexed            | Audit                                              |
| `created_by`           | `uuid`           | `String @db.Uuid`              | No       | FK   | FK                 | Actor creating history row                         |
| `updated_at`           | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | No       |      |                    | Immutable row but technical update column retained |
| `updated_by`           | `uuid`           | `String @db.Uuid`              | No       | FK   | FK                 | Usually same as creator                            |
| `deleted_at`           | `timestamptz(3)` | `DateTime? @db.Timestamptz(3)` | Yes      |      |                    | Always null in normal operations                   |
| `is_deleted`           | `boolean`        | `Boolean`                      | No       |      |                    | Always false in normal operations                  |

### Constraints

1. Immutable after insert except administrative correction under restricted process.
2. `new_status <> old_status`.
3. `effective_end_date IS NULL OR effective_end_date >= effective_start_date`.
4. Branch ID must match current student branch at time of status change.
5. Only allowed transitions permitted by application rule:
   - `Pending -> Active`
   - `Pending -> Archived`
   - `Active -> Suspended`
   - `Suspended -> Active`
   - `Active -> Archived`
   - `Suspended -> Archived`
   - `Archived -> Active`
   - `Archived -> Suspended` only if policy allows
6. `change_reason` minimum 10 characters after trim.

### Recommended Indexes

- `ix_student_status_history_student_start` (`student_profile_id`, `effective_start_date` desc)
- `ix_student_status_history_branch_new_status` (`branch_id`, `new_status`, `created_at` desc)

---

# 4.3 `student_id_card_history`

### Purpose

Immutable history of ID card issue, update, reissue, revoke, and restore events.

### Table Definition Summary

- PostgreSQL table: `student_id_card_history`
- Prisma model: `StudentIdCardHistory`

### Field Specification

| Field Name             | PostgreSQL Type  | Prisma Type                    | Nullable | Keys | Index / Constraint | Description                                              |
| ---------------------- | ---------------- | ------------------------------ | -------- | ---- | ------------------ | -------------------------------------------------------- |
| `id`                   | `uuid`           | `String @db.Uuid`              | No       | PK   | PK                 | History identifier                                       |
| `student_profile_id`   | `uuid`           | `String @db.Uuid`              | No       | FK   | Indexed            | FK to `student_profiles.id`                              |
| `branch_id`            | `uuid`           | `String @db.Uuid`              | No       | FK   | Indexed            | Branch of action                                         |
| `event_type`           | `varchar(30)`    | `String @db.VarChar(30)`       | No       |      | Indexed            | `Issued`, `Reissued`, `Revoked`, `Restored`, `Corrected` |
| `old_id_card_number`   | `varchar(50)`    | `String? @db.VarChar(50)`      | Yes      |      |                    | Prior number                                             |
| `new_id_card_number`   | `varchar(50)`    | `String? @db.VarChar(50)`      | Yes      |      |                    | New number                                               |
| `event_date`           | `date`           | `DateTime @db.Date`            | No       |      | Indexed            | Business event date                                      |
| `reason`               | `varchar(500)`   | `String @db.VarChar(500)`      | No       |      |                    | Required                                                 |
| `performed_by_user_id` | `uuid`           | `String @db.Uuid`              | No       | FK   | FK                 | Actor                                                    |
| `status`               | `varchar(30)`    | `String @db.VarChar(30)`       | No       |      |                    | History row status                                       |
| `created_at`           | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | No       |      |                    | Audit                                                    |
| `created_by`           | `uuid`           | `String @db.Uuid`              | No       | FK   | FK                 | Audit                                                    |
| `updated_at`           | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | No       |      |                    | Audit                                                    |
| `updated_by`           | `uuid`           | `String @db.Uuid`              | No       | FK   | FK                 | Audit                                                    |
| `deleted_at`           | `timestamptz(3)` | `DateTime? @db.Timestamptz(3)` | Yes      |      |                    | Normally null                                            |
| `is_deleted`           | `boolean`        | `Boolean`                      | No       |      |                    | Normally false                                           |

### Constraints

1. `reason` minimum 10 characters after trim.
2. For `Issued`, `new_id_card_number` required.
3. For `Reissued`, both old and new card numbers required and must differ.
4. `event_date <= CURRENT_DATE`.
5. History row immutable after insert except administrative correction.
6. `new_id_card_number` must match current `student_profiles.id_card_number` for latest issue/reissue event.

### Recommended Indexes

- `ix_student_id_card_history_student_event_date` (`student_profile_id`, `event_date` desc)
- `ix_student_id_card_history_branch_event_type` (`branch_id`, `event_type`, `event_date` desc)

---

# 4.4 `student_duplicate_cases`

### Purpose

Case header for duplicate detection and resolution workflow.

### Table Definition Summary

- PostgreSQL table: `student_duplicate_cases`
- Prisma model: `StudentDuplicateCase`

### Field Specification

| Field Name                  | PostgreSQL Type  | Prisma Type                    | Nullable | Keys   | Index / Constraint | Description                                                            |
| --------------------------- | ---------------- | ------------------------------ | -------- | ------ | ------------------ | ---------------------------------------------------------------------- |
| `id`                        | `uuid`           | `String @db.Uuid`              | No       | PK     | PK                 | Case identifier                                                        |
| `branch_id`                 | `uuid`           | `String @db.Uuid`              | No       | FK     | Indexed            | Branch where case was raised                                           |
| `case_number`               | `varchar(50)`    | `String @db.VarChar(50)`       | No       | Unique | Unique             | Human-readable case number                                             |
| `source_type`               | `varchar(30)`    | `String @db.VarChar(30)`       | No       |        | Indexed            | `Create`, `Update`, `BatchScan`, `ManualReview`, `CorporateConversion` |
| `source_student_profile_id` | `uuid`           | `String? @db.Uuid`             | Yes      | FK     | Indexed            | Existing student if update-triggered                                   |
| `source_person_id`          | `uuid`           | `String? @db.Uuid`             | Yes      | FK     | Indexed            | Person under review                                                    |
| `case_status`               | `varchar(30)`    | `String @db.VarChar(30)`       | No       |        | Indexed            | `Open`, `UnderReview`, `Merged`, `ResolvedNoDuplicate`, `Cancelled`    |
| `risk_level`                | `varchar(20)`    | `String @db.VarChar(20)`       | No       |        | Indexed            | `Low`, `Medium`, `High`, `Blocking`                                    |
| `trigger_summary`           | `varchar(500)`   | `String @db.VarChar(500)`      | No       |        |                    | Summary of why case opened                                             |
| `resolution_type`           | `varchar(30)`    | `String? @db.VarChar(30)`      | Yes      |        |                    | `KeepExisting`, `CreateNew`, `Merge`, `NotDuplicate`, `Cancelled`      |
| `resolution_reason`         | `varchar(1000)`  | `String? @db.VarChar(1000)`    | Yes      |        |                    | Mandatory when resolved                                                |
| `resolved_at`               | `timestamptz(3)` | `DateTime? @db.Timestamptz(3)` | Yes      |        | Indexed            | Resolution timestamp                                                   |
| `resolved_by`               | `uuid`           | `String? @db.Uuid`             | Yes      | FK     | FK                 | Resolver                                                               |
| `status`                    | `varchar(30)`    | `String @db.VarChar(30)`       | No       |        |                    | Record lifecycle                                                       |
| `created_at`                | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | No       |        | Indexed            | Audit                                                                  |
| `created_by`                | `uuid`           | `String @db.Uuid`              | No       | FK     | FK                 | Audit                                                                  |
| `updated_at`                | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | No       |        |                    | Audit                                                                  |
| `updated_by`                | `uuid`           | `String @db.Uuid`              | No       | FK     | FK                 | Audit                                                                  |
| `deleted_at`                | `timestamptz(3)` | `DateTime? @db.Timestamptz(3)` | Yes      |        |                    | Soft delete not normally used                                          |
| `is_deleted`                | `boolean`        | `Boolean`                      | No       |        |                    | Default false                                                          |

### Constraints

1. `case_number` unique.
2. `case_status` and `resolution_type` combination must be valid:
   - unresolved statuses require `resolution_type IS NULL`
   - resolved statuses require `resolution_type IS NOT NULL`
3. `resolution_reason` required when resolved.
4. `resolved_at` and `resolved_by` required when resolved.
5. `risk_level = 'Blocking'` prevents student creation or update until resolved.

### Recommended Indexes

- `ux_student_duplicate_cases_case_number` unique (`case_number`)
- `ix_student_duplicate_cases_branch_status` (`branch_id`, `case_status`, `created_at` desc)
- `ix_student_duplicate_cases_source_student` (`source_student_profile_id`)
- `ix_student_duplicate_cases_source_person` (`source_person_id`)
- `ix_student_duplicate_cases_risk` (`risk_level`, `case_status`)

---

# 4.5 `student_duplicate_case_items`

### Purpose

Candidate records attached to a duplicate case.

### Table Definition Summary

- PostgreSQL table: `student_duplicate_case_items`
- Prisma model: `StudentDuplicateCaseItem`

### Field Specification

| Field Name                     | PostgreSQL Type  | Prisma Type                    | Nullable | Keys | Index / Constraint | Description                                             |
| ------------------------------ | ---------------- | ------------------------------ | -------- | ---- | ------------------ | ------------------------------------------------------- |
| `id`                           | `uuid`           | `String @db.Uuid`              | No       | PK   | PK                 | Candidate row identifier                                |
| `duplicate_case_id`            | `uuid`           | `String @db.Uuid`              | No       | FK   | Indexed            | FK to `student_duplicate_cases.id`                      |
| `candidate_student_profile_id` | `uuid`           | `String? @db.Uuid`             | Yes      | FK   | Indexed            | Candidate existing student                              |
| `candidate_person_id`          | `uuid`           | `String? @db.Uuid`             | Yes      | FK   | Indexed            | Candidate person if no student exists yet               |
| `candidate_branch_id`          | `uuid`           | `String? @db.Uuid`             | Yes      | FK   | Indexed            | Branch of candidate student                             |
| `match_score`                  | `numeric(5,2)`   | `Decimal @db.Decimal(5,2)`     | No       |      | Indexed            | 0.00 to 100.00                                          |
| `match_reasons`                | `jsonb`          | `Json`                         | No       |      | GIN optional       | Structured reasons like phone/email/identity/name match |
| `resolution_decision`          | `varchar(30)`    | `String? @db.VarChar(30)`      | Yes      |      |                    | `Survivor`, `MergeInto`, `Ignore`, `ReviewOnly`         |
| `is_primary_candidate`         | `boolean`        | `Boolean`                      | No       |      |                    | Highest-confidence candidate flag                       |
| `status`                       | `varchar(30)`    | `String @db.VarChar(30)`       | No       |      |                    | Candidate row lifecycle                                 |
| `created_at`                   | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | No       |      |                    | Audit                                                   |
| `created_by`                   | `uuid`           | `String @db.Uuid`              | No       | FK   | FK                 | Audit                                                   |
| `updated_at`                   | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | No       |      |                    | Audit                                                   |
| `updated_by`                   | `uuid`           | `String @db.Uuid`              | No       | FK   | FK                 | Audit                                                   |
| `deleted_at`                   | `timestamptz(3)` | `DateTime? @db.Timestamptz(3)` | Yes      |      |                    | Soft delete                                             |
| `is_deleted`                   | `boolean`        | `Boolean`                      | No       |      |                    | Default false                                           |

### Constraints

1. At least one of `candidate_student_profile_id` or `candidate_person_id` must be present.
2. `match_score` between 0 and 100 inclusive.
3. Candidate rows belong to one duplicate case.
4. Only one `is_primary_candidate = true` per case.
5. Duplicate same candidate should not be inserted twice for same case.

### Recommended Indexes

- `ix_student_duplicate_case_items_case_score` (`duplicate_case_id`, `match_score` desc)
- `ux_student_duplicate_case_items_case_student` unique (`duplicate_case_id`, `candidate_student_profile_id`) where `candidate_student_profile_id IS NOT NULL`
- `ux_student_duplicate_case_items_case_person` unique (`duplicate_case_id`, `candidate_person_id`) where `candidate_person_id IS NOT NULL`

---

# 4.6 `student_merge_logs`

### Purpose

Immutable record of duplicate merge execution, survivor/source mapping, and reassignment scope.

### Table Definition Summary

- PostgreSQL table: `student_merge_logs`
- Prisma model: `StudentMergeLog`

### Field Specification

| Field Name                     | PostgreSQL Type  | Prisma Type                    | Nullable | Keys | Index / Constraint | Description                                            |
| ------------------------------ | ---------------- | ------------------------------ | -------- | ---- | ------------------ | ------------------------------------------------------ |
| `id`                           | `uuid`           | `String @db.Uuid`              | No       | PK   | PK                 | Merge log identifier                                   |
| `branch_id`                    | `uuid`           | `String @db.Uuid`              | No       | FK   | Indexed            | Branch from which merge was executed                   |
| `duplicate_case_id`            | `uuid`           | `String? @db.Uuid`             | Yes      | FK   | Indexed            | Optional source duplicate case                         |
| `survivor_student_profile_id`  | `uuid`           | `String @db.Uuid`              | No       | FK   | Indexed            | Record retained                                        |
| `source_student_profile_id`    | `uuid`           | `String @db.Uuid`              | No       | FK   | Indexed            | Record archived into survivor                          |
| `merge_reason`                 | `varchar(1000)`  | `String @db.VarChar(1000)`     | No       |      |                    | Mandatory                                              |
| `merged_at`                    | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | No       |      | Indexed            | Merge timestamp                                        |
| `merged_by`                    | `uuid`           | `String @db.Uuid`              | No       | FK   | FK                 | Actor                                                  |
| `reassigned_admissions_count`  | `integer`        | `Int`                          | No       |      |                    | Snapshot count                                         |
| `reassigned_enrollments_count` | `integer`        | `Int`                          | No       |      |                    | Snapshot count                                         |
| `reassigned_documents_count`   | `integer`        | `Int`                          | No       |      |                    | Snapshot count                                         |
| `reassigned_other_refs_count`  | `integer`        | `Int`                          | No       |      |                    | Snapshot count                                         |
| `merge_payload`                | `jsonb`          | `Json`                         | No       |      | GIN optional       | Before/after field survivor choices                    |
| `status`                       | `varchar(30)`    | `String @db.VarChar(30)`       | No       |      |                    | `Completed`, `RolledBackAdministrative` if ever needed |
| `created_at`                   | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | No       |      |                    | Audit                                                  |
| `created_by`                   | `uuid`           | `String @db.Uuid`              | No       | FK   | FK                 | Audit                                                  |
| `updated_at`                   | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | No       |      |                    | Audit                                                  |
| `updated_by`                   | `uuid`           | `String @db.Uuid`              | No       | FK   | FK                 | Audit                                                  |
| `deleted_at`                   | `timestamptz(3)` | `DateTime? @db.Timestamptz(3)` | Yes      |      |                    | Normally null                                          |
| `is_deleted`                   | `boolean`        | `Boolean`                      | No       |      |                    | Normally false                                         |

### Constraints

1. `survivor_student_profile_id <> source_student_profile_id`.
2. `merge_reason` minimum 20 characters after trim.
3. Source student must be archived/soft deleted as part of completed merge.
4. Merge log immutable after completion except controlled administrative annotation.
5. One source student should not be merged more than once into different survivors while active.

### Recommended Indexes

- `ix_student_merge_logs_survivor` (`survivor_student_profile_id`, `merged_at` desc)
- `ix_student_merge_logs_source` (`source_student_profile_id`)
- `ix_student_merge_logs_branch_date` (`branch_id`, `merged_at` desc)
- `ix_student_merge_logs_case` (`duplicate_case_id`)

---

# 4.7 `student_export_logs`

### Purpose

Tracks export requests of student data for audit, privacy, and operational monitoring.

### Table Definition Summary

- PostgreSQL table: `student_export_logs`
- Prisma model: `StudentExportLog`

### Field Specification

| Field Name                 | PostgreSQL Type  | Prisma Type                    | Nullable | Keys | Index / Constraint | Description                                            |
| -------------------------- | ---------------- | ------------------------------ | -------- | ---- | ------------------ | ------------------------------------------------------ |
| `id`                       | `uuid`           | `String @db.Uuid`              | No       | PK   | PK                 | Export log identifier                                  |
| `branch_id`                | `uuid`           | `String @db.Uuid`              | No       | FK   | Indexed            | Branch context of export                               |
| `requested_by`             | `uuid`           | `String @db.Uuid`              | No       | FK   | Indexed            | User requesting export                                 |
| `export_scope`             | `varchar(30)`    | `String @db.VarChar(30)`       | No       |      |                    | `CurrentPage`, `AllFiltered`, `SelectedRows`           |
| `export_format`            | `varchar(10)`    | `String @db.VarChar(10)`       | No       |      |                    | `CSV`, `XLSX`                                          |
| `filter_snapshot`          | `jsonb`          | `Json`                         | No       |      | GIN optional       | Effective filter criteria                              |
| `row_count`                | `integer`        | `Int`                          | No       |      |                    | Number of rows exported                                |
| `included_masked_identity` | `boolean`        | `Boolean`                      | No       |      |                    | Whether sensitive masked identity fields were included |
| `reason`                   | `varchar(500)`   | `String? @db.VarChar(500)`     | Yes      |      |                    | Mandatory when sensitive identity included             |
| `export_status`            | `varchar(30)`    | `String @db.VarChar(30)`       | No       |      | Indexed            | `Completed`, `Failed`, `Queued`                        |
| `exported_at`              | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | No       |      | Indexed            | Completion/request time                                |
| `file_reference`           | `varchar(500)`   | `String? @db.VarChar(500)`     | Yes      |      |                    | Storage reference if generated file retained           |
| `status`                   | `varchar(30)`    | `String @db.VarChar(30)`       | No       |      |                    | Record lifecycle                                       |
| `created_at`               | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | No       |      |                    | Audit                                                  |
| `created_by`               | `uuid`           | `String @db.Uuid`              | No       | FK   | FK                 | Audit                                                  |
| `updated_at`               | `timestamptz(3)` | `DateTime @db.Timestamptz(3)`  | No       |      |                    | Audit                                                  |
| `updated_by`               | `uuid`           | `String @db.Uuid`              | No       | FK   | FK                 | Audit                                                  |
| `deleted_at`               | `timestamptz(3)` | `DateTime? @db.Timestamptz(3)` | Yes      |      |                    | Soft delete, normally unused                           |
| `is_deleted`               | `boolean`        | `Boolean`                      | No       |      |                    | Default false                                          |

### Constraints

1. `reason` required when `included_masked_identity = true`.
2. `row_count >= 0`.
3. Filter snapshot must store effective branch and consolidated flag state.
4. Export logs are append-only for audit; status may update from `Queued` to terminal state.

### Recommended Indexes

- `ix_student_export_logs_branch_exported_at` (`branch_id`, `exported_at` desc)
- `ix_student_export_logs_requested_by` (`requested_by`, `exported_at` desc)
- `ix_student_export_logs_status` (`export_status`, `exported_at` desc)

---

## 5. Relationship Model

## 5.1 Owned Internal Relationships

| Parent Entity             | Child Entity                     | Cardinality                 | FK                                               | Delete Rule              | Update Rule                         | Notes                                            |
| ------------------------- | -------------------------------- | --------------------------- | ------------------------------------------------ | ------------------------ | ----------------------------------- | ------------------------------------------------ |
| `student_profiles`        | `student_status_history`         | 1:N                         | `student_status_history.student_profile_id`      | RESTRICT physical delete | CASCADE update not required on UUID | Student cannot be hard-deleted; history retained |
| `student_profiles`        | `student_id_card_history`        | 1:N                         | `student_id_card_history.student_profile_id`     | RESTRICT                 | No action                           | Immutable event history                          |
| `student_duplicate_cases` | `student_duplicate_case_items`   | 1:N                         | `student_duplicate_case_items.duplicate_case_id` | RESTRICT                 | No action                           | Candidate rows retained for audit                |
| `student_duplicate_cases` | `student_merge_logs`             | 1:N or 1:0..1 operationally | `student_merge_logs.duplicate_case_id`           | SET NULL or RESTRICT     | No action                           | Keep merge log even if case archived             |
| `student_profiles`        | `student_merge_logs` as survivor | 1:N                         | `student_merge_logs.survivor_student_profile_id` | RESTRICT                 | No action                           | Survivor may appear in many merge logs           |
| `student_profiles`        | `student_merge_logs` as source   | 1:0..1 typical              | `student_merge_logs.source_student_profile_id`   | RESTRICT                 | No action                           | Source usually merged once                       |
| `branches`                | `student_profiles`               | 1:N                         | `student_profiles.branch_id`                     | RESTRICT                 | No action                           | Prevent branch removal if students exist         |
| `branches`                | `student_status_history`         | 1:N                         | `student_status_history.branch_id`               | RESTRICT                 | No action                           | Branch-scoped audit history                      |
| `branches`                | `student_id_card_history`        | 1:N                         | `student_id_card_history.branch_id`              | RESTRICT                 | No action                           | Branch-scoped event history                      |
| `branches`                | `student_duplicate_cases`        | 1:N                         | `student_duplicate_cases.branch_id`              | RESTRICT                 | No action                           | Branch-scoped case management                    |
| `branches`                | `student_export_logs`            | 1:N                         | `student_export_logs.branch_id`                  | RESTRICT                 | No action                           | Branch-scoped export history                     |

## 5.2 External Reference Relationships

| Referenced External Entity | Owned Entity          | Cardinality                                 | FK Column                              | Delete Rule | Update Rule | Notes                                                     |
| -------------------------- | --------------------- | ------------------------------------------- | -------------------------------------- | ----------- | ----------- | --------------------------------------------------------- |
| `persons`                  | `student_profiles`    | 1:0..1                                      | `person_id`                            | RESTRICT    | No action   | Person cannot be removed if student exists                |
| `admissions`               | `student_profiles`    | 1:0..N from admission viewpoint             | `source_admission_id`                  | RESTRICT    | No action   | Admission-owned lifecycle                                 |
| `corporate_participants`   | `student_profiles`    | 1:0..1 or 1:N historically by design choice | `source_corporate_participant_id`      | RESTRICT    | No action   | Maintain conversion trace                                 |
| `users`                    | all owned tables      | 1:N                                         | audit FK columns                       | RESTRICT    | No action   | Keep actor trace forever                                  |
| `audit_logs`               | logical relation only | 1:N                                         | not enforced FK back from owned tables | n/a         | n/a         | Central audit sink records events emitted by this context |

## 5.3 Cascading and Restrict Policy Summary

1. **Physical cascade delete is not used** because this module disallows hard delete.
2. **RESTRICT** is the default FK delete behavior for identity and audit-preserving relationships.
3. **SET NULL** may be used only for optional analytical references where historical child rows must remain even if parent archive semantics change, but for this module RESTRICT is preferred for most relations.
4. Merge does not physically move or delete owned history rows; instead:
   - source `student_profiles` row becomes archived,
   - related external references are reassigned by owning contexts or controlled database transaction,
   - merge details stored in `student_merge_logs`.

---

## 6. Constraints and Validation Rules at Database Level

## 6.1 Student Identity Uniqueness

Because person data is externally owned, the following uniqueness protections are implemented in this context:

- one non-deleted student profile per person,
- one non-deleted student number per student profile,
- one non-deleted current ID card number per student.

## 6.2 Status and Effective-Date Integrity

- status history date windows cannot be inverted,
- student effective dates cannot be inverted,
- archived records must set delete markers.

## 6.3 Duplicate Workflow Integrity

- duplicate case resolution metadata required on closure,
- one primary candidate per case,
- no duplicate candidate row for same case and same target entity.

## 6.4 Merge Integrity

- survivor and source cannot match,
- merge source cannot remain active after completed merge,
- merge operation must be transactionally consistent with reassignment and audit event creation.

## 6.5 Export Audit Integrity

- export logs are append-only,
- sensitive export reason required when masked identity fields are included.

---

## 7. Suggested PostgreSQL DDL Notes

The final migration should use:

1. Partial unique indexes for soft-delete aware uniqueness.
2. Check constraints for enum-like bounded statuses where lookup-table indirection is not required at database level.
3. GIN indexes for `jsonb` diagnostic and filter fields where search is needed, especially:
   - `student_duplicate_case_items.match_reasons`
   - `student_merge_logs.merge_payload`
   - `student_export_logs.filter_snapshot`
4. `timestamptz` for audit timestamps and `date` for business dates.

---

## 8. CRUD Matrix

Legend:

- **C** = Create
- **R** = Read
- **U** = Update
- **D** = Soft Delete / Archive only
- **A** = Audit / View sensitive history
- **—** = Not allowed

Branch scope terms:

- **Own Branch** = only records where actor is assigned to that branch
- **Assigned Branches** = any branch assigned through user-branch access
- **Consolidated** = multiple assigned branches only when permission allows
- **System Scoped** = background job or internal service using explicit branch in payload

### 8.1 Human Actor CRUD Matrix

| Actor                          | student_profiles | student_status_history | student_id_card_history | student_duplicate_cases | student_duplicate_case_items | student_merge_logs | student_export_logs | Branch-Scoping Logic                                                     |
| ------------------------------ | ---------------- | ---------------------- | ----------------------- | ----------------------- | ---------------------------- | ------------------ | ------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Front Desk Executive           | C,R,U            | R                      | R                       | R                       | R                            | —                  | —                   | C,R                                                                      | Own branch only; cannot view cross-branch unless explicitly assigned                  |
| Admission Counselor            | C,R,U            | R                      | —                       | R                       | R                            | —                  | —                   | R                                                                        | Assigned branches only; typically create from approved admission, no archive          |
| Student Administration Officer | C,R,U,D,A        | C,R,A                  | C,R,A                   | C,R,U,A                 | C,R,U,A                      | C,R,A              | C,R,A               | Assigned branches; consolidated only with reporting permission           |
| Branch Manager                 | R,U,D,A          | C,R,A                  | R,A                     | R,U,A                   | R,U,A                        | C,R,A              | R,A                 | Own branch and child branches only if branch hierarchy permission allows |
| Compliance Officer             | R,A              | R,A                    | R,A                     | C,R,U,A                 | C,R,U,A                      | R,A                | R,A                 | Assigned branches; consolidated by explicit compliance permission        |
| Corporate Coordinator          | C,R,U            | R                      | —                       | R                       | R                            | —                  | —                   | —                                                                        | Only for corporate-origin students within assigned branches                           |
| Finance Officer                | R                | —                      | —                       | —                       | —                            | —                  | —                   | —                                                                        | Read-only lookup within assigned branches; no identity-sensitive audit unless allowed |
| Trainer                        | R                | —                      | —                       | —                       | —                            | —                  | —                   | —                                                                        | Read-only roster-context access for students linked to trainer’s batches only         |
| Reporting User                 | R,A              | R,A                    | R,A                     | R,A                     | R,A                          | R,A                | C,R,A               | Consolidated read only when dashboard/report permission grants it        |
| Institute Admin / Super Admin  | C,R,U,D,A        | C,R,A                  | C,R,A                   | C,R,U,A                 | C,R,U,A                      | C,R,A              | C,R,A               | All branches within institute; still no hard delete                      |
| Student (portal self-view)     | R                | —                      | R limited               | —                       | —                            | —                  | —                   | —                                                                        | Only own linked student profile; no branch-browsing                                   |
| Corporate Client Portal User   | —                | —                      | —                       | —                       | —                            | —                  | —                   | —                                                                        | Not applicable in this module                                                         |
| Unauthorized User              | —                | —                      | —                       | —                       | —                            | —                  | —                   | —                                                                        | No access                                                                             |

### 8.2 System Actor CRUD Matrix

| System Actor                     | student_profiles       | student_status_history | student_id_card_history | student_duplicate_cases | student_duplicate_case_items | student_merge_logs | student_export_logs | Branch-Scoping Logic                                                                      |
| -------------------------------- | ---------------------- | ---------------------- | ----------------------- | ----------------------- | ---------------------------- | ------------------ | ------------------- | ----------------------------------------------------------------------------------------- |
| Admission Service / Module       | C,R,U                  | C,R                    | —                       | C,R                     | C,R                          | —                  | —                   | System scoped to admission branch in payload                                              |
| Corporate Training Module        | C,R,U                  | C,R                    | —                       | C,R                     | C,R                          | —                  | —                   | System scoped to target enrollment branch                                                 |
| Online Registration Handoff      | C,R                    | C,R                    | —                       | C,R                     | C,R                          | —                  | —                   | System scoped to resolved registration branch                                             |
| Walk-In Enrollment Handoff       | C,R                    | C,R                    | —                       | C,R                     | C,R                          | —                  | —                   | System scoped to walk-in counter branch                                                   |
| Enrollment Module                | R                      | R                      | R limited               | —                       | —                            | R                  | —                   | Read by branch of enrollment and consolidated only if internal permission contract allows |
| Document Module                  | R                      | —                      | —                       | —                       | —                            | —                  | —                   | Lookup only; no mutation of student records                                               |
| Audit Service / Module           | R                      | R                      | R                       | R                       | R                            | R                  | R                   | System-wide read for audit ingestion and investigation                                    |
| Reporting / Dashboard Projection | R                      | R                      | R                       | R                       | R                            | R                  | R                   | Consolidated read only through reporting pipeline                                         |
| Export Job Processor             | R                      | —                      | —                       | —                       | —                            | —                  | C,U,R               | Uses explicit branch and filter snapshot from export request                              |
| Duplicate Detection Job          | R,U                    | —                      | —                       | C,U,R                   | C,U,R                        | —                  | —                   | Scoped per branch batch or institute-approved consolidated scan                           |
| Numbering Series Service         | U internal side effect | —                      | —                       | —                       | —                            | —                  | —                   | No independent data access; invoked during student create                                 |
| Merge Orchestrator               | U                      | C,R                    | C,R                     | U,R                     | U,R                          | C,R                | —                   | Runs with elevated service permission; branch taken from survivor/source validation       |

---

## 9. Actor Action Interpretation Notes

1. **Front Desk Executive**
   - Can create direct registrations and read student profiles in own branch.
   - Cannot archive, restore, merge, or view sensitive audit diffs unless explicitly elevated.

2. **Admission Counselor**
   - Can create or link student profiles from approved admissions.
   - Can update limited profile fields before enrollment confirmation, but cannot merge or archive.

3. **Student Administration Officer**
   - Primary operational owner of student master maintenance.
   - Can perform duplicate resolution, merge, archival, restore, status change, ID card maintenance, and export.

4. **Branch Manager**
   - Primarily approval and supervision role.
   - Reads all student activity in managed branch scope and can approve status/archive/merge operations where workflow demands.

5. **Compliance Officer**
   - Focused on audit, duplicate investigation, and sensitive history review.
   - Usually read-heavy, but can maintain duplicate cases and resolution annotations.

6. **Trainer**
   - Only contextual read access to students already associated with trainer-visible batches.

7. **Reporting User**
   - Read-only across permitted branches.
   - May create export log records through reporting export actions but cannot mutate students.

8. **System Actors**
   - Must still enforce branch context from payload and integration contract.
   - No service may perform institute-wide reads unless explicitly configured.

---

## 10. Recommended Prisma Relation Summary

```prisma
model StudentProfile {
  id                String               @id @db.Uuid
  personId          String               @unique @db.Uuid
  branchId          String               @db.Uuid
  sourceAdmissionId String?              @db.Uuid
  statusHistory     StudentStatusHistory[]
  idCardHistory     StudentIdCardHistory[]
  mergeLogsAsSurvivor StudentMergeLog[]  @relation("StudentMergeSurvivor")
  mergeLogsAsSource   StudentMergeLog[]  @relation("StudentMergeSource")
}

model StudentStatusHistory {
  id               String        @id @db.Uuid
  studentProfileId String        @db.Uuid
  studentProfile   StudentProfile @relation(fields: [studentProfileId], references: [id], onDelete: Restrict)
}

model StudentIdCardHistory {
  id               String        @id @db.Uuid
  studentProfileId String        @db.Uuid
  studentProfile   StudentProfile @relation(fields: [studentProfileId], references: [id], onDelete: Restrict)
}

model StudentDuplicateCase {
  id          String                    @id @db.Uuid
  items       StudentDuplicateCaseItem[]
  mergeLogs   StudentMergeLog[]
}

model StudentDuplicateCaseItem {
  id              String               @id @db.Uuid
  duplicateCaseId String               @db.Uuid
  duplicateCase   StudentDuplicateCase @relation(fields: [duplicateCaseId], references: [id], onDelete: Restrict)
}

model StudentMergeLog {
  id                       String         @id @db.Uuid
  duplicateCaseId          String?        @db.Uuid
  survivorStudentProfileId String         @db.Uuid
  sourceStudentProfileId   String         @db.Uuid
  duplicateCase            StudentDuplicateCase? @relation(fields: [duplicateCaseId], references: [id], onDelete: Restrict)
  survivor                 StudentProfile @relation("StudentMergeSurvivor", fields: [survivorStudentProfileId], references: [id], onDelete: Restrict)
  source                   StudentProfile @relation("StudentMergeSource", fields: [sourceStudentProfileId], references: [id], onDelete: Restrict)
}
```

---

## 11. Final Modeling Decisions

1. `StudentProfile` is the only aggregate root owned by this context.
2. History/workbench tables are **append-only or operationally immutable** wherever possible.
3. Branch scope is denormalized into history and case tables for efficient permission-safe querying.
4. Soft delete aware uniqueness is mandatory.
5. Merge is modeled as archival plus survivor mapping, never hard delete.
6. External entities remain referenced, not duplicated, preserving DDD ownership boundaries.
7. Audit columns are present in every owned table, even when central audit also records the action.
8. Effective dates are mandatory for student status history and available on student profile for lifecycle governance.
