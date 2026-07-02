## ADDED Requirements

### Requirement: Admission Draft Creation
The system SHALL allow an authorized admissions user to create an admission draft for a selected Student Profile context within the active branch.

#### Scenario: Create admission draft from admin screen
- **GIVEN** the user is authenticated and has "admission.create" permission
- **WHEN** the user submits an admission draft request specifying a valid `studentProfileId` (resolved active branch is extracted from session context)
- **THEN** the system SHALL:
  - Verify that the target `StudentProfile` exists and is active.
  - Generate a unique `admissionNumber` using a collision-free sequential numbering-series resolver.
  - Create an admission record in the "Draft" state scoped to the resolved active branch.
  - Publish an "AdmissionCreated" event to the transactional outbox (and "StudentProfileCreated" conditionally only if a new profile is initialized).
  - Write an audit log entry documenting draft creation under the active branch.

#### Scenario: Prevent duplicate active admission in same branch
- **GIVEN** the active branch context has been resolved
- **WHEN** a user attempts to create a new admission draft for a `studentProfileId` that already has an active admission (status is Draft, Submitted, or Approved and `isDeleted` is false) in that same branch
- **THEN** the system SHALL reject the request with a domain validation error "ERR_ADM_ACTIVE_ADMISSION_EXISTS" (HTTP 409 Conflict).

---

### Requirement: Admission Submission, Approval, and Review
The system SHALL enforce a sequential state machine for the admission lifecycle: Draft $\rightarrow$ Submitted $\rightarrow$ Approved / Rejected / Cancelled.

#### Scenario: Submit admission for review
- **GIVEN** an admission exists in "Draft" state
- **WHEN** an authorized registrar submits the admission
- **THEN** the system SHALL:
  - Transition the admission status to "Submitted".
  - Persist the current timestamp as `submittedAt`.
  - Write an audit log entry capturing the transition to "Submitted".

#### Scenario: Approve admission with branch authorization
- **GIVEN** an admission exists in "Submitted" state
- **WHEN** an authorized branch manager approves the admission
- **THEN** the system SHALL:
  - Execute the document verification gate (`verifyAdmissionDocumentsGate`) to ensure all mandatory identity documents are verified.
  - Transition the admission status to "Approved".
  - Record the approved timestamp as `approvedAt` and the manager's ID as `approvedBy`.
  - Write an audit log entry capturing the transition to "Approved".

#### Scenario: Block approval of drafts
- **GIVEN** an admission exists in "Draft" state
- **WHEN** a user attempts to approve the admission
- **THEN** the system SHALL reject the transition with a validation error "ERR_ADMISSION_INVALID_STATUS_TRANSITION".

#### Scenario: Reject admission with mandatory reason
- **GIVEN** an admission exists in "Submitted" state
- **WHEN** an authorized branch manager rejects the admission providing rejection remarks
- **THEN** the system SHALL:
  - Transition the admission status to "Rejected".
  - Persist the rejection remarks as `remarks`, current timestamp as `rejectedAt`, and manager's ID as `rejectedBy`.
  - Write an audit log entry capturing the transition to "Rejected" with the remarks.

#### Scenario: Cancel draft or submitted admission
- **GIVEN** an admission exists in "Draft" or "Submitted" state
- **WHEN** an authorized user cancels the admission
- **THEN** the system SHALL:
  - Transition the admission status to "Cancelled".
  - Record the current timestamp as `cancelledAt` and the user's ID as `cancelledBy`.
  - Write an audit log entry capturing the transition to "Cancelled".

---

### Requirement: Admission Detail Read Model and Visibility
The system SHALL show detailed admission state, linked student identity reference, and full workflow history.

#### Scenario: Render admission detail screen
- **WHEN** an authorized user queries the details of a specific admission
- **THEN** the system SHALL return a query DTO containing the admission number, status, student profile details, submission details, and chronological approval/rejection/cancellation history.

#### Scenario: Reject out-of-branch admission access
- **WHEN** a user without branch permission requests admission details or transitions for another branch
- **THEN** the system SHALL deny access with `403 Forbidden` (ERR_AUTH_BRANCH_DENIED).
