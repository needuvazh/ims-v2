## Context

Organization Management is the owning bounded context for institute-level master data. The FRD separates the Institute from Branch, Department, and Classroom, so this change should keep the institute lifecycle and profile rules isolated while leaving the other organizational submodules to their own follow-up work.

## Goals / Non-Goals

**Goals:**
- Capture the institute registration and lifecycle rules from FRD Module 2.1.
- Keep the implementation inside the organization module boundaries.
- Preserve immutable audit history for profile and status changes.
- Keep delivery adapters thin and validation at the boundary.

**Non-Goals:**
- Branch, campus, building, floor, classroom, department, academic division, working hours, holiday calendar, cost center, branding, and settings submodules.
- Introducing new infrastructure patterns, brokers, or alternate persistence models.
- Changing enrollment, finance, or certificate workflows.

## Decisions

1. Use the institute as the primary aggregate for this change.
   - Rationale: The FRD treats institute data as the root organizational record.

2. Enforce lifecycle transitions in the application layer.
   - Rationale: Status changes need validation and audit logging, not controller-side branching.

3. Prefer logical retirement over deletion.
   - Rationale: The FRD requires archive behavior and auditability.

4. Keep authorization server-side.
   - Rationale: UI visibility is not a permission boundary.

## Risks / Trade-offs

- The repository already contains partial organization functionality, so the main risk is duplicating or drifting from existing behavior. Mitigation: align the FRD change to the current package/API shape instead of creating a parallel model.
- Some FRD details may overlap with later Module 2 parts. Mitigation: keep this scope limited to institute-level behavior only.

## Verification Plan

- Validate institute create/update/status transitions with unit tests.
- Verify permission checks and audit records in application/service tests.
- Run typecheck, lint, and targeted test suites for the organization package and admin portal routes.
