# Detailed API Contract Specification

## Module 8: Attendance Management APIs

**Version:** 1.0
**Base URL:** `/api/v1`
**Module Code:** `ATT`

---

# 1. Module Purpose

Attendance Management APIs manage session-based attendance for students and corporate participants.

This module supports:

* Attendance session listing
* Manual attendance marking
* Attendance locking
* Attendance reopening
* Attendance correction
* Student attendance summary
* Batch attendance summary
* Corporate attendance reporting
* Attendance eligibility calculation

---

# 2. Security Requirements

All Attendance APIs require authentication.

Protected APIs must enforce:

```text
Permission
Branch Scope
Trainer Scope
Student Self Scope
Batch Scope
Audit Logging
```

---

# 3. Attendance Session APIs

## 3.1 Get Attendance Sessions

```http
GET /api/v1/attendance/sessions
```

### Permission

```text
ATTENDANCE_VIEW
```

### Query Parameters

```text
page
limit
branchId
courseId
batchId
trainerId
attendanceStatus
sessionDateFrom
sessionDateTo
sortBy
sortOrder
```

### Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "attendanceSessionId": "atts_001",
        "scheduleSessionId": "ses_001",
        "courseName": "IOSH Managing Safely",
        "batchName": "IOSH January Morning Batch",
        "trainerName": "Ahmed Trainer",
        "sessionDate": "2026-07-01",
        "startTime": "09:00",
        "endTime": "11:00",
        "attendanceStatus": "Open",
        "totalStudents": 25,
        "markedCount": 0
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

## 3.2 Get Attendance Session Details

```http
GET /api/v1/attendance/sessions/{attendanceSessionId}
```

### Permission

```text
ATTENDANCE_VIEW
```

### Response

```json
{
  "success": true,
  "data": {
    "attendanceSessionId": "atts_001",
    "scheduleSessionId": "ses_001",
    "course": {
      "id": "crs_001",
      "name": "IOSH Managing Safely"
    },
    "batch": {
      "id": "bat_001",
      "name": "IOSH January Morning Batch"
    },
    "trainer": {
      "id": "trn_001",
      "name": "Ahmed Trainer"
    },
    "sessionDate": "2026-07-01",
    "startTime": "09:00",
    "endTime": "11:00",
    "attendanceStatus": "Open",
    "records": [
      {
        "attendanceRecordId": "attr_001",
        "enrollmentId": "enr_001",
        "studentId": "std_001",
        "studentNumber": "STD-2026-00001",
        "studentName": "Ahmed Ali",
        "status": "Present",
        "remarks": ""
      }
    ]
  }
}
```

---

# 4. Mark Attendance API

## 4.1 Mark Attendance

```http
POST /api/v1/attendance/sessions/{attendanceSessionId}/mark
```

### Permission

```text
ATTENDANCE_MARK
```

### Request

```json
{
  "records": [
    {
      "enrollmentId": "enr_001",
      "studentId": "std_001",
      "status": "Present",
      "remarks": ""
    },
    {
      "enrollmentId": "enr_002",
      "studentId": "std_002",
      "status": "Absent",
      "remarks": "No show"
    }
  ]
}
```

### Success Response

```json
{
  "success": true,
  "message": "Attendance marked successfully",
  "data": {
    "attendanceSessionId": "atts_001",
    "attendanceStatus": "AttendanceMarked",
    "totalStudents": 25,
    "presentCount": 22,
    "absentCount": 2,
    "lateCount": 1,
    "excusedCount": 0
  }
}
```

### Supported Attendance Statuses

```text
Present
Absent
Late
Excused
```

### Validations

```text
Records are required
Enrollment ID is required
Student ID is required
Attendance status is required
Attendance status must be valid
```

### Business Rules

```text
Attendance must be linked to scheduled session
Only enrolled students for the batch can be marked
Cancelled sessions cannot accept attendance
Locked attendance cannot be modified
Attendance cannot be marked before session start unless override permission exists
Trainer can mark attendance only for assigned sessions
Admin override requires permission
```

### Audit

```text
AttendanceMarked
```

---

# 5. Bulk Attendance APIs

## 5.1 Mark All Present

