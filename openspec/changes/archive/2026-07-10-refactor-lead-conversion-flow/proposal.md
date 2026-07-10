## Why

The current CRM lead conversion process has several architectural and usability issues:
1. It lacks direct attribution between a CRM Lead and an Enrollment for returning (existing) students because Admission records are blocked for duplicate branches.
2. Admissions are scoped to the Branch level rather than the Institute level, preventing students from taking courses across multiple branches without redundant Admissions.
3. The conversion flow forces manual verification of documents and multi-step approvals, creating unnecessary operational friction for counselors when uploader verification is already performed.
4. The conversion interface does not differentiate between new and returning students, forcing redundant data entry and document uploads for existing records.

## What Changes

*   **Institute-Level Admissions**: Shift the `Admission` model from branch-scoped to institute-wide. A student will have at most one active admission globally at the ASTI institute level.
*   **Branch-Level Enrollments**: Retain `Enrollment` at the branch level, scoping course delivery and local operations to specific branches.
*   **Direct Lead-to-Enrollment Linkage**: Add an optional `leadId` to the `Enrollment` model to track campaign and sales conversion metrics for both new and returning students.
*   **Auto-Approved Admission**: Automate the admission pipeline during conversion. Create the `Admission` record directly in `Approved` status.
*   **Draft Enrollment Creation**: Auto-create the initial `Enrollment` record in `Draft` status (not approved) to allow standard batch and pricing/financial clearance downstream.
*   **Counselor-Certified Auto-Verification**: Mark uploaded documents as `Verified` automatically, but stamp them with auditor metadata (`verifiedBy: counselorId`, `verifiedAt: now`) to keep an audit trail.
*   **Dedicated Conversion Pages / Wizard**: Create a separate page/wizard for the Lead-to-Student conversion flow.
*   **Deferred Execution**: Ensure no database changes are made until the user clicks the final "Convert & Enroll" button.
*   **UI Flow Branching for Existing Students**: Pre-fill demographics from existing profiles and perform a pre-flight document check to only ask for missing/expired documents.
*   **Existing Student Admission Reuse**: Reuse existing student profile and active admission record during lead conversion, directly creating a new draft enrollment without throwing errors.
*   **Course Waitlist Queue Support**: Support waitlist queue enrollments when converting a lead without choosing an active batch.
*   **Interactive Batch Assignment**: Provide clear assign and change batch options directly in the Enrollment details screen.

## Capabilities

### New Capabilities
<!-- None needed as we are modifying existing capabilities -->

### Modified Capabilities
*   `lead-to-admission-handoff`: Update handoff logic to support institute-level admissions, auto-approved admission creation, counselor-certified document verification, separate conversion pages, and deferred database mutation on button click.
*   `enrollment-lifecycle`: Add optional `leadId` tracking on `Enrollment` and require that the auto-created enrollment from lead conversion is initialized in `Draft` status.

## Impact

*   **Database Schema (`schema.prisma`)**:
    *   Remove `branchId` column and its foreign-key relation from the `Admission` model.
    *   Add an optional `leadId` column and relation to the `Enrollment` model.
*   **Backend Services**:
    *   Refactor `AdmissionService` (`createStudentAdmission`, `createAdmissionDraftDirect`, and `hasActiveAdmission` checks) to remove branch scoping.
    *   Refactor `EnrollmentService` (`createEnrollment` and `createWalkInEnrollment` / other custom pipelines) to handle `leadId` tracking and create enrollments in `Draft` status.
    *   Refactor `LeadConversionOrchestrator` to coordinate the single-transaction conversion.
*   **Frontend / UI**:
    *   Create a dedicated student conversion wizard page.
    *   Implement identity lookup (email/phone/nationalId) to branch the wizard step:
        *   *New Student*: Edit demographics form, mandatory document uploads, batch selection (optional - allows waitlisting if no batch selected), fee selection.
        *   *Old Student*: Pre-filled read-only profile display, smart document checklist (showing only missing or expired uploads), batch selection (optional), fee selection.
    *   Defer saving any state to the database until the final confirmation step ("Convert & Enroll").
    *   Add interactive change and assign batch buttons directly inside the Enrollment detail metadata card and actions sidebar panel.
