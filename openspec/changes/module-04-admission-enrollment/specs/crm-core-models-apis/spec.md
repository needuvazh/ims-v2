## MODIFIED Requirements

### Requirement: crm.lead.lifecycle
The system MUST support base CRUD operations, stage progression, and counselor assignment for Leads.

#### Scenario: Lead stage transition to Won & Admissions Handoff
- **GIVEN** the user has the required "lead.convert" permission and access to the lead's branch scope
- **WHEN** a user transitions a lead stage to "Won" (via lead conversion)
- **THEN** the system MUST validate lead-facing Won preconditions: email and phone are valid, birthdate (`dateOfBirth` on `Person`) is not null, and at least one active document of type `CIVIL_ID_FRONT` or `PASSPORT_SCAN` is uploaded.
- **AND** the system MUST initiate the Admissions handoff inside an interactive database transaction to create or reuse the linked person record, create or reuse the student profile, and create the admission record.
- **AND** Transition the lead stage to `Converted`.
- **AND** Cancel all outstanding `Scheduled` follow-ups for this lead.
- **AND** Write `LeadWon` and `LeadConverted` events to the outbox.

#### Scenario: Lead conversion with existing StudentProfile reuse
- **WHEN** a lead is converted and the linked `Person` already has an existing `StudentProfile`
- **THEN** the system SHALL reuse that existing `StudentProfile` and its student number instead of creating a duplicate profile.

#### Scenario: Reject conversion if active admission exists
- **WHEN** a lead conversion is initiated for a student who already has an active admission (status is 'Draft' or 'Submitted') in the target branch
- **THEN** the system SHALL reject the conversion with error code "ERR_ADM_ACTIVE_ADMISSION_EXISTS".

#### Scenario: Conversion response shape
- **WHEN** the conversion completes successfully
- **THEN** the system MUST return the generated or reused `studentProfileId` and `admissionId` references in the response payload.

#### Scenario: Rollback on handoff failure
- **WHEN** any error occurs during lead conversion validation, person/profile resolution, admission draft creation, document registration, or outbox writes
- **THEN** the system MUST roll back the entire transaction atomically, leaving the lead stage, follow-up statuses, and database state unchanged.
