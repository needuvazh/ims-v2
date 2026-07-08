# Part 11 - Deployment, Operations, Observability, Runbooks

## Module 11 – Certificate Management

## 1. Purpose

This document defines the deployment, runtime operations, observability, health-checking, backup, recovery, incident response, and troubleshooting requirements for Module 11 – Certificate Management.

It is the operational companion to Parts 1–10 and preserves the architectural baseline established for ASTI IMS:

- modular monolith first;
- Certificate Management is deployed as a bounded module inside the IMS application, not as an independently deployed microservice;
- `Enrollment` remains the central learning-lifecycle aggregate;
- Certificate Management owns certificate generation, issue, verification, reissue, replacement lineage, and revocation lifecycle behavior;
- Exam, Result & Completion owns completion evaluation and approval truth;
- Fee, Billing & Receivables owns payment-validation truth;
- Identity & Access Management owns authentication, permissions, effective branch scope, and consolidated-access decisions;
- Configuration owns numbering-series policy and allocation;
- Audit & Compliance owns authoritative audit persistence;
- Communication & Notification owns templates, delivery state, and notification logs;
- Reporting & Executive Dashboards owns read-only reporting projections and metric snapshots;
- no hard delete is allowed for Certificate-owned business records;
- all sensitive lifecycle transitions must be traceable and auditable;
- public verification is intentionally privacy-minimized and independently observable from authenticated administrative operations.

The operational design covers:

1. deployment topology and configuration;
2. structured logs;
3. distributed/in-process tracing boundaries;
4. metrics and service-level indicators;
5. dashboards and alerts;
6. health, readiness, and dependency checks;
7. backup and recovery of Certificate-owned persistence;
8. operational reconciliation procedures;
9. troubleshooting runbooks;
10. final consistency validation against the DDD Context Map and ER Model.

---

# 2. Operational Ownership Model

## 2.1 Certificate Management Operational Ownership

Certificate Management operations are responsible for the runtime health and recoverability of the following owned capabilities:

- certificate readiness query orchestration;
- certificate generation command execution;
- certificate artifact rendering orchestration;
- certificate issuance state transitions;
- certificate registry and certificate detail queries;
- authenticated artifact-download authorization;
- public verification lookup and privacy-minimized response generation;
- verification-attempt persistence where supported by the approved ER model;
- reissue request lifecycle;
- replacement certificate generation;
- certificate revocation lifecycle;
- Certificate-owned table integrity;
- Certificate-specific operational metrics, traces, and logs;
- Certificate-owned reconciliation jobs and consistency checks.

## 2.2 External Operational Dependencies

The module depends on, but does not operationally own, the following authoritative capabilities:

| Dependency                            | Owning Context                    | Certificate Dependency                       | Failure Policy                                                                                              |
| ------------------------------------- | --------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Authentication and session validation | Identity & Access                 | authenticated principal                      | Fail closed                                                                                                 |
| Permission and branch scope           | Identity & Access                 | permission decision and effective branch set | Fail closed                                                                                                 |
| Enrollment identity/course/batch link | Admission & Enrollment            | central lifecycle reference                  | Fail closed for generation; degrade read views only if cached projection exists and is clearly marked stale |
| Completion approval                   | Exam, Result & Completion         | eligibility decision                         | Fail closed for generation/issue where required                                                             |
| Payment validation                    | Fee, Billing & Receivables        | payment gate where configured                | Fail closed for generation/issue where required                                                             |
| Number allocation                     | Configuration / Master Data       | certificate number                           | Fail closed for new generation; never synthesize a number locally                                           |
| Audit persistence                     | Audit & Compliance                | mandatory sensitive-action record            | Fail closed for configured mandatory-audit commands                                                         |
| Notification request                  | Communication & Notification      | post-commit notification request             | Do not roll back committed lifecycle state; retry/reconcile request                                         |
| Reporting projection                  | Reporting & Dashboards            | read-only projection update                  | Do not roll back transaction; monitor lag and reconcile                                                     |
| Private artifact storage              | Infrastructure storage capability | PDF/object persistence and retrieval         | Fail generation before commit if durable artifact is mandatory                                              |

Certificate operations must not recover another context's authoritative table by writing directly into that context. Recovery across multiple contexts requires coordinated, owner-specific recovery procedures.

---

# 3. Deployment Architecture

## 3.1 Deployment Style

Certificate Management is deployed as part of the ASTI IMS modular monolith.

```text
asti-ims
│
├── apps
│   └── admin-portal / portal runtime
│
├── packages
│   ├── certificates                 <-- Module 11 application/domain/infrastructure adapters
│   ├── exams-completion             <-- authoritative completion owner
│   ├── finance-receivables          <-- authoritative payment owner
│   ├── identity-access              <-- authorization and scope owner
│   ├── configuration                <-- numbering owner
│   ├── communication-notifications  <-- notification owner
│   ├── reporting-dashboards         <-- read-model owner
│   └── audit-compliance             <-- audit owner
│
└── infrastructure
    ├── database
    ├── auth
    ├── storage
    ├── jobs
    └── deployment
```

Operational rules:

1. No independent Certificate microservice is required.
2. No external broker is introduced by this FRD.
3. In-process domain/application events may be used inside the modular monolith where the repository architecture supports them.
4. Cross-context calls must pass through explicit application ports or public module interfaces.
5. Direct cross-context table writes are prohibited.
6. Deployment rollback must consider database migration compatibility and artifact schema compatibility.

## 3.2 Runtime Components

| Runtime Component                | Responsibility                                                            | Scale Unit                                          |
| -------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| Next.js web/runtime instances    | Portal pages, Server Actions, Route Handlers                              | Horizontal application instances                    |
| Certificate application module   | Commands and queries                                                      | Same runtime as application                         |
| Database                         | Certificate-owned transactional tables plus other IMS schemas             | Database platform capacity                          |
| Private object storage           | Certificate artifacts and generated QR assets where applicable            | Object storage capacity                             |
| In-process/background job runner | retries, reconciliation, projection repair, non-blocking post-commit work | Job worker concurrency within approved architecture |
| Reporting database/views         | read-only dashboards and analytics                                        | Read workload / materialized-view refresh capacity  |

## 3.3 Environment Separation

At minimum:

- local development;
- shared development;
- test/QA;
- staging/pre-production;
- production.

Production requirements:

- production database credentials are never shared with lower environments;
- production artifacts are not copied to lower environments unless anonymized and explicitly approved;
- verification codes copied into lower environments must be regenerated or irreversibly transformed;
- environment-specific base URLs must be injected through configuration;
- object-storage buckets/containers must be environment-isolated;
- signing keys and credentials must be environment-specific;
- observability data must identify environment on every signal.

## 3.4 Required Runtime Configuration

| Configuration                         | Purpose                           | Validation                                                |
| ------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| `APP_ENV`                             | environment label                 | Required; approved enum                                   |
| `APP_VERSION`                         | deployment/version correlation    | Required; immutable per deployment                        |
| `DATABASE_URL` or platform equivalent | database connectivity             | Secret; startup validation                                |
| `CERTIFICATE_ARTIFACT_BUCKET`         | private artifact storage target   | Required in environments with generation enabled          |
| `CERTIFICATE_PUBLIC_VERIFY_BASE_URL`  | QR/deep-link origin               | Must be HTTPS in production                               |
| `CERTIFICATE_SIGNED_URL_TTL_SECONDS`  | authenticated artifact access TTL | Bounded secure value                                      |
| `CERTIFICATE_RENDER_TIMEOUT_MS`       | renderer timeout                  | Positive bounded integer                                  |
| `CERTIFICATE_RENDER_MAX_CONCURRENCY`  | renderer concurrency protection   | Positive bounded integer                                  |
| `CERTIFICATE_VERIFY_RATE_LIMIT`       | public verification abuse control | Required in production                                    |
| `CERTIFICATE_VERIFY_WINDOW_SECONDS`   | rate-limit window                 | Required in production                                    |
| `CERTIFICATE_AUDIT_REQUIRED`          | enforce mandatory audit behavior  | Must be true for production sensitive commands            |
| `OTEL_SERVICE_NAME` or equivalent     | trace source identity             | Required when telemetry enabled                           |
| `LOG_LEVEL`                           | structured-log threshold          | Production default `info`; temporary elevation controlled |
| `METRICS_ENABLED`                     | metric emission                   | Required true in production                               |
| `TRACE_SAMPLING_POLICY`               | trace volume policy               | Must preserve error traces and critical command traces    |

