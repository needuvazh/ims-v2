# Functional Requirement Document (Part 5)
## Module 04: Admission & Enrollment Management - API Contracts & Boundary Specs

---

## 1. Endpoint Summary

All endpoints are branch-scoped server-side. The branch context is derived from the authenticated session, not from client trust.

| Endpoint | Method | Purpose | Permission |
| --- | --- | --- | --- |
| `/api/admissions` | `POST` | Create admission and link or create `Person` | `admission.create` |
| `/api/admissions` | `GET` | List admissions | `admission.read` |
| `/api/admissions/{id}` | `GET` | Read admission details | `admission.read` |
| `/api/admissions/{id}/submit` | `POST` | Submit admission for review | `admission.submit` |
| `/api/admissions/{id}/approve` | `POST` | Approve admission | `admission.approve` |
| `/api/admissions/{id}/reject` | `POST` | Reject admission with reason | `admission.reject` |
| `/api/admissions/{id}` | `DELETE` | Soft delete draft/pending admission | `admission.delete` |
| `/api/students` | `GET` | List student profiles | `student.read` |
| `/api/students/{id}` | `GET` | Read student profile dashboard | `student.read` |
| `/api/students/{id}` | `DELETE` | Soft delete student profile | `student.delete` |
| `/api/enrollments` | `POST` | Create enrollment draft | `enrollment.create` |
| `/api/enrollments` | `GET` | List enrollments | `enrollment.read` |
| `/api/enrollments/{id}` | `GET` | Read enrollment details | `enrollment.read` |
| `/api/enrollments/{id}/submit` | `POST` | Submit enrollment for approval | `enrollment.submit` |
| `/api/enrollments/{id}/approve` | `POST` | Approve enrollment and emit invoice request event | `enrollment.approve` |
| `/api/enrollments/{id}/cancel` | `POST` | Cancel pre-active enrollment | `enrollment.cancel` |
| `/api/enrollments/{id}/drop` | `POST` | Drop active enrollment | `enrollment.drop` |

`POST /api/enrollments/{id}/confirm` is not exposed publicly. Confirmation is handled by the Finance receipt event handler.

---

## 2. Endpoint Details

### `POST /api/admissions`
* Request:
  * `personId?`
  * `personDetails?`
  * `leadId?`
  * `remarks?`
* Rules:
  * Either `personId` or `personDetails` is required.
  * Duplicate person detection is mandatory.
  * Branch is derived from the authenticated context.
* Success: `201 Created`
* Errors: `ERR_ADM_DUPLICATE_PERSON`, `ERR_ADM_AGE_LIMIT`, `ERR_AUTH_BRANCH_DENIED`

### `POST /api/admissions/{id}/submit`
* Request: `remarks?`
* Response DTO:
  ```json
  {
    "status": "success",
    "data": {
      "admissionId": "uuid",
      "admissionStatus": "Submitted",
      "submittedAt": "2026-07-01T14:55:00Z"
    }
  }
  ```
* Success: `200 OK`
* Errors: `ERR_ADM_INVALID_STATE`

### `POST /api/admissions/{id}/approve`
* Request: `remarks?`
* Response DTO:
  ```json
  {
    "status": "success",
    "data": {
      "admissionId": "uuid",
      "admissionStatus": "Approved",
      "approvedAt": "2026-07-01T14:56:00Z"
    }
  }
  ```
* Success: `200 OK`
* Side effects: enqueue student ID card generation job, write audit log, emit admission-approved notification

### `POST /api/admissions/{id}/reject`
* Request: `reasonCode`, `remarks?`
* Response DTO:
  ```json
  {
    "status": "success",
    "data": {
      "admissionId": "uuid",
      "admissionStatus": "Rejected"
    }
  }
  ```
* Success: `200 OK`
* Errors: `ERR_ADM_INVALID_STATE`, `ERR_VAL_FAILED` if reason missing

### `POST /api/enrollments`
* Request:
  * `studentProfileId`
  * `admissionId`
  * `courseId`
  * `batchId`
  * `enrollmentType`
  * `corporateParticipantId?`
  * `discountCode?`
  * `manualDiscount?`
* Rules:
  * `branchId` is derived server-side.
  * Batch/course must be active.
  * Corporate flows require corporate participant linkage.
* Success: `201 Created`
* Errors: `ERR_ENR_MISSING_ADMISSION`, `ERR_ENR_INACTIVE_COURSE`, `ERR_ENR_INVALID_DISCOUNT`

### `POST /api/enrollments/{id}/submit`
* Response DTO:
  ```json
  {
    "status": "success",
    "data": {
      "enrollmentId": "uuid",
      "enrollmentStatus": "Submitted"
    }
  }
  ```
* Success: `200 OK`
* Errors: `ERR_ENR_INVALID_STATE`

### `POST /api/enrollments/{id}/approve`
* Rules:
  * Validate batch capacity.
  * Validate corporate credit when applicable.
* Response DTO:
  ```json
  {
    "status": "success",
    "data": {
      "enrollmentId": "uuid",
      "enrollmentStatus": "Approved",
      "paymentValidationRequired": true,
      "finalAmount": "400.000"
    }
  }
  ```
* Success: `200 OK`
* Errors: `ERR_ENR_BATCH_FULL`, `ERR_ENR_CREDIT_EXCEEDED`

### `POST /api/enrollments/{id}/cancel`
* Rules: only pre-active states.
* Response DTO:
  ```json
  {
    "status": "success",
    "data": {
      "enrollmentId": "uuid",
      "enrollmentStatus": "Cancelled"
    }
  }
  ```
* Success: `200 OK`

### `POST /api/enrollments/{id}/drop`
* Rules: only active states.
* Response DTO:
  ```json
  {
    "status": "success",
    "data": {
      "enrollmentId": "uuid",
      "enrollmentStatus": "Dropped"
    }
  }
  ```
* Success: `200 OK`

---

## 3. Internal Event Handler

### `ReceiptGenerated` handler
* Purpose: confirm the enrollment when Finance reports cleared payment.
* Permission: system/internal only.
* Result: set `confirmedAt`, move enrollment to `Confirmed`, write audit log, emit `EnrollmentConfirmed`.
