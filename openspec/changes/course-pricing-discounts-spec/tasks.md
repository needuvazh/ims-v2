## 1. Database Schema Setup

- [ ] 1.1 Add `CoursePricing` model to `schema.prisma`.
- [ ] 1.2 Add `CourseDiscount` model to `schema.prisma`.
- [ ] 1.3 Add `CourseCompletionRule` model to `schema.prisma`.
- [ ] 1.4 Configure composite index `@@index([courseId, branchId, customerType, batchType, status])` on `CoursePricing`.
- [ ] 1.5 Generate and run migrations.

## 2. Domain & Application Logic (packages/course-catalog)

- [ ] 2.1 Implement `course.addPricingRule(pricingInput)` aggregate method in `Course` class, handling Superseded transitions.
- [ ] 2.2 Implement `course.addDiscount(discountInput)` aggregate method in `Course` class.
- [ ] 2.3 Implement `course.configureCompletionRules(rulesInput)` aggregate method in `Course` class.
- [ ] 2.4 Implement the hierarchical pricing and discount resolver service (`resolveCoursePricing`).
- [ ] 2.5 Update repository mappings to include configurations relations when loading the Course aggregate.

## 3. API Delivery

- [ ] 3.1 Implement API route `POST /api/v1/courses/:id/pricing` with validation schemas, default tax VAT 5.000%, and permission checks.
- [ ] 3.2 Implement API route `POST /api/v1/courses/:id/discounts` with permission checks and Zod schemas.
- [ ] 3.3 Implement API route `POST /api/v1/courses/:id/completion-rules` with validation check.
- [ ] 3.4 Implement internal API route `GET /api/v1/courses/:id/resolve-pricing` to query resolved pricing.
- [ ] 3.5 Implement retrieval GET endpoints for pricing overrides, discounts, and completion rules.

## 4. UI Configuration Panel

- [ ] 4.1 Implement `CRS-SCR-003` (Course Configuration Panel) in admin portal, with left vertical tabs.
- [ ] 4.2 Build **Pricing Override Modal** and **Discount Configuration Modal** with fields, error helpers, and disabled states.
- [ ] 4.3 Implement currency presentation formats (prefix "OMR " in LTR and suffix " ر.ع." in RTL).
- [ ] 4.4 Implement overlaps check alerts dialog warnings.

## 5. Automated Tests

- [ ] 5.1 Write unit tests for aggregate methods verifying rules versioning and date-range deactivations.
- [ ] 5.2 Write integration tests for API endpoints verifying currency precision and override permission blocks.
- [ ] 5.3 Write Playwright tests verifying configurations tabs switching and modal validation feedback.

## 6. Project Status Updates

- [ ] 6.1 Update `docs/project-status.md` progress details.
