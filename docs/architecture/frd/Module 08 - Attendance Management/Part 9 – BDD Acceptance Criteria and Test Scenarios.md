# Part 9 – BDD Acceptance Criteria and Test Scenarios.md

## Module 08 – Attendance Management

**System:** Al Saud Training Institute Integrated Institute Management System (ASTI IMS)  
**Testing Scope:** Functional behavior, business rules, validation, authorization, branch isolation, auditability, reports, dashboards, notifications, bilingual rendering, and integration boundaries for Attendance Management.  
**Timezone:** Oman timezone UTC+4 for business date boundaries and user-facing timestamps.  
**Architecture Constraint:** Modular monolith. Tests must not assume external message brokers, microservices, CQRS, or event sourcing.  
**Domain Constraint:** Attendance records must always belong to an Enrollment through an AttendanceRecord and must not create a parallel learner lifecycle.

---

## 1. Test Data Assumptions

The following named fixtures are used consistently across scenarios. Automated tests may create equivalent records with generated IDs.

| Fixture Code      | Description                                                                            |
| ----------------- | -------------------------------------------------------------------------------------- |
| BR-MCT            | Muscat Main Branch, active branch accessible to Branch Admin and Academic Coordinator. |
| BR-SOH            | Sohar Branch, active branch not accessible to Muscat-only users.                       |
| COURSE-HSE        | Health and Safety Training course with minimum attendance percentage 80.00.            |
| COURSE-FA         | First Aid course with minimum attendance percentage 75.00.                             |
| BATCH-HSE-001     | Active batch for COURSE-HSE in BR-MCT.                                                 |
| BATCH-HSE-002     | Active batch for COURSE-HSE in BR-SOH.                                                 |
| SESSION-HSE-001   | Conducted session for BATCH-HSE-001 scheduled today from 09:00 to 11:00 Oman time.     |
| SESSION-HSE-002   | Future session for BATCH-HSE-001 scheduled tomorrow.                                   |
| SESSION-SOH-001   | Conducted session for BATCH-HSE-002 in BR-SOH.                                         |
| TRAINER-A         | Trainer assigned to BATCH-HSE-001 and SESSION-HSE-001.                                 |
| TRAINER-B         | Trainer not assigned to BATCH-HSE-001.                                                 |
| STUDENT-A         | Active student profile enrolled in BATCH-HSE-001.                                      |
| STUDENT-B         | Active student profile enrolled in BATCH-HSE-001.                                      |
| STUDENT-C         | Cancelled enrollment in BATCH-HSE-001.                                                 |
| STUDENT-SOH       | Active student profile enrolled in BATCH-HSE-002.                                      |
| USER-SUPER        | Super Admin with consolidated attendance permissions.                                  |
| USER-BRANCH-MCT   | Branch Admin assigned to BR-MCT only.                                                  |
| USER-ACADEMIC-MCT | Academic Coordinator assigned to BR-MCT.                                               |
| USER-TRAINER-A    | Trainer user linked to TRAINER-A.                                                      |
| USER-TRAINER-B    | Trainer user linked to TRAINER-B.                                                      |
| USER-STUDENT-A    | Student portal user linked to STUDENT-A.                                               |
| USER-COUNSELOR    | Counselor with read-only low attendance access for assigned students.                  |
| USER-ACCOUNTANT   | Accountant with read-only eligibility visibility.                                      |
| USER-AUDITOR      | Auditor with branch audit access.                                                      |

---

## 2. Feature: Attendance Session Initialization

### Scenario: Initialize attendance session for conducted source session

```gherkin
Feature: Attendance session initialization
  Scenario: Authorized coordinator initializes attendance for a conducted session
    Given user USER-ACADEMIC-MCT is authenticated
    And USER-ACADEMIC-MCT has permission "attendance.session.create"
    And USER-ACADEMIC-MCT has branch access to BR-MCT
    And SESSION-HSE-001 belongs to BR-MCT
    And SESSION-HSE-001 has status "Conducted"
    And no AttendanceSession exists for SESSION-HSE-001
    When the user initializes attendance for SESSION-HSE-001
    Then the system creates one AttendanceSession linked to SESSION-HSE-001
    And the AttendanceSession branchId is BR-MCT
    And the AttendanceSession status is "Draft"
    And the AttendanceSession attendanceDate equals the source session date
    And an audit log is written with action "ATTENDANCE_SESSION_CREATED"
```

### Scenario: Prevent duplicate attendance session initialization

```gherkin
Feature: Attendance session initialization
  Scenario: Duplicate initialization is rejected
    Given user USER-ACADEMIC-MCT is authenticated
    And USER-ACADEMIC-MCT has permission "attendance.session.create"
    And an AttendanceSession already exists for SESSION-HSE-001
    When the user initializes attendance for SESSION-HSE-001 again
    Then the request is rejected with HTTP status 409
    And the application error code is "ERR_ATT_SESSION_ALREADY_EXISTS"
    And no duplicate AttendanceSession is created
```

### Scenario: Reject initialization for inaccessible branch

```gherkin
Feature: Attendance session initialization
  Scenario: Branch-scoped user cannot initialize attendance for another branch
    Given user USER-BRANCH-MCT is authenticated
    And USER-BRANCH-MCT has permission "attendance.session.create"
    And USER-BRANCH-MCT has branch access to BR-MCT only
    And SESSION-SOH-001 belongs to BR-SOH
    When the user initializes attendance for SESSION-SOH-001
    Then the request is rejected with HTTP status 403
    And the application error code is "ERR_BRANCH_SCOPE_DENIED"
    And no AttendanceSession is created
```

### Scenario Outline: Source session status validation for initialization

```gherkin
Feature: Attendance session initialization
  Scenario Outline: Only eligible source sessions can be initialized
    Given user USER-ACADEMIC-MCT is authenticated
    And USER-ACADEMIC-MCT has permission "attendance.session.create"
    And a source session in BR-MCT has status "<sourceStatus>"
    When the user initializes attendance for that source session
    Then the outcome is "<outcome>"
    And the error code is "<errorCode>"

    Examples:
      | sourceStatus | outcome  | errorCode                         |
      | Scheduled    | Rejected | ERR_ATT_SOURCE_SESSION_NOT_READY  |
      | Conducted    | Created  |                                   |
      | Completed    | Created  |                                   |
      | Cancelled    | Rejected | ERR_ATT_SOURCE_SESSION_CANCELLED  |
      | Draft        | Rejected | ERR_ATT_SOURCE_SESSION_NOT_READY  |
```

---

## 3. Feature: Attendance Roster Generation

### Scenario: Generate roster from active enrollments

```gherkin
Feature: Attendance roster generation
  Scenario: Active enrollments become attendance records
    Given user USER-ACADEMIC-MCT is authenticated
    And USER-ACADEMIC-MCT has permission "attendance.session.roster.sync"
    And AttendanceSession exists for SESSION-HSE-001 in status "Draft"
    And STUDENT-A has an Active enrollment in BATCH-HSE-001
    And STUDENT-B has an Active enrollment in BATCH-HSE-001
    And STUDENT-C has a Cancelled enrollment in BATCH-HSE-001
    When the user generates the roster for the AttendanceSession
    Then AttendanceRecord is created for STUDENT-A
    And AttendanceRecord is created for STUDENT-B
    And no AttendanceRecord is created for STUDENT-C
    And each new AttendanceRecord status is "Unmarked"
    And each AttendanceRecord references the corresponding Enrollment and StudentProfile
    And an audit log is written with action "ATTENDANCE_ROSTER_SYNCED"
```

