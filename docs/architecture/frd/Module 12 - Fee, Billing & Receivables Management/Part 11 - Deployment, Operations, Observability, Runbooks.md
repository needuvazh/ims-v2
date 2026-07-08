# Part 11 - Deployment, Operations, Observability, Runbooks

## Module 12 – Fee, Billing & Receivables Management

## 1. Purpose

This document defines deployment controls, runtime operations, observability, health checks, backup/recovery procedures, reconciliation operations, and troubleshooting runbooks for Module 12. The design assumes the ASTI IMS modular monolith and does not introduce microservices or external message brokers.

The operational objective is to detect and resolve financial integrity failures without deleting history, duplicating payment, weakening branch isolation, or allowing stale reporting data to influence authoritative transaction decisions.

## 2. Operational Ownership Boundaries

| Concern                                                                                          | Owning Context / Team Boundary                                                            |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Invoice, installment, payment, receipt, refund, receivable, corporate credit transactional state | Fee, Billing & Receivables Management                                                     |
| Course price and discount definitions                                                            | Course Catalog                                                                            |
| Enrollment source and learner-course-batch lifecycle                                             | Admission & Enrollment                                                                    |
| Corporate account/participant/contract master data                                               | Corporate Training                                                                        |
| User permissions and branch assignments                                                          | Identity & Access                                                                         |
| Branch master and hierarchy                                                                      | Organization Management                                                                   |
| Audit-log storage and approval-history platform records                                          | Audit & Compliance                                                                        |
| Notification delivery/provider status                                                            | Communication & Notifications                                                             |
| Finance read-model views/materialized views/snapshots                                            | Reporting design jointly operated by Finance application and platform database operations |
| Database backups, PITR, infrastructure health                                                    | Platform / Database Operations                                                            |

No operator may repair Finance inconsistencies by directly editing upstream context-owned data from the Finance module.

## 3. Deployment Architecture

```text
Users
  |
  v
Load Balancer / Platform Ingress
  |
  v
Next.js Admin Portal + Modular Monolith Application Replicas
  |-- Finance route handlers / Server Actions
  |-- Finance application services
  |-- Finance domain services
  |-- Internal scheduled jobs
  |-- Reporting projection refresh jobs
  |
  v
PostgreSQL Primary
  |-- finance_* transactional tables
  |-- reporting views/materialized views
  |-- audit integration records
  |
  +--> encrypted backups / PITR archive
  |
  +--> private object storage for invoice/receipt/export documents
```

### 3.1 Deployment Principles

1. Application replicas are stateless with respect to Finance transactions.
2. All schema changes use reviewed Prisma migrations.
3. Database migrations are applied once per deployment through the controlled migration job/process, not by every application replica.
4. Backward-compatible schema deployment is preferred: expand → deploy application → backfill/verify → contract in a later release.
5. Financial constraints and unique indexes must be validated before enabling application behavior that depends on them.
6. Destructive schema changes to posted financial records are prohibited without an approved archival/migration plan and restore test.
7. Feature flags, when used, may gate UI/application behavior but must not weaken database integrity rules.
8. Deployment must preserve idempotency records and numbering-series consistency across application replicas.

## 4. Environment Configuration

### 4.1 Required Configuration Categories

| Category                 | Examples                                                           | Source                                                |
| ------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------- |
| Database                 | connection URL, pool settings, statement timeout                   | Secrets manager / environment configuration           |
| Application URLs         | public application origin, internal canonical origin               | Environment configuration                             |
| Object storage           | bucket/container identifier, region, KMS key reference             | Environment configuration + secrets manager           |
| Finance defaults         | default currency `OMR`, business timezone `Asia/Muscat`            | Configuration context / validated environment default |
| Document rendering       | renderer endpoint/process config, Arabic font package availability | Deployment artifact/environment                       |
| Observability            | service name, environment, trace exporter, metrics endpoint        | Environment configuration                             |
| Notification integration | application port configuration                                     | Communication context configuration                   |

### 4.2 Secret Handling

1. Secrets must not be stored in Git, Prisma schema, Markdown FRDs, or client bundles.
2. Runtime secrets are injected from the approved secrets manager.
3. Application logs must never print connection strings, object-storage signatures, session secrets, or encryption keys.
4. Secret rotation must be supportable without database restoration.

## 5. Deployment Pipeline Requirements

### 5.1 Pre-Merge Gates

1. TypeScript compilation and linting pass.
2. Unit tests for domain arithmetic and state transitions pass.
3. Zod contract tests pass.
4. Integration tests with PostgreSQL pass.
5. Authorization and branch-isolation tests from Part 9 pass.
6. Payment idempotency and concurrency tests pass.
7. Prisma migration lint/review passes.
8. Dependency and secret scans pass.

### 5.2 Pre-Production Gates

1. Apply migration to staging copy with representative data volume.
2. Verify migration execution duration and lock behavior.
3. Run reconciliation queries before and after migration.
4. Verify invoice/payment/refund counts and monetary control totals remain unchanged unless the release intentionally changes them.
5. Load-test changed high-traffic queries.
6. Test English and Arabic invoice/receipt rendering.
7. Test rollback strategy for application code.
8. For irreversible migration steps, verify database restore procedure before production rollout.

