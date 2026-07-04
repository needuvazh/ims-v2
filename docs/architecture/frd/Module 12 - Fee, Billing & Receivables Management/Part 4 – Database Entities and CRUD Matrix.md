# Part 4 – Database Entities and CRUD Matrix

## Module 12 – Fee, Billing & Receivables Management

## 1. Purpose

This document defines the persistent data model owned by the Fee, Billing & Receivables Management bounded context. It translates the Module 12 business rules into PostgreSQL and Prisma-oriented implementation specifications for the modular-monolith database.

The context remains invoice-centric and enrollment-linked. `Enrollment`, `StudentProfile`, `CorporateAccount`, `Course`, `Batch`, `Branch`, `User`, and configuration entities are referenced through foreign keys or stable identifiers but remain owned by their respective bounded contexts. Module 12 owns financial obligations, settlement records, receipts, refunds, receivable positions, installment schedules, payment allocations, and corporate credit rules.

### 1.1 Modeling Conventions

1. Primary identifiers use PostgreSQL `uuid` and Prisma `String @db.Uuid`; application generation should use UUID v7 or another approved non-sequentially guessable UUID strategy.
2. Monetary values use PostgreSQL `numeric(18,3)` and Prisma `Decimal @db.Decimal(18,3)` because OMR commonly requires three fractional digits. Currency-specific scale validation is enforced by application/domain validation.
3. Currency codes use `varchar(3)` and ISO 4217 uppercase codes. The default operational currency may be OMR, but the database does not hardcode one currency.
4. All timestamps use PostgreSQL `timestamptz(6)` and Prisma `DateTime @db.Timestamptz(6)`. Business-date calculations use Oman GST (`Asia/Muscat`, UTC+4).
5. Business-only dates use PostgreSQL `date` and Prisma `DateTime @db.Date`.
6. Posted financial records are never hard deleted. `deletedAt` and `isDeleted` exist on every owned table for consistent soft-delete behavior, but mutation rules prohibit soft deletion of posted Payment, Receipt, executed Refund, or issued Invoice records; those records require cancellation, reversal, refund, or supersession workflows.
7. Every mutable aggregate table includes `version integer NOT NULL DEFAULT 1` for optimistic concurrency. Child tables that can be mutated independently also include `version`.
8. `createdBy` and `updatedBy` reference IAM `User.id`. System-originated operations must use an approved service-user identity rather than null audit actors.
9. `effectiveStartDate`, `effectiveEndDate`, and `status` are mandatory only on rule/policy tables whose values change over time. In this module that applies to `CorporateCreditRule`. Transaction tables use lifecycle status and transaction dates instead of effective dating.
10. PostgreSQL partial unique indexes are used where uniqueness must ignore soft-deleted rows. Prisma schema support for partial indexes may require SQL migrations in addition to Prisma model declarations.
11. Cross-context foreign keys use `ON DELETE RESTRICT`. Module 12 must never cascade-delete records owned by another bounded context.
12. Parent-to-child finance relationships use `ON DELETE RESTRICT` for posted or auditable children. Physical cascading is not used for financial history.
13. Branch ownership is explicit on `Invoice`, `Payment`, `Receipt`, `Refund`, `Receivable`, and `CorporateCreditRule`. Child records inherit scope through the parent relationship and may additionally carry branch IDs only where operational querying or cross-branch billing requires it.

## 2. Owned Entity Inventory

| Entity | Aggregate Role | Purpose |
|---|---|---|
| Invoice | Aggregate root | Authoritative billable obligation for student or corporate customer. |
| InvoiceLineItem | Invoice child entity | Preserves charge-level linkage, quantity, unit price, discount, tax, and line total. |
| InstallmentPlan | Aggregate root scoped to invoice/enrollment | Defines a controlled repayment schedule for an invoice obligation. |
| Installment | InstallmentPlan child entity | Stores sequence, due date, scheduled amount, allocated paid amount, and settlement status. |
| Payment | Aggregate root | Records an authorized settlement transaction against an invoice. |
| PaymentAllocation | Payment child entity | Allocates a payment amount to an invoice obligation and, where applicable, a specific installment. |
| Receipt | Payment dependent entity | Provides exactly one authoritative receipt record per successful payment. |
| Refund | Aggregate root | Controls refund request, approval decision, execution, and financial traceability. |
| Receivable | Derived operational entity | Stores current open balance and aging classification for an invoice. |
| CorporateCreditRule | Effective-dated policy aggregate | Stores credit limit, blocking behavior, exposure snapshot, and available credit for a corporate account. |

## 3. Enum and Controlled Value Specifications

Application enums must be mapped to PostgreSQL native enums or validated string columns consistently across the monorepo. The following values are required for Module 12.

| Enum | Allowed Values |
|---|---|
| InvoiceType | `StudentInvoice`, `CorporateInvoice`, `AdvanceInvoice`, `MilestoneInvoice`, `FinalInvoice`, `RefundInvoice` |
| InvoiceStatus | `Draft`, `Issued`, `PartiallyPaid`, `Paid`, `Overdue`, `Cancelled` |
| InstallmentPlanStatus | `Draft`, `Active`, `Completed`, `Cancelled` |
| InstallmentStatus | `Pending`, `PartiallyPaid`, `Paid`, `Overdue`, `Cancelled` |
| PaymentMethod | `Cash`, `BankTransfer`, `Card`, `Online`, `Cheque`, `CorporateBilling` |
| PaymentStatus | `Pending`, `Posted`, `Failed`, `Reversed`, `Refunded`, `PartiallyRefunded` |
| RefundType | `Full`, `Partial` |
| RefundStatus | `Requested`, `Approved`, `Rejected`, `Executed`, `Cancelled`, `Failed` |
| ReceivableStatus | `Open`, `PartiallyPaid`, `Overdue`, `Settled`, `WrittenOff` |
| AgingBucket | `Current`, `30Days`, `60Days`, `90Days`, `120PlusDays` |
| CorporateCreditRuleStatus | `Draft`, `Active`, `Superseded`, `Expired`, `Suspended` |

### 3.1 Aging Bucket Compatibility Rule

The source ER model defines `Current`, `30 Days`, `60 Days`, `90 Days`, and `120+ Days`, but does not define a distinct 91–119 day bucket. Until the shared domain enum is revised, Module 12 must apply the following deterministic ranges without inventing a new enum value:

| Days Past Due | Stored AgingBucket |
|---:|---|
| `<= 0` | `Current` |
| `1–30` | `30Days` |
| `31–60` | `60Days` |
| `61–119` | `90Days` |
| `>= 120` | `120PlusDays` |

This mapping must be implemented in one domain service and reused by scheduled aging refresh, detail queries, exports, and reports.

## 4. Entity Specifications

### 4.1 Invoice (`finance_invoice`)

Authoritative financial obligation. One invoice must identify a valid student or corporate customer path and is the parent for line items, payments, installment plans, refunds, and receivable state.

| Field | PostgreSQL Type | Prisma Equivalent | Nullable | Key / Reference | Description |
|---|---|---|---|---|---|
| id | uuid | String @id @db.Uuid | No | PK | Invoice identifier. |
| invoiceNumber | varchar(50) | String @db.VarChar(50) | No | Unique under numbering scope | Human-readable controlled invoice number. |
| invoiceType | InvoiceType enum | InvoiceType | No | — | Student, corporate, advance, milestone, final, or refund invoice classification. |
| studentProfileId | uuid | String? @db.Uuid | Yes | FK → StudentProfile.id | Student billed party for student invoice flows. |
| corporateAccountId | uuid | String? @db.Uuid | Yes | FK → CorporateAccount.id | Corporate billed party for corporate invoice flows. |
| enrollmentId | uuid | String? @db.Uuid | Yes | FK → Enrollment.id | Single-enrollment invoice reference where applicable. |
| branchId | uuid | String @db.Uuid | No | FK → Branch.id | Owning finance branch and mandatory authorization scope. |
| invoiceDate | date | DateTime @db.Date | No | — | Business issue date. |
| dueDate | date | DateTime @db.Date | No | — | Payment due date; must be on or after invoiceDate. |
| currency | varchar(3) | String @db.VarChar(3) | No | — | ISO 4217 currency code. |
| subtotal | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Sum of pre-discount, pre-tax line amounts. |
| discountAmount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Total approved invoice discount snapshot. |
| taxAmount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Total tax amount calculated from lines. |
| totalAmount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | subtotal - discountAmount + taxAmount. |
| paidAmount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Net posted payments minus executed refund effects per approved accounting rule. |
| outstandingAmount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | totalAmount - net settled amount; cannot be negative in ordinary invoice settlement. |
| status | InvoiceStatus enum | InvoiceStatus | No | — | Invoice lifecycle state. |
| issuedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Timestamp when Draft becomes Issued. |
| issuedBy | uuid | String? @db.Uuid | Yes | FK → User.id | User that issued the invoice. |
| cancelledAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Cancellation timestamp. |
| cancelledBy | uuid | String? @db.Uuid | Yes | FK → User.id | Authorized cancellation actor. |
| cancellationReason | varchar(500) | String? @db.VarChar(500) | Yes | — | Mandatory reason for cancellation. |
| sourceQuotationId | uuid | String? @db.Uuid | Yes | FK → Quotation.id | Optional corporate quotation traceability. |
| sourceSalesOrderId | uuid | String? @db.Uuid | Yes | FK → SalesOrder.id | Optional corporate sales-order traceability. |
| createdAt | timestamptz(6) | DateTime @default(now()) @db.Timestamptz(6) | No | — | Creation timestamp in GST-aware UTC storage. |
| createdBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that created the row. |
| updatedAt | timestamptz(6) | DateTime @updatedAt @db.Timestamptz(6) | No | — | Last update timestamp. |
| updatedBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that last updated the row. |
| deletedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Soft-delete timestamp when deletion is legally and operationally allowed. |
| isDeleted | boolean | Boolean @default(false) | No | — | Soft-delete marker. Must match deletedAt consistency rule. |
| version | integer | Int @default(1) | No | — | Optimistic concurrency token incremented on each mutation. |

