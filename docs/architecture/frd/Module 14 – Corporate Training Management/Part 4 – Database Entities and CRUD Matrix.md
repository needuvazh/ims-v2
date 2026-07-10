# Part 4 – Database Entities and CRUD Matrix

## Module 14 – Corporate Training Management

## Document Control

| Field | Value |
|---|---|
| Module | Module 14 – Corporate Training Management |
| Module Code | CTM |
| Owning Bounded Context | Corporate Training Management |
| Architecture Style | Next.js monorepo modular monolith |
| Aggregate Root | `CorporateAccount` |
| Approved CTM-Owned Persistence Models | `CorporateAccount`, `CorporateContact`, `CorporateContract`, `CorporateParticipant`, `CorporateEnrollment` |
| Cross-Context References | `Organization`, `Person`, `StudentProfile`, `Enrollment`, `User`, and read-only references/projections from Course Catalog, Training Delivery, Finance, Attendance, Completion, Certificate, Document, Reporting, IAM and Audit |
| Source Baselines | DDD Context Map v3.0; ER Model v3.0; ASTI ERP Workflow; Module 14 Overview; Parts 1–3 |
| Status | Draft for review |

---

# 1. Purpose and Data-Model Position

This document defines the persistence boundary for Module 14 – Corporate Training Management. It specifies the tables owned by the Corporate Training bounded context, their fields, constraints, indexes, relationships, lifecycle controls, and actor-level CRUD permissions.

The design follows five non-negotiable rules:

1. **Corporate Training owns only its own business records.** It owns corporate accounts, corporate contacts, corporate contracts, corporate participants, and the corporate-to-enrollment linkage.
2. **The central learning transaction remains `Enrollment`.** CTM references `Enrollment` but does not duplicate Course, Batch, pricing, status, attendance, completion, or certificate facts into CTM-owned transactional tables.
3. **Identity remains shared.** CTM references `Organization` and `Person`; it does not create alternate corporate-specific identity masters.
4. **No physical table is introduced solely because a workflow document names a concept.** A concept must have an approved DDD owner and ER definition before it becomes a persistence model.
5. **No hard delete is permitted.** CTM entities use soft-delete/audit conventions and optimistic concurrency. Historical corporate linkage is preserved.

The current ER baseline explicitly defines five CTM models:

```text
CorporateAccount
 ├── CorporateContact
 ├── CorporateContract
 ├── CorporateParticipant
 └── CorporateEnrollment
        ├── CorporateParticipant
        ├── CorporateContract
        └── Enrollment (external owner)
```

The DDD baseline additionally names `CorporateDepartment`, `CorporateCoordinator`, and `CorporateTrainingProgram`. The current ER baseline does not define their fields, keys, or relationships. Therefore, this document does **not** invent tables for those concepts. They remain architecture gaps requiring explicit model approval.

---

# 2. Database Conventions

## 2.1 Identifier and Timestamp Conventions

Unless the repository Prisma schema establishes a different concrete convention, CTM tables use the project baseline conventions below:

| Concern | Convention |
|---|---|
| Primary key | `String @id @default(cuid())` at Prisma level or repository-equivalent UUID/CUID identifier |
| Timestamps | PostgreSQL `timestamptz` represented as Prisma `DateTime` |
| Business dates | PostgreSQL `date` where time-of-day is not meaningful |
| Currency amount | `Decimal(18,3)` to support OMR precision and avoid floating-point arithmetic |
| Versioning | Integer `version`, initialized to `1`, incremented on every write |
| Soft delete | `isDeleted Boolean`, `deletedAt DateTime?`, `deletedBy String?` |
| Audit creation | `createdAt`, `createdBy` |
| Audit update | `updatedAt`, `updatedBy` |
| Effective dating | `effectiveStartDate`, `effectiveEndDate` only where temporal validity is business-significant |
| Enumerations | Database-safe enum/check constraint aligned to domain state machines |
| Free-form reason | Bounded `VarChar`/text with application-level maximum length |
| Branch filtering | Always applied server-side; client-supplied branch IDs are never trusted as authorization evidence |

## 2.2 Common Audit Columns

All CTM-owned tables include these repository-level control fields:

| Field | Type | Nullable | Purpose |
|---|---|---:|---|
| `createdAt` | `DateTime` / `timestamptz` | No | Record creation timestamp |
| `createdBy` | `String` FK/reference to IAM User | No | User or system principal that created the record |
| `updatedAt` | `DateTime` / `timestamptz` | No | Last update timestamp |
| `updatedBy` | `String` FK/reference to IAM User | No | Last principal that changed the record |
| `version` | `Int` | No | Optimistic concurrency token; starts at 1 |
| `isDeleted` | `Boolean` | No | Logical deletion marker; default `false` |
| `deletedAt` | `DateTime?` / `timestamptz` | Yes | Logical deletion timestamp |
| `deletedBy` | `String?` | Yes | Principal performing logical deletion |

### Soft-Delete Integrity Rules

```text
isDeleted = false → deletedAt IS NULL AND deletedBy IS NULL
isDeleted = true  → deletedAt IS NOT NULL AND deletedBy IS NOT NULL
```

Deletion is a domain/application action, not a database cascade. Foreign-key cascade deletion is prohibited for CTM-owned operational data.

## 2.3 Effective-Dating Convention

`CorporateContract` is explicitly date-valid by `startDate` and `endDate`. Separate generic effective dates are not duplicated on that entity because the contract validity dates already express the business interval.

`CorporateAccount`, `CorporateContact`, and `CorporateParticipant` use lifecycle status plus soft-delete history. The existing ER does not define effective dates for those entities. This document therefore does not add them as business fields without source authority.

Where future business requirements demand temporal assignment history—for example, participant department history or coordinator assignment periods—the model must be extended through an approved DDD/ER update rather than silently overwriting fields or inventing effective-dated child tables.

---

# 3. CTM-Owned Entity Inventory

| Entity | Ownership | Aggregate Position | Purpose |
|---|---|---|---|
| `CorporateAccount` | CTM owned | Aggregate root | Corporate customer operational profile and contract/participant container |
| `CorporateContact` | CTM owned | Child of CorporateAccount | Corporate contact relationship to a shared Person |
| `CorporateContract` | CTM owned | Child of CorporateAccount | Contract terms, validity, billing model, payment terms |
| `CorporateParticipant` | CTM owned | Child of CorporateAccount | Employer-specific participant relationship to a shared Person |
| `CorporateEnrollment` | CTM owned coordination/link entity | Cross-context association | Preserves corporate account/participant/contract linkage to external Enrollment and billing coordination status |

---

# 4. Entity Specifications

## 4.1 `CorporateAccount`

### 4.1.1 Business Purpose

`CorporateAccount` is the aggregate root for the Corporate Training context. It represents ASTI's operational training relationship with a corporate customer and must link to exactly one Organization owned by the Party/Organization model.

It is not the legal identity master; legal name, registration number, tax registration number, address, and canonical contact identity remain owned by `Organization`/Party.

### 4.1.2 Table Specification

**Table:** `corporate_accounts`

| Field | Database / Prisma Type | Nullable | Key / Default | Constraints and Notes |
|---|---|---:|---|---|
| `id` | `String` | No | PK | CUID/UUID according to repository standard |
| `organizationId` | `String` | No | FK → `organizations.id` | Exactly one Organization; `ON DELETE RESTRICT`; organization must be valid for corporate use |
| `accountCode` | `VarChar(50)` / `String` | No | Alternate key | Trimmed; uppercase-normalized for comparison; immutable after activation unless controlled migration |
| `accountName` | `VarChar(250)` / `String` | No | — | Operational/display account name; not a replacement for Organization legal name |
| `industry` | `VarChar(120)` / `String?` | Yes | — | May later reference configured master data if approved |
| `creditLimit` | `Decimal(18,3)` | No | default `0.000` | Non-negative; ownership reconciliation required because Finance also owns credit calculation semantics |
| `currentOutstanding` | `Decimal(18,3)` | No | default `0.000` | Read/update ownership must be constrained; Finance is source of receivable truth; see gap note below |
| `blockOnCreditLimit` | `Boolean` | No | default `false` | Enrollment orchestration respects Finance credit validation result |
| `billingCycle` | enum/string | No | — | Approved configurable/domain values only |
| `status` | `CorporateAccountStatus` | No | default `ACTIVE` only if workflow permits; otherwise `DRAFT` | Allowed values aligned to Part 2 state machine |
| `createdAt` | `DateTime` | No | default now | Audit column |
| `createdBy` | `String` | No | reference IAM User | `ON DELETE RESTRICT` or logical user retention |
| `updatedAt` | `DateTime` | No | auto-update | Audit column |
| `updatedBy` | `String` | No | reference IAM User | Audit column |
| `version` | `Int` | No | default `1` | Must be > 0 |
| `isDeleted` | `Boolean` | No | default `false` | Soft delete only |
| `deletedAt` | `DateTime?` | Yes | — | Required when deleted |
| `deletedBy` | `String?` | Yes | reference IAM User | Required when deleted |

