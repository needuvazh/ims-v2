# Part 11 - Deployment, Operations, Observability, Runbooks

## Module 08 – Attendance Management

| Attribute | Value |
|---|---|
| Product | ASTI Integrated Institute Management System (IMS) |
| Module | Module 08 – Attendance Management |
| Module Code | M08-ATT |
| Bounded Context | Attendance Management |
| Primary Package | `packages/attendance` |
| Application | `apps/admin-portal`; trainer/student portal surfaces where enabled |
| Architecture Style | TypeScript / Next.js modular monolith |
| Database | PostgreSQL through Prisma |
| Default Business Timezone | Oman GST, UTC+4 |
| Operations Ownership | Application Engineering + Database Operations + Support/Admin Operations |

---

## 1. Purpose

This document defines deployment, operations, observability, health checks, backup/recovery guidance, and troubleshooting runbooks for Module 08 – Attendance Management. It is intended for developers, DevOps engineers, support engineers, QA engineers, and production administrators responsible for safe release and stable operation of attendance workflows.

Attendance operations are time-sensitive because trainers mark attendance during scheduled training sessions and attendance directly affects completion eligibility, certificate readiness, learner warnings, and operational dashboards. The module must therefore provide clear deployment controls, structured logs, traceable transactions, measurable service health, and actionable recovery procedures.

---

## 2. Deployment Architecture

### 2.1 Runtime Components

| Component | Responsibility |
|---|---|
| `apps/admin-portal` | Admin UI screens for attendance sessions, corrections, dashboards, reports, rules, and audit views. |
| Trainer portal attendance pages | Trainer-facing marking and assigned session views when enabled. |
| Student portal attendance pages | Student self-service attendance summary view when enabled. |
| `packages/attendance/domain` | Attendance entities, state transitions, business rules, summary calculations. |
| `packages/attendance/application` | Use cases: generate session, mark attendance, submit session, request correction, approve correction, calculate summaries, generate reports. |
| `packages/attendance/infrastructure` | Prisma repositories, query builders, reporting views, export adapters. |
| `packages/attendance/ui` | Reusable components such as roster grid, status selectors, correction forms, KPI cards. |
| `packages/shared` | Auth context, branch scope resolver, validation utilities, localized errors, audit client. |
| PostgreSQL | Persistent storage for attendance-owned entities and reporting views. |
| Object storage or secure file storage | Temporary storage for CSV/PDF/XLSX exports when configured. |
| Communication module | Receives notification requests for low attendance, correction workflow, and submission reminders. |
| Audit module | Stores audit records for sensitive attendance operations. |

### 2.2 Owned Database Tables

Attendance Management owns and must deploy migrations for these tables:

| Table | Prisma Model | Operational Criticality |
|---|---|---|
| `attendance_sessions` | `AttendanceSession` | Critical |
| `attendance_records` | `AttendanceRecord` | Critical |
| `attendance_corrections` | `AttendanceCorrection` | Critical |
| `attendance_alert_rules` | `AttendanceAlertRule` | Medium |
| `attendance_alerts` | `AttendanceAlert` | Medium |
| `enrollment_attendance_summaries` | `EnrollmentAttendanceSummary` | Critical for completion readiness |
| `attendance_export_requests` if implemented | `AttendanceExportRequest` | Medium |
| `attendance_idempotency_keys` if implemented | `AttendanceIdempotencyKey` | High for retry safety |

### 2.3 Referenced Tables Not Owned by Attendance

| Referenced Table | Owning Context | Attendance Usage |
|---|---|---|
| `branches` | Organization Management | Branch isolation and reports. |
| `courses` | Course Catalog Management | Course filters and completion thresholds. |
| `batches` | Training Delivery Management | Attendance grouping and roster source. |
| `sessions` | Training Delivery / Scheduling | Source scheduled class/session. |
| `enrollments` | Admission & Enrollment | Central learner lifecycle aggregate. |
| `student_profiles` | Admission & Enrollment | Student display and reporting. |
| `trainer_profiles` | Faculty / Trainer | Trainer assignment and marking access. |
| `users` | Identity & Access | Actor and audit identity. |
| `audit_logs` | Audit & Compliance | Sensitive action audit. |
| `notification_requests` | Communication & Notification | Notification delivery requests. |

---

## 3. Deployment Strategy

### 3.1 Environment Progression

```text
Local Development
   ↓
Developer Integration Environment
   ↓
QA / Test Environment
   ↓
UAT Environment with ASTI business validation
   ↓
Production
```

### 3.2 Release Types

| Release Type | Examples | Approval Requirement |
|---|---|---|
| Schema-only compatible | Add nullable column, add index concurrently, create read view | Engineering review + migration dry run |
| Application-only | UI validation change, report filter enhancement | QA regression |
| Schema + application | New correction workflow field, new alert rule fields | QA + UAT validation |
| Permission-sensitive | New permission or changed guard | Security/RBAC review |
| Reporting-heavy | New views, large aggregation indexes | Database performance review |
| Data correction release | Backfill summaries or fix attendance statuses | Principal engineer approval + audit plan |

### 3.3 Deployment Order

For Attendance changes that include database migrations, deploy in this order:

```text
1. Confirm backup/PITR status.
2. Run migration dry run in staging using production-like data volume.
3. Deploy backward-compatible database migrations.
4. Deploy application package and UI changes.
5. Run smoke tests for auth, branch scope, marking, submission, correction, reports.
6. Verify observability dashboards and error rates.
7. Enable new permissions or feature flags if applicable.
8. Monitor for at least one complete attendance marking window.
```

### 3.4 Backward-Compatible Migration Rules

| Rule ID | Rule |
|---|---|
| DEP-M08-001 | Do not deploy a non-null column without default/backfill plan. |
| DEP-M08-002 | Do not drop or rename attendance columns in the same release that removes application usage. Use expand-migrate-contract. |
| DEP-M08-003 | Indexes on large attendance tables must be created using a low-locking strategy supported by the deployment environment. |
| DEP-M08-004 | Data backfills must be idempotent and restartable. |
| DEP-M08-005 | Summary recomputation scripts must write audit or operational maintenance logs. |
| DEP-M08-006 | Permission seed changes must be deployed before UI exposes new action buttons. |
| DEP-M08-007 | Rollback must not hard-delete attendance data created during the failed deployment. |

