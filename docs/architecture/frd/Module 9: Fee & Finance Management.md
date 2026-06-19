# Functional Requirement Document

## Module 9: Fee & Finance Management

**Version:** 1.1
**Module Code:** FIN
**Phase:** Phase 1
**Owned Bounded Context:** Fee & Finance Management

**Dependencies:**

* Admission & Enrollment Management
* Course & Batch Management
* Corporate Training Management
* Identity & Access Management

**Provides Data To:**

* Exam, Result & Completion Management
* Certificate Management
* Reporting & Dashboards
* Audit & Compliance
* Corporate Billing

---

# 1. Business Purpose

Fee & Finance Management handles operational finance for student enrollments and corporate training contracts.

The context owns fee plans, installment plans, enrollment fee accounts, payments, receipts, discounts, refunds, and corporate invoices.

Phase 1 covers operational finance only and does not include full general ledger accounting or payment gateway automation.

---

# 2. Scope

## 2.1 In Scope

* Fee plan management
* Installment plan management
* Enrollment fee account management
* Payment recording
* Receipt generation
* Discount management
* Refund request and approval workflow
* Corporate invoice management
* Outstanding balance tracking
* Fee clearance evaluation
* Financial statements and reports

## 2.2 Out of Scope for Phase 1

* Full general ledger
* Bank reconciliation automation
* Payment gateway automation
* Accounting ledger posting
* Payroll

---

# 3. Business Principles

* Finance is operational and transaction focused in Phase 1.
* Fee plans are versioned and must preserve historical snapshots.
* An enrollment fee account is created from an enrollment and captures the active fee plan snapshot.
* Payments are posted records and must be immutable after posting.
* Receipts are immutable after issuance.
* Discounts and refunds require controlled authorization and auditability.
* Corporate invoices are tied to corporate contracts or corporate programs.
* Finance actions must be auditable.
* Fee clearance eligibility is consumed by completion and certificate modules.

---

# 4. Owned Concepts

The Finance context owns:

* FeePlan
* InstallmentPlan
* EnrollmentFeeAccount
* FeeAccountInstallment
* Payment
* Receipt
* Discount
* Refund
* CorporateInvoice
* FeeClearancePolicy

Notes:

* Course pricing remains owned by Course & Batch Management.
* Enrollment, Student, Corporate Contract, and Corporate Participant are referenced from other contexts.
* Finance stores snapshots so later catalog changes do not rewrite posted financial history.

---

# 5. Business Model

## 5.1 Supported Currencies

The system shall support:

```text
OMR
INR
USD
AED
SAR
QAR
BHD
```

Additional currencies may be configured if policy allows.

## 5.2 Supported Billing Models

### Student Billing

```text
One-Time Fee
Installments
Scholarship
Discounted Fee
```

### Corporate Billing

```text
Per Student
Per Batch
Per Hour
Fixed Contract Value
```

## 5.3 Fee Plan Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
  ↓
Archived
```

Rules:

* Fee plans are versioned by effective dates.
* Only one active fee plan should exist per course, branch, currency, and pricing basis combination.
* Historical fee plans must remain unchanged.

## 5.4 Enrollment Fee Account Lifecycle

```text
Draft
  ↓
Pending Payment
  ↓
Partially Paid
  ↓
Paid
  ↓
Closed
```

Rules:

* Fee accounts are created from enrollment.
* The fee account must snapshot fee plan, tax, discount, and installment structure.
* Fee account status must reflect the current outstanding position.

## 5.5 Payment Lifecycle

```text
Posted
  ↓
Cancelled
```

Rules:

* Posted payments are immutable.
* Cancelled payments remain in history and do not delete the original record.

## 5.6 Refund Lifecycle

```text
Requested
  ↓
Under Review
  ↓
Approved
  ↓
Processed
```

Alternative:

```text
Under Review
  ↓
