# batch-delivery Specification

## Purpose

TBD - created by archiving change batch-delivery-spec. Update Purpose after archive.

## Requirements

### Requirement: Batch Creation and Validity (FR-CRS-006)

The system SHALL support creating training delivery batches linked to active courses and branches, enforcing code uniqueness, branch access authorization, and chronological execution date ranges matching parent course effective limits, normalizing inputs to GST.

#### Scenario: Successfully create batch draft

- **WHEN** a batch creation request is submitted with a unique uppercase code, valid bilingual names, active Course ID (whose status is `Published`), active Branch ID, and start/end dates that fall entirely within the parent course's effective date range
- **THEN** the system SHALL persist the batch in a `Draft` status, set `currentEnrollmentCount = 0`, and log a `BATCH_CREATED` audit event.

#### Scenario: Reject batch if code already exists

- **WHEN** a batch is created with a code that already exists in the database
- **THEN** the system SHALL reject the operation and throw a `DuplicateBatchCode` DomainError (`ERR_CRS_DUPLICATE_BATCH_CODE`).

#### Scenario: Reject batch if dates exceed course validity range

- **WHEN** a batch creation date range falls outside the effective start or end date of its parent course
- **THEN** the system SHALL reject the creation and return a validation error (`ERR_CRS_INVALID_DATE_RANGE`).
- **NOTE** If the parent course has a `NULL` effective end date, this check SHALL succeed since the course is valid indefinitely.

#### Scenario: Reject batch if date range is chronologically invalid

- **WHEN** a batch is created with a `startDate < current_date` or `endDate <= startDate`
- **THEN** the system SHALL reject the operation and return a validation error (`ERR_CRS_INVALID_DATE_RANGE`).

#### Scenario: Reject batch if parent course is not published

- **WHEN** a batch is created for a course whose status is not `Published`
- **THEN** the system SHALL reject the creation and throw a validation error.

#### Scenario: Enforce GST Timezone Normalization

- **WHEN** a batch is created or updated with dates and session times
- **THEN** the system SHALL normalize all datetime fields and comparisons relative to Gulf Standard Time (GST, UTC+4) timezone to avoid offset shifts.

---

### Requirement: Batch State Transitions & Events (FR-CRS-007)

The system SHALL control batch operational status changes (Draft -> OpenForEnrollment -> InProgress -> Completed / Cancelled), publishing transactional outbox events for downstream context reactions, cascading status transitions to child sessions.

#### Scenario: Transition Draft to Open For Enrollment requires a Primary Trainer

- **WHEN** a request to change batch status to `OpenForEnrollment` is received, and the batch does not have an active trainer assigned with the role of `Primary`
- **THEN** the system SHALL block the transition and throw a `BatchNoTrainer` DomainError (`ERR_CRS_BATCH_NO_TRAINER`).

#### Scenario: Starting a batch requires reaching start date

- **WHEN** a batch transition request to `InProgress` is received, and the current date is before the batch `startDate`
- **THEN** the system SHALL block the transition and return an `ERR_CRS_INVALID_STATE_TRANSITION` error.

#### Scenario: Completing a batch requires all sessions to be in the past

- **WHEN** a batch transition request to `Completed` is received, and there are scheduled sessions with dates or times in the future
- **THEN** the system SHALL block the transition and return an `ERR_CRS_INVALID_STATE_TRANSITION` error.

#### Scenario: Completing a batch triggers async evaluation

- **WHEN** a batch is transitioned to `Completed` status
- **THEN** the system SHALL transition status, record the change, and publish a `BatchCompleted` domain event to the outbox to trigger asynchronous student completion checks downstream.

#### Scenario: Cancelling a batch triggers async enrollment release and session cascades

- **WHEN** a batch status is transitioned to `Cancelled`
- **THEN** the system SHALL update the batch status, mark all associated scheduled `Session` records as `isDeleted = true` with `status = 'Cancelled'`, and publish a `BatchCancelled` domain event to the outbox.

---

### Requirement: Capacity Control Allocation & Release (FR-CRS-008)

