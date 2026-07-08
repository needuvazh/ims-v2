# Part 7 – Validation Rules, Error Catalog, Notifications

## Module 07 – Scheduling, Calendar & Holiday Management

## 1. Document Control

| Field                 | Value                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Product               | Al Saud Training Institute Integrated Institute Management System                            |
| Module                | Module 07 – Scheduling, Calendar & Holiday Management                                        |
| Module Code           | SCH                                                                                          |
| Validation Layers     | UI form validation, Zod boundary validation, domain service validation, database constraints |
| Notification Channels | System notification, Email, SMS, WhatsApp where configured                                   |
| Timezone              | Oman GST, `Asia/Muscat`, UTC+04:00 for operational schedule interpretation                   |
| Deletion Policy       | Soft delete only                                                                             |
| Audit Policy          | Every validation bypass, override, cancellation, reschedule, and sensitive change is audited |

---

## 2. Validation Strategy

Module 07 validation must be deterministic, branch-scoped, and repeatable. A schedule that passes validation in the UI must be revalidated on the server before persistence because calendars, holidays, venue blocks, trainers, classrooms, and sessions can change concurrently.

Validation is performed in four layers:

| Layer                     | Responsibility                                                     | Example                                                                    |
| ------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| UI form validation        | Immediate feedback and field-level completeness checks.            | Required date, invalid time format, missing classroom.                     |
| Zod boundary validation   | Strict request shape validation at API and Server Action boundary. | UUID format, enum values, string length, date regex.                       |
| Domain service validation | Business invariants and cross-entity checks.                       | Trainer overlap, classroom overlap, holiday conflict, batch date range.    |
| Database constraints      | Last-line data integrity guarantees.                               | Unique calendar code, check constraints, foreign keys, optimistic version. |

---

## 3. Common Field Validation Rules

| Field                    | Rule ID        | Validation Rule                                                                                                                                                            | Error Code                                 |
| ------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `id`                     | VR-SCH-COM-001 | Must be valid UUID v4 string when supplied by API.                                                                                                                         | `ERR_VALIDATION_INVALID_UUID`              |
| `branchId`               | VR-SCH-COM-002 | Required for every owned scheduling write and must be inside user's allowed branch scope.                                                                                  | `ERR_ORG_BRANCH_SCOPE_DENIED`              |
| `createdBy`, `updatedBy` | VR-SCH-COM-003 | Must be authenticated user ID or approved system user ID. Client cannot set these fields.                                                                                  | `ERR_SCH_AUDIT_ACTOR_INVALID`              |
| `version`                | VR-SCH-COM-004 | Required for update, status change, soft delete, cancel, and reschedule. Must match current row version.                                                                   | `ERR_CONCURRENCY_VERSION_MISMATCH`         |
| `changeReason`           | VR-SCH-COM-005 | Required for update of effective dates, working hours, holidays, venue blocks, cancellations, reschedules, and overrides. Length 10 to 700 characters depending on action. | `ERR_SCH_REASON_REQUIRED`                  |
| `localized.en`           | VR-SCH-COM-006 | Required English text; trimmed length 1 to 200 characters unless entity field specifies stricter length.                                                                   | `ERR_SCH_LOCALIZED_EN_REQUIRED`            |
| `localized.ar`           | VR-SCH-COM-007 | Required Arabic text; trimmed length 1 to 200 characters where bilingual display is required.                                                                              | `ERR_SCH_LOCALIZED_AR_REQUIRED`            |
| `status`                 | VR-SCH-COM-008 | Must be one of the allowed enum values for the target entity.                                                                                                              | `ERR_VALIDATION_INVALID_ENUM`              |
| `isDeleted`              | VR-SCH-COM-009 | Cannot be set directly by general update endpoints. Must be set through soft delete use case only.                                                                         | `ERR_SCH_SOFT_DELETE_DIRECT_UPDATE_DENIED` |
| `deletedAt`              | VR-SCH-COM-010 | Required when `isDeleted = true`; must be system-generated timestamp.                                                                                                      | `ERR_SCH_SOFT_DELETE_METADATA_INVALID`     |

---

## 4. Date, Time, and Timezone Validation Rules

| Rule ID       | Rule                         | Details                                                                                                                                        | Error Code                                      |
| ------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| VR-SCH-DT-001 | Date format                  | Date-only fields must use `YYYY-MM-DD`.                                                                                                        | `ERR_SCH_INVALID_DATE_FORMAT`                   |
| VR-SCH-DT-002 | Time format                  | Time-only fields must use 24-hour `HH:mm` format.                                                                                              | `ERR_SCH_INVALID_TIME_FORMAT`                   |
| VR-SCH-DT-003 | Time ordering                | `startTime` must be strictly earlier than `endTime`.                                                                                           | `ERR_SCH_INVALID_TIME_RANGE`                    |
| VR-SCH-DT-004 | No cross-midnight sessions   | A session, working-hour window, or venue block cannot cross midnight in Phase 1.                                                               | `ERR_SCH_CROSS_MIDNIGHT_NOT_ALLOWED`            |
| VR-SCH-DT-005 | Minimum session duration     | Schedule session duration must be at least 15 minutes.                                                                                         | `ERR_SCH_SESSION_DURATION_TOO_SHORT`            |
| VR-SCH-DT-006 | Maximum session duration     | Schedule session duration must not exceed 480 minutes.                                                                                         | `ERR_SCH_SESSION_DURATION_TOO_LONG`             |
| VR-SCH-DT-007 | Recurrence date range        | Recurrence `dateFrom` must be on or before `dateTo`.                                                                                           | `ERR_SCH_RECURRENCE_RANGE_INVALID`              |
| VR-SCH-DT-008 | Recurrence maximum range     | Recurrence generation cannot span more than 366 calendar days in one request.                                                                  | `ERR_SCH_RECURRENCE_RANGE_TOO_LARGE`            |
| VR-SCH-DT-009 | Recurrence maximum output    | One generation request cannot create more than 120 sessions.                                                                                   | `ERR_SCH_RECURRENCE_MAX_SESSION_LIMIT_EXCEEDED` |
| VR-SCH-DT-010 | Oman timezone interpretation | Operational dates and times are interpreted in `Asia/Muscat`. Client timezone cannot alter conflict validation.                                | `ERR_SCH_TIMEZONE_UNSUPPORTED`                  |
| VR-SCH-DT-011 | Past scheduling              | Creating new sessions in the past is blocked unless user has `scheduling.admin.cross_branch.manage` and action is data correction with reason. | `ERR_SCH_PAST_SCHEDULING_NOT_ALLOWED`           |
| VR-SCH-DT-012 | Future scheduling horizon    | A session cannot be scheduled more than 730 days in the future.                                                                                | `ERR_SCH_FUTURE_SCHEDULING_LIMIT_EXCEEDED`      |

---

## 5. Business Calendar Validation Rules

