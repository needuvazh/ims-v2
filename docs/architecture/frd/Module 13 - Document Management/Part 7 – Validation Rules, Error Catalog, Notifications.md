# Part 7 – Validation Rules, Error Catalog, Notifications

## Module 13 – Document Management

## 1. Purpose

This document defines the validation architecture, structured error catalog, domain-event-driven notification triggers, and validation ownership boundaries for Module 13 – Document Management.

The specification is constrained by the following source-of-truth rules:

- Document Management owns document metadata, document verification state, verification history, and document expiry evaluation.
- The owning bounded context remains authoritative for Student, Trainer, Corporate Account, Person, and future Employee records.
- IAM owns authentication, permissions, role assignments, user branch access, child-branch visibility, and consolidated-access capability.
- Configuration / Master Data owns configurable document type semantics when document types are represented as master data.
- Communication & Notification owns templates, notification requests, provider delivery, retries, and delivery logs.
- Audit & Compliance owns AuditLog and approval/audit history infrastructure.
- Reporting & Dashboards may consume document data through read-only projections but must not mutate Document or DocumentVerification.
- File binaries are stored through the approved Vercel Blob infrastructure adapter, while Document Management remains authoritative for business metadata and lifecycle state.

This Part is consistent with Parts 1–6 and must not create new lifecycle transitions, aggregates, permissions, or cross-context ownership.

---

# 2. Validation Architecture

## 2.1 Validation layers

Validation is applied in five layers. A request may pass syntax validation and still fail authorization or domain validation.

| Layer | Purpose | Examples | Primary Owner |
|---|---|---|---|
| L1 – Transport/schema validation | Reject malformed request shape and primitive type violations. | Invalid UUID, invalid date literal, oversized string, unsupported enum. | API/application boundary; shared schema primitives where reusable. |
| L2 – Authentication and authorization | Establish actor identity and capability. | Missing session, missing `document.create`, missing `document.verify.approve`. | IAM, enforced by Document application service. |
| L3 – Scope and reference validation | Resolve owner and verify access scope. | Owner exists, owner not deleted, branch scope is authorized, document type active. | Delegated to owning contexts/IAM/Configuration through approved adapters. |
| L4 – Domain validation | Enforce Document aggregate invariants and lifecycle rules. | Valid state transition, rejection remarks required, expiry date not before issue date. | Document Management. |
| L5 – Infrastructure consistency validation | Protect Blob/database consistency and concurrency. | Upload token valid, Blob exists, registration idempotency, optimistic version match. | Document application service plus infrastructure adapter/repository conventions. |

## 2.2 Fail-fast ordering

For mutation commands, validation should normally occur in this order:

```text
1. Authenticate actor
2. Parse and validate request schema
3. Check required permission
4. Resolve current document or target owner
5. Resolve authoritative branch scope
6. Check branch authorization
7. Validate cross-context references
8. Validate Document domain invariant/state transition
9. Validate optimistic concurrency version
10. Execute mutation transaction
11. Emit audit facts and notification-trigger facts after successful commit
```

Security-sensitive requests should avoid revealing whether an inaccessible document exists. The service may return `404 DOC_NOT_FOUND` for both absent and inaccessible direct-ID reads where repository security conventions require non-disclosure.

---

# 3. Shared Validation Primitives

The following primitive schemas are reusable building blocks. They are not new domain entities.

## 3.1 Identifier schemas

### `DocumentIdSchema`

```ts
const DocumentIdSchema = z.string().uuid();
```

Rule:

- must be a syntactically valid UUID/CUID according to the repository-wide ID convention;
- syntax validation is shared platform behavior;
- existence and branch access are separate validations.

### `OwnerIdSchema`

```ts
const OwnerIdSchema = z.string().min(1).max(128);
```

Rule:

- accepts the platform identifier format;
- does not prove owner existence;
- authoritative existence check is delegated to the owning context.

### `OwnerTypeSchema`

```ts
const OwnerTypeSchema = z.enum([
  "Student",
  "Trainer",
  "Corporate",
  "Person",
]);
```

`Employee` must not be enabled until HRMS ownership and integration are available.

Unknown values must return `DOC_OWNER_TYPE_UNSUPPORTED`.

---

## 3.2 Date schemas

Date-only business fields must use a calendar-date representation and must not shift date through timezone conversion.

```ts
const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidCalendarDate);
```

Applicable fields:

- `issueDate`
- `expiryDate`

Cross-field rule:

```text
IF issueDate IS NOT NULL
AND expiryDate IS NOT NULL
THEN expiryDate >= issueDate
```

Oman business timezone defaults apply to date/time display and effective business-date evaluation, while date-only values retain their calendar date.

---

## 3.3 Text schemas

### `FileNameSchema`

Recommended validation:

```ts
const FileNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine(noControlCharacters);
```

The original display file name is metadata only. It must not be trusted as a globally unique Blob key.

### `VerificationRemarksSchema`

```ts
const VerificationRemarksSchema = z
  .string()
  .trim()
  .min(3)
  .max(2000);
```

Rules:

- mandatory for rejection;
- optional for approval unless an approved policy later requires it;
- stored in immutable verification history;
- must not contain credentials, secrets, or access tokens.

### `RetirementReasonSchema`

```ts
const RetirementReasonSchema = z
  .string()
  .trim()
  .min(5)
  .max(1000);
```

A retirement reason is required for sensitive soft-retirement operations if the repository's audit convention requires a reason. Hard delete is prohibited.

---

# 4. Custom Business Validation Schemas

## 4.1 VAL-DOC-001 – Create Upload Intent Validation

### Purpose

Validates whether an authenticated actor may initiate a controlled Blob upload for a specific document owner and document type.

### Input shape

