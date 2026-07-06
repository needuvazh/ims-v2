# Part 7 – Validation Rules, Error Catalog, Notifications

## Module 11 – Certificate Management

## 1. Purpose

This document defines the validation architecture, business validation schemas, structured error catalog, notification-trigger rules, and validation ownership boundaries for Module 11 – Certificate Management.

It extends Parts 1–6 and preserves the established DDD rule that Certificate Management owns certificate generation, issuance, verification, reissue, replacement lineage, revocation, and certificate lifecycle state. It does not calculate completion eligibility, payment completion, branch authorization, numbering policy, communication delivery status, or audit history owned by other bounded contexts.

The governing validation chain is:

```text
Client request
    |
    v
Transport/schema validation
    |
    v
Authentication and permission validation
    |
    v
IAM branch/self/trainer scope resolution
    |
    v
Certificate-owned aggregate validation
    |
    +--> Enrollment reference read
    +--> Completion eligibility decision read
    +--> Finance payment-gate decision read
    +--> Numbering allocation request
    |
    v
Transactional mutation of Certificate-owned records
    |
    +--> Audit command/event for sensitive action
    +--> NotificationRequest integration command where configured
    +--> Reporting/read-model lifecycle fact publication
```

### 1.1 Validation Principles

1. Validation is layered. Request-shape validation does not replace domain validation.
2. Client-side validation is advisory only; every authoritative validation is repeated server-side.
3. Certificate Management validates Certificate-owned invariants and consumes authoritative decisions from owning contexts.
4. Certificate Management must never derive completion eligibility from raw attendance, marks, grades, or course rules.
5. Certificate Management must never derive payment completion by summing invoices, payments, receipts, refunds, or receivables.
6. IAM owns permission and effective branch-scope decisions. Certificate services enforce the returned authorization outcome.
7. Configuration/Master Data owns numbering series. Certificate Management consumes allocated certificate numbers and fails safely when numbering is unavailable.
8. Sensitive lifecycle commands must validate current authoritative state at command time, not rely on stale UI state.
9. All lifecycle mutations use optimistic concurrency through the aggregate `version` convention where supported.
10. Generate, issue, and replacement-generation commands are idempotent and retry-safe.
11. No validation failure may partially persist a certificate, consume an unrecoverable certificate number without documented numbering behavior, or write a replacement lineage link without its corresponding replacement certificate transaction succeeding.
12. Validation failures are returned through the structured error catalog in this document and Part 5.
13. Public verification uses privacy-minimized responses and must not leak existence through distinguishable internal errors beyond the approved public result model.
14. Notification requests are side effects after authoritative business success; notification delivery failure must not roll back an already committed certificate lifecycle transaction.
15. The modular-monolith architecture is retained. Validation coordination occurs through package/application ports, not microservices or external brokers.

---

# 2. Validation Architecture

## 2.1 Validation Layers

| Layer | Responsibility | Typical Failure | Owner |
|---|---|---|---|
| L1 Transport | JSON shape, type, required fields, basic formats, list limits | `VALIDATION_ERROR` | Certificate API/application boundary |
| L2 Authentication | Valid authenticated identity for non-public routes | `UNAUTHENTICATED` | IAM/platform auth |
| L3 Authorization | Fine-grained permission and access mode | `PERMISSION_DENIED` | IAM decision; Certificate enforces |
| L4 Scope | Branch, self, trainer, consolidated scope | `BRANCH_SCOPE_DENIED`, `NOT_FOUND` | IAM scope resolver; Certificate enforces |
| L5 Aggregate | Certificate state, duplicate prevention, reissue lineage, verification behavior | `INVALID_STATE_TRANSITION`, domain-specific 409/422 | Certificate Management |
| L6 Cross-context gate | Completion approved, payment gate passed, enrollment source references consistent | `COMPLETION_NOT_APPROVED`, `PAYMENT_VALIDATION_FAILED`, `SOURCE_REFERENCE_INCONSISTENT` | Owning context supplies truth; Certificate orchestrates |
| L7 Persistence | uniqueness, FK integrity, optimistic version | `VERSION_CONFLICT`, `DUPLICATE_*`, `REFERENCE_NOT_FOUND` | Certificate repository/database |
| L8 Side-effect integration | audit command acceptance, notification request acceptance, reporting publication | integration error or retry record per architecture | Owning integration boundary |

## 2.2 Validation Result Contract

Application validators should return a typed decision rather than throwing implementation-specific database or framework exceptions.

```ts
type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

type ValidationOwnership =
  | 'CERTIFICATE'
  | 'ENROLLMENT'
  | 'COMPLETION'
  | 'FINANCE'
  | 'IAM'
  | 'CONFIGURATION'
  | 'AUDIT'
  | 'COMMUNICATION'
  | 'SHARED_KERNEL';

interface ValidationIssue {
  code: string;
  messageKey: string;
  field?: string;
  severity: ValidationSeverity;
  owner: ValidationOwnership;
  details?: Record<string, string | number | boolean | null>;
}

interface ValidationDecision {
  valid: boolean;
  issues: ValidationIssue[];
  evaluatedAt: string; // ISO-8601 UTC
}
```

Rules:

- API error messages are localized by `messageKey`; domain codes remain language-neutral.
- `details` must not contain secrets or unnecessary PII.
- Public APIs do not expose `owner`, internal identifiers, or diagnostic details.
- Warnings do not authorize a command that has any error-severity issue.

---

# 3. Custom Business Validation Schemas

The following schemas are application/domain validation contracts. They are intentionally more expressive than transport-only DTO schemas.

## 3.1 `CertificateReadinessValidationSchema`

**Purpose:** Determine whether a specific Enrollment may enter the normal certificate generation path.

```ts
interface CertificateReadinessValidationInput {
  enrollmentId: string;
  requestedLanguage: 'en' | 'ar';
  actorUserId: string;
  requestedBranchId?: string;
}

interface CertificateReadinessValidationResult {
  enrollmentId: string;
  effectiveBranchId: string;
  sourceReferencesValid: boolean;
  completionApproved: boolean;
  paymentValidationRequired: boolean;
  paymentValidationPassed: boolean;
  existingActiveCertificate: boolean;
  numberingSeriesAvailable: boolean;
  languageSupported: boolean;
  eligible: boolean;
  issues: ValidationIssue[];
  evaluatedAt: string;
}
```

### Validation Rules

