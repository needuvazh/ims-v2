## Why

When delivery batches reach seat capacity boundaries, ASTI needs a structured way to queue interested learners (either registered students or CRM leads) in a FIFO waitlist. When seats open up (due to enrollment cancellations or manual capacity extensions), the system must promote the first queued learner and trigger enrollment creation.

## What Changes

We will introduce the `WaitingList` model, enqueue/dequeue methods inside the Batch aggregate root, reprioritization API routes, promotion handlers, and outbox event publishing.

## Capabilities

### New Capabilities
- `batch-waitlist`: Covers waitlist queuing, FIFO positions management, drag-and-drop reprioritization, and auto/manual promotions.

### Modified Capabilities

## Impact

- **Database:** Introduces `WaitingList` model in `schema.prisma`.
- **Backend:** Extends batch aggregate to include waitlist logic, queue operations, and outbox events generation.
- **API:** Exposes `POST /api/v1/batches/:id/waitlist`, `POST /api/v1/batches/:id/waitlist/promote`, and `PUT /api/v1/batches/:id/waitlist/reorder`.
- **UI:** Implements screen `CRS-SCR-006` (Roster tracking details and Waitlist Manager widgets) in admin portal.
