# Part 9 – BDD Acceptance Criteria and Test Scenarios

## Module 15 – Corporate Sales & Quotation

---

# 1. BDD Acceptance Test Scenarios (Gherkin Format)

This section maps B2B commercial pipelines into Gherkin BDD test scenarios to guide QA automation and unit testing.

## 1.1 Pipeline Logging & Visit Validation

### Scenario: Successfully recording a marketing visit
- **Given** a sales executive is authenticated with `corporateSales.visit.create` permission
- **And** they are operating inside their authorized branch context: `Muscat`
- **When** they submit a visit payload with:
  | Field | Value |
  | :--- | :--- |
  | `corporateAccountId` | "11111111-2222-3333-4444-555555555555" |
  | `contactPersonName` | "Ahmed Al-Hashmi" |
  | `contactNumber` | "+96899998888" |
  | `email` | "ahmed@pdo.co.om" |
  | `meetingDate` | "2026-07-12" |
  | `discussionNotes` | "Discussed basic and advanced chemical safety courses." |
  | `expectedCandidates` | 15 |
  | `expectedTrainingDate` | "2026-08-01" |
- **Then** the database inserts a `CorporateMarketingVisit` record linked to the Muscat branch
- **And** the parent `CorporateSalesLead.stage` transitions to `VisitCompleted`
- **And** an audit log is committed with details of the creator.

### Scenario: Rejects visits logged with a future date
- **Given** a sales executive is on the visit log page
- **When** they submit a meeting date set to tomorrow's date
- **Then** the validation layer rejects the submission with error `ERR_CSQ_INVALID_CLOSE_DATE`
- **And** no database transaction is committed.

---

## 1.2 Profit Costing & Margin Approval Guards

### Scenario: Submitting a low-margin quotation locks the record and triggers approval routing
- **Given** a draft quotation exists with total line item value OMR 2,000
- **And** a costing sheet contains OMR 1,600 in direct trainer costs and OMR 100 in indirect costs
- **When** the Sales Manager submits the quotation for validation
- **Then** the system calculates:
  | Calculated Metric | Value |
  | :--- | :--- |
  | Total Costs | OMR 1,700 |
  | Profit Amount | OMR 300 |
  | Profit Percentage | 15.00% |
- **And** because 15.00% is below the 25.00% threshold, the quotation status transitions to `SubmittedForApproval`
- **And** edit routes for this quotation return `409 Conflict` (`ERR_CSQ_QUOTE_LOCKED`)
- **And** a `QuotationSubmittedForApproval` outbox record is written.

### Scenario: Auto-approving high-margin quotations
- **Given** a draft quotation exists with total line item value OMR 2,000
- **And** a costing sheet contains OMR 1,000 in total costs
- **When** the Sales Manager submits the quotation for validation
- **Then** the system calculates a profit margin of 50.00%
- **And** because 50.00% is >= 25.00% and total value <= OMR 5,000, status is set directly to `Approved`
- **And** no approval queue entry is created.

---

## 1.3 Pre-enrollment Branch Scope Scenarios

### Scenario: Prevent unauthorized cross-branch read queries
- **Given** a Branch Manager is authenticated and assigned ONLY to the Sohar branch
- **When** they request the list of active sales leads: `GET /api/admin/corporate-sales/leads`
- **Then** the system checks their authorized branch claims
- **And** returns a list where all rows satisfy `branchId = Sohar`
- **And** zero rows containing `branchId = Muscat` are returned.

### Scenario: Prevent cross-branch updates
- **Given** a Sales Executive assigned ONLY to the Salalah branch attempts to log a visit
- **When** they submit a visit payload with `branchId` set to Sohar
- **Then** the API returns `403 Forbidden` (`ERR_CSQ_UNAUTHORIZED_BRANCH`)
- **And** the transaction is rolled back.

---

## 1.4 Revision Version Control Scenarios

### Scenario: Version history snapshot creation on approved quotation edit
- **Given** a quotation exists in `Approved` status with version `1`
- **When** the Sales Manager triggers a revision with reason: "Client requested 10% unit discount"
- **Then** the system serializes all current lines and costing details into `snapshotJson`
- **And** inserts a `QuotationRevision` record linked to version `1`
- **And** increments the Quotation version column to `2`
- **And** resets the Quotation status to `Draft`.

---

## 1.5 Order Handoff & Outbox Scenarios

### Scenario: Sales Order confirmed triggers outbox write
- **Given** a quotation is in `Sent` status
- **When** the Sales Manager uploads a valid LPO file link and confirms the order
- **Then** the system creates a `SalesOrder` record in `Confirmed` status
- **And** writes a `SalesOrderConfirmed` event to the `OutboxEvent` table in the same transaction
- **And** upon transaction success, the downstream listener reads the outbox to instantiate project records in Corporate Training.

---

## 1.6 DDD Context Boundaries Scenarios

### Scenario: Sales cannot mutate Finance invoicing tables directly
- **Given** a Sales Manager is performing an order confirmation workflow
- **When** they invoke the confirm endpoint
- **Then** the CSQ code must NOT execute any direct writes to `Invoice` or `Receivable` database tables
- **And** must limit its writes to `SalesOrder`, `Quotation`, and the `OutboxEvent` table.
