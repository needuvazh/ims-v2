# Part 8 - Reports, Dashboards, KPIs, Analytics

## Module 14 - Corporate Training Management

## Document Control

| Field | Value |
|---|---|
| Module | Module 14 - Corporate Training Management |
| Module Code | CTM |
| Owning Bounded Context | Corporate Training Management |
| Architecture Style | Next.js monorepo modular monolith |
| Reporting Strategy | Read-only projections, SQL views/materialized views where justified, and permission-scoped reporting queries |
| Source Baselines | DDD Context Map v3.0; ER Model v3.0; ASTI ERP Workflow; Module 14 Overview; Parts 1-7 |
| Status | Draft for review |

---

# 1. Purpose

This document defines the reporting, dashboard, KPI, and analytics requirements for Module 14 - Corporate Training Management.

The objectives are to provide:

1. operational visibility into Corporate Accounts, Contacts, Contracts, Participants, and CorporateEnrollment coordination;
2. management visibility into account activity, training status, participant throughput, contract utilization, billing readiness, and cross-context delivery outcomes;
3. branch-scoped and consolidated reporting with explicit permission controls;
4. high-performance reporting through read-only read models;
5. traceable cross-context analytics without duplicating or taking ownership of transactional data belonging to other bounded contexts.

The governing rule is:

> Reporting models are read-only projections. They do not replace, supersede, or become authoritative over Corporate Training, Admission & Enrollment, Training Delivery, Scheduling, Finance, Attendance, Completion, Certificate, Document Management, IAM, or Audit transactional tables.

---

# 2. Reporting Ownership Principles

## 2.1 CTM-Owned Measures

The following measures can be calculated directly from CTM-owned data:

- active Corporate Accounts;
- new Corporate Accounts created;
- active Corporate Contacts;
- active Corporate Contracts;
- contracts expiring soon;
- active Corporate Participants;
- participants added during a period;
- CorporateEnrollment link count;
- billing coordination status distribution;
- participant import success/failure rates;
- reconciliation mismatch counts;
- reconciliation repair counts;
- account/contact/contract/participant lifecycle distributions.

## 2.2 Cross-Context Measures

The following measures require read-only data from owning contexts:

| Measure | Authoritative Owner |
|---|---|
| Enrollment status | Admission & Enrollment |
| Course | Course Catalog |
| Batch and batch capacity | Training Delivery |
| Session schedule | Scheduling / Training Delivery |
| Attendance percentage | Attendance |
| Completion status | Exam, Result & Completion |
| Certificate issue status | Certificate |
| Invoice status | Finance & Receivables |
| Outstanding amount | Finance & Receivables |
| Receivables aging | Finance & Receivables |
| Corporate credit decision | Finance & Receivables |
| Document verification status | Document Management |
| User/branch access | Identity & Access / Organization |
| Audit history | Audit & Compliance |

CTM may expose a unified reporting projection but must not copy business ownership into CTM transactional tables.

---

# 3. Reporting Dimensions

All report queries should support relevant combinations of the following dimensions:

- period;
- branch;
- parent branch;
- Corporate Account;
- account status;
- industry;
- Account Manager;
- contract;
- contract status;
- billing model;
- participant status;
- course;
- course category;
- batch;
- trainer;
- enrollment status;
- billing coordination status;
- invoice status;
- aging bucket;
- completion status;
- certificate status;
- document compliance status.

Not all dimensions apply to every report.

---

# 4. KPI Catalog

## 4.1 KPI Summary

