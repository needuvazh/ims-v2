# Part 8 - Reports, Dashboards, KPIs, Analytics.md

## Module 08 – Attendance Management

**System:** Al Saud Training Institute Integrated Institute Management System (ASTI IMS)  
**Architecture:** Next.js modular monolith, TypeScript, Prisma, PostgreSQL  
**Owning Bounded Context:** Attendance Management  
**Primary Data Owners:** Attendance Management owns `AttendanceSession`, `AttendanceRecord`, `AttendanceCorrection`, `AttendanceAlert`, and attendance reporting read models. Training Delivery owns `Batch` and `Session`. Admission & Enrollment owns `Enrollment` and `StudentProfile`. Identity & Access owns users, roles, permissions, and branch access.  
**Reporting Principle:** Attendance reports consume enrollment, batch, session, trainer, branch, course, and student reference data without taking ownership of those records. Attendance analytics must preserve the Enrollment-centric learning lifecycle and must never create a parallel learner lifecycle.

---

## 1. Reporting and Analytics Objectives

The Attendance Management reporting layer provides operational visibility into attendance capture, student participation, trainer compliance, low attendance risks, correction activity, and completion eligibility evidence. The objective is to give branch teams, academic coordinators, trainers, management, students, and corporate coordinators accurate attendance data at the correct scope and with auditable exports.

### 1.1 Business Outcomes Supported

| Outcome ID | Outcome | Description | Primary Stakeholders |
|---|---|---|---|
| BO-M08-RPT-001 | Improve attendance marking compliance | Track whether trainers and academic staff submit attendance on time for every scheduled training session. | Branch Admin, Academic Coordinator, Trainer |
| BO-M08-RPT-002 | Detect low attendance early | Identify students whose attendance falls below course completion thresholds before the batch ends. | Academic Coordinator, Counselor, Student, Corporate Coordinator |
| BO-M08-RPT-003 | Provide reliable completion evidence | Supply attendance percentage and detailed attendance history to Exam, Completion, and Certificate contexts. | Academic Coordinator, Certificate Officer, Branch Manager |
| BO-M08-RPT-004 | Support branch and trainer accountability | Compare attendance submission timeliness and correction rates across branches, courses, batches, and trainers. | Super Admin, Branch Admin, Training Manager |
| BO-M08-RPT-005 | Enable self-service transparency | Allow students to view their own attendance history and alerts without allowing them to modify official records. | Student |
| BO-M08-RPT-006 | Support corporate reporting | Provide corporate attendance summaries for nominated participants without exposing unrelated students or branches. | Corporate Coordinator, Corporate Training Team |
| BO-M08-RPT-007 | Protect auditability of official records | Ensure exported attendance registers and correction registers include audit metadata and cannot hide official corrections. | Auditor, Academic Coordinator, Super Admin |

---

## 2. KPI Catalog

### 2.1 KPI Naming and Coding Standards

All Attendance KPIs use the code pattern `KPI-M08-ATT-xxx`. Each KPI must be calculable using branch-scoped attendance read models or reporting views. KPIs must support filtering by branch, course, batch, trainer, classroom, session date range, enrollment type, student status, and corporate account where applicable.

### 2.2 KPI Definitions

| KPI Code | KPI Name | Formula | Grain | Target / Threshold | Permission | Notes |
|---|---|---|---|---|---|---|
| KPI-M08-ATT-001 | Attendance Marking Completion Rate | `(submittedAttendanceSessions / scheduledSessionsRequiringAttendance) * 100` | Branch, Batch, Trainer, Date | >= 98% monthly | `attendance.dashboard.markingCompliance.read` | Counts sessions in `Scheduled`, `Completed`, or `Conducted` source status where attendance is required. Excludes cancelled sessions. |
| KPI-M08-ATT-002 | On-Time Submission Rate | `(sessionsSubmittedWithinSla / submittedAttendanceSessions) * 100` | Branch, Batch, Trainer, Date | >= 95% | `attendance.dashboard.markingCompliance.read` | SLA is default same calendar day by 23:59 Oman time unless branch configuration defines a stricter cutoff. |
| KPI-M08-ATT-003 | Pending Attendance Sessions | `count(attendanceSessions where status in [Draft, PendingSubmission, ReturnedForCorrection] and sessionDate <= today)` | Branch, Trainer, Date | 0 older than 1 business day | `attendance.dashboard.pending.read` | Includes returned sessions that need action. |
| KPI-M08-ATT-004 | Average Student Attendance Percentage | `sum(studentAttendancePercentage) / count(activeEnrollmentsWithAttendance)` | Branch, Course, Batch | >= course rule threshold | `attendance.dashboard.summary.read` | Student percentage is calculated from official records only. |
| KPI-M08-ATT-005 | Low Attendance Student Count | `count(enrollments where attendancePercentage < configuredLowAttendanceThreshold)` | Branch, Course, Batch | 0 critical | `attendance.dashboard.lowAttendance.read` | Threshold is from Attendance alert rule or CourseCompletionRule minimum attendance percentage. |
| KPI-M08-ATT-006 | Critical Low Attendance Count | `count(enrollments where attendancePercentage < criticalThreshold)` | Branch, Course, Batch | 0 | `attendance.dashboard.lowAttendance.read` | Default critical threshold is 10 percentage points below course minimum unless configured. |
| KPI-M08-ATT-007 | Perfect Attendance Count | `count(enrollments where attendedSessions = totalRequiredSessions and totalRequiredSessions > 0)` | Branch, Course, Batch | Informational | `attendance.dashboard.summary.read` | Includes Present and optionally Excused only if configured by branch rule. |
| KPI-M08-ATT-008 | Absence Rate | `(absentRecords / totalOfficialAttendanceRecords) * 100` | Branch, Course, Batch, Session | <= 5% | `attendance.dashboard.summary.read` | Uses status `Absent` only. |
| KPI-M08-ATT-009 | Late Arrival Rate | `(lateRecords / totalOfficialAttendanceRecords) * 100` | Branch, Course, Batch, Trainer | <= branch target | `attendance.dashboard.summary.read` | Uses status `Late`; late may count as present for completion only if configured. |
| KPI-M08-ATT-010 | Excused Absence Rate | `(excusedRecords / totalOfficialAttendanceRecords) * 100` | Branch, Course, Batch | Informational | `attendance.dashboard.summary.read` | Useful for identifying documentation-heavy absence patterns. |
| KPI-M08-ATT-011 | Correction Request Rate | `(correctionRequestsSubmitted / totalOfficialAttendanceRecords) * 100` | Branch, Trainer, Batch, Date | <= 2% | `attendance.dashboard.corrections.read` | High values indicate training or process quality issue. |
| KPI-M08-ATT-012 | Correction Approval Rate | `(approvedCorrectionRequests / submittedCorrectionRequests) * 100` | Branch, Approver, Trainer | Informational | `attendance.dashboard.corrections.read` | Excludes cancelled correction requests. |
| KPI-M08-ATT-013 | Average Correction Turnaround Time | `avg(correctionCompletedAt - correctionSubmittedAt)` | Branch, Approver, Date | <= 2 business days | `attendance.dashboard.corrections.read` | Measured in working hours based on Oman timezone and branch calendar. |
| KPI-M08-ATT-014 | Attendance Lock Compliance Rate | `(lockedSubmittedSessions / submittedAttendanceSessions) * 100` | Branch, Batch, Date | >= 95% | `attendance.dashboard.audit.read` | Indicates whether official sessions are protected from edits. |
| KPI-M08-ATT-015 | Trainer Attendance Submission SLA Breach Count | `count(attendanceSessions where submittedAt > dueAt or status pending beyond dueAt)` | Trainer, Branch, Month | 0 | `attendance.dashboard.trainerCompliance.read` | Supports trainer performance discussions. |
| KPI-M08-ATT-016 | Batch Attendance Risk Score | Weighted score from low attendance ratio, pending session count, correction rate, and upcoming completion date | Batch | Low / Medium / High | `attendance.dashboard.risk.read` | Score definition is specified in section 2.4. |
| KPI-M08-ATT-017 | Student Attendance Trend | `attendancePercentage by week or by session sequence` | Enrollment, Batch | Upward or stable | `attendance.self.summary.read` or `attendance.summary.enrollment.read` | Used in student portal and counselor follow-up. |
| KPI-M08-ATT-018 | Corporate Participant Attendance Compliance | `(corporateParticipantsMeetingThreshold / corporateParticipantsWithActiveEnrollment) * 100` | Corporate Account, Contract, Batch | >= contract/course threshold | `attendance.report.corporateSummary` | Phase 2 portal and internal corporate reporting. |
| KPI-M08-ATT-019 | Attendance Register Export Count | `count(exports where reportType = SessionAttendanceRegister)` | Branch, User, Date | Audit only | `attendance.audit.export` | Must be audit logged. |
| KPI-M08-ATT-020 | Attendance Data Freshness | `max(now - lastOfficialAttendanceUpdateAt)` | Branch, Dashboard | <= 15 minutes for operational dashboards | `attendance.dashboard.summary.read` | Uses read model refresh timestamps. |

