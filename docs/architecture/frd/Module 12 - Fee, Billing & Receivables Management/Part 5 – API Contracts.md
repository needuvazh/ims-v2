# Part 5 – API Contracts

## Module 12 – Fee, Billing & Receivables Management

## 1. Purpose and Contract Principles

This document defines the external REST API and internal Server Action contracts for Module 12. The module is implemented inside the ASTI IMS modular monolith and exposes application-service boundaries, not direct database CRUD. All mutation commands are authenticated, authorized, branch-scoped on the server, validated with Zod at the application boundary, protected by optimistic concurrency where mutable state can race, and audited when financially or operationally sensitive.

### 1.1 API Conventions

| Convention | Requirement |
|---|---|
| Base REST path | `/api/v1/finance` |
| Authentication | Authenticated ASTI session for private routes; no anonymous finance route is defined in this module. |
| Content type | `application/json; charset=utf-8` except export/download responses. |
| Business timezone | `Asia/Muscat` for business-date evaluation. |
| Currency precision | Monetary request values use strings matching `^\\d{1,15}(\\.\\d{1,3})?$`; server converts to Prisma `Decimal`. |
| Pagination | `page` is 1-based; `pageSize` allowed values are 25, 50, 100; maximum 100. |
| Sorting | Only endpoint-declared sort fields are accepted. |
| Branch scope | Client branch filters narrow an already-authorized set and never grant access. |
| Concurrency | Mutable command DTOs carry `expectedVersion` where the target aggregate can be concurrently changed. |
| Idempotency | Payment posting and externally retryable command endpoints require `Idempotency-Key` header, 8–128 printable ASCII characters. |
| Correlation | Every response carries `meta.correlationId`; clients may send `X-Correlation-ID`. |
| Error shape | All errors follow the common error DTO in section 4. |
| Soft delete | No endpoint exposes hard delete for posted finance transactions. |

## 2. Endpoint Inventory

### 2.1 REST Endpoints

| Route | Method | Purpose | Permission |
|---|---:|---|---|
| `/api/v1/finance/invoices` | GET | Search branch-scoped invoices. | `finance.invoice.read` |
| `/api/v1/finance/invoices` | POST | Create a draft invoice from eligible source data. | `finance.invoice.create` |
| `/api/v1/finance/invoices/{invoiceId}` | GET | Retrieve full invoice detail. | `finance.invoice.read` |
| `/api/v1/finance/invoices/{invoiceId}` | PATCH | Update editable draft invoice attributes. | `finance.invoice.create` |
| `/api/v1/finance/invoices/{invoiceId}/issue` | POST | Validate and issue a draft invoice. | `finance.invoice.issue` |
| `/api/v1/finance/invoices/{invoiceId}/cancel` | POST | Cancel an eligible unpaid invoice. | `finance.invoice.cancel` |
| `/api/v1/finance/invoices/{invoiceId}/payment-validation` | GET | Return authoritative payment-completion status for the invoice. | `finance.invoice.read` or trusted internal caller |
| `/api/v1/finance/enrollments/{enrollmentId}/payment-validation` | GET | Return payment validation for Completion and Certificate contexts. | trusted internal caller or `finance.payment.read` |
| `/api/v1/finance/invoices/{invoiceId}/installment-plan` | POST | Create an installment plan and schedule. | `finance.installment.create` |
| `/api/v1/finance/installment-plans/{planId}` | GET | Retrieve plan and installment schedule. | `finance.installment.read` |
| `/api/v1/finance/installments` | GET | Search installments by due state and branch. | `finance.installment.read` |
| `/api/v1/finance/payments` | GET | Search payments. | `finance.payment.read` |
| `/api/v1/finance/payments` | POST | Record and post a manual payment atomically. | `finance.payment.record` |
| `/api/v1/finance/payments/{paymentId}` | GET | Retrieve payment and allocation detail. | `finance.payment.read` |
| `/api/v1/finance/receipts/{receiptId}` | GET | Retrieve receipt DTO. | `finance.receipt.read` |
| `/api/v1/finance/receipts/{receiptId}/document` | GET | Download/render bilingual receipt document. | `finance.receipt.read` |
| `/api/v1/finance/refunds` | GET | Search refunds. | `finance.refund.read` |
| `/api/v1/finance/refunds` | POST | Submit refund request and approval request. | `finance.refund.request` |
| `/api/v1/finance/refunds/{refundId}` | GET | Retrieve refund detail and status history. | `finance.refund.read` |
| `/api/v1/finance/refunds/{refundId}/decision` | POST | Approve or reject refund request. | `finance.refund.approve` |
| `/api/v1/finance/refunds/{refundId}/execute` | POST | Record authorized financial execution of approved refund. | `finance.refund.execute` |
| `/api/v1/finance/receivables` | GET | Search outstanding receivables and aging. | `finance.receivable.read` |
| `/api/v1/finance/receivables/summary` | GET | Return branch-scoped aging summary. | `finance.report.branch` |
| `/api/v1/finance/corporate-credit/rules` | GET | Search effective corporate credit rules. | `finance.credit.read` |
| `/api/v1/finance/corporate-credit/rules` | POST | Create a new effective-dated credit rule. | `finance.credit.manage` |
| `/api/v1/finance/corporate-credit/rules/{ruleId}/supersede` | POST | End-date current rule and create successor. | `finance.credit.manage` |
| `/api/v1/finance/corporate-credit/accounts/{corporateAccountId}/exposure` | GET | Return credit exposure and available credit. | `finance.credit.read` |
| `/api/v1/finance/corporate-credit/accounts/{corporateAccountId}/validate` | POST | Validate a proposed corporate enrollment amount. | trusted Corporate Training caller or `finance.credit.read` |
| `/api/v1/finance/reports/branch-summary` | GET | Return branch-level finance KPIs. | `finance.report.branch` |
| `/api/v1/finance/reports/consolidated-summary` | GET | Return authorized multi-branch finance KPIs. | `finance.report.consolidated` |
| `/api/v1/finance/exports` | POST | Generate an authorized finance export. | `finance.export` |
| `/api/v1/finance/audit` | GET | Search Finance audit events. | `finance.audit.read` |

