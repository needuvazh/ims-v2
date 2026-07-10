## ADDED Requirements

### Requirement: List user active sessions
Users MUST be able to view all active login sessions associated with their account, highlighting the session currently in use.

#### Scenario: Successful active sessions display
- **WHEN** the profile page is loaded
- **THEN** the active sessions query MUST retrieve all sessions where status is `Active` and expiration date is in the future, rendering browser/device metadata, IP address, and a "Current Session" indicator.

### Requirement: Revoke user session
Users MUST be able to revoke any of their active sessions (excluding the current session).

#### Scenario: Successfully revoke another session
- **WHEN** a user requests to revoke an active session with an ID that belongs to them
- **THEN** the session status MUST transition to `Revoked`, the database updated, a `UserSessionTerminated` audit log written, and the list refreshed.

#### Scenario: Attempting to revoke unauthorized session
- **WHEN** a user attempts to revoke a session belonging to another user
- **THEN** the action MUST fail with an unauthorized validation error.

### Requirement: List user login history
Users MUST be able to view their recent login attempts to monitor security.

#### Scenario: Successful login history retrieval
- **WHEN** the profile page is loaded
- **THEN** the system MUST retrieve the latest 5 login attempts (including status, timestamp, IP, and device info), and provide a "View More" control to open a scrollable modal displaying up to 50 of the latest login attempts.
