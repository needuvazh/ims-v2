## 1. Schema & Permission Refactoring

- [x] 1.1 Refactor Prisma Schema:
  - Rename `studentId` to `studentProfileId` in `model WaitingList` in [schema.prisma](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/database/prisma/schema.prisma).
  - Add optional `enrollmentId String? @db.Uuid` column on `model WaitingList`.
- [x] 1.2 Database Migration & Data Backfill:
  - Run `pnpm db:migrate` or equivalent command to generate the migration.
  - Write a data backfill query to map legacy `student_id` fields to `student_profile_id` and link existing waitlist entries to their parent enrollments where possible.
- [x] 1.3 Rename Permissions:
  - Refactor permission code in `packages/database/prisma/seed.ts` from `batch.waitlist.manage` to `waitinglist.manage`.
  - Refactor route guards in `apps/admin-portal/app/api/v1/batches/[id]/waitlist/**/*` to verify `waitinglist.manage` permission.
  - Refactor protected server actions in batches/actions.ts (e.g. assertPermission('waitinglist.manage')).
  - Update all test suites (route test mocks, integrations) to reflect the new permission name.
- [x] 1.4 Refactor Codebase Contracts for Rename:
  - Update API route DTOs and Zod validator schemas (e.g. `studentId` -> `studentProfileId` in payloads).
  - Update repository interfaces, implementations (`BatchRepository`), domain types (`WaitingList`), and event emitters.
  - Update outbox payload contracts for `WaitlistEntryPromoted` and `EnrollmentCreationFailed` to carry `studentProfileId` and `enrollmentId`.

## 2. Domain & Application Validations

- [x] 2.1 Enforce Candidate Branch Scoping:
  - For Student Profiles: Call `StudentQueryService.verifyBranchScope(studentProfileId, batch.branchId)`. This asserts that the student profile has an approved or submitted Admission in the batch's branch context. If not, throw `ERR_AUTH_BRANCH_DENIED`.
  - For Leads: Verify `lead.branchId === batch.branchId` and throw `ERR_AUTH_BRANCH_DENIED` on mismatch.
- [x] 2.2 Enforce Active Status Checks:
  - Verify `studentProfile.status === 'Active'` and throw `ERR_STU_PROFILE_INACTIVE` on mismatch.
  - Verify `lead.stage !== 'Converted'` (throw `ERR_CRM_LEAD_ALREADY_CONVERTED`) and `lead.stage !== 'Lost'` (throw `ERR_CRM_LEAD_INACTIVE`).
- [x] 2.3 Enforce Batch Status Invariants:
  - In `BatchAggregate.validateWaitlistEnqueue`, verify batch status is `OPEN` or `IN_PROGRESS`; otherwise, throw `ERR_CRS_INVALID_BATCH_STATE`.

## 3. Enrollment Capacity Guard Refactoring

- [x] 3.1 Redesign Capacity checks:
  - In `EnrollmentService.approveEnrollment`, retrieve the count of active enrollments and waitlist entries with status `'Promoted'`.
  - Define total reserved seats: `ReservedSeats = ActiveCount + PromotedCount`.
- [x] 3.2 Implement Promotion Bypass Check:
  - In `EnrollmentService.approveEnrollment`, before the capacity validation block: check if there is an active `WaitingList` record for the candidate (`studentProfileId` and `batchId`) with status `Promoted`.
  - If a reservation is held, bypass the capacity block and allow approval.
  - If no reservation is held and `ReservedSeats >= capacity`, block approval and route to waitlist or reject.
- [x] 3.3 Terminal State Resolution:
  - Once the enrollment is successfully approved in `EnrollmentService.approveEnrollment`, update the candidate's `WaitingList` status to `'Removed'` (or set `isDeleted = true`) and set `promotionCorrelationId = null` to release the reservation.
- [x] 3.4 Enforce Enrollment Uniqueness Invariant:
  - Enforce that a `StudentProfile` can have at most one active or pending enrollment for a given `Batch`. Throw `ERR_ENR_DUPLICATE_ENROLLMENT` on duplication attempts.

## 4. Promotion Subscriber (Worker Integration)

- [x] 4.1 Worker Subscriber:
  - Implement/update the handler for `WaitlistEntryPromoted` event in worker ([worker/src/index.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/apps/worker/src/index.ts)).
  - If `enrollmentId` is present in the event payload, call `EnrollmentService.approveEnrollment(enrollmentId)`.
  - If `enrollmentId` is not present, find the single pending `Submitted` enrollment matching `studentProfileId` and `batchId`, and approve it. Handle duplication warnings safely.

## 5. Verification & Tests

- [x] 5.1 Unit Tests: Add/update unit tests in `packages/training-delivery` checking candidate validations, branch scoping, and status invariants.
- [x] 5.2 Concurrency Tests: Write integration tests verifying that promoted waitlist candidates hold their seats and cannot be front-run by other enrollment approvals.
- [x] 5.3 Worker Integration Tests: Verify that the worker successfully listens to `WaitlistEntryPromoted`, transitions the enrollment to `Approved`, and marks the waitlist record as `Removed`.
- [x] 5.4 Run verification checks and verify all tests pass.
