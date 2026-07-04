# Part 9 – BDD Acceptance Criteria and Test Scenarios

## Module 12 – Fee, Billing & Receivables Management

## 1. Purpose and Test Scope

This document defines executable-behavior acceptance criteria for Module 12 – Fee, Billing & Receivables Management. Scenarios cover positive flows, negative flows, boundary values, validation failures, state transitions, authorization, branch isolation, student self-service ownership, bilingual behavior, reporting, exports, concurrency, idempotency, auditing, and cross-module contracts.

All date-sensitive scenarios use `Asia/Muscat` unless explicitly stated. Monetary values in OMR use three decimal places. Scenario identifiers are stable references for traceability.

## 2. Test Data Conventions

The examples use the following symbolic fixtures:

| Fixture | Meaning |
|---|---|
| BR-A | Muscat branch directly assigned to User A |
| BR-B | Sohar branch not assigned to User A |
| BR-C | Child branch of BR-A |
| STU-A | StudentProfile linked to Person A |
| STU-B | Different StudentProfile |
| ENR-A | Confirmed enrollment for STU-A in BR-A |
| ENR-B | Confirmed enrollment in BR-B |
| CORP-A | Corporate account managed by Corporate Account Manager A |
| CORP-B | Unmanaged corporate account |
| INV-A | Invoice in BR-A |
| INV-B | Invoice in BR-B |
| PAY-A | Posted payment against INV-A |
| USER-ACC-A | Accountant assigned to BR-A |
| USER-FM-A | Finance Manager assigned to BR-A |
| USER-EXEC-C | Executive with consolidated permission and entitlement |
| USER-EXEC-N | Executive permission without IAM consolidated entitlement |

## 3. Feature: Student Invoice Creation and Commercial Snapshot

```gherkin
Feature: Student invoice creation from confirmed enrollment
  As an authorized finance user
  I want to create an invoice from an eligible enrollment
  So that billing is traceable to an immutable commercial snapshot

  Background:
    Given the user is authenticated
    And the user has permission "finance.invoice.create"
    And the enrollment belongs to an authorized branch

  @FR-FBR-001 @positive
  Scenario: Create a student invoice from a confirmed enrollment
    Given enrollment "ENR-A" is Confirmed
    And "ENR-A" has a valid resolved price of OMR 100.000
    And "ENR-A" has a resolved discount of OMR 10.000
    And the applicable tax amount is OMR 4.500
    And no active single-bill invoice exists for the enrollment
    When the user creates a StudentInvoice for "ENR-A"
    Then the system creates the invoice in Draft status
    And the invoice line references "ENR-A"
    And the invoice line commercial values are copied into the invoice snapshot
    And the invoice subtotal is OMR 100.000
    And the invoice discountAmount is OMR 10.000
    And the invoice taxAmount is OMR 4.500
    And the invoice totalAmount is OMR 94.500
    And the invoice paidAmount is OMR 0.000
    And the invoice outstandingAmount is OMR 94.500
    And an audit record is created for the invoice creation

  @FR-FBR-001 @negative
  Scenario Outline: Reject invoice creation from ineligible enrollment state
    Given enrollment "ENR-A" has status "<status>"
    When the user attempts to create a StudentInvoice for "ENR-A"
    Then the request is rejected with HTTP 422
    And the response contains application error code "ERR_FIN_ENROLLMENT_NOT_BILLABLE"
    And no Invoice is created

    Examples:
      | status |
      | Draft |
      | Submitted |
      | Cancelled |
      | Dropped |

  @FR-FBR-001 @negative
  Scenario: Reject duplicate billing of a single-bill enrollment source
    Given an active invoice already bills enrollment "ENR-A"
    When the user attempts to create another single-bill invoice for "ENR-A"
    Then the request is rejected with HTTP 409
    And the error code is "ERR_FIN_DUPLICATE_BILLING_SOURCE"
```

## 4. Feature: Corporate Consolidated Invoicing

```gherkin
Feature: Corporate invoice creation
  As an authorized finance user
  I want to invoice eligible corporate enrollments
  So that corporate billing preserves line-level enrollment traceability

  @FR-FBR-002 @positive
  Scenario: Create corporate invoice for multiple eligible enrollments
    Given corporate account "CORP-A" has three confirmed billable enrollments in the authorized billing scope
    And all three enrollments use currency "OMR"
    And no source enrollment is already billed under a single-bill rule
    When the user creates a CorporateInvoice containing the three source enrollments
    Then one Draft CorporateInvoice is created
    And each source enrollment is represented by a traceable invoice line
    And the header totals equal canonical sums of all invoice lines

  @FR-FBR-002 @validation
  Scenario: Reject consolidated invoice containing mixed currencies
    Given one source enrollment resolves to currency "OMR"
    And another source enrollment resolves to currency "USD"
    When the user submits both sources in one corporate invoice
    Then the request is rejected with HTTP 422
    And the error code is "ERR_FIN_CURRENCY_MISMATCH"
    And no invoice is persisted

  @FR-FBR-002 @branch-isolation
  Scenario: Reject corporate invoice containing an unauthorized branch source
    Given the user is authorized for BR-A only
    And a corporate invoice request includes one enrollment from BR-A
    And the same request includes one enrollment from BR-B
    When the request is submitted
    Then the request is rejected with HTTP 403
    And the error code is "ERR_FIN_BRANCH_SCOPE_DENIED"
    And no partial invoice is created
```

## 5. Feature: Invoice Arithmetic and Boundary Validation

```gherkin
Feature: Deterministic invoice arithmetic

  @FR-FBR-003 @boundary
  Scenario Outline: Calculate a valid invoice line
    Given quantity is <quantity>
    And unitPrice is <unitPrice>
    And discountAmount is <discount>
    And taxAmount is <tax>
    When the line is calculated
    Then lineTotal equals <expectedTotal>

    Examples:
      | quantity | unitPrice | discount | tax | expectedTotal |
      | 1.000 | 100.000 | 0.000 | 5.000 | 105.000 |
      | 2.500 | 10.000 | 5.000 | 1.000 | 21.000 |
      | 1.000 | 0.001 | 0.000 | 0.000 | 0.001 |

  @FR-FBR-003 @negative
  Scenario Outline: Reject invalid line value bounds
    Given a line has quantity <quantity>, unit price <unitPrice>, discount <discount>
    When validation runs
    Then the request is rejected with error code "<errorCode>"

    Examples:
      | quantity | unitPrice | discount | errorCode |
      | 0.000 | 10.000 | 0.000 | ERR_FIN_LINE_QUANTITY_INVALID |
      | -1.000 | 10.000 | 0.000 | ERR_FIN_LINE_QUANTITY_INVALID |
      | 1.000 | -0.001 | 0.000 | ERR_FIN_UNIT_PRICE_INVALID |
      | 1.000 | 10.000 | 10.001 | ERR_FIN_DISCOUNT_EXCEEDS_GROSS |

  @FR-FBR-003 @negative
  Scenario: Reject caller-provided header totals that do not match canonical calculations
    Given canonical invoice total is OMR 94.500
    And the request claims totalAmount OMR 94.501
    When the invoice is validated
    Then the request is rejected with "ERR_FIN_INVOICE_TOTAL_MISMATCH"
    And the persisted aggregate remains unchanged

  @FR-FBR-003 @boundary
  Scenario: Accept maximum supported invoice line count
    Given a valid Draft invoice request contains 500 lines
    When the user validates and issues the invoice
    Then line-count validation passes

  @FR-FBR-003 @boundary
  Scenario: Reject invoice line count above supported maximum
    Given a Draft invoice contains 501 lines
    When issuance is attempted
    Then the request is rejected with "ERR_FIN_INVOICE_NOT_BALANCED"
```

