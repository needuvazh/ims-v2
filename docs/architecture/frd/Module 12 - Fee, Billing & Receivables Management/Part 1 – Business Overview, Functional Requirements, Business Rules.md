# Part 1 – Business Overview, Functional Requirements, Business Rules

## Module 12 – Fee, Billing & Receivables Management

## 1. Business Overview

### 1.1 Introduction

Fee, Billing & Receivables Management is the authoritative finance bounded context for operational billing within ASTI IMS. It converts confirmed commercial obligations into invoices, records settlement through payments, creates receipts, manages installment schedules, controls refunds, maintains outstanding receivables, classifies aging, and validates corporate credit exposure.

The context is intentionally invoice-centric. A learner may reach ASTI through Regular admission, Walk-In fast track, Online registration, or Corporate nomination, but the learning lifecycle remains centered on Enrollment. Module 12 does not create an alternative finance learner model for each journey. Instead, it consumes a valid enrollment reference and commercial snapshot, then maintains the financial obligation linked back to the same enrollment.

The Course Catalog context owns price definitions, discount definitions, and the batch → branch → global course resolution hierarchy. Module 12 applies the resolved values when generating financial documents. This separation prevents Finance from becoming a second pricing-authority context while still requiring Finance to validate that totals are mathematically consistent and traceable.

The module also acts as the authoritative provider of payment-completion status. Completion and Certificate contexts may ask whether an enrollment has satisfied its required payment condition, but they must not infer payment completion from UI state, receipt existence, or duplicated balance data.

The design is implemented inside the modular monolith. Interactions may use direct application-service calls, internal domain-event dispatch, transactional hooks, or scheduled in-process jobs. An external message broker is not required by this FRD.

### 1.2 Business Benefits

1. **Single financial source of truth:** invoices, payments, receipts, refunds, and receivables are owned in one bounded context.
2. **Enrollment traceability:** every student training charge can be traced to the enrollment, course, batch, learner, and branch that originated it.
3. **Controlled collections:** payment recording is permission-controlled, branch-scoped, idempotent, auditable, and balance-validated.
4. **Improved cash visibility:** Finance can distinguish current, overdue, partially paid, and settled positions and analyze aging by student, corporate account, and branch.
5. **Corporate risk control:** enrollment can be blocked when configured credit exposure exceeds the corporate limit.
6. **Audit readiness:** finance state changes retain user, timestamp, old/new values, reason, and approval history.
7. **Operational flexibility:** installment plans and partial payments can be supported without losing invoice-level accounting clarity.
8. **Safer refunds:** refund requests require valid source transactions and approval before execution.
9. **Downstream consistency:** completion and certificate issuance consume authoritative payment validation rather than duplicated calculations.
10. **Localized operation:** Oman GST timezone and English/Arabic document presentation are supported as explicit business requirements.

## 2. Domain Ownership and Financial Concepts

### 2.1 Owned Entities

Module 12 owns:

- Invoice
- InvoiceLineItem
- InstallmentPlan
- Installment
- Payment
- Receipt
- Refund
- Receivable
- CorporateCreditRule
- finance-specific payment allocation and tax-breakdown value objects required to preserve transaction accuracy

### 2.2 Referenced but Not Owned

Module 12 references but does not own:

- Enrollment, StudentProfile, Admission: Admission & Enrollment context
- Course, CoursePricing, CourseDiscount: Course Catalog context
- Batch: Training Delivery context
- CorporateAccount, CorporateParticipant, CorporateContract: Corporate Training context
- Quotation and SalesOrder: Corporate Sales & Quotation context
- User, Permission, UserBranchAccess: Identity & Access context
- Institute, Branch: Organization context
- NumberingSeries, Payment Method lookup, currency and localized labels: Configuration context
- CourseCompletion and Certificate: downstream consuming contexts

## 3. Functional Requirements Specifications

### FR-FBR-001 – Create Student Invoice from Confirmed Enrollment

**Description and Actors**  
Creates a StudentInvoice for an eligible confirmed Regular, Walk-In, or Online enrollment. Primary actors are Finance Officer and authorized system workflow from Admission & Enrollment.

**Preconditions**

1. Actor has `finance.invoice.create`, or an authorized internal system workflow is invoking the operation.
2. Enrollment exists, is not soft-deleted, and is in a billable state: Confirmed or Active.
3. Enrollment has studentProfileId, courseId, batchId, branchId, currency context, resolvedPrice, resolvedDiscount, and finalAmount.
4. Enrollment branch is within the actor’s server-resolved branch access.
5. No active issued invoice already covers the same billing obligation unless the request explicitly represents an approved additional charge.
6. Commercial values have been resolved from Course Catalog hierarchy before invoice creation.

**Inputs**

- enrollmentId
- invoiceDate
- dueDate
- invoiceType = StudentInvoice unless a specifically authorized supported type is selected
- currency
- billing description in English
- billing description in Arabic when configured
- tax inputs approved for the transaction
- idempotency key

**Processing Steps**

1. Authenticate actor and resolve permissions and branch scope.
2. Load Enrollment through the Admission & Enrollment application boundary.
3. Verify enrollment billable state and mandatory relationships.
4. Validate that enrollment branch is authorized.
5. Load authoritative course and batch references for description and traceability.
6. Read the enrollment commercial snapshot: resolvedPrice, resolvedDiscount, finalAmount, and pricing source.
7. Reject negative price, negative discount, discount greater than gross charge, or negative final amount.
8. Calculate line gross amount as quantity × unitPrice using fixed-precision decimal arithmetic.
9. Calculate line net-before-tax as line gross amount − discountAmount.
10. Calculate taxAmount from approved tax inputs and configured rounding policy.
11. Calculate lineTotal = line net-before-tax + taxAmount.
12. Reconcile calculated amount against the enrollment commercial snapshot according to the configured interpretation of whether `finalAmount` is tax-exclusive or tax-inclusive. The interpretation must be explicit in configuration and identical for invoice calculation and rendering.
13. Create Invoice in Draft state.
14. Create InvoiceLineItem linked to invoiceId, enrollmentId, and courseId.
15. Set subtotal, discountAmount, taxAmount, totalAmount, paidAmount = 0, and outstandingAmount = totalAmount.
16. Generate invoice number through FR-FBR-004 when the invoice is issued.
17. Create or update Receivable through FR-FBR-012 when issued.
18. Record audit data and internal InvoiceGenerated event after successful issue.

**Outputs and Postconditions**

- Draft or Issued Invoice according to authorized operation.
- One or more validated InvoiceLineItem records.
- Unique invoice number for issued invoice.
- Open receivable equal to invoice outstanding amount.
- Audit log entry.
- Enrollment-to-invoice traceability.

**Priority:** Must

---

### FR-FBR-002 – Create Corporate or Consolidated Corporate Invoice

**Description and Actors**  
Creates a CorporateInvoice for one or more eligible corporate enrollments. Primary actors are Finance Officer, Finance Manager, and authorized corporate-billing workflow.

**Preconditions**

1. Actor has `finance.invoice.create`.
2. CorporateAccount exists and is active.
3. Each included enrollment is valid, corporate-linked, billable, and traceable to CorporateParticipant and CorporateAccount.
4. Cross-branch consolidation is permitted only when actor has consolidated finance authority and the corporate billing rule permits consolidation.
5. An enrollment billing obligation cannot be invoiced twice unless a supported additional-charge or correction flow explicitly authorizes it.

**Inputs**

