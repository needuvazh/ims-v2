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
*   **Request Payload Schema (Zod structure):**
    ```typescript
    const createAdmissionSchema = z.object({
      personId: z.string().uuid().optional(),
      branchId: z.string().uuid(),
      admissionDate: z.string().datetime(),
      leadId: z.string().uuid().optional(),
      // Inlined person fields if personId is omitted (new person creation)
      personDetails: z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        mobile: z.string().regex(/^\+968[79][0-9]{7}$/, "Invalid Omani phone"),
        email: z.string().email().optional(),
        nationalId: z.string().min(8).max(15).optional(),
        nationality: z.string().min(2).max(50).optional(),
        dateOfBirth: z.string().datetime().optional(),
        gender: z.enum(["Male", "Female"]).optional(),
      }).optional()
    }).refine(data => data.personId || data.personDetails, {
      message: "Either personId or personDetails must be provided",
    });
    ```
*   **Success Response DTO (`201 Created`):**
    ```json
    {
      "status": "success",
      "data": {
        "admissionId": "b18b4e72-d5cb-42b7-a3f2-c2e718b52401",
        "studentId": "d38d9f1c-ea99-4c8d-bf33-9118c7d9a5b3",
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
*   **Request Payload Schema:**
    ```typescript
    const approveAdmissionSchema = z.object({
      remarks: z.string().max(500).optional()
    });
    ```
*   **Success Response DTO (`200 OK`):**
    ```json
    {
      "status": "success",
      "message": "Admission approved successfully",
      "data": {
        "admissionId": "b18b4e72-d5cb-42b7-a3f2-c2e718b52401",
        "status": "Approved",
        "idCardUrl": "https://storage.asti.om/id-cards/STU-2026-00452.pdf",
        "approvedAt": "2026-07-01T14:54:12Z"
      }
    }
    ```
*   **Error Response Catalog:**
    *   `400 Bad Request` – `ERR_ADM_INVALID_STATE` (Admission is already approved/cancelled).
    *   `404 Not Found` – `ERR_ADM_NOT_FOUND` (Target admission record does not exist).

---

### 2.3 `POST /api/enrollments`
*   **Purpose:** Create a course enrollment draft.
*   **Authentication:** Bearer token; requires `ENROLLMENT_CREATE` permission.
*   **Branch Scoping:** Restricted to the context `branchId` provided in the payload.
*   **Request Payload Schema:**
    ```typescript
    const createEnrollmentSchema = z.object({
      studentId: z.string().uuid(),
      admissionId: z.string().uuid(),
      courseId: z.string().uuid(),
      batchId: z.string().uuid(),
      branchId: z.string().uuid(),
      enrollmentType: z.enum(["Regular", "Corporate", "WalkIn", "Online"]),
      corporateParticipantId: z.string().uuid().optional(),
      discountCode: z.string().optional(),
      manualDiscount: z.number().min(0).optional()
    });
    ```
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
*   **Purpose:** Move enrollment to Approved state, reserving seat and initiating invoice actions.
*   **Authentication:** Bearer token; requires `ENROLLMENT_APPROVE` permission.
*   **Branch Scoping:** Enforced local branch matches user authority.
*   **Request Payload Schema:**
    ```typescript
    const approveEnrollmentSchema = z.object({
      overrideCapacity: z.boolean().default(false)
    });
    ```
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
*   **Purpose:** Confirm enrollment (triggered manually by finance overrides or system callbacks on payments).
*   **Authentication:** Bearer token; requires `ENROLLMENT_CONFIRM` permission.
*   **Branch Scoping:** Branch checked at the enrollment root.
*   **Request Payload Schema:**
    ```typescript
    const confirmEnrollmentSchema = z.object({
      receiptNumber: z.string().min(1)
    });
    ```
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
    *   `422 Unprocessable Entity` – `ERR_ENR_PAYMENT_INCOMPLETE` (Ledger balance is greater than zero).

---

### 2.6 `POST /api/enrollments/{id}/drop`
*   **Purpose:** Drop student from active status.
*   **Authentication:** Bearer token; requires `ENROLLMENT_DROP` permission.
*   **Branch Scoping:** Scoped to enrollment branch.
*   **Request Payload Schema:**
    ```typescript
    const dropEnrollmentSchema = z.object({
      withdrawalDate: z.string().datetime(),
      reasonCode: z.string().min(1),
      requestRefund: z.boolean().default(false)
    });
    ```
*   **Success Response DTO (`200 OK`):**
    ```json
    {
      "status": "success",
      "data": {
        "enrollmentId": "ec12b4e9-112c-4993-8ba9-03c09b8d234a",
        "enrollmentStatus": "Dropped",
        "refundRequestCreated": true
      }
    }
    ```

---

### 2.7 `POST /api/enrollments/{id}/cancel`
*   **Purpose:** Cancel a pre-active enrollment, voiding associated draft invoices.
*   **Authentication:** Bearer token; requires `ENROLLMENT_CANCEL` permission.
*   **Branch Scoping:** Scoped to the branch of the target enrollment.
*   **Request Payload Schema:**
    ```typescript
    const cancelEnrollmentSchema = z.object({
      reasonCode: z.string().min(1)
    });
    ```
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
            "studentId": "d38d9f1c-ea99-4c8d-bf33-9118c7d9a5b3",
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
*   **Request Query/Body:**
    ```typescript
    const deleteAdmissionSchema = z.object({
      reasonCode: z.string().min(1)
    });
    ```
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
        "studentId": "d38d9f1c-ea99-4c8d-bf33-9118c7d9a5b3",
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
