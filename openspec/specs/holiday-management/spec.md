# holiday-management Specification

## Purpose
TBD - created by archiving change implement-module-07-scheduling. Update Purpose after archive.
## Requirements
### Requirement: Holiday Definition
The system SHALL allow authorized users to define holidays with specific types (Public, Branch Closure, Special Event) and localized names.

#### Scenario: Creating a recurring public holiday
- **WHEN** a Super Admin creates a "National Day" holiday marked as `isRecurringAnnual` for December 2nd
- **THEN** the system SHALL block training sessions on this date for all branches unless an explicit override is applied

### Requirement: Holiday Conflict Interception
The system SHALL prevent the creation of "Published" schedule sessions on dates marked as "Active" holidays.

#### Scenario: Blocking session on Eid
- **WHEN** a coordinator attempts to publish a session on a date that is registered as an Active Holiday for that branch
- **THEN** the system SHALL block the action and return a `HOLIDAY_CONFLICT` error

### Requirement: Holiday Impact on Existing Schedules
When a new holiday is activated, the system SHALL identify and flag all existing published sessions on that date as "Conflict".

#### Scenario: Declaring a late holiday
- **WHEN** a Branch Manager activates a new holiday for a date where 5 sessions are already published
- **THEN** the system SHALL update those 5 sessions to `Conflict` status and record the change in the AuditLog
