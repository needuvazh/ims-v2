# Part 9 – BDD Acceptance Criteria and Test Scenarios

## Module 07 – Scheduling, Calendar & Holiday Management

## 1. Document Control

| Field | Value |
|---|---|
| Product | Al Saud Training Institute Integrated Institute Management System |
| Module | Module 07 – Scheduling, Calendar & Holiday Management |
| Module Code | SCH |
| Part | 9 – BDD Acceptance Criteria and Test Scenarios |
| Test Style | Gherkin feature scenarios, scenario outlines, authorization guard tests, branch isolation tests |
| Primary Timezone | Asia/Muscat, Gulf Standard Time UTC+4 |
| Scope | Admin portal, trainer portal, student portal, reporting, audit, and notification triggers for scheduling context |

---

## 2. Test Data Baseline

The scenarios below assume the following deterministic test data unless a scenario overrides it.

| Test Data Code | Value |
|---|---|
| Branch A | `MCT-HQ`, Muscat Head Office, active branch |
| Branch B | `SOH-BR`, Sohar Branch, active branch |
| Course A | `HSE-101`, Health and Safety Training |
| Batch A | `MCT-HSE-2026-07-A`, Branch A, Course A, start date `2026-07-05`, end date `2026-07-31` |
| Batch B | `SOH-HSE-2026-07-A`, Branch B, Course A, start date `2026-07-05`, end date `2026-07-31` |
| Classroom A1 | `MCT-CR-01`, Branch A, active, capacity 25 |
| Classroom A2 | `MCT-CR-02`, Branch A, active, capacity 20 |
| Classroom B1 | `SOH-CR-01`, Branch B, active, capacity 25 |
| Trainer A | `TR-MCT-001`, active trainer assigned to Branch A |
| Trainer B | `TR-SOH-001`, active trainer assigned to Branch B |
| Working Hours | Sunday to Thursday, 08:00 to 18:00 Asia/Muscat |
| Holiday A | `2026-07-23`, Branch A, active public holiday |
| Venue Block A | Classroom A1 blocked on `2026-07-15`, 10:00 to 12:00 |
| Super Admin | Has all scheduling permissions and consolidated branch access |
| Branch Admin A | Assigned to Branch A with branch-scoped scheduling administration permissions |
| Training Coordinator A | Assigned to Branch A with session create/update/publish permissions |
| Trainer User A | Linked to Trainer A and can view own schedule |
| Student User A | Enrolled in Batch A and can view own batch timetable |
| Unauthorized User | No scheduling permissions |

---

## 3. Feature: Business Calendar Management

```gherkin
Feature: Business calendar management
  The system must allow authorized users to configure institute calendars, branch overrides, operating days, and working hours
  while enforcing branch scope, effective dating, lifecycle status, and audit requirements.
```

### Scenario: Create a draft institute business calendar

```gherkin
Scenario: Authorized branch admin creates a draft institute business calendar
  Given the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.calendar.create"
  When the user creates an institute business calendar with code "ASTI-CAL-2026"
  And the calendar name is "ASTI Business Calendar 2026"
  And the effective start date is "2026-01-01"
  And the effective end date is "2026-12-31"
  Then the system creates the calendar in "Draft" status
  And the calendar is linked to the institute
  And branch-specific overrides can be added later
  And an audit log entry is recorded with action "CreateBusinessCalendar"
```

### Scenario Outline: Reject invalid business calendar dates

```gherkin
Scenario Outline: Business calendar date validation
  Given the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.calendar.create"
  When the user creates an institute business calendar with effective start date "<startDate>"
  And effective end date "<endDate>"
  Then the system rejects the request with error code "<errorCode>"

  Examples:
    | startDate  | endDate    | errorCode                         |
    | 2026-12-31 | 2026-01-01 | ERR_SCH_INVALID_EFFECTIVE_DATES   |
    |            | 2026-12-31 | ERR_SCH_EFFECTIVE_START_REQUIRED  |
    | 2026-01-01 |            | ERR_SCH_EFFECTIVE_END_REQUIRED    |
```

### Scenario: Activate a calendar when no overlapping active calendar exists

```gherkin
Scenario: Activate calendar successfully
  Given the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.calendar.update"
  And the institute has a draft calendar "ASTI-CAL-2026"
  And no active calendar overlaps the calendar effective period
  And the calendar has operating days for Sunday through Thursday
  And the calendar has working hours from "08:00" to "18:00"
  When the user activates the calendar
  Then the calendar status becomes "Active"
  And scheduling validation uses this calendar for dates in 2026
  And an audit log entry is recorded with old status "Draft" and new status "Active"
```

