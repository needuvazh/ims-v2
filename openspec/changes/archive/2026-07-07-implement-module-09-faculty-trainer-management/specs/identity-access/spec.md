# identity-access Specification

## Purpose

This specification defines the identity, access management, role-based access control, session management, and branch-scoped authorization rules.

## Requirements

## ADDED Requirements

### Requirement: Module 09 trainer permission catalog support

The system SHALL support Module 09 trainer menu, action, report, and export permission codes in the dynamic RBAC catalog and SHALL include them in effective permission evaluation.

#### Scenario: Trainer permissions resolve through RBAC

- **WHEN** a role is assigned a Module 09 trainer permission code
- **THEN** the permission SHALL appear in the user's effective permission set after session hydration

#### Scenario: Menu visibility does not replace authorization

- **WHEN** the Faculty menu is hidden because a user lacks menu permission
- **THEN** server-side permission checks SHALL still be enforced for direct route access

### Requirement: Module 09 permission names are code-driven

The system SHALL evaluate Module 09 access by permission code and branch scope, not by role name or UI visibility.

#### Scenario: Role name alone does not grant trainer access

- **WHEN** a user has a trainer-related role name but no trainer permission codes
- **THEN** the system SHALL deny access to Module 09 protected routes

#### Scenario: Session retains trainer permissions

- **WHEN** a user signs in with trainer permissions assigned
- **THEN** the session SHALL preserve the effective trainer permissions for server-side checks
