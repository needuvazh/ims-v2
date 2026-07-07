# Part 5 – API Contracts

## Module 11 – Certificate Management

## 1. Purpose and Contract Principles

This document defines the HTTP REST contracts and corresponding Next.js Server Action/application-command contracts for Module 11 – Certificate Management. It extends Parts 1–4 and does not change DDD ownership.

Certificate Management owns commands and queries for certificate generation, issuance, registry/detail access, artifact access, public verification, reissue requests, replacement generation, revocation, verification activity, and certificate lifecycle views. It consumes upstream truth from Admission & Enrollment, Exam/Result/Completion, Finance & Receivables, IAM/Branch Access, Configuration/Numbering, Audit, Communication, and Reporting through application ports or read models.

The governing boundary is:

```text
Client / Portal / Public Verification UI
        |
        v
Certificate API Route or Server Action
        |
        v
Certificate Application Service
        |---- Enrollment read port: learner/course/batch/branch context
        |---- Completion read port: approved completion truth
        |---- Finance validation port: payment gate truth
        |---- IAM scope resolver: permissions + effective branches
        |---- Numbering port: certificate number allocation
        |---- Audit port: sensitive-action audit command
        |---- Communication port: notification request
        `---- Reporting event/read-model publication
```

### 1.1 Mandatory API Rules

1. Internal endpoints require an authenticated user session unless explicitly marked public.
2. Public verification endpoints are anonymous and must never expose internal IDs, civil ID, passport, invoice/payment details, addresses, phone numbers, email addresses, marks, attendance evidence, approval comments, or audit details.
3. Permissions are checked server-side for every internal request. UI hiding is not authorization.
4. Branch scope is derived from authenticated `UserBranchAccess`/IAM policy. Client-supplied `branchId` can only narrow effective scope.
5. Certificate Management must not calculate completion eligibility from raw marks/attendance and must not calculate payment completion from invoices/payments.
6. Lifecycle mutations require command-time revalidation of authoritative upstream state where applicable.
7. Sensitive mutations use optimistic concurrency through `expectedVersion` and return `409 VERSION_CONFLICT` on stale writes.
8. Generate, issue, and replacement-generation commands require `Idempotency-Key` and are retry-safe.
9. No endpoint performs hard delete. DELETE routes are intentionally absent.
10. All dates/timestamps are ISO-8601. Server persistence and transport timestamps use UTC; UI localization follows ASTI application timezone and locale policy.
11. Identifiers are opaque strings (UUID/CUID compatible). Clients must not infer semantics from IDs.
12. Bilingual text uses explicit localized fields or language selectors; API field names remain English and direction-neutral.

---

## 2. Common Transport Conventions

### 2.1 Base Paths

```text
Internal authenticated API: /api/v1/certificates
Public verification API:     /api/public/v1/certificates
Student self-service API:     /api/v1/me/certificates
Trainer scoped query API:     /api/v1/trainer/certificates
```

### 2.2 Common Headers

| Header | Required | Applies To | Rule |
|---|---:|---|---|
| `Content-Type: application/json` | Yes for JSON bodies | Commands/JSON requests | Reject unsupported media type with 415 |
| Session cookie / bearer credential | Yes | Internal endpoints | Resolved by platform authentication layer |
| `Idempotency-Key` | Yes where stated | Generate, issue, replacement generation | 8–128 chars; stable per logical command |
| `Accept-Language` | Optional | All | `en` or `ar`; defaults to authenticated preference or platform default |
| `If-None-Match` | Optional | Artifact/query GETs where cacheable | May return 304 |
| `X-Request-Id` | Optional | All | Server generates when absent; echoed in error envelope |

### 2.3 Standard Success Envelope

Collection and detail responses use direct typed DTOs. Command responses use:

```ts
interface CommandResult<T> {
  data: T;
  meta: {
    requestId: string;
    processedAt: string; // ISO-8601 UTC
    idempotentReplay?: boolean;
  };
}
```

### 2.4 Standard Error Envelope

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

### 2.5 Standard Error Codes

| HTTP | Code | Meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Request shape or field rule failed |
| 401 | `UNAUTHENTICATED` | Internal endpoint without valid authentication |
| 403 | `PERMISSION_DENIED` | Required permission absent |
| 403 | `BRANCH_SCOPE_DENIED` | Target resource is outside effective branch scope |
| 404 | `NOT_FOUND` | Resource absent or intentionally concealed due to self/scope rules |
| 409 | `INVALID_STATE_TRANSITION` | Lifecycle command not allowed from current status |
| 409 | `VERSION_CONFLICT` | `expectedVersion` does not match current aggregate version |
| 409 | `DUPLICATE_ACTIVE_CERTIFICATE` | Normal generation would create duplicate active certificate |
| 409 | `REISSUE_REQUEST_ALREADY_OPEN` | A non-terminal request already exists for same certificate |
| 409 | `IDEMPOTENCY_KEY_CONFLICT` | Same key reused with different command payload |
| 422 | `COMPLETION_NOT_APPROVED` | Completion context has not approved completion |
| 422 | `PAYMENT_VALIDATION_FAILED` | Required Finance payment gate has not passed |
| 422 | `CERTIFICATE_NOT_ELIGIBLE` | One or more authoritative gates block generation |
| 422 | `REISSUE_NOT_APPROVED` | Replacement requested before reissue approval |
| 429 | `RATE_LIMITED` | Public verification or abuse-sensitive route throttled |
| 500 | `INTERNAL_ERROR` | Unexpected failure; no sensitive detail returned |
| 502 | `DEPENDENCY_UNAVAILABLE` | Required authoritative dependency unavailable |
| 503 | `SERVICE_UNAVAILABLE` | Certificate service temporarily unavailable |

### 2.6 Pagination Contract

```ts
interface PageMeta {
  page: number;       // 1-based
  pageSize: number;   // default 25, max 100
  totalItems: number;
  totalPages: number;
}
```

All pageable list routes return deterministic ordering. When client sort fields tie, `id` is appended as the final server-side sort key.

---

## 3. Endpoint Inventory

| API ID | Route | Method | Purpose | Primary Permission |
|---|---|---:|---|---|
| API-CERT-001 | `/api/v1/certificates/readiness` | GET | List certificate-ready/blocked enrollments | `certificate.read` |
| API-CERT-002 | `/api/v1/certificates/readiness/{enrollmentId}` | GET | Get readiness detail for enrollment | `certificate.read` |
| API-CERT-003 | `/api/v1/certificates` | POST | Generate certificate | `certificate.generate` |
| API-CERT-004 | `/api/v1/certificates` | GET | Search certificate registry | `certificate.read` |
| API-CERT-005 | `/api/v1/certificates/{certificateId}` | GET | Get certificate detail | `certificate.read` |
| API-CERT-006 | `/api/v1/certificates/{certificateId}/artifact` | GET | Download/stream artifact | `certificate.download` |
| API-CERT-007 | `/api/v1/certificates/{certificateId}/issue` | POST | Issue generated certificate | `certificate.issue` |
| API-CERT-008 | `/api/v1/certificates/{certificateId}/revoke` | POST | Revoke certificate | `certificate.revoke` |
| API-CERT-009 | `/api/v1/certificates/{certificateId}/verification-activity` | GET | View verification history | `certificate.verify.internal` |
| API-CERT-010 | `/api/v1/certificates/{certificateId}/lifecycle` | GET | View lifecycle and audit projection | `certificate.audit.read` |
| API-CERT-011 | `/api/v1/certificate-reissue-requests` | POST | Submit reissue request | `certificate.reissue.request` |
| API-CERT-012 | `/api/v1/certificate-reissue-requests` | GET | List reissue requests | `certificate.reissue.read` |
| API-CERT-013 | `/api/v1/certificate-reissue-requests/{requestId}` | GET | Get reissue request detail | `certificate.reissue.read` |
| API-CERT-014 | `/api/v1/certificate-reissue-requests/{requestId}/approve` | POST | Approve reissue request | `certificate.reissue.approve` |
| API-CERT-015 | `/api/v1/certificate-reissue-requests/{requestId}/reject` | POST | Reject reissue request | `certificate.reissue.approve` |
| API-CERT-016 | `/api/v1/certificate-reissue-requests/{requestId}/replacement` | POST | Generate replacement certificate | `certificate.reissue.generate` |
| API-CERT-017 | `/api/public/v1/certificates/verify` | POST | Verify certificate by code | Public |
| API-CERT-018 | `/api/public/v1/certificates/verify/{verificationCode}` | GET | QR/deep-link verification | Public |
| API-CERT-019 | `/api/v1/me/certificates` | GET | List authenticated student's certificates | Authenticated self-service |
| API-CERT-020 | `/api/v1/me/certificates/{certificateId}` | GET | Get own certificate detail | Authenticated self-service |
| API-CERT-021 | `/api/v1/me/certificates/{certificateId}/artifact` | GET | Download own artifact | Authenticated self-service |
| API-CERT-022 | `/api/v1/me/certificate-reissue-requests` | POST | Submit own reissue request | `certificate.reissue.request` or portal entitlement |
| API-CERT-023 | `/api/v1/me/certificate-reissue-requests` | GET | List own reissue requests | Authenticated self-service |
| API-CERT-024 | `/api/v1/trainer/certificates/status` | GET | Trainer-scoped downstream certificate status | Authenticated trainer scope |
| API-CERT-025 | `/api/v1/certificates/dashboard` | GET | Certificate operational dashboard projection | `certificate.read` |
| API-CERT-026 | `/api/v1/certificates/reports/registry` | GET | Report-ready certificate registry query | `certificate.report.read` |
| API-CERT-027 | `/api/v1/certificates/reports/registry/export` | POST | Export permitted registry report | `certificate.report.export` |
| API-CERT-028 | `/api/v1/certificates/{certificateId}/notifications` | POST | Request certificate notification delivery | Operational notification permission policy |

### 3.1 Server Action Mapping

The Next.js Admin Portal may expose typed Server Actions instead of calling REST directly from client components. Server Actions must invoke the same application services and authorization policies as route handlers.

| Server Action | Application Command/Query | REST Equivalent |
|---|---|---|
| `getCertificateReadinessAction` | `GetCertificateReadinessQuery` | API-CERT-002 |
| `generateCertificateAction` | `GenerateCertificateCommand` | API-CERT-003 |
| `issueCertificateAction` | `IssueCertificateCommand` | API-CERT-007 |
| `submitReissueRequestAction` | `SubmitReissueRequestCommand` | API-CERT-011 / 022 |
| `approveReissueRequestAction` | `ApproveReissueRequestCommand` | API-CERT-014 |
| `rejectReissueRequestAction` | `RejectReissueRequestCommand` | API-CERT-015 |
| `generateReplacementCertificateAction` | `GenerateReplacementCertificateCommand` | API-CERT-016 |
| `revokeCertificateAction` | `RevokeCertificateCommand` | API-CERT-008 |
| `requestCertificateNotificationAction` | `RequestCertificateNotificationCommand` | API-CERT-028 |

Server Actions must not trust hidden form fields for branch access, current status, eligibility, payment validation, certificate number, verification code, or lifecycle version.

---

## 4. API-CERT-001 – List Certificate Readiness

**Route:** `GET /api/v1/certificates/readiness`

**Purpose:** Return branch-scoped enrollments and their authoritative certificate readiness summary for SCR-CERT-A02.

**Authentication:** Required internal session.

**Permission:** `certificate.read`.

**Branch scoping:** Server resolves effective branches from IAM. Optional `branchId` must be within effective scope and only narrows results. Rows outside scope are never returned.

### Request Schema

Query parameters:

```ts
interface ListCertificateReadinessRequest {
  readiness?: 'READY' | 'BLOCKED_COMPLETION' | 'BLOCKED_PAYMENT' | 'ALREADY_CERTIFIED';
  branchId?: string;
  courseId?: string;
  batchId?: string;
  studentSearch?: string;       // 1..100 chars after trim
  enrollmentNumber?: string;   // exact or configured prefix search
  page?: number;               // >= 1
  pageSize?: number;           // 1..100
  sortBy?: 'studentName' | 'courseName' | 'batchName' | 'completionApprovedAt' | 'enrollmentNumber';
  sortDirection?: 'asc' | 'desc';
}
```

### Success DTO – `200 OK`

```ts
interface CertificateReadinessPageDto {
  items: Array<{
    enrollmentId: string;
    enrollmentNumber: string;
    student: { studentProfileId: string; studentNumber: string; displayName: string };
    course: { courseId: string; courseCode: string; name: string };
    batch: { batchId: string; batchCode: string; name: string };
    branch: { branchId: string; branchCode: string; name: string };
    completion: { status: string; approved: boolean; approvedAt: string | null };
    paymentGate: { required: boolean; passed: boolean | null };
    certificate: { existingCertificateId: string | null; status: string | null };
    readiness: 'READY' | 'BLOCKED_COMPLETION' | 'BLOCKED_PAYMENT' | 'ALREADY_CERTIFIED';
    blockers: Array<{ code: string; message: string }>;
  }>;
  page: PageMeta;
}
```

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 PERMISSION_DENIED`, `403 BRANCH_SCOPE_DENIED`, `502 DEPENDENCY_UNAVAILABLE`.