### Scenario: Reject calendar activation when an overlapping active calendar exists

```gherkin
Scenario: Prevent overlapping active calendars
  Given the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.calendar.update"
  And branch "MCT-HQ" already has an active calendar from "2026-01-01" to "2026-12-31"
  When the user activates another calendar from "2026-06-01" to "2026-12-31"
  Then the system rejects the request with error code "ERR_SCH_CALENDAR_OVERLAP"
  And the new calendar remains in "Draft" status
  And the rejection response includes the overlapping calendar code
```

---

## 4. Feature: Holiday and Closure Management

```gherkin
Feature: Holiday and closure management
  The system must prevent published sessions from being scheduled on active holidays or branch closure days
  unless a user with explicit override permission approves the exception with a reason.
```

### Scenario: Create active holiday for a branch

```gherkin
Scenario: Create a holiday
  Given the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.holiday.create"
  And the active branch is "MCT-HQ"
  When the user creates a holiday on "2026-07-23"
  And the English name is "Renaissance Day"
  And the Arabic name is "يوم النهضة"
  And the holiday type is "PublicHoliday"
  Then the system creates the holiday in "Active" status
  And the holiday is applied only to branch "MCT-HQ"
  And the system records an audit log entry with action "CreateHoliday"
```

### Scenario: Prevent duplicate active holiday on same date and branch

```gherkin
Scenario: Reject duplicate holiday
  Given branch "MCT-HQ" has an active holiday on "2026-07-23"
  And the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.holiday.create"
  When the user creates another active holiday on "2026-07-23" for branch "MCT-HQ"
  Then the system rejects the request with error code "ERR_SCH_DUPLICATE_HOLIDAY"
  And no duplicate holiday row is created
```

### Scenario: Reject session scheduling on active holiday without override

```gherkin
Scenario: Holiday conflict prevents publishing
  Given branch "MCT-HQ" has an active holiday on "2026-07-23"
  And the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.publish"
  And the user does not have permission "scheduling.override.holiday"
  When the user tries to publish a session for Batch A on "2026-07-23" from "09:00" to "11:00"
  Then the system rejects the publish request with error code "ERR_SCH_HOLIDAY_CONFLICT"
  And the response includes the holiday name "Renaissance Day"
  And the session remains in "Draft" or "ConflictDraft" status
  And a conflict log is recorded with conflict type "HolidayConflict"
```

### Scenario: Allow holiday override with permission and reason

```gherkin
Scenario: Approve holiday override
  Given branch "MCT-HQ" has an active holiday on "2026-07-23"
  And the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.session.publish"
  And the user has permission "scheduling.override.holiday"
  When the user publishes a session on "2026-07-23" from "09:00" to "11:00"
  And the user provides override reason "Corporate client requested approved holiday delivery"
  Then the session status becomes "Published"
  And a schedule override row is created with status "Approved"
  And a conflict log is recorded with resolution status "Overridden"
  And the audit log records the override reason
```

---

## 5. Feature: Venue Block Management

```gherkin
Feature: Venue block management
  The system must allow branch or classroom blocking and must prevent sessions that overlap active blocked periods.
```

### Scenario: Create classroom venue block

```gherkin
Scenario: Authorized user creates classroom block
  Given the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.venue_block.create"
  And classroom "MCT-CR-01" belongs to branch "MCT-HQ"
  When the user creates a venue block for classroom "MCT-CR-01"
  And the block date is "2026-07-15"
  And the start time is "10:00"
  And the end time is "12:00"
  And the reason is "Maintenance"
  Then the venue block is created with status "Active"
  And scheduling validation treats the classroom as unavailable during the blocked interval
  And an audit log entry is recorded
```

### Scenario Outline: Validate venue block time bounds

```gherkin
Scenario Outline: Venue block time validation
  Given the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.venue_block.create"
  When the user creates a venue block from "<startTime>" to "<endTime>"
  Then the system rejects the request with error code "<errorCode>"

  Examples:
    | startTime | endTime | errorCode                    |
    | 12:00     | 10:00   | ERR_SCH_INVALID_TIME_RANGE   |
    | 10:00     | 10:00   | ERR_SCH_INVALID_TIME_RANGE   |
    | 24:00     | 25:00   | ERR_SCH_INVALID_TIME_FORMAT  |
```

