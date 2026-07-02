## Why

Enrollment is the central lifecycle for Module 04, so its state changes and pricing resolutions need to be validated independently from admission intake and walk-in handling. A dedicated capability change makes confirmation, cancellation, and completion behavior easier to verify.

## What Changes

- Define enrollment creation and status transitions aligned with the target DDD state machine (Draft -> Submitted -> Approved -> Confirmed -> Active -> Dropped/Cancelled).
- Integrate Course Catalog pricing resolution hierarchy overrides and snapshot the resolved pricing fields, introducing a `priceEvaluationTimestamp` field to the `Enrollment` model to prevent data drift.
- Establish B2B corporate enrollment flow to atomically convert corporate participants into student profiles and validate credit limit gates.
- Establish idempotent event-driven confirmation reacting to `ReceiptGenerated` finance events, preserving document verification gate checking.
- Explicitly model "full batch + waitlist enabled" transitions to keep enrollments pending and create WaitingList records via Training Delivery.
- Establish reactive enrollment activation listening to `BatchStarted` events from Training Delivery.
- Ensure comprehensive audit logging across all lifecycle actions.
- Keep enrollment ownership in Admission & Enrollment, handing off completion and certificate triggers downstream instead of owning those transitions.
- Preserve branch-scoped access, audit logging, and downstream outbox event publishing.

## Capabilities

### New Capabilities

- `enrollment-lifecycle`: enrollment creation, pricing resolution, and status transition workflows.

### Modified Capabilities

- None

## Impact

Affected areas include the Prisma schema, database migrations, enrollment screens, application services, route handlers, audit logs, event handlers, and tests.
