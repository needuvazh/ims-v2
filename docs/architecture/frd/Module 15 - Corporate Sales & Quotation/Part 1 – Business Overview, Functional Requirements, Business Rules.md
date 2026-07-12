# Part 1 – Business Overview, Functional Requirements, Business Rules

## Module 15 – Corporate Sales & Quotation

---

# 1. Business Overview & Context

The B2B sales lifecycle of the Al Saud Training Institute (ASTI) begins with identifying and engaging corporate clients. The commercial progress of these engagements is co-managed by the sales force and management to ensure that:
1. Every client interaction (marketing visits, follow-up meetings) is documented.
2. Every commercial proposal is priced accurately and contains all required items (fees, trainer charges, certifications, VAT).
3. The profit margin of every quotation is computed dynamically using direct and indirect costs before it is presented to a client.
4. Internal authorizations prevent under-priced or high-value contracts from being issued without management sign-off.
5. Confirmed client agreements (with official LPOs) are handed off to the corporate training delivery team.

Module 15 (Corporate Sales & Quotation) manages this commercial funnel. By separating this module from Module 14 (Corporate Training Management), ASTI ensures that training coordinators do not get bogged down by sales pipeline workflows, and sales representatives do not directly mutate training execution or student records.

---

# 2. Business Benefits

- **Traceable B2B Funnel**: Full visibility from initial prospect visit to won sales order.
- **Granular Profitability Safeguard**: The costing sheet ensures ASTI does not run courses below acceptable margins.
- **Automated Alerts**: Reminders prevent sales representatives from missing critical follow-ups.
- **Optimized Handoffs**: Direct translation of won sales order details into training contracts, eliminating duplicate manual entries.

---

# 3. Functional Requirements Specifications

## FR-CSQ-001: Log Marketing Visit
- **Description & Actors**: Allows a Marketing/Sales Executive to record the outcomes and snapshots of a B2B visit.
- **Actors**: Marketing Executive, IAM Authorization Service.
- **Preconditions**:
  1. User is authenticated.
  2. User has `corporateSales.visit.create` permission.
  3. User is operating within their assigned branch scope.
- **Inputs**:
  - `corporateAccountId` (links to existing corporate client or prospect)
  - `contactPersonName` (text snapshot)
  - `contactNumber` (text snapshot)
  - `email` (text snapshot)
  - `meetingDate` (date)
  - `discussionNotes` (text)
  - `coursesDiscussed` (text snapshot)
  - `expectedCandidates` (integer)
  - `expectedTrainingDate` (date)
- **Processing Steps**:
  1. Verify user's branch-level authorization.
  2. Validate that the expected candidates count is a positive integer.
  3. Save the `CorporateMarketingVisit` record.
  4. Auto-transition the parent `CorporateSalesLead` stage to `VisitCompleted` if not already advanced.
- **Outputs & Postconditions**:
  - `CorporateMarketingVisit` record created.
  - Parent sales lead stage updated.
  - Audit log written.
- **Priority**: Must Have

---

## FR-CSQ-002: Create Sales Follow-Up Task
- **Description & Actors**: Automatically or manually schedules a follow-up action for a lead, including system alerts.
- **Actors**: Marketing Executive, System Scheduler, Communication Service.
- **Preconditions**:
  1. Parent `CorporateSalesLead` is active and in the user's assigned branch.
  2. User has `corporateSales.followUp.create` permission.
- **Inputs**:
  - `corporateSalesLeadId`
  - `followUpDate` (date/time)
  - `followUpType` (e.g. Call, Email, Meeting)
  - `notes` (text)
- **Processing Steps**:
  1. Validate that `followUpDate` is in the future.
  2. Create the `CorporateSalesFollowUp` record in `SCHEDULED` status.
  3. Schedule a system notification to run on the target date.
- **Outputs & Postconditions**:
  - `CorporateSalesFollowUp` created.
  - Notification scheduled via the outbox table.
- **Priority**: Must Have

---

## FR-CSQ-003: Create B2B Quotation
- **Description & Actors**: Generates a version-controlled B2B quotation for a corporate account.
- **Actors**: Sales Manager, Course Catalog service.
- **Preconditions**:
  1. Corporate account is active.
  2. User has `corporateSales.quotation.create` permission.
