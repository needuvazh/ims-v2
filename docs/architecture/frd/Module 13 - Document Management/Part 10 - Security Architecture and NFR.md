# Part 10 - Security Architecture and NFR

## Module 13 – Document Management

## 1. Purpose

This document defines the security architecture and non-functional requirements for Module 13 – Document Management. It is constrained by Parts 1–9, the DDD Context Map, the ER Model, and the approved architectural decision to use Vercel Blob as the binary object store while the IMS database remains authoritative for document metadata, lifecycle state, verification history, and business ownership references.

The controls in this document protect:

- personally identifiable information contained in uploaded evidence;
- Civil ID, Passport, Visa, qualification, contract, and other compliance documents;
- document metadata and owner associations;
- immutable verification decision history;
- expiry-related compliance facts;
- short-lived file-access capabilities;
- branch isolation and owner-derived scope;
- audit evidence for sensitive state changes;
- cross-context side effects emitted from Document Management.

This Part does not change the aggregate model. The current module-owned transactional entities remain:

```text
Document
DocumentVerification
```

IAM owns identity, permissions, roles, and branch access. Audit & Compliance owns authoritative audit infrastructure. Communication & Notification owns notification delivery, retries, and delivery logs. Reporting & Dashboards owns dashboard definitions, widgets, metric snapshots, and reporting infrastructure. Owner contexts remain authoritative for Student, Trainer, Corporate Account, Person, and future Employee records.

---

# 2. Security Objectives

| ID          | Security Objective                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| SEC-DOC-001 | Prevent unauthorized access to document metadata and file binaries.                                                          |
| SEC-DOC-002 | Enforce branch isolation server-side for every list, detail, history, file-access, mutation, report, and export request.     |
| SEC-DOC-003 | Prevent privilege escalation through client-supplied owner IDs, branch IDs, lifecycle status values, or Blob references.     |
| SEC-DOC-004 | Preserve integrity and immutability of verification decision history.                                                        |
| SEC-DOC-005 | Prevent public or permanent exposure of sensitive Blob URLs.                                                                 |
| SEC-DOC-006 | Ensure every sensitive lifecycle change is attributable to an authenticated actor and produces authoritative audit evidence. |
| SEC-DOC-007 | Protect Document Management from cross-context ownership violations.                                                         |
| SEC-DOC-008 | Prevent hard deletion of authoritative document metadata and verification evidence.                                          |
| SEC-DOC-009 | Detect and recover from Blob/database consistency failures without silently losing business records.                         |
| SEC-DOC-010 | Limit the impact of compromised accounts through least privilege, capability-based authorization, and segregation of duties. |
| SEC-DOC-011 | Ensure report and consolidated-report access cannot be converted into transactional or file access.                          |
| SEC-DOC-012 | Prevent sensitive information leakage through errors, logs, traces, analytics, exports, caches, or client-side state.        |

---

# 3. Security Trust Boundaries

## 3.1 Logical trust boundaries

```text
Browser / Admin Portal / Future Self-Service Portal
        |
        | Authenticated HTTPS request
        v
Next.js Application Boundary
        |
        +--> IAM authorization and branch scope
        |
        +--> Document Management application services
        |        |
        |        +--> Document Repository
        |        +--> DocumentVerification Repository
        |        +--> Vercel Blob Adapter
        |        +--> Owner Context Read Adapters
        |        +--> Audit Side-Effect Boundary
        |        +--> Notification Event Boundary
        |
        +--> Read-only Reporting Projections

External trust boundaries:
- Browser <-> IMS
- IMS <-> Vercel Blob
- Document Management <-> IAM
- Document Management <-> Owner bounded contexts
- Document Management <-> Audit & Compliance
- Document Management <-> Communication & Notification
- Reporting <-> Document source tables/read projections
```

## 3.2 Trust assumptions

1. The browser is untrusted.
2. Request payloads, route parameters, query parameters, hidden fields, and client-side permissions are untrusted.
3. A valid user session does not imply access to a document.
4. A valid permission does not imply access outside the user's IAM branch scope.
5. A client-supplied `branchId` is a filter preference only and must never expand scope.
6. A stored Blob URL or pathname is not authorization evidence.
7. Read-only report permissions do not imply transactional read, file access, or mutation rights.
8. Cross-context owner adapters are trusted only for the contract they expose and must not grant Document Management write authority over owner aggregates.

---

# 4. Authentication Architecture

## 4.1 Authentication requirements

All non-public Document Management routes require authenticated IMS sessions.

Authentication must:

- use the repository's approved session/authentication mechanism;
- reject expired, revoked, malformed, or missing sessions;
- bind every command to the current authenticated user identity;
- never accept `performedBy`, `approvedBy`, `verifiedBy`, `uploadedBy`, `createdBy`, or equivalent actor identity from client input;
- resolve actor identity server-side;
- support session revocation according to IAM policy;
- require reauthentication or stronger session assurance for exceptionally sensitive administrative operations if the platform security policy introduces such a control.

## 4.2 Service/system authentication

Background expiry evaluation and approved reconciliation tasks must use a platform-approved service identity or internal job identity. System jobs must not impersonate a human user.

System-generated changes must be attributable using:

```text
actorType = SYSTEM
actorId = approved job/service identity
correlationId = job execution correlation ID
```

Human verification decisions must never be recorded as SYSTEM actions.

---

# 5. Authorization Architecture

