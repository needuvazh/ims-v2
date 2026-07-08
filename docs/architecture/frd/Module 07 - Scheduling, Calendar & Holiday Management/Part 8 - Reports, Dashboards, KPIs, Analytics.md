# Part 8 - Reports, Dashboards, KPIs, Analytics

## Module 07 – Scheduling, Calendar & Holiday Management

## 1. Document Control

| Field              | Value                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Product            | Al Saud Training Institute Integrated Institute Management System                            |
| Module             | Module 07 – Scheduling, Calendar & Holiday Management                                        |
| Module Code        | SCH                                                                                          |
| Part               | 8 – Reports, Dashboards, KPIs, Analytics                                                     |
| Architecture Style | Next.js modular monolith, server-side branch isolation, PostgreSQL reporting views           |
| Primary Timezone   | Asia/Muscat, Gulf Standard Time UTC+4                                                        |
| Reporting Access   | Permission-based, branch-scoped by default, consolidated only by explicit permission         |
| Languages          | English LTR and Arabic RTL labels for dashboard cards, reports, exports, and filter captions |

---

## 2. Reporting Principles

1. Scheduling reports are operational reports, not the source of truth for scheduling transactions.
2. Scheduling transactions are owned by the Scheduling, Calendar & Holiday Management context through `BusinessCalendar`, `CalendarOperatingDay`, `CalendarWorkingHour`, `Holiday`, `VenueBlock`, `ScheduleSession`, `ScheduleRecurrencePattern`, `ScheduleGenerationRun`, `ScheduleConflictLog`, `ScheduleOverride`, `ScheduleChangeHistory`, and `ScheduleExportLog`.
3. Branch filtering is mandatory for every dashboard, report, export, and KPI. A user can view only assigned branches unless they have `scheduling.report.consolidated.read` or `scheduling.export.consolidated`.
4. All date filters use Oman local dates for user input and display. Database timestamps are stored in UTC.
5. Deleted records are excluded by default. Audit reports may include soft-deleted records only when the user has `scheduling.audit.read`.
6. Published, Rescheduled, Cancelled, and Completed sessions are included in operational reporting. Draft sessions are excluded from official utilization KPIs unless a report explicitly states that draft sessions are included.
7. Override usage must always be measurable and auditable because it represents controlled bypass of standard scheduling rules.
8. Dashboard widgets must degrade gracefully: no permission means hidden widget; no data means empty state; slow response means skeleton; export unavailable means disabled export action with reason.

---

## 3. KPI Catalog

### 3.1 KPI Definitions

