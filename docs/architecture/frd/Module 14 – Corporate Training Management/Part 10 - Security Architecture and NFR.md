# Part 10 - Security Architecture and NFR

## Module 14 - Corporate Training Management

## Document Control

| Field | Value |
|---|---|
| Module | Module 14 - Corporate Training Management |
| Module Code | CTM |
| Owning Bounded Context | Corporate Training Management |
| Architecture Style | Next.js monorepo modular monolith |
| Security Model | Defense in depth, dynamic RBAC, server-side scope enforcement, least privilege, auditable cross-context orchestration |
| Source Baselines | DDD Context Map v3.0; ER Model v3.0; ASTI ERP Workflow; Module 14 Overview; Parts 1-9 |
| Status | Draft for review |

---

# 1. Purpose

This document defines the module-specific security architecture and non-functional requirements for Module 14 - Corporate Training Management.

The goals are to ensure that Corporate Training data and operations remain:

- confidential;
- integrity-protected;
- branch-isolated;
- account-isolated;
- auditable;
- resilient to concurrency and replay;
- observable;
- scalable for bulk participant and enrollment workloads;
- usable in English and Arabic;
- compliant with repository-wide soft-delete and audit conventions;
- correctly bounded according to DDD ownership.

The governing principle is:

> CTM may orchestrate workflows spanning multiple bounded contexts, but it must enforce its own authorization and invariants while delegating foreign-context authorization and business rules to the owning context.

---

# 2. Security Objectives

The module must protect:

1. corporate customer master data;
2. corporate contract terms and commercial data;
3. participant identity and employment metadata;
4. account-to-participant relationships;
5. corporate enrollment linkage;
6. bulk import files and import result data;
7. sensitive cross-context read projections;
8. corporate billing coordination status;
9. reconciliation and repair operations;
10. report exports and consolidated dashboards.

The primary security objectives are:

```text
Confidentiality
Integrity
Availability
Traceability
Non-repudiation
Least Privilege
Scope Isolation
Cross-Context Boundary Preservation
```

---

# 3. Security Architecture Principles

## 3.1 Defense in Depth

Authorization must be enforced at multiple layers:

```text
UI visibility control
    ↓
Route/API authentication
    ↓
Fine-grained permission check
    ↓
Branch/account/self/assignment scope resolution
    ↓
Application-service authorization
    ↓
Aggregate lifecycle and invariant validation
    ↓
Repository predicate scoping
    ↓
Database constraints
    ↓
Audit capture
```

No single layer is sufficient.

## 3.2 Server-Side Authorization

The following are mandatory:

- client-supplied `branchId` is never trusted as authorization evidence;
- client-supplied `corporateAccountId` is never trusted as authorization evidence;
- hidden UI controls do not authorize actions;
- route guards do not replace application-service authorization;
- reporting scope and mutation scope are separate;
- consolidated reporting does not grant cross-branch mutation;
- external corporate users must be account-scoped;
- students must be self-scoped;
- trainers must be assignment-scoped.

## 3.3 Least Privilege

Permissions must be granted at the smallest practical capability level.

Examples:

```text
corporate-training.account.read
corporate-training.account.update
corporate-training.contract.status.manage
corporate-training.participant.import
corporate-training.participant.import.commit
corporate-training.enrollment.create
corporate-training.enrollment.bulk.create
corporate-training.reconciliation.repair
corporate-training.report.export
```

Read permission must never imply write permission.

## 3.4 Fail-Closed Behavior

The following failures must fail closed:

- unresolved branch/account scope;
- expired authentication session;
- missing permission;
- Finance credit validation timeout;
- ambiguous Person identity resolution;
- unknown Contract lifecycle transition;
- stale optimistic-lock version;
- inconsistent reconciliation target;
- failed dependency validation required for Enrollment creation.

---

# 4. Authentication Requirements

## 4.1 Internal Users

Internal CTM access must use the platform authentication mechanism owned by IAM.

Requirements:

- secure session or token validation on every protected request;
- short-lived access credentials according to platform policy;
- secure session invalidation after password reset or account disablement;
- MFA support where IAM policy requires it;
- no module-local password storage;
- no CTM-local credential tables.

## 4.2 External Corporate Users

External corporate access remains conditional on the future portal/authentication model.

When enabled, it must support:

- identity linked to a CorporateContact or approved external identity relation;
- explicit CorporateAccount scope;
- no branch administration privileges;
- no access to another CorporateAccount;
- revocable portal access;
- audit of login-sensitive administrative changes;
- optional stronger authentication for financial or participant export views.

## 4.3 Student and Trainer Access

- Student access must resolve to the authenticated Person/StudentProfile.
- Trainer access must resolve to TrainerProfile and assignment scope.
- Neither student nor trainer access may accept arbitrary ownership identifiers as proof of access.

---

# 5. Authorization and Scope Enforcement

## 5.1 Scope Types

| Scope | Enforcement |
|---|---|
| Branch | IAM branch assignments + parent/child policy |
| Account | Durable account assignment or approved account scope relation |
| Consolidated | Explicit consolidated permission + consolidated flag |
| External Account | Authenticated contact-to-account relation |
| Student Self | Person/StudentProfile ownership |
| Trainer Assignment | Batch/session assignment relation |

## 5.2 Repository Scoping

Repository methods must prefer scoped query signatures.

Example:

```ts
findCorporateAccountById({
  accountId,
  authorizedBranchIds,
  authorizedAccountIds,
});
```

Avoid:

```ts
findCorporateAccountById(accountId);
```

followed by an authorization check after loading sensitive data.

## 5.3 Known Scope Gap

The current ER model does not define an approved direct Account-to-Branch relation for pre-enrollment CorporateAccounts.

Security consequence:

- CTM must not infer that all unassigned CorporateAccounts are global;
- access must fail closed when scope cannot be resolved;
- production account CRUD must not proceed with insecure client-side branch filtering;
- the branch ownership model must be resolved before final production hardening.

---

# 6. Data Classification

| Data Category | Classification | Examples |
|---|---|---|
| Public/Internal | Internal | account name, course summary |
| Confidential | Confidential | contacts, participant employment metadata |
| Restricted | Restricted | Civil ID, passport-derived identifiers |
| Commercial Sensitive | Restricted | contract value, payment terms |
| Financial Sensitive | Restricted | outstanding amount, credit decision |
| Security Sensitive | Restricted | permissions, audit evidence |
| Operational Sensitive | Confidential | reconciliation exceptions, billing hold reasons |

---

# 7. Data Protection Requirements

## 7.1 Data in Transit

All production traffic must use TLS.

Requirements:

- HTTPS only;
- HSTS according to platform policy;
- no mixed-content requests;
- service-to-service calls within the modular monolith still pass through application boundaries, not raw table access;
- secrets never sent to browser logs or query parameters.

## 7.2 Data at Rest

Database and storage protection must follow platform/infrastructure policy.

Minimum expectations:

- encrypted managed storage where supported;
- encrypted backups;
- access restricted to application/infrastructure identities;
- no participant export files in public buckets;
- no long-lived public report URLs.

## 7.3 Sensitive Identifier Handling

Civil ID and passport-derived data must:

- be masked by default in UI and reports;
- require explicit sensitive-read permission;
- not appear in notification templates;
- not appear in logs;
- not be embedded into client-side analytics;
- not be included in unrestricted exports.

## 7.4 Bulk Import Files

Participant import files must:

- use approved private file storage;
- be scanned/validated according to platform file-ingestion policy;
- have content-type and size checks;
- use time-limited access;
- not be publicly addressable;
- have retention aligned to operational and compliance policy;
- not be reprocessed without idempotency protection.

---

# 8. Input Security and Injection Protection

All CTM APIs and Server Actions must:

