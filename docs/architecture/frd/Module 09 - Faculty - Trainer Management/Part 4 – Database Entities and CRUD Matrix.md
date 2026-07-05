# Part 4 – Database Entities and CRUD Matrix

## Module 09 – Faculty / Trainer Management

**Module Code:** FTM  
**Bounded Context:** Faculty / Trainer Management  
**Architecture Style:** TypeScript/Next.js modular monolith  
**Database:** PostgreSQL  
**ORM:** Prisma  
**Default Business Timezone:** Oman GST (`Asia/Muscat`, UTC+4)

---

## 1. Purpose

This document defines the persistence model and CRUD authorization matrix for the Faculty / Trainer Management bounded context. It is the database implementation companion to the Module 09 business requirements, workflows, API contracts, permission model, validation catalog, security architecture, and operational runbooks.

The context owns exactly these operational persistence models:

1. `TrainerProfile`
2. `TrainerQualification`
3. `TrainerAvailability`
4. `TrainerCourseAuthorization`
5. `TrainerCompensationRate`

The following referenced models are **not owned** by this context:

- `Person` — shared Party / Person identity model;
- `Branch` — Organization Management;
- `Course` — Course Catalog Management;
- `Batch` — Training Delivery Management;
- `Session` — Training Delivery Management;
- `Document` — Document Management;
- `User` — Identity & Access Management;
- `AuditLog` — Audit & Compliance.

Module 09 may hold foreign keys to these external models but shall not duplicate or mutate their owned business data through Trainer Management persistence operations.

---

# 2. Persistence Conventions

## 2.1 Primary Keys

All owned tables use application-generated CUID string identifiers.

| Concern | PostgreSQL | Prisma |
|---|---|---|
| Primary identifier | `text` | `String @id @default(cuid())` |

The same identifier strategy must be used consistently with the existing project schema. If the project-wide Prisma schema uses native PostgreSQL UUIDs instead, all five models shall use `uuid` / `String @db.Uuid` consistently; mixed identifier strategies are not allowed inside the context.

## 2.2 Audit Columns

Every owned table shall contain the following columns:

| Field | PostgreSQL | Prisma | Null | Rule |
|---|---|---|---:|---|
| `createdAt` | `timestamptz` | `DateTime @default(now()) @db.Timestamptz(6)` | No | Set once on insert. |
| `createdBy` | `text` | `String` | No | FK to IAM `User.id`; immutable after insert. |
| `updatedAt` | `timestamptz` | `DateTime @updatedAt @db.Timestamptz(6)` | No | Updated on mutation. |
| `updatedBy` | `text` | `String` | No | FK to IAM `User.id`; updated on every mutation. |
| `deletedAt` | `timestamptz` | `DateTime? @db.Timestamptz(6)` | Yes | Set when soft-deleted. |
| `isDeleted` | `boolean` | `Boolean @default(false)` | No | Normal reads require `false`. |

Additional concurrency column:

| Field | PostgreSQL | Prisma | Null | Rule |
|---|---|---|---:|---|
| `version` | `integer` | `Int @default(1)` | No | Incremented atomically on successful update; required for optimistic concurrency. |

`deletedAt` and `isDeleted` must remain consistent:

```text
isDeleted = false  => deletedAt IS NULL
isDeleted = true   => deletedAt IS NOT NULL
```

A PostgreSQL check constraint shall enforce this relationship for all owned tables.

## 2.3 Effective-Dating Convention

Effective-dated models use:

| Field | PostgreSQL | Prisma | Null | Meaning |
|---|---|---|---:|---|
| `effectiveStartDate` | `date` | `DateTime @db.Date` | No | First business date on which the row may apply. |
| `effectiveEndDate` | `date` | `DateTime? @db.Date` | Yes | Last inclusive business date; `NULL` means open-ended. |
| `status` | enum-backed type | Prisma enum | No | Administrative lifecycle state. |

Required database constraint:

```sql
CHECK (
  "effectiveEndDate" IS NULL
  OR "effectiveEndDate" >= "effectiveStartDate"
)
```

A row is operationally effective for business date `D` only when:

```text
isDeleted = false
AND effectiveStartDate <= D
AND (effectiveEndDate IS NULL OR effectiveEndDate >= D)
AND status is an effective state for the entity
```

Application logic must use Oman GST business dates when converting timestamps to dates.

## 2.4 Soft Delete

No owned business row may be physically deleted through normal application use. Application-level Delete means:

```text
isDeleted = true
deletedAt = current timestamp in UTC storage
updatedAt = current timestamp
updatedBy = authenticated actor user ID
version = version + 1
```

The corresponding audit event is written by the Audit & Compliance integration boundary.

Physical purge is not a Module 09 business operation and may only occur under an approved platform retention process outside this module.

## 2.5 Foreign-Key Delete Policy

All foreign keys from Module 09 owned records to external owning contexts use `ON DELETE RESTRICT` / Prisma `onDelete: Restrict`.

Rationale:

- a Person with trainer history must not disappear;
- a Branch referenced by trainer history must not disappear;
- a Course with trainer authorization history must not disappear;
- a Batch or Session referenced by compensation history must not disappear;
- a Document referenced as qualification evidence must not disappear without first resolving the reference;
- a User referenced in audit metadata must not disappear.

Internal parent-child relationships use `ON DELETE RESTRICT` because the application uses soft deletion rather than cascading physical deletion.

## 2.6 Query Invariant

All normal repository methods shall apply:

```text
isDeleted = false
```

Methods that intentionally include deleted records must be explicitly named, restricted to audit/compliance or privileged recovery paths, and must not be reused by normal list, eligibility, authorization, or compensation-resolution queries.

---

# 3. Enumerations

## 3.1 `TrainerType`

```prisma
enum TrainerType {
  FullTime
  PartTime
  Freelance
}
```

## 3.2 `TrainerStatus`

```prisma
enum TrainerStatus {
  Inactive
  Active
  Suspended
}
```

Allowed lifecycle transitions:

```text
Inactive -> Active
Active -> Inactive
Active -> Suspended
Suspended -> Active
Suspended -> Inactive
```

`Suspended` is not a valid initial status.

## 3.3 `DayOfWeek`

```prisma
enum DayOfWeek {
  Monday
  Tuesday
  Wednesday
  Thursday
  Friday
  Saturday
  Sunday
}
```

The application shall not depend on PostgreSQL enum ordinal ordering for calendar calculations.

## 3.4 `TrainerAvailabilityStatus`

```prisma
enum TrainerAvailabilityStatus {
  Active
  Inactive
}
```

Availability uses administrative activation plus effective dates. Historical rows remain queryable for authorized audit paths.

## 3.5 `TrainerCourseAuthorizationStatus`

```prisma
enum TrainerCourseAuthorizationStatus {
  Inactive
  Active
  Suspended
  Expired
}
```

Allowed transitions:

```text
Inactive -> Active
Active -> Suspended
Active -> Inactive
Active -> Expired
Suspended -> Active
Suspended -> Inactive
Suspended -> Expired
```

`Expired -> Active` is prohibited. A new authorization period must be created.

## 3.6 `TrainerCompensationRateStatus`

```prisma
enum TrainerCompensationRateStatus {
  Active
  Inactive
}
```

## 3.7 `TrainerPaymentBasis`

```prisma
enum TrainerPaymentBasis {
  PerHour
  PerSession
  PerStudent
  Fixed
}
```

