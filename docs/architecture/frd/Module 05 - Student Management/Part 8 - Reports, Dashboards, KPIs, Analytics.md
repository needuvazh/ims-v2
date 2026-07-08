# Part 8 - Reports, Dashboards, KPIs, Analytics

## Module 5 – Student Management

## 1. Purpose

This document defines the reporting, dashboard, KPI, and analytics requirements for **Module 5 – Student Management**.

The purpose of this part is to ensure that ASTI can monitor:

- student master growth,
- branch-wise student activity,
- duplicate and merge quality,
- archival and restore trends,
- ID card issuance status,
- intake-origin distribution,
- operational backlog and data quality,
- security-scoped reporting across Admin, Student, and Trainer portal surfaces where applicable.

This document stays aligned to the Student Management context boundary:

- **Student Management owns student master analytics**.
- It may consume downstream counts and summaries from Admission, Enrollment, Document Management, and Audit contexts.
- It does **not** own financial KPIs, seat utilization KPIs, attendance KPIs, completion KPIs, or certificate KPIs.
- Where cross-module derived KPIs are shown in Student screens, those are identified as **referenced indicators** and remain sourced from their owning contexts.

---

## 2. Reporting and Analytics Principles

1. All reports must enforce **server-side branch scoping**.
2. Dashboard visibility must be **permission-based**, not role-name based.
3. KPI calculations must use **soft-delete aware filters** and exclude archived/deleted records unless the report explicitly includes them.
4. All timestamps shown in reports must use **Oman timezone (UTC+4)**.
5. All exported reports must support **CSV** and **XLSX**; **PDF** is permitted for formatted operational and audit reports where layout matters.
6. Report queries must prefer **read models / materialized reporting views** for heavy aggregations.
7. Student master reports must distinguish:
   - active students,
   - archived students,
   - suspended students,
   - duplicate-review-pending students,
   - corporate-origin students,
   - direct-registration students,
   - admission-origin students.
8. Portal dashboards must show only the minimum data necessary for the user’s purpose.
9. Trainer and student portals are **read-only** in this module and should not expose institute-wide analytics.
10. No report may expose unmasked Civil ID, passport number, visa number, or full ID card number unless a dedicated sensitive-data permission exists.

---

## 3. KPI Catalog

## 3.1 KPI Design Notes

KPI formulas below use:

- **business date** in Oman timezone,
- **branch-scoped population** by default,
- **assigned-branch consolidated population** only when caller has consolidated reporting permission.

### Common Time Windows

- Today
- Yesterday
- Last 7 days
- Last 30 days
- Month to Date (MTD)
- Quarter to Date (QTD)
- Year to Date (YTD)
- Custom date range

---

## 3.2 Core Student Master KPIs

