## 1. Responsive Foundations

- [x] 1.1 Define the standard viewport tiers and density modes in the responsive UI spec.
- [x] 1.2 Add semantic spacing and typography tokens as **CSS Variables** in `packages/shared-ui/src/styles/globals.css`.
- [x] 1.3 Map the tokens to Tailwind utilities in `apps/admin-portal/tailwind.config.ts`.
- [x] 1.4 Ensure the token set is available to shared portal components and public site components.

## 2. Shared UI Primitives

- [x] 2.1 Refactor `PageHeader` to stack actions on smaller widths and use semantic title sizing.
- [x] 2.2 Refactor `Card`, `StatCard`, `FilterBar`, and `Table` to respect the new density modes.
- [x] 2.3 Review `Button`, `Input`, `Badge`, `Dialog`, and navigation primitives for spacing consistency and touch-target adequacy.

## 3. App Shell and Navigation

- [ ] 3.1 Refactor `AppShell` header spacing, branch badge behavior, search area behavior, and profile controls for tablet/mobile widths.
- [x] 3.2 Implement Shell Header height reduction (h-20 to h-16) on `Mobile` and `Tablet` tiers.
- [ ] 3.3 Verify the desktop sidebar, mobile drawer, and collapsed sidebar states remain usable across the defined viewport tiers.
- [ ] 3.4 Ensure the main content container does not create unnecessary whitespace on smaller screens.

## 4. Public Site Responsiveness

- [x] 4.1 Refactor the public hero, section heading, CTA, and card grid patterns to use `hero` density rules.
- [x] 4.2 Reduce oversized headings and section spacing on tablet/mobile widths while preserving visual presence on wide screens.
- [x] 4.3 Validate public navigation, footer layout, and content grids at the standard viewport set.

## 5. Admin Page Template Migration

- [x] 5.1 Define and implement `AdminListPageLayout`, `AdminFormPageLayout`, and `AdminDetailPageLayout` wrappers in `packages/shared-ui`.
- [x] 5.2 Audit the highest-traffic list pages and standardize filter/search/table behavior using the compact template.
- [x] 5.3 Audit detail pages and standardize sidebar/main-content stacking using the standard template.
- [ ] 5.4 Audit form pages and ensure field group spacing, panel widths, and action placement follow the standard template.
- [ ] 5.5 Remove page-local oversized spacing or typography that conflicts with the shared responsive rules.

## 6. Verification

- [ ] 6.1 Add or update UI tests for `375px`, `768px`, `1024px`, `1280px`, and `1536px` behavior on representative pages.
- [ ] 6.2 Verify there is no horizontal overflow on the main portal shell, lists, and public hero pages.
- [ ] 6.3 Verify titles, actions, and cards do not overlap or clip at mobile and tablet widths.
- [ ] 6.4 Run the affected portal lint, typecheck, build, and Playwright checks.
- [ ] 6.5 Update the implementation status note when the migration is complete.
