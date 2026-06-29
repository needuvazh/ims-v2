## Context

The current repository contains a partial Identity & Access foundation with Prisma models for users, roles, permissions, sessions, login history, reset tokens, audit logs, and outbox events. The approved ASTI IAM SDS Parts 1-11 require a broader enterprise IAM module with explicit `Person`, global unique email, `UserBranchAccess`, `iam.*` permissions, configured password/security policies, immutable audit, notifications, report/export support, RS256 JWTs, and operational observability.

Identity & Access Management is the owning bounded context. Organization supplies branch records that IAM references for access control. Audit, Reporting, Integrations, and Observability are supporting concerns consumed through stable ports/adapters rather than direct business-rule ownership leaks.

## Goals / Non-Goals

**Goals:**
- Implement the backend/API/security foundation for IAM Module 01.
- Align database schema, seed data, application services, API contracts, validation, audit, notifications, reports, exports, and observability with the approved SDS and conflict decisions.
- Enforce permission-based access and branch-scoped access server-side for every protected operation.
- Keep Next.js route handlers thin and business behavior inside IAM domain/application services.
- Automate the BDD, negative, security, and API scenarios from Part 9 that apply to backend/API/security foundation.

**Non-Goals:**
- Full admin portal UI implementation in this delivery.
- SSO, MFA, OAuth provider integration, biometric login, SMS/WhatsApp delivery, AI anomaly detection, SaaS tenancy, microservices, CQRS, event sourcing, external brokers, Redis, or any distributed cache.
- In-memory permission cache. Permission evaluation reads directly from the database for Phase 1. `IPermissionCachePort` is defined as a passthrough/no-op interface only. Cache infrastructure is deferred pending an explicit Redis infrastructure decision.
- Real email provider selection. This delivery persists notifications and uses a dummy provider adapter.

## Decisions

1. Use explicit `UserBranchAccess` for branch authorization.
   - Rationale: The approved resolution states branch-scoped authorization is business-critical and must not be modeled as generic `UserDataScope`.
   - Alternative considered: Keep `UserDataScope`. Rejected because it obscures the core IAM branch assignment rule.

2. Use `iam.*` permission codes only for IAM.
   - Rationale: Parts 5 and 6 use `iam.*`, and the user approved migration away from `identity.*` and `audit.view`.
   - Alternative considered: Support old codes as aliases. Rejected because backward compatibility is not required and would weaken contract clarity.

3. Enforce global unique email addresses.
   - Rationale: Part 4 and the approved decision require email uniqueness even for archived/soft-deleted accounts.
   - Alternative considered: Partial unique index over active records. Rejected by decision.

4. Use RS256 JWT via `jose`.
   - Rationale: Part 10 requires RS256, `jose` is a maintained JOSE/JWT library suitable for asymmetric signing and verification.
   - Alternative considered: HS256 with shared secret. Rejected because it conflicts with SDS.

5. Use `argon2` for password hashing in this phase.
   - Rationale: Approved by architectural review to prevent event loop blocking vulnerabilities associated with pure JS implementations.
   - Alternative considered: Keep `bcryptjs`. Rejected due to DoS risk under high load.

6. Persist notifications and use a dummy provider.
   - Rationale: Provider is not selected, but lifecycle actions must produce durable notification intent.
   - Alternative considered: Skip notifications until provider selection. Rejected because Part 7/9 require notification behavior.

7. Implement reports and exports through IAM query services.
   - Rationale: Part 8 requires all IAM reports to respect permissions and branch scope, with exports required for all reports.
   - Alternative considered: Defer exports. Rejected by user.

8. Add observability with interfaces and local implementations first.
   - Rationale: Part 11 requires logs, metrics, traces, alerts, and health checks; infrastructure vendors are not selected.
   - Alternative considered: Add Redis/monitoring vendor dependencies now. Rejected — infrastructure vendor selection is pending.

9. No permission cache in Phase 1; `IPermissionCachePort` is a no-op passthrough.
   - Rationale: In-memory cache is incompatible with multi-instance deployments (creates permission-bypass windows when revocations are not propagated). Redis cache would require an infrastructure decision not yet made. Reading permissions from the database on every authorized request is correct and safe for Phase 1 scale (single deployment, ≤ 100 concurrent users). The `IPermissionCachePort` interface is defined so that a Redis adapter can be plugged in without changing application service code when the decision is made.
   - Alternative considered: In-memory TTL cache. Rejected — creates a security breach window where a suspended or role-revoked user may retain access on non-invalidated instances until TTL expires.
   - Alternative considered: Add Redis now. Rejected — infrastructure provider not selected; adds operational complexity without confirmed need for Phase 1.

10. Password reset token expiry is 15 minutes (CF-001 resolution).
    - Rationale: The approved implementation review requires the shorter window for this phase, and the change set now updates proposal, spec, design, and tasks consistently.
    - If future security review requires a different window, update `SecurityPolicy.resetTokenExpiryMinutes` and all password-reset messaging together.