### 4.1.3 Keys and Uniqueness

1. Primary key: `PK(corporate_accounts.id)`.
2. Unique active account code:
   - preferred PostgreSQL partial unique index on normalized `accountCode` where `isDeleted = false`;
   - if Prisma migration tooling cannot express the partial index directly, create it through a reviewed SQL migration.
3. Organization linkage uniqueness requires policy confirmation:
   - Part 1 requires duplicate relationship prevention;
   - ER cardinality does not explicitly state whether one Organization may have more than one historical/operational CorporateAccount;
   - recommended rule: prevent more than one non-deleted active/open CorporateAccount per `organizationId`, while preserving historical closed rows if business policy permits.

### 4.1.4 Indexes

| Index | Columns | Purpose |
|---|---|---|
| `ux_ctm_account_code_active` | normalized `accountCode` where not deleted | Enforce account-code uniqueness |
| `ix_ctm_account_org` | `organizationId` | Organization-to-account lookup |
| `ix_ctm_account_status` | `status`, `isDeleted` | Operational filtering |
| `ix_ctm_account_name` | normalized `accountName` | Search/prefix support; implementation may use trigram index after measured need |
| `ix_ctm_account_billing_cycle` | `billingCycle`, `status` | Billing coordination/report filters |
| `ix_ctm_account_updated` | `updatedAt DESC` | Recent changes and sync/read model refresh support |

### 4.1.5 Check Constraints

```text
creditLimit >= 0
currentOutstanding >= 0
version > 0
soft-delete field consistency
```

### 4.1.6 Ownership Warning: Credit Fields

The ER places `creditLimit`, `currentOutstanding`, and `blockOnCreditLimit` on `CorporateAccount`, while the DDD also assigns credit-rule validation and receivables truth to Finance and defines `CorporateCreditRule`. Therefore:

- CTM must not independently recalculate `currentOutstanding` from local data;
- enrollment orchestration must consume the Finance credit-validation result;
- direct manual editing of `currentOutstanding` in CTM UI is prohibited;
- before implementation, the architecture team should confirm whether these fields are Finance-maintained projections on `CorporateAccount`, compatibility fields, or should be removed in favor of `CorporateCreditRule` reads.

---

## 4.2 `CorporateContact`

### 4.2.1 Business Purpose

Represents a contact relationship between a CorporateAccount and an existing shared `Person`. A person may be a contact for multiple corporate accounts, and a corporate account may have multiple contacts.

### 4.2.2 Table Specification

**Table:** `corporate_contacts`

| Field | Database / Prisma Type | Nullable | Key / Default | Constraints and Notes |
|---|---|---:|---|---|
| `id` | `String` | No | PK | CUID/UUID |
| `corporateAccountId` | `String` | No | FK → `corporate_accounts.id` | `ON DELETE RESTRICT` |
| `personId` | `String` | No | FK → `persons.id` | `ON DELETE RESTRICT`; shared identity reference |
| `designation` | `VarChar(150)` / `String?` | Yes | — | Employer-context designation |
| `department` | `VarChar(150)` / `String?` | Yes | — | Free-text employer department until CorporateDepartment gap is resolved |
| `email` | `VarChar(320)` / `String?` | Yes | — | Relationship-specific business email; normalize for comparison |
| `phone` | `VarChar(32)` / `String?` | Yes | — | E.164-normalized where possible |
| `isPrimary` | `Boolean` | No | default `false` | At most one active primary contact per account under current policy |
| `portalAccessEnabled` | `Boolean` | No | default `false` | Flag only; IAM owns user provisioning and access grants |
| `status` | `CorporateContactStatus` | No | default `ACTIVE` | Added as lifecycle control required by Part 1/Part 2 semantics; must be reconciled into ER baseline before schema commit |
| `createdAt` | `DateTime` | No | default now | Audit |
| `createdBy` | `String` | No | IAM reference | Audit |
| `updatedAt` | `DateTime` | No | auto-update | Audit |
| `updatedBy` | `String` | No | IAM reference | Audit |
| `version` | `Int` | No | default `1` | Optimistic locking |
| `isDeleted` | `Boolean` | No | default `false` | Soft delete |
| `deletedAt` | `DateTime?` | Yes | — | Soft delete timestamp |
| `deletedBy` | `String?` | Yes | IAM reference | Soft delete actor |

### 4.2.3 Keys and Uniqueness

1. `PK(id)`.
2. Prevent duplicate active relationship `(corporateAccountId, personId)` where `isDeleted = false` and status is active-equivalent.
3. Partial unique index for one active primary contact per account:

```sql
UNIQUE (corporate_account_id)
WHERE is_primary = true AND is_deleted = false AND status = 'ACTIVE'
```

### 4.2.4 Indexes

| Index | Columns | Purpose |
|---|---|---|
| `ix_ctm_contact_account` | `corporateAccountId`, `status`, `isDeleted` | Account contact list |
| `ix_ctm_contact_person` | `personId` | Person relationship lookup |
| `ix_ctm_contact_email` | normalized `email` | Search and identity-assistance only; not Person identity authority |
| `ix_ctm_contact_phone` | normalized `phone` | Search and identity-assistance |
| `ux_ctm_contact_primary_active` | account partial unique index | One primary contact rule |

### 4.2.5 Validation/Constraint Rules

- At least one of `email`, `phone`, or a reachable Person primary contact should exist for an active operational contact; this is an application invariant because it spans the Person context.
- `portalAccessEnabled = true` does not create a User and does not grant permission. IAM provisioning is separate.
- Deactivating a contact does not delete Person.

---

## 4.3 `CorporateContract`

### 4.3.1 Business Purpose

Represents the commercial training contract under which corporate training activity may be coordinated. Corporate Sales may hand off approved commercial outcomes, but CTM owns the operational CorporateContract in the current DDD/ER baseline.

### 4.3.2 Table Specification

**Table:** `corporate_contracts`

| Field | Database / Prisma Type | Nullable | Key / Default | Constraints and Notes |
|---|---|---:|---|---|
| `id` | `String` | No | PK | CUID/UUID |
| `corporateAccountId` | `String` | No | FK → `corporate_accounts.id` | `ON DELETE RESTRICT` |
| `contractNumber` | `VarChar(80)` / `String` | No | Alternate key | Unique among non-deleted records; normalized comparison |
| `contractValue` | `Decimal(18,3)` | No | — | Must be >= 0; OMR-compatible precision |
| `startDate` | `Date` | No | — | Contract validity start |
| `endDate` | `Date` | No | — | Must be >= startDate |
| `billingModel` | `CorporateBillingModel` | No | — | `PER_STUDENT`, `PER_BATCH`, `PER_HOUR`, `FIXED_CONTRACT` |
| `paymentTerms` | `Text` / `String` | No | — | Controlled max length; structured terms may require future model extension |
| `status` | `CorporateContractStatus` | No | — | State machine aligned to Part 2 |
| `createdAt` | `DateTime` | No | default now | Audit |
| `createdBy` | `String` | No | IAM reference | Audit |
| `updatedAt` | `DateTime` | No | auto-update | Audit |
| `updatedBy` | `String` | No | IAM reference | Audit |
| `version` | `Int` | No | default `1` | Optimistic locking |
| `isDeleted` | `Boolean` | No | default `false` | Soft delete |
| `deletedAt` | `DateTime?` | Yes | — | Soft delete timestamp |
| `deletedBy` | `String?` | Yes | IAM reference | Soft delete actor |

