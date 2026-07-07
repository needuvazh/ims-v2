# permissions-and-branch-scope Specification

## Purpose
TBD - created by syncing change module-05-student-management. Update Purpose after archive.

## Requirements

## ADDED Requirements

### Requirement: Module 09 trainer branch isolation
The system SHALL apply server-side branch-scoped authorization to trainer lists, trainer profiles, qualifications, availability, authorizations, compensation, eligibility checks, reports, and exports.

#### Scenario: Trainer list is branch scoped
- **WHEN** a branch-scoped user requests trainer data
- **THEN** the system SHALL return only trainers within the user's allowed branch list

#### Scenario: Direct access to an out-of-scope trainer is denied
- **WHEN** a user requests a trainer outside the allowed branch scope
- **THEN** the system SHALL deny access without exposing protected trainer details

### Requirement: Module 09 compensation confidentiality
The system SHALL restrict trainer compensation visibility to callers with explicit compensation permission and matching branch scope.

#### Scenario: Compensation is hidden without permission
- **WHEN** a user reads trainer data without compensation permission
- **THEN** compensation amount and rate details SHALL be omitted

#### Scenario: Compensation export obeys scope and permission
- **WHEN** a user exports trainer data
- **THEN** the export SHALL include only rows and fields allowed by the user's branch scope and compensation permission

### Requirement: Module 09 consolidated reporting scope
The system SHALL require explicit consolidated reporting permission before any trainer report or dashboard can cross branch boundaries.

#### Scenario: Cross-branch trainer report is denied without consolidated permission
- **WHEN** a user requests a trainer report across multiple branches
- **THEN** the system SHALL reject the request unless the user has consolidated reporting permission

