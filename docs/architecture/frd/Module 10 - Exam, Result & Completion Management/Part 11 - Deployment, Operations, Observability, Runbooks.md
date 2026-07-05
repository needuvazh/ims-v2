# Part 11 - Deployment, Operations, Observability, Runbooks

## Module 10 – Exam, Result & Completion Management

## 1. Purpose

This document defines the deployment, operational support, observability, backup, recovery, reconciliation, troubleshooting, and production-readiness requirements for Module 10 – Exam, Result & Completion Management.

It also performs the final consistency check across:

```text
Module Overview
Part 1 – Business Overview, Functional Requirements, Business Rules
Part 2 – User Stories, Use Cases, Workflows, State Machines
Part 3 – Screen Specifications and UI Components
Part 4 – Database Entities and CRUD Matrix
Part 5 – API Contracts
Part 6 – Permission Matrix
Part 7 – Validation Rules, Error Catalog, Notifications
Part 8 – Reports, Dashboards, KPIs, Analytics
Part 9 – BDD Acceptance Criteria and Test Scenarios
Part 10 – Security Architecture and NFR
```

The operational design preserves the module boundary:

```text
OWNED:
Exam
Result
CourseCompletion
CompletionApproval

REFERENCED:
Course
CourseCompletionRule
Batch
BatchTrainer
Enrollment
StudentProfile
Person
Attendance evidence
Finance payment validation
TrainerProfile
User
UserBranchAccess
Certificate
AuditLog
Communication/Notification models
Reporting projections
```

---

# 2. Deployment Architecture

## 2.1 Deployment Model

Module 10 is deployed as part of the modular-monolith application.

The module must not require:

```text
a dedicated microservice
a separate event broker
a separate deployment pipeline
a separate distributed transaction coordinator
```

unless the architecture is explicitly changed later.

Recommended logical packaging:

```text
apps/
  admin-portal/

packages/
  exam-result-completion/
    domain/
    application/
    infrastructure/
    presentation/
    contracts/
    tests/

  shared/
    auth/
    branch-policy/
    audit/
    validation/
    observability/
```

Exact repository structure must follow the existing monorepo conventions.

---

# 3. Deployment Preconditions

Before production deployment, verify:

```text
1. Database migration reviewed and approved.
2. Prisma schema matches DDD/ER decisions.
3. Permission seeds registered.
4. Menu permissions registered.
5. Report permissions registered.
6. Dashboard widget permissions registered.
7. Required cross-context readers are available.
8. Audit integration is functional.
9. Notification event contracts are registered.
10. Read-model migrations are applied.
11. Read-model refresh/rebuild mechanism is tested.
12. Metrics and dashboards are deployed.
13. Alerts are configured.
14. Backup jobs cover owned tables.
15. Restore procedure is tested.
16. BDD critical-path suite passes.
17. Branch-isolation tests pass.
18. Security tests pass.
19. Rollback procedure is documented.
20. Known schema gaps are resolved or explicitly waived.
```

---

# 4. Deployment Sequence

Recommended deployment order:

```text
1. Apply backward-compatible database migration
2. Deploy shared permission/authorization definitions
3. Deploy Module 10 application code
4. Register notification templates/events
5. Deploy read models/views/materialized views
6. Run read-model initial build
7. Enable dashboard/report queries
8. Enable feature/menu access
9. Run smoke tests
10. Validate metrics and logs
11. Enable user access progressively if feature flagging exists
```

## 4.1 Expand-and-Contract Rule

For schema changes:

```text
Expand:
add nullable/new compatible structures

Deploy application:
write/read compatible shape

Backfill:
populate required data

Verify:
reconcile

Contract:
remove obsolete structures in later release
```

Do not combine destructive schema removal with the first application deployment.

---

# 5. Database Migration Requirements

## 5.1 Owned Tables

Migration review must cover:

```text
Exam
Result
CourseCompletion
CompletionApproval
```

## 5.2 Required Constraints

Verify:

```text
Exam:
- maxMarks > 0
- passMarks >= 0
- passMarks <= maxMarks

Result:
- marksObtained >= 0
- active uniqueness on Exam + Enrollment

CourseCompletion:
- one active record per Enrollment
- attendance percentage 0..100 when present
- approvedBy/approvedAt pair consistency

CompletionApproval:
- FK to CourseCompletion
- active stage uniqueness where supported
- rejection reason enforcement in application/domain layer
```

## 5.3 No Cascade Delete

Migration must not introduce:

```text
Course → Exam CASCADE DELETE
Batch → Exam CASCADE DELETE
Exam → Result CASCADE DELETE
Enrollment → Result CASCADE DELETE
Enrollment → CourseCompletion CASCADE DELETE
CourseCompletion → CompletionApproval CASCADE DELETE
```

Operational evidence must remain protected.

---

# 6. Feature Flags and Progressive Enablement

Where the platform supports feature flags, recommended flags are:

```text
exc.exam-management.enabled
exc.result-entry.enabled
exc.result-finalization.enabled
exc.result-correction.enabled
exc.completion-evaluation.enabled
exc.completion-approval.enabled
exc.reevaluation.enabled
exc.reporting.enabled
```

Feature flags must not replace authorization.

A disabled feature:

```text
prevents feature use
```

but an enabled feature still requires:

```text
permission
branch scope
domain state
actor eligibility
```

---

# 7. Structured Logging Standard

## 7.1 Log Format

All Module 10 logs should be structured JSON.

Example:

```json
{
  "timestamp": "2026-08-21T11:00:00.000Z",
  "level": "INFO",
  "module": "exam-result-completion",
  "action": "completion.final-approve",
  "traceId": "01JXYZ...",
  "requestId": "REQ-...",
  "userId": "USR-100",
  "entityType": "CourseCompletion",
  "entityId": "CC-001",
  "branchId": "BR-MCT",
  "result": "SUCCESS",
  "durationMs": 342
}
```

## 7.2 Required Common Fields

```text
timestamp
level
service/application
module
action
traceId
requestId
userId when authenticated
entityType
entityId where applicable
branchId when derived
result
errorCode when failed
durationMs
```

## 7.3 Dependency Fields

For cross-context calls:

```text
dependency
operation
durationMs
outcome
dependencyTraceId if available
retryCount
```

Example:

```json
{
  "module": "exam-result-completion",
  "action": "completion.evaluate",
  "dependency": "attendance",
  "operation": "getCompletionEvidence",
  "outcome": "TIMEOUT",
  "durationMs": 2500,
  "errorCode": "ATTENDANCE_DEPENDENCY_UNAVAILABLE"
}
```

---

# 8. Logging by Workflow

## 8.1 Exam Lifecycle Logs

Log events:

```text
exam.create.started
exam.create.succeeded
exam.create.failed
exam.schedule.succeeded
exam.activate.succeeded
exam.close.succeeded
exam.cancel.succeeded
exam.archive.succeeded
```

## 8.2 Result Logs

```text
result.record.succeeded
result.bulk.validate.completed
result.bulk.submit.succeeded
result.bulk.submit.failed
result.finalize.succeeded
result.correct.succeeded
result.correct.failed
```

## 8.3 Completion Logs

```text
completion.evaluate.started
completion.evaluate.succeeded
completion.evaluate.failed
completion.reevaluate.started
completion.reevaluate.succeeded
completion.reevaluate.failed
completion.approval.transition.succeeded
completion.approval.transition.rejected
```

---

# 9. Log Redaction Rules

Never log:

```text
password
session token
authorization header
full request body for Result correction
Civil ID
passport number
visa number
personal address
full financial details
payment instrument data
```

For Result correction, log:

```text
resultId
old/new status
whether marks changed
reason reference or protected audit link
```

Detailed old/new marks belong in secured audit evidence according to policy, not general application logs unless approved.

---

# 10. Distributed Tracing Boundaries

Even in a modular monolith, tracing should follow logical application boundaries.

## 10.1 Core Trace

```text
HTTP Request / Server Action
→ Authentication
→ Permission Evaluation
→ Branch Policy
→ Module 10 Application Service
→ Domain Logic
→ Repository
→ Audit Integration
→ Cross-Context Reader
→ Event/Notification Handoff
→ Response
```

## 10.2 Completion Evaluation Trace

```text
POST completion-evaluate
  ↓
Authenticate
  ↓
Authorize completion.evaluate
  ↓
Load Enrollment context
  ↓
Load CourseCompletionRule
  ↓
Load Attendance evidence
  ↓
Load Result evidence
  ↓
Load Finance validation
  ↓
Evaluate completion
  ↓
Persist CourseCompletion
  ↓
Create/advance CompletionApproval if required
  ↓
Write audit
  ↓
Emit next-action event
```

## 10.3 Final Approval Trace

```text
Final Approval Request
→ IAM permission
→ Branch mutation policy
→ Load CourseCompletion
→ Verify approval stage
→ Reload/validate evidence freshness
→ Update CompletionApproval
→ Update CourseCompletion
→ Commit
→ Audit
→ Enrollment outcome handoff
→ Certificate eligibility handoff
→ Notification event
```

Cross-context side effects must be individually visible in trace spans.

---

# 11. Trace Attributes

Recommended span attributes:

```text
module.name
action.name
user.id
permission.code
branch.id
entity.type
entity.id
entity.version
approval.level
trigger.type
dependency.name
dependency.outcome
error.code
```

Do not include sensitive PII as trace attributes.

---

# 12. Metrics Instrumentation

## 12.1 API Metrics

```text
exc_api_requests_total
exc_api_request_duration_seconds
exc_api_errors_total
exc_api_concurrency_conflicts_total
exc_authz_denials_total
exc_branch_scope_denials_total
```

Labels:

```text
route
method
action
status_code
error_code
```

Avoid high-cardinality labels such as:

```text
userId
entityId
studentNumber
```

---

# 13. Exam Metrics

```text
exc_exam_created_total
exc_exam_scheduled_total
exc_exam_activated_total
exc_exam_closed_total
exc_exam_cancelled_total
exc_exam_invalid_transition_total
```

Suggested labels:

```text
branch_code if cardinality acceptable
status
```

Use caution with high-cardinality Course/Batch labels.

---

# 14. Result Metrics

```text
exc_result_recorded_total
exc_result_finalized_total
exc_result_corrected_total
exc_result_write_failures_total
exc_bulk_result_rows_validated_total
exc_bulk_result_rows_invalid_total
exc_bulk_result_submissions_total
exc_bulk_result_submission_failures_total
```

