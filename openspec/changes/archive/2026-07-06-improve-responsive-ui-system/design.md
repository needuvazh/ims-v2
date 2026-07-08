## Context

The current portal UI is composed from shared primitives, app shells, and page-local Tailwind classes. That approach works for isolated screens, but the repo has accumulated a lot of fixed spacing and desktop-sized typography that behaves poorly on smaller widths.

Examples of the current pattern include large fixed hero headings, tall sticky headers, aggressive section padding, and tables that rely on page-level scrolling behavior. The result is inconsistent density and avoidable layout waste across the portal.

This change introduces a small responsive design system that the existing components can consume without changing business logic or navigation structure.

## Goals / Non-Goals

**Goals:**

- Make shared UI responsive by default across mobile, tablet, laptop, and wide desktop widths.
- Replace ad hoc spacing and typography choices with shared tokens and semantic classes.
- Keep the admin shell, page headers, cards, tables, filters, and public hero sections visually consistent.
- Preserve existing portal structure, routing, and server-side behavior.
- Add measurable acceptance criteria for responsive QA.

**Non-Goals:**

- No backend/domain changes.
- No new design system package or third-party UI framework.
- No redesign of brand identity or content strategy.
- No microfrontend, SPA rewrite, or alternate rendering stack.

## Responsive Rules

### Breakpoints

- Mobile: `320px–639px`
- Tablet: `640px–1023px`
- Laptop: `1024px–1439px`
- Wide desktop: `1440px+`

### Density Modes

- `compact`: dashboard, list, and table-heavy admin screens.
- `standard`: forms, detail pages, settings, and account screens.
- `hero`: public marketing pages and public landing sections.

### Spacing Rules

- Page container: `px-4 sm:px-6 lg:px-8`
- Admin section spacing: `space-y-4 sm:space-y-5 lg:space-y-6`
- Standard card padding: `p-4 sm:p-5 lg:p-6`
- Public section padding: `py-10 sm:py-14 lg:py-20`
- Public hero spacing may exceed standard section spacing, but only within `hero` density mode.
- Fixed large paddings such as `px-8`, `py-20`, and `py-28` are allowed only in `hero` sections or when explicitly justified.

### Typography Rules

- Use semantic typography tokens for page titles, section titles, card values, and hero titles.
- Prefer fluid sizing through `clamp()`-based utilities or equivalent tokenized classes.
- Raw `text-5xl`, `text-6xl`, and `text-7xl` must not be used for normal admin page headings.
- Large display text is allowed only in `hero` density mode.

### Page Templates

Standardize layouts into the following reusable wrappers in `packages/shared-ui`:

- `AdminListPageLayout`: `PageHeader` > `FilterBar` > `Card(Table)` or `List`.
- `AdminFormPageLayout`: `PageHeader` > Single or Multi-column Form Grid.
- `AdminDetailPageLayout`: `PageHeader` > Main Content Section + Optional Related Sidebar.
- `PublicLandingLayout`: `PublicShell` > `HeroSection` > `SectionHeading` > `ContentGrid` > `CTA`.

### Form & Detail Stacking Rules

- Form field groups SHALL default to `grid-cols-1`.
- Use `sm:grid-cols-2` or `lg:grid-cols-3` only for naturally paired fields (e.g., First Name / Last Name).
- Detail sidebars SHALL stack below main content on `Mobile` and `Tablet` viewports, and sit side-by-side on `Laptop+`.

### Shell Rules

- Desktop sidebar remains fixed on large screens.
- Mobile navigation remains drawer-based.
- Header height SHALL reduce from `h-20` (desktop) to `h-16` (tablet/mobile).
- Shell controls must collapse earlier on tablet widths if horizontal pressure appears.

### Table Rules

- Desktop: normal table layout.
- Tablet: horizontal scrolling is acceptable.
- Mobile: either horizontal scroll or card-style row presentation must be used.
- Tables must not create whole-page horizontal overflow.

## Decisions

1. Use semantic responsive tokens instead of page-local one-off Tailwind sizing.
   - Rationale: this makes responsiveness consistent and reviewable. Tokens will be defined as **CSS Variables** in `packages/shared-ui/src/styles/globals.css` and mapped to Tailwind utilities in `apps/admin-portal/tailwind.config.ts`.
   - Alternatives considered: keep page-level Tailwind only. Rejected because it continues layout drift.

2. Treat `packages/shared-ui` as the enforcement point for density and spacing defaults.
   - Rationale: most portal screens already compose from shared primitives. This includes creating the **Page Template** wrappers in this package.
   - Alternatives considered: fix each page independently. Rejected because it scales poorly.

3. Keep public marketing pages visually larger than admin pages, but cap typography and spacing on smaller widths.
   - Rationale: public pages need more presence, but they must still adapt on mobile and tablet.

4. Validate responsive behavior through fixed viewport checks and not just visual inspection on a desktop monitor.
   - Rationale: the current complaints are width-specific and must be reproducible.

## Risks / Trade-offs

- [Risk] The change can become a broad visual rewrite if scope is not constrained. → Mitigation: migrate shared primitives first, then page templates, then page-level cleanup.
- [Risk] Some public hero sections may look visually smaller on very large screens after tokenization. → Mitigation: allow `hero` density to retain larger upper bounds.
- [Risk] Existing pages may depend on current spacing as an implicit layout contract. → Mitigation: migrate by template and validate the highest-traffic pages first.
- [Risk] Table-heavy screens may need page-specific treatment to remain usable on mobile. → Mitigation: define the mobile behavior per list screen family instead of forcing a single pattern.

## Migration Plan

1. Define the responsive token set and page density rules.
2. Update shared UI primitives and shell components to consume the new tokens.
3. Update the public site shell and hero sections.
4. Update admin list, detail, and form page templates to use the shared density modes.
5. Audit the highest-traffic portal pages for overflow, spacing, and typography regressions.
6. Add responsive QA checks for the standard viewport set.

Rollback/mitigation:

- Revert shared token and primitive changes if they cause broad regressions.
- Because the change is presentation-only, rollback does not require database or backend mitigation.
