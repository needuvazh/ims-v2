# Module 06 — Course Catalog & Training Delivery (Batch) Management

## Part 5 — API Contracts

**Version:** 3.0  
**Status:** Draft  
**Domain:** Course Catalog & Training Delivery  
**Module Code:** CRS  

---

# 1. API Route Index

The following table summarizes the REST endpoints provided by the Course Catalog & Training Delivery module. All endpoints require HTTPS and a Bearer Token (JWT).

| HTTP Method | Route Path | Purpose | Required Permission | Branch Scoping Behavior |
| --- | --- | --- | --- | --- |
| **POST** | `/api/v1/courses/categories` | Create a new Course Category | `course.catalog.create` | Global scope verification. |
| **GET** | `/api/v1/courses/categories` | List all Course Categories | `course.catalog.view` | Global/Branch scoping check. |
| **POST** | `/api/v1/courses` | Create a new Course profile | `course.catalog.create` | Global scope verification. |
| **GET** | `/api/v1/courses` | Search courses with filters | `course.catalog.view` | Consolidated view or active branch filter. |
| **GET** | `/api/v1/courses/:id` | Fetch specific Course details | `course.catalog.view` | Global/Branch check depending on course owner. |
| **PUT** | `/api/v1/courses/:id` | Update Course attributes | `course.catalog.update` | Restricted to course owner branch. |
| **POST** | `/api/v1/courses/:id/pricing` | Register a new versioned price | `course.catalog.create` | Restricted to target branch scope. |
| **POST** | `/api/v1/courses/:id/completion-rules` | Register completion rules | `course.catalog.create` | Global/Branch owner scope checking. |
| **POST** | `/api/v1/batches` | Instantiate a new batch | `batch.delivery.create` | Restricted to target branch scope. |
| **GET** | `/api/v1/batches` | Search batches with filters | `batch.delivery.view` | Enforces active branch filters strictly. |
| **PUT** | `/api/v1/batches/:id/status` | Transition a batch state | `batch.delivery.transition` | Active branch verification required. |
| **POST** | `/api/v1/batches/:id/trainers` | Map a trainer to a batch | `batch.delivery.assign` | Active branch verification required. |
| **POST** | `/api/v1/batches/:id/waitlist` | Add a student to waitlist | `batch.waitlist.manage` | Active branch verification required. |
| **POST** | `/api/v1/batches/:id/waitlist/promote` | Promote waitlisted student | `batch.waitlist.manage` | Active branch verification required. |

---

# 2. Detailed API Specifications

---

## 2.1 Course Catalog APIs

### 2.1.1 POST `/api/v1/courses`
*   **Purpose:** Registers a new course profile in `Draft` status.
*   **Authorization:** Bearer JWT required. Permission: `course.catalog.create`.
*   **Branch-Scoping Behavior:** The course is assigned to the `branchId` passed in the payload. The user's JWT must include active access authorization to that branch.
*   **Request Payload Schema (Zod):**
    ```typescript
    const CreateCourseSchema = z.object({
      courseCode: z.string().min(3).max(20).regex(/^[A-Z0-9-]+$/),
      nameEnglish: z.string().min(3).max(150),
      nameArabic: z.string().min(3).max(150).regex(/^[\u0600-\u06FF\s]+$/),
      descriptionEnglish: z.string().optional(),
      descriptionArabic: z.string().optional(),
      departmentId: z.string().uuid(),
      branchId: z.string().uuid(),
      courseClassification: z.enum(["Individual", "Corporate", "WalkIn", "Online"]),
      durationType: z.enum(["FixedDays", "HoursBased", "SessionsBased"]),
      durationValue: z.number().int().positive(),
      allowWalkInCompletion: z.boolean().default(false),
      effectiveStartDate: z.string().date()
    });
    ```
*   **Success Response DTO (201 Created):**
    ```json
    {
      "status": "success",
      "data": {
        "id": "5ccb702d-aa2a-49a9-a20f-39a58ea485b6",
        "courseCode": "HS-NEBOSH-01",
        "nameEnglish": "NEBOSH International General Cert",
        "nameArabic": "شهادة نيبوش العامة الدولية",
        "departmentId": "89f4b007-4235-46b0-bb82-f54228da3542",
        "branchId": "35428da6-c66d-4ea1-bb85-74c203bfd11f",
        "courseClassification": "Individual",
        "status": "Draft",
        "createdAt": "2026-06-30T17:15:00.000Z",
        "version": 1
      }
    }
    ```
