## Why

To establish a production-quality, cohesive user experience for B2B Corporate Sales & Quotation (Module 15), we need to fill crucial screen gaps and align all module layouts with the ASTI IMS design system.

Currently:
1. **No Creation Flow for Quotations**: The B2B Lead Details page contains a "Generate Quotation" button linking to `/corporate-sales/quotations`, which is merely the list pipeline page. There is no UI page or form to actually input line items, choose courses, quantity, pricing, or dates to create a B2B quotation.
2. **No Quotation Details/View Page**: The Quotations pipeline lists quotations but only links to the costing editor. Users and managers cannot view details (line items, validity, B2B account profiles) in a standard view layout.
3. **Sales Order Confirm UI Alignment**: The confirm sales order flow is squashed into a two-column split layout alongside the sales orders list, breaking the standard single-entity page layouts and forms pattern of the portal. Furthermore, the LPO document reference uses hardcoded uuid strings instead of standard input/upload capabilities.
4. **Approvals Queue Cards Layout**: The B2B manager approvals page lists items as raw cards with actions, whereas all other lists and queues in the portal use unified data tables (`ResponsiveDataTable`) with slide-over panels (Drawers) for detailed inspection and remarks.

## What Changes

1. **New Screen: Create B2B Quotation Form** (`/corporate-sales/quotations/create`):
   - Form utilizing `AdminFormPageLayout` and React Hook Form + Zod.
   - Prefills corporate lead & account data when `leadId` parameter is supplied.
   - Dynamic line items editor supporting course selector (published courses), quantity inputs, and custom unit pricing.
   - Live telemetry calculation for Subtotal, VAT (5%), and Total Amount.
2. **New Screen: Quotation Details** (`/corporate-sales/quotations/[id]`):
   - Clean, professional proposal summary utilizing standard `PageHeader`, `Breadcrumbs`, and status badge.
   - Lists client account, dates, and dynamic line items table.
   - Sidebar containing Margin Telemetry, cost summary, and action panel (Configure Costing, Submit for Approval, Reject/Approve, or Convert to Sales Order).
3. **Refine Screen: B2B Sales Orders** (`/corporate-sales/orders`):
   - Refactor split screen layout to a standard list using `AdminListPageLayout` and `ResponsiveDataTable`.
   - Relocate the "Confirm Won Order" form into a modal dialog (`Dialog`) triggered by an action button, ensuring a focused checkout-style flow.
   - Implement reference text validation for client LPO document mapping.
4. **Refine Screen: Manager Approvals Queue** (`/corporate-sales/approvals`):
   - Replace raw card grid with standard table layout displaying quotation number, client name, gross selling price, direct costs, and profit margin telemetry.
   - Implement a Slide-over panel (Drawer or focused Dialog) to review costing sheets, profit percentages, add override remarks, and trigger approval/rejection.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `corporate-sales-costing`: Ensures costing sheet updates recalculate profit margins and route low-margin proposals (< 25.00%) correctly through approvals.
- `corporate-sales-confirmations`: Confirms won orders with verified LPO details.

## Impact

- **UI Pages (NEW)**:
  - `apps/admin-portal/app/(protected)/corporate-sales/quotations/create/page.tsx`
  - `apps/admin-portal/app/(protected)/corporate-sales/quotations/[id]/page.tsx`
- **UI Pages & Components (MODIFY)**:
  - `apps/admin-portal/app/(protected)/corporate-sales/orders/page.tsx`
  - `apps/admin-portal/app/(protected)/corporate-sales/orders/_components/orders-client.tsx`
  - `apps/admin-portal/app/(protected)/corporate-sales/approvals/page.tsx`
  - `apps/admin-portal/app/(protected)/corporate-sales/approvals/_components/approvals-list.tsx`
  - `apps/admin-portal/app/(protected)/corporate-sales/leads/[id]/_components/corporate-lead-details-client.tsx`
  - `apps/admin-portal/app/(protected)/corporate-sales/quotations/page.tsx`
