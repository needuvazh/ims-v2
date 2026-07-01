# ASTI IMS: Functional Requirement Document
## Module 03: Lead & Inquiry Management
### Part 5 – API Contracts

---

## 1. Summary of Endpoints

This document outlines the API contracts for the Lead & Inquiry Management context. All REST API endpoints must validate input payloads using Zod schemas on the server side and enforce strict authorization guards before database interaction.

| Endpoint | Method | Purpose | Required Permission |
| :--- | :--- | :--- | :--- |
| `/api/v1/crm/inquiries` | `POST` | Ingest manual or API-based raw inquiries. | `lead.create` or Web API Token |
| `/api/v1/crm/inquiries` | `GET` | List and search raw inquiries (branch isolated). | `lead.read` |
| `/api/v1/crm/inquiries/{id}/qualify` | `POST` | Qualify an inquiry and promote to Lead. | `lead.qualify` |
| `/api/v1/crm/leads` | `POST` | Directly create a new sales lead. | `lead.create` |
| `/api/v1/crm/leads` | `GET` | Retrieve list of leads based on filters. | `lead.read` |
| `/api/v1/crm/leads/{id}` | `GET` | Fetch complete lead details and timeline. | `lead.read` |
| `/api/v1/crm/leads/{id}/stage` | `PATCH`| Transition lead stage in the pipeline. | `lead.update` |
| `/api/v1/crm/leads/{id}/assign` | `PATCH`| Reassign a lead to a counselor. | `lead.assign` |
| `/api/v1/crm/leads/{id}/follow-ups`| `POST` | Schedule a future follow-up interaction. | `followup.create` |
| `/api/v1/crm/leads/follow-ups/{id}` | `PATCH`| Record outcome notes and close follow-up. | `followup.update` |
| `/api/v1/crm/leads/{id}/convert` | `POST` | Mark lead as Won and execute handoff. | `lead.won` |
| `/api/v1/crm/leads/{id}/lost` | `POST` | Mark lead as Lost (captures reason code). | `lead.lost` |
| `/api/v1/crm/leads/{id}/reveal-pii`| `POST` | Audited request to reveal masked phone, email, or National ID. | `lead.reveal_pii` |
| `/api/v1/crm/leads/{id}/notes` | `POST` | Add a new chronological timeline note. | `lead.update` |
| `/api/v1/crm/leads/{id}/notes` | `GET` | Fetch list of notes (paginated). | `lead.read` |

---

## 2. Detailed Endpoint Contracts

### 2.1 Ingest Inquiry (`POST /api/v1/crm/inquiries`)
* **Authentication**: Session Cookie (Internal User) OR Bearer Token (Public Website Client).
* **Branch-Scoping**: Evaluates branch ID. Internal users can only assign inquiries matching their authorized branches. API clients must submit active branch codes.
* **Request Payload Schema (Zod Definition)**:
```typescript
import { z } from "zod";

const preprocessPhone = (val: unknown) => {
  if (typeof val !== "string") return val;
  let cleaned = val.replace(/[\s\-\(\)]/g, ""); // Strip spaces, hyphens, parentheses
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }
  // Convert 9687XXXXXXX or 9689XXXXXXX to +968...
  if (cleaned.length === 11 && (cleaned.startsWith("9687") || cleaned.startsWith("9689"))) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
};

export const IngestInquirySchema = z.object({
  branchId: z.string().uuid("Invalid branch ID format"),
  firstName: z.string().min(2, "First name must be at least 2 characters").max(100),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(100),
  mobile: z.preprocess(
    preprocessPhone,
    z.string().refine((val) => {
      const omaniMobileRegex = /^(?:\+968)?[79]\d{7}$/;
      const internationalRegex = /^\+[1-9]\d{1,14}$/;
      return omaniMobileRegex.test(val) || internationalRegex.test(val);
    }, {
      message: "Must be a valid Omani mobile number starting with 7 or 9, or a standard E.164 international phone number"
    })
  ),
  email: z.string().email("Invalid email format").optional().nullable(),
  source: z.enum(["WalkIn", "Web", "Campaign", "Referral", "Other", "Phone", "WhatsApp", "Facebook", "Instagram", "GoogleAds", "CorporateReferral"]),
  interestedCourseId: z.string().uuid("Invalid course reference").optional().nullable(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().nullable(),
  utmSource: z.string().max(100).optional().nullable(),
  utmMedium: z.string().max(100).optional().nullable(),
  utmCampaign: z.string().max(100).optional().nullable(),
  bypassDuplicateBlock: z.boolean().default(false)
});
```
* **Success Response DTO (JSON Format - HTTP 201 Created)**:
```json
{
  "success": true,
  "data": {
    "inquiryId": "e382d640-a192-498c-8be9-e0921bd2cf31",
    "inquiryNumber": "INQ-2026-MCT-00142",
    "status": "Captured",
    "isDuplicate": false,
    "duplicateRefId": null,
    "createdAt": "2026-06-30T16:00:00.000Z"
  }
}
```
* **Error Response Catalog**:
  * **HTTP 400 Bad Request** / `ERR_CRM_DUPLICATE_LEAD_DETECTED`: Duplicate phone/email found and `bypassDuplicateBlock` is false.
  * **HTTP 403 Forbidden** / `ERR_CRM_BRANCH_SCOPE_VIOLATION`: Target `branchId` is not authorized for the requesting user.

