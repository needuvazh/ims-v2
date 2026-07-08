# student-profile-dashboard Specification

## Purpose

TBD - created by syncing change module-04-admission-enrollment. Update Purpose after archive.

## Requirements

### Requirement: Student Profile Dashboard

The system SHALL provide a student profile dashboard that shows the linked Person record, admissions, enrollments, documents, and ID card status.

#### Scenario: Render the student profile summary

- **WHEN** an authorized user opens a student profile dashboard
- **THEN** the system SHALL show the person name, contact details, student number, status, and branch-scoped history.

#### Scenario: Render linked admissions and enrollments

- **WHEN** the dashboard loads successfully
- **THEN** the system SHALL show linked admissions and enrollments with their current statuses and references.

---

### Requirement: Student Profile Document and Audit Panels

The system SHALL expose document and audit context needed to review the learner lifecycle.

#### Scenario: Show document status panel

- **WHEN** the dashboard loads for a permitted user
- **THEN** the system SHALL show document statuses and verification states relevant to the student profile.

#### Scenario: Show audit trail panel

- **WHEN** the dashboard is opened by an authorized reviewer
- **THEN** the system SHALL display a chronological audit trail for admissions and enrollment actions.

---

### Requirement: Student Profile Visibility Controls

The system SHALL enforce branch scope and permission checks on the dashboard.

#### Scenario: Deny cross-branch dashboard access

- **WHEN** a user requests a dashboard for a profile outside their authorized branch scope
- **THEN** the system SHALL return `403 Forbidden`.

#### Scenario: Mask sensitive contact data without permission

- **WHEN** a user lacks reveal permission for sensitive contact values
- **THEN** the system SHALL mask the restricted fields in the dashboard response.
