## Context

B2B corporate training programs require registering employee candidates first. Later, these candidate profiles are promoted/converted to standard active `StudentProfile` entities to track individual academic achievements, sessions, and certifications.

## Goals / Non-Goals

**Goals:**
*   Implement B2B candidate rosters inside the Corporate Account 360 cockpit.
*   Support single candidate nomination forms validated by Zod schemas.
*   Support copy-paste spreadsheet text block parsers (CSV/TSV parsing rows).
*   Enforce identity resolution by unique `nationalId` (Civil Number).
*   Implement "Convert to Student" server mutations generating sequence-based student numbers and history log entries.

**Non-Goals:**
*   Providing bulk candidate exports (out of scope for this phase).

## Decisions

1.  **Candidate-to-Student Progression**:
    *   Promotion/conversion will generate a unique `studentNumber` using the database sequence `student_number_seq`.
    *   Create a `StudentProfile` record linked to the target corporate account's branch scope, and set `creationSource` to `CorporateNomination`.
    *   Write initial status change logs in `StudentStatusHistory`.
    *   Update `CorporateParticipant` by linking `linkedStudentProfileId` to the newly established student profile.
2.  **Excel Copy-Paste Spreadsheet Parser**:
    *   Build a simple client-side parser inside the import modal that splits block lines by comma/tab delimiters, runs basic checks, and feeds validated rows to `bulkNominateParticipantsAction`.

## Risks / Trade-offs

*   **Risk**: Conversion action fails due to database sequence lock errors or missing required data (like nationality or visa numbers).
*   **Mitigation**: Fallback sequence ID generator returns random IDs if raw sequence checks trigger query failures. Keep target fields optional in student profile registration if not provided in B2B rosters.