### 4.3.3 Keys and Uniqueness

- `PK(id)`.
- Unique active/non-deleted `contractNumber`.
- If contract numbers are branch-scoped in future, the NumberingSeries policy must be explicitly defined before changing uniqueness to a composite scope.

### 4.3.4 Indexes

| Index | Columns | Purpose |
|---|---|---|
| `ux_ctm_contract_number_active` | normalized `contractNumber` where not deleted | Contract lookup and uniqueness |
| `ix_ctm_contract_account` | `corporateAccountId`, `status`, `isDeleted` | Account contract list |
| `ix_ctm_contract_validity` | `startDate`, `endDate`, `status` | Applicability checks |
| `ix_ctm_contract_expiry` | `endDate`, `status` | Expiry alerts/read models |
| `ix_ctm_contract_billing_model` | `billingModel`, `status` | Reporting/filtering |

### 4.3.5 Check Constraints

```text
contractValue >= 0
endDate >= startDate
version > 0
soft-delete field consistency
```

### 4.3.6 Contract Applicability Invariant

A contract may be referenced during corporate enrollment only when all are true:

```text
contract.corporateAccountId == participant.corporateAccountId
contract.isDeleted == false
contract.status == ACTIVE
current business date >= contract.startDate
current business date <= contract.endDate
```

The final enrollment flow must also comply with Finance credit checks and Admission & Enrollment invariants.

---

## 4.4 `CorporateParticipant`

### 4.4.1 Business Purpose

Represents a person's employer-specific participation relationship with a CorporateAccount. It does not replace `Person` or `StudentProfile`.

A person changing employer results in a distinct CorporateParticipant relationship under the new account while reusing the same Person identity. Historical employer relationships and corporate enrollments remain preserved.

### 4.4.2 Table Specification

**Table:** `corporate_participants`

| Field | Database / Prisma Type | Nullable | Key / Default | Constraints and Notes |
|---|---|---:|---|---|
| `id` | `String` | No | PK | CUID/UUID |
| `corporateAccountId` | `String` | No | FK → `corporate_accounts.id` | `ON DELETE RESTRICT` |
| `personId` | `String` | No | FK → `persons.id` | `ON DELETE RESTRICT`; shared identity |
| `employeeCode` | `VarChar(80)` / `String?` | Yes | — | Employer-scoped identifier; uniqueness policy per account |
| `department` | `VarChar(150)` / `String?` | Yes | — | Free text until CorporateDepartment entity is approved |
| `designation` | `VarChar(150)` / `String?` | Yes | — | Employer-context role title |
| `linkedStudentProfileId` | `String?` | Yes | FK → `student_profiles.id` | `ON DELETE RESTRICT`; set only after identity-consistent student resolution |
| `status` | `CorporateParticipantStatus` | No | default `ACTIVE` | State machine aligned to Part 2 |
| `createdAt` | `DateTime` | No | default now | Audit |
| `createdBy` | `String` | No | IAM reference | Audit |
| `updatedAt` | `DateTime` | No | auto-update | Audit |
| `updatedBy` | `String` | No | IAM reference | Audit |
| `version` | `Int` | No | default `1` | Optimistic locking |
| `isDeleted` | `Boolean` | No | default `false` | Soft delete |
| `deletedAt` | `DateTime?` | Yes | — | Soft delete timestamp |
| `deletedBy` | `String?` | Yes | IAM reference | Soft delete actor |

### 4.4.3 Keys and Uniqueness

1. `PK(id)`.
2. Prevent duplicate active account-person relationship:

```text
UNIQUE active (corporateAccountId, personId)
```

3. Employee code uniqueness:

```text
UNIQUE active (corporateAccountId, normalized employeeCode)
WHERE employeeCode IS NOT NULL
```

This allows the same person to have different employee codes with different corporate accounts and prevents accidental duplicate employer records.

### 4.4.4 Indexes

| Index | Columns | Purpose |
|---|---|---|
| `ix_ctm_participant_account` | `corporateAccountId`, `status`, `isDeleted` | Corporate roster |
| `ix_ctm_participant_person` | `personId` | Cross-employer relationship lookup |
| `ix_ctm_participant_student` | `linkedStudentProfileId` | Student linkage query |
| `ux_ctm_participant_account_person_active` | account + person partial unique | Duplicate prevention |
| `ux_ctm_participant_employee_code_active` | account + normalized employee code partial unique | Employer identifier integrity |
| `ix_ctm_participant_department` | `corporateAccountId`, normalized `department` | Roster filtering/reporting |

### 4.4.5 Cross-Context Identity Constraint

When `linkedStudentProfileId` is set, application logic must verify:

```text
CorporateParticipant.personId == StudentProfile.personId
```

A database check constraint cannot enforce this cross-table equality directly; it must be enforced transactionally through an application service/domain policy. A mismatched StudentProfile link is a critical integrity error and must be audited.

### 4.4.6 Deactivation Rules

- Deactivation does not delete Person.
- Deactivation does not cancel Enrollment.
- Deactivation does not remove CorporateEnrollment history.
- Re-enrollment rules for inactive participants require explicit reactivation or an approved business policy.

---

## 4.5 `CorporateEnrollment`

### 4.5.1 Business Purpose

`CorporateEnrollment` is the CTM-owned association that preserves corporate provenance for an externally owned `Enrollment`. It connects:

- CorporateAccount;
- CorporateParticipant;
- Enrollment;
- optional/applicable CorporateContract;
- a CTM coordination-level billing status.

It is **not** an alternative Enrollment aggregate and is **not** a Finance ledger.

### 4.5.2 Table Specification

**Table:** `corporate_enrollments`

| Field | Database / Prisma Type | Nullable | Key / Default | Constraints and Notes |
|---|---|---:|---|---|
| `id` | `String` | No | PK | CUID/UUID |
| `corporateAccountId` | `String` | No | FK → `corporate_accounts.id` | `ON DELETE RESTRICT` |
| `corporateParticipantId` | `String` | No | FK → `corporate_participants.id` | `ON DELETE RESTRICT` |
| `enrollmentId` | `String` | No | FK → `enrollments.id` | `ON DELETE RESTRICT`; Enrollment is externally owned |
| `contractId` | `String?` | Yes | FK → `corporate_contracts.id` | `ON DELETE RESTRICT`; nullable when approved flow does not require contract, subject to business rules |
| `billingStatus` | `CorporateEnrollmentBillingStatus` | No | default according to approved lifecycle | Coordination status only; must not duplicate invoice/payment truth |
| `createdAt` | `DateTime` | No | default now | Audit |
| `createdBy` | `String` | No | IAM reference | Audit |
| `updatedAt` | `DateTime` | No | auto-update | Audit |
| `updatedBy` | `String` | No | IAM reference | Audit |
| `version` | `Int` | No | default `1` | Optimistic locking |
| `isDeleted` | `Boolean` | No | default `false` | Soft delete; use only for erroneous linkage correction under controlled workflow |
| `deletedAt` | `DateTime?` | Yes | — | Soft-delete timestamp |
| `deletedBy` | `String?` | Yes | IAM reference | Soft-delete actor |

### 4.5.3 Keys and Uniqueness

- `PK(id)`.
- One active CorporateEnrollment link per Enrollment:

```text
UNIQUE active (enrollmentId)
```

- Prevent duplicate active participant-enrollment association:

```text
UNIQUE active (corporateParticipantId, enrollmentId)
```

### 4.5.4 Indexes

| Index | Columns | Purpose |
|---|---|---|
| `ux_ctm_corp_enrollment_enrollment_active` | `enrollmentId` partial unique | One corporate provenance link per Enrollment |
| `ix_ctm_corp_enrollment_account` | `corporateAccountId`, `billingStatus`, `isDeleted` | Account training/billing view |
| `ix_ctm_corp_enrollment_participant` | `corporateParticipantId` | Participant training history |
| `ix_ctm_corp_enrollment_contract` | `contractId` | Contract utilization view |
| `ix_ctm_corp_enrollment_billing` | `billingStatus`, `updatedAt` | Billing coordination queue/read model |