- validate input with Zod or equivalent server-side schemas;
- reject unsupported enum values;
- validate lengths and numeric bounds;
- normalize strings;
- use parameterized queries through Prisma;
- never interpolate raw user input into SQL;
- sanitize any rich-text-like fields before rendering;
- validate export filter input;
- validate file metadata independently of filename extension.

---

# 9. API Security Requirements

## 9.1 Authentication

All CTM endpoints are authenticated except any explicitly approved public endpoint, of which none are currently defined for CTM.

## 9.2 Authorization

Each endpoint must declare:

- required permission;
- scope type;
- sensitive field policy;
- cross-context authorization requirement.

## 9.3 Idempotency

Required for:

- participant import commit;
- single Corporate Enrollment orchestration;
- bulk Corporate Enrollment orchestration;
- repair commands where retry could duplicate effects.

## 9.4 Rate Limiting

Recommended minimum protections:

| Endpoint Type | Suggested Limit |
|---|---|
| Standard reads | 120 requests/minute/user |
| Standard mutations | 60 requests/minute/user |
| Participant import upload | 10 requests/hour/user |
| Bulk enrollment submit | 20 requests/hour/user |
| Large report export | 20 requests/day/user by default |
| Reconciliation repair | low-volume, monitored |

Exact platform-wide rate limits may supersede these defaults.

## 9.5 Replay Protection

- idempotency key required for retriable create/orchestration commands;
- duplicate key + same payload returns prior result;
- duplicate key + different payload returns conflict;
- event processing must de-duplicate by event ID.

---

# 10. Cross-Context Security Boundaries

## 10.1 Organization

CTM may reference Organization data but must not mutate Organization-owned legal identity through CTM repositories.

## 10.2 Person/Party

CTM must:

- resolve Person through the owning boundary;
- reuse Person identity;
- never silently merge ambiguous identities;
- never create a duplicate shadow identity model.

## 10.3 Admission & Enrollment

CTM may orchestrate Enrollment creation but must not:

- directly insert Enrollment;
- directly update Enrollment status;
- bypass StudentProfile linking rules;
- bypass mandatory Course/Batch rules.

## 10.4 Course Catalog and Training Delivery

CTM must not:

- calculate authoritative pricing;
- alter Course publication state;
- reserve seats by editing Batch counters directly;
- bypass capacity validation.

## 10.5 Finance

CTM must not:

- calculate authoritative available credit;
- create Invoice;
- create Payment;
- create Receipt;
- create Refund;
- update Receivable.

CTM may retain approved coordination state and references.

## 10.6 Attendance, Completion, Certificate, Document

CTM may consume read projections but must not mutate source records directly.

---

# 11. Concurrency and Integrity Controls

## 11.1 Optimistic Locking

The following mutable entities must use version checks where repository conventions support them:

- CorporateAccount;
- CorporateContract;
- CorporateParticipant;
- CorporateEnrollment coordination state;
- reconciliation-repair target records.

A stale version returns:

```text
HTTP 409
CTM_CONCURRENT_MODIFICATION
```

## 11.2 Uniqueness Controls

Database-backed uniqueness should protect:

- account code;
- contract number;
- active account-person contact relationship;
- one active primary contact per account;
- active participant account-person relationship;
- employee code within account when provided;
- CorporateEnrollment linkage uniqueness according to approved schema.

## 11.3 Transaction Boundaries

Transactions must cover:

- primary contact reassignment;
- participant creation + CTM-owned relation changes;
- import chunk commit for CTM-owned rows;
- CorporateEnrollment linkage creation after owner Enrollment success;
- billing coordination transition;
- reconciliation repair.

Cross-context transactions must not rely on distributed transaction assumptions.

---

# 12. Audit Requirements

## 12.1 Mandatory Audited Actions

The following must be audited:

- CorporateAccount create/update/status/archive;
- primary contact change;
- portal-access flag change;
- CorporateContract create/update/status changes;
- CorporateParticipant create/update/status changes;
- participant import validation summary;
- participant import commit;
- single Corporate Enrollment orchestration;
- bulk Corporate Enrollment orchestration;
- CTM billing status transitions;
- reconciliation mismatch detection;
- reconciliation repair;
- sensitive report export request;
- consolidated report export;
- sensitive field access where platform policy requires it.