### 5.3 Production Deployment Sequence

1. Confirm current backup/PITR health.
2. Record deployment change identifier and release version.
3. Put long-running export jobs into controlled drain mode if migration affects reporting structures.
4. Run backward-compatible database migration.
5. Validate migration status and constraint/index health.
6. Deploy application replicas using rolling or platform-equivalent zero/low-downtime deployment.
7. Verify readiness before routing traffic to each new replica.
8. Execute smoke tests:
   - authenticate;
   - list in-scope invoices;
   - open invoice detail;
   - query receivable summary;
   - call payment-validation read;
   - call credit exposure read;
   - render a non-production test receipt/invoice artifact where allowed.
9. Resume paused scheduled/reporting jobs.
10. Monitor golden signals and finance integrity metrics for at least the release observation window defined by platform operations.
11. Close deployment only after reconciliation control totals pass.

## 6. Structured Logging

### 6.1 Log Format

All application logs use structured JSON.

```json
{
  "timestamp": "2026-07-04T11:25:43.381Z",
  "level": "INFO",
  "service": "asti-ims-admin-portal",
  "module": "finance-receivables",
  "environment": "production",
  "event": "finance.payment.posted",
  "message": "Payment posted successfully",
  "correlationId": "8f7f6d36-a39e-4df7-a80d-f5da7fbc85a4",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "userId": "2f9c347f-7d37-4ce2-86fa-b2e1e15cf8ee",
  "branchId": "c59a7572-fd70-471a-befd-efc4ee99412c",
  "entityType": "Payment",
  "entityId": "6bc210ea-08e7-46ff-8da1-1bac1f0be9fb",
  "operation": "recordPayment",
  "durationMs": 184,
  "outcome": "success",
  "errorCode": null,
  "retryCount": 0
}
```

### 6.2 Required Log Fields

| Field                    | Requirement                                                |
| ------------------------ | ---------------------------------------------------------- |
| `timestamp`              | UTC ISO 8601 timestamp.                                    |
| `level`                  | TRACE, DEBUG, INFO, WARN, ERROR, FATAL.                    |
| `service`                | Deployed application service name.                         |
| `module`                 | `finance-receivables`.                                     |
| `environment`            | Environment identifier.                                    |
| `event`                  | Stable machine-readable event name.                        |
| `message`                | Safe human-readable summary.                               |
| `correlationId`          | Required for every request/job execution.                  |
| `traceId`, `spanId`      | Present when tracing enabled.                              |
| `userId`                 | Human actor ID when applicable.                            |
| `callerModule`           | Internal module name for in-process calls.                 |
| `branchId`               | Target/effective branch where applicable.                  |
| `entityType`, `entityId` | Business target where safe and applicable.                 |
| `operation`              | Application operation name.                                |
| `durationMs`             | Operation duration.                                        |
| `outcome`                | `success`, `failure`, `denied`, `conflict`, or `degraded`. |
| `errorCode`              | Application error code when failed.                        |
| `retryCount`             | Retry count for controlled retrying jobs.                  |

### 6.3 Log Redaction

Never log:

- session cookies or Authorization headers;
- CSRF tokens;
- full bank/card/payment secrets;
- PAN, CVV, PIN, OTP;
- object-storage signed URLs;
- passwords or secret keys;
- complete request/response payloads for payment or refund operations.

### 6.4 Log Events

Minimum operational events:

```text
finance.invoice.created
finance.invoice.issue.started
finance.invoice.issued
finance.invoice.issue.failed
finance.invoice.cancelled
finance.installment.plan.created
finance.payment.post.started
finance.payment.posted
finance.payment.post.duplicate
finance.payment.post.failed
finance.receipt.generated
finance.receipt.render.failed
finance.refund.requested
finance.refund.decision.recorded
finance.refund.executed
finance.refund.execution.failed
finance.receivable.reconciled
finance.receivable.reconciliation.exception
finance.credit.validation.completed
finance.credit.validation.blocked
finance.credit.rule.superseded
finance.report.query.completed
finance.report.query.failed
finance.export.created
finance.export.failed
finance.authz.denied
finance.branch_scope.denied
finance.read_model.refresh.completed
finance.read_model.refresh.failed
finance.numbering.allocation.failed
```

## 7. Distributed Tracing and Trace Boundaries

Although Module 12 is part of a modular monolith, tracing must expose application boundaries.

### 7.1 Trace Root Boundaries

Create a root span for:

- each HTTP route request;
- each Server Action invocation;
- each scheduled reconciliation job;
- each materialized-view refresh job;
- each export generation job.

### 7.2 Child Spans

Recommended span names:

```text
finance.auth.authorize
finance.scope.resolve
finance.invoice.create
finance.invoice.issue
finance.payment.validate
finance.payment.transaction
finance.payment.allocate
finance.receivable.reconcile
finance.receipt.create
finance.refund.validate
finance.refund.execute
finance.credit.calculateExposure
finance.credit.validateProposal
finance.report.query
finance.readmodel.refresh
finance.document.render
storage.document.put
notification.request
```

