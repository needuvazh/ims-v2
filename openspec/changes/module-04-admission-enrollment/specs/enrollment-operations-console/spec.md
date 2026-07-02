## ADDED Requirements

### Requirement: Enrollment Operations Console View
The system SHALL provide an admin enrollment console that lists lifecycle state, pricing snapshot, and branch-scoped enrollment records.

#### Scenario: Show enrollment operations list
- **WHEN** an authorized user opens the enrollment operations console
- **THEN** the system SHALL show enrollment number, student profile, course, batch, branch, status, and pricing summary.

#### Scenario: Filter console by branch scope
- **WHEN** the console is opened by a branch-scoped user
- **THEN** the system SHALL restrict the list to the active branch unless global visibility is granted.

---

### Requirement: Enrollment Lifecycle Actions from Console
The system SHALL allow the console to invoke submit, approve, cancel, and drop actions on the enrollment aggregate.

#### Scenario: Submit an enrollment from the console
- **WHEN** a registrar submits a draft enrollment from the console
- **THEN** the system SHALL transition the enrollment to Submitted and record the audit entry.

#### Scenario: Approve, cancel, or drop from the console
- **WHEN** a permitted user invokes approve, cancel, or drop from the console
- **THEN** the system SHALL execute the enrollment lifecycle transition, enforce guards, and reflect the new state in the console.

---

### Requirement: Enrollment Console State Feedback
The system SHALL show status feedback and validation failures inline so the user can complete lifecycle actions without guessing the outcome.

#### Scenario: Show validation failures inline
- **WHEN** a console action fails validation
- **THEN** the system SHALL surface the error code and the reason in the console response state.

#### Scenario: Show confirmation for successful transitions
- **WHEN** a console action succeeds
- **THEN** the system SHALL update the visible enrollment state and show the resulting timestamp or reference number when available.
