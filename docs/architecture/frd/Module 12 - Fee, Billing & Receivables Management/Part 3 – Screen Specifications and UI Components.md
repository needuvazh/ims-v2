# Part 3 – Screen Specifications and UI Components

## Module 12 – Fee, Billing & Receivables Management

## 1. Purpose

This document defines the complete screen inventory, interaction model, field-level validation, table behavior, dynamic UI states, permission-driven visibility rules, and bilingual English/Arabic layout behavior for Module 12 – Fee, Billing & Receivables Management.

The specification follows the following architectural boundaries:

- Finance is invoice-centric and owns invoices, invoice line items, installment plans, installments, payments, receipts, refunds, receivables, aging classification, and corporate credit validation.
- Course Catalog owns course pricing, pricing hierarchy, discounts, and course completion rules. Finance displays resolved commercial snapshots and may validate them but must not provide UI for editing Course Catalog-owned rules.
- Admission & Enrollment owns StudentProfile and Enrollment lifecycle state. Finance screens may search and reference enrollments but must not mutate enrollment state directly.
- Corporate Training owns CorporateAccount, CorporateContract, CorporateParticipant, and nomination lifecycle. Finance consumes those references for invoicing and credit validation.
- Completion and Certificate modules consume payment-validation results. Finance screens must not compute academic completion eligibility or issue certificates.
- All operational finance access is server-side branch scoped. Consolidated views require explicit consolidated reporting authorization.
- Posted finance transactions are not hard deleted. Corrections use permitted state transitions, refund flows, reversal flows, or explicitly modeled adjustments.
- Default business timezone is Oman GST, UTC+4.
- English uses LTR rendering and Arabic uses RTL rendering, with numeric and financial values preserving locale-safe readability.

---

## 2. UX Design Principles

### 2.1 Dense, Data-Rich Finance Workspace

The Admin Portal must use a desktop-first finance workspace optimized for high information density without sacrificing readability.

Standard layout:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Global Header: Branch Context | Search | Language | Notifications | User   │
├──────────────┬─────────────────────────────────────────────────────────────┤
│ Module Nav   │ Page Header: Title | Context | Primary Actions             │
│              ├─────────────────────────────────────────────────────────────┤
│              │ KPI Strip / Summary Cards                                 │
│              ├─────────────────────────────────────────────────────────────┤
│              │ Filter Bar / Saved View / Export                          │
│              ├─────────────────────────────────────────────────────────────┤
│              │ Main Data Grid / Detail Workspace                         │
│              │                                                            │
│              │                                                            │
│              └─────────────────────────────────────────────────────────────┤
│              │ Pagination / Result Count / Page Size                      │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

Grid rules:

- Desktop width >= 1440 px: 12-column fluid grid, 24 px outer margin, 16 px gutters.
- Desktop width 1280–1439 px: 12-column grid, 16 px outer margin, 12 px gutters.
- Tablet width 768–1279 px: filters collapse into drawer; data grids permit horizontal scroll; primary actions remain visible.
- Mobile width < 768 px: Admin finance screens are supported for emergency read/approval operations only. Complex creation screens use stacked sections and bottom action bar. Bulk operations are hidden on mobile.
- Tables use compact row density of 40–44 px, sticky headers, optional sticky first column, and server-side sorting/filtering.
- Currency columns are right-aligned in English and left-aligned at the visual end in Arabic while preserving decimal grouping.
- Status is represented by text plus semantic badge; color alone must never convey state.

### 2.2 Shared Screen Components

The module uses the following reusable UI components:

| Component | Purpose | Mandatory Behavior |
|---|---|---|
| BranchContextSelector | Select active authorized branch context. | Server validates every selection; consolidated option appears only with permission. |
| FinanceDateRangePicker | Filter invoice/payment/receivable dates. | Uses GST business dates; inclusive date range; maximum export range configurable server-side. |
| CurrencyAmountInput | Enter monetary amount. | Decimal input; non-negative unless explicitly allowed; max 2 fractional digits for OMR display unless currency configuration defines otherwise. |
| EntitySearchCombobox | Search student, enrollment, invoice, corporate account, course, or batch. | Debounced server search; minimum 2 characters; branch scoped; keyboard accessible. |
| StatusBadge | Display business state. | Text label, translated label, icon where useful, never color-only. |
| PermissionGuard | Hide or disable protected controls. | UI behavior supplements, never replaces, server authorization. |
| AuditTimeline | Show chronological immutable audit events. | Displays actor, GST timestamp, action, old/new summary, reason, branch. |
| MoneySummaryPanel | Display subtotal, discount, tax, total, paid, refunded, outstanding. | Fixed decimal precision; explicit currency code. |
| DataGrid | Dense server-side table. | Sorting, filters, pagination, column visibility, responsive horizontal scroll. |
| ValidationSummary | Aggregate field and business-rule errors. | Links each error to field/section; screen-reader announcement. |
| UnsavedChangesGuard | Prevent accidental navigation from dirty forms. | Prompts before route change or tab close. |
| ApprovalDecisionPanel | Approve/reject controlled actions. | Requires permission; rejection reason mandatory; decision is audited. |
| BilingualDocumentPreview | Preview invoice/receipt in English or Arabic. | Direction-aware template, stable numeric formatting, print preview. |

---

## 3. Screen Inventory

### 3.1 Admin Portal Screens

| Screen ID | Screen Name | Primary Purpose | Primary Actors |
|---|---|---|---|
| FBR-A-001 | Finance Overview Dashboard | Operational finance KPIs, collections, overdue exposure, aging, branch summary. | Finance Officer, Finance Manager, Branch Manager, Executive Viewer |
| FBR-A-002 | Invoice List | Search, filter, review, export, and navigate invoices. | Finance Officer, Finance Manager, Auditor |
| FBR-A-003 | Create Student Invoice | Create invoice from confirmed/active enrollment commercial snapshot. | Finance Officer |
| FBR-A-004 | Create Corporate Invoice | Create single or consolidated corporate invoice. | Finance Officer, Finance Manager |
| FBR-A-005 | Invoice Detail | View monetary breakdown, lines, payments, receipts, refunds, receivable, audit. | Authorized finance/read actors |
| FBR-A-006 | Installment Plan Builder | Define and activate installment schedules. | Finance Officer, Finance Manager |
| FBR-A-007 | Payment Collection Workspace | Record manual payment and allocate to invoice/installment. | Finance Officer, Cashier |
| FBR-A-008 | Payment List and Detail | Search payments, inspect settlement history, receipt linkage, refund position. | Finance Officer, Finance Manager, Auditor |
| FBR-A-009 | Receipt Viewer and Print | Preview, print, and retrieve bilingual receipt. | Finance Officer, Cashier, Auditor |
| FBR-A-010 | Refund Work Queue | Search refund requests by status, branch, date, amount, requester. | Finance Officer, Finance Manager |
| FBR-A-011 | Refund Request Form | Submit a controlled refund request against eligible payment/invoice. | Finance Officer |
| FBR-A-012 | Refund Review and Decision | Review, approve, or reject refund request. | Finance Manager / delegated approver |
| FBR-A-013 | Receivables Aging Workspace | Monitor open balances and aging buckets with drill-down. | Finance Officer, Finance Manager, Branch Manager |
| FBR-A-014 | Corporate Credit Rules | Maintain effective-dated credit limits and block behavior. | Finance Manager |
| FBR-A-015 | Corporate Credit Exposure Detail | Inspect outstanding, committed, available credit, and validation history. | Finance Manager, Corporate Account Manager read-only |
| FBR-A-016 | Finance Export Center | Generate authorized CSV/XLSX/PDF exports from supported datasets. | Authorized reporting users |
| FBR-A-017 | Finance Audit Explorer | Search sensitive financial actions and before/after changes. | Finance Manager, Auditor |
| FBR-A-018 | Numbering Series Read View | View invoice/receipt numbering configuration consumed from Configuration context. | Finance Manager, Auditor |