| KPI Code   | KPI Name                                   | Definition                                                                                               | Formula / Logic                                                                                    | Owner                                        | Scope                 |
| ---------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------- |
| KPI-SM-001 | Total Active Students                      | Current count of non-deleted student profiles in active state                                            | Count of `student_profiles` where `student_status='Active'` and `is_deleted=false`                 | Student Management                           | Branch / consolidated |
| KPI-SM-002 | Total Suspended Students                   | Current suspended student count                                                                          | Count where `student_status='Suspended'` and `is_deleted=false`                                    | Student Management                           | Branch / consolidated |
| KPI-SM-003 | Total Archived Students                    | Archived student count                                                                                   | Count where `student_status='Archived'` and `is_deleted=true`                                      | Student Management                           | Branch / consolidated |
| KPI-SM-004 | New Students Created Today                 | Student profiles created in current business day                                                         | Count where `created_at` is within today                                                           | Student Management                           | Branch / consolidated |
| KPI-SM-005 | New Students Created MTD                   | New student profiles created month-to-date                                                               | Count where `created_at` in month-to-date window                                                   | Student Management                           | Branch / consolidated |
| KPI-SM-006 | Student Growth Rate                        | Percentage change in new student creation between current and previous equivalent period                 | `((current_period_new - previous_period_new) / previous_period_new) * 100` with zero-safe handling | Student Management                           | Branch / consolidated |
| KPI-SM-007 | Duplicate Review Pending Count             | Open student records flagged for duplicate review                                                        | Count where `duplicate_review_required=true` and `is_deleted=false`                                | Student Management                           | Branch / consolidated |
| KPI-SM-008 | Open Duplicate Cases                       | Number of unresolved duplicate cases                                                                     | Count of `student_duplicate_cases` where `case_status in ('Open','UnderReview')`                   | Student Management                           | Branch / consolidated |
| KPI-SM-009 | Duplicate Blocking Case Rate               | Share of duplicate cases marked blocking                                                                 | `blocking_cases / all_open_cases * 100`                                                            | Student Management                           | Branch / consolidated |
| KPI-SM-010 | Merge Count in Period                      | Number of merge actions completed in period                                                              | Count of `student_merge_logs` in time window                                                       | Student Management                           | Branch / consolidated |
| KPI-SM-011 | Archive Count in Period                    | Number of students archived in period                                                                    | Count of archive events from status history or audit                                               | Student Management                           | Branch / consolidated |
| KPI-SM-012 | Restore Count in Period                    | Number of students restored in period                                                                    | Count of restore events from status history or audit                                               | Student Management                           | Branch / consolidated |
| KPI-SM-013 | ID Card Issuance Coverage                  | Percentage of active students with issued ID cards                                                       | `active_students_with_id_card / total_active_students * 100`                                       | Student Management                           | Branch / consolidated |
| KPI-SM-014 | ID Card Reissue Count                      | Number of ID card reissue actions in period                                                              | Count of `student_id_card_history` where `event_type='Reissued'` in period                         | Student Management                           | Branch / consolidated |
| KPI-SM-015 | Admission-Origin Student Share             | Share of student creation by approved admission                                                          | `students_created_from_admission / students_created_total * 100`                                   | Student Management                           | Branch / consolidated |
| KPI-SM-016 | Direct Registration Share                  | Share of student creation by direct registration                                                         | `students_created_direct / students_created_total * 100`                                           | Student Management                           | Branch / consolidated |
| KPI-SM-017 | Corporate-Origin Student Share             | Share of student creation from corporate participant conversion                                          | `students_created_from_corporate / students_created_total * 100`                                   | Student Management                           | Branch / consolidated |
| KPI-SM-018 | Average Duplicate Resolution Time          | Mean elapsed time from duplicate case creation to resolution                                             | Average of `resolved_at - created_at` across resolved duplicate cases                              | Student Management                           | Branch / consolidated |
| KPI-SM-019 | Export Activity Count                      | Number of export requests in period                                                                      | Count of `student_export_logs` in period                                                           | Student Management                           | Branch / consolidated |
| KPI-SM-020 | Sensitive Export Count                     | Number of exports including masked identity fields                                                       | Count where `included_masked_identity=true`                                                        | Student Management                           | Branch / consolidated |
| KPI-SM-021 | Data Completeness Score                    | Percent of active students with required minimum contact and identity quality fields completed           | `(students meeting completeness rule / total active students) * 100`                               | Student Management                           | Branch / consolidated |
| KPI-SM-022 | Students Missing Contact Readiness         | Count of active students missing email or phone policy minimums                                          | Count by defined completeness rule failure                                                         | Student Management                           | Branch / consolidated |
| KPI-SM-023 | Students Missing ID Documentation Link     | Count of active students with no linked identity document summaries where policy requires them           | Derived from document summary join                                                                 | Student Management / Document reference      | Branch / consolidated |
| KPI-SM-024 | Students Linked to At Least One Enrollment | Active students who have at least one enrollment reference                                               | Count distinct students with enrollment count > 0                                                  | Student Management with Enrollment reference | Branch / consolidated |
| KPI-SM-025 | Student Reuse Rate from Admission          | Percentage of approved admission handoffs that reused existing students rather than creating new records | `reused_existing_from_admission / total_admission_to_student_actions * 100`                        | Student Management                           | Branch / consolidated |

---

## 3.3 Referenced Cross-Module Indicators Displayable in Student Screens

These indicators may appear in student summary widgets but are **not owned by Student Management**.

