## Context

During a strict architectural audit against the IMS DDD Context Map and FRD Module 03, we identified two actionable discrepancies in the Lead & CRM implementation:
1. The domain event for converting a lead was named `LeadConvertedToAdmission` instead of `LeadConverted`, violating Ubiquitous Language.
2. The Overdue Follow-ups background scheduler (FR-LEAD-012) was not implemented, even though the database query logic (`findAllScheduledOverdue`) exists in the repository.

## Goals / Non-Goals

**Goals:**
- Sync the domain event name (`LeadConverted`) across the emitting side (`crm-leads`) and consuming side (`admissions-enrollment`).
- Implement a background service (`FollowUpSchedulerService`) in `crm-leads` to run daily and flag overdue follow-ups, dispatching system alerts.

**Non-Goals:**
- We are NOT implementing Counselor Auto-Assignment (FR-LEAD-009) in this change. It is deferred.

## Decisions

1. **Event Name Update**: We will do a direct rename of `LeadConvertedToAdmission` to `LeadConverted` in:
   - `packages/crm-leads/src/application/lead-service.ts`
   - `packages/admissions-enrollment/src/application/lead-conversion-orchestrator.ts`
2. **Background Worker Logic**: We will create a `FollowUpSchedulerService` that fetches records via `findAllScheduledOverdue()`. For each record, it will log a system `LeadNote` stating "Follow-up is overdue" and potentially emit an `OverdueFollowUpDetected` domain event if notifications are wired up. For now, updating the status to "Overdue" (if such a status exists) or logging the note suffices to fulfill the FRD.

## Risks / Trade-offs

- **Risk**: Modifying the event name could break conversion if we miss updating the event subscriber in `admissions-enrollment`. We must ensure both publisher and subscriber are updated in the same PR.