```http
POST /api/v1/attendance/sessions/{attendanceSessionId}/mark-all-present
```

### Permission

```text
ATTENDANCE_MARK
```

### Request

```json
{
  "remarks": "All students attended"
}
```

---

## 5.2 Mark All Absent

```http
POST /api/v1/attendance/sessions/{attendanceSessionId}/mark-all-absent
```

### Permission

```text
ATTENDANCE_MARK
```

### Request

```json
{
  "remarks": "Session attendance marked absent for all"
}
```

---

# 6. Attendance Locking APIs

## 6.1 Lock Attendance

```http
POST /api/v1/attendance/sessions/{attendanceSessionId}/lock
```

### Permission

```text
ATTENDANCE_LOCK
```

### Request

```json
{
  "remarks": "Attendance verified and locked"
}
```

### Business Rules

```text
Only marked attendance can be locked
Locked attendance cannot be changed without reopen
Lock action must be audited
```

### Event

```text
AttendanceLocked
```

---

## 6.2 Reopen Attendance

```http
POST /api/v1/attendance/sessions/{attendanceSessionId}/reopen
```

### Permission

```text
ATTENDANCE_REOPEN
```

### Request

```json
{
  "reason": "Correction required for one student"
}
```

### Validations

```text
Reason is required
```

### Business Rules

```text
Only locked attendance can be reopened
Reason is mandatory
Reopen action must be audited
Previous values must remain in audit history
```

### Event

```text
AttendanceReopened
```

---

# 7. Attendance Correction APIs

## 7.1 Request Attendance Correction

```http
POST /api/v1/attendance/records/{attendanceRecordId}/correction
```

### Permission

```text
ATTENDANCE_CORRECTION_REQUEST
```

### Request

```json
{
  "newStatus": "Present",
  "reason": "Student joined late but was marked absent"
}
```

### Validations

```text
New status is required
Reason is required
```

### Business Rules

```text
Correction requires reason
Original status must be retained
Correction must be audited
If approval workflow is enabled, correction remains pending until approved
```

---

## 7.2 Approve Attendance Correction

```http
POST /api/v1/attendance/corrections/{correctionId}/approve
```

### Permission

```text
ATTENDANCE_CORRECTION_APPROVE
```

### Request

```json
{
  "remarks": "Correction approved"
}
```

---

## 7.3 Reject Attendance Correction

```http
POST /api/v1/attendance/corrections/{correctionId}/reject
```

### Permission

```text
ATTENDANCE_CORRECTION_REJECT
```

### Request

```json
{
  "reason": "Insufficient proof"
}
```

### Validations

```text
Reason is required
```

---

# 8. Student Attendance APIs

## 8.1 Get Student Attendance Summary

```http
GET /api/v1/students/{studentId}/attendance-summary
```

### Permission

```text
STUDENT_ATTENDANCE_VIEW
```

### Query Parameters

```text
enrollmentId
courseId
batchId
dateFrom
dateTo
```

### Response

```json
{
  "success": true,
  "data": {
    "studentId": "std_001",
    "studentNumber": "STD-2026-00001",
    "studentName": "Ahmed Ali",
    "summary": [
      {
        "enrollmentId": "enr_001",
        "courseName": "IOSH Managing Safely",
        "batchName": "IOSH January Morning Batch",
        "totalConductedSessions": 20,
        "presentCount": 18,
        "absentCount": 1,
        "lateCount": 1,
        "excusedCount": 0,
        "attendancePercentage": 90,
        "eligibilityStatus": "Eligible"
      }
    ]
  }
}
```

---

## 8.2 Get Student Attendance Details

```http
GET /api/v1/students/{studentId}/attendance-details
```

### Permission

```text
STUDENT_ATTENDANCE_VIEW
```

### Query Parameters

```text
enrollmentId
dateFrom
dateTo
```

---

## 8.3 Student Portal Attendance

```http
GET /api/v1/student-portal/me/attendance
```

### Permission

```text
Authenticated Student
```

### Business Rules

```text
Student can access only own attendance
Read-only access
```

---

# 9. Batch Attendance APIs

## 9.1 Get Batch Attendance Summary