## 5.1 Authorization composition

An action is authorized only when all applicable checks succeed:

```text
Authenticated Session
AND Required Fine-Grained Permission
AND Owner/Document Resolution
AND Server-Derived Branch Scope
AND Lifecycle Guard
AND Entity State Guard
AND Concurrency Guard where required
```

Menu visibility is not authorization.

Report access is not document transaction access.

## 5.2 Canonical action permissions

The canonical action permissions defined by Part 6 are:

```text
document.read
document.create
document.update
document.verify.submit
document.verify.read
document.verify.approve
document.verify.reject
document.history.read
document.file.read
document.expiry.read
document.retire
document.operations.reconcile
document.owner.search
document.audit.read
```

No alternative alias such as `document.submit_verification` may be introduced as an independent permission.

## 5.3 Direct-object authorization

Every direct-ID operation must apply authorization after resolving the current authoritative record and before returning metadata or performing a command.

Protected examples:

- `GET /api/documents/{documentId}`
- `PATCH /api/documents/{documentId}`
- submit, approve, reject, retire commands;
- verification history retrieval;
- file-access issuance;
- reconciliation retry.

The service must not trust a route ID merely because it was obtained from a previously rendered page.

## 5.4 Non-disclosure behavior

For security-sensitive direct-ID reads, the application may normalize both absent and inaccessible records to the same `404 DOC_NOT_FOUND` response where repository policy requires existence non-disclosure.

The response must not disclose:

- owner name;
- owner type;
- branch;
- file name;
- verification status;
- whether the record exists in another branch.

---

# 6. Branch Isolation Security

## 6.1 Server-side scope derivation

Document branch scope is derived through the owner relationship, because the current ER baseline does not define `Document.branchId`.

```text
Document.ownerType + Document.ownerId
        |
        v
Approved owner-context adapter/read model
        |
        v
Authoritative owner branch scope
        |
        v
IAM UserBranchAccess evaluation
        |
        +--> assigned branch
        +--> child branches when canViewChildBranches permits
        +--> consolidated reports only when canViewConsolidated permits
```

## 6.2 Mandatory branch isolation controls

The following must be branch scoped server-side:

- document registry queries;
- document detail;
- metadata update;
- submit for verification;
- verification queue;
- approve/reject;
- history;
- file access;
- expiry workbench;
- retirement;
- owner search;
- operational reports;
- exports;
- KPI aggregation.

## 6.3 Consolidated access

Consolidated reports require:

```text
relevant document.report.* permission
AND document.report.consolidated
AND IAM.canViewConsolidated = true
```

Consolidated export additionally requires:

```text
document.report.consolidated.export
```

Consolidated access must never grant:

- `document.file.read`;
- `document.update`;
- `document.verify.approve`;
- `document.verify.reject`;
- `document.retire`;
- transaction-level access outside ordinary branch authorization.

## 6.4 Branch-scope failure behavior

Branch-scope failures must:

- fail closed;
- avoid fallback to unrestricted queries;
- avoid returning global totals;
- avoid leaking inaccessible records through pagination counts, faceted filters, charts, exports, or empty-state text;
- emit a security telemetry event without logging sensitive document content.

---

# 7. Vercel Blob Security Architecture

## 7.1 Storage role

Vercel Blob is the approved binary storage infrastructure. It does not own:

- document lifecycle state;
- verification status;
- owner validity;
- branch authorization;
- expiry semantics;
- verification history;
- audit authority.

The IMS database is authoritative for document metadata and business lifecycle state.

## 7.2 Upload security

Controlled upload must follow this sequence:

```text
1. Authenticate actor
2. Validate request schema
3. Check document.create or approved self-service policy
4. Resolve owner and authoritative branch scope
5. Validate document type and metadata rules
6. Issue narrowly scoped, short-lived upload capability
7. Upload binary
8. Register Document metadata
9. Confirm Blob reference is valid according to adapter contract
10. Record audit/operational evidence
```

Upload capability controls must include:

- short expiration;
- bounded allowed content type(s);
- maximum file size;
- server-generated or server-approved pathname strategy;
- no arbitrary overwrite of existing object paths;
- no ability to enumerate unrelated objects;
- one-purpose capability where supported;
- correlation with upload intent/registration request.

## 7.3 File access security

Document DTOs must not expose permanent public Blob access URLs for protected content.

File access must be mediated by:

- permission and branch checks;
- self-identity binding for future self-service portals;
- short-lived signed/controlled access response, or server-mediated proxy streaming;
- cache-control headers appropriate for sensitive private content;
- content-disposition policy based on preview/download intent;
- explicit MIME type and content-sniffing protections.

Recommended browser headers for proxied sensitive file responses:

```text
X-Content-Type-Options: nosniff
Content-Security-Policy: sandbox; default-src 'none'
Referrer-Policy: no-referrer
Cache-Control: private, no-store
```

Exact header applicability depends on whether the response is proxied or redirected through a time-limited signed access mechanism.

## 7.4 File type and content controls

The application must enforce an approved document media allow-list. At minimum, validation must distinguish claimed MIME type from trusted server/storage metadata.

The module should support the project's approved malware scanning strategy before a file is treated as safe for routine preview or downstream consumption. Because malware scanning architecture is not defined in the DDD/ER baseline, implementation must not invent a new domain entity; scanning state, if needed, requires an architecture decision and schema ownership decision.

## 7.5 Blob pathname privacy