### Scenario: Prevent session in blocked classroom

```gherkin
Scenario: Classroom venue block prevents scheduling
  Given classroom "MCT-CR-01" is blocked on "2026-07-15" from "10:00" to "12:00"
  And the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.publish"
  When the user attempts to publish a session in classroom "MCT-CR-01" on "2026-07-15" from "11:00" to "13:00"
  Then the system rejects the request with error code "ERR_SCH_VENUE_BLOCK_CONFLICT"
  And the response includes the conflicting venue block reason "Maintenance"
  And a conflict log is recorded with conflict type "VenueBlockConflict"
```

---

## 6. Feature: Single Session Scheduling

```gherkin
Feature: Single session scheduling
  The system must create, validate, publish, reschedule, cancel, and audit individual schedule sessions.
```

### Scenario: Create a valid draft session

```gherkin
Scenario: Create draft session
  Given the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.create"
  And Batch A belongs to branch "MCT-HQ"
  And Trainer A belongs to branch "MCT-HQ"
  And Classroom A1 belongs to branch "MCT-HQ"
  When the user creates a draft session for Batch A
  And the scheduled date is "2026-07-12"
  And the start time is "09:00"
  And the end time is "11:00"
  And the trainer is Trainer A
  And the classroom is Classroom A1
  Then the session is saved in "Draft" status
  And conflictChecked is false
  And the session is visible to admin users with session read permission
  And the session is not visible to students as an official timetable item
```

### Scenario: Publish a valid session

```gherkin
Scenario: Publish session after successful conflict validation
  Given a draft session exists for Batch A on "2026-07-12" from "09:00" to "11:00"
  And the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.publish"
  And no trainer conflict exists
  And no classroom conflict exists
  And no batch overlap exists
  And no holiday conflict exists
  And no venue block conflict exists
  And the session is within branch working hours
  When the user publishes the session
  Then the system sets the session status to "Published"
  And conflictChecked is true
  And hasUnresolvedConflict is false
  And publishedAt is populated
  And students enrolled in Batch A can view the session
  And Trainer A can view the session in the trainer portal
```

### Scenario Outline: Reject invalid session payload

```gherkin
Scenario Outline: Validate session payload
  Given the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.create"
  When the user creates a session with scheduled date "<date>" start time "<start>" end time "<end>" session number "<number>"
  Then the system rejects the request with error code "<errorCode>"

  Examples:
    | date       | start | end   | number | errorCode                       |
    |            | 09:00 | 11:00 | 1      | ERR_SCH_SESSION_DATE_REQUIRED   |
    | 2026-07-12 |       | 11:00 | 1      | ERR_SCH_START_TIME_REQUIRED     |
    | 2026-07-12 | 09:00 |       | 1      | ERR_SCH_END_TIME_REQUIRED       |
    | 2026-07-12 | 11:00 | 09:00 | 1      | ERR_SCH_INVALID_TIME_RANGE      |
    | 2026-07-12 | 09:00 | 11:00 | 0      | ERR_SCH_SESSION_NUMBER_INVALID  |
```

### Scenario: Prevent trainer double booking

```gherkin
Scenario: Trainer double booking conflict
  Given Trainer A already has a published session on "2026-07-12" from "09:00" to "11:00"
  And the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.publish"
  When the user tries to publish another session for Trainer A on "2026-07-12" from "10:30" to "12:00"
  Then the system rejects the request with error code "ERR_SCH_TRAINER_DOUBLE_BOOKED"
  And the response includes the conflicting session ID
  And a conflict log is recorded with severity "Hard"
```

### Scenario: Prevent classroom double booking

```gherkin
Scenario: Classroom double booking conflict
  Given Classroom A1 already has a published session on "2026-07-12" from "09:00" to "11:00"
  And the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.publish"
  When the user tries to publish another session in Classroom A1 on "2026-07-12" from "10:00" to "12:00"
  Then the system rejects the request with error code "ERR_SCH_CLASSROOM_DOUBLE_BOOKED"
  And the response includes the conflicting session ID
  And a conflict log is recorded with severity "Hard"
```

### Scenario: Prevent batch overlap

```gherkin
Scenario: Batch overlap conflict
  Given Batch A already has a published session on "2026-07-12" from "09:00" to "11:00"
  And the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.publish"
  When the user tries to publish another session for Batch A on "2026-07-12" from "10:00" to "12:00"
  Then the system rejects the request with error code "ERR_SCH_BATCH_OVERLAP"
  And the response includes the conflicting batch session
  And a conflict log is recorded with severity "Hard"
```

