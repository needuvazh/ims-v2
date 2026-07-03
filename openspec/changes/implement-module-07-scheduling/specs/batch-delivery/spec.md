## MODIFIED Requirements

### Requirement: Trainer Assignment & Scheduling Conflicts
The system SHALL validate trainer schedules across batches to prevent double-booking, over-allocation, or scheduling on public holidays. To preserve Bounded Context separation, the timetable sessions SHALL be queried through a public Scheduling application service interface.

#### Scenario: Trainer already assigned to overlapping session
- **WHEN** a trainer assignment is requested, and the trainer is already booked for another batch session with overlapping date and time intervals (queried via the Scheduling context's availability contracts)
- **THEN** the system SHALL reject the assignment with a `TRAINER_SCHEDULE_CONFLICT` error

### Requirement: Session Lifecycle Integration
Training Delivery sessions SHALL be managed and validated by the Scheduling context's Conflict Engine.

#### Scenario: Marking session as conflict due to external change
- **WHEN** a Scheduling event (e.g., `HolidayCreated`, `VenueBlockCreated`) occurs that invalidates an existing batch session
- **THEN** the Training Delivery context SHALL update the session's status to `Conflict` and surface it on the Conflict Dashboard
