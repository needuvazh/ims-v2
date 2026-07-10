## 1. Domain & API Updates

- [x] 1.1 Update `CreateExamSchema` in `packages/exam-result-completion/src/contracts/validation-schemas.ts` to ensure `examDate` is in the future.
- [x] 1.2 Update `EvaluateCompletionCommandHandler.ts` to transition completion status directly to `AwaitingFinalApproval` instead of intermediate recommendation states when automated criteria are met.
- [x] 1.3 Update `GetCompletionDetailQueryHandler.ts` to return `attendanceOutcome`, `examOutcome`, and `paymentOutcome`.

## 2. Exam List & New Exam Screens UI Alignment

- [x] 2.1 Refactor `exams/page.tsx` to use the standardized `@ims/shared-ui` layout matching the `/batches` page structure.
- [x] 2.2 Add filters for Course, Batch, and Status, along with search inputs and server-side `Pagination` on `exams/page.tsx`.
- [x] 2.3 Modify the batch lookup in `exams/new/page.tsx` to retrieve only batches in `InProgress` or `Completed` status.
- [x] 2.4 Add frontend date picker limits in `ExamForm.tsx` ensuring exam dates cannot be set in the past.

## 3. Merged Exam Detail & Results UI

- [x] 3.1 Refactor `exams/[id]/page.tsx` to fetch all batch enrollments and query existing results, merging them into a complete student marks roster.
- [x] 3.2 Combine actions in `ExamDetailClient`: replace the sequential Schedule & Open buttons for Draft exams with a single **"Open for Results"** click (calling `/schedule` then `/activate` in sequence).
- [x] 3.3 Embed the roster list directly at the bottom of the Exam Details screen.
- [x] 3.4 Support direct inline roster inputs for marks and grade in `ExamDetailClient` when status is `OpenForResultEntry`. Add a **"Save Roster Marks"** bulk submission button.
- [x] 3.5 Provide a **"Complete Exam"** action button that closes the exam and locks result entry inputs.

## 4. Completion List & Checklist UI

- [x] 4.1 Redesign the completions listing at `completions/page.tsx` to incorporate standard Course, Batch, and Search query filters.
- [x] 4.2 Update `CompletionDetailClient` to read and render the evidence checklist outcomes (`attendanceOutcome`, `examOutcome`, `paymentOutcome`).
- [x] 4.3 Simplify the completion manual approval view to show a single approval card/action bypassing Trainer Recommendation and Coordinator Review tabs.

## 5. Verification & Tests

- [x] 5.1 Run TypeScript typechecks: `pnpm run typecheck`
- [x] 5.2 Run linting: `pnpm run lint`
- [x] 5.3 Run Vitest tests for the exam-result-completion package: `pnpm --filter @ims/exam-result-completion test`
