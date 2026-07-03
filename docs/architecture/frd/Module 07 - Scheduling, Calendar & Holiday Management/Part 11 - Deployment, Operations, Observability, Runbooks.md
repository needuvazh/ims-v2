# Part 11 - Deployment, Operations, Observability, Runbooks

## Module 07 – Scheduling, Calendar & Holiday Management

**System:** Al Saud Training Institute Integrated Institute Management System  
**Module Code:** SCH  
**Bounded Context:** Scheduling, Calendar & Holiday Management  
**Architecture Style:** Next.js modular monolith, PostgreSQL, Prisma, server actions/API routes  
**Timezone Default:** Oman GST, UTC+04:00  
**Document Purpose:** This document defines deployment readiness, operational controls, observability standards, backup and recovery practices, health checks, support procedures, and troubleshooting runbooks for the Scheduling, Calendar & Holiday Management module.

---

## 1. Operational Scope

This module owns operational scheduling data and controls timetable visibility for admins, trainers, and students. Operations must guarantee that schedule mutations remain consistent, branch-scoped, auditable, recoverable, and observable.

### 1.1 Owned Runtime Capabilities

| Capability | Operational Importance |
|---|---|
| Schedule session creation and rescheduling | Core academic delivery continuity. |
| Conflict validation | Prevents trainer, classroom, batch, holiday, and venue allocation errors. |
| Calendar and holiday management | Controls valid training days and branch operating calendars. |
| Venue blocking | Prevents scheduling during maintenance, events, or room unavailability. |
| Trainer availability management | Supports conflict-free trainer allocation. |
| Schedule publishing | Controls what students and trainers can see. |
| Bulk import | Enables high-volume timetable setup with validation. |
| Operational reports and dashboards | Supports branch operations and management oversight. |
| Audit trail | Supports accountability and compliance. |

---

## 2. Deployment Architecture

### 2.1 Monorepo Placement

```text
asti-ims
├── apps
│   └── admin-portal
│       ├── app/(admin)/scheduling
│       ├── app/(trainer)/trainer-schedule
│       └── app/(student)/my-timetable
├── packages
│   ├── scheduling-calendar
│   │   ├── application
│   │   ├── domain
│   │   ├── infrastructure
│   │   ├── validators
│   │   ├── reports
│   │   └── tests
│   ├── training-delivery
│   ├── organization
│   ├── trainer-management
│   ├── attendance
│   ├── audit-compliance
│   └── shared
└── packages/database/prisma
```

### 2.2 Deployable Units

| Unit | Description |
|---|---|
| Admin portal scheduling routes | Calendar, session planner, holiday calendar, venue block, trainer availability, reports. |
| Trainer portal schedule routes | Trainer read-only and limited acknowledgement views. |
| Student portal timetable routes | Student read-only timetable views for active enrollments. |
| Prisma migration | Tables, indexes, constraints, reporting views. |
| Seed data | Permission codes, menu entries, report definitions, notification templates. |
| Scheduled jobs | Optional internal jobs for reminder generation, read model refresh, stale import cleanup. |

No separate microservice deployment is required.

---

## 3. Environment Configuration

| Variable | Required | Example | Purpose |
|---|---:|---|---|
| `APP_TIMEZONE` | Yes | `Asia/Muscat` | Default Oman timezone for date/time rendering and calculations. |
| `DATABASE_URL` | Yes | Managed secret | PostgreSQL connection string. |
| `SCH_MAX_IMPORT_ROWS` | Yes | `1000` | Maximum accepted rows per schedule import. |
| `SCH_EXPORT_MAX_SYNC_ROWS` | Yes | `10000` | Maximum rows before export must use async file generation. |
| `SCH_CONFLICT_LOOKAHEAD_MONTHS` | Yes | `12` | Maximum admin calendar query range. |
| `SCH_STUDENT_LOOKAHEAD_MONTHS` | Yes | `3` | Maximum student timetable query range. |
| `SCH_AUDIT_RETENTION_YEARS` | Yes | `7` | Minimum retention target for scheduling audit records. |
| `SCH_ENABLE_BULK_IMPORT` | Yes | `true` | Feature flag for bulk import. |
| `SCH_ENABLE_CONFLICT_OVERRIDE` | Yes | `true` | Feature flag for soft conflict override flow. |
| `SCH_NOTIFICATION_ENABLED` | Yes | `true` | Controls schedule notification request creation. |
| `LOG_LEVEL` | Yes | `info` | Structured logging verbosity. |
| `OTEL_SERVICE_NAME` | Recommended | `asti-ims-admin-portal` | OpenTelemetry service name. |

