# Part 7 – Validation Rules, Error Catalog, Notifications

## Module 12 – Fee, Billing & Receivables Management

## 1. Validation Strategy

Validation is applied in five layers:

1. **Transport schema validation** using Zod for type, length, enum, regex, and request shape.
2. **Authorization validation** for permission, branch scope, ownership, and separation of duties.
3. **Aggregate invariant validation** inside Invoice, Payment, Refund, Receivable, and Corporate Credit application/domain services.
4. **Persistence validation** through foreign keys, unique indexes, check constraints, effective-date overlap checks, and optimistic versioning.
5. **Cross-context validation** through typed application ports to Enrollment, Course Catalog, Corporate Training, IAM, Organization, Configuration, Completion, Certificate, Communication, and Audit contexts.

No UI validation is considered authoritative. Server validation must repeat all business-critical checks.

## 2. Shared Validation Schemas

```ts
const UUID = z.string().uuid();
const OMRAmount = z.string().regex(/^\\d{1,15}(\\.\\d{1,3})?$/);
const PositiveOMRAmount = OMRAmount.refine((v) => new Decimal(v).gt(0));
const NonNegativeOMRAmount = OMRAmount.refine((v) => new Decimal(v).gte(0));
const Currency = z
  .string()
  .regex(/^[A-Z]{3}$/)
  .default('OMR');
const BusinessDate = z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/);
const ShortReason = z.string().trim().min(5).max(500);
const FinancialReason = z.string().trim().min(10).max(1000);
const Version = z.number().int().min(0);
const ReferenceNumber = z
  .string()
  .trim()
  .min(3)
  .max(100)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._\\/-]{2,99}$/);
```

## 3. Custom Business Validation Rules

### 3.1 Invoice Validation Rules

| Rule ID     | Validation               | Exact Rule                                                                                                                                       | Failure Code                           |
| ----------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| VAL-FIN-001 | Customer reference       | StudentInvoice requires `studentProfileId`; CorporateInvoice requires `corporateAccountId`; mutually incompatible payer references are rejected. | `ERR_FIN_INVOICE_PARTY_INVALID`        |
| VAL-FIN-002 | Enrollment linkage       | Enrollment-linked invoice must reference an existing billable Enrollment and authoritative StudentProfile/CorporateParticipant relationship.     | `ERR_FIN_ENROLLMENT_NOT_BILLABLE`      |
| VAL-FIN-003 | Course and batch source  | Enrollment invoice source must resolve an Enrollment with mandatory Course and Batch linkage.                                                    | `ERR_FIN_ENROLLMENT_SOURCE_INCOMPLETE` |
| VAL-FIN-004 | Currency consistency     | Header currency and every applicable source pricing currency must match; default operational currency is OMR.                                    | `ERR_FIN_CURRENCY_MISMATCH`            |
| VAL-FIN-005 | Due date                 | `dueDate >= invoiceDate`; due date cannot be before source contract minimum term where corporate terms apply.                                    | `ERR_FIN_INVALID_DUE_DATE`             |
| VAL-FIN-006 | Positive quantity        | Every line quantity must be greater than zero and have at most three decimal places.                                                             | `ERR_FIN_LINE_QUANTITY_INVALID`        |
| VAL-FIN-007 | Non-negative unit price  | Unit price must be greater than or equal to zero; zero-price line requires an explicit approved free-of-charge source rule.                      | `ERR_FIN_UNIT_PRICE_INVALID`           |
| VAL-FIN-008 | Discount bound           | `0 <= discountAmount <= quantity × unitPrice`.                                                                                                   | `ERR_FIN_DISCOUNT_EXCEEDS_GROSS`       |
| VAL-FIN-009 | Line arithmetic          | `lineNet = quantity × unitPrice - discountAmount`; `lineTotal = lineNet + taxAmount`. Calculated values are quantized to currency precision.     | `ERR_FIN_INVOICE_TOTAL_MISMATCH`       |
| VAL-FIN-010 | Header arithmetic        | Header subtotal, discount, tax, and total must equal sum of canonical line calculations.                                                         | `ERR_FIN_INVOICE_TOTAL_MISMATCH`       |
| VAL-FIN-011 | Draft editability        | Only Draft invoices may have commercial lines edited.                                                                                            | `ERR_FIN_INVOICE_NOT_EDITABLE`         |
| VAL-FIN-012 | Issue eligibility        | Draft must be balanced, source valid, line count 1–500, and numbering series available before issue.                                             | `ERR_FIN_INVOICE_NOT_BALANCED`         |
| VAL-FIN-013 | Duplicate source billing | Same billable source cannot be invoiced twice where source contract is single-bill. Consolidated billing must track source line references.      | `ERR_FIN_DUPLICATE_BILLING_SOURCE`     |
| VAL-FIN-014 | Cancellation             | Invoice with posted payment greater than zero cannot be cancelled; reversal/refund workflow must be used.                                        | `ERR_FIN_INVOICE_HAS_PAYMENT`          |
| VAL-FIN-015 | Branch source            | Invoice branch and every line source branch must be valid under ordinary or approved consolidated billing policy.                                | `ERR_FIN_BRANCH_SCOPE_DENIED`          |

### 3.2 Installment Validation Rules

