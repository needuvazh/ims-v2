# Detailed API Contract Specification

## Module 9: Fee & Finance Management APIs

**Version:** 1.0
**Base URL:** `/api/v1`
**Module Code:** `FIN`

---

# 1. Module Purpose

Fee & Finance APIs manage operational finance for the IMS.

This module supports:

* Fee plans
* Course pricing reference
* Installment plans
* Enrollment fee accounts
* Payments
* Receipts
* Discounts
* Refunds
* Corporate invoices
* Fee clearance
* Student financial statements
* Finance reports

Phase 1 focuses on operational finance, not full general ledger accounting.

---

# 2. Security Requirements

All Finance APIs require authentication.

Protected APIs must enforce:

```text
Permission
Branch Scope
Finance Data Scope
Student Data Scope
Corporate Data Scope
Audit Logging
```

Finance actions must always be audited.

---

# 3. Fee Plan APIs

## 3.1 Get Fee Plans

```http
GET /api/v1/fee-plans
```

### Permission

```text
FEEPLAN_VIEW
```

### Query Parameters

```text
page
limit
search
branchId
courseId
currency
status
sortBy
sortOrder
```

---

## 3.2 Create Fee Plan

```http
POST /api/v1/fee-plans
```

### Permission

```text
FEEPLAN_CREATE
```

### Request

```json
{
  "courseId": "crs_001",
  "branchId": "br_001",
  "planName": "IOSH Standard Fee Plan",
  "totalAmount": 500,
  "currency": "OMR",
  "taxApplicable": true,
  "taxPercentage": 5,
  "status": "Active",
  "effectiveStartDate": "2026-06-19",
  "effectiveEndDate": null
}
```

### Success Response

```json
{
  "success": true,
  "message": "Fee plan created successfully",
  "data": {
    "feePlanId": "fp_001",
    "planName": "IOSH Standard Fee Plan",
    "totalAmount": 500,
    "currency": "OMR",
    "status": "Active"
  }
}
```

### Validations

```text
Course is required
Branch is required
Plan name is required
Total amount must be greater than or equal to zero
Currency is required
Tax percentage cannot be negative
Effective start date is required
```

### Business Rules

```text
Course must be active
Branch must be active
Only one active default fee plan per course and branch if default flag is used
Fee plan changes must not affect existing enrollment fee accounts
Historical fee plans must be preserved
```

### Audit

```text
FeePlanCreated
```

---

## 3.3 Get Fee Plan Details

```http
GET /api/v1/fee-plans/{feePlanId}
```

### Permission

```text
FEEPLAN_VIEW
```

---

## 3.4 Update Fee Plan

```http
PATCH /api/v1/fee-plans/{feePlanId}
```

### Permission

```text
FEEPLAN_EDIT
```

### Request

```json
{
  "planName": "IOSH Updated Fee Plan",
  "totalAmount": 550,
  "taxApplicable": true,
  "taxPercentage": 5,
  "status": "Active",
  "effectiveStartDate": "2026-06-19",
  "effectiveEndDate": null
}
```

### Business Rules

```text
If fee plan is already used by enrollment, update should create a new version or require authorized override
Existing enrollment fee snapshots must not change
```

---

## 3.5 Activate Fee Plan

```http
POST /api/v1/fee-plans/{feePlanId}/activate
```

### Permission

```text
FEEPLAN_ACTIVATE
```

---

## 3.6 Deactivate Fee Plan

```http
POST /api/v1/fee-plans/{feePlanId}/deactivate
```

### Permission

```text
FEEPLAN_DEACTIVATE
```

### Request

```json
{
  "reason": "Fee plan no longer applicable"
}
```

### Validations

```text
Reason is required
```

---

# 4. Installment Plan APIs

## 4.1 Get Installments for Fee Plan

```http
GET /api/v1/fee-plans/{feePlanId}/installments
```

### Permission

```text
INSTALLMENT_PLAN_VIEW
```

