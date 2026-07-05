# Part 4 – Database Entities and CRUD Matrix

## Module 10 – Exam, Result & Completion Management

## 1. Purpose

This document defines the persistence model, relational constraints, ownership classification, lifecycle data behavior, referential actions, indexes, audit columns, and actor/entity CRUD access for Module 10 – Exam, Result & Completion Management.

The design follows these rules:

1. The module owns only persistence that belongs to the Exam, Result & Completion bounded context.
2. Cross-context entities are referenced by foreign key or application boundary and are not duplicated.
3. `Enrollment` remains the central learning-lifecycle aggregate.
4. `CourseCompletionRule` remains owned by Course Catalog.
5. Attendance truth remains owned by Attendance Management.
6. Payment and receivable truth remain owned by Fee, Billing & Receivables Management.
7. `Certificate` remains owned by Certificate Management.
8. `User`, permission, and branch access data remain owned by Identity & Access Management.
9. `AuditLog` and shared approval-history conventions remain owned by Audit & Compliance.
10. Branch isolation is enforced server-side by deriving branch ownership through authoritative relationships rather than trusting a client-submitted branch identifier.
11. No hard delete is permitted for operational academic data.
12. Common audit and soft-delete fields must follow repository conventions.

---

# 2. Persistence Scope Summary

## 2.1 Owned Persistence Models

The current ER baseline directly defines four persisted entities owned by this context:

```text
Exam
Result
CourseCompletion
CompletionApproval
```

## 2.2 DDD Concepts Without Separate ER Tables

The DDD context names these additional concepts:

```text
Assessment
Grade
CompletionRuleEvaluation
```

Current persistence interpretation:

| DDD Concept | Current Persistence Treatment | Decision |
|---|---|---|
| Assessment | Represented by `Exam` for current scope | Do not add a separate table |
| Grade | Stored in `Result.grade` | Do not add a separate Grade table |
| CompletionRuleEvaluation | Domain/application behavior materialized into `CourseCompletion` | Do not add a separate table |
| Retake / Attempt | Not modeled | Do not invent table |
| Weighted Assessment Component | Not modeled | Do not invent table |
| Result Revision | Audit convention required; no dedicated ER entity | Do not invent without model amendment |

---

# 3. Database Technology Assumptions

This specification uses PostgreSQL-oriented physical types and Prisma-compatible conceptual mappings.

Type conventions:

| Logical Type | PostgreSQL Type | Prisma-Oriented Mapping |
|---|---|---|
| Identifier | `uuid` or repository-standard CUID storage | `String @id` with repository ID generator |
| Short text | `varchar(n)` | `String` with DB length annotation where used |
| Long text | `text` | `String @db.Text` |
| Date only | `date` | `DateTime @db.Date` |
| Timestamp | `timestamptz` | `DateTime` |
| Decimal percentage | `decimal(5,2)` | `Decimal @db.Decimal(5,2)` |
| Marks | `decimal(10,2)` | `Decimal @db.Decimal(10,2)` |
| Boolean | `boolean` | `Boolean` |
| Enum | PostgreSQL enum or repository enum convention | Prisma `enum` |

Important implementation rule:

The exact enum symbol names and ID generator must be verified against the actual `schema.prisma`. This FRD defines required semantics and relational behavior, not an instruction to create conflicting duplicate enum types.

---

# 4. Common Operational Columns

The ER baseline recommends common fields for most operational tables:

```text
id
createdAt
createdBy
updatedAt
updatedBy
deletedAt
isActive
version
```

For Module 10, the following physical convention is required unless the repository already uses an equivalent naming or audit convention.

| Field | Type | Nullable | Default | Purpose |
|---|---|---:|---|---|
| `id` | UUID/CUID repository ID | No | generated | Primary key |
| `createdAt` | `timestamptz` | No | current timestamp | Creation timestamp |
| `createdBy` | FK-compatible user ID | No for human commands; system principal allowed | none | Creator principal |
| `updatedAt` | `timestamptz` | No | current timestamp | Last update timestamp |
| `updatedBy` | FK-compatible user ID | No for mutable operational records; system principal allowed | none | Last updater |
| `deletedAt` | `timestamptz` | Yes | null | Soft-delete timestamp |
| `isActive` | `boolean` | No | true | Active/deactivated flag |
| `version` | `integer` | No | 1 | Optimistic concurrency token |

## 4.1 Audit Column Rule

`createdBy` and `updatedBy` should reference IAM `User` when a human actor exists.

For system-triggered reevaluation, use the repository's approved system principal mechanism. Do not:

- invent a fake human user in UI code;
- leave audit actor silently null if repository convention requires a system principal;
- duplicate User data into this context.

## 4.2 Soft Delete Rule

No Module 10 table may be hard-deleted through normal business operations.

Allowed business behavior:

```text
Deactivate
Archive
Cancel
Supersede
Soft delete according to repository policy
```

Prohibited:

```text
DELETE FROM exam
DELETE FROM result
DELETE FROM course_completion
DELETE FROM completion_approval
```

through ordinary application use cases.

## 4.3 Optimistic Locking Rule

All mutable aggregate records must use `version`.

Conceptual update condition:

```sql
UPDATE ...
SET ..., version = version + 1
WHERE id = :id
  AND version = :expectedVersion
  AND deletedAt IS NULL;
```

If zero rows are affected, return a concurrency conflict rather than silently overwriting.

---

# 5. Entity Specification — Exam

## 5.1 Ownership

| Attribute | Value |
|---|---|
| Context | Exam, Result & Completion Management |
| Ownership | Owned |
| Aggregate Role | Aggregate root for exam definition and result-entry lifecycle |
| Branch Scope Derivation | `Exam.batchId → Batch.branchId` |
| Soft Delete | Required |
| Effective Dating | Not applicable in current ER model |
| Auditing | Required |

## 5.2 Table Name

Recommended physical name:

```text
exam
```

Repository naming convention may use plural table mappings, but only one physical model must exist.

## 5.3 Field Specification

