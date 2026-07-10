# Part 11 - Deployment, Operations, Observability, Runbooks

## Module 14 - Corporate Training Management

## Document Control

| Field | Value |
|---|---|
| Module | Module 14 - Corporate Training Management |
| Module Code | CTM |
| Owning Bounded Context | Corporate Training Management |
| Architecture Style | TypeScript/Next.js monorepo modular monolith |
| Primary Runtime | Admin Portal application with CTM package/application services |
| Primary Database | PostgreSQL via Prisma |
| Operational Style | Synchronous modular-monolith application boundaries with bounded background jobs where required |
| Source Baselines | DDD Context Map v3.0; ER Model v3.0; ASTI ERP Workflow; Module 14 Overview; Parts 1-10 |
| Status | Draft for review |

---

# 1. Purpose

This document defines the deployment, operations, observability, recovery, and troubleshooting requirements for Module 14 - Corporate Training Management.

It covers:

1. runtime deployment boundaries;
2. startup and readiness requirements;
3. structured logging;
4. tracing boundaries;
5. metrics instrumentation;
6. health checks and dependency checks;
7. operational dashboards and alerts;
8. backup and recovery for CTM-owned tables;
9. data-reconciliation operations;
10. troubleshooting runbooks;
11. deployment and rollback procedures;
12. final DDD and ER consistency verification after Parts 1-11.

The governing operational principle is:

> Module 14 is deployed as part of the ASTI IMS modular monolith. Operational isolation is achieved through package boundaries, application-service contracts, data ownership, permissions, scoped repositories, telemetry dimensions, and runbooks—not by introducing a separate microservice, external broker, or independent CTM database.

---

# 2. Deployment Architecture

## 2.1 Runtime Placement

CTM is implemented inside the ASTI IMS monorepo.

Recommended logical placement:

```text
asti-ims
│
├── apps
│   └── admin-portal
│
├── packages
│   ├── corporate-training
│   ├── admission-enrollment
│   ├── course-catalog
│   ├── training-delivery
│   ├── scheduling-calendar
│   ├── finance-receivables
│   ├── communication-notifications
│   ├── documents
│   ├── reporting-dashboards
│   ├── audit-compliance
│   └── shared
│
└── packages/database
    └── prisma
```

CTM must not be deployed as a separate service unless architecture governance explicitly changes the modular-monolith decision.

## 2.2 Runtime Components

The CTM runtime consists of:

- Admin Portal routes and server components;
- Route Handlers / REST endpoints;
- typed Server Actions where used;
- CTM application services;
- CTM domain services and aggregate logic;
- CTM repositories;
- cross-context application-boundary adapters;
- bulk import processing jobs;
- report export jobs;
- contract expiry evaluation jobs;
- reconciliation jobs;
- metrics, tracing, and structured logging instrumentation.

## 2.3 CTM-Owned Persistence

The approved CTM-owned transactional tables are:

```text
CorporateAccount
CorporateContact
CorporateContract
CorporateParticipant
CorporateEnrollment
```

Operational state related to imports, exports, or reconciliation may use approved infrastructure/job records only where already defined by the platform architecture. Such operational records do not redefine the CTM business aggregate model.

---

# 3. Environment Strategy

Recommended environments:

```text
Local
Development
Test / CI
Staging / UAT
Production
```

Each environment must have:

- isolated database credentials;
- isolated storage credentials;
- isolated auth configuration;
- isolated notification-provider configuration;
- environment-specific observability labels;
- no production PII copied into lower environments unless anonymized through an approved process.

Required telemetry dimensions:

```text
environment
region, where applicable
service
module
version
deploymentId
```

---

# 4. Configuration Management

CTM configuration must be externalized from code where values are operational or business-configurable.

Examples:

- contract expiry reminder thresholds;
- bulk import maximum file size;
- bulk import maximum row count;
- bulk enrollment maximum participant count;
- export retention period;
- report page-size limits;
- retry limits for background jobs;
- polling interval for job-status screens;
- timeout values for cross-context calls;
- observability sampling controls;
- feature flags for future Corporate Portal capabilities.

Configuration changes must:

- be validated;
- be auditable where business-impacting;
- use environment-specific secrets for credentials;
- avoid embedding credentials in source code.

---

# 5. Deployment Pipeline Requirements

## 5.1 Required Pipeline Stages

```text
Source Checkout
    ↓
Dependency Install
    ↓
Type Check
    ↓
Lint
    ↓
Unit Tests
    ↓
Application-Service Tests
    ↓
BDD/Integration Tests
    ↓
Architecture Boundary Tests
    ↓
Prisma Schema Validation
    ↓
Migration Safety Check
    ↓
Build
    ↓
Security Scan
    ↓
Deploy
    ↓
Smoke Test
    ↓
Readiness Verification
```

## 5.2 Mandatory Release Gates

A release containing CTM changes must fail if:

1. TypeScript compilation fails.
2. CTM unit tests fail.
3. authorization guard tests fail.
4. branch/account isolation tests fail.
5. architecture tests detect direct CTM repository access to foreign-owned tables.
6. Prisma migration validation fails.
7. destructive migration is introduced without approved migration plan.
8. the application cannot start with required configuration.
9. smoke tests for core CTM routes fail.
10. observability instrumentation is removed from critical orchestration paths.

---

# 6. Database Migration Operations

## 6.1 Migration Principles

