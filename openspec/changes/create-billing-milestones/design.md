## Context

B2B training contracts involve group invoicing milestones. Rather than invoicing candidates individually, the corporate account accumulates confirmed candidate enrollments and bills in bulk. We need a way to flag enrollments as ready for invoicing, and display read-only invoice reports.

## Goals / Non-Goals

**Goals:**
*   Implement billingStatus transitions (`NotRequested` -> `Requested`) on `CorporateEnrollment` records.
*   Display a read-only stats cockpit inside the corporate profile detail page loaded from the Finance bounded context schema (total contract amount, outstanding receivables, collections history).
*   Add action buttons to trigger billing requests in the Participants directory list.

**Non-Goals:**
*   Directly modifying the balance of the `Invoice` schema (handled by the Finance context).

## Decisions

1.  **Request Billing server action**:
    *   Expose `requestCorporateBillingAction(payload: { corporateEnrollmentIds: string[] }, actorId: string)`:
    *   Find the `CorporateEnrollment` records. Ensure `billingStatus === "NotRequested"`.
    *   Transactionally transition status to `Requested`.
    *   Emit a domain event or log audit details.
2.  **Corporate Details 360 Projections**:
    *   Check outstanding invoicing balances in `getCorporateAccountDetailsAction` using prisma group-by queries on `Invoice` schema.

## Risks / Trade-offs

*   **Risk**: requesting billing multiple times on the same enrollment.
*   **Mitigation**: Restrict transition triggers to only occur when `billingStatus === "NotRequested"`.
