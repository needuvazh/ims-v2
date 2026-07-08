## ADDED Requirements

### Requirement: Branch-Scoped Student Directory

The system SHALL provide a student directory screen that lists branch-scoped student profiles with admission and enrollment summaries.

#### Scenario: List student profiles for the active branch

- **WHEN** an authorized user opens the student directory
- **THEN** the system SHALL list student profiles visible to the active branch scope with student number, full name, status, and active enrollment summary.

#### Scenario: Filter the directory by search and status

- **WHEN** the user filters the directory by student number, name, status, or admission state
- **THEN** the system SHALL return matching records without exposing data outside the caller's branch scope.

---

### Requirement: Student Directory Actions

The system SHALL allow the student directory to launch admission, enrollment, and ID card actions for permitted users.

#### Scenario: Open student profile or admission from the directory

- **WHEN** a user selects a directory row action
- **THEN** the system SHALL navigate to the corresponding student profile or admission detail view.

#### Scenario: Hide unauthorized actions

- **WHEN** a user lacks permission for admission, enrollment, or ID card actions
- **THEN** the system SHALL hide the action buttons and reject any direct request with `403 Forbidden`.

---

### Requirement: Student Directory Empty and Loading States

The system SHALL provide clear loading and empty states for the directory screen so registrars can distinguish between no data and slow data.

#### Scenario: Show loading state

- **WHEN** the directory is still fetching data
- **THEN** the system SHALL display a skeleton or loading placeholder.

#### Scenario: Show empty state

- **WHEN** no student profiles match the current filters
- **THEN** the system SHALL show an empty state with a clear message and any allowed create action.