| Field | PostgreSQL Type | Nullable | Key | Default | Description |
|---|---|---:|---|---|---|
| `id` | `uuid` / repository ID type | No | PK | generated | Exam identifier |
| `courseId` | FK ID type | No | FK | none | References Course Catalog `Course` |
| `batchId` | FK ID type | No | FK | none | References Training Delivery `Batch` |
| `examName` | `varchar(200)` | No | — | none | Human-readable exam name |
| `examDate` | `date` | No | — | none | Exam calendar date |
| `maxMarks` | `decimal(10,2)` | No | — | none | Maximum marks |
| `passMarks` | `decimal(10,2)` | No | — | none | Passing threshold |
| `status` | enum | No | — | initial functional state | Exam lifecycle status |
| `createdAt` | `timestamptz` | No | — | current timestamp | Audit |
| `createdBy` | FK-compatible user ID | No | logical FK/reference | none | Creator |
| `updatedAt` | `timestamptz` | No | — | current timestamp | Audit |
| `updatedBy` | FK-compatible user ID | No | logical FK/reference | none | Last updater |
| `deletedAt` | `timestamptz` | Yes | — | null | Soft-delete timestamp |
| `isActive` | `boolean` | No | — | true | Active flag |
| `version` | `integer` | No | — | 1 | Optimistic lock |

## 5.4 Required Constraints

### Primary Key

```text
PK_exam(id)
```

### Foreign Keys

```text
FK_exam_course
Exam.courseId → Course.id
ON UPDATE RESTRICT
ON DELETE RESTRICT
```

```text
FK_exam_batch
Exam.batchId → Batch.id
ON UPDATE RESTRICT
ON DELETE RESTRICT
```

### Check Constraints

```sql
CHECK (maxMarks > 0)
```

```sql
CHECK (passMarks >= 0)
```

```sql
CHECK (passMarks <= maxMarks)
```

```sql
CHECK (version >= 1)
```

### Cross-Entity Invariant

Database FK constraints alone cannot ensure:

```text
Exam.courseId = Batch.courseId
```

Required server-side/domain validation:

1. load Batch through Training Delivery boundary;
2. verify `Batch.courseId == Exam.courseId`;
3. verify user mutation scope includes `Batch.branchId`;
4. reject mismatch before insert/update.

Where the monorepo database architecture permits a safe database trigger or composite FK pattern consistent with repository conventions, it may be added, but application-layer validation remains required.

## 5.5 Recommended Indexes

```text
IDX_exam_course_id(courseId)
IDX_exam_batch_id(batchId)
IDX_exam_exam_date(examDate)
IDX_exam_status(status)
IDX_exam_batch_status(batchId, status)
IDX_exam_course_date(courseId, examDate)
IDX_exam_active_date(isActive, examDate)
```

Recommended active-row uniqueness for semantic duplicate prevention:

```text
UQ_exam_active_semantic(batchId, examName, examDate)
WHERE deletedAt IS NULL
```

This prevents accidental duplicate active Exams with the same name and date within one Batch.

## 5.6 Effective Dating

Not applicable.

Do not add:

```text
effectiveStartDate
effectiveEndDate
```

to `Exam` unless a future model amendment introduces versioned exam definitions.

`examDate` is a business event date, not effective dating.

## 5.7 Delete Behavior

Exam cannot be physically deleted if:

- Results exist;
- Completion evidence depends on its Results;
- audit history exists.

Application behavior:

```text
Draft Exam with no dependent Result:
    may be soft-deleted/archived according to policy

Exam with Results:
    cancel, close, or archive
    never hard delete

Finalized evidence:
    correction workflow only
```

---

# 6. Entity Specification — Result

## 6.1 Ownership

| Attribute | Value |
|---|---|
| Context | Exam, Result & Completion Management |
| Ownership | Owned |
| Aggregate Relationship | Child/result evidence associated with Exam and Enrollment |
| Branch Scope Derivation | `Result.examId → Exam.batchId → Batch.branchId` and must agree with `Enrollment.branchId` |
| Soft Delete | Required; normal delete prohibited |
| Effective Dating | Not applicable |
| Auditing | Required, especially correction audit |

## 6.2 Table Name

```text
result
```

## 6.3 Field Specification

| Field | PostgreSQL Type | Nullable | Key | Default | Description |
|---|---|---:|---|---|---|
| `id` | repository ID type | No | PK | generated | Result identifier |
| `examId` | FK ID type | No | FK | none | References owned Exam |
| `enrollmentId` | FK ID type | No | FK | none | References Enrollment aggregate |
| `marksObtained` | `decimal(10,2)` | No | — | none | Recorded marks |
| `grade` | `varchar(50)` | Yes | — | null | Grade display/code where current policy uses it |
| `resultStatus` | enum | No | — | derived | Academic result status |
| `recordedBy` | FK-compatible user ID | No | reference | none | User who recorded current result |
| `recordedAt` | `timestamptz` | No | — | current timestamp | Recording time |
| `createdAt` | `timestamptz` | No | — | current timestamp | Audit |
| `createdBy` | FK-compatible user ID | No | reference | none | Creator |
| `updatedAt` | `timestamptz` | No | — | current timestamp | Audit |
| `updatedBy` | FK-compatible user ID | No | reference | none | Last updater/corrector |
| `deletedAt` | `timestamptz` | Yes | — | null | Soft delete; restricted use |
| `isActive` | `boolean` | No | — | true | Active flag |
| `version` | `integer` | No | — | 1 | Optimistic lock |

## 6.4 Result Lifecycle Persistence Gap

Part 2 requires two behavioral dimensions:

```text
Academic outcome:
NotRecorded → Passed / Failed

Edit lifecycle:
Recorded → Finalized → CorrectedFinal
```

The ER baseline only explicitly includes:

```text
resultStatus
```

Therefore:

- `resultStatus` must not be overloaded ambiguously without checking Prisma.
- If Prisma already contains finalization fields, reuse them.
- If Prisma lacks finalization persistence, this is a schema gap.
- Do not create a parallel Result table.
- Do not use `grade` as lifecycle status.
- Correction history must use approved audit conventions until a deliberate domain-model amendment introduces a revision entity.

Recommended fields **only if the existing Prisma model already supports or is formally amended to support finalization**:

```text
finalizedAt timestamptz nullable
finalizedBy User ID nullable
```

These fields are not treated as baseline ER fields in this document.

## 6.5 Required Constraints

### Primary Key

```text
PK_result(id)
```

### Foreign Keys

```text
FK_result_exam
Result.examId → Exam.id
ON UPDATE RESTRICT
ON DELETE RESTRICT
```

```text
FK_result_enrollment
Result.enrollmentId → Enrollment.id
ON UPDATE RESTRICT
ON DELETE RESTRICT
```

### Unique Constraint

Current scope supports one current Result per Exam and Enrollment:

```text
UQ_result_exam_enrollment(examId, enrollmentId)
WHERE deletedAt IS NULL
```

This explicitly means the current model does not support multiple attempts for the same Exam.

### Check Constraints

