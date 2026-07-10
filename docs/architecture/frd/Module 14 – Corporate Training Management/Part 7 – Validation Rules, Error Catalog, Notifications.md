# Part 7 – Validation Rules, Error Catalog, Notifications

## Module 14 – Corporate Training Management

## Document Control

| Field | Value |
|---|---|
| Module | Module 14 – Corporate Training Management |
| Module Code | CTM |
| Owning Bounded Context | Corporate Training Management |
| Architecture Style | Next.js monorepo modular monolith |
| Validation Strategy | Layered validation: transport schema + application rules + aggregate invariants + delegated owner validation |
| Notification Strategy | CTM emits domain/application events; Communication & Notification Management owns template rendering and delivery |
| Source Baselines | DDD Context Map v3.0; ER Model v3.0; ASTI ERP Workflow; Module 14 Overview; Parts 1–6 |
| Status | Draft for review |

---

# 1. Purpose

This document defines:

1. custom validation schemas for Corporate Training Management;
2. business validation rules and rule ownership;
3. structured error codes;
4. domain and application events that may trigger notifications;
5. notification payload requirements;
6. retry, idempotency, and audit expectations for notification requests;
7. a validation ownership comparison matrix showing whether each rule is:
   - owned and enforced by CTM;
   - delegated to another bounded context;
   - shared-kernel/transport-only;
   - currently blocked by an unresolved DDD/ER gap.

The central principle is:

> CTM validates only rules for data and invariants it owns. Rules owned by another bounded context are invoked through that context's application boundary and are not reimplemented in CTM.

---

# 2. Validation Architecture

## 2.1 Validation Layers

```text
HTTP Request / Server Action
        |
        v
Transport Schema Validation
(Zod: shape, type, enum, basic length/range)
        |
        v
Authentication + Permission + Scope Validation
(IAM + server-side branch/account/self scope)
        |
        v
CTM Application Validation
(use-case preconditions, uniqueness, lifecycle guards)
        |
        v
CTM Aggregate Invariant Validation
(account, contact, contract, participant, corporate-enrollment linkage)
        |
        v
Delegated Validation Calls
(Organization, Person/Party, Course Catalog, Training Delivery,
Scheduling, Finance, Admission & Enrollment, Documents)
        |
        v
Transactional Persistence
        |
        v
Domain/Application Event Publication
        |
        v
Notification Request to Communication Context
```

---

# 3. Validation Conventions

## 3.1 Required Conventions

All schemas and services must follow these rules:

- trim leading/trailing spaces from human-entered text;
- normalize empty strings to `undefined` for optional fields;
- use ISO 8601 dates in API contracts;
- use IANA timezone-aware timestamps in persistence/application services;
- use Oman business timezone defaults from Configuration;
- do not trust client-supplied branch or ownership scope;
- do not accept hidden form fields as authorization evidence;
- use optimistic concurrency for mutable CTM aggregates;
- preserve historical links during soft-delete/deactivation;
- validate enums server-side;
- reject unknown payload fields for sensitive mutation commands where practical;
- normalize emails to lowercase for comparison;
- normalize phone numbers using an approved shared phone normalization helper;
- use shared money/date primitives for structural validation only;
- business ownership must remain in the bounded context that owns the invariant.

---

# 4. Custom Business Validation Schemas

The schemas below are logical TypeScript/Zod contracts. Names may be adapted to repository naming conventions, but validation behavior must remain equivalent.

---

## 4.1 Shared CTM Value Schemas

```ts
import { z } from "zod";

export const EntityIdSchema = z.string().min(1).max(64);

export const VersionSchema = z.number().int().positive();

export const NonBlankTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(500);

export const ShortCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(50)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/);

export const EmailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());

export const PhoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(25)
  .regex(/^[+0-9()\-.\s]+$/);

export const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/);

export const CurrencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/);

export const MoneyAmountSchema = z
  .number()
  .finite()
  .nonnegative()
  .max(999_999_999_999.999);

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});
```

### Ownership

These are shared-kernel structural schemas only. They do not encode CTM business ownership.

---

## 4.2 Corporate Account Create Schema

```ts
export const CreateCorporateAccountSchema = z.object({
  organizationId: EntityIdSchema,
  accountCode: ShortCodeSchema,
  accountName: z.string().trim().min(2).max(200),
  industry: z.string().trim().max(120).optional(),
  billingCycle: z.enum([
    "IMMEDIATE",
    "WEEKLY",
    "MONTHLY",
    "MILESTONE",
    "CONTRACT_DEFINED",
  ]),
  blockOnCreditLimit: z.boolean(),
  branchContextId: EntityIdSchema.optional(),
});
```

### CTM Business Validations

1. `organizationId` must resolve to an Organization of type `CORPORATE`.
2. One active CorporateAccount may not be duplicated for the same Organization where policy requires one account per corporate organization.
3. `accountCode` must be unique among non-deleted CTM accounts.
4. `accountName` must not be blank after normalization.
5. Branch assignment must follow the approved Account-to-Branch model once that gap is resolved.
6. Credit exposure values must not be client-authored if Finance is confirmed as authoritative.

---

## 4.3 Corporate Account Update Schema

```ts
export const UpdateCorporateAccountSchema = z.object({
  accountName: z.string().trim().min(2).max(200).optional(),
  industry: z.string().trim().max(120).nullable().optional(),
  billingCycle: z.enum([
    "IMMEDIATE",
    "WEEKLY",
    "MONTHLY",
    "MILESTONE",
    "CONTRACT_DEFINED",
  ]).optional(),
  blockOnCreditLimit: z.boolean().optional(),
  version: VersionSchema,
});
```

### Rules

- `organizationId` and immutable account identity fields cannot be changed through normal update.
- stale versions return concurrency conflict.
- lifecycle status transition must use dedicated commands.

---

## 4.4 Corporate Contact Schema

```ts
export const UpsertCorporateContactSchema = z.object({
  corporateAccountId: EntityIdSchema,
  personId: EntityIdSchema,
  designation: z.string().trim().max(120).optional(),
  department: z.string().trim().max(120).optional(),
  email: EmailSchema.optional(),
  phone: PhoneSchema.optional(),
  isPrimary: z.boolean().default(false),
  portalAccessEnabled: z.boolean().default(false),
});
```

