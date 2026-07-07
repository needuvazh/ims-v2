# Part 11 - Deployment, Operations, Observability, Runbooks

## Module 13 – Document Management

---

## 1. Purpose

This document defines the production deployment, operational support, observability, health-check, backup/recovery, and troubleshooting requirements for Module 13 – Document Management.

It is the final operational FRD part for the module and must be read together with Parts 1–10. It does not introduce new business aggregates, lifecycle states, permissions, or cross-context ownership. Its purpose is to make the already-defined behavior supportable in production.

The operational boundary remains:

```text
Document Management bounded context
│
├── Document
│      authoritative current document metadata and lifecycle state
│
└── DocumentVerification
       authoritative immutable verification decision history
```

External and cross-context dependencies used by the module are:

```text
IAM / UserBranchAccess                  authentication, permission and scope
Owner contexts                          Student / Trainer / Corporate / Person resolution
Configuration / Master Data             document type validation where configured
Vercel Blob                             binary object storage
Audit & Compliance                      authoritative audit evidence
Communication & Notification            notification delivery, retry and delivery logs
Reporting & Executive Dashboards        read-only reports, dashboards, snapshots
Organization Management                 branch hierarchy reference
```

The application remains a modular monolith. This document does not propose microservices, an external broker, CQRS, or Event Sourcing.

---

# 2. Operational Objectives

| ID | Objective |
|---|---|
| OPS-DOC-001 | Detect failures in document metadata operations, verification transitions, file access, Blob registration, expiry evaluation, and reporting projections. |
| OPS-DOC-002 | Preserve correlation from inbound request through application service, database transaction, Blob operation, audit side effect, and notification side effect. |
| OPS-DOC-003 | Ensure branch-scope failures fail closed and are observable without leaking protected data. |
| OPS-DOC-004 | Protect the integrity of `Document` and `DocumentVerification` during deployment, backup, restore, and recovery. |
| OPS-DOC-005 | Detect Blob/database divergence and provide safe operator runbooks without inventing a new domain owner. |
| OPS-DOC-006 | Provide measurable service health using logs, traces, metrics, SLO indicators, and synthetic checks. |
| OPS-DOC-007 | Support reproducible diagnosis of authorization, lifecycle, concurrency, storage, notification, and reporting failures. |
| OPS-DOC-008 | Prevent operational tools from bypassing application-service ownership or directly mutating immutable verification history. |
| OPS-DOC-009 | Keep reporting/read-model failures isolated from transactional document commands. |
| OPS-DOC-010 | Preserve DDD and ER alignment after deployment and through operational changes. |

---

# 3. Deployment Architecture

## 3.1 Logical deployment view

```text
Browser
   |
   | HTTPS
   v
ASTI IMS Next.js Admin Portal / Route Handlers / Server Actions
   |
   +--> IAM authorization and branch-scope resolution
   |
   +--> Document Management Application Services
   |       |
   |       +--> Document Repository
   |       +--> DocumentVerification Repository
   |       +--> Owner Context Read Adapters
   |       +--> Vercel Blob Adapter
   |       +--> Audit Boundary
   |       +--> Notification Trigger Boundary
   |
   +--> Read-only Reporting Views / Projections

Infrastructure
   |
   +--> PostgreSQL / repository-standard relational database
   +--> Vercel Blob
   +--> Platform logging, tracing and metrics
   +--> Scheduled job runner for expiry evaluation and approved operational jobs
```

## 3.2 Deployment unit rule

Module 13 is deployed as part of the ASTI IMS modular monolith. Deployment must preserve package boundaries, but it is not independently deployed as a microservice unless the architecture is changed by an explicit decision outside this FRD.

Recommended monorepo boundary:

```text
packages/documents or equivalent approved package
   domain/
   application/
   infrastructure/
   presentation/
```

The physical package name must follow the repository's real structure. This FRD does not override the existing monorepo layout.

## 3.3 Environment separation

At minimum, use separate configuration and credentials for:

- local development;
- test/CI;
- staging/UAT;
- production.

Production Vercel Blob credentials, database credentials, signing secrets, and service-job credentials must not be shared with non-production environments.

No environment may point simultaneously to production database state and non-production Blob storage, or vice versa.

## 3.4 Required runtime configuration

The deployment must provide the repository-approved equivalents of:

```text
DATABASE_URL or platform database connection configuration
BLOB_READ_WRITE_TOKEN or equivalent approved Vercel Blob credential
APPLICATION_BASE_URL
AUTH / SESSION configuration
DEFAULT_TIMEZONE = Asia/Muscat
DEFAULT_LOCALE / supported locale configuration
DOCUMENT_MAX_FILE_SIZE
DOCUMENT_ALLOWED_MIME_TYPES
DOCUMENT_FILE_ACCESS_TTL
DOCUMENT_EXPIRY_WARNING_WINDOWS
OBSERVABILITY_EXPORTER configuration
LOG_LEVEL
SERVICE / APPLICATION VERSION metadata
```

Configuration names above are conceptual. Exact environment-variable names must match the repository convention.

Secrets must never be exposed to client-side bundles.

## 3.5 Deployment sequence

A normal release containing Module 13 changes should follow this order:

```text
1. Validate schema compatibility and migration plan
2. Validate configuration and secret presence
3. Run automated tests
4. Apply backward-compatible database migration
5. Deploy application code
6. Run smoke checks
7. Validate health checks and telemetry
8. Validate scheduled jobs
9. Validate Blob access through controlled application flow
10. Observe error, latency and lifecycle-transition metrics
11. Complete release verification
```

For breaking schema changes, use expand-and-contract migration principles:

```text
Expand schema
   -> deploy compatible readers/writers
   -> backfill if needed
   -> verify
   -> switch reads/writes
   -> remove obsolete structure in later release
```

Verification history must never be rewritten or truncated as part of an ordinary migration.

---

# 4. Deployment Gates and Release Readiness

A production deployment must not proceed when any mandatory gate fails.

| Gate | Requirement | Blocking? |
|---|---|---:|
| Database migration validation | Migration applies successfully to production-like schema copy | Yes |
| Rollback/forward-fix plan | Documented for schema and application changes | Yes |
| Unit tests | Domain and validation tests pass | Yes |
| Integration tests | Repository, transaction, IAM adapter, owner adapter and Blob adapter tests pass | Yes |
| BDD regression | Minimum suite from Part 9 passes | Yes |
| Authorization tests | Direct-ID and branch-isolation cases pass | Yes |
| Concurrency tests | Simultaneous approve/reject race tests pass | Yes |
| Security checks | No high/critical unresolved release-blocking findings | Yes |
| Blob smoke test | Upload intent, upload, registration and controlled file access pass | Yes |
| Telemetry validation | Logs, traces and metrics visible with release version | Yes |
| Scheduled-job validation | Expiry evaluator can execute in target environment | Yes |
| Reporting isolation check | Reporting outage does not break command path | Yes |

---

# 5. Observability Architecture

## 5.1 Observability principles