### 7.3 Trace Attributes

Allowed low/medium-cardinality attributes:

```text
finance.operation
finance.invoice_type
finance.payment_method
finance.refund_status
finance.credit_decision
finance.report_code
branch.scope_count
result.outcome
error.code
```

Do not attach student names, email addresses, phone numbers, invoice numbers, payment reference numbers, or arbitrary entity IDs as metric labels. Entity IDs may appear as trace attributes only where access to the tracing system is tightly controlled and operational policy allows it.

## 8. Metrics Instrumentation

### 8.1 RED Metrics

| Metric                                           | Type      | Labels                               |
| ------------------------------------------------ | --------- | ------------------------------------ |
| `finance_http_requests_total`                    | Counter   | route template, method, status class |
| `finance_http_request_duration_seconds`          | Histogram | route template, method               |
| `finance_application_operations_total`           | Counter   | operation, outcome                   |
| `finance_application_operation_duration_seconds` | Histogram | operation                            |
| `finance_errors_total`                           | Counter   | error_code, operation                |

### 8.2 Financial Integrity Metrics

| Metric                                              | Type    | Meaning                                                                                        |
| --------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `finance_payment_post_total`                        | Counter | Successful posted payments by payment method and branch category if cardinality is controlled. |
| `finance_payment_idempotency_replay_total`          | Counter | Safe replay returns.                                                                           |
| `finance_payment_idempotency_conflict_total`        | Counter | Same key with different payload.                                                               |
| `finance_payment_transaction_rollback_total`        | Counter | Payment transaction rollbacks.                                                                 |
| `finance_receivable_reconciliation_exception_count` | Gauge   | Current reconciliation exception count.                                                        |
| `finance_allocation_reconciliation_exception_count` | Gauge   | Current allocation mismatch count.                                                             |
| `finance_refund_pending_approval_count`             | Gauge   | Pending refund approvals.                                                                      |
| `finance_refund_execution_failure_total`            | Counter | Failed approved-refund executions.                                                             |
| `finance_credit_validation_total`                   | Counter | Decision label: allow, warn, block.                                                            |
| `finance_invoice_issue_failure_total`               | Counter | Invoice issue failures.                                                                        |
| `finance_numbering_allocation_failure_total`        | Counter | Numbering-series allocation failures.                                                          |

### 8.3 Database and Projection Metrics

| Metric                                        | Type      | Meaning                                  |
| --------------------------------------------- | --------- | ---------------------------------------- |
| `finance_db_transaction_duration_seconds`     | Histogram | Finance transaction durations.           |
| `finance_db_deadlock_total`                   | Counter   | Deadlock occurrences affecting Finance.  |
| `finance_db_lock_wait_seconds`                | Histogram | Lock wait duration.                      |
| `finance_db_pool_in_use`                      | Gauge     | Active DB connections.                   |
| `finance_db_pool_waiters`                     | Gauge     | Requests waiting for pool connection.    |
| `finance_read_model_refresh_duration_seconds` | Histogram | Projection refresh duration.             |
| `finance_read_model_last_success_timestamp`   | Gauge     | Unix timestamp of last success by model. |
| `finance_read_model_staleness_seconds`        | Gauge     | Age of reporting projection.             |
| `finance_export_job_duration_seconds`         | Histogram | Export generation duration.              |
| `finance_export_job_failure_total`            | Counter   | Export failures by report code.          |

### 8.4 Notification Metrics

Finance observes request handoff but Communication owns delivery metrics.

```text
finance_notification_request_total{event_type,outcome}
finance_notification_handoff_duration_seconds{event_type}
```

Provider-delivery metrics must remain in Communication & Notifications.

## 9. Alerting Rules

| Alert                               | Trigger                                                                 | Severity    | Initial Response              |
| ----------------------------------- | ----------------------------------------------------------------------- | ----------- | ----------------------------- |
| Payment posting unavailable         | >5% payment post failures for 5 minutes or readiness dependency failure | Critical    | Run RB-FBR-001 or RB-FBR-002. |
| Duplicate/idempotency anomaly       | idempotency conflicts exceed baseline threshold for 10 minutes          | High        | Run RB-FBR-003.               |
| Reconciliation exceptions           | exception gauge >0 for 15 minutes                                       | High        | Run RB-FBR-004.               |
| Refund execution failures           | any repeated failure for same approved refund or >3 failures/15 min     | High        | Run RB-FBR-005.               |
| Numbering allocation failures       | >0 sustained for 5 minutes                                              | High        | Run RB-FBR-006.               |
| Corporate credit validation latency | p95 >1.5 s for 10 minutes                                               | Medium/High | Run RB-FBR-007.               |
| Read model stale                    | staleness >15 minutes for operational dashboard model                   | Medium      | Run RB-FBR-008.               |
| DB pool saturation                  | >85% utilization and waiters >0 for 10 minutes                          | High        | Run RB-FBR-009.               |
| Deadlocks                           | >3 Finance-impacting deadlocks in 15 minutes                            | High        | Run RB-FBR-010.               |
| Export backlog                      | oldest queued export >30 minutes                                        | Medium      | Run RB-FBR-011.               |
| Backup/PITR unhealthy               | no successful backup/archive progress within infrastructure SLA         | Critical    | Run RB-FBR-012.               |
| Branch-scope denial spike           | >5x normal denial baseline over 15 minutes                              | Security    | Investigate RB-FBR-013.       |

