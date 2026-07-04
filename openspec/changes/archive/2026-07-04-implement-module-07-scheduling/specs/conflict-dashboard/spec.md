## ADDED Requirements

### Requirement: Conflict Dashboard Overview
The system SHALL provide a centralized dashboard for Academic Coordinators to view and manage all schedule sessions currently in a `Conflict` or `Potential Conflict` state.

#### Scenario: Viewing unresolved conflicts
- **WHEN** a coordinator opens the Conflict Dashboard for their assigned branch
- **THEN** the system SHALL display a list of sessions with `scheduleStatus = Conflict` grouped by conflict type (Holiday, Venue Block, Trainer Overlap)

### Requirement: Potential Conflict Detection
The system SHALL identify and display "Potential Conflicts" where a session is technically valid now but risks future invalidation.

#### Scenario: Expiring trainer eligibility
- **WHEN** a session is scheduled with a trainer whose course authorization is set to expire before the session date
- **THEN** the system SHALL flag this as a `Potential Conflict` on the dashboard with a "Warning" severity

### Requirement: Conflict Override (Ignoring Conflicts)
The system SHALL allow authorized Branch Managers to "Ignore" a specific conflict, allowing the session to be published despite a validation failure.

#### Scenario: Overriding a holiday for fast-track batch
- **WHEN** a Branch Manager applies an `Override` to a Holiday conflict, providing a required justification
- **THEN** the system SHALL set the session status to `Published`, capture the `overrideReason`, and record a high-severity audit log entry

### Requirement: Conflict Resolution Workflow
The system SHALL provide guided actions to resolve conflicts by rescheduling, changing venues, or cancelling sessions.

#### Scenario: Resolving a venue block via reschedule
- **WHEN** a coordinator selects a "Venue Blocked" conflict and provides a new available date and time
- **THEN** the system SHALL update the session, perform a full re-validation, and move it to `Published` status on success
