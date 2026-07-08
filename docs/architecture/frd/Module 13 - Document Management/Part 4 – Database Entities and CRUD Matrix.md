# Part 4 – Database Entities and CRUD Matrix

## Module 13 – Document Management

## 1. Purpose and Data-Model Boundary

This part defines the persistence model and CRUD ownership boundary for Module 13 – Document Management.

The design is constrained by the ASTI IMS DDD Context Map, ER Model v3, and the approved Module 13 FRD Parts 1–3. The module owns document lifecycle metadata and immutable verification-decision history. It does not own the master data of the person, student, trainer, corporate account, user, branch, audit, notification, or reporting contexts.

The current DDD/ER baseline justifies exactly two business persistence models inside this bounded context:

```text
Document Management bounded context
│
├── Document                    aggregate/root lifecycle record
└── DocumentVerification        immutable verification-decision history
```

The following are references or infrastructure concerns and are **not** new Document Management-owned domain tables:

```text
StudentProfile            Admission & Enrollment reference
TrainerProfile            Faculty / Trainer reference
CorporateAccount          Corporate Training reference
Person                    shared Party / Person reference
User                      IAM reference for uploadedBy / verifiedBy
Branch                    Organization reference, resolved indirectly through owner scope
LookupValue / type config Configuration / Master Data reference
AuditLog                   Audit & Compliance-owned
NotificationRequest        Communication-owned
Dashboard / MetricSnapshot Reporting-owned
Vercel Blob object         infrastructure storage object, not a database aggregate
```

### 1.1 Prisma Schema Alignment and Reconciliation

The actual `packages/database/prisma/schema.prisma` is implemented in the codebase. There are structural differences between the conceptual ER model and the physical database schema that must be aligned during development:

1. **Owner Polymorphism (`DocumentOwner` table):** The ER model assumes polymorphic owner columns (`ownerType` and `ownerId`) directly on `Document`. The actual schema uses a distinct join table `DocumentOwner` (`document_owners`) to support a many-to-many relationship where a single document can have multiple owners (e.g., shared by a `Person` and their `StudentProfile`).
2. **Direct Branch Scoping (`branchId` column):** While the ER model relies on dynamically deriving the branch from the owner, the actual schema persists `branchId` directly on the `Document` model as a foreign key linking to `Branch`. This simplifies branch isolation checks.
3. **Lifecycle Status Separation:** The ER model uses a single `verificationStatus` field on `Document` and `status` on `DocumentVerification`. The actual schema separates this concern:
   - `Document.status` uses the `DocumentStatus` enum (`Draft`, `Active`, `Expired`, `Replaced`, `Deleted`).
   - `DocumentVerification.outcome` uses the `VerificationOutcome` enum (`Pending`, `Verified`, `Rejected`).
4. **Static Document Types:** The ER model assumes dynamic Configuration-backed lookup types, but the schema uses a hardcoded enum `DocumentType` (`CIVIL_ID_FRONT`, `CIVIL_ID_BACK`, `PASSPORT_SCAN`, `ACADEMIC_TRANSCRIPT`, `SPONSORSHIP_LETTER`, `OTHER`).
5. **Implementation Gaps (Missing Fields):** Fields like `issueDate` and `expiryDate` defined conceptually in the ER model are currently **missing** from `schema.prisma` and must be added via a migration.

---

# 2. Aggregate and Table Ownership Summary

| Entity / Table         | Classification                   | Owning Bounded Context            | Module 13 Usage                                                                                    | Create Local Table? |
| ---------------------- | -------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------- |
| `Document`             | Owned aggregate/lifecycle record | Document Management               | Primary document metadata, file reference, branch link, and overall lifecycle status               | Yes                 |
| `DocumentOwner`        | Owned relation table             | Document Management               | Many-to-many link between a Document and its business owners (Student, Trainer, Corporate, Person) | Yes                 |
| `DocumentVerification` | Owned child/history entity       | Document Management               | Immutable verification decision history                                                            | Yes                 |
| `DocumentType`         | Scalar Enum                      | Document Management / Master Data | Validate and classify document category                                                            | No (Prisma enum)    |
| `StudentProfile`       | Referenced                       | Admission & Enrollment            | Owner validation                                                                                   | No                  |
| `TrainerProfile`       | Referenced                       | Faculty / Trainer Management      | Owner validation                                                                                   | No                  |
| `CorporateAccount`     | Referenced                       | Corporate Training                | Owner validation                                                                                   | No                  |
| `Person`               | Referenced                       | Shared Party / Person model       | Generic person-level document owner                                                                | No                  |
| `User`                 | Referenced                       | Identity & Access Management      | `createdBy`, verifier, authorization context                                                       | No                  |
| `Branch`               | Referenced                       | Organization Management           | Branch isolation via direct branch reference                                                       | No                  |
| `UserBranchAccess`     | Referenced                       | Identity & Access Management      | Authorized branch set and consolidated access                                                      | No                  |
| `AuditLog`             | Referenced side-effect target    | Audit & Compliance                | Sensitive action audit facts                                                                       | No                  |
| `NotificationRequest`  | Referenced side-effect target    | Communication & Notification      | Expiry reminder delivery                                                                           | No                  |

---

# 3. Entity Specification – `Document`

## 3.1 Purpose

