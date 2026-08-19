## Why

Currently, there is no UI cockpit to manage B2B corporate client accounts and their associated credit control rules within the ASTI Institute Management System. With Module 15 (Sales & Quotations) completed, won opportunity sales orders need a structured repository to land, establish corporate contracts, and validate branch-specific credit exposure. 

Implementing the B2B Corporate Directory and Credit Controls Cockpit satisfies this missing link, enabling training coordinators to register clients, manage account profiles, and perform automated credit checks before downstream candidate enrollments occur.

## What Changes

1.  **B2B Corporate Account Master Directory**:
    *   Create a paginated search list screen for corporate accounts inside `/corporate-training/accounts`.
    *   Create forms to register new accounts and edit operational properties.
2.  **Corporate Credit Controls Integration**:
    *   Expose and manage credit limits (`creditLimit`), branch scope (`branchId`), outstanding balances, and credit block flags (`blockOnCreditLimit`) directly linked to the corporate account.
3.  **360-Degree Cockpit Profile**:
    *   Implement an operationally dense detail page at `/corporate-training/accounts/[id]` projecting active contracts, coordinator directories, and read-only financial invoice lists.

## Capabilities

### New Capabilities
- `corporate-cockpit`: Manage corporate client master directories, credit limits, block flags, and 360-degree account details.

### Modified Capabilities

## Impact

*   **Bounded Contexts**: Organization Management (owns account directory), Corporate Training Management (coordinates profiles), Finance & Receivables (owns outstanding projections and credit balances).
*   **Database Tables**: `CorporateAccount`, `CorporateContact`, `CorporateContract`, `finance_corporate_credit_rules`.
*   **Permissions**: `corporate-training.account.create`, `corporate-training.account.write`, `corporate-training.account.read`.
