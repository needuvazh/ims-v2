## Context

Organization Management is the owning bounded context for the operational structure of ASTI. The revised FRD specifies a clear hierarchy of Institute, Branch, Department, and Classroom. This design handles the entire scope of all four submodules, detailing their domain models, business logic (cascading status, date validations, active checks), API mappings, database schemas, and admin interface pages.

## Goals / Non-Goals

### Goals:
- Implement core domains and application logic for Institute, Branch, Department, and Classroom.
- Enforce the cascading deactivation status: deactivating a branch must automatically mark its child departments and classrooms as inactive.
- Support active-dating constraints (start/end date bounds) with inclusive date range checking.
- Validate branch managers and department heads against active users in the system.
- Log immutable audit records for all creation, configuration updates, manager assignments, and status transitions.
- Support parent-child branch hierarchy with loops/circular reference checks.
- Build responsive, dense UI screens for all entities, a tree visualization of the hierarchy, and operational dashboards.

### Non-Goals:
- Introducing building/floor entities as separate database models (modeled as text fields on Classroom).
- Room booking calendar/scheduler logic (handled by Scheduling module).
- Shared departments across branches (departments are strictly branch-specific).

## Architecture & Decisions

### 1. Data Model & DB Entities
We map the domain entities to the following Postgres tables in [schema.prisma](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/database/prisma/schema.prisma):
- `institutes`: Global root organization configuration. Stores legal profiles, tax/registration details, localization settings (timezone, default currency, default language), and active dating fields (`effectiveStartDate`, `effectiveEndDate`). It uses separate relations for address and contact to avoid table-level CTI.
- `branches`: Physical locations referencing `instituteId`, an optional `parentBranchId`, and `branchManagerId` (linking to `User`). Stores `effectiveStartDate` and `effectiveEndDate`. Scopes all downstream models.
- `branch_contacts`: Branch-specific contact directory referencing `branchId`, storing contact info (phone, email, type) and an `isPrimary` flag.
- `branch_addresses`: Branch addresses referencing `branchId`, storing structured location data (building, street, city, governorate, country, postal code, lat/long, Map URL).
- `branch_settings`: Operational settings referencing `branchId` (defaults for currency, timezone, week start day, working calendar, etc.).
- `branch_policies`: Branch policies referencing `branchId` (Admission, Refund, Late Fee, etc.).
- `departments`: Branch-scoped divisions referencing `branchId` and `departmentHeadId`. Stores `effectiveStartDate` and `effectiveEndDate`.
- `classrooms`: Room assets referencing `branchId`, storing `capacity` and `location`.

> **Note on Soft Deletes:** All organizational tables above must include a `deletedAt (DateTime?)` column to enforce the FRD requirement for logical soft deletes.
> **Note on Course Decoupling:** Course belongs to a global catalog (`Course M -> 1 CourseCategory`) and is decoupled from local branch departments to allow a single course template to be offered at multiple branches. Local training delivery maps local `Batches` to global `Courses` and local `Branches`.

### 2. Status Mapping & Cascading
- **Granular Branch Status Lifecycle:** The database uses a dedicated `BranchStatus` enum representing the branch lifecycle: `Draft`, `Configured`, `Active`, `UnderMaintenance`, `Suspended`, `Closed`, `Archived`.
- **Global Record Status Lifecycle:** Other entities (departments, classrooms, etc.) continue to use `RecordStatus`: `Draft`, `Active`, `Inactive`, `Archived`.
- **Dynamic Branch Checks:** Rather than performing cascading writes in the database (which overwrite local states, e.g. marking a classroom under maintenance as active when the branch is reactivated), active state checking is dynamic:
  $$\text{isClassroomActive} = (\text{classroom.status} \equiv \text{Active}) \land (\text{branch.status} \equiv \text{Active}) \land \text{isWithinEffectiveRange}(\text{classroom}) \land \text{isWithinEffectiveRange}(\text{branch})$$
- **Dependency Validations:** Before updating a branch status (e.g. suspending or closing a branch), the service layer validates active downstream dependencies (blocking on active batches, class schedules, or pending admissions) and raises exceptions.

### 3. Manager and Head Validations
- A user assigned as a branch manager or department head must be verified via the `UserPresenceVerifier` interface:
  1. Verify the user exists as an active user with staff/admin roles.
  2. **Branch-Scope Validation:** Verify that the user has branch-access mapped to the target branch (preventing cross-branch assignments unless explicitly permitted).
- **Phase 1 Compromise:** Since the HRMS module (`EmployeeProfile`) is deferred to Phase 3, we validate against IAM `User` records rather than Employees.

### 4. Date Range & Active Check Logic
- Active dating boundaries (`effectiveStartDate` and `effectiveEndDate`) are validated on create/update: `effectiveEndDate` >= `effectiveStartDate`.
- Helpers `isBranchActive`, `isClassroomActive`, and `isDepartmentActive` check that status is `Active` and the current system time is within the inclusive date range. Day boundaries are processed at midnight start/end to resolve timezone bugs.

### 5. Boundary Validation & API Layer
- **Validation:** Zod schemas in `packages/organization/src/domain/organization.ts` validate command payloads (e.g. positive integer capacity, unique codes, email formats, lat/long bounds).
- **REST Route Handlers:** Delivery endpoints under `/api/organization/...` (such as `/api/organization/departments`, `/api/organization/classrooms`) are created to support external integrations (static website submissions, certificate portal lookups).
- **Server Actions:** Delivery controllers in `apps/admin-portal/app/(protected)/organization/actions.ts` handle UI form submissions, assert granular permissions (e.g., `branch.create`, `branch.update`, `department.create`), verify branch scopes, and catch domain/validation errors.

## UI Page Structure

Screens are integrated under the `/organization` route:
1. **`/organization/institutes`**: Details profile screen, tax setup, localization configurations, and status toggle.
2. **`/organization/branches`**: List view with city/status filters, creation forms, manager dropdowns, address structures, and date boundaries.
3. **`/organization/departments`**: Local branch department grid, status toggle, and department head assignment.
4. **`/organization/classrooms`**: Room directory with capacities, location text, and status triggers.
5. **`/organization/hierarchy`**: Tree diagram visualizer showing parent-child links down to rooms.
6. **`/organization`**: Main dashboard showing active counts, pending approvals, and quick actions.

## Risks & Trade-offs

- **Hierarchy loop prevention:** Setting a parent branch could create a cycle (e.g., A -> B -> A). Mitigation: update methods must validate that the parent branch is not the branch itself or any of its descendants.
- **Dynamic validation checking:** Relying on dynamic active checks means every query checking if a department or classroom is active must join/check the branch table. Mitigation: Cache branch active status or optimize queries with simple relational joins.

## Verification Plan

### Automated Tests
- Run unit/service tests in [organization-service.test.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/organization/src/application/organization-service.test.ts) covering:
  - Branch date range constraints and duplicate code/name checks.
  - Classroom capacity limits (>0) and capacity check validation on update.
  - Dynamic active checks and blocked scheduling under inactive branches.
  - Manager/head active user and branch-scope verifications.
  - Time boundary midnight checks.
  - REST route handler response status and contract validation.
- Run UI component and error handling tests in [organization-form-errors.test.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/apps/admin-portal/app/(protected)/organization/organization-form-errors.test.ts).

### Manual Verification
- Deploy locally and verify the hierarchy tree rendering.
- Verify that decreasing a classroom's capacity below the enrollment size of active batches triggers a warning alert.
- Verify REST API endpoints return correct payloads.
