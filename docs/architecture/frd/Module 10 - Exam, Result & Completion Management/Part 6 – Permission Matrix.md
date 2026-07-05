# Part 6 – Permission Matrix

## Module 10 – Exam, Result & Completion Management

## 1. Purpose

This document defines the fine-grained permission model for Module 10 – Exam, Result & Completion Management.

The permission model follows these principles:

1. Authorization is capability-based, not hardcoded by role name.
2. Roles are permission bundles and may be configured dynamically.
3. Menu visibility does not grant action authority.
4. Report access does not grant transactional mutation authority.
5. Branch access is enforced server-side.
6. Consolidated reporting access is distinct from branch mutation access.
7. Global configuration or platform administration permissions must remain rare and explicit.
8. Completion approval stages require separate permissions.
9. Result correction requires a higher-trust permission than ordinary result entry.
10. All sensitive actions require audit evidence.
11. The same permissions apply regardless of whether the action is invoked from Admin Portal or future Trainer/Student portals.
12. UI hiding is for usability only; every action must be re-authorized server-side.

---

# 2. Permission Scope Classification

This document uses the following scope types.

| Scope Code | Scope Name | Meaning |
|---|---|---|
| `B` | Branch-Scoped | Permission applies only to branches in the user's effective branch scope |
| `G` | Global | Permission applies across all branches and should be restricted to trusted platform/institute administrators |
| `C` | Consolidated-Report Only | User may view combined data across permitted branches but receives no mutation rights from this scope |
| `O` | Own-Assignment Scope | Permission applies only to records assigned to or owned by the current actor, such as Trainer-assigned batches |
| `M` | Mixed Scope | Permission can operate under more than one scope depending on IAM policy, such as branch read plus consolidated read |
| `S` | System Authority | Non-human application workflow authority; not assignable to ordinary users |

---

# 3. Business Roles

The matrix uses the following business-role archetypes.

| Role Code | Business Role | Description |
|---|---|---|
| `ROLE-EXC-ADM` | Academic Administrator | Broad academic administration across assigned branches |
| `ROLE-EXC-COORD` | Academic Coordinator | Exam scheduling, result review, completion evaluation, and coordinator-stage approval |
| `ROLE-EXC-TRAINER` | Trainer | Result entry and Trainer Recommendation for assigned batches |
| `ROLE-EXC-BM` | Branch Manager | Branch-level oversight and final completion decision |
| `ROLE-EXC-AUD` | Auditor / Compliance Reader | Read-only access to evidence, approval history, and audit records |
| `ROLE-EXC-RO` | Read-Only Academic User | Operational read access without mutation |
| `ROLE-EXC-EXEC` | Executive / Management Viewer | Consolidated dashboard/report access without transactional authority |
| `ROLE-EXC-IAM` | IAM / Security Administrator | Manages roles and permissions in IAM, not academic data |
| `ROLE-EXC-SYS` | System Workflow | Internal system authority for evaluation/re-evaluation orchestration |

Important:

```text
These are reference role bundles.
The application must authorize by permission, branch scope,
actor eligibility, entity state, and concurrency version.
```

---

# 4. Permission Naming Convention

Recommended permission format:

```text
<resource>.<action>
```

Examples:

```text
exam.read
exam.create
result.record
result.correct
completion.evaluate
completion.final-approve
completion.export
completion.audit.read
```

Menu permissions are separate:

```text
menu.exam-completion.dashboard
menu.exam-completion.exams
menu.exam-completion.results
menu.exam-completion.completion
menu.exam-completion.approvals
menu.exam-completion.reevaluation
menu.exam-completion.exports
```

Report permissions are separate:

```text
report.exam-register.read
report.result-register.read
report.missing-results.read
report.completion-evaluation.read
report.completion-approval.read
report.reevaluation-exception.read
report.exam-completion.consolidated
```

---

# 5. Menu-Level Permission Matrix

Legend:

```text
✓ = Granted in default role bundle
△ = Optional / configurable
— = Not granted by default
```

