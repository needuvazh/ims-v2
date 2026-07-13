# Task Checklist for B2B Corporate Sales UI Alignment

## Phase 1: Create B2B Quotation Screen
- [x] Create the Quotation Create page route: `apps/admin-portal/app/(protected)/corporate-sales/quotations/create/page.tsx`
- [x] Implement the `CreateQuotationClientForm` component utilizing `@ims/shared-ui` form elements.
- [x] Integrate React Hook Form, zodResolver, and the B2B Zod schema with dynamic line items (courses, quantity, unit price).
- [x] Implement price calculations (subtotal, 5% VAT, totalAmount) dynamically.
- [x] Connect the submit handler to call server action `createQuotationAction`.

## Phase 2: Quotation Detail Screen
- [x] Create the page route: `apps/admin-portal/app/(protected)/corporate-sales/quotations/[id]/page.tsx`
- [x] Implement layout with standard `PageHeader` showing status badge, breadcrumbs, and details grid.
- [x] Build client B2B profile card and line items data table.
- [x] Implement right side telemetry block displaying costs, margins, and actions (link to costing, submit approval, convert to order).

## Phase 3: Sales Orders Alignments
- [x] Modify `apps/admin-portal/app/(protected)/corporate-sales/orders/page.tsx` to display full-width `ResponsiveDataTable`.
- [x] Move the order confirm form from `OrdersClient` to a slide-over modal dialog (`Dialog`).
- [x] Wire the modal's primary action to trigger `confirmOrderAction` server action.

## Phase 4: Approvals Queue UI Refactoring
- [x] Refactor `apps/admin-portal/app/(protected)/corporate-sales/approvals/page.tsx` into a structured list view table.
- [x] Update `ApprovalsList` to show detail logs in a slide-over drawer / modal.
- [x] Integrate override comments validation before triggering approvals or rejections.

## Phase 5: Routing & Handoff Wiring
- [x] Update the B2B Lead details page "Generate Quotation" button to route to `/corporate-sales/quotations/create?leadId={leadId}&branchId={branchId}`.
- [x] Verify that all redirects, Toast messages, and cache revalidations work seamlessly.
