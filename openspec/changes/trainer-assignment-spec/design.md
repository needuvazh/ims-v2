## Context

Batch execution requires assigning qualified trainers. The scheduling conflict check must query trainer availability from the external Scheduling context. This design introduces the `BatchTrainer` entity and validation contracts.

## Goals / Non-Goals

**Goals:**
- Implement `BatchTrainer` model and CRUD logic.
- Integrate conflict check validations against trainer availability.
- Define a decoupled query interface `ISchedulingService` to query sessions overlap.

**Non-Goals:**
- Managing trainer profiles, qualifications, or payroll details (responsibility of the Trainer Management context).

## Decisions

### 1. Database Schema
We will add `BatchTrainer` to `packages/database/prisma/schema.prisma`:
*   `BatchTrainer`: fields `id`, `batchId` (FK), `trainerId` (logical reference to TrainerProfile), `role` (Primary/Assistant/Observer), `assignedFrom` (Date), `assignedTo` (Date), `status` (Active/Inactive), and standard audit fields.
*   Indexes: `@@index([batchId])`, `@@index([trainerId])`.

### 2. Decoupled Scheduling Queries & Constraints
*   To prevent database-level coupling with the Scheduling table, we introduce an interface `ISchedulingService` inside `packages/training-delivery`. The application service calls `schedulingService.getTrainerAvailability(trainerId, startDate, endDate)` to check overlaps.
*   **Single Primary Trainer Constraint:** During assignment, the `Batch` aggregate root validates that no other `BatchTrainer` record in `Active` status is registered as `Primary` role for dates overlapping with the proposed assignment range.

### 3. API Delivery
*   API route `POST /api/v1/batches/:id/trainers` executes the assignment commands and returns any scheduling conflict reports found in JSON format.

## Risks / Trade-offs

- **Decoupled validation delays:** An API call check to the Scheduling context might introduce minor overhead. We choose this query service architecture to maintain bounded context isolation.