### Scenario: Roster generation is idempotent

```gherkin
Feature: Attendance roster generation
  Scenario: Syncing the roster twice does not duplicate records
    Given AttendanceSession exists for SESSION-HSE-001 in status "Draft"
    And AttendanceRecord already exists for STUDENT-A enrollment
    When an authorized user syncs the roster again
    Then no duplicate AttendanceRecord is created for STUDENT-A enrollment
    And the roster count remains equal to the number of eligible active enrollments
```

### Scenario: Prevent roster sync after attendance is locked

```gherkin
Feature: Attendance roster generation
  Scenario: Locked session roster cannot be changed
    Given AttendanceSession exists for SESSION-HSE-001 in status "Locked"
    And user USER-ACADEMIC-MCT has permission "attendance.session.roster.sync"
    When the user attempts to sync the roster
    Then the request is rejected with HTTP status 409
    And the application error code is "ERR_ATT_SESSION_LOCKED"
    And no AttendanceRecord is added, removed, or changed
```

### Scenario: New enrollment after roster generation requires authorized resync before submission

```gherkin
Feature: Attendance roster generation
  Scenario: Authorized resync adds newly active enrollment before submission
    Given AttendanceSession exists for SESSION-HSE-001 in status "Draft"
    And the roster already includes STUDENT-A and STUDENT-B
    And a new active enrollment STUDENT-D is added to BATCH-HSE-001 before attendance submission
    When USER-ACADEMIC-MCT syncs the roster
    Then a new AttendanceRecord is created for STUDENT-D
    And existing attendance statuses for STUDENT-A and STUDENT-B remain unchanged
    And the roster sync audit log records addedEnrollmentCount as 1
```

---

## 4. Feature: Manual Attendance Marking

### Scenario Outline: Mark valid attendance statuses

```gherkin
Feature: Manual attendance marking
  Scenario Outline: Authorized trainer marks an attendance record with a valid status
    Given USER-TRAINER-A is authenticated
    And USER-TRAINER-A has permission "attendance.record.mark"
    And TRAINER-A is assigned to SESSION-HSE-001
    And AttendanceSession for SESSION-HSE-001 is in status "Draft"
    And an AttendanceRecord exists for STUDENT-A with status "Unmarked"
    When the trainer marks STUDENT-A as "<status>"
    Then the AttendanceRecord status becomes "<status>"
    And markedBy is USER-TRAINER-A
    And markedAt is set to the current timestamp
    And the response includes the updated roster totals

    Examples:
      | status  |
      | Present |
      | Absent  |
      | Late    |
      | Excused |
```

### Scenario: Late status requires late minutes

```gherkin
Feature: Manual attendance marking
  Scenario: Late status is rejected without late minutes
    Given USER-TRAINER-A is authenticated
    And AttendanceSession for SESSION-HSE-001 is in status "Draft"
    And an AttendanceRecord exists for STUDENT-A
    When the trainer marks STUDENT-A as "Late" without lateMinutes
    Then the request is rejected with HTTP status 422
    And the application error code is "ERR_ATT_LATE_MINUTES_REQUIRED"
    And the AttendanceRecord status remains unchanged
```

### Scenario Outline: Validate late minutes bounds

```gherkin
Feature: Manual attendance marking
  Scenario Outline: Late minutes must be within allowed bounds
    Given USER-TRAINER-A is authenticated
    And USER-TRAINER-A has permission "attendance.record.markLate"
    And AttendanceSession for SESSION-HSE-001 has duration 120 minutes
    When the trainer marks STUDENT-A as "Late" with lateMinutes <lateMinutes>
    Then the outcome is "<outcome>"
    And the error code is "<errorCode>"

    Examples:
      | lateMinutes | outcome  | errorCode                     |
      | -1          | Rejected | ERR_ATT_INVALID_LATE_MINUTES  |
      | 0           | Rejected | ERR_ATT_INVALID_LATE_MINUTES  |
      | 1           | Accepted |                               |
      | 30          | Accepted |                               |
      | 120         | Accepted |                               |
      | 121         | Rejected | ERR_ATT_LATE_EXCEEDS_DURATION |
```

### Scenario: Excused status requires reason code

```gherkin
Feature: Manual attendance marking
  Scenario: Excused status requires a valid reason
    Given USER-TRAINER-A is authenticated
    And USER-TRAINER-A has permission "attendance.record.markExcused"
    And AttendanceSession for SESSION-HSE-001 is in status "Draft"
    When the trainer marks STUDENT-A as "Excused" without an excused reason code
    Then the request is rejected with HTTP status 422
    And the application error code is "ERR_ATT_EXCUSED_REASON_REQUIRED"
```

### Scenario: Unassigned trainer cannot mark attendance

```gherkin
Feature: Manual attendance marking
  Scenario: Trainer not assigned to the batch or session is denied
    Given USER-TRAINER-B is authenticated
    And USER-TRAINER-B has permission "attendance.record.mark"
    And TRAINER-B is not assigned to SESSION-HSE-001 or BATCH-HSE-001
    When USER-TRAINER-B marks STUDENT-A attendance
    Then the request is rejected with HTTP status 403
    And the application error code is "ERR_ATT_TRAINER_NOT_ASSIGNED"
    And the AttendanceRecord remains unchanged
```

---

## 5. Feature: Bulk Attendance Marking

### Scenario: Bulk mark all unmarked records as present

```gherkin
Feature: Bulk attendance marking
  Scenario: Authorized trainer bulk marks all unmarked records as Present
    Given USER-TRAINER-A is authenticated
    And USER-TRAINER-A has permission "attendance.record.mark"
    And AttendanceSession for SESSION-HSE-001 is in status "Draft"
    And the roster contains 20 Unmarked records
    When the trainer chooses bulk action "Mark all unmarked as Present"
    Then all 20 records are updated to "Present"
    And the system returns presentCount as 20
    And each changed record has markedBy USER-TRAINER-A
    And each changed record has markedAt populated
```

### Scenario: Bulk action does not override already marked records unless explicitly selected

```gherkin
Feature: Bulk attendance marking
  Scenario: Bulk marking unmarked only preserves existing statuses
    Given AttendanceSession for SESSION-HSE-001 is in status "Draft"
    And STUDENT-A is marked "Absent"
    And STUDENT-B is "Unmarked"
    When USER-TRAINER-A chooses bulk action "Mark all unmarked as Present"
    Then STUDENT-A remains "Absent"
    And STUDENT-B becomes "Present"
```

### Scenario: Bulk overwrite requires confirmation and permission

```gherkin
Feature: Bulk attendance marking
  Scenario: Bulk overwrite existing statuses is controlled
    Given AttendanceSession for SESSION-HSE-001 is in status "Draft"
    And STUDENT-A is marked "Absent"
    And USER-TRAINER-A has permission "attendance.record.mark"
    But USER-TRAINER-A does not have permission "attendance.record.bulkOverwrite"
    When USER-TRAINER-A attempts to overwrite all records as "Present"
    Then the request is rejected with HTTP status 403
    And the application error code is "ERR_PERMISSION_DENIED"
    And STUDENT-A remains "Absent"
```

---

## 6. Feature: Save Draft Attendance

### Scenario: Save draft attendance without submitting

