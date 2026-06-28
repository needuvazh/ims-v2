# API Specification Document

## Institute Management System (IMS)

**Version:** 1.0
**Architecture:** Next.js API Route Layer + Domain Package Application Services
**API Style:** REST-first
**Scope:** Single-client IMS implementation
**Excluded:** Tenant Setup, SaaS Subscription APIs, CMS APIs

---

# 1. Purpose

This document defines the REST API contract standards for the IMS platform.

It covers:

* API naming conventions
* Authentication
* Authorization
* Request/response format
* Error format
* Pagination
* Filtering
* Sorting
* Audit expectations
* Module-wise API inventory

---

# 2. API Design Principles

All APIs shall follow these principles:

1. APIs must be resource-oriented.
2. API handlers must be thin delivery adapters.
3. Business logic must live in domain application services.
4. All protected APIs must enforce server-side authorization.
5. All write operations must produce audit events where applicable.
6. APIs must return consistent response structures.
7. APIs must validate input using shared schemas.
8. APIs must support branch-scoped data access where applicable.

---

# 3. Base URL

```text
/api/v1
```

Example:

```text
/api/v1/students
/api/v1/enrollments
/api/v1/payments
```

---

# 4. Authentication

## 4.1 Login

```http
POST /api/v1/auth/login
```

### Request

```json
{
  "email": "admin@example.com",
  "password": "Password@123"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "user": {
      "id": "usr_001",
      "fullName": "Admin User",
      "email": "admin@example.com"
    }
  }
}
```

---

## 4.2 Logout

```http
POST /api/v1/auth/logout
```

---

## 4.3 Refresh Token

```http
POST /api/v1/auth/refresh
```

---

# 5. Authorization

Protected APIs must check:

```text
Authentication
Permission
Data Scope
Branch Access
```

Example permission:

```text
STUDENT_CREATE
PAYMENT_RECORD
CERTIFICATE_GENERATE
```

---

# 6. Standard Response Format

## Success

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

## Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": []
  }
}
```

---

# 7. Pagination Standard

List APIs shall support:

```text
page
limit
sortBy
sortOrder
```

Example:

```http
GET /api/v1/students?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

Response:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

# 8. Common HTTP Status Codes

| Status | Meaning               |
| ------ | --------------------- |
| 200    | Success               |
| 201    | Created               |
| 400    | Bad Request           |
| 401    | Unauthorized          |
| 403    | Forbidden             |
| 404    | Not Found             |
| 409    | Conflict              |
| 422    | Validation Error      |
| 500    | Internal Server Error |

---

