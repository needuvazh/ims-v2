# Detailed API Contract Specification

## Module 12: Exam, Result & Completion APIs

**Version:** 1.0
**Base URL:** `/api/v1`
**Module Code:** `CMP`

---

# 1. Module Purpose

Exam, Result & Completion APIs manage the academic/training outcome of an enrollment.

This module supports:

* Exam creation
* Exam scheduling
* Result entry
* Result publication
* Completion eligibility evaluation
* Completion approval
* Completion rejection
* Walk-in completion
* Corporate completion tracking
* Student progress visibility
* Certificate eligibility trigger

---

# 2. Security Requirements

All Exam, Result & Completion APIs require authentication.

Protected APIs must enforce:

```text
Permission
Branch Scope
Course Scope
Batch Scope
Trainer Scope
Student Self Scope
Audit Logging
```

---

# 3. Exam APIs

## 3.1 Get Exams

```http
GET /api/v1/exams
```

### Permission

```text
EXAM_VIEW
```

### Query Parameters

```text
page
limit
search
branchId
courseId
batchId
examStatus
examDateFrom
examDateTo
sortBy
sortOrder
```

---

## 3.2 Create Exam

```http
POST /api/v1/exams
```

### Permission

```text
EXAM_CREATE
```

### Request

```json
{
  "courseId": "crs_001",
  "batchId": "bat_001",
  "examCode": "EXAM-2026-00001",
  "examName": "IOSH Final Assessment",
  "examDate": "2026-07-25",
  "maximumMarks": 100,
  "passingMarks": 70,
  "status": "Draft",
  "remarks": "Final batch exam"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Exam created successfully",
  "data": {
    "examId": "exam_001",
    "examCode": "EXAM-2026-00001",
    "examName": "IOSH Final Assessment",
    "status": "Draft"
  }
}
```

### Validations

```text
Course is required
Exam name is required
Exam date is required
Maximum marks must be greater than zero
Passing marks must be greater than or equal to zero
Passing marks cannot exceed maximum marks
```

### Business Rules

```text
Exam must belong to an active course
Exam may be linked to a batch
Course must allow exam-based completion if exam is mandatory
Exam code must be unique
Exam creation must be audited
```

### Audit

```text
ExamCreated
```

---

## 3.3 Get Exam Details

```http
GET /api/v1/exams/{examId}
```

### Permission

```text
EXAM_VIEW
```

---

## 3.4 Update Exam

```http
PATCH /api/v1/exams/{examId}
```

### Permission

```text
EXAM_EDIT
```

### Request

```json
{
  "examName": "IOSH Final Assessment Updated",
  "examDate": "2026-07-26",
  "maximumMarks": 100,
  "passingMarks": 70,
  "remarks": "Updated exam date"
}
```

### Business Rules

```text
Published exams cannot be edited without special permission
Exam marks cannot be changed after result publication without override permission
Changes must be audited
```

---

## 3.5 Schedule Exam

```http
POST /api/v1/exams/{examId}/schedule
```

### Permission

```text
EXAM_SCHEDULE
```

### Request

```json
{
  "examDate": "2026-07-26",
  "startTime": "10:00",
  "endTime": "12:00",
  "classroomId": "cls_001",
  "remarks": "Scheduled exam"
}
```

### Business Rules

```text
Scheduling conflict validation may be reused from Scheduling module
Scheduled exam should notify trainer/coordinator/students
```

---

## 3.6 Cancel Exam

```http
POST /api/v1/exams/{examId}/cancel
```

### Permission

```text
EXAM_CANCEL
```

### Request

```json
{
  "reason": "Exam postponed"
}
```

### Validations

```text
Reason is required
```

---

# 4. Result APIs

## 4.1 Get Exam Results

```http
GET /api/v1/exams/{examId}/results
```

### Permission

```text
RESULT_VIEW
```

---

## 4.2 Save Result Draft

```http
POST /api/v1/exams/{examId}/results/draft
```

### Permission

```text
RESULT_ENTRY
```

### Request

```json
{
  "results": [
    {
      "enrollmentId": "enr_001",
      "studentId": "std_001",
      "marksObtained": 85,
      "grade": "A",
      "remarks": "Passed"
    },
    {
      "enrollmentId": "enr_002",
      "studentId": "std_002",
      "marksObtained": 60,
      "grade": "C",
      "remarks": "Failed"
    }
  ]
}
```

### Validations

```text
Enrollment ID is required
Student ID is required
Marks obtained is required
Marks obtained cannot be negative
Marks obtained cannot exceed maximum marks
```