`Document` is the primary lifecycle record for a stored business document. It links one stored file key to a branch and carries the overall status and creation/audit timestamps. Owner relationships are decoupled via the `DocumentOwner` join table.

## 3.2 Physical table

Physical SQL table name: `documents`  
Prisma model name: `Document`

## 3.3 Field specification

| Field          | Recommended DB Type  | Prisma-Oriented Type                          | Nullability | Key / Constraint       | Description                                                                                                                 |
| -------------- | -------------------- | --------------------------------------------- | ----------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `id`           | `uuid`               | `String @id @default(uuid()) @db.Uuid`        | NOT NULL    | PK                     | Unique document identifier                                                                                                  |
| `fileKey`      | `varchar(255)`       | `String @db.VarChar(255)`                     | NOT NULL    | None                   | Storage file path/key returned by Vercel Blob                                                                               |
| `fileName`     | `varchar(255)`       | `String @db.VarChar(255)`                     | NOT NULL    | None                   | Original/safe file name for UI display                                                                                      |
| `fileType`     | `varchar(100)`       | `String @db.VarChar(100)`                     | NOT NULL    | None                   | MIME content-type of the file (e.g. application/pdf)                                                                        |
| `documentType` | `varchar(50)` (enum) | `DocumentType` enum                           | NOT NULL    | Enum constraint        | Standard category: `CIVIL_ID_FRONT`, `CIVIL_ID_BACK`, `PASSPORT_SCAN`, `ACADEMIC_TRANSCRIPT`, `SPONSORSHIP_LETTER`, `OTHER` |
| `branchId`     | `uuid`               | `String @db.Uuid`                             | NOT NULL    | FK → `Branch.id`       | Branch this document belongs to, derived from owner during upload                                                           |
| `status`       | `varchar(32)` (enum) | `DocumentStatus` enum                         | NOT NULL    | Default `Active`       | Lifecycle state: `Draft`, `Active`, `Expired`, `Replaced`, `Deleted`                                                        |
| `issueDate`    | `date`               | `DateTime? @db.Date`                          | NULL        | **IMPLEMENTATION GAP** | Business issue date (To be added via migration)                                                                             |
| `expiryDate`   | `date`               | `DateTime? @db.Date`                          | NULL        | **IMPLEMENTATION GAP** | Business expiry date (To be added via migration)                                                                            |
| `version`      | `integer`            | `Int @default(1)`                             | NOT NULL    | **IMPLEMENTATION GAP** | Optimistic lock token (To be added via migration)                                                                           |
| `createdAt`    | `timestamptz`        | `DateTime @default(now()) @db.Timestamptz(6)` | NOT NULL    | None                   | Record creation timestamp                                                                                                   |
| `createdBy`    | `uuid`               | `String? @db.Uuid`                            | NULL        | None                   | Creator user ID (resolves to IAM User)                                                                                      |
| `updatedAt`    | `timestamptz`        | `DateTime? @db.Timestamptz(6)`                | NULL        | None                   | Record update timestamp                                                                                                     |
| `updatedBy`    | `uuid`               | `String? @db.Uuid`                            | NULL        | None                   | Editor user ID                                                                                                              |
| `deletedAt`    | `timestamptz`        | `DateTime? @db.Timestamptz(6)`                | NULL        | None                   | Soft-delete timestamp                                                                                                       |
| `deletedBy`    | `uuid`               | `String? @db.Uuid`                            | NULL        | None                   | Soft-delete actor                                                                                                           |
| `isDeleted`    | `boolean`            | `Boolean @default(false)`                     | NOT NULL    | Default `false`        | Soft-delete flag                                                                                                            |

## 3.4 Keys and constraints

### Primary key

```text
PK_Document(id)
```

### Foreign keys

```text
FK_Document_Branch
(branchId) REFERENCES branches(id) ON DELETE RESTRICT
```

### Required check constraints (Logical/Application-level)

```text
CHK_Document_DateRange
expiryDate IS NULL OR issueDate IS NULL OR expiryDate >= issueDate
```

## 3.5 Indexes

| Index Name            | Columns               | Type   | Purpose                                                          |
| --------------------- | --------------------- | ------ | ---------------------------------------------------------------- |
| `IDX_Document_Branch` | `(branchId)`          | B-tree | Branch-scoping queries (Exists in Prisma: `@@index([branchId])`) |
| `IDX_Document_Status` | `(status, isDeleted)` | B-tree | Registry filtering                                               |
| `IDX_Document_Expiry` | `(expiryDate)`        | B-tree | Expiry alerts and background batch evaluation                    |

## 3.6 Current-state consistency rules

1. A document is created with `status = 'Active'` (and its initial verification outcome in `DocumentVerification` is `Pending`).
2. When the latest verification outcome changes:
   - `Verified` keeps document status as `Active`.
   - `Rejected` keeps document status as `Active` but indicates verification has failed (and remarks explain why).
3. `Expired` is set as `status = 'Expired'` when the current business date passes `expiryDate`.
4. When a new version of the document is uploaded to replace the current one, the old document status transitions to `Replaced`.
5. Soft-delete maps to `isDeleted = true` and `status = 'Deleted'` and is orthogonal to verification.

---

# 3.7 Entity Specification – `DocumentOwner`

## 3.7.1 Purpose