| KPI Code     | KPI Name                                    | Source Context                              | Definition                                                                 |
| ------------ | ------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| KPI-SM-R-001 | Active Enrollment Count                     | Admission & Enrollment                      | Current number of active enrollments linked to a student                   |
| KPI-SM-R-002 | Pending Document Verification Count         | Document Management                         | Student-linked documents pending verification                              |
| KPI-SM-R-003 | Admission-to-Student Conversion Reuse Count | Admission & Enrollment + Student Management | Count of admissions handed to student module that reused existing profiles |
| KPI-SM-R-004 | Student with Completion Records Count       | Exam & Completion                           | Distinct student profiles linked to completion evaluation history          |

Student Management must not compute finance KPIs such as collection efficiency and must not compute seat utilization KPIs because those belong to Finance and Training Delivery contexts respectively.

---

## 4. Dashboard Widgets

## 4.1 Admin Dashboard – Student Management Home

### Dashboard Code

`dashboard.studentManagement`

### Required Permission

- Menu: `menu.studentManagement`
- Dashboard read: use module read/report permissions
- Widget visibility further gated by specific report/action permissions

### Layout Style

Dense 12-column grid, card-based, data-rich operations dashboard.

---

### Widget W-SM-001 — Active Students Summary Card

- **Type:** metric summary
- **Size:** 3 columns wide
- **KPI:** `KPI-SM-001`
- **Visible To:** roles with `student.read`
- **Drilldown:** opens Student Master List filtered to `student_status=Active`

### Widget W-SM-002 — New Students Today

- **Type:** metric summary
- **Size:** 3 columns
- **KPI:** `KPI-SM-004`
- **Visible To:** `student.read`

### Widget W-SM-003 — Duplicate Review Pending

- **Type:** metric summary with alert styling
- **Size:** 3 columns
- **KPI:** `KPI-SM-007`
- **Visible To:** `student.duplicate.read`
- **Drilldown:** Duplicate Workbench filtered to open cases

### Widget W-SM-004 — ID Card Coverage

- **Type:** metric summary with percentage
- **Size:** 3 columns
- **KPI:** `KPI-SM-013`
- **Visible To:** `student.read`

### Widget W-SM-005 — Student Creation Trend

- **Type:** time-series line chart
- **Size:** 6 columns
- **Measures:** daily/weekly student creation counts
- **Dimensions:** date, branch
- **Visible To:** `report.studentMaster`
- **Filters:** time window, branch, creation source

### Widget W-SM-006 — Creation Source Distribution

- **Type:** donut / stacked bar chart
- **Size:** 6 columns
- **Measures:** student count by `creation_source`
- **Visible To:** `report.studentMaster`
- **Categories:** ApprovedAdmission, DirectRegistration, CorporateConversion, WalkInHandoff, OnlineHandoff

### Widget W-SM-007 — Branch-wise Active Students

- **Type:** horizontal bar chart
- **Size:** 6 columns
- **KPI:** active students by branch
- **Visible To:** `report.studentBranchSummary`
- **Note:** visible only when caller can see multiple branches

### Widget W-SM-008 — Duplicate Case Backlog

- **Type:** stacked bar chart
- **Size:** 6 columns
- **Measures:** open cases by risk level and branch
- **Visible To:** `student.duplicate.read`

### Widget W-SM-009 — Recent Student Activity Feed

- **Type:** event table widget
- **Size:** 12 columns
- **Rows:** latest student create, update, archive, restore, merge, ID card events
- **Visible To:** `student.read`
- **Columns:** event timestamp, event type, student number, student name, branch, actor, summary

### Widget W-SM-010 — Duplicate Resolution SLA Widget

- **Type:** metric + trend
- **Size:** 4 columns
- **KPI:** average duplicate resolution time
- **Visible To:** `student.duplicate.read`

### Widget W-SM-011 — Merge History Snapshot

- **Type:** compact table widget
- **Size:** 4 columns
- **Visible To:** `report.studentMergeHistory`
- **Columns:** merged at, survivor student, source student, merged by

### Widget W-SM-012 — Data Completeness Heatmap

- **Type:** matrix / progress table
- **Size:** 4 columns
- **Visible To:** `report.studentMaster`
- **Measures:** completeness by branch:
  - phone present
  - email present
  - identity present
  - ID card coverage

---

## 4.2 Branch Dashboard Widgets

These widgets can be embedded on a Branch Admin or Branch Manager dashboard.