### 3.5 Feature Flags

| Feature Flag | Purpose | Default |
|---|---|---|
| `attendance.trainerPortal.enabled` | Enables trainer attendance marking UI. | Enabled only after trainer auth mapping validation. |
| `attendance.studentPortal.enabled` | Enables student self attendance view. | Enabled when student portal is available. |
| `attendance.corrections.enabled` | Enables correction workflow. | Enabled. |
| `attendance.lowAttendanceAlerts.enabled` | Enables alert generation. | Enabled after rule configuration. |
| `attendance.bulkImport.enabled` | Enables bulk import if implemented. | Disabled unless explicitly released. |
| `attendance.exports.async.enabled` | Uses async export job for large reports. | Enabled for large exports. |
| `attendance.consolidatedReports.enabled` | Enables multi-branch reporting. | Disabled unless consolidated report permissions are configured. |

### 3.6 Rollback Strategy

| Scenario | Rollback Action |
|---|---|
| UI defect only | Revert application build; database remains unchanged. |
| Permission seed issue | Disable related menu/action permission and redeploy corrected seed. |
| Report query causes load | Disable report route/feature flag; keep marking endpoints active. |
| Migration added compatible columns | Roll back application; leave columns in place for later cleanup. |
| Migration corrupts derived summaries | Restore summaries from recomputation based on attendance records; do not restore full database unless primary records are corrupt. |
| Primary attendance records corrupt | Stop writes, isolate affected time window, restore from PITR or backup into recovery database, reconcile manually with audit logs. |

---

## 4. Configuration and Environment Variables

### 4.1 Required Configuration

| Key | Description | Example |
|---|---|---|
| `ATTENDANCE_DEFAULT_TIMEZONE` | Business timezone for date rendering. | `Asia/Muscat` |
| `ATTENDANCE_MAX_ROSTER_SIZE` | Maximum roster rows allowed in UI marking screen. | `150` |
| `ATTENDANCE_DRAFT_AUTOSAVE_SECONDS` | Client draft autosave interval where enabled. | `30` |
| `ATTENDANCE_EXPORT_MAX_ROWS_SYNC` | Maximum rows for synchronous export. | `5000` |
| `ATTENDANCE_EXPORT_RETENTION_HOURS` | Temporary export file retention. | `24` |
| `ATTENDANCE_LOW_THRESHOLD_DEFAULT` | Default low attendance threshold. | `75` |
| `ATTENDANCE_IDEMPOTENCY_TTL_HOURS` | Retention for idempotency keys. | `24` |
| `ATTENDANCE_CORRECTION_IDEMPOTENCY_TTL_DAYS` | Retention for correction approval idempotency. | `7` |
| `ATTENDANCE_RATE_LIMIT_SUBMIT_PER_5_MIN` | Submission rate limit. | `20` |
| `ATTENDANCE_STRUCTURED_LOGS_ENABLED` | Enables JSON logs. | `true` |

### 4.2 Configuration Validation at Startup

The application startup health check must validate:

1. Attendance module package is loadable.
2. Required environment keys are present or safe defaults are available.
3. Database connection is available.
4. Attendance-owned tables exist.
5. Required indexes exist or migration version indicates readiness.
6. Required permissions exist in IAM seed data.
7. Audit client is reachable inside the modular monolith boundary.
8. Default timezone resolves correctly.

---

## 5. Observability Overview

### 5.1 Observability Goals

| Goal | Description |
|---|---|
| Diagnose user failures quickly | Use correlation IDs to trace a failed marking or correction request. |
| Detect operational degradation | Track slow roster loads, submission latency, export failures, and report query load. |
| Prove audit coverage | Measure audit log write success for sensitive mutations. |
| Protect privacy | Ensure logs contain internal IDs and counts, not raw PII. |
| Support branch-level operations | Metrics and logs include branch ID where appropriate for operational isolation. |

### 5.2 Signals to Capture

| Signal | Required? | Examples |
|---|---|---|
| Structured logs | Mandatory | Request, validation failure, state transition, audit result, export completion. |
| Metrics | Mandatory | Request latency, submission count, correction count, error count, export queue time. |
| Traces | Mandatory for mutations and reports | Generate session, submit attendance, approve correction, export report. |
| Audit logs | Mandatory for sensitive actions | Status changes, submissions, corrections, exports. |
| Health checks | Mandatory | Database, migration readiness, audit readiness, export storage. |
| Alerts | Mandatory in production | Error rate, latency, failed audit writes, branch access denials spike. |

---

## 6. Structured Logging

### 6.1 Log Format

All Attendance logs must be JSON structured and follow this schema:

```json
{
  "timestamp": "2026-07-04T08:30:00.000Z",
  "level": "INFO",
  "service": "asti-ims-admin-portal",
  "module": "attendance",
  "moduleCode": "M08-ATT",
  "environment": "production",
  "correlationId": "req_01HZXAMPLE000000000000000",
  "traceId": "trc_01HZXAMPLE000000000000000",
  "spanId": "spn_01HZXAMPLE000000000000000",
  "actorUserId": "usr_01HZXAMPLE000000000000000",
  "branchId": "br_01HZXAMPLE000000000000000",
  "permission": "attendance.record.submit",
  "action": "ATTENDANCE_SESSION_SUBMIT",
  "entityType": "AttendanceSession",
  "entityId": "atts_01HZXAMPLE000000000000000",
  "status": "SUCCESS",
  "durationMs": 842,
  "recordCount": 32,
  "errorCode": null,
  "message": "Attendance session submitted successfully"
}
```

### 6.2 Required Log Events