```ts
type CreateUploadIntentInput = {
  ownerType: "Student" | "Trainer" | "Corporate" | "Person";
  ownerId: string;
  documentType: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};
```

### Validation rules

| Rule | Validation | Failure Code | Ownership |
|---|---|---|---|
| VAL-DOC-001-A | Actor is authenticated. | `AUTH_REQUIRED` | IAM |
| VAL-DOC-001-B | Actor has `document.create`. | `DOC_PERMISSION_DENIED` | IAM capability; enforced locally. |
| VAL-DOC-001-C | ownerType is supported. | `DOC_OWNER_TYPE_UNSUPPORTED` | Document Management. |
| VAL-DOC-001-D | Owner exists. | `DOC_OWNER_NOT_FOUND` | Delegated to owner context. |
| VAL-DOC-001-E | Owner is not soft deleted/ineligible for attachment. | `DOC_OWNER_INACTIVE` | Delegated to owner context. |
| VAL-DOC-001-F | Actor can access resolved owner branch scope. | `DOC_BRANCH_SCOPE_DENIED` | IAM + owner-context scope resolver. |
| VAL-DOC-001-G | Document type is valid and active. | `DOC_TYPE_INVALID` / `DOC_TYPE_INACTIVE` | Configuration or approved schema relation. |
| VAL-DOC-001-H | File name passes metadata validation. | `DOC_FILE_NAME_INVALID` | Document Management/application boundary. |
| VAL-DOC-001-I | Media type is allowed by approved upload policy. | `DOC_FILE_TYPE_NOT_ALLOWED` | Shared security/upload policy. |
| VAL-DOC-001-J | File size is within approved environment limit. | `DOC_FILE_TOO_LARGE` | Shared infrastructure/NFR configuration. |

### Result

A short-lived upload capability may be issued only after the above checks succeed. Storage credentials must not be exposed.

---

## 4.2 VAL-DOC-002 – Register Uploaded Document Validation

### Purpose

Validates creation of the authoritative Document metadata record after successful Blob upload.

### Input shape

```ts
type RegisterDocumentInput = {
  uploadReference: string;
  ownerType: "Student" | "Trainer" | "Corporate" | "Person";
  ownerId: string;
  documentType: string;
  fileName: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  idempotencyKey: string;
};
```

### Validation rules

1. Authenticate actor and require `document.create`.
2. Validate supported ownerType.
3. Resolve owner from its authoritative context.
4. Reject absent or soft-deleted owner.
5. Resolve owner branch scope server-side.
6. Verify actor branch authorization.
7. Validate active document type.
8. Validate upload reference through Blob infrastructure adapter.
9. Verify Blob object exists and belongs to the controlled upload flow.
10. Validate `fileName` metadata.
11. Validate date syntax.
12. Enforce `expiryDate >= issueDate` when both exist.
13. Reject replay that conflicts with an existing idempotency key.
14. Derive `uploadedBy` from authenticated identity.
15. Create status as `Uploaded`.
16. Persist Document metadata.
17. Record audit facts according to Audit boundary.

### Errors

- `DOC_UPLOAD_REFERENCE_INVALID`
- `DOC_BLOB_OBJECT_NOT_FOUND`
- `DOC_OWNER_NOT_FOUND`
- `DOC_OWNER_INACTIVE`
- `DOC_BRANCH_SCOPE_DENIED`
- `DOC_TYPE_INVALID`
- `DOC_DATE_INVALID`
- `DOC_EXPIRY_BEFORE_ISSUE`
- `DOC_IDEMPOTENCY_CONFLICT`
- `DOC_REGISTRATION_FAILED`

---

## 4.3 VAL-DOC-003 – Metadata Update Validation

### Purpose

Validates edits to mutable Document metadata without allowing generic state mutation.

### Input shape

```ts
type UpdateDocumentMetadataInput = {
  documentId: string;
  version: number;
  documentType?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
};
```

### Rules

- authenticated actor required;
- `document.update` required;
- document must exist and not be soft deleted;
- actor must be in authoritative branch scope;
- current `version` must match;
- document type, if changed, must be active;
- date range must be valid;
- `verificationStatus` is not accepted in this DTO;
- `uploadedBy`, `verifiedBy`, `verifiedAt`, and `fileUrl` cannot be directly patched through metadata update;
- change must preserve DocumentVerification history;
- evidence replacement after approval/rejection must not be allowed through this metadata-only command.

### Errors

- `DOC_NOT_FOUND`
- `DOC_PERMISSION_DENIED`
- `DOC_BRANCH_SCOPE_DENIED`
- `DOC_VERSION_CONFLICT`
- `DOC_TYPE_INVALID`
- `DOC_EXPIRY_BEFORE_ISSUE`
- `DOC_FIELD_IMMUTABLE`
- `DOC_EVIDENCE_REPLACEMENT_POLICY_UNDEFINED`

---

## 4.4 VAL-DOC-004 – Submit for Verification Validation

### Input shape

```ts
type SubmitForVerificationInput = {
  documentId: string;
  version: number;
};
```

### Rules

- authenticated actor required;
- require `document.verify.submit`;
- document exists and is not soft deleted;
- owner branch scope authorized;
- current state must be `Uploaded` under the baseline lifecycle;
- optimistic version must match;
- file reference must be present and retrievable through the approved storage adapter check used by the application service;
- transition is `Uploaded -> PendingVerification` only;
- direct `Approved` or `Rejected` transitions are forbidden.

### Errors

- `DOC_INVALID_STATE_TRANSITION`
- `DOC_VERSION_CONFLICT`
- `DOC_FILE_REFERENCE_BROKEN`
- authorization/reference errors as applicable.

---

## 4.5 VAL-DOC-005 – Approve Verification Validation

### Input shape

```ts
type ApproveDocumentInput = {
  documentId: string;
  version: number;
  remarks?: string | null;
};
```