Thresholds should be tuned after baseline collection but must not be relaxed to hide integrity failures.

## 10. Health Checks

### 10.1 Liveness

**Route:** platform-standard liveness endpoint.

Liveness verifies only that the process/event loop is responsive. It must not fail solely because PostgreSQL or object storage is temporarily unavailable; otherwise all replicas may restart during a dependency outage.

Expected response:

```json
{
  "status": "alive",
  "service": "asti-ims-admin-portal",
  "version": "2026.07.1"
}
```

### 10.2 Readiness

Readiness verifies:

1. database connectivity with a lightweight query;
2. required database migrations are at expected version;
3. connection pool can acquire a connection within threshold;
4. critical configuration is loaded;
5. finance application dependency graph is initialized.

Readiness must fail when authoritative transaction processing cannot safely proceed.

### 10.3 Dependency Health

| Dependency             | Health Behavior                                                                                                                                                                                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL             | Critical. Payment, invoice issue, refunds, credit validation require healthy access.                                                                                                                                                                                                                                    |
| Object storage         | Degraded if unavailable. Transactions may continue, but document generation/download is unavailable and queued retry/re-render may be needed.                                                                                                                                                                           |
| Communication boundary | Degraded if unavailable. Financial transaction may commit only if notification request handoff follows the module's defined reliability mechanism; alert and retry notification request without rolling back already committed finance state unless the command contract explicitly requires synchronous communication. |
| Reporting projections  | Degraded. Transactional operations continue. Dashboards show stale timestamp or unavailable state.                                                                                                                                                                                                                      |

### 10.4 Health Check Timeouts

- liveness response: ≤500 ms target;
- readiness response: ≤2 s target;
- DB acquisition health timeout: 1 s;
- health endpoints must not execute large table scans or business reconciliations.

## 11. Backup and Recovery Scope

### 11.1 Owned Transactional Tables

The Finance recovery set includes at minimum:

```text
finance_invoice
finance_invoice_line_item
finance_installment_plan
finance_installment
finance_payment
finance_payment_allocation
finance_receipt
finance_refund
finance_receivable
finance_corporate_credit_rule
```

Associated idempotency/command-deduplication records and Finance-specific job control tables must be included if implemented in shared infrastructure tables.

### 11.2 Supporting Non-Owned Data Required for Referential Recovery

Finance restore validation also requires consistent references to:

- Enrollment and StudentProfile;
- CorporateAccount;
- Course;
- Branch;
- User;
- NumberingSeries;
- Audit records;
- ApprovalRequest and ApprovalHistory.

A table-only Finance restore into an otherwise newer database may break referential and business consistency. Preferred recovery is database-level PITR or a coordinated context-consistent restore.

### 11.3 Backup Requirements

1. Encrypted full database backups according to infrastructure schedule.
2. Continuous transaction-log/WAL archival or equivalent PITR capability sufficient for RPO ≤15 minutes.
3. Backup encryption and access controls managed by platform operations.
4. Backup success monitored and alerted.
5. Quarterly restore tests.
6. Restore test evidence records recovery start/end time, selected restore point, reconciliation results, and observed RPO/RTO.

## 12. Recovery Procedure

### 12.1 Full/PITR Recovery

1. Declare incident and freeze Finance mutations at the application layer.
2. Capture incident time window and last known good transaction/correlation references.
3. Confirm current backup and WAL/archive availability.
4. Select restore point before corruption or failure event.
5. Restore to isolated recovery environment first where time permits.
6. Run schema migration-version validation.
7. Run Finance control queries:
   - invoice count and total amount by status/currency;
   - payment count and total amount by status/currency;
   - refund count and executed amount;
   - invoice balance equation checks;
   - payment allocation sum checks;
   - receivable-to-invoice reconciliation;
   - installment allocation reconciliation;
   - orphan FK checks;
   - duplicate business-number checks.
8. Compare restored control totals with known snapshots/audit/control reports.
9. Promote restored database according to platform database procedure.
10. Restart application in read-only verification mode if supported.
11. Run smoke tests and payment-validation/credit-validation tests.
12. Re-enable mutations.
13. Refresh reporting views/materialized views and rebuild snapshots as required.
14. Reconcile operations from the incident window using audit logs, external bank evidence, and controlled payment investigation. Never re-post blindly.
15. Close incident only after Finance and business owners approve reconciliation results.

### 12.2 Read-Model Recovery

1. Do not restore transactional tables solely for a reporting projection failure.
2. Identify failed/stale view or materialized view.
3. Verify source transactional data integrity.
4. Recreate index or view definition if deployment defect caused failure.
5. Refresh model using controlled SQL/job.
6. Validate `dataAsOf`, row counts, and branch/currency control totals.
7. Restore dashboard traffic.