| Rule ID     | Validation        | Exact Rule                                                                                                                                                  | Failure Code                             |
| ----------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| VAL-FIN-020 | Plan uniqueness   | Only one active installment plan is allowed per invoice.                                                                                                    | `ERR_FIN_INSTALLMENT_PLAN_EXISTS`        |
| VAL-FIN-021 | Schedule size     | Minimum 2 and maximum 120 installments.                                                                                                                     | `ERR_FIN_INSTALLMENT_COUNT_INVALID`      |
| VAL-FIN-022 | Sequence          | Sequence numbers are unique, start at 1, and are contiguous without gaps.                                                                                   | `ERR_FIN_INSTALLMENT_SEQUENCE_INVALID`   |
| VAL-FIN-023 | Date ordering     | Due dates must be non-decreasing by sequence.                                                                                                               | `ERR_FIN_INSTALLMENT_DATE_ORDER_INVALID` |
| VAL-FIN-024 | Amount sum        | Sum of installment amounts equals the invoice amount subject to plan basis, with no residual beyond currency rounding tolerance of 0.001 OMR.               | `ERR_FIN_INSTALLMENT_SUM_MISMATCH`       |
| VAL-FIN-025 | Positive amount   | Each installment amount is greater than zero.                                                                                                               | `ERR_FIN_INSTALLMENT_AMOUNT_INVALID`     |
| VAL-FIN-026 | Paid amount bound | `0 <= paidAmount <= amount`.                                                                                                                                | `ERR_FIN_INSTALLMENT_OVERALLOCATION`     |
| VAL-FIN-027 | Status derivation | Pending when paidAmount=0 and not overdue; PartiallyPaid when `0 < paidAmount < amount`; Paid when equal; Overdue when due date passed and balance remains. | `ERR_FIN_INSTALLMENT_STATUS_INVALID`     |

### 3.3 Payment Validation Rules

| Rule ID     | Validation             | Exact Rule                                                                                                                                 | Failure Code                          |
| ----------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| VAL-FIN-030 | Amount positive        | Payment amount must be greater than zero.                                                                                                  | `ERR_FIN_PAYMENT_AMOUNT_INVALID`      |
| VAL-FIN-031 | Outstanding bound      | Payment amount cannot exceed current payable outstanding amount unless an explicitly modeled advance-payment flow is used.                 | `ERR_FIN_PAYMENT_EXCEEDS_OUTSTANDING` |
| VAL-FIN-032 | Allocation sum         | Sum of PaymentAllocation amounts must equal Payment amount exactly to currency precision.                                                  | `ERR_FIN_PAYMENT_ALLOCATION_MISMATCH` |
| VAL-FIN-033 | Installment allocation | Allocation to installment cannot exceed its remaining amount.                                                                              | `ERR_FIN_INSTALLMENT_OVERALLOCATION`  |
| VAL-FIN-034 | Invoice state          | Payment is allowed only for Issued, PartiallyPaid, or Overdue invoice states.                                                              | `ERR_FIN_INVOICE_NOT_PAYABLE`         |
| VAL-FIN-035 | Reference requirement  | BankTransfer, Card, Online, and Cheque require reference data; Cash may omit external reference.                                           | `ERR_FIN_PAYMENT_REFERENCE_REQUIRED`  |
| VAL-FIN-036 | Cheque fields          | Cheque payment requires chequeNumber, chequeDate, and bankName.                                                                            | `ERR_FIN_CHEQUE_DETAILS_REQUIRED`     |
| VAL-FIN-037 | Card data minimization | Only card last four digits may be stored; PAN, CVV, PIN, and track data are prohibited.                                                    | `ERR_FIN_PROHIBITED_CARD_DATA`        |
| VAL-FIN-038 | Payment date           | Payment date cannot be before invoice date and cannot be more than one GST business day in the future.                                     | `ERR_FIN_PAYMENT_DATE_INVALID`        |
| VAL-FIN-039 | Idempotency            | Same idempotency key with same canonical request returns original result; same key with different request hash returns conflict.           | `ERR_FIN_IDEMPOTENCY_CONFLICT`        |
| VAL-FIN-040 | Atomic update          | Payment, allocations, invoice balance, installments, receivable, and receipt must commit in one transaction. Partial commit is prohibited. | `ERR_FIN_PAYMENT_POSTING_FAILED`      |
| VAL-FIN-041 | Concurrency            | `expectedInvoiceVersion` must match persisted version before posting.                                                                      | `ERR_FIN_CONCURRENCY_CONFLICT`        |
| VAL-FIN-042 | Receipt uniqueness     | Exactly one active receipt exists for each successfully posted payment.                                                                    | `ERR_FIN_DUPLICATE_RECEIPT`           |

### 3.4 Refund Validation Rules

