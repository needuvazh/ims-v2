# Part 6 – Permission Matrix

## Module 08 – Attendance Management

| Attribute              | Value                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Product                | ASTI Integrated Institute Management System (IMS)                                          |
| Module                 | Module 08 – Attendance Management                                                          |
| Module Code            | `M08-ATT`                                                                                  |
| Permission Model       | Dynamic RBAC with fine-grained permission codes                                            |
| Authorization Boundary | Server-side permission + branch scope + actor-specific scope                               |
| Role Rule              | Roles are business bundles only; services must authorize by permission code, not role name |

---

## 1. Permission Model Principles

1. Attendance permissions are owned by Identity & Access Management and consumed by the Attendance context.
2. UI hiding is required for usability but never replaces server-side authorization.
3. Branch scope is mandatory for every operational attendance read and write.
4. Trainer permissions require both permission code and assignment to the target batch/session.
5. Student permissions are self-service only and cannot mutate attendance.
6. Corporate Coordinator access is Phase 2 and must be limited to corporate participants attached to the coordinator's corporate account.
7. Consolidated reporting requires both branch access and `attendance.consolidated.read`.
8. Audit visibility requires separate audit permissions.
9. Global alert rule configuration requires global configuration permissions.
10. Correction approval must enforce segregation of duties.

---

## 2. Role Definitions

| Business Role               | User Type          | Scope                                                                                |
| --------------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| Super Admin                 | Internal           | Full configured attendance access across assigned branches and global configuration. |
| Institute Admin             | Internal           | Institute-level oversight across assigned branches and child branches where allowed. |
| Branch Admin                | Internal           | Branch-level attendance administration.                                              |
| Academic Coordinator        | Internal           | Academic review, correction approval, low attendance monitoring.                     |
| Training Coordinator        | Internal           | Batch/session operations, roster sync, marking support, submission follow-up.        |
| Trainer                     | Internal / Faculty | Assigned session and assigned batch attendance marking and submission.               |
| Counselor                   | Internal           | Read-only low-attendance follow-up visibility.                                       |
| Accountant                  | Internal           | Read-only attendance eligibility visibility for finance/completion coordination.     |
| Certificate Officer         | Internal           | Read-only attendance summary for certificate eligibility checks.                     |
| Management / CEO / Chairman | Internal           | Dashboard and report-only access.                                                    |
| Student                     | External           | Own attendance summary, history, and alerts.                                         |
| Corporate Coordinator       | External Phase 2   | Corporate participant attendance summaries within corporate account.                 |
| Audit Officer               | Internal           | Attendance audit trail read/export.                                                  |
| System Job                  | System             | Summary recalculation, alert detection, and notification request creation.           |

---

## 3. Menu-Level Permissions

| Permission Code                      | Menu / Screen               | Super Admin | Institute Admin | Branch Admin | Academic Coordinator | Training Coordinator |      Trainer | Counselor | Accountant | Certificate Officer | Management | Student | Corporate Coordinator | Audit Officer |
| ------------------------------------ | --------------------------- | ----------: | --------------: | -----------: | -------------------: | -------------------: | -----------: | --------: | ---------: | ------------------: | ---------: | ------: | --------------------: | ------------: |
| `attendance.menu.root`               | Attendance root             |         Yes |             Yes |          Yes |                  Yes |                  Yes |          Yes |       Yes |       Read |                Read |       Read |      No |                  Read |           Yes |
| `attendance.menu.sessions`           | Attendance sessions         |         Yes |             Yes |          Yes |                  Yes |                  Yes |     Assigned |      Read |       Read |                Read |       Read |      No |       Corporate Scope |           Yes |
| `attendance.menu.marking`            | Mark attendance workspace   |         Yes |             Yes |          Yes |                  Yes |                  Yes |     Assigned |        No |         No |                  No |         No |      No |                    No |            No |
| `attendance.menu.corrections`        | Corrections                 |         Yes |             Yes |          Yes |                  Yes |                  Yes | Own/Assigned |      Read |         No |                Read |         No |      No |                    No |           Yes |
| `attendance.menu.summaries`          | Summaries                   |         Yes |             Yes |          Yes |                  Yes |                  Yes |     Assigned |      Read |       Read |                Read |       Read |     Own |       Corporate Scope |           Yes |
| `attendance.menu.alerts`             | Low attendance alerts       |         Yes |             Yes |          Yes |                  Yes |                  Yes |     Assigned |      Read |         No |                Read |       Read |     Own |       Corporate Scope |           Yes |
| `attendance.menu.alertRules`         | Alert rules                 |         Yes |             Yes |       Branch |               Branch |                   No |           No |        No |         No |                  No |         No |      No |                    No |          Read |
| `attendance.menu.reports`            | Attendance reports          |         Yes |             Yes |          Yes |                  Yes |                  Yes |     Assigned |      Read |       Read |                Read |        Yes |     Own |       Corporate Scope |           Yes |
| `attendance.menu.audit`              | Attendance audit            |         Yes |             Yes |          Yes |                 Read |                   No |           No |        No |         No |                  No |       Read |      No |                    No |           Yes |
| `attendance.menu.studentSelfService` | Student portal attendance   |          No |              No |           No |                   No |                   No |           No |        No |         No |                  No |         No |     Yes |                    No |            No |
| `attendance.menu.corporatePortal`    | Corporate attendance portal |          No |              No |           No |                   No |                   No |           No |        No |         No |                  No |         No |      No |               Phase 2 |            No |

