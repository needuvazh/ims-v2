# Part 4 – Database Entities and CRUD Matrix

## Module 11 – Certificate Management

**Document status:** Functional database specification aligned to DDD Context Map v3.0 and ER Model v3.0  
**Architecture style:** Next.js TypeScript monorepo, modular monolith first  
**Primary bounded context:** Certificate Management  
**Central upstream aggregate:** Enrollment  
**Current portal strategy:** Admin Portal first; public verification required; Student and Trainer portal access applies when those portals are introduced  

---

# 1. Purpose

This document defines the database ownership, entity specifications, relationships, deletion behavior, indexing expectations, branch-scoping rules, and actor-to-entity CRUD permissions for Module 11 – Certificate Management.

The specification intentionally distinguishes four concepts:

1. **Owned entities** – tables whose lifecycle and write model belong to Certificate Management.
2. **Referenced entities** – records owned by another bounded context and used through foreign keys, application queries, or approved read projections.
3. **Cross-cutting records** – audit, approval, notification, and reporting records created through their owning context, not directly owned by Certificate Management.
4. **Prohibited duplicate models** – tables that must not be introduced inside Certificate Management because their source-of-truth concept belongs elsewhere.

The current ER baseline identifies exactly three Certificate-owned persistence entities:

```text
Certificate
CertificateVerification
CertificateReissueRequest
```

The module must not expand its ownership by introducing local copies of Enrollment, Student, Course, Batch, Completion, Payment, Branch, User, Audit, Notification, or Reporting transaction data.

---

# 2. Database Design Principles

## 2.1 Context Ownership

Certificate Management owns credential lifecycle data only:

```text
Eligibility approved by Completion context
        ↓
Payment gate resolved by Finance context when required
        ↓
Certificate Management
  ├── Certificate
  ├── CertificateVerification
  └── CertificateReissueRequest
```

Certificate Management may read authoritative facts from upstream contexts, but it must not persist shadow truth such as calculated attendance eligibility, invoice balance, or user branch entitlement.

## 2.2 Enrollment-Centric Constraint

Every Certificate must be rooted in exactly one valid `Enrollment`.

```text
StudentProfile
    ↓
Enrollment
    ├── Course
    ├── Batch
    └── Branch
          ↓
      Certificate
```

Certificate records additionally carry `studentProfileId`, `courseId`, and `batchId` because those fields exist in the ER baseline. They are denormalized references for traceability and efficient retrieval; they must match the authoritative Enrollment relationship at command time.

## 2.3 No Hard Delete

No Certificate-owned business record may be physically deleted through ordinary application workflows.

- `Certificate`: lifecycle invalidation uses status transitions such as Revoked; hard delete is prohibited.
- `CertificateVerification`: append-only verification history; hard delete prohibited except approved retention/privacy administration outside normal business CRUD.
- `CertificateReissueRequest`: lifecycle status transition only; hard delete prohibited.

Where repository base conventions include `deletedAt`, that column is for controlled administrative soft deletion and must not replace business lifecycle status.

## 2.4 Optimistic Concurrency

All mutable Certificate-owned aggregate records should carry `version` according to the shared operational-table convention. Sensitive transitions must use compare-and-swap semantics:

```text
UPDATE ...
WHERE id = :id
  AND version = :expectedVersion
SET ...,
    version = version + 1
```

A zero-row update means stale state and must return a conflict result rather than silently overwrite another command.

## 2.5 Auditability

Certificate Management must invoke Audit & Compliance for sensitive actions including:

- certificate generation;
- certificate issue;
- certificate revocation;
- reissue request approval;
- reissue request rejection;
- replacement generation;
- administrative soft-delete/restore, if repository policy allows such administration.

`AuditLog` is referenced, not Certificate-owned.

## 2.6 Branch Isolation

The Certificate ER record does not contain `branchId`. Branch scope is derived through the owned Certificate's authoritative `enrollmentId`:

```text
Certificate.enrollmentId
        ↓
Enrollment.branchId
        ↓
UserBranchAccess for authenticated user
```

The same scope applies to dependent entities:

```text
CertificateVerification.certificateId
  → Certificate.enrollmentId
  → Enrollment.branchId

CertificateReissueRequest.certificateId
  → Certificate.enrollmentId
  → Enrollment.branchId
```

A client-supplied `branchId` may narrow a query but can never grant access.

---

# 3. Ownership Classification Summary

| Entity / Concept | Classification | Owning Context | Certificate Module Access | Decision |
|---|---|---|---|---|
| `Certificate` | Owned | Certificate Management | Full lifecycle control subject to permissions and invariants | Must exist |
| `CertificateVerification` | Owned | Certificate Management | Append verification event; read under permission/retention rules | Must exist |
| `CertificateReissueRequest` | Owned | Certificate Management | Submit, decide, complete replacement lineage | Must exist |
| `Enrollment` | Referenced | Admission & Enrollment | Read authoritative learner/course/batch/branch and certificate relation | Must not be duplicated |
| `StudentProfile` | Referenced | Admission & Enrollment | Read learner identity reference | Must not be duplicated |
| `Person` / `Party` | Referenced | Shared Party/Person model | Read learner names and identity projection | Must not be duplicated |
| `Course` | Referenced | Course Catalog | Read course identity and localized display facts | Must not be duplicated |
| `Batch` | Referenced | Training Delivery | Read batch identity and delivery facts | Must not be duplicated |
| `CourseCompletion` | Referenced | Exam, Result & Completion | Read approved completion fact through application boundary | Must not be duplicated |
| `CompletionApproval` | Referenced | Exam, Result & Completion | Read approval completion state where needed | Must not be duplicated |
| `Invoice`, `Payment`, `Receivable` | Referenced through service decision | Finance & Receivables | Consume payment-validation result; no direct mutation | Must not be duplicated |
| `NumberingSeries` | Referenced | Configuration / Master Data | Atomic certificate-number allocation through owning service/repository | Must not be duplicated |
| `User` | Referenced | Identity & Access | Resolve authenticated actor and issuer/approver/requester FK | Must not be duplicated |
| `UserBranchAccess` | Referenced | Identity & Access | Authoritative branch-scope resolution | Must not be duplicated |
| `AuditLog` | Cross-cutting | Audit & Compliance | Create via audit application service; read projection where authorized | Must not be copied locally |
| `ApprovalRequest` / `ApprovalHistory` | Cross-cutting | Audit & Compliance | Approval trace where generic approval workflow is used | Must not be copied locally |
| `NotificationRequest` / `NotificationLog` | Cross-cutting | Communication & Notification | Request notification after issue/reissue; no local delivery table | Must not be copied locally |
| `DashboardDefinition`, `DashboardWidget`, `MetricSnapshot` | Cross-cutting read/reporting | Reporting & Dashboards | Publish/serve facts; Reporting owns projections | Must not be copied locally |
| `CertificateEligibility` | Prohibited duplicate concept | Exam, Result & Completion owns evaluation | Consume eligibility decision only | Should not exist in Certificate context |
| `CertificatePaymentValidation` | Prohibited duplicate concept | Finance owns payment truth | Consume validation result only | Should not exist as Certificate source-of-truth table |
| `CertificateTemplate` | Not current-scope persistence model | Future Certificate capability | Current version uses one hardcoded approved template | Should not exist in current scope |
| `CertificateQRCode` | DDD concept, ER represented as field | Certificate Management | `Certificate.qrCodeUrl` is current ER representation | Do not add separate table without approved ER change |
| `CertificateIssueLog` | DDD concept, missing ER entity | Certificate/Audit boundary requires clarification | Current baseline uses Certificate state plus AuditLog | Gap; do not invent table silently |
| `CertificateRevocation` | DDD responsibility, no ER entity | Certificate Management | Current baseline uses `certificateStatus` plus AuditLog reason/history | Gap; do not invent table silently |

