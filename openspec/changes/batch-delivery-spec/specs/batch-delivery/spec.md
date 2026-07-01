## ADDED Requirements

### Requirement: Batch Creation and Validity (FR-CRS-006)
The system SHALL support creating training delivery batches linked to active courses and branches, enforcing code uniqueness and chronological execution date ranges.

#### Scenario: Successfully create batch draft
- **WHEN** a batch creation request is submitted with a unique uppercase code, valid bilingual names, active Course ID, active Branch ID, and start/end dates that fall entirely within the parent course's effective date range
- **THEN** the system SHALL persist the batch in a `Draft` status, set `currentEnrollmentCount = 0`, and log a `BATCH_CREATED` audit event.

#### Scenario: Reject batch if code already exists
- **WHEN** a batch is created with a code that already exists in the database
- **THEN** the system SHALL reject the operation and throw a `DuplicateBatchCode` DomainError (`ERR_CRS_DUPLICATE_BATCH_CODE`).

#### Scenario: Reject batch if dates exceed course validity range
- **WHEN** a batch creation date range falls outside the effective start or end date of its parent course
- **THEN** the system SHALL reject the creation and return a validation error.

---

### Requirement: Batch State Transitions & Events (FR-CRS-007)
The system SHALL control batch operational status changes (Draft -> OpenForEnrollment -> InProgress -> Completed / Cancelled), publishing transactional outbox events for downstream context reactions.

#### Scenario: Transition Draft to Open For Enrollment requires trainer
- **WHEN** a request to change batch status to `OpenForEnrollment` is received, and the batch trainer allocation list is empty
- **THEN** the system SHALL block the transition and throw a `BatchNoTrainer` DomainError (`ERR_CRS_BATCH_NO_TRAINER`).

#### Scenario: Completing a batch triggers async evaluation
- **WHEN** a batch is transitioned to `Completed` status
- **THEN** the system SHALL transition status, record the change, and publish a `BatchCompleted` domain event to the outbox to trigger asynchronous student completion checks downstream.

#### Scenario: Cancelling a batch triggers async enrollment release
- **WHEN** a batch status is transitioned to `Cancelled`
- **THEN** the system SHALL transition status, record the change, and publish a `BatchCancelled` domain event to the outbox to trigger enrollment deactivation and refund processes downstream.

---

### Requirement: Capacity Control Allocation (FR-CRS-008)
The system SHALL expose API services for external contexts to request and verify seat allocations, enforcing seat limits and waiting list redirections.

#### Scenario: Successfully allocate seat within capacity
- **WHEN** a seat allocation request is received, and `currentEnrollmentCount + requestedSeats <= capacity`
- **THEN** the system SHALL increment the count, save the batch, and return success.

#### Scenario: Handle seat allocation overflow with overbooking enabled
- **WHEN** a seat allocation is requested on a full batch and `allowOverbooking = true`
- **THEN** the system SHALL increment the count, record the overbooking, and return success.

#### Scenario: Redirect to waiting list on capacity overflow
- **WHEN** a seat allocation is requested on a full batch, `allowOverbooking = false` and `waitingListEnabled = true`
- **THEN** the system SHALL reject the allocation and return a `WAITLIST_REDIRECT` status code.

#### Scenario: Block seat allocation when batch is full
- **WHEN** a seat allocation is requested on a full batch, `allowOverbooking = false` and `waitingListEnabled = false`
- **THEN** the system SHALL reject the request and throw a `BatchFull` DomainError (`ERR_CRS_BATCH_FULL`).

---

### Requirement: Corporate & Walk-in Configuration (FR-CRS-013, FR-CRS-014)
The system SHALL support configuring corporate-scoped overrides and walk-in configurations (allowing compressed schedules and rapid completion checks).

#### Scenario: Walk-in batch requires course walk-in authorization
- **WHEN** a user attempts to toggle `isWalkIn = true` on a batch, but the parent course has `allowWalkInCompletion = false`
- **THEN** the system SHALL reject the update and throw a validation error.

---

### Requirement: Corporate & Capacity Events Handling
The system SHALL support B2B corporate batch configuration overrides and emit outbox events for seat utilisation changes.

#### Scenario: Setup corporate batch client and pricing overrides
- **WHEN** a batch is configured with `corporateAccountId` and a corporate pricing override is submitted
- **THEN** the system SHALL link the corporate client, persist the batch override pricing, and emit a `BatchPricingOverridden` event to the outbox.

#### Scenario: Emit event when batch capacity is fully reached
- **WHEN** a seat allocation is processed that increments the `currentEnrollmentCount` exactly to its `capacity` limit
- **THEN** the system SHALL emit a `BatchCapacityReached` domain event to the outbox to alert counselors and registrars.

---

### Requirement: Batch Scoping and Branch Isolation
The system SHALL restrict batch listing, creation, and mutation queries based on the user's active session branch and consolidated report permissions.

#### Scenario: Filter batch queries by active branch context
- **WHEN** a list query for batches is executed by a user with `batch.delivery.view` permission, and the user lacks `consolidatedVisibility` reporting privileges
- **THEN** the system SHALL restrict the results to only include batches belonging to the user's active session branch.

#### Scenario: Enforce branch check during batch creation
- **WHEN** a user attempts to create a batch at a specific `branchId`, but the user lacks access authorization to that branch in their `UserBranchAccess` settings
- **THEN** the system SHALL reject the operation and return a `403 Forbidden` response.