```gherkin
Feature: Draft attendance saving
  Scenario: Authorized trainer saves a partial draft
    Given USER-TRAINER-A is authenticated
    And AttendanceSession for SESSION-HSE-001 is in status "Draft"
    And the roster has 20 records
    And 12 records are marked
    When USER-TRAINER-A saves the draft
    Then the AttendanceSession remains in status "Draft"
    And the marked 12 records are persisted
    And the 8 unmarked records remain "Unmarked"
    And lastSavedAt is updated
    And an audit log is written with action "ATTENDANCE_DRAFT_SAVED"
```

### Scenario: Draft save is rejected after session submission

```gherkin
Feature: Draft attendance saving
  Scenario: Submitted attendance cannot be saved as draft
    Given AttendanceSession for SESSION-HSE-001 is in status "Submitted"
    When USER-TRAINER-A saves the draft
    Then the request is rejected with HTTP status 409
    And the application error code is "ERR_ATT_SESSION_NOT_EDITABLE"
```

---

## 7. Feature: Final Attendance Submission

### Scenario: Submit complete attendance roster

```gherkin
Feature: Final attendance submission
  Scenario: Trainer submits a fully marked roster
    Given USER-TRAINER-A is authenticated
    And USER-TRAINER-A has permission "attendance.session.submit"
    And AttendanceSession for SESSION-HSE-001 is in status "Draft"
    And every AttendanceRecord in the roster has a status other than "Unmarked"
    When USER-TRAINER-A submits the AttendanceSession
    Then the AttendanceSession status becomes "Submitted"
    And submittedBy is USER-TRAINER-A
    And submittedAt is set
    And student attendance summaries are recalculated for every affected enrollment
    And low attendance detection is evaluated for every affected enrollment
    And an audit log is written with action "ATTENDANCE_SUBMITTED"
```

### Scenario: Submit with unmarked records is rejected by default

```gherkin
Feature: Final attendance submission
  Scenario: Submission fails when roster contains unmarked records
    Given USER-TRAINER-A is authenticated
    And AttendanceSession for SESSION-HSE-001 is in status "Draft"
    And one AttendanceRecord has status "Unmarked"
    When USER-TRAINER-A submits the AttendanceSession
    Then the request is rejected with HTTP status 422
    And the application error code is "ERR_ATT_UNMARKED_RECORDS_EXIST"
    And the AttendanceSession remains in status "Draft"
```

### Scenario: Submit with unmarked override by authorized coordinator

```gherkin
Feature: Final attendance submission
  Scenario: Authorized coordinator submits with documented unmarked override
    Given USER-ACADEMIC-MCT is authenticated
    And USER-ACADEMIC-MCT has permission "attendance.session.submitWithUnmarked"
    And AttendanceSession for SESSION-HSE-001 is in status "Draft"
    And two AttendanceRecords have status "Unmarked"
    When USER-ACADEMIC-MCT submits the session with override reason "Emergency evacuation before roll call completed"
    Then the AttendanceSession status becomes "Submitted"
    And the override reason is stored
    And the two Unmarked records are excluded from attendance percentage denominator
    And an audit log is written with action "ATTENDANCE_SUBMITTED_WITH_UNMARKED_OVERRIDE"
```

### Scenario: Submission recalculates attendance percentage correctly

```gherkin
Feature: Final attendance submission
  Scenario: Attendance percentage is calculated using weighted statuses
    Given STUDENT-A has 4 official attendance records after submission
    And the records are Present, Present, Late, Absent
    And Late has default weight 1.00
    When the attendance summary is recalculated
    Then STUDENT-A attendedWeightedCount is 3.00
    And STUDENT-A totalRequiredSessions is 4
    And STUDENT-A attendancePercentage is 75.00
```

---

## 8. Feature: Attendance Lock and Edit Restriction

### Scenario: Lock submitted attendance session

```gherkin
Feature: Attendance locking
  Scenario: Authorized coordinator locks submitted attendance
    Given USER-ACADEMIC-MCT is authenticated
    And USER-ACADEMIC-MCT has permission "attendance.session.lock"
    And AttendanceSession for SESSION-HSE-001 is in status "Submitted"
    When USER-ACADEMIC-MCT locks the AttendanceSession
    Then the AttendanceSession status becomes "Locked"
    And lockedBy is USER-ACADEMIC-MCT
    And lockedAt is set
    And direct record edits are disabled
    And an audit log is written with action "ATTENDANCE_LOCKED"
```

### Scenario: Direct edit blocked for locked session

```gherkin
Feature: Attendance locking
  Scenario: Locked attendance cannot be changed directly
    Given AttendanceSession for SESSION-HSE-001 is in status "Locked"
    And STUDENT-A is marked "Absent"
    When USER-TRAINER-A attempts to change STUDENT-A to "Present"
    Then the request is rejected with HTTP status 409
    And the application error code is "ERR_ATT_SESSION_LOCKED"
    And STUDENT-A remains marked "Absent"
```

### Scenario: Unlock requires exceptional permission

```gherkin
Feature: Attendance locking
  Scenario: Branch admin without unlock permission cannot unlock
    Given USER-BRANCH-MCT is authenticated
    And USER-BRANCH-MCT does not have permission "attendance.session.unlock"
    And AttendanceSession for SESSION-HSE-001 is in status "Locked"
    When USER-BRANCH-MCT attempts to unlock the AttendanceSession
    Then the request is rejected with HTTP status 403
    And the application error code is "ERR_PERMISSION_DENIED"
```

---

## 9. Feature: Attendance Correction Request

### Scenario: Trainer submits correction request for submitted session

```gherkin
Feature: Attendance correction request
  Scenario: Correction request is created for a submitted attendance record
    Given USER-TRAINER-A is authenticated
    And USER-TRAINER-A has permission "attendance.correction.create"
    And AttendanceSession for SESSION-HSE-001 is in status "Submitted"
    And STUDENT-A AttendanceRecord status is "Absent"
    When USER-TRAINER-A requests correction to "Present" with reason code "MARKING_ERROR" and reason text "Student was present but marked absent by mistake"
    Then an AttendanceCorrection is created in status "Submitted"
    And oldStatus is "Absent"
    And requestedNewStatus is "Present"
    And requestedBy is USER-TRAINER-A
    And the AttendanceRecord remains "Absent" until approval
    And an audit log is written with action "ATTENDANCE_CORRECTION_REQUESTED"
```

### Scenario: Correction request requires reason text

```gherkin
Feature: Attendance correction request
  Scenario: Correction without reason text is rejected
    Given AttendanceSession for SESSION-HSE-001 is in status "Submitted"
    When USER-TRAINER-A requests correction for STUDENT-A without reason text
    Then the request is rejected with HTTP status 422
    And the application error code is "ERR_ATT_CORRECTION_REASON_REQUIRED"
```

### Scenario: Duplicate pending correction is rejected

```gherkin
Feature: Attendance correction request
  Scenario: Only one pending correction per attendance record is allowed
    Given an AttendanceCorrection already exists for STUDENT-A record in status "Submitted"
    When USER-TRAINER-A submits another correction for the same AttendanceRecord
    Then the request is rejected with HTTP status 409
    And the application error code is "ERR_ATT_CORRECTION_ALREADY_PENDING"
```

### Scenario Outline: Correction creation based on session status