`DocumentOwner` is a relation table mapping `Document` to multiple business owners (`StudentProfile`, `TrainerProfile`, `CorporateAccount`, `Person`). This supports polymorphic ownership and shared evidence.

## 3.7.2 Physical table

Physical SQL table name: `document_owners`  
Prisma model name: `DocumentOwner`

## 3.7.3 Field specification

| Field        | Recommended DB Type | Prisma-Oriented Type                          | Nullability | Key / Constraint   | Description                                                       |
| ------------ | ------------------- | --------------------------------------------- | ----------- | ------------------ | ----------------------------------------------------------------- |
| `id`         | `uuid`              | `String @id @default(uuid()) @db.Uuid`        | NOT NULL    | PK                 | Unique record ID                                                  |
| `documentId` | `uuid`              | `String @db.Uuid`                             | NOT NULL    | FK → `Document.id` | Associated document                                               |
| `ownerId`    | `uuid`              | `String @db.Uuid`                             | NOT NULL    | Logical FK         | ID of the owner in their source context                           |
| `ownerType`  | `varchar(32)`       | `OwnerType` enum                              | NOT NULL    | Enum constraint    | Owner type: `Person`, `StudentProfile`, `Admission`, `Enrollment` |
| `createdAt`  | `timestamptz`       | `DateTime @default(now()) @db.Timestamptz(6)` | NOT NULL    | None               | Mapping creation time                                             |
| `createdBy`  | `uuid`              | `String? @db.Uuid`                            | NULL        | None               | User who created mapping                                          |

## 3.7.4 Keys and constraints

### Unique Constraint

```text
UQ_DocumentOwner_Document_Owner
UNIQUE (documentId, ownerId, ownerType)
```

### Foreign keys

```text
FK_DocumentOwner_Document
(documentId) REFERENCES documents(id) ON DELETE CASCADE
```

---

# 4. Entity Specification – `DocumentVerification`

## 4.1 Purpose

`DocumentVerification` preserves immutable verification decisions for a `Document`. It provides append-only decision history for approval/rejection actions and must never be rewritten to simulate later decisions.

## 4.2 Recommended physical table

Recommended SQL table name: `document_verifications`  
Recommended Prisma model name: `DocumentVerification`

## 4.3 Field specification

| Field        | Recommended DB Type  | Prisma-Oriented Type                          | Nullability | Key / Constraint                      | Description                                             |
| ------------ | -------------------- | --------------------------------------------- | ----------- | ------------------------------------- | ------------------------------------------------------- |
| `id`         | `uuid`               | `String @id @default(uuid()) @db.Uuid`        | NOT NULL    | PK                                    | Unique verification record ID                           |
| `documentId` | `uuid`               | `String @db.Uuid`                             | NOT NULL    | FK → `Document.id`, ON DELETE CASCADE | Parent document reference                               |
| `outcome`    | `varchar(32)` (enum) | `VerificationOutcome` enum                    | NOT NULL    | Default `Pending`                     | Verification outcome: `Pending`, `Verified`, `Rejected` |
| `verifiedBy` | `uuid`               | `String? @db.Uuid`                            | NULL        | FK → `User.id`                        | User who made the verification decision                 |
| `verifiedAt` | `timestamptz`        | `DateTime? @db.Timestamptz(6)`                | NULL        | None                                  | Timestamp when verification was completed               |
| `remarks`    | `text`               | `String? @db.Text`                            | NULL        | Mandatory on `Rejected`               | Remarks/rejection reason                                |
| `createdAt`  | `timestamptz`        | `DateTime @default(now()) @db.Timestamptz(6)` | NOT NULL    | None                                  | Creation timestamp of the record                        |
| `createdBy`  | `uuid`               | `String? @db.Uuid`                            | NULL        | None                                  | Actor who registered the record                         |

## 4.4 Keys and constraints

### Primary key

```text
PK_DocumentVerification(id)
```

### Foreign keys

```text
FK_DocumentVerification_Document
(documentId) REFERENCES documents(id) ON DELETE CASCADE

FK_DocumentVerification_Verifier
(verifiedBy) REFERENCES users(id) ON DELETE RESTRICT
```

### Rejection remarks constraint (Application-level)

```text
outcome = 'Rejected' -> remarks is required and trim(remarks) <> ''
```

## 4.5 Indexes

| Index Name                             | Columns                     | Type   | Purpose                                                                         |
| -------------------------------------- | --------------------------- | ------ | ------------------------------------------------------------------------------- |
| `IDX_DocumentVerification_Document`    | `(documentId)`              | B-tree | Fetch document verification history (Exists in Prisma: `@@index([documentId])`) |
| `IDX_DocumentVerification_OutcomeTime` | `(outcome, createdAt DESC)` | B-tree | Decision reporting                                                              |

## 4.6 Immutability rules

1. Insert is allowed only as part of an authorized verification decision application service.
2. Business update is prohibited.
3. Business delete/soft-delete is prohibited.
4. Correction of a mistaken decision must follow an explicitly approved corrective workflow; direct row mutation is not allowed.
5. The parent `Document` current status update and history insertion must occur transactionally.

---

# 5. Relationships and Referential Rules

## 5.1 Owned relationships