### Scenario: Reject scheduling outside batch date range without override

```gherkin
Scenario: Batch date range conflict
  Given Batch A starts on "2026-07-05" and ends on "2026-07-31"
  And the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.publish"
  And the user does not have permission "scheduling.override.batch_date"
  When the user tries to publish a session on "2026-08-01"
  Then the system rejects the request with error code "ERR_SCH_OUTSIDE_BATCH_DATE_RANGE"
  And the session is not published
```

### Scenario: Reject scheduling outside working hours without override

```gherkin
Scenario: Working hours conflict
  Given branch "MCT-HQ" working hours are "08:00" to "18:00"
  And the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.publish"
  And the user does not have permission "scheduling.override.working_hours"
  When the user tries to publish a session from "18:30" to "20:00"
  Then the system rejects the request with error code "ERR_SCH_OUTSIDE_WORKING_HOURS"
  And a conflict log is recorded with conflict type "WorkingHoursConflict"
```

### Scenario: Cancel a published session with reason

```gherkin
Scenario: Cancel published session
  Given a published session exists for Batch A on "2026-07-12" from "09:00" to "11:00"
  And the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.session.cancel"
  When the user cancels the session with reason "Trainer emergency leave"
  Then the session status becomes "Cancelled"
  And cancelledAt is populated
  And cancelledBy is the authenticated user
  And a schedule change history row is created with change type "Cancelled"
  And notifications are requested for affected trainer and enrolled students
```

### Scenario: Reject cancellation without reason

```gherkin
Scenario: Cancellation reason required
  Given a published session exists for Batch A
  And the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.session.cancel"
  When the user cancels the session without a reason
  Then the system rejects the request with error code "ERR_SCH_REASON_REQUIRED"
  And the session remains "Published"
```

### Scenario: Reschedule a published session

```gherkin
Scenario: Reschedule session successfully
  Given a published session exists for Batch A on "2026-07-12" from "09:00" to "11:00"
  And the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.reschedule"
  And the new date "2026-07-13" from "09:00" to "11:00" has no conflicts
  When the user reschedules the session with reason "Classroom maintenance"
  Then the original session is marked as rescheduled or replaced according to the configured lifecycle rule
  And the active session shows the new date and time
  And a schedule change history row is created with old and new values
  And affected trainer and enrolled students receive notification requests
```

---

## 7. Feature: Recurring Schedule Generation

```gherkin
Feature: Recurring schedule generation
  The system must generate sessions from recurrence patterns while validating conflicts and returning deterministic generation results.
```

### Scenario: Generate weekly recurring draft sessions

```gherkin
Scenario: Generate weekly sessions
  Given the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.bulk_create"
  And Batch A is active in branch "MCT-HQ"
  When the user generates sessions for every Sunday and Tuesday from "2026-07-05" to "2026-07-31"
  And the time is "09:00" to "11:00"
  And the trainer is Trainer A
  And the classroom is Classroom A1
  Then the system creates one schedule generation run
  And the system creates draft sessions only for dates inside the batch date range
  And each generated session receives sequential session numbers
  And the generation result shows created count, conflict count, and skipped count
```

### Scenario: Generate recurring sessions with holiday conflict as conflict draft

```gherkin
Scenario: Recurring generation creates conflict draft for holiday
  Given branch "MCT-HQ" has an active holiday on "2026-07-23"
  And the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.bulk_create"
  And the user has permission "scheduling.override.conflict_draft"
  When the user generates recurring sessions including "2026-07-23"
  Then sessions without conflicts are created as "Draft"
  And the holiday date session is created as "ConflictDraft"
  And a conflict log is created for the holiday date
  And the generation run status is "CompletedWithConflicts"
```

### Scenario: Reject recurrence generation beyond allowed range

```gherkin
Scenario: Recurrence date range too large
  Given the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.bulk_create"
  When the user generates recurring sessions from "2026-01-01" to "2028-12-31"
  Then the system rejects the request with error code "ERR_SCH_RECURRENCE_RANGE_TOO_LARGE"
  And no generation run creates sessions
```

---

## 8. Feature: Conflict Check API

```gherkin
Feature: Conflict checking
  Users must be able to run a dry-run conflict check before saving or publishing a session.
```

### Scenario: Dry-run conflict check returns no conflicts

