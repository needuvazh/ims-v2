## MODIFIED Requirements

### Requirement: Self-Service Password Reset Request
The system SHALL support requesting a password reset link by providing an email address, safeguarding against user enumeration.

#### Scenario: Active user requests password reset
- **WHEN** a password reset is requested for an active email address
- **THEN** the system SHALL generate a secure random token, persist its SHA-256 hash with a **15-minute** expiration timestamp, append a `PasswordResetRequested` audit event, publish an outbox event, create a notification record, and return a generic success message

#### Scenario: Inactive or non-existent user requests password reset
- **WHEN** a password reset is requested for an email address that does not exist or belongs to a non-authenticatable account
- **THEN** the system SHALL return a generic success message and SHALL NOT generate or persist any reset token

### Requirement: Password Reset Completion
The system SHALL support completing a password reset using a valid, unexpired token, enforcing password complexity and password history rules, and terminating active logins.

#### Scenario: Completion with valid token and compliant password
- **WHEN** a password reset is submitted with a valid, unexpired, and unused token and a new password that meets complexity and history requirements
- **THEN** the system SHALL update the user's password hash, append password history, reset failed login attempts to 0, update user status to `Active` when clearing lockout, mark the token as used, revoke all active sessions for the user, and record a `PasswordResetCompleted` audit event

#### Scenario: Completion fails due to invalid or expired token
- **WHEN** a password reset is submitted with an expired, already used, or non-existent token
- **THEN** the system SHALL reject the change with an IAM authentication error and SHALL NOT update password state

#### Scenario: Completion fails due to weak or reused password
- **WHEN** a password reset is submitted with a valid token but the new password violates policy or appears in the last 10 password history entries
- **THEN** the system SHALL reject the change with `IAM-VAL-005` for weak format or `IAM-VAL-009` for reuse

### Requirement: Database-backed User Sessions
The system SHALL persist and query user sessions to track, validate, rotate, and revoke active logins.

#### Scenario: Session is stored on successful login
- **WHEN** authentication completes successfully
- **THEN** a `UserSession` record SHALL be created containing user ID, access token ID, hashed refresh token, expiration time, browser/device details, IP address, last activity time, and `Active` status

#### Scenario: Session is revoked on logout
- **WHEN** a user logs out
- **THEN** the system SHALL revoke the session, invalidate the hashed refresh token, record logout audit, and reject subsequent protected actions using that session

#### Scenario: Refresh token rotation detects reuse
- **WHEN** a previously rotated refresh token is presented again
- **THEN** the system SHALL reject the refresh, revoke affected sessions, and record a security audit event

### Requirement: Account Lockout Invariant
The system SHALL track failed login attempts and lock users when configured threshold limits are exceeded.

#### Scenario: User is locked after successive failed login attempts
- **WHEN** login attempts fail consecutively and reach the configured threshold of 5 by default
- **THEN** the system SHALL update the user status to `Locked`, set `lockedUntil`, create an account locked notification, and record an `AccountLocked` audit event

### Requirement: Dynamic Permission Classification
The system SHALL classify permissions to enable modular access configurations.

#### Scenario: Permissions support classifications
- **WHEN** permissions are defined or queried
- **THEN** they SHALL contain a `permissionType` matching one of `Module`, `Menu`, `Action`, or `Report`

> **Note:** `DataScope` is removed from `permissionType`. Branch-scoped data access is governed exclusively by `UserBranchAccess` and the `BranchScopeResolver`, not by a permission category. This prevents dual authorization paths.

### Requirement: Global Email Uniqueness
The system SHALL enforce global email uniqueness for user accounts, including archived and soft-deleted accounts.

#### Scenario: Email uniqueness is always enforced
- **WHEN** a user exists with an email address, regardless of active, archived, or soft-deleted state
- **THEN** another user profile SHALL NOT be registerable with that same email address

## ADDED Requirements

### Requirement: IAM User Lifecycle Model
The system SHALL model users with a linked `Person`, unique `username`, unique `email`, unique mandatory `mobile`, `defaultBranchId`, `preferredLanguage`, audit metadata, optimistic version, and statuses `PendingActivation`, `Active`, `Locked`, `Suspended`, and `Archived`.