- corporateAccountId
- enrollmentIds[]
- invoiceDate
- dueDate
- currency
- invoiceType = CorporateInvoice, MilestoneInvoice, or FinalInvoice as supported by commercial flow
- contractId when applicable
- quotationId or salesOrderId when applicable
- tax inputs
- billing description
- idempotency key

**Processing Steps**

1. Authenticate actor and authorize invoice creation.
2. Load CorporateAccount and referenced enrollments.
3. Verify every enrollment belongs to the specified corporate account.
4. Verify each enrollment has course, batch, branch, corporate participant, and resolved commercial snapshot.
5. Verify currency consistency. A single invoice cannot combine line items with different currencies.
6. Resolve whether billing is allowed by contract terms and billing-cycle data supplied by Corporate Training.
7. For every enrollment, calculate and validate line gross, discount, tax, and line total.
8. Preserve enrollmentId and courseId on each InvoiceLineItem.
9. Preserve source branch identity for authorization and reporting even where invoice header represents consolidated corporate billing.
10. Compute subtotal as the sum of pre-discount line gross amounts.
11. Compute invoice discountAmount as sum of line discounts plus only explicitly approved invoice-level discount adjustments.
12. Compute taxAmount as the sum of line tax amounts.
13. Compute totalAmount = subtotal − discountAmount + taxAmount.
14. Set paidAmount = 0 and outstandingAmount = totalAmount.
15. Issue invoice number atomically.
16. Create receivable linked to corporateAccountId.
17. Audit invoice creation and emit InvoiceGenerated internally.

**Outputs and Postconditions**

- Corporate invoice with line-level enrollment traceability.
- Receivable linked to CorporateAccount.
- Accurate branch-source information for consolidated reporting.
- Audit entry and internal event.

**Priority:** Must

---

### FR-FBR-003 – Validate Invoice Monetary Totals

**Description and Actors**  
Provides deterministic server-side monetary validation for all invoice creation and authorized recalculation operations. Actors are Finance application services and Finance Officers indirectly.

**Preconditions**

1. Invoice request contains at least one valid line item.
2. Currency is known and configured.
3. Tax inputs, if applicable, are valid for the transaction.

**Inputs**

For each line:

- quantity
- unitPrice
- discountAmount
- tax basis
- tax rate or authoritative tax amount input as approved by ASTI policy

Invoice-level inputs:

- currency
- approved invoice-level discount, when permitted

**Processing Steps**

1. Convert all monetary inputs to fixed-precision decimal values.
2. Reject quantity <= 0.
3. Reject unitPrice < 0.
4. Reject discountAmount < 0.
5. Calculate gross = quantity × unitPrice.
6. Reject line discountAmount > gross unless a separately modeled credit adjustment is used.
7. Calculate taxableBase according to configured tax policy.
8. Calculate tax using configured rate and rounding policy.
9. Calculate lineTotal.
10. Sum gross values into subtotal.
11. Sum discounts into discountAmount.
12. Sum tax values into taxAmount.
13. Calculate totalAmount = subtotal − discountAmount + taxAmount.
14. Enforce paidAmount >= 0.
15. Enforce outstandingAmount = totalAmount − effective non-refunded payments.
16. Reject negative outstandingAmount unless an explicit advance-credit model is used; the current invoice settlement flow must prevent accidental overpayment.

**Outputs and Postconditions**

- Validated monetary totals or a structured validation error.
- No persistence occurs when validation fails.

**Priority:** Must

---

### FR-FBR-004 – Generate Unique Invoice Number

**Description and Actors**  
Generates an invoice number using the configured NumberingSeries. Actor is the Finance application service.

**Preconditions**

1. Invoice is ready for issue.
2. Active NumberingSeries exists for invoice entity type and required branch/global scope.

**Inputs**

- entityType = Invoice
- branchId
- invoiceDate in GST
- numbering-series configuration: prefix, suffix, yearFormat, nextNumber, paddingLength

**Processing Steps**

1. Select the most specific active numbering series allowed by configuration.
2. Lock or atomically increment the series counter inside the issue transaction.
3. Build number from prefix, formatted year, zero-padded sequence, and suffix.
4. Verify uniqueness against existing Invoice.invoiceNumber.
5. Persist incremented nextNumber and assigned invoiceNumber atomically.
6. On transaction rollback, prevent committed counter/invoice mismatch according to the database sequence strategy used.

**Outputs and Postconditions**

- Unique invoiceNumber.
- Updated NumberingSeries counter.
- Auditability of invoice issue.

**Priority:** Must

---

### FR-FBR-005 – Search and View Invoices

**Description and Actors**  
Allows authorized users to search and inspect invoices under branch scope. Actors include Finance Officer, Finance Manager, Branch Manager, Auditor, and authorized operational viewers.

**Preconditions**

1. User is authenticated.
2. User has `finance.invoice.read`.

**Inputs**

Optional filters:

- invoiceNumber
- invoiceType
- status
- studentProfileId
- corporateAccountId
- enrollmentId
- branchId
- invoiceDateFrom
- invoiceDateTo
- dueDateFrom
- dueDateTo
- outstandingOnly
- overdueOnly
- page
- pageSize
- sortField
- sortDirection

**Processing Steps**

1. Resolve permitted branch IDs server-side.
2. Intersect requested branch filters with authorized branch IDs.
3. Reject unauthorized explicit branch request.
4. Apply indexed filters.
5. Apply stable sort with id as deterministic tiebreaker.
6. Enforce bounded page size.
7. Return totals only for the authorized query scope.
8. For detail view, load invoice lines, payment summary, receipt references, refund summary, and receivable position.

**Outputs and Postconditions**

- Paginated authorized invoice result.
- Detailed invoice view when requested.
- No data leakage across branches.

**Priority:** Must

---

### FR-FBR-006 – Create Installment Plan

**Description and Actors**  
Creates a payment schedule for an eligible invoice and enrollment. Actors are Finance Officer and Finance Manager.

**Preconditions**

1. Actor has `finance.installment.create`.
2. Invoice exists, is issued, is not cancelled, and has positive outstanding balance.
3. Enrollment and invoice relationship is valid.
4. No active incompatible installment plan exists for the same invoice unless explicitly superseded by an authorized process.

**Inputs**

- invoiceId
- enrollmentId
- planName
- numberOfInstallments
- schedule entries containing sequenceNumber, dueDate, amount

**Processing Steps**

1. Authorize actor and branch.
2. Load invoice and outstanding balance.
3. Require numberOfInstallments > 0.
4. Require exact number of schedule entries equal to numberOfInstallments.
5. Require unique contiguous sequence numbers starting at 1.
6. Require every installment amount > 0.
7. Require due dates to be non-decreasing by sequence.
8. Sum installment amounts using decimal-safe arithmetic.
9. Require schedule total to equal the amount governed by the plan; for a new unpaid invoice this is normally invoice total, while a plan created after an authorized partial payment must equal the remaining outstanding amount and record the plan basis explicitly.
10. Create InstallmentPlan and Installment records atomically.
11. Set each installment initial paidAmount = 0 and derived status according to due date and balance.
12. Audit plan creation.

**Outputs and Postconditions**

- Active InstallmentPlan.
- Complete ordered installment schedule.
- No mismatch between plan amount and governed invoice obligation.

**Priority:** Must

---

### FR-FBR-007 – Maintain Installment Settlement Status

**Description and Actors**  
Updates installment payment balances and due status from payment allocations. Actor is the Finance application service.

**Preconditions**

1. Active installment plan exists.
2. Payment has been successfully posted.

**Inputs**

- paymentId
- paymentAmount
- invoiceId
- installment allocation instruction or configured oldest-due-first allocation policy
- business date in GST

**Processing Steps**

