# Part 5 – API Contracts

## Module 13 – Document Management

## 1. Purpose and Contract Boundary

This document defines the REST API and Next.js Server Action contracts for Module 13 – Document Management. It translates the approved Module 13 requirements, use cases, screens, state machines, and persistence boundaries into concrete service interfaces.

The contract is designed for the ASTI IMS modular-monolith architecture. All endpoints are internal application boundaries within the same deployable system unless explicitly exposed through a future portal application. The design does not require microservices, an external message broker, CQRS, or Event Sourcing.

### 1.1 Contract principles

1. `Document` and `DocumentVerification` are the only current Document Management-owned business persistence entities.
2. Vercel Blob stores document binaries; the IMS database stores authoritative document metadata and lifecycle state.
3. Student, Trainer, Corporate Account, Person, User, Branch, AuditLog, NotificationRequest, and reporting data remain owned by their respective bounded contexts.
4. Every protected operation authenticates the current principal server-side.
5. Authorization uses dynamic permissions, not hardcoded role names.
6. Branch visibility is resolved server-side from the document owner and IAM branch access. A request-supplied `branchId` is never accepted as proof of authorization.
7. All direct-ID operations re-resolve document scope; knowledge of a valid UUID never grants access.
8. No hard-delete endpoint exists.
9. Verification decisions are state transitions, not generic PATCH operations.
10. Approval/rejection and immutable `DocumentVerification` creation occur atomically.
11. Cross-context lookups use application services, repositories exposed through module boundaries, or approved read models. Document Management must not directly mutate another context's aggregate.
12. Binary upload/download flows must not expose Vercel Blob credentials or unrestricted permanent access URLs to unauthorized clients.
13. Mutation commands that can be retried must be designed for idempotency where duplicate execution could create duplicate records or side effects.
14. All timestamps in API payloads use ISO 8601 UTC representation. Business date fields use `YYYY-MM-DD`.
15. Bilingual labels are display data resolved through source contexts/configuration; API identifiers remain locale-neutral.

---

# 2. API Style and Base Conventions

## 2.1 Base route

```text
/api/documents
```

Admin Portal UI routes such as `/documents`, `/documents/new`, and `/documents/{id}` are not API endpoints. They call the application services defined in this contract through Route Handlers or Server Actions.

## 2.2 Response envelope

### Success response

```json
{
  "data": {},
  "meta": {
    "requestId": "req_01J..."
  }
}
```

For collection endpoints:

```json
{
  "data": [],
  "meta": {
    "requestId": "req_01J...",
    "page": 1,
    "pageSize": 25,
    "totalItems": 127,
    "totalPages": 6,
    "sort": "createdAt:desc"
  }
}
```

## 2.3 Error envelope

```json
{
  "error": {
    "code": "DOCUMENT_INVALID_STATE_TRANSITION",
    "message": "The document cannot be approved from its current state.",
    "fieldErrors": {
      "verificationStatus": [
        "Expected PendingVerification but found Uploaded."
      ]
    },
    "details": {
      "currentStatus": "Uploaded",
      "allowedStatuses": ["PendingVerification"]
    },
    "requestId": "req_01J..."
  }
}
```

Rules:

- Error messages returned to UI must be safe for display.
- Storage credentials, Blob tokens, SQL errors, stack traces, internal path names, and inaccessible owner details must never be returned.
- `fieldErrors` is optional and used for validation failures.
- `details` is optional and must contain only non-sensitive structured context.

## 2.4 Authentication model

All current Admin Portal endpoints require an authenticated IMS user session unless explicitly marked otherwise.

Authentication context must provide at minimum:

```ts
interface AuthenticatedPrincipal {
  userId: string;
  personId: string;
  permissions: string[];
  assignedBranchIds: string[];
  defaultBranchId: string | null;
  canViewConsolidated: boolean;
  canViewChildBranches: boolean;
}
```

The endpoint must never trust permissions or branch lists submitted by the client.

## 2.5 Branch-scope algorithm

For document-bound operations:

```text
1. Authenticate principal.
2. Authorize required permission.
3. Load Document without exposing it to caller.
4. Resolve ownerType + ownerId.
5. Resolve owner's branch scope through owning context / approved read model.
6. Expand principal scope according to IAM parent-child branch rules.
7. Compare owner scope with effective principal branch scope.
8. Permit or deny.
9. Apply soft-delete/state guards.
10. Execute query or command.
```

For generic `Person` owner documents, no branch resolver is defined in the current ER baseline. Until an approved resolver exists, operations must fail closed where branch scope cannot be deterministically established.

Recommended failure:

```text
403 DOCUMENT_SCOPE_UNRESOLVED
```

rather than treating the Person record as globally visible.

## 2.6 Standard validation limits

Unless the actual Prisma schema or approved configuration is stricter:

| Field | Contract rule |
|---|---|
| UUID identifiers | Valid repository-standard UUID/CUID format; examples use UUID |
| `fileName` | 1–255 characters after normalization |
| `documentType` | Required active configured value or schema-valid scalar |
| `issueDate` | Optional `YYYY-MM-DD` |
| `expiryDate` | Optional `YYYY-MM-DD`; must be on/after `issueDate` when both supplied |
| `remarks` | Trimmed; maximum 2,000 characters for verification remarks |
| `page` | Integer, minimum 1, default 1 |
| `pageSize` | Integer 1–100, default 25 |
| sort | Allow-list only |
| date ranges | `from <= to` |
| file | Allowed MIME type and size limits from server configuration; client metadata is not authoritative |

---

# 3. Endpoint Inventory

## 3.1 Current Admin/API surface

| ID | Method | Route / Action | Purpose | Primary Permission |
|---|---|---|---|---|
| API-DOC-001 | POST | `/api/documents/upload-intent` | Validate owner/type/scope and prepare controlled Blob upload | `document.create` |
| API-DOC-002 | POST | `/api/documents` | Register completed Blob upload and create Document metadata | `document.create` |
| API-DOC-003 | GET | `/api/documents` | List/search/filter accessible documents | `document.read` |
| API-DOC-004 | GET | `/api/documents/{documentId}` | Read accessible document detail | `document.read` |
| API-DOC-005 | PATCH | `/api/documents/{documentId}` | Update permitted metadata | `document.update` |
| API-DOC-006 | POST | `/api/documents/{documentId}/submit-verification` | Transition Uploaded to PendingVerification | `document.verify.submit` |
| API-DOC-007 | GET | `/api/documents/verification-queue` | List accessible PendingVerification items | `document.verify.read` |
| API-DOC-008 | POST | `/api/documents/{documentId}/approve` | Approve pending document and append verification history | `document.verify.approve` |
| API-DOC-009 | POST | `/api/documents/{documentId}/reject` | Reject pending document and append verification history | `document.verify.reject` |
| API-DOC-010 | GET | `/api/documents/{documentId}/history` | Read immutable verification history and permitted audit references | `document.history.read` |
| API-DOC-011 | POST | `/api/documents/{documentId}/file-access` | Issue controlled short-lived file access response | `document.file.read` |
| API-DOC-012 | GET | `/api/documents/expiry` | List expired/expiring documents in scope | `document.expiry.read` |
| API-DOC-013 | DELETE | `/api/documents/{documentId}` | Soft-retire document; never hard delete | `document.retire` |
| API-DOC-014 | GET | `/api/documents/operations/reconciliation` | List operational Blob/database inconsistencies | `document.operations.reconcile` |
| API-DOC-015 | POST | `/api/documents/operations/reconciliation/{itemId}/retry` | Retry approved reconciliation action | `document.operations.reconcile` |
| API-DOC-016 | GET | `/api/document-types` | Resolve active document types for UI selection | permission inherited from calling use case; Configuration-owned read boundary |
| API-DOC-017 | GET | `/api/document-owners/search` | Search valid owners for association using cross-context read adapters | `document.create` or `document.update` |

