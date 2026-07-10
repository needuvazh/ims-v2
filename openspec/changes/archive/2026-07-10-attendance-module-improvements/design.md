# Design: Attendance UI/UX and Reporting Enhancements

## Context

The current Attendance module features five separate operational directories in `apps/admin-portal/app/(protected)/attendance`:
- `/dashboard`: Static layout with text card links.
- `/sessions`: Flat list of session cards/rows.
- `/records`: Roster marker when queried with `sessionId`, or a flat, unhelpful list of 200 logs when loaded without it.
- `/corrections`: Single flat list containing both pending and historical approval requests.
- `/reports`: Static session health snapshot and low attendance watchdog which print raw database UUIDs (e.g., student profile, batch, and enrollment IDs) instead of human-readable data.

This design refactors these views to bring them in line with ASTI IMS standards.

## Goals / Non-Goals

**Goals:**
- standardise all headers in the Attendance module using `<PageHeader>` and breadcrumbs.
- Design an interactive, dynamic operational dashboard with real-time counters and quick actions.
- Merge the records view into the sessions screen, implementing a toggled view based on `?sessionId=...` query parameters and removing `/attendance/records` from the sidebar.
- Organize session lists into Active (Today), Past, and Future sections using a `<Tabs>` component.
- Organize correction queues into Pending, Approved, and Rejected tabs.
- Resolve database UUIDs to names/codes (student name, student number, batch code, course name) in reporting views.
- Implement an interactive batch attendance report roster and session heatmap.

**Non-Goals:**
- Schema changes or new tables (this refactor relies purely on existing models: `AttendanceSession`, `AttendanceRecord`, `AttendanceCorrection`, `Session`, `Batch`, `StudentProfile`, `Person`, `Course`).
- Biometric synchronization or automated hardware integration (manual attendance remains the only input method for Phase 1).

## Decisions

### 1. Unified Route for Session & Roster Management
Instead of redirecting to `/attendance/records?sessionId={id}`:
- The marking interface (`AttendanceRosterEditor`) will render directly on `/attendance/sessions` when `sessionId` is present as a query parameter.
- The root `/attendance/sessions` page component will inspect the `searchParams`.
- If `sessionId` is present, it will run the session and roster query, and return the editor.
- If `sessionId` is omitted, it will display the tabs (Today, Past, Future, All) and the session list.
- Sidebar menu item `/attendance/records` will be removed in `packages/identity-access/src/domain/access.ts` to keep the menu compact.

### 2. High-Density Reporting Joins
To fix the UUID issue, the reports server component will perform relations queries:
- Query `prisma.courseCompletion` or summary statistics.
- Fetch matching `Enrollment` rows including `StudentProfile -> Person`, `Course`, and `Batch` details to map raw IDs in the UI:
  - `item.enrollmentId` &rarr; `enrollment.enrollmentNumber` or Student Name.
  - `item.studentProfileId` &rarr; `person.firstName person.lastName` (`studentNumber`).
  - `item.batchId` &rarr; `batch.batchCode`.

### 3. Interactive Batch Analysis Grid
- We will add filters for Branch and Batch on the reports screen.
- Choosing a batch will load a list of enrolled students, displaying their attendance totals and a chronological grid (e.g. checkmarks/crosses for the last 5 sessions) for quick review.

## Risks / Trade-offs

- **Performance**: Fetching relation data for 200+ students on reports could increase query duration. However, we limit watchlist reports to a branch scope and paginate batch grids to mitigate performance risks.
- **Route Cache**: Using search query parameters (`?sessionId=...`) inside Next.js App Router might require setting the page to dynamic rendering (`export const dynamic = 'force-dynamic'`). We will ensure all pages in the refactored module are configured correctly to reflect real-time changes.