CTM migrations must follow expand-and-contract principles where compatibility risk exists.

Preferred sequence:

```text
1. Add nullable/new structures
2. Deploy compatible application code
3. Backfill in controlled batches
4. Validate row counts and constraints
5. Add required constraints/indexes
6. Remove deprecated structure only in later release
```

## 6.2 Destructive Changes

The following require explicit review:

- dropping CTM-owned tables;
- dropping columns;
- narrowing column types;
- removing unique constraints;
- changing foreign-key delete behavior;
- adding blocking table rewrites to large tables;
- changing account/participant identity uniqueness rules;
- changing CorporateEnrollment linkage uniqueness.

## 6.3 Foreign Keys

CTM must preserve the ownership model:

- CTM may hold foreign keys/references to foreign-owned entities;
- CTM must not use cascade delete to remove foreign-owned parent records;
- historical CTM links should use `RESTRICT`, soft-delete-aware references, or approved nullability rules;
- hard-delete cascades are prohibited for historical learning and corporate relationships.

---

# 7. Structured Logging

## 7.1 Log Format

All CTM logs must be structured JSON or the repository-standard equivalent.

Required fields:

```json
{
  "timestamp": "2026-07-11T10:30:00.000Z",
  "level": "INFO",
  "service": "admin-portal",
  "module": "corporate-training",
  "environment": "production",
  "version": "2026.7.x",
  "requestId": "req-...",
  "correlationId": "corr-...",
  "traceId": "trace-...",
  "spanId": "span-...",
  "actorUserId": "user-...",
  "permissionCode": "corporate-training.enrollment.create",
  "operation": "CreateCorporateEnrollment",
  "entityType": "CorporateParticipant",
  "entityId": "cp-...",
  "corporateAccountId": "account-...",
  "branchScope": ["branch-..."],
  "result": "SUCCESS",
  "durationMs": 420,
  "errorCode": null
}
```

## 7.2 Required Log Categories

### Request Logs

Record:

- endpoint or Server Action;
- method;
- sanitized route template;
- status;
- duration;
- actor;
- scope summary;
- correlation ID.

### Business Operation Logs

Examples:

```text
CorporateAccountCreated
CorporateContractActivated
CorporateParticipantRegistered
ParticipantImportValidationCompleted
CorporateEnrollmentOrchestrationStarted
CorporateEnrollmentOrchestrationCompleted
BillingStatusTransitioned
ReconciliationMismatchDetected
ReconciliationRepairCompleted
```

### Dependency Logs

Record:

- dependency context;
- operation;
- duration;
- result;
- dependency error classification;
- retryability;
- correlation ID.

### Authorization Denial Logs

Record:

- actor;
- permission requested;
- scope type;
- target entity class;
- denial reason;
- request/correlation ID.

Do not log the full protected entity payload.

---

# 8. Log Redaction Rules

The following must never appear in application logs:

- full Civil ID;
- passport number;
- passport image/document body;
- raw import file rows;
- authentication token;
- session cookie;
- password;
- private storage signed URL;
- full financial instrument data;
- notification provider credential;
- raw API secrets.

Recommended representation:

```text
civilIdHash
maskedCivilId
personId
documentId
paymentReference
```

Prefer stable internal references over PII.

---

# 9. Distributed Tracing Boundaries

Even in a modular monolith, traces should preserve logical bounded-context spans.

## 9.1 Required CTM Trace Spans

```text
HTTP / Server Action
    |
    v
CTM.ApplicationService
    |
    +--> IAM.Authorization
    |
    +--> Organization.ResolveCorporateOrganization
    |
    +--> Party.ResolvePerson
    |
    +--> CourseCatalog.ValidateCourse
    |
    +--> CourseCatalog.ResolvePricing
    |
    +--> TrainingDelivery.ValidateBatch
    |
    +--> TrainingDelivery.ValidateCapacity
    |
    +--> Scheduling.ValidateFeasibility
    |
    +--> Finance.ValidateCorporateCredit
    |
    +--> AdmissionEnrollment.CreateEnrollment
    |
    +--> CTM.CreateCorporateEnrollmentLink
    |
    +--> Audit.RecordCriticalAction
    |
    +--> Communication.RequestNotification
```

## 9.2 Trace Naming

Recommended span names:

```text
ctm.account.create
ctm.account.update
ctm.contract.transition
ctm.participant.create
ctm.participant.import.validate
ctm.participant.import.commit
ctm.enrollment.create
ctm.enrollment.bulk.create
ctm.billing.transition
ctm.reconciliation.detect
ctm.reconciliation.repair
ctm.report.query
ctm.export.generate
```

Dependency spans:

```text
organization.resolve
party.person.resolve
course.validate
course.pricing.resolve
batch.validate
batch.capacity.validate
schedule.feasibility.validate
finance.credit.validate
enrollment.create
communication.notification.request
audit.record
```

## 9.3 Trace Attributes

Safe attributes:

```text
ctm.operation
ctm.entity_type
ctm.account_id
ctm.contract_id
ctm.participant_id
ctm.enrollment_link_id
branch_id
batch_id
course_id
result
error_code
dependency_context
```

Do not attach raw PII or full business payloads.

---

# 10. Metrics Instrumentation

## 10.1 HTTP/API Metrics

```text
ctm_http_requests_total
ctm_http_request_duration_seconds
ctm_http_errors_total
```

Labels:

```text
route_template
method
status_class
operation
environment
```

