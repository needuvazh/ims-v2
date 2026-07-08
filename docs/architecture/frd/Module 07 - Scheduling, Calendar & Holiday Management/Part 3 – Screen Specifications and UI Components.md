# Part 3 – Screen Specifications and UI Components

## Module 07 – Scheduling, Calendar & Holiday Management

**Module Code:** `SCH`  
**System:** ASTI Integrated Institute Management System  
**Architecture Alignment:** Modular monolith, Next.js admin portal first, Prisma-backed relational persistence  
**Primary Context:** Scheduling, Calendar & Holiday Management  
**Related Contexts:** Organization Management, Course Catalog Management, Training Delivery Management, Faculty / Trainer Management, Attendance Management, Configuration / Master Data, Identity & Access Management, Reporting & Dashboards, Audit & Compliance

---

## 1. Screen Specification Principles

The Scheduling, Calendar & Holiday Management screens are designed for dense operational use by ASTI branch managers, academic coordinators, training coordinators, trainers, reception/front-desk users, and students. The module must support daily timetable visibility, schedule creation, conflict validation, holiday configuration, venue blocking, trainer availability checks, and branch-level calendar governance.

The screens must follow these principles:

1. **Branch-scoped by default:** Every admin screen must resolve and enforce the active branch context on the server. Client-side branch selectors are convenience controls only and must never be trusted for authorization.
2. **Dense operational layout:** Admin screens must prioritize tables, filters, status badges, schedule grids, conflict panels, and side drawers over sparse card-only layouts.
3. **Conflict visibility first:** Trainer conflicts, classroom conflicts, batch overlaps, holiday conflicts, venue block conflicts, and out-of-hours conflicts must be visible before publication.
4. **Draft before publish:** Schedule creation screens must allow draft work, but only conflict-free or explicitly authorized override sessions can become official `Published` timetable entries.
5. **Bilingual readiness:** User-facing titles, labels, holiday names, reason text, calendar names, and timetable display values must support English LTR and Arabic RTL rendering.
6. **Audit-aware operations:** All sensitive changes, including publish, cancel, reschedule, override, venue block activation, holiday activation, and calendar status changes, must capture reason and audit metadata.
7. **Portal separation:** Admin portal manages scheduling. Trainer portal consumes assigned sessions and may request issues or view timetable. Student portal consumes enrolled timetable and holiday/closure information.
8. **No external calendar dependency:** Phase 1 does not require Google Calendar, Outlook Calendar, external scheduling engines, event brokers, or microservices.

---

## 2. Screen Inventory

### 2.1 Admin Portal Screen Inventory

| Screen ID   | Screen Name                      | Route                                                                      | Primary Users                                                                      | Purpose                                                                                               | Permission Gate                                                |
| ----------- | -------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| SCH-ADM-001 | Scheduling Dashboard             | `/admin/scheduling`                                                        | Super Admin, Branch Manager, Academic Coordinator, Training Coordinator, Reception | Operational overview of today, upcoming sessions, conflicts, holidays, and utilization.               | `scheduling.dashboard.view`                                    |
| SCH-ADM-002 | Timetable Calendar View          | `/admin/scheduling/timetable`                                              | Academic Coordinator, Training Coordinator, Branch Manager, Reception              | View sessions by day, week, month, trainer, classroom, batch, and course.                             | `scheduling.session.read`                                      |
| SCH-ADM-003 | Session List Management          | `/admin/scheduling/sessions`                                               | Academic Coordinator, Training Coordinator, Branch Manager                         | Search, filter, create, publish, cancel, reschedule, and audit sessions.                              | `scheduling.session.read`                                      |
| SCH-ADM-004 | Create Single Schedule Session   | `/admin/scheduling/sessions/new`                                           | Academic Coordinator, Training Coordinator                                         | Create one draft session for a batch.                                                                 | `scheduling.session.create`                                    |
| SCH-ADM-005 | Edit / Reschedule Session        | `/admin/scheduling/sessions/[id]/edit`                                     | Academic Coordinator, Branch Manager                                               | Modify date, time, trainer, classroom, status, and reason.                                            | `scheduling.session.update`                                    |
| SCH-ADM-006 | Session Detail & Audit           | `/admin/scheduling/sessions/[id]`                                          | Branch Manager, Academic Coordinator, Trainer, Auditor                             | View full session details, conflicts, attendance linkage, audit history.                              | `scheduling.session.read`                                      |
| SCH-ADM-007 | Recurring Schedule Generator     | `/admin/scheduling/recurring/new`                                          | Academic Coordinator, Training Coordinator                                         | Generate multiple draft sessions for a batch.                                                         | `scheduling.session.create`                                    |
| SCH-ADM-008 | Conflict Review Center           | `/admin/scheduling/conflicts`                                              | Branch Manager, Academic Coordinator                                               | Review unresolved conflicts, override eligible conflicts, and blocked sessions.                       | `scheduling.conflict.read`                                     |
| SCH-ADM-009 | Business Calendar List           | `/admin/scheduling/calendars`                                              | Super Admin, Branch Manager                                                        | Manage institute calendars and branch overrides by year and status.                                   | `scheduling.calendar.read`                                     |
| SCH-ADM-010 | Business Calendar Create / Edit  | `/admin/scheduling/calendars/new`, `/admin/scheduling/calendars/[id]/edit` | Super Admin, Branch Manager                                                        | Configure operating days, working hours, year, timezone, lifecycle, and branch-year override details. | `scheduling.calendar.create`, `scheduling.calendar.update`     |
| SCH-ADM-011 | Holiday Management               | `/admin/scheduling/holidays`                                               | Branch Manager, Academic Coordinator                                               | Configure public holidays, institute closures, branch holidays, and training blackout dates.          | `scheduling.holiday.read`                                      |
| SCH-ADM-012 | Holiday Create / Edit Drawer     | Drawer from Holiday Management                                             | Branch Manager, Academic Coordinator                                               | Create, update, activate, cancel, and soft delete holiday records.                                    | `scheduling.holiday.create`, `scheduling.holiday.update`       |
| SCH-ADM-013 | Venue Block Management           | `/admin/scheduling/venue-blocks`                                           | Branch Manager, Academic Coordinator, Training Coordinator                         | Block classrooms or branches for maintenance, inspection, internal event, or closure.                 | `scheduling.venueBlock.read`                                   |
| SCH-ADM-014 | Venue Block Create / Edit Drawer | Drawer from Venue Block Management                                         | Branch Manager, Academic Coordinator                                               | Create, update, activate, cancel, or soft delete venue block records.                                 | `scheduling.venueBlock.create`, `scheduling.venueBlock.update` |
| SCH-ADM-015 | Trainer Availability Calendar    | `/admin/scheduling/trainer-availability`                                   | Academic Coordinator, Trainer Coordinator, Branch Manager                          | View trainer availability, assigned sessions, and conflicts.                                          | `scheduling.trainerAvailability.read`                          |
| SCH-ADM-016 | Classroom Utilization Calendar   | `/admin/scheduling/classroom-utilization`                                  | Branch Manager, Academic Coordinator, Reception                                    | View classroom occupancy and available slots.                                                         | `scheduling.classroomAvailability.read`                        |
| SCH-ADM-017 | Batch Schedule Planner           | `/admin/scheduling/batches/[batchId]/planner`                              | Academic Coordinator, Training Coordinator                                         | Plan schedule from a batch-centric view.                                                              | `scheduling.session.read`                                      |
| SCH-ADM-018 | Daily Operations Board           | `/admin/scheduling/daily-board`                                            | Reception, Branch Manager, Academic Coordinator                                    | Display today’s room plan, trainer plan, cancellations, and special notes.                            | `scheduling.dailyBoard.view`                                   |
| SCH-ADM-019 | Schedule Import Preview          | `/admin/scheduling/import/preview`                                         | Academic Coordinator, Super Admin                                                  | Validate uploaded schedule rows before creation.                                                      | `scheduling.session.import`                                    |
| SCH-ADM-020 | Schedule Settings                | `/admin/scheduling/settings`                                               | Super Admin, Branch Manager                                                        | Configure scheduling limits, conflict policy, default timezone, and recurrence bounds.                | `scheduling.settings.manage`                                   |
| SCH-ADM-021 | Schedule Audit Log               | `/admin/scheduling/audit`                                                  | Auditor, Super Admin, Branch Manager                                               | Review critical schedule, calendar, holiday, and venue block changes.                                 | `scheduling.audit.read`                                        |
| SCH-ADM-022 | Schedule Reports                 | `/admin/scheduling/reports`                                                | Branch Manager, CEO Dashboard Users, Academic Coordinator                          | View schedule density, utilization, cancelled sessions, and conflict trends.                          | `scheduling.reports.view`                                      |

### 2.2 Trainer Portal Screen Inventory

| Screen ID   | Screen Name               | Route                            | Primary Users | Purpose                                                                                                      | Permission Gate                 |
| ----------- | ------------------------- | -------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| SCH-TRN-001 | My Teaching Schedule      | `/trainer/schedule`              | Trainer       | View assigned sessions by day/week/month.                                                                    | `trainer.schedule.read`         |
| SCH-TRN-002 | Session Detail            | `/trainer/schedule/[id]`         | Trainer       | View session date, time, classroom, batch, course, enrolled count, notes, and attendance readiness.          | `trainer.schedule.read`         |
| SCH-TRN-003 | Trainer Availability View | `/trainer/availability`          | Trainer       | View configured availability and assigned utilization. Phase 1 edit is optional and may be admin-controlled. | `trainer.availability.read`     |
| SCH-TRN-004 | Schedule Issue Request    | Drawer from My Teaching Schedule | Trainer       | Report a schedule issue such as trainer unavailable, incorrect room, or timing issue.                        | `trainer.schedule.issue.create` |

### 2.3 Student Portal Screen Inventory

| Screen ID   | Screen Name       | Route                    | Primary Users                                    | Purpose                                                                                                                                   | Permission Gate         |
| ----------- | ----------------- | ------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| SCH-STU-001 | My Class Schedule | `/student/schedule`      | Student, Corporate Participant linked as Student | View published sessions for active enrollments.                                                                                           | `student.schedule.read` |
| SCH-STU-002 | Session Detail    | `/student/schedule/[id]` | Student                                          | View course, batch, session title, date, time, classroom, trainer, branch, and holiday-related notices.                                   | `student.schedule.read` |
| SCH-STU-003 | Academic Calendar | `/student/calendar`      | Student                                          | View the institute calendar, branch-specific overrides, holidays, closures, and training blackout notices relevant to active enrollments. | `student.calendar.read` |

### 2.4 Public / External Portal Considerations

No public scheduling management screen is included in Phase 1. Public website may display training calendar information only through approved Course and Batch data owned by Course Catalog and Training Delivery. The public website must not expose internal trainer availability, classroom utilization, venue blocks, conflict records, or audit logs.

---

## 3. Shared UI Components

### 3.1 Common Scheduling Components