*   **Error Responses Catalog:**
    *   `400 Bad Request` — `ERR_VALIDATION_FAILED`: Payload violates validation rules.
    *   `409 Conflict` — `ERR_CRS_DUPLICATE_CODE`: Course code already exists.
    *   `403 Forbidden` — `ERR_IAM_INSUFFICIENT_PERMISSIONS`: Missing required permissions.

---

### 2.1.2 GET `/api/v1/courses`
*   **Purpose:** Query active course profiles using dynamic filters.
*   **Authorization:** Bearer JWT required. Permission: `course.catalog.view`.
*   **Branch-Scoping Behavior:** If user lacks consolidated report permission, the query filters automatically by the user's active session `branchId`.
*   **Success Response DTO (200 OK):**
    ```json
    {
      "status": "success",
      "pagination": {
        "totalCount": 1,
        "pageSize": 25,
        "nextCursor": "eyJpZCI6IjVjY2I3MDJkLTlhMmEtNDlhOS1hMjBmLTM5YTU4ZWE0ODViNiJ9"
      },
      "data": [
        {
          "id": "5ccb702d-aa2a-49a9-a20f-39a58ea485b6",
          "courseCode": "HS-NEBOSH-01",
          "nameEnglish": "NEBOSH International General Cert",
          "nameArabic": "شهادة نيبوش العامة الدولية",
          "department": {
            "id": "89f4b007-4235-46b0-bb82-f54228da3542",
            "name": "Health & Safety Division"
          },
          "status": "Active",
          "duration": "40 Hours"
        }
      ]
    }
    ```

---

### 2.1.3 POST `/api/v1/courses/:id/pricing`
*   **Purpose:** Configures a pricing override version for a course.
*   **Authorization:** Bearer JWT required. Permission: `course.catalog.create` or `course.pricing.override`.
*   **Branch-Scoping Behavior:** The `branchId` defined inside payload must match the active user's branch credentials.
*   **Request Payload Schema (Zod):**
    ```typescript
    const ConfigurePricingSchema = z.object({
      branchId: z.string().uuid().nullable(), // NULL = Global Default
      customerType: z.enum(["Individual", "Corporate", "WalkIn"]),
      batchType: z.enum(["Regular", "FastTrack", "Weekend"]),
      currency: z.literal("OMR"),
      basePrice: z.number().multipleOf(0.001).nonnegative(),
      taxPercentage: z.number().multipleOf(0.001).default(5.000),
      effectiveStartDate: z.string().date(),
      effectiveEndDate: z.string().date().optional()
    });
    ```
*   **Success Response DTO (201 Created):**
    ```json
    {
      "status": "success",
      "data": {
        "pricingId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
        "courseId": "5ccb702d-aa2a-49a9-a20f-39a58ea485b6",
        "branchId": "35428da6-c66d-4ea1-bb85-74c203bfd11f",
        "customerType": "Individual",
        "basePrice": 135.000,
        "taxPercentage": 5.000,
        "effectiveStartDate": "2026-07-01",
        "status": "Active"
      }
    }
    ```
*   **Error Responses Catalog:**
    *   `400 Bad Request` — `ERR_CRS_INVALID_DATE_RANGE`: End date is prior to start date.
    *   `400 Bad Request` — `ERR_CRS_MULTIPLE_ACTIVE_PRICING`: Overlapping pricing date intervals detected.

---

### 2.1.4 POST `/api/v1/courses/:id/completion-rules`
*   **Purpose:** Configures course graduation conditions.
*   **Authorization:** Bearer JWT. Permission: `course.catalog.create`.
*   **Branch-Scoping Behavior:** Matches parent course's branch permissions.
*   **Request Payload Schema (Zod):**
    ```typescript
    const ConfigureCompletionRulesSchema = z.object({
      minimumAttendancePercent: z.number().int().min(0).max(100),
      examRequired: z.boolean(),
      feeClearanceRequired: z.boolean().default(true),
      manualApprovalRequired: z.boolean().default(false),
      effectiveStartDate: z.string().date(),
      effectiveEndDate: z.string().date().optional()
    });
    ```
*   **Success Response DTO (201 Created):**
    ```json
    {
      "status": "success",
      "data": {
        "ruleId": "9c8b7a6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
        "courseId": "5ccb702d-aa2a-49a9-a20f-39a58ea485b6",
        "minimumAttendancePercent": 80,
        "examRequired": true,
        "feeClearanceRequired": true,
        "effectiveStartDate": "2026-07-01",
        "status": "Active"
      }
    }
    ```

---

## 2.2 Batch Delivery APIs