1. Load open installments ordered by dueDate then sequenceNumber.
2. Allocate payment according to explicit allocation input when valid; otherwise use oldest-due-first.
3. Never allocate more than the installment remaining amount.
4. Update installment paidAmount.
5. Derive status:
   - Paid when paidAmount = amount.
   - Partial when 0 < paidAmount < amount and due date has not passed.
   - Overdue when remaining amount > 0 and business date is after dueDate.
   - Due when remaining amount > 0 and business date equals dueDate.
   - Scheduled when due date is in future and paidAmount = 0.
6. Preserve allocation traceability.
7. Reconcile sum of installment allocations with payment allocation to invoice.

**Outputs and Postconditions**

- Updated installment balances and status.
- Reconciled payment allocation.

**Priority:** Must

---

### FR-FBR-008 – Record Manual Payment

**Description and Actors**  
Records an authorized manual payment and settles all or part of an invoice. Actors are Cashier, Finance Officer, and Finance Manager.

**Preconditions**

1. Actor has `finance.payment.record`.
2. Invoice exists, is issued, is not cancelled, and has positive outstanding amount.
3. Actor has access to invoice branch.
4. Payment method is active and allowed.
5. Idempotency key has not already produced a different payment request.

**Inputs**

- invoiceId
- paymentDate
- paymentMethod: Cash, Bank Transfer, Card, Cheque, or Corporate Billing
- amount
- referenceNumber when required
- remarks
- installment allocation input when applicable
- idempotency key

**Processing Steps**

1. Authenticate and authorize actor.
2. Resolve branch access.
3. Load and lock or version-check invoice.
4. Validate payment date according to allowed backdating policy and GST business date.
5. Validate amount > 0.
6. Validate amount <= invoice outstandingAmount for ordinary invoice settlement.
7. Require referenceNumber for Bank Transfer, Card, and Cheque methods unless approved configuration states an alternate mandatory reference field.
8. Reject Online method for manual posting when automated gateway integration is not enabled; an authorized finance reconciliation flow may represent externally confirmed online settlement only when separately configured.
9. Create Payment with unique paymentNumber.
10. Set studentProfileId or corporateAccountId consistently with invoice debtor.
11. Set receivedBy to authenticated actor.
12. Allocate payment to invoice and installments as applicable.
13. Recalculate invoice paidAmount and outstandingAmount.
14. Update invoice status according to FR-FBR-030.
15. Update Receivable.
16. Create Receipt through FR-FBR-010.
17. Persist audit entry.
18. Emit internal PaymentRecorded and ReceiptGenerated events after successful transaction.

**Outputs and Postconditions**

- Payment record.
- Updated invoice balance.
- Updated receivable.
- Updated installment allocation when applicable.
- Receipt.
- Audit entry.

**Priority:** Must

---

### FR-FBR-009 – Validate Payment Request

**Description and Actors**  
Performs mandatory payment safety checks before posting. Actor is the Finance application service.

**Preconditions**

- Payment request received for an existing invoice.

**Inputs**

- actor
- invoice
- method
- amount
- date
- referenceNumber
- idempotency key

**Processing Steps**

1. Verify permission.
2. Verify branch scope.
3. Verify invoice state accepts payment.
4. Verify positive outstanding balance.
5. Verify amount precision matches currency rules.
6. Verify amount is positive.
7. Prevent amount greater than outstanding balance in ordinary settlement.
8. Validate method is active.
9. Validate method-specific reference requirements.
10. Validate idempotency key.
11. Check duplicate business signature using invoiceId, amount, paymentDate, method, and referenceNumber as a secondary warning/control.
12. Re-read current invoice version immediately before persistence.
13. Reject on optimistic-lock conflict and require caller to reload balance.

**Outputs and Postconditions**

- Payment may proceed, or structured validation/conflict response.

**Priority:** Must

---

### FR-FBR-010 – Generate and Retrieve Receipt

**Description and Actors**  
Creates the authoritative receipt for a successful payment and allows authorized retrieval or rendering. Actors are Finance Officer, Cashier, Finance Manager, Auditor, and system rendering service.

**Preconditions**

1. Successful Payment exists.
2. Payment is not failed or voided.
3. No authoritative receipt already exists for the payment.

**Inputs**

- paymentId
- receiptDate
- language: en or ar where rendering choice is supported
- institute and branch presentation data

**Processing Steps**

1. Verify payment validity.
2. Generate receipt number through active Receipt NumberingSeries.
3. Create Receipt with paymentId, receiptDate, amount, issuedBy, and document reference.
4. Verify receipt amount equals payment amount.
5. Render approved invoice/receipt information using English or Arabic labels as selected.
6. Store the generated document reference according to document-storage design.
7. Re-rendering or re-downloading must not create a second Receipt record or new receipt number.
8. Log controlled reprint/download action when policy requires.

**Outputs and Postconditions**

- Exactly one authoritative Receipt record per Payment.
- Bilingual-capable receipt representation.
- Stable receiptNumber.

**Priority:** Must

---

### FR-FBR-011 – Support Partial Payment and Atomic Balance Update

**Description and Actors**  
Supports settlement below the total outstanding amount while keeping invoice and receivable balances consistent. Actors are authorized payment recorders.

**Preconditions**

- FR-FBR-008 and FR-FBR-009 pass.

**Inputs**

- invoiceId
- validated payment amount

**Processing Steps**

1. Calculate newPaidAmount = previous paidAmount + effective payment amount.
2. Calculate newOutstandingAmount = totalAmount − effective non-refunded payments.
3. If newOutstandingAmount > 0, set invoice to PartiallyPaid when at least one successful payment exists.
4. If newOutstandingAmount = 0, set invoice to Paid.
5. Update Receivable outstanding amount to match invoice outstanding amount.
6. Close Receivable when outstanding is zero.
7. Apply installment allocations when plan exists.
8. Persist Payment, invoice balance, installment allocation, Receivable, Receipt, and audit records in one transaction.

**Outputs and Postconditions**

- Accurate partial-payment position.
- No temporary inconsistent balance visible after commit.

**Priority:** Must

---

### FR-FBR-012 – Create and Maintain Receivable

**Description and Actors**  
Maintains the open obligation for issued invoices. Actors are Finance application services and Finance users as readers.

**Preconditions**

1. Invoice is issued.
2. Invoice total is greater than zero or has an open balance requiring tracking.

**Inputs**

- invoiceId
- corporateAccountId or studentProfileId
- dueDate
- outstandingAmount
- business date

**Processing Steps**

1. Enforce exactly one debtor dimension appropriate to invoice: studentProfileId or corporateAccountId, unless an explicitly modeled approved edge case exists.
2. Create Receivable for invoice if none exists.
3. Set dueDate from invoice dueDate.
4. Set outstandingAmount equal to invoice outstandingAmount.
5. Determine aging bucket through FR-FBR-013.
6. Derive status as Open, Overdue, or Closed.
7. Update atomically whenever effective payment or executed refund changes invoice balance.
8. Prevent manual balance editing independent of invoice/payment/refund transactions.

**Outputs and Postconditions**

- One authoritative receivable position per invoice obligation.
- Balance agrees with Invoice.outstandingAmount.

**Priority:** Must

---

### FR-FBR-013 – Calculate Receivables Aging

**Description and Actors**  
Classifies open receivables by elapsed days from due date using Oman GST business date. Actors are scheduled application job, Finance users, and reporting consumers.

**Preconditions**

- Receivable exists and outstandingAmount > 0.

**Inputs**

- dueDate
- current business date in Asia/Muscat / UTC+4 business context
- outstandingAmount

