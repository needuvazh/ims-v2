# Detailed API Contract Specification

## Module 5: Student Management APIs

**Version:** 1.0
**Base URL:** `/api/v1`
**Module Code:** `STD`

---

# 1. Module Purpose

Student Management APIs manage the master student profile used across IMS.

This module supports:

* Student creation
* Student profile update
* Student search
* Student status management
* Student identity fields
* Emergency contacts
* Student portal access
* Student summaries
* Student-related lookup views

---

# 2. Security Requirements

All Student APIs require authentication.

Protected APIs must enforce:

```text
Permission
Branch Scope
Student Data Scope
Self Access for Student Portal
Audit Logging
```

---

# 3. Student APIs

## 3.1 Get Students

```http
GET /api/v1/students
```

### Permission

```text
STUDENT_VIEW
```

### Query Parameters

```text
page
limit
search
branchId
status
courseId
batchId
nationality
enrollmentType
createdFrom
createdTo
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
        "id": "std_001",
        "studentNumber": "STD-2026-00001",
        "fullName": "Ahmed Ali",
        "phone": "+96890000000",
        "email": "ahmed@example.com",
        "nationality": "Omani",
        "status": "Active",
        "activeEnrollmentCount": 1,
        "createdAt": "2026-06-19T10:00:00Z"
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

## 3.2 Create Student

```http
POST /api/v1/students
```

### Permission

```text
STUDENT_CREATE
```

### Request

```json
{
  "firstName": "Ahmed",
  "middleName": "",
  "lastName": "Ali",
  "gender": "Male",
  "dateOfBirth": "1998-05-10",
  "nationality": "Omani",
  "photoUrl": null,
  "mobileNumber": "+96890000000",
  "alternateNumber": "+96891111111",
  "email": "ahmed@example.com",
  "preferredContactMethod": "Phone",
  "address": {
    "country": "Oman",
    "city": "Muscat",
    "area": "Ruwi",
    "streetAddress": "Street 1",
    "postalCode": "100"
  },
  "identityValues": [
    {
      "fieldCode": "CIVIL_ID",
      "value": "123456789"
    },
    {
      "fieldCode": "PASSPORT_NO",
      "value": "A1234567"
    }
  ],
  "emergencyContact": {
    "contactName": "Omar Ali",
    "relationship": "Brother",
    "phoneNumber": "+96892222222",
    "email": "omar@example.com"
  }
}
```

### Success Response

```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "id": "std_001",
    "studentNumber": "STD-2026-00001",
    "fullName": "Ahmed Ali",
    "status": "Admitted"
  }
}
```

### Validations

```text
First name is required
Mobile number is required
Nationality is required
Email must be valid if provided
Configured required identity fields must be provided
Unique identity fields must not duplicate existing values
```

### Business Rules

```text
Student number must be auto-generated
Student number must be unique
Duplicate warning required for same phone/email/configured identity field
Student may exist without enrollment
Default status is Admitted unless created from Admission workflow
Student creation must be audited
```

### Audit

```text
StudentCreated
```

---

## 3.3 Get Student Details

```http
GET /api/v1/students/{studentId}
```

### Permission

```text
STUDENT_VIEW
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "std_001",
    "studentNumber": "STD-2026-00001",
    "fullName": "Ahmed Ali",
    "gender": "Male",
    "dateOfBirth": "1998-05-10",
    "nationality": "Omani",
    "mobileNumber": "+96890000000",
    "email": "ahmed@example.com",
    "status": "Active",
    "address": {
      "country": "Oman",
      "city": "Muscat",
      "area": "Ruwi",
      "streetAddress": "Street 1",
      "postalCode": "100"
    },
    "identityValues": [
      {
        "fieldCode": "CIVIL_ID",
        "fieldName": "Civil ID",
        "value": "123456789"
      }
    ],
    "emergencyContact": {
      "contactName": "Omar Ali",
      "relationship": "Brother",
      "phoneNumber": "+96892222222"
    }
  }
}
```

---

## 3.4 Update Student

```http
PATCH /api/v1/students/{studentId}
```

### Permission

```text
STUDENT_EDIT
```

### Request

```json
{
  "firstName": "Ahmed",
  "lastName": "Ali",
  "gender": "Male",
  "dateOfBirth": "1998-05-10",
  "nationality": "Omani",
  "mobileNumber": "+96891111111",
  "alternateNumber": "+96892222222",
  "email": "ahmed.updated@example.com",
  "preferredContactMethod": "WhatsApp",
  "address": {
    "country": "Oman",
    "city": "Muscat",
    "area": "Al Khuwair",
    "streetAddress": "Street 2",
    "postalCode": "101"
  }
}
```

### Business Rules

```text
Student number cannot be edited
Profile changes must be audited
Sensitive identity changes may require special permission
```

### Audit

```text
StudentUpdated
```

---

# 4. Student Status APIs

## 4.1 Change Student Status

```http
POST /api/v1/students/{studentId}/change-status
```

### Permission

```text
STUDENT_STATUS_CHANGE
```

### Request

```json
{
  "newStatus": "Suspended",
  "reason": "Pending document verification",
  "remarks": "Student must submit updated visa document"
}
```

### Supported Statuses

```text
Inquiry
Applied
Admitted
Active
Completed
Dropped
Transferred
Suspended
Alumni
```

### Business Rules

```text
Invalid status transitions must be rejected
Reason is mandatory for Suspended, Dropped, and Transferred
Suspended students cannot create new enrollments unless authorized
Status change must be audited
```

### Audit

```text
StudentStatusChanged
```

---

# 5. Student Identity Field APIs

## 5.1 Get Identity Field Configuration

```http
GET /api/v1/student-identity-fields
```

### Permission

```text
STUDENT_IDENTITY_FIELD_VIEW
```

---

## 5.2 Create Identity Field

```http
POST /api/v1/student-identity-fields
```

### Permission

```text
STUDENT_IDENTITY_FIELD_CREATE
```

### Request

```json
{
  "fieldName": "Civil ID",
  "fieldCode": "CIVIL_ID",
  "fieldType": "Text",
  "isRequired": true,
  "isUnique": true,
  "isVisible": true,
  "displayOrder": 1,
  "status": "Active"
}
```

### Business Rules

```text
Field code must be unique
Inactive fields should not appear in new student forms
Existing values remain historically available
```

---

## 5.3 Update Identity Field

```http
PATCH /api/v1/student-identity-fields/{fieldId}
```

### Permission

```text
STUDENT_IDENTITY_FIELD_EDIT
```

---

## 5.4 Update Student Identity Values

```http
POST /api/v1/students/{studentId}/identity-values
```

### Permission

```text
STUDENT_IDENTITY_EDIT
```

### Request

```json
{
  "identityValues": [
    {
      "fieldCode": "CIVIL_ID",
      "value": "123456789"
    },
    {
      "fieldCode": "PASSPORT_NO",
      "value": "A1234567"
    }
  ]
}
```

### Business Rules

```text
Required identity fields must be present
Unique fields must be checked against other students
Identity value changes must be audited
```

---

# 6. Emergency Contact APIs

## 6.1 Get Emergency Contacts

```http
GET /api/v1/students/{studentId}/emergency-contacts
```

### Permission

```text
STUDENT_VIEW
```

---

## 6.2 Add Emergency Contact

```http
POST /api/v1/students/{studentId}/emergency-contacts
```

### Permission

```text
STUDENT_EDIT
```

### Request

```json
{
  "contactName": "Omar Ali",
  "relationship": "Brother",
  "phoneNumber": "+96892222222",
  "email": "omar@example.com",
  "isPrimary": true
}
```

---

## 6.3 Update Emergency Contact

```http
PATCH /api/v1/students/{studentId}/emergency-contacts/{contactId}
```

### Permission

```text
STUDENT_EDIT
```

---

## 6.4 Delete Emergency Contact

```http
DELETE /api/v1/students/{studentId}/emergency-contacts/{contactId}
```

### Permission

```text
STUDENT_EDIT
```

### Business Rules

```text
Delete should be soft delete
At least one emergency contact may be required based on configuration
```

---

# 7. Student Portal Access APIs

## 7.1 Generate Student Portal Access

```http
POST /api/v1/students/{studentId}/generate-portal-access
```

### Permission

```text
STUDENT_PORTAL_ACCESS_CREATE
```

### Request

```json
{
  "email": "ahmed@example.com",
  "sendInvite": true
}
```

### Business Rules

```text
One portal user account per student
Student must have valid email
Generated portal user must be linked to student profile
Portal access creation must be audited
```

---

## 7.2 Reset Student Portal Password

```http
POST /api/v1/students/{studentId}/reset-portal-password
```

### Permission

```text
STUDENT_PORTAL_PASSWORD_RESET
```

---

## 7.3 Deactivate Student Portal Access

```http
POST /api/v1/students/{studentId}/deactivate-portal-access
```

### Permission

```text
STUDENT_PORTAL_ACCESS_DISABLE
```

### Request

```json
{
  "reason": "Student no longer active"
}
```

---

# 8. Student Summary APIs

## 8.1 Get Student Enrollment Summary

```http
GET /api/v1/students/{studentId}/enrollments
```

### Permission

```text
STUDENT_VIEW
```

---

## 8.2 Get Student Attendance Summary

```http
GET /api/v1/students/{studentId}/attendance-summary
```

### Permission

```text
STUDENT_VIEW
```

---

## 8.3 Get Student Fee Summary

```http
GET /api/v1/students/{studentId}/fee-summary
```

### Permission

```text
STUDENT_FINANCE_VIEW
```

---

## 8.4 Get Student Certificate Summary

```http
GET /api/v1/students/{studentId}/certificates
```

### Permission

```text
STUDENT_VIEW
```

---

## 8.5 Get Student Document Summary

```http
GET /api/v1/students/{studentId}/documents
```

### Permission

```text
STUDENT_DOCUMENT_VIEW
```

---

# 9. Student Portal Self-Service APIs

## 9.1 Get My Profile

```http
GET /api/v1/student-portal/me
```

### Permission

```text
Authenticated Student
```

### Business Rules

```text
Student can only access own profile
```

---

## 9.2 Get My Enrollments

```http
GET /api/v1/student-portal/me/enrollments
```

---

## 9.3 Get My Timetable

```http
GET /api/v1/student-portal/me/timetable
```

---

## 9.4 Get My Attendance

```http
GET /api/v1/student-portal/me/attendance
```

---

## 9.5 Get My Fees

```http
GET /api/v1/student-portal/me/fees
```

---

## 9.6 Get My Receipts

```http
GET /api/v1/student-portal/me/receipts
```

---

## 9.7 Get My Certificates

```http
GET /api/v1/student-portal/me/certificates
```

---

## 9.8 Get My Documents

```http
GET /api/v1/student-portal/me/documents
```

---

# 10. Duplicate Detection APIs

## 10.1 Check Duplicate Student

```http
POST /api/v1/students/check-duplicate
```

### Permission

```text
STUDENT_CREATE
```

### Request

```json
{
  "mobileNumber": "+96890000000",
  "email": "ahmed@example.com",
  "identityValues": [
    {
      "fieldCode": "CIVIL_ID",
      "value": "123456789"
    }
  ]
}
```

### Response

```json
{
  "success": true,
  "data": {
    "duplicateFound": true,
    "matches": [
      {
        "studentId": "std_001",
        "studentNumber": "STD-2026-00001",
        "fullName": "Ahmed Ali",
        "matchedBy": "Mobile Number"
      }
    ]
  }
}
```

---

# 11. Business Error Examples

## Duplicate Student

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_STUDENT_WARNING",
    "message": "A student already exists with matching information",
    "details": {
      "matchingStudentIds": ["std_001"]
    }
  }
}
```

## Invalid Student Status Transition

```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Student cannot move from Alumni to Active"
  }
}
```

## Missing Required Identity Field

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Civil ID is required"
  }
}
```

---

# 12. Events Published

```text
StudentCreated
StudentUpdated
StudentStatusChanged
StudentIdentityUpdated
EmergencyContactAdded
EmergencyContactUpdated
StudentPortalAccessCreated
StudentPortalAccessDisabled
DuplicateStudentDetected
```

---

# 13. Audit Requirements

Audit must capture:

```text
Student create/update
Student status change
Student identity value changes
Emergency contact changes
Portal access creation/deactivation
Duplicate override decisions
```

---

# 14. Integration Points

Consumes:

```text
Admission & Enrollment
Identity & Access
Document Management
```

Provides data to:

```text
Enrollment
Attendance
Finance
Communication
Completion
Certificate
Reporting
Student Portal
```

---