---

## 4. Action-Level Permissions

### 4.1 Attendance Session Actions

| Permission Code                         | Capability                               | Super Admin | Institute Admin | Branch Admin | Academic Coordinator | Training Coordinator |  Trainer | Counselor | Accountant | Certificate Officer | Management | Student | Corporate Coordinator | System Job | Audit Officer |
| --------------------------------------- | ---------------------------------------- | ----------: | --------------: | -----------: | -------------------: | -------------------: | -------: | --------: | ---------: | ------------------: | ---------: | ------: | --------------------: | ---------: | ------------: |
| `attendance.session.read`               | Read sessions                            |         Yes |             Yes |          Yes |                  Yes |                  Yes | Assigned |      Read |       Read |                Read |       Read |      No |       Corporate Scope |        Yes |           Yes |
| `attendance.session.create`             | Create session                           |         Yes |             Yes |          Yes |                  Yes |                  Yes | Assigned |        No |         No |                  No |         No |      No |                    No |        Yes |            No |
| `attendance.session.update`             | Update draft metadata                    |         Yes |             Yes |          Yes |                  Yes |                  Yes | Assigned |        No |         No |                  No |         No |      No |                    No |         No |            No |
| `attendance.session.roster.sync`        | Sync roster                              |         Yes |             Yes |          Yes |                  Yes |                  Yes | Assigned |        No |         No |                  No |         No |      No |                    No |        Yes |            No |
| `attendance.session.submit`             | Submit official attendance               |         Yes |             Yes |          Yes |                  Yes |                  Yes | Assigned |        No |         No |                  No |         No |      No |                    No |        Yes |            No |
| `attendance.session.submitWithUnmarked` | Submit with unmarked override            |         Yes |             Yes |          Yes |                  Yes |          Conditional |       No |        No |         No |                  No |         No |      No |                    No |         No |            No |
| `attendance.session.return`             | Return for correction                    |         Yes |             Yes |          Yes |                  Yes |                   No |       No |        No |         No |                  No |         No |      No |                    No |         No |            No |
| `attendance.session.approve`            | Approve attendance session               |         Yes |             Yes |          Yes |                  Yes |                   No |       No |        No |         No |                  No |         No |      No |                    No |         No |            No |
| `attendance.session.cancel`             | Cancel attendance session                |         Yes |             Yes |          Yes |                  Yes |          Conditional |       No |        No |         No |                  No |         No |      No |                    No |         No |            No |
| `attendance.session.lock`               | Lock official session                    |         Yes |             Yes |          Yes |                  Yes |                   No |       No |        No |         No |                  No |         No |      No |                    No |        Yes |            No |
| `attendance.session.unlock`             | Unlock locked session                    |         Yes |     Conditional |           No |                   No |                   No |       No |        No |         No |                  No |         No |      No |                    No |         No |            No |
| `attendance.session.overrideDate`       | Override source session date             |         Yes |             Yes |          Yes |          Conditional |                   No |       No |        No |         No |                  No |         No |      No |                    No |         No |            No |
| `attendance.session.adminOverride`      | Override trainer assignment restrictions |         Yes |             Yes |          Yes |          Conditional |                   No |       No |        No |         No |                  No |         No |      No |                    No |         No |            No |

### 4.2 Attendance Record Actions