### 2.3 Attendance Percentage Formula

Attendance percentage must be calculated consistently across dashboards, reports, student portal, completion evidence, and exports.

```text
requiredSessionCount = count(official attendance records for enrollment where record countsTowardAttendance = true)
attendedWeightedCount = sum(attendanceWeight for official records)
attendancePercentage = round((attendedWeightedCount / requiredSessionCount) * 100, 2)
```

Default attendance weights:

| Status | Default Weight | Counts Toward Required Session Count | Counts as Attendance Earned | Configurable |
|---|---:|---|---|---|
| Present | 1.00 | Yes | Yes | No |
| Late | 1.00 | Yes | Yes | Yes, branch may set to 0.50 or 0.75 only if approved by Academic Admin |
| Excused | 1.00 | Yes | Yes | Yes, branch may set to 0.00, 0.50, or 1.00 based on academic policy |
| Absent | 0.00 | Yes | No | No |
| Unmarked | 0.00 | No for official percentage until session submitted | No | No |
| NotApplicable | 0.00 | No | No | No |

Rules:

1. Draft attendance records must not be included in official percentages.
2. Returned-for-correction sessions remain excluded from official completion evidence until resubmitted or approved based on branch policy.
3. Locked official attendance records are included in percentages.
4. Soft-deleted attendance records are excluded unless the report is an audit report explicitly configured to include deleted records.
5. A correction updates the current official record and preserves old and new values in `AttendanceCorrection` and `AuditLog`.
6. Percentage must be rounded to two decimal places using half-up rounding for display and stored read model values.
7. Raw numerator and denominator must be retained in read models to avoid rounding drift in aggregation.

### 2.4 Batch Attendance Risk Score

The batch risk score is used by dashboards to highlight operational and completion risk. It is not a student penalty and must not modify enrollment status.

| Component | Weight | Rule |
|---|---:|---|
| Low attendance ratio | 40 | `lowAttendanceEnrollments / activeEnrollments` |
| Critical low attendance ratio | 25 | `criticalLowAttendanceEnrollments / activeEnrollments` |
| Pending session ratio | 20 | `pendingAttendanceSessions / sessionsConductedToDate` |
| Correction request ratio | 10 | `correctionRequestsLast30Days / officialRecordsLast30Days` |
| Completion proximity | 5 | Adds risk when batch end date is within 14 days and low attendance count > 0 |

Score bands:

| Score Range | Risk Level | Dashboard Color Semantics | Required Action |
|---:|---|---|---|
| 0.00–19.99 | Low | Normal | No immediate action. Continue monitoring. |
| 20.00–49.99 | Medium | Warning | Academic Coordinator should review students and pending sessions. |
| 50.00–100.00 | High | Critical | Branch Admin or Academic Coordinator must review before completion processing. |

---

## 3. Dashboard Architecture

### 3.1 Dashboard Types

| Dashboard | User Type | Purpose | Default Permission |
|---|---|---|---|
| Attendance Operations Dashboard | Internal | Daily operational monitoring of marking, pending sessions, alerts, and corrections. | `attendance.dashboard.operations.read` |
| Trainer Attendance Dashboard | Internal / Faculty | Assigned sessions, marking queue, recent submissions, and returned corrections. | `attendance.dashboard.trainer.read` |
| Academic Coordinator Dashboard | Internal | Low attendance risk, correction approvals, batch readiness, completion evidence. | `attendance.dashboard.academic.read` |
| Branch Admin Attendance Dashboard | Internal | Branch performance, SLA compliance, trainers, course/batch attendance health. | `attendance.dashboard.branch.read` |
| Executive Attendance Dashboard | Internal | Multi-branch high-level trends and exceptions. | `attendance.consolidated.read` + `attendance.dashboard.executive.read` |
| Student Attendance Dashboard | External | Own attendance percentage, session history, alert status, and completion threshold visibility. | `attendance.self.summary.read` |
| Corporate Attendance Dashboard | External Phase 2 | Corporate participant attendance by batch, course, and contract. | `attendance.corporate.summary.read` |

### 3.2 Dashboard Branch Scope Rules

1. Every internal dashboard request must include an active `branchContextId` or an explicit `consolidated=true` flag.
2. A single-branch dashboard must filter all attendance sessions by `AttendanceSession.branchId = activeBranchContextId`.
3. Consolidated dashboards are allowed only when the user has `attendance.consolidated.read` and `UserBranchAccess.canViewConsolidated = true`.
4. Parent branch access may include child branch data only when `UserBranchAccess.canViewChildBranches = true`.
5. Trainer dashboard scope is further restricted to sessions where the trainer is assigned to the source `Session` or to the batch as an active `BatchTrainer`, unless the user has `attendance.session.adminOverride`.
6. Student dashboard scope is restricted to enrollments linked to the authenticated student's `StudentProfile`.
7. Corporate dashboard scope is restricted to participants linked to the authenticated corporate account and must never expose non-corporate students.
8. Exported dashboard tables must include a footer stating the branch scope, generated by, generated at in Oman timezone, filters, and permission code used.

---

## 4. Admin and Portal Dashboard Widgets

### 4.1 Attendance Operations Dashboard Widgets

| Widget ID | Widget Name | Type | Data Source | Filters | Permission | Refresh | Behavior |
|---|---|---|---|---|---|---|---|
| W-M08-ATT-001 | Today’s Sessions Requiring Attendance | Metric card | `v_attendance_session_status_summary` | Branch, trainer, course, batch, date=today | `attendance.dashboard.operations.read` | 5 minutes | Clicking opens pending session list filtered to today. |
| W-M08-ATT-002 | Submitted Today | Metric card | `v_attendance_session_status_summary` | Branch, date=today | `attendance.dashboard.operations.read` | 5 minutes | Shows submitted count and percentage. |
| W-M08-ATT-003 | Pending Submission | Metric card | `v_attendance_pending_sessions` | Branch, trainer, aging bucket | `attendance.dashboard.pending.read` | 5 minutes | Shows critical badge for sessions older than SLA. |
| W-M08-ATT-004 | Returned for Correction | Metric card | `v_attendance_correction_queue` | Branch, trainer, batch | `attendance.dashboard.corrections.read` | 5 minutes | Opens correction queue. |
| W-M08-ATT-005 | Low Attendance Students | Metric card | `v_attendance_low_student_risk` | Branch, course, batch, threshold type | `attendance.dashboard.lowAttendance.read` | 15 minutes | Shows warning and critical counts. |
| W-M08-ATT-006 | Submission Status by Hour | Column chart | `v_attendance_submission_hourly` | Branch, date range | `attendance.dashboard.markingCompliance.read` | 15 minutes | Helps identify daily submission load. |
| W-M08-ATT-007 | Pending Sessions Table | Table | `v_attendance_pending_sessions` | Branch, trainer, course, batch, date range | `attendance.session.read` | 5 minutes | Supports sorting by age, trainer, batch, session date. |
| W-M08-ATT-008 | Recent Corrections | Table | `v_attendance_correction_register` | Branch, status, approver, date range | `attendance.correction.read` | 15 minutes | Shows latest correction requests with action buttons based on permission. |

