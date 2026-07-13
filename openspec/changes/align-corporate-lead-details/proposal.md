## Why

To establish visual consistency, accessibility, and uniform design compliance across the ASTI IMS B2B portal. 

Currently, the B2B Corporate Lead Details screen (`/corporate-sales/leads/[id]`) deviates significantly from the ASTI IMS design guidelines:
1. **Raw Container Wrapper**: Uses a custom manual `<div className="p-6 max-w-7xl mx-auto">` instead of the system-standard `<AdminDetailPageLayout className="pt-1 sm:pt-0">`.
2. **Missing PageHeader Eyebrow**: Lacks standard header structure (e.g., `eyebrow="B2B Corporate Lead"`).
3. **Link-Button Nesting**: Navigates using nested `<Link><Button>...</Button></Link>` structures instead of standard `@ims/shared-ui` `<LinkButton>` components, triggering hydration and linting errors.
4. **Non-Standard Tabs & Triggers**: Overrides the organic, brass/earthy theme styling of ASTI IMS with custom bottom-border tabs colored with raw tailwind `indigo-600`.
5. **No Visual Icons in Tab Triggers**: Displays flat text labels instead of semantic Lucide icons.
6. **Card Style Overrides**: Uses raw border and shadow utility overrides (`shadow-sm border`) and custom slate background headers (`bg-slate-50/50`), bypassing the default CSS variables like `var(--ims-border)`, `var(--ims-surface)`.
7. **Raw HTML Tables**: Renders data grids using raw custom `<table>` elements instead of the reusable shared UI table components (`Table`, `TableHeader`, etc.).
8. **Lack of Entrance Animations**: Renders static pages without the standard premium fade-in loading transitions used in other modules.

This alignment also applies to nearby B2B detail screens such as Quotation Details (`/corporate-sales/quotations/[id]`) and Quotation Costing Sheet (`/corporate-sales/quotations/[id]/costing`).

## What Changes

1. **Refactor Page Wrappers**: Wrap Lead Details, Quotation Details, and Costing Sheet pages in `AdminDetailPageLayout` with uniform `pt-1 sm:pt-0` classes.
2. **Implement standard LinkButtons**: Swap all nested `<Link><Button>` elements with clean, modern `<LinkButton>` elements.
3. **Standardize Card and Text Variables**: Remove ad-hoc slate border/shadow configurations on detail cards and map all text and bg elements to the ASTI design variables (`var(--ims-ink)`, `var(--ims-muted)`, `var(--ims-border)`).
4. **Unify Tab Layouts**: Remove custom `indigo-600` styling overrides, style Tab lists using `bg-[color:var(--ims-accent-soft)]`, and attach Lucide icons to all tab triggers.
5. **Implement Shared Table Components**: Replace all custom `<table>` elements with imports from `@ims/shared-ui` (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`).
6. **Inject Premium Motion Keyframes**: Add entrance animations (`animate-fade-in-up`) to details grids.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None.

## Impact

- **UI Pages & Components (MODIFY)**:
  - `apps/admin-portal/app/(protected)/corporate-sales/leads/[id]/page.tsx`
  - `apps/admin-portal/app/(protected)/corporate-sales/leads/[id]/_components/corporate-lead-details-client.tsx`
  - `apps/admin-portal/app/(protected)/corporate-sales/quotations/[id]/page.tsx`
  - `apps/admin-portal/app/(protected)/corporate-sales/quotations/[id]/_components/quotation-details-client.tsx`
  - `apps/admin-portal/app/(protected)/corporate-sales/quotations/[id]/costing/page.tsx`