Derived alerts:

```text
correction-rate spike
bulk validation failure spike
Result write error spike
```

---

# 15. Completion Metrics

```text
exc_completion_evaluations_total
exc_completion_evaluation_failures_total
exc_completion_evaluation_duration_seconds
exc_completion_dependency_failures_total
exc_completion_reevaluations_total
exc_completion_reevaluation_exceptions_total
exc_completion_approvals_total
exc_completion_rejections_total
exc_approval_conflicts_total
```

Dependency labels:

```text
course_catalog
enrollment
attendance
finance
trainer_assignment
```

---

# 16. Queue Metrics

```text
exc_queue_pending_items
exc_queue_oldest_item_age_seconds
exc_queue_sla_breaches
```

Labels:

```text
queue_type
scope_type
```

Queue types:

```text
missing_results
completion_evaluation
trainer_recommendation
coordinator_review
final_approval
reevaluation
```

---

# 17. Integration Metrics

```text
exc_cross_context_call_duration_seconds
exc_cross_context_call_failures_total
exc_audit_write_failures_total
exc_notification_event_emit_failures_total
exc_enrollment_sync_failures_total
exc_certificate_eligibility_handoff_failures_total
```

---

# 18. Read Model Metrics

```text
exc_read_model_refresh_duration_seconds
exc_read_model_refresh_failures_total
exc_read_model_staleness_seconds
exc_read_model_reconciliation_mismatch_total
```

Each projection should identify:

```text
read_model_name
```

as bounded label.

---

# 19. Health Check Design

## 19.1 Liveness

Endpoint:

```text
/health/live
```

Checks:

```text
application process alive
event loop responsive
basic runtime functioning
```

Liveness must not fail solely because:

```text
Finance unavailable
Attendance unavailable
Reporting stale
Communication unavailable
```

Otherwise the application could restart unnecessarily.

## 19.2 Readiness

Endpoint:

```text
/health/ready
```

Checks required dependencies for serving core Module 10 traffic:

```text
primary database connectivity
schema migration compatibility
IAM/auth dependency
critical repository access
```

Conditional/degraded dependencies:

```text
Attendance
Finance
Communication
Reporting
Certificate
```

should be reported in readiness details according to platform policy without causing unsafe restart loops.

## 19.3 Deep Health

Restricted operational endpoint:

```text
/health/deep/exam-result-completion
```

Possible checks:

```text
DB read/write probe using safe health table or transaction rollback
owned-table presence
migration version
audit integration reachability
read-model freshness
cross-context reader reachability
event/outbox backlog
```

Deep health must be access-controlled.

---

# 20. Health Status Model

Recommended statuses:

```text
HEALTHY
DEGRADED
UNHEALTHY
```

Examples:

| Condition | Status |
|---|---|
| DB unavailable | UNHEALTHY |
| IAM unavailable | UNHEALTHY for authenticated use |
| Attendance unavailable | DEGRADED |
| Finance unavailable | DEGRADED |
| Communication unavailable | DEGRADED |
| Read model stale | DEGRADED |
| Certificate handoff unavailable | DEGRADED |
| Audit writer unavailable for sensitive mutation | UNHEALTHY for sensitive mutation path |

---

# 21. Alerting Rules

## 21.1 Critical Alerts

Trigger immediately for:

```text
primary DB unavailable
schema migration mismatch
sustained 5xx spike
audit write failure on sensitive transaction
cross-branch authorization anomaly
repeated final-approval failures caused by internal errors
owned-table corruption/reconciliation failure
```

## 21.2 High Alerts

```text
Finance dependency failure sustained
Attendance dependency failure sustained
Certificate eligibility handoff backlog
Enrollment outcome sync backlog
read model refresh failing repeatedly
reevaluation exception backlog growth
approval SLA breach spike
```

## 21.3 Warning Alerts

```text
Result correction rate above baseline
bulk Result invalid-row spike
queue aging threshold exceeded
dashboard projection staleness
export failure rate increase
```

---

# 22. Backup Scope

Backup policy must include owned transactional tables:

```text
exam
result
course_completion
completion_approval
```

Related platform backup scope must also include:

```text
audit_log
approval_history where used
outbox/event handoff records
reporting projection definitions
```

Read models do not require authoritative backup if safely rebuildable, but configuration and rebuild metadata must be protected.

---

# 23. Backup Requirements

Recommended:

```text
Continuous WAL/archive or platform-equivalent
Daily full backup
Point-in-time recovery capability
Encrypted backup storage
Access-controlled backup credentials
Restore drills
Retention according to platform/compliance policy
```

Targets inherited from Part 10:

```text
RPO <= 15 minutes recommended
RTO <= 4 hours recommended
```

Use stricter platform targets where defined.

---

# 24. Restore Order

Recommended restore validation order:

```text
1. Restore IAM/Organization dependencies according to platform recovery plan
2. Restore Course/Batch/Enrollment source contexts as applicable
3. Restore Module 10 owned tables
4. Restore Audit/Approval history
5. Restore outbox/integration handoff records
6. Validate cross-context references
7. Rebuild read models
8. Reconcile projections
9. Enable reporting
10. Enable write traffic after integrity checks
```

This order is logical; actual platform backup may restore the database as one unit.

---

# 25. Owned Table Recovery Validation