```gherkin
Feature: Attendance correction request
  Scenario Outline: Correction request is allowed only for official sessions
    Given AttendanceSession for SESSION-HSE-001 has status "<sessionStatus>"
    When USER-TRAINER-A requests a correction
    Then the outcome is "<outcome>"
    And the error code is "<errorCode>"

    Examples:
      | sessionStatus          | outcome  | errorCode                       |
      | Draft                  | Rejected | ERR_ATT_SESSION_NOT_OFFICIAL    |
      | Submitted              | Accepted |                                 |
      | Locked                 | Rejected | ERR_ATT_LOCKED_CORRECTION_NEEDS_OVERRIDE |
      | ReturnedForCorrection  | Accepted |                                 |
      | Cancelled              | Rejected | ERR_ATT_SESSION_CANCELLED       |
```

---

## 10. Feature: Attendance Correction Approval and Rejection

### Scenario: Approve correction and update official record

```gherkin
Feature: Attendance correction approval
  Scenario: Academic coordinator approves correction request
    Given USER-ACADEMIC-MCT is authenticated
    And USER-ACADEMIC-MCT has permission "attendance.correction.approve"
    And an AttendanceCorrection for STUDENT-A is in status "Submitted"
    And the requestedNewStatus is "Present"
    When USER-ACADEMIC-MCT approves the correction with remarks "Verified with trainer and class evidence"
    Then the AttendanceCorrection status becomes "Approved"
    And approvedBy is USER-ACADEMIC-MCT
    And approvedAt is set
    And the AttendanceRecord status becomes "Present"
    And student attendance summary is recalculated
    And completion attendance evidence is refreshed
    And an audit log records old and new attendance values
```

### Scenario: Reject correction with mandatory reason

```gherkin
Feature: Attendance correction approval
  Scenario: Academic coordinator rejects correction request
    Given USER-ACADEMIC-MCT is authenticated
    And USER-ACADEMIC-MCT has permission "attendance.correction.reject"
    And an AttendanceCorrection for STUDENT-A is in status "Submitted"
    When USER-ACADEMIC-MCT rejects the correction with reason "No supporting evidence"
    Then the AttendanceCorrection status becomes "Rejected"
    And rejectedBy is USER-ACADEMIC-MCT
    And rejectedAt is set
    And the AttendanceRecord status remains unchanged
    And an audit log is written with action "ATTENDANCE_CORRECTION_REJECTED"
```

### Scenario: Reject correction without reason is blocked

```gherkin
Feature: Attendance correction approval
  Scenario: Rejection reason is mandatory
    Given an AttendanceCorrection for STUDENT-A is in status "Submitted"
    When USER-ACADEMIC-MCT rejects the correction without rejection reason
    Then the request is rejected with HTTP status 422
    And the application error code is "ERR_ATT_REJECTION_REASON_REQUIRED"
```

### Scenario: Self-approval is denied without special permission

```gherkin
Feature: Attendance correction approval
  Scenario: Requester cannot approve own correction
    Given USER-ACADEMIC-MCT created a correction request
    And USER-ACADEMIC-MCT has permission "attendance.correction.approve"
    But USER-ACADEMIC-MCT does not have permission "attendance.correction.selfApprove"
    When USER-ACADEMIC-MCT attempts to approve the same correction
    Then the request is rejected with HTTP status 403
    And the application error code is "ERR_ATT_SELF_APPROVAL_NOT_ALLOWED"
```

---

## 11. Feature: Attendance Percentage Calculation

### Scenario Outline: Calculate percentage for mixed statuses

```gherkin
Feature: Attendance percentage calculation
  Scenario Outline: Student attendance percentage is calculated from official weighted records
    Given an enrollment has official attendance records with counts present <present>, late <late>, excused <excused>, absent <absent>
    And Late weight is <lateWeight>
    And Excused weight is <excusedWeight>
    When the attendance summary is recalculated
    Then attendedWeightedCount is <weightedCount>
    And totalRequiredSessions is <totalRequired>
    And attendancePercentage is <percentage>

    Examples:
      | present | late | excused | absent | lateWeight | excusedWeight | weightedCount | totalRequired | percentage |
      | 4       | 0    | 0       | 1      | 1.00       | 1.00          | 4.00          | 5             | 80.00      |
      | 3       | 1    | 0       | 1      | 1.00       | 1.00          | 4.00          | 5             | 80.00      |
      | 3       | 1    | 0       | 1      | 0.50       | 1.00          | 3.50          | 5             | 70.00      |
      | 2       | 0    | 1       | 1      | 1.00       | 1.00          | 3.00          | 4             | 75.00      |
      | 2       | 0    | 1       | 1      | 1.00       | 0.00          | 2.00          | 4             | 50.00      |
```

### Scenario: No official records returns not started status

```gherkin
Feature: Attendance percentage calculation
  Scenario: Enrollment with no official attendance has NotStarted evidence
    Given STUDENT-A has an active enrollment
    And no submitted AttendanceRecord exists for the enrollment
    When the attendance summary is recalculated
    Then totalRequiredSessions is 0
    And attendancePercentage is null
    And attendanceEvidenceStatus is "NotStarted"
```

### Scenario: Unmarked override excluded from denominator

```gherkin
Feature: Attendance percentage calculation
  Scenario: Approved unmarked override records are excluded from denominator
    Given STUDENT-A has 5 records linked to submitted sessions
    And 4 records have official statuses Present, Present, Absent, Present
    And 1 record remains Unmarked due to approved submission override
    When the attendance summary is recalculated
    Then totalRequiredSessions is 4
    And attendedWeightedCount is 3.00
    And attendancePercentage is 75.00
```

---

## 12. Feature: Low Attendance Detection

### Scenario: Generate warning alert below threshold

```gherkin
Feature: Low attendance detection
  Scenario: Student below warning threshold receives alert
    Given COURSE-HSE requires 80.00 percent attendance
    And STUDENT-A attendancePercentage is 75.00
    And no open low attendance alert exists for STUDENT-A enrollment
    When low attendance detection runs
    Then an AttendanceAlert is created with severity "Warning"
    And the alert threshold is 80.00
    And the alert varianceFromThreshold is -5.00
    And notification event "LowAttendanceDetected" is emitted internally
```

### Scenario: Generate critical alert below critical threshold

```gherkin
Feature: Low attendance detection
  Scenario: Student far below threshold receives critical alert
    Given COURSE-HSE requires 80.00 percent attendance
    And the critical threshold is 70.00
    And STUDENT-A attendancePercentage is 65.00
    When low attendance detection runs
    Then an AttendanceAlert is created with severity "Critical"
    And the recommendedAction is "CounselorFollowUp"
```

### Scenario: Existing open alert is updated, not duplicated

```gherkin
Feature: Low attendance detection
  Scenario: Repeated detection updates existing alert
    Given STUDENT-A has an open AttendanceAlert for enrollment BATCH-HSE-001
    And STUDENT-A attendancePercentage changes from 75.00 to 72.00
    When low attendance detection runs
    Then no duplicate AttendanceAlert is created
    And the existing alert currentAttendancePercentage is updated to 72.00
    And alertUpdatedAt is set
```

### Scenario: Resolve alert when student recovers attendance

```gherkin
Feature: Low attendance detection
  Scenario: Open alert resolves automatically after attendance recovers
    Given COURSE-HSE requires 80.00 percent attendance
    And STUDENT-A has an open low attendance alert
    And STUDENT-A attendancePercentage becomes 85.00
    When low attendance detection runs
    Then the AttendanceAlert status becomes "Resolved"
    And resolvedReason is "ATTENDANCE_RECOVERED"
    And resolvedAt is set
```

---