**Indexes**

- `UNIQUE (invoiceNumber)` when the organization numbering series is globally unique; otherwise `UNIQUE (branchId, invoiceNumber)` according to configured numbering scope.
- `INDEX (branchId, status, invoiceDate DESC)` for operational work queues.
- `INDEX (branchId, dueDate, status)` for overdue scans and aging.
- `INDEX (studentProfileId, invoiceDate DESC)` where `studentProfileId IS NOT NULL AND isDeleted = false`.
- `INDEX (corporateAccountId, invoiceDate DESC)` where `corporateAccountId IS NOT NULL AND isDeleted = false`.
- `INDEX (enrollmentId)` where `enrollmentId IS NOT NULL`.
- `INDEX (sourceQuotationId)` and `INDEX (sourceSalesOrderId)` for commercial traceability.

**Constraints**

- `CHECK (dueDate >= invoiceDate)`.
- `CHECK (subtotal >= 0 AND discountAmount >= 0 AND taxAmount >= 0 AND totalAmount >= 0 AND paidAmount >= 0 AND outstandingAmount >= 0)`.
- `CHECK (discountAmount <= subtotal)` unless a future approved pricing model explicitly allows otherwise.
- `CHECK (totalAmount = subtotal - discountAmount + taxAmount)` with currency-scale rounding applied before persistence.
- Exactly one billed-party path must be valid for ordinary invoices: student billing requires `studentProfileId`; corporate billing requires `corporateAccountId`. A corporate invoice may additionally carry line-level enrollment references.
- Issued, PartiallyPaid, Paid, Overdue, or Cancelled invoices cannot be soft deleted.
- Cancellation requires `paidAmount = 0`, no Posted payment children, and non-empty `cancellationReason`.
- Status transitions are domain-controlled: Draft→Issued/Cancelled; Issued→PartiallyPaid/Paid/Overdue/Cancelled; PartiallyPaid→Paid/Overdue; Overdue→PartiallyPaid/Paid; Paid is terminal except refund effects may change payment/refund status without rewriting original invoice history.

### 4.2 InvoiceLineItem (`finance_invoice_line_item`)

Immutable commercial snapshot rows once the parent invoice is issued. They preserve the source enrollment, course, source branch, quantity, price, discount, and tax calculation.

| Field | PostgreSQL Type | Prisma Equivalent | Nullable | Key / Reference | Description |
|---|---|---|---|---|---|
| id | uuid | String @id @db.Uuid | No | PK | Line identifier. |
| invoiceId | uuid | String @db.Uuid | No | FK → Invoice.id | Parent invoice. |
| enrollmentId | uuid | String? @db.Uuid | Yes | FK → Enrollment.id | Enrollment that originated this charge. |
| courseId | uuid | String? @db.Uuid | Yes | FK → Course.id | Course traceability snapshot reference. |
| sourceBranchId | uuid | String @db.Uuid | No | FK → Branch.id | Branch of source enrollment; important for consolidated corporate billing. |
| lineSequence | smallint | Int | No | Unique within invoice | Stable presentation order starting at 1. |
| descriptionEnglish | varchar(500) | String @db.VarChar(500) | No | — | English charge description. |
| descriptionArabic | varchar(500) | String? @db.VarChar(500) | Yes | — | Arabic charge description when bilingual rendering is configured. |
| quantity | numeric(12,3) | Decimal @db.Decimal(12,3) | No | — | Positive billable quantity. |
| unitPrice | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Commercial unit price snapshot. |
| discountAmount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Line-level resolved discount snapshot. |
| taxableAmount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Line gross minus line discount before tax. |
| taxRate | numeric(7,4) | Decimal @db.Decimal(7,4) | No | — | Tax percentage snapshot, such as 5.0000 for five percent. |
| taxAmount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Calculated tax amount for the line. |
| lineTotal | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | taxableAmount + taxAmount. |
| createdAt | timestamptz(6) | DateTime @default(now()) @db.Timestamptz(6) | No | — | Creation timestamp in GST-aware UTC storage. |
| createdBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that created the row. |
| updatedAt | timestamptz(6) | DateTime @updatedAt @db.Timestamptz(6) | No | — | Last update timestamp. |
| updatedBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that last updated the row. |
| deletedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Soft-delete timestamp when deletion is legally and operationally allowed. |
| isDeleted | boolean | Boolean @default(false) | No | — | Soft-delete marker. Must match deletedAt consistency rule. |
| version | integer | Int @default(1) | No | — | Optimistic concurrency token incremented on each mutation. |

**Indexes**

- `UNIQUE (invoiceId, lineSequence)`.
- `INDEX (invoiceId)`.
- `INDEX (enrollmentId)` where non-null.
- `INDEX (sourceBranchId, createdAt)` for cross-branch corporate billing analysis.

**Constraints**

- `CHECK (lineSequence >= 1)`.
- `CHECK (quantity > 0)`.
- `CHECK (unitPrice >= 0 AND discountAmount >= 0 AND taxableAmount >= 0 AND taxRate >= 0 AND taxAmount >= 0 AND lineTotal >= 0)`.
- `CHECK (discountAmount <= quantity * unitPrice)` after approved currency rounding.
- `taxableAmount = rounded(quantity * unitPrice) - discountAmount`.
- `taxAmount = rounded(taxableAmount * taxRate / 100)`.
- `lineTotal = taxableAmount + taxAmount`.
- Issued invoice lines are immutable except through an approved cancellation/rebill or credit/refund process; direct update is prohibited.

**Implementation Notes**

- Tax breakdown is represented as immutable line-level value-object fields. No separate tax aggregate is introduced by this module.

### 4.3 InstallmentPlan (`finance_installment_plan`)

Defines the repayment schedule for an invoice. A plan is branch-scoped through its parent invoice and must reconcile exactly with its installment children.

| Field | PostgreSQL Type | Prisma Equivalent | Nullable | Key / Reference | Description |
|---|---|---|---|---|---|
| id | uuid | String @id @db.Uuid | No | PK | Plan identifier. |
| enrollmentId | uuid | String @db.Uuid | No | FK → Enrollment.id | Enrollment obligation associated with the plan. |
| invoiceId | uuid | String @db.Uuid | No | FK → Invoice.id | Invoice governed by the plan. |
| branchId | uuid | String @db.Uuid | No | FK → Branch.id | Scope copied from invoice and validated equal to invoice.branchId. |
| planName | varchar(120) | String @db.VarChar(120) | No | — | Operational plan name. |
| totalAmount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Amount scheduled across installments. |
| numberOfInstallments | smallint | Int | No | — | Count of installment children. |
| status | InstallmentPlanStatus enum | InstallmentPlanStatus | No | — | Plan lifecycle state. |
| activatedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Activation time. |
| completedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Completion time when every active installment is Paid. |
| createdAt | timestamptz(6) | DateTime @default(now()) @db.Timestamptz(6) | No | — | Creation timestamp in GST-aware UTC storage. |
| createdBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that created the row. |
| updatedAt | timestamptz(6) | DateTime @updatedAt @db.Timestamptz(6) | No | — | Last update timestamp. |
| updatedBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that last updated the row. |
| deletedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Soft-delete timestamp when deletion is legally and operationally allowed. |
| isDeleted | boolean | Boolean @default(false) | No | — | Soft-delete marker. Must match deletedAt consistency rule. |
| version | integer | Int @default(1) | No | — | Optimistic concurrency token incremented on each mutation. |

**Indexes**

- `UNIQUE (invoiceId)` where `isDeleted = false AND status IN (Draft, Active, Completed)` to prevent multiple active plans for one invoice.
- `INDEX (branchId, status, createdAt DESC)`.
- `INDEX (enrollmentId)`.

