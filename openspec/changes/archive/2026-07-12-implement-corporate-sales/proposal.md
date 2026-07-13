## Why

ASTI's B2B operations require functional domain services, API endpoints, and React admin screens to manage sales leads, marketing visits, follow-up scheduling, quotations, costings, and order confirmations. Having migrated the database schema, this change implements the full vertical slice (Domain, Services, Server Actions, and UI Views) for the B2B pipeline.

## What Changes

1. **New Domain Package**: Initializes `@ims/corporate-sales` inside `packages/corporate-sales` containing the services, validations, and tests.
2. **Domain & Application Services**:
   - `CorporateSalesService`: Manages lead stages, logs visits, and schedules follow-ups.
   - `QuotationService`: Manages quotation costing sheets, margin validations, and manager approvals.
   - `SalesOrderService`: Confirms orders and publishes outbox handoffs.
3. **Next.js Server Actions**: Implements database mutation bindings under `apps/admin-portal/app/(protected)/corporate-sales/actions.ts`.
4. **Interactive UI Views**:
   - Lead Registration & Marketing Visit Logs modal.
   - Follow-up Scheduler calendar alerts.
   - Quotation Constructor & Profit Costing Sheet modal.
   - Manager Approvals Queue screen.
   - Sales Order LPO confirmation page.
5. **Unit & Integration Tests**: Validates business rules, margin calculation thresholds, lock states, and outbox logs.

## Capabilities

### New Capabilities
- `corporate-sales-service`: Application commands/queries, margin calculations, status checks, and unit tests.
- `corporate-sales-ui`: React admin screens, dashboard widgets, costing sheets dialogs, and server action bindings.

### Modified Capabilities
- `outbox-events`: Emits `SalesOrderConfirmed` event logs on order wins.

## Impact

- **Affected Folders**: `packages/corporate-sales`, `apps/admin-portal/app/(protected)/corporate-sales`
- **Dependencies**: Reuses `@ims/database` for persistence and `@ims/shared-kernel` for base error codes.
