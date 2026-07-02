## Why

Walk-in enrollment is a distinct admin workflow that needs its own validation path, but it must still reuse the shared Enrollment lifecycle. A separate change keeps the same-day flow easy to validate and keeps future student portal entry points explicit.

## What Changes

- Define walk-in enrollment creation, payment recording, and completion eligibility.
- Keep walk-in flow admin-only in Phase 1.
- Preserve the shared Enrollment lifecycle and downstream completion/certificate gating.

## Capabilities

### New Capabilities

- `walkin-enrollment`: walk-in admin flow and same-day enrollment handling.

### Modified Capabilities

- None

## Impact

Affected areas include the admin portal walk-in screens, enrollment orchestration, finance handoff points, and tests.