| Rule ID | Rule | Failure Code | Owner |
|---|---|---|---|
| VR-CERT-001 | `enrollmentId` must resolve to one current Enrollment. | `ENROLLMENT_NOT_FOUND` | Enrollment decision/reference |
| VR-CERT-002 | Enrollment must resolve student, course, batch, and branch source references. | `SOURCE_REFERENCE_INCOMPLETE` | Certificate orchestration using Enrollment truth |
| VR-CERT-003 | Student/course/batch/branch references used for the Certificate must belong to the same Enrollment journey. | `SOURCE_REFERENCE_INCONSISTENT` | Certificate |
| VR-CERT-004 | Completion decision must be approved before normal generation. | `COMPLETION_NOT_APPROVED` | Completion |
| VR-CERT-005 | When `paymentValidationRequired=true`, Finance must return a passed validation decision. | `PAYMENT_VALIDATION_FAILED` | Finance |
| VR-CERT-006 | Normal generation must not create another active issued certificate for the same enrollment. | `DUPLICATE_ACTIVE_CERTIFICATE` | Certificate |
| VR-CERT-007 | Requested language must be `en` or `ar`. | `UNSUPPORTED_CERTIFICATE_LANGUAGE` | Certificate/shared locale contract |
| VR-CERT-008 | An active Certificate NumberingSeries must be resolvable through Configuration. | `CERTIFICATE_NUMBERING_UNAVAILABLE` | Configuration |
| VR-CERT-009 | Actor must have `certificate.generate`. | `PERMISSION_DENIED` | IAM |
| VR-CERT-010 | Enrollment branch must fall within actor's effective branch scope. | `BRANCH_SCOPE_DENIED` | IAM |

The readiness endpoint may display individual blockers, but the generate command must execute these checks again against current authoritative state.

---

## 3.2 `GenerateCertificateCommandSchema`

```ts
interface GenerateCertificateCommand {
  enrollmentId: string;
  language: 'en' | 'ar';
  expectedEnrollmentSnapshotVersion?: string;
  idempotencyKey: string;
  requestedBranchId?: string;
}
```

### Structural Validation

| Field | Rule |
|---|---|
| `enrollmentId` | Required, non-empty opaque identifier; maximum 128 characters. |
| `language` | Required; exact value `en` or `ar`. |
| `idempotencyKey` | Required; 8–128 characters; allowed printable URL-safe identifier characters; same key must not be reused for a different payload. |
| `requestedBranchId` | Optional; may narrow but never expand effective scope. |

### Domain Validation

1. Execute `CertificateReadinessValidationSchema` against current state.
2. Lock or otherwise protect duplicate-sensitive generation within repository transaction strategy.
3. Confirm no active normal certificate exists for the enrollment.
4. Request a certificate number from Configuration/Numbering.
5. Generate a cryptographically strong opaque verification code.
6. Enforce verification-code uniqueness.
7. Build the QR verification reference without learner PII.
8. Render using the current approved hardcoded template path.
9. Persist the Certificate aggregate with source references consistent with Enrollment.
10. Persist artifact URL/reference only after artifact storage succeeds according to transaction/compensation architecture.
11. Record audit event/command for generation.
12. Publish lifecycle fact after commit.
13. Return the same logical result for idempotent replay.

---

## 3.3 `IssueCertificateCommandSchema`

```ts
interface IssueCertificateCommand {
  certificateId: string;
  expectedVersion: number;
  idempotencyKey: string;
  issueReason?: string;
}
```

### Rules

| Rule ID | Rule | Failure Code |
|---|---|---|
| VR-CERT-011 | Certificate must exist and be visible in actor scope. | `CERTIFICATE_NOT_FOUND` or concealed `NOT_FOUND` |
| VR-CERT-012 | Actor must have `certificate.issue`. | `PERMISSION_DENIED` |
| VR-CERT-013 | Current lifecycle status must allow issuance. | `INVALID_STATE_TRANSITION` |
| VR-CERT-014 | Artifact reference must exist and be retrievable according to storage contract. | `CERTIFICATE_ARTIFACT_UNAVAILABLE` |
| VR-CERT-015 | Verification code and certificate number must exist and satisfy uniqueness constraints. | `CERTIFICATE_INTEGRITY_ERROR` |
| VR-CERT-016 | Completion approval must still be authoritative at command time. | `COMPLETION_NOT_APPROVED` |
| VR-CERT-017 | Required payment validation must still pass at command time. | `PAYMENT_VALIDATION_FAILED` |
| VR-CERT-018 | `expectedVersion` must match. | `VERSION_CONFLICT` |
| VR-CERT-019 | Replayed idempotency key with same payload returns prior result; different payload fails. | `IDEMPOTENCY_KEY_CONFLICT` |

Post-success validation:

- `issuedDate` is set.
- `issuedBy` records authenticated actor/system identity.
- lifecycle status reflects issued state.
- audit record/request captures old and new values.
- notification request is emitted only after successful commit and when policy enables certificate-issued notification.

---

## 3.4 `PublicVerificationInputSchema`

```ts
interface PublicVerificationInput {
  verificationCode: string;
}
```

### Rules

- trim surrounding whitespace;
- required after trim;
- maximum 256 characters;
- treat as opaque string; no PII-based fallback lookup;
- do not support lookup by civil ID, passport, phone, email, invoice number, or student number on public routes;
- rate-limit by platform-approved abuse controls;
- return only the public verification DTO;
- a revoked certificate returns `REVOKED`, never `VALID`;
- a replacement/superseded presentation is allowed only when lifecycle policy is formally resolved; do not infer lineage from unsupported schema assumptions;
- verification attempt persistence follows retention/privacy policy.

### Public Result DTO

```ts
type PublicVerificationStatus =
  | 'VALID'
  | 'REVOKED'
  | 'REPLACED'
  | 'INVALID_OR_NOT_FOUND';

interface PublicCertificateVerificationResult {
  status: PublicVerificationStatus;
  certificateNumber?: string;
  learnerDisplayName?: string;
  courseDisplayName?: string;
  issuedDate?: string;
  language?: 'en' | 'ar';
}
```

`REPLACED` is conditional on resolution of the reissue/cardinality model noted in Parts 1–6. Until authoritative schema supports the lineage interpretation, public behavior must use the approved lifecycle policy and must not invent it.

---

## 3.5 `RecordCertificateVerificationSchema`

```ts
interface RecordCertificateVerificationInput {
  certificateId: string;
  verificationCode: string;
  verificationStatus: string;
  verifiedAt: string;
  verifiedByIp?: string;
}
```

Rules:

1. `certificateId` must reference the resolved Certificate.
2. `verificationCode` must correspond to the same Certificate.
3. `verifiedAt` is server-generated UTC time; client timestamps are ignored.
4. `verifiedByIp` capture, hashing, truncation, encryption, and retention must follow approved privacy/security architecture.
5. The ER does not enumerate `verificationStatus`; code must use the authoritative Prisma enum once available. Until then, do not persist invented enum literals.
6. Verification log persistence failure policy must be explicit in operations architecture: it must not incorrectly turn a valid certificate into invalid, but observability must expose logging failure.

---

## 3.6 `SubmitReissueRequestSchema`

```ts
interface SubmitReissueRequestCommand {
  certificateId: string;
  reason: string;
  expectedCertificateVersion?: number;
}
```

### Validation Rules

