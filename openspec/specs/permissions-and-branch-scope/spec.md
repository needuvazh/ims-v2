# permissions-and-branch-scope Specification

## Purpose

TBD - created by syncing change module-05-student-management. Update Purpose after archive.

## Requirements

## ADDED Requirements

### Requirement: Attendance branch isolation

The system SHALL apply branch-scoped authorization to attendance sessions, attendance records, attendance corrections, attendance reports, and attendance exports.

#### Scenario: Attendance query is branch scoped

- **WHEN** a branch-scoped user requests attendance data
- **THEN** the system SHALL return only records within the user's allowed branch list

#### Scenario: Consolidated attendance reporting requires explicit permission

- **WHEN** a user requests a cross-branch attendance report
- **THEN** the system SHALL deny access unless the user has the explicit consolidated reporting permission

### Requirement: REQ-SM-SCOPE-001 — Dynamic Branch Isolation Scope

Access to student profiles is verified dynamically. A user SHALL be granted visibility to a student profile if they have access to at least one branch with which the student has a Home Branch, Admission, Enrollment, or Lead relationship.

#### Scenario: Block viewing out-of-scope student profile

- **WHEN** counselor_mct attempts to view a Sohar branch student who has no active relationship in MCT
- **THEN** the request throws a branch access error

#### Scenario: Authorize profile view once relationship is established

- **WHEN** counselor_mct claims a student profile by creating a new Admission record in MCT
- **THEN** MCT counselor is immediately granted read/write access to the profile

---

### Requirement: REQ-SM-SCOPE-002 — Consistent Permission set

RBAC authorizations MUST follow standard `student.*` names. Merge permissions MUST be assigned only to elevated roles.

#### Scenario: Prevent standard officer from merging profiles

- **WHEN** a standard Student Administration Officer attempts to execute a merge
- **THEN** the action fails due to permission validation
- **WHEN** a Branch Manager attempts to execute a merge
- **THEN** the merge executes successfully

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
