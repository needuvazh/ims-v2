# Part 8 - Reports, Dashboards, KPIs, Analytics

## Module 10 – Exam, Result & Completion Management

## 1. Purpose

This document defines the reporting, dashboard, KPI, analytics, export, and read-model requirements for Module 10 – Exam, Result & Completion Management.

The reporting layer is designed to provide operational and management visibility into:

```text
Exam scheduling and delivery readiness
Result recording and finalization progress
Pass/fail outcomes
Missing Result backlogs
Completion evaluation readiness
Completion eligibility outcomes
Approval workflow aging
Reevaluation exceptions
Trainer recommendation turnaround
Coordinator review turnaround
Final approval turnaround
Branch and Course performance
```

The reporting layer must remain read-only.

It must not:

- update `Exam`;
- update `Result`;
- update `CourseCompletion`;
- update `CompletionApproval`;
- calculate authoritative completion eligibility;
- create or revoke Certificates;
- alter Attendance;
- alter Finance payment validation;
- bypass branch authorization;
- replace transactional tables as the system of record.

---

# 2. Reporting Ownership Principles

## 2.1 Authoritative Transactional Sources

Module 10 authoritative transactional entities:

```text
Exam
Result
CourseCompletion
CompletionApproval
```

Referenced authoritative sources:

```text
Course                  → Course Catalog
CourseCompletionRule    → Course Catalog
Batch                   → Training Delivery
Enrollment              → Admission & Enrollment
StudentProfile          → Admission & Enrollment
Person                  → Shared Party model
Attendance evidence     → Attendance
Payment validation      → Finance & Receivables
TrainerProfile          → Faculty / Trainer
User                    → IAM
Branch                  → Organization
Certificate             → Certificate Management
AuditLog                → Audit & Compliance
```

## 2.2 Read Model Rule

Any read model, reporting view, materialized view, denormalized table, or analytics projection:

```text
IS READ-ONLY
IS DERIVED
IS REBUILDABLE
IS NOT AUTHORITATIVE
MUST NOT ACCEPT BUSINESS COMMANDS
MUST NOT BE USED TO MUTATE TRANSACTIONAL STATE
```

If reporting data disagrees with transactional truth:

```text
Transactional owner wins.
Read model must be repaired or rebuilt.
```

---

# 3. KPI Catalog

## 3.1 KPI Naming Convention

Recommended KPI code format:

```text
KPI-EXC-xxx
```

Each KPI must define:

```text
Business Meaning
Formula
Numerator
Denominator
Time Basis
Branch Scope
Data Source
Freshness Target
Permission
```

---

# 4. Exam KPIs

## KPI-EXC-001 — Exams Scheduled

**Definition:** Number of active Exams scheduled within selected period.

Formula:

```text
COUNT(Exam)
WHERE Exam.status in scheduled/open/closed states
AND Exam.examDate within selected period
AND soft-delete filter passes
```

Dimensions:

```text
Branch
Course
Batch
Month
Exam Status
```

Primary users:

```text
Academic Administrator
Academic Coordinator
Branch Manager
Executive Viewer
```

Permission:

```text
dashboard.exam-completion.exams-pending
or
report.exam-register.read
```

---

## KPI-EXC-002 — Exams Awaiting Activation

**Definition:** Count of scheduled Exams not yet opened for Result entry.

Formula:

```text
COUNT(Exam)
WHERE functionalState = SCHEDULED
AND examDate <= configured operational reference date/time
```

Note:

The exact overdue threshold must be configuration-driven.

---

## KPI-EXC-003 — Exam Cancellation Rate

Formula:

```text
Cancelled Exams
÷
Total Exams Created or Scheduled in period
× 100
```

Required display:

```text
Percentage
Numerator
Denominator
Trend vs previous comparable period
```

---

## KPI-EXC-004 — Average Exam-to-Result Recording Delay

Formula:

```text
AVG(first Result.recordedAt - Exam.examDate/time reference)
```

Caution:

If Exam has date-only precision, interpretation of delay must use agreed operational convention.

---

# 5. Result KPIs

## KPI-EXC-005 — Result Recording Completion Rate

Formula:

```text
Recorded eligible Result rows
÷
Eligible Exam roster rows
× 100
```

Eligibility roster source:

```text
Enrollment + Exam Course/Batch relationship
```

Do not use Result row count alone as denominator.

---

## KPI-EXC-006 — Missing Result Count

Formula:

```text
Eligible roster rows
-
valid current Result rows
```

Dimensions:

```text
Branch
Course
Batch
Exam
Trainer
Age Bucket
```

Age buckets:

```text
0–1 day
2–3 days
4–7 days
8+ days
```

Exact buckets may be configuration-driven.

---

## KPI-EXC-007 — Result Finalization Rate

Formula:

```text
Finalized Result count
÷
Recorded Result count
× 100
```

Requires validated finalization lifecycle persistence or read-model derivation from audit/lifecycle representation.

---

## KPI-EXC-008 — Exam Pass Rate

Formula:

```text
Passed Result count
÷
Finalized eligible Result count
× 100
```

Rules:

- exclude missing Results from denominator;
- exclude unfinalized Results unless reporting policy explicitly includes provisional outcomes;
- identify provisional vs finalized reporting if both are supported.

---

## KPI-EXC-009 — Exam Fail Rate

Formula:

```text
Failed finalized Result count
÷
Finalized eligible Result count
× 100
```

---

## KPI-EXC-010 — Average Marks Percentage

Formula:

```text
AVG(
  marksObtained / maxMarks * 100
)
```

Guard:

```text
maxMarks > 0
```

Dimensions:

```text
Course
Batch
Exam
Branch
Trainer
Month
```

---

## KPI-EXC-011 — Result Correction Rate

Formula:

```text
Number of finalized Results corrected in period
÷
Number of finalized Results in period
× 100
```

Authoritative source:

```text
Result current state
+
AuditLog or approved correction-history projection
```

Purpose:

- detect data-quality issues;
- monitor transcription/control effectiveness.

This KPI must not be used automatically to punish staff without contextual review.

---

# 6. Completion KPIs

## KPI-EXC-012 — Completion Evaluation Rate

Formula:

```text
Enrollments with current CourseCompletion evaluation
÷
Enrollments eligible for completion evaluation
× 100
```

Eligibility denominator must come from Enrollment lifecycle criteria.

---

## KPI-EXC-013 — Completion Approval Rate

Formula:

```text
Approved CourseCompletion records
÷
Final-decision CourseCompletion records
× 100
```

Final decision statuses:

```text
Approved
Rejected
```

Do not include still-pending cases.

---

## KPI-EXC-014 — Completion Eligibility Rate

Formula:

```text
Completion evaluations where all mandatory criteria passed
÷
Completed evaluation attempts with sufficient evidence
× 100
```

Important:

This KPI is a reporting interpretation of Module 10 outcomes.

The report must not recalculate authoritative completion eligibility independently from raw Attendance/Finance data.

---

## KPI-EXC-015 — Evidence Incomplete Rate

Formula:

```text
CourseCompletion evaluations in EvidenceIncomplete/PendingEvidence state
÷
Total evaluated CourseCompletion records
× 100
```

Use actual schema-mapped functional states.

---

## KPI-EXC-016 — Average Completion Evaluation Turnaround Time

Formula:

```text
AVG(
  first successful completion evaluation timestamp
  -
  evaluation-ready timestamp
)
```

`evaluation-ready timestamp` must be defined by supported event/read-model data.

If unavailable, use a documented proxy and label it clearly.

---

## KPI-EXC-017 — Average Completion Approval Cycle Time

Formula:

```text
AVG(
  final decision timestamp
  -
  manual approval workflow start timestamp
)
```

Breakdown by stage:

```text
Trainer Recommendation time
Coordinator Review time
Final Approval time
Total cycle time
```

---

## KPI-EXC-018 — Reevaluation Exception Rate

Formula:

```text
CourseCompletion records entering reevaluation/exception state
÷
Approved or evaluated CourseCompletion records
× 100
```

Purpose:

- monitor post-decision evidence instability;
- identify quality or process issues.

---

## KPI-EXC-019 — Approval Rejection Rate

Formula:

```text
Rejected Completion workflows
÷
Completion workflows reaching manual approval
× 100
```

Breakdown:

```text
Trainer non-recommendation
Coordinator rejection
Final rejection
```

---

# 7. Workflow KPIs

## KPI-EXC-020 — Pending Approval Count

Count by stage:

```text
Trainer Recommendation
Coordinator Review
Final Approval
Reevaluation Exception
```

---

## KPI-EXC-021 — Approval Queue Aging

Measure pending items by age:

```text
0–1 day
2–3 days
4–7 days
8+ days
```

Display:

```text
count
percentage of queue
oldest pending age
average pending age
```

---

## KPI-EXC-022 — Trainer Recommendation SLA Compliance

Formula:

```text
Recommendations completed within configured SLA
÷
Recommendations completed
× 100
```

SLA duration must come from configuration/NFR policy.

---

## KPI-EXC-023 — Coordinator Review SLA Compliance

Same pattern.

---

## KPI-EXC-024 — Final Approval SLA Compliance

Same pattern.

---

# 8. Branch and Course Analytics KPIs

## KPI-EXC-025 — Branch Pass Rate

Formula:

```text
Passed finalized Results in branch
÷
Finalized Results in branch
× 100
```

Branch derived through:

```text
Result
→ Exam
→ Batch
→ Branch
```

---

## KPI-EXC-026 — Course Completion Rate

Formula:

```text
Approved CourseCompletion records
÷
eligible completed/decision-ready Enrollments
× 100
```

The denominator definition must be agreed with Admission & Enrollment lifecycle policy.

---

## KPI-EXC-027 — Batch Result Completion Rate

Formula:

```text
Recorded Results for Batch Exams
÷
eligible roster rows for Batch Exams
× 100
```

---

## KPI-EXC-028 — Trainer Academic Task Backlog

Count of assigned pending tasks:

```text
Results to record
Trainer Recommendations pending
Result attention items where policy assigns Trainer
```

Scope:

```text
Own-assignment only
```

---

# 9. KPI Freshness Classes

| Freshness Class   | Target                                | Suitable KPIs                                |
| ----------------- | ------------------------------------- | -------------------------------------------- |
| F1 Near-real-time | < 1 minute where architecture permits | Pending queue counts, result progress        |
| F2 Operational    | < 15 minutes                          | Completion evaluation status, approval aging |
| F3 Analytical     | Daily or scheduled refresh            | Trend KPIs, branch comparisons               |
| F4 Snapshot       | Period close / monthly                | Executive trend snapshots                    |

Exact implementation must match architecture capabilities.

Do not claim real-time if using a scheduled materialized view.

---

# 10. Dashboard Inventory

## 10.1 Module Operational Dashboard

Dashboard code:

```text
dashboard.exam-completion.operations
```

Primary users:

```text
Academic Administrator
Academic Coordinator
Branch Manager
```

Permissions:

```text
menu.exam-completion.dashboard
exam-completion.dashboard.read
```

Widgets are additionally permission-gated.

---

# 11. Dashboard Widget Specifications

## 11.1 WDG-EXC-001 — Exams Awaiting Activation

Type:

```text
Metric Card
```

Displays:

```text
count
oldest scheduled Exam date
change from previous period
```

Permission:

```text
dashboard.exam-completion.exams-pending
```

Scope:

```text
B or C
```

Click-through:

```text
Exam List filtered by Scheduled state
```

---

## 11.2 WDG-EXC-002 — Missing Results

Type:

```text
Metric Card + Drilldown
```

Displays:

```text
missing Result count
affected Exams
oldest missing age
```

Permission:

```text
dashboard.exam-completion.missing-results
```

Scope:

```text
B
O for Trainer
C for consolidated viewers
```

---

## 11.3 WDG-EXC-003 — Results Awaiting Finalization

Type:

```text
Metric Card
```

Permission:

```text
dashboard.exam-completion.results-finalization
```

Click-through:

```text
Result Finalization queue
```

---

## 11.4 WDG-EXC-004 — Pending Completion Evaluations

Type:

```text
Metric Card
```

Displays:

```text
pending count
evidence incomplete count
oldest pending age
```

Permission:

```text
dashboard.exam-completion.evaluation-pending
```

---

## 11.5 WDG-EXC-005 — Trainer Recommendations Pending

Type:

```text
Metric Card + Aging Distribution
```

Permission:

```text
dashboard.exam-completion.trainer-pending
```

Trainer view:

```text
Own assignment only
```

Manager view:

```text
Branch or consolidated read scope
```

---

## 11.6 WDG-EXC-006 — Coordinator Reviews Pending

Permission:

```text
dashboard.exam-completion.coordinator-pending
```

Displays:

```text
count
average age
oldest age
SLA breach count
```

---

## 11.7 WDG-EXC-007 — Final Approvals Pending

Permission:

```text
dashboard.exam-completion.final-approval-pending
```

Scope:

```text
Branch Manager: B
Executive Viewer: C
```

Transactional approval button must not be present in consolidated-report-only view.

---

## 11.8 WDG-EXC-008 — Reevaluation Exceptions

Type:

```text
High-Priority Metric Card
```

Displays:

```text
total exceptions
approved-completion exceptions
certificate-impact cases where Certificate context exposes status
oldest unresolved
```

Permission:

```text
dashboard.exam-completion.reevaluation-exceptions
```

---

## 11.9 WDG-EXC-009 — Exam Pass Rate Trend

Type:

```text
Line Chart
```

X-axis:

```text
Month / Week / selected period
```

Y-axis:

```text
Pass Rate %
```

Series options:

```text
Overall
Branch
Course
```

Permission:

```text
dashboard.exam-completion.pass-rate
```

---

## 11.10 WDG-EXC-010 — Completion Rate Trend

Type:

```text
Line or Column Chart
```

Permission:

```text
dashboard.exam-completion.completion-rate
```

---

## 11.11 WDG-EXC-011 — Approval Aging by Stage

Type:

```text
Stacked Bar Chart
```

Buckets:

```text
0–1 day
2–3 days
4–7 days
8+ days
```

Stages:

```text
Trainer Recommendation
Coordinator Review
Final Approval
Reevaluation Exception
```

Permission:

```text
dashboard.exam-completion.approval-aging
```

---

## 11.12 WDG-EXC-012 — Result Recording Progress by Batch

Type:

```text
Progress Table
```

Columns:

```text
Batch
Course
Exam
Eligible
Recorded
Missing
Finalized
Completion %
```

Permission:

```text
dashboard.exam-completion.result-progress
```

---

# 12. Dashboard Permission Scope Matrix

| Widget                    | Permission                                          | Branch Scope | Consolidated View | Own Assignment |
| ------------------------- | --------------------------------------------------- | -----------: | ----------------: | -------------: |
| Exams Awaiting Activation | `dashboard.exam-completion.exams-pending`           |          Yes |               Yes |             No |
| Missing Results           | `dashboard.exam-completion.missing-results`         |          Yes |               Yes |            Yes |
| Results Finalization      | `dashboard.exam-completion.results-finalization`    |          Yes |               Yes |       Optional |
| Evaluation Pending        | `dashboard.exam-completion.evaluation-pending`      |          Yes |               Yes |             No |
| Trainer Pending           | `dashboard.exam-completion.trainer-pending`         |          Yes |               Yes |            Yes |
| Coordinator Pending       | `dashboard.exam-completion.coordinator-pending`     |          Yes |               Yes |             No |
| Final Approval Pending    | `dashboard.exam-completion.final-approval-pending`  |          Yes |               Yes |             No |
| Reevaluation Exceptions   | `dashboard.exam-completion.reevaluation-exceptions` |          Yes |               Yes |             No |
| Pass Rate Trend           | `dashboard.exam-completion.pass-rate`               |          Yes |               Yes |       Optional |
| Completion Rate Trend     | `dashboard.exam-completion.completion-rate`         |          Yes |               Yes |             No |
| Approval Aging            | `dashboard.exam-completion.approval-aging`          |          Yes |               Yes |             No |
| Result Progress           | `dashboard.exam-completion.result-progress`         |          Yes |               Yes |            Yes |

---

# 13. Operational Report Catalog

## RPT-EXC-001 — Exam Register

Purpose:

Provide complete branch-scoped Exam registry.

Permission:

```text
report.exam-register.read
```

Filters:

```text
Branch
Course
Batch
Exam Date From
Exam Date To
Status
Exam Name search
```

Columns:

```text
Exam ID / Reference
Exam Name
Course Code
Course Name
Batch Code
Batch Name
Branch
Exam Date
Maximum Marks
Pass Marks
Status
Eligible Roster Count
Recorded Result Count
Finalized Result Count
Created At
Updated At
```

Sorting:

```text
Exam Date
Exam Name
Course
Batch
Status
Updated At
```

Default sort:

```text
Exam Date DESC
```

Export:

```text
CSV
XLSX
PDF
```

---

## RPT-EXC-002 — Result Register

Permission:

```text
report.result-register.read
```

Filters:

```text
Branch
Course
Batch
Exam
Exam Date Range
Result Outcome
Result Lifecycle
Student Number
Enrollment Number
Student Name
Recorded By
```

Columns:

```text
Enrollment Number
Student Number
Student Name
Course
Batch
Exam Name
Exam Date
Marks Obtained
Maximum Marks
Marks Percentage
Pass Marks
Grade
Result Outcome
Result Lifecycle State
Recorded By
Recorded At
Finalized At if available
Last Corrected At if available through audit projection
```

Sorting:

```text
Student Name
Enrollment Number
Exam Date
Marks Obtained
Result Outcome
Recorded At
```

Export:

```text
CSV
XLSX
PDF
```

PII rule:

Do not include Civil ID, passport, or visa fields by default.

---

## RPT-EXC-003 — Missing Results Report

Permission:

```text
report.missing-results.read
```

Filters:

```text
Branch
Course
Batch
Exam
Trainer
Exam Date Range
Age Bucket
```

Columns:

```text
Exam Name
Exam Date
Course
Batch
Branch
Enrollment Number
Student Number
Student Name
Assigned Trainer(s)
Days Pending
Pending Reason
```

Sorting:

```text
Days Pending DESC
Exam Date ASC
Student Name ASC
```

Export:

```text
CSV
XLSX
PDF
```

---

## RPT-EXC-004 — Result Finalization Status Report

Permission:

```text
report.result-finalization.read
```

Filters:

```text
Branch
Course
Batch
Exam
Finalization State
Date Range
```

Columns:

```text
Exam
Course
Batch
Branch
Eligible Count
Recorded Count
Finalized Count
Unfinalized Count
Finalization Rate
Oldest Unfinalized Result Age
```

Sorting:

```text
Finalization Rate ASC
Unfinalized Count DESC
Exam Date ASC
```

---

## RPT-EXC-005 — Exam Performance Report

Permission:

```text
report.exam-performance.read
```

Filters:

```text
Branch
Course
Batch
Exam
Exam Date Range
Trainer
```

Columns:

```text
Exam
Course
Batch
Branch
Eligible Count
Finalized Result Count
Passed Count
Failed Count
Pass Rate
Fail Rate
Average Marks Percentage
Highest Marks
Lowest Marks
```

Sorting:

```text
Pass Rate
Average Marks Percentage
Exam Date
```

Export:

```text
CSV
XLSX
PDF
```

---

## RPT-EXC-006 — Completion Evaluation Report

Permission:

```text
report.completion-evaluation.read
```

Filters:

```text
Branch
Course
Batch
Completion Status
Attendance Outcome
Exam Outcome
Payment Outcome
Evaluation Date Range
Evidence State
```

Columns:

```text
Enrollment Number
Student Number
Student Name
Course
Batch
Branch
Attendance Percentage
Attendance Outcome
Exam Required
Exam Outcome
Payment Required
Payment Outcome
Manual Approval Required
Completion Status
Last Evaluated At
Evidence Stale Flag
```

Sorting:

```text
Last Evaluated At
Completion Status
Student Name
```

Export:

```text
CSV
XLSX
PDF
```

---

## RPT-EXC-007 — Completion Approval Report

Permission:

```text
report.completion-approval.read
```

Filters:

```text
Branch
Course
Batch
Current Approval Stage
Completion Status
Trainer
Coordinator
Final Approver
Decision Date Range
Pending Age Bucket
```

Columns:

```text
Enrollment Number
Student Name
Course
Batch
Branch
Completion Status
Trainer Recommendation Status
Trainer Actor
Trainer Action Date
Coordinator Review Status
Coordinator Actor
Coordinator Action Date
Final Approval Status
Final Approver
Final Decision Date
Total Approval Cycle Time
Current Pending Age
```

Sorting:

```text
Current Pending Age DESC
Final Decision Date DESC
Student Name ASC
```

Export:

```text
CSV
XLSX
PDF
```

---

## RPT-EXC-008 — Reevaluation Exception Report

Permission:

```text
report.reevaluation-exception.read
```

Filters:

```text
Branch
Course
Batch
Trigger Type
Previous Status
Current Status
Certificate Impact Flag
Triggered Date Range
Exception State
```

Columns:

```text
Enrollment Number
Student Name
Course
Batch
Branch
Trigger Type
Trigger Reference
Triggered At
Previous Completion Status
Current Completion Status
Outcome Changed
Approval History Preserved
Certificate Impact Flag
Current Exception State
Resolved At
```

Sorting:

```text
Triggered At DESC
Exception Age DESC
Certificate Impact Flag DESC
```

---

## RPT-EXC-009 — Trainer Recommendation Status Report

Permission:

```text
report.trainer-recommendation.read
```

Filters:

```text
Branch
Course
Batch
Trainer
Recommendation Status
Pending Age Bucket
Action Date Range
```

Columns:

```text
Trainer Code
Trainer Name
Course
Batch
Enrollment Number
Student Name
Recommendation Status
Requested At
Acted At
Turnaround Time
SLA Status
```

Sorting:

```text
Turnaround Time DESC
Pending Age DESC
Trainer Name ASC
```

---

## RPT-EXC-010 — Approval SLA Report

Permission:

```text
report.completion-approval-sla.read
```

Filters:

```text
Branch
Stage
Status
Date Range
SLA Breach only
```

Columns:

```text
Stage
Branch
Course
Batch
Enrollment Number
Assigned/Acting User
Requested At
Acted At
Elapsed Time
SLA Target
SLA Status
```

Sorting:

```text
SLA Breach DESC
Elapsed Time DESC
Stage
```

---

## RPT-EXC-011 — Result Correction Audit Report

Permission:

```text
report.exam-completion.audit.read
```

Filters:

```text
Branch
Course
Batch
Exam
Corrected By
Correction Date Range
Result Outcome Change
```

Columns:

```text
Result ID
Enrollment Number
Student Name
Exam
Course
Batch
Old Marks
New Marks
Old Result Status
New Result Status
Correction Reason
Corrected By
Corrected At
Completion Reevaluation Triggered
```

Sorting:

```text
Corrected At DESC
Corrected By
Exam
```

Export:

```text
CSV
XLSX
PDF
```

---

## RPT-EXC-012 — Branch Academic Outcome Summary

Permission:

```text
report.exam-completion.consolidated
```

Scope:

```text
Consolidated-report only
```

Filters:

```text
Branch set
Period
Course
Course Category if available through Course Catalog read model
```

Columns:

```text
Branch
Exams Scheduled
Eligible Result Rows
Results Recorded
Result Recording Rate
Pass Rate
Completion Evaluation Rate
Completion Approval Rate
Pending Approval Count
Reevaluation Exception Count
```

Sorting:

```text
Branch
Pass Rate
Completion Approval Rate
Pending Approval Count
```

Export:

```text
CSV
XLSX
PDF
```

No mutation drilldown.

---

# 14. Report Filter Behavior

## 14.1 Branch Filter

- options limited to effective read scope;
- consolidated permission enables multi-branch selection;
- branch filter narrows scope only;
- client-selected branch never expands access.

## 14.2 Course and Batch Filters

Behavior:

```text
Select Course
→ Batch options narrow to valid Course Batches

Select Branch
→ Batch options narrow to Branch Batches
```

The server validates all IDs independently.

## 14.3 Date Range

Rules:

```text
dateFrom <= dateTo
maximum range according to export/report policy
canonical date handling
localized UI rendering
```

## 14.4 Student Search

Search fields:

```text
Student Number
Enrollment Number
Display Name
```

Do not expose sensitive identity identifiers by default.

---

# 15. Export Rules

Supported where platform capability exists:

```text
CSV
XLSX
PDF
```

## 15.1 CSV

Requirements:

- UTF-8;
- protect against spreadsheet formula injection;
- localized headers when requested;
- canonical numeric values;
- stable column order.

## 15.2 XLSX

Requirements:

- localized headers;
- typed date and numeric cells where feasible;
- freeze header row;
- autofilter;
- no macros.

## 15.3 PDF

Requirements:

- portrait or landscape based on report;
- English/Arabic font support through approved application fonts;
- RTL table rendering for Arabic;
- page numbers;
- report title;
- generated timestamp;
- branch/report scope summary.

---

# 16. Read Model Strategy

## 16.1 Principle

Transactional queries for simple entity detail may use primary tables directly.

Complex operational and analytical queries should use:

```text
database views
materialized views
denormalized read tables
reporting projections
```

only when needed for performance.

Every read model must be:

```text
read-only
rebuildable
derived from authoritative source
versioned/migrated with schema
excluded from domain command repositories
```

---

# 17. Recommended Read Models

## RM-EXC-001 — Exam Operational Summary

Purpose:

Support:

```text
Exam List
Module Dashboard
Exam Register
Result Progress widgets
```

Suggested shape:

```text
exam_id
exam_name
exam_date
exam_status
course_id
course_code
course_name_en
course_name_ar
batch_id
batch_code
batch_name
branch_id
branch_name
eligible_roster_count
recorded_result_count
finalized_result_count
missing_result_count
pass_count
fail_count
updated_at
read_model_refreshed_at
```

Source tables:

```text
Exam
Batch
Course
Enrollment
Result
Branch
```

Read-only rule:

No application command may update this view/model.

---

## RM-EXC-002 — Result Roster Read Model

Purpose:

Support:

```text
Result Entry roster
Missing Result Report
Result Register
Bulk Result validation context
```

Suggested shape:

```text
exam_id
enrollment_id
enrollment_number
student_profile_id
student_number
student_display_name
course_id
batch_id
branch_id
enrollment_status
result_id
marks_obtained
grade
result_status
result_lifecycle_state
recorded_by
recorded_at
result_version
is_result_missing
```

Important:

Bulk Result command must still validate against transactional authoritative tables before write.

The read model cannot be trusted as final authorization truth.

---

## RM-EXC-003 — Completion Evaluation Summary

Purpose:

Support:

```text
Completion Evaluation Queue
Completion Evaluation Report
Completion Status screen
```

Suggested shape:

```text
course_completion_id
enrollment_id
enrollment_number
student_number
student_display_name
course_id
course_name_en
course_name_ar
batch_id
batch_code
branch_id
completion_status
attendance_percentage
attendance_outcome
exam_required
exam_outcome
payment_required
payment_outcome
manual_approval_required
certificate_allowed
evidence_stale
last_evaluated_at
completion_version
read_model_refreshed_at
```