| Widget Code | Widget Name                            | Type         | Permission                    | Scope              |
| ----------- | -------------------------------------- | ------------ | ----------------------------- | ------------------ |
| W-SM-BR-001 | Branch Active Students                 | Metric       | `student.read`                | Active branch only |
| W-SM-BR-002 | Branch New Students MTD                | Metric       | `student.read`                | Active branch only |
| W-SM-BR-003 | Branch Duplicate Backlog               | Metric       | `student.duplicate.read`      | Active branch only |
| W-SM-BR-004 | Branch ID Card Issuance Pending        | Metric       | `student.read`                | Active branch only |
| W-SM-BR-005 | Branch Student Activity Trend          | Line chart   | `report.studentMaster`        | Active branch only |
| W-SM-BR-006 | Branch Student Archive / Restore Trend | Column chart | `report.studentStatusHistory` | Active branch only |

---

## 4.3 Student Portal Dashboard Widgets

Student portal analytics are intentionally minimal and self-scoped.

### Widget W-SM-STU-001 — My Profile Summary

- **Type:** summary card
- **Permission:** `student.portal.self.read`
- **Fields:** student number, status, joined date, ID card issued flag

### Widget W-SM-STU-002 — My Linked Enrollments Count

- **Type:** metric card
- **Permission:** `student.portal.self.read`
- **Source:** referenced from Enrollment context
- **Scope:** self only

### Widget W-SM-STU-003 — My Documents Summary

- **Type:** table summary
- **Permission:** `student.portal.self.read`
- **Source:** Document Management
- **Scope:** self only

Student portal must not display branch-wide or institute-wide student analytics.

---

## 4.4 Trainer Portal Widgets

Trainer views are roster-context only.

### Widget W-SM-TRN-001 — Batch Student Snapshot

- **Type:** compact summary
- **Permission:** `student.trainer.roster.read`
- **Data:** number of students in current roster, suspended records in roster, duplicate-review-pending alerts in roster

### Widget W-SM-TRN-002 — Student Quick View Drawer

- **Type:** read-only detail widget
- **Permission:** `student.trainer.roster.read`
- **Scope:** only students in the current trainer-visible batch roster

---

## 5. Operational Reports

## 5.1 Report Inventory

| Report Code | Report Name                               | Purpose                                                        | Primary Users                             |
| ----------- | ----------------------------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| RPT-SM-001  | Student Master Register                   | Full student listing with branch-safe filters                  | Student Ops, Branch Admin, Reporting User |
| RPT-SM-002  | New Student Creation Report               | Track creation volume over time                                | Branch Manager, Reporting User            |
| RPT-SM-003  | Student Status History Report             | Status changes and lifecycle actions                           | Branch Manager, Compliance Officer        |
| RPT-SM-004  | Duplicate Case Backlog Report             | Monitor unresolved duplicate workload                          | Student Ops, Compliance Officer           |
| RPT-SM-005  | Duplicate Resolution Performance Report   | Measure duplicate case handling efficiency                     | Compliance Officer, Reporting User        |
| RPT-SM-006  | Student Merge History Report              | Review all merge actions and reassignments                     | Compliance Officer, Branch Manager        |
| RPT-SM-007  | ID Card Issuance Status Report            | Track issued, pending, and reissued cards                      | Student Ops, Branch Admin                 |
| RPT-SM-008  | Creation Source Distribution Report       | Understand student source mix                                  | Branch Manager, Reporting User            |
| RPT-SM-009  | Student Data Completeness Report          | Identify incomplete student master records                     | Student Ops, Compliance Officer           |
| RPT-SM-010  | Student Export Audit Report               | Review export activity and sensitive export usage              | Compliance Officer, Reporting User        |
| RPT-SM-011  | Corporate-Origin Student Register         | List students created from corporate participants              | Corporate Coordinator, Reporting User     |
| RPT-SM-012  | Admission Handoff to Student Reuse Report | Measure student reuse vs new create from admissions            | Counselor Lead, Reporting User            |
| RPT-SM-013  | Archived and Restored Students Report     | Review archival and restoration actions                        | Compliance Officer, Branch Manager        |
| RPT-SM-014  | Students Missing Contact Readiness Report | Find students missing required communication/contact readiness | Student Ops                               |
| RPT-SM-015  | Students Without ID Card Report           | Find active students without issued ID cards                   | Student Ops, Branch Admin                 |