### Rules

1. Account must exist and be accessible.
2. Person must exist in Person/Party owner context.
3. Duplicate active contact link for the same `(corporateAccountId, personId)` is prohibited.
4. At most one active primary contact per CorporateAccount.
5. Enabling portal access requires future portal/auth policy approval.
6. Changing primary contact must be atomic.

---

## 4.5 Corporate Contract Create Schema

```ts
export const CreateCorporateContractSchema = z.object({
  corporateAccountId: EntityIdSchema,
  contractNumber: ShortCodeSchema,
  contractValue: MoneyAmountSchema,
  currency: CurrencyCodeSchema.default("OMR"),
  startDate: DateOnlySchema,
  endDate: DateOnlySchema,
  billingModel: z.enum([
    "PER_STUDENT",
    "PER_BATCH",
    "PER_HOUR",
    "FIXED_CONTRACT",
  ]),
  paymentTerms: z.string().trim().min(1).max(2000),
  status: z.enum(["DRAFT"]).default("DRAFT"),
}).superRefine((value, ctx) => {
  if (value.endDate < value.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "Contract end date must be on or after start date",
    });
  }
});
```

### Rules

1. CorporateAccount must exist and be active enough to accept a contract.
2. `contractNumber` must be unique among non-deleted contracts.
3. `endDate >= startDate`.
4. Contract value must be non-negative.
5. Contract activation must use lifecycle command and separate validation.
6. Effective overlap may be allowed or prohibited depending on approved commercial policy; if prohibited, check overlapping active contracts for the same account.
7. Payment terms are CTM contract data, but invoice due-date computation remains Finance-owned.

---

## 4.6 Contract Status Transition Schema

```ts
export const TransitionCorporateContractSchema = z.object({
  toStatus: z.enum([
    "ACTIVE",
    "SUSPENDED",
    "EXPIRED",
    "TERMINATED",
  ]),
  reason: z.string().trim().min(3).max(1000),
  version: VersionSchema,
});
```

### Transition Validations

- transition must be present in approved state-transition matrix;
- activation requires valid date range;
- terminated contracts cannot be reactivated unless Part 2 state machine explicitly permits it;
- expired transition may be system-triggered based on date;
- reason is mandatory for suspension and termination;
- stale version is rejected.

---

## 4.7 Corporate Participant Create Schema

```ts
export const CreateCorporateParticipantSchema = z.object({
  corporateAccountId: EntityIdSchema,
  personId: EntityIdSchema,
  employeeCode: z.string().trim().min(1).max(100).optional(),
  department: z.string().trim().max(120).optional(),
  designation: z.string().trim().max(120).optional(),
});
```

### Rules

1. CorporateAccount must exist and be accessible.
2. Person must exist.
3. Duplicate active `(corporateAccountId, personId)` relationship is prohibited.
4. Duplicate `employeeCode` within the same CorporateAccount should be prohibited when supplied.
5. A person may be a participant for different CorporateAccounts over time.
6. A person moving to another employer must not cause Person duplication.
7. Historical CorporateParticipant links must be preserved.
8. StudentProfile creation/linking is not performed by this command unless an approved enrollment flow requires it through Admission & Enrollment.

---

## 4.8 Corporate Participant Bulk Import Schemas

### Upload Metadata

```ts
export const ParticipantImportUploadSchema = z.object({
  corporateAccountId: EntityIdSchema,
  fileName: z.string().trim().min(1).max(255),
  fileSizeBytes: z.number().int().positive().max(25 * 1024 * 1024),
  contentType: z.enum([
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]),
  idempotencyKey: z.string().trim().min(8).max(128),
});
```

### Normalized Row

```ts
export const ParticipantImportRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  firstName: z.string().trim().min(1).max(100),
  middleName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().min(1).max(100),
  civilId: z.string().trim().min(3).max(100).optional(),
  passportNumber: z.string().trim().min(3).max(100).optional(),
  nationality: z.string().trim().max(100).optional(),
  primaryEmail: EmailSchema.optional(),
  primaryPhone: PhoneSchema.optional(),
  employeeCode: z.string().trim().max(100).optional(),
  department: z.string().trim().max(120).optional(),
  designation: z.string().trim().max(120).optional(),
}).superRefine((row, ctx) => {
  if (!row.civilId && !row.passportNumber && !row.primaryEmail && !row.primaryPhone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one approved identity matching attribute is required",
    });
  }
});
```

### Bulk Validation Rules

- file type and size;
- valid headers;
- duplicate rows within file;
- duplicate employee code within account;
- person identity matching through Person/Party owner;
- existing CTM participant link;
- ambiguous identity matches must not auto-merge;
- row-level errors must be reported with row number and field path;
- commit allowed only for rows in valid state;
- idempotency key must prevent duplicate commit;
- partial commit behavior must be explicit:
  - recommended default: valid rows commit, invalid rows remain rejected;
  - transaction chunking must preserve deterministic result summary.

---

## 4.9 Single Corporate Enrollment Orchestration Schema

```ts
export const CreateCorporateEnrollmentSchema = z.object({
  corporateParticipantId: EntityIdSchema,
  contractId: EntityIdSchema.optional(),
  courseId: EntityIdSchema,
  batchId: EntityIdSchema,
  requestedBranchId: EntityIdSchema,
  idempotencyKey: z.string().trim().min(8).max(128),
  expectedPricingPreviewToken: z.string().trim().min(1).optional(),
});
```

### CTM-Owned Validations

- CorporateParticipant exists;
- participant belongs to CorporateAccount in route/command context;
- participant is active;
- contract, if provided, belongs to same CorporateAccount;
- contract lifecycle permits use;
- no duplicate CTM CorporateEnrollment link for the same created Enrollment;
- idempotency key not previously committed with different payload.

### Delegated Validations

- Course exists and is enrollable: Course Catalog;
- Batch belongs to Course and is open: Training Delivery;
- Batch capacity: Training Delivery;
- schedule feasibility: Scheduling where required;
- pricing resolution: Course Catalog;
- corporate credit validation: Finance;
- Enrollment invariants and creation: Admission & Enrollment;
- StudentProfile create/link: Admission & Enrollment using Person/Party reference.