### Rules

- require `document.verify.approve`;
- enforce branch scope or explicit approved global scope;
- document must be `PendingVerification`;
- document must not be soft deleted;
- version must match;
- verifier identity is server-derived;
- verification time is server-derived;
- approval creates a new immutable DocumentVerification record;
- current Document status and verification summary update must be consistent with history insertion;
- approval transition must be atomic with decision history persistence where repository transaction conventions allow;
- prior verification history must not be overwritten.

### Errors

- `DOC_VERIFICATION_NOT_PENDING`
- `DOC_VERSION_CONFLICT`
- `DOC_VERIFICATION_COMMIT_FAILED`
- permission/scope errors.

---

## 4.6 VAL-DOC-006 – Reject Verification Validation

### Input shape

```ts
type RejectDocumentInput = {
  documentId: string;
  version: number;
  remarks: string;
};
```

### Rules

All approval validations apply, plus:

- require `document.verify.reject`;
- remarks are mandatory;
- remarks must pass `VerificationRemarksSchema`;
- transition is `PendingVerification -> Rejected` only;
- immutable rejection decision history is created.

### Errors

- `DOC_REJECTION_REMARKS_REQUIRED`
- `DOC_REJECTION_REMARKS_INVALID`
- `DOC_VERIFICATION_NOT_PENDING`
- `DOC_VERSION_CONFLICT`
- `DOC_VERIFICATION_COMMIT_FAILED`

---

## 4.7 VAL-DOC-007 – Secure File Access Validation

### Purpose

Controls preview/download access to private business evidence.

### Rules

1. Authenticate actor.
2. Require `document.file.read` or approved self-service equivalent.
3. Load document metadata with soft-delete restrictions.
4. Resolve authoritative owner branch or self-service identity scope.
5. Deny unauthorized access regardless of knowledge of document ID or Blob URL.
6. Do not return storage credentials.
7. Return only short-lived authorized access or proxy stream according to infrastructure design.
8. Do not log access token or binary content.

### Errors

- `AUTH_REQUIRED`
- `DOC_PERMISSION_DENIED`
- `DOC_NOT_FOUND`
- `DOC_BRANCH_SCOPE_DENIED`
- `DOC_SELF_SCOPE_DENIED`
- `DOC_FILE_REFERENCE_BROKEN`
- `DOC_FILE_ACCESS_FAILED`

---

## 4.8 VAL-DOC-008 – Expiry Evaluation Validation

### Purpose

Determines whether a document meets the ER-aligned expiry condition.

### Rule

```text
expiredCondition =
  expiryDate IS NOT NULL
  AND expiryDate < effectiveBusinessDate
```

Rules:

- effective business date follows shared platform date/time policy and Oman business timezone defaults;
- null expiry date means no expiry condition is derived from date;
- expiry evaluation must not delete or overwrite verification history;
- whether `Expired` is persisted as a status or derived at read time remains an explicit unresolved implementation decision;
- notification delivery state must not be stored in Document.

### Errors

Interactive expiry workbench queries may use:

- `DOC_EXPIRY_QUERY_INVALID`
- `DOC_DATE_RANGE_INVALID`

System evaluation failures use operational errors and retry/runbook handling rather than changing a valid Document to an error state.

---

## 4.9 VAL-DOC-009 – Soft Retirement Validation

### Input shape

```ts
type RetireDocumentInput = {
  documentId: string;
  version: number;
  reason: string;
};
```

### Rules

- require `document.retire`;
- enforce scope;
- document must exist and not already be retired;
- version must match;
- reason required according to audit convention;
- set `deletedAt` and update audit columns;
- never physically delete DocumentVerification history;
- do not automatically delete Blob evidence unless explicit retention policy permits it;
- normal operational reads must exclude retired records.

### Errors

- `DOC_ALREADY_RETIRED`
- `DOC_RETIRE_REASON_REQUIRED`
- `DOC_VERSION_CONFLICT`
- scope/permission errors.

---

## 4.10 VAL-DOC-010 – Owner Search Validation

Owner search is a delegated query, not a Document aggregate command.

Rules:

- require `document.owner.search`;
- ownerType must be supported;
- query length and pagination limits must pass shared API validation;
- caller branch access constrains owner results;
- owning context remains authoritative;
- Document Management must not copy owner master data into local tables.

Errors:

- `DOC_OWNER_TYPE_UNSUPPORTED`
- `DOC_OWNER_SEARCH_QUERY_INVALID`
- `DOC_OWNER_LOOKUP_UNAVAILABLE`

---

## 4.11 VAL-DOC-011 – Blob/Database Reconciliation Validation

This capability is conditional on an approved operational persistence design.

Rules:

- require `document.operations.reconcile` or approved system identity;
- scope is `G` or `SYS`, not ordinary branch-user access;
- only known reconciliation conditions may be retried;
- retry must be idempotent;
- retry must not create duplicate Document records;
- reconciliation must not silently mutate business status beyond the original failed operation's intended effect;
- persistent reconciliation entity ownership remains an architecture gap until explicitly approved.

Errors:

- `DOC_RECONCILIATION_NOT_CONFIGURED`
- `DOC_RECONCILIATION_ITEM_NOT_FOUND`
- `DOC_RECONCILIATION_STATE_INVALID`
- `DOC_RECONCILIATION_RETRY_FAILED`

---

# 5. Lifecycle Validation Matrix

