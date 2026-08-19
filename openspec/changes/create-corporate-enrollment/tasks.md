## 1. Backend Server Actions & Lookups

- [x] 1.1 Implement lookup action `getB2BEnrollmentLookupsAction` under `apps/admin-portal/app/(protected)/corporate-training/actions.ts` returning won contracts, courses, and batches.
- [x] 1.2 Implement server action `enrollCorporateParticipantsAction` enrolling candidate lists transactionally.
- [x] 1.3 Update the participant promotion conversion to also create `Admission` records.

## 2. Admin UI Form Modals & Checklists

- [x] 2.1 Add selector checkboxes to the B2B Cockpit Candidates table layout.
- [x] 2.2 Create the B2B group enrollment modal selecting Course, Batch, and Contract.
- [x] 2.3 Add triggers to submit enrollment mutations and refresh lists.

## 3. Verification & Compilation Checks

- [x] 3.1 Run TypeScript compiler (`pnpm typecheck`) to confirm code compiles correctly without errors.
- [x] 3.2 Run lint tests to check for standard styling and naming patterns.