## 13. Data Reconciliation Jobs

### 13.1 Operational Reconciliation Frequency

| Control                                            | Frequency                          | Expected Result                                   |
| -------------------------------------------------- | ---------------------------------- | ------------------------------------------------- |
| Invoice balance equation                           | Every 15 minutes                   | Zero exceptions.                                  |
| Payment allocation sum vs payment posted amount    | Every 15 minutes                   | Zero exceptions.                                  |
| Installment paid amount vs allocations             | Every 15 minutes                   | Zero exceptions.                                  |
| Receivable outstanding vs invoice outstanding      | Every 15 minutes                   | Zero exceptions.                                  |
| Receipt uniqueness per posted payment              | Hourly                             | Zero duplicate active receipts.                   |
| Refund cumulative eligibility                      | Hourly                             | No executed amount above eligible settled amount. |
| Full Finance reconciliation                        | Daily after GST business-day close | Zero unexplained monetary differences.            |
| Corporate credit exposure recomputation comparison | Daily                              | Zero unexplained exposure mismatch.               |

### 13.2 Reconciliation Output

Each exception record/report entry must contain:

```text
controlCode
entityType
entityId
branchId
currency
expectedValue
actualValue
difference
firstDetectedAt
lastDetectedAt
correlationId or jobRunId
status
resolutionReference
```

## 14. Scheduled Jobs

| Job                                             | Schedule Guideline                                                              | Failure Behavior                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Receivable aging refresh/reconciliation         | At least daily after GST midnight plus operational refresh as defined in Part 8 | Alert; retain prior valid model; transaction data unchanged.          |
| Daily Finance reconciliation                    | Daily after business-day close                                                  | High-severity alert for unexplained monetary mismatch.                |
| Materialized KPI refresh                        | As Part 8 refresh SLA requires                                                  | Mark dashboards stale and alert if threshold exceeded.                |
| Installment-due notification request generation | Daily GST schedule                                                              | Retry idempotently; deduplicate event/template recipient keys.        |
| Invoice-overdue detection                       | Daily GST schedule                                                              | State derivation/update must be idempotent.                           |
| Temporary export cleanup                        | Hourly/daily                                                                    | Delete expired temporary artifacts only, never transaction documents. |

Internal jobs may use the monolith's `infrastructure/jobs` capability. No external broker is required.

## 15. Runbook Index

| Runbook    | Failure                                                 |
| ---------- | ------------------------------------------------------- |
| RB-FBR-001 | Payment transaction failure before commit               |
| RB-FBR-002 | Payment outcome unknown after client timeout            |
| RB-FBR-003 | Duplicate payment or idempotency conflict investigation |
| RB-FBR-004 | Receivable/payment-allocation reconciliation mismatch   |
| RB-FBR-005 | Approved refund execution failure                       |
| RB-FBR-006 | Invoice/receipt numbering-series failure                |
| RB-FBR-007 | Corporate credit validation slow or failing             |
| RB-FBR-008 | Reporting read model stale or refresh failed            |
| RB-FBR-009 | Database connection-pool exhaustion                     |
| RB-FBR-010 | Database deadlock or lock contention                    |
| RB-FBR-011 | Export job backlog or repeated export failure           |
| RB-FBR-012 | Backup/PITR health failure                              |
| RB-FBR-013 | Branch-isolation/security denial anomaly                |
| RB-FBR-014 | Receipt document render/storage failure                 |
| RB-FBR-015 | Notification handoff failure                            |
| RB-FBR-016 | Finance bulk import/sync issue                          |
| RB-FBR-017 | Database restore and post-recovery reconciliation       |

## 16. RB-FBR-001 – Payment Transaction Failure Before Commit

### Symptoms

- `ERR_FIN_TRANSACTION_FAILED` returned;
- `finance_payment_transaction_rollback_total` increases;
- payment post failure logs with correlation ID;
- no receipt returned.

### Procedure

1. Capture correlation ID, user ID, invoice ID, amount, payment method, and idempotency key from safe operational metadata.
2. Query payment by idempotency key and request hash.
3. If no committed payment exists, verify invoice outstanding amount and state.
4. Inspect database error category: constraint, deadlock, timeout, connection loss, or validation race.
5. Verify no payment allocation, receipt, or invoice balance mutation committed without the payment row.
6. Run targeted reconciliation for the invoice.
7. Correct underlying infrastructure/query issue.
8. Retry through the normal payment API with the same idempotency key and identical payload.
9. Confirm the API returns one Payment ID and one Receipt ID.
10. Verify invoice/receivable/installment balances and audit record.
11. Record incident resolution.

### Prohibited Actions

- Do not insert payment rows manually.
- Do not change invoice `paidAmount` directly.
- Do not use a new idempotency key until the original outcome is proven absent.

## 17. RB-FBR-002 – Payment Outcome Unknown After Client Timeout

### Symptoms

The browser timed out or lost connection after submitting payment, and the user does not know whether posting succeeded.

### Procedure