| Rule ID | Rule | Failure Code |
|---|---|---|
| VR-CERT-020 | Certificate must exist. | `CERTIFICATE_NOT_FOUND` |
| VR-CERT-021 | Requester must be authenticated. | `UNAUTHENTICATED` |
| VR-CERT-022 | Internal requester requires `certificate.reissue.request`; student requester requires self-scope entitlement. | `PERMISSION_DENIED` |
| VR-CERT-023 | Student requester must own the enrollment-linked student identity. | `NOT_FOUND` or `SELF_SCOPE_DENIED` internally |
| VR-CERT-024 | Reason is mandatory after trim. | `REISSUE_REASON_REQUIRED` |
| VR-CERT-025 | Reason length must be 10–1000 characters. | `REISSUE_REASON_INVALID_LENGTH` |
| VR-CERT-026 | No other non-terminal reissue request may exist for the same original certificate. | `REISSUE_REQUEST_ALREADY_OPEN` |
| VR-CERT-027 | A request must not directly create a replacement certificate. | `REISSUE_APPROVAL_REQUIRED` |
| VR-CERT-028 | `requestedBy` is derived from authenticated identity, never trusted from request body. | `VALIDATION_ERROR` if supplied in prohibited body shape |

---

## 3.7 `ReviewReissueRequestSchema`

```ts
interface ReviewReissueRequestCommand {
  requestId: string;
  decision: 'APPROVE' | 'REJECT';
  remarks: string;
  expectedVersion: number;
}
```

Rules:

- actor requires `certificate.reissue.approve` for approval/rejection decisions;
- request must be visible in branch scope;
- request must be in the approved pre-decision state once authoritative enum is confirmed;
- terminal requests cannot be decided again;
- `remarks` is mandatory for rejection, 10–1000 characters;
- approval remarks may be optional but are limited to 1000 characters;
- `approvedBy` and `approvedAt` are set only for approved requests as modeled by the ER;
- rejection reason/history must be captured by Audit/Approval history because ER lacks dedicated rejection fields;
- state change and audit command must be correlated by request/correlation ID;
- version mismatch fails with `VERSION_CONFLICT`.

---

## 3.8 `GenerateReplacementCertificateSchema`

```ts
interface GenerateReplacementCertificateCommand {
  reissueRequestId: string;
  language?: 'en' | 'ar';
  expectedVersion: number;
  idempotencyKey: string;
}
```

### Rules

1. Reissue request exists and is in approved state.
2. `newCertificateId` is empty before generation.
3. Actor has `certificate.reissue.generate`.
4. Original certificate is in actor's effective branch scope.
5. Requested language, when provided, is `en` or `ar`; otherwise the approved policy inherits original certificate language.
6. Generation uses an approved Certificate NumberingSeries allocation.
7. New verification code is unique and does not reuse the original verification code.
8. New certificate number is unique and does not reuse the original certificate number unless a formally approved numbering policy explicitly permits suffix semantics; no such policy is currently established in the source documents.
9. Replacement certificate and `newCertificateId` lineage update occur atomically within Certificate-owned transaction boundaries.
10. Multiple replacement certificates from the same reissue request are forbidden.
11. Idempotent replay returns the prior replacement result.
12. Notification request occurs after commit.
13. The Enrollment-to-Certificate 1:1 versus replacement-lineage ambiguity must be resolved before physical uniqueness constraints are finalized.

---

## 3.9 `RevokeCertificateSchema`

```ts
interface RevokeCertificateCommand {
  certificateId: string;
  reason: string;
  expectedVersion: number;
}
```

Rules:

| Rule ID | Rule | Failure Code |
|---|---|---|
| VR-CERT-030 | Actor must have `certificate.revoke`. | `PERMISSION_DENIED` |
| VR-CERT-031 | Certificate must be inside effective scope unless actor has explicitly approved global compliance authority. | `BRANCH_SCOPE_DENIED` |
| VR-CERT-032 | Reason is mandatory, 10–1000 characters. | `REVOCATION_REASON_REQUIRED` / `REVOCATION_REASON_INVALID_LENGTH` |
| VR-CERT-033 | Current state must allow revocation. | `INVALID_STATE_TRANSITION` |
| VR-CERT-034 | Already revoked certificate cannot be revoked again as a new transition. | `CERTIFICATE_ALREADY_REVOKED` |
| VR-CERT-035 | Expected version must match. | `VERSION_CONFLICT` |
| VR-CERT-036 | Public verification must resolve revoked certificate as `REVOKED`. | `CERTIFICATE_INTEGRITY_ERROR` if postcondition fails |

**ER gap:** The ER supports `certificateStatus` but does not define structured `revokedAt`, `revokedBy`, or `revocationReason`. Until schema extension is approved, reason and actor evidence must be preserved in AuditLog/Approval history as applicable; this document does not invent Certificate columns.

---

## 3.10 `CertificateRegistryQuerySchema`

```ts
interface CertificateRegistryQuery {
  branchId?: string;
  search?: string;
  status?: string[];
  language?: Array<'en' | 'ar'>;
  issuedFrom?: string;
  issuedTo?: string;
  page: number;
  pageSize: number;
  sortBy?: 'issuedDate' | 'certificateNumber' | 'createdAt' | 'status';
  sortDirection?: 'asc' | 'desc';
}
```

Rules:

- `page >= 1`;
- `1 <= pageSize <= 100`;
- `issuedFrom <= issuedTo`;
- range must not exceed the API/report maximum configured in NFR unless export endpoint is used;
- `branchId` must be within effective scope;
- `status` values must come from authoritative schema enum when confirmed;
- search length maximum 200 characters;
- sort fields use allow-list only;
- deterministic secondary sort by immutable ID or certificate number prevents duplicate/missing rows between pages;
- registry queries exclude soft-deleted records by default unless an explicitly authorized compliance view is defined.

---

## 3.11 `CertificateNotificationRequestSchema`

Certificate Management may request notifications but does not own delivery state.

```ts
interface CertificateNotificationRequest {
  eventType:
    | 'CertificateGenerated'
    | 'CertificateReissued'
    | 'CertificateVerified';
  certificateId: string;
  recipientPersonId?: string;
  locale: 'en' | 'ar';
  payload: Record<string, string | number | boolean | null>;
  correlationId: string;
}
```

Rules:

1. Notification event type must map to an approved DDD event or approved application policy.
2. `recipientPersonId` is resolved from authoritative Person/Enrollment linkage; email/phone must not be invented from Certificate data.
3. Payload contains identifiers and display facts necessary for template rendering, not full entity snapshots.
4. Civil ID, passport, visa number, payment details, marks, attendance evidence, and internal approval comments are prohibited payload fields.
5. Communication context selects template/channel and owns `NotificationRequest`, `NotificationLog`, delivery state, retries, and provider IDs.
6. Certificate transaction success is not rolled back because a notification request or delivery later fails.
7. `CertificateRevoked` is not listed in the supplied DDD Certificate event catalog. A revocation notification may be required operationally, but the domain-event contract must be formally added before treating `CertificateRevoked` as an authoritative event name.

---

# 4. Validation Rule Catalog and Ownership Comparison

## 4.1 Ownership Legend