| Menu Permission | Scope | Academic Admin | Academic Coordinator | Trainer | Branch Manager | Auditor | Read-Only Academic | Executive Viewer | IAM Admin | System Workflow |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `menu.exam-completion.dashboard` | M | ✓ | ✓ | △ | ✓ | △ | △ | ✓ | — | — |
| `menu.exam-completion.exams` | B/M | ✓ | ✓ | △ | △ | ✓ | ✓ | — | — | — |
| `menu.exam-completion.results` | B/O/M | ✓ | ✓ | ✓ | △ | ✓ | ✓ | — | — | — |
| `menu.exam-completion.completion` | B/M | ✓ | ✓ | △ | ✓ | ✓ | ✓ | △ | — | — |
| `menu.exam-completion.approvals` | B/O | ✓ | ✓ | ✓ | ✓ | ✓ | △ | — | — | — |
| `menu.exam-completion.reevaluation` | B/M | ✓ | △ | — | △ | ✓ | △ | — | — | — |
| `menu.exam-completion.exports` | B/C/M | ✓ | △ | — | ✓ | ✓ | △ | ✓ | — | — |
| `menu.exam-completion.audit` | B/M | ✓ | △ | — | △ | ✓ | — | — | — | — |

## Menu Rules

1. Menu permission only controls visibility and route discoverability.
2. The server must still authorize every underlying query and command.
3. A user may hold action permission without direct menu visibility if a workflow deep-link is intentionally supported.
4. Consolidated report users may see dashboard/export menus without transactional menus.

---

# 6. Action-Level Permission Catalog

## 6.1 Exam Permissions

| Permission | Scope | Purpose |
|---|---|---|
| `exam.read` | B/M | Read Exam list and detail within permitted branches |
| `exam.create` | B | Create Exam for authorized Batch branch |
| `exam.update` | B | Update mutable Exam fields |
| `exam.schedule` | B | Schedule or reschedule Exam |
| `exam.activate` | B | Open Exam for Result entry |
| `exam.close` | B | Close Exam |
| `exam.cancel` | B | Cancel Exam with required reason |
| `exam.archive` | B/G | Soft archive or deactivate Exam under administrative policy |

## 6.2 Result Permissions

| Permission | Scope | Purpose |
|---|---|---|
| `result.read` | B/O/M | Read Result data within scope |
| `result.record` | B/O | Record or edit non-finalized Result |
| `result.bulk-record` | B/O | Submit validated Result batch |
| `result.finalize` | B | Finalize academic Result evidence |
| `result.correct` | B | Restricted correction of finalized Result |
| `result.audit.read` | B/M | Read Result correction/finalization audit history |

## 6.3 Completion Permissions

| Permission | Scope | Purpose |
|---|---|---|
| `completion.read` | B/M | Read completion record and evidence summary |
| `completion.evaluate` | B/S | Run initial completion evaluation |
| `completion.reevaluate` | B/S | Re-evaluate after authoritative evidence change |
| `completion.recommend` | O/B | Trainer Recommendation stage |
| `completion.coordinator-review` | B | Coordinator Review stage |
| `completion.final-approve` | B | Final completion approval |
| `completion.reject` | B/O | Reject at permitted approval stage |
| `completion.audit.read` | B/M | Read completion/approval audit trail |
| `completion.exception.resolve` | B/G | Resolve controlled re-evaluation exception where policy allows |

## 6.4 Export / Reporting Action Permissions

| Permission | Scope | Purpose |
|---|---|---|
| `completion.export` | B/C/M | Export authorized Module 10 data |
| `exam.export` | B/C/M | Export Exam register data |
| `result.export` | B/C/M | Export Result register data |
| `completion.report.read` | B/C/M | Read completion operational reports |
| `exam-completion.dashboard.read` | B/C/M | Read Module 10 dashboard |

---

# 7. Action-Level Business Role Matrix

Legend:

```text
✓ = Granted by default
△ = Optional / configurable
O = Own-assignment only
C = Consolidated read/report only
— = Not granted
S = System-only authority
```

## 7.1 Exam Actions

