# Functional Requirement Document

## Module 8: Attendance Management

**Version:** 1.1
**Module Code:** ATT
**Phase:** Phase 1
**Owned Bounded Context:** Attendance Management

**Dependencies:**

* Scheduling & Timetable Management
* Admission & Enrollment Management
* Course & Batch Management
* Identity & Access Management

**Provides Data To:**

* Exam, Result & Completion Management
* Certificate Management
* Student Management
* Corporate Training Management
* Reporting & Dashboards
* Audit & Compliance

---

# 1. Business Purpose

Attendance Management records and validates learner participation for scheduled training sessions.

The context owns attendance sessions, attendance records, attendance locking, attendance reopening, correction workflow, and attendance calculations.

Attendance is generated from schedule sessions and contributes to completion and certificate eligibility.

---

# 2. Scope

## 2.1 In Scope

* Attendance session creation from schedule sessions
* Manual attendance marking
* Mark all present / mark all absent actions
* Attendance locking
* Attendance reopening
* Attendance correction requests
* Student attendance summaries
* Batch attendance summaries
* Corporate attendance summaries
* Attendance percentage calculation
* Attendance eligibility calculation

## 2.2 Out of Scope for Phase 1

* Direct biometric capture inside the Attendance domain
* RFID / QR device integration implementation
* Mobile self check-in
* Automated facial recognition

Biometric/RFID sync remains an architecture requirement. Device capture must be implemented through an integration adapter that submits validated, idempotent attendance commands to this module.

---

# 3. Business Principles

* Attendance must be session-based.
* Attendance records must belong to a schedule session.
* Only enrolled learners for the batch may be marked.
* Cancelled sessions cannot accept attendance.
* Attendance should not be editable once locked unless reopened by authorized action.
* Attendance corrections must retain the original value in history.
* Attendance contributes to course completion and certificate eligibility.
* Trainer can mark attendance for assigned sessions.
* Administrative correction and reopen actions must be permission controlled and audited.

---

# 4. Owned Concepts

The Attendance context owns:

* AttendanceSession
* AttendanceRecord
* AttendanceCorrection
* AttendanceLock
* AttendancePolicy

Notes:

* AttendanceSession is derived from a schedule session.
* Enrollment and Student are referenced from Admission & Enrollment Management.
* ScheduleSession is referenced from Scheduling & Timetable Management.
* Completion and certificate decisions consume attendance data but do not own it.

---

# 5. Business Model

## 5.1 Attendance Session Lifecycle

```text
Not Open
  ↓
Open
  ↓
Attendance Marked
  ↓
Locked
```

Alternative:

```text
Open
  ↓
Reopened
```

Rules:

* Attendance sessions are opened from eligible schedule sessions.
* Attendance is marked while the session is open.
* Locked attendance cannot be modified unless reopened.
* Reopened attendance must preserve prior values in history.

## 5.2 Attendance Record Status

```text
Present
Absent
Late
Excused
```

Rules:

* Attendance statuses must be configurable only if policy allows.
* Status values must remain stable enough for reporting and eligibility rules.

## 5.3 Attendance Types

Phase 1 supports:

```text
Manual Attendance
```

Future versions:

```text
QR Attendance
Biometric Attendance
RFID Attendance
Mobile Check-In
```

---

# 6. Screens

## ATT-UI-001 Attendance Dashboard

### Purpose

Provide attendance overview.

### Widgets

```text
Today's Sessions
Pending Attendance
Completed Attendance
Attendance Percentage
Absent Students
```

### Filters

```text
Branch
Course
Batch
Trainer
Date Range
```

---

## ATT-UI-002 Attendance Session List

### Purpose

View attendance sessions.

### Columns