Blob object paths must not contain unnecessary sensitive data such as:

- Civil ID;
- passport number;
- visa number;
- full personal name;
- phone number;
- email address.

Prefer opaque identifiers such as:

```text
documents/{documentId-or-upload-correlation-id}/{opaque-file-name}
```

## 7.6 Blob/database consistency

The following consistency failures must be detectable:

- Blob exists but Document registration failed;
- Document metadata exists but Blob is missing;
- Blob access fails due to infrastructure error;
- duplicate registration attempt;
- reconciliation retry repeatedly fails.

The system must never silently mark a document as valid because a Blob upload succeeded while database registration failed.

Reconciliation operations must be restricted to `document.operations.reconcile` with global/system scope.

---

# 8. Data Protection and Privacy Controls

## 8.1 Data classification

| Data                            | Classification                         | Protection Requirement                                                     |
| ------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| Document binary                 | Sensitive/Restricted depending on type | Private access, least privilege, no public indexing                        |
| Civil ID/Passport/Visa evidence | Restricted PII                         | Strong access control, audit access where policy requires, no log exposure |
| Document metadata               | Confidential business/personal data    | Branch scope, permission scope, encrypted transport                        |
| Verification decision           | Sensitive business record              | Integrity protection, immutable history, audit                             |
| Verification remarks            | Confidential                           | Permission restricted, sanitized display, no analytics leakage             |
| Blob operational metadata       | Internal operational data              | Restricted operations access                                               |
| KPI aggregates                  | Internal/confidential                  | Report permission and branch/consolidated scope                            |

## 8.2 Encryption

Required controls:

- TLS for all client-to-IMS and IMS-to-storage communication;
- database encryption at rest according to platform/database policy;
- storage encryption at rest according to the approved Blob service configuration;
- secrets stored only in approved platform secret management/environment facilities;
- no secrets in source control, client bundles, logs, or browser storage.

## 8.3 Sensitive data minimization

The Document table must store only the metadata required by the ER/domain model and approved operational needs. Do not copy owner PII into Document records merely to simplify reporting.

Read models may denormalize non-sensitive display attributes only when:

- the reporting purpose requires them;
- branch scope is preserved;
- the source remains authoritative elsewhere;
- the projection is read-only and rebuildable.

## 8.4 Logging redaction

Logs and traces must not contain:

- Blob access tokens;
- signed access URLs;
- raw document contents;
- base64 file payloads;
- passwords or session tokens;
- Civil ID/passport/visa numbers;
- full verification remarks unless explicitly approved for secure audit evidence;
- authorization headers.

Safe structured identifiers include:

```text
documentId
ownerType
ownerId (subject to logging policy)
actorId
correlationId
permissionCode
operation
result
errorCode
branchScopeResolutionResult
```

---

# 9. Input, Output, and Web Security Controls

## 9.1 Input validation

All API inputs must pass the Part 7 validation architecture:

1. transport/schema validation;
2. authentication/authorization;
3. scope/reference validation;
4. domain validation;
5. infrastructure consistency validation.

Server-side validation is mandatory even when UI validation exists.

## 9.2 Injection and unsafe rendering

Requirements:

- parameterized database access through repository/ORM conventions;
- no dynamic SQL from client filters;
- escape/sanitize user-supplied metadata and remarks when rendered;
- no HTML execution from file names, descriptions, rejection remarks, or imported labels;
- protect CSV/XLSX exports from spreadsheet formula injection by escaping cells beginning with formula-significant characters according to export library policy.

## 9.3 CSRF and request origin controls

State-changing Server Actions/Route Handlers must use the framework's approved CSRF/origin protections. Cookie-authenticated mutations must not accept cross-origin state changes without trusted origin validation and anti-CSRF mechanisms where required by the application architecture.

## 9.4 Security headers

The Admin Portal must use platform-wide security headers, including an appropriate Content Security Policy, clickjacking defense, MIME sniffing prevention, and referrer policy.

Document previews must not weaken the parent portal's security posture.

---

# 10. Lifecycle Integrity Controls

## 10.1 Allowed lifecycle

The approved verification lifecycle remains:

```text
Uploaded
   |
   v
PendingVerification
   |             |
   v             v
Approved      Rejected
```

`Expired` remains an unresolved persisted-versus-derived semantic from earlier Parts and must not be implemented in a way that creates conflicting transition behavior until the architecture decision is approved.

## 10.2 State-transition security

Lifecycle state changes must only occur through dedicated application commands.

Generic metadata PATCH must not update:

- `verificationStatus`;
- verifier identity;
- verification timestamp;
- retirement audit fields;
- immutable verification history.

## 10.3 Approval/rejection transaction integrity

Approval and rejection require an atomic transaction containing:

```text
Validate current state
Validate branch scope
Validate required permission
Validate optimistic version
Insert immutable DocumentVerification record
Update current Document verification summary/status
Increment version
Commit
Emit/record required audit fact
Emit notification-trigger fact after successful commit
```

If authoritative audit capture is implemented transactionally in the same database boundary, the transaction must fail when mandatory audit persistence fails. If audit is implemented through a separate approved side-effect mechanism, the platform architecture must guarantee durable delivery and reconciliation; silent loss is prohibited.

## 10.4 Verification history immutability

`DocumentVerification` must be append-only for ordinary business operations.

The application must not provide ordinary UI/API operations to:

- update past verification decisions;
- delete verification decisions;
- rewrite actor identity;
- rewrite decision timestamp;
- replace rejection remarks.

Corrections require a separately approved compliance process and architecture decision if ever introduced.

---

# 11. Soft Delete, Retention, and Destruction

## 11.1 Soft retirement

No hard delete operation is allowed through Document Management application APIs.

Retirement must:

- check `document.retire`;
- enforce branch scope;
- set the repository-standard soft-delete fields;
- preserve verification history;
- preserve audit evidence;
- prevent ordinary list/search results from returning retired records;
- prevent routine file access unless a specific compliance/audit policy permits it.

## 11.2 Binary retention gap

The ER/DDD baseline does not define the exact retention/destruction policy for Blob binaries after soft retirement. Therefore:

- metadata must not be hard deleted merely to remove a Blob;
- Blob destruction must not be automated until retention requirements are approved;
- legal/compliance retention rules must be confirmed before implementing binary purge jobs;
- the final solution must preserve traceability between retired metadata and any authorized binary destruction event.

This remains an architecture/compliance gap.

---

# 12. Segregation of Duties

## 12.1 Recommended separation

Where staffing permits, separate:

- upload/metadata maintenance;
- verification approval/rejection;
- retirement;
- reconciliation operations;
- consolidated reporting administration.

## 12.2 Minimum control rules

1. Possession of `document.create` does not imply `document.verify.approve`.
2. Possession of `document.verify.read` does not imply approve/reject.
3. Possession of report permissions does not imply file access.
4. Possession of consolidated report permission does not imply branch transaction rights.
5. Reconciliation operators must not receive document verification rights merely because they administer storage consistency.
6. IAM role assignment changes must be audited by IAM/Audit, not by Document Management.

A strict rule preventing a verifier from approving a document they uploaded is not explicitly defined in the DDD/ER baseline. It may be introduced only as an approved business rule, not silently assumed.

---

# 13. Audit Architecture

## 13.1 Authoritative audit ownership

Audit & Compliance owns the authoritative `AuditLog`, approval history infrastructure, and platform-wide compliance evidence.

Document Management must produce sufficient audit facts for sensitive operations, but must not create a parallel local `DocumentAuditLog` table.

## 13.2 Mandatory audit events

The following operations require audit evidence:

| Operation                                  |                                       Audit Required | Minimum Audit Content                                                                         |
| ------------------------------------------ | ---------------------------------------------------: | --------------------------------------------------------------------------------------------- |
| Document registered                        |                                                  Yes | document ID, owner reference, document type, actor, timestamp, branch scope result            |
| Metadata changed                           |                                                  Yes | entity ID, changed fields, old values, new values, actor, timestamp, version                  |
| Submitted for verification                 |                                                  Yes | old/new state, actor, timestamp                                                               |
| Approved                                   |                                                  Yes | old/new state, verification decision ID, actor, timestamp                                     |
| Rejected                                   |                                                  Yes | old/new state, decision ID, actor, timestamp, reason/remarks according to secure audit policy |
| File access issued                         |                    Security audit/telemetry required | document ID, actor, purpose/mode, timestamp, result; never access token/URL                   |
| Document retired                           |                                                  Yes | actor, reason where policy requires, old/new soft-delete state, timestamp                     |
| Reconciliation retry                       |                                                  Yes | item/reference, actor/system identity, action, attempt result, timestamp                      |
| Reconciliation override/manual resolution  |                                Yes, high sensitivity | before/after state, reason, actor, timestamp                                                  |
| Bulk/report export                         | Access audit required where platform policy requires | report code, scope, actor, row count, format, timestamp                                       |
| Cross-context notification trigger emitted |                        Correlation evidence required | source event ID, document ID, event type, correlation ID                                      |

## 13.3 Audit minimum fields

Where applicable, authoritative audit evidence must capture:

```text
entityType
entityId
action
oldValue
newValue
performedBy
performedAt
ipAddress
reason
correlationId / requestId where supported
```

This aligns with the ER `AuditLog` concept. Security logs may include additional operational fields, but they do not replace authoritative audit records.

## 13.4 Audit integrity requirements

- Audit evidence must not be editable through Document Management APIs.
- Sensitive state change success must not be reported to the client before the authoritative transaction has committed.
- Required audit capture failures must be observable and must not be silently ignored.
- Correlation IDs must link request logs, domain action, audit side effect, and notification side effect where applicable.
- Audit records must preserve actor identity even after the user's role assignment changes.

---

# 14. Cross-Context Side-Effect Audit Requirements

## 14.1 Side-effect ownership model

```text
Document Management command succeeds
        |
        +--> Document transaction committed
        |
        +--> Audit fact delivered to Audit & Compliance
        |
        +--> Notification-trigger fact delivered to Communication
        |
        +--> Reporting projection updated asynchronously or on refresh
```

## 14.2 Rules

1. Document Management owns the truth that a document was approved, rejected, expired/expiring according to approved expiry semantics, or retired.
2. Communication owns recipient resolution, template selection, provider delivery, retries, and delivery status.
3. Reporting owns read projections, dashboard definitions, snapshots, and aggregates.
4. Owner contexts may consume approved document facts but must not mutate Document state directly.
5. Cross-context consumers must be idempotent where side-effect delivery may repeat.
6. Correlation and source event identifiers must support duplicate detection and traceability.
7. Failure of a non-critical notification delivery must not roll back an already committed document verification decision.
8. Failure to publish or durably record a required cross-context side-effect must be visible to operations and recoverable according to the platform side-effect architecture.
9. Document Management must not mark notification delivery status on `Document`.
10. Reporting projection lag must never change transactional authorization or lifecycle decisions.