| Permission | Scope | Academic Admin | Academic Coordinator | Trainer | Branch Manager | Auditor | Read-Only Academic | Executive Viewer | IAM Admin | System Workflow |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `exam.read` | B/M | ✓ | ✓ | O/△ | ✓ | ✓ | ✓ | C/△ | — | S/△ |
| `exam.create` | B | ✓ | ✓ | — | △ | — | — | — | — | — |
| `exam.update` | B | ✓ | ✓ | — | △ | — | — | — | — | — |
| `exam.schedule` | B | ✓ | ✓ | — | △ | — | — | — | — | — |
| `exam.activate` | B | ✓ | ✓ | — | △ | — | — | — | — | — |
| `exam.close` | B | ✓ | ✓ | — | △ | — | — | — | — | — |
| `exam.cancel` | B | ✓ | ✓ | — | △ | — | — | — | — | — |
| `exam.archive` | B/G | ✓ | △ | — | △ | — | — | — | — | — |

## 7.2 Result Actions

| Permission | Scope | Academic Admin | Academic Coordinator | Trainer | Branch Manager | Auditor | Read-Only Academic | Executive Viewer | IAM Admin | System Workflow |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `result.read` | B/O/M | ✓ | ✓ | O | ✓ | ✓ | ✓ | C/△ | — | S/△ |
| `result.record` | B/O | ✓ | ✓ | O | — | — | — | — | — | — |
| `result.bulk-record` | B/O | ✓ | ✓ | O | — | — | — | — | — | — |
| `result.finalize` | B | ✓ | ✓ | △ | — | — | — | — | — | — |
| `result.correct` | B | ✓ | △ | — | — | — | — | — | — | — |
| `result.audit.read` | B/M | ✓ | △ | — | △ | ✓ | — | — | — | — |

## 7.3 Completion Actions

| Permission | Scope | Academic Admin | Academic Coordinator | Trainer | Branch Manager | Auditor | Read-Only Academic | Executive Viewer | IAM Admin | System Workflow |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `completion.read` | B/M | ✓ | ✓ | O/△ | ✓ | ✓ | ✓ | C/△ | — | S |
| `completion.evaluate` | B/S | ✓ | ✓ | — | △ | — | — | — | — | S |
| `completion.reevaluate` | B/S | ✓ | △ | — | △ | — | — | — | — | S |
| `completion.recommend` | O/B | △ | — | O | — | — | — | — | — | — |
| `completion.coordinator-review` | B | ✓ | ✓ | — | — | — | — | — | — | — |
| `completion.final-approve` | B | △ | — | — | ✓ | — | — | — | — | — |
| `completion.reject` | B/O | ✓ | ✓ | O | ✓ | — | — | — | — | — |
| `completion.audit.read` | B/M | ✓ | △ | — | △ | ✓ | — | — | — | — |
| `completion.exception.resolve` | B/G | ✓ | △ | — | △ | — | — | — | — | S/△ |

---

# 8. Approval Stage Permission Matrix

## 8.1 Trainer Recommendation

| Action | Permission | Scope | Default Business Role |
|---|---|---|---|
| View pending recommendation | `completion.read` + `completion.recommend` | O | Trainer |
| Recommend | `completion.recommend` | O | Trainer |
| Do not recommend | `completion.recommend` | O | Trainer |
| View history | `completion.read` | O/B | Trainer, Coordinator, Admin |

Server guards:

```text
Authenticated user maps to active TrainerProfile
AND Trainer assigned or authorized for Batch
AND branch scope valid
AND CourseCompletion state = Awaiting Trainer Recommendation
AND evidence not stale
```

## 8.2 Academic Coordinator Review

| Action | Permission | Scope | Default Business Role |
|---|---|---|---|
| View queue | `completion.coordinator-review` | B | Academic Coordinator |
| Approve review | `completion.coordinator-review` | B | Academic Coordinator |
| Reject review | `completion.coordinator-review` or `completion.reject` | B | Academic Coordinator |
| View audit | `completion.audit.read` | B | Academic Admin, Auditor |

Server guards:

```text
Trainer Recommendation approved
AND current state = Awaiting Coordinator Review
AND branch mutation scope valid
AND evidence not stale
```

## 8.3 Final Approval

| Action | Permission | Scope | Default Business Role |
|---|---|---|---|
| View final approval queue | `completion.final-approve` or read capability | B | Branch Manager |
| Final approve | `completion.final-approve` | B | Branch Manager |
| Final reject | `completion.reject` | B | Branch Manager |
| View full approval history | `completion.read` | B | Branch Manager |

Server guards:

```text
Coordinator Review approved
AND current state = Awaiting Final Approval
AND branch mutation scope valid
AND evidence remains current
```

---