---

## 4. Database Deployment Requirements

### 4.1 Owned Tables

| Table | Backup Required | PITR Required | Notes |
|---|---:|---:|---|
| `business_calendars` | Yes | Yes | Branch calendar definitions. |
| `holidays` | Yes | Yes | Holiday dates and localized labels. |
| `schedule_sessions` | Yes | Yes | Core timetable records. |
| `venue_blocks` | Yes | Yes | Classroom/branch blocking records. |
| `trainer_availabilities` | Yes | Yes | Trainer availability effective-dated records. |
| `schedule_conflict_checks` | Recommended | No | Optional persisted validation trace. |
| `scheduling_import_batches` | Yes | Yes | Bulk import metadata and validation result. |
| `scheduling_import_rows` | Yes | Yes | Row-level import validation results. |
| `schedule_publication_logs` | Yes | Yes | Publish/unpublish trace. |
| `audit_logs` scheduling rows | Yes | Yes | Owned by Audit context but critical dependency. |

### 4.2 Migration Safety Rules

1. Add new nullable columns before enforcing non-null constraints.
2. Backfill derived fields in deterministic scripts.
3. Add indexes concurrently where supported by the deployment strategy.
4. Do not drop old columns in the same release that introduces replacement columns.
5. Verify branchId is populated for all branch-owned schedule records before enabling branch-scope enforcement.
6. Preserve soft-deleted rows during migration.
7. Validate timezone assumptions before date/time migration.
8. Run conflict-detection smoke queries after migration.

### 4.3 Required Indexes

| Table | Index | Purpose |
|---|---|---|
| `schedule_sessions` | `(branch_id, scheduled_date, start_time, end_time)` | Calendar date range lookups. |
| `schedule_sessions` | `(trainer_id, scheduled_date, start_time, end_time, status)` | Trainer conflict detection. |
| `schedule_sessions` | `(classroom_id, scheduled_date, start_time, end_time, status)` | Classroom conflict detection. |
| `schedule_sessions` | `(batch_id, scheduled_date, start_time, end_time, status)` | Batch overlap detection. |
| `schedule_sessions` | `(branch_id, status, is_deleted)` | Admin list and dashboard filters. |
| `holidays` | `(calendar_id, holiday_date, is_deleted)` | Holiday conflict validation. |
| `venue_blocks` | `(branch_id, classroom_id, block_date, start_time, end_time, status)` | Venue block conflict validation. |
| `trainer_availabilities` | `(trainer_id, branch_id, day_of_week, effective_start_date, effective_end_date)` | Availability lookup. |
| `scheduling_import_batches` | `(branch_id, import_type, status, created_at)` | Import monitoring. |
| `audit_logs` | `(module_code, entity_type, entity_id, performed_at)` | Audit lookup. |

---

## 5. Observability Setup

### 5.1 Logging Principles

All module logs must be structured JSON. Logs must never include password hashes, authentication tokens, Civil ID numbers, passport numbers, raw document URLs, or complete student PII.

### 5.2 Structured Log Format

```json
{
  "timestamp": "2026-07-03T10:30:45.123+04:00",
  "level": "info",
  "service": "asti-ims-admin-portal",
  "module": "SCH",
  "operation": "scheduleSession.reschedule",
  "correlationId": "req_01JZ_SCH_000001",
  "requestId": "req_01JZ_SCH_000001",
  "userId": "clxuser001",
  "branchId": "clxbranch001",
  "entityType": "ScheduleSession",
  "entityId": "clxschsession001",
  "status": "success",
  "durationMs": 412,
  "permission": "scheduling.session.reschedule",
  "metadata": {
    "oldDate": "2026-08-10",
    "newDate": "2026-08-11",
    "conflictCheckCount": 5,
    "notificationsRequested": 18
  }
}
```

### 5.3 Required Log Events

