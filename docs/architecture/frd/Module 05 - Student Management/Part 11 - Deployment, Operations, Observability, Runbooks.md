# Part 11 - Deployment, Operations, Observability, Runbooks
## Module 5 – Student Management

## 1. Purpose

This document defines deployment-facing operational guidance, observability standards, health checks, backup/recovery instructions, and troubleshooting runbooks for **Module 5 – Student Management**.

This part assumes a **modular monolith** deployment with:
- Next.js application runtime,
- PostgreSQL,
- centralized logging,
- centralized metrics,
- centralized tracing,
- internal job execution for exports and reporting refreshes where needed.

This module owns the following operationally critical tables:
- `student_profiles`
- `student_status_history`
- `student_id_card_history`
- `student_duplicate_cases`
- `student_duplicate_case_items`
- `student_merge_logs`
- `student_export_logs`

---

## 2. Deployment Model

## 2.1 Runtime Components

| Component | Purpose |
|---|---|
| Admin Portal App Runtime | Serves admin UI and route handlers |
| Student Portal Runtime | Serves self-view read-only endpoints |
| Trainer Portal Runtime | Serves roster-context read-only endpoints |
| Application Background Worker | Handles async exports, reporting refresh hooks, and notification dispatch handoff where applicable |
| PostgreSQL Database | Transactional source for module-owned tables |
| Shared Cache (optional) | Short-lived caching of safe read models and lookup metadata |
| Object Storage | Private storage for generated export files |
| Central Logging Pipeline | Aggregates structured logs |
| Metrics Backend | Stores counters, histograms, gauges |
| Tracing Backend | Stores distributed traces and spans |

## 2.2 Deployment Constraints

1. Student Management must be deployable as part of the modular monolith without requiring independent service deployment.
2. Feature flags may be used for:
   - duplicate workbench,
   - merge UI,
   - sensitive export controls,
   - student portal self-view,
   - trainer quick view.
3. Database migrations affecting owned tables must be backward-compatible during rolling deployments.
4. Export jobs must continue safely across app restarts or be restartable without duplication.

---

## 3. Observability Architecture

## 3.1 Structured Logging Standard

All application logs emitted by this module must be structured JSON.

### Required Log Fields
| Field | Description |
|---|---|
| `timestamp` | ISO 8601 timestamp with offset |
| `level` | `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL` |
| `service` | Application/runtime name |
| `module` | `student-management` |
| `environment` | `dev`, `qa`, `uat`, `prod` |
| `requestId` | Request correlation ID |
| `traceId` | Distributed trace ID |
| `spanId` | Current span ID |
| `userId` | Authenticated user ID if present |
| `actorType` | `human`, `service`, `system` |
| `branchId` | Effective branch context if resolved |
| `operation` | Logical operation name |
| `entityType` | `student_profile`, `duplicate_case`, `merge_log`, etc. |
| `entityId` | UUID when applicable |
| `outcome` | `success`, `failure`, `denied`, `retrying` |
| `errorCode` | Stable application error code if applicable |
| `durationMs` | Operation duration in milliseconds |

### Optional Log Fields
- `httpMethod`
- `route`
- `statusCode`
- `exportLogId`
- `duplicateCaseId`
- `mergeLogId`
- `studentNumberMasked`
- `candidateCount`
- `retryCount`

### Log Redaction Rules
Never log raw:
- Civil ID
- passport number
- visa number
- current full ID card number
- full date of birth unless specifically approved in secure internal operational logging
- unmasked email/phone in broad logs
- full export payload contents if sensitive data is present

Only masked, hashed, or reference IDs may be logged.

### Example Success Log
```json
{
  "timestamp": "2026-07-03T11:21:22+04:00",
  "level": "INFO",
  "service": "asti-admin-portal",
  "module": "student-management",
  "environment": "prod",
  "requestId": "req_01JABCXYZ",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "spanId": "b9c7c989f97918e1",
  "userId": "0e33d32e-8c4a-4e35-9466-c1fe0c67d931",
  "actorType": "human",
  "branchId": "9b38949b-4c2f-4cd5-9cb4-8c6dba679101",
  "operation": "student.update",
  "entityType": "student_profile",
  "entityId": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
  "outcome": "success",
  "durationMs": 318
}
```

