## 1. Domain and Persistence Alignment

- [x] 1.1 Finalize the Prisma schema and migration history for `StudentProfile`, `Admission`, `Enrollment`, and related branch-scoped references.
- [x] 1.2 Update repository contracts and adapters in `admissions-enrollment` to use `StudentProfile` as the canonical learner identity.
- [x] 1.3 Align waitlist and lead-handoff persistence paths to the new student-profile boundary.

## 2. Admission, Enrollment, and Walk-In Workflows

- [x] 2.1 Implement the admission intake application service for draft creation, submission, approval, and duplicate prevention.
- [x] 2.2 Implement the enrollment lifecycle application service for create, confirm, cancel, and completion transitions.
- [x] 2.3 Implement the walk-in enrollment orchestration for same-day enrollment, payment recording, and completion eligibility.
- [x] 2.4 Implement the lead-to-admission handoff flow so CRM can create or reuse a person record, create a student profile, and create the admission record.

## 3. Admin Portal Screens and API Routes

- [x] 3.1 Update the admission intake screens and route handlers to support the new admission workflow and branch-scoped access checks.
- [x] 3.2 Update the enrollment lifecycle screens and route handlers to support approval, confirmation, cancellation, and completion.
- [x] 3.3 Update the walk-in enrollment screen to remain admin-only in Phase 1 and expose the future portal reservation.
- [x] 3.4 Update the student profile lookup and batch waitlist screens to search and select `StudentProfile` records.
- [x] 3.5 Update the CRM lead-conversion screen and route to hand off into Admission & Enrollment with the new student-profile boundary.
- [x] 3.6 Add or update the document-management review surface needed by admission and enrollment workflows.

## 4. Tests, Verification, and Release Readiness

- [x] 4.1 Add unit tests for admission, enrollment, walk-in, and lead-handoff invariants and status transitions.
- [x] 4.2 Add API or route tests for validation, authorization, branch scope, and stable response contracts.
- [x] 4.3 Add UI tests for the admission intake, enrollment lifecycle, walk-in, student lookup, and document review screens.
- [x] 4.4 Run `npx prisma validate --schema packages/database/prisma/schema.prisma`, package typechecks, affected tests, and `git diff --check`.
- [x] 4.5 Run `graphify update . --force` after implementation changes are complete.

## 5. Missing Module 04 Gaps

- [x] 5.1 Implement the global person lookup / duplicate preflight flow.
- [x] 5.2 Implement the enrollment pricing resolution screen and discount authorization rules.
- [x] 5.3 Implement the enrollment operations console UI and lifecycle action feedback.
- [x] 5.4 Implement admission-triggered student identity provisioning and ID card reissue flows.
- [x] 5.5 Add targeted tests for the new screen and lifecycle gaps.

## 6. New UI Specs

- [x] 6.1 Add the student directory spec and page behavior.
- [x] 6.2 Add the student profile dashboard spec and page behavior.
- [x] 6.3 Add the create enrollment form spec with pricing panel behavior.
- [x] 6.4 Add the student ID card management spec and reissue behavior.

## 7. Reports and Dashboards

- [x] 7.1 Add Module 04 report/dashboard overview requirements.
- [x] 7.2 Add student, admission, and enrollment KPI/dashboard requirements.
- [x] 7.3 Add batch roster and ID card reporting requirements.
- [x] 7.4 Add the admissions dashboard page and navigation entry.
- [x] 7.5 Add the broader Module 04 reports index page.
- [x] 7.6 Add the student report page.
- [x] 7.7 Add the enrollment report page.
- [x] 7.8 Add the batch roster/fill-rate report page.
- [x] 7.9 Add the ID card report page.