Important:

This is a rendering/query model.

Authoritative evaluation must still be executed by the Module 10 domain/application service.

---

## RM-EXC-004 — Completion Approval Queue

Purpose:

Support:

```text
Trainer Recommendation Queue
Coordinator Review Queue
Final Approval Queue
Approval Aging widget
Approval SLA report
```

Suggested shape:

```text
course_completion_id
enrollment_id
enrollment_number
student_display_name
course_id
course_name
batch_id
batch_code
branch_id
completion_status
current_approval_level
current_approval_status
pending_since
pending_age_seconds
trainer_profile_id
trainer_display_name
coordinator_user_id
final_approver_user_id
evidence_stale
completion_version
```

Authorization note:

Trainer query additionally intersects:

```text
trainer_profile_id / authorized Batch assignment
```

---

## RM-EXC-005 — Completion Reevaluation Exception View

Purpose:

Support:

```text
Reevaluation Queue
Exception dashboard
Reevaluation report
```

Suggested shape:

```text
course_completion_id
enrollment_id
enrollment_number
student_display_name
course_id
batch_id
branch_id
previous_completion_status
current_completion_status
trigger_type
trigger_reference
triggered_at
outcome_changed
approval_history_preserved
certificate_impact_flag
exception_state
resolved_at
```

Certificate impact must come from an approved read contract from Certificate Management.

---

## RM-EXC-006 — Academic KPI Daily Snapshot

Purpose:

Support:

```text
trend charts
executive dashboards
branch comparisons
historical period analysis
```

Suggested shape:

```text
snapshot_date
branch_id
course_id nullable
metric_code
metric_value
numerator nullable
denominator nullable
metadata_json
calculated_at
source_watermark
```

Potential implementation:

```text
MetricSnapshot
```

owned by Reporting & Dashboards context.

Module 10 does not own this transactional table.

---

# 18. Database View Recommendations

## VW-EXC-001 — `vw_exam_result_progress`

Conceptual query:

```sql
SELECT
  e.id AS exam_id,
  e.batch_id,
  b.branch_id,
  COUNT(DISTINCT enr.id) AS eligible_count,
  COUNT(DISTINCT r.id) AS recorded_count,
  COUNT(DISTINCT CASE WHEN result_is_finalized THEN r.id END)
    AS finalized_count
FROM exam e
JOIN batch b
  ON b.id = e.batch_id
JOIN enrollment enr
  ON enr.batch_id = e.batch_id
 AND enr.course_id = e.course_id
LEFT JOIN result r
  ON r.exam_id = e.id
 AND r.enrollment_id = enr.id
 AND r.deleted_at IS NULL
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.batch_id, b.branch_id;
```

`result_is_finalized` is conceptual and must map to actual schema.

---

## VW-EXC-002 — `vw_missing_results`

Conceptual purpose:

```text
Eligible Enrollment roster
LEFT JOIN Result
WHERE Result is missing
```

Columns:

```text
exam_id
exam_date
enrollment_id
enrollment_number
student_profile_id
course_id
batch_id
branch_id
trainer references through approved relationship
days_pending
```

---

## VW-EXC-003 — `vw_completion_approval_queue`

Conceptual purpose:

Provide current workflow stage and aging.

Columns:

```text
course_completion_id
enrollment_id
branch_id
current_stage
current_stage_status
pending_since
pending_age_seconds
```

Do not infer approval stage purely from arbitrary row ordering.

Use explicit workflow state plus approval records.

---

# 19. Materialized View Candidates

Use materialized views only where:

- query cost justifies them;
- freshness requirements allow it;
- refresh mechanism is operationally supported.

Candidates:

```text
mv_exam_performance_daily
mv_completion_rate_daily
mv_approval_sla_daily
mv_branch_academic_summary_daily
```

Refresh examples:

```text
hourly
daily
on-demand after ETL/report cycle
```

Do not describe a materialized view as real-time unless refresh is real-time.

---

# 20. Read Model Refresh and Consistency

## 20.1 Consistency Model

Transactional screens:

```text
stronger consistency
direct primary table/application query where needed
```

Operational queue:

```text
near-real-time projection acceptable if freshness displayed
```

Executive analytics:

```text
eventual consistency acceptable
```

## 20.2 Freshness Metadata

Every derived read model should expose:

```text
read_model_refreshed_at
source_watermark
```

UI may display:

```text
Last refreshed: 10:15 AM
```

## 20.3 Stale Projection Handling

If read model is stale:

- do not block authoritative direct command validation;
- command handler reloads transactional state;
- UI may show stale warning if threshold exceeded;
- repair/rebuild projection.

---

# 21. Read-Only Enforcement

## 21.1 Application Layer

Command repositories must not depend on reporting views.

Prohibited:

```text
ApproveCompletionCommand
→ UPDATE rm_completion_approval_queue
```

Required:

```text
ApproveCompletionCommand
→ validate authoritative CourseCompletion
→ update CourseCompletion
→ update CompletionApproval
→ commit
→ read model refresh/project
```

## 21.2 Database Layer

Recommended:

- reporting DB user has SELECT-only access to transactional tables/views;
- application reporting repository uses read-only connection where architecture supports it;
- views/materialized views do not expose INSTEAD OF UPDATE rules;
- no business trigger updates source state from reporting view.

## 21.3 API Layer

Reporting endpoints:

```text
GET reports
GET dashboards
POST export generation request
```

must not include hidden mutation behavior.