| Event Code | Level | Required Fields |
|---|---|---|
| `ATTENDANCE_SESSION_GENERATE_STARTED` | INFO | correlationId, actorUserId, branchId, sessionId |
| `ATTENDANCE_SESSION_GENERATE_COMPLETED` | INFO | attendanceSessionId, recordCount, durationMs |
| `ATTENDANCE_SESSION_GENERATE_FAILED` | ERROR | errorCode, sanitizedErrorMessage, durationMs |
| `ATTENDANCE_ROSTER_LOADED` | INFO | attendanceSessionId, recordCount, durationMs |
| `ATTENDANCE_DRAFT_SAVE_COMPLETED` | INFO | changedRecordCount, durationMs |
| `ATTENDANCE_SESSION_SUBMIT_STARTED` | INFO | attendanceSessionId, expectedRecordCount |
| `ATTENDANCE_SESSION_SUBMIT_COMPLETED` | INFO | presentCount, absentCount, lateCount, excusedCount, durationMs |
| `ATTENDANCE_SESSION_SUBMIT_FAILED` | ERROR | errorCode, validationFailureCount, durationMs |
| `ATTENDANCE_CORRECTION_REQUESTED` | INFO | attendanceRecordId, correctionId |
| `ATTENDANCE_CORRECTION_APPROVED` | INFO | correctionId, oldStatus, newStatus |
| `ATTENDANCE_CORRECTION_REJECTED` | INFO | correctionId, reasonCategory |
| `ATTENDANCE_REPORT_QUERY_COMPLETED` | INFO | reportCode, rowCount, durationMs |
| `ATTENDANCE_EXPORT_COMPLETED` | INFO | exportId, fileType, rowCount, durationMs |
| `ATTENDANCE_BRANCH_ACCESS_DENIED` | WARN | requestedBranchId, actorUserId, permission |
| `ATTENDANCE_AUDIT_WRITE_FAILED` | ERROR | entityType, entityId, action, errorCode |

### 6.3 Fields That Must Not Be Logged

| Prohibited Field | Reason |
|---|---|
| Civil ID | High-risk PII. |
| Passport number | High-risk PII. |
| Visa number | High-risk PII. |
| Student phone/email | PII; use studentProfileId/personId instead. |
| Raw student full name | Avoid in infrastructure logs; use internal IDs. |
| Authentication tokens | Secret exposure risk. |
| Session cookies | Secret exposure risk. |
| Raw SQL query with user values | Sensitive and injection diagnostics risk. |
| Full correction reason text | May contain sensitive information; log reason length/category only. |

---

## 7. Distributed Tracing Boundaries

Even though the platform is a modular monolith, tracing must clearly mark module boundaries.

### 7.1 Trace Naming

| Use Case | Root Span | Child Spans |
|---|---|---|
| Generate attendance session | `attendance.generateSession` | `auth.resolveContext`, `branch.resolveScope`, `training.loadSession`, `enrollment.loadRoster`, `attendance.createRecords`, `audit.write` |
| Load marking roster | `attendance.loadRoster` | `auth.checkPermission`, `branch.scopeQuery`, `attendance.queryRoster` |
| Save draft | `attendance.saveDraft` | `validate.payload`, `attendance.lockSession`, `attendance.upsertRecords`, `audit.write` |
| Submit attendance | `attendance.submitSession` | `validate.state`, `attendance.lockSession`, `attendance.updateRecords`, `attendance.calculateSummary`, `completion.publishEvidence`, `audit.write` |
| Request correction | `attendance.requestCorrection` | `validate.correction`, `attendance.createCorrection`, `notification.request`, `audit.write` |
| Approve correction | `attendance.approveCorrection` | `attendance.lockCorrection`, `attendance.updateRecord`, `attendance.recalculateSummary`, `audit.write` |
| Generate report | `attendance.generateReport` | `branch.resolveReportScope`, `attendance.queryReadModel`, `export.createFile` |

### 7.2 Trace Attributes

| Attribute | Required For | Example |
|---|---|---|
| `module.code` | All spans | `M08-ATT` |
| `branch.id` | Branch-scoped spans | `br_01HZX...` |
| `actor.user_id` | Authenticated spans | `usr_01HZX...` |
| `attendance.session_id` | Session operations | `atts_01HZX...` |
| `training.session_id` | Schedule/session lookup | `ses_01HZX...` |
| `batch.id` | Roster/report spans | `bat_01HZX...` |
| `record.count` | Bulk operations | `32` |
| `permission.code` | Guard spans | `attendance.record.submit` |
| `error.code` | Failed spans | `ERR_ATT_SESSION_ALREADY_SUBMITTED` |

### 7.3 Trace Sampling

| Environment | Sampling Rule |
|---|---|
| Local | 100% tracing. |
| Development/QA | 100% for Attendance mutations, 25% for reads. |
| UAT | 100% for mutations, 50% for reports, 10% for routine reads. |
| Production | 100% for failures and sensitive mutations; baseline 10% for successful reads; configurable during incidents. |

---

## 8. Metrics Instrumentation

### 8.1 Application Metrics

| Metric Name | Type | Labels | Description |
|---|---|---|---|
| `attendance_api_requests_total` | Counter | route, method, status, branch_scope | Total Attendance API requests. |
| `attendance_api_request_duration_ms` | Histogram | route, method, status | API latency. |
| `attendance_roster_load_duration_ms` | Histogram | branch_id, roster_size_bucket | Roster load time. |
| `attendance_session_generated_total` | Counter | branch_id, source | Generated attendance sessions. |
| `attendance_records_marked_total` | Counter | branch_id, status | Attendance records marked by status. |
| `attendance_sessions_submitted_total` | Counter | branch_id, actor_type | Submitted sessions. |
| `attendance_submission_duration_ms` | Histogram | branch_id, roster_size_bucket | Submit transaction duration. |
| `attendance_corrections_requested_total` | Counter | branch_id, requested_status | Correction requests created. |
| `attendance_corrections_approved_total` | Counter | branch_id | Approved corrections. |
| `attendance_corrections_rejected_total` | Counter | branch_id | Rejected corrections. |
| `attendance_low_alerts_generated_total` | Counter | branch_id, severity | Low attendance alerts generated. |
| `attendance_export_jobs_total` | Counter | report_code, file_type, status | Export job count. |
| `attendance_export_duration_ms` | Histogram | report_code, file_type | Export generation duration. |
| `attendance_audit_writes_total` | Counter | action, status | Audit write attempts and results. |
| `attendance_branch_access_denied_total` | Counter | route, permission | Branch isolation denial count. |
| `attendance_concurrency_conflicts_total` | Counter | operation | Version/lock conflicts. |