---

# 4. Owned Entity Specification – `Certificate`

## 4.1 Purpose

`Certificate` is the aggregate root for the issued credential lifecycle. It records the credential identity, authoritative enrollment reference, learner/course/batch trace references, artifact location, public verification identity, language, issuer, issue date, and lifecycle status.

## 4.2 Table Specification

**Logical table name:** `Certificate`  
**Suggested physical naming:** follow repository convention, for example `certificates`  
**Aggregate root:** Yes  
**Branch scope:** derived through `Enrollment.branchId`  
**Effective dating:** not applicable; lifecycle state and issued date are used instead  

| Field | Data Type | Nullability | Key / FK | Constraints and Semantics |
|---|---|---:|---|---|
| `id` | UUID/CUID string | NOT NULL | PK | Immutable technical identifier. Generated server-side. |
| `certificateNumber` | varchar/string | NOT NULL | Alternate key | Human-facing credential number. Must be globally unique or unique according to the approved NumberingSeries policy; this FRD requires uniqueness within the system baseline. Never generated in browser. |
| `enrollmentId` | UUID/CUID string | NOT NULL | FK → `Enrollment.id` | Exactly one Enrollment per Certificate. Authoritative root for branch derivation and learning journey trace. |
| `studentProfileId` | UUID/CUID string | NOT NULL | FK → `StudentProfile.id` | Must equal the StudentProfile resolved from the authoritative Enrollment at generation time. |
| `courseId` | UUID/CUID string | NOT NULL | FK → `Course.id` | Must equal Enrollment.courseId at generation time. |
| `batchId` | UUID/CUID string | NOT NULL | FK → `Batch.id` | Must equal Enrollment.batchId at generation time. |
| `issuedDate` | date or timestamptz per repository convention | NULL until issued | — | Set when lifecycle moves `Generated → Issued`; immutable after successful issue except approved correction workflow, which is not currently defined. |
| `issuedBy` | UUID/CUID string | NULL until issued | FK → `User.id` | Actor responsible for successful issue transition. Must be server-derived from authenticated principal. |
| `certificateStatus` | enum/string | NOT NULL | Indexed | Semantic minimum required by Part 2: `Generated`, `Issued`, `Revoked`. Exact Prisma enum naming must be validated. |
| `certificateUrl` | text/string | NOT NULL after successful generation | — | Storage reference or access-controlled artifact locator. Must not contain raw secret credentials. |
| `verificationCode` | varchar/string | NOT NULL | Alternate key | Opaque, high-entropy, globally unique public verification token. Not sequential. |
| `qrCodeUrl` | text/string | NOT NULL after generation | — | QR artifact/reference or public verification URL reference. Must resolve to the verification flow without exposing private internal IDs. |
| `language` | enum/string | NOT NULL | Indexed if operationally filtered | Required certificate artifact language. Minimum current values: English and Arabic. Exact enum naming follows implementation schema. |
| `createdAt` | timestamptz | NOT NULL | — | Server-generated creation timestamp. Oman-localized display may use GST; persistence should follow repository UTC/timezone convention. |
| `createdBy` | UUID/CUID string | NOT NULL | FK → `User.id` where shared convention permits | Authenticated actor/system identity that generated the record. |
| `updatedAt` | timestamptz | NOT NULL | — | Updated on lifecycle mutation. |
| `updatedBy` | UUID/CUID string | NOT NULL | FK → `User.id` where shared convention permits | Last successful mutating actor. |
| `deletedAt` | timestamptz | NULL | Indexed only if repo convention uses it | Soft-delete marker. Normal certificate cancellation/revocation must not use this field. |
| `isActive` | boolean | NOT NULL | Optional indexed filter | Shared operational convention. Default true. Must not contradict lifecycle semantics; `Revoked` remains historical even if active for queryability. |
| `version` | integer/bigint | NOT NULL | Concurrency token | Default 1. Increment on every successful mutation. Positive value only. |

### 4.2.1 ER Baseline Versus Shared Operational Columns

The ER Certificate definition explicitly lists:

```text
id
certificateNumber
enrollmentId
studentProfileId
courseId
batchId
issuedDate
issuedBy
certificateStatus
certificateUrl
verificationCode
qrCodeUrl
language
```

The ER document separately recommends shared operational fields for most operational tables:

```text
createdAt
createdBy
updatedAt
updatedBy
deletedAt
isActive
version
```

Therefore, the base columns above are required as repository-convention expectations, but final Prisma validation is mandatory before migration acceptance.

## 4.3 Keys and Indexes

### Required Constraints

| Constraint | Columns | Type | Reason |
|---|---|---|---|
| `PK_Certificate` | `id` | Primary key | Stable aggregate identity |
| `UQ_Certificate_certificateNumber` | `certificateNumber` | Unique | Prevent duplicate credential numbers |
| `UQ_Certificate_verificationCode` | `verificationCode` | Unique | Guarantee unambiguous public verification |
| `FK_Certificate_Enrollment` | `enrollmentId` | FK | Enforce central Enrollment linkage |
| `FK_Certificate_StudentProfile` | `studentProfileId` | FK | Preserve learner traceability |
| `FK_Certificate_Course` | `courseId` | FK | Preserve course traceability |
| `FK_Certificate_Batch` | `batchId` | FK | Preserve delivery/batch traceability |
| `FK_Certificate_IssuedBy` | `issuedBy` | FK | Preserve issuer identity |

### Required / Recommended Indexes

| Index | Columns | Purpose |
|---|---|---|
| `IX_Certificate_enrollmentId` | `enrollmentId` | Duplicate guard and Enrollment detail lookup |
| `IX_Certificate_studentProfileId_issuedDate` | `studentProfileId`, `issuedDate DESC` | Student certificate list |
| `IX_Certificate_courseId_status` | `courseId`, `certificateStatus` | Course-level registry/report filtering |
| `IX_Certificate_batchId_status` | `batchId`, `certificateStatus` | Batch-level certificate operations |
| `IX_Certificate_status_issuedDate` | `certificateStatus`, `issuedDate DESC` | Registry and operational work queues |
| `IX_Certificate_language` | `language` | Optional reporting/filtering where query volume justifies it |
| `IX_Certificate_deletedAt` | `deletedAt` | Only where soft-delete convention uses explicit filtering |

### Duplicate Active Certificate Constraint

The domain rule is: one enrollment must not have more than one active credential lineage that represents duplicate issuance. Because reissue can create a replacement Certificate linked through `CertificateReissueRequest.newCertificateId`, the exact database uniqueness strategy must not block legitimate replacement creation.

Required implementation behavior:

1. Command service checks current certificate lineage for the enrollment.
2. Generation runs in a transaction.
3. A database-supported uniqueness or locking strategy prevents concurrent duplicate originals.
4. Replacement generation is allowed only through one Approved reissue request with empty `newCertificateId`.
5. A blind `UNIQUE(enrollmentId)` must **not** be introduced if replacement certificates reuse the same enrollment, unless the data model separately distinguishes original/replacement certificates.