Rejected
```

Rules:

* Refunds do not alter original posted payment history.
* Refund approval follows configured workflow and authorization.

---

# 6. Screens

## FIN-UI-001 Fee Plan List

### Purpose

Manage fee plans.

### Columns

```text
Fee Plan Name
Course
Branch
Currency
Amount
Status
Actions
```

### Actions

```text
Create
Edit
Activate
Deactivate
Archive
View Installments
```

### Permissions

```text
FEEPLAN_VIEW
FEEPLAN_CREATE
FEEPLAN_EDIT
FEEPLAN_ACTIVATE
FEEPLAN_DEACTIVATE
FEEPLAN_ARCHIVE
```

---

## FIN-UI-002 Fee Plan Screen

### Fields

```text
Fee Plan Name
Course
Branch
Currency
Base Amount
Tax Applicable
Tax Percentage
Pricing Basis
Status
Effective Start Date
Effective End Date
```

### Business Rules

* Multiple fee plans are allowed.
* One active fee plan per pricing combination is allowed.
* Historical fee plans must remain unchanged.
* Fee plans may reference a course pricing source for traceability.

### Validations

* Fee Plan Name is required.
* Course is required.
* Branch is required.
* Currency is required.
* Base Amount must be greater than or equal to zero.
* Tax Percentage cannot be negative.
* Effective Start Date is required.

---

## FIN-UI-003 Installment Plan Screen

### Purpose

Configure installment schedules.

### Fields

```text
Fee Plan
Installment Name
Due Date Rule
Amount
Display Order
Status
```

### Business Rules

* Total installment amount must equal the fee plan total amount unless authorized override exists.
* Installment plans may vary by branch, course, and fee plan.
* Historical installment plans must remain unchanged once used.

---

## FIN-UI-004 Enrollment Fee Account

### Purpose

View student financial position.

### Sections

#### Fee Summary

```text
Total Fee
Tax
Discount
Net Payable
```

#### Payment Summary

```text
Paid Amount
Outstanding Amount
Balance
```

#### Installments

```text
Installment
Due Date
Amount
Status
```

### Status

```text
Pending
Partially Paid
Paid
Overdue
Closed
```

### Actions

```text
Record Payment
Apply Discount
Request Refund
Print Statement
Recalculate Snapshot
```

---

## FIN-UI-005 Record Payment

### Fields

```text
Student
Enrollment
Payment Date
Payment Mode
Amount
Currency
Reference Number
Remarks
```

### Payment Modes

```text
Cash
Bank Transfer
Card
Cheque
Online Transfer
```

### Actions

```text
Save
Generate Receipt
```

### Business Rules

* Payment cannot exceed outstanding balance unless advance payment policy allows it.
* Payment automatically updates the fee account.
* Receipt is generated automatically after successful posting.
* Payment record must be immutable after posting.

---

## FIN-UI-006 Receipt Screen

### Receipt Types

```text
Receipt Voucher
Tax Invoice
Simplified Tax Invoice
Advance Receipt
Refund Receipt
Corporate Invoice
```

### Receipt Information

```text
Receipt Number
Receipt Date
Student
Amount
Currency
Payment Mode
```

### Actions

```text
Print
Download PDF
Email
```

### Business Rules

* Receipt number must be unique.
* Receipt must be immutable after issuance.
* Cancelled receipt requires audit trail and reversal policy.

---

## FIN-UI-007 Discount Screen

### Discount Types

```text
Scholarship
Referral
Corporate
Early Bird
Manual Discount
```

### Discount Modes

```text
Fixed Amount
Percentage
```

### Fields

```text
Discount Type
Discount Mode
Discount Value
Reason
Approver
```

### Business Rules

* Discounts should reduce payable amount.
* Discount approval may be required.
* Discount history must be retained.
* Discount changes must not mutate issued receipts.

---

## FIN-UI-008 Refund Request

### Fields

```text
Student
Enrollment
Refund Type
Refund Amount
Reason
```

### Refund Types

```text
Full Refund
Partial Refund
```

### Actions

```text
Submit
Cancel
```

### Business Rules

* Refund amount cannot exceed paid amount.
* Refund request requires approval workflow.
* Refund should not alter original payment records.

---

## FIN-UI-009 Refund Approval

### Workflow

```text
Requester
  ↓
Finance Review
  ↓
Branch Manager Approval
  ↓
