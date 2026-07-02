## Context

Walk-in enrollment is a compressed admin workflow built on the shared enrollment lifecycle. This change keeps the entry point admin-only in Phase 1 while preserving the same lifecycle rules used by other enrollment paths.

## Goals / Non-Goals

**Goals:**
- Support same-day walk-in enrollment and payment recording.
- Keep the workflow admin-only in Phase 1.

**Non-Goals:**
- Student portal walk-in self-service.

## Decisions

- Keep walk-in as an orchestration over Enrollment.
- Reserve future student portal entry points without enabling them now.

## Risks / Trade-offs

- [Risk] Walk-in can overlap with standard enrollment terminology. → Mitigation: keep labels explicit in the UI.
