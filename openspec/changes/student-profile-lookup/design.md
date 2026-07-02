## Context

The admin portal needs a consistent way to search and pick student profiles across admissions and batch workflows. This change defines that lookup flow as its own capability so it can stay aligned to the canonical learner identity.

## Goals / Non-Goals

**Goals:**
- Support search by student number, name, and mobile.
- Keep access branch-scoped.

**Non-Goals:**
- Editing student profile data.

## Decisions

- Use `StudentProfile` as the only lookup target.
- Return only the data needed by the calling workflow.

## Risks / Trade-offs

- [Risk] Search results may expose too much contact data. → Mitigation: mask sensitive values unless the caller is authorized.
