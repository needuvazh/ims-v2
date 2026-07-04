# Part 3 – Screen Specifications and UI Components

## Module 08 – Attendance Management

| Attribute | Value |
|---|---|
| Product | ASTI Integrated Institute Management System (IMS) |
| Module | Module 08 – Attendance Management |
| Module Code | M08-ATT |
| Bounded Context | Attendance Management |
| Primary Package | `packages/attendance` |
| Application Architecture | Next.js TypeScript modular monolith |
| Primary Portals | Admin Portal, Trainer Portal, Student Portal, Corporate Portal view integration |
| Primary Data Owner | Attendance Management Context |
| Source Contexts | Training Delivery, Scheduling Calendar, Admission & Enrollment, Identity & Access, Organization |
| Consumer Contexts | Exam Result & Completion, Certificate Management, Reporting Dashboards, Audit Compliance, Communication Notifications |
| Timezone | Oman GST, UTC+4 |
| Localization | English LTR and Arabic RTL |
| Version | 1.0 |

---

## 1. Purpose of This Document

This document defines the complete screen-level requirements and reusable UI component specifications for Module 08 – Attendance Management. It translates the functional requirements, user stories, use cases, workflows, and state machines into concrete user interface behavior for implementation in the ASTI IMS admin portal, trainer portal, student portal, and read-only external views where applicable.

The Attendance Management UI must support dense operational workflows for training staff while remaining safe, auditable, branch-scoped, and bilingual. Every attendance action must be traceable to an `AttendanceSession`, `AttendanceRecord`, `Enrollment`, `StudentProfile`, `Batch`, `Course`, `Session`, and `Branch`. Attendance is never recorded against a free-text learner name. The UI must make this relationship visible enough for users to verify the correct branch, batch, course, session, and learner before marking or submitting attendance.

---

## 2. UI Design Principles

| Principle | Requirement |
|---|---|
| Dense, data-rich operations | Admin and trainer screens must prioritize searchable grids, compact filters, bulk actions, and fixed action bars. |
| Enrollment-centric attendance | Every row in a marking roster must be backed by an active enrollment and student profile. |
| Branch isolation | Branch selector and branch filters must be populated from the authenticated user's allowed branch scope only. Server-side branch enforcement remains mandatory. |
| Minimal clicks for trainers | A trainer must be able to mark an entire class using bulk actions and keyboard-friendly controls. |
| Safe final submission | Final submission requires validation summary, confirmation dialog, permission check, and audit reason when configured. |
| Correction over edit | Submitted attendance cannot be edited inline. Changes must go through correction request and approval workflow. |
| Bilingual-ready | All labels, statuses, validation messages, empty states, and table headings must support English and Arabic. |
| Audit visibility | Sensitive screens must surface last updated by, marked by, submitted by, approved by, and timestamp fields. |
| Responsive but desktop-first | Admin portal screens are optimized for desktop data operations. Trainer portal must also work on tablets. |
| No hard delete UX | Delete actions are presented as archive, void, deactivate, or remove from active list according to business meaning. |

---

## 3. Screen Inventory

### 3.1 Admin Portal Screens

| Screen ID | Screen Name | Route Pattern | Primary Users | Purpose | Linked Requirements |
|---|---|---|---|---|
| SCR-M08-ADM-001 | Attendance Dashboard | `/admin/attendance` | Academic Coordinator, Branch Manager, Registrar, Auditor | Operational overview of pending, draft, submitted, and exception attendance work. | FR-M08-ATT-002, FR-M08-ATT-013, FR-M08-ATT-014 |
| SCR-M08-ADM-002 | Attendance Sessions List | `/admin/attendance/sessions` | Academic Coordinator, Branch Manager, Registrar, Trainer Supervisor | List attendance sessions created from scheduled sessions. | FR-M08-ATT-001, FR-M08-ATT-002 |
| SCR-M08-ADM-003 | Attendance Session Detail | `/admin/attendance/sessions/[attendanceSessionId]` | Academic Coordinator, Branch Manager, Auditor | Read detailed attendance session metadata, roster summary, audit trail, and corrections. | FR-M08-ATT-003, FR-M08-ATT-007, FR-M08-ATT-017 |
| SCR-M08-ADM-004 | Attendance Marking Workspace | `/admin/attendance/sessions/[attendanceSessionId]/mark` | Trainer, Academic Coordinator | Mark, bulk mark, save draft, and submit attendance. | FR-M08-ATT-004, FR-M08-ATT-005, FR-M08-ATT-006, FR-M08-ATT-007 |
| SCR-M08-ADM-005 | Pending Attendance Monitor | `/admin/attendance/pending` | Academic Coordinator, Branch Manager | Monitor sessions requiring attendance action. | FR-M08-ATT-013, FR-M08-ATT-020 |
| SCR-M08-ADM-006 | Low Attendance Monitor | `/admin/attendance/low-attendance` | Academic Coordinator, Branch Manager, Counselor | Identify enrollments below attendance threshold. | FR-M08-ATT-011, FR-M08-ATT-012 |
| SCR-M08-ADM-007 | Attendance Correction Queue | `/admin/attendance/corrections` | Academic Coordinator, Branch Manager, Auditor | Review submitted correction requests by status. | FR-M08-ATT-009, FR-M08-ATT-010 |
| SCR-M08-ADM-008 | Attendance Correction Detail | `/admin/attendance/corrections/[correctionId]` | Academic Coordinator, Branch Manager, Auditor | Approve, reject, or view correction request evidence. | FR-M08-ATT-009, FR-M08-ATT-010, FR-M08-ATT-017 |
| SCR-M08-ADM-009 | Attendance Reports | `/admin/reports/attendance` | Branch Manager, Academic Coordinator, Auditor, CEO Dashboard User | Generate branch, batch, student, trainer, course, and date-range reports. | FR-M08-ATT-014 |
| SCR-M08-ADM-010 | Corporate Attendance Report | `/admin/reports/attendance/corporate` | Corporate Coordinator, Branch Manager, Finance User | Generate attendance report for corporate participants and corporate accounts. | FR-M08-ATT-015 |
| SCR-M08-ADM-011 | Attendance Audit Log Viewer | `/admin/attendance/audit` | Auditor, Compliance Admin, Branch Manager | Search attendance-related audit events. | FR-M08-ATT-017 |
| SCR-M08-ADM-012 | Attendance Settings View | `/admin/attendance/settings` | System Admin, Academic Manager | Read attendance thresholds, allowed statuses, and correction rules from configuration. | FR-M08-ATT-011, FR-M08-ATT-012, FR-M08-ATT-019 |

### 3.2 Trainer Portal Screens

| Screen ID | Screen Name | Route Pattern | Primary Users | Purpose | Linked Requirements |
|---|---|---|---|---|
| SCR-M08-TRN-001 | My Attendance Tasks | `/trainer/attendance` | Trainer | List assigned sessions requiring attendance marking. | FR-M08-ATT-002, FR-M08-ATT-013 |
| SCR-M08-TRN-002 | Trainer Mark Attendance | `/trainer/attendance/sessions/[attendanceSessionId]/mark` | Trainer | Tablet-friendly attendance marking for assigned sessions. | FR-M08-ATT-004, FR-M08-ATT-005, FR-M08-ATT-006, FR-M08-ATT-007 |
| SCR-M08-TRN-003 | Trainer Attendance History | `/trainer/attendance/history` | Trainer | Review previously submitted attendance for assigned sessions. | FR-M08-ATT-014, FR-M08-ATT-017 |
| SCR-M08-TRN-004 | Trainer Correction Request | `/trainer/attendance/corrections/new` | Trainer | Request correction for a submitted attendance record. | FR-M08-ATT-009 |
| SCR-M08-TRN-005 | My Correction Requests | `/trainer/attendance/corrections` | Trainer | Track correction request statuses. | FR-M08-ATT-009, FR-M08-ATT-010 |

### 3.3 Student Portal Screens

| Screen ID | Screen Name | Route Pattern | Primary Users | Purpose | Linked Requirements |
|---|---|---|---|---|
| SCR-M08-STU-001 | My Attendance Summary | `/student/attendance` | Student | View attendance percentage and session-level attendance by enrollment. | FR-M08-ATT-011, FR-M08-ATT-014 |
| SCR-M08-STU-002 | Enrollment Attendance Detail | `/student/attendance/enrollments/[enrollmentId]` | Student | View attendance record timeline for one course enrollment. | FR-M08-ATT-011, FR-M08-ATT-014 |
| SCR-M08-STU-003 | Low Attendance Alert Detail | `/student/attendance/alerts/[alertId]` | Student | View low attendance warning and required actions. | FR-M08-ATT-012 |

### 3.4 Corporate Portal or External Read-Only View Screens

