## ADDED Requirements

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
