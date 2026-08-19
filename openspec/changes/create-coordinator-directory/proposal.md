## Why

Currently, there is no dashboard interface to manage corporate point of contacts (coordinators) for corporate accounts in Module 14. Training coordinators need to list coordinators, assign designations/departments, mark a primary contact, and toggle portal permissions. Additionally, this creation flow must support Person resolution using national ID civil numbers to avoid duplicate Person profiles in the database.

## What Changes

1.  **Server Actions for Contacts Directory**:
    *   Implement actions to query, create, update, deactivate, toggle portal access, and toggle primary status of corporate contacts.
    *   Build Person resolution based on a Civil Number/National ID match.
2.  **Point of Contacts Tab panel View**:
    *   Extend `/corporate-training/accounts/[id]` with a "Contacts Directory" listing view.
    *   Build an "Add Coordinator Contact" modal panel supporting reactive Zod validation checks (including National ID).
    *   Provide inline actions to toggle primary contact settings, portal access eligibility, and deactivation.

## Capabilities

### New Capabilities
- `coordinator-directory`: Manage B2B client coordinator Point of Contacts, resolving identities via National ID and managing single primary contact constraints.

### Modified Capabilities

## Impact

*   **Bounded Contexts**: Organization Management, Corporate Training Management, Identity & Access Management (portalAccessEnabled flag).
*   **Database Tables**: `CorporateContact`, `Person`, `CorporateAccount`.
*   **Permissions**: `corporate-training.contact.create`, `corporate-training.contact.write`, `corporate-training.contact.read`.
