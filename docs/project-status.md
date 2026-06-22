# IMS Project Status

Last updated: 2026-06-22

## Current Completion

Current FRD-based completion: **about 10%**

Basis:

- The FRD scope currently contains **226 functional requirements** across 19 module files.
- About **21-22 requirement-equivalents** have meaningful implementation.
- This estimate counts implemented business behavior, not scaffolding, UI placeholders, or documentation.
- The recent RBAC and branch authorization work completes the core access control layer and increases FRD completion.
- The recent IAM database schema refactoring and self-service password reset implementations complete the core security, account management, and session-tracking lifecycle.

Current implementation state:

- Foundation monorepo is in place with pnpm, Turborepo, TypeScript, Next.js, Prisma, PostgreSQL configuration, Tailwind, Vitest, and Playwright.
- Shared observability package, app-root instrumentation, request-correlation propagation, structured logging, and health/sign-out response headers are implemented and archived.
- Admin portal has sign-in, dashboard, identity management, organization management, UI preview, and basic protected layout surfaces.
- Domain/application packages exist for shared kernel, shared auth, shared UI, portal UI, audit, identity access, organization, database, and observability.
- Prisma schema covers identity (including database-backed sessions, password reset tokens, and active dating), organization, audit log, and outbox foundation tables.
- Student portal, trainer portal, and public certificate verification routes exist as shells only. Their real workflows are pending.

## Completion by Area

| Area                       | Current status     | Completion estimate | What is implemented                                                                                                                                      | What is still pending                                                                                                                                                                                         |
| -------------------------- | ------------------ | ------------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform foundation        | Partially complete |                 60% | Monorepo, shared packages, Prisma package, Next.js app, Tailwind, tests setup, observability package, app instrumentation, correlation headers, route logging | CI hardening, migration checks, production env strategy, worker package, object storage adapter                                                                                 |
| Identity & Access          | Partially complete |                 75% | User service, role service, auth service, bcrypt password hashing, signed session cookie, permissions seed, user/role UI, role and permission assignment, server-side action guards, branch scope loading & layout integration, database-backed session tracking, session revocation on sign-out, failed login lockout and lockout duration, password reset tokens and forgot/reset password UI pages with complexity rules, active dating for users and roles, and expanded seeding for all FRD roles/permissions | counselor scope checks, approval permissions, final mapping of routes/API contracts with permissions |
| Organization               | Partially complete |                 35% | Institute, branch, and department create/list/update application services, Prisma tables, admin UI, audit append calls                                   | Classroom management service/UI, effective dating behavior, branch ownership policy, organization hierarchy view, branch-scoped authorization, full API contracts                                             |
| Audit & Compliance         | Minimal foundation |                 15% | AuditLog model, audit repository, append calls from identity and organization services, and audit logging for password reset requests, reset success, and account lockouts | ApprovalLog, immutable audit viewer, search/filter/export, retention policy, severity/category model, audit coverage for sensitive workflows |
| Shared UI and portal shell | Partially complete |                 25% | Common UI components, admin shell, student/trainer/verify route shells                                                                                   | Real student portal workflows, real trainer portal workflows, certificate verification backend, permission-aware navigation backed by real business data                                                      |
| Lead & Inquiry / CRM       | Not started        |                  0% | None beyond documentation                                                                                                                                | Inquiry, lead, source/stage, counselor assignment, follow-ups, conversion handoff, reports, audit                                                                                                             |
| Admission & Enrollment     | Not started        |                  0% | None                                                                                                                                                     | Student admission, central Enrollment aggregate, enrollment lifecycle, walk-in flow, corporate participant link, enrollment events                                                                            |
| Student Management         | Not started        |                  0% | Student portal shell only                                                                                                                                | Student profile, identity fields, emergency contacts, student documents, student portal data                                                                                                                  |
| Course & Batch             | Not started        |                  0% | None                                                                                                                                                     | Courses, pricing, completion rules, batches, waiting list, trainer assignment, walk-in/corporate configuration                                                                                                |
| Scheduling & Attendance    | Not started        |                  0% | Trainer attendance page shell only                                                                                                                       | Sessions, timetable conflicts, attendance marking, locking, correction, percentage calculation, audit                                                                                                         |
| Fee & Finance              | Not started        |                  0% | Student fees page shell only                                                                                                                             | Fee plans, installment plans, manual payments, receipts, dues, discounts, refunds, approval hierarchy, audit                                                                                                  |
| Trainer Management         | Not started        |                  0% | Trainer portal shell only                                                                                                                                | Trainer profile, availability, assignments, documents, payment visibility                                                                                                                                     |
| Corporate Training         | Not started        |                  0% | None                                                                                                                                                     | Corporate accounts, contacts, contracts, programs, participants, imports, corporate billing                                                                                                                   |
| Completion & Certificate   | Not started        |                  0% | Student certificate and public verify route shells only                                                                                                  | Completion approvals, eligibility validation, certificate templates, generation, issuance, verification logs                                                                                                  |
| Document Management        | Not started        |                  0% | None                                                                                                                                                     | Document types, uploads, versions, verification, expiry, signed access, access audit                                                                                                                          |
| Communication              | Not started        |                  0% | None                                                                                                                                                     | Templates, notifications, delivery logs, event-driven enqueueing                                                                                                                                              |
| Reports & Dashboard        | Not started        |                  0% | Basic admin dashboard shell                                                                                                                              | Report definitions, widgets, read models, snapshots, exports, branch/role-scoped dashboards                                                                                                                   |

