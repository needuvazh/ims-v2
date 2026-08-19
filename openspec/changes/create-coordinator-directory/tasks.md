## 1. Backend Server Actions & Person Resolution

- [x] 1.1 Add contact schemas and server actions under `apps/admin-portal/app/(protected)/corporate-training/actions.ts` supporting `addCorporateContactAction`, `updateCorporateContactAction`, and `togglePortalAccessAction`.
- [x] 1.2 Implement the Person resolution matching criteria based on `nationalId` (Civil Number).
- [x] 1.3 Implement single primary contact invariant inside a database transaction block.

## 2. Admin UI Form Modals & Actions

- [x] 2.1 Integrate the Contact Directory tab listing panel inside `apps/admin-portal/app/(protected)/corporate-training/_components/corporate-account-details-client.tsx`.
- [x] 2.2 Create the "Add/Edit Coordinator Contact" modal form components validating fields with Zod schemas.
- [x] 2.3 Add triggers for deactivation, switching primary status, and toggling portal flags.

## 3. Verification & Compilation Checks

- [x] 3.1 Run TypeScript compiler (`pnpm typecheck`) to confirm code compiles correctly without errors.
- [x] 3.2 Run lint tests to check for standard styling and naming patterns.