---

# 15. Threat Model Summary

| Threat                              | Example                                        | Required Mitigation                                                                 |
| ----------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| Broken object-level authorization   | Guess another branch's document ID             | Direct-ID branch scope and permission checks                                        |
| Broken function-level authorization | User calls approve endpoint without capability | Fine-grained server permission guard                                                |
| Branch data leakage                 | BR-A user sees BR-B totals                     | Scope filters applied before rows/counts/aggregates                                 |
| Malicious upload                    | Executable or malformed file                   | Media allow-list, size limit, scanning strategy, safe preview                       |
| Public file exposure                | Permanent Blob URL exposed                     | Controlled short-lived access/proxy                                                 |
| Token leakage                       | Signed access URL in logs                      | Redaction, no token logging, short TTL                                              |
| Metadata tampering                  | PATCH sets status to Approved                  | Command-specific state transitions; reject protected fields                         |
| Race condition                      | Two verifiers approve simultaneously           | Optimistic locking plus atomic transaction                                          |
| History tampering                   | Edit prior rejection decision                  | Append-only verification history                                                    |
| Orphan object                       | Upload succeeds, DB write fails                | Registration idempotency and reconciliation                                         |
| Missing object                      | DB references missing Blob                     | Runtime detection and reconciliation workflow                                       |
| CSV injection                       | File name starts with formula character        | Export escaping/sanitization                                                        |
| XSS                                 | Malicious file name or remarks                 | Contextual escaping and safe rendering                                              |
| Excessive export                    | Large consolidated extraction                  | Export authorization, limits, audit, asynchronous execution if architecture permits |
| Report privilege escalation         | Consolidated permission used to access file    | Separate report and file permissions                                                |
| Cross-context write leakage         | Admission code updates Document table directly | Application service boundary and repository ownership controls                      |

---

# 16. Non-Functional Requirements Overview

The targets below are production requirements for normal operating conditions unless the infrastructure architecture defines stricter project-wide targets. Measurements must use server-side telemetry and exclude client network latency where explicitly stated.

---

# 17. Performance Requirements

## 17.1 API latency targets

| NFR ID           | Operation                                      | Target                                                                      |
| ---------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| NFR-DOC-PERF-001 | Metadata list/detail APIs                      | p95 <= 500 ms, p99 <= 1,200 ms for normal branch-scoped queries             |
| NFR-DOC-PERF-002 | Metadata mutation APIs excluding Blob transfer | p95 <= 750 ms, p99 <= 1,500 ms                                              |
| NFR-DOC-PERF-003 | Submit/approve/reject commands                 | p95 <= 1,000 ms, p99 <= 2,000 ms, excluding external notification delivery  |
| NFR-DOC-PERF-004 | Verification queue and expiry workbench        | p95 <= 800 ms for standard filtered pages of <= 100 rows                    |
| NFR-DOC-PERF-005 | Secure file-access authorization               | p95 <= 500 ms excluding binary transfer time                                |
| NFR-DOC-PERF-006 | Branch operational report query                | p95 <= 3 s for standard filters over 12 months of retained operational data |
| NFR-DOC-PERF-007 | Consolidated dashboard initial data load       | p95 <= 5 s using approved read models/snapshots                             |
| NFR-DOC-PERF-008 | Typeahead owner search                         | p95 <= 500 ms after debounce for bounded result sets                        |

## 17.2 Upload/download performance

Binary transfer time is primarily dependent on file size, client bandwidth, region, and Blob service behavior. Therefore:

- metadata API latency must be measured separately from Blob transfer latency;
- UI must show upload progress when supported;
- upload timeout must be sized according to configured maximum document size;
- large file processing must not hold a database transaction open while the client uploads binary content;
- file access authorization must complete before protected access is granted.

## 17.3 Query efficiency requirements

- All registry, verification queue, and expiry queries must be paginated.
- Default page size: 25.
- Allowed page sizes: 25, 50, 100 unless a stricter platform standard exists.
- Unbounded list endpoints are prohibited.
- Sorting must be limited to indexed or approved queryable columns.
- Filters must be applied server-side.
- Count queries must use the same branch-scope predicate as row queries.
- Read models must be used for heavy analytical aggregation where justified; transactional command behavior must continue using authoritative tables.

---

# 18. Availability and Reliability Requirements

| NFR ID          | Requirement                                                    | Target                                                                                                                                        |
| --------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-DOC-AVL-001 | Document metadata read/write application availability          | >= 99.9% monthly, excluding approved maintenance windows                                                                                      |
| NFR-DOC-AVL-002 | No acknowledged lost verification decisions                    | 0 tolerated                                                                                                                                   |
| NFR-DOC-AVL-003 | No acknowledged hard deletion through normal application paths | 0 tolerated                                                                                                                                   |
| NFR-DOC-AVL-004 | Verification transaction atomicity                             | 100%: current state and history either both commit or both roll back                                                                          |
| NFR-DOC-AVL-005 | Blob/database inconsistency detection                          | Detect operationally observable inconsistency within 15 minutes of scheduled reconciliation or immediately on failed access/registration path |
| NFR-DOC-AVL-006 | Background expiry evaluation                                   | Complete at least once per business day using Oman business date/time basis                                                                   |
| NFR-DOC-AVL-007 | Failed notification delivery                                   | Must not roll back committed document state; failure remains recoverable in Communication context                                             |
| NFR-DOC-AVL-008 | Reporting projection outage                                    | Must not block core document commands or authoritative reads needed for business operations                                                   |