| Event | Level | Required Fields |
|---|---|---|
| Schedule session created | info | correlationId, userId, branchId, sessionId, batchId, trainerId, classroomId, durationMs |
| Conflict detected | warn | correlationId, conflictType, branchId, entityId, requestedDate, requestedStartTime, requestedEndTime |
| Conflict override used | warn | correlationId, userId, branchId, conflictType, overrideReason |
| Permission denied | warn | correlationId, userId, permission, branchId, route |
| Branch scope denied | warn | correlationId, userId, requestedBranchId, assignedBranchIds hash/summary |
| Bulk import validation failed | warn | correlationId, importBatchId, branchId, failedRowCount, errorCodes |
| Bulk import committed | info | correlationId, importBatchId, acceptedRows, rejectedRows, durationMs |
| Export generated | info | correlationId, userId, branchScope, format, rowCount, durationMs |
| Database error | error | correlationId, operation, sanitized error code, durationMs |
| Unexpected exception | error | correlationId, operation, sanitized stack reference, durationMs |

---

## 6. Distributed Tracing Boundaries

Even within a modular monolith, tracing must identify module boundaries and downstream dependencies.

### 6.1 Trace Spans

| Span Name | Trigger | Attributes |
|---|---|---|
| `SCH.api.calendar.list` | Calendar list endpoint/server action | branchId, dateFrom, dateTo, userId, permission |
| `SCH.command.session.create` | Create session command | branchId, batchId, trainerId, classroomId |
| `SCH.command.session.reschedule` | Reschedule command | branchId, sessionId, oldVersion, newVersion |
| `SCH.validation.conflictCheck` | Conflict validation | branchId, trainerId, classroomId, batchId, conflictCount |
| `SCH.query.trainerAvailability` | Availability lookup | trainerId, branchId, dayOfWeek |
| `SCH.query.holidayConflict` | Holiday lookup | calendarId, date |
| `SCH.audit.write` | Audit log write | entityType, entityId, action |
| `SCH.notification.request` | Notification request creation | eventType, recipientCount |
| `SCH.import.validate` | Import validation | importBatchId, rowCount |
| `SCH.report.query` | Report query | reportCode, branchScope, rowCount |

### 6.2 Cross-Module Trace Boundaries

| Dependency | Trace Boundary |
|---|---|
| Organization Management | Branch, classroom, calendar ownership checks. |
| Training Delivery | Batch and session dependency validation. |
| Trainer Management | Trainer status and availability lookup. |
| Attendance | Prevent deletion or unsafe change of attendance-linked sessions. |
| Communication | Notification request creation after publish/reschedule/cancel. |
| Audit & Compliance | Audit log persistence for sensitive actions. |
| Reporting & Dashboards | Read model/view refresh and dashboard query. |

---

## 7. Metrics Instrumentation

### 7.1 Application Metrics

| Metric Name | Type | Labels | Purpose |
|---|---|---|---|
| `sch_api_request_total` | Counter | route, method, status, branchScope | API volume. |
| `sch_api_request_duration_ms` | Histogram | route, method, status | Latency monitoring. |
| `sch_conflict_check_total` | Counter | conflictType, result, branchId | Conflict trend monitoring. |
| `sch_conflict_check_duration_ms` | Histogram | conflictType | Conflict validation performance. |
| `sch_session_mutation_total` | Counter | action, status, branchId | Create/update/reschedule/cancel volume. |
| `sch_session_publish_total` | Counter | status, branchId | Publication operation success/failure. |
| `sch_bulk_import_total` | Counter | importType, status, branchId | Import success/failure. |
| `sch_bulk_import_row_total` | Counter | importType, result, errorCode | Row-level import quality. |
| `sch_export_total` | Counter | reportCode, format, status, branchScope | Export usage and failure tracking. |
| `sch_notification_request_total` | Counter | eventType, channel, status | Notification request generation. |
| `sch_branch_scope_denied_total` | Counter | route, permission | Branch isolation failure monitoring. |
| `sch_permission_denied_total` | Counter | route, permission | Authorization monitoring. |

### 7.2 Business Metrics

| Metric Name | Definition |
|---|---|
| `scheduled_sessions_count` | Number of active sessions scheduled in selected period. |
| `published_sessions_count` | Number of sessions visible to student/trainer portals. |
| `cancelled_sessions_count` | Number of cancelled sessions in selected period. |
| `rescheduled_sessions_count` | Number of rescheduled sessions in selected period. |
| `trainer_utilization_percentage` | Scheduled trainer hours divided by available trainer hours. |
| `classroom_utilization_percentage` | Scheduled classroom hours divided by available classroom hours. |
| `conflict_rate_percentage` | Conflict validation failures divided by scheduling attempts. |
| `holiday_conflict_count` | Schedule attempts blocked by holiday rules. |
| `venue_block_conflict_count` | Schedule attempts blocked by venue block rules. |
| `import_rejection_rate_percentage` | Rejected import rows divided by total import rows. |

