# batch-waitlist Specification

## Purpose
TBD - created by archiving change batch-waitlist-spec. Update Purpose after archive.
## Requirements
### Requirement: Waiting List Queuing (FR-CRS-009)
The system SHALL support enqueuing students or CRM leads into a batch's waiting list when seat capacity is reached, maintaining chronological queue positions.

#### Scenario: Enqueue student to waitlist
- **WHEN** a queue request is received for a valid student profile ID, and the batch is full and waitlist is enabled
- **THEN** the system SHALL acquire a pessimistic write-lock (`SELECT FOR UPDATE`) on the parent Batch row, create a `WaitingList` record with status `Waiting`, and assign the next sequential FIFO `queuePosition` number.

#### Scenario: Prevent duplicate active waitlist entries (BR-CRS-019)
- **WHEN** a request to enqueue a student or lead is received, and there is already an active waitlist entry in `Waiting` status for that same student/lead and batch
- **THEN** the system SHALL reject the operation and throw a validation error.

---

### Requirement: Waitlist Queue Promotion (FR-CRS-010)
The system SHALL support promoting waitlisted learners (FIFO order) when seats become available (due to enrollment cancellations or manual capacity extensions), emitting outbox events to trigger downstream enrollment creation.

#### Scenario: Auto-promote waitlist student on seat release
- **WHEN** the system receives an `EnrollmentCancelled` domain event, releasing a seat
- **THEN** the system SHALL load the batch with write-locking (`FOR UPDATE`), change the status of the first waitlist entry (`queuePosition = 1`) to `Promoted`, assign a unique `promotionCorrelationId` uuid, decrement the positions of all remaining entries by 1, and publish a `WaitlistEntryPromoted` event containing the candidate profile or lead details along with the correlation ID to the outbox.

#### Scenario: Auto-promote waitlist students on capacity increase
- **WHEN** the batch capacity is manually increased in the update API and the batch has active waitlist entries
- **THEN** the system SHALL load the batch with write-locking (`FOR UPDATE`) within the update transaction, and for each newly opened seat, transition the first active waitlist entry (`queuePosition = 1`) to `Promoted`, assign a unique `promotionCorrelationId`, decrement subsequent queue positions, increment `currentEnrollmentCount` by 1, and emit a `WaitlistEntryPromoted` event.

#### Scenario: Manual queue position reprioritization
- **WHEN** a request to change the priority queue position of waitlist entries is received from a user with `batch.waitlist.manage` permission
- **THEN** the system SHALL acquire a pessimistic write-lock (`SELECT FOR UPDATE`) on the parent Batch row, update the `queuePosition` values of the affected entries to reflect the new sequence, and persist the updates.

#### Scenario: Manual promotion fails if batch is full and overbooking is false
- **WHEN** a manual promotion request is received for a waitlist entry ID, and the batch's `currentEnrollmentCount >= capacity`, and `allowOverbooking` is `false`
- **THEN** the system SHALL reject the operation, throw an `ERR_CRS_BATCH_FULL` validation error, and return a `409 Conflict` response.

---

### Requirement: Waitlist Promotion Reversion on Downstream Failure (FR-CRS-010-ALT)
The system SHALL support reverting waitlist promotions if downstream enrollment creation fails, preserving seat availability.

#### Scenario: Revert promotion on enrollment creation failure
- **WHEN** the system receives an `EnrollmentCreationFailed` domain event for a promoted waitlist candidate
- **THEN** the system SHALL load the batch with write-locking, verify if the candidate status is `Promoted` and the correlation ID matches, update the candidate's waitlist status to `Held` (or `Suspended`), populate `statusReason` with the enrollment failure description, clear the `promotionCorrelationId`, decrement the batch's `currentEnrollmentCount` by 1, and trigger a new waitlist promotion check.

---

### Requirement: Manual Waitlist Skip (FR-CRS-010-SKIP)
The system SHALL support manually skipping a blocked waitlist candidate (due to holds, civil ID blocks) and triggering the next candidate promotion.

#### Scenario: Manually skip a blocked candidate
- **WHEN** a skip request is received for a waitlist entry ID (`waitlistId`) with status `Waiting` from a user with `batch.waitlist.manage` permission
- **THEN** the system SHALL acquire a pessimistic write-lock (`SELECT FOR UPDATE`) on the parent Batch row, update the candidate's waitlist status to `Held`, populate `statusReason` (e.g. "Manual Skip: Holds"), preserve their place out of the FIFO sequence, decrement subsequent positions, and immediately promote the next candidate.

---

### Requirement: Manual Waitlist Removal (FR-CRS-010-REMOVE)
The system SHALL support removing a student or lead from the waitlist, shifting subsequent positions.

#### Scenario: Remove candidate from waitlist
- **WHEN** a request to remove a waitlist entry with status `Waiting` is received from a user with `batch.waitlist.manage` permission
- **THEN** the system SHALL acquire a pessimistic write-lock (`SELECT FOR UPDATE`) on the parent Batch row, change the status of the waitlist entry to `Removed`, decrement `queuePosition` for all subsequent entries by 1, and write a `WAITLIST_ENTRY_REMOVED` audit record.

---

### Requirement: Manual Waitlist Reactivation (FR-CRS-010-REACTIVATE)
The system SHALL support reactivating a held or suspended waitlist entry and appending them back into the active queue.

#### Scenario: Reactivate held or suspended candidate
- **WHEN** a reactivation request is received for a waitlist entry ID (`waitlistId`) with status `Held` or `Suspended` from a user with `batch.waitlist.manage` permission and active branch access
- **THEN** the system SHALL acquire a pessimistic write-lock (`SELECT FOR UPDATE`) on the parent Batch row, transition the status back to `Waiting`, calculate the next chronological queue position (`active.length + 1`), clear its `statusReason`, and write audit logs.

---

### Requirement: Waitlist Scoping Guard
The system SHALL restrict waitlist operations to authorized users within the active branch context of the batch.

#### Scenario: Reject waitlist action if user lacks branch access or correct permission
- **WHEN** enqueuing, reordering, promoting, skipping, removing, or reactivating waitlist entries is requested for a batch
- **THEN** the system SHALL verify the user has the `batch.waitlist.manage` permission and active branch authorization for the batch's branch ID in their `UserBranchAccess` configuration, failing which it SHALL reject the operation and return a `403 Forbidden` response.

