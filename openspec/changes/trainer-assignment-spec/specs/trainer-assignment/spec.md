## ADDED Requirements

### Requirement: Faculty Assignment Details (FR-CRS-011)
The system SHALL support allocating active qualified trainers to batch deliveries within the execution start and end dates.

#### Scenario: Successfully assign active primary trainer
- **WHEN** a trainer assignment request is submitted with a valid batch ID, active trainer profile ID, assignment role `Primary`, and date range matching the batch duration
- **THEN** the system SHALL create a `BatchTrainer` record, update the status to active, and log `TRAINER_ASSIGNED_TO_BATCH`.

#### Scenario: Reject trainer assignment if dates fall outside batch limits
- **WHEN** a trainer assignment start date is prior to the batch start date or the assignment end date exceeds the batch end date
- **THEN** the system SHALL reject the assignment and return a validation error.

#### Scenario: Enforce single primary trainer constraint per date range
- **WHEN** a trainer assignment is requested as `Primary` role, and there is already another active `Primary` trainer assigned to that batch for an overlapping date range
- **THEN** the system SHALL reject the assignment and throw a `DuplicatePrimaryTrainer` DomainError (`ERR_CRS_DUPLICATE_PRIMARY_TRAINER`).

---

### Requirement: Trainer Schedule Conflict Validation (FR-CRS-012)
The system SHALL validate trainer availability, checking for overlapping session schedules across multiple batches to prevent double-booking.

#### Scenario: Intercept overlapping assignment and block transaction
- **WHEN** a trainer assignment is requested, and the trainer is already booked for another batch session with overlapping date and time intervals (queried via the Scheduling context's availability contracts)
- **THEN** the system SHALL reject the assignment and throw a `TrainerScheduleConflict` DomainError (`ERR_CRS_TRAINER_SCHEDULE_CONFLICT`).

#### Scenario: Block batch activation if no trainer is assigned (BR-CRS-014)
- **WHEN** a batch status transition to `OpenForEnrollment` is requested, but no trainer is registered in the batch trainer list
- **THEN** the system SHALL block the transition and return a validation error.

#### Scenario: Reject trainer assignment if user lacks access to batch's branch
- **WHEN** a trainer assignment is requested on a batch, and the user lacks active branch authorization for the batch's branch ID in their `UserBranchAccess` configuration
- **THEN** the system SHALL reject the operation and return a `403 Forbidden` response.