---

## 4.10 Bulk Corporate Enrollment Schema

```ts
export const BulkCorporateEnrollmentSchema = z.object({
  corporateAccountId: EntityIdSchema,
  corporateParticipantIds: z.array(EntityIdSchema).min(1).max(500),
  contractId: EntityIdSchema.optional(),
  courseId: EntityIdSchema,
  batchId: EntityIdSchema,
  requestedBranchId: EntityIdSchema,
  idempotencyKey: z.string().trim().min(8).max(128),
});
```

### Rules

- duplicate IDs in input are rejected or deduplicated deterministically before execution;
- all participants must belong to same CorporateAccount;
- invalid/inactive participants fail row validation;
- batch capacity must account for all requested seats atomically or according to approved partial-success policy;
- recommended default for enrollment orchestration: validation phase returns full result, commit phase only proceeds after explicit confirmation;
- owner services remain authoritative.

---

## 4.11 Billing Coordination Status Schema

```ts
export const UpdateCorporateEnrollmentBillingStatusSchema = z.object({
  toStatus: z.enum([
    "NOT_REQUESTED",
    "READY_FOR_BILLING",
    "BILLING_REQUESTED",
    "INVOICED",
    "PARTIALLY_SETTLED",
    "SETTLED",
    "ON_HOLD",
    "CANCELLED",
  ]),
  reason: z.string().trim().max(1000).optional(),
  version: VersionSchema,
});
```

### Rules

- CTM billing status is coordination state, not Finance ledger truth;
- `INVOICED`, `PARTIALLY_SETTLED`, and `SETTLED` may only be set after Finance confirms invoice linkage/status;
- `ON_HOLD` requires reason;
- `CANCELLED` cannot erase historical Finance linkage;
- invalid transition returns conflict.

---

## 4.12 Reconciliation Repair Schema

```ts
export const RepairCorporateEnrollmentLinkSchema = z.object({
  corporateEnrollmentId: EntityIdSchema,
  expectedEnrollmentId: EntityIdSchema,
  repairReason: z.string().trim().min(10).max(2000),
  expectedVersion: VersionSchema,
  correlationId: z.string().trim().min(8).max(128),
});
```

### Rules

- user requires reconciliation repair permission;
- current link must be demonstrably inconsistent;
- target Enrollment must exist;
- target Enrollment participant/account relationship must match;
- repair must not create duplicate unique relationship;
- old and new values must be audited;
- repair must be deterministic and idempotent.

---

# 5. Validation Rule Catalog

## 5.1 Corporate Account Rules

| Rule ID | Validation Rule | Enforcement Point | Failure Code |
|---|---|---|---|
| VR-CTM-001 | Organization must exist and be corporate type | Create Account application service + Organization owner | `CTM_ORGANIZATION_NOT_CORPORATE` |
| VR-CTM-002 | Account code required and unique | CTM service + DB unique index | `CTM_ACCOUNT_CODE_DUPLICATE` |
| VR-CTM-003 | Duplicate active CorporateAccount for same Organization prohibited where one-account policy applies | CTM service + DB constraint/index | `CTM_ACCOUNT_ALREADY_EXISTS_FOR_ORGANIZATION` |
| VR-CTM-004 | Account status transition must be allowed | CTM aggregate/application service | `CTM_ACCOUNT_INVALID_STATE_TRANSITION` |
| VR-CTM-005 | Archive is soft-delete only | CTM repository/application service | `CTM_HARD_DELETE_FORBIDDEN` |
| VR-CTM-006 | Account access must satisfy branch/account scope | Authorization middleware/application service | `CTM_ACCOUNT_SCOPE_DENIED` |

## 5.2 Contact Rules

| Rule ID | Validation Rule | Enforcement Point | Failure Code |
|---|---|---|---|
| VR-CTM-010 | Person must exist | Person owner delegation | `CTM_PERSON_NOT_FOUND` |
| VR-CTM-011 | Duplicate active contact link prohibited | CTM service + DB unique index | `CTM_CONTACT_DUPLICATE` |
| VR-CTM-012 | Maximum one active primary contact per account | CTM transaction + partial unique index | `CTM_PRIMARY_CONTACT_ALREADY_EXISTS` |
| VR-CTM-013 | Primary contact reassignment is atomic | CTM transaction | `CTM_PRIMARY_CONTACT_UPDATE_FAILED` |
| VR-CTM-014 | Portal access cannot be enabled without approved portal policy | CTM policy guard | `CTM_PORTAL_ACCESS_POLICY_NOT_ENABLED` |

## 5.3 Contract Rules

| Rule ID | Validation Rule | Enforcement Point | Failure Code |
|---|---|---|---|
| VR-CTM-020 | Contract account must exist | CTM service | `CTM_ACCOUNT_NOT_FOUND` |
| VR-CTM-021 | Contract number must be unique | CTM service + DB | `CTM_CONTRACT_NUMBER_DUPLICATE` |
| VR-CTM-022 | End date must be on/after start date | Zod + CTM domain | `CTM_CONTRACT_DATE_RANGE_INVALID` |
| VR-CTM-023 | Contract value cannot be negative | Zod + DB check | `CTM_CONTRACT_VALUE_INVALID` |
| VR-CTM-024 | Contract transition must be allowed | CTM state machine | `CTM_CONTRACT_INVALID_STATE_TRANSITION` |
| VR-CTM-025 | Suspension/termination requires reason | command schema + CTM service | `CTM_CONTRACT_REASON_REQUIRED` |
| VR-CTM-026 | Contract used for enrollment must belong to same account | CTM orchestration | `CTM_CONTRACT_ACCOUNT_MISMATCH` |
| VR-CTM-027 | Contract used for enrollment must be valid for operational use | CTM lifecycle guard | `CTM_CONTRACT_NOT_USABLE` |

## 5.4 Participant Rules

