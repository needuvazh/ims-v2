# Detailed API Contract Specification

## Module 4: Admission & Enrollment APIs

**Version:** 1.0
**Base URL:** `/api/v1`
**Module Code:** `ADM`

---

# 1. Module Purpose

Admission & Enrollment APIs manage the transition from lead or direct registration into student enrollment.

This module supports:

* Admission creation
* Admission approval
* Admission rejection
* Direct admission
* Lead-to-admission conversion
* Enrollment creation
* Batch assignment
* Waiting list handling
* Enrollment lifecycle
* Fee account creation trigger
* Attendance and completion readiness

---

# 2. Security Requirements

All APIs require authentication.

Protected APIs must enforce:

```text
Permission
Branch Scope
Student Data Scope
Enrollment Ownership
Audit Logging
```

---

# 3. Admission APIs

## 3.1 Get Admissions

```http
GET /api/v1/admissions
```

### Permission

```text
ADMISSION_VIEW
```

### Query Parameters

```text
page
limit
search
branchId
courseId
admissionStatus
createdBy
admissionDateFrom
admissionDateTo
sortBy
sortOrder
```

---

## 3.2 Create Admission

```http
POST /api/v1/admissions
```

### Permission

```text
ADMISSION_CREATE
```

### Request

```json
{
  "leadId": "lead_001",
  "branchId": "br_001",
  "admissionDate": "2026-06-19",
  "student": {
    "firstName": "Ahmed",
    "lastName": "Ali",
    "gender": "Male",
    "dateOfBirth": "1998-05-10",
    "phone": "+96890000000",
    "email": "ahmed@example.com",
    "nationality": "Omani",
    "address": "Muscat, Oman"
  },
  "courseId": "crs_001",
  "preferredBatchId": "bat_001",
  "remarks": "Admission from lead conversion"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Admission created successfully",
  "data": {
    "admissionId": "adm_001",
    "admissionNumber": "ADM-2026-00001",
    "studentId": "std_001",
    "admissionStatus": "Draft"
  }
}
```

### Validations

```text
Branch is required
Admission date is required
Student first name is required
Phone is required
Course is required
Email must be valid if provided
```

### Business Rules

```text
Admission number must be auto-generated
Duplicate student warning required for same phone/email/identity
Lead reference is optional for direct admission
Admission can be created as Draft
Student profile may be created during admission
```

### Audit

```text
AdmissionCreated
```

---

## 3.3 Get Admission Details

```http
GET /api/v1/admissions/{admissionId}
```

### Permission

```text
ADMISSION_VIEW
```

---

## 3.4 Update Admission

```http
PATCH /api/v1/admissions/{admissionId}
```

### Permission

```text
ADMISSION_EDIT
```

### Request

```json
{
  "admissionDate": "2026-06-20",
  "courseId": "crs_002",
  "preferredBatchId": "bat_002",
  "remarks": "Changed preferred course"
}
```

### Business Rules

```text
Approved admissions cannot be edited except by authorized users
Rejected admissions cannot be edited unless reopened
Changes must be audited
```

---

## 3.5 Approve Admission

```http
POST /api/v1/admissions/{admissionId}/approve
```

### Permission

```text
ADMISSION_APPROVE
```

### Request

```json
{
  "remarks": "Documents verified and admission approved"
}
```

### Business Rules

```text
Only pending admissions can be approved
Approval must be audited
Approved admission becomes eligible for enrollment
```

---

## 3.6 Reject Admission

```http
POST /api/v1/admissions/{admissionId}/reject
```

### Permission

```text
ADMISSION_REJECT
```

### Request

```json
{
  "reason": "Required documents not provided",
  "remarks": "Student may reapply later"
}
```

### Validations

```text
Reason is required
```

---

## 3.7 Cancel Admission

```http
POST /api/v1/admissions/{admissionId}/cancel
```

### Permission

```text
ADMISSION_CANCEL
```

### Request

```json
{
  "reason": "Student withdrew application"
}
```

---

# 4. Enrollment APIs

## 4.1 Get Enrollments

```http
GET /api/v1/enrollments
```

### Permission

```text
ENROLLMENT_VIEW
```

### Query Parameters

```text
page
limit
search
branchId
studentId
courseId
batchId
enrollmentType
enrollmentStatus
dateFrom
dateTo
sortBy
sortOrder
```

