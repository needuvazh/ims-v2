## ADDED Requirements

### Requirement: Individual Result Recording (FR-EXC-010)

The system SHALL support recording a Result for an Exam-Enrollment pair, validating marks range (0 <= marks <= maxMarks), deriving resultStatus server-side (PASSED if marks >= passMarks, else FAILED), enforcing one active Result per Exam+Enrollment, and verifying Enrollment matches Exam Course/Batch/Branch.

#### Scenario: Record passing Result

- **WHEN** a user with `result.record` permission records marks 78 for an Exam with passMarks 50 and maxMarks 100
- **THEN** the system SHALL create a Result with resultStatus "PASSED"
- **AND** recordedBy SHALL equal the authenticated user
- **AND** recordedAt SHALL be populated

#### Scenario: Record failing Result

- **WHEN** a user records marks 49.99 for an Exam with passMarks 50
- **THEN** the Result resultStatus SHALL be "FAILED"

#### Scenario: Derive Result status on server

- **WHEN** a client submits marks 70 with client-supplied resultStatus "FAILED"
- **THEN** the server SHALL ignore the client-supplied status
- **AND** the persisted resultStatus SHALL be "PASSED"

#### Scenario: Reject marks above maximum

- **WHEN** a user records marks 100.01 for an Exam with maxMarks 100
- **THEN** the system SHALL reject with 422 MARKS_EXCEED_MAXIMUM

#### Scenario: Reject Enrollment from another Batch

- **WHEN** a user attempts to record a Result for an Enrollment belonging to a different Batch than the Exam
- **THEN** the system SHALL reject with 422 ENROLLMENT_NOT_ELIGIBLE_FOR_EXAM

#### Scenario: Enforce one active Result per Exam+Enrollment

- **WHEN** an active Result already exists for Exam EX-001 and Enrollment ENR-001
- **AND** a user attempts to create a second active Result
- **THEN** the system SHALL reject with 409 RESULT_DUPLICATE

### Requirement: Bulk Result Entry (FR-EXC-013)

The system SHALL support two-phase bulk Result entry: validate phase returns row-level validation results with a validationToken, submit phase commits atomically. Maximum 1000 rows per request. Duplicate Enrollment rows SHALL be rejected. Cross-branch rows SHALL be rejected without disclosing student details.

#### Scenario: Validate fully valid bulk payload

- **WHEN** a user with `result.bulk-record` permission validates a payload with 2 valid rows
- **THEN** validation SHALL succeed with all rows marked "VALID"
- **AND** a validationToken SHALL be returned

#### Scenario: Detect duplicate Enrollment rows

- **WHEN** a user validates a payload with the same enrollmentId in rows 1 and 2
- **THEN** validation SHALL fail with error code "BULK_RESULT_DUPLICATE_ENROLLMENT"

#### Scenario: Return row-level validation errors

- **WHEN** a user validates a payload where row 1 is valid and row 2 has marks exceeding maxMarks
- **THEN** row 1 SHALL be "VALID"
- **AND** row 2 SHALL be "INVALID" with error code "MARKS_EXCEED_MAXIMUM"

#### Scenario: Prevent silent partial save

- **WHEN** a user submits a bulk payload where one row becomes stale after validation
- **THEN** the transaction SHALL follow atomic or deterministic chunk policy
- **AND** the API SHALL NOT return generic full success while silently omitting failed rows

### Requirement: Result Finalization (FR-EXC-014)

The system SHALL support finalizing a Result in Recorded status, blocking ordinary edit after finalization, requiring `result.finalize` permission, and recording finalizedAt/finalizedBy fields.

#### Scenario: Finalize a valid Result

- **WHEN** a user with `result.finalize` permission finalizes a Result in Recorded status with matching version
- **THEN** the Result status SHALL transition to Finalized
- **AND** finalizedAt and finalizedBy SHALL be populated
- **AND** standard Result edit SHALL become unavailable

#### Scenario: Reject finalization of already finalized Result

- **WHEN** a user attempts to finalize a Result already in Finalized status
- **THEN** the system SHALL reject with 409 RESULT_INVALID_STATE_TRANSITION

### Requirement: Result Branch Isolation (FR-EXC-015)

The system SHALL derive Result branch from Result → Exam → Batch → Branch. Cross-branch Result creation SHALL be rejected.

#### Scenario: Result branch consistency enforced

- **WHEN** a Result is submitted linking an Exam in BR-MCT with an Enrollment in BR-SHR
- **THEN** the system SHALL reject
- **AND** no cross-branch Result SHALL be created