## 6. Feature: Numbering Series and Invoice Issue

```gherkin
Feature: Branch-aware invoice numbering and issue

  @FR-FBR-004 @FR-FBR-030 @positive
  Scenario: Issue a valid draft invoice
    Given a balanced Draft invoice in BR-A
    And an active invoice NumberingSeries exists for BR-A
    When an authorized user issues the invoice
    Then a unique invoice number is assigned atomically
    And the invoice status becomes Issued
    And the issue timestamp uses GST business time
    And the action is audited

  @FR-FBR-004 @negative
  Scenario: Reject issue when numbering series is unavailable
    Given a balanced Draft invoice in BR-A
    And no active invoice NumberingSeries resolves for BR-A
    When the user attempts to issue the invoice
    Then the request is rejected
    And the invoice remains Draft
    And no partial number reservation is exposed as an issued invoice

  @FR-FBR-004 @concurrency
  Scenario: Generate unique invoice numbers during concurrent issue requests
    Given two valid Draft invoices in the same numbering scope
    When both invoices are issued concurrently
    Then each invoice receives a different invoice number
    And the numbering sequence advances without duplicate numbers
```

## 7. Feature: Invoice Search, Filtering, Sorting, and Paging

```gherkin
Feature: Branch-scoped invoice search

  @FR-FBR-005 @positive
  Scenario: Search invoices with stable pagination
    Given USER-ACC-A has invoice read access to BR-A
    And 125 invoices exist in BR-A
    When the user requests page size 50 sorted by invoiceDate descending
    Then at most 50 rows are returned
    And every returned invoice belongs to BR-A or an explicitly authorized expansion
    And the paging cursor or stable offset metadata supports retrieving the next page
    And a stable secondary ordering prevents duplicate or skipped rows

  @FR-FBR-005 @validation
  Scenario: Reject unsupported page size
    When the user requests pageSize 1000
    Then the request is rejected with a validation error

  @FR-FBR-005 @branch-isolation
  Scenario: Search totals exclude unauthorized branch records
    Given BR-A has 10 matching invoices
    And BR-B has 50 matching invoices
    And USER-ACC-A is authorized only for BR-A
    When USER-ACC-A searches without specifying a branch filter
    Then exactly the BR-A result count is represented in total metadata
    And no BR-B invoice identifier is returned
```

## 8. Feature: Installment Plan Creation and Validation

```gherkin
Feature: Installment plan management

  @FR-FBR-006 @positive
  Scenario: Create a valid installment plan
    Given INV-A is eligible for an installment plan
    And no active installment plan exists for INV-A
    When the user creates a plan with installments OMR 50.000 due 2026-08-01 and OMR 50.000 due 2026-09-01
    Then one active InstallmentPlan is created
    And sequence numbers are 1 and 2
    And total installment amount equals OMR 100.000

  @FR-FBR-006 @boundary
  Scenario Outline: Validate installment count bounds
    Given a plan contains <count> installments
    When the plan is validated
    Then validation outcome is "<outcome>"

    Examples:
      | count | outcome |
      | 1 | rejected |
      | 2 | accepted |
      | 120 | accepted |
      | 121 | rejected |

  @FR-FBR-006 @negative
  Scenario: Reject a second active installment plan for the same invoice
    Given INV-A already has an active installment plan
    When the user creates another active plan for INV-A
    Then the request is rejected with "ERR_FIN_INSTALLMENT_PLAN_EXISTS"

  @FR-FBR-006 @negative
  Scenario: Reject installment schedule with non-contiguous sequence
    Given a plan contains sequences 1, 2, and 4
    When validation runs
    Then the request is rejected with "ERR_FIN_INSTALLMENT_SEQUENCE_INVALID"

  @FR-FBR-006 @negative
  Scenario: Reject decreasing installment due dates
    Given installment 1 is due 2026-09-01
    And installment 2 is due 2026-08-01
    When validation runs
    Then the request is rejected with "ERR_FIN_INSTALLMENT_DATE_ORDER_INVALID"

  @FR-FBR-006 @boundary
  Scenario: Accept installment total within exact OMR rounding tolerance
    Given plan basis amount is OMR 100.000
    And canonical installment amounts sum to OMR 100.000
    When validation runs
    Then the schedule is accepted

  @FR-FBR-006 @negative
  Scenario: Reject installment sum mismatch above tolerance
    Given plan basis amount is OMR 100.000
    And installment amounts sum to OMR 99.998
    When validation runs
    Then the request is rejected with "ERR_FIN_INSTALLMENT_SUM_MISMATCH"
```

## 9. Feature: Installment Status Derivation

```gherkin
Feature: Installment status derivation from allocations

  @FR-FBR-007 @scenario-outline
  Scenario Outline: Derive installment status
    Given installment amount is OMR 100.000
    And paidAmount is <paidAmount>
    And dueDate is <dueDate>
    And GST business date is 2026-07-04
    When installment status is derived
    Then status is "<status>"

    Examples:
      | paidAmount | dueDate | status |
      | 0.000 | 2026-07-10 | Pending |
      | 50.000 | 2026-07-10 | PartiallyPaid |
      | 100.000 | 2026-07-01 | Paid |
      | 0.000 | 2026-07-01 | Overdue |
      | 50.000 | 2026-07-01 | Overdue |

  @FR-FBR-007 @negative
  Scenario: Reject installment paid amount greater than installment amount
    Given installment amount is OMR 100.000
    And attempted paidAmount is OMR 100.001
    When validation runs
    Then the request is rejected with "ERR_FIN_INSTALLMENT_OVERALLOCATION"
```

## 10. Feature: Manual Payment Posting