### 4.2 Trainer Attendance Dashboard Widgets

| Widget ID | Widget Name | Type | Data Source | Permission | Scope | Behavior |
|---|---|---|---|---|---|
| W-M08-TRN-001 | My Sessions Today | Metric card and list | `v_trainer_attendance_queue` | `attendance.session.read` | Assigned trainer sessions only | Shows source session time, batch, classroom, roster count, marking status. |
| W-M08-TRN-002 | Pending My Submission | Metric card | `v_trainer_attendance_queue` | `attendance.record.mark` | Assigned trainer sessions only | Clicking opens marking workspace. |
| W-M08-TRN-003 | Returned to Me | Metric card | `v_attendance_correction_queue` | `attendance.session.return` visibility only if assigned | Own returned sessions | Shows reason and due date. |
| W-M08-TRN-004 | My Submission SLA | Gauge | `v_trainer_submission_sla` | `attendance.dashboard.trainer.read` | Authenticated trainer | Displays monthly on-time submission rate. |
| W-M08-TRN-005 | My Recent Attendance Marking | Table | `v_attendance_session_status_summary` | `attendance.session.read` | Assigned sessions | Read-only for submitted or locked sessions unless correction allowed. |

### 4.3 Academic Coordinator Dashboard Widgets

| Widget ID | Widget Name | Type | Data Source | Permission | Scope | Behavior |
|---|---|---|---|---|---|
| W-M08-ACD-001 | Batch Attendance Risk | Heatmap table | `v_batch_attendance_risk` | `attendance.dashboard.risk.read` | Assigned branch or consolidated if permitted | Sorts by high risk first. |
| W-M08-ACD-002 | Low Attendance Students | Table | `v_attendance_low_student_risk` | `attendance.alert.read` | Branch scope | Supports counselor follow-up export. |
| W-M08-ACD-003 | Correction Approval Queue | Table | `v_attendance_correction_register` | `attendance.correction.approve` | Branch scope | Shows approve/reject actions. |
| W-M08-ACD-004 | Completion Attendance Evidence Readiness | Donut chart + table | `v_completion_attendance_evidence` | `attendance.summary.batch.read` | Branch scope | Identifies enrollments eligible or blocked by attendance. |
| W-M08-ACD-005 | Attendance Alert Aging | Stacked bar | `v_attendance_alert_aging` | `attendance.alert.read` | Branch scope | Groups Open, Acknowledged, Resolved, Suppressed alerts by age. |

### 4.4 Branch Admin Attendance Dashboard Widgets

| Widget ID | Widget Name | Type | Data Source | Permission | Behavior |
|---|---|---|---|---|
| W-M08-BRA-001 | Branch Attendance Health | Metric summary group | `v_branch_attendance_health` | `attendance.dashboard.branch.read` | Shows completion rate, on-time rate, low attendance count, correction rate. |
| W-M08-BRA-002 | Trainer Compliance Ranking | Table | `v_trainer_attendance_compliance` | `attendance.dashboard.trainerCompliance.read` | Sorts by SLA breach count descending by default. |
| W-M08-BRA-003 | Course Attendance Comparison | Bar chart | `v_course_attendance_summary` | `attendance.dashboard.summary.read` | Compares average attendance across courses. |
| W-M08-BRA-004 | Batch Risk Matrix | Matrix | `v_batch_attendance_risk` | `attendance.dashboard.risk.read` | Groups batch risk by course and trainer. |
| W-M08-BRA-005 | Correction Trends | Line chart | `v_attendance_correction_trends` | `attendance.dashboard.corrections.read` | Shows submitted, approved, rejected corrections over time. |

### 4.5 Executive Attendance Dashboard Widgets

| Widget ID | Widget Name | Type | Data Source | Permission | Consolidated Scope Required | Behavior |
|---|---|---|---|---|---|
| W-M08-EXE-001 | Multi-Branch Attendance Compliance | Metric and branch table | `v_branch_attendance_health` | `attendance.dashboard.executive.read` | Yes | Shows branch comparison only for branches the user can access. |
| W-M08-EXE-002 | Low Attendance Risk by Branch | Heatmap | `v_attendance_low_student_risk` | `attendance.dashboard.executive.read` | Yes | Aggregated counts; no sensitive student remarks. |
| W-M08-EXE-003 | Trainer Submission Performance | Leaderboard | `v_trainer_attendance_compliance` | `attendance.dashboard.executive.read` | Yes | Masks individual trainer phone/email. |
| W-M08-EXE-004 | Attendance Data Freshness | Metric | `v_attendance_read_model_refresh_status` | `attendance.dashboard.executive.read` | Yes | Shows stale read models requiring operations review. |

### 4.6 Student Attendance Dashboard Widgets

| Widget ID | Widget Name | Type | Data Source | Permission | Scope | Behavior |
|---|---|---|---|---|---|
| W-M08-STU-001 | My Attendance Percentage | Metric card | `v_student_attendance_summary` | `attendance.self.summary.read` | Own student profile only | Shows current percentage and required threshold. |
| W-M08-STU-002 | My Attendance Trend | Line chart | `v_student_attendance_history` | `attendance.self.history.read` | Own enrollment only | Shows session-by-session percentage trend. |
| W-M08-STU-003 | Session Attendance History | Table | `v_student_attendance_history` | `attendance.self.history.read` | Own enrollment only | Displays date, session, course, batch, status, remarks visibility limited. |
| W-M08-STU-004 | Attendance Alerts | Alert list | `v_attendance_alerts` | `attendance.self.summary.read` | Own alerts only | Shows low attendance warning and recommended contact channel. |
| W-M08-STU-005 | Completion Attendance Requirement | Progress card | `v_completion_attendance_evidence` | `attendance.self.summary.read` | Own enrollment only | Displays whether attendance threshold is met; does not imply certificate eligibility alone. |

### 4.7 Corporate Attendance Dashboard Widgets

| Widget ID | Widget Name | Type | Data Source | Permission | Scope | Behavior |
|---|---|---|---|---|---|
| W-M08-COR-001 | Corporate Attendance Summary | Metric summary | `v_corporate_attendance_summary` | `attendance.corporate.summary.read` | Authenticated corporate account only | Shows participants, average attendance, below threshold count. |
| W-M08-COR-002 | Participant Attendance Table | Table | `v_corporate_participant_attendance` | `attendance.corporate.summary.read` | Corporate account and contract scope | Supports export if `attendance.corporate.export` is granted. |
| W-M08-COR-003 | Batch Attendance by Course | Bar chart | `v_corporate_batch_attendance` | `attendance.corporate.summary.read` | Corporate account only | Aggregated by course and batch. |

---

## 5. Operational Reports

### 5.1 Report Standards

Every Attendance report must include:

1. Report title and report code.
2. Branch scope: selected branch, child branch inclusion flag, or consolidated scope.
3. Date range in Oman timezone.
4. Generated timestamp in Oman timezone.
5. Generated by user display name and user ID.
6. Permission code used for report access.
7. Filter summary.
8. Page number for PDF exports.
9. Export checksum for audit-grade reports.
10. Bilingual labels when generated in Arabic.

