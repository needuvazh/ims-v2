## Why

When delivery batches reach seat capacity boundaries, ASTI needs a structured way to queue interested learners (either registered students or CRM leads) in a FIFO waitlist. When seats open up (due to enrollment cancellations or manual capacity extensions), the system must promote the first queued learner and trigger enrollment creation.

## What Changes

We will introduce the `WaitingList` model, enqueue/dequeue/skip/reactivate methods inside the Batch aggregate root, reordering and skip API routes, promotion and reversion event handlers, and outbox event publishing.

## Capabilities

### New Capabilities
- `batch-waitlist`: Covers waitlist queuing, FIFO positions management, drag-and-drop reprioritization, auto/manual promotions, candidate skips (holds), queue cancellations, and reactivation of suspended entries.

### Modified Capabilities

## Impact

- **Database:** Introduces `WaitingList` model in `schema.prisma`.
- **Backend:** Extends batch aggregate to include waitlist logic, queue operations, transaction-wide locking, and outbox events generation.
- **API:** Exposes:
  - `POST /api/v1/batches/:id/waitlist` (Enqueue)
  - `POST /api/v1/batches/:id/waitlist/promote` (Manual Promote override)
  - `POST /api/v1/batches/:id/waitlist/skip` (Manual Skip)
  - `DELETE /api/v1/batches/:id/waitlist/:waitlistId` (Cancel waitlist request)
  - `POST /api/v1/batches/:id/waitlist/reactivate` (Reactivate held/suspended candidate)
  - `PUT /api/v1/batches/:id/waitlist/reorder` (Reorder positions)
- **UI:** Implements screen `CRS-SCR-006` (Roster tracking details and Waitlist Manager widgets with drag handles and action triggers) in admin portal.