- **MODULE** – Certificate Management owns and evaluates the rule.
- **DELEGATED** – another bounded context owns the truth/decision; Certificate Management invokes or consumes it.
- **SHARED-KERNEL ONLY** – technical/common format behavior shared across modules; no business ownership is transferred.

## 4.2 Comprehensive Validation Ownership Matrix

| Validation Rule ID | Validation Rule | Classification | Owning Context / Kernel | Certificate Responsibility |
|---|---|---|---|---|
| VR-CERT-001 | Enrollment must exist. | DELEGATED | Admission & Enrollment | Request authoritative read; do not duplicate Enrollment. |
| VR-CERT-002 | Enrollment source references must resolve. | DELEGATED | Admission & Enrollment plus owning reference contexts | Consume source projection/read contract. |
| VR-CERT-003 | Certificate student/course/batch/branch must describe the same enrollment journey. | MODULE | Certificate Management | Validate consistency before persistence. |
| VR-CERT-004 | Completion must be approved. | DELEGATED | Exam, Result & Completion | Consume approved completion decision only. |
| VR-CERT-005 | Required payment validation must pass. | DELEGATED | Finance & Receivables | Consume payment-validation decision only. |
| VR-CERT-006 | No duplicate active normal certificate for same enrollment. | MODULE | Certificate Management | Enforce aggregate/repository uniqueness strategy. |
| VR-CERT-007 | Certificate language is supported. | MODULE + SHARED-KERNEL ONLY | Certificate owns allowed artifact languages; locale type may be shared | Validate `en`/`ar`; shared locale parsing only. |
| VR-CERT-008 | Active certificate numbering series must exist. | DELEGATED | Configuration / Master Data | Request allocation; fail safely if unavailable. |
| VR-CERT-009 | Actor has generation permission. | DELEGATED | IAM | Enforce IAM decision. |
| VR-CERT-010 | Target branch is in effective scope. | DELEGATED | IAM | Enforce scope; never trust request branch alone. |
| VR-CERT-011 | Certificate exists and is visible. | MODULE + DELEGATED scope | Certificate + IAM | Repository lookup constrained by scope. |
| VR-CERT-012 | Actor may issue. | DELEGATED | IAM | Require `certificate.issue`. |
| VR-CERT-013 | Current certificate state permits issuance. | MODULE | Certificate Management | State-machine guard. |
| VR-CERT-014 | Certificate artifact is available before issuance/download. | MODULE with Storage infrastructure dependency | Certificate Management | Verify owned artifact reference/storage outcome. |
| VR-CERT-015 | Certificate number and verification code integrity holds. | MODULE | Certificate Management | Enforce required and unique values. |
| VR-CERT-016 | Completion approval remains valid at issue time. | DELEGATED | Exam, Result & Completion | Revalidate current authoritative decision. |
| VR-CERT-017 | Payment gate remains valid at issue time. | DELEGATED | Finance & Receivables | Revalidate current authoritative decision. |
| VR-CERT-018 | Aggregate version matches. | SHARED-KERNEL ONLY + MODULE enforcement | Shared persistence convention; Certificate aggregate | Compare and reject stale writes. |
| VR-CERT-019 | Idempotency key semantics hold. | SHARED-KERNEL ONLY + MODULE command semantics | Shared application infrastructure; Certificate command handler | Bind key to command payload/result. |
| VR-CERT-020 | Reissue certificate reference exists. | MODULE | Certificate Management | Validate owned aggregate reference. |
| VR-CERT-021 | Reissue requester is authenticated. | DELEGATED | IAM/platform auth | Require valid identity. |
| VR-CERT-022 | Requester has reissue entitlement. | DELEGATED | IAM | Enforce permission/self entitlement. |
| VR-CERT-023 | Student requester owns the target certificate journey. | DELEGATED + MODULE mapping | IAM/Person/Enrollment truth; Certificate query | Resolve self scope without duplicating identity. |
| VR-CERT-024 | Reissue reason is mandatory. | MODULE | Certificate Management | Validate normalized reason. |
| VR-CERT-025 | Reissue reason length is 10–1000. | MODULE | Certificate Management | Enforce field rule. |
| VR-CERT-026 | Only one non-terminal reissue request per original certificate. | MODULE | Certificate Management | Enforce query/constraint transactionally. |
| VR-CERT-027 | Reissue request cannot directly create replacement. | MODULE | Certificate Management | Require approval state first. |
| VR-CERT-028 | `requestedBy` comes from auth identity. | DELEGATED identity + MODULE assignment | IAM + Certificate | Server assigns requester. |
| VR-CERT-029 | Reissue approval history is authoritative outside Certificate transaction fields. | DELEGATED | Audit & Compliance | Submit approval/audit evidence; do not own ApprovalHistory. |
| VR-CERT-030 | Revoker has permission. | DELEGATED | IAM | Require `certificate.revoke`. |
| VR-CERT-031 | Revocation target is in allowed branch/global scope. | DELEGATED | IAM | Enforce decision. |
| VR-CERT-032 | Revocation reason is mandatory and bounded. | MODULE | Certificate Management | Validate command; preserve evidence through Audit gap strategy. |
| VR-CERT-033 | Current lifecycle state permits revocation. | MODULE | Certificate Management | State-machine guard. |
| VR-CERT-034 | Repeated revocation is rejected/idempotently represented. | MODULE | Certificate Management | Prevent duplicate state transition. |
| VR-CERT-035 | Revocation version matches. | SHARED-KERNEL ONLY + MODULE | Shared persistence convention + Certificate | Optimistic concurrency. |
| VR-CERT-036 | Revoked certificate cannot verify as valid. | MODULE | Certificate Management | Public/internal verification postcondition. |
| VR-CERT-037 | Public verification input is an opaque code only. | MODULE | Certificate Management | Reject PII-based lookup alternatives. |
| VR-CERT-038 | Public response is privacy-minimized. | MODULE with security policy | Certificate Management | Return approved DTO only. |
| VR-CERT-039 | Public endpoint rate limit is satisfied. | SHARED-KERNEL ONLY / platform security | Platform security/infrastructure | Apply policy; Certificate defines need, not rate-limit storage model. |
| VR-CERT-040 | Verification attempt retention/privacy policy is respected. | DELEGATED policy + MODULE record | Security/compliance policy; CertificateVerification owner | Persist only approved fields/retention. |
| VR-CERT-041 | Notification recipient exists and contact destination is authoritative. | DELEGATED | Communication + Person/Enrollment | Pass person reference; Communication resolves channel/contact policy. |
| VR-CERT-042 | Notification payload excludes prohibited PII/finance/assessment data. | MODULE + SHARED security policy | Certificate producer + shared security policy | Minimize payload. |
| VR-CERT-043 | Notification template exists and is active. | DELEGATED | Communication & Notification | Communication validates. |
| VR-CERT-044 | Notification provider delivery succeeds. | DELEGATED | Communication & Notification | Never reinterpret delivery state. |
| VR-CERT-045 | Sensitive lifecycle action is auditable. | DELEGATED persistence, MODULE trigger obligation | Audit & Compliance | Emit/submit audit command after/beside transaction per architecture. |
| VR-CERT-046 | Audit record contains who/what/when/old/new/reason where applicable. | DELEGATED | Audit & Compliance | Supply required event facts; Audit owns record. |
| VR-CERT-047 | Registry pagination values are bounded. | SHARED-KERNEL ONLY + MODULE endpoint rule | Shared API convention / Certificate API | Validate query. |
| VR-CERT-048 | Search/sort fields use allow-list. | MODULE | Certificate Management | Prevent unsupported/unsafe query construction. |
| VR-CERT-049 | Consolidated report scope requires permission and consolidated entitlement. | DELEGATED | IAM + Reporting | Enforce before query/report request. |
| VR-CERT-050 | Report calculation does not mutate certificates. | DELEGATED ownership boundary | Reporting & Dashboards | Publish facts/read only; no transactional write API. |
| VR-CERT-051 | Artifact and language rendering use current hardcoded template policy. | MODULE | Certificate Management | No template CRUD/configuration model. |
| VR-CERT-052 | QR payload contains no direct PII. | MODULE | Certificate Management | Encode opaque verification reference only. |
| VR-CERT-053 | Replacement request is approved before generation. | MODULE | Certificate Management | State guard, with approval evidence integration. |
| VR-CERT-054 | `newCertificateId` is empty before first replacement generation. | MODULE | Certificate Management | Prevent duplicate replacement. |
| VR-CERT-055 | Replacement receives unique number and verification code. | MODULE + DELEGATED numbering | Certificate + Configuration | Allocate/validate uniqueness. |
| VR-CERT-056 | Original and replacement lineage remains queryable. | MODULE | Certificate Management | Preserve request link and records; no hard delete. |
| VR-CERT-057 | Soft-deleted operational records are excluded from ordinary views. | SHARED-KERNEL ONLY + MODULE repository policy | Shared repo convention / Certificate | Apply standard soft-delete filter. |
| VR-CERT-058 | No hard-delete command exists. | MODULE architecture rule | Certificate Management | Do not expose DELETE transaction APIs. |
| VR-CERT-059 | API timestamps use ISO-8601 UTC. | SHARED-KERNEL ONLY | Shared API/date-time kernel | Serialize consistently. |
| VR-CERT-060 | Business display timezone is `Asia/Muscat` by default. | SHARED-KERNEL ONLY / localization policy | Shared localization/config | UI/report display conversion; persistence remains UTC. |