| Component                  | Description                                                                                      | Used In                                               | Permission / Behavior                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| `BranchContextSelector`    | Displays active branch and allows switching among assigned branches.                             | All admin screens                                     | Hidden when user has one branch. Must call server with branch context.     |
| `ConsolidatedBranchToggle` | Enables multi-branch consolidated view for eligible users.                                       | Dashboard, Reports, Calendar View                     | Visible only with `scheduling.consolidated.view`.                          |
| `ScheduleStatusBadge`      | Shows `Draft`, `Published`, `Conflict`, `Cancelled`, `Completed`, `Expired`.                     | Session list, detail, calendar                        | Color and icon must be mirrored correctly in RTL.                          |
| `ConflictSummaryPanel`     | Lists trainer, classroom, batch, holiday, venue block, working-hour, and availability conflicts. | Create/Edit/Conflict Center                           | Override actions hidden unless user has corresponding override permission. |
| `DateRangeFilter`          | Filters sessions by start/end date.                                                              | Lists, reports, calendars                             | Defaults to current week in Oman timezone.                                 |
| `TimeRangePicker`          | Captures start and end time in 24-hour format.                                                   | Forms                                                 | Must enforce `startTime < endTime`.                                        |
| `LocalizedTextFields`      | Captures English and Arabic values.                                                              | Calendar, holiday, venue block, session title         | English and Arabic max lengths enforced separately.                        |
| `AuditReasonDialog`        | Captures reason before sensitive actions.                                                        | Publish override, cancel, reschedule, archive, delete | Mandatory for sensitive transitions.                                       |
| `VersionConflictBanner`    | Shows optimistic locking conflict.                                                               | Edit forms                                            | Offers reload or copy unsaved changes.                                     |
| `PermissionGuard`          | Hides or disables UI elements based on permission.                                               | All screens                                           | Server-side authorization remains mandatory.                               |
| `ScheduleCalendarGrid`     | Dense visual calendar with day/week/month/resource views.                                        | Timetable, trainer, classroom, batch planner          | Supports LTR and RTL rendering.                                            |
| `ResourceTimelineGrid`     | Shows sessions by trainer/classroom resource rows.                                               | Trainer availability, classroom utilization           | Must support virtualized rows for large datasets.                          |
| `ExportMenu`               | Exports timetable or list as CSV/PDF.                                                            | Lists, reports, daily board                           | Visible only with export permissions.                                      |
| `SoftDeleteIndicator`      | Shows soft-deleted or archived labels where audit users can view them.                           | Audit and details                                     | Hidden from ordinary operational users.                                    |

### 3.2 Shared Form Validation Conventions

| Rule               | Specification                                                                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Required Field     | Show inline error immediately after blur and on submit.                                                                                                                                                                                           |
| Time Format        | Use `HH:mm` 24-hour format. Regex: `^([01]\\d                                                                                                                                                                                                     | 2[0-3]):[0-5]\\d$`. |
| Date Format        | UI displays according to locale; API sends ISO date `YYYY-MM-DD`. Regex: `^\\d{4}-\\d{2}-\\d{2}$`.                                                                                                                                                |
| UUID/CUID Fields   | Must be selected through lookup controls; direct typing disabled unless import screen.                                                                                                                                                            |
| English Text       | Trim leading/trailing whitespace. Maximum lengths defined per field.                                                                                                                                                                              |
| Arabic Text        | Must support Unicode Arabic. Recommended validation permits Arabic letters, spaces, digits, punctuation, and diacritics. Regex: `^[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF0-9\\s.,،؛:()\\-_/]+$` where Arabic-only enforcement is required. |
| Optimistic Locking | Every edit form must submit current `version`. Stale version returns `409 Conflict`.                                                                                                                                                              |
| Soft Delete        | Delete actions must be labeled `Deactivate` or `Remove from active use`, never hard delete.                                                                                                                                                       |
| Branch Scope       | All branch, classroom, trainer, batch, and calendar lookups must be filtered by accessible branch scope.                                                                                                                                          |
| Oman Timezone      | Date/time previews must default to `Asia/Muscat`; internal comparison must use normalized timezone-aware datetime.                                                                                                                                |

---

## 4. Admin Portal Screen Details

## 4.1 SCH-ADM-001 – Scheduling Dashboard

### Purpose

Provides a dense operational view of scheduling health for the selected branch or authorized consolidated branch scope.

### Layout & Grid Structure

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Header: Scheduling Dashboard | Branch Selector | Date Range | Refresh      │
├────────────────────────────────────────────────────────────────────────────┤
│ KPI Row: Today Sessions | Conflicts | Cancelled | Rooms Used | Trainers     │
├───────────────────────────────┬────────────────────────────────────────────┤
│ Left: Today Timeline          │ Right: Conflict & Alert Panel              │
│ Resource rows by classroom    │ Unresolved conflicts, holiday alerts       │
├───────────────────────────────┴────────────────────────────────────────────┤
│ Upcoming Sessions Table                                                     │
├────────────────────────────────────────────────────────────────────────────┤
│ Utilization Widgets: Classroom, Trainer, Batch schedule completion          │
└────────────────────────────────────────────────────────────────────────────┘
```

Grid behavior:

| Area           | Grid                                                 | Behavior                                                                 |
| -------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| KPI Row        | 5 columns desktop, 2 columns tablet, 1 column mobile | Cards are compact and clickable.                                         |
| Timeline       | 70% width desktop                                    | Scrollable vertical time axis from earliest scheduled session to latest. |
| Alert Panel    | 30% width desktop                                    | Sticky within viewport.                                                  |
| Upcoming Table | Full width                                           | Server-side paging.                                                      |

### Interactive Elements

| Element                     | Type             | Behavior                        | Permission                     |
| --------------------------- | ---------------- | ------------------------------- | ------------------------------ |
| Branch Selector             | Dropdown         | Switches active branch context. | Assigned branch access         |
| Consolidated View Toggle    | Toggle           | Shows multi-branch rollup.      | `scheduling.consolidated.view` |
| Date Range Picker           | Date range       | Defaults to today.              | `scheduling.dashboard.view`    |
| Create Session              | Primary button   | Opens create session page.      | `scheduling.session.create`    |
| Generate Recurring Schedule | Secondary button | Opens recurring generator.      | `scheduling.session.create`    |
| View Conflicts              | Link/card        | Opens Conflict Review Center.   | `scheduling.conflict.read`     |
| Export Dashboard            | Menu             | Exports KPI summary.            | `scheduling.reports.export`    |
| Refresh                     | Icon button      | Reloads data.                   | `scheduling.dashboard.view`    |

### Filters

| Field         | Type         | Validation                                                           | Default                 |
| ------------- | ------------ | -------------------------------------------------------------------- | ----------------------- |
| `branchId`    | Select       | Must be accessible branch ID.                                        | User default branch     |
| `dateFrom`    | Date         | Required, ISO date, cannot be after `dateTo`.                        | Current Oman date       |
| `dateTo`      | Date         | Required, maximum dashboard range 31 days.                           | Current Oman date       |
| `courseId`    | Async select | Must belong to accessible branch through active batches.             | Empty                   |
| `batchId`     | Async select | Must belong to selected branch.                                      | Empty                   |
| `trainerId`   | Async select | Trainer must be active or assigned in selected period.               | Empty                   |
| `classroomId` | Async select | Classroom must belong to selected branch.                            | Empty                   |
| `status`      | Multi-select | Allowed: `Draft`, `Published`, `Conflict`, `Cancelled`, `Completed`. | `Published`, `Conflict` |

### KPI Cards

| KPI                   | Calculation                                                                       | Click Action                          |
| --------------------- | --------------------------------------------------------------------------------- | ------------------------------------- |
| Today Sessions        | Count of non-deleted schedule sessions where `scheduledDate = current Oman date`. | Opens session list filtered to today. |
| Published Sessions    | Count where `scheduleStatus = Published`.                                         | Opens session list.                   |
| Unresolved Conflicts  | Count where `scheduleStatus = Conflict` or latest conflict check failed.          | Opens conflict center.                |
| Cancelled Sessions    | Count where `scheduleStatus = Cancelled` in selected range.                       | Opens session list.                   |
| Classroom Utilization | `occupied minutes / available classroom working minutes * 100`.                   | Opens classroom utilization.          |
| Trainer Utilization   | `assigned trainer minutes / available trainer minutes * 100`.                     | Opens trainer availability.           |

### Table Columns – Upcoming Sessions

| Column       | Source                           | Sort | Filter        | Display Rule                                             |
| ------------ | -------------------------------- | ---- | ------------- | -------------------------------------------------------- |
| Session Date | `scheduledDate`                  | Yes  | Date range    | Locale-aware date.                                       |
| Time         | `startTime`, `endTime`           | Yes  | Time range    | 24-hour display by default.                              |
| Batch Code   | `Batch.batchCode`                | Yes  | Batch         | Link to batch planner if permitted.                      |
| Course       | `Course.nameEnglish/nameArabic`  | Yes  | Course        | Locale-specific display.                                 |
| Session No.  | `sessionNumber`                  | Yes  | Numeric       | Right-aligned in LTR, left-aligned in RTL where natural. |
| Trainer      | `TrainerProfile.Person.fullName` | Yes  | Trainer       | Shows badge if substitute.                               |
| Classroom    | `Classroom.code/name`            | Yes  | Classroom     | Shows capacity.                                          |
| Status       | `scheduleStatus`                 | Yes  | Multi-select  | Badge.                                                   |
| Conflicts    | Derived                          | No   | Conflict type | Shows count and type icons.                              |
| Actions      | Permission-based                 | No   | No            | View/Edit/Publish/Cancel.                                |

Paging: server-side pagination with page sizes `25`, `50`, `100`; default `25`.

### Dynamic UI States

| State                 | Behavior                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| Loading               | Show skeleton KPI cards, skeleton timeline rows, and table row skeletons.                                |
| Empty                 | Message: `No sessions found for the selected date range and branch.` Show `Create Session` if permitted. |
| No Branch Access      | Show blocking panel: `You do not have access to scheduling data for this branch.`                        |
| Partial Data          | If reporting calculation fails but sessions load, show KPI warning and keep table available.             |
| Permission Restricted | Hide create/export buttons. Keep read-only dashboard if read permission exists.                          |

---

## 4.2 SCH-ADM-002 – Timetable Calendar View

### Purpose

Allows users to view schedule sessions visually across day, week, month, trainer resource, classroom resource, and batch views.

### Layout & Grid Structure

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Toolbar: View Mode | Date Nav | Branch | Filters | Create | Export         │
├────────────────────────────────────────────────────────────────────────────┤
│ Calendar Grid: Day / Week / Month / Resource Timeline                      │
├────────────────────────────────────────────────────────────────────────────┤
│ Right Drawer on Event Click: Session summary, conflicts, actions            │
└────────────────────────────────────────────────────────────────────────────┘
```

View modes:

| View Mode          | Description                                | Default Users               |
| ------------------ | ------------------------------------------ | --------------------------- |
| Day                | Hour-by-hour timetable for one date.       | Reception, Coordinator      |
| Week               | Seven-day timetable.                       | Coordinator, Branch Manager |
| Month              | Calendar month with session count per day. | Branch Manager              |
| Trainer Resource   | Rows are trainers; columns are time.       | Academic Coordinator        |
| Classroom Resource | Rows are classrooms; columns are time.     | Reception, Coordinator      |
| Batch View         | Rows are sessions within selected batch.   | Training Coordinator        |

### Interactive Elements

| Element                | Type              | Behavior                                                                                  |
| ---------------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| Previous / Next        | Button            | Navigates date period.                                                                    |
| Today                  | Button            | Jumps to current Oman date.                                                               |
| View Mode Selector     | Segmented control | Persists user preference per session.                                                     |
| Branch Selector        | Dropdown          | Reloads data under branch scope.                                                          |
| Filters Button         | Button            | Opens filter drawer.                                                                      |
| Calendar Event         | Clickable block   | Opens session quick-view drawer.                                                          |
| Drag to Reschedule     | Drag/drop         | Disabled in Phase 1 unless `scheduling.session.reschedule` is granted and policy enabled. |
| Create Session in Slot | Click empty slot  | Opens create form with prefilled date/time/classroom when permitted.                      |
| Export Timetable       | Menu              | CSV or PDF export if permitted.                                                           |

### Filter Form Fields