## 13. Feature: Pending Attendance Monitoring

### Scenario: Display pending sessions older than SLA

```gherkin
Feature: Pending attendance monitoring
  Scenario: Pending sessions are listed by age
    Given USER-ACADEMIC-MCT is authenticated
    And USER-ACADEMIC-MCT has permission "attendance.report.pendingSessions"
    And AttendanceSession for SESSION-HSE-001 is in status "Draft"
    And its dueAt is 24 hours before now
    When USER-ACADEMIC-MCT opens the pending attendance report
    Then SESSION-HSE-001 is listed
    And pendingAgeBucket is "24-48h"
    And the row action "Send reminder" is visible if notification permission is granted
```

### Scenario: Future sessions are not pending

```gherkin
Feature: Pending attendance monitoring
  Scenario: Future source session is excluded from pending report
    Given SESSION-HSE-002 is scheduled for tomorrow
    And no AttendanceSession has been submitted for SESSION-HSE-002
    When USER-ACADEMIC-MCT opens the pending attendance report for today
    Then SESSION-HSE-002 is not listed as pending
```

---

## 14. Feature: Reports, Dashboards, and Exports

### Scenario: Branch admin views branch attendance dashboard

```gherkin
Feature: Attendance dashboard
  Scenario: Branch admin sees only assigned branch metrics
    Given USER-BRANCH-MCT is authenticated
    And USER-BRANCH-MCT has permission "attendance.dashboard.branch.read"
    And USER-BRANCH-MCT has branch access to BR-MCT only
    When USER-BRANCH-MCT opens the Branch Attendance Dashboard
    Then all metric queries are filtered to BR-MCT
    And no metrics from BR-SOH are included
    And the dashboard response includes branchScope mode "SINGLE_BRANCH"
```

### Scenario: Consolidated dashboard requires consolidated permission

```gherkin
Feature: Attendance dashboard
  Scenario: User without consolidated permission cannot view multi-branch dashboard
    Given USER-BRANCH-MCT is authenticated
    And USER-BRANCH-MCT has permission "attendance.dashboard.executive.read"
    But USER-BRANCH-MCT does not have permission "attendance.consolidated.read"
    When USER-BRANCH-MCT requests a consolidated dashboard
    Then the request is rejected with HTTP status 403
    And the application error code is "ERR_ATT_CONSOLIDATED_SCOPE_DENIED"
```

### Scenario: Export session register as PDF

```gherkin
Feature: Attendance reports and exports
  Scenario: Authorized user exports official session register
    Given USER-ACADEMIC-MCT is authenticated
    And USER-ACADEMIC-MCT has permission "attendance.report.sessionRegister"
    And USER-ACADEMIC-MCT has permission "attendance.report.export.pdf"
    And AttendanceSession for SESSION-HSE-001 belongs to BR-MCT
    When the user exports the Session Attendance Register as PDF
    Then the system returns a PDF file reference
    And the PDF includes report code "RPT-M08-ATT-001"
    And the PDF includes branch, course, batch, session date, generated by, generated at, and filter summary
    And an AuditLog entry is written with action "EXPORT_ATTENDANCE_REPORT"
```

### Scenario Outline: Export format permission validation

```gherkin
Feature: Attendance reports and exports
  Scenario Outline: Export requires format-specific permission
    Given USER-ACADEMIC-MCT is authenticated
    And USER-ACADEMIC-MCT has report permission "<reportPermission>"
    And USER-ACADEMIC-MCT has export permission "<exportPermission>" set to <hasPermission>
    When USER-ACADEMIC-MCT exports report "<reportCode>" as "<format>"
    Then the outcome is "<outcome>"
    And the error code is "<errorCode>"

    Examples:
      | reportCode       | reportPermission                    | format | exportPermission             | hasPermission | outcome  | errorCode             |
      | RPT-M08-ATT-001  | attendance.report.sessionRegister   | PDF    | attendance.report.export.pdf  | true          | Accepted |                       |
      | RPT-M08-ATT-004  | attendance.report.lowAttendance     | XLSX   | attendance.report.export.xlsx | true          | Accepted |                       |
      | RPT-M08-ATT-007  | attendance.report.correctionRegister| CSV    | attendance.report.export.csv  | false         | Rejected | ERR_PERMISSION_DENIED |
```

### Scenario: Report date range bound is enforced

```gherkin
Feature: Attendance reports and exports
  Scenario: Excessive report date range is rejected
    Given USER-ACADEMIC-MCT is authenticated
    And USER-ACADEMIC-MCT has permission "attendance.report.lowAttendance"
    When the user requests Low Attendance Report with dateFrom "2024-01-01" and dateTo "2026-07-31"
    Then the request is rejected with HTTP status 422
    And the application error code is "ERR_ATT_REPORT_DATE_RANGE_EXCEEDED"
```

---

## 15. Feature: Student Self-Service Attendance

### Scenario: Student views own attendance summary

```gherkin
Feature: Student attendance self-service
  Scenario: Student can view own attendance summary
    Given USER-STUDENT-A is authenticated in the Student Portal
    And USER-STUDENT-A has permission "attendance.self.summary.read"
    And USER-STUDENT-A is linked to STUDENT-A StudentProfile
    When USER-STUDENT-A opens My Attendance Summary
    Then the system returns only enrollments belonging to STUDENT-A
    And the response includes attendance percentage, required threshold, total sessions, attended sessions, and low attendance status
    And no other student's attendance data is returned
```

### Scenario: Student cannot modify attendance

```gherkin
Feature: Student attendance self-service
  Scenario: Student cannot submit attendance changes
    Given USER-STUDENT-A is authenticated
    And USER-STUDENT-A does not have permission "attendance.record.mark"
    When USER-STUDENT-A attempts to update an AttendanceRecord
    Then the request is rejected with HTTP status 403
    And the application error code is "ERR_PERMISSION_DENIED"
```

### Scenario: Student cannot access another student's history

```gherkin
Feature: Student attendance self-service
  Scenario: Student ID in request is ignored or rejected
    Given USER-STUDENT-A is authenticated
    And USER-STUDENT-A is linked to STUDENT-A
    When USER-STUDENT-A requests attendance history for STUDENT-B enrollment
    Then the request is rejected with HTTP status 403
    And the application error code is "ERR_ATT_STUDENT_SCOPE_DENIED"
```

---

## 16. Feature: Corporate Attendance Reporting

### Scenario: Corporate coordinator views only own participants

```gherkin
Feature: Corporate attendance reporting
  Scenario: Corporate coordinator receives scoped participant attendance
    Given a corporate coordinator is authenticated for corporate account "CORP-001"
    And the coordinator has permission "attendance.corporate.summary.read"
    And CORP-001 has participants enrolled in BATCH-HSE-001
    And another corporate account CORP-002 also has participants in BATCH-HSE-001
    When the coordinator opens Corporate Attendance Summary
    Then the response includes only participants from CORP-001
    And participants from CORP-002 are not included
    And non-corporate regular students are not included
```

### Scenario: Corporate report does not expose finance data

```gherkin
Feature: Corporate attendance reporting
  Scenario: Attendance report excludes invoice and payment details
    Given a corporate coordinator is authenticated for CORP-001
    When the coordinator exports Corporate Attendance Summary
    Then the export includes participant attendance fields
    And the export does not include invoice number, payment amount, discount amount, receivable aging, or payment status
```

---

## 17. Feature: Completion Evidence API

### Scenario: Completion context retrieves attendance evidence for enrollment