---

# 22. Read Model Ownership Matrix

| Read Model                    | Owner                                        | Source Contexts                                   | Authoritative? |
| ----------------------------- | -------------------------------------------- | ------------------------------------------------- | -------------: |
| Exam Operational Summary      | Module 10 query layer                        | Module 10, Course, Batch, Enrollment, Branch      |             No |
| Result Roster View            | Module 10 query layer                        | Module 10, Enrollment, Person                     |             No |
| Completion Evaluation Summary | Module 10 query layer                        | Module 10 + delegated evidence summaries          |             No |
| Completion Approval Queue     | Module 10 query layer                        | Module 10, Enrollment, Trainer, IAM display refs  |             No |
| Reevaluation Exception View   | Module 10 query layer                        | Module 10 + Certificate read status where allowed |             No |
| KPI Daily Snapshot            | Reporting & Dashboards                       | Multiple contexts                                 |             No |
| Dashboard Widget Projection   | Reporting & Dashboards or module query layer | Multiple contexts                                 |             No |

---

# 23. Dashboard Query Contracts

## 23.1 Operations Dashboard Query

Conceptual contract:

```ts
type GetExamCompletionDashboardQuery = {
  branchIds?: string[];
  periodFrom: string;
  periodTo: string;
};

type ExamCompletionDashboardDTO = {
  scope: {
    branchIds: string[];
    mode: 'SINGLE_BRANCH' | 'MULTI_BRANCH' | 'CONSOLIDATED';
  };
  refreshedAt: string;
  metrics: {
    examsAwaitingActivation: number;
    missingResults: number;
    resultsAwaitingFinalization: number;
    pendingCompletionEvaluations: number;
    trainerRecommendationsPending: number;
    coordinatorReviewsPending: number;
    finalApprovalsPending: number;
    reevaluationExceptions: number;
  };
};
```

---

# 24. Analytics Drilldown Rules

A dashboard metric drilldown must preserve:

```text
same branch scope
same date range
same Course/Batch filters
same permission scope
```

Example:

```text
Missing Results = 14

click
→ Missing Results Report
→ same authorized Branch set
→ same selected period
```

Drilldown must not expand scope.

---

# 25. Student and Trainer Analytics

## 25.1 Trainer Analytics

Applicable when Trainer Portal is enabled.

Allowed own-assignment metrics:

```text
My Exams
My Missing Results
My Result Recording Rate
My Pending Recommendations
My Recommendation Turnaround
```

Do not expose:

```text
other Trainer performance
branch-wide sensitive comparison
financial data
```

unless explicit permission granted.

## 25.2 Student Analytics

Student Portal should not expose management analytics.

Allowed:

```text
My Exams
My finalized Results
My completion status
My completion evidence summary
```

No peer comparison by default.

---

# 26. Privacy and Data Minimization

Reports should use:

```text
Student Number
Enrollment Number
Display Name
Course
Batch
Academic outcomes
```

Avoid by default:

```text
Civil ID
Passport Number
Visa Number
Personal address
Full payment transaction history
Sensitive audit remarks
```

Audit reports may include more detail only with dedicated permission.

---

# 27. Analytics Data Quality Rules

## DQ-EXC-001

Eligible Result denominator must come from valid Enrollment roster, not Result count.

## DQ-EXC-002

Pass rate must clearly state whether denominator uses finalized Results only.

## DQ-EXC-003

Completion rate denominator must document Enrollment lifecycle eligibility.

## DQ-EXC-004

Stale evidence flags must not be ignored in operational reports.

## DQ-EXC-005

Corrected Results must contribute current authoritative outcome to current-period state reports while correction events remain separately auditable.

## DQ-EXC-006

Read model refresh time must be available.

## DQ-EXC-007

Cross-branch consolidated totals must not double-count shared records.

## DQ-EXC-008

Soft-deleted rows must be excluded unless report explicitly supports archival history.

## DQ-EXC-009

Cancelled Exams must be separated from delivered/completed Exams in rates.

## DQ-EXC-010

Certificate issuance metrics must come from Certificate Management, not inferred from completion approval alone.

---

# 28. KPI Permission Matrix

| KPI                         | Academic Admin | Coordinator |      Trainer | Branch Manager |    Auditor | Executive Viewer |
| --------------------------- | -------------: | ----------: | -----------: | -------------: | ---------: | ---------------: |
| Exams Scheduled             |            B/M |           B |   O optional |              B |          B |                C |
| Exams Awaiting Activation   |            B/M |           B |   O optional |              B | B optional |                C |
| Exam Cancellation Rate      |            B/M |           B |            — |              B |          B |                C |
| Result Recording Rate       |            B/M |           B |            O |              B |          B |                C |
| Missing Result Count        |            B/M |           B |            O |              B |          B |                C |
| Result Finalization Rate    |            B/M |           B |   O optional |              B |          B |                C |
| Exam Pass Rate              |            B/M |           B |   O optional |              B |          B |                C |
| Result Correction Rate      |            B/M |  B optional |            — |     B optional |          B |       C optional |
| Completion Evaluation Rate  |            B/M |           B |            — |              B |          B |                C |
| Completion Approval Rate    |            B/M |           B |   O optional |              B |          B |                C |
| Approval Cycle Time         |            B/M |           B | O stage only |              B |          B |                C |
| Reevaluation Exception Rate |            B/M |  B optional |            — |              B |          B |                C |
| Approval Queue Aging        |            B/M |           B |            O |              B |          B |                C |
| Branch Pass Rate            |            B/M |           B |            — |              B |          B |                C |
| Course Completion Rate      |            B/M |           B |   O optional |              B |          B |                C |

