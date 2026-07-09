## ADDED Requirements

### Requirement: Batch Delivery Navigation and Menu Scope
The Training Delivery/Batches menu items and list pages MUST be protected by the `batch.delivery.menu.view` permission code.

#### Scenario: Display Training Delivery in sidebar to authorized users
- **WHEN** the portal shell resolves navigation for a user
- **THEN** the system MUST display the "Training Delivery" menu and its items (including the list and dashboard link) only if the user has the `batch.delivery.menu.view` permission.

---

### Requirement: Batches Dashboard 60-Day Default Display
The Batches Dashboard MUST default to filtering batches where `startDate >= today - 60 days`.

#### Scenario: Load Batches Dashboard with default 60-day filter
- **WHEN** the user visits `/dashboards/batches` without explicit query parameters
- **THEN** the system MUST calculate the default start date boundary: `startDateLimit = today - 60 days`.
- **AND** the system MUST query and display batch operational metrics (total, open, in progress, draft, cancelled) and capacities starting from `startDateLimit` within the user's branch scope.

---

### Requirement: Batches Dashboard Advanced Filtering
The Batches Dashboard MUST provide a bottom floating action button (FAB) filter icon. Clicking it displays a dialog with filter parameters:
*   Start Date (`startDate`)
*   End Date (`endDate`)
*   Course (`courseId`)
*   Status (`status`)
*   Branch (`branchId`)
These values MUST synchronize with URL query parameters.

#### Scenario: Filter batches dashboard using FAB dialog
- **WHEN** the user clicks the bottom filter icon on the Batches Dashboard
- **THEN** the system MUST show the filter inputs modal.
- **WHEN** the user selects a course and date range, then clicks "Apply"
- **THEN** the system MUST route to the path with updated query parameters (e.g. `?courseId=X&startDate=2026-05-10`).
- **AND** the page MUST re-render with filtered counts and rosters.

---

### Requirement: Batches Dashboard Applied Filters Info Banner
The Batches Dashboard MUST render a summary of the currently applied filter criteria at the top of the page below the header.

#### Scenario: Render applied filters summary banner on batches dashboard
- **WHEN** the batches dashboard loads with query parameters in the URL
- **THEN** the system MUST display the applied filter summary text (e.g., "Date Range: 2026-05-10 to 2026-07-09 | Course: English Level 1") at the top of the page.
- **AND** the system MUST display a "Reset Filters" button.
