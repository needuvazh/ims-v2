## ADDED Requirements

### Requirement: Admission-Triggered Student Identity Provisioning

The system SHALL trigger asynchronous student identity card generation after an admission is approved.

#### Scenario: Queue identity card generation on approval

- **WHEN** an admission is approved successfully
- **THEN** the system SHALL enqueue an identity card generation request and persist the corresponding audit trail.

#### Scenario: Generate within the operational SLA

- **WHEN** the identity card job is processed
- **THEN** the system SHALL generate the digital ID card artifact within the module SLA window and mark the card as issued.

---

### Requirement: Student ID Card Visibility and Download

The system SHALL expose student ID card status and allow authorized users to download the generated artifact from the student profile dashboard.

#### Scenario: Show ID card status on student profile

- **WHEN** an authorized user opens a student profile dashboard
- **THEN** the system SHALL show whether the ID card is pending, issued, expired, or reissued.

#### Scenario: Download generated ID card

- **WHEN** an authorized user requests the issued ID card
- **THEN** the system SHALL return the generated card artifact or a controlled download reference.

---

### Requirement: ID Card Reissue Control

The system SHALL support ID card reissue only for authorized users and SHALL audit the action.

#### Scenario: Reject reissue without permission

- **WHEN** a user without `idcard.reissue` permission requests reissue
- **THEN** the system SHALL reject the request with `403 Forbidden`.

#### Scenario: Record reissue with audit trail

- **WHEN** a permitted user reissues an ID card
- **THEN** the system SHALL generate a new card reference, preserve the prior history, and write an audit entry.