| KPI ID | KPI Name | Formula / Definition | Owner Type | Frequency |
|---|---|---|---|---|
| KPI-CTM-001 | Active Corporate Accounts | Count of non-deleted CorporateAccounts in active state | CTM | Near real-time |
| KPI-CTM-002 | New Corporate Accounts | Accounts created in selected period | CTM | Daily |
| KPI-CTM-003 | Active Corporate Contracts | Count of active, date-valid contracts | CTM | Near real-time |
| KPI-CTM-004 | Contracts Expiring Soon | Active contracts ending within configured threshold | CTM | Daily |
| KPI-CTM-005 | Active Corporate Participants | Active participant links in selected scope | CTM | Near real-time |
| KPI-CTM-006 | New Participants Added | Participants created in selected period | CTM | Daily |
| KPI-CTM-007 | Corporate Enrollment Count | CorporateEnrollment links created in selected period | CTM + Enrollment ref | Daily |
| KPI-CTM-008 | Enrollment Confirmation Rate | Confirmed corporate enrollments / corporate enrollment requests × 100 | Cross-context | Daily |
| KPI-CTM-009 | Bulk Enrollment Success Rate | Successfully created enrollments / requested bulk rows × 100 | CTM orchestration | Per job/Daily |
| KPI-CTM-010 | Participant Import Success Rate | Committed valid participant rows / submitted rows × 100 | CTM | Per job/Daily |
| KPI-CTM-011 | Participant Duplicate Rate | Duplicate or existing participant rows / submitted rows × 100 | CTM | Per job |
| KPI-CTM-012 | Training Start Rate | Corporate enrollments that entered Active training / confirmed corporate enrollments × 100 | Cross-context | Daily |
| KPI-CTM-013 | Training Completion Rate | Completed corporate enrollments / eligible active corporate enrollments × 100 | Cross-context | Daily |
| KPI-CTM-014 | Certificate Issuance Rate | Certificates issued / approved completed corporate enrollments × 100 | Cross-context | Daily |
| KPI-CTM-015 | Attendance Compliance Rate | Corporate enrollments meeting attendance threshold / evaluated corporate enrollments × 100 | Cross-context | Daily |
| KPI-CTM-016 | Billing Readiness Rate | READY_FOR_BILLING or later / billable corporate enrollments × 100 | CTM | Daily |
| KPI-CTM-017 | Billing Hold Rate | ON_HOLD / active billable corporate enrollments × 100 | CTM | Daily |
| KPI-CTM-018 | Corporate Revenue | Finance-authoritative invoiced/recognized revenue for corporate scope | Finance projection | Daily |
| KPI-CTM-019 | Outstanding Receivables | Sum of outstanding corporate invoice balances | Finance projection | Daily/Near real-time |
| KPI-CTM-020 | Overdue Receivables Ratio | Overdue outstanding / total outstanding × 100 | Finance projection | Daily |
| KPI-CTM-021 | Credit Block Incidence | Credit-blocked enrollment attempts / credit validations × 100 | Finance decision projection | Daily |
| KPI-CTM-022 | Contract Utilization | Value or participant usage consumed against contract terms, only when approved model supports calculation | Cross-context / Conditional | Daily/Monthly |
| KPI-CTM-023 | Account Training Activity Rate | Accounts with active/confirmed training in period / active accounts × 100 | CTM + Enrollment | Weekly/Monthly |
| KPI-CTM-024 | Average Participants per Corporate Enrollment Group | Participants enrolled / corporate enrollment batches or approved grouping denominator | CTM + Enrollment | Monthly |
| KPI-CTM-025 | Reconciliation Mismatch Rate | Detected mismatches / CTM enrollment links checked × 100 | CTM | Daily |
| KPI-CTM-026 | Reconciliation Mean Resolution Time | Average repairedAt - detectedAt | CTM | Daily |
| KPI-CTM-027 | Document Compliance Rate | Approved non-expired required documents / required document checks × 100 | Document projection | Daily |
| KPI-CTM-028 | Account Manager Portfolio Activity | Active accounts with recent training/contract activity by assigned manager | CTM / assignment model dependent | Weekly |
| KPI-CTM-029 | Branch Corporate Training Volume | Corporate enrollments or participants by branch | CTM + Enrollment | Daily |
| KPI-CTM-030 | Course Demand from Corporate Accounts | Corporate enrollment count by course | CTM + Course/Enrollment | Weekly/Monthly |

---

# 5. KPI Definitions and Calculation Rules

## 5.1 Active Corporate Accounts

**KPI ID:** KPI-CTM-001

```text
COUNT(CorporateAccount)
WHERE isDeleted = false
AND status = ACTIVE
```

Dimensions:

- branch, when approved account-branch scope model exists;
- industry;
- account manager, when assignment model exists;
- period created.

Permission:

- branch dashboard permission for branch scope;
- account manager dashboard permission for assigned portfolio;
- executive permission plus consolidated scope for cross-branch total.

---

## 5.2 Contracts Expiring Soon

**KPI ID:** KPI-CTM-004

```text
COUNT(CorporateContract)
WHERE status = ACTIVE
AND endDate BETWEEN businessDate AND businessDate + configuredExpiryThreshold
AND isDeleted = false
```

Rules:

- threshold must come from configuration;
- use Oman business date/time policy;
- do not count already expired, terminated, or deleted contracts.

---

## 5.3 Corporate Enrollment Confirmation Rate

**KPI ID:** KPI-CTM-008

```text
Confirmed Corporate Enrollments
-------------------------------- × 100
Corporate Enrollment Requests
```

Rules:

- numerator status comes from Admission & Enrollment;
- denominator must be based on durable orchestration/request result records or approved job/result read model;
- failed retries with same idempotency key must not inflate denominator.

---

## 5.4 Training Completion Rate

**KPI ID:** KPI-CTM-013

```text
Corporate Enrollments with Completion Approved
----------------------------------------------- × 100
Corporate Enrollments eligible for evaluation in period
```

Rules:

- completion truth comes from Exam, Result & Completion context;
- CTM must not infer completion from Trainer submission alone;
- denominator definition must exclude future-start or cancelled enrollments.

---

## 5.5 Billing Readiness Rate

**KPI ID:** KPI-CTM-016

```text
COUNT(status IN READY_FOR_BILLING, BILLING_REQUESTED, INVOICED, PARTIALLY_SETTLED, SETTLED)
------------------------------------------------------------- × 100
COUNT(billable corporate enrollment links)
```

