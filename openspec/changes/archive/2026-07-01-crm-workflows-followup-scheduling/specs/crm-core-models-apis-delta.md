## ADDED Requirements

### Requirement: crm.lead.lifecycle.stage_automation
The system MUST enforce automatic stage progression to ensure leads do not remain in stale states when active follow-ups are scheduled.

#### Scenario: Automated Progression to FollowUp Stage
- **WHEN** A user successfully schedules a new follow-up for a Lead.
- **THEN** The system MUST inspect the current Lead `stage`.
- **AND** IF the stage is `New` or `Contacted`, the system MUST update the stage to `FollowUp`.
- **AND** IF the stage is `Converted`, `Won`, or `Lost`, the system MUST reject the scheduling mutation and throw `ERR_CRM_INVALID_STAGE_TRANSITION`.
- **AND** The system MUST insert a record into the `LeadStageHistory` table.
- **AND** The system MUST emit a `LeadStageChanged` event to the outbox.

---

### Requirement: crm.lead.lifecycle.denormalize_followup
The system MUST denormalize the `nextFollowUpDate` onto the Lead aggregate to enable performant UI dashboard queries without requiring joins on the `FollowUp` table.

#### Scenario: Denormalize Next Follow-up Date on Creation
- **WHEN** A new `Scheduled` follow-up is created for a Lead.
- **THEN** The system MUST synchronously update the `nextFollowUpDate` column on the `Lead` record to match the newly scheduled follow-up's date within the same transaction.

#### Scenario: Recalculate Denormalized Date on Follow-up Completion or Terminal Action
- **WHEN** A follow-up is marked as `Completed` (and `scheduleNext` is false), or a Lead is marked `Lost` or `Won`.
- **THEN** The system MUST query for the next earliest pending `Scheduled` follow-up for the Lead.
- **AND** IF a pending follow-up exists, the system MUST update `nextFollowUpDate` to its date.
- **AND** IF no pending follow-ups exist, the system MUST nullify the `nextFollowUpDate` column on the `Lead` record.

#### Scenario: Recalculate Denormalized Date on Overdue Sweep
- **WHEN** A background sweep job updates an overdue follow-up's status to `Missed`.
- **THEN** The system MUST query for the next earliest pending `Scheduled` follow-up for the Lead.
- **AND** IF a pending follow-up exists, the system MUST update `nextFollowUpDate` to its date.
- **AND** IF no pending follow-ups exist, the system MUST nullify the `nextFollowUpDate` column on the `Lead` record within the same transaction.

