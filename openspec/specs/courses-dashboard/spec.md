# courses-dashboard Specification

## Purpose

Specifies Courses Operational Dashboard analytics, KPI card metrics, and advanced FAB filter attributes.

## Requirements

### Requirement: Courses Operational Dashboard
The system MUST provide a dedicated Courses Operational Dashboard route at `/dashboards/courses` to host course catalog analytics, distributions, and recent modifications.

#### Scenario: Courses Dashboard Main Page Load
- **WHEN** a user visits `/dashboards/courses`
- **THEN** the system MUST verify the user has the `course.catalog.dashboard.view` permission.
- **AND** the system MUST display the courses dashboard layout, including the title, description, breadcrumbs, and metrics cards.

---

### Requirement: Courses Dashboard Analytics & KPIs
The dashboard MUST fetch and display aggregate KPI count metrics based on the active date range, category, department, and other catalog filters, restricted to the user's active branch scope.
The metrics include:
*   Total Courses (total count of active courses)
*   Published (status is `Published`)
*   Drafts (status is `Draft`)
*   In Review (status is `InReview` or `Approved`)
*   Archived (status is `Archived` / logically deleted)

#### Scenario: Display Course Counts Scoped by Default
- **WHEN** a user loads `/dashboards/courses` without search parameters
- **THEN** the system MUST calculate the default effective date boundary: `effectiveStartDate <= today` and (`effectiveEndDate === null` or `effectiveEndDate >= today - 60 days`).
- **AND** the system MUST return count metrics for courses matching this default date constraint and the user's authorized branch scope.

---

### Requirement: Courses Dashboard Advanced Filtering & FAB
The dashboard MUST provide a floating action button (FAB) at the bottom of the screen to open the filters sheet. The user can filter the dashboard by:
*   Effective Date Range (`startDate`, `endDate`)
*   Category (`categoryId`)
*   Department (`departmentId`)
*   Public Exposure (`isPubliclyExposed`)
*   Course Classification (`courseClassification`)
*   Has Active Pricing (`hasPricing`)
*   Has Active Discount (`hasDiscount`)
*   Has Active Certificate Completion Rules (`hasCertificateRules`)

#### Scenario: Toggle bottom filter sheet and apply filters
- **WHEN** the user clicks the floating filter icon in the bottom right corner
- **THEN** the system MUST display the filter dialog/modal with input controls for the course catalog attributes.
- **WHEN** the user selects a category and department, then clicks "Apply"
- **THEN** the system MUST trigger a router transition updating the URL query parameters (e.g. `?categoryId=X&departmentId=Y`).
- **AND** the server MUST re-query and update the dashboard statistics.

---

### Requirement: Dashboard Header Filter Information
The system MUST render a clear, user-friendly summary of the currently applied filter criteria at the top of the dashboard page.

#### Scenario: Render applied filters summary banner
- **WHEN** the dashboard page loads with search filters in the URL
- **THEN** the system MUST display the applied filter info text (e.g., "Effective Range: 2026-05-10 to 2026-07-09 | Department: English Training") below the page header.
- **AND** the system MUST show a "Reset Filters" action next to it.