Rules:

- CTM billing status is coordination state only;
- `INVOICED`, `PARTIALLY_SETTLED`, and `SETTLED` must be validated against Finance confirmation;
- Finance invoice state remains authoritative.

---

## 5.6 Corporate Revenue

**KPI ID:** KPI-CTM-018

Revenue values must be sourced from Finance-authoritative reporting projections.

CTM must not calculate corporate revenue by:

- summing contract values;
- summing course price previews;
- summing Enrollment.finalAmount without Finance reconciliation;
- treating quotation values as realized revenue.

Recommended display variants:

- invoiced revenue;
- paid amount;
- outstanding amount;
- revenue by branch;
- revenue by account;
- revenue by course.

---

# 6. Dashboard Catalog

## 6.1 CTM Operations Dashboard

**Primary users:** CTM Administrator, Training Coordinator, Branch Manager

**Permission:** `corporate-training.dashboard.branch.read`

**Scope:** `B`

### Widgets

| Widget ID | Widget | Visualization | Source |
|---|---|---|---|
| W-CTM-001 | Active Corporate Accounts | Metric card | CTM |
| W-CTM-002 | Active Contracts | Metric card | CTM |
| W-CTM-003 | Contracts Expiring Soon | Alert metric + table | CTM |
| W-CTM-004 | Active Participants | Metric card | CTM |
| W-CTM-005 | Corporate Enrollments by Status | Donut/bar | Enrollment projection |
| W-CTM-006 | Training Starting This Week | Table | Scheduling/Batch projection |
| W-CTM-007 | Training in Progress | Metric + table | Enrollment/Training projection |
| W-CTM-008 | Training Completion Rate | Trend chart | Completion projection |
| W-CTM-009 | Billing Readiness Distribution | Donut | CTM |
| W-CTM-010 | Enrollment Failures Requiring Action | Exception table | CTM orchestration result |
| W-CTM-011 | Reconciliation Mismatches | Alert metric | CTM |
| W-CTM-012 | Pending Document Compliance Issues | Metric/table | Document projection |

### Default Filters

- date range;
- branch;
- Corporate Account;
- course;
- batch;
- account status;
- contract status.

---

## 6.2 Account Manager Portfolio Dashboard

**Primary user:** Corporate Account Manager

**Permission:** `corporate-training.dashboard.account-manager.read`

**Scope:** `A`

### Widgets

| Widget ID | Widget | Visualization |
|---|---|---|
| W-CTM-020 | Assigned Active Accounts | Metric |
| W-CTM-021 | Contracts Expiring Soon | Alert list |
| W-CTM-022 | Upcoming Corporate Training | Timeline/table |
| W-CTM-023 | Participants Enrolled This Month | Metric + trend |
| W-CTM-024 | Training Status by Account | Stacked bar |
| W-CTM-025 | Billing Holds | Exception table |
| W-CTM-026 | Outstanding Receivables Summary | Finance projection metric |
| W-CTM-027 | Account Activity Feed | Chronological table/read projection |

All account rows must be restricted to durable assigned-account scope.

---

## 6.3 Branch Manager Corporate Training Dashboard

**Permission:** `corporate-training.dashboard.branch.read`

**Scope:** `B`

### Widgets

- Corporate Accounts by status;
- Active Contracts;
- New Participants;
- Corporate Enrollments by course;
- Training in progress;
- Completion rate;
- Certificate pending/issued;
- Corporate revenue;
- Outstanding receivables;
- document compliance;
- enrollment failure reasons;
- reconciliation exceptions.

---

## 6.4 Executive Corporate Training Dashboard

**Primary users:** CEO, MD, Chairman, approved executives

**Permissions:**

```text
corporate-training.dashboard.executive.read
+
corporate-training.report.consolidated.read
+
canViewConsolidated = true
```

**Scope:** `C`

### Widgets

| Widget | Description |
|---|---|
| Corporate Accounts Trend | Active/new account trend by month |
| Corporate Enrollment Trend | Monthly corporate enrollment trend |
| Branch Training Volume | Corporate participant/enrollment volume by branch |
| Corporate Revenue Trend | Finance-authoritative revenue trend |
| Outstanding Receivables | Aging summary by branch/account |
| Top Corporate Accounts | By revenue, participant count, or training activity |
| Top Corporate Courses | By enrollment volume |
| Contract Expiry Risk | Contracts expiring in 30/60/90 days |
| Training Completion Rate | Completion rate by branch/account/course |
| Certificate Issuance Rate | Issued versus approved completion |
| Attendance Compliance | Threshold compliance by branch/course |
| Corporate Training Funnel | Participant registered → enrolled → active → completed → certified |
| Credit Block Incidence | Finance credit-validation outcome trend |
| Document Compliance | Compliance status by account |

The executive dashboard is read-only and must expose no mutation commands.

---