---

### 2.2 Qualify Inquiry (`POST /api/v1/crm/inquiries/{id}/qualify`)
* **Authentication**: Session Cookie.
* **Branch-Scoping**: Verifies that the inquiry belongs to a branch assigned to the counselor.
* **Request Payload Schema (Zod Definition)**:
```typescript
export const QualifyInquirySchema = z.object({
  interestedCourseId: z.string().uuid("Interested course ID is required"),
  counselorId: z.string().uuid("Counselor assignment is required").optional().nullable(),
  qualificationNotes: z.string().min(5, "Qualification notes must specify reasoning").max(1000)
});
```
* **Success Response DTO (JSON Format - HTTP 200 OK)**:
```json
{
  "success": true,
  "data": {
    "inquiryId": "e382d640-a192-498c-8be9-e0921bd2cf31",
    "inquiryStatus": "Qualified",
    "leadId": "7c98b671-12ef-42f0-9b48-12cd34ef56ab",
    "leadNumber": "LD-2026-MCT-00088",
    "stage": "New",
    "qualifiedAt": "2026-06-30T16:05:00.000Z"
  }
}
```
* **Error Response Catalog**:
  * **HTTP 404 Not Found** / `ERR_CRM_INQUIRY_NOT_FOUND`: Inquiry ID does not exist.
  * **HTTP 422 Unprocessable Entity** / `ERR_CRM_INQUIRY_ALREADY_QUALIFIED`: Inquiry has already been promoted.

---

### 2.3 Transition Lead Stage (`PATCH /api/v1/crm/leads/{id}/stage`)
* **Authentication**: Session Cookie.
* **Branch-Scoping**: Counselor can only transition leads assigned to them. Branch Admins can transition any lead in their branch.
* **Request Payload Schema (Zod Definition)**:
```typescript
export const TransitionLeadStageSchema = z.object({
  newStage: z.enum(["New", "Contacted", "Follow-Up", "Qualified", "Negotiation", "Won", "Lost", "Converted"]),
  transitionNotes: z.string().max(1000).optional().nullable(),
  version: z.number().int("Optimistic concurrency version required")
});
```
* **Success Response DTO (JSON Format - HTTP 200 OK)**:
```json
{
  "success": true,
  "data": {
    "leadId": "7c98b671-12ef-42f0-9b48-12cd34ef56ab",
    "oldStage": "Contacted",
    "newStage": "Follow-Up",
    "updatedAt": "2026-06-30T16:10:00.000Z",
    "version": 2
  }
}
```
* **Error Response Catalog**:
  * **HTTP 409 Conflict** / `ERR_CRM_CONCURRENCY_VIOLATION`: The lead record was modified by another user in the interim.
  * **HTTP 422 Unprocessable Entity** / `ERR_CRM_INVALID_STAGE_TRANSITION`: The state machine rules forbid transitioning from the current stage to `newStage`.

---

