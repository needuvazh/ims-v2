# Part 10 - Security Architecture and NFR

## Module 10 – Exam, Result & Completion Management

## 1. Purpose

This document defines the security architecture and non-functional requirements for Module 10 – Exam, Result & Completion Management.

The module processes high-integrity academic records and sensitive completion decisions. Its security posture must protect:

```text
Exam definitions
Result marks and derived academic outcomes
Result finalization state
Result corrections
Completion evaluation outcomes
Completion approval workflow
Trainer recommendation decisions
Coordinator approval decisions
Final completion approvals and rejections
Reevaluation exceptions
Cross-context evidence references
Audit evidence
Notification side effects
Reporting and export data
```

The module's core persistence consists of:

```text
Exam
Result
CourseCompletion
CompletionApproval
```

The module consumes authoritative facts from:

```text
Course Catalog
Admission & Enrollment
Training Delivery
Attendance
Finance & Receivables
Faculty / Trainer
Identity & Access Management
Certificate Management
Communication & Notification
Audit & Compliance
Reporting & Dashboards
```

---

# 2. Security Objectives

The security design must achieve the following objectives.

## SEC-EXC-001 — Protect Academic Integrity

Prevent unauthorized:

```text
marks changes
Result status manipulation
Result finalization bypass
Result correction
completion approval
approval-stage skipping
certificate eligibility fabrication
cross-branch mutation
```

## SEC-EXC-002 — Preserve Provenance

Every sensitive academic change must be attributable to:

```text
actor
action
entity
timestamp
old value
new value
business reason where required
branch
request trace
```

## SEC-EXC-003 — Enforce Context Ownership

Module 10 must not directly mutate:

```text
CourseCompletionRule
AttendanceRecord
Invoice
Payment
Enrollment
Certificate
Role
Permission
UserBranchAccess
NotificationLog
```

## SEC-EXC-004 — Fail Closed on Dependency Uncertainty

When required authoritative dependency data is unavailable:

```text
do not approve completion
do not assume Attendance passed
do not assume Finance validation passed
do not assume Trainer assignment
do not assume Certificate was issued
```

## SEC-EXC-005 — Prevent Data Leakage

The module must minimize disclosure of:

```text
cross-branch student identity
unpublished Results
internal approval remarks
sensitive audit history
unnecessary Person attributes
```

---

# 3. Threat Model Summary

## 3.1 Primary Threats

| Threat                  | Example                                    | Required Control                      |
| ----------------------- | ------------------------------------------ | ------------------------------------- |
| IDOR                    | Accessing Result from another branch by ID | Entity-derived branch authorization   |
| Privilege escalation    | Trainer calling final approval API         | Fine-grained permission checks        |
| Role-name bypass        | Hardcoded "Branch Manager" checks          | Permission-based authorization        |
| Forged branch scope     | Client sends another branchId              | Server derives branch from entity     |
| Result tampering        | Client sends contradictory resultStatus    | Server derives status                 |
| Completion tampering    | Client sends paymentCompleted=true         | Server loads Finance evidence         |
| Approval stage skipping | Calling final approval directly            | Workflow state machine guard          |
| Lost update             | Two actors overwrite Result                | Optimistic versioning                 |
| Audit evasion           | Correct Result without reason              | Mandatory audit and reason            |
| Stale evidence approval | Approving after Attendance correction      | Evidence staleness/revalidation       |
| Read-model trust abuse  | Approval from stale projection             | Reload transactional state            |
| Data export leakage     | Exporting unauthorized branches            | Server-side branch intersection       |
| Notification confusion  | Eligibility event sends issue notice       | Certificate context owns issue notice |
| Replay                  | Duplicate approval or event request        | Idempotency and state validation      |
| Injection               | Malicious export/search inputs             | Schema validation and output encoding |

---

# 4. Authentication Architecture

## 4.1 Authentication Requirement

All Module 10 APIs and Server Actions require authenticated session.

Public anonymous access is not allowed for:

```text
Exam management
Result entry
Result correction
Completion evaluation
Approval workflows
Audit access
Exports
Operational dashboards
```

## 4.2 Session Requirements

The authenticated principal must resolve:

```text
userId
session status
effective permissions
assigned branches
default branch
consolidated-read capability
child-branch visibility where supported
personId where applicable
trainer identity mapping where applicable
```

