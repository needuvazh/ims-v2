## 1. Database Setup

- [x] 1.1 Run a consolidated schema migration in `schema.prisma` adding `Batch` and `Session` (with audit, version, and indexes).
- [x] 1.2 Implement the **full database models** (not stubs) in `schema.prisma` for `CoursePricing` (extend fields), `CourseDiscount` (new table), `CourseCompletionRule` (extend fields), `BatchTrainer` (new table), and `WaitingList` (new table, with composite unique indexes to prevent active duplicate entries).
- [x] 1.3 Configure indexes on all Module 06 tables for branch-scoping, price resolution, and waitlist uniqueness.
- [x] 1.4 Generate and apply migrations to the database.

## 2. Domain & Application Logic (packages/training-delivery)

- [x] 2.1 Create training-delivery package structure.
- [x] 2.2 Implement `Batch` aggregate root class with `batch.allocateSeat()`, `batch.releaseSeat()`, `batch.addWaitlistEntry()`, `batch.promoteWaitlist()`, and status validator checks.
- [x] 2.3 Implement the Application Service handler for batch creation, details updating, and state changes, enforcing branch scoping, GST (UTC+4) timezone normalizations, and logical classroom/corporate active checks.
- [x] 2.4 Add Outbox event publishing routines for `BatchCreated`, `BatchCompleted`, `BatchCancelled`, `BatchCapacityReached`, `BatchPricingOverridden`, `TrainerAssignedToBatch`, and `WaitlistStudentPromoted`.
- [x] 2.5 Implement a thread-safe seat allocation service using raw database write-locking checks, verifying that batch status is `OpenForEnrollment` (or `InProgress` with overbooking enabled) and blocking bookings in all other states.
- [x] 2.6 Implement the event subscriber listening for `EnrollmentCancelled` to trigger seat release and automatic FIFO waitlist promotion, and cascade `Cancelled` status + logical deletion to all batch sessions during cancellation.
- [x] 2.7 Implement validators for batch state transitions (verifying `current_date >= startDate` for InProgress, checking that all scheduled sessions are in the past for Completed, and requiring at least one mapped trainer with role `Primary` for OpenForEnrollment).
- [x] 2.8 Enforce invariants on modifying batch details (capacity cannot fall below enrollment count, start/end dates cannot change once InProgress/Completed/Cancelled, and verify date ranges fit parent course effective boundaries).
- [x] 2.9 Implement `validateTrainerAssignment` validator check that queries `ISchedulingService` to intercept trainer timetabled session overlaps before assignments are saved, publishing `TrainerAssignedToBatch` on success.

## 3. API Delivery

- [x] 3.1 Expose `POST /api/v1/batches` endpoint for batch draft creation.
- [x] 3.2 Expose `PUT /api/v1/batches/:id` for modifying batch details with capacity/date/branch/classroom invariants.
- [x] 3.3 Expose `PUT /api/v1/batches/:id/status` for executing state transitions.
- [x] 3.4 Expose `POST /api/v1/batches/:id/trainers` for mapping trainer allocations and publishing outbox event.
- [x] 3.5 Expose `POST /api/v1/batches/:id/waitlist` for queueing candidates on the waitlist.
- [x] 3.6 Expose `POST /api/v1/batches/:id/waitlist/promote` for manually forcing promotion of a candidate.

## 4. UI Dashboard & Forms

- [x] 4.1 Implement `CRS-SCR-004` (Batch Listing Dashboard) with KPI header cards and grid toggles.
- [x] 4.2 Build `CRS-SCR-005` (Step 1 & 2: details and capacity wizard form steps) with validation check borders.
- [x] 4.3 Build basic shells for `CRS-SCR-008` (Trainer my batches) and `CRS-SCR-009` (Student lookup).

## 5. Automated Tests

- [x] 5.1 Write concurrency tests verifying batch capacity lock limits cannot be bypassed.
- [x] 5.2 Write integration tests checking outbox event records creation during status transitions.
- [x] 5.3 Write tests for FIFO waitlist promotion triggers upon cancellation events.
- [x] 5.4 Write tests for the `validateTrainerAssignment` scheduling conflict validator and trainer outbox event mapping.
- [x] 5.5 Write Playwright form tests for batch creation wizard inputs, checking timezone offsets.

## 6. Project Status Update

- [x] 6.1 Update `walkthrough.md` to document endpoints and screenshot instructions.
- [x] 6.2 Run `graphify update .` to keep AST knowledge graphs sync'd.
