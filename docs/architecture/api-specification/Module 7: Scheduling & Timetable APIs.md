# Detailed API Contract Specification

## Module 7: Scheduling & Timetable APIs

**Version:** 1.0
**Base URL:** `/api/v1`
**Module Code:** `SCH`

---

# 1. Module Purpose

Scheduling & Timetable APIs manage class schedules, training sessions, trainer allocation, classroom/lab allocation, conflict validation, rescheduling, and timetable views.

This module supports:

* Schedule creation
* Session generation
* Trainer assignment validation
* Classroom/lab booking
* Conflict detection
* Session rescheduling
* Session cancellation
* Student timetable
* Trainer timetable
* Batch timetable

---

# 2. Security Requirements

All Scheduling APIs require authentication.

Protected APIs must enforce:

```text
Permission
Branch Scope
Trainer Scope
Student Self Scope
Audit Logging
```

---

# 3. Schedule APIs

## 3.1 Get Schedules

```http
GET /api/v1/schedules
```

### Permission

```text
SCHEDULE_VIEW
```

### Query Parameters

```text
page
limit
branchId
courseId
batchId
trainerId
classroomId
scheduleStatus
dateFrom
dateTo
sortBy
sortOrder
```

---

## 3.2 Create Schedule

```http
POST /api/v1/schedules
```

### Permission

```text
SCHEDULE_CREATE
```

### Request

```json
{
  "batchId": "bat_001",
  "scheduleType": "Recurring",
  "startDate": "2026-07-01",
  "endDate": "2026-07-31",
  "startTime": "09:00",
  "endTime": "11:00",
  "recurrenceDays": ["Monday", "Wednesday", "Friday"],
  "primaryTrainerId": "trn_001",
  "additionalTrainerIds": ["trn_002"],
  "classroomId": "cls_001",
  "labId": null,
  "remarks": "Morning batch schedule"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Schedule created successfully",
  "data": {
    "scheduleId": "sch_001",
    "scheduleNumber": "SCH-2026-00001",
    "batchId": "bat_001",
    "scheduleStatus": "Draft"
  }
}
```

### Validations

```text
Batch is required
Schedule type is required
Start date is required
End date is required
Start time is required
End time is required
End time must be after start time
Primary trainer is required
Classroom or lab is required where applicable
```

### Business Rules

```text
Batch must be active or open for enrollment
Trainer must be active
Classroom must be active
Schedule date range must be within or compatible with batch date range
Conflict validation must run before publishing
```

### Audit

```text
ScheduleCreated
```

---

## 3.3 Get Schedule Details

```http
GET /api/v1/schedules/{scheduleId}
```

### Permission

```text
SCHEDULE_VIEW
```

---

## 3.4 Update Schedule

```http
PATCH /api/v1/schedules/{scheduleId}
```

### Permission

```text
SCHEDULE_EDIT
```

### Request

```json
{
  "startDate": "2026-07-02",
  "endDate": "2026-07-31",
  "startTime": "10:00",
  "endTime": "12:00",
  "recurrenceDays": ["Tuesday", "Thursday"],
  "primaryTrainerId": "trn_001",
  "classroomId": "cls_002",
  "remarks": "Updated schedule pattern"
}
```

### Business Rules

```text
Published schedules with completed sessions cannot be changed without special permission
Updating schedule pattern may require regenerating future sessions
Past sessions must not be changed through schedule update
```

---

## 3.5 Publish Schedule

```http
POST /api/v1/schedules/{scheduleId}/publish
```

### Permission

```text
SCHEDULE_PUBLISH
```

### Business Rules

```text
Schedule must have generated sessions
All hard conflicts must be resolved
Published sessions become visible in timetable
Published sessions become eligible for attendance session creation
```

---

## 3.6 Cancel Schedule

```http
POST /api/v1/schedules/{scheduleId}/cancel
```

### Permission

```text
SCHEDULE_CANCEL
```

### Request

```json
{
  "reason": "Batch cancelled"
}
```

### Validations

```text
Reason is required
```

---

# 4. Session Generation APIs

