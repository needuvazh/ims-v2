## Why

Training coordinators need a structured way to register points of contact for B2B employee candidates (nominated corporate participants) and then promote/convert those candidates into standard active `StudentProfile` entities. This is Phase 3 of Module 14 - Corporate Training Management. We need a way to upload lists of participants in bulk and promote candidates using unique National ID civil numbers.

## What Changes

1.  **Server Actions for Employee Nomination & Conversion**:
    *   Add actions to query B2B participants list, add single participant, bulk import participants list, and convert selected participants to student profiles.
    *   Implement student sequence generation using `student_number_seq` and record initial active state history logs.
2.  **Participants Tab panel View**:
    *   Integrate a "Participants" directory list tab inside `/corporate-training/accounts/[id]`.
    *   Create modal components: "Nominate Candidate" (Zod validated form) and "Bulk CSV/TSV Import Block" (copy-paste text-block parser).
    *   Provide inline actions: "Convert to Student" which promotions candidate and generates a student ID.

## Capabilities

### New Capabilities
- `employee-nomination`: Import corporate participants, validate duplicate links, and transition active candidates to standard student profiles.

### Modified Capabilities

## Impact

*   **Bounded Contexts**: Organization Management, Corporate Training Management, Admission & Enrollment Management (student profiles and numbering sequence).
*   **Database Tables**: `CorporateParticipant`, `Person`, `StudentProfile`, `StudentStatusHistory`, `CorporateAccount`.
*   **Permissions**: `corporate-training.participant.create`, `corporate-training.participant.write`, `corporate-training.participant.read`.
