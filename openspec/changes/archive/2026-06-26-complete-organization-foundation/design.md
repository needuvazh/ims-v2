## Context

The Organization Management module needs to transition from a skeleton model into a full-featured organizational foundation. In particular, downstream scheduling features depend on Classrooms (with capacity constraints), and enrollment features require strict branch scoping, deactivation checks, and active-dating boundaries.

This design completes the aggregate modeling, persistence repository methods, business validation rules, and admin-facing portals for the entire organization context.

## Goals / Non-Goals

**Goals:**
- Add complete Classroom aggregate support (types, Zod validations, application service, prisma repository, actions, tests).
- Add effective dating bounds (`effectiveStartDate`, `effectiveEndDate`) to Branch, Department, and Classroom aggregates.
- Prevent operational scheduling or enrollment if target organization units are inactive or outside their effective date ranges.
- Restrict branch manager and department head scope modifications to authorized roles, auditing these actions.
- Provide a clean hierarchy query returning the entire active organization structure.
- Prevent hard-deletion of organization nodes; use soft delete indicators (`isDeleted`, `deletedAt`) to protect reference integrity.
- Guard Next.js Server Actions with permission checking (`organization.branch.manage` / `organization.department.manage` / `organization.manage`) and branch scopes.

**Non-Goals:**
- Introducing multi-institute SaaS structures or cross-institute data visibility.
- Implementing automatic timetable conflict detection (handled in Scheduling Management).
- Modifying IAM user profiles (references only are maintained).

## Decisions

### 1. Model Classrooms as an aggregate inside Organization context
*Decision*: Define the Classroom domain type and validations in `@ims/organization`.
*Rationale*: Classroom belongs directly to a Branch. To execute scheduling room allocations, the system must reference active classrooms, verifying their capacity constraints and status.

### 2. Enforce Date Range invariants at Zod parsing time
*Decision*: Add a Zod refinement on create/update schemas to guarantee `effectiveEndDate` >= `effectiveStartDate`.
*Rationale*: Moving validation as close to the input boundary as possible prevents database transactions with corrupted date envelopes.

### 3. Check code uniqueness during creation
*Decision*:
- Verify `branchCode` is unique per Institute.
- Verify `departmentCode` is unique per Branch.
- Verify `classroomName` is unique per Branch.
*Rationale*: Prevents human error in naming and code duplication within operational units.

### 4. Support soft-delete across all organization entities
*Decision*: Update repository mutation routes to perform soft deletes (`isDeleted = true`, `deletedAt = now()`) instead of raw `prisma.xxx.delete()` commands.
*Rationale*: Fulfills FRD audit requirements and prevents reference integrity crashes when historical scheduling or finance records are linked to deleted branches/departments/classrooms.

### 5. Build an hierarchical tree read-model
*Decision*: Provide a query method `getOrganizationHierarchy` in the service.
*Rationale*: Consolidates database queries to draw a single interactive tree view in the admin portal, reflecting:
```text
Institute
 └── Branches
      ├── Departments
      └── Classrooms
```

### 6. Validate effective dates during operational actions
*Decision*: Introduce service verification helpers `isBranchActive`, `isClassroomActive` that verify status is `'Active'` and the current date falls within `[effectiveStartDate, effectiveEndDate]`.
*Rationale*: Fulfills Section 6.4 rules ("Inactive classrooms must not be used in new schedule creation", "Inactive branches must not accept new admissions").

### 7. Enforce server-side RBAC and branch scope assertions
*Decision*: Wrap Server Actions inside `actions.ts` with `assertPermission` and `assertBranchScope`.
*Rationale*: Branch managers should only be able to create, edit, or de-activate departments or classrooms belonging to branches they are scoped to manage.

### 8. Cascading Status Transitions (Deactivation & Archiving)
*Decision*: When a Branch status is updated to `Inactive` or `Archived`, cascade this status transition to all of its child Departments and Classrooms inside the same database transaction.
*Rationale*: Ensures consistent state across the hierarchy and prevents active classrooms or departments from existing under an inactive branch without mutating or deleting database rows.

### 9. Validate Branch Active Status in Auth / Session guards
*Decision*: Update `assertBranchScope` inside `apps/admin-portal/app/lib/auth-guard.ts` to verify the branch is `Active` and within its effective dates, preventing operations under inactive branches even if the user has historic permissions.
*Rationale*: Prevents security bypasses where a manager continues executing actions under a deactivated branch.

### 10. Filter Read Lists and Hierarchy by active Branch Scopes
*Decision*: Apply active branch-scope filtering to list queries on `/organization` so branch managers or counselors only see branches, departments, and classrooms that align with their data scopes (unless they have global `'All'` scope).
*Rationale*: Prevents data exposure and complies with Section 12 branch-isolation requirements.

