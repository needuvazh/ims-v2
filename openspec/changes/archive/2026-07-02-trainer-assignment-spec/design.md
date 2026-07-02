## Context

Batch execution requires assigning qualified trainers. The scheduling conflict check must query trainer sessions from the external Scheduling context. This design extends the existing `BatchTrainer` mapping and formalizes the validation contracts.

## Goals / Non-Goals

**Goals:**
- Extend `BatchTrainer` mapping and CRUD logic.
- Integrate conflict check validations against trainer availability.
- Define a decoupled query interface `ISchedulingService` to query sessions overlap and return structured conflict details.

**Non-Goals:**
- Managing trainer profiles, qualifications, or payroll details (responsibility of the Trainer Management context).

## Decisions

### 1. Database Schema
We will keep `BatchTrainer` in `packages/database/prisma/schema.prisma` as the owning module's mapping:
*   `BatchTrainer`: fields `id`, `batchId` (FK), `trainerId` (logical reference to TrainerProfile), `role` (Primary/Assistant/Observer), `assignedFrom` (Date), `assignedTo` (Date), `status` (Active/Inactive), and standard audit fields.
*   Indexes: `@@index([batchId])`, `@@index([trainerId])`.

### 2. Decoupled Scheduling Queries & Constraints
*   To prevent database-level coupling with the Scheduling table, we introduce an interface `ISchedulingService` inside `packages/training-delivery`. The application service calls `schedulingService.getSessionsForTrainer(trainerId, startDate, endDate)` to check overlaps.
*   **Structured Conflict Preview:** The query contract should return overlapping session details (batch code, session date, start time, end time) so the UI modal can render the conflict calendar without inferring from raw booleans.
*   **Single Primary Trainer Constraint:** During assignment, the `Batch` aggregate root validates that no other `BatchTrainer` record in `Active` status is registered as `Primary` role for dates overlapping with the proposed assignment range.
*   **Branch Authorization Constraint:** The application service enforces `batch.delivery.assign` plus active branch access for the batch's branch before mutating trainer mappings.

### 3. API Delivery
*   API route `POST /api/v1/batches/:id/trainers` executes the assignment commands and returns any scheduling conflict reports found in JSON format.
*   A read-only conflict-preview query may be exposed for the Trainer Assignment modal, but it must reuse the same scheduling contract and not duplicate conflict logic.

## Risks / Trade-offs

- **Decoupled validation delays:** An API call check to the Scheduling context might introduce minor overhead. We choose this query service architecture to maintain bounded context isolation.
