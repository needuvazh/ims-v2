## 1. Batches List Refactoring (Removing KPIs)

- [x] 1.1 Remove the 4 `prisma.batch.count` query statements for KPI metrics from `app/(protected)/batches/page.tsx`.
- [x] 1.2 Remove the `kpis` props interface and parameter from `batches-client-list.tsx`.
- [x] 1.3 Remove the `<StatCard>` grid rendering section from `batches-client-list.tsx`.

## 2. Dedicated Batches Dashboard Implementation

- [x] 2.1 Create the Next.js Server Page `/app/(protected)/dashboards/batches/page.tsx` that:
  - Enforces `course.catalog.view` view permission checks.
  - Resolves branch access constraints using `branchScopeResolver`.
  - Queries batch count aggregates (Total, Open, InProgress, Cancelled, Drafts) in parallel.
  - Queries active batches with course relationships to compute course capacity statistics.
  - Queries upcoming batches scheduled to start in the next 30 days.
- [x] 2.2 Create the Client View component `/app/(protected)/dashboards/batches/_components/batches-dashboard-client.tsx` that:
  - Renders dashboard title, description, and breadcrumbs.
  - Renders the KPI metrics cards.
  - Renders the course capacity and fill rates grid.
  - Renders the upcoming timelines lists.
- [x] 2.3 Integrate the link to Batches Dashboard in the reporting dashboard index (`/dashboards/admissions/reports/page.tsx` or similar sidebar lists).

## 3. Testing & Verification

- [x] 3.1 Update unit/integration tests to ensure `/batches` test suite passes without `kpis` structures.
- [x] 3.2 Implement a test suite `/app/(protected)/dashboards/batches/page.test.tsx` verifying correct dashboard queries and metrics aggregation.
- [x] 3.3 Run typecheck command `npm run typecheck` to verify compilation.
- [x] 3.4 Run linter command `npm run lint` on the modified files to check style.
- [x] 3.5 Run the tests `npx vitest run` to ensure all tests pass.