---

# 5. Structured Error Catalog

## 5.1 Error Envelope

All authenticated and internal APIs use the Part 5 error envelope:

```ts
interface ApiError {
  error: {
    code: string;
    message: string;
    fieldErrors?: Array<{
      field: string;
      code: string;
      message: string;
    }>;
    details?: Record<string, string | number | boolean | null>;
    requestId: string;
  };
}
```

### Error Response Rules

- `code` is stable and language-neutral.
- `message` is localized according to approved locale policy.
- `fieldErrors` is used for actionable field validation only.
- `details` must not expose stack traces, SQL errors, Prisma internals, storage paths, secrets, PII, finance details, raw completion evidence, or IAM policy internals.
- Public verification endpoints use a deliberately narrower public response model instead of exposing this internal catalog for normal invalid/not-found outcomes.
- Unexpected internal failures return `500 INTERNAL_ERROR` with `requestId`; detailed diagnostics go to structured logs only.

## 5.2 Transport and Authentication Errors

| HTTP | Error Code | Trigger | Client Action |
|---:|---|---|---|
| 400 | `VALIDATION_ERROR` | One or more request fields fail schema validation. | Correct highlighted fields. |
| 400 | `INVALID_DATE_RANGE` | `from` is after `to` or range violates endpoint policy. | Correct date range. |
| 400 | `UNSUPPORTED_SORT_FIELD` | Sort field not in allow-list. | Use documented sort field. |
| 400 | `UNSUPPORTED_CERTIFICATE_LANGUAGE` | Language is not `en` or `ar`. | Select supported language. |
| 401 | `UNAUTHENTICATED` | Missing/invalid session on protected route. | Reauthenticate. |
| 403 | `PERMISSION_DENIED` | Required fine-grained permission absent. | Request authorized access; do not retry unchanged. |
| 403 | `BRANCH_SCOPE_DENIED` | Resource branch outside effective IAM scope. | Change to authorized branch/resource. |
| 403 | `CONSOLIDATED_SCOPE_DENIED` | Consolidated entitlement absent. | Use branch-level view or request entitlement. |
| 404 | `NOT_FOUND` | Resource absent or intentionally concealed. | Refresh/search authorized scope. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Invalid request media type. | Send supported content type. |
| 429 | `RATE_LIMIT_EXCEEDED` | Public verification abuse threshold exceeded. | Retry after policy window. |

## 5.3 Certificate Eligibility and Generation Errors

| HTTP | Error Code | Trigger | Owner | Retryability |
|---:|---|---|---|---|
| 404 | `ENROLLMENT_NOT_FOUND` | Enrollment reference cannot be resolved for authorized internal command. | Enrollment | No until data corrected |
| 422 | `SOURCE_REFERENCE_INCOMPLETE` | Required student/course/batch/branch reference missing. | Enrollment/reference owners + Certificate orchestration | No until source corrected |
| 422 | `SOURCE_REFERENCE_INCONSISTENT` | Certificate source references do not correspond to same enrollment journey. | Certificate | No; investigate integrity |
| 422 | `COMPLETION_NOT_APPROVED` | Completion context does not report approved completion. | Completion | Yes after upstream state changes |
| 422 | `PAYMENT_VALIDATION_FAILED` | Required Finance gate not passed. | Finance | Yes after Finance state changes |
| 422 | `CERTIFICATE_NOT_ELIGIBLE` | One or more authoritative gates block generation. | Orchestration summary | Conditional |
| 409 | `DUPLICATE_ACTIVE_CERTIFICATE` | Normal generation would create duplicate active certificate. | Certificate | No; use existing or approved reissue flow |
| 503 | `CERTIFICATE_NUMBERING_UNAVAILABLE` | NumberingSeries unavailable/inactive or allocation service fails. | Configuration | Yes after configuration/service recovery |
| 409 | `CERTIFICATE_NUMBER_CONFLICT` | Allocated/persisted number violates uniqueness. | Certificate + Configuration investigation | Retry only via safe allocation logic |
| 409 | `VERIFICATION_CODE_CONFLICT` | Generated verification code collides. | Certificate | Internally retry bounded generation; surface only if exhausted |
| 422 | `CERTIFICATE_RENDER_FAILED` | Artifact rendering failed. | Certificate/infrastructure | Retry according to operation policy |
| 422 | `CERTIFICATE_ARTIFACT_UNAVAILABLE` | Required generated artifact missing/unavailable. | Certificate/infrastructure | Conditional |
| 409 | `CERTIFICATE_INTEGRITY_ERROR` | Invariant/postcondition failure. | Certificate | No blind retry; investigate |

