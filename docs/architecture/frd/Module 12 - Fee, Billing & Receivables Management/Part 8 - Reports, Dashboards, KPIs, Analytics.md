# Part 8 - Reports, Dashboards, KPIs, Analytics

## Module 12 – Fee, Billing & Receivables Management

## 1. Purpose

This document specifies the reporting, dashboards, KPI definitions, analytical dimensions, export behavior, and reporting read models for Module 12 – Fee, Billing & Receivables Management.

The reporting layer is read-oriented. It does not own or mutate the authoritative Finance aggregates. `Invoice`, `Payment`, `Receipt`, `Refund`, `Receivable`, `InstallmentPlan`, `Installment`, `PaymentAllocation`, and `CorporateCreditRule` remain authoritative transactional records in the Finance bounded context. Reporting projections may denormalize those records for performance, but every displayed amount must remain reconcilable to the authoritative Finance source records.

All financial dates and reporting period boundaries use Oman business timezone `Asia/Muscat` (GST, UTC+4). Currency amounts use the invoice currency and its configured precision. OMR values are rendered to three decimal places unless an approved currency configuration defines a different precision.

## 2. Reporting Principles

1. Server-side branch scoping is mandatory for every dashboard, report, export, and reporting read model query.
2. Consolidated reporting requires both the relevant Finance permission and IAM consolidated or branch-hierarchy entitlement.
3. Dashboard totals must reconcile to detail reports for identical filters and data-as-of timestamps.
4. Financial reports use posted or effective financial state, not UI-local calculations.
5. Draft invoices are excluded from revenue, billing, collection-efficiency, outstanding, and aging KPIs unless a report explicitly requests Draft status for operational control.
6. Cancelled invoices are excluded from billed value and outstanding value.
7. Executed refunds reduce net collection metrics; requested, under-review, approved-but-not-executed, and rejected refunds do not reduce cash collection metrics.
8. Receivable aging uses Oman business-date semantics and the compatibility aging mapping already defined in Part 7.
9. All exports are authorized independently from report viewing and are audit logged.
10. Read models must preserve source identifiers required for drill-through and reconciliation while preventing cross-branch leakage.
11. Student Portal reporting is strictly subject-owned and cannot expose comparative branch, corporate account, or other student information.
12. Trainer Portal has no Module 12 financial dashboard or transactional report access.
13. Reporting refresh timestamps must be shown on dashboards and exports.
14. Any stale projection beyond its stated service level must be visibly marked and must not be presented as real-time.

## 3. Analytical Dimensions

The following dimensions are supported where applicable and authorized:

| Dimension | Source | Reporting Use | Scope Rule |
|---|---|---|---|
| Business date | Invoice, Payment, Refund, Receivable dates | Period filtering and trend bucketing | GST date boundaries |
| Branch | Invoice.branchId and authorized branch hierarchy | Branch comparison and isolation | Server-enforced authorized branch set |
| Course | InvoiceLineItem.courseId | Revenue, billing, collection, and outstanding by course | Only lines in authorized invoice scope |
| Batch | Enrollment/line source reference | Cohort billing and collection analysis | Inherited from enrollment branch and invoice scope |
| Enrollment type | Enrollment | Regular, Corporate, WalkIn, Online segmentation | Read-only cross-context projection |
| Customer type | Student or Corporate | Segmentation of billing and collections | Source customer reference |
| Corporate account | Invoice.corporateAccountId | Corporate exposure and receivables | Managed-account plus branch intersection where applicable |
| Invoice type | Invoice.invoiceType | Student, Corporate, Advance, Milestone, Final, Refund analysis | Authorized invoice scope |
| Invoice status | Invoice.status | Operational pipeline and exposure analysis | Authorized invoice scope |
| Payment method | Payment.paymentMethod | Method mix and collection trends | Authorized payment scope |
| Refund status | Refund.status | Workflow and refund analysis | Authorized refund scope |
| Aging bucket | Receivable.agingBucket | Outstanding distribution | Current, 30 Days, 60 Days, 90 Days, terminal compatibility bucket |
| Currency | Invoice.currency | Currency-separated reporting | Never aggregate unlike currencies without configured conversion process |
| Counselor | Enrollment/Admission/Lead read projection | Optional collection follow-up accountability | Counselor sees only mediated enrollment-linked summary, not unrestricted Finance data |
| Corporate account manager | Corporate Training relationship | Managed portfolio reporting | Managed account intersection with branch scope |

## 4. KPI Catalog

### 4.1 KPI Calculation Conventions

For a reporting period `[periodStart, periodEnd]`, date inclusion is inclusive using `Asia/Muscat` business date. Unless stated otherwise:

- `IssuedInvoiceValue` includes invoices issued during the period with status other than Cancelled.
- `GrossCollections` includes successfully posted payments with `paymentDate` within the period.
- `ExecutedRefunds` includes refunds whose execution date falls within the period.
- `NetCollections = GrossCollections - ExecutedRefunds`.
- `OpenOutstanding` is an as-of measure from active receivable projections at `asOfDate`.
- Monetary sums are grouped by currency unless a separately approved exchange-rate read model exists. Module 12 does not define FX conversion.

### 4.2 Core Financial KPIs

