## Context

ASTI's B2B CRM and pipeline workflows require application logic and UI views to handle leads, visits, costing sheets, approval routing, and order handoffs. Having created the persistence tables, we will implement the domain logic, validation contracts, application services, Next.js server actions, React views, and unit test suites.

## Goals / Non-Goals

**Goals:**
- Create the new package `@ims/corporate-sales` under `packages/corporate-sales` with standard exports.
- Implement domain validators using Zod schemas for incoming client payloads.
- Implement `CorporateSalesService`, `QuotationService`, and `SalesOrderService`.
- Create the Next.js server actions file `apps/admin-portal/app/(protected)/corporate-sales/actions.ts` binding the UI to the services.
- Build Next.js app router pages and components for B2B leads, visits, follow-up scheduler, costing sheets grid, approvals queue, and order confirmation.
- Write unit tests validating margin calculations, lock states, and outbox logs.

**Non-Goals:**
- None. This is a full vertical-slice change.

## Decisions

- **Package Layout**:
  - `packages/corporate-sales/src/domain/`: Entities, validations, schemas.
  - `packages/corporate-sales/src/application/`: Service orchestrations, commands, queries.
- **UI Route & File Layout**:
  - `apps/admin-portal/app/(protected)/corporate-sales/leads/page.tsx` (Lead List & Visit Loggers)
  - `apps/admin-portal/app/(protected)/corporate-sales/quotations/page.tsx` (Quotation constructor)
  - `apps/admin-portal/app/(protected)/corporate-sales/quotations/[id]/costing/page.tsx` (Profit Margin Costing Sheet Grid)
  - `apps/admin-portal/app/(protected)/corporate-sales/approvals/page.tsx` (Branch Manager low-margin queue override screen)
  - `apps/admin-portal/app/(protected)/corporate-sales/orders/page.tsx` (Sales Order LPO wins)
  - `apps/admin-portal/app/(protected)/corporate-sales/actions.ts` (Next.js server actions)
- **Calculation Precision**: Net rates exclude the Omani 5% VAT rate for all margin calculations.
- **State Locks**: Approvals lock the edit state of quotations. Revisions clear lock states and reset versions.

## Risks / Trade-offs

- **Risk: Shared DB Client references**: Monolith services import database context tools directly.
- **Mitigation**: Standardize imports to target `@ims/database` helper classes to prevent cross-context drift.
