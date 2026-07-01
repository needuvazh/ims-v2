# Part 5 – API Contracts

This document specifies the REST API endpoints and server actions exposed by the Faculty / Trainer Management module. All requests must provide authorization headers containing JSON Web Tokens (JWT).

---

## 1. Endpoint Summary List

| Route | Method | Purpose | Required Permission |
| :--- | :--- | :--- | :--- |
| `/api/trainers` | `POST` | Registers a new trainer and links to Person. | `trainer:create` |
| `/api/trainers` | `GET` | Fetches a paginated, branch-scoped list of trainers. | `trainer:read` |
| `/api/trainers/{id}` | `GET` | Retrieves complete details for a single trainer profile. | `trainer:read` |
| `/api/trainers/{id}/availabilities` | `PUT` | Establishes branch-scoped availability windows. | `trainer:avail-manage` |
| `/api/trainers/{id}/authorizations` | `POST` | Maps course authorizations to the trainer profile. | `trainer:write` |
| `/api/trainers/{id}/qualifications` | `POST` | Registers trainer qualifications and links to verified documents. | `trainer:write` |
| `/api/trainers/{id}/compensation-rates` | `POST` | Registers batch-specific compensation parameters. | `trainer:payment-write` |
| `/api/trainers/{id}/qualifications/{qualificationId}` | `DELETE` | Soft-deletes a trainer qualification via Aggregate Root. | `trainer:write` |
| `/api/trainers/{id}/authorizations/{authorizationId}` | `DELETE` | Soft-deletes a course authorization via Aggregate Root. | `trainer:write` |

---

## 2. Granular API Specifications

> [!NOTE]
> **Clean Architecture Boundary Rule:** All API route handlers and controllers must act as thin delivery adapters. Zod is used exclusively for body shape validation. All business rule invariants (e.g., availability collision detection, qualification status checks, pricing/payment validity) are executed inside the Bounded Context's Domain Aggregates or Application Service layers.

### 2.1 `POST /api/trainers`
* **Purpose:** Create a trainer profile linked to a central Person registry ID.
* **Authentication & Branch Scoping:**
  * Requires valid JWT. User must possess the `trainer:create` permission.
  * Writes are scoped to the user's active branch. The system verifies that the executing user has write access to the trainer's home branch context.
* **Request Payload (Zod Schema Layout):**
```typescript
const CreateTrainerSchema = z.object({
  personId: z.string().uuid(),
  trainerType: z.enum(["FullTime", "PartTime", "Freelance"]),
  specialization: z.string().min(3).max(1000),
  qualificationSummary: z.string().max(2000).optional(),
  effectiveStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  effectiveEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  branchId: z.string().uuid()
});
```
* **Success Response DTO (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "e9b2512f-981c-4b68-80f4-5553e1a0b943",
    "trainerCode": "TRN-2026-0044",
    "personId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "trainerType": "Freelance",
    "specialization": "Cyber Security",
    "qualificationSummary": "CEH, CISSP with 10 years experience",
    "status": "Draft",
    "effectiveStartDate": "2026-07-01",
    "effectiveEndDate": null,
    "createdAt": "2026-07-01T15:20:00.000Z",
    "createdBy": "99b2512f-981c-4b68-80f4-5553e1a0b943"
  }
}
```
* **Error Response Catalog:**
  * `400 Bad Request` (Code: `ERR_TRN_PERSON_ALREADY_LINKED`): The selected Person ID already has an active trainer profile.
  * `403 Forbidden` (Code: `ERR_TRN_BRANCH_ACCESS_DENIED`): User is not authorized to register trainers in the specified branch.

---

### 2.2 `GET /api/trainers`
* **Purpose:** Query a list of trainer profiles with active filters. Returns trainer profile fields logically populated/decorated with their corresponding `Person` record fields (handled at the Application Service level via logical service-to-service queries, avoiding physical cross-context SQL JOINs).
* **Authentication & Branch Scoping:**
  * Requires `trainer:read` permission.
  * Enforces server-side filtering on the `branchId` attribute of the active user session, unless the user holds `report:consolidated`.
* **Request Query Parameters:**
  * `branchId` (UUID, Optional)
  * `trainerType` (String, Optional)
  * `status` (String, Optional)
  * `page` (Int, Default 1)
  * `limit` (Int, Default 25)
* **Success Response DTO (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "e9b2512f-981c-4b68-80f4-5553e1a0b943",
      "trainerCode": "TRN-2026-0044",
      "firstName": "Ahmed",
      "lastName": "Al-Said",
      "email": "ahmed.said@asti.edu.om",
      "mobile": "+96891234567",
      "trainerType": "Freelance",
      "status": "Active",
      "complianceStatus": "Approved"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 25,
    "totalPages": 1
  }
}
```