## 5.4 Lifecycle and Concurrency Errors

| HTTP | Error Code | Trigger | Client Behavior |
|---:|---|---|---|
| 409 | `INVALID_STATE_TRANSITION` | Requested from/to status transition is not permitted. | Refresh detail and show current status. |
| 409 | `VERSION_CONFLICT` | Expected aggregate version is stale. | Reload current record; require user review before retry. |
| 409 | `IDEMPOTENCY_KEY_CONFLICT` | Same key reused with different payload. | Generate a new key for a genuinely new command. |
| 409 | `CERTIFICATE_ALREADY_ISSUED` | Issue command targets already-issued certificate and is not an idempotent replay. | Show current issued state. |
| 409 | `CERTIFICATE_ALREADY_REVOKED` | Revocation command targets already revoked state. | Show revoked state; no new mutation. |
| 422 | `REVOCATION_REASON_REQUIRED` | Normalized reason empty. | Enter reason. |
| 422 | `REVOCATION_REASON_INVALID_LENGTH` | Reason outside 10–1000 chars. | Correct input. |

## 5.5 Reissue and Replacement Errors

| HTTP | Error Code | Trigger | Client Behavior |
|---:|---|---|---|
| 422 | `REISSUE_REASON_REQUIRED` | Reason empty after trim. | Enter meaningful reason. |
| 422 | `REISSUE_REASON_INVALID_LENGTH` | Reason outside 10–1000 chars. | Correct reason length. |
| 409 | `REISSUE_REQUEST_ALREADY_OPEN` | Existing non-terminal request for original certificate. | Navigate to existing request. |
| 422 | `REISSUE_APPROVAL_REQUIRED` | Attempt to create replacement without approved request. | Complete approval workflow. |
| 422 | `REISSUE_NOT_APPROVED` | Replacement generation target is not approved. | Wait for/complete approval. |
| 409 | `REISSUE_REQUEST_TERMINAL` | Decision command targets terminal request. | Refresh; show final decision. |
| 422 | `REISSUE_REJECTION_REMARKS_REQUIRED` | Rejection submitted without required remarks. | Enter rejection reason. |
| 409 | `REPLACEMENT_ALREADY_GENERATED` | `newCertificateId` already present or transaction already completed. | Open existing replacement. |
| 409 | `REPLACEMENT_LINEAGE_CONFLICT` | Lineage relationship conflicts with authoritative request state. | Investigate; no blind retry. |

## 5.6 Verification Errors and Public Outcomes

Internal verification may use structured errors; public verification should minimize distinguishability.

| Surface | Condition | Response |
|---|---|---|
| Public | Code valid and active | `status=VALID` with approved public facts |
| Public | Code resolves revoked certificate | `status=REVOKED` |
| Public | Code resolves replacement/superseded policy | `status=REPLACED`, only after lineage policy is formally resolved |
| Public | Code invalid or not found | `status=INVALID_OR_NOT_FOUND` |
| Public | Rate limit exceeded | HTTP 429 with generic message; no certificate details |
| Internal | Certificate missing in authorized scope | `NOT_FOUND` |
| Internal | Verification persistence fails but authoritative validation succeeds | Verification result policy plus observability alert; exact failure mode belongs in NFR/runbook |

## 5.7 Integration Errors

| HTTP / Handling | Error Code | Trigger | Boundary Rule |
|---|---|---|---|
| 503 | `COMPLETION_SERVICE_UNAVAILABLE` | Completion read port unavailable in modular application/runtime dependency. | Do not infer eligibility locally. |
| 503 | `PAYMENT_VALIDATION_UNAVAILABLE` | Finance validation decision unavailable. | Fail closed when payment gate is required. |
| 503 | `NUMBERING_SERVICE_UNAVAILABLE` | Number allocation unavailable. | Do not invent ad hoc number. |
| 500/operational retry | `AUDIT_RECORDING_FAILED` | Required audit boundary fails. | Sensitive action consistency policy must be defined in architecture; do not silently ignore. |
| asynchronous/operational | `NOTIFICATION_REQUEST_FAILED` | Communication request not accepted. | Certificate transaction remains committed; retry/operational handling per architecture. |
| asynchronous/operational | `REPORTING_PUBLICATION_FAILED` | Reporting lifecycle fact publication fails. | Core Certificate transaction remains source of truth; repair read model. |

---

# 6. Domain Events and Notification Event Mapping

## 6.1 DDD-Aligned Certificate/Completion Event Inputs

The supplied DDD event catalog includes:

```text
ExamScheduled
ResultRecorded
CompletionEvaluationRequested
CourseCompletionApproved
CertificateEligible
CertificateGenerated
CertificateReissued
CertificateVerified
```

For Certificate Management:

- `CertificateEligible` is an upstream eligibility event/fact from the Completion-to-Certificate flow; Certificate Management consumes it or equivalent authoritative readiness query, but must still command-time revalidate current state.
- `CertificateGenerated` is Certificate-owned lifecycle output.
- `CertificateReissued` is Certificate-owned lifecycle output after approved replacement generation.
- `CertificateVerified` is Certificate-owned verification output/activity event.
- Certificate revocation is a DDD responsibility, but `CertificateRevoked` is not named in the supplied DDD event list. This is a documented DDD event-catalog gap, not a license to silently create an authoritative event contract.

## 6.2 Notification Mapping Principles

1. Domain events express business facts; notification requests are downstream side effects.
2. Certificate Management must not send email/SMS/WhatsApp directly from domain entities.
3. Certificate Management requests Communication to create/process `NotificationRequest` using Communication-owned templates and delivery logs.
4. A domain transaction is committed before notification delivery is attempted.
5. Notification failures do not revert Certificate state.
6. Notification deduplication uses stable business correlation/event identity according to Communication architecture.
7. Recipient contact details come from authoritative Person/Communication policies, not from denormalized Certificate fields.
8. Template language follows recipient preference and certificate language policy; template ownership remains Communication.
9. Message payloads must be minimal and may include secure portal links but must not include raw verification secrets in insecure channels unless explicitly approved by security policy.

## 6.3 System Notification Event Matrix