Processed
```

### Fields

```text
Approval Remarks
Decision
```

### Decisions

```text
Approve
Reject
```

### Business Rules

* Approval action must be audited.
* Rejection reason is mandatory.

---

## FIN-UI-010 Corporate Invoice

### Invoice Types

```text
Advance Invoice
Milestone Invoice
Final Invoice
```

### Fields

```text
Corporate Customer
Contract
Invoice Number
Invoice Date
Amount
Tax
Currency
Due Date
```

### Actions

```text
Generate Invoice
Print
Download PDF
Record Payment
```

### Business Rules

* Corporate invoices are linked to contracts or corporate programs.
* Multiple invoices per contract are allowed.
* Outstanding balances must be tracked separately.

---

## FIN-UI-011 Financial Statement

### Purpose

Provide finance summary and statements.

### Sections

```text
Fee Plan Summary
Enrollment Fee Summary
Outstanding Balance
Payment Summary
Refund Summary
Corporate Invoice Summary
```

---

# 7. Functional Requirements

## FR-FIN-001 Manage Fee Plans

The system shall allow authorized users to create, update, activate, deactivate, and archive fee plans.

## FR-FIN-002 Manage Installment Plans

The system shall allow authorized users to create and maintain installment plans for fee plans.

## FR-FIN-003 Create Fee Account

The system shall create an enrollment fee account from an enrollment and fee plan snapshot.

## FR-FIN-004 Record Payment

The system shall allow authorized users to record posted payments.

## FR-FIN-005 Generate Receipt

The system shall generate a receipt after payment posting.

## FR-FIN-006 Manage Discounts

The system shall allow authorized users to apply and manage discounts.

## FR-FIN-007 Request Refunds

The system shall allow authorized users to request refunds.

## FR-FIN-008 Approve Refunds

The system shall allow authorized users to approve or reject refunds.

## FR-FIN-009 Generate Corporate Invoices

The system shall allow authorized users to generate corporate invoices.

## FR-FIN-010 Track Outstanding Balances

The system shall calculate and display outstanding balances.

## FR-FIN-011 Evaluate Fee Clearance

The system shall evaluate fee clearance for completion and certificate eligibility.

## FR-FIN-012 Preserve Financial History

The system shall preserve historical fee plans, installment plans, payments, and receipts.

## FR-FIN-013 Finance Audit Trail

The system shall audit all finance actions.

---

# 8. Audit Events

The following audit events shall be supported:

```text
FeePlanCreated
FeePlanUpdated
FeePlanActivated
FeePlanDeactivated
FeePlanArchived
InstallmentPlanCreated
InstallmentPlanUpdated
EnrollmentFeeAccountCreated
EnrollmentFeeAccountRecalculated
PaymentRecorded
PaymentCancelled
ReceiptGenerated
ReceiptCancelled
DiscountApplied
DiscountApproved
RefundRequested
RefundApproved
RefundRejected
RefundProcessed
CorporateInvoiceCreated
CorporateInvoiceUpdated
CorporateInvoicePaid
FeeClearanceEvaluated
```

Rules:

* Finance actions must always be audited.
* Posted payments and issued receipts must remain historically visible.
* Audit records must capture actor, timestamp, amount, and reason where applicable.

---

# 9. Domain Errors

The module shall distinguish between validation and business-rule errors such as:

```text
FeePlanAlreadyExists
FeePlanInactive
FeePlanArchived
InstallmentTotalMismatch
EnrollmentFeeAccountAlreadyExists
PaymentExceedsOutstandingBalance
PaymentAlreadyPosted
ReceiptAlreadyIssued
ReceiptCancellationNotAllowed
DiscountApprovalRequired
DiscountExceededPolicy
RefundAmountExceedsPaidAmount
RefundAlreadyProcessed
CorporateInvoiceAlreadyExists
FeeClearanceNotMet
BranchInactive
CourseInactive
EnrollmentInactive
CorporateContractInactive
InvalidCurrency
```

---

# 10. Reporting and Operational Views

The Finance context shall support the following read views:

```text
Fee Plan Report
Installment Plan Report
Enrollment Fee Account Report
Payment Register
Receipt Register
Discount Report
Refund Report
Corporate Invoice Report
Outstanding Balance Report
Fee Clearance Report
```

These are read models and operational views, not separate owned entities.

---

# 11. FRD Improvement Notes

This module should remain the single source of truth for:

* fee plans
* installment plans
* fee account snapshots
* payments and receipts
* discounts and refunds
* corporate invoices
* fee clearance evaluation

It should not own course pricing, enrollment lifecycle, completion approval, or certificate issuance.