# 9. Common Error Codes

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
DUPLICATE_RECORD
BUSINESS_RULE_VIOLATION
CONFLICT
INTERNAL_ERROR
```

---

# 10. Identity & Access APIs

## 10.1 Users

```http
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/{userId}
PATCH  /api/v1/users/{userId}
POST   /api/v1/users/{userId}/activate
POST   /api/v1/users/{userId}/deactivate
POST   /api/v1/users/{userId}/reset-password
POST   /api/v1/users/{userId}/assign-roles
```

### Required Permissions

```text
USER_VIEW
USER_CREATE
USER_EDIT
USER_ACTIVATE
USER_DEACTIVATE
USER_RESET_PASSWORD
USER_ASSIGN_ROLE
```

---

## 10.2 Roles

```http
GET    /api/v1/roles
POST   /api/v1/roles
GET    /api/v1/roles/{roleId}
PATCH  /api/v1/roles/{roleId}
POST   /api/v1/roles/{roleId}/activate
POST   /api/v1/roles/{roleId}/deactivate
POST   /api/v1/roles/{roleId}/permissions
```

---

## 10.3 Permissions

```http
GET /api/v1/permissions
GET /api/v1/permissions/modules
```

---

# 11. Organization APIs

## 11.1 Institute

```http
GET   /api/v1/institute
PATCH /api/v1/institute
```

---

## 11.2 Branches

```http
GET    /api/v1/branches
POST   /api/v1/branches
GET    /api/v1/branches/{branchId}
PATCH  /api/v1/branches/{branchId}
POST   /api/v1/branches/{branchId}/activate
POST   /api/v1/branches/{branchId}/deactivate
```

---

## 11.3 Departments

```http
GET    /api/v1/departments
POST   /api/v1/departments
GET    /api/v1/departments/{departmentId}
PATCH  /api/v1/departments/{departmentId}
POST   /api/v1/departments/{departmentId}/activate
POST   /api/v1/departments/{departmentId}/deactivate
```

---

## 11.4 Classrooms

```http
GET    /api/v1/classrooms
POST   /api/v1/classrooms
GET    /api/v1/classrooms/{classroomId}
PATCH  /api/v1/classrooms/{classroomId}
POST   /api/v1/classrooms/{classroomId}/activate
POST   /api/v1/classrooms/{classroomId}/deactivate
```

---

# 12. CRM / Lead APIs

## 12.1 Leads

```http
GET    /api/v1/leads
POST   /api/v1/leads
GET    /api/v1/leads/{leadId}
PATCH  /api/v1/leads/{leadId}
POST   /api/v1/leads/{leadId}/assign
POST   /api/v1/leads/{leadId}/mark-won
POST   /api/v1/leads/{leadId}/mark-lost
POST   /api/v1/leads/{leadId}/convert
```

### Create Lead Request

```json
{
  "branchId": "br_001",
  "leadType": "Student",
  "firstName": "Ahmed",
  "lastName": "Ali",
  "mobileNumber": "+96890000000",
  "email": "ahmed@example.com",
  "interestedCourseId": "crs_001",
  "leadSourceId": "src_001",
  "assignedCounselorId": "usr_010",
  "remarks": "Interested in weekend batch"
}
```

---

## 12.2 Follow-Ups

```http
GET   /api/v1/leads/{leadId}/follow-ups
POST  /api/v1/leads/{leadId}/follow-ups
PATCH /api/v1/follow-ups/{followUpId}
POST  /api/v1/follow-ups/{followUpId}/complete
```

---

## 12.3 Campaigns

```http
GET    /api/v1/campaigns
POST   /api/v1/campaigns
GET    /api/v1/campaigns/{campaignId}
PATCH  /api/v1/campaigns/{campaignId}
```

---

# 13. Admission & Enrollment APIs

## 13.1 Admissions

```http
GET    /api/v1/admissions
POST   /api/v1/admissions
GET    /api/v1/admissions/{admissionId}
PATCH  /api/v1/admissions/{admissionId}
POST   /api/v1/admissions/{admissionId}/approve
POST   /api/v1/admissions/{admissionId}/reject
POST   /api/v1/admissions/{admissionId}/cancel
```

---

## 13.2 Enrollments

```http
GET    /api/v1/enrollments
POST   /api/v1/enrollments
GET    /api/v1/enrollments/{enrollmentId}
PATCH  /api/v1/enrollments/{enrollmentId}
POST   /api/v1/enrollments/{enrollmentId}/confirm
POST   /api/v1/enrollments/{enrollmentId}/activate
POST   /api/v1/enrollments/{enrollmentId}/drop
POST   /api/v1/enrollments/{enrollmentId}/cancel
```

### Create Enrollment Request

```json
{
  "studentId": "std_001",
  "branchId": "br_001",
  "courseId": "crs_001",
  "batchId": "bat_001",
  "enrollmentType": "Regular",
  "enrollmentDate": "2026-06-19"
}
```

---

# 14. Student APIs

```http
GET    /api/v1/students
POST   /api/v1/students
GET    /api/v1/students/{studentId}
PATCH  /api/v1/students/{studentId}
POST   /api/v1/students/{studentId}/change-status
POST   /api/v1/students/{studentId}/generate-portal-access
GET    /api/v1/students/{studentId}/enrollments
GET    /api/v1/students/{studentId}/attendance
GET    /api/v1/students/{studentId}/fees
GET    /api/v1/students/{studentId}/certificates
GET    /api/v1/students/{studentId}/documents
```

---

# 15. Course & Batch APIs

## 15.1 Courses

```http
GET    /api/v1/courses
POST   /api/v1/courses
GET    /api/v1/courses/{courseId}
PATCH  /api/v1/courses/{courseId}
POST   /api/v1/courses/{courseId}/activate
POST   /api/v1/courses/{courseId}/deactivate
GET    /api/v1/courses/{courseId}/pricing
POST   /api/v1/courses/{courseId}/pricing
GET    /api/v1/courses/{courseId}/completion-rules
POST   /api/v1/courses/{courseId}/completion-rules
```

---

## 15.2 Batches

```http
GET    /api/v1/batches
POST   /api/v1/batches
GET    /api/v1/batches/{batchId}
PATCH  /api/v1/batches/{batchId}
POST   /api/v1/batches/{batchId}/open-enrollment
POST   /api/v1/batches/{batchId}/close-enrollment
POST   /api/v1/batches/{batchId}/assign-trainer
GET    /api/v1/batches/{batchId}/students
GET    /api/v1/batches/{batchId}/waiting-list
```

---

# 16. Scheduling APIs

```http
GET    /api/v1/schedules
POST   /api/v1/schedules
GET    /api/v1/schedules/{scheduleId}
PATCH  /api/v1/schedules/{scheduleId}
POST   /api/v1/schedules/{scheduleId}/generate-sessions
POST   /api/v1/sessions/{sessionId}/reschedule
POST   /api/v1/sessions/{sessionId}/cancel
GET    /api/v1/timetable
GET    /api/v1/trainers/{trainerId}/timetable
GET    /api/v1/students/{studentId}/timetable
```

---

# 17. Attendance APIs

```http
GET   /api/v1/attendance/sessions
GET   /api/v1/attendance/sessions/{attendanceSessionId}
POST  /api/v1/attendance/sessions/{attendanceSessionId}/mark
POST  /api/v1/attendance/sessions/{attendanceSessionId}/lock
POST  /api/v1/attendance/sessions/{attendanceSessionId}/reopen
POST  /api/v1/attendance/records/{attendanceRecordId}/correction
GET   /api/v1/students/{studentId}/attendance-summary
GET   /api/v1/batches/{batchId}/attendance-summary
```

### Mark Attendance Request

```json
{
  "records": [
    {
      "enrollmentId": "enr_001",
      "studentId": "std_001",
      "status": "Present",
      "remarks": ""
    }
  ]
}
```

---

# 18. Finance APIs

## 18.1 Fee Plans

```http
GET    /api/v1/fee-plans
POST   /api/v1/fee-plans
GET    /api/v1/fee-plans/{feePlanId}
PATCH  /api/v1/fee-plans/{feePlanId}
POST   /api/v1/fee-plans/{feePlanId}/activate
POST   /api/v1/fee-plans/{feePlanId}/deactivate
```

---

## 18.2 Payments

```http
GET   /api/v1/payments
POST  /api/v1/payments
GET   /api/v1/payments/{paymentId}
GET   /api/v1/enrollments/{enrollmentId}/fee-account
POST  /api/v1/enrollments/{enrollmentId}/payments
```

### Record Payment Request

```json
{
  "paymentDate": "2026-06-19",
  "paymentMode": "Cash",
  "amount": 100,
  "currency": "OMR",
  "referenceNumber": "REF123",
  "remarks": "First installment"
}
```

---

## 18.3 Receipts

```http
GET  /api/v1/receipts
GET  /api/v1/receipts/{receiptId}
GET  /api/v1/receipts/{receiptId}/download
POST /api/v1/receipts/{receiptId}/cancel
```

---

## 18.4 Refunds

```http
GET  /api/v1/refunds
POST /api/v1/refunds
GET  /api/v1/refunds/{refundId}
POST /api/v1/refunds/{refundId}/approve
POST /api/v1/refunds/{refundId}/reject
POST /api/v1/refunds/{refundId}/process
```

---

# 19. Trainer APIs

```http
GET    /api/v1/trainers
POST   /api/v1/trainers
GET    /api/v1/trainers/{trainerId}
PATCH  /api/v1/trainers/{trainerId}
POST   /api/v1/trainers/{trainerId}/activate
POST   /api/v1/trainers/{trainerId}/deactivate
GET    /api/v1/trainers/{trainerId}/availability
POST   /api/v1/trainers/{trainerId}/availability
GET    /api/v1/trainers/{trainerId}/assignments
GET    /api/v1/trainers/{trainerId}/documents
```

---

# 20. Corporate Training APIs

```http
GET    /api/v1/corporate/customers
POST   /api/v1/corporate/customers
GET    /api/v1/corporate/customers/{customerId}
PATCH  /api/v1/corporate/customers/{customerId}