### 2.2 Admin Portal Server Actions

These Server Actions are thin adapters over the same Finance application services and must not contain domain logic.

| Server Action | Purpose | Permission |
|---|---|---|
| `createInvoiceAction` | Create draft invoice. | `finance.invoice.create` |
| `updateDraftInvoiceAction` | Update editable draft invoice fields. | `finance.invoice.create` |
| `issueInvoiceAction` | Issue draft invoice. | `finance.invoice.issue` |
| `cancelInvoiceAction` | Cancel eligible invoice. | `finance.invoice.cancel` |
| `createInstallmentPlanAction` | Create installment plan. | `finance.installment.create` |
| `recordPaymentAction` | Post manual payment. | `finance.payment.record` |
| `requestRefundAction` | Submit refund request. | `finance.refund.request` |
| `decideRefundAction` | Approve or reject refund. | `finance.refund.approve` |
| `executeRefundAction` | Mark approved refund as financially executed. | `finance.refund.execute` |
| `createCreditRuleAction` | Create effective-dated credit rule. | `finance.credit.manage` |
| `supersedeCreditRuleAction` | End-date and replace rule. | `finance.credit.manage` |
| `createFinanceExportAction` | Request export and return secured download reference. | `finance.export` |

## 3. Shared Zod Structures

```ts
const IdSchema = z.string().uuid();
const MoneySchema = z.string().regex(/^\\d{1,15}(\\.\\d{1,3})?$/);
const CurrencySchema = z.string().regex(/^[A-Z]{3}$/).default("OMR");
const BusinessDateSchema = z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/);
const DateTimeSchema = z.string().datetime({ offset: true });
const ExpectedVersionSchema = z.number().int().min(0);
const PageSchema = z.coerce.number().int().min(1).default(1);
const PageSizeSchema = z.coerce.number().int().refine(v => [25, 50, 100].includes(v)).default(25);
const BranchIdSchema = IdSchema;
const LocaleSchema = z.enum(["en", "ar"]);
const InvoiceTypeSchema = z.enum([
  "StudentInvoice",
  "CorporateInvoice",
  "AdvanceInvoice",
  "MilestoneInvoice",
  "FinalInvoice",
  "RefundInvoice"
]);
const PaymentMethodSchema = z.enum([
  "Cash",
  "BankTransfer",
  "Card",
  "Online",
  "Cheque",
  "CorporateBilling"
]);
```

## 4. Common Response and Error DTOs

### 4.1 Success Envelope

```json
{
  "data": {},
  "meta": {
    "correlationId": "8f7f6d36-a39e-4df7-a80d-f5da7fbc85a4",
    "timestamp": "2026-07-04T10:30:00+04:00"
  }
}
```