Presentation labels may be localized as “Per Hour”, “Per Session”, “Per Student”, and “Fixed”; persistence values remain stable identifiers.

---

# 4. Entity Specifications

## 4.1 `TrainerProfile`

### 4.1.1 Purpose

`TrainerProfile` represents the trainer-specific role profile for a canonical Person. It does not store canonical identity fields such as person name, Civil ID, passport, nationality, email, phone, or photo.

### 4.1.2 Field Specification

| Field | PostgreSQL Type | Prisma Type | Null | Key / Constraint | Description |
|---|---|---|---:|---|---|
| `id` | `text` | `String @id @default(cuid())` | No | PK | Trainer profile identifier. |
| `personId` | `text` | `String` | No | FK → `Person.id` | Canonical person reference. |
| `branchId` | `text` | `String` | No | FK → `Branch.id` | Operational home branch. |
| `trainerCode` | `varchar(30)` | `String @db.VarChar(30)` | No | Partial unique when not deleted | Human-readable trainer number/code. |
| `trainerType` | enum | `TrainerType` | No | Enum | `FullTime`, `PartTime`, or `Freelance`. |
| `specialization` | `varchar(500)` | `String @db.VarChar(500)` | No | Length constraint | Trainer professional specialization summary. |
| `qualificationSummary` | `varchar(1000)` | `String @db.VarChar(1000)` | Yes | Length constraint | Short denormalized summary for operational display; detailed qualifications remain child rows. |
| `status` | enum | `TrainerStatus` | No | State machine | Operational trainer status. |
| `effectiveStartDate` | `date` | `DateTime @db.Date` | No | Check with end date | First effective business date. |
| `effectiveEndDate` | `date` | `DateTime? @db.Date` | Yes | Check with start date | Last inclusive effective business date. |
| `createdAt` | `timestamptz` | `DateTime @default(now()) @db.Timestamptz(6)` | No | Audit | Creation timestamp. |
| `createdBy` | `text` | `String` | No | FK → `User.id` | Creator. |
| `updatedAt` | `timestamptz` | `DateTime @updatedAt @db.Timestamptz(6)` | No | Audit | Last modification timestamp. |
| `updatedBy` | `text` | `String` | No | FK → `User.id` | Last modifier. |
| `deletedAt` | `timestamptz` | `DateTime? @db.Timestamptz(6)` | Yes | Soft-delete consistency check | Deletion timestamp. |
| `isDeleted` | `boolean` | `Boolean @default(false)` | No | Indexed | Soft-delete flag. |
| `version` | `integer` | `Int @default(1)` | No | `CHECK version >= 1` | Optimistic concurrency token. |

### 4.1.3 Indexes

```sql
CREATE UNIQUE INDEX uq_trainer_profile_person_active
ON "TrainerProfile" ("personId")
WHERE "isDeleted" = false;

CREATE UNIQUE INDEX uq_trainer_profile_code_active
ON "TrainerProfile" ("trainerCode")
WHERE "isDeleted" = false;

CREATE INDEX ix_trainer_profile_branch_status
ON "TrainerProfile" ("branchId", "status")
WHERE "isDeleted" = false;

CREATE INDEX ix_trainer_profile_type
ON "TrainerProfile" ("trainerType")
WHERE "isDeleted" = false;

CREATE INDEX ix_trainer_profile_effective
ON "TrainerProfile" ("effectiveStartDate", "effectiveEndDate")
WHERE "isDeleted" = false;

CREATE INDEX ix_trainer_profile_updated
ON "TrainerProfile" ("updatedAt" DESC);
```

### 4.1.4 Constraints

1. A Person may have at most one non-deleted TrainerProfile.
2. `trainerCode` is unique among non-deleted profiles.
3. `trainerType` is limited to the defined enum.
4. `effectiveEndDate >= effectiveStartDate` when end date is present.
5. Initial status is `Inactive` or `Active`; `Suspended` is prohibited on create.
6. Activation is not effective before `effectiveStartDate` and not after `effectiveEndDate`.
7. Soft deletion is blocked while active or future `BatchTrainer` or `Session` references exist.
8. Updates require a matching `version` and atomically increment it.
9. Person-owned identity attributes cannot be persisted in this table.

### 4.1.5 Prisma Model Shape

```prisma
model TrainerProfile {
  id                   String        @id @default(cuid())
  personId             String
  branchId             String
  trainerCode          String        @db.VarChar(30)
  trainerType          TrainerType
  specialization       String        @db.VarChar(500)
  qualificationSummary String?       @db.VarChar(1000)
  status               TrainerStatus
  effectiveStartDate   DateTime      @db.Date
  effectiveEndDate     DateTime?     @db.Date

  createdAt            DateTime      @default(now()) @db.Timestamptz(6)
  createdBy            String
  updatedAt            DateTime      @updatedAt @db.Timestamptz(6)
  updatedBy            String
  deletedAt            DateTime?     @db.Timestamptz(6)
  isDeleted            Boolean       @default(false)
  version              Int           @default(1)

  person               Person        @relation(fields: [personId], references: [id], onDelete: Restrict, onUpdate: Cascade)
  branch               Branch        @relation(fields: [branchId], references: [id], onDelete: Restrict, onUpdate: Cascade)

  qualifications       TrainerQualification[]
  availabilities       TrainerAvailability[]
  courseAuthorizations TrainerCourseAuthorization[]
  compensationRates    TrainerCompensationRate[]

  @@index([branchId, status])
  @@index([trainerType])
  @@index([effectiveStartDate, effectiveEndDate])
  @@index([isDeleted])
  @@index([updatedAt])
}
```

The two conditional uniqueness constraints must be added through SQL migration because partial unique indexes are not represented directly by standard Prisma schema syntax.

---

## 4.2 `TrainerQualification`

### 4.2.1 Purpose

Stores structured trainer qualification metadata. Qualification evidence is referenced by `documentId`; actual file storage, verification state, expiry processing, and approval/rejection are owned by Document Management.

### 4.2.2 Field Specification

| Field | PostgreSQL Type | Prisma Type | Null | Key / Constraint | Description |
|---|---|---|---:|---|---|
| `id` | `text` | `String @id @default(cuid())` | No | PK | Qualification identifier. |
| `trainerId` | `text` | `String` | No | FK → `TrainerProfile.id` | Parent trainer. |
| `qualificationName` | `varchar(200)` | `String @db.VarChar(200)` | No | Nonblank | Qualification or certification name. |
| `institution` | `varchar(200)` | `String @db.VarChar(200)` | No | Nonblank | Awarding institution. |
| `yearCompleted` | `smallint` | `Int @db.SmallInt` | No | Range check | Completion year; cannot exceed current Oman business year. |
| `documentId` | `text` | `String?` | Yes | FK → `Document.id` | Optional supporting evidence reference. |
| `createdAt` | `timestamptz` | `DateTime @default(now()) @db.Timestamptz(6)` | No | Audit | Creation timestamp. |
| `createdBy` | `text` | `String` | No | FK → `User.id` | Creator. |
| `updatedAt` | `timestamptz` | `DateTime @updatedAt @db.Timestamptz(6)` | No | Audit | Last modification timestamp. |
| `updatedBy` | `text` | `String` | No | FK → `User.id` | Last modifier. |
| `deletedAt` | `timestamptz` | `DateTime? @db.Timestamptz(6)` | Yes | Soft-delete consistency | Deletion timestamp. |
| `isDeleted` | `boolean` | `Boolean @default(false)` | No | Indexed | Soft-delete flag. |
| `version` | `integer` | `Int @default(1)` | No | `CHECK version >= 1` | Concurrency token. |

