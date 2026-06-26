## 1. Domain Model and Zod Updates

- [x] 1.1 Add `taxNumber` to `Institute` type and `createInstituteCommandSchema` in `packages/organization/src/domain/organization.ts`.
- [x] 1.2 Add `effectiveStartDate`, `effectiveEndDate` (nullable Date), and `branchManagerId` (nullable string) to `Branch` type, `createBranchCommandSchema`, and `updateBranchCommandSchema`. Enforce DateRange rules in schema validation.
- [x] 1.3 Add `effectiveStartDate`, `effectiveEndDate` (nullable Date), and `departmentHeadId` (nullable string) to `Department` type. Create `updateDepartmentCommandSchema` and update `createDepartmentCommandSchema`. Enforce DateRange rules.
- [x] 1.4 Define `Classroom` type, `createClassroomCommandSchema`, and `updateClassroomCommandSchema` with positive capacity constraints and DateRange rules.
- [x] 1.5 Export all new types and schemas from packages entrypoint `packages/organization/src/index.ts`.

## 2. Repository & Service Layer

- [x] 2.1 Update `OrganizationRepository` interface in `packages/organization/src/application/organization-service.ts` with classroom CRUD, department update, and hierarchy tree methods.
- [x] 2.2 Implement new interface requirements in `InMemoryOrganizationRepository` for testing.
- [x] 2.3 Update `OrganizationService` to check uniqueness rules:
  - Branch Code must be unique per Institute.
  - Department Code must be unique per Branch.
  - Classroom Name must be unique per Branch.
- [x] 2.4 Update `OrganizationService` to emit detailed audit logs for all CRUD and status/assignment operations.
- [x] 2.5 Implement date-range and active-status validation helpers in `OrganizationService` to determine structure eligibility.
- [x] 2.6 Reject all deletion requests at the service layer, enforcing that structural nodes can only be retired via status transitions.
- [x] 2.7 Enforce that child departments and classrooms cannot be activated if parent branch is inactive or expired, throwing `inactive_branch_cannot_be_used`.

## 3. Database Layer

- [x] 3.1 Implement new queries (Classroom CRUD, Department update, Hierarchy query) in `PrismaOrganizationRepository` inside `packages/database/src/repositories/prisma-organization-repository.ts`.
- [x] 3.2 Update database result mapping row transformations (`toBranch`, `toDepartment`) to correctly propagate date-ranges and manager/head references.
- [x] 3.3 Ensure queries filter deleted records (where `isDeleted` is true) and active validation checks status and date ranges.
- [x] 3.4 Implement cascading status updates inside a transaction for Branch deactivation/archiving, updating all child departments and classrooms to match.
- [x] 3.5 Fix seed database clean-up execution order (deleting `classroom`, `department`, and `passwordResetToken` before `branch` and `user`) to prevent foreign key constraint violations.
- [x] 3.6 Seed mock classrooms and departments under Riyadh and Muscat branches for visual preview.

## 4. Next.js Server Actions & Security

- [x] 4.1 Update Server Actions in `apps/admin-portal/app/(protected)/organization/actions.ts` to expose CRUD methods for classrooms and departments.
- [x] 4.2 Restrict edit/update mutation paths using RBAC permission guards and branch scopes via `assertPermission` and `assertBranchScope`.
- [x] 4.3 Update `assertBranchScope` inside `apps/admin-portal/app/lib/auth-guard.ts` to query and verify branch status is `Active` and dates are effective.
- [x] 4.4 Inject branch filtering in Server Action lists and hierarchy data loaders using the user's active session data scopes.
- [x] 4.5 Replace overly restrictive global permissions check on actions and page with granular permission assertions (`assertAnyPermission`) so branch managers can access/manage their scoped branches.

## 5. UI Integration

- [x] 5.1 Update the organization management dashboard (`apps/admin-portal/app/(protected)/organization/page.tsx`) to support a tabbed interface (Institutes, Branches, Departments, Classrooms, Hierarchy View).
- [x] 5.2 Build Dialog modal forms for creating and editing departments and classrooms, complete with managers, heads, capacity, and date selections.
- [x] 5.3 Implement the hierarchical tree view UI representing the single institute's structural units.

## 6. Verification and Testing

- [x] 6.1 Add unit tests in `organization-service.test.ts` to assert classroom capacity boundaries, date-range ordering validation, uniqueness limits, and audit logs.
- [x] 6.2 Run type-checks, lints, and Vitest suite (`pnpm typecheck`, `pnpm lint`, `pnpm test`).

## 7. SSE Review and Gap Resolutions

- [x] 7.1 Define and export `UserPresenceVerifier` interface in `@ims/organization`.
- [x] 7.2 Inject `UserPresenceVerifier` into `OrganizationService` and validate branchManagerId / departmentHeadId during create and update.
- [x] 7.3 Implement `isDateWithinRange` inclusive check for branch/department/classroom active resolution.
- [x] 7.4 Add department head assignment logging and mapping (`organization.department_head_assigned` audit event).
- [x] 7.5 Wire up `UserPresenceVerifier` implementation to `userService` in `runtime.ts`.
- [x] 7.6 Implement server-side branch scope filtering for lists and hierarchy tree in `/organization` RSC page.
- [x] 7.7 Add unit tests covering active user verifications, midnight boundary inclusive date checks, and department head assignment auditing.