| Rule ID     | Validation            | Exact Rule                                                                                    | Failure Code                          |
| ----------- | --------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------- |
| VAL-FIN-050 | Source validity       | Refund references a valid posted Payment and its Invoice.                                     | `ERR_FIN_PAYMENT_NOT_REFUNDABLE`      |
| VAL-FIN-051 | Amount positive       | Refund amount must be greater than zero.                                                      | `ERR_FIN_REFUND_AMOUNT_INVALID`       |
| VAL-FIN-052 | Refundable bound      | Refund amount <= payment amount - sum of executed refunds against that payment.               | `ERR_FIN_REFUND_EXCEEDS_REFUNDABLE`   |
| VAL-FIN-053 | Full refund amount    | `refundType=Full` requires amount equal to remaining refundable payment balance.              | `ERR_FIN_REFUND_TYPE_AMOUNT_MISMATCH` |
| VAL-FIN-054 | Partial refund amount | `refundType=Partial` requires amount strictly less than remaining refundable payment balance. | `ERR_FIN_REFUND_TYPE_AMOUNT_MISMATCH` |
| VAL-FIN-055 | Reason                | Reason code mandatory; narrative reason length 10–1000 characters.                            | `ERR_FIN_REFUND_REASON_REQUIRED`      |
| VAL-FIN-056 | Request state         | Duplicate open refund request for same payment and equivalent amount/reason is rejected.      | `ERR_FIN_DUPLICATE_REFUND_REQUEST`    |
| VAL-FIN-057 | Approval state        | Only Requested or UnderReview refund may be decided.                                          | `ERR_FIN_REFUND_INVALID_STATE`        |
| VAL-FIN-058 | Self-approval         | User who requested refund cannot approve the same refund.                                     | `ERR_FIN_REFUND_SELF_APPROVAL`        |
| VAL-FIN-059 | Execution state       | Only Approved refund can execute; Executed refund is immutable.                               | `ERR_FIN_REFUND_NOT_APPROVED`         |
| VAL-FIN-060 | Execution reference   | Non-cash execution requires externalReference 3–100 characters.                               | `ERR_FIN_REFUND_REFERENCE_REQUIRED`   |

### 3.5 Receivable and Aging Validation Rules

| Rule ID     | Validation                       | Exact Rule                                                                                                 | Failure Code                               |
| ----------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| VAL-FIN-070 | Receivable uniqueness            | One active receivable projection per invoice.                                                              | `ERR_FIN_RECEIVABLE_DUPLICATE`             |
| VAL-FIN-071 | Outstanding reconciliation       | Receivable outstandingAmount equals current invoice outstandingAmount after posted payment/refund effects. | `ERR_FIN_RECEIVABLE_RECONCILIATION_FAILED` |
| VAL-FIN-072 | Days past due                    | `max(0, GST business date - dueDate)` using calendar date semantics in Asia/Muscat.                        | `ERR_FIN_AGING_CALCULATION_FAILED`         |
| VAL-FIN-073 | Current bucket                   | Not past due or daysPastDue=0 maps to Current.                                                             | `ERR_FIN_AGING_BUCKET_INVALID`             |
| VAL-FIN-074 | 30 Days bucket                   | daysPastDue 1–30 maps to `30 Days`.                                                                        | `ERR_FIN_AGING_BUCKET_INVALID`             |
| VAL-FIN-075 | 60 Days bucket                   | daysPastDue 31–60 maps to `60 Days`.                                                                       | `ERR_FIN_AGING_BUCKET_INVALID`             |
| VAL-FIN-076 | 90 Days bucket                   | daysPastDue 61–90 maps to `90 Days`.                                                                       | `ERR_FIN_AGING_BUCKET_INVALID`             |
| VAL-FIN-077 | ER compatibility terminal bucket | daysPastDue >=91 maps to existing ER enum `120+ Days` until domain enum is formally corrected.             | `ERR_FIN_AGING_BUCKET_INVALID`             |
| VAL-FIN-078 | Settled receivable               | outstandingAmount=0 requires status Settled and aging amount excluded from outstanding totals.             | `ERR_FIN_RECEIVABLE_STATUS_INVALID`        |

### 3.6 Corporate Credit Validation Rules

| Rule ID     | Validation           | Exact Rule                                                                                                     | Failure Code                                 |
| ----------- | -------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| VAL-FIN-080 | Credit limit         | creditLimit must be >=0 and use configured currency precision.                                                 | `ERR_FIN_CREDIT_LIMIT_INVALID`               |
| VAL-FIN-081 | Effective date       | effectiveEndDate, when provided, must be >= effectiveStartDate.                                                | `ERR_FIN_EFFECTIVE_DATE_INVALID`             |
| VAL-FIN-082 | No overlap           | Active rules for same corporate account, branch scope, and currency cannot have overlapping effective periods. | `ERR_FIN_CREDIT_RULE_OVERLAP`                |
| VAL-FIN-083 | Exposure formula     | projectedExposure = currentOutstanding + committedAmount + proposedEnrollmentValue.                            | `ERR_FIN_CREDIT_EXPOSURE_CALCULATION_FAILED` |
| VAL-FIN-084 | Available credit     | availableCredit = creditLimit - currentOutstanding - committedAmount.                                          | `ERR_FIN_CREDIT_EXPOSURE_CALCULATION_FAILED` |
| VAL-FIN-085 | Blocking decision    | If projectedExposure > creditLimit and blockOnCreditLimit=true, decision is Block.                             | `ERR_FIN_CREDIT_LIMIT_EXCEEDED`              |
| VAL-FIN-086 | Warning decision     | If projectedExposure > creditLimit and blockOnCreditLimit=false, decision is AllowWithWarning.                 | None; success decision with warning reason.  |
| VAL-FIN-087 | Rule date resolution | Exactly one applicable active rule may resolve for validationDate; multiple matches are data-integrity error.  | `ERR_FIN_MULTIPLE_CREDIT_RULES_ACTIVE`       |

### 3.7 Date Overlap Validator

For inclusive business-date intervals `[newStart, newEnd]` and existing `[existingStart, existingEnd]`, where null end means positive infinity:

```text
overlap exists when:
newStart <= COALESCE(existingEnd, +infinity)
AND
COALESCE(newEnd, +infinity) >= existingStart
```

A matching active CorporateCreditRule overlap is rejected inside the same transaction that creates or supersedes the rule.

### 3.8 Age Validation Applicability

Module 12 does **not** own learner age validation. Minimum/maximum learner age rules, when configured for admission or course eligibility, are validated by Admission & Enrollment or Course Catalog before a source becomes billable. Finance may reject an invalidated source reference but must not duplicate age-rule ownership.

