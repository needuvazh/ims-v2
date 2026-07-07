# Part 10 - Security Architecture and NFR

## Module 11 – Certificate Management

## 1. Purpose

This document defines the security architecture and non-functional requirements (NFRs) for Module 11 – Certificate Management. It extends Parts 1–9 and applies the established ASTI IMS architecture principles:

- modular monolith first;
- Enrollment remains the central learning-lifecycle aggregate;
- Certificate Management owns the Certificate aggregate and certificate lifecycle behavior;
- completion eligibility is authoritative in Exam, Result & Completion Management;
- payment-validation truth is authoritative in Fee, Billing & Receivables Management;
- permissions and effective branch scope are authoritative in Identity & Access Management;
- audit history is authoritative in Audit & Compliance;
- notification templates and delivery history are authoritative in Communication & Notification Management;
- reporting projections are read-only and cannot mutate transactional state;
- no hard deletes of business records;
- all sensitive state changes are auditable;
- server-side branch isolation is mandatory.

The security and NFR controls below apply to the Admin Portal, Student Portal, Trainer Portal, public verification surface, REST APIs, Server Actions, background/in-process jobs, artifact storage access, reporting views, and internal application-port interactions.

---

# 2. Security Objectives

| ID | Security Objective | Required Outcome |
|---|---|---|
| SEC-CERT-001 | Prevent unauthorized issuance | Only authenticated users with the required fine-grained permission and effective branch scope can generate or issue certificates. |
| SEC-CERT-002 | Protect certificate integrity | Certificate number, verification code, artifact reference, lifecycle status, and reissue lineage cannot be altered outside approved application services and valid state transitions. |
| SEC-CERT-003 | Prevent cross-branch leakage | Certificate records, artifacts, reissue requests, reports, and exports are constrained by server-resolved effective branch scope. |
| SEC-CERT-004 | Prevent eligibility bypass | Certificate Management consumes authoritative completion and payment decisions and cannot accept client-supplied eligibility or payment flags as truth. |
| SEC-CERT-005 | Protect public verification | Public verification reveals only approved, minimal verification information and resists enumeration, scraping, abuse, and timing-based record discovery. |
| SEC-CERT-006 | Preserve non-repudiation | Generation, issuance, reissue approval/rejection, replacement generation, revocation, sensitive downloads/exports where configured, and permission-sensitive operations are attributable to a user/system identity and timestamp. |
| SEC-CERT-007 | Preserve artifact confidentiality | Non-public certificate PDFs and generated artifacts are not exposed through permanent public object-storage URLs. |
| SEC-CERT-008 | Preserve artifact authenticity | Artifact hashes, immutable object versions, or equivalent integrity controls must allow detection of post-generation artifact tampering. |
| SEC-CERT-009 | Prevent replay and duplicate commands | Generate, issue, and replacement-generation commands are idempotent and protected against duplicate retries and concurrent conflicting updates. |
| SEC-CERT-010 | Minimize personal data exposure | UI, logs, reports, exports, verification responses, and telemetry expose only data necessary for the actor and purpose. |
| SEC-CERT-011 | Preserve history | Soft-deleted or superseded certificate records remain historically traceable and cannot be silently hard deleted. |
| SEC-CERT-012 | Fail safely across contexts | Failures in Completion, Finance, IAM, Numbering, Audit, Communication, storage, or reporting side effects have defined fail-closed or recoverable behavior. |

---

# 3. Security Architecture

## 3.1 Trust Boundaries

```text
[Browser / Mobile Web]
        |
        | TLS 1.2+
        v
[Next.js Portal / Route Handler / Server Action]
        |
        +--> Authentication Session Validation
        |
        +--> IAM Permission + Scope Resolution
        |
        v
[Certificate Application Service]
        |
        +--> Certificate Repository / Transaction
        |
        +--> Enrollment Read Port
        +--> Completion Decision Read Port
        +--> Finance Validation Read Port
        +--> Numbering Allocation Port
        +--> Audit Recording Port
        +--> Communication Request Port
        +--> Reporting Projection Publication
        |
        v
[Database + Private Artifact Storage]

Public Verification Surface
        |
        | TLS + rate limits + minimal response
        v
[Verification Application Service]
        |
        +--> Certificate read
        +--> append verification attempt/log where approved
        v
[Privacy-minimized verification result]
```

### 3.1.1 Boundary Rules

1. Browser clients never determine authorization or branch scope.
2. The Certificate application service must receive an authenticated principal and effective scope decision for every non-public operation.
3. The public verification endpoint may be anonymous but is isolated from authenticated administrative DTOs and must never reuse rich internal detail responses.
4. Cross-context application ports are called through explicit package/application interfaces inside the modular monolith.
5. Certificate Management may read authoritative decisions from Completion and Finance but may not update their tables.
6. Reporting views and metric snapshots are read-only consumers.
7. Audit and Communication are side-effect owners; Certificate Management may request actions but cannot directly mutate their persistence tables.

---

# 4. Authentication Controls

## 4.1 Internal Users

All Admin, Student, and Trainer portal routes require authenticated sessions.

Required controls:

- validate session on the server for every request;
- reject expired, revoked, malformed, or missing sessions;
- never rely only on route middleware for authorization;
- revalidate authorization at the Route Handler, Server Action, or application-service boundary;
- use CSRF-resistant framework/session conventions for cookie-authenticated mutations;
- use `SameSite=Lax` or stricter where compatible, `Secure`, and `HttpOnly` cookies for session tokens;
- rotate session identifiers after privilege elevation or authentication state changes;
- do not place certificate artifacts, verification codes, full civil IDs, passport numbers, or authorization claims in browser-local persistent storage.

