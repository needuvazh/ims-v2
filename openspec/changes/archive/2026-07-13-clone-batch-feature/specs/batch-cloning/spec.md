## ADDED Requirements

### Requirement: Batch Cloning Service

The system MUST support duplicating a training delivery batch's parameters, sessions, and trainer assignments into a new batch schedule.

#### Scenario: Successfully clone batch
- **WHEN** a cloning request is submitted for a valid source batch, with a new start/end date range, new primary trainer ID, and a modified list of session schedules
- **THEN** the system SHALL:
  1. Auto-allocate a new unique batch code following the `[Parent Course Code]-[Three Digit Sequential Suffix]` format.
  2. Persist the new batch in a `Draft` status.
  3. Create an active `BatchTrainer` assignment for the selected trainer spanning the new batch timeline.
  4. Create all duplicate `Session` records with their new dates, times, trainers, and classrooms.
  5. Log a `BATCH_CLONED` audit log entry in the database.
- **AND** all changes MUST be executed atomically within a single database transaction.

#### Scenario: Source batch not found
- **WHEN** the clone request references a source batch ID that does not exist or has `isDeleted = true`
- **THEN** the system SHALL reject the operation and throw an error.

#### Scenario: Date range bounds violation
- **WHEN** the new batch start/end date range falls outside the parent course's effective dates
- **THEN** the system SHALL reject the clone operation and return a validation error (`ERR_CRS_INVALID_DATE_RANGE`).

---

### Requirement: Client-Side Session Date Auto-Shifting

The user interface MUST assist coordinators by automatically shifting session dates relative to the new batch start date.

#### Scenario: Auto-shifting session dates on timeline shift
- **WHEN** the user selects a new batch start date that differs from the source batch's start date by \(N\) days
- **THEN** the system MUST automatically add \(N\) days to each session's date in the preview grid.
- **AND** the shifted session dates MUST remain fully editable by the user.

---

### Requirement: Session Validation & Warning Generation

Each cloned session schedule MUST undergo conflict checking before creation.

#### Scenario: Session conflict detected
- **WHEN** a cloned session has a classroom or trainer double-booking or holiday overlap
- **THEN** the conflict engine MUST return structured conflict warning details.
- **AND** overlapping session schedules MUST NOT block the cloning transaction; they are flagged as warnings to be resolved by the coordinator post-creation.

---

### Requirement: Scoping and Access Authorization

Branch isolation checks MUST apply to the batch cloning actions.

#### Scenario: User lacks branch scope
- **WHEN** a user attempts to clone a batch to a branch that is not within their allowed branch scope
- **THEN** the system SHALL block the request and return a `403 Forbidden` response.
