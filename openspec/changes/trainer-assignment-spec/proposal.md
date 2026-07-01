## Why

ASTI needs to allocate qualified trainers to batches, ensuring that trainers do not have scheduling conflicts or overlapping sessions across multiple classes, and protecting trainer bandwidth.

## What Changes

We will introduce the `BatchTrainer` model, assignment logic, and trainer schedule validation routines. We will define an injected query service interface to call the external Scheduling context for session scheduling checks.

## Capabilities

### New Capabilities
- `trainer-assignment`: Covers trainer batch assignment, scheduling validation, and conflicts display.

### Modified Capabilities

## Impact

- **Database:** Introduces `BatchTrainer` table in `schema.prisma`.
- **Backend:** Extends batch aggregate service to include trainer assignments and validation logic, using scheduling interfaces.
- **API:** Exposes `POST /api/v1/batches/:id/trainers` and conflict check utility queries.
- **UI:** Implements screen `CRS-SCR-007` (Trainer Assignment Modal & Validator) and wizard Step 3 (Faculty Assignment) in screen `CRS-SCR-005`.