---

# 29. Suggested Analytics API Endpoints

These may be implemented in Module 10 query API or Reporting context depending on architecture.

```text
GET /api/v1/exams-completion/dashboard
GET /api/v1/exams-completion/kpis
GET /api/v1/exams-completion/reports/exam-register
GET /api/v1/exams-completion/reports/result-register
GET /api/v1/exams-completion/reports/missing-results
GET /api/v1/exams-completion/reports/result-finalization
GET /api/v1/exams-completion/reports/exam-performance
GET /api/v1/exams-completion/reports/completion-evaluation
GET /api/v1/exams-completion/reports/completion-approval
GET /api/v1/exams-completion/reports/reevaluation-exceptions
GET /api/v1/exams-completion/reports/trainer-recommendations
GET /api/v1/exams-completion/reports/approval-sla
GET /api/v1/exams-completion/reports/result-corrections
GET /api/v1/exams-completion/reports/branch-summary
```

All report APIs:

- authenticate;
- apply report permission;
- intersect branch scope;
- paginate detail rows;
- enforce export allowlists;
- return freshness metadata.

---

# 30. Reporting NFR Targets

Recommended targets to validate in Part 10:

```text
Dashboard summary query:
P95 < 2 seconds under normal operational load

Operational report first page:
P95 < 3 seconds

Filtered export:
capacity based on infrastructure policy

Dashboard freshness:
operational widgets < 15 minutes
executive snapshots daily or configured schedule

Availability:
aligned with admin portal service target
```

These are provisional FRD targets and must be finalized in NFR design.

---

# 31. Read Model Rebuild Requirements

For each projection:

1. define source tables;
2. define rebuild command/job;
3. define watermark;
4. define reconciliation count;
5. define stale threshold;
6. define failure metric;
7. define access control;
8. define migration strategy.

Rebuild must be possible without editing transactional records.

---

# 32. Reconciliation Checks

## RC-EXC-001 — Exam Progress

```text
eligible_count >= recorded_count
recorded_count >= finalized_count
```

## RC-EXC-002 — Result Outcome

```text
passed_count + failed_count
<= finalized_count
```

depending on all supported finalized outcome states.

## RC-EXC-003 — Completion Cardinality

```text
one active CourseCompletion per Enrollment
```

## RC-EXC-004 — Approval Stage

Current queue stage must agree with:

```text
CourseCompletion functional state
+
CompletionApproval records
```

## RC-EXC-005 — Branch Scope

Projection branch must agree with:

```text
Exam → Batch.branchId
or
CourseCompletion → Enrollment.branchId
```

---

# 33. DDD Fit Check

| Reporting Need             | Correct Owner          | Module 10 Reporting Behavior            |
| -------------------------- | ---------------------- | --------------------------------------- |
| Exam status metrics        | Module 10              | Read Exam                               |
| Pass/fail analytics        | Module 10              | Read Result                             |
| Completion outcome metrics | Module 10              | Read CourseCompletion                   |
| Approval aging             | Module 10              | Read CompletionApproval                 |
| Attendance rate source     | Attendance             | Consume summary only                    |
| Payment validation source  | Finance                | Consume summary only                    |
| Course classification      | Course Catalog         | Join/read approved projection           |
| Batch delivery facts       | Training Delivery      | Join/read approved projection           |
| Student identity           | Enrollment/Party       | Read minimized display data             |
| Certificate issued count   | Certificate Management | Consume Certificate metric, never infer |
| Executive KPI snapshots    | Reporting & Dashboards | Store/report snapshots as derived data  |

---

# 34. Explicit Read-Only Confirmation

The following rule is mandatory:

```text
All read models, views, materialized views,
dashboard projections, KPI snapshots,
reporting tables, and export datasets
described in Part 8 are explicitly READ-ONLY.

They do not replace:
Exam
Result
CourseCompletion
CompletionApproval

They cannot be used as command targets.
They cannot authorize mutations by themselves.
They cannot override transactional state.
They must be rebuildable from authoritative sources.
```

Command validation must always return to authoritative transactional data and owning-context boundaries.

---

# 35. Implementation Readiness Checklist

Before implementation, verify:

```text
1. Existing reporting package and dashboard conventions.
2. Existing MetricSnapshot implementation.
3. Existing materialized view refresh mechanism.
4. Existing reporting database/read replica capability.
5. Existing export infrastructure.
6. Actual Result finalization persistence.
7. Actual completionStatus enum mappings.
8. Approval stage timestamp availability.
9. Evidence staleness metadata availability.
10. Trainer assignment read contract.
11. Certificate status read contract.
12. Branch consolidated-read policy helper.
13. Arabic PDF/XLSX rendering support.
14. Existing report permission naming conventions.
15. Existing dashboard widget permission model.
16. Snapshot freshness monitoring.
17. Read model rebuild tooling.
18. Data reconciliation tooling.
```

---

# 36. Final Reporting Boundary

Module 10 reporting may answer:

```text
What Exams are scheduled?
Where are Results missing?
What is the Result finalization rate?
What is the finalized pass rate?
Which Enrollments are pending completion evaluation?
Which approval stage is causing delay?
How many completion cases were approved or rejected?
Which records require reevaluation?
How do Branches, Courses, and Batches compare?
```

It must not independently decide:

```text
whether Attendance passed
whether Payment validation passed
whether Enrollment is valid
whether Trainer assignment is valid
whether Certificate was issued
```

Those truths remain with their owning bounded contexts.