---

### 2.3 `PUT /api/trainers/{id}/availabilities`
* **Purpose:** Set the recurring weekly availability blocks for a trainer.
* **Aggregate Encapsulation Rule:** The delivery layer must load the `TrainerProfile` Aggregate Root, delegate mutations (adding/updating availability blocks) to its aggregate root methods (e.g. `trainerProfile.setAvailability(slots)`) to validate invariants, and save the aggregate.
* **Authentication & Branch Scoping:**
  * Requires `trainer:avail-manage` permission.
  * Validates that the active user's branch context matches the target branch context of the availability slots.
* **Request Payload (Zod Schema Layout):**
```typescript
const SetAvailabilitySchema = z.object({
  slots: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6), // 0 = Sunday
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM
    branchId: z.string().uuid(),
    effectiveStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    effectiveEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
  })).nonempty()
});
```
* **Success Response DTO (200 OK):**
```json
{
  "success": true,
  "message": "Availability schedule updated successfully.",
  "data": [
    {
      "id": "c1f20485-3b61-419b-a01b-c6bfaee451a9",
      "trainerId": "e9b2512f-981c-4b68-80f4-5553e1a0b943",
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "13:00",
      "branchId": "88a123f1-44bb-4e4b-9e4a-b9c2a3819ccf",
      "status": "Active"
    }
  ]
}
```
* **Error Response Catalog:**
  * `422 Unprocessable Entity` (Code: `ERR_TRN_AVAILABILITY_OVERLAP`): One or more slots overlap with existing blocks for the trainer (evaluated in the Trainer domain availability service).
  * `400 Bad Request` (Code: `ERR_TRN_BRANCH_INACTIVE`): The specified branch context is inactive or under maintenance.

---

### 2.4 `POST /api/trainers/{id}/authorizations`
* **Purpose:** Authorize a trainer to deliver a specific course catalog option.
* **Aggregate Encapsulation Rule:** Course authorization mapping must be processed through the `TrainerProfile` Aggregate Root (e.g., `trainerProfile.addCourseAuthorization(courseId, dateRange)`) to ensure compliance validation.
* **Authentication & Branch Scoping:**
  * Requires `trainer:write` permission.