# 9. Menu Permission Matrix by Route

| Route / Menu | Menu Permission | Additional Data Permission |
|---|---|---|
| `/admin/academics/exams-completion` | `menu.exam-completion.dashboard` | `exam-completion.dashboard.read` |
| `/admin/academics/exams-completion/exams` | `menu.exam-completion.exams` | `exam.read` |
| `/admin/academics/exams-completion/results` | `menu.exam-completion.results` | `result.read` |
| `/admin/academics/exams-completion/completion` | `menu.exam-completion.completion` | `completion.read` |
| `/admin/academics/exams-completion/approvals/trainer` | `menu.exam-completion.approvals` | `completion.recommend` |
| `/admin/academics/exams-completion/approvals/coordinator` | `menu.exam-completion.approvals` | `completion.coordinator-review` |
| `/admin/academics/exams-completion/approvals/final` | `menu.exam-completion.approvals` | `completion.final-approve` or approved read capability |
| `/admin/academics/exams-completion/reevaluation` | `menu.exam-completion.reevaluation` | `completion.reevaluate` or approved read capability |
| `/admin/academics/exams-completion/exports` | `menu.exam-completion.exports` | corresponding export permission |
| audit drawer/deep-link | `menu.exam-completion.audit` or deep-link access policy | `completion.audit.read` / `result.audit.read` |

---

# 10. Report-Level Permission Catalog

## 10.1 Operational Reports

| Report Permission | Scope | Report |
|---|---|---|
| `report.exam-register.read` | B/C/M | Exam Register |
| `report.result-register.read` | B/C/M | Result Register |
| `report.missing-results.read` | B/C/M | Missing Results Report |
| `report.result-finalization.read` | B/C/M | Result Finalization Status |
| `report.completion-evaluation.read` | B/C/M | Completion Evaluation Report |
| `report.completion-approval.read` | B/C/M | Completion Approval Report |
| `report.reevaluation-exception.read` | B/C/M | Re-evaluation Exception Report |
| `report.trainer-recommendation.read` | B/C/M | Trainer Recommendation Status |
| `report.exam-completion.audit.read` | B/M | Academic Audit Report |

## 10.2 Consolidated Reporting Permission

| Permission | Scope | Meaning |
|---|---|---|
| `report.exam-completion.consolidated` | C | View combined data across branches allowed by IAM consolidated-read policy |

Important:

```text
report.exam-completion.consolidated
does not grant
exam.update
result.record
completion.evaluate
completion.final-approve
```

---

# 11. Report-Level Role Matrix

Legend:

```text
✓ = Default
△ = Optional
C = Consolidated report access
— = Not granted
```

| Report Permission | Academic Admin | Academic Coordinator | Trainer | Branch Manager | Auditor | Read-Only Academic | Executive Viewer | IAM Admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `report.exam-register.read` | ✓ | ✓ | △ | ✓ | ✓ | ✓ | C/△ | — |
| `report.result-register.read` | ✓ | ✓ | O/△ | ✓ | ✓ | ✓ | C/△ | — |
| `report.missing-results.read` | ✓ | ✓ | O/△ | ✓ | ✓ | △ | C/△ | — |
| `report.result-finalization.read` | ✓ | ✓ | △ | ✓ | ✓ | △ | C/△ | — |
| `report.completion-evaluation.read` | ✓ | ✓ | O/△ | ✓ | ✓ | ✓ | C | — |
| `report.completion-approval.read` | ✓ | ✓ | O/△ | ✓ | ✓ | ✓ | C | — |
| `report.reevaluation-exception.read` | ✓ | △ | — | △ | ✓ | △ | C/△ | — |
| `report.trainer-recommendation.read` | ✓ | ✓ | O | ✓ | ✓ | △ | C/△ | — |
| `report.exam-completion.audit.read` | ✓ | △ | — | △ | ✓ | — | — | — |
| `report.exam-completion.consolidated` | △ | △ | — | △ | △ | — | ✓ | — |

---

# 12. Dashboard Permission Matrix

## 12.1 Dashboard Widgets