| From | To | Trigger | Validation Result | Required Permission / Actor |
|---|---|---|---|---|
| None | Uploaded | Successful registration | Allowed after owner, type, scope, Blob, date, and idempotency validation. | `document.create` |
| Uploaded | PendingVerification | Submit | Allowed. | `document.verify.submit` |
| PendingVerification | Approved | Approve | Allowed. | `document.verify.approve` |
| PendingVerification | Rejected | Reject with valid remarks | Allowed. | `document.verify.reject` |
| Uploaded | Approved | Direct approve | Forbidden. | None can override baseline transition. |
| Uploaded | Rejected | Direct reject | Forbidden. | None can override baseline transition. |
| Approved | PendingVerification | Resubmit | Undefined gap; reject until policy exists. | Not defined. |
| Rejected | PendingVerification | Resubmit | Undefined gap; reject until policy exists. | Not defined. |
| Any active lifecycle state | Expired | Expiry condition | Conditional only if approved policy persists Expired. Otherwise derive read-time condition. | System operation. |
| Expired | Uploaded | Reset | Forbidden/undefined. | Not defined. |
| Expired | PendingVerification | Renewal | Undefined gap. | Not defined. |

---

# 6. Structured Error Contract

## 6.1 Standard error envelope

```json
{
  "success": false,
  "error": {
    "code": "DOC_INVALID_STATE_TRANSITION",
    "message": "The requested document state transition is not allowed.",
    "details": {
      "currentStatus": "Approved",
      "requestedAction": "submitForVerification"
    },
    "correlationId": "01J..."
  }
}
```

Rules:

- `code` is stable and machine-readable;
- `message` is safe for user display or localization lookup;
- `details` must not expose secrets, credentials, private Blob URLs, stack traces, or cross-branch existence information;
- `correlationId` supports operational investigation;
- bilingual clients should localize messages using error code/message catalogs rather than parsing English text.

---

# 7. Error Code Catalog

## 7.1 Authentication, authorization, and scope

| Code | HTTP | Meaning | Retryable | UI Handling |
|---|---:|---|---|---|
| `AUTH_REQUIRED` | 401 | Authentication session is missing or invalid. | After re-authentication | Redirect/sign-in flow. |
| `DOC_PERMISSION_DENIED` | 403 | Actor lacks required capability permission. | No | Hide action where possible; show access denied for direct request. |
| `DOC_BRANCH_SCOPE_DENIED` | 403/404 | Actor cannot access the authoritative owner branch scope. | No | Access denied or non-disclosing not-found behavior. |
| `DOC_SELF_SCOPE_DENIED` | 403/404 | Self-service actor attempted to access another person's document. | No | Show access denied/not found. |
| `DOC_CONSOLIDATED_SCOPE_REQUIRED` | 403 | Consolidated report request lacks IAM consolidated capability. | No | Remove consolidated option. |

## 7.2 Resource and reference errors

| Code | HTTP | Meaning | Retryable | UI Handling |
|---|---:|---|---|---|
| `DOC_NOT_FOUND` | 404 | Document absent, retired, or intentionally undisclosed by scope policy. | No | Not-found state. |
| `DOC_OWNER_NOT_FOUND` | 422 | Supplied owner does not exist in authoritative context. | After correcting input | Owner field error. |
| `DOC_OWNER_INACTIVE` | 422 | Owner is deleted/ineligible for new attachment. | After owner-state correction | Owner field error. |
| `DOC_OWNER_TYPE_UNSUPPORTED` | 422 | Owner type is not enabled. | No until supported | Owner type error. |
| `DOC_TYPE_INVALID` | 422 | Document type is unknown. | After correcting input | Document type field error. |
| `DOC_TYPE_INACTIVE` | 422 | Document type exists but is not active for new use. | After selecting active type | Document type field error. |
| `DOC_OWNER_LOOKUP_UNAVAILABLE` | 503 | Owner-context lookup adapter is unavailable. | Yes | Temporary failure; retry action. |

## 7.3 Request and field validation errors

| Code | HTTP | Meaning | Retryable | UI Handling |
|---|---:|---|---|---|
| `DOC_REQUEST_INVALID` | 400 | Request shape failed schema validation. | After correcting input | Form summary + field errors. |
| `DOC_FILE_NAME_INVALID` | 422 | File name metadata violates policy. | After correction | File field error. |
| `DOC_FILE_TYPE_NOT_ALLOWED` | 415 | Media type not allowed by upload policy. | With allowed file | File field error. |
| `DOC_FILE_TOO_LARGE` | 413 | File exceeds configured upload limit. | With smaller file | File field error. |
| `DOC_DATE_INVALID` | 422 | Issue/expiry date is not a valid date-only value. | After correction | Date field error. |
| `DOC_DATE_RANGE_INVALID` | 422 | Query date range is invalid. | After correction | Filter validation. |
| `DOC_EXPIRY_BEFORE_ISSUE` | 422 | expiryDate is earlier than issueDate. | After correction | Highlight both date fields. |
| `DOC_REJECTION_REMARKS_REQUIRED` | 422 | Rejection remarks missing. | After correction | Remarks field required. |
| `DOC_REJECTION_REMARKS_INVALID` | 422 | Rejection remarks fail length/content validation. | After correction | Remarks field error. |
| `DOC_RETIRE_REASON_REQUIRED` | 422 | Retirement reason is required. | After correction | Reason field error. |
| `DOC_OWNER_SEARCH_QUERY_INVALID` | 400 | Owner search query or paging parameters invalid. | After correction | Search/filter error. |
| `DOC_EXPIRY_QUERY_INVALID` | 400 | Expiry workbench filter combination invalid. | After correction | Filter error. |

## 7.4 Lifecycle and concurrency errors

