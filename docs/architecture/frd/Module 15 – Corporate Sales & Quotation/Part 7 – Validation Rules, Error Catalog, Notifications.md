# Part 7 – Validation Rules, Error Catalog, Notifications

## Module 15 – Corporate Sales & Quotation

---

# 1. Validation Rules Matrix

The module enforces three levels of validations: **Field-Level**, **Business-Level**, and **Workflow/State-Level**.

## 1.1 Field-Level Validations (Zod Schemas)
- **Email Snapshots**: Checked against standard email regex format (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), max length 320 chars.
- **Phone Snapshots**: String format, min 8 digits, max 32 digits, allows leading `+`.
- **Expected Candidates**: Must be a positive integer >= 1.
- **Amounts (Prices, Discounts)**: Must be decimals, >= 0.000, and restricted to 3 decimal places.

## 1.2 Business-Level Validations
- **Quotation Validity Date**: `validUntil` date must be at least 7 days in the future relative to the quotation creation date.
- **Costing Profit % Limit**: Gross margin must not evaluate below 0% (loss-making quote). The system prevents saving costing sheets where `profitPercentage < 0`.
- **LPO Linkage**: Confirming a Sales Order requires a valid, pre-existing document ID matching an active document upload in the Document Management context.

## 1.3 Workflow/State-Level Validations
- **Revision Locking**: Revisions cannot be requested on a quote that is currently in `Draft` or `SubmittedForApproval` status.
- **Mutation Lock**: No line items or costing parameters can be updated if the quotation status is `Approved`, `Sent`, or `Accepted`.
- **Assigned Owner Matching**: Only the designated `salesOwnerId` or a branch manager can update a lead's stage.

---

# 2. Error Catalog

The following catalog lists standard HTTP error status codes and custom `ERR_CSQ_*` keys returned by the APIs:

| HTTP Status | Custom Error Code | Cause | User-Facing Resolution Message |
| :--- | :--- | :--- | :--- |
| `400 Bad Request` | `ERR_CSQ_INVALID_CLOSE_DATE` | Close date is in the past. | "Please select a date in the future for the expected close date." |
| `400 Bad Request` | `ERR_CSQ_INVALID_VALIDITY` | validity is less than 7 days. | "The quotation validity date must be at least 7 days from today." |
| `400 Bad Request` | `ERR_CSQ_NEGATIVE_MARGIN` | Total direct/indirect costs exceed selling price. | "This costing sheet results in a negative margin. Please adjust costs or selling prices." |
| `403 Forbidden` | `ERR_CSQ_UNAUTHORIZED_BRANCH`| Attempting to read/write lead in unauthorized branch. | "You do not have permission to access sales data for this branch." |
| `403 Forbidden` | `ERR_CSQ_APPROVAL_REQUIRED` | Attempting to send quotation with <25% margin. | "This quotation requires Branch Manager approval before it can be sent to the client." |
| `409 Conflict` | `ERR_CSQ_QUOTE_LOCKED` | Modifying quote in active/approved state. | "This quotation is approved or sent and cannot be modified. Please trigger a revision instead." |
| `409 Conflict` | `ERR_CSQ_LPO_REQUIRED` | Confirming order without an LPO reference. | "An uploaded LPO document is required to confirm this sales order." |

---

# 3. Notification Events

All asynchronous notifications are scheduled by writing to the `OutboxEvent` table during database transactions. A background job runner executes delivery.

## 3.1 Outbox Event Inventory

### Event: `QuotationSubmittedForApproval`
- **Trigger**: Quote Profit Margin < 25% on submission.
- **Payload**:
  ```json
  {
    "quotationId": "00000000-4444-5555-6666-777777777777",
    "quotationNumber": "QT-CSQ-2026-0001",
    "branchId": "11111111-2222-3333-4444-555555555555",
    "margin": 18.50,
    "value": 3500.000,
    "salesManagerName": "Ahmed Al-Mamari"
  }
  ```
- **Subscriber Action**: Resolves the Branch Manager's user ID and dispatches an internal dashboard alert and email:
  - *Subject*: `Action Required: Low-Margin Quotation Pending Approval - QT-CSQ-2026-0001`
  - *Body*: `Dear Branch Manager, Quotation QT-CSQ-2026-0001 has been submitted by Ahmed Al-Mamari with a profit margin of 18.50%, which requires your authorization. Review costing: /admin/corporate-sales/approvals`

### Event: `FollowUpReminderTriggered`
- **Trigger**: Reaching 08:00 AM on a scheduled follow-up date.
- **Payload**:
  ```json
  {
    "followUpId": "99999999-3333-4444-5555-666666666666",
    "assignedToUserId": "33333333-4444-5555-6666-777777777777",
    "leadCode": "LD-CSQ-2026-0012",
    "companyName": "OQ Group"
  }
  ```
- **Subscriber Action**: Sends a dashboard toast notification to the Sales Executive:
  - *Message*: `Follow-up due today with OQ Group for Lead LD-CSQ-2026-0012.`

### Event: `SalesOrderHandoffTriggered`
- **Trigger**: Sales Order status transitioned to `Confirmed`.
- **Payload**:
  ```json
  {
    "salesOrderId": "cccccccc-6666-7777-8888-999999999999",
    "corporateAccountId": "11111111-2222-3333-4444-555555555555",
    "quotationId": "00000000-4444-5555-6666-777777777777",
    "LpoDocumentId": "55555555-6666-7777-8888-999999999999",
    "branchId": "11111111-2222-3333-4444-555555555555"
  }
  ```
- **Subscriber Action**: Calls CTM (Module 14) event handlers to instantiate the corresponding B2B project, contract, and account parameters.
