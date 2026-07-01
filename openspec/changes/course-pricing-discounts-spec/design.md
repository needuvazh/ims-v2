## Context

Course configuration requires managing pricing structures, standard discounts, and completion requirements. This design introduces database entities `CoursePricing`, `CourseDiscount`, and `CourseCompletionRule` and their associated endpoints and screens.

## Goals / Non-Goals

**Goals:**
- Provide full CRUD APIs for course configuration rules.
- Enforce immutability and date-range overlap checks on aggregate mutation commands.
- Implement OMR decimal validations and Oman VAT standard checks.
- Support branch overrides and supervisor approval policies.

**Non-Goals:**
- Applying resolved price rules during enrollment invoices (responsibility of the external Finance context).
- Grading student exams or recording attendance (responsibility of Attendance and Completion contexts).

## Decisions

### 1. Database Schema
We will add these models to `packages/database/prisma/schema.prisma`:
*   `CoursePricing`: fields `id`, `courseId` (FK), `branchId` (logical reference), `batchId` (FK), `customerType` (Enum), `batchType` (Enum), `currency` (OMR check), `basePrice` (Decimal 12,3), `taxPercentage` (Decimal 5,3, default 5.000), `effectiveStartDate`, `effectiveEndDate`, `status` (Draft/Active/Inactive).
*   `CourseDiscount`: fields `id`, `courseId` (FK), `branchId` (logical reference), `batchId` (FK), `discountType` (Enum), `discountMode` (Percentage/FixedAmount), `discountValue` (Decimal 12,3), `requiresApproval` (Boolean), `effectiveStartDate`, `effectiveEndDate`, `status`.
*   `CourseCompletionRule`: fields `id`, `courseId` (FK), `minimumAttendancePercent` (Int), `examRequired` (Boolean), `feeClearanceRequired` (Boolean), `manualApprovalRequired` (Boolean), `effectiveStartDate`, `effectiveEndDate`, `status`.
*   Indices: Composite index `@@index([courseId, branchId, customerType, batchType, status])` for pricing resolution.

### 2. Domain & Aggregate Encapsulation
*   We will modify the `Course` Aggregate Root inside `packages/course-catalog` to encapsulate `addPricingRule`, `addDiscount`, and `configureCompletionRules`.
*   The aggregate will reject updates to already active rules, requiring version increments and date superseding.
*   **Pricing Resolution Service:** We will implement a domain pricing resolver. It queries pricing records for `courseId` filtered by status `Active` and the current date, resolving the base price matching the priorities:
    1. Check for pricing records with matching `batchId`.
    2. If missing, check for records with matching `branchId` and `batchId = null`.
    3. If missing, fallback to global default pricing (`branchId = null` and `batchId = null`).
    The same hierarchical fallback applies to `CourseDiscount` resolution.

### 3. API Delivery
*   Zod validation checks flat amount bounds (> 0) and OMR three-decimal limits.
*   Permissions checks: `course.pricing.override` to configure overrides or discounts.

## Risks / Trade-offs

- **Performance of Overlap Check:** Running overlap queries on pricing ranges requires sequential checks. We address this using composite index keys and pessimistic write-locking during aggregate mutations.