### 4.5.5 Cross-Entity Integrity Rules

Application services must enforce all of the following atomically or through a transactionally consistent modular orchestration:

1. `CorporateParticipant.corporateAccountId == CorporateEnrollment.corporateAccountId`.
2. If `contractId` is present, `CorporateContract.corporateAccountId == CorporateEnrollment.corporateAccountId`.
3. `Enrollment.enrollmentType == CORPORATE` or equivalent approved enum value.
4. `Enrollment.corporateParticipantId`, if retained in Enrollment per ER baseline, must match `CorporateEnrollment.corporateParticipantId`.
5. `CorporateParticipant.linkedStudentProfileId == Enrollment.studentProfileId` after student-profile resolution.
6. Enrollment must have valid Course and Batch.
7. Corporate credit validation must pass according to Finance-owned rules before the Enrollment transition that requires it.
8. `billingStatus` changes must be based on approved Finance signals/queries and not client-calculated facts.

### 4.5.6 Billing Status Boundary

The ER defines `billingStatus` but does not define its exact enum values. Part 2 introduced a coordination lifecycle. Before migration commit, the enum must be reconciled with Finance contracts. Recommended semantics are limited to coordination states such as:

```text
NOT_REQUESTED
READY_FOR_BILLING
BILLING_REQUESTED
INVOICED
PARTIALLY_SETTLED
SETTLED
ON_HOLD
CANCELLED
```

The following must remain Finance-owned and must not be stored as CTM-calculated fields:

- invoice totals;
- paid amounts;
- outstanding amounts;
- aging bucket;
- payment allocation;
- refund amount;
- tax ledger values.

---

# 5. Enumerations and Domain Values

The final enum vocabulary must match Part 2 state machines and be approved before schema migration.

## 5.1 CorporateAccountStatus

```text
DRAFT
ACTIVE
SUSPENDED
CLOSED
```

Rules:

- soft deletion is orthogonal and represented by `isDeleted`;
- a deleted record is not another business status;
- CLOSED is terminal unless a specific reopen transition is approved.

## 5.2 CorporateContactStatus

```text
ACTIVE
INACTIVE
```

**Gap:** `status` is required by Part 1/2 lifecycle semantics but absent from the current ER field list for CorporateContact. Add only after ER/Prisma reconciliation.

## 5.3 CorporateContractStatus

```text
DRAFT
PENDING_APPROVAL
ACTIVE
EXPIRED
SUSPENDED
TERMINATED
CLOSED
```

Exact transitions and permissions are defined in Part 2.

## 5.4 CorporateParticipantStatus

```text
ACTIVE
INACTIVE
SUSPENDED
```

Soft delete remains separate.

## 5.5 CorporateBillingModel

```text
PER_STUDENT
PER_BATCH
PER_HOUR
FIXED_CONTRACT
```

These values derive directly from the ER baseline.

## 5.6 CorporateEnrollmentBillingStatus

The exact enum is an integration-contract decision because Finance owns invoice/payment truth. The CTM state machine must use only coordination/projection states and must not permit CTM users to fabricate settlement status.

---

# 6. Relationship Model and Delete Rules

## 6.1 CTM-Owned Relationships

| Parent | Child | Cardinality | FK Location | Delete Rule | Update Rule | Notes |
|---|---|---|---|---|---|---|
| CorporateAccount | CorporateContact | 1:N | `CorporateContact.corporateAccountId` | RESTRICT | CASCADE FK value update generally unnecessary | Child lifecycle managed explicitly |
| CorporateAccount | CorporateContract | 1:N | `CorporateContract.corporateAccountId` | RESTRICT | RESTRICT | Contracts preserved historically |
| CorporateAccount | CorporateParticipant | 1:N | `CorporateParticipant.corporateAccountId` | RESTRICT | RESTRICT | Participant history preserved |
| CorporateAccount | CorporateEnrollment | 1:N | `CorporateEnrollment.corporateAccountId` | RESTRICT | RESTRICT | Provenance must remain traceable |
| CorporateParticipant | CorporateEnrollment | 1:N | `CorporateEnrollment.corporateParticipantId` | RESTRICT | RESTRICT | One participant can have multiple enrollments |
| CorporateContract | CorporateEnrollment | 1:N optional from child | `CorporateEnrollment.contractId` | RESTRICT | RESTRICT | Contract cannot be removed if referenced |

## 6.2 External Relationships

| CTM Entity | External Entity | Cardinality | Owner of External Entity | Delete Rule | Boundary Rule |
|---|---|---|---|---|---|
| CorporateAccount | Organization | N:1 in physical model | Party/Organization | RESTRICT | CTM cannot modify legal identity through account CRUD |
| CorporateContact | Person | N:1 | Party/Person | RESTRICT | Contact relationship does not own Person |
| CorporateParticipant | Person | N:1 | Party/Person | RESTRICT | Participant relationship does not duplicate identity |
| CorporateParticipant | StudentProfile | N:0..1 logically | Admission & Enrollment | RESTRICT | Must reference same Person identity |
| CorporateEnrollment | Enrollment | 1:1 active from CTM association perspective | Admission & Enrollment | RESTRICT | Enrollment lifecycle mutations occur through Enrollment application service |
| Audit columns | User | N:1 references | IAM | RESTRICT/logical retention | User deletion must not erase audit attribution |

## 6.3 N:M Relationships

No direct CTM-owned N:M junction table is approved in the current ER baseline.

Apparent many-to-many business relationships are resolved through existing entities:

- CorporateAccount ↔ Person as contacts → `CorporateContact`;
- CorporateAccount ↔ Person as participants → `CorporateParticipant`;
- CorporateParticipant ↔ Enrollment history → `CorporateEnrollment` with one participant to many enrollment links;
- CorporateAccount ↔ Enrollment → `CorporateEnrollment`.

A generic account-course, account-batch, participant-course, or participant-batch junction table must **not** be introduced. Course/Batch membership belongs to Enrollment and Training Delivery boundaries.

---

# 7. Branch-Scoping Model

## 7.1 Source Constraint

The DDD and ER baselines require branch isolation, but the approved CTM tables do not contain a direct `branchId` on `CorporateAccount`, `CorporateContact`, `CorporateContract`, or `CorporateParticipant`.

Therefore, this document does not invent `branchId` columns without an approved model decision.

## 7.2 Current Safe Scoping Rule

Until a direct CorporateAccount-to-Branch association is approved, CTM query authorization must derive operational branch visibility through authoritative relationships, primarily:

```text
CorporateAccount
  → CorporateEnrollment
  → Enrollment.branchId
  → IAM UserBranchAccess
```

For account records with no enrollment yet, safe visibility cannot be inferred from Enrollment. One of the following must be formally approved before implementation:

1. a CTM-owned account-to-branch assignment model;
2. a direct `branchId` or owner branch on CorporateAccount;
3. organization-level branch relationship with explicit ownership semantics;
4. an IAM/data-policy mapping external to CTM.

Until that decision is made, **new account creation and pre-enrollment account visibility are an explicit architecture gap**. Implementers must not default to "all branches" visibility.

## 7.3 Server-Side Scope Rules

Regardless of final model choice:

1. All list, detail, update, export, bulk import, and enrollment orchestration endpoints resolve allowed branch IDs from IAM server-side.
2. A submitted `branchId` is a business selection input only and never proves access.
3. Consolidated viewers must have `canViewConsolidated` or equivalent explicit IAM scope.
4. Parent/child branch visibility follows Organization/IAM policy, not UI assumptions.
5. Bulk imports validate every row against the resolved account and branch scope.
6. Cross-context Enrollment reads must include authorized `Enrollment.branchId` predicates.
7. Reports must use scoped read models and cannot bypass transaction-table scope filters.

---

# 8. CRUD Matrix

## 8.1 Actor Definitions

