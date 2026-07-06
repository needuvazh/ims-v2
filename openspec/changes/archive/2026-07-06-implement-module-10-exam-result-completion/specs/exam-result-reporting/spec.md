## ADDED Requirements

### Requirement: Operational Dashboard Widgets (FR-EXC-RPT-001)
The system SHALL provide dashboard widgets for: Exams Awaiting Activation, Missing Results, Results Awaiting Finalization, Pending Completion Evaluations, Trainer Recommendations Pending, Coordinator Reviews Pending, Final Approvals Pending, Reevaluation Exceptions, Exam Pass Rate Trend, Completion Rate Trend, Approval Aging by Stage, Result Recording Progress by Batch. Each widget SHALL respect branch scope and permission gates.

#### Scenario: Dashboard reads projection only
- **WHEN** the dashboard loads
- **THEN** the dashboard SHALL read from read-model projections
- **AND** no transactional state SHALL be updated

#### Scenario: Widget branch scoping
- **WHEN** a user with branch scope limited to BR-MCT views the dashboard
- **THEN** all widget counts SHALL reflect only BR-MCT data
- **AND** no BR-SHR data SHALL leak

### Requirement: Operational Reports (FR-EXC-RPT-002)
The system SHALL provide operational reports: Exam Register, Result Register, Missing Results Report, Result Finalization Status Report, Exam Performance Report, Completion Evaluation Report, Completion Approval Report, Reevaluation Exception Report, Trainer Recommendation Status Report, Approval SLA Report, Result Correction Audit Report, Branch Academic Outcome Summary. All reports SHALL be read-only, branch-scoped, and support CSV/XLSX/PDF export where platform capability exists.

#### Scenario: Export branch filter only narrows access
- **WHEN** a user who can export BR-MCT only submits export filters containing BR-MCT and BR-SHR
- **THEN** BR-SHR SHALL NOT expand the user's scope
- **AND** the request SHALL be denied or narrowed according to platform policy

#### Scenario: Export rejects unsupported column
- **WHEN** a user requests column "passportNumber" not in the report allowlist
- **THEN** the system SHALL reject with UNSUPPORTED_EXPORT_COLUMN

### Requirement: Read Model Safety (FR-EXC-RPT-003)
Read models SHALL be read-only, derived, rebuildable, and non-authoritative. Commands SHALL NOT trust read models for authorization or state validation. Commands SHALL reload authoritative transactional state before execution.

#### Scenario: Command reloads authoritative state
- **WHEN** a read model says CourseCompletion is awaiting final approval
- **BUT** authoritative transactional state changed afterward
- **AND** a final approval command is submitted
- **THEN** the command SHALL validate current authoritative CourseCompletion state
- **AND** SHALL NOT trust the stale read model

#### Scenario: Read model mismatch does not override source of truth
- **WHEN** a reporting view differs from the transactional Result
- **AND** reconciliation detects the mismatch
- **THEN** the transactional Result SHALL remain authoritative
- **AND** the read model SHALL be repaired or rebuilt
