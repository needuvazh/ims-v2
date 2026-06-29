## Requirements

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

### Requirement: Self-Service Password Reset Request
The system SHALL support requesting a password reset link by providing an email address, safeguarding against user enumeration.

#### Scenario: Active user requests password reset
- **WHEN** a password reset is requested for an active email address
- **THEN** the system SHALL generate a secure random token, persist its SHA-256 hash with a 1-hour expiration timestamp, append a `PasswordResetRequested` audit event, publish an outbox event, and return a success message

#### Scenario: Inactive or non-existent user requests password reset
- **WHEN** a password reset is requested for an email address that does not exist or belongs to a `Draft` or `Inactive` account
- **THEN** the system SHALL return a generic success message and SHALL NOT generate or persist any reset token

### Requirement: Password Reset Completion
The system SHALL support completing a password reset using a valid, unexpired token, enforcing password complexity rules and terminating active logins.

#### Scenario: Completion with valid token and compliant password
- **WHEN** a password reset is submitted with a valid, unexpired, and unused token and a new password that meets complexity requirements
- **THEN** the system SHALL update the user's password hash, reset failed login attempts to 0, update user status to `Active` (clearing any lockouts), mark the token as used, revoke all active sessions for the user in the database, and record a `PasswordResetCompleted` audit event

#### Scenario: Completion fails due to invalid or expired token
- **WHEN** a password reset is submitted with an expired, already used, or non-existent token
- **THEN** the system SHALL reject the change and throw an `invalid_reset_token` DomainError

#### Scenario: Completion fails due to weak password
- **WHEN** a password reset is submitted with a valid token but the new password does not meet complexity requirements
- **THEN** the system SHALL reject the change and return field validation errors

### Requirement: Database-backed User Sessions
The system SHALL support persisting and querying user sessions to track and revoke active logins.

#### Scenario: Session is stored on successful login
- **WHEN** authentication completes successfully
- **THEN** a `UserSession` record SHALL be created in the database containing the user's ID, token hash, expiration time, and browser details (IP and user agent) with status set to `Active`

#### Scenario: Session is revoked on logout
- **WHEN** a user logs out or switches accounts
- **THEN** the system SHALL update the corresponding `UserSession` status to `Revoked` and reject subsequent API actions using that session

### Requirement: Account Lockout Invariant
The system SHALL track failed login attempts and lock users when threshold limits are exceeded.

#### Scenario: User is locked after successive failed login attempts
- **WHEN** a login attempt fails
- **THEN** the system SHALL increment `failedLoginAttempts` on the user profile
- **WHEN** `failedLoginAttempts` reaches 5
- **THEN** the system SHALL update the user status to `Locked` and set a lockout time

### Requirement: Dynamic Permission Classification
The system SHALL classify permissions to enable modular access configurations.

#### Scenario: Permissions support classifications
- **WHEN** permissions are defined or queried
- **THEN** they SHALL contain a `permissionType` matching one of `Module`, `Menu`, `Action`, `Report`, or `DataScope`

### Requirement: Global Email Uniqueness
The system SHALL enforce global email uniqueness for user accounts, including archived and soft-deleted accounts.

#### Scenario: Email uniqueness is always enforced
- **WHEN** a user exists with an email address, regardless of active, archived, or soft-deleted state
- **THEN** another user profile SHALL NOT be registerable with that same email address
