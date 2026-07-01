## Context

The CRM Module manages the full lifecycle of Leads and Enquiries from acquisition through to conversion (Admission). A critical component of managing this pipeline is having clear visibility into key performance indicators (KPIs) and operational metrics. Currently, there is no centralized dashboard providing these metrics, making it difficult for Counselors to track their progress and for Branch Managers/Administrators to oversee branch performance.

In accordance with our architecture guidelines, reporting and dashboards belong to a separate bounded context ("Reporting & Executive Dashboards") to prevent the core CRM domain services from becoming bloated with read-heavy aggregation queries. Furthermore, any dashboard view must strictly adhere to the dynamic RBAC and branch-scoping rules defined by the IMS platform.

## Goals / Non-Goals

**Goals:**
* Establish the `packages/reporting-dashboards` package to house read-only analytics queries.
* Ensure `crm-leads` provides a `LeadAnalyticsReadService` to decouple database queries from the reporting context.
* Ensure branch isolation and data-access isolation are dynamically enforced via `UserContext` permissions inside the CRM Read Model.
* Build a unified CRM Dashboard page in the Next.js Admin Portal utilizing dynamic `DashboardWidget` configurations.
* Introduce reusable charting and metric UI components in `packages/shared-ui`.
* Deliver six specific KPI metrics: Conversion Rate, Status Distribution, Leads by Source, Pipeline Stage View, Counselor Performance, and Total Leads vs Targets.

**Non-Goals:**
* No asynchronous KPI snapshotting via background workers in this phase; all aggregations will run in real-time.
* No changes to the underlying `crm-leads` application services or domain state mutations.
* Export capabilities (CSV/PDF) are out of scope for this specific dashboard initiative.
* Creating customizable/draggable dashboard layouts is out of scope; a fixed, permission-aware grid layout will be used.

## Decisions

1. **Context Separation via Read Models:** 
   We will expose a `LeadAnalyticsReadService` within `packages/crm-leads` that encapsulates branch-scoping and permission-based filters. The `CrmDashboardQueryService` in `packages/reporting-dashboards/src/queries/` will consume this read model contract, rather than directly querying the `Lead` Prisma model. This enforces data ownership boundaries.

2. **Unified Dashboard via React Server Components:**
   The `apps/admin-portal/app/(protected)/dashboards/crm/page.tsx` will be a Next.js Server Component. It will parse the session, construct the `UserContext`, and invoke the `CrmDashboardQueryService`. The service will return data alongside active `DashboardWidget` configurations, passing the resulting DTOs down to specialized UI widget components. This avoids the overhead of internal API route fetches and keeps data loading secure on the server.

3. **Dynamic Widget Rendering based on Scope:**
   The UI will dynamically render widgets based on the `DashboardWidget` configurations fetched for the user's role and permissions. The backend query service enforces the rules and emits `DashboardAccessed` audit events to `audit-compliance` when sensitive metrics are viewed, ensuring compliance with FRD Module 16.

4. **Shared UI Charting Strategy:**
   We will wrap an industry-standard charting library (e.g., Recharts or Chart.js) within our `packages/shared-ui`. This creates an abstraction layer (`ChartWidget`, `MetricCard`) that ensures consistent styling, theming (e.g., dark mode support), and accessibility (ARIA labels for chart summaries).

## Risks / Trade-offs

* **Performance of Real-Time Aggregation:** While real-time `groupBy` is fast for smaller datasets, as the IMS scales across multiple branches with hundreds of thousands of leads, these queries could become a bottleneck. We accept this trade-off for Phase 1 to reduce architectural complexity (no background jobs needed yet). We will mitigate this by ensuring `branchId`, `assignedCounselorId`, and `status` are properly indexed in the database schema.
* **Component Abstraction Overhead:** Building wrapper components for charting libraries in `shared-ui` takes more upfront effort than dropping charts directly into the portal page. However, this trade-off is necessary to maintain visual consistency as more dashboards (Finance, Training) are built in the future.