### 5.2 Export Formats

| Format | Allowed For | Rules |
|---|---|---|
| CSV | Operational tabular reports | UTF-8 with BOM, comma separated, ISO date values, no merged cells. |
| XLSX | Operational and management reports | Frozen header row, filters enabled, date/time formatted in Oman timezone, summary sheet for filters. |
| PDF | Official registers, summaries, audit reports | Header/footer required, branch and generation metadata required, Arabic RTL layout supported. |

### 5.3 Report Catalog

#### RPT-M08-ATT-001 – Session Attendance Register

| Attribute | Specification |
|---|---|
| Purpose | Official attendance register for one training session. |
| Primary Users | Trainer, Academic Coordinator, Branch Admin, Auditor |
| Permission | `attendance.report.sessionRegister` |
| Data Source | `v_session_attendance_register` |
| Mandatory Filters | Branch, batch, source session, attendance session |
| Optional Filters | Attendance status, student search, enrollment type |
| Columns | Session date, start time, end time, branch, course code, course name English, course name Arabic, batch code, trainer name, classroom, student number, enrollment number, student name English, student name Arabic, civil ID masked, attendance status, late minutes, remarks, marked by, marked at, submitted by, submitted at, locked at |
| Sorting | Default by student name English ascending; optional student number, status, marked at |
| Paging | 50 rows default, 100 max in UI; export all rows within selected session |
| Export | PDF, XLSX, CSV |
| Branch Scope | Session branch must be within accessible branch set. Trainer can export only assigned sessions unless elevated permission exists. |
| Special Rules | PDF export must display signature placeholders for trainer and academic coordinator when official status is Submitted, Approved, or Locked. |

#### RPT-M08-ATT-002 – Batch Attendance Summary

| Attribute | Specification |
|---|---|
| Purpose | Summarize attendance performance for all enrollments in a batch. |
| Primary Users | Academic Coordinator, Branch Admin, Trainer, Counselor |
| Permission | `attendance.report.batchSummary` |
| Data Source | `v_batch_attendance_summary` |
| Mandatory Filters | Branch, batch |
| Optional Filters | Course, trainer, enrollment status, attendance risk band, corporate account |
| Columns | Branch, course, batch code, batch start date, batch end date, student number, enrollment number, student name, enrollment type, total required sessions, present count, late count, excused count, absent count, attendance percentage, required percentage, variance from threshold, low attendance alert status, completion attendance eligible flag |
| Sorting | Default by attendance percentage ascending; optional student name, enrollment number, risk band |
| Paging | 25 rows default, 100 max in UI |
| Export | PDF, XLSX, CSV |
| Branch Scope | Batch branch must be accessible. Consolidated export requires `attendance.consolidated.read`. |
| Special Rules | Student portal cannot access this report; students use own history report only. |

#### RPT-M08-ATT-003 – Student Attendance History

| Attribute | Specification |
|---|---|
| Purpose | Show detailed attendance history for a student enrollment. |
| Primary Users | Student, Counselor, Academic Coordinator, Certificate Officer |
| Permission | `attendance.report.studentHistory` or `attendance.self.history.read` |
| Data Source | `v_student_attendance_history` |
| Mandatory Filters | Enrollment or student profile; branch for internal users |
| Optional Filters | Course, batch, date range, status |
| Columns | Session number, session title, session date, start time, end time, course, batch, trainer name, attendance status, late minutes, student-visible remark, correction applied flag, official record status, attendance percentage after session |
| Sorting | Default by session date ascending; optional status and session number |
| Paging | 25 rows default, 100 max |
| Export | PDF for internal users and students; XLSX/CSV for internal users only |
| Branch Scope | Internal users need branch access. Student access must match authenticated student profile. |
| Special Rules | Sensitive internal remarks must be hidden from student and corporate views unless explicitly marked student-visible. |

#### RPT-M08-ATT-004 – Low Attendance Report

| Attribute | Specification |
|---|---|
| Purpose | Identify students below warning or critical attendance thresholds. |
| Primary Users | Academic Coordinator, Branch Admin, Counselor, Trainer, Corporate Coordinator |
| Permission | `attendance.report.lowAttendance` |
| Data Source | `v_attendance_low_student_risk` |
| Mandatory Filters | Branch, date range or active batch filter |
| Optional Filters | Course, batch, trainer, counselor, enrollment type, corporate account, threshold type, alert status |
| Columns | Branch, course, batch, student number, enrollment number, student name, phone masked for trainer, counselor name, enrollment type, corporate account, total sessions, attended weighted sessions, attendance percentage, required threshold, variance, missed sessions count, alert status, last alert sent at, follow-up status |
| Sorting | Default by variance ascending; optional attendance percentage, missed sessions, course, batch |
| Paging | 50 rows default, 200 max in UI |
| Export | XLSX, CSV, PDF summary |
| Branch Scope | Branch scoped. Corporate view restricted to corporate participants only. Student view restricted to own alerts. |
| Special Rules | Contact details visibility follows PII permissions. Trainer sees only assigned batch students. |

#### RPT-M08-ATT-005 – Pending Attendance Sessions Report

| Attribute | Specification |
|---|---|
| Purpose | Monitor sessions for which attendance has not been submitted or has been returned. |
| Primary Users | Trainer, Academic Coordinator, Branch Admin |
| Permission | `attendance.report.pendingSessions` |
| Data Source | `v_attendance_pending_sessions` |
| Mandatory Filters | Branch, date range |
| Optional Filters | Trainer, course, batch, pending age bucket, source session status |
| Columns | Branch, session date, start time, end time, course, batch, trainer, classroom, roster count, attendance session status, due at, pending age hours, last saved at, returned reason, returned by |
| Sorting | Default by pending age descending; optional session date, trainer, batch |
| Paging | 50 rows default, 200 max |
| Export | XLSX, CSV |
| Branch Scope | Trainer only sees assigned sessions. Coordinator/Admin sees branch-scoped sessions. |
| Special Rules | Cancelled source sessions must not appear. |

#### RPT-M08-ATT-006 – Trainer Attendance Compliance Report

| Attribute | Specification |
|---|---|
| Purpose | Track attendance marking performance by trainer. |
| Primary Users | Branch Admin, Academic Coordinator, Training Manager |
| Permission | `attendance.report.trainerCompliance` |
| Data Source | `v_trainer_attendance_compliance` |
| Mandatory Filters | Branch, month or custom date range |
| Optional Filters | Trainer, course, batch, trainer type |
| Columns | Branch, trainer code, trainer name, assigned sessions, sessions requiring attendance, submitted sessions, on-time submissions, late submissions, pending sessions, returned sessions, correction requests raised, correction request rate, on-time submission percentage, last pending session date |
| Sorting | Default by pending sessions descending and on-time percentage ascending |
| Paging | 50 rows default, 200 max |
| Export | XLSX, CSV, PDF summary |
| Branch Scope | Requires branch access; consolidated requires `attendance.consolidated.read`. |
| Special Rules | This is an internal performance report and must not be visible to students or corporate users. |

#### RPT-M08-ATT-007 – Attendance Correction Register

| Attribute | Specification |
|---|---|
| Purpose | Audit all attendance correction requests and outcomes. |
| Primary Users | Academic Coordinator, Branch Admin, Auditor |
| Permission | `attendance.report.correctionRegister` |
| Data Source | `v_attendance_correction_register` |
| Mandatory Filters | Branch, date range |
| Optional Filters | Status, requested by, approved by, batch, student, old status, new status |
| Columns | Correction number, branch, attendance session, session date, student number, enrollment number, old status, requested new status, approved new status, reason code, reason text, requested by, requested at, approver, approval status, approved/rejected at, rejection reason, locked override flag, audit log reference |
| Sorting | Default by requested at descending; optional status, approver, session date |
| Paging | 50 rows default, 200 max |
| Export | XLSX, CSV, PDF |
| Branch Scope | Branch scoped. Auditor may read assigned branches only unless consolidated permission is granted. |
| Special Rules | Exports must include old and new values. No field masking for authorized audit users except civil ID/passport. |

