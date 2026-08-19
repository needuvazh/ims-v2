## ADDED Requirements

### Requirement: Corporate Account Creation Verification
The system SHALL allow an authorized CTM Administrator to create a corporate account by providing a company name, unique account code, billing cycle, branch ID, and credit control rules (credit limit and block flag). The account code MUST be verified for uniqueness before database insertion.

#### Scenario: Registering a unique corporate account
- **WHEN** the user submits a new corporate account form with name "ASTI Tech LLC", code "ACC-ASTITECH", branch ID "Muscat", and credit limit 5000 OMR
- **THEN** the system SHALL validate that "ACC-ASTITECH" does not already exist, write a new CorporateAccount record, and write an audit event log.

### Requirement: Credit Exceedance Check
The system SHALL validate the client's available credit balance during B2B candidate enrollment. If the projected outstanding amount exceeds the credit limit and the block limit flag is set to TRUE, the enrollment MUST be blocked.

#### Scenario: Blocking enrollment when credit is exceeded
- **WHEN** a coordinator attempts to enroll a candidate for a course costing 500 OMR under an account with available credit of 300 OMR and block limit flag is set to TRUE
- **THEN** the system SHALL reject the enrollment with error "CREDIT_LIMIT_EXCEEDED" and block database write operations.

### Requirement: Account 360-Degree Projections
The corporate account detail cockpit page SHALL render read-only summaries of linked corporate contracts, active coordinators, and financial invoice statuses directly fetched from the Finance schema projections.

#### Scenario: Displaying invoice summaries in cockpit tab
- **WHEN** an authorized administrator opens the corporate account details tab under "Invoices & Payments"
- **THEN** the system SHALL load and display all invoices matching the corporate account ID, including outstanding balances and payment statuses (e.g. Paid, Partially Paid, Overdue).