### 8.2 Business Metrics

| Metric Name | Type | Labels | Description |
|---|---|---|---|
| `attendance_average_percentage` | Gauge | branch_id, course_id, batch_id | Average attendance percentage. |
| `attendance_low_students_count` | Gauge | branch_id, threshold | Students below configured threshold. |
| `attendance_unmarked_sessions_count` | Gauge | branch_id, age_bucket | Sessions not marked after scheduled date/time. |
| `attendance_late_submissions_count` | Gauge | branch_id | Submitted after allowed marking window. |
| `attendance_correction_pending_count` | Gauge | branch_id | Pending corrections awaiting approval. |
| `attendance_trainer_submission_compliance` | Gauge | branch_id, trainer_id | Percentage of assigned sessions submitted on time. |

### 8.3 Metric Threshold Alerts

| Alert | Condition | Severity | Owner |
|---|---|---|---|
| Attendance Submit Error Spike | `submit_error_rate > 5% for 10 minutes` | Critical | Engineering On-call |
| Roster Load Slow | `p95 roster load > 2s for 15 minutes` | Warning | Engineering |
| Audit Write Failure | Any audit write failure for sensitive mutation | Critical | Engineering + Compliance |
| Branch Denial Spike | `branch_access_denied_total > 50 in 10 minutes` | Warning | Security/Admin |
| Export Failure Spike | `export_failure_rate > 10% for 30 minutes` | Warning | Engineering |
| Pending Corrections High | `pending_corrections > configured branch threshold for 2 days` | Warning | Academic Admin |
| Unmarked Sessions High | `unmarked_sessions > 20 for branch after business day close` | Warning | Branch Admin |
| DB Lock Wait High | `attendance transaction lock wait > 2s p95 for 10 minutes` | Critical | Database Operations |

---

## 9. Health Checks

### 9.1 Startup Health Checks

| Check | Pass Criteria | Failure Action |
|---|---|---|
| Database connectivity | Can open PostgreSQL connection and run lightweight query. | Fail startup. |
| Migration readiness | Latest required Attendance migration is applied. | Fail startup or mark unhealthy. |
| Attendance tables | Owned tables exist with required columns. | Fail startup. |
| Required indexes | Critical unique and lookup indexes exist. | Warn in non-prod; fail in production for critical indexes. |
| IAM permissions | Required Attendance permissions are seeded. | Mark degraded; hide actions if possible. |
| Audit integration | Audit write interface is reachable. | Fail mutation health; production startup may fail depending on policy. |
| Timezone configuration | `Asia/Muscat` or configured Oman timezone resolves. | Fail startup if invalid. |
| Export storage | Temporary export storage writable if exports enabled. | Mark export capability degraded. |

### 9.2 Readiness Endpoint

Readiness must verify the module can safely receive traffic.

```json
{
  "module": "attendance",
  "moduleCode": "M08-ATT",
  "status": "READY",
  "checks": {
    "database": "PASS",
    "migrations": "PASS",
    "permissions": "PASS",
    "audit": "PASS",
    "exportStorage": "PASS",
    "timezone": "PASS"
  },
  "checkedAt": "2026-07-04T08:30:00.000Z"
}
```

### 9.3 Liveness Endpoint

Liveness must be lightweight and must not depend on heavy reporting queries.

| Check | Description |
|---|---|
| Process alive | Application process is running. |
| Event loop responsive | Event loop delay within platform threshold. |
| Memory below limit | Process memory below configured limit. |

### 9.4 Functional Smoke Tests After Deployment

| Test | Expected Result |
|---|---|
| Login as Branch Admin and open attendance dashboard | Dashboard loads branch-scoped metrics. |
| Login as Trainer and load assigned session roster | Only assigned session is visible. |
| Save draft attendance for test session | Draft saves and audit log is created. |
| Submit attendance for test session | Status becomes submitted; summary is updated. |
| Request correction | Pending correction record is created. |
| Approve correction as Academic Admin | Record status changes; summary recalculates. |
| Attempt cross-branch session access | Request returns forbidden error. |
| Generate branch report preview | Paginated report returns expected branch data only. |
| Export report | File is generated, signed, audited, and downloadable by actor only. |

---

## 10. Backup and Recovery

### 10.1 Backup Scope

Backups must cover Attendance-owned tables and the audit records required to interpret changes:

| Data Group | Tables |
|---|---|
| Attendance primary data | `attendance_sessions`, `attendance_records` |
| Correction workflow | `attendance_corrections` |
| Alerting | `attendance_alert_rules`, `attendance_alerts` |
| Summaries | `enrollment_attendance_summaries` |
| Export metadata | `attendance_export_requests`, if implemented |
| Idempotency safety | `attendance_idempotency_keys`, if implemented |
| Audit dependencies | `audit_logs` records where `moduleCode = 'M08-ATT'` |
| Referenced context data for restore validation | `branches`, `batches`, `sessions`, `enrollments`, `student_profiles`, `trainer_profiles`, `users` |

### 10.2 Backup Frequency

| Backup Type | Frequency | Purpose |
|---|---|---|
| Continuous PITR | As configured by platform database operations; target RPO <= 15 minutes | Recover from accidental updates or corruption. |
| Daily full backup | Once per day outside peak marking windows | Disaster recovery. |
| Pre-deployment backup marker | Before schema or data migration | Rollback/recovery anchor. |
| Pre-backfill snapshot | Before summary recomputation/backfill | Recovery from bad script. |
| Export storage cleanup snapshot | Not required for temporary files | Export files are reproducible from database if records remain. |

### 10.3 Recovery Priorities

| Priority | Data | Reason |
|---|---|---|
| P1 | `attendance_records` and `attendance_sessions` | Primary evidence of attendance. |
| P2 | `attendance_corrections` and audit logs | Required to explain changes. |
| P3 | `enrollment_attendance_summaries` | Recomputable but critical for completion flow. |
| P4 | Alerts and export metadata | Operational support data. |
| P5 | Temporary export files | Reproducible and short-lived. |