### Business Rules

```text
Only enrolled students for exam batch should be allowed
Result status should be calculated using passing marks
Draft results may be edited
Draft save must be audited
```

---

## 4.3 Publish Results

```http
POST /api/v1/exams/{examId}/publish-results
```

### Permission

```text
RESULT_PUBLISH
```

### Request

```json
{
  "remarks": "Results verified and published"
}
```

### Business Rules

```text
All required student results must be entered before publication
Published results become read-only
Result publication should trigger completion re-evaluation
Students may view published results
Publication must be audited
```

---

## 4.4 Update Published Result

```http
PATCH /api/v1/results/{resultId}/override
```

### Permission

```text
RESULT_OVERRIDE
```

### Request

```json
{
  "marksObtained": 88,
  "grade": "A",
  "reason": "Correction after review"
}
```

### Validations

```text
Reason is required
```

### Business Rules

```text
Published result changes require override permission
Old result must remain in audit history
Completion eligibility must be recalculated
```

---

# 5. Completion Evaluation APIs

## 5.1 Get Completion Records

```http
GET /api/v1/completions
```

### Permission

```text
COMPLETION_VIEW
```

### Query Parameters

```text
page
limit
branchId
courseId
batchId
studentId
completionStatus
eligibilityStatus
dateFrom
dateTo
sortBy
sortOrder
```

---

## 5.2 Evaluate Completion

```http
POST /api/v1/enrollments/{enrollmentId}/evaluate-completion
```

### Permission

```text
COMPLETION_EVALUATE
```

### Request

```json
{
  "remarks": "Evaluate after attendance and result update"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Completion evaluated successfully",
  "data": {
    "completionId": "cmp_001",
    "enrollmentId": "enr_001",
    "completionStatus": "Eligible",
    "eligibility": {
      "attendanceEligible": true,
      "examEligible": true,
      "feeCleared": true,
      "manualApprovalRequired": true,
      "certificateEligible": false
    }
  }
}
```

### Business Rules

```text
Evaluation must use course completion rules
Attendance percentage must come from Attendance module
Exam result must come from Result module if exam required
Fee clearance must come from Finance module if configured
Eligible completion may move to PendingApproval if manual approval is required
Evaluation must be audited
```

---

## 5.3 Bulk Evaluate Completion by Batch

```http
POST /api/v1/batches/{batchId}/evaluate-completion
```

### Permission

```text
COMPLETION_EVALUATE
```

### Request

```json
{
  "remarks": "Batch completion evaluation"
}
```

### Business Rules

```text
All active enrollments in batch should be evaluated
Failures should be reported per enrollment
Bulk operation must be audited
```

---

# 6. Completion Approval APIs

## 6.1 Approve Completion

```http
POST /api/v1/completions/{completionId}/approve
```

### Permission

```text
COMPLETION_APPROVE
```

### Request

```json
{
  "remarks": "Completion approved"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Completion approved successfully",
  "data": {
    "completionId": "cmp_001",
    "completionStatus": "Completed",
    "certificateEligibilityStatus": "Eligible"
  }
}
```

### Business Rules

```text
Only eligible or pending approval completion can be approved
Approval must follow configured approval workflow
Approval should update enrollment completion status
Approval should trigger certificate eligibility
Approval must be audited
```

---

## 6.2 Reject Completion

```http
POST /api/v1/completions/{completionId}/reject
```

### Permission

```text
COMPLETION_REJECT
```

### Request

```json
{
  "reason": "Attendance below required threshold"
}
```

### Validations

```text
Reason is required
```

### Business Rules

```text
Rejected completion must retain reason
Rejected completion may be re-evaluated after corrections
Rejection must be audited
```

---

## 6.3 Reopen Completion

```http
POST /api/v1/completions/{completionId}/reopen
```

### Permission

```text
COMPLETION_REOPEN
```

### Request

```json
{
  "reason": "Attendance correction approved"
}
```

### Business Rules

```text
Completed records require special permission to reopen
Certificate already issued should block reopen unless certificate is revoked/reissued workflow is handled
```

---

# 7. Walk-In Completion APIs

## 7.1 Create Walk-In Completion

```http
POST /api/v1/walk-in/completions
```

### Permission

```text
WALKIN_COMPLETION_CREATE
```

### Request

```json
{
  "studentId": "std_001",
  "courseId": "crs_001",
  "trainerId": "trn_001",
  "completionDate": "2026-06-19",
  "trainerApproval": true,
  "remarks": "Same-day walk-in completion"
}
```

### Business Rules