| Field             | Type         | Validation                                   | Mandatory |
| ----------------- | ------------ | -------------------------------------------- | --------- |
| `branchId`        | Select       | Accessible branch only.                      | Yes       |
| `viewDate`        | Date         | ISO date.                                    | Yes       |
| `courseId`        | Async select | Active or scheduled course.                  | No        |
| `batchId`         | Async select | Must belong to accessible branch.            | No        |
| `trainerId`       | Async select | Must be active trainer or assigned in range. | No        |
| `classroomId`     | Async select | Active classroom in branch.                  | No        |
| `status`          | Multi-select | Allowed statuses only.                       | No        |
| `showHolidays`    | Boolean      | No validation.                               | No        |
| `showVenueBlocks` | Boolean      | No validation.                               | No        |
| `showConflicts`   | Boolean      | No validation.                               | No        |

### Event Block Display

| Field           | Display                                                            |
| --------------- | ------------------------------------------------------------------ |
| Top line        | `startTime-endTime` and status badge.                              |
| Main line       | Course or batch depending selected grouping.                       |
| Secondary line  | Trainer and classroom.                                             |
| Conflict marker | Red warning icon with count if unresolved.                         |
| Holiday marker  | Holiday icon if session falls on holiday with approved override.   |
| RTL             | Time remains numeric LTR; text aligns right; event handles mirror. |

### Dynamic UI States

| State               | Behavior                                                             |
| ------------------- | -------------------------------------------------------------------- |
| Loading             | Calendar grid skeleton with shimmer blocks.                          |
| Empty Day           | Show `No sessions scheduled for this date.`                          |
| Empty Week          | Show day columns and empty state in grid body.                       |
| Filter No Results   | Show `No sessions match the selected filters.` Keep filters visible. |
| Unauthorized Create | Empty slot click opens read-only message, not create form.           |
| Conflict Overlay    | If `showConflicts = true`, display conflict icons and tooltip.       |

---

## 4.3 SCH-ADM-003 – Session List Management

### Purpose

Provides a sortable, filterable, pageable operational list of all schedule sessions under branch scope.

### Layout & Grid Structure

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Header: Sessions | Create | Recurring Generator | Import | Export          │
├────────────────────────────────────────────────────────────────────────────┤
│ Filter Bar: Search, Branch, Date Range, Status, Course, Batch, Trainer     │
├────────────────────────────────────────────────────────────────────────────┤
│ Dense Data Table                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ Pagination Footer                                                           │
└────────────────────────────────────────────────────────────────────────────┘
```

### Search and Filter Fields

| Field                 | Type           | Validation                                                             | Behavior                                                                       |
| --------------------- | -------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `q`                   | Text           | Trimmed, max 100 chars, rejects control chars.                         | Searches session title, batch code, course code, trainer name, classroom code. |
| `branchId`            | Select         | Accessible branch only.                                                | Required for non-consolidated users.                                           |
| `dateFrom`            | Date           | ISO date. Must be <= `dateTo`.                                         | Optional.                                                                      |
| `dateTo`              | Date           | ISO date. Maximum range 366 days unless report permission.             | Optional.                                                                      |
| `scheduleStatus`      | Multi-select   | `Draft`, `Published`, `Conflict`, `Cancelled`, `Completed`, `Expired`. | Optional.                                                                      |
| `courseId`            | Async select   | UUID/CUID from accessible course list.                                 | Optional.                                                                      |
| `batchId`             | Async select   | Must belong to selected branch.                                        | Optional.                                                                      |
| `trainerId`           | Async select   | Must resolve to TrainerProfile.                                        | Optional.                                                                      |
| `classroomId`         | Async select   | Must belong to selected branch.                                        | Optional.                                                                      |
| `hasConflict`         | Boolean select | `Any`, `Yes`, `No`.                                                    | Optional.                                                                      |
| `holidayOverrideUsed` | Boolean select | `Any`, `Yes`, `No`.                                                    | Optional.                                                                      |

### Table Columns

| Column       | Source                       | Sortable | Filterable | Notes                                                        |
| ------------ | ---------------------------- | -------: | ---------: | ------------------------------------------------------------ |
| Checkbox     | Row selection                |       No |         No | Visible only when user can bulk publish/cancel/export.       |
| Session Date | `scheduledDate`              |      Yes |        Yes | Default sort descending for history, ascending for upcoming. |
| Time         | `startTime/endTime`          |      Yes |        Yes | Sort by start time.                                          |
| Status       | `scheduleStatus`             |      Yes |        Yes | Badge.                                                       |
| Session No.  | `sessionNumber`              |      Yes |         No | Unique within batch.                                         |
| Title        | `title/titleLocalized`       |      Yes |     Search | Locale-specific.                                             |
| Batch        | `batchCode`, `batchName`     |      Yes |        Yes | Link if `trainingDelivery.batch.read`.                       |
| Course       | `courseCode`, localized name |      Yes |        Yes | Read-only link if permitted.                                 |
| Branch       | `branch.code/name`           |      Yes |        Yes | Hidden when single branch.                                   |
| Trainer      | Trainer name                 |      Yes |        Yes | Show inactive warning if inactive after schedule date.       |
| Classroom    | Classroom code/name          |      Yes |        Yes | Show capacity.                                               |
| Conflicts    | Derived                      |       No |        Yes | Count by type.                                               |
| Attendance   | Attendance linkage           |       No |        Yes | `Not Created`, `Ready`, `Marked`, `Locked`.                  |
| Updated At   | `updatedAt`                  |      Yes |         No | Tooltip shows updater.                                       |
| Actions      | Derived                      |       No |         No | View, Edit, Publish, Cancel, Audit.                          |

### Bulk Actions

| Action                | Permission                   | Eligibility                                                                 |
| --------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| Publish Selected      | `scheduling.session.publish` | Selected rows must be Draft or Conflict-resolved and pass fresh validation. |
| Cancel Selected       | `scheduling.session.cancel`  | Rows must not be Completed or Attendance Locked. Reason required.           |
| Re-run Conflict Check | `scheduling.conflict.check`  | Any non-deleted row.                                                        |
| Export Selected       | `scheduling.session.export`  | Any visible row.                                                            |

### Dynamic UI States

| State                   | Behavior                                                             |
| ----------------------- | -------------------------------------------------------------------- |
| Initial Loading         | Show table skeleton with 10 rows.                                    |
| No Results              | Show empty state with clear filters button.                          |
| Bulk Validation Failure | Show modal with successful and failed row counts, listing failures.  |
| Permission Hidden       | Bulk checkbox column hidden if no bulk action permission.            |
| Stale Data              | Show refresh banner if server returns changed version during action. |

---

## 4.4 SCH-ADM-004 – Create Single Schedule Session

### Purpose

Allows authorized coordinators to create one draft schedule session after validating batch, trainer, classroom, date, time, calendar, holiday, venue block, and availability constraints.

### Layout & Grid Structure

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Page Header: Create Schedule Session | Save Draft | Validate | Publish      │
├───────────────────────────────┬────────────────────────────────────────────┤
│ Left 65%: Session Form         │ Right 35%: Live Validation & Batch Summary │
├───────────────────────────────┴────────────────────────────────────────────┤
│ Bottom: Conflict Details, Related Sessions, Audit notice                    │
└────────────────────────────────────────────────────────────────────────────┘
```

### Input Form Fields

| Field            | Type              |   Mandatory | Validation                                                                                                       |
| ---------------- | ----------------- | ----------: | ---------------------------------------------------------------------------------------------------------------- | ------------------- |
| `branchId`       | Select            |         Yes | Must be accessible branch. Auto-derived from selected batch when batch selected.                                 |
| `batchId`        | Async select      |         Yes | Active, Planned, Open, or Active batch only; must not be soft deleted; branch-scoped.                            |
| `courseId`       | Read-only derived |         Yes | Derived from batch; cannot be manually changed.                                                                  |
| `sessionNumber`  | Number            |         Yes | Integer between `1` and `999`; unique within selected batch among non-deleted sessions.                          |
| `title.en`       | Text              |         Yes | Trimmed length `3-150`; regex `^[A-Za-z0-9][A-Za-z0-9 .,&()'/:+\-]{2,149}$`.                                     |
| `title.ar`       | Text              |          No | Trimmed length `0-150`; Arabic Unicode allowed.                                                                  |
| `scheduledDate`  | Date              |         Yes | ISO date; must be within batch `startDate` and `endDate` unless `scheduling.override.batchDateRange`.            |
| `startTime`      | Time              |         Yes | Regex `^([01]\\d                                                                                                 | 2[0-3]):[0-5]\\d$`. |
| `endTime`        | Time              |         Yes | Same format; must be after `startTime`; duration must be at least 15 minutes and at most 8 hours.                |
| `trainerId`      | Async select      |         Yes | Active trainer; must belong to branch or be authorized cross-branch; must be course-authorized where configured. |
| `classroomId`    | Async select      |         Yes | Active classroom in selected branch; capacity warning if enrolled count exceeds capacity.                        |
| `notes`          | Textarea          |          No | Max 1000 chars; no HTML; sanitized on save.                                                                      |
| `overrideReason` | Textarea          | Conditional | Required when override is used; length `20-1000`; cannot contain only whitespace.                                |
| `version`        | Hidden            |          No | Not needed on create.                                                                                            |

### Buttons and Actions

| Button                    | Behavior                                             | Permission                                    |
| ------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| Validate                  | Runs full conflict validation without saving.        | `scheduling.conflict.check`                   |
| Save Draft                | Saves draft if basic validation passes.              | `scheduling.session.create`                   |
| Save Draft with Conflicts | Saves with `Conflict` status if policy allows.       | `scheduling.session.create` + conflict policy |
| Publish Now               | Saves and publishes only if fresh validation passes. | `scheduling.session.publish`                  |
| Cancel                    | Returns to session list.                             | None                                          |

### Live Validation Panel

| Check                    | Pass Message                           | Failure Message                                    |
| ------------------------ | -------------------------------------- | -------------------------------------------------- |
| Branch access            | `Branch access verified.`              | `You cannot schedule sessions for this branch.`    |
| Batch date range         | `Date is within batch period.`         | `Session date is outside the batch date range.`    |
| Working hours            | `Time is within branch working hours.` | `Selected time is outside operating hours.`        |
| Holiday                  | `No active holiday conflict.`          | `Selected date conflicts with holiday or closure.` |
| Venue block              | `No venue block conflict.`             | `Classroom or branch is blocked during this time.` |
| Trainer double booking   | `Trainer is available.`                | `Trainer has another session during this time.`    |
| Classroom double booking | `Classroom is available.`              | `Classroom is already booked.`                     |
| Batch overlap            | `Batch has no overlapping session.`    | `Batch has another session during this time.`      |
| Trainer availability     | `Trainer availability matches.`        | `Trainer availability does not cover this slot.`   |

### Dynamic UI States

| State                  | Behavior                                                          |
| ---------------------- | ----------------------------------------------------------------- |
| Batch Not Selected     | Disable trainer, classroom, date/time fields except branch.       |
| Validation Running     | Show spinner in validation panel and disable publish.             |
| Validation Failed      | Keep Save Draft if allowed; disable Publish.                      |
| Override Available     | Show override checkbox only for conflict types user can override. |
| Override Not Available | Show conflict as blocking with permission requirement.            |
| Successful Save        | Navigate to session detail or list based on user preference.      |

---

## 4.5 SCH-ADM-005 – Edit / Reschedule Session

### Purpose

Allows authorized users to update a draft or published session, while enforcing status rules, conflict checks, audit reason capture, and optimistic locking.

### Layout & Grid Structure

Same as Create Single Schedule Session with an additional top audit banner:

```text
Session: SCH-2026-00045 | Status: Published | Version: 7 | Last updated by ...
```

### Input Fields

All create fields apply, plus:

| Field                 | Type     |   Mandatory | Validation                                                                                                                              |
| --------------------- | -------- | ----------: | --------------------------------------------------------------------------------------------------------------------------------------- |
| `scheduleSessionId`   | Hidden   |         Yes | Existing, branch-scoped, not soft deleted.                                                                                              |
| `changeReason`        | Textarea | Conditional | Required for Published session changes, cancellations, overrides, trainer change, classroom change, date/time change. Length `20-1000`. |
| `notifyAffectedUsers` | Checkbox |          No | Visible only if Communication module integration is enabled. Default false in Phase 1.                                                  |
| `version`             | Hidden   |         Yes | Must match current version.                                                                                                             |

### Editable Field Rules by Status

| Status    | Editable Fields                              | Rules                                                           |
| --------- | -------------------------------------------- | --------------------------------------------------------------- |
| Draft     | All scheduling fields                        | Full update allowed with validation.                            |
| Conflict  | All scheduling fields                        | Must re-run conflict check before publish.                      |
| Published | Date, time, trainer, classroom, title, notes | Requires reason and fresh conflict validation.                  |
| Cancelled | Notes only for authorized audit users        | Cannot be republished directly; create new replacement session. |
| Completed | Notes only for authorized audit users        | Scheduling fields locked.                                       |
| Expired   | Notes only                                   | Operational changes blocked.                                    |

### Actions

| Action                | Permission                      | Behavior                                                              |
| --------------------- | ------------------------------- | --------------------------------------------------------------------- |
| Save Changes          | `scheduling.session.update`     | Updates draft/conflict sessions.                                      |
| Reschedule Published  | `scheduling.session.reschedule` | Requires reason and conflict-free target slot or authorized override. |
| Publish               | `scheduling.session.publish`    | Available for Draft/Conflict-resolved sessions.                       |
| Cancel Session        | `scheduling.session.cancel`     | Opens reason dialog.                                                  |
| Re-run Conflict Check | `scheduling.conflict.check`     | Updates conflict status.                                              |
| View Audit            | `scheduling.audit.read`         | Opens audit tab/drawer.                                               |

### Dynamic UI States

| State             | Behavior                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Version Conflict  | Show blocking modal: `This session was updated by another user.` Options: reload, copy unsaved values. |
| Attendance Locked | Disable date/time/trainer/classroom if attendance is marked and locked.                                |
| Completed Session | Render read-only schedule fields.                                                                      |
| Publish Failed    | Show conflict list with exact conflicting sessions/blocks.                                             |

---

## 4.6 SCH-ADM-006 – Session Detail & Audit

### Purpose

Displays full schedule session information, state, dependencies, conflict history, attendance readiness, and audit trail.

### Layout & Grid Structure

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Header: Session Detail | Status | Actions                                  │
├───────────────────────────────┬────────────────────────────────────────────┤
│ Left: Core details             │ Right: Status, validations, dependency map │
├────────────────────────────────────────────────────────────────────────────┤
│ Tabs: Overview | Conflicts | Attendance Link | Audit | Change History       │
└────────────────────────────────────────────────────────────────────────────┘
```

### Detail Fields

| Field                    | Display                                                                |
| ------------------------ | ---------------------------------------------------------------------- |
| Session ID               | Internal identifier hidden by default; visible to support/audit users. |
| Session Number           | `Session 4` style.                                                     |
| Title                    | Locale-specific title.                                                 |
| Course                   | Course code and name.                                                  |
| Batch                    | Batch code and name.                                                   |
| Branch                   | Branch code and name.                                                  |
| Date and Time            | Localized date, 24-hour time.                                          |
| Trainer                  | Full name, trainer code, status.                                       |
| Classroom                | Code, name, capacity, location.                                        |
| Status                   | Badge.                                                                 |
| Conflict Checked         | Yes/No, timestamp, checked by.                                         |
| Overrides                | Type, reason, approved by, approved at.                                |
| Attendance Link          | Attendance session status where available.                             |
| Created/Updated Metadata | Created by/at, updated by/at, version.                                 |

### Tabs and Tables

#### Conflicts Tab

| Column             | Sort | Filter | Description                                                                 |
| ------------------ | ---: | -----: | --------------------------------------------------------------------------- |
| Conflict Type      |  Yes |    Yes | Trainer, Classroom, Batch, Holiday, VenueBlock, WorkingHours, Availability. |
| Severity           |  Yes |    Yes | Blocking, Warning, OverrideAllowed.                                         |
| Conflicting Entity |   No | Search | Linked entity if accessible.                                                |
| Date/Time Window   |  Yes |     No | Conflict window.                                                            |
| Resolution Status  |  Yes |    Yes | Open, Resolved, Overridden, IgnoredAsDraft.                                 |
| Reason             |   No |     No | Override or resolution reason.                                              |

#### Audit Tab

| Column       | Sort |        Filter | Description                                               |
| ------------ | ---: | ------------: | --------------------------------------------------------- |
| Performed At |  Yes |    Date range | Timestamp.                                                |
| Performed By |  Yes |   User filter | Actor.                                                    |
| Action       |  Yes | Action filter | Created, Updated, Published, Cancelled, OverrideApproved. |
| Old Value    |   No |            No | JSON diff viewer.                                         |
| New Value    |   No |            No | JSON diff viewer.                                         |
| Reason       |   No |        Search | Required for sensitive changes.                           |
| IP Address   |   No |            No | Visible to audit users only.                              |

---

## 4.7 SCH-ADM-007 – Recurring Schedule Generator

### Purpose

Generates multiple draft sessions for a batch using recurrence rules and validates each generated candidate.

### Layout & Grid Structure

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Header: Recurring Schedule Generator                                       │
├───────────────────────────────┬────────────────────────────────────────────┤
│ Left: Recurrence Form          │ Right: Batch, Trainer, Classroom Summary   │
├────────────────────────────────────────────────────────────────────────────┤
│ Preview Table: Candidate sessions with validation results                   │
├────────────────────────────────────────────────────────────────────────────┤
│ Footer: Validate All | Save Valid Drafts | Save All Conflict Drafts         │
└────────────────────────────────────────────────────────────────────────────┘
```

### Input Form Fields

| Field                    | Type         |   Mandatory | Validation                                                                                     |
| ------------------------ | ------------ | ----------: | ---------------------------------------------------------------------------------------------- |
| `branchId`               | Select       |         Yes | Accessible branch.                                                                             |
| `batchId`                | Async select |         Yes | Batch must be schedulable.                                                                     |
| `trainerId`              | Async select |         Yes | Active trainer.                                                                                |
| `classroomId`            | Async select |         Yes | Active classroom.                                                                              |
| `recurrenceStartDate`    | Date         |         Yes | ISO date; must be <= `recurrenceEndDate`.                                                      |
| `recurrenceEndDate`      | Date         |         Yes | ISO date; date range max 365 days; within batch period unless override.                        |
| `daysOfWeek`             | Multi-select |         Yes | At least one of Monday-Sunday.                                                                 |
| `startTime`              | Time         |         Yes | Valid HH:mm.                                                                                   |
| `endTime`                | Time         |         Yes | Must be after start; duration 15 minutes to 8 hours.                                           |
| `startingSessionNumber`  | Number       |         Yes | Integer `1-999`; must not collide with existing sessions.                                      |
| `sessionTitlePattern.en` | Text         |         Yes | Length `3-150`; may contain `{courseName}`, `{batchCode}`, `{sessionNumber}`, `{date}` tokens. |
| `sessionTitlePattern.ar` | Text         |          No | Length `0-150`; same token support.                                                            |
| `maxSessions`            | Number       |         Yes | Integer `1-120`; default `40`.                                                                 |
| `skipHolidays`           | Checkbox     |          No | Default true.                                                                                  |
| `createConflictDrafts`   | Checkbox     |          No | Visible only when policy allows.                                                               |
| `overrideReason`         | Textarea     | Conditional | Required for authorized override generation.                                                   |

### Candidate Preview Table

| Column            | Sort |    Filter | Behavior                                            |
| ----------------- | ---: | --------: | --------------------------------------------------- |
| Candidate No.     |  Yes |        No | Sequence generated before exclusions.               |
| Session No.       |  Yes |        No | Computed from starting number.                      |
| Date              |  Yes |      Date | Candidate date.                                     |
| Day               |  Yes |       Day | Localized weekday.                                  |
| Time              |  Yes |        No | Start/end.                                          |
| Trainer           |  Yes |   Trainer | Selected trainer.                                   |
| Classroom         |  Yes | Classroom | Selected classroom.                                 |
| Validation Status |  Yes |       Yes | Valid, Warning, Blocking Conflict, Skipped Holiday. |
| Conflict Types    |   No |       Yes | Icons with tooltip.                                 |
| Action            |   No |        No | Exclude/include toggle before save.                 |

### Dynamic UI States

| State                    | Behavior                                                             |
| ------------------------ | -------------------------------------------------------------------- |
| Preview Not Generated    | Show instruction to complete recurrence form and click Validate All. |
| More Than Max Sessions   | Block preview and show exact generated count versus max.             |
| All Candidates Invalid   | Disable Save Valid Drafts and show failure summary.                  |
| Partial Valid            | Enable Save Valid Drafts and show valid/invalid counts.              |
| Save Transaction Failure | Show no rows were created if transaction rolls back.                 |

---

## 4.8 SCH-ADM-008 – Conflict Review Center

### Purpose

Central place to identify, review, resolve, or override schedule conflicts.

