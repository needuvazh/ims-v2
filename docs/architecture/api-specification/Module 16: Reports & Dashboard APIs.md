# Detailed API Contract Specification

## Module 16: Reports & Dashboard APIs

**Version:** 1.0
**Base URL:** `/api/v1`
**Module Code:** `RPT`

---

# 1. Module Purpose

Reports & Dashboard APIs aggregate operational, academic, financial, corporate, certificate, communication, and audit data into dashboards and reports.

This module supports:

* Executive dashboards
* Branch dashboards
* Counselor dashboards
* Finance dashboards
* Trainer dashboards
* Corporate dashboards
* Lead reports
* Student reports
* Attendance reports
* Finance reports
* Trainer reports
* Corporate reports
* Completion reports
* Certificate reports
* Communication reports
* Audit reports
* Report exports
* Scheduled reports
* KPI calculations

---

# 2. Security Requirements

All Reports APIs require authentication.

Protected APIs must enforce:

```text
Permission
Branch Scope
Department Scope
Financial Data Scope
Corporate Data Scope
Report-Level Permission
Export Permission
Audit Logging
```

Report exports must always be audited.

---

# 3. Dashboard APIs

## 3.1 Get Executive Dashboard

```http
GET /api/v1/dashboards/executive
```

### Permission

```text
DASHBOARD_EXECUTIVE_VIEW
```

### Query Parameters

```text
branchId
dateFrom
dateTo
currency
```

### Response

```json
{
  "success": true,
  "data": {
    "totalStudents": 1000,
    "activeStudents": 850,
    "newAdmissions": 120,
    "revenue": 25000,
    "outstandingFees": 8000,
    "leadConversionRate": 32,
    "corporateRevenue": 10000,
    "trainerUtilization": 75,
    "completionRate": 88,
    "certificateIssuanceRate": 82,
    "currency": "OMR"
  }
}
```

---

## 3.2 Get Branch Dashboard

```http
GET /api/v1/dashboards/branch
```

### Permission

```text
DASHBOARD_BRANCH_VIEW
```

### Query Parameters

```text
branchId
dateFrom
dateTo
```

### Business Rules

```text
Branch manager can access only assigned branch dashboard
Management can access all branches
```

---

## 3.3 Get Counselor Dashboard

```http
GET /api/v1/dashboards/counselor
```

### Permission

```text
DASHBOARD_COUNSELOR_VIEW
```

### Query Parameters

```text
counselorId
branchId
dateFrom
dateTo
```

### Response

```json
{
  "success": true,
  "data": {
    "assignedLeads": 60,
    "pendingFollowUps": 12,
    "todayFollowUps": 8,
    "convertedLeads": 15,
    "lostLeads": 5,
    "conversionRate": 25
  }
}
```

---

## 3.4 Get Finance Dashboard

```http
GET /api/v1/dashboards/finance
```

### Permission

```text
DASHBOARD_FINANCE_VIEW
```

### Query Parameters

```text
branchId
dateFrom
dateTo
currency
```

### Response

```json
{
  "success": true,
  "data": {
    "todayCollection": 1200,
    "monthlyCollection": 25000,
    "outstandingAmount": 8000,
    "refundRequests": 5,
    "pendingRefunds": 3,
    "corporateReceivables": 10000,
    "currency": "OMR"
  }
}
```

---

## 3.5 Get Trainer Dashboard

```http
GET /api/v1/dashboards/trainer
```

### Permission

```text
DASHBOARD_TRAINER_VIEW
```

### Query Parameters

```text
trainerId
dateFrom
dateTo
```

### Business Rules

```text
Trainer can view only own dashboard unless broader permission exists
```

---

## 3.6 Get Corporate Dashboard

```http
GET /api/v1/dashboards/corporate
```

### Permission

```text
DASHBOARD_CORPORATE_VIEW
```

### Query Parameters

```text
customerId
dateFrom
dateTo
currency
```

---

# 4. Lead Report APIs

## 4.1 Lead Source Report

```http
GET /api/v1/reports/leads/source
```

### Permission

```text
REPORT_LEAD_SOURCE_VIEW
```

### Query Parameters

```text
branchId
courseId
leadSourceId
campaignId
dateFrom
dateTo
```

---

## 4.2 Lead Conversion Report

```http
GET /api/v1/reports/leads/conversion
```

### Permission

```text
REPORT_LEAD_CONVERSION_VIEW
```

### Query Parameters