| KPI Code    | KPI Name                                  | Purpose                                                             | Formula                                                                                                                                                                 | Default Period     | Data Source                                                     | Permission                              |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------- | --------------------------------------- |
| KPI-SCH-001 | Scheduled Session Count                   | Shows total planned delivery volume.                                | Count of `ScheduleSession` where `status in (Published, Rescheduled, Completed)` and `scheduledDate` within period.                                                     | Today, Week, Month | `reporting.vw_sch_session_fact`                                 | `scheduling.report.session_volume.read` |
| KPI-SCH-002 | Published Session Ratio                   | Measures schedule finalization discipline.                          | Published official sessions / all non-deleted sessions excluding Cancelled × 100.                                                                                       | Month              | `reporting.vw_sch_session_fact`                                 | `scheduling.report.session_volume.read` |
| KPI-SCH-003 | Cancelled Session Rate                    | Tracks operational disruption.                                      | Cancelled sessions / official sessions × 100. Official sessions = Published + Rescheduled + Completed + Cancelled.                                                      | Month              | `reporting.vw_sch_session_fact`                                 | `scheduling.report.session_volume.read` |
| KPI-SCH-004 | Reschedule Rate                           | Tracks schedule instability.                                        | Sessions with `status = Rescheduled` or sessions with reschedule change history / official sessions × 100.                                                              | Month              | `reporting.vw_sch_session_fact`, `reporting.vw_sch_change_fact` | `scheduling.report.conflict.read`       |
| KPI-SCH-005 | Trainer Utilization Percentage            | Measures trainer booked delivery capacity.                          | Total scheduled session minutes assigned to trainer / available trainer minutes × 100. Available minutes come from trainer availability and working hours intersection. | Week, Month        | `reporting.vw_sch_trainer_utilization`                          | `scheduling.report.utilization.read`    |
| KPI-SCH-006 | Classroom Utilization Percentage          | Measures classroom usage efficiency.                                | Total scheduled classroom minutes / branch working classroom minutes × 100.                                                                                             | Week, Month        | `reporting.vw_sch_classroom_utilization`                        | `scheduling.report.utilization.read`    |
| KPI-SCH-007 | Peak Classroom Occupancy                  | Shows highest simultaneous classroom usage.                         | Max count of occupied classrooms in any 30-minute slot / total active classrooms × 100.                                                                                 | Day, Week          | `reporting.mv_sch_30_minute_occupancy`                          | `scheduling.report.utilization.read`    |
| KPI-SCH-008 | Conflict Detection Count                  | Measures number of blocked schedule attempts.                       | Count of conflict log rows grouped by severity and type.                                                                                                                | Week, Month        | `reporting.vw_sch_conflict_fact`                                | `scheduling.report.conflict.read`       |
| KPI-SCH-009 | Conflict Override Rate                    | Tracks exception usage.                                             | Approved overrides / hard and soft conflicts detected × 100.                                                                                                            | Month              | `reporting.vw_sch_override_fact`                                | `scheduling.report.conflict.read`       |
| KPI-SCH-010 | Holiday Compliance Rate                   | Measures prevention of holiday scheduling.                          | 100 - sessions scheduled on active holidays without approved override / sessions checked × 100.                                                                         | Month              | `reporting.vw_sch_holiday_compliance`                           | `scheduling.report.conflict.read`       |
| KPI-SCH-011 | Venue Block Compliance Rate               | Measures prevention of classroom or branch blocked-date scheduling. | 100 - sessions overlapping active venue blocks without approved override / sessions checked × 100.                                                                      | Month              | `reporting.vw_sch_venue_block_compliance`                       | `scheduling.report.conflict.read`       |
| KPI-SCH-012 | Working Hours Compliance Rate             | Measures adherence to configured branch operating hours.            | 100 - sessions outside active working hours without approved override / sessions checked × 100.                                                                         | Month              | `reporting.vw_sch_working_hours_compliance`                     | `scheduling.report.conflict.read`       |
| KPI-SCH-013 | Schedule Lead Time                        | Measures how far in advance sessions are published.                 | Average days between `publishedAt` and `scheduledDate`.                                                                                                                 | Month              | `reporting.vw_sch_session_fact`                                 | `scheduling.report.session_volume.read` |
| KPI-SCH-014 | Same-Day Schedule Change Count            | Measures late operational change volume.                            | Count of changes where `changeDateLocal = scheduledDate` and change type in Cancel, Reschedule, TrainerChanged, ClassroomChanged.                                       | Day, Week          | `reporting.vw_sch_change_fact`                                  | `scheduling.report.conflict.read`       |
| KPI-SCH-015 | Recurring Generation Success Rate         | Measures bulk schedule generation quality.                          | Generation runs with `status = Completed` / all generation runs × 100.                                                                                                  | Month              | `reporting.vw_sch_generation_run_fact`                          | `scheduling.report.session_volume.read` |
| KPI-SCH-016 | Draft Aging Count                         | Shows unfinished scheduling work.                                   | Count of Draft sessions older than configured threshold, default 3 calendar days.                                                                                       | Current            | `reporting.vw_sch_draft_aging`                                  | `scheduling.session.read`               |
| KPI-SCH-017 | Trainer Double-Booking Prevention Count   | Shows prevented hard conflicts for trainer overlap.                 | Count of `ScheduleConflictLog` where `conflictType = TrainerDoubleBooking` and severity = Hard.                                                                         | Month              | `reporting.vw_sch_conflict_fact`                                | `scheduling.report.conflict.read`       |
| KPI-SCH-018 | Classroom Double-Booking Prevention Count | Shows prevented hard conflicts for classroom overlap.               | Count of `ScheduleConflictLog` where `conflictType = ClassroomDoubleBooking` and severity = Hard.                                                                       | Month              | `reporting.vw_sch_conflict_fact`                                | `scheduling.report.conflict.read`       |
| KPI-SCH-019 | Batch Overlap Prevention Count            | Shows prevented batch schedule overlap.                             | Count of `ScheduleConflictLog` where `conflictType = BatchOverlap` and severity = Hard.                                                                                 | Month              | `reporting.vw_sch_conflict_fact`                                | `scheduling.report.conflict.read`       |
| KPI-SCH-020 | Student Timetable Availability Rate       | Measures whether enrolled learners can see official schedules.      | Active enrollments with at least one future published session / active enrollments in active batches × 100.                                                             | Current            | `reporting.vw_sch_student_timetable_coverage`                   | `scheduling.report.session_volume.read` |

### 3.2 KPI Calculation Rules

| Rule ID     | Rule                                                                                                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KCR-SCH-001 | `scheduledDate` filters are interpreted using `Asia/Muscat` local date boundaries from 00:00:00 to 23:59:59.999.                                                                               |
| KCR-SCH-002 | Session duration is calculated as minutes between `startTime` and `endTime`. Overnight sessions are not supported in Phase 1; end time must be greater than start time on the same local date. |
| KCR-SCH-003 | Soft-deleted records are excluded from all operational KPIs. Audit KPIs may include soft-deleted records only through `scheduling.audit.read`.                                                 |
| KCR-SCH-004 | Cancelled sessions are excluded from utilization denominator and numerator unless the widget explicitly reports cancellations.                                                                 |
| KCR-SCH-005 | Rescheduled sessions are counted using the replacement active session for utilization. The cancelled/replaced session is counted only in reschedule and change KPIs.                           |
| KCR-SCH-006 | Trainer utilization must not count sessions where the trainer assignment is null or inactive. Such sessions appear in the Unassigned Trainer operational report.                               |
| KCR-SCH-007 | Classroom utilization must not count online sessions in the classroom numerator. For Phase 1, online delivery is not the default and classroom is expected for physical training sessions.     |
| KCR-SCH-008 | Conflict override rate includes only approved overrides. Rejected overrides are counted separately in the Override Governance report.                                                          |
| KCR-SCH-009 | Consolidated KPIs must show branch breakdown and must not merge branch identities into one opaque total unless a branch group filter is explicitly selected.                                   |
| KCR-SCH-010 | Exported KPI values must include report generation timestamp, generated by, branch scope, filter values, and timezone.                                                                         |

---

## 4. Dashboard Widgets

### 4.1 Admin Scheduling Dashboard

Default route: `/admin/scheduling/dashboard`  
Required menu permission: `menu.scheduling.dashboard`