Avoid entity IDs as metric labels.

## 10.2 Authorization Metrics

```text
ctm_authorization_denials_total
ctm_branch_scope_denials_total
ctm_account_scope_denials_total
ctm_sensitive_field_denials_total
```

Labels:

```text
permission_family
scope_type
operation
```

## 10.3 Corporate Account Metrics

```text
ctm_accounts_created_total
ctm_account_status_transitions_total
ctm_account_archive_attempts_total
ctm_account_archive_failures_total
```

## 10.4 Contract Metrics

```text
ctm_contracts_created_total
ctm_contract_status_transitions_total
ctm_contract_expiring_count
ctm_contract_transition_failures_total
```

## 10.5 Participant Metrics

```text
ctm_participants_created_total
ctm_participant_duplicates_total
ctm_participant_status_transitions_total
ctm_person_match_ambiguities_total
```

## 10.6 Import Metrics

```text
ctm_import_jobs_total
ctm_import_rows_total
ctm_import_rows_valid_total
ctm_import_rows_failed_total
ctm_import_duplicate_rows_total
ctm_import_duration_seconds
ctm_import_commit_failures_total
```

## 10.7 Corporate Enrollment Metrics

```text
ctm_enrollment_orchestration_total
ctm_enrollment_orchestration_success_total
ctm_enrollment_orchestration_failures_total
ctm_enrollment_orchestration_duration_seconds
ctm_bulk_enrollment_participants_total
ctm_bulk_enrollment_failures_total
```

Failure reason labels should use bounded values such as:

```text
participant_invalid
contract_invalid
course_invalid
batch_mismatch
capacity_exceeded
schedule_conflict
credit_blocked
dependency_timeout
enrollment_owner_rejected
link_conflict
```

## 10.8 Reconciliation Metrics

```text
ctm_reconciliation_checks_total
ctm_reconciliation_mismatches_total
ctm_reconciliation_repairs_total
ctm_reconciliation_repair_failures_total
ctm_reconciliation_resolution_duration_seconds
```

## 10.9 Reporting and Export Metrics

```text
ctm_report_queries_total
ctm_report_query_duration_seconds
ctm_export_requests_total
ctm_export_generation_duration_seconds
ctm_export_failures_total
```

---

# 11. Metric Cardinality Rules

Do not use the following as metric labels:

- `corporateAccountId`;
- `personId`;
- `participantId`;
- `contractId`;
- `enrollmentId`;
- `requestId`;
- `correlationId`;
- raw error message.

Use logs and traces for high-cardinality diagnostics.

---

# 12. Operational Dashboards

## 12.1 CTM Service Health Dashboard

Widgets:

- request rate;
- p50/p95/p99 latency;
- 4xx rate;
- 5xx rate;
- authorization denials;
- dependency error rate;
- database connection health;
- job backlog;
- export failure rate.

## 12.2 Enrollment Orchestration Dashboard

Widgets:

- orchestration request count;
- success rate;
- p95 duration;
- failure reasons;
- credit block count;
- capacity failure count;
- owner-context rejection count;
- dependency timeout count;
- duplicate/idempotent retry count.

## 12.3 Import Operations Dashboard

Widgets:

- import jobs by status;
- rows processed;
- validation success rate;
- ambiguous identity count;
- duplicate row rate;
- mean validation duration;
- commit failure rate.

## 12.4 Reconciliation Dashboard

Widgets:

- open mismatches;
- new mismatches per day;
- repaired cases;
- mean resolution time;
- repair failures;
- oldest unresolved mismatch.

---

# 13. Alerting Rules

## 13.1 Critical Alerts

Trigger immediate operational alert for:

1. sustained CTM 5xx rate above agreed threshold;
2. database unavailable;
3. failure to authorize all requests due to IAM outage;
4. repeated cross-branch leakage detection;
5. reconciliation mismatch spike suggesting data-integrity defect;
6. migration failure affecting CTM tables;
7. repeated inability to create CorporateEnrollment linkage after owner Enrollment succeeds.

## 13.2 Warning Alerts

Examples:

- elevated import failure rate;
- elevated Person ambiguity rate;
- increased credit dependency timeout rate;
- increased batch-capacity conflict rate;
- export job failures;
- contract expiry notification job missed;
- materialized view refresh stale beyond threshold.

## 13.3 Example Thresholds

Recommended starting values:

```text
5xx rate > 5% for 5 minutes → critical
p95 API latency > 2x SLO for 10 minutes → warning
Enrollment orchestration failure rate > 20% for 10 minutes → warning
Dependency timeout rate > 10% for 5 minutes → critical
Import commit failure rate > 10% across 5 jobs → warning
Reconciliation mismatches > 3x 7-day baseline → warning
```

Tune thresholds after observing production baselines.

---

# 14. Health Checks

## 14.1 Liveness Check

Purpose:

- confirm process is running;
- no external dependency calls;
- minimal overhead.

Example:

```text
GET /health/live
```

Expected:

```json
{
  "status": "UP"
}
```

## 14.2 Readiness Check

Purpose:

- determine whether instance can safely receive application traffic.

Check:

- database connectivity;
- Prisma client readiness;
- required configuration loaded;
- authentication configuration available;
- storage configuration available if CTM import/export features are enabled.

Example:

```text
GET /health/ready
```

Possible result:

```json
{
  "status": "DEGRADED",
  "checks": {
    "database": "UP",
    "authConfiguration": "UP",
    "storage": "DEGRADED"
  }
}
```