| KPI ID | KPI Name | Exact Formula / Definition | Unit | Default Grain | Permission |
|---|---|---|---|---|---|
| KPI-FBR-001 | Gross Billed Value | Sum of `Invoice.totalAmount` for invoices issued in period excluding Cancelled invoices | Currency | Period, branch | `finance.report.branch` + dataset report permission |
| KPI-FBR-002 | Gross Collections | Sum of posted `Payment.amount` with paymentDate in period | Currency | Period, branch | `report.finance.payment-trends` |
| KPI-FBR-003 | Executed Refund Value | Sum of executed Refund.amount with execution date in period | Currency | Period, branch | `report.finance.refund-analysis` |
| KPI-FBR-004 | Net Collections | `GrossCollections - ExecutedRefunds` | Currency | Period, branch | `report.finance.collection-efficiency` |
| KPI-FBR-005 | Collection Efficiency | `(NetCollections / CollectibleAmount) × 100`, where CollectibleAmount is the sum of opening collectible outstanding plus invoices becoming collectible during period, excluding Cancelled invoices and amounts reversed by executed refunds | Percentage | Period, branch | `report.finance.collection-efficiency` |
| KPI-FBR-006 | Current Outstanding | Sum of active Receivable.outstandingAmount as of asOfDate | Currency | As-of date, branch | `report.finance.receivables-aging` |
| KPI-FBR-007 | Overdue Outstanding | Sum of outstandingAmount where dueDate < asOfDate and outstandingAmount > 0 | Currency | As-of date, branch | `report.finance.overdue-invoices` |
| KPI-FBR-008 | Overdue Ratio | `(OverdueOutstanding / CurrentOutstanding) × 100`; return 0 when CurrentOutstanding is 0 | Percentage | As-of date, branch | `report.finance.receivables-aging` |
| KPI-FBR-009 | Aging 30-Day Exposure | Sum outstanding in `30 Days` bucket | Currency | As-of date, branch | `report.finance.receivables-aging` |
| KPI-FBR-010 | Aging 60-Day Exposure | Sum outstanding in `60 Days` bucket | Currency | As-of date, branch | `report.finance.receivables-aging` |
| KPI-FBR-011 | Aging 90-Day Exposure | Sum outstanding in `90 Days` bucket | Currency | As-of date, branch | `report.finance.receivables-aging` |
| KPI-FBR-012 | Terminal Aging Exposure | Sum outstanding in existing ER terminal bucket `120+ Days`, including compatibility-mapped balances from day 91 onward until enum correction | Currency | As-of date, branch | `report.finance.receivables-aging` |
| KPI-FBR-013 | Average Days to Collect | Average whole and fractional calendar days between invoice issue date and weighted payment allocation dates for fully settled invoices; allocation-weighted for partial payment schedules | Days | Period, branch | `report.finance.collection-efficiency` |
| KPI-FBR-014 | On-Time Collection Rate | `(Count invoices fully settled on or before dueDate / Count invoices fully settled in period) × 100`; 0 when denominator is 0 | Percentage | Period, branch | `report.finance.collection-efficiency` |
| KPI-FBR-015 | Invoice Settlement Rate | `(Count fully paid invoices / Count issued payable invoices)` for selected cohort | Percentage | Cohort period, branch | `report.finance.collection-efficiency` |
| KPI-FBR-016 | Average Invoice Value | `GrossBilledValue / count of issued non-cancelled invoices`; 0 when count is 0 | Currency | Period, branch | `report.finance.branch-performance` |
| KPI-FBR-017 | Payment Transaction Count | Count of successfully posted payments in period | Count | Period, branch | `report.finance.payment-trends` |
| KPI-FBR-018 | Average Payment Value | `GrossCollections / PaymentTransactionCount`; 0 when count is 0 | Currency | Period, branch | `report.finance.payment-trends` |
| KPI-FBR-019 | Refund Rate by Value | `(ExecutedRefundValue / GrossCollections) × 100`; 0 when GrossCollections is 0 | Percentage | Period, branch | `report.finance.refund-analysis` |
| KPI-FBR-020 | Refund Approval Rate | `(Approved + Executed refund decisions / total decided refund requests) × 100`; open requests excluded | Percentage | Period, branch | `report.finance.refund-analysis` |
| KPI-FBR-021 | Refund Turnaround Time | Average duration from refund requestedAt to final approvedAt/rejectedAt for decided requests | Hours | Period, branch | `report.finance.refund-analysis` |
| KPI-FBR-022 | Installment Delinquency Rate | `(Count active installments overdue with balance / Count active installments due as of date) × 100`; 0 when denominator is 0 | Percentage | As-of date, branch | `report.finance.overdue-invoices` |
| KPI-FBR-023 | Corporate Credit Utilization | `((currentOutstanding + committedAmount) / creditLimit) × 100`; undefined/non-applicable where creditLimit=0 and shown as N/A | Percentage | As-of date, corporate account | `report.finance.corporate-exposure` |
| KPI-FBR-024 | Available Corporate Credit | `creditLimit - currentOutstanding - committedAmount` | Currency | As-of date, corporate account | `report.finance.corporate-exposure` |
| KPI-FBR-025 | Credit Block Count | Count of `CorporateCreditValidationFailed` decisions with Block result in period | Count | Period, branch, corporate account | `report.finance.corporate-exposure` |
| KPI-FBR-026 | Credit Warning Count | Count of `AllowWithWarning` decisions in period | Count | Period, branch, corporate account | `report.finance.corporate-exposure` |
| KPI-FBR-027 | Receivable Concentration | `(Top N customer outstanding / total outstanding) × 100`, N defaults to 10 and is configurable 1–100 | Percentage | As-of date, branch | `report.finance.receivables-aging` |
| KPI-FBR-028 | Branch Collection Variance | Branch collection efficiency minus consolidated authorized-scope collection efficiency | Percentage points | Period, branch | `report.finance.branch-performance` and consolidated entitlement |
| KPI-FBR-029 | Payment Method Share | `(Collections by payment method / GrossCollections) × 100` | Percentage | Period, method, branch | `report.finance.payment-trends` |
| KPI-FBR-030 | Receivable Reconciliation Health | `(Count receivables matching invoice outstanding / total active receivables) × 100`; expected 100% | Percentage | As-of timestamp | Finance Manager/Auditor operational monitoring |

### 4.3 KPI Exclusions and Non-Applicable Examples

The following example KPIs are not owned by Module 12 and must not be computed as Finance-owned truth:

- Lead conversion rate is owned by Lead, Enquiry & CRM reporting.
- Admission conversion rate is owned by Admission & Enrollment reporting.
- Seat utilization is owned by Training Delivery reporting.
- Attendance percentage is owned by Attendance reporting.
- Course completion rate is owned by Exam, Result & Completion reporting.

Module 12 may consume those measures in an executive composite dashboard only through Reporting & Executive Dashboards context, not by redefining their ownership.

## 5. Dashboard Inventory

### 5.1 Admin Portal Dashboard Inventory

