## 1. Domain & Validation Alignments

- [x] 1.1 Verify and align domain models, Zod validation schemas, and TypeScript interfaces for `Institute`, `Branch`, `BranchContact`, `BranchAddress`, `BranchSettings`, `BranchPolicy`, `Department`, and `Classroom` in `packages/organization/src/domain/organization.ts`. Include the dedicated `BranchStatus` enum.
- [x] 1.2 Implement manager validation: verify that assigned branch managers and department heads exist as active users in IAM and are explicitly assigned/scoped to the target branch.
- [x] 1.3 Implement validation rules for classroom capacity (>0), effective date ranges (start <= end), and classroom name uniqueness strictly scoped by `branchId`.
- [x] 1.4 Implement validation check when decreasing classroom capacity: verify if the new capacity falls below the active enrollment size of batches scheduled in that classroom, and trigger a warning/validation error.
- [x] 1.5 Add loop checking to parent-child branch hierarchy updates to prevent circular references.
- [x] 1.6 Decouple the `Course` model from local branch-scoped `Department` records, linking courses to a global category catalog to allow sharing across branches.

## 2. Application Logic & Cascades

- [x] 2.1 Implement helper query APIs `isBranchActive`, `isClassroomActive`, and `isDepartmentActive` within `OrganizationService`. The classroom and department active states must dynamically verify that the parent branch is active.
- [x] 2.2 Implement status deactivation validation in the service layer: before suspending, closing, or archiving a branch, verify active dependencies (e.g. block branch closure if there are ongoing active batches or scheduled sessions at that branch).
- [x] 2.3 Ensure branch manager and department head assignment validation matches the `UserPresenceVerifier` contract.
- [x] 2.4 Verify that child entities do not have status fields written to recursively when a branch is suspended; instead, enforce dynamic runtime status evaluation.

## 3. Database & Audit Logs

- [x] 3.1 Verify postgres schema models in `schema.prisma`:
  - `Institute` with legal localization (legal name English/Arabic, trade name, short name), localization defaults (currency, timezone, language), and effective date range fields.
  - `Branch` using the dedicated `BranchStatus` enum.
  - Separate relations for `BranchContact` (type, phone, email, isPrimary), `BranchAddress` (street, city, governorate, postal code, lat/long, Map URL), `BranchSettings` (operational default configurations), and `BranchPolicy` (admission, refund, late fee).
  - `Department` and `Classroom` using the global `RecordStatus` enum.
- [x] 3.2 Ensure all organizational tables include a `deletedAt (DateTime?)` column and implement soft-delete filtering in all repository query methods.
- [x] 3.3 Implement repository query methods for creating, retrieving, updating, and listing for all organizational entities.
- [x] 3.4 Ensure the `AuditLogRepository` logs structured records (performedBy, old value, new value, reason) for all updates, status transitions, and assignments.

## 4. UI Pages, Route Handlers & Server Actions

- [x] 4.1 Verify Next.js page routing structure under `/organization` for `institutes`, `branches`, `departments`, and `classrooms`.
- [x] 4.2 Wire form components (`BranchForm`, `DepartmentForm`, `ClassroomForm`, `InstituteForm`) to Server Actions for Admin Portal UI.
- [x] 4.3 Implement granular permission guards (`branch.create`, `branch.update`, `department.create`, `classroom.create`, etc.) and branch data isolation on all actions and queries.
- [x] 4.4 Build Next.js REST Route Handlers (`/api/organization/departments`, `/api/organization/classrooms`, etc.) to support external integrations and public lookups.
- [x] 4.5 Build the visual hierarchy tree viewer component rendering all organization relations in a unified dashboard.

## 5. Verification & Testing

- [x] 5.1 Run all tests in `packages/organization` to verify domain validations, active check boundaries, and dynamic status evaluations.
- [x] 5.2 Add target tests for edge cases such as circular hierarchy detection, timezone midnight boundaries, capacity reduction warning checks, and branch-scope manager assignment validation.
- [x] 5.3 Verify that the entire workspace builds and runs successfully via `turbo test` and `turbo build`.