### 4.2.3 Indexes

```sql
CREATE INDEX ix_trainer_qualification_trainer
ON "TrainerQualification" ("trainerId")
WHERE "isDeleted" = false;

CREATE INDEX ix_trainer_qualification_document
ON "TrainerQualification" ("documentId")
WHERE "documentId" IS NOT NULL AND "isDeleted" = false;

CREATE INDEX ix_trainer_qualification_year
ON "TrainerQualification" ("yearCompleted" DESC)
WHERE "isDeleted" = false;

CREATE UNIQUE INDEX uq_trainer_qualification_natural_active
ON "TrainerQualification" (
  "trainerId",
  lower("qualificationName"),
  lower("institution"),
  "yearCompleted"
)
WHERE "isDeleted" = false;
```

### 4.2.4 Constraints

1. `qualificationName` length: 2–200 characters after trimming.
2. `institution` length: 2–200 characters after trimming.
3. `yearCompleted` must be at least 1900 and not greater than the current Oman business calendar year; future-year validation is enforced in the application because a static database check cannot reference the current year reliably for immutable constraint semantics.
4. Duplicate non-deleted qualification records with the same trainer, normalized qualification name, normalized institution, and completion year are prohibited.
5. `documentId`, when supplied, must reference a valid non-deleted Document visible to the authorized branch/user context through the Document Management contract.
6. Module 09 does not persist document verification status.

### 4.2.5 Prisma Model Shape

```prisma
model TrainerQualification {
  id                String         @id @default(cuid())
  trainerId         String
  qualificationName String         @db.VarChar(200)
  institution       String         @db.VarChar(200)
  yearCompleted     Int            @db.SmallInt
  documentId        String?

  createdAt         DateTime       @default(now()) @db.Timestamptz(6)
  createdBy         String
  updatedAt         DateTime       @updatedAt @db.Timestamptz(6)
  updatedBy         String
  deletedAt         DateTime?      @db.Timestamptz(6)
  isDeleted         Boolean        @default(false)
  version           Int            @default(1)

  trainer           TrainerProfile @relation(fields: [trainerId], references: [id], onDelete: Restrict, onUpdate: Cascade)
  document          Document?      @relation(fields: [documentId], references: [id], onDelete: Restrict, onUpdate: Cascade)

  @@index([trainerId])
  @@index([documentId])
  @@index([yearCompleted])
  @@index([isDeleted])
}
```

The case-normalized partial natural-key uniqueness rule requires a SQL migration index.

---

## 4.3 `TrainerAvailability`

### 4.3.1 Purpose

Stores recurring weekly availability windows for a trainer, scoped to a branch and effective date period. It does not store scheduled assignments and does not replace Scheduling conflict validation.

### 4.3.2 Field Specification

| Field | PostgreSQL Type | Prisma Type | Null | Key / Constraint | Description |
|---|---|---|---:|---|---|
| `id` | `text` | `String @id @default(cuid())` | No | PK | Availability record identifier. |
| `trainerId` | `text` | `String` | No | FK → `TrainerProfile.id` | Trainer. |
| `branchId` | `text` | `String` | No | FK → `Branch.id` | Branch where availability applies. |
| `dayOfWeek` | enum | `DayOfWeek` | No | Enum | Recurring weekday. |
| `startTime` | `time(0)` | `DateTime @db.Time(0)` | No | Time check | Local Oman business time. |
| `endTime` | `time(0)` | `DateTime @db.Time(0)` | No | Time check | Local Oman business time. |
| `effectiveStartDate` | `date` | `DateTime @db.Date` | No | Effective-date check | First date of recurrence applicability. |
| `effectiveEndDate` | `date` | `DateTime? @db.Date` | Yes | Effective-date check | Last inclusive date of recurrence applicability. |
| `status` | enum | `TrainerAvailabilityStatus` | No | Effective-state control | `Active` or `Inactive`. |
| `createdAt` | `timestamptz` | `DateTime @default(now()) @db.Timestamptz(6)` | No | Audit | Creation timestamp. |
| `createdBy` | `text` | `String` | No | FK → `User.id` | Creator. |
| `updatedAt` | `timestamptz` | `DateTime @updatedAt @db.Timestamptz(6)` | No | Audit | Last modification timestamp. |
| `updatedBy` | `text` | `String` | No | FK → `User.id` | Last modifier. |
| `deletedAt` | `timestamptz` | `DateTime? @db.Timestamptz(6)` | Yes | Soft-delete consistency | Deletion timestamp. |
| `isDeleted` | `boolean` | `Boolean @default(false)` | No | Indexed | Soft-delete flag. |
| `version` | `integer` | `Int @default(1)` | No | Concurrency | Optimistic concurrency token. |

### 4.3.3 Indexes

```sql
CREATE INDEX ix_trainer_availability_lookup
ON "TrainerAvailability" (
  "trainerId",
  "branchId",
  "dayOfWeek",
  "status",
  "effectiveStartDate",
  "effectiveEndDate"
)
WHERE "isDeleted" = false;

CREATE INDEX ix_trainer_availability_branch_day
ON "TrainerAvailability" ("branchId", "dayOfWeek", "startTime", "endTime")
WHERE "isDeleted" = false AND "status" = 'Active';

CREATE INDEX ix_trainer_availability_effective
ON "TrainerAvailability" ("effectiveStartDate", "effectiveEndDate")
WHERE "isDeleted" = false;
```

### 4.3.4 Constraints

1. `startTime < endTime`.
2. Cross-midnight windows are prohibited in one row and must be represented as two records on adjacent weekdays.
3. `effectiveEndDate >= effectiveStartDate` when present.
4. Exact duplicate active windows are prohibited.
5. Overlapping active windows are prohibited for the same trainer, branch, weekday, and intersecting effective periods.
6. Availability lookup considers only non-deleted, `Active`, date-effective rows.
7. Proposed assignment interval must be fully contained within at least one effective availability window.
8. Schedule double-booking remains a Scheduling responsibility and is not inferred only from this table.
9. `branchId` must be within the actor's writable branch scope and must be compatible with the trainer's permitted operational branch rules.

### 4.3.5 Overlap Predicate

Two active rows `A` and `B` overlap when all are true:

```text
A.trainerId = B.trainerId
A.branchId = B.branchId
A.dayOfWeek = B.dayOfWeek
A.isDeleted = false
B.isDeleted = false
A.status = Active
B.status = Active
A.startTime < B.endTime
B.startTime < A.endTime
A.effectiveStartDate <= COALESCE(B.effectiveEndDate, infinity)
B.effectiveStartDate <= COALESCE(A.effectiveEndDate, infinity)
```

This rule must be enforced transactionally in the domain service. PostgreSQL exclusion constraints may be introduced only if they are compatible with the project migration strategy and enum/time/date representation; application enforcement remains mandatory for clear domain errors.

### 4.3.6 Prisma Model Shape