**Processing Steps**

1. Compute daysPastDue = businessDate − dueDate in whole business calendar dates using GST timezone boundary.
2. Assign `Current` when daysPastDue <= 0.
3. Assign `30 Days` when daysPastDue is 1 through 30.
4. Assign `60 Days` when daysPastDue is 31 through 60.
5. Assign `90 Days` when daysPastDue is 61 through 90.
6. Assign `120+ Days` when daysPastDue >= 91, because the ER model defines the terminal bucket label `120+ Days` without an intermediate 91–119 bucket. This naming should be preserved for compatibility, while dashboards should clearly document the implemented range. A future approved data-model revision may introduce a separate `91–120` or `120+` mathematical boundary, but this FRD must not silently invent a new enum value.
7. Set Receivable status to Overdue when daysPastDue > 0 and outstandingAmount > 0.
8. Recalculate at least daily and immediately after due-date correction or balance-changing transaction.

**Outputs and Postconditions**

- Updated agingBucket and receivable status.
- Aggregatable aging totals.

**Priority:** Must

---

### FR-FBR-014 – Submit Refund Request

**Description and Actors**  
Creates a refund request against a valid invoice and payment. Actors are Finance Officer and other explicitly authorized users.

**Preconditions**

1. Actor has `finance.refund.request`.
2. Invoice exists and is not soft-deleted.
3. Payment exists, is successful, and belongs to the invoice.
4. Requested refundable amount does not exceed payment amount minus previously executed refunds tied to that payment.
5. Required reason is supplied.

**Inputs**

- invoiceId
- paymentId
- refundType: Full or Partial
- amount
- reason
- idempotency key

**Processing Steps**

1. Authorize actor and branch.
2. Load invoice, payment, and existing refunds.
3. Calculate refundableBalance = payment.amount − sum(executed refund amounts for payment).
4. Require amount > 0.
5. Require amount <= refundableBalance.
6. For Full refund, require amount = refundableBalance.
7. For Partial refund, require amount < refundableBalance unless configuration allows the final residual refund to use Partial classification; default behavior is to require Full for exact remaining balance.
8. Create Refund with status Requested and requestedBy actor.
9. Create ApprovalRequest of type Refund.
10. Audit request creation.
11. Emit internal RefundRequested event.

**Outputs and Postconditions**

- Refund record in Requested state.
- ApprovalRequest linked to refund.
- No financial balance change until approved refund is executed.

**Priority:** Must

---

### FR-FBR-015 – Approve or Reject Refund

**Description and Actors**  
Controls refund decision workflow. Primary actor is Finance Manager or other user with `finance.refund.approve`.

**Preconditions**

1. Refund status is Requested or UnderReview.
2. Actor has approval permission and branch access.
3. Actor is eligible under approval policy.

**Inputs**

- refundId
- decision: Approve or Reject
- remarks
- expected version

**Processing Steps**

1. Authenticate and authorize approver.
2. Load latest refund and approval request.
3. Check optimistic-lock version.
4. Recalculate current refundable balance to prevent stale approval.
5. If approving, ensure refund amount still <= refundable balance.
6. Record approvedBy and approvedAt for approval.
7. Transition status to Approved on approval or Rejected on rejection.
8. Write ApprovalHistory.
9. Write finance AuditLog.
10. Emit RefundApproved or corresponding rejection event internally.

**Outputs and Postconditions**

- Approved or Rejected refund decision.
- Immutable approval history.
- Financial balances remain unchanged until execution.

**Priority:** Must

---

### FR-FBR-016 – Execute Approved Refund Financial Effect

**Description and Actors**  
Marks an approved refund as executed after authorized settlement and updates invoice and receivable positions without altering original payment history. Actor is Finance Manager or authorized refund executor.

**Preconditions**

1. Refund status is Approved.
2. Actor has `finance.refund.execute`.
3. Refund has not already been executed.
4. Execution reference is supplied where required by settlement method.

**Inputs**

- refundId
- executionDate
- executionReference
- remarks
- idempotency key

**Processing Steps**

1. Authorize actor and branch.
2. Validate idempotency.
3. Reload invoice, payment, and refund totals.
4. Ensure executing refund will not exceed refundable balance.
5. Mark refund Executed with execution metadata supported by implementation schema.
6. Preserve original Payment amount and Payment record unchanged.
7. Recalculate effectivePaidAmount = sum(successful payments) − sum(executed refunds).
8. Set invoice paidAmount to effectivePaidAmount.
9. Set outstandingAmount = totalAmount − effectivePaidAmount, bounded at the valid invoice obligation.
10. Reopen or update Receivable when refund causes a previously paid invoice to have outstanding balance.
11. Recalculate invoice status.
12. Audit execution.
13. Emit finance event representing completed refund effect.

**Outputs and Postconditions**

- Executed refund record.
- Original payment remains immutable.
- Invoice and receivable reflect net settlement position.

**Priority:** Must

---

### FR-FBR-017 – Configure Effective-Dated Corporate Credit Rule

**Description and Actors**  
Creates or supersedes a CorporateCreditRule for a corporate account. Actor is Finance Manager or authorized credit controller.

**Preconditions**

1. Actor has `finance.credit.manage`.
2. CorporateAccount exists and is active.
3. Actor is authorized for the relevant corporate-account/branch operational scope.

**Inputs**

- corporateAccountId
- creditLimit
- blockOnCreditLimit
- effectiveStartDate
- effectiveEndDate optional
- reason

**Processing Steps**

1. Validate creditLimit >= 0.
2. Validate effectiveEndDate is null or >= effectiveStartDate.
3. Reject overlapping active effective periods for the same corporate account unless the operation is a controlled supersession.
4. On supersession, close prior rule effectiveEndDate immediately before new rule effectiveStartDate according to date/time granularity policy.
5. Calculate currentOutstanding from open corporate receivables.
6. Calculate committedAmount from approved/confirmed corporate enrollment obligations not yet included in outstanding invoiced exposure, according to the current implementation boundary.
7. Calculate availableCredit = creditLimit − currentOutstanding − committedAmount.
8. Persist the new rule version without deleting history.
9. Audit old and new values and reason.

**Outputs and Postconditions**

- Active effective-dated CorporateCreditRule.
- Historical rules retained.

**Priority:** Must

---

### FR-FBR-018 – Validate Corporate Credit During Enrollment

**Description and Actors**  
Returns authoritative credit-validation outcome for corporate enrollment or bulk enrollment. Actors are Admission & Enrollment system workflow, Corporate Training workflow, and Finance application service.

**Preconditions**

1. CorporateAccount and enrollment commercial amount are known.
2. Applicable credit rule can be resolved by effective date.

**Inputs**

- corporateAccountId
- proposedEnrollmentValue
- validationDate
- enrollmentId or bulk operation correlationId

**Processing Steps**

1. Load effective CorporateCreditRule for validationDate.
2. Recalculate or read transactionally reliable currentOutstanding.
3. Determine committedAmount excluding the same request if retrying idempotently.
4. Calculate projectedExposure = currentOutstanding + committedAmount + proposedEnrollmentValue.
5. Calculate projectedAvailableCredit = creditLimit − projectedExposure.
6. If projectedExposure <= creditLimit, return `Allowed`.
7. If projectedExposure > creditLimit and blockOnCreditLimit = true, return `Blocked` with machine-readable credit-limit reason.
8. If projectedExposure > creditLimit and blockOnCreditLimit = false, return `AllowedWithWarning` and exposure details allowed by caller permission.
9. Persist validation result or audit evidence required for traceability.
10. Ensure retry of the same correlation does not double-count proposed commitment.

