## Context

Training delivery is handled through batches. We need to implement database models, seat capacity checks using pessimistic lock boundaries, state transition checks, walk-in/corporate overrides, and transactional outbox event publishing.

## Goals / Non-Goals

**Goals:**
- Provide CRUD handlers and state machine transitions for physical delivery batches.
- Implement transactional seat reservations (with optimistic/pessimistic lock mechanisms).
- Support Walk-In fast track setup and Corporate nominated pricing/account configurations.
- Publish `BatchCompleted` and `BatchCancelled` outbox events.

**Non-Goals:**
- Creating actual student enrollment profiles (handled via the external Admissions context).
- Defining trainer scheduling profiles (handled by Scheduling context).

## Decisions

### 1. Database Schema
We will add these models to `packages/database/prisma/schema.prisma`:
*   `Batch`: fields `id`, `courseId` (FK), `branchId` (logical reference), `classroomId` (logical reference), `batchCode` (unique), `batchNameEnglish`, `batchNameArabic`, `startDate`, `endDate`, `capacity`, `currentEnrollmentCount`, `waitingListEnabled`, `allowOverbooking`, `isWalkIn`, `corporateAccountId` (logical reference), `status`, and standard audit fields.
*   `Session`: fields `id`, `batchId` (FK), `sessionNumber`, `titleEnglish`, `titleArabic`, `sessionDate`, `startTime`, `endTime`, `trainerId`, `classroomId`, `status`.
*   Standard indexes `@@index([courseId])`, `@@index([branchId])`, `@@index([classroomId])`, `@@index([corporateAccountId])` on `Batch`.

### 2. Transactional Seat Allocation
*   Seat reservation runs inside an Application Service transaction using a pessimistic write-lock (`SELECT FOR UPDATE` implemented via Prisma raw queries or explicit database transaction blocks).
*   Mutations on `currentEnrollmentCount` are encapsulated within `batch.allocateSeat()` aggregate methods.

### 3. Outbox Integration
*   Outbox table in `packages/database` will be populated inside the same database transaction as the batch state transition, ensuring eventual consistency with external downstream contexts.
*   Events published: `BatchCreated`, `BatchCompleted`, `BatchCancelled`, `BatchCapacityReached`, and `BatchPricingOverridden`.

## Risks / Trade-offs

- **Lock Contention:** Pessimistic lock on batch rows during high concurrent registrations. We choose this to guarantee exact capacity limits (avoiding overfill), keeping the transaction runtime as short as possible.
