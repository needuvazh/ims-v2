## Why

Student lookup is shared by admissions and batch workflows, so it needs its own validation surface to prevent regressions in selection and filtering. Separating it keeps the canonical `StudentProfile` boundary visible.

## What Changes

- Define student profile search, selection, and visibility rules.
- Keep lookups branch-scoped and permissioned.
- Use `StudentProfile` as the canonical search target.

## Capabilities

### New Capabilities

- `student-profile-lookup`: search and select student profiles in admin workflows.

### Modified Capabilities

- None

## Impact

Affected areas include lookup screens, waitlist selection, admissions screens, route handlers, and tests.
