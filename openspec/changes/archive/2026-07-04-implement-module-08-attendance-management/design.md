## Context

Module 08 adds a new Attendance bounded context to ASTI IMS. The repo currently has no attendance package, no attendance Prisma models, and no real attendance API or UI surface beyond a trainer placeholder page. The surrounding system already has the right dependencies in place: Enrollment, Batch, Session, StudentProfile, User, branch-scoping primitives, audit logging, and Oman-time support in adjacent modules.

This change is cross-cutting because Attendance touches persistence, application services, route handlers, portal UI, RBAC, reporting, audit, notifications, and tests. The change must stay inside the existing TypeScript modular monolith and must not introduce microservices, brokers, CQRS, or event sourcing.

## Goals / Non-Goals

**Goals:**
- Implement manual attendance only for Phase 1.
- Keep Attendance enrollment-centric and branch-scoped.
- Model AttendanceSession, AttendanceRecord, AttendanceCorrection, and attendance alerts/evidence as Attendance-owned data.
- Provide trainer, admin, and student portal surfaces without duplicating learner identity or lifecycle logic.
- Preserve official history through soft delete, versioning, correction audit, and export traceability.
- Keep completion and certificate decisions in their own bounded contexts.
- Use Oman GST / UTC+4 rendering and Arabic RTL support where attendance data is displayed or exported.

**Non-Goals:**
- Biometric attendance capture, offline device sync, or biometric gateway integration.
- Separate microservices, brokers, CQRS, or event sourcing.
- Attendance-owned course, batch, session scheduling, enrollment, completion, or certificate lifecycle models.
- Finance/payment automation or certificate issuance logic inside Attendance.

## Decisions

### 1. Create a dedicated `packages/attendance` bounded-context package
Attendance needs its own domain, application, and infrastructure layers to keep session lifecycle, correction workflow, and reporting logic isolated from scheduling and enrollment code.

Alternatives considered:
- Put attendance logic directly in `apps/admin-portal`: rejected because it would bury business rules in delivery code.
- Extend scheduling or enrollment packages: rejected because Attendance is a separate bounded context with its own invariants and audit needs.

### 2. Persist Attendance as first-class Prisma models with soft delete and versioning
AttendanceSession, AttendanceRecord, AttendanceCorrection, and alert/read-model support should be added to Prisma with branch, status, audit, and optimistic version fields. Soft delete is required so correction history and attendance evidence remain auditable.

Alternatives considered:
- Hard deletes with audit-only history: rejected because operational records must remain recoverable and reportable.
- JSON-only storage in a generic table: rejected because it would weaken constraints and indexing.

### 3. Enforce branch scope in application services and route handlers
Every Attendance command and query must validate the allowed branch set server-side. UI hiding is not authorization.

Alternatives considered:
- Rely on front-end route hiding: rejected because it is insecure and insufficient for exports and API access.
- Encode branch scope in permissions alone: rejected because branch access already has a dedicated model and dynamic resolution path.

### 4. Use route handlers for core HTTP operations and server actions only where the UX benefits
The admin portal should expose route handlers for attendance session, correction, summary, report, and export operations because these are easier to test, audit, and secure consistently. Server actions can be added for tightly coupled trainer/admin forms if needed, but they should still call the same application services.

Alternatives considered:
- Server actions everywhere: rejected because reports and exports are better represented as explicit HTTP contracts.
- Client-side direct fetches to ad hoc endpoints: rejected because the contract would become fragmented.

### 5. Implement reporting as Attendance-owned read services, not CQRS infrastructure
Attendance reports and dashboards should be handled by query services or read views within the same monolith. That gives us indexed, branch-scoped reporting without introducing a separate command/query architecture.

Alternatives considered:
- CQRS with separate read/write stacks: rejected because the problem does not justify the complexity.
- Reporting from live write tables only: acceptable for small lists, but summary views/read models are needed for performance and export consistency.

### 6. Reuse existing audit, communication, and scheduling boundaries
Attendance should write audit logs using the existing audit repository and trigger notifications through the communication boundary. It should read session and batch data from scheduling/course/enrollment boundaries only.

Alternatives considered:
- Write custom audit tables: rejected because the platform already has a shared audit model.
- Let Attendance own schedule/session conflict logic: rejected because scheduling already owns those invariants.

### 7. Keep localization aligned with adjacent modules
Attendance UI and exports should render business dates in Oman time and support Arabic RTL without introducing a separate localization system. Existing shared UI patterns and `Asia/Muscat` helpers should be reused.

## Risks / Trade-offs

- [Risk] Partial unique constraints for soft-deleted attendance rows are awkward in Prisma. → Mitigation: use migration SQL for database-level uniqueness plus application guards.
- [Risk] Attendance reports may become slow on large batches. → Mitigation: add indexes, branch-scoped filters, and read views for list/report paths.
- [Risk] Audit write failures could break sensitive workflows. → Mitigation: fail the transaction when audit persistence fails and cover with integration tests.
- [Risk] Trainer-facing flows may drift from assigned-session authorization. → Mitigation: resolve allowed trainers from batch/session data and enforce it server-side on every mark/submit action.
- [Risk] Oman timezone conversion bugs can cause off-by-one-day reporting. → Mitigation: centralize `Asia/Muscat` formatting and date normalization in the Attendance package.

## Migration Plan

1. Add attendance Prisma models and supporting indexes in an additive migration.
2. Seed attendance permissions and role mappings without removing existing permission codes.
3. Wire the Attendance package into the server runtime and expose route handlers behind feature navigation.
4. Introduce admin/trainer/student attendance screens after the API contracts are ready.
5. Add read views or query services for reports and exports once the core write flow is stable.
6. Validate with route tests, package unit tests, Playwright scenarios, and Prisma schema checks before enabling the navigation by default.

Rollback strategy:
- Keep the initial migration additive and reversible where possible.
- If a defect appears, hide the navigation, disable the route entrypoints, and revert only the Attendance package wiring while preserving the schema for auditability.

## Open Questions

- Exact default low-attendance threshold values per course or rule scope if not already resolved by the completion rules data.
- Whether trainer-facing attendance should remain a dedicated trainer route tree or be surfaced as role-based pages inside the existing admin portal in Phase 1.
- Whether any attendance export types should be asynchronously generated from day one or only after report volume requires it.