## 4. Error Catalog

### 4.1 Common and Authorization Errors

| Error Code                          | HTTP | Message                                                       | Retry Guidance                                                         |
| ----------------------------------- | ---: | ------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `ERR_COMMON_VALIDATION`             |  400 | Request validation failed.                                    | Correct fields; do not blindly retry.                                  |
| `ERR_AUTH_REQUIRED`                 |  401 | Authentication is required.                                   | Re-authenticate.                                                       |
| `ERR_AUTH_SESSION_EXPIRED`          |  401 | Session has expired.                                          | Re-authenticate.                                                       |
| `ERR_AUTH_FORBIDDEN`                |  403 | You are not authorized to perform this action.                | Request access; no automatic retry.                                    |
| `ERR_FIN_BRANCH_SCOPE_DENIED`       |  403 | You are not authorized to access the requested finance scope. | Change to an authorized branch.                                        |
| `ERR_FIN_CONSOLIDATED_SCOPE_DENIED` |  403 | Consolidated finance access is not authorized.                | Request permission and branch entitlement.                             |
| `ERR_COMMON_RATE_LIMITED`           |  429 | Too many requests.                                            | Retry after server-provided delay.                                     |
| `ERR_FIN_DEPENDENCY_UNAVAILABLE`    |  503 | A required internal service is temporarily unavailable.       | Safe retry only for idempotent query or idempotency-protected command. |

### 4.2 Invoice Errors

| Error Code                             | HTTP | Message                                                                     |
| -------------------------------------- | ---: | --------------------------------------------------------------------------- |
| `ERR_FIN_INVOICE_NOT_FOUND`            |  404 | Invoice was not found.                                                      |
| `ERR_FIN_SOURCE_NOT_FOUND`             |  404 | Billing source was not found.                                               |
| `ERR_FIN_INVOICE_PARTY_INVALID`        |  422 | Invoice payer relationship is invalid.                                      |
| `ERR_FIN_ENROLLMENT_NOT_BILLABLE`      |  422 | Enrollment is not eligible for billing.                                     |
| `ERR_FIN_ENROLLMENT_SOURCE_INCOMPLETE` |  422 | Enrollment source is missing required course or batch linkage.              |
| `ERR_FIN_DUPLICATE_BILLING_SOURCE`     |  409 | Billing source has already been invoiced under the applicable billing rule. |
| `ERR_FIN_CURRENCY_MISMATCH`            |  422 | Currency values are inconsistent.                                           |
| `ERR_FIN_INVALID_DUE_DATE`             |  422 | Due date is invalid for this invoice.                                       |
| `ERR_FIN_LINE_QUANTITY_INVALID`        |  422 | Invoice line quantity is invalid.                                           |
| `ERR_FIN_UNIT_PRICE_INVALID`           |  422 | Invoice line unit price is invalid.                                         |
| `ERR_FIN_DISCOUNT_EXCEEDS_GROSS`       |  422 | Discount exceeds the line gross amount.                                     |
| `ERR_FIN_PRICE_SNAPSHOT_MISMATCH`      |  422 | Submitted pricing does not match authoritative resolved pricing.            |
| `ERR_FIN_INVOICE_TOTAL_MISMATCH`       |  422 | Invoice totals do not match canonical calculation.                          |
| `ERR_FIN_INVOICE_NOT_EDITABLE`         |  409 | Invoice is not in an editable state.                                        |
| `ERR_FIN_INVOICE_NOT_BALANCED`         |  422 | Invoice cannot be issued because totals or required data are incomplete.    |
| `ERR_FIN_NUMBERING_SERIES_UNAVAILABLE` |  422 | Required numbering series is unavailable.                                   |
| `ERR_FIN_INVALID_INVOICE_TRANSITION`   |  409 | Requested invoice status transition is not allowed.                         |
| `ERR_FIN_INVOICE_HAS_PAYMENT`          |  409 | Invoice with posted payment cannot be cancelled.                            |
| `ERR_FIN_SOURCE_INVALIDATED`           |  422 | Billing source became invalid before invoice issue.                         |

### 4.3 Installment and Payment Errors

