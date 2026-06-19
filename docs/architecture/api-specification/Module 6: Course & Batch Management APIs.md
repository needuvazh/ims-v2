# Detailed API Contract Specification

## Module 6: Course & Batch Management APIs

**Version:** 1.0
**Base URL:** `/api/v1`
**Module Code:** `CRS`

---

# 1. Module Purpose

Course & Batch Management APIs manage the training catalog and executable batches.

This module supports:

* Course creation and maintenance
* Course pricing
* Course completion rules
* Batch creation and lifecycle
* Batch capacity validation
* Waiting list support
* Trainer assignment
* Course and batch lookup APIs

---

# 2. Security Requirements

All Course & Batch APIs require authentication.

Protected APIs must enforce:

```text
Permission
Branch Scope
Department Scope
Audit Logging
```

---

# 3. Course APIs

## 3.1 Get Courses

```http
GET /api/v1/courses
```

### Permission

```text
COURSE_VIEW
```

### Query Parameters

```text
page
limit
search
branchId
departmentId
courseType
durationType
status
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
        "id": "crs_001",
        "courseCode": "IOSH",
        "courseName": "IOSH Managing Safely",
        "departmentName": "Safety Training",
        "courseType": "Individual",
        "durationType": "Hours",
        "durationValue": 40,
        "status": "Active"
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

## 3.2 Create Course

```http
POST /api/v1/courses
```

### Permission

```text
COURSE_CREATE
```

### Request

```json
{
  "departmentId": "dep_001",
  "courseCode": "IOSH",
  "courseName": "IOSH Managing Safely",
  "description": "Safety management course",
  "courseType": "Individual",
  "durationType": "Hours",
  "durationValue": 40,
  "allowDirectEnrollment": true,
  "allowWaitingList": true,
  "allowWalkInCompletion": false,
  "allowCorporateEnrollment": true,
  "status": "Draft"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Course created successfully",
  "data": {
    "id": "crs_001",
    "courseCode": "IOSH",
    "courseName": "IOSH Managing Safely",
    "status": "Draft"
  }
}
```

### Validations

```text
Department is required
Course code is required
Course name is required
Course type is required
Duration type is required
Duration value is required
Duration value must be greater than zero
```

### Business Rules

```text
Course code must be unique
Course name must be unique within department
Course must belong to active department
Inactive courses cannot accept new enrollments
Archived courses remain available for reports
```

### Audit

```text
CourseCreated
```

---

## 3.3 Get Course Details

```http
GET /api/v1/courses/{courseId}
```

### Permission

```text
COURSE_VIEW
```

---

## 3.4 Update Course

```http
PATCH /api/v1/courses/{courseId}
```

### Permission

```text
COURSE_EDIT
```

### Request

```json
{
  "courseName": "IOSH Managing Safely Updated",
  "description": "Updated course description",
  "durationType": "Hours",
  "durationValue": 40,
  "allowDirectEnrollment": true,
  "allowWaitingList": true,
  "allowWalkInCompletion": false,
  "allowCorporateEnrollment": true,
  "status": "Active"
}
```

### Business Rules

```text
Existing enrollments should not be modified by course updates
Course code should not be changed through normal update
Major curriculum changes may require future course versioning
```

### Audit

```text
CourseUpdated
```

---

## 3.5 Activate Course

```http
POST /api/v1/courses/{courseId}/activate
```

### Permission

```text
COURSE_ACTIVATE
```

---

## 3.6 Deactivate Course

```http
POST /api/v1/courses/{courseId}/deactivate
```

### Permission

```text
COURSE_DEACTIVATE
```

### Request

```json
{
  "reason": "Course temporarily unavailable"
}
```

### Validations

```text
Reason is required
```

---

## 3.7 Archive Course

```http
POST /api/v1/courses/{courseId}/archive
```

### Permission

```text
COURSE_ARCHIVE
```

### Request

```json
{
  "reason": "Course retired"
}
```

---

# 4. Course Pricing APIs

## 4.1 Get Course Pricing

```http
GET /api/v1/courses/{courseId}/pricing
```

### Permission

```text
COURSE_PRICING_VIEW
```

### Query Parameters

```text
branchId
customerType
batchType
currency
status
```

---

## 4.2 Create Course Pricing

```http
POST /api/v1/courses/{courseId}/pricing
```

### Permission

```text
COURSE_PRICING_CREATE
```

### Request

```json
{
  "branchId": "br_001",
  "customerType": "Individual",
  "batchType": "Weekend",
  "currency": "OMR",
  "baseAmount": 100,
  "taxApplicable": true,
  "taxPercentage": 5,
  "effectiveStartDate": "2026-06-19",
  "effectiveEndDate": null,
  "status": "Active"
}
```

### Validations

```text
Branch is required
Customer type is required
Currency is required
Base amount must be greater than or equal to zero
Tax percentage cannot be negative
Effective start date is required
```

### Business Rules

```text
Only one active pricing record per course, branch, customer type, batch type, and currency combination
Pricing changes must not affect existing enrollments
Historical pricing must be preserved
```

### Audit

```text
CoursePricingCreated
```

---

## 4.3 Update Course Pricing

```http
PATCH /api/v1/course-pricing/{pricingId}
```

### Permission

```text
COURSE_PRICING_EDIT
```

### Business Rules

```text
If pricing is already used by enrollment, update should create new pricing version instead of overwriting
```

---

## 4.4 Deactivate Course Pricing

```http
POST /api/v1/course-pricing/{pricingId}/deactivate
```

### Permission

```text
COURSE_PRICING_DEACTIVATE
```

---

# 5. Course Completion Rule APIs

## 5.1 Get Course Completion Rules

```http
GET /api/v1/courses/{courseId}/completion-rules
```

### Permission

```text
COURSE_COMPLETION_RULE_VIEW
```

---

## 5.2 Create / Update Course Completion Rule

```http
POST /api/v1/courses/{courseId}/completion-rules
```

### Permission

```text
COURSE_COMPLETION_RULE_EDIT
```

### Request

```json
{
  "completionType": "ExamAndAttendance",
  "minimumAttendancePercentage": 80,
  "examRequired": true,
  "manualApprovalRequired": true,
  "feeClearanceRequired": true,
  "certificateEligible": true,
  "status": "Active"
}
```

### Validations

```text
Completion type is required
Minimum attendance percentage must be between 0 and 100
If examRequired is true, exam configuration must be allowed
```

### Business Rules

```text
Only one active completion rule per course
Completion rule changes must not retroactively affect completed enrollments
Completion rules are used by Completion and Certificate modules
```

### Audit

```text
CourseCompletionRuleUpdated
```

---

# 6. Batch APIs

## 6.1 Get Batches

```http
GET /api/v1/batches
```

### Permission

```text
BATCH_VIEW
```

### Query Parameters

```text
page
limit
search
branchId
courseId
trainerId
batchStatus
startDateFrom
startDateTo
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
        "id": "bat_001",
        "batchCode": "IOSH-JAN-2026-MORNING",
        "batchName": "IOSH January Morning Batch",
        "courseName": "IOSH Managing Safely",
        "branchName": "Muscat Branch",
        "startDate": "2026-01-05",
        "endDate": "2026-01-25",
        "capacity": 25,
        "currentEnrollment": 20,
        "availableSeats": 5,
        "batchStatus": "OpenForEnrollment"
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

