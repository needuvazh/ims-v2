## ADDED Requirements

### Requirement: Institute Registration
The system SHALL allow an authorized administrator to create a new institute record with the mandatory FRD fields.

#### Scenario: Create institute with valid data
- **WHEN** a Super Administrator submits a valid institute payload
- **THEN** the system SHALL create the institute in `Draft` status and record an audit entry

#### Scenario: Create institute fails on invalid data
- **WHEN** the payload is missing a mandatory field or violates uniqueness/format validation
- **THEN** the system SHALL reject the request with a validation or domain error

### Requirement: Institute Profile Management
The system SHALL allow authorized users to update institute profile and contact details without bypassing auditability.

#### Scenario: Update institute profile
- **WHEN** an authorized user updates the institute profile with valid data
- **THEN** the system SHALL persist the changes and record the previous and new values in audit history

### Requirement: Institute Lifecycle Management
The system SHALL support institute lifecycle transitions through status changes instead of deletion.

#### Scenario: Activate institute
- **WHEN** the institute has all mandatory data completed and an authorized user activates it
- **THEN** the system SHALL change the status to `Active` and record an activation audit entry

#### Scenario: Suspend institute
- **WHEN** an authorized user suspends the institute
- **THEN** the system SHALL change the status to `Suspended` and prevent new operational use until reactivated

#### Scenario: Archive institute
- **WHEN** an authorized user archives the institute and no blocking business rule applies
- **THEN** the system SHALL change the status to `Archived` and prevent physical deletion

### Requirement: Access Control and Visibility
The system SHALL enforce server-side permissions for institute actions and provide read-only visibility to branch-level users where permitted.

#### Scenario: Branch manager reads institute data
- **WHEN** a Branch Manager opens institute pages allowed for read access
- **THEN** the system SHALL allow read-only access and deny write actions