```prisma
model TrainerAvailability {
  id                 String                    @id @default(cuid())
  trainerId          String
  branchId           String
  dayOfWeek          DayOfWeek
  startTime          DateTime                  @db.Time(0)
  endTime            DateTime                  @db.Time(0)
  effectiveStartDate DateTime                  @db.Date
  effectiveEndDate   DateTime?                 @db.Date
  status             TrainerAvailabilityStatus

  createdAt          DateTime                  @default(now()) @db.Timestamptz(6)
  createdBy          String
  updatedAt          DateTime                  @updatedAt @db.Timestamptz(6)
  updatedBy          String
  deletedAt          DateTime?                 @db.Timestamptz(6)
  isDeleted          Boolean                   @default(false)
  version            Int                       @default(1)

  trainer            TrainerProfile            @relation(fields: [trainerId], references: [id], onDelete: Restrict, onUpdate: Cascade)
  branch             Branch                    @relation(fields: [branchId], references: [id], onDelete: Restrict, onUpdate: Cascade)

  @@index([trainerId, branchId, dayOfWeek, status, effectiveStartDate, effectiveEndDate])
  @@index([branchId, dayOfWeek, startTime, endTime])
  @@index([isDeleted])
}
```

---

## 4.4 `TrainerCourseAuthorization`

### 4.4.1 Purpose

Represents an effective-dated authorization for a trainer to deliver a Course. The row references Course Catalog data but does not own or modify course definitions.

### 4.4.2 Field Specification

| Field | PostgreSQL Type | Prisma Type | Null | Key / Constraint | Description |
|---|---|---|---:|---|---|
| `id` | `text` | `String @id @default(cuid())` | No | PK | Authorization identifier. |
| `trainerId` | `text` | `String` | No | FK → `TrainerProfile.id` | Authorized trainer. |
| `courseId` | `text` | `String` | No | FK → `Course.id` | Authorized course. |
| `status` | enum | `TrainerCourseAuthorizationStatus` | No | State machine | Authorization lifecycle state. |
| `effectiveStartDate` | `date` | `DateTime @db.Date` | No | Effective range | Start date. |
| `effectiveEndDate` | `date` | `DateTime? @db.Date` | Yes | Effective range | Last inclusive date. |
| `createdAt` | `timestamptz` | `DateTime @default(now()) @db.Timestamptz(6)` | No | Audit | Creation timestamp. |
| `createdBy` | `text` | `String` | No | FK → `User.id` | Creator. |
| `updatedAt` | `timestamptz` | `DateTime @updatedAt @db.Timestamptz(6)` | No | Audit | Last modification timestamp. |
| `updatedBy` | `text` | `String` | No | FK → `User.id` | Last modifier. |
| `deletedAt` | `timestamptz` | `DateTime? @db.Timestamptz(6)` | Yes | Soft-delete consistency | Deletion timestamp. |
| `isDeleted` | `boolean` | `Boolean @default(false)` | No | Indexed | Soft-delete flag. |
| `version` | `integer` | `Int @default(1)` | No | Concurrency | Optimistic concurrency token. |

### 4.4.3 Indexes

```sql
CREATE INDEX ix_trainer_course_auth_trainer_status
ON "TrainerCourseAuthorization" (
  "trainerId",
  "status",
  "effectiveStartDate",
  "effectiveEndDate"
)
WHERE "isDeleted" = false;

CREATE INDEX ix_trainer_course_auth_course_status
ON "TrainerCourseAuthorization" (
  "courseId",
  "status",
  "effectiveStartDate",
  "effectiveEndDate"
)
WHERE "isDeleted" = false;

CREATE INDEX ix_trainer_course_auth_pair
ON "TrainerCourseAuthorization" ("trainerId", "courseId")
WHERE "isDeleted" = false;
```

### 4.4.4 Constraints

1. Trainer must exist and not be soft-deleted.
2. Course must exist and be eligible for operational reference according to Course Catalog contract.
3. `effectiveEndDate >= effectiveStartDate` when present.
4. Multiple active authorizations for the same trainer and course may not have overlapping effective periods.
5. `Expired -> Active` is prohibited.
6. An authorization whose `effectiveEndDate` is earlier than evaluation date is ineffective even if stale status normalization has not yet changed status to `Expired`.
7. Eligibility requires TrainerProfile to be operationally effective and the authorization to be `Active` and effective on the requested date.
8. Course authorization does not grant IAM access.
9. Status changes and effective-period changes are audited.

### 4.4.5 Prisma Model Shape

```prisma
model TrainerCourseAuthorization {
  id                 String                           @id @default(cuid())
  trainerId          String
  courseId           String
  status             TrainerCourseAuthorizationStatus
  effectiveStartDate DateTime                         @db.Date
  effectiveEndDate   DateTime?                        @db.Date

  createdAt          DateTime                         @default(now()) @db.Timestamptz(6)
  createdBy          String
  updatedAt          DateTime                         @updatedAt @db.Timestamptz(6)
  updatedBy          String
  deletedAt          DateTime?                        @db.Timestamptz(6)
  isDeleted          Boolean                          @default(false)
  version            Int                              @default(1)

  trainer            TrainerProfile                   @relation(fields: [trainerId], references: [id], onDelete: Restrict, onUpdate: Cascade)
  course             Course                           @relation(fields: [courseId], references: [id], onDelete: Restrict, onUpdate: Cascade)

  @@index([trainerId, status, effectiveStartDate, effectiveEndDate])
  @@index([courseId, status, effectiveStartDate, effectiveEndDate])
  @@index([trainerId, courseId])
  @@index([isDeleted])
}
```

---

## 4.5 `TrainerCompensationRate`

### 4.5.1 Purpose

Stores sensitive effective-dated compensation rate inputs for trainers. It does not calculate payroll, salaries, deductions, allowances, EOSB, payslips, or payment execution.

Rate resolution precedence is:

```text
Session-specific
    ↓ if none
Batch-specific
    ↓ if none
Trainer-level
```

### 4.5.2 Field Specification

| Field | PostgreSQL Type | Prisma Type | Null | Key / Constraint | Description |
|---|---|---|---:|---|---|
| `id` | `text` | `String @id @default(cuid())` | No | PK | Rate identifier. |
| `trainerId` | `text` | `String` | No | FK → `TrainerProfile.id` | Trainer. |
| `batchId` | `text` | `String?` | Yes | FK → `Batch.id` | Optional batch specificity. |
| `sessionId` | `text` | `String?` | Yes | FK → `Session.id` | Optional session specificity. |
| `paymentBasis` | enum | `TrainerPaymentBasis` | No | Enum | `PerHour`, `PerSession`, `PerStudent`, or `Fixed`. |
| `amount` | `numeric(14,3)` | `Decimal @db.Decimal(14, 3)` | No | `CHECK amount > 0` | Rate amount in configured business currency. |
| `status` | enum | `TrainerCompensationRateStatus` | No | Effective-state control | `Active` or `Inactive`. |
| `remarks` | `varchar(1000)` | `String? @db.VarChar(1000)` | Yes | Length constraint | Business explanation or contractual reference note. |
| `effectiveStartDate` | `date` | `DateTime @db.Date` | No | Effective range | First applicable date. |
| `effectiveEndDate` | `date` | `DateTime? @db.Date` | Yes | Effective range | Last inclusive applicable date. |
| `createdAt` | `timestamptz` | `DateTime @default(now()) @db.Timestamptz(6)` | No | Audit | Creation timestamp. |
| `createdBy` | `text` | `String` | No | FK → `User.id` | Creator. |
| `updatedAt` | `timestamptz` | `DateTime @updatedAt @db.Timestamptz(6)` | No | Audit | Last modification timestamp. |
| `updatedBy` | `text` | `String` | No | FK → `User.id` | Last modifier. |
| `deletedAt` | `timestamptz` | `DateTime? @db.Timestamptz(6)` | Yes | Soft-delete consistency | Deletion timestamp. |
| `isDeleted` | `boolean` | `Boolean @default(false)` | No | Indexed | Soft-delete flag. |
| `version` | `integer` | `Int @default(1)` | No | Concurrency | Optimistic concurrency token. |