**Constraints**

- `CHECK (totalAmount > 0)`.
- `CHECK (numberOfInstallments BETWEEN 1 AND 120)`.
- `branchId` must equal parent `Invoice.branchId`.
- `totalAmount` must equal the billable amount covered by the plan and must equal the sum of non-cancelled Installment.amount values.
- An Active plan cannot be structurally edited after a Posted payment allocation exists; correction requires controlled cancellation/replacement where financially valid.
- Completed plan requires every non-cancelled installment status to be Paid.

### 4.4 Installment (`finance_installment`)

Represents one scheduled repayment obligation within an installment plan.

| Field | PostgreSQL Type | Prisma Equivalent | Nullable | Key / Reference | Description |
|---|---|---|---|---|---|
| id | uuid | String @id @db.Uuid | No | PK | Installment identifier. |
| installmentPlanId | uuid | String @db.Uuid | No | FK → InstallmentPlan.id | Parent plan. |
| sequenceNumber | smallint | Int | No | Unique within plan | Installment order. |
| dueDate | date | DateTime @db.Date | No | — | Scheduled due date. |
| amount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Scheduled installment amount. |
| paidAmount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Sum of Posted payment allocations less executed refund effects allocated to this installment. |
| status | InstallmentStatus enum | InstallmentStatus | No | — | Derived settlement state. |
| lastPaymentAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Latest successful payment allocation timestamp. |
| createdAt | timestamptz(6) | DateTime @default(now()) @db.Timestamptz(6) | No | — | Creation timestamp in GST-aware UTC storage. |
| createdBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that created the row. |
| updatedAt | timestamptz(6) | DateTime @updatedAt @db.Timestamptz(6) | No | — | Last update timestamp. |
| updatedBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that last updated the row. |
| deletedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Soft-delete timestamp when deletion is legally and operationally allowed. |
| isDeleted | boolean | Boolean @default(false) | No | — | Soft-delete marker. Must match deletedAt consistency rule. |
| version | integer | Int @default(1) | No | — | Optimistic concurrency token incremented on each mutation. |

**Indexes**

- `UNIQUE (installmentPlanId, sequenceNumber)`.
- `INDEX (dueDate, status)` for due and overdue processing.
- `INDEX (installmentPlanId, dueDate)`.

**Constraints**

- `CHECK (sequenceNumber >= 1)`.
- `CHECK (amount > 0)`.
- `CHECK (paidAmount >= 0 AND paidAmount <= amount)`.
- Due dates must be non-decreasing by sequence number.
- Status is derived: Pending when paidAmount=0 and not overdue; PartiallyPaid when 0<paidAmount<amount; Paid when paidAmount=amount; Overdue when dueDate is before GST business date and paidAmount<amount.
- Paid installment rows cannot be soft deleted.

### 4.5 Payment (`finance_payment`)

Records authorized settlement against an invoice. Payment creation, allocation, invoice balance update, installment update, receivable update, receipt creation, and audit persistence are one transaction boundary.

| Field | PostgreSQL Type | Prisma Equivalent | Nullable | Key / Reference | Description |
|---|---|---|---|---|---|
| id | uuid | String @id @db.Uuid | No | PK | Payment identifier. |
| paymentNumber | varchar(50) | String @db.VarChar(50) | No | Unique under numbering scope | Controlled payment reference. |
| invoiceId | uuid | String @db.Uuid | No | FK → Invoice.id | Invoice obligation settled by this payment. |
| studentProfileId | uuid | String? @db.Uuid | Yes | FK → StudentProfile.id | Student payer reference where applicable. |
| corporateAccountId | uuid | String? @db.Uuid | Yes | FK → CorporateAccount.id | Corporate payer reference where applicable. |
| branchId | uuid | String @db.Uuid | No | FK → Branch.id | Collection branch; must be authorized and compatible with invoice collection policy. |
| paymentDate | date | DateTime @db.Date | No | — | Business payment date. |
| paymentMethod | PaymentMethod enum | PaymentMethod | No | — | Controlled payment method. |
| currency | varchar(3) | String @db.VarChar(3) | No | — | Must match invoice currency in current scope. |
| amount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Posted payment amount. |
| referenceNumber | varchar(120) | String? @db.VarChar(120) | Yes | — | External bank, card terminal, cheque, or corporate reference when required. |
| remarks | varchar(1000) | String? @db.VarChar(1000) | Yes | — | Operational payment remarks. |
| receivedBy | uuid | String @db.Uuid | No | FK → User.id | Cashier/finance user that received or recorded payment. |
| status | PaymentStatus enum | PaymentStatus | No | — | Payment lifecycle state. |
| idempotencyKey | varchar(100) | String @db.VarChar(100) | No | Unique | Client/server request deduplication key. |
| postedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Successful posting timestamp. |
| reversedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Authorized reversal timestamp if a future approved reversal path is used. |
| reversalReason | varchar(500) | String? @db.VarChar(500) | Yes | — | Mandatory for reversal. |
| createdAt | timestamptz(6) | DateTime @default(now()) @db.Timestamptz(6) | No | — | Creation timestamp in GST-aware UTC storage. |
| createdBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that created the row. |
| updatedAt | timestamptz(6) | DateTime @updatedAt @db.Timestamptz(6) | No | — | Last update timestamp. |
| updatedBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that last updated the row. |
| deletedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Soft-delete timestamp when deletion is legally and operationally allowed. |
| isDeleted | boolean | Boolean @default(false) | No | — | Soft-delete marker. Must match deletedAt consistency rule. |
| version | integer | Int @default(1) | No | — | Optimistic concurrency token incremented on each mutation. |

**Indexes**

- `UNIQUE (idempotencyKey)`.
- `UNIQUE (paymentNumber)` or `UNIQUE (branchId, paymentNumber)` according to NumberingSeries scope.
- `INDEX (invoiceId, status, paymentDate DESC)`.
- `INDEX (branchId, paymentDate DESC)`.
- `INDEX (studentProfileId, paymentDate DESC)` where non-null.
- `INDEX (corporateAccountId, paymentDate DESC)` where non-null.
- `INDEX (referenceNumber)` where non-null for duplicate-detection assistance.

**Constraints**

- `CHECK (amount > 0)`.
- Payment currency must equal invoice currency in current scope; cross-currency settlement is excluded.
- Posted payment amount cannot exceed invoice outstanding amount at transaction-lock time in ordinary payment flow.
- `referenceNumber` is mandatory for BankTransfer, Card, Online, and Cheque; optional for Cash and CorporateBilling unless policy requires it.
- `receivedBy` must equal the authenticated mutation actor or an approved delegated service identity and must have branch access.
- Posted, Refunded, or PartiallyRefunded payments cannot be soft deleted or directly edited.
- Duplicate idempotency keys return the original payment result when payload hash/semantic content matches; conflicting payload reuse is rejected and security-logged.

### 4.6 PaymentAllocation (`finance_payment_allocation`)

Provides settlement traceability from Payment to Invoice and optional Installment. Current Module 12 policy requires every ordinary Payment to settle exactly one Invoice, while multiple allocation rows may distribute the payment across installments.

| Field | PostgreSQL Type | Prisma Equivalent | Nullable | Key / Reference | Description |
|---|---|---|---|---|---|
| id | uuid | String @id @db.Uuid | No | PK | Allocation identifier. |
| paymentId | uuid | String @db.Uuid | No | FK → Payment.id | Parent payment. |
| invoiceId | uuid | String @db.Uuid | No | FK → Invoice.id | Invoice allocation target; must equal parent payment.invoiceId in current scope. |
| installmentId | uuid | String? @db.Uuid | Yes | FK → Installment.id | Optional installment target. |
| allocatedAmount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Amount allocated by this row. |
| allocationSequence | smallint | Int | No | Unique within payment | Stable allocation order. |
| allocatedAt | timestamptz(6) | DateTime @db.Timestamptz(6) | No | — | Allocation time. |
| createdAt | timestamptz(6) | DateTime @default(now()) @db.Timestamptz(6) | No | — | Creation timestamp in GST-aware UTC storage. |
| createdBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that created the row. |
| updatedAt | timestamptz(6) | DateTime @updatedAt @db.Timestamptz(6) | No | — | Last update timestamp. |
| updatedBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that last updated the row. |
| deletedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Soft-delete timestamp when deletion is legally and operationally allowed. |
| isDeleted | boolean | Boolean @default(false) | No | — | Soft-delete marker. Must match deletedAt consistency rule. |
| version | integer | Int @default(1) | No | — | Optimistic concurrency token incremented on each mutation. |

**Indexes**

- `UNIQUE (paymentId, allocationSequence)`.
- `INDEX (paymentId)`.
- `INDEX (invoiceId)`.
- `INDEX (installmentId)` where non-null.

