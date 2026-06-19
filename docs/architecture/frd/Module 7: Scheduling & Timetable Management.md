# Functional Requirement Document

## Module 7: Scheduling & Timetable Management

**Version:** 1.1
**Module Code:** SCH
**Phase:** Phase 1
**Owned Bounded Context:** Scheduling & Timetable Management

**Dependencies:**

* Organization Management
* Course & Batch Management
* Faculty / Trainer Management
* Admission & Enrollment Management

**Provides Data To:**

* Attendance Management
* Exam, Result & Completion Management
* Student Management
* Trainer Management
* Reporting & Dashboards
* Audit & Compliance

---

# 1. Business Purpose

Scheduling & Timetable Management plans and controls the delivery calendar for batch-based and walk-in training.

The context owns schedule definitions, generated sessions, resource allocation, conflict detection, rescheduling, and timetable views.

The scheduling engine ensures that trainer, classroom, batch, and time-slot allocation remain conflict free unless an explicit override policy applies.

---

# 2. Scope

## 2.1 In Scope

* Schedule creation
* Session generation
* Timetable views
* Trainer allocation
* Classroom allocation
* Lab allocation where applicable
* Conflict detection
* Session rescheduling
* Session cancellation
* Session completion
* Trainer availability validation
* Branch, batch, trainer, and classroom timetable views

## 2.2 Out of Scope for Phase 1

* Attendance marking
* Completion approval
* Certificate issuance
* Equipment scheduling

---

# 3. Business Principles

* A schedule is the pattern definition.
* A session is the concrete delivery occurrence.
* A batch may have one or more schedules.
* Generated sessions are the operational source of truth for attendance readiness.
* Trainer double booking must be prevented.
* Classroom double booking must be prevented.
* Batch overlap conflicts must be prevented where schedules overlap for the same delivery window.
* Sessions outside trainer availability require override permission.
* Past sessions must not be changed through normal schedule edits.
* Cancelled or completed sessions remain in history.

---

# 4. Owned Concepts

The Scheduling context owns:

* Schedule
* ScheduleSession
* TrainerAvailability
* ConflictCheckResult
* TimetableViewDefinition

Notes:

* Batch, Course, Branch, Classroom, and Trainer are referenced from other contexts.
* Scheduling owns delivery timing and conflict policy, not batch ownership or trainer master data.
* Attendance is created or attached downstream, but it is not owned here.

---

# 5. Business Model

## 5.1 Schedule Types

The system shall support:

```text
Recurring
Fixed
Corporate
Walk-In
```

Rules:

* Recurring schedules are used for repeated weekly patterns.
* Fixed schedules are used for date-bound delivery blocks.
* Corporate schedules may use client-specific timings and locations.
* Walk-in schedules may support short-duration or same-day delivery patterns.

## 5.2 Session Lifecycle

```text
Planned
  ↓
Scheduled
  ↓
In Progress
  ↓
Completed
```

Alternative:

```text
Scheduled
  ↓
Cancelled
```

Alternative:

```text
Scheduled
  ↓
Rescheduled
```

Rules:

* Planned sessions are generated but not yet published.
* Scheduled sessions are visible on the timetable.
* Completed sessions are historical records and are not editable through normal flow.
* Cancelled sessions remain visible for audit and reporting.

## 5.3 Resource Types

Phase 1 supports:

```text
Trainer
Classroom
Lab
```

Rules:

* Equipment and other advanced resources are out of Phase 1 scope.
* A session may require one primary trainer and optional additional trainers.
* A session must be associated with a classroom or lab where required.

---

# 6. Screens

## SCH-UI-001 Timetable Dashboard

### Purpose

View institute schedules and sessions.

### Views

```text
Daily View
Weekly View
Monthly View
Trainer View
Classroom View
Batch View
```

### Filters

```text
Branch
Department
Course
Batch
Trainer
Classroom
Date Range
Session Status
```

### Actions

```text
Create Schedule
Edit Schedule
Generate Sessions
Reschedule Session
Cancel Session
View Conflicts
Export Timetable
```

### Permissions

```text
TIMETABLE_VIEW
TIMETABLE_CREATE
TIMETABLE_EDIT
TIMETABLE_CANCEL
TIMETABLE_EXPORT
```

---

## SCH-UI-002 Schedule List Screen

### Purpose

View and manage schedules.

### Columns

```text
Schedule Number
Course
Batch
Branch
Trainer
Start Date
End Date
Total Sessions
Status
Actions
```

### Filters

```text
Branch
Course
Batch
Trainer
Status
Search
```

### Actions

```text
Create
View
Edit
Generate Sessions
Publish Schedule
Cancel Schedule
```

### Permissions

```text
SCHEDULE_VIEW
SCHEDULE_CREATE
SCHEDULE_EDIT
SCHEDULE_PUBLISH
SCHEDULE_CANCEL
```

---

## SCH-UI-003 Create Schedule Screen

### Sections

#### Batch Information

```text
Batch
Course
Branch
```

#### Schedule Pattern

```text
Schedule Type
Start Date
End Date
Start Time
End Time
```

#### Recurrence Pattern

```text
Monday
Tuesday
Wednesday
Thursday
Friday
Saturday
Sunday
```

#### Resource Allocation

```text
Primary Trainer
Additional Trainers
Classroom
Lab
```

### Actions

```text
Generate Sessions
Save Draft
Publish Schedule
```

### Business Rules

* Batch information must be derived from the selected batch.
* A schedule must belong to an active batch.
* A schedule must belong to an active course and branch through the batch reference.
* Conflict validation must run before publish.
* Published schedules expose their sessions to timetable views.

### Validations