```gherkin
Feature: Record authorized manual payments

  Background:
    Given the user is authenticated
    And the user has permission "finance.payment.record"
    And INV-A belongs to an authorized mutation branch

  @FR-FBR-008 @FR-FBR-011 @positive
  Scenario: Record full cash payment and settle invoice atomically
    Given INV-A is Issued with outstandingAmount OMR 100.000
    When the user records a Cash payment of OMR 100.000
    Then Payment is persisted with amount OMR 100.000
    And payment allocations sum to OMR 100.000
    And INV-A paidAmount becomes OMR 100.000
    And INV-A outstandingAmount becomes OMR 0.000
    And INV-A status becomes Paid
    And the Receivable becomes Settled with outstandingAmount OMR 0.000
    And exactly one active Receipt is created
    And all effects commit in one transaction

  @FR-FBR-011 @positive
  Scenario: Record partial payment
    Given INV-A is Issued with outstandingAmount OMR 100.000
    When the user records a payment of OMR 40.000
    Then INV-A paidAmount increases by OMR 40.000
    And INV-A outstandingAmount becomes OMR 60.000
    And INV-A status becomes PartiallyPaid
    And the active Receivable outstandingAmount becomes OMR 60.000

  @FR-FBR-009 @negative
  Scenario Outline: Reject payment amount outside valid bounds
    Given INV-A outstandingAmount is OMR 100.000
    When a payment of <amount> is submitted
    Then the request is rejected with "<errorCode>"

    Examples:
      | amount | errorCode |
      | 0.000 | ERR_FIN_PAYMENT_AMOUNT_INVALID |
      | -1.000 | ERR_FIN_PAYMENT_AMOUNT_INVALID |
      | 100.001 | ERR_FIN_PAYMENT_EXCEEDS_OUTSTANDING |

  @FR-FBR-009 @negative
  Scenario Outline: Require external payment reference by method
    Given INV-A is payable
    When a <method> payment is submitted without required reference data
    Then the request is rejected with "<errorCode>"

    Examples:
      | method | errorCode |
      | BankTransfer | ERR_FIN_PAYMENT_REFERENCE_REQUIRED |
      | Card | ERR_FIN_PAYMENT_REFERENCE_REQUIRED |
      | Online | ERR_FIN_PAYMENT_REFERENCE_REQUIRED |
      | Cheque | ERR_FIN_CHEQUE_DETAILS_REQUIRED |

  @FR-FBR-009 @positive
  Scenario: Permit cash payment without external reference
    Given INV-A is payable
    When a Cash payment of OMR 10.000 is submitted without referenceNumber
    Then payment reference validation passes

  @FR-FBR-009 @security
  Scenario: Reject prohibited full card PAN data
    Given a Card payment request contains a full PAN or CVV field
    When validation runs
    Then the request is rejected with "ERR_FIN_PROHIBITED_CARD_DATA"
    And prohibited card data is not persisted or logged

  @FR-FBR-009 @boundary
  Scenario Outline: Validate payment date boundaries
    Given invoiceDate is 2026-07-01
    And current GST business date is 2026-07-04
    When paymentDate is <paymentDate>
    Then the outcome is "<outcome>"

    Examples:
      | paymentDate | outcome |
      | 2026-06-30 | rejected |
      | 2026-07-01 | accepted |
      | 2026-07-04 | accepted |
      | 2026-07-05 | accepted within one-business-day future rule |
      | 2026-07-06 | rejected |

  @FR-FBR-009 @negative
  Scenario Outline: Reject payment for non-payable invoice states
    Given INV-A status is "<status>"
    When a payment is submitted
    Then the request is rejected with "ERR_FIN_INVOICE_NOT_PAYABLE"

    Examples:
      | status |
      | Draft |
      | Cancelled |
      | Paid |
```

## 11. Feature: Payment Allocation and Atomicity

```gherkin
Feature: Payment allocation integrity

  @FR-FBR-008 @positive
  Scenario: Allocate one payment across multiple installments
    Given INV-A has two unpaid installments of OMR 50.000 each
    When a payment of OMR 75.000 is posted with OMR 50.000 allocated to installment 1 and OMR 25.000 to installment 2
    Then installment 1 becomes Paid
    And installment 2 becomes PartiallyPaid
    And payment allocation sum equals OMR 75.000
    And invoice balances are updated atomically

  @FR-FBR-009 @negative
  Scenario: Reject payment allocation sum mismatch
    Given payment amount is OMR 75.000
    And requested allocations sum to OMR 74.999
    When payment posting is attempted
    Then the request is rejected with "ERR_FIN_PAYMENT_ALLOCATION_MISMATCH"
    And no payment effects are committed

  @FR-FBR-009 @negative
  Scenario: Reject installment over-allocation
    Given an installment has remaining amount OMR 25.000
    When an allocation of OMR 25.001 is submitted
    Then the request is rejected with "ERR_FIN_INSTALLMENT_OVERALLOCATION"

  @FR-FBR-008 @transaction
  Scenario: Roll back all payment effects if receipt creation fails
    Given INV-A has outstandingAmount OMR 100.000
    And receipt persistence fails inside payment posting transaction
    When a payment of OMR 100.000 is posted
    Then the Payment is not committed
    And no PaymentAllocation is committed
    And invoice balances remain unchanged
    And installment balances remain unchanged
    And receivable balance remains unchanged
    And no partial receipt exists
    And the request returns "ERR_FIN_PAYMENT_POSTING_FAILED"
```

## 12. Feature: Payment Idempotency and Optimistic Concurrency

```gherkin
Feature: Prevent duplicate financial posting

  @FR-FBR-008 @idempotency
  Scenario: Repeat identical payment request with same idempotency key
    Given a payment request has idempotency key "idem-001"
    And the request has already completed successfully
    When the exact canonical request is repeated with key "idem-001"
    Then the original successful response is returned
    And no second Payment is created
    And no second Receipt is created

  @FR-FBR-008 @idempotency-negative
  Scenario: Reuse idempotency key with different request payload
    Given key "idem-001" was used for a payment of OMR 50.000
    When key "idem-001" is reused for a payment of OMR 60.000
    Then the request is rejected with HTTP 409
    And the error code is "ERR_FIN_IDEMPOTENCY_CONFLICT"

  @FR-FBR-029 @concurrency
  Scenario: Reject stale invoice version during payment posting
    Given persisted invoice version is 8
    And the payment request expects invoice version 7
    When payment posting is attempted
    Then the request is rejected with HTTP 409
    And the error code is "ERR_FIN_CONCURRENCY_CONFLICT"
    And no financial effects are committed
```

## 13. Feature: Receipt Generation and Controlled Rendering