## OpenSpec Status

Active changes:

| Change | Status |
| ------ | ------ |
| None   | No active OpenSpec changes are currently open. |

Archived changes:

| Archive | Status |
| ------- | ------- |
| `build-observability` at `openspec/changes/archive/2026-06-22-build-observability` | Archived and synced to main specs |
| `rbac-branch-auth-foundation` at `openspec/changes/archive/2026-06-22-rbac-branch-auth-foundation` | Archived and synced to main specs |
| `iam-database-refactor` at `openspec/changes/archive/2026-06-22-iam-database-refactor` | Archived and synced to main specs |
| `implement-forgot-password` at `openspec/changes/archive/2026-06-22-implement-forgot-password` | Archived and synced to main specs |

Standing rule:

- After every future OpenSpec archive operation, update this file with the archived change outcome, completion percentage movement, newly pending items, next action items, skipped checks, assumptions, and open questions.

## Pending Items

Critical pending items blocking meaningful percentage growth:

1. **RBAC and branch authorization foundation [COMPLETED]**
   Dynamic RBAC is fully implemented with dynamic server-side action guards, branch-scope session propagation, and layout resolution. The database schema refactoring and self-service password reset are also fully completed, including database-backed session tracking, lockout policy, active dating, token reset UI, and audit/outbox logging. Dynamic user data scope assignment interface and counselor lead filters are remaining as future refinements.

2. **Organization completion**
   Institute, branch, and department are started. Classroom management, hierarchy view, effective dating, branch ownership, and scoped authorization are pending.

3. **Central Enrollment aggregate**
   Enrollment is the central IMS lifecycle but has no package, schema, aggregate, application services, or tests yet. This blocks admission, finance, attendance, completion, certificates, corporate, and walk-in flows.

4. **Lead-to-admission workflow**
   Lead/inquiry, counselor assignment, follow-ups, lead conversion, and admission handoff are not implemented.

5. **Course and batch foundation**
   Course, pricing, completion rules, batch, waiting list, and trainer assignment are not implemented. Many downstream workflows depend on this.

6. **Finance manual payment workflow**
   Fee accounts, installment plans, manual payments, receipts, due calculation, discounts, refunds, and approval/audit behavior are not implemented.

7. **Attendance, completion, and certificate chain**
   Attendance sessions, marking/locking, completion approval, certificate eligibility, certificate generation, and public verification are not implemented.

8. **Student and trainer portals**
   Routes exist, but the portals are not backed by real student/trainer identity, authorization, assignments, enrollments, fees, attendance, certificates, or documents.

9. **Document management and secure access**
   Document type configuration, upload metadata, verification, versioning, expiry, signed access, and access audit are not implemented.