### 2.2.1 POST `/api/v1/batches`
*   **Purpose:** Instantiates a new batch class.
*   **Authorization:** Bearer JWT. Permission: `batch.delivery.create`.
*   **Branch-Scoping Behavior:** The batch is initialized under the target `branchId`. The user must belong to this branch.
*   **Request Payload Schema (Zod):**
    ```typescript
    const CreateBatchSchema = z.object({
      batchCode: z.string().min(3).max(50).regex(/^[A-Z0-9-]+$/),
      batchNameEnglish: z.string().min(3).max(150),
      batchNameArabic: z.string().min(3).max(150).regex(/^[\u0600-\u06FF\s]+$/),
      courseId: z.string().uuid(),
      branchId: z.string().uuid(),
      classroomId: z.string().uuid().optional(), // NULL if online
      startDate: z.string().date(),
      endDate: z.string().date(),
      capacity: z.number().int().positive(),
      waitingListEnabled: z.boolean().default(true),
      allowOverbooking: z.boolean().default(false),
      isWalkIn: z.boolean().default(false),
      corporateAccountId: z.string().uuid().optional()
    });
    ```
*   **Success Response DTO (201 Created):**
    ```json
    {
      "status": "success",
      "data": {
        "id": "e41b810d-c586-413f-952b-665dfcb90f14",
        "batchCode": "B-NEB-2026-001",
        "batchNameEnglish": "NEBOSH Class A - Q3",
        "batchNameArabic": "دفعة نيبوش أ - الربع الثالث",
        "courseId": "5ccb702d-aa2a-49a9-a20f-39a58ea485b6",
        "branchId": "35428da6-c66d-4ea1-bb85-74c203bfd11f",
        "status": "Draft",
        "capacity": 25,
        "currentEnrollmentCount": 0
      }
    }
    ```
*   **Error Responses Catalog:**
    *   `409 Conflict` — `ERR_CRS_DUPLICATE_BATCH_CODE`: The code is already registered.
    *   `400 Bad Request` — `ERR_CRS_INVALID_DATE_RANGE`: Batch schedule dates do not fit parent course effective dating limits.

---

### 2.2.2 PUT `/api/v1/batches/:id/status`
*   **Purpose:** Transitions a batch's state (e.g., from Open to In Progress).
*   **Authorization:** Bearer JWT. Permission: `batch.delivery.transition`.
*   **Branch-Scoping Behavior:** The system locks transition execution based on active branch contexts.
*   **Request Payload Schema (Zod):**
    ```typescript
    const TransitionBatchStatusSchema = z.object({
      targetStatus: z.enum(["Draft", "OpenForEnrollment", "InProgress", "Completed", "Cancelled"])
    });
    ```