---

## 8. Alerts and Thresholds

| Alert | Severity | Threshold | Action |
|---|---|---:|---|
| Calendar API high latency | Warning | P95 > 2 seconds for 10 minutes | Check DB indexes and query plans. |
| Conflict check high latency | Warning | P95 > 1 second for 10 minutes | Inspect conflict queries and table bloat. |
| Schedule mutation failure spike | Critical | Failure rate > 10% for 5 minutes | Check database, permissions, recent deployment. |
| Branch scope denied spike | Warning | > 50 denials in 10 minutes | Investigate misconfigured roles or suspicious access. |
| Import failure spike | Warning | Rejection rate > 30% for 3 imports | Review import template or master data mismatch. |
| Export failures | Warning | > 5 failed exports in 30 minutes | Check file generation/storage. |
| Audit write failure | Critical | Any confirmed failure | Stop sensitive mutation if audit cannot be written. |
| Database deadlocks | Critical | > 3 in 10 minutes | Investigate concurrent update patterns. |
| Published sessions missing notifications | Warning | Notification request failure > 5% | Check communication integration. |

---

## 9. Health Checks

### 9.1 Module Health Endpoint

Recommended internal endpoint:

```text
GET /api/admin/scheduling/health
```

### 9.2 Health Check Response

```json
{
  "status": "healthy",
  "module": "SCH",
  "timestamp": "2026-07-03T10:30:00+04:00",
  "checks": {
    "database": {
      "status": "healthy",
      "latencyMs": 18
    },
    "scheduleSessionRead": {
      "status": "healthy",
      "latencyMs": 24
    },
    "conflictCheckQuery": {
      "status": "healthy",
      "latencyMs": 31
    },
    "auditWriteDependency": {
      "status": "healthy",
      "latencyMs": 20
    },
    "notificationDependency": {
      "status": "degraded",
      "message": "Notification request queue table reachable but last processing lag exceeds threshold"
    }
  }
}
```

### 9.3 Health Status Rules

| Status | Rule |
|---|---|
| `healthy` | Database, conflict check, and audit dependency are reachable within latency thresholds. |
| `degraded` | Read operations work but optional dependencies such as notification processing or export storage are delayed. |
| `unhealthy` | Database unavailable, conflict checks fail, or audit writes cannot be guaranteed. |

Sensitive mutations must be disabled when audit persistence is unhealthy.

---

## 10. Backup and Recovery

### 10.1 Backup Requirements

| Backup Type | Frequency | Scope |
|---|---|---|
| PostgreSQL full backup | Daily | Entire database including scheduling tables. |
| Point-in-time recovery | Continuous where infrastructure supports it | All transactional schedule data. |
| Exported report files | Temporary; not primary backup | Regenerable from database. |
| Import source files | Retain according to ASTI import audit policy | Used for reconciliation and troubleshooting. |
| Audit logs | Daily backup and long retention | Sensitive action trace. |

### 10.2 Recovery Point and Time Objectives

| Data Area | RPO | RTO |
|---|---:|---:|
| Schedule sessions | 15 minutes | 4 hours |
| Business calendars and holidays | 15 minutes | 4 hours |
| Venue blocks | 15 minutes | 4 hours |
| Trainer availability | 15 minutes | 4 hours |
| Import batches | 1 hour | 8 hours |
| Audit logs | 15 minutes | 4 hours |
| Reporting views | Rebuildable | 2 hours after DB recovery |

### 10.3 Recovery Validation

After restoring scheduling data:

1. Verify branch records exist and match schedule branch IDs.
2. Run referential integrity checks for batch, trainer, classroom, and branch references.
3. Run conflict-detection verification for active future sessions.
4. Rebuild or refresh reporting views.
5. Validate latest 20 schedule audit records are available.
6. Open admin calendar for at least one active branch.
7. Open trainer timetable for one assigned trainer.
8. Open student timetable for one active enrollment.
9. Confirm timezone rendering uses Oman GST UTC+04:00.

---

## 11. Release and Deployment Checklist

### 11.1 Pre-Deployment

