## Context

The CRM spec already defines lead conversion, but the admission handoff now uses the new student-profile boundary. This delta keeps the CRM requirements aligned without redefining the full CRM model.

## Goals / Non-Goals

**Goals:**

- Update lead conversion handoff wording and behavior.

**Non-Goals:**

- Reworking the rest of CRM core behavior.

## Decisions

- Keep this as a delta spec over the existing CRM capability.
- **Architectural Boundary Orchestration:** The lead-to-admission conversion handoff will be orchestrated via the downstream `@ims/admissions-enrollment` package using `LeadConversionOrchestrator`. This ensures the upstream `@ims/crm-leads` package has no compile-time dependencies on the Admissions services, preventing package-level circular dependencies while keeping the database transactions interactive and atomic.
- **Validation Ownership Boundary:**
  - **CRM package (`@ims/crm-leads`) responsibility:** Validates lead-facing preconditions. This includes validating that the lead has an email, a phone number, a valid birthdate, and at least one active document of type `CIVIL_ID_FRONT` or `PASSPORT_SCAN` uploaded.
  - **Admissions package (`@ims/admissions-enrollment`) responsibility:** Validates downstream business rules and database invariants. This includes checking that the learner's age is >= 12 years old, validating that the target course is active and published in the course catalog, and verifying that no duplicate active admission already exists for the student profile in the target branch scope.
- **Atomic Rollback Guarantee:**
  - The entire handoff workflow is executed within an interactive database transaction. If any downstream step (e.g. age verification or active admission check) throws an error, the database transaction is aborted. All operations—including lead stage progression, follow-up cancellations, document registrations, student profile/admission creation, and outbox writes—are rolled back atomically, leaving the database state completely unchanged.

## Risks / Trade-offs

- [Risk] CRM requirements could drift from admissions implementation. → Mitigation: keep the delta narrow and reference the admissions handoff explicitly.
