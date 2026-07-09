## 1. Domain & Backend Logic

- [x] 1.1 Add `TRAINER_ON_LEAVE` and `SESSION_OVERLAP` to the reason codes union in [trainer.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/trainer-management/src/domain/trainer.ts). Add optional `conflicts?: SessionConflict[]` to `TrainerEligibilityResult`.
- [x] 1.2 Update the `findEligibleTrainers` interface in [repositories.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/trainer-management/src/domain/repositories.ts) and [trainer-management-service.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/trainer-management/src/application/trainer-management-service.ts) to accept optional `sessionId?: string` inside `input` payload.
- [x] 1.3 Update repository query in [prisma-trainer-management-repository.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/trainer-management/src/infrastructure/prisma-trainer-management-repository.ts) to exclude the target `sessionId` from session overlap check, and include `batch` in the query to resolve `batchCode`.
- [x] 1.4 Distinguish availability checks in [prisma-trainer-management-repository.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/trainer-management/src/infrastructure/prisma-trainer-management-repository.ts): push `TRAINER_ON_LEAVE` or `SESSION_OVERLAP` instead of `TRAINER_NOT_AVAILABLE` when appropriate.
- [x] 1.5 Map and populate the `conflicts` array with the conflicting sessions list on the returned trainer result.

## 2. API Layer

- [x] 2.1 Update eligible-trainers GET handler in [route.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/apps/admin-portal/app/api/v1/faculty/[...segments]/route.ts) to parse `sessionId` from search parameters and pass it to `trainerManagementService.findEligibleTrainers`.

## 3. UI Layer (Admin Portal)

- [x] 3.1 Update `SessionScheduleFormProps` and `SessionScheduleForm` state in [session-schedule-form.tsx](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/apps/admin-portal/app/(protected)/batches/[id]/sessions/_components/session-schedule-form.tsx) to retrieve `sessionId` (e.g. from `initialData?.id`).
- [x] 3.2 Add `selectedTrainerForDetails` React state variable in `SessionScheduleForm`.
- [x] 3.3 Update `fetchAvailability` to include `&sessionId=${sessionId}` in the API request query string.
- [x] 3.4 Update badges and text rendering for trainer availability (distinguish `Leave` vs `Overlap`).
- [x] 3.5 Implement the Dialog details modal in `SessionScheduleForm` displaying checklist items and conflicting sessions table if overlaps exist. Replace the collapsible section.

## 4. Testing & Verification

- [x] 4.1 Update/create unit tests in [trainer-management-service.test.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/trainer-management/src/application/trainer-management-service.test.ts) or repository tests verifying the new statuses and target session exclusion.
- [x] 4.2 Run type checks using `pnpm run typecheck` to verify codebase integrity.
- [x] 4.3 Run unit tests using `pnpm --filter trainer-management exec vitest run` (and other related packages) to check for correctness.