## 18.1 Degraded-mode behavior

### Blob service unavailable

- metadata searches and history reads may remain available;
- new upload intent creation should fail with a structured retryable infrastructure error;
- file access should fail safely without exposing fallback public paths;
- metadata approval/rejection should continue only if the verification process can meet policy without accessing the file; otherwise the UI must prevent decision completion and surface a clear operational error.

### Reporting projection unavailable

- reports/dashboard widgets may show a service-unavailable state;
- transactional APIs remain authoritative and must continue independently;
- the application must not fall back to an unsafe unrestricted query.

### Owner adapter unavailable

- operations requiring owner existence/branch resolution must fail closed;
- previously authorized cached scope must not be used beyond approved cache validity;
- commands must not proceed with unknown branch scope.

---

# 19. Scalability Requirements

## 19.1 Horizontal scalability

Document Management application services should remain stateless between requests except for platform-approved sessions and durable persistence.

The design must support horizontal application scaling without:

- in-memory authorization state as source of truth;
- node-local upload registration state;
- node-local reconciliation truth;
- node-local lifecycle locks.

## 19.2 Database scalability

Required design principles:

- index fields used in lifecycle queues, owner lookup, expiry filtering, soft-delete filtering, and version checks;
- avoid full table scans for routine operational screens;
- archive/read-model strategies may be introduced for analytics without moving transaction ownership;
- verification history must support indexed lookup by `documentId` and chronological ordering;
- expiry queries must efficiently filter by `expiryDate`, active/non-deleted status, and resolved scope.

## 19.3 Volume targets

The module should be load tested at minimum against the following design envelope unless project sizing provides higher values:

```text
1,000,000 Document metadata rows
3,000,000 DocumentVerification history rows
500 concurrent authenticated portal users
100 concurrent active upload registrations
50 concurrent verification decision commands
100,000 rows in a branch-scoped export selection before asynchronous export architecture is required
```

These are engineering validation targets, not predictions of ASTI business volume.

## 19.4 Concurrency

- `version` optimistic locking must reject stale updates.
- Concurrent approve/reject commands for the same pending document must produce exactly one successful terminal decision.
- Duplicate registration requests must be idempotent according to the approved registration key/correlation strategy.
- Reconciliation retry must be safe against duplicate execution.

---

# 20. Usability and Accessibility Requirements

## 20.1 Usability targets

| NFR ID          | Requirement                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| NFR-DOC-USA-001 | Core upload, view, submit, approve/reject, and expiry workflows must be usable without exposing technical Blob terminology to ordinary business users. |
| NFR-DOC-USA-002 | Validation failures must identify the affected field and provide actionable guidance without exposing internal stack traces.                           |
| NFR-DOC-USA-003 | Long-running upload and export operations must show progress or clear processing state where supported.                                                |
| NFR-DOC-USA-004 | Destructive retirement action must require explicit confirmation and clearly state that the record is retained as soft-deleted.                        |
| NFR-DOC-USA-005 | Verification screens must show document metadata, owner summary, file preview/download action, and verification history relevant to the decision.      |
| NFR-DOC-USA-006 | Permission-hidden actions must not leave dead controls or imply that the user can complete an unavailable operation.                                   |
| NFR-DOC-USA-007 | Empty states must distinguish no data from no matching filters and from unauthorized content.                                                          |

## 20.2 Accessibility

Target WCAG 2.2 AA for Document Management screens.

At minimum:

- keyboard navigation for all actions;
- visible focus state;
- accessible labels and error associations;
- status not communicated by color alone;
- screen-reader announcements for validation and upload state changes;
- logical focus after modal confirmation/closure;
- table headers and sortable-column state exposed semantically;
- accessible alternatives for preview where browser rendering is unavailable.

---

# 21. Localization and Oman Time Requirements

## 21.1 Language layout

The module must support:

- English LTR;
- Arabic RTL;
- localized labels where provided by owning Configuration/reference data;
- bidirectional-safe rendering of IDs, file names, document numbers, URLs, and codes.

## 21.2 Time and business-date basis

Operational business dates, expiry evaluation, daily scheduled jobs, and date-only UI interpretation must use the institute's configured Oman timezone default. The DDD/ER baseline expects institute timezone configuration; implementation should use the configured institute value, with Oman deployment default expected to be `Asia/Muscat`.

Requirements:

- persist timestamps in the repository-standard UTC format;
- render user-facing timestamps in configured institute/user presentation timezone;
- evaluate date-only expiry boundaries using configured business date, not browser local timezone;
- ensure the same expiry boundary is used by API, jobs, reports, and UI.

---

# 22. Compliance Requirements

## 22.1 General compliance controls

Document Management must support organizational compliance by ensuring:

- sensitive access is permission and branch scoped;
- verification evidence is traceable;
- state changes are auditable;
- records are soft deleted rather than hard deleted;
- retention/destruction behavior follows approved policy;
- data minimization is applied;
- reports and exports enforce the same scope as on-screen views;
- file binaries are not publicly discoverable;
- personal data is not unnecessarily duplicated between bounded contexts.