This is a schema-design decision requiring Prisma review; the domain invariant must be enforced regardless of chosen implementation.

## 4.4 Check Constraints and Validation Rules

- `certificateNumber` trimmed and non-empty.
- `verificationCode` trimmed, non-empty, opaque, and unique.
- `certificateUrl` must be non-empty after generation completes.
- `qrCodeUrl` must be non-empty after generation completes.
- `language` must be an approved enum value.
- `issuedDate` and `issuedBy` must both be present when status is Issued or later revoked after issuance.
- Revoked certificates retain original issue facts.
- `version >= 1`.
- `studentProfileId`, `courseId`, and `batchId` must match Enrollment-resolved references at command time.

Cross-table equality with Enrollment may be enforced in the application service because ordinary relational CHECK constraints cannot safely compare another table's columns in most databases.

## 4.5 Mutation Policy

| Operation | Allowed? | Rule |
|---|---:|---|
| Create | Yes | Only through GenerateCertificate application command after all authoritative guards pass |
| Read | Yes | Branch-scoped for internal users; self-scoped for Student Portal; minimal projection for public verification |
| Update artifact metadata | Controlled | Only through generation/recovery application service; audit where sensitive |
| Generated → Issued | Yes | Permission, source revalidation, version check |
| Issued → Revoked | Yes | Permission, reason, branch scope, audit, version check |
| Revoked → Issued | No | No reinstatement workflow in source model |
| Delete | No | Hard delete prohibited |
| Soft delete | Exceptional | Only repository-approved administrative policy, never normal revocation |

---

# 5. Owned Entity Specification – `CertificateVerification`

## 5.1 Purpose

`CertificateVerification` records certificate verification activity and its outcome. It belongs to Certificate Management because public verification is a Certificate context responsibility.

The record must remain privacy-minimal. It must not become a copy of Person, StudentProfile, Enrollment, Course, or Certificate details.

## 5.2 Table Specification

**Aggregate relationship:** dependent record under Certificate lifecycle/history  
**Branch scope:** derived through Certificate → Enrollment → Branch  
**Write pattern:** append-only  
**Effective dating:** not applicable  

| Field | Data Type | Nullability | Key / FK | Constraints and Semantics |
|---|---|---:|---|---|
| `id` | UUID/CUID string | NOT NULL | PK | Server-generated verification event ID |
| `certificateId` | UUID/CUID string | NOT NULL | FK → `Certificate.id` | Certificate that matched the verification request |
| `verificationCode` | varchar/string | NOT NULL | Indexed | Code used for verification. The value must follow security/retention policy; if storage exposure is a concern, implementation may persist a protected representation only after approved schema/security design. |
| `verifiedAt` | timestamptz | NOT NULL | Indexed | Server timestamp of verification attempt/result |
| `verifiedByIp` | varchar/string | NULL | — | Client IP as resolved through trusted proxy configuration; privacy retention policy applies |
| `verificationStatus` | enum/string | NOT NULL | Indexed | Outcome vocabulary mapped to Part 2 public verification semantics, such as Valid, Revoked/NotValid, Replaced/Superseded if supported, and other approved result statuses |
| `createdAt` | timestamptz | NOT NULL | — | Shared convention; generally equal or near `verifiedAt` |
| `createdBy` | UUID/CUID string | NULL | FK → `User.id` if authenticated verification exists | Public verification has no authenticated User, so nullable/system identity may be required by repository convention |
| `updatedAt` | timestamptz | NOT NULL | — | Should not change after insert except controlled privacy remediation |
| `updatedBy` | UUID/CUID string | NULL | FK → `User.id` where applicable | Normally null/system for append-only records |
| `deletedAt` | timestamptz | NULL | — | Retention/privacy administration only; not business CRUD |
| `isActive` | boolean | NOT NULL | — | Default true if shared convention requires it |
| `version` | integer/bigint | NOT NULL | — | Default 1; append-only record ordinarily remains 1 |

## 5.3 Keys and Indexes

| Constraint / Index | Columns | Type | Purpose |
|---|---|---|---|
| `PK_CertificateVerification` | `id` | PK | Event identity |
| `FK_CertificateVerification_Certificate` | `certificateId` | FK | Parent credential reference |
| `IX_CertificateVerification_certificateId_verifiedAt` | `certificateId`, `verifiedAt DESC` | Index | Certificate detail verification timeline |
| `IX_CertificateVerification_verifiedAt` | `verifiedAt DESC` | Index | Operational verification activity queries |
| `IX_CertificateVerification_verificationStatus_verifiedAt` | `verificationStatus`, `verifiedAt DESC` | Index | Status monitoring and abuse/anomaly reporting |
| `IX_CertificateVerification_verificationCode_verifiedAt` | `verificationCode`, `verifiedAt DESC` | Index | Code-oriented history where security policy permits raw indexing |

Do not create a uniqueness constraint on `verificationCode` in this table because multiple verification events may use the same valid Certificate verification code. Uniqueness belongs to `Certificate.verificationCode`.

## 5.4 Constraints and Rules

- A verification history row is immutable after insertion except approved privacy/security remediation.
- A successful matched verification must reference exactly one Certificate.
- The public API response must not expose `verifiedByIp`.
- Internal verification-activity access requires explicit permission and branch scope.
- High-volume verification logging must not weaken the authoritative Certificate query transaction.
- The implementation must define retention policy for IP data in Security/NFR documentation.
- The table must not contain learner name, Civil ID, passport number, payment status, attendance percentage, exam result, or other duplicated PII/domain truth.

## 5.5 Not-Found Verification Logging Gap

The current ER model requires `certificateId` and defines `CertificateVerification` around a Certificate relationship. A request using a nonexistent verification code may therefore be impossible to persist in this table without either:

- making `certificateId` nullable;
- adding a separate security/telemetry model;
- or logging unmatched attempts only in operational/security logs.

This FRD does not invent a schema extension. Until an approved ER/Prisma decision exists, matched certificate verifications are persisted here and unmatched attempts are handled through approved operational/security telemetry.

---

# 6. Owned Entity Specification – `CertificateReissueRequest`

## 6.1 Purpose

`CertificateReissueRequest` controls the replacement certificate workflow. It records the original Certificate, requester, reason, decision status, approver, approval time, and replacement Certificate lineage.

## 6.2 Table Specification

**Aggregate relationship:** Certificate lifecycle child/workflow record  
**Branch scope:** derived through original Certificate → Enrollment → Branch  
**Effective dating:** not applicable; request and approval timestamps represent lifecycle timing  