Module 13 must use three complementary telemetry types:

```text
Structured Logs
        +
Distributed / application tracing
        +
Metrics
        =
Operational visibility
```

No one telemetry source replaces the others.

Operational telemetry does not replace authoritative `AuditLog` evidence.

## 5.2 Correlation model

Every inbound request or scheduled job execution must have a correlation identifier.

Minimum correlation chain:

```text
requestId / correlationId
        |
        +--> route or Server Action log
        +--> application service span
        +--> repository/database span
        +--> owner-context adapter span
        +--> Blob adapter span
        +--> audit side-effect correlation
        +--> notification event correlation
        +--> reconciliation operation correlation
```

A verification decision should be traceable using at least:

```text
correlationId
requestId
traceId
spanId
actorId
operation
entityType = Document
entityId = documentId
verificationDecisionId when committed
result
errorCode when failed
applicationVersion
```

Sensitive binary data, signed URLs, tokens, and full PII must not be included.

---

# 6. Structured Logging Specification

## 6.1 Log format

Logs must be structured JSON or the platform's equivalent structured format.

Recommended shape:

```json
{
  "timestamp": "2026-07-07T12:00:00.000Z",
  "level": "INFO",
  "service": "asti-ims",
  "module": "document-management",
  "environment": "production",
  "applicationVersion": "<release-version>",
  "requestId": "<request-id>",
  "correlationId": "<correlation-id>",
  "traceId": "<trace-id>",
  "spanId": "<span-id>",
  "operation": "document.verify.approve",
  "documentId": "<uuid>",
  "ownerType": "Student",
  "actorId": "<user-id>",
  "permissionCode": "document.verify.approve",
  "branchScopeResult": "ALLOWED",
  "result": "SUCCESS",
  "durationMs": 184,
  "errorCode": null
}
```

## 6.2 Mandatory log fields

| Field | Required | Notes |
|---|---:|---|
| `timestamp` | Yes | UTC timestamp in telemetry; business dates rendered in `Asia/Muscat` where required |
| `level` | Yes | DEBUG/INFO/WARN/ERROR/FATAL or platform equivalent |
| `service` | Yes | ASTI IMS service/application identifier |
| `module` | Yes | `document-management` |
| `environment` | Yes | dev/test/staging/production |
| `applicationVersion` | Yes | Release or commit identifier |
| `operation` | Yes | Stable operation name |
| `requestId` | Request paths | Unique per inbound request |
| `correlationId` | Yes | Propagated across side effects |
| `traceId` | When tracing enabled | Trace linkage |
| `actorId` | Human commands | Server-derived user ID |
| `actorType` | Jobs/system operations | HUMAN or SYSTEM |
| `documentId` | Document operations | Where known |
| `result` | Yes | SUCCESS/FAILURE/DENIED/CONFLICT/DEGRADED |
| `errorCode` | Failure | Part 7 canonical code where applicable |
| `durationMs` | Timed operation | End-to-end operation duration |

## 6.3 Operation naming

Recommended stable operation names:

```text
document.upload.intent.create
document.register
document.list
document.detail.read
document.metadata.update
document.verify.submit
document.verify.queue.read
document.verify.approve
document.verify.reject
document.verification.history.read
document.file.access.issue
document.expiry.workbench.read
document.expiry.evaluate
document.retire
document.reconcile.scan
document.reconcile.retry
document.owner.resolve
document.report.query
document.report.export
```

## 6.4 Log levels

| Condition | Level |
|---|---|
| Normal successful request | INFO |
| Expected validation failure | INFO or WARN according to platform policy |
| Authorization denial | WARN with security telemetry classification |
| Optimistic concurrency conflict | WARN |
| Blob/database divergence | ERROR |
| Database transaction failure | ERROR |
| Audit side-effect loss risk | ERROR/FATAL according to architecture severity |
| Repeated reconciliation failure | ERROR |
| Health dependency unavailable | WARN or ERROR depending on impact |
| Security control bypass suspicion | ERROR with security alert route |

## 6.5 Forbidden log content

Do not log:

- document binary content;
- base64 payloads;
- Vercel Blob tokens;
- signed or time-limited access URLs;
- session cookies;
- authorization headers;
- passwords;
- Civil ID, passport number, visa number;
- full verification remarks unless specifically stored in authoritative audit under approved policy;
- complete owner profile payloads;
- full exported report content.

---

# 7. Tracing Boundaries

## 7.1 Trace root boundaries

Create a root span for:

- each API request;
- each Server Action invocation;
- each scheduled expiry job execution;
- each reconciliation scan/retry execution;
- each report/export request.

## 7.2 Recommended spans

A document approval trace should resemble:

```text
HTTP POST /api/documents/{id}/approve
└── document.verify.approve
    ├── iam.permission.check
    ├── document.load
    ├── owner.branch.resolve
    ├── iam.branch.scope.evaluate
    ├── document.lifecycle.guard
    ├── document.version.guard
    ├── db.transaction.verify-decision
    │   ├── documentVerification.insert
    │   └── document.update-status
    ├── audit.fact.publish-or-record
    └── notification.trigger.publish-or-record
```

A registration trace should resemble:

```text
document.register
├── iam.permission.check
├── owner.resolve
├── owner.branch.resolve
├── document.type.validate
├── blob.reference.validate
├── db.transaction.document.insert
├── audit.fact.publish-or-record
└── notification.trigger.publish-or-record when applicable
```

A file access trace should resemble:

```text
document.file.access.issue
├── document.load
├── iam.permission.check
├── owner.branch.resolve
├── iam.branch.scope.evaluate
├── blob.access.prepare
└── security.access.telemetry
```

## 7.3 Trace attributes

Safe attributes include:

```text
module.name
document.operation
document.id
owner.type
permission.code
branch.scope.result
verification.from_status
verification.to_status
result
error.code
job.name
job.run_id
report.code
export.format
```

Do not attach:

- binary content;
- signed Blob URLs;
- tokens;
- owner PII;
- unredacted remarks.

## 7.4 Trace sampling

Recommended policy:

- 100% sampling for ERROR traces;
- 100% sampling for approve/reject/retire/reconciliation operations where volume permits;
- higher sampling for authorization-denial and branch-scope failures;
- normal adaptive sampling for high-volume reads;
- never rely only on traces for authoritative audit evidence.

---

# 8. Metrics Instrumentation

## 8.1 Metrics naming principles

Metrics should use stable, low-cardinality labels.

Do not use `documentId`, `ownerId`, `actorId`, file name, or raw error text as metric labels.

Recommended prefix:

```text
asti_document_*
```

## 8.2 Request and command metrics

| Metric | Type | Suggested Labels | Purpose |
|---|---|---|---|
| `asti_document_requests_total` | Counter | operation, result, error_code_class | Request volume and failures |
| `asti_document_request_duration_ms` | Histogram | operation, result | Latency SLO measurement |
| `asti_document_verification_transitions_total` | Counter | from_status, to_status, result | Lifecycle health |
| `asti_document_concurrency_conflicts_total` | Counter | operation | Detect approval/update races |
| `asti_document_authorization_denied_total` | Counter | operation, reason_class | Security monitoring |
| `asti_document_branch_scope_failure_total` | Counter | operation, failure_class | Scope resolution reliability/security |

