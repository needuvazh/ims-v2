## 1. Database Schema Extensions

- [x] 1.1 Verify the existing `BatchTrainer` model matches the FRD fields and audit requirements.
- [x] 1.2 Add or adjust indexes/constraints on `BatchTrainer` only if a gap is found.
- [x] 1.3 Generate and apply migrations only for actual deltas.

## 2. Service Contracts (packages/training-delivery)

- [x] 2.1 Normalize the `ISchedulingService` contract to return structured session conflict data.
- [x] 2.2 Keep `batch.assignTrainer()` as the aggregate/application entry point and enforce trainer dates, role constraints, and primary trainer uniqueness.
- [x] 2.3 Enforce active branch authorization and `batch.delivery.assign` before mutating trainer mappings.

## 3. API Handlers

- [x] 3.1 Implement route `POST /api/v1/batches/:id/trainers` for adding trainers.
- [x] 3.2 Ensure the route uses `batch.delivery.assign` and returns stable domain error codes.
- [x] 3.3 Add a read-only conflict preview query only if the UI requires it.

## 4. UI Components

- [x] 4.1 Implement wizard Step 3 (Faculty Assignment) in screen `CRS-SCR-005`.
- [x] 4.2 Build `CRS-SCR-007` (Trainer Assignment & Conflict Validator Modal) detailing calendar overlap grids.
- [x] 4.3 Configure dynamic states (blocking confirm actions when conflicts are detected).

## 5. Automated Tests

- [x] 5.1 Write unit tests for assignment invariants, including branch access, date range, and primary trainer checks.
- [x] 5.2 Write integration tests mocking `ISchedulingService` and checking conflict assertions.
- [x] 5.3 Write Playwright modal tests validating layout behavior during overlaps.

## 6. Project Status Updates

- [x] 6.1 Update `docs/project-status.md` details.