**Ownership note:** The response composes read-only facts. Certificate Management does not mutate or recompute Enrollment, Completion, or Finance data.

## 5. API-CERT-002 – Get Certificate Readiness Detail

**Route:** `GET /api/v1/certificates/readiness/{enrollmentId}`

**Purpose:** Resolve all data needed to explain readiness and support command preview for SCR-CERT-A03/A04.

**Authentication:** Required.

**Permission:** `certificate.read`.

**Branch scoping:** Enrollment branch must be within effective user scope. Out-of-scope IDs return `403 BRANCH_SCOPE_DENIED` for trusted internal clients; deployments using anti-enumeration policy may normalize to `404 NOT_FOUND`.

### Request Schema

Path: `enrollmentId: string`, non-empty opaque ID.

Optional query: `language=en|ar` controls localized display labels only.

### Success DTO – `200 OK`

```ts
interface CertificateReadinessDetailDto {
  enrollment: {
    id: string;
    enrollmentNumber: string;
    enrollmentStatus: string;
    branchId: string;
    studentProfileId: string;
    courseId: string;
    batchId: string;
  };
  learner: { studentNumber: string; displayName: string; displayNameLocalized?: { en?: string; ar?: string } };
  course: { courseCode: string; name: string; nameEnglish: string; nameArabic: string | null };
  batch: { batchCode: string; name: string };
  completionGate: {
    approved: boolean;
    completionStatus: string;
    approvedAt: string | null;
    sourceContext: 'EXAMS_COMPLETION';
  };
  paymentGate: {
    required: boolean;
    passed: boolean | null;
    validatedAt: string | null;
    sourceContext: 'FINANCE_RECEIVABLES';
  };
  duplicateGate: {
    activeCertificateExists: boolean;
    certificateId: string | null;
    status: string | null;
  };
  readiness: 'READY' | 'BLOCKED_COMPLETION' | 'BLOCKED_PAYMENT' | 'ALREADY_CERTIFIED';
  blockers: Array<{ code: string; message: string }>;
}
```

