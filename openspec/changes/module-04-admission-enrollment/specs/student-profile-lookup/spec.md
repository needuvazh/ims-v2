## ADDED Requirements

### Requirement: Student Profile Search
The system SHALL allow authorized users to search student profiles by student number, name, or mobile within the active branch scope.

#### Scenario: Search by student number
- **WHEN** an authorized user searches for a student number from the lookup screen
- **THEN** the system SHALL return matching student profiles with their linked person details.

#### Scenario: Search by name or mobile
- **WHEN** an authorized user searches by name or mobile number
- **THEN** the system SHALL return matching student profiles in the active branch scope.

---

### Requirement: Student Profile Selection
The system SHALL allow admission and batch screens to select a student profile from the lookup result set.

#### Scenario: Select student profile for a workflow
- **WHEN** a user selects a student profile from search results
- **THEN** the system SHALL pass the student profile reference back to the calling workflow.

#### Scenario: Reject inactive profile selection
- **WHEN** a user attempts to select an inactive or deleted student profile
- **THEN** the system SHALL reject the selection and show a validation error.

---

### Requirement: Student Lookup Visibility
The system SHALL restrict student lookup results and visible contact data to users with branch authorization.

#### Scenario: Hide cross-branch student results
- **WHEN** a user searches without access to the student profile's branch
- **THEN** the system SHALL not return the profile in the search results.

#### Scenario: Mask unauthorized contact details
- **WHEN** a user without the required permission views a student profile row
- **THEN** the system SHALL mask sensitive contact details in the response.
