## 1. Database Setup

- [ ] 1.1 Add `Batch` model definition to `schema.prisma`.
- [ ] 1.2 Add `Session` model definition to `schema.prisma`.
- [ ] 1.3 Configure indexes on `Batch` and `Session`.
- [ ] 1.4 Generate and apply migrations to database.

## 2. Domain & Application Logic (packages/training-delivery)

- [ ] 2.1 Create training-delivery package structure.
- [ ] 2.2 Implement `Batch` aggregate root class with `batch.allocateSeat()` and status validator checks.
- [ ] 2.3 Implement the Application Service handler for batch creation, details updating, and state changes.
- [ ] 2.4 Add Outbox event publishing routines for `BatchCreated`, `BatchCompleted`, `BatchCancelled`, `BatchCapacityReached`, and `BatchPricingOverridden`.
- [ ] 2.5 Implement a thread-safe seat allocation service using raw database write-locking checks.

## 3. API Delivery

- [ ] 3.1 Expose `POST /api/v1/batches` endpoint for batch draft creation.
- [ ] 3.2 Expose `PUT /api/v1/batches/:id` for modifying batch details.
- [ ] 3.3 Expose `POST /api/v1/batches/:id/status` for executing state transitions.
- [ ] 3.4 Expose internal endpoint `POST /api/v1/batches/:id/allocate-seat` for cross-context consumption.

## 4. UI Dashboard & Forms

- [ ] 4.1 Implement `CRS-SCR-004` (Batch Listing Dashboard) with KPI header cards and grid toggles.
- [ ] 4.2 Build `CRS-SCR-005` (Step 1 & 2: details and capacity wizard form steps) with validation check borders.
- [ ] 4.3 Build basic shells for `CRS-SCR-008` (Trainer my batches) and `CRS-SCR-009` (Student lookup).

## 5. Automated Tests

- [ ] 5.1 Write concurrency tests verifying batch capacity lock limits cannot be bypassed.
- [ ] 5.2 Write integration tests checking outbox event records creation during status transitions.
- [ ] 5.3 Write Playwright form tests for batch creation wizard inputs.

## 6. Project Status Update

- [ ] 6.1 Update `docs/project-status.md` details.