| Parent     | Child                  | Cardinality | Physical FK                                      | Delete Rule | Update Rule | Notes                                                      |
| ---------- | ---------------------- | ----------: | ------------------------------------------------ | ----------- | ----------- | ---------------------------------------------------------- |
| `Document` | `DocumentVerification` |         1:N | `DocumentVerification.documentId -> Document.id` | RESTRICT    | RESTRICT    | Verification history is preserved; parent uses soft delete |

There is no DDD/ER evidence for a 1:1 or N:M relationship owned internally by this context.

## 5.2 Cross-context references

| Local Entity.Field                                         | Referenced Entity     | Cardinality  | Enforcement                                  | Delete Rule                                                                 | Ownership Note                             |
| ---------------------------------------------------------- | --------------------- | ------------ | -------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------ |
| `DocumentOwner.ownerId` where `ownerType=StudentProfile`   | `StudentProfile.id`   | N:1 logical  | Application-service validation/read boundary | Source owner hard delete prohibited; reject new links to soft-deleted owner | Admission & Enrollment owns StudentProfile |
| `DocumentOwner.ownerId` where `ownerType=TrainerProfile`   | `TrainerProfile.id`   | N:1 logical  | Application-service validation/read boundary | Same principle                                                              | Faculty / Trainer owns TrainerProfile      |
| `DocumentOwner.ownerId` where `ownerType=CorporateAccount` | `CorporateAccount.id` | N:1 logical  | Application-service validation/read boundary | Same principle                                                              | Corporate Training owns CorporateAccount   |
| `DocumentOwner.ownerId` where `ownerType=Person`           | `Person.id`           | N:1 logical  | Application-service validation/read boundary | Same principle                                                              | Party / Person model owns Person           |
| `Document.createdBy`                                       | `User.id`             | N:1          | Physical FK                                  | RESTRICT                                                                    | IAM owns User                              |
| `Document.updatedBy`                                       | `User.id`             | N:1          | Physical FK                                  | RESTRICT                                                                    | IAM owns User                              |
| `DocumentVerification.verifiedBy`                          | `User.id`             | N:1 optional | Physical FK                                  | RESTRICT                                                                    | IAM owns User                              |

## 5.3 Polymorphic owner mapping via DocumentOwner join table

Rather than using direct polymorphic columns on the `Document` model, the system uses the `DocumentOwner` join table. A single `Document` references multiple owners via this mapping:

- The application service validates owner existence using the `ownerType` to select the correct context resolver.
- The resolver checks existence and active status.
- Document Management stores mapping references in `DocumentOwner`.
- Dynamic display values (such as student number or trainer name) are resolved at read time from the respective owner contexts.

## 5.4 Vercel Blob relationship

The relationship is external/infrastructural rather than relational:

```text
Document.fileUrl  ----logical storage reference----> Vercel Blob object
```

Rules:

1. There is no cascade delete from `Document.deletedAt` to Blob deletion.
2. File retrieval is mediated by server-side authorization.
3. Blob upload success does not complete business registration until `Document` persistence succeeds.
4. Blob-success/database-failure must be compensatable or reconcilable.
5. The current DDD/ER baseline does not define a domain-owned Blob metadata table.

---

# 6. Transaction Boundaries

## 6.1 Register document

```text
1. Authorize actor
2. Validate owner and branch scope
3. Validate document type
4. Validate file/date metadata
5. Store object in Vercel Blob
6. Persist Document metadata
7. Record audit side effect/fact
8. On DB failure after Blob success, invoke approved compensation/reconciliation path
```

The Blob call and relational transaction cannot form one ACID transaction. The application must prevent a usable Document row pointing to a failed upload and must reconcile orphaned Blob objects after a database failure.

## 6.2 Submit for verification

Single relational transaction:

```text
UPDATE Document
SET verificationStatus='PendingVerification',
    updatedBy=:actor,
    updatedAt=:now,
    version=version+1
WHERE id=:id
  AND verificationStatus='Uploaded'
  AND deletedAt IS NULL
  AND version=:expectedVersion;
```

Branch and permission checks occur before the mutation and must be revalidated within the application service boundary.

## 6.3 Approve or reject

Required atomic relational transaction:

```text
BEGIN;

1. Lock/check Document current state and expected version.
2. Verify current status = PendingVerification.
3. INSERT immutable DocumentVerification decision row.
4. UPDATE Document current status and verifier summary fields.
5. Increment Document.version.

COMMIT;
```

Failure of either history insertion or current-state update must roll back both.

## 6.4 Soft delete / retire

```text
UPDATE Document
SET deletedAt=:now,
    isActive=false,
    updatedAt=:now,
    updatedBy=:actor,
    version=version+1
WHERE id=:id
  AND deletedAt IS NULL
  AND version=:expectedVersion;
```

No verification rows are deleted. Blob deletion is not automatic.

---

# 7. Branch-Scoping Model

## 7.1 Principle

Branch isolation is mandatory and server-side. The current ER model does not define `Document.branchId`, so branch visibility is derived from the referenced owner and IAM branch access.

## 7.2 Scope resolution algorithm

For each interactive read or write:

```text
authenticated user
    -> IAM assigned branch set
    -> parent/child/consolidated entitlements
    -> resolve Document owner using ownerType + ownerId
    -> derive owner-visible branch scope from owning context
    -> intersect owner branch scope with IAM-authorized branch set
    -> allow only when intersection permits requested action
```

## 7.3 Owner-specific branch rules