| Widget ID | Widget Name                | Type              | Description                                                                           | Filters                             | Drilldown                      | Permission                              | Branch Scope                  |
| --------- | -------------------------- | ----------------- | ------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------ | --------------------------------------- | ----------------------------- |
| W-SCH-001 | Today’s Sessions           | Metric Card       | Count of official sessions scheduled today.                                           | Branch, Course, Trainer, Classroom  | Daily Timetable                | `scheduling.view.daily.read`            | Active branch by default      |
| W-SCH-002 | Sessions This Week         | Metric Card       | Count of official sessions from Monday to Sunday in Oman local week.                  | Branch, Course, Status              | Weekly View                    | `scheduling.view.weekly.read`           | Active branch                 |
| W-SCH-003 | Cancelled This Month       | Metric Card       | Count and rate of cancelled sessions in current month.                                | Branch, Cancellation Reason         | Cancelled Sessions Report      | `scheduling.report.session_volume.read` | Active branch                 |
| W-SCH-004 | Open Draft Sessions        | Metric Card       | Draft sessions awaiting publish. Highlights drafts older than 3 days.                 | Branch, Created By, Age             | Draft Aging Report             | `scheduling.session.read`               | Active branch                 |
| W-SCH-005 | Conflict Queue             | Metric Card       | Unresolved conflict logs and conflict drafts.                                         | Branch, Severity, Type              | Conflict Review                | `scheduling.conflict.read`              | Active branch                 |
| W-SCH-006 | Classroom Utilization      | Donut Chart       | Utilized vs available classroom minutes for selected period.                          | Branch, Classroom, Period           | Classroom Utilization Report   | `scheduling.report.utilization.read`    | Active branch or consolidated |
| W-SCH-007 | Trainer Utilization        | Bar Chart         | Top 10 most utilized trainers and underutilized trainers.                             | Branch, Trainer Type, Period        | Trainer Utilization Report     | `scheduling.report.utilization.read`    | Active branch or consolidated |
| W-SCH-008 | Session Volume Trend       | Line Chart        | Daily or weekly session count trend.                                                  | Branch, Course, Batch, Period       | Session Volume Report          | `scheduling.report.session_volume.read` | Active branch                 |
| W-SCH-009 | Override Usage             | Stacked Bar Chart | Approved, rejected, and expired override requests by conflict type.                   | Branch, Conflict Type, Period       | Override Governance Report     | `scheduling.report.conflict.read`       | Active branch                 |
| W-SCH-010 | Holiday and Closure Impact | Timeline          | Upcoming active holidays and branch closures with impacted sessions.                  | Branch, Next 30/60/90 Days          | Holiday Impact Report          | `scheduling.report.holiday.read`        | Active branch                 |
| W-SCH-011 | Venue Blocks               | Table Widget      | Active and upcoming venue blocks that affect classroom availability.                  | Branch, Classroom, Date Range       | Venue Block Report             | `scheduling.venue_block.read`           | Active branch                 |
| W-SCH-012 | Late Schedule Changes      | Table Widget      | Same-day and next-day cancellations or reschedules.                                   | Branch, Course, Trainer, Changed By | Schedule Change Report         | `scheduling.report.conflict.read`       | Active branch                 |
| W-SCH-013 | Recurring Generation Runs  | Table Widget      | Latest schedule generation status and failures.                                       | Branch, Batch, Run Status           | Generation Run Report          | `scheduling.session.bulk_create`        | Active branch                 |
| W-SCH-014 | Branch Comparison          | Matrix            | Compares session count, cancellation rate, utilization, and override usage by branch. | Branch Group, Period                | Consolidated Scheduling Report | `scheduling.report.consolidated.read`   | Consolidated only             |

### 4.2 Trainer Portal Dashboard Widgets

Default route: `/trainer/schedule`  
Required menu permission: `menu.scheduling.trainer_view`

| Widget ID    | Widget Name           | Type        | Description                                                                                    | Filters        | Permission                     | Data Scope                                                          |
| ------------ | --------------------- | ----------- | ---------------------------------------------------------------------------------------------- | -------------- | ------------------------------ | ------------------------------------------------------------------- |
| W-SCH-TR-001 | My Today Schedule     | Timeline    | Current trainer’s official sessions today.                                                     | None, Date     | `scheduling.view.trainer.read` | Trainer’s own assigned sessions only unless admin permission exists |
| W-SCH-TR-002 | My Upcoming Sessions  | List        | Next 10 scheduled sessions with batch, classroom, and timing.                                  | Date Range     | `scheduling.session.read`      | Own sessions                                                        |
| W-SCH-TR-003 | Schedule Changes      | Alert List  | Recent cancellations, reschedules, classroom changes, or timing changes affecting the trainer. | Last 7/30 Days | `scheduling.session.read`      | Own sessions                                                        |
| W-SCH-TR-004 | Monthly Teaching Load | Metric Card | Total official scheduled minutes for current month.                                            | Month          | `scheduling.view.trainer.read` | Own sessions                                                        |
| W-SCH-TR-005 | Classroom Directions  | Detail Card | Classroom, branch, and location notes for next session.                                        | Next Session   | `scheduling.view.trainer.read` | Own sessions                                                        |

### 4.3 Student Portal Dashboard Widgets

Default route: `/student/schedule`  
Required menu permission: `menu.scheduling.batch_view`