```gherkin
Feature: Authoritative receipt lifecycle

  @FR-FBR-010 @positive
  Scenario: Create exactly one receipt for a successful payment
    Given a payment is posted successfully
    When the transaction commits
    Then exactly one active Receipt exists for the Payment
    And the Receipt amount equals the Payment amount
    And receipt number is unique in its numbering scope

  @FR-FBR-010 @negative
  Scenario: Prevent duplicate active receipt for payment
    Given PAY-A already has an active Receipt
    When receipt generation is retried
    Then the existing authoritative receipt is returned or safely re-rendered
    And no second active Receipt is created

  @FR-FBR-027 @localization
  Scenario Outline: Render receipt in selected language
    Given PAY-A has an authoritative Receipt
    When the user requests document language "<language>"
    Then the receipt document is rendered in "<language>"
    And financial identifiers remain logically LTR
    And amount values remain numerically correct

    Examples:
      | language |
      | en |
      | ar |
```

## 14. Feature: Receivable Maintenance and Aging

```gherkin
Feature: Receivable projection and aging

  @FR-FBR-012 @positive
  Scenario: Create receivable for newly issued unpaid invoice
    Given INV-A becomes Issued with outstandingAmount OMR 100.000
    When financial projections are updated
    Then one active Receivable exists for INV-A
    And its outstandingAmount is OMR 100.000

  @FR-FBR-012 @reconciliation
  Scenario: Reconcile receivable after payment
    Given INV-A outstandingAmount becomes OMR 60.000 after a posted payment
    When receivable projection updates
    Then Receivable.outstandingAmount becomes OMR 60.000
    And reconciliation variance is zero

  @FR-FBR-013 @boundary
  Scenario Outline: Classify aging bucket at boundaries
    Given the receivable has <daysPastDue> days past due
    When the aging bucket is calculated
    Then agingBucket is "<bucket>"

    Examples:
      | daysPastDue | bucket |
      | 0 | Current |
      | 1 | 30 Days |
      | 30 | 30 Days |
      | 31 | 60 Days |
      | 60 | 60 Days |
      | 61 | 90 Days |
      | 90 | 90 Days |
      | 91 | 120+ Days |
      | 365 | 120+ Days |

  @FR-FBR-028 @timezone
  Scenario: Calculate aging using GST business date rather than server UTC date
    Given dueDate is 2026-07-03
    And current time is 2026-07-03T21:30:00Z
    And GST local date is 2026-07-04
    When daysPastDue is calculated
    Then daysPastDue is 1
    And the aging bucket is "30 Days"

  @FR-FBR-012 @negative
  Scenario: Detect receivable reconciliation mismatch
    Given INV-A outstandingAmount is OMR 60.000
    And active Receivable outstandingAmount is OMR 59.999
    When reconciliation control runs
    Then a reconciliation exception is recorded
    And the mismatch is not silently rounded away
```

## 15. Feature: Refund Request, Decision, and Execution

```gherkin
Feature: Refund workflow

  @FR-FBR-014 @positive
  Scenario: Submit a partial refund request
    Given PAY-A amount is OMR 100.000
    And no executed refunds exist for PAY-A
    When an authorized user requests Partial refund of OMR 40.000 with a valid reason
    Then Refund is created in Requested status
    And original Payment remains immutable
    And the request action is audited
    And RefundRequested notification event is emitted internally

  @FR-FBR-014 @negative
  Scenario Outline: Reject invalid refund amount
    Given PAY-A remaining refundable amount is OMR 100.000
    When a refund of <amount> is requested
    Then the request is rejected with "<errorCode>"

    Examples:
      | amount | errorCode |
      | 0.000 | ERR_FIN_REFUND_AMOUNT_INVALID |
      | -1.000 | ERR_FIN_REFUND_AMOUNT_INVALID |
      | 100.001 | ERR_FIN_REFUND_EXCEEDS_REFUNDABLE |

  @FR-FBR-014 @validation
  Scenario: Reject Full refund amount that is not remaining refundable balance
    Given remaining refundable balance is OMR 100.000
    When refundType Full is requested for OMR 99.999
    Then the request is rejected with "ERR_FIN_REFUND_TYPE_AMOUNT_MISMATCH"

  @FR-FBR-014 @validation
  Scenario: Reject Partial refund equal to full remaining refundable balance
    Given remaining refundable balance is OMR 100.000
    When refundType Partial is requested for OMR 100.000
    Then the request is rejected with "ERR_FIN_REFUND_TYPE_AMOUNT_MISMATCH"

  @FR-FBR-014 @validation
  Scenario Outline: Validate refund narrative reason length
    Given the reason narrative length is <length> characters
    When the request is validated
    Then the outcome is "<outcome>"

    Examples:
      | length | outcome |
      | 9 | rejected |
      | 10 | accepted |
      | 1000 | accepted |
      | 1001 | rejected |

  @FR-FBR-015 @maker-checker
  Scenario: Reject refund self-approval
    Given USER-ACC-A requested refund REF-A
    And USER-ACC-A is later granted approval permission
    When USER-ACC-A attempts to approve REF-A
    Then the request is rejected with "ERR_FIN_REFUND_SELF_APPROVAL"
    And REF-A status remains unchanged

  @FR-FBR-015 @positive
  Scenario Outline: Decide a refund request
    Given REF-A is Requested
    And the approver is different from the requester
    And the approver has "finance.refund.approve"
    When the approver chooses "<decision>"
    Then REF-A status becomes "<status>"

    Examples:
      | decision | status |
      | Approve | Approved |
      | Reject | Rejected |

  @FR-FBR-016 @positive
  Scenario: Execute approved refund without rewriting payment history
    Given REF-A status is Approved
    When an authorized executor records successful refund execution
    Then REF-A status becomes Executed
    And execution reference and timestamp are stored
    And PAY-A remains an immutable original payment record
    And invoice and receivable financial effects are updated according to the approved refund treatment
    And the action is audited

  @FR-FBR-016 @negative
  Scenario Outline: Reject refund execution from invalid state
    Given REF-A status is "<status>"
    When execution is attempted
    Then the request is rejected with "ERR_FIN_REFUND_NOT_APPROVED"

    Examples:
      | status |
      | Requested |
      | UnderReview |
      | Rejected |
      | Executed |
```

## 16. Feature: Corporate Credit Rule Effective Dating