| Permission Code                          | Capability                          | Super Admin | Institute Admin | Branch Admin | Academic Coordinator | Training Coordinator |     Trainer |   Counselor | Accountant | Certificate Officer | Management |     Student | Corporate Coordinator | System Job | Audit Officer |
| ---------------------------------------- | ----------------------------------- | ----------: | --------------: | -----------: | -------------------: | -------------------: | ----------: | ----------: | ---------: | ------------------: | ---------: | ----------: | --------------------: | ---------: | ------------: |
| `attendance.record.read`                 | Read attendance records             |         Yes |             Yes |          Yes |                  Yes |                  Yes |    Assigned |        Read |       Read |                Read |       Read |   Self Only |       Corporate Scope |        Yes |           Yes |
| `attendance.record.mark`                 | Bulk mark records                   |         Yes |             Yes |          Yes |                  Yes |                  Yes |    Assigned |          No |         No |                  No |         No |          No |                    No |         No |            No |
| `attendance.record.update`               | Update single draft/returned record |         Yes |             Yes |          Yes |                  Yes |                  Yes |    Assigned |          No |         No |                  No |         No |          No |                    No |         No |            No |
| `attendance.record.markPresent`          | Mark present                        |         Yes |             Yes |          Yes |                  Yes |                  Yes |    Assigned |          No |         No |                  No |         No |          No |                    No |         No |            No |
| `attendance.record.markAbsent`           | Mark absent                         |         Yes |             Yes |          Yes |                  Yes |                  Yes |    Assigned |          No |         No |                  No |         No |          No |                    No |         No |            No |
| `attendance.record.markLate`             | Mark late                           |         Yes |             Yes |          Yes |                  Yes |                  Yes |    Assigned |          No |         No |                  No |         No |          No |                    No |         No |            No |
| `attendance.record.markExcused`          | Mark excused                        |         Yes |             Yes |          Yes |                  Yes |          Conditional | Conditional |          No |         No |                  No |         No |          No |                    No |         No |            No |
| `attendance.record.viewSensitiveRemarks` | View sensitive remarks              |         Yes |             Yes |          Yes |                  Yes |                  Yes |    Assigned | Conditional |         No |         Conditional |         No | Own Limited |     Corporate Limited |         No |           Yes |

### 4.3 Correction Actions

| Permission Code                        | Capability                       | Super Admin | Institute Admin | Branch Admin | Academic Coordinator | Training Coordinator |      Trainer | Counselor | Accountant | Certificate Officer | Management | Student | Corporate Coordinator | Audit Officer |
| -------------------------------------- | -------------------------------- | ----------: | --------------: | -----------: | -------------------: | -------------------: | -----------: | --------: | ---------: | ------------------: | ---------: | ------: | --------------------: | ------------: |
| `attendance.correction.read`           | Read corrections                 |         Yes |             Yes |          Yes |                  Yes |                  Yes | Own/Assigned |      Read |         No |                Read |       Read |      No |                    No |           Yes |
| `attendance.correction.create`         | Create correction                |         Yes |             Yes |          Yes |                  Yes |                  Yes |     Assigned |        No |         No |         Conditional |         No |      No |                    No |            No |
| `attendance.correction.submit`         | Submit correction                |         Yes |             Yes |          Yes |                  Yes |                  Yes | Own/Assigned |        No |         No |         Conditional |         No |      No |                    No |            No |
| `attendance.correction.approve`        | Approve correction               |         Yes |             Yes |          Yes |                  Yes |                   No |           No |        No |         No |                  No |         No |      No |                    No |            No |
| `attendance.correction.reject`         | Reject correction                |         Yes |             Yes |          Yes |                  Yes |                   No |           No |        No |         No |                  No |         No |      No |                    No |            No |
| `attendance.correction.cancel`         | Cancel correction                |         Yes |             Yes |          Yes |                  Yes |                  Own |          Own |        No |         No |                 Own |         No |      No |                    No |            No |
| `attendance.correction.selfApprove`    | Approve own correction exception | Conditional |              No |           No |                   No |                   No |           No |        No |         No |                  No |         No |      No |                    No |            No |
| `attendance.correction.overrideLocked` | Correct locked session exception | Conditional |              No |           No |                   No |                   No |           No |        No |         No |                  No |         No |      No |                    No |            No |

### 4.4 Summary, Alert, and Configuration Actions