### 4.5.3 Specificity Constraint

Allowed record shapes:

| Specificity | `batchId` | `sessionId` | Meaning |
|---|---:|---:|---|
| Trainer-level | `NULL` | `NULL` | Default trainer rate. |
| Batch-specific | Required | `NULL` | Override for one Batch. |
| Session-specific | Required | Required | Override for one Session in its Batch. |

The following shape is invalid:

```text
batchId = NULL
sessionId != NULL
```

Required database constraint:

```sql
CHECK (
  "sessionId" IS NULL
  OR "batchId" IS NOT NULL
)
```

Additionally, when `sessionId` is supplied, the referenced Session must belong to the supplied `batchId`; this is validated transactionally through the Training Delivery contract.

### 4.5.4 Indexes

```sql
CREATE INDEX ix_trainer_comp_rate_resolve
ON "TrainerCompensationRate" (
  "trainerId",
  "paymentBasis",
  "status",
  "sessionId",
  "batchId",
  "effectiveStartDate",
  "effectiveEndDate"
)
WHERE "isDeleted" = false;

CREATE INDEX ix_trainer_comp_rate_batch
ON "TrainerCompensationRate" ("batchId")
WHERE "batchId" IS NOT NULL AND "isDeleted" = false;

CREATE INDEX ix_trainer_comp_rate_session
ON "TrainerCompensationRate" ("sessionId")
WHERE "sessionId" IS NOT NULL AND "isDeleted" = false;

CREATE INDEX ix_trainer_comp_rate_effective
ON "TrainerCompensationRate" ("effectiveStartDate", "effectiveEndDate")
WHERE "isDeleted" = false AND "status" = 'Active';
```

### 4.5.5 Constraints

1. `amount > 0`.
2. Currency precision is `numeric(14,3)` to support Oman Rial subunit precision.
3. Payment basis is one of the defined enum values.
4. `effectiveEndDate >= effectiveStartDate` when present.
5. Session-specific rate requires both `sessionId` and the corresponding `batchId`.
6. Batch-specific rate requires `batchId` and `sessionId = NULL`.
7. Trainer-level rate requires `batchId = NULL` and `sessionId = NULL`.
8. At one specificity level, the same trainer and payment basis must not have multiple simultaneously applicable active rates with overlapping effective periods.
9. Rate resolution must be deterministic and use Session → Batch → Trainer precedence.
10. Compensation amount and rate details are sensitive; generic `trainer.read` does not authorize amount access.
11. Only `trainer.compensation.read` may read amount details.
12. Only `trainer.compensation.manage` may create or mutate rates.
13. All creates, changes, deactivations, and soft deletions are audited.
14. Payroll calculation remains out of scope.

### 4.5.6 Prisma Model Shape

```prisma
model TrainerCompensationRate {
  id                 String                         @id @default(cuid())
  trainerId          String
  batchId            String?
  sessionId          String?
  paymentBasis       TrainerPaymentBasis
  amount             Decimal                        @db.Decimal(14, 3)
  status             TrainerCompensationRateStatus
  remarks            String?                        @db.VarChar(1000)
  effectiveStartDate DateTime                       @db.Date
  effectiveEndDate   DateTime?                      @db.Date

  createdAt          DateTime                       @default(now()) @db.Timestamptz(6)
  createdBy          String
  updatedAt          DateTime                       @updatedAt @db.Timestamptz(6)
  updatedBy          String
  deletedAt          DateTime?                      @db.Timestamptz(6)
  isDeleted          Boolean                        @default(false)
  version            Int                            @default(1)

  trainer            TrainerProfile                 @relation(fields: [trainerId], references: [id], onDelete: Restrict, onUpdate: Cascade)
  batch              Batch?                         @relation(fields: [batchId], references: [id], onDelete: Restrict, onUpdate: Cascade)
  session            Session?                       @relation(fields: [sessionId], references: [id], onDelete: Restrict, onUpdate: Cascade)

  @@index([trainerId, paymentBasis, status, sessionId, batchId, effectiveStartDate, effectiveEndDate])
  @@index([batchId])
  @@index([sessionId])
  @@index([isDeleted])
}
```

---

# 5. Relationship Model

## 5.1 Context-Owned Relationships

| Parent | Child | Cardinality | Child FK | On Update | On Delete | Rule |
|---|---|---|---|---|---|---|
| `TrainerProfile` | `TrainerQualification` | 1:N | `trainerId` | CASCADE | RESTRICT | Children are soft-deleted explicitly; no physical cascade. |
| `TrainerProfile` | `TrainerAvailability` | 1:N | `trainerId` | CASCADE | RESTRICT | Availability history is preserved. |
| `TrainerProfile` | `TrainerCourseAuthorization` | 1:N | `trainerId` | CASCADE | RESTRICT | Authorization history is preserved. |
| `TrainerProfile` | `TrainerCompensationRate` | 1:N | `trainerId` | CASCADE | RESTRICT | Compensation history is preserved and sensitive. |

## 5.2 External Reference Relationships

| External Parent | Owned Child | Cardinality | FK | On Delete | Ownership Note |
|---|---|---|---|---|---|
| `Person` | `TrainerProfile` | 1:0..1 active profile | `personId` | RESTRICT | Person owns canonical identity. Partial unique index enforces one non-deleted trainer profile per Person. |
| `Branch` | `TrainerProfile` | 1:N | `branchId` | RESTRICT | Organization owns Branch. |
| `Branch` | `TrainerAvailability` | 1:N | `branchId` | RESTRICT | Availability is branch-scoped. |
| `Document` | `TrainerQualification` | 1:0..N references | `documentId` | RESTRICT | Document Management owns verification and file lifecycle. |
| `Course` | `TrainerCourseAuthorization` | 1:N | `courseId` | RESTRICT | Course Catalog owns Course. |
| `Batch` | `TrainerCompensationRate` | 1:0..N | `batchId` | RESTRICT | Training Delivery owns Batch. |
| `Session` | `TrainerCompensationRate` | 1:0..N | `sessionId` | RESTRICT | Training Delivery owns Session. |
| `User` | all owned models | 1:N audit references | `createdBy`, `updatedBy` | RESTRICT | IAM owns User; historical attribution must remain intact. |

## 5.3 Conceptual N:M Relationships

Module 09 implements the following conceptual many-to-many relationships through explicit business entities:

### Trainer ↔ Course

```text
TrainerProfile
  1
  |
  N
TrainerCourseAuthorization
  N
  |
  1
Course
```

This is an effective-dated, stateful N:M relationship. It must not be represented as a bare Prisma implicit many-to-many table because the relationship has business attributes:

- status;
- effectiveStartDate;
- effectiveEndDate;
- audit metadata;
- soft-delete metadata;
- version.

### Trainer ↔ Batch and Session

Trainer-to-Batch and Trainer-to-Session assignments are **not Module 09 relationships**. They are owned by Training Delivery through `BatchTrainer` and `Session.trainerId` or the approved equivalent schema. Module 09 may query them read-only for impact analysis and assignment-reference displays.

