## Why

Currently, Courses (Course Catalog) and Batches (Training Delivery) share a unified "Training Delivery" navigation menu, and their dashboard analytics/permissions are not clearly separated. Furthermore, the operational dashboards lack a standard 60-day historical default view and advanced filtering controls (Start/End Date, Course, Branch, Category, Department, etc.) accessible via a bottom floating filter sheet and reflected in both the URL query parameters and the top breadcrumb/header info.

## What Changes

*   **BREAKING**: Split the "Training Delivery" menu in `adminNavigation` into two separate operations categories/menus: **Course Catalog** and **Training Delivery** (Batches).
*   **BREAKING**: Define and enforce new explicit permission codes:
    *   `course.catalog.menu.view` (For rendering the Course Catalog category)
    *   `course.catalog.dashboard.view` (For viewing the Courses Dashboard page at `/dashboards/courses`)
    *   `batch.delivery.menu.view` (For rendering the Training Delivery / Batches category)
    *   `batch.delivery.dashboard.view` (For viewing the Batches Dashboard page at `/dashboards/batches`)
*   **New Courses Dashboard**: Add a new operational analytics dashboard for Courses at `/dashboards/courses` showing course aggregate counts, classification splits, department/category distribution, and recently effective courses.
*   **Dashboard Time Horizon Constraint**: Both Batches and Courses dashboards must default to displaying the last 2 months (60 days) of data from the current date.
    *   For Batches: `startDate >= today - 60 days`.
    *   For Courses: Effective date range check: `effectiveStartDate <= today` and (`effectiveEndDate === null` or `effectiveEndDate >= today - 60 days`).
*   **Interactive Floating Filter Dialog**: Implement a floating action button (FAB) filter icon in the bottom right corner of both dashboards. Clicking this FAB displays a bottom sheet or dialog containing:
    *   For Batches: `startDate`, `endDate`, `courseId`, `status`, `branchId`
    *   For Courses: `startDate`, `endDate` (effective range), `categoryId`, `departmentId`, `isPubliclyExposed`, `courseClassification`, `hasPricing`, `hasDiscount`, `hasCertificateRules`
*   **Top Applied Filters Banner**: Display the currently active filters at the top of the dashboard pages.
*   **URL Query Parameter Synchronization**: Synchronize all dashboard filter values with URL query parameters so that refreshing or sharing the page maintains the filter context.

## Capabilities

### New Capabilities
- `courses-dashboard`: Introduces the new dedicated operational analytics dashboard for Courses at `/dashboards/courses` with custom metrics, aggregations, and date-range / master filters.

### Modified Capabilities
- `course-catalog`: Modify course catalog access to restrict list views to the new `course.catalog.menu.view` menu and update the route parameters to sync with the new filters.
- `batch-delivery`: Modify the Batches List page `/batches` to check `batch.delivery.view` (instead of the incorrect `course.catalog.view` mapping) and batches dashboard `/dashboards/batches` to verify `batch.delivery.dashboard.view`, incorporating the 60-day default window and bottom filter sheet.

## Impact

*   **Identity & Access**: Domain permission definitions updated in `packages/identity-access/src/domain/access.ts` (adding 4 new permission codes) and layout navigation config.
*   **Database Seeding**: Seeding of the 4 new permissions in `packages/database/prisma/seed.ts` and assignment to the standard roles (Super Admin, Owner, Branch Manager, Academic Coordinator, Trainer).
*   **Admin Portal Application UI**:
    *   New server/client pages under `apps/admin-portal/app/(protected)/dashboards/courses`.
    *   Updated `apps/admin-portal/app/(protected)/dashboards/batches` page to use the new permissions, 60-day filter, bottom filter panel, and header info.
    *   Updated `apps/admin-portal/app/(protected)/batches/page.tsx` permission check.
    *   Updated layout sidebar and icon mappings in `apps/admin-portal/app/(protected)/layout.tsx`.