Configuration must be validated during startup. An invalid security-sensitive configuration makes the application unready rather than silently falling back to an insecure default.

---

# 4. Deployment and Release Procedure

## 4.1 Pre-Deployment Checks

Before production deployment:

1. All Part 9 BDD acceptance scenarios relevant to the changed surface pass.
2. Unit and integration tests for changed application services pass.
3. Architecture tests confirm no prohibited direct imports or table writes across context boundaries.
4. Database migrations are reviewed for:
   - backward compatibility;
   - no hard-delete behavior;
   - safe defaults;
   - index-build impact;
   - uniqueness behavior;
   - known Enrollment-to-Certificate cardinality ambiguity.
5. Artifact-generation smoke test passes in staging.
6. Public verification abuse controls are enabled.
7. Audit recording is enabled for sensitive commands.
8. Dashboard and alert rules are active before traffic exposure.
9. Backup freshness is within target.
10. A restore point or platform backup checkpoint exists according to database policy.

## 4.2 Deployment Sequence

Recommended modular-monolith deployment sequence:

```text
1. Validate backup/recovery readiness
2. Apply compatible database migration
3. Deploy application version
4. Run startup configuration validation
5. Pass liveness check
6. Pass readiness dependency checks
7. Execute Certificate smoke tests
8. Validate public verification smoke test
9. Validate audit smoke test
10. Observe golden signals during rollout
11. Complete rollout or rollback application version
```

## 4.3 Database Migration Rules

1. Use additive migrations before destructive changes.
2. Do not drop Certificate-owned columns in the same release that removes application usage.
3. Never hard-delete historical certificate records as a migration shortcut.
4. Adding a uniqueness constraint around `enrollmentId` requires explicit resolution of the reissue/replacement cardinality gap.
5. Status enum migrations require authoritative enum approval before deployment.
6. Large index builds must use the database platform's online/concurrent mechanism where supported.
7. Migration scripts must be idempotent or platform-managed with immutable migration history.
8. Rollback planning must distinguish application rollback from schema rollback.

## 4.4 Smoke Tests After Deployment

Mandatory smoke checks:

| ID           | Smoke Test                                                  | Expected Result                                              |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------ |
| SMK-CERT-001 | authenticated registry query                                | returns only effective branch scope                          |
| SMK-CERT-002 | readiness detail for known test enrollment                  | response includes authoritative completion/payment decisions |
| SMK-CERT-003 | public verification using known non-production/staging code | privacy-minimized valid response                             |
| SMK-CERT-004 | invalid verification code                                   | uniform invalid response without record enumeration          |
| SMK-CERT-005 | certificate artifact authorized access                      | short-lived/private access only                              |
| SMK-CERT-006 | audit-sensitive command in staging                          | Certificate action and Audit record share correlation ID     |
| SMK-CERT-007 | report query                                                | read-only result and permission scope enforced               |

Production smoke tests must avoid creating unnecessary live certificates. Where a production-safe synthetic tenant is not available, use read-only checks and approved operational probes.

---

# 5. Observability Architecture

## 5.1 Observability Principles

1. Every request receives or propagates a correlation/trace identifier.
2. Structured logs are machine-queryable JSON or platform-equivalent structured records.
3. Logs must not become an alternative source of business truth.
4. Traces cross module/application-port boundaries but do not expose secret payloads.
5. Metrics focus on service health, domain throughput, failure rates, backlog, and consistency lag.
6. Certificate number, verification code, artifact URL, Civil ID, passport number, and authentication tokens must not be logged in plaintext.
7. User identifiers may be pseudonymized or recorded as internal immutable IDs where approved.
8. Public verification telemetry must support abuse detection without logging the raw verification code.
9. Alerting must be actionable and linked to a runbook.
10. Observability must distinguish business rejection from technical failure.

---

# 6. Structured Logging

## 6.1 Standard Log Envelope

Every Certificate module log event must use a structured schema similar to:

```json
{
  "timestamp": "2026-07-07T12:34:56.789Z",
  "level": "info",
  "environment": "production",
  "service": "asti-ims",
  "module": "certificate-management",
  "appVersion": "2026.07.07.1",
  "eventName": "certificate.issue.completed",
  "traceId": "4fd2...",
  "spanId": "ab13...",
  "correlationId": "req_...",
  "requestId": "req_...",
  "actorType": "USER",
  "actorId": "usr_...",
  "effectiveBranchId": "br_...",
  "entityType": "Certificate",
  "entityId": "cert_...",
  "command": "IssueCertificate",
  "outcome": "SUCCESS",
  "durationMs": 143,
  "errorCode": null,
  "retryCount": 0
}
```

## 6.2 Required Log Fields

| Field                                | Required                        | Notes                                                     |
| ------------------------------------ | ------------------------------- | --------------------------------------------------------- |
| `timestamp`                          | Yes                             | UTC ISO-8601                                              |
| `level`                              | Yes                             | debug/info/warn/error/fatal                               |
| `environment`                        | Yes                             | deployment environment                                    |
| `service`                            | Yes                             | modular monolith service name                             |
| `module`                             | Yes                             | `certificate-management`                                  |
| `appVersion`                         | Yes                             | release correlation                                       |
| `eventName`                          | Yes                             | stable event taxonomy                                     |
| `traceId`                            | When tracing present            | cross-boundary correlation                                |
| `correlationId`                      | Yes for request/command         | end-to-end incident correlation                           |
| `actorType`                          | For user/system action          | USER, SYSTEM, PUBLIC                                      |
| `actorId`                            | For authenticated/system action | internal identifier only                                  |
| `effectiveBranchId` or scope summary | For scoped internal access      | do not log unauthorized requested branch as trusted scope |
| `entityType`                         | For entity operation            | Certificate/ReissueRequest/etc.                           |
| `entityId`                           | When known                      | internal identifier                                       |
| `command` or `query`                 | Yes                             | application operation                                     |
| `outcome`                            | Yes                             | SUCCESS, REJECTED, FAILED, RETRIED                        |
| `durationMs`                         | For measured operations         | integer                                                   |
| `errorCode`                          | On rejection/failure            | structured Part 7 error code                              |
| `dependency`                         | Dependency failure only         | completion, finance, audit, storage, etc.                 |

## 6.3 Log Event Taxonomy

Recommended events:

### Command Lifecycle

```text
certificate.generate.started
certificate.generate.completed
certificate.generate.rejected
certificate.generate.failed
certificate.issue.started
certificate.issue.completed
certificate.issue.rejected
certificate.issue.failed
certificate.revoke.started
certificate.revoke.completed
certificate.revoke.rejected
certificate.revoke.failed
certificate.reissue.requested
certificate.reissue.approved
certificate.reissue.rejected
certificate.replacement.generated
```

### Verification

```text
certificate.verify.requested
certificate.verify.valid
certificate.verify.invalid
certificate.verify.revoked
certificate.verify.rate_limited
certificate.verify.failed
```

Raw verification code must not be logged. Use a one-way keyed hash or non-reversible request fingerprint only when operationally necessary and approved.

### Dependency and Reconciliation