Readiness behavior must follow platform policy.

## 14.3 Dependency Health

Do not call every bounded context synchronously from the global readiness endpoint if that would create cascading outages.

Instead use:

- synthetic dependency probes;
- service-level metrics;
- timeout/error dashboards;
- optional background health checks.

---

# 15. CTM Functional Health Checks

Recommended scheduled synthetic checks:

1. read a known non-sensitive CorporateAccount test fixture in staging;
2. query Contract Expiry report;
3. validate a small participant import sample without commit;
4. execute dry-run dependency validation in staging;
5. verify report query and read-model freshness;
6. verify notification request acceptance in non-production test channel;
7. verify reconciliation scan completes.

Production synthetic checks must avoid modifying real customer data.

---

# 16. Backup Scope

## 16.1 CTM-Owned Transaction Tables

The backup/recovery plan must protect:

```text
CorporateAccount
CorporateContact
CorporateContract
CorporateParticipant
CorporateEnrollment
```

## 16.2 Supporting Operational Data

Where implemented, also protect:

- import job metadata required for operational traceability;
- idempotency records;
- reconciliation case state;
- export request metadata;
- audit references.

AuditLog itself remains owned by Audit & Compliance and follows its own backup plan.

## 16.3 Read Models

Read-only views, materialized views, and analytics snapshots must be categorized as:

```text
Rebuildable
```

They are not the sole backup source of truth.

---

# 17. Backup Requirements

Recommended baseline:

| Control | Target |
|---|---|
| Point-in-time recovery | Enabled where supported |
| RPO | ≤ 15 minutes |
| RTO | ≤ 4 hours |
| Backup encryption | Required |
| Backup access | Least privilege |
| Restore testing | At least quarterly |
| Recovery documentation | Version controlled |
| Backup monitoring | Daily success verification |

Final infrastructure standards may supersede these values.

---

# 18. Recovery Principles

## 18.1 Recovery Order

For CTM-owned data:

```text
1. Restore database platform
2. Verify common Party/Organization references
3. Verify CorporateAccount
4. Verify CorporateContact
5. Verify CorporateContract
6. Verify CorporateParticipant
7. Verify CorporateEnrollment
8. Rebuild read models/materialized views
9. Run reconciliation
10. Re-enable background jobs
11. Verify dashboards/reports
```

## 18.2 Referential Verification

Post-restore checks:

- every CorporateAccount has valid Organization reference;
- every CorporateContact has valid Account and Person reference;
- every CorporateContract references valid Account;
- every CorporateParticipant references valid Account and Person;
- every CorporateEnrollment references valid CTM Account/Participant and authoritative Enrollment;
- no duplicate active unique relationships;
- no impossible status combinations;
- no orphaned reconciliation references.

---

# 19. Recovery Validation Queries

Operational recovery scripts should verify, at minimum:

```text
Count of active accounts
Count of active contracts
Count of active participants
Count of CorporateEnrollment links
Duplicate account code check
Duplicate contract number check
Duplicate active contact relationship check
Multiple active primary contacts per account check
Duplicate active participant account-person relationship check
Broken CorporateEnrollment reference check
```

Exact SQL should be maintained in operations scripts with repository review.

---

# 20. Point-in-Time Recovery Procedure

High-level procedure:

1. declare incident and freeze CTM mutation traffic if necessary;
2. identify corruption start timestamp;
3. validate latest safe recovery point;
4. restore database to isolated recovery environment;
5. run CTM integrity checks;
6. compare source and restored counts;
7. obtain incident authorization for cutover;
8. restore/cut over according to platform database procedure;
9. run reconciliation;
10. re-enable traffic gradually;
11. verify CTM dashboards and critical flows;
12. document data-loss window against RPO;
13. close incident only after audit and reconciliation review.

---

# 21. Deployment Procedure

## 21.1 Pre-Deployment Checklist

Confirm:

- migration reviewed;
- backup recent and healthy;
- feature flags configured;
- config validated;
- observability dashboards available;
- alert routing verified;
- smoke test account available in staging;
- rollback plan documented;
- background job compatibility checked;
- API contracts backward-compatible where required.

## 21.2 Deployment Steps

```text
1. Apply backward-compatible migration
2. Deploy application version
3. Wait for readiness
4. Run smoke tests
5. Verify CTM request metrics
6. Verify dependency traces
7. Verify no branch/account isolation regression
8. Enable feature flags gradually if applicable
9. Monitor SLOs and error rates
```

## 21.3 Post-Deployment Checks

- account search works;
- account detail works;
- contract search works;
- participant search works;
- report first page loads;
- no unexpected 5xx increase;
- no authorization-denial spike caused by misconfiguration;
- enrollment orchestration dependency trace is complete in staging;
- background jobs are running;
- read model refresh timestamps are current.

---

# 22. Rollback Procedure

Rollback should be selected based on change type.

## 22.1 Application-Only Change

1. disable feature flag where available;
2. roll back application deployment;
3. verify readiness;
4. verify CTM reads and mutations;
5. monitor error rate.

## 22.2 Migration-Compatible Rollback

If schema is backward-compatible:

1. roll back application code;
2. leave additive schema in place;
3. verify compatibility;
4. schedule cleanup migration later.

## 22.3 Destructive Migration Incident

Do not automatically roll back if doing so risks greater data loss.

Use:

- incident procedure;
- PITR or restore;
- controlled reconciliation;
- explicit business/technical approval.

---

# 23. Runbook RB-CTM-001 – CTM API Error Rate Spike

## Symptoms

- elevated 5xx responses;
- CTM dashboard red;
- user reports failures across account/contract/participant screens.

## Diagnosis

1. Check deployment version change.
2. Check database health.
3. Check top error codes.
4. Check trace failure point.
5. Compare whether failures are CTM-local or dependency-related.
6. Check Prisma connection pool.
7. Check authorization configuration errors.
8. Check recent migration.

## Actions

- rollback recent application release if clearly causal and schema-compatible;
- disable affected feature flag;
- restore DB connectivity;
- isolate failing dependency path;
- keep safe read-only operations available where possible.

## Verification

- 5xx rate returns to baseline;
- p95 latency returns to target;
- smoke tests pass;
- no integrity mismatch appears.

---

# 24. Runbook RB-CTM-002 – Branch or Account Scope Leakage Suspected

## Severity

Critical security incident.

## Symptoms

- user sees another branch's account;
- account manager sees unassigned account;
- export contains unauthorized data.

## Immediate Actions

1. disable affected endpoint/report/export feature.
2. revoke generated export links.
3. preserve logs and traces.
4. identify affected actor(s), route(s), and time range.
5. notify security/compliance incident owner.

## Diagnosis

Check:

- repository scope predicate;
- active branch context;
- account assignment resolution;
- consolidated permission logic;
- caching keys;
- report read-model filtering;
- export job scope propagation.

## Remediation

- patch server-side scope logic;
- invalidate caches;
- regenerate affected exports only if required;
- run access-impact analysis;
- add regression test.

## Exit Criteria

- reproducer test passes;
- branch/account isolation BDD tests pass;
- no unauthorized records returned;
- incident audit complete.

---

# 25. Runbook RB-CTM-003 – Corporate Enrollment Orchestration Failure

## Symptoms

- enrollment requests failing;
- CTM orchestration failure metric elevated;
- users see dependency errors.

## Diagnosis Sequence

```text
1. Validate CTM participant/account relationship
2. Validate contract usability
3. Inspect Course Catalog validation span
4. Inspect Training Delivery validation span
5. Inspect Scheduling feasibility span
6. Inspect Finance credit validation span
7. Inspect Admission & Enrollment create span
8. Inspect CTM CorporateEnrollment link creation
```

## Failure-Specific Actions

### Course failure

- verify course published/enrollable;
- do not override in CTM.

### Capacity failure

- verify Batch capacity in Training Delivery;
- do not edit Batch counters from CTM.

### Credit timeout

- retry only according to policy;
- never assume PASS.

### Enrollment owner rejection

- inspect owner error code;
- do not insert Enrollment directly.

### CTM link failure after owner success

- use idempotency key and reconciliation workflow;
- do not create second Enrollment;
- detect existing returned Enrollment ID;
- repair only CTM-owned linkage.

## Verification

- retry returns same owner Enrollment result where idempotent;
- exactly one CorporateEnrollment link exists;
- no duplicate Enrollment created.

---

# 26. Runbook RB-CTM-004 – Participant Import Failure

## Symptoms

- import validation stuck;
- high row failure rate;
- commit fails;
- duplicate participants suspected.

## Diagnosis

1. Check file size and content type.
2. Check header mapping.
3. Check parser errors.
4. Check Person matching dependency.
5. Check ambiguous match count.
6. Check duplicate rows.
7. Check idempotency state.
8. Check DB unique-constraint failures.

## Actions

- fix mapping/configuration;
- retry validation using same immutable file reference;
- never auto-merge ambiguous identities;
- do not bypass validate-before-commit;
- for commit retry, reuse same idempotency key.

## Verification

- expected valid/invalid counts match;
- no duplicate Person created by CTM;
- no duplicate CorporateParticipant link created;
- final import summary is deterministic.

---

# 27. Runbook RB-CTM-005 – Contract Expiry Notifications Missing

## Symptoms

- expiring contracts not shown;
- notification not received;
- expiry job stale.

## Diagnosis

1. Check configured expiry threshold.
2. Check Oman business date/time.
3. Check contract status.
4. Check expiry query/view freshness.
5. Check scheduled job execution.
6. Check event creation.
7. Check Communication request acceptance.
8. Check delivery log in Communication context.

## Actions

- rerun expiry evaluation safely;
- de-duplicate by deterministic event key;
- repair job schedule;
- do not send duplicate notifications.

## Verification

- expiring contracts visible;
- one notification request per event threshold occurrence;
- delivery ownership remains with Communication.

---

# 28. Runbook RB-CTM-006 – Billing Status Out of Sync with Finance

## Symptoms

- CTM says INVOICED but Finance has no invoice;
- CTM remains BILLING_REQUESTED after invoice exists.

## Diagnosis

1. Compare CTM billing coordination status.
2. Resolve authoritative Finance invoice state.
3. Check correlation/reference IDs.
4. Check event/adapter processing.
5. Check manual transition audit.

## Actions

- Finance remains authoritative;
- do not modify invoice data from CTM;
- if CTM status is wrong, use approved CTM coordination repair/transition;
- preserve audit reason.

## Verification

- CTM coordination state references authoritative Finance confirmation;
- no Finance transaction altered by CTM repair.

---

