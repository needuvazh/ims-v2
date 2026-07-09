## ADDED Requirements

### Requirement: Exclude Self-Session Overlap
When evaluating trainer eligibility during a session reschedule, the session being edited MUST NOT trigger an overlap conflict with itself.

#### Scenario: Edit session does not conflict with itself
- **WHEN** an eligibility check is performed for a trainer availability check, AND a `sessionId` is passed as input
- **THEN** the session with `id === sessionId` MUST be excluded from the conflicting scheduled sessions lookup, AND the trainer MUST NOT be flagged with `SESSION_OVERLAP` due to that specific session.

---

### Requirement: Differentiate Availability Status Details
The system MUST return distinct reason codes for leaves and session overlaps instead of a generic `TRAINER_NOT_AVAILABLE` status, and detailed conflict arrays MUST be returned for overlapping sessions.

#### Scenario: Trainer is on approved leave
- **WHEN** a trainer has an approved leave request on the scheduled session date and time
- **THEN** the eligibility result MUST include `TRAINER_ON_LEAVE` in the `reasonCodes` list.

#### Scenario: Trainer is scheduled for another session
- **WHEN** a trainer is already booked for another session in a different batch during that time range
- **THEN** the eligibility result MUST include `SESSION_OVERLAP` in the `reasonCodes` list, AND the response MUST include a `conflicts` array containing the date, time range, and conflicting `batchCode`.

---

### Requirement: Availability Details Dialog Modal
The scheduling UI MUST show trainer availability detail checklists and overlapping session tables in a dialog box instead of an inline collapsible section.

#### Scenario: Admin opens trainer details in UI
- **WHEN** the user clicks "Show details" on a trainer card in the Trainer Availability View
- **THEN** the system MUST display a dialog box modal, AND if there are conflicts, it MUST render the leave status or the conflicting sessions (date, time, batch code) clearly.
