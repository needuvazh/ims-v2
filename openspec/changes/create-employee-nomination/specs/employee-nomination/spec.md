## ADDED Requirements

### Requirement: B2B Candidate Nomination Resolution
The system SHALL support nominating B2B corporate participants under a corporate account. The nomination MUST resolve the employee's profile by `nationalId` (Civil Number). If the Person exists, the system SHALL reuse the Person record, update their details, and create the `CorporateParticipant` link.

#### Scenario: Nominating a candidate with resolved identity
- **WHEN** the user nominates a participant with National ID "NID-223344", name "Qais Al-Busaidi", email "qais@co.om", and phone "+968 9111 2222"
- **THEN** the system SHALL check if a Person exists with National ID "NID-223344", reuse the Person record, and link them to the account.

### Requirement: Student Profile Conversion Progression
The system SHALL support converting a registered `CorporateParticipant` to a standard active `StudentProfile`. The conversion MUST generate a unique student number formatting `STU-2026-[seq]`, link it to the corporate account's branch scope, and update the participant's `linkedStudentProfileId` link reference.

#### Scenario: Promoting a corporate participant to student
- **WHEN** a coordinator triggers "Convert to Student" for participant "EMP-103" under an account scoped to Muscat branch
- **THEN** the system SHALL retrieve the next sequence value from `student_number_seq`, format `studentNumber`, create `StudentProfile` with `creationSource: "CorporateNomination"`, and set `linkedStudentProfileId` link.

### Requirement: Copypaste Roster Bulk Import
The system SHALL support copying and pasting CSV or TSV spreadsheet text blocks to batch-register multiple nominated participants at once.

#### Scenario: Importing candidate rows from clipboard
- **WHEN** the user pastes a raw roster text containing 2 comma-separated candidate rows and submits
- **THEN** the system SHALL split the text, parse headers, validate each row's fields, and batch insert `CorporateParticipant` records.
