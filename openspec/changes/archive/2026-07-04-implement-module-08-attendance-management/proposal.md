## Why

ASTI needs a dedicated Attendance Management bounded context to support manual attendance marking, corrections, low-attendance detection, and attendance reporting without violating the Enrollment-centric model. The codebase currently has only a placeholder trainer attendance page and one seeded attendance permission, so the operational workflow is not yet implemented even though the FRD, DDD, and ER model already define the required behavior.

## What Changes

- Add a new Attendance bounded-context package with domain models, application services, repositories, and query/report services.
- Add AttendanceSession, AttendanceRecord, AttendanceCorrection, and AttendanceAlert persistence in PostgreSQL/Prisma with soft delete, status, versioning, branch scope, and audit-friendly fields.
- Add branch-scoped attendance APIs and optional server actions for session management, roster generation, marking, submit/finalize, lock/reopen, correction workflows, summaries, alerts, reports, and exports.
- Add admin, trainer, and student portal attendance screens backed by server-side permission and branch-scope checks.
- Expand the permission catalog and role mappings for menu, action, report, dashboard, export, correction, and audit access.
- Add attendance audit logging, export traceability, and low-attendance notification triggers through existing Audit and Communication boundaries.
- Add unit, integration, and E2E tests for roster generation, state transitions, branch isolation, authorization, audit logging, and report/export behavior.

## Capabilities

### New Capabilities
- `attendance-management`: Manual attendance session lifecycle, roster generation, attendance marking, corrections, summaries, low-attendance detection, reports, exports, and audit-ready workflows.

### Modified Capabilities
- `student-portal-read`: Add read-only attendance summary and low-attendance visibility for the authenticated student.
- `identity-access`: Add attendance menu, action, report, dashboard, and export permissions plus role mappings.
- `permissions-and-branch-scope`: Extend branch-isolation rules to attendance sessions, records, corrections, reports, and exports.
- `reports-dashboards`: Add attendance read models and dashboard widgets with branch-scoped filtering.

## Impact

- New domain package under `packages/attendance` and new Prisma models/migration work in `packages/database`.
- New attendance API routes and UI pages under `apps/admin-portal/app/api/v1/attendance`, `apps/admin-portal/app/(protected)/attendance`, `apps/admin-portal/app/trainer/(protected)/attendance`, and `apps/admin-portal/app/student/(protected)/attendance`.
- Updates to shared permission constants, seed data, runtime wiring, and branch-scoping guards.
- Reuse of existing Enrollment, StudentProfile, Batch, Session, User, AuditLog, and Communication boundaries without creating a parallel learner lifecycle.
- Test additions across package unit tests, API route tests, and Playwright E2E coverage.
