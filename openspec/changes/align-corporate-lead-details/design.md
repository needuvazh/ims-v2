## Context

The B2B Corporate Sales module has details screens (leads details, quotation details, costing sheet) that were built with manual styling overrides and standard HTML elements, causing a mismatch with the overall ASTI IMS portal visual language (e.g., using default blue indigo accents instead of brass, raw tables instead of custom shared UI tables, and lacking entry transition animations).

## Goals / Non-Goals

**Goals:**
- Wrap B2B Lead Details, Quotation Details, and Quotation Costing pages in `AdminDetailPageLayout` with `pt-1 sm:pt-0`.
- Standardize PageHeader configuration with suitable `eyebrow` text and aligned breadcrumb hierarchies.
- Replace nested `<Link><Button>` elements with standard `<LinkButton>` elements from `@ims/shared-ui`.
- Remove custom indigo active-state tab overrides and use default `@ims/shared-ui` `TabsTrigger` states. Prepend Lucide icons to all tab triggers.
- Convert raw table structures to shared UI `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableHead>`, and `<TableCell>` components to inherit standard border borders, hover scales (`hover:scale-[1.002]`), and typography.
- Standardize detail cards text-colors and border borders using brand tokens (`var(--ims-ink)`, `var(--ims-muted)`, `var(--ims-border)`).
- Apply micro-interaction entrance animations (`animate-fade-in-up`) to main content divisions.

**Non-Goals:**
- Changing business workflow rules or permissions checks inside actions/services.
- Customizing non-B2B leads detail layouts (Module CRM Leads).

## Decisions

### 1. Unified Page Layout Wrapper
We will replace:
```tsx
<div className="p-6 max-w-7xl mx-auto">
```
with:
```tsx
import { AdminDetailPageLayout } from "@ims/shared-ui";

return (
  <AdminDetailPageLayout className="pt-1 sm:pt-0">
    ...
  </AdminDetailPageLayout>
);
```
Files affected:
- `apps/admin-portal/app/(protected)/corporate-sales/leads/[id]/page.tsx`
- `apps/admin-portal/app/(protected)/corporate-sales/quotations/[id]/page.tsx`
- `apps/admin-portal/app/(protected)/corporate-sales/quotations/[id]/costing/page.tsx`

### 2. Standardize Navigation Elements
Nestings like:
```tsx
<Link href={`/corporate-sales/quotations/create?leadId=${lead.id}`}>
  <Button variant="primary">Generate Quotation</Button>
</Link>
```
will be refactored to:
```tsx
import { LinkButton } from "@ims/shared-ui";

<LinkButton href={`/corporate-sales/quotations/create?leadId=${lead.id}`} variant="primary">
  Generate Quotation
</LinkButton>
```
Files affected:
- `apps/admin-portal/app/(protected)/corporate-sales/leads/[id]/_components/corporate-lead-details-client.tsx`
- `apps/admin-portal/app/(protected)/corporate-sales/quotations/[id]/_components/quotation-details-client.tsx`

### 3. Aligned Tabs & Lucide Icons
We will map tab menus to standard styles:
```tsx
<Tabs defaultValue="overview" className="w-full space-y-4">
  <TabsList className="w-full flex-wrap justify-start rounded-2xl bg-[color:var(--ims-accent-soft)] p-1 h-auto">
    <TabsTrigger value="overview" className="gap-2">
      <User className="h-4 w-4" />
      Overview & Account Details
    </TabsTrigger>
    ...
  </TabsList>
</Tabs>
```

### 4. Shared Table System
All custom tables will be converted to:
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Field</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Value</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### 5. Entrance Transitions
Add `animate-fade-in-up` to detail components to provide smooth visual telemetry loading.

## Risks / Trade-offs

None identified. This is a visual-only refactoring and clean-up operation that presents no operational risk to core system states or transaction validations.