## 5.4 Cascading Policy Summary

No owned table uses physical `ON DELETE CASCADE` for business records.

| Operation | Policy |
|---|---|
| Parent ID key update | `ON UPDATE CASCADE` where identifier update is technically supported; application should treat IDs as immutable. |
| Parent physical deletion | `ON DELETE RESTRICT`. |
| Trainer soft delete | Explicit domain service operation with child/history handling and assignment-reference checks. |
| Child soft delete | Explicit row update; parent remains unchanged. |
| Audit deletion | Prohibited through Module 09. |

---

# 6. Recommended Transaction Boundaries

## 6.1 Create Trainer Profile

Single transaction:

1. validate Person reference;
2. validate actor branch scope;
3. allocate trainer code through configured numbering service where configured;
4. verify no non-deleted TrainerProfile exists for Person;
5. insert TrainerProfile;
6. register post-commit domain event;
7. commit;
8. after commit, dispatch in-process event and Audit integration request.

Person creation, when required, is performed through the Person owning boundary before TrainerProfile persistence. Trainer Management must not directly insert Person-owned columns into its own table.

## 6.2 Availability Mutation

Single transaction:

1. lock or serialize the trainer/day/branch overlap decision at an approved isolation strategy;
2. validate effective dates;
3. query overlapping non-deleted Active windows;
4. reject overlap;
5. insert/update row with version check;
6. register post-commit event;
7. commit.

## 6.3 Course Authorization Mutation

Single transaction:

1. validate Course reference via Course Catalog read contract;
2. validate trainer operational existence;
3. validate status transition;
4. validate effective dates;
5. detect overlapping active authorization periods;
6. persist with version check;
7. register post-commit event;
8. commit.

## 6.4 Compensation Rate Mutation

Single transaction:

1. authorize `trainer.compensation.manage`;
2. validate branch scope through TrainerProfile;
3. validate Batch/Session relationship where supplied;
4. validate amount and payment basis;
5. validate specificity shape;
6. validate effective dates;
7. detect ambiguity at the same specificity level;
8. persist with version check;
9. register post-commit event;
10. commit.

---

# 7. CRUD Action Definitions

The CRUD matrix uses these symbols:

| Symbol | Meaning |
|---|---|
| `C` | Create a new business record. |
| `R` | Read normal non-deleted records. |
| `U` | Update mutable fields or controlled status. |
| `D` | Business delete implemented only as soft delete. |
| `A` | View audit history or audit evidence subject to Audit & Compliance authorization. |
| `—` | No direct access. |
| `RO` | Read-only reference consumption; no mutation. |

CRUD permissions are cumulative only when separately granted. Possessing `R` does not imply `C`, `U`, `D`, `A`, compensation visibility, report access, or consolidated branch visibility.

---

# 8. Human Actor CRUD Matrix

## 8.1 Core Human Roles

| Human Actor | TrainerProfile | TrainerQualification | TrainerAvailability | TrainerCourseAuthorization | TrainerCompensationRate | Branch-Scoping Requirement |
|---|---|---|---|---|---|---|
| **Super Admin** | C/R/U/D/A | C/R/U/D/A | C/R/U/D/A | C/R/U/D/A | C/R/U/D/A | May access configured enterprise-wide scope only through explicit IAM permissions; no branch bypass based solely on role name. |
| **Institute Administrator** | C/R/U/D/A | C/R/U/D/A | C/R/U/D/A | C/R/U/D/A | R/U/A only when compensation permissions are explicitly granted | Server derives visible branches from IAM; consolidated access requires explicit consolidated permission and branch visibility. |
| **Branch Admin** | C/R/U/D | C/R/U/D | C/R/U/D | C/R/U/D | R/U only when explicitly granted | Exact assigned branch plus approved child-branch scope; cannot access parent or sibling branches without assignment. |
| **Branch Manager** | R/U/A | R/U/A | R/U/A | R/U/A | R/A only with explicit compensation read | Read/write limited to managed visible branches; consolidated reporting does not imply write access. |
| **Academic Coordinator** | R/U | C/R/U | C/R/U | C/R/U | — | Trainer home branch or availability branch must fall within active scope. Cross-branch authorization is allowed only if the trainer is visible and the course reference is valid. |
| **Training Coordinator** | R | R | C/R/U | R | — | Branch-scoped trainer visibility; availability writes limited to visible operational branches. Batch/Session assignments remain outside this context. |
| **Compliance Officer** | R/A | R/A | R/A | R/A | A only; amount visibility requires separate compensation read permission | Audit scope follows explicit compliance branch scope; no automatic enterprise-wide visibility. |
| **Accountant** | R | — | — | — | R only with `trainer.compensation.read` | Reads trainer identity reference and compensation records only for permitted branches; cannot mutate trainer profile or rate records without manage permission. |
| **Counselor** | R limited directory | — | — | R limited eligibility reference | — | Current branch only unless explicitly assigned more branches; no sensitive trainer detail access. |
| **Reporting Analyst** | R | R | R | R | R only if report definition and compensation read permission both allow it | Reporting query scope is server-derived; consolidated access requires explicit permission. |
| **Trainer** | R own profile projection | R own | R own | R own | R own only when business policy and explicit self-compensation permission permit | Must be restricted to own TrainerProfile through Person/User linkage; branch scope alone must not expose other trainers. |
| **Student** | R public/assigned trainer projection only | — | — | — | — | May only read trainer display data exposed through the Student-facing projection for their own enrollment/batch context; no direct table CRUD. |
| **Corporate Coordinator** | R assigned-program trainer projection only | — | — | — | — | Limited to trainers visible through corporate program/batch context; no direct table CRUD. |

### 8.1.1 Human Actor Notes

1. Role names in this matrix describe expected business profiles. Runtime authorization remains permission-based and must not be hardcoded to role names.
2. `Super Admin` is not exempt from audit logging.
3. Trainer self-service is future-facing unless the Trainer Portal is enabled. API authorization must still be designed as ownership-restricted if self-service endpoints are later exposed.
4. Student and Corporate Coordinator access must use purpose-built projections or upstream delivery APIs rather than exposing raw Module 09 tables.
5. Compensation amount access requires `trainer.compensation.read` even when generic trainer read access is present.
6. Audit access requires the corresponding audit permission and must be read-only.

---

# 9. System Actor CRUD Matrix

