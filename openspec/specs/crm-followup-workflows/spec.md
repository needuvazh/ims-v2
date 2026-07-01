# CRM Follow-up Workflows & Event Processing

This specification defines the asynchronous and background workflows for follow-ups, including auto-assignment of incoming web inquiries, composite outcome logging and scheduling, and background overdue evaluation.

## Purpose
TBD

## Requirements

### Requirement: crm.workflows.inquiry_auto_assign
The system MUST automatically route incoming website inquiries to active counselors within the same branch, ensuring an even distribution of the active lead workload.

#### Scenario: Auto-Assign Website Inquiry
- **WHEN** A `WebsiteInquirySubmitted` event is processed by the background worker.
- **THEN** The system MUST query the Identity & Access bounded context via its public application service interface (`IamQueryService`) for all active users holding the `Counselor` role mapped to the inquiry's `branchId`.
- **AND** The system MUST query the CRM context to count the number of active, non-terminal leads (stages other than `Converted`, `Won`, or `Lost`, and not soft-deleted) assigned to each of those counselors.
- **AND** The system MUST allocate the inquiry to the counselor with the lowest workload.
- **AND** IF multiple counselors share the same lowest workload, the system MUST select one counselor at random.
- **AND** The system MUST persist the assigned `counselorId` on the inquiry record and emit a `LeadAssigned` event.

---

### Requirement: crm.workflows.composite_followup_outcome
The system MUST support a composite API operation to securely resolve an existing follow-up and immediately schedule the next one, enforcing optimistic concurrency.

#### Scenario: Record Outcome and Schedule Next
- **WHEN** A counselor submits a request to `/api/v1/crm/leads/follow-ups/{id}` with an outcome, `scheduleNext = true`, `nextFollowUpDate`, and the parent Lead's current `version`.
- **THEN** The system MUST validate that the `nextFollowUpDate` is at least 5 minutes in the future.
- **AND** The system MUST open a transaction and attempt to update the Lead record with `version = payload.version`. 
- **AND** IF the Lead update affects 0 rows, the system MUST rollback the transaction and fail with `ERR_CRM_CONCURRENCY_VIOLATION`.
- **AND** The system MUST mark the current follow-up as `Completed`.
- **AND** The system MUST create a new `Scheduled` follow-up.
- **AND** The system MUST denormalize the `nextFollowUpDate` onto the Lead aggregate.
- **AND** The system MUST emit a `FollowUpCompleted` event to the outbox.

---

### Requirement: crm.workflows.overdue_followup_alerts
The system MUST run an hourly background job to evaluate overdue scheduled follow-up tasks and alert counselors.

#### Scenario: Fire Overdue Alerts
- **WHEN** The background cron executes hourly.
- **THEN** The system MUST query all follow-up records with status `Scheduled` where `followUpDate` is older than `current_time - 60 minutes` (excluding soft-deleted leads and leads in terminal stages Converted, Won, or Lost).
- **AND** For each matching record, the system MUST update the follow-up record's status to `Missed`, recalculate the parent Lead's `nextFollowUpDate` based on its remaining scheduled follow-ups, and write a `FollowUpOverdue` event to the outbox within the same transaction.
