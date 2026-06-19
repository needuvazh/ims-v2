# Functional Requirement Document (FRD)

## Module 7: Scheduling & Timetable Management

**Version:** 1.0
**Module Code:** SCH
**Dependencies:**

* Organization Management
* Course & Batch Management
* Faculty / Trainer Management
* Enrollment Management

**Provides Data To:**

* Attendance Management
* Completion Management
* Reporting
* Student Portal
* Trainer Portal (Future)

---

# 1. Business Purpose

Scheduling & Timetable Management is responsible for planning and managing training delivery.

The module shall support:

* Batch Scheduling
* Session Scheduling
* Trainer Scheduling
* Classroom Allocation
* Lab Allocation
* Conflict Detection
* Timetable Generation
* Rescheduling
* Session Cancellation
* Corporate Training Scheduling

This module is the operational engine of the institute.

---

# 2. Scheduling Hierarchy

```text
Course
    ↓
Batch
    ↓
Schedule
    ↓
Session
```

Example:

```text
IOSH Managing Safely
       ↓
IOSH-JAN-2026-MORNING
       ↓
Training Schedule
       ↓
Session 1
Session 2
Session 3
...
Session 20
```

---

# 3. Scheduling Types

The system shall support:

```text
Recurring Schedule
Fixed Schedule
Corporate Schedule
Walk-In Schedule
```

---

# 4. Session Lifecycle

```text
Planned
      ↓
Scheduled
      ↓
In Progress
      ↓
Completed
```

Alternative flows:

```text
Scheduled
      ↓
Cancelled

Scheduled
      ↓
Rescheduled
```

---

# 5. Resource Types

Phase 1 supports:

```text
Classroom
Lab
Trainer
```

Future:

```text
Equipment
Vehicle
Meeting Room
```

---

# 6. Screens

## SCH-UI-001 Timetable Dashboard

### Purpose

View institute schedules.

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
```

### Actions

```text
Create Schedule
Edit Schedule
Reschedule
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

### Columns

```text
Schedule Number
Course
Batch
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
```

### Actions

```text
Create
View
Edit
Generate Sessions
Cancel Schedule
```

---

## SCH-UI-003 Create Schedule Screen

### Section 1: Batch Information

Fields:

```text
Batch
Course
Branch
```

Auto-populated from batch.

---

### Section 2: Schedule Pattern

Fields:

```text
Schedule Type
Start Date
End Date
Start Time
End Time
```

Schedule Types:

```text
Recurring
Fixed
Corporate
Walk-In
```

---

### Section 3: Recurrence Pattern

Fields:

```text
Monday
Tuesday
Wednesday
Thursday
Friday
Saturday
Sunday
```

Example:

```text
Monday
Wednesday
Friday
```

---

### Section 4: Resource Allocation

Fields:

```text
Primary Trainer
Additional Trainers
Classroom
Lab
```

---

### Actions

```text
Generate Sessions
Save Draft
Publish Schedule
```

---

# 7. Session Generation

## SCH-UI-004 Session Generation Screen

### Purpose

Automatically generate sessions.

### Example

Course:

```text
40 Hours
```

Schedule:

```text
2 Hours Per Day
```

System Generates:

```text
20 Sessions
```

---

### Business Rules

Hours-based Course:

```text
Total Hours
÷
Hours Per Session
=
Total Sessions
```

Sessions-based Course:

```text
Course Sessions
=
Generated Sessions
```

Fixed Duration:

```text
Start Date
→
End Date
```

---

### Validation Rules

System must ensure:

```text
Session Count > 0
Hours > 0
Trainer Assigned
Classroom Assigned
```

---

# 8. Session Management

## SCH-UI-005 Session List Screen

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

#### Session Information

```text
Session Number
Course
Batch
Trainer
```

#### Resource Allocation

```text
Classroom
Lab
```

#### Attendance

```text
Attendance Status
```

#### Notes

```text
Trainer Notes
Coordinator Notes
```

---

# 9. Conflict Detection Engine

This is one of the most important components.

---

## Trainer Conflict

Prevent:

```text
Trainer A
10:00 - 12:00
Batch A

Trainer A
10:30 - 11:30
Batch B
```

Result:

```text
Conflict
```

---

## Classroom Conflict

Prevent:

```text
Room 101
10:00 - 12:00
Batch A

Room 101
10:00 - 11:00
Batch B
```

Result:

```text
Conflict
```

---

## Batch Conflict

Prevent:

```text
Batch A
Session 1

Batch A
Session 2
```

at overlapping times.

---

## Conflict Severity

### Hard Conflict

Must prevent save.

Examples:

```text
Trainer overlap
Classroom overlap
```

### Soft Conflict

Allow save with warning.

Examples:

```text
Trainer works more than preferred hours
Classroom nearing capacity
```

---

# 10. Trainer Availability

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

