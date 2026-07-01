## 1. Database Schema Extensions

- [ ] 1.1 Add `BatchTrainer` model to `schema.prisma`.
- [ ] 1.2 Add indexes `@@index([batchId])` and `@@index([trainerId])` on `BatchTrainer`.
- [ ] 1.3 Generate and apply migrations.

## 2. Service Contracts (packages/training-delivery)

- [ ] 2.1 Define the `ISchedulingService` query interface for trainer schedule lookups.
- [ ] 2.2 Implement `batch.assignTrainer()` aggregate methods verifying trainer dates and role constraints.
- [ ] 2.3 Implement the service implementation that resolves scheduling checks via `ISchedulingService`.

## 3. API Handlers

- [ ] 3.1 Implement route `POST /api/v1/batches/:id/trainers` for adding trainers.
- [ ] 3.2 Implement route `GET /api/v1/batches/:id/trainers` to list assignments.
- [ ] 3.3 Add conflict check route to asynchronously query trainer conflicts during UI interactions.

## 4. UI Components

- [ ] 4.1 Implement wizard Step 3 (Faculty Assignment) in screen `CRS-SCR-005`.
- [ ] 4.2 Build `CRS-SCR-007` (Trainer Assignment & Conflict Validator Modal) detailing calendar overlap grids.
- [ ] 4.3 Configure dynamic states (blocking confirm actions when conflicts are detected).

## 5. Automated Tests

- [ ] 5.1 Write unit tests for aggregate assignment logic.
- [ ] 5.2 Write integration tests mocking `ISchedulingService` and checking conflict assertions.
- [ ] 5.3 Write Playwright modal tests validating layout behavior during overlaps.

## 6. Project Status Updates

- [ ] 6.1 Update `docs/project-status.md` details.
