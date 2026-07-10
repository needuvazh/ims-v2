# Part 5 – API Contracts

## Module 14 – Corporate Training Management

## Document Control

| Field | Value |
|---|---|
| Module | Module 14 – Corporate Training Management |
| Module Code | CTM |
| Owning Bounded Context | Corporate Training Management |
| Architecture Style | Next.js monorepo modular monolith |
| API Style | REST Route Handlers and typed Server Actions |
| Authentication | Authenticated application session for internal/portal routes; public access is not defined in CTM |
| Authorization | Dynamic permission codes plus server-side data scope evaluation |
| Branch Isolation | Mandatory server-side scope filter; request parameters never grant access |
| API Version | `/api/v1` |
| Source Baselines | DDD Context Map v3.0; ER Model v3.0; ASTI ERP Workflow; Module 14 Overview; Parts 1–4 |
| Status | Draft for review |

---

# 1. Purpose

This document defines the API contracts for Corporate Training Management. It covers CTM-owned CRUD operations, lifecycle commands, participant import, corporate-enrollment orchestration, CTM operational reads, portal reads, reconciliation, and CTM report/export request boundaries.

The API layer follows these non-negotiable rules:

1. CTM writes only CTM-owned persistence models: `CorporateAccount`, `CorporateContact`, `CorporateContract`, `CorporateParticipant`, and `CorporateEnrollment`.
2. CTM does not directly persist or mutate Course, Batch, Schedule, StudentProfile, Enrollment, Invoice, Payment, Attendance, Completion, Certificate, Document, User, Role, Permission, or AuditLog records.
3. Corporate enrollment endpoints are application-level orchestration endpoints. They coordinate owner-context application services inside the modular monolith; they do not bypass context boundaries through direct table access.
4. Branch authorization is resolved from authenticated user scope. `branchId` in a request is a business filter or target selection, not authorization evidence.
5. Every mutating endpoint requires optimistic concurrency where an existing mutable CTM entity is changed.
6. Soft-delete and state-transition commands are explicit operations. Generic hard-delete endpoints are prohibited.
7. Cross-context read data returned in CTM DTOs is a projection and must be labeled and treated as read-only.

---

# 2. Common API Conventions

## 2.1 Base URL and Content Types

```text
Base path: /api/v1/corporate-training
Request: application/json
Response: application/json
Bulk participant upload: multipart/form-data for file transfer, then JSON for validation/commit commands
Export download: signed or authorization-checked download URL returned from export status endpoint
```

## 2.2 Authentication Contract

All routes require an authenticated session unless a future explicitly approved public route is added. On every request, the server resolves:

```ts
type AuthContext = {
  userId: string;
  personId: string;
  permissions: string[];
  assignedBranchIds: string[];
  activeBranchId: string | null;
  canViewChildBranches: boolean;
  canViewConsolidated: boolean;
};
```

Portal routes additionally resolve:

```ts
type StudentPortalContext = {
  userId: string;
  personId: string;
  studentProfileId: string;
};

type TrainerPortalContext = {
  userId: string;
  personId: string;
  trainerProfileId: string;
};
```

## 2.3 Standard Success Envelope

```ts
type ApiSuccess<T> = {
  data: T;
  meta?: {
    requestId: string;
    generatedAt: string; // ISO-8601
    page?: number;
    pageSize?: number;
    totalItems?: number;
    totalPages?: number;
  };
};
```

## 2.4 Standard Error Envelope

```ts
type ApiError = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Array<{
      path: string;
      code: string;
      message: string;
    }>;
    details?: Record<string, unknown>;
    requestId: string;
  };
};
```

## 2.5 Common HTTP and Application Errors

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `CTM_VALIDATION_ERROR` | Request schema or domain input invalid |
| 401 | `AUTHENTICATION_REQUIRED` | No valid authenticated session |
| 403 | `CTM_PERMISSION_DENIED` | Required permission missing |
| 403 | `CTM_SCOPE_DENIED` | Record is outside effective branch/data scope |
| 404 | `CTM_ACCOUNT_NOT_FOUND` | Corporate account not found in authorized scope |
| 404 | `CTM_CONTACT_NOT_FOUND` | Contact relationship not found |
| 404 | `CTM_CONTRACT_NOT_FOUND` | Contract not found |
| 404 | `CTM_PARTICIPANT_NOT_FOUND` | Participant not found |
| 404 | `CTM_ENROLLMENT_LINK_NOT_FOUND` | CorporateEnrollment link not found |
| 409 | `CTM_VERSION_CONFLICT` | Optimistic concurrency version mismatch |
| 409 | `CTM_DUPLICATE_ACCOUNT_CODE` | Active account code already exists |
| 409 | `CTM_DUPLICATE_CONTACT` | Person already linked as active contact to account |
| 409 | `CTM_DUPLICATE_PARTICIPANT` | Person already linked as active participant to account |
| 409 | `CTM_INVALID_STATE_TRANSITION` | Lifecycle transition is not allowed |
| 409 | `CTM_CONTRACT_OVERLAP` | Conflicting contract rule detected where overlap is disallowed |
| 409 | `CTM_DUPLICATE_ENROLLMENT_LINK` | Corporate enrollment linkage already exists |
| 422 | `CTM_CONTRACT_NOT_APPLICABLE` | Contract not active/applicable for transaction date |
| 422 | `CTM_PERSON_RESOLUTION_REQUIRED` | Candidate identity is ambiguous or unresolved |
| 422 | `CTM_BATCH_NOT_ELIGIBLE` | Training Delivery rejected batch selection |
| 422 | `CTM_BATCH_CAPACITY_EXCEEDED` | Capacity validation failed |
| 422 | `CTM_SCHEDULE_CONFLICT` | Scheduling feasibility failed |
| 422 | `CTM_CREDIT_VALIDATION_FAILED` | Finance returned blocking corporate credit failure |
| 422 | `CTM_ENROLLMENT_CREATION_FAILED` | Admission & Enrollment owner rejected creation |
| 429 | `RATE_LIMITED` | Request throttled |
| 500 | `CTM_INTERNAL_ERROR` | Unhandled internal failure |
| 503 | `CTM_DEPENDENCY_UNAVAILABLE` | Required in-process dependency or infrastructure unavailable |

## 2.6 Pagination and Sorting

List endpoints use:

```ts
type PageRequest = {
  page?: number;      // default 1, min 1
  pageSize?: number;  // default 25, allowed 10,25,50,100
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};
```

The server permits only documented sortable fields. Arbitrary column names are rejected.

## 2.7 Branch-Scope Resolution

Until the account-to-branch model gap identified in Part 4 is resolved, production account CRUD must not infer branch ownership through downstream Enrollment records. The API contracts therefore use an abstract `CorporateAccountScopePolicy` resolved server-side. Implementation is blocked from production release until its persistence basis is approved.

Scope modes:

```text
OWN_BRANCH        user active/assigned branch only
ASSIGNED_BRANCHES all explicitly assigned branches
CHILD_BRANCHES    authorized descendants when IAM allows
CONSOLIDATED      approved multi-branch read scope only
SELF              authenticated student ownership
ASSIGNED_BATCH    authenticated trainer's valid assignment
```

---

# 3. Endpoint Inventory

## 3.1 Admin/Internal APIs