| Dashboard ID | Dashboard | Primary Roles | Permission Requirements | Scope |
|---|---|---|---|---|
| DB-FBR-001 | Finance Operations Dashboard | Finance Manager, Accountant, Branch Admin | `menu.finance.dashboard`, `finance.report.branch` | Authorized branch set |
| DB-FBR-002 | Receivables & Aging Dashboard | Finance Manager, Accountant, Branch Admin, Auditor | `report.finance.receivables-aging` | Authorized branch set |
| DB-FBR-003 | Collections Dashboard | Finance Manager, Accountant, Executive, Auditor | `report.finance.collection-efficiency`, `report.finance.payment-trends` | Branch or consolidated when entitled |
| DB-FBR-004 | Refund Control Dashboard | Finance Manager, delegated Branch Admin, Auditor | `report.finance.refund-analysis` | Authorized branch set |
| DB-FBR-005 | Corporate Credit Dashboard | Finance Manager, Accountant, Corporate Account Manager, Executive, Auditor | `report.finance.corporate-exposure` | Branch and managed-account intersection where applicable |
| DB-FBR-006 | Branch Finance Performance Dashboard | Finance Manager, Branch Admin, Executive | `report.finance.branch-performance` | Authorized branches; comparisons only over authorized set |
| DB-FBR-007 | Consolidated Finance Dashboard | Executive and explicitly entitled roles | `finance.report.consolidated`, `report.finance.consolidated-summary`, IAM consolidated entitlement | Authorized consolidated branch set |
| DB-FBR-008 | Finance Data Quality Dashboard | Finance Manager, Auditor | `finance.audit.read` or delegated monitoring permission | Authorized branch set |

### 5.2 Student Portal Dashboard Inventory

| Dashboard ID | Dashboard | Permission | Data Boundary |
|---|---|---|---|
| DB-FBR-S01 | My Billing Summary | `finance.self.invoice.read` | Authenticated StudentProfile only |
| DB-FBR-S02 | My Payment & Receipt Summary | `finance.self.payment.read`, `finance.self.receipt.read` | Authenticated StudentProfile only |
| DB-FBR-S03 | My Installment Schedule | `finance.self.installment.read` | Authenticated StudentProfile only |
| DB-FBR-S04 | My Refund Status | `finance.self.refund.read` | Authenticated StudentProfile only |

### 5.3 Trainer Portal Applicability

Module 12 provides no financial dashboard to Trainer users. Trainer Portal may receive only a non-monetary payment-validation outcome such as `Satisfied`, `NotSatisfied`, or `NotRequired` through Completion workflow authorization. It must not expose invoice amounts, payment amounts, outstanding balances, receipts, refunds, or corporate credit data.

## 6. Admin Dashboard Widget Specifications

### 6.1 Finance Operations Dashboard Widgets

| Widget ID | Widget Type | Content | Interaction | Permission |
|---|---|---|---|---|
| W-FBR-001 | Metric card | Gross Billed Value | Period comparison tooltip and drill to invoice report | `finance.report.branch` |
| W-FBR-002 | Metric card | Net Collections | Drill to payment trend report | `report.finance.payment-trends` |
| W-FBR-003 | Metric card | Current Outstanding | Drill to receivables report | `finance.receivable.read` |
| W-FBR-004 | Metric card | Overdue Outstanding | Drill to overdue report | `report.finance.overdue-invoices` |
| W-FBR-005 | Metric card | Collection Efficiency | Compare previous equivalent period | `report.finance.collection-efficiency` |
| W-FBR-006 | Metric card | Refunds Pending Decision | Drill to refund queue filtered Requested/UnderReview | `finance.refund.read` |
| W-FBR-007 | Line chart | Daily/weekly/monthly billed value vs gross and net collections | Granularity selector; branch, course, customer type filters | Relevant report permissions |
| W-FBR-008 | Stacked bar chart | Outstanding by aging bucket | Click bucket to filter receivable table | `report.finance.receivables-aging` |
| W-FBR-009 | Donut chart | Collections by payment method | Click method to open filtered payment report | `report.finance.payment-trends` |
| W-FBR-010 | Table | Top overdue invoices | Invoice number, customer, due date, days past due, outstanding | `report.finance.overdue-invoices` |
| W-FBR-011 | Table | Upcoming installment dues | Due in next 7/14/30 days | `finance.installment.read` |
| W-FBR-012 | Alert list | Reconciliation exceptions | Invoice/receivable mismatch, projection stale, duplicate-risk flags | Finance Manager/Auditor monitoring access |

### 6.2 Receivables & Aging Dashboard Widgets

| Widget ID | Widget Type | Definition | Drill Behavior |
|---|---|---|---|
| W-FBR-020 | Metric card | Total active outstanding | Opens receivables report with current scope |
| W-FBR-021 | Metric card | Overdue ratio | Opens overdue subset |
| W-FBR-022 | Horizontal stacked bar | Aging distribution by amount | Click bucket to filter detail |
| W-FBR-023 | Column chart | Aging by branch | Only authorized branches appear |
| W-FBR-024 | Bar chart | Top 10 customers by outstanding | Student display is masked unless operational permission allows person detail |
| W-FBR-025 | Trend chart | Month-end outstanding trend | Uses daily/month-end snapshot read model |
| W-FBR-026 | Table | Highest-risk overdue accounts | Sort by days past due desc, outstanding desc |
| W-FBR-027 | Table | Installment delinquency | Invoice, installment sequence, due date, remaining amount, days late |

### 6.3 Collections Dashboard Widgets

| Widget ID | Widget Type | Definition | Drill Behavior |
|---|---|---|---|
| W-FBR-030 | Metric card | Gross collections | Payment detail report |
| W-FBR-031 | Metric card | Net collections | Payment/refund reconciliation view |
| W-FBR-032 | Metric card | Collection efficiency | Cohort breakdown |
| W-FBR-033 | Metric card | On-time collection rate | Fully settled invoice cohort |
| W-FBR-034 | Dual-line chart | Billed vs net collected by period | Daily/weekly/monthly granularity |
| W-FBR-035 | Stacked column | Collection by payment method and branch | Authorized branch set only |
| W-FBR-036 | Heatmap | Day-of-week and hour-of-day payment posting count | GST timezone labels |
| W-FBR-037 | Table | Largest collections | Payment number, invoice number, customer, amount, method, date |

### 6.4 Refund Dashboard Widgets

| Widget ID | Widget Type | Definition | Permission |
|---|---|---|---|
| W-FBR-040 | Metric card | Requested refund count/value | `report.finance.refund-analysis` |
| W-FBR-041 | Metric card | Approved awaiting execution count/value | `report.finance.refund-analysis` |
| W-FBR-042 | Metric card | Executed refund count/value | `report.finance.refund-analysis` |
| W-FBR-043 | Metric card | Refund approval rate | `report.finance.refund-analysis` |
| W-FBR-044 | Funnel chart | Requested → Approved/Rejected → Executed | `report.finance.refund-analysis` |
| W-FBR-045 | Trend chart | Executed refund value by period | `report.finance.refund-analysis` |
| W-FBR-046 | Table | Pending approval queue | `finance.refund.read`; action buttons require separate approve permission |
| W-FBR-047 | Table | SLA aging of open refund requests | `report.finance.refund-analysis` |

