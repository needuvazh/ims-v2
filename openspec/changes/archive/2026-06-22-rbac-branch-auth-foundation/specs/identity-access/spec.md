## ADDED Requirements

### Requirement: Session scopes integration
The system SHALL embed the user's data scopes collection in the encoded session cookie payload to enable database-free scope authorization checks at the boundary.

#### Scenario: Scope info is loaded on session start
- **WHEN** authentication completes successfully
- **THEN** the session payload SHALL include the user's mapped `dataScopes` definitions

### Requirement: Server-side action guards
The system SHALL enforce Server Action execution boundaries by asserting permissions and data scope rights on mutation paths, and throwing appropriate errors when verification fails.

#### Scenario: Unauthorized action fails
- **WHEN** a Server Action is invoked by a session lacking the required action permission
- **THEN** the action SHALL fail immediately and throw a `forbidden` DomainError

#### Scenario: Branch scoping check fails
- **WHEN** a Server Action targets a branch not matching the user's branch scopes list (unless user has global scope)
- **THEN** the action SHALL fail immediately and throw a `forbidden` DomainError

### Requirement: Dynamic layout branch resolution
The system SHALL resolve active branch details from session variables and dynamically output branch headers inside protected layouts.

#### Scenario: Layout reads active branch
- **WHEN** an authenticated user loads the portal layout
- **THEN** the layout SHALL render the branch name matching the session's active branch ID or default scope, falling back to global context when applicable

### Requirement: Page read-path and action guards
The system SHALL restrict read and write access to pages and operations using action permissions and scope validation.

#### Scenario: Page access fails
- **WHEN** a user visits `/identity` or `/organization` without `identity.read` or `organization.read` respectively
- **THEN** the page SHALL fail to render and throw a `forbidden` DomainError

#### Scenario: Organization action fails
- **WHEN** an action in the Organization module is invoked by a session lacking the required permissions or target branch scope
- **THEN** the action SHALL fail and throw a `forbidden` DomainError

### Requirement: Active branch switching
The system SHALL allow users with multiple branch scopes to switch their active operational branch context.

#### Scenario: User switches active branch
- **WHEN** the user selects a different branch from their authorized branch scopes
- **THEN** the system SHALL update the session's `activeBranchId` and persist it in the session cookie

### Requirement: Authentication auditing
The system SHALL log database audit events for all login results.

#### Scenario: Successful login recorded
- **WHEN** credentials validation succeeds
- **THEN** the system SHALL record a `identity.login_succeeded` event in the audit log

#### Scenario: Failed login recorded
- **WHEN** credentials validation fails
- **THEN** the system SHALL record a `identity.login_failed` event in the audit log