## 8.3 Blob/storage metrics

| Metric | Type | Labels | Purpose |
|---|---|---|---|
| `asti_document_blob_operation_total` | Counter | operation, result | Upload/access/reference-validation behavior |
| `asti_document_blob_operation_duration_ms` | Histogram | operation, result | Storage latency |
| `asti_document_blob_reference_missing_total` | Counter | detection_source | DB points to missing Blob |
| `asti_document_orphan_blob_detected_total` | Counter | detection_source | Blob exists with failed/no registration |
| `asti_document_reconciliation_attempt_total` | Counter | action, result | Reconciliation execution |
| `asti_document_reconciliation_pending` | Gauge | issue_type | Outstanding unresolved inconsistencies |

## 8.4 Verification and expiry metrics

| Metric | Type | Labels | Purpose |
|---|---|---|---|
| `asti_document_verification_queue_depth` | Gauge | branch_scope_class | Pending verification backlog |
| `asti_document_verification_oldest_age_seconds` | Gauge | branch_scope_class | Backlog aging |
| `asti_document_verification_turnaround_seconds` | Histogram | decision | Verification performance |
| `asti_document_expiring_soon_count` | Gauge | warning_window_days | Upcoming expiry volume |
| `asti_document_expired_count` | Gauge | scope_class | Expired volume according to approved semantics |
| `asti_document_expiry_job_runs_total` | Counter | result | Scheduled evaluation health |
| `asti_document_expiry_job_duration_seconds` | Histogram | result | Job performance |
| `asti_document_expiry_job_last_success_timestamp` | Gauge | none | Freshness monitor |

## 8.5 Side-effect and reporting metrics

| Metric | Type | Labels | Purpose |
|---|---|---|---|
| `asti_document_audit_side_effect_total` | Counter | event_type, result | Detect audit integration failures |
| `asti_document_notification_trigger_total` | Counter | event_type, result | Trigger reliability; not delivery status |
| `asti_document_reporting_projection_lag_seconds` | Gauge | projection | Read-model freshness |
| `asti_document_report_query_duration_ms` | Histogram | report_code, scope_class | Report performance |
| `asti_document_report_export_total` | Counter | report_code, format, result | Export operations |

## 8.6 Availability indicators

Track at minimum:

```text
successful request rate
metadata API latency
verification command success rate
Blob adapter availability
owner-context resolver availability
database transaction error rate
expiry job freshness
reconciliation backlog
report projection freshness
```

---

# 9. Alerting Requirements

Alert thresholds should be tuned from production baselines. Initial rules should include:

| Alert | Initial Trigger | Severity | First Response |
|---|---|---|---|
| Document API high error rate | >5% server errors for 10 min | High | Check DB, auth, owner adapters and release health |
| Verification command failure spike | >2% system failures for 10 min | High | Inspect transaction, concurrency and audit integration |
| Database unavailable | Health check fail >2 consecutive probes | Critical | Activate DB incident runbook |
| Blob operations unavailable | High error rate or dependency probe fail | High | Degrade upload/file access; preserve metadata reads |
| Missing Blob references detected | >0 new confirmed missing references | High | Run missing Blob runbook |
| Orphan Blob backlog increasing | Growth over 2 consecutive scans | Medium/High | Run orphan Blob runbook |
| Expiry job stale | No successful run within 26 hours | High | Run expiry job runbook |
| Verification backlog oldest age breached | Above approved SLA threshold | Medium/High | Operational workload escalation |
| Branch-scope resolver failures spike | > agreed threshold | High | Fail closed and investigate owner adapter/IAM |
| Audit side-effect failure | Any unrecovered mandatory failure | Critical | Run audit side-effect runbook |
| Reporting projection lag | Above approved freshness SLA | Medium | Run projection lag runbook |
| Concurrency conflict spike | Sudden sustained increase | Medium | Investigate client retry behavior or operational contention |
| Authorization denial anomaly | Significant baseline deviation | Security | Security investigation |

Alert notifications must not include sensitive document metadata or file URLs.

---

# 10. Health Checks

## 10.1 Health endpoint categories

The application should expose platform-standard equivalents of:

```text
/livez      process liveness
/readyz     readiness for request handling
/health     dependency summary where permitted
```

Exact routes depend on platform convention.

## 10.2 Liveness check

Liveness confirms only that the application process/runtime is functioning.

It should not fail merely because Vercel Blob or Reporting is unavailable; otherwise a dependency outage may create restart loops.

## 10.3 Readiness check

Readiness for Document Management command traffic should verify critical dependencies:

| Dependency | Readiness Critical? | Failure Behavior |
|---|---:|---|
| Primary database | Yes | Not ready |
| Authentication/IAM core path | Yes for authenticated functionality | Fail closed / not ready according to platform boundary |
| Owner-scope resolver path | Yes for scoped document commands | Fail closed; document commands unavailable |
| Vercel Blob | Conditional | Upload/file-access degraded; metadata operations may remain ready |
| Audit durable capture path | Yes for operations requiring mandatory audit | Sensitive mutation path unavailable if durability cannot be guaranteed |
| Communication delivery provider | No | Commands remain available; trigger/delivery recovery handled by Communication |
| Reporting projection store | No | Transaction paths remain available; reporting degraded |

## 10.4 Deep health checks

A scheduled or operator-only deep check may verify:

- database read/write probe in a dedicated operational table or approved health mechanism;
- repository query against `Document` without exposing content;
- owner adapter resolution for a controlled synthetic reference where supported;
- Vercel Blob API reachability using a safe metadata operation;
- expiry job freshness;
- reporting projection freshness;
- reconciliation backlog age.

Deep health checks must not create uncontrolled business records.

## 10.5 Synthetic transaction checks

In staging and, where policy permits, production with dedicated synthetic data:

```text
Create controlled upload intent
Upload harmless synthetic file
Register document for synthetic owner
Read metadata
Request controlled file access
Submit for verification
Approve or reject with synthetic authorized actor
Verify history exists
Verify audit correlation exists
Retire synthetic document according to test policy
```

Synthetic records must be clearly tagged by approved test-data policy and must not pollute operational reports.

---

# 11. Scheduled and Background Operations

## 11.1 Expiry evaluation job

Purpose:

- identify documents reaching configured warning windows;
- identify expired documents according to the approved persisted/derived expiry decision;
- emit idempotent expiry notification triggers;
- update approved read models or state only according to the final expiry architecture decision.

Operational requirements:

```text
Frequency: at least once per business day
Business timezone: Asia/Muscat
Idempotency: mandatory
Overlap prevention: mandatory
Last-success metric: mandatory
Run correlation ID: mandatory
Batch/pagination: mandatory
No unbounded full-table load into memory
```

The job must not invent a new lifecycle transition until the `Expired` semantic gap is resolved.

