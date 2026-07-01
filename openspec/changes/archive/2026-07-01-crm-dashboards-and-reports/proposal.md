## Why

The Institute Management System (IMS) requires a robust analytics and reporting capability to track the performance of the Lead & CRM Workflows module. Specifically, administrators and counselors need visibility into lead conversion rates, pipeline stages, status distributions, and team performance to drive business growth. 

According to our DDD architecture guidelines, while this data relates to the Lead Management context, the responsibility for aggregating data and presenting dashboards falls under the "Reporting & Executive Dashboards" bounded context. We need to establish this boundary early to prevent cross-context coupling in the `crm-leads` application services and to provide a scalable foundation for all future reporting requirements across the institute.

## What Changes

1. **New Bounded Context Package**: Introduce the `packages/reporting-dashboards` package to house read-only query services and aggregations, completely decoupled from the mutation-heavy application services in `crm-leads`.
2. **Dynamic UI Dashboards**: Build a unified CRM Dashboard in the Next.js Admin Portal driven by `DashboardWidget` configurations to ensure role and permission-aware widget rendering as per FRD Module 16.
3. **Branch & Permission Aware Read Models**: Introduce a `LeadAnalyticsReadService` within the `packages/crm-leads` public API to encapsulate branch-scoping and domain-specific data filtering. The `reporting-dashboards` package will consume this read model instead of directly querying the `Lead` tables.
4. **Shared UI Reporting Components**: Introduce standardized `MetricCard` and `ChartWidget` components in the `shared-ui` package to maintain visual consistency across all future IMS dashboards.
5. **Audit Tracking**: Emit `DashboardAccessed` and `ReportExecuted` audit events from the reporting service to track sensitive data views in compliance with FRD requirements.

## Capabilities

### New Capabilities
- `crm-dashboards`: Provides real-time analytical views and aggregated key performance indicators for the Lead and Enquiry CRM workflows, dynamically scoped to the user's branch and explicit data access permissions.

### Modified Capabilities
- (None - This represents a net-new reporting capability for the CRM module.)

## Impact

- **Architecture Boundary**: Establishes the `reporting-dashboards` package, setting the precedent that read-heavy aggregations belong in a dedicated context. Properly utilizes Read Models exposed by `crm-leads` rather than crossing database boundaries.
- **Database**: No immediate schema migrations are required for the Lead table, but `DashboardWidget` and `ReportDefinition` configurations will be added. Indexing strategies on `Lead.branchId`, `Lead.assignedCounselorId`, and `Lead.status` will be reviewed.
- **Authorization & Audit**: Fully leverages the existing dynamic RBAC system. New permissions will be mapped to roles, and `DashboardAccessed` audit events will track data visibility.
- **UI System**: Extends `packages/shared-ui` with generic charting and metric components.
- **Performance**: Real-time aggregation is suitable for Phase 1 data volumes. If historical point-in-time metrics are required later, a KPI snapshot job will be introduced, but it is explicitly excluded from this initial iteration.