### 3.1.1 Server Action mapping

A Next.js implementation may expose typed Server Actions instead of direct browser calls for mutations:

```text
createDocumentUploadIntentAction
registerDocumentAction
updateDocumentMetadataAction
submitDocumentForVerificationAction
approveDocumentAction
rejectDocumentAction
retireDocumentAction
retryDocumentReconciliationAction
```

The Server Action contract must preserve the same authentication, permission, branch-scope, validation, state-transition, transaction, audit, and error semantics defined below. A Server Action is not allowed to bypass the application service.

---

# 4. Common DTOs

## 4.1 Enumerations

```ts
type DocumentOwnerType =
  | "Student"
  | "Trainer"
  | "Corporate"
  | "Person";

type DocumentVerificationStatus =
  | "Uploaded"
  | "PendingVerification"
  | "Approved"
  | "Rejected"
  | "Expired";
```

`Employee` is not accepted in current scope because HRMS is future phase.

## 4.2 Document summary DTO

```ts
interface DocumentSummaryDto {
  id: string;
  owner: {
    ownerType: DocumentOwnerType;
    ownerId: string;
    displayName: string;
    referenceNumber?: string | null;
  };
  documentType: {
    code: string;
    label: string;
    labelLocalized?: {
      en?: string;
      ar?: string;
    } | null;
  };
  fileName: string;
  issueDate: string | null;
  expiryDate: string | null;
  verificationStatus: DocumentVerificationStatus;
  expiry: {
    state: "NoExpiry" | "Valid" | "ExpiringSoon" | "Expired";
    daysRemaining: number | null;
  };
  uploadedBy: {
    userId: string;
    displayName: string;
  };
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

The DTO deliberately does not return a permanent Blob URL.

## 4.3 Document detail DTO

```ts
interface DocumentDetailDto extends DocumentSummaryDto {
  verifiedBy: {
    userId: string;
    displayName: string;
  } | null;
  verifiedAt: string | null;
  lifecycle: {
    canEditMetadata: boolean;
    canSubmitForVerification: boolean;
    canApprove: boolean;
    canReject: boolean;
    canRetire: boolean;
    canReadFile: boolean;
  };
  historySummary: {
    verificationDecisionCount: number;
    latestDecisionAt: string | null;
  };
}
```

UI action booleans are convenience hints only. They do not replace server authorization when an action is submitted.

## 4.4 Verification history DTO

```ts
interface DocumentVerificationDto {
  id: string;
  documentId: string;
  status: "Approved" | "Rejected";
  remarks: string | null;
  verifiedBy: {
    userId: string;
    displayName: string;
  };
  verifiedAt: string;
}
```

---

# 5. Detailed Endpoint Contracts

## API-DOC-001 – Create Upload Intent

### Route

```text
POST /api/documents/upload-intent
```

### Purpose

Validate the intended document owner, document type, branch scope, and preliminary file metadata before allowing a controlled upload through the Vercel Blob adapter.

This endpoint does not create the authoritative `Document` record.

### Authentication

Required authenticated IMS session.

### Required permission

```text
document.create
```

### Branch scoping

- Resolve the target owner in its owning context.
- Derive the owner's branch visibility.
- Require intersection with effective principal branch scope.
- Fail closed if scope cannot be resolved.
- Do not accept client `branchId` as authorization evidence.

### Request schema

```ts
interface CreateUploadIntentRequest {
  ownerType: DocumentOwnerType;
  ownerId: string;
  documentType: string;
  file: {
    fileName: string;
    contentType: string;
    sizeBytes: number;
  };
}
```

Example:

```json
{
  "ownerType": "Student",
  "ownerId": "1e5da4f2-8ce0-4385-983d-9e113cc71e54",
  "documentType": "PASSPORT",
  "file": {
    "fileName": "passport.pdf",
    "contentType": "application/pdf",
    "sizeBytes": 482190
  }
}
```

### Processing

1. Authenticate.
2. Authorize `document.create`.
3. Validate request shape.
4. Reject unsupported owner type.
5. Validate owner existence and active/non-deleted state through owning context boundary.
6. Resolve branch scope and authorize.
7. Validate document type is active/allowed.
8. Validate filename, size, and MIME type against server-side configuration.
9. Create a short-lived upload intent/token through storage adapter.
10. Record observable operational metadata as permitted by architecture; do not create Document yet.

### Success DTO – `200 OK`

```ts
interface UploadIntentDto {
  uploadId: string;
  expiresAt: string;
  upload: {
    mode: "vercel-blob-client-upload" | "server-proxy";
    token?: string;
    endpoint?: string;
    maxSizeBytes: number;
    allowedContentTypes: string[];
  };
}
```

Security note: return only the minimal short-lived upload credential required by the selected Vercel Blob pattern. Never expose long-lived storage credentials.

### Error responses

| HTTP | Code | Condition |
|---|---|---|
| 400 | `DOCUMENT_REQUEST_INVALID` | Invalid body or file metadata |
| 400 | `DOCUMENT_OWNER_TYPE_UNSUPPORTED` | Owner type outside current ER scope |
| 400 | `DOCUMENT_FILE_TYPE_NOT_ALLOWED` | MIME/extension policy violation |
| 413 | `DOCUMENT_FILE_TOO_LARGE` | Size exceeds configured limit |
| 401 | `AUTHENTICATION_REQUIRED` | No valid session |
| 403 | `DOCUMENT_PERMISSION_DENIED` | Missing permission |
| 403 | `DOCUMENT_BRANCH_ACCESS_DENIED` | Owner outside branch scope |
| 403 | `DOCUMENT_SCOPE_UNRESOLVED` | Owner branch scope cannot be securely resolved |
| 404 | `DOCUMENT_OWNER_NOT_FOUND` | Owner does not exist/is not available to operation |
| 409 | `DOCUMENT_TYPE_INACTIVE` | Selected type is no longer active |
| 503 | `DOCUMENT_STORAGE_UNAVAILABLE` | Vercel Blob/storage adapter unavailable |

---

## API-DOC-002 – Register Uploaded Document

### Route

```text
POST /api/documents
```

### Purpose

Create the authoritative `Document` metadata record after a Blob upload has successfully completed and been validated by the server-side storage adapter.

### Authentication

Required.

### Required permission

```text
document.create
```

### Branch scoping

Re-run owner existence and branch-scope validation. Authorization performed at upload-intent time is not sufficient because scope or owner state may have changed.

### Request schema

```ts
interface RegisterDocumentRequest {
  uploadId: string;
  ownerType: DocumentOwnerType;
  ownerId: string;
  documentType: string;
  fileName: string;
  issueDate?: string | null;
  expiryDate?: string | null;
}
```

The request must not accept `uploadedBy`, `createdBy`, `verificationStatus`, `verifiedBy`, `verifiedAt`, `fileUrl`, `isActive`, or `version` from the client.

### Processing

1. Authenticate and authorize.
2. Validate owner and branch scope again.
3. Validate type and dates.
4. Resolve `uploadId` through storage adapter/server upload ledger.
5. Verify upload belongs to current principal or allowed workflow and has not already been consumed.
6. Confirm Blob object exists and matches validated metadata.
7. Create Document with:
   - status `Uploaded`;
   - authenticated uploader/audit identity;
   - active/not-deleted state;
   - version `1`.
8. Mark upload intent consumed atomically/idempotently where architecture supports it.
9. Emit/record audit side effect according to Audit boundary.
10. Return created DTO.

### Success DTO – `201 Created`

```ts
interface RegisterDocumentResponse {
  document: DocumentDetailDto;
}
```

### Error responses

| HTTP | Code | Condition |
|---|---|---|
| 400 | `DOCUMENT_REQUEST_INVALID` | Invalid fields |
| 400 | `DOCUMENT_DATE_RANGE_INVALID` | expiry before issue date |
| 401 | `AUTHENTICATION_REQUIRED` | Missing session |
| 403 | `DOCUMENT_PERMISSION_DENIED` | Missing create permission |
| 403 | `DOCUMENT_BRANCH_ACCESS_DENIED` | Scope denied |
| 404 | `DOCUMENT_OWNER_NOT_FOUND` | Owner invalid |
| 404 | `DOCUMENT_UPLOAD_NOT_FOUND` | Unknown/expired upload intent |
| 409 | `DOCUMENT_UPLOAD_ALREADY_CONSUMED` | Duplicate registration attempt |
| 409 | `DOCUMENT_TYPE_INACTIVE` | Type disabled before registration |
| 422 | `DOCUMENT_STORAGE_OBJECT_INVALID` | Blob missing or metadata mismatch |
| 503 | `DOCUMENT_STORAGE_UNAVAILABLE` | Blob validation unavailable |

### Idempotency

The server should treat `uploadId` as a uniqueness/idempotency key. Repeating registration must not create multiple Documents for the same completed upload.

---

## API-DOC-003 – List and Search Documents

### Route

```text
GET /api/documents
```

### Purpose

Return paginated, filtered, sorted documents visible to the authenticated principal.

### Authentication

Required.

### Required permission

```text
document.read
```

### Branch scoping

Mandatory server-side row filtering by owner-derived scope.

### Query schema

```ts
interface ListDocumentsQuery {
  ownerType?: DocumentOwnerType;
  ownerId?: string;
  documentType?: string;
  verificationStatus?: DocumentVerificationStatus;
  issueDateFrom?: string;
  issueDateTo?: string;
  expiryDateFrom?: string;
  expiryDateTo?: string;
  expiryState?: "NoExpiry" | "Valid" | "ExpiringSoon" | "Expired";
  expiringWithinDays?: number;
  search?: string;
  page?: number;
  pageSize?: number;
  sort?:
    | "createdAt:asc" | "createdAt:desc"
    | "updatedAt:asc" | "updatedAt:desc"
    | "expiryDate:asc" | "expiryDate:desc"
    | "fileName:asc" | "fileName:desc";
}
```

### Processing

1. Authenticate and authorize.
2. Parse filter allow-list.
3. Build effective branch scope from IAM.
4. Apply active/not-deleted default filter.
5. Resolve owner-derived branch predicates through approved query/read model approach.
6. Apply requested filters.
7. Use deterministic tie-breaker ordering, normally `id` after selected sort.
8. Paginate.
9. Resolve owner display summaries without transferring ownership.
10. Return safe summary DTOs without Blob URLs.

### Success DTO – `200 OK`

```ts
interface ListDocumentsResponse {
  data: DocumentSummaryDto[];
  meta: {
    requestId: string;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    sort: string;
  };
}
```

### Error responses

| HTTP | Code | Condition |
|---|---|---|
| 400 | `DOCUMENT_FILTER_INVALID` | Invalid filter/date range/sort |
| 401 | `AUTHENTICATION_REQUIRED` | No session |
| 403 | `DOCUMENT_PERMISSION_DENIED` | Missing read permission |
| 422 | `DOCUMENT_SCOPE_QUERY_UNSUPPORTED` | Requested owner scope cannot be securely resolved with current model |

### Security behavior

A cross-branch filter must not reveal whether matching documents exist outside scope. Result is simply empty or limited to authorized rows.

---

## API-DOC-004 – Get Document Detail

### Route

```text
GET /api/documents/{documentId}
```

### Purpose

Return current metadata, owner display information, state, expiry interpretation, and action hints for one accessible document.

### Authentication

Required.

### Required permission

```text
document.read
```

### Branch scoping

Direct-ID lookup must resolve owner-derived branch scope before returning data.

### Request schema

Path:

```ts
{ documentId: string }
```

### Success DTO – `200 OK`

```ts
interface GetDocumentResponse {
  data: DocumentDetailDto;
  meta: { requestId: string };
}
```

### Error responses

| HTTP | Code | Condition |
|---|---|---|
| 400 | `DOCUMENT_ID_INVALID` | Malformed identifier |
| 401 | `AUTHENTICATION_REQUIRED` | No session |
| 403 | `DOCUMENT_PERMISSION_DENIED` | Missing permission |
| 403 | `DOCUMENT_BRANCH_ACCESS_DENIED` | Document outside scope |
| 404 | `DOCUMENT_NOT_FOUND` | Missing/soft-deleted document under normal route |

Implementations may deliberately normalize inaccessible IDs to `404 DOCUMENT_NOT_FOUND` to reduce resource enumeration. The chosen policy must be consistent application-wide.

---

## API-DOC-005 – Update Document Metadata

### Route

```text
PATCH /api/documents/{documentId}
```

### Purpose

Correct permitted metadata fields without rewriting verification history or bypassing state rules.

### Authentication

Required.

### Required permission

```text
document.update
```

### Branch scoping

Document owner-derived scope must be authorized. Owner reassignment, where permitted at all, requires validating both source and target owners. The baseline contract does not permit owner reassignment through this endpoint.

### Request schema

```ts
interface UpdateDocumentMetadataRequest {
  documentType?: string;
  fileName?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  version: number;
}
```

Forbidden client fields include:

```text
ownerType
ownerId
fileUrl
verificationStatus
uploadedBy
verifiedBy
verifiedAt
createdBy
updatedBy
deletedAt
isActive
```

### Processing

1. Authenticate and authorize.
2. Load and scope-check Document.
3. Verify active/non-deleted.
4. Verify version.
5. Enforce state-dependent editable-field policy.
6. Validate document type and dates.
7. Update allowed fields only.
8. Increment version.
9. Set authenticated `updatedBy`.
10. Write audit fact through Audit boundary.

### Success DTO – `200 OK`

```ts
interface UpdateDocumentResponse {
  data: DocumentDetailDto;
  meta: { requestId: string };
}
```

### Error responses

| HTTP | Code | Condition |
|---|---|---|
| 400 | `DOCUMENT_REQUEST_INVALID` | Invalid body |
| 400 | `DOCUMENT_DATE_RANGE_INVALID` | Invalid date ordering |
| 401 | `AUTHENTICATION_REQUIRED` | Missing session |
| 403 | `DOCUMENT_PERMISSION_DENIED` | Missing update permission |
| 403 | `DOCUMENT_BRANCH_ACCESS_DENIED` | Outside scope |
| 404 | `DOCUMENT_NOT_FOUND` | Missing/inactive as applicable |
| 409 | `DOCUMENT_VERSION_CONFLICT` | Optimistic lock failure |
| 409 | `DOCUMENT_FIELD_IMMUTABLE` | Attempt to change protected field |
| 409 | `DOCUMENT_UPDATE_NOT_ALLOWED_IN_STATE` | State prevents requested metadata change |
| 409 | `DOCUMENT_TYPE_INACTIVE` | Type invalid/inactive |

---

## API-DOC-006 – Submit Document for Verification

### Route

```text
POST /api/documents/{documentId}/submit-verification
```

### Purpose

Perform the explicit lifecycle transition:

```text
Uploaded -> PendingVerification
```

### Authentication

Required.

### Required permission

```text
document.verify.submit
```

`document.submit_verification` may exist as a legacy naming variant in earlier drafts. The canonical permission for implementation should be normalized to one code; this contract uses `document.verify.submit`.

### Branch scoping

Owner-derived scope mandatory.

### Request schema

```ts
interface SubmitVerificationRequest {
  version: number;
}
```

### Processing

1. Authenticate and authorize.
2. Load, scope-check, and active-check Document.
3. Verify optimistic version.
4. Require current state `Uploaded`.
5. Confirm mandatory metadata and Blob reference integrity.
6. Transition to `PendingVerification`.
7. Increment version and audit.

### Success DTO – `200 OK`

```ts
interface SubmitVerificationResponse {
  data: {
    documentId: string;
    verificationStatus: "PendingVerification";
    version: number;
    updatedAt: string;
  };
  meta: { requestId: string };
}
```

### Error responses

| HTTP | Code | Condition |
|---|---|---|
| 401 | `AUTHENTICATION_REQUIRED` | No session |
| 403 | `DOCUMENT_PERMISSION_DENIED` | Missing submit permission |
| 403 | `DOCUMENT_BRANCH_ACCESS_DENIED` | Outside scope |
| 404 | `DOCUMENT_NOT_FOUND` | Missing |
| 409 | `DOCUMENT_VERSION_CONFLICT` | Stale version |
| 409 | `DOCUMENT_INVALID_STATE_TRANSITION` | Current status is not Uploaded |
| 422 | `DOCUMENT_NOT_READY_FOR_VERIFICATION` | Required metadata/file integrity check fails |
| 503 | `DOCUMENT_STORAGE_UNAVAILABLE` | Required storage integrity check unavailable |

---

## API-DOC-007 – Get Verification Queue

### Route

```text
GET /api/documents/verification-queue
```

### Purpose

Return branch-scoped documents currently eligible for verification review.

### Authentication

Required.

### Required permission

```text
document.verify.read
```

### Branch scoping

Mandatory owner-derived row filtering.

### Query schema

```ts
interface VerificationQueueQuery {
  ownerType?: DocumentOwnerType;
  documentType?: string;
  submittedFrom?: string;
  submittedTo?: string;
  page?: number;
  pageSize?: number;
  sort?: "updatedAt:asc" | "updatedAt:desc" | "expiryDate:asc";
}
```

### Processing

Return only active, non-deleted documents with current state `PendingVerification` in effective branch scope.

### Success DTO – `200 OK`

```ts
interface VerificationQueueItemDto extends DocumentSummaryDto {
  queueAgeDays: number;
}
```

Collection envelope as standard paginated response.

### Error responses

| HTTP | Code | Condition |
|---|---|---|
| 400 | `DOCUMENT_FILTER_INVALID` | Invalid queue filter |
| 401 | `AUTHENTICATION_REQUIRED` | No session |
| 403 | `DOCUMENT_PERMISSION_DENIED` | Missing permission |

---

## API-DOC-008 – Approve Document

### Route

```text
POST /api/documents/{documentId}/approve
```

### Purpose

Atomically transition a pending document to Approved and append immutable verification history.

### Authentication

Required.

### Required permission

```text
document.verify.approve
```

### Branch scoping

Mandatory owner-derived scope check.

### Request schema

```ts
interface ApproveDocumentRequest {
  remarks?: string | null;
  version: number;
}
```

The verifier identity and time are derived server-side.

### Processing transaction

```text
BEGIN
  lock/check Document version
  require active and PendingVerification
  insert immutable DocumentVerification(status=Approved)
  update Document.verificationStatus=Approved
  update summary verifiedBy/verifiedAt where schema contains them
  increment Document.version
  persist audit side-effect according to repository convention