| Check | Required |
|---|---:|
| Prisma migration reviewed | Yes |
| Migration tested on staging copy | Yes |
| Index creation impact assessed | Yes |
| Permission seed data prepared | Yes |
| Menu seed data prepared | Yes |
| Report definitions seeded | Yes |
| Notification templates seeded | Yes |
| Role-permission mapping reviewed | Yes |
| Branch-scope tests passing | Yes |
| Conflict-detection tests passing | Yes |
| Import validation tests passing | Yes |
| Export audit tests passing | Yes |
| Backup completed before production migration | Yes |

### 11.2 Deployment

1. Put deployment window in change calendar.
2. Confirm latest database backup completed successfully.
3. Deploy database migration.
4. Seed permission/menu/report/template data.
5. Deploy application code.
6. Run smoke tests.
7. Run module health check.
8. Validate admin scheduling menu visibility by role.
9. Validate calendar view for one branch.
10. Validate create draft session in staging-like production smoke branch if available.
11. Validate conflict detection with known overlapping data.
12. Validate audit log is written for a harmless test mutation.
13. Validate report/dashboard load.
14. Monitor logs, metrics, and alerts for at least one business cycle after deployment.

### 11.3 Post-Deployment Smoke Tests

| Test | Expected Result |
|---|---|
| Branch Admin opens scheduling dashboard | Only assigned branch data appears. |
| Scheduling Coordinator creates draft session | Session created, audit written. |
| Coordinator attempts trainer double booking | Request rejected with conflict error. |
| Coordinator publishes session | Status changes to published, publication audit written. |
| Trainer opens trainer schedule | Trainer sees only assigned sessions. |
| Student opens timetable | Student sees only enrolled batch sessions. |
| Export schedule report | Export generated and audit record written. |
| Unauthorized user opens scheduling menu | Access denied or menu hidden. |

---

## 12. Runbook 1 – Calendar Page Is Slow

### Symptoms

- Admin calendar monthly view takes more than 2 seconds.
- Dashboard widgets show delayed loading.
- Logs show high duration for `SCH.api.calendar.list`.

### Steps

1. Check application metric `sch_api_request_duration_ms` for affected route.
2. Confirm whether issue affects one branch or all branches.
3. Check database CPU, memory, active connections, and slow query logs.
4. Inspect query filters: branchId, date range, status, isDeleted.
5. Verify required indexes exist on `schedule_sessions`.
6. Run query plan for calendar date-range query.
7. Check whether UI requested an excessive date range greater than allowed module limits.
8. Verify reporting/read-model refresh did not lock core tables.
9. Temporarily reduce default page range to weekly view if operationally necessary.
10. If table bloat is detected, schedule database maintenance according to DBA policy.
11. Record incident notes with branch, date range, affected route, query duration, and corrective action.

### Resolution Criteria

- Calendar API P95 returns below 1.5 seconds.
- No active slow query alert remains.
- Users can load calendar views within target threshold.

---

## 13. Runbook 2 – Conflict Detection Allows Overlap

### Symptoms

- Two sessions are scheduled for the same trainer/classroom/time.
- Users report double booking.
- Conflict reports show missed conflict.

### Steps

1. Identify conflict type: trainer, classroom, batch, holiday, or venue block.
2. Capture affected session IDs, branchId, date, startTime, endTime, status.
3. Check whether one of the sessions is soft-deleted, cancelled, draft, or completed.
4. Verify conflict query includes all active blocking statuses: `SCHEDULED`, `PUBLISHED`, `RESCHEDULED`, `IN_PROGRESS` where applicable.
5. Verify time overlap logic uses `requestedStart < existingEnd AND requestedEnd > existingStart`.
6. Verify all date/time calculations use Oman timezone and not UTC-local mixed comparison.
7. Check if conflict override was used with permission `scheduling.session.overrideConflict`.
8. Review audit logs for create/reschedule actions on affected sessions.
9. If overlap is invalid, reschedule one session using normal reschedule flow with reason.
10. Add regression test case for the missed condition.
11. Review indexes and query filters if conflict check missed due to branch or status filter error.

### Resolution Criteria

- Invalid overlapping sessions are corrected.
- Audit trail explains correction.
- Regression test prevents recurrence.

---

## 14. Runbook 3 – Bulk Import Fails

### Symptoms

- Import status becomes `FAILED` or `PARTIALLY_ACCEPTED`.
- Many rows rejected with validation errors.
- Import page displays row-level failures.

### Steps