---

## 4.2 Create Enrollment

```http
POST /api/v1/enrollments
```

### Permission

```text
ENROLLMENT_CREATE
```

### Request

```json
{
  "studentId": "std_001",
  "admissionId": "adm_001",
  "branchId": "br_001",
  "courseId": "crs_001",
  "batchId": "bat_001",
  "enrollmentType": "Regular",
  "enrollmentDate": "2026-06-19",
  "remarks": "Regular student enrollment"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Enrollment created successfully",
  "data": {
    "enrollmentId": "enr_001",
    "enrollmentNumber": "ENR-2026-00001",
    "studentId": "std_001",
    "courseId": "crs_001",
    "batchId": "bat_001",
    "enrollmentStatus": "Draft",
    "feeAccountCreated": true
  }
}
```

### Validations

```text
Student is required
Branch is required
Course is required
Batch is required
Enrollment type is required
Enrollment date is required
```

### Business Rules

```text
Student must be active or admitted
Course must be active
Batch must be open for enrollment
Batch capacity must be validated
Enrollment number must be auto-generated
Enrollment creation must trigger fee account creation
Enrollment must become available for scheduling, attendance, completion, and certificate modules
```

### Audit

```text
EnrollmentCreated
```

---

## 4.3 Get Enrollment Details

```http
GET /api/v1/enrollments/{enrollmentId}
```

### Permission

```text
ENROLLMENT_VIEW
```

### Response Includes

```text
Enrollment Summary
Student Details
Course Details
Batch Details
Fee Summary
Attendance Summary
Completion Status
Certificate Status
Audit History
```

---

## 4.4 Update Enrollment

```http
PATCH /api/v1/enrollments/{enrollmentId}
```

### Permission

```text
ENROLLMENT_EDIT
```

### Request

```json
{
  "batchId": "bat_002",
  "remarks": "Batch changed before activation"
}
```

### Business Rules

```text
Only Draft or Pending Fee enrollments can be updated normally
Active enrollment update requires special permission
Batch capacity validation required if batch changes
Changes must be audited
```

---

## 4.5 Confirm Enrollment

```http
POST /api/v1/enrollments/{enrollmentId}/confirm
```

### Permission

```text
ENROLLMENT_CONFIRM
```

### Request

```json
{
  "remarks": "Enrollment confirmed after verification"
}
```

### Business Rules

```text
Enrollment must have valid student, course, and batch
Fee account must exist
Enrollment status changes to Confirmed
```

---

## 4.6 Activate Enrollment

```http
POST /api/v1/enrollments/{enrollmentId}/activate
```

### Permission

```text
ENROLLMENT_ACTIVATE
```

### Business Rules

```text
Confirmed enrollment can be activated
Active enrollment appears in attendance and timetable
Student status may become Active
```

---

## 4.7 Drop Enrollment

```http
POST /api/v1/enrollments/{enrollmentId}/drop
```

### Permission

```text
ENROLLMENT_DROP
```

### Request

```json
{
  "reason": "Student discontinued training",
  "dropDate": "2026-07-01"
}
```

### Validations

```text
Reason is required
Drop date is required
```

### Business Rules

```text
Dropped enrollment remains visible historically
Dropped enrollment cannot receive new attendance
Fee/refund handling must be done through Finance module
```

---

## 4.8 Cancel Enrollment

```http
POST /api/v1/enrollments/{enrollmentId}/cancel
```

### Permission

```text
ENROLLMENT_CANCEL
```

### Request

```json
{
  "reason": "Enrollment created by mistake"
}
```

---

# 5. Waiting List APIs

## 5.1 Add to Waiting List

```http
POST /api/v1/waiting-list
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
  "courseId": "crs_001",
  "batchId": "bat_001",
  "priority": "Normal",
  "remarks": "Batch is full"
}
```

### Business Rules

```text
Waiting list allowed only if enabled for course or batch
Either studentId or leadId is required
Duplicate waiting list entry for same course/batch should be prevented
```

---

## 5.2 Get Waiting List

```http
GET /api/v1/waiting-list
```

### Permission

```text
WAITING_LIST_VIEW
```

### Query Parameters

```text
branchId
courseId
batchId
status
```

---

