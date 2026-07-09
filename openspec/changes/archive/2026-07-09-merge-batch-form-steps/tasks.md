## 1. Domain & Application Logic (Backend Sequence)

- [x] 1.1 Update `CreateBatchInput` interface in `packages/training-delivery/src/application/batch-service.ts` to make `batchCode` optional.
- [x] 1.2 Implement backend sequential batch code allocation inside `createBatch` in `batch-service.ts` when `input.batchCode` is empty/missing.
- [x] 1.3 Add unit tests in `packages/training-delivery/tests/training-delivery.spec.ts` verifying that omitting `batchCode` successfully generates the sequential batch code `[courseCode]-001` based on existing course cohorts.

## 2. Client Forms Refactoring (UI Stepper Removal)

- [x] 2.1 Refactor the `BatchForm` component in `apps/admin-portal/app/(protected)/batches/_components/batch-form.tsx`:
  - Remove `step` state, `handleNext`, `handleBack`, and step indicators.
  - Combine Details & Dates inputs and Capacity & Controls inputs into a single 2-column card grid.
  - Hide/remove the Batch Code field completely.
  - Combine validations into `isFormValid` and disable the submit button accordingly.
  - Update `handleSubmit` to omit sending client-side generated `batchCode` (pass empty string or null).
- [x] 2.2 Re-verify form submission integration tests in `apps/admin-portal/app/(protected)/batches/page.test.tsx` (ensure mock clicks are adjusted since the next button is removed).

## 3. Testing & Verification

- [x] 3.1 Run typecheck command `npm run typecheck` to verify workspace compilation.
- [x] 3.2 Run linter command `npm run lint` on the modified files to check code style.
- [x] 3.3 Run tests in training-delivery package `npx vitest run packages/training-delivery` and admin-portal batches `npx vitest run apps/admin-portal/app/(protected)/batches` to ensure all tests pass.