**Constraints**

- `CHECK (allocatedAmount > 0)`.
- `CHECK (allocationSequence >= 1)`.
- For current scope, every allocation.invoiceId must equal parent Payment.invoiceId.
- Sum of active allocations for a Posted payment must equal Payment.amount.
- Allocation to an installment cannot exceed that installment remaining balance at posting time.
- Allocation sum to all installments cannot exceed payment amount or invoice outstanding amount at posting time.
- Posted allocations are immutable. Refund execution creates compensating financial effects; it does not rewrite original allocations.

### 4.7 Receipt (`finance_receipt`)

Authoritative receipt metadata created as part of successful Payment posting. Exactly one receipt row exists per payment; controlled re-rendering updates document metadata and creates audit history rather than duplicating the receipt.

| Field | PostgreSQL Type | Prisma Equivalent | Nullable | Key / Reference | Description |
|---|---|---|---|---|---|
| id | uuid | String @id @db.Uuid | No | PK | Receipt identifier. |
| receiptNumber | varchar(50) | String @db.VarChar(50) | No | Unique under numbering scope | Controlled receipt number. |
| paymentId | uuid | String @db.Uuid | No | FK → Payment.id, Unique | Exactly one receipt per payment. |
| branchId | uuid | String @db.Uuid | No | FK → Branch.id | Receipt issuing branch. |
| receiptDate | date | DateTime @db.Date | No | — | Business receipt date. |
| amount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Receipt amount equal to parent payment amount. |
| currency | varchar(3) | String @db.VarChar(3) | No | — | Currency equal to parent payment currency. |
| receiptUrl | text | String? @db.Text | Yes | — | Authorized generated document object reference or URL; not an unrestricted public URL. |
| issuedBy | uuid | String @db.Uuid | No | FK → User.id | Actor or service identity that issued the receipt. |
| issuedAt | timestamptz(6) | DateTime @db.Timestamptz(6) | No | — | Issue timestamp. |
| renderVersion | integer | Int @default(1) | No | — | Document rendering revision counter; re-render does not create a second receipt record. |
| lastRenderedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Most recent controlled render timestamp. |
| createdAt | timestamptz(6) | DateTime @default(now()) @db.Timestamptz(6) | No | — | Creation timestamp in GST-aware UTC storage. |
| createdBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that created the row. |
| updatedAt | timestamptz(6) | DateTime @updatedAt @db.Timestamptz(6) | No | — | Last update timestamp. |
| updatedBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that last updated the row. |
| deletedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Soft-delete timestamp when deletion is legally and operationally allowed. |
| isDeleted | boolean | Boolean @default(false) | No | — | Soft-delete marker. Must match deletedAt consistency rule. |
| version | integer | Int @default(1) | No | — | Optimistic concurrency token incremented on each mutation. |

**Indexes**

- `UNIQUE (paymentId)`.
- `UNIQUE (receiptNumber)` or `UNIQUE (branchId, receiptNumber)` according to NumberingSeries scope.
- `INDEX (branchId, receiptDate DESC)`.

**Constraints**

- `CHECK (amount > 0)`.
- Receipt amount and currency must equal parent Posted payment amount and currency.
- Receipt branch must equal Payment.branchId.
- Receipt cannot be created for Failed or Pending payment.
- Receipt rows cannot be soft deleted after issuance.
- `renderVersion >= 1`.

### 4.8 Refund (`finance_refund`)

Controls refund request, decision, and execution without rewriting the source Payment. Refund state transitions are permission-separated and fully audited.

| Field | PostgreSQL Type | Prisma Equivalent | Nullable | Key / Reference | Description |
|---|---|---|---|---|---|
| id | uuid | String @id @db.Uuid | No | PK | Refund identifier. |
| refundNumber | varchar(50) | String @db.VarChar(50) | No | Unique under numbering scope | Controlled refund number. |
| invoiceId | uuid | String @db.Uuid | No | FK → Invoice.id | Invoice affected by refund. |
| paymentId | uuid | String @db.Uuid | No | FK → Payment.id | Original posted payment source. |
| branchId | uuid | String @db.Uuid | No | FK → Branch.id | Refund operational branch; normally invoice branch. |
| refundType | RefundType enum | RefundType | No | — | Full or Partial. |
| amount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Requested and approved refund amount. |
| reason | varchar(1000) | String @db.VarChar(1000) | No | — | Mandatory business reason. |
| requestedBy | uuid | String @db.Uuid | No | FK → User.id | Refund requester. |
| requestedAt | timestamptz(6) | DateTime @db.Timestamptz(6) | No | — | Request timestamp. |
| approvedBy | uuid | String? @db.Uuid | Yes | FK → User.id | Decision actor for approval or rejection. |
| approvedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Approval timestamp. |
| rejectedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Rejection timestamp. |
| decisionRemarks | varchar(1000) | String? @db.VarChar(1000) | Yes | — | Approval/rejection remarks; mandatory for rejection. |
| executedBy | uuid | String? @db.Uuid | Yes | FK → User.id | Authorized execution actor. |
| executedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Financial execution timestamp. |
| executionReference | varchar(120) | String? @db.VarChar(120) | Yes | — | Bank/cash/processor settlement reference where applicable. |
| status | RefundStatus enum | RefundStatus | No | — | Refund lifecycle state. |
| createdAt | timestamptz(6) | DateTime @default(now()) @db.Timestamptz(6) | No | — | Creation timestamp in GST-aware UTC storage. |
| createdBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that created the row. |
| updatedAt | timestamptz(6) | DateTime @updatedAt @db.Timestamptz(6) | No | — | Last update timestamp. |
| updatedBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that last updated the row. |
| deletedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Soft-delete timestamp when deletion is legally and operationally allowed. |
| isDeleted | boolean | Boolean @default(false) | No | — | Soft-delete marker. Must match deletedAt consistency rule. |
| version | integer | Int @default(1) | No | — | Optimistic concurrency token incremented on each mutation. |

**Indexes**

- `UNIQUE (refundNumber)` or `UNIQUE (branchId, refundNumber)` according to NumberingSeries scope.
- `INDEX (invoiceId, status, requestedAt DESC)`.
- `INDEX (paymentId, status)`.
- `INDEX (branchId, status, requestedAt DESC)`.
- Optional partial unique index preventing multiple concurrent `Requested` or `Approved` refunds from oversubscribing the same payment balance.

**Constraints**

- `CHECK (amount > 0)`.
- `reason` trimmed length must be between 10 and 1000 characters.
- Payment must be Posted, PartiallyRefunded, or another explicitly refundable state.
- Cumulative Executed refund amount for a payment cannot exceed the payment amount.
- Full refund amount must equal remaining refundable amount at approval/execution time.
- Requester and approver must be different users when maker-checker policy is enabled; self-approval is denied by default.
- Allowed transitions: Requested→Approved/Rejected/Cancelled; Approved→Executed/Failed; Failed may be retried only through an explicitly audited execution attempt process; Executed and Rejected are terminal for mutation of the original request.
- Rejected status requires approvedBy, rejectedAt, and decisionRemarks. Approved requires approvedBy and approvedAt. Executed requires executedBy, executedAt, and an execution reference when settlement method requires one.
- Executed refund rows cannot be soft deleted.

### 4.9 Receivable (`finance_receivable`)

Operational open-balance projection maintained transactionally for balance changes and recalculated for aging progression. Invoice remains the source of billed obligation; Receivable is the finance-owned collection position.

| Field | PostgreSQL Type | Prisma Equivalent | Nullable | Key / Reference | Description |
|---|---|---|---|---|---|
| id | uuid | String @id @db.Uuid | No | PK | Receivable identifier. |
| invoiceId | uuid | String @db.Uuid | No | FK → Invoice.id, Unique | One operational receivable position per invoice. |
| corporateAccountId | uuid | String? @db.Uuid | Yes | FK → CorporateAccount.id | Corporate debtor reference. |
| studentProfileId | uuid | String? @db.Uuid | Yes | FK → StudentProfile.id | Student debtor reference. |
| branchId | uuid | String @db.Uuid | No | FK → Branch.id | Owning branch copied from invoice. |
| dueDate | date | DateTime @db.Date | No | — | Due date copied from invoice and synchronized through controlled service logic. |
| currency | varchar(3) | String @db.VarChar(3) | No | — | Currency copied from invoice. |
| outstandingAmount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Current invoice open balance. |
| daysPastDue | integer | Int | No | — | Derived against GST business date; zero for not-yet-due balances. |
| agingBucket | AgingBucket enum | AgingBucket | No | — | Derived aging classification. |
| status | ReceivableStatus enum | ReceivableStatus | No | — | Open, partial, overdue, settled, or written-off state. |
| lastCalculatedAt | timestamptz(6) | DateTime @db.Timestamptz(6) | No | — | Most recent balance/aging calculation timestamp. |
| createdAt | timestamptz(6) | DateTime @default(now()) @db.Timestamptz(6) | No | — | Creation timestamp in GST-aware UTC storage. |
| createdBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that created the row. |
| updatedAt | timestamptz(6) | DateTime @updatedAt @db.Timestamptz(6) | No | — | Last update timestamp. |
| updatedBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that last updated the row. |
| deletedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Soft-delete timestamp when deletion is legally and operationally allowed. |
| isDeleted | boolean | Boolean @default(false) | No | — | Soft-delete marker. Must match deletedAt consistency rule. |
| version | integer | Int @default(1) | No | — | Optimistic concurrency token incremented on each mutation. |