| ID | Method | Route | Purpose |
|---|---|---|---|
| API-CTM-001 | GET | `/api/v1/corporate-training/accounts` | Search/list corporate accounts |
| API-CTM-002 | POST | `/api/v1/corporate-training/accounts` | Create corporate account |
| API-CTM-003 | GET | `/api/v1/corporate-training/accounts/{accountId}` | Get account detail |
| API-CTM-004 | PATCH | `/api/v1/corporate-training/accounts/{accountId}` | Update account mutable fields |
| API-CTM-005 | POST | `/api/v1/corporate-training/accounts/{accountId}/status-transitions` | Change account lifecycle state |
| API-CTM-006 | POST | `/api/v1/corporate-training/accounts/{accountId}/archive` | Soft-delete/archive account where allowed |
| API-CTM-007 | GET | `/api/v1/corporate-training/accounts/{accountId}/overview` | Get Account 360 composition read model |
| API-CTM-008 | GET | `/api/v1/corporate-training/accounts/{accountId}/contacts` | List contacts |
| API-CTM-009 | POST | `/api/v1/corporate-training/accounts/{accountId}/contacts` | Add contact relationship |
| API-CTM-010 | PATCH | `/api/v1/corporate-training/accounts/{accountId}/contacts/{contactId}` | Update contact relationship |
| API-CTM-011 | POST | `/api/v1/corporate-training/accounts/{accountId}/contacts/{contactId}/deactivate` | Deactivate contact |
| API-CTM-012 | POST | `/api/v1/corporate-training/accounts/{accountId}/contacts/{contactId}/set-primary` | Set primary contact atomically |
| API-CTM-013 | GET | `/api/v1/corporate-training/accounts/{accountId}/contracts` | List account contracts |
| API-CTM-014 | POST | `/api/v1/corporate-training/accounts/{accountId}/contracts` | Create contract |
| API-CTM-015 | GET | `/api/v1/corporate-training/accounts/{accountId}/contracts/{contractId}` | Get contract |
| API-CTM-016 | PATCH | `/api/v1/corporate-training/accounts/{accountId}/contracts/{contractId}` | Update editable contract fields |
| API-CTM-017 | POST | `/api/v1/corporate-training/accounts/{accountId}/contracts/{contractId}/status-transitions` | Transition contract state |
| API-CTM-018 | GET | `/api/v1/corporate-training/accounts/{accountId}/participants` | Search/list participants |
| API-CTM-019 | POST | `/api/v1/corporate-training/accounts/{accountId}/participants` | Register one corporate participant |
| API-CTM-020 | GET | `/api/v1/corporate-training/accounts/{accountId}/participants/{participantId}` | Get participant detail |
| API-CTM-021 | PATCH | `/api/v1/corporate-training/accounts/{accountId}/participants/{participantId}` | Update employer-context participant fields |
| API-CTM-022 | POST | `/api/v1/corporate-training/accounts/{accountId}/participants/{participantId}/status-transitions` | Change participant lifecycle state |
| API-CTM-023 | POST | `/api/v1/corporate-training/accounts/{accountId}/participant-imports` | Upload participant import file |
| API-CTM-024 | POST | `/api/v1/corporate-training/accounts/{accountId}/participant-imports/{importId}/validate` | Validate staged participant import |
| API-CTM-025 | POST | `/api/v1/corporate-training/accounts/{accountId}/participant-imports/{importId}/commit` | Commit valid participant rows |
| API-CTM-026 | GET | `/api/v1/corporate-training/accounts/{accountId}/participant-imports/{importId}` | Get import validation/commit status |
| API-CTM-027 | POST | `/api/v1/corporate-training/accounts/{accountId}/corporate-enrollments` | Create one corporate enrollment via orchestration |
| API-CTM-028 | POST | `/api/v1/corporate-training/accounts/{accountId}/corporate-enrollments/bulk` | Create bulk corporate enrollments |
| API-CTM-029 | GET | `/api/v1/corporate-training/corporate-enrollments` | Search corporate enrollment operations view |
| API-CTM-030 | GET | `/api/v1/corporate-training/corporate-enrollments/{corporateEnrollmentId}` | Get composite corporate enrollment detail |
| API-CTM-031 | POST | `/api/v1/corporate-training/corporate-enrollments/{corporateEnrollmentId}/billing-status-transitions` | Update CTM billing coordination status |
| API-CTM-032 | GET | `/api/v1/corporate-training/enrollment-link-reconciliation` | Find missing/inconsistent CTM enrollment links |
| API-CTM-033 | POST | `/api/v1/corporate-training/enrollment-link-reconciliation/{enrollmentId}/repair` | Repair missing CTM linkage after verification |
| API-CTM-034 | POST | `/api/v1/corporate-training/reports/exports` | Request CTM report export |
| API-CTM-035 | GET | `/api/v1/corporate-training/reports/exports/{exportId}` | Get export status and authorized download reference |

## 3.2 Portal Read APIs

| ID | Method | Route | Purpose |
|---|---|---|---|
| API-CTM-036 | GET | `/api/v1/student/corporate-training/enrollments/{enrollmentId}` | Student self-scoped corporate training details |
| API-CTM-037 | GET | `/api/v1/student/corporate-training/enrollments/{enrollmentId}/status` | Student self-scoped composite training status |
| API-CTM-038 | GET | `/api/v1/trainer/corporate-training/assignments` | Trainer assigned corporate trainings |
| API-CTM-039 | GET | `/api/v1/trainer/corporate-training/batches/{batchId}/participants` | Trainer assigned-batch corporate roster |

---

# 4. Corporate Account APIs

## API-CTM-001 – Search Corporate Accounts

**Route:** `GET /api/v1/corporate-training/accounts`

**Authentication:** Required.

**Permission:** `corporate-training.account.read`.

**Branch scope:** Server applies effective authorized corporate-account scope. Consolidated reads require `corporate-training.account.read.consolidated` plus IAM consolidated access. `branchId` filter is intersected with effective scope.

### Request Schema

```ts
const SearchCorporateAccountsQuery = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'SUSPENDED', 'CLOSED']).optional(),
  billingCycle: z.string().trim().max(50).optional(),
  organizationId: z.string().min(1).optional(),
  branchId: z.string().min(1).optional(),
  includeDeleted: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().refine(v => [10,25,50,100].includes(v)).default(25),
  sortBy: z.enum(['accountCode','accountName','status','createdAt','updatedAt']).default('accountName'),
  sortOrder: z.enum(['asc','desc']).default('asc')
});
```

### Success DTO – 200

```ts
type CorporateAccountListItemDto = {
  id: string;
  accountCode: string;
  accountName: string;
  organization: { id: string; legalName: string; tradeName: string | null };
  industry: string | null;
  billingCycle: string;
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  primaryContact: { id: string; personId: string; displayName: string; email: string | null; phone: string | null } | null;
  activeContractCount: number;
  activeParticipantCount: number;
  updatedAt: string;
  version: number;
};
```

Envelope includes pagination metadata.

### Errors

`AUTHENTICATION_REQUIRED`, `CTM_PERMISSION_DENIED`, `CTM_SCOPE_DENIED`, `CTM_VALIDATION_ERROR`.

---

## API-CTM-002 – Create Corporate Account

**Route:** `POST /api/v1/corporate-training/accounts`

**Authentication:** Required.

**Permission:** `corporate-training.account.create`.

**Branch scope:** Target scope must be derivable from approved account-scope policy. Creation is rejected if target organization/account relationship cannot be assigned to an authorized scope.

### Request Schema

```ts
const CreateCorporateAccountRequest = z.object({
  organizationId: z.string().min(1),
  accountCode: z.string().trim().min(2).max(50).regex(/^[A-Za-z0-9_-]+$/),
  accountName: z.string().trim().min(2).max(250),
  industry: z.string().trim().max(120).nullable().optional(),
  creditLimit: z.string().regex(/^\d+(\.\d{1,3})?$/).default('0.000'),
  blockOnCreditLimit: z.boolean().default(false),
  billingCycle: z.string().trim().min(1).max(50),
  initialStatus: z.enum(['DRAFT', 'ACTIVE']).default('DRAFT'),
  scopeAssignment: z.object({
    branchId: z.string().min(1)
  })
});
```

`currentOutstanding` is not accepted from the client.

### Success DTO – 201

```ts
type CorporateAccountDto = {
  id: string;
  organizationId: string;
  accountCode: string;
  accountName: string;
  industry: string | null;
  creditLimit: string;
  currentOutstanding: string;
  blockOnCreditLimit: boolean;
  billingCycle: string;
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
};
```