## 25.1 Exam

Check:

```text
row count
soft-delete count
status distribution
Course FK/reference validity
Batch FK/reference validity
marks constraints
version >= 1
```

## 25.2 Result

Check:

```text
row count
active uniqueness Exam + Enrollment
marks >= 0
marks <= Exam.maxMarks
Enrollment Course/Batch consistency
finalization representation integrity
version >= 1
```

## 25.3 CourseCompletion

Check:

```text
one active per Enrollment
attendance percentage range
approvedBy/approvedAt consistency
completionStatus validity
version >= 1
```

## 25.4 CompletionApproval

Check:

```text
parent CourseCompletion exists
approval level valid
status valid
stage ordering consistency
active stage uniqueness
rejection remarks where required
```

---

# 26. Recovery Reconciliation Queries

## RC-OPS-EXC-001 — Duplicate Result

Conceptual:

```sql
SELECT exam_id, enrollment_id, COUNT(*)
FROM result
WHERE deleted_at IS NULL
GROUP BY exam_id, enrollment_id
HAVING COUNT(*) > 1;
```

Expected:

```text
0 rows
```

## RC-OPS-EXC-002 — Duplicate CourseCompletion

```sql
SELECT enrollment_id, COUNT(*)
FROM course_completion
WHERE deleted_at IS NULL
GROUP BY enrollment_id
HAVING COUNT(*) > 1;
```

Expected:

```text
0 rows
```

## RC-OPS-EXC-003 — Orphan CompletionApproval

```sql
SELECT ca.id
FROM completion_approval ca
LEFT JOIN course_completion cc
  ON cc.id = ca.course_completion_id
WHERE cc.id IS NULL;
```

Expected:

```text
0 rows
```

## RC-OPS-EXC-004 — Branch Consistency

Validate:

```text
Result Exam branch
==
Result Enrollment branch
```

Expected:

```text
0 mismatches
```

---

# 27. Read Model Recovery

Read models are rebuildable.

Recovery sequence:

```text
1. Disable report refresh jobs if needed
2. Verify transactional source integrity
3. Drop/truncate derived projection safely
4. Rebuild from authoritative sources
5. Capture source watermark
6. Run reconciliation checks
7. Compare counts
8. Re-enable refresh
9. Clear stale alert
```

Do not modify transactional state to make the read model match.

---

# 28. Operational Runbook Index

| Runbook | Failure |
|---|---|
| RB-EXC-001 | Completion evaluation failing because Attendance is unavailable |
| RB-EXC-002 | Completion evaluation failing because Finance is unavailable |
| RB-EXC-003 | Bulk Result submission fails |
| RB-EXC-004 | Result correction succeeded but reevaluation is pending |
| RB-EXC-005 | Approval queue item stuck in incorrect stage |
| RB-EXC-006 | Cross-branch authorization incident suspected |
| RB-EXC-007 | Certificate eligibility handoff failed |
| RB-EXC-008 | Enrollment completion synchronization failed |
| RB-EXC-009 | Audit write failure on sensitive operation |
| RB-EXC-010 | Read model stale or inconsistent |
| RB-EXC-011 | Duplicate Result or CourseCompletion detected |
| RB-EXC-012 | Notification event emitted but no notification delivered |
| RB-EXC-013 | Approval command repeatedly returns concurrency conflicts |
| RB-EXC-014 | Production rollback required after Module 10 deployment |
| RB-EXC-015 | Database restore and Module 10 integrity validation |

---

# 29. RB-EXC-001 — Attendance Dependency Unavailable

## Symptoms

```text
completion.evaluate returns ATTENDANCE_DEPENDENCY_UNAVAILABLE
evaluation queue backlog increases
dependency failure metric increases
```

## Diagnosis

1. Check trace for Attendance reader span.
2. Check dependency latency/error metrics.
3. Verify whether outage is:
   - timeout;
   - authentication;
   - schema/contract mismatch;
   - database failure;
   - network failure.
4. Confirm Module 10 did not false-approve affected cases.
5. Identify affected Enrollment IDs from trace/event references.

## Recovery

1. Restore Attendance dependency.
2. Confirm health/read contract.
3. Re-run evaluation for affected records using authorized reevaluation/evaluation process.
4. Confirm CourseCompletion outcomes.
5. Clear backlog.
6. Review alert.

## Do Not

```text
manually set attendancePassed=true
directly update CourseCompletion to Approved
copy stale Attendance values into Module 10
```

---

# 30. RB-EXC-002 — Finance Dependency Unavailable

## Symptoms

```text
FINANCE_DEPENDENCY_UNAVAILABLE
completion evaluations blocked
payment-required courses accumulate pending records
```

## Diagnosis

1. Check Finance validation reader.
2. Confirm whether only one Enrollment or all requests fail.
3. Review timeout/auth/schema errors.
4. Confirm payment-required rule from CourseCompletionRule.
5. Ensure no false approvals occurred.

## Recovery

1. Restore Finance reader.
2. Validate authoritative payment outcome.
3. Re-run affected evaluations.
4. Confirm no duplicate CourseCompletion created.
5. Confirm downstream approval workflow starts only after valid evidence.

## Do Not

```text
derive paymentCompleted from cached UI data
mark paymentCompleted manually
update Invoice/Payment from Module 10
```