## 11.2 Reconciliation job

A reconciliation process may be used only after architecture approval for its persistence and operating model.

It may detect:

- Blob exists but document registration is absent;
- Document references Blob object that is missing;
- repeated Blob access failures;
- unresolved prior registration attempts.

It must not:

- auto-approve documents;
- mutate verification history;
- infer owner changes;
- delete Blob objects without approved retention policy;
- create a new domain aggregate silently.

## 11.3 Reporting projection refresh

Read models are explicitly read-only and rebuildable.

Refresh operation requirements:

- do not lock authoritative transaction tables for long periods;
- preserve branch-scope attributes required for reporting filters;
- expose freshness timestamp;
- be restartable/idempotent;
- support rebuild from authoritative data;
- never become a command source.

---

# 12. Backup Scope

## 12.1 Authoritative database scope

Module 13-owned tables requiring backup are:

```text
Document
DocumentVerification
```

Their exact physical table names must match the implemented schema.

The backup strategy must also account for referenced audit and side-effect evidence in their owning contexts according to project-wide backup policy, but Module 13 does not own those tables.

## 12.2 Binary storage scope

Vercel Blob contains document binary objects and must be treated as a separate recovery dependency from the relational database.

A successful database restore does not prove that all referenced binaries are available.

A successful Blob recovery or continued Blob availability does not prove that all business metadata and lifecycle history are available.

Recovery therefore requires integrity validation across both systems.

## 12.3 Backup principles

1. Use project-approved managed database backup/PITR capability.
2. Back up the complete database consistently; do not depend only on ad-hoc table exports.
3. Verify that `Document` and `DocumentVerification` are included in restore testing.
4. Preserve referential consistency between `DocumentVerification.documentId` and `Document.id`.
5. Never restore verification history without the matching Document records.
6. Do not restore Module 13 tables into production independently when cross-context references would become inconsistent.
7. Protect backup access using least privilege and encryption.
8. Perform periodic restoration tests.
9. Document RPO and RTO using project-wide approved values; Part 10 identifies final RPO/RTO as an unresolved project-level decision.
10. Validate Blob references after restore.

---

# 13. Backup and Recovery Procedure for Owned Tables

## 13.1 Normal backup verification

Operational checklist:

```text
1. Confirm database backup/PITR job success.
2. Confirm backup age within approved policy.
3. Confirm restore test schedule is current.
4. Confirm schema version included in backup metadata.
5. Confirm `Document` row count can be measured.
6. Confirm `DocumentVerification` row count can be measured.
7. Confirm no verification history orphan count exists.
8. Confirm recent verification decision samples are represented in backup window according to RPO.
9. Confirm backup encryption and access policy.
10. Record backup verification evidence in operations records.
```

## 13.2 Restore procedure – non-production validation

```text
1. Provision isolated restore environment.
2. Restore database snapshot/PITR point.
3. Apply no write traffic during integrity validation.
4. Confirm application schema version compatibility.
5. Validate Document row count and soft-delete distribution.
6. Validate DocumentVerification row count.
7. Run orphan-history check:
      every DocumentVerification.documentId must resolve to Document.id.
8. Validate lifecycle consistency:
      current Document summary/state agrees with latest immutable decision where applicable.
9. Validate required audit correlation through Audit-owned records where available.
10. Sample Blob references and verify object accessibility through the storage adapter.
11. Run controlled branch-isolation queries.
12. Run read-only report projection rebuild test.
13. Run application smoke tests.
14. Record restore duration and integrity results.
```

## 13.3 Production recovery procedure

Only authorized incident/recovery personnel may execute this procedure.

```text
1. Declare incident and assign incident commander.
2. Freeze or restrict writes when required to prevent divergence.
3. Determine recovery point consistent with approved RPO.
4. Preserve incident evidence and current state before destructive recovery actions.
5. Restore the database using platform-approved method.
6. Deploy application version compatible with restored schema.
7. Keep external write paths blocked until integrity checks pass.
8. Validate Document and DocumentVerification referential integrity.
9. Validate recent lifecycle transition consistency.
10. Validate IAM and owner-reference compatibility.
11. Validate Blob references using sampled and automated integrity checks.
12. Identify orphan Blob objects created after restored DB recovery point.
13. Identify DB references whose Blob object cannot be accessed.
14. Reconcile cross-context side effects according to source event/audit correlation.
15. Rebuild read-only projections.
16. Re-enable read traffic.
17. Re-enable write traffic after authorization and transaction smoke tests pass.
18. Monitor error rates, reconciliation backlog and audit correlation.
19. Complete incident review and corrective actions.
```

## 13.4 Point-in-time recovery caution

Restoring the database to an earlier point can create:

```text
Blob uploaded after recovery point
        +
DB registration lost by PITR
        =
Potential orphan Blob
```

or:

```text
DB references existing at recovery point
        +
Blob object deleted outside approved policy
        =
Missing binary reference
```

Both conditions require reconciliation. No operator may infer approval or delete evidence solely to make counts match.

---

# 14. Data Integrity Checks

The following queries/checks must exist as safe operator diagnostics using repository-approved SQL or administration tooling.

## 14.1 Orphan verification history

Expected result: zero.

```text
DocumentVerification where documentId has no matching Document.id
```

## 14.2 Invalid date ranges

Expected result: zero.

```text
expiryDate < issueDate
where both dates are non-null
```

## 14.3 Invalid current status values

Expected result: zero values outside approved enum/check constraints.

## 14.4 Verification summary mismatch

Detect documents whose current verification summary is inconsistent with immutable history according to the approved current-state synchronization rule.

This check must respect the unresolved `Expired` semantic and must not falsely classify derived expiry as verification corruption.

## 14.5 Soft-delete consistency

Check repository-specific invariant between:

```text
deletedAt
isActive
```

where both fields exist.

## 14.6 Blob reference integrity

Check in controlled batches:

```text
Document.fileUrl/reference
        -> Vercel Blob adapter metadata/access validation
```

Do not expose the resulting access URL in operator logs.

---

# 15. Operational Access and Privileged Procedures

## 15.1 Principle

Operational access must use least privilege.

Production support access does not automatically grant:

- document verification approval;
- rejection rights;
- file content access;
- consolidated reporting;
- database write access.

## 15.2 Database access

Direct database write access should be restricted to emergency procedures approved by the platform and compliance policy.

Normal correction must go through application services.

Direct edits to `DocumentVerification` are prohibited for ordinary operations.

## 15.3 Reconciliation permission

Reconciliation actions require:

```text
document.operations.reconcile
```

and the approved global/system scope.

This permission does not grant verification or file-access permission.

## 15.4 Break-glass operation

If the project supports break-glass access, it must:

- be time-bound;
- require strong authentication;
- require explicit reason;
- be fully audited;
- notify security/compliance operators;
- be reviewed after use.

---

# 16. Troubleshooting Runbook Index