## 4.3 Session Security

Requirements:

- secure, HTTP-only session cookie or approved token mechanism;
- SameSite policy appropriate to deployment;
- TLS only;
- session expiration;
- revoked/disabled user blocked promptly;
- session rotation after sensitive authentication events;
- CSRF protection where cookie-authenticated mutation endpoints require it.

---

# 5. Authorization Architecture

## 5.1 Authorization Formula

Every mutation must satisfy:

```text
Authenticated
AND Required Permission
AND Entity Branch in Mutation Scope
AND Actor Domain Eligibility
AND Entity State Allows Action
AND Business Preconditions Pass
AND Expected Version Matches
```

## 5.2 Query Authorization Formula

Every query must satisfy:

```text
Authenticated
AND Read Permission
AND Requested Branch Filter Intersects Effective Read Scope
AND Entity-Specific Visibility Rules
```

## 5.3 Menu vs API Authorization

Menu visibility:

```text
is not security
```

A user who cannot see a menu but has valid action permission may still use an approved deep link.

A user who can see a menu but lacks action permission must be denied by API.

---

# 6. Branch Isolation Security

## 6.1 Entity Branch Derivation

### Exam

```text
Exam
→ Batch
→ branchId
```

### Result

```text
Result
→ Exam
→ Batch
→ branchId
```

Consistency cross-check:

```text
Result
→ Enrollment
→ branchId
```

### CourseCompletion

```text
CourseCompletion
→ Enrollment
→ branchId
```

### CompletionApproval

```text
CompletionApproval
→ CourseCompletion
→ Enrollment
→ branchId
```

## 6.2 Mutation Rule

A client-supplied `branchId` must never be the sole authorization input.

Required:

```text
load entity
derive branch
resolve user mutation branch set
intersect
authorize
```

## 6.3 Consolidated Read

Consolidated reporting may allow:

```text
multi-branch counts
multi-branch tables
multi-branch charts
multi-branch export
```

It must not imply:

```text
cross-branch Result edit
cross-branch completion approval
cross-branch Result correction
```

---

# 7. Fine-Grained Permission Controls

High-risk permissions:

```text
result.correct
completion.reevaluate
completion.final-approve
completion.reject
completion.exception.resolve
completion.audit.read
result.audit.read
completion.export
```

These should be separately assignable.

Recommended segregation:

```text
result.record
!=
result.correct
```

```text
completion.coordinator-review
!=
completion.final-approve
```

```text
report.exam-completion.consolidated
!=
transactional mutation access
```

---

# 8. Result Integrity Security

## 8.1 Server-Derived Result Status

The server must derive:

```text
PASSED
FAILED
```

from:

```text
marksObtained
Exam.passMarks
```

Client must not be trusted to set resultStatus.

## 8.2 Marks Validation

Required:

```text
marks >= 0
marks <= Exam.maxMarks
```

## 8.3 Finalization Protection

After finalization:

- ordinary Result edit must be blocked;
- correction must use dedicated command;
- `result.correct` required;
- reason required;
- old/new values audited;
- affected CourseCompletion must be reevaluated or marked stale.

## 8.4 Bulk Entry Integrity

Bulk Result submission must:

- validate every row;
- detect duplicate Enrollment rows;
- enforce branch scope per row;
- reject stale versions;
- use documented transaction behavior;
- never silently report complete success after partial failure.

---

# 9. Completion Integrity Security

## 9.1 Trusted Evidence Sources

Completion evaluation must load:

```text
Course rule from Course Catalog
Enrollment context from Admission & Enrollment
Attendance evidence from Attendance
Exam evidence from Module 10 Result truth
Payment validation from Finance
```

## 9.2 Prohibited Trusted Client Fields

Do not trust client-supplied:

```text
attendancePassed
attendancePercentage
examPassed
paymentCompleted
completionStatus
certificateEligible
manualApprovalRequired
certificateAllowed
```

## 9.3 Fail-Safe Evaluation

If a required dependency is unavailable:

```text
do not approve
mark pending/incomplete/error state
surface dependency status
allow controlled retry
```

## 9.4 Evidence Staleness

Approval must be blocked if:

```text
Attendance changed after evaluation
Result changed after evaluation
Payment validation changed after evaluation
Course rule context changed under an approved reevaluation policy
```

