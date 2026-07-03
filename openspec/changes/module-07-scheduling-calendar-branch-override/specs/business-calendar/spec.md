# business-calendar Specification

## Purpose
Define the institute-owned business calendar and the branch/year override model used by Scheduling, Calendar & Holiday Management. This replaces branch-owned calendar duplication with a single canonical institute calendar plus sparse branch-specific exceptions.

## ADDED Requirements

### Requirement: Institute Business Calendar Ownership
The system SHALL store one canonical business calendar per institute for a given effective period, and the calendar SHALL own default operating days, working hours, and holiday rules.

#### Scenario: Create institute business calendar
- **WHEN** an authorized user creates a business calendar for an institute with valid effective dates, localized names, operating days, and working hours
- **THEN** the system SHALL persist the calendar in `Draft` status
- **AND** the system SHALL normalize the timezone to `Asia/Muscat`
- **AND** the system SHALL record an audit entry for calendar creation

#### Scenario: Reject duplicate overlapping institute calendar
- **WHEN** a user attempts to create another active institute calendar that overlaps the same institute and effective period
- **THEN** the system SHALL reject the request with a calendar overlap error

### Requirement: Branch-Year Override Resolution
The system SHALL support branch/year override records that store only deviations from the institute calendar for a specific branch and year.

#### Scenario: Create branch override from institute calendar
- **WHEN** an authorized branch manager creates an override for branch `B1` and year `2026`
- **AND** the override changes only the operating days and working hours for that branch/year
- **THEN** the system SHALL persist the override as a branch-scoped record
- **AND** the system SHALL keep the institute calendar unchanged
- **AND** the system SHALL record an audit entry with branch and year context

#### Scenario: Reject override outside branch scope
- **WHEN** a user attempts to create a branch override for a branch that is outside their allowed branch scope
- **THEN** the system SHALL reject the request with a branch-scope denial error

#### Scenario: Reject override of institute timezone
- **WHEN** a branch/year override attempts to change the institute calendar timezone
- **THEN** the system SHALL reject the request because timezone is institute-owned

### Requirement: Scheduling Validation Uses Resolved Calendar
The system SHALL resolve calendar rules in the following order for scheduling checks: branch/year override first, institute calendar second, system defaults last.

#### Scenario: Branch override takes precedence during session validation
- **GIVEN** a branch/year override exists for branch `B1` and year `2026`
- **WHEN** a schedule session is validated for that branch and year
- **THEN** the system SHALL use the override's working days and working hours for conflict checks
- **AND** the system SHALL fall back to the institute calendar for rules not overridden

#### Scenario: Institute holiday blocks scheduling by default
- **GIVEN** the institute calendar marks a date as an active holiday
- **WHEN** a schedule session is validated on that date without an approved override
- **THEN** the system SHALL reject the session as a holiday conflict

#### Scenario: Branch override does not affect other branches
- **WHEN** a branch/year override is created for one branch
- **THEN** the system SHALL continue to validate other branches against the institute calendar unless they have their own override

### Requirement: Audit, Permissions, and Branch Scope
The system SHALL enforce server-side authorization, branch scoping, and auditable change history for institute calendar and branch/year override changes.

#### Scenario: Only authorized users can manage calendars
- **WHEN** a calendar create or update request is submitted without the required permission
- **THEN** the system SHALL reject the request with an authorization error

#### Scenario: Calendar changes are audited
- **WHEN** a user creates, updates, activates, closes, archives, or overrides a calendar rule
- **THEN** the system SHALL record the actor, branch context, before/after values, and change reason where applicable

#### Scenario: Resolved calendar is visible in reads
- **WHEN** an authorized user reads a business calendar for a branch and year
- **THEN** the system SHALL return the institute default rules plus any applied branch/year override indicators
- **AND** the response SHALL clearly identify which values were inherited and which were overridden