# 29. Runbook RB-CTM-007 – Reconciliation Mismatch Detected

## Symptoms

- mismatch metric increases;
- reconciliation dashboard contains open exception.

## Diagnosis

1. inspect CorporateEnrollment;
2. inspect CorporateParticipant and Account;
3. retrieve authoritative Enrollment;
4. compare Person/Student/participant relationship;
5. inspect idempotency history;
6. inspect orchestration trace.

## Actions

- classify mismatch;
- determine whether source truth is CTM link or foreign owner reference;
- repair only CTM-owned linkage if deterministic;
- never edit Enrollment from CTM;
- require repair permission and reason.

## Verification

- reconciliation case closed;
- link consistent;
- audit contains old/new value;
- no foreign aggregate modified.

---

# 30. Runbook RB-CTM-008 – Read Model Stale

## Symptoms

- dashboard timestamp old;
- report differs from transaction screen;
- materialized view refresh failed.

## Diagnosis

1. check view refresh job.
2. check DB locks.
3. check source query latency.
4. check last successful refresh timestamp.
5. compare source authoritative records.

## Actions

- rerun refresh;
- reduce refresh batch size if needed;
- fix query/index issue;
- show stale-data timestamp;
- do not use stale read model for critical decisions.

## Verification

- refresh timestamp current;
- sample values match source;
- report is still read-only.

---

# 31. Runbook RB-CTM-009 – Report Export Failure

## Symptoms

- export job failed;
- user cannot download;
- storage upload error.

## Diagnosis

1. verify report permission and export permission.
2. verify scoped query completes.
3. check memory usage.
4. check storage credentials.
5. check file size.
6. check PDF/XLSX generation logs.

## Actions

- retry generation idempotently;
- stream or chunk large datasets;
- do not widen scope during retry;
- regenerate signed download access.

## Verification

- file opens;
- row count matches scoped result;
- hidden sensitive columns remain excluded;
- link expires as expected.

---

# 32. Runbook RB-CTM-010 – Database Constraint Violation

## Symptoms

Examples:

- duplicate account code;
- duplicate contract number;
- multiple primary contacts;
- duplicate participant relationship.

## Diagnosis

1. identify constraint name.
2. map to stable CTM error code.
3. inspect concurrent requests.
4. inspect application pre-check race.

## Actions

- preserve DB constraint;
- improve user-facing error mapping;
- do not remove uniqueness to hide the issue;
- add transaction or locking logic if required.

## Verification

- duplicate not inserted;
- API returns stable 409 code;
- concurrent test passes.

---

# 33. Runbook RB-CTM-011 – Database Restore and CTM Reconciliation

## Trigger

- corruption;
- accidental data change;
- database disaster recovery.

## Procedure

1. follow platform restore process.
2. validate CTM table counts.
3. run unique-constraint checks.
4. verify Organization and Person references.
5. verify CorporateEnrollment references to authoritative Enrollment.
6. rebuild views/materialized views.
7. run reconciliation scan.
8. compare open mismatch count with pre-incident baseline.
9. resume mutation traffic gradually.
10. document RPO/RTO result.

## Exit Criteria

- no broken required references;
- no duplicate active relationships;
- read models current;
- reconciliation reviewed;
- application smoke tests pass.

---

# 34. Runbook RB-CTM-012 – Notification Delivery Failure

## Symptoms

- CTM business operation succeeded;
- user notification not delivered.

## Diagnosis

1. confirm CTM transaction committed.
2. confirm domain/application event exists.
3. confirm Communication request accepted.
4. inspect Communication delivery log.
5. identify provider/channel error.

## Actions

- do not roll back CTM transaction;
- use Communication retry policy;
- verify recipient/contact data;
- avoid generating duplicate event.

## Verification

- business state remains correct;
- retry result visible in Communication log;
- no duplicate user-visible message.

---

# 35. Runbook RB-CTM-013 – Permission Denial Spike

## Symptoms

- sudden increase in `ctm_authorization_denials_total`;
- legitimate users report 403 errors.

## Diagnosis

1. compare deployment/config change time.
2. check IAM role-permission assignments.
3. check permission code rename mismatch.
4. check branch scope resolution.
5. check account assignment resolution.
6. compare affected endpoints.

## Actions

- correct IAM seed/config mapping;
- restore compatibility alias only if governance permits;
- avoid bypassing authorization;
- add migration for renamed permission code.

## Verification

- legitimate flows restored;
- unauthorized flows still denied;
- isolation tests pass.

---

# 36. Operational Maintenance Tasks

## Daily

- verify backup success;
- verify CTM error rate;
- check reconciliation mismatches;
- check failed import jobs;
- check failed export jobs;
- check contract expiry evaluation job;
- check stale read models.

## Weekly

- review high-frequency error codes;
- review authorization denial trends;
- review dependency latency;
- review import ambiguity rate;
- review oldest reconciliation cases.

## Monthly

- review index/query performance;
- review permission assignments with IAM owner;
- review sensitive export activity;
- verify contract expiry notification coverage;
- review capacity/performance trends.

## Quarterly

- restore test;
- DR exercise;
- audit sampling;
- architecture-boundary test review;
- access-control review;
- retention-policy review.

---

# 37. Operational Data Retention

Retention must follow approved central policy.

At minimum define retention for:

- import source files;
- import result files;
- export files;
- reconciliation evidence;
- application logs;
- traces;
- metrics;
- audit events.

Until final policy is approved:

- do not hard-delete CTM business records;
- use short-lived export links;
- minimize import file retention;
- retain audit evidence according to Audit context policy.

---

# 38. Production Access Controls

Operational access to production must follow least privilege.

Requirements:

- developers do not use shared DB credentials;
- direct DB write access is highly restricted;
- repair operations use approved runbooks;
- reconciliation repair goes through application command where possible;
- emergency changes require incident/change record;
- sensitive exports are traceable;
- secrets rotate according to platform policy.

---

# 39. Observability Acceptance Criteria

Part 11 is operationally complete only when:

1. every CTM API has request metrics;
2. all critical application services emit structured logs;
3. enrollment orchestration has full trace boundary visibility;
4. dependency failures are distinguishable by context;
5. authorization denials are observable;
6. branch/account denial spikes are alertable;
7. import jobs expose row and duration metrics;
8. reconciliation metrics exist;
9. exports are observable;
10. logs exclude protected PII;
11. read-model freshness is observable;
12. alerts route to an accountable operations team.

---

# 40. Final Cross-Part Consistency Check

The following consistency review covers:

```text
Module Overview
Part 1 - Business Overview, Functional Requirements, Business Rules
Part 2 - User Stories, Use Cases, Workflows, State Machines
Part 3 - Screen Specifications and UI Components
Part 4 - Database Entities and CRUD Matrix
Part 5 - API Contracts
Part 6 - Permission Matrix
Part 7 - Validation Rules, Error Catalog, Notifications
Part 8 - Reports, Dashboards, KPIs, Analytics
Part 9 - BDD Acceptance Criteria and Test Scenarios
Part 10 - Security Architecture and NFR
Part 11 - Deployment, Operations, Observability, Runbooks
```

---

# 41. DDD Ownership Consistency Check

## 41.1 CTM-Owned Data

Across all parts, CTM consistently owns:

```text
CorporateAccount
CorporateContact
CorporateContract
CorporateParticipant
CorporateEnrollment linkage
```

Result:

```text
CONSISTENT
```

## 41.2 Enrollment Ownership

Across all parts:

- Enrollment is treated as the central learning aggregate.
- CTM does not directly create the Enrollment table row.
- CTM orchestrates through Admission & Enrollment.
- CTM creates its CorporateEnrollment linkage after owner success.
- BDD includes explicit ownership proof.
- API contracts preserve the boundary.
- runbooks prohibit direct repair of Enrollment from CTM.

Result:

```text
CONSISTENT
```

## 41.3 Person/Party Ownership

Across all parts:

- CTM references Person.
- Contact and Participant are relationships to shared Person identity.
- bulk import delegates identity resolution.
- ambiguous identity matching fails safely.
- employer change creates a new CorporateParticipant relationship, not a duplicate Person.

Result:

```text
CONSISTENT
```

## 41.4 Course and Batch Ownership

Across all parts:

- Course Catalog owns Course and pricing/discount logic.
- Training Delivery owns Batch and capacity.
- CTM consumes validation results.
- CTM does not duplicate capacity or pricing truth.
- BDD and runbooks preserve owner validation.

Result:

```text
CONSISTENT
```

## 41.5 Finance Ownership

Across all parts:

- Finance owns Invoice, Payment, Receipt, Refund, Receivable, and authoritative credit validation.
- CTM billing status is coordination state only.
- CTM reports consume Finance read projections.
- CTM runbooks repair only coordination state.

Result:

```text
CONSISTENT
```

## 41.6 Attendance, Completion, Certificate, and Document Ownership

Across all parts:

- Attendance remains authoritative for attendance;
- Exam & Completion remains authoritative for completion;
- Certificate remains authoritative for certificate issuance;
- Document Management remains authoritative for verification state;
- CTM uses read projections only.

Result:

```text
CONSISTENT
```

## 41.7 IAM Ownership

Across all parts:

- IAM owns Role and Permission assignment;
- CTM checks capability codes;
- menu permission does not grant action permission;
- branch and account scope are enforced server-side.

Result:

```text
CONSISTENT
```

## 41.8 Audit Ownership

Across all parts:

- CTM emits or requests audit evidence for sensitive actions;
- Audit & Compliance owns authoritative audit persistence/history;
- CTM users cannot edit audit history.

Result:

```text
CONSISTENT
```

## 41.9 Communication Ownership

Across all parts:

- CTM creates domain/application event intent;
- Communication owns templates, channel delivery, retry, and logs;
- notification failure does not roll back CTM business state.

Result:

```text
CONSISTENT
```

---

# 42. ER Model Consistency Check

## 42.1 Physical CTM Entities

ER baseline explicitly defines:

```text
CorporateAccount
CorporateContact
CorporateContract
CorporateParticipant
CorporateEnrollment
```

The FRD physical schema is restricted to those approved CTM entities.

Result:

```text
CONSISTENT
```

## 42.2 CorporateParticipant to Person

ER relationship:

```text
CorporateParticipant → Person
```

FRD implementation:

- reuses Person;
- maintains employer relationship separately;
- avoids duplicate identity.

Result:

```text
CONSISTENT
```

## 42.3 CorporateParticipant to StudentProfile

ER allows:

```text
linkedStudentProfileId
```

FRD behavior:

- participant becomes/links to StudentProfile through Enrollment owner workflow;
- CTM does not duplicate StudentProfile logic.

Result:

```text
CONSISTENT
```

