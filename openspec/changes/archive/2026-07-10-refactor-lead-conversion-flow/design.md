## Context

The current ASTI lead-to-student conversion pipeline has structural and usability bottlenecks:
1. Admissions are restricted to a single branch (`Admission.branchId`), preventing students from enrolling across branches without redundant admissions.
2. Converting returning (existing) students loses CRM lead-attribution because creating another Admission record for the same branch is blocked.
3. Document verification and state transitions for regular admissions are multi-step and manual, causing excessive administrative delay.
4. The conversion interface does not offer a streamlined branching wizard for returning students to verify existing details and only upload missing/expired documents.

Additionally, these architecture and model changes must be reflected in the project's documentation (`docs/architecture/ddd/` and `docs/architecture/frd/`) to keep document and code in sync.

## Goals / Non-Goals

**Goals:**
*   Move `Admission` to institute-level scope by removing `branchId`.
*   Link `Enrollment` directly to `Lead` using an optional `leadId` field.
*   Automate the lead conversion transaction to create an Approved Admission and a Draft Enrollment in a single-click action.
*   Introduce smart branching UI screens for new vs. returning students.
*   Update ddd context maps, ER diagrams, and FRD documents to keep documentation in sync with the codebase.

**Non-Goals:**
*   Auto-approving the `Enrollment` itself (must remain in `Draft` status for financial/batch clearance).
*   Enabling multi-tenant/SaaS capabilities for admissions.
*   Implementing online payment automated gateway clearance (out of Phase 1 scope).

## Decisions

### Decision 1: Institute-Level Admissions
*   **Choice**: Remove the `branchId` column and its foreign-key relation from the `Admission` model. The admission is now a global status of the student at the ASTI institute level.
*   **Rationale**: A student registers once at the institute level. Scoping admissions to branches causes data redundancy and blocks multi-branch enrollments.
*   **Alternatives Considered**: Keeping branch-level admissions but allowing multiple active admissions in the same branch. Rejected because it violates the identity principal and duplicates profile metadata.
*   **Documentation Impact**: Update `docs/architecture/ddd/ddd-context-map.md` (Section 8.6), `docs/architecture/ddd/ER Model.md` (Section 11.1), and `docs/architecture/frd/Module 04 - Admission & Enrollment Management` (Part 1 and Part 4) to remove the branch association.

### Decision 2: Direct Lead-to-Enrollment Link
*   **Choice**: Add an optional `leadId` relation directly to the `Enrollment` model.
*   **Rationale**: Ensures precise conversion tracking for both new and returning students (who do not create a new Admission).
*   **Alternatives Considered**: Creating a junction table `LeadToEnrollment` or referencing the Lead inside the Admission record only. Rejected because returning students bypass Admission creation, which breaks the link.
*   **Documentation Impact**: Update `docs/architecture/ddd/ER Model.md` (Section 11.3) and `docs/architecture/frd/Module 04 - Admission & Enrollment Management` (Part 4) to document this link.

### Decision 3: Document Auto-Verification Audit Stamp
*   **Choice**: Automatically transition uploaded documents to `Verified` status during conversion, but stamp them with the counselor's user ID as the verifier and log this transition.
*   **Rationale**: Removes manual verification delay while preserving the audit trail for compliance.
*   **Alternatives Considered**: Traditional manual verification queue (too slow) or anonymous auto-verification (violates regulatory/audit compliance rules).
*   **Documentation Impact**: Update `docs/architecture/frd/Module 13 - Document Management` to record counselor-certification rules.

### Decision 4: Branch Scoping via Enrollment
*   **Choice**: Enforce branch-scoped access for branch managers by querying the student's `Home Branch` (on `StudentProfile`) and any active/history `branchId` on the student's `Enrollment` records.
*   **Rationale**: Since `Admission` is no longer branch-scoped, we must use `StudentProfile` and `Enrollment` branches to dynamically scope access control.
*   **Alternatives Considered**: Restricting branch managers to home-branch students only. Rejected because it would block branch managers from seeing students taking classes at their branch.
*   **Documentation Impact**: Update `docs/architecture/frd/Module 04 - Admission & Enrollment Management` (Part 6 - Permission Matrix) to reflect the new dynamic scope logic.

### Decision 5: Course Waitlist Queue (No Batch Selection)
*   **Choice**: Allow counselors to convert leads without selecting an active batch. This places the resulting draft enrollment into the course waiting list queue (`batchId = null`).
*   **Rationale**: Students often enquire and register for courses before a batch start date is scheduled or pricing resolved. Blocking registration due to missing batches prevents counselors from capturing early interest.
*   **Documentation Impact**: Update `docs/architecture/frd/Module 04 - Admission & Enrollment Management` to record waitlist-queue status rules.

### Decision 6: Post-Conversion Interactive Batch Actions
*   **Choice**: Provide direct "Assign" and "Change Batch" option triggers in the Enrollment details metadata card and workflow actions sidebar.
*   **Rationale**: Because waitlisted students require batch assignment later and confirmed students may change batches due to scheduling conflicts, having a unified dialog to alter batch mapping reduces friction.
*   **Documentation Impact**: Update `docs/architecture/frd/Module 04 - Admission & Enrollment Management` to define enrollment batch-assignment workflows.

## Risks / Trade-offs

*   **[Risk] Stale Demographic/Contact Info on Returning Students** → *Mitigation*: The conversion wizard displays pre-filled fields (email, phone, address) and allows the counselor to review and update them before clicking the "Convert & Enroll" button.
*   **[Risk] Expired Visa/National ID Documents for Old Students** → *Mitigation*: The pre-flight check validates document expiry dates. If a mandatory document has expired or is missing, the wizard highlights it and requires a new upload.
*   **[Risk] Cross-Branch Data Leakage** → *Mitigation*: Branch Managers can only read student records where the student profile's home branch matches their assigned branch, OR where there is an active/historical enrollment under their branch.
