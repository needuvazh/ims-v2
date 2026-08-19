## 1. Backend Server Actions & Lookups

- [x] 1.1 Implement server action `requestCorporateBillingAction` under `apps/admin-portal/app/(protected)/corporate-training/actions.ts` supporting billing status transitions.
- [x] 1.2 Update cockpit account details query to load billing/invoice financial totals from database.

## 2. Admin UI Widgets & Actions

- [x] 2.1 Add "Billing Status" column to the Cockpit Participants directory list table showing progress indicators.
- [x] 2.2 Add bulk trigger button "Request Invoicing ({count})" inside the Cockpit Participants header.
- [x] 2.3 Add a read-only stats card strip displaying outstanding invoices and collected receipts.

## 3. Verification & Compilation Checks

- [x] 3.1 Run TypeScript compiler (`pnpm typecheck`) to confirm code compiles correctly without errors.
- [x] 3.2 Run lint tests to check for standard styling and naming patterns.