| Runbook | Failure |
|---|---|
| RB-DOC-001 | Upload intent creation fails |
| RB-DOC-002 | Blob upload succeeds but document registration fails |
| RB-DOC-003 | Document metadata exists but Blob object is missing/unavailable |
| RB-DOC-004 | User receives unexpected authorization or branch-scope denial |
| RB-DOC-005 | Suspected cross-branch data leakage |
| RB-DOC-006 | Approval/rejection transaction fails |
| RB-DOC-007 | Optimistic concurrency conflict spike |
| RB-DOC-008 | Verification history/current-state mismatch |
| RB-DOC-009 | Expiry evaluation job did not run or is stale |
| RB-DOC-010 | Expiry notifications not delivered |
| RB-DOC-011 | Mandatory audit side effect failed or cannot be confirmed |
| RB-DOC-012 | Reporting dashboard/report is stale or unavailable |
| RB-DOC-013 | Reconciliation backlog grows or retry repeatedly fails |
| RB-DOC-014 | High latency or database query degradation |
| RB-DOC-015 | Deployment regression after release |
| RB-DOC-016 | Database restore integrity validation |

---

# 17. RB-DOC-001 – Upload Intent Creation Fails

## Symptoms

- upload UI cannot start;
- API returns storage or configuration error;
- `asti_document_blob_operation_total{operation="upload_intent",result="failure"}` increases.

## Diagnosis

```text
1. Capture requestId/correlationId.
2. Check authentication result.
3. Check `document.create` or approved self-service authorization.
4. Check owner resolution and branch-scope result.
5. Check MIME/size validation errors.
6. Check Vercel Blob credential/config availability.
7. Check Blob provider reachability and adapter errors.
8. Check recent deployment/config changes.
```

## Recovery

- correct missing/invalid configuration;
- restore Blob connectivity/credential access;
- retry upload intent after validation issue is corrected;
- do not bypass owner or branch checks;
- do not provide raw Blob credentials to the client.

## Escalation

Escalate to platform/infrastructure support when provider or credential management is affected.

---

# 18. RB-DOC-002 – Blob Upload Succeeds but Document Registration Fails

## Symptoms

- user completed binary upload but sees registration failure;
- Blob object exists without matching Document record;
- orphan Blob metric/reconciliation finding increases.

## Diagnosis

```text
1. Identify correlationId/upload-intent identifier.
2. Confirm Blob upload completion through the storage adapter.
3. Check document registration logs and canonical error code.
4. Check owner validation result.
5. Check document type validation.
6. Check DB availability and transaction failure.
7. Check idempotency key/duplicate registration behavior.
8. Determine whether a matching Document row actually exists.
```

## Recovery

1. If registration is safely retryable and metadata is unchanged, retry through the approved idempotent registration path.
2. If the document already exists, return/use the existing authoritative registration according to idempotency rules.
3. If metadata cannot be reconstructed safely, place the Blob reference in the approved reconciliation process.
4. Do not create an unverified Document by direct SQL merely to attach the Blob.
5. Do not delete the Blob unless retention and reconciliation policy explicitly authorizes it.

## Verification

- Document exists exactly once;
- owner reference is valid;
- branch scope is correct;
- file access succeeds through controlled path;
- audit correlation is present.

---

# 19. RB-DOC-003 – Document Exists but Blob Object Is Missing or Unavailable

## Symptoms

- metadata detail loads but file preview/download fails;
- Blob adapter returns not found or repeated access error;
- missing-reference metric increases.

## Diagnosis

```text
1. Distinguish provider outage from confirmed object absence.
2. Check Blob provider health/connectivity.
3. Validate document reference format without logging tokenized URLs.
4. Check whether file was manually or externally removed.
5. Check restore/recovery timeline.
6. Check reconciliation history if architecture provides it.
```

## Recovery

- for transient provider outage: keep metadata available and return controlled degraded error for file access;
- for confirmed missing binary: flag operational inconsistency through approved reconciliation mechanism;
- restore binary only from approved source/backup process;
- do not mark document Approved merely because metadata remains;
- do not rewrite verification history;
- do not silently replace binary content under the same evidence record unless an approved replacement model exists.

## Escalation

Escalate to compliance/security if protected evidence has been irrecoverably lost or externally deleted.

---

# 20. RB-DOC-004 – Unexpected Authorization or Branch-Scope Denial

## Symptoms

- authorized user cannot access expected document;
- direct detail request returns non-disclosing not-found response;
- branch-scope failure metric increases.

## Diagnosis

```text
1. Confirm user identity and session validity.
2. Confirm required fine-grained permission.
3. Resolve the document ownerType and ownerId.
4. Query the approved owner-context branch resolver.
5. Validate IAM UserBranchAccess.
6. Validate canViewChildBranches behavior if relevant.
7. Confirm client-supplied branchId is not being treated as authorization evidence.
8. Check owner record movement or branch reassignment timing.
9. Check cache staleness if authorization data is cached.
```

## Recovery

- correct IAM assignment through IAM workflows if truly incorrect;
- correct authoritative owner branch data through the owning context, not Document Management;
- invalidate stale authorization caches according to platform policy;
- never broaden query scope as an emergency workaround.

---

# 21. RB-DOC-005 – Suspected Cross-Branch Data Leakage

## Severity

Security incident. Treat as high or critical according to exposure.

## Immediate containment

```text
1. Capture incident timestamp and release version.
2. Disable affected endpoint/report/export if needed.
3. Preserve logs and traces.
4. Revoke exposed temporary file-access capabilities where technically possible.
5. Do not delete audit evidence.
6. Notify security/compliance incident contacts.
```

## Investigation

Check:

- row query branch predicates;
- total/count query predicates;
- filter/facet queries;
- pagination counts;
- direct-ID authorization;
- file-access authorization;
- report/export scope composition;
- consolidated access conditions;
- owner branch resolver correctness;
- IAM hierarchy calculation;
- cache key scope isolation.

## Recovery

- patch the authorization defect;
- run regression tests from Part 9;
- verify no inaccessible records leak through rows, counts, exports or charts;
- complete exposure assessment and compliance response.

---

# 22. RB-DOC-006 – Approval or Rejection Transaction Fails

## Symptoms

- API returns transaction/system error;
- decision not visible;
- current state and history appear unchanged;
- DB errors or audit durability errors are present.

## Diagnosis

```text
1. Check current Document state.
2. Check expected version versus submitted version.
3. Check permission and branch-scope result.
4. Check transaction logs.
5. Check DocumentVerification insert result.
6. Check Document status update result.
7. Check DB deadlock/timeout/constraint errors.
8. Check mandatory audit durability path.
```

## Recovery

- verify transaction rollback was complete;
- if no decision committed, retry through the application command after correcting transient failure;
- if a decision committed, do not create a duplicate decision;
- use correlation ID and verification-decision ID to establish authoritative outcome;
- never repair by editing prior `DocumentVerification` rows.

## Post-recovery validation

```text
Exactly one committed decision for the command
Current state consistent with committed decision
Version incremented once
Audit evidence correlated
Notification trigger emitted/recoverable after commit
```