## 4.2 Public Verification

Public certificate verification does not require login, but it must implement:

- input normalization and strict maximum length;
- rate limiting per source IP/device fingerprint strategy approved by platform architecture;
- uniform invalid/not-found response semantics;
- CAPTCHA or progressive challenge capability after suspicious thresholds;
- abuse metrics and alerting;
- no bulk-verification endpoint for anonymous users;
- no wildcard or prefix search;
- no response containing internal IDs, branch-access metadata, finance state, audit history, email address, phone number, civil ID, passport number, or StudentProfile identifiers.

---

# 5. Authorization and Scope Enforcement

## 5.1 Authorization Decision Order

Every protected request must enforce the following sequence:

```text
1. Authenticate principal
2. Resolve fine-grained permission
3. Resolve effective branch scope / self scope / trainer scope / global scope
4. Load target resource within effective scope
5. Revalidate aggregate state and cross-context guards
6. Execute mutation transaction
7. Record required audit information
8. Trigger post-commit side effects
```

A permission check without scope enforcement is insufficient. A scoped query without permission validation is also insufficient.

## 5.2 Required Scope Modes

| Scope Mode | Use | Enforcement |
|---|---|---|
| Branch | Normal administrative certificate operations | `certificate.branchId` is derived through Enrollment and constrained to IAM effective branch scope. |
| Parent + Child | Authorized parent branch users | Child branches are included only if IAM returns that scope; hierarchy must not be inferred by the Certificate UI. |
| Consolidated Report | Cross-branch reports/dashboard | Requires report permission plus `canViewConsolidated = true` or equivalent IAM decision. No transactional mutation is implied. |
| Global | Compliance/audit use cases only where explicitly granted | Requires explicit global permission/scope; never inferred from a business role name. |
| Student Self | Student certificate view/download/reissue request | Resource must resolve to the authenticated student's StudentProfile and Enrollment. |
| Trainer Assigned | Trainer read-only certificate status | Enrollment must be connected to a batch/session assignment within trainer scope. No certificate mutation permission is implied. |
| Public | Public verification only | Limited by verification code input and minimal response contract; no branch browsing capability. |

## 5.3 Server-Side Branch Isolation

The implementation must:

1. obtain allowed branch IDs from IAM/access policy evaluation;
2. apply branch predicates in repository queries before returning data;
3. derive certificate branch from the authoritative Enrollment relationship;
4. reject user-supplied branch IDs not contained in effective scope;
5. apply the same scope to list queries, detail queries, artifact downloads, exports, reissue requests, lifecycle commands, and dashboard drill-downs;
6. never return a forbidden record first and then hide it in the UI;
7. prefer `404 NOT_FOUND` semantics where revealing record existence would leak cross-branch data, except where an administrative authorization error contract explicitly requires `403` and does not expose target existence.

---

# 6. Certificate Artifact Security

## 6.1 Storage Controls

Certificate artifacts must be stored in private storage by default.

Required controls:

- no permanent anonymous object URL for administrative/student downloads;
- short-lived, single-purpose signed download URL or authenticated application proxy;
- signed URL lifetime target: no more than 5 minutes unless platform architecture approves another value;
- object key must not expose civil ID, passport number, email, phone, or raw student name;
- storage access must use least-privilege service credentials;
- bucket/container must disable anonymous listing;
- artifact replacement must use immutable versions or new object keys rather than destructive overwrite;
- deleted/superseded artifacts follow retention policy and soft-delete/archive rules rather than immediate permanent removal;
- storage operations must be correlated with certificate ID and request/trace ID in logs without logging the full verification code.

## 6.2 Artifact Integrity

Recommended mandatory integrity metadata:

```text
artifactSha256
artifactSizeBytes
artifactMimeType
artifactGeneratedAt
artifactRendererVersion
```

Because these fields are not defined in the supplied ER model, they are an **ER/schema gap** and require formal approval before persistence changes. Until approved, equivalent immutable object-versioning and storage-side checksum verification must be used.

Integrity controls:

- calculate SHA-256 or equivalent approved digest at generation time;
- verify storage write success before marking generation successful;
- optionally revalidate checksum during forensic investigation, controlled reissue, or artifact migration;
- reject non-PDF artifact content where the contract expects PDF;
- sanitize all dynamic text rendered into HTML/SVG/PDF templates to prevent injection into the rendering engine;
- do not allow user-provided template source, script, remote URL, or executable content in the current hardcoded-template scope.

## 6.3 PDF Rendering Security

The renderer must:

- run with network access disabled unless an approved allowlist is required;
- block local-file URI access from dynamic content;
- use packaged or approved static assets;
- reject unsupported fonts/assets safely;
- apply execution timeout and memory limits;
- sanitize bilingual text and metadata;
- avoid embedding secrets, internal URLs, storage credentials, or server filesystem paths in PDF metadata.

---

# 7. Verification Code and QR Security

## 7.1 Verification Code Requirements

A verification code must be:

- unique across active and historical certificates;
- generated from cryptographically secure randomness or an approved non-predictable encoding strategy;
- non-sequential;
- sufficiently high entropy to resist guessing;
- compared using normalized canonical representation;
- never reusable for a different certificate;
- retained for historical verification behavior even if a certificate is revoked, so verification can return a truthful revoked result rather than reassigning the code.

Minimum recommendation: at least 128 bits of effective randomness before encoding. If business readability requires shorter codes, a security review is mandatory.

## 7.2 QR Code Requirements

The QR code should encode only an approved verification URL or opaque verification token. It must not directly embed sensitive student information.

The QR payload must not contain:

- civil ID;
- passport number;
- date of birth;
- email;
- phone;
- internal database IDs;
- payment state;
- branch permission details;
- audit identifiers.

## 7.3 Verification Response Minimization

An approved public result may include only business-approved fields such as:

- validity outcome (`VALID`, `REVOKED`, `INVALID_OR_NOT_FOUND`);
- certificate number;
- display name or masked/minimized learner name as approved by business/privacy policy;
- course name;
- issued date;
- certificate language;
- revocation status without internal reason unless policy approves publication.

Uniform error behavior must prevent enumeration of certificate existence.

---

# 8. Input, Output, and Injection Security

All REST endpoints and Server Actions must implement:

- strict request-schema validation;
- allowlisted enum parsing;
- maximum string lengths;
- pagination upper bounds;
- export row limits;
- safe sort-field allowlists;
- parameterized database queries through repository/ORM conventions;
- no dynamic SQL concatenation from client fields;
- output encoding for HTML views;
- sanitized content passed to the PDF renderer;
- CSV formula-injection protection for values beginning with `=`, `+`, `-`, or `@` where exports may open in spreadsheet software;
- filename sanitization for downloads and exports;
- rejection of path traversal sequences;
- no server-side fetch of arbitrary URLs supplied by certificate users.

---

# 9. Sensitive Data and Privacy Controls

## 9.1 Data Classification

| Data | Classification | Controls |
|---|---|---|
| Certificate number | Internal/Public depending on use | Public only through approved certificate/verification flow. |
| Verification code | Sensitive token | Never log in full; mask in telemetry; rate-limit verification attempts. |
| Student name | Personal data | Minimum necessary display; protected in internal reports and public response policy. |
| StudentProfile ID / Enrollment ID | Internal identifier | Never expose on public verification response. |
| Certificate PDF | Personal/business record | Private storage; authenticated or short-lived access. |
| Reissue reason | Potentially sensitive business data | Restricted to authorized workflow users and audit/compliance. |
| Revocation reason | Sensitive lifecycle data | Restricted; public response shows only approved status information. |
| IP address in verification log | Security/personal metadata | Restricted access and retention policy. |
| Audit old/new values | Sensitive compliance data | Global/approved audit permissions only; not public or student-accessible by default. |

## 9.2 Logging Redaction

Structured logs must never contain:

- password/session tokens;
- storage credentials;
- full signed artifact URLs;
- full verification codes;
- civil IDs;
- passport numbers;
- full payment details;
- full notification payloads containing personal data;
- complete PDF content;
- authorization bearer tokens.

Recommended masked values:

```text
verificationCodeHashPrefix
certificateId
certificateNumber
branchId
actorUserId
requestId
traceId
operation
result
errorCode
```

---

# 10. Command Integrity, Idempotency, and Concurrency

## 10.1 Idempotency

The following commands must be idempotent:

- certificate generation;
- certificate issuance where API retries are possible;
- replacement certificate generation;
- notification request creation for a lifecycle event;
- reporting lifecycle-fact publication.

Required behavior:

- repeated request with the same idempotency key and identical payload returns the original successful result or equivalent replay response;
- same key with materially different payload returns `IDEMPOTENCY_KEY_CONFLICT`;
- concurrent generation attempts cannot create duplicate active certificates for the same allowed lifecycle slot;
- idempotency storage/strategy must survive application-process restart where commands can be retried by clients or jobs.

## 10.2 Optimistic Concurrency

Certificate lifecycle mutations and reissue workflow mutations must use the repository `version` convention where available.

On stale version:

- reject with `409 VERSION_CONFLICT`;
- do not overwrite newer state;
- UI reloads current state before retry;
- stale commands do not emit lifecycle events, audit success records, or notifications.

## 10.3 Transactional Boundaries

A command transaction must atomically persist Certificate-owned changes. Examples:

### Generate Certificate

```text
Validate aggregate and authoritative gates
Allocate/confirm certificate number according to Numbering contract
Create Certificate record
Persist verification code and artifact reference
Commit Certificate-owned transaction
Record required audit outcome / side effects according to architecture pattern
```

### Replacement Generation

```text
Validate approved reissue request
Create replacement Certificate
Link ReissueRequest.newCertificateId
Mark request Completed
Commit atomically
```

No transaction may partially create the replacement certificate while failing to link the approved reissue request.

---

# 11. Cross-Context Security Rules

## 11.1 Completion Context

Certificate Management must consume a decision contract equivalent to:

```ts
interface CompletionEligibilityDecision {
  enrollmentId: string;
  completionId: string;
  approved: boolean;
  completionStatus: string;
  approvedAt: string | null;
  decisionVersion?: string;
}
```

Security rules:

- reject client-supplied `completionApproved=true` as authoritative input;
- never update `CourseCompletion` or `CompletionApproval` from a Certificate endpoint;
- perform command-time revalidation for generation/replacement where required;
- log the source decision reference/version used for traceability when supported.

## 11.2 Finance Context

Certificate Management must consume payment validation as a decision, not calculate it from financial tables.

Security rules:

- do not accept client-supplied `paymentCompleted=true` as truth;
- do not mark invoices paid or write Payment/Receipt/Receivable records;
- fail closed when payment validation is required but authoritative Finance validation is unavailable;
- permit bypass only if authoritative course/completion configuration says payment validation is not required.

## 11.3 IAM Context

- Certificate Management never assigns roles or branch access.
- Permission names are dynamic IAM configuration, not hardcoded role-name checks.
- Effective scope must be evaluated at request time.
- privilege changes must take effect according to IAM/session invalidation policy.

## 11.4 Audit Context

- Certificate services generate sufficient audit command/event data.
- Audit & Compliance owns audit persistence and approval history.
- Certificate Management must not directly edit historical audit records.

