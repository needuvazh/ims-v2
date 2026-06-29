## ADDED Requirements

### Requirement: IAM Reports
The system SHALL provide IAM operational, authentication, authorization, security, and audit reports required by the SDS.

#### Scenario: User directory report
- **WHEN** a caller with `report.iam.user` requests the User Directory Report
- **THEN** the system SHALL return branch-scoped user rows with employee code, full name, email, mobile, department, branch, assigned roles, status, last login, and created date where available

#### Scenario: Audit trail report
- **WHEN** a caller with `iam.audit.read` or approved audit report permission requests the Audit Trail
- **THEN** the system SHALL return immutable audit rows filtered by entity, user, action, date, module, and branch scope

### Requirement: IAM Report Exports
The system SHALL support exports for every IAM report required by Part 8.

#### Scenario: Authorized report export
- **WHEN** a caller with the report permission and export permission requests an export
- **THEN** the system SHALL create or return an export in a supported format while preserving the caller's permission and branch scope

#### Scenario: Unauthorized report export denied
- **WHEN** a caller lacks the report or export permission
- **THEN** the system SHALL reject the export with `IAM-AUTHZ-004`

### Requirement: IAM Dashboards
The system SHALL expose dashboard query data for security, administration, executive, and compliance dashboards using permission-based access.

#### Scenario: Dashboard access allowed
- **WHEN** a caller has the requested dashboard permission such as `dashboard.ceo`
- **THEN** the system SHALL return dashboard KPIs scoped to the caller's branch visibility

#### Scenario: Dashboard access denied
- **WHEN** a caller lacks the requested dashboard permission
- **THEN** the system SHALL reject access with `IAM-AUTHZ-003`
