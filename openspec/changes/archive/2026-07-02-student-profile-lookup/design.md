## Context

The system must support lookup and selection of learners while maintaining data isolation boundaries across branches and avoiding duplication in the global `Person` registry. 

This design document outlines the technical approach to implement `person-lookup` and `student-profile-lookup` and refactor existing bypass call sites in the codebase.

---

## Technical Approach

### 1. `person-lookup` (Global Deduplication Check)
*   **Target:** `Person` table.
*   **Deduplication Keys:** Search globally by unique fields: `mobile`, `email`, OR `nationalId`.
*   **Repository and Service Update:**
    - Refactor `AdmissionRepository.findPersonByEmailOrPhone` to `AdmissionRepository.findPersonByUniqueKeys(email, phone, nationalId)`.
    - Update `AdmissionService.createStudentAdmission` to pass `nationalId` to this lookup method.
    - Update Zod inputs to accept optional/nullable `nationalId`.
*   **Conflict Preflight Check:**
    - If the Person already has a `StudentProfile` linked to an active `Admission` in the target branch, flag `conflictCode: 'ERR_ADM_ACTIVE_ADMISSION_EXISTS'`. This is a **hard block** that disables registration in the UI.
    - If the Person has an active `Enrollment` in any branch, return the status in the preflight metadata. This is **advisory only** and does not block admission registration.

### 2. `student-profile-lookup` (Branch Directory Search)
*   **Visibility Rules:** Visible in Branch X if there is any linked `Admission` (in any status, including Draft and Cancelled) or `Enrollment` record.
*   **Presentation Constraints:** Results are deduplicated by `StudentProfile.id` and sorted by `StudentProfile.joinedAt` DESC.
*   **Action Eligibility Checks:** Downstream APIs (like enrollment and waitlist placement) check `StudentProfile.status === 'Active'` and `isDeleted === false` for both profile and person records.

### 3. API Boundary Enforcement & Refactoring
To secure the database boundaries and prevent direct Prisma queries from bypassing masking and scoping rules, the following call sites will be refactored to call `StudentQueryService`:
1.  **Waitlist Endpoint (`/api/v1/batches/[id]/waitlist/route.ts:103-120`):**
    - Replace the raw `prisma.studentProfile.findUnique` check.
    - Call `StudentQueryService.verifyBranchScope(studentId, branchId)` before calling the batch service, throwing `ERR_AUTH_BRANCH_DENIED` if the student is not in the branch scope.
2.  **Student Lookup Screen Component (`apps/admin-portal/app/(protected)/batches/student-lookup/page.tsx:19-45`):**
    - Replace the inline `prisma.studentProfile.findMany` query.
    - Call `StudentQueryService.searchBranchScopedStudents(query, [activeBranchId])` to retrieve properly scoped, masked, and sorted records.
3.  **Admissions Screen Component (`apps/admin-portal/app/(protected)/admissions/page.tsx:92-116`):**
    - Replace the inline `prisma.studentProfile.findMany` query.
    - Call `StudentQueryService.searchBranchScopedStudents('', [activeBranchId])` to fetch scoped student metadata.

---

## Permission Matrix & API Contract Integration
To avoid contract drift, the changes have been synchronized with the Bounded Context specifications:
*   **Permission Matrix FRD (Part 6):** Added `student.reveal_pii` permission.
*   **API Contracts FRD (Part 5):** Added `GET /api/person/lookup` and `POST /api/students/{id}/reveal-pii` endpoints.