| Source Domain Event / Fact | Notification Request | Recipient | Default Channels | Trigger Condition | Payload Minimum | Owner of Delivery |
|---|---|---|---|---|---|---|
| `CertificateEligible` | `CERTIFICATE_ELIGIBLE_INTERNAL_ALERT` | Certificate operations queue/users selected by Communication/IAM policy | System notification; optional email | Eligibility becomes actionable and no certificate exists | enrollment reference, learner display name, course, batch, branch | Communication |
| `CertificateGenerated` | `CERTIFICATE_GENERATED_INTERNAL_NOTICE` | Certificate operator/operational queue where configured | System notification | Generation transaction committed | certificate ID/reference, certificate number, branch, generated timestamp | Communication |
| `CertificateGenerated` followed by successful issuance policy | `CERTIFICATE_AVAILABLE_TO_LEARNER` | Enrollment-linked learner Person | Email/SMS/WhatsApp/System per configured policy | Certificate is issued/available according to lifecycle policy | learner display name, course name, certificate number, secure portal link; no finance data | Communication |
| `CertificateReissued` | `CERTIFICATE_REISSUED_TO_LEARNER` | Enrollment-linked learner Person | Email/SMS/WhatsApp/System per policy | Replacement generation and lineage link committed | new certificate number, course, issue/reissue date, secure portal link | Communication |
| `CertificateReissued` | `CERTIFICATE_REISSUE_COMPLETED_INTERNAL` | Requester and certificate operations users as policy permits | System notification; optional email | Approved request has replacement linked | request reference, original certificate number, replacement certificate number, completion time | Communication |
| `CertificateVerified` | `CERTIFICATE_VERIFICATION_SECURITY_ALERT` | Security/compliance operations | System notification/email only when risk policy threshold met | Suspicious verification pattern/risk detector says notify; not every ordinary verification | aggregate risk facts, masked network metadata per policy, certificate reference | Communication + security policy |
| `CertificateVerified` | No learner message by default | None | None | Ordinary public verification | Verification is recorded/observed without notifying learner unless policy explicitly requires | N/A |
| Revocation command success | **Gap: formal source event name absent** | Learner + compliance/operations likely required | TBD by policy | Only after DDD event contract is approved | certificate number, revocation effective time, reason category only if disclosure policy allows, support contact | Communication after event contract approval |

### 6.4 Notifications That Must Not Be Triggered by Certificate Management

| Notification | Why Not Owned Here | Owning Context |
|---|---|---|
| Exam scheduled reminder | Exam scheduling fact is not Certificate-owned. | Exam, Result & Completion + Communication |
| Result published/pass-fail notice | Result ownership is outside Certificate. | Exam, Result & Completion + Communication |
| Attendance shortage alert | Attendance owns participation/low-attendance facts. | Attendance + Communication |
| Payment due/overdue reminder | Certificate cannot derive invoice status. | Finance & Receivables + Communication |
| Payment receipt notification | Receipt/payment are Finance-owned. | Finance & Receivables + Communication |
| Completion approval notification | Completion owns approval state. | Exam, Result & Completion + Communication |
| Role/permission change alert | IAM owns authorization changes. | IAM + Audit/Communication |

---

# 7. Notification Payload Contracts

## 7.1 `CertificateAvailableNotificationPayload`

```ts
interface CertificateAvailableNotificationPayload {
  certificateId: string;          // internal reference for template link building
  certificateNumber: string;
  recipientPersonId: string;
  learnerDisplayName: string;
  courseDisplayName: string;
  issuedDate: string;
  certificateLanguage: 'en' | 'ar';
  portalPath: string;             // relative approved route, not arbitrary URL input
  correlationId: string;
}
```

Forbidden fields:

```text
civilId
passportNumber
visaNumber
full payment history
invoice outstanding amount
marksObtained
attendance records
approval comments
verification code in plaintext unless explicitly approved by security policy
internal audit details
IP address
```

## 7.2 `CertificateReissuedNotificationPayload`

```ts
interface CertificateReissuedNotificationPayload {
  reissueRequestId: string;
  originalCertificateId: string;
  replacementCertificateId: string;
  replacementCertificateNumber: string;
  recipientPersonId: string;
  courseDisplayName: string;
  certificateLanguage: 'en' | 'ar';
  portalPath: string;
  correlationId: string;
}
```

## 7.3 `CertificateVerificationSecurityAlertPayload`

```ts
interface CertificateVerificationSecurityAlertPayload {
  certificateId?: string;
  verificationRiskCode: string;
  attemptCount: number;
  windowMinutes: number;
  maskedNetworkReference?: string;
  detectedAt: string;
  correlationId: string;
}
```

The risk detector and threshold source are security/NFR design concerns. The Certificate context supplies verification facts; it must not create an ad hoc security analytics domain model.

---

# 8. Notification Deduplication and Failure Rules

## 8.1 Deduplication Keys

Recommended logical deduplication identities:

| Notification | Logical Deduplication Key |
|---|---|
| Eligibility internal alert | `CertificateEligible:{enrollmentId}:{eligibilityDecisionVersion}` |
| Generated internal notice | `CertificateGenerated:{certificateId}:{version}` |
| Learner certificate available | `CertificateAvailable:{certificateId}:{issuedStateVersion}` |
| Reissue completed | `CertificateReissued:{reissueRequestId}:{replacementCertificateId}` |
| Verification security alert | Risk-policy-generated correlation key, not one notification per ordinary verification attempt |

Communication owns storage and enforcement of notification deduplication. Certificate Management provides stable event correlation facts.

## 8.2 Failure Semantics

| Failure | Certificate Transaction | Required Handling |
|---|---|---|
| Template missing/inactive | Remains committed | Communication marks failure; operational alert; do not roll back certificate. |
| Channel provider unavailable | Remains committed | Communication retry/runbook. |
| Recipient has no usable contact channel | Remains committed | Communication records non-deliverable status; portal remains source of access. |
| Notification request handoff fails | Remains committed unless architecture defines same-transaction durable request; never silently lose | Record operational failure and retry using approved modular-monolith job pattern. |
| Duplicate event delivery | No duplicate certificate mutation | Communication deduplication returns existing result/no-op. |

---

# 9. UI Validation and Error Presentation Rules

## 9.1 Field Validation

- Show inline field messages after blur or submit.
- Do not clear server errors until the related field changes or the form is resubmitted.
- Arabic UI renders field errors RTL while codes/IDs remain LTR-isolated.
- Do not expose raw domain codes as the only user-facing message; preserve the code for support diagnostics.

## 9.2 Form-Level Errors

Examples:

| Code | User Presentation |
|---|---|
| `COMPLETION_NOT_APPROVED` | Certificate cannot be generated yet because completion has not been approved. |
| `PAYMENT_VALIDATION_FAILED` | Certificate processing is blocked because the required payment validation has not passed. |
| `DUPLICATE_ACTIVE_CERTIFICATE` | An active certificate already exists for this enrollment. Open the existing certificate or use the approved reissue process. |
| `VERSION_CONFLICT` | This record changed after you opened it. Reload the latest version before continuing. |
| `BRANCH_SCOPE_DENIED` | You do not have access to this branch's certificate data. |
| `CERTIFICATE_NUMBERING_UNAVAILABLE` | Certificate numbering is currently unavailable. No certificate was generated. |

## 9.3 Sensitive Error Concealment

For student self-service and public verification:

- use `NOT_FOUND` for records outside self scope instead of revealing existence;
- never expose another student's name or certificate status;
- public invalid and unknown codes use the same `INVALID_OR_NOT_FOUND` result;
- public verification must not reveal whether a code format was close to a valid internal identifier.

---

# 10. Validation-to-Requirement Traceability

