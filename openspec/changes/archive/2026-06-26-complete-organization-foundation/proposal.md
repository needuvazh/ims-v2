## Why

The Organization Management module defines the institute structure and operational boundaries (Institute, Branch, Department, Classroom) used by all other domains. While basic models exist for Institute, Branch, and Department, the current implementation lacks:
1. **Classroom Lifecycle**: There is no Classroom entity representation in domain models, application services, repository interfaces, or tests, despite it being defined in the database schema.
2. **Effective Dating Logic**: Modifying organizational records must support effective start and end dates to enable historical reporting and prevent active transactions on expired records.
3. **Hierarchy and Navigation**: The system requires a unified organizational hierarchy tree (Institute -> Branches -> Departments & Classrooms) to visualize structure and guide portal navigation.
4. **Scoping and Boundary Enforcement**: Inactive branches, departments, or classrooms must not accept new operational transactions (e.g. schedules, admissions, course ownership).
5. **Soft Delete and Integrity**: Hard deletion of master organizational data must be prevented when referenced by operational records, utilizing soft deletes (`isDeleted`, `deletedAt`) instead.

Completing this foundation ensures downstream domains like Scheduling (which needs Classrooms), Admissions/Enrollment (which needs Branch validation), and Finance (which requires Branch scoping) can integrate cleanly with a stable, secure, and audit-compliant organization model.

## What Changes

- **Domain Model updates**:
  - Add `taxNumber` to the `Institute` model in `packages/organization/src/domain/organization.ts`.
  - Add `effectiveStartDate`, `effectiveEndDate` (nullable dates), and `branchManagerId`/`departmentHeadId` (references to IAM user UUIDs) to `Branch` and `Department` types.
  - Define Zod command validation schemas for `CreateBranchCommand`, `UpdateBranchCommand`, `CreateDepartmentCommand`, and a new `UpdateDepartmentCommand`.
  - Add DateRange validation logic inside the schemas to enforce that `effectiveEndDate` cannot be before `effectiveStartDate`.
  - Define `Classroom` type and command schemas (`createClassroomCommandSchema`, `updateClassroomCommandSchema`) enforcing positive capacities and valid branch associations.
  - Define a `UserPresenceVerifier` interface in `@ims/organization` to validate assigned managers/heads against active IAM users.
- **Application Service & Repositories**:
  - Update `OrganizationRepository` with methods for Classroom CRUD, Department updates, and hierarchy retrieval.
  - Implement these methods in `PrismaOrganizationRepository` and the test-scoped `InMemoryOrganizationRepository`.
  - Add business validations in `OrganizationService`:
    - Ensure unique Branch Codes per Institute.
    - Ensure unique Department Codes per Branch.
    - Ensure unique Classroom Names per Branch.
    - Validate that active entities are within their effective date range when referenced (using inclusive day-level comparison).
    - Enforce that assigned `branchManagerId` and `departmentHeadId` belong to active IAM users via the `UserPresenceVerifier`.
  - Emit compliance-mandated audit logs for all creations, updates, activations, deactivations, manager/head assignments, and department head assignments (`organization.department_head_assigned`).
- **Next.js Server Actions**:
  - Expose CRUD actions for Branches, Departments, and Classrooms in `apps/admin-portal/app/(protected)/organization/actions.ts`.
  - Protect actions using Server-side RBAC guards (`assertPermission`, `assertBranchScope`).
- **Admin UI & Page Scoping Enhancements**:
  - Update the organization page `/organization` to support detailed tabs: Branches, Departments, Classrooms, and Hierarchy Tree.
  - Ensure list views (branches, classrooms, departments) and the hierarchy tree on the RSC page are filtered according to the user's active branch scopes.
  - Build simple, cohesive form dialogs for creating and editing these entities, complete with effective date selections.

## Capabilities

### New Capabilities
- `organization.classroom`: represents classroom lifecycle management (CRUD, capacity validation, effective dating).
- `organization.hierarchy`: query-optimized view to fetch the complete structural tree of the institute.

### Modified Capabilities
- `organization`: expanded branch and department models to include manager assignments, head assignments, and effective date constraints.

## Impact

- **Downstream Readiness**: Opens scheduling, course planning, enrollment, and finance scopes for development with correct structural references.
- **Authorization & Security**: Enforces that Branch Managers can only modify records and assign sub-entities (classrooms, departments) within their active branch scope.
- **Compliance & Audit**: Maintains a strict history of organizational status shifts and assignments.

## Source Anchors

- Organization FRD: `docs/architecture/frd/Module 2: Organization Management.md`
- DDD context mapping: `docs/architecture/ddd/Domain-Driven Design Context Map.pdf` (Section 8)
- DB Schema configuration: `packages/database/prisma/schema.prisma`