```gherkin
Scenario: Conflict check clear
  Given the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.conflict.read"
  When the user checks conflicts for Batch A on "2026-07-14" from "09:00" to "11:00"
  And Trainer A and Classroom A1 are selected
  Then the system returns conflict status "Clear"
  And the response contains an empty conflict list
  And no schedule session is created
```

### Scenario: Dry-run conflict check returns multiple conflicts

```gherkin
Scenario: Conflict check returns all conflicts
  Given Trainer A is booked on "2026-07-15" from "09:00" to "11:00"
  And Classroom A1 is blocked on "2026-07-15" from "10:00" to "12:00"
  And the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.conflict.read"
  When the user checks conflicts for "2026-07-15" from "10:00" to "11:30"
  Then the system returns conflict status "Blocked"
  And the response includes conflict type "TrainerDoubleBooking"
  And the response includes conflict type "VenueBlockConflict"
  And the conflicts are sorted by severity descending and detectedAt ascending
```

---

## 9. Feature: Timetable Views

```gherkin
Feature: Timetable views
  Admin, trainer, and student users must see only schedules permitted by their identity, role, branch access, and enrollment/trainer linkage.
```

### Scenario: Admin views daily timetable for assigned branch

```gherkin
Scenario: Branch admin daily timetable
  Given the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.view.daily.read"
  And the active branch is "MCT-HQ"
  When the user opens the daily timetable for "2026-07-12"
  Then the system returns sessions for branch "MCT-HQ"
  And the system does not return sessions for branch "SOH-BR"
  And the timetable is sorted by start time and classroom code
```

### Scenario: Trainer views own schedule

```gherkin
Scenario: Trainer own schedule only
  Given the user is authenticated as "Trainer User A"
  And the user is linked to Trainer A
  And the user has permission "scheduling.view.trainer.read"
  When the user opens the trainer schedule for July 2026
  Then the system returns only sessions assigned to Trainer A
  And the system does not return sessions assigned to Trainer B
  And cancelled sessions are shown only when includeCancelled is true
```

### Scenario: Student views own enrolled batch timetable

```gherkin
Scenario: Student own timetable only
  Given the user is authenticated as "Student User A"
  And the user is enrolled in Batch A
  And the user has permission "scheduling.view.batch.read"
  When the user opens weekly timetable for the week of "2026-07-12"
  Then the system returns published sessions for Batch A
  And the system does not return draft sessions
  And the system does not return sessions for Batch B
```

### Scenario: Student cannot read another batch timetable

```gherkin
Scenario: Student blocked from another batch
  Given the user is authenticated as "Student User A"
  And the user is not enrolled in Batch B
  When the user requests the timetable for Batch B
  Then the system rejects the request with HTTP status 403
  And the application error code is "ERR_SCH_BATCH_SCOPE_DENIED"
```

---

## 10. Feature: Reports and Analytics

```gherkin
Feature: Scheduling reports and analytics
  Reports must be branch-scoped, permission-controlled, exportable, and accurate for operational KPIs.
```

### Scenario: Branch user views classroom utilization for own branch

```gherkin
Scenario: Branch-scoped classroom utilization
  Given the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.report.utilization.read"
  When the user runs the classroom utilization report for branch "MCT-HQ"
  And the date range is "2026-07-01" to "2026-07-31"
  Then the report returns classroom utilization rows for branch "MCT-HQ"
  And every row includes branch code "MCT-HQ"
  And no rows from branch "SOH-BR" are returned
```

### Scenario: Consolidated report requires consolidated permission

```gherkin
Scenario: Deny consolidated report without permission
  Given the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.report.utilization.read"
  And the user does not have permission "scheduling.report.consolidated.read"
  When the user requests a consolidated utilization report for branches "MCT-HQ" and "SOH-BR"
  Then the system rejects the request with HTTP status 403
  And the application error code is "ERR_SCH_CONSOLIDATED_PERMISSION_REQUIRED"
```

### Scenario: Super admin exports consolidated report

```gherkin
Scenario: Consolidated export allowed
  Given the user is authenticated as "Super Admin"
  And the user has permission "scheduling.report.consolidated.read"
  And the user has permission "scheduling.export.consolidated"
  When the user exports the consolidated schedule volume report as XLSX
  Then the export is generated
  And the export contains rows for assigned branches only
  And the export metadata includes generated by, generated at, branch scope, filters, and row count
  And a ScheduleExportLog row is created
```

### Scenario Outline: Report date range validation