COMMIT
```

The Certificate context is not called to issue a certificate as part of this operation. Document approval is not course-completion approval and must not imply certificate eligibility.

### Success DTO – `200 OK`

```ts
interface ApproveDocumentResponse {
  data: {
    document: DocumentDetailDto;
    verification: DocumentVerificationDto;
  };
  meta: { requestId: string };
}
```

### Error responses

| HTTP | Code | Condition |
|---|---|---|
| 400 | `DOCUMENT_REQUEST_INVALID` | Invalid remarks/version |
| 401 | `AUTHENTICATION_REQUIRED` | No session |
| 403 | `DOCUMENT_PERMISSION_DENIED` | Missing approval permission |
| 403 | `DOCUMENT_BRANCH_ACCESS_DENIED` | Outside scope |
| 404 | `DOCUMENT_NOT_FOUND` | Missing |
| 409 | `DOCUMENT_VERSION_CONFLICT` | Concurrent update |
| 409 | `DOCUMENT_INVALID_STATE_TRANSITION` | Not PendingVerification |
| 409 | `DOCUMENT_ALREADY_DECIDED` | Concurrent verifier already completed decision |
| 422 | `DOCUMENT_VERIFICATION_GUARD_FAILED` | File/evidence precondition invalid |
| 503 | `AUDIT_WRITE_UNAVAILABLE` | Only if architecture requires audit atomicity and cannot persist required audit record |

---

## API-DOC-009 – Reject Document

### Route

```text
POST /api/documents/{documentId}/reject
```

### Purpose

Atomically transition a pending document to Rejected and append immutable verification history.

### Authentication

Required.

### Required permission

```text
document.verify.reject
```

### Branch scoping

Mandatory.

### Request schema

```ts
interface RejectDocumentRequest {
  reason: string;
  version: number;
}
```

Rules:

- `reason` required;
- trimmed length 1–2,000;
- server derives verifier and timestamp.

### Processing transaction

Same atomicity pattern as approval, with `Rejected` status and mandatory reason.

### Success DTO – `200 OK`

```ts
interface RejectDocumentResponse {
  data: {
    document: DocumentDetailDto;
    verification: DocumentVerificationDto;
  };
  meta: { requestId: string };
}
```

### Error responses

Same authorization, scope, version, and state errors as approval, plus:

| HTTP | Code | Condition |
|---|---|---|
| 400 | `DOCUMENT_REJECTION_REASON_REQUIRED` | Missing/blank reason |
| 400 | `DOCUMENT_REJECTION_REASON_TOO_LONG` | Over contract limit |

### Important unresolved workflow note

The current source baseline does not define a `Rejected -> Uploaded` resubmission transition. Therefore this API does not create one. A future resubmission API requires an approved business rule and Part 2 state-machine update first.

---

## API-DOC-010 – Get Verification and Audit History

### Route

```text
GET /api/documents/{documentId}/history
```

### Purpose

Return immutable DocumentVerification history and safe cross-context audit references available to the caller.

### Authentication

Required.

### Required permission

```text
document.history.read
```

The caller may also need separate Audit permissions to receive full Audit & Compliance details. Document Management must not bypass Audit context authorization.

### Branch scoping

Document owner-derived scope required before any history disclosure.

### Query schema

```ts
interface DocumentHistoryQuery {
  page?: number;
  pageSize?: number;
  sort?: "verifiedAt:asc" | "verifiedAt:desc";
}
```

### Success DTO – `200 OK`

```ts
interface DocumentHistoryResponse {
  data: {
    documentId: string;
    currentStatus: DocumentVerificationStatus;
    verifications: DocumentVerificationDto[];
    auditReferences?: Array<{
      action: string;
      performedAt: string;
      performedByDisplayName: string;
    }>;
  };
  meta: {
    requestId: string;
    page: number;
    pageSize: number;
    totalItems: number;
  };
}
```

### Error responses

| HTTP | Code | Condition |
|---|---|---|
| 401 | `AUTHENTICATION_REQUIRED` | No session |
| 403 | `DOCUMENT_PERMISSION_DENIED` | No document history permission |
| 403 | `DOCUMENT_BRANCH_ACCESS_DENIED` | Outside scope |
| 404 | `DOCUMENT_NOT_FOUND` | Missing/inaccessible according to global enumeration policy |
| 502 | `AUDIT_CONTEXT_UNAVAILABLE` | Only when audit enrichment was explicitly requested and unavailable; document verification history may still be returned if contract chooses partial response semantics |

---

## API-DOC-011 – Request Secure File Access

### Route

```text
POST /api/documents/{documentId}/file-access
```

### Purpose

Authorize file preview/download and return either a short-lived signed access URL or a controlled streaming endpoint reference.

### Authentication

Required.

### Required permission

```text
document.file.read
```

A deployment may additionally require `document.read`, but `document.file.read` remains the decisive file capability.

### Branch scoping

Mandatory owner-derived scope check every time access is requested.

### Request schema

```ts
interface FileAccessRequest {
  disposition: "inline" | "attachment";
}
```

### Processing

1. Authenticate.
2. Authorize file permission.
3. Load and scope-check Document.
4. Require active/non-deleted record.
5. Resolve Blob reference server-side.
6. Confirm object availability where practical.
7. Generate minimal short-lived access response.
8. Audit sensitive file access where policy requires.

### Success DTO – `200 OK`

Option A – short-lived URL:

```ts
interface FileAccessDto {
  mode: "signed-url";
  url: string;
  expiresAt: string;
  disposition: "inline" | "attachment";
  fileName: string;
  contentType: string;
}
```

Option B – proxy stream:

```ts
interface FileAccessDto {
  mode: "proxy";
  streamUrl: string;
  expiresAt: string;
  disposition: "inline" | "attachment";
  fileName: string;
}
```

The exact Vercel Blob access pattern must follow the selected storage implementation. The domain contract is that file access is short-lived and authorization-controlled.

### Error responses

| HTTP | Code | Condition |
|---|---|---|
| 401 | `AUTHENTICATION_REQUIRED` | No session |
| 403 | `DOCUMENT_FILE_ACCESS_DENIED` | Missing file permission |
| 403 | `DOCUMENT_BRANCH_ACCESS_DENIED` | Outside scope |
| 404 | `DOCUMENT_NOT_FOUND` | No active Document |
| 410 | `DOCUMENT_FILE_MISSING` | Metadata exists but Blob object is missing |
| 503 | `DOCUMENT_STORAGE_UNAVAILABLE` | Storage unavailable |

---

## API-DOC-012 – Get Expiry Workbench

### Route

```text
GET /api/documents/expiry
```

### Purpose

Return branch-scoped documents with expiry information for operational monitoring.

### Authentication

Required.

### Required permission

```text
document.expiry.read
```

### Branch scoping

Mandatory owner-derived filtering.

### Query schema

```ts
interface ExpiryWorkbenchQuery {
  state?: "ExpiringSoon" | "Expired" | "Valid" | "NoExpiry";
  withinDays?: number;
  ownerType?: DocumentOwnerType;
  documentType?: string;
  expiryDateFrom?: string;
  expiryDateTo?: string;
  page?: number;
  pageSize?: number;
  sort?: "expiryDate:asc" | "expiryDate:desc";
}
```

`withinDays` accepted range should be configuration-governed; recommended API safety range is `0..365`.

### Success DTO – `200 OK`

```ts
interface ExpiryDocumentDto extends DocumentSummaryDto {
  expiry: {
    state: "NoExpiry" | "Valid" | "ExpiringSoon" | "Expired";
    daysRemaining: number | null;
    evaluationDate: string;
  };
}
```

### Error responses

| HTTP | Code | Condition |
|---|---|---|
| 400 | `DOCUMENT_EXPIRY_FILTER_INVALID` | Invalid window or date range |
| 401 | `AUTHENTICATION_REQUIRED` | No session |
| 403 | `DOCUMENT_PERMISSION_DENIED` | Missing expiry permission |

### DDD note

This endpoint may derive expiry condition from `expiryDate`. Until the unresolved design decision is made, the API must not silently persist status `Expired` merely because a GET request evaluated the date.

---

## API-DOC-013 – Soft-Retire Document

### Route

```text
DELETE /api/documents/{documentId}
```

### Purpose

Retire a Document through repository-standard soft delete. No hard deletion of metadata, Blob object, or immutable verification history occurs through this route.

### Authentication

Required.

### Required permission

```text
document.retire
```

`document.delete` found in earlier permission vocabulary should be normalized; this contract recommends `document.retire` because behavior is soft retirement, not physical deletion.

### Branch scoping

Mandatory.

### Request schema

HTTP body for DELETE is avoided for interoperability. Required metadata is sent as headers or query only if repository standards allow; recommended Server Action/POST command alternative:

```ts
interface RetireDocumentRequest {
  reason: string;
  version: number;
}
```

Recommended REST alternative for rich command semantics:

```text
POST /api/documents/{documentId}/retire
```

The project should select one canonical shape. This FRD permits `DELETE` for inventory consistency but recommends the explicit `/retire` command if the platform standard supports command endpoints.

### Processing

1. Authenticate and authorize.
2. Load and scope-check.
3. Check active state/version.
4. Validate reason.
5. Set `deletedAt`, `isActive=false`, `updatedBy`, increment version.
6. Preserve verification state/history.
7. Write audit record.
8. Do not automatically delete Blob binary without separately approved retention policy.

### Success DTO – `200 OK`

```ts
interface RetireDocumentResponse {
  data: {
    documentId: string;
    retiredAt: string;
    version: number;
  };
  meta: { requestId: string };
}
```

### Error responses

| HTTP | Code | Condition |
|---|---|---|
| 400 | `DOCUMENT_RETIRE_REASON_REQUIRED` | Missing reason |
| 401 | `AUTHENTICATION_REQUIRED` | No session |
| 403 | `DOCUMENT_PERMISSION_DENIED` | Missing retire permission |
| 403 | `DOCUMENT_BRANCH_ACCESS_DENIED` | Outside scope |
| 404 | `DOCUMENT_NOT_FOUND` | Missing |
| 409 | `DOCUMENT_ALREADY_RETIRED` | Already soft-deleted |
| 409 | `DOCUMENT_VERSION_CONFLICT` | Stale version |

There is no restore endpoint because restore behavior is not approved in Parts 1–4.

---

## API-DOC-014 – List Blob/Database Reconciliation Issues

### Route

```text
GET /api/documents/operations/reconciliation
```

### Purpose

Provide restricted operational visibility into known or detected inconsistencies between authoritative Document metadata and Vercel Blob objects.

### Authentication

Required.

### Required permission

```text
document.operations.reconcile
```

### Branch scoping

Operational access still applies branch scope unless the authenticated principal has an explicitly approved global operational permission/access mode. A generic operations role name is not sufficient.

### Query schema

```ts
interface ReconciliationQuery {
  issueType?:
    | "BLOB_EXISTS_DOCUMENT_MISSING"
    | "DOCUMENT_EXISTS_BLOB_MISSING"
    | "UPLOAD_INTENT_EXPIRED"
    | "REGISTRATION_INCOMPLETE";
  status?: "Open" | "Retrying" | "Resolved" | "Ignored";
  page?: number;
  pageSize?: number;
}
```

### Success DTO – `200 OK`

```ts
interface ReconciliationIssueDto {
  id: string;
  issueType: string;
  documentId: string | null;
  uploadId: string | null;
  detectedAt: string;
  status: string;
  retryAllowed: boolean;
  safeSummary: string;
}
```

### Error responses

| HTTP | Code | Condition |
|---|---|---|
| 401 | `AUTHENTICATION_REQUIRED` | No session |
| 403 | `DOCUMENT_PERMISSION_DENIED` | No operational permission |
| 501 | `DOCUMENT_RECONCILIATION_LEDGER_NOT_IMPLEMENTED` | Architecture has not approved durable issue persistence/query mechanism |
| 503 | `DOCUMENT_STORAGE_UNAVAILABLE` | Live storage comparison cannot execute |

### Architecture gap note

Parts 1–4 explicitly identify durable reconciliation persistence as unresolved. Therefore this API contract is conditional: implement it only after architecture assigns ownership and persistence for reconciliation records. Do not create a new domain aggregate solely to satisfy the screen.

---

## API-DOC-015 – Retry Reconciliation Action

### Route

```text
POST /api/documents/operations/reconciliation/{itemId}/retry
```

### Purpose

Retry an approved recovery action for an existing reconciliation issue.

### Authentication

Required.

### Required permission

```text
document.operations.reconcile
```

### Branch scoping

Derive scope from related owner/Document where one exists. Global orphan Blob cleanup requires explicitly approved global operations scope.

### Request schema

```ts
interface RetryReconciliationRequest {
  version?: number;
  reason: string;
}
```

### Success DTO – `202 Accepted` or `200 OK`

For synchronous modular-monolith execution:

```ts
interface ReconciliationRetryResponse {
  data: {
    itemId: string;
    outcome: "Resolved" | "StillOpen";
    resolvedDocumentId?: string | null;
  };
  meta: { requestId: string };
}
```

Do not return `202 Accepted` unless the application actually schedules durable asynchronous work. Modular-monolith-first implementation may execute the retry synchronously and return `200 OK`.

### Error responses

| HTTP | Code | Condition |
|---|---|---|
| 400 | `DOCUMENT_RECONCILIATION_REASON_REQUIRED` | Missing reason |
| 401 | `AUTHENTICATION_REQUIRED` | No session |
| 403 | `DOCUMENT_PERMISSION_DENIED` | Missing permission |
| 404 | `DOCUMENT_RECONCILIATION_ITEM_NOT_FOUND` | Unknown issue |
| 409 | `DOCUMENT_RECONCILIATION_NOT_RETRYABLE` | Issue cannot be safely retried |
| 409 | `DOCUMENT_RECONCILIATION_ALREADY_RESOLVED` | Issue already resolved |
| 503 | `DOCUMENT_STORAGE_UNAVAILABLE` | Storage unavailable |

---

## API-DOC-016 – List Active Document Types

### Route

```text
GET /api/document-types
```

### Purpose

Return active document type options for upload, edit, and filtering screens.

### Ownership

Configuration / Master Data owns the type configuration if document types are lookup-backed. This is a read boundary consumed by Document Management; Document Management does not own CRUD for document type masters.

### Authentication

Required for current Admin Portal.

### Required permission

One of:

- capability inherited from the caller's document use case; or
- a shared configuration read permission according to the IAM permission catalogue.

The application must choose one consistent policy. This FRD does not invent a role.

### Branch scoping

If types are global, no row branch filter is required. If future configuration supports branch-specific applicability, Configuration context owns that rule and returns only applicable types.

### Query schema

```ts
interface DocumentTypeQuery {
  ownerType?: DocumentOwnerType;
  activeOnly?: boolean; // forced true for normal UI
  locale?: "en" | "ar";
}
```

### Success DTO – `200 OK`

```ts
interface DocumentTypeOptionDto {
  code: string;
  label: string;
  labelLocalized: {
    en?: string;
    ar?: string;
  } | null;
  requiresIssueDate: boolean | null;
  requiresExpiryDate: boolean | null;
}
```

The last two fields may only be returned if such rules exist in approved Configuration data. Do not fabricate them from UI logic.

### Error responses

`401`, `403`, and `503 CONFIGURATION_UNAVAILABLE` as appropriate.

---

## API-DOC-017 – Search Eligible Document Owners

### Route

```text
GET /api/document-owners/search
```

### Purpose

Provide a UI-oriented owner search facade for selecting Student, Trainer, Corporate, or Person owners without copying their master data into Document Management.

### Authentication

Required.

### Required permission

```text
document.create
```

or `document.update` where an approved edit workflow needs owner lookup. Current Part 4 baseline does not approve owner reassignment.

### Branch scoping

Search result must be pre-filtered to effective principal branch scope using each owning context's access semantics.

### Query schema

```ts
interface SearchDocumentOwnersQuery {
  ownerType: DocumentOwnerType;
  q: string;
  page?: number;
  pageSize?: number;
}
```

Minimum search length recommended: 2 characters, unless exact reference-number search is supported.

### Success DTO – `200 OK`

```ts
interface DocumentOwnerOptionDto {
  ownerType: DocumentOwnerType;
  ownerId: string;
  displayName: string;
  referenceNumber?: string | null;
  branchDisplayName?: string | null;
  status: string;
}
```

Only minimal display data required for selection is returned.

### Error responses

| HTTP | Code | Condition |
|---|---|---|
| 400 | `DOCUMENT_OWNER_SEARCH_INVALID` | Missing type/query |
| 401 | `AUTHENTICATION_REQUIRED` | No session |
| 403 | `DOCUMENT_PERMISSION_DENIED` | Missing capability |
| 422 | `DOCUMENT_SCOPE_QUERY_UNSUPPORTED` | Secure branch resolver unavailable for owner type |
| 503 | `DOCUMENT_OWNER_CONTEXT_UNAVAILABLE` | Required source context/read model unavailable |

---

# 6. Conditional Student Portal API Contracts

The DDD application structure places Student Portal in future scope. These contracts must not be activated merely because Part 3 contains conditional screen specifications.

When the Student Portal is approved, prefer identity-bound endpoints that do not accept arbitrary owner IDs:

| Method | Route | Purpose | Authorization model |
|---|---|---|---|
| GET | `/api/me/documents` | List documents for authenticated student's linked StudentProfile/Person identity | self-service policy + identity binding |
| POST | `/api/me/documents/upload-intent` | Prepare permitted self-upload | self-service create policy + type allow-list |
| POST | `/api/me/documents` | Register self-upload | self-service create policy |
| GET | `/api/me/documents/{id}` | Read own document | identity binding |
| POST | `/api/me/documents/{id}/file-access` | Access own file | identity binding + file policy |

Rules:

- Never accept a client-supplied StudentProfile ID as identity proof.
- Resolve authenticated portal user -> Person -> StudentProfile server-side.
- Self-service upload types must be configuration/business-policy driven.
- Student user cannot approve or reject documents.
- Cross-student access is prohibited.

---

# 7. Conditional Trainer Portal API Contracts

Trainer Portal is also future/conditional.

Recommended identity-bound surface:

| Method | Route | Purpose | Authorization model |
|---|---|---|---|
| GET | `/api/trainer/me/documents` | List authenticated trainer documents | linked TrainerProfile identity |
| POST | `/api/trainer/me/documents/upload-intent` | Prepare permitted trainer evidence upload | self-service policy |
| POST | `/api/trainer/me/documents` | Register trainer upload | self-service policy |
| GET | `/api/trainer/me/documents/{id}` | Read own document | identity binding |
| POST | `/api/trainer/me/documents/{id}/file-access` | Access own file | identity binding + file policy |

Trainer portal identity does not grant document verification permission by implication.

---

# 8. Permission-to-Endpoint Matrix

| Permission | Endpoints | Scope |
|---|---|---|
| `document.create` | API-DOC-001, 002, 017 | Owner-derived branch scope |
| `document.read` | API-DOC-003, 004 | Owner-derived branch scope |
| `document.update` | API-DOC-005 | Owner-derived branch scope + state guard |
| `document.verify.submit` | API-DOC-006 | Owner-derived branch scope + Uploaded state |
| `document.verify.read` | API-DOC-007 | Owner-derived branch scope + pending-state filter |
| `document.verify.approve` | API-DOC-008 | Owner-derived branch scope + PendingVerification guard |
| `document.verify.reject` | API-DOC-009 | Owner-derived branch scope + PendingVerification guard |
| `document.history.read` | API-DOC-010 | Owner-derived branch scope |
| `document.file.read` | API-DOC-011 | Owner-derived branch scope + active record |
| `document.expiry.read` | API-DOC-012 | Owner-derived branch scope |
| `document.retire` | API-DOC-013 | Owner-derived branch scope + active/version guards |
| `document.operations.reconcile` | API-DOC-014, 015 | Restricted operational scope; global scope only if explicitly granted |

### Permission normalization issue

Earlier parts contain both:

```text
document.submit_verification
document.verify.submit

