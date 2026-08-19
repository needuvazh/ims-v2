## Context

Training coordinators need a structured way to register points of contact for B2B accounts. A coordinator contains a relation to a unique `Person` record. In our implementation, we must prevent duplicate `Person` entries by searching by National ID (Civil Number).

## Goals / Non-Goals

**Goals:**
*   Implement B2B contact lists inside the Corporate Account 360 cockpit view.
*   Enforce a single primary contact constraint per account.
*   Implement Person resolution using `nationalId` (Civil Number).
*   Implement form modals to add/edit coordinators validating input fields with react-hook-form Zod resolvers.

**Non-Goals:**
*   Providing self-service portal interfaces (signups, logins) for corporate coordinators (client portal is out of scope for Phase 1 admin cockpit).

## Decisions

1.  **Identity Resolution Criteria**:
    *   Query `Person` record using `nationalId` to match unique profiles. If a matching person is found, reuse that record (and update mobile/email if they are updated in the form payload) instead of writing a new Person record.
2.  **Primary Contact Enforcer**:
    *   Unsetting other primary designations when setting a new primary contact. Wrap these actions inside database transaction blocks (`tx`) to prevent concurrency locks.
3.  **Thin Server Actions Delivery**:
    *   Next.js route handlers will call server actions directly, performing permission validations (`corporate-training.contact.create`) and scoping validations.

## Risks / Trade-offs

*   **Risk**: Key identities like `nationalId` might not be provided for all coordinators.
*   **Mitigation**: Enforce validation rules on the client-side form requiring National ID for all additions.
