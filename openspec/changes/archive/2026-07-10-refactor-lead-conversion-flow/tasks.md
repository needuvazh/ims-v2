## 1. Database Schema & Migration

- [x] 1.1 Modify the `Admission` model in `schema.prisma` to remove the `branchId` column and its foreign-key relation.
- [x] 1.2 Modify the `Enrollment` model in `schema.prisma` to add an optional `leadId` column and foreign-key relation to the `Lead` model.
- [x] 1.3 Generate and run the Prisma migration (`npx prisma migrate dev`).

## 2. Backend Services & Logic Refactoring

- [x] 2.1 Refactor `AdmissionService` to remove branch scoping from `createStudentAdmission`, `createAdmissionDraftDirect`, and `hasActiveAdmission` checks.
- [x] 2.2 Refactor `EnrollmentService.createEnrollment` to link the optional `leadId` during creation and ensure the status is set to `Draft`.
- [x] 2.3 Refactor `LeadConversionOrchestrator` to execute the new auto-approved admission and draft enrollment pipeline inside a single transaction, mapping counselor audit metadata to document verification.
- [x] 2.4 Support waitlist queue enrollments when converting leads without an active batch selected.
- [x] 2.5 Refactor lead conversion orchestrator to bypass duplicate admission throws for existing students with active admissions.

## 3. Frontend Wizard & Page Flow

- [x] 3.1 Create a dedicated wizard page for student conversion under the CRM / Lead section.
- [x] 3.2 Implement Step 1 Identity Lookup in the wizard page to check if the student profile already exists.
- [x] 3.3 Build the New Student wizard path: demographics entry, document uploads, batch selection, fee selection.
- [x] 3.4 Build the Old Student wizard path: read-only profile card, pre-flight document checklist (only requesting missing/expired uploads), batch selection, fee selection.
- [x] 3.5 Ensure database save mutations are deferred until the final "Convert & Enroll" button is clicked.
- [x] 3.6 Add assign and change batch options directly inside the Enrollment detail view component.

## 4. Bounded Context Documentation Update

- [x] 4.1 Update `docs/architecture/ddd/ddd-context-map.md` (remove branch-scoping on Admission, document dynamic branch scoping via student profile & enrollments).
- [x] 4.2 Update `docs/architecture/ddd/ER Model.md` (remove `branchId` from Admission schema, add `leadId` to Enrollment schema, update relationships).
- [x] 4.3 Update the FRD documents under `docs/architecture/frd/Module 04 - Admission & Enrollment Management` and `docs/architecture/frd/Module 03 - Lead & Inquiry Management` to reflect the updated business rules, state transitions, permission scoping, and schema attributes.

## 5. Testing & Verification

- [x] 5.1 Update backend unit and integration tests in `admission-service.test.ts`, `enrollment-lifecycle.test.ts`, and `lead-conversion-orchestrator.test.ts`.
- [x] 5.2 Add frontend integration or component tests for the new wizard flows (new vs. existing student branching).
- [x] 5.3 Verify that all test suites pass, linting is successful, and type checks compile cleanly.