## 11.5 Communication Context

- Certificate Management requests notifications after successful business transitions.
- Communication owns templates, delivery status, retry policy, and NotificationLog.
- notification delivery failure must not roll back an already committed certificate issue/revoke/reissue decision.

## 11.6 Reporting Context

- reporting processes may consume certificate lifecycle facts;
- report views and `MetricSnapshot` are read-only;
- reporting cannot issue, revoke, reissue, or change Certificate status;
- direct write privileges from reporting DB roles to Certificate transactional tables are prohibited.

---

# 12. Audit Architecture

## 12.1 Mandatory Audited Actions

The following actions require audit records:

| Action | Audit Required | Minimum Old/New State | Reason Required | Cross-Context Side Effect Evidence |
|---|---:|---|---:|---|
| Certificate generated | Yes | null → Generated record summary | No | completion/payment decision references; numbering outcome |
| Certificate issued | Yes | Generated → Issued | No | notification request correlation if configured |
| Certificate download by privileged admin | Configurable/Recommended | access event | No | none |
| Bulk export | Yes | export request metadata | business purpose recommended | report scope and row count |
| Reissue requested | Yes | no request → PendingReview | Yes | notification request correlation |
| Reissue approved | Yes | PendingReview → Approved | remarks per workflow policy | approval history correlation |
| Reissue rejected | Yes | PendingReview → Rejected | Yes | approval history correlation |
| Replacement generated | Yes | Approved → Completed plus new certificate link | No | new certificate ID and source certificate ID |
| Certificate revoked | Yes | current status → Revoked | Yes | notification request correlation where configured |
| Verification code regenerated | Prohibited unless formally approved | N/A | N/A | N/A |
| Soft delete / deactivate certificate-owned record | Yes | active → deleted/inactive metadata | Yes for business record | downstream projection correction correlation |
| Permission-sensitive global/consolidated export | Yes | access/export event | purpose may be required | IAM scope decision reference where supported |

## 12.2 Required Audit Attributes

Every sensitive state-change audit record must capture, directly or through the approved Audit contract:

```text
action
entityType
entityId
actorUserId or systemActorId
performedAt
branchId / effectiveScopeContext
oldValue (redacted/minimized)
newValue (redacted/minimized)
reason when required
requestId
traceId
sourceIp where policy permits
authentication/session context reference where policy permits
idempotencyKeyHash or correlation where relevant
crossContextDecisionReferences where relevant
```

## 12.3 Audit Atomicity and Failure Policy

Sensitive lifecycle commands require a defined audit-delivery guarantee.

### Required policy

1. The business transaction must not be reported as successfully completed unless the system has durably secured the required audit intent/record according to the approved modular-monolith architecture.
2. Because an external broker is not part of the approved architecture, the implementation may use one of these in-process/database-backed approaches after architecture approval:
   - same-database transaction writing Certificate mutation plus Audit-owned append contract where package boundaries permit;
   - transactional side-effect record/job table owned by infrastructure and processed in-process;
   - another approved durable mechanism that does not introduce external broker architecture.
3. Simple fire-and-forget memory callbacks are not sufficient for mandatory audit.
4. Audit persistence failure before durable acceptance must cause sensitive command failure or a clearly recoverable pending state; silent loss is prohibited.
5. Audit records are append-only from normal business application paths.

## 12.4 Cross-Context Side-Effect Audit Correlation

For each lifecycle mutation, correlate:

| Business Action | Source Decision/Side Effect | Correlation Requirement |
|---|---|---|
| Generate | Completion eligibility read | `completionId` and approved decision/version where available |
| Generate | Finance validation read | validation decision/reference when payment gate applies |
| Generate | Number allocation | allocated certificate number and numbering request correlation |
| Issue | Communication request | notification request correlation ID after commit |
| Reissue approve/reject | ApprovalRequest/ApprovalHistory | approval request/history correlation IDs |
| Replacement generation | source certificate + reissue request | source certificate ID, request ID, replacement certificate ID |
| Revoke | Communication request | notification correlation where notification is configured |
| Reports/exports | Reporting read model | actor, filters, scope, row count, export type |

---

# 13. Threat Model and Required Mitigations

| Threat | Example | Required Mitigation |
|---|---|---|
| Broken object-level authorization | User changes certificate ID to another branch's record | Scoped repository query, effective IAM scope, non-enumerating not-found behavior. |
| Broken function-level authorization | Read-only user calls revoke endpoint | Fine-grained permission checked server-side at command boundary. |
| Eligibility bypass | Client posts `completionApproved=true` | Ignore/reject client flag; call authoritative Completion port. |
| Payment bypass | Client posts `paymentCompleted=true` | Call Finance validation port where payment gate applies. |
| Certificate number collision | Concurrent generation allocates same number | Numbering transaction/lock plus unique constraint and idempotency. |
| Duplicate certificate generation | User double-clicks generate | Idempotency key, aggregate duplicate invariant, unique persistence constraint after cardinality decision. |
| Verification enumeration | Attacker loops sequential codes | High-entropy codes, rate limits, uniform invalid result, no sequential tokens. |
| QR data leakage | QR embeds learner personal details | QR contains opaque token/approved verification URL only. |
| Artifact URL leakage | Permanent public PDF URL forwarded | Private storage and short-lived signed URLs. |
| PDF injection/SSRF | Dynamic content makes renderer fetch arbitrary URL | sanitization, network restrictions, no user-supplied remote assets. |
| CSV formula injection | Student name begins with `=` | spreadsheet-safe escaping. |
| Audit tampering | Operator edits old audit record | Audit append-only permissions and no Certificate write access to Audit history. |
| Cross-context mutation | Certificate code updates CourseCompletion | repository/package boundaries, integration tests, no foreign-context write APIs. |
| Stale approval race | Reissue state changes while another approver acts | optimistic version validation and transactional transition. |
| Notification replay | Same issue event sends multiple notices | event/request dedupe key. |
| Report leakage | Consolidated export by branch-only user | separate consolidated report permission plus IAM consolidated scope. |
| Log leakage | Full verification token appears in traces | redaction/masking policy and structured logger filters. |