```text
Course must allow walk-in completion
Student must exist
Trainer approval is mandatory
Fee clearance may be required based on course rule
Walk-in completion must still create or reference an enrollment
Completion must be audited
```

---

# 8. Corporate Completion APIs

## 8.1 Get Corporate Program Completion

```http
GET /api/v1/corporate/programs/{programId}/completion
```

### Permission

```text
CORPORATE_COMPLETION_VIEW
```

### Query Parameters

```text
batchId
completionStatus
```

### Response

```json
{
  "success": true,
  "data": {
    "programId": "cprog_001",
    "programName": "HSE Training Program",
    "participants": [
      {
        "participantId": "cp_001",
        "employeeName": "Omar Khalid",
        "enrollmentId": "enr_001",
        "attendancePercentage": 90,
        "examStatus": "Passed",
        "feeClearance": true,
        "completionStatus": "Completed",
        "certificateEligibilityStatus": "Eligible"
      }
    ]
  }
}
```

---

## 8.2 Bulk Approve Corporate Completion

```http
POST /api/v1/corporate/programs/{programId}/completion/approve
```

### Permission

```text
CORPORATE_COMPLETION_APPROVE
```

### Request

```json
{
  "enrollmentIds": ["enr_001", "enr_002"],
  "remarks": "Corporate participants approved"
}
```

---

# 9. Student Progress APIs

## 9.1 Get Student Progress

```http
GET /api/v1/students/{studentId}/progress
```

### Permission

```text
STUDENT_PROGRESS_VIEW
```

### Query Parameters

```text
enrollmentId
```

### Response

```json
{
  "success": true,
  "data": {
    "studentId": "std_001",
    "enrollmentId": "enr_001",
    "courseName": "IOSH Managing Safely",
    "attendancePercentage": 90,
    "examResult": "Passed",
    "feeCleared": true,
    "completionStatus": "Completed",
    "certificateEligibilityStatus": "Eligible"
  }
}
```

---

## 9.2 Student Portal Progress

```http
GET /api/v1/student-portal/me/progress
```

### Permission

```text
Authenticated Student
```

---

# 10. Completion Rule Check API

## 10.1 Preview Completion Eligibility

```http
POST /api/v1/enrollments/{enrollmentId}/completion-preview
```

### Permission

```text
COMPLETION_VIEW
```

### Response

```json
{
  "success": true,
  "data": {
    "attendanceRule": {
      "required": true,
      "minimumPercentage": 80,
      "actualPercentage": 90,
      "passed": true
    },
    "examRule": {
      "required": true,
      "score": 85,
      "passingMarks": 70,
      "passed": true
    },
    "feeRule": {
      "required": true,
      "dueAmount": 0,
      "passed": true
    },
    "overallEligibility": "Eligible"
  }
}
```

---

# 11. Business Error Examples

## Completion Not Eligible

```json
{
  "success": false,
  "error": {
    "code": "COMPLETION_NOT_ELIGIBLE",
    "message": "Student does not meet completion eligibility requirements",
    "details": {
      "attendanceEligible": false,
      "examEligible": true,
      "feeCleared": true
    }
  }
}
```

## Result Already Published

```json
{
  "success": false,
  "error": {
    "code": "RESULT_ALREADY_PUBLISHED",
    "message": "Published results cannot be modified without override permission"
  }
}
```

## Certificate Already Issued

```json
{
  "success": false,
  "error": {
    "code": "CERTIFICATE_ALREADY_ISSUED",
    "message": "Completion cannot be reopened after certificate issuance"
  }
}
```

---

# 12. Events Published

```text
ExamCreated
ExamUpdated
ExamScheduled
ExamCancelled
ResultDraftSaved
ResultsPublished
PublishedResultOverridden
CompletionEvaluated
BatchCompletionEvaluated
CompletionApproved
CompletionRejected
CompletionReopened
WalkInCompletionCreated
CorporateCompletionApproved
CertificateEligibilityApproved
```

---

# 13. Audit Requirements

Audit must capture:

```text
Exam create/update/schedule/cancel
Result draft save
Result publication
Published result override
Completion evaluation
Completion approval/rejection/reopen
Walk-in completion
Corporate completion approval
Certificate eligibility changes
```

---

# 14. Integration Points

Consumes:

```text
Enrollment
Attendance
Finance Fee Clearance
Course Completion Rules
Student Management
Corporate Training
Trainer Management
```

Provides data to:

```text
Certificate Management
Student Portal
Corporate Reports
Reporting
Audit
Future AI Analytics
```

---
