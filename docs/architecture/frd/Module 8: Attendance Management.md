# Functional Requirement Document (FRD)

## Module 8: Attendance Management

**Version:** 1.0
**Module Code:** ATT
**Dependencies:**

* Student Management
* Enrollment Management
* Course & Batch Management
* Scheduling & Timetable Management

**Provides Data To:**

* Completion Management
* Certificate Management
* Reporting
* Student Portal
* Corporate Training Reports
* Future AI Analytics

---

# 1. Business Purpose

Attendance Management is responsible for recording, tracking, validating, and reporting student participation in training sessions.

The module shall support:

* Session Attendance
* Attendance Corrections
* Attendance Percentage Calculation
* Batch Attendance Tracking
* Student Attendance Tracking
* Corporate Attendance Tracking
* Trainer Attendance Entry
* Attendance Reporting

---

# 2. Attendance Architecture

Attendance shall be generated from Sessions.

```text id="vjlwm7"
Course
    ↓
Batch
    ↓
Schedule
    ↓
Session
    ↓
Attendance Session
    ↓
Attendance Records
```

---

# 3. Attendance Types

Phase 1 supports:

```text id="d6jlwm"
Manual Attendance
```

Future versions:

```text id="y8s6u7"
QR Attendance
Biometric Attendance
RFID Attendance
Mobile Check-In
```

---

# 4. Attendance Lifecycle

## Attendance Session

```text id="if97kq"
Not Open
     ↓
Open
     ↓
Attendance Marked
     ↓
Locked
```

---

## Attendance Record

```text id="6rvq2v"
Present
Absent
Late
Excused
```

---

# 5. Attendance Ownership

### Attendance Entry

Phase 1:

```text id="zcyi4q"
Trainer
```

may record attendance.

Administrative override available.

---

### Attendance Correction

Phase 1:

```text id="2ncknl"
Trainer
Branch Manager
Academic Coordinator
```

based on permissions.

---

# 6. Screens

## ATT-UI-001 Attendance Dashboard

### Purpose

Provide attendance overview.

### Widgets

```text id="4gth5z"
Today's Sessions
Pending Attendance
Completed Attendance
Attendance Percentage
Absent Students
```

### Filters

```text id="c44xak"
Branch
Course
Batch
Trainer
Date Range
```

---

# 7. Attendance Session List

## ATT-UI-002 Attendance Session List

### Columns

```text id="xukdju"
Session Number
Course
Batch
Trainer
Session Date
Start Time
Attendance Status
Actions
```

### Filters

```text id="c5gbh5"
Branch
Course
Batch
Trainer
Date
Status
```

### Actions

```text id="9pp1gs"
Mark Attendance
View Attendance
Lock Attendance
Reopen Attendance
```

### Permissions

```text id="l1d5yo"
ATTENDANCE_VIEW
ATTENDANCE_MARK
ATTENDANCE_LOCK
ATTENDANCE_REOPEN
```

---

# 8. Mark Attendance Screen

## ATT-UI-003 Mark Attendance

### Purpose

Mark attendance for a session.

### Session Information

Display:

```text id="5lg6qs"
Course
Batch
Trainer
Date
Time
Classroom
```

---

### Student Attendance Grid

Columns:

```text id="yg6v34"
Student Number
Student Name
Attendance Status
Remarks
```

### Attendance Status

```text id="3m9u3e"
Present
Absent
Late
Excused
```

---

### Bulk Actions

```text id="s46x7x"
Mark All Present
Mark All Absent
```

---

### Actions

```text id="wvrtkg"
Save Draft
Submit Attendance
```

---

### Business Rules

* Only enrolled students should appear.
* Attendance must be linked to Session.
* Attendance cannot be entered for cancelled sessions.
* Attendance cannot be entered before session start.
* Attendance should default to Present when using "Mark All Present".

---

# 9. Attendance Details Screen

## ATT-UI-004 Attendance Details

### Sections

#### Session Information

```text id="1okmh5"
Session
Batch
Trainer
Date
Time
```

#### Attendance Summary

```text id="owh6pv"
Total Students
Present
Absent
Late
Excused
Attendance %
```

#### Attendance Records

```text id="ekff0x"
Student
Status
Remarks
```

---

### Actions

```text id="b22s5e"
Print Attendance
Export Attendance
Request Correction
```

---

# 10. Attendance Locking

## ATT-UI-005 Lock Attendance

### Purpose

Prevent accidental changes.

### Actions

```text id="e0vup0"
Lock Attendance
```

---

### Business Rules

After locking:

```text id="a2ks8x"
Attendance cannot be modified.
```

Unless:

```text id="w7g2ql"
Attendance Reopen Permission
```

exists.

---

### Lock Permissions

```text id="o1q65w"
ATTENDANCE_LOCK
```

---

# 11. Attendance Reopen

## ATT-UI-006 Reopen Attendance

### Fields

```text id="fru0al"
Reason
```

### Actions

```text id="8vxpnf"
Reopen
Cancel
```

---

### Business Rules

* Reason mandatory.
* Reopen action must be audited.
* Previous values must be retained in audit history.

---

# 12. Attendance Correction

## ATT-UI-007 Attendance Correction Request

### Purpose

Correct attendance after submission.

### Fields

```text id="tw79zg"
Student
Original Status
New Status
Reason
```

---

### Actions

```text id="3mjl7o"
Submit Correction
```

---

### Business Rules

* Correction requires reason.
* Correction request should be audited.
* Correction history must be preserved.

---

# 13. Student Attendance Summary