```text
branchId
counselorId
courseId
campaignId
dateFrom
dateTo
```

### Response

```json
{
  "success": true,
  "data": {
    "totalLeads": 100,
    "wonLeads": 30,
    "lostLeads": 20,
    "conversionRate": 30,
    "rows": [
      {
        "counselorName": "Fatima",
        "assignedLeads": 40,
        "wonLeads": 15,
        "lostLeads": 5,
        "conversionRate": 37.5
      }
    ]
  }
}
```

---

## 4.3 Lead Funnel Report

```http
GET /api/v1/reports/leads/funnel
```

### Permission

```text
REPORT_LEAD_FUNNEL_VIEW
```

---

## 4.4 Campaign Performance Report

```http
GET /api/v1/reports/campaigns/performance
```

### Permission

```text
REPORT_CAMPAIGN_PERFORMANCE_VIEW
```

---

# 5. Student Report APIs

## 5.1 Student Strength Report

```http
GET /api/v1/reports/students/strength
```

### Permission

```text
REPORT_STUDENT_STRENGTH_VIEW
```

### Query Parameters

```text
branchId
courseId
batchId
status
dateFrom
dateTo
```

---

## 5.2 Active Students Report

```http
GET /api/v1/reports/students/active
```

### Permission

```text
REPORT_STUDENT_ACTIVE_VIEW
```

---

## 5.3 Student Status Report

```http
GET /api/v1/reports/students/status
```

### Permission

```text
REPORT_STUDENT_STATUS_VIEW
```

---

## 5.4 Student Enrollment Summary Report

```http
GET /api/v1/reports/students/enrollment-summary
```

### Permission

```text
REPORT_STUDENT_ENROLLMENT_VIEW
```

---

# 6. Attendance Report APIs

## 6.1 Daily Attendance Report

```http
GET /api/v1/reports/attendance/daily
```

### Permission

```text
REPORT_ATTENDANCE_DAILY_VIEW
```

### Query Parameters

```text
branchId
courseId
batchId
trainerId
date
```

---

## 6.2 Batch Attendance Report

```http
GET /api/v1/reports/attendance/batch
```

### Permission

```text
REPORT_ATTENDANCE_BATCH_VIEW
```

---

## 6.3 Student Attendance Report

```http
GET /api/v1/reports/attendance/student
```

### Permission

```text
REPORT_ATTENDANCE_STUDENT_VIEW
```

---

## 6.4 Low Attendance Report

```http
GET /api/v1/reports/attendance/low
```

### Permission

```text
REPORT_ATTENDANCE_LOW_VIEW
```

### Query Parameters

```text
branchId
courseId
batchId
thresholdPercentage
```

---

# 7. Finance Report APIs

## 7.1 Fee Collection Report

```http
GET /api/v1/reports/finance/fee-collection
```

### Permission

```text
REPORT_FINANCE_COLLECTION_VIEW
```

### Query Parameters

```text
branchId
courseId
paymentMode
dateFrom
dateTo
currency
```

---

## 7.2 Outstanding Fees Report

```http
GET /api/v1/reports/finance/outstanding-fees
```

### Permission

```text
REPORT_FINANCE_OUTSTANDING_VIEW
```

---

## 7.3 Discount Report

```http
GET /api/v1/reports/finance/discounts
```

### Permission

```text
REPORT_FINANCE_DISCOUNT_VIEW
```

---

## 7.4 Refund Report

```http
GET /api/v1/reports/finance/refunds
```

### Permission

```text
REPORT_FINANCE_REFUND_VIEW
```

---

## 7.5 Revenue by Course Report

```http
GET /api/v1/reports/finance/revenue-by-course
```

### Permission

```text
REPORT_FINANCE_REVENUE_VIEW
```

---

## 7.6 Revenue by Branch Report

```http
GET /api/v1/reports/finance/revenue-by-branch
```

### Permission

```text
REPORT_FINANCE_REVENUE_VIEW
```

---

# 8. Trainer Report APIs

## 8.1 Trainer Utilization Report

```http
GET /api/v1/reports/trainers/utilization
```

### Permission

```text
REPORT_TRAINER_UTILIZATION_VIEW
```

### Query Parameters

```text
branchId
trainerId
dateFrom
dateTo
```

---

## 8.2 Trainer Assignment Report

```http
GET /api/v1/reports/trainers/assignments
```

### Permission

```text
REPORT_TRAINER_ASSIGNMENT_VIEW
```

---

## 8.3 Trainer Compliance Report