```text
certificate.dependency.timeout
certificate.dependency.unavailable
certificate.audit.write.failed
certificate.notification.request.failed
certificate.notification.request.retried
certificate.projection.update.failed
certificate.reconciliation.started
certificate.reconciliation.completed
certificate.reconciliation.discrepancy_found
certificate.reconciliation.repaired
```

### Security

```text
certificate.authorization.denied
certificate.branch_scope.denied
certificate.artifact.access.denied
certificate.export.started
certificate.export.completed
certificate.public_abuse.detected
```

## 6.4 Redaction Rules

Never log plaintext:

- password/session/token values;
- raw authorization headers;
- raw cookies;
- verification codes;
- QR payloads containing verification secrets;
- signed artifact URLs;
- Civil ID;
- passport number;
- visa number;
- private object-storage credentials;
- full certificate PDF content;
- full request bodies for sensitive commands.

Masking examples:

```text
student email: p***@example.com
phone: ******1234
certificate number: optional last-4 display only in operator log if approved
verification code: never plaintext; fingerprint only
```

---

# 7. Tracing Boundaries

## 7.1 Trace Root Boundaries

Create or continue a trace for:

- Admin Portal Server Action;
- REST Route Handler;
- Student Portal request;
- Trainer Portal request;
- public verification request;
- reconciliation job execution;
- reporting projection refresh related to Certificate Management.

## 7.2 Required Spans

A generate-certificate trace should contain conceptual spans similar to:

```text
HTTP POST /api/certificates/generate
└── certificate.generate
    ├── iam.authorize
    ├── enrollment.read
    ├── completion.readDecision
    ├── finance.validatePayment
    ├── numbering.allocateCertificateNumber
    ├── certificate.renderArtifact
    ├── storage.putArtifact
    ├── certificate.transaction.persist
    ├── audit.record
    ├── communication.requestNotification   [post-commit/recoverable]
    └── reporting.publishProjectionHint     [post-commit/recoverable]
```

A public verification trace should contain:

```text
HTTP GET /verify/{code-or-token}
└── certificate.publicVerify
    ├── security.rateLimitCheck
    ├── certificate.lookupByVerificationCode
    ├── certificate.evaluateVerificationOutcome
    └── certificate.recordVerificationAttempt
```

## 7.3 Trace Attributes

Safe attributes:

- `certificate.operation`;
- `certificate.status.from`;
- `certificate.status.to`;
- `certificate.language`;
- `certificate.branch_id` using internal ID;
- `certificate.reissue_request_id`;
- `dependency.context`;
- `dependency.operation`;
- `error.code`;
- `retry.count`;
- `idempotency.replayed` boolean;
- `verification.outcome` as VALID/INVALID/REVOKED/EXPIRED if applicable.

Do not attach:

- raw verification code;
- certificate PDF bytes;
- signed URL;
- student PII;
- free-form reissue reason unless sanitized and specifically needed.

## 7.4 Trace Sampling

Minimum policy:

- 100% of failed critical lifecycle commands;
- 100% of revocation and replacement-generation commands;
- 100% of cross-context dependency errors;
- sampled successful registry/read requests;
- sampled successful public-verification requests based on volume;
- elevated sampling automatically or operationally during active incidents.

---

# 8. Metrics Instrumentation

## 8.1 Metric Naming Convention

Use stable names with bounded-cardinality labels.

Recommended prefix:

```text
ims_certificate_*
```

Do not use certificate ID, student ID, verification code, or user ID as metric labels.

## 8.2 Golden Signal Metrics

| Metric                                          | Type      | Labels                            | Purpose                   |
| ----------------------------------------------- | --------- | --------------------------------- | ------------------------- |
| `ims_certificate_http_requests_total`           | Counter   | route class, method, status class | traffic/error rate        |
| `ims_certificate_http_request_duration_seconds` | Histogram | route class, method               | latency                   |
| `ims_certificate_commands_total`                | Counter   | command, outcome                  | domain command throughput |
| `ims_certificate_command_duration_seconds`      | Histogram | command                           | lifecycle command latency |
| `ims_certificate_dependency_calls_total`        | Counter   | dependency, operation, outcome    | dependency health         |
| `ims_certificate_dependency_duration_seconds`   | Histogram | dependency, operation             | dependency latency        |
| `ims_certificate_db_query_duration_seconds`     | Histogram | query class                       | database latency          |
| `ims_certificate_storage_operations_total`      | Counter   | operation, outcome                | artifact storage health   |
| `ims_certificate_storage_duration_seconds`      | Histogram | operation                         | artifact latency          |

## 8.3 Domain Operational Metrics

| Metric                                            | Type    | Purpose                                    |
| ------------------------------------------------- | ------- | ------------------------------------------ |
| `ims_certificate_generated_total`                 | Counter | successful new generations                 |
| `ims_certificate_issued_total`                    | Counter | issuance throughput                        |
| `ims_certificate_revoked_total`                   | Counter | revocations                                |
| `ims_certificate_reissue_requested_total`         | Counter | reissue demand                             |
| `ims_certificate_reissue_approved_total`          | Counter | approvals                                  |
| `ims_certificate_reissue_rejected_total`          | Counter | rejections                                 |
| `ims_certificate_replacement_generated_total`     | Counter | successful replacements                    |
| `ims_certificate_generation_rejected_total`       | Counter | business rejection by bounded reason class |
| `ims_certificate_duplicate_prevented_total`       | Counter | idempotency/unique-guard prevention        |
| `ims_certificate_concurrency_conflict_total`      | Counter | optimistic locking conflicts               |
| `ims_certificate_verification_total`              | Counter | verification outcome volume                |
| `ims_certificate_verification_rate_limited_total` | Counter | abuse-control action                       |
| `ims_certificate_artifact_missing_total`          | Counter | metadata/artifact inconsistency            |
| `ims_certificate_notification_retry_backlog`      | Gauge   | pending communication-request retries      |
| `ims_certificate_projection_lag_seconds`          | Gauge   | reporting freshness lag                    |
| `ims_certificate_reconciliation_discrepancies`    | Gauge   | unresolved consistency issues              |

## 8.4 Database Integrity Metrics

Scheduled checks should publish:

- certificates referencing nonexistent Enrollment: expected 0;
- reissue requests referencing nonexistent Certificate: expected 0;
- reissue `newCertificateId` referring to nonexistent Certificate: expected 0 when populated;
- duplicate active certificate numbers: expected 0;
- duplicate verification codes: expected 0;
- certificate metadata with missing required artifact: expected 0 for statuses requiring artifact;
- issued certificates without issue timestamp semantics where required by approved schema: expected 0 after schema resolution;
- unresolved approved reissue requests older than threshold: monitored;
- revoked status without structured revocation metadata: cannot be fully measured until ER gap is resolved.

---

# 9. Dashboards

## 9.1 Operations Dashboard

Required panels:

1. request rate by endpoint family;
2. P50/P95/P99 latency;
3. 4xx business rejection rate by error-code class;
4. 5xx technical error rate;
5. generation success/failure rate;
6. issuance success/failure rate;
7. public verification traffic and rate limiting;
8. dependency health and latency by context;
9. artifact storage error rate;
10. database connection/query latency;
11. notification retry backlog;
12. reporting projection lag;
13. reconciliation discrepancy count;
14. application version by instance;
15. readiness failures by dependency.

## 9.2 Security Dashboard

Required panels:

- authorization denials;
- branch-scope denials;
- artifact access denials;
- public verification invalid-attempt trend;
- rate-limit actions;
- unusual verification spikes by coarse network/security dimension;
- sensitive export count;
- revocation activity;
- privileged lifecycle command failures;
- audit-recording failures.

## 9.3 Business Operations Dashboard

Operational telemetry should complement, not replace, Part 8 authoritative reporting KPIs.

Suggested near-real-time panels:

- certificates generated in last hour/day;
- issuance count;
- generation rejections by reason category;
- pending reissue workflow count;
- replacement-generation failures;
- public verification outcomes;
- missing-artifact discrepancies.

Metric dashboards are operational telemetry. Business reports and official KPI outputs must continue to use the approved read-only reporting model lineage from Part 8.

---

# 10. Alerting Requirements

## 10.1 Alert Severity

| Severity | Definition                                                           | Example                                                                                          |
| -------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| SEV-1    | widespread critical service loss, integrity risk, or security breach | invalid mass issuance, database corruption, public verification unavailable beyond tolerance     |
| SEV-2    | major feature impaired with significant user impact                  | certificate generation unavailable, artifact storage unavailable, audit mandatory-write failures |
| SEV-3    | degraded service or growing backlog                                  | notification retry backlog, projection lag, increased dependency latency                         |
| SEV-4    | informational/operator follow-up                                     | isolated reconciliation discrepancy, non-urgent capacity warning                                 |

## 10.2 Recommended Alert Conditions

Exact thresholds must be tuned from production baselines, but initial operational targets are:

| Alert                             | Initial Condition                                                      | Severity | Runbook     |
| --------------------------------- | ---------------------------------------------------------------------- | -------- | ----------- |
| High certificate API 5xx rate     | >2% for 5 min with minimum traffic floor                               | SEV-2    | RB-CERT-001 |
| Generation failure spike          | technical failure >2% for 10 min                                       | SEV-2    | RB-CERT-002 |
| Completion dependency unavailable | sustained failures for 5 min                                           | SEV-2    | RB-CERT-003 |
| Finance dependency unavailable    | sustained failures for 5 min                                           | SEV-2    | RB-CERT-004 |
| Numbering allocation failure      | >3 consecutive failures or sustained errors                            | SEV-2    | RB-CERT-005 |
| Artifact storage failure          | >1% failure for 5 min                                                  | SEV-2    | RB-CERT-006 |
| Missing artifact discrepancy      | any newly detected issued/active certificate without required artifact | SEV-2    | RB-CERT-007 |
| Audit mandatory write failure     | any repeated failure or >1 occurrence after retry policy               | SEV-2    | RB-CERT-008 |
| Public verification 5xx rate      | >1% for 5 min                                                          | SEV-2    | RB-CERT-009 |
| Verification abuse spike          | rate-limit actions exceed baseline by configured multiplier            | SEV-3/2  | RB-CERT-010 |
| Notification retry backlog        | backlog age/size exceeds threshold                                     | SEV-3    | RB-CERT-011 |
| Reporting projection lag          | lag >15 min operational / approved SLA                                 | SEV-3    | RB-CERT-012 |
| DB integrity discrepancy          | any FK/uniqueness/lineage inconsistency                                | SEV-2    | RB-CERT-013 |
| Concurrency conflicts spike       | >baseline multiplier for 10 min                                        | SEV-3    | RB-CERT-014 |
| Reissue workflow backlog aging    | approved request waiting replacement beyond SLA                        | SEV-3    | RB-CERT-015 |

Every alert must contain:

- environment;
- affected operation;
- start time;
- current value and threshold;
- application version;
- dashboard link;
- trace/log query link where supported;
- runbook ID.

---

# 11. Health Checks

## 11.1 Liveness

Purpose: determine whether the process should be restarted.

Liveness must check only local process health, such as:

- event loop/process responsiveness;
- fatal initialization failure;
- unrecoverable internal worker deadlock where detectable.

Liveness must **not** fail solely because Completion, Finance, Communication, Reporting, or object storage is temporarily unavailable. Restart loops do not repair external dependency outages.

Example:

```text
GET /health/live
200 OK
{
  "status": "UP",
  "version": "2026.07.07.1"
}
```

## 11.2 Readiness

Purpose: determine whether the instance can safely serve traffic.

Readiness checks:

- database connectivity;
- required schema/migration version compatibility;
- security-sensitive startup configuration validity;
- ability to resolve IAM/auth dependencies required by the runtime architecture;
- artifact storage connectivity when certificate generation/artifact routes are enabled.

A deployment may expose capability-specific degradation separately instead of marking the entire IMS unready for every external context outage.

## 11.3 Capability Health

Recommended internal health view:

| Capability          | Check                                                                            | Result                                      |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------------------- |
| Registry reads      | DB/read model query                                                              | UP/DEGRADED/DOWN                            |
| Generation          | DB + Completion + Finance where required + Numbering + Storage + mandatory Audit | UP/DEGRADED/DOWN                            |
| Issuance            | DB + required gates + mandatory Audit                                            | UP/DEGRADED/DOWN                            |
| Public verification | DB/read path + abuse-control capability                                          | UP/DEGRADED/DOWN                            |
| Reissue             | DB + IAM + Audit                                                                 | UP/DEGRADED/DOWN                            |
| Notifications       | Communication request capability                                                 | UP/DEGRADED; does not block committed state |
| Reporting           | projection/read-model freshness                                                  | UP/DEGRADED                                 |

Health responses exposed to unauthenticated users must not disclose internal dependency names, hostnames, credentials, table names, or stack traces.

## 11.4 Synthetic Monitoring

Recommended production-safe synthetic probes:

1. open public verification page;
2. submit a designated invalid synthetic code and verify generic invalid response;
3. authenticated internal API health probe using restricted synthetic principal where organizationally allowed;
4. read-only certificate registry query against synthetic/non-sensitive scope;
5. artifact-storage HEAD/metadata check using a designated synthetic object.

---

# 12. Backup Strategy for Certificate-Owned Tables

## 12.1 Owned Tables

Per the ER baseline and Part 4 ownership analysis, Certificate Management owns:

1. `Certificate`
2. `CertificateVerification`
3. `CertificateReissueRequest`

No Certificate backup procedure may claim ownership of:

- `Enrollment`;
- `CourseCompletion`;
- `CompletionApproval`;
- `Invoice`;
- `Payment`;
- `Receipt`;
- `Refund`;
- `Receivable`;
- `NumberingSeries`;
- `User`, `Role`, `Permission`, `UserBranchAccess`;
- `AuditLog`, `ApprovalRequest`, `ApprovalHistory`;
- `NotificationRequest`, `NotificationLog`;
- `DashboardDefinition`, `DashboardWidget`, `MetricSnapshot`.

Those are recovered under their owning contexts or platform-wide database recovery procedures.

## 12.2 Backup Requirements

The Certificate-owned tables must be included in the platform database backup policy.

Minimum requirements:

- automated full backup according to platform policy;
- transaction-log/WAL/binlog or equivalent point-in-time recovery support where database platform supports it;
- encrypted backup at rest and in transit;
- access restricted to authorized infrastructure/database operators;
- backup success monitored;
- backup age monitored;
- restore test performed at least quarterly in a non-production isolated environment;
- restore evidence retained according to operations policy;
- backup retention aligned with approved ASTI retention/compliance policy once finalized.

Part 10 NFR recovery targets apply. Where the platform-wide database has stricter RPO/RTO, the stricter target governs.

## 12.3 Artifact Backup and Durability

Certificate PDFs and related artifact objects are not fully represented by relational backup alone.

Required controls:

- private object storage;
- object versioning or immutable-object controls where available;
- platform durability appropriate to issued certificate records;
- lifecycle policy that does not delete active historical certificates without approved retention rule;
- backup/replication policy consistent with recovery objectives;
- metadata-to-object reconciliation checks;
- integrity checksum where implemented;
- no dependency on expiring signed URLs as stored artifact references.

The database should store a stable private object key/reference. Signed URLs are generated at access time and must not be treated as durable data.

---

# 13. Recovery Procedures

## 13.1 Recovery Decision Tree