| Permission Code                      | Capability              | Super Admin | Institute Admin | Branch Admin | Academic Coordinator | Training Coordinator |  Trainer |   Counselor | Accountant | Certificate Officer | Management | Student | Corporate Coordinator | System Job | Audit Officer |
| ------------------------------------ | ----------------------- | ----------: | --------------: | -----------: | -------------------: | -------------------: | -------: | ----------: | ---------: | ------------------: | ---------: | ------: | --------------------: | ---------: | ------------: |
| `attendance.summary.read`            | Read summaries          |         Yes |             Yes |          Yes |                  Yes |                  Yes | Assigned |        Read |       Read |                Read |       Read |      No |       Corporate Scope |        Yes |           Yes |
| `attendance.summary.batch.read`      | Read batch summary      |         Yes |             Yes |          Yes |                  Yes |                  Yes | Assigned |        Read |         No |                Read |       Read |      No |       Corporate Scope |        Yes |           Yes |
| `attendance.summary.enrollment.read` | Read enrollment summary |         Yes |             Yes |          Yes |                  Yes |                  Yes | Assigned |        Read |       Read |                Read |       Read |      No |       Corporate Scope |        Yes |           Yes |
| `attendance.summary.recalculate`     | Recalculate summary     |         Yes |             Yes |          Yes |                  Yes |          Conditional |       No |          No |         No |                  No |         No |      No |                    No |        Yes |            No |
| `attendance.self.summary.read`       | Student own summary     |          No |              No |           No |                   No |                   No |       No |          No |         No |                  No |         No |     Own |                    No |         No |            No |
| `attendance.self.history.read`       | Student own history     |          No |              No |           No |                   No |                   No |       No |          No |         No |                  No |         No |     Own |                    No |         No |            No |
| `attendance.alert.read`              | Read alerts             |         Yes |             Yes |          Yes |                  Yes |                  Yes | Assigned |        Read |         No |                Read |       Read |     Own |       Corporate Scope |        Yes |           Yes |
| `attendance.alert.detect`            | Detect alerts           |         Yes |             Yes |          Yes |                  Yes |          Conditional |       No |          No |         No |                  No |         No |      No |                    No |        Yes |            No |
| `attendance.alert.acknowledge`       | Acknowledge alert       |         Yes |             Yes |          Yes |                  Yes |                  Yes | Assigned | Conditional |         No |         Conditional |         No |      No |                    No |         No |            No |
| `attendance.alert.resolve`           | Resolve alert           |         Yes |             Yes |          Yes |                  Yes |          Conditional |       No | Conditional |         No |         Conditional |         No |      No |                    No |        Yes |            No |
| `attendance.alert.suppress`          | Suppress alert          |         Yes |             Yes |          Yes |                  Yes |                   No |       No |          No |         No |                  No |         No |      No |                    No |         No |            No |
| `attendance.alertRule.read`          | Read alert rules        |         Yes |             Yes |          Yes |                  Yes |                 Read |       No |          No |         No |                  No |         No |      No |                    No |         No |           Yes |
| `attendance.alertRule.create`        | Create alert rule       |         Yes |             Yes |          Yes |          Conditional |                   No |       No |          No |         No |                  No |         No |      No |                    No |         No |            No |
| `attendance.alertRule.update`        | Update alert rule       |         Yes |             Yes |          Yes |          Conditional |                   No |       No |          No |         No |                  No |         No |      No |                    No |         No |            No |
| `attendance.alertRule.activate`      | Activate alert rule     |         Yes |             Yes |          Yes |          Conditional |                   No |       No |          No |         No |                  No |         No |      No |                    No |         No |            No |
| `attendance.alertRule.suspend`       | Suspend alert rule      |         Yes |             Yes |          Yes |          Conditional |                   No |       No |          No |         No |                  No |         No |      No |                    No |         No |            No |
| `attendance.config.global.read`      | Read global config      |         Yes |             Yes |           No |                   No |                   No |       No |          No |         No |                  No |         No |      No |                    No |         No |           Yes |
| `attendance.config.global.manage`    | Manage global config    |         Yes |     Conditional |           No |                   No |                   No |       No |          No |         No |                  No |         No |      No |                    No |         No |            No |

### 4.5 Audit and Data Administration