| Rule ID | Validation Rule | Enforcement Point | Failure Code |
|---|---|---|---|
| VR-CTM-030 | Person must resolve to exactly one approved identity result | Person owner | `CTM_PERSON_MATCH_AMBIGUOUS` |
| VR-CTM-031 | Participant must belong to valid CorporateAccount | CTM service | `CTM_PARTICIPANT_ACCOUNT_INVALID` |
| VR-CTM-032 | Duplicate active account-person participant relationship prohibited | CTM + DB | `CTM_PARTICIPANT_DUPLICATE` |
| VR-CTM-033 | Employee code must be unique within account when provided | CTM + DB | `CTM_EMPLOYEE_CODE_DUPLICATE` |
| VR-CTM-034 | Deactivation preserves history and enrollment links | CTM aggregate | `CTM_PARTICIPANT_HISTORY_PROTECTION` |
| VR-CTM-035 | Inactive participant cannot start new enrollment | CTM orchestration | `CTM_PARTICIPANT_INACTIVE` |

## 5.5 Bulk Import Rules

| Rule ID | Validation Rule | Enforcement Point | Failure Code |
|---|---|---|---|
| VR-CTM-040 | Supported file type required | API schema | `CTM_IMPORT_FILE_TYPE_UNSUPPORTED` |
| VR-CTM-041 | File size within configured maximum | API schema | `CTM_IMPORT_FILE_TOO_LARGE` |
| VR-CTM-042 | Required headers present | import parser | `CTM_IMPORT_HEADER_INVALID` |
| VR-CTM-043 | Each row must include sufficient identity attributes | row schema | `CTM_IMPORT_IDENTITY_INSUFFICIENT` |
| VR-CTM-044 | Duplicate rows within file must be detected | import validator | `CTM_IMPORT_DUPLICATE_ROW` |
| VR-CTM-045 | Ambiguous Person match must not auto-merge | Person owner + CTM import service | `CTM_IMPORT_PERSON_MATCH_AMBIGUOUS` |
| VR-CTM-046 | Commit requires completed validation result | CTM import application service | `CTM_IMPORT_NOT_VALIDATED` |
| VR-CTM-047 | Commit is idempotent | CTM idempotency store | `CTM_IDEMPOTENCY_CONFLICT` |

## 5.6 Enrollment Orchestration Rules

| Rule ID | Validation Rule | Owner | Failure Code |
|---|---|---|---|
| VR-CTM-050 | Participant active and belongs to account | CTM | `CTM_PARTICIPANT_NOT_ELIGIBLE` |
| VR-CTM-051 | Contract belongs to account and is usable | CTM | `CTM_CONTRACT_NOT_USABLE` |
| VR-CTM-052 | Course is valid and enrollable | Course Catalog | `CTM_COURSE_VALIDATION_FAILED` |
| VR-CTM-053 | Batch belongs to requested Course | Training Delivery | `CTM_BATCH_COURSE_MISMATCH` |
| VR-CTM-054 | Batch has capacity | Training Delivery | `CTM_BATCH_CAPACITY_EXCEEDED` |
| VR-CTM-055 | Scheduling feasibility passes | Scheduling | `CTM_SCHEDULE_VALIDATION_FAILED` |
| VR-CTM-056 | Pricing resolves successfully | Course Catalog | `CTM_PRICING_RESOLUTION_FAILED` |
| VR-CTM-057 | Corporate credit validation passes or policy allows warning | Finance | `CTM_CORPORATE_CREDIT_BLOCKED` |
| VR-CTM-058 | StudentProfile creation/link follows Admission rules | Admission & Enrollment | `CTM_STUDENT_PROFILE_LINK_FAILED` |
| VR-CTM-059 | Enrollment creation satisfies Enrollment invariants | Admission & Enrollment | `CTM_ENROLLMENT_CREATION_FAILED` |
| VR-CTM-060 | CTM CorporateEnrollment link created once | CTM | `CTM_CORPORATE_ENROLLMENT_DUPLICATE` |

---

# 6. Validation Ownership Comparison Matrix

| Validation Rule | Classification | Owning Context | CTM Behavior |
|---|---|---|---|
| Account code format | Shared-kernel structural + CTM policy | CTM | Validate locally |
| Account code uniqueness | Module-owned | CTM | Validate locally + DB constraint |
| Organization exists | Delegated | Organization Management | Call owner/read boundary |
| Organization is corporate type | Delegated | Organization Management | Consume authoritative type |
| Account branch authorization | Shared authorization policy + unresolved CTM association | IAM/Organization + CTM policy | Enforce server-side; gap must be resolved |
| Contact email syntax | Shared-kernel only | Shared validation | Validate structurally |
| Contact Person existence | Delegated | Person/Party owner | Resolve through owner |
| One primary contact per account | Module-owned | CTM | Transaction + DB constraint |
| Contract number uniqueness | Module-owned | CTM | Validate locally |
| Contract date ordering | Module-owned | CTM | Validate locally |
| Contract lifecycle transition | Module-owned | CTM | Validate locally |
| Contract billing model enum shape | Module-owned schema | CTM | Validate locally |
| Invoice due date calculation | Delegated | Finance | Never duplicate |
| Participant Person identity uniqueness | Delegated | Person/Party owner | Resolve, do not duplicate identity |
| Participant-account link uniqueness | Module-owned | CTM | Validate locally |
| Employee code uniqueness within account | Module-owned | CTM | Validate locally |
| Oman Civil ID semantic validity | Delegated/configurable identity policy | Person/Party / Configuration | Do not hardcode in CTM |
| Course existence/published/enrollable status | Delegated | Course Catalog | Call owner |
| Pricing hierarchy resolution | Delegated | Course Catalog | Consume resolved price |
| Discount hierarchy resolution | Delegated | Course Catalog | Consume resolved discount |
| Batch belongs to course | Delegated | Training Delivery | Call owner |
| Batch seat capacity | Delegated | Training Delivery | Call owner |
| Trainer availability | Delegated | Faculty/Scheduling | Call owner |
| Classroom availability | Delegated | Scheduling | Call owner |
| Holiday conflict | Delegated | Scheduling/Calendar | Call owner |
| Corporate credit limit | Delegated | Finance & Receivables | Consume pass/warn/block result |
| Enrollment requires Course and Batch | Delegated aggregate invariant | Admission & Enrollment | Owner enforces |
| StudentProfile create/link | Delegated | Admission & Enrollment | Owner command |
| Attendance completion percentage | Delegated | Attendance | Read only |
| Completion eligibility | Delegated | Exam & Completion | Read only |
| Certificate eligibility/issuance | Delegated | Certificate + Completion/Finance inputs | CTM does not calculate |
| Document verification state | Delegated | Document Management | Read approved compliance projection |
| Notification channel format | Delegated | Communication | CTM supplies event/payload only |
| Notification template placeholders | Delegated | Communication | Template owner validates |
| Pagination limits | Shared-kernel only | Shared | Validate structurally |
| UUID/CUID format | Shared-kernel only | Shared | Validate structurally |
| Money amount primitive | Shared-kernel only | Shared | Structural check only |
| Nomination lifecycle | Gap | Not approved | Do not invent validation aggregate |
| Corporate project closure | Gap | Not approved | Do not invent validation aggregate |
| Equipment availability | Gap | Not approved current owner/model | Flag until ownership approved |
| Travel/accommodation costing | Gap | Not approved current owner/model | Flag until ownership approved |

