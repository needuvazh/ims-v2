## Context

Training delivery is handled through batches. We need to implement database models, seat capacity checks using pessimistic lock boundaries, state-aware transitions, walk-in/corporate overrides, trainer scheduling guards, automatic FIFO waitlist promotions, logical classroom verifications, GST timezone (UTC+4) normalizations, and transactional outbox event publishing.

## Goals / Non-Goals

**Goals:**
- Provide CRUD handlers and state machine transitions for physical delivery batches.
- Implement transactional seat reservations (with optimistic/pessimistic lock mechanisms) that enforce batch lifecycle state validations.
- Validate trainer allocations against overlapping timetable sessions in the Scheduling context.
- Support Walk-In fast track setup and Corporate nominated pricing/account configurations.
- Automate FIFO waitlist promotions upon seat releases (such as student cancellation events).
- Publish `BatchCreated`, `BatchCompleted`, `BatchCancelled`, `BatchCapacityReached`, `BatchPricingOverridden`, `TrainerAssignedToBatch`, and `WaitlistStudentPromoted` outbox events.

**Non-Goals:**
- Creating actual student enrollment profiles (handled via the external Admissions context).
- Defining trainer scheduling profiles (handled by Scheduling context).

## Decisions

### 1. Database Schema
*   **Consolidated Schema Migration:** To resolve circular dependencies and prevent database truncation, a unified database migration will be applied to add/update all Module 06 entities in `schema.prisma`. We will fully implement the following models rather than using bare-bones stubs:
    *   `Batch`: fields `id`, `courseId` (FK), `branchId` (logical reference), `classroomId` (logical reference), `batchCode` (unique), `batchNameEnglish`, `batchNameArabic`, `startDate`, `endDate`, `capacity`, `currentEnrollmentCount`, `waitingListEnabled`, `allowOverbooking`, `isWalkIn`, `corporateAccountId` (logical reference), `status`, standard audit fields, and `version` (optimistic locking).
    *   `Session`: fields `id`, `batchId` (FK), `sessionNumber`, `titleEnglish`, `titleArabic`, `sessionDate`, `startTime`, `endTime`, `trainerId` (logical reference), `classroomId` (logical reference), `status`, standard audit fields, and `version` (optimistic locking).
    *   `CoursePricing` (extend fields): `id`, `courseId` (FK), `branchId` (logical), `batchId` (FK), `customerType`, `batchType`, `currency` (restricted to OMR), `basePrice`, `taxPercentage` (default 5.000), `effectiveStartDate`, `effectiveEndDate`, `status`, and audit fields.
    *   `CourseDiscount` (new table): `id`, `courseId` (FK), `branchId`, `batchId` (FK), `discountType`, `discountMode`, `discountValue`, `requiresApproval`, `effectiveStartDate`, `effectiveEndDate`, `status`, and audit fields.
    *   `CourseCompletionRule` (extend fields): `id`, `courseId` (FK), `minimumAttendancePercent`, `examRequired`, `feeClearanceRequired`, `manualApprovalRequired`, `effectiveStartDate`, `effectiveEndDate`, `status`, and audit fields.
    *   `BatchTrainer` (new table): `id`, `batchId` (FK), `trainerId` (logical), `role` (Primary, Assistant, Observer), `assignedFrom`, `assignedTo`, `status`, and audit fields.
    *   `WaitingList` (new table): `id`, `courseId` (FK), `batchId` (FK), `studentId` (logical), `leadId` (logical), `queuePosition`, `status` (Waiting, Promoted, Removed), and audit fields.
*   **Indexes & Constraints:** 
    *   `Batch`: `@@index([courseId])`, `@@index([branchId])`, `@@index([classroomId])`, `@@index([corporateAccountId])`
    *   `Session`: `@@index([batchId])`, `@@index([trainerId])`, `@@index([classroomId])`, `@@index([sessionDate])`
    *   `WaitingList`: `@@unique([studentId, batchId, status])` and `@@unique([leadId, batchId, status])` to prevent active duplicates when status is `Waiting`.
*   **Logical Cascades:** When a batch is cancelled or deleted, the application service layer must cascade the deletion logically: marking associate trainer rows and waitlist rows as deleted, and updating associated `Session` records to `status = 'Cancelled'` and `isDeleted = true` inside the same transaction block.

