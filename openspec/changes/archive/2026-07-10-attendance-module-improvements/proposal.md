## Why

The current Attendance module has several UI/UX and functional gaps that limit its operational utility:
1. **Static Dashboard**: The attendance dashboard is static and lacks high-density operational insights (e.g., active sessions, completion rates, pending corrections, at-risk students) present in other modules.
2. **Inconsistent Headers**: Headers are inconsistent, lacking standardized breadcrumbs, proper branding typography, and standard navigation controls (like back-arrows).
3. **Flat Session List**: The sessions screen presents a single flat list, making it hard to track today's active classes, past history, and future sessions.
4. **Redundant Records Screen**: The flat records screen serves no meaningful purpose, leading to cluttered navigation. Merging it into the sessions screen will improve workflow simplicity.
5. **Combined Corrections review**: Correction requests are in a flat list, complicating approval duties. Splitting them into tab views (Pending, Approved, Rejected, All) will improve work queues.
6. **Low Report Utility**: Existing reports output raw UUIDs for batches and student profiles, making them unreadable. They also lack batch-specific attendance grids and interactive filters.

## What Changes

We will refactor the Attendance module's admin portal screens to standardize headers, merge the records roster editor into `/attendance/sessions`, implement grouped tabs for sessions and corrections, design a dynamic operational dashboard, and resolve data presentation issues (raw UUIDs) on reports.

## Capabilities

### Modified Capabilities
- `attendance-management`: Refactoring the UI/UX layer of the attendance module (dashboard metrics, grouped session tabs, merged roster view, organized corrections tabs, and human-readable reporting joins).

## Impact

- **Bounded Contexts**: `Attendance Management` (primary owner), `Identity & Access Management` (sidebar menu cleanup), `Course Catalog Management`, `Training Delivery Management`.
- **Database**: Reads will join `StudentProfile`, `Person`, `Course`, and `Batch` tables to resolve human-readable information (Name, Student Number, Batch Code, Course Name) instead of printing raw UUIDs in reports.
- **API Boundary**: Redirect `/attendance/records` to `/attendance/sessions` or remove `/attendance/records` from the sidebar and map `/attendance/sessions?sessionId={id}` for roster marking.
- **UI Components**:
  - `apps/admin-portal/app/(protected)/attendance/dashboard/page.tsx` (Dashboard UI)
  - `apps/admin-portal/app/(protected)/attendance/sessions/page.tsx` (Merged Sessions & Records UI)
  - `apps/admin-portal/app/(protected)/attendance/corrections/page.tsx` (Queue Tabs UI)
  - `apps/admin-portal/app/(protected)/attendance/reports/page.tsx` (UUIDs resolution, Branch & Batch filters, attendance grid)
