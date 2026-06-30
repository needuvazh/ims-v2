## 1. Database & Domain Schema Setup

- [x] 1.1 Update the `Branch` model in `packages/database/prisma/schema.prisma` to include a self-referential `parentBranchId` relationship.
- [x] 1.2 Run Prisma migrations to apply the schema change to the database:
  ```bash
  npx prisma migrate dev --name add_branch_hierarchy
  ```
- [x] 1.3 Update domain model `Branch` definition in `packages/organization/src/domain/organization.ts` and associated Zod validations to support `parentBranchId`.
- [x] 1.4 Update mapper `toBranch()` in `packages/database/src/repositories/prisma-organization-repository.ts` to include `parentBranchId`.

## 2. Hierarchical Scope Resolving (Application & Persistence Layers)

- [x] 2.1 Add `resolveChildBranchIds(branchId: Uuid): Promise<Uuid[]>` to the `IUserBranchAccessRepository` interface in `packages/identity-access/src/domain/repositories.ts`.
- [x] 2.2 Implement `resolveChildBranchIds` in `packages/database/src/repositories/prisma-user-branch-access-repository.ts` using in-memory recursive traversal.
- [x] 2.3 Refactor `BranchScopeResolver` in `packages/identity-access/src/application/authorization-guard.ts` to fetch child branches recursively when `includeChildBranches` is `true`.

## 3. Application Layer Scoping Hardening (UserService)

- [x] 3.1 Add `assertTargetUserInBranchScope` private helper to `UserService` in `packages/identity-access/src/application/user-service.ts` using role-free dynamic scope evaluations (evaluating `scopeType === 'All'`).
- [x] 3.2 Update mutating methods (`updateUser`, `activateUser`, `suspendUser`, `archiveUser`, `unlockUser`, `adminResetPassword`, `resendActivationEmail`) in `UserService` to invoke `assertTargetUserInBranchScope`.
- [x] 3.3 Harden branch-assignment mapping logic inside `createUser` and `updateUser` to verify that operators only assign or revoke branch access for branches they manage.
- [x] 3.4 Refactor `UserService.listUsers` to accept a `context?: UserCommandContext` parameter and filter the returned list by `activeBranchId` and its descendants if the context is branch-scoped.
- [x] 3.5 Refactor `UserService.getUser` to accept a `context?: UserCommandContext` parameter and verify permissions/scoping by calling `getUserById` prior to returning user details.

## 4. Application Layer (Session & LoginHistory Services)

- [x] 4.1 Refactor the `SessionService` in `packages/identity-access/src/application/session-service.ts` to inject `userBranchAccessRepository`. Add branch scope validation to `listUserSessions`, `terminateSession`, and `terminateAllUserSessions`.
- [x] 4.2 Refactor the `LoginHistoryQueryService` in `packages/identity-access/src/application/login-history-query-service.ts` to check if the target user `userId` is in the operator's branch scope for `listUserLoginHistory`.

## 5. Frontend & Controller Adapters (admin-portal)

- [x] 5.1 Refactor `loadIdentityData` in `apps/admin-portal/app/(protected)/identity/shared-data.ts` to retrieve the current session and pass the appropriate `UserCommandContext` to `userService.listUsers` and `roleService.listRoles`.
- [x] 5.2 Update `loadIdentityData` to filter the returned `branches` list using the session's active/authorized branches.
- [x] 5.3 Update user view details page `apps/admin-portal/app/(protected)/identity/users/[id]/page.tsx` to retrieve user information using `userService.getUser(id, context)` instead of an in-memory lookup.
- [x] 5.4 Update user edit page `apps/admin-portal/app/(protected)/identity/users/[id]/edit/page.tsx` to retrieve user information using `userService.getUser(id, context)` instead of an in-memory lookup.
- [x] 5.5 Update reporting details page `apps/admin-portal/app/(protected)/iam/reports/[reportType]/page.tsx` to filter the branch selection options list so operators only see their authorized branches.

## 6. Verification & Testing

- [x] 6.1 Write unit and integration tests inside `packages/identity-access/src/application/user-service.test.ts` to verify branch-scoped mutations throw a `forbidden` error when attempting to access cross-branch users.
- [x] 6.2 Run typechecks and lints across `identity-access` package and `admin-portal` app to ensure types are consistent.
- [x] 6.3 Validate the admin portal builds successfully.