## 12.2 Audit Fields

Audit evidence must include:

```text
entityType
entityId
action
actorUserId
permissionCode
scopeContext
oldValue
newValue
reason
performedAt
correlationId
requestId
ipAddress, where applicable
sourceContext
targetContext, where cross-context
dependencyReference, where applicable
```

## 12.3 Cross-Context Side Effects

When CTM orchestrates a foreign-context command, audit must capture:

- initiating CTM use case;
- actor;
- CTM correlation ID;
- target context;
- target operation;
- target entity reference returned;
- success/failure;
- failure code;
- retry/idempotency reference.

Examples:

```text
CTM → Admission & Enrollment: Create Enrollment
CTM → Finance: Validate Corporate Credit
CTM → Training Delivery: Validate Batch Capacity
CTM → Communication: Request Notification
```

## 12.4 Audit Integrity

Audit logs must:

- not be editable by normal CTM users;
- not be hard-deleted through CTM;
- preserve old/new values where required;
- preserve actor and reason;
- use immutable or protected append semantics according to Audit context design.

---

# 13. Notification Security

CTM event payloads must not contain:

- full Civil ID;
- passport image or full passport data;
- passwords/tokens;
- raw payment credentials;
- private document URLs.

Notification delivery remains owned by Communication & Notification Management.

Security rules:

- templates are not embedded in CTM domain code;
- delivery failures do not roll back business state;
- event IDs prevent duplicate messages;
- recipient resolution must respect branch/account/self scope;
- external notifications use approved contact destinations only.

---

# 14. Reporting and Export Security

## 14.1 Report Access

Every report requires:

```text
Report Permission
AND
Resolved Data Scope
```

Exports additionally require:

```text
corporate-training.report.export
```

## 14.2 Consolidated Reporting

Consolidated access requires:

```text
specific report/dashboard permission
+
corporate-training.report.consolidated.read
+
canViewConsolidated = true
```

## 14.3 Export Protection

Exports must:

- use private storage;
- use time-limited download authorization;
- preserve row-level scope;
- preserve field-level masking;
- record requester and filters;
- record generation time;
- avoid including hidden columns.

---

# 15. Security Logging

Application logs must include:

```text
timestamp
level
service/module
requestId
correlationId
actorUserId
action
entityType
entityId
branchScopeSummary
accountScopeSummary
result
errorCode
dependency
durationMs
```

Logs must not include:

- full Civil ID;
- passport number;
- uploaded document contents;
- auth tokens;
- full financial account details;
- raw spreadsheet row contents unless safely redacted.

---

# 16. Threat Model Summary

| Threat | Mitigation |
|---|---|
| IDOR across Corporate Accounts | Server-side scope resolution and scoped repositories |
| Cross-branch data leak | Branch/account predicate enforcement |
| Privilege escalation | Dynamic RBAC + application-service checks |
| Menu-only authorization bypass | API authorization independent of UI |
| Duplicate enrollment on retry | Idempotency key + owner context idempotency |
| Duplicate Person identity | Delegated Person resolution |
| Credit bypass | Finance authoritative validation; fail closed |
| Batch overbooking | Authoritative capacity validation at commit boundary |
| Stale update overwrite | Optimistic locking |
| Bulk import abuse | file limits, permission split, validation-before-commit |
| PII leakage in exports | field masking and export permissions |
| Notification PII leakage | minimal payload contract |
| Read model mutation | read-only database/query policy |
| Cross-context table mutation | architecture tests and repository boundaries |
| Replay of repair command | idempotency + expected version + audit reason |

---

# 17. Performance Requirements

## 17.1 API Performance Targets

Measured at p95 under normal production load:

| Operation | Target |
|---|---:|
| Single entity read | ≤ 500 ms |
| Paginated list/search | ≤ 1.5 s |
| Standard create/update | ≤ 1.5 s |
| Contract state transition | ≤ 1.5 s |
| Participant registration | ≤ 2 s excluding external dependency outage |
| Single enrollment orchestration | ≤ 5 s |
| Bulk validation submission acknowledgement | ≤ 2 s |
| Dashboard metric widget | ≤ 1 s |
| Operational report first page | ≤ 2 s |
| Consolidated executive dashboard | ≤ 5 s |
| Export request acknowledgement | ≤ 2 s |

## 17.2 Bulk Import Performance

Targets:

- validate up to 10,000 participant rows per file;
- process in bounded chunks;
- avoid loading entire workbook into browser memory;
- provide progress/status endpoint;
- complete standard 1,000-row validation within 2 minutes under normal load;
- preserve deterministic row-level results.

## 17.3 Bulk Enrollment Performance

Targets:

- support up to 500 participants per bulk request;
- perform validation in batches;
- avoid N+1 cross-context calls;
- provide aggregate result plus row-level failures;
- exact capacity checks must remain authoritative.

---

# 18. Availability and Reliability Requirements

## 18.1 Availability Target

Recommended module target:

```text
99.9% monthly availability
```

excluding planned maintenance.

## 18.2 Graceful Degradation

Where possible:

- CTM-owned account data remains readable if Completion projection is unavailable;
- Account 360 should mark unavailable sections clearly;
- Finance-sensitive widgets may show stale timestamped values rather than fabricated data;
- critical mutation workflows must stop if mandatory validation dependencies are unavailable.

## 18.3 Dependency Failure Policy

| Dependency | Read Failure | Mutation Failure |
|---|---|---|
| Organization | show controlled unavailable | block account create |
| Person/Party | show limited fallback only if approved | block participant create |
| Course Catalog | hide/stale display | block enrollment |
| Training Delivery | stale read allowed with timestamp | block enrollment commit |
| Scheduling | stale read allowed where non-critical | block when validation mandatory |
| Finance | stale report allowed with timestamp | block credit-dependent enrollment |
| Admission & Enrollment | read unavailable state | block enrollment creation |
| Communication | business transaction remains committed | retry delivery separately |

---

# 19. Scalability Requirements

## 19.1 Expected Growth Model

Design must support growth in:

- Corporate Accounts;
- participants per account;
- contracts per account;
- enrollment history;
- bulk import volume;
- report history;
- dashboard aggregation.

## 19.2 Database Scalability

Requirements:

- indexed filters on status, account reference, contract dates, participant account relation, billing status, and created dates;
- paginated queries;
- no unbounded account 360 joins;
- reporting projections for expensive cross-context analytics;
- archive/soft-delete predicates included in indexes where appropriate.

## 19.3 Horizontal Scalability

Application services should remain stateless where practical.

Avoid:

- in-memory workflow state required for correctness;
- local filesystem dependence;
- process-local idempotency state.

## 19.4 Background Jobs

Bulk processing and exports may use existing application job infrastructure.

No external broker is required by this FRD.

---

# 20. Usability Requirements

## 20.1 Responsive UI

Admin portal screens must support:

- desktop-first operational usage;
- tablet-friendly layouts;
- responsive tables with horizontal overflow where needed;
- no loss of authorization semantics on mobile layout.

## 20.2 Form Usability

Requirements:

- inline validation;
- server error mapping to fields;
- preserved form input after recoverable failure;
- confirmation for destructive/sensitive lifecycle actions;
- reason capture dialogs where required;
- version-conflict recovery with reload/compare guidance.

## 20.3 Bulk Workflow Usability

Bulk import/enrollment screens must provide:

- upload progress;
- validation summary;
- row-level error detail;
- downloadable error file where authorized;
- clear validate versus commit phases;
- no ambiguous partial success messaging.

## 20.4 Accessibility

Target WCAG 2.1 AA practices:

- keyboard navigation;
- visible focus;
- proper labels;
- sufficient contrast;
- accessible table headers;
- screen-reader status announcements;
- no color-only status communication.

---

# 21. Bilingual and Localization Requirements

