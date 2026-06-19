# Functional Requirement Document

## Module 16: Reports & Dashboard Management

**Version:** 1.1
**Module Code:** RPT
**Phase:** Phase 2
**Owned Bounded Context:** Reporting & Analytics

**Dependencies:**

* Lead, Inquiry & CRM Management
* Admission & Enrollment Management
* Course & Batch Management
* Scheduling & Timetable Management
* Attendance Management
* Fee & Finance Management
* Corporate Training Management
* Exam, Result & Completion Management
* Certificate Management
* Communication Management
* Identity & Access Management
* Audit & Compliance

**Provides Data To:**

* Management
* Branch Operations
* Finance
* Counselors
* Trainers
* Corporate Coordinators
* Compliance Review

---

# 1. Business Purpose

Reporting & Analytics turns operational data into dashboards, scorecards, reports, and exports.

The context owns report definitions, dashboard widgets, and metric snapshots. It consumes read models from source domains and must not own transactional source data.

---

# 2. Scope

## 2.1 In Scope

* Dashboard configuration
* Role-aware widgets
* KPI cards and trend views
* Read-only reports
* Scheduled exports
* Snapshot-based metrics
* Filter presets
* Drill-down navigation

## 2.2 Out of Scope for Phase 1

* Operational write actions
* Source data correction
* Embedded workflow approval
* Predictive AI scoring

---

# 3. Owned Concepts

The Reporting context owns:

* ReportDefinition
* DashboardWidget
* MetricSnapshot

---

# 4. Business Principles

* Reporting must be read-only against operational source systems.
* Dashboards must respect role and branch scope defined in IAM.
* Metrics should come from approved read models or snapshots.
* Report definitions may be configured, but the report calculation logic belongs to the reporting context.
* Sensitive fields must be masked or omitted based on access policy.
* Exported reports must be auditable.

---

# 5. Business Model

## 5.1 Dashboard Types

```text
Executive Dashboard
Branch Dashboard
Counselor Dashboard
Trainer Dashboard
Finance Dashboard
Corporate Dashboard
Operations Dashboard
```

## 5.2 Report Categories

```text
Lead Reports
Student Reports
Attendance Reports
Finance Reports
Trainer Reports
Corporate Reports
Completion Reports
Certificate Reports
Communication Reports
Audit Reports
```

## 5.3 Report Lifecycle

```text
Draft
  ↓
Active
  ↓
Archived
```

## 5.4 Widget Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
```

---

# 6. Screens

## RPT-UI-001 Dashboard Home

### Widgets

```text
KPI Cards
Trend Charts
Tables
Alerts
Pending Actions
Announcements
```

### Filters

```text
Branch
Date Range
Course
Batch
Counselor
Trainer
```

## RPT-UI-002 Executive Dashboard

### KPIs

```text
Total Students
Active Enrollments
New Admissions
Revenue
Outstanding Fees
Lead Conversion Rate
Attendance Rate
Completion Rate
Certificate Issuance Rate
```

## RPT-UI-003 Branch Dashboard

### KPIs

```text
Branch Students
Today's Attendance
Today's Sessions
Fee Collection
Outstanding Fees
Upcoming Completions
```

## RPT-UI-004 Report Library

### Columns

```text
Report Code
Report Name
Category
Owner
Status
Last Run
Actions
```

### Actions

```text
Run
Schedule
Export
Clone
Archive
```

---

# 7. Functional Requirements

* The system shall allow authorized users to create and manage dashboard definitions.
* The system shall support role-based widget visibility and branch scope.
* The system shall support filters by branch, date, course, batch, counselor, trainer, and status.
* The system shall allow scheduled and on-demand report generation.
* The system shall generate exports in approved formats.
* The system shall use snapshots or read models for heavy metrics where needed.
* The system shall track report execution history.
* The system shall support drill-down from summary widgets to detail views.

---

# 8. Audit Events

The module shall emit audit events for:

```text
ReportDefinitionCreated
ReportDefinitionUpdated
DashboardWidgetConfigured
ReportExecuted
ReportExported
ReportScheduled
MetricSnapshotGenerated
```

---

# 9. Domain Errors

```text
REPORT_NOT_AVAILABLE
REPORT_ACCESS_DENIED
REPORT_DATA_STALE
EXPORT_FORMAT_NOT_SUPPORTED
EXPORT_LIMIT_EXCEEDED
WIDGET_NOT_ALLOWED_FOR_ROLE
METRIC_SNAPSHOT_UNAVAILABLE
```

---

# 10. Reporting Governance

* Source data must never be mutated from this module.
* Report calculations must be documented and versioned.
* Sensitive dashboards must respect IAM branch and permission rules.
* Exports must be logged for compliance and investigation.