---

## 5.2 Detailed Report Specifications

### RPT-SM-001 — Student Master Register

**Purpose**  
Master operational report of students in scope.

**Permissions**

- `report.studentMaster`
- `student.read`

**Filters**

- branch
- consolidated view toggle
- student status
- archived state
- creation source
- nationality
- joined date from/to
- duplicate review required
- has ID card
- has linked enrollment
- has linked admission
- global search

**Columns**

1. Student Number
2. Full Name (localized)
3. Primary Phone
4. Primary Email
5. Nationality
6. Branch
7. Student Status
8. Joined At
9. Creation Source
10. ID Card Issued
11. Duplicate Review Required
12. Admissions Count
13. Enrollments Count
14. Updated At

**Sorting**

- default: `updatedAt desc`
- supported: student number, name, branch, status, joined date, updated at

**Exports**

- CSV, XLSX, PDF
- PDF should be formatted as paginated register only for manageable result sizes

---

### RPT-SM-002 — New Student Creation Report

**Purpose**  
Track new students created across time windows.

**Filters**

- date range
- branch
- creation source
- created by user
- nationality
- direct vs admission vs corporate origin

**Columns**

1. Creation Date
2. Student Number
3. Student Name
4. Branch
5. Creation Source
6. Source Admission / Corporate Participant reference
7. Created By

**Chart Companion**

- line chart: daily new students
- bar chart: new students by branch
- donut: source mix

**Exports**

- CSV, XLSX, PDF

---

### RPT-SM-003 — Student Status History Report

**Purpose**  
Audit-friendly record of status changes.

**Permissions**

- `report.studentStatusHistory`
- `student.audit.read`

**Filters**

- date range
- branch
- old status
- new status
- changed by
- student number
- student name

**Columns**

1. Event Timestamp
2. Student Number
3. Student Name
4. Old Status
5. New Status
6. Effective Start Date
7. Effective End Date
8. Reason
9. Changed By
10. Branch

**Sorting**

- default: event timestamp desc

**Exports**

- CSV, XLSX, PDF

---

### RPT-SM-004 — Duplicate Case Backlog Report

**Purpose**  
Identify unresolved duplicate workload.

**Permissions**

- `report.studentDuplicateCases`
- `student.duplicate.read`

**Filters**

- branch
- consolidated
- case status
- risk level
- source type
- created from/to
- resolved by
- age bucket

**Columns**

1. Duplicate Case Number
2. Branch
3. Source Type
4. Risk Level
5. Case Status
6. Trigger Summary
7. Candidate Count
8. Created At
9. Age in Hours
10. Assigned / Resolved By

**Sorting**

- default: risk desc, createdAt asc

**Exports**

- CSV, XLSX, PDF

---

### RPT-SM-005 — Duplicate Resolution Performance Report

**Purpose**  
Measure resolution performance and SLA.

**Permissions**

- `report.studentDuplicateCases`

**Filters**

- branch
- date range
- risk level
- resolver
- source type

**Columns**

1. Duplicate Case Number
2. Risk Level
3. Created At
4. Resolved At
5. Resolution Type
6. Resolution Time (hours)
7. Resolved By
8. Branch

**KPIs Embedded**

- average resolution time
- median resolution time
- oldest open case
- blocking case count

**Exports**

- CSV, XLSX, PDF

---

### RPT-SM-006 — Student Merge History Report

**Purpose**  
Review merge operations and data lineage impact.

**Permissions**

- `report.studentMergeHistory`
- `student.merge` or `student.audit.read`

**Filters**

- branch
- date range
- merged by
- survivor student number
- source student number
- duplicate case number

**Columns**

1. Merge Timestamp
2. Merge Log ID
3. Survivor Student Number
4. Survivor Student Name
5. Source Student Number
6. Source Student Name
7. Reassigned Admissions Count
8. Reassigned Enrollments Count
9. Reassigned Documents Count
10. Merged By
11. Merge Reason

**Exports**

- CSV, XLSX, PDF

---

### RPT-SM-007 — ID Card Issuance Status Report

**Purpose**  
Track current ID card issuance and reissue actions.

**Permissions**

- `student.read`
- `student.idcard.manage` or reporting equivalent

