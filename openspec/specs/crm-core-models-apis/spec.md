# CRM Core Models & Base APIs

This specification defines the core data models, validation rules, business logic, and API endpoints for managing raw inquiries, prospects (leads), scheduled follow-ups, and admissions handoff.

## Requirements

### Requirement: crm.inquiry.capture
The system MUST provide a secure mechanism to capture raw customer inquiries from web forms, walk-ins, and other lead sources.

#### Scenario: Successful Inquiry Capture
- **WHEN** A valid inquiry payload (branchId, firstName, lastName, mobile, email, source) is received.
- **THEN** The system MUST normalize the phone number (strip spaces/hyphens/parentheses, replace `00` with `+`, and normalize 11-digit Omani prefixes starting with `9687`/`9689` to start with `+968`).
- **AND** Generate a unique inquiry number using pattern `INQ-{YYYY}-{BRANCH_CODE}-{5_DIGIT_SERIAL}`.
- **AND** Persist the Inquiry in the database, and write a `WebsiteInquirySubmitted` (for API) or `InquiryCreated` (for manual) event to the transactional outbox.

#### Scenario: Duplicate Inquiry Detection
- **WHEN** An inquiry is captured with a mobile number or email that has already been registered in the same branch within the last 30 days.
- **THEN** The system MUST flag the new inquiry as `isDuplicate: true` and link it to the prior inquiry via `duplicateRefId`.

---

### Requirement: crm.inquiry.promote
Users with appropriate permissions MUST be able to promote a raw Inquiry to a formal Lead.

#### Scenario: Promoting Inquiry to Lead
- **WHEN** A user requests promotion of a valid Inquiry, specifying the branchId, interestedCourseId, and optionally a counselorId.
- **THEN** The system MUST search for an existing `Person` record by email or mobile.
- **AND** IF a match is found, reuse the existing `Person.id` (to avoid unique index violations on mobile/email).
- **AND** IF no match is found, create a new `Person` record in the database.
- **AND** Create a Lead record linked to that `Person` with stage `New` and status `Active` (RecordStatus).
- **AND** Set the Inquiry status to "Qualified" (read-only).
- **AND** Write `InquiryQualified` and `LeadCreated` events to the outbox.

---

### Requirement: crm.lead.lifecycle
The system MUST support base CRUD operations, stage progression, and counselor assignment for Leads.

#### Scenario: Assign Counselor
- **WHEN** A manager assigns a counselor to a lead.
- **THEN** The system MUST verify the counselor is active in that branch, update `counselorId` on the lead, and write a `LeadAssigned` event to the outbox.
- **AND** Reassign all pending `Scheduled` follow-ups to the newly assigned counselor.

#### Scenario: Optimistic Concurrency Control
- **WHEN** A user updates a Lead stage.
- **THEN** The system MUST verify that the request payload `version` matches the Lead's current `version` in the database.
- **AND** Increment the `version` field on successful update.
- **AND** Fail with `ERR_CRM_CONCURRENCY_VIOLATION` if the versions do not match.

#### Scenario: Lead stage transition to Lost
- **WHEN** A user transitions a lead stage to "Lost".
- **THEN** The request MUST fail validation if a valid `lostReasonCode` is not provided, or if `lostReasonNotes` contains less than 15 characters.
- **AND** The system MUST prevent transitioning to "Lost" if the lead is currently in "Converted" or "Won" stages.
- **AND** The system MUST persist the lost reason, cancel all outstanding `Scheduled` follow-ups for this lead, log the transition into the dedicated `LeadStageHistory` table, and write a `LeadLost` event to the outbox.

#### Scenario: Lead stage transition to Won & Admissions Handoff
- **WHEN** A user transitions a lead stage to "Won".
- **THEN** The system MUST validate Won preconditions: email and phone are valid, interested course is active, birthdate (`dateOfBirth` on `Person`) is not null, and at least one active document of type `CIVIL_ID_FRONT` or `PASSPORT_SCAN` is uploaded.
- **AND** The system MUST call the Admissions context's `createAdmissionFromLead(leadId, tx)` synchronously inside the transaction to create a student profile and admission record.
- **AND** Transition the lead stage to `Converted`.
- **AND** Cancel all outstanding `Scheduled` follow-ups for this lead.
- **AND** Write `LeadWon` and `LeadConvertedToAdmission` events to the outbox.


#### Scenario: Stage history logging
- **WHEN** Any lead stage transition is performed.
- **THEN** The system MUST create a transition log record in the dedicated `LeadStageHistory` table capturing `leadId`, `oldStage`, `newStage`, `performedBy`, `performedAt`, and lost reason fields (if transitioning to Lost).

---

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

---

### Requirement: crm.lead.notes
The system MUST support capturing multiple timeline notes regarding a Lead.

#### Scenario: Add Timeline Note
- **WHEN** A user submits a timeline note content for a lead.
- **THEN** The system MUST save the note into the dedicated `LeadNote` table linked to the lead and creator.
- **AND** The note MUST be immutable and not support updates or edits.

---

### Requirement: crm.lead.followup
The system MUST allow counselors to schedule follow-up actions and record outcomes using RESTful sub-resource structures.

#### Scenario: Schedule Follow Up
- **WHEN** A counselor schedules a follow-up action (Call, WhatsApp, Email, Visit).
- **THEN** The system MUST validate that the `followUpDate` is set in the future (current time + 5 minutes).
- **AND** Persist the follow-up record with status `Scheduled` under route `/api/v1/crm/leads/{id}/follow-ups`.

#### Scenario: Record Follow Up Outcome
- **WHEN** A counselor completes a follow-up action and records the outcome (Answered, Busy, SwitchedOff, NoResponse, NotInterested, Interested, VisitScheduled).
- **THEN** The system MUST update the follow-up status to "Completed", log the outcome notes, and write a `FollowUpCompleted` event.
- **AND** IF the `scheduleNext` flag is set to `true`, validate and schedule the next follow-up under route `/api/v1/crm/leads/follow-ups/{id}`.

---

### Requirement: crm.security.masking
The system MUST protect prospect contact details and enforce audited unmasking request policies.

#### Scenario: Default Masked Contact Details
- **WHEN** A user requests a list or detail view of inquiries or leads.
- **THEN** The system MUST mask PII fields (`email`, `phone`, `mobile`, `nationalId`) by default in the response DTO.

#### Scenario: Reveal PII Auditing
- **WHEN** A user with `lead.reveal_pii` permission requests unmasked contact details via `/api/v1/crm/leads/{id}/reveal-pii`.
- **THEN** The system MUST log the access event details (User ID, Lead ID, revealed field, timestamp, and reason) to the `AuditLog` table using Muscat Time (GST, UTC+4) under zero-PII logging rules (no raw values stored in logs).
- **AND** Return the unmasked value in the response DTO.