### Errors

400 `CTM_VALIDATION_ERROR`; 403 `CTM_PERMISSION_DENIED`/`CTM_SCOPE_DENIED`; 404 `ORGANIZATION_NOT_FOUND`; 409 `CTM_DUPLICATE_ACCOUNT_CODE`; 409 `CTM_ORGANIZATION_ACCOUNT_CONFLICT`; 422 `CTM_ACCOUNT_SCOPE_UNRESOLVED`.

---

## API-CTM-003 – Get Corporate Account

**Route:** `GET /api/v1/corporate-training/accounts/{accountId}`

**Permission:** `corporate-training.account.read`.

**Branch scope:** Account must fall inside effective scope.

**Request:** Path `accountId: string`.

### Success DTO – 200

Returns `CorporateAccountDto` plus:

```ts
{
  organization: {
    id: string;
    legalName: string;
    tradeName: string | null;
    registrationNumber: string | null;
    taxRegistrationNumber: string | null;
  };
}
```

### Errors

401, 403, 404 `CTM_ACCOUNT_NOT_FOUND`.

---

## API-CTM-004 – Update Corporate Account

**Route:** `PATCH /api/v1/corporate-training/accounts/{accountId}`

**Permission:** `corporate-training.account.update`.

**Branch scope:** Write scope only. Consolidated-report permission never implies write permission.

### Request Schema

```ts
const UpdateCorporateAccountRequest = z.object({
  accountName: z.string().trim().min(2).max(250).optional(),
  industry: z.string().trim().max(120).nullable().optional(),
  creditLimit: z.string().regex(/^\d+(\.\d{1,3})?$/).optional(),
  blockOnCreditLimit: z.boolean().optional(),
  billingCycle: z.string().trim().min(1).max(50).optional(),
  version: z.number().int().min(1),
  reason: z.string().trim().min(3).max(500)
}).refine(v => Object.keys(v).some(k => !['version','reason'].includes(k)), {
  message: 'At least one mutable field is required'
});
```

Finance-owned `currentOutstanding` cannot be updated through this endpoint.

### Success DTO – 200

`CorporateAccountDto`.

### Errors

403 permission/scope; 404 account not found; 409 `CTM_VERSION_CONFLICT`; 422 `CTM_ACCOUNT_FIELD_LOCKED_BY_STATE`; 422 `CTM_CREDIT_POLICY_CHANGE_REQUIRES_FINANCE_VALIDATION` where applicable.

---

## API-CTM-005 – Change Corporate Account Status

**Route:** `POST /api/v1/corporate-training/accounts/{accountId}/status-transitions`

**Permission:** `corporate-training.account.status.manage`.

**Branch scope:** Write scope.

### Request Schema

```ts
const ChangeCorporateAccountStatusRequest = z.object({
  toStatus: z.enum(['DRAFT', 'ACTIVE', 'SUSPENDED', 'CLOSED']),
  reason: z.string().trim().min(3).max(1000),
  version: z.number().int().min(1)
});
```

### Processing Guards

- Validate Part 2 transition matrix.
- Suspension must block new CTM enrollment orchestration after commit.
- Closure validates unresolved business obligations according to approved closure policy; CTM does not calculate Finance truth itself.
- Audit event records old/new status, reason, actor and timestamp.

### Success DTO – 200

```ts
type StatusTransitionDto = {
  entityId: string;
  entityType: 'CorporateAccount';
  fromStatus: string;
  toStatus: string;
  changedAt: string;
  version: number;
};
```

### Errors

409 `CTM_INVALID_STATE_TRANSITION`, `CTM_VERSION_CONFLICT`; 422 `CTM_ACCOUNT_CLOSURE_BLOCKED` with machine-readable blockers.

---

## API-CTM-006 – Archive Corporate Account

**Route:** `POST /api/v1/corporate-training/accounts/{accountId}/archive`

**Permission:** `corporate-training.account.archive`.

**Branch scope:** Write scope.

### Request Schema

```ts
const ArchiveCorporateAccountRequest = z.object({
  reason: z.string().trim().min(5).max(1000),
  version: z.number().int().min(1)
});
```

### Success DTO – 200

```ts
{ id: string; isDeleted: true; deletedAt: string; version: number }
```

### Errors

409 version conflict; 422 `CTM_ARCHIVE_BLOCKED_ACTIVE_RELATIONSHIPS`; 422 `CTM_ARCHIVE_REQUIRES_CLOSED_STATUS`.

---

## API-CTM-007 – Get Corporate Account 360

**Route:** `GET /api/v1/corporate-training/accounts/{accountId}/overview`

**Permission:** `corporate-training.account.read` plus field-level permissions for sensitive sections.

**Branch scope:** Read scope. Consolidated permission is respected.

### Request Schema

```ts
const GetAccount360Query = z.object({
  include: z.array(z.enum([
    'contacts','contracts','participants','enrollments','training','attendance','completion','certificates','finance','documents'
  ])).optional()
});
```

### Success DTO – 200

```ts
type CorporateAccount360Dto = {
  account: CorporateAccountDto;
  contacts?: Array<ContactSummaryDto>;
  contracts?: Array<ContractSummaryDto>;
  participants?: { active: number; inactive: number; total: number };
  enrollments?: { draft: number; active: number; completed: number; cancelled: number; total: number };
  training?: { runningBatches: number; upcomingBatches: number; completedBatches: number };
  attendance?: { averageAttendancePercentage: number | null; lowAttendanceCount: number };
  completion?: { pending: number; approved: number };
  certificates?: { pending: number; issued: number };
  finance?: { invoicedAmount: string; paidAmount: string; outstandingAmount: string; currency: string };
  documents?: { pendingVerification: number; expiringSoon: number; expired: number };
  projectionAsOf: string;
};
```

Sections are omitted—not returned as zero—when permission is missing.

### Errors

403 account/sensitive-section permission; 404 account not found; 503 dependency unavailable where a required projection cannot be produced.

---

# 5. Corporate Contact APIs

## API-CTM-008 – List Contacts

**GET** `/accounts/{accountId}/contacts`

**Permission:** `corporate-training.contact.read`.

**Scope:** Parent account must be in effective read scope.

### Query Schema

```ts
z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(['ACTIVE','INACTIVE']).optional(),
  primaryOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});
```

### Success DTO – 200

```ts
type ContactSummaryDto = {
  id: string;
  corporateAccountId: string;
  personId: string;
  displayName: string;
  designation: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  portalAccessEnabled: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  version: number;
};
```

### Errors

403 scope/permission; 404 account not found.

---

## API-CTM-009 – Add Corporate Contact

**POST** `/accounts/{accountId}/contacts`

**Permission:** `corporate-training.contact.create`.

**Scope:** Parent account write scope.

### Request Schema

```ts
const CreateCorporateContactRequest = z.object({
  personId: z.string().min(1),
  designation: z.string().trim().max(150).nullable().optional(),
  department: z.string().trim().max(150).nullable().optional(),
  email: z.string().email().max(320).nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  isPrimary: z.boolean().default(false),
  portalAccessEnabled: z.boolean().default(false)
});
```

`portalAccessEnabled=true` does not create an IAM User; it only records CTM intent/eligibility.

### Success DTO – 201

`ContactSummaryDto`.

### Errors

404 person/account not found; 409 `CTM_DUPLICATE_CONTACT`; 409 `CTM_PRIMARY_CONTACT_CONFLICT`; 422 `CTM_PORTAL_ACCESS_REQUIRES_IDENTITY_SETUP` where policy requires.

---

## API-CTM-010 – Update Contact

**PATCH** `/accounts/{accountId}/contacts/{contactId}`

**Permission:** `corporate-training.contact.update`.

### Request Schema

```ts
z.object({
  designation: z.string().trim().max(150).nullable().optional(),
  department: z.string().trim().max(150).nullable().optional(),
  email: z.string().email().max(320).nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  portalAccessEnabled: z.boolean().optional(),
  version: z.number().int().min(1),
  reason: z.string().trim().min(3).max(500)
});
```