```sql
CHECK (marksObtained >= 0)
```

The upper bound:

```text
marksObtained <= Exam.maxMarks
```

is a cross-row constraint and must be validated by the application/domain service.

```sql
CHECK (version >= 1)
```

## 6.6 Cross-Entity Invariants

Before insert/update:

```text
Enrollment.courseId == Exam.courseId
Enrollment.batchId == Exam.batchId
Enrollment.branchId == Exam.Batch.branchId
```

The server must validate all three.

The server must derive:

```text
Passed when marksObtained >= Exam.passMarks
Failed when marksObtained < Exam.passMarks
```

The client must not submit contradictory result status as trusted truth.

## 6.7 Recommended Indexes

```text
IDX_result_exam_id(examId)
IDX_result_enrollment_id(enrollmentId)
IDX_result_status(resultStatus)
IDX_result_recorded_at(recordedAt)
IDX_result_exam_status(examId, resultStatus)
IDX_result_enrollment_status(enrollmentId, resultStatus)
IDX_result_active_exam(isActive, examId)
```

## 6.8 Effective Dating

Not applicable.

A correction is not represented by effective start/end dates in the current model. Use:

- current Result state;
- optimistic version;
- AuditLog history;
- controlled re-evaluation.

## 6.9 Delete Behavior

Normal result deletion is prohibited.

Allowed operations:

```text
record
edit before finalization if policy permits
finalize
correct with restricted permission and reason
deactivate only through exceptional administrative policy
```

An Exam cannot hard-delete a Result through cascading delete.

---

# 7. Entity Specification — CourseCompletion

## 7.1 Ownership

| Attribute | Value |
|---|---|
| Context | Exam, Result & Completion Management |
| Ownership | Owned |
| Aggregate Role | Completion decision/evaluation record for Enrollment |
| Cardinality | One current CourseCompletion per Enrollment |
| Branch Scope Derivation | `CourseCompletion.enrollmentId → Enrollment.branchId` |
| Soft Delete | Required |
| Effective Dating | Not applicable in current ER |
| Auditing | Required |

## 7.2 Table Name

```text
course_completion
```

## 7.3 Field Specification

| Field | PostgreSQL Type | Nullable | Key | Default | Description |
|---|---|---:|---|---|---|
| `id` | repository ID type | No | PK | generated | Completion identifier |
| `enrollmentId` | FK ID type | No | FK + Unique | none | Enrollment being evaluated |
| `completionStatus` | enum | No | — | initial state | Current completion workflow/outcome status |
| `attendancePercentage` | `decimal(5,2)` | Yes | — | null | Materialized authoritative attendance percentage |
| `examPassed` | `boolean` | Yes | — | null | Materialized exam criterion outcome |
| `paymentCompleted` | `boolean` | Yes | — | null | Materialized payment validation outcome |
| `recommendedByTrainerId` | FK ID type | Yes | FK/reference | null | TrainerProfile that recommended completion |
| `approvedBy` | FK-compatible user ID | Yes | reference | null | Final approving User |
| `approvedAt` | `timestamptz` | Yes | — | null | Final approval timestamp |
| `remarks` | `text` | Yes | — | null | Current completion remarks |
| `createdAt` | `timestamptz` | No | — | current timestamp | Audit |
| `createdBy` | FK-compatible user ID | No | reference | none | Creator/system principal |
| `updatedAt` | `timestamptz` | No | — | current timestamp | Audit |
| `updatedBy` | FK-compatible user ID | No | reference | none | Last updater |
| `deletedAt` | `timestamptz` | Yes | — | null | Soft delete |
| `isActive` | `boolean` | No | — | true | Active flag |
| `version` | `integer` | No | — | 1 | Optimistic lock |

## 7.4 Nullability Semantics

### `attendancePercentage`

Nullable when:

- completion has not been evaluated;
- attendance is not required and product policy does not materialize a percentage;
- Attendance dependency is unavailable;
- authoritative value is not yet available.

Valid range when present:

```text
0.00 to 100.00
```

### `examPassed`

Nullable when:

- not yet evaluated;
- exam evidence required but missing/unavailable;
- exam not required and implementation uses null for not-applicable.

The exact not-required representation must be consistent across API and persistence.

### `paymentCompleted`

Nullable under equivalent semantics:

- not evaluated;
- required evidence unavailable;
- not required and null represents N/A.

Do not treat null as true.

### `recommendedByTrainerId`

Must remain null until a valid Trainer recommendation is accepted.

### `approvedBy` and `approvedAt`

Both must be populated together for final approval.

Required paired-field invariant:

```text
approvedBy IS NULL AND approvedAt IS NULL
OR
approvedBy IS NOT NULL AND approvedAt IS NOT NULL
```

## 7.5 Required Constraints

### Primary Key

```text
PK_course_completion(id)
```

### Foreign Keys

```text
FK_course_completion_enrollment
CourseCompletion.enrollmentId → Enrollment.id
ON UPDATE RESTRICT
ON DELETE RESTRICT
```

```text
FK_course_completion_recommended_trainer
CourseCompletion.recommendedByTrainerId → TrainerProfile.id
ON UPDATE RESTRICT
ON DELETE RESTRICT
```

`approvedBy` references IAM User logically/physically according to monorepo database convention:

```text
CourseCompletion.approvedBy → User.id
ON UPDATE RESTRICT
ON DELETE RESTRICT
```

### Unique Constraint

```text
UQ_course_completion_enrollment(enrollmentId)
WHERE deletedAt IS NULL
```

This enforces the ER cardinality:

```text
Enrollment 1 → 0..1 CourseCompletion
```

### Check Constraints

```sql
CHECK (
  attendancePercentage IS NULL
  OR (attendancePercentage >= 0 AND attendancePercentage <= 100)
)
```

```sql
CHECK (
  (approvedBy IS NULL AND approvedAt IS NULL)
  OR
  (approvedBy IS NOT NULL AND approvedAt IS NOT NULL)
)
```

```sql
CHECK (version >= 1)
```

## 7.6 Completion Evaluation Materialization Rule

`CourseCompletion` may store current evaluation outcomes, but it must not become source of truth for:

- raw Attendance records;
- Invoice balances;
- Payment allocations;
- CourseCompletionRule definition;
- Exam marks;
- Certificate issue state.

Authoritative sources:

| Materialized Field | Authoritative Owner |
|---|---|
| `attendancePercentage` | Attendance Management |
| `examPassed` | Module 10 Result evidence |
| `paymentCompleted` | Finance & Receivables |
| rule thresholds | Course Catalog |
| Enrollment Course/Batch | Admission & Enrollment |
| certificate issue state | Certificate Management |