| Rule ID        | Rule                        | Details                                                                                                                              | Error Code                             |
| -------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| VR-SCH-CAL-001 | Calendar code format        | Calendar code must match `^[A-Z0-9][A-Z0-9_-]{2,39}$`.                                                                               | `ERR_SCH_CALENDAR_CODE_INVALID`        |
| VR-SCH-CAL-002 | Calendar code uniqueness    | Calendar code must be unique per branch among non-deleted calendars.                                                                 | `ERR_SCH_CALENDAR_CODE_DUPLICATE`      |
| VR-SCH-CAL-003 | Year range                  | Calendar year must be between 2000 and 2100.                                                                                         | `ERR_SCH_CALENDAR_YEAR_INVALID`        |
| VR-SCH-CAL-004 | Country code                | Country code must be `OM` for current ASTI scope unless system configuration enables another country.                                | `ERR_SCH_COUNTRY_CODE_UNSUPPORTED`     |
| VR-SCH-CAL-005 | Timezone                    | Timezone must be `Asia/Muscat` for ASTI operational calendars.                                                                       | `ERR_SCH_TIMEZONE_UNSUPPORTED`         |
| VR-SCH-CAL-006 | Effective dates             | Effective end date must be null or greater than or equal to effective start date.                                                    | `ERR_SCH_INVALID_EFFECTIVE_DATE_RANGE` |
| VR-SCH-CAL-007 | Single active calendar      | Only one active calendar is allowed per branch/year.                                                                                 | `ERR_SCH_ACTIVE_CALENDAR_YEAR_EXISTS`  |
| VR-SCH-CAL-008 | Operating day completeness  | Calendar activation requires exactly seven weekday records.                                                                          | `ERR_SCH_OPERATING_DAYS_INCOMPLETE`    |
| VR-SCH-CAL-009 | Working hours for open day  | Open weekday must have at least one working-hour window.                                                                             | `ERR_SCH_WORKING_HOURS_REQUIRED`       |
| VR-SCH-CAL-010 | Closed day hours            | Closed weekday must not have working-hour windows.                                                                                   | `ERR_SCH_CLOSED_DAY_HAS_WORKING_HOURS` |
| VR-SCH-CAL-011 | Working hour overlap        | Working-hour windows for the same day must not overlap.                                                                              | `ERR_SCH_WORKING_HOURS_OVERLAP`        |
| VR-SCH-CAL-012 | Calendar close dependency   | Active calendar cannot be closed if it is the only calendar validating future published sessions unless replacement calendar exists. | `ERR_SCH_CALENDAR_DEPENDENCY_CONFLICT` |
| VR-SCH-CAL-013 | Calendar archive dependency | Calendar cannot be archived while future published sessions depend on it.                                                            | `ERR_SCH_CALENDAR_HAS_FUTURE_SESSIONS` |
| VR-SCH-CAL-014 | Calendar delete policy      | Only Draft calendars without holidays, venue blocks, and sessions may be soft deleted.                                               | `ERR_SCH_CALENDAR_DELETE_NOT_ALLOWED`  |

---

## 6. Holiday Validation Rules

| Rule ID        | Rule                         | Details                                                                                     | Error Code                                   |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| VR-SCH-HOL-001 | Holiday date inside calendar | Holiday date must fall within the parent calendar effective date range.                     | `ERR_SCH_HOLIDAY_OUTSIDE_CALENDAR_RANGE`     |
| VR-SCH-HOL-002 | Branch-calendar match        | Holiday branch must match the parent calendar branch.                                       | `ERR_SCH_HOLIDAY_BRANCH_MISMATCH`            |
| VR-SCH-HOL-003 | Duplicate holiday            | Same calendar, date, and holiday type cannot have more than one active non-deleted holiday. | `ERR_SCH_HOLIDAY_DUPLICATE_DATE`             |
| VR-SCH-HOL-004 | Name required                | Holiday requires English and Arabic names.                                                  | `ERR_SCH_HOLIDAY_NAME_REQUIRED`              |
| VR-SCH-HOL-005 | Activation impact check      | Activating holiday must check future draft and published sessions on that date.             | `ERR_SCH_HOLIDAY_PUBLISHED_SESSION_CONFLICT` |
| VR-SCH-HOL-006 | Cancellation reason          | Cancelling active holiday requires reason.                                                  | `ERR_SCH_REASON_REQUIRED`                    |
| VR-SCH-HOL-007 | Delete policy                | Active holidays cannot be soft deleted; cancel first.                                       | `ERR_SCH_HOLIDAY_DELETE_NOT_ALLOWED`         |
| VR-SCH-HOL-008 | Override policy required     | Holiday affecting scheduling must define override policy.                                   | `ERR_SCH_HOLIDAY_OVERRIDE_POLICY_REQUIRED`   |

---

## 7. Venue Block Validation Rules

| Rule ID       | Rule                    | Details                                                                                                  | Error Code                                       |
| ------------- | ----------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| VR-SCH-VB-001 | Scope consistency       | `CLASSROOM` scope requires classroomId; `BRANCH` scope forbids classroomId.                              | `ERR_SCH_VENUE_BLOCK_SCOPE_INVALID`              |
| VR-SCH-VB-002 | Classroom branch        | Classroom must belong to venue block branch.                                                             | `ERR_SCH_CLASSROOM_BRANCH_MISMATCH`              |
| VR-SCH-VB-003 | Time range              | Block start time must be before block end time.                                                          | `ERR_SCH_VENUE_BLOCK_TIME_INVALID`               |
| VR-SCH-VB-004 | No cross-midnight block | Venue block cannot cross midnight in Phase 1.                                                            | `ERR_SCH_CROSS_MIDNIGHT_NOT_ALLOWED`             |
| VR-SCH-VB-005 | Active block overlap    | Two active branch-level blocks for same branch/date/time cannot overlap.                                 | `ERR_SCH_VENUE_BLOCK_OVERLAP`                    |
| VR-SCH-VB-006 | Classroom block overlap | Two active classroom-level blocks for same classroom/date/time cannot overlap.                           | `ERR_SCH_VENUE_BLOCK_OVERLAP`                    |
| VR-SCH-VB-007 | Activation impact check | Activating a venue block must check future published sessions in affected scope.                         | `ERR_SCH_VENUE_BLOCK_PUBLISHED_SESSION_CONFLICT` |
| VR-SCH-VB-008 | Delete policy           | Active venue block cannot be soft deleted; cancel first.                                                 | `ERR_SCH_VENUE_BLOCK_DELETE_NOT_ALLOWED`         |
| VR-SCH-VB-009 | Reason localization     | Venue block reason must have English and Arabic text.                                                    | `ERR_SCH_VENUE_BLOCK_REASON_REQUIRED`            |
| VR-SCH-VB-010 | Expiry rule             | System may mark active venue block as Expired after block date/time passes, but must not hard delete it. | `ERR_SCH_VENUE_BLOCK_EXPIRY_INVALID`             |