| Widget ID    | Widget Name            | Type               | Description                                                      | Filters           | Permission                    | Data Scope                     |
| ------------ | ---------------------- | ------------------ | ---------------------------------------------------------------- | ----------------- | ----------------------------- | ------------------------------ |
| W-SCH-ST-001 | My Next Class          | Metric/Detail Card | Next published session for the student’s active enrollment.      | Active Enrollment | `scheduling.view.batch.read`  | Own enrolled batches only      |
| W-SCH-ST-002 | My Weekly Timetable    | Calendar Grid      | Published sessions for the selected week.                        | Week, Enrollment  | `scheduling.view.weekly.read` | Own enrolled batches only      |
| W-SCH-ST-003 | Schedule Change Alerts | Notification List  | Recent official changes to student’s enrolled batch schedule.    | Last 30 Days      | `scheduling.session.read`     | Own enrolled batches only      |
| W-SCH-ST-004 | Holiday Notices        | Notice List        | Upcoming holidays and branch closures affecting enrolled branch. | Next 90 Days      | `scheduling.holiday.read`     | Student’s enrolled branch only |

### 4.4 Executive Dashboard Widgets

Default route: `/admin/reports/scheduling/executive`  
Required menu permission: `menu.scheduling.reports`

| Widget ID    | Widget Name                 | Type          | Description                                                                       | Permission                                                          | Branch Scope           |
| ------------ | --------------------------- | ------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------- |
| W-SCH-EX-001 | Branch Utilization Ranking  | Ranked Table  | Ranks branches by classroom utilization and trainer utilization.                  | `scheduling.report.consolidated.read`                               | Multi-branch           |
| W-SCH-EX-002 | Operational Stability Score | Score Card    | Composite of cancellation rate, reschedule rate, override usage, and draft aging. | `scheduling.report.consolidated.read`                               | Multi-branch           |
| W-SCH-EX-003 | Capacity Pressure Heatmap   | Heatmap       | Shows branch/date/time slots with highest room occupancy.                         | `scheduling.report.utilization.read` + consolidated if multi-branch | Branch or multi-branch |
| W-SCH-EX-004 | Conflict Prevention Summary | Summary Cards | Displays prevented trainer, classroom, batch, holiday, and venue conflicts.       | `scheduling.report.conflict.read`                                   | Branch or multi-branch |
| W-SCH-EX-005 | Upcoming Closure Risk       | Table         | Lists holidays/venue blocks that affect published future sessions.                | `scheduling.report.holiday.read`                                    | Branch or multi-branch |

---

## 5. Operational Reports

### 5.1 Daily Timetable Report

| Attribute           | Specification                                                               |
| ------------------- | --------------------------------------------------------------------------- |
| Report Code         | RPT-SCH-001                                                                 |
| Purpose             | Provides branch operations team with official daily schedule.               |
| Required Permission | `scheduling.view.daily.read`                                                |
| Default Sort        | `scheduledDate ASC`, `startTime ASC`, `classroomCode ASC`                   |
| Export              | CSV, XLSX, PDF                                                              |
| Branch Scope        | Active branch; consolidated only with `scheduling.report.consolidated.read` |

#### Filters

| Filter      | Type   | Required | Validation                                                          |
| ----------- | ------ | -------- | ------------------------------------------------------------------- |
| branchId    | UUID   | Yes      | Must be in allowed branch scope.                                    |
| date        | Date   | Yes      | ISO date, interpreted in Asia/Muscat.                               |
| courseId    | UUID   | No       | Must belong to selected branch through active batch when supplied.  |
| batchId     | UUID   | No       | Must belong to selected branch.                                     |
| trainerId   | UUID   | No       | Must be active trainer assigned or available in selected branch.    |
| classroomId | UUID   | No       | Must belong to selected branch.                                     |
| status      | Enum[] | No       | Draft, Published, Rescheduled, Cancelled, Completed, ConflictDraft. |
| language    | Enum   | No       | `en` or `ar`.                                                       |

#### Columns

| Column           | Sort | Filter     | Notes                                |
| ---------------- | ---- | ---------- | ------------------------------------ |
| Session Date     | Yes  | Yes        | Local date.                          |
| Start Time       | Yes  | Yes        | HH:mm.                               |
| End Time         | Yes  | Yes        | HH:mm.                               |
| Duration Minutes | Yes  | Range      | Calculated.                          |
| Course Code      | Yes  | Yes        | From Course Catalog.                 |
| Course Name      | Yes  | Text       | English or Arabic based on language. |
| Batch Code       | Yes  | Yes        | From Training Delivery.              |
| Session Number   | Yes  | Range      | Integer.                             |
| Session Title    | Yes  | Text       | Localized where available.           |
| Trainer Code     | Yes  | Yes        | From Trainer Management.             |
| Trainer Name     | Yes  | Text       | Person display name.                 |
| Classroom Code   | Yes  | Yes        | From Organization/Classroom.         |
| Classroom Name   | Yes  | Text       | Localized where available.           |
| Status           | Yes  | Yes        | Rendered as badge.                   |
| Conflict Flag    | Yes  | Yes        | Yes/No with conflict count.          |
| Last Changed At  | Yes  | Date Range | From schedule change history.        |
| Last Changed By  | Yes  | Text       | User display name.                   |

### 5.2 Weekly Timetable Report

| Attribute           | Specification                                                          |
| ------------------- | ---------------------------------------------------------------------- |
| Report Code         | RPT-SCH-002                                                            |
| Purpose             | Displays week-level schedule for coordinators, trainers, and students. |
| Required Permission | `scheduling.view.weekly.read`                                          |
| Export              | CSV, XLSX, PDF calendar layout                                         |
| Paging              | Not paged in calendar mode; table view pages at 50 rows.               |