| Error Code                                 | HTTP | Message                                                               |
| ------------------------------------------ | ---: | --------------------------------------------------------------------- |
| `ERR_FIN_INSTALLMENT_PLAN_EXISTS`          |  409 | An active installment plan already exists for this invoice.           |
| `ERR_FIN_INSTALLMENT_COUNT_INVALID`        |  422 | Installment count is outside allowed bounds.                          |
| `ERR_FIN_INSTALLMENT_SEQUENCE_INVALID`     |  422 | Installment sequence is invalid.                                      |
| `ERR_FIN_INSTALLMENT_DATE_ORDER_INVALID`   |  422 | Installment due dates are not in valid order.                         |
| `ERR_FIN_INSTALLMENT_SUM_MISMATCH`         |  422 | Installment amounts do not equal the required plan total.             |
| `ERR_FIN_INSTALLMENT_AMOUNT_INVALID`       |  422 | Installment amount must be greater than zero.                         |
| `ERR_FIN_INSTALLMENT_OVERALLOCATION`       |  422 | Allocation exceeds remaining installment amount.                      |
| `ERR_FIN_INSTALLMENT_STATUS_INVALID`       |  409 | Installment status does not match its balance and due date.           |
| `ERR_FIN_INVOICE_NOT_INSTALLMENT_ELIGIBLE` |  409 | Invoice is not eligible for a new installment plan.                   |
| `ERR_FIN_PAYMENT_NOT_FOUND`                |  404 | Payment was not found.                                                |
| `ERR_FIN_PAYMENT_AMOUNT_INVALID`           |  422 | Payment amount must be greater than zero.                             |
| `ERR_FIN_PAYMENT_EXCEEDS_OUTSTANDING`      |  422 | Payment amount exceeds outstanding invoice balance.                   |
| `ERR_FIN_PAYMENT_ALLOCATION_MISMATCH`      |  422 | Payment allocations do not equal payment amount.                      |
| `ERR_FIN_INVOICE_NOT_PAYABLE`              |  409 | Invoice is not in a payable state.                                    |
| `ERR_FIN_PAYMENT_REFERENCE_REQUIRED`       |  422 | Payment reference is required for this payment method.                |
| `ERR_FIN_CHEQUE_DETAILS_REQUIRED`          |  422 | Cheque details are incomplete.                                        |
| `ERR_FIN_PROHIBITED_CARD_DATA`             |  422 | Prohibited cardholder data must not be submitted or stored.           |
| `ERR_FIN_PAYMENT_DATE_INVALID`             |  422 | Payment date is outside allowed bounds.                               |
| `ERR_FIN_IDEMPOTENCY_CONFLICT`             |  409 | Idempotency key was reused with different request content.            |
| `ERR_FIN_PAYMENT_POSTING_FAILED`           |  500 | Payment posting failed and no partial financial update was committed. |
| `ERR_FIN_DUPLICATE_RECEIPT`                |  409 | A receipt already exists for this payment.                            |
| `ERR_FIN_RECEIPT_NOT_FOUND`                |  404 | Receipt was not found.                                                |
| `ERR_FIN_DOCUMENT_RENDER_FAILED`           |  500 | Financial document could not be rendered.                             |

### 4.4 Refund Errors

| Error Code                            | HTTP | Message                                                  |
| ------------------------------------- | ---: | -------------------------------------------------------- |
| `ERR_FIN_REFUND_NOT_FOUND`            |  404 | Refund was not found.                                    |
| `ERR_FIN_PAYMENT_NOT_REFUNDABLE`      |  409 | Payment is not refundable.                               |
| `ERR_FIN_REFUND_AMOUNT_INVALID`       |  422 | Refund amount must be greater than zero.                 |
| `ERR_FIN_REFUND_EXCEEDS_REFUNDABLE`   |  422 | Refund exceeds the remaining refundable payment balance. |
| `ERR_FIN_REFUND_TYPE_AMOUNT_MISMATCH` |  422 | Refund amount does not match the selected refund type.   |
| `ERR_FIN_REFUND_REASON_REQUIRED`      |  422 | Refund reason is incomplete.                             |
| `ERR_FIN_DUPLICATE_REFUND_REQUEST`    |  409 | Equivalent open refund request already exists.           |
| `ERR_FIN_REFUND_INVALID_STATE`        |  409 | Refund is not in a state that allows this decision.      |
| `ERR_FIN_REFUND_SELF_APPROVAL`        |  409 | Refund requester cannot approve the same refund.         |
| `ERR_FIN_REFUND_NOT_APPROVED`         |  409 | Refund must be approved before execution.                |
| `ERR_FIN_REFUND_ALREADY_EXECUTED`     |  409 | Refund has already been executed.                        |
| `ERR_FIN_REFUND_REFERENCE_REQUIRED`   |  422 | Refund execution reference is required.                  |

### 4.5 Receivable, Credit, Report, and Concurrency Errors

| Error Code                                   | HTTP | Message                                                              |
| -------------------------------------------- | ---: | -------------------------------------------------------------------- |
| `ERR_FIN_RECEIVABLE_DUPLICATE`               |  409 | Active receivable already exists for invoice.                        |
| `ERR_FIN_RECEIVABLE_RECONCILIATION_FAILED`   |  500 | Receivable balance reconciliation failed.                            |
| `ERR_FIN_AGING_CALCULATION_FAILED`           |  500 | Receivable aging calculation failed.                                 |
| `ERR_FIN_AGING_BUCKET_INVALID`               |  500 | Receivable aging bucket is inconsistent with days past due.          |
| `ERR_FIN_RECEIVABLE_STATUS_INVALID`          |  409 | Receivable status is inconsistent with outstanding balance.          |
| `ERR_FIN_CREDIT_RULE_NOT_FOUND`              |  404 | Applicable corporate credit rule was not found.                      |
| `ERR_FIN_CORPORATE_ACCOUNT_NOT_FOUND`        |  404 | Corporate account was not found.                                     |
| `ERR_FIN_CREDIT_LIMIT_INVALID`               |  422 | Corporate credit limit is invalid.                                   |
| `ERR_FIN_EFFECTIVE_DATE_INVALID`             |  422 | Effective date range is invalid.                                     |
| `ERR_FIN_CREDIT_RULE_OVERLAP`                |  409 | Effective corporate credit rule overlaps an existing rule.           |
| `ERR_FIN_MULTIPLE_CREDIT_RULES_ACTIVE`       |  500 | Multiple active credit rules resolved for the same date.             |
| `ERR_FIN_CREDIT_LIMIT_EXCEEDED`              |  422 | Corporate credit limit would be exceeded and blocking is enabled.    |
| `ERR_FIN_CREDIT_CURRENCY_MISMATCH`           |  422 | Corporate credit currency does not match proposed exposure currency. |
| `ERR_FIN_CREDIT_EXPOSURE_CALCULATION_FAILED` |  500 | Corporate credit exposure could not be calculated.                   |
| `ERR_FIN_CONCURRENCY_CONFLICT`               |  409 | Record changed since it was loaded. Refresh and retry.               |
| `ERR_FIN_INVALID_DATE_RANGE`                 |  422 | Date range is invalid.                                               |
| `ERR_FIN_REPORT_PERIOD_INVALID`              |  422 | Report period is invalid.                                            |
| `ERR_FIN_EXPORT_NOT_ALLOWED`                 |  403 | Export is not permitted.                                             |
| `ERR_FIN_EXPORT_FILTER_INVALID`              |  422 | Export filter is invalid.                                            |
| `ERR_FIN_EXPORT_ROW_LIMIT_EXCEEDED`          |  422 | Export result exceeds configured row limit.                          |
| `ERR_FIN_EXPORT_GENERATION_FAILED`           |  500 | Export generation failed.                                            |
| `ERR_FIN_INTERNAL`                           |  500 | An unexpected finance processing error occurred.                     |

