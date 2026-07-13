## Why

To improve the efficiency and usability of the CRM module for counselors and administrators:
1. **Reduce sidebar clutter**: Currently, CRM menus (`CRM Dashboard`, `Leads`) are displayed as top-level links. Grouping them under a single `Lead Management` parent menu provides a cleaner, more organized navigation structure.
2. **Actionable Follow-up workflows**: Counselors need a dedicated view to manage follow-up activities without digging through individual lead details. Dividing follow-ups into `Today`, `Future`, and `Past` with individual, targeted API endpoints improves performance and responsiveness.
3. **Dedicated Counselor space**: A dedicated Counselor Dashboard lets counselors track personal metrics (My Active Leads, Conversions, Conversion Rate, Target progressions) and prioritize tasks (Follow-ups) in a single unified view.

## What Changes

1. **Restructured Sidebar Navigation**: Re-organize CRM menus under a parent `Lead Management` menu containing sub-menus for CRM Dashboard, Leads List, Follow-ups, and Counselor Dashboard.
2. **Follow-ups API & Screen**:
   - Create 3 separate API endpoints for Today, Future, and Past follow-ups to optimize data loading and prevent fetching excessive records in a single payload.
   - Build a card-based client-side interface at `/leads/follow-ups` featuring tabs to trigger specific fetches. Include options to view lead details and log follow-up outcomes.
3. **Counselor Dashboard**:
   - Develop `/leads/counselor-dashboard` page focusing on counselor-scoped KPIs, pipeline stage distribution chart, lead acquisition source distribution chart, and a quick-action panel for today's follow-ups.

## Capabilities

### New Capabilities
- `counselor-dashboard`: Introduces counselor-scoped analytics, metrics tracking (active leads, conversions, conversion rates, and targets), pipeline stage distributions, and a follow-up action list.
- `leads-followups-listing`: Provides a dedicated follow-up management interface featuring today, future, and past groupings, card views, direct outcome-logging modal trigger, and paginated target fetches.

### Modified Capabilities
- `crm-portal-ui-scoped-filtering`: Updates the navigation structure to support nested CRM menu items.

## Impact

- **Identity & Access**: `packages/identity-access` updated for menu item structure in `adminNavigation`.
- **CRM Leads package**: `packages/crm-leads` application services and read services updated to support grouped follow-ups query and counselor dashboard metrics.
- **Reporting Dashboards package**: `packages/reporting-dashboards` read/query services extended to provide counselor-specific dashboard data.
- **Admin Portal routes**:
  - GET `/api/v1/crm/leads/follow-ups/today`
  - GET `/api/v1/crm/leads/follow-ups/future`
  - GET `/api/v1/crm/leads/follow-ups/past`
  - GET `/api/v1/crm/leads/follow-ups/counts` (optional, for badges)
- **Admin Portal frontend**:
  - `/leads/follow-ups/page.tsx`
  - `/leads/counselor-dashboard/page.tsx`
  - `/app/(protected)/layout.tsx` (icon mappings)
