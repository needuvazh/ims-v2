## Why

Module 04 covers the core learner lifecycle in ASTI IMS, but it is too large to validate as one change without making UI and workflow review fragile. Splitting it into screen- and function-based capabilities makes the admin portal easier to test, keeps admissions boundaries explicit, and reduces the risk of mixing enrollment behavior with CRM, batch, or finance concerns.

## What Changes

- Split Module 04 into smaller OpenSpec capabilities aligned to admin screens and user flows.
- Define separate requirements for admission intake, enrollment lifecycle actions, walk-in enrollment, and student profile lookup.
- Keep lead conversion handoff explicit so CRM only transfers control to Admission & Enrollment and does not own the student lifecycle.
- Keep batch waitlist/student selection behavior aligned to `StudentProfile` instead of the legacy student model.
- Preserve branch scoping, audit logging, and event-driven handoff for protected workflows.
- **BREAKING**: retire dependency on the legacy `Student` table/model for Module 04 flows and validate against `StudentProfile`.

## Capabilities

### New Capabilities

- `admission-intake`: admin-facing admission creation, review, and admission detail workflows.
- `enrollment-lifecycle`: enrollment status actions such as submit, approve, confirm, cancel, and complete.
- `walkin-enrollment`: fast-track walk-in enrollment screens and same-day learner handling.
- `student-profile-lookup`: student search, selection, and profile resolution used by admissions and batch workflows.
- `lead-to-admission-handoff`: CRM-to-admissions handoff behavior for converting a qualified lead into the admission pipeline.
- `document-management`: document upload, verification, and admission/enrollment document evidence needed by Module 04 flows.

### Modified Capabilities

- `crm-core-models-apis`: lead conversion requirements now hand off into `StudentProfile` + `Admission` and should no longer describe legacy student creation.
- `batch-waitlist`: queue candidate selection and validation now use `StudentProfile` identifiers and lookup behavior.

## Impact

Affected areas include the admin portal Module 04 screens, CRM lead-conversion flow, batch waitlist/student lookup screens, admissions-enrollment application services, Prisma schema and migration history, and related tests. The change also preserves branch-scoped authorization and audit logging for admission and enrollment actions.