### 6.5 Corporate Credit Dashboard Widgets

| Widget ID | Widget Type | Definition | Scope |
|---|---|---|---|
| W-FBR-050 | Metric card | Total credit limit | Sum by currency; no cross-currency addition |
| W-FBR-051 | Metric card | Total utilized exposure | Outstanding + committed |
| W-FBR-052 | Metric card | Available credit | Limit minus exposure |
| W-FBR-053 | Metric card | Accounts above 90% utilization | Count |
| W-FBR-054 | Gauge/table | Utilization by corporate account | Managed-account restriction for Corporate Account Manager |
| W-FBR-055 | Table | Blocked credit validations | Event date, account, proposed value, projected exposure, limit |
| W-FBR-056 | Trend chart | Credit blocks and warnings over time | Branch/account filter |
| W-FBR-057 | Table | Credit rules nearing effectiveEndDate | Configurable horizon 7/30/60 days |

### 6.6 Branch Performance Dashboard Widgets

| Widget ID | Widget Type | Definition | Rule |
|---|---|---|---|
| W-FBR-060 | Ranked table | Branches by net collection | Only authorized branch set |
| W-FBR-061 | Ranked table | Branches by collection efficiency | Minimum denominator displayed |
| W-FBR-062 | Grouped bar | Billed, net collected, outstanding by branch | Currency-separated |
| W-FBR-063 | Scatter plot | Collection efficiency vs overdue ratio | Authorized branches only |
| W-FBR-064 | Heat table | Aging bucket distribution by branch | Amount and percentage toggle |
| W-FBR-065 | Metric card | Best-performing branch | Based on selected KPI; exact KPI displayed |

## 7. Student Portal Widget Specifications

| Widget ID | Widget | Display | Permission |
|---|---|---|---|
| W-FBR-S01 | Total outstanding | Sum of own active invoice outstanding | `finance.self.invoice.read` |
| W-FBR-S02 | Next installment due | Due date and amount for earliest unpaid own installment | `finance.self.installment.read` |
| W-FBR-S03 | Recent payment | Last successful own payment date, amount, method label | `finance.self.payment.read` |
| W-FBR-S04 | Receipt shortcut | Latest own receipt reference and download action | `finance.self.receipt.read` |
| W-FBR-S05 | Invoice status list | Own invoices only | `finance.self.invoice.read` |
| W-FBR-S06 | Refund status list | Own refund requests only | `finance.self.refund.read` |

Student widgets must not expose branch comparisons, other students, corporate account exposure, collection efficiency, revenue metrics, or audit data.

## 8. Common Dashboard Filters and Interaction Rules

### 8.1 Common Filters

| Filter | Type | Validation | Default |
|---|---|---|---|
| dateFrom | Date | ISO `YYYY-MM-DD`; <= dateTo | First day of current month |
| dateTo | Date | ISO `YYYY-MM-DD`; >= dateFrom | Current GST business date |
| asOfDate | Date | ISO date; <= current GST business date unless forecast-specific widget | Current GST business date |
| branchIds | Multi-select UUID | Each ID must belong to effective authorized branch set | Active branch context |
| currency | Select | ISO 4217 uppercase 3-letter code | OMR |
| courseId | UUID selector | Must resolve to course visible through scoped finance lines | All |
| batchId | UUID selector | Must belong to selected/authorized branch context | All |
| customerType | Enum | Student, Corporate | All |
| corporateAccountId | UUID selector | Managed account and branch authorization required | All authorized accounts |
| invoiceStatus | Multi-select enum | Valid Finance invoice states only | Operationally active states |
| paymentMethod | Multi-select enum | Cash, BankTransfer, Card, Online, Cheque, CorporateBilling | All |
| agingBucket | Multi-select enum | Current, 30 Days, 60 Days, 90 Days, terminal compatibility bucket | All |

### 8.2 Interaction Rules

1. Filter state is encoded in the URL for shareable authorized views, excluding sensitive free-text search values when policy forbids persistence.
2. Every filter change triggers a debounced server request; no client-side full-dataset filtering is allowed for branch-scoped transactional data.
3. Widget drill-through preserves period, branch, currency, and selected analytical dimensions.
4. Drill-through requests re-run authorization; a widget link is never proof of access.
5. Multi-currency dashboards show separate cards/series per currency unless a separately governed conversion layer is introduced.
6. Chart tooltips show exact amount, currency, percentage denominator, reporting period, and data-as-of timestamp where applicable.
7. Dashboard refresh does not mutate Finance records.

## 9. Operational Report Inventory

| Report ID | Report Name | Permission | Purpose |
|---|---|---|---|
| RPT-FBR-001 | Invoice Register | `finance.invoice.read` | Full invoice operational register |
| RPT-FBR-002 | Invoice Line Detail | `finance.invoice.read` | Line-level billing traceability by enrollment/course |
| RPT-FBR-003 | Collection Efficiency Report | `report.finance.collection-efficiency` | Compare collectible value and net collections |
| RPT-FBR-004 | Payment Transaction Register | `finance.payment.read` | Payment and allocation reconciliation |
| RPT-FBR-005 | Payment Method Trend | `report.finance.payment-trends` | Collection mix and trends |
| RPT-FBR-006 | Receipt Register | `finance.receipt.read` | Receipt control and traceability |
| RPT-FBR-007 | Installment Schedule & Delinquency | `finance.installment.read` | Due schedule, paid amount, arrears |
| RPT-FBR-008 | Receivables Aging Detail | `report.finance.receivables-aging` | Outstanding detail and aging classification |
| RPT-FBR-009 | Receivables Aging Summary | `report.finance.receivables-aging` | Bucket totals by branch/customer type |
| RPT-FBR-010 | Overdue Invoice Report | `report.finance.overdue-invoices` | Collection follow-up prioritization |
| RPT-FBR-011 | Refund Register | `finance.refund.read` | Refund lifecycle traceability |
| RPT-FBR-012 | Refund Analysis | `report.finance.refund-analysis` | Refund rate, value, approval, turnaround |
| RPT-FBR-013 | Corporate Exposure Report | `report.finance.corporate-exposure` | Credit limit, exposure, availability, utilization |
| RPT-FBR-014 | Corporate Credit Decision Log | `report.finance.corporate-exposure` | Allow/warn/block decision audit analysis |
| RPT-FBR-015 | Branch Finance Performance | `report.finance.branch-performance` | Branch KPI comparison |
| RPT-FBR-016 | Consolidated Finance Summary | `report.finance.consolidated-summary` plus consolidated permission and IAM entitlement | Multi-branch finance summary |
| RPT-FBR-017 | Finance Audit Trail | `finance.audit.read` | Sensitive action history |
| RPT-FBR-018 | Finance Audit Export | `report.finance.audit-export` + `finance.export` | Compliance extraction |
| RPT-FBR-019 | Receivable Reconciliation Exceptions | Finance Manager/Auditor monitoring access | Invoice vs receivable mismatch control |
| RPT-FBR-020 | Payment Allocation Reconciliation | `finance.payment.read` | Payment amount vs allocation sum and installment effects |