1. Open import batch details by import batch number.
2. Review import type: schedule sessions, holidays, venue blocks, or trainer availability.
3. Check file format and template version.
4. Verify row count is less than or equal to `SCH_MAX_IMPORT_ROWS`.
5. Review top row-level error codes and counts.
6. Confirm referenced branch, batch, trainer, classroom, and calendar codes exist and are active.
7. Confirm dates use accepted format `YYYY-MM-DD` and times use `HH:mm` 24-hour format.
8. Confirm no rows contain overlapping sessions or blocked dates.
9. Export rejected rows with error reasons.
10. Ask operational user to correct source file and re-import using a new import batch.
11. If system accepted duplicate idempotency key incorrectly, escalate to engineering and block repeated import key.
12. If partial commit occurred, compare accepted row count with created schedule sessions and audit logs.

### Resolution Criteria

- Corrected import succeeds or valid rows are committed with rejected rows clearly explained.
- Import audit shows accepted and rejected row counts.
- No duplicate sessions are created.

---

## 15. Runbook 4 – Published Sessions Not Visible to Trainer

### Symptoms

- Trainer cannot see assigned session.
- Admin calendar shows session as published.
- Trainer portal timetable is empty or missing one date.

### Steps

1. Confirm trainer user is linked to correct `Person` and `TrainerProfile`.
2. Confirm session has the expected `trainerId`.
3. Confirm session status is `PUBLISHED` or another trainer-visible status.
4. Confirm session is not soft-deleted.
5. Confirm trainer has branch access or trainer portal query uses assignment-based visibility.
6. Confirm trainer profile status is active and effective date covers session date.
7. Confirm date filter in trainer portal includes the session date.
8. Check API logs for `SCH.api.trainerSchedule.list` and branch-scope filtering.
9. If cache/read model is used, refresh trainer schedule read model.
10. If assignment is incorrect, update session trainer through reschedule/update flow with audit reason.

### Resolution Criteria

- Trainer can view the session.
- Query logs confirm correct branch and trainer filters.
- Audit log records any correction.

---

## 16. Runbook 5 – Published Sessions Not Visible to Student

### Symptoms

- Student cannot see timetable for enrolled batch.
- Admin calendar shows sessions published.

### Steps

1. Confirm student user is linked to correct `Person` and `StudentProfile`.
2. Confirm student has active Enrollment for the batch.
3. Confirm enrollment branch matches session branch.
4. Confirm session batchId matches enrollment batchId.
5. Confirm session status is student-visible.
6. Confirm session date is within student portal allowed lookahead range.
7. Check if enrollment status is allowed for timetable visibility: `CONFIRMED`, `ACTIVE`, or configured equivalent.
8. Review API logs for student timetable route.
9. Verify no branch scope failure occurred.
10. If enrollment-batch mismatch is found, correct the enrollment or session using owning module workflow.

### Resolution Criteria

- Student can view correct timetable records.
- No sessions from unrelated batches or branches are visible.

---

## 17. Runbook 6 – Audit Write Failure During Mutation

### Symptoms

- Schedule mutation fails with internal error.
- Logs show `SCH.audit.write` failure.
- Audit health check is unhealthy.

### Steps

1. Treat as critical because sensitive mutations require audit.
2. Check database connectivity and audit table availability.
3. Verify Audit & Compliance package/service dependency is available within the monolith.
4. Check migration status for audit table columns used by scheduling payload.
5. Confirm transaction rollback occurred for the schedule mutation.
6. Disable sensitive schedule mutations temporarily if audit cannot be restored.
7. Allow read-only calendar views to continue if database reads are healthy.
8. Restore audit write capability.
9. Retry failed user action only after confirming no partial mutation committed.
10. Record incident and engineering follow-up.

### Resolution Criteria

- Audit write dependency is healthy.
- Sensitive mutations succeed with audit log records.
- No unaudited sensitive mutation remains in production.

---

## 18. Runbook 7 – Wrong Branch Data Visible

### Symptoms

- User reports seeing sessions from another branch.
- Report export contains unauthorized branch records.
- Branch scope alert triggered.

### Steps

1. Immediately capture affected userId, role, activeBranchId, requested route, and timestamp.
2. Confirm user branch assignments in `UserBranchAccess`.
3. Confirm whether user has `scheduling.report.consolidated` or child branch access.
4. Review API query logs for branch filter injection.
5. Check whether report query used read model/view without branch filter.
6. Disable affected report/export route if unauthorized data exposure is confirmed.
7. Identify exported files and revoke temporary links if applicable.
8. Review audit/export logs for affected user and timeframe.
9. Patch missing branch scope condition.
10. Add authorization regression test.
11. Notify internal compliance owner according to ASTI incident policy if sensitive data exposure occurred.

