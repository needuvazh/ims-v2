# Student Profile Lookup & Global Deduplication

## Purpose

This specification defines the core lookup capabilities under the **Admission & Enrollment Management** bounded context to maintain data isolation while preventing global identity duplication.

## Requirements

### Requirement: `person-lookup` (Global Deduplication Check)

The system SHALL allow authorized users to search the global `Person` registry using unique keys to detect existing identities and prevent duplicate records.

#### Scenario: Global Unique Key Matching

- **WHEN** an authorized user queries the global directory by a unique identifier (`mobile`, `email`, or `nationalId`)
- **THEN** the system SHALL match the identifier against the database.
- **AND** return a boolean flag indicating if the Person exists, their masked name, and their linked `StudentProfile` ID (if any).

#### Scenario: Surface Active Admission Conflict in Lookup Preflight

- **WHEN** a user queries a Person who already has a `StudentProfile` linked to an active `Admission` in the target branch (`admissionStatus` is `Draft`, `Submitted`, or `Approved`)
- **THEN** the system SHALL return `conflictCode: 'ERR_ADM_ACTIVE_ADMISSION_EXISTS'` in the preflight metadata
- **AND** the UI client SHALL disable the option to submit a duplicate admission for this branch.

#### Scenario: Advisory-Only Enrollment Preflight Check

- **WHEN** a user queries a Person who has an active `Enrollment` in any branch
- **THEN** the system SHALL flag this enrollment status in the preflight metadata for informational purposes only.
- **AND** the system SHALL NOT block the creation of a new `Admission` record based on enrollment status.

---

### Requirement: `student-profile-lookup` (Branch-Scoped Directory)

The system SHALL support directory queries for student profiles restricted to the user's authorized branch scope.

#### Scenario: Search within Branch Directory

- **WHEN** an authorized user searches the student directory in a branch
- **THEN** the system SHALL return all matching student profiles that have **at least one Admission (in any status, including Draft and Cancelled) or Enrollment record** linked to that branch.
- **AND** deduplicate results by `StudentProfile.id` so each student profile appears exactly once.
- **AND** sort the results by `joinedAt` DESC (latest first).

#### Scenario: Action Eligibility Validation (Downstream API checks)

- **WHEN** a user attempts to select a student profile for enrollment or waitlist placement
- **THEN** the API layer SHALL reject the selection with `ERR_STU_PROFILE_INACTIVE` if:
  - `StudentProfile.status !== 'Active'`
  - `StudentProfile.isDeleted === true`
  - The parent `Person.isDeleted === true`

---

### Requirement: `student-pii-reveal` (Audited Data Reveal)

The system SHALL protect personally identifiable information (PII) by masking sensitive fields in search responses and auditing any reveal requests.

#### Scenario: Mask Sensitive Contact Details by Default

- **WHEN** a query returns student details
- **THEN** the system SHALL mask `Person.mobile`, `Person.email`, and `Person.nationalId` in the default API payload.

#### Scenario: Audited PII Reveal

- **WHEN** a user with the `student.reveal_pii` permission requests to view the unmasked details of a student profile
- **THEN** the system SHALL require a valid justification reason
- **AND** log the request (containing `performedBy`, `action: 'RevealPII'`, `entityType: 'StudentProfile'`, and `reason`, without storing the unmasked PII) to `AuditLog`.
- **AND** return the unmasked value.