Filters: branchId, weekStartDate, courseId, batchId, trainerId, classroomId, status, viewMode (`calendar`, `table`).

Columns in table mode: Weekday, Date, Start Time, End Time, Course, Batch, Session Number, Trainer, Classroom, Status, Change Indicator.

### 5.3 Monthly Calendar Report

| Attribute           | Specification                                                                      |
| ------------------- | ---------------------------------------------------------------------------------- |
| Report Code         | RPT-SCH-003                                                                        |
| Purpose             | Gives calendar-level visibility of sessions, holidays, closures, and venue blocks. |
| Required Permission | `scheduling.view.monthly.read`                                                     |
| Export              | PDF calendar, XLSX detailed rows                                                   |
| Default Grouping    | Calendar day                                                                       |

Filters: branchId, month, courseId, trainerId, classroomId, includeHolidays, includeVenueBlocks, includeCancelled.

Columns in XLSX mode: Date, Day, Session Count, Holiday Count, Venue Block Count, First Session Time, Last Session Time, Trainers Assigned, Classrooms Used, Cancellation Count, Conflict Count.

### 5.4 Classroom Utilization Report

| Attribute           | Specification                                                       |
| ------------------- | ------------------------------------------------------------------- |
| Report Code         | RPT-SCH-004                                                         |
| Purpose             | Shows classroom usage, idle capacity, peak usage, and block impact. |
| Required Permission | `scheduling.report.utilization.read`                                |
| Export              | CSV, XLSX, PDF                                                      |
| Default Sort        | Utilization Percentage DESC                                         |

#### Filters

| Filter                     | Type    | Required | Validation                                                                        |
| -------------------------- | ------- | -------- | --------------------------------------------------------------------------------- |
| branchId                   | UUID    | Yes      | Allowed branch or consolidated permission.                                        |
| classroomId                | UUID    | No       | Must belong to branch.                                                            |
| dateFrom                   | Date    | Yes      | Must be <= dateTo.                                                                |
| dateTo                     | Date    | Yes      | Max default range 366 days for UI, export may require async job for larger range. |
| includeCancelled           | Boolean | No       | Default false.                                                                    |
| includeVenueBlockedMinutes | Boolean | No       | Default true for denominator adjustment display.                                  |

#### Columns

| Column              | Sort | Filter | Calculation                                        |
| ------------------- | ---- | ------ | -------------------------------------------------- |
| Branch              | Yes  | Yes    | Branch name.                                       |
| Classroom Code      | Yes  | Yes    | Classroom master.                                  |
| Classroom Name      | Yes  | Text   | Localized.                                         |
| Capacity            | Yes  | Range  | Classroom capacity.                                |
| Working Minutes     | Yes  | Range  | Sum of active working minutes for selected period. |
| Blocked Minutes     | Yes  | Range  | Active venue block minutes.                        |
| Available Minutes   | Yes  | Range  | Working minutes minus blocked minutes.             |
| Scheduled Minutes   | Yes  | Range  | Published/rescheduled/completed session minutes.   |
| Utilization %       | Yes  | Range  | Scheduled / Available × 100.                       |
| Session Count       | Yes  | Range  | Count official sessions.                           |
| Peak Occupancy Slot | Yes  | Text   | Highest used time slot.                            |
| Last Scheduled At   | Yes  | Date   | Latest session date.                               |

### 5.5 Trainer Utilization Report

| Attribute           | Specification                                          |
| ------------------- | ------------------------------------------------------ |
| Report Code         | RPT-SCH-005                                            |
| Purpose             | Shows teaching load and availability usage by trainer. |
| Required Permission | `scheduling.report.utilization.read`                   |
| Export              | CSV, XLSX, PDF                                         |
| Sensitive Data      | Yes, trainer workload. Restrict consolidated views.    |

Columns: Branch, Trainer Code, Trainer Name, Trainer Type, Availability Minutes, Scheduled Minutes, Utilization %, Session Count, Batch Count, Course Count, Outside Availability Count, Weekend/Holiday Override Count, Same-Day Change Count.

### 5.6 Conflict and Override Report

| Attribute           | Specification                                               |
| ------------------- | ----------------------------------------------------------- |
| Report Code         | RPT-SCH-006                                                 |
| Purpose             | Audits blocked conflicts, warnings, and approved overrides. |
| Required Permission | `scheduling.report.conflict.read`                           |
| Export              | CSV, XLSX, PDF                                              |
| Default Sort        | `detectedAt DESC`                                           |

Filters: branchId, dateFrom, dateTo, conflictType, severity, entityType, entityId, overrideStatus, detectedByUserId, approvedByUserId.

Columns: Conflict ID, Detected At, Branch, Conflict Type, Severity, Affected Entity, Proposed Date, Proposed Start, Proposed End, Existing Session, Existing Trainer, Existing Classroom, Resolution Status, Override Requested, Override Approved By, Override Reason, Created By.

### 5.7 Holiday and Closure Report

| Attribute           | Specification                                                           |
| ------------------- | ----------------------------------------------------------------------- |
| Report Code         | RPT-SCH-007                                                             |
| Purpose             | Lists holidays, closure days, non-training days, and impacted sessions. |
| Required Permission | `scheduling.report.holiday.read`                                        |
| Export              | CSV, XLSX, PDF                                                          |

