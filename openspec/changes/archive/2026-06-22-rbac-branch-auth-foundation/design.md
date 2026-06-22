## Context

The Institute Management System (IMS) requires dynamic RBAC and branch-scoped authorization boundaries. While PostgreSQL database tables exist for user roles and scopes, the code lacked:
1. Retrieval of user scopes from database during login.
2. Embedding of data scopes in the stateless cookie-based `Session` payload.
3. Logical checks to assert whether a user is allowed to access specific branches.
4. Server-side validation guards protecting admin portal Server Actions.

This design implements these runtime security boundaries without introducing stateful sessions, external cache dependencies, or architectural adjustments to the modular monolith topology.

## Goals / Non-Goals

**Goals:**
- Extend the encoded session contract to encapsulate user scopes.
- Implement server-side verification helpers for branch scoping.
- Restrict admin portal mutation paths (Server Actions) based on user permissions.
- Dynamically display the active/allowed branch name in portal templates.
- Fix broken test environments to ensure workspace reliability.

**Non-Goals:**
- Introducing persistent session storage (sessions remain stateless cookie-based).
- Altering core database schemas.
- Modifying business rules of other domains (like Admissions or Finance).

## Decisions

### 1. Extend the session payload schema to include dataScopes

Update `Session` schema in `packages/shared-auth/src/session.ts` to include `dataScopes` as an array of user scope rules.

*Rationale*:
Encapsulating user scopes directly in the HMAC-signed session cookie allows the application/delivery layer to make immediate, database-free scoping assertions on every incoming request.

### 2. Implement scopes verification helpers in shared-auth

Create `packages/shared-auth/src/scopes.ts` to offer `isAuthorizedForBranch`, `getAuthorizedBranchIds`, and `isGlobalScope` checks.

*Rationale*:
By housing scoping helper logic in `@ims/shared-auth`, all domains and app portals can reuse the exact same criteria for data boundary evaluation.

### 3. Load user scopes during authentication credentials check

Update the database repository (`findByEmailWithCredentials`) to query the `user_data_scopes` relation, and pass this collection to the `AuthService.signIn` session builder.

*Rationale*:
Attaching scopes at authentication time ensures that the session cookie represents the most recent scope boundaries assigned to the user.

### 4. Create Next.js Server Action Guards (`assertPermission`, `assertBranchScope`)

Add `apps/admin-portal/app/lib/auth-guard.ts` providing `assertPermission` and `assertBranchScope` functions that throw a `DomainError` on failure.

*Rationale*:
Server-side actions execute outside the route matcher and middleware. Therefore, they must perform explicit permission and scope validation inside the action function context before invoking application services.

### 5. Resolve active branch name dynamically in Layouts

Update `apps/admin-portal/app/(protected)/layout.tsx` to read the session's active branch or default assigned scopes, loading the correct name from `organizationService` instead of hardcoding "Central Campus".

*Rationale*:
Ensures the UI correctly displays the user's operational branch context.

### 6. Protect Read-Path Pages and Organization Mutations

Enforce `assertPermission` checks on protected page paths (e.g. `IdentityPage`, `OrganizationPage`) and protect all Server Actions inside `organization/actions.ts` using permissions (`organization.manage`) and branch scopes (`assertBranchScope`).

*Rationale*:
Ensures that read paths and organizational setup are secured from unauthorized users, and that branch managers are restricted to mutating branches within their data scope.

### 7. Support Active Branch Switching and Default Scoping

1. Provide a Server Action to allow users to switch their active branch, updating the session cookie.
2. Auto-initialize `activeBranchId` to the user's assigned branch on authentication if they are scoped to exactly one branch.

*Rationale*:
Unlocks branch-specific contexts and enables down-stream aggregate tracking for admissions and payments.

### 8. Enforce Database-Backed Login Auditing

Inject `AuditLogRepository` into `AuthService` to record success/failure audits (`identity.login_succeeded`, `identity.login_failed`).

*Rationale*:
Fulfills compliance requirements for access and security audits without exposing credentials in detail logs.

### 9. Secure Active Branch Switcher from Unauthorized Global Escapes

Require global `'All'` data scope check when switching active branch to `'All'` inside `setActiveBranchAction`.