| Permission Code                | Capability                                 | Super Admin | Institute Admin | Branch Admin | Academic Coordinator | Training Coordinator | Trainer | Counselor | Accountant | Certificate Officer |  Management | Student | Corporate Coordinator | Audit Officer |
| ------------------------------ | ------------------------------------------ | ----------: | --------------: | -----------: | -------------------: | -------------------: | ------: | --------: | ---------: | ------------------: | ----------: | ------: | --------------------: | ------------: |
| `attendance.audit.read`        | Read attendance audit                      |         Yes |             Yes |          Yes |                 Read |                   No |      No |        No |         No |                  No |        Read |      No |                    No |           Yes |
| `attendance.audit.export`      | Export attendance audit                    |         Yes |             Yes |  Conditional |                   No |                   No |      No |        No |         No |                  No | Conditional |      No |                    No |           Yes |
| `attendance.data.softDelete`   | Soft delete non-official config/alert data |         Yes |     Conditional |           No |                   No |                   No |      No |        No |         No |                  No |          No |      No |                    No |            No |
| `attendance.data.restore`      | Restore soft-deleted non-official data     |         Yes |     Conditional |           No |                   No |                   No |      No |        No |         No |                  No |          No |      No |                    No |            No |
| `attendance.consolidated.read` | Multi-branch attendance read/report        |         Yes |             Yes |  Conditional |          Conditional |                   No |      No |        No |         No |                  No |         Yes |      No |                    No |           Yes |

---

## 5. Report-Level Permissions

| Permission Code                                 | Report                                  | Super Admin | Institute Admin | Branch Admin | Academic Coordinator | Training Coordinator |      Trainer |   Counselor |  Accountant | Certificate Officer |  Management |     Student | Corporate Coordinator | System Job | Audit Officer |
| ----------------------------------------------- | --------------------------------------- | ----------: | --------------: | -----------: | -------------------: | -------------------: | -----------: | ----------: | ----------: | ------------------: | ----------: | ----------: | --------------------: | ---------: | ------------: |
| `attendance.report.sessionRegister`             | Session attendance register             |         Yes |             Yes |          Yes |                  Yes |                  Yes |     Assigned |          No |          No |                Read |        Read |          No |       Corporate Scope |        Yes |           Yes |
| `attendance.report.batchSummary`                | Batch attendance summary                |         Yes |             Yes |          Yes |                  Yes |                  Yes |     Assigned |        Read |          No |                Read |        Read |          No |       Corporate Scope |        Yes |           Yes |
| `attendance.report.studentHistory`              | Student attendance history              |         Yes |             Yes |          Yes |                  Yes |                  Yes |     Assigned |        Read |        Read |                Read |        Read |         Own |       Corporate Scope |        Yes |           Yes |
| `attendance.report.lowAttendance`               | Low attendance report                   |         Yes |             Yes |          Yes |                  Yes |                  Yes |     Assigned |        Read |          No |                Read |        Read | Own Limited |       Corporate Scope |        Yes |           Yes |
| `attendance.report.correctionRegister`          | Correction register                     |         Yes |             Yes |          Yes |                  Yes |                 Read | Own/Assigned |        Read |          No |                Read |        Read |          No |                    No |         No |           Yes |
| `attendance.report.trainerSubmissionCompliance` | Trainer submission compliance           |         Yes |             Yes |          Yes |                  Yes |                 Read |          Own |          No |          No |                  No |        Read |          No |                    No |        Yes |           Yes |
| `attendance.report.completionEligibility`       | Attendance completion eligibility input |         Yes |             Yes |          Yes |                  Yes |                 Read |     Assigned |        Read |        Read |                 Yes |        Read | Own Limited |       Corporate Scope |        Yes |           Yes |
| `attendance.report.auditTrail`                  | Audit trail report                      |         Yes |             Yes |  Conditional |                   No |                   No |           No |          No |          No |                  No | Conditional |          No |                    No |         No |           Yes |
| `attendance.report.exportCsv`                   | Export CSV                              |         Yes |             Yes |          Yes |                  Yes |                  Yes |     Assigned | Conditional | Conditional |         Conditional | Conditional |         Own |       Corporate Scope |        Yes |           Yes |
| `attendance.report.exportPdf`                   | Export PDF                              |         Yes |             Yes |          Yes |                  Yes |                  Yes |     Assigned | Conditional | Conditional |         Conditional | Conditional |         Own |       Corporate Scope |        Yes |           Yes |

---

## 6. Branch Scoping Rules by Actor