## 4.1 Generate Sessions

```http
POST /api/v1/schedules/{scheduleId}/generate-sessions
```

### Permission

```text
SESSION_GENERATE
```

### Request

```json
{
  "generationMode": "ReplaceDraftSessions",
  "hoursPerSession": 2
}
```

### Supported Generation Modes

```text
CreateOnly
ReplaceDraftSessions
AppendFutureSessions
```

### Success Response

```json
{
  "success": true,
  "message": "Sessions generated successfully",
  "data": {
    "scheduleId": "sch_001",
    "generatedSessionCount": 20,
    "totalHours": 40
  }
}
```

### Business Rules

```text
Hours-based courses generate sessions based on total hours and hours per session
Session-based courses generate configured number of sessions
Fixed-duration courses generate sessions using recurrence rules
Hard conflicts must be reported
Completed sessions must never be regenerated
```

---

## 4.2 Preview Generated Sessions

```http
POST /api/v1/schedules/preview-sessions
```

### Permission

```text
SCHEDULE_CREATE
```

### Request

```json
{
  "batchId": "bat_001",
  "startDate": "2026-07-01",
  "endDate": "2026-07-31",
  "startTime": "09:00",
  "endTime": "11:00",
  "recurrenceDays": ["Monday", "Wednesday"],
  "primaryTrainerId": "trn_001",
  "classroomId": "cls_001"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionDate": "2026-07-01",
        "startTime": "09:00",
        "endTime": "11:00",
        "conflictStatus": "NoConflict"
      }
    ],
    "conflicts": []
  }
}
```

---

# 5. Session APIs

## 5.1 Get Sessions

```http
GET /api/v1/sessions
```

### Permission

```text
SESSION_VIEW
```

### Query Parameters

```text
page
limit
branchId
courseId
batchId
trainerId
classroomId
sessionStatus
dateFrom
dateTo
sortBy
sortOrder
```

---

## 5.2 Get Session Details

```http
GET /api/v1/sessions/{sessionId}
```

### Permission

```text
SESSION_VIEW
```

---

## 5.3 Update Session

```http
PATCH /api/v1/sessions/{sessionId}
```

### Permission

```text
SESSION_EDIT
```

### Request

```json
{
  "trainerId": "trn_002",
  "classroomId": "cls_002",
  "startTime": "10:00",
  "endTime": "12:00",
  "remarks": "Changed trainer and room"
}
```

### Business Rules

```text
Completed sessions cannot be edited
Cancelled sessions cannot be edited
Conflict validation required before save
Changes must be audited
```

---

## 5.4 Reschedule Session

```http
POST /api/v1/sessions/{sessionId}/reschedule
```

### Permission

```text
SESSION_RESCHEDULE
```

### Request

```json
{
  "newDate": "2026-07-10",
  "newStartTime": "14:00",
  "newEndTime": "16:00",
  "trainerId": "trn_001",
  "classroomId": "cls_003",
  "reason": "Trainer unavailable"
}
```

### Validations

```text
New date is required
New start time is required
New end time is required
Reason is required
```

### Business Rules

```text
Conflict validation required
Attendance records must remain linked to the session
Reschedule history must be preserved
Students and trainer must be notified
```

---

## 5.5 Cancel Session

```http
POST /api/v1/sessions/{sessionId}/cancel
```

### Permission

```text
SESSION_CANCEL
```

### Request

```json
{
  "reason": "Public holiday"
}
```

### Business Rules

```text
Cancelled sessions cannot record attendance
Replacement session may be created later
Cancellation must be audited
```

---

## 5.6 Complete Session

```http
POST /api/v1/sessions/{sessionId}/complete
```

### Permission

```text
SESSION_COMPLETE
```

### Request

```json
{
  "remarks": "Session completed successfully"
}
```

### Business Rules

```text
Only scheduled or in-progress sessions can be completed
Attendance should be submitted before or after completion based on configuration
```

---

# 6. Conflict Detection APIs

## 6.1 Check Schedule Conflicts

```http
POST /api/v1/schedules/check-conflicts
```