| Screen ID | Screen Name | Route Pattern | Primary Users | Purpose | Linked Requirements |
|---|---|---|---|---|
| SCR-M08-COR-001 | Corporate Participant Attendance | `/corporate/attendance` | Corporate Coordinator | View attendance for nominated corporate participants. | FR-M08-ATT-015 |
| SCR-M08-COR-002 | Corporate Attendance Export | `/corporate/attendance/export` | Corporate Coordinator | Export participant attendance for allowed corporate account and date range. | FR-M08-ATT-015 |

---

## 4. Shared UI Components

### 4.1 Component Inventory

| Component ID | Component Name | Used In | Purpose |
|---|---|---|---|
| CMP-M08-001 | Branch Scope Selector | Admin screens | Select active branch scope from authorized branches only. |
| CMP-M08-002 | Attendance Session Filter Bar | Session list, dashboard, pending monitor | Filter sessions by branch, date range, course, batch, trainer, status, and marking responsibility. |
| CMP-M08-003 | Attendance Status Badge | All screens | Render attendance session, record, and correction statuses using localized text. |
| CMP-M08-004 | Attendance Roster Grid | Marking workspace | Dense grid for marking individual and bulk attendance. |
| CMP-M08-005 | Bulk Mark Action Bar | Marking workspace | Mark selected rows or all unmarked rows as Present, Absent, Late, or Excused. |
| CMP-M08-006 | Attendance Submission Summary Panel | Marking workspace | Display validation result and counts before final submission. |
| CMP-M08-007 | Correction Request Form | Correction screens | Capture requested status change and reason. |
| CMP-M08-008 | Correction Approval Panel | Correction detail | Approve or reject correction request with remarks. |
| CMP-M08-009 | Attendance Percentage Card | Student, low attendance, completion evidence | Display present count, denominator, excused count, percentage, and threshold result. |
| CMP-M08-010 | Audit Timeline | Session detail, correction detail, audit viewer | Show chronological audit events. |
| CMP-M08-011 | Export Menu | Report screens | Export CSV, XLSX, and PDF according to permission. |
| CMP-M08-012 | Bilingual Label Renderer | All screens | Render English or Arabic labels from localized fields. |

### 4.2 Shared Status Labels

| Status Type | Code | English Label | Arabic Label | UI Intent |
|---|---|---|---|---|
| Attendance Session | `NOT_STARTED` | Not Started | لم يبدأ | Attendance session exists but no record is marked. |
| Attendance Session | `DRAFT` | Draft | مسودة | At least one record is saved but not submitted. |
| Attendance Session | `SUBMITTED` | Submitted | تم الإرسال | Final attendance submitted and locked. |
| Attendance Session | `LOCKED` | Locked | مقفل | Session cannot be edited directly. |
| Attendance Session | `CORRECTION_PENDING` | Correction Pending | تصحيح قيد المراجعة | At least one correction request is pending. |
| Attendance Record | `PRESENT` | Present | حاضر | Student attended session. |
| Attendance Record | `ABSENT` | Absent | غائب | Student did not attend session. |
| Attendance Record | `LATE` | Late | متأخر | Student attended late and counts according to attendance rules. |
| Attendance Record | `EXCUSED` | Excused | بعذر | Absence or late status excused according to policy. |
| Attendance Correction | `REQUESTED` | Requested | تم الطلب | Correction submitted for approval. |
| Attendance Correction | `APPROVED` | Approved | موافق عليه | Correction approved and applied. |
| Attendance Correction | `REJECTED` | Rejected | مرفوض | Correction rejected and original attendance remains. |
| Attendance Alert | `OPEN` | Open | مفتوح | Low attendance issue requires attention. |
| Attendance Alert | `ACKNOWLEDGED` | Acknowledged | تم الاطلاع | Alert has been reviewed. |
| Attendance Alert | `RESOLVED` | Resolved | تم الحل | Attendance is recovered or administratively closed. |

---

## 5. Global Field Validation Rules

### 5.1 Common Identifiers

| Field | Type | Mandatory | Validation | Error Message EN | Error Message AR |
|---|---|---:|---|---|---|
| `branchId` | UUID/CUID string | Yes | Must exist in authorized branch scope. Pattern: `^[a-zA-Z0-9_-]{10,36}$` | Select a valid branch. | اختر فرعًا صالحًا. |
| `courseId` | UUID/CUID string | Conditional | Required when filtering by course-specific attendance. Pattern: `^[a-zA-Z0-9_-]{10,36}$` | Select a valid course. | اختر دورة صالحة. |
| `batchId` | UUID/CUID string | Conditional | Required for batch-specific marking or report. Pattern: `^[a-zA-Z0-9_-]{10,36}$` | Select a valid batch. | اختر دفعة صالحة. |
| `sessionId` | UUID/CUID string | Yes for attendance session creation/detail | Must reference a scheduled session in same branch and batch. | Select a valid session. | اختر جلسة صالحة. |
| `attendanceSessionId` | UUID/CUID string | Yes | Must reference non-deleted attendance session in authorized branch. | Attendance session was not found. | لم يتم العثور على جلسة الحضور. |
| `attendanceRecordId` | UUID/CUID string | Yes for correction | Must reference non-deleted attendance record in submitted or locked session. | Attendance record was not found. | لم يتم العثور على سجل الحضور. |
| `enrollmentId` | UUID/CUID string | Yes per roster row | Must reference active enrollment for same batch and branch. | Enrollment is invalid for this attendance session. | التسجيل غير صالح لجلسة الحضور هذه. |

### 5.2 Date, Time, Text, and Numeric Rules

| Field | Type | Mandatory | Validation |
|---|---|---:|---|
| `attendanceDate` | Date | Yes | ISO date `YYYY-MM-DD`; must equal scheduled session date unless user has `attendance.session.overrideDate`; cannot be before batch start date or after batch end date. |
| `dateFrom` | Date | Yes for reports | ISO date `YYYY-MM-DD`; cannot be later than `dateTo`; maximum report range is 366 days unless user has `attendance.report.longRange`. |
| `dateTo` | Date | Yes for reports | ISO date `YYYY-MM-DD`; cannot be future date for completed report exports; can be today for operational reports. |
| `markedAt` | DateTime | System-generated | Oman GST UTC+4 display; stored as UTC; cannot be manually edited. |
| `submittedAt` | DateTime | System-generated | Oman GST UTC+4 display; stored as UTC. |
| `remarks` | Text | Optional | Trimmed string; minimum 3 characters when provided; maximum 500 characters; allowed pattern `^[\p{L}\p{N}\s.,;:()\-_/\\@#&%!?+]*$` with Unicode flag. |
| `correctionReason` | Text | Yes | Trimmed string; minimum 10 characters; maximum 1000 characters; must not contain script tags or HTML. |
| `approvalRemarks` | Text | Conditional | Required for rejection; optional for approval; minimum 10 characters when rejection; maximum 1000 characters. |
| `lateMinutes` | Integer | Conditional | Required when status is `LATE` if late-minute tracking is enabled; min `1`; max `240`; cannot exceed scheduled session duration. |
| `attendancePercentage` | Decimal | System-generated | Calculated to two decimal places; range `0.00` to `100.00`. |
| `thresholdPercentage` | Decimal | Config-derived | Range `0.00` to `100.00`; course completion rule source. |

### 5.3 Attendance Status Input Rules

| Field | Type | Mandatory | Allowed Values | Validation |
|---|---|---:|---|---|
| `attendanceStatus` | Enum | Yes for final submission | `PRESENT`, `ABSENT`, `LATE`, `EXCUSED` | Must be one of configured active lookup values; inactive statuses must not be selectable for new marking. |
| `bulkStatus` | Enum | Yes for bulk action | `PRESENT`, `ABSENT`, `LATE`, `EXCUSED` | Applied only to selected rows or unmarked eligible rows. |
| `correctionNewStatus` | Enum | Yes | `PRESENT`, `ABSENT`, `LATE`, `EXCUSED` | Must differ from current attendance record status. |
| `correctionStatus` | Enum | System / approval action | `REQUESTED`, `APPROVED`, `REJECTED`, `CANCELLED` | Only authorized transitions allowed. |

---

## 6. Screen Details – Admin Portal

### 6.1 SCR-M08-ADM-001 – Attendance Dashboard

#### 6.1.1 Purpose

Provides a dense operational summary of attendance marking progress across the active branch scope. The screen helps coordinators and branch managers identify pending attendance, draft sessions, corrections awaiting approval, low attendance students, and report export shortcuts.