**Indexes**

- `UNIQUE (invoiceId)` where `isDeleted = false`.
- `INDEX (branchId, status, dueDate)`.
- `INDEX (branchId, agingBucket, outstandingAmount DESC)`.
- `INDEX (corporateAccountId, status, dueDate)` where non-null.
- `INDEX (studentProfileId, status, dueDate)` where non-null.

**Constraints**

- `CHECK (outstandingAmount >= 0)`.
- `CHECK (daysPastDue >= 0)`.
- Receivable branch, dueDate, currency, and customer references must match the parent Invoice authoritative values.
- Outstanding amount must reconcile with Invoice.outstandingAmount after every successful balance-changing transaction.
- When outstandingAmount=0, status must be Settled and daysPastDue=0. Settled receivable history is retained and not deleted.
- Aging bucket is derived by the single approved aging algorithm in Section 3.1.

### 4.10 CorporateCreditRule (`finance_corporate_credit_rule`)

Effective-dated corporate credit policy and exposure snapshot used by corporate enrollment validation. Historical rules are superseded rather than overwritten or deleted.

| Field | PostgreSQL Type | Prisma Equivalent | Nullable | Key / Reference | Description |
|---|---|---|---|---|---|
| id | uuid | String @id @db.Uuid | No | PK | Credit-rule version identifier. |
| corporateAccountId | uuid | String @db.Uuid | No | FK → CorporateAccount.id | Corporate account governed by the rule. |
| branchId | uuid | String @db.Uuid | No | FK → Branch.id | Policy-owning branch/context. Consolidated corporate policies require explicit approved scope. |
| currency | varchar(3) | String @db.VarChar(3) | No | — | Credit limit currency. |
| creditLimit | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Maximum configured exposure. |
| blockOnCreditLimit | boolean | Boolean | No | — | Whether exposure breach blocks enrollment. |
| currentOutstanding | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Current posted receivable exposure snapshot. |
| committedAmount | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | Approved/confirmed commitments not yet included in current outstanding. |
| availableCredit | numeric(18,3) | Decimal @db.Decimal(18,3) | No | — | creditLimit - currentOutstanding - committedAmount; may be negative for warning mode. |
| effectiveStartDate | date | DateTime @db.Date | No | — | Inclusive policy validity start. |
| effectiveEndDate | date | DateTime? @db.Date | Yes | — | Inclusive policy validity end; null means open-ended. |
| status | CorporateCreditRuleStatus enum | CorporateCreditRuleStatus | No | — | Effective-dated policy lifecycle. |
| lastCalculatedAt | timestamptz(6) | DateTime @db.Timestamptz(6) | No | — | Exposure snapshot calculation timestamp. |
| createdAt | timestamptz(6) | DateTime @default(now()) @db.Timestamptz(6) | No | — | Creation timestamp in GST-aware UTC storage. |
| createdBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that created the row. |
| updatedAt | timestamptz(6) | DateTime @updatedAt @db.Timestamptz(6) | No | — | Last update timestamp. |
| updatedBy | uuid | String @db.Uuid | No | FK → User.id | Actor or approved service-user that last updated the row. |
| deletedAt | timestamptz(6) | DateTime? @db.Timestamptz(6) | Yes | — | Soft-delete timestamp when deletion is legally and operationally allowed. |
| isDeleted | boolean | Boolean @default(false) | No | — | Soft-delete marker. Must match deletedAt consistency rule. |
| version | integer | Int @default(1) | No | — | Optimistic concurrency token incremented on each mutation. |

**Indexes**

- `INDEX (corporateAccountId, status, effectiveStartDate DESC)`.
- `INDEX (branchId, status)`.
- PostgreSQL exclusion constraint or transactionally enforced rule preventing overlapping Active effective-date ranges for the same `(corporateAccountId, currency, applicable scope)`.

**Constraints**

- `CHECK (creditLimit >= 0 AND currentOutstanding >= 0 AND committedAmount >= 0)`.
- `CHECK (effectiveEndDate IS NULL OR effectiveEndDate >= effectiveStartDate)`.
- `availableCredit = creditLimit - currentOutstanding - committedAmount` using decimal arithmetic. Negative values are allowed when exposure exceeds limit.
- Only one rule version may be Active for a corporate account/currency/scope on any business date.
- Activating a new rule closes or supersedes the prior active version; historical values are retained.
- Credit validation outcome: Allow when projected exposure <= creditLimit; Block when projected exposure > creditLimit and blockOnCreditLimit=true; AllowWithWarning when projected exposure > creditLimit and blockOnCreditLimit=false.
- Rule versions that have ever been Active cannot be hard deleted. Draft versions may be soft deleted only before use and with audit logging.

## 5. Relationship Model

### 5.1 Relationship Summary

| Parent | Child / Referenced Entity | Cardinality | FK Location | Delete Rule | Update Rule | Ownership Note |
|---|---|---|---|---|---|---|
| Invoice | InvoiceLineItem | 1:N | InvoiceLineItem.invoiceId | RESTRICT | CASCADE key update not used | Invoice aggregate child; no physical cascade. |
| Invoice | Payment | 1:N | Payment.invoiceId | RESTRICT | RESTRICT | Payment is separately auditable aggregate root. |
| Invoice | InstallmentPlan | 1:0..1 active | InstallmentPlan.invoiceId | RESTRICT | RESTRICT | Historical cancelled/replaced plan rows may exist, but only one active plan. |
| InstallmentPlan | Installment | 1:N | Installment.installmentPlanId | RESTRICT | RESTRICT | Plan child records retained for audit. |
| Payment | PaymentAllocation | 1:N | PaymentAllocation.paymentId | RESTRICT | RESTRICT | Posted allocations immutable. |
| Invoice | PaymentAllocation | 1:N | PaymentAllocation.invoiceId | RESTRICT | RESTRICT | Current scope requires same invoice as Payment.invoiceId. |
| Installment | PaymentAllocation | 1:N | PaymentAllocation.installmentId | RESTRICT | RESTRICT | Nullable for invoice-level payment without installment plan. |
| Payment | Receipt | 1:0..1 | Receipt.paymentId UNIQUE | RESTRICT | RESTRICT | Exactly one receipt after successful posting. |
| Invoice | Refund | 1:N | Refund.invoiceId | RESTRICT | RESTRICT | Refund does not mutate original invoice history. |
| Payment | Refund | 1:N | Refund.paymentId | RESTRICT | RESTRICT | Cumulative executed refund bounded by payment amount. |
| Invoice | Receivable | 1:1 | Receivable.invoiceId UNIQUE | RESTRICT | RESTRICT | Receivable retained after settlement for historical reporting. |
| CorporateAccount | CorporateCreditRule | 1:N versions | CorporateCreditRule.corporateAccountId | RESTRICT | RESTRICT | Corporate Training owns account; Finance owns rules. |
| StudentProfile | Invoice | 1:N | Invoice.studentProfileId | RESTRICT | RESTRICT | Cross-context reference. |
| CorporateAccount | Invoice | 1:N | Invoice.corporateAccountId | RESTRICT | RESTRICT | Cross-context reference. |
| Enrollment | Invoice / InvoiceLineItem / InstallmentPlan | 1:N / 1:N / 1:N over time | respective enrollmentId | RESTRICT | RESTRICT | Enrollment remains lifecycle owner. |
| Branch | finance roots | 1:N | branchId | RESTRICT | RESTRICT | Organization-owned branch controls server scope. |
| User | audit actor columns | 1:N | createdBy/updatedBy/issuedBy/receivedBy/requestedBy/approvedBy/executedBy | RESTRICT | RESTRICT | IAM owns User. Historic user references must remain resolvable. |

### 5.2 Cascade Policy

Financial tables use **no physical `ON DELETE CASCADE` paths**. The default rule is `ON DELETE RESTRICT ON UPDATE RESTRICT` because:

1. cross-context entities must not be deleted from Finance;
2. invoice and settlement history must remain independently auditable;
3. soft deletion, cancellation, refund, reversal, supersession, and settlement are business transitions, not row-deletion mechanics; and
4. a cascading delete from Invoice to Payment, Receipt, Refund, or Receivable would destroy the audit chain.