## 42.4 CorporateEnrollment Relationship

ER defines:

```text
CorporateEnrollment
corporateAccountId
corporateParticipantId
enrollmentId
contractId
billingStatus
```

FRD behavior matches this structure and treats billingStatus as CTM coordination state.

Result:

```text
CONSISTENT
```

---

# 43. Operational Workflow Consistency Check

The ASTI workflow requires corporate operations including:

- company/customer relationship;
- follow-up and proposal handover;
- quotation linkage;
- nomination list;
- participant registration;
- batch allocation;
- trainer availability;
- training hall availability;
- equipment availability;
- travel and accommodation;
- costing;
- training;
- attendance;
- certification;
- invoice;
- outstanding payment;
- project closure;
- GIVT-specific reporting.

The FRD correctly maps the approved portions to existing contexts.

However, the following workflow concepts remain unresolved in the current DDD/ER model:

```text
CorporateNomination aggregate
CorporateTrainingProgram / Project aggregate
Equipment allocation model
Travel & Accommodation model
Costing / Profitability aggregate
Project Closure aggregate/state
GIVT bounded-context/aggregate decision
```

These have not been silently implemented as ad hoc CTM tables.

Result:

```text
CONSISTENT WITH EXPLICIT GAPS
```

---

# 44. Known Architecture Gaps After Part 11

| Gap ID | Gap | Status |
|---|---|---|
| GAP-CTM-FINAL-001 | Account-to-Branch authorization relation missing | Architecture decision required |
| GAP-CTM-FINAL-002 | Account Manager portfolio assignment model missing | Architecture decision required |
| GAP-CTM-FINAL-003 | Corporate Nomination aggregate missing | Deferred |
| GAP-CTM-FINAL-004 | Corporate Training Program/Project model incomplete | Deferred |
| GAP-CTM-FINAL-005 | Equipment ownership/model missing | Deferred |
| GAP-CTM-FINAL-006 | Travel & Accommodation ownership/model missing | Deferred |
| GAP-CTM-FINAL-007 | Costing/Profitability ownership/model missing | Deferred |
| GAP-CTM-FINAL-008 | Project Closure aggregate/state missing | Deferred |
| GAP-CTM-FINAL-009 | GIVT ownership/model unresolved | Deferred |
| GAP-CTM-FINAL-010 | Credit field write ownership overlap requires final decision | Architecture decision required |
| GAP-CTM-FINAL-011 | Corporate Portal authentication/scope model future/conditional | Deferred |
| GAP-CTM-FINAL-012 | Final retention schedules require central compliance approval | Architecture decision required |

None of these gaps should be resolved by:

- creating ad hoc tables without DDD review;
- overloading CorporateAccount or CorporateContract state;
- embedding business logic in UI;
- writing foreign-owned tables from CTM;
- treating report views as source of truth.

---

# 45. Final Production Readiness Checklist

## Architecture

- [ ] CTM package boundaries enforced
- [ ] No foreign repository direct writes
- [ ] Enrollment creation delegated
- [ ] Finance truth delegated
- [ ] reporting projections read-only

## Security

- [ ] fine-grained permissions enabled
- [ ] branch/account scopes enforced server-side
- [ ] unresolved scope mapping handled fail-closed
- [ ] sensitive fields masked
- [ ] export controls enabled

## Data

- [ ] CTM constraints deployed
- [ ] soft-delete conventions verified
- [ ] optimistic locking verified
- [ ] reconciliation scan passes
- [ ] backup restore tested

## Observability

- [ ] structured logs available
- [ ] traces cross context boundaries
- [ ] metrics dashboards available
- [ ] alerts configured
- [ ] PII redaction tested

## Operations

- [ ] health checks configured
- [ ] deployment runbook tested
- [ ] rollback runbook tested
- [ ] import runbook tested
- [ ] orchestration failure runbook tested
- [ ] reconciliation repair runbook tested
- [ ] recovery runbook tested

---

# 46. Final Conclusion

After reviewing Module 14 across Parts 1-11 against the DDD Context Map and ER Model:

```text
Overall Alignment Status:
ALIGNED FOR CTM CORE DEVELOPMENT, WITH EXPLICITLY DEFERRED MODEL DECISIONS
```

The FRD consistently preserves:

- Corporate Training ownership of CorporateAccount, CorporateContact, CorporateContract, CorporateParticipant, and CorporateEnrollment linkage;
- central Enrollment ownership in Admission & Enrollment;
- shared Person/Party identity reuse;
- Course Catalog ownership of Course and pricing rules;
- Training Delivery ownership of Batch and capacity;
- Scheduling ownership of feasibility/conflict rules;
- Finance ownership of credit decisions and financial transactions;
- Attendance ownership of attendance truth;
- Completion ownership of completion evaluation;
- Certificate ownership of certificate issuance;
- Document Management ownership of verification;
- IAM ownership of authorization grants;
- Audit ownership of authoritative audit history;
- Communication ownership of notification delivery;
- Reporting views as explicitly read-only projections.

The module is suitable to proceed to implementation planning and development for the CTM-owned core. The deferred capabilities remain out of scope until their architecture decisions are approved.

The remaining workflow gaps—Nomination, Corporate Training Program/Project, Equipment, Travel & Accommodation, Costing/Profitability, Project Closure, and GIVT—remain intentionally outside the physical CTM model until the DDD and ER source documents are updated through an approved architecture decision.