| Code | HTTP | Meaning | Retryable | UI Handling |
|---|---:|---|---|---|
| `DOC_INVALID_STATE_TRANSITION` | 409 | Requested transition is not allowed from current state. | After refresh/change | Refresh latest state. |
| `DOC_VERIFICATION_NOT_PENDING` | 409 | Approve/reject attempted on non-pending document. | After refresh | Close stale decision UI and refresh. |
| `DOC_VERSION_CONFLICT` | 409 | Optimistic version does not match current record. | Yes after refresh | Conflict banner; reload current data. |
| `DOC_ALREADY_RETIRED` | 409 | Document already soft-retired. | No | Refresh/remove from active list. |
| `DOC_FIELD_IMMUTABLE` | 422 | Command attempted to modify protected field. | After request correction | Developer-safe validation message. |
| `DOC_EVIDENCE_REPLACEMENT_POLICY_UNDEFINED` | 409 | Evidence replacement requested where lifecycle policy is unresolved. | No until policy defined | Explain operation unavailable. |
| `DOC_RESUBMISSION_POLICY_UNDEFINED` | 409 | Resubmission requested but no approved lifecycle exists. | No until policy defined | Explain operation unavailable. |

## 7.5 Blob and infrastructure consistency errors

| Code | HTTP | Meaning | Retryable | UI Handling |
|---|---:|---|---|---|
| `DOC_UPLOAD_REFERENCE_INVALID` | 422 | Upload reference is invalid or not tied to controlled flow. | Restart upload | Restart upload flow. |
| `DOC_BLOB_OBJECT_NOT_FOUND` | 422/409 | Expected uploaded Blob object cannot be confirmed. | Sometimes | Re-upload or retry verification. |
| `DOC_FILE_REFERENCE_BROKEN` | 409 | Document metadata points to unavailable evidence. | Operationally retryable | Disable normal preview; show support/retry state. |
| `DOC_FILE_ACCESS_FAILED` | 502/503 | Authorized storage retrieval failed. | Yes | Retry action. |
| `DOC_IDEMPOTENCY_CONFLICT` | 409 | Same key reused for incompatible registration request. | No with same key | Restart operation with correct request semantics. |
| `DOC_REGISTRATION_FAILED` | 500 | Metadata registration failed after validation. | Conditional | Show failure; reconciliation/compensation path handles orphan risk. |
| `DOC_VERIFICATION_COMMIT_FAILED` | 500 | Decision history/current-state transaction failed. | Yes after refresh | Do not show success; refresh and retry safely. |
| `DOC_RECONCILIATION_NOT_CONFIGURED` | 501/409 | Reconciliation operation requested before approved design exists. | No | Operations-only message. |
| `DOC_RECONCILIATION_ITEM_NOT_FOUND` | 404 | Reconciliation item absent. | No | Refresh operations list. |
| `DOC_RECONCILIATION_STATE_INVALID` | 409 | Retry requested from invalid reconciliation condition. | No | Refresh current state. |
| `DOC_RECONCILIATION_RETRY_FAILED` | 500/503 | Reconciliation retry failed. | Yes per runbook | Keep item unresolved; surface correlation ID. |

## 7.6 Generic operational errors

| Code | HTTP | Meaning | Retryable | UI Handling |
|---|---:|---|---|---|
| `DOC_DEPENDENCY_UNAVAILABLE` | 503 | Required internal context adapter/read model unavailable. | Yes | Temporary failure state. |
| `DOC_INTERNAL_ERROR` | 500 | Unexpected internal failure. | Possibly | Generic error with correlation ID. |

---

# 8. Domain Events and Notification Triggers

## 8.1 Event boundary rule

Document Management may produce domain-event facts or post-commit integration/application events within the modular monolith. This does not imply microservices, an external broker, CQRS, or Event Sourcing.

Communication & Notification consumes approved event facts and owns:

- template selection;
- recipient channel preference;
- recipient contact resolution through approved sources;
- notification scheduling;
- retry policy;
- provider interaction;
- delivery status;
- `NotificationRequest`;
- `NotificationLog`.

Document Management must not store delivery state such as `notificationSent`, `emailStatus`, provider message IDs, or retry counters in `Document`.

---

## 8.2 Notification-trigger event catalog

| Event | Triggering Action | Producer | Typical Recipient Intent | Notification Owner | Mandatory? |
|---|---|---|---|---|---|
| `DocumentUploaded` | Document metadata successfully registered as Uploaded. | Document Management | Optional acknowledgement to uploader/owner according to channel policy. | Communication & Notification | Configurable |
| `DocumentSubmittedForVerification` | Uploaded -> PendingVerification committed. | Document Management | Alert verifier queue/role recipients where configured. | Communication & Notification | Configurable |
| `DocumentApproved` | PendingVerification -> Approved committed with immutable history. | Document Management | Inform owner/uploader and relevant operational staff. | Communication & Notification | Configurable |
| `DocumentRejected` | PendingVerification -> Rejected committed with remarks history. | Document Management | Inform owner/uploader with safe rejection guidance, subject to channel policy. | Communication & Notification | Configurable |
| `DocumentExpiringSoonDetected` | Expiry evaluation identifies document within configured warning window. | Document Management expiry evaluator/application job | Reminder to owner and/or responsible internal staff. | Communication & Notification | Configurable |
| `DocumentExpiredDetected` | Expiry condition becomes true. | Document Management expiry evaluator/application job | Expiry notice/escalation where policy requires. | Communication & Notification | Configurable |
| `DocumentMetadataUpdated` | Material metadata update committed. | Document Management | Usually audit-only; notification only if policy config says material change requires notice. | Communication & Notification | Optional |
| `DocumentRetired` | Soft retirement committed. | Document Management | Notify responsible operational/compliance staff where policy requires. | Communication & Notification | Configurable |
| `DocumentFileConsistencyIssueDetected` | Blob/database inconsistency detected. | Document operations/application service | Operational alert to support/reconciliation operators. | Communication & Notification / observability boundary | Operational policy |

---

# 9. Notification Event Payload Contracts

Event payloads must contain identifiers and safe facts needed for downstream processing. They must not include Blob credentials, long-lived private file URLs, binary data, or unnecessary sensitive owner identity fields.

