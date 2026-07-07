## ADDED Requirements

### Requirement: Correct Finalized Result (FR-EXC-015)
The system SHALL support correcting a finalized Result via dedicated command requiring `result.correct` permission, mandatory business reason, marks differing from current value, and marks within Exam maxMarks. Correction SHALL trigger completion reevaluation if impacted. Old/new marks, old/new status, reason, actor, and timestamp SHALL be audited.

#### Scenario: Correct finalized Result successfully
- **WHEN** a user with `result.correct` permission corrects marks from 45.00 to 65.00 with reason "Verified transcription error"
- **AND** Exam passMarks is 50.00
- **THEN** marksObtained SHALL become 65.00
- **AND** resultStatus SHALL transition from FAILED to PASSED
- **AND** old/new values SHALL be audited
- **AND** completion reevaluation SHALL be triggered if impacted

#### Scenario: Reject correction without reason
- **WHEN** a user submits corrected marks without a reason
- **THEN** the system SHALL reject with 400 CORRECTION_REASON_REQUIRED

#### Scenario: Reject unchanged corrected marks
- **WHEN** a user submits corrected marks equal to current marks
- **THEN** the system SHALL reject with 422 CORRECTED_MARKS_UNCHANGED

#### Scenario: Reject correction without restricted permission
- **WHEN** a user with `result.record` but NOT `result.correct` attempts to correct a finalized Result
- **THEN** the system SHALL reject with 403 FORBIDDEN

#### Scenario: Preserve Result correction audit atomically
- **WHEN** a correction succeeds
- **THEN** the Result update and required audit evidence SHALL both be committed consistently
- **AND** the system SHALL NOT expose a state where Result changed without audit evidence

### Requirement: Result Correction Branch Isolation (FR-EXC-016)
The system SHALL enforce branch mutation scope for Result correction. Cross-branch correction SHALL be denied.

#### Scenario: Reject cross-branch Result correction
- **WHEN** a user with mutation access only to BR-MCT attempts to correct a Result in BR-SHR
- **THEN** the system SHALL reject with 403 BRANCH_MUTATION_FORBIDDEN

### Requirement: Result Correction Concurrency (FR-EXC-017)
The system SHALL use optimistic locking via version field for Result correction. Stale correction attempts SHALL fail with 409 CONCURRENCY_CONFLICT.

#### Scenario: Reject stale Result correction
- **WHEN** a correction is based on version 3 but current version is 4
- **THEN** the system SHALL reject with 409 CONCURRENCY_CONFLICT
- **AND** no overwrite SHALL occur
- **AND** no duplicate audit event SHALL be created