The system SHALL expose services for external contexts to request and verify seat allocations, enforcing seat limits, batch execution states, and handling seat release upon student de-enrollment.

#### Scenario: Successfully allocate seat within capacity in open status

- **WHEN** a seat allocation request is received, the batch status is `OpenForEnrollment`, and `currentEnrollmentCount + requestedSeats <= capacity`
- **THEN** the system SHALL increment the count, save the batch, and return success.

#### Scenario: Block seat allocation in non-registration states

- **WHEN** a seat allocation is requested on a batch whose status is `Draft`, `Completed`, or `Cancelled`
- **THEN** the system SHALL reject the allocation and throw an `ERR_CRS_INVALID_STATE_TRANSITION` error.

#### Scenario: Block standard seat allocation in progress

- **WHEN** a seat allocation is requested on a batch whose status is `InProgress` and `allowOverbooking = false`
- **THEN** the system SHALL reject the allocation and throw a `BatchFull` DomainError (`ERR_CRS_BATCH_FULL`).

#### Scenario: Handle seat allocation overflow with overbooking enabled

- **WHEN** a seat allocation is requested on a full batch (or in-progress batch) and `allowOverbooking = true`
- **THEN** the system SHALL increment the count, record the overbooking, and return success.

#### Scenario: Redirect to waiting list on capacity overflow

- **WHEN** a seat allocation is requested on a full batch in `OpenForEnrollment` status, `allowOverbooking = false` and `waitingListEnabled = true`
- **THEN** the system SHALL reject the allocation and return a `WAITLIST_REDIRECT` status code.

#### Scenario: Block seat allocation when batch is full and waitlist is disabled

- **WHEN** a seat allocation is requested on a full batch, `allowOverbooking = false` and `waitingListEnabled = false`
- **THEN** the system SHALL reject the request and throw a `BatchFull` DomainError (`ERR_CRS_BATCH_FULL`).

---

### Requirement: Waitlist FIFO Promotion (FR-CRS-010)

The system SHALL support promoting waitlisted students chronologically when batch seats are released.

#### Scenario: Auto-promote waitlist candidate on student cancellation

- **WHEN** the `EnrollmentCancelled` domain event is received, and there are active candidate records in `WaitingList` (status `Waiting`) for the batch, and a seat has been freed below capacity
- **THEN** the system SHALL promote the first candidate (status `Promoted`), shift subsequent candidates positions (decrementing `queuePosition`), keep `currentEnrollmentCount` at original (since the promoted student occupies the seat), and publish a `WaitlistStudentPromoted` event to the outbox.

#### Scenario: Enforce manual waitlist promotion rules

- **WHEN** a manual promotion request is received (`POST /api/v1/batches/:id/waitlist/promote`), and the batch capacity has not cleared, and `allowOverbooking = false`
- **THEN** the system SHALL reject the operation and throw an `ERR_CRS_BATCH_FULL` error.

---

### Requirement: Trainer Assignment & Scheduling Conflicts

The system SHALL validate trainer schedules across batches to prevent double-booking, over-allocation, or scheduling on public holidays. To preserve Bounded Context separation, the timetable sessions SHALL be queried through a public Scheduling application service interface.

#### Scenario: Successfully assign active primary trainer

- **WHEN** a trainer assignment request is submitted with a valid batch ID, active trainer profile ID, assignment role `Primary`, and date range matching the batch duration
- **THEN** the system SHALL create a `BatchTrainer` record, update the status to active, log `TRAINER_ASSIGNED_TO_BATCH` audit event, and publish a `TrainerAssignedToBatch` event to the outbox.

#### Scenario: Reject trainer assignment when branch access is missing

- **WHEN** a trainer assignment request is submitted and the authenticated user does not have active branch access for the batch branch
- **THEN** the system SHALL reject the assignment and return a `403 Forbidden` response.

#### Scenario: Reject trainer assignment if dates fall outside batch limits

- **WHEN** a trainer assignment start date is prior to the batch start date or the assignment end date exceeds the batch end date
- **THEN** the system SHALL reject the assignment and return a validation error.

