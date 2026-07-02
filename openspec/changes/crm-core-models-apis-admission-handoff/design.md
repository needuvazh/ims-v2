## Context

The CRM spec already defines lead conversion, but the admission handoff now uses the new student-profile boundary. This delta keeps the CRM requirements aligned without redefining the full CRM model.

## Goals / Non-Goals

**Goals:**
- Update lead conversion handoff wording and behavior.

**Non-Goals:**
- Reworking the rest of CRM core behavior.

## Decisions

- Keep this as a delta spec over the existing CRM capability.

## Risks / Trade-offs

- [Risk] CRM requirements could drift from admissions implementation. → Mitigation: keep the delta narrow and reference the admissions handoff explicitly.