# 7. Dashboard Widget Permission Matrix

| Widget | Branch | Account Manager | Executive Consolidated | Additional Permission |
|---|---:|---:|---:|---|
| Active Accounts | Yes | Assigned only | Yes | Account report/read |
| Active Contracts | Yes | Assigned only | Yes | Contract report/read |
| Contract Expiry | Yes | Assigned only | Yes | Contract report/read |
| Participant Count | Yes | Assigned only | Optional | Participant report/read |
| Enrollment Status | Yes | Assigned only | Yes | Enrollment report/read |
| Training Status | Yes | Assigned only | Yes | Training-status report/read |
| Revenue | Conditional | Conditional | Yes | Finance source permission |
| Receivables | Conditional | Conditional | Yes | Finance source permission |
| Completion Rate | Yes | Assigned only | Yes | Completion projection permission |
| Certificate Status | Yes | Assigned only | Yes | Certificate projection permission |
| Document Compliance | Yes | Assigned only | Optional | Document projection permission |
| Reconciliation Exceptions | Admin/Manager only | No | No | Reconciliation read |
| Import Failures | Admin/Coordinator | Assigned account only if applicable | No | Import read permission |

---

# 8. Operational Report Inventory

## RPT-CTM-001 - Corporate Account Summary

**Purpose:** Operational account master summary.

**Permission:** `corporate-training.report.account-summary.read`

**Filters:**

- branch;
- account status;
- industry;
- account manager;
- created date range;
- billing cycle.

**Columns:**

- account code;
- account name;
- organization legal name;
- industry;
- primary contact;
- billing cycle;
- account status;
- active contract count;
- active participant count;
- active enrollment count;
- last activity date;
- created date.

**Sorting:**

- account name;
- account code;
- created date;
- active participant count;
- active enrollment count;
- last activity date.

**Exports:**

- CSV;
- XLSX;
- PDF summary.

---

## RPT-CTM-002 - Corporate Contact Register

**Permission:** `corporate-training.contact.read`

**Filters:**

- account;
- branch scope;
- primary contact;
- portal access enabled;
- active/inactive status;
- designation;
- department.

**Columns:**

- account code;
- account name;
- contact name;
- designation;
- department;
- email;
- phone;
- primary flag;
- portal access flag;
- active status;
- created date.

**Sensitive behavior:**

- email/phone may be masked based on field-level policy;
- external users cannot access this internal report.

**Exports:** CSV, XLSX.

---

## RPT-CTM-003 - Contract Status and Expiry Report

**Permission:** `corporate-training.report.contract-status.read`

**Filters:**

- branch;
- account;
- contract status;
- billing model;
- start date range;
- end date range;
- expiry window: 30/60/90/custom days.

**Columns:**

- contract number;
- account code;
- account name;
- start date;
- end date;
- days to expiry;
- billing model;
- contract value, only with commercial read permission;
- currency;
- payment terms summary, only with commercial permission;
- status.

**Sorting:**

- end date ascending default;
- contract value;
- account name;
- start date.

**Exports:** CSV, XLSX, PDF.

---

## RPT-CTM-004 - Corporate Participant Register

**Permission:** `corporate-training.report.participant-register.read`

**Filters:**

- branch;
- account;
- participant status;
- department;
- designation;
- linked StudentProfile status;
- created date range.

**Columns:**

- account code;
- account name;
- participant name;
- masked Civil ID/reference;
- employee code;
- department;
- designation;
- participant status;
- StudentProfile linked yes/no;
- enrollment count;
- latest enrollment status;
- created date.

**Sorting:**

- participant name;
- account name;
- department;
- created date;
- enrollment count.

**Exports:** CSV, XLSX, PDF summary.

---

## RPT-CTM-005 - Corporate Enrollment Status Report

**Permission:** `corporate-training.report.enrollment-status.read`

**Filters:**

- branch;
- account;
- contract;
- course;
- batch;
- enrollment status;
- participant status;
- enrollment date range;
- billing coordination status.

**Columns:**

- CorporateEnrollment ID/reference;
- Enrollment number;
- participant name;
- account name;
- contract number;
- course;
- batch;
- branch;
- enrollment status;
- training status;
- billing coordination status;
- completion status;
- certificate status;
- created/confirmed date.

**Sorting:**

- enrollment date;
- account;
- participant;
- course;
- batch;
- status.

**Exports:** CSV, XLSX, PDF.

---

## RPT-CTM-006 - Training Delivery Status Report

**Permission:** `corporate-training.report.training-status.read`

**Filters:**

- date range;
- branch;
- account;
- course;
- batch;
- trainer;
- delivery status.

**Columns:**

- account;
- course;
- batch;
- trainer(s);
- classroom/venue;
- start date;
- end date;
- enrolled participant count;
- training status;
- attendance completion indicator;
- assessment completion indicator;
- completion approval status.

**Exports:** CSV, XLSX, PDF.

---

## RPT-CTM-007 - Participant-to-Batch Allocation Report

