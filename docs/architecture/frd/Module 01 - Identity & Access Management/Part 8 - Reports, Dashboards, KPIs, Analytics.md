# ASTI IMS Solution Design Specification (SDS)

# Module 01 – Identity & Access Management (IAM)

# Part 8

# Reports, Dashboards, KPIs & Analytics

**Version:** 3.0

**Status:** Draft

---

# 1. Purpose

The Reporting & Analytics capabilities of the IAM module provide operational visibility, security monitoring, compliance reporting, and executive insights into identity and access activities.

The objectives are to:

* Monitor user lifecycle and account health
* Detect authentication and authorization issues
* Support security audits and compliance
* Measure operational efficiency
* Provide executive security dashboards
* Enable export and scheduled reporting

---

# 2. Reporting Architecture

```text
                 Identity & Access Management
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
    Operational       Security          Audit Events
       Data            Events
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
                 Reporting Data Service
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
      Reports         Dashboards        Analytics
```

---

# 3. Report Classification

| Category            | Description                | Audience       |
| ------------------- | -------------------------- | -------------- |
| Operational Reports | Daily operations           | Administrators |
| Security Reports    | Security monitoring        | IT & Security  |
| Audit Reports       | Compliance                 | Auditors       |
| Executive Reports   | KPIs & trends              | Management     |
| Exception Reports   | Issues requiring attention | Operations     |
| Analytical Reports  | Trends and forecasts       | Management     |

---

# 4. Operational Reports

## RPT-IAM-001 User Directory Report

### Purpose

Displays all users with organizational and account information.

### Filters

* Branch
* Department
* Role
* Status
* Created Date
* Last Login Date

### Columns

| Column         |
| -------------- |
| Employee Code  |
| Full Name      |
| Email          |
| Mobile         |
| Department     |
| Branch         |
| Assigned Roles |
| Status         |
| Last Login     |
| Created Date   |

### Actions

* Export Excel
* Export PDF
* Print
* Schedule

---

## RPT-IAM-002 Active Users Report

Shows:

* Active users
* Inactive users
* Suspended users
* Archived users

Filters

* Branch
* Department
* Status

---

## RPT-IAM-003 User Access Report

Shows:

* Assigned Roles
* Branch Access
* Permissions Count
* Default Branch
* Last Login

Useful during security audits.

---

# 5. Authentication Reports

---

## RPT-IAM-010 Login History Report

### Filters

* User
* Branch
* Date Range
* Result
* Browser
* Device

### Columns

| Column           |
| ---------------- |
| Login Date       |
| Logout Date      |
| User             |
| IP Address       |
| Browser          |
| Device           |
| OS               |
| Result           |
| Session Duration |

---

## RPT-IAM-011 Failed Login Report

Purpose

Detect unauthorized access attempts.

Columns

```text
User

Date

Attempts

IP Address

Failure Reason
```

Charts

* Failed Logins by Day
* Failed Logins by Branch
* Top Failed Accounts

---

## RPT-IAM-012 Locked Account Report

Shows

* Locked Users
* Lock Time
* Failed Attempts
* Unlock Time
* Unlock By

---

## RPT-IAM-013 Password Reset Report

Displays

* User
* Requested At
* Completed At
* Method
* Expired
* Failed

---

# 6. Authorization Reports

---

## RPT-IAM-020 Role Report

Columns

```text
Role

Users

Permissions

Created

Status
```

---

## RPT-IAM-021 Permission Matrix

Shows

```text
Role

Permission

Module

Action
```

Exportable for compliance reviews.

---

## RPT-IAM-022 Branch Access Report

Columns

```text
User

Branch

Default Branch

Child Branch Access

Consolidated Access
```

---

## RPT-IAM-023 Privileged Users Report

Shows users with high-risk permissions such as:

* User Administration
* Role Administration
* Finance Approval
* Payroll Approval
* Security Administration

Used for periodic access reviews.

---

# 7. Security Reports

---

## RPT-IAM-030 Security Events Report

Displays

* Login Failures
* Password Changes
* Account Locks
* Permission Changes
* Role Changes
* Session Terminations

---

## RPT-IAM-031 Permission Change Report

Columns

```text
Date

Administrator

Role

Permission

Added/Removed

Reason
```

---

## RPT-IAM-032 Session Report

Displays

* Active Sessions
* Expired Sessions
* Multiple Concurrent Sessions
* Long Running Sessions

---

## RPT-IAM-033 Suspicious Activity Report

Examples

* Excessive failed logins
* Multiple geographic logins (future)
* Login outside business hours
* Repeated permission denials
* Multiple password resets

---

# 8. Audit Reports

---

## RPT-IAM-040 Audit Trail

Complete immutable audit trail.

Filters

* Entity
* User
* Action
* Date
* Module

Columns

```text
Timestamp

User

Entity

Action

Old Value

New Value

IP

Correlation ID
```

---

## RPT-IAM-041 Configuration Change Report

Tracks changes to:

* Password Policy
* Session Policy
* Roles
* Permissions
* Security Settings

---

# 9. Dashboard Specification

---

# Dashboard 1 – Security Dashboard

Audience

System Administrator

Widgets

| Widget                  | Type     |
| ----------------------- | -------- |
| Successful Logins Today | KPI Card |
| Failed Logins Today     | KPI Card |
| Locked Accounts         | KPI Card |
| Active Sessions         | KPI Card |
| Permission Denials      | KPI Card |

Charts

* Login Trend (30 Days)
* Failed Login Trend
* Login by Branch
* Browser Distribution

---

# Dashboard 2 – Administration Dashboard

Widgets