## 22.2 Retention policy requirement

Exact statutory and organizational retention periods for specific Oman document categories are not defined in the DDD/ER inputs. They must be approved before implementing automated purge/destruction.

The FRD therefore requires configurable or policy-driven retention architecture but does not invent legal retention durations.

## 22.3 Audit retention

Audit evidence retention must follow the platform Audit & Compliance policy and must not be shortened by Document soft retirement or Blob deletion.

---

# 23. Observability Requirements Relevant to Security and NFR

Detailed observability implementation belongs in Part 11, but Part 10 requires the following minimum signals.

## 23.1 Security metrics

Track at minimum:

```text
document_authorization_denied_total
document_branch_scope_denied_total
document_direct_id_nondisclosure_total
document_file_access_granted_total
document_file_access_denied_total
document_verification_conflict_total
document_upload_intent_failed_total
document_blob_registration_inconsistency_total
document_reconciliation_retry_failed_total
document_audit_side_effect_failed_total
document_notification_side_effect_failed_total
```

Metrics must not include sensitive file names or personal identifiers as high-cardinality labels.

## 23.2 Required tracing boundaries

Trace spans should cover:

```text
HTTP/Server Action
  -> Authentication/authorization guard
  -> Branch scope resolution
  -> Owner context adapter call
  -> Document application service
  -> Database transaction
  -> Blob adapter call when applicable
  -> Audit side-effect boundary
  -> Notification side-effect boundary
```

Trace attributes must be redacted according to Section 8.4.

---

# 24. Rate Limiting and Abuse Protection

Rate limits must be centrally configurable and may be stricter than the baseline below.

Recommended baseline protections:

| Operation            | Baseline Protection                                                                   |
| -------------------- | ------------------------------------------------------------------------------------- |
| Upload intent        | Per-user and per-IP throttling; burst controls                                        |
| Owner search         | Debounce plus per-user rate limit                                                     |
| File access issuance | Per-user throttling and security telemetry                                            |
| Approve/reject       | Per-user mutation rate protection; do not rely on rate limit instead of authorization |
| Consolidated export  | Concurrent-job limit and export size controls                                         |
| Reconciliation retry | Restricted permission plus low operational rate limit and idempotency                 |

Rate-limit responses must use structured `429` errors and must not expose infrastructure internals.

---

# 25. Backup, Recovery, and Data Integrity NFR

Detailed runbooks belong in Part 11. Security/NFR requirements are:

- `Document` and `DocumentVerification` must be included in database backup and recovery scope.
- Recovery procedures must preserve referential relationships between document current state and verification history.
- Recovery testing must verify soft-delete fields, version values, owner references, and history completeness.
- Blob recovery/deletion behavior must be aligned with Vercel Blob capabilities and the approved retention policy.
- Database recovery must not automatically assume Blob consistency; post-restore reconciliation is required.

Recommended targets subject to platform-wide architecture confirmation:

```text
RPO <= 15 minutes for authoritative database records
RTO <= 4 hours for core Document Management transactional capability
```

If platform architecture defines stricter targets, the stricter targets take precedence.

---

# 26. Security Testing Requirements

## 26.1 Mandatory automated tests

The release pipeline must include tests for:

- permission denial for every sensitive endpoint;
- cross-branch direct-ID access denial;
- cross-branch list/count/filter leakage prevention;
- consolidated report composition rules;
- inability to mutate state through metadata PATCH;
- exactly-one terminal decision under concurrent approve/reject;
- immutable verification history;
- soft-delete behavior;
- inaccessible file authorization;
- expired/invalid upload capability;
- malformed MIME/file metadata;
- oversized upload rejection;
- idempotent registration behavior;
- Blob/database inconsistency handling;
- audit side-effect behavior;
- notification failure not rolling back committed decision;
- report/read-model inability to mutate authoritative tables.

## 26.2 Security verification activities

Before production release, perform:

- dependency vulnerability scanning;
- secret scanning;
- static application security testing;
- API authorization tests;
- OWASP-style web/API security testing;
- file upload abuse testing;
- export formula-injection testing;
- security header verification;
- penetration testing according to project release policy.

---

# 27. NFR Acceptance Matrix

| Category                     | Target                                                | Verification Method                    |
| ---------------------------- | ----------------------------------------------------- | -------------------------------------- |
| Metadata API latency         | p95 <= 500 ms reads; p95 <= 750 ms ordinary mutations | APM/load test                          |
| Verification command latency | p95 <= 1 s excluding notification delivery            | APM/load test                          |
| Operational queue latency    | p95 <= 800 ms for <=100-row page                      | Load test                              |
| Branch report latency        | p95 <= 3 s standard 12-month filter                   | Report performance test                |
| Consolidated dashboard       | p95 <= 5 s initial data                               | Dashboard load test                    |
| Availability                 | >=99.9% monthly                                       | Availability monitoring                |
| Verification atomicity       | 100% all-or-nothing                                   | Transaction integration tests          |
| Lost acknowledged decisions  | 0 tolerated                                           | Audit/reconciliation test              |
| Hard delete through app      | 0 tolerated                                           | API and DB policy tests                |
| Accessibility                | WCAG 2.2 AA target                                    | Automated + manual accessibility audit |
| Branch leakage               | 0 tolerated                                           | BDD/API/penetration tests              |
| Audit coverage               | 100% of mandatory sensitive actions                   | Audit integration test                 |
| Expiry evaluation            | At least daily                                        | Scheduled job telemetry                |
| RPO                          | <=15 minutes recommended                              | Restore drill                          |
| RTO                          | <=4 hours recommended                                 | Recovery drill                         |