**Outputs and Postconditions**

- Allowed, AllowedWithWarning, or Blocked result.
- Exposure snapshot for authorized consuming workflow.

**Priority:** Must

---

### FR-FBR-019 – Calculate Corporate Credit Exposure

**Description and Actors**  
Calculates current outstanding, committed amount, and available credit. Actors are Finance Manager, Corporate Account Manager with read access, and enrollment validation workflow.

**Preconditions**

- CorporateAccount exists.

**Inputs**

- corporateAccountId
- asOfDate

**Processing Steps**

1. Sum outstandingAmount for open Receivable records belonging to the corporate account as currentOutstanding.
2. Sum eligible confirmed or approved uninvoiced corporate obligations as committedAmount, excluding cancelled or dropped enrollments and avoiding amounts already represented in outstanding receivables.
3. Resolve effective creditLimit.
4. Calculate availableCredit = creditLimit − currentOutstanding − committedAmount.
5. Record lastCalculatedAt.
6. Return negative availableCredit when exposure exceeds limit; do not clamp to zero because negative value is meaningful for monitoring.

**Outputs and Postconditions**

- creditLimit
- currentOutstanding
- committedAmount
- availableCredit
- lastCalculatedAt

**Priority:** Must

---

### FR-FBR-020 – Provide Enrollment Payment Validation Status

**Description and Actors**  
Provides the authoritative payment-completion result used by Completion and Certificate contexts. Actors are Exam & Completion service and Certificate service.

**Preconditions**

1. enrollmentId exists.
2. Caller is an authorized internal module consumer.

**Inputs**

- enrollmentId
- asOfTimestamp

**Processing Steps**

1. Load all active financial obligations linked to enrollment through InvoiceLineItem and invoice relationships.
2. Exclude cancelled or invalidated invoices according to invoice state rules.
3. Calculate total required obligation.
4. Calculate effective settlement as successful payments allocated to those obligations minus executed refunds.
5. Determine outstanding amount.
6. If enrollment payment validation is not required, return `NotRequired`.
7. If required and outstanding amount = 0, return `Passed`.
8. If required and outstanding amount > 0, return `Failed` with outstanding amount and currency only to authorized internal consumers.
9. Do not infer Passed merely from receipt existence.

**Outputs and Postconditions**

- `NotRequired`, `Passed`, or `Failed`.
- authoritative outstanding amount when permitted.

**Priority:** Must

---

### FR-FBR-021 – Provide Branch Finance Summaries

**Description and Actors**  
Provides branch-scoped operational summaries for collection and receivables monitoring. Actors are Finance Officer, Finance Manager, Branch Manager, Auditor, and authorized report consumers.

**Preconditions**

1. User has relevant finance report/read permission.
2. Branch scope is resolved server-side.

**Inputs**

- branchId or authorized branch set
- periodStart
- periodEnd
- optional invoiceType
- optional customer type

**Processing Steps**

1. Resolve authorized branch scope.
2. Aggregate invoiced amount by invoiceDate within period.
3. Aggregate payments by paymentDate within period.
4. Aggregate executed refunds by execution date within period.
5. Calculate net collection = payments − executed refunds for the reporting period, while keeping gross collection and refund amounts separately visible.
6. Aggregate current outstanding from open receivables.
7. Aggregate overdue outstanding.
8. Aggregate aging buckets.
9. Keep currency dimensions separate; do not add monetary values across currencies without an approved exchange-rate policy, which is outside this module’s current scope.

**Outputs and Postconditions**

- Branch financial summary dataset.
- Currency-safe aggregates.

**Priority:** Must

---

### FR-FBR-022 – Provide Consolidated Finance View

**Description and Actors**  
Provides multi-branch summaries only to explicitly authorized users. Actors are Finance Manager, Executive Viewer, and Auditor with required access.

**Preconditions**

1. User has `finance.report.consolidated`.
2. UserBranchAccess permits the selected branch set or parent/child hierarchy.

**Inputs**

- branchIds or hierarchy root
- date range
- requested metrics

**Processing Steps**

1. Resolve eligible branch set from IAM and Organization hierarchy.
2. Intersect requested branch set with eligible branches.
3. Deny access if requested scope contains unauthorized branch.
4. Run aggregation using only eligible branches.
5. Preserve branch dimension for drill-down where permission allows.
6. Preserve currency dimension.
7. Audit export separately if data is exported.

**Outputs and Postconditions**

- Authorized consolidated view.
- No implicit access granted based solely on a role name or UI route.

**Priority:** Must

---

### FR-FBR-023 – Export Authorized Finance Data

**Description and Actors**  
Exports invoice, payment, refund, or receivable datasets for authorized operational or audit use. Actors are users with `finance.export` plus corresponding read permission.

**Preconditions**

1. User has export permission.
2. User has read permission for exported entity type.
3. Export filters and branch scope are valid.

**Inputs**

- dataset type
- filters
- selected columns from approved export schema
- language preference

**Processing Steps**

1. Resolve branch scope server-side.
2. Validate filter bounds and date range.
3. Apply the same security predicates as screen queries.
4. Exclude restricted internal fields not part of approved export schema.
5. Generate bounded export synchronously only for safe data sizes; larger export operational design may use the existing jobs infrastructure inside the modular monolith without introducing an external broker requirement.
6. Audit actor, time, dataset, filters, branch scope, and exported row count.

**Outputs and Postconditions**

- Authorized export file or controlled export job result according to implementation size boundary.
- Audit entry.

**Priority:** Should

---

### FR-FBR-024 – Publish Internal Finance Domain Events

**Description and Actors**  
Makes significant finance state changes observable to other modules within the modular monolith. Actor is Finance domain/application layer.

**Preconditions**

- Corresponding transaction has committed successfully.

**Inputs**

Event data appropriate to:

- InvoiceGenerated
- PaymentRecorded
- ReceiptGenerated
- InstallmentDue
- InvoiceOverdue
- RefundRequested
- RefundApproved
- CorporateCreditValidationPassed
- CorporateCreditValidationFailed

**Processing Steps**

1. Build event payload using stable identifiers and minimal required business data.
2. Ensure event is emitted only after successful transaction outcome or through a transactionally safe internal mechanism.
3. Prevent event handlers from mutating Finance-owned records except through public Finance application commands.
4. Ensure handler failure does not corrupt the committed finance aggregate.
5. Track event handling errors using application observability.

**Outputs and Postconditions**

- Internal event notification available to authorized consuming modules.
- Finance ownership remains intact.

**Priority:** Should

---

### FR-FBR-025 – Audit Sensitive Finance Operations

**Description and Actors**  
Creates complete audit history for sensitive finance changes. Actors are all finance mutators and Audit & Compliance system service.

**Preconditions**

- A sensitive finance action is attempted or completed.

**Inputs**

- entityType
- entityId
- action
- oldValue
- newValue
- performedBy
- performedAt
- branch context
- IP address when available
- reason where required

**Processing Steps**

1. Identify whether action is audit-mandatory.
2. Capture before state for changes.
3. Execute validated operation.
4. Capture after state.
5. Persist AuditLog with actor and reason.
6. For rejected security-sensitive actions, record security telemetry without exposing financial content in logs.
7. Prevent ordinary business users from editing audit records.

**Outputs and Postconditions**

- Immutable audit evidence for invoice issue/cancel, payment posting, refund transitions, credit-rule changes, receipt reprint where required, installment-plan changes, export, and payment-validation overrides if such override is ever explicitly introduced.

**Priority:** Must

---

