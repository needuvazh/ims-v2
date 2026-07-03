## MODIFIED Requirements

### Requirement: Waiting List Queuing (FR-CRS-009)
The system SHALL support enqueuing student profiles or CRM leads into a batch's waiting list when seat capacity is reached, maintaining chronological queue positions.

#### Scenario: Enqueue student profile to waitlist
- **WHEN** a queue request is received for a valid student profile ID, and the batch is full and waitlist is enabled
- **THEN** the system SHALL acquire a pessimistic write-lock (`SELECT FOR UPDATE`) on the parent Batch row, create a `WaitingList` record with status `Waiting`, and assign the next sequential FIFO `queuePosition` number.

#### Scenario: Prevent duplicate active waitlist entries (BR-CRS-019)
- **WHEN** a request to enqueue a student profile or lead is received, and there is already an active waitlist entry in `Waiting` status for that same student profile/lead and batch
- **THEN** the system SHALL reject the operation and throw a validation error.

---

### Requirement: Waitlist Scoping Guard
The system SHALL restrict waitlist operations to authorized users within the active branch context of the batch.

#### Scenario: Reject waitlist action if user lacks branch access or correct permission
- **WHEN** enqueuing, reordering, promoting, skipping, removing, or reactivating waitlist entries is requested for a batch
- **THEN** the system SHALL verify the user has the `batch.waitlist.manage` permission and active branch authorization for the batch's branch ID in their `UserBranchAccess` configuration, failing which it SHALL reject the operation and return a `403 Forbidden` response.
