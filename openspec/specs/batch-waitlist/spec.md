# batch-waitlist Specification

## Purpose
Specifies waitlisting rules, promotion workflows, and capacity constraints for coaching batch delivery management.
## Requirements
### Requirement: Waiting List Queuing (FR-CRS-009)

The system SHALL support enqueuing student profiles or CRM leads into a batch's waiting list when seat capacity is reached, maintaining chronological queue positions.

#### Scenario: Enqueue student profile to waitlist (Internal Command)
- **WHEN** an internal queue request is received containing a valid student profile ID (and optionally `enrollmentId` if triggered via the enrollment lifecycle flow)
- **THEN** the system SHALL acquire a pessimistic write-lock (`SELECT FOR UPDATE`) on the parent Batch row, verify the candidate satisfies all validation constraints, create a `WaitingList` record with status `Waiting` referencing `studentProfileId` and `enrollmentId`, and assign the next sequential FIFO `queuePosition` number.

#### Scenario: Public waitlist request contract split
- **WHEN** a public request to enqueue is received on the `/api/v1/batches/[id]/waitlist` (POST) API boundary
- **THEN** the system Zod schema SHALL only accept `studentProfileId` or `leadId` in the request body.
- **AND** reject any payload containing `enrollmentId` with a `400 Bad Request` to prevent client injection of internal orchestration data.

#### Scenario: Enforce database-level uniqueness constraints
- **WHEN** enqueuing a candidate to a waitlist or creating an enrollment
- **THEN** the system database layer SHALL reject duplication attempts via partial unique indexes:
  - For active waitlist entries: `studentProfileId` + `batchId` where `status = 'Waiting'` and `isDeleted = false` must be unique.
  - For pending enrollments: `studentProfileId` + `batchId` where `enrollmentStatus` is in `('Draft', 'Submitted', 'Approved', 'Confirmed', 'Active')` and `isDeleted = false` must be unique.

#### Scenario: Prevent duplicate active waitlist entries (BR-CRS-019)
- **WHEN** a request to enqueue a student profile or lead is received, and there is already an active waitlist entry in `Waiting` status for that same student profile/lead and batch
- **THEN** the system SHALL reject the operation, throw an `ERR_CRS_DUPLICATE_WAITLIST` validation error, and return a `400 Bad Request` response.

#### Scenario: Reject waitlist enqueuing for inactive student profiles
- **WHEN** a request is received to enqueue a student profile ID
- **AND** the `StudentProfile` status is not `Active` (i.e. `Suspended` or `Inactive`) or has `isDeleted = true` (or the parent `Person` record has `isDeleted = true`)
- **THEN** the system SHALL reject the operation, throw an `ERR_STU_PROFILE_INACTIVE` error, and return a `422 Unprocessable Entity` response.

#### Scenario: Reject waitlist enqueuing for invalid CRM leads
- **WHEN** a request is received to enqueue a lead ID
- **AND** the lead stage is `Converted` (indicating they are already a student)
- **THEN** the system SHALL reject the operation, throw `ERR_CRM_LEAD_ALREADY_CONVERTED`, and return a `422 Unprocessable Entity` response.
- **AND** if the lead stage is `Lost` or has `isDeleted = true`, the system SHALL reject the operation, throw `ERR_CRM_LEAD_INACTIVE`, and return a `422 Unprocessable Entity` response.

#### Scenario: Enforce candidate branch scoping checks and admission prerequisite
- **WHEN** enqueuing a student profile into a batch's waitlist
- **AND** the student profile has no approved or submitted admission in the batch's branch context
- **THEN** the system SHALL reject the operation, throw `ERR_AUTH_BRANCH_DENIED`, and return a `403 Forbidden` response.
- **AND** when enqueuing a lead, if the lead's `branchId` does not match the batch's `branchId`, the system SHALL reject the operation and throw `ERR_AUTH_BRANCH_DENIED`.