09:00 AM
to
05:00 PM
```

---

### Business Rules

* Scheduling engine should validate trainer availability.
* Sessions outside availability require override permission.

Permission:

```text
TRAINER_OVERRIDE_AVAILABILITY
```

---

# 11. Classroom Scheduling

## SCH-UI-008 Classroom Schedule Screen

### Columns

```text
Classroom
Date
Time
Batch
Trainer
Status
```

### Purpose

Visual room calendar.

---

### Business Rules

* Classroom capacity should be displayed.
* Over-capacity enrollment warning should appear.

Example:

```text
Capacity = 20

Enrollment = 25

Warning
```

---

# 12. Lab Scheduling

Phase 1 support:

```text
Lab Reservation
Lab Occupancy
Lab Calendar
```

Same conflict rules as classroom.

---

# 13. Rescheduling

## SCH-UI-009 Reschedule Session Screen

### Fields

```text
Session
New Date
New Start Time
New End Time
Reason
```

### Actions

```text
Reschedule
Cancel
```

---

### Business Rules

* Reason is mandatory.
* Conflict validation required.
* Attendance records should remain linked.
* Audit record required.

---

# 14. Session Cancellation

## SCH-UI-010 Cancel Session Screen

### Fields

```text
Cancellation Reason
```

### Actions

```text
Cancel Session
```

---

### Business Rules

* Cancelled sessions cannot record attendance.
* Replacement session may be scheduled later.
* Cancellation must be audited.

---

# 15. Corporate Training Scheduling

Corporate programs may require:

```text
Customer Location
Corporate Trainer
Special Timing
```

Additional Fields:

```text
Corporate Customer
Delivery Location
Contract Reference
```

---

### Business Rules

Corporate schedules:

* May not use institute classroom.
* May use customer location.
* Must still support attendance tracking.

---

# 16. Walk-In Training Scheduling

Walk-In training may require:

```text
Single Session
Same Day Completion
Certificate Generation
```

---

### Business Rules

* Walk-In schedule may consist of one session.
* Completion approval still required.

---

# 17. Student Timetable View

Students should be able to view:

```text
Course
Batch
Trainer
Date
Time
Location
```

Read-only.

---

# 18. Trainer Timetable View

Trainers should be able to view:

```text
Assigned Sessions
Classroom
Student Count
Upcoming Schedule
```

Read-only in Phase 1.

---

# 19. Functional Requirements

## FR-SCH-001 Schedule Creation

The system shall allow authorized users to create schedules.

---

## FR-SCH-002 Session Generation

The system shall automatically generate sessions.

---

## FR-SCH-003 Trainer Assignment

The system shall support assigning trainers.

---

## FR-SCH-004 Classroom Allocation

The system shall support classroom allocation.

---

## FR-SCH-005 Conflict Detection

The system shall prevent scheduling conflicts.

---

## FR-SCH-006 Trainer Availability Validation

The system shall validate trainer availability.

---

## FR-SCH-007 Session Rescheduling

The system shall support rescheduling.

---

## FR-SCH-008 Session Cancellation

The system shall support cancellation.

---

## FR-SCH-009 Corporate Scheduling

The system shall support corporate training schedules.

---

## FR-SCH-010 Walk-In Scheduling

The system shall support walk-in schedules.

---

## FR-SCH-011 Student Timetable

The system shall provide student timetable visibility.

---

## FR-SCH-012 Trainer Timetable

The system shall provide trainer timetable visibility.

---

# 20. Notifications

### Schedule Published

Notify:

```text
Trainer
Branch Manager
Coordinator
```

---

### Session Rescheduled

Notify:

```text
Trainer
Enrolled Students
Coordinator
```

---

### Session Cancelled

Notify:

```text
Trainer
Enrolled Students
Coordinator
```

---

### Conflict Detected

Notify:

```text
Scheduling User
```

Immediately during scheduling.

---

# 21. Reports

## Operational Reports

```text
Daily Timetable
Weekly Timetable
Trainer Schedule
Classroom Utilization
Lab Utilization
```

---

## Management Reports

```text
Trainer Utilization
Classroom Occupancy
Cancelled Sessions
Rescheduled Sessions
```

---

## Corporate Reports

```text
Corporate Training Calendar
Corporate Delivery Schedule
```

---

# 22. Audit Requirements

Audit:

```text
Schedule Created
Schedule Updated
Session Generated
Session Rescheduled
Session Cancelled
Trainer Assigned
Trainer Removed
Classroom Changed
```

Capture:

```text
User
Action
Timestamp
Old Value
New Value
Reason
```

---

# 23. Critical Design Decisions

### Scheduling Model

Recommended:

```text
Schedule
      ↓
Session
```

instead of storing only timetable rows.

Reason:

Attendance, completion tracking, and rescheduling become easier.

---

### Conflict Engine

Should be implemented as:

```text
Pre-Save Validation Service
```

not as a report.

---

### Attendance Dependency

Attendance records should always be created from Sessions.

Never directly from Batch.

---

# 24. Integration Points

### Consumes

```text
Course & Batch
Trainer Management
Organization Management
```

### Provides Data To

```text
Attendance
Completion
Certificates
Reporting
Student Portal
```