* Batch is required.
* Schedule Type is required.
* Start Date is required.
* End Date is required.
* Start Time is required.
* End Time is required.
* End Time must be after Start Time.
* Primary Trainer is required when trainer-led delivery is configured.
* Classroom or Lab is required where applicable.

---

## SCH-UI-004 Session Generation Screen

### Purpose

Generate concrete delivery sessions from a schedule.

### Example

Course duration:

```text
40 Hours
```

Schedule pattern:

```text
2 Hours Per Session
```

Generated sessions:

```text
20 Sessions
```

### Business Rules

* Hours-based courses generate sessions by total hours and hours per session.
* Sessions-based courses generate the configured number of sessions.
* Fixed-duration courses generate sessions using recurrence rules.
* Completed sessions must never be regenerated.
* Hard conflicts must block generation unless override permission exists.

### Validations

* Session count must be greater than zero.
* Hours per session must be greater than zero when used.
* Trainer must be assigned.
* Classroom must be assigned where classroom-based delivery is required.

---

## SCH-UI-005 Session List Screen

### Purpose

View and manage sessions.

### Columns

```text
Session Number
Batch
Trainer
Classroom
Session Date
Start Time
End Time
Status
Actions
```

### Actions

```text
View
Edit
Reschedule
Cancel
Complete
```

---

## SCH-UI-006 Session Details Screen

### Sections

```text
Session Information
Resource Allocation
Conflict Summary
Attendance Link
Notes
Reschedule History
Audit History
```

### Actions

```text
Edit
Reschedule
Cancel
Complete
View Timetable
```

---

## SCH-UI-007 Trainer Availability Screen

### Fields

```text
Trainer
Available Days
Available Time
Unavailable Dates
```

### Example

```text
Monday-Friday
09:00 AM to 05:00 PM
```

### Business Rules

* Trainer availability must be validated during schedule creation and session generation.
* Sessions outside availability require override permission.

---

## SCH-UI-008 Classroom Schedule Screen

### Purpose

Visual room calendar.

### Columns

```text
Classroom
Date
Time
Batch
Trainer
Status
```

### Business Rules

* Classroom capacity should be visible.
* Classroom conflicts must block save unless override permission exists.

---

## SCH-UI-009 Conflict Review Screen

### Purpose

Review hard and soft conflicts before publish or reschedule.

### Conflict Types

```text
Trainer Conflict
Classroom Conflict
Batch Overlap
Availability Conflict
```

### Conflict Severity

```text
Hard
Soft
```

### Business Rules

* Hard conflicts must block publication.
* Soft conflicts may require acknowledgment or override.
* Conflict decisions must be auditable.

---

# 7. Functional Requirements

## FR-SCH-001 Create Schedule

The system shall allow authorized users to create schedules.

## FR-SCH-002 Update Schedule

The system shall allow authorized users to update schedules before publication.

## FR-SCH-003 Generate Sessions

The system shall generate sessions from a schedule.

## FR-SCH-004 Publish Schedule

The system shall allow authorized users to publish schedules once conflicts are resolved.

## FR-SCH-005 Cancel Schedule

The system shall allow authorized users to cancel schedules.

## FR-SCH-006 View Timetable

The system shall provide timetable views by day, week, month, trainer, classroom, and batch.

## FR-SCH-007 Validate Trainer Availability

The system shall validate trainer availability during schedule creation and session generation.

## FR-SCH-008 Validate Classroom Allocation

The system shall validate classroom allocation during schedule creation and session generation.

## FR-SCH-009 Detect Conflicts

The system shall detect trainer, classroom, batch overlap, and availability conflicts.

## FR-SCH-010 Reschedule Session

The system shall allow authorized users to reschedule sessions.

## FR-SCH-011 Cancel Session

The system shall allow authorized users to cancel sessions.

## FR-SCH-012 Complete Session

The system shall allow authorized users to mark sessions completed.

## FR-SCH-013 Support Walk-In Scheduling

The system shall support walk-in scheduling patterns.

## FR-SCH-014 Support Corporate Scheduling

The system shall support corporate scheduling patterns.

## FR-SCH-015 Preserve Reschedule History

The system shall preserve session reschedule history.

---

# 8. Audit Events

The following audit events shall be supported:

```text
ScheduleCreated
ScheduleUpdated
SchedulePublished
ScheduleCancelled
SessionGenerated
SessionUpdated
SessionRescheduled
SessionCancelled
SessionCompleted
TrainerAvailabilityUpdated
ConflictDetected
ConflictOverridden
```

Rules:

* Schedule and session lifecycle changes must be audited.
* Conflict resolution decisions must be audited.
* Reschedule history must be retained.

---

# 9. Domain Errors

The module shall distinguish between validation and business-rule errors such as:

```text
TrainerConflictDetected
ClassroomConflictDetected
BatchOverlapDetected
TrainerUnavailable
ClassroomUnavailable
BatchNotEligibleForScheduling
ScheduleAlreadyPublished
ScheduleNotPublishable
SessionCompletedCannotBeEdited
SessionCancelledCannotBeEdited
SessionConflictOverrideRequired
WalkInScheduleNotAllowed
CorporateScheduleNotAllowed
InvalidSessionTimeRange
```

---

# 10. Reporting and Operational Views

The Scheduling context shall support the following read views:

```text
Timetable Dashboard
Schedule List
Session List
Trainer Timetable
Classroom Timetable
Batch Timetable
Conflict Report
Reschedule History
```

These are read models and operational views, not separate owned entities.

---

# 11. FRD Improvement Notes

This module should remain the single source of truth for:

* schedule patterns
* generated sessions
* timetable views
* resource allocation
* conflict prevention
* reschedule history

It should not own attendance marking or completion approval.
