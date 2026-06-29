## Why

The IAM backend is in place, but the admin portal still exposes only a narrow slice of the security surface and leaves key operational workflows inaccessible. Admins need first-class screens for user lifecycle, roles, permissions, sessions, security policy, audit review, and IAM reporting so the completed backend can actually be operated.

## What Changes

- Add a dedicated IAM admin portal experience under the protected admin app.
- Expand the current identity area into a complete operational console with screens for users, roles, permissions, sessions, security policy, audit logs, dashboards, and IAM reports.
- Replace legacy UI assumptions such as `identity.*` labeling and older status/scoping concepts with the approved `iam.*` contract, branch-aware behavior, and the current user status model.
- Add permission-aware navigation, branch context display, searchable tables, detail views, and mutation forms for IAM operations.
- Add export and dashboard entry points for IAM reporting and compliance work.
- Add UI coverage for loading, empty, validation, and authorization states across IAM screens.

## Capabilities

### New Capabilities
- `iam-admin-portal-ui`: Admin portal screens and navigation for IAM user, role, permission, session, security policy, audit, dashboard, and report workflows. Add public-facing screens for account activation and mandatory password change.

### Modified Capabilities

- 

## Impact

- Owning bounded context: Identity & Access Management.
- Affected downstream/supporting contexts: Organization for branch labels and branch-scoped filtering, Audit for review workflows, Reporting for dashboard/report views, and shared portal UI for layout and forms.
- Affected apps/packages: `apps/admin-portal`, `packages/shared-ui`, `packages/shared-auth`, and any IAM-facing UI tests.
- Affected routes: `/iam`, `/iam/users`, `/iam/roles`, `/iam/permissions`, and new IAM screens for sessions, security policy, audit, reports, and dashboards. Public unauthenticated routes for activation and mandatory password change.
- Authorization impact: All screens must respect server-side permission checks and branch scope; UI visibility is only a reflection of authorization, not the source of it.
- Audit impact: Sensitive IAM mutations from the UI must continue to emit the same backend audit events and should present clear success/failure feedback in the portal.
- UX impact: The admin portal gains the operational surface needed to manage IAM without falling back to raw APIs or hidden backend-only controls.
- Testing impact: Adds route, form, table, branch-scope, permission, and accessibility coverage for the IAM portal screens.