For draft-only child rows, application services may soft-delete children inside the same aggregate transaction before issue/activation. Physical deletion is reserved for controlled non-production cleanup or migration rollback tooling and is not exposed through application CRUD.

### 5.3 N:M Relationship Position

Module 12 does not require a generic unconstrained N:M join table between core financial aggregates. The closest many-to-many business relationship is Payment-to-Installment settlement, which is intentionally modeled as the explicit `PaymentAllocation` associative entity:

```text
Payment 1 ─── N PaymentAllocation N ─── 0..1 Installment
                     |
                     N
                     |
                     1
                  Invoice
```

The associative entity carries `allocatedAmount`, `allocationSequence`, `allocatedAt`, and audit columns, so the relationship is not represented as an implicit Prisma many-to-many relation.

## 6. Branch Scoping Model

### 6.1 Scope Resolution Algorithm

Every administrative query or mutation must resolve scope on the server using IAM `UserBranchAccess` and Organization branch hierarchy. Client-submitted branch IDs are filters inside the authorized set; they are never authorization evidence.

1. Resolve authenticated `userId`.
2. Load active UserBranchAccess assignments.
3. Expand child branches only when `canViewChildBranches=true`.
4. For ordinary operational access, intersect the resolved authorized branch set with the requested branch filter.
5. For consolidated reporting, require both `finance.report.consolidated` and an IAM entitlement that permits consolidated or hierarchy access.
6. Reject mutations when target Invoice/Payment/Refund/CreditRule branch is outside the authorized mutation scope.
7. For consolidated corporate invoices spanning source branches, authorize the invoice-owning branch and each line's `sourceBranchId` under the dedicated consolidated billing workflow.
8. Apply branch predicates before pagination, aggregation, export counting, or lookup hydration to prevent existence disclosure.
9. Audit denied mutation attempts and suspicious cross-branch identifier probes without returning sensitive entity details.

### 6.2 Branch Predicate Examples

| Entity | Default Scope Predicate | Consolidated Read Rule | Mutation Rule |
|---|---|---|---|
| Invoice | `invoice.branchId IN authorizedBranchIds` | Allowed with `finance.report.consolidated` and consolidated IAM entitlement. | Create/issue/cancel only in authorized mutation branch; cross-branch invoice requires dedicated workflow. |
| InvoiceLineItem | Scope through parent Invoice plus sourceBranch validation for consolidated corporate invoices. | Parent invoice scope plus authorized line source branches. | Mutated only through Invoice aggregate service. |
| InstallmentPlan / Installment | Scope through plan.branchId or parent Invoice. | Same as Invoice. | Requires parent Invoice branch access. |
| Payment | `payment.branchId IN authorizedBranchIds` and linked Invoice visible. | Consolidated read only with explicit permission. | Collector must have access to collection branch and linked invoice branch policy. |
| Receipt | `receipt.branchId IN authorizedBranchIds`. | Consolidated read only with permission. | Created only within Payment posting transaction. |
| Refund | `refund.branchId IN authorizedBranchIds`. | Consolidated read only with permission. | Request/approve/execute each require target branch access and separate capability permissions. |
| Receivable | `receivable.branchId IN authorizedBranchIds`. | Consolidated aggregation allowed only through dedicated permission path. | No direct human update; finance services maintain it. |
| CorporateCreditRule | `creditRule.branchId IN authorizedBranchIds` plus corporate-account access policy. | Consolidated read with explicit permission. | Manage only with `finance.credit.manage` and scope authorization. |

## 7. CRUD Action Semantics

The CRUD matrix uses the following action codes:

| Code | Meaning |
|---|---|
| C | Create through authorized application service or workflow. |
| R | Read under permission and branch scope. |
| U | Update only fields and states allowed by domain rules; does not imply unrestricted row editing. |
| D | Business delete action. In Module 12 this means soft-delete for eligible draft/configuration records or lifecycle cancellation/supersession where direct deletion is prohibited. |
| A | Read audit history and/or create audit records depending on actor type. Human actors marked A may view audit data with `finance.audit.read`; system audit actor creates immutable audit records. |
| — | Action not permitted through this context. |

## 8. Human Actor CRUD Matrix

| Human Actor | Entity | C | R | U | D | A | Required Branch-Scoping Logic |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| Finance Officer | Invoice | ✓ | ✓ | ✓ | Conditional | Limited | Server-resolved assigned branches; cancellation requires `finance.invoice.cancel`; no cross-branch mutation without dedicated consolidated billing authority. |
| Finance Officer | InvoiceLineItem | ✓ | ✓ | Draft only | Draft only | Limited | Through authorized parent Invoice; sourceBranchId validated for each line. |
| Finance Officer | InstallmentPlan | ✓ | ✓ | ✓ | Conditional | Limited | Parent Invoice branch must be authorized; active paid plan cannot be deleted. |
| Finance Officer | Installment | ✓ | ✓ | Schedule-only before payment | Conditional | Limited | Inherits parent plan branch; payment-derived paidAmount/status are system-maintained. |
| Finance Officer | Payment | ✓ | ✓ | No after Posted | No | Limited | Requires `finance.payment.record`; invoice and collection branch must be within allowed scope. |
| Finance Officer | PaymentAllocation | Indirect | ✓ | No after Posted | No | Limited | Created only by payment-posting service under parent Payment/Invoice scope. |
| Finance Officer | Receipt | Indirect | ✓ | Render metadata only | No | Limited | Receipt branch inherited from Payment; re-render requires receipt read permission and is audited. |
| Finance Officer | Refund | ✓ Request | ✓ | Limited by state | Cancel Requested only | Limited | Request only for visible Payment/Invoice in authorized branch. Approval not implied. |
| Finance Officer | Receivable | — | ✓ | — | — | Limited | Read only for assigned branches; maintained by finance services. |
| Finance Officer | CorporateCreditRule | Conditional | ✓ | Conditional | Draft only | Limited | `finance.credit.manage` required for C/U/D; branch and corporate scope checked server-side. |
| Cashier / Front Desk Officer | Invoice | — | ✓ | — | — | — | Read only in collection-authorized branches and only fields required for payment service. |
| Cashier / Front Desk Officer | InvoiceLineItem | — | ✓ | — | — | — | Through visible invoice only. |
| Cashier / Front Desk Officer | InstallmentPlan | — | ✓ | — | — | — | Through visible invoice; no schedule mutation. |
| Cashier / Front Desk Officer | Installment | — | ✓ | — | — | — | Through visible invoice and plan. |
| Cashier / Front Desk Officer | Payment | ✓ | ✓ | — | — | — | `finance.payment.record`; collection and invoice scope validated. |
| Cashier / Front Desk Officer | PaymentAllocation | Indirect | ✓ | — | — | — | Payment service creates allocations; cashier cannot edit them directly. |
| Cashier / Front Desk Officer | Receipt | Indirect | ✓ | Render only | — | — | Visible only for payments cashier is authorized to access. |
| Cashier / Front Desk Officer | Refund | Conditional Request | ✓ | Cancel own Requested only | — | — | Only if `finance.refund.request` is explicitly granted and source payment branch is authorized. |
| Cashier / Front Desk Officer | Receivable | — | Limited | — | — | — | Only invoice balance required for collection in authorized branches. |
| Cashier / Front Desk Officer | CorporateCreditRule | — | — | — | — | — | No access by default. |
| Finance Manager | Invoice | ✓ | ✓ | ✓ | Conditional | ✓ | Assigned branches; consolidated read requires separate permission; mutation remains branch-bound. |
| Finance Manager | InvoiceLineItem | ✓ | ✓ | Draft only | Draft only | ✓ | Through parent Invoice and source branch controls. |
| Finance Manager | InstallmentPlan | ✓ | ✓ | ✓ | Conditional | ✓ | Parent Invoice branch authorization. |
| Finance Manager | Installment | ✓ | ✓ | Pre-payment schedule only | Conditional | ✓ | Inherits plan scope. |
| Finance Manager | Payment | ✓ | ✓ | No after Posted | No | ✓ | Payment record permission and branch scope required. |
| Finance Manager | PaymentAllocation | Indirect | ✓ | No after Posted | No | ✓ | Service-owned mutation only. |
| Finance Manager | Receipt | Indirect | ✓ | Render metadata only | No | ✓ | Same branch as Payment. |
| Finance Manager | Refund | ✓ | ✓ | Approve/Reject/Execute by permission | Cancel Requested only | ✓ | Separate `request`, `approve`, and `execute` permissions; branch scope on every transition. |
| Finance Manager | Receivable | — | ✓ | — | — | ✓ | Assigned/consolidated branches according to reporting permission. |
| Finance Manager | CorporateCreditRule | ✓ | ✓ | ✓ | Draft only / Supersede | ✓ | `finance.credit.manage`; no overlapping effective period; branch/corporate scope required. |
| Branch Manager | Invoice | — | ✓ | — | Conditional Cancel if delegated | Limited | Current branch plus child branches only if IAM hierarchy entitlement allows. |
| Branch Manager | InvoiceLineItem | — | ✓ | — | — | Limited | Through visible Invoice. |
| Branch Manager | InstallmentPlan | — | ✓ | — | — | Limited | Through visible Invoice. |
| Branch Manager | Installment | — | ✓ | — | — | Limited | Through visible plan. |
| Branch Manager | Payment | — | ✓ | — | — | Limited | Branch operational read only. |
| Branch Manager | PaymentAllocation | — | ✓ | — | — | Limited | Through visible Payment. |
| Branch Manager | Receipt | — | ✓ | — | — | Limited | Through visible Payment/Receipt branch. |
| Branch Manager | Refund | Conditional Request | ✓ | Conditional Approval if delegated | — | Limited | Requires explicit permissions; hierarchy scope never inferred from role name. |
| Branch Manager | Receivable | — | ✓ | — | — | Limited | Branch or entitled child branches. |
| Branch Manager | CorporateCreditRule | — | ✓ | — | — | Limited | Read only when corporate account/branch scope is authorized. |
| Admission Officer / Counselor | Invoice | — | Limited | — | — | — | Only invoices linked to enrollments/students within authorized operational branch and only billing summary fields. |
| Admission Officer / Counselor | InvoiceLineItem | — | Limited | — | — | — | Only fee summary fields through enrollment service boundary. |
| Admission Officer / Counselor | InstallmentPlan | — | Limited | — | — | — | Read schedule/payment status only for serviced enrollment. |
| Admission Officer / Counselor | Installment | — | Limited | — | — | — | Read status only. |
| Admission Officer / Counselor | Payment | — | Limited | — | — | — | Payment-status summary; no sensitive collection reference unless separately permitted. |
| Admission Officer / Counselor | PaymentAllocation | — | — | — | — | — | Not exposed directly. |
| Admission Officer / Counselor | Receipt | — | Limited | — | — | — | Retrieval only when permitted to service learner and branch. |
| Admission Officer / Counselor | Refund | — | Status only | — | — | — | Status visibility only when linked to serviced enrollment. |
| Admission Officer / Counselor | Receivable | — | Balance only | — | — | — | Enrollment-linked payment balance service, not unrestricted receivable search. |
| Admission Officer / Counselor | CorporateCreditRule | — | — | — | — | — | No direct access. |
| Corporate Account Manager | Invoice | — | ✓ | — | — | — | Corporate-account and authorized branch scope; no unrelated student billing access. |
| Corporate Account Manager | InvoiceLineItem | — | ✓ | — | — | — | Through corporate Invoice and permitted corporate account. |
| Corporate Account Manager | InstallmentPlan | — | ✓ | — | — | — | When linked to permitted corporate billing obligation. |
| Corporate Account Manager | Installment | — | ✓ | — | — | — | Same corporate scope. |
| Corporate Account Manager | Payment | — | ✓ | — | — | — | Corporate account payment status only; no posting unless separately granted finance permission. |
| Corporate Account Manager | PaymentAllocation | — | Limited | — | — | — | Read through payment details when needed for reconciliation. |
| Corporate Account Manager | Receipt | — | ✓ | — | — | — | Corporate-account receipt access under branch/corporate scope. |
| Corporate Account Manager | Refund | Conditional Request | ✓ | — | — | — | Only if explicitly granted; source invoice/payment must belong to managed corporate account and authorized branch. |
| Corporate Account Manager | Receivable | — | ✓ | — | — | — | Managed corporate accounts and authorized branches only. |
| Corporate Account Manager | CorporateCreditRule | — | ✓ | — | — | — | Read exposure/rule only for managed corporate accounts and authorized branches. |
| Academic Coordinator | Invoice | — | Payment-status only | — | — | — | Consumes payment-validation service for enrollment in coordinator-authorized branch; no direct finance table browse. |
| Academic Coordinator | Payment | — | Summary only | — | — | — | Payment completion status only. |
| Academic Coordinator | Receivable | — | Balance status only | — | — | — | Through payment-validation service, not receivable grid. |
| Auditor / Compliance Reviewer | All finance entities | — | ✓ | — | — | ✓ | Read-only across explicitly assigned audit branches; consolidated access requires explicit entitlement; immutable audit trail available with `finance.audit.read`. |
| Executive / Consolidated Report Viewer | Invoice / Payment / Refund / Receivable | — | Aggregated | — | — | — | `finance.report.consolidated` plus multi-branch entitlement; row-level transaction access is not implied by dashboard permission. |
| Executive / Consolidated Report Viewer | Other finance entities | — | — | — | — | — | No operational entity access by default. |