---

# 23. RB-DOC-007 – Optimistic Concurrency Conflict Spike

## Symptoms

- increase in `DOC_CONCURRENCY_CONFLICT` or equivalent;
- users see stale-update messages;
- approval/metadata update retries increase.

## Diagnosis

- identify operations causing conflicts;
- compare client refresh behavior;
- check duplicate submissions;
- check UI double-click prevention;
- check automated retry loops;
- check whether long-lived forms use stale versions;
- inspect contention on heavily accessed documents.

## Recovery

- return latest representation/version to authorized client where safe;
- require user to review latest state before retry;
- fix duplicate submission behavior;
- do not disable version checking;
- do not use last-write-wins for sensitive verification transitions.

---

# 24. RB-DOC-008 – Verification History and Current State Mismatch

## Symptoms

- Document shows Approved but latest valid decision indicates Rejected, or reverse;
- verifier summary differs from decision history unexpectedly;
- consistency check reports mismatch.

## Immediate action

1. Stop automated correction.
2. Preserve transaction logs and audit evidence.
3. Identify whether mismatch is real or caused by `Expired` semantic interpretation.
4. Determine affected document set.

## Diagnosis

Check:

- migration history;
- transaction failures;
- direct database edits;
- application version that wrote the records;
- race conditions;
- rollback behavior;
- expiry-state handling.

## Recovery

Because verification history is immutable, correction must use an approved compliance/data-repair process. Ordinary application operations must not rewrite historical decisions.

No automated repair rule may be introduced until the authoritative state synchronization policy is approved.

---

# 25. RB-DOC-009 – Expiry Evaluation Job Stale or Failed

## Symptoms

- `asti_document_expiry_job_last_success_timestamp` is stale;
- expiring-soon workbench appears outdated;
- no new expiry trigger events.

## Diagnosis

```text
1. Check scheduler execution history.
2. Check job authentication/service identity.
3. Check database connectivity.
4. Check job overlap/lock condition.
5. Check query duration and batch pagination.
6. Check timezone configuration = Asia/Muscat.
7. Check warning-window configuration.
8. Check unresolved Expired-state implementation mode.
```

## Recovery

- fix scheduler/config/connectivity issue;
- rerun idempotently for the missing business-date window;
- verify duplicate notification triggers are prevented;
- confirm workbench/report freshness;
- do not alter persisted verification status unless the approved expiry architecture explicitly requires it.

---

# 26. RB-DOC-010 – Expiry Notifications Not Delivered

## Boundary rule

Document Management owns the expiry/expiring fact and trigger. Communication owns delivery, retry and provider result.

## Diagnosis

```text
1. Confirm expiry evaluation succeeded.
2. Confirm DocumentExpiringSoonDetected or DocumentExpiredDetected trigger was produced/recorded.
3. Capture source event ID and correlationId.
4. Check Communication context intake.
5. Check recipient resolution.
6. Check template resolution.
7. Check provider delivery/retry status in Communication-owned records.
```

## Recovery

- replay/retry through Communication's approved recovery mechanism;
- do not set delivery flags on Document;
- do not duplicate triggers without idempotency key/source event correlation.

---

# 27. RB-DOC-011 – Mandatory Audit Side Effect Failed or Cannot Be Confirmed

## Severity

Critical for sensitive state changes where authoritative audit durability is mandatory.

## Diagnosis

```text
1. Determine whether the business transaction committed.
2. Locate correlationId and entityId.
3. Determine audit architecture mode:
      same-transaction persistence
      or approved durable side-effect mechanism
4. Check authoritative Audit & Compliance records.
5. Check durable pending/retry mechanism if architecture provides one.
6. Identify potentially unaudited committed actions.
```

## Recovery

- if same-transaction audit is required and transaction rolled back: safely retry command;
- if business state committed and audit delivery is durably pending: recover through approved replay/retry;
- if business state committed and no durable audit evidence exists: declare compliance incident and follow approved remediation;
- do not fabricate audit actor/time/reason from guesses.

---

# 28. RB-DOC-012 – Report or Dashboard Stale/Unavailable

## Symptoms

- dashboard data old;
- read-model freshness metric breaches threshold;
- reports fail while document commands still work.

## Diagnosis

- check projection refresh status;
- check source DB connectivity;
- check projection query failures;
- check schema changes affecting projection;
- check branch-scope fields in projection;
- compare projection freshness timestamp with source transaction times.

## Recovery

- restart/rebuild projection using approved idempotent process;
- keep transactional commands available;
- clearly display report freshness/degraded state;
- do not route commands to read models;
- validate branch isolation after rebuild.

---

# 29. RB-DOC-013 – Reconciliation Backlog Growing

## Symptoms

- unresolved inconsistency gauge rises;
- repeated reconciliation retries fail;
- orphan/missing reference counts grow.

## Diagnosis

Classify each item:

```text
ORPHAN_BLOB
MISSING_BLOB
REGISTRATION_RETRYABLE
REFERENCE_INVALID
TRANSIENT_PROVIDER_FAILURE
POLICY_DECISION_REQUIRED
```

The exact persistence of these categories requires the unresolved reconciliation architecture decision; classification may be represented operationally only after approval.

## Recovery

- retry only idempotent safe operations;
- route policy-dependent cases for manual review;
- do not delete Blob objects without retention policy;
- do not create Document metadata without validated owner/type/branch rules;
- do not replace missing approved evidence invisibly.

---

# 30. RB-DOC-014 – High Latency or Database Query Degradation

## Symptoms

- metadata API p95/p99 breaches Part 10 targets;
- queue/workbench response slows;
- DB CPU/IO/locks increase.

## Diagnosis

```text
1. Identify affected operation from metrics.
2. Inspect traces for slow span.
3. Check DB query plan.
4. Check index usage.
5. Check branch-scope predicate behavior.
6. Check count query cost.
7. Check page size and unbounded query attempts.
8. Check sort/filter columns.
9. Check lock contention.
10. Check reporting query accidentally hitting transactional path.
```

## Recovery

- tune approved indexes based on real query plans;
- enforce pagination and bounded page size;
- move heavy analytics to approved read-only projections;
- fix N+1 owner resolution patterns;
- do not remove branch predicates for speed;
- do not bypass authorization caches unsafely.

---

# 31. RB-DOC-015 – Deployment Regression

## Symptoms

- error rate rises immediately after release;
- health checks fail;
- lifecycle commands fail;
- schema compatibility errors appear.

## Response

```text
1. Identify affected release version.
2. Compare error and latency metrics before/after deployment.
3. Check migration status.
4. Check runtime configuration and secrets.
5. Run targeted smoke tests.
6. Determine whether rollback is schema-safe.
7. Roll back application or apply forward fix according to release plan.
8. Never reverse a migration that would destroy newly written verification history.
9. Validate Document/DocumentVerification integrity.
10. Re-run branch isolation and verification lifecycle smoke tests.
```

---

# 32. RB-DOC-016 – Database Restore Integrity Validation