---

## 4.2 Create Installment Plan

```http
POST /api/v1/fee-plans/{feePlanId}/installments
```

### Permission

```text
INSTALLMENT_PLAN_CREATE
```

### Request

```json
{
  "installments": [
    {
      "installmentName": "Admission Fee",
      "dueDateOffsetDays": 0,
      "amount": 100,
      "displayOrder": 1
    },
    {
      "installmentName": "Installment 1",
      "dueDateOffsetDays": 30,
      "amount": 200,
      "displayOrder": 2
    },
    {
      "installmentName": "Installment 2",
      "dueDateOffsetDays": 60,
      "amount": 200,
      "displayOrder": 3
    }
  ]
}
```

### Validations

```text
At least one installment is required
Installment name is required
Amount must be greater than or equal to zero
Display order is required
Total installment amount must equal fee plan total amount unless authorized
```

### Business Rules

```text
Installment plan may be configured by branch and course through fee plan
Existing enrollment installment schedules should not change when fee plan installments change
```

### Audit

```text
InstallmentPlanCreated
```

---

## 4.3 Update Installment Plan

```http
PATCH /api/v1/fee-plans/{feePlanId}/installments
```

### Permission

```text
INSTALLMENT_PLAN_EDIT
```

### Business Rules

```text
If installment plan is already used, update should create a new version or require authorized override
```

---

# 5. Enrollment Fee Account APIs

## 5.1 Get Enrollment Fee Account

```http
GET /api/v1/enrollments/{enrollmentId}/fee-account
```

### Permission

```text
FEE_ACCOUNT_VIEW
```

### Response

```json
{
  "success": true,
  "data": {
    "feeAccountId": "efa_001",
    "enrollmentId": "enr_001",
    "studentId": "std_001",
    "studentName": "Ahmed Ali",
    "courseName": "IOSH Managing Safely",
    "totalFeeAmount": 500,
    "discountAmount": 50,
    "taxAmount": 22.5,
    "netPayableAmount": 472.5,
    "paidAmount": 200,
    "dueAmount": 272.5,
    "currency": "OMR",
    "status": "PartiallyPaid"
  }
}
```

---

## 5.2 Create Fee Account Manually

```http
POST /api/v1/enrollments/{enrollmentId}/fee-account
```

### Permission

```text
FEE_ACCOUNT_CREATE
```

### Request

```json
{
  "feePlanId": "fp_001",
  "remarks": "Manual fee account creation"
}
```

### Business Rules

```text
Normally fee account is created automatically during enrollment
Only one active fee account per enrollment
Fee account must snapshot fee plan, tax, discount, and installment structure
```

---

## 5.3 Recalculate Fee Account

```http
POST /api/v1/enrollments/{enrollmentId}/fee-account/recalculate
```

### Permission

```text
FEE_ACCOUNT_RECALCULATE
```

### Request

```json
{
  "reason": "Discount approved"
}
```

### Validations

```text
Reason is required
```

### Business Rules

```text
Recalculation must not mutate issued receipts
Payment records remain immutable
Recalculation must be audited
```

---

# 6. Payment APIs

## 6.1 Get Payments

```http
GET /api/v1/payments
```

### Permission

```text
PAYMENT_VIEW
```

### Query Parameters

```text
page
limit
studentId
enrollmentId
branchId
paymentMode
dateFrom
dateTo
status
sortBy
sortOrder
```

---

## 6.2 Record Enrollment Payment

```http
POST /api/v1/enrollments/{enrollmentId}/payments
```

### Permission

```text
PAYMENT_CREATE
```

### Request

```json
{
  "paymentDate": "2026-06-19",
  "paymentMode": "Cash",
  "amount": 100,
  "currency": "OMR",
  "referenceNumber": "CASH-001",
  "remarks": "Admission fee payment"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": {
    "paymentId": "pay_001",
    "paymentNumber": "PAY-2026-00001",
    "receiptId": "rcp_001",
    "receiptNumber": "REC-2026-00001",
    "amount": 100,
    "currency": "OMR",
    "feeAccountStatus": "PartiallyPaid"
  }
}
```