## 5. Notification Event Model

Finance owns source transaction state. Communication & Notification owns channel templates, rendering, provider delivery, retries, delivery status, and communication history. Finance publishes internal events or NotificationRequested commands containing minimum necessary variables.

### 5.1 Channel Rules

| Channel             | Use                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Email               | Formal invoice, receipt, overdue, refund decision, and corporate exposure communication.                                |
| SMS                 | Concise payment confirmation, installment due, and overdue reminders.                                                   |
| WhatsApp            | Optional concise reminder and document-link notifications when recipient consent and valid channel configuration exist. |
| System Notification | Admin operational alerts, credit warnings, refund approval tasks, and reconciliation failures.                          |

Notification dispatch must honor communication consent, valid recipient contact, configured template, locale preference, and channel availability. Missing optional channel contact does not roll back the source financial transaction.

## 6. Notification Events and Exact Template Variables

### 6.1 `InvoiceGenerated`

**Trigger:** Invoice successfully transitions to Issued.

**Recipients:** Student or payer contact for student invoice; primary corporate billing contact for corporate invoice; optional internal account owner.

**Channels:** Email required when valid email exists; SMS and WhatsApp optional by preference/configuration.

**Template codes:**

- `FIN_INVOICE_ISSUED_EMAIL_EN`
- `FIN_INVOICE_ISSUED_EMAIL_AR`
- `FIN_INVOICE_ISSUED_SMS_EN`
- `FIN_INVOICE_ISSUED_SMS_AR`
- `FIN_INVOICE_ISSUED_WA_EN`
- `FIN_INVOICE_ISSUED_WA_AR`

**Exact variables:**

```text
recipientDisplayName
invoiceId
invoiceNumber
invoiceType
invoiceDate
invoiceDueDate
currency
subtotal
invoiceDiscountAmount
invoiceTaxAmount
invoiceTotalAmount
invoicePaidAmount
invoiceOutstandingAmount
studentNumber
studentDisplayName
corporateAccountCode
corporateAccountName
courseCode
courseNameEn
courseNameAr
batchCode
branchCode
branchNameEn
branchNameAr
instituteLegalNameEn
instituteLegalNameAr
taxRegistrationNumber
invoiceDocumentUrl
supportPhone
supportEmail
locale
```

### 6.2 `PaymentRecorded`

**Trigger:** Payment posting transaction commits successfully.

**Recipients:** Payer; optional internal finance acknowledgement.

**Channels:** Email, SMS, WhatsApp according to preference.

**Template codes:** `FIN_PAYMENT_RECORDED_EMAIL_EN`, `FIN_PAYMENT_RECORDED_EMAIL_AR`, `FIN_PAYMENT_RECORDED_SMS_EN`, `FIN_PAYMENT_RECORDED_SMS_AR`, `FIN_PAYMENT_RECORDED_WA_EN`, `FIN_PAYMENT_RECORDED_WA_AR`.

**Exact variables:**

```text
recipientDisplayName
paymentId
paymentNumber
paymentDate
paymentMethod
paymentAmount
paymentReferenceNumber
currency
invoiceId
invoiceNumber
invoiceTotalAmount
invoicePaidAmountAfterPosting
invoiceOutstandingAmountAfterPosting
receiptId
receiptNumber
receiptDocumentUrl
branchCode
branchNameEn
branchNameAr
supportPhone
supportEmail
locale
```

### 6.3 `ReceiptGenerated`

**Trigger:** Receipt created exactly once inside successful Payment posting transaction.

**Recipients:** Payer.

**Channels:** Email preferred; WhatsApp optional; SMS may carry receipt number and secure document link.

**Template codes:** `FIN_RECEIPT_ISSUED_EMAIL_EN`, `FIN_RECEIPT_ISSUED_EMAIL_AR`, `FIN_RECEIPT_ISSUED_SMS_EN`, `FIN_RECEIPT_ISSUED_SMS_AR`, `FIN_RECEIPT_ISSUED_WA_EN`, `FIN_RECEIPT_ISSUED_WA_AR`.

**Exact variables:**

```text
recipientDisplayName
receiptId
receiptNumber
receiptDate
receiptAmount
currency
paymentId
paymentNumber
paymentMethod
invoiceId
invoiceNumber
invoiceOutstandingAmount
amountInWordsEn
amountInWordsAr
receiptDocumentUrl
branchNameEn
branchNameAr
instituteLegalNameEn
instituteLegalNameAr
taxRegistrationNumber
locale
```

