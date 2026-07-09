## Context

Currently, the batch list view `/batches` queries the database for all active (non-deleted) batches and displays them in a flat table with search, course, branch, and status filters. This view is implemented in:
*   `app/(protected)/batches/page.tsx` (Server Component: fetches database records and checks user permissions/branch access).
*   `_components/batches-client-list.tsx` (Client Component: renders the table, filters, and updates search params).

We need to:
1. Restructure the list view to group batches into Active, Past, Future, and All tabs based on `startDate` and `endDate` relative to today's date, with tab-specific filtering and persistent URL synchronization.
2. Remove the metric cards section from `/batches` to simplify the workspace and improve critical path paginated query performance.
3. Create a dedicated batches dashboard page at `/dashboards/batches/page.tsx` hosting aggregate KPI metrics, course capacity fill rates, and upcoming timelines.

## Goals / Non-Goals

**Goals:**
*   Implement tabbed grouping (Active, Past, Future, All) on the batches list page.
*   Remove the KPI metric cards section from `/batches`.
*   Create a new dedicated Batches Dashboard at `/dashboards/batches`.
*   Enforce branch-scoped access on both the list view and the dashboard view.
*   Display dynamic count badges for each tab on the list view.
*   Synchronize all search, course, and tab states to URL query parameters on the list view.

**Non-Goals:**
*   Changing database schemas or migrating data.
*   Modifying the creation or update workflow of batches.

## Decisions

### 1. Batches List Page KPI Removal
We will remove `kpis` calculations and prop passing from `/batches` route:
*   Remove 4 `prisma.batch.count` queries for kpis from `app/(protected)/batches/page.tsx`.
*   Remove `<StatCard>` sections from `batches-client-list.tsx`.

### 2. Batches Dashboard Architecture
We introduce the dedicated dashboard `/dashboards/batches/page.tsx` (Server Component) and `/dashboards/batches/_components/batches-dashboard-client.tsx` (Client Component).
*   **Security check**: Verify the user has view permission (e.g. `course.catalog.view` or `reporting.view`).
*   **Branch scope**: Resolve allowed branch IDs using `branchScopeResolver` and inject `branchId: { in: branchIds }` into all dashboard queries.

### 3. Dashboard Queries
To construct the dashboard data, we execute the following queries:
1.  **KPI Counts**:
    ```typescript
    const [totalCount, openCount, inProgressCount, cancelledCount, draftCount] = await Promise.all([
      prisma.batch.count({ where: { isDeleted: false, branchId: { in: branchIds } } }),
      prisma.batch.count({ where: { isDeleted: false, status: 'OpenForEnrollment', branchId: { in: branchIds } } }),
      prisma.batch.count({ where: { isDeleted: false, status: 'InProgress', branchId: { in: branchIds } } }),
      prisma.batch.count({ where: { isDeleted: false, status: 'Cancelled', branchId: { in: branchIds } } }),
      prisma.batch.count({ where: { isDeleted: false, status: 'Draft', branchId: { in: branchIds } } }),
    ]);
    ```
2.  **Roster & Capacity (Roster grouping)**:
    Fetch active batches with their courses and compute aggregations in JS to construct the capacity table:
    ```typescript
    const activeBatches = await prisma.batch.findMany({
      where: { isDeleted: false, status: { in: ['OpenForEnrollment', 'InProgress'] }, branchId: { in: branchIds } },
      include: { course: true },
    });
    ```
3.  **Upcoming Timeline (Next 30 Days)**:
    ```typescript
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const upcoming = await prisma.batch.findMany({
      where: {
        isDeleted: false,
        startDate: { gt: today, lte: thirtyDaysFromNow },
        branchId: { in: branchIds }
      },
      include: { course: { select: { nameEnglish: true } } },
      orderBy: { startDate: 'asc' },
      take: 5,
    });
    ```

## Risks / Trade-offs

*   **Risk**: Loading and calculating aggregates in memory for capacity fill rate.
    *   **Mitigation**: The query only loads active batches (`OpenForEnrollment` and `InProgress`). This is typically a small fraction (dozens or hundreds) of the total historical batch dataset, making memory aggregation extremely fast and lightweight.