| Owner Type | Source of Branch Scope                                                       | Document Rule                                                                                                                                         |
| ---------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student    | Enrollment/Student read boundary as approved by Admission & Enrollment model | Actor must be authorized for the student's relevant operational branch scope; exact canonical derivation must follow the approved owner read contract |
| Trainer    | `TrainerProfile.branchId` and IAM branch hierarchy rules                     | Actor must have access to trainer branch or authorized parent/child scope                                                                             |
| Corporate  | Corporate Training account relationship/read boundary                        | Actor must satisfy the branch/account visibility rule defined by Corporate Training; Document Management must not invent branch ownership             |
| Person     | Shared Person has no branch field in ER baseline                             | Access requires an approved contextual ownership/branch derivation rule; unrestricted Person-document access is prohibited                            |

### Gap: Person branch scope

The ER baseline defines `Person` without a branch association. Therefore a generic `Person` document cannot safely be branch-scoped from `Person` alone. Before broad production use of `ownerType=Person`, the implementation must define an approved contextual scope resolver or restrict Person-owned documents to explicitly authorized global users. This is a data-access gap, not permission to invent `Document.branchId` silently.

---

# 8. CRUD Action Definitions

For the matrices below:

- **C** = Create
- **R** = Read/list/detail
- **U** = Update metadata/current state through allowed use case
- **D** = Soft delete/retire only; hard delete prohibited
- **V** = Verification decision action creating immutable history
- **S** = System-controlled operation
- **—** = No direct action

Permissions are capability-based. Role names below represent business actors, not hardcoded authorization logic.

---

# 9. Human Actor CRUD Matrix

## 9.1 `Document`

| Human Actor                   |                                                        C |                                            R |                                                                U |                                     D | Verification Transition                                                          | Branch Scope Logic                                                                            |
| ----------------------------- | -------------------------------------------------------: | -------------------------------------------: | ---------------------------------------------------------------: | ------------------------------------: | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Document Administrator        |                                                      Yes |                                          Yes |                                                              Yes |                 Yes, soft delete only | Submit; approve/reject only if separately granted verifier capabilities          | Owner-derived branch intersection; consolidated access only when IAM allows                   |
| Admission Officer             |                 Yes for accessible Student/Person owners |                                          Yes |    Limited metadata update before/under allowed lifecycle policy |  Usually No unless explicitly granted | Submit if granted; no approve/reject by default assumption                       | Student/Person contextual scope derived through Admission & Enrollment plus IAM branches      |
| Trainer Coordinator           |                        Yes for accessible Trainer owners |                                          Yes |                                          Limited metadata update |             Usually No unless granted | Submit if granted; no approve/reject unless verifier permission granted          | `TrainerProfile.branchId` intersected with IAM scope                                          |
| Corporate Account Coordinator |                      Yes for accessible Corporate owners |                                          Yes |                                          Limited metadata update |             Usually No unless granted | Submit if granted; no approve/reject unless verifier permission granted          | Corporate account visibility from Corporate Training read boundary intersected with IAM scope |
| Document Verifier             |                          No by verifier capability alone |            Yes for verification queue/detail |          No general metadata update by verifier capability alone |                                    No | Approve or reject PendingVerification records according to distinct capabilities | Only records whose owners fall inside authorized branch/account scope                         |
| Branch Manager                |                      No unless `document.create` granted |             Yes when read capability granted |                              No unless update capability granted | Yes only if retire capability granted | May approve/reject only if capability explicitly assigned                        | Own branch plus child branches only where IAM grants it                                       |
| Auditor / Compliance Reviewer |                                                       No | Read-only, including history when authorized |                                                               No |                                    No | No                                                                               | Authorized branch/consolidated scope plus audit/report permissions                            |
| Reporting User                |                                                       No | Read through approved report/read model only |                                                               No |                                    No | No                                                                               | Report permission + IAM branch/consolidated scope                                             |
| Student Self-Service User     | Conditional future portal: create only own allowed types |                           Own documents only | Limited metadata only before submission if future policy permits |                                    No | Submit own document if future policy permits; never approve/reject               | Identity-bound owner scope; never arbitrary ownerId                                           |
| Trainer Self-Service User     | Conditional future portal: create only own allowed types |                   Own trainer documents only | Limited metadata only before submission if future policy permits |                                    No | Submit own document if future policy permits; never approve/reject               | Authenticated trainer-to-owner binding + branch policy                                        |

### Important authorization rule

The matrix does not assign rights merely because a human actor has a named job title. The actual enforcement mechanism is fine-grained permission plus branch scope, for example repository-equivalent capabilities such as:

```text
document.read
document.create
document.update
document.verify.submit
document.verify.read
document.verify.approve
document.verify.reject
document.expiry.read
document.retire
document.operations.reconcile
```

## 9.2 `DocumentVerification`

