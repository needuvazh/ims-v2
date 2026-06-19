---
name: ims-finance-audit-rules
description: Apply IMS manual payment, receipt, discount, refund, due calculation, approval hierarchy, audit log, and outbox rules. Use for any finance or fee-collection workflow change.
---

# IMS Finance and Audit Rules

Use this skill for fee collection, dues, discounts, refunds, and receipt logic.

## Model the flow

1. Identify the fee plan, installment plan, and enrollment fee account.
2. Decide how dues are calculated.
3. Determine whether the action is recording payment, issuing receipt, applying discount, or approving refund.
4. Attach the required audit entry and domain event.

## Rules

- Manual payment is a first-class workflow.
- Receipt generation follows successful payment recording.
- Discounts and refunds require explicit approval rules.
- Do not let payment gateway automation leak into Phase 1 finance behavior.
- Any change to dues, receipts, discounts, or refunds must be auditable.

## Output

Return:

- finance command name
- invariant
- approval chain
- audit record
- domain event
- test cases for success, denial, and reversal paths

