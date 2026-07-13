# Part 5 – API Contracts

## Module 15 – Corporate Sales & Quotation

---

# 1. Base Configuration

- **API Base Path**: `/api/admin/corporate-sales`
- **Authentication**: JWT Bearer Token required on all endpoints.
- **Authorization**: Checked via RBAC policies using the `corporateSales.*` permission nodes.
- **Response Format**: JSON with standardized headers.
- **Content Type**: `application/json` (except document uploads, which use `multipart/form-data`).

---

# 2. API Endpoint Specifications

## 2.1 POST /leads
- **Description**: Creates a new B2B sales lead.
- **Permission**: `corporateSales.lead.create`
- **Branch Scope**: Enforces validation that the input `branchId` matches one of the user's authorized branch scopes.
- **Request DTO (Zod Schema)**:
  ```typescript
  const CreateLeadSchema = z.object({
    corporateAccountId: z.string().uuid(),
    salesOwnerId: z.string().uuid(),
    branchId: z.string().uuid(),
    expectedValue: z.number().positive(),
    expectedCloseDate: z.string().datetime()
  });
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "leadId": "77777777-1111-2222-3333-444444444444",
    "stage": "New"
  }
  ```
- **Errors**:
  - `400 Bad Request` (`ERR_CSQ_INVALID_CLOSE_DATE`) - Date is in the past.
  - `403 Forbidden` (`ERR_CSQ_UNAUTHORIZED_BRANCH`) - User lacks access to the specified branch.

---

## 2.2 GET /leads
- **Description**: Retrieves filterable sales leads (branch-scoped).
- **Permission**: `corporateSales.lead.read`
- **Query Parameters**:
  - `stage`: string (optional filter)
  - `ownerId`: UUID (optional filter)
  - `limit`: number (default 20)
  - `offset`: number (default 0)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "77777777-1111-2222-3333-444444444444",
        "corporateAccountName": "PDO Muscat",
        "expectedValue": 1500.000,
        "stage": "VisitCompleted",
        "salesOwnerName": "Fatima Al-Riyami",
        "createdAt": "2026-07-12T10:00:00Z"
      }
    ],
    "pagination": { "total": 1, "limit": 20, "offset": 0 }
  }
  ```

---

## 2.3 POST /visits
- **Description**: Logs a marketing executive visit outcome.
- **Permission**: `corporateSales.visit.create`
- **Request DTO (Zod Schema)**:
  ```typescript
  const LogVisitSchema = z.object({
    corporateSalesLeadId: z.string().uuid(),
    contactPersonName: z.string().min(2).max(255),
    contactNumber: z.string().min(8).max(32),
    email: z.string().email(),
    meetingDate: z.string().datetime(),
    discussionNotes: z.string().min(10),
    coursesDiscussed: z.array(z.string().uuid()),
    expectedCandidates: z.number().int().nonnegative(),
    expectedTrainingDate: z.string().datetime()
  });
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "visitId": "88888888-2222-3333-4444-555555555555"
  }
  ```
- **Outbox Event Trigger**: Emits `MarketingVisitLogged` to audit trails.

---

## 2.4 POST /followups
- **Description**: Schedules a pipeline follow-up task.
- **Permission**: `corporateSales.followUp.create`
- **Request DTO (Zod Schema)**:
  ```typescript
  const CreateFollowUpSchema = z.object({
    corporateSalesLeadId: z.string().uuid(),
    followUpDate: z.string().datetime(),
    followUpType: z.enum(["Call", "Email", "Meeting"]),
    notes: z.string().min(5)
  });
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "followUpId": "99999999-3333-4444-5555-666666666666"
  }
  ```

---

## 2.5 POST /quotations
- **Description**: Creates a new quotation.
- **Permission**: `corporateSales.quotation.create`
- **Request DTO (Zod Schema)**:
  ```typescript
  const CreateQuotationSchema = z.object({
    corporateAccountId: z.string().uuid(),
    corporateSalesLeadId: z.string().uuid(),
    validUntil: z.string().datetime(),
    lineItems: z.array(
      z.object({
        courseId: z.string().uuid(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
        discountAmount: z.number().nonnegative().default(0)
      })
    ).min(1)
  });
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "quotationId": "00000000-4444-5555-6666-777777777777",
    "quotationNumber": "QT-CSQ-2026-0001",
    "subtotal": 1200.000,
    "taxAmount": 60.000,
    "totalAmount": 1260.000
  }
  ```

---

## 2.6 PUT /quotations/[id]/costing
- **Description**: Saves or updates estimated costs.
- **Permission**: `corporateSales.costing.update`
- **Request DTO (Zod Schema)**:
  ```typescript
  const UpdateCostingSchema = z.object({
    trainerCost: z.number().nonnegative(),
    venueCost: z.number().nonnegative(),
    equipmentCost: z.number().nonnegative(),
    printingCost: z.number().nonnegative(),
    certificateCost: z.number().nonnegative(),
    travelCost: z.number().nonnegative(),
    accommodationCost: z.number().nonnegative(),
    foodCost: z.number().nonnegative(),
    vehicleCost: z.number().nonnegative(),
    administrationCost: z.number().nonnegative(),
    marketingCost: z.number().nonnegative(),
    miscellaneousCost: z.number().nonnegative()
  });
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "costingId": "bbbbbbbb-5555-6666-7777-888888888888",
    "profitAmount": 400.000,
    "profitPercentage": 31.75
  }
  ```
- **Errors**:
  - `409 Conflict` (`ERR_CSQ_QUOTE_LOCKED`) - Editing is locked because quotation is already approved or sent.

---

## 2.7 POST /quotations/[id]/submit
- **Description**: Submits quotation for final margin checks.
- **Permission**: `corporateSales.quotation.submit`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "quotationId": "00000000-4444-5555-6666-777777777777",
    "status": "Approved", // or "SubmittedForApproval"
    "requiresApproval": false
  }
  ```

---

## 2.8 POST /quotations/[id]/approve
- **Description**: Approves a low-margin quotation (manager action).
- **Permission**: `corporateSales.quotation.approve`
- **Request DTO (Zod Schema)**:
  ```typescript
  const ApproveQuotationSchema = z.object({
    remarks: z.string().min(5)
  });
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "status": "Approved"
  }
  ```

---

## 2.9 POST /quotations/[id]/revise
- **Description**: Generates a revision version (resets status to `DRAFT`).
- **Permission**: `corporateSales.quotation.revise`
- **Request DTO (Zod Schema)**:
  ```typescript
  const ReviseQuotationSchema = z.object({
    revisionReason: z.string().min(5)
  });
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "newVersionNumber": 2,
    "status": "Draft"
  }
  ```

---

## 2.10 POST /orders/[id]/confirm
- **Description**: Confirms the order by uploading the LPO file link.
- **Permission**: `corporateSales.salesOrder.confirm`
- **Request DTO (Zod Schema)**:
  ```typescript
  const ConfirmOrderSchema = z.object({
    LpoDocumentId: z.string().uuid(),
    receivedDate: z.string().datetime(),
    remarks: z.string().optional()
  });
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "salesOrderId": "cccccccc-6666-7777-8888-999999999999",
    "salesOrderNumber": "SO-CSQ-2026-0001",
    "status": "Confirmed"
  }
  ```
- **Outbox Event Trigger**: Publishes `SalesOrderConfirmed` event containing the LPO document and order details.
