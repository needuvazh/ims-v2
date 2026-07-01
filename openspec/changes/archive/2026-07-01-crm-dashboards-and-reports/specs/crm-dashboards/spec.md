## ADDED Requirements

### Requirement: KPI Metrics Calculation
The Reporting & Executive Dashboards context MUST calculate and expose six specific KPI metrics for the CRM domain: Lead Conversion Rate, Lead Status Distribution, Leads by Source, Leads by Pipeline Stage, Counselor Performance (Leads converted per counselor), and Total Leads vs Targets. These calculations MUST be based on the current state of the database and MUST NOT mutate any data.

#### Scenario: Requesting Lead Status Distribution
- **WHEN** a valid, authenticated request is made to the `CrmDashboardQueryService` for status distribution
- **THEN** the service MUST query the `LeadAnalyticsReadService` in the CRM context to get a grouped count of leads categorized by their current `LeadStage` status, securely filtered by the requester's `branchId` and data permissions.

### Requirement: Permission-Aware Data Filtering
All read-only queries exposed by the `LeadAnalyticsReadService` MUST enforce dynamic data access rules. The system MUST evaluate the requester's explicit permissions (e.g., `LEAD_VIEW_ALL_IN_BRANCH`) and their active `branchId` injected via `UserContext`. The system MUST NOT rely on string-matching hardcoded role names (like "COUNSELOR" or "BRANCH_MANAGER").

#### Scenario: Counselor Requests Dashboard Data
- **WHEN** a user without the `LEAD_VIEW_ALL_IN_BRANCH` permission requests CRM Dashboard metrics
- **THEN** the query service MUST automatically apply a `where` clause restricting the aggregation to only those leads where `assignedCounselorId` matches the requester's `userId`.

#### Scenario: Branch Manager Requests Dashboard Data
- **WHEN** a user with the `LEAD_VIEW_ALL_IN_BRANCH` permission requests CRM Dashboard metrics
- **THEN** the query service MUST aggregate data across all leads associated with the requester's `branchId`, regardless of counselor assignment.

### Requirement: Dynamic UI Rendering
The Next.js Admin Portal MUST provide a unified CRM Dashboard page (`/dashboards/crm`). This page MUST dynamically render specific UI widgets (`MetricCard`, `ChartWidget`) based on `DashboardWidget` configurations corresponding to the permissions present in the active user's session.

#### Scenario: User Lacks Reporting Permissions
- **WHEN** a user attempts to access the CRM Dashboard without the `REPORTING_VIEW_CRM_DASHBOARD` permission
- **THEN** the system MUST prevent access and return an appropriate authorization error or redirect to an unauthorized page.

#### Scenario: Rendering Counselor Metrics
- **WHEN** the CRM Dashboard is loaded by a user lacking the `REPORTING_VIEW_COUNSELOR_METRICS` permission
- **THEN** the backend MUST omit the Counselor Performance widget configuration, and the UI MUST NOT render the widget or attempt to fetch data for it.

### Requirement: Audit Compliance
The Reporting context MUST log access to sensitive business metrics to comply with Module 16 FRD.

#### Scenario: Dashboard Accessed
- **WHEN** a user successfully views the CRM Dashboard
- **THEN** the `CrmDashboardQueryService` MUST emit a `DashboardAccessed` domain event to the audit context, capturing the user, branch, and dashboard viewed.