The exact staleness mechanism may use:

```text
sourceVersion
sourceUpdatedAt
event watermark
evaluation timestamp
```

according to available contracts.

---

# 10. Approval Workflow Security

## 10.1 Ordered Stages

Required sequence:

```text
Trainer Recommendation
→ Academic Coordinator Review
→ Branch Manager Approval
```

## 10.2 Stage Authorization

Each stage requires:

```text
specific permission
correct workflow state
branch mutation scope
actor eligibility
current evidence
version match
```

## 10.3 Trainer Eligibility

Trainer Recommendation requires:

```text
User
→ Person
→ TrainerProfile
```

and:

```text
Batch assignment or explicit authorization
```

## 10.4 Final Approval

Final approval must not:

- create Certificate;
- mutate Enrollment directly through repository;
- bypass Coordinator stage;
- proceed on stale evidence.

---

# 11. Audit Architecture

## 11.1 Sensitive State Changes Requiring Audit

Mandatory audit for:

```text
Exam creation
Exam update
Exam reschedule
Exam cancellation
Exam archival/deactivation
Result creation
Bulk Result submission
Result finalization
Result correction
Completion evaluation
Completion reevaluation
Trainer Recommendation decision
Coordinator Review decision
Final Approval
Completion rejection
Exception resolution
Export generation where policy requires
```

## 11.2 Audit Data

Minimum audit payload:

```text
auditId
entityType
entityId
action
actorUserId
performedAt
derivedBranchId
oldValue
newValue
reason
traceId
sourceIp where policy allows
```

## 11.3 Result Correction Audit

Must include:

```text
old marks
new marks
old result status
new result status
reason
actor
timestamp
Result ID
Exam ID
Enrollment ID
```

## 11.4 Approval Audit

Must include:

```text
approval level
previous state
new state
actor
remarks/reason
timestamp
CourseCompletion ID
```

## 11.5 Reevaluation Audit

Must include:

```text
trigger type
trigger reference
previous completion outcome
new completion outcome
evidence sources
approval history preservation status
certificate impact signal if applicable
```

---

# 12. Cross-Context Side Effect Audit

Cross-context side effects must be traceable.

## 12.1 Enrollment Outcome Synchronization

When approved completion outcome is communicated to Admission & Enrollment:

Audit or integration trace must include:

```text
courseCompletionId
enrollmentId
source version
outcome
event/command ID
occurredAt
delivery/processing status where architecture supports it
```

## 12.2 Certificate Eligibility Handoff

Must trace:

```text
courseCompletionId
enrollmentId
eligibilityVersion
certificateAllowed
paymentValidationPassed
completionApprovedAt
handoff event ID
```

Module 10 must not audit a Certificate as issued until Certificate Management confirms it.

## 12.3 Notification Event Emission

Trace:

```text
domain event ID
template intent code
recipient reference
channel intent
deduplication key input
```

Delivery result remains Communication context responsibility.

---

# 13. Data Protection

## 13.1 Data Minimization

Module 10 operational screens and reports should use:

```text
Student Number
Enrollment Number
Display Name
Course
Batch
Academic outcome
Completion status
Approval state
```

Avoid by default:

```text
Civil ID
Passport Number
Visa Number
Home address
Full financial ledger
Sensitive internal notes
```

## 13.2 Encryption in Transit

All traffic:

```text
TLS 1.2+ minimum
TLS 1.3 preferred where platform supports
```

## 13.3 Encryption at Rest

Database, backups, export storage, and logs must use infrastructure-approved encryption at rest.

## 13.4 Secret Management

No secrets in:

```text
source control
frontend bundles
logs
error messages
environment examples with live values
```

Use approved secret manager or deployment secret mechanism.

---

# 14. Logging Security

Structured logs should include:

```text
timestamp
level
service/module
action
traceId
userId
entityType
entityId
branchId
result
errorCode
durationMs
dependency
```

Do not log:

```text
session token
password
full request body for Result correction
Civil ID
passport number
visa number
payment card data
raw authorization headers
```

For bulk Result operations, log:

```text
row count
valid count
invalid count
saved count
transaction outcome
```

not full student payloads.

---

# 15. Input Security

All API inputs must use strict schemas.

Required protections:

```text
length limits
enum validation
numeric range validation
date format validation
unknown-field policy
payload size limits
array size limits
duplicate-row detection
ID format validation
```

