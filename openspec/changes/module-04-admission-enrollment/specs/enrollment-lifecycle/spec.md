## ADDED Requirements

### Requirement: Enrollment Creation from Approved Admission
The system SHALL allow an authorized admissions user to create an enrollment only from an approved admission record.

#### Scenario: Create enrollment from approved admission
- **WHEN** a valid approved admission, course, and batch are supplied
- **THEN** the system SHALL create an enrollment linked to the student profile, admission, course, batch, and branch.

#### Scenario: Reject enrollment from unapproved admission
- **WHEN** an enrollment creation request references an admission that is not approved
- **THEN** the system SHALL reject the request with a validation error.

---

### Requirement: Enrollment Status Transitions
The system SHALL support enrollment status transitions for approval, confirmation, cancellation, and completion within the enrollment lifecycle.

#### Scenario: Confirm an approved enrollment
- **WHEN** an authorized user confirms an approved enrollment and the required seat and financial checks pass
- **THEN** the system SHALL mark the enrollment as confirmed and persist the confirmation timestamp.

#### Scenario: Cancel an enrollment and release the seat
- **WHEN** an authorized user cancels an active enrollment
- **THEN** the system SHALL mark the enrollment as cancelled, release the seat from the batch, and emit the downstream cancellation event.

---

### Requirement: Enrollment Screen Visibility
The system SHALL show enrollment status, pricing context, and linked records on admin enrollment screens.

#### Scenario: Render enrollment detail screen
- **WHEN** an authorized user opens an enrollment detail page
- **THEN** the system SHALL show the enrollment number, status, pricing summary, and linked admission and batch references.

#### Scenario: Reject unauthorized enrollment access
- **WHEN** a user without branch access requests an enrollment from another branch
- **THEN** the system SHALL deny access with `403 Forbidden`.