| Widget | Permission | Scope |
|---|---|---|
| Exams Awaiting Activation | `dashboard.exam-completion.exams-pending` | B/C |
| Missing Results | `dashboard.exam-completion.missing-results` | B/C |
| Results Awaiting Finalization | `dashboard.exam-completion.results-finalization` | B/C |
| Pending Completion Evaluations | `dashboard.exam-completion.evaluation-pending` | B/C |
| Trainer Recommendations Pending | `dashboard.exam-completion.trainer-pending` | B/C |
| Coordinator Reviews Pending | `dashboard.exam-completion.coordinator-pending` | B/C |
| Final Approvals Pending | `dashboard.exam-completion.final-approval-pending` | B/C |
| Re-evaluation Exceptions | `dashboard.exam-completion.reevaluation-exceptions` | B/C |
| Completion Rate Trend | `dashboard.exam-completion.completion-rate` | B/C |
| Exam Pass Rate | `dashboard.exam-completion.pass-rate` | B/C |

## 12.2 Widget Role Matrix

| Widget Permission | Academic Admin | Coordinator | Trainer | Branch Manager | Auditor | Executive Viewer |
|---|---:|---:|---:|---:|---:|---:|
| Exams Pending | ✓ | ✓ | △ | ✓ | △ | C |
| Missing Results | ✓ | ✓ | O | ✓ | △ | C |
| Results Finalization | ✓ | ✓ | △ | ✓ | △ | C |
| Evaluation Pending | ✓ | ✓ | — | ✓ | △ | C |
| Trainer Pending | ✓ | ✓ | O | ✓ | △ | C |
| Coordinator Pending | ✓ | ✓ | — | ✓ | △ | C |
| Final Approval Pending | ✓ | △ | — | ✓ | △ | C |
| Re-evaluation Exceptions | ✓ | △ | — | △ | ✓ | C |
| Completion Rate | ✓ | ✓ | △ | ✓ | ✓ | C |
| Pass Rate | ✓ | ✓ | △ | ✓ | ✓ | C |

---

# 13. Branch Scope Rules

## 13.1 Branch-Scoped Permissions

Permissions marked `B` require entity-derived branch validation.

Examples:

```text
exam.create
exam.update
result.record
result.finalize
result.correct
completion.evaluate
completion.reevaluate
completion.coordinator-review
completion.final-approve
completion.reject
```

Authorization pattern:

```text
permission granted
AND entityBranchId in effectiveMutationBranches
AND entityState allows action
AND domain eligibility passes
AND expectedVersion matches
```

## 13.2 Own-Assignment Permissions

Trainer permissions commonly use `O`.

Example:

```text
completion.recommend
```

Requires:

```text
user → Person → TrainerProfile
AND TrainerProfile assigned/authorized to Batch
AND Batch branch in allowed branch scope
```

The existence of `completion.recommend` alone is insufficient.

## 13.3 Consolidated-Report Permissions

Consolidated report scope:

```text
C
```

Allows:

- combined counts;
- combined charts;
- combined read-only tables;
- authorized exports across permitted branch set.

Does not allow:

- exam creation;
- result mutation;
- completion evaluation;
- approval actions;
- correction.

## 13.4 Global Permissions

Global scope should be rare.

Potential global capabilities:

```text
exam.archive
completion.exception.resolve
report.exam-completion.consolidated
```

Even where global permission exists, sensitive mutation must remain auditable.

---

# 14. Permission-to-API Mapping

## 14.1 Exam APIs

| API | Permission | Scope |
|---|---|---|
| Search Exams | `exam.read` | B/M |
| Create Exam | `exam.create` | B |
| Get Exam Detail | `exam.read` | B/M |
| Update Exam | `exam.update` | B |
| Schedule Exam | `exam.schedule` | B |
| Activate Exam | `exam.activate` | B |
| Close Exam | `exam.close` | B |
| Cancel Exam | `exam.cancel` | B |
| Archive Exam | `exam.archive` | B/G |

## 14.2 Result APIs

| API | Permission | Scope |
|---|---|---|
| Result Roster | `result.read` | B/O |
| Record Result | `result.record` | B/O |
| Validate Bulk Results | `result.bulk-record` | B/O |
| Submit Bulk Results | `result.bulk-record` | B/O |
| Get Result Detail | `result.read` | B/O/M |
| Finalize Result | `result.finalize` | B |
| Finalize Result Set | `result.finalize` | B |
| Correct Result | `result.correct` | B |
| Read Result Audit | `result.audit.read` | B/M |