| Actor | Type | Scope Summary |
|---|---|---|
| CTM Administrator | Human | Broad CTM administration within assigned branch/data scope; global only with explicit grant |
| Corporate Account Manager | Human | Account/contact/contract operations for assigned accessible accounts |
| Corporate Training Coordinator | Human | Participant roster, import, enrollment orchestration, operational tracking |
| Branch Manager | Human | Branch-scoped oversight and selected approvals/status transitions |
| Finance User | Human, external context | Read CTM references needed for finance; no CTM master mutation by default |
| Trainer | Human, portal | Read assigned roster/training context through projection; no CTM entity CRUD |
| Student/Participant | Human, portal | Read own corporate training association/projection only; no CTM master CRUD |
| Corporate Contact/Portal User | Human, external portal where enabled | Read account-scoped training/invoice/certificate views and submit allowed nomination requests only after model approval |
| CTM Application Service | System | Creates/updates CTM records under authenticated command context |
| Enrollment Application Service | System, external context | Owns Enrollment and returns authoritative enrollment result; CTM may create association after success |
| Finance Integration/Application Service | System, external context | Supplies credit validation and billing truth/projections |
| Reporting Read Model Builder | System | Read CTM source data under service policy; writes only Reporting-owned projections |
| Audit Service | System | Consumes/records sensitive-action audit data in Audit context |

### Action Codes

- **C** – Create
- **R** – Read
- **U** – Update
- **D\*** – Soft delete/deactivate only; never hard delete
- **T** – Lifecycle transition action
- **X** – No direct action
- **Rᵖ** – Read through projection/read model only
- **Uˢ** – System-controlled update only

## 8.2 Human Actor CRUD Matrix

| Human Actor | CorporateAccount | CorporateContact | CorporateContract | CorporateParticipant | CorporateEnrollment | Branch/Data Scope Logic |
|---|---|---|---|---|---|---|
| CTM Administrator | C,R,U,D\*,T | C,R,U,D\*,T | C,R,U,D\*,T | C,R,U,D\*,T | C,R,U,D\*,T subject to orchestration | Assigned accessible scope; consolidated/global requires explicit IAM grant |
| Corporate Account Manager | C,R,U,T; D\* only with elevated permission | C,R,U,D\*,T | C,R,U,T; termination/delete restricted | R; C/U if separately granted | R | Only accounts assigned/visible in resolved scope; cannot use client filter to expand scope |
| Corporate Training Coordinator | R | R | R | C,R,U,D\*,T; bulk import if permitted | C,R,U,T through approved orchestration | Account + branch scope validated server-side per operation and per bulk row |
| Branch Manager | R,T approval/status actions | R | R,T approval/status actions where granted | R,T suspension/reactivation where granted | R,T hold/release coordination where granted | Own branch and approved child branches only; no parent/global access by default |
| Finance User | Rᵖ | X | Rᵖ | Rᵖ | Rᵖ | Finance-owned screens/services receive minimum CTM references; no direct CTM writes |
| Trainer | Rᵖ limited account label if required | X | X | Rᵖ assigned participants only | Rᵖ assigned batch/session roster only | Derived from Trainer assignment + Session/Batch ownership; not CTM account-wide scope |
| Student/Participant | Rᵖ own corporate label only | X | X | Rᵖ own record only | Rᵖ own enrollment linkage only | Person/User-to-StudentProfile ownership match plus Enrollment scope |
| Corporate Contact Portal User | Rᵖ own account | Rᵖ own/self + authorized account contacts where policy allows | Rᵖ summarized applicable contracts | Rᵖ account participants only if privacy policy and permission allow | Rᵖ account training status | CorporateAccount relationship + IAM portal grant; no cross-account visibility |

## 8.3 System Actor CRUD Matrix

| System Actor | CorporateAccount | CorporateContact | CorporateContract | CorporateParticipant | CorporateEnrollment | Rules |
|---|---|---|---|---|---|---|
| CTM Application Service | C,R,U,D\*,T | C,R,U,D\*,T | C,R,U,D\*,T | C,R,U,D\*,T | C,R,U,D\*,T | Acts only under authenticated command/service principal and domain invariants |
| Enrollment Application Service | R minimum reference | X | R applicability input only | R identity/linkage input only | X direct by default | Owns Enrollment; should not write CTM tables unless an explicit module contract delegates association creation |
| Finance Application Service | R minimum account reference | X | R billing terms | R minimum customer linkage | R; Uˢ billing projection/status only through explicit contract | Finance truth cannot be overwritten by CTM user commands |
| Reporting Read Model Builder | R | R | R | R | R | Read-only source access; writes Reporting-owned tables, not CTM entities |
| Audit Service | R metadata when resolving references | X | X | X | X | Writes Audit-owned AuditLog; does not mutate CTM transaction tables |
| Notification Service | R minimum recipient/context projection | R minimum recipient/contact projection | R expiry/reminder context | R minimum participant context | R status context | Reads through application/query contract; no CTM writes |
| Document Service | R owner reference validation | R reference only if allowed | R reference for contract documents | R owner validation | R linkage context | Owns Document and verification tables; no CTM document columns/tables |

---

# 9. Operation-Level CRUD and Permission Mapping

| Entity | Operation | Minimum Permission Family | Additional Guard |
|---|---|---|---|
| CorporateAccount | Create | `corporate-training.account.create` | Valid Organization; scope assignment resolved |
| CorporateAccount | Read | `corporate-training.account.read` | Scoped account visibility |
| CorporateAccount | Update | `corporate-training.account.update` | Version match; immutable fields protected |
| CorporateAccount | Status transition | `corporate-training.account.status.change` | Transition matrix + dependency check + reason |
| CorporateAccount | Soft delete | `corporate-training.account.delete` | No unsafe dependency; elevated permission; audit |
| CorporateContact | Create | `corporate-training.contact.create` | Account active/in scope; Person resolved |
| CorporateContact | Read | `corporate-training.contact.read` | Inherit account scope |
| CorporateContact | Update | `corporate-training.contact.update` | Version; primary-contact invariant |
| CorporateContact | Soft delete/deactivate | `corporate-training.contact.delete` | Preserve Person; preserve audit/history |
| CorporateContract | Create | `corporate-training.contract.create` | Account active/in scope |
| CorporateContract | Read | `corporate-training.contract.read` | Inherit account scope |
| CorporateContract | Update | `corporate-training.contract.update` | State-dependent mutability + version |
| CorporateContract | Approve/activate | `corporate-training.contract.approve` | Validity and approval rules |
| CorporateContract | Suspend/terminate | `corporate-training.contract.status.change` | Reason + downstream impact assessment |
| CorporateParticipant | Create | `corporate-training.participant.create` | Person resolved; duplicate check |
| CorporateParticipant | Import | `corporate-training.participant.import` | Row-level validation + account scope |
| CorporateParticipant | Read | `corporate-training.participant.read` | Inherit account scope |
| CorporateParticipant | Update | `corporate-training.participant.update` | Identity references immutable except controlled reconciliation |
| CorporateParticipant | Deactivate | `corporate-training.participant.status.change` | Historical links preserved |
| CorporateEnrollment | Create link | `corporate-training.enrollment.create` | Enrollment command succeeded; all cross-context invariants pass |
| CorporateEnrollment | Read | `corporate-training.enrollment.read` | Account + Enrollment branch scope |
| CorporateEnrollment | Billing status update | service contract or `corporate-training.billing.coordinate` | Finance authoritative result required |
| CorporateEnrollment | Soft-delete erroneous link | `corporate-training.enrollment.correct` | Elevated permission; reason; integrity review; audit |

---

# 10. Cross-Context Reference Inventory

The following entities are referenced by CTM but **must not be recreated as CTM-owned tables**.

