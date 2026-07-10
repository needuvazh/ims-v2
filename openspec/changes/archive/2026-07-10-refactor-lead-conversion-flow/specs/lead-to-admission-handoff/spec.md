## MODIFIED Requirements

### Requirement: Lead to Admission Handoff

The system SHALL allow CRM to hand off an existing qualified lead into the Admission & Enrollment workflow without creating a separate learner lifecycle.

#### Scenario: Convert qualified lead into admission

- **WHEN** a qualified lead is converted via the dedicated conversion wizard page
- **AND** the counselor clicks the "Convert & Enroll" button
- **THEN** the system SHALL create or reuse the linked person record and student profile
- **AND** the system SHALL create a new Admission record at the ASTI institute level (without branch scoping) directly in "Approved" status
- **AND** the system SHALL auto-verify any uploaded documents, recording "AutoVerified" status along with the counselor's user ID as the verifier and the current timestamp in the document audit trail
- **AND** the system SHALL return the admission reference and proceed to initialize a draft enrollment.

#### Scenario: Prevent duplicate learner creation during handoff

- **WHEN** a lead conversion request finds an existing person and student profile matching the email, phone number, or National ID (nationalId)
- **THEN** the system SHALL reuse the existing records instead of creating duplicate student profiles.

#### Scenario: Reuse active admission during conversion

- **WHEN** a lead conversion is initiated for an existing student who already has an active admission (status is Draft, Submitted, or Approved) at the ASTI institute level
- **THEN** the system SHALL bypass duplicate admission checks, reuse the existing student profile and active admission, and directly initialize a new draft enrollment.

#### Scenario: Course waitlist queue conversion

- **WHEN** a qualified lead is converted via the wizard without choosing an active batch
- **THEN** the system SHALL allow creating the enrollment in "Draft" status with `batchId: null`
- **AND** place the enrollment in the course waiting list queue.

#### Scenario: Smart wizard branching for returning student

- **WHEN** the conversion wizard performs a pre-flight identity lookup and finds an existing active student profile
- **THEN** the wizard SHALL display the student's demographic details in review mode
- **AND** perform a document checklist check to identify missing or expired mandatory documents required for the chosen course
- **AND** only require document uploads for those missing or expired documents, bypassing upload fields for already valid documents.