```gherkin
Feature: Effective-dated corporate credit rules

  @FR-FBR-017 @positive
  Scenario: Create a valid corporate credit rule
    Given no overlapping active rule exists for CORP-A, BR-A, OMR, and the requested effective period
    When Finance Manager creates a rule with creditLimit OMR 5000.000, blockOnCreditLimit true, effectiveStartDate 2026-07-01
    Then the rule is created Active
    And the action and reason are audited

  @FR-FBR-017 @boundary
  Scenario: Accept same start and end date
    Given effectiveStartDate is 2026-07-04
    And effectiveEndDate is 2026-07-04
    When date validation runs
    Then date-order validation passes

  @FR-FBR-017 @negative
  Scenario: Reject end date before start date
    Given effectiveStartDate is 2026-07-05
    And effectiveEndDate is 2026-07-04
    When validation runs
    Then the request is rejected with "ERR_FIN_EFFECTIVE_DATE_INVALID"

  @FR-FBR-017 @negative
  Scenario Outline: Reject overlapping effective periods
    Given an active rule exists from 2026-07-01 through 2026-12-31
    When a new rule is requested from <newStart> through <newEnd>
    Then the request is rejected with "ERR_FIN_CREDIT_RULE_OVERLAP"

    Examples:
      | newStart | newEnd |
      | 2026-06-01 | 2026-07-01 |
      | 2026-07-01 | 2026-07-31 |
      | 2026-08-01 | 2026-09-01 |
      | 2026-12-31 | 2027-06-30 |

  @FR-FBR-017 @positive
  Scenario: Accept non-overlapping period immediately after existing inclusive end date
    Given an active rule ends on 2026-12-31
    When a new rule starts on 2027-01-01
    Then overlap validation passes
```

## 17. Feature: Corporate Credit Exposure and Enrollment Guard

```gherkin
Feature: Corporate credit validation

  @FR-FBR-018 @FR-FBR-019 @scenario-outline
  Scenario Outline: Return credit decision from projected exposure
    Given creditLimit is OMR 1000.000
    And currentOutstanding is OMR <outstanding>
    And committedAmount is OMR <committed>
    And proposedEnrollmentValue is OMR <proposed>
    And blockOnCreditLimit is <blockFlag>
    When corporate credit is validated
    Then projectedExposure is OMR <projected>
    And decision is "<decision>"

    Examples:
      | outstanding | committed | proposed | blockFlag | projected | decision |
      | 400.000 | 100.000 | 200.000 | true | 700.000 | Allow |
      | 400.000 | 100.000 | 500.000 | true | 1000.000 | Allow |
      | 400.000 | 100.000 | 500.001 | true | 1000.001 | Block |
      | 400.000 | 100.000 | 500.001 | false | 1000.001 | AllowWithWarning |

  @FR-FBR-019 @calculation
  Scenario: Calculate available credit
    Given creditLimit is OMR 1000.000
    And currentOutstanding is OMR 400.000
    And committedAmount is OMR 100.000
    When exposure is calculated
    Then availableCredit is OMR 500.000

  @FR-FBR-018 @negative
  Scenario: Reject ambiguous multiple effective rules
    Given two effective active credit rules resolve for the same account, branch scope, currency, and validation date
    When credit validation runs
    Then the request fails with "ERR_FIN_MULTIPLE_CREDIT_RULES_ACTIVE"
    And enrollment confirmation is not authorized by Finance
```

## 18. Feature: Payment Validation for Completion and Certificate

```gherkin
Feature: Authoritative payment validation port

  @FR-FBR-020 @positive
  Scenario: Return payment satisfied when required invoice obligations are settled
    Given ENR-A requires payment validation
    And all required payable invoices for ENR-A have zero outstanding balance
    When Completion context requests payment validation
    Then Finance returns status "Satisfied"
    And no Finance record is mutated

  @FR-FBR-020 @negative
  Scenario: Return not satisfied when required outstanding exists
    Given ENR-A requires payment validation
    And required invoice outstanding is OMR 0.001
    When Certificate context requests payment validation
    Then Finance returns status "NotSatisfied"
    And certificate issuance must not proceed

  @FR-FBR-020 @positive
  Scenario: Return NotRequired when course completion policy does not require payment
    Given ENR-A paymentValidationRequired is false
    When payment eligibility is queried
    Then the result is "NotRequired"

  @FR-FBR-020 @security
  Scenario: Trainer cannot call unrestricted finance payment detail endpoint
    Given a Trainer is authenticated
    When the Trainer requests invoice payment transaction detail
    Then access is denied with HTTP 403
    And no monetary data is returned
```

## 19. Feature: Invoice State Machine

```gherkin
Feature: Invoice lifecycle transition control

  @FR-FBR-030 @positive
  Scenario Outline: Allow legal invoice transition
    Given invoice status is "<from>"
    When an authorized operation causes transition to "<to>"
    Then the transition succeeds

    Examples:
      | from | to |
      | Draft | Issued |
      | Issued | PartiallyPaid |
      | Issued | Paid |
      | Issued | Overdue |
      | PartiallyPaid | Paid |
      | PartiallyPaid | Overdue |
      | Overdue | PartiallyPaid |
      | Overdue | Paid |
      | Draft | Cancelled |
      | Issued | Cancelled |

  @FR-FBR-030 @negative
  Scenario Outline: Reject illegal invoice transition
    Given invoice status is "<from>"
    When transition to "<to>" is requested
    Then the request is rejected with an invoice state error
    And persisted status remains "<from>"

    Examples:
      | from | to |
      | Paid | Draft |
      | Cancelled | Issued |
      | Cancelled | Paid |
      | Draft | Paid |
      | Paid | PartiallyPaid |

  @FR-FBR-026 @negative
  Scenario: Reject cancellation of invoice with posted payment
    Given INV-A has paidAmount OMR 0.001
    When cancellation is requested
    Then the request is rejected with "ERR_FIN_INVOICE_HAS_PAYMENT"
    And the user is directed to reversal/refund workflow according to permission
```

## 20. Feature: Soft Delete and Financial Record Immutability

```gherkin
Feature: Soft delete and reversal policy

  @FR-FBR-026 @security
  Scenario: No public hard-delete endpoint exists for posted payment
    Given PAY-A is a posted Payment
    When an authenticated user attempts HTTP DELETE on the payment resource
    Then the route is not available or the operation is rejected
    And PAY-A remains persisted

  @FR-FBR-026 @positive
  Scenario: Soft-delete eligible draft-only configuration record where policy permits
    Given an eligible mutable Finance record is not posted and policy permits soft deletion
    When authorized soft delete is executed
    Then isDeleted becomes true
    And deletedAt is set
    And audit history records actor, reason, old value, and new value
    And the row is excluded from ordinary active queries

  @FR-FBR-025 @audit
  Scenario: Preserve audit for sensitive finance changes
    Given a user changes a mutable sensitive Finance aggregate
    When the transaction commits
    Then AuditLog contains who changed it, what changed, when, old value, new value, and reason when required
```

## 21. Feature: Authorization Guards – Action Permissions

