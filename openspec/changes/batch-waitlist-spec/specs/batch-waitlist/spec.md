## ADDED Requirements

### Requirement: Waiting List Queuing (FR-CRS-009)
The system SHALL support enqueuing students or CRM leads into a batch's waiting list when seat capacity is reached, maintaining chronological queue positions.

#### Scenario: Enqueue student to waitlist
- **WHEN** a queue request is received for a valid student profile ID, and the batch is full and waitlist is enabled
- **THEN** the system SHALL create a `WaitingList` record with status `Waiting` and assign the next sequential FIFO `queuePosition` number.

#### Scenario: Prevent duplicate active waitlist entries (BR-CRS-019)
- **WHEN** a request to enqueue a student or lead is received, and there is already an active waitlist entry in `Waiting` status for that same student/lead and batch
- **THEN** the system SHALL reject the operation and throw a validation error.

---

### Requirement: Waitlist Queue Promotion (FR-CRS-010)
The system SHALL support promoting the first queued learner (FIFO order) when a seat becomes available (due to enrollment cancellations or capacity extensions), emitting outbox events to trigger downstream enrollment creation.

#### Scenario: Auto-promote waitlist student on seat release
- **WHEN** the system receives an `EnrollmentCancelled` domain event, releasing a seat, or when the batch capacity is manually increased
- **THEN** the system SHALL load the batch with write-locking, change the status of the first waitlist entry (`queuePosition = 1`) to `Promoted`, decrement the positions of all remaining entries by 1, and publish a `WaitlistStudentPromoted` event containing the student profile or lead details to the outbox.

#### Scenario: Manual queue position reprioritization
- **WHEN** a request to change the priority queue position of waitlist entries is received from a user with `batch.waitlist.manage` permission
- **THEN** the system SHALL update the `queuePosition` values of the affected entries to reflect the new sequence and persist the updates.

---

### Requirement: Batch Roster Attendance Highlights
The system SHALL display status indicator highlights on student rosters in the details view to flag students at academic risk of completion rule failure.

#### Scenario: Highlight student below minimum attendance threshold
- **WHEN** loading the batch details roster screen `CRS-SCR-006`
- **THEN** the system SHALL query the course's active `CourseCompletionRule`, compare the student's attendance percentage, and apply warning highlight styling if the attendance percentage is lower than the rule's `minimumAttendancePercent`.

---

### Requirement: Waitlist Scoping Guard
The system SHALL restrict waitlist operations to authorized users within the active branch context of the batch.

#### Scenario: Reject waitlist action if user lacks branch access
- **WHEN** enqueuing, reordering, or promoting waitlist entries is requested for a batch, and the user lacks active branch authorization for the batch's branch ID in their `UserBranchAccess` configuration
- **THEN** the system SHALL reject the operation and return a `403 Forbidden` response.