```gherkin
Feature: Completion attendance evidence
  Scenario: Attendance evidence marks enrollment eligible when threshold is met
    Given STUDENT-A enrollment belongs to COURSE-HSE requiring 80.00 percent attendance
    And STUDENT-A official attendancePercentage is 85.00
    And STUDENT-A has no pending attendance corrections
    And STUDENT-A has no pending attendance sessions that block completion
    When Exam and Completion context requests attendance evidence for STUDENT-A enrollment
    Then the response attendanceEligible is true
    And attendanceEvidenceStatus is "Eligible"
    And the response includes attendancePercentage 85.00 and requiredPercentage 80.00
```

### Scenario: Completion evidence blocked by pending correction

```gherkin
Feature: Completion attendance evidence
  Scenario: Pending correction blocks final attendance evidence
    Given STUDENT-A official attendancePercentage is 82.00
    And a submitted AttendanceCorrection exists for STUDENT-A enrollment
    When completion evidence is requested
    Then attendanceEligible is false
    And attendanceEvidenceStatus is "BlockedByPendingCorrection"
    And pendingCorrectionCount is greater than 0
```

### Scenario: Attendance evidence does not issue certificate

```gherkin
Feature: Completion attendance evidence
  Scenario: Attendance eligibility alone does not generate certificate
    Given STUDENT-A attendanceEligible is true
    When completion evidence is returned to Completion context
    Then no Certificate is generated by Attendance Management
    And no Enrollment certificateStatus is changed by Attendance Management
```

---

## 18. Feature: Authorization Guards

### Scenario Outline: Action permissions are enforced

```gherkin
Feature: Attendance authorization guards
  Scenario Outline: Permission is required for protected attendance action
    Given user "<user>" is authenticated
    And the user permission "<permission>" is <permissionState>
    When the user performs action "<action>"
    Then the outcome is "<outcome>"
    And the error code is "<errorCode>"

    Examples:
      | user              | permission                         | permissionState | action                    | outcome  | errorCode             |
      | USER-TRAINER-A    | attendance.record.mark             | granted         | Mark attendance           | Accepted |                       |
      | USER-STUDENT-A    | attendance.record.mark             | missing         | Mark attendance           | Rejected | ERR_PERMISSION_DENIED |
      | USER-ACADEMIC-MCT | attendance.correction.approve      | granted         | Approve correction        | Accepted |                       |
      | USER-COUNSELOR    | attendance.correction.approve      | missing         | Approve correction        | Rejected | ERR_PERMISSION_DENIED |
      | USER-AUDITOR      | attendance.audit.read              | granted         | View audit trail          | Accepted |                       |
      | USER-ACCOUNTANT   | attendance.audit.read              | missing         | View audit trail          | Rejected | ERR_PERMISSION_DENIED |
```

### Scenario: Permission-based UI hides mark button

```gherkin
Feature: Attendance authorization guards
  Scenario: User without mark permission does not see mark attendance button
    Given USER-COUNSELOR is authenticated
    And USER-COUNSELOR has read-only attendance permissions
    When USER-COUNSELOR opens a session attendance page
    Then the Mark Attendance button is hidden
    And bulk action controls are hidden
    And the attendance table is displayed in read-only mode
```

### Scenario: Server rejects action even if UI is bypassed

```gherkin
Feature: Attendance authorization guards
  Scenario: API guard rejects forged attendance update request
    Given USER-COUNSELOR is authenticated
    And USER-COUNSELOR does not have permission "attendance.record.update"
    When USER-COUNSELOR sends a direct API request to update attendance status
    Then the request is rejected with HTTP status 403
    And the application error code is "ERR_PERMISSION_DENIED"
    And no AttendanceRecord is changed
```

---

## 19. Feature: Branch Data Isolation

### Scenario: Branch-scoped list excludes other branch data

```gherkin
Feature: Branch data isolation
  Scenario: Muscat branch admin cannot see Sohar attendance sessions
    Given USER-BRANCH-MCT is authenticated
    And USER-BRANCH-MCT has branch access to BR-MCT only
    And AttendanceSession A belongs to BR-MCT
    And AttendanceSession B belongs to BR-SOH
    When USER-BRANCH-MCT lists attendance sessions
    Then AttendanceSession A is returned
    And AttendanceSession B is not returned
```

### Scenario: Branch-scoped detail access rejects direct ID lookup from another branch

```gherkin
Feature: Branch data isolation
  Scenario: Direct access by ID is branch guarded
    Given USER-BRANCH-MCT is authenticated
    And USER-BRANCH-MCT has branch access to BR-MCT only
    And AttendanceSession B belongs to BR-SOH
    When USER-BRANCH-MCT requests AttendanceSession B by ID
    Then the request is rejected with HTTP status 403
    And the application error code is "ERR_BRANCH_SCOPE_DENIED"
```

### Scenario: Consolidated user sees assigned branches only

```gherkin
Feature: Branch data isolation
  Scenario: Consolidated dashboard respects assigned branch set
    Given USER-SUPER is authenticated
    And USER-SUPER has permission "attendance.consolidated.read"
    And USER-SUPER has assigned branch access to BR-MCT and BR-SOH
    And no access to branch BR-NIZWA
    When USER-SUPER requests consolidated attendance dashboard
    Then the response includes BR-MCT and BR-SOH data
    And the response excludes BR-NIZWA data
```

### Scenario: Parent branch child access requires explicit flag

```gherkin
Feature: Branch data isolation
  Scenario: Parent branch access does not automatically include child branches
    Given a user has access to parent branch BR-MCT
    And the user's UserBranchAccess.canViewChildBranches is false
    And BR-MCT-CHILD is a child branch of BR-MCT
    When the user lists attendance sessions for BR-MCT with includeChildBranches true
    Then the request is rejected with HTTP status 403
    And the application error code is "ERR_CHILD_BRANCH_SCOPE_DENIED"
```

---

## 20. Feature: Audit Logging

### Scenario Outline: Sensitive actions create audit logs

```gherkin
Feature: Attendance audit logging
  Scenario Outline: Audit log is written for sensitive action
    Given user "<user>" is authenticated
    And the user performs attendance action "<action>"
    When the action succeeds
    Then an AuditLog entry is created
    And AuditLog.entityType is "<entityType>"
    And AuditLog.action is "<auditAction>"
    And AuditLog.performedBy is "<user>"
    And AuditLog.performedAt is populated
    And AuditLog.ipAddress is captured when available

    Examples:
      | user              | action                      | entityType            | auditAction                         |
      | USER-TRAINER-A    | Save draft attendance       | AttendanceSession     | ATTENDANCE_DRAFT_SAVED             |
      | USER-TRAINER-A    | Submit attendance           | AttendanceSession     | ATTENDANCE_SUBMITTED               |
      | USER-ACADEMIC-MCT | Lock attendance             | AttendanceSession     | ATTENDANCE_LOCKED                  |
      | USER-TRAINER-A    | Request correction          | AttendanceCorrection  | ATTENDANCE_CORRECTION_REQUESTED    |
      | USER-ACADEMIC-MCT | Approve correction          | AttendanceCorrection  | ATTENDANCE_CORRECTION_APPROVED     |
      | USER-AUDITOR      | Export audit report         | AttendanceReportExport| EXPORT_ATTENDANCE_REPORT           |
```

### Scenario: Correction audit contains old and new values

