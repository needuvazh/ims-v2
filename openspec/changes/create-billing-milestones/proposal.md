## Why

Training coordinators need to request and track B2B billing progression states. Specifically, they need a way to flag group corporate enrollments as "Request Billing" which triggers status transitions in the B2B Cockpit. Additionally, the cockpit requires loading linked invoices, outstanding amounts, and payment receipts from the Finance bounded context projections as read-only dashboards.

## What Changes

1.  **Request Billing Server Action**:
    *   Expose `requestCorporateBillingAction` supporting billingStatus state transitions (`NotRequested` -> `Requested`) on `CorporateEnrollment` records.
2.  **Billing & Invoicing dashboards**:
    *   Integrate billing actions checklist buttons in the Participants tab.
    *   Expose read-only stats inside `/corporate-training/accounts/[id]` detailing total contract values, billing outstanding, and receipts history.

## Capabilities

### New Capabilities
- `billing-milestones`: Request billing milestones, update B2B enrollment billing progression flags, and trace billing states.

### Modified Capabilities

## Impact

*   **Bounded Contexts**: Finance, Corporate Training Management, Admission & Enrollment Management.
*   **Database Tables**: `CorporateEnrollment`, `Invoice`, `Payment`, `CorporateAccount`.
*   **Permissions**: `corporate-training.billing.write`, `corporate-training.billing.read`.