## 7.7 Recommended Indexes

```text
IDX_course_completion_status(completionStatus)
IDX_course_completion_approved_at(approvedAt)
IDX_course_completion_recommended_trainer(recommendedByTrainerId)
IDX_course_completion_status_updated(completionStatus, updatedAt)
IDX_course_completion_active_status(isActive, completionStatus)
```

Branch queries must join:

```text
CourseCompletion
→ Enrollment
→ branchId
```

If query performance later requires a module-owned read model, introduce it in reporting/query design rather than duplicating transactional branch ownership into the aggregate without architecture approval.

## 7.8 Effective Dating

Not present in current ER.

Do not add:

```text
effectiveFrom
effectiveTo
```

to `CourseCompletion`.

Re-evaluation changes current outcome and preserves history through:

- AuditLog;
- CompletionApproval records;
- versioning/concurrency;
- explicit state transitions.

If historic rule snapshots become mandatory, that requires a deliberate persistence model change.

## 7.9 Delete Behavior

CourseCompletion must not cascade-delete when Enrollment changes.

Enrollment cancellation or archival should result in a controlled completion state transition or deactivation according to business policy.

Never:

```text
Enrollment deleted → CourseCompletion physically deleted
```

---

# 8. Entity Specification — CompletionApproval

## 8.1 Ownership

| Attribute | Value |
|---|---|
| Context | Exam, Result & Completion Management for workflow record |
| Ownership | Owned transactional approval-stage record |
| Shared Audit Relationship | Audit & Compliance owns platform approval history/audit conventions |
| Parent | CourseCompletion |
| Branch Scope Derivation | `CompletionApproval → CourseCompletion → Enrollment.branchId` |
| Soft Delete | Required |
| Effective Dating | Not applicable |
| Auditing | Mandatory |

## 8.2 Table Name

```text
completion_approval
```

## 8.3 Field Specification

| Field | PostgreSQL Type | Nullable | Key | Default | Description |
|---|---|---:|---|---|---|
| `id` | repository ID type | No | PK | generated | Approval-stage identifier |
| `courseCompletionId` | FK ID type | No | FK | none | Parent CourseCompletion |
| `approvalLevel` | enum | No | composite business key | none | Trainer, Coordinator, Final stage |
| `approverUserId` | FK-compatible user ID | Yes while pending | FK/reference | null | Human approver User |
| `status` | enum | No | — | Pending | Stage status |
| `remarks` | `text` | Yes conditionally | — | null | Decision remarks |
| `approvedAt` | `timestamptz` | Yes | — | null | Approval timestamp |
| `createdAt` | `timestamptz` | No | — | current timestamp | Audit |
| `createdBy` | FK-compatible user ID | No | reference | none | Stage creator/system principal |
| `updatedAt` | `timestamptz` | No | — | current timestamp | Audit |
| `updatedBy` | FK-compatible user ID | No | reference | none | Last updater |
| `deletedAt` | `timestamptz` | Yes | — | null | Soft-delete field; normal workflow must not use it |
| `isActive` | `boolean` | No | — | true | Current active stage record |
| `version` | `integer` | No | — | 1 | Optimistic lock |

## 8.4 Approval Level Semantics

Functional levels:

```text
TRAINER_RECOMMENDATION
ACADEMIC_COORDINATOR_REVIEW
BRANCH_MANAGER_APPROVAL
```

Exact Prisma enum names must map semantically to these three required levels.

## 8.5 Status Semantics

Functional statuses:

```text
PENDING
APPROVED
REJECTED
SUPERSEDED
```

`SUPERSEDED` is required behaviorally when controlled re-evaluation invalidates the basis of an earlier decision.

If current Prisma status enum lacks `SUPERSEDED`:

- do not hard-delete or overwrite old approval history;
- preserve history through Audit & Compliance conventions;
- raise a model gap for schema amendment or explicit alternative representation.

## 8.6 Required Constraints

### Primary Key

```text
PK_completion_approval(id)
```

### Foreign Keys

```text
FK_completion_approval_completion
CompletionApproval.courseCompletionId → CourseCompletion.id
ON UPDATE RESTRICT
ON DELETE RESTRICT
```

```text
FK_completion_approval_user
CompletionApproval.approverUserId → User.id
ON UPDATE RESTRICT
ON DELETE RESTRICT
```

### Active Stage Uniqueness

For one active stage record per level:

```text
UQ_completion_approval_active_level
(courseCompletionId, approvalLevel)
WHERE deletedAt IS NULL AND isActive = true
```

This allows historical superseded stage rows only if they are explicitly deactivated/superseded according to approved repository policy.

### Status/Actor Consistency

Conceptual checks:

```text
PENDING:
    approverUserId may be null until actor claims/acts
    approvedAt must be null

APPROVED:
    approverUserId not null
    approvedAt not null

REJECTED:
    approverUserId not null
    approvedAt null
    remarks required

SUPERSEDED:
    historical decision retained
```

Database check constraints should be implemented where enum mechanics permit.

### Rejection Remarks

Application invariant:

```text
status = REJECTED
→ trim(remarks) must not be empty
```

## 8.7 Recommended Indexes

```text
IDX_completion_approval_completion(courseCompletionId)
IDX_completion_approval_status(status)
IDX_completion_approval_level_status(approvalLevel, status)
IDX_completion_approval_approver(approverUserId, status)
IDX_completion_approval_pending(createdAt)
IDX_completion_approval_active_level(courseCompletionId, approvalLevel, isActive)
```

## 8.8 Effective Dating

Not applicable.

Approval decision time is represented by:

- `createdAt`;
- `updatedAt`;
- `approvedAt`;
- audit/action timestamps.

Do not add effective dates merely to model workflow history.

## 8.9 Delete Behavior

No approval stage may be hard deleted.

Invalidated approval history must be:

- preserved;
- superseded or marked inactive according to approved schema;
- traceable through audit history.

---

# 9. Relationship Model

## 9.1 Context-Owned Relationships

```text
Exam 1 ─────── 0..N Result

Enrollment 1 ─────── 0..1 CourseCompletion

CourseCompletion 1 ─────── 0..N CompletionApproval
```

## 9.2 Cross-Context Relationships

```text
Course 1 ─────── 0..N Exam
Batch 1 ─────── 0..N Exam

Enrollment 1 ─────── 0..N Result

TrainerProfile 1 ─────── 0..N CourseCompletion
    through recommendedByTrainerId

User 1 ─────── 0..N CompletionApproval
    through approverUserId

User 1 ─────── 0..N CourseCompletion
    through approvedBy
```

