## Why

Enrollment is the central lifecycle for Module 04, so its state changes need to be validated independently from admission intake and walk-in handling. A dedicated change makes confirmation, cancellation, and completion behavior easier to verify.

## What Changes

- Define enrollment creation and status transitions.
- Keep enrollment ownership in Admission & Enrollment.
- Preserve branch-scoped access, audit logging, and downstream handoff behavior.

## Capabilities

### New Capabilities

- `enrollment-lifecycle`: enrollment creation and status transition workflow.

### Modified Capabilities

- None

## Impact

Affected areas include enrollment screens, application services, route handlers, audit logs, and tests.
