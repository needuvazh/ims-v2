## Context

ASTI requires a robust system to manage B2B client corporate accounts and credit limits. Currently, the database contains models for `CorporateAccount` and `CorporateCreditRule` (under the finance mappings), but there are no admin portal screens, actions, or validation hooks implemented. To support contract setups and candidate enrollments, we need a complete directory, creation, edit, and 360-degree cockpit view.

## Goals / Non-Goals

**Goals:**
*   Implement `/corporate-training/accounts` directories with paginated search (supporting filter scopes for Branch, Status, and Billing cycle).
*   Create account creation and update forms utilizing Zod resolver validations and react-hook-form.
*   Implement `/corporate-training/accounts/[id]` 360-degree cockpit detailing:
    *   Client Operational Overview.
    *   Dynamic Credit Exposure calculations (Outstanding + Committed vs Limit) referencing Finance projections.
*   Enforce strict server-side Branch Scoping isolation.

**Non-Goals:**
*   Writing/mutating financial invoice tables from the corporate training context. Invoice creations and payment recordings remain strictly within the Finance module paths.
*   Building external corporate client portal login portals or coordinators' views (out of scope for Phase 1 admin cockpit).

## Decisions

1.  **Read-Only Projections for Financial States**:
    *   Instead of duplicating the ledger balance within CTM, CTM will query the `finance_corporate_credit_rules` table dynamically to fetch the `currentOutstanding`, `committedAmount`, and `availableCredit` to display credit metrics and run validation checks.
2.  **Validation Middleware & API guards**:
    *   Enforce RBAC permissions: `corporate-training.account.read` for viewing, `corporate-training.account.create` for new creations, and `corporate-training.account.write` for modifications.
    *   Enforce branch scoping by checking request session active branch tags.
3.  **Thin Next.js Route Adapters**:
    *   Direct database reads can be done in Next.js Server Components, but mutations must use server actions mapped to clean Zod schemas, keeping controller logic isolated from business rule evaluations.

## Risks / Trade-offs

*   **Risk**: Desynchronization between CTM and Finance contexts regarding outstanding credit rules.
*   **Mitigation**: Standardize all credit balance evaluations onto the unified `finance_corporate_credit_rules` table, which is updated whenever invoices or payments are committed in the Finance context.