### Supported Payment Modes

```text
Cash
BankTransfer
Card
Cheque
OnlineTransfer
```

### Validations

```text
Payment date is required
Payment mode is required
Amount must be greater than zero
Currency is required
Reference number is required for non-cash payments
```

### Business Rules

```text
Payment cannot exceed due amount unless advance payment is enabled
Payment must update fee account paid and due amount
Payment must generate receipt automatically
Payment record must be immutable after posting
Payment action must be audited
```

### Events

```text
PaymentRecorded
ReceiptGenerated
FeeAccountUpdated
```

---

## 6.3 Get Payment Details

```http
GET /api/v1/payments/{paymentId}
```

### Permission

```text
PAYMENT_VIEW
```

---

## 6.4 Cancel Payment

```http
POST /api/v1/payments/{paymentId}/cancel
```

### Permission

```text
PAYMENT_CANCEL
```

### Request

```json
{
  "reason": "Payment entered incorrectly"
}
```

### Business Rules

```text
Payment cancellation requires permission
Issued receipt must be cancelled or reversed according to receipt rules
Cancellation must not delete original payment
Cancellation must be audited
```

---

# 7. Receipt APIs

## 7.1 Get Receipts

```http
GET /api/v1/receipts
```

### Permission

```text
RECEIPT_VIEW
```

### Query Parameters

```text
page
limit
studentId
enrollmentId
branchId
receiptType
dateFrom
dateTo
status
sortBy
sortOrder
```

---

## 7.2 Get Receipt Details

```http
GET /api/v1/receipts/{receiptId}
```

### Permission

```text
RECEIPT_VIEW
```

---

## 7.3 Download Receipt

```http
GET /api/v1/receipts/{receiptId}/download
```

### Permission

```text
RECEIPT_DOWNLOAD
```

### Business Rules

```text
Receipt download must be audited
Student portal users can download only their own receipts
```

---

## 7.4 Cancel Receipt

```http
POST /api/v1/receipts/{receiptId}/cancel
```

### Permission

```text
RECEIPT_CANCEL
```

### Request

```json
{
  "reason": "Receipt issued with incorrect amount"
}
```

### Validations

```text
Reason is required
```

### Business Rules

```text
Receipts are immutable after issuance
Cancellation preserves original receipt
Cancelled receipt must show cancelled status
New receipt may be reissued if required
```

---

# 8. Discount APIs

## 8.1 Apply Discount

```http
POST /api/v1/enrollments/{enrollmentId}/discounts
```

### Permission

```text
DISCOUNT_APPLY
```

### Request

```json
{
  "discountType": "Scholarship",
  "discountMode": "Percentage",
  "discountValue": 10,
  "reason": "Scholarship approved by management"
}
```

### Supported Discount Types

```text
Corporate
Scholarship
Referral
EarlyBird
Manual
```

### Supported Discount Modes

```text
FixedAmount
Percentage
```

### Business Rules

```text
Discount value must be valid
Discount cannot make payable amount negative
Discount approval may be required based on configuration
Approved discount must update fee account
Discount history must be retained
```

---

## 8.2 Get Enrollment Discounts

```http
GET /api/v1/enrollments/{enrollmentId}/discounts
```

### Permission

```text
DISCOUNT_VIEW
```

---

## 8.3 Approve Discount

```http
POST /api/v1/discounts/{discountId}/approve
```

### Permission

```text
DISCOUNT_APPROVE
```

### Request

```json
{
  "remarks": "Approved"
}
```

---

## 8.4 Reject Discount

```http
POST /api/v1/discounts/{discountId}/reject
```

### Permission

```text
DISCOUNT_REJECT
```

### Request

```json
{
  "reason": "Discount not eligible"
}
```

