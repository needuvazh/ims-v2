## ADDED Requirements

### Requirement: Target Assessment Date Leave Overlap
The system MUST validate that a trainer is available on the specified Target Assessment Date. If the trainer has an approved leave request on that date, they are considered unavailable and ineligible for batch assignment.

#### Scenario: Leave on Target Assessment Date
- **WHEN** an eligibility check is performed for a batch faculty assignment with a Target Assessment Date, AND the trainer has an approved leave request that spans or includes that Target Assessment Date
- **THEN** the trainer's eligibility status MUST be returned as not eligible (`eligible: false`, `isAssignable: false`), AND the reason codes MUST include `LEAVE_ON_TARGET_DATE`, AND a descriptive warning message MUST be provided.

---

### Requirement: Non-Blocking Session Conflicts
Schedule conflicts with other batch sessions MUST NOT block faculty assignment to a batch. Instead, they are treated as warnings to be flagged in the UI, and full conflict details MUST be returned to the client.

#### Scenario: Trainer has session conflicts but no other restrictions
- **WHEN** an eligibility check is performed for a batch, AND the trainer has scheduled sessions in another batch that overlap with the target batch's sessions, AND the trainer has no other blocking restrictions (e.g. course authorized, correct branch, no leave overlaps)
- **THEN** the trainer's eligibility status MUST be returned as eligible (`eligible: true`, `isAssignable: true`), AND the reason codes MUST include `SESSION_OVERLAP`, AND a structured list of conflicting sessions containing date, time, conflicting batch, and session number MUST be included in the response.

#### Scenario: Assigning a trainer with session conflicts
- **WHEN** a request is made to assign a trainer to a batch (via `assignTrainer`), AND there are session schedule conflicts (overlaps) detected for that trainer
- **THEN** the system MUST successfully persist the assignment and MUST NOT throw a `TrainerScheduleConflict` exception.

---

### Requirement: Interactive Conflict Modal in Faculty Card
The Admin Portal UI MUST display detailed conflict information in a dedicated modal when a trainer has overlapping sessions.

#### Scenario: Displaying conflict details in UI
- **WHEN** a trainer's eligibility record contains `SESSION_OVERLAP` reason code
- **THEN** the UI MUST display a "View Conflicts" button on the trainer's card, AND clicking this button MUST open a dialog modal displaying the date, time, batch code, and session number of all conflicting sessions, AND the card MUST display the "Assign Faculty" button in an enabled state.