## 9.1 `DocumentUploaded`

```ts
type DocumentUploadedEvent = {
  eventId: string;
  occurredAt: string;
  documentId: string;
  ownerType: "Student" | "Trainer" | "Corporate" | "Person";
  ownerId: string;
  documentType: string;
  uploadedByUserId: string;
};
```

## 9.2 `DocumentSubmittedForVerification`

```ts
type DocumentSubmittedForVerificationEvent = {
  eventId: string;
  occurredAt: string;
  documentId: string;
  ownerType: string;
  ownerId: string;
  documentType: string;
  submittedByUserId: string;
};
```

## 9.3 `DocumentApproved`

```ts
type DocumentApprovedEvent = {
  eventId: string;
  occurredAt: string;
  documentId: string;
  ownerType: string;
  ownerId: string;
  documentType: string;
  verifiedByUserId: string;
  verifiedAt: string;
};
```

## 9.4 `DocumentRejected`

```ts
type DocumentRejectedEvent = {
  eventId: string;
  occurredAt: string;
  documentId: string;
  ownerType: string;
  ownerId: string;
  documentType: string;
  verifiedByUserId: string;
  verifiedAt: string;
  rejectionReasonCode?: string;
};
```

The full free-text verification remark should not automatically be broadcast to every notification channel. Communication templates should use an approved safe summary or reason code where required.

## 9.5 `DocumentExpiringSoonDetected`

```ts
type DocumentExpiringSoonDetectedEvent = {
  eventId: string;
  occurredAt: string;
  documentId: string;
  ownerType: string;
  ownerId: string;
  documentType: string;
  expiryDate: string;
  daysUntilExpiry: number;
};
```

## 9.6 `DocumentExpiredDetected`

```ts
type DocumentExpiredDetectedEvent = {
  eventId: string;
  occurredAt: string;
  documentId: string;
  ownerType: string;
  ownerId: string;
  documentType: string;
  expiryDate: string;
};
```

---

# 10. Notification Deduplication and Delivery Rules

1. A document domain event should have a stable unique event ID.
2. Communication processing should be idempotent for repeated consumption of the same event ID.
3. Expiring-soon reminders must follow configured warning windows owned by policy/configuration; Document Management must not hardcode arbitrary business windows in the aggregate.
4. A failed message delivery must not roll back a successfully committed document state transition.
5. Communication retries must not duplicate the DocumentVerification decision or mutate Document state.
6. Document Management does not maintain notification delivery counters.
7. Recipient contact data should be resolved through authoritative Person/Party/owner context data or approved communication read models.
8. Branch-scope restrictions apply when internal notification recipient groups are resolved.
9. Notification templates must support English and Arabic where configured.
10. Operational consistency alerts may be routed to internal support roles and should not expose private document content.

---

# 11. Validation Ownership Comparison Matrix

Legend:

- **OWNED** – Document Management owns and enforces the business rule.
- **DELEGATED** – another bounded context is authoritative; Document Management calls an approved application/read adapter.
- **SHARED** – common platform/shared-kernel primitive, not Document-specific domain ownership.
- **GAP** – policy/schema decision is not yet defined and must not be invented.