## 10. Operational Report Specifications

### 10.1 RPT-FBR-001 Invoice Register

**Filters:** invoice date range, due date range, branch, invoice type, status, currency, student, corporate account, enrollment number, course, batch, outstanding-only flag.

**Columns:** invoiceNumber, invoiceType, invoiceDate, dueDate, branchCode, studentNumber or corporateAccountCode, customerDisplayName, enrollmentNumber where applicable, currency, subtotal, discountAmount, taxAmount, totalAmount, paidAmount, outstandingAmount, status, daysPastDue, createdAt, issuedAt.

**Sorting:** invoiceDate desc default; invoiceNumber, dueDate, totalAmount, paidAmount, outstandingAmount, status, customerDisplayName.

**Paging:** cursor-based or stable offset paging; default 50 rows; allowed 25, 50, 100, 200; stable secondary sort by invoice.id.

**Exports:** CSV, XLSX, PDF. PDF is landscape summary layout and may truncate narrative fields only, never financial identifiers or amounts. Export requires `finance.export` in addition to read permission.

### 10.2 RPT-FBR-002 Invoice Line Detail

**Filters:** invoice date range, branch, invoice type, course, batch, enrollment type, customer type, currency.

**Columns:** invoiceNumber, lineSequence, invoiceDate, branchCode, customerType, customerReference, enrollmentNumber, courseCode, batchCode, description, quantity, unitPrice, grossAmount, discountAmount, netAmount, taxRate, taxAmount, lineTotal, currency.

**Sorting:** invoiceDate desc, invoiceNumber asc, lineSequence asc default; courseCode, batchCode, lineTotal.

**Exports:** CSV and XLSX for detailed rows; PDF only when filtered result <= 2,000 lines.

### 10.3 RPT-FBR-003 Collection Efficiency Report

**Filters:** period, branch, currency, customer type, course, corporate account.

**Columns:** periodBucket, branchCode, openingCollectibleOutstanding, collectibleInvoicesAdded, adjustmentsFromExecutedRefunds, collectibleAmount, grossCollections, executedRefunds, netCollections, collectionEfficiencyPercent, onTimeCollectionRate, averageDaysToCollect.

**Sorting:** periodBucket asc default; collectionEfficiencyPercent desc, netCollections desc.

**Exports:** CSV, XLSX, PDF.

### 10.4 RPT-FBR-004 Payment Transaction Register

**Filters:** payment date range, branch, payment method, invoice number, payment number, student, corporate account, currency, receivedBy.

**Columns:** paymentNumber, paymentDate, branchCode, invoiceNumber, customerReference, customerDisplayName, paymentMethod, amount, currency, referenceNumber, receivedByDisplayName, allocationCount, receiptNumber, createdAt.

**Sorting:** paymentDate desc default; paymentNumber, amount, method, invoiceNumber.

**Exports:** CSV, XLSX, PDF.

### 10.5 RPT-FBR-005 Payment Method Trend

**Filters:** period, granularity day/week/month, branch, currency, payment method.

**Columns:** periodBucket, branchCode, paymentMethod, paymentCount, grossCollectionAmount, sharePercent, averagePaymentValue.

**Sorting:** periodBucket asc, grossCollectionAmount desc.

**Exports:** CSV, XLSX, PDF chart summary.

### 10.6 RPT-FBR-006 Receipt Register

**Filters:** receipt date range, branch, payment method, invoice number, receipt number, customer reference.

**Columns:** receiptNumber, receiptDate, paymentNumber, invoiceNumber, customerReference, customerDisplayName, paymentMethod, amount, currency, issuedBy, issuedAt, renderLanguageAvailability.

**Sorting:** receiptDate desc default; receiptNumber, amount.

**Exports:** CSV, XLSX, PDF summary. Individual receipt document download remains separate and subject-owned/scoped.

### 10.7 RPT-FBR-007 Installment Schedule & Delinquency

**Filters:** due date range, branch, installment status, overdue-only, invoice number, student, corporate account, course, batch.

**Columns:** invoiceNumber, planName, sequenceNumber, dueDate, installmentAmount, paidAmount, remainingAmount, status, daysPastDue, customerReference, customerDisplayName, branchCode, lastAllocationDate.

**Sorting:** dueDate asc default; daysPastDue desc, remainingAmount desc, customerDisplayName.

**Exports:** CSV, XLSX, PDF.

### 10.8 RPT-FBR-008 Receivables Aging Detail

**Filters:** asOfDate, branch, aging bucket, customer type, student, corporate account, course, batch, currency, minimumOutstanding.

**Columns:** invoiceNumber, customerType, customerReference, customerDisplayName, branchCode, invoiceDate, dueDate, daysPastDue, agingBucket, currency, originalInvoiceAmount, paidAmount, outstandingAmount, lastPaymentDate, nextInstallmentDueDate.

**Sorting:** daysPastDue desc then outstandingAmount desc default; dueDate, outstandingAmount, customerDisplayName.

**Exports:** CSV, XLSX, PDF.

### 10.9 RPT-FBR-009 Receivables Aging Summary

**Filters:** asOfDate, branch, customer type, currency.

**Columns:** branchCode, customerType, currentAmount, thirtyDayAmount, sixtyDayAmount, ninetyDayAmount, terminalBucketAmount, totalOutstanding, overdueRatio.

**Sorting:** totalOutstanding desc default; overdueRatio desc, branchCode.

**Exports:** CSV, XLSX, PDF.