---

# 14. Non-Functional Requirements

## 14.1 Performance Targets

All latency targets are measured at the server boundary under normal operating load, excluding user network latency, unless stated otherwise.

| ID | Operation | Target |
|---|---|---|
| NFR-CERT-PERF-001 | Certificate registry paginated list | P95 ≤ 500 ms, P99 ≤ 1,000 ms for page size ≤ 50. |
| NFR-CERT-PERF-002 | Certificate detail query | P95 ≤ 350 ms, P99 ≤ 750 ms. |
| NFR-CERT-PERF-003 | Readiness query | P95 ≤ 750 ms, P99 ≤ 1,500 ms for page size ≤ 50, including authoritative read-port calls in-process. |
| NFR-CERT-PERF-004 | Public verification | P95 ≤ 400 ms, P99 ≤ 900 ms under normal load, excluding progressive abuse challenges. |
| NFR-CERT-PERF-005 | Certificate generation API acknowledgement | P95 ≤ 3 seconds for normal single-certificate synchronous generation where the artifact renderer completes inline. |
| NFR-CERT-PERF-006 | Certificate generation hard timeout | No request may execute unbounded; renderer/application timeout target ≤ 15 seconds per certificate before safe failure/retry semantics. |
| NFR-CERT-PERF-007 | Issue/revoke/reissue decision commands | P95 ≤ 750 ms, P99 ≤ 1,500 ms excluding external notification delivery, which is post-commit. |
| NFR-CERT-PERF-008 | Standard dashboard widgets | P95 ≤ 1.5 seconds using read models/snapshots. |
| NFR-CERT-PERF-009 | Operational report preview | P95 ≤ 3 seconds for approved filter ranges and ≤ 10,000 returned rows. |
| NFR-CERT-PERF-010 | Export request | Interactive request acknowledgement ≤ 2 seconds; file generation must follow approved in-process job pattern for large exports. |
| NFR-CERT-PERF-011 | Student certificate list | P95 ≤ 500 ms. |
| NFR-CERT-PERF-012 | Signed artifact download authorization | P95 ≤ 350 ms before storage transfer begins. |

### Performance Test Data Volumes

The module must be tested at least against:

- 1,000,000 Certificate records;
- 5,000,000 CertificateVerification attempt/log records;
- 100,000 CertificateReissueRequest records;
- 50 active branches or equivalent hierarchy depth/width;
- 10 years of certificate history;
- 500 concurrent authenticated portal sessions;
- 100 concurrent public verification requests under legitimate load;
- burst tests above expected verification traffic to validate rate limiting and graceful degradation.

These are capacity-validation targets, not an assertion of current ASTI production volume.

---

## 14.2 Availability and Reliability Targets

| ID | Capability | Target |
|---|---|---|
| NFR-CERT-AVL-001 | Authenticated Certificate module APIs | 99.9% monthly availability target, excluding approved maintenance windows. |
| NFR-CERT-AVL-002 | Public certificate verification | 99.95% monthly availability target. |
| NFR-CERT-AVL-003 | Certificate artifact download | 99.9% monthly availability target, dependent on approved private storage service. |
| NFR-CERT-AVL-004 | No silent partial lifecycle transition | 100% of state-change commands must be atomic at Certificate-owned transaction boundary. |
| NFR-CERT-AVL-005 | Mandatory audit durability | 100% of successful sensitive state transitions must have a durably accepted audit record/intent. |
| NFR-CERT-AVL-006 | Duplicate prevention | Zero successful duplicate active-certificate creations caused by retries or concurrent commands for the same governed lifecycle slot. |
| NFR-CERT-AVL-007 | Verification graceful degradation | When nonessential analytics/notification/reporting integrations fail, valid verification must continue if authoritative certificate storage is available. |
| NFR-CERT-AVL-008 | Fail-closed generation | Generation must fail when required Completion, Finance, IAM, Numbering, or artifact-integrity validation cannot be completed. |

### Dependency Failure Matrix

| Dependency Failure | Required Certificate Behavior |
|---|---|
| IAM unavailable | Fail closed for protected operations. Public verification may continue because it does not require authenticated authorization. |
| Completion decision unavailable | Do not generate certificate; return retryable dependency failure. |
| Finance validation unavailable and payment validation required | Do not generate certificate; fail closed. |
| Numbering unavailable | Do not create an unnumbered certificate; fail safely and preserve retryability. |
| Artifact storage unavailable | Do not report generation as successful unless the approved state model explicitly supports a separate safe pending-artifact state. Current baseline assumes failure/rollback. |
| Audit durability unavailable for mandatory audited mutation | Fail command or place it in an explicitly designed recoverable pending state; never silently succeed. |
| Communication unavailable | Business transaction remains committed; queue/record notification request through approved durable in-process pattern and surface operational alert. |
| Reporting projection unavailable | Transaction succeeds; reporting lag is monitored and reconciled. |

---

## 14.3 Scalability Targets

The modular monolith remains the deployment architecture. Scalability requirements must be met without introducing microservices, external brokers, CQRS, or Event Sourcing.

Required controls:

1. all list endpoints use server-side pagination;
2. default page size ≤ 25 and maximum page size ≤ 100 unless a specific API contract says lower;
3. public verification is index-backed by verification code or approved hash/index strategy;
4. registry queries are index-backed by certificate number, enrollment relation, status, issued date, course/batch/branch reporting dimensions as approved in Part 4/8;
5. verification attempt logs are written efficiently and have retention/archive planning;
6. read models/materialized views may support dashboards and reports but remain read-only;
7. horizontally scaled application instances must share idempotency/concurrency state through the database or approved shared infrastructure, not process memory;
8. renderer concurrency must be bounded to protect application memory/CPU;
9. exports must use bounded memory and streaming/chunked processing where supported;
10. no endpoint may load all certificate records into memory for filtering, sorting, or export.

### Capacity Objectives

| ID | Objective |
|---|---|
| NFR-CERT-SCL-001 | Sustain 50 certificate lifecycle command requests per second for 5-minute controlled load test without violating duplicate/integrity guarantees. |
| NFR-CERT-SCL-002 | Sustain 200 public verification requests per second for 5-minute test with rate-limit enforcement and P95 target adjusted only by documented abuse controls. |
| NFR-CERT-SCL-003 | Support at least 20 concurrent certificate-rendering operations per application deployment unit or configured bounded pool, subject to infrastructure capacity test. |
| NFR-CERT-SCL-004 | Support report reads over at least 1 million Certificate rows without transactional-table full scans for common filters. |
| NFR-CERT-SCL-005 | Allow application horizontal scaling without duplicate certificate generation or loss of mandatory audit/notification intents. |

---

## 14.4 Usability Targets

| ID | Requirement | Target |
|---|---|---|
| NFR-CERT-USA-001 | Certificate generation feedback | User sees deterministic success, validation failure, or dependency failure outcome; no ambiguous spinner after server timeout. |
| NFR-CERT-USA-002 | Validation localization | Validation messages available in English and Arabic using message keys, not hardcoded mixed-language server strings. |
| NFR-CERT-USA-003 | RTL parity | Arabic UI provides feature parity with English; action order, icon direction, pagination arrows, breadcrumbs, and alignment follow RTL rules. |
| NFR-CERT-USA-004 | Keyboard accessibility | All primary certificate operations are keyboard accessible. |
| NFR-CERT-USA-005 | Screen-reader semantics | Tables, filters, dialogs, status badges, errors, and confirmation prompts expose accessible names and state. |
| NFR-CERT-USA-006 | WCAG target | Conform to WCAG 2.2 AA for portal screens and public verification page, subject to organizational accessibility policy. |
| NFR-CERT-USA-007 | Destructive action safety | Revocation and other irreversible/high-impact actions require explicit confirmation and display target certificate number and learner/course context. |
| NFR-CERT-USA-008 | Stale-state handling | Version conflict UI explains that data changed and reloads current state instead of silently overwriting. |
| NFR-CERT-USA-009 | Empty/loading/error states | Every list and detail screen implements loading skeleton, empty state, validation state, dependency error state, and permission-safe state. |
| NFR-CERT-USA-010 | Public verification simplicity | A verifier can submit a code and receive the approved result in no more than one primary action after page load. |
| NFR-CERT-USA-011 | Mobile verification | Public verification works at viewport width 320px and above without horizontal scrolling for primary content. |
| NFR-CERT-USA-012 | Artifact language clarity | UI distinguishes interface language from certificate artifact language and does not silently regenerate certificate language. |

---

## 14.5 Maintainability and Architecture Quality Targets

| ID | Requirement |
|---|---|
| NFR-CERT-MNT-001 | Certificate domain code must not import Finance or Completion repositories directly; use explicit application ports/contracts. |
| NFR-CERT-MNT-002 | No Certificate endpoint may write foreign-context tables. |
| NFR-CERT-MNT-003 | Domain invariants are tested independently of UI components. |
| NFR-CERT-MNT-004 | Permission checks use permission codes and IAM decisions, not hardcoded role names. |
| NFR-CERT-MNT-005 | API DTOs are distinct from ORM/database models. |
| NFR-CERT-MNT-006 | Public verification DTO is distinct from internal Certificate detail DTO. |
| NFR-CERT-MNT-007 | Error codes are stable, documented, and test-covered. |
| NFR-CERT-MNT-008 | Read models are physically/logically read-only to application mutation paths. |
| NFR-CERT-MNT-009 | At least 80% branch coverage is required for Certificate domain/application-service code, with 100% coverage of critical invariants and allowed/forbidden state transitions. |
| NFR-CERT-MNT-010 | Contract tests cover every cross-context port used by generation, issuance, reissue, replacement, revocation side effects, and reporting publication. |

---

## 14.6 Observability Targets

Detailed observability configuration belongs in Part 11, but the security/NFR baseline requires:

- 100% request correlation using `requestId` and distributed/in-process `traceId` conventions;
- structured logs for all lifecycle commands;
- metrics for generation success/failure, issue, revoke, reissue, replacement, verification outcome, rate-limit action, audit failure, notification request failure, report lag, and artifact renderer failure;
- alerting on spikes in `INVALID_OR_NOT_FOUND`, rate-limit hits, duplicate-generation conflicts, audit durability failures, and renderer failures;
- no sensitive-data leakage in traces/logs;
- P95/P99 latency dashboards for registry, detail, generation, issue/revoke, public verification, dashboard, and report APIs;
- branch labels in metrics only where cardinality is controlled and privacy policy allows; never use certificate ID, verification code, user ID, or enrollment ID as metric labels.

---

# 15. Compliance and Record Management Requirements

## 15.1 Applicable Compliance Principles

