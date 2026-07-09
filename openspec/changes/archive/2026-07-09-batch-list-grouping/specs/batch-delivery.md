## ADDED Requirements

### Requirement: Batch List Grouping by Operational Horizons
The system MUST partition the batch list view into four distinct tabs: Active, Past, Future, and All.
The batches list page `/batches` MUST NOT render the global status metrics cards block.

#### Scenario: Active Batches Filtering
- **WHEN** the Active tab is selected (or by default if no tab is selected)
- **THEN** the system MUST display batches where `startDate <= today + 3 days` and `endDate >= today - 3 days`.
- **AND** the system MUST default the status filter to `['OpenForEnrollment', 'InProgress']`.
- **AND** the system MUST allow toggling completed (`Completed`), cancelled (`Cancelled`), and draft (`Draft`) batches.

#### Scenario: Past Batches Filtering
- **WHEN** the Past tab is selected
- **THEN** the system MUST display batches where `endDate < today - 3 days`.
- **AND** the system MUST default the status filter to exclude `Cancelled` batches.
- **AND** the system MUST allow toggling the display of `Cancelled` batches.
- **AND** the system MUST support date range filtering (`dateFrom` and `dateTo`).

#### Scenario: Future Batches Filtering
- **WHEN** the Future tab is selected
- **THEN** the system MUST display batches where `startDate > today + 3 days`.
- **AND** the system MUST default the status filter to exclude `Cancelled` batches.
- **AND** the system MUST allow toggling the display of `Cancelled` batches.
- **AND** the system MUST support date range filtering (`dateFrom` and `dateTo`).

#### Scenario: All Batches Filtering
- **WHEN** the All tab is selected
- **THEN** the system MUST display all batches regardless of date boundaries.
- **AND** the system MUST default the status filter to exclude `Cancelled` batches.
- **AND** the system MUST allow toggling the display of `Cancelled` batches.
- **AND** the system MUST support date range filtering (`dateFrom` and `dateTo`).

### Requirement: Tab Badge Counts
The tab triggers MUST display counts of matching batches for each tab.

#### Scenario: Badge Count Computation
- **WHEN** the batch list is loaded or updated
- **THEN** the system MUST query the count of matching batches for all four groups in parallel on the server-side.
- **AND** these counts MUST respect the active search query (`q`), course filter (`courseId`), and branch filter (`branchId`).

### Requirement: Batches Operational Analytics Dashboard
The system MUST provide a dedicated batches dashboard route at `/dashboards/batches`.

#### Scenario: Dashboard KPI Cards
- **WHEN** a user visits `/dashboards/batches`
- **THEN** the system MUST query the count of batches matching the active branch scope:
  - Total Batches count.
  - Open for Enrollment count.
  - In Progress count.
  - Cancelled / Suspended count.
  - Draft count.

#### Scenario: Course Capacity Fill Rates Roster
- **WHEN** a user visits the batches dashboard
- **THEN** the system MUST display a list of courses with their active batch counts, aggregate capacity, and aggregate enrollment fill rate percentage.

#### Scenario: Upcoming Timelines
- **WHEN** a user visits the batches dashboard
- **THEN** the system MUST list the upcoming batches starting within the next 30 days (`startDate > today` and `startDate <= today + 30 days`), sorted by start date ascending.

#### Scenario: Branch Scope Access Control
- **WHEN** a branch manager views `/dashboards/batches`
- **THEN** the dashboard MUST only display analytics, fill rates, and timelines matching their assigned branch.