1. Do not instruct the user to submit a new payment immediately.
2. Retrieve status using the original idempotency key or search the invoice payment history.
3. If a committed payment exists, return/display the existing Payment and Receipt result.
4. If idempotency record is `IN_PROGRESS`, wait only through the system's bounded request status check workflow; do not create another transaction.
5. If idempotency record is failed and no committed payment exists, retry the same request with the same key.
6. If database status is ambiguous, freeze payment posting for that invoice and run invoice-level reconciliation.
7. Resolve ambiguity before allowing a new payment attempt.

## 18. RB-FBR-003 – Duplicate Payment or Idempotency Conflict Investigation

### Trigger

- `ERR_FIN_IDEMPOTENCY_CONFLICT`;
- suspected duplicate business payment;
- multiple bank references for one intended transaction.

### Procedure

1. Identify payment IDs, idempotency keys, invoice, amount, date, method, and actor.
2. Determine whether records are technical duplicates or genuine separate payments.
3. Compare request hashes and timestamps.
4. Verify unique constraints and idempotency-store state.
5. Run invoice balance and allocation reconciliation.
6. If duplicate committed payment is confirmed, do not delete it.
7. Use the approved refund workflow to reverse the duplicate economic effect where appropriate.
8. Preserve both original payment and refund audit history.
9. Investigate why idempotency control was bypassed and create a defect/security incident if applicable.

## 19. RB-FBR-004 – Reconciliation Mismatch

### Trigger

- receivable outstanding differs from invoice outstanding;
- payment allocations do not equal posted payment amount;
- installment paid amount differs from allocation totals.

### Procedure

1. Capture reconciliation control code and affected entity IDs.
2. Place the affected invoice/payment under operational hold for further mutations if continued posting could worsen inconsistency.
3. Read source rows in one consistent database snapshot.
4. Recalculate expected values using domain formulas.
5. Inspect audit history and transaction logs for recent mutations/deployments.
6. Determine defect type:
   - stale projection only;
   - failed derived-state update;
   - historical bad data;
   - concurrency defect;
   - manual database change.
7. For stale projection, rebuild/refresh the read model.
8. For derived transactional fields, execute a reviewed repair script through change management. Script must:
   - target exact IDs;
   - assert expected pre-state;
   - update atomically;
   - write repair audit entries;
   - be idempotent or safely rerunnable.
9. Re-run all related controls.
10. Remove operational hold after zero unexplained differences.
11. Attach reconciliation evidence to incident/change record.

## 20. RB-FBR-005 – Approved Refund Execution Failure

### Symptoms

Refund is Approved but execution failed or external evidence is unclear.

### Procedure

1. Verify refund state, approved amount, payment source, invoice, and prior execution attempts.
2. Confirm whether any financial execution reference already exists.
3. Check external/manual bank evidence where applicable.
4. If execution did not occur, resolve the operational cause and retry through the approved execute command using the same operation/idempotency reference where supported.
5. If execution occurred externally but IMS did not record completion, do not execute again.
6. Use controlled reconciliation/repair to record the confirmed external execution with documentary evidence and audit reason.
7. Reconcile cumulative refund amount, payment net settlement, invoice/receivable state, and refund status.
8. Verify notification handoff after state is correctly recorded.

## 21. RB-FBR-006 – Numbering-Series Failure

### Symptoms

Invoice or receipt creation fails due to sequence allocation, duplicate number, or lock timeout.

### Procedure

1. Stop repeated automatic retries that could amplify lock contention.
2. Identify affected numbering series and branch scope.
3. Check current `nextNumber`, existing maximum issued number, uniqueness constraint, and concurrent locks.
4. Verify whether a number was allocated but transaction rolled back.
5. Gaps are acceptable if numbering policy permits them; reusing an uncertain number is prohibited unless policy and database evidence prove it was never committed.
6. Correct sequence/locking configuration under change control.
7. Retry original business transaction through normal API.
8. Verify unique number and audit trail.
9. Run duplicate-number query across active and soft-deleted records according to uniqueness scope.

## 22. RB-FBR-007 – Corporate Credit Validation Slow or Failing

### Symptoms

- validation p95 exceeds target;
- timeouts from Corporate Training;
- database query plan regression;
- repeated validation failures.

### Procedure

1. Check database health, pool saturation, and lock waits.
2. Inspect credit exposure query trace and execution plan.
3. Confirm required indexes on corporate account, receivables, invoices, and committed enrollment references.
4. Verify effective-dated credit rule lookup returns at most one active rule for the evaluation date.
5. Compare calculated exposure with `currentOutstanding + committedAmount` source components.
6. Do not fall back to a stale reporting view for enrollment blocking decisions.
7. If authoritative validation is unavailable, return a controlled failure and block the enrollment confirmation path until Finance validation recovers.
8. After remediation, rerun validation for previously failed business attempts.

## 23. RB-FBR-008 – Reporting Read Model Stale or Refresh Failed

### Procedure