### Example Failure Log
```json
{
  "timestamp": "2026-07-03T11:23:12+04:00",
  "level": "WARN",
  "service": "asti-admin-portal",
  "module": "student-management",
  "environment": "prod",
  "requestId": "req_01JABCEFG",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "spanId": "f4b2b1c47998e221",
  "userId": "0e33d32e-8c4a-4e35-9466-c1fe0c67d931",
  "actorType": "human",
  "branchId": "9b38949b-4c2f-4cd5-9cb4-8c6dba679101",
  "operation": "student.merge",
  "entityType": "student_profile",
  "entityId": "2827ed75-7a9a-4f40-90db-eaa42cc9820b",
  "outcome": "failure",
  "errorCode": "ERR_STU_MERGE_TRANSACTION_FAILED",
  "durationMs": 1241
}
```

---

## 3.2 Tracing Boundaries

Tracing must capture complete request paths for sensitive workflows.

### Required Trace Boundaries
1. UI action → route handler → domain service → repository → DB
2. Duplicate check → scoring engine → duplicate case persistence
3. Merge command → validation → transactional reassignment → merge log write → audit emission
4. Export request → export log create → background worker → file generation → notification handoff
5. Dashboard load → read model / reporting view queries
6. Student portal self-view → profile lookup → self-linked summary query
7. Trainer quick view → roster authorization check → student read projection

### Recommended Span Names
- `student.list`
- `student.detail.read`
- `student.create.direct`
- `student.create.fromAdmission`
- `student.create.fromCorporateParticipant`
- `student.update`
- `student.status.change`
- `student.archive`
- `student.restore`
- `student.idCard.issue`
- `student.idCard.reissue`
- `student.duplicate.check`
- `student.duplicate.resolve`
- `student.merge.execute`
- `student.export.request`
- `student.export.generate`
- `student.dashboard.kpi.load`
- `student.report.run`

### Trace Attributes
- `module=student-management`
- `branch.id`
- `user.id`
- `student.id`
- `duplicate.case.id`
- `merge.log.id`
- `export.log.id`
- `permission.check.result`
- `branch.scope.result`
- `error.code`

---

## 3.3 Metrics Instrumentation

### Core Counters
| Metric Name | Type | Description |
|---|---|---|
| `student_requests_total` | Counter | Total module requests by route/method/status |
| `student_create_total` | Counter | Student create operations by source |
| `student_update_total` | Counter | Student updates |
| `student_status_change_total` | Counter | Status changes by old/new status |
| `student_archive_total` | Counter | Archives |
| `student_restore_total` | Counter | Restores |
| `student_idcard_issue_total` | Counter | ID card issue actions |
| `student_idcard_reissue_total` | Counter | ID card reissues |
| `student_duplicate_check_total` | Counter | Duplicate check executions |
| `student_duplicate_block_total` | Counter | Blocking duplicate outcomes |
| `student_duplicate_case_created_total` | Counter | Duplicate cases created |
| `student_duplicate_case_resolved_total` | Counter | Duplicate cases resolved |
| `student_merge_total` | Counter | Merge attempts |
| `student_merge_success_total` | Counter | Successful merges |
| `student_merge_failure_total` | Counter | Failed merges |
| `student_export_request_total` | Counter | Export requests |
| `student_export_success_total` | Counter | Completed exports |
| `student_export_failure_total` | Counter | Failed exports |
| `student_permission_denied_total` | Counter | Permission denials |
| `student_branch_scope_denied_total` | Counter | Branch scope denials |

### Histograms
| Metric Name | Type | Description |
|---|---|---|
| `student_request_duration_ms` | Histogram | End-to-end request latency |
| `student_duplicate_check_duration_ms` | Histogram | Duplicate-check latency |
| `student_merge_duration_ms` | Histogram | Merge execution latency |
| `student_export_generation_duration_ms` | Histogram | Export generation duration |
| `student_report_duration_ms` | Histogram | Report execution latency |
| `student_dashboard_widget_duration_ms` | Histogram | Widget load latency |
| `student_db_query_duration_ms` | Histogram | DB query latency by operation |

### Gauges
| Metric Name | Type | Description |
|---|---|---|
| `student_duplicate_open_cases` | Gauge | Open duplicate backlog |
| `student_exports_in_progress` | Gauge | Active export jobs |
| `student_read_model_staleness_seconds` | Gauge | Reporting view freshness lag |
| `student_active_sessions` | Gauge | Active module user sessions if tracked |
| `student_health_status` | Gauge | 1 healthy / 0 unhealthy module status |

### Label Dimensions
Use controlled label cardinality only:
- `route`
- `method`
- `status_code`
- `operation`
- `branch_scope_type`
- `creation_source`
- `risk_level`
- `export_status`

Avoid high-cardinality labels like raw student ID or user ID in metrics.

---

## 4. Health Checks

## 4.1 Health Check Levels

### Liveness Check
Purpose: determine whether the process should be restarted.

**Checks**
- runtime event loop responsive
- application boot completed
- no fatal startup config error

