## Why

ASTI needs to allocate qualified trainers to batches, ensuring that trainers do not have scheduling conflicts or overlapping sessions across multiple classes, and protecting trainer bandwidth.

## What Changes

We will extend the existing `BatchTrainer` mapping, assignment logic, and trainer schedule validation routines. We will standardize the injected query service contract used to call the Scheduling context for session overlap checks.

## Capabilities

### New Capabilities
- `trainer-assignment`: Covers trainer batch assignment, scheduling validation, and conflict display.

### Modified Capabilities

## Impact

- **Database:** Reuses the existing `BatchTrainer` table in `schema.prisma`; may require constraint/index or seed-data updates only.
- **Backend:** Extends batch application service validation and assignment logic, using the Scheduling query interface.
- **API:** Ensures `POST /api/v1/batches/:id/trainers` follows the `batch.delivery.assign` permission and supports conflict-preview reads for the UI.
- **UI:** Implements screen `CRS-SCR-007` (Trainer Assignment Modal & Validator) and wizard Step 3 (Faculty Assignment) in screen `CRS-SCR-005`.
