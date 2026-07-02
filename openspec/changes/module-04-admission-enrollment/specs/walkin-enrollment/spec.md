## ADDED Requirements

### Requirement: Walk-In Enrollment Creation
The system SHALL allow the admin portal to create a same-day walk-in enrollment using the shared Enrollment lifecycle.

#### Scenario: Create walk-in enrollment
- **WHEN** an authorized user submits a walk-in enrollment request with person, course, batch, branch, and payment context
- **THEN** the system SHALL create the enrollment as a walk-in flow and return the enrollment details.

#### Scenario: Reject walk-in enrollment outside branch scope
- **WHEN** a user attempts to create a walk-in enrollment for a branch they cannot access
- **THEN** the system SHALL reject the request with `403 Forbidden`.

---

### Requirement: Walk-In Payment and Completion Flow
The system SHALL support walk-in payment recording and same-day completion checks through the shared enrollment lifecycle.

#### Scenario: Record walk-in payment
- **WHEN** an authorized user records a walk-in payment for an existing walk-in enrollment
- **THEN** the system SHALL persist the payment reference and update the enrollment payment state.

#### Scenario: Mark walk-in completion eligible
- **WHEN** a walk-in enrollment satisfies the required payment and completion checks
- **THEN** the system SHALL mark the walk-in flow as eligible for completion and downstream certificate review.

---

### Requirement: Walk-In Admin-Only Phase 1 Access
The system SHALL expose walk-in enrollment entry points only in the admin portal during Phase 1 and reserve future student portal entry points without enabling them.

#### Scenario: Hide walk-in entry from future student portal
- **WHEN** a future student portal requests walk-in enrollment navigation
- **THEN** the system SHALL not expose the action in Phase 1 and SHALL keep the workflow admin-only.

#### Scenario: Show walk-in entry in admin portal
- **WHEN** an authorized admin user opens the admissions and enrollment area
- **THEN** the system SHALL expose the walk-in enrollment entry point.