```http
GET /api/v1/batches/{batchId}/attendance-summary
```

### Permission

```text
BATCH_ATTENDANCE_VIEW
```

### Response

```json
{
  "success": true,
  "data": {
    "batchId": "bat_001",
    "batchName": "IOSH January Morning Batch",
    "totalConductedSessions": 20,
    "students": [
      {
        "studentId": "std_001",
        "studentNumber": "STD-2026-00001",
        "studentName": "Ahmed Ali",
        "attendancePercentage": 90,
        "eligibilityStatus": "Eligible"
      }
    ]
  }
}
```

---

## 9.2 Get Batch Attendance Register

```http
GET /api/v1/batches/{batchId}/attendance-register
```

### Permission

```text
BATCH_ATTENDANCE_VIEW
```

### Query Parameters

```text
dateFrom
dateTo
format
```

---

# 10. Corporate Attendance APIs

## 10.1 Get Corporate Attendance Report

```http
GET /api/v1/corporate/attendance
```

### Permission

```text
CORPORATE_ATTENDANCE_VIEW
```

### Query Parameters

```text
corporateCustomerId
contractId
programId
courseId
batchId
dateFrom
dateTo
```

### Response

```json
{
  "success": true,
  "data": {
    "corporateCustomer": "ABC Oil & Gas LLC",
    "program": "HSE Training Program",
    "participants": [
      {
        "participantId": "cp_001",
        "employeeName": "Omar Khalid",
        "courseName": "HSE Safety",
        "totalSessions": 10,
        "presentCount": 9,
        "attendancePercentage": 90,
        "completionStatus": "Eligible"
      }
    ]
  }
}
```

---

# 11. Trainer Attendance APIs

## 11.1 Get Trainer Attendance Pending Sessions

```http
GET /api/v1/trainers/{trainerId}/attendance-pending
```

### Permission

```text
TRAINER_ATTENDANCE_VIEW
```

### Business Rules

```text
Trainer can view own pending attendance sessions
Admin can view all if permitted
```

---

## 11.2 Trainer Portal Attendance Pending

```http
GET /api/v1/trainer-portal/me/attendance-pending
```

### Permission

```text
Authenticated Trainer
```

---

# 12. Attendance Percentage Calculation API

## 12.1 Recalculate Attendance Percentage

```http
POST /api/v1/enrollments/{enrollmentId}/attendance/recalculate
```

### Permission

```text
ATTENDANCE_RECALCULATE
```

### Request

```json
{
  "reason": "Attendance correction approved"
}
```

### Business Rules

```text
Recalculation must use attendance calculation rules
Excused status treatment depends on configuration
Recalculation must be audited
```

---

# 13. Business Error Examples

## Attendance Locked

```json
{
  "success": false,
  "error": {
    "code": "ATTENDANCE_LOCKED",
    "message": "Attendance is locked and cannot be modified"
  }
}
```

## Invalid Student for Session

```json
{
  "success": false,
  "error": {
    "code": "INVALID_ATTENDANCE_STUDENT",
    "message": "Student is not enrolled in this batch"
  }
}
```

## Cancelled Session

```json
{
  "success": false,
  "error": {
    "code": "SESSION_CANCELLED",
    "message": "Cannot mark attendance for cancelled session"
  }
}
```

---

# 14. Events Published

```text
AttendanceSessionCreated
AttendanceMarked
AttendanceUpdated
AttendanceLocked
AttendanceReopened
AttendanceCorrectionRequested
AttendanceCorrectionApproved
AttendanceCorrectionRejected
AttendancePercentageChanged
LowAttendanceDetected
```

---

# 15. Audit Requirements

Audit must capture:

```text
Attendance marked
Attendance updated
Attendance locked
Attendance reopened
Attendance correction requested
Attendance correction approved/rejected
Attendance recalculated
```

---

# 16. Integration Points

Consumes:

```text
Scheduling
Enrollment
Student Management
Trainer Management
Course Completion Rules
```

Provides data to:

```text
Completion Management
Certificate Management
Corporate Reports
Student Portal
Trainer Portal
Reporting
Future AI Analytics
```

---
