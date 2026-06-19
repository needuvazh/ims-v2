# Functional Requirement Document (FRD)

## Module 9: Fee & Finance Management

**Version:** 1.0
**Module Code:** FIN

**Dependencies:**

* Student Management
* Enrollment Management
* Course & Batch Management
* Corporate Training Management

**Provides Data To:**

* Completion Management
* Certificate Management
* Reporting & Dashboards
* Corporate Billing
* Future Tally Integration

---

# 1. Business Purpose

Fee & Finance Management is responsible for managing student fees, corporate invoices, discounts, installment plans, payments, refunds, receipts, and outstanding balances.

The module shall support:

* Fee Plans
* Installment Plans
* Student Billing
* Corporate Billing
* Discounts
* Scholarships
* Refunds
* Receipts
* Outstanding Tracking
* Financial Reporting

---

# 2. Finance Architecture

## Individual Student

```text
Course
      ↓
Fee Plan
      ↓
Enrollment
      ↓
Fee Account
      ↓
Payment
      ↓
Receipt
```

---

## Corporate Training

```text
Corporate Contract
         ↓
Corporate Invoice
         ↓
Payment
         ↓
Receipt
```

---

# 3. Supported Currencies

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

Additional currencies configurable.

---

# 4. Supported Billing Models

## Student Billing

```text
One-Time Fee
Installments
Scholarship
Discounted Fee
```

---

## Corporate Billing

```text
Per Student
Per Batch
Per Hour
Fixed Contract Value
```

---

# 5. Finance Lifecycle

## Enrollment Fee Account

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

---

## Refund

```text
Requested
      ↓
Under Review
      ↓
Approved
      ↓
Processed
```

---

# 6. Screens

## FIN-UI-001 Fee Plan List

### Purpose

Manage course fee plans.

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
View Installments
```

### Permissions

```text
FEEPLAN_VIEW
FEEPLAN_CREATE
FEEPLAN_EDIT
FEEPLAN_ACTIVATE
```

---

# 7. Create Fee Plan

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
Status
```

---

### Business Rules

* Multiple fee plans allowed.
* One active fee plan per pricing combination.
* Historical fee plans must remain unchanged.

---

### Example

```text
IOSH Individual

Amount: 100 OMR

VAT: 5%

Total: 105 OMR
```

---

# 8. Installment Plan Management

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
```

---

### Example

```text
Admission Fee = 100 OMR

Installment 1 = 200 OMR

Installment 2 = 200 OMR
```

---

### Business Rules

* Total installment amount must equal fee plan total.
* Installment plans may vary by:

  * Branch
  * Course
  * Fee Plan

---

# 9. Enrollment Fee Account

## FIN-UI-004 Student Fee Account

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

---

### Status

```text
Pending
Partially Paid
Paid
Overdue
```

---

### Actions

```text
Record Payment
Apply Discount
Request Refund
Print Statement
```

---

# 10. Payment Management

## FIN-UI-005 Record Payment

### Fields

```text
Student
Enrollment
Payment Date
Payment Mode
Amount
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

---

### Actions

```text
Save
Generate Receipt
```

---

### Business Rules

* Payment cannot exceed outstanding balance.
* Payment automatically updates fee account.
* Receipt generated automatically.

---

# 11. Receipt Management

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

---

### Receipt Information

```text
Receipt Number
Receipt Date
Student
Amount
Currency
Payment Mode
```

---

### Actions

```text
Print
Download PDF
Email
```

---

### Business Rules

* Receipt Number must be unique.
* Receipt must be immutable after issuance.
* Cancelled receipt requires audit trail.

---

# 12. Discount Management

## FIN-UI-007 Discount Screen

### Discount Types

```text
Scholarship
Referral
Corporate
Early Bird
Manual Discount
```

---

### Discount Modes

```text
Fixed Amount
Percentage
```

---

### Fields

```text
Discount Type
Discount Mode
Discount Value
Reason
Approver
```

---

### Business Rules

* Discounts should reduce payable amount.
* Discount approval may be required.
* Discount history must be retained.

---

### Example

```text
Course Fee = 500 OMR

Scholarship = 20%

Discount = 100 OMR

Net Fee = 400 OMR
```

---

# 13. Refund Management

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

---

### Actions

```text
Submit
Cancel
```

---

### Business Rules

