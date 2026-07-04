# venue-blocking Specification

## Purpose
TBD - created by archiving change implement-module-07-scheduling. Update Purpose after archive.
## Requirements
### Requirement: Venue Block Creation
The system SHALL support creating time-bound blocks for specific classrooms or entire branches to indicate unavailability for training.

#### Scenario: Full-day maintenance block
- **WHEN** a coordinator creates a VenueBlock for "Classroom 101" marked as `isFullDay` for a specific date
- **THEN** the system SHALL prevent any new sessions from being scheduled in that classroom on that date

### Requirement: Partial-day Venue Block
The system SHALL support venue blocks with specific start and end times.

#### Scenario: Afternoon inspection block
- **WHEN** a venue block is created for a branch from 14:00 to 17:00
- **THEN** the system SHALL allow scheduling sessions that end before 14:00 or start after 17:00 on that date

### Requirement: Venue Block Conflict Resolution
The system SHALL allow sessions to be moved to an alternative classroom if the original classroom is blocked.

#### Scenario: Re-routing session to available room
- **WHEN** a session is in conflict due to a venue block, and the coordinator updates the `classroomId` to an unblocked room
- **THEN** the system SHALL re-validate the session and return it to `Published` status if all other constraints are met
