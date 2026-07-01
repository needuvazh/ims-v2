## Why

Physical batch delivery is the core execution block of training delivery. We need to create physical batch instances linked to courses, enforce seat capacity checks (overbooking controls), handle lifecycle status transitions, and publish transactional events for downstream context reactions (like cancellations and completions).

## What Changes

We will introduce the `Batch` model, CRUD APIs, capacity management checks, and state transitions logic. This includes outbox domain event publishing.

## Capabilities

### New Capabilities
- `batch-delivery`: Covers batch card listing, creation/modification wizard steps, capacity control blocks, and lifecycle state changes.

### Modified Capabilities

## Impact

- **Database:** Introduces `Batch` and `Session` tables in `schema.prisma`.
- **Backend:** Creates `packages/training-delivery` package for batch aggregate logic, seat allocation service, and outbox event handlers.
- **API:** Exposes `POST /api/v1/batches`, `PUT /api/v1/batches/:id`, `GET /api/v1/batches`, and `POST /api/v1/batches/:id/status`.
- **UI:** Implements screens `CRS-SCR-004` (Batch Listing), `CRS-SCR-005` (Steps 1 & 2: Details & Capacity), and student lookup `CRS-SCR-009` in the portal.