---

# 10. Detailed Relationship and Referential Action Matrix

| Parent | Child | Cardinality | FK | On Update | On Delete | Reason |
|---|---|---|---|---|---|---|
| Course | Exam | 1:N | `Exam.courseId` | RESTRICT | RESTRICT | Course is externally owned and historic Exam must remain traceable |
| Batch | Exam | 1:N | `Exam.batchId` | RESTRICT | RESTRICT | Exam is tied to delivery context |
| Exam | Result | 1:N | `Result.examId` | RESTRICT | RESTRICT | Academic evidence must not cascade-delete |
| Enrollment | Result | 1:N across different Exams | `Result.enrollmentId` | RESTRICT | RESTRICT | Enrollment is central lifecycle reference |
| Enrollment | CourseCompletion | 1:0..1 | `CourseCompletion.enrollmentId` | RESTRICT | RESTRICT | Preserve completion history |
| CourseCompletion | CompletionApproval | 1:N | `CompletionApproval.courseCompletionId` | RESTRICT | RESTRICT | Preserve ordered approval evidence |
| TrainerProfile | CourseCompletion | 1:N optional | `recommendedByTrainerId` | RESTRICT | RESTRICT | Do not lose trainer recommendation provenance |
| User | CourseCompletion | 1:N optional | `approvedBy` | RESTRICT | RESTRICT | Preserve final approver provenance |
| User | CompletionApproval | 1:N optional/pending | `approverUserId` | RESTRICT | RESTRICT | Preserve decision actor |
| User | common audit columns | 1:N | `createdBy`, `updatedBy`, `recordedBy` | RESTRICT | RESTRICT | Preserve audit actor |

## 10.1 No Cascade Delete Rule

There must be no cascade deletion path from:

```text
Course → Exam
Batch → Exam
Exam → Result
Enrollment → Result
Enrollment → CourseCompletion
CourseCompletion → CompletionApproval
User → academic evidence
TrainerProfile → completion history
```

This protects academic, approval, and audit evidence.

---

# 11. N:M Relationship Check

The current owned Module 10 persistence model requires no direct N:M join table.

Relationships that may appear many-to-many at business level are resolved elsewhere.

Example:

```text
Trainer ↔ Batch
```

is owned through:

```text
BatchTrainer
```

in Training Delivery.

Module 10 must not create:

```text
ExamTrainer
CompletionTrainer
StudentExamEnrollment
```

unless a future DDD/ER amendment explicitly introduces those concepts.

Current result roster eligibility is resolved through:

```text
Exam → Batch
Enrollment → Batch
Result → Enrollment + Exam
```

---

# 12. Branch Scoping Model

## 12.1 Core Rule

Branch scope must be derived from authoritative transactional relationships.

Do not authorize using:

```text
request.body.branchId
query.branchId
hidden form branch value
client-side selected branch
```

alone.

## 12.2 Branch Resolution Paths

### Exam

```text
Exam
→ Batch
→ branchId
```

### Result

Primary scope path:

```text
Result
→ Exam
→ Batch
→ branchId
```

Consistency path:

```text
Result
→ Enrollment
→ branchId
```

Both must agree.

### CourseCompletion

```text
CourseCompletion
→ Enrollment
→ branchId
```

### CompletionApproval

```text
CompletionApproval
→ CourseCompletion
→ Enrollment
→ branchId
```

## 12.3 Read Scope

Server authorization conceptually computes:

```text
effectiveReadBranches =
    directlyAssignedBranches
    + permittedChildBranches
    + consolidatedBranches when canViewConsolidated permits
```

Queries must intersect:

```text
entityDerivedBranchId IN effectiveReadBranches
```

## 12.4 Mutation Scope

Mutation permission is stricter than consolidated read visibility.

Conceptual rule:

```text
mayMutate =
    permissionGranted
    AND entityBranchId IN effectiveMutationBranches
    AND entityStateAllowsAction
    AND domainEligibilityPasses
    AND expectedVersionMatches
```

Consolidated reporting access must not automatically grant mutation rights.

---

# 13. CRUD Action Semantics

CRUD in this module does not mean unrestricted generic database operations.

Definitions:

| CRUD Symbol | Meaning in this FRD |
|---|---|
| C | Create through domain command |
| R | Read through authorized query |
| U | Update through state-valid application command |
| D | Soft delete/archive/deactivate only; never physical delete |
| — | No allowed direct action |

For sensitive entities:

- Result correction is classified as `U`, but requires dedicated correction permission and audit reason.
- Completion evaluation is classified as `C/U`.
- Approval decision is classified as `C/U` through stage commands.
- Human actors do not directly `D` Results, CourseCompletion, or CompletionApproval in normal operations.

---

# 14. Human Actor CRUD Matrix

Legend:

```text
C = Create through use case
R = Read
U = State-valid update
D* = Soft delete/archive only under explicit policy
RC = Restricted correction update
A = Approval-stage action
— = No direct access
```

| Human Actor | Exam | Result | CourseCompletion | CompletionApproval | Branch Logic |
|---|---|---|---|---|---|
| Trainer | R | C/R/U before finalization when permitted | R | C/R/U for Trainer Recommendation stage only | Assigned/authorized Batch plus branch access |
| Academic Coordinator | C/R/U/D* | C/R/U; finalize when permitted | C/R/U evaluate | C/R/U for Coordinator Review stage | Authorized mutation branches |
| Academic Administrator | C/R/U/D* | C/R/U/RC with separate permissions | C/R/U/reevaluate | R/U according to explicit stage permission | Authorized branches; consolidated read separate |
| Branch Manager | R | R | R/U final decision outcome via command | C/R/U for Final Approval/Reject stage | Entity branch must be inside manager mutation scope |
| Auditor / Compliance Reader | R | R | R | R | Read-only authorized branches; audit permission required |
| Read-Only Academic User | R | R | R | R where permitted | Effective read branches only |
| Unauthorized User | — | — | — | — | No data leakage |

---

# 15. System Actor CRUD Matrix

