## Context

The system must support lookup and selection of learners while maintaining data isolation boundaries across branches and avoiding duplication in the global `Person` registry. 

This design document corrects previous source-of-truth mismatches and outlines the technical approach to implement both `person-lookup` and `student-profile-lookup`.

---

## Capabilities Overview

### 1. `person-lookup` (Global Deduplication)
*   **Purpose:** Allow Registrars and Counselors to check if a prospect already exists centrally to prevent duplicate `Person` entities.
*   **Target:** `Person` table.
*   **Filters:** Global unique check on `mobile`, `email`, or `nationalId`.
*   **PII Masking:** Returns masked fields by default.
*   **Preflight Check:** Evaluates if the person already has a `StudentProfile` and returns any active admission in the active branch to prevent `ERR_ADM_ACTIVE_ADMISSION_EXISTS`.

### 2. `student-profile-lookup` (Intra-Branch Search)
*   **Purpose:** Search and select student profiles already registered under the active branch.
*   **Target:** `StudentProfile` joined with `Admission` or `Enrollment`.
*   **Visibility Bounds:** Visible in Branch X if there is:
    - An `Admission` in status `Submitted` or `Approved`.
    - Any `Enrollment` in any status.
*   **Query Constraints:** Deduplicated on `StudentProfile.id` and sorted by `StudentProfile.joinedAt` DESC.

---

## Architectural Decisions

### A. Shared Service Enforcement
To prevent bypasses from direct prisma queries in components and write endpoints (e.g., waitlisting and enrollment creation):
1.  **Introduce `StudentQueryService`** in `packages/admissions-enrollment` as the single point of entry for student directory search, deduplication checks, and branch verification.
2.  **Enforce Branch Checks in APIs:** 
    - The waitlist endpoint (`/api/v1/batches/[id]/waitlist`) and enrollment creation endpoint (`POST /api/v1/enrollments`) must call `StudentQueryService.verifyBranchScope(studentProfileId, activeBranchId)` to ensure the student belongs to the branch scope before writing to the database.
3.  **Refactor Server Components:** Replace inline Prisma queries in `batches/student-lookup/page.tsx` and `admissions/page.tsx` with calls to `StudentQueryService`.

### B. Prevention of Contract Drift
We officially update the Module 04 Bounded Context contracts:
- **Permission Matrix (Part 6):** Register `student.reveal_pii`.
- **API Contracts (Part 5):** Register the `POST /api/v1/students/{id}/reveal-pii` route.

### C. Preflight Active-Admission Conflict Resolution
*   The search and lookup payload returns `hasActiveAdmission` and `activeAdmissionId`.
*   If `hasActiveAdmission` is true for the target branch, the UI disables the "Create Admission" flow and displays a conflict indicator. If bypassed, `AdmissionService` throws `ERR_ADM_ACTIVE_ADMISSION_EXISTS`.