### Success

200 `ContactSummaryDto`.

### Errors

404, 409 version conflict, 422 state-locked contact.

---

## API-CTM-011 – Deactivate Contact

**POST** `/accounts/{accountId}/contacts/{contactId}/deactivate`

**Permission:** `corporate-training.contact.deactivate`.

### Request

```ts
z.object({ reason: z.string().trim().min(3).max(1000), version: z.number().int().min(1) });
```

### Success – 200

`ContactSummaryDto` with `status='INACTIVE'`.

### Errors

409 invalid transition/version; 422 `CTM_PRIMARY_CONTACT_REPLACEMENT_REQUIRED` when business policy requires a primary contact.

---

## API-CTM-012 – Set Primary Contact

**POST** `/accounts/{accountId}/contacts/{contactId}/set-primary`

**Permission:** `corporate-training.contact.update`.

### Request

```ts
z.object({ version: z.number().int().min(1), reason: z.string().trim().min(3).max(500) });
```

### Processing

Within one CTM transaction: verify target active, unset previous primary, set target primary, write audit event.

### Success – 200

```ts
{ accountId: string; primaryContactId: string; changedAt: string }
```

### Errors

404, 409 version conflict, 422 `CTM_INACTIVE_CONTACT_CANNOT_BE_PRIMARY`.

---

# 6. Corporate Contract APIs

## API-CTM-013 – List Contracts

**GET** `/accounts/{accountId}/contracts`

**Permission:** `corporate-training.contract.read`.

### Query

```ts
z.object({
  status: z.enum(['DRAFT','ACTIVE','SUSPENDED','EXPIRED','TERMINATED']).optional(),
  validOn: z.coerce.date().optional(),
  billingModel: z.enum(['PER_STUDENT','PER_BATCH','PER_HOUR','FIXED_CONTRACT']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});
```

### Success – 200

```ts
type ContractSummaryDto = {
  id: string;
  contractNumber: string;
  contractValue: string;
  startDate: string;
  endDate: string;
  billingModel: 'PER_STUDENT'|'PER_BATCH'|'PER_HOUR'|'FIXED_CONTRACT';
  paymentTerms: string;
  status: 'DRAFT'|'ACTIVE'|'SUSPENDED'|'EXPIRED'|'TERMINATED';
  version: number;
};
```

---

## API-CTM-014 – Create Contract

**POST** `/accounts/{accountId}/contracts`

**Permission:** `corporate-training.contract.create`.

**Scope:** Parent account write scope; account must permit contract creation by state.

### Request Schema

```ts
const CreateCorporateContractRequest = z.object({
  contractNumber: z.string().trim().min(1).max(80),
  contractValue: z.string().regex(/^\d+(\.\d{1,3})?$/),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  billingModel: z.enum(['PER_STUDENT','PER_BATCH','PER_HOUR','FIXED_CONTRACT']),
  paymentTerms: z.string().trim().min(1).max(2000),
  initialStatus: z.enum(['DRAFT','ACTIVE']).default('DRAFT')
}).refine(v => v.endDate >= v.startDate, { path: ['endDate'], message: 'endDate must be on or after startDate' });
```

### Success – 201

Full `CorporateContractDto` including audit fields/version.

### Errors

409 duplicate contract number; 409 contract overlap where policy applies; 422 account state prevents creation.

---

## API-CTM-015 – Get Contract

**GET** `/accounts/{accountId}/contracts/{contractId}`

**Permission:** `corporate-training.contract.read`.

**Success:** 200 full contract DTO.

**Errors:** 403 scope; 404 contract/account not found.

---

## API-CTM-016 – Update Contract

**PATCH** `/accounts/{accountId}/contracts/{contractId}`

**Permission:** `corporate-training.contract.update`.

### Request Schema

```ts
z.object({
  contractValue: z.string().regex(/^\d+(\.\d{1,3})?$/).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  billingModel: z.enum(['PER_STUDENT','PER_BATCH','PER_HOUR','FIXED_CONTRACT']).optional(),
  paymentTerms: z.string().trim().min(1).max(2000).optional(),
  version: z.number().int().min(1),
  reason: z.string().trim().min(3).max(1000)
});
```

### Success – 200

Full contract DTO.

### Errors

409 version/overlap; 422 `CTM_ACTIVE_CONTRACT_FIELD_IMMUTABLE` where controlled amendment is required.

---

## API-CTM-017 – Contract Status Transition

**POST** `/accounts/{accountId}/contracts/{contractId}/status-transitions`

**Permission:** `corporate-training.contract.status.manage`.

### Request

```ts
z.object({
  toStatus: z.enum(['DRAFT','ACTIVE','SUSPENDED','EXPIRED','TERMINATED']),
  reason: z.string().trim().min(3).max(1000),
  version: z.number().int().min(1)
});
```

### Success – 200

`StatusTransitionDto` with `entityType='CorporateContract'`.

### Errors

409 invalid transition/version; 422 `CTM_CONTRACT_ACTIVATION_REQUIREMENTS_NOT_MET`; 422 `CTM_CONTRACT_HAS_ACTIVE_DEPENDENCIES`.

---

# 7. Corporate Participant APIs

## API-CTM-018 – Search Participants

**GET** `/accounts/{accountId}/participants`

**Permission:** `corporate-training.participant.read`.

### Query Schema

```ts
z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(['ACTIVE','INACTIVE','SUSPENDED']).optional(),
  department: z.string().trim().max(150).optional(),
  linkedStudentProfile: z.enum(['yes','no']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(['displayName','employeeCode','department','status','createdAt']).default('displayName'),
  sortOrder: z.enum(['asc','desc']).default('asc')
});
```

### Success – 200

```ts
type CorporateParticipantDto = {
  id: string;
  corporateAccountId: string;
  personId: string;
  person: { displayName: string; civilIdMasked: string | null; primaryEmail: string | null; primaryPhone: string | null };
  employeeCode: string | null;
  department: string | null;
  designation: string | null;
  linkedStudentProfileId: string | null;
  status: 'ACTIVE'|'INACTIVE'|'SUSPENDED';
  version: number;
};
```

Civil ID masking depends on permission `person.identity.sensitive.read`.

---

## API-CTM-019 – Register Single Participant

**POST** `/accounts/{accountId}/participants`

**Permission:** `corporate-training.participant.create`.

**Scope:** Parent account write scope.

### Request Schema

```ts
const RegisterCorporateParticipantRequest = z.object({
  identity: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('EXISTING_PERSON'), personId: z.string().min(1) }),
    z.object({
      mode: z.literal('RESOLVE_OR_CREATE'),
      firstName: z.string().trim().min(1).max(100),
      middleName: z.string().trim().max(100).nullable().optional(),
      lastName: z.string().trim().min(1).max(100),
      civilId: z.string().trim().max(50).nullable().optional(),
      passportNumber: z.string().trim().max(50).nullable().optional(),
      dateOfBirth: z.coerce.date().optional(),
      nationality: z.string().trim().max(100).optional(),
      email: z.string().email().max(320).nullable().optional(),
      phone: z.string().trim().max(32).nullable().optional()
    })
  ]),
  employeeCode: z.string().trim().max(80).nullable().optional(),
  department: z.string().trim().max(150).nullable().optional(),
  designation: z.string().trim().max(150).nullable().optional()
});
```

### Processing

1. Verify account and scope.
2. Invoke Person/Party identity resolution application service.
3. Reject ambiguous identity; do not create duplicate Person.
4. Create CTM participant relationship.
5. Do not create StudentProfile until enrollment flow requires it.

### Success – 201

`CorporateParticipantDto`, plus:

```ts
{ identityResolution: 'EXISTING_PERSON_LINKED' | 'NEW_PERSON_CREATED' }
```

### Errors