| Field | Data Type | Nullability | Key / FK | Constraints and Semantics |
|---|---|---:|---|---|
| `id` | UUID/CUID string | NOT NULL | PK | Server-generated request identity |
| `certificateId` | UUID/CUID string | NOT NULL | FK → `Certificate.id` | Original Certificate for which replacement is requested |
| `requestedBy` | UUID/CUID string | NOT NULL | FK → `User.id` or approved actor identity strategy | Requesting actor. Student Portal identity mapping must resolve to an authoritative authenticated identity; exact FK strategy must match IAM schema. |
| `reason` | text | NOT NULL | — | Trimmed, non-empty reason required for submission |
| `status` | enum/string | NOT NULL | Indexed | Semantic states required by Part 2: PendingReview, Approved, Rejected, Completed/ReplacementGenerated |
| `approvedBy` | UUID/CUID string | NULL | FK → `User.id` | Required when approval succeeds; for rejection, decision actor must still be recoverable through ApprovalHistory/Audit even if field name is approval-specific |
| `approvedAt` | timestamptz | NULL | — | Set on successful approval. Must not be set for PendingReview |
| `newCertificateId` | UUID/CUID string | NULL | FK → `Certificate.id` | Replacement Certificate. Must be null until replacement successfully commits; exactly one replacement per request |
| `createdAt` | timestamptz | NOT NULL | — | Submission timestamp |
| `createdBy` | UUID/CUID string | NOT NULL | FK → `User.id` where convention applies | Authenticated/system creator |
| `updatedAt` | timestamptz | NOT NULL | — | Last lifecycle mutation timestamp |
| `updatedBy` | UUID/CUID string | NOT NULL | FK → `User.id` where convention applies | Last mutating actor |
| `deletedAt` | timestamptz | NULL | — | Administrative soft-delete only if approved; not normal workflow |
| `isActive` | boolean | NOT NULL | — | Default true under common convention |
| `version` | integer/bigint | NOT NULL | Concurrency token | Default 1; increment on decision and completion transitions |

## 6.3 Keys and Indexes

| Constraint / Index | Columns | Type | Purpose |
|---|---|---|---|
| `PK_CertificateReissueRequest` | `id` | PK | Workflow identity |
| `FK_Reissue_OriginalCertificate` | `certificateId` | FK | Original credential reference |
| `FK_Reissue_NewCertificate` | `newCertificateId` | FK | Replacement lineage reference |
| `FK_Reissue_RequestedBy` | `requestedBy` | FK | Request actor trace |
| `FK_Reissue_ApprovedBy` | `approvedBy` | FK | Approval actor trace |
| `UQ_Reissue_newCertificateId` | `newCertificateId` where non-null | Unique | A replacement Certificate cannot complete two different requests |
| `IX_Reissue_status_createdAt` | `status`, `createdAt DESC` | Index | Pending queue and operational list |
| `IX_Reissue_certificateId_createdAt` | `certificateId`, `createdAt DESC` | Index | Original Certificate history |
| `IX_Reissue_requestedBy_createdAt` | `requestedBy`, `createdAt DESC` | Index | Requester self-service history, subject to identity mapping |
| `IX_Reissue_approvedBy_approvedAt` | `approvedBy`, `approvedAt DESC` | Index | Decision audit/operational lookup |

## 6.4 State Constraints

| Status | `approvedBy` | `approvedAt` | `newCertificateId` | Required Meaning |
|---|---|---|---|---|
| PendingReview | NULL | NULL | NULL | Awaiting decision |
| Approved | NOT NULL | NOT NULL | NULL | Replacement generation authorized |
| Rejected | Schema-dependent | NULL or decision timestamp not represented | NULL | Request declined; full decision actor/history must be preserved in Audit/ApprovalHistory |
| Completed | NOT NULL | NOT NULL | NOT NULL | Approved request has exactly one linked replacement |

The ER field names are insufficient for a rich rejection decision record because they only provide `approvedBy` and `approvedAt`. Rejection actor, rejection timestamp, and decision remarks should remain recoverable through Audit & Compliance records unless the ER model is explicitly extended.

## 6.5 Business Constraints

- `reason` is mandatory and must contain non-whitespace content.
- Replacement generation requires Approved status.
- Rejected requests cannot create a replacement.
- Completed requests are terminal.
- `newCertificateId` must not equal `certificateId`.
- New Certificate must trace to the same Enrollment, StudentProfile, Course, and Batch as the original unless a separately approved correction policy is introduced.
- Replacement command must lock or version-check the request to prevent duplicate replacements.
- Approval and replacement generation are separate transitions.
- No hard delete.

---

# 7. Referenced External Entities and Access Contract

## 7.1 `Enrollment` – Admission & Enrollment Owner

Certificate Management requires:

```text
id
enrollmentNumber
studentProfileId
courseId
batchId
branchId
paymentValidationRequired
completionStatus
certificateStatus
```

Use:

- establish central learning journey;
- derive branch scope;
- validate student/course/batch consistency;
- prevent creation for invalid/missing enrollment;
- obtain payment-validation-required flag where this remains authoritative in Enrollment;
- expose readiness projection without mutating Enrollment from UI.

Certificate Management must not create, approve, cancel, complete, or otherwise mutate Enrollment.

### Enrollment `certificateStatus` Note

The ER includes both `Enrollment.certificateStatus` and `Certificate.certificateStatus`. This creates potential dual-source ambiguity. Required rule:

- `Certificate.certificateStatus` is authoritative for credential lifecycle inside Certificate Management.
- any Enrollment-level certificate status is a downstream summary/projection and must not become an independently editable source of truth.
- synchronization responsibility must be implemented through an in-process application integration/event handler or query projection inside the modular monolith.

## 7.2 `CourseCompletion` and `CompletionApproval` – Exam & Completion Owner

Required facts include:

```text
CourseCompletion.enrollmentId
CourseCompletion.completionStatus
CourseCompletion.paymentCompleted
CourseCompletion.approvedBy
CourseCompletion.approvedAt
```

Certificate Management consumes an authoritative eligibility decision. It must not:

- recalculate attendance percentage;
- inspect Result rows to decide pass/fail itself;
- execute completion approval;
- modify CourseCompletion or CompletionApproval.

## 7.3 Finance Entities – Finance & Receivables Owner

Relevant entities may include:

```text
Invoice
Payment
Receivable
InstallmentPlan
Installment
```

Certificate Management should consume a Finance application service result such as:

```text
PaymentValidationDecision
├── enrollmentId
├── required
├── passed
├── evaluatedAt
└── reasonCode
```

This is a service contract/value result, not a new Certificate database table.

## 7.4 `NumberingSeries` – Configuration Owner

Certificate number allocation uses a Configuration-owned NumberingSeries for entity type Certificate.

Required behavior:

- allocation atomic;
- no browser-generated number;
- no duplicate number after concurrent requests;
- branch series may apply if configured;
- Certificate Management stores allocated `certificateNumber` but does not own NumberingSeries configuration.

## 7.5 IAM References

Certificate Management references:

- `User` for authenticated command actors and issuer/approver/requester identity;
- `Permission` for action authorization;
- `UserBranchAccess` for server-side branch scope.

No local Certificate role table, permission table, or branch-access table may be introduced.

---

# 8. Relationship Model

## 8.1 Relationship Summary

```text
Enrollment 1 ───── 0..1 logical original credential* Certificate
StudentProfile 1 ───── N Certificate
Course 1 ───────────── N Certificate
Batch 1 ────────────── N Certificate
User 1 ─────────────── N Certificate (issuedBy)

Certificate 1 ───────── N CertificateVerification
Certificate 1 ───────── N CertificateReissueRequest (original certificate)
Certificate 1 ───────── 0..1 CertificateReissueRequest (as newCertificateId target per request uniqueness)

CertificateReissueRequest N ── 1 User (requestedBy)
CertificateReissueRequest N ── 0..1 User (approvedBy)
```

`*` Replacement certificates create a modeling nuance: the ER says Enrollment 1 → 0..1 Certificate, but the reissue model also has `newCertificateId`, implying creation of a new Certificate for a replacement. Therefore the exact cardinality between Enrollment and all historical Certificate rows requires reconciliation. The FRD treats **one current credential lineage per Enrollment with historical replacement Certificates** as the business requirement, but does not silently alter the ER cardinality.

