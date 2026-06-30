## Why

The current Identity & Access Management (IAM) module fails to properly enforce branch-scoped restrictions. A branch-restricted manager (e.g., a Branch Manager of Branch A) is currently able to fetch all users, roles, and branches from the system in-memory. They can also view, edit, suspend, lock/unlock, or terminate sessions for any user in the directory (including those in other branches) simply by navigating to their URL/UUID or calling the corresponding service actions. 

This violates the core security invariant that branch-level operators should only be able to view, manage, and audit data for users and operations within their active branch scope.

Additionally, the system must not hardcode user roles (e.g., `Admin`, `Owner`, `Management`, `CEO`) for scoping checks. Global access must be resolved dynamically by evaluating the user's data scopes (e.g., `scopeType === 'All'`). Furthermore, branch-scoped access must respect branch hierarchies: if an operator has access to branch A, and branch A is a parent of branches B, C, and D, and the user-branch access has `includeChildBranches` set to true, they can access branches A, B, C, and D. However, if they are only assigned to a child branch D, they must not be able to access parent/ancestor branches A, B, or C.

## What Changes

1. **Service Layer Scoping Enforcements**:
   - Harden `UserService` to check target user branch scopes in all mutating actions (`updateUser`, `activateUser`, `suspendUser`, `archiveUser`, `unlockUser`, `adminResetPassword`, `resendActivationEmail`).
   - Restrict user creation and updates to ensure operators can only assign or modify branch memberships for branches they themselves have active access to.
   - Refactor `UserService.listUsers` to accept a context parameter and filter returned lists by the operator's active branch.
   - Harden `SessionService` and `LoginHistoryQueryService` to ensure queries/mutations (like list sessions, terminate sessions, view login history) verify target users fall within the operator's branch scope.
2. **Dynamic Scope Resolution (Role-Free) & Hierarchical Resolution**:
   - Query the session's data scopes collection (`scopeType === 'All'`) to check for global access, removing any hardcoded role checks in the service boundaries.
   - Introduce `parentBranchId` in the `Branch` model and configure self-referential parent-child relationships.
   - Resolve child branches recursively if `includeChildBranches` is active for a branch assignment, enabling cascading access from parent branches to child branches.
3. **Frontend Security Refactoring**:
   - Refactor `loadIdentityData` in `shared-data.ts` to pass the operator's session/context to the services, preventing global fetching of users/roles/branches.
   - Replace in-memory lookups (`data.users.find(...)`) on the User View and Edit details pages with direct context-aware backend calls (`userService.getUser` with context).
4. **Reports UI Improvements**:
   - Filter the branch select dropdown options in report views so operators only see their authorized branches.

## Capabilities

### Modified Capabilities
- `identity-access`: Enforce strict branch scoping boundaries on user directory read/write actions, session tracking, role assignment, and reporting.

## Impact

- **Affected Bounded Contexts**: Identity & Access Management (IAM), Organization Management.
- **APIs / Server Actions**: Server actions in `admin-portal` (`createUserAction`, `updateUserAction`, `userLifecycleAction`, `terminateSessionAction`, `terminateAllSessionsAction`).
- **Database/Prisma**: Add `parentBranchId` to the `Branch` model in `schema.prisma`. Run DB migrations to reflect the change.
- **Audit Logs**: All scoped actions will continue to log with the correct `branchId` recorded in the audit trail.