## 9. System Actor CRUD Matrix

| System Actor | Entity | C | R | U | D | A | Branch-Scoping and Boundary Rule |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| Admission & Enrollment Module | Invoice | Request | Payment status | — | — | — | Supplies Enrollment ID; Finance independently loads enrollment and branch and validates billable state. Caller cannot override branch. |
| Admission & Enrollment Module | Receivable | — | Payment validation only | — | — | — | Consumes service result by enrollmentId; no direct table ownership. |
| Course Catalog Module | InvoiceLineItem | — | — | — | — | — | Supplies authoritative resolved pricing/discount/completion-rule references through service contract; Finance snapshots monetary values. |
| Training Delivery Module | InvoiceLineItem | — | — | — | — | — | Supplies Batch/source branch context through Enrollment/Batch references; cannot mutate finance records. |
| Corporate Training Module | Invoice | Request | Billing status | — | — | — | Corporate account, contract, participant, billing-cycle context supplied; Finance validates source branch/account scope. |
| Corporate Training Module | CorporateCreditRule | — | Validation result | — | — | — | Receives Allow/AllowWithWarning/Block result; no direct rule mutation. |
| Corporate Sales & Quotation Module | Invoice | Request | Traceability status | — | — | — | Approved quotation/sales order IDs are validated; Finance owns resulting invoice. |
| Finance Invoice Application Service | Invoice | ✓ | ✓ | ✓ | Business cancel | Creates audit | Runs in explicit branch scope; calculates totals and enforces state machine. |
| Finance Invoice Application Service | InvoiceLineItem | ✓ | ✓ | Draft update | Draft soft-delete | Creates audit | Same transaction and scope as parent Invoice. |
| Payment Posting Service | Payment | ✓ | ✓ | Status transition | — | Creates audit | Resolves invoice branch and collector authorization; idempotent transaction. |
| Payment Posting Service | PaymentAllocation | ✓ | ✓ | — after Posted | — | Creates audit | Allocation scope inherited from Payment/Invoice. |
| Payment Posting Service | Invoice | — | ✓ | Balance/status | — | Creates audit | Row/version lock or optimistic conflict check inside transaction. |
| Payment Posting Service | Installment / InstallmentPlan | — | ✓ | Paid amount/status | — | Creates audit | Parent Invoice scope; allocation bounded by remaining balance. |
| Payment Posting Service | Receipt | ✓ | ✓ | Render metadata | — | Creates audit | Created exactly once in same posting transaction. |
| Payment Posting Service | Receivable | Create if absent | ✓ | Balance/status | — | Creates audit | Same branch as Invoice; atomic reconciliation. |
| Refund Workflow Service | Refund | ✓ | ✓ | State transitions | Cancel Requested | Creates audit | Branch permission and maker-checker controls applied to each command. |
| Refund Execution Service | Payment | — | ✓ | Refund status | — | Creates audit | Source payment branch scope. |
| Refund Execution Service | Invoice / Receivable / Installment | — | ✓ | Approved compensating balance effects | — | Creates audit | Atomic financial effect; original Payment/Allocation history preserved. |
| Credit Validation Service | CorporateCreditRule | — | ✓ | Exposure snapshot by controlled recalculation | — | Creates audit for policy changes only | Determines applicable effective rule by business date and authorized corporate context. |
| Credit Validation Service | Receivable | — | ✓ | — | — | — | Aggregates only corporate account/branch data inside configured scope. |
| Aging Recalculation Job | Receivable | — | ✓ | daysPastDue/agingBucket/status | — | Operational audit/log | Processes branch-partitioned batches; never bypasses data ownership; uses GST business date. |
| Completion Module | Invoice / Receivable | — | Validation result only | — | — | — | Calls Finance payment-validation contract by Enrollment ID; no direct database access. |
| Certificate Module | Invoice / Receivable | — | Validation result only | — | — | — | Calls Finance validation only when payment validation is required. |
| Reporting & Dashboards Module | Invoice / Payment / Refund / Receivable | — | Read projection | — | — | — | Receives permission-aware, branch-scoped read model/query service output; does not own core transactions. |
| Audit & Compliance Module | Audit records | ✓ | ✓ | — | — | Immutable | Receives finance audit events/commands; branch and entity metadata retained. |
| Communication & Notification Module | Invoice / Installment / Payment / Receipt / Refund | — | Event payload only | — | — | — | Consumes internal event/request payloads containing minimum necessary data; no direct finance table writes. |
| Identity & Access Module | Finance entities | — | — | — | — | — | Supplies user identity, permissions, branch assignments, hierarchy entitlements; cannot mutate finance rows. |
| Organization Module | Finance entities | — | — | — | — | — | Supplies Branch/Institute references and hierarchy; branch deletion is restricted while finance references exist. |
| Configuration / Master Data Module | Finance entities | — | — | — | — | — | Supplies numbering series and controlled lookups; Finance consumes values but owns transaction snapshots. |