*Rationale*:
Prevents non-global users (e.g. branch managers or counselors) from escaping their branch context and querying cross-branch datasets.

### 10. Refine Branch Scoping Checks for granular levels

Refine `isAuthorizedForBranch` to accept options for `requireFullAccess` (blocking `assignedOnly` scopes for writes) and support implicit branch access for `Department` scopes.

*Rationale*:
Ensures that staff with restricted `assignedOnly` or department-specific access cannot perform unauthorized branch-wide mutations, while allowing them to pass record-level checks.

### 11. Enforce Role & Permission Lifecycle Invariant Validations

Validate that target roles and permissions are `Active` prior to user assignment in `UserService` and role assignment in `RoleService`.

*Rationale*:
Preserves domain integrity and enforces FRD Section 6.4 rules on user and role update flows.

### 12. Map Account Status Transitions to Granular Audit Actions

Differentiate generic update events in audit logs into dedicated audit actions (e.g. `identity.user_locked`, `identity.user_activated`, `identity.user_deactivated`).

*Rationale*:
Fulfills Phase 1 security audit trail compliance, allowing clean reporting without complex JSON payload parsing.

### 13. Enforce Session Expiration in Stateless Cookie Payload

Add `expiresAt: z.number()` to the Zod session schema. `AuthService.signIn` will set it to 8 hours from issue time. The decoding runtime will reject any session where `Date.now() > session.expiresAt`.

*Rationale*:
Mitigates session hijacking by ensuring stolen tokens cannot be replayed indefinitely on the server.

### 14. Enforce Password Complexity Verification via Zod validation

Update `createUserCommandSchema` and `changePasswordCommandSchema` to enforce a standard security complexity regex (at least one uppercase, one lowercase, one digit, and one special character) rather than simple minimum length.

*Rationale*:
Aligns validation logic with the FRD password policy requirements and NFR standards.

### 15. Map specific business domain error codes

Introduce explicit error codes in the `DomainErrorCode` type matching the FRD Section 11.2 list (`inactive_user_cannot_login`, `locked_user_cannot_login`, `role_assigned_to_active_users`, `permission_not_active`, `branch_scope_violation`, etc.) instead of generic HTTP code names.

*Rationale*:
Enables clients to handle status changes gracefully and render appropriate user-facing notifications.

### 16. Verify User Database Status in server-side Action guards

Modify `getSession()` inside the Next.js `auth-guard.ts` utility to look up the user's status (`Active` / `Locked` / `Inactive`) in the database on request paths.

*Rationale*:
Prevents security bypasses where locked or deactivated users with unexpired cookie signatures continue to perform mutations and queries.

---

## Risks / Trade-offs

- **Cookie Size Inflation**: Storing user scopes in cookies increases cookie header sizes.
  - *Mitigation*: The number of branches assigned to a single staff member is typically low (1-3). If a user has global scope, we only store a single `'All'` entry, minimizing overhead.
- **Diverged Session Status**: If a user's permissions or status change in the DB, the active session cookie remains valid until expiration.
  - *Mitigation*: The Server Action guards verify user status from the DB on every request. Direct permission changes take effect on the next login or session reissue, balancing DB queries with security.

---

## Migration Plan

1. Modify session schemas and add verification helpers.
2. Query and attach scopes in the authentication lookup.
3. Create server-side action guards and integrate them in identity actions.
4. Protect Organization actions and Page read pathways using permission asserts.
5. Create active branch selector utilities and action, with global switcher checks.
6. Inject audit logging into AuthService for credentials checking.
7. Update layouts to resolve branch names dynamically and resolve multi-branch active defaults.
8. Enforce active checks for roles in `UserService.assignRole` and active checks for permissions in `RoleService.assignPermission`.
9. Differentiate user status transitions in `UserService.updateUser` into explicit audit actions.
10. Implement token expiration check in `decodeSession` and add password complexity validation schemas.
11. Update `auth-guard.ts` to perform a lightweight query check on user status.
12. Expand `DomainErrorCode` in `shared-kernel` to include explicit business error codes.
13. Re-configure Vitest to exclude E2E Playwright tests and fix test suite data assertions.
14. Verify unit and E2E specs pass.

