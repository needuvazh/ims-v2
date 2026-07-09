## Context

Currently, the Courses Catalog page `/courses-catalog` and Batches list page `/batches` share some permissions and scoping checks, and are grouped under a single navigation menu item called "Training Delivery". 

With the introduction of the Batches Operational Dashboard (`/dashboards/batches`), a need arose to:
1. Completely separate the menu items, view permissions, and active dashboards for Courses and Batches.
2. Limit the default view of both dashboards to the last 2 months (60 days) to optimize database loading and keep the operational focus on active cohorts, while providing a bottom floating filter drawer/modal to fetch historical or customized data.
3. Synchronize all filter values with URL query parameters so the view context is shareable and persistent across page reloads.

## Goals / Non-Goals

**Goals:**
*   Create separate sidebar navigation menus for Course Catalog and Training Delivery.
*   Enforce new, fine-grained view and dashboard permissions (`course.catalog.menu.view`, `course.catalog.dashboard.view`, `batch.delivery.menu.view`, `batch.delivery.dashboard.view`).
*   Implement a new Courses Dashboard (`/dashboards/courses`) with aggregate KPI cards, department and category split metrics, and a list of recently created/updated courses.
*   Enforce the 60-day default date-range boundary on both dashboards.
*   Implement a floating action button (FAB) filter panel on the bottom of both dashboards.
*   Enable URL query parameter synchronization for all dashboard filter options.
*   Display a banner summarizing active filters at the top of the dashboards.

**Non-Goals:**
*   Modifying database models or adding new schema fields.
*   Changing course or batch CRUD forms and workflows.
*   Implementing CQRS or external message queues.

## Decisions

### 1. Navigation Menu Split and Layout Icon Mapping
We will update `adminNavigation` in `packages/identity-access/src/domain/access.ts` to separate Courses and Batches into distinct operational submenus under category `Operations`, and map their routes in `apps/admin-portal/app/(protected)/layout.tsx` to clean UI icons.
*   *Rationale*: This satisfies the UX requirement of having completely independent sections for course catalog administration and active training delivery management.

### 2. Default Time Horizon Filtering (Last 2 Months)
*   **Batches Dashboard**: Default range: `startDate >= today - 60 days`.
*   **Courses Dashboard**: Default range: Courses active during the last 60 days (`effectiveStartDate <= today` and (`effectiveEndDate === null` or `effectiveEndDate >= today - 60 days`)).
*   *Rationale*: Restricting the default load query reduces memory footprint when calculating capacity fill-rates and aggregation metrics on large historical datasets, while still showing relevant current operations.

### 3. Floating Action Button (FAB) and URL State Sync
A floating filter icon will be positioned in the bottom-right corner of both dashboards. Clicking this button opens a modal sheet displaying specific filter inputs.
*   Applying the filters updates the query parameters using Next.js `router.push`.
*   Since the pages are Server Components, the update in search params triggers server-side data fetching and re-renders the dashboard layout dynamically.
*   *Rationale*: Keeps filters lightweight, matches existing client-state sync patterns in the project (e.g. `/batches`), and ensures direct links remain shareable.

### 4. Database Seed Permission Updates
We will add 4 new permission entries to `packages/database/prisma/seed.ts` and map them to roles:
*   `SUPER_ADMIN` and `OWNER` get all permissions.
*   `BRANCH_MANAGER` and `ACADEMIC_COORDINATOR` get the new menu and dashboard view permissions.
*   `TRAINER` gets the batch-related menu and dashboard view permissions.
*   *Rationale*: Integrates the new permission definitions natively into the RBAC foundation of the modular monolith.

## Risks / Trade-offs

*   **[Risk] Outdated DB Seed in User Environments** → If a developer or staging server has an older database schema or seed, permission checks may fail.
    *   *Mitigation*: Provide clear instructions to run `npx prisma db seed` after deployment, and write robust checks mapping roles to permissions on startup/session creation.
*   **[Risk] Performance on Large Datasets** → Grouping and count operations on database models could slow down as records scale.
    *   *Mitigation*: The queries are index-backed on status and dates. The default 60-day filter narrows down the scan range significantly.