**Does Not Check**
- database query health
- downstream service health

### Readiness Check
Purpose: determine whether the instance can safely serve traffic.

**Checks**
1. Database connectivity available
2. Required migrations applied or runtime compatible
3. Secrets loaded
4. Module configuration available
5. Background worker dependency check if worker-enabled instance
6. If export generation depends on object storage, storage credentials available

### Deep Health Check (Ops-only)
Purpose: operational diagnostics.

**Checks**
1. lightweight query to `student_profiles`
2. lightweight query to `student_duplicate_cases`
3. reporting view freshness threshold
4. background export queue depth
5. audit handoff health if instrumented
6. object storage write/read check for export subsystem
7. duplicate case unresolved backlog threshold warning
8. recent merge failure count warning

---

## 4.2 Health Status Rules

| Condition | Health Result |
|---|---|
| Process alive, DB OK, config OK | Healthy |
| Process alive, DB unavailable | Not Ready |
| Process alive, DB OK, reporting views stale | Ready with warning |
| Process alive, export subsystem failing | Ready with degraded export warning |
| Fatal migration mismatch | Not Ready |
| Secrets unavailable | Not Ready |

---

## 5. Backup and Recovery Instructions

## 5.1 Owned Tables in Recovery Scope
- `student_profiles`
- `student_status_history`
- `student_id_card_history`
- `student_duplicate_cases`
- `student_duplicate_case_items`
- `student_merge_logs`
- `student_export_logs`

## 5.2 Backup Strategy

### Database Backups
- Full PostgreSQL backups according to platform standard
- WAL/PITR enabled
- Backup verification performed regularly

### Recommended Backup Cadence
- full backup: daily
- incremental / WAL continuous
- export files in object storage backed up by storage policy where retention requires it

### Recovery Targets
- RPO <= 15 minutes
- RTO <= 2 hours for module-owned table recovery

## 5.3 Recovery Principles

1. Prefer application-level corrective actions where possible:
   - restore archived record,
   - replay export generation,
   - regenerate read models,
   - re-open duplicate case
2. Use table-level or PITR recovery only when data loss or corruption exceeds application repair scope.
3. Preserve audit integrity.
4. Never recover by hard-deleting newer valid data without controlled approval.

## 5.4 Table Recovery Workflow

### Scenario: Recover accidentally lost rows after database incident
1. Confirm incident window and affected tables.
2. Pause non-essential write traffic if required.
3. Identify recovery point target time.
4. Restore to shadow environment or temporary recovery instance.
5. Extract affected rows for owned tables.
6. Validate referential integrity against current production identifiers.
7. Generate recovery script or controlled data patch.
8. Apply during approved maintenance/change window.
9. Validate row counts and spot-check records.
10. Record incident and recovery in ops audit log.

## 5.5 Export File Recovery
If export file object is missing but export log exists:
1. Confirm export status and file reference.
2. If data window still valid and user allowed, regenerate export from saved filter snapshot.
3. Update export log with regenerated file reference and incident note if policy allows.
4. If regeneration is not allowed, mark export as failed and notify requester.

---

## 6. Operational Procedures

## 6.1 Daily Checks
1. Review module error dashboard.
2. Review duplicate backlog gauge and blocking-case spikes.
3. Review merge failure count.
4. Review export failure count.
5. Review read model staleness.
6. Review slowest student list/detail/report queries.

## 6.2 Weekly Checks
1. Verify backup completion and restore test evidence.
2. Review top permission denials and branch scope denials for anomalies.
3. Review large export usage and sensitive export frequency.
4. Review dead-letter or failed background jobs if export worker uses retry queue pattern.
5. Review index health and slow query plans for reporting views.

## 6.3 Release-Time Checks
1. Confirm schema migration compatibility.
2. Confirm new indexes built successfully.
3. Confirm read model refresh jobs healthy.
4. Confirm feature flags set correctly.
5. Confirm dashboards and alerts updated for new routes/operations.

---

## 7. Troubleshooting Runbooks

## 7.1 Runbook: Student Create Fails with Duplicate Blocking Match

### Symptoms
- Users cannot create students
- API returns `ERR_STU_DUPLICATE_BLOCKING_MATCH`
- Duplicate case count spikes

### Steps
1. Capture request ID and duplicate case ID from UI/API response.
2. Open duplicate case detail in duplicate workbench.
3. Verify which signals matched:
   - Civil ID
   - passport
   - visa
   - email
   - phone
   - name + DOB similarity
4. Confirm whether match is true duplicate or false positive.
5. If true duplicate:
   - reuse existing student, or
   - resolve through merge workflow if duplicate records exist