## 10. Transaction and Concurrency Boundaries

### 10.1 Invoice Issue Transaction

The Issue Invoice command must execute atomically:

1. load Draft Invoice by ID and expected `version`;
2. enforce actor permission and branch scope;
3. load active line items;
4. recompute subtotal, discount, tax, total, paid, and outstanding amounts using fixed-precision decimal arithmetic;
5. verify billed-party and enrollment/corporate traceability;
6. allocate invoice number from configured NumberingSeries under concurrency-safe sequence handling;
7. transition Invoice to Issued;
8. create or update Receivable;
9. increment Invoice version;
10. persist audit event with old/new state.

A conflict on version or numbering allocation rolls back the full command.

### 10.2 Payment Posting Transaction

The Payment posting boundary must atomically persist:

1. idempotency-key claim and duplicate check;
2. Payment row;
3. PaymentAllocation rows;
4. Invoice paid/outstanding/status update;
5. Installment paidAmount/status updates where a plan exists;
6. InstallmentPlan completion update where all obligations are paid;
7. Receivable balance/status reconciliation;
8. Receipt row and number allocation;
9. domain event persistence/dispatch within the modular-monolith reliability strategy;
10. audit event persistence.

No success response may be returned if Receipt creation or balance reconciliation fails.

### 10.3 Refund Execution Transaction

Refund execution must atomically:

1. reload Approved Refund and expected version;
2. lock or version-check source Payment and affected Invoice;
3. verify remaining refundable amount;
4. persist execution metadata and transition Refund to Executed;
5. update Payment refund status;
6. apply approved compensating balance effects to Invoice, Receivable, and installment settlement position where the business rule requires reopening an obligation;
7. increment affected aggregate versions;
8. persist audit events.

External bank settlement, when introduced in a future phase, must not cause untracked partial state. The current manual execution model records execution only after authorized settlement confirmation.

## 11. Prisma Modeling Guidance

The exact Prisma schema should follow repository-wide naming conventions, but the following implementation constraints are mandatory:

1. use explicit `@map` and `@@map` mappings when database snake_case naming is adopted;
2. use `Decimal` for every money field and never `Float`;
3. define explicit named relations for multiple User foreign keys on Invoice, Refund, Receipt, and audit columns;
4. avoid implicit many-to-many relations; model PaymentAllocation explicitly;
5. add SQL migration statements for partial unique indexes and exclusion constraints not expressible in the installed Prisma version;
6. use `relationMode` and FK behavior consistent with the existing database package; physical FKs are preferred for this single-database modular monolith unless the repository architecture explicitly standardizes otherwise;
7. do not expose Prisma models directly to UI/server actions. Repository and application-service boundaries must apply permission, branch, state, and audit logic;
8. all standard repository read methods must include `isDeleted = false` unless an audit/administrative history method explicitly requests deleted rows;
9. use transaction isolation or explicit locking/version predicates sufficient to prevent overpayment and duplicate number allocation under concurrency;
10. preserve `version` checks in update predicates, for example update where `(id, version)` matches and increment version in the same statement.

## 12. Data Integrity Checklist

| ID | Integrity Control | Enforcement Layer |
|---|---|---|
| DB-FBR-001 | No hard delete of posted financial history. | Application service + DB permissions/policy. |
| DB-FBR-002 | Invoice amount identity always reconciles. | Domain calculation + CHECK constraints where practical. |
| DB-FBR-003 | One authoritative Receipt per Payment. | UNIQUE paymentId + transaction service. |
| DB-FBR-004 | Payment amount cannot over-settle ordinary invoice balance. | Transactional lock/version check + domain validation. |
| DB-FBR-005 | Sum PaymentAllocation equals Posted Payment amount. | Posting service transaction + reconciliation assertion. |
| DB-FBR-006 | Installment allocations cannot exceed installment remaining balance. | Posting service lock/version validation. |
| DB-FBR-007 | Receivable outstanding equals Invoice outstanding. | Atomic service update + reconciliation monitoring. |
| DB-FBR-008 | Refund cumulative Executed amount cannot exceed source Payment amount. | Refund execution transaction validation. |
| DB-FBR-009 | Corporate credit rule effective periods do not overlap. | Exclusion constraint or serialized transaction validation. |
| DB-FBR-010 | Branch authorization is applied before data read/mutation. | Server application/repository boundary. |
| DB-FBR-011 | Consolidated reporting does not imply operational mutation rights. | Separate permission checks and query services. |
| DB-FBR-012 | Soft-delete marker and timestamp remain consistent. | CHECK: `(isDeleted=false AND deletedAt IS NULL) OR (isDeleted=true AND deletedAt IS NOT NULL)`. |
| DB-FBR-013 | All financial mutation audit actors are non-null. | NOT NULL audit FKs + approved service user. |
| DB-FBR-014 | Mutable aggregate updates detect stale versions. | Optimistic version predicate. |
| DB-FBR-015 | Oman GST date boundary is used for overdue and aging. | Central domain clock/service. |

## 13. Traceability to Module 12 Functional Requirements

| Entity | Primary Functional Requirements |
|---|---|
| Invoice | FR-FBR-001, FR-FBR-002, FR-FBR-003, FR-FBR-004, FR-FBR-005, FR-FBR-011, FR-FBR-020, FR-FBR-026, FR-FBR-027, FR-FBR-029, FR-FBR-030 |
| InvoiceLineItem | FR-FBR-001, FR-FBR-002, FR-FBR-003, FR-FBR-027 |
| InstallmentPlan | FR-FBR-006, FR-FBR-007, FR-FBR-011, FR-FBR-029 |
| Installment | FR-FBR-006, FR-FBR-007, FR-FBR-008, FR-FBR-011, FR-FBR-028 |
| Payment | FR-FBR-008, FR-FBR-009, FR-FBR-010, FR-FBR-011, FR-FBR-020, FR-FBR-025, FR-FBR-026, FR-FBR-029 |
| PaymentAllocation | FR-FBR-007, FR-FBR-008, FR-FBR-009, FR-FBR-011, FR-FBR-025 |
| Receipt | FR-FBR-010, FR-FBR-025, FR-FBR-027 |
| Refund | FR-FBR-014, FR-FBR-015, FR-FBR-016, FR-FBR-021, FR-FBR-025, FR-FBR-026, FR-FBR-029 |
| Receivable | FR-FBR-012, FR-FBR-013, FR-FBR-019, FR-FBR-020, FR-FBR-021, FR-FBR-022, FR-FBR-023, FR-FBR-028 |
| CorporateCreditRule | FR-FBR-017, FR-FBR-018, FR-FBR-019, FR-FBR-025, FR-FBR-029 |

## 14. Acceptance Criteria for Database Design Review

The Module 12 database design is acceptable only when all of the following are true:

1. every owned entity in Section 2 is represented in Prisma and migrations;
2. money fields use fixed-precision Decimal semantics;
3. all owned tables contain the required audit and soft-delete columns;
4. CorporateCreditRule contains effective dating and status;
5. PaymentAllocation is explicit and not implemented as an implicit N:M relation;
6. one authoritative Receipt per Payment is guaranteed by a unique constraint;
7. invoice, payment, receipt, and refund numbering uniqueness matches NumberingSeries scope;
8. posted financial records cannot be hard deleted through application roles;
9. all cross-context FKs use restrictive delete behavior;
10. Invoice, Payment, Refund, InstallmentPlan, Receivable, and CorporateCreditRule mutations are protected from lost updates;
11. payment posting is idempotent and transactionally updates all affected balances;
12. refund execution cannot exceed refundable payment balance;
13. receivable aging uses the documented GST date algorithm and compatibility bucket mapping;
14. effective CorporateCreditRule periods cannot overlap for the same applicable scope;
15. every repository query path proves server-side branch scoping before pagination, aggregation, or mutation;
16. consolidated reporting requires a separate permission and IAM entitlement;
17. audit records can reconstruct who changed a sensitive finance record, what changed, when, old value, new value, branch context, and reason where required; and
18. schema and service tests cover concurrency races for duplicate payment submission, simultaneous payment posting, invoice numbering, refund oversubscription, and corporate credit-rule activation.
