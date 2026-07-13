## ADDED Requirements

### Requirement: corporate-sales-visits
- The sales service MUST expose an endpoint/method to register marketing visits.
- Input data MUST capture company snapshots, meeting summaries, and target training dates.
- Meeting dates and target training dates MUST NOT be set in the past.

#### Scenario: Logging a valid marketing visit
- GIVEN a valid corporate sales lead
- WHEN the counselor logs a visit with future meeting and training dates
- THEN the system MUST save the visit details and update the lead stage.

### Requirement: corporate-sales-followups
- The sales service MUST support scheduling follow-ups.
- Scheduled follow-up dates MUST be set in the future.
- Reminders SHALL be generated automatically for upcoming schedules.

#### Scenario: Scheduling a new follow-up
- GIVEN an active sales lead
- WHEN a future follow-up date is selected
- THEN the system MUST schedule the follow-up and trigger reminder tasks.

### Requirement: corporate-sales-costing
- The quotation service MUST compute costing sheets, calculating profit percentages against net selling rates.
- Profit percentages SHALL be computed as: `((sellingPrice - totalCost) / sellingPrice) * 100`.
- Quotations with profit margins below a 25.00% gross profit threshold MUST be routed to the Branch Manager queue for manual review, and MUST NOT be accepted or sent directly.

#### Scenario: Margin sub-threshold routing
- GIVEN a quotation costing configuration
- WHEN the calculated margin is less than 25.00%
- THEN the system MUST route the quotation to SubmittedForApproval status.

### Requirement: corporate-sales-revisions
- The quotation service MUST support quotation revisions when details are updated.
- Each revision MUST record the previous quotation state in a `QuotationRevision` JSON snapshot before updating active fields.
- Revisions MUST increment the revision counter and reset approval statuses to `Draft`.

#### Scenario: Recording quotation revision
- GIVEN an existing quotation
- WHEN the line items are updated
- THEN the system MUST capture a QuotationRevision snapshot and reset the status to Draft.

### Requirement: corporate-sales-confirmations
- The sales order service MUST confirm orders when B2B clients accept proposals.
- Confirmation MUST require an uploaded LPO document ID or email reference text.
- Order confirmations MUST transactionalize writing a `SalesOrderConfirmed` outbox event log inside the same transaction block as the state updates.

#### Scenario: Confirming won sales order
- GIVEN an Approved quotation
- WHEN the LPO document reference is uploaded
- THEN the system MUST confirm the SalesOrder and publish the SalesOrderConfirmed outbox event.