### FR-FBR-026 – Enforce Financial Soft-Delete and Reversal Policy

**Description and Actors**  
Prevents destructive deletion and defines allowed retirement mechanisms. Actors are Finance users and system services.

**Preconditions**

- Delete, cancel, archive, or correction action requested.

**Inputs**

- entityType
- entityId
- requested action
- reason

**Processing Steps**

1. Reject hard-delete requests for Invoice, Payment, Receipt, Refund, and Receivable.
2. Permit Draft invoice cancellation when business rules allow.
3. Permit issued unpaid invoice cancellation only under authorized cancellation rule with reason and audit.
4. For paid obligations, require refund or other approved reversal mechanism; do not erase payment.
5. For mutable policy/configuration records such as CorporateCreditRule, use effective-end dating and soft deletion only when appropriate, preserving historical versions.
6. Populate `isDeleted` and `deletedAt` only for entity types whose lifecycle allows soft deletion; never use soft deletion to conceal a posted financial transaction.
7. Audit every retirement/cancellation action.

**Outputs and Postconditions**

- Historical finance trail remains reconstructable.

**Priority:** Must

---

### FR-FBR-027 – Render Bilingual Financial Documents

**Description and Actors**  
Supports English and Arabic invoice and receipt presentation. Actors are Finance users, students/corporate recipients through authorized delivery, and rendering service.

**Preconditions**

1. Financial transaction exists.
2. Requested language is supported.

**Inputs**

- invoiceId or receiptId
- language
- localized institute/branch labels
- localized document labels
- customer display data

**Processing Steps**

1. Load authoritative financial transaction values.
2. Load localized labels and bilingual course/customer display data where available.
3. Render amounts identically across languages.
4. Render GST business dates consistently.
5. Preserve invoiceNumber or receiptNumber unchanged across language variants.
6. Do not create duplicate transaction records when rendering another language.

**Outputs and Postconditions**

- English or Arabic document representation of the same authoritative transaction.

**Priority:** Should

---

### FR-FBR-028 – Apply Oman GST Business Time

**Description and Actors**  
Standardizes business date interpretation for invoice dates, due dates, payments, receipts, aging, and effective credit rules. Actor is the entire module.

**Preconditions**

- Date/time operation is performed.

**Inputs**

- UTC system timestamp or timezone-aware input

**Processing Steps**

1. Store timestamps using the platform’s canonical storage strategy.
2. Interpret finance business dates using Oman GST, UTC+4.
3. Determine “today” for due-date and aging calculations using GST calendar date.
4. Render dates in configured local display format without changing their business-date meaning.
5. Reject ambiguous timezone-less timestamps at external API boundaries when a timestamp rather than a pure date is required.

**Outputs and Postconditions**

- Consistent Oman business-date behavior.

**Priority:** Must

---

### FR-FBR-029 – Enforce Optimistic Concurrency

**Description and Actors**  
Prevents lost updates to mutable financial aggregates. Actors are Finance application services.

**Preconditions**

- Mutation targets an existing mutable finance aggregate.

**Inputs**

- entityId
- expectedVersion
- mutation command

**Processing Steps**

1. Load current version.
2. Compare expectedVersion with persisted version.
3. Reject mutation with conflict when versions differ.
4. On successful mutation, increment version atomically.
5. For balance-changing operations, combine version check with database transaction and required locking semantics.
6. Return current-safe conflict response instructing caller UI to refresh transaction state.

**Outputs and Postconditions**

- No silent overwrite of concurrent finance changes.

**Priority:** Must

---

### FR-FBR-030 – Enforce Invoice Status Lifecycle

**Description and Actors**  
Controls legal invoice state transitions. Actors are Finance Officer, Finance Manager, payment workflow, refund workflow, and system aging process.

**Preconditions**

- Invoice exists.

**Inputs**

- current status
- requested action
- invoice balance
- payment/refund state
- reason when required

**Processing Steps**

Supported functional lifecycle:

1. `Draft -> Issued` when validation succeeds and invoice number is generated.
2. `Draft -> Cancelled` when authorized cancellation occurs before issue.
3. `Issued -> PartiallyPaid` after first effective payment when outstanding remains positive.
4. `Issued -> Paid` when one payment fully settles balance.
5. `PartiallyPaid -> Paid` when effective payments settle remaining balance.
6. `Issued -> Overdue` when due date passes with positive outstanding balance.
7. `PartiallyPaid -> Overdue` when due date passes with positive outstanding balance.
8. `Overdue -> PartiallyPaid` when a payment is made but outstanding remains positive and status policy prefers payment-state emphasis; aging still remains overdue in Receivable. Implementations may retain `Overdue` as invoice status while exposing paymentState separately, but one consistent model must be selected in Prisma and API contracts.
9. `Overdue -> Paid` when settled.
10. `Paid -> PartiallyPaid` or `Paid -> Overdue/Issued` after executed refund reopens an obligation, according to due-date evaluation.
11. `Issued -> Cancelled` only when no effective payment exists and cancellation is authorized with reason.
12. Paid invoice cannot be cancelled to erase history.
13. Any unsupported transition is rejected and audited when security-sensitive.

**Outputs and Postconditions**

- Legal invoice state.
- State synchronized with monetary balance.

**Priority:** Must

## 4. Comprehensive Business Rules