### Layout & Grid Structure

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Header: Conflict Review Center | Re-run Checks | Export                    │
├────────────────────────────────────────────────────────────────────────────┤
│ Summary Chips: Trainer | Classroom | Batch | Holiday | Venue | Hours       │
├────────────────────────────────────────────────────────────────────────────┤
│ Conflict Table                                                             │
├────────────────────────────────────────────────────────────────────────────┤
│ Right Drawer: Conflict details and resolution actions                       │
└────────────────────────────────────────────────────────────────────────────┘
```

### Filter Fields

| Field              | Type         | Validation                                                                         |
| ------------------ | ------------ | ---------------------------------------------------------------------------------- |
| `branchId`         | Select       | Accessible branch.                                                                 |
| `dateFrom/dateTo`  | Date range   | Max 366 days.                                                                      |
| `conflictType`     | Multi-select | Trainer, Classroom, Batch, Holiday, VenueBlock, WorkingHours, TrainerAvailability. |
| `severity`         | Multi-select | Blocking, Warning, OverrideAllowed.                                                |
| `resolutionStatus` | Multi-select | Open, Resolved, Overridden, IgnoredAsDraft.                                        |
| `ownerUserId`      | Async select | User in branch context.                                                            |
| `q`                | Text         | Max 100 chars.                                                                     |

### Table Columns

| Column           | Sort |     Filter | Description                                  |
| ---------------- | ---: | ---------: | -------------------------------------------- |
| Severity         |  Yes |        Yes | Badge.                                       |
| Conflict Type    |  Yes |        Yes | Type.                                        |
| Session          |  Yes |     Search | Session number and title.                    |
| Date/Time        |  Yes | Date range | Conflicting period.                          |
| Batch            |  Yes |      Batch | Batch code/name.                             |
| Trainer          |  Yes |    Trainer | If applicable.                               |
| Classroom        |  Yes |  Classroom | If applicable.                               |
| Conflicting With |   No |     Search | Entity name or session.                      |
| Status           |  Yes |        Yes | Open, Resolved, Overridden.                  |
| Last Checked At  |  Yes |         No | Timestamp.                                   |
| Actions          |   No |         No | View, Edit Session, Override, Mark Resolved. |

### Resolution Actions

| Action                 | Permission                         | Validation                                                      |
| ---------------------- | ---------------------------------- | --------------------------------------------------------------- |
| Edit Session           | `scheduling.session.update`        | Opens edit form.                                                |
| Re-run Check           | `scheduling.conflict.check`        | Re-evaluates current data.                                      |
| Override Holiday       | `scheduling.override.holiday`      | Reason required, holiday override allowed only by policy.       |
| Override Venue Block   | `scheduling.override.venueBlock`   | Reason required.                                                |
| Override Working Hours | `scheduling.override.workingHours` | Reason required and branch manager approval.                    |
| Mark Resolved          | `scheduling.conflict.resolve`      | Only if fresh check passes or conflict source no longer active. |

---

## 4.9 SCH-ADM-009 – Business Calendar List

### Purpose

Lists the institute calendar plus branch/year override status per branch and year.

### Layout

Dense table with header actions.

```text
Header: Business Calendars | Create Institute Calendar | Create Branch Override
Filter Bar: Branch, Year, Status, Country
Table
Pagination
```

### Filters

| Field         | Type         | Validation                       |
| ------------- | ------------ | -------------------------------- |
| `branchId`    | Select       | Accessible branch.               |
| `year`        | Number       | Integer `2000-2100`.             |
| `status`      | Multi-select | Draft, Active, Closed, Archived. |
| `countryCode` | Select       | ISO-3166 alpha-2; default `OM`.  |
| `q`           | Text         | Max 100 chars.                   |

### Table Columns

| Column          | Sort | Filter | Notes                                 |
| --------------- | ---: | -----: | ------------------------------------- |
| Year            |  Yes |    Yes | Numeric.                              |
| Calendar Name   |  Yes | Search | Localized display.                    |
| Branch          |  Yes |    Yes | Hidden for single branch.             |
| Country         |  Yes |    Yes | Default Oman.                         |
| Timezone        |  Yes |     No | `Asia/Muscat`.                        |
| Effective Dates |  Yes |   Date | Start/end.                            |
| Operating Days  |   No |     No | Compact weekday chips.                |
| Holidays        |   No |     No | Count of active holidays.             |
| Status          |  Yes |    Yes | Badge.                                |
| Version         |  Yes |     No | Audit-friendly.                       |
| Actions         |   No |     No | View, Edit, Activate, Close, Archive. |

---

## 4.10 SCH-ADM-010 – Business Calendar Create / Edit

### Purpose

Creates and configures the institute business calendar and branch/year overrides with operating days, working hours, effective dates, and lifecycle status.

### Layout

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Header: Create/Edit Business Calendar | Save | Activate | Close | Archive  │
├───────────────────────────────┬────────────────────────────────────────────┤
│ Left: Calendar Metadata        │ Right: Status, validation, dependent data  │
├────────────────────────────────────────────────────────────────────────────┤
│ Operating Days & Working Hours Grid                                         │
└────────────────────────────────────────────────────────────────────────────┘
```

### Input Fields

| Field                | Type           |   Mandatory | Validation                                                                                       |
| -------------------- | -------------- | ----------: | ------------------------------------------------------------------------------------------------ |
| `branchId`           | Select         |         Yes | Accessible active branch. Immutable after creation if holidays/sessions exist.                   |
| `year`               | Number         |         Yes | Integer `2000-2100`; unique active non-deleted calendar by branch/year.                          |
| `name.en`            | Text           |         Yes | Length `3-100`; regex `^[A-Za-z0-9][A-Za-z0-9 .,&()'/-]{2,99}$`.                                 |
| `name.ar`            | Text           |         Yes | Length `3-100`; Arabic Unicode allowed.                                                          |
| `countryCode`        | Select         |         Yes | ISO alpha-2; default `OM`.                                                                       |
| `timezone`           | Select         |         Yes | Default `Asia/Muscat`; Phase 1 only allows `Asia/Muscat` unless super admin config enables more. |
| `effectiveStartDate` | Date           |         Yes | Must overlap selected year.                                                                      |
| `effectiveEndDate`   | Date           |         Yes | Must be after or equal start date; must overlap selected year.                                   |
| `status`             | Status control |         Yes | Draft, Active, Closed, Archived according to transition rules.                                   |
| `changeReason`       | Textarea       | Conditional | Required for status change, working hours reduction, close, archive. Length `20-1000`.           |
| `version`            | Hidden         |   Edit only | Required for update.                                                                             |

### Operating Days Grid

| Field                      | Type        | Validation                               |
| -------------------------- | ----------- | ---------------------------------------- |
| `dayOfWeek`                | Fixed label | Must include Monday-Sunday exactly once. |
| `isOpen`                   | Toggle      | Boolean.                                 |
| `workingHours[].startTime` | Time        | Required if open. Valid HH:mm.           |
| `workingHours[].endTime`   | Time        | Required if open. Must be after start.   |
| `addWindow`                | Button      | Max 3 working windows per day.           |
| `removeWindow`             | Button      | At least 1 window if open.               |

Working hour constraints:

1. No working window may cross midnight.
2. Windows within the same day must not overlap.
3. Minimum open window duration is 30 minutes.
4. Maximum daily working time is 16 hours.
5. Reducing active calendar working hours requires impact check for future published sessions.

### Dynamic UI States

| State                  | Behavior                                                     |
| ---------------------- | ------------------------------------------------------------ |
| Duplicate Calendar     | Block save and show existing calendar link if readable.      |
| Active Calendar Exists | Activation disabled with message.                            |
| Future Session Impact  | Show affected sessions list and require reason/permission.   |
| Archived               | Entire form read-only except audit view.                     |
| Arabic Missing         | Inline error if Arabic name is required by bilingual policy. |

---

## 4.11 SCH-ADM-011 – Holiday Management

### Purpose

Manages holidays, branch closure dates, institute closure dates, and scheduling blackout dates.

### Layout

```text
Header: Holidays | Create Holiday | Import Oman Holidays | Export
Filters: Branch, Calendar, Date Range, Holiday Type, Status
Calendar strip + Dense Table
Drawer: Create/Edit Holiday
```

### Filters

| Field             | Type         | Validation                                                                                            |
| ----------------- | ------------ | ----------------------------------------------------------------------------------------------------- |
| `branchId`        | Select       | Accessible branch.                                                                                    |
| `calendarId`      | Select       | Calendar belongs to selected branch.                                                                  |
| `dateFrom/dateTo` | Date range   | Max 366 days.                                                                                         |
| `holidayType`     | Multi-select | PublicHoliday, BranchClosure, InstituteClosure, TrainingBlackout, ReligiousHoliday, EmergencyClosure. |
| `status`          | Multi-select | Draft, Active, Cancelled, Expired, Archived.                                                          |
| `q`               | Text         | Max 100 chars.                                                                                        |

### Table Columns

| Column            | Sort |     Filter | Display                                |
| ----------------- | ---: | ---------: | -------------------------------------- |
| Date              |  Yes | Date range | Locale date and weekday.               |
| Name              |  Yes |     Search | Localized.                             |
| Type              |  Yes |        Yes | Badge.                                 |
| Calendar          |  Yes |        Yes | Calendar year/name.                    |
| Branch            |  Yes |        Yes | Hidden if single branch.               |
| Full Day          |  Yes |        Yes | Yes/No.                                |
| Time Window       |  Yes |         No | Empty for full day.                    |
| Blocks Scheduling |  Yes |        Yes | Boolean badge.                         |
| Status            |  Yes |        Yes | Badge.                                 |
| Affected Sessions |   No |         No | Count and link to filter.              |
| Actions           |   No |         No | View, Edit, Activate, Cancel, Archive. |

### Holiday Create / Edit Drawer Fields

| Field              | Type     |   Mandatory | Validation                                                                  |
| ------------------ | -------- | ----------: | --------------------------------------------------------------------------- |
| `calendarId`       | Select   |         Yes | Active or Draft calendar; branch-scoped.                                    |
| `branchId`         | Derived  |         Yes | Derived from calendar.                                                      |
| `date`             | Date     |         Yes | Must fall within calendar effective period.                                 |
| `name.en`          | Text     |         Yes | Length `3-100`; no HTML.                                                    |
| `name.ar`          | Text     |         Yes | Length `3-100`; Arabic Unicode allowed.                                     |
| `holidayType`      | Select   |         Yes | Configured lookup value.                                                    |
| `isFullDay`        | Checkbox |         Yes | Boolean.                                                                    |
| `startTime`        | Time     | Conditional | Required when not full day.                                                 |
| `endTime`          | Time     | Conditional | Required when not full day and after start.                                 |
| `blocksScheduling` | Checkbox |         Yes | Default true for closure/blackout.                                          |
| `description.en`   | Textarea |          No | Max 1000 chars.                                                             |
| `description.ar`   | Textarea |          No | Max 1000 chars.                                                             |
| `status`           | Select   |         Yes | Draft, Active, Cancelled.                                                   |
| `changeReason`     | Textarea | Conditional | Required for cancel/archive or active holiday affecting published sessions. |
| `version`          | Hidden   |   Edit only | Required.                                                                   |

### Import Oman Holidays Action

Phase 1 may allow manually maintained seed import from ASTI configuration/master data. It must not call an external public holiday API. Import preview must show date, English name, Arabic name, type, duplicate status, and action.

---

## 4.12 SCH-ADM-013 – Venue Block Management

### Purpose

Manages branch-wide and classroom-specific blocked periods.

### Layout

```text
Header: Venue Blocks | Create Block | Export
Filters
Split View: Calendar overlay + Dense block table
Create/Edit Drawer
```

### Filters

| Field                       | Type         | Validation                                               |
| --------------------------- | ------------ | -------------------------------------------------------- |
| `branchId`                  | Select       | Accessible branch.                                       |
| `classroomId`               | Select       | Classroom belongs to branch; empty means all classrooms. |
| `blockDateFrom/blockDateTo` | Date range   | Max 366 days.                                            |
| `reasonCode`                | Multi-select | Lookup values only.                                      |
| `status`                    | Multi-select | Draft, Active, Cancelled, Expired, Archived.             |
| `scope`                     | Select       | BranchWide, ClassroomSpecific.                           |
| `q`                         | Text         | Max 100 chars.                                           |

### Table Columns

| Column            | Sort |     Filter | Notes                              |
| ----------------- | ---: | ---------: | ---------------------------------- |
| Block Date        |  Yes | Date range | Localized date.                    |
| Scope             |  Yes |        Yes | Branch-wide or classroom-specific. |
| Classroom         |  Yes |        Yes | Empty means branch-wide.           |
| Full Day          |  Yes |        Yes | Yes/No.                            |
| Time              |  Yes |         No | Start/end or `Full day`.           |
| Reason Code       |  Yes |        Yes | Lookup label.                      |
| Reason            |   No |     Search | Localized display.                 |
| Status            |  Yes |        Yes | Badge.                             |
| Affected Sessions |   No |         No | Count.                             |
| Actions           |   No |         No | Edit, Activate, Cancel, Audit.     |

### Venue Block Drawer Fields

| Field          | Type     |   Mandatory | Validation                                                                                         |
| -------------- | -------- | ----------: | -------------------------------------------------------------------------------------------------- |
| `branchId`     | Select   |         Yes | Accessible branch.                                                                                 |
| `scope`        | Radio    |         Yes | `BranchWide` or `ClassroomSpecific`.                                                               |
| `classroomId`  | Select   | Conditional | Required for ClassroomSpecific; must be active and branch-scoped.                                  |
| `blockDate`    | Date     |         Yes | ISO date.                                                                                          |
| `isFullDay`    | Checkbox |         Yes | Boolean.                                                                                           |
| `startTime`    | Time     | Conditional | Required if partial-day.                                                                           |
| `endTime`      | Time     | Conditional | Required if partial-day; after start.                                                              |
| `reasonCode`   | Select   |         Yes | Lookup: Maintenance, Inspection, EmergencyClosure, InternalEvent, PrivateBooking, Cleaning, Other. |
| `reason.en`    | Textarea |         Yes | Length `10-1000`; no HTML.                                                                         |
| `reason.ar`    | Textarea |          No | Length `0-1000`; Arabic Unicode allowed.                                                           |
| `status`       | Select   |         Yes | Draft or Active on create; lifecycle rules apply on edit.                                          |
| `changeReason` | Textarea | Conditional | Required when active block affects published sessions.                                             |
| `version`      | Hidden   |   Edit only | Required.                                                                                          |