document.delete
document.retire
```

Before IAM seed data and code implementation, the project must normalize each pair to one canonical permission code. This Part recommends:

```text
document.verify.submit
document.retire
```

because they align with the rest of the hierarchical permission vocabulary and actual soft-retirement behavior.

---

# 9. Error Catalogue

## 9.1 Authentication and authorization

| Code | HTTP | Meaning |
|---|---:|---|
| `AUTHENTICATION_REQUIRED` | 401 | Valid login session absent |
| `DOCUMENT_PERMISSION_DENIED` | 403 | Principal lacks capability permission |
| `DOCUMENT_BRANCH_ACCESS_DENIED` | 403 | Resource owner outside effective branch scope |
| `DOCUMENT_FILE_ACCESS_DENIED` | 403 | File capability denied |
| `DOCUMENT_SCOPE_UNRESOLVED` | 403 | Secure branch scope cannot be determined |

## 9.2 Resource errors

| Code | HTTP | Meaning |
|---|---:|---|
| `DOCUMENT_NOT_FOUND` | 404 | Document unavailable/missing according to enumeration policy |
| `DOCUMENT_OWNER_NOT_FOUND` | 404 | Requested owner does not exist/is unavailable |
| `DOCUMENT_UPLOAD_NOT_FOUND` | 404 | Upload intent unknown or expired |
| `DOCUMENT_RECONCILIATION_ITEM_NOT_FOUND` | 404 | Operational item does not exist |

## 9.3 Validation errors

| Code | HTTP | Meaning |
|---|---:|---|
| `DOCUMENT_REQUEST_INVALID` | 400 | General schema validation failure |
| `DOCUMENT_ID_INVALID` | 400 | Malformed identifier |
| `DOCUMENT_DATE_RANGE_INVALID` | 400 | Date ordering invalid |
| `DOCUMENT_FILTER_INVALID` | 400 | Unsupported filter/sort |
| `DOCUMENT_OWNER_TYPE_UNSUPPORTED` | 400 | Unsupported owner type |
| `DOCUMENT_FILE_TYPE_NOT_ALLOWED` | 400 | File policy violation |
| `DOCUMENT_REJECTION_REASON_REQUIRED` | 400 | Rejection reason missing |
| `DOCUMENT_RETIRE_REASON_REQUIRED` | 400 | Retirement reason missing |
| `DOCUMENT_FILE_TOO_LARGE` | 413 | Upload exceeds configured limit |

## 9.4 Conflict/state errors

| Code | HTTP | Meaning |
|---|---:|---|
| `DOCUMENT_VERSION_CONFLICT` | 409 | Optimistic concurrency failure |
| `DOCUMENT_INVALID_STATE_TRANSITION` | 409 | Transition not permitted from current state |
| `DOCUMENT_ALREADY_DECIDED` | 409 | Concurrent verification decision already committed |
| `DOCUMENT_ALREADY_RETIRED` | 409 | Soft-delete already applied |
| `DOCUMENT_UPLOAD_ALREADY_CONSUMED` | 409 | Duplicate registration |
| `DOCUMENT_FIELD_IMMUTABLE` | 409 | Protected field update attempted |
| `DOCUMENT_UPDATE_NOT_ALLOWED_IN_STATE` | 409 | State-specific edit restriction |
| `DOCUMENT_TYPE_INACTIVE` | 409 | Type no longer valid |

## 9.5 Dependency/operational errors

| Code | HTTP | Meaning |
|---|---:|---|
| `DOCUMENT_STORAGE_UNAVAILABLE` | 503 | Vercel Blob adapter unavailable |
| `DOCUMENT_FILE_MISSING` | 410 | Document metadata exists but binary is missing |
| `DOCUMENT_STORAGE_OBJECT_INVALID` | 422 | Blob object does not match registration expectation |
| `DOCUMENT_OWNER_CONTEXT_UNAVAILABLE` | 503 | Owner lookup dependency unavailable |
| `CONFIGURATION_UNAVAILABLE` | 503 | Document type/configuration dependency unavailable |
| `DOCUMENT_RECONCILIATION_LEDGER_NOT_IMPLEMENTED` | 501 | Conditional operations capability not architecturally implemented |

---

# 10. Transaction Boundaries and Side Effects

## 10.1 Upload and registration

Vercel Blob and the relational database do not provide a distributed transaction. Therefore:

```text
Validate owner/scope/type
      |
      v