The module must support the following compliance capabilities independent of the final legal retention schedule:

- auditability of issuance and revocation;
- integrity and traceability of generated documents;
- restricted access to personal data;
- purpose-limited public verification disclosure;
- retention and archival of historical certificate records;
- no untracked hard deletion;
- controlled export of personal/business records;
- traceability of management approvals for reissue;
- separation of business transaction ownership across bounded contexts.

The exact legal retention periods and Oman-specific privacy/records obligations must be confirmed by ASTI legal/compliance stakeholders. This FRD does not invent statutory retention periods that are absent from the provided source documents.

## 15.2 Retention Categories

| Record Category | Required Policy |
|---|---|
| Certificate | Long-lived business record; no hard delete through normal application flow. Retention period requires legal/business confirmation. |
| Reissue request | Retain with lineage to source and replacement certificate. |
| Verification attempt/log | Security and analytics retention period must be configured and approved; IP metadata should not be retained indefinitely without purpose. |
| Audit record | Append-only retention under Audit & Compliance policy. |
| Certificate artifact | Retain consistent with Certificate record and legal/business policy; superseded/revoked artifact handling must preserve historical evidence where required. |
| Export file | Short-lived protected storage with automatic expiry; exact lifetime configurable and approved. |

## 15.3 Data Subject/Privacy Operations

Where a lawful privacy request affects certificate data:

- Certificate Management must not independently erase authoritative education/business records when retention obligations apply;
- correction or redaction requests must follow approved business/legal process;
- public verification display can be minimized independently of retained authoritative records;
- Audit records remain governed by Audit & Compliance retention and integrity rules;
- cross-context identity correction must originate from the owning Person/Party context, with controlled downstream rendering/reissue behavior.

---

# 16. Availability, Recovery, and Data Protection Objectives

Detailed backup and runbook procedures belong in Part 11. The following NFR targets apply:

| ID | Objective | Target |
|---|---|---|
| NFR-CERT-DR-001 | Transactional certificate data RPO | ≤ 15 minutes target, subject to platform database backup/PITR capability. |
| NFR-CERT-DR-002 | Transactional certificate data RTO | ≤ 4 hours target for module restoration within platform recovery plan. |
| NFR-CERT-DR-003 | Certificate artifact RPO | ≤ 15 minutes or storage-native versioning durability equivalent. |
| NFR-CERT-DR-004 | Certificate artifact RTO | ≤ 4 hours for authenticated download restoration; public verification should continue using metadata where artifact download is not necessary. |
| NFR-CERT-DR-005 | Recovery consistency | Recovery procedures must reconcile Certificate rows, artifact references, reissue lineage, and mandatory audit correlation. |
| NFR-CERT-DR-006 | Restore testing | Certificate-owned tables and artifact linkage restoration must be tested at least quarterly in a non-production recovery exercise or according to organization-wide DR cadence if stricter. |

These targets are architecture requirements for implementation planning; they require confirmation against the actual infrastructure platform and approved organizational DR standard.

---

# 17. Security Test Requirements

## 17.1 Mandatory Automated Security Tests

The CI/test suite must include:

1. unauthenticated access rejection for all protected endpoints;
2. permission denial for each sensitive lifecycle action;
3. branch A user cannot read, mutate, download, or export branch B certificate data;
4. student cannot access another student's certificate by changing ID;
5. trainer cannot mutate certificate state;
6. consolidated reporting denied without both report permission and IAM consolidated scope;
7. client-supplied completion/payment flags cannot bypass authoritative gates;
8. duplicate generation prevented under concurrent requests;
9. stale version mutation rejected;
10. public verification responses do not leak internal IDs or private fields;
11. sequential/prefix/wildcard public verification search is unavailable;
12. renderer rejects malicious HTML/SVG/script/remote resource payloads in test fixtures;
13. CSV export neutralizes formula-injection payloads;
14. logs redact verification codes, auth tokens, signed URLs, civil IDs, and passport numbers;
15. notification failure does not roll back committed certificate state;
16. reporting projection cannot write Certificate table;
17. Certificate application service cannot write Completion or Finance tables;
18. audit failure behavior matches the mandatory durability policy;
19. signed artifact URL expires according to configured security target;
20. revoked certificate public verification returns approved revoked status, not valid status.

## 17.2 Penetration Testing Scope

Before production go-live or major verification redesign, security testing should cover:

- BOLA/IDOR across certificate, artifact, reissue, and report endpoints;
- public verification enumeration resistance;
- rate-limit bypass attempts;
- QR token predictability;
- signed URL replay/expiry behavior;
- injection into certificate renderer;
- SSRF/local-file access from renderer;
- CSV injection;
- authorization bypass via direct Server Action invocation;
- branch-scope manipulation;
- mass-assignment of lifecycle/status fields;
- concurrency race tests for issue/revoke and reissue replacement flows;
- log/trace leakage.

---

# 18. Secure Defaults and Configuration

| Configuration | Secure Default |
|---|---|
| Public artifact access | Disabled |
| Anonymous certificate list/search | Disabled |
| Public verification | Enabled only through exact opaque verification input |
| Max page size | 100 or lower endpoint-specific limit |
| Export access | Permission-controlled and scoped |
| Global data access | Denied unless explicitly granted |
| Consolidated reports | Denied unless permission + consolidated scope both pass |
| Certificate hard delete | Disabled |
| Reissue without approval | Disabled |
| Generate without completion approval | Disabled |
| Generate without payment validation when required | Disabled |
| Revocation without reason | Disabled |
| Client-controlled status field | Rejected/ignored according to request schema |
| Renderer arbitrary network access | Disabled |
| Full verification token logging | Disabled |
| Audit mutation by Certificate module | Disabled |
| Reporting write access to Certificate tables | Disabled |

