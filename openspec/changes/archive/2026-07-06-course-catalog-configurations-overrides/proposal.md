## Why

The Course Catalog and configuration override screens under ASTI IMS required comprehensive feature enhancements to collect proper inputs and display overrides cleanly:

1. **Forms for Data Collection**: The `/courses-catalog/new` and `/edit` forms needed structured inputs for public exposition, syllabus, and SEO details rather than basic mockups.
2. **Branch & Batch Override Cleanups**: Pricing and discount configurations displayed target branch overrides multiple times and included redundant batch select options.
3. **Configuration DataTables**: Fee structure overrides, discount segments, and graduation rules lists needed to support full-page density layout, sorting, pagination, and server-side filtering.
4. **Backend Deactivations & Audit Log**: Changing overrides status to inactive required secure API patch routing and immutable audit tracking.
5. **Next.js Page Crashes**: Next.js Image loader crashed on invalid absolute course URLs, and Lucide React Icons passed to Client Components from Server Components triggered React serialization type errors.

## What Changes

- Refactored `course-form.tsx` to support Zod-validated input controls for public course exposure, SEO titles, descriptions, and keywords.
- Replaced the target branch overrides dropdown with a searchable multi-select check-list to batch-insert overrides in one submit, removing batch override select fields.
- Replaced the static tables for Fees, Discounts, and Graduation Rules inside the Course Configuration panel with the responsive, paginated `ResponsiveDataTable` component.
- Implemented backend count/page query parameters and toggle status patch methods inside course configurations routing paths.
- Normalised course image URLs and converted React Icon component references to serializable key strings.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `course-catalog`: Course forms collect structured SEO parameters and expose category breadcrumbs dynamically. Graduation Completion Rules support paginated search tables.
- `course-pricing-discounts`: Pricing overrides and discount configurations support multi-select branch overrides, and their list blocks are upgraded to filterable paginated datatables.

## Impact

- **Owning bounded context**: Course Catalog Management.
- **Affected downstream/supporting contexts**: Finance & Receivables, Exam & Completion, Audit & Compliance, Website & Digital Experience.
- **Affected files**: `course-form.tsx`, `course-configs-panel.tsx`, course-catalog backend queries/services, configuration routes.
- **Database impact**: Applied Prisma schema migration adding SEO and exposition columns to the `Course` table.
- **UX impact**: Denser paginated layout, searchable branch overrides selection, and robust error handling against Next.js render crashes.
- **Testing impact**: Unit tests check public exposure query limits and category breadcrumb nesting.