---

# 7. Structured Error Contract

## 7.1 Standard Error DTO

```ts
export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    category:
      | "AUTHENTICATION"
      | "AUTHORIZATION"
      | "VALIDATION"
      | "NOT_FOUND"
      | "CONFLICT"
      | "BUSINESS_RULE"
      | "DEPENDENCY"
      | "CONCURRENCY"
      | "INTERNAL";
    fieldErrors?: Array<{
      field: string;
      code: string;
      message: string;
      rowNumber?: number;
    }>;
    correlationId: string;
    retryable: boolean;
    dependency?: string;
  };
};
```

## 7.2 Error Handling Principles

- stable application codes must be used by UI and tests;
- human-readable message may be localized;
- internal stack traces must never be returned;
- cross-context failure must identify dependency category without exposing internals;
- correlation ID must be present;
- bulk import errors should include row number;
- business conflicts use `409`;
- semantic validation uses `422`;
- authorization uses `403`;
- optimistic concurrency uses `409`;
- retryability must be explicit for dependency/transient failures.

---

# 8. Error Code Catalog

## 8.1 Authentication and Authorization

| Code | HTTP | Meaning | Retryable |
|---|---:|---|---:|
| `AUTHENTICATION_REQUIRED` | 401 | User is not authenticated | No |
| `CTM_PERMISSION_DENIED` | 403 | Required CTM permission missing | No |
| `CTM_BRANCH_SCOPE_DENIED` | 403 | Entity/request outside permitted branch scope | No |
| `CTM_ACCOUNT_SCOPE_DENIED` | 403 | CorporateAccount outside permitted account scope | No |
| `CTM_ENTITY_SCOPE_DENIED` | 403 | Self/assignment/entity scope denied | No |
| `CTM_CONSOLIDATED_SCOPE_DENIED` | 403 | Consolidated reporting not allowed | No |
| `CTM_SENSITIVE_FIELD_DENIED` | 403 | Sensitive field access denied | No |

## 8.2 Account Errors

| Code | HTTP | Meaning |
|---|---:|---|
| `CTM_ACCOUNT_NOT_FOUND` | 404 | CorporateAccount not found in authorized scope |
| `CTM_ACCOUNT_CODE_DUPLICATE` | 409 | Account code already exists |
| `CTM_ACCOUNT_ALREADY_EXISTS_FOR_ORGANIZATION` | 409 | Organization already has active CTM account |
| `CTM_ORGANIZATION_NOT_CORPORATE` | 422 | Referenced Organization is not corporate type |
| `CTM_ACCOUNT_INVALID_STATE_TRANSITION` | 409 | Requested lifecycle transition is not allowed |
| `CTM_ACCOUNT_ARCHIVE_BLOCKED` | 409 | Archive blocked by active dependencies/policy |
| `CTM_HARD_DELETE_FORBIDDEN` | 409 | Hard delete is prohibited |

## 8.3 Contact Errors

| Code | HTTP | Meaning |
|---|---:|---|
| `CTM_CONTACT_NOT_FOUND` | 404 | Contact relation not found |
| `CTM_CONTACT_DUPLICATE` | 409 | Person already linked as active contact |
| `CTM_PRIMARY_CONTACT_ALREADY_EXISTS` | 409 | Another active primary contact already exists |
| `CTM_PRIMARY_CONTACT_UPDATE_FAILED` | 409 | Atomic primary-contact reassignment failed |
| `CTM_PORTAL_ACCESS_POLICY_NOT_ENABLED` | 409 | Portal-access feature/policy not enabled |
| `CTM_PERSON_NOT_FOUND` | 404 | Referenced Person not found |

## 8.4 Contract Errors

| Code | HTTP | Meaning |
|---|---:|---|
| `CTM_CONTRACT_NOT_FOUND` | 404 | Contract not found |
| `CTM_CONTRACT_NUMBER_DUPLICATE` | 409 | Contract number already exists |
| `CTM_CONTRACT_DATE_RANGE_INVALID` | 422 | End date is before start date |
| `CTM_CONTRACT_VALUE_INVALID` | 422 | Contract value invalid |
| `CTM_CONTRACT_INVALID_STATE_TRANSITION` | 409 | Lifecycle transition not allowed |
| `CTM_CONTRACT_REASON_REQUIRED` | 422 | Suspension/termination reason missing |
| `CTM_CONTRACT_ACCOUNT_MISMATCH` | 409 | Contract does not belong to account |
| `CTM_CONTRACT_NOT_USABLE` | 409 | Contract is inactive/expired/suspended/terminated or outside valid dates |

## 8.5 Participant Errors

| Code | HTTP | Meaning |
|---|---:|---|
| `CTM_PARTICIPANT_NOT_FOUND` | 404 | Participant not found |
| `CTM_PARTICIPANT_DUPLICATE` | 409 | Active participant link already exists |
| `CTM_EMPLOYEE_CODE_DUPLICATE` | 409 | Employee code already used in account |
| `CTM_PERSON_MATCH_AMBIGUOUS` | 409 | Person identity resolution returned multiple plausible matches |
| `CTM_PARTICIPANT_INACTIVE` | 409 | Inactive participant cannot start new enrollment |
| `CTM_PARTICIPANT_ACCOUNT_INVALID` | 409 | Participant/account relationship invalid |
| `CTM_PARTICIPANT_HISTORY_PROTECTION` | 409 | Operation would destroy historical relationship |