Columns: Branch, Calendar Code, Holiday Date, Holiday Name English, Holiday Name Arabic, Holiday Type, Is Recurring, Status, Impacted Published Sessions, Impacted Draft Sessions, Created By, Approved By, Effective Start Date, Effective End Date.

### 5.8 Venue Block Report

| Attribute           | Specification                                                  |
| ------------------- | -------------------------------------------------------------- |
| Report Code         | RPT-SCH-008                                                    |
| Purpose             | Lists branch and classroom blocks and their scheduling impact. |
| Required Permission | `scheduling.venue_block.read`                                  |
| Export              | CSV, XLSX, PDF                                                 |

Columns: Branch, Scope, Classroom Code, Block Date, Start Time, End Time, Reason, Status, Impacted Sessions, Override Count, Created By, Created At, Cancelled By, Cancelled At.

### 5.9 Session Volume by Course and Batch Report

| Attribute           | Specification                                       |
| ------------------- | --------------------------------------------------- |
| Report Code         | RPT-SCH-009                                         |
| Purpose             | Shows delivery volume by course, batch, and status. |
| Required Permission | `scheduling.report.session_volume.read`             |
| Export              | CSV, XLSX, PDF                                      |

Columns: Branch, Course Code, Course Name, Batch Code, Batch Start Date, Batch End Date, Draft Count, Published Count, Completed Count, Cancelled Count, Rescheduled Count, Total Minutes, First Session Date, Last Session Date.

### 5.10 Draft Aging Report

| Attribute           | Specification                                  |
| ------------------- | ---------------------------------------------- |
| Report Code         | RPT-SCH-010                                    |
| Purpose             | Identifies sessions created but not published. |
| Required Permission | `scheduling.session.read`                      |
| Export              | CSV, XLSX                                      |

Columns: Branch, Draft Session ID, Course, Batch, Proposed Date, Proposed Start Time, Proposed End Time, Trainer, Classroom, Created By, Created At, Age in Days, Conflict Count, Last Validation At, Required Action.

### 5.11 Recurring Schedule Generation Report

| Attribute           | Specification                            |
| ------------------- | ---------------------------------------- |
| Report Code         | RPT-SCH-011                              |
| Purpose             | Tracks bulk session generation outcomes. |
| Required Permission | `scheduling.session.bulk_create`         |
| Export              | CSV, XLSX, PDF                           |

Columns: Run Number, Branch, Batch, Pattern Name, Requested Sessions, Created Draft Sessions, Published Sessions, Conflict Draft Sessions, Failed Items, Run Status, Requested By, Started At, Completed At, Duration Seconds, Failure Reason.

### 5.12 Schedule Change History Report

| Attribute           | Specification                                      |
| ------------------- | -------------------------------------------------- |
| Report Code         | RPT-SCH-012                                        |
| Purpose             | Provides audit-level change tracking for sessions. |
| Required Permission | `scheduling.audit.read`                            |
| Export              | CSV, XLSX, PDF                                     |
| Sensitive           | Yes                                                |

Columns: Change ID, Entity Type, Entity ID, Branch, Change Type, Old Value Summary, New Value Summary, Reason, Changed By, Changed At, IP Address, User Agent, Related Override ID.

### 5.13 Student Timetable Coverage Report

| Attribute           | Specification                                                  |
| ------------------- | -------------------------------------------------------------- |
| Report Code         | RPT-SCH-013                                                    |
| Purpose             | Confirms that enrolled students have visible future schedules. |
| Required Permission | `scheduling.report.session_volume.read`                        |
| Dependencies        | Admission & Enrollment, Training Delivery                      |
| Export              | CSV, XLSX                                                      |

Columns: Branch, Batch Code, Course Code, Active Enrollment Count, Future Published Session Count, Next Session Date, Last Published At, Coverage Status.

---

## 6. Export Rules

| Rule ID     | Rule                                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EXP-SCH-001 | CSV exports use UTF-8 with BOM to support Arabic text in spreadsheet applications.                                                                                                                |
| EXP-SCH-002 | XLSX exports must include a hidden metadata sheet with generatedBy, generatedAtUtc, generatedAtMuscat, branchScope, filters, permission used, and row count.                                      |
| EXP-SCH-003 | PDF exports must render English LTR and Arabic RTL correctly using approved fonts available in deployment.                                                                                        |
| EXP-SCH-004 | Exports containing trainer workload, audit history, override details, or consolidated branch data require explicit export permission.                                                             |
| EXP-SCH-005 | Every export creates a `ScheduleExportLog` row with reportCode, filters JSON, row count, file type, requestedBy, branchId or branchIds, and generatedAt.                                          |
| EXP-SCH-006 | Export files are soft-retained according to document retention policy and must not be publicly accessible without authenticated signed URL validation.                                            |
| EXP-SCH-007 | If export row count exceeds 50,000 rows, the UI must show an asynchronous export request state. In the modular monolith, this can use the application job runner; no external broker is required. |
| EXP-SCH-008 | Student portal exports include only the authenticated student’s own enrolled batch schedules. Trainer portal exports include only the authenticated trainer’s assigned sessions.                  |

---

## 7. Read Models and Reporting Views

### 7.1 View: `reporting.vw_sch_session_fact`

Purpose: Flatten official session facts for timetable, session volume, cancellation, and reschedule reports.