### 2. Transactional & State-Aware Seat Allocation
*   Seat reservation runs inside an Application Service transaction using a pessimistic write-lock (`SELECT FOR UPDATE` implemented via Prisma raw queries).
*   **State Verification:** Seat allocations must check the batch's `status` attribute. Allocations are only permitted when `status == 'OpenForEnrollment'` (or `status == 'InProgress' && allowOverbooking == true`). Allocations are strictly blocked for batches in `Draft`, `Completed`, or `Cancelled` states.
*   Mutations on `currentEnrollmentCount` are encapsulated within `batch.allocateSeat()` and `batch.releaseSeat()` aggregate methods.

### 3. Automatic Waitlist Promotion & Event-Driven Seat Release
*   **Waitlist Promotion:** The `training-delivery` backend will implement a listener for the `EnrollmentCancelled` domain event.
*   Instead of just decrementing `currentEnrollmentCount`, the transaction will load the batch under a write-lock (`FOR UPDATE`), verify if there is a candidate in `WaitingList` (ordered FIFO by `queuePosition`), promote the first candidate by updating their status to `Promoted`, shift subsequent queue positions, and emit `WaitlistStudentPromoted` to the outbox. The count remains unchanged since the promoted candidate occupies the released seat.

### 4. Trainer Assignment & Timetable Conflict Check
*   Trainer mappings are managed via `POST /api/v1/batches/:id/trainers`.
*   During assignment, a domain service check (`validateTrainerAssignment`) intercepts potential double-bookings:
    1.  Verifies the assignment dates (`assignedFrom`/`assignedTo`) fall within the batch dates.
    2.  Queries the Scheduling context via `ISchedulingService.getSessionsByBatch(batchId)` and `ISchedulingService.getSessionsForBatches(...)` to compare session times.
    3.  If any day-and-time overlap is detected, it throws `ERR_CRS_TRAINER_SCHEDULE_CONFLICT`.
    4.  Limits primary trainers to exactly one active assignment per date range.
*   Upon successful trainer mapping, the application service will record a `TrainerAssignedToBatch` event in the Outbox to allow external contexts (Scheduling and Calendar) to react.

### 5. Outbox Integration
*   Outbox events published: `BatchCreated`, `BatchCompleted`, `BatchCancelled`, `BatchCapacityReached`, `BatchPricingOverridden`, `TrainerAssignedToBatch`, and `WaitlistStudentPromoted`.
*   Events subscribed: `EnrollmentCancelled` (from Admissions context) for triggering automatic seat release and waitlist promotion.

### 6. Batch Modification & Branch Invariants
*   Updates to batch details via `PUT /api/v1/batches/:id` and transitions via `PUT /api/v1/batches/:id/status` must enforce:
    1.  **Capacity bounds:** Prevent reducing `capacity` below the `currentEnrollmentCount` unless `allowOverbooking = true`.
    2.  **Date changes:** Restrict start/end date changes if the batch is in `InProgress` or `Completed` (and also `Cancelled`). Verify date changes fit parent course effective ranges (handling nullable course end dates safely).
    3.  **Course Active Check:** Reject creating/updating batches for courses that are not in the `Published` active state.
    4.  **Branch Scoping:** Restrict modifications (creation, updates, status transitions, and trainer assignments) to users with write access permissions matching the batch's `branchId` (or possessing consolidated visibility permissions).
    5.  **Corporate Account Validation:** Programmatically verify that logical corporate references exist and are active in the CRM context.
    6.  **Classroom Reference Verification:** Programmatically verify that logical classroom references exist and are active in the Organization context before batch creation/modification or session updates.
    7.  **Timezone Normalization (GST, UTC+4):** Normalise all datetime inputs, storage, and date calculations relative to Gulf Standard Time (GST, UTC+4) as required by ASTI compliance.

## Risks / Trade-offs

- **Lock Contention:** Pessimistic lock on batch rows during high concurrent registrations. We choose this to guarantee exact capacity limits (avoiding overfill) and correct waitlist promotions, keeping the transaction runtime as short as possible.
