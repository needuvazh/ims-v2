## 1. Schema Refactoring

- [x] 1.1 Add `effectiveStartDate` and `effectiveEndDate` to the `User` and `Role` models in `packages/database/prisma/schema.prisma`.
- [x] 1.2 Add `failedLoginAttempts` and `lockoutUntil` to the `User` model in `schema.prisma`.
- [x] 1.3 Add enum `PermissionType` (Module, Menu, Action, Report, DataScope) and a `permissionType` field to the `Permission` model.
- [x] 1.4 Add the `UserSession` and `LoginHistory` models to `schema.prisma`.
- [x] 1.5 Optimize database indexes in `schema.prisma` (remove redundant `User.email` index; add indexes on `UserRole.roleId`, `RolePermission.permissionId`, `Branch.instituteId`, `AuditLog.actorId`, and `AuditLog.occurredAt`).

## 2. Database Migration & PostgreSQL Constraints

- [x] 2.1 Run `prisma migrate dev --create-only` to draft a migration.
- [x] 2.2 Edit the migration file to replace the default `User.email` unique constraint with a PostgreSQL partial unique index `WHERE is_deleted = false`.
- [x] 2.3 Apply the migration using `prisma migrate dev` (or appropriate pnpm script) to update the database.

## 3. Domain Model and Zod Updates

- [x] 3.1 Update Zod schemas and type definitions in `packages/identity-access/src/domain/user.ts` (e.g. `createUserCommandSchema`, `updateUserCommandSchema`) to support effective dates and status fields.
- [x] 3.2 Update Zod schemas and type definitions in `packages/identity-access/src/domain/role.ts` to support effective dates.
- [x] 3.3 Ensure `RoleRecord` is fully populated with `effectiveStartDate` and `effectiveEndDate` in domain mapping.

## 4. Repository & Service Integration

- [x] 4.1 Update Prisma-based repositories mapping code:
  - In `prisma-user-repository.ts`: mapping `effectiveStartDate`/`effectiveEndDate` during user creation/updates; filter out expired/inactive roles in `findByEmailWithCredentials`.
  - In `prisma-role-repository.ts`: map and save `effectiveStartDate`/`effectiveEndDate` in `toRole`, `create`, and `update`.
- [x] 4.2 Define repository methods for tracking login failures (`incrementFailedAttempts`, `resetFailedAttempts`) and session tracking (`createSession`, `getSessionByHash`, `revokeSessionByHash`).
- [x] 4.3 Update `AuthService.signIn` to:
  - Check user status (`Inactive`/`Draft` / `Locked`).
  - Validate user active dating (deny access if `now` falls outside start/end dates).
  - Verify password, and update failed login attempts (lock user if attempts >= 5) or reset attempts on success.
  - Create and persist an active session in the database (`UserSession`).
- [x] 4.4 Update `auth-guard.ts` (`getSession`) to fetch and verify the session in the database (ensuring status is `Active` and not expired/revoked) in addition to statelessly decoding the cookie.
- [x] 4.5 Update the sign-out route (`sign-out/route.ts`) to mark the database session status as `Revoked`.

## 5. Seed Script Enhancements

- [x] 5.1 Expand permissions inside `packages/database/prisma/seed.ts` with all core FRD module permissions and set their `permissionType`.
- [x] 5.2 Add roles for all FRD User Classifications (Owner, Trainer, Student, Accountant, Management, Academic Coordinator) in `seed.ts`.
- [x] 5.3 Add mock users with appropriate scopes for each role (e.g., Accountant with Riyadh Branch scope, Trainer with Muscat Campus scope and assignedOnly scope).
- [x] 5.4 Seed effective start dates and empty effective end dates for all users and roles.
- [x] 5.5 Run `pnpm run db:reset` or seed command to verify the seed runs successfully without foreign key violations.

## 6. Verification and Testing

- [x] 6.1 Add unit tests in `user-service.test.ts` and `auth-service.test.ts` to assert:
  - Lockout transitions to `Locked` at 5 failures and sets `lockoutUntil`.
  - Logging in with locked account fails.
  - Success resets failed attempts.
  - Expired or future user effective date range prevents logging in.
  - Deactivated or expired roles are not included in the session's roles/permissions list.
  - Session revocation invalidates subsequent auth guard calls.
- [x] 6.2 Run unit tests using `pnpm run test` to verify that there are no compiler or logic breakages.
- [x] 6.3 Run typecheck and linting commands to guarantee code quality.