| Rule ID    | Rule                                                                                                                                                                                    | Enforcement                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| BR-FBR-001 | Finance is invoice-centric; every ordinary payment must settle an invoice obligation or an explicitly modeled advance flow.                                                             | Application and domain service validation.        |
| BR-FBR-002 | Enrollment remains the central learning transaction; Finance must not create a separate learner lifecycle for Walk-In, Online, Regular, or Corporate journeys.                          | Domain boundary and data model review.            |
| BR-FBR-003 | Student invoice line items must preserve enrollmentId and courseId traceability.                                                                                                        | Persistence constraint and service validation.    |
| BR-FBR-004 | Course Catalog owns pricing and discount rules; Finance applies resolved values and validates arithmetic but must not independently redefine the hierarchy.                             | Context boundary enforcement.                     |
| BR-FBR-005 | Pricing and discount source precedence is Batch, then Branch, then Global Course when higher-priority values are missing.                                                               | Upstream resolution contract validation.          |
| BR-FBR-006 | Invoice subtotal, discount, tax, total, paid, and outstanding values must be computed with fixed-precision decimal arithmetic.                                                          | Domain Money/Decimal implementation.              |
| BR-FBR-007 | `totalAmount = subtotal - discountAmount + taxAmount`.                                                                                                                                  | Domain invariant.                                 |
| BR-FBR-008 | `outstandingAmount = totalAmount - effectivePaidAmount`, where effectivePaidAmount is successful payments minus executed refunds applicable to the obligation.                          | Transactional balance service.                    |
| BR-FBR-009 | Ordinary invoice payment amount must be greater than zero and must not exceed current outstanding amount.                                                                               | Payment validation.                               |
| BR-FBR-010 | Payment must reference a valid invoice; installment allocation is additional traceability and does not remove invoice linkage.                                                          | FK and service validation.                        |
| BR-FBR-011 | Payment method must be active and from controlled configuration.                                                                                                                        | Configuration lookup validation.                  |
| BR-FBR-012 | Bank Transfer, Card, and Cheque payments require reference information unless an approved configuration defines a replacement control.                                                  | Method-specific validation.                       |
| BR-FBR-013 | A successful payment posting must be idempotent and must not create duplicate Payment or Receipt records on retry.                                                                      | Idempotency control and unique constraints.       |
| BR-FBR-014 | Exactly one authoritative Receipt exists per successful Payment. Re-rendering does not create another receipt number.                                                                   | Unique paymentId relationship.                    |
| BR-FBR-015 | Receipt amount must equal its Payment amount.                                                                                                                                           | Domain invariant.                                 |
| BR-FBR-016 | Issued invoice numbers are unique and generated from controlled NumberingSeries.                                                                                                        | Transactional numbering and unique constraint.    |
| BR-FBR-017 | Posted Invoice, Payment, Receipt, Refund, and Receivable records cannot be hard-deleted.                                                                                                | Repository policy and database privileges.        |
| BR-FBR-018 | A paid invoice cannot be cancelled to remove settlement history.                                                                                                                        | State machine.                                    |
| BR-FBR-019 | Refund must reference a valid invoice and payment.                                                                                                                                      | FK and service validation.                        |
| BR-FBR-020 | Refund amount must be greater than zero and cannot exceed remaining refundable payment balance.                                                                                         | Refund domain invariant.                          |
| BR-FBR-021 | Refunds require approval before financial execution.                                                                                                                                    | Refund state machine and permission check.        |
| BR-FBR-022 | Original Payment amount and identity remain unchanged after refund.                                                                                                                     | Immutable transaction policy.                     |
| BR-FBR-023 | Executed refund recalculates invoice paid and outstanding balances and may reopen Receivable.                                                                                           | Transactional refund execution.                   |
| BR-FBR-024 | Installment-plan schedule amount must equal the obligation governed by the plan.                                                                                                        | Installment plan validation.                      |
| BR-FBR-025 | Installment sequence numbers are unique and contiguous starting at 1.                                                                                                                   | Validation and unique constraint.                 |
| BR-FBR-026 | Installment amounts must be positive.                                                                                                                                                   | Domain validation.                                |
| BR-FBR-027 | Installment due dates must be non-decreasing by sequence.                                                                                                                               | Domain validation.                                |
| BR-FBR-028 | Payment allocation to installments cannot exceed either payment unallocated balance or installment remaining balance.                                                                   | Allocation algorithm.                             |
| BR-FBR-029 | Receivable outstandingAmount must reconcile to Invoice outstandingAmount.                                                                                                               | Transactional invariant and reconciliation check. |
| BR-FBR-030 | Receivable aging is calculated from invoice due date using Oman GST business date.                                                                                                      | Aging service.                                    |
| BR-FBR-031 | Current bucket applies when daysPastDue <= 0.                                                                                                                                           | Aging algorithm.                                  |
| BR-FBR-032 | 30 Days bucket applies for 1–30 days past due.                                                                                                                                          | Aging algorithm.                                  |
| BR-FBR-033 | 60 Days bucket applies for 31–60 days past due.                                                                                                                                         | Aging algorithm.                                  |
| BR-FBR-034 | 90 Days bucket applies for 61–90 days past due.                                                                                                                                         | Aging algorithm.                                  |
| BR-FBR-035 | The ER enum label `120+ Days` is used for daysPastDue >= 91 until an approved model revision introduces an additional aging bucket; reporting documentation must disclose this mapping. | Compatibility rule and reporting documentation.   |
| BR-FBR-036 | Corporate currentOutstanding is the sum of open corporate receivable outstanding amounts.                                                                                               | Credit exposure calculation.                      |
| BR-FBR-037 | Committed amount must include eligible uninvoiced corporate obligations exactly once and exclude cancelled/dropped obligations.                                                         | Credit exposure service.                          |
| BR-FBR-038 | `availableCredit = creditLimit - currentOutstanding - committedAmount`.                                                                                                                 | Credit invariant.                                 |
| BR-FBR-039 | For a proposed enrollment, `projectedExposure = currentOutstanding + committedAmount + proposedEnrollmentValue`.                                                                        | Credit validation algorithm.                      |
| BR-FBR-040 | If projectedExposure exceeds creditLimit and blockOnCreditLimit is true, corporate enrollment must be blocked.                                                                          | Cross-module credit validation.                   |
| BR-FBR-041 | If projectedExposure exceeds creditLimit and blockOnCreditLimit is false, enrollment may continue with warning and audit evidence.                                                      | Cross-module credit validation.                   |
| BR-FBR-042 | Effective-dated credit rules for one corporate account must not overlap.                                                                                                                | Effective-date validation.                        |
| BR-FBR-043 | Credit-rule changes preserve historical versions and audit old/new values.                                                                                                              | Versioning and audit.                             |
| BR-FBR-044 | A user can query only assigned branch data unless explicitly authorized for consolidated reporting and branch hierarchy access.                                                         | Server-side scope predicate.                      |
| BR-FBR-045 | Client-provided branchId is never accepted as proof of authorization.                                                                                                                   | Security architecture.                            |
| BR-FBR-046 | Consolidated cross-branch queries require `finance.report.consolidated` and valid branch access.                                                                                        | IAM authorization.                                |
| BR-FBR-047 | Read permission does not imply export permission.                                                                                                                                       | RBAC.                                             |
| BR-FBR-048 | Refund request permission does not imply refund approval permission.                                                                                                                    | Separation of duties.                             |
| BR-FBR-049 | Finance documents and UI may render English or Arabic without creating duplicate financial transactions.                                                                                | Localization design.                              |
| BR-FBR-050 | Business dates and aging boundaries use Oman GST (UTC+4).                                                                                                                               | Date service.                                     |
| BR-FBR-051 | Monetary values from different currencies cannot be summed in reports unless an approved exchange-rate policy is introduced; current reporting must group by currency.                  | Reporting validation.                             |
| BR-FBR-052 | Completion and Certificate modules must consume authoritative payment-validation status and must not calculate it from receipt presence.                                                | Context integration contract.                     |
| BR-FBR-053 | Payment validation returns NotRequired when enrollment paymentValidationRequired is false.                                                                                              | Payment validation service.                       |
| BR-FBR-054 | Payment validation returns Passed only when required valid obligations have zero outstanding balance.                                                                                   | Payment validation service.                       |
| BR-FBR-055 | Payment validation returns Failed when required obligations retain positive outstanding balance.                                                                                        | Payment validation service.                       |
| BR-FBR-056 | Invoice issue, payment posting, refund execution, and corporate credit validation must use concurrency controls appropriate to balance-sensitive operations.                            | Versioning/transaction control.                   |
| BR-FBR-057 | A stale expected version causes a conflict response; the module must not silently overwrite concurrent changes.                                                                         | Optimistic locking.                               |
| BR-FBR-058 | Payment, balance update, receivable update, installment allocation, receipt creation, and audit persistence are committed atomically for a successful payment posting.                  | Database transaction.                             |
| BR-FBR-059 | Invoice state transitions outside the approved lifecycle are rejected.                                                                                                                  | State machine.                                    |
| BR-FBR-060 | Draft can transition to Issued or Cancelled.                                                                                                                                            | State machine.                                    |
| BR-FBR-061 | Issued can transition to PartiallyPaid, Paid, Overdue, or authorized Cancelled when no effective payment exists.                                                                        | State machine.                                    |
| BR-FBR-062 | PartiallyPaid can transition to Paid or Overdue based on balance and due date.                                                                                                          | State machine.                                    |
| BR-FBR-063 | Overdue can transition to Paid after full settlement and may reflect partial settlement according to selected API status model.                                                         | State machine.                                    |
| BR-FBR-064 | Executed refund may move a previously Paid invoice back to an open-balance state according to balance and due date.                                                                     | Refund/invoice integration.                       |
| BR-FBR-065 | Sensitive finance actions record who, what, when, old value, new value, branch context, and reason where applicable.                                                                    | Audit policy.                                     |
| BR-FBR-066 | Export operations are audit logged with actor, dataset, filters, branch scope, timestamp, and row count.                                                                                | Export audit.                                     |
| BR-FBR-067 | Online payment gateway processing is excluded from the current phase; manual payment flows must not pretend to provide gateway authorization.                                           | Scope guardrail.                                  |
| BR-FBR-068 | Tally integration is excluded from the current phase and Finance remains the source owner of financial transactions.                                                                    | Scope and ownership guardrail.                    |
| BR-FBR-069 | Corporate invoice consolidation must preserve line-level enrollment traceability and source branch attribution.                                                                         | Corporate billing invariant.                      |
| BR-FBR-070 | An enrollment billing obligation must not be invoiced twice unless an explicitly authorized additional-charge or correction flow exists.                                                | Duplicate billing prevention.                     |