---

# 9. Refund APIs

## 9.1 Get Refunds

```http
GET /api/v1/refunds
```

### Permission

```text
REFUND_VIEW
```

### Query Parameters

```text
page
limit
studentId
enrollmentId
branchId
refundStatus
dateFrom
dateTo
```

---

## 9.2 Request Refund

```http
POST /api/v1/refunds
```

### Permission

```text
REFUND_REQUEST
```

### Request

```json
{
  "enrollmentId": "enr_001",
  "paymentId": "pay_001",
  "refundType": "Partial",
  "refundAmount": 50,
  "reason": "Student withdrew before course start"
}
```

### Supported Refund Types

```text
Full
Partial
```

### Validations

```text
Enrollment is required
Payment is required
Refund amount must be greater than zero
Reason is required
```

### Business Rules

```text
Refund amount cannot exceed paid amount
Refund request requires approval workflow
Refund must not alter original payment record
Refund status starts as Requested
```

### Event

```text
RefundRequested
```

---

## 9.3 Get Refund Details

```http
GET /api/v1/refunds/{refundId}
```

### Permission

```text
REFUND_VIEW
```

---

## 9.4 Approve Refund

```http
POST /api/v1/refunds/{refundId}/approve
```

### Permission

```text
REFUND_APPROVE
```

### Request

```json
{
  "remarks": "Refund approved"
}
```

### Business Rules

```text
Only pending refund can be approved
Approval must be audited
Approved refund can be processed
```

---

## 9.5 Reject Refund

```http
POST /api/v1/refunds/{refundId}/reject
```

### Permission

```text
REFUND_REJECT
```

### Request

```json
{
  "reason": "Refund not allowed after course start"
}
```

### Validations

```text
Reason is required
```

---

## 9.6 Process Refund

```http
POST /api/v1/refunds/{refundId}/process
```

### Permission

```text
REFUND_PROCESS
```

### Request

```json
{
  "processedDate": "2026-06-20",
  "paymentMode": "BankTransfer",
  "referenceNumber": "BANK-REF-001",
  "remarks": "Refund transferred"
}
```

### Business Rules

```text
Only approved refund can be processed
Processed refund updates fee account
Refund receipt generated if applicable
```

---

# 10. Corporate Invoice APIs

## 10.1 Get Corporate Invoices

```http
GET /api/v1/corporate/invoices
```

### Permission

```text
CORPORATE_INVOICE_VIEW
```

### Query Parameters

```text
corporateCustomerId
contractId
programId
invoiceStatus
dateFrom
dateTo
```

---

## 10.2 Create Corporate Invoice

```http
POST /api/v1/corporate/invoices
```

### Permission

```text
CORPORATE_INVOICE_CREATE
```

### Request

```json
{
  "corporateCustomerId": "corp_001",
  "contractId": "contract_001",
  "programId": "cprog_001",
  "invoiceType": "AdvanceInvoice",
  "invoiceDate": "2026-06-19",
  "amount": 2500,
  "currency": "OMR",
  "taxApplicable": true,
  "taxPercentage": 5,
  "dueDate": "2026-07-19",
  "remarks": "Advance invoice"
}
```

### Supported Invoice Types

```text
AdvanceInvoice
MilestoneInvoice
FinalInvoice
```

### Business Rules

```text
Invoice must be linked to corporate contract
Invoice number must be unique
Multiple invoices per contract allowed
Corporate outstanding balance must be tracked
```

---

## 10.3 Record Corporate Invoice Payment

```http
POST /api/v1/corporate/invoices/{invoiceId}/payments
```

### Permission

```text
CORPORATE_PAYMENT_CREATE
```

### Request

```json
{
  "paymentDate": "2026-06-25",
  "paymentMode": "BankTransfer",
  "amount": 1000,
  "currency": "OMR",
  "referenceNumber": "BANK-001",
  "remarks": "Partial corporate payment"
}
```

---

