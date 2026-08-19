## ADDED Requirements

### Requirement: B2B Billing Request Milestone State Machine
The system SHALL support requesting billing on corporate participant enrollments. The request MUST transition the enrollment's `billingStatus` from `NotRequested` to `Requested`.

#### Scenario: Requesting billing for group enrollments
- **WHEN** the coordinator selects 3 enrolled participants and clicks "Request Invoicing"
- **THEN** the system SHALL transactionally transition the B2B `billingStatus` of those enrollments to `Requested`.

### Requirement: Read-Only Invoices & outstanding Dashboard Projections
The system SHALL display consolidated read-only stats inside the B2B Cockpit loaded from the Finance module.

#### Scenario: populating receivables widgets
- **WHEN** the user views the Al Saud corporate training cockpit profile details
- **THEN** the system SHALL load and sum linked invoice balances, showing Total Receivables, Total Paid Collections, and Net Outstanding.