### 10.4 Recovery Procedure for Attendance-Owned Tables

```text
1. Declare incident and freeze attendance mutations if primary data integrity is at risk.
2. Record incident start time, suspected affected branch, sessions, and deployment version.
3. Identify affected tables and time window using audit logs and structured logs.
4. Choose recovery method:
   a. Recompute derived summaries if only summaries are affected.
   b. Restore selected rows from PITR recovery database if primary records are affected.
   c. Full database restore only for catastrophic platform-wide corruption.
5. Restore into a separate recovery database first.
6. Compare affected attendance rows by ID, version, status, updatedAt, and audit trail.
7. Prepare a controlled repair script using explicit IDs and expected previous versions.
8. Run repair in production inside transaction with maintenance audit log.
9. Recompute enrollment attendance summaries for affected enrollments.
10. Validate branch dashboards, session roster, correction history, and completion evidence.
11. Document the incident, root cause, restored rows, actor, timestamp, and approval.
```

### 10.5 Summary Recalculation Procedure

Enrollment attendance summaries are derived from attendance records and may be recomputed.

```text
For each affected enrollmentId:
1. Load all non-deleted attendance records linked to the enrollment.
2. Count total scheduled attendance records where status is not NOT_MARKED or excluded by rule.
3. Count attended records using configured status weights:
   PRESENT = 1.0
   LATE = configured weight, default 1.0 unless ASTI config says otherwise
   EXCUSED = configured inclusion rule, default excluded from denominator if approved
   ABSENT = 0.0
4. Calculate attendance percentage:
   attendancePercentage = (weightedAttendedCount / denominatorCount) * 100
5. Round to two decimal places for persistence.
6. Update enrollment_attendance_summaries with computed totals, percentage, lastCalculatedAt, and version increment.
7. Emit maintenance log and audit reference.
```

---

## 11. Data Maintenance Jobs

### 11.1 Scheduled Jobs

| Job | Frequency | Purpose | Owner |
|---|---|---|---|
| `attendance.detectUnmarkedSessions` | Hourly during business hours | Detect sessions that should have attendance marked. | Attendance Application |
| `attendance.generateLowAttendanceAlerts` | Daily after business day close | Generate low attendance alerts based on configured rules. | Attendance Application |
| `attendance.recalculateSummaries` | On demand and nightly safety run | Recompute summaries for changed records. | Attendance Application |
| `attendance.expireExportFiles` | Hourly | Delete expired temporary export files and mark metadata expired. | Operations |
| `attendance.cleanupIdempotencyKeys` | Daily | Remove expired idempotency records. | Operations |
| `attendance.pendingCorrectionReminder` | Daily | Notify approvers for pending correction backlog. | Attendance + Communication |

### 11.2 Job Safety Rules

| Rule ID | Rule |
|---|---|
| JOB-M08-001 | Jobs must be idempotent and safe to retry. |
| JOB-M08-002 | Jobs must be branch-aware and never process deleted branches unless explicitly configured. |
| JOB-M08-003 | Jobs must log start, completion, counts, duration, and failure reason. |
| JOB-M08-004 | Jobs must not hard-delete attendance records. |
| JOB-M08-005 | Jobs must not generate duplicate pending alerts for the same enrollment/rule/evaluation date. |
| JOB-M08-006 | Long-running jobs must use paging/batching to avoid database lock pressure. |

---

## 12. Operational Dashboards

### 12.1 Engineering Dashboard Widgets

| Widget | Metric | Threshold |
|---|---|---|
| API Error Rate | `attendance_api_requests_total{status=5xx}` / total | Critical above 2% for 10 minutes. |
| Submit Latency p95 | `attendance_submission_duration_ms` | Warning above 2.5s; critical above 5s. |
| Roster Load Latency p95 | `attendance_roster_load_duration_ms` | Warning above 1.5s; critical above 3s. |
| Audit Failure Count | `attendance_audit_writes_total{status="failed"}` | Critical if > 0. |
| DB Lock Wait | database lock metrics filtered by attendance tables | Critical if sustained > 2s p95. |
| Export Failures | `attendance_export_jobs_total{status="failed"}` | Warning above 10% failure. |
| Branch Access Denials | `attendance_branch_access_denied_total` | Investigate spikes. |

### 12.2 Operations Dashboard Widgets

| Widget | Description |
|---|---|
| Unmarked Sessions by Branch | Count of sessions not marked after allowed window. |
| Pending Corrections by Branch | Count and aging of correction requests. |
| Low Attendance Students | Count below threshold by branch/course/batch. |
| Trainer Submission Compliance | On-time submission rate by trainer. |
| Export Job Queue | Pending/running/failed export jobs. |
| Daily Attendance Volume | Records marked per day by branch. |

---

## 13. Runbook: Attendance Session Not Generated

### Symptoms

- Trainer cannot see attendance roster for a scheduled session.
- Admin sees scheduled session but no attendance session exists.
- API returns `ERR_ATT_SESSION_NOT_FOUND` or `ERR_ATT_ROSTER_NOT_GENERATED`.

### Impact

Attendance cannot be marked for the session until roster generation succeeds.

### Checks

```text
1. Confirm user is authenticated and has required permission.
2. Confirm session exists in Training Delivery/Scheduling context.
3. Confirm session belongs to the selected branch.
4. Confirm batch exists and is active.
5. Confirm active enrollments exist for the batch.
6. Confirm no existing non-deleted AttendanceSession already exists for the same sessionId.
7. Check logs for ATTENDANCE_SESSION_GENERATE_FAILED using correlation ID.
8. Check database constraints for unique conflicts.
```

### Resolution

```text
1. If branch scope is wrong, ask user to switch to correct assigned branch.
2. If user lacks permission, assign appropriate permission through IAM process.
3. If scheduled session is missing, escalate to Training Delivery/Scheduling owner.
4. If batch has no active enrollments, verify Enrollment module data.
5. If stale deleted attendance session exists, verify soft delete state and restore or generate new according to policy.
6. If unique conflict occurs due to retry, load existing attendance session and return it to UI.
7. If generation partially failed, run repair script to remove only incomplete soft-deletable draft rows after approval, then regenerate.
8. Validate roster count and audit log after recovery.
```

