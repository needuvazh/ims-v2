# Functional Requirement Document (FRD)

## Module 16: Reports & Dashboard Management

**Version:** 1.0
**Module Code:** RPT

**Dependencies:**

* Lead Management
* Student Management
* Course & Batch Management
* Scheduling
* Attendance
* Finance
* Corporate Training
* Completion
* Certificates
* Communication

**Provides Data To:**

* Management
* Operations Team
* Corporate Coordinators
* Future AI Analytics Platform

---

# 1. Business Purpose

Reports & Dashboard Management is responsible for aggregating operational, academic, financial, corporate, and compliance data into actionable dashboards and reports.

The module shall support:

* Operational Dashboards
* Executive Dashboards
* Financial Dashboards
* Corporate Training Dashboards
* Attendance Analytics
* Completion Analytics
* Ad-Hoc Reporting
* Export Framework
* KPI Monitoring

---

# 2. Reporting Architecture

```text
Business Domains
       ↓
Reporting Data Layer
       ↓
KPI Engine
       ↓
Dashboard Widgets
       ↓
Reports
       ↓
Exports
```

---

# 3. Dashboard Types

The system shall support:

```text
Executive Dashboard
Branch Dashboard
Counselor Dashboard
Trainer Dashboard
Finance Dashboard
Corporate Dashboard
Operations Dashboard
```

---

# 4. Report Categories

The system shall support:

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

---

# 5. Dashboard Framework

## RPT-UI-001 Dashboard Home

### Purpose

Provide role-based dashboard visibility.

### Widgets

```text
KPI Cards
Charts
Tables
Alerts
Notifications
Pending Actions
```

---

### Business Rules

* Dashboard should be role-driven.
* Widgets configurable by role.
* Refresh interval configurable.

---

# 6. Executive Dashboard

## RPT-UI-002 Executive Dashboard

### KPIs

```text
Total Students
Active Students
New Admissions
Revenue
Outstanding Fees
Lead Conversion Rate
Corporate Revenue
Trainer Utilization
Completion Rate
Certificate Issuance Rate
```

---

### Charts

```text
Monthly Admissions
Monthly Revenue
Lead Funnel
Course Performance
Branch Performance
```

---

### Actions

```text
Export Dashboard
Drill Down
View Reports
```

---

# 7. Branch Dashboard

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

---

### Charts

```text
Attendance Trend
Admission Trend
Collection Trend
```

---

# 8. Counselor Dashboard

## RPT-UI-004 Counselor Dashboard

### KPIs

```text
Assigned Leads
Pending Follow-Ups
Converted Leads
Lost Leads
Conversion Rate
```

---

### Pipeline View

```text
New
Contacted
Interested
Negotiation
Won
Lost
```

---

### Future AI Widget

```text
Suggested Follow-Ups
```

---

# 9. Finance Dashboard

## RPT-UI-005 Finance Dashboard

### KPIs

```text
Today's Collection
Monthly Collection
Outstanding Amount
Refund Requests
Pending Refunds
Corporate Receivables
```

---

### Charts

```text
Revenue Trend
Outstanding Trend
Collection Trend
```

---

# 10. Trainer Dashboard

## RPT-UI-006 Trainer Dashboard

### KPIs

```text
Assigned Batches
Assigned Sessions
Attendance Pending
Completion Pending
Utilization %
```

---

### Charts

```text
Workload Trend
Utilization Trend
```

---

# 11. Corporate Dashboard

## RPT-UI-007 Corporate Dashboard

### KPIs

```text
Active Customers
Active Contracts
Programs Running
Corporate Revenue
Pending Renewals
```

---

### Charts

```text
Revenue By Customer
Revenue By Contract
Program Completion Trend
```

---

# 12. Lead Reports

## RPT-UI-008 Lead Reports

### Reports

```text
Lead Source Report
Lead Conversion Report
Lead Funnel Report
Counselor Performance Report
Campaign Performance Report
```

---

### Filters

```text
Date Range
Branch
Counselor
Course
Campaign
```

---

# 13. Student Reports

## RPT-UI-009 Student Reports

### Reports

```text
Student Strength Report
Active Students Report
Course Enrollment Report
Branch Enrollment Report
Student Status Report
```

---

### Student Status

```text
Inquiry
Applied
Admitted
Active
Completed
Dropped
Suspended
Alumni
```

---

# 14. Attendance Reports

## RPT-UI-010 Attendance Reports

### Reports

```text
Daily Attendance
Batch Attendance
Student Attendance
Low Attendance Report
Attendance Trend Report
```

---

### KPIs

```text
Attendance %
Present
Absent
Late
Excused
```

---

# 15. Finance Reports

## RPT-UI-011 Finance Reports

### Reports

```text
Fee Collection Report
Outstanding Fee Report
Discount Report
Refund Report
Revenue Report
```

---

### Financial Dimensions

```text
Branch
Course
Department
Trainer
Corporate Customer
```

---

# 16. Trainer Reports

## RPT-UI-012 Trainer Reports