### 10.10 RPT-FBR-010 Overdue Invoice Report

**Filters:** asOfDate, branch, minimumDaysPastDue, maximumDaysPastDue, minimumOutstanding, customer type, course, corporate account, currency.

**Columns:** invoiceNumber, customerReference, customerDisplayName, branchCode, dueDate, daysPastDue, agingBucket, outstandingAmount, currency, installmentPlanFlag, nextActionOwner where available, latestPaymentDate.

**Sorting:** daysPastDue desc, outstandingAmount desc default.

**Exports:** CSV, XLSX, PDF.

### 10.11 RPT-FBR-011 Refund Register

**Filters:** request date range, branch, status, refund type, requester, approver, payment number, invoice number, customer reference.

**Columns:** refundNumber, requestedAt, invoiceNumber, paymentNumber, customerReference, branchCode, refundType, amount, currency, reasonCode, status, requestedBy, decidedBy, decisionAt, executedAt, executionReference.

**Sorting:** requestedAt desc default; amount desc, status, decisionAt.

**Exports:** CSV, XLSX, PDF.

### 10.12 RPT-FBR-012 Refund Analysis

**Filters:** period, branch, refund status, refund type, reason code, customer type, currency.

**Columns:** periodBucket, branchCode, requestedCount, requestedValue, approvedCount, approvedValue, rejectedCount, rejectedValue, executedCount, executedValue, approvalRate, averageTurnaroundHours, refundRateByValue.

**Sorting:** periodBucket asc default; executedValue desc, refundRateByValue desc.

**Exports:** CSV, XLSX, PDF.

### 10.13 RPT-FBR-013 Corporate Exposure Report

**Filters:** asOfDate, branch, corporate account, utilization threshold, block flag, rule status, currency.

**Columns:** corporateAccountCode, accountName, branchScope, currency, creditLimit, currentOutstanding, committedAmount, utilizedExposure, availableCredit, utilizationPercent, blockOnCreditLimit, effectiveStartDate, effectiveEndDate, ruleStatus.

**Sorting:** utilizationPercent desc default; availableCredit asc, currentOutstanding desc.

**Exports:** CSV, XLSX, PDF.

### 10.14 RPT-FBR-014 Corporate Credit Decision Log

**Filters:** validation date range, branch, corporate account, decision Allow/AllowWithWarning/Block, enrollment reference.

**Columns:** validatedAt, corporateAccountCode, branchCode, enrollmentReference, proposedEnrollmentValue, currentOutstanding, committedAmount, projectedExposure, creditLimit, availableCreditBeforeProposal, decision, reasonCode.

**Sorting:** validatedAt desc default; projectedExposure desc.

**Exports:** CSV, XLSX, PDF. Sensitive audit metadata requires additional audit permission where included.

### 10.15 RPT-FBR-015 Branch Finance Performance

**Filters:** period, authorized branch list, currency, customer type.

**Columns:** branchCode, grossBilledValue, grossCollections, executedRefunds, netCollections, collectionEfficiency, currentOutstanding, overdueOutstanding, overdueRatio, averageInvoiceValue, averageDaysToCollect, refundRateByValue.

**Sorting:** netCollections desc default; any displayed KPI.

**Exports:** CSV, XLSX, PDF.

### 10.16 RPT-FBR-016 Consolidated Finance Summary

**Filters:** period, authorized branch subset, currency, customer type.

**Columns:** totalBilled, grossCollections, netCollections, currentOutstanding, overdueOutstanding, collectionEfficiency, overdueRatio, executedRefundValue, corporateExposure, branchCount, dataAsOf.

**Sorting:** not applicable for single summary; branch breakdown subtable sortable by any KPI.

**Exports:** CSV for breakdown, XLSX with Summary and Branch Detail sheets, PDF executive summary.

### 10.17 RPT-FBR-017 Finance Audit Trail

**Filters:** action date range, branch, entityType, entityId, action, performedBy, reason required flag.

**Columns:** performedAt, branchId, entityType, entityId, businessReference, action, performedBy, reason, oldValueDigest, newValueDigest, ipAddress, correlationId.

**Sorting:** performedAt desc default; entityType, action, performedBy.

**Exports:** Normal CSV/XLSX export requires `finance.export`; compliance extraction uses RPT-FBR-018.

### 10.18 RPT-FBR-018 Finance Audit Export

**Filters:** bounded date range mandatory; branch set; entity type; action category.

**Columns:** complete approved audit export field set with sensitive data minimization policy applied.

**Sorting:** performedAt asc for chronological audit reconstruction.

**Exports:** CSV and XLSX only. PDF is not permitted because audit extraction may exceed safe PDF pagination and is intended for machine reconciliation.

### 10.19 RPT-FBR-019 Receivable Reconciliation Exceptions

**Filters:** detection timestamp range, branch, exception type, unresolved-only.

**Columns:** detectedAt, invoiceNumber, receivableId, invoiceOutstanding, receivableOutstanding, variance, invoiceVersion, receivableUpdatedAt, exceptionType, resolutionStatus.

**Sorting:** absoluteVariance desc then detectedAt desc.

**Exports:** CSV, XLSX.

### 10.20 RPT-FBR-020 Payment Allocation Reconciliation

**Filters:** payment date range, branch, payment number, invoice number, mismatch-only.

**Columns:** paymentNumber, invoiceNumber, paymentAmount, allocationSum, variance, installmentAllocationCount, invoicePaidBefore, invoicePaidAfter, invoiceOutstandingAfter, receiptNumber, transactionCorrelationId.

**Sorting:** paymentDate desc; absoluteVariance desc.

**Exports:** CSV, XLSX.

## 11. Export Rules

### 11.1 Common Export Controls

1. User must have source dataset permission and `finance.export`.
2. Consolidated exports additionally require `finance.report.consolidated` and IAM consolidated entitlement.
3. Export query uses the same server-side branch predicate as the interactive report.
4. Export request stores requester, timestamp, branch scope, filters, format, row count, report code, and correlation ID in audit history.
5. CSV is UTF-8 with BOM only when required for spreadsheet compatibility; Arabic text must remain valid UTF-8.
6. XLSX files use typed numeric/date cells and separate sheets when explicitly specified.
7. PDF uses bilingual-capable fonts available to the application runtime; Arabic content is shaped and rendered RTL.
8. Formula injection defenses apply to CSV/XLSX cells beginning with `=`, `+`, `-`, or `@` by safe encoding policy.
9. Export row limits:
   - synchronous CSV: 50,000 rows;
   - synchronous XLSX: 25,000 rows;
   - PDF detail: 2,000 rows;
   - requests beyond limits must use the platform job mechanism within the modular monolith and must not bypass authorization at retrieval time.
