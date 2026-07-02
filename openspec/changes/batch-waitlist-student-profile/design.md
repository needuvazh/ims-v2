## Context

The batch waitlist already exists, but the candidate identity changed from the old student model to `StudentProfile`. This delta keeps the behavior consistent with the canonical learner identity.

## Goals / Non-Goals

**Goals:**
- Update waitlist queueing and scoping to `StudentProfile`.

**Non-Goals:**
- Redesigning batch delivery.

## Decisions

- Keep the change as a delta over the existing batch-waitlist capability.

## Risks / Trade-offs

- [Risk] Existing data may still contain legacy student references. → Mitigation: keep the spec aligned to the new profile boundary and migrate data separately.