#### Scenario: Reject trainer assignment if batch is closed

- **WHEN** a trainer assignment request targets a batch in `Completed` or `Cancelled` status
- **THEN** the system SHALL reject the assignment and return a validation error.

#### Scenario: Enforce single primary trainer constraint per date range

- **WHEN** a trainer assignment is requested as `Primary` role, and there is already another active `Primary` trainer assigned to that batch for an overlapping date range
- **THEN** the system SHALL reject the assignment and throw a `PrimaryTrainerAlreadyAssigned` DomainError (`ERR_CRS_PRIMARY_TRAINER_ALREADY_ASSIGNED`).

#### Scenario: Block assignment on scheduling overlaps

- **WHEN** a trainer assignment is requested, and the trainer is already booked for another batch session with overlapping date and time intervals (queried via the Scheduling context's availability contracts)
- **THEN** the system SHALL reject the assignment and throw a `TrainerScheduleConflict` DomainError (`ERR_CRS_TRAINER_SCHEDULE_CONFLICT`) with conflict details including batch code, date, and time.

#### Scenario: Block batch activation if no trainer is assigned (BR-CRS-014)

- **WHEN** a batch status transition to `OpenForEnrollment` is requested, but no active `Primary` trainer is registered in the batch trainer list
- **THEN** the system SHALL block the transition and return an `ERR_CRS_BATCH_NO_TRAINER` validation error.

---

### Requirement: Session Lifecycle Integration

Training Delivery sessions SHALL be managed and validated by the Scheduling context's Conflict Engine.

#### Scenario: Marking session as conflict due to external change

- **WHEN** a Scheduling event (e.g., `HolidayCreated`, `VenueBlockCreated`) occurs that invalidates an existing batch session
- **THEN** the Training Delivery context SHALL update the session's status to `Conflict` and surface it on the Conflict Dashboard

---

### Requirement: Batch Details Modification Guards

The system SHALL validate updates to batch details, preventing capacity constraints violation and date shifts on active classes.

#### Scenario: Reject capacity reduction below active enrollment count

- **WHEN** a batch update request is received that reduces `capacity` below the `currentEnrollmentCount`, and `allowOverbooking = false`
- **THEN** the system SHALL reject the update and throw a validation error.

#### Scenario: Prevent batch date changes during active execution

- **WHEN** a batch update request attempts to modify `startDate` or `endDate` on a batch whose status is `InProgress`, `Completed`, or `Cancelled`
- **THEN** the system SHALL reject the update and return a validation error.

---

### Requirement: Corporate & Walk-in Configuration (FR-CRS-013, FR-CRS-014)

The system SHALL support configuring corporate-scoped overrides and walk-in configurations (allowing compressed schedules and rapid completion checks).

#### Scenario: Walk-in batch requires course walk-in authorization

- **WHEN** a user attempts to toggle `isWalkIn = true` on a batch, but the parent course has `allowWalkInCompletion = false`
- **THEN** the system SHALL reject the update and throw a validation error (`ERR_CRS_WALKIN_COMPLETION_NOT_ALLOWED`).

#### Scenario: Verify corporate client existence

- **WHEN** a batch is configured with `corporateAccountId`
- **THEN** the system SHALL programmatically verify that the corporate account exists and is active in the CRM context, rejecting the update if the account is invalid.

#### Scenario: Verify classroom reference existence

- **WHEN** a batch is configured with `classroomId` or a session has a logical `classroomId` assigned
- **THEN** the system SHALL programmatically verify that the classroom exists and is active in the Organization context, rejecting the transaction if invalid.

---

### Requirement: Corporate & Capacity Events Handling

The system SHALL support B2B corporate batch configuration overrides and emit outbox events for seat utilisation changes.

#### Scenario: Setup corporate batch client and pricing overrides

- **WHEN** a batch is configured with `corporateAccountId` and a corporate pricing override is submitted
- **THEN** the system SHALL link the corporate client, persist the batch override pricing (in `CoursePricing`), and emit a `BatchPricingOverridden` event to the outbox.

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

#### Scenario: Enforce branch check during updates and transitions

- **WHEN** a user attempts to update details (`PUT /api/v1/batches/:id`) or execute state transitions (`PUT /api/v1/batches/:id/status`), and the batch `branchId` is not within the user's authorized branch list
- **THEN** the system SHALL deny access and return a `403 Forbidden` response.

---

### Requirement: Batch Delivery Navigation and Menu Scope

The Training Delivery/Batches menu items and list pages MUST be protected by the `batch.delivery.menu.view` permission code.

#### Scenario: Display Training Delivery in sidebar to authorized users
- **WHEN** the portal shell resolves navigation for a user
- **THEN** the system MUST display the "Training Delivery" menu and its items (including the list and dashboard link) only if the user has the `batch.delivery.menu.view` permission.

---

### Requirement: Batches Dashboard 60-Day Default Display

The Batches Dashboard MUST default to filtering batches where `startDate >= today - 60 days`.

#### Scenario: Load Batches Dashboard with default 60-day filter
- **WHEN** the user visits `/dashboards/batches` without explicit query parameters
- **THEN** the system MUST calculate the default start date boundary: `startDateLimit = today - 60 days`.
- **AND** the system MUST query and display batch operational metrics (total, open, in progress, draft, cancelled) and capacities starting from `startDateLimit` within the user's branch scope.

---

### Requirement: Batches Dashboard Advanced Filtering

The Batches Dashboard MUST provide a bottom floating action button (FAB) filter icon. Clicking it displays a dialog with filter parameters:
*   Start Date (`startDate`)
*   End Date (`endDate`)
*   Course (`courseId`)
*   Status (`status`)
*   Branch (`branchId`)
These values MUST synchronize with URL query parameters.

#### Scenario: Filter batches dashboard using FAB dialog
- **WHEN** the user clicks the bottom filter icon on the Batches Dashboard
- **THEN** the system MUST show the filter inputs modal.
- **WHEN** the user selects a course and date range, then clicks "Apply"
- **THEN** the system MUST route to the path with updated query parameters (e.g. `?courseId=X&startDate=2026-05-10`).
- **AND** the page MUST re-render with filtered counts and rosters.

---

### Requirement: Batches Dashboard Applied Filters Info Banner

The Batches Dashboard MUST render a summary of the currently applied filter criteria at the top of the page below the header.

#### Scenario: Render applied filters summary banner on batches dashboard
- **WHEN** the batches dashboard loads with query parameters in the URL
- **THEN** the system MUST display the applied filter summary text (e.g., "Date Range: 2026-05-10 to 2026-07-09 | Course: English Level 1") at the top of the page.
- **AND** the system MUST display a "Reset Filters" button.

---

### Requirement: Unified Form Entry Layout for Batches
The batch creation and update forms MUST present all configuration fields in a single, unified view, completely eliminating multi-step wizard stepper navigation.
The forms MUST NOT display a Batch Code entry or lookup field in either create or edit flows.

#### Scenario: Submitting Create Form without Manual Batch Code
- **WHEN** an administrator fills in Course, Branch, Name, Dates, and Capacity Limit on the unified page, and clicks "Create Batch"
- **THEN** the client payload MUST NOT contain a pre-generated `batchCode`.
- **AND** the system MUST successfully submit the form to the backend to auto-allocate the batch code.

---

### Requirement: Backend Sequential Batch Code Allocation
The training delivery context MUST generate sequential batch codes on the backend during creation when the batch code is not supplied.
The code format MUST be `[Parent Course Code]-[Three Digit Sequential Suffix]` (e.g. `PY-101-001`).

#### Scenario: Resolving Next Sequence Suffix
- **WHEN** a batch is created for a course with code `PY-101`
- **AND** there are currently 2 existing batches registered for `PY-101` in the database
- **THEN** the system MUST automatically allocate `PY-101-003` as the new batch's code.
- **AND** the validation MUST ensure the code passes format checks (`/^[A-Z0-9-]{3,20}$/`) and uniqueness checks before saving.
