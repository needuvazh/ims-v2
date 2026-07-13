## 1. Scaffolding corporate-sales Package

- [x] 1.1 Create `packages/corporate-sales/package.json`, `packages/corporate-sales/tsconfig.json`, and `packages/corporate-sales/src/index.ts`.

- [x] 1.2 Run package bootstrap commands to link `@ims/corporate-sales` inside the monorepo workspace.


## 2. Implement Domain validations & Types

- [x] 2.1 Define Zod schemas for visit logging payloads, costing sheet fields, quotation entries, and sales order confirmations.
- [x] 2.2 Define domain types, query results, custom exception codes, and event mappings.


## 3. Implement Application Services

- [x] 3.1 Implement `CorporateSalesService` managing lead states, log visits, and follow-ups.
- [x] 3.2 Implement `QuotationService` managing costings, low-margin approvals, and revisions.
- [x] 3.3 Implement `SalesOrderService` confirming order wins and writing transactional outbox handoffs.


## 4. Integrate Next.js Server Actions & UI Screens

- [x] 4.1 Implement `apps/admin-portal/app/(protected)/corporate-sales/actions.ts` binding the UI to package services.

- [x] 4.2 Build `apps/admin-portal/app/(protected)/corporate-sales/leads/page.tsx` displaying the B2B sales dashboard, leads tables, and logging marketing visits.

- [x] 4.3 Build `apps/admin-portal/app/(protected)/corporate-sales/quotations/page.tsx` displaying the B2B quotation catalog and creation forms.

- [x] 4.4 Build `apps/admin-portal/app/(protected)/corporate-sales/quotations/[id]/costing/page.tsx` implementing the spreadsheet costing sheet and margin percentage recalculator.

- [x] 4.5 Build `apps/admin-portal/app/(protected)/corporate-sales/approvals/page.tsx` displaying the B2B approvals override comments trigger.

- [x] 4.6 Build `apps/admin-portal/app/(protected)/corporate-sales/orders/page.tsx` implementing the sales order LPO document upload and confirmation.


## 5. Verify & Test

- [x] 5.1 Write Vitest unit tests for B2B costing sheets, margin triggers, revisions snapshots, and lock constraints.

- [x] 5.2 Execute typecheck validations (`pnpm typecheck`) and verify all package tests pass without errors.