| Human Actor                   |                                                                              C |                                                                            R |   U |   D | Branch Scope Logic                                         |
| ----------------------------- | -----------------------------------------------------------------------------: | ---------------------------------------------------------------------------: | --: | --: | ---------------------------------------------------------- |
| Document Administrator        | Only indirectly through approve/reject use case if verifier permission granted |                            Yes when document read/history permission granted |  No |  No | Same owner-derived scope as parent Document                |
| Admission Officer             |                                                               No direct create |                                       Read if permitted for accessible owner |  No |  No | Parent Document owner scope                                |
| Trainer Coordinator           |                                                               No direct create |                                                            Read if permitted |  No |  No | Parent Document owner scope                                |
| Corporate Account Coordinator |                                                               No direct create |                                                            Read if permitted |  No |  No | Parent Document owner scope                                |
| Document Verifier             |                           Yes, only through approve/reject application service |                                                                          Yes |  No |  No | Parent Document must be accessible and PendingVerification |
| Branch Manager                |                           Only when explicit approve/reject capability granted |                                                             Yes if permitted |  No |  No | IAM branch hierarchy + parent Document scope               |
| Auditor / Compliance Reviewer |                                                                             No |                                                               Yes, read-only |  No |  No | Authorized audit/consolidated scope                        |
| Reporting User                |                                                                             No |                                       Read through reporting projection only |  No |  No | Report permission + IAM scope                              |
| Student Self-Service User     |                                                                             No | Optional limited display of own decision outcome/remarks according to policy |  No |  No | Own identity only                                          |
| Trainer Self-Service User     |                                                                             No | Optional limited display of own decision outcome/remarks according to policy |  No |  No | Own trainer identity only                                  |

---

# 10. System Actor CRUD Matrix

| System Actor / Application Service | `Document` Actions                                                                  | `DocumentVerification` Actions | Branch / Scope Rule                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Document Registration Service      | C, R for validation response                                                        | —                              | Must validate owner existence and owner-derived branch access before create                             |
| Document Query Service             | R                                                                                   | R                              | All queries server-scoped; soft-deleted records excluded from normal operational queries                |
| Verification Submission Service    | R, U (`Uploaded -> PendingVerification`)                                            | —                              | Permission + owner branch scope + optimistic version check                                              |
| Verification Decision Service      | R, U (`PendingVerification -> Approved/Rejected`)                                   | C immutable decision row       | Permission + owner branch scope + atomic transaction                                                    |
| Expiry Evaluation Job              | R; conditional U to `Expired` only if approved persisted-expiry policy exists       | —                              | Evaluates all authorized/system-scope records; preserves history; no owner mutation                     |
| Expiry Work Queue Query            | R                                                                                   | R if needed for context        | Server-scoped by requester's authorized owner/branch visibility                                         |
| Reporting Projection Builder       | R only                                                                              | R only                         | No mutation; scope materialization must preserve branch dimensions                                      |
| Audit Integration                  | No direct Document write required                                                   | No direct history write        | Receives critical action facts; Audit context owns `AuditLog`                                           |
| Communication Integration          | R minimal document/owner notification facts through approved contract               | —                              | Does not mutate Document state; owns notification delivery state                                        |
| Vercel Blob Storage Adapter        | No domain CRUD; supplies/reads file storage reference                               | —                              | Called only after authorization; storage credential scope is infrastructure-owned                       |
| Reconciliation Operations Process  | R; possible administrative repair only through approved runbook/application service | —                              | Restricted system/admin capability; must not bypass branch/ownership checks for business repair actions |

---

# 11. State-Dependent CRUD Restrictions

| Current Document State | Metadata Read                                          | Metadata Update                                                                | Submit                                       | Approve                     | Reject                                 | Retire                                                            | File Replace                                                            |
| ---------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------- | --------------------------- | -------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Uploaded               | Yes                                                    | Yes with permission and version check                                          | Yes                                          | No                          | No                                     | Yes with permission                                               | Allowed only under approved upload/update policy                        |
| PendingVerification    | Yes                                                    | Restrict changes that would invalidate evidence under review                   | No duplicate submit                          | Yes with approve permission | Yes with reject permission and remarks | Yes only under explicit operational permission; should be audited | Not allowed without explicit cancellation/replacement policy            |
| Approved               | Yes                                                    | Non-evidence metadata corrections only where policy permits; history preserved | No baseline resubmit                         | No                          | No                                     | Yes with retire permission                                        | Not defined; must not silently preserve approval for different evidence |
| Rejected               | Yes                                                    | Limited according to resubmission policy                                       | Resubmission not defined in current baseline | No                          | No                                     | Yes with retire permission                                        | Replacement/resubmission policy gap                                     |
| Expired                | Yes                                                    | Metadata correction only if policy permits                                     | Renewal submission not defined               | No                          | No                                     | Yes with retire permission                                        | Renewal/replacement policy gap                                          |
| Soft Deleted           | Excluded from normal queries; audit/recovery path only | No normal update                                                               | No                                           | No                          | No                                     | Already retired                                                   | No                                                                      |

---

# 12. Read Models and Query Projections

The current DDD/ER baseline does not require Document Management to own a separate reporting database aggregate. However, the UI and reporting needs imply read-oriented projections may be built without transferring transaction ownership.

## 12.1 Document Registry projection

Recommended logical shape:

```text
DocumentRegistryRow
- documentId
- ownerType
- ownerId
- ownerDisplayName           resolved/read-projected, not source-of-truth copy
- ownerReferenceCode         studentNumber/trainerCode/accountCode where applicable
- branchId                   derived reporting dimension, not transaction ownership
- branchName
- documentType
- documentTypeLabelLocalized
- fileName
- verificationStatus
- issueDate
- expiryDate
- expiryCondition            if derived
- uploadedByDisplayName
- createdAt
- updatedAt
```

