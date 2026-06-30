# Specification: IAM Branch Access

## Purpose
Define requirements for explicit branch access control, user branch switching, and enforcing branch scopes across queries, reports, and dashboards.

## Requirements

### Requirement: Explicit User Branch Access
The system SHALL store branch authorization using explicit `UserBranchAccess` records with user ID, branch ID, default flag, child-branch visibility, consolidated visibility, status, and audit metadata.

#### Scenario: Branch assigned to user
- **WHEN** an authorized caller with `iam.user.assign-branch` assigns an active branch to a user
- **THEN** the user SHALL gain access to that branch, the assignment SHALL be visible in the user profile, and `BranchAssigned` audit SHALL be recorded

#### Scenario: Default branch must be assigned
- **WHEN** a default branch is selected for a user
- **THEN** the system SHALL require that branch to exist in the user's active branch assignments

### Requirement: Active Branch Switching
The system SHALL allow users to switch active branch only among assigned active branches.

#### Scenario: Authorized branch switch
- **WHEN** a user switches to an assigned active branch
- **THEN** the session active branch context SHALL be updated, subsequent data access SHALL be scoped to that branch, and branch switch audit SHALL be recorded

#### Scenario: Unauthorized branch switch rejected
- **WHEN** a user attempts to switch to an unassigned, inactive, or archived branch
- **THEN** the system SHALL reject the request with `IAM-AUTHZ-002`

### Requirement: Branch Scoped Access Enforcement
The system SHALL enforce branch scope on IAM operational queries, reports, dashboards, and mutations that target branch-owned data.

#### Scenario: Report respects branch scope
- **WHEN** a user with `report.iam.user` opens the User Directory Report while assigned only to Muscat
- **THEN** the report SHALL include only users assigned to Muscat and SHALL exclude users from other branches