### Resolution Criteria

- Unauthorized branch data is no longer visible.
- Affected files are revoked where possible.
- Regression test confirms branch isolation.

---

## 19. Runbook 8 – Venue Block Does Not Prevent Scheduling

### Symptoms

- Session is scheduled in a classroom during an active venue block.
- Venue block report shows conflict.

### Steps

1. Identify venue block ID and affected session ID.
2. Confirm venue block status is `ACTIVE`.
3. Confirm venue block branchId and classroomId match the session.
4. Confirm block date and time overlap with session time.
5. Verify conflict validation includes venue block check for create, update, publish, and reschedule flows.
6. Check whether session was created before the venue block.
7. If venue block was created after the session, review venue block creation warnings and affected-session report.
8. If scheduling should have been blocked, reschedule affected session with reason.
9. Add test case for venue block conflict.
10. Review whether venue block should support full branch block or classroom-specific block and correct data if needed.

### Resolution Criteria

- Session no longer conflicts with venue block.
- Future scheduling attempts are blocked correctly.

---

## 20. Runbook 9 – Holiday Calendar Change Affects Published Sessions

### Symptoms

- New holiday added for a date with published sessions.
- Existing sessions remain scheduled on holiday.

### Steps

1. Identify holiday date, branch calendar, and branchId.
2. Run affected sessions report for the holiday date.
3. Verify whether holiday rule is full-day, half-day, or informational.
4. Check whether holiday creation flow displayed affected sessions warning.
5. If sessions must not occur, reschedule or cancel affected sessions through normal workflow.
6. Notify trainers and students through schedule change notification flow.
7. Confirm audit logs exist for holiday creation and session changes.
8. If holiday was added incorrectly, deactivate holiday with reason and audit.

### Resolution Criteria

- No active published session violates mandatory holiday rule.
- Affected stakeholders have updated timetable visibility.

---

## 21. Runbook 10 – Report Export Fails

### Symptoms

- User receives export failed message.
- Logs show export operation failure.
- File link not generated.

### Steps

1. Check `sch_export_total` metric by reportCode and status.
2. Verify user has `scheduling.export` and required report permission.
3. Confirm requested row count does not exceed sync export threshold.
4. Check export file storage availability.
5. Verify CSV/XLSX/PDF generation library did not fail on Arabic text or RTL content.
6. Check for formula-injection sanitization errors in data transformation.
7. Retry export with narrower date range.
8. If PDF export fails only, test CSV export to isolate rendering issue.
9. Record failed export parameters and correlationId.
10. Patch report rendering or data transformation issue.

### Resolution Criteria

- Export completes successfully.
- Export audit record includes filters, format, row count, and branch scope.

---

## 22. Data Repair Guidelines

Direct database repair is discouraged. Prefer business workflows that write audit logs. If emergency database repair is unavoidable, follow these rules:

1. Obtain written approval from authorized technical and business owner.
2. Take backup or table snapshot before repair.
3. Identify exact rows by primary key and branchId.
4. Preserve old values in a repair note.
5. Update only required fields.
6. Insert manual audit record with action `SYSTEM_REPAIR`.
7. Run validation queries after repair.
8. Attach repair SQL and validation output to incident record.

### 22.1 Example Validation Query Categories

```text
- Active sessions with missing branchId
- Active sessions referencing inactive batch
- Active sessions referencing inactive trainer
- Active sessions referencing inactive classroom
- Overlapping active sessions for same trainer
- Overlapping active sessions for same classroom
- Sessions scheduled on active holidays
- Sessions scheduled during active venue blocks
- Soft-deleted sessions visible in read models
```

---

## 23. Operational Dashboards

### 23.1 Technical Dashboard Widgets

| Widget | Metric | Owner |
|---|---|---|
| Scheduling API latency | `sch_api_request_duration_ms` | Engineering/Ops |
| Conflict check latency | `sch_conflict_check_duration_ms` | Engineering/Ops |
| Schedule mutation error rate | `sch_session_mutation_total` | Engineering/Ops |
| Import success/failure | `sch_bulk_import_total` | Operations |
| Export success/failure | `sch_export_total` | Operations |
| Branch scope denials | `sch_branch_scope_denied_total` | Security/Ops |
| Permission denials | `sch_permission_denied_total` | Security/Ops |
| Audit write health | audit write success/failure | Compliance/Ops |