```text
Total Users

Active Users

Inactive Users

Roles

Permissions

Branches
```

Charts

* User Growth
* Department Distribution
* Role Distribution
* Branch Distribution

---

# Dashboard 3 – Executive Dashboard

Widgets

```text
Total Employees

Login Success Rate

Security Score

Audit Events

System Availability
```

Charts

* Monthly User Growth
* Security Trend
* Access Trend

---

# Dashboard 4 – Compliance Dashboard

Widgets

```text
Audit Events

Policy Violations

Expired Passwords

Locked Accounts

Inactive Users
```

---

# 10. KPI Catalogue

| KPI                      | Formula                                |
| ------------------------ | -------------------------------------- |
| Login Success Rate       | Successful Logins / Total Logins × 100 |
| Failed Login Rate        | Failed Logins / Total Logins × 100     |
| Active User Ratio        | Active Users / Total Users × 100       |
| Password Expiry Ratio    | Expired Passwords / Total Users × 100  |
| Average Login Time       | Average Authentication Duration        |
| Average Session Duration | Average Logout - Login Time            |
| Role Utilization         | Users Assigned / Total Roles           |
| Permission Density       | Permissions / Role                     |

---

# 11. Analytics

## User Growth

Track

* Monthly users
* Department growth
* Branch growth

---

## Authentication Analytics

Track

* Login trend
* Peak login hours
* Login by weekday
* Login by device
* Login by browser

---

## Security Analytics

Track

* Failed login trend
* Permission denied trend
* Locked account trend
* Password reset trend

---

## Usage Analytics

Track

* Most active users
* Most active branches
* Most frequently used roles
* Most frequently accessed modules

---

# 12. Charts Catalogue

Supported visualizations:

| Chart       | Usage                      |
| ----------- | -------------------------- |
| KPI Card    | Single metric              |
| Line Chart  | Trends                     |
| Bar Chart   | Comparisons                |
| Stacked Bar | Branch comparisons         |
| Pie Chart   | Distribution               |
| Donut Chart | Role distribution          |
| Area Chart  | Growth trends              |
| Heatmap     | Login activity by hour/day |
| Table       | Detailed operational data  |

---

# 13. Drill-Down Capability

Every dashboard widget should support drill-down.

Example:

```text
Locked Accounts

↓

Click Widget

↓

Locked Account Report

↓

Select User

↓

View User Details

↓

View Login History

↓

View Audit Trail
```

---

# 14. Report Scheduling

Supported schedules:

* Daily
* Weekly
* Monthly
* Quarterly
* Yearly

Delivery channels:

* Email
* Download Center
* Shared Network Folder (Future)
* SFTP (Future)

---

# 15. Export Formats

Supported formats:

* Excel (.xlsx)
* CSV
* PDF

Future:

* Power BI Dataset
* Microsoft Excel Live Connection
* REST Reporting API

---

# 16. Report Security

Each report is protected by dedicated permissions.

Examples:

| Permission          | Report             |
| ------------------- | ------------------ |
| report.iam.user     | User Directory     |
| report.iam.login    | Login History      |
| report.iam.audit    | Audit Trail        |
| report.iam.security | Security Dashboard |
| report.iam.roles    | Role Report        |

Reports must respect the user's branch visibility and permission scope. For example, a Branch Manager should only see users and activity for assigned branches.

---

# 17. Report Performance Requirements

| Report                     | Target (P95) |
| -------------------------- | -----------: |
| User Directory             |  < 2 seconds |
| Login History              |  < 3 seconds |
| Audit Report               |  < 5 seconds |
| Dashboard Initial Load     |  < 2 seconds |
| Dashboard Refresh          |   < 1 second |
| Excel Export (10,000 rows) | < 30 seconds |

---

# 18. Data Retention for Reporting

| Dataset              | Retention |
| -------------------- | --------- |
| User Master          | Permanent |
| Login History        | 7 Years   |
| Audit Trail          | 7 Years   |
| Session History      | 90 Days   |
| Dashboard Aggregates | 2 Years   |
| KPI Snapshots        | 5 Years   |

---

# 19. Future Enhancements

* AI-based anomaly detection for suspicious login behavior
* Predictive account lockout risk
* Login forecasting by branch
* Role optimization recommendations
* Automated compliance report generation
* Power BI and Tableau connectors
* Executive scorecards
* Scheduled KPI alerts
* Natural language reporting (e.g., "Show failed logins in Muscat last week")

---

# 20. Cross-Module Reporting Integration

Although this specification is for IAM, reporting standards should be reused across all modules.

| Module        | Example Reports                        |
| ------------- | -------------------------------------- |
| CRM           | Lead conversion, counselor performance |
| Admissions    | Admission funnel, enrollment trends    |
| Students      | Student demographics, lifecycle        |
| Courses       | Course popularity, completion rates    |
| Finance       | Fee collection, outstanding balances   |
| Corporate     | Contract revenue, utilization          |
| Attendance    | Attendance %, absentee analysis        |
| Certificates  | Issued, pending, revoked certificates  |
| Communication | SMS, Email, WhatsApp delivery reports  |

This creates a unified reporting experience across ASTI IMS with consistent filters, exports, dashboards, security, and performance expectations.

---

# Deliverables of Part 8

The IAM module now includes:

* Comprehensive report catalogue
* Executive, administrative, security, and compliance dashboards
* KPI definitions and formulas
* Analytics requirements
* Chart catalogue
* Drill-down behavior
* Scheduling and export capabilities
* Report security model
* Performance targets
* Data retention policy
* Enterprise reporting standards reusable across all ASTI IMS modules
