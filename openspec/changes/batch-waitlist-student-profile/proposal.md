## Why

Batch waitlist behavior now depends on `StudentProfile` instead of the legacy student model, so the requirement needs its own delta change. Splitting it keeps the waitlist rules easy to review and avoids mixing them with unrelated batch delivery behavior.

## What Changes

- Update waitlist membership and branch scoping to reference student profiles.
- Keep waitlist behavior in the batch delivery boundary.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `batch-waitlist`: waitlist membership and scoping now use StudentProfile identifiers.

## Impact

Affected areas include batch waitlist requirements, queue selection screens, and tests.