## 14.3 Completion APIs

| API | Permission | Scope |
|---|---|---|
| Search Completion | `completion.read` | B/M |
| Completion Detail | `completion.read` | B/M |
| Evaluation Evidence | `completion.read` or `completion.evaluate` | B |
| Evaluate | `completion.evaluate` | B/S |
| Reevaluate | `completion.reevaluate` | B/S |
| Approval Timeline | `completion.read` | B/M |
| Trainer Recommend | `completion.recommend` | O/B |
| Trainer Reject | `completion.recommend` | O/B |
| Coordinator Approve | `completion.coordinator-review` | B |
| Coordinator Reject | `completion.coordinator-review` or `completion.reject` | B |
| Final Approve | `completion.final-approve` | B |
| Final Reject | `completion.reject` | B |

## 14.4 Queue and Export APIs

| API | Permission | Scope |
|---|---|---|
| Unified Work Queue | Any relevant action/read permission | B/M |
| Missing Results Queue | `result.read` or `result.record` | B/O |
| Evaluation Queue | `completion.evaluate` | B |
| Trainer Queue | `completion.recommend` | O |
| Coordinator Queue | `completion.coordinator-review` | B |
| Final Approval Queue | `completion.final-approve` or read capability | B |
| Reevaluation Queue | `completion.reevaluate` | B |
| Academic Search | `exam.read`, `result.read`, or `completion.read` | B/M |
| Audit Timeline | `completion.audit.read` / `result.audit.read` | B/M |
| Generate Export | entity export permission | B/C/M |

---

# 15. Permission-to-Screen Mapping

| Screen Group | Minimum Menu Permission | Minimum Data Permission |
|---|---|---|
| Module Dashboard | `menu.exam-completion.dashboard` | `exam-completion.dashboard.read` |
| Exam List/Detail | `menu.exam-completion.exams` | `exam.read` |
| Create Exam | `menu.exam-completion.exams` | `exam.create` |
| Result Entry | `menu.exam-completion.results` | `result.record` |
| Bulk Result Entry | `menu.exam-completion.results` | `result.bulk-record` |
| Finalization | `menu.exam-completion.results` | `result.finalize` |
| Result Correction | no separate menu required | `result.correct` |
| Completion Evaluation | `menu.exam-completion.completion` | `completion.evaluate` |
| Trainer Recommendation | `menu.exam-completion.approvals` | `completion.recommend` |
| Coordinator Review | `menu.exam-completion.approvals` | `completion.coordinator-review` |
| Final Approval | `menu.exam-completion.approvals` | `completion.final-approve` |
| Reevaluation | `menu.exam-completion.reevaluation` | `completion.reevaluate` |
| Exports | `menu.exam-completion.exports` | corresponding report/export permission |
| Audit Timeline | `menu.exam-completion.audit` or authorized deep-link | `completion.audit.read` / `result.audit.read` |

---

# 16. Segregation of Duties Rules

## 16.1 Result Recording vs Result Correction

Default policy:

```text
result.record
does not imply
result.correct
```

`result.correct` must be separately granted.

## 16.2 Coordinator Review vs Final Approval

Default policy:

```text
completion.coordinator-review
does not imply
completion.final-approve
```

## 16.3 Trainer Recommendation vs Final Approval

A Trainer must not receive final approval merely because the Trainer can recommend.

## 16.4 Consolidated View vs Mutation

```text
report.exam-completion.consolidated
does not imply
any mutation permission
```

## 16.5 IAM Administration vs Academic Data

IAM administrator may configure:

```text
Role
Permission
RolePermission
UserRole
UserBranchAccess
```

but does not automatically receive:

```text
exam.read
result.read
completion.read
```

unless explicitly assigned.

---

# 17. Default Role Bundle Recommendations

## 17.1 Academic Administrator

Recommended default bundle:

```text
Menu:
menu.exam-completion.dashboard
menu.exam-completion.exams
menu.exam-completion.results
menu.exam-completion.completion
menu.exam-completion.approvals
menu.exam-completion.reevaluation
menu.exam-completion.exports
menu.exam-completion.audit

Actions:
exam.*
result.read
result.record
result.bulk-record
result.finalize
result.correct
result.audit.read
completion.read
completion.evaluate
completion.reevaluate
completion.coordinator-review
completion.reject
completion.audit.read
completion.exception.resolve

Reports:
all operational Module 10 reports
```