---

# 31. RB-EXC-003 — Bulk Result Submission Failure

## Symptoms

```text
bulk submission error
timeout
concurrency conflict
validation token mismatch
partial-result concern
```

## Diagnosis

1. Retrieve trace ID.
2. Inspect:
   - row count;
   - valid/invalid count;
   - transaction outcome;
   - DB timeout;
   - unique constraint errors;
   - stale versions.
3. Query Results for submission Enrollment IDs.
4. Determine documented transaction behavior:
   - atomic;
   - deterministic chunked.

## Recovery

### Atomic Policy

If transaction rolled back:

```text
fix validation/concurrency issue
refresh roster
revalidate payload
resubmit
```

### Chunked Policy

```text
identify committed chunk IDs
do not resend committed rows blindly
refresh Result versions
resubmit only remaining rows
```

## Verification

```text
one active Result per Exam + Enrollment
saved count matches expected
no duplicate rows
audit summary matches committed rows
```

---

# 32. RB-EXC-004 — Result Corrected but Reevaluation Pending

## Symptoms

```text
Result correction is committed
CourseCompletion shows ReevaluationRequired
approval blocked
```

## Diagnosis

1. Verify Result correction audit.
2. Verify corrected current Result.
3. Check reevaluation trigger event/handoff.
4. Check CourseCompletion current state.
5. Check dependency availability.

## Recovery

1. Resolve missing dependency if any.
2. Invoke controlled reevaluation.
3. Reload Course rule and evidence.
4. Verify new CourseCompletion outcome.
5. Preserve old Approval history.
6. Verify downstream eligibility change event when applicable.

## Do Not

```text
delete old CompletionApproval rows
manually reset completionStatus in database
create Certificate based on previous outcome
```

---

# 33. RB-EXC-005 — Approval Queue Item Stuck

## Symptoms

```text
queue shows pending item for excessive duration
UI action unavailable unexpectedly
stage appears inconsistent
```

## Diagnosis

1. Load authoritative CourseCompletion.
2. Load CompletionApproval rows.
3. Compare:
   - completion status;
   - current approval level;
   - approval status;
   - evidence stale flag;
   - branch;
   - version.
4. Check read model freshness.
5. Check whether prior event/projector failed.

## Recovery

If transactional state is correct but read model stale:

```text
rebuild/refresh read model
```

If transactional state inconsistent:

```text
do not edit DB manually
open controlled data repair incident
apply approved repair script with audit
reconcile Approval history
```

---

# 34. RB-EXC-006 — Suspected Cross-Branch Authorization Incident

## Symptoms

```text
user reports seeing another branch's learner
branch_scope_denials spike
unexpected export scope
security alert
```

## Immediate Response

1. Treat as security incident.
2. Preserve logs and traces.
3. Identify user/session.
4. Identify endpoint and entity.
5. Identify derived entity branch.
6. Identify effective IAM read/mutation scope at event time.
7. Disable affected access if ongoing.

## Investigation

Check:

```text
route handler authorization
branch-policy helper
read-model branch column
query filter
export filter intersection
cache key branch scope
```

## Containment

```text
revoke session if needed
disable affected feature
remove faulty deployment
fix branch derivation/filter
```

## Recovery

1. Deploy fix.
2. Run IDOR/cross-branch test suite.
3. Audit access logs.
4. Determine affected users/entities.
5. Follow incident notification policy if required.

---

# 35. RB-EXC-007 — Certificate Eligibility Handoff Failed

## Symptoms

```text
CourseCompletion approved
eligible outcome exists
Certificate Management did not receive/process handoff
```

## Diagnosis

1. Verify CourseCompletion approved state.
2. Verify certificateAllowed.
3. Verify required payment validation.
4. Locate handoff event/outbox record.
5. Check retry status.
6. Check Certificate consumer processing.

## Recovery

1. Re-deliver idempotently.
2. Verify eligibilityVersion.
3. Confirm Certificate context processes once.
4. Confirm no duplicate Certificate created.
5. Reconcile handoff status.

## Do Not

```text
insert Certificate from Module 10
manually set Certificate status in Module 10
send "certificate issued" notification before Certificate confirmation
```

---

# 36. RB-EXC-008 — Enrollment Completion Synchronization Failed

## Symptoms

```text
CourseCompletion approved
Enrollment completion outcome not reflected
```

## Diagnosis

1. Verify Module 10 transaction committed.
2. Locate sync event/command.
3. Check Enrollment boundary error.
4. Compare versions and state eligibility.
5. Confirm idempotency key/event ID.

## Recovery

1. Re-deliver idempotently.
2. Confirm Enrollment application boundary accepts valid outcome.
3. Reconcile status.
4. Preserve Module 10 audit history.

## Do Not

```text
directly update Enrollment repository from Module 10 package
```

---

# 37. RB-EXC-009 — Audit Write Failure on Sensitive Operation

## Symptoms

```text
audit write failure
result correction/final approval transaction blocked
```

## Policy

For sensitive operations requiring mandatory audit:

```text
fail closed
```

unless repository architecture provides transactionally reliable deferred audit persistence.

## Diagnosis

1. Check audit DB/service health.
2. Check schema mismatch.
3. Check payload validation.
4. Check transaction boundary.
5. Check outbox if used.

## Recovery

