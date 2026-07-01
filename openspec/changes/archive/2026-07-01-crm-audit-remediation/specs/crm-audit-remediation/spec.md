## ADDED Requirements

### Requirement: CRM Overdue Follow-up Notification Engine
The system MUST include a scheduled background worker service that evaluates all scheduled CRM follow-ups against the current timestamp to detect overdue tasks.
- When an overdue follow-up is detected, the service MUST automatically transition its status from `Scheduled` to `Overdue` or log an explicit `LeadNote` stating it is overdue.
- The service MUST execute without requiring manual triggering by an admin or counselor.
- The background execution MUST NOT bypass data integrity constraints or leak cross-branch data.

#### Scenario: Follow-up becomes overdue
- **WHEN** the current system time exceeds the `followUpDate` of a `LeadFollowUp` record in `Scheduled` status
- **THEN** the system MUST flag the record as overdue, ensuring it is surfaced in the overdue queries and dashboards for the assigned counselor.

### Requirement: Event Naming Synchronization
The system MUST strictly enforce Ubiquitous Language for domain events. The event dispatched (or logged via audit) upon successfully converting a lead MUST be named `LeadConverted`. Note: For Phase 1, `lead-conversion-orchestrator` orchestrates the creation of the `Student` and `Admission` aggregates synchronously via a cross-module interactive transaction rather than asynchronously consuming the outbox event.

#### Scenario: Lead is Won
- **WHEN** a CRM counselor successfully updates a lead stage to `Won`
- **THEN** the `lead-conversion-orchestrator` MUST successfully seed the `Student` and `Admission` aggregates synchronously in an interactive transaction.
- **AND THEN** the system MUST log the `LeadConverted` action in the audit log (and optionally publish the `LeadConverted` domain event via the outbox pattern).
