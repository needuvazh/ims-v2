## 1. Domain and Application Services

- [ ] 1.1 Create `StudentQueryService` in `packages/admissions-enrollment/src/application/student-query-service.ts` with:
  - `globalPersonLookup(query: string, activeBranchId: string)`: searches globally by mobile/email/national ID, returning masked Person details and branch-specific preflight checks (`hasActiveAdmission`, `activeAdmissionId`).
  - `searchBranchScopedStudents(searchQuery: string, allowedBranchIds: string[], options: { page: number, limit: number })`: queries `StudentProfile` joined with `Admission`/`Enrollment`, filters by authorized branches, deduplicates by ID, sorts by `joinedAt` DESC, and masks PII.
  - `verifyBranchScope(studentProfileId: string, branchId: string)`: checks if the student has a valid admission (status `Submitted`/`Approved`) or enrollment in the branch. Throws `ERR_AUTH_BRANCH_DENIED` if not found.
- [ ] 1.2 Enforce `verifyBranchScope` inside the waitlist queue method in batch service (`packages/training-delivery`) and in `createEnrollment` inside enrollment service (`packages/admissions-enrollment/src/application/enrollment-service.ts`).

## 2. API Routes and UI Refactoring

- [ ] 2.1 Seed the new permission `student.reveal_pii` and add role mappings for Registrar, Branch Manager, and Super Admin in `packages/database/prisma/seed.ts`.
- [ ] 2.2 Add routes in `apps/admin-portal/app/api/v1/students`:
  - `GET /api/v1/students`: calls `StudentQueryService.searchBranchScopedStudents`.
  - `POST /api/v1/students/[id]/reveal-pii`: checks `student.reveal_pii` permission, retrieves unmasked data, and logs zero-PII audit record.
- [ ] 2.3 Add `GET /api/v1/person/lookup` endpoint calling `StudentQueryService.globalPersonLookup` for duplicate checks.
- [ ] 2.4 Refactor `apps/admin-portal/app/(protected)/batches/student-lookup/page.tsx` and `apps/admin-portal/app/(protected)/admissions/page.tsx` to query student data using `StudentQueryService` rather than calling Prisma directly.
- [ ] 2.5 Update lookup dialogs in UI to disable "Create Admission" if the preflight check returns an active admission conflict (`ERR_ADM_ACTIVE_ADMISSION_EXISTS`).

## 3. Verification & Tests

- [ ] 3.1 Write unit tests for `StudentQueryService` covering lookup masking, branch filtering, deduplication, and active admission checks.
- [ ] 3.2 Write integration tests verifying that `enqueueWaitlist` and `createEnrollment` reject unauthorized/cross-branch student IDs.
- [ ] 3.3 Verify PII reveal actions are logged in the `AuditLog` table.
