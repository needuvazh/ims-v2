## 1. Domain and Application Services

- [x] 1.1 Update `packages/admissions-enrollment` types and interfaces:
  - Update `CreateStudentProfileAdmissionSchema` to include optional/nullable `nationalId`.
  - Update `IAdmissionRepository` to replace `findPersonByEmailOrPhone` with `findPersonByUniqueKeys(email, phone, nationalId)`.
- [x] 1.2 Update implementation in `packages/admissions-enrollment/src/infrastructure/admission-repository.ts`:
  - Implement `findPersonByUniqueKeys` to query the global `Person` directory using `OR` conditions matching on `email`, `mobile` (phone), OR `nationalId`.
  - Update `createStudentProfileAndAdmission` to save `nationalId` when creating a new `Person`.
- [x] 1.3 Update `AdmissionService.createStudentAdmission` to pass `nationalId` to `findPersonByUniqueKeys` and handle the duplicate check.
- [x] 1.4 Create `StudentQueryService` in `packages/admissions-enrollment/src/application/student-query-service.ts` containing:
  - `globalPersonLookup(query: string, activeBranchId: string)`: matches Person globally on `mobile`/`email`/`nationalId`, returning masked metadata, preflight hard block `ERR_ADM_ACTIVE_ADMISSION_EXISTS` if active admission exists locally, and advisory-only enrollment warnings.
  - `searchBranchScopedStudents(searchQuery: string, allowedBranchIds: string[])`: queries `StudentProfile` joined with `Admission` or `Enrollment` in the target branches (including draft or cancelled statuses), deduplicates on ID, and sorts by `joinedAt` DESC.
  - `verifyBranchScope(studentProfileId: string, branchId: string)`: validates student activity (`Active`, non-deleted profile and person) and branch association, throwing `ERR_AUTH_BRANCH_DENIED` on violation.

## 2. API Routes & Component Refactoring

- [x] 2.1 Seed the new permission `student.reveal_pii` and add role mappings for Registrar, Branch Manager, and Super Admin in `packages/database/prisma/seed.ts`.
- [x] 2.2 Add API endpoints in `apps/admin-portal/app/api/v1/students` and `/api/v1/person/lookup`:
  - `GET /api/v1/person/lookup`: calls `StudentQueryService.globalPersonLookup`.
  - `GET /api/v1/students`: calls `StudentQueryService.searchBranchScopedStudents`.
  - `POST /api/v1/students/[id]/reveal-pii`: checks `student.reveal_pii` permission, retrieves PII, and logs zero-PII audit record.
- [x] 2.3 Refactor direct Prisma query bypasses in server components and routes:
  - Update `apps/admin-portal/app/(protected)/batches/student-lookup/page.tsx:19-45` to call `StudentQueryService.searchBranchScopedStudents`.
  - Update `apps/admin-portal/app/(protected)/admissions/page.tsx:92-116` to call `StudentQueryService.searchBranchScopedStudents`.
  - Update `/api/v1/batches/[id]/waitlist/route.ts:103-120` to call `StudentQueryService.verifyBranchScope` to prevent bypassing branch scoping when enqueueing waitlists.

## 3. Governance & Specifications Synchronization

- [x] 3.1 Append `student.reveal_pii` to the Action-Level table in `docs/architecture/frd/Module 04: Admission & Enrollment Management/Part 6 – Permission Matrix.md`.
- [x] 3.2 Append `POST /api/students/{id}/reveal-pii` and `GET /api/person/lookup` to the registry table and details section in `docs/architecture/frd/Module 04: Admission & Enrollment Management/Part 5 – API Contracts.md`.
- [x] 3.3 Update Bounded Context Functional Overview in `docs/architecture/frd/Module 04: Admission & Enrollment Management/Module 4: Admission & Enrollment Management.md`.

## 4. Verification & Tests

- [x] 4.1 Write unit tests for `StudentQueryService` covering global unique searches on all three keys, advisory enrollment warnings, and directory visibility including draft states.
- [x] 4.2 Write integration tests verifying that `verifyBranchScope` successfully blocks waitlist enqueueing for cross-branch student profiles.