#### RPT-M08-ATT-008 – Attendance Alerts Register

| Attribute | Specification |
|---|---|
| Purpose | Track generated low attendance alerts and their lifecycle. |
| Primary Users | Academic Coordinator, Counselor, Branch Admin |
| Permission | `attendance.report.alerts` |
| Data Source | `v_attendance_alerts` |
| Mandatory Filters | Branch, alert date range |
| Optional Filters | Alert status, severity, student, course, batch, counselor, corporate account |
| Columns | Alert number, severity, branch, course, batch, student number, student name, enrollment number, attendance percentage, threshold, variance, alert status, generated at, acknowledged by, acknowledged at, resolved by, resolved at, notification channels sent, last notification status |
| Sorting | Default by severity then generated at descending |
| Paging | 50 rows default, 200 max |
| Export | XLSX, CSV |
| Branch Scope | Branch scoped. Counselor sees students assigned to them or read-only branch scope where permitted. |
| Special Rules | Notification delivery details must not expose provider secrets. |

#### RPT-M08-ATT-009 – Completion Attendance Evidence Report

| Attribute | Specification |
|---|---|
| Purpose | Provide attendance eligibility evidence for Exam, Completion, and Certificate workflows. |
| Primary Users | Academic Coordinator, Certificate Officer, Branch Manager |
| Permission | `attendance.report.completionEvidence` |
| Data Source | `v_completion_attendance_evidence` |
| Mandatory Filters | Branch, course or batch |
| Optional Filters | Completion status, certificate status, attendance eligibility status, student |
| Columns | Branch, course, batch, student number, enrollment number, enrollment status, total required sessions, attendance percentage, required percentage, attendance eligible flag, pending attendance session count, correction pending flag, completion status, payment validation required flag from Enrollment, generated at |
| Sorting | Default by attendance eligible flag ascending and attendance percentage ascending |
| Paging | 50 rows default, 200 max |
| Export | PDF, XLSX, CSV |
| Branch Scope | Branch scoped. Consolidated summary permitted only to executive/reporting users. |
| Special Rules | Report must state that certificate issuance also requires completion approval and payment validation; attendance alone is not certificate eligibility. |

#### RPT-M08-ATT-010 – Corporate Attendance Summary

| Attribute | Specification |
|---|---|
| Purpose | Summarize attendance for corporate participants. |
| Primary Users | Corporate Training Team, Corporate Coordinator, Branch Admin |
| Permission | `attendance.report.corporateSummary` |
| Data Source | `v_corporate_attendance_summary` |
| Mandatory Filters | Corporate account or internal branch + corporate account |
| Optional Filters | Contract, course, batch, participant, date range |
| Columns | Corporate account code, corporate account name, contract number, course, batch, participant employee code, participant name, linked student number, enrollment number, total sessions, attended weighted sessions, attendance percentage, required threshold, low attendance flag, certificate attendance eligible flag |
| Sorting | Default by attendance percentage ascending |
| Paging | 50 rows default, 200 max |
| Export | PDF, XLSX, CSV where permission allows |
| Branch Scope | Internal users must have branch access. Corporate users see only their corporate account participants. |
| Special Rules | Must not expose fee, invoice, discount, or unrelated learner data. |

#### RPT-M08-ATT-011 – Attendance Audit Trail Report

| Attribute | Specification |
|---|---|
| Purpose | Show sensitive attendance changes and audit events. |
| Primary Users | Auditor, Super Admin, Branch Admin with audit permission |
| Permission | `attendance.audit.read` and `attendance.audit.export` for exports |
| Data Source | `v_attendance_audit_trail` |
| Mandatory Filters | Branch, date range, entity type |
| Optional Filters | Entity ID, action, performed by, student, batch, IP address |
| Columns | Audit ID, branch, entity type, entity ID, action, old value JSON, new value JSON, performed by, performed at, IP address masked by policy, reason, correlation ID, request ID |
| Sorting | Default by performed at descending |
| Paging | 25 rows default, 100 max |
| Export | PDF, XLSX, CSV |
| Branch Scope | Branch scoped. Super Admin can consolidate only with consolidated permission. |
| Special Rules | This report is audit-only; access itself must create an audit log entry. |

#### RPT-M08-ATT-012 – Monthly Attendance Compliance Summary

| Attribute | Specification |
|---|---|
| Purpose | Management report for monthly attendance compliance. |
| Primary Users | Branch Admin, Super Admin, Executive Management |
| Permission | `attendance.report.monthlyCompliance` |
| Data Source | `v_monthly_attendance_compliance` |
| Mandatory Filters | Month, branch or consolidated scope |
| Optional Filters | Course category, course, trainer, branch group |
| Columns | Month, branch, scheduled sessions, attendance required sessions, submitted sessions, submission completion rate, on-time rate, average attendance percentage, low attendance count, correction request count, correction rate, unresolved alert count |
| Sorting | Default by branch name ascending |
| Paging | 25 rows default, 100 max |
| Export | PDF, XLSX |
| Branch Scope | Branch scoped or consolidated only with permission. |
| Special Rules | PDF executive report must show only aggregate values, not individual student names, unless detail export permission is granted. |

---

## 6. Report Filter Specifications

### 6.1 Common Filters

| Filter | Type | Validation | Applies To | Default |
|---|---|---|---|---|
| Branch | UUID selector | Must be in user's accessible branch set | All internal reports | Active branch context |
| Include Child Branches | Boolean | Allowed only when user branch access permits child branches | Consolidated/internal reports | false |
| Date From | Date | ISO date, must be <= Date To | Date reports | Start of current month |
| Date To | Date | ISO date, max range 366 days for UI reports | Date reports | Current date |
| Course | UUID selector | Must belong to selected branch via department/batch relationship when branch-specific | Course reports | All |
| Batch | UUID selector | Batch branch must be in accessible branch set | Batch reports | All |
| Trainer | UUID selector | Trainer assignment must intersect accessible branch/batch | Trainer reports | All |
| Student Search | String | 2–80 chars, letters, numbers, spaces, Arabic, hyphen, apostrophe | Student reports | Empty |
| Attendance Status | Enum | Present, Absent, Late, Excused, Unmarked, NotApplicable | Record reports | All official statuses |
| Alert Severity | Enum | Warning, Critical, Info | Alert reports | All |
| Correction Status | Enum | Draft, Submitted, Approved, Rejected, Cancelled | Correction reports | All |
| Enrollment Type | Enum | Regular, WalkIn, Online, Corporate | Summary reports | All |
| Corporate Account | UUID selector | Required for corporate portal; optional for internal corporate reports | Corporate reports | Authenticated account for portal |

### 6.2 Date Range Bounds

| Report Type | Maximum UI Date Range | Export Range | Reason |
|---|---:|---:|---|
| Session Register | Single session | Single session | Official register is session-bound. |
| Student History | 24 months | 60 months with permission | Long student history can be exported for compliance. |
| Low Attendance | 12 months | 24 months | Operational risk report. |
| Pending Sessions | 6 months | 12 months | Pending data is operational. |
| Correction Register | 12 months | 60 months with audit export permission | Audit requirement. |
| Audit Trail | 3 months UI | 60 months export with audit permission | Audit data can be large and sensitive. |
| Monthly Compliance | 24 months | 60 months | Management trend reporting. |

---

## 7. Read Models and Reporting Database Views

### 7.1 Read Model Principles