**Errors:** `401`, `403`, `404 NOT_FOUND`, `502 DEPENDENCY_UNAVAILABLE`.

## 6. API-CERT-003 – Generate Certificate

**Route:** `POST /api/v1/certificates`

**Purpose:** Generate a new certificate record and artifact from an eligible enrollment.

**Authentication:** Required.

**Permission:** `certificate.generate`.

**Branch scoping:** Target enrollment branch must be in effective scope. `branchId` is not accepted in the body; scope is derived from enrollment and IAM.

**Required header:** `Idempotency-Key`.

### Request Schema

```ts
interface GenerateCertificateRequest {
  enrollmentId: string;
  language: 'en' | 'ar';
  expectedReadinessToken?: string; // optional UX freshness hint, never authoritative
}
```

Validation:
- `enrollmentId` required.
- `language` strictly `en` or `ar`.
- Client cannot provide certificate number, verification code, QR URL, issue date, student/course/batch IDs, template ID, or status.

### Processing Contract

1. Authenticate and authorize.
2. Resolve enrollment and enforce branch scope.
3. Re-read approved completion from Completion context.
4. Re-read payment gate from Finance when course completion rule requires payment validation.
5. Check duplicate active certificate invariant.
6. Allocate certificate number through approved numbering mechanism.
7. Generate unique verification code and QR verification reference.
8. Render using the single current approved hardcoded template and selected language.
9. Create Certificate record and artifact reference atomically to the extent supported by storage transaction boundary.
10. Record audit event and publish lifecycle/reporting fact after successful commit.

### Success DTO – `201 Created`

```ts
interface GeneratedCertificateDto {
  certificateId: string;
  certificateNumber: string;
  enrollmentId: string;
  studentProfileId: string;
  courseId: string;
  batchId: string;
  language: 'en' | 'ar';
  certificateStatus: string;
  artifact: { available: boolean; artifactUrl?: string };
  verification: { verificationCode: string; verificationUrl: string; qrCodeUrl: string | null };
  issuedDate: string | null;
  version: number;
}
```

**Errors:** `400 VALIDATION_ERROR`, `401`, `403 PERMISSION_DENIED`, `403 BRANCH_SCOPE_DENIED`, `409 DUPLICATE_ACTIVE_CERTIFICATE`, `409 IDEMPOTENCY_KEY_CONFLICT`, `422 COMPLETION_NOT_APPROVED`, `422 PAYMENT_VALIDATION_FAILED`, `422 CERTIFICATE_NOT_ELIGIBLE`, `502 DEPENDENCY_UNAVAILABLE`.

## 7. API-CERT-004 – Search Certificate Registry

**Route:** `GET /api/v1/certificates`

**Purpose:** Branch-scoped registry search for SCR-CERT-A06.

**Authentication:** Required.

**Permission:** `certificate.read`.

**Branch scoping:** Effective branch filter mandatory server-side. Optional `branchId` narrows only.

### Request Schema

```ts
interface SearchCertificatesRequest {
  q?: string;                   // certificate no, enrollment no, student no/name; 1..100 chars
  certificateNumber?: string;
  verificationCode?: string;    // internal search permission only
  status?: string[];
  language?: Array<'en' | 'ar'>;
  branchId?: string;
  courseId?: string;
  batchId?: string;
  issuedFrom?: string;          // YYYY-MM-DD
  issuedTo?: string;            // YYYY-MM-DD; >= issuedFrom
  page?: number;
  pageSize?: number;
  sortBy?: 'certificateNumber' | 'studentName' | 'courseName' | 'issuedDate' | 'certificateStatus' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
}
```

### Success DTO – `200 OK`

```ts
interface CertificateRegistryPageDto {
  items: Array<{
    certificateId: string;
    certificateNumber: string;
    enrollmentNumber: string;
    studentNumber: string;
    studentDisplayName: string;
    courseCode: string;
    courseName: string;
    batchCode: string;
    branchName: string;
    language: 'en' | 'ar';
    certificateStatus: string;
    issuedDate: string | null;
    createdAt: string;
    version: number;
  }>;
  page: PageMeta;
}
```

**Errors:** `400`, `401`, `403 PERMISSION_DENIED`, `403 BRANCH_SCOPE_DENIED`.

## 8. API-CERT-005 – Get Certificate Detail

**Route:** `GET /api/v1/certificates/{certificateId}`

**Purpose:** Return internal lifecycle detail, source references, artifact status, verification reference, and replacement lineage.

**Authentication:** Required.

**Permission:** `certificate.read`.

**Branch scoping:** Derived through certificate → enrollment → branch. Must be in effective scope.

### Request Schema

Path: `certificateId: string`.

### Success DTO – `200 OK`

```ts
interface CertificateDetailDto {
  certificateId: string;
  certificateNumber: string;
  certificateStatus: string;
  language: 'en' | 'ar';
  issuedDate: string | null;
  issuedBy: { userId: string; displayName: string } | null;
  artifact: { available: boolean; previewSupported: boolean };
  verification: { verificationCode: string; verificationUrl: string; qrCodeUrl: string | null };
  enrollment: { id: string; enrollmentNumber: string; branchId: string };
  student: { studentProfileId: string; studentNumber: string; displayName: string };
  course: { courseId: string; courseCode: string; name: string };
  batch: { batchId: string; batchCode: string; name: string };
  lineage: {
    replacesCertificateId: string | null;
    replacementCertificateId: string | null;
    reissueRequestId: string | null;
  };
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
}
```

**Errors:** `401`, `403`, `404 NOT_FOUND`.

## 9. API-CERT-006 – Get Certificate Artifact

**Route:** `GET /api/v1/certificates/{certificateId}/artifact`

**Purpose:** Stream or redirect to a short-lived authorized artifact download/preview.

**Authentication:** Required.

**Permission:** `certificate.download`.

**Branch scoping:** Certificate branch must be in effective scope.

### Request Schema

Optional query:

```ts
interface CertificateArtifactRequest {
  disposition?: 'inline' | 'attachment'; // default inline
}
```

### Success – `200 OK` or `302/307`

Either:
- binary `application/pdf` response with safe `Content-Disposition`, or
- short-lived signed storage redirect generated server-side.

The API must not expose permanent internal storage credentials or unrestricted bucket paths.

**Errors:** `401`, `403`, `404 NOT_FOUND`, `409 INVALID_STATE_TRANSITION` when artifact is not yet available, `502 DEPENDENCY_UNAVAILABLE` for storage failure.

## 10. API-CERT-007 – Issue Certificate

**Route:** `POST /api/v1/certificates/{certificateId}/issue`

**Purpose:** Transition a generated certificate to issued state after command-time gate revalidation.

**Authentication:** Required.

**Permission:** `certificate.issue`.

**Branch scoping:** Certificate enrollment branch must be in effective scope.

**Required header:** `Idempotency-Key`.

### Request Schema

```ts
interface IssueCertificateRequest {
  expectedVersion: number; // integer >= 0
  notifyStudent?: boolean; // default false; notification is requested after successful issue
}
```

### Success DTO – `200 OK`

```ts
interface IssueCertificateResultDto {
  certificateId: string;
  certificateNumber: string;
  certificateStatus: string;
  issuedDate: string;
  issuedBy: string;
  version: number;
  notificationRequest: { requested: boolean; requestId?: string };
}
```

