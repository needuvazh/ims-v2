## Context

The Institute Management System (IMS) CRM module needs to be more organized and actionable for counselors:
1. Menus are currently flat and clutter the sidebar.
2. Counselors need to prioritize scheduled touchpoints but lack a consolidated follow-up view.
3. Counselors lack a personalized workspace displaying their own conversion rates and active leads.

## Goals / Non-Goals

**Goals:**
*   Group CRM menus under a nested parent list: Lead Management.
*   Implement a dedicated `/leads/follow-ups` screen displaying cards grouped by Today, Future, and Past follow-ups.
*   Create 3 specialized, paginated GET APIs for Today, Future, and Past follow-ups.
*   Implement a dedicated `/leads/counselor-dashboard` displaying personal sales pipelines, targets, and active follow-up tasks.
*   Enforce branch scoping and counselor isolation on all new screens and APIs.

**Non-Goals:**
*   Creating a new database table or changing the database schema.
*   Adding email/SMS auto-notifications for scheduled follow-ups.
*   Modifying the main CRM dashboard for administrators.

## Decisions

### 1. Separate Endpoints for Follow-up Categories
We will build three separate GET endpoints under `apps/admin-portal/app/api/v1/crm/leads/follow-ups/`:
*   `today/route.ts`
*   `future/route.ts`
*   `past/route.ts`

These endpoints will use a shared query method in `FollowUpApplicationService` called `findGroupedFollowUps(...)`. Using separate APIs ensures that:
*   Only the active tab's data is loaded, reducing the response payload.
*   Different sorting and limits can be applied to each category (e.g., past follow-ups sorted descending, future sorted ascending).

### 2. Timezone-Aware Day Boundaries
When calculating "Today" for follow-ups, date ranges will be computed relative to the server's calendar day in the local timezone (using 00:00:00 to 23:59:59 boundaries).
*   `todayStart` = `new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)`
*   `todayEnd` = `new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)`

### 3. Server-Side Data Fetching for Counselor Dashboard
The Counselor Dashboard (`/leads/counselor-dashboard`) will be a Next.js Server Component that fetches data directly using the `CrmDashboardQueryService` and `effectivePermissionsService` from the server runtime. It will not require new client-side `fetch` calls, which keeps the delivery layer thin and responsive.

### 4. Reusing Visual Assets and Components
We will reuse the following from the existing design system in `@ims/shared-ui`:
*   `MetricCard` and `ChartWidget` for dashboard layout.
*   `LeadsByStageChart` and `LeadsBySourceChart` for Recharts graph visualization.
*   `LogFollowUpModal` from `/leads/[id]/_components/` for recording follow-up outcomes.

## Risks / Trade-offs

### Timezone Shifts
*   **Risk**: If the server timezone is UTC but the counselor works in Asia/Muscat or Asia/Riyadh, follow-ups scheduled early in the morning or late at night might fall into the wrong category.
*   **Mitigation**: For ASTI IMS Phase 1, server times and date calculation will default to local Gulf standard time (GST), aligning with the local time of the single client. In a future multi-tenant SaaS iteration, timezone offsets will be sent as headers.

### Query Performance on Leads Relation Joins
*   **Risk**: Grouped follow-up queries require nested joins to search the parent Lead's branch and counselor assignment.
*   **Mitigation**: The underlying `lead_follow_ups` table has indexes on `leadId`, `counselorId`, and `status`, which keeps filters fast even with nested joins.