| External Entity | Owning Context | CTM Use | Mutation Rule |
|---|---|---|---|
| `Party` | Shared Party/identity model | Base polymorphic identity concept | No direct CTM mutation except through owner API/service |
| `Organization` | Organization/Party | Legal corporate identity for CorporateAccount | CTM references; legal identity updates through owning context |
| `Person` | Shared Party/Person | Identity for contacts and participants | Resolve/reuse through owner service; never duplicate |
| `StudentProfile` | Admission & Enrollment | Link participant to student role | Create/link through Enrollment/Student application service |
| `Enrollment` | Admission & Enrollment | Central learning transaction | CTM orchestrates; owner validates and persists |
| `Course` | Course Catalog | Enrollment course selection/reference | Read published/applicable course; no CTM CRUD |
| `CoursePricing` | Course Catalog | Pricing-resolution input | Read/resolve through Course Catalog service |
| `CourseDiscount` | Course Catalog | Discount-resolution input | Read/resolve through Course Catalog service |
| `CourseCompletionRule` | Course Catalog | Read-only completion rule definition | No CTM mutation or reimplementation |
| `Batch` | Training Delivery | Batch selection and delivery status | No CTM mutation except via owner use case if authorized |
| `Session` | Training Delivery | Training schedule/status projection | Read-only from CTM |
| `BatchTrainer` | Training Delivery | Trainer assignment projection | CTM cannot assign by writing foreign table directly |
| `ScheduleSession` | Scheduling | Conflict/availability validation result | Consume service result |
| `AttendanceRecord` | Attendance | Participant training status projection | Read-only from CTM |
| `Exam`, `Result`, `CourseCompletion` | Exam & Completion | Completion status projection | Read-only from CTM |
| `Certificate` | Certificate | Certificate availability/status | Read-only/link-out from CTM |
| `Invoice`, `Payment`, `Receipt`, `Receivable`, `CorporateCreditRule` | Finance | Billing, settlement, credit visibility | Finance owns writes and calculations |
| `Document`, `DocumentVerification` | Document Management | LPO, nomination list, IDs, contract documents | Upload via Document context with CTM owner reference policy |
| `CommunicationTemplate`, `NotificationRequest`, `NotificationLog` | Communication | Reminder/notification orchestration | CTM requests notification; Communication owns persistence |
| `DashboardDefinition`, `DashboardWidget`, `MetricSnapshot` | Reporting | Corporate dashboards/reports | Reporting owns definitions and snapshots |
| `AuditLog`, `ApprovalRequest`, `ApprovalHistory` | Audit & Compliance | Sensitive action tracking and approval workflows | Audit context owns records |
| `User`, `Role`, `Permission`, `UserBranchAccess` | IAM | Authorization and branch scope | IAM owns all access records |

---

# 11. Entities That Must Not Exist in CTM

The following duplicate or misplaced tables are explicitly prohibited.

| Prohibited CTM Table/Model | Reason | Correct Owner/Pattern |
|---|---|---|
| `CorporateStudent` | Duplicates StudentProfile/Person and violates enrollment-centric model | `Person` + `CorporateParticipant` + `StudentProfile` + `Enrollment` |
| `CorporateCourseEnrollment` separate from CorporateEnrollment/Enrollment | Duplicates central Enrollment | Admission & Enrollment owns `Enrollment`; CTM owns only CorporateEnrollment linkage |
| `CorporateBatch` | Duplicates Training Delivery Batch | `Batch` owned by Training Delivery |
| `CorporateSession` | Duplicates Session/ScheduleSession | Training Delivery / Scheduling |
| `CorporateAttendance` | Duplicates AttendanceRecord | Attendance context |
| `CorporateResult` | Duplicates Result | Exam & Completion |
| `CorporateCompletion` | Duplicates CourseCompletion | Exam & Completion |
| `CorporateCertificate` | Duplicates Certificate | Certificate context |
| `CorporateInvoice` CTM table | Duplicates Finance Invoice | Finance Invoice with `corporateAccountId` |
| `CorporatePayment` | Duplicates Payment | Finance |
| `CorporateReceipt` | Duplicates Receipt | Finance |
| `CorporateReceivable` | Duplicates Receivable | Finance |
| `CorporateDocument` | Duplicates generic Document ownership model | Document Management with appropriate ownerType/ownerId |
| `CorporateNotification` | Duplicates NotificationRequest/Log | Communication |
| `CorporateAuditLog` | Duplicates AuditLog | Audit & Compliance |
| `CorporateRole` / `CorporatePermission` | Duplicates IAM | IAM Role/Permission model |
| `CorporateCoursePrice` | Duplicates CoursePricing hierarchy | Course Catalog |
| `CorporateDiscount` CTM-owned definition | Duplicates CourseDiscount or Finance discount application | Course Catalog defines; Finance applies according to approved rule |

---

# 12. DDD-to-ER Ownership Reconciliation

## 12.1 Fully Aligned Concepts

| Concept | DDD Position | ER Position | Part 4 Decision |
|---|---|---|---|
| CorporateAccount | CTM core entity and aggregate root | Defined | Physical CTM table |
| CorporateContact | CTM aggregate child | Defined | Physical CTM table |
| CorporateContract | CTM aggregate child | Defined | Physical CTM table |
| CorporateParticipant | CTM aggregate child | Defined | Physical CTM table |
| CorporateEnrollment | CTM core entity/linkage | Defined | Physical CTM table |
| Organization identity reuse | Shared Party/Organization | CorporateAccount.organizationId | FK/reference only |
| Person identity reuse | Shared Party/Person | Contact/Participant.personId | FK/reference only |
| Participant becomes Student when enrolled | DDD invariant | linkedStudentProfileId + Enrollment relationship | Enforced through application service |
| Corporate linkage retained | DDD invariant | CorporateEnrollment + participant/account links | Persisted in CTM |

## 12.2 DDD Concepts Missing From ER

| DDD Concept | DDD Statement | ER Status | Database Decision |
|---|---|---|---|
| `CorporateDepartment` | Listed as CTM core entity/aggregate child | Not defined | Do not create table; use current text `department` fields only until model approved |
| `CorporateCoordinator` | Listed as CTM core entity | Not defined | Do not create table; CorporateContact may express contact relationship but is not silently reinterpreted as coordinator entity |
| `CorporateTrainingProgram` | Listed as CTM core entity | Not defined | Do not create table; requires aggregate ownership, lifecycle, keys, and relationships |
| Participant Nomination aggregate | DDD responsibility/workflow | No ER entity | Do not create table; nomination upload may be Document-owned evidence only, not durable nomination lifecycle |
| Corporate Portal transactional model | DDD responsibility | No portal-specific entity needed | Use IAM access + CTM/application projections; do not create portal shadow tables |

## 12.3 ER Fields Requiring Ownership Clarification

| Field/Area | Conflict | Required Decision |
|---|---|---|
| CorporateAccount credit fields | Finance owns credit validation and CorporateCreditRule; ER duplicates credit values on account | Decide source-of-truth and synchronization/projection policy |
| CorporateEnrollment.billingStatus | Finance owns invoice/payment truth; ER gives CTM a billing status | Restrict to coordination state and define Finance contract |
| Branch scope | CTM entities lack branch association while global rules require branch isolation | Approve account-to-branch ownership model before implementation |
| CorporateContact lifecycle status | Parts 1–2 require active/inactive behavior but ER field list lacks `status` | Update ER/Prisma or revise lifecycle behavior |

---

# 13. Referential Action Rules

## 13.1 General Policy

1. **No `ON DELETE CASCADE`** from Party, Organization, Person, StudentProfile, Enrollment, CorporateAccount, Contract, or Participant into CTM operational history.
2. Parent deletion attempts must be blocked by `RESTRICT` where historical relationships exist.
3. Business removal uses status transition and soft delete.
4. Cross-context foreign keys may be physical database FKs in a modular monolith if the architecture permits, but module code must still mutate through owning application services rather than direct repository access.
5. Primary identifiers are immutable; FK `ON UPDATE CASCADE` is unnecessary under immutable-ID policy.

## 13.2 Dependency-Sensitive Soft Delete

### CorporateAccount

May be soft-deleted only under elevated controlled action and only after checking:

- non-terminal contracts;
- active participants where policy blocks deletion;
- active/current corporate enrollments;
- Finance obligations or receivables;
- required retention obligations.

Ordinarily, `CLOSED` status is preferred over deletion for a historical customer relationship.

### CorporateContract

A referenced contract cannot be physically deleted. Soft deletion is only appropriate for erroneous draft data with no dependent business history. Active/historical contracts should transition to `TERMINATED`, `EXPIRED`, or `CLOSED`.

