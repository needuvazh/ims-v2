## ADDED Requirements

### Requirement: Admission Draft Creation
The system SHALL allow an authorized admissions user to create an admission draft for a selected person or student profile within the active branch.

#### Scenario: Create admission draft from admin screen
- **WHEN** an authorized user submits an admission intake request with branch, person, and course context
- **THEN** the system SHALL create an admission draft, assign the active branch, and return the draft details for review.

#### Scenario: Prevent duplicate active admission in same branch
- **WHEN** a user attempts to create a new admission draft for a person who already has an active admission in the same branch
- **THEN** the system SHALL reject the request with a validation error.

---

### Requirement: Admission Submission and Review
The system SHALL support moving an admission draft into submitted and approved states through branch-scoped admin actions.

#### Scenario: Submit admission for review
- **WHEN** an authorized user submits a complete admission draft
- **THEN** the system SHALL mark the admission as submitted and persist the submission timestamp.

#### Scenario: Approve admission with branch authorization
- **WHEN** an authorized branch user approves a submitted admission
- **THEN** the system SHALL mark the admission as approved, record the approver, and write an audit entry.

---

### Requirement: Admission Screen Visibility
The system SHALL show admission status, linked student profile reference, and workflow progress on admin admission screens.

#### Scenario: Render admission detail screen
- **WHEN** an authorized user opens an admission detail page
- **THEN** the system SHALL show the admission number, status, linked student profile, and approval history.

#### Scenario: Reject out-of-branch admission access
- **WHEN** a user without branch access requests admission details for another branch
- **THEN** the system SHALL deny access with `403 Forbidden`.