## 21.1 English

- LTR layout;
- English labels;
- localized course/account names when available.

## 21.2 Arabic

- RTL layout;
- mirrored navigation and form alignment;
- Arabic labels;
- tables adapted for RTL reading;
- numeric values remain consistently formatted;
- PDF exports preserve RTL and Unicode.

## 21.3 Timezone

Use configured Oman business timezone defaults.

Store timestamps in a consistent timezone-aware format and render according to business/user policy.

---

# 22. Compliance Requirements

## 22.1 Data Minimization

Collect only fields required for Corporate Training operations.

Do not duplicate:

- Person identity;
- Student identity;
- Finance ledger data;
- Attendance truth;
- Completion truth;
- Certificate truth.

## 22.2 Retention

Retention schedules must be defined centrally for:

- contracts;
- participant imports;
- audit logs;
- report exports;
- reconciliation evidence.

CTM must not independently hard-delete retained business records.

## 22.3 Soft Delete

No hard delete for CTM operational entities unless a repository-wide exception is explicitly approved.

Soft-delete operations must preserve:

- historical training linkage;
- auditability;
- report traceability;
- foreign references.

## 22.4 Effective Dating

Use effective dates where applicable for:

- contracts;
- account/participant lifecycle where model supports it;
- assignments once approved.

## 22.5 Oman Localization

The module must respect Oman-specific business configuration for:

- timezone;
- OMR currency display;
- tax-related report display from Finance projections;
- bilingual English/Arabic presentation.

CTM must not implement independent Oman tax invoice logic; Finance owns invoice compliance.

---

# 23. Privacy Requirements

## 23.1 Participant Data

Participant views should expose only role-necessary fields.

Examples:

- Trainer roster: minimum identity needed for delivery;
- Account Manager: participant operational fields;
- Executive dashboard: aggregated metrics;
- Auditor: authorized evidence, not unrestricted PII.

## 23.2 Masking

Default masking applies to:

- Civil ID;
- passport number;
- sensitive contact details in broad reports.

## 23.3 Export Privacy

Sensitive exports require:

- explicit permission;
- audit;
- scoped filters;
- protected storage;
- expiry of generated artifacts.

---

# 24. Observability NFRs

## 24.1 Metrics

At minimum:

```text
ctm_api_requests_total
ctm_api_request_duration_seconds
ctm_authorization_denials_total
ctm_branch_scope_denials_total
ctm_account_scope_denials_total
ctm_participant_import_rows_total
ctm_participant_import_failures_total
ctm_enrollment_orchestration_total
ctm_enrollment_orchestration_failures_total
ctm_credit_blocks_total
ctm_dependency_failures_total
ctm_reconciliation_mismatches_total
ctm_reconciliation_repairs_total
ctm_export_requests_total
```

## 24.2 Tracing

Trace boundaries should include:

```text
CTM → Organization
CTM → Person/Party
CTM → Course Catalog
CTM → Training Delivery
CTM → Scheduling
CTM → Finance
CTM → Admission & Enrollment
CTM → Communication
```

## 24.3 Alerting

Recommended alerts:

- sustained API error rate;
- enrollment orchestration failure spike;
- credit dependency timeout spike;
- participant import failure spike;
- reconciliation mismatch spike;
- export generation failure;
- permission-denial anomaly;
- branch-scope denial anomaly.

---

# 25. Availability, RTO, and RPO

Recommended targets for CTM-owned transactional data:

| Objective | Target |
|---|---|
| Availability | 99.9% monthly |
| RPO | ≤ 15 minutes |
| RTO | ≤ 4 hours |
| Backup verification | At least quarterly restore test |
| Read model rebuild | Must be rebuildable from authoritative sources |

Final backup targets may be governed by platform-wide NFRs.

---

# 26. Disaster Recovery Requirements

CTM recovery must restore:

- CorporateAccount;
- CorporateContact;
- CorporateContract;
- CorporateParticipant;
- CorporateEnrollment linkage;
- CTM import metadata/result state;
- reconciliation state;
- audit references.

