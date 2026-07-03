# duplicate-management Specification

## Purpose
TBD - created by syncing change module-05-student-management. Update Purpose after archive.

## Requirements

### Requirement: REQ-SM-DUP-001 — Duplicate Blocking on Email/Mobile
The system SHALL check uniqueness of email and mobile numbers globally before creating any student profile. The system MUST block direct registration of a student profile if another active profile shares the same email or mobile.

#### Scenario: Block duplicate creation on Email matching active profile
- **GIVEN** an active student profile exists with email "alice@domain.com"
- **WHEN** a counselor attempts to register a new student with email "alice@domain.com"
- **THEN** the registration fails with error code "ERR_STU_IDENTITY_CONFLICT"

#### Scenario: Block duplicate creation on Mobile matching active profile
- **GIVEN** an active student profile exists with mobile "+96899990000"
- **WHEN** a counselor attempts to register a new student with mobile "+96899990000"
- **THEN** the registration fails with error code "ERR_STU_IDENTITY_CONFLICT"

---

### Requirement: REQ-SM-DUP-002 — Verified OTP Claim
If a duplicate email or mobile matches an existing profile, the system SHALL allow the counselor to claim the existing profile by verifying a one-time passcode (OTP) sent to the student's matching contact details.

#### Scenario: Claim profile with valid OTP
- **WHEN** the counselor submits the correct 6-digit OTP code for the student
- **THEN** the system creates a new Admission record in the target branch and dynamically grants visibility

#### Scenario: Reject claim with invalid OTP
- **WHEN** the counselor submits an incorrect or expired 6-digit OTP code for the student
- **THEN** the system raises error code "ERR_STU_OTP_INVALID" and blocks Admission creation

---

### Requirement: REQ-SM-DUP-003 — Transactional Duplicate Merging
For existing historical duplicate records, the system SHALL support merging. The merge operation MUST atomically reassign all Admissions, Enrollments, and Documents to the survivor profile, soft-delete the source profile, and log the details in `StudentMergeLog`.

#### Scenario: Merge profiles successfully
- **GIVEN** duplicate profiles STU-001 (survivor) and STU-002 (source) exist
- **WHEN** an authorized Branch Manager merges STU-002 into STU-001 with a valid reason
- **THEN** all admissions, enrollments, and documents are reassigned, STU-002 is soft-deleted, and a merge log is written
