## 1. Domain & Backend Logic

- [x] 1.1 Update `FacultyEligibilityResult` interface in [batch-service.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/training-delivery/src/application/batch-service.ts) to define `sessionConflicts?: SessionConflict[]` and export `SessionConflict`.
- [x] 1.2 Implement target assessment date leave check in `getFacultyEligibilityForBatch`: flag `LEAVE_ON_TARGET_DATE` if the trainer has an approved leave request on `options.targetDate`.
- [x] 1.3 Collect structured details of session overlaps into `sessionConflicts` array inside `getFacultyEligibilityForBatch` loop.
- [x] 1.4 Make session conflicts non-blocking in `getFacultyEligibilityForBatch` by excluding `SESSION_OVERLAP` from `blockingReasonCodes` check.
- [x] 1.5 Relax assignment restriction in `assignTrainer` by omitting throwing `TrainerScheduleConflict` on session conflicts.

## 2. API Layer

- [x] 2.1 Confirm the GET handler in [route.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/apps/admin-portal/app/api/v1/batches/[id]/trainers/eligibility/route.ts) maps and validates `targetDate` query string parameter correctly.

## 3. UI Layer (Admin Portal)

- [x] 3.1 Declare `SessionConflict` interface and add `sessionConflicts` field in `FacultyEligibilityResult` type in [faculty-assignment-client.tsx](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/apps/admin-portal/app/(protected)/batches/[id]/faculty/_components/faculty-assignment-client.tsx).
- [x] 3.2 Add React state `selectedTrainerForConflicts` in `FacultyAssignmentClient` component.
- [x] 3.3 Update the status indicators in the trainer card to show separate items for "Course Authorized", "No Leaves Overlap" (blocking), and "Session Conflicts" (non-blocking).
- [x] 3.4 Add the "View Conflicts" button to trainer cards when `SESSION_OVERLAP` is present in reason codes.
- [x] 3.5 Implement the conflicts dialog modal in `FacultyAssignmentClient` to show detailed conflicting sessions (date, time range, batch code, session number).

## 4. Testing & Verification

- [x] 4.1 Create/update unit tests in [training-delivery.spec.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/training-delivery/tests/training-delivery.spec.ts) covering:
  - Leave on target assessment date makes trainer ineligible.
  - Session conflict does not make trainer ineligible (isAssignable is true) and returns conflict list.
  - Assign trainer with session conflicts succeeds without throwing schedule conflict error.
- [x] 4.2 Run type checks using `pnpm run typecheck` or package type-checking scripts.
- [x] 4.3 Execute unit tests to ensure all functionality is correct.