| Validation Area | FRD Requirements | Business Rules |
|---|---|---|
| Readiness and source consistency | FR-CERT-001 to FR-CERT-005, FR-CERT-034, FR-CERT-039 | BR-CERT-001 to BR-CERT-007, BR-CERT-044, BR-CERT-051 |
| Numbering and verification identity | FR-CERT-006 to FR-CERT-008 | BR-CERT-008 to BR-CERT-011, BR-CERT-047, BR-CERT-052 |
| Rendering and bilingual artifact | FR-CERT-009 to FR-CERT-010 | BR-CERT-012 to BR-CERT-015, BR-CERT-048 |
| Certificate creation and issue | FR-CERT-011 to FR-CERT-013, FR-CERT-033, FR-CERT-037, FR-CERT-038 | BR-CERT-006, BR-CERT-041 to BR-CERT-044 |
| Registry/detail/download | FR-CERT-014 to FR-CERT-016 | BR-CERT-031 to BR-CERT-036, BR-CERT-045 |
| Public verification | FR-CERT-017 to FR-CERT-020 | BR-CERT-017 to BR-CERT-019, BR-CERT-030, BR-CERT-046, BR-CERT-053 |
| Reissue and replacement | FR-CERT-021 to FR-CERT-026 | BR-CERT-020 to BR-CERT-027, BR-CERT-054 |
| Revocation | FR-CERT-027 | BR-CERT-028 to BR-CERT-030 |
| Permission and branch scope | FR-CERT-028 to FR-CERT-029 | BR-CERT-031 to BR-CERT-036 |
| Audit | FR-CERT-030 | BR-CERT-037 to BR-CERT-038 |
| Notifications | FR-CERT-031 | BR-CERT-039 |
| Reporting facts | FR-CERT-032, FR-CERT-036 | BR-CERT-040 |
| Soft delete and history | FR-CERT-035, FR-CERT-040 | BR-CERT-025, BR-CERT-028, BR-CERT-035, BR-CERT-040 |

---

# 11. DDD and ER Fit Check

## 11.1 Alignment Table

| Concern | DDD Position | ER Position | Part 7 Treatment |
|---|---|---|---|
| Certificate ownership | Certificate context owns generation, verification, reissue, revocation. | `Certificate`, `CertificateVerification`, `CertificateReissueRequest`. | Module-owned validators cover lifecycle and lineage. |
| Completion eligibility | Completion context evaluates rules; Certificate consumes eligibility. | `CourseCompletion` and `CompletionApproval` outside Certificate-owned entities. | Delegated validation; never recalculated here. |
| Payment validation | Finance owns invoice/payment truth. | Invoice/Payment/Receipt/Receivable outside Certificate. | Delegated gate; fail closed when required. |
| Enrollment centrality | Certificate links to Enrollment; all learner types converge on Enrollment. | `Certificate.enrollmentId`; Enrollment links student/course/batch/branch. | Source consistency validation is enrollment-centric. |
| Unique verification | Verification code must be unique. | `Certificate.verificationCode`. | Module uniqueness validation; physical Prisma constraint pending verification. |
| Verification history | Certificate owns verification. | `CertificateVerification`. | Module record validation with privacy retention caveat. |
| Reissue | Management approval required; Certificate owns reissue transaction. | `CertificateReissueRequest` plus Audit `ApprovalRequest` type. | Module request validation; Audit-owned approval history. |
| Revocation | Certificate owns revocation. | Status exists, dedicated revocation metadata absent. | Status validation plus explicit ER gap; no invented columns. |
| Notification | Communication owns templates, requests, logs, delivery. | `CommunicationTemplate`, `NotificationRequest`, `NotificationLog`. | Certificate emits minimal request facts only. |
| Branch access | IAM owns permission and branch access. | `UserBranchAccess` fields include consolidated/child branch controls. | Delegated IAM decision, server-side enforcement. |
| Audit | Audit context owns audit records/history. | `AuditLog`, `ApprovalRequest`, `ApprovalHistory`. | Certificate triggers required audit integration; no local audit table. |

## 11.2 Known Gaps and Required Decisions

1. **Certificate status enum:** ER contains `certificateStatus` but does not enumerate authoritative values. State validation must bind to the actual approved Prisma/domain enum once available.
2. **Verification status enum:** ER contains `verificationStatus` but does not enumerate values. Persistence validators must not invent literals before schema confirmation.
3. **Reissue status enum:** ER contains `status` but does not enumerate authoritative lifecycle values. Part 2 state semantics require schema alignment.
4. **Revocation metadata:** DDD requires revocation, but ER lacks `revokedAt`, `revokedBy`, and `revocationReason` fields. Audit evidence is required until a formal schema change is approved.
5. **CertificateIssueLog:** DDD lists the concept but ER has no entity. This part uses Certificate state plus AuditLog and does not invent a table.
6. **QR modeling:** DDD lists `CertificateQRCode`; ER stores `qrCodeUrl` on Certificate. Validation follows ER storage shape and does not create QR CRUD validation for a non-existent table.
7. **Replacement cardinality:** ER cardinality summary says Enrollment → Certificate is 1:1, while reissue `newCertificateId` implies replacement history. Physical uniqueness and replacement validation require explicit model resolution.
8. **Revocation event:** DDD assigns revocation responsibility but its event list does not name `CertificateRevoked`. A revocation notification event contract must be approved before using that name as an authoritative domain event.
9. **Prisma validation:** `packages/database/prisma/schema.prisma` was not supplied in the active inputs. Field types, enum literals, physical indexes, unique constraints, and FK delete actions remain to be verified against Prisma.

---

# 12. Final Validation Ownership Summary

```text
Certificate Management OWNS validation of:
  - duplicate active certificate prevention
  - certificate lifecycle transitions
  - certificate number/verification-code presence and uniqueness outcome
  - QR privacy shape
  - rendering language and artifact readiness
  - public verification result behavior
  - verification record consistency
  - reissue request rules
  - approved-request-before-replacement rule
  - replacement lineage integrity
  - revocation state behavior
  - idempotent Certificate command semantics
  - Certificate aggregate optimistic concurrency enforcement

Certificate Management DELEGATES authoritative validation of:
  - enrollment existence and source truth               -> Admission & Enrollment
  - completion approval                                -> Exam, Result & Completion
  - payment validation                                 -> Finance & Receivables
  - permission and branch/consolidated scope            -> IAM
  - certificate number allocation policy                -> Configuration / Master Data
  - approval/audit history persistence                  -> Audit & Compliance
  - notification templates, channels, delivery, retries -> Communication & Notification
  - report aggregation                                  -> Reporting & Dashboards

SHARED-KERNEL / PLATFORM ONLY:
  - opaque ID parsing
  - ISO-8601 UTC transport timestamps
  - locale primitives and LTR/RTL-safe rendering helpers
  - common pagination primitives
  - common error envelope
  - optimistic version primitive
  - idempotency infrastructure primitive
  - soft-delete repository convention
  - rate-limit infrastructure
```

This boundary ensures that Module 11 remains a cohesive Certificate Management bounded context without absorbing Completion, Finance, IAM, Communication, Audit, Reporting, or Configuration business logic.