`completion.final-approve` should be optional, not automatically included, when segregation of duties is enforced.

## 17.2 Academic Coordinator

Recommended bundle:

```text
Exam management
Result read/record/bulk/finalize
Completion read/evaluate
Coordinator Review
Relevant operational reports
```

Optional:

```text
result.correct
completion.reevaluate
completion.audit.read
```

## 17.3 Trainer

Recommended bundle:

```text
menu.exam-completion.results
menu.exam-completion.approvals

result.read [own assignment]
result.record [own assignment]
result.bulk-record [own assignment]
completion.read [own assignment]
completion.recommend [own assignment]

own-assignment operational reports only
```

## 17.4 Branch Manager

Recommended bundle:

```text
dashboard read
exam/result/completion read
completion.final-approve
completion.reject
branch reports
branch exports
```

Optional:

```text
exam management
completion.reevaluate
completion.audit.read
```

## 17.5 Auditor

Recommended bundle:

```text
read-only Exam
read-only Result
read-only Completion
approval history read
audit read
audit/operational reports
no mutations
```

## 17.6 Executive Viewer

Recommended bundle:

```text
dashboard read
report-level access
consolidated reporting where explicitly granted
no transactional mutation
```

---

# 18. Permission Evaluation Order

Every server request should evaluate permissions in this order:

```text
1. Authenticate session
2. Resolve User
3. Resolve effective permissions
4. Resolve effective read/mutation branch set
5. Load target entity
6. Derive entity branch from authoritative relationship
7. Check permission scope
8. Check actor-specific eligibility
9. Check entity state
10. Check domain preconditions
11. Check optimistic version
12. Execute command/query
13. Write audit evidence when required
```

---

# 19. Permission Failure Behavior

## 19.1 Missing Authentication

Return:

```text
401 UNAUTHENTICATED
```

## 19.2 Missing Permission

Return:

```text
403 FORBIDDEN
```

## 19.3 Cross-Branch Access

For sensitive direct lookup:

```text
404 NOT_FOUND
```

may be used to avoid confirming entity existence, according to platform policy.

## 19.4 Read-Only Consolidated Scope

When user can read but not mutate:

```text
403 BRANCH_MUTATION_FORBIDDEN
```

## 19.5 Trainer Not Assigned

Return:

```text
403 TRAINER_NOT_AUTHORIZED_FOR_BATCH
```

without disclosing unrelated assignment details.

---

# 20. Audit Requirements by Permission

| Permission | Audit Required | Minimum Audit Data |
|---|---:|---|
| `exam.create` | Yes | actor, Exam ID, Course, Batch, timestamp |
| `exam.update` | Yes | old/new values |
| `exam.schedule` | Yes | old/new date, reason if required |
| `exam.cancel` | Yes | reason |
| `exam.archive` | Yes | reason, old/new active state |
| `result.record` | Yes | actor, Result ID, marks/status |
| `result.bulk-record` | Yes | batch reference, actor, count, result IDs |
| `result.finalize` | Yes | actor, finalized scope |
| `result.correct` | Mandatory high-detail | old/new marks, old/new status, reason |
| `completion.evaluate` | Yes | rule reference/version where available, evidence outcome |
| `completion.reevaluate` | Mandatory | trigger type/reference, before/after outcome |
| `completion.recommend` | Yes | Trainer, decision, remarks |
| `completion.coordinator-review` | Yes | Coordinator, decision, remarks |
| `completion.final-approve` | Mandatory | approver, timestamp, outcome |
| `completion.reject` | Mandatory | actor, stage, reason |
| `completion.export` | Policy-dependent but recommended | actor, filters, format, branch scope |
| `completion.audit.read` | Read audit optional according to security policy | actor, target entity |

---

# 21. Consolidated Reporting Rules

A user with:

```text
report.exam-completion.consolidated
```

may see combined data across branches allowed by IAM.

Example:

```text
Head Office User
Assigned Branches:
- Muscat
- Sohar
- Salalah

canViewConsolidated = true
```

May view:

```text
combined exam count
combined pass rate
combined completion rate
combined pending approvals
combined export
```