*   **Success Response DTO (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "id": "e41b810d-c586-413f-952b-665dfcb90f14",
        "batchCode": "B-NEB-2026-001",
        "previousStatus": "Draft",
        "newStatus": "OpenForEnrollment",
        "updatedAt": "2026-06-30T17:15:30.000Z"
      }
    }
    ```
*   **Error Responses Catalog:**
    *   `422 Unprocessable Entity` — `ERR_CRS_BATCH_NO_TRAINER`: Cannot open enrollment without an assigned trainer.
    *   `409 Conflict` — `ERR_CRS_INVALID_STATE_TRANSITION`: Transition violates the allowed state flow.

---

### 2.2.3 POST `/api/v1/batches/:id/trainers`
*   **Purpose:** Maps a trainer to a batch and validates scheduling overlaps.
*   **Authorization:** Bearer JWT. Permission: `batch.delivery.assign`.
*   **Request Payload Schema (Zod):**
    ```typescript
    const AssignBatchTrainerSchema = z.object({
      trainerId: z.string().uuid(),
      role: z.enum(["Primary", "Assistant", "Observer"]),
      assignedFrom: z.string().date(),
      assignedTo: z.string().date()
    });
    ```
*   **Success Response DTO (201 Created):**
    ```json
    {
      "status": "success",
      "data": {
        "assignmentId": "3bafd9a9-987a-46b8-adfb-0af496bd58cd",
        "batchId": "e41b810d-c586-413f-952b-665dfcb90f14",
        "trainerId": "278caa48-d2cb-4e49-a51a-658272a4c1d1",
        "role": "Primary",
        "assignedFrom": "2026-07-15",
        "assignedTo": "2026-08-30",
        "status": "Active"
      }
    }
    ```
*   **Error Responses Catalog:**
    *   `409 Conflict` — `ERR_CRS_TRAINER_SCHEDULE_CONFLICT`: Trainer has overlapping timetabled session hours.
    *   `409 Conflict` — `ERR_CRS_PRIMARY_TRAINER_ALREADY_ASSIGNED`: The batch already has a primary trainer assigned for these dates.

---

### 2.2.4 POST `/api/v1/batches/:id/waitlist`
*   **Purpose:** Queues a student or lead on the batch waitlist.
*   **Authorization:** Bearer JWT. Permission: `batch.waitlist.manage`.
*   **Request Payload Schema (Zod):**
    ```typescript
    const AddToWaitlistSchema = z.object({
      studentId: z.string().uuid().optional(),
      leadId: z.string().uuid().optional()
    }).refine(data => data.studentId || data.leadId, {
      message: "Either studentId or leadId must be provided"
    });
    ```
*   **Success Response DTO (210 Created):**
    ```json
    {
      "status": "success",
      "data": {
        "waitlistId": "6f79e8b2-7b4e-4f02-be2f-4c6c9b0c073c",
        "batchId": "e41b810d-c586-413f-952b-665dfcb90f14",
        "studentId": "ca8012d3-0e1e-4227-8f9a-88ff5ae056f8",
        "leadId": null,
        "queuePosition": 4,
        "status": "Waiting"
      }
    }
    ```
*   **Error Responses Catalog:**
    *   `400 Bad Request` — `ERR_CRS_BATCH_NOT_FULL`: Seats are still available; redirect to standard enrollment.
    *   `422 Unprocessable Entity` — `ERR_CRS_DUPLICATE_WAITLIST_ENTRY`: Student or lead is already waiting or enrolled in this batch.

---

### 2.2.5 POST `/api/v1/batches/:id/waitlist/promote`
*   **Purpose:** Manually forces promotion of a waitlist candidate. Emits `WaitlistStudentPromoted` event.
*   **Authorization:** Bearer JWT. Permission: `batch.waitlist.manage`.
*   **Request Payload Schema (Zod):**
    ```typescript
    const PromoteWaitlistSchema = z.object({
      studentId: z.string().uuid().optional(),
      leadId: z.string().uuid().optional()
    }).refine(data => data.studentId || data.leadId, {
      message: "Either studentId or leadId must be provided"
    });
    ```
*   **Success Response DTO (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "waitlistId": "6f79e8b2-7b4e-4f02-be2f-4c6c9b0c073c",
        "promotedStudentId": "ca8012d3-0e1e-4227-8f9a-88ff5ae056f8",
        "promotedLeadId": null,
        "batchId": "e41b810d-c586-413f-952b-665dfcb90f14",
        "status": "Promoted"
      }
    }
    ```
*   **Error Responses Catalog:**
    *   `400 Bad Request` — `ERR_CRS_BATCH_FULL`: Batch capacity has not cleared and overbooking is false.

---

## 2.3 Course Category APIs

### 2.3.1 POST `/api/v1/courses/categories`
*   **Purpose:** Registers a new Course Category.
*   **Authorization:** Bearer JWT. Permission: `course.catalog.create`.
*   **Request Payload Schema (Zod):**
    ```typescript
    const CreateCourseCategorySchema = z.object({
      code: z.string().min(2).max(50).regex(/^[A-Z0-9-]+$/),
      nameEnglish: z.string().min(3).max(150),
      nameArabic: z.string().min(3).max(150).regex(/^[\u0600-\u06FF\s]+$/),
      description: z.string().optional(),
      parentCategoryId: z.string().uuid().optional()
    });
    ```
*   **Success Response DTO (201 Created):**
    ```json
    {
      "status": "success",
      "data": {
        "id": "7ca8012d-30e1-4227-8f9a-88ff5ae056f8",
        "code": "HS",
        "nameEnglish": "Health & Safety",
        "nameArabic": "الصحة والسلامة",
        "status": "Active"
      }
    }
    ```

### 2.3.2 GET `/api/v1/courses/categories`
*   **Purpose:** Returns all registered course categories with hierarchical groupings.
*   **Authorization:** Bearer JWT. Permission: `course.catalog.view`.
*   **Success Response DTO (200 OK):**
    ```json
    {
      "status": "success",
      "data": [
        {
          "id": "7ca8012d-30e1-4227-8f9a-88ff5ae056f8",
          "code": "HS",
          "nameEnglish": "Health & Safety",
          "nameArabic": "الصحة والسلامة",
          "parentCategoryId": null,
          "status": "Active"
        }
      ]
    }
    ```