#### Scenario: Validate batch status invariants
- **WHEN** enqueuing a candidate to a batch's waitlist
- **AND** the batch status is not `OpenForEnrollment` (`OPEN`) and not `InProgress` (`IN_PROGRESS`)
- **THEN** the system SHALL reject the operation, throw `ERR_CRS_INVALID_BATCH_STATE`, and return a `400 Bad Request` response.

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

### Requirement: Waitlist Scoping Guard

The system SHALL restrict waitlist operations to authorized users within the active branch context of the batch.

#### Scenario: Reject waitlist action if user lacks branch access or correct permission
- **WHEN** enqueuing, reordering, promoting, skipping, removing, or reactivating waitlist entries is requested for a batch
- **THEN** the system SHALL verify the user has the **`batch.waitlist.manage`** permission and active branch authorization for the batch's branch ID in their `UserBranchAccess` configuration, failing which it SHALL reject the operation and return a `403 Forbidden` response with `ERR_IAM_INSUFFICIENT_PERMISSIONS`.

---

### Requirement: Redesigned Enrollment Capacity check (FR-ENR-003-MOD)

The system SHALL include waitlist promotions in the active reservation count to prevent regular enrollments from front-running promoted waitlist candidates.

#### Scenario: Count promoted waitlist entries in active batch capacity
- **WHEN** a Branch Manager attempts to approve an enrollment for a student in a batch
- **THEN** the system SHALL calculate the total reserved seats as:
  $$\text{reservedSeats} = \text{activeEnrollmentsCount} + \text{promotedWaitlistCount}$$
  where `activeEnrollmentsCount` counts enrollments in `Approved`, `Confirmed`, or `Active` status, and `promotedWaitlistCount` counts waitlist entries in `Promoted` status.
- **AND** if `reservedSeats >= capacity`, the system SHALL block the approval and check waitlist rules.

#### Scenario: Bypass capacity block if candidate holds a promotion reservation
- **WHEN** a capacity check is executed during enrollment approval
- **AND** the student profile ID holds an active waitlist entry in `Promoted` status for the batch (looked up by `studentProfileId` and `batchId` before the capacity-block decision path)
- **THEN** the system SHALL bypass the capacity block and allow the enrollment to transition to `Approved`.
- **AND** upon successful enrollment approval, invoke `BatchService.resolveWaitlistEntry(studentProfileId, batchId, tx)` in the same transaction to transition the waitlist entry status to `Removed` (or set `isDeleted = true`) and clear the `promotionCorrelationId` to release the reservation.

---

### Requirement: Worker Promotion Event Subscriber (FR-CRS-010-SUB)

The worker process SHALL consume waitlist promotion events and orchestrate downstream enrollment approval deterministically.

#### Scenario: Handle WaitlistEntryPromoted outbox event
- **WHEN** the worker processes a `WaitlistEntryPromoted` event containing `enrollmentId` and `promotionCorrelationId`
- **THEN** the worker SHALL invoke `EnrollmentService.approveEnrollment(enrollmentId)` to transition the enrollment status to `Approved`.
- **AND** if `enrollmentId` is not present, search for a single pending enrollment in `Submitted` status for that `studentProfileId` and `batchId`. If exactly one is found, approve it.

---

### Requirement: Waitlist Promotion Reversion on Downstream Failure (FR-CRS-010-ALT)

The system SHALL support reverting waitlist promotions if downstream enrollment creation or approval fails, preserving seat availability.

#### Scenario: Revert promotion on enrollment creation/approval failure
- **WHEN** the worker processes an `EnrollmentCreationFailed` outbox event for a promoted waitlist candidate
- **AND** the event payload contains the candidate's `studentProfileId` (or `leadId`), `batchId`, and the `promotionCorrelationId` safety key
- **THEN** the system SHALL load the batch with write-locking (`SELECT FOR UPDATE`), verify the candidate's waitlist status is `Promoted` and the correlation ID matches, update the waitlist status to `Held` or `Suspended`, populate `statusReason` with the failure description, clear the `promotionCorrelationId`, decrement `currentEnrollmentCount` by 1 on the Batch, and trigger a new waitlist promotion check.

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
