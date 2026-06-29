## Why

Module 2.1 defines the Institute as the root of Organization Management: the legal identity, localization, fiscal defaults, contact details, and lifecycle that every downstream organization feature depends on. The FRD clarifies these requirements separately from branches, departments, and classrooms, so the institute flow needs to be captured and tracked as its own change.

## What Changes

- Align the Institute aggregate with the FRD lifecycle: `Draft` -> `Configured` -> `Active` -> `Suspended` -> `Archived`.
- Expose institute create, update, view, activate, suspend, and archive flows through the existing organization module boundaries.
- Enforce FRD validation rules for institute code, legal name, country, timezone, currency, language, registration data, and contact data.
- Record immutable audit history for every institute lifecycle transition and profile update.
- Apply server-side authorization and branch-safe read behavior for institute actions and views.
- Keep branch, department, and classroom work scoped to their own FRD parts; do not fold those lifecycles into this change.

## Capabilities

### New Capabilities
- `organization`: institute registration, profile management, lifecycle transitions, validation, permissions, and audit behavior.

### Modified Capabilities
- None.

## Impact

- Affects `packages/organization` domain and application logic.
- Affects `apps/admin-portal/app/(protected)/organization` delivery handlers and screens.
- May require audit and persistence updates if any institute fields or status rules are missing in the current implementation.
- Affects authorization checks for institute read/write actions.
- Requires targeted tests for validation, status transitions, audit logging, and permission gating.