### 3.2 Student Portal Screens

The current DDD baseline is single Admin Portal first. The following Student Portal screens are UI contracts for activation when the Student Portal is enabled. They are read-only except for download/print interactions; automated gateway payment initiation is excluded from current Module 12 scope.

| Screen ID | Screen Name | Purpose |
|---|---|---|
| FBR-S-001 | My Fees and Invoices | View own invoices, totals, payment status, due dates, and outstanding balances. |
| FBR-S-002 | Invoice Detail | View own invoice lines, totals, payment history, installment schedule, and downloadable document. |
| FBR-S-003 | My Installment Schedule | View due installments, paid amounts, remaining amount, and overdue status. |
| FBR-S-004 | My Receipts | View and download receipts belonging to the authenticated student. |
| FBR-S-005 | Payment Status Summary | View payment-validation status per enrollment without exposing internal finance controls. |

### 3.3 Trainer Portal Applicability

No dedicated Fee, Billing & Receivables transactional screens are required in the Trainer Portal.

Trainer users must not see student invoice amounts, payment methods, corporate credit limits, refund history, receivable aging, or finance audit information through Module 12.

Where Completion workflow UI requires awareness of a financial prerequisite, the Trainer Portal may display only a coarse, read-only status supplied by the Completion module, such as:

```text
Payment Requirement: Satisfied
Payment Requirement: Pending
Payment Requirement: Not Required
```

This status must not include invoice amount, outstanding amount, payment method, payment reference, or refund details.

---

# 4. Admin Portal Screen Specifications

## 4.1 FBR-A-001 – Finance Overview Dashboard

### Purpose

Provide an operational summary of billing, collections, outstanding receivables, overdue exposure, and aging for the active authorized branch scope.

### Layout and Grid Structure

- Page header: 12 columns.
- Title and scope breadcrumb: columns 1–7.
- Date range selector, branch selector, refresh action: columns 8–12.
- KPI row 1: six cards at 2 columns each on wide desktop.
- KPI row 2: four cards at 3 columns each.
- Main analytics area:
  - Collections trend: columns 1–8.
  - Aging distribution: columns 9–12.
- Bottom area:
  - Overdue invoices table: columns 1–7.
  - Upcoming installments table: columns 8–12.

### KPI Cards

1. Total Invoiced.
2. Total Collected.
3. Total Refunded.
4. Net Collected = Collected − Executed Refunds.
5. Outstanding Receivables.
6. Overdue Receivables.
7. Collection Efficiency = effective collected amount / collectible billed amount × 100.
8. Due in Next 7 Days.
9. Corporate Exposure.
10. Blocked Corporate Credit Validations.

All ratios must handle zero denominator by returning `0%` with tooltip `No collectible billed amount in selected scope`.

### Interactive Elements

- Branch selector.
- Consolidated scope selector, visible only with consolidated permission.
- Preset date ranges: Today, Last 7 Days, Month to Date, Previous Month, Quarter to Date, Year to Date, Custom.
- Refresh button.
- Drill-down links on every KPI card.
- Chart hover tooltips.
- Export summary button, permission controlled.
- Saved view selector.

### Filters and Validations

| Field | Type | Required | Validation |
|---|---|---:|---|
| Branch Scope | Select | Yes | Must be one authorized branch or authorized consolidated scope. |
| Date From | Date | Yes | Must be <= Date To. |
| Date To | Date | Yes | Must be >= Date From and not exceed server export/query policy. |
| Currency | Select | Yes when multiple currencies exist | Must match supported configured currency. |

### Data Table: Overdue Invoices

Columns:

- Invoice Number: sortable, exact/contains filter.
- Customer Type: Student/Corporate filter.
- Customer Name: sortable, text search.
- Branch: sortable/filterable when multiple branches in scope.
- Invoice Date: sortable, date-range filter.
- Due Date: sortable, date-range filter.
- Days Overdue: sortable numeric.
- Total Amount: sortable numeric.
- Paid Amount: sortable numeric.
- Outstanding Amount: sortable numeric.
- Aging Bucket: filterable enum.
- Status: filterable enum.
- Row Actions: View Invoice, Record Payment when permitted.

Paging: server-side, default 25, options 25/50/100, maximum 100.

### Dynamic States

- Loading: KPI card skeletons and chart skeletons; table displays 8 row skeletons.
- Empty: `No finance activity for the selected period and branch scope.`
- Partial-data warning: show non-blocking banner when one analytics query fails but transactional list remains available.
- Permission hiding: export, payment actions, and consolidated scope hidden when unauthorized.
- Stale data: show `Last refreshed at HH:mm GST` and manual refresh action.

---

## 4.2 FBR-A-002 – Invoice List

### Purpose

Provide the primary operational register of student and corporate invoices.

### Layout and Grid Structure

- Header: title, result count, primary actions.
- Summary strip: Total, Issued, Partially Paid, Paid, Overdue, Outstanding Amount.
- Filter bar: compact horizontal filters on desktop; advanced filters drawer.
- Main grid: full width, sticky header, horizontal scroll below 1280 px.
- Bulk selection column appears only when at least one authorized bulk action exists.

### Interactive Elements

- `Create Student Invoice` button.
- `Create Corporate Invoice` button.
- Search input.
- Quick status tabs: All, Draft, Issued, Partially Paid, Paid, Overdue, Cancelled/Voided where supported.
- Advanced Filter button.
- Column chooser.
- Saved view selector.
- Export button.
- Row context menu.

### Filters

| Field | Control | Validation/Behavior |
|---|---|---|
| Search | Text | 2–100 chars; searches invoice number and allowed customer display fields. |
| Invoice Type | Multi-select | Enum values supported by domain model. |
| Status | Multi-select | Valid InvoiceStatus only. |
| Student | Async combobox | Branch-scoped; minimum 2 search chars. |
| Corporate Account | Async combobox | Active/inactive read search; branch/report scope rules apply. |
| Enrollment | Async combobox | Exact enrollment number or 2+ char search. |
| Branch | Multi-select | Intersected server-side with authorized branch set. |
| Invoice Date Range | Date range | From <= To. |
| Due Date Range | Date range | From <= To. |
| Outstanding Only | Toggle | When on, outstandingAmount > 0. |
| Overdue Only | Toggle | When on, dueDate < GST business date and outstandingAmount > 0. |
| Min Amount | Decimal | >= 0, max 2 decimals. |
| Max Amount | Decimal | >= Min Amount, max 2 decimals. |

### Table Columns

1. Invoice Number – default ascending/descending sort supported.
2. Invoice Type – filter.
3. Customer – sortable by normalized display name.
4. Student Number or Corporate Account Code – searchable.
5. Enrollment Number – link when one enrollment; `N enrollments` badge for consolidated invoice.
6. Branch – sortable/filterable.
7. Invoice Date – sortable.
8. Due Date – sortable.
9. Currency – filter.
10. Total Amount – sortable numeric.
11. Paid Amount – sortable numeric.
12. Refunded Amount – sortable numeric where applicable.
13. Outstanding Amount – sortable numeric.
14. Status – filter.
15. Aging Bucket – filter.
16. Updated At – sortable.
17. Actions – View, Record Payment, Request Refund, Download Invoice based on state and permission.