### 2.4 Schedule Follow-up (`POST /api/v1/crm/leads/{id}/follow-ups`)
* **Authentication**: Session Cookie.
* **Branch-Scoping**: counselor must be assigned to the lead.
* **Request Payload Schema (Zod Definition)**:
```typescript
export const ScheduleFollowUpSchema = z.object({
  followUpDate: z.string().datetime("Invalid date-time format").refine((val) => {
    return new Date(val).getTime() > Date.now() + 300000; // Future date check (+5 min)
  }, { message: "Schedule date-time must be set in the future" }),
  followUpType: z.enum(["Call", "WhatsApp", "Email", "Visit"]),
  agenda: z.string().min(5, "Agenda must specify communication details").max(250)
});
```
* **Success Response DTO (JSON Format - HTTP 201 Created)**:
```json
{
  "success": true,
  "data": {
    "followUpId": "19bda7c0-2cd4-406a-a289-40ab12f00491",
    "leadId": "7c98b671-12ef-42f0-9b48-12cd34ef56ab",
    "followUpDate": "2026-07-05T10:00:00.000Z",
    "followUpType": "Call",
    "status": "Scheduled"
  }
}
```

---

### 2.5 Log Follow-up Outcome (`PATCH /api/v1/crm/leads/follow-ups/{id}`)
* **Authentication**: Session Cookie.
* **Request Payload Schema (Zod Definition)**:
```typescript
export const LogFollowUpOutcomeSchema = z.object({
  outcome: z.enum(["Answered", "Busy", "SwitchedOff", "NoResponse", "NotInterested", "Interested", "VisitScheduled"]),
  outcomeNotes: z.string().min(15, "Outcome notes must contain conversation detail"),
  scheduleNext: z.boolean(),
  nextFollowUpDate: z.string().datetime().optional().nullable(),
  nextFollowUpType: z.enum(["Call", "WhatsApp", "Email", "Visit"]).optional().nullable(),
  nextFollowUpAgenda: z.string().max(250).optional().nullable()
}).refine(data => {
  if (data.scheduleNext) {
    if (!data.nextFollowUpDate || !data.nextFollowUpType || !data.nextFollowUpAgenda) {
      return false;
    }
    // BR-LEAD-009 enforcement (Future date check +5 min)
    return new Date(data.nextFollowUpDate).getTime() > Date.now() + 300000;
  }
  return true;
}, {
  message: "Next follow-up details are mandatory and must be scheduled at least 5 minutes in the future",
  path: ["nextFollowUpDate"]
});
```
* **Success Response DTO (JSON Format - HTTP 200 OK)**:
```json
{
  "success": true,
  "data": {
    "completedFollowUpId": "19bda7c0-2cd4-406a-a289-40ab12f00491",
    "status": "Completed",
    "nextFollowUp": {
      "followUpId": "a90da3d1-419b-4cd3-b290-d40b12f8e281",
      "followUpDate": "2026-07-10T11:00:00.000Z",
      "status": "Scheduled"
    }
  }
}
```

---

### 2.6 Close Lead as Lost (`POST /api/v1/crm/leads/{id}/lost`)
* **Authentication**: Session Cookie.
* **Request Payload Schema (Zod Definition)**:
```typescript
export const CloseLeadLostSchema = z.object({
  lostReasonCode: z.string().min(1, "Select a valid lost reason category"),
  lostReasonNotes: z.string().min(15, "Explanatory notes must be at least 15 characters").max(1000)
});
```
* **Success Response DTO (JSON Format - HTTP 200 OK)**:
```json
{
  "success": true,
  "data": {
    "leadId": "7c98b671-12ef-42f0-9b48-12cd34ef56ab",
    "stage": "Lost",
    "lostReasonCode": "PriceTooHigh",
    "cancelledFollowUpsCount": 2,
    "closedAt": "2026-06-30T16:20:00.000Z"
  }
}
```

---

### 2.7 Convert Lead to Admission (`POST /api/v1/crm/leads/{id}/convert`)
* **Authentication**: Session Cookie.
* **Request Payload Schema (Zod Definition)**:
```typescript
export const ConvertLeadSchema = z.object({
  documentLinks: z.array(z.string().url("Must be a valid document url")).min(1, "At least one identity document is required for conversion")
});
```
* **Success Response DTO (JSON Format - HTTP 200 OK)**:
```json
{
  "success": true,
  "data": {
    "leadId": "7c98b671-12ef-42f0-9b48-12cd34ef56ab",
    "leadStage": "Converted",
    "admissionId": "d09bca7c-12ef-4cb2-81cd-40bd12ef34ab",
    "studentId": "098dca31-31bc-40bc-91cb-d40b12f78231",
    "studentNumber": "STU-2026-00340",
    "convertedAt": "2026-06-30T16:25:00.000Z"
  }
}
```
* **Error Response Catalog**:
  * **HTTP 422 Unprocessable Entity** / `ERR_CRM_WON_PRECONDITIONS_MISSED`: Missing civil ID file link or required profile fields.
  * **HTTP 409 Conflict** / `ERR_CRM_DUPLICATE_STUDENT`: Student number serial conflicts or record was already converted.