| System Actor / Application Process | Exam | Result | CourseCompletion | CompletionApproval | Scope Rule |
|---|---|---|---|---|---|
| Completion Evaluation Service | R | R | C/R/U | R | Enrollment-derived branch and application-service authority |
| Completion Re-evaluation Process | R | R | R/U | R/U only for supersession/restart mechanics | Trigger must identify affected Enrollment and preserve history |
| Result Correction Workflow | R | R/U | R/U or mark reevaluation required | R | Same branch as Result; dedicated command authority |
| Pending Work Queue Query | R | R | R | R | Read scope intersection only |
| Export Service | R | R | R | R | Export permission + effective read branches |
| Reporting Read Model Projector | R | R | R | R | Read-only consumption; no transactional ownership |
| Certificate Eligibility Handoff | R | R | R | R | Read/consume approved eligibility only; no Certificate creation here |
| Audit Writer | event/metadata consume | event/metadata consume | event/metadata consume | event/metadata consume | Audit context owns AuditLog |
| Notification Process | R summary only | R summary only | R summary only | R summary only | Communication context receives approved event payload |
| Generic Background Job | — unless explicitly authorized | — | — | — | No implicit elevated access |

---

# 16. Detailed Actor Permission-to-Entity Matrix

## 16.1 Exam Permissions

| Permission | Entity | Allowed Operation | Conditions |
|---|---|---|---|
| `exam.read` | Exam | R | Read branch scope |
| `exam.create` | Exam | C | Batch branch in mutation scope; Course-Batch match |
| `exam.update` | Exam | U | Mutable state; version match |
| `exam.schedule` | Exam | U | Valid state and date |
| `exam.activate` | Exam | U | Scheduled state and ready for result entry |
| `exam.close` | Exam | U | Open state; server close guards pass |
| `exam.cancel` | Exam | U | Cancellable state; reason required where policy mandates |
| repository admin archive capability | Exam | D* | Soft-delete/archive only and safe-state checks |

## 16.2 Result Permissions

| Permission | Entity | Allowed Operation | Conditions |
|---|---|---|---|
| `result.read` | Result | R | Branch scope |
| `result.record` | Result | C/U | Exam open; Enrollment match; non-finalized |
| `result.bulk-record` | Result | C/U | Same as record plus row validation and transaction policy |
| `result.finalize` | Result | U | Finalizable state; version valid |
| `result.correct` | Result | RC | Finalized/current protected result; mandatory reason; audit; reevaluation |

## 16.3 Completion Permissions

| Permission | Entity | Allowed Operation | Conditions |
|---|---|---|---|
| `completion.read` | CourseCompletion | R | Read branch |
| `completion.evaluate` | CourseCompletion | C/U | Valid Enrollment and authoritative dependencies |
| `completion.reevaluate` | CourseCompletion | U | Traceable evidence change or authorized remediation |
| `completion.recommend` | CourseCompletion + CompletionApproval | U/A | Assigned/authorized Trainer and correct stage |
| `completion.coordinator-review` | CompletionApproval | A | Trainer stage complete |
| `completion.final-approve` | CourseCompletion + CompletionApproval | U/A | Coordinator stage complete; current evidence valid |
| `completion.reject` | CompletionApproval + CourseCompletion outcome | U/A | Correct stage; reason required |
| `completion.export` | Read models/entities | R/export | Export branch scope |
| `completion.audit.read` | Audit projection | R | Audit permission and entity branch scope |

---

# 17. CRUD Workflow Examples

## 17.1 Create Exam

```text
Actor: Academic Coordinator

Exam:
C

Course:
R reference only

Batch:
R reference only

Branch:
R through Batch relationship

AuditLog:
No direct CRUD by Module 10 UI
Audit event/write through Audit convention
```

## 17.2 Record Result

```text
Actor: Trainer

Exam:
R

Enrollment:
R reference/validation only

Result:
C

CourseCompletion:
No direct mutation during ordinary Result creation
unless application workflow explicitly queues evaluation

Audit:
write evidence through shared convention
```

## 17.3 Correct Finalized Result

```text
Actor: Restricted Academic Authority

Result:
R + restricted U

CourseCompletion:
R + controlled U/re-evaluation

CompletionApproval:
R
possibly U to supersede/restart workflow according to model policy

Certificate:
No CRUD
Eligibility change communicated to Certificate context
```

## 17.4 Final Completion Approval

```text
Actor: Branch Manager

CourseCompletion:
R + U final completion fields/status

CompletionApproval:
C/U final stage decision

Enrollment:
No direct repository CRUD
completion outcome synchronized through Enrollment application boundary

Certificate:
No create
Certificate context consumes eligibility outcome
```

---

# 18. Cross-Context Reference Matrix

| Referenced Entity | Owning Context | Used By Owned Entity | Relationship Purpose | Module 10 CRUD |
|---|---|---|---|---|
| Course | Course Catalog | Exam | Exam course context | R only |
| CourseCompletionRule | Course Catalog | Completion evaluator | Completion thresholds/rules | R only |
| Batch | Training Delivery | Exam | Delivery context and branch derivation | R only |
| BatchTrainer | Training Delivery | Recommendation validator | Validate Trainer assignment | R only |
| Enrollment | Admission & Enrollment | Result, CourseCompletion | Central learner lifecycle | R; outcome sync through application boundary only |
| StudentProfile | Admission & Enrollment | Query/read projection | Learner display | R only |
| Person | Shared Party model | Query/read projection | Display identity | R only |
| AttendanceRecord / attendance projection | Attendance | Completion evaluator | Attendance criterion | R only |
| Invoice/Payment/Receivable validation projection | Finance & Receivables | Completion evaluator | Payment criterion | R only |
| TrainerProfile | Faculty / Trainer | CourseCompletion recommendation reference | Recommendation provenance | R/reference only |
| User | IAM | Audit actor and approver references | Actor identity | R/reference only |
| UserBranchAccess | IAM | Authorization | Branch scope | R through policy |
| Certificate | Certificate Management | downstream | Issue/verify/revoke | No CRUD |
| AuditLog | Audit & Compliance | all sensitive actions | Immutable audit evidence | Write through audit boundary; not owned |
| ApprovalRequest/ApprovalHistory | Audit & Compliance | shared approval governance where used | Platform approval trace | Do not duplicate without explicit integration design |
| DashboardWidget/MetricSnapshot | Reporting | reporting | KPI/read consumption | No transactional CRUD |

---

# 19. Ownership Check Matrix

Status values:

```text
OWNED
REFERENCED
CONCEPTUAL-NOT-SEPARATE
PROHIBITED-DUPLICATE
FUTURE/OUT-OF-SCOPE
```