This may be implemented as an application query composition, SQL view, materialized reporting projection, or reporting database view according to architecture decisions. It is not a new writable aggregate.

## 12.2 Verification queue projection

```text
PendingDocumentVerificationRow
- documentId
- owner summary
- branch summary
- document type
- file name
- submitted/current status timestamp
- expiry date/condition
- version
```

Only `PendingVerification` active documents are returned.

## 12.3 Expiry workbench projection

```text
DocumentExpiryWorkItem
- documentId
- owner summary
- branch summary
- document type
- verification status
- expiryDate
- daysUntilExpiry / daysOverdue
- expiryBucket
```

Notification delivery state must not be stored in the Document aggregate unless Communication exposes an approved read projection for display composition.

---

# 13. Ownership Check – Detailed

## 13.1 Entities owned by Module 13

| Entity                 | Ownership | Rationale                                                            |
| ---------------------- | --------- | -------------------------------------------------------------------- |
| `Document`             | Owned     | DDD Document Management core entity; ER section 24.1                 |
| `DocumentVerification` | Owned     | DDD Document Management verification responsibility; ER section 24.2 |

## 13.2 Referenced entities from other contexts

| Entity                                                     | Owning Context              | Module 13 Reference Purpose                                                | Forbidden Local Duplication                                                              |
| ---------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `Party`                                                    | Shared Party foundation     | Identity model root concept                                                | Do not create document-specific Party clone                                              |
| `Person`                                                   | Shared Party / Person       | Person-owned documents and display resolution                              | Do not copy civil ID/passport/profile master data into Document                          |
| `StudentProfile`                                           | Admission & Enrollment      | Student document ownership                                                 | Do not create DocumentStudent                                                            |
| `TrainerProfile`                                           | Faculty / Trainer           | Trainer document ownership                                                 | Do not create DocumentTrainer                                                            |
| `CorporateAccount`                                         | Corporate Training          | Corporate document ownership                                               | Do not create DocumentCorporateAccount                                                   |
| `EmployeeProfile`                                          | Future HRMS                 | Future employee document ownership                                         | Do not enable before HRMS                                                                |
| `User`                                                     | IAM                         | upload/verify/audit actor references                                       | Do not store role names as authorization logic                                           |
| `UserBranchAccess`                                         | IAM                         | scope authorization                                                        | Do not create separate document branch ACL table without architecture approval           |
| `Branch`                                                   | Organization                | display/scope dimension                                                    | Do not make Document Management owner of branch hierarchy                                |
| `LookupType` / `LookupValue`                               | Configuration / Master Data | document type validation if lookup-backed                                  | Do not create competing local document type master                                       |
| `AuditLog`                                                 | Audit & Compliance          | sensitive action evidence                                                  | Do not duplicate AuditLog locally                                                        |
| `ApprovalRequest` / `ApprovalHistory`                      | Audit & Compliance          | Only if a future document action explicitly uses general approval workflow | Verification history is not to be replaced by generic approval tables without DDD change |
| `NotificationRequest` / `NotificationLog`                  | Communication               | expiry reminders                                                           | Do not store delivery attempts in Document                                               |
| `DashboardDefinition`, `DashboardWidget`, `MetricSnapshot` | Reporting & Dashboards      | reporting consumption                                                      | No mutation from Document Management                                                     |
| `Certificate`                                              | Certificate Management      | possible read-only supporting evidence use                                 | Do not store certificate lifecycle in Document                                           |
| `Invoice`, `Receipt`, `Payment`, `Refund`                  | Finance                     | finance-owned generated artifacts/business records                         | Do not move finance lifecycle to Document Management merely because files exist          |

## 13.3 Entities that should not exist in Module 13

The following local tables would violate current DDD ownership unless a formal architecture change is approved:

```text
DocumentStudent
DocumentTrainer
DocumentCorporateAccount
DocumentPersonProfile
DocumentEmployee
DocumentBranchAccess
DocumentRole
DocumentPermission
DocumentAuditLog
DocumentNotificationLog
DocumentCertificate
DocumentInvoice
DocumentReceipt
DocumentCompletionApproval
```

A generic `DocumentType` table inside this module is also not justified while Configuration/Master Data already owns configurable document types and the ER model currently represents `documentType` as a field. Final representation must follow the actual schema decision.

---

# 14. Data Integrity and Concurrency Requirements

## 14.1 Optimistic concurrency

Sensitive updates must use `version`:

```text
UPDATE documents
SET ..., version = version + 1
WHERE id = :id
  AND version = :expectedVersion
  AND deletedAt IS NULL;
```

Zero updated rows means stale version, changed state, deleted record, or inaccessible target; the application service must return an appropriate conflict/not-found response without leaking unauthorized existence.

## 14.2 Verification decision race prevention

Two verifiers must not both successfully decide the same PendingVerification version.

Required strategy:

- transaction with row lock, or
- atomic conditional update using current state and version,
- followed by decision history insertion in the same transaction.

Exactly one competing request may succeed.

## 14.3 Soft-delete query rule

Normal operational repositories must include:

```text
deletedAt IS NULL
```

or the repository-standard equivalent.

Audit/recovery queries require separate explicit authorization and must not be exposed through ordinary registry routes.

---

# 15. Data Retention and Deletion Rules