```gherkin
Feature: Attendance audit logging
  Scenario: Approved correction audit records old and new values
    Given STUDENT-A AttendanceRecord status is "Absent"
    And an approved correction changes the status to "Present"
    When the correction is approved
    Then AuditLog.oldValue contains status "Absent"
    And AuditLog.newValue contains status "Present"
    And AuditLog.reason contains the correction reason or approval remarks
```

---

## 21. Feature: Soft Delete and Restore Controls

### Scenario: Soft delete non-official alert rule

```gherkin
Feature: Attendance soft delete
  Scenario: Authorized admin soft deletes attendance alert rule
    Given USER-BRANCH-MCT is authenticated
    And USER-BRANCH-MCT has permission "attendance.data.softDelete"
    And an AttendanceAlertRule exists in BR-MCT
    When USER-BRANCH-MCT deletes the AttendanceAlertRule
    Then the rule is not physically removed
    And isDeleted becomes true
    And deletedAt is populated
    And updatedBy is USER-BRANCH-MCT
    And an audit log is written with action "ATTENDANCE_ALERT_RULE_SOFT_DELETED"
```

### Scenario: Official attendance record cannot be soft deleted through normal delete

```gherkin
Feature: Attendance soft delete
  Scenario: Official submitted attendance record cannot be deleted
    Given AttendanceRecord for STUDENT-A belongs to a Submitted AttendanceSession
    And USER-BRANCH-MCT has permission "attendance.data.softDelete"
    When USER-BRANCH-MCT attempts to delete the AttendanceRecord
    Then the request is rejected with HTTP status 409
    And the application error code is "ERR_ATT_OFFICIAL_RECORD_DELETE_BLOCKED"
    And the AttendanceRecord remains active
```

### Scenario: Restore soft-deleted alert rule

```gherkin
Feature: Attendance soft delete
  Scenario: Authorized admin restores soft-deleted alert rule
    Given an AttendanceAlertRule in BR-MCT has isDeleted true
    And USER-BRANCH-MCT has permission "attendance.data.restore"
    When USER-BRANCH-MCT restores the rule
    Then isDeleted becomes false
    And deletedAt becomes null
    And status is restored to "Inactive"
    And an audit log is written with action "ATTENDANCE_ALERT_RULE_RESTORED"
```

---

## 22. Feature: Bilingual Layout and Labels

### Scenario: English LTR attendance table rendering

```gherkin
Feature: Bilingual attendance UI
  Scenario: English UI renders attendance table left-to-right
    Given USER-ACADEMIC-MCT preferred language is English
    When the user opens the attendance marking screen
    Then the layout direction is "ltr"
    And the status labels are "Present", "Absent", "Late", and "Excused"
    And primary identifiers appear on the left side of the table
```

### Scenario: Arabic RTL attendance table rendering

```gherkin
Feature: Bilingual attendance UI
  Scenario: Arabic UI renders attendance table right-to-left
    Given USER-ACADEMIC-MCT preferred language is Arabic
    When the user opens the attendance marking screen
    Then the layout direction is "rtl"
    And the status labels are Arabic localized labels
    And primary identifiers appear on the right side of the table
    And action buttons are mirrored according to RTL layout rules
```

### Scenario: Export includes localized headers

```gherkin
Feature: Bilingual attendance UI
  Scenario: Arabic PDF export uses localized headers
    Given USER-ACADEMIC-MCT preferred language is Arabic
    And USER-ACADEMIC-MCT exports the Session Attendance Register as PDF
    Then the PDF report title is rendered in Arabic
    And table headers are rendered in Arabic
    And report code remains ASCII as "RPT-M08-ATT-001"
```

---

## 23. Feature: Validation and Error Boundaries

### Scenario Outline: Required IDs must be valid UUIDs

```gherkin
Feature: Attendance validation
  Scenario Outline: Invalid UUID input is rejected
    Given USER-ACADEMIC-MCT is authenticated
    When the user submits request field "<field>" with value "<value>"
    Then the request is rejected with HTTP status 422
    And the application error code is "ERR_VALIDATION_INVALID_UUID"

    Examples:
      | field               | value       |
      | attendanceSessionId | abc         |
      | attendanceRecordId  | 12345       |
      | enrollmentId        | not-a-uuid  |
      | branchId            | BR-MCT      |
```

### Scenario: Remarks length bound is enforced

```gherkin
Feature: Attendance validation
  Scenario: Attendance remarks cannot exceed configured maximum length
    Given USER-TRAINER-A is authenticated
    And AttendanceSession for SESSION-HSE-001 is editable
    When USER-TRAINER-A marks STUDENT-A as "Absent" with remarks containing 1001 characters
    Then the request is rejected with HTTP status 422
    And the application error code is "ERR_ATT_REMARKS_TOO_LONG"
```

### Scenario: Attendance date cannot differ from source session date without override

```gherkin
Feature: Attendance validation
  Scenario: Attendance date override requires permission
    Given USER-TRAINER-A is authenticated
    And USER-TRAINER-A does not have permission "attendance.session.overrideDate"
    When USER-TRAINER-A attempts to set attendanceDate different from source session date
    Then the request is rejected with HTTP status 403
    And the application error code is "ERR_ATT_DATE_OVERRIDE_DENIED"
```

### Scenario: Cancelled enrollment cannot be marked present

```gherkin
Feature: Attendance validation
  Scenario: Cancelled enrollment is excluded from marking
    Given STUDENT-C enrollment status is "Cancelled"
    And AttendanceSession exists for BATCH-HSE-001
    When roster generation runs
    Then no AttendanceRecord is created for STUDENT-C
    And USER-TRAINER-A cannot mark attendance for STUDENT-C in that session
```

---

## 24. Feature: Notifications

### Scenario: Notify trainer for pending attendance

```gherkin
Feature: Attendance notifications
  Scenario: Pending attendance reminder notification is queued
    Given AttendanceSession for SESSION-HSE-001 is pending beyond SLA
    And TRAINER-A is assigned to SESSION-HSE-001
    And TRAINER-A has a verified email or phone contact
    When the pending attendance detection job runs
    Then a NotificationRequest is created using template "ATT_PENDING_TRAINER_REMINDER"
    And the payload includes trainerName, courseName, batchCode, sessionDate, dueAt, and attendanceSessionUrl
```

### Scenario: Notify student for low attendance

```gherkin
Feature: Attendance notifications
  Scenario: Low attendance notification is queued for student
    Given STUDENT-A attendancePercentage is below required threshold
    And an AttendanceAlert is created with severity "Warning"
    When notification dispatch is requested
    Then a NotificationRequest is created using template "ATT_LOW_STUDENT_WARNING"
    And the payload includes studentName, courseName, batchCode, attendancePercentage, requiredPercentage, missedSessionCount, and branchContactNumber
```

### Scenario: Notify corporate coordinator for corporate participant low attendance

```gherkin
Feature: Attendance notifications
  Scenario: Corporate low attendance notification is scoped to corporate participants
    Given a corporate participant linked to CORP-001 has low attendance
    And CORP-001 primary contact has portalAccessEnabled true
    When low attendance notification dispatch runs
    Then a NotificationRequest is created using template "ATT_CORP_PARTICIPANT_LOW_ATTENDANCE"
    And the payload includes corporateAccountName, participantName, courseName, batchCode, attendancePercentage, requiredPercentage, and reportUrl
    And the payload does not include unrelated student data
```

---

## 25. Feature: API Error Response Shape

### Scenario: Validation error returns structured response