### Dynamic UI States

| State                       | Behavior                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| Branch-wide Selected        | Classroom field hidden and cleared.                                                              |
| Classroom-specific Selected | Classroom field mandatory.                                                                       |
| Conflict Found              | Drawer displays affected sessions with links. Activation disabled unless override policy allows. |
| Cancel Active Block         | Reason dialog required.                                                                          |
| Expired Block               | Edit disabled except audit notes if permitted.                                                   |

---

## 4.13 SCH-ADM-015 – Trainer Availability Calendar

### Purpose

Shows trainer availability, assigned sessions, potential overload, and scheduling gaps.

### Layout

```text
Header: Trainer Availability | Branch | Date Range | Trainer Filter
Resource Timeline: trainer rows, date/time columns
Right Drawer: trainer profile, assigned sessions, availability windows
```

### Filters

| Field              | Type         | Validation                                                |
| ------------------ | ------------ | --------------------------------------------------------- |
| `branchId`         | Select       | Accessible branch.                                        |
| `dateFrom/dateTo`  | Date range   | Max 31 days default, max 180 days with report permission. |
| `trainerId`        | Async select | Active or assigned trainer.                               |
| `trainerType`      | Multi-select | FullTime, PartTime, Freelance.                            |
| `courseId`         | Async select | Optional course authorization filter.                     |
| `showUnavailable`  | Boolean      | Default true.                                             |
| `showAssignedOnly` | Boolean      | Default false.                                            |

### Resource Grid Columns / Rows

| UI Area                 | Data                                                    |
| ----------------------- | ------------------------------------------------------- |
| Row Header              | Trainer name, code, type, status, total assigned hours. |
| Timeline Block          | Assigned session.                                       |
| Availability Background | Available hours shaded.                                 |
| Unavailable Background  | Outside availability/working hours.                     |
| Conflict Marker         | Overlap or out-of-availability marker.                  |

### Actions

| Action                           | Permission                  | Behavior                          |
| -------------------------------- | --------------------------- | --------------------------------- |
| Create Session in Available Slot | `scheduling.session.create` | Prefills trainer/date/time.       |
| View Trainer Profile             | `trainer.read`              | Opens trainer profile if allowed. |
| Export Availability              | `scheduling.reports.export` | CSV/PDF.                          |

---

## 4.14 SCH-ADM-016 – Classroom Utilization Calendar

### Purpose

Shows room occupancy, available classrooms, branch-wide blocks, and classroom-specific blocks.

### Layout

Resource timeline where rows are classrooms and columns are time.

### Filters

| Field               | Type         | Validation                        |
| ------------------- | ------------ | --------------------------------- |
| `branchId`          | Select       | Accessible branch.                |
| `dateFrom/dateTo`   | Date range   | Max 31 days default.              |
| `classroomId`       | Multi-select | Active classrooms in branch.      |
| `capacityMin`       | Number       | Integer `1-9999`.                 |
| `capacityMax`       | Number       | Integer `1-9999`, must be >= min. |
| `showVenueBlocks`   | Boolean      | Default true.                     |
| `showAvailableOnly` | Boolean      | Default false.                    |

### Row Fields

| Field          | Display                         |
| -------------- | ------------------------------- |
| Classroom Code | Bold code.                      |
| Name           | Localized name where available. |
| Capacity       | Numeric.                        |
| Location       | Short location.                 |
| Utilization    | Percent in selected range.      |
| Status         | Active/Inactive.                |

### Actions

| Action             | Permission                     | Behavior                     |
| ------------------ | ------------------------------ | ---------------------------- |
| Create Session     | `scheduling.session.create`    | Prefills classroom and slot. |
| Create Venue Block | `scheduling.venueBlock.create` | Opens venue block drawer.    |
| Export Room Plan   | `scheduling.reports.export`    | Exports selected view.       |

---

## 4.15 SCH-ADM-017 – Batch Schedule Planner

### Purpose

Provides a batch-centric scheduling workspace.

### Layout

```text
Header: Batch Schedule Planner | Batch Status | Create Session | Recurring Generator
Summary: Course, batch dates, capacity, enrolled count, schedule completion
Tabs: Planned Sessions | Calendar | Conflicts | Attendance Readiness
```

### Batch Summary Fields

| Field                    | Source                 |
| ------------------------ | ---------------------- |
| Batch Code               | Batch aggregate.       |
| Course                   | Course Catalog.        |
| Branch                   | Organization.          |
| Start/End Date           | Batch.                 |
| Max Capacity             | Batch.                 |
| Current Enrollment Count | Batch/Enrollment.      |
| Trainer Assignments      | Training Delivery.     |
| Published Session Count  | Scheduling.            |
| Draft Session Count      | Scheduling.            |
| Conflict Count           | Scheduling validation. |

### Planned Sessions Table

| Column            | Sort |    Filter |
| ----------------- | ---: | --------: |
| Session No.       |  Yes |        No |
| Title             |  Yes |    Search |
| Date              |  Yes |      Date |
| Time              |  Yes |      Time |
| Trainer           |  Yes |   Trainer |
| Classroom         |  Yes | Classroom |
| Status            |  Yes |    Status |
| Attendance Status |  Yes |    Status |
| Actions           |   No |        No |

---

## 4.16 SCH-ADM-018 – Daily Operations Board

### Purpose

Reception-friendly screen showing today’s official timetable, room allocations, cancellations, and notices.

### Layout

```text
Full-screen optional mode
Top: Branch, Date, Current Time, Refresh
Left: Time-ordered session list
Right: Room occupancy and alerts
Bottom: Holiday/closure notices
```

### Behavior

| Feature                    | Specification                                              |
| -------------------------- | ---------------------------------------------------------- |
| Auto Refresh               | Optional 60-second refresh; no background job assumption.  |
| Read-Only                  | Default for reception users.                               |
| Date Navigation            | Previous, Today, Next.                                     |
| Highlight Current Sessions | Sessions where current Oman time is between start and end. |
| Cancelled Visibility       | Cancelled sessions shown in separate section if today.     |
| Print View                 | A4 daily board print if `scheduling.dailyBoard.print`.     |

### Table Columns

| Column    | Sort |    Filter |
| --------- | ---: | --------: |
| Time      |  Yes |        No |
| Classroom |  Yes | Classroom |
| Course    |  Yes |    Course |
| Batch     |  Yes |     Batch |
| Trainer   |  Yes |   Trainer |
| Status    |  Yes |    Status |
| Notes     |   No |    Search |

---

## 4.17 SCH-ADM-019 – Schedule Import Preview

### Purpose

Allows authorized users to validate uploaded schedule rows before session creation. Phase 1 import is optional but specified to avoid ad-hoc data entry bypass.

### Layout

```text
Step 1 Upload File
Step 2 Map Columns
Step 3 Validate Rows
Step 4 Confirm Create Drafts
```

### Accepted File Rules

| Rule             | Specification                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| File Type        | `.csv` or `.xlsx`.                                                                                                 |
| Max File Size    | 5 MB.                                                                                                              |
| Max Rows         | 500 rows per import.                                                                                               |
| Encoding         | UTF-8 for CSV.                                                                                                     |
| Required Columns | BranchCode, BatchCode, SessionNumber, TitleEnglish, ScheduledDate, StartTime, EndTime, TrainerCode, ClassroomCode. |
| Optional Columns | TitleArabic, Notes, SkipHolidayOverrideReason.                                                                     |

### Import Row Validations

| Column          | Validation                                                                            |
| --------------- | ------------------------------------------------------------------------------------- |
| `BranchCode`    | Existing accessible branch; max 30 chars; uppercase letters/digits/hyphen/underscore. |
| `BatchCode`     | Existing batch in branch.                                                             |
| `SessionNumber` | Integer `1-999`; unique within batch and import file.                                 |
| `TitleEnglish`  | Required, length `3-150`.                                                             |
| `TitleArabic`   | Optional, length `0-150`.                                                             |
| `ScheduledDate` | ISO date or recognized Excel date converted to ISO.                                   |
| `StartTime`     | HH:mm.                                                                                |
| `EndTime`       | HH:mm and after StartTime.                                                            |
| `TrainerCode`   | Active trainer code.                                                                  |
| `ClassroomCode` | Active classroom code in branch.                                                      |
| `Notes`         | Optional max 1000 chars.                                                              |

### Preview Table Columns

| Column            | Behavior                            |
| ----------------- | ----------------------------------- |
| Row No.           | Original row number.                |
| Parsed Values     | Normalized values.                  |
| Validation Status | Valid, Warning, Error.              |
| Error Details     | Exact field errors.                 |
| Conflict Details  | Conflict types and related records. |
| Action            | Include/exclude valid rows.         |

---

## 4.18 SCH-ADM-020 – Schedule Settings

### Purpose

Configures module-level limits and validation behavior for scheduling.

### Layout

Settings grouped into cards.

```text
Cards: General, Recurrence, Conflict Policy, Overrides, Daily Board, Import
```

### Settings Fields

| Field                              | Type    | Validation                            | Default                            |
| ---------------------------------- | ------- | ------------------------------------- | ---------------------------------- |
| `defaultTimezone`                  | Select  | Phase 1 `Asia/Muscat`.                | `Asia/Muscat`                      |
| `minimumSessionMinutes`            | Number  | Integer `15-480`.                     | `30`                               |
| `maximumSessionMinutes`            | Number  | Integer `30-480`; must be >= minimum. | `240`                              |
| `maxRecurringSessions`             | Number  | Integer `1-120`.                      | `40`                               |
| `allowConflictDrafts`              | Boolean | Boolean.                              | `true`                             |
| `allowHolidayOverride`             | Boolean | Boolean.                              | `false` unless management enables. |
| `allowVenueBlockOverride`          | Boolean | Boolean.                              | `false` unless management enables. |
| `allowWorkingHoursOverride`        | Boolean | Boolean.                              | `false` unless management enables. |
| `requireReasonForPublishedChanges` | Boolean | Boolean.                              | `true`                             |
| `dailyBoardRefreshSeconds`         | Number  | Integer `30-300`.                     | `60`                               |
| `importMaxRows`                    | Number  | Integer `1-500`.                      | `500`                              |

Settings changes must be audited and branch-scoped when branch-specific, or global when system-level.

---

## 4.19 SCH-ADM-021 – Schedule Audit Log

### Purpose

Displays audit events for scheduling entities.

### Filters

| Field                | Type            | Validation                                                                                    |
| -------------------- | --------------- | --------------------------------------------------------------------------------------------- |
| `branchId`           | Select          | Accessible branch or consolidated permission.                                                 |
| `entityType`         | Multi-select    | BusinessCalendar, Holiday, VenueBlock, ScheduleSession, ConflictResolution, ScheduleSettings. |
| `entityId`           | Text            | UUID/CUID pattern where used.                                                                 |
| `action`             | Multi-select    | Created, Updated, Published, Cancelled, Archived, SoftDeleted, OverrideApproved.              |
| `performedBy`        | User select     | User must be visible to requester.                                                            |
| `performedAtFrom/To` | Date/time range | From <= To.                                                                                   |
| `q`                  | Text            | Max 100 chars.                                                                                |