| System Actor / Context | TrainerProfile | TrainerQualification | TrainerAvailability | TrainerCourseAuthorization | TrainerCompensationRate | Branch / Ownership Rule |
|---|---|---|---|---|---|---|
| **IAM / Authorization Middleware** | RO scope metadata | — | — | — | — | Supplies authenticated user, permissions, branch assignments, child-branch visibility, and consolidated-reporting claims. Does not mutate trainer data. |
| **Party / Person Context** | RO linkage validation | — | — | — | — | Owns Person; Module 09 references Person. No reverse trainer data mutation. |
| **Organization Context** | RO Branch validation | — | RO Branch validation | — | — | Owns Branch and hierarchy; supplies branch visibility data. |
| **Course Catalog Context** | — | — | — | RO Course validation | — | Owns Course; Module 09 stores course reference only. |
| **Training Delivery Context** | R eligibility projection | R eligibility-related projection where authorized | R | R | R resolved rate only through internal contract where authorized | Must pass actor/system branch context; cannot mutate Module 09 rows through repository access. Owns BatchTrainer and Session assignment. |
| **Scheduling Context** | R trainer operational state | — | R | R eligibility contribution | — | Reads availability and authorization eligibility; owns timetable conflict checks. |
| **Exam & Completion Context** | R trainer reference | — | — | — | — | Reads trainer identity/reference for recommendation attribution; no Module 09 mutation. |
| **Document Management Context** | — | R reference linkage | — | — | — | Owns Document lifecycle; qualification stores `documentId`. Verification result is consumed, not duplicated. |
| **Communication Context** | R recipient/reference projection | — | — | — | — | Consumes post-commit events and resolves recipient data through approved projection; does not mutate trainer data. |
| **Reporting Context** | R | R | R | R | R only through protected analytical contract | Branch scope and report permissions must be applied; sensitive amount fields remain protected. |
| **Audit & Compliance Context** | A ingestion/read | A ingestion/read | A ingestion/read | A ingestion/read | A ingestion/read | Audit context receives immutable change evidence; Module 09 cannot update or delete AuditLog history. |
| **Configuration / Master Data Context** | RO numbering/lookups | — | — | — | — | Supplies numbering and configured reference values. No trainer mutation. |
| **Operations / Health Monitoring** | R aggregate counts only | R aggregate counts only | R aggregate counts only | R aggregate counts only | R aggregate counts only; no amounts | Health checks use non-sensitive aggregate probes and must not expose PII or compensation values. |
| **Approved Data Migration Job** | C/R/U under migration policy | C/R/U | C/R/U | C/R/U | C/R/U | Must execute with explicit migration identity, branch mapping, idempotency keys, audit evidence, validation, and no hard deletes. |

System actors must use published application contracts or approved repository boundaries. Direct cross-context table writes are prohibited.

---

# 10. Fine-Grained CRUD Permission Mapping

| Entity | Create Permission | Read Permission | Update Permission | Delete Permission | Audit Permission |
|---|---|---|---|---|---|
| `TrainerProfile` | `trainer.create` | `trainer.read` | `trainer.update` | `trainer.status.manage` | `trainer.audit.read` |
| `TrainerQualification` | `trainer.qualification.manage` | `trainer.qualification.read` | `trainer.qualification.manage` | `trainer.qualification.manage` | `trainer.audit.read` |
| `TrainerAvailability` | `trainer.availability.manage` | `trainer.availability.read` | `trainer.availability.manage` | `trainer.availability.manage` | `trainer.audit.read` |
| `TrainerCourseAuthorization` | `trainer.authorization.manage` | `trainer.authorization.read` | `trainer.authorization.manage` | `trainer.authorization.manage` | `trainer.audit.read` |
| `TrainerCompensationRate` | `trainer.compensation.manage` | `trainer.compensation.read` | `trainer.compensation.manage` | `trainer.compensation.manage` | `trainer.audit.read` plus compensation read where audit payload reveals amounts |

Trainer status changes additionally require:

```text
trainer.status.manage
```

Consolidated cross-branch report/export operations additionally require the approved consolidated report permission from the Module 09 Permission Matrix.

---

# 11. Branch-Scoping Rules by Entity

## 11.1 `TrainerProfile`

Base predicate:

```text
TrainerProfile.branchId IN resolvedVisibleBranchIds
AND TrainerProfile.isDeleted = false
```

Rules:

1. Client-supplied `branchId` narrows an already-authorized scope; it never expands it.
2. Parent/child visibility is derived from IAM/Organization contracts.
3. Consolidated reporting permission grants reporting scope only; it does not automatically grant mutation scope.
4. Write operations require target `branchId` in `resolvedWritableBranchIds`.

## 11.2 `TrainerQualification`

Scope is inherited through parent:

```text
TrainerQualification.trainerId
  -> TrainerProfile.branchId
  -> resolvedVisibleBranchIds
```

No qualification operation may authorize access based only on knowing the qualification ID.

## 11.3 `TrainerAvailability`

Both conditions are required:

```text
TrainerAvailability.branchId IN resolvedVisibleBranchIds
AND parent TrainerProfile is visible to the actor
```

For writes:

```text
TrainerAvailability.branchId IN resolvedWritableBranchIds
AND parent TrainerProfile is within permitted trainer scope
```

This prevents creating availability in an unauthorized branch for an otherwise visible trainer.

## 11.4 `TrainerCourseAuthorization`

Branch scope is inherited from TrainerProfile. Course visibility/validity is independently checked through Course Catalog.

```text
authorization.trainer.branchId IN resolvedVisibleBranchIds
```

A course reference is not a branch-authorization mechanism.

## 11.5 `TrainerCompensationRate`

Branch scope is inherited from TrainerProfile. Batch and Session references are validated through Training Delivery and do not expand access.

Read predicate requires both:

```text
trainer.branchId IN resolvedVisibleBranchIds
AND caller has trainer.compensation.read
```

Write predicate requires both:

```text
trainer.branchId IN resolvedWritableBranchIds
AND caller has trainer.compensation.manage
```

Amounts must be redacted or omitted before DTO serialization when compensation read permission is absent.

---

# 12. Database Constraints and Migration Requirements

## 12.1 Required SQL-Level Checks

Each owned table must receive a soft-delete consistency check equivalent to:

```sql
CHECK (
  ("isDeleted" = false AND "deletedAt" IS NULL)
  OR
  ("isDeleted" = true AND "deletedAt" IS NOT NULL)
)
```

Each effective-dated table must receive:

```sql
CHECK (
  "effectiveEndDate" IS NULL
  OR "effectiveEndDate" >= "effectiveStartDate"
)
```

`TrainerAvailability` requires:

```sql
CHECK ("startTime" < "endTime")
```

`TrainerCompensationRate` requires:

```sql
CHECK ("amount" > 0)
```

and:

```sql
CHECK (
  "sessionId" IS NULL
  OR "batchId" IS NOT NULL
)
```

All owned tables require:

```sql
CHECK ("version" >= 1)
```

## 12.2 Partial Index Migration Requirement

The following rules require PostgreSQL SQL migration support:

1. one non-deleted TrainerProfile per Person;
2. unique non-deleted trainer code;
3. normalized non-deleted qualification natural-key uniqueness;
4. selective operational indexes excluding deleted rows.

Do not replace these with unconditional `@@unique` constraints because unconditional uniqueness would prevent legitimate historical soft-deleted data from retaining old identifiers while allowing a new active business row where the business rules permit it.

## 12.3 Overlap Enforcement

Availability, course authorization, and compensation rate ambiguity checks require transactional overlap validation.

Minimum algorithm:

1. begin transaction;
2. query candidate conflicting rows using the business overlap predicate;
3. protect against concurrent duplicate decisions using the project's approved transaction isolation or locking strategy;
4. reject with the Module 09 business error code when conflict exists;
5. insert/update the row;
6. increment version on update;
7. commit;
8. publish post-commit in-process event.

A plain “check then insert” sequence outside a transaction is prohibited.

---

# 13. Read Models and Query Projections

The following are recommended query projections, not new owned database tables.

## 13.1 Trainer Directory Projection

Combines:

- TrainerProfile operational data;
- Person localized display name and contact projection;
- Branch display name;
- computed current-effective status;
- aggregate count of active course authorizations;
- aggregate count of qualifications.

No compensation values are included.