### CorporateParticipant

A participant with CorporateEnrollment history should be deactivated, not deleted. Soft delete is reserved for controlled correction of erroneous duplicate relationships after identity reconciliation.

### CorporateEnrollment

Deletion is exceptional. An erroneous association correction requires:

- elevated permission;
- reason;
- version check;
- confirmation that the external Enrollment is not being deleted;
- AuditLog entry;
- compensating correction of any affected read models.

---

# 14. Transaction Boundaries and Concurrency

## 14.1 Local CTM Transactions

The following operations should be atomic within the CTM database transaction boundary:

- CorporateAccount creation plus CTM-owned initial child setup, if any;
- primary contact switch within one CorporateAccount;
- participant import commit for each atomic batch policy;
- participant status transition and local audit-event handoff record according to architecture convention;
- CorporateEnrollment link creation after authoritative Enrollment success is confirmed.

## 14.2 Cross-Context Orchestration

Because this is a modular monolith and not event-sourced/CQRS by default, orchestration should use explicit application-service calls and database transactions where safe. However, ownership boundaries must remain visible.

Example corporate enrollment orchestration:

```text
1. Authorize CTM command and resolve branch scope.
2. Load CTM CorporateAccount, CorporateParticipant and applicable Contract.
3. Query Course Catalog for course/pricing applicability.
4. Query Training Delivery/Scheduling for batch feasibility.
5. Request Finance credit validation.
6. Invoke Admission & Enrollment application service to create/confirm Enrollment.
7. Create CTM CorporateEnrollment link using returned Enrollment ID.
8. Record correlated audit information.
9. Request downstream notifications/read-model refresh as architecture permits.
```

The browser must never perform these checks independently and then submit an assumed-valid result.

## 14.3 Optimistic Locking

All updates include `expectedVersion` and execute equivalent logic:

```sql
UPDATE ...
SET ..., version = version + 1
WHERE id = :id
  AND version = :expectedVersion
  AND is_deleted = false;
```

Zero affected rows produce a deterministic concurrency conflict, not a silent overwrite.

---

# 15. Bulk Import Persistence Rules

The current approved ER does not define durable import staging tables. Therefore:

- this Part 4 does not invent `CorporateParticipantImport`, `ImportBatch`, or `ImportRow` tables;
- validation may be performed using transient application processing or an infrastructure job artifact, subject to architecture design;
- only validated final `CorporateParticipant` records are CTM domain persistence;
- import file storage, where required, belongs to Document Management or approved infrastructure storage policy;
- row-level error persistence requires a separate architecture decision if retry/resume/audit retention is required.

For every committed row:

1. resolve account and scope;
2. normalize identity fields;
3. resolve or create Person through owning application service;
4. detect active account-person duplicate;
5. detect employee-code conflict within account;
6. create/link participant idempotently;
7. audit created/linked/rejected outcome according to batch audit design.

---

# 16. Read Models and Query Projections

Part 3 defines Corporate Account 360, participant training history, trainer roster views, student self views, and finance/certificate status visibility. These should not cause denormalized transactional columns to be added to CTM tables merely for UI convenience.

Recommended read-model composition areas include:

- Corporate Account 360 summary;
- participant enrollment/training status;
- attendance percentage/status;
- completion status;
- certificate status/link;
- invoice/outstanding summary;
- batch/session/trainer details;
- branch performance summary.

Ownership rule:

```text
Transactional source remains in owning context.
CTM query service may compose read-only responses.
Reporting context may own persisted reporting projections/snapshots.
CTM must not become the owner of copied financial, attendance, completion, or certificate truth.
```

---

# 17. Security and Audit Data Requirements

## 17.1 Sensitive Fields and Access

| Data | Sensitivity | Rule |
|---|---|---|
| Person linkage | PII reference | Return only necessary person fields for authorized use case |
| Participant employee code | Business personal data | Account/branch scope enforced |
| Contact email/phone | Contact PII | Mask/export only according to permission |
| Contract value/payment terms | Commercially sensitive | Contract read permission required; portal exposure minimized |
| Credit fields | Financially sensitive | Finance/CTM privileged access only; no trainer/student exposure |
| Billing status | Financial operational data | Scoped read; changes service-controlled where derived from Finance |

## 17.2 Mandatory Audit Actions

Audit records are owned by Audit & Compliance, but CTM commands must emit/record sufficient correlated data for:

- account creation and sensitive update;
- account suspension, closure, and soft delete;
- primary-contact change;
- portal-access flag change;
- contract creation, approval, activation, suspension, termination, closure;
- participant create/import, identity link, StudentProfile linkage, suspension/deactivation, duplicate reconciliation;
- CorporateEnrollment link creation/correction/deletion;
- billing coordination status changes;
- denied attempts at cross-branch access to sensitive resources where security policy requires;
- bulk export of personal/commercial data.

Audit data should include actor, action, entity type, entity ID, old value, new value, timestamp, reason where required, request/correlation ID, and source channel.

---

# 18. Migration and Seed Considerations

1. CorporateAccount records must resolve to existing or migrated Organization IDs.
2. CorporateContact and CorporateParticipant rows must resolve Person identities before import; duplicate matching must not rely solely on name.
3. CorporateParticipant `linkedStudentProfileId` must be populated only after Person consistency is verified.
4. Legacy corporate registrations must map to central Enrollment where training occurred; do not create CTM-only historical course participation records.
5. Contract dates and billing models must be normalized to supported values.
6. Duplicate contract numbers and account codes require deterministic reconciliation before unique constraints are enabled.
7. Existing invoice/payment balances remain Finance migration concerns; CTM must not populate `currentOutstanding` by ad hoc spreadsheet arithmetic without Finance reconciliation.
8. Soft-delete flags default false for validated active migration rows, but closed historical relationships should use domain statuses rather than being marked deleted.

---

# 19. Gap Register Affecting Database Implementation

| Gap ID | Gap | Impact | Required Resolution Before |
|---|---|---|---|
| CTM-DATA-GAP-001 | No CorporateAccount branch assignment model | Cannot safely scope pre-enrollment accounts | Architecture decision required |
| CTM-DATA-GAP-002 | DDD names CorporateDepartment but ER has only department strings | Cannot normalize corporate department/coordinator hierarchy | Deferred |
| CTM-DATA-GAP-003 | DDD names CorporateCoordinator without ER model | Coordinator role/history cannot be persisted explicitly | Deferred |
| CTM-DATA-GAP-004 | DDD names CorporateTrainingProgram but ER lacks it | No approved project/program aggregate or lifecycle | Deferred |
| CTM-DATA-GAP-005 | Nomination workflow lacks persistence model | Cannot implement durable nomination lifecycle/status | Deferred |
| CTM-DATA-GAP-006 | Credit fields overlap CTM ER and Finance CorporateCreditRule | Risk of dual source of truth | Architecture decision required |
| CTM-DATA-GAP-007 | `billingStatus` enum and authority undefined | Risk of duplicate Finance truth | Architecture decision required |
| CTM-DATA-GAP-008 | CorporateContact status absent from ER but lifecycle requires it | Schema mismatch | Architecture decision required |
| CTM-DATA-GAP-009 | Equipment availability/assignment has no approved context model | Cannot persist allocation in CTM | Deferred |
| CTM-DATA-GAP-010 | Travel/accommodation has no approved owner/model | Cannot create CTM tables safely | Deferred |
| CTM-DATA-GAP-011 | Costing/profitability model absent | Cannot persist direct/indirect cost sheet | Deferred |
| CTM-DATA-GAP-012 | GIVT separate module requested operationally but absent from DDD/ER current contexts | Cannot create isolated duplicate training schema | Deferred |

---

# 20. Final Ownership Check Matrix