---

# 28. Cross-Context Security Responsibility Matrix

| Security Concern                 | Document Management Responsibility                              | Owning/Collaborating Context                             |
| -------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| Authentication                   | Require authenticated identity; never trust client actor fields | IAM                                                      |
| Permission evaluation            | Declare/check document permissions                              | IAM owns grants/roles                                    |
| Branch scope                     | Enforce scope on document operations                            | IAM provides access; owner contexts resolve owner scope  |
| Owner validity                   | Request authoritative validation                                | Admission & Enrollment, Trainer, Corporate, Person/Party |
| Document type validity           | Consume active type semantics                                   | Configuration / Master Data                              |
| Verification lifecycle           | Own and enforce                                                 | Document Management                                      |
| Verification history             | Own immutable business history                                  | Document Management                                      |
| Audit evidence infrastructure    | Emit/provide audit facts                                        | Audit & Compliance                                       |
| Notifications                    | Emit trigger facts only                                         | Communication & Notification                             |
| Reports/dashboards               | Provide source facts/read projection support                    | Reporting & Dashboards                                   |
| Binary storage                   | Access through approved adapter                                 | Vercel Blob infrastructure                               |
| Certificate issuance eligibility | Do not decide                                                   | Certificate + Completion/Finance rules                   |
| Enrollment/admission decision    | Do not decide                                                   | Admission & Enrollment                                   |
| Trainer assignability            | Do not decide                                                   | Trainer/Scheduling contexts                              |

---

# 29. DDD and ER Consistency Check

| Check                                     | Result                        | Notes                                                                           |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| Document metadata ownership               | Aligned                       | Document Management owns Document.                                              |
| Verification history ownership            | Aligned                       | DocumentVerification remains module-owned and append-only.                      |
| IAM ownership                             | Aligned                       | No local role, permission, or branch ACL tables introduced.                     |
| Owner context ownership                   | Aligned                       | Owner existence/status and branch derivation are delegated.                     |
| Audit ownership                           | Aligned                       | No local duplicate AuditLog introduced.                                         |
| Communication ownership                   | Aligned                       | Module emits trigger facts; Communication owns delivery.                        |
| Reporting ownership                       | Aligned                       | Read models are read-only and non-authoritative.                                |
| Soft-delete convention                    | Aligned                       | No hard delete application behavior.                                            |
| Blob storage architecture                 | Aligned with project decision | Binary storage separated from domain ownership.                                 |
| Certificate/Finance/Completion boundaries | Aligned                       | Document approval does not itself authorize certificate issuance or completion. |

---

# 30. Open Security and NFR Gaps

The following items remain unresolved and must not be silently invented during implementation:

1. **Prisma schema validation** – final field/index/constraint alignment must be checked against the actual repository schema.
2. **Generic Person branch resolution** – an approved rule is still required before Person-owned documents can be safely authorized across branches.
3. **Persisted vs derived `Expired` semantics** – one authoritative model must be selected before state-based security/reporting logic is finalized.
4. **Document type persistence model** – scalar versus FK/master-data representation remains unresolved.
5. **Malware scanning architecture** – scanning provider, quarantine state, and ownership are not defined in the source DDD/ER documents.
6. **Blob retention/destruction policy** – retention durations and authorized purge behavior require compliance approval.
7. **Reconciliation persistence ownership** – durable representation of reconciliation incidents still requires architecture ownership confirmation.
8. **Rejected document resubmission** – workflow and security implications remain undefined.
9. **Approved evidence replacement chain** – replacement/version linkage is not defined.
10. **Verification SLA configuration** – operational target configuration ownership must be confirmed.
11. **Exact platform-wide RPO/RTO** – Part 10 provides recommended module targets; final values must align with the architecture/NFR baseline.
12. **Self-service portal security activation** – Student and Trainer portal contracts remain future/conditional and require final identity-binding policy before enablement.

---

# 31. Final Security Architecture Statement

Module 13 must be implemented as a secure Document Management bounded context in which:

```text
Vercel Blob owns binary storage mechanics
        !=
Document Management owns document business truth
```

The authoritative security chain is:

```text
Authentication
    -> Fine-grained permission
    -> Server-derived owner/branch scope
    -> Domain lifecycle validation
    -> Optimistic concurrency validation
    -> Atomic transaction
    -> Immutable verification evidence
    -> Authoritative audit evidence
    -> Recoverable cross-context side effects
```

No UI state, Blob pathname, permanent URL, client-supplied branch ID, report permission, or cross-context caller may bypass this chain.

Sensitive state changes—especially submission, approval, rejection, metadata correction, retirement, and reconciliation intervention—must be attributable, auditable, branch scoped, permission controlled, and recoverable. Cross-context side effects must preserve ownership: Audit & Compliance records authoritative audit evidence, Communication & Notification owns delivery processing, Reporting owns read-only analytical projections, and owner bounded contexts remain authoritative for the people and organizations to which documents are attached.

This Part is consistent with Parts 1–9 and does not introduce new aggregates, lifecycle transitions, role-name authorization, hard delete behavior, or cross-context ownership changes.