1. The transactional attendance tables remain the source of truth.
2. Read models are derived from Attendance, Enrollment, Training Delivery, Course Catalog, Organization, IAM, and Corporate references.
3. Read model refresh must occur synchronously for the changed enrollment/session when attendance is submitted or correction is approved.
4. Dashboard aggregates may refresh through scheduled internal jobs within the modular monolith jobs package; no external broker is required.
5. Read model rows must include `branchId` to enforce branch-scoped queries efficiently.
6. Read models must include `lastCalculatedAt` and `calculationVersion`.
7. Read models must not store full PII unless required for report performance; where stored, PII must be minimized and masked in DTOs.
8. Deleting source data through soft delete must mark read model rows as inactive or recalculate affected aggregates.

### 7.2 Recommended Views / Materialized Views

#### v_attendance_session_status_summary

| Column | Type | Source | Index |
|---|---|---|---|
| attendanceSessionId | UUID | AttendanceSession.id | PK-like unique |
| branchId | UUID | AttendanceSession.branchId | Index |
| sourceSessionId | UUID | Session.id | Index |
| batchId | UUID | Session.batchId | Index |
| courseId | UUID | Batch.courseId | Index |
| trainerId | UUID | AttendanceSession.markedByTrainerId or Session.trainerId | Index |
| sessionDate | Date | Session.sessionDate / AttendanceSession.attendanceDate | Composite index with branchId |
| startTime | Time | Session.startTime | No |
| endTime | Time | Session.endTime | No |
| attendanceStatus | Text | AttendanceSession.status | Composite index |
| rosterCount | Integer | Count AttendanceRecord | No |
| markedCount | Integer | Count records with marked status | No |
| presentCount | Integer | Status Present | No |
| absentCount | Integer | Status Absent | No |
| lateCount | Integer | Status Late | No |
| excusedCount | Integer | Status Excused | No |
| submittedAt | Timestamp | AttendanceSession.submittedAt | Index |
| lockedAt | Timestamp | AttendanceSession.lockedAt | No |
| dueAt | Timestamp | Derived from SLA | Index |
| isSlaBreached | Boolean | Derived | Index |
| lastCalculatedAt | Timestamp | Read model job | No |

#### v_attendance_pending_sessions

| Column | Type | Rule |
|---|---|---|
| attendanceSessionId | UUID | Include Draft, PendingSubmission, ReturnedForCorrection where sessionDate <= current date. |
| branchId | UUID | Mandatory branch filter. |
| batchId | UUID | Used for batch filter. |
| trainerId | UUID | Used for trainer scope. |
| courseId | UUID | Used for course filter. |
| sessionDate | Date | Used for aging. |
| dueAt | Timestamp | Submission due date/time. |
| pendingAgeHours | Decimal | `now - dueAt` in hours when dueAt passed. |
| pendingAgeBucket | Text | `Not Due`, `0-24h`, `24-48h`, `48-72h`, `72h+`. |
| returnedReason | Text | Latest return reason where status is ReturnedForCorrection. |
| actionRequiredByUserId | UUID | Trainer or coordinator depending on status. |

Recommended indexes:

```sql
CREATE INDEX idx_v_att_pending_branch_status_due ON attendance_pending_sessions(branch_id, attendance_status, due_at);
CREATE INDEX idx_v_att_pending_trainer_date ON attendance_pending_sessions(trainer_id, session_date);
CREATE INDEX idx_v_att_pending_batch ON attendance_pending_sessions(batch_id);
```

#### v_student_attendance_summary

| Column | Type | Rule |
|---|---|---|
| enrollmentId | UUID | One row per active enrollment. |
| studentProfileId | UUID | Student profile reference. |
| branchId | UUID | Enrollment branch. |
| courseId | UUID | Enrollment course. |
| batchId | UUID | Enrollment batch. |
| studentNumber | Text | From StudentProfile. |
| enrollmentNumber | Text | From Enrollment. |
| totalRequiredSessions | Integer | Count official attendance records. |
| presentCount | Integer | Present records. |
| lateCount | Integer | Late records. |
| excusedCount | Integer | Excused records. |
| absentCount | Integer | Absent records. |
| attendedWeightedCount | Decimal | Sum status weights. |
| attendancePercentage | Decimal(5,2) | Rounded percentage. |
| requiredPercentage | Decimal(5,2) | From CourseCompletionRule or AttendanceAlertRule. |
| attendanceEligible | Boolean | `attendancePercentage >= requiredPercentage` and no pending official blockers. |
| lowAttendanceSeverity | Text | None, Warning, Critical. |
| pendingCorrectionCount | Integer | Corrections affecting enrollment. |
| lastAttendanceDate | Date | Latest official record date. |
| lastCalculatedAt | Timestamp | Calculation time. |

Recommended indexes:

```sql
CREATE UNIQUE INDEX uq_v_student_att_summary_enrollment ON student_attendance_summary(enrollment_id);
CREATE INDEX idx_v_student_att_summary_branch_batch ON student_attendance_summary(branch_id, batch_id);
CREATE INDEX idx_v_student_att_summary_low ON student_attendance_summary(branch_id, low_attendance_severity, attendance_percentage);
CREATE INDEX idx_v_student_att_summary_student ON student_attendance_summary(student_profile_id);
```

#### v_student_attendance_history

| Column | Type | Rule |
|---|---|---|
| attendanceRecordId | UUID | AttendanceRecord.id. |
| enrollmentId | UUID | Enrollment reference. |
| studentProfileId | UUID | Student reference. |
| branchId | UUID | Branch scope. |
| sessionId | UUID | Source Session. |
| attendanceSessionId | UUID | AttendanceSession. |
| sessionNumber | Integer | Session sequence. |
| sessionTitle | Text | Session title. |
| sessionDate | Date | Session date. |
| startTime | Time | Session start. |
| endTime | Time | Session end. |
| trainerId | UUID | Trainer. |
| status | Text | Official status. |
| lateMinutes | Integer | Late minutes if status Late. |
| studentVisibleRemarks | Text | Only remarks marked visible to student. |
| internalRemarks | Text | Returned only with sensitive permission. |
| correctionApplied | Boolean | True when approved correction changed record. |
| percentageAfterSession | Decimal(5,2) | Running percentage. |

Recommended indexes:

```sql
CREATE INDEX idx_v_student_att_history_enrollment_date ON student_attendance_history(enrollment_id, session_date);
CREATE INDEX idx_v_student_att_history_student ON student_attendance_history(student_profile_id);
CREATE INDEX idx_v_student_att_history_branch_date ON student_attendance_history(branch_id, session_date);
```

#### v_attendance_low_student_risk

| Column | Type | Rule |
|---|---|---|
| enrollmentId | UUID | Active enrollment. |
| branchId | UUID | Branch scope. |
| courseId | UUID | Course filter. |
| batchId | UUID | Batch filter. |
| trainerId | UUID | Primary trainer where resolvable. |
| counselorId | UUID | From lead/admission where available. |
| corporateAccountId | UUID | Nullable. |
| attendancePercentage | Decimal(5,2) | Current percentage. |
| requiredPercentage | Decimal(5,2) | Required threshold. |
| varianceFromThreshold | Decimal(5,2) | `attendancePercentage - requiredPercentage`. |
| missedSessionCount | Integer | Count Absent records. |
| severity | Text | Warning or Critical. |
| alertStatus | Text | Open, Acknowledged, Resolved, Suppressed. |
| lastAlertSentAt | Timestamp | Latest notification request sent. |
| recommendedAction | Text | CounselorFollowUp, TrainerReview, StudentNotification, CorporateNotification. |

#### v_attendance_correction_register