## 5. Cross-Module Dependencies Mapping

| Module / Context                 | Direction                                                      | Data / Capability                                                                                                                                                      | Contract and Rule                                                                                                                        |
| -------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Identity & Access Management     | Module 12 consumes                                             | authenticated user, permissions, UserBranchAccess, consolidated-view permission                                                                                        | Every finance query and mutation resolves authorization server-side. Module 12 never trusts UI-only route protection.                    |
| Organization Management          | Module 12 consumes                                             | Institute, Branch, parent/child branch hierarchy                                                                                                                       | Used for branch scoping, consolidated scope resolution, invoice/receipt issuer identity, and reporting dimensions.                       |
| Configuration / Master Data      | Module 12 consumes                                             | NumberingSeries, Payment Method, currency, localized labels                                                                                                            | Module 12 uses configured values and does not hardcode business-critical reference lists beyond domain enums fixed by approved model.    |
| Admission & Enrollment           | Bidirectional application integration                          | Enrollment identifiers, studentProfileId, courseId, batchId, branchId, enrollmentType, status, resolvedPrice, resolvedDiscount, finalAmount, paymentValidationRequired | Enrollment confirmation can trigger invoice creation. Finance supplies payment status but does not mutate enrollment lifecycle directly. |
| Course Catalog                   | Module 12 consumes                                             | course identity, authoritative pricing/discount source metadata, course commercial description                                                                         | Course Catalog owns pricing hierarchy and discount hierarchy. Finance validates and applies the resolved snapshot.                       |
| Training Delivery                | Module 12 consumes indirectly                                  | Batch identity, batch-course relationship, branch association                                                                                                          | Used to validate traceability and source branch. Finance does not own Batch.                                                             |
| Walk-In Fast Track               | Bidirectional workflow integration                             | walk-in enrollment reference and payment-confirmation result                                                                                                           | Walk-In still uses central Enrollment. Payment is recorded through Finance, not a duplicate walk-in payment ledger.                      |
| Corporate Training               | Bidirectional application integration                          | CorporateAccount, CorporateParticipant, contract/billing-cycle linkage, corporate enrollment references                                                                | Module 12 creates corporate invoices and validates credit; Corporate Training owns account, participant, contract, and delivery linkage. |
| Corporate Sales & Quotation      | Module 12 consumes trace references                            | approved quotation, sales order, commercial traceability                                                                                                               | Approved commercial documents may support corporate invoice traceability. Finance owns invoice; Sales context owns quotation/order.      |
| Exam, Result & Completion        | Module 12 provides                                             | payment validation result by enrollment                                                                                                                                | Completion consumes NotRequired/Passed/Failed result. It does not inspect payment tables directly as business authority.                 |
| Certificate Management           | Module 12 provides                                             | payment validation result                                                                                                                                              | Certificate issuance uses Finance validation where payment is required, alongside completion eligibility from Completion context.        |
| Communication & Notification     | Module 12 produces notification requests or internal events    | receipt issued, installment due, invoice overdue, refund decision                                                                                                      | Communication owns templates and delivery logs; Finance owns source transaction state.                                                   |
| Reporting & Executive Dashboards | Module 12 provides read models/metrics                         | invoicing, collection, refund, outstanding, aging, corporate exposure, branch performance inputs                                                                       | Reporting consumes finance data and does not mutate or own transactions. Permissions and branch filters remain enforced.                 |
| Audit & Compliance               | Module 12 produces audit records/approval interactions         | sensitive finance actions, Refund Approval, credit-rule change, export audit                                                                                           | Audit context preserves cross-domain compliance evidence; Finance remains owner of finance state.                                        |
| Website & Digital Experience     | No direct finance ownership interaction in current admin scope | future presentation or registration references only through Enrollment workflows                                                                                       | Website must not create or own Finance transactions.                                                                                     |
| Future Tally Integration         | Future outbound synchronization                                | invoice, receipt, payment, refund/credit-note related finance events                                                                                                   | Explicitly future phase. Tally synchronization must not become the owner of Finance records.                                             |
| Future Online Payment Gateway    | Future inbound integration                                     | authorization/capture result, provider reference, idempotent settlement confirmation                                                                                   | Explicitly deferred. Gateway integration must call Finance posting contracts rather than write Payment directly.                         |

## 6. Key Cross-Context Sequences

### 6.1 Enrollment to Invoice

```text
Admission & Enrollment
    |
    | EnrollmentConfirmed
    v
Course Catalog pricing snapshot already resolved
    |
    v
Module 12 validates commercial values
    |
    v
Invoice + InvoiceLineItem issued
    |
    v
Receivable opened
```

### 6.2 Payment and Receipt

```text
Authorized Finance User
    |
    | Record Payment
    v
Validate permission + branch + invoice + amount + method + idempotency
    |
    v
Create Payment
    |
    +--> Allocate installment balance when applicable
    |
    +--> Update Invoice paid/outstanding
    |
    +--> Update Receivable
    |
    +--> Create Receipt
    |
    +--> Write Audit
    v
Commit atomically
```

### 6.3 Corporate Credit Validation

```text
Corporate Enrollment Request
    |
    v
Module 12 resolves effective credit rule
    |
    v
currentOutstanding + committedAmount + proposedValue
    |
    +--> within limit ----------------> Allowed
    |
    +--> exceeds + block=false -------> AllowedWithWarning
    |
    +--> exceeds + block=true --------> Blocked
```

### 6.4 Completion and Certificate Payment Check

```text
Completion / Certificate Context
    |
    | ValidatePayment(enrollmentId)
    v
Module 12 calculates active obligation and net settlement
    |
    +--> payment not required --> NotRequired
    |
    +--> outstanding = 0 ------> Passed
    |
    +--> outstanding > 0 ------> Failed
```

## 7. Part 1 Completion Criteria

Part 1 is considered functionally complete when implementation and later FRD parts preserve all of the following:

1. Invoice is the financial aggregate root and source obligation.
2. Enrollment remains central across all learner entry paths.
3. Course Catalog owns pricing/discount rules; Finance applies and validates snapshots.
4. Manual payment posting is atomic, idempotent, permission-controlled, branch-scoped, and audited.
5. Receivables reconcile to invoice outstanding balances.
6. Refunds follow request → approval/rejection → execution and never erase original payment history.
7. Corporate credit validation follows configured limit and block behavior.
8. Aging uses GST business dates and the approved ER bucket labels.
9. Completion and Certificate contexts consume Finance payment-validation results.
10. No hard delete exists for posted finance transactions.
11. Cross-branch access requires explicit consolidated permission and valid branch access.
12. External brokers, Tally synchronization, automated payment gateway processing, and general-ledger accounting are not introduced by this module’s current scope.