Use after any restore or PITR operation.

## Checklist

```text
[ ] Schema version compatible with application version
[ ] Document table readable
[ ] DocumentVerification table readable
[ ] Zero orphan verification rows
[ ] Date constraints valid
[ ] Soft-delete invariant valid
[ ] Lifecycle summary/history check completed
[ ] IAM user references resolvable where required
[ ] Owner references sampled and resolvable
[ ] Branch-scope checks pass
[ ] Blob reference sample passes
[ ] Missing Blob scan initiated
[ ] Orphan Blob risk from PITR window assessed
[ ] Audit correlation sampled
[ ] Read-only projections rebuilt/refreshed
[ ] API smoke tests pass
[ ] Verification command transaction test passes with synthetic data where permitted
```

---

# 33. Incident Severity Guidance

| Severity | Examples |
|---|---|
| Critical | Cross-branch data exposure, mandatory audit evidence loss, database unavailable, widespread irreversible evidence loss |
| High | Verification commands unavailable, Blob file access broadly unavailable, missing Blob references, expiry job stale beyond SLA |
| Medium | Reporting projection stale, reconciliation backlog rising, elevated concurrency conflicts |
| Low | Isolated validation/configuration issue with no data integrity or access impact |

Actual incident severity must follow the platform-wide incident management policy where it differs.

---

# 34. Operational Dashboards

Recommended operational dashboard panels:

## 34.1 API health

- request rate by operation;
- error rate by operation;
- p50/p95/p99 latency;
- authorization denials;
- branch-scope resolver failures;
- concurrency conflicts.

## 34.2 Verification operations

- queue depth;
- oldest pending age;
- approve/reject success rate;
- transaction failure rate;
- turnaround-time histogram.

## 34.3 Storage consistency

- Blob operation success rate;
- Blob operation latency;
- missing reference count;
- orphan Blob count;
- reconciliation pending count;
- oldest unresolved reconciliation age.

## 34.4 Expiry operations

- last successful expiry run;
- job duration;
- documents evaluated;
- expiring-soon counts by configured window;
- expired counts;
- trigger production failures.

## 34.5 Side effects

- audit side-effect success/failure;
- notification trigger success/failure;
- reporting projection lag.

---

# 35. Capacity and Scaling Operations

## 35.1 Engineering validation envelope

Part 10 defined the following test envelope:

```text
1,000,000 Document rows
3,000,000 DocumentVerification rows
500 concurrent authenticated users
100 concurrent active upload registrations
50 concurrent verification decision commands
```

These are engineering validation targets, not production forecasts.

## 35.2 Scaling principles

- stateless application instances may scale horizontally;
- upload binary transfer should not hold DB transactions open;
- list/report queries must remain paginated;
- analytical aggregation should use read-only projections when justified;
- hot verification queues should be indexed for status and appropriate scope/query keys;
- metrics labels must remain low cardinality;
- scheduled jobs must process in bounded batches;
- job overlap must be prevented;
- DB connection pool limits must be coordinated with application instance scaling.

## 35.3 Capacity review triggers

Perform capacity review when:

- p95 latency approaches SLO limit for 3 consecutive review windows;
- DB CPU/IO or lock waits show sustained growth;
- queue depth grows faster than staff can process;
- expiry job duration approaches its scheduling interval;
- reconciliation backlog grows persistently;
- report projection refresh exceeds freshness SLA.

---

# 36. Data Retention and Operational Cleanup

The current DDD/ER baseline does not define final binary destruction policy.

Therefore:

- do not hard-delete Document records through operational cleanup;
- do not delete DocumentVerification history;
- do not automatically purge Blob binaries after soft retirement until policy is approved;
- do not use database backup retention as a substitute for document retention policy;
- ensure temporary upload intents and temporary access capabilities expire according to infrastructure policy;
- preserve traceability for any future authorized Blob destruction operation.

---

# 37. Security Operations Monitoring

Security operations should monitor:

- direct-ID enumeration patterns;
- repeated authorization denials;
- abnormal branch-scope failures;
- unusual file-access volume per actor;
- unusual consolidated export activity;
- repeated rejected upload types;
- suspicious MIME/content mismatch findings;
- unexpected direct DB access;
- verification decision anomalies;
- manual reconciliation actions;
- break-glass access if supported.

Security telemetry must not reveal protected file content.

---

# 38. Cross-Context Operational Responsibility Matrix

| Operational Concern | Primary Owner | Document Management Responsibility |
|---|---|---|
| User authentication outage | IAM / Platform | Fail authenticated operations safely; expose dependency health |
| Permission resolution failure | IAM | Fail closed and log correlation |
| Branch access calculation | IAM + owner branch source | Request authoritative resolution; never broaden scope |
| Student owner issue | Admission & Enrollment | Consume read contract; do not repair StudentProfile locally |
| Trainer owner issue | Faculty / Trainer | Consume read contract; do not repair TrainerProfile locally |
| Corporate owner issue | Corporate Training | Consume read contract; do not repair CorporateAccount locally |
| Person owner scope gap | Architecture/shared Party + consuming policy | Block unsupported unsafe operation until resolver approved |
| Blob outage | Infrastructure/storage adapter | Degrade upload/file access while preserving safe metadata operations |
| Audit evidence pipeline issue | Audit & Compliance / Platform | Produce correlated fact and participate in recovery |
| Notification provider failure | Communication | Confirm trigger; do not own delivery retries |
| Report projection outage | Reporting | Keep transaction path independent; expose freshness/degraded state |
| Branch hierarchy issue | Organization | Consume hierarchy reference; do not maintain local hierarchy |

---

# 39. Final DDD Consistency Check

## 39.1 Aggregate ownership

| Check | Result | Notes |
|---|---|---|
| `Document` remains owned by Document Management | PASS | No other context is allowed to mutate document lifecycle directly. |
| `DocumentVerification` remains Document Management-owned immutable history | PASS | No ordinary update/delete operations introduced. |
| Student/Trainer/Corporate/Person are only referenced | PASS | No duplicate owner tables introduced. |
| IAM remains owner of users, roles, permissions and branch access | PASS | Module consumes authorization and scope decisions. |
| Audit remains owner of authoritative audit evidence | PASS | No local `DocumentAuditLog` introduced. |
| Communication remains owner of delivery/retry/logging | PASS | Module emits source facts/triggers only. |
| Reporting remains owner of dashboards/read projections | PASS | Operational read models remain read-only and rebuildable. |
| Configuration remains owner of configurable reference data | PASS | No local document-type master invented. |
| Vercel Blob remains infrastructure storage | PASS | Blob object is not treated as an aggregate or lifecycle owner. |

## 39.2 Core DDD rule confirmation

The module still follows the context-map rule:

```text
Document Management owns:
- document upload metadata
- document association
- document verification workflow/history
- expiry facts and compliance work queues

Document Management does not own:
- Student lifecycle
- Enrollment lifecycle
- Trainer lifecycle
- Corporate Account lifecycle
- Certificate issuance
- Notification delivery
- IAM authorization records
- Reporting definitions
```

