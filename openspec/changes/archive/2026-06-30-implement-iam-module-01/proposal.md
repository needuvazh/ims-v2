## Why

ASTI IMS requires Module 01 - Identity & Access Management as the foundational security layer before protected business modules can be safely exposed. This change implements the backend/API/security foundation for dynamic permission-based authorization, branch-scoped access, sessions, password management, auditability, notifications, reports, and operational observability using the approved IAM SDS Parts 1-11.

## What Changes

- Implement IAM-owned identity lifecycle, authentication, authorization, RBAC, branch access, session, password, audit, notification, reporting, and dashboard backend capabilities.
- Align the Prisma schema with the approved Part 4 entity model, including `Person`, `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `UserBranchAccess`, `UserSession`, `LoginHistory`, `PasswordHistory`, `SecurityPolicy`, `AuditLog`, notification persistence, and export/report support.
- Replace existing `identity.*` seed permissions with approved `iam.*`, report, and dashboard permission codes; do not keep old entries in code, seed, or database migrations.
- Enforce global unique email addresses across active, archived, and soft-deleted users.
- Use `PendingActivation`, `Active`, `Locked`, `Suspended`, and `Archived` user statuses.
- Add explicit `UserBranchAccess`; do not use `UserDataScope` as the IAM branch authorization model.
- Implement REST API contracts from Part 5 under `/api/v1` with Zod validation, stable response envelopes, RFC7807 errors, permission checks, branch checks, audit logs, and OpenAPI 3.1-compatible contract documentation.
- Implement RS256 JWT access tokens using a secure JOSE implementation, refresh-token rotation/reuse detection, server-side hashed refresh tokens, and database-backed sessions. Tokens must be delivered and stored via `HttpOnly`, `Secure`, `SameSite=Strict` cookies to mitigate XSS risks. Support `Remember Me` only through the standard session policy and existing auth endpoints.
- Use `argon2` for password hashing in this phase to prevent event-loop blocking.
- Set password reset token expiry to **15 minutes**.
- Publish the complete IAM endpoint inventory and contract matrix aligned to Part 5, including auth, user, role, permission, branch, session, security policy, audit, report, dashboard, and health endpoints.
- Ensure rate-limiting strategies handle corporate NAT IPs gracefully using a NAT-aware hybrid IP + device fingerprint approach.
- Implement self-service account activation endpoint (`POST /api/v1/auth/activate-account`) so users can complete activation via emailed token link without requiring admin action.
- Enforce concurrent session limit per `SecurityPolicy.maxConcurrentSessions` (default 3) at login time; reject or terminate oldest session when limit is exceeded.
- Implement all IAM reports and exports required by Part 8, protected by report permissions and branch scope, using Node.js Streams to prevent memory and event-loop blocking issues.
- Add an admin-triggered `POST /api/v1/users/:id/resend-activation` endpoint as a fallback for activation email delivery failures.
- Add notification records and a dummy notification provider for activation, password reset, account locked, role assignment, and branch assignment until a real provider is selected.
- **No in-memory or Redis permission cache in this phase.** Permission evaluation reads from the database on every request. Cache is deferred until a Redis infrastructure decision is made. `IPermissionCachePort` is defined as an interface but only a no-op (passthrough) implementation is provided.
- Add operational health endpoints, structured logs, metrics, trace propagation, smoke-test support, and runbook-aligned behavior from Part 11.
- Defer full admin-portal UI implementation to a later phase; backend contracts must still support the Part 3 screens.

## Capabilities

### New Capabilities
- `iam-api-contracts`: REST API contracts, request/response DTOs, RFC7807 error mapping, rate-limit boundaries, and endpoint-level permissions for IAM.
- `iam-branch-access`: Explicit user-branch assignment, active branch switching, branch-scoped query enforcement, and branch access auditing.
- `iam-audit-notifications`: Immutable security audit logging, notification persistence, outbox events, and dummy notification delivery for IAM-sensitive events.
- `iam-reporting-exports`: Branch-scoped IAM reports, dashboards, KPIs, and report exports required by the SDS.
- `iam-operations-observability`: IAM health checks, structured logs, metrics, trace propagation, alerts, smoke-test support, and production readiness hooks.

### Modified Capabilities
- `identity-access`: Expand the existing identity-access requirements to the full approved IAM Module 01 backend/API/security foundation, including global email uniqueness, `UserBranchAccess`, 15-minute reset tokens, 90-day password expiry enforcement, `iam.*` permissions, RS256 JWTs via HttpOnly cookies, required user statuses, password history, security policy, session management, precise device tracking, concurrent session limit enforcement, self-service activation token flow, Remember Me support within session policy, and BDD acceptance coverage.

## Impact

- Owning bounded context: Identity & Access Management.
- Affected downstream/supporting contexts: Organization for Branch references, Audit for audit records, Reporting for report/read-model behavior, Integrations for dummy notification/email adapter, Observability for logs/metrics/traces.
- Affected packages/apps: `packages/identity-access`, `packages/database`, `packages/shared-auth`, `packages/audit`, `packages/observability`, `apps/admin-portal/app/api`, and test suites.
- Affected APIs: `/api/v1/auth/*`, `/api/v1/users`, `/api/v1/roles`, `/api/v1/permissions`, `/api/v1/audit`, `/api/v1/security/*`, `/api/v1/sessions`, report/dashboard endpoints, and health endpoints.
- Database impact: Prisma schema changes and migrations are required; destructive migrations require explicit care because identity data is security-critical.
- Authorization impact: Protected operations must use permission checks and branch checks; role names are never authorization logic.
- Branch-scope impact: Every IAM operational query, report, dashboard, and mutation that targets branch-owned data must validate assigned branch access.
- Audit impact: Every security-sensitive IAM action must write an immutable audit log with actor, entity, old/new values, IP, user agent, branch, correlation ID, reason, and timestamp.
- Event/outbox impact: Security lifecycle side effects should persist notification/outbox records in the same transaction where reliability is required.
- NFR impact: Implements Part 10 and Part 11 requirements for secure tokens, refresh rotation, rate limiting boundaries, health checks, structured logs, metrics, traces, smoke tests, and production readiness.
- Portal impact: Admin portal consumes these APIs first; student/trainer/public portals are not implemented here but will later consume IAM authentication, authorization, session, and branch context.
- Source-document conflict resolutions: permissions use `iam.*`; user statuses include `PendingActivation`, `Suspended`, and `Archived`; explicit `UserBranchAccess` is required; Part 4 `Person`/`defaultBranchId`/`preferredLanguage`/`username`/mandatory mobile pattern is authoritative; email is globally unique; role permission assignment uses `iam.role.permission.assign`; user-to-role assignment uses `iam.user.assign-role`; RS256 JWT is required; password reset token expiry is **15 minutes** for this change set; Remember Me is supported only through the standard session policy and existing auth endpoints; no in-memory permission cache; concurrent session limit enforced at login; self-service activation endpoint required; publish complete endpoint inventory and contract matrix; reports require exports for all IAM reports; dummy notification provider is acceptable for now; backend/API/security foundation comes before UI; localized EN/AR responses and standard headers remain required.