### 6.4 `InstallmentDue`

**Trigger:** Configured reminder window before unpaid or partially paid installment due date.

**Recipients:** Payer.

**Channels:** Email, SMS, WhatsApp.

**Template codes:** `FIN_INSTALLMENT_DUE_EMAIL_EN`, `FIN_INSTALLMENT_DUE_EMAIL_AR`, `FIN_INSTALLMENT_DUE_SMS_EN`, `FIN_INSTALLMENT_DUE_SMS_AR`, `FIN_INSTALLMENT_DUE_WA_EN`, `FIN_INSTALLMENT_DUE_WA_AR`.

**Exact variables:**

```text
recipientDisplayName
installmentPlanId
planName
installmentId
installmentSequenceNumber
installmentDueDate
installmentAmount
installmentPaidAmount
installmentOutstandingAmount
currency
invoiceId
invoiceNumber
invoiceOutstandingAmount
studentNumber
studentDisplayName
corporateAccountCode
corporateAccountName
branchNameEn
branchNameAr
supportPhone
supportEmail
locale
```

### 6.5 `InvoiceOverdue`

**Trigger:** Receivable changes into overdue condition or periodic reminder policy determines reminder is due.

**Recipients:** Student payer or corporate billing contact; internal account owner where configured.

**Channels:** Email, SMS, WhatsApp, System Notification for internal owner.

**Template codes:** `FIN_INVOICE_OVERDUE_EMAIL_EN`, `FIN_INVOICE_OVERDUE_EMAIL_AR`, `FIN_INVOICE_OVERDUE_SMS_EN`, `FIN_INVOICE_OVERDUE_SMS_AR`, `FIN_INVOICE_OVERDUE_WA_EN`, `FIN_INVOICE_OVERDUE_WA_AR`, `FIN_INVOICE_OVERDUE_SYSTEM_EN`, `FIN_INVOICE_OVERDUE_SYSTEM_AR`.

**Exact variables:**

```text
recipientDisplayName
invoiceId
invoiceNumber
invoiceDate
invoiceDueDate
daysPastDue
agingBucket
invoiceTotalAmount
invoicePaidAmount
invoiceOutstandingAmount
currency
studentNumber
studentDisplayName
corporateAccountCode
corporateAccountName
accountManagerDisplayName
branchNameEn
branchNameAr
paymentInstructionsEn
paymentInstructionsAr
supportPhone
supportEmail
locale
```

### 6.6 `RefundRequested`

**Trigger:** Refund record created in Requested state and ApprovalRequest created.

**Recipients:** Configured approver or approval group; requester receives acknowledgement.

**Channels:** System Notification required for approver; Email optional.

**Template codes:** `FIN_REFUND_REQUEST_APPROVER_SYSTEM_EN`, `FIN_REFUND_REQUEST_APPROVER_SYSTEM_AR`, `FIN_REFUND_REQUESTED_EMAIL_EN`, `FIN_REFUND_REQUESTED_EMAIL_AR`.

**Exact variables:**

```text
refundId
refundNumber
refundType
refundAmount
currency
refundReasonCode
refundReason
invoiceId
invoiceNumber
paymentId
paymentNumber
paymentAmount
remainingRefundableAmount
requestedByUserId
requestedByDisplayName
requestedAt
approvalRequestId
approvalActionUrl
branchCode
branchNameEn
branchNameAr
locale
```

### 6.7 `RefundApproved`

**Trigger:** Authorized approver changes refund to Approved.

**Recipients:** Requester, Finance execution team, payer when configured.

**Channels:** System Notification to execution team; Email to requester/payer; SMS or WhatsApp optional for payer.

**Template codes:** `FIN_REFUND_APPROVED_SYSTEM_EN`, `FIN_REFUND_APPROVED_SYSTEM_AR`, `FIN_REFUND_APPROVED_EMAIL_EN`, `FIN_REFUND_APPROVED_EMAIL_AR`, `FIN_REFUND_APPROVED_SMS_EN`, `FIN_REFUND_APPROVED_SMS_AR`.

**Exact variables:**

```text
recipientDisplayName
refundId
refundNumber
refundType
refundAmount
currency
invoiceNumber
paymentNumber
approvedByUserId
approvedByDisplayName
approvedAt
approvalRemarks
refundStatus
executionActionUrl
branchNameEn
branchNameAr
supportPhone
supportEmail
locale
```

### 6.8 `RefundRejected`

**Trigger:** Authorized approver changes refund to Rejected.

**Recipients:** Requester; payer only when business policy requires customer notification.

**Channels:** Email and System Notification; SMS/WhatsApp optional.

**Template codes:** `FIN_REFUND_REJECTED_EMAIL_EN`, `FIN_REFUND_REJECTED_EMAIL_AR`, `FIN_REFUND_REJECTED_SYSTEM_EN`, `FIN_REFUND_REJECTED_SYSTEM_AR`.

**Exact variables:**

```text
recipientDisplayName
refundId
refundNumber
refundAmount
currency
invoiceNumber
paymentNumber
rejectedByDisplayName
rejectedAt
rejectionRemarks
refundStatus
branchNameEn
branchNameAr
supportPhone
supportEmail
locale
```

### 6.9 `RefundExecuted`

**Trigger:** Approved refund execution transaction commits.

**Recipients:** Payer, requester, Finance Manager.

**Channels:** Email; SMS and WhatsApp optional; System Notification for internal stakeholders.