Read models and materialized views may be rebuilt and must not be treated as the only copy of truth.

---

# 27. Testability Requirements

The implementation must support:

- unit tests for CTM invariants;
- application-service tests;
- API contract tests;
- authorization tests;
- branch/account isolation tests;
- idempotency tests;
- concurrency tests;
- cross-context contract tests;
- read-model immutability tests;
- audit side-effect tests;
- notification post-commit tests.

Part 9 scenarios must be automatable where technically practical.

---

# 28. NFR Acceptance Matrix

| NFR ID | Area | Requirement | Target |
|---|---|---|---|
| NFR-CTM-001 | Security | All protected APIs authenticated | 100% |
| NFR-CTM-002 | Security | All mutation APIs permission checked | 100% |
| NFR-CTM-003 | Isolation | Cross-branch leakage | 0 tolerated incidents |
| NFR-CTM-004 | Isolation | Account-scope leakage | 0 tolerated incidents |
| NFR-CTM-005 | Integrity | Direct CTM writes to Enrollment | 0 |
| NFR-CTM-006 | Performance | Single entity read p95 | ≤ 500 ms |
| NFR-CTM-007 | Performance | List/search p95 | ≤ 1.5 s |
| NFR-CTM-008 | Performance | Single enrollment orchestration p95 | ≤ 5 s |
| NFR-CTM-009 | Performance | Report first page p95 | ≤ 2 s |
| NFR-CTM-010 | Availability | Monthly availability | ≥ 99.9% |
| NFR-CTM-011 | Recovery | RPO | ≤ 15 min |
| NFR-CTM-012 | Recovery | RTO | ≤ 4 h |
| NFR-CTM-013 | Scalability | Bulk import | 10,000 rows/file |
| NFR-CTM-014 | Scalability | Bulk enrollment | 500 participants/request |
| NFR-CTM-015 | Accessibility | Admin UI target | WCAG 2.1 AA practices |
| NFR-CTM-016 | Localization | English LTR + Arabic RTL | Required |
| NFR-CTM-017 | Audit | Sensitive CTM state changes audited | 100% |
| NFR-CTM-018 | Audit | Cross-context side effects correlated | 100% |
| NFR-CTM-019 | Privacy | Sensitive identifiers masked by default | 100% |
| NFR-CTM-020 | Reporting | Read models are read-only | 100% |

---

# 29. Sensitive State Change Audit Matrix

| Action | Audit Required | Reason Required | Old/New State | Correlation ID |
|---|---:|---:|---:|---:|
| Account create | Yes | No | New | Yes |
| Account update | Yes | Conditional | Yes | Yes |
| Account status change | Yes | Yes for suspend/close | Yes | Yes |
| Account archive | Yes | Yes | Yes | Yes |
| Primary contact change | Yes | No | Yes | Yes |
| Portal access toggle | Yes | Recommended | Yes | Yes |
| Contract create | Yes | No | New | Yes |
| Contract update | Yes | Conditional | Yes | Yes |
| Contract activate | Yes | No | Yes | Yes |
| Contract suspend | Yes | Yes | Yes | Yes |
| Contract terminate | Yes | Yes | Yes | Yes |
| Participant create | Yes | No | New | Yes |
| Participant status change | Yes | Recommended | Yes | Yes |
| Import commit | Yes | No | Summary | Yes |
| Enrollment orchestration | Yes | No | Result refs | Yes |
| Billing status transition | Yes | Yes for hold/cancel | Yes | Yes |
| Reconciliation repair | Yes | Yes | Yes | Yes |
| Sensitive export | Yes | No | Filters/scope | Yes |

---

# 30. Cross-Context Side Effect Audit Matrix