1. Restore audit path.
2. Retry original business command idempotently.
3. Verify:
   - business state;
   - audit evidence;
   - no duplicate transition.

## Critical Rule

Never create:

```text
Result corrected without audit
Final approval without audit
Completion rejection without reason/audit
```

---

# 38. RB-EXC-010 — Read Model Stale or Inconsistent

## Symptoms

```text
dashboard count wrong
queue item missing
report differs from transactional detail
staleness alert
```

## Diagnosis

1. Check refreshedAt.
2. Check source watermark.
3. Check projector/refresh job.
4. Run reconciliation queries.
5. Compare source counts.

## Recovery

1. Keep transactional workflows active if authoritative data healthy.
2. Mark reporting degraded if needed.
3. Rebuild projection.
4. Run reconciliation.
5. Re-enable reporting.
6. Verify stale alert clears.

## Do Not

```text
edit transactional Result or CourseCompletion to match projection
```

---

# 39. RB-EXC-011 — Duplicate Result or CourseCompletion Detected

## Symptoms

```text
unique reconciliation fails
duplicate rows
workflow ambiguity
```

## Immediate Action

1. Stop affected mutation path if duplication can continue.
2. Preserve evidence.
3. Identify root cause:
   - missing DB constraint;
   - race condition;
   - soft-delete filter issue;
   - failed migration;
   - manual DB edit.

## Recovery

1. Determine authoritative row using approved data-repair process.
2. Preserve audit history.
3. Soft-supersede duplicate according to approved policy.
4. Repair dependent references if necessary.
5. Add/fix uniqueness constraint.
6. Run BDD concurrency tests.

No ad hoc hard delete.

---

# 40. RB-EXC-012 — Notification Not Delivered

## Symptoms

```text
business event exists
user did not receive notification
```

## Diagnosis

1. Verify event emitted.
2. Verify NotificationRequest created by Communication.
3. Check recipient resolution.
4. Check template availability.
5. Check channel preference.
6. Check provider delivery/retry log.

## Recovery

Handled in Communication context:

```text
retry
change provider route
correct contact data through owning context
```

Module 10 must not modify NotificationLog.

---

# 41. RB-EXC-013 — Repeated Approval Concurrency Conflicts

## Symptoms

```text
409 CONCURRENCY_CONFLICT
multiple approvers
stale UI version
```

## Diagnosis

1. Load current CourseCompletion version.
2. Load current Approval stage.
3. Check whether another actor already acted.
4. Check UI caching.
5. Check duplicate request replay.

## Recovery

1. Refresh detail page.
2. Show current stage/outcome.
3. Do not automatically overwrite.
4. If request was duplicate, return idempotent/already-recorded outcome according to API contract.

---

# 42. RB-EXC-014 — Production Rollback

## Trigger

Rollback may be required for:

```text
critical authorization bug
data corruption
migration incompatibility
sustained high error rate
broken Result write path
broken completion approval path
```

## Procedure

1. Disable feature flags if available.
2. Stop unsafe writes.
3. Preserve logs/traces.
4. Determine whether DB migration is backward compatible.
5. Roll back application deployment.
6. Do not reverse destructive migration blindly.
7. Run smoke tests.
8. Verify:
   - Exam reads;
   - Result reads;
   - completion reads;
   - branch isolation.
9. Reconcile transactions during deployment window.
10. Open incident review.

---

# 43. RB-EXC-015 — Database Restore and Integrity Validation

## Procedure

1. Declare recovery window.
2. Stop Module 10 writes.
3. Restore database/PITR according to platform plan.
4. Validate migration version.
5. Run owned-table checks.
6. Run duplicate Result check.
7. Run duplicate CourseCompletion check.
8. Run orphan CompletionApproval check.
9. Validate branch consistency.
10. Validate Result threshold consistency.
11. Validate approval stage consistency.
12. Validate audit availability.
13. Rebuild read models.
14. Reconcile counts.
15. Verify integration handoff/outbox backlog.
16. Run smoke tests.
17. Re-enable reads.
18. Re-enable writes.
19. Monitor errors and queue backlog.

---

# 44. Smoke Test Suite After Deployment

Minimum smoke tests:

```text
1. Login as authorized Academic Coordinator.
2. Open Exam list.
3. Verify branch filter.
4. Create or inspect test Exam according to environment policy.
5. Open Result roster.
6. Validate a Result payload without committing production data.
7. Open Completion Evaluation queue.
8. Verify dependency evidence loading.
9. Open Approval queue.
10. Verify unauthorized action is hidden/denied.
11. Verify cross-branch direct lookup denied.
12. Open dashboard.
13. Verify read-model freshness metadata.
14. Verify logs contain traceId.
15. Verify metrics receive request data.
```

Production smoke tests must avoid unnecessary mutation.

---

# 45. Operational Dashboard Requirements

Operations dashboard should show:

```text
API error rate
P95 latency
DB connection health
completion dependency failure rate
Result correction count
bulk Result failure count
pending queue counts
oldest approval age
reevaluation exception count
audit failure count
notification handoff failure count
Enrollment sync failure count
Certificate handoff failure count
read model staleness
```

---

# 46. On-Call Diagnostic Checklist

For any incident:

```text
1. Identify traceId.
2. Identify endpoint/action.
3. Identify user and permission.
4. Identify entity and derived branch.
5. Identify current entity version.
6. Identify domain state.
7. Check audit evidence.
8. Check dependency spans.
9. Check event/outbox records.
10. Check read model freshness.
11. Reproduce in safe environment if possible.
12. Apply runbook.
```

---

# 47. Data Repair Governance

Manual data repair is exceptional.

Required:

```text
incident/ticket reference
approved repair plan
review by domain owner
review by database owner
pre-repair backup
script in source control or controlled repository
dry-run output
post-repair reconciliation
audit record
```

Prohibited:

```text
untracked SQL edits
hard delete of academic evidence
editing another context's aggregate from Module 10 repair script
changing Result without correction history
changing Approval without trace
```

---

# 48. Final Cross-Part Consistency Check

The final consistency review checks all Module 10 FRD parts against the DDD context map and ER model.

Status classifications:

```text
ALIGNED
PARTIALLY ALIGNED
DDD GAP
ER MODEL GAP
PRISMA IMPLEMENTATION GAP
CROSS-CONTEXT OWNERSHIP VIOLATION
FRD INTERNAL CONFLICT
FUTURE-SCOPE LEAKAGE
```

---

# 49. Aggregate Ownership Consistency

| Area | Final FRD Position | Status |
|---|---|---|
| Exam ownership | Module 10 owns Exam | ALIGNED |
| Result ownership | Module 10 owns Result | ALIGNED |
| CourseCompletion ownership | Module 10 owns CourseCompletion | ALIGNED |
| CompletionApproval ownership | Module 10 owns transactional completion approval stages | ALIGNED |
| CourseCompletionRule ownership | Course Catalog | ALIGNED |
| Enrollment ownership | Admission & Enrollment | ALIGNED |
| Attendance ownership | Attendance | ALIGNED |
| Finance validation ownership | Finance & Receivables | ALIGNED |
| Trainer assignment ownership | Training Delivery / Trainer context | ALIGNED |
| Certificate issuance ownership | Certificate Management | ALIGNED |
| Notification delivery ownership | Communication & Notification | ALIGNED |
| Audit persistence ownership | Audit & Compliance | ALIGNED |
| Reporting projection ownership | Query/reporting layer only; read-only | ALIGNED |

No cross-context ownership violation was found in Parts 1–10.

---

# 50. ER Entity Consistency

The final FRD uses only the following Module 10 persisted baseline entities:

```text
Exam
Result
CourseCompletion
CompletionApproval
```

DDD concepts handled without invented tables:

```text
Assessment
→ current persisted assessment form is Exam

Grade
→ Result.grade field

CompletionRuleEvaluation
→ domain/application behavior materialized into CourseCompletion
```

Status:

```text
ALIGNED WITH DOCUMENTED MODEL INTERPRETATION
```

---

# 51. Enrollment-Centric Lifecycle Consistency

All Result and Completion behavior remains linked to:

```text
Enrollment
```

The FRD does not create:

```text
StudentExamEnrollment
ParallelStudentCourse
CompletionStudent
ExamCandidate aggregate
```

Status:

```text
ALIGNED
```

---

# 52. Completion Workflow Consistency

The FRD consistently implements:

```text
Trainer Recommendation
→ Academic Coordinator Review
→ Branch Manager Approval
```

Across:

```text
Part 1 business rules
Part 2 state machines
Part 3 screens
Part 5 APIs
Part 6 permissions
Part 7 validations
Part 9 BDD tests
Part 10 security
Part 11 operations
```

Status:

```text
ALIGNED
```

---

# 53. Branch Isolation Consistency

Branch derivation is consistent across all parts:

```text
Exam
→ Batch
→ Branch

Result
→ Exam
→ Batch
→ Branch

CourseCompletion
→ Enrollment
→ Branch

CompletionApproval
→ CourseCompletion
→ Enrollment
→ Branch
```

The FRD consistently rejects:

```text
client-trusted branch authorization
consolidated read as mutation authority
cross-branch direct mutation
```

Status:

```text
ALIGNED
```

---

# 54. Certificate Boundary Consistency

All parts consistently state:

```text
Module 10:
evaluates completion
approves completion
exposes eligibility

Certificate Management:
creates Certificate
generates certificate number
creates QR/verification data
issues
reissues
revokes
verifies
```

Status:

```text
ALIGNED
```

---

# 55. Reporting Boundary Consistency

All Part 8 read models are:

```text
read-only
derived
rebuildable
non-authoritative
```

Part 9 tests prove stale projections cannot authorize commands.

Part 10 security prohibits command trust in read models.

Part 11 includes rebuild and reconciliation runbooks.

Status:

```text
ALIGNED
```

---

# 56. Cross-Context Integration Consistency

| Integration | Final Pattern | Status |
|---|---|---|
| Course rule | Read through Course Catalog boundary | ALIGNED |
| Enrollment context | Read through Enrollment boundary | ALIGNED |
| Attendance evidence | Read authoritative outcome | ALIGNED |
| Finance validation | Read authoritative outcome | ALIGNED |
| Trainer assignment | Read through Training Delivery/Trainer boundary | ALIGNED |
| Enrollment completion sync | Application boundary/event | ALIGNED |
| Certificate eligibility | Handoff/event | ALIGNED |
| Notifications | Domain event/intention to Communication | ALIGNED |
| Audit | Shared convention/boundary | ALIGNED |