- **Inputs**:
  - `corporateAccountId`
  - `validUntil` (date)
  - `lineItems`: Array of:
    - `courseId` (UUID)
    - `quantity` (number of participants)
    - `unitPrice` (OMR)
    - `discountAmount` (OMR)
- **Processing Steps**:
  1. Resolve course durations and default catalog prices from the Course Catalog context.
  2. Verify that `validUntil` date is at least 7 days after the creation date.
  3. Calculate subtotal, discounts, tax (5% Omani VAT), and total amount.
  4. Create the `Quotation` in `DRAFT` status with revision version set to `1`.
- **Outputs & Postconditions**:
  - `Quotation` and `QuotationLineItem` records saved.
- **Priority**: Must Have

---

## FR-CSQ-004: Calculate Costing & Margin Sheet
- **Description & Actors**: Allows the Sales Manager to enter estimated costs and calculate quotation profitability.
- **Actors**: Sales Manager.
- **Preconditions**:
  1. `Quotation` is in `DRAFT` status.
  2. User has `corporateSales.costing.update` permission.
- **Inputs**:
  - Direct cost items: `trainerCost`, `venueCost`, `equipmentCost`, `printingCost`, `certificateCost`, `travelCost`, `accommodationCost`, `foodCost`, `vehicleCost`.
  - Indirect cost items: `administrationCost`, `marketingCost`, `miscellaneousCost`.
- **Processing Steps**:
  1. Retrieve total quotation selling price (excluding VAT).
  2. Calculate Total Direct Cost:
     $$\text{Total Direct Cost} = \text{trainerCost} + \text{venueCost} + \text{equipmentCost} + \text{printingCost} + \text{certificateCost} + \text{travelCost} + \text{accommodationCost} + \text{foodCost} + \text{vehicleCost}$$
  3. Calculate Total Indirect Cost:
     $$\text{Total Indirect Cost} = \text{administrationCost} + \text{marketingCost} + \text{miscellaneousCost}$$
  4. Calculate Total Cost:
     $$\text{Total Cost} = \text{Total Direct Cost} + \text{Total Indirect Cost}$$
  5. Calculate Profit Amount:
     $$\text{Profit} = \text{Selling Price} - \text{Total Cost}$$
  6. Calculate Profit Percentage:
     $$\text{Profit \%} = \left( \frac{\text{Profit}}{\text{Selling Price}} \right) \times 100$$
  7. Save or update the `QuotationCostingSheet` record.
- **Outputs & Postconditions**:
  - `QuotationCostingSheet` updated and linked to the quotation.
- **Priority**: Must Have

---

## FR-CSQ-005: Submit Quotation for Internal Approval
- **Description & Actors**: Submits a quote for manager approval if it fails margin thresholds or exceeds value limits.
- **Actors**: Sales Manager, Branch Manager, Approver.
- **Preconditions**:
  1. Quotation has a calculated costing sheet.
  2. Quotation status is `DRAFT`.
  3. User has `corporateSales.quotation.submit` permission.
- **Inputs**:
  - `quotationId`
- **Processing Steps**:
  1. Check calculated Profit % from the costing sheet.
  2. If Profit % is below the **Minimum Margin Threshold (25%)** OR total quotation value exceeds **OMR 5,000**:
     - Route the quotation to `SubmittedForApproval` status.
     - Create a `QuotationApproval` log entry.
     - Notify the assigned Branch Manager via the outbox table.
  3. If parameters are within safe bounds:
     - Auto-transition status to `APPROVED` directly.
- **Outputs & Postconditions**:
  - Quotation status transitioned.
  - Approval queue updated.
- **Priority**: Must Have

---

## FR-CSQ-006: quotation Revision History
- **Description & Actors**: Saves a snapshot of a quote before applying edits to ensure full revision audit.
- **Actors**: Sales Manager.
- **Preconditions**:
  1. Quotation status is `DRAFT` or `Rejected` or `ReturnedForRevision`.
- **Inputs**:
  - `quotationId`, edit parameters.