## 8.2 Foreign-Key Delete and Update Rules

### Principle

Operational business roots must use `RESTRICT`/`NO ACTION`, not cascading physical delete. The project requires soft deletion and historical preservation.

| Parent | Child FK | Cardinality | On Delete | On Update | Rationale |
|---|---|---|---|---|---|
| `Enrollment` | `Certificate.enrollmentId` | 1:N historical / ER says 1:0..1 current | RESTRICT | CASCADE only if mutable technical IDs are supported; normally NO ACTION | Cannot erase credential because learning record is removed |
| `StudentProfile` | `Certificate.studentProfileId` | 1:N | RESTRICT | NO ACTION | Preserve credential identity trace |
| `Course` | `Certificate.courseId` | 1:N | RESTRICT | NO ACTION | Course soft-delete must not erase certificates |
| `Batch` | `Certificate.batchId` | 1:N | RESTRICT | NO ACTION | Batch history required |
| `User` | `Certificate.issuedBy` | 1:N | RESTRICT or SET NULL only if policy explicitly permits | NO ACTION | Issuer identity should be preserved; User should be deactivated, not deleted |
| `Certificate` | `CertificateVerification.certificateId` | 1:N | RESTRICT | NO ACTION | Verification history must survive |
| `Certificate` | `CertificateReissueRequest.certificateId` | 1:N | RESTRICT | NO ACTION | Reissue history must survive |
| `Certificate` | `CertificateReissueRequest.newCertificateId` | 1:0..N as target, intended unique target | RESTRICT | NO ACTION | Replacement lineage must survive |
| `User` | `CertificateReissueRequest.requestedBy` | 1:N | RESTRICT | NO ACTION | Preserve requester trace |
| `User` | `CertificateReissueRequest.approvedBy` | 1:N | RESTRICT | NO ACTION | Preserve approval trace |

### No Cascade Delete Rule

The following is prohibited:

```text
DELETE Enrollment
  CASCADE Certificate
  CASCADE CertificateVerification
  CASCADE CertificateReissueRequest
```

All business entities use status/soft-delete conventions and historical retention.

## 8.3 N:M Relationships

The Certificate context has no owned N:M join table in the current ER model.

Cross-context N:M access, such as User-to-Branch through `UserBranchAccess`, remains owned by IAM and is only queried for authorization scope.

Do not introduce:

- `CertificateBranch`;
- `CertificateUserAccess`;
- `CertificateCourse`;
- `CertificateStudent`;
- or equivalent join tables.

They would duplicate existing ownership and relationships.

---

# 9. Branch-Scoping Rules

## 9.1 Scope Resolution Algorithm

For every internal list, detail, or mutation:

```text
1. Authenticate principal.
2. Resolve effective UserBranchAccess from IAM.
3. Load target Certificate or Certificate-dependent record.
4. Resolve Certificate.enrollmentId.
5. Resolve Enrollment.branchId.
6. Verify branchId ∈ effective allowed branches.
7. Apply permission check for requested operation.
8. Execute query/command only after both guards pass.
```

For list queries, filtering must occur in the database query or equivalent server-side repository predicate, not after records are loaded:

```sql
WHERE enrollment.branch_id IN (:effectiveBranchIds)
```

## 9.2 Parent/Child Branch Rule

IAM owns hierarchy authorization. Certificate Management consumes the effective set returned by IAM policy:

- direct assigned branches;
- allowed child branches where `canViewChildBranches` permits;
- consolidated scope where explicitly permitted;
- never parent branches inferred from a child assignment unless explicitly granted.

## 9.3 Public Verification Exception

Public verification does not use branch authorization because it is intentionally public. Instead it uses:

- opaque verification code;
- rate limiting and abuse controls;
- minimum-data disclosure;
- no internal branch metadata exposure unless public policy explicitly allows it.

Public verification grants no registry browsing capability.

## 9.4 Student Self-Scope

Student Portal queries must enforce both:

```text
authenticated person/student identity
AND
Certificate.studentProfileId == authenticated student's StudentProfile.id
```

Branch access is not a substitute for self-scope.

## 9.5 Trainer Scope

Trainer Portal certificate visibility is read-only and must derive from Training Delivery assignment/authorization, for example authorized BatchTrainer/Session relationship plus branch policy. Trainer cannot receive broad Certificate CRUD rights merely because the trainer taught one course previously.

---

# 10. CRUD Action Vocabulary

The matrix below uses:

| Symbol | Meaning |
|---|---|
| C | Create a new owned record through application service |
| R | Read/query authorized record or projection |
| U | Controlled lifecycle mutation through application command |
| D | Physical delete |
| — | Not allowed / not applicable |
| S | Submit/request action, implemented as controlled create |
| A | Approve/reject decision, implemented as controlled update |
| X | System-owned append or integration action |

**Important:** `D` is prohibited for all normal actors. Administrative soft-delete, where repository policy permits it, is not normal CRUD and requires a separately permissioned audited service.

---

# 11. Human Actor CRUD Matrix

## 11.1 Certificate Administrator

| Entity | C | R | U | D | Branch Scope / Notes |
|---|---:|---:|---:|---:|---|
| Certificate | Yes | Yes | Yes | No | Generate, issue, and permitted lifecycle actions only within effective branches; revoke requires separate permission |
| CertificateVerification | No | Yes | No | No | Read matched verification activity only for Certificate records in effective branches and with verification-activity permission |
| CertificateReissueRequest | Optional submit | Yes | Limited | No | May submit request; queue processing only with approval permission; replacement generation requires separate permission |
| Enrollment | No | Read | No | No | Read readiness/source projection only; server branch-scoped |
| CourseCompletion | No | Read | No | No | Read authoritative eligibility result; no recomputation/mutation |
| Finance entities | No | Decision result only | No | No | Consume payment validation outcome only |
| NumberingSeries | No | No direct UI read required | No | No | Allocation through Configuration-owned service |
| AuditLog | No direct C | Read if permitted | No | No | Certificate commands emit audit request; Audit owns write |
| NotificationRequest | No direct CRUD | Status read if permitted | No | No | Certificate issue may request notification through Communication service |

## 11.2 Branch Manager / Management Approver

| Entity | C | R | U | D | Branch Scope / Notes |
|---|---:|---:|---:|---:|---|
| Certificate | No by role assumption; permission can grant | Yes | Revoke if permitted | No | Effective branch set; dynamic permission, not role name, is authoritative |
| CertificateVerification | No | Optional | No | No | Requires explicit permission; branch-scoped |
| CertificateReissueRequest | No | Yes | Approve/Reject | No | Pending requests only; effective branch scope; optimistic concurrency |
| AuditLog | No direct C | Yes if permitted | No | No | Read approval/lifecycle trail |

## 11.3 Academic Coordinator

| Entity | C | R | U | D | Notes |
|---|---:|---:|---:|---:|---|
| Certificate | Optional only if permission granted | Yes | No by default | No | Readiness and status visibility; Certificate permissions remain dynamic |
| CertificateVerification | No | No by default | No | No | Only explicit permission allows access |
| CertificateReissueRequest | No | Read if operationally required | No | No | Cannot decide without approval permission |
| CourseCompletion | No | Read | No in Certificate module | No | Completion actions occur in Completion context, not Certificate service |

## 11.4 Finance User