409 duplicate participant; 422 person resolution required/ambiguous; 503 person service unavailable.

---

## API-CTM-020 – Get Participant

**GET** `/accounts/{accountId}/participants/{participantId}`

**Permission:** `corporate-training.participant.read`.

### Success – 200

`CorporateParticipantDto` plus read-only enrollment summary list.

### Errors

403 scope; 404 participant not found.

---

## API-CTM-021 – Update Participant Employer Context

**PATCH** `/accounts/{accountId}/participants/{participantId}`

**Permission:** `corporate-training.participant.update`.

### Request

```ts
z.object({
  employeeCode: z.string().trim().max(80).nullable().optional(),
  department: z.string().trim().max(150).nullable().optional(),
  designation: z.string().trim().max(150).nullable().optional(),
  version: z.number().int().min(1),
  reason: z.string().trim().min(3).max(500)
});
```

Person identity fields are intentionally excluded.

### Success – 200

`CorporateParticipantDto`.

### Errors

409 version conflict; 422 `CTM_PARTICIPANT_FIELD_OWNED_BY_PERSON_CONTEXT` if unsupported identity field submitted.

---

## API-CTM-022 – Participant Status Transition

**POST** `/accounts/{accountId}/participants/{participantId}/status-transitions`

**Permission:** `corporate-training.participant.status.manage`.

### Request

```ts
z.object({
  toStatus: z.enum(['ACTIVE','INACTIVE','SUSPENDED']),
  reason: z.string().trim().min(3).max(1000),
  version: z.number().int().min(1)
});
```

### Success – 200

Status transition DTO.

### Errors

409 invalid transition/version; 422 `CTM_PARTICIPANT_DEACTIVATION_BLOCKED_PENDING_OPERATION` if approved policy blocks transition.

---

# 8. Participant Import APIs

Participant import is a staged application workflow. It does not establish a durable CorporateNomination aggregate. Import staging records are operational/ephemeral infrastructure records and must be retention-limited according to architecture policy.

## API-CTM-023 – Upload Participant Import

**POST** `/accounts/{accountId}/participant-imports`

**Permission:** `corporate-training.participant.import`.

**Content-Type:** `multipart/form-data`.

### Request

```text
file: .xlsx or .csv
clientReference: optional string <= 100
```

Max size and row limits are configurable NFR values; recommended initial limits: 10 MB and 5,000 data rows.

### Success – 202

```ts
type ParticipantImportDto = {
  importId: string;
  accountId: string;
  fileName: string;
  fileSize: number;
  rowCountDetected: number | null;
  status: 'UPLOADED'|'VALIDATING'|'VALIDATED'|'COMMITTING'|'COMPLETED'|'FAILED';
  createdAt: string;
};
```

### Errors

400 unsupported file/type; 413 `CTM_IMPORT_FILE_TOO_LARGE`; 422 `CTM_IMPORT_TEMPLATE_INVALID`.

---

## API-CTM-024 – Validate Participant Import

**POST** `/accounts/{accountId}/participant-imports/{importId}/validate`

**Permission:** `corporate-training.participant.import`.

### Request

```ts
z.object({
  duplicatePolicy: z.enum(['REJECT_DUPLICATES','SKIP_EXISTING_RELATIONSHIPS']).default('REJECT_DUPLICATES')
});
```

### Success – 200

```ts
type ParticipantImportValidationDto = {
  importId: string;
  status: 'VALIDATED';
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    existingPersonMatches: number;
    ambiguousIdentityRows: number;
    duplicateRelationshipRows: number;
  };
  errors: Array<{
    rowNumber: number;
    field: string | null;
    code: string;
    message: string;
  }>;
};
```

### Errors

409 invalid import state; 422 template/row validation errors still return 200 validation result when validation completed successfully; 503 person-resolution dependency unavailable.

---

## API-CTM-025 – Commit Participant Import

**POST** `/accounts/{accountId}/participant-imports/{importId}/commit`

**Permission:** `corporate-training.participant.import.commit`.

### Request

```ts
z.object({
  expectedValidRowCount: z.number().int().min(1),
  idempotencyKey: z.string().uuid()
});
```

### Success – 200

```ts
type ParticipantImportCommitDto = {
  importId: string;
  status: 'COMPLETED'|'PARTIALLY_COMPLETED';
  createdCount: number;
  linkedExistingPersonCount: number;
  skippedCount: number;
  failedCount: number;
  rowResults: Array<{
    rowNumber: number;
    outcome: 'CREATED'|'SKIPPED'|'FAILED';
    participantId?: string;
    code?: string;
    message?: string;
  }>;
};
```

### Errors

409 import not validated/already committed; 409 idempotency conflict; 422 expected row count mismatch.

---

## API-CTM-026 – Get Import Status

**GET** `/accounts/{accountId}/participant-imports/{importId}`

**Permission:** `corporate-training.participant.import`.

### Success – 200

`ParticipantImportDto` plus validation and commit summaries when available.

### Errors

403 scope; 404 import not found.

---

# 9. Corporate Enrollment Orchestration APIs

## API-CTM-027 – Create Single Corporate Enrollment

**POST** `/accounts/{accountId}/corporate-enrollments`

**Permission:** `corporate-training.enrollment.create`.

**Scope:** Account write scope and target branch must be in effective write scope. Target branch is validated against IAM scope and Training Delivery batch ownership.

### Request Schema

```ts
const CreateCorporateEnrollmentRequest = z.object({
  corporateParticipantId: z.string().min(1),
  contractId: z.string().min(1).nullable().optional(),
  courseId: z.string().min(1),
  batchId: z.string().min(1),
  branchId: z.string().min(1),
  enrollmentDate: z.coerce.date().optional(),
  pricingContext: z.object({
    expectedCurrency: z.string().length(3).default('OMR')
  }),
  idempotencyKey: z.string().uuid()
});
```

### Server Processing Contract

1. Authorize account and target branch.
2. Validate active account and active participant.
3. Validate contract applicability when contract supplied/required.
4. Ask Course Catalog owner for course/pricing/discount resolution inputs.
5. Ask Training Delivery owner to validate course-batch association and capacity.
6. Ask Scheduling/Training Delivery owner for feasibility checks required by policy.
7. Ask Finance owner for corporate credit validation.
8. Invoke Admission & Enrollment owner to create/link StudentProfile and create Enrollment.
9. Create `CorporateEnrollment` linkage in CTM using resulting `enrollmentId`.
10. Commit CTM linkage and emit in-process domain/application events according to modular-monolith architecture.
11. Return per-context validation summary and created IDs.

### Success DTO – 201

```ts
type CorporateEnrollmentCreationDto = {
  corporateEnrollmentId: string;
  corporateAccountId: string;
  corporateParticipantId: string;
  contractId: string | null;
  studentProfileId: string;
  enrollmentId: string;
  enrollmentNumber: string;
  course: { id: string; code: string; name: { en: string; ar: string | null } };
  batch: { id: string; code: string; startDate: string; endDate: string; branchId: string };
  pricing: {
    currency: string;
    resolvedPrice: string;
    resolvedDiscount: string;
    finalAmount: string;
    pricingSource: string;
  };
  creditValidation: {
    result: 'PASSED'|'EXCEEDED_NON_BLOCKING';
    checkedAt: string;
  };
  enrollmentStatus: string;
  billingStatus: string;
  createdAt: string;
};
```

### Errors

404 account/participant/contract/course/batch; 409 duplicate enrollment link/idempotency conflict; 422 contract not applicable; 422 batch not eligible/capacity exceeded/schedule conflict/credit blocked/enrollment creation failed; 503 dependency unavailable.

---

## API-CTM-028 – Bulk Corporate Enrollment

**POST** `/accounts/{accountId}/corporate-enrollments/bulk`

**Permission:** `corporate-training.enrollment.bulk.create`.

**Scope:** Account and target branch write scope.

### Request Schema