### Escalation

Escalate to Principal Engineer if primary attendance rows were partially created without audit records.

---

## 14. Runbook: Trainer Cannot Mark Attendance

### Symptoms

- Marking controls are hidden or disabled.
- API returns `403 ERR_ATT_PERMISSION_DENIED`.
- API returns `403 ERR_ATT_TRAINER_NOT_ASSIGNED`.
- Trainer can see the session but cannot submit.

### Checks

```text
1. Confirm trainer user has active User account.
2. Confirm user is linked to Person.
3. Confirm Person is linked to active TrainerProfile.
4. Confirm TrainerProfile is assigned to the session or batch through BatchTrainer/Session trainer reference.
5. Confirm attendance.record.mark permission exists for trainer role.
6. Confirm selected branch is assigned to trainer user.
7. Confirm attendance session status is editable: DRAFT, GENERATED, REOPENED.
8. Confirm session is not cancelled, completed, locked, or submitted.
```

### Resolution

```text
1. Fix missing trainer profile mapping through Faculty/Trainer Management.
2. Fix missing batch/session trainer assignment through Training Delivery.
3. Grant missing permission through IAM if role configuration is incorrect.
4. Ask user to switch to correct branch if branch context mismatch exists.
5. If session is already submitted, use correction workflow instead of direct marking.
6. If admin override is needed, Branch Admin with attendance.admin.mark may mark according to policy and audit reason.
```

---

## 15. Runbook: Attendance Submission Fails

### Symptoms

- Submit button returns validation error.
- API returns `ERR_ATT_INCOMPLETE_ROSTER`, `ERR_ATT_CONCURRENT_MODIFICATION`, or `ERR_ATT_SESSION_ALREADY_SUBMITTED`.
- Some records appear unsaved.

### Checks

```text
1. Capture correlation ID from UI error.
2. Search logs for ATTENDANCE_SESSION_SUBMIT_FAILED.
3. Verify attendance session status and version.
4. Verify all active attendance records have valid statuses.
5. Verify roster count equals active enrollment snapshot count where required.
6. Check whether another user submitted the same session.
7. Check database transaction errors or lock timeouts.
8. Verify audit write did not fail.
```

### Resolution

```text
1. If incomplete roster, ask trainer/admin to mark all required students or use allowed bulk status.
2. If stale version, reload roster and compare latest statuses.
3. If already submitted, show submitted state and prevent duplicate submit.
4. If database lock timeout, retry after short interval; do not manually update records.
5. If audit write failed, keep mutation rolled back and escalate to engineering.
6. If records saved but summary missing, run summary recalculation for affected attendance session/enrollments.
7. Validate final session status, record counts, summary percentages, and audit logs.
```

---

## 16. Runbook: Attendance Correction Approval Fails

### Symptoms

- Approver cannot approve pending correction.
- API returns `ERR_ATT_CORRECTION_NOT_PENDING`, `ERR_ATT_APPROVER_SAME_AS_REQUESTER`, or `ERR_ATT_INVALID_STATE_TRANSITION`.
- Attendance record status remains unchanged.

### Checks

```text
1. Confirm correction exists and is not deleted.
2. Confirm correction status is PENDING.
3. Confirm approver has attendance.correction.approve permission.
4. Confirm approver is not the requester unless override permission exists.
5. Confirm linked attendance record exists and belongs to approver's branch scope.
6. Confirm attendance session allows correction changes.
7. Check for concurrent approval/rejection by another user.
8. Check audit log write status.
```

### Resolution

```text
1. If already approved/rejected, refresh UI and show final state.
2. If approver is same as requester, route to another authorized approver or use documented override permission.
3. If branch access fails, route correction to correct branch administrator.
4. If linked record is missing or soft-deleted, escalate to engineering for data integrity review.
5. If summary failed to update after approval, recompute summary for affected enrollment.
6. Verify correction status, attendance record status, summary percentage, and audit log.
```

---

## 17. Runbook: Attendance Percentage Incorrect

### Symptoms

- Student, trainer, or admin reports wrong attendance percentage.
- Completion eligibility appears incorrect.
- Dashboard differs from session report.

### Checks

```text
1. Identify enrollmentId, courseId, batchId, branchId, and affected date range.
2. Load all non-deleted AttendanceRecords for enrollment.
3. Confirm included statuses and configured weights.
4. Confirm EXCUSED status denominator rule.
5. Confirm session cancellations or excluded sessions are handled correctly.
6. Compare EnrollmentAttendanceSummary with raw record calculation.
7. Check recent correction approvals for the enrollment.
8. Check if summary recalculation job failed.
```

### Resolution

```text
1. If raw records are correct and summary is stale, run summary recalculation for the enrollment.
2. If raw records are wrong, require correction workflow; do not directly edit submitted records.
3. If rule configuration is wrong, update alert/summary rule with effective date and audit.
4. If cancelled sessions are included incorrectly, patch calculation logic and backfill affected summaries.
5. Validate against manual calculation and document correction.
```

### Manual Calculation Formula

```text
attendancePercentage = (weightedAttendedSessionCount / eligibleSessionCount) * 100

Default weights:
PRESENT = 1.0
LATE = 1.0 unless configured otherwise
ABSENT = 0.0
EXCUSED = excluded from denominator when approved; otherwise 0.0 or configured policy
NOT_MARKED = excluded until session is submitted; after submission must not remain NOT_MARKED
```

---

## 18. Runbook: Cross-Branch Data Visible

### Symptoms

- User sees attendance sessions from a branch they should not access.
- Report export includes unexpected branch rows.
- Student or trainer reports seeing another branch’s data.

### Severity

Critical security incident.

### Immediate Action

```text
1. Disable affected report/action route through feature flag if leakage is confirmed.
2. Preserve logs, correlation IDs, and export metadata.
3. Identify affected user, branch scope, route, and time window.
4. Notify security/compliance owner according to incident process.
```

### Checks