## 8.6 Import Errors

| Code | HTTP | Meaning |
|---|---:|---|
| `CTM_IMPORT_FILE_TYPE_UNSUPPORTED` | 422 | Unsupported file format |
| `CTM_IMPORT_FILE_TOO_LARGE` | 413 | File exceeds maximum size |
| `CTM_IMPORT_HEADER_INVALID` | 422 | Missing or invalid headers |
| `CTM_IMPORT_ROW_INVALID` | 422 | One or more rows invalid |
| `CTM_IMPORT_IDENTITY_INSUFFICIENT` | 422 | Row lacks sufficient identity attributes |
| `CTM_IMPORT_DUPLICATE_ROW` | 422 | Duplicate row detected |
| `CTM_IMPORT_PERSON_MATCH_AMBIGUOUS` | 409 | Row identity cannot be safely resolved |
| `CTM_IMPORT_NOT_VALIDATED` | 409 | Commit requested before validation completion |
| `CTM_IMPORT_ALREADY_COMMITTED` | 409 | Import already committed |
| `CTM_IDEMPOTENCY_CONFLICT` | 409 | Same idempotency key used with a different payload |

## 8.7 Enrollment Orchestration Errors

| Code | HTTP | Meaning | Owner |
|---|---:|---|---|
| `CTM_PARTICIPANT_NOT_ELIGIBLE` | 409 | CTM participant precondition failed | CTM |
| `CTM_COURSE_VALIDATION_FAILED` | 422/409 | Course not valid for enrollment | Course Catalog |
| `CTM_BATCH_COURSE_MISMATCH` | 409 | Batch is not for requested course | Training Delivery |
| `CTM_BATCH_CAPACITY_EXCEEDED` | 409 | Insufficient seats | Training Delivery |
| `CTM_SCHEDULE_VALIDATION_FAILED` | 409 | Scheduling feasibility failed | Scheduling |
| `CTM_PRICING_RESOLUTION_FAILED` | 409 | Valid price could not be resolved | Course Catalog |
| `CTM_CORPORATE_CREDIT_BLOCKED` | 409 | Finance credit policy blocks enrollment | Finance |
| `CTM_STUDENT_PROFILE_LINK_FAILED` | 409/502 | StudentProfile create/link failed | Admission & Enrollment |
| `CTM_ENROLLMENT_CREATION_FAILED` | 409/502 | Enrollment creation failed | Admission & Enrollment |
| `CTM_CORPORATE_ENROLLMENT_DUPLICATE` | 409 | Duplicate CTM link would be created | CTM |
| `CTM_DEPENDENCY_UNAVAILABLE` | 503 | Required owning context unavailable | Dependency |

## 8.8 Billing and Reconciliation Errors

| Code | HTTP | Meaning |
|---|---:|---|
| `CTM_BILLING_STATUS_INVALID_TRANSITION` | 409 | Invalid CTM coordination transition |
| `CTM_FINANCE_CONFIRMATION_REQUIRED` | 409 | Cannot mark INVOICED/SETTLED without Finance confirmation |
| `CTM_RECONCILIATION_NOT_FOUND` | 404 | Reconciliation case not found |
| `CTM_RECONCILIATION_REPAIR_NOT_ALLOWED` | 409 | Repair conditions not satisfied |
| `CTM_RECONCILIATION_TARGET_INVALID` | 409 | Proposed target Enrollment does not match |
| `CTM_CONCURRENT_MODIFICATION` | 409 | Optimistic lock/version conflict |

---

# 9. Notification Architecture

## 9.1 Ownership Rule

CTM owns the occurrence of CTM domain events.

Communication & Notification Management owns:

- templates;
- placeholder rendering;
- language selection;
- channel selection;
- provider integration;
- send/retry behavior;
- delivery logs.

CTM must not send SMTP, SMS, or WhatsApp directly from aggregate or repository code.

---

# 10. CTM Notification-Producing Events

## 10.1 Event Catalog

| Event | Producer | Typical Notification Audience | Notification Required? |
|---|---|---|---|
| `CorporateAccountCreated` | CTM | CTM Admin / Account Manager | Configurable |
| `CorporateAccountActivated` | CTM | Account Manager | Configurable |
| `CorporateAccountSuspended` | CTM | CTM Admin, Account Manager | Yes for operational users |
| `CorporateContractCreated` | CTM | Account Manager | Configurable |
| `CorporateContractActivated` | CTM | Account Manager, Training Coordinator | Yes |
| `CorporateContractExpiringSoon` | CTM scheduled application job/query | Account Manager | Yes |
| `CorporateContractExpired` | CTM | Account Manager, Training Coordinator | Yes |
| `CorporateContractSuspended` | CTM | Account Manager, Training Coordinator | Yes |
| `CorporateParticipantRegistered` | CTM | Training Coordinator / Corporate Coordinator where enabled | Configurable |
| `CorporateParticipantImportValidated` | CTM | Import initiator | Yes |
| `CorporateParticipantImportCommitted` | CTM | Import initiator / CTM Admin | Yes |
| `CorporateParticipantImportFailed` | CTM | Import initiator | Yes |
| `CorporateEnrollmentRequested` | CTM orchestration | Enrollment Officer / Training Coordinator | Configurable |
| `CorporateEnrollmentCreated` | CTM after owner orchestration success | Training Coordinator / Corporate Coordinator / Participant as configured | Yes |
| `CorporateBulkEnrollmentCompleted` | CTM | Initiator / Training Coordinator | Yes |
| `CorporateBulkEnrollmentPartiallyFailed` | CTM | Initiator / CTM Admin | Yes |
| `CorporateCreditValidationFailed` | Finance event consumed by CTM flow | Account Manager / Finance User | Yes |
| `CorporateEnrollmentBillingReady` | CTM | Finance User | Yes |
| `CorporateEnrollmentBillingOnHold` | CTM | Account Manager / Finance User | Yes |
| `CorporateEnrollmentLinkMismatchDetected` | CTM reconciliation | CTM Admin / Auditor | Yes |
| `CorporateEnrollmentLinkRepaired` | CTM | CTM Admin / Auditor | Yes |