10. Generated export files use time-limited authenticated access; permanent public URLs are prohibited.

## 12. Reporting Read Models and Database Views

### 12.1 Read Model Strategy

The reporting layer uses PostgreSQL views, materialized views, and purpose-built projection tables within the modular monolith database. No separate microservice or external event broker is required.

Selection rules:

- Use a standard SQL view for current-state joins that remain performant under indexed predicates.
- Use a materialized view for expensive aggregates that can tolerate bounded staleness.
- Use a projection/snapshot table when historical as-of reporting cannot be reproduced reliably from current-state rows alone.
- Refresh/materialization jobs run through the monorepo jobs infrastructure and are idempotent.
- Reporting views never grant direct database access to end users; application services still apply authorization predicates.

### 12.2 `vw_fin_invoice_register`

**Purpose:** Fast invoice register and invoice drill-through list.

**Source tables:** Invoice, aggregated InvoiceLineItem, Receivable, latest Payment date projection.

**Key columns:** invoiceId, invoiceNumber, branchId, invoiceType, studentProfileId, corporateAccountId, enrollmentId, invoiceDate, dueDate, currency, subtotal, discountAmount, taxAmount, totalAmount, paidAmount, outstandingAmount, status, daysPastDue, agingBucket, latestPaymentDate.

**Indexes on backing tables:** `(branchId, invoiceDate desc)`, `(branchId, status, dueDate)`, unique invoiceNumber within numbering scope, receivable invoice unique active constraint.

### 12.3 `vw_fin_payment_register`

**Purpose:** Payment register and payment-method analytics.

**Source tables:** Payment, Invoice, Receipt, PaymentAllocation aggregate.

**Key columns:** paymentId, paymentNumber, paymentDate, branchId resolved from invoice, invoiceId, invoiceNumber, customer references, paymentMethod, amount, currency, referenceNumber, receivedBy, allocationCount, allocationAmount, receiptNumber.

**Control:** allocationAmount must equal paymentAmount; mismatches feed reconciliation exception view.

### 12.4 `vw_fin_refund_register`

**Purpose:** Refund workflow reporting.

**Source tables:** Refund, Payment, Invoice, audit/approval references.

**Key columns:** refundId, refundNumber, branchId, invoiceId, paymentId, refundType, amount, status, reasonCode, requestedBy, requestedAt, approvedBy, approvedAt, rejectedBy, rejectedAt, executedAt, executionReference.

### 12.5 `vw_fin_receivable_aging`

**Purpose:** Current aging detail.

**Source tables:** Receivable, Invoice, customer reference projections.

**Key columns:** receivableId, invoiceId, invoiceNumber, branchId, customerType, studentProfileId, corporateAccountId, dueDate, outstandingAmount, daysPastDue, agingBucket, asOfDate.

**Calculation:** `daysPastDue = max(0, asOfDate - dueDate)` using GST business date. Bucket classification follows Part 7 exact rules.

### 12.6 `mv_fin_daily_branch_kpi`

**Purpose:** Fast branch dashboard cards and trend charts.

**Grain:** businessDate, branchId, currency.

**Columns:** businessDate, branchId, currency, billedValue, grossCollections, executedRefunds, netCollections, invoiceCount, paymentCount, refundCount, dataAsOf.

**Refresh:** incremental daily upsert after Finance transactions, with full reconciliation refresh at least daily. Dashboard displays dataAsOf.

### 12.7 `mv_fin_monthly_collection_efficiency`

**Purpose:** Historical collection-efficiency trend.

**Grain:** monthStart, branchId, currency, customerType.

**Columns:** openingCollectibleOutstanding, collectibleInvoicesAdded, collectibleAmount, grossCollections, executedRefunds, netCollections, collectionEfficiencyPercent, onTimeSettlementCount, settledInvoiceCount, onTimeCollectionRate, averageDaysToCollect.

### 12.8 `fin_receivable_snapshot_daily`

**Purpose:** Historical aging trend and month-end outstanding analysis.

**Grain:** snapshotDate, receivableId.

**Columns:** snapshotDate, receivableId, invoiceId, branchId, customerType, currency, outstandingAmount, daysPastDue, agingBucket, invoiceStatus, receivableStatus.

**Retention:** retain according to Finance reporting retention policy; deletion requires compliance-approved retention process, not ordinary user delete.

### 12.9 `vw_fin_installment_delinquency`

**Purpose:** Upcoming dues and overdue installment analysis.

**Source tables:** InstallmentPlan, Installment, Invoice, PaymentAllocation.

**Columns:** installmentId, invoiceId, invoiceNumber, branchId, sequenceNumber, dueDate, amount, paidAmount, remainingAmount, status, daysPastDue, latestAllocationDate.

### 12.10 `vw_fin_corporate_credit_exposure`

**Purpose:** Corporate credit dashboard and report.

**Source:** effective CorporateCreditRule plus corporate outstanding and committed exposure projections.

**Columns:** corporateAccountId, branchScope, currency, creditLimit, currentOutstanding, committedAmount, utilizedExposure, availableCredit, utilizationPercent, blockOnCreditLimit, effectiveStartDate, effectiveEndDate, ruleStatus, calculatedAt.

**Effective-rule rule:** exactly one applicable active rule for the account/scope/currency/date; multiple effective matches surface a data-integrity exception.

### 12.11 `vw_fin_reconciliation_exceptions`

**Purpose:** Detect financial projection mismatches.

**Checks:**

- Invoice.outstandingAmount vs Receivable.outstandingAmount;
- Payment.amount vs sum active PaymentAllocation.amount;
- Payment with missing active Receipt;
- multiple active Receipts per Payment;
- Installment.paidAmount vs allocation sum;
- Invoice.paidAmount vs effective payment/refund effects.

**Columns:** exceptionType, entityType, entityId, branchId, expectedValue, actualValue, variance, detectedAt, severity.

## 13. Read Model Refresh and Consistency Requirements

