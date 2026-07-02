## MODIFIED Requirements

### Requirement: crm.lead.lifecycle
The system MUST support base CRUD operations, stage progression, and counselor assignment for Leads.

#### Scenario: Lead stage transition to Won & Admissions Handoff
- **WHEN** a user transitions a lead stage to "Won"
- **THEN** the system MUST validate Won preconditions: email and phone are valid, interested course is active, birthdate (`dateOfBirth` on `Person`) is not null, and at least one active document of type `CIVIL_ID_FRONT` or `PASSPORT_SCAN` is uploaded.
- **AND** the system MUST call the Admissions context's `createAdmissionFromLead(leadId, tx)` synchronously inside the transaction to create or reuse the linked person record, create the student profile, and create the admission record.
- **AND** Transition the lead stage to `Converted`.
- **AND** Cancel all outstanding `Scheduled` follow-ups for this lead.
- **AND** Write `LeadWon` and `LeadConvertedToAdmission` events to the outbox.
