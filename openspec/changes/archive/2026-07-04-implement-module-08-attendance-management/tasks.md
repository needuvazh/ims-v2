## 1. Attendance Package Foundation

- [x] 1.1 Create the `packages/attendance` package scaffold with `src/index.ts`, `package.json`, and `tsconfig.json`.
- [x] 1.2 Add attendance domain models, status enums, error types, and Zod boundary schemas for sessions, records, corrections, and alerts.
- [x] 1.3 Add attendance repository interfaces and application service contracts for session lifecycle, marking, correction, summary, and reporting use cases.

## 2. Persistence and Seed Alignment

- [x] 2.1 Add Prisma models for `AttendanceSession`, `AttendanceRecord`, `AttendanceCorrection`, and `AttendanceAlert` with branch scope, soft delete, audit columns, and versioning.
- [x] 2.2 Add required unique constraints and indexes for attendance session uniqueness, record deduplication, correction pending uniqueness, and report lookup performance.
- [x] 2.3 Add the attendance migration and verify it is additive and reversible where possible.
- [x] 2.4 Seed attendance menu, action, report, dashboard, and audit permissions and map them to the appropriate roles.

## 3. Domain and Application Services

- [x] 3.1 Implement attendance session opening and roster generation from active enrollments only.
- [x] 3.2 Implement manual attendance draft save, record updates, and status validation rules.
- [x] 3.3 Implement attendance submit, lock, and reopen flows with reason capture and server-side authorization.
- [x] 3.4 Implement correction request, approval, rejection, and cancel flows while preserving official values and audit history.
- [x] 3.5 Implement attendance percentage calculation and low-attendance detection rules.
- [ ] 3.6 Implement branch-scoped query services for session lists, student summaries, trainer workload, batch summaries, correction aging, and report exports.

## 4. Delivery Runtime and APIs

- [x] 4.1 Wire the attendance services, repositories, and query adapters into `apps/admin-portal/app/lib/runtime.ts`.
- [x] 4.2 Add attendance route handlers for session CRUD, roster generation, record marking, submit, lock, reopen, and correction workflows under `apps/admin-portal/app/api/v1/attendance`.
- [ ] 4.3 Add attendance report and export routes with explicit permission checks, branch filtering, and stable error mapping.
- [ ] 4.4 Add attendance server actions only where they materially improve the trainer/admin form workflow, and keep them calling the same application services.

## 5. Portal Screens and Navigation

- [x] 5.1 Replace the trainer attendance placeholder page with the real attendance workflow UI.
- [ ] 5.2 Add admin attendance screens for dashboard, session list, session detail, correction queue, batch summary, low-attendance report, audit trail, and export history.
- [x] 5.3 Add student read-only attendance summary screens and warning states in the student portal.
- [ ] 5.4 Update portal navigation and branch-aware layouts so attendance entries appear only when the required permissions are present.

## 6. Audit, Notifications, and Observability

- [ ] 6.1 Ensure attendance marking, updates, submission, lock, reopen, correction approval/rejection, report access, and export generation write audit logs with old/new values, actor, branch, reason, and timestamps.
- [ ] 6.2 Trigger low-attendance and correction notifications through the communication boundary without letting Attendance issue completion or certificate actions.
- [ ] 6.3 Add structured logs, metrics, and health checks for attendance requests, roster load, submit, export, audit writes, and branch denials.

## 7. Tests and Verification

- [ ] 7.1 Add unit tests for roster generation, duplicate record prevention, attendance status validation, correction state transitions, percentage calculations, and branch-scope guards.
- [ ] 7.2 Add API route tests for authorization, branch isolation, validation failures, locked-session rejection, correction approval/rejection, and export permissions.
- [ ] 7.3 Add Playwright E2E coverage for trainer marking, coordinator correction approval, student summary view, branch denial, and Arabic RTL rendering.
- [ ] 7.4 Run `pnpm prisma validate`, the relevant package/unit test suites, app route tests, and the attendance Playwright suite before marking the change ready.
- [ ] 7.5 Update `docs/project-status.md` and any affected architecture notes once implementation is complete and verified.