#### 6.1.2 Layout and Grid Structure

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header: Attendance Dashboard | Branch Scope | Date Range | Refresh | Export  │
├──────────────────────────────────────────────────────────────────────────────┤
│ KPI Cards: Today Sessions | Pending | Draft | Submitted | Corrections | Low   │
├──────────────────────────────────────────────────────────────────────────────┤
│ Left 66%: Pending/Draft Sessions Grid     │ Right 34%: Exceptions Panel      │
│                                           │ - Correction Requests            │
│                                           │ - Low Attendance Alerts          │
│                                           │ - Sessions With Roster Issues    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Bottom: Attendance Completion Trend by Day + Recent Audit Events             │
└──────────────────────────────────────────────────────────────────────────────┘
```

Grid rules:

- Desktop width `>= 1280px`: 12-column grid.
- KPI cards occupy 2 columns each, wrapping after six cards.
- Main grid occupies 8 columns; exception panel occupies 4 columns.
- Tablet width `768px–1279px`: KPI cards in 3-column grid; main and exception panels stacked.
- Mobile width `< 768px`: read-only compact stack; operational marking redirects to dedicated marking screen.

#### 6.1.3 Interactive Elements

| Element | Type | Behavior | Permission Required |
|---|---|---|---|
| Branch Scope Selector | Select / Combobox | Lists assigned branches only; defaults to user's current branch. | `attendance.session.read` |
| Date Preset | Segmented control | Today, Yesterday, This Week, This Month, Custom. | `attendance.session.read` |
| Refresh | Button | Re-fetch dashboard metrics. Disabled during loading. | `attendance.session.read` |
| Export Dashboard Summary | Button | Exports visible metrics as XLSX. Hidden without permission. | `attendance.report.export` |
| View Pending | Link button | Navigates to pending monitor with filters applied. | `attendance.session.read` |
| Review Corrections | Link button | Navigates to correction queue. | `attendance.correction.approve` |
| View Low Attendance | Link button | Navigates to low attendance monitor. | `attendance.report.read` |

#### 6.1.4 Filter Fields

| Field | UI Control | Type | Mandatory | Validation |
|---|---|---|---:|---|
| `branchId` | Combobox | String | Yes | Authorized branch only. |
| `datePreset` | Segmented control | Enum | Yes | `TODAY`, `YESTERDAY`, `THIS_WEEK`, `THIS_MONTH`, `CUSTOM`. |
| `dateFrom` | Date picker | Date | Conditional | Required when preset is `CUSTOM`; cannot be after `dateTo`. |
| `dateTo` | Date picker | Date | Conditional | Required when preset is `CUSTOM`; cannot be before `dateFrom`; range max 90 days for dashboard. |
| `trainerId` | Async combobox | String | No | Trainer must be assigned to selected branch. |

#### 6.1.5 KPI Cards

| Card | Calculation | Click Behavior |
|---|---|---|
| Today's Sessions | Count of attendance sessions with `attendanceDate = today` in branch scope. | Opens sessions list filtered to today. |
| Pending Attendance | Count where session status is `NOT_STARTED` and scheduled start time has passed. | Opens pending monitor. |
| Draft Attendance | Count where status is `DRAFT`. | Opens sessions list filtered to draft. |
| Submitted Attendance | Count where status is `SUBMITTED` or `LOCKED`. | Opens sessions list filtered to submitted. |
| Correction Requests | Count where correction status is `REQUESTED`. | Opens correction queue. |
| Low Attendance | Count of active enrollments below threshold. | Opens low attendance monitor. |

#### 6.1.6 Table Columns – Pending/Draft Sessions Grid

| Column | Source | Sort | Filter | Behavior |
|---|---|---:|---:|---|
| Session Date | `AttendanceSession.attendanceDate` | Yes | Yes | Display in Oman GST date format. |
| Time | `Session.startTime`, `Session.endTime` | Yes | No | Render local time range. |
| Branch | `Branch.nameLocalized` | Yes | Yes | Hidden when only one branch in scope. |
| Course | `Course.nameEnglish/nameArabic` | Yes | Yes | Truncate after 48 chars with tooltip. |
| Batch | `Batch.batchCode`, `Batch.name` | Yes | Yes | Link to batch detail if permitted. |
| Trainer | `TrainerProfile.person.fullName` | Yes | Yes | Show assigned trainer. |
| Roster Count | Count of generated records | Yes | No | Badge shows enrolled vs marked. |
| Status | Attendance session status | Yes | Yes | Localized status badge. |
| Last Updated | `updatedAt` | Yes | No | Relative and exact tooltip. |
| Actions | Derived | No | No | View, Mark, Continue Draft, Submit disabled where not allowed. |

Paging behavior:

- Default page size: 25.
- Supported page sizes: 25, 50, 100.
- Server-side sorting and filtering only.
- Empty page after filter change must reset to page 1.

#### 6.1.7 Dynamic UI States

| State | UI Behavior |
|---|---|
| Loading | Show KPI skeleton cards and table skeleton rows with no fake data. |
| Empty today | Show message: `No attendance sessions found for the selected date and branch.` with action `View all sessions`. |
| Permission missing | Hide restricted cards and show `You do not have permission to view attendance dashboard metrics.` when no cards are visible. |
| Branch access mismatch | Show authorization error page; do not render partial data. |
| Metric calculation error | Show inline error card with retry button and correlation ID. |

---

### 6.2 SCR-M08-ADM-002 – Attendance Sessions List

#### 6.2.1 Purpose

Lists attendance sessions generated from scheduled training sessions. Supports operational filtering, navigation to marking, review, exports, and exception detection.

#### 6.2.2 Layout

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Page Header: Attendance Sessions | Create Missing Sessions | Export          │
├──────────────────────────────────────────────────────────────────────────────┤
│ Filter Bar: Branch | Date Range | Course | Batch | Trainer | Status | Search │
├──────────────────────────────────────────────────────────────────────────────┤
│ Data Grid with sticky header, row selection, density toggle, column chooser   │
├──────────────────────────────────────────────────────────────────────────────┤
│ Pagination | Selected count | Bulk actions where permitted                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 6.2.3 Interactive Elements

| Element | Behavior | Permission |
|---|---|---|
| Create Missing Sessions | Creates attendance sessions for scheduled sessions that do not yet have attendance sessions. | `attendance.session.create` |
| Export | Exports filtered list, not all branches. | `attendance.report.export` |
| Column Chooser | Allows user to hide/show non-required columns. | `attendance.session.read` |
| Density Toggle | Compact, Comfortable. Default Compact. | `attendance.session.read` |
| Mark Attendance | Opens marking workspace when status is `NOT_STARTED` or `DRAFT`. | `attendance.record.mark` |
| View Detail | Opens session detail. | `attendance.session.read` |
| Request Correction | Opens correction form for submitted session. | `attendance.correction.request` |

#### 6.2.4 Filter Fields

| Field | Control | Validation |
|---|---|---|
| `search` | Text input | Optional; min 2 chars; max 80 chars; searches batch code, course name, trainer name, session title. |
| `branchId` | Combobox | Required unless consolidated permission is used; authorized branches only. |
| `dateFrom` | Date picker | Required; max range 366 days with report permission, 90 days otherwise. |
| `dateTo` | Date picker | Required; cannot be before `dateFrom`. |
| `courseId` | Async combobox | Optional; courses available in selected branch date range. |
| `batchId` | Async combobox | Optional; filtered by course and branch. |
| `trainerId` | Async combobox | Optional; branch-scoped trainers only. |
| `status` | Multi-select | Optional; allowed values `NOT_STARTED`, `DRAFT`, `SUBMITTED`, `LOCKED`, `CORRECTION_PENDING`. |
| `rosterIssueOnly` | Checkbox | Optional; true shows sessions with enrollment mismatch, duplicate, or missing roster rows. |

#### 6.2.5 Table Columns

| Column | Mandatory | Sort | Filter | Notes |
|---|---:|---:|---:|---|
| Attendance Session No. | Yes | Yes | Search | Generated display ID if configured; otherwise short ID. |
| Attendance Date | Yes | Yes | Yes | Date in Oman GST. |
| Scheduled Time | Yes | Yes | No | Start and end time. |
| Course Code | Yes | Yes | Yes | From Course Catalog. |
| Course Name | Yes | Yes | Yes | Localized display. |
| Batch Code | Yes | Yes | Yes | From Training Delivery. |
| Batch Name | No | Yes | Yes | Optional column. |
| Branch | Conditional | Yes | Yes | Hidden for single-branch users. |
| Classroom | No | Yes | Yes | From Session/Classroom. |
| Trainer | Yes | Yes | Yes | From scheduled session trainer. |
| Expected Roster | Yes | Yes | No | Count of active enrollments. |
| Marked Count | Yes | Yes | No | Count with attendance status set. |
| Missing Count | Yes | Yes | No | Expected minus marked. |
| Status | Yes | Yes | Yes | Badge. |
| Submitted By | No | Yes | Yes | Visible for submitted sessions. |
| Submitted At | No | Yes | Yes | Oman GST timestamp. |
| Updated At | Yes | Yes | No | Audit-friendly display. |
| Actions | Yes | No | No | Context menu. |

---

### 6.3 SCR-M08-ADM-003 – Attendance Session Detail

#### 6.3.1 Purpose

Shows full attendance session context and record-level results in read-only mode unless the user has allowed action permissions.

#### 6.3.2 Layout

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header: Session Title | Status Badge | Back | Mark/Continue | Export | Audit │
├──────────────────────────────────────────────────────────────────────────────┤
│ Summary Panel: Branch | Course | Batch | Trainer | Date | Time | Classroom   │
├──────────────────────────────────────────────────────────────────────────────┤
│ Count Cards: Expected | Present | Absent | Late | Excused | Missing          │
├──────────────────────────────────────────────────────────────────────────────┤
│ Tabs: Roster Records | Corrections | Audit Timeline | Completion Evidence   │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 6.3.3 Roster Records Table Columns

| Column | Sort | Filter | Behavior |
|---|---:|---:|---|
| Student Number | Yes | Search | Link to student profile if permitted. |
| Student Name | Yes | Search | Localized full name when available. |
| Enrollment Number | Yes | Search | Link to enrollment if permitted. |
| Corporate Account | Yes | Yes | Visible if record is corporate-linked. |
| Attendance Status | Yes | Yes | Badge. |
| Late Minutes | Yes | No | Blank unless status is `LATE`. |
| Remarks | No | Search | Tooltip for long text. |
| Marked By | Yes | Yes | User display name. |
| Marked At | Yes | Yes | Oman GST. |
| Correction Status | Yes | Yes | Shows latest correction status. |
| Actions | No | No | Request correction, view correction history. |

#### 6.3.4 Completion Evidence Tab

Displays calculated attendance evidence for each enrollment in the session's batch.

| Field | Description |
|---|---|
| Enrollment Number | Unique enrollment identifier. |
| Attendance Numerator | Count of records counted toward attendance. |
| Attendance Denominator | Count of eligible attendance sessions. |
| Attendance Percentage | Formula result rounded to two decimals. |
| Completion Threshold | Minimum attendance percentage from course completion rule. |
| Attendance Pass Indicator | `Meets Requirement` or `Below Requirement`. |
| Latest Calculation At | Timestamp when evidence was calculated. |

No completion approval action is allowed on this screen.

---

### 6.4 SCR-M08-ADM-004 – Attendance Marking Workspace

#### 6.4.1 Purpose

Primary operational screen for marking attendance. Supports individual status changes, bulk marking, draft save, validation, final submission, and correction-safe locking.

#### 6.4.2 Layout

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Sticky Header: Course | Batch | Date | Time | Trainer | Status | Timer       │
├──────────────────────────────────────────────────────────────────────────────┤
│ Alert Strip: Branch scope, roster warnings, save state, validation summary    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Toolbar: Search | Status Filter | Bulk Mark | Select All | Show Missing Only │
├──────────────────────────────────────────────────────────────────────────────┤
│ Attendance Roster Grid                                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ Sticky Footer: Marked/Missing Counts | Save Draft | Validate | Submit Final   │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 6.4.3 Roster Generation Rules Displayed in UI

The screen must display a read-only roster basis banner:

```text
Roster generated from active enrollments in Batch {batchCode} for Branch {branchCode} as of {attendanceDate}. Cancelled, dropped, deleted, and transferred-out enrollments are excluded.
```

If the roster has changed since draft save, show:

```text
Roster changed after the last draft save. Review newly added or removed enrollments before final submission.
```

#### 6.4.4 Input Fields Per Roster Row

| Field | Control | Mandatory | Validation | Editable When |
|---|---|---:|---|---|
| `selected` | Checkbox | No | Row selectable only if record is editable. | Session `NOT_STARTED` or `DRAFT`. |
| `attendanceStatus` | Radio group / segmented select | Yes for submission | `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`; cannot be blank on final submit. | Session `NOT_STARTED` or `DRAFT`. |
| `lateMinutes` | Number input | Conditional | Required when status `LATE` and late tracking enabled; integer 1 to scheduled duration minutes. | Row status `LATE`. |
| `remarks` | Text input | Optional or conditional | Max 500 chars; required when status `EXCUSED` if configured; required when overriding prior draft value. | Editable row. |
| `excuseReasonCode` | Select | Conditional | Required when status `EXCUSED` if configured lookup active; branch-specific active values only. | Row status `EXCUSED`. |

#### 6.4.5 Bulk Marking Behavior

| Action | Algorithm |
|---|---|
| Mark selected as Present | Apply `PRESENT` to selected editable rows only; preserve remarks unless user checks `Clear remarks`. |
| Mark unmarked as Present | Apply `PRESENT` to rows with null status only; do not overwrite already marked rows. |
| Mark selected as Absent | Apply `ABSENT`; clear `lateMinutes`; preserve remarks. |
| Mark selected as Late | Apply `LATE`; open modal to enter common late minutes or leave individual entry required. |
| Mark selected as Excused | Apply `EXCUSED`; open modal for common excuse reason and remarks. |
| Reset selected | Clear status, late minutes, excuse reason, and remarks after confirmation. |

#### 6.4.6 Submission Validation Algorithm

Before final submission, the UI must call server validation and display the result. Client validation is advisory only.

```text
1. Confirm user has attendance.record.submit.
2. Confirm attendance session is in NOT_STARTED or DRAFT.
3. Confirm active branch scope includes attendance session branch.
4. Load current scheduled session, batch, course, and branch.
5. Load active enrollments for the batch and branch.
6. Compare active enrollment roster with submitted record list.
7. Reject if any required active enrollment has no attendance record.
8. Reject if any submitted enrollment is not active for the session batch.
9. Reject if any attendance status is blank.
10. Reject if LATE has invalid lateMinutes when late tracking is enabled.
11. Reject if EXCUSED is missing required excuse reason or remarks when configured.
12. Reject if session is already submitted or locked.
13. Reject if optimistic version does not match latest session version.
14. If valid, return counts by status and allow final confirmation.
```

#### 6.4.7 Footer Buttons

| Button | Enabled When | Permission | Behavior |
|---|---|---|---|
| Save Draft | At least one row changed and session not submitted. | `attendance.record.mark` | Saves partial records as `DRAFT`. |
| Validate | Session editable. | `attendance.record.mark` | Runs validation without submitting. |
| Submit Final | Validation passes and all required rows marked. | `attendance.record.submit` | Opens confirmation dialog, then submits and locks. |
| Cancel Changes | Unsaved changes exist. | `attendance.record.mark` | Reverts to last saved draft. |
| Export Roster | Roster loaded. | `attendance.report.export` | Exports current roster view. |

#### 6.4.8 Confirmation Dialog

Fields shown:

- Branch name.
- Course name.
- Batch code and name.
- Attendance date and scheduled time.
- Total roster count.
- Present count.
- Absent count.
- Late count.
- Excused count.
- Missing count, which must be zero.
- Warning: `After submission, attendance can only be changed through correction workflow.`

Confirmation input:

| Field | Validation |
|---|---|
| `confirmationChecked` | Must be checked. |
| `submitReason` | Optional by default; mandatory if submitting after configured deadline; min 10 chars and max 500 chars. |

---

### 6.5 SCR-M08-ADM-005 – Pending Attendance Monitor

#### 6.5.1 Purpose

Shows sessions requiring action because attendance is not started, draft, overdue, or has roster issues.

#### 6.5.2 Layout

- Header with branch, date range, and overdue threshold.
- Left quick filters: `Overdue`, `Today`, `Draft`, `Roster Issues`, `Trainer Missing`, `High Priority`.
- Main data grid.
- Right drawer opens selected session action summary.

#### 6.5.3 Table Columns

| Column | Sort | Filter | Notes |
|---|---:|---:|---|
| Priority | Yes | Yes | Derived from overdue hours and batch criticality. |
| Overdue Age | Yes | Yes | Time since scheduled session ended. |
| Course | Yes | Yes | Localized. |
| Batch | Yes | Yes | Batch code and name. |
| Trainer | Yes | Yes | Assigned trainer. |
| Session Date | Yes | Yes | Oman date. |
| Scheduled End | Yes | No | Used for overdue calculation. |
| Expected Roster | Yes | No | Active enrollments count. |
| Marked Count | Yes | No | Draft count. |
| Issue | Yes | Yes | Missing roster, duplicate record, no trainer, no enrollments. |
| Action | No | No | Mark, assign follow-up, view. |

---

### 6.6 SCR-M08-ADM-006 – Low Attendance Monitor

#### 6.6.1 Purpose

Allows academic coordinators and branch managers to identify students whose attendance percentage is below course completion threshold or below warning threshold.

#### 6.6.2 Layout

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header: Low Attendance Monitor | Branch | Course | Batch | Threshold Filter  │
├──────────────────────────────────────────────────────────────────────────────┤
│ KPI: Below Completion Threshold | Warning Range | Recovered | Open Alerts     │
├──────────────────────────────────────────────────────────────────────────────┤
│ Data Grid                                                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Detail Drawer: Student attendance trend, session timeline, actions           │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 6.6.3 Filter Fields

| Field | Control | Validation |
|---|---|---|
| `branchId` | Combobox | Required; authorized branch. |
| `courseId` | Async combobox | Optional. |
| `batchId` | Async combobox | Optional; branch/course scoped. |
| `thresholdMode` | Select | `BELOW_COMPLETION`, `WARNING_RANGE`, `CUSTOM`. |
| `customThreshold` | Number | Required when `CUSTOM`; decimal 0.00 to 100.00. |
| `studentSearch` | Text | Optional; min 2 max 80. |
| `corporateOnly` | Checkbox | Optional. |
| `alertStatus` | Multi-select | `OPEN`, `ACKNOWLEDGED`, `RESOLVED`. |

#### 6.6.4 Table Columns

| Column | Sort | Filter | Behavior |
|---|---:|---:|---|
| Student Number | Yes | Search | Link if permitted. |
| Student Name | Yes | Search | Localized. |
| Enrollment Number | Yes | Search | Link if permitted. |
| Course | Yes | Yes | Localized. |
| Batch | Yes | Yes | Code/name. |
| Corporate Account | Yes | Yes | Visible for corporate participants. |
| Sessions Completed | Yes | No | Denominator. |
| Present Equivalent | Yes | No | Numerator according to rule. |
| Attendance % | Yes | Range | Two decimals; visual progress. |
| Required % | Yes | Range | From course completion rule. |
| Gap | Yes | Range | Required minus actual. |
| Alert Status | Yes | Yes | Badge. |
| Last Attendance | Yes | No | Latest record date/status. |
| Actions | No | No | View timeline, acknowledge alert, export student report. |

#### 6.6.5 Attendance Percentage Card Rules

Display formula:

```text
Attendance % = (Counted Attendance Sessions ÷ Eligible Attendance Sessions) × 100
```

The UI must show what statuses are counted by current configuration. Default display:

```text
Present and Late count as attended. Absent does not count. Excused is shown separately and follows configured completion rule.
```

---

### 6.7 SCR-M08-ADM-007 – Attendance Correction Queue

#### 6.7.1 Purpose

Lists correction requests requiring approval or review.

#### 6.7.2 Layout

- Header with status tabs: `Requested`, `Approved`, `Rejected`, `All`.
- Filter bar by branch, course, batch, trainer, requested by, date range.
- Data grid with row actions.

#### 6.7.3 Table Columns

| Column | Sort | Filter | Notes |
|---|---:|---:|---|
| Request Number | Yes | Search | Human-friendly correction ID if configured. |
| Requested At | Yes | Yes | Oman GST timestamp. |
| Branch | Yes | Yes | Hidden for single-branch scope. |
| Course | Yes | Yes | Localized. |
| Batch | Yes | Yes | Batch code. |
| Student | Yes | Search | Student number and name. |
| Attendance Date | Yes | Yes | Session date. |
| Old Status | Yes | Yes | Badge. |
| New Status | Yes | Yes | Badge. |
| Requested By | Yes | Yes | User name. |
| Approval Status | Yes | Yes | Badge. |
| Approver | Yes | Yes | Blank if pending. |
| Actions | No | No | Review, approve, reject where permitted. |

---

### 6.8 SCR-M08-ADM-008 – Attendance Correction Detail

#### 6.8.1 Purpose

Allows authorized approvers to review the evidence, approve or reject the correction, and maintain audit integrity.

#### 6.8.2 Layout

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header: Correction Request | Status | Back | Approve | Reject                │
├──────────────────────────────────────────────────────────────────────────────┤
│ Context Panel: Branch | Course | Batch | Session | Student | Enrollment      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Comparison Panel: Old Status → Requested Status | Reason | Supporting Notes   │
├──────────────────────────────────────────────────────────────────────────────┤
│ Approval Panel: Decision | Remarks | Confirmation                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ Audit Timeline                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 6.8.3 Approval Form Fields

| Field | Control | Mandatory | Validation |
|---|---|---:|---|
| `decision` | Radio | Yes | `APPROVE` or `REJECT`. |
| `approvalRemarks` | Textarea | Conditional | Required for rejection; optional for approval; min 10 chars when required; max 1000. |
| `confirmationChecked` | Checkbox | Yes | Must be checked before submit. |
| `version` | Hidden | Yes | Must match latest correction version. |

#### 6.8.4 Approval Processing UI Result

On approval:

- Update correction status to `APPROVED`.
- Apply new status to attendance record.
- Recalculate attendance percentage for enrollment.
- Update attendance session correction indicator.
- Write audit log.
- Display success toast with correction number.

On rejection:

- Update correction status to `REJECTED`.
- Preserve original attendance record.
- Write audit log with rejection reason.
- Display success toast.

---

### 6.9 SCR-M08-ADM-009 – Attendance Reports

#### 6.9.1 Purpose

Provides operational and compliance attendance reporting by branch, date range, course, batch, trainer, student, enrollment, and attendance status.

#### 6.9.2 Report Modes

| Mode | Description |
|---|---|
| Session Summary | One row per attendance session with status counts. |
| Student Attendance Detail | One row per student-session attendance record. |
| Enrollment Attendance Summary | One row per enrollment with attendance percentage. |
| Trainer Attendance Submission | Tracks trainer submission timeliness. |
| Exception Report | Missing, draft, overdue, correction, and low attendance records. |

#### 6.9.3 Layout

- Report type selector at top.
- Dense filter panel with collapsible advanced filters.
- Results grid.
- Export menu.
- Saved view dropdown if configured.

#### 6.9.4 Export Rules

| Export Format | Permission | Constraints |
|---|---|---|
| CSV | `attendance.report.export` | Max 100,000 rows; server streaming recommended. |
| XLSX | `attendance.report.export` | Max 50,000 rows per sheet; include filters header. |
| PDF | `attendance.report.exportPdf` | Intended for formatted summaries only; max 5,000 rows. |

Export must include:

- Report title.
- Branch scope.
- Filter criteria.
- Generated by.
- Generated at in Oman GST.
- Page number for PDF.
- Confidentiality footer for student-level data.

---

### 6.10 SCR-M08-ADM-010 – Corporate Attendance Report

#### 6.10.1 Purpose

Allows internal users and corporate-authorized users to view participant attendance for corporate accounts without exposing unrelated student records.

#### 6.10.2 Filter Fields

| Field | Control | Mandatory | Validation |
|---|---|---:|---|
| `corporateAccountId` | Async combobox | Yes | Required for corporate report; user must have access to account. |
| `contractId` | Combobox | Optional | Must belong to corporate account. |
| `courseId` | Combobox | Optional | Must have corporate participants in selected account. |
| `batchId` | Combobox | Optional | Must contain corporate enrollments for account. |
| `dateFrom` | Date picker | Yes | Max range 366 days. |
| `dateTo` | Date picker | Yes | Cannot be before dateFrom. |
| `participantSearch` | Text | Optional | Min 2 max 80. |

#### 6.10.3 Table Columns

| Column | Sort | Filter | Notes |
|---|---:|---:|---|
| Corporate Account | Yes | Yes | Internal only; hidden for single corporate login. |
| Employee Code | Yes | Search | From CorporateParticipant. |
| Participant Name | Yes | Search | Person full name. |
| Department | Yes | Yes | Corporate participant department. |
| Designation | Yes | Yes | Corporate participant designation. |
| Student Number | Yes | Search | If linked. |
| Enrollment Number | Yes | Search | Mandatory for attendance. |
| Course | Yes | Yes | Localized. |
| Batch | Yes | Yes | Batch code. |
| Attendance % | Yes | Range | Two decimals. |
| Present | Yes | No | Count. |
| Absent | Yes | No | Count. |
| Late | Yes | No | Count. |
| Excused | Yes | No | Count. |
| Last Session Date | Yes | No | Oman date. |

---

### 6.11 SCR-M08-ADM-011 – Attendance Audit Log Viewer

#### 6.11.1 Purpose

Allows compliance users to search sensitive attendance actions including marking, draft save, final submission, correction request, correction approval, restore, soft delete, export, and report access.

#### 6.11.2 Filter Fields

| Field | Control | Validation |
|---|---|---|
| `entityType` | Multi-select | `AttendanceSession`, `AttendanceRecord`, `AttendanceCorrection`, `AttendanceAlert`. |
| `entityId` | Text | Optional; UUID/CUID pattern. |
| `action` | Multi-select | `CREATE`, `UPDATE`, `SUBMIT`, `LOCK`, `REQUEST_CORRECTION`, `APPROVE_CORRECTION`, `REJECT_CORRECTION`, `SOFT_DELETE`, `RESTORE`, `EXPORT`. |
| `performedBy` | Async user selector | Optional; authorized branch users. |
| `dateFrom` | DateTime | Required; max range 366 days. |
| `dateTo` | DateTime | Required. |
| `branchId` | Combobox | Required unless consolidated audit permission. |

#### 6.11.3 Table Columns

| Column | Sort | Filter | Notes |
|---|---:|---:|---|
| Performed At | Yes | Yes | Oman GST. |
| Action | Yes | Yes | Localized action. |
| Entity Type | Yes | Yes | Entity name. |
| Entity Reference | Yes | Search | Link if user can view entity. |
| Branch | Yes | Yes | Branch name. |
| Performed By | Yes | Yes | User display name. |
| Old Value | No | No | JSON diff drawer. |
| New Value | No | No | JSON diff drawer. |
| Reason | No | Search | Display truncated text. |
| IP Address | No | Search | Visible to audit permission only. |

---

### 6.12 SCR-M08-ADM-012 – Attendance Settings View

#### 6.12.1 Purpose

Read-only or permission-controlled configuration view for attendance thresholds, status definitions, correction rules, and calculation settings. Configuration ownership may reside in Configuration/Master Data or Course Catalog depending on field.

#### 6.12.2 Sections

| Section | Fields | Owner Context |
|---|---|---|
| Attendance Status Values | Present, Absent, Late, Excused active/inactive labels | Configuration / Master Data |
| Course Completion Attendance Rules | Minimum attendance percentage, counted statuses, exam/payment requirements link | Course Catalog |
| Correction Workflow Rules | Approver permission, mandatory reason, deadline behavior | Attendance / Audit Compliance |
| Low Attendance Alert Rules | Warning threshold, alert status labels, notification trigger | Attendance / Communication |
| Localization Labels | English and Arabic labels for statuses and messages | Configuration / Master Data |

---

## 7. Screen Details – Trainer Portal

### 7.1 SCR-M08-TRN-001 – My Attendance Tasks

#### Purpose

Shows sessions assigned to the logged-in trainer that need attendance marking or review.

#### Layout

- Compact header with `Today`, `Pending`, `Draft`, `Submitted` tabs.
- Date strip for current week.
- Task cards for mobile/tablet and table for desktop.

#### Task Card Fields

| Field | Description |
|---|---|
| Course Name | Localized course name. |
| Batch Code | Batch identifier. |
| Session Time | Start/end time. |
| Classroom | Classroom name if available. |
| Status | Attendance status badge. |
| Marked Count | Marked/expected count. |
| Action | Start, Continue, View. |

#### Permission Behavior

- Trainer sees only sessions where they are assigned as trainer or have delegated marking permission.
- `Mark` hidden when session is submitted.
- `Request Correction` shown only after submitted and if correction request permission exists.

---

### 7.2 SCR-M08-TRN-002 – Trainer Mark Attendance

Uses the same functional behavior as SCR-M08-ADM-004 but with trainer-first optimizations.

#### Tablet-Optimized Layout

```text
┌──────────────────────────────────────────────┐
│ Sticky Session Header                         │
├──────────────────────────────────────────────┤
│ Quick Buttons: All Present | Missing Only     │
├──────────────────────────────────────────────┤
│ Student Cards / Compact Roster Rows           │
├──────────────────────────────────────────────┤
│ Sticky Footer: Save Draft | Submit Final      │
└──────────────────────────────────────────────┘
```

#### Student Card Fields

| Field | Control |
|---|---|
| Student number and name | Read-only. |
| Enrollment number | Read-only. |
| Attendance status | Large segmented control. |
| Late minutes | Numeric input shown only for Late. |
| Remarks | Collapsible text field. |

#### Keyboard Shortcuts for Desktop Trainer View

| Shortcut | Action |
|---|---|
| `P` | Mark focused row Present. |
| `A` | Mark focused row Absent. |
| `L` | Mark focused row Late. |
| `E` | Mark focused row Excused. |
| `Ctrl+S` / `Cmd+S` | Save draft. |
| `Ctrl+Enter` / `Cmd+Enter` | Validate for submission. |

---

### 7.3 SCR-M08-TRN-003 – Trainer Attendance History

#### Purpose

Allows trainer to review submitted sessions they were responsible for.

#### Columns

| Column | Sort | Filter |
|---|---:|---:|
| Date | Yes | Yes |
| Course | Yes | Yes |
| Batch | Yes | Yes |
| Session Title | Yes | Search |
| Roster Count | Yes | No |
| Present | Yes | No |
| Absent | Yes | No |
| Late | Yes | No |
| Excused | Yes | No |
| Submitted At | Yes | Yes |
| Correction Pending | Yes | Yes |
| Actions | No | No |

---

### 7.4 SCR-M08-TRN-004 – Trainer Correction Request

#### Purpose

Allows trainer to submit correction request for a record from a submitted session.

#### Form Fields

| Field | Control | Mandatory | Validation |
|---|---|---:|---|
| `attendanceRecordId` | Search/select | Yes | Must belong to trainer's assigned submitted session and authorized branch. |
| `currentStatus` | Read-only badge | Yes | Loaded from record. |
| `newStatus` | Select | Yes | Must differ from current status. |
| `lateMinutes` | Number | Conditional | Required if new status is Late and late tracking enabled. |
| `reason` | Textarea | Yes | Min 10, max 1000, no HTML. |
| `supportingRemarks` | Textarea | Optional | Max 1000. |
| `confirmationChecked` | Checkbox | Yes | Must be checked. |

---

### 7.5 SCR-M08-TRN-005 – My Correction Requests

#### Purpose

Shows trainer's own submitted correction requests and outcomes.

#### Columns

| Column | Sort | Filter |
|---|---:|---:|
| Requested At | Yes | Yes |
| Course | Yes | Yes |
| Batch | Yes | Yes |
| Student | Yes | Search |
| Attendance Date | Yes | Yes |
| Old Status | Yes | Yes |
| Requested Status | Yes | Yes |
| Request Status | Yes | Yes |
| Approver Remarks | No | Search |

---

## 8. Screen Details – Student Portal

### 8.1 SCR-M08-STU-001 – My Attendance Summary

#### Purpose

Allows a student to view attendance across all active and completed enrollments.

#### Layout

- Enrollment cards grouped by status: Active, Completed, Dropped/Cancelled read-only if visible by policy.
- Attendance percentage card per enrollment.
- Low attendance warning banner when below threshold.

#### Enrollment Card Fields

| Field | Description |
|---|---|
| Course Name | Localized. |
| Batch Code | Batch identifier. |
| Attendance % | Two decimals with threshold. |
| Required % | From course completion rule. |
| Sessions Attended | Counted sessions. |
| Total Eligible Sessions | Denominator. |
| Last Attendance Status | Latest attendance record. |
| View Details | Opens enrollment attendance detail. |

#### Restrictions

- Student cannot edit, request correction, or view other students.
- Student cannot view trainer audit details.
- Student sees only enrollments linked to their authenticated person/student profile.

---

### 8.2 SCR-M08-STU-002 – Enrollment Attendance Detail

#### Table Columns

| Column | Sort | Filter | Notes |
|---|---:|---:|---|
| Session Date | Yes | Yes | Oman date. |
| Session Title | Yes | Search | From Training Delivery. |
| Time | Yes | No | Start/end. |
| Trainer | Yes | No | Display name. |
| Status | Yes | Yes | Localized badge. |
| Late Minutes | Yes | No | Visible if applicable. |
| Remarks | No | No | Only student-safe remarks; internal correction notes hidden. |
| Submitted At | Yes | Yes | Oman GST. |

#### Empty State

If no attendance records exist yet:

```text
Attendance has not been recorded for this enrollment yet.
```

Arabic:

```text
لم يتم تسجيل الحضور لهذا التسجيل بعد.
```

---

### 8.3 SCR-M08-STU-003 – Low Attendance Alert Detail

#### Fields

| Field | Description |
|---|---|
| Alert Status | Open, acknowledged, resolved. |
| Current Attendance % | Current calculated percentage. |
| Required Attendance % | Required course threshold. |
| Gap | Required minus current. |
| Remaining Scheduled Sessions | Count of future sessions in batch schedule if available. |
| Recovery Indicator | Informational estimate, not guarantee. |
| Suggested Action | Contact coordinator or attend upcoming sessions. |

The recovery indicator must be labeled as informational only and must not guarantee completion or certificate eligibility.

---

## 9. Screen Details – Corporate Portal / Read-Only External Views

### 9.1 SCR-M08-COR-001 – Corporate Participant Attendance

#### Purpose

Allows corporate coordinators to view attendance for participants nominated by their corporate account.

#### Access Rules

- Corporate coordinator can view only participants linked to their `CorporateAccount`.
- Internal branch users can view corporate report only within authorized branch scope.
- Student personal identifiers beyond corporate reporting needs must be minimized.

#### Columns

| Column | Sort | Filter |
|---|---:|---:|
| Employee Code | Yes | Search |
| Participant Name | Yes | Search |
| Department | Yes | Yes |
| Course | Yes | Yes |
| Batch | Yes | Yes |
| Attendance % | Yes | Range |
| Present | Yes | No |
| Absent | Yes | No |
| Late | Yes | No |
| Excused | Yes | No |
| Last Updated | Yes | No |

### 9.2 SCR-M08-COR-002 – Corporate Attendance Export

Corporate exports must include only:

- Corporate account name.
- Contract number when linked.
- Participant name.
- Employee code.
- Department and designation.
- Course and batch.
- Attendance counts and percentage.
- Session-level status when selected.
- Generated by and generated at.

Exports must not include internal user IDs, internal audit JSON, branch-only remarks, correction approver internal comments, or unrelated enrollment financial details.

---

## 10. Dynamic UI States

### 10.1 Loading States

| Area | Required Loading UI |
|---|---|
| Dashboard KPI cards | Skeleton blocks with card title placeholders and animated loading. |
| Data grids | Skeleton rows equal to current page size; keep table header visible. |
| Async selectors | Spinner in field; preserve selected value while loading options. |
| Marking workspace | Header skeleton, roster skeleton, disabled footer actions. |
| Submission validation | Blocking button spinner and inline message `Validating attendance records...`. |
| Export | Non-blocking export progress toast with cancel unavailable unless backend supports cancellation. |

### 10.2 Empty States

| Scenario | English Message | Arabic Message | Primary Action |
|---|---|---|---|
| No sessions | No attendance sessions found for the selected filters. | لم يتم العثور على جلسات حضور حسب عوامل التصفية المحددة. | Clear filters. |
| No pending attendance | There is no pending attendance for the selected branch and date range. | لا يوجد حضور معلق للفرع ونطاق التاريخ المحددين. | View all sessions. |
| No low attendance | No students are below the selected attendance threshold. | لا يوجد طلاب أقل من حد الحضور المحدد. | Change threshold. |
| No corrections | No correction requests match the selected filters. | لا توجد طلبات تصحيح تطابق عوامل التصفية المحددة. | Clear filters. |
| No roster rows | No active enrollments are available for this batch and session. | لا توجد تسجيلات نشطة لهذه الدفعة والجلسة. | View batch enrollments. |
| Student no records | Attendance has not been recorded for this enrollment yet. | لم يتم تسجيل الحضور لهذا التسجيل بعد. | Back to summary. |

### 10.3 Validation Error States

| Error Code | Trigger | UI Location | Message EN | Message AR |
|---|---|---|---|---|
| `ATT_BRANCH_FORBIDDEN` | User requests unauthorized branch. | Page-level error | You do not have access to this branch. | ليس لديك صلاحية الوصول إلى هذا الفرع. |
| `ATT_SESSION_LOCKED` | User tries to edit submitted/locked session. | Alert strip | This attendance session is locked. Submit a correction request to change records. | جلسة الحضور هذه مقفلة. قدم طلب تصحيح لتغيير السجلات. |
| `ATT_ROSTER_MISSING_RECORDS` | Final submit has missing statuses. | Submission summary | Mark attendance for all required students before final submission. | يرجى تسجيل الحضور لجميع الطلاب المطلوبين قبل الإرسال النهائي. |
| `ATT_INVALID_LATE_MINUTES` | Late status with invalid minutes. | Row-level field error | Enter late minutes between 1 and the session duration. | أدخل دقائق التأخير بين 1 ومدة الجلسة. |
| `ATT_EXCUSE_REASON_REQUIRED` | Excused status requires reason. | Row-level field error | Select an excuse reason and enter remarks. | اختر سبب العذر وأدخل الملاحظات. |
| `ATT_VERSION_CONFLICT` | Stale draft or concurrent update. | Modal | Attendance was updated by another user. Reload before continuing. | تم تحديث الحضور بواسطة مستخدم آخر. أعد التحميل قبل المتابعة. |
| `ATT_CORRECTION_SAME_STATUS` | New correction status equals old status. | Form field | Requested status must be different from the current status. | يجب أن تكون الحالة المطلوبة مختلفة عن الحالة الحالية. |
| `ATT_REASON_TOO_SHORT` | Correction reason under 10 characters. | Form field | Enter at least 10 characters. | أدخل 10 أحرف على الأقل. |
| `ATT_EXPORT_TOO_LARGE` | Export exceeds limit. | Toast/dialog | Narrow the filters before exporting this report. | قم بتضييق عوامل التصفية قبل تصدير هذا التقرير. |

### 10.4 Permission-Based Element Hiding and Disabling

| Permission Missing | Hidden or Disabled Elements |
|---|---|
| `attendance.session.read` | Attendance menu item, session lists, dashboard cards. |
| `attendance.session.create` | Create Missing Sessions button. |
| `attendance.record.mark` | Status controls, bulk mark action bar, save draft button. |
| `attendance.record.submit` | Submit final button and final confirmation dialog action. |
| `attendance.correction.request` | Request correction actions. |
| `attendance.correction.approve` | Approve/reject buttons and approval form. |
| `attendance.report.read` | Report screens and low attendance monitor. |
| `attendance.report.export` | CSV/XLSX export buttons. |
| `attendance.audit.read` | Audit timeline details, audit viewer route, old/new value JSON. |
| `attendance.softDelete` | Archive/restore controls for attendance sessions or records where allowed. |
| `attendance.consolidated.read` | Multi-branch consolidated selector and consolidated dashboard metrics. |

Rules:

- Hidden means the user should not see the element at all.
- Disabled is used only when the user has permission but the current entity state blocks the action.
- Server authorization must still enforce the same checks.

### 10.5 Optimistic Locking and Concurrent Editing UI

Every editable attendance session and correction form must include a hidden `version` value. When a save or submit returns a conflict:

1. Display conflict dialog.
2. Show latest updated by and updated at if user has read permission.
3. Offer `Reload latest version`.
4. Offer `Download my unsaved changes as CSV` for marking workspace if possible.
5. Do not auto-merge attendance records.

---

## 11. Bilingual Layout Rules

### 11.1 Global LTR and RTL Behavior

| Area | English LTR | Arabic RTL |
|---|---|---|
| Page direction | `dir="ltr"` | `dir="rtl"` |
| Sidebar | Left side | Right side |
| Breadcrumb | Home > Attendance > Sessions | الرئيسية < الحضور < الجلسات, visually right-to-left |
| Primary action button | Right side of header action group | Left side of header action group after mirroring |
| Back button icon | Left arrow | Right arrow |
| Table horizontal scroll | Starts from left | Starts from right |
| Numeric values | Western digits by default unless locale setting requires Arabic digits | Must remain readable; system may use Arabic locale digits if configured globally |
| Date display | `04 Jul 2026` or configured English format | Arabic month/day names where locale enabled |
| Status badges | English label | Arabic label |
| Form labels | Above or left-aligned | Above or right-aligned |
| Validation messages | Below field, left-aligned | Below field, right-aligned |
| Icons with direction | Chevron, arrow, timeline direction must mirror | Mirrored |

### 11.2 Bilingual Table Rules

- Column order must mirror for Arabic where the design system supports full RTL table rendering.
- Row action kebab menu remains at the visual end of the row.
- Numeric columns such as counts, percentages, and minutes must align toward the decimal edge. For English this is right-aligned; for Arabic it remains visually aligned for numeric comparison.
- Course, branch, batch, and student names must use localized fields where available.
- If Arabic value is missing, fallback to English and show no broken placeholder.
- Search must support English and Arabic text.
- CSV/XLSX exports must include columns in the language selected at export time.

### 11.3 Bilingual Form Rules

| Component | English Behavior | Arabic Behavior |
|---|---|---|
| Radio group for attendance status | Present, Absent, Late, Excused left-to-right | حاضر، غائب، متأخر، بعذر right-to-left |
| Bulk action menu | Icon then label | Label then mirrored icon |
| Confirmation dialogs | Primary button on right | Primary button on left if design system mirrors actions |
| Required indicator | After label text | Before or after according to Arabic design system, consistently applied |
| Date picker | Gregorian dates; week starts according to configured locale | Arabic labels; same underlying ISO values |

### 11.4 Text Expansion Rules

Arabic labels may be longer than English. The UI must:

- Allow table header wrapping to two lines in comfortable density.
- Keep compact density headers truncated with tooltip.
- Use minimum button width `96px` for status buttons.
- Avoid fixed text containers below `140px` for bilingual labels.
- Preserve badge readability for Arabic statuses.

---

## 12. Navigation and Information Architecture

### 12.1 Admin Portal Navigation

```text
Admin Portal
└── Attendance
    ├── Dashboard
    ├── Sessions
    │   ├── Session Detail
    │   └── Mark Attendance
    ├── Pending Attendance
    ├── Low Attendance
    ├── Corrections
    │   └── Correction Detail
    ├── Reports
    │   ├── Attendance Reports
    │   └── Corporate Attendance Report
    ├── Audit Logs
    └── Settings View