### Sorting, Filtering, Paging

- Server-side sorting only.
- Single-column sort by default; optional secondary deterministic `id` ordering server-side.
- Default sort: Invoice Date DESC, Created At DESC.
- Filter changes reset to page 1.
- Default page size 25; allowed 25/50/100.
- URL query state must preserve filters, page, and sort for shareable authorized views.

### Dynamic States

- Invalid filter combination: inline filter error and query not submitted.
- No results: `No invoices match the selected filters.` with Clear Filters action.
- No data in branch: `No invoices have been issued in this branch.`
- Unauthorized create controls: hidden.
- User with read-only permission: row mutation actions hidden.

---

## 4.3 FBR-A-003 – Create Student Invoice

### Purpose

Create a student invoice from an eligible confirmed or active enrollment using the immutable resolved commercial snapshot.

### Layout and Grid Structure

Two-column desktop form:

```text
Columns 1–8: Main form sections
Columns 9–12: Sticky Enrollment Summary + Money Summary + Validation Status
```

Sections:

1. Enrollment Selection.
2. Billing Context.
3. Invoice Line Preview.
4. Tax and Amount Validation.
5. Bilingual Description.
6. Review and Issue.

### Interactive Elements

- Enrollment search combobox.
- Preview commercial snapshot button.
- Invoice type selector.
- Date pickers.
- Tax inputs as allowed by configuration.
- English/Arabic description tabs.
- Save Draft.
- Validate Totals.
- Issue Invoice.
- Cancel.

### Input Fields and Exact Validations

| Field | Type | Required | Validation |
|---|---|---:|---|
| Enrollment | Async entity selector | Yes | Must resolve to existing, non-deleted enrollment in Confirmed or Active state; must contain studentProfileId, courseId, batchId, branchId, resolvedPrice, resolvedDiscount, finalAmount. |
| Invoice Type | Enum select | Yes | Default `StudentInvoice`; only types permitted for selected flow may be chosen. |
| Invoice Date | Date | Yes | Valid ISO date; interpreted in GST; cannot violate configured backdating permission. |
| Due Date | Date | Yes | Must be >= Invoice Date unless explicitly authorized business rule permits same-day due date; cannot be null. |
| Currency | Read-only select/value | Yes | Must equal enrollment commercial currency or approved finance currency source; cannot be edited after line calculation. |
| Quantity | Decimal | Yes | > 0; max 4 decimal places if fractional quantity is enabled, otherwise positive integer; default 1. |
| Unit Price | Currency decimal | Yes | >= 0; server value derived from commercial snapshot; read-only unless explicit adjustment permission exists. |
| Discount Amount | Currency decimal | Yes | >= 0 and <= gross line amount; normally read-only from snapshot. |
| Tax Rate | Decimal percent | Conditional | >= 0 and <= 100; max 4 decimal places; only visible if tax policy uses rate input. |
| Tax Amount | Currency decimal | Conditional | >= 0; server-calculated or authoritative input per configuration; cannot conflict with rate calculation beyond rounding tolerance. |
| Description English | Text | Yes | Trimmed length 3–500; control characters rejected. |
| Description Arabic | Text | Conditional | Required when bilingual document policy requires Arabic; length 3–500; Unicode Arabic and mixed business identifiers allowed. |
| Idempotency Key | Hidden/generated string | Yes | UUID v4 or server-supported opaque key; generated once per submission attempt. |

### Processing Feedback

The UI must show a validation checklist:

- Enrollment state eligible.
- Course present.
- Batch present.
- Branch authorized.
- Commercial snapshot complete.
- No duplicate active billing obligation.
- Monetary totals reconciled.
- Numbering series available.

### Error States

- `Enrollment is not eligible for billing.`
- `This enrollment is outside your authorized branch scope.`
- `An active invoice already covers this enrollment billing obligation.`
- `Resolved commercial values are incomplete. Revalidation is required before invoicing.`
- `Calculated invoice total does not match the enrollment commercial snapshot.`
- `No active invoice numbering series is available for this branch.`

Errors must include field association when applicable and a stable machine-readable error code from API response.

---

## 4.4 FBR-A-004 – Create Corporate Invoice

### Purpose

Create a corporate invoice from one or more eligible corporate enrollments while preserving participant and enrollment traceability.

### Layout and Grid Structure

- Step header with four steps: Account, Enrollments, Commercial Review, Issue.
- Main area 9 columns; sticky invoice summary 3 columns.
- Enrollment selection uses dense selectable grid.

### Inputs and Validations

| Field | Type | Required | Validation |
|---|---|---:|---|
| Corporate Account | Async selector | Yes | Must exist and be active for new billing. |
| Invoice Type | Enum | Yes | `CorporateInvoice`, `MilestoneInvoice`, or `FinalInvoice` when flow permits. |
| Contract | Async selector | Conditional | Required when billing is contract-driven; must belong to selected corporate account and be effective for transaction date unless authorized exception exists. |
| Quotation Reference | Async read selector | Optional | Must belong to account/prospect lineage and be approved if used as billing basis. |
| Sales Order Reference | Async read selector | Optional | Must belong to selected account and valid commercial lineage. |
| Enrollment IDs | Multi-row selection | Yes | At least 1; every enrollment must be corporate-linked, billable, currency-compatible, and belong to selected account. |
| Invoice Date | Date | Yes | GST business date validation and backdate permission rules. |
| Due Date | Date | Yes | >= invoice date. |
| Currency | Select/read-only | Yes | All selected lines must use same currency. |
| Header Description EN | Text | Yes | 3–500 chars. |
| Header Description AR | Text | Conditional | 3–500 chars when required. |

### Enrollment Selection Table

Columns:

- Select checkbox.
- Enrollment Number.
- Participant Name.
- Employee Code.
- Course.
- Batch.
- Source Branch.
- Pricing Source.
- Gross Amount.
- Discount.
- Tax.
- Line Total.
- Billing Eligibility.

Filters:

- branch,
- course,
- batch,
- participant,
- billing status,
- date range.

Rows failing eligibility remain visible with disabled checkbox and reason tooltip.

### Cross-Branch Behavior

- Without consolidated invoice authority, only enrollments in active authorized branch scope appear.
- With consolidated authority, multi-branch enrollment selection is permitted only when server-side corporate billing rules permit consolidation.
- Source branch must remain visible on every selected line.

### Dynamic States

- Mixed currency selection: blocking validation banner; Issue disabled.
- Duplicate obligation detected: affected rows highlighted with reason.
- Corporate credit warning: informational or blocking depending on rule; credit validation must not be bypassed from this screen.
- No eligible enrollment: empty state with explanation, not a generic blank grid.

---

## 4.5 FBR-A-005 – Invoice Detail

### Purpose

Provide a complete, auditable view of one invoice and all settlement-related relationships.

### Layout and Grid Structure

- Header: invoice number, status, type, branch, actions.
- Summary ribbon: Total, Paid, Refunded, Outstanding, Due Date, Aging.
- Tabs:
  1. Overview.
  2. Line Items.
  3. Payments.
  4. Installments.
  5. Receipts.
  6. Refunds.
  7. Receivable.
  8. Audit History.