1. Hard deletion of `Document` is prohibited.
2. Hard deletion of `DocumentVerification` is prohibited.
3. Soft deletion of `Document` does not cascade to verification history.
4. Soft deletion of metadata does not automatically delete the Vercel Blob object.
5. Blob retention/deletion requires an explicit retention policy and operational process.
6. Owner soft deletion does not automatically erase document evidence; visibility and retention are handled according to owner context and compliance rules.
7. Verification history remains immutable for auditability.

---

# 16. DDD and ER Consistency Check

| Concern                | DDD / ER Baseline                           | Part 4 Treatment                                            | Result          |
| ---------------------- | ------------------------------------------- | ----------------------------------------------------------- | --------------- |
| Document ownership     | Document Management owns Document           | `Document` defined as owned root/lifecycle record           | Aligned         |
| Verification ownership | Document Management owns verification       | `DocumentVerification` defined as owned append-only history | Aligned         |
| Owner model            | Student/Trainer/Corporate/Person references | Logical relations via `DocumentOwner` join table            | Aligned         |
| Employee documents     | Future HRMS                                 | Not enabled; future reference only                          | Aligned         |
| Branch access          | IAM + owner context                         | Direct `Document.branchId` persisted and derived from owner | Aligned         |
| Document type          | Configurable lookup or static enum          | Stored as static enum `DocumentType` in Prisma              | Align Gap noted |
| Current status         | Draft, Active, Expired, Replaced, Deleted   | Mapped to `DocumentStatus` and `VerificationOutcome`        | Aligned         |
| Verification history   | DocumentVerification                        | Append-only 1:N history                                     | Aligned         |
| Soft delete            | Project-wide convention                     | `isDeleted` and `deletedAt`, no hard delete                 | Aligned         |
| Auditing               | Audit context owns AuditLog                 | `createdBy`/`createdAt` columns; Audit owns `AuditLog`      | Aligned         |
| Binary storage         | User decision: Vercel Blob                  | `fileKey` reference; no domain ownership transfer           | Aligned         |
| Blob reconciliation    | FRD operational requirement; no ER entity   | Reconciliation job state is infrastructural                 | Aligned         |
| Prisma schema          | Complete codebase implementation            | Code base schema validated directly in this report          | Resolved        |

---

# 17. Explicit Gaps Requiring Resolution Before Final Migration Design

## GAP-DOC-DB-001 – Prisma schema validation

**Status: Resolved.** The actual schema has been validated. Mismatches in owner polymorphism (join table `DocumentOwner` used) and branch scoping (direct `branchId` column used) have been reconciled in this FRD.

## GAP-DOC-DB-002 – Document type persistence representation

**Status: Align Gap.** Prisma hardcodes document types as the enum `DocumentType`. If dynamic configurations are needed later, a database migration is required to change `documentType` into a VarChar lookup code referencing Master Data.

## GAP-DOC-DB-003 – Expired state persistence

**Status: Align Gap.** Prisma includes `Expired` in `DocumentStatus`. This indicates expiry is a persisted state. A background cron job must be scheduled to evaluate document expiration dates and transition `status` to `Expired`.

## GAP-DOC-DB-008 – Missing Date and Version fields in Prisma (CRITICAL IMPLEMENTATION GAP)

**Status: Open.** The actual `Document` model in `schema.prisma` is currently missing the `issueDate`, `expiryDate`, and `version` (optimistic locking) fields. These must be added via a database migration before Module 13 implementation begins.

## GAP-DOC-DB-004 – Person owner branch scoping

`Person` has no branch relationship in the ER baseline. A safe contextual scope resolver or restricted global-access rule is required before generic Person document access is broadly enabled.

## GAP-DOC-DB-005 – Blob operational metadata

The ER baseline includes `fileName` and `fileUrl` but not:

- Blob pathname/key;
- content type;
- file size;
- checksum/hash;
- Blob ETag/version;
- storage upload status;
- quarantine/scan status.

These fields must not be added silently. Architecture/security decisions should determine whether they belong on `Document`, an infrastructure-owned object registry, or not at all.

## GAP-DOC-DB-006 – Durable reconciliation state

FR-DOC-023 requires handling Blob-success/database-failure scenarios, but DDD/ER does not define a reconciliation entity. If reconciliation must survive process restarts and be queryable operationally, architecture must define an infrastructure-owned durable mechanism. This part intentionally does not invent a domain aggregate.

## GAP-DOC-DB-007 – Resubmission and replacement chain

The current model does not define:

- `replacesDocumentId`;
- `replacedByDocumentId`;
- revision chain;
- rejected-document resubmission relation.

Such fields/tables must not be added until the business policy is approved.

---

# 18. Final Persistence Recommendation

The production baseline for Module 13 should remain deliberately small:

```text
Document
  1
  |
  | has immutable decision history
  v
  N
DocumentVerification
```

All other business identities and organizational scope are referenced from their owning bounded contexts. Binary content remains in Vercel Blob. Audit logs, notifications, and reporting projections remain owned by their corresponding contexts.

This model preserves the ASTI IMS principles of:

- bounded-context ownership;
- Person/Party reuse;
- server-side branch isolation;
- soft deletes instead of hard deletes;
- immutable verification history;
- application-service-controlled state transitions;
- infrastructure separation from domain ownership;
- no invented persistence models beyond the DDD/ER baseline.