---

## 8. Schedule Session Validation Rules

| Rule ID        | Rule                                   | Details                                                                                                                        | Error Code                                 |
| -------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| VR-SCH-SES-001 | Required batch                         | Schedule session must link to a valid batch.                                                                                   | `ERR_SCH_BATCH_REQUIRED`                   |
| VR-SCH-SES-002 | Batch branch match                     | Batch must belong to selected branch.                                                                                          | `ERR_SCH_BATCH_BRANCH_MISMATCH`            |
| VR-SCH-SES-003 | Course-batch match                     | Supplied course must match `Batch.courseId`.                                                                                   | `ERR_SCH_COURSE_BATCH_MISMATCH`            |
| VR-SCH-SES-004 | Classroom active                       | Classroom must be active, not deleted, and branch-compatible.                                                                  | `ERR_SCH_CLASSROOM_NOT_AVAILABLE`          |
| VR-SCH-SES-005 | Trainer active                         | Trainer must be active and valid for the branch/date.                                                                          | `ERR_SCH_TRAINER_NOT_AVAILABLE`            |
| VR-SCH-SES-006 | Trainer course authorization           | Trainer must be authorized for course when authorization is configured.                                                        | `ERR_SCH_COURSE_AUTHORIZATION_MISSING`     |
| VR-SCH-SES-007 | Batch date range                       | Session date must fall inside batch start and end dates unless override is approved.                                           | `ERR_SCH_BATCH_DATE_RANGE_VIOLATION`       |
| VR-SCH-SES-008 | Calendar active                        | An active institute calendar or applicable branch override must exist for the session date.                                    | `ERR_SCH_ACTIVE_CALENDAR_NOT_FOUND`        |
| VR-SCH-SES-009 | Operating day open                     | Session weekday must be open in the resolved calendar unless override is approved.                                             | `ERR_SCH_OUTSIDE_WORKING_DAY`              |
| VR-SCH-SES-010 | Working hours                          | Session start and end must fit within a configured working-hour window from the resolved calendar unless override is approved. | `ERR_SCH_OUTSIDE_WORKING_HOURS`            |
| VR-SCH-SES-011 | Holiday conflict                       | Active holiday with `affectsScheduling = true` blocks publish unless override is approved.                                     | `ERR_SCH_HOLIDAY_CONFLICT`                 |
| VR-SCH-SES-012 | Venue block conflict                   | Active branch or classroom venue block blocks publish unless override is approved.                                             | `ERR_SCH_VENUE_BLOCK_CONFLICT`             |
| VR-SCH-SES-013 | Trainer overlap                        | Trainer cannot have overlapping Published or Rescheduled active sessions.                                                      | `ERR_SCH_TRAINER_OVERLAP`                  |
| VR-SCH-SES-014 | Classroom overlap                      | Classroom cannot have overlapping Published or Rescheduled active sessions.                                                    | `ERR_SCH_CLASSROOM_OVERLAP`                |
| VR-SCH-SES-015 | Batch overlap                          | Batch cannot have overlapping Published or Rescheduled active sessions.                                                        | `ERR_SCH_BATCH_OVERLAP`                    |
| VR-SCH-SES-016 | Session number uniqueness              | Active non-deleted session number should be unique per batch unless rescheduled original is excluded.                          | `ERR_SCH_SESSION_NUMBER_DUPLICATE`         |
| VR-SCH-SES-017 | Publish requires no blocking conflicts | Session cannot move to Published with unresolved blocking conflict.                                                            | `ERR_SCH_SESSION_PUBLISH_BLOCKED`          |
| VR-SCH-SES-018 | Cancel reason                          | Cancelling a Published session requires reason code and notes.                                                                 | `ERR_SCH_REASON_REQUIRED`                  |
| VR-SCH-SES-019 | Reschedule reason                      | Rescheduling a Published session requires reason.                                                                              | `ERR_SCH_REASON_REQUIRED`                  |
| VR-SCH-SES-020 | Delete policy                          | Only Draft or Conflict sessions without attendance dependency can be soft deleted.                                             | `ERR_SCH_SESSION_DELETE_NOT_ALLOWED`       |
| VR-SCH-SES-021 | Attendance dependency                  | Completed sessions or sessions with marked attendance cannot be rescheduled by scheduling module.                              | `ERR_SCH_ATTENDANCE_DEPENDENCY_EXISTS`     |
| VR-SCH-SES-022 | Notification flag                      | Notification flags cannot be set true if Communication module is disabled; system logs pending notification event instead.     | `ERR_SCH_NOTIFICATION_CHANNEL_UNAVAILABLE` |

---

## 9. Conflict Detection Algorithm

### 9.1 Time Overlap Formula

Two time ranges overlap when:

```text
existing.startTime < proposed.endTime
AND proposed.startTime < existing.endTime
```

The check uses the same `scheduledDate`, branch scope, and active session states.

### 9.2 Trainer Conflict Check

```text
Input: branchId, trainerId, scheduledDate, startTime, endTime, excludeSessionId
1. Query schedule_sessions where:
      trainer_id = trainerId
      scheduled_date = scheduledDate
      status IN ('PUBLISHED', 'RESCHEDULED')
      is_deleted = false
      id != excludeSessionId when supplied
2. Apply overlap formula.
3. If any row overlaps, return TRAINER_OVERLAP ERROR.
4. Trainer overlap is not override-eligible in Phase 1 because one trainer cannot physically conduct two sessions at the same time.
```

### 9.3 Classroom Conflict Check

```text
Input: branchId, classroomId, scheduledDate, startTime, endTime, excludeSessionId
1. Query schedule_sessions where classroom_id = classroomId on the same date and active schedule status.
2. Apply overlap formula.
3. If overlap exists, return CLASSROOM_OVERLAP ERROR.
4. Classroom overlap is not override-eligible in Phase 1 for classroom delivery.
```

### 9.4 Batch Conflict Check

```text
Input: branchId, batchId, scheduledDate, startTime, endTime, excludeSessionId
1. Query active sessions for the same batch/date.
2. Apply overlap formula.
3. If overlap exists, return BATCH_OVERLAP ERROR.
4. Batch overlap is not override-eligible in Phase 1.
```

### 9.5 Holiday Conflict Check

```text
Input: branchId, scheduledDate
1. Find resolved calendar for scheduledDate.
2. Query active holidays for calendar/date where affectsScheduling = true.
3. If found, return HOLIDAY_CONFLICT ERROR.
4. If holiday.overridePolicy allows and user has scheduling.override.holiday, allow override after mandatory reason capture.
```

### 9.6 Venue Block Conflict Check

```text
Input: branchId, classroomId, scheduledDate, startTime, endTime
1. Query active branch-level venue blocks for branch/date.
2. Query active classroom-level venue blocks for classroom/date.
3. Apply overlap formula to each block.
4. If overlap exists, return VENUE_BLOCK_CONFLICT ERROR.
5. If block.overridePolicy allows and user has scheduling.override.venue_block, allow override after mandatory reason capture.
```