### Header Actions

- Record Payment.
- Create Installment Plan.
- Request Refund.
- Download Invoice.
- Preview English.
- Preview Arabic.
- Export Audit View.

Each action is visible only when both permission and business state allow it.

### Overview Fields

Read-only fields:

- invoiceNumber,
- invoiceType,
- status,
- student or corporate customer,
- branch context,
- invoiceDate,
- dueDate,
- currency,
- subtotal,
- discountAmount,
- taxAmount,
- totalAmount,
- paidAmount,
- effectiveRefundedAmount,
- outstandingAmount,
- createdBy,
- createdAt GST,
- updatedBy,
- updatedAt GST,
- version.

### Line Items Table

Columns:

- Line Number.
- Enrollment Number.
- Student/Participant.
- Course Code.
- Course Name.
- Batch Code.
- Source Branch.
- Description.
- Quantity.
- Unit Price.
- Discount.
- Tax.
- Line Total.

Sorting: enrollment number, course, batch, line total.
Filtering: source branch, course, batch for consolidated invoices.
Paging: default 25 for corporate invoices with many lines.

### Payment Tab Table

- Payment Number.
- Payment Date.
- Method.
- Amount.
- Reference Number masked according to policy.
- Received By.
- Status.
- Receipt Number.
- Refundable Remaining Amount.

### Dynamic States

- Loading: header and tab skeletons.
- Concurrent change: if version changes while user is on page, show refresh banner.
- Invoice unavailable due branch scope: render access-denied state, not not-found detail leak.
- No payments: `No payments have been recorded for this invoice.`
- Paid invoice: hide Record Payment action.
- Outstanding zero with refund eligible payment: refund action remains governed by refund policy.

---

## 4.6 FBR-A-006 – Installment Plan Builder

### Purpose

Create an installment schedule whose sum exactly matches the invoice amount assigned to the plan.

### Layout and Grid Structure

- Invoice summary panel: 4 columns.
- Plan configuration and installment grid: 8 columns.
- Sticky validation footer.

### Input Fields and Exact Validations

| Field | Type | Required | Validation |
|---|---|---:|---|
| Invoice | Read-only entity reference | Yes | Must exist, be authorized, and be eligible for installment planning. |
| Plan Name | Text | Yes | 3–100 chars; trimmed; letters, numbers, spaces, hyphen, slash, parentheses allowed. Regex: `^[\\p{L}\\p{N} .()/_-]{3,100}$` with Unicode flag. |
| Number of Installments | Integer | Yes | 1–60; server may enforce lower configured maximum. |
| First Due Date | Date | Yes | Valid GST business date; cannot precede invoice date unless explicitly authorized. |
| Frequency | Enum | Yes | Weekly, Monthly, Custom when supported by business configuration. |
| Installment Amounts | Currency decimal | Yes | Each > 0; max currency precision; sum must exactly equal plan total. |
| Due Dates | Date | Yes | Strictly increasing; no duplicates; each valid date. |

### Installment Grid Columns

- Sequence Number.
- Due Date.
- Scheduled Amount.
- Paid Amount read-only.
- Remaining Amount read-only.
- Status read-only after activation.
- Delete row before activation.

### Interactions

- Generate Schedule.
- Equal Split.
- Adjust Final Installment for rounding.
- Add Row in custom mode.
- Validate Schedule.
- Activate Plan.
- Save Draft.

### Validation Rules

- Sum(schedule.amount) = installmentPlan.totalAmount exactly.
- Number of rows = numberOfInstallments.
- Sequence begins at 1 and has no gaps.
- Due dates strictly ascending.
- No amount <= 0.
- Activated plan cannot be silently overwritten.

### Error States

- `Installment amounts differ from the plan total by OMR X.XXX.`
- `Due dates must be in ascending order.`
- `This invoice already has an active installment plan that conflicts with this request.`
- `The invoice changed while you were editing. Refresh before activating the plan.`

---

## 4.7 FBR-A-007 – Payment Collection Workspace

### Purpose

Record a manual payment against an invoice and, where applicable, allocate it to installment obligations.

### Layout and Grid Structure

- Left 7 columns: payment form.
- Right 5 columns: invoice summary, installment allocation, amount validation.
- Sticky bottom bar: Cancel, Save and Generate Receipt.

### Input Fields and Exact Validations

| Field | Type | Required | Validation |
|---|---|---:|---|
| Invoice | Async selector | Yes | Must exist, be branch-authorized, have outstanding collectible amount, and be in payable state. |
| Payment Date | Date/time business input | Yes | Stored as timestamp; UI defaults to current GST date/time; future timestamp prohibited beyond clock-skew tolerance. Backdating requires permission where configured. |
| Payment Method | Enum | Yes | Cash, Bank Transfer, Card, Cheque, Corporate Billing; Online is display-only until gateway processing is implemented. |
| Amount | Currency decimal | Yes | > 0; max configured currency precision; cannot exceed effective outstanding amount unless explicit advance-credit model is enabled, which is outside current normal settlement flow. |
| Reference Number | Text | Conditional | Required for Bank Transfer, Card, Cheque, and Corporate Billing reference flows; 3–100 chars; regex `^[A-Za-z0-9][A-Za-z0-9 ./_-]{2,99}$`. |
| Remarks | Textarea | Optional | 0–500 chars; trimmed; control characters rejected. |
| Installment Allocation | Allocation rows | Conditional | Required when allocation policy requires explicit installment mapping; allocation total must equal payment amount. |
| Idempotency Key | Hidden/generated | Yes | Unique opaque key per logical submission. |

### Installment Allocation Table

Columns:

- Sequence.
- Due Date.
- Scheduled Amount.
- Previously Paid.
- Remaining.
- Allocation Amount editable.
- Resulting Status preview.

Allocation validation:

- each allocation >= 0,
- each allocation <= installment remaining amount unless policy explicitly allows forward allocation,
- sum allocations = payment amount when full explicit allocation is required,
- server remains authoritative for allocation order and concurrency.

### Interactions

- Select Invoice.
- Apply Oldest Due First.
- Clear Allocation.
- Validate Payment.
- Save and Generate Receipt.
- Cancel.

### Success State

After transaction succeeds:

- payment number shown,
- receipt number shown,
- updated invoice paid/outstanding displayed,
- buttons: View Receipt, Print Receipt, View Invoice, Record Another Payment.

### Failure States

- Duplicate idempotency request: show existing successful payment result instead of creating another payment.
- Concurrency conflict: `The invoice balance changed before this payment was saved. Review the latest outstanding amount.`
- Amount exceeds outstanding: field-level error with latest outstanding amount.
- Missing reference: field-level error based on selected method.

---

## 4.8 FBR-A-008 – Payment List and Detail

### Layout

- Summary row: payments count, gross collected, refunded amount, net collected.
- Filter bar.
- Payment grid.
- Detail opens full page or right-side drawer for quick review; mutation actions use full workflow screen.

### Filters

- Payment Number: 1–100 chars.
- Invoice Number: 1–100 chars.
- Student.
- Corporate Account.
- Branch.
- Payment Method.
- Status.
- Payment Date Range.
- Amount Min/Max.
- Received By.
- Has Refund toggle.

### Table Columns

- Payment Number.
- Payment Date.
- Invoice Number.
- Customer.
- Branch.
- Method.
- Amount.
- Refunded Amount.
- Net Retained Amount.
- Reference Number masked.
- Received By.
- Status.
- Receipt Number.
- Actions.

