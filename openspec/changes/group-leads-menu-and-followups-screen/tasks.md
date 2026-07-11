## 1. Backend Bounded Context Query Implementation

- [x] 1.1 Add `getFollowUpCounts` method in `LeadAnalyticsReadService` to return counts for today, overdue, and future followups.
- [x] 1.2 Add `findGroupedFollowUps` method in `FollowUpApplicationService` to perform paginated queries on `LeadFollowUp` records.
- [x] 1.3 Add `getCounselorDashboardData` method in `CrmDashboardQueryService` to fetch counselor-scoped metrics, pipeline stages, and lead source distribution.
- [x] 1.4 Add unit/integration tests in packages (`packages/crm-leads` and `packages/reporting-dashboards`) to verify the new query functions work under counselor isolation and branch scoping constraints.

## 2. API Endpoints Implementation

- [x] 2.1 Create GET `/api/v1/crm/leads/follow-ups/today` with pagination query validation, branch scoping, counselor isolation, and date limits.
- [x] 2.2 Create GET `/api/v1/crm/leads/follow-ups/future` with pagination query validation, branch scoping, counselor isolation, and date limits.
- [x] 2.3 Create GET `/api/v1/crm/leads/follow-ups/past` with pagination query validation, branch scoping, counselor isolation, and date limits.
- [x] 2.4 Add API integration tests verifying response structures, error handling (e.g. invalid query params, unauthorized branches), and scoping logic.

## 3. Sidebar & Menu Restructuring

- [x] 3.1 Modify `packages/identity-access/src/domain/access.ts` to restructure the CRM navigation to group CRM Dashboard, Leads List, Follow-ups, and Counselor Dashboard under a parent "Lead Management" item.
- [x] 3.2 Modify `apps/admin-portal/app/(protected)/layout.tsx` to add icon mappings for the new follow-up and counselor dashboard sub-routes.

## 4. Follow-up Screen Frontend UI

- [x] 4.1 Create `apps/admin-portal/app/(protected)/leads/follow-ups/page.tsx` as the entry page rendering the client container.
- [x] 4.2 Create client component `apps/admin-portal/app/(protected)/leads/follow-ups/_components/follow-ups-client.tsx` to manage tab selection state (Today/Future/Past), fetch state via React hooks, and handle pagination.
- [x] 4.3 Implement follow-up card grid component that displays lead detail details (Lead Number, Name, phone, course) and provides options to view the lead details or trigger `LogFollowUpModal`.

## 5. Counselor Dashboard Frontend UI

- [x] 5.1 Create `apps/admin-portal/app/(protected)/leads/counselor-dashboard/page.tsx` fetching metrics server-side.
- [x] 5.2 Render `MetricCard` items displaying Today's Follow-ups, Overdue, Active Leads, and Conversion Rate.
- [x] 5.3 Render `ChartWidget` containers with `LeadsByStageChart` and `LeadsBySourceChart`.
- [x] 5.4 Render a quick sidebar lists panel for today's followups with one-click actions.

## 6. Verification & Build Checks

- [x] 6.1 Run static analysis: typecheck and lint the entire monorepo (`pnpm typecheck` / `pnpm lint`).
- [x] 6.2 Run all unit and integration tests (`pnpm test` / `pnpm vitest`).
- [x] 6.3 Manually verify route access controls (ensure a counselor cannot access other counselors' followups without global permissions).