| Entity | C | R | U | D | Notes |
|---|---:|---:|---:|---:|---|
| Certificate | No | Read status only if explicitly permitted | No | No | Finance does not issue/revoke credentials |
| CertificateVerification | No | No | No | No | No default business need |
| CertificateReissueRequest | No | No by default | No | No | No default business need |
| Finance records | Owned in Finance context | Owned in Finance context | Owned in Finance context | Per Finance policy | Certificate module consumes Finance decision only |

## 11.5 Auditor / Compliance Reviewer

| Entity | C | R | U | D | Notes |
|---|---:|---:|---:|---:|---|
| Certificate | No | Yes | No | No | Read-only, branch/consolidated scope from IAM |
| CertificateVerification | No | Yes if privacy permission granted | No | No | Privacy-sensitive IP access must be separately controlled |
| CertificateReissueRequest | No | Yes | No | No | Full lineage review |
| AuditLog / ApprovalHistory | No through Certificate module | Yes | No | No | Audit context owns records |

## 11.6 Student

| Entity | C | R | U | D | Self-Scope / Notes |
|---|---:|---:|---:|---:|---|
| Certificate | No | Yes | No | No | Own StudentProfile certificates only; issued/downloadable state policy applies |
| CertificateVerification | No | No | No | No | Student does not browse verification activity by default |
| CertificateReissueRequest | Submit | Yes | No | No | Own Certificate only; cannot approve or complete |
| Enrollment | No | Limited own projection | No | No | Owned by Enrollment context |

## 11.7 Trainer

| Entity | C | R | U | D | Scope / Notes |
|---|---:|---:|---:|---:|---|
| Certificate | No | Limited status projection | No | No | Only learners/batches authorized through Training Delivery scope |
| CertificateVerification | No | No | No | No | Not required |
| CertificateReissueRequest | No | No by default | No | No | No default responsibility |
| CourseCompletion | No in Certificate context | Read/act through Completion service as permitted | No Certificate write | No | Recommendation belongs to Completion context |

## 11.8 External Public Verifier

| Entity | C | R | U | D | Scope / Notes |
|---|---:|---:|---:|---:|---|
| Certificate | No | Minimal verification projection | No | No | Lookup only by opaque verification code/QR; no registry listing |
| CertificateVerification | Indirect append by system | No | No | No | Request may cause system logging, but public actor has no database CRUD access |
| CertificateReissueRequest | No | No | No | No | Not exposed publicly |

---

# 12. System Actor CRUD Matrix

## 12.1 Certificate Application Service

| Entity | C | R | U | D | Notes |
|---|---:|---:|---:|---:|---|
| Certificate | Yes | Yes | Yes | No | Aggregate command handler; all invariants enforced |
| CertificateVerification | Yes | Yes | No normal update | No | Append verification activity |
| CertificateReissueRequest | Yes | Yes | Yes | No | Submit, decide, complete replacement lineage |
| Enrollment | No | Yes | No | No | Authoritative reference/read |
| CourseCompletion | No | Yes | No | No | Consume eligibility decision |
| Finance data | No | Through service contract | No | No | No direct financial ownership |
| NumberingSeries | No | Through allocation service | Through Configuration service only | No | Certificate module does not update series directly outside owning contract |
| UserBranchAccess | No | Yes through IAM policy | No | No | Resolve effective scope |

## 12.2 Public Verification Service

| Entity | C | R | U | D | Notes |
|---|---:|---:|---:|---:|---|
| Certificate | No | Yes by verificationCode | No | No | Minimal projection only |
| CertificateVerification | Yes | Optional internal read | No | No | Append matched verification result |
| Enrollment/StudentProfile | No | Minimal approved projection only | No | No | Public response must minimize PII |

## 12.3 Completion Integration Handler

| Entity | C | R | U | D | Notes |
|---|---:|---:|---:|---:|---|
| Certificate | No automatic issuance by default | Read readiness/projection | No unless explicit approved orchestration | No | Completion event may make enrollment ready; issuance remains Certificate command policy |
| CourseCompletion | No | Read/consume event | No | No | Completion context owns source event |

## 12.4 Finance Validation Service

| Entity | C | R | U | D | Notes |
|---|---:|---:|---:|---:|---|
| Certificate-owned tables | No | No direct need | No | No | Returns authoritative payment gate decision |
| Finance entities | Finance-owned | Finance-owned | Finance-owned | Finance policy | Certificate does not bypass service contract |

## 12.5 Communication Integration Handler

| Entity | C | R | U | D | Notes |
|---|---:|---:|---:|---:|---|
| Certificate | No | Read notification payload projection | No | No | Cannot change Certificate status |
| NotificationRequest | Yes in Communication context | Yes | Yes delivery lifecycle in Communication | Per Communication policy | Certificate only requests notification |

## 12.6 Reporting Projection Builder

| Entity | C | R | U | D | Notes |
|---|---:|---:|---:|---:|---|
| Certificate | No | Yes read-only facts | No | No | Reporting consumes facts |
| CertificateVerification | No | Yes aggregated facts subject to privacy policy | No | No | Reporting must not mutate source |
| CertificateReissueRequest | No | Yes read-only facts | No | No | Build operational/reporting projection |
| MetricSnapshot/read model | Reporting-owned | Reporting-owned | Reporting-owned | Reporting policy | Not Certificate-owned |

## 12.7 Audit Service

| Entity | C | R | U | D | Notes |
|---|---:|---:|---:|---:|---|
| Certificate-owned records | No | Read IDs/state snapshots as event payload context | No | No | Does not mutate Certificate state |
| AuditLog | Yes in Audit context | Yes | Append-only/correction policy | No normal delete | Certificate commands request audit recording |
| ApprovalHistory | Yes in Audit context | Yes | Controlled workflow | No normal delete | Reissue approval trail |

---

# 13. Permission-to-Data-Action Matrix

Recommended permission codes are functional contracts; exact seeded permissions must be validated with IAM configuration.

| Permission | Entity | Allowed Data Action | Server Guard |
|---|---|---|---|
| `certificate.read` | Certificate | R | Effective branch scope |
| `certificate.generate` | Certificate | C | Branch + eligibility + payment gate + duplicate guard |
| `certificate.issue` | Certificate | U Generated→Issued | Branch + command-time revalidation + version |
| `certificate.download` | Certificate artifact | R | Branch or Student self-scope |
| `certificate.revoke` | Certificate | U Issued→Revoked | Branch + reason + version + audit |
| `certificate.verification.activity.read` | CertificateVerification | R | Branch + privacy control |
| `certificate.reissue.request` | CertificateReissueRequest | C/S | Branch or Student self-scope + original Certificate eligibility |
| `certificate.reissue.read` | CertificateReissueRequest | R | Branch or Student self-scope |
| `certificate.reissue.approve` | CertificateReissueRequest | U/A | Effective branch + PendingReview + version + audit |
| `certificate.reissue.generate` | Certificate + ReissueRequest | C/U | Approved request + no replacement + branch + version |
| `certificate.audit.read` | Audit projection | R | Branch + Audit permission |

No permission grants physical delete.

---

# 14. Transaction Boundaries

## 14.1 Generate Certificate Transaction

Minimum atomic behavior:

```text
BEGIN
  authorize permission and branch
  re-read Enrollment source facts
  obtain authoritative completion eligibility decision
  obtain Finance validation decision when required
  check duplicate/current lineage
  allocate certificate number through Configuration-owned atomic service
  generate verification code
  persist Certificate in Generated state
  persist artifact reference when generation strategy requires same transaction boundary or use safe compensating/retry policy
  record/publish in-process lifecycle fact
COMMIT

Audit recording must follow repository's reliable in-process transaction/integration convention.
```