Default sort: Payment Date DESC, Created At DESC.
Paging: 25/50/100 server-side.

### Detail Sections

- Payment identity.
- Invoice link.
- Customer context.
- method/reference.
- amount.
- receipt.
- refund history.
- audit timeline.

---

## 4.9 FBR-A-009 – Receipt Viewer and Print

### Purpose

Provide stable bilingual receipt retrieval and print presentation.

### Layout

- Toolbar: language switch, print, download PDF, back.
- Document canvas centered within neutral background.
- Metadata side panel on desktop: receipt number, payment number, issue timestamp GST, issued by.

### Interactive Elements

- English / العربية toggle.
- Print.
- Download PDF.
- Copy receipt number.
- View payment.
- View invoice.

### Document Fields

- ASTI institute identity.
- branch identity.
- receipt number.
- receipt date/time GST.
- payer/student/corporate customer display name.
- invoice number.
- payment number.
- payment method.
- reference number where allowed for display.
- amount in numeric format with currency.
- amount-in-words only when approved template logic supports locale accurately.
- issuer identity or approved display designation.

### States

- Generating PDF: progress indicator; page remains usable.
- Missing generated file but receipt record exists: regenerate action shown only when permitted; immutable receipt data remains unchanged.
- Unauthorized: access denied.

---

## 4.10 FBR-A-010 – Refund Work Queue

### Purpose

Central queue for refund lifecycle management.

### Layout

- Status tabs: Requested, Under Review, Approved, Rejected, Executed, All.
- KPI strip: request count, requested amount, approved pending execution, executed amount.
- Filter bar.
- Dense queue grid.

### Filters

- Refund Number.
- Invoice Number.
- Payment Number.
- Customer.
- Branch.
- Refund Type.
- Status.
- Request Date Range.
- Amount Min/Max.
- Requested By.
- Approved By.

### Table Columns

- Refund Number.
- Requested At.
- Customer.
- Invoice Number.
- Payment Number.
- Refund Type.
- Requested Amount.
- Refundable Amount at Request.
- Status.
- Requested By.
- Current Approver.
- Branch.
- Actions.

Row actions:

- View.
- Review when assigned and permitted.
- View Invoice.
- View Payment.

---

## 4.11 FBR-A-011 – Refund Request Form

### Purpose

Create a refund request without mutating the original payment.

### Input Fields and Exact Validations

| Field | Type | Required | Validation |
|---|---|---:|---|
| Payment | Async selector | Yes | Must be successful/eligible payment in authorized branch scope. |
| Invoice | Read-only derived | Yes | Must match selected payment. |
| Refund Type | Enum | Yes | Full or Partial. |
| Amount | Currency decimal | Yes | > 0; for Full must equal currently refundable amount; for Partial must be <= currently refundable amount. |
| Reason Code | Enum | Yes | Must be active configured refund reason. |
| Reason Details | Textarea | Yes | 10–1000 chars; trimmed. |
| Requested Effective Date | Date | Yes | Valid GST business date; cannot be future unless explicitly permitted by workflow policy. |

### Summary Panel

Display:

- original payment amount,
- previous executed refunds,
- currently refundable amount,
- requested refund,
- remaining refundable after execution preview.

### Interactions

- Validate Eligibility.
- Submit Request.
- Cancel.

### Error States

- `The refundable amount changed while this request was being prepared.`
- `Refund amount exceeds the currently refundable payment balance.`
- `This payment is not eligible for refund.`
- `A conflicting refund request is already pending for this payment.`

---

## 4.12 FBR-A-012 – Refund Review and Decision

### Layout

- Left 8 columns: request facts and linked transaction timeline.
- Right 4 columns: decision panel, impact preview, approval history.

### Read-Only Review Information

- refund number,
- requester,
- request timestamp GST,
- branch,
- customer,
- invoice summary,
- payment summary,
- payment method,
- original amount,
- previous refunds,
- requested amount,
- reason code,
- reason details,
- current refundable amount,
- concurrency/version status.

### Decision Inputs

| Field | Type | Required | Validation |
|---|---|---:|---|
| Decision | Radio | Yes | Approve or Reject. |
| Approval Remarks | Textarea | Conditional | Optional for approve unless policy requires; 0–1000 chars. |
| Rejection Reason | Textarea | Required on Reject | 10–1000 chars. |
| Version | Hidden integer | Yes | Must match current aggregate version. |

### Actions

- Approve Refund.
- Reject Refund.
- Return to Queue.

Approve and reject buttons require explicit permission and confirmation dialog showing refund amount and payment number.

### Concurrency State

When the underlying refundable balance changes:

- disable decision controls,
- display blocking banner,
- require Refresh Review,
- recompute refund eligibility server-side.

---

## 4.13 FBR-A-013 – Receivables Aging Workspace

### Purpose

Monitor and collect outstanding balances by aging bucket, customer type, branch, and due date.

### Layout

- Aging bucket cards across top.
- Filter row.
- Main receivables grid: 9 columns.
- Right insight panel: 3 columns with selected customer exposure summary.

### Aging Cards

- Current.
- 30 Days.
- 60 Days.
- 90 Days.
- 120+ Days.

The UI must display the server-defined day-range tooltip for each bucket so users can understand any compatibility mapping used by the domain model.

### Filters

- Customer Type.
- Student.
- Corporate Account.
- Branch.
- Aging Bucket.
- Due Date Range.
- Outstanding Min/Max.
- Invoice Status.
- Course.
- Batch.

### Table Columns

- Customer.
- Customer Type.
- Invoice Number.
- Enrollment/Consolidated indicator.
- Branch.
- Invoice Date.
- Due Date.
- Days Overdue.
- Aging Bucket.
- Total Amount.
- Paid Amount.
- Outstanding Amount.
- Last Payment Date.
- Actions: View Invoice, Record Payment where allowed.

### Sorting and Paging

Default: Days Overdue DESC, Outstanding Amount DESC.
Server paging: 25/50/100.
Server aggregates must reflect full filtered result set, not only current page.

### Empty State

`No outstanding receivables match this scope.`

When no outstanding receivables exist at all for a branch, show positive state:

`All issued invoices in this branch are fully settled for the selected scope.`

---

## 4.14 FBR-A-014 – Corporate Credit Rules

### Purpose

Maintain effective-dated corporate credit limits and blocking behavior.

### Layout

- Header with Create Rule.
- Corporate account search/filter bar.
- Rules grid.
- Create/Edit rule in full-height side panel or dedicated route.

### Rule Form Fields and Exact Validations

| Field | Type | Required | Validation |
|---|---|---:|---|
| Corporate Account | Async selector | Yes | Must exist; immutable after rule creation unless draft flow explicitly supports correction. |
| Credit Limit | Currency decimal | Yes | >= 0; max currency precision; upper bound enforced server-side according to Decimal schema capacity. |
| Block on Credit Limit | Boolean | Yes | true or false. |
| Effective Start Date | Date | Yes | Valid GST business date. |
| Effective End Date | Date | Optional | Must be >= Effective Start Date. |
| Status | Enum | Yes | Draft/Active/Inactive as supported by implementation policy. |
| Change Reason | Textarea | Yes for update/deactivation | 10–500 chars. |

### Overlap Validation

The system must reject overlapping active effective periods for the same corporate account when policy requires a single effective credit rule at a time.

### Rules Table Columns

