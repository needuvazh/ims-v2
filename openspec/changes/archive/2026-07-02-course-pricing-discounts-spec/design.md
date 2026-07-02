## Context

Course configuration requires managing pricing structures, standard discounts, and completion requirements. This design introduces database entities `CoursePricing`, `CourseDiscount`, and `CourseCompletionRule` and their associated endpoints and screens, while extending training delivery's `Batch` model with `batchType` to enable end-to-end pricing resolution.

## Goals / Non-Goals

**Goals:**
- Provide type-safe CRUD APIs for course configuration rules.
- Enforce base pricing and completion rules immutability.
- Validate date-range overlaps, sequential overrides, and OMR decimal boundaries.
- Support branch overrides, customer segments, batch delivery types, and supervisor approval policies.

**Non-Goals:**
- Applying resolved price rules during enrollment invoices (responsibility of the external Finance context).
- Grading student exams or recording attendance (responsibility of Attendance and Completion contexts).

## Decisions

### 1. Database Schema
We will add and modify these models in `packages/database/prisma/schema.prisma`:

*   **Dedicated Status Enum:** To support clean lifecycle management without polluting generic IAM `RecordStatus`, we introduce:
    ```prisma
    enum ConfigStatus {
      Draft
      Active
      Inactive
      Superseded
    }
    ```

*   `CoursePricing`: fields `id`, `courseId` (FK), `branchId` (logical reference, nullable), `batchId` (FK, nullable), `customerType` (Enum: `Individual`, `Corporate`, `WalkIn`), `batchType` (Enum: `Regular`, `FastTrack`, `Weekend`), `currency` (strictly `'OMR'`), `basePrice` (Decimal 12,3, `>= 0`), `taxPercentage` (Decimal 5,3, default `5.000`), `isTaxExempt` (Boolean, default `false`), `taxExemptionReason` (String, nullable), `taxExemptionCode` (String, nullable), `effectiveStartDate` (Date), `effectiveEndDate` (Date, nullable), `status` (`ConfigStatus`, default `Active`), and audit fields.
*   `CourseDiscount`: fields `id`, `courseId` (FK), `branchId` (logical reference, nullable), `batchId` (FK, nullable), `discountType` (Enum: `Individual`, `Corporate`, `EarlyBird`), `discountMode` (Enum: `Percentage`, `FixedAmount`), `discountValue` (Decimal 12,3, `> 0`), `requiresApproval` (Boolean, default `false`), `effectiveStartDate` (Date), `effectiveEndDate` (Date, nullable), `status` (`ConfigStatus`, default `Active`), and audit fields.
*   `CourseCompletionRule`: fields `id`, `courseId` (FK), `minimumAttendancePercent` (Int, `0-100`), `examRequired` (Boolean), `feeClearanceRequired` (Boolean), `manualApprovalRequired` (Boolean), `effectiveStartDate` (Date), `effectiveEndDate` (Date, nullable), `status` (`ConfigStatus`, default `Active`), and audit fields.
*   `Batch`: add `batchType` (String, default `"Regular"`) to capture execution delivery type.
*   Indices: Composite index `@@index([courseId, branchId, customerType, batchType, status])` and `@@index([courseId, batchId, customerType, batchType, status])` on `CoursePricing`.

### 2. Domain & Application Boundaries
*   **Decoupled Repository Boundaries:** To preserve transaction safety and avoid breaking core `course.catalog.update` or `course.catalog.archive` paths, we keep the core `CourseRepository` separate from configuration mutations. We introduce three lightweight configuration repositories and services:
    *   `ICoursePricingRepository` / `CoursePricingService`
    *   `ICourseDiscountRepository` / `CourseDiscountService`
    *   `ICourseCompletionRuleRepository` / `CourseCompletionRuleService`
*   **Aggregate Overlap Invariant:**
    *   If a new configuration overlaps with an existing `Active` configuration and `newStartDate <= oldStartDate`, the system rejects the write with `ERR_CRS_MULTIPLE_ACTIVE_PRICING` (collision block).
    *   If `newStartDate > oldStartDate`, the system updates the old record's `effectiveEndDate` to `newStartDate - 1 day` and its status to `Superseded` (sequential deprecation).
*   **Date comparisons:** Normalize all dates to Gulf Standard Time (UTC+4) boundaries inside the Application layer prior to database date checks.
*   **Publish Validation:** When publishing a course (`Draft` -> `Active`/`Published`), we query pricing and completion rule records matching the publishing date to guarantee that at least one pricing default and completion rule is effective.

### 3. Pricing & Discount Resolution Service
Expose a single query contract for the Billing Engine/Finance context:
*   **Request:** `courseId` (UUID), `branchId` (UUID, optional), `batchId` (UUID, optional), `customerType` (Enum: `Individual`, `Corporate`, `WalkIn`), `batchType` (Enum: `Regular`, `FastTrack`, `Weekend`), and `asOfDate` (Date).
*   **Resolution Logic:**
    1. Resolve `batchType` from `Batch` if `batchId` is provided (if missing, defaults to `"Regular"`).
    2. Resolve pricing:
        - Priority 1: Match `batchId`.
        - Priority 2: Match `branchId` and `batchId = null`.
        - Priority 3: Fallback to global default (`branchId = null` and `batchId = null`).
    3. Resolve discounts: Match active discounts matching the target customer segment (`Individual` maps to `Individual`/`EarlyBird`, `Corporate` maps to `Corporate`) following the same priority hierarchy.
*   **Response DTO:**
    ```typescript
    interface ResolvedPricingResponse {
      courseId: string;
      resolvedBranchId?: string | null;
      customerType: string;
      batchType: string;
      basePrice: number;
      taxPercentage: number;
      isTaxExempt: boolean;
      taxExemptionReason?: string | null;
      taxExemptionCode?: string | null;
      currency: "OMR";
      totalPrice: number;
      effectiveStartDate: string;
      applicableDiscounts: {
        id: string;
        discountType: string;
        discountMode: "Percentage" | "FixedAmount";
        discountValue: number;
        requiresApproval: boolean;
      }[];
    }
    ```

### 4. API & Permissions split
*   **Global configurations & Completion rules:** Requiring catalog creation privileges, protected by `course.catalog.create`.
*   **Branch-scoped overrides & Discounts:** Requiring pricing override privileges, protected by `course.pricing.override`.
*   **Zod schema validation:** Enforces multipleOf 0.001 limits on base prices, tax percentages, flat discounts, and validates that tax-exemption reason/code are provided when `isTaxExempt` is true.