### 4.2 Paged Success Envelope

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 248,
    "totalPages": 10
  },
  "meta": {
    "correlationId": "8f7f6d36-a39e-4df7-a80d-f5da7fbc85a4",
    "timestamp": "2026-07-04T10:30:00+04:00"
  }
}
```

### 4.3 Error Envelope

```json
{
  "error": {
    "code": "ERR_FIN_PAYMENT_EXCEEDS_OUTSTANDING",
    "message": "Payment amount exceeds the outstanding invoice balance.",
    "fieldErrors": [
      {
        "path": "amount",
        "code": "too_large",
        "message": "Amount cannot exceed 125.000 OMR."
      }
    ],
    "details": {
      "invoiceId": "0b49afe4-c5e8-4a50-bfd1-c15cb0e633a6"
    }
  },
  "meta": {
    "correlationId": "8f7f6d36-a39e-4df7-a80d-f5da7fbc85a4",
    "timestamp": "2026-07-04T10:31:00+04:00"
  }
}
```

Authorization errors must not reveal whether an inaccessible resource exists. `details` must omit sensitive values for 401, 403, and cross-branch denials.

## 5. Invoice Contracts

### 5.1 GET `/api/v1/finance/invoices`

**Purpose:** Search invoices after applying server-side branch scope.

**Authentication and Permission:** Authenticated session; `finance.invoice.read`.

**Branch Scope:** `branchId` filters the caller's authorized branch set. `scope=consolidated` additionally requires `finance.report.consolidated` and consolidated IAM entitlement. Scope filtering occurs before count, sorting, and pagination.

**Query Zod structure:**

```ts
const SearchInvoicesQuery = z.object({
  page: PageSchema,
  pageSize: PageSizeSchema,
  branchId: BranchIdSchema.optional(),
  scope: z.enum(["branch", "consolidated"]).default("branch"),
  invoiceNumber: z.string().trim().max(50).optional(),
  invoiceType: InvoiceTypeSchema.optional(),
  status: z.enum(["Draft", "Issued", "PartiallyPaid", "Paid", "Overdue", "Cancelled", "Refunded", "PartiallyRefunded"]).optional(),
  studentProfileId: IdSchema.optional(),
  corporateAccountId: IdSchema.optional(),
  enrollmentId: IdSchema.optional(),
  invoiceDateFrom: BusinessDateSchema.optional(),
  invoiceDateTo: BusinessDateSchema.optional(),
  dueDateFrom: BusinessDateSchema.optional(),
  dueDateTo: BusinessDateSchema.optional(),
  outstandingOnly: z.coerce.boolean().optional(),
  sortBy: z.enum(["invoiceDate", "dueDate", "invoiceNumber", "totalAmount", "outstandingAmount", "status"]).default("invoiceDate"),
  sortDirection: z.enum(["asc", "desc"]).default("desc")
}).superRefine(validateDateRanges);
```

**Success DTO:**

```json
{
  "data": [
    {
      "id": "0b49afe4-c5e8-4a50-bfd1-c15cb0e633a6",
      "invoiceNumber": "MCT-INV-2026-000184",
      "invoiceType": "StudentInvoice",
      "branchId": "45c067cc-0da6-43db-bb03-7589092e732e",
      "studentProfileId": "682817d4-4410-458a-94fe-f4f2a81dbecc",
      "corporateAccountId": null,
      "enrollmentId": "19844e31-977a-441f-a2f4-5a24904e2298",
      "invoiceDate": "2026-07-04",
      "dueDate": "2026-07-18",
      "currency": "OMR",
      "totalAmount": "525.000",
      "paidAmount": "400.000",
      "outstandingAmount": "125.000",
      "status": "PartiallyPaid",
      "version": 4
    }
  ],
  "pagination": { "page": 1, "pageSize": 25, "totalItems": 1, "totalPages": 1 },
  "meta": { "correlationId": "8f7f6d36-a39e-4df7-a80d-f5da7fbc85a4", "timestamp": "2026-07-04T10:30:00+04:00" }
}
```

**Errors:** `400 ERR_COMMON_VALIDATION`, `401 ERR_AUTH_REQUIRED`, `403 ERR_AUTH_FORBIDDEN`, `403 ERR_FIN_BRANCH_SCOPE_DENIED`, `422 ERR_FIN_INVALID_DATE_RANGE`.

### 5.2 POST `/api/v1/finance/invoices`

**Purpose:** Create a draft invoice from Enrollment, Corporate billing source, approved quotation/sales order traceability, or an authorized advance request.

**Authentication and Permission:** `finance.invoice.create`.

**Branch Scope:** The server resolves authoritative branch from Enrollment/Corporate source and verifies mutation access. `branchId` is accepted only as an asserted target to be matched against the authoritative source branch; mismatch is rejected.

**Request Zod structure:**

```ts
const CreateInvoiceBody = z.object({
  invoiceType: InvoiceTypeSchema,
  branchId: BranchIdSchema,
  studentProfileId: IdSchema.optional(),
  corporateAccountId: IdSchema.optional(),
  enrollmentId: IdSchema.optional(),
  quotationId: IdSchema.optional(),
  salesOrderId: IdSchema.optional(),
  invoiceDate: BusinessDateSchema,
  dueDate: BusinessDateSchema,
  currency: CurrencySchema,
  billingReference: z.string().trim().min(1).max(100).optional(),
  remarks: z.string().trim().max(1000).optional(),
  lines: z.array(z.object({
    enrollmentId: IdSchema.optional(),
    courseId: IdSchema,
    description: z.string().trim().min(1).max(500),
    quantity: MoneySchema.refine(v => Number(v) > 0),
    unitPrice: MoneySchema,
    discountAmount: MoneySchema.default("0.000"),
    taxRatePercent: MoneySchema.default("0.000"),
    taxAmount: MoneySchema,
    lineTotal: MoneySchema,
    sourceBranchId: BranchIdSchema
  })).min(1).max(500)
}).superRefine(validateInvoicePartyAndSourceRules);
```

**Processing contract:** Finance reloads authoritative source data, snapshots resolved pricing and discount, recalculates every line and header total, validates due date, validates source-party exclusivity, allocates invoice number only on issue, and writes audit data.

**Success DTO:**

```json
{
  "data": {
    "id": "0b49afe4-c5e8-4a50-bfd1-c15cb0e633a6",
    "invoiceNumber": null,
    "status": "Draft",
    "currency": "OMR",
    "subtotal": "500.000",
    "discountAmount": "0.000",
    "taxAmount": "25.000",
    "totalAmount": "525.000",
    "paidAmount": "0.000",
    "outstandingAmount": "525.000",
    "version": 0
  },
  "meta": { "correlationId": "8f7f6d36-a39e-4df7-a80d-f5da7fbc85a4", "timestamp": "2026-07-04T10:30:00+04:00" }
}
```

**Errors:** `400 ERR_COMMON_VALIDATION`, `403 ERR_FIN_BRANCH_SCOPE_DENIED`, `404 ERR_FIN_SOURCE_NOT_FOUND`, `409 ERR_FIN_DUPLICATE_BILLING_SOURCE`, `422 ERR_FIN_ENROLLMENT_NOT_BILLABLE`, `422 ERR_FIN_PRICE_SNAPSHOT_MISMATCH`, `422 ERR_FIN_INVOICE_TOTAL_MISMATCH`, `422 ERR_FIN_INVALID_DUE_DATE`, `422 ERR_FIN_CURRENCY_MISMATCH`.

### 5.3 GET `/api/v1/finance/invoices/{invoiceId}`

**Authentication and Permission:** `finance.invoice.read`.

**Branch Scope:** Parent invoice branch must be visible. Consolidated invoice detail additionally checks each line source branch before exposing line-level data.

**Path schema:** `z.object({ invoiceId: IdSchema })`.

**Success DTO:**

```json
{
  "data": {
    "id": "0b49afe4-c5e8-4a50-bfd1-c15cb0e633a6",
    "invoiceNumber": "MCT-INV-2026-000184",
    "invoiceType": "StudentInvoice",
    "branchId": "45c067cc-0da6-43db-bb03-7589092e732e",
    "invoiceDate": "2026-07-04",
    "dueDate": "2026-07-18",
    "currency": "OMR",
    "subtotal": "500.000",
    "discountAmount": "0.000",
    "taxAmount": "25.000",
    "totalAmount": "525.000",
    "paidAmount": "400.000",
    "outstandingAmount": "125.000",
    "status": "PartiallyPaid",
    "version": 4,
    "lines": [
      {
        "id": "16a4afdc-b887-4d91-a59e-7a82458bde25",
        "courseId": "c99858c9-5a54-45cb-ae8a-6aaac4e8b04e",
        "description": "Health and Safety Training",
        "quantity": "1.000",
        "unitPrice": "500.000",
        "discountAmount": "0.000",
        "taxRatePercent": "5.000",
        "taxAmount": "25.000",
        "lineTotal": "525.000"
      }
    ]
  },
  "meta": { "correlationId": "8f7f6d36-a39e-4df7-a80d-f5da7fbc85a4", "timestamp": "2026-07-04T10:30:00+04:00" }
}
```

**Errors:** `401 ERR_AUTH_REQUIRED`, `403 ERR_AUTH_FORBIDDEN`, `404 ERR_FIN_INVOICE_NOT_FOUND`.

### 5.4 PATCH `/api/v1/finance/invoices/{invoiceId}`

**Permission:** `finance.invoice.create`.

**Branch Scope:** Existing invoice branch must be in mutation scope. Only Draft invoice is editable.

**Body:**

```ts
const UpdateDraftInvoiceBody = z.object({
  dueDate: BusinessDateSchema.optional(),
  billingReference: z.string().trim().min(1).max(100).nullable().optional(),
  remarks: z.string().trim().max(1000).nullable().optional(),
  lines: z.array(InvoiceLineInputSchema).min(1).max(500).optional(),
  expectedVersion: ExpectedVersionSchema
}).refine(v => Object.keys(v).some(k => k !== "expectedVersion"), "At least one editable field is required");
```

**Success DTO:** invoice detail DTO with incremented `version`.

**Errors:** `404 ERR_FIN_INVOICE_NOT_FOUND`, `409 ERR_FIN_CONCURRENCY_CONFLICT`, `409 ERR_FIN_INVOICE_NOT_EDITABLE`, `422 ERR_FIN_INVOICE_TOTAL_MISMATCH`, `422 ERR_FIN_INVALID_DUE_DATE`.

### 5.5 POST `/api/v1/finance/invoices/{invoiceId}/issue`

**Permission:** `finance.invoice.issue`.

**Branch Scope:** Invoice branch must be in mutation scope.

**Body:**

```ts
const IssueInvoiceBody = z.object({
  expectedVersion: ExpectedVersionSchema,
  issueDate: BusinessDateSchema,
  reason: z.string().trim().max(500).optional()
});
```

**Success DTO:**

```json
{
  "data": {
    "id": "0b49afe4-c5e8-4a50-bfd1-c15cb0e633a6",
    "invoiceNumber": "MCT-INV-2026-000184",
    "status": "Issued",
    "issuedAt": "2026-07-04T10:45:00+04:00",
    "version": 1
  },
  "meta": { "correlationId": "8f7f6d36-a39e-4df7-a80d-f5da7fbc85a4", "timestamp": "2026-07-04T10:45:00+04:00" }
}
```

**Errors:** `409 ERR_FIN_CONCURRENCY_CONFLICT`, `409 ERR_FIN_INVALID_INVOICE_TRANSITION`, `422 ERR_FIN_INVOICE_NOT_BALANCED`, `422 ERR_FIN_NUMBERING_SERIES_UNAVAILABLE`, `422 ERR_FIN_SOURCE_INVALIDATED`.

### 5.6 POST `/api/v1/finance/invoices/{invoiceId}/cancel`

**Permission:** `finance.invoice.cancel`.

**Body:**

```ts
const CancelInvoiceBody = z.object({
  expectedVersion: ExpectedVersionSchema,
  reason: z.string().trim().min(10).max(500)
});
```

**Success DTO:** `{ "data": { "id": "uuid", "status": "Cancelled", "version": 3 } }`.

**Errors:** `409 ERR_FIN_INVOICE_HAS_PAYMENT`, `409 ERR_FIN_INVALID_INVOICE_TRANSITION`, `409 ERR_FIN_CONCURRENCY_CONFLICT`, `422 ERR_FIN_CANCELLATION_REASON_REQUIRED`.

## 6. Installment Contracts

### 6.1 POST `/api/v1/finance/invoices/{invoiceId}/installment-plan`

**Permission:** `finance.installment.create`.

**Branch Scope:** Derived from parent invoice. Caller cannot assign another branch.

**Body:**

```ts
const CreateInstallmentPlanBody = z.object({
  planName: z.string().trim().min(3).max(100),
  expectedInvoiceVersion: ExpectedVersionSchema,
  schedule: z.array(z.object({
    sequenceNumber: z.number().int().min(1).max(120),
    dueDate: BusinessDateSchema,
    amount: MoneySchema.refine(v => Number(v) > 0)
  })).min(2).max(120)
}).superRefine(validateInstallmentSchedule);
```

**Success DTO:**

```json
{
  "data": {
    "id": "9f45f025-0f3c-4ec0-8900-c4b13861ba92",
    "invoiceId": "0b49afe4-c5e8-4a50-bfd1-c15cb0e633a6",
    "planName": "Three Monthly Payments",
    "totalAmount": "525.000",
    "numberOfInstallments": 3,
    "status": "Active",
    "installments": [
      { "sequenceNumber": 1, "dueDate": "2026-07-15", "amount": "175.000", "paidAmount": "0.000", "status": "Pending" }
    ]
  }
}
```

**Errors:** `409 ERR_FIN_INSTALLMENT_PLAN_EXISTS`, `422 ERR_FIN_INSTALLMENT_SUM_MISMATCH`, `422 ERR_FIN_INSTALLMENT_SEQUENCE_INVALID`, `422 ERR_FIN_INSTALLMENT_DATE_ORDER_INVALID`, `422 ERR_FIN_INVOICE_NOT_INSTALLMENT_ELIGIBLE`.

### 6.2 GET `/api/v1/finance/installments`

**Permission:** `finance.installment.read`.

**Query:** branch-filtered paged query with `status`, `dueFrom`, `dueTo`, `invoiceId`, `studentProfileId`, `corporateAccountId`, `sortBy` in `dueDate|amount|paidAmount|status`.

**Success DTO:** paged installment summaries.

**Errors:** common auth, validation, and branch-scope errors.

## 7. Payment and Receipt Contracts

### 7.1 POST `/api/v1/finance/payments`

**Purpose:** Atomically record payment, allocate payment, update invoice/installments/receivable, generate receipt, audit the transaction, and publish internal events.

**Authentication and Permission:** `finance.payment.record`.

**Headers:** `Idempotency-Key` required.

**Branch Scope:** Finance reloads invoice and collection branch. Caller must have payment-record permission in the collection branch and satisfy the configured invoice/collection branch policy.

**Body:**

```ts
const RecordPaymentBody = z.object({
  invoiceId: IdSchema,
  branchId: BranchIdSchema,
  paymentDate: BusinessDateSchema,
  paymentMethod: PaymentMethodSchema,
  amount: MoneySchema.refine(v => Number(v) > 0),
  referenceNumber: z.string().trim().min(3).max(100).optional(),
  chequeNumber: z.string().trim().min(3).max(50).optional(),
  chequeDate: BusinessDateSchema.optional(),
  bankName: z.string().trim().min(2).max(120).optional(),
  cardLast4: z.string().regex(/^\\d{4}$/).optional(),
  remarks: z.string().trim().max(1000).optional(),
  expectedInvoiceVersion: ExpectedVersionSchema,
  allocations: z.array(z.object({
    installmentId: IdSchema.optional(),
    amount: MoneySchema.refine(v => Number(v) > 0),
    allocationSequence: z.number().int().min(1)
  })).min(1).max(120)
}).superRefine(validatePaymentMethodAndAllocations);
```

**Success DTO:**

```json
{
  "data": {
    "payment": {
      "id": "7c8086e1-e239-43cb-b3bd-49361b5d02cf",
      "paymentNumber": "MCT-PAY-2026-000942",
      "invoiceId": "0b49afe4-c5e8-4a50-bfd1-c15cb0e633a6",
      "paymentDate": "2026-07-04",
      "paymentMethod": "BankTransfer",
      "amount": "125.000",
      "referenceNumber": "TRX-884291",
      "status": "Posted"
    },
    "receipt": {
      "id": "3f7f2268-4ce0-4b6f-a243-c622f68b585b",
      "receiptNumber": "MCT-RCP-2026-001175",
      "receiptDate": "2026-07-04",
      "amount": "125.000"
    },
    "invoice": {
      "id": "0b49afe4-c5e8-4a50-bfd1-c15cb0e633a6",
      "paidAmount": "525.000",
      "outstandingAmount": "0.000",
      "status": "Paid",
      "version": 5
    }
  }
}
```

**Errors:** `400 ERR_COMMON_VALIDATION`, `409 ERR_FIN_IDEMPOTENCY_CONFLICT`, `409 ERR_FIN_CONCURRENCY_CONFLICT`, `409 ERR_FIN_INVOICE_NOT_PAYABLE`, `422 ERR_FIN_PAYMENT_EXCEEDS_OUTSTANDING`, `422 ERR_FIN_PAYMENT_ALLOCATION_MISMATCH`, `422 ERR_FIN_INSTALLMENT_OVERALLOCATION`, `422 ERR_FIN_PAYMENT_REFERENCE_REQUIRED`, `422 ERR_FIN_PAYMENT_DATE_INVALID`, `422 ERR_FIN_CURRENCY_MISMATCH`, `422 ERR_FIN_NUMBERING_SERIES_UNAVAILABLE`.

### 7.2 GET `/api/v1/finance/payments`

**Permission:** `finance.payment.read`.

**Query structure:** page, pageSize, branchId, invoiceId, paymentNumber, paymentMethod, status, paymentDateFrom, paymentDateTo, minAmount, maxAmount, referenceNumber, sortBy `paymentDate|paymentNumber|amount|status`, sortDirection.

**Success:** paged payment summaries.

### 7.3 GET `/api/v1/finance/receipts/{receiptId}`

**Permission:** `finance.receipt.read`.

**Success DTO:** receipt metadata, payer display name, invoice number, payment number, amount in numeric and words fields, issue branch, institute legal details, tax registration number when applicable, locale availability.

**Errors:** `404 ERR_FIN_RECEIPT_NOT_FOUND`, authorization errors.

### 7.4 GET `/api/v1/finance/receipts/{receiptId}/document`

**Permission:** `finance.receipt.read`.

**Query:** `locale=en|ar` and `format=pdf`.

**Success:** `application/pdf` binary with `Content-Disposition: attachment; filename="receipt-{receiptNumber}-{locale}.pdf"`.

**Errors:** `404 ERR_FIN_RECEIPT_NOT_FOUND`, `422 ERR_FIN_DOCUMENT_RENDER_FAILED`.

## 8. Refund Contracts

### 8.1 POST `/api/v1/finance/refunds`

**Permission:** `finance.refund.request`.

**Branch Scope:** Derived from source payment and invoice; both must be within allowed request scope.

**Body:**

```ts
const CreateRefundRequestBody = z.object({
  invoiceId: IdSchema,
  paymentId: IdSchema,
  refundType: z.enum(["Full", "Partial"]),
  amount: MoneySchema.refine(v => Number(v) > 0),
  reasonCode: z.enum(["CourseCancelled", "EnrollmentCancelled", "DuplicatePayment", "Overpayment", "ServiceNotDelivered", "ApprovedException"]),
  reason: z.string().trim().min(10).max(1000),
  expectedPaymentVersion: ExpectedVersionSchema
});
```

**Success DTO:** refund in `Requested` state plus approval request reference.

**Errors:** `404 ERR_FIN_PAYMENT_NOT_FOUND`, `422 ERR_FIN_REFUND_EXCEEDS_REFUNDABLE`, `422 ERR_FIN_REFUND_TYPE_AMOUNT_MISMATCH`, `409 ERR_FIN_DUPLICATE_REFUND_REQUEST`, `409 ERR_FIN_PAYMENT_NOT_REFUNDABLE`.

### 8.2 POST `/api/v1/finance/refunds/{refundId}/decision`

**Permission:** `finance.refund.approve`.

**Body:**

```ts
const RefundDecisionBody = z.object({
  decision: z.enum(["Approve", "Reject"]),
  remarks: z.string().trim().min(5).max(1000),
  expectedVersion: ExpectedVersionSchema
});
```

**Additional rule:** Maker-checker control rejects the same user who requested the refund from approving it.

**Success:** refund status `Approved` or `Rejected`, approver identity reference, decision timestamp, version.

**Errors:** `409 ERR_FIN_REFUND_INVALID_STATE`, `409 ERR_FIN_REFUND_SELF_APPROVAL`, `409 ERR_FIN_CONCURRENCY_CONFLICT`.

### 8.3 POST `/api/v1/finance/refunds/{refundId}/execute`

**Permission:** `finance.refund.execute`.

**Body:**

```ts
const ExecuteRefundBody = z.object({
  executionDate: BusinessDateSchema,
  executionMethod: z.enum(["Cash", "BankTransfer", "CardReversal", "Cheque"]),
  externalReference: z.string().trim().min(3).max(100),
  remarks: z.string().trim().max(1000).optional(),
  expectedVersion: ExpectedVersionSchema
});
```

**Success:** executed refund DTO and updated invoice/receivable summary.

**Errors:** `409 ERR_FIN_REFUND_NOT_APPROVED`, `409 ERR_FIN_REFUND_ALREADY_EXECUTED`, `422 ERR_FIN_REFUND_REFERENCE_REQUIRED`, `409 ERR_FIN_CONCURRENCY_CONFLICT`.

## 9. Receivable Contracts

### 9.1 GET `/api/v1/finance/receivables`

**Permission:** `finance.receivable.read`.

**Query:**

```ts
const SearchReceivablesQuery = z.object({
  page: PageSchema,
  pageSize: PageSizeSchema,
  branchId: BranchIdSchema.optional(),
  customerType: z.enum(["Student", "Corporate"]).optional(),
  studentProfileId: IdSchema.optional(),
  corporateAccountId: IdSchema.optional(),
  agingBucket: z.enum(["Current", "30 Days", "60 Days", "90 Days", "120+ Days"]).optional(),
  dueFrom: BusinessDateSchema.optional(),
  dueTo: BusinessDateSchema.optional(),
  minOutstanding: MoneySchema.optional(),
  maxOutstanding: MoneySchema.optional(),
  status: z.enum(["Open", "PartiallyPaid", "Overdue", "Settled"]).optional(),
  sortBy: z.enum(["dueDate", "outstandingAmount", "daysPastDue", "agingBucket"]).default("daysPastDue"),
  sortDirection: z.enum(["asc", "desc"]).default("desc")
}).superRefine(validateRangePairs);
```

**Success:** paged receivable DTOs with invoice reference, customer display reference, due date, outstanding amount, days past due, aging bucket, status.

**Errors:** common auth, validation, branch-scope errors.

### 9.2 GET `/api/v1/finance/receivables/summary`

**Permission:** `finance.report.branch`.

**Success DTO:**

```json
{
  "data": {
    "currency": "OMR",
    "asOfDate": "2026-07-04",
    "totalOutstanding": "48520.000",
    "buckets": [
      { "agingBucket": "Current", "invoiceCount": 42, "outstandingAmount": "25000.000" },
      { "agingBucket": "30 Days", "invoiceCount": 18, "outstandingAmount": "9500.000" },
      { "agingBucket": "60 Days", "invoiceCount": 9, "outstandingAmount": "6100.000" },
      { "agingBucket": "90 Days", "invoiceCount": 6, "outstandingAmount": "4200.000" },
      { "agingBucket": "120+ Days", "invoiceCount": 5, "outstandingAmount": "3720.000" }
    ]
  }
}
```

## 10. Corporate Credit Contracts

### 10.1 POST `/api/v1/finance/corporate-credit/rules`

**Permission:** `finance.credit.manage`.

**Branch Scope:** Rule branch must be within authorized mutation scope. Corporate account must be visible under corporate and branch policy.

**Body:**

```ts
const CreateCorporateCreditRuleBody = z.object({
  corporateAccountId: IdSchema,
  branchId: BranchIdSchema,
  creditLimit: MoneySchema,
  blockOnCreditLimit: z.boolean(),
  effectiveStartDate: BusinessDateSchema,
  effectiveEndDate: BusinessDateSchema.nullable().optional(),
  status: z.enum(["Draft", "Active", "Inactive"]).default("Active"),
  reason: z.string().trim().min(10).max(1000)
}).superRefine(validateCreditRuleDates);
```

**Success:** created rule with calculated available credit snapshot.

**Errors:** `409 ERR_FIN_CREDIT_RULE_OVERLAP`, `422 ERR_FIN_CREDIT_LIMIT_INVALID`, `422 ERR_FIN_EFFECTIVE_DATE_INVALID`, `404 ERR_FIN_CORPORATE_ACCOUNT_NOT_FOUND`.

### 10.2 POST `/api/v1/finance/corporate-credit/rules/{ruleId}/supersede`

**Permission:** `finance.credit.manage`.

**Body:** successor values, `effectiveStartDate`, `expectedVersion`, reason. The successor start date must be later than current rule start date and current rule is end-dated at successor start minus one business date unit according to stored date semantics.

**Errors:** overlap, invalid dates, concurrency, inactive source rule.

### 10.3 GET `/api/v1/finance/corporate-credit/accounts/{corporateAccountId}/exposure`

**Permission:** `finance.credit.read`.

**Success DTO:**

```json
{
  "data": {
    "corporateAccountId": "ac818046-17b8-4dd8-84f2-3d769fb93691",
    "currency": "OMR",
    "creditLimit": "10000.000",
    "currentOutstanding": "6500.000",
    "committedAmount": "1500.000",
    "availableCredit": "2000.000",
    "blockOnCreditLimit": true,
    "effectiveRuleId": "4162c8ff-008f-4f0b-8c32-11965f68e490",
    "lastCalculatedAt": "2026-07-04T11:15:00+04:00"
  }
}
```

### 10.4 POST `/api/v1/finance/corporate-credit/accounts/{corporateAccountId}/validate`

**Caller:** Corporate Training application service or authorized finance user.

**Body:**

```ts
const ValidateCorporateCreditBody = z.object({
  proposedEnrollmentValue: MoneySchema.refine(v => Number(v) >= 0),
  validationDate: BusinessDateSchema,
  branchId: BranchIdSchema,
  sourceReferenceId: IdSchema
});
```

**Success DTO:**

```json
{
  "data": {
    "decision": "Block",
    "creditLimit": "10000.000",
    "currentOutstanding": "6500.000",
    "committedAmount": "1500.000",
    "proposedAmount": "2500.000",
    "projectedExposure": "10500.000",
    "availableCreditBeforeProposal": "2000.000",
    "availableCreditAfterProposal": "-500.000",
    "blockOnCreditLimit": true,
    "reasonCode": "CREDIT_LIMIT_EXCEEDED"
  }
}
```

**Errors:** `404 ERR_FIN_CREDIT_RULE_NOT_FOUND`, `422 ERR_FIN_CREDIT_CURRENCY_MISMATCH`, `422 ERR_FIN_CREDIT_EXPOSURE_CALCULATION_FAILED`.

## 11. Report, Export, and Audit Contracts

### 11.1 GET `/api/v1/finance/reports/branch-summary`

**Permission:** `finance.report.branch`.

**Query:** branchId optional within scope, periodStart, periodEnd, currency default OMR.

**Response fields:** invoiceCount, invoicedAmount, paymentCount, collectedAmount, collectionEfficiencyPercent, outstandingAmount, overdueAmount, refundRequestedAmount, refundExecutedAmount, receivable aging totals.

### 11.2 GET `/api/v1/finance/reports/consolidated-summary`

**Permission:** `finance.report.consolidated` plus eligible IAM consolidated entitlement.

**Query:** branchIds max 100, periodStart, periodEnd, currency.

**Branch scope:** Requested branches are intersected with authorized hierarchy set. If any explicitly requested branch is unauthorized, reject the entire request rather than silently returning a partial subset.

**Errors:** `403 ERR_FIN_CONSOLIDATED_SCOPE_DENIED`, `422 ERR_FIN_REPORT_PERIOD_INVALID`.

### 11.3 POST `/api/v1/finance/exports`

**Permission:** `finance.export` and corresponding read permission for the dataset.

**Body:**

```ts
const CreateFinanceExportBody = z.object({
  dataset: z.enum(["Invoices", "Payments", "Receivables", "Refunds", "CorporateCreditExposure"]),
  format: z.enum(["csv", "xlsx"]),
  locale: LocaleSchema,
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
  reason: z.string().trim().min(5).max(500)
});
```

**Success DTO:** secured, short-lived download reference and exact exported row count. Export audit stores actor, filters, branches, dataset, format, row count, request time, completion time, and correlation ID.

**Errors:** `403 ERR_FIN_EXPORT_NOT_ALLOWED`, `422 ERR_FIN_EXPORT_FILTER_INVALID`, `422 ERR_FIN_EXPORT_ROW_LIMIT_EXCEEDED`, `500 ERR_FIN_EXPORT_GENERATION_FAILED`.

### 11.4 GET `/api/v1/finance/audit`

**Permission:** `finance.audit.read`.

**Query:** entityType, entityId, action, performedBy, performedFrom, performedTo, branchId, page, pageSize. Results are read-only and branch-scoped unless separately entitled.

## 12. Internal Application Contracts

Internal contexts must call typed Finance application ports and must not import Finance repositories.

### 12.1 Enrollment Billing Request

```ts
interface CreateEnrollmentInvoiceCommand {
  enrollmentId: string;
  requestedByUserId: string;
  expectedEnrollmentVersion: number;
}