```gherkin
Feature: Fine-grained Finance authorization

  @authorization
  Scenario Outline: Deny action without required permission
    Given the user is authenticated but does not have "<permission>"
    When the user attempts "<action>"
    Then the request is denied with HTTP 403
    And no mutation occurs

    Examples:
      | permission | action |
      | finance.invoice.create | create invoice |
      | finance.invoice.issue | issue invoice |
      | finance.invoice.cancel | cancel invoice |
      | finance.installment.create | create installment plan |
      | finance.payment.record | record payment |
      | finance.refund.request | request refund |
      | finance.refund.approve | approve refund |
      | finance.refund.execute | execute refund |
      | finance.credit.manage | create or supersede credit rule |
      | finance.export | export finance dataset |

  @authorization @read
  Scenario Outline: Deny protected read without required permission
    Given the user lacks "<permission>"
    When the user requests "<resource>"
    Then HTTP 403 is returned
    And the response contains no protected data rows or aggregate totals

    Examples:
      | permission | resource |
      | finance.invoice.read | invoice list |
      | finance.payment.read | payment register |
      | finance.receivable.read | receivables detail |
      | finance.audit.read | finance audit trail |
      | report.finance.corporate-exposure | corporate exposure report |
```

## 22. Feature: Branch Data Isolation

```gherkin
Feature: Server-side branch isolation

  Background:
    Given USER-ACC-A is assigned to BR-A only
    And BR-B is not in USER-ACC-A effective branch set

  @branch-isolation @read
  Scenario Outline: Block direct read of foreign-branch entity
    Given "<entity>" belongs to BR-B
    When USER-ACC-A requests the entity by identifier
    Then the request returns HTTP 403 or scope-safe 404 according to endpoint policy
    And no entity data is returned

    Examples:
      | entity |
      | Invoice |
      | Payment |
      | Receipt |
      | Refund |
      | Receivable |

  @branch-isolation @mutation
  Scenario Outline: Block foreign-branch mutation even with action permission
    Given USER-ACC-A has "<permission>"
    And the target entity belongs to BR-B
    When USER-ACC-A attempts "<action>"
    Then the request is denied with "ERR_FIN_BRANCH_SCOPE_DENIED"
    And the BR-B entity remains unchanged

    Examples:
      | permission | action |
      | finance.invoice.issue | issue invoice |
      | finance.payment.record | post payment |
      | finance.refund.request | request refund |
      | finance.refund.approve | approve refund |
      | finance.refund.execute | execute refund |

  @branch-isolation @filter
  Scenario: Reject explicit unauthorized branch filter
    When USER-ACC-A requests invoice report with branchIds containing BR-B
    Then the request is rejected with HTTP 403
    And the error code is "ERR_FIN_BRANCH_SCOPE_DENIED"

  @branch-isolation @aggregation
  Scenario: Exclude foreign branch from aggregate denominator
    Given BR-A net collections are OMR 100.000
    And BR-B net collections are OMR 900.000
    When USER-ACC-A views branch-scoped collection summary
    Then displayed net collections are OMR 100.000
    And no percentage denominator includes BR-B values

  @branch-isolation @child-branch
  Scenario Outline: Resolve child branch access from entitlement
    Given BR-C is a child of BR-A
    And USER-ACC-A canViewChildBranches is <flag>
    When USER-ACC-A queries BR-C finance data
    Then access outcome is "<outcome>"

    Examples:
      | flag | outcome |
      | true | allowed subject to Finance permission |
      | false | denied |
```

## 23. Feature: Consolidated Reporting Two-Key Guard

```gherkin
Feature: Consolidated Finance reporting authorization

  @FR-FBR-022 @authorization
  Scenario: Allow consolidated view with Finance permission and IAM entitlement
    Given USER-EXEC-C has "finance.report.consolidated"
    And USER-EXEC-C has "report.finance.consolidated-summary"
    And USER-EXEC-C has IAM consolidated entitlement
    When USER-EXEC-C requests consolidated summary for authorized branches
    Then the request succeeds
    And only branches within the entitled consolidated set are aggregated

  @FR-FBR-022 @negative
  Scenario: Deny consolidated view when Finance permission exists but IAM entitlement is missing
    Given USER-EXEC-N has "finance.report.consolidated"
    And USER-EXEC-N has "report.finance.consolidated-summary"
    And USER-EXEC-N does not have IAM consolidated entitlement
    When USER-EXEC-N requests consolidated summary
    Then HTTP 403 is returned
    And no consolidated totals are returned

  @FR-FBR-022 @negative
  Scenario: Deny consolidated view when IAM entitlement exists but Finance permission is missing
    Given a user has IAM consolidated entitlement
    And the user lacks "finance.report.consolidated"
    When consolidated finance summary is requested
    Then HTTP 403 is returned
```

## 24. Feature: Student Self-Service Ownership Guards

```gherkin
Feature: Student self-service finance isolation

  Background:
    Given Student A is authenticated and resolves to STU-A
    And Student A has the relevant finance.self permissions

  @student-self-service @positive
  Scenario Outline: Student reads own finance resource
    Given "<resource>" belongs to STU-A
    When Student A requests the resource
    Then access is allowed

    Examples:
      | resource |
      | Invoice |
      | Installment schedule |
      | Payment history |
      | Receipt |
      | Refund status |

  @student-self-service @negative
  Scenario Outline: Student cannot read another student's finance resource
    Given "<resource>" belongs to STU-B
    When Student A requests the resource by identifier
    Then access is denied or scope-safe not-found is returned
    And no amount, status, customer name, or identifier belonging to STU-B is disclosed

    Examples:
      | resource |
      | Invoice |
      | Installment schedule |
      | Payment |
      | Receipt |
      | Refund |

  @student-self-service @negative
  Scenario: Student cannot access branch finance dashboard
    When Student A requests the Finance Operations Dashboard
    Then HTTP 403 is returned
    And no branch metrics are returned
```

## 25. Feature: Corporate Account Manager Scope

```gherkin
Feature: Managed corporate account restriction

  @authorization @corporate-scope
  Scenario: Corporate Account Manager reads managed account exposure
    Given the user manages CORP-A
    And CORP-A intersects the user's authorized branch scope
    And the user has "finance.credit.read"
    When CORP-A exposure is requested
    Then access succeeds

  @authorization @corporate-scope-negative
  Scenario: Corporate Account Manager cannot read unmanaged account exposure
    Given the user does not manage CORP-B
    When CORP-B exposure is requested
    Then access is denied
    And no CORP-B exposure amount is returned
```

## 26. Feature: Finance Export Authorization and Isolation