11. User-to-role assignment uses `iam.user.assign-role` (not `iam.user.role.assign`).
    - Rationale: Part 6 Permission Catalogue lists `iam.user.assign-role`. Code and tasks are updated to use this canonical code.

12. Self-service activation token endpoint is included in Phase 1.
    - Rationale: Users created in `PendingActivation` must be able to complete activation via the emailed link without requiring admin action. `POST /api/v1/auth/activate-account` is added to API contracts.

13. Concurrent session limit is enforced at login.
    - Rationale: FR-IAM-032 and Part 10 §5.3 require configurable concurrent session limits. The login command checks active session count against `SecurityPolicy.maxConcurrentSessions` before creating a new session.

14. Remember Me is supported through the standard session policy and existing auth endpoints.
    - Rationale: The approved review requests Remember Me support, but not a separate auth flow. Login accepts `rememberMe` and maps it to the configured policy-driven refresh/session lifetime.
    - Alternative considered: Separate remember-me endpoint or ad hoc cookie logic. Rejected because it fragments the standard auth lifecycle.

15. Publish complete endpoint inventory and contract matrix.
    - Rationale: Part 5 requires explicit API contracts; the proposal must enumerate all IAM endpoints, permissions, scopes, and response conventions before implementation.

16. Use `HttpOnly` cookies for token delivery and client-side storage.
    - Rationale: Returning JWTs in JSON payloads for the client to store in LocalStorage introduces severe XSS risks. Returning access and refresh tokens in Secure, HttpOnly, SameSite=Strict cookies mitigates XSS.
    
17. Enforce Node.js Streams for all export formats.
    - Rationale: Generating CSV, XLSX, and PDF exports in-memory blocks the event loop and causes OOM crashes under load. Using streaming APIs ensures stable resource usage.

## Risks / Trade-offs

- [Risk] IAM schema migration is large and security-sensitive. → Mitigation: create explicit migrations, preserve auditability, run Prisma validation, add migration notes, and avoid destructive data loss without approval.
- [Risk] Removing old permission codes may break existing seed/demo users. → Mitigation: update all code, seed data, and tests atomically to `iam.*` permissions.
- [Risk] Exports for every report can cause OOM crashes. → Mitigation: mandate Node.js Streams in ExportService and implement shared export service with streaming CSV/Excel/PDF adapters.
- [Risk] HttpOnly cookies require CSRF protection for mutations. → Mitigation: rely on SameSite=Strict for first-party clients and implement standard CSRF tokens if cross-origin mutations are required.
- [Risk] Dummy notification provider does not send real emails. → Mitigation: persist notification records/outbox events so real provider can be added behind the same port. Email provider must be configured before UAT.
- [Risk] No permission cache means every authorized database read queries permissions. → Mitigation: use efficient Prisma queries with appropriate indexes on UserRole, RolePermission, UserBranchAccess. Acceptable for Phase 1 scale. Add Redis cache when horizontal scaling is required.
- [Risk] AuditLog.branchId must come from session, not HTTP header. → Mitigation: document as domain invariant in AuditLogger; always source branchId from `session.activeBranchId`.
- [Risk] UserRole removal is a hard delete by default. → Mitigation: tasks updated to add `status`/`revokedAt`/`revokedBy` revocation fields so removal is a logical archive, not a destructive delete.
- [Risk] Remember Me can widen token lifetime if not policy-driven. → Mitigation: gate it behind SecurityPolicy, keep the login/refresh/logout endpoints unchanged, and test both standard and remembered-session paths.

## Migration Plan

1. Add or alter Prisma models/enums for IAM entities and explicit branch access.
2. Update seed permissions and roles to approved `iam.*`, report, and dashboard codes.
3. Add application-service layer and repository interfaces before route handlers.
4. Add API routes with validation, auth, permission, branch, audit, and error mapping.
5. Add reports/export services and observability endpoints.
6. Run Prisma validation, typecheck, lint, unit tests, API tests, and build.
7. Run graphify update after code changes during implementation.

Rollback/mitigation:
- Schema migration rollback must be documented per migration.
- If production migration risk is high, use additive migrations first, backfill, then remove obsolete structures in a later approved change.
- If login or permission evaluation fails after deployment, Part 11 rollback triggers route traffic to the previous stable version and clear permission cache.

## Open Questions

- Exact production email provider remains undecided; this change uses a dummy provider and persistent notification records. **Email provider must be configured and tested before UAT begins.**
- Exact production monitoring/alerting vendor remains undecided; this change exposes structured logs, metrics, traces, and health endpoints through local abstractions.
- Redis infrastructure decision is deferred. When horizontal scaling is required, add a Redis-backed `IPermissionCachePort` adapter without changing application service code.
- Report scheduling (Daily/Weekly/Monthly delivery per Part 8 §14) is **deferred to Phase 2** pending explicit client approval. Phase 1 delivers on-demand reports and exports only.
- Direct user permission assignment (FR-IAM-022) is **deferred to Phase 2** pending scope confirmation. The effective permission formula in Phase 1 is: Role Permissions only (no direct user grants or denials).
- `ua-parser-js` commercial license (AGPL) must be reviewed and approved before production use.