**Permission:** `corporate-training.report.batch-allocation.read`

**Filters:**

- branch;
- account;
- course;
- batch;
- batch status;
- training date range.

**Columns:**

- account;
- participant;
- employee code;
- course;
- batch code;
- branch;
- batch dates;
- trainer;
- classroom;
- enrollment status;
- seat allocation status.

**Sorting:**

- batch start date;
- account;
- participant;
- course.

**Exports:** CSV, XLSX, PDF roster.

---

## RPT-CTM-008 - Participant Import Audit Report

**Permission:** participant import read/audit permission

**Filters:**

- account;
- initiator;
- file name;
- upload date range;
- result status.

**Columns:**

- import reference;
- account;
- file name;
- total rows;
- valid rows;
- committed rows;
- duplicate rows;
- failed rows;
- initiated by;
- validated at;
- committed at;
- final status.

**Sorting:** created date descending default.

**Exports:** CSV, XLSX.

Row-level PII should not be included in broad audit exports unless specifically authorized.

---

## RPT-CTM-009 - Billing Readiness Report

**Permission:** CTM enrollment read plus billing-status read

**Filters:**

- branch;
- account;
- contract;
- course;
- batch;
- billing status;
- enrollment status;
- date range.

**Columns:**

- account;
- enrollment number;
- participant;
- contract;
- course;
- batch;
- completion status;
- CTM billing coordination status;
- Finance invoice reference, if available;
- invoice status;
- outstanding amount, with Finance permission;
- hold reason.

**Exports:** CSV, XLSX, PDF.

---

## RPT-CTM-010 - Corporate Revenue Report

**Permission:** `corporate-training.report.corporate-revenue.read`

**Data Owner:** Finance projection.

**Filters:**

- date range;
- branch;
- account;
- course;
- invoice status;
- currency;
- billing model.

**Columns:**

- account;
- branch;
- invoice number;
- invoice date;
- course/enrollment reference;
- invoiced amount;
- tax amount;
- paid amount;
- outstanding amount;
- status.

**Sorting:**

- invoice date;
- account;
- invoiced amount;
- outstanding amount.

**Exports:** CSV, XLSX, PDF.

CTM must not write to Finance records from this report.

---

## RPT-CTM-011 - Corporate Receivables Aging Report

**Permission:** `corporate-training.report.receivables-summary.read`

**Filters:**

- as-of date;
- branch;
- account;
- aging bucket;
- invoice status;
- minimum outstanding amount.

**Columns:**

- account;
- invoice number;
- invoice date;
- due date;
- original amount;
- paid amount;
- outstanding amount;
- aging days;
- aging bucket;
- collection status.

**Default sort:** aging days descending, outstanding amount descending.

**Exports:** CSV, XLSX, PDF.

---

## RPT-CTM-012 - Certificate Status Report

**Permission:** `corporate-training.report.certificate-status.read`

**Filters:**

- branch;
- account;
- course;
- batch;
- completion date range;
- certificate status;
- issued date range.

**Columns:**

- participant;
- account;
- enrollment number;
- course;
- batch;
- completion status;
- payment validation status projection;
- certificate status;
- certificate number;
- issued date.

**Exports:** CSV, XLSX, PDF.

---

## RPT-CTM-013 - Document Compliance Report

**Permission:** `corporate-training.report.document-compliance.read`

**Filters:**

- branch;
- account;
- participant;
- document type;
- verification status;
- expiry date range.

**Columns:**

- owner name;
- owner type;
- account;
- document type;
- issue date;
- expiry date;
- verification status;
- verified date;
- expiring-in-days.

**Exports:** CSV, XLSX, PDF.

Document URL/download authorization remains with Document Management.

---

## RPT-CTM-014 - Branch Corporate Training Performance Report

**Permission:** `corporate-training.report.branch-performance.read`

**Filters:**

- period;
- branch;
- course;
- account industry.

**Columns/Metrics:**

- branch;
- active accounts;
- active contracts;
- new participants;
- enrollments;
- active training;
- completed training;
- completion rate;
- certificates issued;
- corporate revenue;
- outstanding receivables;
- document compliance rate.

**Sorting:**

- revenue;
- enrollment volume;
- completion rate;
- outstanding amount.

**Exports:** CSV, XLSX, PDF.

---

## RPT-CTM-015 - Corporate Account 360 Report

**Permission:** `corporate-training.report.account-360.read`

**Filters:**

- account required;
- date range;
- contract;
- course;
- batch.

**Sections:**

1. account profile;
2. contacts;
3. contracts;
4. participant summary;
5. enrollment summary;
6. training status;
7. attendance summary;
8. completion summary;
9. certificate summary;
10. Finance summary;
11. document compliance;
12. recent CTM activity;
13. reconciliation issues.

**Exports:**

- PDF account dossier;
- XLSX multi-sheet export;
- CSV per section where applicable.

---

# 9. Export Rules

