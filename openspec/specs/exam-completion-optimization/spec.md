# exam-completion-optimization Specification

## Purpose
TBD - created by archiving change optimize-exam-completion-modules. Update Purpose after archive.
## Requirements
### Requirement: Future Exam Date Validation
The system MUST validate that an exam's scheduled date is in the future relative to the system date when creating or scheduling an exam.

#### Scenario: Creating an exam with a past date
- **WHEN** an administrator attempts to create a new exam with an `examDate` in the past.
- **THEN** the system MUST reject the creation with a validation error indicating that the exam date must be in the future.

### Requirement: Active Batch Filter for Exams
When scheduling or creating an exam, only batches that are actively in progress or completed (`InProgress` or `Completed` status) MUST be selectable.

#### Scenario: Querying batches for exam scheduling
- **WHEN** an administrator requests the list of batches on the create exam screen.
- **THEN** the system MUST return only batches where `status` is either `InProgress` or `Completed`.

### Requirement: Unified Roster Direct-Entry and State Transitions
The system MUST support entering results roster marks directly on the Exam Details view and provide a unified transition flow from Draft to OpenForResultEntry.

#### Scenario: Opening a Draft exam for results in one step
- **WHEN** a user clicks "Open for Results" on a Draft exam.
- **THEN** the system MUST execute the `schedule()` command and then the `activate()` command sequentially to change the exam status directly to `OpenForResultEntry`.

#### Scenario: Entering marks on the unified view
- **WHEN** an exam status is `OpenForResultEntry`.
- **THEN** the system MUST render input fields for `marksObtained` and `grade` for all batch enrollments on the Exam Details page and allow bulk saving of these draft entries.

### Requirement: Unified Completion Evidence Outcomes Checklist
The course completion checklist view MUST detail the validation status of each required criteria (Attendance, Exam, Payment) and explain why evidence is incomplete.

#### Scenario: Reading a completion detail with missing evidence
- **WHEN** a course completion is in `EvidenceIncomplete` status.
- **THEN** the system MUST expose and display the specific outcomes: `attendanceOutcome` (Met/NotMet), `examOutcome` (Pass/Fail/Pending), and `paymentOutcome` (Cleared/Outstanding) alongside their current percentages or status.

### Requirement: Collapsed Single-Step Completion Approval
The system MUST support a collapsed single-step manual approval workflow for course completions, bypassing sequential recommendation and review stages.

#### Scenario: Submitting manual approval for a completion
- **WHEN** a course completion meets all evaluation evidence criteria and requires manual approval.
- **THEN** the status MUST transition to `AwaitingFinalApproval`, and any authorized user with `completion.coordinator-review` or `completion.final-approve` permissions can directly approve the completion.