| ID | Validation Rule | Classification | Authoritative Owner | Document Module Responsibility |
|---|---|---|---|---|
| VO-DOC-001 | ownerType must be one of enabled Document owner categories. | OWNED | Document Management | Reject unsupported owner types. |
| VO-DOC-002 | Student owner exists. | DELEGATED | Admission & Enrollment | Query authoritative owner adapter; do not copy Student. |
| VO-DOC-003 | Trainer owner exists. | DELEGATED | Faculty / Trainer Management | Query authoritative owner adapter. |
| VO-DOC-004 | Corporate owner exists. | DELEGATED | Corporate Training Management | Query authoritative owner adapter. |
| VO-DOC-005 | Person owner exists. | DELEGATED | Shared Party/Person ownership boundary | Query approved Person service/read adapter. |
| VO-DOC-006 | Employee owner workflow enabled. | GAP/DELEGATED | Future HRMS | Keep disabled until HRMS exists. |
| VO-DOC-007 | Owner is not soft deleted/ineligible. | DELEGATED | Owner context | Enforce returned eligibility result. |
| VO-DOC-008 | User is authenticated. | DELEGATED | IAM | Reject unauthenticated request. |
| VO-DOC-009 | User has capability permission. | DELEGATED | IAM | Enforce required permission on application command/query. |
| VO-DOC-010 | User may access owner branch. | DELEGATED | IAM + owner context branch resolver | Server-side scope enforcement. |
| VO-DOC-011 | Parent/child branch visibility. | DELEGATED | IAM/Organization rules | Consume authoritative resolved scope. |
| VO-DOC-012 | Consolidated access allowed. | DELEGATED | IAM | Require permission plus `canViewConsolidated`. |
| VO-DOC-013 | Document type syntax is present. | SHARED | API schema layer | Reject malformed value. |
| VO-DOC-014 | Document type exists and is active. | DELEGATED | Configuration / Master Data or approved schema owner | Query authoritative source. |
| VO-DOC-015 | fileName non-empty/length/control character checks. | OWNED/SHARED | Document application boundary + shared text primitive | Validate metadata. |
| VO-DOC-016 | Original file name is not a globally unique Blob key. | OWNED | Document application/infrastructure boundary | Generate safe server-side storage key/path strategy. |
| VO-DOC-017 | Allowed content type. | SHARED | Security/upload policy | Apply configured allowlist. |
| VO-DOC-018 | Maximum upload size. | SHARED | NFR/infrastructure configuration | Apply configured limit. |
| VO-DOC-019 | Blob object exists after controlled upload. | OWNED via infrastructure adapter | Document application service + Blob adapter | Confirm before registration. |
| VO-DOC-020 | Blob credentials/tokens are not accepted as ordinary domain metadata. | OWNED/SHARED security | Security architecture | Keep secret/server-controlled. |
| VO-DOC-021 | issueDate/expiryDate are valid date-only values. | SHARED | Platform date primitive | Validate syntax/calendar correctness. |
| VO-DOC-022 | expiryDate is not earlier than issueDate. | OWNED | Document Management | Enforce cross-field invariant. |
| VO-DOC-023 | null expiryDate is allowed for non-expiring evidence. | OWNED | Document Management | Accept null. |
| VO-DOC-024 | New Document begins Uploaded. | OWNED | Document Management | Set server-side. |
| VO-DOC-025 | Only Uploaded may submit to PendingVerification under baseline flow. | OWNED | Document Management | Reject other states. |
| VO-DOC-026 | Only PendingVerification may be approved. | OWNED | Document Management | Reject other states. |
| VO-DOC-027 | Only PendingVerification may be rejected. | OWNED | Document Management | Reject other states. |
| VO-DOC-028 | Rejection remarks mandatory. | OWNED | Document Management | Enforce schema/domain rule. |
| VO-DOC-029 | Approve/reject creates immutable history. | OWNED | Document Management | Insert new DocumentVerification row. |
| VO-DOC-030 | Prior verification history cannot be overwritten. | OWNED | Document Management | Append-only behavior. |
| VO-DOC-031 | Current status and decision history remain consistent. | OWNED | Document Management | Transactional consistency. |
| VO-DOC-032 | Verifier identity/time are server-derived. | OWNED + IAM identity source | Document Management/IAM | Derive authenticated actor and server time. |
| VO-DOC-033 | optimistic version matches current entity. | SHARED repository convention, applied locally | Shared persistence convention | Reject stale mutation. |
| VO-DOC-034 | expired condition is expiryDate < effective business date. | OWNED | Document Management | Evaluate condition. |
| VO-DOC-035 | effective business date/timezone convention. | SHARED | Platform date/time policy | Use Oman default policy. |
| VO-DOC-036 | whether Expired is persisted or derived. | GAP | Architecture/data model decision | Do not invent state persistence behavior. |
| VO-DOC-037 | rejected document resubmission policy. | GAP | Domain decision required | Reject unsupported resubmit command. |
| VO-DOC-038 | approved evidence replacement/reset semantics. | GAP | Domain decision required | Block silent file replacement. |
| VO-DOC-039 | file access requires authentication, permission, and scope. | OWNED enforcement + IAM facts | Document Management/IAM | Enforce every access request. |
| VO-DOC-040 | Blob URL possession alone authorizes access. | OWNED rejection rule | Document Management/security | Never treat URL possession as authority. |
| VO-DOC-041 | hard delete prohibited. | OWNED/shared repository policy | Document Management + platform convention | Expose only soft retirement. |
| VO-DOC-042 | retired documents excluded from normal reads. | OWNED | Document Management | Repository query filter. |
| VO-DOC-043 | Blob retention/destruction policy after retirement. | GAP/DELEGATED | Retention/compliance architecture | Preserve evidence until approved policy permits deletion. |
| VO-DOC-044 | notification recipient channel preference. | DELEGATED | Communication & Notification | Emit safe event facts only. |
| VO-DOC-045 | notification retry and provider delivery. | DELEGATED | Communication & Notification | Do not mutate Document for delivery failure. |
| VO-DOC-046 | audit event persistence and audit query policy. | DELEGATED | Audit & Compliance | Supply critical action facts. |
| VO-DOC-047 | reports may mutate Document state. | OWNED prohibition / Reporting boundary | Reporting & Dashboards is read-only consumer | Reject any write-through reporting path. |
| VO-DOC-048 | certificate eligibility or issuance. | DELEGATED | Exam & Completion / Certificate Management | Document module may expose evidence but must not decide eligibility. |
| VO-DOC-049 | finance receipt/invoice validity. | DELEGATED | Finance & Receivables | Document module stores/serves attached evidence only where modeled. |
| VO-DOC-050 | reconciliation persistence entity. | GAP | Architecture decision | Do not invent table without ownership decision. |

---

# 12. Validation-to-Business-Rule Traceability

| Validation Area | Part 1 Business Rules |
|---|---|
| Owner association and owner validation | BR-DOC-001 to BR-DOC-008, BR-DOC-040, BR-DOC-047, BR-DOC-052, BR-DOC-053 |
| Blob upload and registration consistency | BR-DOC-009 to BR-DOC-013, BR-DOC-036 to BR-DOC-039, BR-DOC-057, BR-DOC-058 |
| Date and expiry validation | BR-DOC-014 to BR-DOC-016, BR-DOC-026 to BR-DOC-028, BR-DOC-050, BR-DOC-051, BR-DOC-055 |
| Lifecycle and verification | BR-DOC-017 to BR-DOC-025, BR-DOC-048, BR-DOC-049, BR-DOC-059 |
| Audit and deletion | BR-DOC-030 to BR-DOC-034 |
| File access security | BR-DOC-035 to BR-DOC-039 |
| Cross-context ownership | BR-DOC-040 to BR-DOC-047, BR-DOC-060 |
| Permissions and reporting | BR-DOC-044 to BR-DOC-046 |

---

# 13. API-to-Validation Mapping