```ts
const BulkCorporateEnrollmentRequest = z.object({
  participantIds: z.array(z.string().min(1)).min(1).max(500),
  contractId: z.string().min(1).nullable().optional(),
  courseId: z.string().min(1),
  batchId: z.string().min(1),
  branchId: z.string().min(1),
  failureMode: z.enum(['CONTINUE_PER_PARTICIPANT','ALL_OR_NOTHING']).default('CONTINUE_PER_PARTICIPANT'),
  idempotencyKey: z.string().uuid()
});
```

### Success DTO – 200 or 207-style application result in 200 envelope

```ts
type BulkCorporateEnrollmentResultDto = {
  requestId: string;
  accountId: string;
  summary: {
    requested: number;
    succeeded: number;
    failed: number;
    skippedIdempotent: number;
  };
  results: Array<{
    corporateParticipantId: string;
    outcome: 'CREATED'|'FAILED'|'SKIPPED_IDEMPOTENT';
    corporateEnrollmentId?: string;
    enrollmentId?: string;
    enrollmentNumber?: string;
    errorCode?: string;
    message?: string;
  }>;
};
```

### Errors

Request-level failures: auth/scope/schema, invalid account/course/batch, idempotency conflict. Participant-specific business failures are returned in `results` for `CONTINUE_PER_PARTICIPANT` mode.

---

# 10. Corporate Enrollment Operations APIs

## API-CTM-029 – Search Corporate Enrollments

**GET** `/corporate-enrollments`

**Permission:** `corporate-training.enrollment.read`.

**Scope:** Server-filtered account/branch intersection.

### Query

```ts
z.object({
  accountId: z.string().optional(),
  participantId: z.string().optional(),
  enrollmentStatus: z.string().max(50).optional(),
  billingStatus: z.string().max(50).optional(),
  courseId: z.string().optional(),
  batchId: z.string().optional(),
  branchId: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(['createdAt','accountName','participantName','enrollmentNumber','billingStatus']).default('createdAt'),
  sortOrder: z.enum(['asc','desc']).default('desc')
});
```

### Success – 200

```ts
type CorporateEnrollmentListItemDto = {
  corporateEnrollmentId: string;
  account: { id: string; code: string; name: string };
  participant: { id: string; personId: string; displayName: string; employeeCode: string | null };
  enrollment: { id: string; number: string; status: string; branchId: string };
  course: { id: string; code: string; name: { en: string; ar: string | null } };
  batch: { id: string; code: string; startDate: string; endDate: string };
  contract: { id: string; number: string } | null;
  billingStatus: string;
  completionStatus: string | null;
  certificateStatus: string | null;
};
```

---

## API-CTM-030 – Corporate Enrollment Detail

**GET** `/corporate-enrollments/{corporateEnrollmentId}`

**Permission:** `corporate-training.enrollment.read`; sensitive subsections require owner-context read permissions.

**Scope:** Corporate account and Enrollment branch must be in effective read scope.

### Success – 200

```ts
type CorporateEnrollmentDetailDto = {
  corporateEnrollment: {
    id: string;
    accountId: string;
    participantId: string;
    enrollmentId: string;
    contractId: string | null;
    billingStatus: string;
    version: number;
  };
  participant: CorporateParticipantDto;
  enrollment: { id: string; number: string; type: string; status: string; branchId: string; confirmedAt: string | null; completedAt: string | null };
  course: { id: string; code: string; name: { en: string; ar: string | null } };
  batch: { id: string; code: string; name: string; startDate: string; endDate: string };
  scheduleSummary?: { nextSessionAt: string | null; completedSessions: number; totalSessions: number };
  attendanceSummary?: { percentage: number | null; present: number; absent: number; late: number; excused: number };
  completion?: { status: string; approvedAt: string | null };
  certificate?: { status: string; certificateNumber: string | null; issuedDate: string | null };
  finance?: { currency: string; invoiced: string; paid: string; outstanding: string };
  documents?: { pendingVerification: number; expired: number };
  projectionAsOf: string;
};
```

Unauthorized sections are omitted.

### Errors

403 permission/scope; 404 link not found; 503 dependency unavailable.

---

## API-CTM-031 – Billing Coordination Status Transition

**POST** `/corporate-enrollments/{corporateEnrollmentId}/billing-status-transitions`

**Permission:** `corporate-training.enrollment.billing-status.manage`.

**Scope:** Write scope.

### Request

```ts
z.object({
  toStatus: z.enum(['PENDING_BILLING','BILLING_REQUESTED','INVOICED','PARTIALLY_PAID','PAID','ON_HOLD','CANCELLED']),
  sourceReference: z.object({
    context: z.enum(['CTM','FINANCE']),
    entityId: z.string().min(1)
  }).optional(),
  reason: z.string().trim().min(3).max(1000),
  version: z.number().int().min(1)
});
```

Finance-backed states (`INVOICED`, `PARTIALLY_PAID`, `PAID`) require verification against Finance owner data; CTM cannot self-declare them.

### Success – 200

Status transition DTO.

### Errors

409 invalid transition/version; 422 `CTM_BILLING_STATUS_NOT_SUPPORTED_BY_FINANCE_TRUTH`.

---

# 11. Enrollment Link Reconciliation APIs

## API-CTM-032 – Find Reconciliation Candidates

**GET** `/enrollment-link-reconciliation`

**Permission:** `corporate-training.reconciliation.read`.

**Scope:** Read scope only.

### Query

```ts
z.object({
  accountId: z.string().optional(),
  branchId: z.string().optional(),
  issueType: z.enum(['MISSING_LINK','DUPLICATE_LINK','ACCOUNT_MISMATCH','PARTICIPANT_MISMATCH']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});
```

### Success – 200

```ts
type ReconciliationCandidateDto = {
  enrollmentId: string;
  enrollmentNumber: string;
  branchId: string;
  corporateParticipantId: string | null;
  inferredAccountId: string | null;
  existingCorporateEnrollmentIds: string[];
  issueType: 'MISSING_LINK'|'DUPLICATE_LINK'|'ACCOUNT_MISMATCH'|'PARTICIPANT_MISMATCH';
  repairableAutomatically: boolean;
  blockers: string[];
};
```

---

## API-CTM-033 – Repair Corporate Enrollment Link

**POST** `/enrollment-link-reconciliation/{enrollmentId}/repair`

**Permission:** `corporate-training.reconciliation.repair`.

**Scope:** Enrollment branch and account scope must both authorize write.

### Request

```ts
z.object({
  corporateAccountId: z.string().min(1),
  corporateParticipantId: z.string().min(1),
  contractId: z.string().min(1).nullable().optional(),
  reason: z.string().trim().min(10).max(2000),
  idempotencyKey: z.string().uuid()
});
```

### Processing

Verifies Enrollment owner facts, participant/account relationship, enrollment type, absence of valid existing link, contract applicability where supplied, and branch/account authorization before creating CTM linkage.

### Success – 201

```ts
{ corporateEnrollmentId: string; enrollmentId: string; repairedAt: string; auditReference: string }
```

### Errors

409 duplicate link/idempotency; 422 `CTM_RECONCILIATION_EVIDENCE_MISMATCH`; 422 `CTM_RECONCILIATION_NOT_REPAIRABLE`.

---

# 12. Report Export APIs

## API-CTM-034 – Request CTM Report Export

**POST** `/reports/exports`

**Permission:** One of the report permissions matching requested report type, plus `corporate-training.report.export`.

**Scope:** Export filters are intersected with authorized read scope. Consolidated exports require explicit consolidated-report permission.

### Request