## 5.3 Promote Waiting List Entry

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
  "batchId": "bat_001",
  "remarks": "Seat became available"
}
```

### Business Rules

```text
Batch capacity must be checked again
Promotion may create enrollment
Promotion action must be audited
```

---

## 5.4 Remove from Waiting List

```http
POST /api/v1/waiting-list/{waitingListId}/remove
```

### Permission

```text
WAITING_LIST_REMOVE
```

### Request

```json
{
  "reason": "Student no longer interested"
}
```

---

# 6. Direct Admission API

## 6.1 Create Direct Admission with Enrollment

```http
POST /api/v1/admissions/direct-enrollment
```

### Permission

```text
ADMISSION_CREATE
ENROLLMENT_CREATE
```

### Request

```json
{
  "branchId": "br_001",
  "admissionDate": "2026-06-19",
  "student": {
    "firstName": "Fatima",
    "lastName": "Khalid",
    "phone": "+96891111111",
    "email": "fatima@example.com",
    "nationality": "Omani"
  },
  "courseId": "crs_001",
  "batchId": "bat_001",
  "enrollmentType": "Regular",
  "remarks": "Walk-in registration"
}
```

### Business Rules

```text
Creates admission, student, enrollment, and fee account in one transaction
If any step fails, the full transaction must rollback
```

---

# 7. Corporate Participant Enrollment API

## 7.1 Enroll Corporate Participant

```http
POST /api/v1/corporate/participants/{participantId}/enroll
```

### Permission

```text
CORPORATE_PARTICIPANT_ENROLL
```

### Request

```json
{
  "corporateProgramId": "cprog_001",
  "branchId": "br_001",
  "courseId": "crs_001",
  "batchId": "bat_001",
  "enrollmentDate": "2026-06-19"
}
```

### Business Rules

```text
Corporate participant may optionally link to student profile
Enrollment type must be Corporate
Billing must follow corporate contract rules
```

---

# 8. Enrollment Status APIs

## 8.1 Change Enrollment Status

```http
POST /api/v1/enrollments/{enrollmentId}/change-status
```

### Permission

```text
ENROLLMENT_STATUS_CHANGE
```

### Request

```json
{
  "newStatus": "Suspended",
  "reason": "Pending fee clearance"
}
```

### Business Rules

```text
Invalid lifecycle transitions must be rejected
Reason required for negative statuses
Status change must be audited
```

---

# 9. Enrollment Summary APIs

## 9.1 Student Enrollment Summary

```http
GET /api/v1/students/{studentId}/enrollment-summary
```

### Permission

```text
STUDENT_VIEW
```

---

## 9.2 Batch Enrollment Summary

```http
GET /api/v1/batches/{batchId}/enrollment-summary
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
    "activeEnrollments": 20,
    "availableSeats": 5,
    "waitingListCount": 3
  }
}
```

---

# 10. Business Error Examples

## Batch Full

```json
{
  "success": false,
  "error": {
    "code": "BATCH_CAPACITY_REACHED",
    "message": "Batch capacity has been reached",
    "details": {
      "batchId": "bat_001",
      "capacity": 25,
      "currentEnrollment": 25,
      "waitingListAvailable": true
    }
  }
}
```

## Invalid Enrollment Transition

```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Enrollment cannot move from Completed to Draft"
  }
}
```

## Inactive Course

```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Cannot enroll student into inactive course"
  }
}
```

---

# 11. Events Published

```text
AdmissionCreated
AdmissionApproved
AdmissionRejected
AdmissionCancelled
StudentCreatedFromAdmission
EnrollmentCreated
EnrollmentConfirmed
EnrollmentActivated
EnrollmentDropped
EnrollmentCancelled
EnrollmentStatusChanged
FeeAccountCreationRequested
StudentAddedToWaitingList
WaitingListPromoted
CorporateParticipantEnrolled
```

---

# 12. Audit Requirements

Audit must capture:

```text
Admission create/update/approve/reject/cancel
Enrollment create/update/confirm/activate/drop/cancel
Waiting list add/promote/remove
Corporate participant enrollment
Status changes
Direct admission transaction
```

---

# 13. Integration Points

Consumes:

```text
CRM
Student Management
Course & Batch
Corporate Training
Identity & Access
```

Provides data to:

```text
Finance
Attendance
Scheduling
Completion
Certificate
Reporting
Audit
```

---

