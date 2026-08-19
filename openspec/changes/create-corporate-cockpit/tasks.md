## 1. Backend Services & Server Actions

- [x] 1.1 Create corporate training master server actions under `apps/admin-portal/app/(protected)/corporate-training/actions.ts` to support querying, creating, and updating corporate accounts.
- [x] 1.2 Implement input validation schemas using Zod for create/edit account payloads, including validation for unique account codes.
- [x] 1.3 Implement optimistic version concurrency checks on update corporate actions.

## 2. Admin UI Routes & Form Components

- [x] 2.1 Create the main corporate accounts directory route at `apps/admin-portal/app/(protected)/corporate-training/accounts/page.tsx` displaying paginated tables and filter inputs.
- [x] 2.2 Create the registration form view at `/corporate-training/accounts/create/page.tsx` implementing reactive Zod errors instead of native browser popups.
- [x] 2.3 Create the editing view at `/corporate-training/accounts/[id]/edit/page.tsx` to update client properties.
- [x] 2.4 Create the 360-degree profile cockpit at `/corporate-training/accounts/[id]/page.tsx` implementing cards for credit limits, available balances, and dynamic invoice lists read from the Finance schema.

## 3. Verification & Compilation Checks

- [x] 3.1 Run TypeScript compiler (`pnpm typecheck`) to verify code compiles correctly without errors.
- [x] 3.2 Run lint tests to check for standard styling and naming patterns.
