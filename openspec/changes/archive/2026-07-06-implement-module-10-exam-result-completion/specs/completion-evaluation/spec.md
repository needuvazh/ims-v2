## ADDED Requirements

### Requirement: Automated Completion Evaluation (FR-EXC-020)

The system SHALL evaluate completion for an Enrollment by loading the active CourseCompletionRule from Course Catalog, Attendance evidence from Attendance context, Result evidence from Module 10, and Payment validation from Finance context. All evidence SHALL be server-derived; client-supplied flags (attendancePassed, examPassed, paymentCompleted, completionStatus, certificateEligible) SHALL NOT be trusted. Missing required evidence SHALL never be treated as passed. Unavailable dependency SHALL never false-approve completion.

#### Scenario: Evaluate completion when all mandatory evidence passes

- **WHEN** completion is evaluated for an Enrollment where CourseCompletionRule requires minAttendance 75%, exam required, payment required, manual approval required
- **AND** Attendance reports 90%
- **AND** Module 10 Result evidence reports Exam passed
- **AND** Finance reports payment validation passed
- **THEN** one CourseCompletion SHALL exist for the Enrollment
- **AND** attendancePercentage SHALL be 90.00
- **AND** examPassed SHALL be true
- **AND** paymentCompleted SHALL be true
- **AND** completionStatus SHALL become AwaitingTrainerRecommendation

#### Scenario: Approve automatically when manual approval is not required

- **WHEN** all mandatory evidence passes
- **AND** manualApprovalRequired is false
- **THEN** CourseCompletion SHALL transition to Approved
- **AND** no manual approval stage SHALL be created

#### Scenario: Block completion when required Attendance fails

- **WHEN** minimum attendance is 75% and Attendance reports 70%
- **THEN** completion SHALL NOT be approved
- **AND** the attendance criterion outcome SHALL be failed

#### Scenario: Block completion when required Exam evidence is missing

- **WHEN** examRequired is true and no valid Result evidence exists
- **THEN** completion SHALL NOT be approved
- **AND** the functional outcome SHALL indicate missing Exam evidence

#### Scenario: Fail safe when Attendance dependency is unavailable

- **WHEN** Attendance evidence is required and Attendance dependency is unavailable
- **THEN** completion SHALL NOT be approved
- **AND** the response SHALL indicate ATTENDANCE_DEPENDENCY_UNAVAILABLE

#### Scenario: Fail safe when Finance dependency is unavailable

- **WHEN** payment validation is required and Finance dependency is unavailable
- **THEN** completion SHALL NOT be approved
- **AND** the response SHALL indicate FINANCE_DEPENDENCY_UNAVAILABLE

### Requirement: One CourseCompletion per Enrollment (FR-EXC-021)

The system SHALL enforce one active CourseCompletion per Enrollment. Re-evaluation SHALL update the existing record, not create a duplicate.

#### Scenario: Enforce one CourseCompletion per Enrollment

- **WHEN** a CourseCompletion already exists for ENR-001
- **AND** completion is evaluated again
- **THEN** the existing CourseCompletion SHALL be updated or reevaluated
- **AND** no duplicate active CourseCompletion SHALL be created

### Requirement: Completion Evidence Staleness Detection (FR-EXC-022)

The system SHALL track attendanceUpdatedAt, resultUpdatedAt, and paymentUpdatedAt timestamps on CourseCompletion. Approval actions SHALL compare these against lastEvaluatedAt to detect stale evidence. Stale evidence SHALL block approval and require reevaluation.

#### Scenario: Reject approval when evidence is stale

- **WHEN** a user attempts final approval
- **AND** Attendance evidence changed after the last evaluation (attendanceUpdatedAt > lastEvaluatedAt)
- **THEN** the system SHALL reject with 409 COMPLETION_EVIDENCE_STALE
- **AND** approval SHALL NOT proceed

### Requirement: Completion Branch Isolation (FR-EXC-023)

The system SHALL derive CourseCompletion branch from CourseCompletion → Enrollment → Branch. Cross-branch completion mutation SHALL be denied.

#### Scenario: Reject cross-branch completion evaluation

- **WHEN** a user with mutation access only to BR-MCT attempts to evaluate completion for an Enrollment in BR-SHR
- **THEN** the system SHALL reject with 403 BRANCH_MUTATION_FORBIDDEN