No external broker is required or proposed.

## 14.2 Issue Certificate Transaction

```text
BEGIN
  lock/version-check Certificate
  authorize branch + certificate.issue
  require Generated state
  revalidate command-time authoritative gates
  set status = Issued
  set issuedDate
  set issuedBy
  increment version
  record lifecycle audit request/event
COMMIT
```

## 14.3 Approve Reissue Transaction

```text
BEGIN
  version-check PendingReview request
  authorize branch + certificate.reissue.approve
  set status = Approved
  set approvedBy
  set approvedAt
  increment version
  record approval/audit history through owning context
COMMIT
```

## 14.4 Generate Replacement Transaction

```text
BEGIN
  lock/version-check Approved reissue request
  require newCertificateId IS NULL
  authorize branch + certificate.reissue.generate
  re-read original Certificate and authoritative source references
  allocate new certificate number
  generate new verification code and QR reference
  create replacement Certificate
  link request.newCertificateId = replacement.id
  set request.status = Completed
  increment request.version
  record audit and lifecycle facts
COMMIT
```

The transaction must prevent two replacement Certificates from one request.

## 14.5 Revoke Certificate Transaction

```text
BEGIN
  version-check Issued Certificate
  authorize branch + certificate.revoke
  validate non-empty reason
  set certificateStatus = Revoked
  increment version
  record old/new state, actor, time, reason in Audit context
COMMIT
```

Current ER model lacks dedicated revocation columns; do not silently add them without approved ER change.

---

# 15. Query Patterns and Table Behavior Support

The database model must support the Part 3 screens without browser-side joins or business-rule computation.

## 15.1 Certificate Registry Query

Server query may join/reference:

```text
Certificate
→ Enrollment
→ StudentProfile → Person
→ Course
→ Batch
→ Enrollment.branchId
```

Required filters:

- certificate number;
- student name/number through approved search projection;
- course;
- batch;
- status;
- language;
- issued date range;
- branch within effective scope.

All pagination and sorting are server-side with deterministic tiebreaker `Certificate.id`.

## 15.2 Reissue Queue Query

Primary index path:

```text
CertificateReissueRequest.status
+ createdAt
+ Certificate.enrollmentId
+ Enrollment.branchId
```

No query may return requests from a branch outside effective scope and then filter them in the browser.

## 15.3 Verification Activity Query

Primary path:

```text
CertificateVerification.certificateId
+ verifiedAt DESC
```

Branch authorization derives through Certificate and Enrollment.

## 15.4 Student Certificate Query

Primary predicate:

```text
Certificate.studentProfileId = authenticatedStudentProfileId
AND deletedAt IS NULL
```

Never accept arbitrary `studentProfileId` from the browser as authorization.

---

# 16. Effective Dating Assessment

The ER requirement asks for effective dating where relevant. The Certificate-owned entities do **not** require `effectiveStartDate` / `effectiveEndDate` in the current baseline.

| Entity | Effective Dating Required? | Reason |
|---|---:|---|
| Certificate | No | Lifecycle is represented by generation, issue date, status, and audit history |
| CertificateVerification | No | Event record uses `verifiedAt` |
| CertificateReissueRequest | No | Workflow timestamps and status represent lifecycle |

Referenced `NumberingSeries` uses active configuration semantics; Course and organizational data may use effective dates in their owning contexts. Certificate Management must respect authoritative valid references at command time but must not copy their effective-dating columns.

---

# 17. Audit Column Requirements

## 17.1 Certificate

Required common operational metadata:

```text
createdAt
createdBy
updatedAt
updatedBy
deletedAt
isActive
version
```

Sensitive lifecycle audit is additionally written in Audit & Compliance, because row metadata alone cannot answer:

- what changed;
- old value;
- new value;
- reason;
- IP address;
- approval history.

## 17.2 CertificateVerification

At minimum:

```text
verifiedAt
verifiedByIp
verificationStatus
```

Shared base fields apply according to repository convention. Because verification events are append-only, ordinary `updatedBy` changes should be rare.

## 17.3 CertificateReissueRequest

At minimum:

```text
createdAt / request submission time
createdBy or requestedBy
updatedAt
updatedBy
version
```

Approval decision history is additionally preserved by Audit/ApprovalHistory.

---

# 18. Data Integrity Rules

| ID | Rule | Enforcement Layer |
|---|---|---|
| DI-CERT-001 | Certificate must reference an existing Enrollment | FK + application guard |
| DI-CERT-002 | Certificate learner/course/batch references must match Enrollment | Application command validation; optional DB trigger only if repository architecture explicitly permits |
| DI-CERT-003 | Certificate number unique | Unique constraint |
| DI-CERT-004 | Verification code unique | Unique constraint |
| DI-CERT-005 | Browser cannot choose certificate number or verification code | API contract + server generation |
| DI-CERT-006 | Issued status requires issue metadata | Application/domain invariant; DB CHECK if enum/schema permits |
| DI-CERT-007 | Revocation preserves issue metadata | Domain invariant |
| DI-CERT-008 | Verification records are append-only | Repository/API policy |
| DI-CERT-009 | Reissue reason non-empty | Application validation + optional DB CHECK |
| DI-CERT-010 | Replacement requires Approved request | Domain command guard |
| DI-CERT-011 | One reissue request cannot produce multiple replacements | Transaction lock/version + unique non-null newCertificateId + state guard |
| DI-CERT-012 | Original and replacement IDs cannot be equal | Application guard + optional CHECK |
| DI-CERT-013 | No physical delete | Repository policy + restricted permissions + FK RESTRICT |
| DI-CERT-014 | Internal reads/mutations are branch-scoped | Server authorization + query predicate |
| DI-CERT-015 | Student reads/reissue submission are self-scoped | IAM/Person mapping + query predicate |
| DI-CERT-016 | Public verification returns minimal projection | Dedicated public query DTO |
| DI-CERT-017 | Lifecycle mutations use optimistic concurrency | `version` conditional update |
| DI-CERT-018 | Number allocation is atomic | Configuration-owned allocation transaction |

---

# 19. DDD Ownership Fit Check

## 19.1 Cleanly Aligned Models

| Model | DDD Alignment | ER Alignment | Result |
|---|---|---|---|
| Certificate | Certificate aggregate root | Explicit ER entity | Aligned |
| CertificateVerification | Certificate verification responsibility | Explicit ER entity | Aligned |
| CertificateReissueRequest | Reissue workflow responsibility | Explicit ER entity | Aligned |
| Enrollment reference | Certificate must link to Enrollment | Explicit FK | Aligned |
| StudentProfile reference | Learner traceability | Explicit FK | Aligned |
| Course reference | Credential course trace | Explicit FK | Aligned |
| Batch reference | Credential delivery trace | Explicit FK | Aligned |
| User issuer reference | Issue actor trace | `issuedBy` in ER | Aligned |

## 19.2 Partial Alignments / Gaps

### GAP-CERT-DB-001 – `CertificateIssueLog`

DDD lists `CertificateIssueLog` as a Certificate aggregate concept, but ER v3 has no entity for it.

**Current FRD decision:** use Certificate lifecycle fields plus AuditLog for traceability. Do not invent `CertificateIssueLog` until DDD/ER/schema are reconciled.