---

# 19. NFR Acceptance Matrix

| Area | Acceptance Evidence |
|---|---|
| Performance | Load-test report with P50/P95/P99 latency, throughput, error rate, and tested data volume. |
| Availability | Health monitoring, SLO dashboard, dependency failure tests, and monthly availability calculation. |
| Reliability | concurrency tests, idempotency tests, transaction rollback tests, audit durability tests. |
| Scalability | 1M-record query test, public verification load test, bounded renderer concurrency test. |
| Security | automated authorization suite, branch isolation tests, SAST/dependency scan, penetration-test findings closure. |
| Usability | English/Arabic UI acceptance, keyboard navigation checks, screen-reader checks, validation-state review. |
| Accessibility | WCAG 2.2 AA audit for module screens and public verification surface. |
| Compliance | audit sample trace from business action through source decision and side-effect correlations. |
| Recovery | restore exercise demonstrating Certificate table, artifact, reissue lineage, and audit-correlation consistency. |
| DDD Conformance | architecture test proving no foreign-context repository writes and no UI-driven eligibility/payment logic. |

---

# 20. DDD Ownership and Security Fit Check

| Concern | Authoritative Owner | Certificate Module Behavior | Security/NFR Conclusion |
|---|---|---|---|
| Certificate lifecycle | Certificate Management | Owns aggregate commands and invariants | Correct |
| Completion eligibility | Exam, Result & Completion | Reads authoritative approval decision | Must fail closed; never recompute or mutate |
| Payment validation | Finance & Receivables | Reads authoritative payment gate | Must fail closed when required and unavailable |
| Enrollment linkage | Admission & Enrollment | Reads Enrollment reference and branch/course/batch linkage | Certificate must not create or alter Enrollment |
| Permissions/branch scope | IAM | Enforces decision server-side | No role-name authorization |
| Numbering | Configuration/Master Data | Requests certificate number | Cannot invent local numbering sequence |
| Audit | Audit & Compliance | Supplies durable audit intent/command | Mandatory sensitive-action coverage |
| Notification delivery | Communication | Sends NotificationRequest/intention | Delivery failure does not roll back certificate transaction |
| Reporting | Reporting & Dashboards | Publishes facts/read dependencies | Read-only projections, no transactional writes |
| Person identity | Party/Person owning context | Displays approved identity data | No duplicate identity master in Certificate context |

### DDD Core Aggregate Security Rule

The Certificate aggregate is the only business aggregate whose lifecycle is mutated by Certificate Management commands. A generation command may read Enrollment, Completion, Finance, IAM, and Numbering decisions, but it must not mutate those contexts. Issuance, reissue, replacement, and revocation likewise mutate only Certificate-owned entities plus durable cross-context side-effect requests through approved contracts.

This rule is mandatory and must be enforced by package dependencies, repository boundaries, code review, and automated architecture/integration tests.

---

# 21. Source-Model Gaps Affecting Security or NFR Design

The following known gaps remain intentionally visible:

1. **Revocation metadata gap:** DDD assigns revocation responsibility to Certificate Management, but the ER model lacks dedicated `revokedAt`, `revokedBy`, and `revocationReason` fields. Structured audit alone is not necessarily a substitute for transactional lifecycle metadata; schema resolution is required.
2. **CertificateIssueLog gap:** the DDD aggregate description includes `CertificateIssueLog`, but the ER model has no corresponding entity. Do not invent a table until ownership and persistence requirements are approved.
3. **QR representation gap:** DDD describes `CertificateQRCode`; ER stores `qrCodeUrl` on `Certificate`. Current security requirements apply to the QR payload and storage regardless of physical representation.
4. **Status enum gap:** authoritative enum values for `certificateStatus`, `verificationStatus`, and reissue request `status` are not enumerated in the ER source. State-machine names in FRD Part 2 require schema/domain confirmation.
5. **Replacement cardinality gap:** ER cardinality states Enrollment → Certificate as 1:1 while `CertificateReissueRequest.newCertificateId` implies replacement lineage and potentially multiple historical certificates per enrollment. Concurrency/uniqueness constraints must not be finalized until this is resolved.
6. **Artifact integrity metadata gap:** digest, size, renderer version, and generation timestamp are recommended security metadata but are not currently defined in the ER model.
7. **Retention period gap:** exact legal/business retention periods for certificates, verification logs, artifacts, and exports are not defined in supplied sources and require ASTI compliance/legal confirmation.
8. **Prisma validation gap:** physical database constraints, enum definitions, indexes, referential actions, and version fields remain unverified until `packages/database/prisma/schema.prisma` is supplied.

---

# 22. Final Security and NFR Confirmation

Module 11 – Certificate Management is considered security- and NFR-aligned only when all of the following are true:

- certificate mutations require authenticated fine-grained authorization;
- effective branch/self/trainer/consolidated scope is resolved and enforced server-side;
- public verification is privacy-minimized and abuse-resistant;
- certificate artifacts remain private except through approved controlled access;
- completion and payment gates are consumed from owning contexts and cannot be overridden by UI/API clients;
- generation, issuance, replacement, and other retry-prone commands preserve idempotency and concurrency safety;
- every sensitive state change has mandatory durable audit evidence;
- cross-context side effects are correlated and cannot silently disappear;
- reporting models remain strictly read-only;
- no hard delete path exists for certificate business history;
- measurable performance, availability, scalability, usability, accessibility, recovery, and compliance targets are tested before production release;
- unresolved ER/DDD/Prisma gaps are formally resolved rather than hidden through implementation assumptions.

