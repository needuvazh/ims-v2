## 1. Database Schema — Prisma Model Alignment

- [ ] 1.1 Add `Person` model to `packages/database/prisma/schema.prisma` with fields: `id`, `firstName`, `lastName`, `mobile` (unique, mandatory), `nationalId`, `nationality`, `dateOfBirth`, `gender`, audit fields (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`, `isDeleted`)
- [ ] 1.2 Refactor `User` model: add `personId` (one-to-one FK to Person), `username` (unique), `defaultBranchId`, `preferredLanguage`, `failedLoginCount`, `lockedUntil`, `passwordChangedAt`, `version` (optimistic lock), ensure `email` has a global unique index (no partial index)
- [ ] 1.3 Update `UserStatus` enum to include: `PendingActivation`, `Active`, `Locked`, `Suspended`, `Archived` — remove `Draft`, `Inactive` from enum (add migration note for data backfill if any existing rows use old values)
- [ ] 1.4 Add `UserBranchAccess` model with fields: `id`, `userId`, `branchId`, `isDefault`, `includeChildBranches`, `consolidatedVisibility`, `status` (`Active`/`Revoked`), `revokedAt` (nullable), `revokedBy` (nullable), `reason` (nullable), audit fields — add unique constraint on `(userId, branchId)`. **Revocation sets `status = Revoked` rather than deleting records, preserving assignment history for compliance.**
- [ ] 1.5 Drop or rename `UserDataScope` from IAM usage; add migration note if `UserDataScope` records exist
- [ ] 1.6 Add `PasswordHistory` model: `id`, `userId`, `passwordHash`, `createdAt` — index on `userId`
- [ ] 1.6a Add `UserActivationToken` model: `id`, `userId`, `tokenHash` (SHA-256 of the raw token), `expiresAt` (1 hour from creation), `status` (`Pending`/`Used`/`Expired`), `createdAt`, `usedAt` (nullable) — index on `(tokenHash, status)`. Used for the self-service `POST /api/v1/auth/activate-account` flow.
- [ ] 1.7 Add `SecurityPolicy` model: `id`, `maxFailedAttempts`, `lockoutDurationMinutes`, `passwordMinLength`, `passwordRequireUppercase`, `passwordRequireLowercase`, `passwordRequireNumbers`, `passwordRequireSpecial`, `passwordHistoryCount`, `passwordExpiryDays` (default 90), `resetTokenExpiryMinutes` (default 15), `accessTokenExpiryMinutes` (default 15), `refreshTokenExpiryDays` (default 7), `rememberMeRefreshTokenDays` (configurable, policy-driven), `sessionInactivityMinutes`, `maxConcurrentSessions`, `createdAt`, `updatedAt`
- [ ] 1.8 Expand `AuditLog` model fields: `performedBy`, `performedAt`, `entityType`, `entityId`, `action`, `oldValue` (JSON nullable), `newValue` (JSON nullable), `ipAddress`, `userAgent`, `branchId`, `correlationId`, `reason`, `module` — add index on `(entityType, entityId)`, `performedBy`, `performedAt`, `branchId`
- [ ] 1.9 Add `Notification` model (notification intent persistence): `id`, `type`, `recipientUserId`, `recipientEmail`, `subject`, `body`, `status` (`Pending`/`Sent`/`Failed`), `metadata` (JSON), `providerResponse` (JSON nullable), `createdAt`, `updatedAt`
- [ ] 1.10 Add `ExportJob` model for async report export tracking: `id`, `reportType`, `requestedBy`, `branchId`, `filters` (JSON), `format` (`CSV`/`XLSX`/`PDF`), `status` (`Pending`/`Processing`/`Done`/`Failed`), `fileUrl`, `errorMessage`, `createdAt`, `updatedAt`
- [ ] 1.11 Ensure `OutboxEvent` model exists with: `id`, `eventType`, `payload` (JSON), `status`, `createdAt`, `processedAt`, `retryCount` — add index on `(status, createdAt)` for worker polling
- [ ] 1.12 Update `Permission` model: add `permissionType` enum (`Module`, `Menu`, `Action`, `Report`) field — remove `DataScope` from enum if present; branch data scoping is governed by `UserBranchAccess` not by a permission category; ensure `permissionCode` is unique
- [ ] 1.13 Add index on `UserSession.userId`, `UserSession.status`; add `activeBranchId` field to `UserSession`
- [ ] 1.14 Add `LoginHistory` model if not present or verify existing: `id`, `userId` (**nullable** — null for failed logins where the email does not exist), `attemptedEmail` (non-null string for all attempts, used for enumeration-safe logging), `ipAddress`, `userAgent`, `browser`, `os`, `device`, `status` (`Success`/`Failure`), `failureReason`, `branchId`, `createdAt`
- [ ] 1.15 Generate Prisma migration: `pnpm --filter @ims/database prisma migrate dev --name iam_module_01_schema` with rollback/mitigation notes documented in migration directory
- [ ] 1.16 Run `pnpm --filter @ims/database prisma validate` and resolve any errors
- [ ] 1.17 Update seed data in `packages/database/prisma/seed.ts`: replace all `identity.*` and `audit.view` permission codes with `iam.*`, `report.*`, and `dashboard.*` codes from Part 6; add `iam.session.read`, `iam.session.terminate`, `iam.security-policy.read`, `iam.security-policy.update` permissions to seed (these were missing from the original catalogue and are now included); ensure no old codes remain; seed a default `SecurityPolicy` record

## 2. Domain Layer — `packages/identity-access/src/domain`

- [ ] 2.1 Define `UserStatus` value object / enum: `PendingActivation`, `Active`, `Locked`, `Suspended`, `Archived`
- [ ] 2.2 Define `PermissionType` value object / enum: `Module`, `Menu`, `Action`, `Report` — **do not include `DataScope`**; branch data-scoping is handled exclusively by `UserBranchAccess` and `BranchScopeResolver`
- [ ] 2.3 Add `IamError` structured error class with stable error codes: `IAM-VAL-001` through `IAM-VAL-010`, `IAM-AUTH-001` through `IAM-AUTH-006`, `IAM-AUTHZ-001` through `IAM-AUTHZ-004`, `IAM-SYS-001` — each with HTTP status, English message, Arabic message
- [ ] 2.4 Add `PasswordPolicy` value object: encapsulates min length, complexity requirements, history count, evaluation method `isCompliant(password)`, `isReused(password, history[])` using native `argon2`
- [ ] 2.5 Refactor `user.ts` domain model: add `personId`, `username`, `defaultBranchId`, `preferredLanguage`, `failedLoginCount`, `lockedUntil`, `passwordChangedAt`, `version`, updated `UserStatus`
- [ ] 2.6 Add `UserBranchAccess` domain model: user ID, branch ID, isDefault, status, child-branch visibility
- [ ] 2.7 Update `role.ts` domain model: ensure `isSystemRole` flag is present; add `version`; add invariant: system roles cannot be archived
- [ ] 2.8 Add `SecurityPolicy` domain model: configuration values, factory defaults
- [ ] 2.9 Define repository interfaces in `domain/`: `IUserRepository`, `IRoleRepository`, `IPermissionRepository`, `IUserBranchAccessRepository`, `ISessionRepository`, `IPasswordHistoryRepository`, `IUserActivationTokenRepository`, `ISecurityPolicyRepository`, `IAuditLogRepository`, `INotificationRepository`, `IOutboxEventRepository`, `IExportJobRepository`
- [ ] 2.10 Define `INotificationPort` interface: `sendActivationEmail(recipientEmail, activationData)`, `sendPasswordResetEmail(recipientEmail, resetData)`, `sendAccountLockedNotification(adminEmails, userData)`, `sendRoleAssignedNotification(recipientEmail, roleData)`, `sendBranchAssignedNotification(recipientEmail, branchData)` — no token/link in log
- [ ] 2.11 Define `IPermissionCachePort` interface in the **application layer** (not domain): `getEffectivePermissions(userId)`, `invalidateUser(userId)`, `invalidateRole(roleId)` — with a **no-op (passthrough) implementation only**. The no-op always returns null/miss forcing a database read. No in-memory TTL map, no Redis. This interface is defined to allow a future Redis adapter to be added without changing application service code.

## 3. Application Layer — `packages/identity-access/src/application`

### 3A. Authentication Service

- [ ] 3.1 Implement `login` command: validate credentials with `argon2`, check `UserStatus`, check 90-day password expiry (return `IAM-AUTH-004` if expired), **enforce concurrent session limit from `SecurityPolicy.maxConcurrentSessions`** (if active session count ≥ limit, reject with `IAM-AUTH-008` or terminate the oldest session per documented policy, recording `SessionExpiredByPolicy` audit), enforce lockout threshold from `SecurityPolicy`, increment `failedLoginCount` on failure, lock account on threshold breach, parse User-Agent (via `ua-parser-js`), issue RS256 access token (15 min, `jose` library), issue and hash refresh token (7 days by default or `SecurityPolicy.rememberMeRefreshTokenDays` when `rememberMe=true`), create `UserSession`, persist `LoginHistory` (with OS/Browser info using `attemptedEmail` for all attempts and nullable `userId`), publish `LoginSuccess`/`LoginFailure` audit (branchId sourced from session, not header), publish `AccountLocked` audit + notification on lockout, update metrics. Accept an optional `rememberMe` flag and keep the standard login/refresh/logout endpoints unchanged.
- [ ] 3.2 Implement `refresh` command: look up session by hashed refresh token, detect reuse (reject + revoke + audit if rotated token reused), rotate refresh token (new hash, invalidate old), return new access token, update `lastActivityAt`
- [ ] 3.3 Implement `logout` command: revoke `UserSession`, invalidate refresh token hash, record `LoggedOut` audit
- [ ] 3.4 Implement `forgotPassword` command: look up user by email (generic success regardless of existence), for existing active users generate secure random token, persist SHA-256 hash with **15-minute** expiry (`SecurityPolicy.resetTokenExpiryMinutes` = 15), persist notification record, publish outbox event, record `PasswordResetRequested` audit — do NOT log token or reset link
- [ ] 3.5 Implement `resetPassword` command: look up reset token hash, validate not expired/used, validate new password complexity (`IAM-VAL-005`) and history (`IAM-VAL-009`), update `passwordHash`, append `PasswordHistory`, reset `failedLoginCount` to 0, update status to `Active` if was `Locked`, mark token used, revoke all active sessions, record `PasswordResetCompleted` audit
- [ ] 3.6 Implement `changePassword` command (authenticated): validate current password, validate new password policy and history, update `passwordHash`, append `PasswordHistory`, record `PasswordChanged` audit

### 3B. User Management Service

- [ ] 3.7 Implement `createUser` command: require `iam.user.create` permission, validate email uniqueness (`IAM-VAL-001`), mobile uniqueness (`IAM-VAL-002`), at least one role (`IAM-VAL-008`), at least one branch (`IAM-VAL-007`), default branch within assignments, create `Person` (with `createdBy`/`updatedBy` audit fields), create `User` in `PendingActivation`, assign roles, assign `UserBranchAccess`, generate `UserActivationToken`, persist notification record for activation email, publish `UserCreated` outbox event, record `UserCreated` audit with all actor/entity/branch/correlation fields. **AuditLog.branchId must be sourced from the authenticated session's `activeBranchId`, never from the `X-Branch-Id` HTTP header directly.**
- [ ] 3.8 Implement `updateUser` command: require `iam.user.update` permission and branch scope, validate changed fields, record `UserUpdated` audit with old/new values
- [ ] 3.9 Implement `activateUser` command (admin action): require `iam.user.activate` permission, transition `PendingActivation` → `Active`, record `AccountActivated` audit
- [ ] 3.9a Implement `activateAccountViaToken` command (self-service, no permission required): look up `UserActivationToken` by SHA-256 hash, validate not expired/used, transition user from `PendingActivation` → `Active`, mark token `Used`, record `AccountActivated` audit — this serves `POST /api/v1/auth/activate-account`
- [ ] 3.9b Implement `resendActivationEmail` command (admin action): require `iam.user.activate` permission, generate new `UserActivationToken`, invalidate previous pending tokens for the same user, persist notification record, record `ActivationEmailResent` audit
- [ ] 3.10 Implement `suspendUser` command: require `iam.user.suspend` permission, transition `Active` → `Suspended`, terminate all active sessions, record `UserSuspended` audit, invalidate permission cache
- [ ] 3.11 Implement `archiveUser` command: require `iam.user.archive` permission, transition to `Archived`, soft-delete, preserve all audit history, record `UserArchived` audit, invalidate permission cache
- [ ] 3.12 Implement `unlockUser` command: require `iam.user.unlock` permission, transition `Locked` → `Active`, reset `failedLoginCount`, clear `lockedUntil`, record `UserUnlocked` audit
- [ ] 3.13 Implement `adminResetPassword` command: require `iam.user.reset-password` permission, generate new reset token using `SecurityPolicy.resetTokenExpiryMinutes` (**15-minute** default, same as self-service), persist notification, record `AdminPasswordResetRequested` audit
- [ ] 3.14 Implement `searchUsers` query: require `iam.user.read` permission, enforce branch scope, support pagination (page, pageSize), filtering (status, branchId, roleId, search text), sorting
- [ ] 3.15 Implement `getUserById` query: require `iam.user.read` permission, enforce branch scope

### 3C. Role Management Service

- [ ] 3.16 Implement `createRole` command: require `iam.role.create` permission, validate unique role name/code, create with `Active` status, record `RoleCreated` audit
- [ ] 3.17 Implement `updateRole` command: require `iam.role.update` permission, validate fields, record `RoleUpdated` audit with old/new values
- [ ] 3.18 Implement `archiveRole` command: require `iam.role.archive` permission, reject if `isSystemRole` with `IAM-VAL-010`, transition to `Archived`, record `RoleArchived` audit, invalidate permission cache for all users with this role
- [ ] 3.19 Implement `assignPermissionToRole` command: require `iam.role.permission.assign` permission (not `iam.permission.assign`), validate role and permission are active, add `RolePermission`, invalidate permission cache, record `PermissionAssignedToRole` audit
- [ ] 3.20 Implement `removePermissionFromRole` command: require `iam.role.permission.assign` permission, remove `RolePermission`, invalidate permission cache, record `PermissionRemovedFromRole` audit
- [ ] 3.21 Implement `assignRoleToUser` command: require `iam.user.assign-role` permission (canonical code from Part 6 — not `iam.user.role.assign`), add `UserRole` with `status = Active`, invalidate permission cache (no-op), persist notification, record `RoleAssignedToUser` audit with `reason`
- [ ] 3.22 Implement `removeRoleFromUser` command: require `iam.user.assign-role` permission, set `UserRole.status = Revoked`, set `revokedAt`, `revokedBy`, `reason` — **do NOT delete the record** (revocation preserves history), invalidate permission cache (no-op), record `RoleRemovedFromUser` audit with `reason`
- [ ] 3.23 Implement `searchRoles` query: require `iam.role.read` permission, support pagination/filtering/sorting
- [ ] 3.24 Implement `getRoleById` query: require `iam.role.read` permission, include assigned permissions

### 3D. Permission Management Service

- [ ] 3.25 Implement `createPermission` command: require `iam.permission.create` permission, validate unique `permissionCode`, validate `permissionType`, record `PermissionCreated` audit
- [ ] 3.26 Implement `updatePermission` command: require `iam.permission.update` permission, record `PermissionUpdated` audit with old/new values
- [ ] 3.27 Implement `archivePermission` command: require `iam.permission.archive` permission, check no active roles use it (warn or reject per policy), record `PermissionArchived` audit, invalidate cache
- [ ] 3.28 Implement `searchPermissions` query: require `iam.permission.read` permission, support filtering by type, status, search text
- [ ] 3.29 Implement `getPermissionById` query: require `iam.permission.read` permission

### 3E. Branch Access Service

- [ ] 3.30 Implement `assignBranchToUser` command: require `iam.user.assign-branch` permission, validate branch is active, create `UserBranchAccess` with `status = Active`, if first assignment mark as default, record `BranchAssigned` audit with `reason`
- [ ] 3.31 Implement `removeBranchFromUser` command: require `iam.user.assign-branch` permission, validate user retains at least one branch, set `UserBranchAccess.status = Revoked`, set `revokedAt`, `revokedBy`, `reason` — **do NOT delete the record**, record `BranchRemoved` audit with `reason`
- [ ] 3.32 Implement `setDefaultBranch` command: require `iam.user.assign-branch` permission, validate target branch is in user's active assignments, update `User.defaultBranchId`, record `DefaultBranchChanged` audit
- [ ] 3.33 Implement `switchActiveBranch` command (authenticated user, no extra permission): validate target branch is in user's **active** (non-revoked) assignments (`IAM-AUTHZ-002` if not), update `UserSession.activeBranchId`, record `BranchSwitched` audit. **AuditLog.branchId is the new branch from session, not the `X-Branch-Id` HTTP header.**
- [ ] 3.34 Implement `getUserBranchAccess` query: require `iam.user.read` permission, return all branch assignments for a user

### 3F. Session Management Service

- [ ] 3.35 Implement `listUserSessions` query: require `iam.session.read` permission, return active sessions for a user
- [ ] 3.36 Implement `terminateSession` command: require `iam.session.terminate` permission, revoke session, record `SessionTerminated` audit
- [ ] 3.37 Implement `terminateAllUserSessions` command: require `iam.session.terminate` permission, revoke all sessions for a user, record `AllSessionsTerminated` audit

### 3G. Security Policy Service

- [ ] 3.38 Implement `getSecurityPolicy` query: require `iam.security-policy.read` permission
- [ ] 3.39 Implement `updateSecurityPolicy` command: require `iam.security-policy.update` permission, validate configurable values, record `SecurityPolicyUpdated` audit with old/new values

### 3H. Audit Query Service

- [ ] 3.40 Implement `listAuditLogs` query: require `iam.audit.read` permission, enforce branch scope, support pagination, filtering by entity type, entity ID, action, performer, date range, module
- [ ] 3.41 Implement `getAuditLogById` query: require `iam.audit.read` permission
- [ ] 3.42 Ensure no update/delete methods exist on `IAuditLogRepository`; audit records are append-only at application-service level

### 3I. Authorization Guard

- [ ] 3.43 Implement `AuthorizationGuard` (application layer port, not domain): `verifyPermission(userId, permissionCode, branchId?)` — check active status, session validity, effective permissions (read from DB via `IPermissionCachePort` no-op), branch assignment
- [ ] 3.44 Implement `EffectivePermissionsService`: aggregate permissions from all **active** (non-revoked) user roles using direct DB queries. `IPermissionCachePort` no-op is always a miss — permissions are always resolved from the database. Phase 1 effective permission formula: **Role Permissions only** (no direct user grants or denials — deferred to Phase 2).
- [ ] 3.45 Implement `BranchScopeResolver`: from active branch context (`session.activeBranchId`, not `X-Branch-Id` header), resolve allowed branch IDs for a user by querying `UserBranchAccess` with `status = Active` including child-branch visibility

## 4. Persistence Adapters — `packages/database`

- [ ] 4.1 Implement `PrismaUserRepository` implementing `IUserRepository`: `findById`, `findByEmail`, `findByUsername`, `search`, `create`, `update`, `archive` — enforce global email unique check in `create`/`update`
- [ ] 4.2 Implement `PrismaRoleRepository` implementing `IRoleRepository`: `findById`, `findByCode`, `search`, `create`, `update`, `archive`
- [ ] 4.3 Implement `PrismaPermissionRepository` implementing `IPermissionRepository`: `findById`, `findByCode`, `search`, `create`, `update`, `archive`
- [ ] 4.4 Implement `PrismaUserBranchAccessRepository` implementing `IUserBranchAccessRepository`: `findByUser`, `assign`, `remove`, `setDefault`
- [ ] 4.5 Implement `PrismaSessionRepository` implementing `ISessionRepository`: `create`, `findByAccessTokenId`, `findByHashedRefreshToken`, `revoke`, `revokeAll`, `listActive`, `findById`
- [ ] 4.6 Implement `PrismaPasswordHistoryRepository` implementing `IPasswordHistoryRepository`: `append`, `findRecentN`
- [ ] 4.7 Implement `PrismaSecurityPolicyRepository` implementing `ISecurityPolicyRepository`: `get`, `update`
- [ ] 4.8 Implement `PrismaAuditLogRepository` implementing `IAuditLogRepository` (no update/delete): `append`, `list`, `findById`
- [ ] 4.9 Implement `PrismaNotificationRepository` implementing `INotificationRepository`: `create`, `markSent`, `markFailed`, `list`
- [ ] 4.10 Implement `PrismaOutboxEventRepository` implementing `IOutboxEventRepository`: `publish` (within transaction), `claimPending`, `markProcessed`, `markFailed`
- [ ] 4.11 Implement `PrismaExportJobRepository` implementing `IExportJobRepository`: `create`, `updateStatus`, `findById`, `listByUser`
- [ ] 4.12 Implement `PrismaLoginHistoryRepository`: `append`, `findByUser` (used in reports)

## 5. JWT & Token Infrastructure — `packages/shared-auth`

- [ ] 5.1 Install `jose` as a dependency: `pnpm --filter @ims/shared-auth add jose`
- [ ] 5.2 Generate RSA key pair utility (for dev/test with env-based private key injection in production): `generateRSAKeyPair()`
- [ ] 5.3 Implement `JwtService` using `jose`: `signAccessToken(payload, privateKey)` (RS256, 15 min), `verifyAccessToken(token, publicKey)`, `decodeAccessToken(token)` (no verify — for logging safe metadata only)
- [ ] 5.4 Implement `RefreshTokenService`: `generate()` → returns `{ raw, hash }`, `verify(raw, hash)` using crypto comparison, `detect reuse` flag interface
- [ ] 5.5 Update `packages/shared-auth/src/permissions.ts`: replace `identity.*`/`audit.view` constants with full `iam.*` permission code constants from Part 6, including `iam.session.read`, `iam.session.terminate`, `iam.security-policy.read`, `iam.security-policy.update`
- [ ] 5.6 Update `packages/shared-auth/src/session.ts`: update session type to include `activeBranchId`, `accessTokenJti`, `hashedRefreshToken`, `lastActivityAt`, `status`
- [ ] 5.7 Define `NoOpPermissionCache` implementing `IPermissionCachePort` (always returns null/miss on get, no-op on invalidate). **Do NOT implement an in-memory TTL map or any real cache.** The interface exists only to allow a future Redis adapter to be swapped in. Remove any prior `InMemoryPermissionCache` implementation.

## 6. Notification Infrastructure — `packages/integrations` (or within `identity-access`)

- [ ] 6.1 Create `DummyNotificationProvider` implementing `INotificationPort`: logs a safe redacted version of the notification intent (no token/link in log), marks notification record as `Sent` with dummy provider response
- [ ] 6.2 Create `NotificationService`: on each IAM lifecycle event, persist `Notification` record first, then call provider adapter — handle provider failure gracefully (log error, mark record `Failed`, do not throw from application service)
- [ ] 6.3 Ensure reset token / reset link is never passed to or logged by the notification adapter — only metadata like user ID, expiry time, notification type

## 7. Observability — `packages/observability`

- [ ] 7.1 Implement `ILogger` interface: `info`, `warn`, `error`, `debug` with structured `{ requestId, correlationId, userId?, branchId?, action, result, ...meta }` — no passwords/tokens/secrets in fields
- [ ] 7.2 Implement `ConsoleStructuredLogger` implementing `ILogger` (JSON lines to stdout, production-ready for log aggregation)
- [ ] 7.3 Implement `IMetrics` interface: `increment(metricName, labels?)`, `timing(metricName, ms, labels?)`
- [ ] 7.4 Implement `InMemoryMetrics` implementing `IMetrics` (accumulates counters for test/dev; emit these values to health/metrics endpoint): track `iam_login_total`, `iam_login_success_total`, `iam_login_failed_total`, `iam_account_locked_total`, `iam_permission_denied_total`, `iam_active_sessions`, `iam_auth_latency_ms`, `iam_api_errors_total`
- [ ] 7.5 Implement `CorrelationContext`: extract `X-Correlation-ID` / `traceparent` from request headers, generate if absent, propagate through request lifecycle and audit log `correlationId`

## 8. API Route Handlers — `apps/admin-portal/app/api`

All route handlers are thin adapters: authenticate → authorize → validate (Zod) → call one application service → return documented envelope or RFC7807 error.

### 8A. Auth Routes `/api/v1/auth`

- [ ] 8.1 `POST /api/v1/auth/login` — public, NAT-aware rate-limited (e.g. 50 req/min per IP or IP+Device), Zod: `{ email, password, rememberMe? }`, calls `authService.login()`, returns `{ data: { user: {...}, session: {...} } }` and sets `HttpOnly`, `Secure`, `SameSite=Strict` cookies for `accessToken` and `refreshToken`. `rememberMe` maps to the configured session-policy duration and does not create a separate auth flow.
- [ ] 8.1a `POST /api/v1/auth/activate-account` — public, rate-limited (10 req/min per IP), Zod: `{ token }`, calls `userService.activateAccountViaToken()`, returns 200. This is the self-service activation endpoint required for the `{{ActivationLink}}` in activation emails.
- [ ] 8.1b `POST /api/v1/users/:id/resend-activation` — `iam.user.activate`, Zod: no body, calls `userService.resendActivationEmail()`, returns 200. Admin fallback for activation delivery failures.
- [ ] 8.2 `POST /api/v1/auth/refresh` — public, rate-limited, reads `refreshToken` from HttpOnly cookie (or fallback to body if required by non-browser clients), calls `authService.refresh()`, returns new token pair in `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
- [ ] 8.3 `POST /api/v1/auth/logout` — authenticated, Zod: `{ sessionId }`, calls `authService.logout()`, clears token cookies, returns 204
- [ ] 8.4 `POST /api/v1/auth/forgot-password` — public, rate-limited (10 req/min per IP), Zod: `{ email }`, calls `authService.forgotPassword()`, always returns generic success
- [ ] 8.5 `POST /api/v1/auth/reset-password` — public, Zod: `{ token, newPassword, confirmPassword }`, calls `authService.resetPassword()`, returns 204
- [ ] 8.6 `POST /api/v1/auth/change-password` — authenticated, Zod: `{ currentPassword, newPassword, confirmPassword }`, calls `authService.changePassword()`, returns 204
- [ ] 8.7 `POST /api/v1/auth/switch-branch` — authenticated, Zod: `{ branchId }`, calls `branchAccessService.switchActiveBranch()`, returns updated session branch context

### 8B. User Routes `/api/v1/users`

- [ ] 8.8 `GET /api/v1/users` — `iam.user.read`, branch-scoped, Zod query params, calls `userService.searchUsers()`, returns paginated list
- [ ] 8.9 `POST /api/v1/users` — `iam.user.create`, Zod body, calls `userService.createUser()`, returns 201 with user DTO
- [ ] 8.10 `GET /api/v1/users/:id` — `iam.user.read`, branch-scoped, calls `userService.getUserById()`, returns user DTO
- [ ] 8.11 `PUT /api/v1/users/:id` — `iam.user.update`, branch-scoped, Zod body, calls `userService.updateUser()`, returns updated user DTO
- [ ] 8.12 `POST /api/v1/users/:id/activate` — `iam.user.activate`, calls `userService.activateUser()`, returns 200
- [ ] 8.13 `POST /api/v1/users/:id/suspend` — `iam.user.suspend`, Zod body `{ reason }`, calls `userService.suspendUser()`, returns 200
- [ ] 8.14 `POST /api/v1/users/:id/archive` — `iam.user.archive`, Zod body `{ reason }`, calls `userService.archiveUser()`, returns 200
- [ ] 8.15 `POST /api/v1/users/:id/unlock` — `iam.user.unlock`, calls `userService.unlockUser()`, returns 200
- [ ] 8.16 `POST /api/v1/users/:id/reset-password` — `iam.user.reset-password`, calls `userService.adminResetPassword()`, returns 200

### 8C. User Role & Branch Routes

- [ ] 8.17 `GET /api/v1/users/:id/roles` — `iam.user.read`, returns assigned roles (active only by default; include `status` field so caller can see revoked history if permitted)
- [ ] 8.18 `POST /api/v1/users/:id/roles` — `iam.user.assign-role` (canonical Part 6 code), Zod body `{ roleId, reason? }`, calls `roleService.assignRoleToUser()`, returns 201
- [ ] 8.19 `DELETE /api/v1/users/:id/roles/:roleId` — `iam.user.assign-role`, Zod body `{ reason }`, calls `roleService.removeRoleFromUser()`, returns 200 (logical revocation, not HTTP 204 delete)
- [ ] 8.20 `GET /api/v1/users/:id/branches` — `iam.user.read`, returns branch assignments
- [ ] 8.21 `POST /api/v1/users/:id/branches` — `iam.user.assign-branch`, Zod body `{ branchId, isDefault? }`, calls `branchAccessService.assignBranchToUser()`, returns 201
- [ ] 8.22 `DELETE /api/v1/users/:id/branches/:branchId` — `iam.user.assign-branch`, calls `branchAccessService.removeBranchFromUser()`, returns 204
- [ ] 8.23 `PUT /api/v1/users/:id/branches/default` — `iam.user.assign-branch`, Zod body `{ branchId }`, calls `branchAccessService.setDefaultBranch()`, returns 200

### 8D. Session Routes `/api/v1/sessions`

- [ ] 8.24 `GET /api/v1/users/:id/sessions` — `iam.session.read`, returns active sessions
- [ ] 8.25 `DELETE /api/v1/sessions/:sessionId` — `iam.session.terminate`, calls `sessionService.terminateSession()`, returns 204
- [ ] 8.26 `DELETE /api/v1/users/:id/sessions` — `iam.session.terminate`, calls `sessionService.terminateAllUserSessions()`, returns 204

### 8E. Role Routes `/api/v1/roles`

- [ ] 8.27 `GET /api/v1/roles` — `iam.role.read`, paginated list
- [ ] 8.28 `POST /api/v1/roles` — `iam.role.create`, returns 201
- [ ] 8.29 `GET /api/v1/roles/:id` — `iam.role.read`, with permissions
- [ ] 8.30 `PUT /api/v1/roles/:id` — `iam.role.update`
- [ ] 8.31 `POST /api/v1/roles/:id/archive` — `iam.role.archive`, rejects system roles with `IAM-VAL-010`
- [ ] 8.32 `GET /api/v1/roles/:id/permissions` — `iam.role.read`, returns permission list
- [ ] 8.33 `POST /api/v1/roles/:id/permissions` — `iam.role.permission.assign`, Zod body `{ permissionId }`, returns 201
- [ ] 8.34 `DELETE /api/v1/roles/:id/permissions/:permissionId` — `iam.role.permission.assign`, returns 204
- [ ] 8.35 `GET /api/v1/roles/:id/users` — `iam.role.read`, returns users assigned to role

### 8F. Permission Routes `/api/v1/permissions`

- [ ] 8.36 `GET /api/v1/permissions` — `iam.permission.read`, paginated, filterable by type/status
- [ ] 8.37 `POST /api/v1/permissions` — `iam.permission.create`, returns 201
- [ ] 8.38 `GET /api/v1/permissions/:id` — `iam.permission.read`
- [ ] 8.39 `PUT /api/v1/permissions/:id` — `iam.permission.update`
- [ ] 8.40 `POST /api/v1/permissions/:id/archive` — `iam.permission.archive`

### 8G. Security Policy Routes `/api/v1/security`

- [ ] 8.41 `GET /api/v1/security/policy` — `iam.security-policy.read`
- [ ] 8.42 `PUT /api/v1/security/policy` — `iam.security-policy.update`
- [ ] 8.43 `GET /api/v1/security/login-history` — `iam.audit.read`, paginated login history
- [ ] 8.44 `GET /api/v1/users/:id/login-history` — `iam.user.read`, per-user login history

### 8H. Audit Routes `/api/v1/audit`

- [ ] 8.45 `GET /api/v1/audit` — `iam.audit.read`, branch-scoped, paginated, filterable
- [ ] 8.46 `GET /api/v1/audit/:id` — `iam.audit.read`
- [ ] 8.47 `POST /api/v1/audit/export` — `iam.audit.read` + export permission, returns `ExportJob` reference

### 8I. Report & Dashboard Routes `/api/v1/reports`

- [ ] 8.48 `GET /api/v1/reports/iam/user-directory` — `report.iam.user`, branch-scoped, paginated
- [ ] 8.49 `POST /api/v1/reports/iam/user-directory/export` — `report.iam.user` + export permission, returns `ExportJob`
- [ ] 8.50 `GET /api/v1/reports/iam/user-access` — `report.iam.user-access`, branch-scoped
- [ ] 8.51 `POST /api/v1/reports/iam/user-access/export` — export permission
- [ ] 8.52 `GET /api/v1/reports/iam/login-history` — `report.iam.login-history`, branch-scoped
- [ ] 8.53 `POST /api/v1/reports/iam/login-history/export`
- [ ] 8.54 `GET /api/v1/reports/iam/failed-logins` — `report.iam.login-history`
- [ ] 8.55 `POST /api/v1/reports/iam/failed-logins/export`
- [ ] 8.56 `GET /api/v1/reports/iam/locked-accounts` — `report.iam.security`
- [ ] 8.57 `POST /api/v1/reports/iam/locked-accounts/export`
- [ ] 8.58 `GET /api/v1/reports/iam/password-resets` — `report.iam.security`
- [ ] 8.59 `POST /api/v1/reports/iam/password-resets/export`
- [ ] 8.60 `GET /api/v1/reports/iam/roles` — `report.iam.role`
- [ ] 8.61 `POST /api/v1/reports/iam/roles/export`
- [ ] 8.62 `GET /api/v1/reports/iam/permission-matrix` — `report.iam.permission`
- [ ] 8.63 `POST /api/v1/reports/iam/permission-matrix/export`
- [ ] 8.64 `GET /api/v1/reports/iam/branch-access` — `report.iam.branch`
- [ ] 8.65 `POST /api/v1/reports/iam/branch-access/export`
- [ ] 8.66 `GET /api/v1/reports/iam/privileged-users` — `report.iam.privileged`
- [ ] 8.67 `POST /api/v1/reports/iam/privileged-users/export`
- [ ] 8.68 `GET /api/v1/reports/iam/security-events` — `report.iam.security`
- [ ] 8.69 `POST /api/v1/reports/iam/security-events/export`
- [ ] 8.70 `GET /api/v1/reports/iam/permission-changes` — `report.iam.permission`
- [ ] 8.71 `GET /api/v1/reports/iam/sessions` — `report.iam.session`
- [ ] 8.72 `POST /api/v1/reports/iam/sessions/export`
- [ ] 8.73 `GET /api/v1/reports/iam/audit-trail` — `iam.audit.read`, filterable audit export report
- [ ] 8.74 `POST /api/v1/reports/iam/audit-trail/export`
- [ ] 8.75 `GET /api/v1/reports/iam/export-jobs/:jobId` — `iam.user.read`, poll export job status
- [ ] 8.76 `GET /api/v1/reports/iam/export-jobs/:jobId/download` — `iam.user.read`, download completed export file

### 8J. Dashboard Routes `/api/v1/dashboards`

- [ ] 8.77 `GET /api/v1/dashboards/iam/security` — `dashboard.security`, branch-scoped KPIs: login success/failure counts, locked accounts, permission denials, active sessions
- [ ] 8.78 `GET /api/v1/dashboards/iam/administration` — `dashboard.admin`, KPIs: total users, active users, roles, permissions, branches
- [ ] 8.79 `GET /api/v1/dashboards/iam/executive` — `dashboard.ceo`, executive-level KPIs
- [ ] 8.80 `GET /api/v1/dashboards/iam/compliance` — `dashboard.compliance`, compliance KPIs: audit event counts, failed login trends

### 8K. Health Routes

- [ ] 8.81 `GET /health/live` — always 200 if process is alive
- [ ] 8.82 `GET /health/ready` — check DB connectivity, JWT key availability, migration state; return 200 or 503 with status detail
- [ ] 8.83 `GET /health/startup` — return 200 once startup initialization is complete
- [ ] 8.84 `GET /health/metrics` — return IAM metric counters for scraping (internal/monitoring use only)

### 8L. Shared API Middleware

- [ ] 8.85 Implement `withAuth` middleware: extract and verify RS256 access token from `accessToken` HttpOnly cookie (or Authorization header for non-browser clients), look up active session, inject `userId`, `sessionId`, `activeBranchId`, `correlationId` into request context
- [ ] 8.86 Implement `withPermission(code)` middleware: call `AuthorizationGuard.verifyPermission()`, return `IAM-AUTHZ-001` on failure, increment `iam_permission_denied_total`
- [ ] 8.87 Implement `withBranchScope` middleware: validate `X-Branch-Id` or session `activeBranchId`, resolve branch access via `BranchScopeResolver`, return `IAM-AUTHZ-002` on mismatch
- [ ] 8.88 Implement `withRateLimit(limit, windowMs)` middleware: apply hybrid IP + device fingerprinting to safely support corporate NAT environments on login, forgot-password, and refresh endpoints
- [ ] 8.89 Implement `withCorrelation` middleware: extract or generate `X-Correlation-ID`, inject into request context, include in response headers
- [ ] 8.90 Implement `errorHandler`: map `IamError` to RFC7807 JSON with `type`, `title`, `status`, `detail`, `errorCode`, `correlationId`; map unknown errors to `IAM-SYS-001` with sanitized detail; never leak stack traces

## 9. Report Export Service

- [ ] 9.1 Implement `ExportService`: accepts report type, filters, format, branch/permission context; queries report data using Prisma streaming/cursors; generates CSV via streams (e.g. `csv-stringify` stream API); generates XLSX via streams (`exceljs` stream writer); generates PDF using streaming libraries — enforce caller's branch scope in all queries. Never buffer entire datasets in memory to prevent event loop blocking and OOM crashes.
- [ ] 9.2 Implement `ExportJobWorker` (in `apps/worker`): poll `ExportJob` records with `Pending` status, call `ExportService`, upload to object storage or local temp path (dummy file URL for now), update `ExportJob.status` to `Done`/`Failed`, update `fileUrl`
- [ ] 9.3 Implement branch + permission enforcement inside `ExportService` — same rules as corresponding report API

## 10. Validation — Zod Schemas

- [ ] 10.1 Create `packages/identity-access/src/validation/` directory with Zod schemas for: `LoginSchema`, `RefreshSchema`, `ForgotPasswordSchema`, `ResetPasswordSchema`, `ChangePasswordSchema`, `CreateUserSchema`, `UpdateUserSchema`, `CreateRoleSchema`, `UpdateRoleSchema`, `CreatePermissionSchema`, `UpdatePermissionSchema`, `AssignBranchSchema`, `SwitchBranchSchema`, `UpdateSecurityPolicySchema`, `PaginationSchema`, `AuditListFilterSchema`
- [ ] 10.2 Enforce password complexity rule in `ResetPasswordSchema` and `ChangePasswordSchema` using `PasswordPolicy.isCompliant()` as a Zod `.refine()` — return `IAM-VAL-005` on failure
- [ ] 10.3 Ensure all Zod error messages use the stable IAM error message strings from Part 7 (not default Zod messages)

## 11. Error Codes and Messages

- [ ] 11.1 Create `packages/identity-access/src/errors/iam-errors.ts` with all error code constants, HTTP status codes, English messages, and Arabic messages for: `IAM-VAL-001` through `IAM-VAL-010`, `IAM-AUTH-001` through `IAM-AUTH-008`, `IAM-AUTHZ-001` through `IAM-AUTHZ-004`, `IAM-SYS-001`
- [ ] 11.2 Ensure `IAM-AUTH-001` always returns generic `"Invalid credentials."` detail — never distinguish between bad email and bad password in API responses. `IAM-AUTH-004` returns "Password expired. Please change your password." `IAM-AUTH-008` returns "Maximum concurrent sessions reached."
- [ ] 11.3 Ensure `IAM-VAL-010` is returned specifically when archiving a system role (`isSystemRole: true`)
- [ ] 11.4 Ensure `IAM-VAL-009` is returned when new password matches any of the last N password history entries (N from `SecurityPolicy.passwordHistoryCount`, default 10)
- [ ] 11.5 Ensure `IAM-AUTH-008` is returned (or oldest session is terminated) when concurrent session count reaches `SecurityPolicy.maxConcurrentSessions`
- [ ] 11.6 Add Arabic translations for all IAM error messages. The `IamError` structured error class SHALL include both `messageEn` and `messageAr` fields.

## 12. Tests (BDD Scenarios from Part 9)

### 12A. Domain Unit Tests

- [ ] 12.1 Test `PasswordPolicy`: valid password passes, weak fails (`IAM-VAL-005`), reused password fails (`IAM-VAL-009`)
- [ ] 12.2 Test `UserStatus` transitions: valid and invalid transitions with expected errors
- [ ] 12.3 Test `Role` domain: archiving system role throws `IAM-VAL-010`
- [ ] 12.4 Test `IamError` structure: correct HTTP status and error code for each defined error

### 12B. Application Service Tests

- [ ] 12.5 **IAM-001-01**: `createUser` succeeds — creates Person, User in `PendingActivation`, assigns roles/branches, queues notification, publishes outbox, records `UserCreated` audit
- [ ] 12.6 **IAM-001-02**: `createUser` with duplicate email — returns `IAM-VAL-001`, no user created, failed audit recorded
- [ ] 12.7 **IAM-001-03**: `createUser` without role — returns `IAM-VAL-008`
- [ ] 12.8 **IAM-001-04**: `createUser` without branch — returns `IAM-VAL-007`
- [ ] 12.9 **IAM-002-01**: `updateUser` succeeds — records `UserUpdated` audit with old/new values
- [ ] 12.10 **IAM-002-02**: `updateUser` without `iam.user.update` — returns `IAM-AUTHZ-001`
- [ ] 12.11 **IAM-003-01**: `suspendUser` — transitions to `Suspended`, terminates sessions, records `UserSuspended` audit
- [ ] 12.12 **IAM-003-02**: `archiveUser` — transitions to `Archived`, preserves audit history, records `UserArchived` audit
- [ ] 12.13 **IAM-004-01**: `login` success — issues RS256 access token, hashed refresh token, creates session, `LoginHistory`, records `LoginSuccess` audit
- [ ] 12.14 **IAM-004-02**: `login` invalid password — increments `failedLoginCount`, records `LoginFailure` audit
- [ ] 12.15 **IAM-004-03**: `login` after threshold — locks account, sets `lockedUntil`, records `AccountLocked` audit + notification
- [ ] 12.16 **IAM-004-04**: `login` suspended user — returns `IAM-AUTH-003`, no session created
- [ ] 12.17 **IAM-005-01**: `logout` — revokes session and refresh token, records `LoggedOut` audit
- [ ] 12.18 **IAM-005-02**: `terminateSession` with `iam.session.terminate` — closes session, records `SessionTerminated` audit
- [ ] 12.19 **IAM-006-01**: `forgotPassword` for active user — creates **15-minute** expiry token hash, notification record, records `PasswordResetRequested` audit
- [ ] 12.19a **NEW-ACT-01**: `activateAccountViaToken` with valid token — transitions user to `Active`, marks token `Used`, records `AccountActivated` audit
- [ ] 12.19b **NEW-ACT-02**: `activateAccountViaToken` with expired token — returns authentication error, user remains `PendingActivation`
- [ ] 12.19c **NEW-SESSION-01**: `login` when active session count equals `maxConcurrentSessions` — either rejects with `IAM-AUTH-008` or terminates oldest session and records `SessionExpiredByPolicy` audit
- [ ] 12.19d **NEW-EXPIRY-01**: `login` when password is expired (> 90 days old) — returns `IAM-AUTH-004`, no session created
- [ ] 12.20 **IAM-006-02**: `resetPassword` with valid token — updates password, revokes sessions, marks token used, records `PasswordResetCompleted` audit
- [ ] 12.21 **IAM-006-03**: `resetPassword` with weak password — returns `IAM-VAL-005`
- [ ] 12.22 **IAM-006-04**: `resetPassword` with reused password — returns `IAM-VAL-009`
- [ ] 12.23 **IAM-007-01**: `createRole` — creates with `Active` status, records `RoleCreated` audit
- [ ] 12.24 **IAM-007-02**: `assignPermissionToRole` — recalculates/invalidates effective permissions, records `PermissionAssignedToRole` audit
- [ ] 12.25 **IAM-007-03**: `archiveRole` on system role — returns `IAM-VAL-010`
- [ ] 12.26 **IAM-008-01**: `assignBranchToUser` — records `BranchAssigned` audit
- [ ] 12.27 **IAM-008-02**: `switchActiveBranch` — updates session `activeBranchId`, subsequent queries scoped to new branch
- [ ] 12.28 **IAM-008-03**: `switchActiveBranch` to unassigned branch — returns `IAM-AUTHZ-002`
- [ ] 12.29 **IAM-010-01**: audit log created with all required fields (performer, entity, action, old/new, IP, UA, branch, correlation, reason, timestamp)
- [ ] 12.30 **IAM-010-02**: no `update`/`delete` method on audit repository — only `append` and `list`

### 12C. API Integration Tests

- [ ] 12.31 **IAM-API-001**: `POST /api/v1/auth/login` with valid credentials — 200, access token, refresh token
- [ ] 12.32 **IAM-API-001**: `POST /api/v1/auth/login` with invalid credentials — 401, `IAM-AUTH-001`, `"Invalid credentials."`
- [ ] 12.33 **IAM-API-002**: `GET /api/v1/users` without token — 401, `IAM-AUTH-002`
- [ ] 12.34 **IAM-API-002**: `GET /api/v1/users` with token but without `iam.user.read` — 403, `IAM-AUTHZ-001`
- [ ] 12.35 **IAM-API-002**: `GET /api/v1/users` with valid auth + permission — 200, paginated list, branch-scoped
- [ ] 12.36 **IAM-API-003**: `POST /api/v1/users` with duplicate email — 400, `IAM-VAL-001`
- [ ] 12.37 **IAM-API-004**: `POST /api/v1/users/:id/archive` with valid permission — 200, user archived
- [ ] 12.38 **IAM-API-005**: `POST /api/v1/auth/switch-branch` to unassigned branch — 403, `IAM-AUTHZ-002`
- [ ] 12.39 **IAM-API-006**: `GET /api/v1/audit` without `iam.audit.read` — 403, `IAM-AUTHZ-001`
- [ ] 12.40 **IAM-API-006**: `GET /api/v1/audit` with valid permission — 200, audit rows with all required fields

### 12D. Negative Tests

- [ ] 12.41 **IAM-NEG-001**: Login with SQL injection in email field — sanitized, no injection, 401
- [ ] 12.42 **IAM-NEG-002**: Login for archived user — 401, `IAM-AUTH-003`
- [ ] 12.43 **IAM-NEG-003**: `POST /api/v1/auth/reset-password` with expired token — 400/401, `IAM-AUTH-005`
- [ ] 12.44 **IAM-NEG-004**: `POST /api/v1/auth/refresh` with invalid/already-rotated refresh token — 401, `IAM-AUTH-004`
- [ ] 12.45 **IAM-NEG-005**: `GET /api/v1/roles` without `iam.role.read` — 403, `IAM-AUTHZ-001`
- [ ] 12.46 **IAM-NEG-006**: Branch access bypass attempt (branchId in query param not in user's assigned branches) — 403, `IAM-AUTHZ-002`
- [ ] 12.47 **IAM-NEG-007**: `POST /api/v1/roles/:id/archive` for system role — 400/422, `IAM-VAL-010`
- [ ] 12.48 **IAM-NEG-008**: `POST /api/v1/auth/reset-password` with reused password — 400, `IAM-VAL-009`
- [ ] 12.49 **IAM-NEG-009**: Attempt to `PUT /api/v1/audit/:id` — 405 or 403 (no update route exists)
- [ ] 12.50 **IAM-NEG-010**: `POST /api/v1/users` with invalid email format — 400, `IAM-VAL-003` with field error

### 12E. Security Tests

- [ ] 12.51 **IAM-SEC-001**: XSS payload in user name field — stored safely, returned as escaped string, not executed
- [ ] 12.52 **IAM-SEC-002**: JWT tampering — invalid signature rejected with 401
- [ ] 12.53 **IAM-SEC-003**: Refresh token replay after rotation — second use rejected, session revoked
- [ ] 12.54 **IAM-SEC-004**: Brute force 50 requests to login endpoint — NAT-aware rate limiter returns 429 before lockout threshold globally affects other users on same IP
- [ ] 12.55 **IAM-SEC-005**: Privilege escalation — user with `iam.user.read` only cannot call `POST /api/v1/users`
- [ ] 12.56 **IAM-SEC-006**: Access token for user A cannot access another user's profile outside branch scope
- [ ] 12.57 **IAM-SEC-007**: Unauthenticated request to protected API — 401, `IAM-AUTH-002`
- [ ] 12.58 **IAM-SEC-008**: Verify no password, token, reset link, JWT, API key, or private key appears in structured log output during normal operations

### 12F. Post-Deploy Smoke Tests

- [ ] 12.59 Create `apps/admin-portal/smoke/iam.smoke.ts` (or `scripts/smoke-test-iam.ts`): login with valid credentials → assert 200, invalid login → assert 401, user list access → assert 200, role list access → assert 200, permission evaluation endpoint → assert effective permissions shape, branch switch → assert updated context, audit write via a test action → assert audit log entry present, logout → assert session revoked

## 13. Shared Auth Package Updates

- [ ] 13.1 Export updated `permissions` constants from `packages/shared-auth/src/permissions.ts` using full `iam.*`, `report.*`, `dashboard.*` codes
- [ ] 13.2 Export `JwtService`, `RefreshTokenService` from `packages/shared-auth`
- [ ] 13.3 Ensure existing tests in `packages/shared-auth/src/permissions.test.ts` and `scopes.test.ts` pass with updated permission codes

## 14. Verification Commands

- [ ] 14.1 `pnpm --filter @ims/database prisma validate` — no schema errors
- [ ] 14.2 `pnpm --filter @ims/database prisma migrate dev --create-only` — migration generated without destructive data loss (review before applying)
- [ ] 14.3 `pnpm tsc --noEmit` (root or affected packages) — no TypeScript errors
- [ ] 14.4 `pnpm lint` — no lint errors
- [ ] 14.5 `pnpm --filter @ims/identity-access test` — all domain and application service tests pass
- [ ] 14.6 `pnpm --filter @ims/shared-auth test` — permissions and scopes tests pass
- [ ] 14.7 API integration tests (using Vitest or Jest with test DB): run `pnpm test:integration` on affected packages
- [ ] 14.8 Smoke tests: `pnpm smoke:iam` against local dev server
- [ ] 14.9 `pnpm build` — all affected apps and packages build successfully
- [ ] 14.10 `graphify update .` — knowledge graph updated after implementation

## 15. Documentation Updates

- [ ] 15.1 Update `docs/project-status.md`: mark IAM Module 01 backend/API/security foundation as in-progress or complete with implementation notes
- [ ] 15.2 Update or create `openspec/specs/identity-access/spec.md` with any delta changes needed after implementation (API inventory, permission codes list, localized EN/AR messages)
- [ ] 15.3 Add migration rollback notes for the IAM schema migration in `packages/database/prisma/migrations/<migration_name>/README.md`
- [ ] 15.4 Document the RS256 key pair setup procedure (env var names for private/public key injection) in a `docs/operations/jwt-key-setup.md` runbook
- [ ] 15.5 Add `openspec/changes/implement-iam-module-01/specs/iam-api-contracts/spec.md` endpoint inventory/contract matrix updates if any route changes during implementation
- [ ] 15.6 Publish an OpenAPI 3.1 contract document for the IAM `/api/v1` surface, including request/response schemas and error codes