```text
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

```text
Branch
Course
Batch
Trainer
Date
Status
Search
```

### Actions

```text
Mark Attendance
View Attendance
Lock Attendance
Reopen Attendance
Export
```

### Permissions

```text
ATTENDANCE_VIEW
ATTENDANCE_MARK
ATTENDANCE_LOCK
ATTENDANCE_REOPEN
ATTENDANCE_EXPORT
```

---

## ATT-UI-003 Mark Attendance

### Purpose

Mark attendance for a session.

### Session Information

```text
Course
Batch
Trainer
Date
Time
Classroom
```

### Student Attendance Grid

```text
Student Number
Student Name
Attendance Status
Remarks
```

### Attendance Status

```text
Present
Absent
Late
Excused
```

### Bulk Actions

```text
Mark All Present
Mark All Absent
```

### Actions

```text
Save Draft
Submit Attendance
```

### Business Rules

* Only enrolled students should appear.
* Attendance must be linked to a schedule session.
* Attendance cannot be entered for cancelled sessions.
* Attendance cannot be entered before session start unless override permission exists.
* Attendance should default to Present when using mark-all-present.
* Trainer can mark attendance only for assigned sessions.

### Validations

* Records are required.
* Enrollment ID is required.
* Student ID is required.
* Attendance status is required.
* Attendance status must be valid.

---

## ATT-UI-004 Attendance Details

### Sections

```text
Session Information
Attendance Summary
Attendance Records
Correction History
Audit History
```

### Actions

```text
Print Attendance
Export Attendance
Request Correction
Lock Attendance
Reopen Attendance
```

---

## ATT-UI-005 Lock Attendance

### Purpose

Prevent accidental changes.

### Actions

```text
Lock Attendance
```

### Business Rules

* Only marked attendance can be locked.
* Locked attendance cannot be modified without reopen permission.
* Lock action must be audited.

---

## ATT-UI-006 Reopen Attendance

### Fields

```text
Reason
```

### Actions

```text
Reopen
Cancel
```

### Business Rules

* Reason is mandatory.
* Reopen action must be audited.
* Previous values must be retained in audit history.

---

## ATT-UI-007 Attendance Correction Request

### Purpose

Correct attendance after submission.

### Fields

```text
Student
Original Status
New Status
Reason
```

### Actions

```text
Submit Correction
```

### Business Rules

* Correction requires reason.
* Original status must be retained.
* Correction history must be preserved.
* If approval workflow is enabled, the correction remains pending until approved.

---

## ATT-UI-008 Student Attendance View

### Purpose

View student attendance across enrollments.

### Columns

```text
Course
Batch
Total Sessions
Present
Absent
Late
Attendance %
Eligibility Status
```

### Actions

```text
View Session Details
Export
```

---

## ATT-UI-009 Batch Attendance Report

### Purpose

Provide batch attendance and eligibility summary.

### Columns

```text
Student
Present
Absent
Late
Attendance %
Eligibility Status
```

### Business Rules

* Eligibility status is derived from course completion rules.

---

## ATT-UI-010 Corporate Attendance Report

### Columns

```text
Employee Name
Course
Session Count
Attendance %
Completion Status
```

### Filters

```text
Corporate Customer
Program
Date Range
```

### Business Rules

* Attendance must be available to corporate reports.
* Attendance must support contract reporting.

---

# 7. Functional Requirements

## FR-ATT-001 Create Attendance Session

The system shall create attendance sessions from schedule sessions.

## FR-ATT-002 Mark Attendance

The system shall allow authorized users to mark attendance for enrolled learners.

## FR-ATT-003 Mark All Present or Absent

The system shall support bulk mark-all-present and mark-all-absent actions.

## FR-ATT-004 Lock Attendance

The system shall allow authorized users to lock attendance after verification.

## FR-ATT-005 Reopen Attendance

The system shall allow authorized users to reopen locked attendance with a reason.

## FR-ATT-006 Request Attendance Correction

The system shall allow corrections to attendance records with an audit trail.

## FR-ATT-007 Calculate Attendance Percentage

The system shall calculate attendance percentage using configured policy.

## FR-ATT-008 View Student Attendance

The system shall provide student attendance summaries.

## FR-ATT-009 View Batch Attendance

The system shall provide batch attendance summaries.

## FR-ATT-010 View Corporate Attendance

The system shall provide corporate attendance summaries.

## FR-ATT-011 Evaluate Attendance Eligibility

The system shall evaluate attendance eligibility for completion and certificates.

## FR-ATT-012 Audit Attendance Changes

The system shall audit attendance marking, locking, reopening, and corrections.

---

# 8. Audit Events

The following audit events shall be supported:

```text
AttendanceSessionOpened
AttendanceMarked
AttendanceSubmitted
AttendanceLocked
AttendanceReopened
AttendanceCorrectionRequested
AttendanceCorrectionApproved
AttendanceCorrectionRejected
AttendancePercentageCalculated
AttendanceEligibilityEvaluated
```

Rules:

* Attendance changes must be auditable.
* Lock and reopen actions must preserve previous values.
* Correction actions must include reason and actor.

---

# 9. Domain Errors

The module shall distinguish between validation and business-rule errors such as:

```text
AttendanceSessionNotOpen
AttendanceSessionAlreadyLocked
AttendanceSessionAlreadyReopened
AttendanceCannotBeMarkedBeforeStart
AttendanceCannotBeMarkedForCancelledSession
LearnerNotEnrolledInBatch
AttendanceLockedCannotBeModified
CorrectionReasonRequired
CorrectionNotAllowed
ReopenReasonRequired
AttendanceOverrideRequired
InvalidAttendanceStatus
StudentInactive
BatchInactive
SessionInactive
BranchScopeViolation
TrainerScopeViolation
StudentSelfScopeViolation
```

---

# 10. Reporting and Operational Views

The Attendance context shall support the following read views:

```text
Attendance Dashboard
Attendance Session List
Attendance Details
Student Attendance Summary
Batch Attendance Summary
Corporate Attendance Summary
Attendance Register
Correction History
```

These are read models and operational views, not separate owned entities.

---

# 11. FRD Improvement Notes

This module should remain the single source of truth for:

* attendance sessions
* attendance records
* locking and reopening
* correction workflow
* attendance calculations
* eligibility support

It should not own schedule sessions, enrollment lifecycle, or completion approval.
