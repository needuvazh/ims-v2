## 1. Domain and Persistence Alignment

- [ ] 1.1 Finalize the Prisma schema and migration history for `StudentProfile`, `Admission`, `Enrollment`, and related branch-scoped references.
- [ ] 1.2 Update repository contracts and adapters in `admissions-enrollment` to use `StudentProfile` as the canonical learner identity.
- [ ] 1.3 Align waitlist and lead-handoff persistence paths to the new student-profile boundary.

## 2. Admission, Enrollment, and Walk-In Workflows

- [ ] 2.1 Implement the admission intake application service for draft creation, submission, approval, and duplicate prevention.
- [ ] 2.2 Implement the enrollment lifecycle application service for create, confirm, cancel, and completion transitions.
- [ ] 2.3 Implement the walk-in enrollment orchestration for same-day enrollment, payment recording, and completion eligibility.
- [ ] 2.4 Implement the lead-to-admission handoff flow so CRM can create or reuse a person record, create a student profile, and create the admission record.

## 3. Admin Portal Screens and API Routes

- [ ] 3.1 Update the admission intake screens and route handlers to support the new admission workflow and branch-scoped access checks.
- [ ] 3.2 Update the enrollment lifecycle screens and route handlers to support approval, confirmation, cancellation, and completion.
- [ ] 3.3 Update the walk-in enrollment screen to remain admin-only in Phase 1 and expose the future portal reservation.
- [ ] 3.4 Update the student profile lookup and batch waitlist screens to search and select `StudentProfile` records.
- [ ] 3.5 Update the CRM lead-conversion screen and route to hand off into Admission & Enrollment with the new student-profile boundary.
- [ ] 3.6 Add or update the document-management review surface needed by admission and enrollment workflows.

## 4. Tests, Verification, and Release Readiness

- [ ] 4.1 Add unit tests for admission, enrollment, walk-in, and lead-handoff invariants and status transitions.
- [ ] 4.2 Add API or route tests for validation, authorization, branch scope, and stable response contracts.
- [ ] 4.3 Add UI tests for the admission intake, enrollment lifecycle, walk-in, student lookup, and document review screens.
- [ ] 4.4 Run `npx prisma validate --schema packages/database/prisma/schema.prisma`, package typechecks, affected tests, and `git diff --check`.
- [ ] 4.5 Run `graphify update . --force` after implementation changes are complete.

## 5. Missing Module 04 Gaps

- [ ] 5.1 Implement the global person lookup / duplicate preflight flow.
- [ ] 5.2 Implement the enrollment pricing resolution screen and discount authorization rules.
- [ ] 5.3 Implement the enrollment operations console UI and lifecycle action feedback.
- [ ] 5.4 Implement admission-triggered student identity provisioning and ID card reissue flows.
- [ ] 5.5 Add targeted tests for the new screen and lifecycle gaps.

## 6. New UI Specs

- [ ] 6.1 Add the student directory spec and page behavior.
- [ ] 6.2 Add the student profile dashboard spec and page behavior.
- [ ] 6.3 Add the create enrollment form spec with pricing panel behavior.
- [ ] 6.4 Add the student ID card management spec and reissue behavior.

## 7. Reports and Dashboards

- [ ] 7.1 Add Module 04 report/dashboard overview requirements.
- [ ] 7.2 Add student, admission, and enrollment KPI/dashboard requirements.
- [ ] 7.3 Add batch roster and ID card reporting requirements.
- [ ] 7.4 Add the admissions dashboard page and navigation entry.
- [ ] 7.5 Add the broader Module 04 reports index page.
- [ ] 7.6 Add the student report page.
- [ ] 7.7 Add the enrollment report page.
- [ ] 7.8 Add the batch roster/fill-rate report page.
- [ ] 7.9 Add the ID card report page.