### 23.2 Business Operations Dashboard Widgets

| Widget | Purpose |
|---|---|
| Today’s sessions by branch | Operational readiness. |
| Sessions needing publication | Prevent unpublished timetables. |
| Upcoming trainer conflicts | Proactive conflict resolution. |
| Upcoming classroom conflicts | Proactive venue allocation correction. |
| Sessions affected by holidays | Calendar compliance. |
| Venue blocks this week | Classroom planning. |
| Cancelled/rescheduled sessions | Delivery disruption monitoring. |
| Import rejection trend | Master data quality monitoring. |

---

## 24. Scheduled Maintenance Jobs

| Job | Frequency | Purpose |
|---|---|---|
| `SCH_REFRESH_REPORTING_VIEWS` | Every 15 minutes or on demand | Refresh schedule dashboard read models if materialized. |
| `SCH_DETECT_UPCOMING_CONFLICTS` | Daily at 02:00 Oman time | Identify future conflicts caused by data changes. |
| `SCH_GENERATE_SESSION_REMINDERS` | Daily or hourly based on notification policy | Create notification requests for upcoming sessions. |
| `SCH_CLEAN_EXPIRED_EXPORT_FILES` | Daily | Remove expired temporary export files. |
| `SCH_ARCHIVE_IMPORT_FILES` | Daily | Archive or remove import files according to retention policy. |
| `SCH_MARK_STALE_IMPORTS_FAILED` | Hourly | Close imports stuck in validating/processing state beyond timeout. |

Jobs must run inside the modular monolith infrastructure without requiring external brokers.

---

## 25. Incident Severity Matrix

| Severity | Examples | Response Expectation |
|---|---|---|
| SEV-1 Critical | Branch data exposure, audit write failure allowing unaudited mutations, widespread scheduling outage | Immediate incident response and mutation freeze if needed. |
| SEV-2 High | Conflict detection failure, trainer/student timetable unavailable, failed deployment | Same business day resolution target. |
| SEV-3 Medium | Bulk import failures, export failures, slow calendar views | Prioritized operational fix. |
| SEV-4 Low | Minor UI layout issue, isolated validation message problem | Normal backlog handling. |

---

## 26. Support Handoff Information

Every support escalation must include:

| Field | Required |
|---|---:|
| User ID or username | Yes |
| Role and permission summary | Yes |
| Active branch | Yes |
| Affected branch | Yes |
| Affected session/calendar/venue/import ID | Yes when applicable |
| Date and time of issue in Oman timezone | Yes |
| Screenshot or error message | Yes if UI issue |
| Correlation ID | Yes if available |
| Expected behavior | Yes |
| Actual behavior | Yes |
| Business impact | Yes |

---

## 27. Operational Acceptance Criteria

```gherkin
Feature: Scheduling operations readiness

  Scenario: Module health check returns healthy state
    Given the scheduling module is deployed
    And the database is reachable
    And conflict-check queries are functioning
    And audit write dependency is available
    When an authorized operator calls the scheduling health endpoint
    Then the response status should be "healthy"
    And each required check should include a latency value

  Scenario: Schedule mutation produces logs, trace, metric, and audit record
    Given an authorized scheduling coordinator reschedules a published session
    When the reschedule request succeeds
    Then a structured log entry should be written with module "SCH"
    And a trace span named "SCH.command.session.reschedule" should be created
    And the metric "sch_session_mutation_total" should increment
    And an audit log should store old and new values with reason

  Scenario: Backup recovery validation confirms scheduling integrity
    Given scheduling tables are restored from backup
    When the recovery validation checklist is executed
    Then branch references should be valid
    And future active sessions should pass conflict verification
    And admin calendar views should load for active branches
    And trainer and student timetable views should show authorized sessions only
```

---

## 28. Final Operations Checklist

| Item | Status Requirement |
|---|---|
| Health endpoint implemented | Required |
| Structured logs include correlationId | Required |
| Metrics emitted for API, conflict, import, export, mutation | Required |
| Trace spans configured for major commands and queries | Required |
| Audit write failure blocks sensitive mutations | Required |
| Backup and recovery procedure tested | Required |
| Branch isolation incident runbook documented | Required |
| Conflict detection incident runbook documented | Required |
| Bulk import troubleshooting documented | Required |
| Export troubleshooting documented | Required |
| Operational dashboards configured | Required |
| Alert thresholds configured | Required |
| Support escalation template available | Required |
