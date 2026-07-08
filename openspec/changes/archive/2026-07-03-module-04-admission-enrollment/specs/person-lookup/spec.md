## ADDED Requirements

### Requirement: Global Person Duplicate Lookup

The system SHALL allow authorized admissions users to perform a global person lookup by national ID, mobile, or email before creating or linking a student profile.

#### Scenario: Find existing person by unique contact fields

- **WHEN** an authorized user submits a lookup query containing national ID, mobile, or email
- **THEN** the system SHALL return the matching Person record if one exists and mark the lookup as a preflight duplicate check.

#### Scenario: Return no match when no person exists

- **WHEN** an authorized user submits a valid lookup query that does not match any active Person record
- **THEN** the system SHALL return a not-found response that can be used to continue admission creation.

---

### Requirement: Person Lookup Preflight Flags

The system SHALL return admission preflight flags with the person lookup result so the caller can detect admission and enrollment conflicts before proceeding.

#### Scenario: Include admission and enrollment conflict flags

- **WHEN** the lookup finds a Person record
- **THEN** the system SHALL include whether the person already has an active admission or enrollment in the target branch.

#### Scenario: Restrict person lookup to authorized branch context

- **WHEN** a user performs a lookup outside their allowed branch context
- **THEN** the system SHALL reject the request with `403 Forbidden`.

---

### Requirement: Person Lookup Response Masking

The system SHALL mask person contact details in the lookup response unless the caller is explicitly authorized to view them.

#### Scenario: Mask sensitive fields by default

- **WHEN** a user without reveal permission views lookup results
- **THEN** the system SHALL mask mobile and email values in the response.

#### Scenario: Show full contact values when allowed

- **WHEN** a user with explicit reveal permission performs the lookup
- **THEN** the system SHALL return the full contact values and preserve auditability in the consuming route.