```http
GET /api/v1/reports/trainers/compliance
```

### Permission

```text
REPORT_TRAINER_COMPLIANCE_VIEW
```

---

# 9. Corporate Report APIs

## 9.1 Corporate Revenue Report

```http
GET /api/v1/reports/corporate/revenue
```

### Permission

```text
REPORT_CORPORATE_REVENUE_VIEW
```

### Query Parameters

```text
customerId
contractId
programId
dateFrom
dateTo
currency
```

---

## 9.2 Contract Report

```http
GET /api/v1/reports/corporate/contracts
```

### Permission

```text
REPORT_CORPORATE_CONTRACT_VIEW
```

---

## 9.3 Program Report

```http
GET /api/v1/reports/corporate/programs
```

### Permission

```text
REPORT_CORPORATE_PROGRAM_VIEW
```

---

## 9.4 Participant Report

```http
GET /api/v1/reports/corporate/participants
```

### Permission

```text
REPORT_CORPORATE_PARTICIPANT_VIEW
```

---

## 9.5 Contract Renewal Report

```http
GET /api/v1/reports/corporate/renewals
```

### Permission

```text
REPORT_CORPORATE_RENEWAL_VIEW
```

---

# 10. Completion Report APIs

## 10.1 Completion Report

```http
GET /api/v1/reports/completion
```

### Permission

```text
REPORT_COMPLETION_VIEW
```

### Query Parameters

```text
branchId
courseId
batchId
completionStatus
dateFrom
dateTo
```

---

## 10.2 Completion Pending Report

```http
GET /api/v1/reports/completion/pending
```

### Permission

```text
REPORT_COMPLETION_PENDING_VIEW
```

---

## 10.3 Exam Result Report

```http
GET /api/v1/reports/exams/results
```

### Permission

```text
REPORT_EXAM_RESULT_VIEW
```

---

## 10.4 Pass Fail Report

```http
GET /api/v1/reports/exams/pass-fail
```

### Permission

```text
REPORT_EXAM_PASS_FAIL_VIEW
```

---

# 11. Certificate Report APIs

## 11.1 Certificates Issued Report

```http
GET /api/v1/reports/certificates/issued
```

### Permission

```text
REPORT_CERTIFICATE_ISSUED_VIEW
```

---

## 11.2 Certificates Pending Report

```http
GET /api/v1/reports/certificates/pending
```

### Permission

```text
REPORT_CERTIFICATE_PENDING_VIEW
```

---

## 11.3 Certificates Reissued Report

```http
GET /api/v1/reports/certificates/reissued
```

### Permission

```text
REPORT_CERTIFICATE_REISSUED_VIEW
```

---

## 11.4 Certificates Revoked Report

```http
GET /api/v1/reports/certificates/revoked
```

### Permission

```text
REPORT_CERTIFICATE_REVOKED_VIEW
```

---

# 12. Communication Report APIs

## 12.1 SMS Usage Report

```http
GET /api/v1/reports/communication/sms-usage
```

### Permission

```text
REPORT_COMMUNICATION_USAGE_VIEW
```

---

## 12.2 WhatsApp Usage Report

```http
GET /api/v1/reports/communication/whatsapp-usage
```

### Permission

```text
REPORT_COMMUNICATION_USAGE_VIEW
```

---

## 12.3 Email Usage Report

```http
GET /api/v1/reports/communication/email-usage
```

### Permission

```text
REPORT_COMMUNICATION_USAGE_VIEW
```

---

## 12.4 Campaign Delivery Report

```http
GET /api/v1/reports/communication/campaign-delivery
```

### Permission

```text
REPORT_COMMUNICATION_CAMPAIGN_VIEW
```

---

# 13. Audit Report APIs

## 13.1 User Activity Report

```http
GET /api/v1/reports/audit/user-activity
```

### Permission

```text
REPORT_AUDIT_USER_ACTIVITY_VIEW
```

---

## 13.2 Data Change Report

```http
GET /api/v1/reports/audit/data-change
```

### Permission

```text
REPORT_AUDIT_DATA_CHANGE_VIEW
```

---

## 13.3 Approval History Report

```http
GET /api/v1/reports/audit/approval-history
```

### Permission

```text
REPORT_AUDIT_APPROVAL_VIEW
```

---

# 14. KPI APIs

## 14.1 Get KPI Summary

```http
GET /api/v1/kpis/summary
```

### Permission

```text
KPI_VIEW
```