No operational runbook authorizes bypassing this ownership.

---

# 40. Final ER Model Consistency Check

## 40.1 Entity alignment

| ER Entity | Module Treatment | Result |
|---|---|---|
| `Document` | Authoritative owned table | PASS |
| `DocumentVerification` | Authoritative immutable owned history | PASS |
| `AuditLog` | Cross-context audit target | PASS |
| `User` | Referenced for actor identity | PASS |
| `StudentProfile` | Logical owner reference | PASS |
| `TrainerProfile` | Logical owner reference | PASS |
| `CorporateAccount` | Logical owner reference | PASS |
| `Person` | Logical owner reference with unresolved branch resolver gap | PASS WITH GAP |
| `NotificationRequest` / `NotificationLog` | Communication-owned | PASS |
| Reporting entities | Reporting-owned, read-only consumer | PASS |

## 40.2 ER field alignment confirmation

Operational procedures preserve the ER-defined Document concepts:

```text
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

Operational procedures also preserve:

```text
DocumentVerification.documentId
status
remarks
verifiedBy
verifiedAt
```

No operational procedure introduces direct mutation of immutable verification history.

---

# 41. Cross-Part Consistency Check

| Earlier Part | Consistency Result |
|---|---|
| Module Overview | Operational design supports approved scope only. |
| Part 1 | All operations trace to FR-DOC requirements and BR-DOC rules; no new business capability introduced. |
| Part 2 | Runbooks preserve approved lifecycle and do not add transitions. |
| Part 3 | Operational behavior supports loading, error, degraded, permission and bilingual UI states. |
| Part 4 | Backup/recovery covers only Module 13-owned transactional tables as owned data. |
| Part 5 | Telemetry and runbooks map to the defined API and Server Action surface. |
| Part 6 | Operations respect canonical permissions and branch/global/consolidated scopes. |
| Part 7 | Runbooks use structured error and notification boundaries; no delivery ownership leakage. |
| Part 8 | Reporting projections remain read-only, rebuildable and non-authoritative. |
| Part 9 | Operational checks support the BDD regression, authorization and branch-isolation tests. |
| Part 10 | Observability, availability, performance, audit and security behavior match defined NFRs. |

---

# 42. Outstanding Gaps Carried Forward

The following gaps remain intentionally unresolved and require architecture/business/compliance decisions. This document does not invent solutions for them.

| Gap | Operational Impact |
|---|---|
| Prisma schema validation pending | Migration and physical table procedures must be checked against actual schema before implementation. |
| Document type scalar vs FK representation | Validation/cache/health procedures depend on final representation. |
| Generic Person branch-scope resolution | Person-owned document access must fail closed until a safe resolver is approved. |
| Persisted vs derived `Expired` semantics | Expiry job and consistency-check behavior must follow final decision. |
| Rejected-document resubmission | No runbook may reactivate/recycle Rejected state without approved workflow. |
| Approved evidence replacement/version chain | Missing binary or updated evidence cannot be silently replaced under existing record. |
| Reconciliation persistence ownership | Durable reconciliation ledger/table must not be created without architecture decision. |
| Additional Blob operational metadata | Storage metadata persistence needs explicit ownership/schema approval. |
| Blob retention/destruction policy | Automated purge is prohibited until approved. |
| Malware scanning/quarantine architecture | Upload operational flow must adopt project-wide approved design before implementation. |
| Verification SLA configuration owner | Alert thresholds must be configured only after ownership is approved. |
| Final RPO/RTO | Backup/recovery targets must inherit approved project-wide values. |
| Student/Trainer self-service identity binding | Future portal health and support procedures depend on final IAM policy. |

---

# 43. Production Readiness Checklist

## Architecture and ownership

```text
[ ] Only Document and DocumentVerification are Module 13-owned transactional tables
[ ] No local IAM, Audit, Notification or Reporting transaction tables introduced
[ ] Vercel Blob treated as storage infrastructure only
[ ] Owner contexts remain authoritative
```

## Security

```text
[ ] All direct-ID routes enforce permission + owner-derived branch scope
[ ] File access uses controlled short-lived/proxy mechanism
[ ] Sensitive log redaction verified
[ ] Cross-branch regression suite passes
[ ] Consolidated report permission composition verified
[ ] Reconciliation permission separated from verification permission
```

## Observability

```text
[ ] Structured logs visible
[ ] Request and correlation IDs propagated
[ ] Trace spans visible across DB, owner resolver and Blob adapter
[ ] Metrics dashboards created
[ ] Error-rate and dependency alerts configured
[ ] Expiry job freshness alert configured
[ ] Reconciliation backlog monitoring configured where architecture exists
```

## Database and recovery

```text
[ ] Backup policy confirmed
[ ] Restore test completed
[ ] Document and DocumentVerification integrity checks pass
[ ] No hard-delete application path exists
[ ] Verification history immutability verified
[ ] PITR Blob divergence handling understood
[ ] Final RPO/RTO approved or tracked as release blocker where required
```

## Jobs and reports

```text
[ ] Expiry evaluation job is idempotent
[ ] Job overlap prevention works
[ ] Asia/Muscat business-date behavior verified
[ ] Reporting projections expose freshness
[ ] Reporting outage does not break commands
[ ] Read models cannot be written through application APIs
```

## Release validation

```text
[ ] Part 9 minimum regression suite passes
[ ] Approval/rejection atomicity test passes
[ ] Concurrency test passes
[ ] Upload-success/registration-failure path tested
[ ] Missing Blob behavior tested
[ ] Audit correlation tested
[ ] Notification trigger correlation tested
```

---

# 44. Final Operational Conclusion

Module 13 – Document Management is operationally consistent with the ASTI IMS DDD Context Map and ER Model when implemented according to this FRD set.

The final operating model is:

```text
Authoritative transaction path

Authenticated request/job
        |
        v
IAM permission + owner-derived branch scope
        |
        v
Document Management application service
        |
        +--> Document
        +--> DocumentVerification
        |
        +--> Vercel Blob adapter for binary storage/access
        |
        +--> correlated audit fact
        +--> correlated notification trigger
        |
        v
Read-only reporting projection
```

The production safety rules are non-negotiable:

1. `Document` and `DocumentVerification` remain the only currently justified Module 13-owned transactional entities.
2. Verification history is immutable.
3. No hard delete is allowed through normal application paths.
4. Branch isolation is enforced server-side through authoritative owner-derived scope.
5. Vercel Blob success does not replace database registration, and database restore does not prove binary availability.
6. Sensitive state changes must be correlated to authoritative audit evidence.
7. Notification delivery failures are handled by Communication and do not rewrite document state.
8. Reporting projections are read-only, rebuildable, and never authoritative for commands.
9. Operational runbooks must not bypass bounded-context ownership.
10. Open architecture gaps remain explicit and must be resolved through approved decisions rather than hidden operational workarounds.

This concludes the Module 13 Document Management FRD operational series requested in the current scope.