---

## 10. State Transition Validation Rules

### 10.1 ScheduleSession Status Transitions

| From        | To           | Allowed | Required Permission                  | Validation                                              |
| ----------- | ------------ | ------: | ------------------------------------ | ------------------------------------------------------- |
| Draft       | Published    |     Yes | `scheduling.session.publish`         | Must pass full conflict validation.                     |
| Draft       | Conflict     |     Yes | `scheduling.override.conflict_draft` | Must have conflict log and reason.                      |
| Draft       | Cancelled    |     Yes | `scheduling.session.cancel`          | Reason required.                                        |
| Draft       | Soft Deleted |     Yes | `scheduling.session.delete`          | No attendance dependency.                               |
| Conflict    | Draft        |     Yes | `scheduling.session.update`          | Conflicts resolved or user edits session.               |
| Conflict    | Published    |     Yes | `scheduling.session.publish`         | No unresolved blocking conflict or approved override.   |
| Conflict    | Cancelled    |     Yes | `scheduling.session.cancel`          | Reason required.                                        |
| Published   | Rescheduled  |     Yes | `scheduling.session.reschedule`      | New session must pass validation.                       |
| Published   | Cancelled    |     Yes | `scheduling.session.cancel`          | Reason required; downstream notification event.         |
| Published   | Completed    |     Yes | System / Attendance integration      | Attendance/delivery process completes session.          |
| Rescheduled | Cancelled    |      No | Not allowed                          | Original record remains historical.                     |
| Cancelled   | Published    |      No | Not allowed                          | Create or reschedule a new session instead.             |
| Completed   | Rescheduled  |      No | Not allowed                          | Requires correction workflow outside normal scheduling. |

### 10.2 Calendar Status Transitions

| From     | To           | Allowed | Required Permission           | Validation                                                                                      |
| -------- | ------------ | ------: | ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Draft    | Active       |     Yes | `scheduling.calendar.update`  | Seven operating days and valid working hours required; no active calendar for same branch/year. |
| Draft    | Soft Deleted |     Yes | `scheduling.calendar.delete`  | No dependencies.                                                                                |
| Active   | Closed       |     Yes | `scheduling.calendar.update`  | Reason required; replacement/impact check.                                                      |
| Closed   | Archived     |     Yes | `scheduling.calendar.archive` | No future published sessions depend on calendar.                                                |
| Active   | Archived     |      No | Not allowed                   | Must close first.                                                                               |
| Archived | Active       |      No | Not allowed                   | Archived is locked.                                                                             |

### 10.3 Holiday Status Transitions

| From      | To           | Allowed | Required Permission         | Validation                                    |
| --------- | ------------ | ------: | --------------------------- | --------------------------------------------- |
| Draft     | Active       |     Yes | `scheduling.holiday.update` | Date/calendar/duplicate checks; impact check. |
| Draft     | Soft Deleted |     Yes | `scheduling.holiday.delete` | No dependency.                                |
| Active    | Inactive     |     Yes | `scheduling.holiday.update` | Reason required.                              |
| Active    | Cancelled    |     Yes | `scheduling.holiday.update` | Reason required.                              |
| Inactive  | Active       |     Yes | `scheduling.holiday.update` | Re-run impact check.                          |
| Cancelled | Archived     |     Yes | `scheduling.holiday.update` | Historical lock.                              |
| Archived  | Active       |      No | Not allowed                 | Archived is locked.                           |

### 10.4 VenueBlock Status Transitions

| From      | To           | Allowed | Required Permission             | Validation                                   |
| --------- | ------------ | ------: | ------------------------------- | -------------------------------------------- |
| Draft     | Active       |     Yes | `scheduling.venue_block.update` | Overlap and published session impact checks. |
| Draft     | Soft Deleted |     Yes | `scheduling.venue_block.delete` | No dependency.                               |
| Active    | Cancelled    |     Yes | `scheduling.venue_block.update` | Reason required.                             |
| Active    | Expired      |     Yes | System Job                      | Block end date/time passed.                  |
| Cancelled | Archived     |     Yes | `scheduling.venue_block.update` | Historical lock.                             |
| Expired   | Archived     |     Yes | `scheduling.venue_block.update` | Historical lock.                             |
| Archived  | Active       |      No | Not allowed                     | Archived is locked.                          |

---

## 11. Structured Error Code Catalog

### 11.1 Common and Authorization Errors

| Code                               | HTTP | Severity | Message                                                        |
| ---------------------------------- | ---: | -------- | -------------------------------------------------------------- |
| `ERR_AUTH_REQUIRED`                |  401 | Error    | Authentication is required.                                    |
| `ERR_IAM_PERMISSION_DENIED`        |  403 | Error    | You do not have permission to perform this scheduling action.  |
| `ERR_ORG_BRANCH_SCOPE_DENIED`      |  403 | Error    | Requested branch is outside your assigned branch access.       |
| `ERR_VALIDATION_FAILED`            |  422 | Error    | One or more fields failed validation.                          |
| `ERR_VALIDATION_INVALID_UUID`      |  422 | Error    | Identifier must be a valid UUID.                               |
| `ERR_VALIDATION_INVALID_ENUM`      |  422 | Error    | Status or type value is not supported.                         |
| `ERR_CONCURRENCY_VERSION_MISMATCH` |  409 | Error    | This record was changed by another user. Reload and try again. |
| `ERR_INTERNAL_SERVER_ERROR`        |  500 | Error    | Unexpected server error.                                       |

### 11.2 Scheduling Domain Errors