**Filters**

- branch
- issued state
- issue date range
- reissue date range
- student status
- creation source

**Columns**

1. Student Number
2. Student Name
3. Branch
4. Student Status
5. ID Card Issued
6. Current ID Card Number Masked
7. Last ID Card Event Type
8. Last ID Card Event Date
9. Last Updated By

**Exports**

- CSV, XLSX, PDF

---

### RPT-SM-008 — Creation Source Distribution Report

**Purpose**  
Understand the operational origin of students.

**Filters**

- date range
- branch
- nationality
- student status

**Columns**

1. Creation Source
2. Student Count
3. Percentage Share

**Charts**

- donut chart
- branch comparison stacked bar

**Exports**

- CSV, XLSX, PDF

---

### RPT-SM-009 — Student Data Completeness Report

**Purpose**  
Identify records needing cleanup.

**Completeness Rules**
A record is considered complete if:

- English name present
- nationality present
- primary phone present
- at least one identity field present
- joined date present
- optional extended rule: email present
- optional extended rule: ID card issued for active students where policy requires it

**Filters**

- branch
- completeness status
- missing field type
- creation source
- student status

**Columns**

1. Student Number
2. Student Name
3. Branch
4. Student Status
5. Missing Phone
6. Missing Email
7. Missing Identity Key
8. Missing ID Card
9. Duplicate Review Required
10. Updated At

**Exports**

- CSV, XLSX, PDF

---

### RPT-SM-010 — Student Export Audit Report

**Purpose**  
Track exports for compliance and privacy monitoring.

**Permissions**

- `report.studentExportHistory`
- `student.audit.read`

**Filters**

- date range
- branch
- requested by
- export status
- included masked identity
- format

**Columns**

1. Export Log ID
2. Requested At
3. Requested By
4. Branch
5. Scope
6. Format
7. Row Count
8. Included Masked Identity
9. Reason
10. Export Status

**Exports**

- CSV, XLSX, PDF

---

### RPT-SM-011 — Corporate-Origin Student Register

**Purpose**  
List students created from corporate participants.

**Permissions**

- `report.studentCorporateOriginSummary`
- `student.read`

**Filters**

- branch
- date range
- corporate account
- nationality
- student status

**Columns**

1. Student Number
2. Student Name
3. Branch
4. Corporate Participant Reference
5. Corporate Account
6. Joined Date
7. Student Status
8. Linked Enrollment Count

**Exports**

- CSV, XLSX, PDF

---

### RPT-SM-012 — Admission Handoff to Student Reuse Report

**Purpose**  
Measure reuse of existing student profiles when admissions are handed off.

**Permissions**

- `report.studentMaster`
- `student.read`

**Filters**

- date range
- branch
- admission status
- reused existing vs created new

**Columns**

1. Admission Number
2. Admission Branch
3. Person Name
4. Action Result (`CreatedNewStudent` / `ReusedExistingStudent`)
5. Student Number
6. Action Date
7. Performed By

**Exports**

- CSV, XLSX, PDF

---

### RPT-SM-013 — Archived and Restored Students Report

**Purpose**  
Review archival and restore actions.

**Filters**

- action type
- date range
- branch
- performed by
- student status before/after

**Columns**

1. Event Type
2. Event Timestamp
3. Student Number
4. Student Name
5. Branch
6. Old Status
7. New Status
8. Reason
9. Performed By

**Exports**

- CSV, XLSX, PDF

---

### RPT-SM-014 — Students Missing Contact Readiness Report

**Purpose**  
Surface records not ready for communication or operational follow-up.

**Filters**

- branch
- student status
- creation source
- missing phone
- missing email

**Columns**

1. Student Number
2. Student Name
3. Branch
4. Missing Phone
5. Missing Email
6. Joined Date
7. Updated At

**Exports**

- CSV, XLSX, PDF

---

### RPT-SM-015 — Students Without ID Card Report

**Purpose**  
Support ID card issuance follow-up.

**Filters**

- branch
- student status
- joined date range
- creation source

**Columns**

1. Student Number
2. Student Name
3. Branch
4. Student Status
5. Joined Date
6. ID Card Issued
7. Last Updated At

**Exports**

- CSV, XLSX, PDF

---