## 15.1 Export Security

Protect against:

```text
CSV formula injection
unapproved columns
cross-branch export
oversized export abuse
path traversal in file name handling
```

CSV cells beginning with:

```text
=
+
-
@
```

must be neutralized according to export library policy.

---

# 16. API Security Controls

## 16.1 Rate Limiting

Recommended controls:

| Endpoint Type   | Suggested Control                        |
| --------------- | ---------------------------------------- |
| Search/list     | user/session rate limit                  |
| Single mutation | moderate per-user rate limit             |
| Bulk Result     | stricter per-user and payload-size limit |
| Export          | strict per-user concurrency limit        |
| Audit reads     | rate limit and permission                |
| Reevaluation    | anti-replay/idempotency                  |

Exact limits must be tuned through load testing.

## 16.2 Idempotency

Recommended for:

```text
bulk Result submit
completion evaluate
completion reevaluate
approval actions
export generation
```

Duplicate requests must not create duplicate state transitions.

## 16.3 CSRF

Required where mutation uses cookie-based authentication and framework protections are not otherwise sufficient.

## 16.4 CORS

Restrict to approved application origins.

---

# 17. Availability Requirements

## NFR-EXC-AVL-001 — Availability Target

Target:

```text
99.9% monthly availability
```

for Module 10 Admin Portal/API under normal production service commitments.

Higher targets may be adopted if platform SLO is stricter.

## NFR-EXC-AVL-002 — Dependency Failure Isolation

Failure of:

```text
Attendance
Finance
Communication
Reporting
Certificate
```

must not corrupt Module 10 transactional state.

## NFR-EXC-AVL-003 — Notification Failure

Notification delivery failure must not roll back committed academic transaction.

## NFR-EXC-AVL-004 — Reporting Failure

Dashboard/report read-model failure must not prevent core Exam/Result/Completion commands unless the command explicitly requires authoritative dependency data.

## NFR-EXC-AVL-005 — Graceful Degradation

Examples:

```text
Finance unavailable:
completion evaluation blocked safely

Reporting unavailable:
transactional workflows remain available

Communication unavailable:
business transaction commits; notification retries later

Certificate unavailable:
completion approval remains valid; eligibility handoff retries/reconciles
```

---

# 18. Performance Requirements

## NFR-EXC-PERF-001 — Simple Read API

Targets under normal load:

```text
P50 < 300 ms
P95 < 800 ms
P99 < 1500 ms
```

Examples:

```text
Get Exam Detail
Get Result Detail
Get CourseCompletion Detail
Get Approval Timeline
```

## NFR-EXC-PERF-002 — Search/List API

Targets:

```text
P95 < 2 seconds
```

with indexed filters and page size <= 100.

## NFR-EXC-PERF-003 — Dashboard

Target:

```text
P95 < 2 seconds
```

for operational dashboard summary using optimized read models.

## NFR-EXC-PERF-004 — Operational Report

Target:

```text
P95 < 3 seconds
```

for first page of filtered report.

## NFR-EXC-PERF-005 — Single Result Write

Target:

```text
P95 < 1 second
```

excluding unavailable external dependency waits not required for Result recording.

## NFR-EXC-PERF-006 — Bulk Result Validation

Target:

```text
<= 5 seconds
```

for up to 1000 rows under normal load.

## NFR-EXC-PERF-007 — Bulk Result Commit

Target:

```text
<= 10 seconds
```

for 1000 validated rows under normal load, subject to database performance.

## NFR-EXC-PERF-008 — Completion Evaluation

Target:

```text
P95 < 3 seconds
```

when authoritative dependencies respond within their SLO.

## NFR-EXC-PERF-009 — Approval Command

Target:

```text
P95 < 1.5 seconds
```

excluding downstream asynchronous notification handling.

---

# 19. Scalability Requirements

## NFR-EXC-SCL-001 — Horizontal Application Scalability

Application layer must be stateless or session architecture must support horizontal scaling.

## NFR-EXC-SCL-002 — Pagination

All large lists must use server-side pagination.

No endpoint should load entire:

```text
Exam table
Result table
CourseCompletion table
CompletionApproval table
```

for UI filtering.

## NFR-EXC-SCL-003 — Bulk Processing