| Code                                            | HTTP | Severity | User Message                                                                    |                           Audit Required |
| ----------------------------------------------- | ---: | -------- | ------------------------------------------------------------------------------- | ---------------------------------------: |
| `ERR_SCH_INVALID_DATE_FORMAT`                   |  422 | Error    | Date must be in YYYY-MM-DD format.                                              |                                       No |
| `ERR_SCH_INVALID_TIME_FORMAT`                   |  422 | Error    | Time must be in HH:mm format.                                                   |                                       No |
| `ERR_SCH_INVALID_TIME_RANGE`                    |  400 | Error    | Start time must be earlier than end time.                                       |                                       No |
| `ERR_SCH_CROSS_MIDNIGHT_NOT_ALLOWED`            |  400 | Error    | Cross-midnight scheduling is not supported in the current phase.                |                                       No |
| `ERR_SCH_SESSION_DURATION_TOO_SHORT`            |  422 | Error    | Session duration must be at least 15 minutes.                                   |                                       No |
| `ERR_SCH_SESSION_DURATION_TOO_LONG`             |  422 | Error    | Session duration must not exceed 480 minutes.                                   |                                       No |
| `ERR_SCH_TIMEZONE_UNSUPPORTED`                  |  422 | Error    | Only Asia/Muscat timezone is supported for ASTI scheduling.                     |                                       No |
| `ERR_SCH_PAST_SCHEDULING_NOT_ALLOWED`           |  409 | Error    | New sessions cannot be scheduled in the past.                                   | Yes when privileged correction attempted |
| `ERR_SCH_FUTURE_SCHEDULING_LIMIT_EXCEEDED`      |  409 | Error    | Sessions cannot be scheduled more than 730 days ahead.                          |                                       No |
| `ERR_SCH_CALENDAR_CODE_INVALID`                 |  422 | Error    | Calendar code format is invalid.                                                |                                       No |
| `ERR_SCH_CALENDAR_CODE_DUPLICATE`               |  409 | Error    | Calendar code already exists for this branch.                                   |                                       No |
| `ERR_SCH_ACTIVE_CALENDAR_YEAR_EXISTS`           |  409 | Error    | An active calendar already exists for this branch and year.                     |                                      Yes |
| `ERR_SCH_ACTIVE_CALENDAR_NOT_FOUND`             |  409 | Error    | No active business calendar exists for the selected branch and date.            |                                       No |
| `ERR_SCH_OPERATING_DAYS_INCOMPLETE`             |  409 | Error    | Calendar requires exactly seven operating days.                                 |                                       No |
| `ERR_SCH_WORKING_HOURS_REQUIRED`                |  409 | Error    | Open operating day requires working hours.                                      |                                       No |
| `ERR_SCH_WORKING_HOURS_OVERLAP`                 |  409 | Error    | Working-hour windows cannot overlap.                                            |                                       No |
| `ERR_SCH_HOLIDAY_DUPLICATE_DATE`                |  409 | Error    | A matching holiday already exists for this calendar/date/type.                  |                                       No |
| `ERR_SCH_HOLIDAY_CONFLICT`                      |  409 | Error    | The selected date is blocked by an active holiday.                              |              Yes when override attempted |
| `ERR_SCH_VENUE_BLOCK_CONFLICT`                  |  409 | Error    | The selected time conflicts with an active venue block.                         |              Yes when override attempted |
| `ERR_SCH_TRAINER_OVERLAP`                       |  409 | Error    | Trainer is already assigned to another session at this time.                    |                                      Yes |
| `ERR_SCH_CLASSROOM_OVERLAP`                     |  409 | Error    | Classroom is already booked at this time.                                       |                                      Yes |
| `ERR_SCH_BATCH_OVERLAP`                         |  409 | Error    | Batch already has another session at this time.                                 |                                      Yes |
| `ERR_SCH_TRAINER_UNAVAILABLE`                   |  409 | Error    | Trainer availability does not cover this session time.                          |              Yes when override attempted |
| `ERR_SCH_OUTSIDE_WORKING_DAY`                   |  409 | Error    | Selected date is a closed operating day.                                        |              Yes when override attempted |
| `ERR_SCH_OUTSIDE_WORKING_HOURS`                 |  409 | Error    | Selected time is outside branch working hours.                                  |              Yes when override attempted |
| `ERR_SCH_BATCH_DATE_RANGE_VIOLATION`            |  409 | Error    | Session date is outside the batch date range.                                   |              Yes when override attempted |
| `ERR_SCH_COURSE_BATCH_MISMATCH`                 |  409 | Error    | Selected course does not match selected batch.                                  |                                       No |
| `ERR_SCH_CLASSROOM_BRANCH_MISMATCH`             |  409 | Error    | Classroom does not belong to selected branch.                                   |                                       No |
| `ERR_SCH_TRAINER_BRANCH_MISMATCH`               |  409 | Error    | Trainer is not valid for selected branch.                                       |                                       No |
| `ERR_SCH_COURSE_AUTHORIZATION_MISSING`          |  409 | Error    | Trainer is not authorized to teach the selected course.                         |                                       No |
| `ERR_SCH_SESSION_PUBLISH_BLOCKED`               |  409 | Error    | Session cannot be published because blocking conflicts exist.                   |                                      Yes |
| `ERR_SCH_UNRESOLVED_CONFLICTS`                  |  409 | Error    | Unresolved conflicts must be fixed before publishing.                           |                                      Yes |
| `ERR_SCH_SESSION_CANCEL_NOT_ALLOWED`            |  409 | Error    | This session cannot be cancelled in its current state.                          |                                      Yes |
| `ERR_SCH_SESSION_RESCHEDULE_NOT_ALLOWED`        |  409 | Error    | This session cannot be rescheduled in its current state.                        |                                      Yes |
| `ERR_SCH_ATTENDANCE_DEPENDENCY_EXISTS`          |  409 | Error    | Attendance exists for this session, so normal scheduling changes are blocked.   |                                      Yes |
| `ERR_SCH_OVERRIDE_PERMISSION_REQUIRED`          |  403 | Error    | This conflict requires a permissioned override.                                 |                                      Yes |
| `ERR_SCH_REASON_REQUIRED`                       |  422 | Error    | A clear reason is required for this action.                                     |                                       No |
| `ERR_SCH_RECURRENCE_RANGE_INVALID`              |  400 | Error    | Recurrence start date must be on or before end date.                            |                                       No |
| `ERR_SCH_RECURRENCE_MAX_SESSION_LIMIT_EXCEEDED` |  409 | Error    | Recurrence request exceeds the maximum number of sessions.                      |                                       No |
| `ERR_SCH_GENERATION_NO_VALID_DATES`             |  409 | Error    | No valid schedule dates were found for the recurrence rule.                     |                                       No |
| `ERR_SCH_NOTIFICATION_CHANNEL_UNAVAILABLE`      |  409 | Warning  | Notification channel is not enabled; event will be logged for later processing. |                                      Yes |

---

## 12. Notification Principles

1. Scheduling notifications are triggered by domain events from Module 07.
2. Communication & Notification Management owns templates, delivery provider configuration, retry, and delivery logs.
3. Scheduling supplies exact event payloads and recipient intent.
4. In Phase 1, if outbound delivery is not enabled, the system must still create an internal `NotificationRequest` or log a pending communication event where the Communication module supports it.
5. Notifications must respect user preferred language where available.
6. Arabic notifications must use RTL-compatible template rendering.
7. Student notifications are sent only for published sessions affecting their active enrollments.
8. Trainer notifications are sent only to the assigned trainer for the session.
9. Corporate coordinator notifications are sent only when corporate portal/contact notification preference is enabled.
10. Cancellation and reschedule notifications must include the reason category, but internal notes are not exposed to students.

---

## 13. Notification Event Catalog