```gherkin
Scenario Outline: Report date range validation
  Given the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.report.session_volume.read"
  When the user runs a report from "<dateFrom>" to "<dateTo>"
  Then the system rejects the request with error code "<errorCode>"

  Examples:
    | dateFrom   | dateTo     | errorCode                     |
    | 2026-08-01 | 2026-07-01 | ERR_SCH_INVALID_DATE_RANGE    |
    |            | 2026-07-31 | ERR_SCH_DATE_FROM_REQUIRED    |
    | 2026-07-01 |            | ERR_SCH_DATE_TO_REQUIRED      |
```

---

## 11. Feature: Authorization Guards

```gherkin
Feature: Scheduling authorization guards
  Every scheduling endpoint and server action must enforce authentication, fine-grained permission, branch scope, and ownership scope.
```

### Scenario Outline: Deny unauthenticated access

```gherkin
Scenario Outline: Unauthenticated request is rejected
  Given the user is not authenticated
  When the user calls "<endpoint>" with method "<method>"
  Then the system responds with HTTP status 401
  And the application error code is "ERR_AUTH_REQUIRED"

  Examples:
    | method | endpoint                                      |
    | GET    | /api/scheduling/sessions                     |
    | POST   | /api/scheduling/sessions                     |
    | PATCH  | /api/scheduling/sessions/{id}/publish        |
    | GET    | /api/scheduling/reports/classroom-utilization|
```

### Scenario Outline: Deny missing permission

```gherkin
Scenario Outline: Missing permission is rejected
  Given the user is authenticated as "Unauthorized User"
  And the user does not have permission "<permission>"
  When the user performs action "<action>"
  Then the system responds with HTTP status 403
  And the application error code is "ERR_PERMISSION_DENIED"

  Examples:
    | action                 | permission                              |
    | create calendar        | scheduling.calendar.create              |
    | create holiday         | scheduling.holiday.create               |
    | publish session        | scheduling.session.publish              |
    | cancel session         | scheduling.session.cancel               |
    | export schedule report | scheduling.export.create                |
    | read audit report      | scheduling.audit.read                   |
```

### Scenario: Permission must not be inferred from role name

```gherkin
Scenario: Role name alone is not enough
  Given the user has role name "Branch Admin"
  But the user does not have permission "scheduling.session.publish"
  When the user attempts to publish a schedule session
  Then the system responds with HTTP status 403
  And the application error code is "ERR_PERMISSION_DENIED"
  And the audit log records a denied sensitive action attempt
```

---

## 12. Feature: Branch Data Isolation

```gherkin
Feature: Branch data isolation
  All scheduling data access must be scoped server-side to the user's assigned branch access.
```

### Scenario: User cannot create session in unassigned branch

```gherkin
Scenario: Create session in unassigned branch is denied
  Given the user is authenticated as "Training Coordinator A"
  And the user is assigned only to branch "MCT-HQ"
  And the user has permission "scheduling.session.create"
  When the user submits a create session request with branchId "SOH-BR"
  Then the system responds with HTTP status 403
  And the application error code is "ERR_BRANCH_SCOPE_DENIED"
  And no schedule session is created in branch "SOH-BR"
```

### Scenario: User cannot access cross-branch classroom by changing payload

```gherkin
Scenario: Cross-branch classroom injection is denied
  Given the user is authenticated as "Training Coordinator A"
  And the active branch is "MCT-HQ"
  And Classroom B1 belongs to branch "SOH-BR"
  When the user creates a session for Batch A using classroom "SOH-CR-01"
  Then the system responds with HTTP status 422
  And the application error code is "ERR_SCH_CLASSROOM_BRANCH_MISMATCH"
  And no session is created
```

### Scenario: User cannot assign cross-branch trainer unless explicitly allowed

```gherkin
Scenario: Cross-branch trainer assignment is denied
  Given the user is authenticated as "Training Coordinator A"
  And the active branch is "MCT-HQ"
  And Trainer B belongs to branch "SOH-BR"
  And the user does not have permission "scheduling.admin.cross_branch.manage"
  When the user creates a session for Batch A with Trainer B
  Then the system responds with HTTP status 422
  And the application error code is "ERR_SCH_TRAINER_BRANCH_MISMATCH"
```

### Scenario: Consolidated user can read multiple branches but cannot mutate all without action permission

