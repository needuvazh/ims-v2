## Why

Module 02 – Organization Management establishes the core operational hierarchy for ASTI. Setting up the root legal identity (Institute) along with physical branches, operational departments, and classrooms creates the absolute foundation for security scope, enrollment bounds, data isolation, billing contexts, and course scheduling. Implementing these modules together ensures a cohesive domain boundary and complete operational setup.

## What Changes

- **Institute (2.1):** Profile management, legal/registration information, localization configuration (timezone, currency, language), active dating boundaries (effective start/end dates), and audit logs.
- **Branch (2.2):** Branch registration, structured local addresses (lat/long, map URL), multi-contact directories (types with primary flag), branch settings/policies, active manager assignment (verified active user with branch-scope checks), parent-child branch hierarchy (no loops), and status management using a dedicated `BranchStatus` lifecycle.
- **Department (2.3):** Branch-scoped department registration, unique code per branch, department head assignment (verified active user with branch-scope validation), active dating bounds, and status lifecycle.
- **Classroom (2.4):** Branch-scoped classroom registration, seating capacity controls (positive integer, constraint checks on update), text location descriptors, and status lifecycle.
- **REST APIs & Route Handlers:** Delivery endpoints under `/api/organization` for all submodules to support integration-heavy actions (website leads, public listings, certificate validation) alongside Next.js Server Actions for Admin Portal forms.
- **UI Screens:** Core screens under the Admin Portal (`/organization`) including lists, details, creation/edit forms, hierarchy tree visualizer, and dashboard widgets for all organization entities.

## Capabilities

### New Capabilities
- `organization`: Complete organization management including Institute profile, Branch hierarchy, Department structures, Classroom management, dynamic active state checking, REST API route handlers, and audit logging.

### Modified Capabilities
- None.

## Impact

- **Packages:** `packages/organization` domain types, validation schemas, application service, and repository implementations.
- **UI & Delivery:** `apps/admin-portal/app/(protected)/organization` pages, layout, form components, server actions, REST route handlers under `/api/organization`, client validations, and dashboard views.
- **Database:** Prisma schema and postgres tables: `institutes`, `branches`, `branch_contacts`, `branch_addresses`, `branch_settings`, `branch_policies`, `departments`, `classrooms`, and `audit_logs`.
- **Security:** Enforcement of role-based permissions (granular permissions: `branch.read`, `branch.create`, `department.create`, etc.) and branch-scoped data isolation guards.
