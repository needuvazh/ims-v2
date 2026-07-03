# id-card-management Specification

## Purpose
TBD - created by syncing change module-05-student-management. Update Purpose after archive.

## Requirements

### Requirement: REQ-SM-IDC-001 — Initial ID Card Issuance
The system SHALL support issuing physical student ID cards. The ID card number MUST be globally unique and logged in the history database.

#### Scenario: Issue ID card for the first time
- **WHEN** an administrator issues an ID card with card number "IDC-001" for a student
- **THEN** the student profile's `idCardIssued` becomes true
- **And** `idCardNumber` is updated to "IDC-001"
- **And** a row is inserted in `StudentIdCardHistory` auditing the issue

---

### Requirement: REQ-SM-IDC-002 — ID Card Reissue Tracker
When reissuing a card, the system SHALL increment the reissue counter, capture the reason, log the event, and deactivate the old card number.

#### Scenario: Reissue ID card with replacement reason
- **WHEN** an admin reissues a card with new card number "IDC-002" and reason "Lost card"
- **THEN** the active card number is updated to "IDC-002"
- **And** the print count/reissue log records the replacement history details