Bulk Result operations must support bounded payloads.

Recommended maximum:

```text
1000 rows per request
```

unless load testing proves a different safe threshold.

## NFR-EXC-SCL-004 — Read Model Separation

Heavy dashboard/report queries should use:

```text
read replica
database view
materialized view
reporting projection
```

where needed.

They remain read-only.

## NFR-EXC-SCL-005 — Indexing

Required query paths must be indexed according to Part 4 and Part 8.

---

# 20. Concurrency Requirements

## NFR-EXC-CONC-001 — Optimistic Locking

Required for:

```text
Exam
Result
CourseCompletion
CompletionApproval
```

## NFR-EXC-CONC-002 — Approval Race

When two actors attempt the same approval stage:

```text
one succeeds
one receives conflict/already-recorded response
no duplicate approval transition
```

## NFR-EXC-CONC-003 — Result Correction Race

Stale Result correction must fail with:

```text
409 CONCURRENCY_CONFLICT
```

## NFR-EXC-CONC-004 — Reevaluation Race

Concurrent reevaluation and approval must not produce inconsistent state.

Approval must revalidate evidence/state before commit.

---

# 21. Reliability Requirements

## NFR-EXC-REL-001 — Transactional Consistency

Sensitive write sets must be atomic where they are in the same database transaction.

Examples:

```text
Result correction + Result state update + required local audit reference
Approval stage decision + CourseCompletion transition
Bulk Result bounded commit
```

## NFR-EXC-REL-002 — Cross-Context Delivery

Where side effects are asynchronous:

```text
use reliable event/outbox/retry mechanism if repository supports it
```

No external broker is required by this FRD.

A modular-monolith-compatible approach is acceptable.

## NFR-EXC-REL-003 — Idempotent Consumers

Downstream processing of:

```text
CourseCompletionApproved
CertificateEligible
ResultCorrected
CompletionReevaluationRequired
```

must be idempotent.

---

# 22. Usability Requirements

## NFR-EXC-USA-001 — Result Entry Efficiency

Trainer must be able to:

```text
find assigned Exam
open roster
enter marks
validate
save
```

with minimal navigation.

## NFR-EXC-USA-002 — Keyboard Support

Result grids must support keyboard navigation and efficient entry.

## NFR-EXC-USA-003 — Error Clarity

Validation errors must:

```text
identify field/row
use stable code
show safe user message
preserve valid entered data
```

## NFR-EXC-USA-004 — High-Risk Confirmation

Require explicit confirmation for:

```text
Result finalization
Result correction
Exam cancellation
Final completion approval
Completion rejection
```

## NFR-EXC-USA-005 — Evidence Transparency

Completion review UI must show:

```text
rule summary
Attendance evidence
Exam evidence
Payment validation
approval history
staleness warning
```

without requiring the user to manually recompute criteria.

---

# 23. Accessibility Requirements

Target:

```text
WCAG 2.1 AA
```

or stricter platform standard if adopted.

Requirements:

- keyboard navigation;
- visible focus;
- accessible labels;
- error summary;
- field error association;
- semantic tables;
- color-independent status indication;
- accessible dialogs;
- localized ARIA labels;
- correct reading order in LTR and RTL.

---

# 24. Localization Requirements

## NFR-EXC-L10N-001

English LTR and Arabic RTL must be supported.

## NFR-EXC-L10N-002

Domain codes remain language-neutral.

Example:

```text
APPROVED
```

Display:

```text
Approved
معتمد
```

## NFR-EXC-L10N-003

Date-only Exam dates must not shift due to timezone conversion.

## NFR-EXC-L10N-004

Exports must support Arabic headers and RTL PDF layout where platform export capability supports it.

---

# 25. Compliance Requirements

## 25.1 Academic Record Integrity

The system must preserve:

```text
Result history
correction history
approval history
actor provenance
decision timestamps
```

## 25.2 No Hard Delete

Operational academic evidence must not be hard-deleted through normal workflow.

## 25.3 Audit Retention

Retention duration must follow institute/legal policy.

This FRD does not invent a statutory duration.

## 25.4 Data Minimization

Only necessary Person data should be shown and exported.

## 25.5 Oman Deployment Context

System configuration should use:

```text
configured Oman timezone
configured currency/localization defaults
Arabic/English presentation
```