```gherkin
Feature: Secure finance exports

  @FR-FBR-023 @positive
  Scenario: Export authorized branch invoice register
    Given the user has "finance.invoice.read"
    And the user has "finance.export"
    And requested branches are within effective branch scope
    When XLSX export is requested
    Then the export contains only authorized rows
    And numeric amounts are typed numeric cells
    And the export action is audited with report code, filters, branches, format, row count, requester, and timestamp

  @FR-FBR-023 @negative
  Scenario: Deny export when user can view report but lacks export permission
    Given the user can view Invoice Register
    And the user lacks "finance.export"
    When export is requested
    Then HTTP 403 is returned
    And no export artifact is created

  @FR-FBR-023 @security
  Scenario: Neutralize spreadsheet formula injection
    Given a text field begins with "=HYPERLINK(A1)"
    When CSV or XLSX is generated
    Then the cell is encoded according to safe spreadsheet export policy
    And the value is not executed as a spreadsheet formula

  @FR-FBR-023 @boundary
  Scenario Outline: Enforce synchronous export limits
    Given the filtered report has <rows> rows
    When <format> synchronous export is requested
    Then outcome is "<outcome>"

    Examples:
      | rows | format | outcome |
      | 50000 | CSV | allowed |
      | 50001 | CSV | routed to approved job mechanism or rejected from synchronous path |
      | 25000 | XLSX | allowed |
      | 25001 | XLSX | routed to approved job mechanism or rejected from synchronous path |
      | 2000 | PDF | allowed |
      | 2001 | PDF | rejected for detail PDF |
```

## 27. Feature: Reporting KPI Accuracy and Drill-Through

```gherkin
Feature: Financial KPI calculations

  @FR-FBR-021 @reporting
  Scenario: Calculate net collections
    Given GrossCollections are OMR 1000.000
    And ExecutedRefunds are OMR 100.000
    And approved but unexecuted refunds are OMR 50.000
    When NetCollections is calculated
    Then NetCollections is OMR 900.000

  @FR-FBR-021 @reporting-boundary
  Scenario: Collection efficiency denominator is zero
    Given CollectibleAmount is OMR 0.000
    And NetCollections is OMR 0.000
    When CollectionEfficiency is calculated
    Then CollectionEfficiency is 0 percent
    And no divide-by-zero error occurs

  @FR-FBR-021 @reporting
  Scenario: Dashboard metric reconciles to detail report
    Given identical period, branch, currency, and customer filters
    When the user opens Current Outstanding metric card
    And drills through to Receivables Aging Detail
    Then the metric amount equals the sum of returned authorized outstanding amounts at the same dataAsOf timestamp

  @FR-FBR-021 @reporting-security
  Scenario: Ranking considers only authorized branches
    Given the user is authorized for BR-A and BR-C
    And not authorized for BR-B
    When branch performance ranking is requested
    Then only BR-A and BR-C appear
    And ranking positions are calculated only among BR-A and BR-C
```

## 28. Feature: Multi-Currency Reporting Safety

```gherkin
Feature: Prevent invalid cross-currency aggregation

  @reporting @currency
  Scenario: Separate dashboard totals by currency
    Given authorized invoices include OMR 100.000 and USD 50.00
    When Gross Billed Value is displayed
    Then OMR 100.000 and USD 50.00 are shown as separate currency measures
    And the UI does not display a combined numeric total of 150 without an approved FX layer
```

## 29. Feature: Read Model Freshness and Transactional Authority

```gherkin
Feature: Reporting projection freshness

  @reporting @staleness
  Scenario: Show stale indicator for delayed branch KPI projection
    Given mv_fin_daily_branch_kpi dataAsOf is older than 5 minutes during business hours
    When the Finance Operations Dashboard loads
    Then a stale-data indicator is shown
    And the dataAsOf timestamp is visible

  @cross-module @safety
  Scenario: Corporate enrollment guard uses authoritative credit validation service
    Given Corporate Credit Dashboard materialization is stale
    When corporate enrollment requests credit validation
    Then the Finance application service calculates or retrieves authoritative current exposure
    And the decision does not rely solely on the stale dashboard materialization

  @cross-module @safety
  Scenario: Certificate payment validation does not use dashboard outstanding metric
    Given a dashboard read model has not yet refreshed
    When Certificate context requests payment validation for ENR-A
    Then Finance uses authoritative transactional state
    And returns the correct eligibility outcome
```

## 30. Feature: Bilingual UI and Reporting

```gherkin
Feature: English and Arabic Finance rendering

  @FR-FBR-027 @ltr
  Scenario: Render English report in LTR
    Given user language is English
    When Invoice Register renders
    Then layout direction is LTR
    And table order follows English specification

  @FR-FBR-027 @rtl
  Scenario: Render Arabic report in RTL
    Given user language is Arabic
    When Invoice Register renders
    Then layout direction is RTL
    And Arabic labels are right aligned according to design rules
    And invoice number is isolated in an LTR span
    And amount values preserve numeric order

  @FR-FBR-027 @export
  Scenario: Export Arabic text without corruption
    Given report rows contain Arabic customer names
    When XLSX export is generated
    Then Arabic text is preserved
    And numeric amount cells remain numeric
```

## 31. Feature: Audit and Sensitive Action Traceability

```gherkin
Feature: Finance audit requirements

  @FR-FBR-025 @scenario-outline
  Scenario Outline: Audit sensitive action
    Given an authorized user performs "<action>"
    When the operation commits
    Then an AuditLog entry is created
    And it records actor, timestamp, entity type, entity ID, action, old value, new value, IP address where available, and reason when required

    Examples:
      | action |
      | invoice issue |
      | invoice cancellation |
      | payment posting |
      | refund request |
      | refund approval |
      | refund rejection |
      | refund execution |
      | credit rule creation |
      | credit rule supersession |
      | finance export |

  @FR-FBR-025 @negative
  Scenario: Failed transaction does not create misleading success audit event
    Given payment posting fails and transaction rolls back
    When audit history is reviewed
    Then no audit entry claims that payment posting succeeded
    And a failure operational log may exist with correlation ID without exposing prohibited sensitive data
```

## 32. Feature: Notification Event Conditions

```gherkin
Feature: Finance notification event triggering

  @notification
  Scenario Outline: Trigger notification only after successful domain commit
    Given operation "<operation>" succeeds and commits
    When post-commit internal event handling runs
    Then event "<event>" is available for notification processing

    Examples:
      | operation | event |
      | invoice issue | InvoiceGenerated |
      | payment posting | PaymentRecorded |
      | receipt generation | ReceiptGenerated |
      | refund request | RefundRequested |
      | refund approval | RefundApproved |
      | refund rejection | RefundRejected |
      | refund execution | RefundExecuted |
      | credit block decision | CorporateCreditValidationFailed |

  @notification @negative
  Scenario: Do not emit success notification for rolled-back payment
    Given payment posting fails before transaction commit
    When notification processing runs
    Then PaymentRecorded is not delivered
    And ReceiptGenerated is not delivered
```

## 33. Feature: Low-Level API Error Contract

```gherkin
Feature: Structured API error responses

  @api-error
  Scenario: Return validation error envelope
    Given a request violates a Finance validation rule
    When the API rejects the request
    Then the response contains HTTP status appropriate to the catalog
    And the body contains a stable application error code
    And the body contains a correlation ID
    And field errors are returned when validation is field-specific
    And stack traces and database details are absent

  @api-error @security
  Scenario: Authorization error does not disclose protected entity existence
    Given the user requests an unauthorized finance resource identifier
    When access is denied under scope-safe endpoint policy
    Then the response does not reveal protected financial fields
    And the response does not include customer name, amount, balance, or branch data
```