## 13.2 Trainer Eligibility Projection

Returns only decision inputs/results required by Training Delivery or Scheduling:

```text
trainerId
trainerCode
displayName
branchId
profileEffective
courseAuthorized
availabilityContainsRequestedWindow
eligible
reasonCodes[]
```

It must not expose unrelated PII or compensation data.

## 13.3 Compensation Resolution Projection

Protected output:

```text
trainerId
paymentBasis
resolvedRateId
specificityLevel
amount
currency
applicableFrom
applicableTo
```

Access requires compensation permission or an approved internal system contract. Generic reporting and directory projections must not include this output.

---

# 14. Referential Integrity and Deactivation Rules

## 14.1 Trainer Soft Delete Precheck

Before soft-deleting a TrainerProfile:

1. verify `trainer.status.manage` permission;
2. verify writable branch scope;
3. query Training Delivery for active or future BatchTrainer references;
4. query Training Delivery for active or future Session references;
5. reject deletion when blocking references exist;
6. require reason;
7. soft-delete owned active child records according to approved domain policy or explicitly deactivate/end-date them while preserving history;
8. soft-delete TrainerProfile;
9. create audit evidence;
10. emit post-commit domain event.

The operation shall not physically cascade-delete children.

## 14.2 Branch Reassignment

Changing `TrainerProfile.branchId` is a controlled update, not a raw FK mutation. Before reassignment:

1. actor must have write permission for both source and target scope where policy requires it;
2. target Branch must be active/effective;
3. unresolved active/future assignments must be impact-checked;
4. availability rows must be reviewed because they are independently branch-scoped;
5. compensation and authorization history remains linked to the trainer and is not rewritten;
6. change is audited.

---

# 15. Audit Matrix by Entity and Operation

| Entity | Operation | Audit Required | Minimum Change Evidence |
|---|---|---:|---|
| TrainerProfile | Create | Yes | personId, branchId, trainerCode, trainerType, status, effective range. |
| TrainerProfile | Update | Yes | old/new values for trainer-owned fields. |
| TrainerProfile | Status change | Yes | old status, new status, reason, impact-check outcome. |
| TrainerProfile | Soft delete | Yes | reason, blocking-reference check result, deletedAt. |
| TrainerQualification | Create/Update/Delete | Yes | qualification metadata changes and document reference changes. |
| TrainerAvailability | Create/Update/Delete | Yes | weekday, time range, branch, effective range, status. |
| TrainerCourseAuthorization | Create/Update/Transition/Delete | Yes | courseId, old/new status, effective range, reason when required. |
| TrainerCompensationRate | Create/Update/Deactivate/Delete | Yes, sensitive | payment basis, specificity references, old/new amount, effective range, actor; audit read must itself be restricted. |

Audit records are owned by Audit & Compliance. Module 09 must not directly permit users to modify or delete audit evidence.

---

# 16. Data Retention and Historical Query Behavior

1. Soft-deleted rows remain in owned tables for historical integrity until an approved platform retention policy authorizes archival or purge.
2. Expired effective-dated rows remain queryable through authorized history/audit views.
3. Eligibility and compensation resolution exclude deleted, inactive, suspended, or expired rows according to entity-specific rules.
4. Historical reports must evaluate effective data using the report's business date where required rather than today's state.
5. Compensation history must be access-controlled for its entire retention period.
6. Trainer identity display in historical reports is resolved through the approved Person historical/current display policy; Module 09 must not duplicate Person snapshots unless a separate approved reporting design requires them.

---

# 17. Entity-to-Requirement Traceability

| Entity | Primary Functional Requirements |
|---|---|
| `TrainerProfile` | FR-FTM-001, FR-FTM-002, FR-FTM-003, FR-FTM-004, FR-FTM-005, FR-FTM-010, FR-FTM-013, FR-FTM-015, FR-FTM-016, FR-FTM-017, FR-FTM-018, FR-FTM-019, FR-FTM-020 |
| `TrainerQualification` | FR-FTM-006, FR-FTM-010, FR-FTM-016, FR-FTM-018, FR-FTM-019, FR-FTM-020 |
| `TrainerAvailability` | FR-FTM-007, FR-FTM-008, FR-FTM-010, FR-FTM-013, FR-FTM-014, FR-FTM-016, FR-FTM-018, FR-FTM-019, FR-FTM-020 |
| `TrainerCourseAuthorization` | FR-FTM-009, FR-FTM-010, FR-FTM-013, FR-FTM-016, FR-FTM-018, FR-FTM-019, FR-FTM-020 |
| `TrainerCompensationRate` | FR-FTM-011, FR-FTM-012, FR-FTM-016, FR-FTM-017, FR-FTM-018, FR-FTM-019, FR-FTM-020 |

---

# 18. Database Acceptance Checklist

The Module 09 database implementation is acceptable only when all of the following are true:

- [ ] Exactly one canonical Person reference is used per TrainerProfile; no Person identity fields are duplicated.
- [ ] One non-deleted TrainerProfile per Person is enforced with a partial unique index.
- [ ] Non-deleted trainerCode uniqueness is enforced with a partial unique index.
- [ ] All five owned models include full audit columns.
- [ ] All five owned models include `deletedAt` and `isDeleted` and do not expose hard-delete business operations.
- [ ] All five owned models include optimistic concurrency support through `version` or an approved equivalent.
- [ ] TrainerProfile, TrainerAvailability, TrainerCourseAuthorization, and TrainerCompensationRate use effective-date validation where applicable.
- [ ] Trainer Availability rejects invalid time bounds, duplicate windows, and overlapping active effective windows.
- [ ] Course Authorization rejects overlapping active effective periods for the same trainer-course pair.
- [ ] Compensation Rate enforces valid specificity shapes and deterministic Session → Batch → Trainer precedence.
- [ ] Compensation amount uses Oman-appropriate three-decimal financial precision.
- [ ] Compensation reads are protected independently of generic trainer read access.
- [ ] All foreign keys to external context-owned entities use restrictive delete behavior.
- [ ] BatchTrainer and Session assignment data are not duplicated into Module 09 tables.
- [ ] Document verification state is not duplicated into TrainerQualification.
- [ ] Course data is not duplicated into TrainerCourseAuthorization.
- [ ] Every normal read filters soft-deleted rows.
- [ ] Branch predicates are applied server-side and inherited through parent TrainerProfile where appropriate.
- [ ] Client-supplied branchId values never expand authorized scope.
- [ ] All overlap checks occur transactionally and are protected from race conditions.
- [ ] All sensitive mutations create auditable evidence.
- [ ] Post-commit events are emitted only after successful transaction commit.
- [ ] Migration jobs are idempotent, branch-mapped, validated, and audited.
- [ ] Backup and recovery procedures include all five owned tables and verify referential integrity after restoration.

---

# 19. Final Persistence Boundary

The Faculty / Trainer Management context is the source of truth for trainer-role data only:

```text
TrainerProfile
├── TrainerQualification
├── TrainerAvailability
├── TrainerCourseAuthorization
└── TrainerCompensationRate
```

It references but does not own:

```text
Person
Branch
Course
Batch
Session
Document
User
AuditLog
```

The database design therefore preserves the ASTI IMS modular-monolith boundaries while enabling efficient trainer search, availability evaluation, course authorization, assignment eligibility contribution, compensation-rate resolution, branch isolation, full auditability, effective dating, soft deletion, and optimistic concurrency.