| Entity / Concept | Status | Owning Context | Module 10 Treatment |
|---|---|---|---|
| Exam | OWNED | Exam & Completion | Persist and manage |
| Result | OWNED | Exam & Completion | Persist and manage |
| CourseCompletion | OWNED | Exam & Completion | Persist evaluation/current outcome |
| CompletionApproval | OWNED | Exam & Completion transactional workflow | Persist stage decision; integrate with Audit conventions |
| Assessment | CONCEPTUAL-NOT-SEPARATE | Exam & Completion | Current scope uses Exam |
| Grade | CONCEPTUAL-NOT-SEPARATE | Exam & Completion concept | Store `Result.grade`; no Grade table |
| CompletionRuleEvaluation | CONCEPTUAL-NOT-SEPARATE | Exam & Completion behavior | Evaluate in domain/application service; materialize outcome in CourseCompletion |
| ResultAttempt | PROHIBITED-DUPLICATE until model amendment | Not defined | Do not create |
| ResultRevision | PROHIBITED-DUPLICATE until model amendment | Not defined; audit handles history | Do not create |
| Course | REFERENCED | Course Catalog | FK/read only |
| CourseCompletionRule | REFERENCED | Course Catalog | Read authoritative rule |
| CoursePricing | PROHIBITED-DUPLICATE | Course Catalog | Not part of Module 10 |
| Batch | REFERENCED | Training Delivery | FK/read only |
| Session | REFERENCED only if future assessment scheduling requires it | Training Delivery | Do not copy |
| BatchTrainer | REFERENCED | Training Delivery | Validate assigned Trainer |
| Enrollment | REFERENCED | Admission & Enrollment | Central lifecycle FK/read |
| StudentProfile | REFERENCED | Admission & Enrollment | Display/reference |
| Person | REFERENCED | Party model | Display identity |
| AttendanceSession | REFERENCED | Attendance | No ownership |
| AttendanceRecord | REFERENCED | Attendance | Read authoritative outcome |
| AttendanceCorrection | REFERENCED | Attendance | Evidence-change trigger only |
| Invoice | REFERENCED | Finance | Do not copy |
| Payment | REFERENCED | Finance | Do not copy |
| Receivable | REFERENCED | Finance | Do not copy |
| PaymentValidation | CONCEPTUAL READ CONTRACT | Finance | Consume authoritative validation response |
| TrainerProfile | REFERENCED | Faculty / Trainer | Recommendation reference |
| User | REFERENCED | IAM | Actor reference |
| Role | PROHIBITED-DUPLICATE | IAM | No Module 10 role table |
| Permission | PROHIBITED-DUPLICATE | IAM | No Module 10 permission table |
| UserBranchAccess | REFERENCED | IAM | Authorization policy input |
| Certificate | PROHIBITED-DUPLICATE | Certificate Management | No create/update here |
| CertificateVerification | PROHIBITED-DUPLICATE | Certificate Management | No ownership |
| AuditLog | REFERENCED/WRITTEN THROUGH BOUNDARY | Audit & Compliance | Sensitive action audit |
| ApprovalRequest | REFERENCED where shared governance is integrated | Audit & Compliance | Do not duplicate workflow engine |
| ApprovalHistory | REFERENCED | Audit & Compliance | Shared history; Module 10 keeps CompletionApproval transactional stages |
| NotificationRequest | REFERENCED EVENT CONSUMER | Communication | Module 10 emits outcome; does not own request table |
| MetricSnapshot | REFERENCED/PROJECTION | Reporting | Reporting consumes Module 10 data |
| Retake | FUTURE/OUT-OF-SCOPE | Undefined | Requires DDD/ER change |
| Weighted Assessment | FUTURE/OUT-OF-SCOPE | Undefined | Requires DDD/ER change |
| Exam Question Bank | FUTURE/OUT-OF-SCOPE | Undefined | Do not create |
| Online Proctoring | FUTURE/OUT-OF-SCOPE | Undefined | Do not create |

---

# 20. Entity-Level Data Ownership Boundaries

## 20.1 Course Rule Data

Prohibited fields on Module 10 tables:

```text
minAttendancePercentage copied as authoritative configuration
examRequired copied as editable Module 10 setting
paymentRequired copied as editable Module 10 setting
manualApprovalRequired copied as editable Module 10 setting
certificateAllowed copied as editable Module 10 setting
```

These belong to `CourseCompletionRule`.

A read-only evaluation snapshot is a future modeling decision and must not be invented silently.

## 20.2 Attendance Data

Do not add:

```text
presentCount
absentCount
lateCount
attendanceRecordsJson
manualAttendanceOverride
```

to CourseCompletion.

Only the evaluated materialized percentage/outcome fields supported by ER may be stored.

## 20.3 Finance Data

Do not add:

```text
invoiceId
outstandingAmount
paidAmount
paymentOverride
financeApprovedBy
```

to CourseCompletion unless a future explicit model amendment requires traceable finance evidence references.

Current field:

```text
paymentCompleted
```

is a materialized validation outcome, not Finance ownership transfer.

## 20.4 Certificate Data

Do not add to CourseCompletion:

```text
certificateNumber
certificateUrl
verificationCode
qrCodeUrl
issuedDate
certificateStatus as source of truth
```

Certificate context owns those fields.

---

# 21. Transaction Boundary Recommendations

## 21.1 Exam Creation Transaction

Atomic within Module 10 database transaction:

```text
Insert Exam
Write module-local operational metadata
Commit
```

Audit integration follows repository convention.

Cross-context Course and Batch validation must occur before persistence or within safe transaction/query semantics available in the modular monolith.

## 21.2 Result Recording Transaction

For individual result:

```text
Validate Exam
Validate Enrollment
Validate branch
Validate marks
Derive result status
Insert/update Result
Increment version
Commit
```

## 21.3 Bulk Result Transaction Policy

The application must choose and document one explicit policy.

Recommended production behavior:

```text
Phase 1: Validate all rows without write.
Phase 2: User confirms valid payload.
Phase 3: Submit transaction.
Phase 4: All confirmed rows in one bounded submission succeed or fail atomically,
         unless the API contract explicitly implements deterministic chunked transactions.
```

Do not silently partially save rows while returning a generic success response.

## 21.4 Completion Evaluation Transaction

Within Module 10:

```text
Load or create CourseCompletion
Apply evaluation outcome
Update status
Increment version
Create/activate next CompletionApproval stage when required
Commit atomically
```

External evidence must be loaded through approved boundaries before final state mutation.

## 21.5 Approval Decision Transaction

Atomic:

```text
Validate current CourseCompletion state/version
Update CompletionApproval stage
Advance/reject CourseCompletion state
Set final approvedBy/approvedAt where applicable
Increment versions
Commit
```