```text
1. Verify user's UserBranchAccess records.
2. Verify role permissions, especially attendance.report.consolidated.
3. Inspect query path for missing branch predicate.
4. Inspect report view for branch_id column and filtering behavior.
5. Check whether client-provided branchId bypassed server intersection.
6. Identify exports generated during the affected time window.
```

### Resolution

```text
1. Patch branch scope resolver or query predicate.
2. Add regression test for the exact route and role.
3. Invalidate affected export links.
4. Audit all access logs for impacted route/time window.
5. Re-enable route only after QA validates cross-branch denial.
6. Document root cause and update Part 9 authorization test scenarios if missing.
```

---

## 19. Runbook: Audit Log Write Failure

### Symptoms

- Mutations fail with `ERR_ATT_AUDIT_WRITE_FAILED`.
- Logs show `ATTENDANCE_AUDIT_WRITE_FAILED`.
- Audit dashboard shows missing or delayed entries.

### Impact

Sensitive attendance mutations must not complete without audit. This is a critical compliance issue.

### Checks

```text
1. Check database connectivity and audit table availability.
2. Check audit service/package error logs.
3. Verify transaction rollback behavior for failed mutation.
4. Confirm whether any mutation completed without audit.
5. Search by correlation ID and entity ID.
```

### Resolution

```text
1. If audit table is unavailable, disable sensitive attendance mutations until audit recovers.
2. Keep read-only attendance views available if safe.
3. Fix audit persistence issue.
4. Re-run failed user operation after audit is healthy.
5. If mutation completed without audit due to bug, create incident record and reconstruct audit entry from application logs only with compliance approval.
6. Add regression test to ensure audit failure rolls back mutation.
```

---

## 20. Runbook: Report or Dashboard Is Slow

### Symptoms

- Attendance dashboard takes more than target latency.
- Report preview times out.
- Database CPU or IO increases during reporting.

### Checks

```text
1. Identify report code, branch scope, filters, and date range.
2. Check application metrics for latency and row count.
3. Review query plan in staging or safe diagnostic environment.
4. Confirm indexes on branch_id, session_date, batch_id, course_id, trainer_id, enrollment_id.
5. Check whether report bypasses read model/view and queries raw tables inefficiently.
6. Check pagination and page size bounds.
7. Check consolidated report scope size.
```

### Resolution

```text
1. Reduce date range or require async export for large result sets.
2. Add or repair index if missing.
3. Refresh materialized/read model if stale.
4. Optimize query to use attendance reporting view.
5. Add branch/date predicates before joins.
6. Cache dashboard summaries where acceptable.
7. Deploy optimized query and monitor p95 latency.
```

---

## 21. Runbook: Export Job Fails

### Symptoms

- Export remains pending or failed.
- User cannot download generated file.
- API returns `ERR_ATT_EXPORT_FAILED` or `ERR_ATT_EXPORT_EXPIRED`.

### Checks

```text
1. Identify exportId and correlation ID.
2. Confirm user had export permission at request time.
3. Verify branch scope saved in export metadata.
4. Check export job logs and error code.
5. Check temporary storage availability and write permission.
6. Check row count and file size limits.
7. Confirm signed URL generation is working.
8. Confirm file has not expired.
```

### Resolution

```text
1. If export expired, ask user to regenerate.
2. If storage failed, restore storage permission/config and retry export job.
3. If row count exceeds limit, require narrower filters or asynchronous export.
4. If branch scope is invalid, reject and require new export request.
5. If file generated but URL invalid, regenerate signed URL if retention window is still valid.
6. Audit export retry and final delivery.
```

---

## 22. Runbook: Bulk Import Sync Issues

> Bulk import is optional and must remain disabled unless explicitly enabled. This runbook applies when `attendance.bulkImport.enabled = true`.

### Symptoms

- Imported attendance file creates validation failures.
- Some records are imported and others fail.
- Duplicate records are reported.
- Import status remains processing.

### Checks

```text
1. Confirm bulk import feature flag is enabled.
2. Confirm importing user has attendance.bulkImport permission.
3. Confirm file format matches approved template.
4. Validate branch, course, batch, session, enrollment, and student references.
5. Confirm import idempotency key and batch ID.
6. Review row-level validation errors.
7. Check if transaction mode is all-or-nothing or partial with error report.
8. Confirm imported records are not for submitted sessions unless correction mode is explicitly used.
```

### Resolution

```text
1. Reject file if template or branch scope is invalid.
2. Provide row-level error report without changing data if all-or-nothing mode is enabled.
3. If partial mode is enabled, import valid rows and report failed rows with reasons.
4. For duplicates, return existing row mapping and do not create duplicate records.
5. For submitted sessions, require correction workflow instead of import overwrite.
6. If job stuck, mark import failed after verifying no open transaction remains.
7. Re-run import with same idempotency key only if payload is identical.
8. Audit import outcome with row counts and actor.
```

---

## 23. Runbook: Low Attendance Alerts Not Generated

### Symptoms

- Students below threshold are not shown in low attendance dashboard.
- Expected email/SMS/WhatsApp notifications are not triggered.
- Alert job completed with zero alerts unexpectedly.

### Checks

```text
1. Confirm AttendanceAlertRule exists, is active, and effective for branch/course/date.
2. Confirm enrollment summaries are up to date.
3. Confirm threshold and comparison operator.
4. Confirm alert job ran successfully.
5. Check duplicate suppression rules for same enrollment/rule/date.
6. Check Communication module notification request logs if alerts exist but messages not sent.
7. Confirm student enrollment is active and not completed/cancelled.
```

### Resolution

```text
1. Activate or correct alert rule with effective date and audit.
2. Recompute affected attendance summaries.
3. Re-run alert generation job for affected branch/date range.
4. If notification request failed, escalate to Communication module owner.
5. Verify alert appears in dashboard and notification request includes exact template variables.
```

---

## 24. Runbook: Transaction Failure Recovery

### Symptoms

- User reports operation failed midway.
- Logs show database timeout, deadlock, or transaction rollback.
- UI state differs from database state.

### Checks