**Errors:** `401`, `403`, `404`, `409 INVALID_STATE_TRANSITION`, `409 VERSION_CONFLICT`, `409 IDEMPOTENCY_KEY_CONFLICT`, `422 COMPLETION_NOT_APPROVED`, `422 PAYMENT_VALIDATION_FAILED`, `502 DEPENDENCY_UNAVAILABLE`.

**Side-effect rule:** A notification failure must not roll back a successfully issued certificate. Delivery is owned by Communication context.

## 11. API-CERT-008 – Revoke Certificate

**Route:** `POST /api/v1/certificates/{certificateId}/revoke`

**Purpose:** Revoke an issued certificate with mandatory reason and audit trail.

**Authentication:** Required.

**Permission:** `certificate.revoke`.

**Branch scoping:** Certificate branch must be within effective scope. Consolidated users act only in branches IAM authorizes for mutation.

### Request Schema

```ts
interface RevokeCertificateRequest {
  reason: string;          // trim; 10..1000 chars
  expectedVersion: number; // integer >= 0
}
```

### Success DTO – `200 OK`

```ts
interface RevokeCertificateResultDto {
  certificateId: string;
  certificateNumber: string;
  previousStatus: string;
  certificateStatus: string;
  revokedAt: string;
  version: number;
}
```

**Errors:** `400 VALIDATION_ERROR`, `401`, `403`, `404`, `409 INVALID_STATE_TRANSITION`, `409 VERSION_CONFLICT`.

**ER gap note:** DDD requires revocation behavior, while ER lacks dedicated revoked metadata fields. Until schema is resolved, the API contract still requires a reason for audit capture; persistence mapping must be validated before implementation.

## 12. API-CERT-009 – List Verification Activity

**Route:** `GET /api/v1/certificates/{certificateId}/verification-activity`

**Purpose:** Return branch-authorized verification history for internal operational review.

**Authentication:** Required.

**Permission:** `certificate.verify.internal`.

**Branch scoping:** Based on certificate enrollment branch.

### Request Schema

```ts
interface VerificationActivityRequest {
  from?: string;
  to?: string;
  status?: string[];
  page?: number;
  pageSize?: number;
  sortDirection?: 'asc' | 'desc'; // verifiedAt; default desc
}
```

### Success DTO – `200 OK`

```ts
interface VerificationActivityPageDto {
  certificateId: string;
  certificateNumber: string;
  items: Array<{
    verificationId: string;
    verificationStatus: string;
    verifiedAt: string;
    sourceIpMasked: string | null;
  }>;
  page: PageMeta;
}
```

`verifiedByIp` is masked in UI-oriented DTOs unless a stricter compliance permission and policy explicitly permits full access.

**Errors:** `400`, `401`, `403`, `404`.

## 13. API-CERT-010 – Get Certificate Lifecycle and Audit Projection

**Route:** `GET /api/v1/certificates/{certificateId}/lifecycle`

**Purpose:** Read a merged, chronological lifecycle projection for SCR-CERT-A15.

**Authentication:** Required.

**Permission:** `certificate.audit.read`.

**Branch scoping:** Certificate branch scope is enforced before Audit projection is queried.

### Request Schema

Path only.

### Success DTO – `200 OK`

```ts
interface CertificateLifecycleDto {
  certificateId: string;
  certificateNumber: string;
  events: Array<{
    eventType: string;
    occurredAt: string;
    actor: { userId: string | null; displayName: string | null; actorType: 'USER' | 'SYSTEM' };
    summary: string;
    oldStatus?: string | null;
    newStatus?: string | null;
    reason?: string | null;
    sourceContext: 'CERTIFICATE' | 'AUDIT_COMPLIANCE';
  }>;
}
```

**Errors:** `401`, `403`, `404`, `502 DEPENDENCY_UNAVAILABLE` when Audit projection is unavailable.

**Ownership note:** Certificate API presents an Audit-owned read projection; it does not create or edit `AuditLog` records through this query.

## 14. API-CERT-011 – Submit Internal Reissue Request

**Route:** `POST /api/v1/certificate-reissue-requests`

**Purpose:** Allow an authorized internal actor to submit a reissue request for a certificate.

**Authentication:** Required.

**Permission:** `certificate.reissue.request`.

**Branch scoping:** Certificate branch must be in effective scope.

### Request Schema

```ts
interface SubmitReissueRequestRequest {
  certificateId: string;
  reason: string; // trim; 10..1000 chars
}
```

### Success DTO – `201 Created`

