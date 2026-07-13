# Task Checklist for B2B Corporate Lead Details UI Alignment

## Phase 1: Lead Details Page Wrapper & Header
- [x] 1.1 Refactor `apps/admin-portal/app/(protected)/corporate-sales/leads/[id]/page.tsx` wrapper to use `AdminDetailPageLayout`.
- [x] 1.2 Update the `PageHeader` inside `corporate-lead-details-client.tsx` to include `eyebrow="B2B Corporate Lead"`.
- [x] 1.3 Fix the action buttons inside `corporate-lead-details-client.tsx` using `LinkButton` instead of `<Link><Button>`.

## Phase 2: Tab Menu Restyling
- [x] 2.1 Refactor the `TabsList` and `TabsTrigger` components in `corporate-lead-details-client.tsx` to use the standard system aesthetics (`bg-[color:var(--ims-accent-soft)] p-1 rounded-2xl h-auto` and delete custom `indigo-600` styling overrides).
- [x] 2.2 Add Lucide icons to all `TabsTrigger` headers (Overview, Visits, Follow-Ups, Quotations).

## Phase 3: Tables Standardization
- [x] 3.1 Replace the raw HTML table structure under the "Marketing Visits" tab with standard shared UI components (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`).
- [x] 3.2 Replace the raw HTML table structure under the "Sales Follow-Ups" tab with standard shared UI components.
- [x] 3.3 Replace the raw HTML tables under the "Quotations & Orders" tab with standard shared UI components.
- [x] 3.4 Replace the action buttons inside all quotation tables with standard `LinkButton` components.

## Phase 4: Card & Text Style Alignment
- [x] 4.1 Remove raw tailwind shadows and borders from cards on the details page.
- [x] 4.2 Map all custom slate text and border classes to brand variables (`var(--ims-ink)`, `var(--ims-muted)`, `var(--ims-border)`).
- [x] 4.3 Inject entrance animations `animate-fade-in-up` to the detail components.

## Phase 5: Related Details Pages Alignment
- [x] 5.1 Refactor wrapper in `apps/admin-portal/app/(protected)/corporate-sales/quotations/[id]/page.tsx` to use `AdminDetailPageLayout`.
- [x] 5.2 Refactor wrapper in `apps/admin-portal/app/(protected)/corporate-sales/quotations/[id]/costing/page.tsx` to use `AdminDetailPageLayout`.
- [x] 5.3 Verify types and run compilation tests.