## 6. Portal-Specific Reporting Surfaces

## 6.1 Admin Portal

Admin portal exposes:

- dashboard widgets
- all operational reports
- export actions
- drilldowns to filtered student list and duplicate workbench

## 6.2 Student Portal

Student portal exposes only:

- self summary cards
- self linked-enrollment count
- self document status summary
- no export
- no list reports
- no branch comparisons

## 6.3 Trainer Portal

Trainer portal exposes only:

- batch roster student quick insights
- no branch-wide reporting
- no student master exports
- no duplicate case reports

---

## 7. Permission Scope by Dashboard / Report

| Artifact                          | Required Permissions                                     | Branch Scope                               |
| --------------------------------- | -------------------------------------------------------- | ------------------------------------------ |
| Student Management Home Dashboard | `menu.studentManagement`, `student.read`                 | Active / assigned / consolidated by policy |
| Duplicate Backlog Widgets         | `student.duplicate.read`                                 | Assigned / consolidated by policy          |
| Merge Snapshot Widget             | `report.studentMergeHistory`                             | Assigned / consolidated by policy          |
| Student Master Register           | `report.studentMaster`, `student.read`                   | Assigned / consolidated by policy          |
| Status History Report             | `report.studentStatusHistory`, `student.audit.read`      | Assigned / consolidated by policy          |
| Duplicate Reports                 | `report.studentDuplicateCases`, `student.duplicate.read` | Assigned / consolidated by policy          |
| Export Audit Report               | `report.studentExportHistory`, `student.audit.read`      | Assigned / consolidated by policy          |
| Student Portal Self Widgets       | `student.portal.self.read`                               | Self only                                  |
| Trainer Roster Snapshot           | `student.trainer.roster.read`                            | Roster context only                        |

---

## 8. Read Models and Reporting Views

## 8.1 Reporting Strategy

Operational list pages can query transactional tables directly with indexed predicates.  
Heavy dashboards and analytical reports should use **read models** or **database views/materialized views** to avoid repeated expensive joins across contexts.

Recommended approach:

- Near-real-time SQL views for simple counts and joined summaries.
- Materialized views refreshed on schedule or event-driven for heavier branch/date aggregations.
- Dedicated reporting schemas permitted inside the same modular monolith database if governance prefers separation.

---

## 8.2 Recommended Read Models / Views

### View: `vw_student_profile_summary`

**Purpose**
Fast list/detail/report projection of student master data.

**Source Tables**

- `student_profiles`
- shared person projection
- branch projection
- optional admission/enrollment/document summary projections

**Suggested Columns**

- student_id
- student_number
- person_id
- full_name_en
- full_name_ar
- primary_phone
- primary_email
- nationality_code
- branch_id
- branch_code
- branch_name_en
- branch_name_ar
- student_status
- joined_at
- creation_source
- id_card_issued
- id_card_number_masked
- duplicate_review_required
- admissions_count
- enrollments_count
- active_enrollments_count
- documents_count
- pending_documents_count
- created_at
- updated_at
- is_deleted

**Use Cases**

- student list page
- student master register
- quick lookup
- branch widgets

---

### View: `vw_student_creation_daily_fact`

**Purpose**
Daily student creation reporting.

**Grain**

- one row per branch, date, creation source

**Columns**

- business_date
- branch_id
- creation_source
- created_count
- reused_existing_count_from_admission
- corporate_conversion_count
- direct_registration_count

**Use Cases**

- creation trend widget
- new student report
- creation source charts
- growth-rate calculations

---

### View: `vw_student_status_daily_fact`

**Purpose**
Status movement reporting.

**Grain**

- one row per branch, date, action/status movement

**Columns**

- business_date
- branch_id
- new_active_count
- suspended_count
- archived_count
- restored_count
- inactive_count
- status_change_total

**Use Cases**

- status history widgets
- archive/restore trend report
- branch summary dashboard

---

### View: `vw_student_duplicate_case_fact`

**Purpose**
Fast duplicate backlog and SLA reporting.

**Columns**

- duplicate_case_id
- duplicate_case_number
- branch_id
- source_type
- case_status
- risk_level
- created_at
- resolved_at
- resolution_type
- age_hours
- resolution_hours
- candidate_count
- blocking_flag

**Use Cases**