6. If false positive:
   - resolve duplicate case as `NotDuplicate`
   - document resolution reason
7. Reattempt original workflow after case resolution.
8. If blocking cases spike abnormally across branches:
   - inspect duplicate scoring release/config changes
   - inspect normalization/hashing pipeline
   - inspect source data input regressions

### Escalate When
- blocking matches increase > 3x normal baseline
- duplicate engine results appear inconsistent
- multiple branches affected simultaneously

---

## 7.2 Runbook: Student Merge Transaction Failure

### Symptoms
- API returns `ERR_STU_MERGE_TRANSACTION_FAILED`
- merge failure alerts triggered
- source student remains active or merge incomplete in UI

### Steps
1. Capture request ID, source student ID, survivor student ID.
2. Search logs for operation `student.merge.execute`.
3. Confirm whether transaction rolled back fully.
4. Check for:
   - stale version conflict
   - downstream reference reassignment failure
   - DB constraint violation
   - deadlock or timeout
5. Verify current state:
   - source student status
   - survivor student data
   - duplicate case status
   - merge log existence
6. If no merge log exists and source remains active:
   - safe to reattempt after root cause fix
7. If merge log exists but downstream references are inconsistent:
   - treat as severity-high incident
   - freeze further merge attempts on affected records
   - inspect transaction boundaries and compensating patch path
8. Correct root cause:
   - fix invalid downstream reference
   - resolve lock contention
   - re-run merge under controlled supervision
9. Record incident outcome and audit note.

### Escalate When
- any evidence of partial merge state
- repeated failures on same records
- cross-module reassignment inconsistencies

---

## 7.3 Runbook: Export Generation Failure

### Symptoms
- export request accepted but later fails
- `student_export_failure_total` rises
- users report missing download links

### Steps
1. Capture export log ID.
2. Open export log record:
   - status
   - requester
   - filter snapshot
   - format
   - row count estimate
3. Check worker logs for operation `student.export.generate`.
4. Determine failure class:
   - DB query timeout
   - object storage write failure
   - permission mismatch during async generation
   - file serialization failure
   - oversized result set
5. If transient:
   - retry generation from export log snapshot
6. If object storage issue:
   - validate credentials and bucket/container availability
7. If data size issue:
   - verify threshold configuration and split/queued mode
8. If export contained sensitive data:
   - ensure retry still respects permission and audit requirements
9. Notify requester on success or failure outcome.

### Escalate When
- repeated export failure > 5 in 15 minutes
- object storage unavailable
- sensitive export cannot be accounted for in logs

---

## 7.4 Runbook: Read Model / Reporting View Staleness

### Symptoms
- dashboard data delayed banner shown
- report counts differ from transactional list
- `student_read_model_staleness_seconds` above threshold

### Steps
1. Identify affected view/materialized view.
2. Check refresh job or event-driven projection status.
3. Verify latest refresh timestamp.
4. Check whether source table writes are continuing normally.
5. If scheduled refresh failed:
   - inspect scheduler/worker logs
   - rerun refresh manually
6. If event-driven updates failed:
   - inspect event dispatch / processing backlog
7. Validate refreshed counts against transactional queries.
8. Clear degraded mode banner once freshness returns below threshold.

### Escalate When
- stale duration > 30 minutes for operational dashboards
- counts materially inconsistent after successful refresh
- refresh failures recur after manual rerun

---

## 7.5 Runbook: Branch Scope Leakage Suspected

### Symptoms
- user reports seeing another branch’s students
- automated security test fails
- unexpected records appear in reports or list views

### Steps
1. Capture:
   - request ID
   - user ID
   - branch assignments
   - affected endpoint/report
   - sample leaked record IDs
2. Immediately validate whether leak is:
   - UI filtering only defect
   - API scope defect
   - reporting view scope defect
3. If API scope defect suspected:
   - treat as security incident
   - disable affected endpoint/report if needed via feature flag or route protection
4. Reproduce using same permissions and branch scope.
5. Review authorization middleware and query predicates.
6. Check whether consolidated mode was incorrectly enabled.
7. Validate joins on reporting view do not omit branch filters.
8. Patch and retest before re-enabling.
9. Review audit logs for potential breadth of exposure.
10. Notify security/compliance owners per incident policy.

### Escalate When
- any confirmed cross-branch disclosure
- sensitive fields exposed
- export included out-of-scope records

---

## 7.6 Runbook: ID Card Number Conflict

### Symptoms
- issue/reissue fails with `ERR_STU_ID_CARD_NUMBER_EXISTS`