* Refund amount cannot exceed paid amount.
* Refund request requires approval workflow.
* Refund should not alter original payment records.

---

# 14. Refund Approval Workflow

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

---

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

---

### Business Rules

* Approval action audited.
* Rejection reason mandatory.

---

# 15. Corporate Billing

## FIN-UI-010 Corporate Invoice

### Invoice Types

```text
Advance Invoice
Milestone Invoice
Final Invoice
```

---

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

---

### Actions

```text
Generate Invoice
Print
Download PDF
Record Payment
```

---

### Business Rules

* Corporate invoices linked to contracts.
* Multiple invoices per contract allowed.
* Outstanding balances tracked separately.

---

# 16. Fee Clearance Engine

Fee Clearance determines eligibility for:

```text
Completion
Certificate Generation
```

---

### Rules

Example:

```text
Outstanding Amount = 0
```

Result:

```text
Fee Cleared
```

Else:

```text
Not Cleared
```

---

### Business Rules

Course completion rule may require:

```text
Fee Clearance = Mandatory
```

---

# 17. Student Financial Statement

## FIN-UI-011 Financial Statement

### Sections

```text
Fee Summary
Payments
Discounts
Refunds
Outstanding
```

---

### Actions

```text
Print
Export PDF
```

---

# 18. Student Portal Financial View

Students may view:

```text
Fee Summary
Installments
Payments
Receipts
Outstanding Balance
```

Read-only.

---

# 19. Functional Requirements

## FR-FIN-001 Fee Plan Management

The system shall support fee plan management.

---

## FR-FIN-002 Installment Plans

The system shall support installment schedules.

---

## FR-FIN-003 Fee Account Creation

The system shall automatically create fee accounts upon enrollment.

---

## FR-FIN-004 Payment Recording

The system shall support payment recording.

---

## FR-FIN-005 Receipt Generation

The system shall generate receipts automatically.

---

## FR-FIN-006 Discount Management

The system shall support discounts.

---

## FR-FIN-007 Refund Requests

The system shall support refunds.

---

## FR-FIN-008 Refund Approval Workflow

The system shall support refund approval workflows.

---

## FR-FIN-009 Corporate Billing

The system shall support corporate invoicing.

---

## FR-FIN-010 Outstanding Tracking

The system shall track outstanding balances.

---

## FR-FIN-011 Fee Clearance Validation

The system shall support fee clearance validation.

---

## FR-FIN-012 Multi-Currency Support

The system shall support multi-currency fee management.

---

# 20. Notifications

### Payment Received

Notify:

```text
Student
Accountant
```

---

### Installment Due

Notify:

```text
Student
Counselor
```

---

### Refund Requested

Notify:

```text
Finance Team
```

---

### Refund Approved

Notify:

```text
Student
Accountant
```

---

### Outstanding Balance Alert

Notify:

```text
Student
Counselor
```

---

# 21. Reports

## Operational Reports

```text
Daily Collection Report
Payment Register
Receipt Register
```

---

## Finance Reports

```text
Outstanding Fees Report
Fee Collection Report
Discount Report
Refund Report
```

---

## Corporate Reports

```text
Corporate Invoice Report
Corporate Collection Report
Contract Revenue Report
```

---

## Management Reports

```text
Revenue by Course
Revenue by Branch
Revenue by Department
Monthly Revenue Trend
```

---

# 22. Audit Requirements

Audit:

```text
Fee Plan Created
Fee Plan Updated
Payment Recorded
Receipt Generated
Discount Applied
Refund Requested
Refund Approved
Refund Rejected
```

Capture:

```text
User
Action
Timestamp
Old Value
New Value
Reason
```

---

# 23. Critical Design Decisions

### Ledger vs Simple Accounting

Phase 1:

```text
Operational Finance
```

Not:

```text
General Ledger Accounting
```

Reason:

Tally integration planned later.

---

### Immutable Receipts

Recommended:

```text
Receipts cannot be edited.
```

Only:

```text
Cancel + Reissue
```

---

### Historical Pricing Preservation

Payment calculations must use:

```text
Enrollment-Time Fee Snapshot
```

Not current fee plan.

---

# 24. Integration Points

### Consumes

```text
Enrollment
Corporate Training
Course Pricing
```

### Provides Data To

```text
Completion
Certificate
Reporting
Student Portal
Future Tally Integration
```