Downstream Enrollment/Certificate integration occurs through defined application/domain event boundary, not cross-context repository mutation.

---

# 22. Data Integrity Rules

| ID | Integrity Rule |
|---|---|
| DI-EXC-001 | Exam must reference an existing Course |
| DI-EXC-002 | Exam must reference an existing Batch |
| DI-EXC-003 | Exam Course must equal Batch Course |
| DI-EXC-004 | Exam `maxMarks > 0` |
| DI-EXC-005 | Exam `passMarks >= 0` |
| DI-EXC-006 | Exam `passMarks <= maxMarks` |
| DI-EXC-007 | Result must reference existing Exam |
| DI-EXC-008 | Result must reference existing Enrollment |
| DI-EXC-009 | One active Result per Exam + Enrollment |
| DI-EXC-010 | Result Enrollment Course and Batch must match Exam |
| DI-EXC-011 | `marksObtained >= 0` |
| DI-EXC-012 | `marksObtained <= Exam.maxMarks` |
| DI-EXC-013 | Result outcome derived from marks and pass threshold |
| DI-EXC-014 | One active CourseCompletion per Enrollment |
| DI-EXC-015 | Attendance percentage, when present, is 0..100 |
| DI-EXC-016 | Approved completion has both `approvedBy` and `approvedAt` |
| DI-EXC-017 | Trainer recommendation reference must point to TrainerProfile |
| DI-EXC-018 | CompletionApproval must reference CourseCompletion |
| DI-EXC-019 | Approval stage order cannot be skipped |
| DI-EXC-020 | Rejection requires remarks |
| DI-EXC-021 | No hard delete of academic evidence |
| DI-EXC-022 | All mutations enforce optimistic version |
| DI-EXC-023 | All reads/mutations apply server-side branch scope |
| DI-EXC-024 | Cross-context source data is not duplicated as owned truth |
| DI-EXC-025 | Certificate creation does not occur in Module 10 |

---

# 23. Index Strategy by Query Pattern

## 23.1 Exam List

Query pattern:

```text
branch through Batch
course
batch
date range
status
search exam name
```

Indexes:

```text
Exam(batchId, status)
Exam(courseId, examDate)
Exam(status, examDate)
```

Potential read-model optimization may denormalize branch for reporting, but transactional Exam ownership remains unchanged.

## 23.2 Missing Result Queue

Query pattern:

```text
Exam
+ eligible Enrollment roster
LEFT JOIN Result
WHERE Result missing
```

Required indexes:

```text
Result(examId, enrollmentId) unique active
Enrollment(batchId, enrollmentStatus) owned elsewhere
Exam(batchId, status)
```

## 23.3 Completion Evaluation Queue

Query pattern:

```text
CourseCompletion.completionStatus
Enrollment.branchId
updatedAt
```

Indexes:

```text
CourseCompletion(completionStatus, updatedAt)
CourseCompletion(enrollmentId) unique
Enrollment(branchId, enrollmentStatus) owned elsewhere
```

## 23.4 Approval Queues

Query pattern:

```text
approvalLevel
status
branch through CourseCompletion → Enrollment
oldest pending first
```

Indexes:

```text
CompletionApproval(approvalLevel, status)
CompletionApproval(status, createdAt)
CompletionApproval(courseCompletionId)
```

## 23.5 Trainer Recommendation Queue

Query pattern:

```text
pending trainer stage
Trainer assignment from BatchTrainer
branch scope
```

Do not add Trainer ID redundantly to CompletionApproval solely for queue convenience unless domain design requires assignment ownership.

Use approved read composition/read model.

---

# 24. Data Retention and Archival Requirements

Academic result and completion records are institutional evidence.

Minimum behavior:

- no ordinary hard deletion;
- correction history retained;
- approval history retained;
- audit actor retained;
- archival must preserve referential integrity;
- archived parent records must remain resolvable for authorized audit queries.

Exact statutory retention duration is outside this Part and must be defined in Security/Compliance requirements.

---

# 25. Schema Gaps Requiring Prisma Validation

## GAP-DB-EXC-001 — Result Finalization Fields

Need to verify whether Prisma contains:

```text
finalizedAt
finalizedBy
or equivalent lifecycle representation
```

Without such representation, Part 2 finalization behavior requires a deliberate implementation decision.

## GAP-DB-EXC-002 — Result Correction History

ER has no dedicated ResultRevision entity.

Required current approach:

```text
AuditLog old/new values
mandatory reason
versioning
```

A separate revision table must not be invented without DDD/ER amendment.

## GAP-DB-EXC-003 — Completion Status Enum

Part 2 functional states require mapping to actual Prisma enum.

Required semantic capabilities include:

```text
not evaluated
evidence incomplete/pending
not eligible
manual approval stages
approved
rejected
reevaluation/exception state
```

If the schema cannot represent these safely, raise a model gap.

## GAP-DB-EXC-004 — CompletionApproval Supersession

Need to verify whether approval status/history representation supports re-evaluation invalidation while preserving old decisions.

## GAP-DB-EXC-005 — Grade Semantics

ER stores free/basic `grade`.

Need to confirm:

- free text vs enum;
- length;
- whether grade is derived or manually entered;
- whether localized display mapping exists.

Do not create Grade master until ownership/model is explicitly approved.

## GAP-DB-EXC-006 — Common Base Fields

ER recommends common fields for most operational tables, but the Module 10 entity snippets do not repeat them.

Prisma must be checked for:

```text
createdAt
createdBy
updatedAt
updatedBy
deletedAt
isActive
version
```

Missing fields should be classified as implementation gaps against repository conventions.

---

# 26. Final Persistence Boundary

The final transactional boundary for Module 10 is:

```text
OWN:
    Exam
    Result
    CourseCompletion
    CompletionApproval

REFERENCE:
    Course
    CourseCompletionRule
    Batch
    BatchTrainer
    Enrollment
    StudentProfile
    Person
    Attendance evidence
    Finance payment validation
    TrainerProfile
    User
    UserBranchAccess
    Certificate eligibility/issue status read contract
    Audit conventions

DO NOT CREATE:
    Assessment table
    Grade master table
    CompletionRuleEvaluation table
    ResultAttempt table
    ResultRevision table
    PaymentValidation table
    CompletionAttendance table
    Module-specific User/Role/Permission tables
    Module-specific Certificate table
```

The key persistence principle is:

```text
Module 10 stores academic assessment results and completion decisions.
It references, but does not take ownership of,
course rules, enrollment identity, attendance truth,
finance truth, IAM authorization, or certificate issuance.
```