---

# 11. Notification Event Payload Contracts

## 11.1 Common Event Envelope

```ts
export type CtmNotificationEvent<TPayload> = {
  eventId: string;
  eventType: string;
  occurredAt: string;
  aggregateType: string;
  aggregateId: string;
  branchContextId?: string;
  corporateAccountId?: string;
  actorUserId?: string;
  correlationId: string;
  payload: TPayload;
};
```

## 11.2 Contract Expiry Event

```ts
export type CorporateContractExpiringSoonPayload = {
  contractId: string;
  corporateAccountId: string;
  corporateAccountName: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  daysUntilExpiry: number;
  accountManagerUserIds: string[];
};
```

## 11.3 Import Result Event

```ts
export type CorporateParticipantImportResultPayload = {
  importJobId: string;
  corporateAccountId: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  committedRows: number;
  failedRows: number;
  initiatedByUserId: string;
};
```

## 11.4 Enrollment Created Event

```ts
export type CorporateEnrollmentCreatedPayload = {
  corporateEnrollmentId: string;
  enrollmentId: string;
  corporateAccountId: string;
  corporateParticipantId: string;
  courseId: string;
  batchId: string;
  branchId: string;
  contractId?: string;
  participantPersonId: string;
};
```

## 11.5 Credit Failure Event

```ts
export type CorporateCreditValidationFailedPayload = {
  corporateAccountId: string;
  corporateParticipantId?: string;
  requestedEnrollmentValue: number;
  currency: string;
  creditDecision: "BLOCK";
  reasonCode: string;
  financeValidationReference: string;
};
```

CTM must not calculate or claim ownership of the credit figures; it only propagates the Finance validation outcome reference.

---

# 12. Notification Trigger Rules

| Rule ID | Trigger Rule |
|---|---|
| NR-CTM-001 | Notification requests are created only after the relevant CTM transaction commits successfully. |
| NR-CTM-002 | A rollback must not produce a success notification. |
| NR-CTM-003 | NotificationRequest idempotency must use event ID or deterministic event key. |
| NR-CTM-004 | CTM event reprocessing must not create duplicate user-visible messages. |
| NR-CTM-005 | Recipient resolution must respect branch/account scope and recipient role relationship. |
| NR-CTM-006 | Sensitive values such as full Civil ID or passport number must not be included in message payloads/templates. |
| NR-CTM-007 | User-preferred language may be used where Communication context supports it. |
| NR-CTM-008 | Templates should support English and Arabic. |
| NR-CTM-009 | Notification delivery failure must not roll back the committed CTM business transaction. |
| NR-CTM-010 | Delivery logs belong to Communication context. |
| NR-CTM-011 | Contract expiry reminders use configurable thresholds, not hardcoded days in domain code. |
| NR-CTM-012 | Cross-context event notifications must retain originating correlation ID. |
| NR-CTM-013 | Finance-related notifications must reference Finance decision/invoice identifiers rather than duplicating Finance state. |
| NR-CTM-014 | Participant notifications require an approved contact destination from Person/Party or Communication preference source. |
| NR-CTM-015 | Notification templates must not be embedded in CTM source code except test fixtures. |

---

# 13. Recommended Notification Templates

| Template Code | Event | Channels |
|---|---|---|
| `CTM_CONTRACT_ACTIVATED` | CorporateContractActivated | In-app, Email |
| `CTM_CONTRACT_EXPIRING_SOON` | CorporateContractExpiringSoon | In-app, Email |
| `CTM_CONTRACT_EXPIRED` | CorporateContractExpired | In-app, Email |
| `CTM_CONTRACT_SUSPENDED` | CorporateContractSuspended | In-app, Email |
| `CTM_PARTICIPANT_IMPORT_VALIDATED` | CorporateParticipantImportValidated | In-app |
| `CTM_PARTICIPANT_IMPORT_COMMITTED` | CorporateParticipantImportCommitted | In-app, Email |
| `CTM_PARTICIPANT_IMPORT_FAILED` | CorporateParticipantImportFailed | In-app, Email |
| `CTM_ENROLLMENT_CREATED_INTERNAL` | CorporateEnrollmentCreated | In-app |
| `CTM_ENROLLMENT_CONFIRMED_PARTICIPANT` | CorporateEnrollmentCreated | Email/SMS/WhatsApp as configured |
| `CTM_BULK_ENROLLMENT_COMPLETED` | CorporateBulkEnrollmentCompleted | In-app, Email |
| `CTM_BULK_ENROLLMENT_PARTIAL_FAILURE` | CorporateBulkEnrollmentPartiallyFailed | In-app, Email |
| `CTM_CORPORATE_CREDIT_BLOCKED` | CorporateCreditValidationFailed | In-app |
| `CTM_BILLING_READY` | CorporateEnrollmentBillingReady | In-app, Email |
| `CTM_BILLING_ON_HOLD` | CorporateEnrollmentBillingOnHold | In-app |
| `CTM_LINK_MISMATCH_DETECTED` | CorporateEnrollmentLinkMismatchDetected | In-app |
| `CTM_LINK_REPAIRED` | CorporateEnrollmentLinkRepaired | In-app |

---

# 14. Notification Recipient Rules

## 14.1 Internal Recipients

Recipients may be resolved by:

- explicit account manager assignment;
- initiating user;
- users with relevant permission within branch scope;
- finance users responsible for the relevant branch/account;
- CTM administrators;
- auditors for reconciliation events.

## 14.2 External Recipients

External notification rules must satisfy:

- recipient belongs to the same CorporateAccount;
- portal/contact access policy is enabled;
- contact channel is verified/approved;
- communication preference is respected where supported;
- participant communications use Person/Student identity and not duplicated CTM contact fields.

---

# 15. Validation and Notification Audit Requirements

The following must be auditable:

- rejected account lifecycle transitions;
- contract status changes;
- participant identity ambiguity decisions;
- participant bulk import summary and commit result;
- corporate enrollment orchestration result;
- Finance credit block decision reference;
- billing coordination transitions;
- reconciliation mismatch detection and repair;
- notification event creation for sensitive operational events.

Audit fields should include:

```text
entityType
entityId
action
validationRuleId or errorCode
performedBy
performedAt
oldValue
newValue
reason
correlationId
dependencyReference, where applicable
```

---

# 16. Cross-Context Validation Interaction Matrix

| CTM Use Case | Local Validation | Delegated Validation |
|---|---|---|
| Create Corporate Account | Code uniqueness, CTM lifecycle defaults | Organization existence/type |
| Add Corporate Contact | Duplicate account-person link, primary-contact invariant | Person existence |
| Create Contract | Number uniqueness, dates, value, billing model | None beyond referenced account |
| Activate Contract | CTM lifecycle and date validity | Optional approval policy if externalized |
| Register Participant | Account relationship, employment metadata uniqueness | Person identity resolution |
| Bulk Participant Import | Row format, CTM duplicates, account relationship | Person matching |
| Create Corporate Enrollment | Participant/contract/account linkage | Course, Batch, Scheduling, Pricing, Credit, StudentProfile, Enrollment |
| Bulk Corporate Enrollment | Same as single plus set-level checks | Capacity, pricing, credit, Enrollment creation |
| Mark Billing Ready | CTM state transition | Finance readiness policy where required |
| Mark Billed | CTM state transition | Finance invoice confirmation |
| View Attendance Status | None beyond access scope | Attendance projection |
| View Completion Status | None beyond access scope | Completion projection |
| View Certificate Status | None beyond access scope | Certificate projection |
| View Document Compliance | None beyond access scope | Document verification projection |

---

# 17. Validation Fail-Safe Rules

1. A dependency validation timeout must not be interpreted as approval.
2. Corporate credit timeout must produce dependency failure, never implicit pass.
3. Batch capacity check and Enrollment commit must be coordinated to prevent overbooking.
4. Stale pricing preview token must cause re-resolution.
5. Identity ambiguity must require human resolution; no heuristic auto-merge.
6. Client-generated success status must never overwrite server state.
7. A notification failure must not convert a successful transaction into failed business state.
8. Repeated orchestration command with same idempotency key and identical payload must return prior result.
9. Same idempotency key with different payload must fail.
10. Cross-context errors must retain correlation IDs for support tracing.

---

# 18. Known Gaps Affecting Validation or Notifications

| Gap ID | Gap | Validation/Notification Impact |
|---|---|---|
| GAP-CTM-VN-001 | Account-to-Branch association not approved | Branch validation cannot be finalized | Architecture decision required |
| GAP-CTM-VN-002 | Corporate Nomination model missing | No durable nomination validation/event lifecycle can be defined | Deferred |
| GAP-CTM-VN-003 | CorporateTrainingProgram/Project model incomplete | No project status validation or closure notifications | Deferred |
| GAP-CTM-VN-004 | Equipment ownership/model missing | Equipment availability validation cannot be implemented | Deferred |
| GAP-CTM-VN-005 | Travel & Accommodation ownership missing | Cost/travel validation and alerts cannot be finalized | Deferred |
| GAP-CTM-VN-006 | Costing/Profitability aggregate not approved | Margin validation and approval notifications cannot be defined | Deferred |
| GAP-CTM-VN-007 | GIVT dedicated model/ownership unresolved | GIVT-specific validations and notifications must not be invented | Deferred |
| GAP-CTM-VN-008 | Corporate portal phase/auth model not approved | External notification and submit permissions remain conditional | Deferred |
| GAP-CTM-VN-009 | Exact contract expiry reminder thresholds not approved | Must be configurable in Communication/Configuration | Deferred |
| GAP-CTM-VN-010 | Credit field ownership overlaps ER and Finance DDD responsibilities | Write validation ownership must be finalized | Architecture decision required |

---

# 19. DDD and ER Alignment Summary

## 19.1 Correct CTM-Owned Validations

The following are correctly treated as CTM-owned because they apply to CTM-owned persistence and lifecycle:

- CorporateAccount uniqueness and lifecycle;
- CorporateContact relationship uniqueness and primary-contact invariant;
- CorporateContract number, date, value, account relationship, and lifecycle;
- CorporateParticipant account relationship, participant uniqueness, employee code uniqueness, and lifecycle;
- CorporateEnrollment linkage uniqueness and CTM billing coordination status;
- import workflow state and idempotency;
- reconciliation eligibility and repair auditability.

## 19.2 Correctly Delegated Validations

The following are intentionally not duplicated in CTM:

- Organization classification;
- Person identity uniqueness;
- Course publication/enrollment eligibility;
- pricing and discount hierarchy;
- batch/course consistency;
- batch capacity;
- trainer/classroom/holiday conflict checking;
- corporate credit decision;
- StudentProfile and Enrollment invariants;
- Attendance calculation;
- Completion evaluation;
- Certificate eligibility and issuance;
- Document verification.

## 19.3 Shared-Kernel Only Rules

Shared schemas may validate:

- IDs;
- dates;
- money primitive shape;
- email syntax;
- phone syntax;
- pagination;
- localized text shape.

Shared-kernel helpers must not become owners of CTM or foreign-context business rules.

---

# 20. Final Enforcement Statement

The validation model for Corporate Training Management is:

```text
CTM owns:
    Corporate Account rules
    Corporate Contact relationship rules
    Corporate Contract rules
    Corporate Participant relationship rules
    Corporate Enrollment linkage rules
    Import workflow rules
    CTM billing coordination state
    Reconciliation rules

CTM delegates:
    Organization truth
    Person identity truth
    Course/pricing/discount truth
    Batch/capacity truth
    Scheduling feasibility
    Corporate credit truth
    Enrollment aggregate invariants
    Attendance truth
    Completion truth
    Certificate truth
    Document verification truth

Communication context owns:
    Templates
    Placeholder rendering
    Channel selection
    Delivery
    Retries
    Delivery logs
```

No validation rule may be copied into CTM merely for convenience when another bounded context is authoritative. CTM may cache or display a validation result for workflow continuity, but the owning context remains the source of truth.