```ts
z.object({
  reportType: z.enum([
    'CORPORATE_ACCOUNT_SUMMARY',
    'CORPORATE_PARTICIPANT_ROSTER',
    'CORPORATE_ENROLLMENT_STATUS',
    'CORPORATE_TRAINING_PROGRESS',
    'CORPORATE_CERTIFICATE_STATUS',
    'CORPORATE_REVENUE_SUMMARY'
  ]),
  format: z.enum(['CSV','XLSX','PDF']),
  filters: z.object({
    accountId: z.string().optional(),
    branchId: z.string().optional(),
    courseId: z.string().optional(),
    batchId: z.string().optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    statuses: z.array(z.string().max(50)).max(20).optional()
  }),
  locale: z.enum(['en','ar']).default('en')
});
```

### Success – 202

```ts
{ exportId: string; status: 'QUEUED'|'PROCESSING'; requestedAt: string }
```

This contract does not mandate an external broker. Execution may use the repository's internal job mechanism appropriate to the modular monolith.

### Errors

403 report/export/consolidated permission; 422 unsupported filter combination.

---

## API-CTM-035 – Get Export Status

**GET** `/reports/exports/{exportId}`

**Permission:** Same report permission and requester/admin authorization.

### Success – 200

```ts
type ExportStatusDto = {
  exportId: string;
  status: 'QUEUED'|'PROCESSING'|'COMPLETED'|'FAILED'|'EXPIRED';
  reportType: string;
  format: 'CSV'|'XLSX'|'PDF';
  requestedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  downloadUrl: string | null;
  failureCode: string | null;
};
```

The URL is short-lived and authorization-scoped.

---

# 13. Student Portal APIs

## API-CTM-036 – My Corporate Training Details

**GET** `/api/v1/student/corporate-training/enrollments/{enrollmentId}`

**Authentication:** Student portal authenticated session.

**Permission:** `student.corporate-training.self.read`.

**Scope:** `SELF`. Server verifies enrollment belongs to authenticated `studentProfileId`. No branch override query parameter is accepted.

### Success – 200

```ts
type StudentCorporateTrainingDetailDto = {
  enrollmentId: string;
  enrollmentNumber: string;
  corporateAccount: { id: string; name: string };
  employerContext: { employeeCode: string | null; department: string | null; designation: string | null };
  course: { code: string; name: { en: string; ar: string | null } };
  batch: { code: string; name: string; startDate: string; endDate: string; branchName: string };
  enrollmentStatus: string;
};
```

### Errors

403 self-scope denied; 404 enrollment/link not found.

---

## API-CTM-037 – My Corporate Training Status

**GET** `/api/v1/student/corporate-training/enrollments/{enrollmentId}/status`

**Permission:** `student.corporate-training.self.read`.

**Scope:** SELF.

### Success – 200

```ts
type StudentCorporateTrainingStatusDto = {
  enrollmentStatus: string;
  nextSession: { startsAt: string; venue: string | null } | null;
  attendance: { percentage: number | null; statusSummary: Record<string, number> };
  completion: { status: string; approvedAt: string | null } | null;
  certificate: { status: string; certificateNumber: string | null; downloadAllowed: boolean } | null;
  finance: { paymentStatus: string; outstandingAmount?: string; currency?: string } | null;
  projectionAsOf: string;
};
```

Finance fields are included only when student-facing policy and permission permit.

### Errors

403 self scope; 404; 503 projection dependency unavailable.

---

# 14. Trainer Portal APIs

## API-CTM-038 – Assigned Corporate Trainings

**GET** `/api/v1/trainer/corporate-training/assignments`

**Authentication:** Trainer portal session.

**Permission:** `trainer.corporate-training.assignment.read`.

**Scope:** Only batches for which authenticated TrainerProfile has a valid assignment in Training Delivery.

### Query

```ts
z.object({
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  status: z.enum(['UPCOMING','RUNNING','COMPLETED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});
```

### Success – 200

```ts
type TrainerCorporateAssignmentDto = {
  batchId: string;
  batchCode: string;
  courseName: { en: string; ar: string | null };
  corporateAccounts: Array<{ id: string; name: string }>;
  startDate: string;
  endDate: string;
  venue: string | null;
  participantCount: number;
  assignmentRole: string;
};
```

### Errors

403 assigned scope; 503 Training Delivery dependency unavailable.

---

## API-CTM-039 – Corporate Batch Participant Roster

**GET** `/api/v1/trainer/corporate-training/batches/{batchId}/participants`

**Permission:** `trainer.corporate-training.roster.read`.

**Scope:** `ASSIGNED_BATCH`; server verifies trainer assignment validity for the batch and date.

### Query

```ts
z.object({
  q: z.string().trim().max(200).optional(),
  accountId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});
```

### Success – 200

```ts
type TrainerCorporateRosterItemDto = {
  enrollmentId: string;
  participantId: string;
  displayName: string;
  employeeCode: string | null;
  corporateAccount: { id: string; name: string };
  enrollmentStatus: string;
  identityVerificationStatus: string | null;
};
```

Sensitive identity numbers are not returned by default. Attendance mutation is intentionally not exposed in CTM.

### Errors

403 `CTM_TRAINER_BATCH_ACCESS_DENIED`; 404 batch not found; 503 dependency unavailable.

---

# 15. Server Actions Mapping

The admin portal may use typed Server Actions as an internal presentation adapter. Server Actions must call the same CTM application services and authorization policies as REST handlers; they are not an alternate business-logic implementation.

| Server Action | Maps To Application Service | Equivalent REST Contract |
|---|---|---|
| `createCorporateAccountAction` | `CreateCorporateAccountCommand` | API-CTM-002 |
| `updateCorporateAccountAction` | `UpdateCorporateAccountCommand` | API-CTM-004 |
| `changeCorporateAccountStatusAction` | `ChangeCorporateAccountStatusCommand` | API-CTM-005 |
| `addCorporateContactAction` | `AddCorporateContactCommand` | API-CTM-009 |
| `updateCorporateContactAction` | `UpdateCorporateContactCommand` | API-CTM-010 |
| `setPrimaryCorporateContactAction` | `SetPrimaryCorporateContactCommand` | API-CTM-012 |
| `createCorporateContractAction` | `CreateCorporateContractCommand` | API-CTM-014 |
| `changeContractStatusAction` | `ChangeCorporateContractStatusCommand` | API-CTM-017 |
| `registerCorporateParticipantAction` | `RegisterCorporateParticipantCommand` | API-CTM-019 |
| `changeParticipantStatusAction` | `ChangeCorporateParticipantStatusCommand` | API-CTM-022 |
| `commitParticipantImportAction` | `CommitParticipantImportCommand` | API-CTM-025 |
| `createCorporateEnrollmentAction` | `CreateCorporateEnrollmentOrchestration` | API-CTM-027 |
| `bulkCorporateEnrollmentAction` | `BulkCorporateEnrollmentOrchestration` | API-CTM-028 |
| `repairCorporateEnrollmentLinkAction` | `RepairCorporateEnrollmentLinkCommand` | API-CTM-033 |
| `requestCorporateTrainingExportAction` | `RequestCorporateTrainingExport` | API-CTM-034 |

Server Action input schemas, permissions, scope policy, idempotency, concurrency and error codes must remain identical to their REST counterparts.

---

# 16. Permission-to-Endpoint Matrix

| Permission | Endpoints |
|---|---|
| `corporate-training.account.read` | 001, 003, 007 |
| `corporate-training.account.create` | 002 |
| `corporate-training.account.update` | 004 |
| `corporate-training.account.status.manage` | 005 |
| `corporate-training.account.archive` | 006 |
| `corporate-training.contact.read` | 008 |
| `corporate-training.contact.create` | 009 |
| `corporate-training.contact.update` | 010, 012 |
| `corporate-training.contact.deactivate` | 011 |
| `corporate-training.contract.read` | 013, 015 |
| `corporate-training.contract.create` | 014 |
| `corporate-training.contract.update` | 016 |
| `corporate-training.contract.status.manage` | 017 |
| `corporate-training.participant.read` | 018, 020 |
| `corporate-training.participant.create` | 019 |
| `corporate-training.participant.update` | 021 |
| `corporate-training.participant.status.manage` | 022 |
| `corporate-training.participant.import` | 023, 024, 026 |
| `corporate-training.participant.import.commit` | 025 |
| `corporate-training.enrollment.create` | 027 |
| `corporate-training.enrollment.bulk.create` | 028 |
| `corporate-training.enrollment.read` | 029, 030 |
| `corporate-training.enrollment.billing-status.manage` | 031 |
| `corporate-training.reconciliation.read` | 032 |
| `corporate-training.reconciliation.repair` | 033 |
| `corporate-training.report.export` | 034, 035 plus report-specific permission |
| `student.corporate-training.self.read` | 036, 037 |
| `trainer.corporate-training.assignment.read` | 038 |
| `trainer.corporate-training.roster.read` | 039 |