| Candidate Entity | Classification | Part 4 Decision |
|---|---|---|
| CorporateAccount | **Owned by CTM** | Define and persist |
| CorporateContact | **Owned by CTM** | Define and persist; add lifecycle field only after ER reconciliation |
| CorporateContract | **Owned by CTM** | Define and persist |
| CorporateParticipant | **Owned by CTM** | Define and persist |
| CorporateEnrollment | **Owned by CTM** | Define and persist as association/coordination entity |
| Organization | Referenced, external owner | FK/reference only |
| Person | Referenced, external owner | FK/reference only |
| StudentProfile | Referenced, Admission & Enrollment owner | FK/reference only |
| Enrollment | Referenced, Admission & Enrollment owner | FK/reference only |
| Course | Referenced, Course Catalog owner | No CTM table |
| Batch | Referenced, Training Delivery owner | No CTM table |
| Session | Referenced, Training Delivery owner | No CTM table |
| ScheduleSession | Referenced, Scheduling owner | No CTM table |
| AttendanceRecord | Referenced, Attendance owner | No CTM table |
| Result/CourseCompletion | Referenced, Exam & Completion owner | No CTM table |
| Certificate | Referenced, Certificate owner | No CTM table |
| Invoice/Payment/Receipt/Receivable | Referenced, Finance owner | No CTM table |
| CorporateCreditRule | Referenced, Finance owner | No CTM duplicate |
| Document | Referenced, Document Management owner | No CTM duplicate |
| NotificationRequest/Log | Referenced, Communication owner | No CTM duplicate |
| Dashboard/MetricSnapshot | Referenced, Reporting owner | No CTM duplicate |
| AuditLog/ApprovalHistory | Referenced, Audit owner | No CTM duplicate |
| CorporateDepartment | DDD concept, ER gap | Do not persist until approved |
| CorporateCoordinator | DDD concept, ER gap | Do not persist until approved |
| CorporateTrainingProgram | DDD concept, ER gap | Do not persist until approved |
| CorporateNomination | Workflow/DDD responsibility gap | Do not invent table |
| CorporateTrainingProject | Workflow gap | Do not invent table |
| EquipmentAllocation | Workflow gap | Do not invent CTM table |
| Travel/Accommodation records | Workflow gap | Do not invent CTM table |
| CorporateCostingSheet | Workflow gap | Do not invent table |
| GIVTProject | Workflow gap | Do not invent table |

---

# 21. Appendix – Recommended Prisma Schema Code Snippets

The following concrete Prisma schema models are recommended to implement the database design defined in this Part 4. These models must be added to `packages/database/prisma/schema.prisma`.

```prisma
model CorporateContact {
  id                  String   @id @default(uuid()) @db.Uuid
  corporateAccountId  String   @db.Uuid
  personId            String   @db.Uuid
  designation         String?  @db.VarChar(150)
  department          String?  @db.VarChar(150)
  email               String?  @db.VarChar(320)
  phone               String?  @db.VarChar(32)
  isPrimary           Boolean  @default(false)
  portalAccessEnabled Boolean  @default(false)
  status              String   @default("Active") @db.VarChar(30)
  version             Int      @default(1)

  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  createdBy String?   @db.Uuid
  updatedAt DateTime? @updatedAt @db.Timestamptz(6)
  updatedBy String?   @db.Uuid
  deletedAt DateTime? @db.Timestamptz(6)
  deletedBy String?   @db.Uuid
  isDeleted Boolean   @default(false)

  corporateAccount CorporateAccount @relation(fields: [corporateAccountId], references: [id], onDelete: Restrict)
  person           Person           @relation(fields: [personId], references: [id], onDelete: Restrict)

  @@unique([corporateAccountId, personId])
  @@index([corporateAccountId, status])
  @@index([personId])
  @@map("corporate_contacts")
}

model CorporateContract {
  id                 String    @id @default(uuid()) @db.Uuid
  corporateAccountId String    @db.Uuid
  contractNumber     String    @unique @db.VarChar(80)
  contractValue      Decimal   @db.Decimal(18, 3)
  startDate          DateTime  @db.Date
  endDate            DateTime  @db.Date
  billingModel       String    @db.VarChar(50) // PER_STUDENT, PER_BATCH, PER_HOUR, FIXED_CONTRACT
  paymentTerms       String    @db.Text
  status             String    @default("Draft") @db.VarChar(30)
  version            Int       @default(1)

  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  createdBy String?   @db.Uuid
  updatedAt DateTime? @updatedAt @db.Timestamptz(6)
  updatedBy String?   @db.Uuid
  deletedAt DateTime? @db.Timestamptz(6)
  deletedBy String?   @db.Uuid
  isDeleted Boolean   @default(false)

  corporateAccount CorporateAccount @relation(fields: [corporateAccountId], references: [id], onDelete: Restrict)
  enrollments      CorporateEnrollment[]

  @@index([corporateAccountId, status])
  @@index([startDate, endDate])
  @@map("corporate_contracts")
}

model CorporateParticipant {
  id                     String  @id @default(uuid()) @db.Uuid
  corporateAccountId     String  @db.Uuid
  personId               String  @db.Uuid
  employeeCode           String? @db.VarChar(80)
  department             String? @db.VarChar(150)
  designation            String? @db.VarChar(150)
  linkedStudentProfileId String? @db.Uuid
  status                 String  @default("Active") @db.VarChar(30)
  version                Int     @default(1)

  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  createdBy String?   @db.Uuid
  updatedAt DateTime? @updatedAt @db.Timestamptz(6)
  updatedBy String?   @db.Uuid
  deletedAt DateTime? @db.Timestamptz(6)
  deletedBy String?   @db.Uuid
  isDeleted Boolean   @default(false)

  corporateAccount CorporateAccount @relation(fields: [corporateAccountId], references: [id], onDelete: Restrict)
  person           Person           @relation(fields: [personId], references: [id], onDelete: Restrict)
  studentProfile   StudentProfile?  @relation(fields: [linkedStudentProfileId], references: [id], onDelete: Restrict)
  enrollments      CorporateEnrollment[]

  @@unique([corporateAccountId, personId])
  @@index([corporateAccountId, status])
  @@index([personId])
  @@index([linkedStudentProfileId])
  @@map("corporate_participants")
}

model CorporateEnrollment {
  id                     String  @id @default(uuid()) @db.Uuid
  corporateAccountId     String  @db.Uuid
  corporateParticipantId String  @db.Uuid
  enrollmentId           String  @db.Uuid
  contractId             String? @db.Uuid
  billingStatus          String  @default("NotRequested") @db.VarChar(50)
  version                Int     @default(1)

  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  createdBy String?   @db.Uuid
  updatedAt DateTime? @updatedAt @db.Timestamptz(6)
  updatedBy String?   @db.Uuid
  deletedAt DateTime? @db.Timestamptz(6)
  deletedBy String?   @db.Uuid
  isDeleted Boolean   @default(false)

  corporateAccount CorporateAccount     @relation(fields: [corporateAccountId], references: [id], onDelete: Restrict)
  participant      CorporateParticipant @relation(fields: [corporateParticipantId], references: [id], onDelete: Restrict)
  enrollment       Enrollment           @relation(fields: [enrollmentId], references: [id], onDelete: Restrict)
  contract         CorporateContract?   @relation(fields: [contractId], references: [id], onDelete: Restrict)

  @@unique([enrollmentId])
  @@index([corporateAccountId, billingStatus])
  @@index([corporateParticipantId])
  @@index([contractId])
  @@map("corporate_enrollments")
}
```

---

# 22. DDD and ER Consistency Conclusion

This Part 4 remains consistent with the current architecture baseline by limiting CTM-owned persistence to the five models explicitly defined in the ER Model: `CorporateAccount`, `CorporateContact`, `CorporateContract`, `CorporateParticipant`, and `CorporateEnrollment`.

The database design preserves the DDD aggregate boundary around CorporateAccount and prevents CTM from becoming the owner of Enrollment, Course, Batch, Attendance, Completion, Certificate, Finance, Document, Notification, Reporting, Audit, or IAM data.

The most significant implementation decision is **branch scope for corporate records before an Enrollment exists**. Because no approved CTM entity currently carries a branch relation, this remains an architecture decision gate before production CRUD is implemented. The next most important reconciliation items are credit ownership, CorporateEnrollment billing-status authority, CorporateContact lifecycle state, and missing DDD concepts such as CorporateTrainingProgram and Nomination.

No table in this document should be added to the Prisma schema until these explicit gaps are either resolved or formally accepted with a documented implementation policy.