| Actor                 | Branch Scope Logic                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------- |
| Super Admin           | Can access assigned branches and global rules when global permissions are granted.            |
| Institute Admin       | Can access assigned institute branches and child branches if `canViewChildBranches = true`.   |
| Branch Admin          | Can access only assigned active branch unless consolidated read is granted.                   |
| Academic Coordinator  | Can access assigned branches; no implicit consolidated view.                                  |
| Training Coordinator  | Can access batches/sessions in assigned branches.                                             |
| Trainer               | Must have assigned branch and active trainer assignment to session or batch.                  |
| Counselor             | Read-only access to attendance records for assigned branch follow-up.                         |
| Accountant            | Read-only access to attendance summaries for assigned branch finance/completion coordination. |
| Certificate Officer   | Read-only access to attendance summary eligibility inputs.                                    |
| Management            | Requires report permissions and consolidated read for multi-branch views.                     |
| Student               | Scope is derived from authenticated `Person -> StudentProfile -> Enrollment`.                 |
| Corporate Coordinator | Phase 2 scope derived from `CorporateAccount -> CorporateParticipant -> Enrollment`.          |
| Audit Officer         | Audit records limited to assigned branches unless consolidated read is granted.               |
| System Job            | Job scope is configured; it must not process outside configured branch set.                   |

---

## 7. Portal UI Permission Rules

| UI Element                | Required Permission              | Hide When          | Disable When                                                    |
| ------------------------- | -------------------------------- | ------------------ | --------------------------------------------------------------- |
| Attendance menu           | `attendance.menu.root`           | Permission missing | Never shown without permission                                  |
| Create Session button     | `attendance.session.create`      | Permission missing | Source session is cancelled or attendance already exists        |
| Roster Sync button        | `attendance.session.roster.sync` | Permission missing | Session is not `DRAFT` or `RETURNED_FOR_CORRECTION`             |
| Mark cells                | `attendance.record.mark`         | Permission missing | Parent session not editable                                     |
| Submit button             | `attendance.session.submit`      | Permission missing | No records, stale version, or unmarked records without override |
| Approve button            | `attendance.session.approve`     | Permission missing | Session is not `SUBMITTED`                                      |
| Return button             | `attendance.session.return`      | Permission missing | Session is not `SUBMITTED`                                      |
| Correction create button  | `attendance.correction.create`   | Permission missing | Record is not official or pending correction exists             |
| Correction approve button | `attendance.correction.approve`  | Permission missing | Correction is not `SUBMITTED` or self-approval blocked          |
| Lock button               | `attendance.session.lock`        | Permission missing | Session has pending corrections or is not official              |
| Unlock button             | `attendance.session.unlock`      | Permission missing | Session is not locked                                           |
| Alert rule menu           | `attendance.menu.alertRules`     | Permission missing | None                                                            |
| Export buttons            | Report export permission         | Permission missing | No rows or branch scope invalid                                 |
| Audit drawer              | `attendance.audit.read`          | Permission missing | No audit entries                                                |

---

## 8. Recommended Permission Bundles

### 8.1 Super Admin Seed Bundle

```text
attendance.menu.root
attendance.menu.sessions
attendance.menu.marking
attendance.menu.corrections
attendance.menu.summaries
attendance.menu.alerts
attendance.menu.alertRules
attendance.menu.reports
attendance.menu.audit
attendance.session.read
attendance.session.create
attendance.session.update
attendance.session.roster.sync
attendance.session.submit
attendance.session.submitWithUnmarked
attendance.session.return
attendance.session.approve
attendance.session.cancel
attendance.session.lock
attendance.session.unlock
attendance.session.overrideDate
attendance.session.adminOverride
attendance.record.read
attendance.record.mark
attendance.record.update
attendance.record.markPresent
attendance.record.markAbsent
attendance.record.markLate
attendance.record.markExcused
attendance.record.viewSensitiveRemarks
attendance.correction.read
attendance.correction.create
attendance.correction.submit
attendance.correction.approve
attendance.correction.reject
attendance.correction.cancel
attendance.correction.selfApprove
attendance.correction.overrideLocked
attendance.summary.read
attendance.summary.recalculate
attendance.summary.batch.read
attendance.summary.enrollment.read
attendance.alert.read
attendance.alert.detect
attendance.alert.acknowledge
attendance.alert.resolve
attendance.alert.suppress
attendance.alertRule.read
attendance.alertRule.create
attendance.alertRule.update
attendance.alertRule.activate
attendance.alertRule.suspend
attendance.config.global.read
attendance.config.global.manage
attendance.audit.read
attendance.audit.export
attendance.data.softDelete
attendance.data.restore
attendance.consolidated.read
attendance.report.sessionRegister
attendance.report.batchSummary
attendance.report.studentHistory
attendance.report.lowAttendance
attendance.report.correctionRegister
attendance.report.trainerSubmissionCompliance
attendance.report.completionEligibility
attendance.report.auditTrail
attendance.report.exportCsv
attendance.report.exportPdf
```