**Template codes:** `FIN_REFUND_EXECUTED_EMAIL_EN`, `FIN_REFUND_EXECUTED_EMAIL_AR`, `FIN_REFUND_EXECUTED_SMS_EN`, `FIN_REFUND_EXECUTED_SMS_AR`, `FIN_REFUND_EXECUTED_WA_EN`, `FIN_REFUND_EXECUTED_WA_AR`.

**Exact variables:**

```text
recipientDisplayName
refundId
refundNumber
refundAmount
currency
executionDate
executionMethod
externalReference
invoiceId
invoiceNumber
invoiceOutstandingAmountAfterRefund
paymentId
paymentNumber
branchNameEn
branchNameAr
supportPhone
supportEmail
locale
```

### 6.10 `CorporateCreditValidationFailed`

**Trigger:** Corporate credit validation decision is Block.

**Recipients:** Corporate Account Manager, Finance Manager, enrollment initiator.

**Channels:** System Notification required; Email optional.

**Template codes:** `FIN_CREDIT_BLOCK_SYSTEM_EN`, `FIN_CREDIT_BLOCK_SYSTEM_AR`, `FIN_CREDIT_BLOCK_EMAIL_EN`, `FIN_CREDIT_BLOCK_EMAIL_AR`.

**Exact variables:**

```text
corporateAccountId
corporateAccountCode
corporateAccountName
creditLimit
currentOutstanding
committedAmount
proposedEnrollmentValue
projectedExposure
availableCreditBeforeProposal
availableCreditAfterProposal
currency
blockOnCreditLimit
validationDate
sourceReferenceId
enrollmentInitiatorDisplayName
branchCode
branchNameEn
branchNameAr
creditExposureUrl
locale
```

### 6.11 `CorporateCreditLimitWarning`

**Trigger:** Exposure exceeds credit limit but `blockOnCreditLimit=false`, resulting in AllowWithWarning.

**Recipients:** Finance Manager, Corporate Account Manager, enrollment initiator.

**Channels:** System Notification and Email.

**Template codes:** `FIN_CREDIT_WARNING_SYSTEM_EN`, `FIN_CREDIT_WARNING_SYSTEM_AR`, `FIN_CREDIT_WARNING_EMAIL_EN`, `FIN_CREDIT_WARNING_EMAIL_AR`.

**Exact variables:** same variables as `CorporateCreditValidationFailed` plus `decision` and `warningReasonCode`.

### 6.12 `ReceivableAgingThresholdCrossed`

**Trigger:** Receivable moves to a more severe aging bucket during GST business-date recalculation.

**Recipients:** Assigned Accountant, Finance Manager, Corporate Account Manager when corporate-linked.

**Channels:** System Notification; Email optional for internal digest policy.

**Template codes:** `FIN_AGING_THRESHOLD_SYSTEM_EN`, `FIN_AGING_THRESHOLD_SYSTEM_AR`, `FIN_AGING_THRESHOLD_EMAIL_EN`, `FIN_AGING_THRESHOLD_EMAIL_AR`.

**Exact variables:**

```text
receivableId
invoiceId
invoiceNumber
customerType
customerDisplayName
studentNumber
corporateAccountCode
dueDate
daysPastDue
previousAgingBucket
currentAgingBucket
outstandingAmount
currency
branchCode
branchNameEn
branchNameAr
receivableDetailUrl
locale
```

## 7. Notification Deduplication and Delivery Rules

1. Every notification request has a deterministic business key: `eventType + sourceEntityId + eventVersion + recipientPersonId + channel + templateCode`.
2. Communication rejects duplicate active requests with the same business key.
3. Finance transaction success never depends on successful external Email, SMS, or WhatsApp delivery.
4. NotificationRequest creation may be in the same local transaction or a post-commit internal job handoff, but no external broker is required.
5. Failed delivery is retried by Communication according to its own runbook and does not mutate Finance state.
6. Notification payloads must not include civil ID, passport, visa number, full card data, password data, or unrestricted audit details.
7. Secure document URLs must be signed, short-lived, and authorization-aware; permanent public receipt links are prohibited.
8. Locale resolves from User/Person preference, then request context, then institute default language.
9. Date formatting follows locale presentation while underlying business date remains ISO `YYYY-MM-DD`.
10. English templates render LTR; Arabic templates render RTL; invoice numbers, receipt numbers, payment references, dates, decimal amounts, and URLs use bidi isolation.

## 8. Validation and Error Handling Acceptance Criteria

1. All command payloads are rejected before application execution when Zod validation fails.
2. Monetary arithmetic uses Decimal and never JavaScript binary floating point for authoritative calculations.
3. All state transitions are validated against persisted state inside the transaction.
4. Expected-version mismatch produces `ERR_FIN_CONCURRENCY_CONFLICT` and commits no partial change.
5. Payment failure rolls back Payment, PaymentAllocation, Invoice, Installment, Receivable, and Receipt effects together.
6. Refund execution preserves original Payment and allocation history.
7. Corporate credit rule overlap is prevented transactionally.
8. Aging uses Asia/Muscat business date and documented bucket compatibility mapping.
9. Error codes are stable, machine-readable, and not localized; user-visible messages may be localized by client or message catalog.
10. Authorization errors do not reveal inaccessible resource existence.
11. Notifications use exact declared template variables and minimum necessary data.
12. Missing Email, SMS, or WhatsApp delivery capability does not roll back committed Finance transactions.
13. Every notification event is deduplicated by source entity and event version.
14. Sensitive finance mutation failures are logged with correlation ID without logging full payment references or prohibited card data.