### Query Parameters

```text
branchId
dateFrom
dateTo
kpiGroup
```

### Supported KPI Groups

```text
Leads
Students
Attendance
Finance
Corporate
Trainer
Completion
Certificates
```

---

## 14.2 Get KPI Trend

```http
GET /api/v1/kpis/trend
```

### Permission

```text
KPI_VIEW
```

### Query Parameters

```text
kpiCode
branchId
dateFrom
dateTo
interval
```

### Supported Intervals

```text
Daily
Weekly
Monthly
Quarterly
Yearly
```

---

# 15. Export APIs

## 15.1 Export Report

```http
POST /api/v1/reports/export
```

### Permission

```text
REPORT_EXPORT
```

### Request

```json
{
  "reportCode": "FEE_COLLECTION",
  "format": "Excel",
  "filters": {
    "branchId": "br_001",
    "dateFrom": "2026-06-01",
    "dateTo": "2026-06-30",
    "currency": "OMR"
  }
}
```

### Supported Formats

```text
PDF
Excel
CSV
```

### Success Response

```json
{
  "success": true,
  "message": "Report export started",
  "data": {
    "exportJobId": "exp_001",
    "status": "Queued"
  }
}
```

### Business Rules

```text
Report export must enforce report permission
Export must enforce data scope
Large exports should run asynchronously
Export activity must be audited
```

---

## 15.2 Get Export Job Status

```http
GET /api/v1/reports/export-jobs/{exportJobId}
```

### Permission

```text
REPORT_EXPORT
```

---

## 15.3 Download Export File

```http
GET /api/v1/reports/export-jobs/{exportJobId}/download
```

### Permission

```text
REPORT_EXPORT
```

### Business Rules

```text
Download must be audited
Signed URL should expire
```

---

# 16. Scheduled Report APIs

## 16.1 Get Scheduled Reports

```http
GET /api/v1/reports/schedules
```

### Permission

```text
SCHEDULED_REPORT_VIEW
```

---

## 16.2 Create Scheduled Report

```http
POST /api/v1/reports/schedules
```

### Permission

```text
SCHEDULED_REPORT_CREATE
```

### Request

```json
{
  "reportCode": "OUTSTANDING_FEES",
  "frequency": "Weekly",
  "format": "Excel",
  "deliveryChannel": "Email",
  "recipientUserIds": ["usr_001"],
  "filters": {
    "branchId": "br_001",
    "currency": "OMR"
  },
  "enabled": true
}
```

### Supported Frequencies

```text
Daily
Weekly
Monthly
Quarterly
```

### Business Rules

```text
Scheduled reports must enforce permission at schedule creation and execution time
Report history must be retained
```

---

## 16.3 Update Scheduled Report

```http
PATCH /api/v1/reports/schedules/{scheduleId}
```

### Permission

```text
SCHEDULED_REPORT_EDIT
```

---

## 16.4 Disable Scheduled Report

```http
POST /api/v1/reports/schedules/{scheduleId}/disable
```

### Permission

```text
SCHEDULED_REPORT_EDIT
```

---

# 17. Business Error Examples

## Report Permission Denied

```json
{
  "success": false,
  "error": {
    "code": "REPORT_PERMISSION_DENIED",
    "message": "You do not have permission to access this report"
  }
}
```

## Export Too Large

```json
{
  "success": false,
  "error": {
    "code": "EXPORT_TOO_LARGE_SYNC",
    "message": "Report is too large for synchronous export. Use async export job."
  }
}
```

## Invalid Report Filter

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REPORT_FILTER",
    "message": "Date range is required for this report"
  }
}
```

---

# 18. Events Published

```text
DashboardViewed
ReportViewed
ReportExportRequested
ReportExportCompleted
ReportExportFailed
ReportDownloaded
ScheduledReportCreated
ScheduledReportExecuted
ScheduledReportFailed
KpiThresholdBreached
```

---

# 19. Audit Requirements

Audit must capture:

```text
Dashboard access
Report access
Report filters used
Export request
Export download
Scheduled report creation/update/disable
Sensitive financial report access
Audit report access
```

---

# 20. Integration Points

Consumes:

```text
CRM
Students
Admissions & Enrollment
Course & Batch
Scheduling
Attendance
Finance
Trainer Management
Corporate Training
Completion
Certificates
Communication
Audit
```

Provides data to:

```text
Management Dashboards
Operations Dashboards
Scheduled Reports
Future AI Analytics
```

---
