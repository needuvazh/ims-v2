## 1. Domain and Persistence Foundation

- [x] 1.1 Create a new `packages/trainer-management` package with public exports for domain, application, repository, and infrastructure adapters.
- [x] 1.2 Add Prisma models and migration(s) for `TrainerProfile`, `TrainerQualification`, `TrainerAvailability`, `TrainerCourseAuthorization`, and `TrainerCompensationRate` with audit metadata, soft delete, effective dating, and indexes.
- [x] 1.3 Add any compatibility fields or read-model indexes needed to connect trainer profiles to existing Training Delivery and Scheduling references without moving ownership.
- [x] 1.4 Define trainer domain errors, value objects, and aggregate invariants for status transitions, effective dates, overlap checks, and compensation specificity.

## 2. Authorization and Shared Boundaries

- [x] 2.1 Seed the Module 09 permission catalog entries for `menu.faculty`, `menu.faculty.trainers`, `menu.faculty.eligible-trainers`, `menu.faculty.reports`, and the `trainer.*` action/report permissions.
- [x] 2.2 Wire trainer permissions into IAM navigation and server-side authorization helpers without relying on role names.
- [x] 2.3 Implement branch-scope resolution helpers for trainer reads, writes, reports, and compensation-redacted responses.

## 3. Trainer Application Services

- [x] 3.1 Implement trainer profile create, update, read, list, and status transition services with optimistic concurrency and audit logging.
- [x] 3.2 Implement qualification services for add, update, list, soft delete, and document reference linkage.
- [x] 3.3 Implement availability services for create, update, soft delete, overlap validation, and trusted scheduling validation.
- [x] 3.4 Implement course authorization services for create, transition, list, and effective-date validation.
- [x] 3.5 Implement compensation rate services for create, update, resolve, and compensation field redaction.
- [x] 3.6 Implement eligibility and assignment-validation services for Scheduling and Training Delivery read paths.

## 4. API Surface

- [x] 4.1 Add `/api/v1/faculty/trainers` list, create, detail, and update routes with Zod validation and scoped DTOs.
- [x] 4.2 Add trainer status transition, qualification, availability, authorization, and compensation routes.
- [x] 4.3 Add eligibility validation and compensation-rate resolution endpoints for internal and trusted callers.
- [x] 4.4 Add trainer assignment-reference, report, export, and audit-history routes with permission checks and redaction.
- [x] 4.5 Map domain errors to stable HTTP statuses and error codes across all Module 09 routes.

## 5. Admin Portal UI

- [x] 5.1 Add `/faculty/dashboard`, `/faculty/trainers`, `/faculty/trainers/new`, and `/faculty/trainers/[trainerId]` screens in the admin portal.
- [x] 5.2 Add tab or drawer experiences for qualifications, availability, authorizations, compensation, assignment references, and audit history.
- [x] 5.3 Add the eligible trainer finder and trainer reports screens with branch-aware filters and export actions.
- [x] 5.4 Wire responsive loading, empty, validation, permission-denied, and compensation-redacted states into the new screens.

## 6. Reporting, Audit, and Integration

- [x] 6.1 Implement trainer reporting projections and export logic for roster, authorization coverage, availability coverage, utilization reference, qualification compliance, and compensation coverage.
- [x] 6.2 Add audit/outbox emission for sensitive trainer mutations and ensure audit history reads from immutable trainer change records.
- [x] 6.3 Integrate eligibility and availability validation into the Training Delivery and Scheduling read-side flows without transferring ownership.

## 7. Tests and Verification

- [x] 7.1 Add domain unit tests for trainer lifecycle, overlap validation, authorization transitions, compensation resolution, and redaction rules.
- [x] 7.2 Add application and API tests for permission checks, branch scope, validation failures, audit behavior, and error mapping.
- [x] 7.3 Add repository/integration tests for Prisma persistence, soft delete filtering, effective dating, and export behavior.
- [x] 7.4 Add Playwright or UI tests for core Module 09 screens, role-based visibility, and successful trainer workflows.
- [x] 7.5 Run typecheck, lint, targeted tests, and affected builds; update `docs/project-status.md` if implementation materially changes the FRD completion state.