### Steps
1. Capture request ID and masked conflicting number.
2. Search secure admin view or DB support query for existing current holder.
3. Determine whether:
   - intended number truly already assigned,
   - source student archived but current unique constraint still valid,
   - stale UI attempted reuse,
   - correction/reissue workflow should be used instead.
4. If user typo:
   - correct and retry
5. If incorrect historical assignment:
   - use controlled correction/reissue workflow
6. Never bypass uniqueness with manual DB edits without approved incident path.
7. Record reason for corrective action.

---

## 7.7 Runbook: Concurrency Failure on Update

### Symptoms
- `ERR_STU_CONCURRENT_MODIFICATION`
- user says save failed because record changed

### Steps
1. Confirm submitted version and current persisted version.
2. Reload current student detail.
3. Compare changed fields.
4. Ask user/operator to reapply intended changes on latest record snapshot.
5. If repeated conflicts occur frequently:
   - inspect long edit session behavior
   - inspect optimistic lock implementation
   - consider UI refresh/warning improvements
6. Ensure no hidden background process is unexpectedly updating student records.

---

## 7.8 Runbook: Sensitive Export Audit Review

### Trigger
Periodic compliance review or alert for sensitive export count.

### Steps
1. Open export audit report filtered to `included_masked_identity=true`.
2. Validate each export has:
   - requester,
   - branch scope,
   - reason,
   - row count,
   - status
3. Confirm requester had elevated permission at request time.
4. Sample review whether scope was operationally justified.
5. Escalate suspicious patterns:
   - unusually large row counts,
   - repeated exports by same user,
   - off-hours activity,
   - exports across many branches.

---

## 7.9 Runbook: Bulk Import / Bulk Sync Identity Collision

Although Student Management does not own a bulk import module in this spec, identity data may arrive from admission imports, corporate loads, or online handoff batches.

### Symptoms
- large number of duplicate cases after upstream sync
- student creation failures from system actors
- source batch partially processed

### Steps
1. Identify upstream source:
   - admission handoff
   - corporate participant sync
   - online registration handoff
2. Determine import batch ID / source window.
3. Quantify:
   - attempted creates
   - successful creates
   - reused existing
   - duplicate-blocked
   - failed validations
4. Validate source normalization:
   - phone format
   - email case
   - identity number formatting
5. Separate failure groups:
   - validation failures
   - duplicate cases
   - branch scope mismatches
   - numbering generation failures
6. If duplicate cases dominate:
   - triage using bulk duplicate review queue
   - do not disable duplicate protection
7. If numbering issue:
   - restore numbering configuration before replay
8. Replay only idempotent failed items after root cause fix.
9. Document affected rows and resolution summary.

### Escalate When
- batch replay would cause uncertain duplicates
- upstream source quality is severely degraded
- system actor branch resolution is incorrect across many records

---

## 8. Diagnostic Queries and Safe Ops Notes

### Safe Ops Principles
1. Prefer read-only diagnostic queries first.
2. Never patch raw PII in production outside approved change path.
3. Never manually delete student rows.
4. Never repair merge states without preserving audit trail.
5. Record all production data fixes in incident/change management.

### Recommended Diagnostic Questions
- Is the user in the correct branch scope?
- Did permission fail or concealment hide the record?
- Is the record archived?
- Did duplicate logic open a blocking case?
- Did optimistic locking reject stale write?
- Is export failure query-side, storage-side, or permission-side?
- Are read models stale or transaction data missing?

---

## 9. Operations Alert Matrix

| Alert | Trigger | Severity | First Response |
|---|---|---|---|
| Student API 5xx spike | >2% over 5 min | High | Check recent deploy, logs, DB health |
| Merge failure | Any failure | High | Freeze affected merge path, inspect transaction logs |
| Branch scope leakage suspected | Any confirmed leak | Critical | Contain endpoint/report, open security incident |
| Export failures spike | >5 failures in 15 min | High | Inspect worker/storage/query health |
| Duplicate backlog spike | > configured branch baseline | Medium/High | Inspect data source and duplicate scoring |
| Read model staleness > threshold | freshness breach | Medium | Refresh projections and inspect jobs |
| Audit handoff failure | persistent retries or dropped events | Critical | Investigate immediately; do not ignore |

---

## 10. Final Operational Notes

1. Module 5 operations are highly sensitive because the module is a master-data and identity boundary.
2. The most critical failure classes are:
   - cross-branch leakage,
   - duplicate/merge corruption,
   - export leakage,
   - audit gaps.
3. Backup drills, branch-scope tests, and merge-failure recovery drills should be part of release readiness.
4. Any suspected privacy breach involving student PII must be treated as a security incident, not a routine bug.