* **Request Payload (Zod Schema Layout):**
```typescript
const CourseAuthorizationSchema = z.object({
  courseId: z.string().uuid(),
  effectiveStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
});
```
* **Success Response DTO (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "a9a2a3a4-b9b8-c7c6-d5d4-e3e2e1a0b943",
    "trainerId": "e9b2512f-981c-4b68-80f4-5553e1a0b943",
    "courseId": "f9f8f7f6-e5e4-d3d2-c1c0-b9b8b7b6b5b4",
    "effectiveStartDate": "2026-07-01",
    "effectiveEndDate": "2027-07-01",
    "status": "Active"
  }
}
```
* **Error Response Catalog:**
  * `400 Bad Request` (Code: `ERR_TRN_QUALIFICATION_EXPIRED`): The trainer has no verified qualification matching this course requirement (validated logically via Document context lookup).
  * `400 Bad Request` (Code: `ERR_TRN_COURSE_INACTIVE`): The selected course is inactive or not published.

---

---

### 2.5 `POST /api/trainers/{id}/qualifications`
* **Purpose:** Register academic or professional qualifications for a trainer.
* **Aggregate Encapsulation Rule:** Qualification mapping must be processed through the `TrainerProfile` Aggregate Root (e.g. `trainerProfile.addQualification(details)`) to ensure validation rules (such as completions years vs birth dates) are run.
* **Authentication & Branch Scoping:**
  * Requires `trainer:write` permission.
  * Validates branch scoping based on active branch context of the trainer's profile.
* **Request Payload (Zod Schema Layout):**
```typescript
const RegisterQualificationSchema = z.object({
  qualificationName: z.string().min(2).max(150),
  institution: z.string().min(2).max(150),
  yearCompleted: z.number().int().min(1950),
  documentId: z.string().uuid().nullable().optional()
});
```
* **Success Response DTO (210 Created):**
```json
{
  "success": true,
  "data": {
    "id": "b1b2b3b4-c5c6-d7d8-e9e0-f1f2f3f4f5f6",
    "trainerId": "e9b2512f-981c-4b68-80f4-5553e1a0b943",
    "qualificationName": "M.Sc. in Computer Science",
    "institution": "Sultan Qaboos University",
    "yearCompleted": 2018,
    "documentId": "d1d2d3d4-e5e6-f7f8-a9a0-b1b2b3b4b5b6"
  }
}
```
* **Error Response Catalog:**
  * `400 Bad Request` (Code: `ERR_TRN_INVALID_COMPLETION_YEAR`): The completion year is in the future or invalid relative to the trainer's age.
  * `400 Bad Request` (Code: `ERR_TRN_QUALIFICATION_EXPIRED`): The linked document is unverified or has expired in the Document context.

---

### 2.6 `POST /api/trainers/{id}/compensation-rates`
* **Purpose:** Establish compensation rates for a trainer assigned to a specific batch.
* **Aggregate Encapsulation Rule:** Compensation rules are child components of `TrainerProfile`. The API handler must delegate rate changes to the `TrainerProfile` Aggregate Root to enforce payment validations.
* **Note on Immutability:** Approved rates are immutable. Submitting a rate change for an existing active assignment requires creating a new rate configuration while setting an `effectiveEndDate` on the old one. The only fields that can be updated on an active approved record are `effectiveEndDate` and `status` (to Cancelled/Inactive). All other fields are read-only after approval.
* **Authentication & Branch Scoping:**
  * Requires `trainer:payment-write` permission.
  * Endpoint hides detailed payloads from non-authorized actors.
* **Request Payload (Zod Schema Layout):**
```typescript
const AddCompensationRateSchema = z.object({
  batchId: z.string().uuid(),
  sessionId: z.string().uuid().nullable().optional(),
  paymentBasis: z.enum(["PerHour", "PerSession", "PerStudent", "Fixed"]),
  amount: z.number().multipleOf(0.001).positive(), // Validate 3 decimal places max
  effectiveStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  effectiveEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  remarks: z.string().max(1000).optional()
});
```
* **Success Response DTO (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "77b8f9e0-1c2d-3e4f-5a6b-7c8d9e0f1a2b",
    "trainerId": "e9b2512f-981c-4b68-80f4-5553e1a0b943",
    "batchId": "44bb-4e4b-9e4a-b9c2a3819ccf-88a123f1",
    "sessionId": null,
    "paymentBasis": "PerHour",
    "amount": "20.000",
    "status": "Draft",
    "effectiveStartDate": "2026-07-01",
    "effectiveEndDate": null
  }
}
```
* **Error Response Catalog:**
  * `400 Bad Request` (Code: `ERR_TRN_TRAINER_NOT_ASSIGNED_TO_BATCH`): The target trainer is not registered as an instructor for the specified batch (verified via logical query to Training Delivery context).
  * `422 Unprocessable Entity` (Code: `ERR_TRN_INVALID_COMPENSATION_RATE`): The compensation amount is negative or does not conform to the 3-decimal precision required for OMR.