## 6.2 Create Batch

```http
POST /api/v1/batches
```

### Permission

```text
BATCH_CREATE
```

### Request

```json
{
  "courseId": "crs_001",
  "branchId": "br_001",
  "batchCode": "IOSH-JAN-2026-MORNING",
  "batchName": "IOSH January Morning Batch",
  "startDate": "2026-01-05",
  "endDate": "2026-01-25",
  "capacity": 25,
  "waitingListEnabled": true,
  "allowOverbooking": false,
  "openEnrollmentDate": "2025-12-01",
  "closeEnrollmentDate": "2026-01-04",
  "batchStatus": "Draft"
}
```

### Validations

```text
Course is required
Branch is required
Batch code is required
Batch name is required
Start date is required
End date is required
End date cannot be before start date
Capacity must be greater than zero
```

### Business Rules

```text
Batch code must be unique
Batch must belong to active course
Batch must belong to active branch
Enrollment is allowed only when batch is OpenForEnrollment
Capacity validation is required during enrollment
```

### Audit

```text
BatchCreated
```

---

## 6.3 Get Batch Details

```http
GET /api/v1/batches/{batchId}
```

### Permission

```text
BATCH_VIEW
```

---

## 6.4 Update Batch

```http
PATCH /api/v1/batches/{batchId}
```

### Permission

```text
BATCH_EDIT
```

### Request

```json
{
  "batchName": "IOSH January Updated Morning Batch",
  "startDate": "2026-01-06",
  "endDate": "2026-01-26",
  "capacity": 30,
  "waitingListEnabled": true,
  "allowOverbooking": false
}
```

### Business Rules

```text
Capacity cannot be reduced below current enrollment count unless authorized
Date changes may impact schedule sessions
Changes must be audited
```

---

## 6.5 Open Enrollment

```http
POST /api/v1/batches/{batchId}/open-enrollment
```

### Permission

```text
BATCH_OPEN_ENROLLMENT
```

### Business Rules

```text
Batch status changes to OpenForEnrollment
Course and branch must be active
```

---

## 6.6 Close Enrollment

```http
POST /api/v1/batches/{batchId}/close-enrollment
```

### Permission

```text
BATCH_CLOSE_ENROLLMENT
```

---

## 6.7 Complete Batch

```http
POST /api/v1/batches/{batchId}/complete
```

### Permission

```text
BATCH_COMPLETE
```

### Request

```json
{
  "remarks": "Training completed successfully"
}
```

### Business Rules

```text
Batch cannot be completed if active sessions are pending unless override permission exists
Completion must be audited
```

---

## 6.8 Cancel Batch

```http
POST /api/v1/batches/{batchId}/cancel
```

### Permission

```text
BATCH_CANCEL
```

### Request

```json
{
  "reason": "Insufficient enrollment"
}
```