interface EnrollmentBillingResult {
  invoiceId: string;
  invoiceStatus: "Draft" | "Issued";
  totalAmount: string;
  currency: "OMR";
}
```

### 12.2 Payment Validation Port

```ts
interface EnrollmentPaymentValidationQuery {
  enrollmentId: string;
  validationDate: string;
}

interface EnrollmentPaymentValidationResult {
  enrollmentId: string;
  paymentValidationRequired: boolean;
  validationPassed: boolean;
  invoicedAmount: string;
  netPaidAmount: string;
  outstandingAmount: string;
  blockingInvoiceIds: string[];
  evaluatedAt: string;
}
```

### 12.3 Corporate Credit Validation Port

```ts
interface CorporateCreditValidationQuery {
  corporateAccountId: string;
  branchId: string;
  proposedEnrollmentValue: string;
  validationDate: string;
  sourceReferenceId: string;
}

interface CorporateCreditValidationResult {
  decision: "Allow" | "AllowWithWarning" | "Block";
  projectedExposure: string;
  availableCreditAfterProposal: string;
  reasonCode: "WITHIN_LIMIT" | "LIMIT_EXCEEDED_WARNING" | "CREDIT_LIMIT_EXCEEDED" | "NO_BLOCKING_RULE";
}
```

## 13. HTTP Status and Application Error Mapping

| HTTP | Application Error Families | Meaning |
|---:|---|---|
| 400 | `ERR_COMMON_VALIDATION`, malformed JSON, unsupported sort/filter | Request syntax or schema validation failed. |
| 401 | `ERR_AUTH_REQUIRED`, `ERR_AUTH_SESSION_EXPIRED` | Authentication absent or invalid. |
| 403 | `ERR_AUTH_FORBIDDEN`, `ERR_FIN_BRANCH_SCOPE_DENIED`, `ERR_FIN_CONSOLIDATED_SCOPE_DENIED`, `ERR_FIN_EXPORT_NOT_ALLOWED` | Authenticated caller lacks permission or branch entitlement. |
| 404 | `ERR_FIN_*_NOT_FOUND` | Authorized lookup did not resolve an active visible resource. |
| 409 | state transition, duplicate, idempotency, concurrency, overlap conflicts | Command conflicts with current persisted state. |
| 422 | monetary, date, allocation, eligibility, effective dating, business invariant errors | Schema is valid but domain rule failed. |
| 429 | `ERR_COMMON_RATE_LIMITED` | Caller exceeded configured request rate. |
| 500 | `ERR_FIN_INTERNAL`, render/export failures without safe business recovery | Unexpected server failure; sensitive internals are not exposed. |
| 503 | `ERR_FIN_DEPENDENCY_UNAVAILABLE` | Required internal dependency is unavailable and operation cannot safely continue. |

## 14. Contract Acceptance Criteria

1. Every private endpoint authenticates before resolving business data.
2. Every endpoint maps to one explicit application-service command or query boundary.
3. No request-supplied branch identifier is treated as authorization evidence.
4. No internal context writes Finance tables directly.
5. All money is serialized as decimal strings with OMR-compatible three-decimal precision.
6. Payment posting is idempotent and transactional.
7. Receipt creation occurs exactly once for a successfully posted payment.
8. Refund request, decision, and execution are separate commands with separate permissions.
9. Corporate credit validation returns a deterministic decision and calculation breakdown.
10. Error responses expose stable application codes and non-sensitive messages.
11. Mutable commands use expected-version concurrency controls where specified.
12. Report aggregation and export filtering apply branch scope before aggregation or row counting.
13. Completion and Certificate consume only the payment-validation contract and never query Finance tables directly.
14. Server Actions contain validation and orchestration adapters only; domain logic remains in Finance application/domain services.
15. All sensitive mutation and export operations generate audit records with correlation IDs.