| Read Model | Target Freshness | Refresh Strategy | Dashboard Staleness Behavior |
|---|---|---|---|
| Standard views | Transactionally current | Query-time | No projection lag |
| `mv_fin_daily_branch_kpi` | <= 5 minutes during business hours | Incremental job plus periodic reconciliation | Show stale badge after 5 minutes |
| `mv_fin_monthly_collection_efficiency` | <= 30 minutes | Incremental period recomputation | Show dataAsOf |
| `fin_receivable_snapshot_daily` | Daily by 00:30 GST for prior date | Idempotent daily snapshot | Historical chart marks missing snapshot |
| Credit exposure view | <= 1 minute or request-time calculation for enrollment guard | View/query service | Enrollment credit guard must use authoritative application service, not stale dashboard materialization |
| Reconciliation exceptions | <= 15 minutes | Scheduled control query | Alert if last successful run > 30 minutes |

Enrollment blocking, payment validation for completion/certificate, payment posting, refund execution, and invoice issuance must never rely solely on stale materialized reporting views.

## 14. Branch-Scoping Rules for Reporting Queries

### 14.1 Effective Branch Set Algorithm

1. Authenticate user.
2. Resolve active `UserBranchAccess` assignments.
3. Start with directly assigned branch IDs.
4. Add child branches only where `canViewChildBranches=true` and hierarchy is effective.
5. For consolidated report requests, require both the Finance consolidated permission and `canViewConsolidated=true` or equivalent approved entitlement.
6. Intersect requested branch IDs with effective authorized branch set.
7. Reject explicitly requested unauthorized branch IDs with `403 ERR_FIN_BRANCH_SCOPE_DENIED` rather than silently returning foreign-branch data.
8. Apply `branch_id = ANY(:authorizedBranchIds)` or equivalent parameterized predicate before aggregation.
9. For managed corporate account access, additionally intersect with managed account IDs.
10. For student self-service, ignore branch expansion and enforce subject ownership.

### 14.2 Aggregation Leakage Prevention

A user must not infer unauthorized branch values from:

- grand totals;
- chart series labels;
- percentages whose denominator includes unauthorized data;
- ranked positions calculated across unauthorized branches;
- export row counts;
- empty/non-empty differences caused by unauthorized records;
- API metadata such as totalRows or totalAmount.

All denominators and comparison groups are calculated from the authorized dataset only.

## 15. Bilingual Dashboard and Report Rules

1. English UI uses LTR layout; Arabic UI uses RTL layout.
2. Numeric values and currency amounts retain logical numeric order and use locale-aware formatting without reversing digits.
3. Invoice, payment, receipt, enrollment, batch, and corporate account identifiers render in isolated LTR spans inside RTL layouts.
4. Charts mirror category-axis placement where appropriate, but time must continue chronologically from earlier to later according to the chart library's RTL-safe configuration.
5. Arabic report headers use approved Arabic labels; source identifiers remain unchanged.
6. CSV exports use language-specific headers only when the user explicitly selects localized headers; machine integrations use canonical English field keys.
7. XLSX may include bilingual header rows only when configured; numeric cells remain numeric.
8. PDF report titles, column headers, totals, and footnotes support Arabic shaping and RTL alignment.
9. Customer names use localized display name where available, falling back deterministically to primary display name.

## 16. Data Quality and Reconciliation Controls

| Control ID | Control | Expected Result |
|---|---|---|
| DQ-FBR-001 | Invoice header equals canonical line sums | Zero mismatches |
| DQ-FBR-002 | Payment amount equals active allocation sum | Zero mismatches |
| DQ-FBR-003 | Exactly one active receipt per posted payment | 100% coverage, no duplicates |
| DQ-FBR-004 | Receivable outstanding equals invoice outstanding | Zero variance |
| DQ-FBR-005 | Installment paid amount equals allocation aggregate | Zero variance |
| DQ-FBR-006 | Aging bucket matches daysPastDue compatibility mapping | Zero misclassifications |
| DQ-FBR-007 | Effective CorporateCreditRule periods do not overlap | Zero overlaps |
| DQ-FBR-008 | Dashboard metric equals detail report aggregate under identical filters | Exact currency-precision equality |
| DQ-FBR-009 | Unauthorized branch IDs absent from read models returned to user | Zero leaks |
| DQ-FBR-010 | Export filters and row counts match audited request | Exact match |

## 17. FR Traceability

| FR | Reporting / Analytics Coverage |
|---|---|
| FR-FBR-005 | Invoice register, search read model, paging and filtering |
| FR-FBR-007 | Installment delinquency report and widget |
| FR-FBR-010 | Receipt register and Student receipt summary |
| FR-FBR-012 | Receivable detail and projection views |
| FR-FBR-013 | Aging KPIs, reports, snapshots, and charts |
| FR-FBR-018 | Credit decision log and Corporate Credit Dashboard |
| FR-FBR-019 | Exposure formulas and credit exposure view |
| FR-FBR-020 | Data-quality reporting only; authoritative validation remains command/query service |
| FR-FBR-021 | Branch finance dashboards and operational reports |
| FR-FBR-022 | Consolidated dashboard, report, and two-key authorization |
| FR-FBR-023 | CSV, XLSX, PDF export controls and audit |
| FR-FBR-025 | Audit Trail and Audit Export reports |
| FR-FBR-027 | Bilingual report and dashboard rendering |
| FR-FBR-028 | GST timezone period and aging semantics |

## 18. Reporting Acceptance Criteria

1. Every dashboard request applies server-side authorized branch scope before aggregation.
2. Consolidated reporting requires both Finance consolidated permission and IAM consolidated entitlement.
3. KPI definitions use exact formulas documented in this file.
4. Dashboard totals reconcile to detail reports for the same filters and data-as-of timestamp.
5. Multi-currency values are not summed into a single amount without an approved FX layer.
6. Draft and Cancelled invoices are excluded according to KPI conventions.
7. Executed refunds reduce net collection metrics; non-executed refunds do not.
8. Receivable aging uses GST business date and Part 7 compatibility bucket mapping.
9. Student dashboard returns only records owned by the authenticated StudentProfile.
10. Trainer users cannot access Module 12 financial dashboards.
11. Export requires both dataset/report permission and `finance.export`.
12. Export requests are audit logged with scope and filters.
13. Reporting materialization freshness is visible through dataAsOf metadata.
14. Enrollment credit blocking and payment eligibility checks never depend solely on stale reporting projections.
15. Read-model reconciliation controls detect payment-allocation, receipt, installment, and receivable mismatches.
16. English and Arabic dashboards preserve correct LTR/RTL and identifier rendering behavior.
