## 1. Permission and Navigation Setup

- [x] 1.1 Add the 4 new permission codes (`course.catalog.menu.view`, `course.catalog.dashboard.view`, `batch.delivery.menu.view`, `batch.delivery.dashboard.view`) to the `knownPermissions` array in `packages/identity-access/src/domain/access.ts`.
- [x] 1.2 Modify `packages/database/prisma/seed.ts` to define the 4 new permissions and assign them to roles: `SUPER_ADMIN` and `OWNER` automatically get all, `BRANCH_MANAGER` and `ACADEMIC_COORDINATOR` get all 4, and `TRAINER` gets `batch.delivery.menu.view` and `batch.delivery.dashboard.view`.
- [x] 1.3 Split the single "Training Delivery" menu in `packages/identity-access/src/domain/access.ts`'s `adminNavigation` config into two separate category/menu configurations: "Course Catalog" and "Training Delivery" (Batches), protecting each menu and sub-item with their respective new permission codes.
- [x] 1.4 Update the icon rendering cases in `apps/admin-portal/app/(protected)/layout.tsx` to map `/dashboards/courses` to `LayoutDashboard`.

## 2. Batches Page Permission Fix

- [x] 2.1 Update the permission check at the top of `apps/admin-portal/app/(protected)/batches/page.tsx` from `course.catalog.view` to `batch.delivery.view`.

## 3. Batches Dashboard Refactoring (60-Day Default and Bottom Sheet Filters)

- [x] 3.1 Update `apps/admin-portal/app/(protected)/dashboards/batches/page.tsx` to assert `batch.delivery.dashboard.view` permission.
- [x] 3.2 Update the date filtering logic in `/dashboards/batches/page.tsx` to look for `startDate` and `endDate` parameters in search params. If not present, default to `startDateLimit = today - 60 days`. Inject these date range constraints into the prisma queries.
- [x] 3.3 Update the `BatchesDashboardClient` component to read the active filters from the URL and display a summary banner of the active filters at the top of the dashboard, alongside a "Reset" link.
- [x] 3.4 Implement a bottom-right floating action button (FAB) filter icon in `BatchesDashboardClient`. Clicking it opens a sheet dialog with controls for `startDate`, `endDate`, `courseId`, `status`, and `branchId`. Applying filters routes the page to the updated URL query string.

## 4. Courses Dashboard Implementation

- [x] 4.1 Create the Next.js Server Component `/apps/admin-portal/app/(protected)/dashboards/courses/page.tsx` which:
  - Asserts `course.catalog.dashboard.view` permission.
  - Resolves branch scoping via `branchScopeResolver` to filter metrics.
  - Parses effective date range query parameters (`startDate`, `endDate`), defaulting to `[today - 60 days, today]`.
  - Queries course aggregate counts (Total, Published, Approved, InReview, Draft, Archived) in parallel using the date bounds and branch constraints.
  - Queries course distributions by category (`prisma.courseCategory` with course counts).
  - Queries course distributions by department (`prisma.department` with course counts).
  - Queries the 5 most recently created courses.
- [x] 4.2 Create the client-side component `/apps/admin-portal/app/(protected)/dashboards/courses/_components/courses-dashboard-client.tsx` using responsive tailwind grids and premium UI components:
  - Displays aggregate count metrics cards.
  - Displays a categories and departments breakdown list.
  - Displays a list of recently created courses.
  - Implements a bottom FAB filter icon that pops open a sheet modal with filter controls: `startDate`, `endDate`, `categoryId`, `departmentId`, `isPubliclyExposed`, `courseClassification`, `hasPricing`, `hasDiscount`, `hasCertificateRules` synced directly with URL params.
  - Renders the applied filters banner at the top of the dashboard.

## 5. Testing & Verification

- [x] 5.1 Update the test suite `apps/admin-portal/app/(protected)/dashboards/batches/page.test.tsx` to reflect the new `batch.delivery.dashboard.view` permission assertion.
- [x] 5.2 Implement a test suite `/apps/admin-portal/app/(protected)/dashboards/courses/page.test.tsx` verifying that the new Courses Dashboard queries data correctly and enforces permission checks.
- [x] 5.3 Run compilation checks (`npm run typecheck`), style checks (`npm run lint`), and unit tests (`npx vitest run`) to ensure everything is correct and functional.
