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
| `/api/trainers/{id}/payments` | `POST` | Registers batch-specific compensation parameters. | `trainer:payment-write` |

---

## 2. Granular API Specifications

### 2.1 `POST /api/trainers`
* **Purpose:** Create a trainer profile linked to a central Person registry ID.
* **Authentication & Branch Scoping:**
  * Requires valid JWT. User must possess the `trainer:create` permission.
  * Writes are scoped to the user's active branch. The system verifies that the executing user has write access to the trainer's home branch.
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
* **Purpose:** Query a list of trainer profiles with active filters. Returns trainer profile fields joined with their corresponding `Person` record fields.
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
  * `422 Unprocessable Entity` (Code: `ERR_TRN_AVAILABILITY_OVERLAP`): One or more slots overlap with existing blocks for the trainer.
  * `400 Bad Request` (Code: `ERR_TRN_BRANCH_INACTIVE`): The specified branch context is inactive or under maintenance.

---

### 2.4 `POST /api/trainers/{id}/authorizations`
* **Purpose:** Authorize a trainer to deliver a specific course catalog option.
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
  * `400 Bad Request` (Code: `ERR_TRN_QUALIFICATION_EXPIRED`): The trainer has no verified qualification matching this course requirement.
  * `400 Bad Request` (Code: `ERR_TRN_COURSE_INACTIVE`): The selected course is inactive or not published.

---

### 2.5 `POST /api/trainers/{id}/payments`
* **Purpose:** Establish compensation rates for a trainer assigned to a specific batch.
* **Authentication & Branch Scoping:**
  * Requires `trainer:payment-write` permission.
  * Endpoint hides detailed payloads from non-authorized actors.
* **Request Payload (Zod Schema Layout):**
```typescript
const AddPaymentSchema = z.object({
  batchId: z.string().uuid(),
  sessionId: z.string().uuid().nullable().optional(),
  paymentBasis: z.enum(["PerHour", "PerSession", "PerStudent", "Fixed"]),
  amount: z.number().multipleOf(0.001).positive(), // Validate 3 decimal places max
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
    "status": "Draft"
  }
}
```
* **Error Response Catalog:**
  * `400 Bad Request` (Code: `ERR_TRN_TRAINER_NOT_ASSIGNED_TO_BATCH`): The target trainer is not registered as an instructor for the specified batch.
  * `422 Unprocessable Entity` (Code: `ERR_TRN_INVALID_PAYMENT_AMOUNT`): The compensation amount is negative or does not conform to the 3-decimal precision required for OMR.
