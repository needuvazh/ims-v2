## Why

Currently, the batch list view at `/batches` displays all batches in a single flat list along with global status KPI cards. As the number of training courses increases:
1. Administrators struggle to navigate through ongoing, completed, and upcoming batches.
2. The flat list view is overloaded with metrics cards that are only relevant for analytical purposes rather than list-based operations.
3. Loading these stats on every pagination page load runs redundant count queries.

There is an immediate need to:
*   Organize the batches view into logical operational horizons: Active, Past, Future, and All.
*   Remove the metric cards from the list view to improve performance and focus.
*   Create a dedicated Batches Dashboard for operational and capacity analytics.

## What Changes

1. **Batches List View Restructuring**:
   *   Restructure the batches list UI into a tabbed layout (Active, Past, Future, All) with persistent URL query parameter sync.
   *   Remove the top-level KPI status cards from `/batches` to simplify the workspace.
2. **Dedicated Batches Dashboard (`/dashboards/batches`)**:
   *   Create a new analytics dashboard dedicated to batches.
   *   Host aggregate metrics: Total Batches, Open, In Progress, Cancelled, and Draft counts.
   *   Display capacity analysis (roster fill rates by course) and a timeline of upcoming batches starting soon.
   *   Enforce branch scope (branch managers only see metrics for their assigned branches).

## Capabilities

### New Capabilities
- `batches-dashboard`: Introduce a dedicated operational analytics dashboard for batches including KPI cards, capacity roster fill rates, and upcoming startup pipelines.

### Modified Capabilities
- `batch-delivery`: Update the batch list retrieval and presentation requirements to support tabbed grouping (Active, Past, Future, All), tab-specific status defaults/toggles, date-range filtering, and the removal of the top-level list KPIs.

## Impact

* **Bounded Context**: Course, Batch & Training Delivery (owns Batch) and Reporting & Dashboards.
* **Delivery Tier**: Next.js route page and client components.
* **Security & Authorization**: Preservation of view permissions and branch scope checks (`course.catalog.view` and `reporting.view`).
* **Database & ORM**: No schema changes. Aggregation queries for dashboard metrics.
* **Performance / NFRs**: Removing 4 count queries from the batches list view speeds up retrieval times.
* **Test Impact**: Requires integration tests for both the batches page partitioning and the new batches dashboard page counts.
