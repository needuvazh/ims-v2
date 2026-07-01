## 1. Project Initialization & Tooling

- [x] 1.1 Scaffold the `packages/reporting-dashboards` package within the monorepo structure, ensuring its package.json and tsconfig.json align with standard internal monorepo conventions.
- [x] 1.2 Setup initial RBAC seed data in `packages/identity-access` for the new reporting permissions (`REPORTING_VIEW_CRM_DASHBOARD`, `REPORTING_VIEW_COUNSELOR_METRICS`, etc.).

## 2. Shared UI Components

- [x] 2.1 Implement the `MetricCard` React component in `packages/shared-ui` supporting primary values, optional trend indicators, and iconography.
- [x] 2.2 Select and integrate a charting library (e.g., Recharts) into `packages/shared-ui`.
- [x] 2.3 Implement the `ChartWidget` wrapper component in `packages/shared-ui` to provide standardized theming, responsive sizing, and accessibility properties (ARIA labels).

## 3. Query Services (Reporting Context)

- [x] 3.1 Implement `LeadAnalyticsReadService` in `packages/crm-leads` to expose safely scoped read models (using Prisma `groupBy`/`count`) that enforce branch and permission constraints.
- [x] 3.2 Implement `CrmDashboardQueryService` in `reporting-dashboards` to consume the read model and map it to `DashboardWidget` definitions.
- [x] 3.3 Implement `getLeadStatusDistribution` and `getLeadConversionRate` read queries.
- [x] 3.4 Implement `getLeadsBySource` and `getLeadsByStage` read queries.
- [x] 3.5 Implement `getCounselorPerformance` and `getTotalLeadsVsTargets` read queries.
- [x] 3.6 Integrate `DashboardAccessed` and `ReportExecuted` audit event emission into the `reporting-dashboards` services.
- [x] 3.7 Add comprehensive unit tests verifying that `LeadAnalyticsReadService` correctly applies branch scoping and `CrmDashboardQueryService` respects widget configurations.


## 4. UI Implementation (Admin Portal)

- [x] 4.1 Create the CRM Dashboard Server Component at `apps/admin-portal/app/(protected)/dashboards/crm/page.tsx`.
- [x] 4.2 Parse session data within the Server Component to construct the `UserContext`.
- [x] 4.3 Add dynamic rendering logic inside the Server Component to display specific metric cards and charts driven by `DashboardWidget` configurations from the reporting service.
- [x] 4.4 Wire up the Server Component to concurrently fetch data from the `CrmDashboardQueryService` methods and pass DTOs to the `shared-ui` components.
- [x] 4.5 Add a global unauthorized/fallback view for users entirely lacking CRM Dashboard permissions.

## 5. Testing & Verification

- [x] 5.1 Write an integration test ensuring the CRM Dashboard Server Component securely fetches data against a test database.
- [x] 5.2 Write a Playwright UI test for a user with limited 'Counselor' permissions, verifying they cannot see branch-level widgets.
- [x] 5.3 Write a Playwright UI test for a user with 'Branch Manager' permissions, verifying they see all relevant widgets and aggregated data.
- [x] 5.4 Run full monorepo typecheck, lint, and tests (e.g., `pnpm run verify`).
- [x] 5.5 Update `docs/project-status.md` to reflect completion of CRM Dashboards under the Lead & Enquiry Management module capabilities.