### 8.2 Branch Admin Seed Bundle

```text
attendance.menu.root
attendance.menu.sessions
attendance.menu.marking
attendance.menu.corrections
attendance.menu.summaries
attendance.menu.alerts
attendance.menu.alertRules
attendance.menu.reports
attendance.menu.audit
attendance.session.read
attendance.session.create
attendance.session.update
attendance.session.roster.sync
attendance.session.submit
attendance.session.submitWithUnmarked
attendance.session.return
attendance.session.approve
attendance.session.cancel
attendance.session.lock
attendance.record.read
attendance.record.mark
attendance.record.update
attendance.record.markPresent
attendance.record.markAbsent
attendance.record.markLate
attendance.record.markExcused
attendance.record.viewSensitiveRemarks
attendance.correction.read
attendance.correction.create
attendance.correction.submit
attendance.correction.approve
attendance.correction.reject
attendance.correction.cancel
attendance.summary.read
attendance.summary.recalculate
attendance.summary.batch.read
attendance.summary.enrollment.read
attendance.alert.read
attendance.alert.detect
attendance.alert.acknowledge
attendance.alert.resolve
attendance.alert.suppress
attendance.alertRule.read
attendance.alertRule.create
attendance.alertRule.update
attendance.alertRule.activate
attendance.alertRule.suspend
attendance.audit.read
attendance.report.sessionRegister
attendance.report.batchSummary
attendance.report.studentHistory
attendance.report.lowAttendance
attendance.report.correctionRegister
attendance.report.trainerSubmissionCompliance
attendance.report.completionEligibility
attendance.report.exportCsv
attendance.report.exportPdf
```

### 8.3 Trainer Seed Bundle

```text
attendance.menu.root
attendance.menu.sessions
attendance.menu.marking
attendance.menu.corrections
attendance.menu.summaries
attendance.menu.alerts
attendance.menu.reports
attendance.session.read
attendance.session.create
attendance.session.update
attendance.session.roster.sync
attendance.session.submit
attendance.record.read
attendance.record.mark
attendance.record.update
attendance.record.markPresent
attendance.record.markAbsent
attendance.record.markLate
attendance.record.markExcused
attendance.record.viewSensitiveRemarks
attendance.correction.read
attendance.correction.create
attendance.correction.submit
attendance.correction.cancel
attendance.summary.read
attendance.summary.batch.read
attendance.alert.read
attendance.alert.acknowledge
attendance.report.sessionRegister
attendance.report.batchSummary
attendance.report.studentHistory
attendance.report.lowAttendance
attendance.report.exportPdf
```

### 8.4 Student Seed Bundle

```text
attendance.menu.studentSelfService
attendance.self.summary.read
attendance.self.history.read
attendance.report.studentHistory
```

---

## 9. Segregation of Duties

| Rule ID     | Rule                                                                                                   | Enforcement                       |
| ----------- | ------------------------------------------------------------------------------------------------------ | --------------------------------- |
| SOD-M08-001 | User cannot approve a correction they submitted unless `attendance.correction.selfApprove` is granted. | Correction approval service       |
| SOD-M08-002 | Trainer cannot approve their own submitted attendance session.                                         | Session approval service          |
| SOD-M08-003 | Accountant and Certificate Officer cannot mark attendance by default.                                  | Permission seed + service checks  |
| SOD-M08-004 | Student and corporate users cannot mutate attendance records.                                          | Permission model + service checks |
| SOD-M08-005 | Unlocking a session requires high privilege and audit reason.                                          | Session unlock service            |

---

## 10. Acceptance Criteria

1. All Attendance UI actions map to explicit permissions.
2. Permission checks run in server services, not only in UI.
3. Branch scope runs after authentication and before data access.
4. Trainer assignment scope is enforced for trainer portal and trainer role actions.
5. Student self-scope is enforced for every student attendance route.
6. Consolidated reports require `attendance.consolidated.read`.
7. Audit trail access requires `attendance.audit.read`.
8. Global alert rule management requires `attendance.config.global.manage`.