### Validations

```text
Reason is required
```

---

# 7. Batch Trainer APIs

## 7.1 Assign Trainer to Batch

```http
POST /api/v1/batches/{batchId}/assign-trainer
```

### Permission

```text
BATCH_ASSIGN_TRAINER
```

### Request

```json
{
  "trainerId": "trn_001",
  "trainerRole": "PrimaryTrainer",
  "assignedFrom": "2026-01-05",
  "assignedTo": "2026-01-25"
}
```

### Validations

```text
Trainer is required
Trainer role is required
Assigned from date is required
Assigned to date is required
```

### Business Rules

```text
Trainer must be active
Trainer must be authorized for the course where configured
Trainer assignment must not conflict with existing assignments
Multiple trainers per batch allowed
```

### Audit

```text
TrainerAssignedToBatch
```

---

## 7.2 Get Batch Trainers

```http
GET /api/v1/batches/{batchId}/trainers
```

### Permission

```text
BATCH_VIEW
```

---

## 7.3 Remove Trainer from Batch

```http
DELETE /api/v1/batches/{batchId}/trainers/{trainerAssignmentId}
```

### Permission

```text
BATCH_ASSIGN_TRAINER
```

### Business Rules

```text
Removal must be audited
Trainer cannot be removed from completed historical sessions without special permission
```

---

# 8. Batch Students APIs

## 8.1 Get Batch Students

```http
GET /api/v1/batches/{batchId}/students
```

### Permission

```text
BATCH_STUDENT_VIEW
```

### Query Parameters

```text
page
limit
status
search
```

---

## 8.2 Get Batch Capacity Summary

```http
GET /api/v1/batches/{batchId}/capacity
```

### Permission

```text
BATCH_VIEW
```

### Response

```json
{
  "success": true,
  "data": {
    "batchId": "bat_001",
    "capacity": 25,
    "currentEnrollment": 20,
    "availableSeats": 5,
    "waitingListEnabled": true,
    "waitingListCount": 3,
    "capacityReached": false
  }
}
```

---

# 9. Waiting List APIs

## 9.1 Get Batch Waiting List

```http
GET /api/v1/batches/{batchId}/waiting-list
```

### Permission

```text
WAITING_LIST_VIEW
```

---

## 9.2 Add Lead or Student to Waiting List

```http
POST /api/v1/batches/{batchId}/waiting-list
```

### Permission

```text
WAITING_LIST_CREATE
```

### Request

```json
{
  "studentId": "std_001",
  "leadId": null,
  "priority": "Normal",
  "remarks": "Interested in this batch"
}
```

### Business Rules

```text
Either studentId or leadId is required
Waiting list must be enabled
Duplicate waiting list entry for same student/lead and batch must be prevented
```

---

## 9.3 Promote Waiting List Entry

```http
POST /api/v1/waiting-list/{waitingListId}/promote
```

### Permission

```text
WAITING_LIST_PROMOTE
```

### Request

```json
{
  "remarks": "Seat available"
}
```

### Business Rules

```text
Capacity must be validated before promotion
Promotion may create enrollment or prepare enrollment draft
```

---

# 10. Course & Batch Lookup APIs

## 10.1 Active Courses Lookup

```http
GET /api/v1/lookups/courses
```

### Query Parameters

```text
branchId
departmentId
courseType
```

---

## 10.2 Active Batches Lookup

```http
GET /api/v1/lookups/batches
```

### Query Parameters

```text
branchId
courseId
openForEnrollment
```

---

## 10.3 Course Pricing Lookup

```http
GET /api/v1/lookups/course-pricing
```

### Query Parameters

```text
courseId
branchId
customerType
batchType
currency
```

---

# 11. Business Error Examples

## Duplicate Course Code

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_RECORD",
    "message": "Course code already exists"
  }
}
```

## Batch Capacity Invalid

```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Batch capacity cannot be less than current enrollment count"
  }
}
```

## Trainer Conflict

```json
{
  "success": false,
  "error": {
    "code": "TRAINER_CONFLICT",
    "message": "Trainer is already assigned during this period"
  }
}
```

---

# 12. Events Published

```text
CourseCreated
CourseUpdated
CourseActivated
CourseDeactivated
CourseArchived
CoursePricingCreated
CoursePricingUpdated
CourseCompletionRuleUpdated
BatchCreated
BatchUpdated
BatchOpenedForEnrollment
BatchClosedForEnrollment
BatchCompleted
BatchCancelled
TrainerAssignedToBatch
TrainerRemovedFromBatch
BatchCapacityReached
StudentAddedToWaitingList
WaitingListPromoted
```

---

# 13. Audit Requirements

Audit must capture:

```text
Course create/update/activate/deactivate/archive
Pricing create/update/deactivate
Completion rule changes
Batch create/update/status changes
Trainer assignment/removal
Waiting list changes
```

---

# 14. Integration Points

Consumes:

```text
Organization Management
Trainer Management
Identity & Access
```

Provides data to:

```text
Admissions & Enrollment
Scheduling
Attendance
Finance
Completion
Certificates
Corporate Training
Reporting
```

---