## ATT-UI-008 Student Attendance View

### Purpose

View student attendance across enrollments.

### Columns

```text id="f4r87n"
Course
Batch
Total Sessions
Present
Absent
Late
Attendance %
```

---

### Actions

```text id="l30gk5"
View Session Details
Export
```

---

# 14. Batch Attendance Summary

## ATT-UI-009 Batch Attendance Report

### Columns

```text id="2z9nwx"
Student
Present
Absent
Late
Attendance %
Eligibility Status
```

---

### Eligibility Status

```text id="6v1evz"
Eligible
Not Eligible
```

based on course completion rules.

---

# 15. Attendance Percentage Engine

## Formula

### Basic Formula

```text id="mqln44"
Present Sessions
÷
Total Conducted Sessions
×
100
```

---

### Example

```text id="2kb91w"
Present = 18

Total = 20

Attendance = 90%
```

---

### Excluded Status

Configurable:

```text id="yrtndw"
Excused
```

may be excluded from denominator.

---

# 16. Course Completion Integration

Attendance contributes to:

```text id="ztzqwo"
Course Completion
Certificate Eligibility
```

---

### Example

Course Rule:

```text id="g4mclo"
Minimum Attendance = 80%
```

Student:

```text id="1yv6wx"
Attendance = 75%
```

Result:

```text id="slvtg5"
Not Eligible
```

---

# 17. Corporate Attendance

Corporate programs require attendance reports.

---

## ATT-UI-010 Corporate Attendance Report

### Columns

```text id="8udkny"
Employee Name
Course
Session Count
Attendance %
Completion Status
```

### Filters

```text id="wn40sk"
Corporate Customer
Program
Date Range
```

---

### Business Rules

* Attendance must be available to Corporate Reports.
* Attendance must support contract reporting.

---

# 18. Walk-In Attendance

Walk-In programs may have:

```text id="lzgk9n"
Single Session
```

attendance.

---

### Business Rules

* Attendance still required.
* Attendance contributes to completion approval.

---

# 19. Student Portal Attendance View

Students should view:

```text id="7wg8ti"
Attendance %
Present Count
Absent Count
Session History
```

Read-only.

---

# 20. Trainer Attendance View

Trainers should view:

```text id="b9a6l2"
Upcoming Sessions
Attendance Pending
Attendance Submitted
```

---

# 21. Functional Requirements

## FR-ATT-001 Attendance Session Creation

The system shall create attendance sessions from scheduled sessions.

---

## FR-ATT-002 Attendance Marking

The system shall allow authorized users to record attendance.

---

## FR-ATT-003 Attendance Locking

The system shall allow attendance to be locked.

---

## FR-ATT-004 Attendance Reopening

The system shall support reopening attendance.

---

## FR-ATT-005 Attendance Correction

The system shall support attendance corrections.

---

## FR-ATT-006 Attendance Percentage Calculation

The system shall calculate attendance percentages.

---

## FR-ATT-007 Student Attendance Tracking

The system shall track attendance by student.

---

## FR-ATT-008 Batch Attendance Tracking

The system shall track attendance by batch.

---

## FR-ATT-009 Corporate Attendance Reporting

The system shall support corporate attendance reporting.

---

## FR-ATT-010 Attendance Eligibility Evaluation

The system shall support completion eligibility evaluation using attendance.

---

## FR-ATT-011 Attendance Audit Trail

The system shall maintain a complete attendance audit trail.

---

# 22. Notifications

### Attendance Pending

Notify:

```text id="8mwl7r"
Trainer
```

before session end.

---

### Attendance Not Submitted

Notify:

```text id="2gfj4x"
Trainer
Branch Manager
```

after configurable time.

---

### Attendance Corrected

Notify:

```text id="7wxygl"
Trainer
Branch Manager
```

---

### Attendance Below Threshold

Notify:

```text id="k1s8vz"
Student
Counselor
```

when attendance falls below completion requirement.

---

# 23. Reports

## Operational Reports

```text id="pbcrxj"
Daily Attendance Report
Batch Attendance Report
Trainer Attendance Report
```

---

## Student Reports

```text id="9m8rvi"
Student Attendance Summary
Attendance Eligibility Report
```

---

## Management Reports

```text id="n9zk7l"
Attendance Trend Report
Low Attendance Report
Branch Attendance Report
```

---

## Corporate Reports

```text id="sg6khy"
Corporate Attendance Report
Corporate Completion Report
```

---

# 24. Audit Requirements

Audit:

```text id="sqk6ep"
Attendance Marked
Attendance Updated
Attendance Locked
Attendance Reopened
Attendance Corrected
```

Capture:

```text id="l0b22m"
User
Action
Timestamp
Old Value
New Value
Reason
```

---

# 25. Critical Design Decisions

### Session-Based Attendance

Recommended:

```text id="12u8hi"
Session
      ↓
Attendance
```

not

```text id="aqoc4i"
Batch
      ↓
Attendance
```

Reason:

Supports:

* Trainer tracking
* Rescheduling
* Completion rules
* Corporate reporting

---

### Attendance Locking

Recommended mandatory.

Reason:

Prevents accidental modifications.

---

### Attendance Correction Workflow

Maintain immutable audit history.

Never overwrite original attendance without audit record.

---

# 26. Integration Points

### Consumes

```text id="jv3wt2"
Scheduling & Timetable
Enrollment
Student Management
```

### Provides Data To

```text id="xsh5th"
Completion Management
Certificate Management
Reporting
Student Portal
Corporate Reports
Future AI Analytics
```