```ts
interface ReissueRequestDto {
  requestId: string;
  certificateId: string;
  certificateNumber: string;
  requestedBy: string;
  reason: string;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  newCertificateId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

**Errors:** `400`, `401`, `403`, `404`, `409 REISSUE_REQUEST_ALREADY_OPEN`, `409 INVALID_STATE_TRANSITION` when certificate status is not reissue-eligible.

## 15. API-CERT-012 – List Reissue Requests

**Route:** `GET /api/v1/certificate-reissue-requests`

**Purpose:** Branch-scoped queue for SCR-CERT-A10.

**Authentication:** Required.

**Permission:** `certificate.reissue.read`.

**Branch scoping:** Server joins/reads certificate enrollment branch and filters to effective scope.

### Request Schema

```ts
interface ListReissueRequestsRequest {
  status?: string[];
  branchId?: string;
  certificateNumber?: string;
  studentSearch?: string;
  requestedFrom?: string;
  requestedTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'status' | 'certificateNumber';
  sortDirection?: 'asc' | 'desc';
}
```

### Success DTO – `200 OK`

```ts
interface ReissueRequestPageDto {
  items: Array<{
    requestId: string;
    certificateId: string;
    certificateNumber: string;
    studentDisplayName: string;
    branchName: string;
    reasonSummary: string;
    status: string;
    requestedByDisplayName: string;
    createdAt: string;
    approvedAt: string | null;
    newCertificateId: string | null;
    version: number;
  }>;
  page: PageMeta;
}
```

**Errors:** `400`, `401`, `403`, `403 BRANCH_SCOPE_DENIED`.

## 16. API-CERT-013 – Get Reissue Request Detail

**Route:** `GET /api/v1/certificate-reissue-requests/{requestId}`

**Purpose:** Return review context, original certificate summary, current status, and replacement result.

**Authentication:** Required.

**Permission:** `certificate.reissue.read`.

**Branch scoping:** Derived from associated certificate enrollment branch.

### Success DTO – `200 OK`

```ts
interface ReissueRequestDetailDto extends ReissueRequestDto {
  originalCertificate: {
    certificateNumber: string;
    certificateStatus: string;
    issuedDate: string | null;
    language: 'en' | 'ar';
  };
  student: { studentNumber: string; displayName: string };
  course: { courseCode: string; name: string };
  batch: { batchCode: string; name: string };
  replacement: {
    certificateId: string;
    certificateNumber: string;
    status: string;
  } | null;
  decisionHistory: Array<{
    action: string;
    actorDisplayName: string;
    remarks: string | null;
    actionAt: string;
  }>;
}
```

**Errors:** `401`, `403`, `404`, `502 DEPENDENCY_UNAVAILABLE` for Audit decision history read failure.

## 17. API-CERT-014 – Approve Reissue Request

**Route:** `POST /api/v1/certificate-reissue-requests/{requestId}/approve`

**Purpose:** Approve a pending reissue request. Approval does not itself generate replacement certificate.

**Authentication:** Required.

**Permission:** `certificate.reissue.approve`.

**Branch scoping:** Associated certificate branch must be in actor's mutation scope.

### Request Schema

```ts
interface ApproveReissueRequestRequest {
  remarks?: string;        // max 1000 chars
  expectedVersion: number;
}
```

### Success DTO – `200 OK`

```ts
interface ReissueDecisionResultDto {
  requestId: string;
  status: string;
  approvedBy: string;
  approvedAt: string;
  newCertificateId: null;
  version: number;
}
```

**Errors:** `400`, `401`, `403`, `404`, `409 INVALID_STATE_TRANSITION`, `409 VERSION_CONFLICT`.

**Ownership note:** The reissue request lifecycle belongs to Certificate Management; approval history record is cross-cutting Audit & Compliance data.

## 18. API-CERT-015 – Reject Reissue Request

**Route:** `POST /api/v1/certificate-reissue-requests/{requestId}/reject`

**Purpose:** Reject a pending reissue request with mandatory remarks.

**Authentication:** Required.

**Permission:** `certificate.reissue.approve`.

**Branch scoping:** Associated certificate branch must be in mutation scope.

### Request Schema

```ts
interface RejectReissueRequestRequest {
  remarks: string;         // trim; 5..1000 chars
  expectedVersion: number;
}
```

### Success DTO – `200 OK`

```ts
interface RejectReissueResultDto {
  requestId: string;
  status: string;
  decidedBy: string;
  decidedAt: string;
  version: number;
}
```

**Errors:** `400`, `401`, `403`, `404`, `409 INVALID_STATE_TRANSITION`, `409 VERSION_CONFLICT`.

**ER gap note:** ER does not contain dedicated rejection metadata fields; authoritative decision remarks/history should use the Audit/Approval model or a validated schema extension.

## 19. API-CERT-016 – Generate Replacement Certificate

**Route:** `POST /api/v1/certificate-reissue-requests/{requestId}/replacement`

**Purpose:** Generate a replacement certificate only from an approved reissue request and preserve lineage.

**Authentication:** Required.

**Permission:** `certificate.reissue.generate`.

**Branch scoping:** Original certificate branch must be within effective mutation scope.

**Required header:** `Idempotency-Key`.

### Request Schema

```ts
interface GenerateReplacementRequest {
  language?: 'en' | 'ar';   // default to original certificate language
  expectedVersion: number;  // reissue request version
}
```

### Processing Contract

1. Validate approved request status.
2. Verify request has no existing `newCertificateId`.
3. Revalidate original certificate and enrollment references.
4. Generate new certificate number and verification code.
5. Render replacement artifact using approved template.
6. Persist replacement certificate and set `newCertificateId` atomically.
7. Preserve original/replacement lineage in returned projection.
8. Audit and publish lifecycle fact.

### Success DTO – `201 Created`

```ts
interface ReplacementCertificateResultDto {
  requestId: string;
  requestStatus: string;
  originalCertificate: { certificateId: string; certificateNumber: string; status: string };
  replacementCertificate: {
    certificateId: string;
    certificateNumber: string;
    certificateStatus: string;
    language: 'en' | 'ar';
    verificationCode: string;
    artifactAvailable: boolean;
    version: number;
  };
}
```

**Errors:** `400`, `401`, `403`, `404`, `409 INVALID_STATE_TRANSITION`, `409 VERSION_CONFLICT`, `409 IDEMPOTENCY_KEY_CONFLICT`, `422 REISSUE_NOT_APPROVED`, `502 DEPENDENCY_UNAVAILABLE`.

**Cardinality gap:** ER's 1:1 Enrollment→Certificate summary conflicts with replacement lineage implication. Physical uniqueness rules must be resolved before implementation.

## 20. API-CERT-017 – Public Verification by Code

**Route:** `POST /api/public/v1/certificates/verify`

**Purpose:** Verify certificate authenticity/status from an opaque verification code entered by the public.

**Authentication:** Not required.

**Permission:** Public endpoint; rate limiting, abuse detection, and input normalization required.

**Branch scoping:** Not applicable. Public verification uses exact opaque verification code. No branch filters or internal IDs accepted.

### Request Schema

```ts
interface PublicVerifyCertificateRequest {
  verificationCode: string; // trim; exact opaque value; max 128 chars
}
```

### Success DTO – `200 OK`

```ts
interface PublicCertificateVerificationDto {
  verificationStatus: 'VALID' | 'REVOKED' | 'REPLACED' | 'NOT_FOUND';
  certificate?: {
    certificateNumber: string;
    learnerDisplayName: string;
    courseName: string;
    issuedDate: string | null;
    language: 'en' | 'ar';
    statusLabel: string;
  };
}
```

To reduce enumeration value, invalid well-formed codes return `200 OK` with `verificationStatus: 'NOT_FOUND'`; malformed input returns `400 VALIDATION_ERROR`.

Every attempt may create a `CertificateVerification` record containing verification status, timestamp, and policy-governed IP evidence.

**Errors:** `400 VALIDATION_ERROR`, `429 RATE_LIMITED`, `503 SERVICE_UNAVAILABLE`.

## 21. API-CERT-018 – Public QR/Deep-Link Verification

**Route:** `GET /api/public/v1/certificates/verify/{verificationCode}`

**Purpose:** Resolve QR/deep-link verification using same verification application service as API-CERT-017.

**Authentication:** None.

**Permission:** Public.

**Branch scoping:** Not applicable.

### Request Schema

Path `verificationCode`, URL-safe opaque code, max 128 chars after decoding.

Optional `lang=en|ar` controls response display localization only.

### Success DTO – `200 OK`

Same `PublicCertificateVerificationDto` as API-CERT-017.

**Errors:** `400`, `429`, `503`.

**Security rule:** The route must not redirect based on untrusted user-provided URLs. QR URLs are server-generated and constrained to approved application origins.

## 22. API-CERT-019 – List My Certificates

**Route:** `GET /api/v1/me/certificates`

**Purpose:** Student self-service list of certificates tied to authenticated person's StudentProfile/Enrollment ownership.

**Authentication:** Required student portal session.

**Permission:** Self-service entitlement; no broad `certificate.read` required.

**Branch scoping:** Self-scope is primary. Server resolves authenticated Person → StudentProfile → Enrollment → Certificate. Client cannot request another studentProfileId. Branch access does not broaden self-scope.

### Request Schema

```ts
interface ListMyCertificatesRequest {
  status?: string[];
  page?: number;
  pageSize?: number; // max 50
  sortDirection?: 'asc' | 'desc'; // issuedDate/createdAt
}
```

### Success DTO – `200 OK`

```ts
interface MyCertificatePageDto {
  items: Array<{
    certificateId: string;
    certificateNumber: string;
    courseName: string;
    batchName: string;
    language: 'en' | 'ar';
    certificateStatus: string;
    issuedDate: string | null;
    artifactAvailable: boolean;
    canRequestReissue: boolean;
  }>;
  page: PageMeta;
}
```

**Errors:** `401`, `404 NOT_FOUND` when no student profile mapping exists according to portal policy.

## 23. API-CERT-020 – Get My Certificate Detail

**Route:** `GET /api/v1/me/certificates/{certificateId}`

**Purpose:** Return self-service-safe detail for authenticated learner.

**Authentication:** Required.

**Permission:** Self-service entitlement.

**Scope:** Certificate must belong to an enrollment for authenticated student's profile. Non-owned resource returns `404 NOT_FOUND` to prevent enumeration.

### Success DTO – `200 OK`

```ts
interface MyCertificateDetailDto {
  certificateId: string;
  certificateNumber: string;
  courseName: string;
  batchName: string;
  language: 'en' | 'ar';
  certificateStatus: string;
  issuedDate: string | null;
  verificationUrl: string;
  artifactAvailable: boolean;
  reissue: {
    canRequest: boolean;
    openRequestId: string | null;
    latestStatus: string | null;
    replacementCertificateId: string | null;
  };
}
```

**Errors:** `401`, `404`.

## 24. API-CERT-021 – Download My Certificate Artifact

**Route:** `GET /api/v1/me/certificates/{certificateId}/artifact`

**Purpose:** Download authenticated learner's own certificate artifact.

**Authentication:** Required.

**Permission:** Self-service entitlement.

**Scope:** Ownership through authenticated Person→StudentProfile→Enrollment. No branch override parameter.

### Success

Binary PDF or short-lived signed redirect as in API-CERT-006.

**Errors:** `401`, `404 NOT_FOUND`, `409 INVALID_STATE_TRANSITION` if artifact unavailable, `502 DEPENDENCY_UNAVAILABLE`.

## 25. API-CERT-022 – Submit My Reissue Request

**Route:** `POST /api/v1/me/certificate-reissue-requests`

**Purpose:** Allow student to request reissue of own eligible certificate.

**Authentication:** Required.

**Permission:** Student portal entitlement and/or `certificate.reissue.request` depending IAM design.

**Scope:** Certificate ownership is derived server-side; client cannot act for another student.

### Request Schema

```ts
interface SubmitMyReissueRequestRequest {
  certificateId: string;
  reason: string; // trim; 10..1000 chars
}
```

### Success DTO – `201 Created`

```ts
interface MyReissueRequestDto {
  requestId: string;
  certificateId: string;
  certificateNumber: string;
  reason: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  replacementCertificateId: string | null;
}
```

**Errors:** `400`, `401`, `404`, `409 REISSUE_REQUEST_ALREADY_OPEN`, `409 INVALID_STATE_TRANSITION`.

## 26. API-CERT-023 – List My Reissue Requests

**Route:** `GET /api/v1/me/certificate-reissue-requests`

**Purpose:** List authenticated student's own request history.

**Authentication:** Required.

**Permission:** Self-service entitlement.

**Scope:** Derived through certificate enrollment student ownership. No student or branch selector accepted.

### Request Schema

`page`, `pageSize` (max 50), optional `status[]`.

### Success DTO – `200 OK`

```ts
interface MyReissueRequestPageDto {
  items: MyReissueRequestDto[];
  page: PageMeta;
}
```

**Errors:** `400`, `401`.

## 27. API-CERT-024 – Trainer Certificate Status Query

**Route:** `GET /api/v1/trainer/certificates/status`

**Purpose:** Read-only downstream certificate status for enrollments in batches/sessions the trainer is authorized to view.

**Authentication:** Required trainer portal session.

**Permission:** Trainer portal entitlement; may additionally map to a dedicated query permission such as `certificate.trainer-status.read` if configured in IAM. This is a permission recommendation, not an ER entity.

**Scope:** Server resolves authenticated Person→TrainerProfile and authorized BatchTrainer/Session assignments. Client-provided `batchId` may only narrow this trainer scope.

### Request Schema

```ts
interface TrainerCertificateStatusRequest {
  batchId?: string;
  q?: string; // student/enrollment search within trainer scope
  status?: string[];
  page?: number;
  pageSize?: number;
}
```

### Success DTO – `200 OK`

```ts
interface TrainerCertificateStatusPageDto {
  items: Array<{
    enrollmentId: string;
    enrollmentNumber: string;
    studentDisplayName: string;
    batchCode: string;
    completionStatus: string;
    certificateStatus: string | null;
    certificateNumber: string | null;
    issuedDate: string | null;
  }>;
  page: PageMeta;
}
```

**Errors:** `401`, `403 PERMISSION_DENIED`, `404` if trainer profile mapping missing.

**DDD boundary:** No issue, revoke, or reissue command is exposed to trainers. Completion recommendation belongs to Exam/Completion context.

## 28. API-CERT-025 – Certificate Operational Dashboard

**Route:** `GET /api/v1/certificates/dashboard`

**Purpose:** Supply operational counts and work queues for SCR-CERT-A01.

**Authentication:** Required.

**Permission:** `certificate.read`; executive/reporting implementations may additionally enforce dashboard-specific permission.

**Branch scoping:** Effective branch scope mandatory. Optional `branchId` narrows only.

### Request Schema

```ts
interface CertificateDashboardRequest {
  branchId?: string;
  from?: string;
  to?: string;
}
```

### Success DTO – `200 OK`

```ts
interface CertificateDashboardDto {
  scope: { branchIds: string[]; from: string; to: string };
  metrics: {
    readyForGeneration: number;
    generatedNotIssued: number;
    issued: number;
    revoked: number;
    pendingReissueRequests: number;
    approvedReissueAwaitingReplacement: number;
    publicVerificationAttempts: number;
  };
  queues: {
    readinessBlockers: Array<{ code: string; count: number }>;
    reissueByStatus: Array<{ status: string; count: number }>;
  };
}
```

**Errors:** `400`, `401`, `403`, `502 DEPENDENCY_UNAVAILABLE`.

**Ownership note:** May consume Reporting-owned read models; it must not make Reporting owner of certificate transactions.

## 29. API-CERT-026 – Certificate Registry Report Query

**Route:** `GET /api/v1/certificates/reports/registry`

**Purpose:** Return report-oriented certificate facts for authorized operational reporting.

**Authentication:** Required.

**Permission:** `certificate.report.read`.

**Branch scoping:** Effective branch scope enforced. `branchId` narrows only.

### Request Schema

Uses registry filters from API-CERT-004 plus report dimensions:

```ts
interface CertificateRegistryReportRequest {
  branchId?: string;
  courseId?: string;
  batchId?: string;
  status?: string[];
  language?: Array<'en' | 'ar'>;
  issuedFrom?: string;
  issuedTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'issuedDate' | 'certificateNumber' | 'branchName' | 'courseName';
  sortDirection?: 'asc' | 'desc';
}
```

### Success DTO – `200 OK`

```ts
interface CertificateRegistryReportPageDto {
  rows: Array<{
    certificateNumber: string;
    enrollmentNumber: string;
    studentNumber: string;
    studentDisplayName: string;
    courseCode: string;
    courseName: string;
    batchCode: string;
    branchName: string;
    language: 'en' | 'ar';
    status: string;
    issuedDate: string | null;
  }>;
  page: PageMeta;
}
```

**Errors:** `400`, `401`, `403`.

## 30. API-CERT-027 – Export Certificate Registry Report

**Route:** `POST /api/v1/certificates/reports/registry/export`

**Purpose:** Export a permission- and branch-scoped certificate registry report.

**Authentication:** Required.

**Permission:** `certificate.report.export`.

**Branch scoping:** Same effective scope enforcement as report query; client cannot export wider scope than interactive access.

### Request Schema

```ts
interface ExportCertificateRegistryRequest {
  format: 'csv' | 'xlsx' | 'pdf';
  filters: {
    branchId?: string;
    courseId?: string;
    batchId?: string;
    status?: string[];
    language?: Array<'en' | 'ar'>;
    issuedFrom?: string;
    issuedTo?: string;
  };
  locale: 'en' | 'ar';
}
```

### Success

For synchronous bounded exports: `200 OK` with binary file and safe filename.

```text
Content-Disposition: attachment; filename="certificate-registry-YYYYMMDD.<ext>"
```

If platform-wide export architecture later uses jobs, that is an architectural decision outside this FRD and must not introduce an external broker by default.

**Errors:** `400`, `401`, `403`, `413 EXPORT_TOO_LARGE` when configured synchronous export row limit is exceeded, `500`.

## 31. API-CERT-028 – Request Certificate Notification

**Route:** `POST /api/v1/certificates/{certificateId}/notifications`

**Purpose:** Request Communication context to deliver an issued-certificate notification without making Certificate Management own provider delivery history.

**Authentication:** Required.

**Permission:** Must be bound in IAM to an operational permission policy. Recommended mapping: `certificate.issue` for issue-coupled notification or an explicit configurable communication permission. Do not hardcode role names.

**Branch scoping:** Certificate branch must be within effective scope.

### Request Schema

```ts
interface RequestCertificateNotificationRequest {
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'SYSTEM_NOTIFICATION';
  language: 'en' | 'ar';
  templateCode: string; // 1..100 chars, must resolve to active Communication template
}
```

Recipient identity/contact is resolved server-side from the certificate's student/person linkage. Client cannot supply arbitrary recipient contact in this route.

### Success DTO – `202 Accepted`

```ts
interface CertificateNotificationRequestDto {
  certificateId: string;
  communicationRequestId: string;
  requestStatus: 'ACCEPTED';
  channel: string;
  language: 'en' | 'ar';
}
```

**Errors:** `400`, `401`, `403`, `404`, `409 INVALID_STATE_TRANSITION` when certificate is not in a notifiable state, `422 TEMPLATE_NOT_AVAILABLE`, `502 DEPENDENCY_UNAVAILABLE`.

---

## 32. Internal Application Port Contracts

These are not public REST endpoints. They document dependency boundaries used by Certificate application services.

### 32.1 Enrollment Context Read Port

```ts
interface EnrollmentCertificateContextPort {
  getEnrollmentCertificateContext(enrollmentId: string): Promise<{
    enrollmentId: string;
    enrollmentNumber: string;
    enrollmentStatus: string;
    studentProfileId: string;
    courseId: string;
    batchId: string;
    branchId: string;
    paymentValidationRequired: boolean;
  } | null>;
}
```

Certificate Management may read this context but must not update Enrollment status, completionStatus, or certificateStatus through this port unless a separately governed integration contract explicitly exists.

### 32.2 Completion Eligibility Port

```ts
interface CompletionEligibilityPort {
  getApprovedCompletion(enrollmentId: string): Promise<{
    enrollmentId: string;
    completionStatus: string;
    approved: boolean;
    approvedAt: string | null;
  } | null>;
}
```

No raw attendance or result calculation is permitted in Certificate Management.

### 32.3 Finance Payment Validation Port

```ts
interface CertificatePaymentValidationPort {
  validateCertificatePayment(enrollmentId: string): Promise<{
    required: boolean;
    passed: boolean;
    validatedAt: string;
    reasonCode?: string;
  }>;
}
```

The port returns a gate decision, not invoice/payment mutation access.

### 32.4 Numbering Port

```ts
interface CertificateNumberingPort {
  allocateCertificateNumber(input: {
    entityType: 'CERTIFICATE';
    branchId: string;
    allocationDate: string;
  }): Promise<{ certificateNumber: string }>;
}
```

Certificate clients never construct numbering values.

### 32.5 Audit Port

```ts
interface CertificateAuditPort {
  recordSensitiveAction(input: {
    entityType: 'Certificate' | 'CertificateReissueRequest';
    entityId: string;
    action: string;
    oldValue?: unknown;
    newValue?: unknown;
    performedBy: string;
    reason?: string;
    ipAddress?: string;
  }): Promise<void>;
}
```

Audit & Compliance owns `AuditLog`; Certificate Management supplies business action facts.

### 32.6 Communication Request Port

```ts
interface CertificateCommunicationPort {
  requestNotification(input: {
    templateCode: string;
    recipientPersonId: string;
    channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'SYSTEM_NOTIFICATION';
    language: 'en' | 'ar';
    payload: Record<string, unknown>;
  }): Promise<{ notificationRequestId: string; accepted: boolean }>;
}
```

---

## 33. Authentication, Authorization, and Branch Scope Matrix

| API Group | Authentication | Permission/Entitlement | Scope Derivation |
|---|---|---|---|
| Readiness | Internal session | `certificate.read` | Enrollment branch ∩ effective IAM branches |
| Generate | Internal session | `certificate.generate` | Target enrollment branch ∩ mutation scope |
| Registry/detail | Internal session | `certificate.read` | Certificate→Enrollment→Branch |
| Artifact internal | Internal session | `certificate.download` | Certificate→Enrollment→Branch |
| Issue | Internal session | `certificate.issue` | Certificate→Enrollment→Branch |
| Revoke | Internal session | `certificate.revoke` | Certificate→Enrollment→Branch |
| Verification activity | Internal session | `certificate.verify.internal` | Certificate→Enrollment→Branch |
| Lifecycle audit | Internal session | `certificate.audit.read` | Certificate scope checked before audit read |
| Reissue request submit | Internal session | `certificate.reissue.request` | Certificate→Enrollment→Branch |
| Reissue queue/detail | Internal session | `certificate.reissue.read` | Associated certificate branch |
| Reissue decision | Internal session | `certificate.reissue.approve` | Associated certificate branch mutation scope |
| Replacement generation | Internal session | `certificate.reissue.generate` | Original certificate branch mutation scope |
| Public verify | Anonymous | Public | Exact verification code only; no branch dimension |
| Student self-service | Student session | Portal entitlement | Person→StudentProfile→Enrollment ownership |
| Trainer status | Trainer session | Portal entitlement/query permission | Person→TrainerProfile→BatchTrainer/Session assignment |
| Reporting | Internal session | `certificate.report.read/export` | Effective IAM branch scope |

### 33.1 Branch Scope Algorithm

For each internal scoped request:

```text
1. Authenticate user.
2. Resolve required permission.
3. Resolve UserBranchAccess assignments.
4. Apply parent/child expansion only when IAM flags allow it.
5. Determine effective branch set.
6. If request contains branchId:
       require branchId ∈ effective branch set
       query scope = {branchId}
   else:
       query scope = effective branch set