1. Identify affected model and `last_success_timestamp`.
2. Confirm transactional database health.
3. Check refresh-job logs, locks, disk space, temp space, and query timeout.
4. Verify source data is intact using control totals.
5. Cancel any abandoned refresh session safely.
6. Re-run refresh in controlled mode.
7. Rebuild affected indexes if corruption/bloat is confirmed and maintenance is approved.
8. Validate row counts, branch totals, currency totals, and `dataAsOf`.
9. Clear stale alert only after successful validation.
10. Never use the reporting model as a substitute for credit or payment-validation transactional queries.

## 24. RB-FBR-009 – Database Connection-Pool Exhaustion

### Procedure

1. Confirm pool utilization, waiters, and application latency.
2. Identify top route/operation by connection hold time.
3. Check for long transactions and idle-in-transaction sessions.
4. Check export/report queries competing with transactional workload.
5. Cancel only confirmed runaway non-critical reporting queries according to DB operations policy.
6. Reduce/report concurrency or pause export workers if necessary.
7. Do not blindly increase pool size beyond database connection capacity.
8. Fix transaction scope/query performance cause.
9. Verify payment posting and credit-validation latency return to target.

## 25. RB-FBR-010 – Database Deadlock or Lock Contention

### Procedure

1. Capture deadlock graph/database diagnostic and affected correlation IDs.
2. Identify transaction operations and lock acquisition order.
3. Confirm whether application retry policy safely retried the whole transaction.
4. Verify idempotency prevented duplicate payment/refund execution.
5. Reconcile affected entities.
6. Fix inconsistent lock ordering or overly broad transaction scope.
7. Add regression concurrency test.
8. Monitor deadlock metric after deployment.

## 26. RB-FBR-011 – Export Job Backlog or Failure

### Procedure

1. Check queue/job table depth and oldest request age.
2. Verify database and object storage health.
3. Identify report codes causing long execution.
4. Inspect query plans and filter ranges.
5. Enforce export row/date limits from contract.
6. Retry failed jobs idempotently; do not create multiple user-visible exports for one request.
7. Purge only expired temporary artifacts, not source data.
8. Verify download authorization and file expiry.
9. Confirm transactional latency remained within targets.

## 27. RB-FBR-012 – Backup/PITR Health Failure

### Procedure

1. Treat as Critical because Finance RPO is at risk.
2. Confirm whether failure is backup job, archive upload, credentials, storage capacity, or encryption key access.
3. Notify platform/database operations and Finance system owner.
4. Preserve existing backups; never delete them to free space without approved retention handling.
5. Restore backup/archive flow.
6. Verify a new successful checkpoint/archive object.
7. Calculate current achievable RPO gap.
8. If RPO exceeds 15 minutes, record explicit risk and consider restricting high-risk Finance changes until protection is restored, based on incident command decision.
9. Schedule/perform restore validation if integrity of backup chain was uncertain.

## 28. RB-FBR-013 – Branch-Isolation or Authorization Denial Anomaly

### Trigger

Large spike in `finance.authz.denied` or `finance.branch_scope.denied`, or evidence of cross-branch data exposure.

### Procedure

1. Treat confirmed cross-branch exposure as a security incident.
2. Capture correlation IDs, principal IDs, route templates, permission codes, and branch-scope counts.
3. Do not include sensitive foreign-branch values in incident chat or broad logs.
4. Determine whether source is:
   - user behavior;
   - stale IAM assignment cache;
   - query missing branch predicate;
   - report aggregation filter ordering defect;
   - export authorization defect.
5. If exposure is possible, disable the affected route/report/export capability using the safest available deployment/feature control.
6. Preserve logs and audit evidence.
7. Patch and execute Part 9 branch-isolation regression suite.
8. Reconcile access logs for potentially affected records and follow organizational incident/privacy process.

## 29. RB-FBR-014 – Receipt Document Render or Storage Failure

### Procedure

1. Confirm payment transaction and receipt database record are committed.
2. Do not re-post payment.
3. Check renderer availability, Arabic font availability, template version, and object-storage health.
4. Retry document rendering idempotently for the existing Receipt ID.
5. Verify output language, amount, identifiers, and bidi rendering.
6. Store artifact under the existing receipt record reference.
7. Audit re-render action where required.
8. Notify user to retry download only after artifact is available.

## 30. RB-FBR-015 – Notification Handoff Failure

### Procedure

1. Confirm Finance transaction committed successfully.
2. Identify event type and recipient/template request reference.
3. Verify Communication application boundary status.
4. Retry handoff using event deduplication key.
5. Do not regenerate payment, invoice, receipt, or refund transaction.
6. Confirm one logical notification request exists per deduplication rule.
7. Delivery failure beyond handoff is handled by Communication runbooks.

## 31. RB-FBR-016 – Finance Bulk Import or Sync Issue

Current Module 12 does not define an unrestricted bulk import API for posted financial transactions. This runbook applies only to an approved migration/import utility or internal reconciliation sync executed under change control.

### Procedure

1. Stop the import/sync job.
2. Record job run ID, source file checksum, source row count, accepted count, rejected count, and last committed chunk.
3. Determine commit strategy:
   - all-or-nothing transaction;
   - chunked commits with durable checkpoint and row idempotency keys.