| Column | Type | Rule |
|---|---|---|
| correctionId | UUID | AttendanceCorrection.id. |
| branchId | UUID | Branch from AttendanceSession. |
| attendanceRecordId | UUID | Record corrected. |
| attendanceSessionId | UUID | Session. |
| enrollmentId | UUID | Enrollment. |
| studentProfileId | UUID | Student. |
| oldStatus | Text | Old attendance status. |
| requestedNewStatus | Text | Requested status. |
| approvedNewStatus | Text | Final status if approved. |
| reasonCode | Text | Configured reason. |
| reasonText | Text | User-provided reason. |
| status | Text | Correction status. |
| requestedBy | UUID | User. |
| requestedAt | Timestamp | Timestamp. |
| approvedBy | UUID | Approver. |
| approvedAt | Timestamp | Timestamp. |
| rejectedAt | Timestamp | Timestamp. |
| rejectionReason | Text | Required for rejection. |
| lockedOverrideUsed | Boolean | True when locked record corrected by override permission. |
| auditLogId | UUID | Audit reference. |

#### v_completion_attendance_evidence

| Column | Type | Rule |
|---|---|---|
| enrollmentId | UUID | One row per enrollment. |
| branchId | UUID | Enrollment branch. |
| courseId | UUID | Course. |
| batchId | UUID | Batch. |
| studentProfileId | UUID | Student. |
| attendancePercentage | Decimal(5,2) | Official percentage. |
| requiredPercentage | Decimal(5,2) | Completion rule threshold. |
| attendanceEligible | Boolean | Percentage threshold met and no blocking pending records. |
| pendingAttendanceSessionCount | Integer | Sessions requiring official submission. |
| pendingCorrectionCount | Integer | Submitted corrections not resolved. |
| attendanceEvidenceStatus | Text | NotStarted, InProgress, Eligible, NotEligible, BlockedByPendingAttendance, BlockedByPendingCorrection. |
| evidenceGeneratedAt | Timestamp | Current calculation time. |

#### v_corporate_attendance_summary

| Column | Type | Rule |
|---|---|---|
| corporateAccountId | UUID | Corporate account. |
| contractId | UUID | Nullable. |
| branchId | UUID | Branch scope. |
| courseId | UUID | Course. |
| batchId | UUID | Batch. |
| totalParticipants | Integer | Count linked corporate participants. |
| averageAttendancePercentage | Decimal(5,2) | Average of participant percentages. |
| belowThresholdCount | Integer | Participants below required threshold. |
| criticalBelowThresholdCount | Integer | Participants below critical threshold. |
| eligibleParticipantCount | Integer | Attendance eligible count. |
| lastCalculatedAt | Timestamp | Refresh timestamp. |

### 7.3 Materialization Strategy

| Read Model | Recommended Type | Refresh Trigger | Maximum Staleness |
|---|---|---|---|
| Session status summary | Materialized table | Attendance session create/update/submit/lock/correction approve | 5 minutes dashboard; immediate for session page |
| Pending sessions | View or materialized table | Attendance status update and scheduled hourly scan | 5 minutes |
| Student attendance summary | Materialized table | Attendance submission and correction approval | Immediate for affected enrollment |
| Student attendance history | SQL view | Direct query with indexes | Real-time |
| Low student risk | Materialized table | Summary recalculation and alert detection | 15 minutes |
| Correction register | SQL view | Direct query | Real-time |
| Completion evidence | Materialized table | Summary recalculation | Immediate for affected enrollment |
| Corporate summary | Materialized table | Summary recalculation | 15 minutes |
| Monthly compliance | Materialized monthly aggregate | Nightly plus on-demand refresh | 24 hours except current month 30 minutes |

### 7.4 Read Model Refresh Events

| Event | Affected Read Models | Refresh Scope |
|---|---|---|
| AttendanceSessionCreated | Session status, pending sessions | Attendance session only |
| AttendanceRosterSynced | Session status | Attendance session only |
| AttendanceDraftSaved | Session status | Attendance session only |
| AttendanceSubmitted | Session status, student summaries, low risk, completion evidence, trainer compliance, branch health | Attendance session, affected enrollments, batch, trainer, branch |
| AttendanceLocked | Session status, audit trail | Attendance session only |
| AttendanceCorrectionSubmitted | Correction register, alert aging | Correction and affected enrollment |
| AttendanceCorrectionApproved | Student summary, low risk, completion evidence, correction register, audit trail | Affected record, enrollment, batch, branch |
| AttendanceCorrectionRejected | Correction register, alert aging | Correction only |
| LowAttendanceDetected | Low risk, alerts register, dashboard alerts | Enrollment and alert |
| EnrollmentCancelled | Student summary, batch summary, low risk | Enrollment and batch |
| BatchSessionCancelled | Pending sessions, session status, student summary | Session and affected enrollments |

---

## 8. Dashboard Query Performance Requirements

| Requirement ID | Requirement | Target |
|---|---|---|
| NFR-M08-RPT-001 | Dashboard metric card load time | p95 <= 800 ms for branch scope with 12-month data window |
| NFR-M08-RPT-002 | Dashboard table first page load | p95 <= 1200 ms for branch scope with default filters |
| NFR-M08-RPT-003 | Student self-service summary load | p95 <= 700 ms for authenticated student |
| NFR-M08-RPT-004 | Export preparation for <= 10,000 rows | p95 <= 30 seconds using server-side stream where supported |
| NFR-M08-RPT-005 | Export preparation for audit report <= 50,000 rows | p95 <= 90 seconds and must audit export initiation and completion |
| NFR-M08-RPT-006 | Read model refresh after attendance submission | Affected enrollment and session summaries refreshed within 10 seconds |
| NFR-M08-RPT-007 | Read model refresh after correction approval | Affected enrollment summary refreshed within 10 seconds |
| NFR-M08-RPT-008 | Consolidated dashboard load | p95 <= 2500 ms for authorized users across accessible branches |
| NFR-M08-RPT-009 | Maximum UI page size | 200 rows for operational reports, 100 rows for audit reports |
| NFR-M08-RPT-010 | Timezone handling | All date boundaries evaluated in Oman timezone UTC+4 |

---

## 9. Report Security and Audit Requirements

### 9.1 Permission Controls

| Report/Widget Area | Required Permission |
|---|---|
| Attendance operations dashboard | `attendance.dashboard.operations.read` |
| Trainer dashboard | `attendance.dashboard.trainer.read` |
| Academic dashboard | `attendance.dashboard.academic.read` |
| Branch dashboard | `attendance.dashboard.branch.read` |
| Executive dashboard | `attendance.dashboard.executive.read` + `attendance.consolidated.read` |
| Session register | `attendance.report.sessionRegister` |
| Batch summary | `attendance.report.batchSummary` |
| Student history internal | `attendance.report.studentHistory` |
| Student own history | `attendance.self.history.read` |
| Low attendance | `attendance.report.lowAttendance` |
| Correction register | `attendance.report.correctionRegister` |
| Audit report | `attendance.audit.read` |
| Export audit report | `attendance.audit.export` |
| Corporate summary | `attendance.report.corporateSummary` |

### 9.2 Data Masking Rules

| Data Field | Internal Admin | Trainer | Counselor | Student | Corporate Coordinator | Auditor |
|---|---|---|---|---|---|---|
| Student full name | Visible | Visible for assigned batch | Visible for assigned lead/student | Own only | Corporate participants only | Visible |
| Civil ID | Masked by default | Hidden | Hidden | Masked own | Hidden | Masked unless special PII permission |
| Passport number | Masked by default | Hidden | Hidden | Masked own | Hidden | Masked unless special PII permission |
| Phone | Visible with PII permission | Masked | Visible if counselor assignment allows | Own only | Hidden | Masked |
| Internal remarks | Visible with sensitive permission | Visible if authored or assigned session | Hidden unless permission | Hidden | Hidden | Visible |
| Student-visible remarks | Visible | Visible | Visible | Visible own | Visible corporate participant if portal-enabled | Visible |
| Audit old/new JSON | Audit users only | Hidden | Hidden | Hidden | Hidden | Visible |

