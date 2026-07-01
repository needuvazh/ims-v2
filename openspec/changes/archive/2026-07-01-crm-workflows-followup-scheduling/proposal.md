## Why

The current CRM foundations (introduced in Change 1: `crm-core-models-apis`) persist FollowUp entities but lack the automated business workflows required by the FRD (Module 03). Without these workflows, manual follow-up scheduling does not automatically advance lead stages, denormalize next-follow-up dates for performant UI filtering, or automatically distribute ingested web inquiries to branch counselors based on workload. This change resolves those gaps, ensuring a reliable state machine, protecting against concurrency issues during composite follow-up actions, and enabling scalable workload management for the admissions team.

## What Changes

1. **Denormalization of `nextFollowUpDate`**: Synchronous updates to the `Lead` aggregate whenever a follow-up is scheduled or resolved, preventing expensive UI joins.
2. **Automated Stage Progression**: The `scheduleFollowUp` service will automatically transition a `New` or `Contacted` lead to the `FollowUp` stage.
3. **Auto-Assignment Worker**: A background subscriber to the `WebsiteInquirySubmitted` domain event to automatically distribute leads to counselors with the lowest active load within the respective branch.
4. **Concurrency Safety**: Strict transactional boundaries for the composite "Complete Follow-up & Schedule Next" operation, enforcing optimistic locking on the parent `Lead` aggregate.
5. **Validation of Past Dates**: Strict business rule enforcement rejecting follow-ups scheduled in the past.

## Capabilities

### New Capabilities
- `crm-followup-workflows`: Orchestrates the background jobs for auto-assigning leads and handles composite follow-up scheduling transactions.

### Modified Capabilities
- `crm-core-models-apis`: Updates the `Lead` aggregate behavior to maintain `nextFollowUpDate` and enforces automated stage transitions when follow-ups are scheduled.

## Impact

*   **Owning Context**: Lead, Enquiry & CRM Management
*   **Affected Contexts**: 
    *   *Identity & Access* (for fetching active counselor lists and workloads per branch).
*   **Data Ownership**: `Lead`, `FollowUp`, `LeadStageHistory`.
*   **Performance Impact**: Eliminates `JOIN`s on the `FollowUp` table for "Due Today" UI queries.
*   **Concurrency Impact**: Mitigates race conditions by enforcing optimistic concurrency checking on `Lead.version` during composite follow-up mutations.
*   **Event/Outbox Impact**: Introduces background worker subscription for `WebsiteInquirySubmitted` and automatically emits `LeadAssigned` and `LeadStageChanged` events.
