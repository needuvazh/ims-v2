## ADDED Requirements

### Requirement: Admissions Dashboard Page

The system SHALL provide an admissions dashboard page that summarizes the enrollment pipeline for the active branch scope.

#### Scenario: Open the admissions dashboard

- **WHEN** an authorized user opens the admissions dashboard
- **THEN** the system SHALL display KPIs for students, admissions, enrollments, batches, waitlist, and ID cards.

#### Scenario: Restrict data to branch scope

- **WHEN** the current session is branch-scoped
- **THEN** the dashboard SHALL only display data for the allowed branches.

#### Scenario: Link back to operational pages

- **WHEN** the user opens the admissions dashboard
- **THEN** the system SHALL provide navigation to the admissions list and batch roster pages.