```text
Incident detected
      |
      v
Is corruption limited to a Certificate-owned row/table?
      | yes
      v
Can repair be performed from authoritative audit/history and intact dependencies?
      | yes --> controlled application-level repair + audit
      | no
      v
Is point-in-time table-level logical recovery safe and referentially consistent?
      | yes --> restore to isolated DB, extract verified rows, controlled import
      | no
      v
Coordinate platform/database PITR across affected contexts
```

Do not perform ad-hoc direct production SQL mutation for lifecycle state repair without an approved incident procedure, business owner approval where required, and audit trail.

## 13.2 Full Database Recovery

For platform-wide loss/corruption:

1. Declare incident and stop unsafe writes if required.
2. Identify target recovery point.
3. Confirm recovery point relative to Certificate, Completion, Finance, Numbering, Audit, and Notification transactions.
4. Execute platform database PITR/restore procedure.
5. Restore or validate private artifact storage to a consistent point.
6. Run Certificate referential-integrity checks.
7. Run metadata-to-artifact reconciliation.
8. Run approved cross-context reconciliation:
   - certificate → enrollment exists;
   - certificate → completion eligibility still coherent;
   - certificate payment gate evidence can be revalidated where applicable;
   - reissue lineage is intact;
   - audit correlation exists for sensitive lifecycle transitions where required.
9. Rebuild read-only reporting projections from authoritative transactional sources.
10. Retry/reconcile missing notification requests where business policy requires.
11. Reopen writes after integrity sign-off.

## 13.3 Table-Level Logical Recovery

For accidental corruption limited to Certificate-owned tables:

1. Do not restore directly over production immediately.
2. Restore backup/PITR copy into isolated recovery database.
3. Identify exact rows and recovery point.
4. Compare current production rows, recovered rows, Audit history, and cross-context authoritative state.
5. Prepare deterministic repair script using primary keys.
6. Review for:
   - branch ownership;
   - enrollment relation;
   - status/version value;
   - verification-code uniqueness;
   - certificate-number uniqueness;
   - reissue lineage;
   - artifact reference integrity.
7. Obtain required approvals.
8. Execute in controlled transaction or approved repair command.
9. Record repair audit event/reason.
10. Run reconciliation checks.
11. Rebuild affected read models.

## 13.4 Recovery Validation Queries/Checks

After recovery, validate at minimum:

- row counts versus recovery expectation;
- no orphan Certificate → Enrollment references;
- no orphan CertificateVerification → Certificate references;
- no orphan CertificateReissueRequest → Certificate references;
- no invalid `newCertificateId` references where populated;
- certificate number uniqueness;
- verification code uniqueness;
- no impossible status transition introduced by recovery;
- no hard-deleted historical records unexpectedly missing;
- artifact object exists for all states requiring an artifact;
- branch-scoped registry returns expected test records;
- public verification returns correct valid/revoked behavior;
- audit correlation exists for recovered sensitive state when applicable.

---

# 14. Reconciliation Jobs and Operational Controls

## 14.1 Certificate Consistency Reconciliation

Run on an approved schedule, for example daily and on demand after incidents.

Checks:

1. Certificate enrollment reference exists.
2. Certificate course and batch references remain consistent with the linked Enrollment snapshot/contract.
3. Certificate number is unique.
4. Verification code is unique.
5. Artifact reference exists and storage object is accessible to the service identity.
6. Reissue request original certificate exists.
7. Approved/replacement-completed reissue lineage is internally coherent.
8. `newCertificateId`, when populated, exists.
9. Soft-deleted records are excluded from normal active registry but retained historically.
10. Read-model counts reconcile to authoritative transactional counts within freshness tolerance.

## 14.2 Completion and Finance Revalidation

This reconciliation is diagnostic; it must not rewrite Completion or Finance.

For a sampled or exception population:

- re-read completion decision;
- re-read payment validation where configured;
- compare with Certificate lifecycle timestamps and state;
- flag inconsistencies for investigation.

Possible reasons for discrepancy:

- legitimate later refund or business change;
- historical migration;
- defect in earlier command validation;
- recovery inconsistency;
- stale read model.

Do not automatically revoke certificates based only on reconciliation output. Revocation remains an explicit Certificate lifecycle command with authorization, reason, and audit requirements.

## 14.3 Notification Reconciliation

Because Communication owns delivery:

1. locate Certificate lifecycle events/committed state requiring notification;
2. locate corresponding Communication request by correlation/deduplication key;
3. submit missing request through the Communication application port;
4. never insert directly into Communication tables;
5. do not revert committed Certificate state because a notification is delayed.

## 14.4 Reporting Projection Reconciliation

1. compare projection watermark with authoritative transactional timestamp/version;
2. identify missing/stale projection rows;
3. rebuild affected projection range or full read model;
4. validate counts and samples;
5. clear lag alert only after freshness threshold is met.

Read models remain read-only and are rebuildable. They must never be used to reconstruct authoritative Certificate state without authoritative-table validation.

---

# 15. Troubleshooting Runbooks

## RB-CERT-001 – Elevated Certificate API 5xx Errors

### Trigger

- high 5xx rate alert;
- multiple portal screens fail;
- Server Actions return generic technical errors.

### Diagnosis

1. Check deployment/version timeline.
2. Segment errors by endpoint family.
3. Inspect trace samples for common failing span.
4. Check database health and connection saturation.
5. Check dependency error metrics.
6. Check storage errors for artifact routes.
7. Check recent migration status.
8. Compare one failing trace with a successful trace.

### Recovery

- rollback application if failure correlates with deploy and schema remains backward compatible;
- disable only nonessential affected capability through approved feature configuration if available;
- scale application/database capacity if saturation is confirmed;
- follow dependency-specific runbook when failure is external.

### Verification

- 5xx rate returns below threshold;
- P95 latency normalizes;
- smoke tests pass;
- no partial lifecycle transitions exist.

---

## RB-CERT-002 – Certificate Generation Failing

### Symptoms

- `certificate.generate.failed` increases;
- users receive technical generation errors;
- readiness may still show eligible.

### Diagnosis

1. Separate business rejection from technical failure.
2. Inspect generation trace spans:
   - authorization;
   - Enrollment read;
   - Completion decision;
   - Finance validation;
   - Numbering;
   - renderer;
   - storage;
   - transaction;
   - Audit.
3. Identify first failing span.
4. Check idempotency replay behavior before retrying.
5. Check whether a Certificate row was committed.
6. Check whether an artifact exists without a committed row or vice versa.

### Recovery

- dependency failure: follow owning dependency runbook;
- render failure: RB-CERT-016;
- storage failure: RB-CERT-006;
- audit failure: RB-CERT-008;
- orphan artifact: quarantine/delete only according to storage retention procedure if no committed Certificate references it;
- committed Certificate but response lost: return/retrieve idempotent existing result rather than generating duplicate.

### Verification

- retry with same idempotency key returns deterministic result;
- no duplicate certificate number/code;
- artifact exists;
- Audit correlation exists where mandatory.

---

## RB-CERT-003 – Completion Dependency Unavailable or Inconsistent

### Symptoms

- readiness/generation fails with Completion dependency error;
- traces show `completion.readDecision` timeout/failure.

### Diagnosis

1. Confirm dependency error rate and latency.
2. Check whether issue is timeout, authorization between modules, schema/contract mismatch, or unavailable database path.
3. Verify application version compatibility.
4. Compare direct Completion context health owned by its team/module.

### Safety Rule

Do not generate or issue a certificate by using a client-provided `completionApproved=true` flag or stale UI state.

### Recovery

- restore Completion capability under its owner;
- retry command only after authoritative decision can be read;
- use original idempotency key for retried generation.

### Verification

- authoritative decision call succeeds;
- blocked enrollment remains blocked;
- eligible enrollment proceeds without modifying Completion tables.

---

## RB-CERT-004 – Finance Payment Validation Unavailable