### 9.3 Export Audit Events

Every export must write an `AuditLog` entry with:

| Field | Value |
|---|---|
| entityType | `AttendanceReportExport` |
| entityId | Generated export ID |
| action | `EXPORT_ATTENDANCE_REPORT` |
| oldValue | null |
| newValue | JSON containing report code, filters, branch scope, row count, format, checksum |
| performedBy | Authenticated user ID |
| performedAt | Current timestamp in UTC, display as Oman time in UI |
| ipAddress | Request IP |
| reason | User-provided reason when exporting audit trail or PII-bearing report |

---

## 10. Bilingual Dashboard and Report Requirements

| Area | English LTR | Arabic RTL |
|---|---|---|
| Dashboard layout | Cards left-to-right, charts left legends where default | Cards right-to-left, chart legends right aligned where supported |
| Table columns | Primary identifiers on left | Primary identifiers on right |
| Numeric values | Western Arabic numerals by default | Western Arabic numerals allowed; labels and headers in Arabic |
| Date format | `dd MMM yyyy`, Oman timezone | Arabic month labels when locale enabled, Oman timezone |
| PDF reports | English headers and LTR tables | Arabic headers, RTL table flow, right-aligned text columns |
| Export filenames | English report code and timestamp | Report code remains ASCII; display title localized inside file |
| Status labels | Present, Absent, Late, Excused | حاضر، غائب، متأخر، بعذر |
| Risk labels | Low, Medium, High, Critical | منخفض، متوسط، عالٍ، حرج |

---

## 11. Analytics Drill-Down Rules

| Source Widget | Drill-Down Target | Required Permission | Filter Carry-Forward |
|---|---|---|---|
| Pending Attendance Sessions | Pending Sessions Report | `attendance.report.pendingSessions` | Branch, trainer, date range, pending age bucket |
| Low Attendance Students | Low Attendance Report | `attendance.report.lowAttendance` | Branch, course, batch, severity |
| Correction Approval Queue | Correction Register | `attendance.report.correctionRegister` | Branch, correction status Submitted |
| Batch Attendance Risk | Batch Attendance Summary | `attendance.report.batchSummary` | Branch, batch, risk band |
| Trainer SLA | Trainer Compliance Report | `attendance.report.trainerCompliance` | Branch, trainer, month |
| Student Attendance Percentage | Student Attendance History | `attendance.self.history.read` or internal student history permission | Enrollment |
| Corporate Attendance Summary | Corporate Participant Attendance Table | `attendance.report.corporateSummary` | Corporate account, contract, batch |

---

## 12. Data Quality Checks for Reporting

| Check ID | Check | Severity | Remediation |
|---|---|---|---|
| DQ-M08-RPT-001 | AttendanceSession exists for conducted source Session | High | Create missing AttendanceSession through sync job or admin action. |
| DQ-M08-RPT-002 | AttendanceRecord count equals active enrollment roster count at roster generation time | Medium | Show roster mismatch and allow authorized roster sync before submission. |
| DQ-M08-RPT-003 | Submitted session has no Unmarked records unless override permission was used | High | Return session for correction or record override reason. |
| DQ-M08-RPT-004 | AttendanceRecord enrollment branch matches AttendanceSession branch | Critical | Block reporting row and create audit alert. |
| DQ-M08-RPT-005 | Student summary denominator equals official record count | High | Recalculate summary for enrollment. |
| DQ-M08-RPT-006 | Read model `lastCalculatedAt` older than maximum staleness | Medium | Mark dashboard data stale and trigger refresh. |
| DQ-M08-RPT-007 | Correction approved but old/new values missing in audit log | Critical | Block audit export and raise compliance issue. |
| DQ-M08-RPT-008 | Corporate report includes non-corporate enrollment | Critical | Block report response and create security audit event. |

---

## 13. Report API Response Expectations

Dashboard and report APIs must return both data and metadata.

```json
{
  "reportCode": "RPT-M08-ATT-004",
  "reportTitle": "Low Attendance Report",
  "generatedAt": "2026-07-04T08:30:00+04:00",
  "timezone": "Asia/Muscat",
  "branchScope": {
    "mode": "SINGLE_BRANCH",
    "branchIds": ["br_muscat_main"],
    "includeChildBranches": false
  },
  "filters": {
    "dateFrom": "2026-07-01",
    "dateTo": "2026-07-31",
    "severity": "Critical"
  },
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalRows": 12
  },
  "dataFreshness": {
    "lastCalculatedAt": "2026-07-04T08:28:15+04:00",
    "isStale": false
  },
  "rows": []
}
```

---

## 14. Implementation Notes for Next.js Modular Monolith

1. Attendance reports should be implemented inside `packages/attendance` with report query services and DTO mappers.
2. Shared branch scope guards should be imported from `packages/shared` or the platform authorization package.
3. Report APIs should use server-side pagination and never load all rows into memory for UI table views.
4. Exports should stream data where possible and record export audit logs before returning the file reference.
5. Materialized table refresh should be handled by internal jobs under the monorepo infrastructure jobs package; no external broker is required.
6. All report routes must validate filters using Zod and reject unsupported date ranges before querying.
7. Reports must not expose raw Prisma models directly; response DTOs must be report-specific.
8. Report SQL must include `branchId IN accessibleBranchIds` in the database query, not only after fetching rows.
9. Student self-service routes must derive `studentProfileId` from authenticated user context and must not accept arbitrary student IDs.
10. Corporate portal routes must derive `corporateAccountId` from authenticated corporate contact context and must not accept arbitrary corporate account IDs unless the user is internal.

---

## 15. Traceability to Functional Requirements

| Functional Requirement | Reporting / Analytics Coverage |
|---|---|
| FR-M08-ATT-001 Attendance Session Initialization | Session status summary, pending sessions report |
| FR-M08-ATT-002 Branch-Scoped Session Listing | All reports and dashboards enforce branch scope |
| FR-M08-ATT-003 Attendance Roster Generation | Session register, roster mismatch data quality checks |
| FR-M08-ATT-004 Manual Individual Attendance Marking | Student history, session register |
| FR-M08-ATT-005 Bulk Attendance Marking | Session status summary, audit trail |
| FR-M08-ATT-006 Save Draft Attendance | Pending sessions dashboard, trainer queue |
| FR-M08-ATT-007 Final Attendance Submission | Submission completion KPI, on-time KPI |
| FR-M08-ATT-008 Attendance Lock and Edit Restriction | Lock compliance KPI, audit trail |
| FR-M08-ATT-009 Attendance Correction Request | Correction register, correction request rate KPI |
| FR-M08-ATT-010 Attendance Correction Approval and Rejection | Correction approval rate, turnaround time KPI |
| FR-M08-ATT-011 Attendance Percentage Calculation | Student summary, batch summary, completion evidence |
| FR-M08-ATT-012 Low Attendance Detection | Low attendance widgets, alerts report |
| FR-M08-ATT-013 Pending Attendance Monitoring | Pending sessions dashboard and report |
| FR-M08-ATT-014 Attendance Reports and Exports | Complete report catalog and export audit requirements |
| FR-M08-ATT-015 Corporate Attendance Reporting | Corporate attendance dashboard and report |
| FR-M08-ATT-016 Completion Evidence API | Completion evidence report and read model |
| FR-M08-ATT-017 Attendance Audit Logging | Audit trail report and export logging |
| FR-M08-ATT-018 Soft Delete and Restore Controls | Audit report, data quality checks, read model recalculation |
| FR-M08-ATT-019 Bilingual Attendance Labels | Bilingual dashboard/report rules |
| FR-M08-ATT-020 Attendance Exception Handling | Data quality and stale read model handling |
