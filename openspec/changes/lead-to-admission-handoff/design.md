## Context

Lead conversion hands a qualified prospect from CRM into Admission & Enrollment. This design keeps that handoff explicit and ensures the CRM flow does not create independent student lifecycle state.

## Goals / Non-Goals

**Goals:**
- Convert qualified leads into admissions.
- Reuse existing person and student profile records when possible.

**Non-Goals:**
- Reworking CRM lead lifecycle rules beyond the handoff.

## Decisions

- Treat the conversion as a transactional handoff.
- Keep downstream document gating and audit behavior intact.

## Risks / Trade-offs

- [Risk] Duplicate person or profile creation. → Mitigation: match by contact identity before creating new records.
