## Context

Enrollment is the shared lifecycle for regular, corporate, and walk-in learners. This change isolates the lifecycle transitions so they can be validated separately from intake and walk-in entry points.

## Goals / Non-Goals

**Goals:**
- Support enrollment creation, confirmation, cancellation, and completion.
- Keep the enrollment lifecycle as a single shared model.

**Non-Goals:**
- Course catalog or finance pricing policy design.

## Decisions

- Keep enrollment as the authoritative state machine.
- Use existing application services for transitions.

## Risks / Trade-offs

- [Risk] Transition rules may depend on finance and course checks. → Mitigation: keep those as required guards, not ownership shifts.