| CTM Operation | Target Context | Audit Evidence Required |
|---|---|---|
| Create Account from Organization | Organization | organizationId + resolution result |
| Register Contact/Participant | Person/Party | personId + match outcome |
| Validate Course/Pricing | Course Catalog | validation/pricing reference |
| Validate Batch/Capacity | Training Delivery | batch validation reference |
| Validate Schedule | Scheduling | feasibility result reference |
| Validate Credit | Finance | decision + reference |
| Create Enrollment | Admission & Enrollment | returned enrollmentId + correlation |
| Request Notification | Communication | eventId + template/event type |
| Read Completion Status | Completion | source refresh/reference where needed |
| Read Certificate Status | Certificate | source reference |
| Read Document Compliance | Document Management | source reference |

---

# 31. Architecture Security Tests

The following architecture tests are required:

1. CTM package cannot import Enrollment repository implementation directly.
2. CTM package cannot import Finance repository implementation directly.
3. CTM package cannot write Attendance, Completion, Certificate, or Document tables directly.
4. CTM application services must depend on interfaces/application boundaries.
5. reporting views are not registered as command repositories.
6. permission checks are present for all mutations.
7. scoped repository methods are used for sensitive reads.
8. no notification provider SDK is called from CTM domain code.
9. no hard delete path exists for CTM-owned operational entities.
10. sensitive fields are excluded from default DTOs.

---

# 32. Known Security and NFR Gaps

| Gap ID | Gap | Impact |
|---|---|---|
| GAP-CTM-SEC-001 | Account-to-Branch model unresolved | Branch authorization cannot be finalized |
| GAP-CTM-SEC-002 | Account Manager assignment model unresolved | Account portfolio scope incomplete |
| GAP-CTM-SEC-003 | Corporate portal auth model not approved | External access security incomplete |
| GAP-CTM-SEC-004 | Corporate Nomination model missing | Nomination-specific permissions/audit absent |
| GAP-CTM-SEC-005 | CorporateTrainingProgram/Project missing | Project closure security/audit unavailable |
| GAP-CTM-SEC-006 | Costing ownership unresolved | Profitability access controls cannot be finalized |
| GAP-CTM-SEC-007 | Credit data write ownership overlap | Sensitive field mutation authority must be clarified |
| GAP-CTM-SEC-008 | Exact retention periods not approved | Compliance retention policy incomplete |
| GAP-CTM-SEC-009 | Exact platform MFA policy not supplied | Strong-auth requirements remain IAM-governed |
| GAP-CTM-SEC-010 | Exact SLO/error budget policy not supplied | Availability target subject to platform NFR governance |

---

# 33. Final Security Architecture Summary

The CTM security architecture is based on:

```text
Authentication
    +
Fine-Grained Permission
    +
Branch Scope
    +
Account / Assignment / Self Scope
    +
Lifecycle Guard
    +
Cross-Context Owner Validation
    +
Database Integrity Constraint
    +
Audit Correlation
```

The most important security invariants are:

1. CTM never trusts browser scope claims.
2. CTM never treats consolidated reporting access as mutation authority.
3. CTM never directly persists Enrollment or other foreign-context transactional data.
4. CTM fails closed on critical validation dependency failure.
5. sensitive identity, commercial, and Finance data are minimized and permission-protected.
6. all sensitive lifecycle changes are auditable.
7. all cross-context side effects carry correlation and target references.
8. read models and reports remain read-only.
9. retries cannot duplicate enrollment or import effects.
10. unresolved ownership gaps remain explicit and must not be bypassed with ad hoc tables or UI logic.

---

# 34. Final Audit Confirmation

The following statement is mandatory for Module 14 implementation acceptance:

> Every sensitive CTM state change and every cross-context side effect initiated by CTM must be traceable through actor identity, permission, scope, entity reference, old/new state where applicable, reason where required, timestamp, correlation ID, and target-context reference.

This includes, at minimum:

- account lifecycle changes;
- contract lifecycle changes;
- participant lifecycle changes;
- import commits;
- enrollment orchestration;
- Finance credit validation decisions consumed by CTM;
- billing coordination changes;
- reconciliation repairs;
- notification requests;
- sensitive and consolidated exports.

Failure to produce this audit trace is a production-readiness failure for Module 14.