- Corporate Account Code.
- Corporate Account Name.
- Credit Limit.
- Current Outstanding.
- Committed Amount.
- Available Credit.
- Block Flag.
- Effective Start.
- Effective End.
- Status.
- Last Calculated At.
- Updated By.
- Actions.

### Permission Behavior

- `finance.credit.read`: view.
- `finance.credit.manage`: create/update/end-date.
- Without manage permission, Create and Edit controls are hidden.

---

## 4.15 FBR-A-015 – Corporate Credit Exposure Detail

### Purpose

Explain current corporate exposure and credit-validation outcomes.

### Layout

- Header summary card.
- Exposure equation ribbon:

```text
Credit Limit
− Current Outstanding
− Committed Amount
= Available Credit
```

- Tabs: Open Invoices, Committed Enrollments, Validation History, Rule History.

### Open Invoices Table

- Invoice Number.
- Invoice Date.
- Due Date.
- Total.
- Paid.
- Outstanding.
- Aging Bucket.
- Branch.

### Committed Enrollments Table

- Enrollment Number.
- Participant.
- Course.
- Batch.
- Branch.
- Committed Amount.
- Billing Status.

### Validation History Table

- Validation Timestamp GST.
- Enrollment or Bulk Request Reference.
- Exposure Before.
- New Commitment.
- Projected Exposure.
- Credit Limit.
- Block Flag.
- Result: Passed/Failed/Warning.
- Requested By/System Actor.

### Permission Rules

Corporate Account Manager may receive read-only access to account(s) assigned through Corporate Training authorization. They cannot edit the credit rule from this screen.

---

## 4.16 FBR-A-016 – Finance Export Center

### Purpose

Generate branch-scoped or authorized consolidated exports without exposing unauthorized data.

### Layout

- Dataset cards at top.
- Export configuration form.
- Recent export requests table.

### Supported Dataset Types

- Invoice Register.
- Payment Register.
- Receipt Register.
- Refund Register.
- Receivables Aging.
- Installment Schedule Status.
- Corporate Credit Exposure.
- Finance Audit Extract for authorized auditors.

### Input Fields

| Field | Type | Required | Validation |
|---|---|---:|---|
| Dataset | Enum | Yes | Must be one authorized dataset. |
| Branch Scope | Select/multi-select | Yes | Must be subset of authorized branches or approved consolidated scope. |
| Date From | Date | Conditional | Required for transaction datasets. |
| Date To | Date | Conditional | >= Date From; maximum range server controlled. |
| Format | Enum | Yes | CSV, XLSX, PDF only where supported. |
| Language | Enum | Yes | English or Arabic for human-readable PDF; data exports may use bilingual columns according to dataset definition. |
| Include Audit Metadata | Boolean | Optional | Visible only with audit-export permission. |

### Recent Exports Table

- Requested At.
- Dataset.
- Scope.
- Date Range.
- Format.
- Status.
- Requested By.
- Completed At.
- Download Action.

Download links must be short-lived and authorization rechecked at access time.

---

## 4.17 FBR-A-017 – Finance Audit Explorer

### Purpose

Search immutable audit records for sensitive finance operations.

### Filters

- Entity Type.
- Entity ID/reference.
- Action.
- Actor.
- Branch.
- Date/Time From.
- Date/Time To.
- Reason Contains.

### Table Columns

- Performed At GST.
- Entity Type.
- Entity Reference.
- Action.
- Actor.
- Branch.
- Reason.
- IP Address masked according to security policy.
- Detail action.

### Detail Drawer

- actor identity,
- timestamp,
- branch context,
- entity reference,
- action,
- reason,
- old value structured diff,
- new value structured diff.

Sensitive values must be redacted according to field classification. Passwords, security tokens, full card data, or protected secrets must never appear.

---

## 4.18 FBR-A-018 – Numbering Series Read View

### Purpose

Provide finance users visibility into active Invoice and Receipt numbering series without transferring ownership from Configuration / Master Data.

### Layout

Read-only table with link to configuration module only for users authorized there.

### Table Columns

- Entity Type.
- Branch.
- Prefix.
- Year Format.
- Padding Length.
- Next Number.
- Suffix.
- Active Status.
- Effective Context.

### Rules

- No edit controls in Finance module.
- `Go to Configuration` link appears only with Configuration permission.
- Sensitive concurrency/sequence internals are not exposed beyond business-useful numbering metadata.

---

# 5. Student Portal Screen Specifications

## 5.1 FBR-S-001 – My Fees and Invoices

### Layout

- Summary cards: Total Billed, Total Paid, Outstanding, Overdue.
- Enrollment filter.
- Invoice list cards on mobile; compact table on desktop.

### Filters

- Enrollment.
- Invoice Status.
- Invoice Date Range.

The authenticated student identity is implicit and cannot be changed through request parameters.

### Table Columns

- Invoice Number.
- Course.
- Batch.
- Invoice Date.
- Due Date.
- Total.
- Paid.
- Outstanding.
- Status.
- View.

### Security Rule

Every request must derive StudentProfile identity from authenticated portal context. The API must not trust arbitrary studentProfileId supplied by the browser.

---

## 5.2 FBR-S-002 – Student Invoice Detail

### Layout

- Invoice header and status.
- Money summary.
- Tabs: Charges, Payments, Installments, Receipts.

### Actions

- Download Invoice.
- View Receipt.
- Print.

No edit, payment-recording, refund-request, or credit controls are shown.

### Charges Table

- Description.
- Course.
- Batch.
- Quantity.
- Unit Price.
- Discount.
- Tax.
- Line Total.

### Payment Table

- Payment Date.
- Payment Number.
- Method label.
- Amount.
- Receipt Number.

Reference numbers are hidden or masked according to privacy policy.

---

## 5.3 FBR-S-003 – My Installment Schedule

### Layout

- Enrollment/invoice selector.
- Progress summary.
- Timeline/table hybrid.

### Columns

- Installment Number.
- Due Date.
- Scheduled Amount.
- Paid Amount.
- Remaining Amount.
- Status.

### States

- Upcoming.
- Due Today.
- Partially Paid.
- Paid.
- Overdue.

No rescheduling control is available to student users in Module 12.

---

## 5.4 FBR-S-004 – My Receipts

### Layout

- Search by receipt/invoice number.
- Date range filter.
- Receipt list.

### Columns

- Receipt Number.
- Receipt Date.
- Invoice Number.
- Payment Number.
- Amount.
- Payment Method.
- Download/View.

The list is restricted to receipts linked to payments belonging to the authenticated student's invoices.

---

## 5.5 FBR-S-005 – Payment Status Summary

### Purpose

Show a learner-friendly payment requirement status per enrollment.

### Cards/Table Fields

- Enrollment Number.
- Course.
- Batch.
- Payment Requirement: Required / Not Required.
- Payment Status: Satisfied / Pending / Overdue.
- Outstanding Amount when student is authorized to view own amount.
- Next Due Date when installment schedule exists.

This screen does not display internal completion approval state or certificate issuance control.

---

# 6. Dynamic UI States and Interaction Standards

## 6.1 Form Validation States

Every mutation form must support four validation layers:

### Layer 1 – Client Syntax Validation

Examples:

- required field absent,
- malformed decimal,
- string length exceeded,
- due date earlier than invoice date,
- payment amount <= 0,
- refund reason fewer than 10 characters.

Behavior:

- validate on blur for individual fields,
- validate all fields on submit,
- show inline message under field,
- set `aria-invalid=true`,
- connect error via `aria-describedby`,
- show error icon plus text,
- never rely on red border alone.

