## ADDED Requirements

### Requirement: Exam Creation (FR-EXC-001)
The system SHALL support creating an Exam in Draft status, enforcing Course-Batch validity, branch mutation scope, marks configuration rules, and semantic duplicate detection.

#### Scenario: Successfully create Exam with valid inputs
- **WHEN** an authenticated user with `exam.create` permission and mutation access to branch BR-MCT submits an Exam creation request with valid courseId, batchId (belonging to course), examName, examDate, maxMarks > 0, and passMarks >= 0 where passMarks <= maxMarks
- **THEN** the system SHALL create the Exam in Draft status with version 1
- **AND** the system SHALL write a creation audit log with actor, Exam ID, Course, Batch, and timestamp
- **AND** the system SHALL return the created Exam details

#### Scenario: Reject Exam creation without permission
- **WHEN** a user without `exam.create` permission submits a valid Exam creation request
- **THEN** the system SHALL reject with 403 FORBIDDEN and error code "FORBIDDEN"
- **AND** no Exam SHALL be created

#### Scenario: Reject Exam creation outside branch mutation scope
- **WHEN** a user with read-only access to BR-SHR attempts to create an Exam for a batch in BR-SHR
- **THEN** the system SHALL reject with 403 BRANCH_MUTATION_FORBIDDEN
- **AND** no Exam SHALL be created

#### Scenario: Reject Exam with passMarks exceeding maxMarks
- **WHEN** a user submits an Exam with maxMarks 100 and passMarks 101
- **THEN** the system SHALL reject with 400 and error code "PASS_MARKS_EXCEED_MAX"

#### Scenario: Reject duplicate semantic Exam
- **WHEN** an active Exam already exists for batch BAT-001 with examName "Final Assessment" on date 2026-08-20
- **AND** a user submits an identical Exam
- **THEN** the system SHALL reject with 409 DUPLICATE_EXAM

### Requirement: Exam State Transitions (FR-EXC-002)
The system SHALL enforce Exam lifecycle transitions: Draft → Scheduled → OpenForResultEntry → Closed, with Scheduled → Cancelled and any → Archived allowed. Invalid transitions SHALL throw ERR_EXC_INVALID_STATE_TRANSITION.

#### Scenario: Schedule a Draft Exam
- **WHEN** a user with `exam.schedule` permission schedules a Draft Exam for a valid future date
- **THEN** the Exam status SHALL transition to Scheduled
- **AND** the version SHALL increment by 1

#### Scenario: Activate a Scheduled Exam
- **WHEN** a user with `exam.activate` permission activates a Scheduled Exam
- **THEN** the Exam status SHALL transition to OpenForResultEntry

#### Scenario: Close an open Exam
- **WHEN** a user with `exam.close` permission closes an Exam where all eligible Results are recorded or policy exception applies
- **THEN** the Exam status SHALL transition to Closed

#### Scenario: Reject invalid state transition
- **WHEN** a user attempts to close a Draft Exam
- **THEN** the system SHALL reject with 409 EXAM_INVALID_STATE_TRANSITION

#### Scenario: Cancel a Scheduled Exam with reason
- **WHEN** a user with `exam.cancel` permission cancels a Scheduled Exam with a mandatory reason
- **THEN** the Exam status SHALL transition to Cancelled
- **AND** the cancellation audit SHALL include the reason

### Requirement: Exam Branch Isolation (FR-EXC-003)
The system SHALL derive Exam branch from Exam → Batch → Branch relationship. Client-supplied branchId SHALL NOT be the sole authorization input.

#### Scenario: Exam list excludes unauthorized branch data
- **WHEN** a user with read scope limited to BR-MCT searches Exams
- **THEN** only Exams from BR-MCT SHALL be returned
- **AND** no BR-SHR Exam data SHALL leak

#### Scenario: Direct Exam lookup does not leak unauthorized branch
- **WHEN** a user without BR-SHR access requests an Exam in BR-SHR by ID
- **THEN** the system SHALL return 404 NOT_FOUND
- **AND** no Exam details SHALL be disclosed
