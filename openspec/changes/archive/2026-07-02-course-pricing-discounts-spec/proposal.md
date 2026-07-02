## Why

ASTI needs to configure base prices, tax policies, branch-level pricing overrides, completion rules, and discount configurations (percentage or fixed amount) for training courses. 
This configuration directly impacts enrollment invoicing, tax calculations, and student graduation eligibility verification.

## What Changes

We will introduce pricing, completion rule, and discount models and configuration APIs. This includes validation rules for non-overlapping date ranges, currency OMR rules, tax exemption metadata, and supervisor override approvals.

## Capabilities

### New Capabilities
- `course-pricing-discounts`: Covers global/branch-level pricing, discounts configurations, and completion rules.

### Modified Capabilities

## Impact

- **Database:** Introduces `CoursePricing`, `CourseDiscount`, and `CourseCompletionRule` models (with status type managed by a new `ConfigStatus` enum, composite indices, and tax-exemption metadata support) and adds `batchType` to the `Batch` model in `schema.prisma`.
- **Backend:** Introduces dedicated repositories (`ICoursePricingRepository`, `ICourseDiscountRepository`, `ICourseCompletionRuleRepository`) and application services to keep transaction boundaries clean. Overlap checks validate collisions vs sequential superseding transitions.
- **API:** Exposes endpoints `POST/GET /api/v1/courses/:id/pricing` (permissions split), `POST/GET /api/v1/courses/:id/discounts`, `POST/GET /api/v1/courses/:id/completion-rules`, `GET /api/v1/courses/:id/pricing/resolve` (unified DTO), and `GET /api/v1/courses/:id/completion-rules/active`.
- **UI:** Implements screen `CRS-SCR-003` (Course Configuration Panel with sticky tab navigation and modals) in the admin portal.