### Reports

```text
Trainer Utilization Report
Trainer Assignment Report
Trainer Performance Report
Trainer Availability Report
```

---

### KPIs

```text
Assigned Hours
Available Hours
Utilization %
```

---

# 17. Corporate Reports

## RPT-UI-013 Corporate Reports

### Reports

```text
Corporate Revenue Report
Contract Report
Program Report
Participant Report
Renewal Report
```

---

### KPIs

```text
Revenue
Completion Rate
Attendance Rate
Participant Count
```

---

# 18. Completion Reports

## RPT-UI-014 Completion Reports

### Reports

```text
Completion Report
Completion Pending Report
Exam Result Report
Pass/Fail Report
```

---

### KPIs

```text
Completion %
Pass %
Fail %
```

---

# 19. Certificate Reports

## RPT-UI-015 Certificate Reports

### Reports

```text
Certificates Issued
Certificates Pending
Certificates Reissued
Certificates Revoked
```

---

### KPIs

```text
Issue Rate
Verification Count
```

---

# 20. Communication Reports

## RPT-UI-016 Communication Reports

### Reports

```text
SMS Usage Report
WhatsApp Usage Report
Email Usage Report
Campaign Delivery Report
```

---

### KPIs

```text
Sent
Delivered
Read
Failed
```

---

# 21. Audit Reports

## RPT-UI-017 Audit Reports

### Reports

```text
User Activity Report
Data Change Report
Approval History
Login History
```

---

### Filters

```text
User
Action
Date Range
Module
```

---

# 22. Export Framework

## Supported Formats

```text
PDF
Excel
CSV
```

---

### Export Capabilities

```text
Dashboard Export
Report Export
Scheduled Export
```

---

### Business Rules

* Exports should honor security permissions.
* Large exports processed asynchronously.

---

# 23. Scheduled Reports

## RPT-UI-018 Scheduled Reports

### Purpose

Automatically generate reports.

### Frequency

```text
Daily
Weekly
Monthly
Quarterly
```

---

### Delivery

```text
Email
Notification Center
```

---

### Business Rules

* Role permissions enforced.
* Report history retained.

---

# 24. KPI Engine

## Examples

### Lead Conversion

```text
Won Leads
÷
Total Leads
×
100
```

---

### Attendance %

```text
Present Sessions
÷
Total Sessions
×
100
```

---

### Trainer Utilization

```text
Assigned Hours
÷
Available Hours
×
100
```

---

### Completion Rate

```text
Completed Students
÷
Eligible Students
×
100
```

---

# 25. Functional Requirements

## FR-RPT-001 Dashboard Framework

The system shall provide configurable dashboards.

---

## FR-RPT-002 Executive Dashboard

The system shall provide executive analytics.

---

## FR-RPT-003 Branch Dashboard

The system shall provide branch-level analytics.

---

## FR-RPT-004 Operational Reports

The system shall support operational reporting.

---

## FR-RPT-005 Financial Reports

The system shall support financial reporting.

---

## FR-RPT-006 Corporate Reports

The system shall support corporate reporting.

---

## FR-RPT-007 KPI Engine

The system shall calculate configurable KPIs.

---

## FR-RPT-008 Export Framework

The system shall support report exports.

---

## FR-RPT-009 Scheduled Reports

The system shall support automated report delivery.

---

## FR-RPT-010 Drill-Down Reporting

The system shall support report drill-down.

---

## FR-RPT-011 Role-Based Reporting

The system shall enforce role-based access.

---

## FR-RPT-012 Report Audit Trail

The system shall maintain report access history.

---

# 26. Notifications

### Scheduled Report Generated

Notify:

```text
Report Subscriber
```

---

### Report Generation Failed

Notify:

```text
Administrator
```

---

### KPI Threshold Breached

Notify:

```text
Management
Branch Manager
```

Examples:

```text
Attendance < 70%
Outstanding Fees > Limit
```

---

# 27. Audit Requirements

Audit:

```text
Dashboard Viewed
Report Generated
Report Exported
Report Scheduled
Schedule Modified
```

Capture:

```text
User
Timestamp
Report Name
Filters Used
Export Format
```

---

# 28. Critical Design Decisions

### Reporting Database

Recommended:

```text
Operational Database
        ↓
Reporting Views
```

Phase 1.

Future:

```text
Operational DB
       ↓
Data Warehouse
       ↓
BI Layer
```

---

### KPI Service

Recommended:

```text
Central KPI Engine
```

Instead of KPI calculations spread across modules.

---

### Drill-Down Capability

Every KPI should support:

```text
Card
  ↓
Summary Report
  ↓
Detailed Report
```

---

### Future AI Readiness

All KPIs should be stored historically for:

```text
Forecasting
Trend Analysis
AI Insights
```

---

# 29. Integration Points

### Consumes

```text
Lead Management
Student Management
Attendance
Finance
Corporate Training
Completion
Certificates
Communication
```

### Provides Data To

```text
Management
Operations
Corporate Teams
Future AI Platform
```
