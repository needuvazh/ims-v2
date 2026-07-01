## Why

ASTI needs to configure base prices, tax policies, branch-level pricing overrides, completion rules, and discount configurations (percentage or fixed amount) for training courses. 
This configuration directly impacts enrollment invoicing, tax calculations, and student graduation eligibility verification.

## What Changes

We will introduce pricing, completion rule, and discount models and configuration APIs. This includes validation rules for non-overlapping date ranges, currency OMR rules, and supervisor override approvals.

## Capabilities

### New Capabilities
- `course-pricing-discounts`: Covers global/branch-level pricing, discounts configurations, and completion rules.

### Modified Capabilities

## Impact

- **Database:** Introduces `CoursePricing`, `CourseDiscount`, and `CourseCompletionRule` models in `schema.prisma`.
- **Backend:** Adds configuration methods inside the `Course` aggregate root and repository persistence mappings.
- **API:** Exposes endpoints `POST/GET /api/v1/courses/:id/pricing`, `POST/GET /api/v1/courses/:id/discounts`, and `POST/GET /api/v1/courses/:id/completion-rules`.
- **UI:** Implements screen `CRS-SCR-003` (Course Configuration Panel with sticky tab navigation and modals) in the admin portal.
