## Why

The admin portal and public site are visually inconsistent across mobile, tablet, laptop, and wide desktop widths. The current UI uses a mix of fixed desktop-first spacing, oversized typography, and page-specific layout decisions that create unnecessary whitespace, clipped headers, awkward wrapping, and table overflow risk on smaller screens.

The problem is systemic rather than page-specific: shared UI primitives, app shell chrome, and public marketing sections all need a common responsive baseline so new pages are responsive by default instead of being hand-tuned case by case.

## What Changes

- Define a shared responsive UI system for the admin portal and public site.
- Introduce formal viewport tiers, density modes, spacing rules, and semantic typography tokens.
- Refactor shared UI primitives and shells so responsive behavior is consistent by default.
- Standardize page templates for admin lists, forms, detail pages, dashboards, and public marketing pages.
- Add explicit validation criteria for 375px, 768px, 1024px, 1280px, and 1536px viewports.

## Capabilities

### New Capabilities

- `responsive-ui-system`: Shared responsive layout, spacing, typography, and component behavior rules for the IMS admin portal and public site.

### Modified Capabilities

- `iam-admin-portal-ui`: The admin shell, headers, tables, and dashboard screens must follow the new responsive rules.
- `admission-enrollment-ui-gaps`: Existing admission and enrollment screens must adopt the shared responsive patterns once migrated.
- `shared-ui`: Shared components become responsive-by-default primitives rather than desktop-first building blocks.

## Impact

- Owning bounded context: Shared UI / Portal presentation layer.
- Affected downstream/supporting contexts: Identity & Access, Admission & Enrollment, Course & Batch, Lead & Inquiry, Organization, and all other portal-facing screens that use `@ims/shared-ui`.
- Affected apps/packages: `apps/admin-portal`, `packages/shared-ui`.
- Affected routes: all protected admin routes and public marketing/content routes that render portal shell or shared page patterns.
- Authorization impact: none to business authorization logic; this change only affects presentation and layout.
- Data impact: no persistence changes.
- UX impact: lower wasted whitespace, better readability, fewer horizontal overflow issues, and more consistent layout density across screen sizes.
- Testing impact: adds responsive UI coverage at fixed viewport widths and regression checks for shared component behavior.