- duplicate backlog widget
- duplicate performance report
- compliance dashboards

---

### View: `vw_student_merge_fact`

**Purpose**
Merge audit and analytics projection.

**Columns**

- merge_log_id
- branch_id
- merged_at
- merged_by
- survivor_student_id
- survivor_student_number
- survivor_student_name_en
- source_student_id
- source_student_number
- source_student_name_en
- reassigned_admissions_count
- reassigned_enrollments_count
- reassigned_documents_count

**Use Cases**

- merge history report
- merge snapshot widget
- compliance audit review

---

### View: `vw_student_id_card_fact`

**Purpose**
ID card status and reissue analytics.

**Columns**

- student_id
- student_number
- branch_id
- student_status
- id_card_issued
- current_id_card_number_masked
- last_event_type
- last_event_date
- reissue_count_lifetime
- issue_count_lifetime

**Use Cases**

- ID card issuance report
- ID card coverage KPI
- reissue count KPI

---

### View: `vw_student_data_completeness_fact`

**Purpose**
Support data quality reporting.

**Columns**

- student_id
- branch_id
- student_status
- has_phone
- has_email
- has_identity_key
- has_id_card
- duplicate_review_required
- completeness_score_numeric
- missing_field_count

**Use Cases**

- completeness dashboard
- missing contact readiness report
- students without ID card report

---

### View: `vw_student_export_audit_fact`

**Purpose**
Track export behavior and compliance.

**Columns**

- export_log_id
- branch_id
- requested_by
- export_scope
- export_format
- row_count
- included_masked_identity
- export_status
- exported_at

**Use Cases**

- export audit report
- sensitive export KPI
- compliance monitoring

---

## 8.3 Materialized View Refresh Guidance

Where materialized views are used:

- `vw_student_creation_daily_fact_mv` refresh every 15 minutes
- `vw_student_status_daily_fact_mv` refresh every 15 minutes
- `vw_student_duplicate_case_fact_mv` refresh every 5 minutes
- `vw_student_merge_fact_mv` refresh every 15 minutes
- `vw_student_data_completeness_fact_mv` refresh hourly
- `vw_student_export_audit_fact_mv` refresh every 15 minutes

If event-driven projection refresh is implemented, refresh should be triggered by:

- `StudentProfileCreated`
- `StudentStatusChanged`
- `StudentArchived`
- `StudentRestored`
- `StudentDuplicateCaseCreated`
- `StudentDuplicateCaseResolved`
- `StudentProfilesMerged`
- `StudentIdCardIssued`
- `StudentIdCardReissued`
- `StudentExportRequested`
- `StudentExportCompleted`
- `StudentExportFailed`

---

## 9. Performance Expectations for Reporting

1. Student list query first page under normal indexed branch filters: **<= 1.5 seconds**
2. KPI summary cards on dashboard: **<= 2 seconds**
3. Duplicate backlog report: **<= 3 seconds**
4. Merge history report: **<= 3 seconds**
5. Data completeness report: **<= 4 seconds**
6. Export request acceptance response: **<= 2 seconds**
7. Large export generation may be asynchronous beyond request acceptance.

---

## 10. Analytics Use Cases

## 10.1 Operational Analytics

- Which branch is creating the most new students?
- Which creation source is growing fastest?
- Which branch has the highest duplicate backlog?
- Which branch has low ID card issuance coverage?
- Which operators create the most duplicate-review cases?

## 10.2 Compliance Analytics

- How many sensitive exports were generated this month?
- How many merges occurred by branch and by actor?
- What is the average time to resolve blocking duplicate cases?
- How many archived students were later restored?

## 10.3 Data Quality Analytics

- What percentage of active students meet minimum completeness standards?
- Which branches have the highest missing-phone or missing-email rates?
- How many active students remain without ID cards?

---

## 11. Final Reporting Boundary Notes

1. Student Management reports must never compute finance totals or collection efficiency.
2. Student Management reports must never compute seat utilization because that belongs to Training Delivery.
3. Student Management may show linked enrollment counts as referenced facts, but not own enrollment analytics beyond student-master operational support.
4. All dashboards and reports must respect:
   - permission scope,
   - branch scope,
   - soft delete semantics,
   - masked identity rules,
   - Oman timezone rendering.