### Table Columns

| Column           | Sort |     Filter |
| ---------------- | ---: | ---------: |
| Performed At     |  Yes | Date range |
| Entity Type      |  Yes |        Yes |
| Entity Reference |   No |     Search |
| Action           |  Yes |        Yes |
| Performed By     |  Yes |        Yes |
| Branch           |  Yes |        Yes |
| Reason           |   No |     Search |
| Old/New Diff     |   No |         No |
| IP Address       |   No |         No |

### Diff Viewer

The diff viewer must render changed fields with old and new values. Sensitive fields should be masked according to audit policy. Scheduling module values are generally non-financial, but user IDs, IP addresses, and internal IDs should be visible only to audit-authorized users.

---

## 4.20 SCH-ADM-022 – Schedule Reports

### Purpose

Provides operational reporting for schedule volume, utilization, cancellation trends, conflict trends, and trainer/classroom usage.

### Report Tabs

| Tab                   | Metrics                                                        |
| --------------------- | -------------------------------------------------------------- |
| Schedule Volume       | Sessions by branch, course, batch, trainer, classroom, status. |
| Classroom Utilization | Occupied minutes, available minutes, utilization percentage.   |
| Trainer Utilization   | Assigned minutes, availability minutes, overload markers.      |
| Conflict Trends       | Conflicts by type, severity, branch, resolver.                 |
| Cancellation Trends   | Cancelled sessions by reason, branch, course, trainer.         |
| Holiday Impact        | Sessions skipped or overridden due to holiday/closure.         |

### Report Filters

| Field             | Type                | Validation                                      |
| ----------------- | ------------------- | ----------------------------------------------- |
| `branchId`        | Select/multi-select | Multi-branch only with consolidated permission. |
| `dateFrom/dateTo` | Date range          | Max 2 years with report permission.             |
| `courseId`        | Async select        | Optional.                                       |
| `batchId`         | Async select        | Optional.                                       |
| `trainerId`       | Async select        | Optional.                                       |
| `classroomId`     | Async select        | Optional.                                       |
| `status`          | Multi-select        | Optional.                                       |

Export requires `scheduling.reports.export`.

---

## 5. Trainer Portal Screen Details

## 5.1 SCH-TRN-001 – My Teaching Schedule

### Purpose

Allows trainers to view assigned published sessions and relevant changes.

### Layout

```text
Header: My Teaching Schedule | Date Range | View Mode
KPI Row: Today Sessions | This Week Hours | Upcoming Sessions
Calendar/List toggle
```

### Filters

| Field             | Type              | Validation                        |
| ----------------- | ----------------- | --------------------------------- |
| `dateFrom/dateTo` | Date range        | Max 180 days.                     |
| `viewMode`        | Segmented control | List, Week, Month.                |
| `batchId`         | Select            | Only batches assigned to trainer. |
| `status`          | Multi-select      | Published, Cancelled, Completed.  |

### Table Columns

| Column               | Sort |     Filter |
| -------------------- | ---: | ---------: |
| Date                 |  Yes | Date range |
| Time                 |  Yes |         No |
| Course               |  Yes |     Course |
| Batch                |  Yes |      Batch |
| Classroom            |  Yes |  Classroom |
| Branch               |  Yes |     Branch |
| Status               |  Yes |     Status |
| Attendance Readiness |  Yes |     Status |
| Actions              |   No |         No |

### Permission Rules

Trainer can only view sessions where `trainerId` maps to their `Person` / `TrainerProfile`. Trainers must not view other trainers’ schedules unless granted admin permissions.

---

## 5.2 SCH-TRN-002 – Trainer Session Detail

### Fields

| Field             | Display                                         |
| ----------------- | ----------------------------------------------- |
| Course            | Course name.                                    |
| Batch             | Batch code/name.                                |
| Session Title     | Localized title.                                |
| Date/Time         | Localized date and 24-hour time.                |
| Classroom         | Branch, classroom, location.                    |
| Enrolled Count    | Count from enrollment/batch where available.    |
| Attendance Status | Not ready, ready, marked, locked.               |
| Notes             | Coordinator notes.                              |
| Change Notices    | Cancellation/reschedule notice where available. |

### Actions

| Action          | Permission                      | Behavior                                                       |
| --------------- | ------------------------------- | -------------------------------------------------------------- |
| Report Issue    | `trainer.schedule.issue.create` | Opens issue request drawer.                                    |
| Open Attendance | `attendance.mark`               | Navigates to attendance module if attendance session is ready. |

---

## 5.3 SCH-TRN-004 – Schedule Issue Request Drawer

### Fields

| Field                     | Type     |   Mandatory | Validation                                                             |
| ------------------------- | -------- | ----------: | ---------------------------------------------------------------------- |
| `scheduleSessionId`       | Hidden   |         Yes | Must belong to trainer.                                                |
| `issueType`               | Select   |         Yes | TrainerUnavailable, ClassroomIssue, TimingIssue, BatchMismatch, Other. |
| `description`             | Textarea |         Yes | Length `20-1000`; no HTML.                                             |
| `preferredResolutionDate` | Date     |          No | Cannot be before current Oman date.                                    |
| `preferredStartTime`      | Time     | Conditional | Required if preferred date is supplied with time.                      |
| `preferredEndTime`        | Time     | Conditional | Must be after preferred start.                                         |

Output: Creates an internal schedule issue record or audit/comment entry for coordinator review. It does not directly change the official schedule.

---

## 6. Student Portal Screen Details

## 6.1 SCH-STU-001 – My Class Schedule

### Purpose

Allows students to view published sessions for their active enrollments.

### Layout

```text
Header: My Class Schedule | Course Filter | Date Range
Cards/List/Calendar toggle
Upcoming session highlight
```

### Filters

| Field             | Type              | Validation                        |
| ----------------- | ----------------- | --------------------------------- |
| `enrollmentId`    | Select            | Must belong to logged-in student. |
| `courseId`        | Select            | Courses from active enrollments.  |
| `dateFrom/dateTo` | Date range        | Max 365 days.                     |
| `viewMode`        | Segmented control | List, Week, Month.                |

### Table/List Fields

| Field         | Display                                                                   |
| ------------- | ------------------------------------------------------------------------- |
| Date          | Localized.                                                                |
| Time          | 24-hour format.                                                           |
| Course        | Localized course name.                                                    |
| Batch         | Batch name/code.                                                          |
| Session Title | Localized title.                                                          |
| Trainer       | Trainer display name when allowed.                                        |
| Classroom     | Classroom and branch location.                                            |
| Status        | Published, Cancelled, Completed.                                          |
| Notice        | Holiday override, venue change, cancellation reason when student-visible. |

### Permission Rules

Students can only view sessions for enrollments linked to their own StudentProfile. They cannot see draft sessions, conflict sessions, internal notes, venue blocks, trainer availability, or audit logs.

---

## 6.2 SCH-STU-002 – Student Session Detail

### Fields

| Field         | Display Rule                                    |
| ------------- | ----------------------------------------------- |
| Course        | Localized course name.                          |
| Batch         | Student-facing batch name.                      |
| Session Title | Localized title.                                |
| Date and Time | Localized date and time.                        |
| Branch        | Branch name and address if configured.          |
| Classroom     | Classroom name/location.                        |
| Trainer       | Trainer name if display policy allows.          |
| Status        | Published, Cancelled, Completed.                |
| Notice        | Student-safe reschedule or cancellation notice. |

No edit actions are available.

---

## 6.3 SCH-STU-003 – Academic Calendar

### Purpose

Displays holidays, closures, and training blackout dates relevant to the student's enrolled branch and active enrollments.

### Layout

Month calendar with list sidebar.

### Filters

| Field         | Type         | Validation                                                        |
| ------------- | ------------ | ----------------------------------------------------------------- |
| `branchId`    | Select       | Branches from student's active enrollments only.                  |
| `month`       | Month picker | Within visible academic year.                                     |
| `holidayType` | Multi-select | PublicHoliday, BranchClosure, InstituteClosure, TrainingBlackout. |

### Display Rules

1. Show only Active holidays/closures.
2. Do not show draft/cancelled/internal blackout notes unless student-visible.
3. Arabic locale displays RTL calendar layout and Arabic holiday names where available.

---

## 7. Dynamic UI States and Error Handling

### 7.1 Form Validation Error States

| Error Code       | UI Message                                                       | Applies To           | Behavior                                    |
| ---------------- | ---------------------------------------------------------------- | -------------------- | ------------------------------------------- |
| `SCH-UI-VAL-001` | `This field is required.`                                        | All mandatory fields | Inline below field.                         |
| `SCH-UI-VAL-002` | `Enter time in 24-hour HH:mm format.`                            | Time fields          | Inline and prevents submit.                 |
| `SCH-UI-VAL-003` | `End time must be later than start time.`                        | Time ranges          | Inline and summary banner.                  |
| `SCH-UI-VAL-004` | `Session duration must be between 15 minutes and 8 hours.`       | Session time range   | Inline.                                     |
| `SCH-UI-VAL-005` | `Session date must be within the batch date range.`              | Session date         | Blocking unless override permission exists. |
| `SCH-UI-VAL-006` | `The selected branch is outside your access scope.`              | Branch selection     | Blocking.                                   |
| `SCH-UI-VAL-007` | `A session with this number already exists for the batch.`       | Session number       | Blocking.                                   |
| `SCH-UI-VAL-008` | `Arabic text contains unsupported characters.`                   | Arabic fields        | Inline.                                     |
| `SCH-UI-VAL-009` | `Reason must be at least 20 characters.`                         | Reason fields        | Blocking for sensitive action.              |
| `SCH-UI-VAL-010` | `This record was updated by another user. Reload before saving.` | Versioned edit forms | Blocking modal.                             |
| `SCH-UI-VAL-011` | `The selected classroom does not belong to the selected branch.` | Classroom select     | Blocking.                                   |
| `SCH-UI-VAL-012` | `The selected trainer is not active for this date.`              | Trainer select       | Blocking or warning by policy.              |

### 7.2 Conflict Error States

| Conflict Type                 | Message                                                     | Publish Behavior                                           |
| ----------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| Trainer Double Booking        | `Trainer has another session during the selected time.`     | Block unless override policy allows; generally Must block. |
| Classroom Double Booking      | `Classroom is already booked during the selected time.`     | Block.                                                     |
| Batch Overlap                 | `Batch already has a session during the selected time.`     | Block.                                                     |
| Holiday Conflict              | `Selected date/time falls on an active holiday or closure.` | Block unless authorized holiday override.                  |
| Venue Block Conflict          | `Venue is blocked for the selected date/time.`              | Block unless authorized venue block override.              |
| Working Hours Conflict        | `Selected time is outside branch working hours.`            | Block unless authorized working hours override.            |
| Trainer Availability Conflict | `Trainer availability does not cover the selected slot.`    | Warning or block based on settings.                        |

### 7.3 Loading Skeletons

| Screen Area       | Skeleton Pattern                                               |
| ----------------- | -------------------------------------------------------------- |
| KPI Cards         | Rectangular card skeleton with icon and metric placeholders.   |
| Calendar Grid     | Time grid skeleton with pale blocks matching event dimensions. |
| Tables            | 10 skeleton rows with column-width placeholders.               |
| Forms             | Field label and input skeletons.                               |
| Drawers           | Header skeleton, details rows, action footer skeleton.         |
| Resource Timeline | Row header skeletons and timeline block placeholders.          |

### 7.4 Empty States

