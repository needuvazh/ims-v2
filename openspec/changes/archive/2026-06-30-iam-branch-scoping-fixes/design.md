## Context

The system has a defined branch scoping security model where:
- Users with global scope (`scopeType === 'All'`) can access all branches.
- Branch managers and counselors can only see and manage records for their assigned branch(es) and child branches (if hierarchy resolution is enabled).

Currently, this is partially implemented:
- In `UserService.searchUsers`, `context.activeBranchId` is mapped to filter users.
- In `AuditQueryService` and `LoginHistoryQueryService.listSecurityLoginHistory`, branch filters are overridden.

However, major gaps exist:
- The UI helper `loadIdentityData` fetches all users via `userService.listUsers()`, all roles, and all branches globally without utilizing the session's active branch.
- Detail/Edit pages (e.g. `ViewUserPage`, `EditUserPage`) fetch user details by loading all users in-memory and finding them, which lets anyone bypass branch restrictions via URL direct access.
- Service mutating methods (`updateUser`, `activateUser`, `suspendUser`, etc.) check permission strings but do not perform branch-scoped validation on the target user or on the branchIds being assigned.
- Session termination actions do not check if the user belongs to the active branch.
- Reports load all branches in the dropdown selector.
- Scoping checks are hardcoded to check specific user types/roles (e.g., `Admin`, `Owner`) instead of checking the `dataScopes` definitions.
- The parent-child branch hierarchy is not modeled or resolved.

## Goals / Non-Goals

**Goals:**
- Enforce strict server-side branch scope authorization in all mutating user actions.
- Ensure the user directory list in the admin portal only returns users within the current user's branch scope.
- Prevent URL direct access bypasses on user details and edit pages by validating target user branch ownership on the server side.
- Prevent a branch-scoped manager from assigning users to, or revoking access from, branches they do not have access to.
- Filter reporting dropdowns to only display authorized branches.
- Remove all hardcoded role checks from scoping checks, replacing them with dynamic scope-type evaluations.
- Support parent-child branch hierarchical access: if an operator has access to branch A, and `includeChildBranches` is active, resolve allowed branches as `[A, B, C, D]` (where B, C, D are nested descendants). An operator of child branch D cannot access ancestor branches A, B, or C.

**Non-Goals:**
- Introducing multi-tenancy or database partitioning.

## Decisions

1. **Schema Alterations**:
   - Update the `Branch` model in `schema.prisma` to include a self-referencing relationship:
     ```prisma
     parentBranchId     String?      @db.Uuid
     parentBranch       Branch?      @relation("BranchHierarchy", fields: [parentBranchId], references: [id])
     childBranches      Branch[]     @relation("BranchHierarchy")
     ```
   - Run Prisma migration to apply the relationship.
   - Update domain type definitions and repository mappers (`toBranch()`) to pass `parentBranchId`.

2. **Recursive Hierarchical Scoping**:
   - Add `resolveChildBranchIds(branchId: Uuid): Promise<Uuid[]>` to `IUserBranchAccessRepository` interface.
   - Implement `resolveChildBranchIds` in `PrismaUserBranchAccessRepository`. The method will fetch active branches and recursively traverse the children from the given parent branch ID in-memory.
   - Update `BranchScopeResolver` in `packages/identity-access/src/application/authorization-guard.ts` to fetch child branch IDs when `includeChildBranches` is `true`, appending them to the allowed branch list.

3. **Centralized Scope Validation Helper**:
   - Implement `assertTargetUserInBranchScope` inside `UserService` to verify that the target user's branch membership overlaps with the operator's active branch list (resolving hierarchy recursively).
   - Verify permissions and scope checks dynamically without hardcoding specific roles/types (using `scopeType === 'All'`).

4. **Harden mutations in `UserService`**:
   - For `updateUser`, `activateUser`, `suspendUser`, `archiveUser`, `unlockUser`, `adminResetPassword`, and `resendActivationEmail`, call `assertTargetUserInBranchScope` before taking action.
   - For `createUser` and `updateUser` (branch management path): Verify that any `branchIds` or `defaultBranchId` assigned are within the operator's active branch list. If the operator tries to update branch memberships, only allow modifying memberships of branches the operator is authorized to manage, leaving other branches unchanged.

5. **Handoff Context to listUsers / getUser**:
   - Refactor `UserService.listUsers()` to take `context` and call `searchUsers` or apply filters based on `activeBranchId` and hierarchy.
   - Update `UserService.getUser()` to take `context` and call `getUserById(userId, context)` to enforce permissions and branch scoping before retrieving person and branch details.

6. **Handoff Context in UI loaders**:
   - Modify `loadIdentityData()` to load session data and pass `context` (containing `userId`, `permissions`, and `activeBranchId`) into `listUsers()`.

7. **Secure detail/edit pages**:
   - Modify `ViewUserPage` and `EditUserPage` to load the target user directly using `userService.getUser(id, context)` instead of doing an in-memory search from a global array.

8. **Limit session termination and log searches by scope**:
   - Inject `userBranchAccessRepository` into `SessionService` to verify the target user's branch access before listing or terminating user sessions.
   - Enforce branch scope checks in `LoginHistoryQueryService.listUserLoginHistory` using a user branch access lookup.

## Risks / Trade-offs

- **Performance Overhead**: Resolving branch hierarchy recursively is done in memory using a single fast database query fetching active branches IDs. This avoids N+1 queries and raw SQL recursions, ensuring high performance.