### Symptoms

- generation/issuance fails where payment validation is required;
- Finance validation traces timeout.

### Safety Rule

Do not mark payment complete or update invoices/payments from Certificate Management.

### Recovery

1. Confirm whether course/completion rule requires payment validation.
2. Confirm Finance dependency outage.
3. Restore Finance read contract under Finance owner.
4. Retry Certificate command with same idempotency key where applicable.

### Verification

- paid/validated case succeeds;
- unpaid case remains blocked;
- no Finance table mutation occurred from Certificate module.

---

## RB-CERT-005 – Certificate Number Allocation Failure

### Symptoms

- Numbering allocation span fails;
- generation stops before Certificate commit.

### Diagnosis

1. Check `NumberingSeries` capability health.
2. Check exhausted/invalid sequence configuration.
3. Check branch-series configuration where applicable.
4. Check transaction contention/deadlock.

### Safety Rule

Never generate a local fallback number in Certificate Management.

### Recovery

- Configuration owner repairs numbering series/configuration;
- retry original command safely;
- verify allocated number uniqueness.

---

## RB-CERT-006 – Artifact Storage Unavailable

### Symptoms

- PDF renders but upload fails;
- artifact download fails across many certificates;
- storage latency spikes.

### Diagnosis

1. Check storage platform status.
2. Check service credential validity.
3. Check bucket/container policy.
4. Check quota/capacity.
5. Check network/DNS path.
6. Distinguish upload failure from download authorization failure.

### Recovery

- restore storage access;
- retry generation using idempotency semantics;
- never mark artifact-dependent generation successful unless durable artifact persistence requirement is met;
- for download-only outage, preserve Certificate state and restore access path.

---

## RB-CERT-007 – Certificate Metadata Exists but Artifact Is Missing

### Trigger

- reconciliation detects missing object;
- user receives artifact-not-found for issued certificate.

### Diagnosis

1. Verify stored stable object key.
2. Check object version/history.
3. Check accidental lifecycle deletion policy.
4. Check whether generation transaction was historically non-atomic.
5. Verify artifact hash metadata if available.

### Recovery Options

1. Restore artifact from storage version/backup if exact original exists.
2. If regeneration is legally/business acceptable, use controlled regeneration procedure preserving certificate identity and audit trail; do not create a new certificate number accidentally.
3. If exact document cannot be recovered, escalate to business owner and Compliance; do not silently substitute an unverified artifact.

### Verification

- object exists;
- authorized download succeeds;
- public verification still maps to correct Certificate record;
- audit incident/repair record exists.

---

## RB-CERT-008 – Mandatory Audit Write Failure

### Symptoms

- sensitive command fails with audit persistence error;
- Audit dependency unavailable.

### Safety Policy

For commands configured as mandatory-audit atomic operations, fail closed and do not claim success without required audit durability.

### Diagnosis

1. Check Audit context health.
2. Check transaction/application-port behavior.
3. Determine whether Certificate state committed despite audit failure.
4. Correlate by trace/correlation ID.

### Recovery

- if no Certificate commit: restore Audit and retry command;
- if partial commit exists contrary to contract: declare integrity incident, freeze affected record lifecycle, reconstruct audit from trace/request evidence under approved process, and repair atomicity defect;
- do not manually forge an audit row without controlled incident procedure.

---

## RB-CERT-009 – Public Verification Unavailable

### Symptoms

- public verification 5xx alert;
- QR verification fails.

### Diagnosis

1. Check route/runtime health.
2. Check database/read path.
3. Check rate limiter dependency/configuration.
4. Check deployment regression.
5. Confirm TLS/DNS/public route.

### Recovery

- rollback defective release;
- restore DB/read path;
- restore abuse-control capability with secure fallback policy;
- do not expose internal registry endpoint as temporary replacement.

### Verification

- known valid test certificate returns minimal valid response;
- invalid synthetic code returns generic invalid response;
- revoked test record returns correct revoked outcome;
- no PII leakage.

---

## RB-CERT-010 – Public Verification Abuse or Enumeration Attempt

### Trigger

- abnormal invalid-code volume;
- rate-limit actions spike;
- security monitoring identifies scraping behavior.

### Response

1. Confirm signal is not legitimate campaign/event traffic.
2. Inspect coarse network/rate-limit dimensions without exposing raw codes.
3. Tighten rate limits/challenges through approved security configuration.
4. Block malicious source ranges only under security/network policy.
5. Verify valid-user success remains acceptable.
6. Review verification response uniformity and timing characteristics.
7. Escalate security incident if compromise is suspected.

---

## RB-CERT-011 – Notification Request Backlog

### Symptoms

- Certificate state committed, but student notification delayed;
- retry backlog grows.

### Diagnosis

1. Confirm Certificate state is committed.
2. Check Communication context availability.
3. Check deduplication/correlation key behavior.
4. Identify oldest pending retry.

### Recovery

1. Restore Communication request path.
2. Replay missing notification requests using deduplication keys.
3. Do not roll back issued/generated/revoked Certificate state.
4. Do not insert directly into Notification tables.

### Verification

- backlog drains;
- duplicate messages remain within deduplication policy;
- Certificate state unchanged.

---

## RB-CERT-012 – Reporting Projection Lag or Stale Dashboard

### Symptoms

- dashboard count differs from registry;
- projection lag metric exceeds threshold.

### Diagnosis

1. Check projection watermark.
2. Check last successful refresh.
3. Check database/reporting resource saturation.
4. Compare authoritative table count for bounded filter to read model.

### Recovery

- restart/repair projection refresh;
- rebuild affected date/branch range;
- full rebuild if required;
- mark UI/report freshness accurately during lag.

### Safety Rule

Never update Certificate transactional rows to make a report count match.

---

## RB-CERT-013 – Database Integrity or Lineage Discrepancy

### Trigger

- orphan FK/reference detected;
- duplicate certificate number or verification code;
- invalid reissue lineage.

### Response

1. Stop affected mutation path if ongoing corruption is possible.
2. Capture query evidence and correlation IDs.
3. Identify earliest affected version/deployment.
4. Compare Audit history and backup state.
5. Prepare controlled repair plan.
6. Resolve application defect before resuming affected command.
7. Repair with approved transactional script/application command.
8. Run full reconciliation.

### Escalation

Duplicate externally issued certificate numbers or verification codes are high-severity integrity incidents.

---

## RB-CERT-014 – Optimistic Concurrency Conflict Spike

### Symptoms

- HTTP 409 / concurrency error rate rises;
- multiple operators modify same certificate/reissue request.

### Diagnosis

1. Identify command and screen.
2. Confirm clients are sending version/ETag as specified.
3. Check accidental automated retries with stale version.
4. Check UI duplicate-submit behavior.
5. Check long-running command duration.

### Recovery

- fix client refresh/retry flow;
- use idempotency for duplicate command submission;
- do not disable optimistic locking globally;
- guide users to reload latest state before retrying conflicting state transition.

---

## RB-CERT-015 – Approved Reissue Request Stuck Before Replacement

### Symptoms

- approved request exceeds replacement SLA;
- replacement generation repeatedly fails.

### Diagnosis

1. inspect request state/version;
2. inspect original Certificate state;
3. validate replacement-generation authorization;
4. check Completion/Finance revalidation policy required by FRD;
5. check Numbering, rendering, storage, Audit dependencies;
6. check `newCertificateId` lineage consistency.

### Recovery

- restore failing dependency;
- retry replacement generation idempotently;
- preserve original certificate and reissue request history;
- do not mark request completed until replacement transaction succeeds.

---

## RB-CERT-016 – PDF Rendering Failure or Bilingual Layout Defect

### Symptoms

- renderer timeout;
- corrupted PDF;
- missing Arabic glyphs;
- incorrect RTL/LTR layout;
- QR not rendered/readable.

