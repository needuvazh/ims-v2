## ADDED Requirements

### Requirement: crm.inquiry.capture
The system MUST provide a secure mechanism to capture raw customer inquiries from web forms, walk-ins, and other lead sources.

#### Scenario: Successful Inquiry Capture
- **WHEN** A valid inquiry payload (branchId, firstName, lastName, mobile, email, source) is received.
- **THEN** The system MUST generate a unique inquiry number, persist the Inquiry in the database, and write a WebsiteInquirySubmitted event to the transactional outbox.

#### Scenario: Duplicate Inquiry Detection
- **WHEN** An inquiry is captured with a mobile number or email that has already been registered in the same branch within the last 30 days.
- **THEN** The system MUST flag the new inquiry as `isDuplicate: true` and link it to the prior inquiry via `duplicateRefId`.

---

### Requirement: crm.inquiry.promote
Users with appropriate permissions MUST be able to promote a raw Inquiry to a formal Lead.

#### Scenario: Promoting Inquiry to Lead
- **WHEN** A user requests promotion of a valid Inquiry, specifying the branchId, interestedCourseId, and optionally a counselorId.
- **THEN** The system MUST resolve or create a Person record in the identity-access system, create a Lead record linked to that Person, set the Inquiry status to "Promoted", and write a LeadCreated event to the outbox.

---

### Requirement: crm.lead.lifecycle
The system MUST support base CRUD operations, stage progression, and counselor assignment for Leads.

#### Scenario: Assign Counselor
- **WHEN** A manager assigns a counselor to a lead.
- **THEN** The system MUST update the counselorId on the lead and write a LeadAssigned event to the outbox.

#### Scenario: Lead stage transition to Lost
- **WHEN** A user transitions a lead stage to "Lost".
- **THEN** The request MUST fail validation if a valid `lostReasonCode` is not provided.
- **AND** The system MUST persist the lost reason and write a LeadLost event to the outbox.

---

### Requirement: crm.lead.followup
The system MUST allow counselors to schedule follow-up actions and record outcomes.

#### Scenario: Record Follow Up Outcome
- **WHEN** A counselor completes a follow-up action and records the outcome (e.g. Answered, NoAnswer, Busy, Rescheduled).
- **THEN** The system MUST update the follow-up status to "Completed", log the outcome notes, and optionally schedule the next follow-up date/time.

---

### Requirement: crm.authorization.scoping
The system MUST enforce strict branch-scoped and counselor-scoped data boundary constraints on all CRM operations.

#### Scenario: Default Counselor Restricted View
- **WHEN** A user with counselor roles who DOES NOT possess the `crm.leads.read.all` permission requests a list of leads or inquiries.
- **THEN** The system MUST only return records where the `counselorId` matches the authenticated user's ID, and where the `branchId` is within the user's active branch assignments.

#### Scenario: Manager Branch-Scoped View
- **WHEN** A user who possesses the `crm.leads.read.all` permission requests a list of leads or inquiries.
- **THEN** The system MUST return all records for the branch(es) allowed by the user's active `UserBranchAccess` assignments, regardless of the assigned counselor.
