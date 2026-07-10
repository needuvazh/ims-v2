## ADDED Requirements

### Requirement: Read-Only Handoff Console Visibility
The student lifecycle handoff console MUST only be visible to users on the Lead details screen when the Lead's stage is `Converted` or `Won`.

#### Scenario: Lead in Converted Stage
- **WHEN** A student counselor navigates to the details screen of a Lead whose stage is `Converted`.
- **THEN** The Academic & Financial Handoff Console MUST render on the screen below the Lead Profile.

#### Scenario: Lead in New Stage
- **WHEN** A student counselor navigates to the details screen of a Lead whose stage is `New`.
- **THEN** The Academic & Financial Handoff Console MUST NOT be rendered on the screen.

### Requirement: Redirect Links to Canonical Modules
Each section of the handoff console MUST display direct links to redirect the user to the corresponding canonical modules.

#### Scenario: Redirecting to Admission Details
- **WHEN** The counselor clicks the "View Details" link on the Admission card in the handoff console.
- **THEN** The browser MUST redirect to `/admissions/[admissionId]`.

#### Scenario: Redirecting to Student Profile
- **WHEN** The counselor clicks the "View Details" link on the Student Profile card in the handoff console.
- **THEN** The browser MUST redirect to `/students/[studentProfileId]`.

#### Scenario: Redirecting to Enrollment Details
- **WHEN** The counselor clicks the "View Details" link on the Enrollment card in the handoff console.
- **THEN** The browser MUST redirect to `/enrollments/[enrollmentId]`.
