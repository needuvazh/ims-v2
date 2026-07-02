## ADDED Requirements

### Requirement: Student ID Card Management
The system SHALL manage the student ID card lifecycle for approved admissions and expose the card status on the student profile dashboard.

#### Scenario: Show ID card status after admission approval
- **WHEN** an admission is approved
- **THEN** the system SHALL show the ID card as pending generation until the asynchronous provisioning completes.

#### Scenario: Show issued or reissued card details
- **WHEN** an ID card has been generated or reissued
- **THEN** the system SHALL show the current card number, issue status, and last update timestamp.

---

### Requirement: Student ID Card Download and Reissue
The system SHALL allow authorized users to download the current ID card and to reissue it when permitted.

#### Scenario: Download generated card
- **WHEN** a permitted user requests the card download action
- **THEN** the system SHALL return the generated card artifact or a controlled download reference.

#### Scenario: Reissue card with permission
- **WHEN** a permitted user requests card reissue
- **THEN** the system SHALL generate a new card reference, preserve prior history, and audit the change.

---

### Requirement: Student ID Card Permission Enforcement
The system SHALL enforce the `idcard.reissue` permission and branch scope on card operations.

#### Scenario: Reject reissue without permission
- **WHEN** a user without `idcard.reissue` attempts a reissue
- **THEN** the system SHALL return `403 Forbidden`.

#### Scenario: Reject card access outside branch scope
- **WHEN** a user tries to access card data for another branch
- **THEN** the system SHALL reject the request with `403 Forbidden`.