### 11. Eliminate Deletion Operations
*Decision*: Do not expose delete endpoints or actions. Reject any delete requests with a domain error, forcing administrators to use status transitions (`Active` -> `Inactive` / `Archived`) to retire organizational entities.
*Rationale*: Preserves historical references and audit compliance for all downstream models without risking orphan constraints.

### 12. Fine-grained Access Control on Actions & Page
*Decision*: Update the `/organization` dashboard page and server actions to assert granular permission codes (e.g. `organization.branch.manage`, `organization.department.manage`, `organization.classroom.manage`) via `assertAnyPermission`, rather than enforcing `organization.manage` globally.
*Rationale*: Enables branch managers to view the organization page and perform administrative duties within their branch scoped limits.

### 13. Audit Event Granularity
*Decision*: Implement specific audit action logging in the service layer for deactivations, activations, and manager/head assignments (e.g. `organization.branch_deactivated`, `organization.branch_manager_assigned`, `organization.department_activated`) to comply with FRD Section 9.
*Rationale*: Restores audit visibility for critical state transitions instead of logging a generic update event.

### 14. Parent Status Validation
*Decision*: Enforce validation in `updateDepartment` and `updateClassroom` that prevents changing status to `Active` if the parent branch is inactive or outside its effective dates, throwing `inactive_branch_cannot_be_used`.
*Rationale*: Prevents child nodes from becoming active under a retired branch.

### 15. Clean Seed Execution
*Decision*: Enforce that database seed cleanup operations delete child tables (`classroom`, `department`, `passwordResetToken`) before parent tables (`branch`, `user`) to prevent foreign-key violation constraint crashes.
*Rationale*: Guarantees a robust developer seeding experience.

### 16. Decoupled User Verification via Presence Interface
*Decision*: Define `UserPresenceVerifier` interface in `@ims/organization` and implement it in `apps/admin-portal/app/lib/runtime.ts` via the `UserService`.
*Rationale*: Avoids importing `@ims/identity-access` classes directly inside `@ims/organization` to maintain modular monolith boundaries, preventing circular package dependencies.

### 17. Enforce Active User Constraints for Manager/Head Assignments
*Decision*: Before creating or updating a branch or department manager/head, verify that the assigned user exists and is active using the presence verifier.
*Rationale*: Prevents orphaned references and enforces policy constraints where inactive user accounts cannot manage operational structures.

### 18. Day-Boundary Inclusive Date Comparison
*Decision*: Implement an `isDateWithinRange` check that sets hours/minutes/seconds of the checked date to midnight, making the effective date comparison fully inclusive of start and end dates.
*Rationale*: Fixes the midnight comparison bug where entities became inactive during their final valid day.

### 19. Server-side Branch Scope List Filtering on RSC Page
*Decision*: Retrieve the active session in `apps/admin-portal/app/(protected)/organization/page.tsx` and filter list models (branches, classrooms, departments) and the hierarchy tree before passing them to the dashboard component.
*Rationale*: Prevents data leakage where scoped users (such as branch managers) see organizational structures they are not authorized to view.

---

## Risks / Trade-offs

- **Status Cascading Transaction Load**: Deactivating a branch with many departments and classrooms performs multiple updates.
  - *Mitigation*: Run cascading status transitions in a single Prisma transaction with short timeouts, since organization unit sizes are small (typically < 100 per branch).
- **Date Range Comparison Precision**: Node and PostgreSQL might have tiny timezone serialization shifts.
  - *Mitigation*: Coerce date fields using `z.coerce.date()` and perform comparisons using standard day-level timestamps.

---

## Migration Plan

1. **Domain Models**: Update types and schemas in `packages/organization/src/domain/organization.ts`, adding `taxNumber` to Institute, effective dates, managers, and new Classroom types/commands.
2. **Repository Interfaces**: Update `OrganizationRepository` in `packages/organization/src/application/organization-service.ts` to include Classroom operations, Department updates, and cascading status transition methods.
3. **Prisma DB Adapters**: Implement database query resolvers in `packages/database/src/repositories/prisma-organization-repository.ts`, adding transaction blocks for cascading status updates.
4. **Service Rules & Validation**: Update `OrganizationService` to check uniqueness, date-range invariants, manager/head active checks, and block any deletion requests while logging detailed audit logs.
5. **Session Scope & Route Guards**: Integrate active-status checks into the Next.js `assertBranchScope` utility.
6. **InMemory Repository**: Update `InMemoryOrganizationRepository` for unit tests.
7. **Next.js Actions**: Implement server actions inside `apps/admin-portal/app/(protected)/organization/actions.ts` with scoping constraints on read lists and status updates.
8. **UI Portals**: Update the admin view `/organization` to support tabbed views (Institutes, Branches, Departments, Classrooms, Hierarchy) and build modal forms for creation/edit and status toggling (Activate/Deactivate/Archive).
9. **Test coverage**: Run type checks, lint checks, database migrations, and unit tests to verify all behaviors.