### Layer 2 – Server Field Validation

Examples:

- unsupported enum value,
- amount precision exceeds currency rule,
- malformed identifier,
- inactive reference entity.

Behavior:

- map server error to exact field where possible,
- retain non-sensitive user-entered values,
- focus first invalid field,
- show top Validation Summary.

### Layer 3 – Business Rule Validation

Examples:

- enrollment already billed,
- payment exceeds current outstanding,
- refund exceeds refundable balance,
- mixed currency corporate invoice,
- overlapping effective-dated credit rule,
- installment sum mismatch.

Behavior:

- show blocking business-rule banner,
- include affected entity reference,
- provide safe resolution action such as Refresh, Remove Row, or Review Existing Invoice,
- do not expose internal stack traces or SQL errors.

### Layer 4 – Concurrency Validation

For invoice balance, refund eligibility, credit rule, and installment mutations:

- submit current `version`,
- API returns conflict when version is stale,
- show conflict banner,
- disable repeated blind submit,
- provide `Reload Latest Data`,
- user must review changes before retry.

## 6.2 Loading States

### Full Page Load

- render page shell immediately,
- header skeleton,
- KPI skeleton cards,
- table header skeleton,
- 8–10 row skeletons,
- avoid cumulative layout shift.

### Table Refresh

- retain previous rows with subtle loading overlay or top progress indicator,
- disable conflicting bulk actions,
- do not clear table to blank during every filter request.

### Async Combobox

- loading spinner inside control,
- `Searching…` text announced to screen reader,
- no-results text specific to entity type,
- stale request responses discarded.

### Mutation Submit

- submitting button shows progress state,
- duplicate click prevented,
- idempotency key retained across retry of same logical operation,
- navigation blocked until definitive success/failure response.

## 6.3 Empty States

Empty states must be contextual.

| Context | Message | Action |
|---|---|---|
| Invoice list, no data | No invoices have been created in this branch. | Create Invoice, if permitted. |
| Invoice list, filtered empty | No invoices match the selected filters. | Clear Filters. |
| Payment list, no data | No payments have been recorded in this scope. | Record Payment, if permitted and context exists. |
| Refund queue | No refund requests are waiting in this queue. | None. |
| Receivables | No outstanding receivables match this scope. | Clear Filters. |
| Student receipts | You do not have any receipts yet. | Back to My Fees. |
| Corporate credit history | No credit validation history is available for this account. | None. |

## 6.4 Error Page States

### Access Denied

Message:

`You do not have permission to access this finance resource in the current branch context.`

Actions:

- Back to Finance Overview.
- Switch Branch, when user has other assigned branches.

### Resource Not Found

Use only when resource genuinely does not exist and branch-scope disclosure is safe.

### Service Failure

Message:

`Finance data could not be loaded. Retry the request. If the problem continues, provide the displayed support reference to the system administrator.`

Display correlation/support reference, not raw error details.

## 6.5 Permission-Based Element Hiding

The following principles are mandatory:

1. Navigation entry is hidden when the user lacks all permissions for the screen.
2. Primary action buttons are hidden when mutation permission is absent.
3. Controls are disabled rather than hidden only when the user benefits from understanding that an action exists but is blocked by current business state.
4. Permission denial is enforced again by the server.
5. Branch selector options show only authorized branches.
6. Consolidated scope appears only with explicit consolidated reporting permission.
7. Financial amount masking may be applied for narrowly scoped operational roles if policy grants status visibility but not amount visibility.
8. Audit tab is hidden without audit-read permission.
9. Credit rule edit controls are hidden without credit-manage permission.
10. Refund decision controls are hidden unless the user is an eligible approver and has decision permission.

### Recommended Permission-to-UI Mapping

| Permission | UI Capability |
|---|---|
| `finance.dashboard.read` | Finance Overview Dashboard. |
| `finance.invoice.read` | Invoice list/detail. |
| `finance.invoice.create` | Student/Corporate invoice creation actions. |
| `finance.installment.manage` | Create and activate installment plans. |
| `finance.payment.read` | Payment list/detail. |
| `finance.payment.record` | Record Payment action and workspace. |
| `finance.receipt.read` | Receipt viewer/download. |
| `finance.refund.request` | Refund Request action/form. |
| `finance.refund.approve` | Approve/Reject controls. |
| `finance.receivable.read` | Aging workspace. |
| `finance.credit.read` | Credit exposure views. |
| `finance.credit.manage` | Credit rule create/update/end-date controls. |
| `finance.export` | Export action/center. |
| `finance.audit.read` | Audit Explorer and Audit History tabs. |
| `finance.consolidated.read` | Consolidated branch scope option and authorized multi-branch reporting. |

Exact permission codes must be synchronized with IAM implementation and seeded Permission records; the UI must consume permissions dynamically rather than hardcoding role names.

---

# 7. Table Behavior Standards

## 7.1 Sorting

- Sorting is server-side.
- Sortable headers use explicit visual and accessible sort indicators.
- Clicking cycles: ascending → descending → unsorted, unless screen defines mandatory default ordering.
- Monetary values sort numerically, not lexically.
- Date/time values sort using stored timestamp/date semantics, not localized display string.
- Customer names sort by normalized searchable display name.

## 7.2 Filtering

- Filter controls are reflected in URL query parameters for Admin list screens.
- Sensitive identifiers must not be placed in URL when policy classifies them as protected.
- Filters submit after explicit Apply action in advanced drawer; lightweight search may debounce at 300–500 ms.
- Clear Filters resets to screen defaults.
- Active filter count badge appears on Advanced Filters button.

## 7.3 Paging

- Server-side cursor or offset paging may be used, but UI contract must provide stable page navigation.
- Standard page sizes: 25, 50, 100.
- Default: 25.
- Maximum: 100 for interactive grids.
- Result count must represent filtered authorized scope when calculation is supported.
- Changing sort/filter resets page to first page.

## 7.4 Bulk Selection

Bulk actions are allowed only where a concrete authorized operation exists.

- Selection is page-scoped by default.
- `Select all filtered results` must not appear unless backend explicitly supports safe server-side bulk processing.
- Invoice/payment/refund creation is never performed as a generic client-side loop over selected rows.

---

# 8. Bilingual English and Arabic Layout Rules

## 8.1 Direction Switching

### English

- root direction: `ltr`.
- navigation rail on left.
- labels align left.
- action groups progress left-to-right.
- monetary values align to the right edge of numeric columns.

### Arabic

- root direction: `rtl`.
- navigation rail moves to right.
- breadcrumbs mirror direction.
- labels align right.
- primary/secondary action ordering mirrors visually.
- drawers open from the opposite logical side.
- table first logical column begins at right.
- pagination arrows and chevrons mirror.

Use CSS logical properties such as:

```text
margin-inline-start
margin-inline-end
padding-inline-start
padding-inline-end
inset-inline-start
border-inline-start
text-align: start
```

Do not create separate hardcoded left/right CSS rules for every component.

## 8.2 Numeric Direction and Financial Readability

Even in Arabic RTL layouts:

- invoice numbers,
- receipt numbers,
- payment numbers,
- enrollment numbers,
- dates where numeric,
- decimal amounts,
- percentages,
- IBAN/reference-like identifiers

must render in directionally isolated spans where required so character order remains readable.

Use locale-aware number formatting, but never alter the underlying exact decimal value.

Currency display examples:

```text
English: OMR 1,250.000
Arabic: 1,250.000 ر.ع. or approved localized currency presentation
```

The exact OMR decimal precision and localized currency presentation must follow shared currency configuration; calculations always use fixed-precision decimal arithmetic.

## 8.3 Form Layout in RTL

- Field order mirrors at section level only when logical reading order benefits.
- Date range semantics remain From → To in meaning, with Arabic labels translated and visual placement mirrored.
- Mixed English identifiers inside Arabic forms remain directionally isolated.
- Validation icons appear at the logical inline end.
- Required markers remain adjacent to translated label.

## 8.4 Table Layout in RTL

- Column sequence is mirrored visually while preserving semantic ordering configured by the screen.
- Numeric values align at the visual end consistently.
- Action menu trigger appears at logical end of row.
- Sticky first logical column sticks to right in Arabic and left in English.
- Horizontal scroll shadow direction mirrors.

## 8.5 Charts in RTL

- Legend placement mirrors where layout permits.
- Time-series x-axis remains chronological from earlier to later according to charting convention and usability testing; do not reverse chronological data merely because the page is RTL.
- Tooltips use Arabic labels and localized numbers.
- Numeric axes remain unambiguous.

## 8.6 Bilingual Financial Documents

Invoice and receipt document preview must support:

1. English-only rendering when selected.
2. Arabic-only rendering when selected and approved.
3. Approved bilingual template rendering where ASTI policy requires both languages on one document.

Document rules:

- legal/business identifiers remain exact.
- translated labels do not translate reference values.
- course/customer names use localized source where available.
- fallback to source display name when localized value is absent, without inventing translation.
- GST timestamp presentation is consistent across languages.
- PDF and print output must preserve direction and font shaping.

---

# 9. Accessibility Requirements

1. All actions keyboard accessible.
2. Visible focus indicator on every interactive element.
3. Minimum target size 44 × 44 CSS px for primary touch actions where mobile use is supported.
4. Data table headers use semantic header associations.
5. Status changes announced with ARIA live regions where appropriate.
6. Error summaries link to invalid controls.
7. Charts require text/table alternatives for critical KPIs.
8. Color contrast meets WCAG AA target.
9. Status is never indicated by color alone.
10. Modal dialogs trap focus and restore focus to invoking element when closed.
11. Language switch updates `lang` and `dir` attributes correctly.
12. Screen readers must pronounce currency and status meaningfully through accessible labels.

---

# 10. Responsive Behavior Matrix

| Screen Type | Desktop | Tablet | Mobile |
|---|---|---|---|
| Dashboard | Full multi-panel grid | Two-column cards, stacked charts | Single-column cards and simplified charts |
| Data Grid | Full dense grid | Horizontal scroll + filter drawer | Card list for student portal; admin emergency read grid with horizontal scroll |
| Invoice Creation | Main + sticky summary | Stacked summary below form | Stacked sections; persistent bottom action bar |
| Payment Collection | Two-column | Stacked with summary first | Stacked; one primary submit action |
| Refund Approval | Review + decision side panel | Stacked review and decision | Read facts then sticky decision action area |
| Audit Explorer | Dense grid + drawer | Horizontal grid | Read-only event cards; advanced comparison may require larger viewport |

---

# 11. Screen-to-Functional-Requirement Traceability

| Screen ID | Primary FR Coverage |
|---|---|
| FBR-A-001 | FR-FBR-021, FR-FBR-022, FR-FBR-023, FR-FBR-028 |
| FBR-A-002 | FR-FBR-005, FR-FBR-021, FR-FBR-022, FR-FBR-023 |
| FBR-A-003 | FR-FBR-001, FR-FBR-003, FR-FBR-004, FR-FBR-027, FR-FBR-028, FR-FBR-029, FR-FBR-030 |
| FBR-A-004 | FR-FBR-002, FR-FBR-003, FR-FBR-004, FR-FBR-018, FR-FBR-019, FR-FBR-029 |
| FBR-A-005 | FR-FBR-005, FR-FBR-007, FR-FBR-010, FR-FBR-012, FR-FBR-020, FR-FBR-025, FR-FBR-030 |
| FBR-A-006 | FR-FBR-006, FR-FBR-007, FR-FBR-029 |
| FBR-A-007 | FR-FBR-008, FR-FBR-009, FR-FBR-010, FR-FBR-011, FR-FBR-012, FR-FBR-024, FR-FBR-025, FR-FBR-029 |
| FBR-A-008 | FR-FBR-008, FR-FBR-010, FR-FBR-011, FR-FBR-014, FR-FBR-016, FR-FBR-025 |
| FBR-A-009 | FR-FBR-010, FR-FBR-027, FR-FBR-028 |
| FBR-A-010 | FR-FBR-014, FR-FBR-015, FR-FBR-016, FR-FBR-025 |
| FBR-A-011 | FR-FBR-014, FR-FBR-025, FR-FBR-029 |
| FBR-A-012 | FR-FBR-015, FR-FBR-016, FR-FBR-025, FR-FBR-029 |
| FBR-A-013 | FR-FBR-012, FR-FBR-013, FR-FBR-021, FR-FBR-022, FR-FBR-023 |
| FBR-A-014 | FR-FBR-017, FR-FBR-019, FR-FBR-025, FR-FBR-029 |
| FBR-A-015 | FR-FBR-018, FR-FBR-019, FR-FBR-021, FR-FBR-022 |
| FBR-A-016 | FR-FBR-023, FR-FBR-028 |
| FBR-A-017 | FR-FBR-025, FR-FBR-028 |
| FBR-A-018 | FR-FBR-004, FR-FBR-010 |
| FBR-S-001 | FR-FBR-005, FR-FBR-020 |
| FBR-S-002 | FR-FBR-005, FR-FBR-007, FR-FBR-010, FR-FBR-020, FR-FBR-027 |
| FBR-S-003 | FR-FBR-006, FR-FBR-007, FR-FBR-020 |
| FBR-S-004 | FR-FBR-010, FR-FBR-027 |
| FBR-S-005 | FR-FBR-020 |

---

# 12. Final UI Acceptance Checklist

A Module 12 UI implementation is not complete until all of the following are verified:

- Every finance list query is server-side branch scoped.
- Consolidated scope never appears without explicit authorization.
- Student invoice creation cannot mutate Course Catalog pricing rules.
- Corporate invoice lines preserve enrollment and source-branch traceability.
- Monetary totals are recalculated and validated server-side.
- Payment submission is idempotent and protected against duplicate click/retry.
- Payment amount cannot exceed current collectible outstanding balance in the normal flow.
- Receipt view is available in approved English/Arabic presentation.
- Refund request and refund decision are separate permission-controlled workflows.
- Refund approval rechecks current refundable balance.
- Receivables aging cards reconcile with filtered grid totals.
- Corporate credit rule editing is effective-dated and audited.
- Trainer Portal does not expose finance-sensitive details.
- Student Portal APIs derive student identity from authenticated context, not client-supplied student identifiers.
- Loading, empty, error, access-denied, validation, and concurrency states are implemented for every relevant screen.
- English LTR and Arabic RTL layouts are tested for navigation, forms, tables, dialogs, drawers, pagination, numbers, and document previews.
- Permission-hidden UI controls are backed by server authorization.
- Finance audit history is immutable and sensitive fields are redacted.
- All displayed business times are rendered in GST, UTC+4, while storage follows platform timestamp standards.
- Posted financial transactions have no hard-delete UI action.

