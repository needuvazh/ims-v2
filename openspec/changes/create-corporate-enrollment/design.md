## Context

B2B corporate training programs require enrolling multiple nominated employee candidates into active training courses and batches. Standard enrollment aggregates are utilized to model learning lifecycles, and `CorporateEnrollment` records link participants, accounts, and contracts.

## Goals / Non-Goals

**Goals:**
*   Implement lookup helpers to retrieve active courses, active batches, and won corporate contracts for selector lists.
*   Enforce transactional group enrollments mapping candidates into standard active `Enrollment` models.
*   Implement B2B link structures in the database tracking billing status indicators.
*   Expose selector checklists and a "Group Enrollment Modal" inside the cockpit page.

**Non-Goals:**
*   Generating individual student payment installment plans (not required for B2B accounts).

## Decisions

1.  **Consolidated Group Enrollment Mutation**:
    *   Expose `enrollCorporateParticipantsAction` accepting candidate IDs, Course, Batch, and Contract links.
    *   Verify capacity thresholds inside training batches.
    *   For each candidate, resolve/create `StudentProfile` and `Admission` records.
    *   Create standard `Enrollment` in confirmed/approved status with `enrollmentType: 'Corporate'`.
    *   Establish a `CorporateEnrollment` link with `billingStatus: 'NotRequested'`.
2.  **Cockpit UI Controls**:
    *   Add checkbox column to the Candidates table. Add an action button "+ Enroll Selected" triggering the modal form.

## Risks / Trade-offs

*   **Risk**: Enrolling a candidate who already holds active enrollments on that target batch.
*   **Mitigation**: Run query checks to ensure candidates aren't already enrolled before processing records, skipping duplicate rows with warnings.
