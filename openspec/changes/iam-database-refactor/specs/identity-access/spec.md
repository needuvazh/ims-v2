## ADDED Requirements

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

### Requirement: Soft-delete Email Uniqueness
The system SHALL allow reuse of email addresses belonging to soft-deleted accounts.

#### Scenario: Uniqueness is enforced only on active records
- **WHEN** a user is soft-deleted (`isDeleted = true`)
- **THEN** another user profile SHALL be registerable with that same email address without causing a unique index constraint failure