```text
1. Capture operation type: generate, save draft, submit, correction, approval, export metadata.
2. Use correlation ID to find all logs and traces.
3. Confirm whether transaction committed or rolled back.
4. Check attendance session version and status.
5. Check record count and latest updatedAt values.
6. Check audit log exists for committed sensitive mutations.
7. Check idempotency table for operation key.
```

### Resolution

```text
1. If transaction rolled back, allow user to retry using same idempotency key where supported.
2. If transaction committed but response failed, return existing committed result on retry.
3. If partial write is detected, stop mutations for affected session and escalate.
4. Repair only with approved script based on expected IDs and versions.
5. Recompute summaries after repair.
6. Confirm audit logs and final state.
```

---

## 25. Database Index and Query Operations

### 25.1 Critical Indexes

| Table | Index | Purpose |
|---|---|---|
| `attendance_sessions` | `(branch_id, attendance_date, status)` | Dashboard/session list. |
| `attendance_sessions` | `(session_id) WHERE is_deleted = false` unique | Prevent duplicate active attendance session. |
| `attendance_records` | `(attendance_session_id, enrollment_id) WHERE is_deleted = false` unique | Prevent duplicate records. |
| `attendance_records` | `(student_profile_id, marked_at)` | Student attendance view. |
| `attendance_records` | `(enrollment_id, status)` | Summary calculation. |
| `attendance_corrections` | `(branch_id, status, requested_at)` | Pending correction queue. |
| `attendance_alerts` | `(branch_id, severity, status, generated_at)` | Alert dashboard. |
| `enrollment_attendance_summaries` | `(branch_id, attendance_percentage)` | Low attendance report. |
| `enrollment_attendance_summaries` | `(enrollment_id) WHERE is_deleted = false` unique | One active summary per enrollment. |

### 25.2 Query Safety Rules

| Rule | Description |
|---|---|
| Always filter by branch first | Branch/date predicates must be applied before broad joins. |
| Always paginate lists | UI tables must use page size limits. |
| Avoid unbounded exports | Large exports must use asynchronous job. |
| Avoid PII in indexes unless required | Prefer internal IDs for performance indexes. |
| Monitor query plans | Report queries must be reviewed when data volume grows. |

---

## 26. Support Playbooks for Business Users

### 26.1 Trainer Support Checklist

When a trainer reports an issue:

```text
1. Ask for branch, course, batch, session date, and screenshot with correlation ID if visible.
2. Confirm the trainer is assigned to the batch/session.
3. Confirm the session is not already submitted.
4. Confirm the trainer selected correct branch.
5. Confirm the roster has active enrollments.
6. Escalate with correlation ID if API error persists.
```

### 26.2 Branch Admin Support Checklist

When branch admin reports attendance discrepancy:

```text
1. Identify affected student/enrollment/session.
2. Compare attendance record with correction history.
3. Verify summary calculation.
4. If record is wrong and session is submitted, use correction request/approval flow.
5. If branch-level report is wrong, verify report filters and branch scope.
6. Escalate if raw records and summary are inconsistent after recalculation.
```

### 26.3 Student Support Checklist

When student reports incorrect attendance:

```text
1. Verify authenticated student identity.
2. Identify course, batch, session date.
3. Check attendance record status and remarks.
4. Check whether correction is pending.
5. Route to trainer/academic admin for correction request if needed.
6. Do not directly modify student attendance without correction workflow.
```

---

## 27. Incident Severity Matrix

| Severity | Condition | Response |
|---|---|---|
| SEV-1 | Cross-branch data leak, audit failure allowing mutation, primary attendance data corruption | Immediate incident response, disable affected mutation/report, engineering + compliance escalation. |
| SEV-2 | Attendance submission unavailable for many trainers, database lock contention, correction approvals failing globally | Engineering on-call response; workaround through admin marking or delayed submission if safe. |
| SEV-3 | Single branch report slow, export failures, low attendance alerts delayed | Triage during business hours; marking workflows remain available. |
| SEV-4 | Minor UI issue, isolated validation message problem, non-critical dashboard mismatch | Backlog or next maintenance release. |

---

## 28. Post-Incident Review Template

Each significant Attendance incident must be documented using this format:

```text
Incident ID:
Module: M08-ATT Attendance Management
Date/Time Started:
Date/Time Resolved:
Detected By:
Affected Branches:
Affected Users:
Affected Entities:
Severity:
Customer Impact:
Root Cause:
Trigger:
Timeline:
What Worked:
What Failed:
Data Repair Required: Yes/No
Audit Impact: Yes/No
Security/Privacy Impact: Yes/No
Corrective Actions:
Preventive Actions:
Owner:
Due Date:
Approval:
```

---

## 29. Operational Acceptance Criteria

The Attendance module can be promoted to production only when all of the following are satisfied:

1. Migrations are backward-compatible and successfully tested in staging.
2. Required Attendance permissions are seeded and mapped to roles.
3. Branch isolation smoke tests pass for Admin, Trainer, and Student views.
4. Trainer can generate/load roster, save draft, and submit attendance in UAT.
5. Correction request, approval, and rejection flows are validated.
6. Audit logs are created for every sensitive mutation.
7. Dashboard and report queries meet p95 latency targets with production-like data.
8. Export files are temporary, signed, actor-bound, and audited.
9. Health checks report ready status after deployment.
10. Metrics, logs, traces, and alerts are visible in the operations dashboard.
11. Backup and recovery procedures are validated or reviewed by database operations.
12. Runbooks are available to support and engineering teams.
13. Feature flags have safe defaults.
14. Rollback plan is documented for the release.
15. No known SEV-1 or SEV-2 defects remain open.

---

## 30. Final Operations Checklist

| Checklist Item | Required Status |
|---|---|
| Database migration applied | Complete |
| Attendance tables verified | Complete |
| Critical indexes verified | Complete |
| Permissions seeded | Complete |
| Branch scope resolver tested | Complete |
| Audit integration tested | Complete |
| Structured logs verified | Complete |
| Metrics visible | Complete |
| Traces visible | Complete |
| Health checks passing | Complete |
| Export storage verified | Complete |
| Backup marker created | Complete |
| Smoke tests passed | Complete |
| UAT sign-off captured | Complete |
| Rollback plan approved | Complete |
