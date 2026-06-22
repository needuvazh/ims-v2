## Why

The current database schema and seeding script for Module 1 (Identity & Access Management) are minimal and do not meet several critical specifications outlined in the Module 1 FRD and core architecture principles:
1. **Lack of Session Tracking & Revocation:** Stateless cookie sessions cannot be monitored or revoked, preventing the implementation of "Active Sessions" views and remote logout rules.
2. **Missing Security Lockouts:** There is no database support for brute-force lockouts (failed login tracking and lockout durations).
3. **No Effective Dating:** Users and Roles lack effective start and end dates which are explicitly required in the FRD UI specifications and database standards.
4. **Missing Permission Types:** Permissions cannot be classified as Action, Menu, Module, Report, or Data Scope, making it impossible to render the Permission Matrix screen cleanly.
5. **Performance Gaps:** Redundant indexes degrade write performance, while missing indexes on foreign keys (`instituteId`, `actorId`, `occurredAt`, `roleId`) lead to slow joins.
6. **Incomplete Seed Data:** No roles/permissions exist for other major actors (Trainers, Accountants, Students), nor are there test accounts to validate branch-scoped access and separate portal layouts.

Implementing these database and seeding improvements will solidify the platform's security foundation and pave the way for the development of subsequent modules.

## What Changes

- **Schema Enhancements (`schema.prisma`):**
  - Add `effectiveStartDate` and `effectiveEndDate` to `User` and `Role`.
  - Add enum `PermissionType` and link it to the `Permission` model.
  - Create the `UserSession` model for active session persistence and revocation.
  - Create the `LoginHistory` model for login audit logging and brute-force detection.
  - Add `failedLoginAttempts` and `lockoutUntil` to the `User` model.
  - Remove the redundant index on `User.email` and add optimized indexes on `AuditLog.actorId`, `AuditLog.occurredAt`, `UserRole.roleId`, `RolePermission.permissionId`, and `Branch.instituteId`.
- **Domain & Service Updates:**
  - Update command validation schemas (`createUserCommandSchema`, `updateUserCommandSchema`) to handle effective dates and lockout fields.
  - Update repositories (`PrismaUserRepository`) to map the new database fields.
- **Seeding Enhancements (`seed.ts`):**
  - Seed system permissions across different types (Menu, Action, Report) matching the FRD sections.
  - Seed roles and users for all core classifications (Owner, Administrator, Branch Manager, Counselor, Trainer, Accountant, Student) along with realistic branch data scopes and effective dates.

## Capabilities

### Modified Capabilities
- `database`: Database models, migrations, and seeds expanded to fully cover IAM audit, locking, and session persistence requirements.
- `identity-access`: Domain definitions, repositories, and services modified to support the new database attributes.

## Impact

- **Security & Compliance:** Database-backed sessions allow absolute revocation of access. Lockout fields enable automatic account lockouts after excessive failed attempts.
- **Performance:** Adding index structures on foreign keys and audit logs ensures that dashboards and audit views load with sub-millisecond response times even under high data volume.
- **Testing & Local Dev:** Local developers can test the application using realistic multi-persona accounts (e.g. log in as an Accountant, Trainer, or Student) to verify permissions and layout restrictions.

## Source Anchors

- FRD requirements: `docs/architecture/frd/Module 1: Identity & Access Management.md` (FR-IAM-003, FR-IAM-004, FR-IAM-005, FR-IAM-013, FR-IAM-014, FR-IAM-015, and Section 4, 5, 6, 7, 8, 10, 11).
- Technology Stack Guidelines: `docs/ims-technology-stack-recommendation.md` (Section 10).
- Domain Context Map: `docs/architecture/ddd/Domain-Driven Design Context Map.pdf`.
