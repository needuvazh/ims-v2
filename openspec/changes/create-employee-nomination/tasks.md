## 1. Backend Server Actions & Student Conversion

- [x] 1.1 Create validation schemas and server actions under `apps/admin-portal/app/(protected)/corporate-training/actions.ts` supporting `nominateCorporateParticipantAction`, `bulkNominateParticipantsAction`, and `convertParticipantToStudentAction`.
- [x] 1.2 Implement the Person resolution matching criteria based on `nationalId` (Civil Number).
- [x] 1.3 Implement the unique student number generation query (`SELECT nextval('student_number_seq')::text as nextval`) inside the conversion action.

## 2. Admin UI Form Modals & Roster Actions

- [x] 2.1 Integrate the Participants directory list panel inside `apps/admin-portal/app/(protected)/corporate-training/_components/corporate-account-details-client.tsx`.
- [x] 2.2 Create the "Nominate Candidate" modal form component.
- [x] 2.3 Create the "Bulk CSV/TSV Import" modal block parsing text inputs.
- [x] 2.4 Add inline trigger buttons to convert participants to student profiles.

## 3. Verification & Compilation Checks

- [x] 3.1 Run TypeScript compiler (`pnpm typecheck`) to confirm code compiles correctly without errors.
- [x] 3.2 Run lint tests to check for standard styling and naming patterns.