## 9.1 General Export Behavior

All exports must:

- enforce the same row-level scope as screen/API data;
- enforce field-level permission masking;
- record export request metadata;
- include report name and filter criteria;
- include generated timestamp in Oman business timezone;
- include branch/account scope context;
- avoid hidden columns the user is not authorized to read;
- use UTF-8 encoding;
- support English and Arabic display values where available;
- maintain right-to-left rendering for Arabic PDF exports.

## 9.2 Export Options

| Format | Use |
|---|---|
| CSV | Large flat datasets |
| XLSX | Operational analysis and multi-sheet reports |
| PDF | Management summaries, printable rosters, account dossiers |

## 9.3 Large Export Strategy

For large exports:

1. create export request record/read job state;
2. generate asynchronously using existing modular-monolith job infrastructure;
3. store generated file using approved storage infrastructure;
4. provide time-limited authorized download;
5. audit request and download where sensitive.

Reporting jobs do not create transactional business records.

---

# 10. Read Model Strategy

## 10.1 Principles

Read models may be implemented as:

- SQL views;
- materialized views;
- denormalized reporting tables populated by application jobs;
- query-layer projections;
- reporting database views where infrastructure supports them.

Every read model must be explicitly:

- read-only from application perspective;
- non-authoritative;
- rebuildable from source tables;
- traceable to source context and refresh timestamp;
- permission-filtered at query/service layer.

---

# 11. Recommended Read Models and Views

## 11.1 `vw_ctm_account_summary`

**Purpose:** Account list, dashboard counts, account report.

**Source tables:**

- CTM CorporateAccount;
- CorporateContact;
- CorporateContract;
- CorporateParticipant;
- CorporateEnrollment.

**Suggested columns:**

```text
corporateAccountId
accountCode
accountName
industry
status
billingCycle
primaryContactPersonId
activeContractCount
activeParticipantCount
corporateEnrollmentCount
latestActivityAt
createdAt
updatedAt
```

**Refresh:** Live SQL view or incrementally refreshed projection.

**Authority:** Read-only.

---

## 11.2 `vw_ctm_contract_expiry`

**Purpose:** Expiry alerts and contract report.

**Columns:**

```text
contractId
corporateAccountId
accountCode
accountName
contractNumber
startDate
endDate
daysUntilExpiry
billingModel
contractValue
currency
status
```

Sensitive commercial fields must be omitted unless authorized.

---

## 11.3 `vw_ctm_participant_enrollment_summary`

**Purpose:** Participant 360 and participant register.

**Sources:**

- CorporateParticipant;
- Person reference/projection;
- StudentProfile reference;
- CorporateEnrollment;
- Enrollment read projection.

**Columns:**

```text
corporateParticipantId
corporateAccountId
personId
displayName
employeeCode
department
designation
participantStatus
linkedStudentProfileId
enrollmentCount
activeEnrollmentCount
completedEnrollmentCount
latestEnrollmentId
latestEnrollmentStatus
```

---

## 11.4 `vw_ctm_enrollment_lifecycle`

**Purpose:** Unified read-only operational lifecycle report.

**Sources:**

- CTM CorporateEnrollment;
- Admission & Enrollment projection;
- Course Catalog projection;
- Training Delivery projection;
- Attendance summary projection;
- Completion projection;
- Certificate projection;
- Finance summary projection.

**Suggested columns:**

```text
corporateEnrollmentId
corporateAccountId
corporateParticipantId
enrollmentId
enrollmentNumber
branchId
courseId
courseName
batchId
batchCode
enrollmentStatus
trainingStatus
attendancePercentage
completionStatus
certificateStatus
ctmBillingStatus
invoiceStatus
outstandingAmount
currency
lastSourceRefreshAt
```

**Critical rule:** this view must not be writable and must not become a transaction integration table.

---

## 11.5 `mv_ctm_branch_daily_kpi`

**Purpose:** Fast dashboard metrics.

**Suggested grain:**

```text
businessDate + branchId
```

**Columns:**

```text
businessDate
branchId
activeAccountCount
activeContractCount
expiringContractCount
activeParticipantCount
newParticipantCount
corporateEnrollmentCount
activeTrainingCount
completedTrainingCount
completionRate
certificateIssuedCount
billingReadyCount
billingHoldCount
corporateRevenue
outstandingReceivables
documentComplianceRate
refreshedAt
```

**Type:** Materialized view or snapshot table.

**Refresh:** Daily plus optional intraday refresh.

**Authority:** Read-only analytics snapshot.

---

## 11.6 `mv_ctm_account_monthly_kpi`

**Grain:**

```text
month + corporateAccountId
```

**Metrics:**

- participants added;
- enrollments created;
- active training;
- completion count;
- certificate count;
- invoiced amount;
- paid amount;
- outstanding amount;
- document compliance percentage.

Use only after source permissions and reporting policy are defined.

---

## 11.7 `vw_ctm_reconciliation_exceptions`

