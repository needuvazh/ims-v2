## 1. Schema Refactoring

- [ ] 1.1 Add `effectiveStartDate` and `effectiveEndDate` to the `User` and `Role` models in `packages/database/prisma/schema.prisma`.
- [ ] 1.2 Add `failedLoginAttempts` and `lockoutUntil` to the `User` model in `schema.prisma`.
- [ ] 1.3 Add enum `PermissionType` (Module, Menu, Action, Report, DataScope) and a `permissionType` field to the `Permission` model.
- [ ] 1.4 Add the `UserSession` and `LoginHistory` models to `schema.prisma`.
- [ ] 1.5 Optimize database indexes in `schema.prisma` (remove redundant `User.email` index; add indexes on `UserRole.roleId`, `RolePermission.permissionId`, `Branch.instituteId`, `AuditLog.actorId`, and `AuditLog.occurredAt`).

## 2. Database Migration & PostgreSQL Constraints

- [ ] 2.1 Run `prisma migrate dev --create-only` to draft a migration.
- [ ] 2.2 Edit the migration file to replace the default `User.email` unique constraint with a PostgreSQL partial unique index `WHERE is_deleted = false`.
- [ ] 2.3 Apply the migration using `prisma migrate dev` (or appropriate pnpm script) to update the database.

## 3. Domain Model and Zod Updates

- [ ] 3.1 Update Zod schemas and type definitions in `packages/identity-access/src/domain/user.ts` (e.g. `createUserCommandSchema`, `updateUserCommandSchema`) to support effective dates and status fields.
- [ ] 3.2 Update Zod schemas and type definitions in `packages/identity-access/src/domain/role.ts` to support effective dates.

## 4. Repository & Service Integration

- [ ] 4.1 Update Prisma-based repositories mapping code (e.g. `packages/database/src/repositories/prisma-user-repository.ts` or similar files) to save and query effective dates and lockout fields.
- [ ] 4.2 Validate that user creation and role mapping logic handles the new fields properly.

## 5. Seed Script Enhancements

- [ ] 5.1 Expand permissions inside `packages/database/prisma/seed.ts` with all core FRD module permissions and set their `permissionType`.
- [ ] 5.2 Add roles for all FRD User Classifications (Owner, Trainer, Student, Accountant, Management, Academic Coordinator) in `seed.ts`.
- [ ] 5.3 Add mock users with appropriate scopes for each role (e.g., Accountant with Riyadh Branch scope, Trainer with Muscat Campus scope and assignedOnly scope).
- [ ] 5.4 Seed effective start dates and empty effective end dates for all users and roles.
- [ ] 5.5 Run `pnpm run db:reset` or seed command to verify the seed runs successfully without foreign key violations.

## 6. Verification and Testing

- [ ] 6.1 Run unit tests using `pnpm run test` to verify that there are no compiler or logic breakages.
- [ ] 6.2 Run typecheck and linting commands to guarantee code quality.