| API Contract | Core Validation Schemas |
|---|---|
| API-DOC-001 Create Upload Intent | VAL-DOC-001 |
| API-DOC-002 Register Uploaded Document | VAL-DOC-002 |
| API-DOC-003 List/Search Documents | auth, permission, branch scope, query schema primitives |
| API-DOC-004 Get Document Detail | auth, `document.read`, owner-derived scope |
| API-DOC-005 Update Metadata | VAL-DOC-003 |
| API-DOC-006 Submit for Verification | VAL-DOC-004 |
| Verification Queue query | permission, owner-derived branch scope, status filter validation |
| Approve Verification | VAL-DOC-005 |
| Reject Verification | VAL-DOC-006 |
| Verification History query | auth, `document.history.read`, scope validation |
| Secure File Access | VAL-DOC-007 |
| Expiry Workbench | VAL-DOC-008 + filter schemas |
| Soft Retirement | VAL-DOC-009 |
| Document Type Lookup | Configuration delegated validation and branch-neutral lookup policy as approved |
| Owner Search | VAL-DOC-010 |
| Reconciliation Operations | VAL-DOC-011 |

---

# 14. UI Validation Behavior

## 14.1 Field validation

The UI may perform client-side validation for user experience, but the server remains authoritative.

Examples:

- required document type;
- required owner;
- date formatting;
- expiry-before-issue immediate warning;
- rejection remarks requirement;
- file size/type preliminary check.

Client validation must not be treated as security enforcement.

## 14.2 Dynamic error states

| Error Type | UI State |
|---|---|
| Schema/field error | Inline field error plus form summary. |
| Permission denied | Hide unavailable actions where known; direct access shows access-denied state. |
| Branch scope denial | Non-disclosing access-denied/not-found handling. |
| Version conflict | Preserve unsaved user input where safe, show conflict banner, reload current server state. |
| Invalid lifecycle state | Refresh status/action bar and explain that the document changed. |
| Blob retrieval failure | Show evidence temporarily unavailable; do not expose raw provider error. |
| Dependency unavailable | Retryable service-unavailable state. |
| Unknown server error | Correlation ID and safe support message. |

---

# 15. Security Validation Rules

1. All mutation commands require authenticated server-side identity.
2. `uploadedBy`, `verifiedBy`, and decision timestamps are never trusted from client input.
3. Every direct-ID read and command must perform owner-derived scope authorization.
4. Menu visibility is not authorization.
5. A role name must not be hardcoded into domain validation.
6. Capability permissions defined in Part 6 are the authorization vocabulary.
7. Consolidated report access requires report permission plus IAM consolidated capability.
8. Blob storage tokens, credentials, and private URLs must not be logged.
9. Binary file contents must not be included in application logs or domain events.
10. Error messages must not disclose inaccessible owner or document existence where security conventions require non-disclosure.
11. Rejection remarks may contain sensitive business content and must be access-controlled with verification history.
12. Reconciliation operations are restricted to `G` or `SYS` scope.

---

# 16. DDD Fit and ER Alignment Check

## 16.1 DDD alignment

This Part preserves the following ownership boundaries:

- Document Management validates its own document lifecycle and metadata invariants.
- IAM remains authoritative for authentication, permission grants, and branch access.
- Owner contexts remain authoritative for owner existence and state.
- Configuration remains authoritative for configurable document type semantics where applicable.
- Communication owns notification processing and delivery state.
- Audit & Compliance owns AuditLog persistence.
- Reporting is a read-only consumer.
- Certificate, Finance, Exam & Completion, and other contexts retain their business decision ownership.

No validation rule in this Part authorizes Document Management to compute certificate eligibility, payment validity, course completion, trainer employment state, corporate credit, or student enrollment status.

## 16.2 ER alignment

The validation rules align with the ER model's Document fields:

```text
id
ownerType
ownerId
documentType
fileName
fileUrl
issueDate
expiryDate
verificationStatus
uploadedBy
verifiedBy
verifiedAt
```

and DocumentVerification fields:

```text
id
documentId
status
remarks
verifiedBy
verifiedAt
```

Supported ER lifecycle values are preserved:

```text
Uploaded
PendingVerification
Approved
Rejected
Expired
```

No additional persisted status is introduced.

---

# 17. Explicit Gaps and Decisions Still Required

The following items remain unresolved and must not be silently implemented:

1. **Prisma schema validation** – final field types, enum names, indexes, FK representation, audit columns, and version availability must be compared with the actual `schema.prisma`.
2. **Document type persistence** – Part 1–6 preserve the ambiguity between ER scalar `documentType` and DDD conceptual `DocumentType` configuration ownership.
3. **Person branch resolver** – generic Person-owned documents require an approved branch-scope resolution rule where a Person may not have a single inherent branch.
4. **Expired persistence** – ER defines `Expired`, but the system must decide whether it is stored as current status or derived from expiryDate.
5. **Rejected resubmission** – no approved transition/model currently defines edit-and-resubmit versus replacement-document behavior.
6. **Approved evidence replacement** – replacing evidence must not silently retain approval; exact policy remains undefined.
7. **Blob operational metadata** – provider-specific keys, etags, hashes, size, and content type require explicit schema review if they are to be persisted beyond existing ER fields.
8. **Reconciliation persistence** – no new reconciliation table may be introduced until ownership and schema are approved.
9. **Retention/destruction policy** – soft retirement does not automatically authorize deletion of Blob evidence.
10. **Notification warning windows** – expiry reminder thresholds must be configurable or approved as policy; they must not be invented in the aggregate.

---

# 18. Final Consistency Statement

This Part 7 is consistent with Parts 1–6:

- it uses canonical permission `document.verify.submit`;
- it preserves the Part 2 state machine;
- it supports the screens and dynamic UI error states defined in Part 3;
- it validates only `Document` and `DocumentVerification` as owned transactional entities from Part 4;
- it maps validation failures to the API surface defined in Part 5;
- it enforces the branch, global, self-service, and consolidated scope model defined in Part 6;
- it keeps notification delivery state outside Document Management;
- it introduces no microservices, external broker, CQRS, or Event Sourcing architecture;
- it keeps Vercel Blob behind an infrastructure boundary and does not make Blob the owner of document lifecycle state.