Any tax-specific legal formatting remains Finance context responsibility, not Module 10.

---

# 26. Backup and Recovery NFR

## NFR-EXC-DR-001 — Backup Coverage

Backups must include:

```text
Exam
Result
CourseCompletion
CompletionApproval
related audit records
required configuration references according to platform backup scope
```

## NFR-EXC-DR-002 — Recovery Objectives

Recommended targets:

```text
RPO <= 15 minutes
RTO <= 4 hours
```

unless platform-wide DR targets are stricter.

## NFR-EXC-DR-003 — Restore Validation

Restore test must verify:

```text
Result count
Result uniqueness
CourseCompletion cardinality
Approval history integrity
version fields
soft-delete state
cross-context FK/reference integrity
```

---

# 27. Observability NFR

## NFR-EXC-OBS-001 — Metrics

Required metrics:

```text
api_request_duration
api_error_count
authz_denial_count
branch_scope_denial_count
result_write_count
result_correction_count
bulk_result_validation_failure_count
completion_evaluation_count
completion_evaluation_failure_count
completion_dependency_failure_count
approval_transition_count
approval_conflict_count
reevaluation_exception_count
notification_event_emit_failure_count
read_model_staleness_seconds
```

## NFR-EXC-OBS-002 — Tracing

Trace boundaries:

```text
UI/Server Action
→ Module 10 application service
→ repository
→ Course Catalog reader
→ Enrollment reader
→ Attendance reader
→ Finance reader
→ Trainer assignment reader
→ Audit writer
→ Communication event handoff
→ Certificate eligibility handoff
```

## NFR-EXC-OBS-003 — Alerting

Alert on:

```text
spike in Result correction rate
repeated branch authorization failures
repeated completion dependency failures
approval queue aging breach
reevaluation exception backlog
notification handoff failure
read model freshness breach
bulk Result failure spike
```

---

# 28. Abuse Prevention

## 28.1 Enumeration Resistance

Direct entity lookup should avoid confirming existence across unauthorized branches.

## 28.2 Bulk Abuse

Protect bulk Result endpoints with:

```text
payload limit
row count limit
rate limit
request timeout
idempotency
audit
```

## 28.3 Export Abuse

Limit:

```text
concurrent exports per user
date range
row count
file retention
download token lifetime
```

## 28.4 Audit Abuse

Audit endpoints must be separately permissioned and paginated.

---

# 29. Cross-Context Side Effect Controls

## 29.1 Enrollment Synchronization

Module 10 must use application boundary/event.

Prohibited:

```text
direct Enrollment repository update from Module 10 package
```

## 29.2 Certificate Eligibility

Module 10 may emit:

```text
CertificateEligibilityAvailable
CertificateEligibilityChanged
```

It must not:

```text
insert Certificate
revoke Certificate
change Certificate status
```

## 29.3 Communication

Module 10 may emit event/intention.

It must not:

```text
write NotificationLog
manage provider retry
mark email delivered
```

## 29.4 Reporting

Module 10 transactional commands must not update read models as authoritative state.

---

# 30. Security Test Requirements

Mandatory security tests:

```text
IDOR across branches
forged branchId
forged resultStatus
forged completionStatus
forged paymentCompleted
forged attendancePassed
stage-skipping approval
Trainer action for unassigned Batch
consolidated-view mutation attempt
stale version overwrite
duplicate idempotent approval
bulk cross-branch row leakage
audit permission bypass
export unauthorized column
export unauthorized branch
read-model stale approval attempt
```

---

# 31. NFR Summary Table

| Category                | Requirement                         |
| ----------------------- | ----------------------------------- |
| Availability            | 99.9% monthly target                |
| Simple Read API         | P95 < 800 ms                        |
| List/Search API         | P95 < 2 s                           |
| Dashboard               | P95 < 2 s                           |
| Report First Page       | P95 < 3 s                           |
| Single Result Write     | P95 < 1 s                           |
| Bulk Validate 1000 rows | <= 5 s                              |
| Bulk Commit 1000 rows   | <= 10 s                             |
| Completion Evaluation   | P95 < 3 s                           |
| Approval Command        | P95 < 1.5 s                         |
| Max Default Page Size   | 100                                 |
| Bulk Row Limit          | 1000 recommended                    |
| Accessibility           | WCAG 2.1 AA                         |
| DR RPO                  | <= 15 min recommended               |
| DR RTO                  | <= 4 h recommended                  |
| Localization            | English LTR + Arabic RTL            |
| Audit                   | Mandatory for sensitive changes     |
| Delete Policy           | No hard delete in normal operations |

