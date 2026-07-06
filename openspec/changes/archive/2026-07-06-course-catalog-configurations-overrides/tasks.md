## 1. Database & Domain Logic

- [x] 1.1 Add new columns (`isPubliclyExposed`, `bannerImage`, `metaTitle`, `metaDescription`, `metaKeywords`, `syllabusOutline`, `showPricingPublicly`, `hasPracticalInstruction`, `practicalTestingDescription`) to the Prisma database schema.
- [x] 1.2 Generate and apply the database schema migration using `run_migrate.py`.
- [x] 1.3 Update domain types, interfaces, schemas, and repository mapping logic in the course-catalog package.
- [x] 1.4 Expose new fields in `PublicCourseListItemSchema` and `PublicCourseDetailSchema` DTO validation schemas.

## 2. API Routing & Services

- [x] 2.1 Implement `disablePricing`, `disableDiscount`, and `disableCompletionRule` application services to set statuses to `Inactive` and write audit log records.
- [x] 2.2 Refactor configuration overrides GET endpoints to parse page, limit, status, branch, search query, and sorting query parameters.
- [x] 2.3 Implement PATCH endpoints handling status deactivation payloads.
- [x] 2.4 Update public query services to filter courses by `isPubliclyExposed: true`, resolve nested category hierarchies dynamically, and hide pricing information based on visibility flags.

## 3. Configuration Panel Datatables

- [x] 3.1 Refactor target branch overrides input selectors inside the Pricing and Discount forms to use the searchable checkbox `MultiSelect` popover component.
- [x] 3.2 Remove target batch overrides dropdown inputs from pricing and discount forms.
- [x] 3.3 Replace the static tables under the Fees, Discounts, and Graduation Completion Rules tabs in `course-configs-panel.tsx` with paginated `ResponsiveDataTable` wrappers.
- [x] 3.4 Bind datatable states (page, search, status filters, sort columns) to tab-specific search query parameters.
- [x] 3.5 Upgrade the Graduation Checks checkboxes selector list to use option lists styled as cards.
- [x] 3.6 Integrate "Disable Override" trigger actions inside details drawers and datatable rows.

## 4. UI Bug Fixes & Optimizations

- [x] 4.1 Normalize course images URLs inside the `RealTimeCourseCard` grid component to prevent Next.js image loader crashes.
- [x] 4.2 Map Lucide React components inside Server Components to string names before passing them to the client-side `HeroSection` container, eliminating serialization crashes.

## 5. Verification

- [x] 5.1 Run all package tests (`vitest run tests/course-catalog.spec.ts`) asserting that queries enforce exposition limits and build hierarchy breadcrumbs correctly.
- [x] 5.2 Validate successful typechecks throughout the workspace monorepo.