# 11. Fee Clearance APIs

## 11.1 Check Fee Clearance

```http
GET /api/v1/enrollments/{enrollmentId}/fee-clearance
```

### Permission

```text
FEE_CLEARANCE_VIEW
```

### Response

```json
{
  "success": true,
  "data": {
    "enrollmentId": "enr_001",
    "netPayableAmount": 500,
    "paidAmount": 500,
    "dueAmount": 0,
    "feeCleared": true
  }
}
```

---

## 11.2 Force Fee Clearance Override

```http
POST /api/v1/enrollments/{enrollmentId}/fee-clearance/override
```

### Permission

```text
FEE_CLEARANCE_OVERRIDE
```

### Request

```json
{
  "reason": "Management approved certificate before final settlement"
}
```

### Business Rules

```text
Override requires high-level permission
Override must be audited
Override should be visible in completion/certificate eligibility logs
```

---

# 12. Student Financial Statement APIs

## 12.1 Get Student Financial Statement

```http
GET /api/v1/students/{studentId}/financial-statement
```

### Permission

```text
STUDENT_FINANCE_VIEW
```

### Query Parameters

```text
enrollmentId
dateFrom
dateTo
```

---

## 12.2 Student Portal Fee View

```http
GET /api/v1/student-portal/me/fees
```

### Permission

```text
Authenticated Student
```

### Business Rules

```text
Student can view only own fee summary
Read-only access
```

---

## 12.3 Student Portal Receipts

```http
GET /api/v1/student-portal/me/receipts
```

### Permission

```text
Authenticated Student
```

---

# 13. Finance Dashboard APIs

## 13.1 Get Finance Dashboard

```http
GET /api/v1/finance/dashboard
```

### Permission

```text
FINANCE_DASHBOARD_VIEW
```

### Query Parameters

```text
branchId
dateFrom
dateTo
```

### Response

```json
{
  "success": true,
  "data": {
    "todayCollection": 1200,
    "monthlyCollection": 25000,
    "outstandingAmount": 8000,
    "pendingRefunds": 3,
    "corporateReceivables": 10000,
    "currency": "OMR"
  }
}
```

---

# 14. Business Error Examples

## Payment Exceeds Due

```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_EXCEEDS_DUE",
    "message": "Payment amount cannot exceed outstanding due amount"
  }
}
```

## Receipt Immutable

```json
{
  "success": false,
  "error": {
    "code": "RECEIPT_IMMUTABLE",
    "message": "Issued receipt cannot be edited"
  }
}
```

## Refund Exceeds Paid Amount

```json
{
  "success": false,
  "error": {
    "code": "REFUND_EXCEEDS_PAID_AMOUNT",
    "message": "Refund amount cannot exceed paid amount"
  }
}
```

---

# 15. Events Published

```text
FeePlanCreated
FeePlanUpdated
InstallmentPlanCreated
FeeAccountCreated
FeeAccountRecalculated
PaymentRecorded
ReceiptGenerated
PaymentCancelled
ReceiptCancelled
DiscountRequested
DiscountApproved
DiscountRejected
RefundRequested
RefundApproved
RefundRejected
RefundProcessed
CorporateInvoiceCreated
CorporatePaymentRecorded
FeeClearanceUpdated
FeeClearanceOverridden
```

---

# 16. Audit Requirements

Audit must capture:

```text
Fee plan create/update/activate/deactivate
Installment plan changes
Fee account creation/recalculation
Payment recording/cancellation
Receipt generation/cancellation/download
Discount application/approval/rejection
Refund request/approval/rejection/process
Corporate invoice/payment actions
Fee clearance override
```

---

# 17. Integration Points

Consumes:

```text
Enrollment
Student Management
Course Pricing
Corporate Training
Identity & Access
```

Provides data to:

```text
Completion
Certificate
Reports
Student Portal
Corporate Reports
Audit
Future Tally Integration
Payment Gateway Adapter
```

---