---

# 32. Audit Requirement Matrix

| Action                 |     Audit Required | Old/New Values | Reason Required |         Cross-Context Trace Required |
| ---------------------- | -----------------: | -------------: | --------------: | -----------------------------------: |
| Exam Create            |                Yes |            New |              No |                                   No |
| Exam Update            |                Yes |            Yes |     Conditional |                                   No |
| Exam Reschedule        |                Yes |            Yes |     Recommended |                   Notification trace |
| Exam Cancel            |                Yes |            Yes |             Yes |                   Notification trace |
| Result Record          |                Yes |            New |              No |                                   No |
| Bulk Result Submit     |                Yes |  Summary + IDs |              No |                                   No |
| Result Finalize        |                Yes |          State |              No |                                   No |
| Result Correct         |          Mandatory |            Yes |             Yes |                   Reevaluation trace |
| Completion Evaluate    |                Yes |        Outcome |        Optional |    Attendance/Finance evidence trace |
| Completion Reevaluate  |          Mandatory |            Yes |             Yes |                        Trigger trace |
| Trainer Recommendation |                Yes |       Decision |   Rejection yes |                   Notification trace |
| Coordinator Review     |                Yes |       Decision |   Rejection yes |                   Notification trace |
| Final Approval         |          Mandatory |            Yes |        Optional |  Enrollment sync + eligibility trace |
| Completion Reject      |          Mandatory |            Yes |             Yes |                   Notification trace |
| Exception Resolution   |          Mandatory |            Yes |             Yes | Certificate impact trace if relevant |
| Export                 | Recommended/Policy |  Filters/scope |              No |                                   No |

---

# 33. DDD Security Fit Check

| Security Concern      | Correct Owner             | Module 10 Responsibility        |
| --------------------- | ------------------------- | ------------------------------- |
| Authentication        | IAM                       | Require authenticated principal |
| Permission mapping    | IAM                       | Check permission                |
| Branch access         | IAM                       | Consume policy and enforce      |
| Exam state security   | Module 10                 | Enforce                         |
| Result integrity      | Module 10                 | Enforce                         |
| Completion decision   | Module 10                 | Enforce                         |
| Approval sequence     | Module 10                 | Enforce                         |
| Course rules          | Course Catalog            | Read only                       |
| Attendance truth      | Attendance                | Read only                       |
| Payment validation    | Finance                   | Read only                       |
| Trainer assignment    | Training Delivery/Trainer | Validate through reader         |
| Certificate issue     | Certificate               | No direct mutation              |
| Notification delivery | Communication             | Emit intent/event only          |
| Audit persistence     | Audit & Compliance        | Write through shared convention |
| Reporting projections | Reporting/query layer     | Read-only only                  |

---

# 34. Security Gap Checks

Before implementation, validate:

```text
1. Exact session/authentication mechanism.
2. Existing permission-policy helper.
3. Existing branch-scope helper.
4. Existing system/service principal convention.
5. Existing optimistic-lock helper.
6. Actual Result finalization persistence.
7. Actual CourseCompletion status enum.
8. Actual CompletionApproval status enum.
9. Evidence version/timestamp availability.
10. Existing audit transaction integration.
11. Existing event/outbox mechanism.
12. Existing notification deduplication support.
13. Existing rate-limit middleware.
14. Existing CSRF protection.
15. Existing export storage/download-token mechanism.
16. Existing backup/restore targets.
17. Existing centralized logging redaction.
18. Existing tracing standard.
19. Existing accessibility standard.
20. Existing localization framework.
```

---

# 35. Final Security Boundary

The module must enforce this rule:

```text
Module 10 is responsible for the integrity of:
Exam
Result
CourseCompletion
CompletionApproval

It must:
authenticate,
authorize,
derive branch scope,
validate state,
validate evidence,
protect concurrency,
audit sensitive changes,
trace cross-context side effects.

It must not:
mutate another context's aggregate,
trust the client for academic decisions,
trust reporting projections for commands,
or allow notification/certificate side effects
to obscure the authoritative transaction boundary.
```