GET    /api/v1/corporate/contracts
POST   /api/v1/corporate/contracts
GET    /api/v1/corporate/contracts/{contractId}
PATCH  /api/v1/corporate/contracts/{contractId}

GET    /api/v1/corporate/programs
POST   /api/v1/corporate/programs
GET    /api/v1/corporate/programs/{programId}
PATCH  /api/v1/corporate/programs/{programId}
POST   /api/v1/corporate/programs/{programId}/validate-credit

GET    /api/v1/corporate/participants
POST   /api/v1/corporate/participants
POST   /api/v1/corporate/participants/import
POST   /api/v1/corporate/participants/{participantId}/enroll
```

---

# 21. Exam, Result & Completion APIs

```http
GET    /api/v1/exams
POST   /api/v1/exams
GET    /api/v1/exams/{examId}
PATCH  /api/v1/exams/{examId}
POST   /api/v1/exams/{examId}/publish-results

POST   /api/v1/exams/{examId}/results
GET    /api/v1/exams/{examId}/results

GET    /api/v1/completions
POST   /api/v1/enrollments/{enrollmentId}/evaluate-completion
POST   /api/v1/completions/{completionId}/approve
POST   /api/v1/completions/{completionId}/reject
```

---

# 22. Certificate APIs

```http
GET    /api/v1/certificate-templates
POST   /api/v1/certificate-templates
GET    /api/v1/certificate-templates/{templateId}
PATCH  /api/v1/certificate-templates/{templateId}