### GAP-CERT-DB-002 – QR Representation

DDD names `CertificateQRCode`; ER stores `qrCodeUrl` directly on Certificate.

**Current FRD decision:** use `Certificate.qrCodeUrl`. No separate QR table.

### GAP-CERT-DB-003 – Revocation Metadata

DDD explicitly owns revocation, but ER only has generic `certificateStatus`; it lacks:

```text
revokedAt
revokedBy
revocationReason
```

**Current FRD decision:** persist Revoked status and mandatory reason/actor/time in AuditLog. Rich structured revocation reporting may justify a future approved ER extension.

### GAP-CERT-DB-004 – Enrollment-to-Certificate Cardinality Versus Replacement Certificate

ER cardinality says Enrollment → Certificate is 1:1, while reissue creates a `newCertificateId`, and Part 1 requires replacement Certificate creation.

**Required resolution before final migration design:** establish one of these approved strategies:

1. Enrollment 1:N Certificate with explicit lineage/current credential rule; or
2. Certificate 1:1 Enrollment plus reissue version/artifact history within same Certificate, requiring ER change; or
3. another explicitly modeled credential-lineage aggregate.

This Part 4 does not choose a hidden schema change. Application logic must preserve one authoritative current credential lineage and auditable replacement history.

### GAP-CERT-DB-005 – Rejection Metadata

`CertificateReissueRequest` has approval fields but no explicit:

```text
rejectedBy
rejectedAt
rejectionReason
```

**Current FRD decision:** use request status plus Audit/ApprovalHistory for rejection actor, timestamp, and remarks.

### GAP-CERT-DB-006 – Verification Status Enum

ER has `verificationStatus` but does not enumerate values.

**Required semantic behavior:** valid, revoked/not-valid, and replacement/superseded outcome where lineage policy supports it. Exact Prisma enum must be confirmed.

### GAP-CERT-DB-007 – Certificate Status Enum

ER has `certificateStatus` without values.

**Required Part 2 semantics:** Generated, Issued, Revoked. Exact enum naming must be confirmed in Prisma.

### GAP-CERT-DB-008 – Prisma Schema Not Validated

The supplied source set used for the FRD does not include a verified `packages/database/prisma/schema.prisma` snapshot in this generation step.

**Impact:** SQL/Prisma physical names, actual enum names, base-field mixins, relation names, and existing indexes must be compared before implementation acceptance.

---

# 20. Explicit “Should Not Exist” Models

The following Certificate-local tables would violate DDD ownership or current scope unless an approved architecture/domain change is made:

| Prohibited Local Model | Why It Must Not Exist in Certificate Context | Correct Owner / Approach |
|---|---|---|
| `CertificateEligibility` | Would duplicate completion evaluation | Consume Exam & Completion decision |
| `CertificateAttendanceSummary` as source of truth | Attendance/completion facts owned elsewhere | Read approved Completion projection |
| `CertificateExamResult` | Would duplicate Result | Exam & Completion owns Result |
| `CertificatePaymentStatus` as source of truth | Would duplicate Finance truth | Consume Finance validation decision |
| `CertificateInvoice` | Finance owns Invoice | Reference Finance service/result only |
| `CertificateStudent` | Duplicates Party/StudentProfile | Reference StudentProfile/Person |
| `CertificateCourse` | Duplicates Course | Reference Course |
| `CertificateBatch` | Duplicates Batch | Reference Batch |
| `CertificateBranchAccess` | Duplicates IAM branch access | Use UserBranchAccess policy |
| `CertificateRole` / `CertificatePermission` | Duplicates dynamic RBAC | IAM owns Role/Permission |
| `CertificateNotificationLog` | Duplicates Communication history | Communication owns NotificationRequest/Log |
| `CertificateReportSnapshot` | Reporting owns projections/snapshots | Publish facts to Reporting |
| `CertificateTemplate` | Current version uses one hardcoded template | Future approved extension only |
| `CertificateQRCode` table | ER currently uses `qrCodeUrl` field | Use current ER representation |
| `CertificateApprovalHistory` | Audit & Compliance owns approval history | Use ApprovalHistory/AuditLog |

---

# 21. Repository Boundary Recommendations

Within the modular monolith, the Certificate package may expose repositories/interfaces such as:

```text
CertificateRepository
CertificateVerificationRepository
CertificateReissueRequestRepository
```

Cross-context dependencies should use application ports/services such as:

```text
EnrollmentReferenceQuery
CompletionEligibilityQuery
PaymentValidationQuery
CertificateNumberAllocator
EffectiveBranchScopeQuery
AuditRecorder
NotificationRequester
CertificateReportingFactPublisher
```

These are application boundaries, not new persistence ownership.

The Certificate package must not import another bounded context's private repository and update its tables directly.

---

# 22. CRUD and Ownership Consistency Checklist

| Check | Required Result |
|---|---|
| Certificate-owned entity count matches ER baseline | Three owned models: Certificate, CertificateVerification, CertificateReissueRequest |
| Enrollment remains central | Every Certificate references Enrollment |
| Course and Batch preserved | Certificate references Course and Batch and validates against Enrollment |
| Completion evaluation ownership | Read only; no Certificate eligibility calculation table |
| Finance ownership | Decision consumption only; no finance mutation |
| Person/Party duplication avoided | StudentProfile/Person referenced, never cloned |
| Branch isolation | Derived server-side through Enrollment.branchId and IAM effective scope |
| Hard delete | Prohibited |
| Sensitive state changes | Audited through Audit & Compliance |
| Reissue lineage | Original request links to newCertificateId |
| Public verification | Opaque code, minimal disclosure, verification history where model permits |
| Numbering | Configuration-owned atomic allocation |
| Reporting | Read-only consumption/projection ownership remains Reporting |
| Communication | Notification request through Communication context |
| Effective dates | Not needed on Certificate-owned tables in current model |
| Optimistic locking | Version token on mutable operational records |
| Prisma validation | Mandatory before implementation acceptance |

---

# 23. Final DDD and ER Conformance Conclusion

The Certificate Management database design is conformant when implemented with the following ownership boundaries:

```text
Certificate Context owns
  Certificate
  CertificateVerification
  CertificateReissueRequest

Certificate Context references, but does not own
  Enrollment
  StudentProfile / Person
  Course
  Batch
  CourseCompletion / CompletionApproval
  Finance validation
  NumberingSeries allocation
  User / Permission / UserBranchAccess
  AuditLog / ApprovalHistory
  NotificationRequest / NotificationLog
  Reporting read models
```

The design must preserve the following non-negotiable rules:

1. Enrollment is the central learning transaction and the root reference for every Certificate.
2. Certificate Management does not compute completion eligibility.
3. Certificate Management does not calculate payment status or mutate Finance records.
4. Certificate lifecycle status is owned by Certificate Management.
5. Branch scope is enforced server-side by resolving Certificate → Enrollment → Branch and checking IAM effective access.
6. No business record is hard-deleted.
7. Issue, revoke, approval, rejection, and replacement actions are auditable.
8. Replacement lineage is explicit and concurrency-safe.
9. Public verification uses minimal disclosure and opaque verification identity.
10. Known DDD/ER mismatches are treated as explicit gaps, not silently solved by invented tables.

Before database migration implementation, the final schema review must reconcile the noted cardinality and enum gaps and compare every field, relation, index, and base-column convention against the actual Prisma schema.
