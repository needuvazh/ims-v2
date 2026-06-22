## 1. Test Suite Stabilization

- [x] 1.1 Exclude Playwright specs (`tests/**/*.spec.ts`) and `.kanbots` folders from the Vitest scope inside `vitest.config.ts`.
- [x] 1.2 Fix role assertions in `packages/shared-auth/src/permissions.test.ts`.
- [x] 1.3 Fix display name expectations in `packages/identity-access/src/application/navigation-service.test.ts`.

## 2. Session Schema Extension

- [x] 2.1 Update `Session` schema in `packages/shared-auth/src/session.ts` to include the `dataScopes` array.
- [x] 2.2 Update `createDemoSession` test helper to initialize a mock `'All'` data scope.

## 3. Scoping Utilities

- [x] 3.1 Implement scoping check functions in `packages/shared-auth/src/scopes.ts` (`isAuthorizedForBranch`, `getAuthorizedBranchIds`, `isGlobalScope`).
- [x] 3.2 Add entry-point exports inside `packages/shared-auth/src/index.ts`.
- [x] 3.3 Add unit tests in `packages/shared-auth/src/scopes.test.ts` to verify scoping evaluations.

## 4. DB & Authentication Integration

- [x] 4.1 Update the Prisma repository (`prisma-user-repository.ts`) to query and map `dataScopes` table relations.
- [x] 4.2 Update `AuthUserRepository` type definition and modify `AuthService.signIn` inside `auth-service.ts` to load and forward scopes to the session cookie.

## 5. Server Action Guards

- [x] 5.1 Implement `assertPermission` and `assertBranchScope` action-guard helpers in `apps/admin-portal/app/lib/auth-guard.ts`.
- [x] 5.2 Refactor Identity Server Actions inside `actions.ts` to check relevant action permissions before mutation operations.

## 6. Layout Resolution

- [x] 6.1 Dynamically resolve branch details from active sessions in `apps/admin-portal/app/(protected)/layout.tsx` instead of using a hardcoded label.

## 7. Security Fortification & Read-Path Access Control

- [x] 7.1 Assert `identity.read` permission at the entry of the `IdentityPage` component.
- [x] 7.2 Assert `organization.read` (or `organization.manage`) permission at the entry of the `OrganizationPage` component.
- [x] 7.3 Integrate permission and branch scope assertions in `apps/admin-portal/app/(protected)/organization/actions.ts` actions.

## 8. Active Branch Switching & Default Scoping

- [x] 8.1 Create a Server Action `setActiveBranchAction(branchId: string)` inside `apps/admin-portal/app/lib/auth-guard.ts` or a new actions file to update `activeBranchId` in the session cookie.
- [x] 8.2 In `AuthService.signIn`, automatically assign `activeBranchId` to the branch ID if the user has exactly one `Branch` scope.

## 9. Authentication Logging & Auditing

- [x] 9.1 Inject `AuditLogRepository` into `AuthService`.
- [x] 9.2 Log successful login attempts (`identity.login_succeeded`) and failed login attempts (`identity.login_failed`) with context parameters.

## 10. Lifecycle Invariants Validations

- [x] 10.1 Update `UserService.assignRole` to check if role exists and is `Active`. Throw `precondition_failed` if not.
- [x] 10.2 Update `RoleService.assignPermission` to check if permission exists and is `Active`. Throw `precondition_failed` if not.
- [x] 10.3 Update `apps/admin-portal/app/lib/runtime.ts` user/role dependency injections.

## 11. Fine-grained Authorization and Switching Security

- [x] 11.1 Update `setActiveBranchAction` to throw an error if a non-global user switches their active branch to `'All'`.
- [x] 11.2 Refine `isAuthorizedForBranch` helper to check `requireFullAccess` (ignoring `assignedOnly` for writes) and support `Department` scope implicit match.
- [x] 11.3 Update layout active branch defaulting to gracefully fall back on the first available branch if `activeBranchId` is null and user is not global.

## 12. Granular Account Status Audit Events

- [x] 12.1 Update `UserService.updateUser` to log distinct status transition audit logs (`identity.user_activated`, `identity.user_deactivated`, `identity.user_locked`).
- [x] 12.2 Update `RoleService.updateRole` to log `identity.role_deactivated` when a role's status transitions to inactive.

