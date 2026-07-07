## ADDED Requirements

### Requirement: Completion Reevaluation Trigger (FR-EXC-034)
The system SHALL support reevaluation of CourseCompletion when authoritative evidence changes. Valid trigger types: RESULT_CORRECTED, ATTENDANCE_CORRECTED, PAYMENT_VALIDATION_CHANGED, MANUAL_REEVALUATION. RESULT_CORRECTED requires triggerReference = Result ID. ATTENDANCE_CORRECTED requires triggerReference = Attendance correction ID. PAYMENT_VALIDATION_CHANGED requires triggerReference = Finance validation reference. MANUAL_REEVALUATION may omit triggerReference but requires reason.

#### Scenario: Reevaluate after Result correction
- **WHEN** reevaluation runs with triggerType RESULT_CORRECTED and triggerReference RES-001
- **THEN** the active CourseCompletionRule SHALL be reloaded
- **AND** current Attendance evidence SHALL be reloaded when required
- **AND** current Result evidence SHALL be reloaded
- **AND** current Finance validation SHALL be reloaded when required
- **AND** CourseCompletion SHALL be recomputed from current authoritative evidence

#### Scenario: Reject untraceable Result correction trigger
- **WHEN** triggerType is RESULT_CORRECTED and triggerReference is missing
- **THEN** the system SHALL reject with 422 INVALID_REEVALUATION_TRIGGER

### Requirement: Reevaluation Exception Handling (FR-EXC-035)
The system SHALL enter a controlled exception state when reevaluation invalidates a previously approved CourseCompletion. Prior approval history SHALL NOT be deleted. Certificate eligibility SHALL be re-evaluated. If certificate was already issued, Certificate Management SHALL be notified of eligibility change.

#### Scenario: Enter exception path when approved outcome becomes invalid
- **WHEN** CourseCompletion was approved
- **AND** current authoritative evidence now fails a mandatory criterion
- **THEN** CourseCompletion SHALL enter a controlled exception or re-review state
- **AND** prior approval history SHALL NOT be deleted
- **AND** certificate eligibility SHALL be re-evaluated

### Requirement: Reevaluation Branch Isolation (FR-EXC-036)
The system SHALL enforce branch mutation scope for reevaluation. Cross-branch reevaluation SHALL be denied.

#### Scenario: Reject cross-branch reevaluation
- **WHEN** a user with mutation access only to BR-MCT attempts to reevaluate a CourseCompletion in BR-SHR
- **THEN** the system SHALL reject with 403 BRANCH_MUTATION_FORBIDDEN
