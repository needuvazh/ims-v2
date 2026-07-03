## Context

Module 04 is the core admission and enrollment surface in ASTI IMS, but it touches several different screens and workflows: admissions intake, enrollment lifecycle actions, walk-in handling, student lookup, and CRM handoff. The current implementation and schema refactor already moved the system toward `StudentProfile` as the canonical learner identity, so this change needs to formalize the remaining UI- and workflow-level boundaries without collapsing them into one large spec.

The main constraint is validation quality. A single broad OpenSpec would hide which screen or workflow is responsible when behavior changes, making UI verification and regression review hard. The design therefore keeps each capability small enough to validate independently while still preserving the shared Admission & Enrollment lifecycle.

## Goals / Non-Goals

**Goals:**
- Split Module 04 into screen- and function-scoped capabilities that can be validated independently.
- Keep `StudentProfile` as the canonical student entity for admissions, enrollment, waitlist selection, and lookup.
- Keep lead conversion as a CRM handoff into Admission & Enrollment, not a CRM-owned lifecycle mutation.
- Preserve thin Next.js route handlers and move business rules into the admissions-enrollment package and related domain/application services.
- Preserve branch-scoped authorization, audit logging, and transactional handoff for sensitive admission/enrollment actions.

**Non-Goals:**
- Redesigning CRM, course catalog, finance, attendance, or certificate workflows beyond the handoff points they require.
- Introducing new portal types or changing the future student portal roadmap.
- Reworking unrelated batch delivery behavior except where it depends on student selection or waitlist identity resolution.
- Changing the overall module 04 business scope beyond the agreed screen/function split.

## Decisions

- Use one OpenSpec capability per user-facing function group instead of one monolithic module spec.
  - Rationale: each screen can be reviewed, tested, and archived independently.
  - Alternatives considered: one module-wide spec or a purely backend-oriented split. Both would make UI validation harder and blur ownership.

- Treat `StudentProfile` as the canonical learner identity for Module 04.
  - Rationale: admissions, enrollment, and waitlist behavior all need a stable learner record linked to `Person`.
  - Alternatives considered: keep the legacy `Student` model or model admissions against `Person` alone. The legacy model is already being retired, and `Person` alone is too generic for enrollment lifecycle behavior.

- Keep CRM lead conversion as a handoff to Admissions, not a direct student lifecycle owner.
  - Rationale: the CRM context should only pass validated candidate data into the admissions boundary.
  - Alternatives considered: letting CRM create admissions/enrollments directly. That would violate bounded-context ownership and make audit and validation harder.

- Keep admin portal screens as the first and primary validation surface.
  - Rationale: Phase 1 operational work is admin-led, while student and trainer portals remain future surfaces.
  - Alternatives considered: coupling the spec to future portals. That would over-scope the change and delay validation.

- Use the existing transactional outbox and domain/application services for lifecycle side effects.
  - Rationale: admission creation, enrollment confirmation, and related downstream reactions need reliable state changes without adding a broker.
  - Alternatives considered: direct cross-context writes or external messaging. Those would increase complexity and weaken traceability.

## Risks / Trade-offs

- [Risk] Splitting by screen can create duplicated terminology across specs. → Mitigation: keep shared vocabulary in the proposal and design, and reuse the same canonical entity names (`StudentProfile`, `Admission`, `Enrollment`) in each spec.
- [Risk] Existing code and database history still contain legacy `Student` references. → Mitigation: keep the migration/backfill path explicit and keep specs aligned to `StudentProfile` so the legacy model does not re-enter new work.
- [Risk] Waitlist and lookup screens depend on the same canonical student identity. → Mitigation: keep lookup and waitlist validation in separate capabilities but resolve both through `StudentProfile`.
- [Risk] Overly broad specs could still hide workflow regressions. → Mitigation: keep each capability tied to a narrow admin screen or handoff flow, and ensure each gets its own UI validation path.

## Migration Plan

1. Create one spec per capability from the proposal: admissions intake, enrollment lifecycle, walk-in enrollment, student profile lookup, and lead-to-admission handoff.
2. Keep the design/package boundaries aligned so implementation can stay inside Admission & Enrollment, CRM handoff, and the relevant admin screens.
3. Implement and verify each capability independently, starting with the admin screens that already depend on `StudentProfile`.
4. Keep database migration history aligned with the `StudentProfile` model and backfill the legacy learner rows where needed.
5. Roll back by disabling the new screen flow or reverting the specific migration/change set that introduced the new capability. Because the refactor is capability-based, rollback can be scoped to the affected screen rather than the whole module.

## Open Questions

- Should admissions intake and enrollment lifecycle remain separate user-facing screens, or should one be a sub-flow of the other in the admin portal?
- Do we need a dedicated spec for document verification inside Module 04, or should that remain fully owned by Document Management with only a handoff reference here?
- Should walk-in enrollment remain an admin-only flow in Phase 1, or should the spec explicitly reserve future student portal entry points?
