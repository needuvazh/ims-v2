## 1. Database Setup

- [x] 1.1 Add `WaitingList` model to `schema.prisma` supporting enums (`Waiting`, `Promoted`, `Removed`, `Held`, `Suspended`), `statusReason` (String, nullable), and `promotionCorrelationId` (String, nullable).
- [x] 1.2 Add database indexes on `WaitingList`.
- [x] 1.3 Create a custom migration for PostgreSQL filtered unique indexes: `CREATE UNIQUE INDEX ... WHERE status = 'Waiting' AND is_deleted = false`.
- [x] 1.4 Generate and apply migrations.

## 2. Domain & Application Logic (packages/training-delivery)

- [x] 2.1 Implement `batch.addWaitlistEntry()` aggregate methods computing FIFO sequence order. Enforce pessimistic write-locking (`SELECT FOR UPDATE`) on the parent `Batch` row at the start of the transaction block.
- [x] 2.2 Implement `batch.promoteWaitlist()` aggregate methods updating sequence, setting `promotionCorrelationId`, and emitting standardized `WaitlistEntryPromoted`. Enforce parent `Batch` row lock.
- [x] 2.3 Implement `batch.revertPromotion()` aggregate root method handling `statusReason`, correlation checks, and seat decrement. Enforce parent `Batch` row lock.
- [x] 2.4 Implement `batch.skipWaitlistEntry()` aggregate root method setting `statusReason` and updating FIFO positions. Enforce parent `Batch` row lock.
- [x] 2.5 Implement `batch.reactivateWaitlistEntry()` aggregate root method transitioning from `Held`/`Suspended` to `Waiting` and placing at next chronological position. Enforce parent `Batch` row lock.
- [x] 2.6 Implement the Application Service command to reorder waitlist positions. Enforce parent `Batch` row lock.
- [x] 2.7 Create the event listener subscribing to `EnrollmentCancelled` that triggers aggregate promotion inside pessimistic lock boundaries.
- [x] 2.8 Create the event listener subscribing to `EnrollmentCreationFailed` that triggers aggregate promotion reversion, decrementing count, and running promotion checking.
- [x] 2.9 Implement a capacity-increase promotion hook in `batchService.update` to automatically promote candidates from the waitlist when the batch capacity is increased within the same transaction.
- [x] 2.10 Refactor `packages/training-delivery` to emit the standardized `WaitlistEntryPromoted` event type instead of the old `WaitlistStudentPromoted` event type.

## 3. API Handlers

- [x] 3.1 Expose route `POST /api/v1/batches/:id/waitlist` to enqueue. Verify permission `batch.waitlist.manage` and validate active branch scope. Enforce parent `Batch` row lock.
- [x] 3.2 Expose route `PUT /api/v1/batches/:id/waitlist/reorder` for reordering. Verify permission `batch.waitlist.manage` and validate active branch scope. Enforce parent `Batch` row lock.
- [x] 3.3 Expose route `POST /api/v1/batches/:id/waitlist/promote` for manual promotion override trigger. Lock body payload to accept `waitlistId`, verify permission `batch.waitlist.manage`, validate active branch scope, and enforce capacity checks (`ERR_CRS_BATCH_FULL` / `409 Conflict`). Enforce parent `Batch` row lock.
- [x] 3.4 Expose route `POST /api/v1/batches/:id/waitlist/skip` to skip a candidate. Verify permission `batch.waitlist.manage` and validate active branch scope. Enforce parent `Batch` row lock.
- [x] 3.5 Expose route `POST /api/v1/batches/:id/waitlist/reactivate` to reactivate a candidate. Verify permission `batch.waitlist.manage` and validate active branch scope. Enforce parent `Batch` row lock.
- [x] 3.6 Expose route `DELETE /api/v1/batches/:id/waitlist/:waitlistId` to cancel/remove a waitlist entry. Verify permission `batch.waitlist.manage` and validate active branch scope. Enforce parent `Batch` row lock.
- [x] 3.7 Refactor route files to emit `WaitlistEntryPromoted` outbox records.

## 4. UI Waitlist Widget

- [x] 4.1 Implement roster Details columns and Transfer buttons on screen `CRS-SCR-006` (exclude attendance warning highlights/mocks).
- [x] 4.2 Build **Waitlist Queue Manager Widget** on screen `CRS-SCR-006` with position numbers and promote/skip/remove/reactivate action buttons.
- [x] 4.3 Implement Drag-and-drop sortable lists UI handlers for waitlist reordering.
- [x] 4.4 Configure empty states representation.
- [x] 4.5 Resolve raw UUID labels inside the waitlist table on `CRS-SCR-006` by mapping them to student/lead full names.

## 5. Automated Tests

- [x] 5.1 Write unit tests for aggregate promotion FIFO shifts, parent locking, and status changes.
- [x] 5.2 Write integration tests checking auto-promotion logic on `EnrollmentCancelled` events.
- [x] 5.3 Write unit and integration tests verifying the `EnrollmentCreationFailed` listener, promotion reversion, and subsequent FIFO auto-promotion.
- [x] 5.4 Write integration tests verifying the capacity-increase auto-promotion hook in the update command transaction block.
- [x] 5.5 Write Playwright reordering tests validating drag handles.
- [x] 5.6 Write API tests verifying branch-scoping `403 Forbidden` blocks and `batch.waitlist.manage` permission guards.
- [x] 5.7 Write concurrency tests attempting parallel enqueues, promotes, and updates to verify pessimistic transaction locks prevent position duplicates.

## 6. Project Status Updates

- [x] 6.1 Update `docs/project-status.md` details.