| Event Code                               | Trigger                                                                   | Recipients                                                                   | Channels                     | Template Code                      |                   Mandatory |
| ---------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------- | ---------------------------------- | --------------------------: |
| `SCH_CALENDAR_ACTIVATED`                 | Business calendar changes to Active                                       | Branch Admin, Branch Manager, Academic Coordinator                           | System, Email                | `SCH_CALENDAR_ACTIVATED_V1`        |                          No |
| `SCH_HOLIDAY_CREATED_ACTIVE`             | Active holiday is created                                                 | Branch Admin, Academic Coordinator, Training Coordinator, Reception          | System, Email                | `SCH_HOLIDAY_CREATED_ACTIVE_V1`    |                          No |
| `SCH_HOLIDAY_UPDATED_IMPACTING_SESSIONS` | Holiday update affects future sessions                                    | Branch Manager, Academic Coordinator                                         | System, Email                | `SCH_HOLIDAY_IMPACT_V1`            |                         Yes |
| `SCH_VENUE_BLOCK_CREATED_ACTIVE`         | Active venue block created                                                | Branch Admin, Academic Coordinator, Reception                                | System, Email                | `SCH_VENUE_BLOCK_CREATED_V1`       |                          No |
| `SCH_VENUE_BLOCK_IMPACTING_SESSIONS`     | Active block conflicts with future sessions                               | Branch Manager, Academic Coordinator                                         | System, Email                | `SCH_VENUE_BLOCK_IMPACT_V1`        |                         Yes |
| `SCH_SESSION_PUBLISHED`                  | Session moves to Published                                                | Trainer, enrolled students, reception, corporate coordinator when applicable | System, Email, SMS, WhatsApp | `SCH_SESSION_PUBLISHED_V1`         |                          No |
| `SCH_SESSION_RESCHEDULED`                | Published session is rescheduled                                          | Trainer, enrolled students, reception, corporate coordinator when applicable | System, Email, SMS, WhatsApp | `SCH_SESSION_RESCHEDULED_V1`       |                         Yes |
| `SCH_SESSION_CANCELLED`                  | Published session is cancelled                                            | Trainer, enrolled students, reception, corporate coordinator when applicable | System, Email, SMS, WhatsApp | `SCH_SESSION_CANCELLED_V1`         |                         Yes |
| `SCH_SESSION_CONFLICT_DETECTED`          | Conflict check returns blocking conflict during create/publish/reschedule | Acting user, Academic Coordinator, Branch Manager when conflict draft saved  | System                       | `SCH_SESSION_CONFLICT_DETECTED_V1` |                          No |
| `SCH_OVERRIDE_USED`                      | User publishes or saves with approved override                            | Branch Manager, Auditor, Super Admin                                         | System, Email                | `SCH_OVERRIDE_USED_V1`             |                         Yes |
| `SCH_BULK_GENERATION_COMPLETED`          | Recurring schedule generation finishes                                    | Requesting user, Academic Coordinator                                        | System, Email                | `SCH_BULK_GENERATION_COMPLETED_V1` |                          No |
| `SCH_EXPORT_CREATED`                     | Schedule export created                                                   | Requesting user; audit copy to Auditor for consolidated export               | System                       | `SCH_EXPORT_CREATED_V1`            | Yes for consolidated export |
| `SCH_VENUE_BLOCK_EXPIRED`                | System marks active block expired                                         | Branch Admin, Academic Coordinator                                           | System                       | `SCH_VENUE_BLOCK_EXPIRED_V1`       |                          No |

---

## 14. Template Variable Catalog

### 14.1 Shared Variables

| Variable             | Type             | Description                                                   | Example                           |
| -------------------- | ---------------- | ------------------------------------------------------------- | --------------------------------- |
| `{{recipientName}}`  | string           | Recipient display name in preferred language where available. | `Ahmed Al Balushi`                |
| `{{branchName}}`     | localized string | Branch name.                                                  | `Muscat Branch`                   |
| `{{branchCode}}`     | string           | Branch code.                                                  | `MCT`                             |
| `{{courseName}}`     | localized string | Course name from Course Catalog.                              | `Health and Safety Training`      |
| `{{courseCode}}`     | string           | Course code.                                                  | `HSE-101`                         |
| `{{batchName}}`      | string           | Batch display name.                                           | `HSE April Batch`                 |
| `{{batchCode}}`      | string           | Batch code.                                                   | `HSE-MCT-2026-04`                 |
| `{{sessionTitle}}`   | localized string | Session title.                                                | `Session 3 - Fire Safety Basics`  |
| `{{sessionNumber}}`  | number           | Session number in batch sequence.                             | `3`                               |
| `{{scheduledDate}}`  | date             | Local date formatted by language.                             | `10 Aug 2026`                     |
| `{{startTime}}`      | time             | Local start time in Oman timezone.                            | `09:00`                           |
| `{{endTime}}`        | time             | Local end time in Oman timezone.                              | `11:00`                           |
| `{{timezoneLabel}}`  | string           | Timezone label.                                               | `Oman GST (UTC+4)`                |
| `{{trainerName}}`    | string           | Trainer display name.                                         | `Ahmed Al Balushi`                |
| `{{classroomName}}`  | string           | Classroom display name.                                       | `Room 201`                        |
| `{{location}}`       | string           | Location or classroom location.                               | `Second Floor`                    |
| `{{portalLink}}`     | string           | Secure deep link to portal schedule view.                     | `/admin/scheduling/sessions/uuid` |
| `{{supportContact}}` | string           | ASTI support phone or email from configuration.               | `+968 XXXXXXXX`                   |

### 14.2 Reschedule Variables

| Variable                       | Type   | Description                                |
| ------------------------------ | ------ | ------------------------------------------ |
| `{{oldScheduledDate}}`         | date   | Previous session date.                     |
| `{{oldStartTime}}`             | time   | Previous session start time.               |
| `{{oldEndTime}}`               | time   | Previous session end time.                 |
| `{{oldTrainerName}}`           | string | Previous trainer if changed.               |
| `{{oldClassroomName}}`         | string | Previous classroom if changed.             |
| `{{newScheduledDate}}`         | date   | New session date.                          |
| `{{newStartTime}}`             | time   | New session start time.                    |
| `{{newEndTime}}`               | time   | New session end time.                      |
| `{{newTrainerName}}`           | string | New trainer.                               |
| `{{newClassroomName}}`         | string | New classroom.                             |
| `{{rescheduleReasonCategory}}` | string | External-safe reason category.             |
| `{{rescheduleReasonNotes}}`    | string | Notes visible only to internal recipients. |

### 14.3 Cancellation Variables

| Variable                      | Type             | Description                                                           |
| ----------------------------- | ---------------- | --------------------------------------------------------------------- |
| `{{cancellationReasonCode}}`  | string           | Standard reason code.                                                 |
| `{{cancellationReasonLabel}}` | localized string | Localized reason label.                                               |
| `{{cancellationNotes}}`       | string           | Internal notes; not sent to students unless explicitly marked public. |
| `{{replacementExpected}}`     | boolean          | Whether replacement session is expected.                              |
| `{{nextSessionDate}}`         | date             | Next scheduled session if available.                                  |

### 14.4 Conflict and Override Variables

