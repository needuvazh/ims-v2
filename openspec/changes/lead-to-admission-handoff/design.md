## Context

Lead conversion hands a qualified prospect from CRM into Admission & Enrollment. This design keeps that handoff explicit and ensures the CRM flow does not create independent student lifecycle state.

## Goals / Non-Goals

**Goals:**
- Convert qualified leads into admissions.
- Reuse existing person and student profile records when possible.
- Enforce core admissions validation invariants (minimum learner age).
- Maintain robust tenant isolation (branch scoping) on both REST APIs and Server Actions.

**Non-Goals:**
- Reworking CRM lead lifecycle rules beyond the handoff.

## Decisions

- Treat the conversion as a transactional handoff.
- Keep downstream document gating and audit behavior intact.
- **Enforce Age Validation (`VAL-ADM-001`)**: Validate that the learner is at least 12 years old on the admission date. Check this in `AdmissionService` and throw `ERR_ADM_AGE_LIMIT` on failure.
- **Align Server Action Security**: Ensure the Next.js Server Action `convertLeadAction` invokes `assertBranchScope(lead.branchId)` to achieve parity with the REST API route branch isolation checks.
- **Fail on Active Admission Conflict**: Explicitly reject conversion with `ERR_ADM_ACTIVE_ADMISSION_EXISTS` if an active admission exists in that branch for that student profile.

## Risks / Trade-offs

- [Risk] Duplicate person or profile creation. → Mitigation: match by contact identity before creating new records.
- [Risk] Mismatched validation states on reuse. → Mitigation: if reusing a person, retrieve their existing `dateOfBirth` to perform age checks; if the person was created via lead ingestion, ensure birthdate is captured.

