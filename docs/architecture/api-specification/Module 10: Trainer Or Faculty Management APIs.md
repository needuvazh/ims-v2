# Detailed API Contract Specification

## Module 10: Trainer / Faculty Management APIs

**Version:** 1.0
**Base URL:** `/api/v1`
**Module Code:** `TRN`

---

# 1. Module Purpose

Trainer / Faculty Management APIs manage trainer profiles, qualifications, documents, availability, assignments, course authorization, trainer timetable, and trainer utilization.

This module supports:

* Trainer profile management
* Trainer classification
* Trainer qualification tracking
* Trainer certification tracking
* Trainer document references
* Trainer availability
* Trainer-course authorization
* Trainer assignments
* Trainer utilization reporting
* Trainer portal APIs

---

# 2. Security Requirements

All Trainer APIs require authentication.

Protected APIs must enforce:

```text
Permission
Branch Scope
Trainer Self Scope
Course Scope
Audit Logging
```

---

# 3. Trainer APIs

## 3.1 Get Trainers

```http
GET /api/v1/trainers
```

### Permission

```text
TRAINER_VIEW
```

### Query Parameters

```text
page
limit
search
branchId
trainerType
status
courseId
availabilityStatus
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
        "id": "trn_001",
        "trainerCode": "TRN-2026-00001",
        "fullName": "Ahmed Trainer",
        "trainerType": "FullTime",
        "primarySpecialization": "Safety Training",
        "email": "trainer@example.com",
        "phone": "+96890000000",
        "branchName": "Muscat Branch",
        "status": "Active",
        "activeAssignmentCount": 2
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

## 3.2 Create Trainer

```http
POST /api/v1/trainers
```

### Permission

```text
TRAINER_CREATE
```

### Request

```json
{
  "firstName": "Ahmed",
  "middleName": "",
  "lastName": "Trainer",
  "gender": "Male",
  "dateOfBirth": "1985-05-10",
  "nationality": "Omani",
  "photoUrl": null,
  "mobileNumber": "+96890000000",
  "alternateNumber": "+96891111111",
  "email": "trainer@example.com",
  "address": {
    "country": "Oman",
    "city": "Muscat",
    "area": "Ruwi",
    "streetAddress": "Street 1",
    "postalCode": "100"
  },
  "trainerType": "FullTime",
  "primarySpecialization": "Safety Training",
  "yearsOfExperience": 8,
  "joiningDate": "2026-06-19",
  "branchIds": ["br_001"],
  "status": "Active"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Trainer created successfully",
  "data": {
    "id": "trn_001",
    "trainerCode": "TRN-2026-00001",
    "fullName": "Ahmed Trainer",
    "status": "Active"
  }
}
```

### Validations

```text
First name is required
Mobile number is required
Trainer type is required
Primary specialization is required
Email must be valid if provided
Years of experience cannot be negative
At least one branch is required
```

### Business Rules

```text
Trainer code must be auto-generated
Trainer code must be unique
Email must be unique if provided
Trainer may belong to multiple branches
Trainer may be authorized for multiple courses
Trainer creation must be audited
```

### Audit

```text
TrainerCreated
```

---

## 3.3 Get Trainer Details

```http
GET /api/v1/trainers/{trainerId}
```

### Permission

```text
TRAINER_VIEW
```

---

## 3.4 Update Trainer

```http
PATCH /api/v1/trainers/{trainerId}
```

### Permission

```text
TRAINER_EDIT
```

### Request

```json
{
  "firstName": "Ahmed",
  "lastName": "Trainer Updated",
  "mobileNumber": "+96892222222",
  "email": "trainer.updated@example.com",
  "trainerType": "PartTime",
  "primarySpecialization": "HSE Training",
  "yearsOfExperience": 9,
  "branchIds": ["br_001", "br_002"],
  "status": "Active"
}
```

### Business Rules

```text
Trainer code cannot be edited
Trainer profile changes must be audited
Inactive trainers cannot be assigned to new batches or sessions
```

---

# 4. Trainer Status APIs

## 4.1 Activate Trainer

```http
POST /api/v1/trainers/{trainerId}/activate
```

### Permission

```text
TRAINER_ACTIVATE
```

### Audit

```text
TrainerActivated
```

---

## 4.2 Deactivate Trainer

```http
POST /api/v1/trainers/{trainerId}/deactivate
```

### Permission

```text
TRAINER_DEACTIVATE
```

### Request

```json
{
  "reason": "Trainer no longer available"
}
```

### Validations

```text
Reason is required
```

### Business Rules

```text
Deactivated trainer cannot be assigned to future batches or sessions
Existing historical assignments remain visible
```

---

## 4.3 Suspend Trainer

```http
POST /api/v1/trainers/{trainerId}/suspend
```

### Permission

```text
TRAINER_SUSPEND
```

### Request

```json
{
  "reason": "Document verification pending"
}
```

---

# 5. Trainer Qualification APIs

## 5.1 Get Trainer Qualifications

```http
GET /api/v1/trainers/{trainerId}/qualifications
```

### Permission

```text
TRAINER_VIEW
```

---

## 5.2 Add Trainer Qualification

```http
POST /api/v1/trainers/{trainerId}/qualifications
```

### Permission

```text
TRAINER_EDIT
```

### Request

```json
{
  "qualificationName": "NEBOSH",
  "institution": "NEBOSH UK",
  "yearCompleted": 2020,
  "grade": "Pass",
  "certificateDocumentId": "doc_001",
  "status": "Active"
}
```

### Validations

```text
Qualification name is required
Institution is required
Year completed cannot be in the future
```

### Audit

```text
TrainerQualificationAdded
```

---

## 5.3 Update Trainer Qualification

```http
PATCH /api/v1/trainers/{trainerId}/qualifications/{qualificationId}
```

### Permission

```text
TRAINER_EDIT
```

---

## 5.4 Remove Trainer Qualification

```http
DELETE /api/v1/trainers/{trainerId}/qualifications/{qualificationId}
```

### Permission

```text
TRAINER_EDIT
```

### Business Rules

```text
Remove should be soft delete
Historical qualification changes must be audited
```

---

# 6. Trainer Certification APIs

## 6.1 Get Trainer Certifications

```http
GET /api/v1/trainers/{trainerId}/certifications
```

### Permission

```text
TRAINER_VIEW
```

---

## 6.2 Add Trainer Certification

```http
POST /api/v1/trainers/{trainerId}/certifications
```

### Permission

```text
TRAINER_EDIT
```

### Request

```json
{
  "certificationName": "IOSH Approved Trainer",
  "issuingAuthority": "IOSH",
  "issueDate": "2025-01-01",
  "expiryDate": "2027-01-01",
  "documentId": "doc_002",
  "status": "Active"
}
```

### Business Rules

```text
Expiry date should trigger future alerts
Expired certifications may block course assignment based on configuration
```

---

# 7. Trainer Document APIs

## 7.1 Get Trainer Documents

```http
GET /api/v1/trainers/{trainerId}/documents
```

### Permission

```text
TRAINER_DOCUMENT_VIEW
```

### Note

Actual upload, verification, approval, and replacement are handled by Document Management APIs.

---

## 7.2 Link Existing Document to Trainer

```http
POST /api/v1/trainers/{trainerId}/documents/link
```

### Permission

```text
TRAINER_DOCUMENT_LINK
```

### Request

```json
{
  "documentId": "doc_001",
  "documentType": "TrainerLicense"
}
```

---

# 8. Trainer Availability APIs

## 8.1 Get Trainer Availability

```http
GET /api/v1/trainers/{trainerId}/availability
```

### Permission

```text
TRAINER_AVAILABILITY_VIEW
```

### Response

```json
{
  "success": true,
  "data": {
    "trainerId": "trn_001",
    "availability": [
      {
        "id": "ava_001",
        "dayOfWeek": "Monday",
        "availableFrom": "09:00",
        "availableTo": "17:00",
        "status": "Active"
      }
    ],
    "unavailableDates": [
      {
        "id": "unava_001",
        "date": "2026-07-15",
        "reason": "Personal leave"
      }
    ]
  }
}
```

---

## 8.2 Set Weekly Availability

```http
POST /api/v1/trainers/{trainerId}/availability
```

### Permission

```text
TRAINER_AVAILABILITY_EDIT
```

### Request

```json
{
  "weeklyAvailability": [
    {
      "dayOfWeek": "Monday",
      "availableFrom": "09:00",
      "availableTo": "17:00"
    },
    {
      "dayOfWeek": "Tuesday",
      "availableFrom": "09:00",
      "availableTo": "17:00"
    }
  ]
}
```

### Validations

```text
Day of week is required
Available from time is required
Available to time is required
Available to must be after available from
```

### Business Rules

```text
Availability is used by Scheduling conflict engine
Changes should not modify historical schedules
Availability changes must be audited
```

---

## 8.3 Add Trainer Unavailable Date

```http
POST /api/v1/trainers/{trainerId}/unavailable-dates
```

### Permission

```text
TRAINER_AVAILABILITY_EDIT
```

### Request

```json
{
  "date": "2026-07-15",
  "reason": "Personal leave"
}
```

### Validations

```text
Date is required
Reason is required
```

---

## 8.4 Remove Trainer Unavailable Date

```http
DELETE /api/v1/trainers/{trainerId}/unavailable-dates/{unavailableDateId}
```

### Permission

```text
TRAINER_AVAILABILITY_EDIT
```

---

# 9. Trainer Course Authorization APIs

## 9.1 Get Trainer Authorized Courses

```http
GET /api/v1/trainers/{trainerId}/authorized-courses
```

### Permission

```text
TRAINER_COURSE_AUTH_VIEW
```

---

## 9.2 Authorize Trainer for Course

```http
POST /api/v1/trainers/{trainerId}/authorized-courses
```

### Permission

```text
TRAINER_COURSE_AUTH_EDIT
```

### Request

```json
{
  "courseId": "crs_001",
  "validFrom": "2026-06-19",
  "validTo": "2027-06-19",
  "remarks": "Trainer approved for IOSH delivery"
}
```

### Business Rules

```text
Course must be active
Trainer must be active
Expired authorization should prevent assignment if validation enabled
Course authorization changes must be audited
```

---

## 9.3 Revoke Trainer Course Authorization

```http
DELETE /api/v1/trainers/{trainerId}/authorized-courses/{authorizationId}
```

### Permission

```text
TRAINER_COURSE_AUTH_EDIT
```

### Request

```json
{
  "reason": "Authorization expired"
}
```

---

# 10. Trainer Assignment APIs

## 10.1 Get Trainer Assignments

```http
GET /api/v1/trainers/{trainerId}/assignments
```

### Permission

```text
TRAINER_ASSIGNMENT_VIEW
```

### Query Parameters

```text
batchId
courseId
dateFrom
dateTo
status
```

---

## 10.2 Assign Trainer to Batch

```http
POST /api/v1/trainers/{trainerId}/assignments/batch
```

### Permission

```text
TRAINER_ASSIGNMENT_CREATE
```

### Request

```json
{
  "batchId": "bat_001",
  "assignmentType": "PrimaryTrainer",
  "assignedFrom": "2026-07-01",
  "assignedTo": "2026-07-31"
}
```

### Business Rules

```text
Trainer must be active
Batch must be active
Trainer must be authorized for course if course authorization is enabled
Trainer availability must be checked
Trainer conflict validation required
```

---

## 10.3 Assign Trainer to Session

```http
POST /api/v1/trainers/{trainerId}/assignments/session
```

### Permission

```text
TRAINER_ASSIGNMENT_CREATE
```

### Request

```json
{
  "sessionId": "ses_001",
  "assignmentType": "PrimaryTrainer",
  "remarks": "Replacement trainer for session"
}
```

---

# 11. Trainer Timetable APIs

## 11.1 Get Trainer Timetable

```http
GET /api/v1/trainers/{trainerId}/timetable
```

### Permission

```text
TRAINER_TIMETABLE_VIEW
```

### Query Parameters

```text
dateFrom
dateTo
viewMode
```

### Business Rules

```text
Trainer can view own timetable
Admin/Coordinator can view all trainer timetables if permitted
```

---

## 11.2 Trainer Portal Timetable

```http
GET /api/v1/trainer-portal/me/timetable
```

### Permission

```text
Authenticated Trainer
```

---

# 12. Trainer Utilization APIs

## 12.1 Get Trainer Utilization

```http
GET /api/v1/trainers/{trainerId}/utilization
```

### Permission

```text
TRAINER_UTILIZATION_VIEW
```

### Query Parameters

```text
dateFrom
dateTo
branchId
```

### Response

```json
{
  "success": true,
  "data": {
    "trainerId": "trn_001",
    "availableHours": 160,
    "assignedHours": 120,
    "utilizationPercentage": 75
  }
}
```

---

## 12.2 Get Trainer Utilization Report

```http
GET /api/v1/reports/trainer-utilization
```

### Permission

```text
TRAINER_UTILIZATION_REPORT_VIEW
```

---

# 13. Trainer Portal Self APIs

## 13.1 Get My Trainer Profile

```http
GET /api/v1/trainer-portal/me
```

### Permission

```text
Authenticated Trainer
```

---

## 13.2 Get My Assigned Sessions

```http
GET /api/v1/trainer-portal/me/sessions
```

### Permission

```text
Authenticated Trainer
```

---

## 13.3 Get My Attendance Pending Sessions

```http
GET /api/v1/trainer-portal/me/attendance-pending
```

### Permission

```text
Authenticated Trainer
```

---

# 14. Business Error Examples

## Trainer Not Active

```json
{
  "success": false,
  "error": {
    "code": "TRAINER_NOT_ACTIVE",
    "message": "Inactive trainer cannot be assigned"
  }
}
```

## Trainer Not Authorized for Course

```json
{
  "success": false,
  "error": {
    "code": "TRAINER_NOT_AUTHORIZED_FOR_COURSE",
    "message": "Trainer is not authorized to deliver this course"
  }
}
```

## Trainer Availability Conflict

```json
{
  "success": false,
  "error": {
    "code": "TRAINER_AVAILABILITY_CONFLICT",
    "message": "Trainer is not available during the selected time"
  }
}
```

---

# 15. Events Published

```text
TrainerCreated
TrainerUpdated
TrainerActivated
TrainerDeactivated
TrainerSuspended
TrainerQualificationAdded
TrainerCertificationAdded
TrainerAvailabilityUpdated
TrainerUnavailableDateAdded
TrainerCourseAuthorized
TrainerCourseAuthorizationRevoked
TrainerAssignedToBatch
TrainerAssignedToSession
TrainerAssignmentRemoved
TrainerUtilizationCalculated
```

---

# 16. Audit Requirements

Audit must capture:

```text
Trainer create/update/status changes
Qualification add/update/remove
Certification add/update/remove
Availability changes
Unavailable date changes
Course authorization changes
Batch/session assignments
Document links
```

---

# 17. Integration Points

Consumes:

```text
Organization Management
Course & Batch Management
Document Management
Identity & Access
```

Provides data to:

```text
Scheduling
Attendance
Completion
Corporate Training
Reporting
Future Payroll
Trainer Portal
```

---
