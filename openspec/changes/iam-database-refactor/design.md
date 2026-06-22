## Context

The current database structure of the Institute Management System (IMS) lacks critical constructs defined in the Module 1 FRD. Specifically, we do not persist user sessions (preventing dynamic revocation or active session listings), we lack brute-force lockout attributes, we have no effective start/end dates on roles and users, we cannot classify permissions, and the system seed lacks personas like Trainers and Accountants.

This design implements a database-level refactoring to support these requirements, optimizing indexes for scalability.

## Goals / Non-Goals

**Goals:**
- Update `schema.prisma` with `UserSession`, `LoginHistory`, effective dating fields, lockout attributes, permission classifications, and correct indexes.
- Generate a Prisma migration that includes a custom SQL step to enforce email uniqueness only for active records (`isDeleted = false`).
- Expand the database seed to represent all core FRD user classifications, roles, permissions, data scopes, and mock users.
- Modify repository models and Zod command validations in the `identity-access` package.

**Non-Goals:**
- Rewriting the authentication core (it will still issue cookies, but now link them to database sessions).
- Implementing UI pages for session list or lockout triggers (those will be implemented in subsequent delivery tasks).

## Decisions

### 1. Introduce `UserSession` and `LoginHistory` Models
We will add `UserSession` and `LoginHistory` tables to the PostgreSQL schema.
- `UserSession` stores active tokens (using a secure SHA-256 `tokenHash` representation of the session token), client metadata (IP, user agent), and lifecycle status (`Active`, `Expired`, `Revoked`).
- `LoginHistory` tracks successful and failed login attempts.
- **Session Lifecycle Hooks:**
  - **Login:** On successful authentication, `AuthService.signIn` writes an `Active` session record to `UserSession`.
  - **Verification:** The Next.js Server Components guard (`auth-guard.ts` -> `getSession`) hashes the incoming token and checks `UserSession.status === 'Active'`. If the session is `Revoked` or `Expired`, access is denied.
  - **Logout:** The sign-out handler (`sign-out/route.ts`) hashes the token and marks the session as `Revoked` in the database.

*Rationale*: Directly fulfills FRD specifications Section 4 (Owned Concepts) and Section 12 (Operational Views for Active Sessions and Login History).

### 2. Add Effective Dates & Lockout Fields
We will add `effectiveStartDate` and `effectiveEndDate` to `User` and `Role` models, and add `failedLoginAttempts` and `lockoutUntil` to the `User` model.
- **Brute-Force Lockout Mechanics:**
  - Max failed login attempts threshold is **5**.
  - On the 5th consecutive failure, the user's status transitions to `Locked` and `lockoutUntil` is set to 15 minutes in the future.
  - Success resets `failedLoginAttempts` to `0` and clears `lockoutUntil`.
  - Admin unlock transitions status back to `Active` and clears `failedLoginAttempts` and `lockoutUntil`.
- **Effective Dating Checks:**
  - **User-level:** During `AuthService.signIn` and `auth-guard.ts` validation, verify that `effectiveStartDate <= now` and `effectiveEndDate >= now` (or `null`).
  - **Role-level:** The query `findByEmailWithCredentials` filters roles to load only those with status `Active`, `effectiveStartDate <= now`, and `effectiveEndDate >= now` (or `null`). Expired or deactivated roles are excluded from session token creation.

*Rationale*: Satisfies screen design requirements (IAM-UI-003, IAM-UI-004, IAM-UI-005) and brute-force lockout rules.

### 3. Add Permission Classification
We will add a `PermissionType` enum (Module, Menu, Action, Report, DataScope) to the `Permission` model.

*Rationale*: Enables the dynamic Permission Assignment Matrix (IAM-UI-006) to filter permissions by category.

### 4. Optimize Indexes for Monolith Performance
We will apply:
- Index on `Branch.instituteId` to speed up organization mapping.
- Indexes on `UserRole.roleId` and `RolePermission.permissionId` to accelerate checks for dependent active assignments.
- Indexes on `AuditLog.actorId` and `AuditLog.occurredAt` to support timeline filtering.
- Remove redundant index on `User.email`.

*Rationale*: Ensures database performance remains fast as audit logs and user counts grow.

### 5. Partial Unique Index on User Emails
To support soft deletes without blocking new signups, we will drop the default unique constraint on `email` and create a PostgreSQL partial unique index where `isDeleted = false`.

*Rationale*: Avoids database crashes when registering a new user with an email address previously soft-deleted.

---

## Risks / Trade-offs

- **Migration Overhead:** Introducing new required fields to existing tables could fail if there is existing data.
  - *Mitigation:* We will provide default values (`now()` for `effectiveStartDate`, `0` for `failedLoginAttempts`, `false` for `isDeleted`) to ensure the migration succeeds on existing datasets.
- **Outbox / Event Syncing:** Adding database sessions requires updating logout and login hooks.
  - *Mitigation:* Keep session validation logic thin; query verification in `auth-guard` uses lightweight index scans.

---

## Migration Plan

1. **Schema Definition:** Edit `packages/database/prisma/schema.prisma` with updated models.
2. **Local Migration Generation:** Run `prisma migrate dev --create-only` to draft the migration script.
3. **Customize SQL Constraint:** Modify the generated SQL to replace the standard email unique constraint with `CREATE UNIQUE INDEX ... WHERE is_deleted = false`.
4. **Codebase Adaptation:**
   - Update `packages/identity-access/src/domain/user.ts` and `role.ts` Zod validation schemas.
   - Update repository interfaces and Prisma adapter mapping code in `packages/database/src/repositories/prisma-user-repository.ts` (or equivalent files).
5. **Seeding script Rewrite:** Update `packages/database/prisma/seed.ts` with comprehensive scopes, roles, permissions, and personas.
6. **Verify and Deploy:** Execute `pnpm run db:reset` or `pnpm prisma migrate dev` to run the seeds, then execute the test suite to verify no regressions occur.