Create controlled upload intent
      |
      v
Upload Blob
      |
      v
Validate completed upload
      |
      v
Create Document metadata
      |
      +--> success: mark intent consumed
      |
      +--> failure: expose reconciliation signal / safe retry path
```

Rules:

- Never create an active Document pointing to an unconfirmed Blob upload.
- Duplicate registration for the same upload intent must be prevented.
- Orphan Blob handling must follow a defined reconciliation/retention procedure.
- A failure after Blob creation but before Document commit is an operational inconsistency, not a second Document aggregate state.

## 10.2 Approval/rejection

The following must be atomic in one database transaction:

1. current-state/version validation;
2. `DocumentVerification` insert;
3. `Document.verificationStatus` update;
4. `verifiedBy`/`verifiedAt` summary update if physical schema contains them;
5. version increment;
6. required audit persistence according to repository architecture.

## 10.3 Audit side effects

Sensitive operations requiring audit include at least:

- document creation;
- metadata correction;
- submit for verification;
- approval;
- rejection;
- file access when policy classifies it as sensitive;
- retirement;
- reconciliation retry/override.

Audit & Compliance owns `AuditLog`; Document Management submits audit facts through the approved internal boundary and must not create a private document audit table.

## 10.4 Communication side effects

Expiry notifications, when activated, must use Communication & Notification context. The expiry API only exposes candidates/read state. It does not write NotificationLog or claim delivery success.

---

# 11. API-Level Business Guards

| Guard | Applied endpoints | Rule |
|---|---|---|
| Authentication | All current endpoints | No anonymous Admin API access |
| Permission | All endpoints | Dynamic permission check server-side |
| Branch scope | All owner/document operations | Derive from owner and IAM scope |
| Soft-delete | List/detail/mutations/file | Normal routes exclude retired records |
| Owner existence | Create/register | Validate through owning context |
| Active document type | Create/update | Validate Configuration/schema mapping |
| Date ordering | Create/update | expiry must not precede issue date |
| Initial status | Create | server sets Uploaded |
| State transition | Submit/approve/reject | Only Part 2-approved transitions |
| Version | Update/state transitions/retire | Optimistic concurrency |
| Immutable history | Approve/reject | Insert only, never update prior verification row |
| Blob integrity | Registration/file access/submission as configured | Server validates object reference |
| No hard delete | Retirement | Soft-delete only |
| No owner mutation | Update | ownerType/ownerId immutable in baseline |
| No client audit identity | Mutations | actor/time derived from server auth/clock |

---

# 12. Screen-to-API Mapping

| Screen | Primary endpoints |
|---|---|
| Document Registry | API-DOC-003, API-DOC-004 |
| Upload Document | API-DOC-001, API-DOC-002, API-DOC-016, API-DOC-017 |
| Document Detail | API-DOC-004, API-DOC-010, API-DOC-011, API-DOC-006, API-DOC-013 |
| Edit Metadata | API-DOC-004, API-DOC-005, API-DOC-016 |
| Verification Queue | API-DOC-007 |
| Verification Review | API-DOC-004, API-DOC-011, API-DOC-008, API-DOC-009 |
| Expiry Workbench | API-DOC-012 |
| Audit and Verification History | API-DOC-010 |
| Blob Reconciliation Operations | Conditional API-DOC-014, API-DOC-015 |
| Embedded Owner Document Tab | API-DOC-003 with owner filters; authorization still server-side |

---

# 13. Use-Case-to-API Traceability

| Use Case | API mapping |
|---|---|
| UC-DOC-001 Register and Upload a Document | API-DOC-001, 002, 016, 017 |
| UC-DOC-002 Search and List Documents | API-DOC-003 |
| UC-DOC-003 View Document Detail and File | API-DOC-004, 010, 011 |
| UC-DOC-004 Submit Document for Verification | API-DOC-006 |
| UC-DOC-005 Approve Pending Document | API-DOC-007, 008 |
| UC-DOC-006 Reject Pending Document | API-DOC-007, 009 |
| UC-DOC-007 Monitor Expiry | API-DOC-012 |
| UC-DOC-008 Update Document Metadata | API-DOC-005 |
| UC-DOC-009 Retire a Document | API-DOC-013 |
| UC-DOC-010 Reconcile Blob/Database Inconsistency | Conditional API-DOC-014, 015 |

---

# 14. DDD Ownership and Cross-Context Contract Check

| API concern | Owning context | Document API behavior | Fit |
|---|---|---|---|
| Document metadata | Document Management | Create/read/update/retire Document | Aligned |
| Verification decision history | Document Management | Append/read DocumentVerification | Aligned |
| Student identity/status | Admission & Enrollment | Read/validate only | Aligned |
| Trainer identity/status | Faculty / Trainer | Read/validate only | Aligned |
| Corporate account identity | Corporate Training | Read/validate only | Aligned |
| Person master | Shared Party/Person | Read reference only | Aligned; branch resolver gap remains |
| User permissions | IAM | Consume authenticated permission context | Aligned |
| Branch access | IAM + Organization | Resolve server-side; do not persist local ACL | Aligned |
| Document type config | Configuration / Master Data if lookup-backed | Read/validate only | Aligned; physical representation unresolved |
| AuditLog | Audit & Compliance | Submit audit fact/read through authorized boundary | Aligned |
| Notifications | Communication | Request delivery when approved workflow exists | Aligned |
| Reports | Reporting | Read consumer; no transaction ownership | Aligned |
| Certificate | Certificate Management | No certificate issuance in document API | Aligned |
| Finance artifacts | Finance | May be represented as files/links but finance transaction remains Finance-owned | Aligned |
| Vercel Blob binary | Infrastructure | Storage adapter only | Aligned |

---

# 15. ER Model Alignment Check

The API fields preserve the ER-defined Document concepts:

```text
Document
- id
- ownerType
- ownerId
- documentType
- fileName
- fileUrl       internal/storage reference; not exposed raw in normal DTO
- issueDate
- expiryDate
- verificationStatus
- uploadedBy
- verifiedBy
- verifiedAt
```

and:

```text
DocumentVerification
- documentId
- status
- remarks
- verifiedBy
- verifiedAt
```

API decisions intentionally added at application-contract level without claiming new ER ownership:

- upload intent identifier;
- pagination metadata;
- expiry derived state;
- action hints;
- owner display summaries;
- short-lived file access DTOs;
- reconciliation contracts marked conditional.

These are application/API concerns, not automatically new domain entities.

---

# 16. Known Contract Gaps and Required Decisions

## GAP-DOC-API-001 – Prisma schema validation

The actual `packages/database/prisma/schema.prisma` was not available in the supplied source set used to generate this contract. Field types, enum spellings, relation names, and version/soft-delete conventions must be compared before implementation.

## GAP-DOC-API-002 – Document type persistence

DDD conceptually includes DocumentType configuration, while the ER model shows scalar `documentType`. API-DOC-016 assumes a read source but does not decide whether physical persistence is FK-backed or scalar.

## GAP-DOC-API-003 – Person branch scope

Generic Person-owned documents lack a deterministic branch relation in the ER baseline. API operations must fail closed until an approved ownership-to-branch resolver or authorized read model exists.

## GAP-DOC-API-004 – Expired state semantics

The ER model includes `Expired` in status values, but earlier FRD parts preserve uncertainty over derived versus persisted expiry. API-DOC-012 derives an expiry condition and does not mutate status on GET.

## GAP-DOC-API-005 – Rejected resubmission

No resubmission transition is defined. No API exists for `Rejected -> Uploaded/PendingVerification` until business rules and state machine are approved.

## GAP-DOC-API-006 – Approved document replacement

No replacement-chain/version relationship is defined for replacing approved evidence. The API must not overload metadata PATCH or Blob URL mutation to simulate replacement.

## GAP-DOC-API-007 – Reconciliation persistence ownership

Operational reconciliation endpoints remain conditional because a durable reconciliation ledger/table is not defined in DDD/ER. Architecture must assign ownership before persistence is implemented.

## GAP-DOC-API-008 – Permission-code normalization

Earlier parts contain duplicate naming variants for submit and retirement. IAM seed data and code must use one canonical set.

Recommended:

```text
document.verify.submit
document.retire
```

---

# 17. Final Consistency Check

Part 5 is consistent with Parts 1–4 on the following points:

1. The API surface exposes only approved Document Management capabilities.
2. `Document` remains the lifecycle metadata record.
3. `DocumentVerification` remains immutable append-only decision history.
4. State transitions match Part 2:

```text
Uploaded -> PendingVerification -> Approved
                                -> Rejected
```

5. No rejected resubmission or soft-delete restoration endpoint is invented.
6. No hard-delete API exists.
7. No API allows the client to set verification status through generic update.
8. No API trusts client-supplied branch identifiers for authorization.
9. Direct-ID and file-access operations are branch-scoped server-side.
10. Vercel Blob is treated as storage infrastructure, not domain ownership.
11. Student, Trainer, Corporate, Person, IAM, Configuration, Audit, Communication, Reporting, Certificate, and Finance ownership boundaries are preserved.
12. Student and Trainer portal APIs remain conditional/future and use identity-bound self-service patterns.
13. Reconciliation endpoints are clearly conditional on a future architecture decision rather than creating an undocumented aggregate.
14. API responses do not expose permanent raw Blob references in normal document DTOs.
15. Approval/rejection contracts require atomic current-state update and immutable history insertion.

This Part 5 contract is therefore suitable as the implementation baseline for Route Handlers, Server Actions, application services, validation schemas, permission middleware, and integration tests after the identified schema and architecture gaps are resolved.
