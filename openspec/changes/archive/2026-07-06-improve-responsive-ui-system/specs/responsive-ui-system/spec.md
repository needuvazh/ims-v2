# responsive-ui-system Specification

## Purpose
Define the shared responsive layout, spacing, typography, and component behavior rules for the IMS admin portal and public site so the UI is responsive by default across common device widths.

## ADDED Requirements

### Requirement: Standard viewport tiers and density modes
The system SHALL classify responsive behavior using the following viewport tiers: Mobile (`320px–639px`), Tablet (`640px–1023px`), Laptop (`1024px–1439px`), and Wide Desktop (`1440px+`).
The system SHALL classify page presentation using the following density modes: `compact`, `standard`, and `hero`.

#### Scenario: Responsive rules are predictable
- **WHEN** a component or page is rendered
- **THEN** it SHALL choose layout, spacing, and typography behavior based on the current viewport tier and density mode

### Requirement: Shared spacing and typography tokens
The system SHALL provide shared responsive spacing and typography tokens for page containers, section spacing, card padding, page titles, section titles, card values, and hero titles.
The system SHALL prefer semantic token usage over page-local one-off Tailwind spacing and font-size values.

#### Scenario: Page title uses semantic sizing
- **WHEN** a page renders a standard title
- **THEN** the title SHALL use the shared page-title token and SHALL not rely on an oversized raw display class by default

### Requirement: Page Template Wrappers
The system SHALL provide reusable layout wrappers (`AdminListPageLayout`, `AdminFormPageLayout`, `AdminDetailPageLayout`, `PublicLandingLayout`) to ensure spacing consistency across the portal.
Page-specific spacing SHALL only be used for overrides, not for the primary layout shell.

#### Scenario: Admin List follows template
- **WHEN** an admin list page is rendered
- **THEN** it SHALL use `AdminListPageLayout` to ensure correct spacing of the header, filter bar, and data table.

### Requirement: Form & Detail Stacking
Form field grids SHALL default to `grid-cols-1` and SHALL NOT use multi-column layouts on viewports smaller than `Laptop` unless the fields are naturally paired.
Detail page sidebars SHALL stack below main content on `Mobile` and `Tablet` viewports.

#### Scenario: Form stacks on mobile
- **WHEN** a form with multiple fields is viewed on `Mobile`
- **THEN** the fields SHALL stack vertically in a single column.

### Requirement: Admin shell responsiveness
The admin shell SHALL remain usable on mobile, tablet, laptop, and wide desktop widths.
The admin shell SHALL keep the sidebar fixed on large screens, use a drawer on mobile, and reduce header density on smaller widths.
The admin shell header SHALL reduce in height from `h-20` (5rem) to `h-16` (4rem) on viewports smaller than `Laptop`.

#### Scenario: Mobile shell remains usable
- **WHEN** the admin portal is opened at mobile width
- **THEN** the content SHALL remain readable without horizontal overflow
- **AND** the navigation SHALL be reachable through the mobile drawer

### Requirement: Shared component responsiveness
Shared UI primitives SHALL adapt to the active density mode and viewport tier.
`PageHeader`, `Card`, `StatCard`, `FilterBar`, and `Table` SHALL not assume a desktop-only layout.

#### Scenario: Header actions stack on small screens
- **WHEN** a page header has title, description, and actions at mobile width
- **THEN** the actions SHALL stack below the title area instead of forcing horizontal overflow

#### Scenario: Tables remain usable on mobile
- **WHEN** a table is rendered at mobile width
- **THEN** the table SHALL either support horizontal scrolling or render a mobile-friendly row presentation
- **AND** the table SHALL not overflow the page container

### Requirement: Public marketing pages use hero density safely
Public marketing pages SHALL be allowed to use larger display typography and section spacing than admin pages.
Hero density SHALL still cap typography and spacing so content remains readable on tablet and mobile widths.

#### Scenario: Hero scales down on mobile
- **WHEN** a public hero section is rendered at mobile width
- **THEN** the hero title SHALL scale down from its desktop size
- **AND** the call-to-action buttons SHALL stack when horizontal space is constrained

### Requirement: Responsive QA coverage
The system SHALL have responsive validation coverage for representative portal pages at `375px`, `768px`, `1024px`, `1280px`, and `1536px`.

#### Scenario: No horizontal overflow on key screens
- **WHEN** the responsive QA suite runs against the standard viewport set
- **THEN** the shell, representative list pages, representative form pages, and representative public pages SHALL not produce horizontal page overflow
