## Why

Physical batch delivery is the core execution block of training delivery. We need to create physical batch instances linked to courses, enforce seat capacity checks (overbooking controls), handle lifecycle status transitions, and publish transactional events for downstream context reactions (like cancellations and completions).

## What Changes

We will introduce the `Batch` and `Session` models, alongside fully defined schemas for `CoursePricing`, `CourseDiscount`, `CourseCompletionRule`, `BatchTrainer`, and `WaitingList` to avoid truncation issues and circular dependency compilation issues. We will implement state-aware capacity management checks, FIFO waitlist promotion handlers, trainer schedule validation queries, logical classroom verification checks, GST timezone (UTC+4) normalizations, and outbox domain event publishing.

## Capabilities

### New Capabilities
- `batch-delivery`: Covers batch card listing, creation/modification wizard steps, capacity control blocks, state-aware seat allocations, FIFO waitlist promotions, trainer scheduling conflict guards, and lifecycle state changes.

### Modified Capabilities

## Impact

- **Database:** Introduces consolidated schema upgrades in `schema.prisma` for Module 06, defining complete schemas for `Batch`, `Session`, `CoursePricing`, `CourseDiscount`, `CourseCompletionRule`, `BatchTrainer`, and `WaitingList` (including composite unique indexes for active waitlist status to prevent duplicate entries), with session status Cascades to `Cancelled` upon batch deactivation/cancellation.
- **Backend:** Creates `packages/training-delivery` package for batch aggregate logic (including seat allocation and release methods, waitlist additions/promotions), seat allocation service, outbox event handlers, timezone (UTC+4) normalizers, and an asynchronous event subscriber for `EnrollmentCancelled` to trigger automatic seat release and FIFO candidate promotion. Includes trainer assignment outbox event dispatcher (`TrainerAssignedToBatch`) and programmatic logical classroom verification.
- **API:** Exposes:
  - `POST /api/v1/batches` (create batch draft)
  - `GET /api/v1/batches` (query batches with active branch filter)
  - `PUT /api/v1/batches/:id` (modify batch details and validate date/capacity limits)
  - `PUT /api/v1/batches/:id/status` (transition batch state, enforcing Primary Trainer rules)
  - `POST /api/v1/batches/:id/trainers` (assign trainer to batch, enforcing scheduling conflict checks and publishing events)
  - `POST /api/v1/batches/:id/waitlist` (queue a student or lead on the batch waitlist)
  - `POST /api/v1/batches/:id/waitlist/promote` (manually force promotion of a waitlisted candidate)
- **UI:** Implements screens `CRS-SCR-004` (Batch Listing), `CRS-SCR-005` (Steps 1 & 2: Details & Capacity), and student lookup `CRS-SCR-009` in the portal.
