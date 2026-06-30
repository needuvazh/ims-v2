# Specification: IAM Audit & Notifications

## Purpose
Ensure audit log immutability and define notification persistence requirements for security-sensitive operations, password resets, and account activation workflows.

## Requirements

### Requirement: Immutable IAM Audit Logs
The system SHALL record immutable audit logs for every security-sensitive IAM action.

#### Scenario: Security-sensitive action audited
- **WHEN** a user, role, permission, branch access, session, password, login, logout, or security policy action changes security state
- **THEN** an audit log SHALL be created with performedBy, performedAt, entityType, entityId, action, oldValue, newValue, IP address, user agent, branch ID, correlation ID, and reason where available

#### Scenario: Audit log update rejected
- **WHEN** any user attempts to update or delete an audit log through application APIs
- **THEN** the system SHALL reject the request and SHALL leave the audit log unchanged

### Requirement: IAM Notification Persistence
The system SHALL persist notification intent for IAM lifecycle events before delivery through a provider adapter.

#### Scenario: Activation notification queued
- **WHEN** a user is created successfully
- **THEN** the system SHALL create a notification record for account activation and MAY use the dummy provider to mark simulated delivery

#### Scenario: Password reset notification queued
- **WHEN** password reset is requested for an active user
- **THEN** the system SHALL create a notification record without logging the reset token or reset link

### Requirement: IAM Outbox Events
The system SHALL persist outbox events for IAM lifecycle side effects that require reliable downstream processing.

#### Scenario: User created event persisted
- **WHEN** a user is created successfully
- **THEN** a `UserCreated` outbox event SHALL be persisted in the same transaction as the state change where supported