### Diagnosis

1. capture renderer error category without logging certificate content;
2. check template/application version;
3. check approved font availability inside deployment image without exposing font assets externally;
4. check language payload and direction settings;
5. validate renderer memory/CPU saturation;
6. validate QR generation input and image embedding.

### Recovery

- rollback defective template/application release;
- repair rendering dependency/configuration;
- regenerate only through controlled idempotent procedure;
- verify artifact integrity before lifecycle continuation.

### Verification

- English sample renders correctly;
- Arabic sample renders correctly in RTL;
- mixed-direction identifiers remain readable;
- QR verification succeeds;
- PDF accessibility/visual checks pass according to approved test baseline.

---

## RB-CERT-017 – Cross-Branch Data Exposure Suspected

### Symptoms

- user reports certificate from unauthorized branch;
- security test or log indicates branch-scope bypass.

### Response

1. Treat as security incident.
2. Capture user, role, permission, requested branch, effective branch set, route, trace ID.
3. Disable affected endpoint or feature if exposure continues.
4. Verify IAM effective-scope resolution.
5. Check query predicate application and export code path.
6. Check parent/child branch expansion logic.
7. Test list, detail, download, export, and report paths independently.
8. Remediate and deploy.
9. Review access logs for exposure scope.
10. Notify Security/Compliance according to policy.

### Verification

- direct ID access is denied outside effective scope;
- list queries cannot leak rows;
- exports cannot include unauthorized branch data;
- signed artifact access cannot be acquired for unauthorized record.

---

## RB-CERT-018 – Failed Deployment or Migration

### Symptoms

- readiness fails after deployment;
- migration error;
- status enum mismatch;
- query failures after schema change.

### Response

1. stop rollout;
2. preserve error logs and migration state;
3. determine whether migration partially applied;
4. do not blindly rerun destructive SQL;
5. rollback application only if schema is backward compatible;
6. otherwise execute reviewed forward-fix migration;
7. verify owned table constraints and indexes;
8. run smoke tests and reconciliation.

---

## RB-CERT-019 – Restore After Accidental Soft-Delete Misuse

### Symptoms

- active certificate disappears from registry due to incorrect `deletedAt`/`isActive` mutation.

### Response

1. verify whether action was authorized and auditable;
2. inspect record history/Audit;
3. confirm certificate lifecycle status and reissue lineage;
4. restore through approved application/admin repair flow, not raw UI bypass;
5. record reason and actor;
6. rebuild read models if required.

Hard deletion remains prohibited.

---

## RB-CERT-020 – Certificate State and Enrollment Summary Drift

### Context

The ER includes certificate-related summary/status fields on Enrollment while Certificate Management owns the Certificate lifecycle. Drift may occur if cross-context summary synchronization fails.

### Diagnosis

1. compare Certificate authoritative state with Enrollment summary/status field;
2. inspect lifecycle correlation and integration event/application-port result;
3. confirm which field is authoritative for the questioned decision;
4. identify synchronization failure.

### Recovery

- repair the projection/summary through Admission & Enrollment-owned application path;
- do not write Enrollment directly from Certificate repository code;
- preserve Certificate state;
- add reconciliation coverage for recurrence.

---

# 16. Operational Security Procedures

## 16.1 Temporary Log-Level Elevation

1. Require operator authorization.
2. Set bounded expiration/reversion time.
3. Never enable request-body logging for sensitive endpoints.
4. Verify redaction remains active.
5. Record operational change.
6. Return to normal level after diagnosis.

## 16.2 Artifact Access Investigation

When investigating suspected unauthorized download:

- correlate authentication event;
- IAM permission decision;
- effective branch scope;
- Certificate entity ID;
- signed URL issuance event if logged safely;
- object access logs;
- client/network metadata allowed by policy.

Do not copy the certificate PDF into tickets or chat systems unless explicitly approved.

## 16.3 Manual Data Repair Governance

Any manual/controlled repair must document:

- incident ID;
- affected entity IDs;
- business impact;
- source of truth used;
- before state;
- repair operation;
- after state;
- approver;
- operator;
- timestamp;
- validation evidence.

---

# 17. Capacity and Scalability Operations

Part 10 performance/scale targets must be observed operationally.

Capacity review should track:

- Certificate table row growth;
- CertificateVerification log growth;
- ReissueRequest growth;
- artifact storage size and object count;
- public verification request rate;
- renderer CPU/memory and concurrency queue;
- database index size;
- read-model refresh duration;
- export memory/time usage.

## 17.1 Scaling Rules

1. Scale stateless web/runtime instances horizontally when CPU, latency, or concurrency justifies it.
2. Bound renderer concurrency independently to avoid exhausting application resources.
3. Do not allow exports to run unbounded in request memory.
4. Paginate registry, verification activity, and reissue lists server-side.
5. Partition/archive verification history only through approved data-retention and schema strategy.
6. Use indexes defined in Part 4/8 based on observed query plans.
7. Treat Reporting read models as optimization only; authoritative writes remain on transactional tables.

---

# 18. Backup and Recovery Test Schedule

| Exercise                                 | Minimum Frequency                                              | Evidence                                   |
| ---------------------------------------- | -------------------------------------------------------------- | ------------------------------------------ |
| Backup success review                    | Daily automated monitoring                                     | backup status and age                      |
| Certificate-owned logical restore test   | Quarterly                                                      | restored row counts, integrity checks      |
| Artifact restore/version recovery test   | Quarterly                                                      | object recovery evidence                   |
| Full platform disaster recovery exercise | According to platform DR policy, at least annually recommended | RPO/RTO measurement                        |
| Read-model rebuild test                  | Quarterly or after schema change                               | rebuild duration and reconciliation result |
| Notification reconciliation drill        | Semiannual                                                     | missing-request replay evidence            |

The exact legal backup retention duration remains an open compliance input and must not be invented by the Certificate module.

---

# 19. Operational Acceptance Checklist

Before Module 11 production go-live:

- [ ] structured JSON logging enabled;
- [ ] redaction tests pass;
- [ ] trace propagation works across all required application-port boundaries;
- [ ] golden signal metrics visible;
- [ ] Certificate domain metrics visible;
- [ ] operational dashboard exists;
- [ ] security dashboard exists;
- [ ] alert rules link to runbooks;
- [ ] liveness and readiness probes pass;
- [ ] capability health view is available to authorized operators;
- [ ] backup includes all Certificate-owned tables;
- [ ] artifact durability/restore mechanism validated;
- [ ] quarterly logical restore procedure tested;
- [ ] reconciliation job can run on demand;
- [ ] notification reconciliation procedure tested;
- [ ] reporting projection rebuild tested;
- [ ] branch isolation smoke tests pass;
- [ ] public verification privacy test passes;
- [ ] idempotent retry test passes;
- [ ] mandatory Audit failure behavior test passes;
- [ ] runbook owners are assigned operationally;
- [ ] known DDD/ER gaps have tracked architecture/schema decisions.

---

# 20. Final Cross-Part Consistency Check

This section validates Module 11 after Parts 1–11 against the DDD Context Map and ER Model.

## 20.1 DDD Ownership Consistency

| Concern                         | DDD Owner                   | FRD Treatment                                                            | Result  |
| ------------------------------- | --------------------------- | ------------------------------------------------------------------------ | ------- |
| Certificate lifecycle           | Certificate Management      | generate, issue, verify, reissue, replacement, revoke                    | Aligned |
| Completion rule definition      | Course Catalog              | referenced, never redefined by Certificate module                        | Aligned |
| Completion evaluation/approval  | Exam, Result & Completion   | consumed as authoritative decision                                       | Aligned |
| Payment truth                   | Finance & Receivables       | consumed as authoritative validation                                     | Aligned |
| Enrollment lifecycle            | Admission & Enrollment      | central reference; Certificate does not create/modify learning lifecycle | Aligned |
| Permission and branch access    | Identity & Access           | server-side delegated authorization and scope resolution                 | Aligned |
| Numbering policy                | Configuration / Master Data | delegated certificate-number allocation                                  | Aligned |
| Notification templates/delivery | Communication               | Certificate requests notification; does not own delivery log             | Aligned |
| Audit history                   | Audit & Compliance          | mandatory sensitive-action audit integration                             | Aligned |
| Reporting                       | Reporting & Dashboards      | explicitly read-only read models and snapshots                           | Aligned |

