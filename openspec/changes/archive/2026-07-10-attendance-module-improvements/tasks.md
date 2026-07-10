# Tasks: Attendance UI/UX and Reporting Enhancements

## 1. Navigation & Access Cleanup

- [x] 1.1 Remove `/attendance/records` sidebar menu item configuration in [access.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/identity-access/src/domain/access.ts) to simplify sidebar navigation.
- [x] 1.2 Update the routing logic and page redirects in the admin portal to route any legacy `/attendance/records` calls or redirects to `/attendance/sessions`.

## 2. Dynamic Operational Dashboard

- [x] 2.1 Refactor [dashboard/page.tsx](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/apps/admin-portal/app/(protected)/attendance/dashboard/page.tsx) to add standard `<PageHeader>` with breadcrumbs (`Home > Attendance > Dashboard`).
- [x] 2.2 Add Prisma count queries for the branch scope:
- [x] 2.3 Render `StatCard` components for these counts.
- [x] 2.4 Render the **Today's Schedule** table widget (listing today's sessions with a direct link to `/attendance/sessions?sessionId={id}` to mark/view).
- [x] 2.5 Render the **Pending Corrections Queue** widget (with Approve/Reject action buttons or redirect link).

## 3. Grouped Sessions & Merged Roster Screen

- [x] 3.1 Refactor [sessions/page.tsx](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/apps/admin-portal/app/(protected)/attendance/sessions/page.tsx) to handle the `sessionId` search query parameter.
- [x] 3.2 If `sessionId` is present, fetch the session details and roster records (using the logic previously in `records/page.tsx`), and render the `<AttendanceRosterEditor>` component.
- [x] 3.3 Set the `<PageHeader>` of the roster view to have `backUrl="/attendance/sessions"` and include breadcrumbs (`Home > Attendance > Sessions > Session Roster`).
- [x] 3.4 If `sessionId` is absent, fetch and filter all sessions into **Active (Today)**, **Past**, and **Future** arrays using date comparisons against Omani local time boundaries.
- [x] 3.5 Render the session lists using a `<Tabs>` component (Active Today, Past, Future, All) displaying badges with item counts.
- [x] 3.6 Repurpose [records/page.tsx](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/apps/admin-portal/app/(protected)/attendance/records/page.tsx) to perform backward-compatible redirects to sessions.

## 4. Correction Queue Tabs

- [x] 4.1 Refactor [corrections/page.tsx](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/apps/admin-portal/app/(protected)/attendance/corrections/page.tsx) to support filtering by status tabs: `Pending`, `Approved`, `Rejected`, and `All`.
- [x] 4.2 Group correction requests by status and update [attendance-corrections-queue.tsx](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/apps/admin-portal/app/(protected)/attendance/_components/attendance-corrections-queue.tsx) to accept filtered lists or filter client-side if loaded entirely. Add correct PageHeader with breadcrumbs.

## 5. Meaningful Reports

- [x] 5.1 Refactor [reports/page.tsx](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/apps/admin-portal/app/(protected)/attendance/reports/page.tsx) to join relations using Prisma:
- [x] 5.2 Add select dropdowns for **Branch** (if global role) and **Batch** filters.
- [x] 5.3 Implement a **Batch Attendance Roster** table: when a batch is selected, fetch all enrolled students, showing their Present/Absent/Late counts and overall attendance percentages.
- [x] 5.4 Implement a **Batch Heatmap Grid**: show the last 5-10 sessions as columns and student names as rows, rendering P/A/L/E codes in cells.
- [x] 5.5 Standardize headers with breadcrumbs (`Home > Attendance > Reports`).

## 6. Verification & Rollout

- [x] 6.1 Run typecheck (`pnpm run typecheck` or workspace build) to ensure clean Next.js page imports.
- [x] 6.2 Run linter and formatter.
- [x] 6.3 Manually verify dashboard navigation, session roster editing via query parameters, correction approval, and reporting layouts.