---

### 2.8 List Inquiries (`GET /api/v1/crm/inquiries`)
* **Authentication**: Session Cookie.
* **Branch-Scoping**: Evaluates user's authorized branches. Returns only inquiries matching `branchId` list.
* **Request Query Parameters**:
  * `branchId` (UUID, optional) - Filters by specific branch (must be in authorized list).
  * `status` (String, optional) - Captured, Qualified, Closed.
  * `search` (String, optional) - Name/email/phone filter.
  * `page` (Number, default 1), `limit` (Number, default 25).
* **Success Response DTO (HTTP 200 OK)**:
```json
{
  "success": true,
  "data": {
    "inquiries": [
      {
        "id": "e382d640-a192-498c-8be9-e0921bd2cf31",
        "inquiryNumber": "INQ-2026-MCT-00142",
        "firstName": "Salem",
        "lastName": "Al-Ghafri",
        "mobile": "+968 91***567",
        "email": "s******i@gmail.com",
        "source": "WalkIn",
        "interestedCourseId": "c182b740-12ef-4cb3-912b-40ab12f00101",
        "status": "Captured",
        "createdAt": "2026-06-30T16:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 25,
      "pages": 1
    }
  }
}
```

---

### 2.9 Create Lead (`POST /api/v1/crm/leads`)
* **Authentication**: Session Cookie.
* **Branch-Scoping**: Counselor or BA can only create a lead within their authorized `branchId`.
* **Request Payload Schema (Zod Definition)**:
```typescript
export const CreateLeadSchema = z.object({
  branchId: z.string().uuid("Invalid branch reference"),
  firstName: z.string().min(2, "First name is required").max(100),
  lastName: z.string().min(2, "Last name is required").max(100),
  email: z.string().email("Invalid email").optional().nullable(),
  phone: z.preprocess(
    preprocessPhone,
    z.string().refine((val) => {
      return /^(?:\+968)?[79]\d{7}$/.test(val) || /^\+[1-9]\d{1,14}$/.test(val);
    }, { message: "Invalid phone number formatting" })
  ),
  interestedCourseId: z.string().uuid("Invalid course reference"),
  source: z.enum(["WalkIn", "Web", "Campaign", "Referral", "Other", "Phone", "WhatsApp", "Facebook", "Instagram", "GoogleAds", "CorporateReferral"]),
  counselorId: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable()
});
```
* **Success Response DTO (HTTP 201 Created)**:
```json
{
  "success": true,
  "data": {
    "leadId": "7c98b671-12ef-42f0-9b48-12cd34ef56ab",
    "leadNumber": "LD-2026-MCT-00088",
    "stage": "New",
    "createdAt": "2026-06-30T16:30:00.000Z"
  }
}
```

---

### 2.10 List Leads (`GET /api/v1/crm/leads`)
* **Authentication**: Session Cookie.
* **Branch-Scoping**: Evaluates branch and counselor isolation checks. 
  * Counselors can only read records where `counselorId == currentUserId` AND `branchId` is in their authorized list.
  * Branch Admins can read all records matching their authorized `branchId` list.
* **Request Query Parameters**:
  * `branchId` (UUID, optional)
  * `stage` (LeadStage, optional)
  * `counselorId` (UUID, optional)
  * `search` (String, optional)
  * `page`, `limit`
