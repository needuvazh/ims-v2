## Context

The Lead & CRM Workflows require robust business logic to ensure counselors can effectively engage prospects. Our initial CRM architecture (from Change 1) focused heavily on models and base APIs but left workflow enforcement open. Specifically, follow-up scheduling does not automatically manage the Lead's overarching lifecycle stage or expose a denormalized timestamp for fast UI queries. Additionally, inbound website inquiries currently bypass active counselor load balancing, creating an administrative bottleneck.

## Goals / Non-Goals

**Goals:**
*   Implement `nextFollowUpDate` denormalization on the Lead aggregate for performant "Due Today" UI rendering.
*   Enforce automatic lead stage progression to `FollowUp` when a new follow-up is scheduled and the lead is in the `New`, `Contacted`, or `Lost` stage.
*   Introduce an hourly background cron job to audit overdue follow-ups, trigger real-time notification events, and flag negligence.
*   Introduce a background worker job to automatically distribute ingested `WebsiteInquiry` records to counselors based on their active workload.
*   Secure composite operations ("Log Outcome" + "Schedule Next") with strict optimistic concurrency checking.
*   Cascade soft-deletes of Leads to automatically cancel all outstanding scheduled follow-up records.

**Non-Goals:**
*   Automatic email/SMS dispatch (this is deferred to the Communication Management phase).
*   AI-based lead scoring or sentiment analysis.
*   Complex round-robin or skill-based routing rules (simple "lowest load in branch" workload balancing is sufficient).

## Decisions

1.  **Denormalization Strategy**:
    *   We will add a `nextFollowUpDate` (DateTime, nullable) field to the `Lead` Prisma model.
    *   The `scheduleFollowUp` application service will synchronize this field when inserting the new `Scheduled` follow-up record.
    *   The `logFollowUpOutcome` application service will clear or update this field based on the `scheduleNext` boolean parameter within the same database transaction.

2.  **State Machine Progression**:
    *   When `scheduleFollowUp` is invoked, it checks `Lead.stage`.
        *   If stage is `New` or `Contacted`, it automatically transitions the stage to `FollowUp`.
        *   If stage is `Lost`, `Won`, or `Converted`, it explicitly blocks the operation and throws `ERR_CRM_INVALID_STAGE_TRANSITION`.
    *   A `LeadStageHistory` entry will be inserted in the same transaction to preserve the audit trail.
    *   A `LeadStageChanged` outbox event is emitted.

3.  **Auto-Assignment Worker & Tie-Breaker**:
    *   We will subscribe to the `WebsiteInquirySubmitted` event via our background job worker.
    *   The handler will:
        1. Fetch all active users with the `Counselor` role mapped to the inquiry's `branchId` via a public IAM interface (e.g., `IamQueryService`).
        2. Query the `Lead` table to count active, non-terminal leads (`stage NOT IN ('Converted', 'Lost', 'Won') AND isDeleted = false`) for each counselor.
        3. Allocate the inquiry to the counselor with the lowest workload.
        4. If multiple counselors share the same lowest load count, the system will select one counselor at random (Tie-Breaker: Option B).
        5. Persist the `counselorId` on the inquiry record and emit a `LeadAssigned` event.

4.  **Overdue Follow-ups Background Job**:
    *   An hourly background task will run to sweep the `LeadFollowUp` table.
    *   It will query for all follow-up records with status `Scheduled` where `followUpDate` is older than `current_time - 60 minutes`.
    *   For each record, it will update the status to `Missed` (or `Overdue`) and write a `FollowUpOverdue` event to the outbox within the same transaction to guarantee idempotency.

5.  **Optimistic Concurrency Control**:
    *   API endpoints handling follow-up composite mutations MUST accept a `version` parameter in the payload.
    *   The Prisma `$transaction` will assert `where: { id: leadId, version: payload.version }` when updating the Lead. If 0 rows are affected, we throw `ERR_CRM_CONCURRENCY_VIOLATION`.

6.  **Terminal State & Deletion Cascade**:
    *   We will update the `deleteLead`, `markLeadLost`, `markLeadWon`, and `convertLead` transactions inside the Lead application service to automatically invoke `cancelAllScheduled` on the follow-up repository, ensuring that deleted or closed leads do not accumulate overdue task alerts.

## Risks / Trade-offs

*   **Risk**: Concurrency collisions could frustrate users if multiple counselors try to log outcomes on the same lead simultaneously.
    *   *Mitigation*: Ensure the UI handles `ERR_CRM_CONCURRENCY_VIOLATION` gracefully, prompting the user to refresh and review the updated timeline before retrying.
*   **Trade-off**: The load-balancing query for auto-assignment could become slightly expensive if branch counselor counts grow massive.
    *   *Mitigation*: For Phase 1, `COUNT()` queries filtered by branch and active status on the `leads` table are fast enough. If performance degrades, we will introduce a read-model projection for counselor active loads.