```

### 12.2 Trainer Portal Navigation

```text
Trainer Portal
└── Attendance
    ├── My Tasks
    ├── Mark Attendance
    ├── Attendance History
    └── Correction Requests
```

### 12.3 Student Portal Navigation

```text
Student Portal
└── My Learning
    └── Attendance
        ├── Attendance Summary
        └── Enrollment Attendance Detail
```

### 12.4 Corporate Portal Navigation

```text
Corporate Portal
└── Training
    └── Attendance
        ├── Participant Attendance
        └── Export Attendance
```

---

## 13. UI-to-API Interaction Contracts

### 13.1 Attendance Session List Query

```ts
type AttendanceSessionListQuery = {
  branchId: string;
  dateFrom: string;
  dateTo: string;
  courseId?: string;
  batchId?: string;
  trainerId?: string;
  status?: Array<'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'LOCKED' | 'CORRECTION_PENDING'>;
  search?: string;
  rosterIssueOnly?: boolean;
  page: number;
  pageSize: 25 | 50 | 100;
  sortBy:
    | 'attendanceDate'
    | 'scheduledStartTime'
    | 'courseName'
    | 'batchCode'
    | 'trainerName'
    | 'status'
    | 'updatedAt';
  sortDirection: 'asc' | 'desc';
};
```

### 13.2 Attendance Draft Save Payload

```ts
type SaveAttendanceDraftRequest = {
  attendanceSessionId: string;
  version: number;
  records: Array<{
    attendanceRecordId?: string;
    enrollmentId: string;
    studentProfileId: string;
    attendanceStatus?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    lateMinutes?: number;
    excuseReasonCode?: string;
    remarks?: string;
  }>;
};
```

### 13.3 Attendance Final Submit Payload

```ts
type SubmitAttendanceRequest = {
  attendanceSessionId: string;
  version: number;
  records: Array<{
    attendanceRecordId?: string;
    enrollmentId: string;
    studentProfileId: string;
    attendanceStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    lateMinutes?: number;
    excuseReasonCode?: string;
    remarks?: string;
  }>;
  submitReason?: string;
  confirmationAccepted: true;
};
```

### 13.4 Correction Request Payload

```ts
type AttendanceCorrectionRequestPayload = {
  attendanceRecordId: string;
  currentStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  requestedStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  requestedLateMinutes?: number;
  requestedExcuseReasonCode?: string;
  reason: string;
  supportingRemarks?: string;
  confirmationAccepted: true;
};
```

### 13.5 Correction Approval Payload

```ts
type AttendanceCorrectionDecisionPayload = {
  correctionId: string;
  version: number;
  decision: 'APPROVE' | 'REJECT';
  approvalRemarks?: string;
  confirmationAccepted: true;
};
```

---

## 14. Accessibility Requirements

| Area | Requirement |
|---|---|
| Keyboard access | Every attendance status control, row checkbox, filter, and action menu must be keyboard reachable. |
| Screen reader labels | Status buttons must announce student name and selected status. |
| Color independence | Status cannot rely only on color; text label and icon are required. |
| Focus management | After bulk action, focus remains in roster grid and live region announces updated count. |
| Error summary | Submission validation failures must appear in an error summary with links to first invalid row. |
| Dialogs | Confirmation and correction dialogs must trap focus and support Escape to close unless submitting. |
| RTL accessibility | Screen reader order must match visual order in Arabic mode. |

---

## 15. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| `< 640px` | Student and trainer read/mark views use cards; admin data grids show horizontal scroll and recommend desktop for exports. |
| `640px–1023px` | Trainer marking supports tablet card list; filters collapse into drawer. |
| `1024px–1279px` | Admin grids use compact columns; optional columns hidden by default. |
| `>= 1280px` | Full dense dashboard and data grids enabled. |
| `>= 1536px` | Detail drawers may open side-by-side without navigating away. |

---

## 16. Screen-Level Permission Matrix

| Screen | Read Permission | Create/Update Permission | Submit/Approve Permission | Export Permission |
|---|---|---|---|---|
| Attendance Dashboard | `attendance.session.read` | Not applicable | Not applicable | `attendance.report.export` |
| Attendance Sessions List | `attendance.session.read` | `attendance.session.create` | Not applicable | `attendance.report.export` |
| Session Detail | `attendance.session.read` | Not applicable | Not applicable | `attendance.report.export` |
| Marking Workspace | `attendance.session.read` | `attendance.record.mark` | `attendance.record.submit` | `attendance.report.export` |
| Pending Monitor | `attendance.session.read` | Not applicable | Not applicable | `attendance.report.export` |
| Low Attendance Monitor | `attendance.report.read` | `attendance.alert.acknowledge` | Not applicable | `attendance.report.export` |
| Correction Queue | `attendance.correction.read` | Not applicable | `attendance.correction.approve` | `attendance.report.export` |
| Correction Detail | `attendance.correction.read` | Not applicable | `attendance.correction.approve` | Not applicable |
| Attendance Reports | `attendance.report.read` | Not applicable | Not applicable | `attendance.report.export` |
| Corporate Attendance Report | `attendance.corporateReport.read` | Not applicable | Not applicable | `attendance.report.export` |
| Audit Log Viewer | `attendance.audit.read` | Not applicable | Not applicable | `attendance.audit.export` |
| Settings View | `attendance.settings.read` | `attendance.settings.update` where enabled | Not applicable | Not applicable |

---

## 17. UI Business Rules Summary

| Rule ID | UI Rule | Applies To |
|---|---|---|
| UIR-M08-001 | Attendance marking controls must be hidden for submitted or locked sessions. | Marking Workspace |
| UIR-M08-002 | Final submit button must remain disabled until server validation passes. | Marking Workspace |
| UIR-M08-003 | A trainer can see only assigned sessions unless granted coordinator permission. | Trainer Portal |
| UIR-M08-004 | Multi-branch selector must show only authorized branches. | Admin Portal |
| UIR-M08-005 | Student portal must never expose other students' attendance records. | Student Portal |
| UIR-M08-006 | Corporate portal must never expose non-corporate or unrelated corporate account records. | Corporate Portal |
| UIR-M08-007 | Correction approval must require remarks when rejecting. | Correction Detail |
| UIR-M08-008 | Any stale version conflict must force reload before further save or submit. | Editable screens |
| UIR-M08-009 | Submitted attendance changes must be initiated through correction workflow only. | Session Detail, Marking Workspace |
| UIR-M08-010 | Export buttons must be hidden when export permission is missing. | Report screens |
| UIR-M08-011 | Arabic UI must mirror layout and preserve localized attendance labels. | All screens |
| UIR-M08-012 | Empty, loading, and error states must not reveal unauthorized branch, student, or corporate data. | All screens |

---

## 18. Implementation Notes for Next.js Monorepo

| Layer | Requirement |
|---|---|
| Route protection | Use server-side authorization checks in route handlers, server components, and API handlers. |
| Client components | Use client components for interactive grids, roster marking, bulk action state, and dialogs. |
| Server components | Use server components for initial branch-scoped data loading where possible. |
| Forms | Use schema-based validation shared between client and server where feasible. |
| State management | Keep marking workspace state local until draft save; avoid global stores for sensitive roster data. |
| Data fetching | Use branch-scoped query parameters and server-enforced branch context. |
| Audit | UI must not construct audit records directly; server writes audit after successful business operation. |
| Localization | All static labels come from translation files; domain labels come from localized data or lookup values. |
| Testing hooks | Buttons, filters, tabs, dialogs, and table rows must include stable `data-testid` values. |

### 18.1 Recommended Test IDs

| Element | Test ID Pattern |
|---|---|
| Attendance dashboard | `m08-att-dashboard` |
| Session list grid | `m08-att-session-grid` |
| Marking workspace | `m08-att-marking-workspace` |
| Roster row | `m08-att-roster-row-{attendanceRecordId}` |
| Status control | `m08-att-status-{attendanceRecordId}` |
| Save draft button | `m08-att-save-draft` |
| Submit final button | `m08-att-submit-final` |
| Correction form | `m08-att-correction-form` |
| Approval decision form | `m08-att-correction-decision-form` |
| Export menu | `m08-att-export-menu` |
| Audit timeline | `m08-att-audit-timeline` |

---

## 19. Completion Criteria for Part 3

Part 3 is complete when the implementation team can derive:

1. All Module 08 navigation routes.
2. All required admin, trainer, student, and corporate attendance screens.
3. All table columns, filters, sort rules, paging rules, and export behaviors.
4. All form fields with exact validation constraints.
5. All dynamic UI states including loading, empty, validation, permission, and conflict states.
6. All bilingual layout and rendering rules for English LTR and Arabic RTL.
7. Permission-based visibility behavior for each major screen and action.
8. UI-to-API payload shapes for marking, submitting, correction request, and correction approval.