May not mutate unless separate branch-specific permissions and mutation access exist.

Example:

```text
Visible:
Muscat + Sohar + Salalah

Mutable:
Muscat only
```

The API must enforce this difference.

---

# 22. Global Permission Rules

Global permissions should be granted only through controlled administrative policy.

Potential use cases:

```text
Institute-wide archival
Institute-wide exception resolution
Institute-wide reporting
Central academic audit
```

Global permission must not bypass:

```text
entity state validation
domain invariants
audit logging
optimistic concurrency
```

---

# 23. Dynamic RBAC Requirements

The IAM context must support:

```text
Role
Permission
UserRole
RolePermission
UserBranchAccess
```

Module 10 must not:

- hardcode role names;
- infer permissions from job title text;
- duplicate Role/Permission tables;
- persist permission decisions in Module 10 entities;
- embed branch scope lists inside Result or CourseCompletion.

Recommended policy evaluation input:

```text
userId
permissionCode
resourceType
resourceId
derivedBranchId
requestedAction
currentEntityState
actorDomainIdentity
```

---

# 24. Ownership Check

| Permission Area | Owning Context | Module 10 Responsibility |
|---|---|---|
| User authentication | IAM | Consume authenticated principal |
| Role definition | IAM | No ownership |
| Permission definition | IAM | Register/use permission codes |
| Role-Permission mapping | IAM | No ownership |
| User-Branch access | IAM | Consume policy result |
| Exam command authorization | Module 10 + IAM policy | Enforce permission and branch scope |
| Result actor eligibility | Module 10 + Training Delivery/Trainer context | Validate assignment |
| Completion approval stage | Module 10 | Enforce workflow state and permission |
| Audit persistence | Audit & Compliance | Emit/write through shared convention |
| Report permission | IAM / Reporting policy | Apply permission and branch scope |
| Dashboard permission | IAM / Reporting | Apply widget-level permission |

---

# 25. Permission Gap Checks

Before implementation, validate:

```text
1. Whether the repository already has menu permissions.
2. Whether report permissions are separate from action permissions.
3. Exact permission code naming conventions.
4. Whether archive uses a generic entity permission or module-specific permission.
5. Whether result audit and completion audit use one shared permission.
6. Whether rejection uses one generic permission or stage-specific permissions.
7. Whether consolidated report permission is generic or module-specific.
8. Whether dashboard widgets use individual permission codes.
9. Whether Trainer own-assignment scope is implemented in IAM or domain policy.
10. Whether system workflow authority is represented as service principal, job identity, or internal application authorization.
```

---

# 26. Recommended Minimum Permission Set

Minimum action permissions:

```text
exam.read
exam.create
exam.update
exam.schedule
exam.activate
exam.close
exam.cancel
exam.archive

result.read
result.record
result.bulk-record
result.finalize
result.correct
result.audit.read

completion.read
completion.evaluate
completion.reevaluate
completion.recommend
completion.coordinator-review
completion.final-approve
completion.reject
completion.audit.read
completion.exception.resolve

exam.export
result.export
completion.export
completion.report.read
exam-completion.dashboard.read
```

Minimum menu permissions:

```text
menu.exam-completion.dashboard
menu.exam-completion.exams
menu.exam-completion.results
menu.exam-completion.completion
menu.exam-completion.approvals
menu.exam-completion.reevaluation
menu.exam-completion.exports
menu.exam-completion.audit
```

Minimum report permissions:

```text
report.exam-register.read
report.result-register.read
report.missing-results.read
report.result-finalization.read
report.completion-evaluation.read
report.completion-approval.read
report.reevaluation-exception.read
report.trainer-recommendation.read
report.exam-completion.audit.read
report.exam-completion.consolidated
```

---

# 27. Final Authorization Rule

For every request:

```text
ALLOW only when:

Authenticated
AND Permission Granted
AND Scope Permits Access
AND Entity Branch Is Authorized
AND Actor Domain Eligibility Passes
AND Entity State Allows Action
AND Domain Preconditions Pass
AND Version Matches

Otherwise:
DENY
```

The most important distinction in this module is:

```text
Menu visibility
≠ Action permission
≠ Report permission
≠ Branch mutation access
≠ Consolidated reporting access
```

These controls must remain independent and composable.