* **Success Response DTO (HTTP 200 OK)**:
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "id": "7c98b671-12ef-42f0-9b48-12cd34ef56ab",
        "leadNumber": "LD-2026-MCT-00088",
        "firstName": "Salem",
        "lastName": "Al-Ghafri",
        "email": "s******i@gmail.com",
        "phone": "+968 91***567",
        "stage": "New",
        "counselorId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
        "interestedCourseId": "c182b740-12ef-4cb3-912b-40ab12f00101",
        "createdAt": "2026-06-30T16:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 25,
      "pages": 1
    }
  }
}
```

---

### 2.11 Get Lead Details (`GET /api/v1/crm/leads/{id}`)
* **Authentication**: Session Cookie.
* **Branch-Scoping**: Enforces same checks as list view (Counselor portfolio constraint + Branch Admin isolation).
* **Success Response DTO (HTTP 200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "7c98b671-12ef-42f0-9b48-12cd34ef56ab",
    "leadNumber": "LD-2026-MCT-00088",
    "personId": "3b2a1c0d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
    "branchId": "e382d640-a192-498c-8be9-e0921bd2cf31",
    "firstName": "Salem",
    "lastName": "Al-Ghafri",
    "email": "s******i@gmail.com",
    "phone": "+968 91***567",
    "stage": "New",
    "source": "WalkIn",
    "counselorId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "interestedCourseId": "c182b740-12ef-4cb3-912b-40ab12f00101",
    "campaignId": null,
    "priority": "Medium",
    "notes": "Interested in HSE course.",
    "version": 1,
    "createdAt": "2026-06-30T16:30:00.000Z",
    "followUps": [],
    "timeline": [
      {
        "event": "LeadCreated",
        "timestamp": "2026-06-30T16:30:00.000Z",
        "performedBy": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
      }
    ]
  }
}
```

---

### 2.12 Assign Lead Counselor (`PATCH /api/v1/crm/leads/{id}/assign`)
* **Authentication**: Session Cookie.
* **Branch-Scoping**: Branch Admin can only assign leads belonging to their authorized branches to active counselors in the same branch scope.
* **Request Payload Schema (Zod Definition)**:
```typescript
export const AssignLeadCounselorSchema = z.object({
  counselorId: z.string().uuid("Invalid counselor ID reference")
});
```
* **Success Response DTO (HTTP 200 OK)**:
```json
{
  "success": true,
  "data": {
    "leadId": "7c98b671-12ef-42f0-9b48-12cd34ef56ab",
    "counselorId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "assignedAt": "2026-06-30T16:35:00.000Z"
  }
}
```

---

### 2.13 Reveal Masked PII (`POST /api/v1/crm/leads/{id}/reveal-pii`)
* **Authentication**: Session Cookie.
* **Branch-Scoping**: Counselor must be assigned to the lead; Branch Admin must be within the same branch.
* **Request Payload Schema (Zod Definition)**:
```typescript
export const RevealPiiSchema = z.object({
  field: z.enum(["email", "phone", "nationalId"]),
  reason: z.string().min(5, "Reason for viewing PII is mandatory").max(200)
});
```
* **Success Response DTO (HTTP 200 OK)**:
```json
{
  "success": true,
  "data": {
    "leadId": "7c98b671-12ef-42f0-9b48-12cd34ef56ab",
    "field": "phone",
    "value": "+96891234567",
    "revealedAt": "2026-06-30T16:40:00.000Z"
  }
}
```
* **Error Response Catalog**:
  * **HTTP 400 Bad Request** / `ERR_CRM_WON_PRECONDITIONS_MISSED`: Invalid field selection or short reason.
  * **HTTP 403 Forbidden** / `ERR_CRM_BRANCH_SCOPE_VIOLATION`: Target lead belongs to another unauthorized branch portfolio.

---

### 2.14 Add Lead Note (`POST /api/v1/crm/leads/{id}/notes`)
* **Authentication**: Session Cookie.
* **Request Payload Schema (Zod Definition)**:
```typescript
export const AddLeadNoteSchema = z.object({
  content: z.string().min(1, "Note details cannot be blank").max(1000)
});
```
* **Success Response DTO (HTTP 200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "e987f654-3210-43ef-ba98-76cd5432ba98",
    "leadId": "7c98b671-12ef-42f0-9b48-12cd34ef56ab",
    "content": "Called the prospect. Interested in the training starting next week.",
    "createdAt": "2026-06-30T16:45:00.000Z",
    "createdBy": "12345678-1234-1234-1234-1234567890ab"
  }
}
```

---

### 2.15 Fetch Lead Notes (`GET /api/v1/crm/leads/{id}/notes`)
* **Authentication**: Session Cookie.
* **Success Response DTO (HTTP 200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "e987f654-3210-43ef-ba98-76cd5432ba98",
      "leadId": "7c98b671-12ef-42f0-9b48-12cd34ef56ab",
      "content": "Called the prospect. Interested in the training starting next week.",
      "createdAt": "2026-06-30T16:45:00.000Z",
      "createdBy": "12345678-1234-1234-1234-1234567890ab"
    }
  ],
  "total": 1
}
```