| Variable                         | Type     | Description                                   |
| -------------------------------- | -------- | --------------------------------------------- |
| `{{conflictType}}`               | enum     | Conflict type such as `TRAINER_OVERLAP`.      |
| `{{conflictSeverity}}`           | enum     | `ERROR`, `WARNING`, or `INFO`.                |
| `{{conflictMessage}}`            | string   | Human-readable conflict message.              |
| `{{conflictingEntityType}}`      | string   | Entity that caused conflict.                  |
| `{{conflictingEntityReference}}` | string   | Safe display reference of conflicting entity. |
| `{{overrideType}}`               | enum     | Override type used.                           |
| `{{overrideReason}}`             | string   | Mandatory override reason.                    |
| `{{overrideApprovedBy}}`         | string   | User who approved/performed override.         |
| `{{overrideAt}}`                 | datetime | Timestamp of override.                        |

---

## 15. Notification Template Specifications

### 15.1 `SCH_SESSION_PUBLISHED_V1`

| Field              | Specification                                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose            | Informs trainer and learners that a session is now officially scheduled.                                                                                                         |
| Channels           | System, Email, SMS, WhatsApp                                                                                                                                                     |
| Audience           | Trainer, enrolled students, reception, corporate coordinator where applicable                                                                                                    |
| Required Variables | `recipientName`, `courseName`, `batchCode`, `sessionTitle`, `scheduledDate`, `startTime`, `endTime`, `timezoneLabel`, `trainerName`, `classroomName`, `branchName`, `portalLink` |

Email subject English:

```text
Session Scheduled: {{courseName}} – {{scheduledDate}} {{startTime}}
```

Email body English:

```text
Dear {{recipientName}},

Your training session has been scheduled.

Course: {{courseName}}
Batch: {{batchCode}}
Session: {{sessionTitle}}
Date: {{scheduledDate}}
Time: {{startTime}} to {{endTime}} {{timezoneLabel}}
Trainer: {{trainerName}}
Classroom: {{classroomName}}
Branch: {{branchName}}

View details: {{portalLink}}

Regards,
ASTI Training Team
```

SMS English:

```text
ASTI: {{courseName}} session for batch {{batchCode}} is scheduled on {{scheduledDate}} from {{startTime}} to {{endTime}} at {{classroomName}}.
```

WhatsApp English:

```text
ASTI session scheduled: {{courseName}}, {{scheduledDate}}, {{startTime}}-{{endTime}}, {{classroomName}}. Details: {{portalLink}}
```

### 15.2 `SCH_SESSION_RESCHEDULED_V1`

| Field              | Specification                                                                                                                                                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose            | Notifies recipients that a published session has been moved.                                                                                                                                                                                                                  |
| Channels           | System, Email, SMS, WhatsApp                                                                                                                                                                                                                                                  |
| Mandatory          | Yes when `notifyTrainer` or `notifyStudents` is true                                                                                                                                                                                                                          |
| Required Variables | `recipientName`, `courseName`, `batchCode`, `sessionTitle`, `oldScheduledDate`, `oldStartTime`, `oldEndTime`, `newScheduledDate`, `newStartTime`, `newEndTime`, `timezoneLabel`, `newTrainerName`, `newClassroomName`, `branchName`, `rescheduleReasonCategory`, `portalLink` |

Email subject English:

```text
Session Rescheduled: {{courseName}} – New Date {{newScheduledDate}}
```

Email body English:

```text
Dear {{recipientName}},

A training session has been rescheduled.

Course: {{courseName}}
Batch: {{batchCode}}
Session: {{sessionTitle}}

Previous Schedule: {{oldScheduledDate}}, {{oldStartTime}} to {{oldEndTime}} {{timezoneLabel}}
New Schedule: {{newScheduledDate}}, {{newStartTime}} to {{newEndTime}} {{timezoneLabel}}
Trainer: {{newTrainerName}}
Classroom: {{newClassroomName}}
Branch: {{branchName}}
Reason: {{rescheduleReasonCategory}}

View updated schedule: {{portalLink}}

Regards,
ASTI Training Team
```

SMS English:

```text
ASTI: {{courseName}} session moved from {{oldScheduledDate}} {{oldStartTime}} to {{newScheduledDate}} {{newStartTime}}. Check portal for details.
```

WhatsApp English:

```text
ASTI update: {{courseName}} session rescheduled to {{newScheduledDate}}, {{newStartTime}}-{{newEndTime}}, {{newClassroomName}}. {{portalLink}}
```

### 15.3 `SCH_SESSION_CANCELLED_V1`

| Field              | Specification                                                                                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose            | Notifies recipients that a published session is cancelled.                                                                                                                                   |
| Channels           | System, Email, SMS, WhatsApp                                                                                                                                                                 |
| Mandatory          | Yes when cancelling published session and notification flags are enabled                                                                                                                     |
| Required Variables | `recipientName`, `courseName`, `batchCode`, `sessionTitle`, `scheduledDate`, `startTime`, `endTime`, `timezoneLabel`, `classroomName`, `branchName`, `cancellationReasonLabel`, `portalLink` |

Email subject English:

```text
Session Cancelled: {{courseName}} – {{scheduledDate}}
```

Email body English:

```text
Dear {{recipientName}},

The following training session has been cancelled.

Course: {{courseName}}
Batch: {{batchCode}}
Session: {{sessionTitle}}
Cancelled Schedule: {{scheduledDate}}, {{startTime}} to {{endTime}} {{timezoneLabel}}
Branch: {{branchName}}
Classroom: {{classroomName}}
Reason: {{cancellationReasonLabel}}

Please check your portal for the latest schedule updates: {{portalLink}}

Regards,
ASTI Training Team
```

SMS English:

```text
ASTI: {{courseName}} session on {{scheduledDate}} at {{startTime}} has been cancelled. Reason: {{cancellationReasonLabel}}.
```

### 15.4 `SCH_OVERRIDE_USED_V1`

| Field              | Specification                                                                                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose            | Alerts management and audit users when a scheduling rule is bypassed.                                                                                                                                |
| Channels           | System, Email                                                                                                                                                                                        |
| Audience           | Branch Manager, Auditor, Super Admin                                                                                                                                                                 |
| Required Variables | `branchName`, `courseName`, `batchCode`, `sessionTitle`, `scheduledDate`, `startTime`, `endTime`, `overrideType`, `overrideReason`, `overrideApprovedBy`, `overrideAt`, `conflictType`, `portalLink` |

Email subject English:

```text
Scheduling Override Used: {{overrideType}} – {{branchName}}
```

Email body English:

```text
A scheduling override was used.

Branch: {{branchName}}
Course: {{courseName}}
Batch: {{batchCode}}
Session: {{sessionTitle}}
Date/Time: {{scheduledDate}}, {{startTime}} to {{endTime}}
Conflict Type: {{conflictType}}
Override Type: {{overrideType}}
Reason: {{overrideReason}}
Approved/Performed By: {{overrideApprovedBy}}
Time: {{overrideAt}}

Review record: {{portalLink}}
```