```gherkin
Scenario: Consolidated read does not grant mutation
  Given the user has permission "scheduling.report.consolidated.read"
  And the user does not have permission "scheduling.session.create"
  When the user attempts to create a session in branch "MCT-HQ"
  Then the system responds with HTTP status 403
  And the application error code is "ERR_PERMISSION_DENIED"
```

### Scenario: Parent branch access can include child branch only when configured

```gherkin
Scenario: Parent-child branch access requires explicit flag
  Given the user is assigned to parent branch "MCT-HQ"
  And child branch access is not enabled for the user
  When the user requests scheduling sessions for child branch "SOH-BR"
  Then the system responds with HTTP status 403
  And the application error code is "ERR_BRANCH_SCOPE_DENIED"
```

---

## 13. Feature: Optimistic Locking and Soft Delete

```gherkin
Feature: Optimistic locking and soft delete
  Updates and deletes must prevent lost updates and must never hard delete scheduling records.
```

### Scenario: Reject update with stale version

```gherkin
Scenario: Stale version is rejected
  Given a schedule session exists with version 4
  And the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.update"
  When the user submits an update with version 3
  Then the system responds with HTTP status 409
  And the application error code is "ERR_VERSION_CONFLICT"
  And the response includes the current version 4
```

### Scenario: Soft delete draft session

```gherkin
Scenario: Soft delete draft session
  Given a draft session exists for Batch A
  And the session has no attendance session
  And the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.delete"
  When the user deletes the draft session
  Then the system sets isDeleted to true
  And deletedAt is populated
  And the session is excluded from default timetable views
  And an audit log entry is recorded with action "SoftDeleteScheduleSession"
```

### Scenario: Reject delete of published session

```gherkin
Scenario: Published session cannot be deleted
  Given a published session exists for Batch A
  And the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.session.delete"
  When the user deletes the published session
  Then the system rejects the request with error code "ERR_SCH_PUBLISHED_SESSION_DELETE_NOT_ALLOWED"
  And the session remains published
  And the system suggests cancellation instead of deletion
```

---

## 14. Feature: Audit and Notifications

```gherkin
Feature: Audit and notifications
  Sensitive schedule changes must create audit records and notification requests for affected users.
```

### Scenario Outline: Sensitive mutations create audit records

```gherkin
Scenario Outline: Audit sensitive scheduling action
  Given the user is authenticated as "Branch Admin A"
  And the user has permission "<permission>"
  When the user performs scheduling action "<action>"
  Then an AuditLog row is created
  And the audit log includes entity type "<entityType>"
  And the audit log includes old value and new value when applicable
  And the audit log includes performedBy, performedAt, IP address, and reason when required

  Examples:
    | action          | permission                   | entityType        |
    | activate holiday| scheduling.holiday.update     | Holiday           |
    | cancel session  | scheduling.session.cancel     | ScheduleSession   |
    | reschedule      | scheduling.session.reschedule | ScheduleSession   |
    | approve override| scheduling.override.holiday   | ScheduleOverride  |
```

### Scenario: Notification requested for session cancellation

```gherkin
Scenario: Session cancellation notification
  Given a published session for Batch A has enrolled students and Trainer A
  And the user is authenticated as "Branch Admin A"
  And the user has permission "scheduling.session.cancel"
  When the user cancels the session with reason "Trainer emergency leave"
  Then the system creates notification request events for the trainer
  And the system creates notification request events for students enrolled in Batch A
  And each notification payload includes courseName, batchCode, sessionDate, startTime, endTime, branchName, classroomName, cancellationReason, and supportContact
```

### Scenario: Notification requested for session reschedule

```gherkin
Scenario: Session reschedule notification
  Given a published session exists for Batch A
  And the user is authenticated as "Training Coordinator A"
  And the user has permission "scheduling.session.reschedule"
  When the user reschedules the session from "2026-07-12 09:00-11:00" to "2026-07-13 09:00-11:00"
  Then notification requests are created for affected trainer and enrolled students
  And each notification payload includes oldSessionDate, oldStartTime, oldEndTime, newSessionDate, newStartTime, newEndTime, courseName, batchCode, branchName, classroomName, and rescheduleReason
```

---

## 15. Feature: Bilingual and RTL Behavior

```gherkin
Feature: Bilingual scheduling UI and reports
  Scheduling screens, reports, and notifications must support English LTR and Arabic RTL rendering.
```

### Scenario: Arabic timetable renders RTL labels