- **Processing Steps**:
  1. Load existing quotation data, costing sheet, and line items.
  2. Compile a JSON snapshot of the existing state.
  3. Write a new `QuotationRevision` record storing the snapshot and reason.
  4. Apply the new edits, increment the version, and set the status to `DRAFT`.
- **Outputs & Postconditions**:
  - Revision history snapshot saved.
- **Priority**: Should Have

---

## FR-CSQ-007: Confirm Order & Upload LPO
- **Description & Actors**: Confirms the customer's acceptance of a quote by uploading their Local Purchase Order (LPO).
- **Actors**: Sales Manager.
- **Preconditions**:
  1. Quotation status is `Sent`.
  2. User has `corporateSales.salesOrder.confirm` permission.
- **Inputs**:
  - `quotationId`
  - `LpoDocumentId` (Document ID from Document Management)
  - `emailConfirmationId` (optional)
- **Processing Steps**:
  1. Transition the Quotation status to `Accepted`.
  2. Create a `SalesOrder` record in `Confirmed` status.
  3. Link the LPO document to the sales order.
  4. Transition `CorporateSalesLead.stage` to `Confirmed`.
  5. Publish a `SalesOrderConfirmed` event to the Transactional Outbox table containing the sales order ID, corporate account, contract specifications, and LPO details.
- **Outputs & Postconditions**:
  - `SalesOrder` created.
  - `SalesOrderConfirmed` outbox event written.
- **Priority**: Must Have

---

# 4. Business Rules Matrix

| Rule ID | Rule | Description | Owning Context | Status | Required Action / Checks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BR-CSQ-001** | Minimum Margin Guard | Quotations with an estimated profit margin below 25% must be locked and require Branch Manager approval. | Corporate Sales | Enforced | Validate Profit % in `QuotationCostingSheet` before transition to `Sent`. |
| **BR-CSQ-002** | Omani VAT Default | Standard VAT of 5% must be applied to the subtotal of all quotation line items during calculation. | Corporate Sales | Enforced | default to 5% VAT rate. Finance owns final receipt taxation. |
| **BR-CSQ-003** | LPO Mandatory for Order | A won opportunity must not transition to `SalesOrder` without an uploaded LPO document or email confirmation reference. | Corporate Sales | Enforced | Verify `LpoDocumentId` is not null. |
| **BR-CSQ-004** | Draft Edit Lock | A quotation that is in `SubmittedForApproval` or `Approved` status cannot be edited. It must be returned to `Draft` or revised, generating a revision history record. | Corporate Sales | Enforced | Prevent mutations in API route when status != DRAFT. |
| **BR-CSQ-005** | Pre-enrollment Branch Scope | A sales representative can only view and manage leads, visits, and quotations belonging to their assigned branch. | IAM / Corporate Sales | Enforced | Enforce `branchId` filters in write paths and read paths. |

---

# 5. Cross-Module Dependencies Mapping

- **Document Management**: CSQ calls the Document service to save and store LPO PDFs and email confirmations.
- **Course Catalog**: CSQ queries Course Catalog read models to retrieve default pricing, hours, and descriptions during line item editing.
- **Corporate Training (Module 14)**: CSQ hands off delivery metadata by publishing the `SalesOrderConfirmed` outbox event.
- **Finance**: CSQ costing models estimate profit margins, but Finance remains the authoritative owner of tax invoice generation and billing ledger states.

---

# 6. DDD & ER Alignment Verification

- **Bounded Context Check**: The proposed entities (`CorporateSalesLead`, `Quotation`, `QuotationLineItem`, `SalesOrder`, `CorporateMarketingVisit`, `CorporateSalesFollowUp`, `QuotationRevision`, `QuotationCostingSheet`) are completely separated from CTM-owned tables. Write actions do not cross bounds.
- **Enrollment-Centric Model**: Sales orders only represent commercial agreements; actual students are enrolled downstream in Admissions.
- **Identity Reuse**: Contacts and visits resolve and link to existing `Person` identities using standard reference keys.
- **Branch Scope**: Strict branch scope is solved by adding `branchId` directly to `CorporateSalesLead` and related entities.