**Purpose:** Operational exception dashboard.

**Columns:**

```text
exceptionId
corporateEnrollmentId
corporateAccountId
corporateParticipantId
currentEnrollmentId
expectedRelationshipState
exceptionType
detectedAt
severity
status
assignedToUserId
resolvedAt
```

**Authority:** CTM read-only exception projection based on reconciliation process.

---

# 12. Read Model Refresh and Consistency

## 12.1 Consistency Classes

| Read Model Type | Consistency |
|---|---|
| Direct SQL view | Transactionally current with source database state |
| Materialized view | Eventually consistent to last refresh |
| Snapshot table | Eventually consistent by scheduled job |
| Composite query projection | Current to each source query result |
| Export dataset | Point-in-time snapshot at generation |

## 12.2 Staleness Display

Any eventually consistent widget should expose:

```text
Data refreshed at: <timestamp>
```

Where cross-context projections have different refresh times, use:

```text
Finance data as of ...
Attendance data as of ...
Completion data as of ...
```

Do not represent stale data as real-time.

---

# 13. Query Performance Requirements

## 13.1 Interactive Dashboard Targets

- metric widgets: target p95 under 1 second;
- operational tables: target p95 under 2 seconds for first page;
- filtered account/report queries: target p95 under 3 seconds;
- consolidated executive dashboard: target p95 under 5 seconds when using pre-aggregated views.

## 13.2 Pagination

All detailed operational reports must use server-side pagination.

Recommended:

```text
default pageSize = 20
maximum interactive pageSize = 100
```

Large datasets must use export rather than unbounded browser queries.

## 13.3 Index Guidance

Reporting-supporting indexes should consider:

- CorporateAccount status;
- CorporateContract corporateAccountId/status/endDate;
- CorporateParticipant corporateAccountId/status/createdAt;
- CorporateEnrollment corporateAccount/participant/enrollment references;
- billingStatus;
- createdAt/date range;
- branchId in approved branch-assignment model;
- foreign reference IDs used in projection joins.

Indexes must support transactional workloads and not be added blindly for every report filter.

---

# 14. Analytics Drill-Down Rules

Dashboard drill-down must preserve scope.

Example:

```text
Executive Corporate Enrollment Count
    ↓
Branch Breakdown
    ↓
Account Breakdown
    ↓
Course Breakdown
    ↓
Enrollment List
```

At each level:

- report permission is rechecked;
- consolidated scope is preserved;
- unauthorized sensitive columns remain hidden;
- mutation buttons are not enabled merely because the row is visible in a report.

---

# 15. Bilingual Reporting Rules

## 15.1 English

- left-to-right layout;
- English localized display value;
- Gregorian dates using approved display format;
- OMR currency formatting.

## 15.2 Arabic

- right-to-left page layout;
- Arabic localized labels where available;
- table column reading order mirrored appropriately;
- numeric values remain readable and consistently formatted;
- PDF headers/footers support RTL;
- course/account localized names use approved localized source fields;
- exports must preserve Unicode.

Missing localized business data must follow defined fallback policy rather than machine-translating transactional data.

---

# 16. Security and Data Minimization

Reports and dashboards must:

- enforce branch/account/self/assignment scope;
- mask Civil ID and passport identifiers by default;
- avoid exporting full identity documents;
- restrict commercial terms;
- restrict Finance fields;
- audit sensitive exports;
- prohibit public URLs for report downloads;
- use authorized storage access;
- expire temporary export links;
- avoid exposing internal audit payloads to standard users.

---

# 17. Report-to-Permission Mapping

| Report | Permission | Scope |
|---|---|---|
| Account Summary | `corporate-training.report.account-summary.read` | B/A/C/G |
| Contract Status | `corporate-training.report.contract-status.read` | B/A/C/G |
| Participant Register | `corporate-training.report.participant-register.read` | B/A/C/G |
| Enrollment Status | `corporate-training.report.enrollment-status.read` | B/A/C/G |
| Training Status | `corporate-training.report.training-status.read` | B/A/C/G |
| Batch Allocation | `corporate-training.report.batch-allocation.read` | B/A/C/G |
| Document Compliance | `corporate-training.report.document-compliance.read` | B/A/C/G |
| Corporate Revenue | `corporate-training.report.corporate-revenue.read` | B/A/C/G |
| Receivables Summary | `corporate-training.report.receivables-summary.read` | B/A/C/G |
| Certificate Status | `corporate-training.report.certificate-status.read` | B/A/C/G |
| Branch Performance | `corporate-training.report.branch-performance.read` | B/C/G |
| Account 360 | `corporate-training.report.account-360.read` | B/A/C/G |

Consolidated use additionally requires:

```text
corporate-training.report.consolidated.read
AND
canViewConsolidated = true
```

---

# 18. DDD Fit and Ownership Check

