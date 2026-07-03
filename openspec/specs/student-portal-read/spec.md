# student-portal-read Specification

## Purpose
TBD - created by syncing change module-05-student-management. Update Purpose after archive.

## Requirements

### Requirement: REQ-SM-PORTAL-001 — Read-Only Student Portal Profile View
The student portal SHALL allow authenticated students to view their own profile and card details. The portal MUST NOT allow students to update, edit, or delete any profile fields directly.

#### Scenario: View own student profile in student portal
- **WHEN** student "STU-001" logs into the student portal and requests their profile details
- **THEN** the profile returns successfully
- **And** all editing widgets, inputs, and updates are disabled

#### Scenario: Block student profile mutation from student portal
- **WHEN** student "STU-001" attempts to execute a PATCH request to edit their birthdate or phone number
- **THEN** the API returns "ERR_AUTH_FORBIDDEN"
