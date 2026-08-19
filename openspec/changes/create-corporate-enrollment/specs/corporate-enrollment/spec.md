## ADDED Requirements

### Requirement: B2B Multi-Candidate Group Enrollments
The system SHALL support enrolling multiple B2B nominated participants into courses and batches in a single bulk transaction.

#### Scenario: Enrolling selected candidates into a batch
- **WHEN** the user selects 2 nominated candidates, selects course "NEBOSH Safety", batch "NEB-2026-B1", and contract "CON-001" and submits
- **THEN** the system SHALL check batch capacity, create standard `Enrollment` records in Confirmed state, and link them to the corporate account and contract.

### Requirement: B2B Lookup Dropdowns Population
The system SHALL support loading lookup options for Won Contracts, Active Courses, and Active Batches for selection in bulk enrollment forms.

#### Scenario: populating selectors list
- **WHEN** the coordinator opens the group enrollment modal for Muscat Branch
- **THEN** the system SHALL load active courses, active batches, and contracts associated with that corporate account.