---

# 57. Final Known Gaps

## GAP-FINAL-EXC-001 — Exact Status Enums

Affected:

```text
Exam.status
Result.resultStatus / lifecycle representation
CourseCompletion.completionStatus
CompletionApproval.status
```

Classification:

```text
PRISMA IMPLEMENTATION GAP
```

Action:

```text
validate schema.prisma
map functional states
amend schema only when required
```

---

## GAP-FINAL-EXC-002 — Result Finalization Persistence

ER baseline does not explicitly define:

```text
finalizedAt
finalizedBy
dedicated lifecycle field
```

Classification:

```text
ER MODEL GAP / PRISMA IMPLEMENTATION GAP
```

Action:

```text
verify actual Prisma model
define explicit persistence approach
do not overload academic pass/fail status ambiguously
```

---

## GAP-FINAL-EXC-003 — Result Correction History

No dedicated ResultRevision entity in ER.

Current FRD position:

```text
current Result
+
version
+
AuditLog history
+
mandatory reason
```

Classification:

```text
PARTIALLY ALIGNED
```

No new table is required unless architecture explicitly amends the model.

---

## GAP-FINAL-EXC-004 — Completion Reevaluation/Supersession Representation

Functional workflow needs:

```text
ReevaluationRequired
ExceptionReview
superseded prior approval semantics
```

Exact persistence representation is not fully defined.

Classification:

```text
ER MODEL GAP / PRISMA IMPLEMENTATION GAP
```

---

## GAP-FINAL-EXC-005 — Evidence Versioning

Stale-evidence protection benefits from:

```text
sourceVersion
sourceUpdatedAt
watermark
```

Contracts are not fully specified for all dependencies.

Classification:

```text
CROSS-CONTEXT CONTRACT GAP
```

---

## GAP-FINAL-EXC-006 — Retakes and Multiple Attempts

Current ER does not support:

```text
attemptNumber
retake policy
best-attempt selection
weighted attempt logic
```

Classification:

```text
FUTURE-SCOPE / DDD-ER GAP
```

FRD correctly leaves this out of current implementation.

---

## GAP-FINAL-EXC-007 — Grade Semantics

`Result.grade` exists, but no Grade master or grade-scale rules are defined.

Classification:

```text
PARTIALLY ALIGNED
```

Action:

```text
confirm whether grade is:
free text
derived code
enum
future master data
```

---

## GAP-FINAL-EXC-008 — Student Result Publication Policy

Student Portal read behavior depends on publication rules not fully defined.

Classification:

```text
DDD GAP / PRODUCT POLICY GAP
```

Current FRD keeps Student Portal read-only and publication-policy dependent.

---

# 58. Final Conflict Check Across Parts

No material internal contradiction was found in these areas:

```text
aggregate ownership
branch scope
approval order
certificate boundary
Attendance ownership
Finance ownership
notification ownership
reporting read-only status
soft-delete policy
audit requirement
permission model
```

The following areas remain intentionally conditional pending implementation confirmation:

```text
exact status enum values
Result finalization storage
approval supersession storage
evidence version contracts
grade semantics
Student Result publication policy
```

These are documented gaps, not silent inconsistencies.

---

# 59. Final DDD Alignment Verdict

Overall verdict:

```text
MODULE 10 FRD IS DDD-ALIGNED
WITH DOCUMENTED IMPLEMENTATION GAPS
THAT MUST BE RESOLVED BEFORE FINAL CODING/SCHEMA MIGRATION.
```

The FRD remains consistent with these architectural principles:

```text
Enrollment-centric lifecycle
Person/Party reuse
Modular monolith
Dynamic RBAC
Server-side branch isolation
No hard delete
Auditable sensitive actions
Context-owned source of truth
Read-only reporting projections
Certificate eligibility separated from Certificate issuance
Completion workflow:
Trainer → Coordinator → Branch Manager
```

---

# 60. Final Production Readiness Gate

Module 10 is ready for implementation/deployment only when:

```text
1. Prisma mappings are validated.
2. Status enums are finalized.
3. Result finalization persistence is resolved.
4. Reevaluation/supersession representation is resolved.
5. Cross-context evidence contracts are finalized.
6. Permission seeds are registered.
7. Branch policy tests pass.
8. Audit integration passes.
9. Notification event contracts pass.
10. Certificate eligibility handoff is idempotent.
11. Enrollment sync is idempotent.
12. Read models rebuild successfully.
13. Backup restore is tested.
14. BDD critical suite passes.
15. Security/IDOR tests pass.
16. Metrics, traces, and alerts are visible.
17. Operational runbooks are reviewed by support/on-call owners.
```

---

# 61. Final Operational Principle

```text
The transactional database remains the source of truth.

Operational commands:
- authorize against IAM,
- derive branch scope,
- load authoritative state,
- validate domain rules,
- apply optimistic concurrency,
- commit only Module 10-owned state,
- write audit evidence,
- emit traceable cross-context side effects.

Read models:
- support dashboards and reports,
- remain read-only,
- remain rebuildable,
- never authorize or mutate transactional state.

Operational recovery:
- repairs projections before transactions,
- preserves academic evidence,
- preserves approval history,
- never bypasses bounded-context ownership.
```