```gherkin
Scenario: Arabic timetable display
  Given the user preferred language is "ar"
  And the user has permission "scheduling.view.weekly.read"
  When the user opens the weekly timetable
  Then the page layout direction is RTL
  And Arabic labels are displayed for filter captions and table headers
  And course Arabic name is shown when available
  And time values remain in 24-hour format
  And course codes and batch codes remain left-to-right tokens
```

### Scenario: English report export renders LTR labels

```gherkin
Scenario: English report export
  Given the user preferred language is "en"
  And the user has permission "scheduling.export.create"
  When the user exports the daily timetable as PDF
  Then the PDF uses English labels
  And the page direction is LTR
  And the export metadata includes timezone "Asia/Muscat"
```

---

## 16. Boundary Condition Matrix

| Test ID | Condition | Expected Result | Error Code |
|---|---|---|---|
| TC-SCH-BND-001 | Session start time equals end time | Reject | `ERR_SCH_INVALID_TIME_RANGE` |
| TC-SCH-BND-002 | Session end time before start time | Reject | `ERR_SCH_INVALID_TIME_RANGE` |
| TC-SCH-BND-003 | Session starts exactly when another session ends for same trainer | Allow | None |
| TC-SCH-BND-004 | Session ends exactly when another session starts for same classroom | Allow | None |
| TC-SCH-BND-005 | Session overlaps by one minute with same trainer | Reject | `ERR_SCH_TRAINER_DOUBLE_BOOKED` |
| TC-SCH-BND-006 | Session overlaps by one minute with same classroom | Reject | `ERR_SCH_CLASSROOM_DOUBLE_BOOKED` |
| TC-SCH-BND-007 | Session date equals batch start date | Allow if other validations pass | None |
| TC-SCH-BND-008 | Session date equals batch end date | Allow if other validations pass | None |
| TC-SCH-BND-009 | Session date one day before batch start | Reject unless override permission | `ERR_SCH_OUTSIDE_BATCH_DATE_RANGE` |
| TC-SCH-BND-010 | Session date one day after batch end | Reject unless override permission | `ERR_SCH_OUTSIDE_BATCH_DATE_RANGE` |
| TC-SCH-BND-011 | Holiday exists in another branch only | Allow for current branch | None |
| TC-SCH-BND-012 | Venue block exists for another classroom only | Allow for selected classroom | None |
| TC-SCH-BND-013 | Branch-level venue block exists | Reject all classroom sessions in branch during block | `ERR_SCH_VENUE_BLOCK_CONFLICT` |
| TC-SCH-BND-014 | Draft session delete requested | Soft delete if no dependencies | None |
| TC-SCH-BND-015 | Published session delete requested | Reject; use cancellation | `ERR_SCH_PUBLISHED_SESSION_DELETE_NOT_ALLOWED` |
| TC-SCH-BND-016 | Report requested for unassigned branch | Reject | `ERR_BRANCH_SCOPE_DENIED` |
| TC-SCH-BND-017 | Consolidated export without permission | Reject | `ERR_SCH_CONSOLIDATED_PERMISSION_REQUIRED` |
| TC-SCH-BND-018 | Arabic text missing for holiday name | Fallback to English with missing translation indicator in admin edit screen | None |
| TC-SCH-BND-019 | Duplicate session number in same batch | Reject or require explicit renumber action based on configuration | `ERR_SCH_DUPLICATE_SESSION_NUMBER` |
| TC-SCH-BND-020 | Recurrence produces zero dates | Reject | `ERR_SCH_RECURRENCE_NO_DATES` |

---

## 17. Regression Test Checklist

| Area | Regression Checks |
|---|---|
| Calendar | Create, update, activate, close, archive, soft delete, overlap prevention, branch scope. |
| Holiday | Create, update, activate, deactivate, duplicate prevention, schedule impact validation. |
| Venue Block | Branch-level and classroom-level blocks, overlap detection, cancellation, audit. |
| Session | Draft, publish, conflict check, cancel, reschedule, soft delete, optimistic locking. |
| Recurrence | Weekly generation, skipped dates, holiday conflicts, conflict drafts, run summary. |
| Timetable | Admin daily/weekly/monthly views, trainer own schedule, student own schedule. |
| Reports | KPI cards, utilization reports, conflict reports, exports, consolidated guards. |
| Security | Authentication, permission checks, branch isolation, ownership scope. |
| Audit | Old/new values, reason capture, sensitive action logging, denied action logging. |
| Bilingual | English LTR, Arabic RTL, PDF/XLSX export labels, localized course/holiday names. |