7. For ID-based commands:
       load resource ownership path
       Certificate -> Enrollment -> Branch
       or ReissueRequest -> Certificate -> Enrollment -> Branch
8. Reject command when resource branch is outside mutation scope.
9. Recheck scope in service/repository query predicate to avoid TOCTOU bypass.
```

---

## 34. Command Concurrency and Idempotency Contracts

### 34.1 Optimistic Concurrency

The following commands require `expectedVersion`:

- Issue Certificate
- Revoke Certificate
- Approve Reissue Request
- Reject Reissue Request
- Generate Replacement Certificate

The repository mutation predicate must include both aggregate ID and current version. A zero-row update returns `409 VERSION_CONFLICT`; the client must reload current state before retrying.

### 34.2 Idempotency

Mandatory for:

- Generate Certificate
- Issue Certificate
- Generate Replacement Certificate

Rules:

1. A successful replay with the same key and equivalent canonical payload returns the original logical result with `meta.idempotentReplay=true`.
2. Reuse of the same key with a different canonical payload returns `409 IDEMPOTENCY_KEY_CONFLICT`.
3. Idempotency does not bypass current authorization or branch scope checks.
4. Duplicate protection also enforces domain uniqueness; idempotency is not the only duplicate defense.

---

## 35. Validation Rules Summary

| Field | Rule |
|---|---|
| `language` | `en` or `ar` only |
| `reason` for reissue | Trimmed 10–1000 characters |
| `reason` for revocation | Trimmed 10–1000 characters |
| rejection `remarks` | Trimmed 5–1000 characters |
| optional approval remarks | Max 1000 characters |
| `expectedVersion` | Integer ≥ 0 |
| page | Integer ≥ 1 |
| pageSize internal | 1–100 |
| pageSize self-service | 1–50 |
| date ranges | ISO date; `to >= from` |
| verification code | Required, trimmed, max 128 chars; exact opaque match |
| search text | Trimmed, max 100 chars |
| Idempotency-Key | 8–128 characters; server-normalized per platform policy |

Validation at API boundary does not replace domain validation inside application services.

---

## 36. Error Response Examples

### 36.1 Validation Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "fieldErrors": [
      {
        "field": "reason",
        "code": "MIN_LENGTH",
        "message": "Reason must contain at least 10 characters."
      }
    ],
    "requestId": "req_opaque"
  }
}
```