```gherkin
Feature: API error response
  Scenario: Invalid request returns error catalog code and field details
    Given USER-TRAINER-A is authenticated
    When USER-TRAINER-A submits an attendance marking request with invalid lateMinutes
    Then the response HTTP status is 422
    And the response body contains error.code "ERR_ATT_INVALID_LATE_MINUTES"
    And the response body contains error.message
    And the response body contains error.fieldErrors for "lateMinutes"
    And the response body contains correlationId
```

### Scenario: Unexpected error does not expose sensitive details

```gherkin
Feature: API error response
  Scenario: Internal server error is sanitized
    Given an unexpected database exception occurs during attendance summary recalculation
    When the API response is returned
    Then the response HTTP status is 500
    And the response body contains error.code "ERR_INTERNAL_SERVER_ERROR"
    And the response body does not include SQL text, stack trace, connection string, or secret values
    And the server logs include correlationId for troubleshooting
```

---

## 26. Feature: Dashboard Data Freshness

### Scenario: Dashboard indicates stale read model

```gherkin
Feature: Attendance dashboard freshness
  Scenario: Stale read model is flagged in dashboard response
    Given the student attendance summary read model lastCalculatedAt is older than allowed staleness threshold
    When USER-ACADEMIC-MCT opens the Attendance Operations Dashboard
    Then the dashboard response includes dataFreshness.isStale true
    And the UI displays a stale data warning
    And the system schedules or triggers a read model refresh within the modular monolith job mechanism
```

### Scenario: Read model refresh after correction approval

```gherkin
Feature: Attendance dashboard freshness
  Scenario: Correction approval refreshes affected summaries
    Given STUDENT-A AttendanceRecord is corrected from Absent to Present
    When the correction is approved
    Then v_student_attendance_summary is refreshed for STUDENT-A enrollment
    And v_completion_attendance_evidence is refreshed for STUDENT-A enrollment
    And dashboards show the updated percentage after refresh
```

---

## 27. Regression Test Matrix

| Test Area              | Positive Coverage                                    | Negative Coverage                                           | Boundary Coverage                               | Security Coverage                    |
| ---------------------- | ---------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------- | ------------------------------------ |
| Session initialization | Eligible conducted session creates AttendanceSession | Duplicate, cancelled, inaccessible branch rejected          | Source status boundary                          | Permission and branch guard          |
| Roster generation      | Active enrollments generate records                  | Locked session rejected                                     | New enrollment added after initial sync         | Branch guard                         |
| Marking                | Present, Absent, Late, Excused accepted              | Invalid status, unassigned trainer, locked session rejected | Late minutes min/max, remarks length            | Trainer assignment guard             |
| Bulk marking           | Unmarked records updated                             | Overwrite without permission rejected                       | Large roster page sizes                         | Permission guard                     |
| Submission             | Fully marked roster submitted                        | Unmarked records rejected                                   | Unmarked override with reason                   | Submit permission                    |
| Correction             | Request, approve, reject                             | Duplicate pending, missing reason, self approval rejected   | Locked override behavior                        | Approver permission and branch guard |
| Percentage             | Weighted calculation                                 | No official records                                         | Rounding and zero denominator                   | Student scope                        |
| Alerts                 | Warning and critical generated                       | Duplicate alert prevented                                   | Threshold boundary equal to required percentage | Notification payload scope           |
| Reports                | Export PDF/XLSX/CSV                                  | Unauthorized format rejected                                | Date range max                                  | Export audit and branch scope        |
| Student portal         | Own summary visible                                  | Other student denied                                        | No attendance not started                       | Self-scope guard                     |
| Corporate portal       | Own participants visible                             | Other account hidden                                        | Empty corporate data                            | Corporate scope guard                |
| Audit                  | Sensitive actions logged                             | Audit report access denied without permission               | Large audit export                              | PII masking and export reason        |

---

## 28. Minimum Automated Test Suite

### 28.1 Unit Tests

| Test ID    | Unit Under Test                        | Expected Coverage                                                        |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------ |
| UT-M08-001 | Attendance percentage calculator       | Present, Absent, Late, Excused, zero denominator, rounding               |
| UT-M08-002 | Low attendance severity resolver       | Warning, Critical, None, equal threshold boundary                        |
| UT-M08-003 | Branch scope resolver                  | Single branch, child branches, consolidated denied, consolidated allowed |
| UT-M08-004 | Trainer assignment guard               | Assigned session, assigned batch, unassigned denial, admin override      |
| UT-M08-005 | Attendance status transition validator | Draft, Submitted, Locked, Returned, Cancelled transitions                |
| UT-M08-006 | Correction approval validator          | Duplicate pending, self approval, locked override                        |
| UT-M08-007 | Report filter validator                | Date bounds, UUIDs, enum values, page size                               |
| UT-M08-008 | Export audit payload builder           | Filter summary, checksum, branch scope, user metadata                    |

### 28.2 Integration Tests

| Test ID    | Flow                                              | Expected Coverage                                          |
| ---------- | ------------------------------------------------- | ---------------------------------------------------------- |
| IT-M08-001 | Session initialization to roster generation       | Session creation, records creation, audit log              |
| IT-M08-002 | Mark attendance to final submission               | Record updates, submission, summary refresh                |
| IT-M08-003 | Correction approval                               | Correction status, record update, summary refresh, audit   |
| IT-M08-004 | Low attendance detection and notification request | Alert creation, duplicate prevention, notification payload |
| IT-M08-005 | Completion evidence read                          | Correct DTO and no certificate side effect                 |
| IT-M08-006 | Branch isolated reports                           | SQL filter prevents cross-branch rows                      |
| IT-M08-007 | Student self-service                              | Authenticated student scope only                           |
| IT-M08-008 | Corporate attendance report                       | Corporate account scope only                               |

### 28.3 End-to-End Tests

| Test ID     | User Journey                             | Expected Coverage                                                    |
| ----------- | ---------------------------------------- | -------------------------------------------------------------------- |
| E2E-M08-001 | Trainer marks and submits attendance     | UI roster, validation, save draft, submit, read-only submitted state |
| E2E-M08-002 | Academic coordinator approves correction | Correction queue, approve dialog, recalculated summary               |
| E2E-M08-003 | Student views own attendance             | Student portal summary and history, no mutation controls             |
| E2E-M08-004 | Branch admin exports report              | Dashboard drilldown, report filters, export, audit log               |
| E2E-M08-005 | Arabic attendance UI                     | RTL layout, Arabic labels, Arabic PDF headers                        |

---

## 29. Acceptance Exit Criteria

Module 08 Attendance Management is acceptable for this FRD part when all of the following are true:

1. All positive and negative scenarios for attendance session initialization, roster generation, marking, submission, locking, correction, and reporting pass.
2. Branch isolation tests prove that users cannot list, view, export, or modify attendance outside accessible branches.
3. Student self-service tests prove that students can read only their own attendance and cannot mutate records.
4. Trainer tests prove that trainers can mark only assigned sessions unless an admin override permission is granted.
5. Attendance percentages are calculated consistently across dashboard, reports, student portal, and completion evidence API.
6. Low attendance alerts are generated, updated, and resolved without duplicates.
7. Correction approvals update official records and preserve old/new values in audit logs.
8. Official submitted or locked attendance cannot be directly edited outside the defined correction workflow.
9. Report exports include generation metadata, branch scope, permission code, and audit logs.
10. Arabic UI and PDF rendering meet RTL and localized label requirements.