10. **Reporting and communication**
    Dashboards, report definitions, metric snapshots, exports, communication templates, notifications, and delivery logs are not implemented.

## Next Action Items to Increase Completion

The fastest responsible way to increase the completion percentage is to finish foundational cross-cutting work first, then implement the Enrollment-centered workflow chain.

| Priority | OpenSpec change to create or continue    |                Expected percentage movement | Why this moves the project forward                                                                                                       |
| -------- | ---------------------------------------- | ------------------------------------------: | ---------------------------------------------------------------------------------------------------------------------------------------- |
| -        | `[COMPLETED] rbac-branch-auth-foundation` |                                          - | Completed baseline authentication, dynamic RBAC, active-dating, lockout policy, database session tracking, and self-service password reset. |
| 1        | `complete-organization-foundation`       |                             10% -> 11-12% | Finishes classroom, hierarchy, effective dating, and branch ownership needed by scheduling, enrollment, and reporting.                   |
| 2        | `build-enrollment-aggregate-foundation`  |                            12% -> 14-16% | Adds the central lifecycle aggregate required by admission, finance, attendance, completion, certificates, corporate, and walk-in flows. |
| 3        | `implement-lead-admission-handoff`       |                            16% -> 18-20% | Starts the lead-to-student business path and creates the upstream source for admissions.                                                 |
| 4        | `implement-course-batch-foundation`      |                            20% -> 23-26% | Adds courses, pricing, completion rules, batches, waiting list, and trainer assignment references needed by enrollment.                  |
| 5        | `implement-manual-finance-workflow`      |                            26% -> 31-35% | Adds one of the highest-value IMS workflows: fee account, manual payment, receipt, due calculation, discount/refund controls, and audit. |
| 6        | `implement-attendance-completion-certificate-chain` |                            35% -> 42-48% | Connects attendance to completion approval, eligibility, certificate generation, and public verification.                                |

## Recommended Immediate OpenSpec Work

Next three OpenSpec proposals should be:

1. `complete-organization-foundation`
   Scope: classroom aggregate/service, effective dating, hierarchy query, branch ownership checks, API/server-action contracts, tests.

2. `build-enrollment-aggregate-foundation`
   Scope: Enrollment aggregate, statuses, admission link, course/batch references, branch scope, lifecycle events, repository interface, Prisma schema, tests.

These changes should move the project from foundation-only into a safer workflow-ready baseline.

## Future Portal Plan

Student portal future scope:

- Student sign-in and protected dashboard backed by real identity/session data.
- Profile, identity fields, admissions, enrollments, batches, attendance, fees, receipts, course completion, certificates, and documents.
- Mobile-responsive UI as required by the NFR.

Trainer portal future scope:

- Trainer sign-in and protected dashboard backed by real identity/session data.
- Assigned batches, schedule, attendance marking, correction requests, completion recommendations, trainer documents, and payment visibility.
- Server-side branch and assignment scope enforcement.

Public certificate verification future scope:

- Certificate lookup by certificate number or QR token.
- Minimal public DTO without private student data exposure.
- Verification log capture and certificate status validation.

## Verification Baseline

Recommended checks before marking future implementation changes complete:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm exec prisma validate --schema=packages/database/prisma/schema.prisma`
- `pnpm build`

## Assumptions

- `docs/project-status.md` is the canonical project status file.
- Completion percentage is based on implemented FRD business requirements.
- UI shells and preview components do not count as completed business workflows.
- Student and trainer portals are future workflow surfaces, not completed modules.
- Corporate Training, Communication, Reporting, and advanced integrations can remain behind core Enrollment-centered workflows unless the user reprioritizes them.
- Observability infrastructure is treated as platform/NFR work and is tracked separately from FRD completion.

## Open Questions

- Should admin mutations continue using server actions, or should route handlers be created for all documented API contracts?
- Which auth/session provider should be standardized before production?
- What exact Oman receipt, tax invoice, certificate, and student ID templates should be implemented?
- Which object storage provider should be used for documents and generated certificates?
- What audit retention and privacy policy should be enforced for production?
