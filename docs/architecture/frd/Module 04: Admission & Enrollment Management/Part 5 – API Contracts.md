# Functional Requirement Document (Part 5)
## Module 04: Admission & Enrollment Management – API Contracts & Boundary Specs

---

## 1. REST Endpoints & Actions Summary

All APIs are scoped under the administrative portal prefixes and require JSON payloads. Route handlers must parse tokens to enforce branch scoping.

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/admissions` | `POST` | Create a new student admission application and matching person link. |
| `/api/admissions` | `GET` | List student admissions with pagination, filtering, and branch-scoped isolation. |
| `/api/admissions/{id}` | `GET` | Retrieve detailed admission records, scoped to branch permission. |
| `/api/admissions/{id}` | `DELETE` | Soft-delete a pending or draft admission. |
| `/api/admissions/{id}/approve` | `POST` | Approve a pending admission, triggering student number generation and ID card creation. |
| `/api/students` | `GET` | List student profiles with pagination and branch-scoped isolation. |
| `/api/students/{id}` | `GET` | Retrieve 360-degree student profile details, scoped to branch. |
| `/api/students/{id}` | `DELETE` | Soft-delete a student profile (restricted access). |
| `/api/enrollments` | `POST` | Create a new course enrollment in `Draft` state for an admitted student. |
| `/api/enrollments` | `GET` | List course enrollments with pagination and branch-scoped isolation. |
| `/api/enrollments/{id}` | `GET` | Retrieve enrollment details, including pricing resolutions, scoped to branch. |
| `/api/enrollments/{id}` | `DELETE` | Soft-delete an enrollment (pre-active only). |
| `/api/enrollments/{id}/approve` | `POST` | Approve an enrollment draft, verify credit limits, and trigger down-stream invoicing. |
| `/api/enrollments/{id}/confirm` | `POST` | Confirm the enrollment after financial billing confirmation or payment clearance. |
| `/api/enrollments/{id}/drop` | `POST` | Drop a student from an active enrollment batch, reclaiming class capacity. |
| `/api/enrollments/{id}/cancel` | `POST` | Cancel a pre-active enrollment, voiding associated draft invoices. |

---

## 2. API Endpoint Details

### 2.1 `POST /api/admissions`
*   **Purpose:** Create a new student profile and admission.
*   **Authentication:** Bearer token; requires `ADMISSION_CREATE` permission.
*   **Branch Scoping:** Enforces that the request's `branchId` is within the user's active branch access list.
*   **Request Payload Properties:**
    *   `personId` (UUID, Optional): ID of the existing Person to link.
    *   `branchId` (UUID, Required): ID of the branch managing the admission.
    *   `admissionDate` (DateTime, Required): Intake registration date.
    *   `leadId` (UUID, Optional): Original lead identifier in CRM.
    *   `personDetails` (Object, Optional): Required if `personId` is not provided. Contains:
        *   `firstName` (String, Required, max 100 characters).
        *   `lastName` (String, Required, max 100 characters).
        *   `mobile` (String, Required): Must match Omani mobile phone format (starts with `+968` followed by 7 or 9 and 7 digits).
        *   `email` (String, Optional): Must be a valid email format.
        *   `nationalId` (String, Optional): Civil ID or Passport number (8 to 15 characters).
        *   `nationality` (String, Optional): 2 to 50 characters.
        *   `dateOfBirth` (DateTime, Optional).
        *   `gender` (Enum: "Male", "Female", Optional).
    *   *Constraint:* Either `personId` or `personDetails` must be provided in the request payload.
*   **Success Response DTO (`201 Created`):**
    ```json
    {
      "status": "success",
      "data": {
        "admissionId": "b18b4e72-d5cb-42b7-a3f2-c2e718b52401",
        "studentProfileId": "d38d9f1c-ea99-4c8d-bf33-9118c7d9a5b3",
        "studentNumber": "STU-2026-00452",
        "admissionStatus": "Draft",
        "createdAt": "2026-07-01T14:53:00Z"
      }
    }
    ```
*   **Error Response Catalog:**
    *   `400 Bad Request` – `ERR_VAL_FAILED` (Validations failed: invalid phone, invalid email).
    *   `409 Conflict` – `ERR_ADM_DUPLICATE_STUDENT` (Student profile already exists for the given person mobile/Civil ID).
    *   `403 Forbidden` – `ERR_AUTH_BRANCH_DENIED` (User not authorized to create admissions in the target branch).

---

### 2.2 `POST /api/admissions/{id}/approve`
*   **Purpose:** Reviewer signs off and approves an admission application.
*   **Authentication:** Bearer token; requires `ADMISSION_APPROVE` permission.
*   **Branch Scoping:** Validates user holds branch approval permission for the branch of the target admission ID.
*   **Request Payload Properties:**
    *   `remarks` (String, Optional, max 500 characters).
*   **Success Response DTO (`200 OK`):**
    ```json
    {
      "status": "success",
      "message": "Admission approved successfully",
      "data": {
        "admissionId": "b18b4e72-d5cb-42b7-a3f2-c2e718b52401",
        "status": "Approved",
        "idCardStatus": "Generating",
        "approvedAt": "2026-07-01T14:54:12Z"
      }
    }
    ```
*   **Error Response Catalog:**
    *   `400 Bad Request` – `ERR_ADM_INVALID_STATE` (Admission is already approved/cancelled).
    *   `404 Not Found` – `ERR_ADM_NOT_FOUND` (Target admission record does not exist).

### 2.3 `POST /api/enrollments`
*   **Purpose:** Create a course enrollment draft.
*   **Authentication:** Bearer token; requires `ENROLLMENT_CREATE` permission.
*   **Branch Scoping:** Restricted to the context `branchId` provided in the payload. Enforced at the application service level.
*   **Request Payload Schema:**
*   **Request Payload Properties:**
    *   `studentProfileId` (UUID, Required): ID of the student.
    *   `admissionId` (UUID, Required): Reference to the approved admission.
    *   `courseId` (UUID, Required): Reference to the course.
    *   `batchId` (UUID, Required): Reference to the batch.
    *   `branchId` (UUID, Required): Reference to the branch.
    *   `enrollmentType` (Enum: "Regular", "Corporate", "WalkIn", "Online", Required).
    *   `corporateParticipantId` (UUID, Optional): Mandatory if `enrollmentType` is `Corporate`.
    *   `discountCode` (String, Optional).
    *   `manualDiscount` (Number, Optional): Amount of manual discount to apply.
*   **Success Response DTO (`201 Created`):**
    ```json
    {
      "status": "success",
      "data": {
        "enrollmentId": "ec12b4e9-112c-4993-8ba9-03c09b8d234a",
        "enrollmentNumber": "ENR-2026-10291",
        "enrollmentStatus": "Draft",
        "resolvedPrice": "450.000",
        "resolvedDiscount": "50.000",
        "finalAmount": "400.000",
        "pricingSource": "BatchLevel"
      }
    }
    ```
*   **Error Response Catalog:**
    *   `400 Bad Request` – `ERR_ENR_MISSING_ADMISSION` (No active approved admission found for student).
    *   `400 Bad Request` – `ERR_ENR_INACTIVE_COURSE` (Target course or batch is inactive).
    *   `400 Bad Request` – `ERR_ENR_INVALID_DISCOUNT` (Applied discount code is expired or invalid).

---

### 2.4 `POST /api/enrollments/{id}/approve`
*   **Purpose:** Move enrollment to Approved state, verifying batch capacity and corporate credit limits via cross-context service calls.
*   **Authentication:** Bearer token; requires `ENROLLMENT_APPROVE` permission.
*   **Branch Scoping:** Enforced local branch matches user authority.
*   **Request Payload Properties:**
    *   `overrideCapacity` (Boolean, Optional, default `false`): Set to `true` to override capacity validation (requires administrative permissions).
*   **Success Response DTO (`200 OK`):**
    ```json
    {
      "status": "success",
      "data": {
        "enrollmentId": "ec12b4e9-112c-4993-8ba9-03c09b8d234a",
        "enrollmentStatus": "Approved",
        "paymentValidationRequired": true,
        "invoiceStatus": "PendingInvoiceGeneration",
        "warnings": [
          "B2B Corporate credit limit exceeded for PDO account, approved with warning."
        ]
      }
    }
    ```
*   **Error Response Catalog:**
    *   `422 Unprocessable Entity` – `ERR_ENR_BATCH_FULL` (Batch max capacity reached, redirect to waitlist).
    *   `422 Unprocessable Entity` – `ERR_ENR_CREDIT_EXCEEDED` (Corporate account credit limit check failed).

---

### 2.5 `POST /api/enrollments/{id}/confirm`
*   **Purpose:** Confirm enrollment (triggered manually by authorized actors to bypass automated events; automatically handled in the background by outbox listeners subscribing to payment receipts).
*   **Authentication:** Bearer token; requires `ENROLLMENT_CONFIRM` permission.
*   **Branch Scoping:** Branch checked at the enrollment root.
*   **Request Payload Properties:**
    *   *No request payload is required.* Confirmation verifies payment clearance status by querying the Finance context's public application service interface (e.g., `FinanceAccountService.getLedgerBalance`).
*   **Success Response DTO (`200 OK`):**
    ```json
    {
      "status": "success",
      "data": {
        "enrollmentId": "ec12b4e9-112c-4993-8ba9-03c09b8d234a",
        "enrollmentStatus": "Confirmed",
        "confirmedAt": "2026-07-01T14:55:00Z"
      }
    }
    ```
*   **Error Response Catalog:**
    *   `422 Unprocessable Entity` – `ERR_ENR_PAYMENT_INCOMPLETE` (Finance ledger reports outstanding balance).

---

### 2.6 `POST /api/enrollments/{id}/drop`
*   **Purpose:** Drop student from active status. Emits an event that Finance listens to for refund calculations.
*   **Authentication:** Bearer token; requires `ENROLLMENT_DROP` permission.
*   **Branch Scoping:** Scoped to enrollment branch.
*   **Request Payload Properties:**
    *   `withdrawalDate` (DateTime, Required): Date of student withdrawal.
    *   `reasonCode` (String, Required): Standard reason code for the withdrawal.
*   **Success Response DTO (`200 OK`):**
    ```json
    {
      "status": "success",
      "data": {
        "enrollmentId": "ec12b4e9-112c-4993-8ba9-03c09b8d234a",
        "enrollmentStatus": "Dropped"
      }
    }
    ```

---

### 2.7 `POST /api/enrollments/{id}/cancel`
*   **Purpose:** Cancel a pre-active enrollment, voiding associated draft invoices.
*   **Authentication:** Bearer token; requires `ENROLLMENT_CANCEL` permission.
*   **Branch Scoping:** Scoped to the branch of the target enrollment.
*   **Request Payload Properties:**
    *   `reasonCode` (String, Required): Standard reason code for the cancellation.
*   **Success Response DTO (`200 OK`):**
    ```json
    {
      "status": "success",
      "data": {
        "enrollmentId": "ec12b4e9-112c-4993-8ba9-03c09b8d234a",
        "enrollmentStatus": "Cancelled",
        "cancelledAt": "2026-07-01T14:56:00Z"
      }
    }
    ```

---

## 3. Query (Read) & Deletion Endpoints (Branch-Scoped Isolation)

All read queries are strictly filtered by the user's active branch access context at the repository layer. Attempting to fetch or mutate records from outside the user's authorized branch list will result in `403 Forbidden` (`ERR_AUTH_BRANCH_DENIED`).

### 3.1 `GET /api/admissions`
*   **Purpose:** Retrieve list of student admissions scoped to user branch access.
*   **Authentication:** Bearer token; requires `student.view` or `ADMISSION_CREATE` permission.
*   **Query Parameters:**
    *   `branchId` (UUID) - Mandatory filter. Must align with authorized branches.
    *   `status` (Enum: Draft, Submitted, Approved, Cancelled) - Optional.
    *   `page` (Number, default 1) / `limit` (Number, default 20).
*   **Success Response DTO (`200 OK`):**
    ```json
    {
      "status": "success",
      "data": {
        "items": [
          {
            "id": "b18b4e72-d5cb-42b7-a3f2-c2e718b52401",
            "admissionNumber": "ADM-2026-00452",
            "studentProfileId": "d38d9f1c-ea99-4c8d-bf33-9118c7d9a5b3",
            "studentName": "Ahmed Al-Omani",
            "branchId": "mc-muscat-8879",
            "status": "Approved",
            "admissionDate": "2026-07-01T14:53:00Z"
          }
        ],
        "meta": {
          "total": 1,
          "page": 1,
          "limit": 20
        }
      }
    }
    ```

### 3.2 `GET /api/admissions/{id}`
*   **Purpose:** Retrieve single admission record details.
*   **Authentication:** Bearer token; requires `student.view` permission.
*   **Success Response DTO (`200 OK`):**
    ```json
    {
      "status": "success",
      "data": {
        "id": "b18b4e72-d5cb-42b7-a3f2-c2e718b52401",
        "admissionNumber": "ADM-2026-00452",
        "student": {
          "id": "d38d9f1c-ea99-4c8d-bf33-9118c7d9a5b3",
          "studentNumber": "STU-2026-00452",
          "person": {
            "fullName": "Ahmed Al-Omani",
            "mobile": "+96899123456",
            "email": "ahmed@example.om",
            "nationalId": "123456789"
          }
        },
        "branchId": "mc-muscat-8879",
        "status": "Approved",
        "admissionDate": "2026-07-01"
      }
    }
    ```

### 3.3 `DELETE /api/admissions/{id}`
*   **Purpose:** Soft-delete a draft or pending admission.
*   **Authentication:** Bearer token; requires `admission.cancel` permission.
*   **Request Body Properties:**
    *   `reasonCode` (String, Required): Standard reason code explaining the deletion/cancellation.
*   **Success Response DTO (`200 OK`):**
    ```json
    {
      "status": "success",
      "message": "Admission soft-deleted successfully"
    }
    ```

---

### 3.4 `GET /api/students`
*   **Purpose:** Retrieve list of student profiles.
*   **Authentication:** Bearer token; requires `student.view` permission.
*   **Query Parameters:**
    *   `branchId` (UUID) - Filters students who have an admission or enrollment in the specified branch.
    *   `search` (String) - Search match on Name, Civil ID, or mobile.
    *   `page` / `limit`.
*   **Success Response DTO (`200 OK`):**
    ```json
    {
      "status": "success",
      "data": {
        "items": [
          {
            "id": "d38d9f1c-ea99-4c8d-bf33-9118c7d9a5b3",
            "studentNumber": "STU-2026-00452",
            "fullName": "Ahmed Al-Omani",
            "mobile": "+96899123456",
            "status": "Active"
          }
        ],
        "meta": { "total": 1, "page": 1, "limit": 20 }
      }
    }
    ```

### 3.5 `GET /api/students/{id}`
*   **Purpose:** Retrieve 360-degree view of student details.
*   **Authentication:** Bearer token; requires `student.view` permission.
*   **Success Response DTO (`200 OK`):**
    ```json
    {
      "status": "success",
      "data": {
        "id": "d38d9f1c-ea99-4c8d-bf33-9118c7d9a5b3",
        "studentNumber": "STU-2026-00452",
        "person": {
          "id": "p89c-d23e",
          "firstName": "Ahmed",
          "lastName": "Al-Omani",
          "mobile": "+96899123456",
          "email": "ahmed@example.om",
          "nationalId": "123456789"
        },
        "status": "Active",
        "idCardIssued": true,
        "idCardNumber": "IDC-2026-00452",
        "enrollments": [
          {
            "id": "ec12b4e9-112c-4993-8ba9-03c09b8d234a",
            "enrollmentNumber": "ENR-2026-10291",
            "courseName": "First Aid Certificate",
            "batchCode": "FA-B03",
            "enrollmentStatus": "Confirmed"
          }
        ]
      }
    }
    ```

### 3.6 `DELETE /api/students/{id}`
*   **Purpose:** Soft-delete a student profile (restricted to admin).
*   **Authentication:** Bearer token; requires `Super Admin` privileges.
*   **Success Response DTO (`200 OK`):**
    ```json
    {
      "status": "success",
      "message": "Student profile soft-deleted successfully"
    }
    ```

---

### 3.7 `GET /api/enrollments`
*   **Purpose:** List course enrollments under active branch scope.
*   **Authentication:** Bearer token; requires `student.view` permission.
*   **Query Parameters:**
    *   `branchId` (UUID) - Mandatory filter.
    *   `courseId` / `batchId` (UUID) - Optional filters.
    *   `enrollmentStatus` (Draft, Submitted, Approved, Confirmed, Active, Completed, Cancelled, Dropped).
*   **Success Response DTO (`200 OK`):**
    ```json
    {
      "status": "success",
      "data": {
        "items": [
          {
            "id": "ec12b4e9-112c-4993-8ba9-03c09b8d234a",
            "enrollmentNumber": "ENR-2026-10291",
            "studentName": "Ahmed Al-Omani",
            "courseName": "First Aid Certificate",
            "batchCode": "FA-B03",
            "enrollmentStatus": "Confirmed",
            "finalAmount": "400.000"
          }
        ],
        "meta": { "total": 1, "page": 1, "limit": 20 }
      }
    }
    ```

### 3.8 `GET /api/enrollments/{id}`
*   **Purpose:** Retrieve detailed enrollment records.
*   **Authentication:** Bearer token; requires `student.view` permission.
*   **Success Response DTO (`200 OK`):**
    ```json
    {
      "status": "success",
      "data": {
        "id": "ec12b4e9-112c-4993-8ba9-03c09b8d234a",
        "enrollmentNumber": "ENR-2026-10291",
        "studentProfileId": "d38d9f1c-ea99-4c8d-bf33-9118c7d9a5b3",
        "courseId": "crs-111",
        "batchId": "bat-222",
        "branchId": "mc-muscat-8879",
        "enrollmentType": "Regular",
        "enrollmentStatus": "Confirmed",
        "pricingSource": "BatchLevel",
        "resolvedPrice": "450.000",
        "resolvedDiscount": "50.000",
        "finalAmount": "400.000",
        "paymentValidationRequired": true,
        "completionStatus": "Pending",
        "certificateStatus": "NotEligible"
      }
    }
    ```

### 3.9 `DELETE /api/enrollments/{id}`
*   **Purpose:** Soft-delete a pre-active enrollment draft.
*   **Authentication:** Bearer token; requires `enrollment.cancel` permission.
*   **Success Response DTO (`200 OK`):**
    ```json
    {
      "status": "success",
      "message": "Enrollment draft soft-deleted successfully"
    }
    ```