#### Scenario: User is created successfully
- **WHEN** an authorized caller with `iam.user.create` creates a user with valid person details, at least one active role, at least one active branch, and a default branch among assignments
- **THEN** the system SHALL create the `Person`, create the `User` in `PendingActivation`, assign roles, assign branch access, create activation notification intent, and record `UserCreated` audit

#### Scenario: User creation validation fails
- **WHEN** user creation is attempted with duplicate email, duplicate mobile, no role, or no branch
- **THEN** the system SHALL reject the command with `IAM-VAL-001`, `IAM-VAL-002`, `IAM-VAL-008`, or `IAM-VAL-007` respectively

### Requirement: IAM API Boundary Validation
The system SHALL validate IAM request payloads with shared Zod schemas so route handlers and application services use the same password, pagination, branch, and policy rules.

#### Scenario: Shared validation rejects weak passwords
- **WHEN** a login, password reset, or password change request submits a password that fails the shared IAM password policy
- **THEN** the system SHALL reject the request with `IAM-VAL-005`

#### Scenario: Shared validation rejects password reuse
- **WHEN** a password reset or password change request reuses one of the last 10 password hashes
- **THEN** the system SHALL reject the request with `IAM-VAL-009`

#### Scenario: Shared validation preserves stable field messages
- **WHEN** an IAM API request fails boundary validation
- **THEN** the system SHALL return stable IAM validation messages rather than default framework messages

### Requirement: IAM Role and Permission Administration
The system SHALL manage roles and permissions dynamically without hardcoded role checks.

#### Scenario: Permission assigned to role
- **WHEN** an authorized caller with `iam.role.permission.assign` assigns an active permission to an active role
- **THEN** the role SHALL contain the permission, affected effective permissions SHALL be recalculated or invalidated, and `PermissionAssignedToRole` audit SHALL be recorded

#### Scenario: System role archive is blocked
- **WHEN** a caller attempts to archive a role marked as system role
- **THEN** the system SHALL reject the operation with `IAM-VAL-010`

### Requirement: RS256 Token Security
The system SHALL issue RS256 JWT access tokens and server-side hashed refresh tokens according to the configured security policy.

#### Scenario: Login succeeds
- **WHEN** an active user with valid credentials, at least one active role, and at least one active branch logs in
- **THEN** the system SHALL issue a 15-minute RS256 access token, issue a hashed 7-day refresh token, create an active session, record login history, and record login success audit

#### Scenario: Login rejected when concurrent session limit reached
- **WHEN** a user attempts to log in and their active session count equals or exceeds `SecurityPolicy.maxConcurrentSessions` (default 3)
- **THEN** the system SHALL either reject the login with `IAM-AUTH-008` or terminate the oldest active session before creating the new session, and SHALL record a `SessionExpiredByPolicy` audit event for any terminated session

#### Scenario: Login rejected for expired password
- **WHEN** an active user whose password has not been changed for more than `SecurityPolicy.passwordExpiryDays` (default 90) attempts to log in
- **THEN** the system SHALL return `IAM-AUTH-004` indicating password expiry and SHALL NOT create a session until the password is changed

#### Scenario: Login rejected for invalid or suspended account
- **WHEN** credentials are invalid or the user is suspended or archived
- **THEN** the system SHALL return the documented IAM authentication error and SHALL NOT create a session

#### Scenario: Login with Remember Me selected
- **WHEN** an active user logs in with valid credentials and selects `rememberMe`
- **THEN** the system SHALL issue the same login response shape, but the refresh token/session lifetime SHALL follow the configured remembered-session policy without changing the `/auth/login`, `/auth/refresh`, or `/auth/logout` endpoint contract

### Requirement: Self-Service Account Activation
The system SHALL support user self-service account activation via a token link sent by email, without requiring admin intervention.

#### Scenario: User activates account via token link
- **WHEN** a user in `PendingActivation` status submits a valid, unexpired activation token to `POST /api/v1/auth/activate-account`
- **THEN** the system SHALL transition the user status to `Active`, mark the activation token as used, record an `AccountActivated` audit event, and return a success response

#### Scenario: Activation rejected for invalid or expired token
- **WHEN** an activation token is expired, already used, or does not exist
- **THEN** the system SHALL reject the activation with an IAM authentication error and SHALL NOT change user status
