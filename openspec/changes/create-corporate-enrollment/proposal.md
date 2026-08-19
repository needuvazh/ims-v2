## Why

Training coordinators need to enroll multiple nominated B2B candidates into active training courses, batches, and corporate contracts from the B2B Corporate cockpit profile. This is Phase 4 of Module 14 - Corporate Training Management. The process must execute transactionally, promote passive candidate profiles to students where needed, and register `CorporateEnrollment` linkage records.

## What Changes

1.  **Server Actions for B2B Group Enrollments**:
    *   Expose lookups to fetch won contracts, active courses, and batches.
    *   Implement transactional enrollment processing that maps candidate rosters into the aggregate `Enrollment` model and registers corresponding links.
2.  **Participants Cockpit UI checklist**:
    *   Add multi-select checklist options to the Candidates table in the B2B Cockpit.
    *   Render a "Bulk Group Enrollment" modal selecting course, batch, and contracts, triggering bulk mutations.

## Capabilities

### New Capabilities
- `corporate-enrollment`: Enroll participants in batch, check capacity thresholds, link contracts, and track billing states.

### Modified Capabilities

## Impact

*   **Bounded Contexts**: Organization Management, Training Delivery Management, Corporate Training Management, Admission & Enrollment Management.
*   **Database Tables**: `Enrollment`, `CorporateEnrollment`, `CorporateParticipant`, `StudentProfile`, `Admission`.
*   **Permissions**: `enrollment.create`, `corporate-training.enrollment.write`, `corporate-training.enrollment.read`.