```sql
CREATE OR REPLACE VIEW reporting.vw_sch_session_fact AS
SELECT
    ss.id AS schedule_session_id,
    ss.branch_id,
    b.code AS branch_code,
    b.name AS branch_name,
    ss.batch_id,
    bt.batch_code,
    bt.name AS batch_name,
    ss.course_id,
    c.course_code,
    c.name_english AS course_name_en,
    c.name_arabic AS course_name_ar,
    ss.trainer_id,
    tp.trainer_code,
    p.full_name AS trainer_name,
    ss.classroom_id,
    cr.code AS classroom_code,
    cr.name AS classroom_name,
    ss.session_number,
    ss.title AS session_title,
    ss.scheduled_date,
    ss.start_time,
    ss.end_time,
    EXTRACT(EPOCH FROM (ss.end_time::time - ss.start_time::time)) / 60 AS duration_minutes,
    ss.status,
    ss.conflict_checked,
    ss.has_unresolved_conflict,
    ss.published_at,
    ss.cancelled_at,
    ss.cancelled_by,
    ss.created_at,
    ss.created_by,
    ss.updated_at,
    ss.updated_by,
    ss.is_deleted
FROM schedule_sessions ss
JOIN branches b ON b.id = ss.branch_id
JOIN batches bt ON bt.id = ss.batch_id
JOIN courses c ON c.id = ss.course_id
LEFT JOIN trainer_profiles tp ON tp.id = ss.trainer_id
LEFT JOIN persons p ON p.id = tp.person_id
LEFT JOIN classrooms cr ON cr.id = ss.classroom_id
WHERE ss.is_deleted = false;
```

Recommended indexes on source tables:

```sql
CREATE INDEX IF NOT EXISTS idx_schedule_sessions_branch_date_status
ON schedule_sessions (branch_id, scheduled_date, status)
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_schedule_sessions_trainer_date_time
ON schedule_sessions (trainer_id, scheduled_date, start_time, end_time)
WHERE is_deleted = false AND trainer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_schedule_sessions_classroom_date_time
ON schedule_sessions (classroom_id, scheduled_date, start_time, end_time)
WHERE is_deleted = false AND classroom_id IS NOT NULL;
```

### 7.2 View: `reporting.vw_sch_conflict_fact`

Purpose: Flatten conflict validation results and support conflict prevention analytics.

Columns: conflictLogId, branchId, conflictType, severity, proposedEntityType, proposedEntityId, proposedDate, proposedStartTime, proposedEndTime, existingScheduleSessionId, detectedByUserId, detectedAt, resolutionStatus, resolvedByUserId, resolvedAt, isOverrideRequested.

### 7.3 View: `reporting.vw_sch_override_fact`

Purpose: Analyze override governance.

Columns: overrideId, branchId, overrideType, relatedConflictLogId, requestedBy, requestedAt, approvedBy, approvedAt, rejectedBy, rejectedAt, status, reason, expiresAt, usedAt, scheduleSessionId.

### 7.4 View: `reporting.vw_sch_change_fact`

Purpose: Provide schedule audit changes optimized for reporting.

Columns: changeHistoryId, branchId, entityType, entityId, scheduleSessionId, changeType, oldValueJson, newValueJson, changedBy, changedAt, reason, ipAddress, userAgent, relatedOverrideId, sameDayChangeFlag.

### 7.5 View: `reporting.vw_sch_classroom_utilization`

Purpose: Calculate classroom available minutes, scheduled minutes, and utilization percentage.

Calculation notes:

1. Generate local date series between selected dates.
2. Join active resolved calendar and working hours for each weekday.
3. Subtract active venue block minutes for branch-level or classroom-level blocks.
4. Add session minutes for official sessions.
5. Calculate utilization as `scheduledMinutes / availableMinutes * 100` when available minutes > 0.
6. Return 0 utilization when available minutes = 0 and scheduled minutes = 0.
7. Flag data issue when available minutes = 0 and scheduled minutes > 0 without override.

### 7.6 View: `reporting.vw_sch_trainer_utilization`

Purpose: Calculate trainer scheduled minutes against availability.

Calculation notes:

1. Trainer available minutes come from `TrainerAvailability` intersected with active resolved calendar working hours.
2. Sessions outside availability are counted as scheduled minutes and flagged as outside-availability sessions.
3. Cancelled sessions are excluded.
4. Completed sessions remain included because they consumed trainer capacity.

### 7.7 Materialized View: `reporting.mv_sch_30_minute_occupancy`

Purpose: Provide fast heatmap and peak occupancy queries.

Recommended refresh:

| Refresh Type          | Rule                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| Incremental preferred | Refresh affected branch/date when sessions, holidays, or venue blocks change.                       |
| Full fallback         | Nightly at 01:00 Asia/Muscat.                                                                       |
| User-triggered        | Allowed for Super Admin with `scheduling.report.consolidated.read` when stale data warning appears. |

Columns: branchId, occupancyDate, slotStartTime, slotEndTime, activeClassroomCount, occupiedClassroomCount, blockedClassroomCount, occupancyPercentage, sessionCount.

### 7.8 View: `reporting.vw_sch_student_timetable_coverage`

Purpose: Determine whether active enrollments have visible future published sessions.

Dependencies: `Enrollment`, `Batch`, `ScheduleSession`, `Course`.

Columns: branchId, courseId, batchId, activeEnrollmentCount, futurePublishedSessionCount, nextSessionDate, timetableCoverageStatus.

### 7.9 Reporting API Query Pattern

Every reporting query must apply this where-clause pattern:

```sql
WHERE is_deleted = false
  AND branch_id = ANY(:allowedBranchIds)
  AND scheduled_date BETWEEN :dateFrom AND :dateTo
```

For consolidated reports:

```text
1. Verify `scheduling.report.consolidated.read`.
2. Resolve allowed branch IDs from UserBranchAccess.
3. Apply selected branch IDs as subset of allowed branch IDs.
4. Return branch-level grouping by default.
5. Include branch code and branch name in every row.
```

---

## 8. Dashboard Refresh and Performance Requirements

| Requirement ID  | Requirement                                                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-SCH-REP-001 | Dashboard metric cards should respond within 2 seconds for active branch and current month under normal load.                                                                      |
| NFR-SCH-REP-002 | Standard report table queries should respond within 3 seconds for up to 10,000 matching rows when paged.                                                                           |
| NFR-SCH-REP-003 | Exports should stream or generate asynchronously when expected row count exceeds 50,000.                                                                                           |
| NFR-SCH-REP-004 | Utilization reports should use reporting views or materialized views rather than repeated row-by-row calculations in application code.                                             |
| NFR-SCH-REP-005 | Dashboard widgets must cache safe aggregate values for a maximum of 5 minutes per branch and filter set. Sensitive audit widgets should not use shared cache across users.         |
| NFR-SCH-REP-006 | Arabic report titles, filter labels, and column headers must render RTL in PDF and UI. Numeric values, times, course codes, and IDs remain left-to-right tokens inside RTL layout. |
| NFR-SCH-REP-007 | All reports must include row-level branch scoping in SQL, not only in UI filters.                                                                                                  |

---

## 9. Empty, Error, and Restricted States for Reporting

| State                   | UI Behavior                                             | Message                                                                   |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| No permission           | Hide widget or report menu. Deep link returns 403 page. | `You do not have permission to view this scheduling report.`              |
| No branch access        | Show blocked state.                                     | `No branch is assigned to your user profile. Contact the administrator.`  |
| No data                 | Show empty chart/table with reset filters action.       | `No scheduling data found for the selected filters.`                      |
| Stale materialized view | Show warning badge and last refresh timestamp.          | `Utilization data was last refreshed at {lastRefreshAt}.`                 |
| Export disabled         | Disable export button with tooltip.                     | `Export requires additional permission.`                                  |
| Large export queued     | Show export request status.                             | `Your export request has been created and will appear in Export History.` |
| Date range too large    | Prevent query.                                          | `Select a date range of 366 days or less for interactive reports.`        |

---

## 10. Cross-Module Reporting Dependencies

| Source Context                          | Data Used by Scheduling Reports                   | Dependency Type                         | Failure Behavior                                                              |
| --------------------------------------- | ------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------- |
| Identity & Access Management            | User, Role, Permission, UserBranchAccess          | Authorization and branch scope          | Deny report access if scope cannot be resolved.                               |
| Organization Management                 | Branch, Classroom                                 | Dimensions and branch/classroom filters | Hide inactive classrooms by default; show historical names in audit exports.  |
| Course Catalog Management               | Course code, English/Arabic names, classification | Course dimension                        | Use stored snapshot if course is archived; do not break historical reports.   |
| Training Delivery Management            | Batch, BatchTrainer, batch date range             | Batch dimension and validation          | Exclude deleted batches except audit mode.                                    |
| Faculty / Trainer Management            | TrainerProfile, TrainerAvailability               | Trainer utilization                     | Show `Unassigned` or `Availability Missing` where data is incomplete.         |
| Admission & Enrollment Management       | Enrollment count and student timetable coverage   | Coverage analytics                      | Coverage report marks missing enrollment data as unavailable, not zero.       |
| Attendance Management                   | Future correlation with attendance readiness      | Optional drilldown                      | Not required for core scheduling reports.                                     |
| Audit & Compliance                      | AuditLog, ApprovalHistory                         | Sensitive change and override reports   | Audit reports unavailable if audit data cannot be read.                       |
| Communication & Notification Management | Notification requests/logs                        | Schedule notification success reports   | Show notification status as not configured in Phase 1 if channel not enabled. |

---

## 11. Report-Level Permission Summary

| Permission                              | Allows                                                   | Default Users                                                                           |
| --------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `scheduling.report.utilization.read`    | Classroom and trainer utilization reports and widgets.   | Super Admin, Branch Admin, Academic Manager, Training Coordinator, Executive roles.     |
| `scheduling.report.conflict.read`       | Conflict, override, late change, and governance reports. | Super Admin, Branch Admin, Academic Manager, Audit Officer.                             |
| `scheduling.report.calendar.read`       | Calendar coverage and working-hour reports.              | Super Admin, Branch Admin, Academic Manager, Training Coordinator.                      |
| `scheduling.report.holiday.read`        | Holiday, closure, and closure-impact reports.            | Super Admin, Branch Admin, Academic Manager, Receptionist read-only.                    |
| `scheduling.report.session_volume.read` | Session volume, draft aging, timetable coverage reports. | Super Admin, Branch Admin, Academic Manager, Training Coordinator, Counselor read-only. |
| `scheduling.report.consolidated.read`   | Multi-branch dashboard and reports.                      | Super Admin, Chairman, CEO, MD, authorized executive users.                             |
| `scheduling.export.create`              | Branch-scoped export files.                              | Super Admin, Branch Admin, Academic Manager, Training Coordinator.                      |
| `scheduling.export.consolidated`        | Multi-branch export files.                               | Super Admin and explicitly authorized executive/reporting users.                        |