| Context                | Empty Message                                                                       | Action                                  |
| ---------------------- | ----------------------------------------------------------------------------------- | --------------------------------------- |
| No Sessions            | `No schedule sessions found for the selected filters.`                              | Show Create Session when permitted.     |
| No Calendar            | `No institute calendar or branch override exists for the selected branch and year.` | Show Create Calendar when permitted.    |
| No Holidays            | `No holidays or closures configured for this calendar.`                             | Show Create Holiday when permitted.     |
| No Venue Blocks        | `No venue blocks configured for the selected period.`                               | Show Create Venue Block when permitted. |
| No Conflicts           | `No unresolved scheduling conflicts found.`                                         | Show Re-run Checks when permitted.      |
| No Trainer Assignments | `No trainers match the selected branch and filters.`                                | Show clear filters.                     |
| No Student Sessions    | `No published sessions are available for your active enrollments.`                  | No admin action.                        |

### 7.5 Permission-Based Element Hiding

| Permission Missing               | Hidden or Disabled Elements                          |
| -------------------------------- | ---------------------------------------------------- |
| `scheduling.session.create`      | Create Session, Recurring Generator, Import Create.  |
| `scheduling.session.update`      | Edit buttons and editable fields.                    |
| `scheduling.session.publish`     | Publish buttons and bulk publish.                    |
| `scheduling.session.cancel`      | Cancel buttons.                                      |
| `scheduling.calendar.create`     | Create Institute Calendar.                           |
| `scheduling.calendar.update`     | Calendar edit fields and activation controls.        |
| `scheduling.holiday.create`      | Create Holiday.                                      |
| `scheduling.holiday.update`      | Holiday edit actions.                                |
| `scheduling.venueBlock.create`   | Create Venue Block.                                  |
| `scheduling.venueBlock.update`   | Venue block edit actions.                            |
| `scheduling.override.holiday`    | Holiday override controls.                           |
| `scheduling.override.venueBlock` | Venue block override controls.                       |
| `scheduling.audit.read`          | Audit tabs, audit log page, IP address fields.       |
| `scheduling.reports.export`      | Export buttons.                                      |
| `scheduling.consolidated.view`   | Consolidated branch toggle and multi-branch filters. |

The UI may hide actions, but the API must still enforce permissions server-side for every request.

---

## 8. Bilingual Layout Rules

### 8.1 Language and Direction

| Language | Direction | Primary Font Behavior   | Layout Rule                                                                             |
| -------- | --------- | ----------------------- | --------------------------------------------------------------------------------------- |
| English  | LTR       | Latin-friendly UI font. | Left-aligned labels, left navigation, standard table column order.                      |
| Arabic   | RTL       | Arabic-capable UI font. | Right-aligned labels, mirrored navigation, reversed horizontal layout where meaningful. |

### 8.2 Global RTL Rules

1. Page shell direction must switch using `dir="rtl"` for Arabic and `dir="ltr"` for English.
2. Sidebar navigation must move to the right side in Arabic.
3. Breadcrumb chevrons must reverse direction.
4. Form labels align right in Arabic and left in English.
5. Required asterisk appears near the label text according to direction.
6. Buttons in action groups mirror order, but destructive confirmation buttons must remain visually distinct.
7. Calendar week layout must mirror horizontally in RTL while preserving correct weekday order according to locale configuration.
8. Numeric time values such as `09:00 - 11:00` should remain readable left-to-right using Unicode isolation where needed.
9. Table action menus open toward the viewport-safe side; in RTL default alignment is right.
10. Icons implying direction, such as previous/next arrows, must be mirrored.

### 8.3 Calendar-Specific RTL Rules

| Element                | English LTR                                                     | Arabic RTL                                                 |
| ---------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| Week Header            | Monday to Sunday or configured branch week start left-to-right. | Weekday labels mirrored right-to-left according to locale. |
| Previous Period Button | Left arrow means previous.                                      | Right arrow means previous.                                |
| Next Period Button     | Right arrow means next.                                         | Left arrow means next.                                     |
| Time Axis              | Left side in day/week view.                                     | Right side in day/week view.                               |
| Resource Row Header    | Left frozen column.                                             | Right frozen column.                                       |
| Event Text             | Left aligned.                                                   | Right aligned.                                             |
| Time Text              | Keep numeric LTR inside event card.                             | Keep numeric LTR with text isolation.                      |

### 8.4 Bilingual Data Display Rules

| Field                 | English UI               | Arabic UI                           | Fallback                                                            |
| --------------------- | ------------------------ | ----------------------------------- | ------------------------------------------------------------------- |
| Calendar Name         | `nameLocalized.en`       | `nameLocalized.ar`                  | If Arabic missing, display English with fallback marker for admins. |
| Holiday Name          | `nameLocalized.en`       | `nameLocalized.ar`                  | Student portal falls back silently; admin portal warns.             |
| Session Title         | `title.en`               | `title.ar`                          | If missing, use English.                                            |
| Venue Block Reason    | `reason.en`              | `reason.ar`                         | Use English if Arabic missing.                                      |
| Course Name           | Course English name.     | Course Arabic name if available.    | English.                                                            |
| Branch/Classroom Name | English configured name. | Arabic localized name if available. | English.                                                            |

### 8.5 Input Rules for Bilingual Forms

1. English fields are required where operational reports, exports, and internal support depend on English naming.
2. Arabic fields are required for holidays and business calendar names because these may be student-facing.
3. Arabic fields are optional for internal-only notes unless configured otherwise.
4. Copy-from-English action may be offered for internal records but must not auto-fill Arabic without user action.
5. Textareas must preserve line breaks in both languages.
6. Validation errors must appear in the active UI language.

---

## 9. Accessibility and Usability Requirements

| Requirement ID  | Requirement                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------- |
| UI-SCH-A11Y-001 | All form fields must have accessible labels in English and Arabic.                             |
| UI-SCH-A11Y-002 | Calendar events must be keyboard focusable.                                                    |
| UI-SCH-A11Y-003 | Conflict badges must include text labels, not color-only meaning.                              |
| UI-SCH-A11Y-004 | Error summaries must link to invalid fields.                                                   |
| UI-SCH-A11Y-005 | Modal dialogs must trap focus and close with Escape unless action is destructive confirmation. |
| UI-SCH-A11Y-006 | Dense tables must support keyboard row navigation and visible focus states.                    |
| UI-SCH-A11Y-007 | RTL mode must preserve screen-reader reading order.                                            |
| UI-SCH-A11Y-008 | Loading skeletons must expose `aria-busy="true"` and not be announced as real data.            |

---

## 10. Responsive Behavior

| Breakpoint               | Behavior                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Desktop `>= 1280px`      | Full dense dashboard, side-by-side form and validation panels, resource timelines enabled.                                  |
| Laptop `1024px - 1279px` | Dashboard remains two-column; tables horizontally scroll where required.                                                    |
| Tablet `768px - 1023px`  | KPI cards wrap; validation panels move below form; calendar view defaults to day/week.                                      |
| Mobile `< 768px`         | Admin scheduling management is limited but readable; dense tables become card lists; create/edit screens use stacked forms. |

Admin operational scheduling is optimized for desktop and laptop use. Student and trainer portal screens must be fully usable on mobile.

---

## 11. API Interaction Expectations from UI

The UI must call module APIs using server-side branch context and must not trust route or dropdown branch values alone.

| UI Operation          | Expected API Behavior                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| Load sessions         | Server filters by branch access and permissions.                                                            |
| Create draft session  | Server validates batch/course/branch/trainer/classroom/time and returns created draft or validation errors. |
| Validate session      | Server returns structured validation results by conflict type.                                              |
| Publish session       | Server re-runs all validations before status transition.                                                    |
| Reschedule session    | Server requires version, reason, permission, and conflict checks.                                           |
| Create holiday        | Server validates calendar scope and impact on published sessions.                                           |
| Create venue block    | Server validates overlap and affected sessions.                                                             |
| Export reports        | Server enforces export and consolidated-reporting permissions.                                              |
| View student schedule | Server returns only published sessions for the logged-in student’s enrollments.                             |
| View trainer schedule | Server returns only sessions assigned to logged-in trainer unless admin permission exists.                  |

---

## 12. Screen-to-Requirement Traceability

| Screen ID   | Key Functional Requirements Supported                                  |
| ----------- | ---------------------------------------------------------------------- |
| SCH-ADM-001 | FR-SCH-005, FR-SCH-006, FR-SCH-018, FR-SCH-019, FR-SCH-026, FR-SCH-031 |
| SCH-ADM-002 | FR-SCH-013, FR-SCH-014, FR-SCH-018, FR-SCH-019, FR-SCH-020             |
| SCH-ADM-003 | FR-SCH-013, FR-SCH-014, FR-SCH-016, FR-SCH-017, FR-SCH-021             |
| SCH-ADM-004 | FR-SCH-013, FR-SCH-018, FR-SCH-019, FR-SCH-020                         |
| SCH-ADM-005 | FR-SCH-016, FR-SCH-017, FR-SCH-018, FR-SCH-019, FR-SCH-020             |
| SCH-ADM-006 | FR-SCH-014, FR-SCH-016, FR-SCH-017, FR-SCH-028, FR-SCH-029             |
| SCH-ADM-007 | FR-SCH-015, FR-SCH-018, FR-SCH-019, FR-SCH-020                         |
| SCH-ADM-008 | FR-SCH-006, FR-SCH-008, FR-SCH-012, FR-SCH-018, FR-SCH-019, FR-SCH-020 |
| SCH-ADM-009 | FR-SCH-001, FR-SCH-002, FR-SCH-004                                     |
| SCH-ADM-010 | FR-SCH-001, FR-SCH-002, FR-SCH-003, FR-SCH-004                         |
| SCH-ADM-011 | FR-SCH-005, FR-SCH-006, FR-SCH-007, FR-SCH-008                         |
| SCH-ADM-013 | FR-SCH-009, FR-SCH-010, FR-SCH-011, FR-SCH-012                         |
| SCH-ADM-015 | FR-SCH-018, FR-SCH-020, FR-SCH-023                                     |
| SCH-ADM-016 | FR-SCH-019, FR-SCH-024                                                 |
| SCH-ADM-017 | FR-SCH-013, FR-SCH-014, FR-SCH-015, FR-SCH-016                         |
| SCH-ADM-018 | FR-SCH-026, FR-SCH-027                                                 |
| SCH-ADM-019 | FR-SCH-013, FR-SCH-015, FR-SCH-018, FR-SCH-019, FR-SCH-020             |
| SCH-ADM-020 | FR-SCH-030                                                             |
| SCH-ADM-021 | FR-SCH-028, FR-SCH-029                                                 |
| SCH-ADM-022 | FR-SCH-031, FR-SCH-032                                                 |
| SCH-TRN-001 | FR-SCH-022, FR-SCH-026                                                 |
| SCH-TRN-002 | FR-SCH-022, FR-SCH-026                                                 |
| SCH-TRN-004 | FR-SCH-022, FR-SCH-029                                                 |
| SCH-STU-001 | FR-SCH-025, FR-SCH-026                                                 |
| SCH-STU-002 | FR-SCH-025                                                             |
| SCH-STU-003 | FR-SCH-005, FR-SCH-025                                                 |

---

## 13. Final UI Design Notes

1. Scheduling operations must remain fast and transparent. Users should understand why a slot is valid or invalid before they save.
2. The UI must treat conflict validation as a first-class feature, not as a generic error after submission.
3. Admin portal must remain dense and data-rich, because scheduling users work across many sessions, trainers, classrooms, batches, and dates.
4. Trainer and student portals must remain simplified and read-focused, exposing only published and relevant schedule information.
5. Bilingual English/Arabic support must be implemented from the first version for calendar, holiday, and student-visible schedule screens.
6. All sensitive schedule changes must require reason capture and produce audit-ready records.
7. Permission-based hiding improves usability, but it must never replace server-side authorization.