## 34. End-to-End Scenario: Regular Enrollment to Settlement

```gherkin
Feature: Regular enrollment billing lifecycle

  @e2e @regular
  Scenario: Confirmed enrollment is billed and fully settled
    Given ENR-A is Confirmed with valid resolved pricing
    When an authorized Accountant creates a StudentInvoice
    And an authorized issuer issues the invoice
    And a valid partial payment is posted
    And a second valid payment settles the remaining balance
    Then the invoice status is Paid
    And outstandingAmount is OMR 0.000
    And the receivable is Settled
    And each payment has exactly one authoritative receipt
    And payment validation for ENR-A returns Satisfied
    And every sensitive step is auditable
```

## 35. End-to-End Scenario: Corporate Enrollment Credit Block

```gherkin
Feature: Corporate enrollment credit control

  @e2e @corporate
  Scenario: Block corporate enrollment when projected exposure exceeds blocking limit
    Given CORP-A has creditLimit OMR 1000.000
    And currentOutstanding is OMR 800.000
    And committedAmount is OMR 100.000
    And proposed enrollment value is OMR 100.001
    And blockOnCreditLimit is true
    When Admission & Enrollment requests corporate credit validation
    Then projectedExposure is OMR 1000.001
    And Finance returns Block
    And the enrollment confirmation flow is blocked
    And CorporateCreditValidationFailed is recorded or emitted according to internal event design

  @e2e @corporate-warning
  Scenario: Allow corporate enrollment with warning when blocking is disabled
    Given the same exposure values
    And blockOnCreditLimit is false
    When credit validation runs
    Then Finance returns AllowWithWarning
    And enrollment may continue according to caller workflow
    And the warning decision is auditable
```

## 36. End-to-End Scenario: Refund Separation of Duties

```gherkin
Feature: Refund maker-checker-executor lifecycle

  @e2e @refund
  Scenario: Different actors request, approve, and execute refund
    Given Accountant A has refund request permission
    And Finance Manager B has refund approval permission
    And Accountant C has refund execution permission
    And PAY-A has sufficient remaining refundable balance
    When Accountant A submits REF-A
    And Finance Manager B approves REF-A
    And Accountant C records successful execution
    Then REF-A status is Executed
    And requester, approver, and executor actions are separately auditable
    And original payment history is preserved
```

## 37. Cross-Browser and Accessibility Acceptance Scenarios

```gherkin
Feature: Accessible finance UI behavior

  @accessibility
  Scenario: Keyboard-only user can operate finance filters and data grids
    Given the Finance Invoice Register is open
    When the user navigates using keyboard only
    Then every interactive filter and row action is reachable in logical order
    And focus is visibly indicated
    And no action requires pointer-only interaction

  @accessibility
  Scenario: Validation error is associated with input
    Given a payment form contains invalid amount
    When validation fails
    Then the amount field has programmatic invalid state
    And the error message is associated with the field
    And focus moves to or summary-links to the first invalid field after submission

  @accessibility @rtl
  Scenario: Arabic RTL view preserves keyboard navigation logic
    Given the UI language is Arabic
    When keyboard navigation is used
    Then focus order follows logical DOM order
    And identifiers and numeric values remain readable
```

## 38. Test Coverage Matrix

| Requirement | Principal Scenario Sections |
|---|---|
| FR-FBR-001 | 3 |
| FR-FBR-002 | 4 |
| FR-FBR-003 | 5 |
| FR-FBR-004 | 6 |
| FR-FBR-005 | 7, 22 |
| FR-FBR-006 | 8 |
| FR-FBR-007 | 9 |
| FR-FBR-008 | 10, 11, 12 |
| FR-FBR-009 | 10, 11 |
| FR-FBR-010 | 13 |
| FR-FBR-011 | 10, 11 |
| FR-FBR-012 | 14 |
| FR-FBR-013 | 14 |
| FR-FBR-014 | 15 |
| FR-FBR-015 | 15, 36 |
| FR-FBR-016 | 15, 36 |
| FR-FBR-017 | 16 |
| FR-FBR-018 | 17, 35 |
| FR-FBR-019 | 17 |
| FR-FBR-020 | 18, 29 |
| FR-FBR-021 | 27 |
| FR-FBR-022 | 23 |
| FR-FBR-023 | 26 |
| FR-FBR-024 | 32 |
| FR-FBR-025 | 31 |
| FR-FBR-026 | 19, 20 |
| FR-FBR-027 | 13, 30 |
| FR-FBR-028 | 14 |
| FR-FBR-029 | 12 |
| FR-FBR-030 | 19 |

## 39. Mandatory Authorization Regression Suite

The following tests must run in every release affecting Finance APIs, IAM branch resolution, Finance reports, Prisma query helpers, or dashboard aggregation:

1. no-permission action denial for every mutation endpoint;
2. foreign-branch direct-ID read denial;
3. foreign-branch mutation denial;
4. unauthorized branch filter rejection;
5. child-branch expansion true and false cases;
6. consolidated Finance permission without IAM entitlement denial;
7. IAM consolidated entitlement without Finance permission denial;
8. valid two-key consolidated access success;
9. Student A cannot read Student B invoice, payment, receipt, installment, or refund;
10. Corporate Account Manager cannot read unmanaged account exposure;
11. report totals exclude unauthorized branches from both numerator and denominator;
12. export excludes unauthorized rows and requires export permission;
13. Trainer cannot access monetary Finance data;
14. Auditor read access cannot mutate Finance aggregates;
15. refund requester cannot approve own request.

## 40. Definition of Done for Acceptance Testing

Module 12 Part 9 acceptance testing is complete only when:

1. every `FR-FBR-001` through `FR-FBR-030` requirement has at least one positive and one relevant negative or boundary scenario;
2. every mutation endpoint has permission-denied and branch-denied tests;
3. all payment posting tests assert transaction atomicity;
4. concurrency and idempotency tests execute with real concurrent requests or equivalent database transaction contention tests;
5. report tests compare dashboard aggregates with detailed authorized rows;
6. GST timezone boundary tests run with server runtime configured in a non-GST timezone to prove timezone independence;
7. Arabic RTL tests verify semantic direction and identifier isolation rather than visual screenshots alone;
8. audit tests verify committed success actions and absence of false success audit records after rollback;
9. refund maker-checker tests verify requester identity, not merely role name;
10. consolidated reporting tests verify the two-key permission and IAM entitlement rule;
11. automated tests prove unauthorized branch data cannot leak through totals, counts, ranks, percentages, exports, or error messages;
12. all error assertions use stable application error codes from Part 7.