### 36.2 Payment Gate Failure

```json
{
  "error": {
    "code": "PAYMENT_VALIDATION_FAILED",
    "message": "Certificate processing is blocked because the required payment validation has not passed.",
    "details": {
      "enrollmentId": "opaque-enrollment-id"
    },
    "requestId": "req_opaque"
  }
}
```

The API must not leak invoice line items, card data, bank references, or unrelated Finance details in this error.

### 36.3 Version Conflict

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "The record changed after it was loaded. Reload the latest state before retrying.",
    "details": {
      "currentVersion": 8
    },
    "requestId": "req_opaque"
  }
}
```

---

## 37. DDD Ownership Fit Check by API Surface

| API Capability | Owner | Contract Rule |
|---|---|---|
| Certificate readiness composition | Certificate application layer consuming upstream truth | May compose; must not own completion/payment facts |
| Completion approval | Exam, Result & Completion | No Certificate mutation endpoint exists for completion |
| Payment validation | Finance & Receivables | Certificate consumes gate decision only |
| Course completion rule | Course Catalog | Read dependency; Certificate does not edit rule |
| Certificate generation | Certificate | Owned command |
| Certificate issue | Certificate | Owned command |
| Public verification | Certificate | Owned query + verification-attempt record |
| Reissue request | Certificate | Owned transaction |
| Reissue approval history | Audit & Compliance | Read projection / audit command integration |
| Replacement generation | Certificate | Owned command, pending cardinality resolution |
| Revocation | Certificate | Owned behavior; ER metadata gap noted |
| Notification delivery | Communication | Certificate requests delivery; no provider-send endpoint here |
| Dashboard/report transaction facts | Reporting consumes | Certificate may expose query/read model but reporting does not mutate Certificate |
| Branch access | IAM | Certificate service consumes resolved scope and re-enforces resource ownership |

### 37.1 Endpoints Explicitly Not Allowed in Certificate Management

The following routes must not be created in this module:

```text
POST /api/v1/certificates/{id}/approve-completion
POST /api/v1/certificates/{id}/mark-exam-passed
POST /api/v1/certificates/{id}/mark-payment-complete
POST /api/v1/certificates/{id}/adjust-invoice
POST /api/v1/certificates/{id}/mark-attendance
POST /api/v1/certificates/{id}/assign-batch
PUT  /api/v1/certificates/{id}/student-profile
DELETE /api/v1/certificates/{id}
DELETE /api/v1/certificate-reissue-requests/{id}
```

These would violate bounded-context ownership, aggregate invariants, or soft-delete/audit rules.

---

## 38. Traceability to Screens and Use Cases

| API ID | Primary Screen(s) | Primary Use Case |
|---|---|---|
| API-CERT-001 | SCR-CERT-A02 | UC-CERT-001 |
| API-CERT-002 | SCR-CERT-A03, A04 | UC-CERT-001 |
| API-CERT-003 | SCR-CERT-A04, A05 | UC-CERT-002 |
| API-CERT-004 | SCR-CERT-A06 | Registry query supporting UC-CERT-003/008 operations |
| API-CERT-005 | SCR-CERT-A07 | Certificate detail query |
| API-CERT-006 | SCR-CERT-A08 | Artifact access |
| API-CERT-007 | SCR-CERT-A09 | UC-CERT-003 |
| API-CERT-008 | SCR-CERT-A13 | UC-CERT-008 |
| API-CERT-009 | SCR-CERT-A14 | Verification activity query |
| API-CERT-010 | SCR-CERT-A15 | Lifecycle/audit query |
| API-CERT-011 | Internal request flow | UC-CERT-005 |
| API-CERT-012/013 | SCR-CERT-A10/A11 | UC-CERT-006 |
| API-CERT-014/015 | SCR-CERT-A11 | UC-CERT-006 |
| API-CERT-016 | SCR-CERT-A12 | UC-CERT-007 |
| API-CERT-017/018 | SCR-CERT-P01 | UC-CERT-004 |
| API-CERT-019/020/021 | SCR-CERT-S01/S02 | Student self-service stories |
| API-CERT-022/023 | SCR-CERT-S03/S04 | UC-CERT-005 |
| API-CERT-024 | SCR-CERT-T01 | Trainer read-only status flow |
| API-CERT-025 | SCR-CERT-A01 | Dashboard query |
| API-CERT-026/027 | Reporting surfaces | Reporting requirements |
| API-CERT-028 | Issue/detail actions | FR-CERT-031 |

---

## 39. ER and Source-Model Consistency Notes

1. `Certificate` is the core Certificate-owned persisted model. API fields map to its enrollment, student, course, batch, issue, status, artifact, verification, QR, and language data.
2. `CertificateVerification` supports public/internal verification-attempt history. Public DTOs expose only minimized verification results.
3. `CertificateReissueRequest` supports request, approval state, and `newCertificateId` lineage linkage.
4. Enrollment, StudentProfile, Course, Batch, CourseCompletion, Invoice/Payment facts, User/Branch access, AuditLog, NotificationRequest, and reporting projections are referenced data owned elsewhere.
5. The DDD concept `CertificateIssueLog` has no ER entity. This API does not invent CRUD endpoints for it; lifecycle history is served through Certificate + Audit projections until model resolution.
6. The DDD concept `CertificateQRCode` is represented by `Certificate.qrCodeUrl` in the ER; no separate QR CRUD API is introduced.
7. Revocation is a Certificate responsibility in DDD, but dedicated revocation metadata is absent from ER. The revoke command is specified behaviorally, while physical persistence must be resolved before implementation.
8. ER summary cardinality of Enrollment 1→1 Certificate conflicts with replacement generation implied by `CertificateReissueRequest.newCertificateId`. API-CERT-016 requires explicit schema resolution before enforcing unique enrollment-to-certificate constraints.
9. Certificate and reissue status enum values are not fully enumerated in ER. API contracts intentionally use `string` for internal lifecycle status fields where source enum authority is unresolved; Part 2 transition semantics remain the behavioral baseline.
10. Prisma-level route-to-model validation remains pending until the Prisma schema is available for comparison.

---

## 40. Part 5 Consistency Conclusion

This API contract preserves the Module 11 boundaries established in Parts 1–4:

- certificate lifecycle commands remain inside Certificate Management;
- Enrollment remains the central learning-journey reference;
- Completion eligibility is consumed, not recalculated;
- Finance payment validation is consumed, not recalculated;
- IAM owns permissions and branch access policy while every Certificate endpoint enforces the resolved scope server-side;
- Audit owns audit history while Certificate commands emit/record sensitive business actions;
- Communication owns delivery while Certificate requests notifications;
- Reporting consumes certificate facts and does not own certificate transactions;
- no hard-delete API exists;
- generation, issue, and replacement commands are idempotent;
- lifecycle mutations use optimistic concurrency;
- public verification returns minimized data and records verification activity according to ER capability.

The contract is therefore DDD-aligned and ER-grounded, with source-model ambiguities called out explicitly rather than hidden by invented persistence models.