## 20.2 Core Aggregate Ownership Proof

The final module behavior satisfies the DDD aggregate ownership rule:

```text
Certificate command
      |
      +--> reads Enrollment reference
      +--> reads Completion decision
      +--> reads Finance validation where configured
      +--> obtains Number from Configuration
      |
      v
mutates Certificate-owned aggregate/tables only
      |
      +--> records Audit through owner interface
      +--> requests Communication side effect
      +--> updates/rebuilds read-only reporting projection
```

The module does **not**:

- approve CourseCompletion;
- modify CompletionApproval;
- mark Invoice or Payment as paid;
- create or alter Enrollment lifecycle state as part of certificate business logic;
- assign IAM roles or branch access;
- own notification delivery status;
- make reporting views authoritative.

Result: **DDD ownership remains aligned across Parts 1–11.**

## 20.3 ER Entity Consistency

| ER Entity                   | FRD Classification       | Operational Treatment                                      | Result  |
| --------------------------- | ------------------------ | ---------------------------------------------------------- | ------- |
| `Certificate`               | Owned                    | transactional backup, integrity check, lifecycle telemetry | Aligned |
| `CertificateVerification`   | Owned                    | verification logging, backup, scale monitoring             | Aligned |
| `CertificateReissueRequest` | Owned                    | workflow backup, lineage checks, backlog monitoring        | Aligned |
| `Enrollment`                | Referenced               | read dependency only; owner-coordinated summary repair     | Aligned |
| `CourseCompletion`          | Referenced               | eligibility read only                                      | Aligned |
| `CompletionApproval`        | Referenced               | approval read only                                         | Aligned |
| Finance entities            | Referenced               | payment validation only                                    | Aligned |
| `NumberingSeries`           | Referenced               | number allocation through owner interface                  | Aligned |
| IAM entities                | Referenced               | auth and scope only                                        | Aligned |
| Audit entities              | External owner           | Audit port and reconciliation, no direct writes            | Aligned |
| Communication entities      | External owner           | request/retry via owner interface                          | Aligned |
| Reporting entities          | External owner/read-only | projection refresh/rebuild only                            | Aligned |

## 20.4 Enrollment-Centric Consistency

The FRD continues to preserve:

```text
Student / Participant
        ↓
Enrollment
        ↓
Course + Batch
        ↓
Completion Evaluation
        ↓
Certificate Eligibility
        ↓
Certificate Lifecycle
```

No screen, API, database table, runbook, or recovery process introduces a certificate path that bypasses Enrollment.

Result: **Aligned.**

## 20.5 Branch Isolation Consistency

Across Parts 1–11:

- authorization is server-side;
- branch filters are applied before data access;
- parent/child expansion is delegated to IAM policy;
- consolidated reporting requires separate entitlement;
- public verification is a deliberately limited exception with privacy-minimized DTO;
- backup/recovery procedures preserve branch identifiers;
- runbooks test list, detail, download, export, and reporting paths separately.

Result: **Aligned.**

## 20.6 Soft Delete and Audit Consistency

Across Parts 1–11:

- no hard-delete operation is exposed;
- Certificate-owned records use repository conventions for soft delete where applicable;
- lifecycle state changes are not represented as deletion;
- generation, issuance, reissue approval/rejection, replacement generation, revocation, sensitive export/access where required, and controlled repairs are auditable;
- operational recovery requires correlation and repair evidence.

Result: **Aligned, subject to final physical Prisma-schema verification.**

## 20.7 Modular Monolith Consistency

No Part 1–11 requirement mandates:

- independent Certificate microservice;
- external message broker;
- CQRS write/read architecture;
- Event Sourcing.

Read models in Part 8 are query optimizations only and remain read-only.

Result: **Aligned.**

---

# 21. Known DDD/ER Gaps Still Open After Part 11

The final consistency check confirms that the FRD remains aligned by explicitly preserving, rather than silently resolving, these source-model gaps.

| Gap ID       | Gap                                                                                           | Impact                                                                           | Required Decision Owner      |
| ------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------- |
| GAP-CERT-001 | DDD names `CertificateIssueLog`, ER has no corresponding entity                               | detailed issuance-event persistence model unresolved                             | DDD/ER architecture decision |
| GAP-CERT-002 | DDD conceptual `CertificateQRCode`; ER stores `qrCodeUrl` on Certificate                      | QR persistence strategy must remain ER-compatible unless model changed           | Architecture/data model      |
| GAP-CERT-003 | Revocation is a DDD responsibility, but ER lacks `revokedAt`, `revokedBy`, `revocationReason` | compliance reporting and recovery evidence incomplete                            | ER/schema amendment          |
| GAP-CERT-004 | Certificate status enum values are not explicitly enumerated in ER                            | state machine must be mapped to approved physical enum                           | Domain/data model            |
| GAP-CERT-005 | Reissue request status enum values are not explicitly enumerated                              | workflow persistence mapping pending                                             | Domain/data model            |
| GAP-CERT-006 | ER cardinality says Enrollment 1:1 Certificate, while reissue has `newCertificateId`          | replacement lineage/uniqueness constraint unresolved                             | DDD/ER architecture decision |
| GAP-CERT-007 | Reissue rejection metadata is not fully represented in ER                                     | rejection reason/history relies on Audit/Approval representation                 | Data model/Audit design      |
| GAP-CERT-008 | DDD event catalog does not explicitly list `CertificateRevoked`                               | notification/integration event contract needs formal approval                    | DDD event catalog            |
| GAP-CERT-009 | Artifact checksum/version metadata is not explicit in ER                                      | integrity implementation may require infrastructure metadata or schema extension | Security/data model          |
| GAP-CERT-010 | Exact legal retention duration is not defined                                                 | backup/artifact lifecycle duration cannot be finalized                           | Compliance/business          |
| GAP-CERT-011 | Prisma schema was not supplied for validation                                                 | physical constraints, enum names, indexes, delete actions not yet verified       | Implementation/schema review |

No production schema migration should silently resolve these gaps without updating the authoritative architecture/data-model decision records.

---

# 22. Final Operational Consistency Statement

After Parts 1–11, Module 11 – Certificate Management remains consistent with the supplied DDD Context Map v3.0 and ER Model v3.0 at the functional, ownership, workflow, UI, persistence, API, authorization, validation, reporting, testing, security, and operational levels.

The operational model confirms:

1. **Certificate Management owns the Certificate lifecycle and only its approved persistence models.**
2. **Enrollment remains central to every certificate.**
3. **Completion and Finance decisions are consumed, not recomputed or mutated.**
4. **IAM remains authoritative for permissions and branch isolation.**
5. **Audit, Communication, Configuration, and Reporting retain their own ownership boundaries.**
6. **Read models remain explicitly read-only.**
7. **No microservice, external broker, CQRS/Event Sourcing requirement has been introduced.**
8. **Soft-delete and audit principles remain intact.**
9. **Recovery procedures do not permit Certificate Management to rewrite another context's authoritative tables.**
10. **All known DDD/ER ambiguities are visible as gaps requiring explicit architecture or schema decisions.**

Therefore, the Module 11 FRD set is operationally coherent and DDD-aligned, with Prisma-level physical verification and the listed model gaps remaining as the final implementation-governance actions.