| Reporting Area | Source Owner | CTM Reporting Behavior |
|---|---|---|
| Corporate Account metrics | CTM | Direct read/read model |
| Contact metrics | CTM | Direct read/read model |
| Contract metrics | CTM | Direct read/read model |
| Participant metrics | CTM | Direct read/read model |
| CorporateEnrollment linkage | CTM | Direct read/read model |
| Enrollment status | Admission & Enrollment | Read-only projection |
| Course names/categories | Course Catalog | Read-only reference |
| Batch/training status | Training Delivery | Read-only projection |
| Schedule/venue | Scheduling | Read-only projection |
| Attendance percentage | Attendance | Read-only projection |
| Completion rate | Exam & Completion | Read-only projection |
| Certificate metrics | Certificate | Read-only projection |
| Revenue/receivables | Finance | Read-only projection |
| Document compliance | Document Management | Read-only projection |
| Permissions/scope | IAM | Authorization input only |
| Audit history | Audit & Compliance | Read-only authorized query |

---

# 19. Explicit Read-Only Guarantee

All CTM reporting views, materialized views, metric snapshots, and dashboard projections must satisfy the following:

1. No application command may write to a reporting view as a substitute for an aggregate repository.
2. No reporting projection may be used to bypass owning-context validation.
3. No lifecycle transition may be executed by updating a KPI snapshot or report row.
4. If a report exposes an action link, the action must invoke the owning application service.
5. Materialized view refresh does not create business events.
6. MetricSnapshot or equivalent analytics tables are reporting artifacts only.
7. Deleting/rebuilding a read model must not destroy transactional truth.
8. Source transactional records remain authoritative.
9. Cross-context reporting joins do not transfer ownership.
10. A stale read model must never be used as the sole authority for a critical transactional decision such as:
   - credit approval;
   - batch capacity reservation;
   - completion approval;
   - certificate eligibility;
   - payment validation.

---

# 20. Known Reporting Gaps

| Gap ID | Gap | Impact |
|---|---|---|
| GAP-CTM-RPT-001 | Account-to-Branch relationship not approved | Branch-level account KPIs and isolation cannot be finalized | Architecture decision required |
| GAP-CTM-RPT-002 | Account Manager assignment model not defined | Portfolio dashboard scope cannot be made durable | Deferred |
| GAP-CTM-RPT-003 | Corporate Nomination aggregate missing | Nomination funnel/reporting cannot be defined authoritatively | Deferred |
| GAP-CTM-RPT-004 | Corporate Training Program/Project model incomplete | Project progress and closure reports cannot be defined | Deferred |
| GAP-CTM-RPT-005 | Equipment ownership missing | Equipment utilization reports unavailable | Deferred |
| GAP-CTM-RPT-006 | Travel & Accommodation model missing | Travel cost report unavailable | Deferred |
| GAP-CTM-RPT-007 | Costing/Profitability model not approved | Profit and margin KPI cannot be authoritative | Deferred |
| GAP-CTM-RPT-008 | GIVT domain ownership unresolved | GIVT-specific separate reporting cannot be implemented safely | Deferred |
| GAP-CTM-RPT-009 | Contract utilization denominator not fully modeled | KPI-CTM-022 remains conditional | Deferred |
| GAP-CTM-RPT-010 | Exact consolidated executive permission catalog remains open | Final dashboard role bundles require governance approval | Architecture decision required |

---

# 21. Recommended Implementation Sequence

## Phase 1 - Direct Operational Reports

Implement:

- Account Summary;
- Contract Status and Expiry;
- Participant Register;
- Corporate Enrollment Status;
- Training Delivery Status;
- Batch Allocation;
- Billing Readiness;
- Account 360.

## Phase 2 - Cross-Context Analytics

Add:

- Corporate Revenue;
- Receivables Aging;
- Attendance Compliance;
- Completion Rate;
- Certificate Status;
- Document Compliance;
- Branch Performance.

## Phase 3 - Aggregated Dashboards

Add:

- branch daily KPI materialized view;
- account monthly KPI projection;
- executive consolidated dashboard;
- trend analytics and drill-down.

This sequence reduces risk by first proving transactional ownership and scope before introducing wider consolidated projections.

---

# 22. Final Reporting Model Summary

The Corporate Training reporting architecture is:

```text
Authoritative Transaction Tables
    |
    +--> CTM-owned tables
    |
    +--> Enrollment owner tables
    |
    +--> Training Delivery / Scheduling
    |
    +--> Attendance
    |
    +--> Completion
    |
    +--> Certificate
    |
    +--> Finance
    |
    +--> Document Management
            |
            v
Read-only Reporting Views / Projections
            |
            v
Operational Reports
Branch Dashboards
Account Manager Dashboard
Executive Consolidated Dashboard
Exports
```

The reporting layer consumes authoritative data but never becomes the source of business truth.

The most important rule is:

> Every dashboard, KPI, report, export, view, materialized view, and snapshot defined for Module 14 is read-only. Transactional decisions and state changes must always be performed through the application service of the bounded context that owns the underlying aggregate.