GET    /api/v1/certificates
POST   /api/v1/certificates/generate
GET    /api/v1/certificates/{certificateId}
POST   /api/v1/certificates/{certificateId}/issue
POST   /api/v1/certificates/{certificateId}/reissue
POST   /api/v1/certificates/{certificateId}/revoke
GET    /api/v1/certificates/{certificateId}/download

GET    /api/v1/public/certificates/verify/{certificateNumber}
```

---

# 23. Document APIs

```http
GET    /api/v1/document-types
POST   /api/v1/document-types
PATCH  /api/v1/document-types/{documentTypeId}

GET    /api/v1/documents
POST   /api/v1/documents/upload
GET    /api/v1/documents/{documentId}
GET    /api/v1/documents/{documentId}/download
POST   /api/v1/documents/{documentId}/verify
POST   /api/v1/documents/{documentId}/approve
POST   /api/v1/documents/{documentId}/reject
POST   /api/v1/documents/{documentId}/replace
GET    /api/v1/documents/expiring
```

---

# 24. Communication APIs

```http
GET    /api/v1/communication/templates
POST   /api/v1/communication/templates
PATCH  /api/v1/communication/templates/{templateId}

POST   /api/v1/communication/send-email
POST   /api/v1/communication/send-sms
POST   /api/v1/communication/send-whatsapp

GET    /api/v1/communication/logs
GET    /api/v1/notifications
POST   /api/v1/notifications/{notificationId}/mark-read
```

---

# 25. Reports APIs

```http
GET /api/v1/reports/lead-conversion
GET /api/v1/reports/student-strength
GET /api/v1/reports/attendance
GET /api/v1/reports/fee-collection
GET /api/v1/reports/outstanding-fees
GET /api/v1/reports/corporate-revenue
GET /api/v1/reports/certificate-issued
POST /api/v1/reports/export
```

---

# 26. Audit APIs

```http
GET /api/v1/audit/logs
GET /api/v1/audit/entity/{entityType}/{entityId}
GET /api/v1/audit/user/{userId}
GET /api/v1/audit/approvals
```

---

# 27. API Security Requirements

All APIs shall enforce:

```text
Authentication
Authorization
Permission Check
Data Scope Check
Input Validation
Audit Logging
```

---

# 28. API Versioning

Version shall be included in URL:

```text
/api/v1
```

Future versions:

```text
/api/v2
```

---