4. Do not restart from row 1 unless the job is proven idempotent.
5. Validate source-to-target mapping and branch ownership.
6. Quarantine invalid rows with exact error codes; do not silently coerce amounts, dates, branch IDs, invoice IDs, or payment methods.
7. For chunked imports, resume from the last verified committed checkpoint.
8. Run control totals by branch and currency:
   - source amount sum;
   - imported amount sum;
   - row count;
   - duplicate business-key count.
9. Run Finance reconciliation controls.
10. Obtain business owner sign-off before marking migration/import complete.
11. Preserve source checksum, mapping version, result file, and audit reference.

### Prohibited Bulk Import Targets

Direct import must not bypass domain workflows for:

- issued invoice state transitions;
- posted payments;
- refund approval/execution;
- receipt numbering;
- corporate credit rule overlap validation.

## 32. RB-FBR-017 – Database Restore and Post-Recovery Reconciliation

### Procedure

1. Follow the coordinated PITR/full restore procedure in section 12.
2. Keep Finance mutations disabled after database promotion.
3. Verify application schema version.
4. Run all zero-exception reconciliation controls.
5. Compare daily/period control totals against latest trusted report snapshot and business records.
6. Review incident-window bank/cash evidence for payments that may have occurred outside the recovered point.
7. For each uncertain external payment, investigate before posting; use original external reference and controlled idempotency key.
8. Rebuild/refresh reporting models.
9. Validate branch-scoped and consolidated report totals.
10. Verify object-storage document references; regenerate documents only from authoritative records where necessary.
11. Verify notification deduplication state before replaying notification requests.
12. Re-enable Finance mutations after technical and Finance business owner approval.
13. Monitor error, rollback, reconciliation, and idempotency metrics closely after reopening.

## 33. Operational SQL/Query Safety Principles

1. Production repair queries must begin with read-only diagnosis.
2. Every write repair must have exact predicates and expected affected-row counts.
3. Use transactions for repair scripts.
4. Capture before-state evidence.
5. Require peer review and approved incident/change ticket.
6. Never run unbounded `UPDATE` or `DELETE` on Finance tables.
7. Never hard delete posted financial data.
8. Reconciliation controls must run immediately after repair.
9. Repair actor and reason must be auditable.

## 34. Operational Dashboard

The operations dashboard should show:

- Finance route request rate, errors, and latency;
- payment post success/failure/rollback rate;
- idempotency replay/conflict count;
- refund execution failures;
- reconciliation exception gauges;
- credit-validation latency and decision distribution;
- DB pool usage and waiters;
- deadlocks and lock waits;
- read-model staleness;
- export backlog and failure rate;
- object-storage errors;
- notification handoff failures;
- backup/PITR health indicator supplied by platform operations.

Business KPI dashboards from Part 8 are separate from this operational dashboard.

## 35. Incident Severity Guide

| Severity | Examples                                                                                                                                                                       | Response Expectation                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| SEV-1    | Confirmed duplicate widespread payment posting, data corruption, cross-branch exposure, database unavailable with Finance stopped, backup chain failure with material RPO risk | Immediate incident command and mutation containment.  |
| SEV-2    | Payment failure rate elevated, refund execution blocked, credit validation unavailable, reconciliation mismatch affecting money                                                | Urgent engineering/database response.                 |
| SEV-3    | Stale dashboard, export backlog, receipt renderer unavailable while payments remain safe                                                                                       | Business-hours urgent or on-call according to impact. |
| SEV-4    | Single-user validation/configuration issue with workaround and no integrity impact                                                                                             | Normal support workflow.                              |

## 36. Post-Incident Requirements

For SEV-1 and SEV-2 incidents:

1. Produce incident timeline using correlation IDs, audit events, deployment records, and database evidence.
2. Quantify affected branches, entities, currencies, and monetary difference.
3. Document containment and recovery actions.
4. Add or update automated regression tests.
5. Add observability if detection was delayed.
6. Review whether runbook steps were sufficient.
7. Record owner and due date for corrective actions.
8. Obtain Finance business-owner sign-off where money reconciliation was involved.

## 37. Operations Acceptance Criteria

1. Every Finance request and scheduled job carries a correlation ID.
2. Payment post trace shows authorization, scope resolution, validation, transaction, allocation, reconciliation, receipt, and audit boundaries without logging prohibited data.
3. Critical metrics and alerts are deployed before production launch.
4. Liveness does not flap during database dependency failure; readiness correctly removes unsafe replicas from traffic.
5. Reconciliation jobs detect injected balance/allocation mismatches within the defined operational interval.
6. Restore exercise meets RPO ≤15 minutes and RTO ≤4 hours for the tested transactional recovery scenario.
7. Read-model failure does not block payment posting and does not get used for credit/payment authorization decisions.
8. Duplicate client retry returns the original payment outcome without a second transaction.
9. Runbook exercises prove operators can resolve receipt-render failure without re-posting payment.
10. Export workload isolation test keeps payment p95 within the Part 10 target.
11. Branch-isolation alerting and incident procedure are tested with synthetic denied access events.
12. Production repair procedure demonstrates peer review, exact predicates, before/after evidence, audit reference, and reconciliation verification.
