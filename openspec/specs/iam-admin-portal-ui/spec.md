# iam-admin-portal-ui Specification

## Purpose
TBD - created by archiving change implement-iam-ui-phase-01. Update Purpose after archive.
## Requirements
### Requirement: IAM portal shell and navigation
The system SHALL provide a protected IAM admin portal entry point with navigation to users, roles, permissions, sessions, security policy, audit, reports, and dashboards.
The portal SHALL show only sections the current user is allowed to access, but server-side authorization SHALL remain the source of truth.
The portal SHALL display the current active branch context wherever branch-scoped IAM data is shown.

#### Scenario: Authorized IAM user enters the portal
- **WHEN** a user with IAM permissions opens the protected IAM area
- **THEN** the portal SHALL show the IAM sections the user can access and SHALL hide sections they cannot access

#### Scenario: Branch context is visible
- **WHEN** the user is viewing a branch-scoped IAM screen
- **THEN** the portal SHALL display the active branch context in the page chrome or screen header

### Requirement: User management screens
The system SHALL provide IAM user management screens for listing, searching, filtering, paging, viewing, creating, editing, activating, suspending, archiving, unlocking, assigning roles, assigning branches, and resending activation for users.
The user screens SHALL respect branch scope and SHALL present the current user status model used by IAM.

#### Scenario: Search and filter users
- **WHEN** an authorized user searches or filters the user list
- **THEN** the portal SHALL return only branch-visible users and SHALL preserve pagination metadata

#### Scenario: Mutating a user
- **WHEN** an authorized user submits a user lifecycle action from the UI
- **THEN** the portal SHALL call the corresponding backend operation and SHALL show a success or failure state without bypassing authorization

### Requirement: Role and permission screens
The system SHALL provide IAM role screens for listing, searching, viewing, creating, editing, archiving, and managing role permissions.
The system SHALL provide a permission catalog screen that allows browsing permissions by module, feature, type, and status.
System roles SHALL be visibly protected from invalid archive actions.

#### Scenario: Manage role permissions
- **WHEN** an authorized user opens a role and assigns or removes permissions
- **THEN** the portal SHALL reflect the current role permission set and SHALL surface backend validation failures clearly

#### Scenario: Protect system roles
- **WHEN** a user attempts to archive a protected system role
- **THEN** the portal SHALL surface the rejection and SHALL keep the role unchanged

### Requirement: Session and security policy screens
The system SHALL provide session management screens for listing active sessions and terminating one or all sessions for a user.
The system SHALL provide security policy screens for viewing and updating the IAM security policy and for browsing login history.

#### Scenario: Terminate a session
- **WHEN** an authorized user terminates a session from the session screen
- **THEN** the portal SHALL show the session as revoked and SHALL not require a page reload to confirm the action

#### Scenario: Update security policy
- **WHEN** an authorized user updates the security policy form with valid values
- **THEN** the portal SHALL persist the new policy values and SHALL show the updated policy state

### Requirement: Audit, reports, and dashboards
The system SHALL provide audit trail screens, IAM report screens, export job status, and IAM dashboard KPI screens.
The system SHALL support branch-scoped report and audit browsing where the backend requires it.

#### Scenario: Browse audit trail
- **WHEN** a user with audit permission opens the audit trail screen
- **THEN** the portal SHALL show immutable audit rows and SHALL allow filtering by the supported IAM dimensions

#### Scenario: Export an IAM report
- **WHEN** an authorized user requests an IAM report export
- **THEN** the portal SHALL create or show the export job reference and SHALL allow the user to review completion status

### Requirement: Accessible and resilient UI states
The system SHALL provide loading, empty, validation, and authorization feedback states for IAM portal screens.
The IAM portal SHALL remain responsive on desktop and mobile widths used by the admin application.

#### Scenario: Empty state is shown
- **WHEN** a list screen has no rows to display
- **THEN** the portal SHALL show an empty state with a clear call to action or explanation

#### Scenario: Validation failure is visible
- **WHEN** a user submits invalid form data
- **THEN** the portal SHALL show field-level validation feedback and SHALL not submit the mutation