### 15.5 `SCH_BULK_GENERATION_COMPLETED_V1`

| Field              | Specification                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose            | Notifies requester that recurring schedule generation completed.                                                                                                   |
| Channels           | System, Email                                                                                                                                                      |
| Required Variables | `recipientName`, `branchName`, `courseName`, `batchCode`, `createdSessionCount`, `skippedHolidayCount`, `conflictSessionCount`, `failedSessionCount`, `portalLink` |

Email subject English:

```text
Schedule Generation Completed: {{batchCode}}
```

Email body English:

```text
Dear {{recipientName}},

Recurring schedule generation has completed for batch {{batchCode}}.

Course: {{courseName}}
Branch: {{branchName}}
Created Sessions: {{createdSessionCount}}
Skipped Holidays: {{skippedHolidayCount}}
Conflict Sessions: {{conflictSessionCount}}
Failed Sessions: {{failedSessionCount}}

Review generated sessions: {{portalLink}}
```

---

## 16. Notification Recipient Resolution Rules

| Recipient Type        | Resolution Rule                                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trainer               | Resolve `ScheduleSession.trainerId → TrainerProfile.personId → Person.primaryEmail/primaryPhone/User notification preferences`.                       |
| Student               | Resolve `ScheduleSession.batchId → Enrollment.batchId where enrollmentStatus IN ('Confirmed','Active') → StudentProfile.personId → Person contacts`.  |
| Corporate Coordinator | Resolve active corporate enrollments for affected batch/session, then corporate account primary coordinator/contact with portal notification enabled. |
| Reception             | Resolve active users in same branch with `scheduling.view.daily.read` and role/category configured as Reception.                                      |
| Academic Coordinator  | Resolve active users in same branch with `scheduling.session.create` or configured coordinator role.                                                  |
| Branch Manager        | Resolve `Branch.branchManagerId` and users with `scheduling.override.*` for branch.                                                                   |
| Auditor               | Resolve users with `scheduling.audit.read` in branch or consolidated audit scope.                                                                     |
| CEO / Executive       | Resolve users with `scheduling.report.consolidated.read` only for configured report notifications.                                                    |

---

## 17. Notification Suppression Rules

| Rule ID    | Rule                                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| NS-SCH-001 | Do not send student notifications for Draft or Conflict sessions.                                                                                  |
| NS-SCH-002 | Do not expose internal conflict details to students or corporate coordinators.                                                                     |
| NS-SCH-003 | Do not send duplicate notifications to the same person/channel/template/session event within the same event transaction.                           |
| NS-SCH-004 | Do not send WhatsApp or SMS if the recipient has no valid phone number. Create a notification log entry with `SKIPPED_NO_CONTACT`.                 |
| NS-SCH-005 | Do not send email if the recipient has no valid email. Create a notification log entry with `SKIPPED_NO_CONTACT`.                                  |
| NS-SCH-006 | If `notifyStudents = false`, create only internal audit and system notification for the action.                                                    |
| NS-SCH-007 | If Communication module is disabled, create `NotificationRequest` with status `PENDING_CONFIGURATION` where supported, otherwise write audit note. |
| NS-SCH-008 | For reschedule within 30 minutes of prior schedule creation and no notification has been sent yet, send only the final schedule notification.      |
| NS-SCH-009 | Arabic template must be used when recipient preferred language is Arabic; fallback to English if Arabic template is inactive.                      |

---

## 18. Cross-Module Validation Dependencies

| Dependency                               | Owning Module                           | Validation Used by Scheduling                             |
| ---------------------------------------- | --------------------------------------- | --------------------------------------------------------- |
| Branch active status and hierarchy       | Organization Management                 | Validate branch scope and branch operational eligibility. |
| Classroom active status and branch       | Organization Management                 | Validate classroom booking.                               |
| Batch status, date range, branch, course | Training Delivery Management            | Validate session can be scheduled for batch.              |
| Course status and course ID              | Course Catalog Management               | Validate course is active and matches batch.              |
| Trainer profile status and branch        | Faculty / Trainer Management            | Validate trainer can be assigned.                         |
| Trainer availability                     | Faculty / Trainer Management            | Validate trainer availability by date/time.               |
| Trainer course authorization             | Faculty / Trainer Management            | Validate trainer can teach course where configured.       |
| Enrollment list                          | Admission & Enrollment Management       | Resolve student recipients for notifications.             |
| Corporate enrollments                    | Corporate Training Management           | Resolve corporate coordinator recipients.                 |
| Attendance session and records           | Attendance Management                   | Block normal reschedule/delete after attendance starts.   |
| User permissions and branches            | Identity & Access Management            | Authorize every operation.                                |
| Notification templates and delivery      | Communication & Notification Management | Deliver schedule event notifications.                     |
| AuditLog                                 | Audit & Compliance                      | Record sensitive actions.                                 |

---

## 19. Validation Test Scenarios

| Scenario ID | Test Case                                                                               | Expected Result                                                          |
| ----------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| TS-SCH-001  | Create session for batch branch A using classroom from branch B.                        | Reject with `ERR_SCH_CLASSROOM_BRANCH_MISMATCH`.                         |
| TS-SCH-002  | Publish session on active public holiday without override permission.                   | Reject with `ERR_SCH_HOLIDAY_CONFLICT`.                                  |
| TS-SCH-003  | Publish session on active public holiday with `scheduling.override.holiday` and reason. | Publish and create `SCH_OVERRIDE_USED` event.                            |
| TS-SCH-004  | Create two published sessions for same trainer with overlapping time.                   | Reject second request with `ERR_SCH_TRAINER_OVERLAP`.                    |
| TS-SCH-005  | Create two draft sessions for same classroom with overlapping time.                     | Allow draft only if policy permits; conflict log must be created.        |
| TS-SCH-006  | Reschedule completed session.                                                           | Reject with `ERR_SCH_SESSION_RESCHEDULE_NOT_ALLOWED`.                    |
| TS-SCH-007  | Delete draft session with stale version.                                                | Reject with `ERR_CONCURRENCY_VERSION_MISMATCH`.                          |
| TS-SCH-008  | Generate recurrence across holidays with `skipHolidays = true`.                         | Create sessions for non-holiday dates and count skipped holidays.        |
| TS-SCH-009  | Activate second calendar for same branch/year.                                          | Reject with `ERR_SCH_ACTIVE_CALENDAR_YEAR_EXISTS`.                       |
| TS-SCH-010  | Create branch venue block overlapping published session.                                | Reject activation with `ERR_SCH_VENUE_BLOCK_PUBLISHED_SESSION_CONFLICT`. |
| TS-SCH-011  | Student tries to read another batch schedule.                                           | Reject or return empty result due to enrollment scope.                   |
| TS-SCH-012  | Trainer reads own weekly schedule.                                                      | Return only sessions assigned to own trainer profile.                    |
