## 1. Database Schema Setup

- [x] 1.1 Add `ConfigStatus` enum (`Draft`, `Active`, `Inactive`, `Superseded`) to `schema.prisma`.
- [x] 1.2 Add `CoursePricing` model to `schema.prisma` with `status` field typed as `ConfigStatus`, and include `isTaxExempt` (Boolean, default false), `taxExemptionReason` (String, nullable), and `taxExemptionCode` (String, nullable).
- [x] 1.3 Add `CourseDiscount` model to `schema.prisma` with `status` field typed as `ConfigStatus`.
- [x] 1.4 Add `CourseCompletionRule` model to `schema.prisma` with `status` field typed as `ConfigStatus`.
- [x] 1.5 Add `batchType` (String, default "Regular") to the `Batch` model in `schema.prisma` to prevent breaking existing seeds/tests.
- [x] 1.6 Configure composite indexes `@@index([courseId, branchId, customerType, batchType, status])` and `@@index([courseId, batchId, customerType, batchType, status])` on `CoursePricing`.
- [x] 1.7 Generate and run Prisma migrations.

## 2. Domain & Application Logic

### training-delivery Context
- [x] 2.1 Add `batchType` to the `Batch` aggregate state interface in `packages/training-delivery/src/domain/batch.ts`.
- [x] 2.2 Map `batchType` in `BatchRepository` create/update actions, defaulting it to `"Regular"` (preserving existing waitlist tests).

### course-catalog Context
- [x] 2.3 Add dedicated repository interfaces in `packages/course-catalog/src/domain/repositories.ts`:
    - `ICoursePricingRepository`
    - `ICourseDiscountRepository`
    - `ICourseCompletionRuleRepository`
- [x] 2.4 Implement separate configurations services (`CoursePricingService`, `CourseDiscountService`, `CourseCompletionRuleService`) to isolate mutations and keep `CourseRepository` transactions lightweight.
- [x] 2.5 Implement aggregate collision and sequential superseding logic (deactivating overlapping active rows to `Superseded` only if `newRule.effectiveStartDate > existingRule.effectiveStartDate`).
- [x] 2.6 Normalize date-only queries to Gulf Standard Time (UTC+4) boundaries inside the Application layer.
- [x] 2.7 Implement hierarchical query pricing and discount resolver (`resolveCoursePricing`) matching batch override -> branch override -> global default.
- [x] 2.8 Update `CourseService.transitionCourseStatus` publish validation to verify pricing and completion rule existence *as of the publish date* using the resolver contract.

## 3. API Delivery

- [x] 3.1 Implement API route `POST /api/v1/courses/:id/pricing` (enforcing `course.catalog.create` for global defaults, `course.pricing.override` for branch overrides).
- [x] 3.2 Implement API route `POST /api/v1/courses/:id/discounts` (enforcing `course.pricing.override` permission).
- [x] 3.3 Implement API route `POST /api/v1/courses/:id/completion-rules` (enforcing `course.catalog.create` permission).
- [x] 3.4 Implement resolver API route `GET /api/v1/courses/:id/pricing/resolve` (resolving pricing and discounts, returning them in a unified DTO).
- [x] 3.5 Implement active completion rules API route `GET /api/v1/courses/:id/completion-rules/active`.
- [x] 3.6 Implement search/retrieval endpoints for configurations.

## 4. UI Configuration Panel

- [x] 4.1 Build `CRS-SCR-003` configuration tabs.
- [x] 4.2 Build pricing override drawer containing conditional tax-exemption validation fields, and discount configuration drawer.
- [x] 4.3 Support currency LTR/RTL OMR formatting.

## 5. Automated Tests

- [x] 5.1 Write unit tests for configs aggregate rules (collision checks, sequential deprecation, GST date normalization).
- [x] 5.2 Write integration tests for API routes verifying permissions boundaries (`course.catalog.create` vs `course.pricing.override`) and DTO shapes.
- [x] 5.3 Write Playwright flows validating configs UI tabs.
- [x] 5.4 Verify that database seeding and waitlist tests continue to execute successfully.

## 6. Project Status Updates

- [x] 6.1 Update `docs/project-status.md` progress details.