---

# 17. Cross-Context Dependency and API Boundary Mapping

| CTM Operation | Dependency Owner | Interaction | CTM May Do | CTM Must Not Do |
|---|---|---|---|---|
| Create account | Organization | Resolve Organization | Reference organizationId | Update Organization legal identity directly |
| Add contact | Person/Party | Resolve Person | Create CTM relationship | Duplicate Person identity |
| Register participant | Person/Party | Resolve/create Person through owner service | Create participant relationship | Insert Person table directly |
| Corporate enrollment | Course Catalog | Read course/pricing rules | Consume resolved result | Calculate authoritative price/discount in UI or CTM repository |
| Corporate enrollment | Training Delivery | Validate Batch/course/capacity | Consume validation | Update Batch count directly |
| Corporate enrollment | Scheduling | Feasibility read | Consume validation | Create/reschedule sessions in CTM |
| Corporate enrollment | Finance | Credit validation | Consume pass/block result | Compute receivable truth locally |
| Corporate enrollment | Admission & Enrollment | Create/link StudentProfile and Enrollment | Orchestrate owner service | Insert Enrollment directly |
| Operations detail | Attendance | Read projection | Display | Mark/correct attendance |
| Operations detail | Exam & Completion | Read projection | Display | Approve completion |
| Operations detail | Certificate | Read projection | Display/download | Generate/reissue/revoke certificate |
| Operations detail | Finance | Read invoice/payment projection | Display when authorized | Record payment/refund |
| Account 360 | Documents | Read verification projection | Display | Verify/reject documents |
| Exports | Reporting | Multi-context report composition | Request/export scoped result | Own foreign transactions |
| All sensitive writes | Audit & Compliance | Audit recording | Emit/record audit action | Allow client to supply audit identity |

---

# 18. Idempotency and Concurrency Rules

## 18.1 Idempotency Required

The following operations require an idempotency key:

- single corporate enrollment;
- bulk corporate enrollment;
- participant import commit;
- reconciliation repair;
- any future retryable command that can create duplicate cross-context side effects.

Idempotency storage must include:

```text
principal/user
operation type
scope/account
idempotency key
normalized request hash
result reference
createdAt
expiry policy
```

Same key + same request returns prior successful result. Same key + different request hash returns `409 IDEMPOTENCY_KEY_REUSE_CONFLICT`.

## 18.2 Optimistic Concurrency Required

`version` is required for updates, archives, and status transitions on mutable CTM entities. SQL/Prisma update condition must include both `id` and expected `version`; zero affected rows yields `CTM_VERSION_CONFLICT` unless record is absent/out of scope.

---

# 19. Validation and Security Rules

1. Zod validation occurs at the Route Handler/Server Action boundary.
2. Domain invariants are rechecked in application/domain services; client validation is advisory only.
3. IDs are opaque and never imply authorization.
4. User-supplied `createdBy`, `updatedBy`, `deletedBy`, outstanding balance, completion status, certificate status, or audit identity fields are rejected/ignored.
5. Sensitive Person identity data is masked unless explicit identity permission exists.
6. Bulk files are validated for content type, extension, size, template signature, row count, malicious formula payload risk, and storage retention policy.
7. Export URLs are short-lived and requester/scope bound.
8. Cross-context composite endpoints apply field-level permission filtering before DTO serialization.
9. Error responses must not reveal whether an out-of-scope identifier exists; use scoped 404 where appropriate.
10. Every sensitive write records request ID/correlation ID for traceability.

---

# 20. DDD Fit Check

| API Area | Application Service / Use Case | Owning Context | Fit Result |
|---|---|---|---|
| Account CRUD/lifecycle | Create/Update/Search/ChangeStatus Corporate Account | CTM | Aligned |
| Contact management | Add/Update/Deactivate/SetPrimary Contact | CTM with Person reference | Aligned |
| Contract management | Create/Update/Transition Contract | CTM | Aligned |
| Participant management | Register/Update/Transition Participant | CTM with Person resolution | Aligned |
| Participant import | Validate and commit CTM participant relationships | CTM | Aligned; not modeled as Nomination aggregate |
| Single enrollment | Corporate enrollment orchestration | CTM coordinator; Enrollment owner performs creation | Aligned if implementation uses owner service |
| Bulk enrollment | Bulk orchestration with per-participant outcomes | CTM coordinator | Aligned |
| Operational reads | CTM linkage plus foreign-context projections | CTM composition/read boundary | Aligned; foreign fields read-only |
| Billing coordination status | CTM linkage state verified against Finance truth | CTM + Finance validation | Aligned with explicit guard |
| Reconciliation | Restore missing CTM linkage only | CTM | Aligned; Enrollment content remains untouched |
| Student status views | Self-scoped composite query | Read composition | Aligned |
| Trainer roster views | Training Delivery assignment authorization + CTM projection | Read composition | Aligned |
| Reports/export | Reporting consumer/provider boundary | Reporting + CTM data provider | Aligned |

---

# 21. Known API Architecture Gaps and Blocking Decisions

## GAP-CTM-API-001 – Corporate Account Branch Scope Persistence

Part 4 identifies no approved direct branch relationship on `CorporateAccount`. The endpoint contracts require a server-side `CorporateAccountScopePolicy`, but production implementation must not be released until the DDD/ER model defines how pre-enrollment accounts are branch-scoped.

## GAP-CTM-API-002 – Credit Fields Ownership Reconciliation

The ER includes credit fields on CorporateAccount while Finance owns corporate credit validation and receivables truth. API implementation must resolve whether CTM fields are Finance-maintained projections or compatibility fields. `currentOutstanding` is never client-writable in this contract.

## GAP-CTM-API-003 – Corporate Contact Status

Part 4 introduced contact status to support deactivate behavior required by FRD lifecycles, but the current ER model does not define that field. Schema baseline must be reconciled before implementation.

## GAP-CTM-API-004 – Durable Corporate Nomination

No CRUD API for CorporateNomination is defined. Participant import is a staged input process only until DDD and ER ownership/model are approved.

## GAP-CTM-API-005 – Corporate Training Program/Project

No Project/Program CRUD, project-status, project-costing, or project-closure API is defined because persistence ownership is unresolved.

## GAP-CTM-API-006 – Equipment, Travel, Accommodation and Costing

No APIs are defined for these workflow concepts until bounded-context ownership and ER entities are approved.

## GAP-CTM-API-007 – GIVT

No GIVT-specific API is invented. The workflow asks for separate handling/reporting, but the DDD/ER baseline requires an explicit architectural decision before endpoints are introduced.

---

# 22. Final API Boundary Statement

This API contract keeps Corporate Training Management as a cohesive bounded context within the modular monolith:

- CTM owns corporate relationship records and corporate-to-enrollment linkage.
- Person and Organization identities are reused, not duplicated.
- Enrollment remains the central learning aggregate and is created by its owning context.
- Course, Batch, Scheduling, Finance, Attendance, Completion, Certificate, Document, IAM, Reporting, and Audit ownership remains intact.
- Branch isolation, dynamic permissions, optimistic concurrency, idempotency, soft deletion, and audit traceability are server-enforced.
- Workflow concepts that lack approved DDD/ER ownership are explicitly excluded from API design rather than materialized by assumption.