### Permission

```text
SCHEDULE_VIEW
```

### Request

```json
{
  "batchId": "bat_001",
  "trainerId": "trn_001",
  "classroomId": "cls_001",
  "labId": null,
  "startDate": "2026-07-01",
  "endDate": "2026-07-31",
  "startTime": "09:00",
  "endTime": "11:00",
  "recurrenceDays": ["Monday", "Wednesday"]
}
```

### Response

```json
{
  "success": true,
  "data": {
    "hasConflict": true,
    "conflicts": [
      {
        "conflictType": "TrainerConflict",
        "severity": "Hard",
        "message": "Trainer is already assigned to another session",
        "conflictingSessionId": "ses_010",
        "conflictDate": "2026-07-08",
        "startTime": "09:30",
        "endTime": "11:30"
      }
    ]
  }
}
```

---

## 6.2 Check Session Conflict

```http
POST /api/v1/sessions/check-conflict
```

### Permission

```text
SESSION_VIEW
```

---

# 7. Timetable APIs

## 7.1 Get General Timetable

```http
GET /api/v1/timetable
```

### Permission

```text
TIMETABLE_VIEW
```

### Query Parameters

```text
branchId
courseId
batchId
trainerId
classroomId
dateFrom
dateTo
viewMode
```

### Supported View Modes

```text
Daily
Weekly
Monthly
Trainer
Classroom
Batch
```

---

## 7.2 Get Batch Timetable

```http
GET /api/v1/batches/{batchId}/timetable
```

### Permission

```text
BATCH_VIEW
```

---

## 7.3 Get Trainer Timetable

```http
GET /api/v1/trainers/{trainerId}/timetable
```

### Permission

```text
TRAINER_TIMETABLE_VIEW
```

### Business Rules

```text
Trainers can access only their own timetable unless broader permission is granted
```

---

## 7.4 Get Student Timetable

```http
GET /api/v1/students/{studentId}/timetable
```

### Permission

```text
STUDENT_VIEW
```

---

## 7.5 Student Portal Timetable

```http
GET /api/v1/student-portal/me/timetable
```

### Permission

```text
Authenticated Student
```

### Business Rules

```text
Student can access only own timetable
```

---

# 8. Classroom Schedule APIs

## 8.1 Get Classroom Schedule

```http
GET /api/v1/classrooms/{classroomId}/schedule
```

### Permission

```text
CLASSROOM_SCHEDULE_VIEW
```

### Query Parameters

```text
dateFrom
dateTo
viewMode
```

---

# 9. Lab Schedule APIs

## 9.1 Get Lab Schedule

```http
GET /api/v1/labs/{labId}/schedule
```

### Permission

```text
LAB_SCHEDULE_VIEW
```

---

# 10. Business Error Examples

## Trainer Conflict

```json
{
  "success": false,
  "error": {
    "code": "TRAINER_CONFLICT",
    "message": "Trainer is already assigned to another session during this time",
    "details": {
      "conflictingSessionId": "ses_010"
    }
  }
}
```

## Classroom Conflict

```json
{
  "success": false,
  "error": {
    "code": "CLASSROOM_CONFLICT",
    "message": "Classroom is already booked during this time"
  }
}
```

## Invalid Session Time

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "End time must be after start time"
  }
}
```

---

# 11. Events Published

```text
ScheduleCreated
ScheduleUpdated
SchedulePublished
ScheduleCancelled
SessionsGenerated
SessionUpdated
SessionRescheduled
SessionCancelled
SessionCompleted
TrainerConflictDetected
ClassroomConflictDetected
```

---

# 12. Audit Requirements

Audit must capture:

```text
Schedule create/update/publish/cancel
Session generation
Session update/reschedule/cancel/complete
Trainer change
Classroom change
Conflict override if allowed
```

---

# 13. Integration Points

Consumes:

```text
Course & Batch
Trainer Management
Organization Management
Enrollment
```

Provides data to:

```text
Attendance
Completion
Certificate
Reports
Student Portal
Trainer Portal
Communication
Audit
```

---
