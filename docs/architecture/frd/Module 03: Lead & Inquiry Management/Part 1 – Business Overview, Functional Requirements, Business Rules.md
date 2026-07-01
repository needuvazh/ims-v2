# ASTI IMS: Functional Requirement Document
## Module 03: Lead & Inquiry Management
### Part 1 – Business Overview, Functional Requirements, Business Rules

---

## 1. Business Overview & Introduction

The ASTI Integrated Institute Management System (IMS) relies on a robust **Lead & Inquiry Management** module to serve as the initial funnel for student and corporate intake. In training operations, managing raw inquiries efficiently and converting them into confirmed enrollments is vital to profitability. This module provides a single source of truth for all prospective student and client contact records before they matriculate into full student profiles.

### 1.1 Business Benefits
* **Reduced Operational Latency**: Automating website form ingestion and sending immediate counselor notifications minimizes lead response times.
* **Counselor Accountability**: Scheduling follow-up reminders and logging interaction history ensures no prospect is forgotten.
* **Marketing Budget ROI**: Campaign parameter attribution maps leads to specific marketing channels, calculating accurate cost-per-lead (CPL) statistics.
* **Data Cleansing**: Pre-admission duplicate detection prevents duplicate user accounts, reducing database clutter and administrative overhead.
* **Strict Branch Isolation**: Enforces security boundaries, ensuring counselors only view and manipulate leads belonging to their active branch context.

---

## 2. Detailed Functional Requirements

### FR-LEAD-001: Manual Inquiry Ingestion
* **Description & Actors**: Allows internal staff (Branch Admins, Receptionists, Counselors) to log telephone calls, walk-in visits, or referrals directly into the CRM.
* **Preconditions**: The logging user must have the `inquiry.create` permission and be logged into an active branch context.
* **Inputs**:
  * `branchId` (UUID, mandatory, auto-resolved from user active session)
  * `firstName` (String, max 100 characters, mandatory)
  * `lastName` (String, max 100 characters, mandatory)
  * `mobile` (String, numeric format, country code default +968 for Oman, mandatory)
  * `email` (String, RFC-compliant format, optional)
  * `source` (Enum lookup matching `LeadSource`, mandatory)
  * `interestedCourseId` (UUID, referencing active course catalog record, optional)
  * `priority` (Enum: Low, Medium, High, Critical, default Medium)
  * `notes` (String, text, optional)
* **Processing Steps**:
  1. The system validates that the required fields are filled.
  2. Resolves `branchId` from the active session of the logging user.
  3. Executes the Duplicate Verification Engine (**FR-LEAD-005**).
  4. Generates an auto-incremented Inquiry Number using the pattern `INQ-{YYYY}-{BRANCH_CODE}-{5_DIGIT_SERIAL}` via the `NumberingSeries` configuration context.
  5. Inserts the record into the database with initial status `Captured`.
* **Outputs & Postconditions**:
  * New database record in the inquiry table.
  * Audit event `InquiryCreated` emitted to `OutboxEvent` table.
* **Priority (MoSCoW)**: **Must Have**

---

### FR-LEAD-002: Public Web API Ingestion
* **Description & Actors**: Exposes a secure REST endpoint for the public ASTI website to submit contact-us forms or online registrations.
* **Preconditions**: The API client must supply a valid authentication API token in the request header.
* **Inputs**:
  * `firstName` (String, mandatory)
  * `lastName` (String, mandatory)
  * `phone` (String, mandatory)
  * `email` (String, mandatory)
  * `courseCode` (String, matching active course master, mandatory)
  * `branchCode` (String, matching active branch master, mandatory)
  * `utmSource` (String, optional)
  * `utmMedium` (String, optional)
  * `utmCampaign` (String, optional)
* **Processing Steps**:
  1. Authenticates the client application.
  2. Resolves `branchId` from the provided `branchCode` (throws error if invalid branch).
  3. Resolves `courseId` from the provided `courseCode`.
  4. Maps raw inputs to the `Inquiry` schema.
  5. Performs duplicate checks; if a duplicate is found, the system registers the inquiry but tags it with `isDuplicate = true` and links duplicate references.
  6. Emits `WebsiteInquirySubmitted` event.
  7. If auto-assignment policies are active for the branch, triggers counselor auto-allocation.
* **Outputs & Postconditions**:
  * Inquiry record successfully inserted.
  * Return JSON response with generated Inquiry ID and HTTP status `201 Created`.
* **Priority (MoSCoW)**: **Must Have**

---

### FR-LEAD-003: Configurable Lead Sources
* **Description & Actors**: Enables Super Admins to define and manage active marketing and referral ingestion channels globally.
* **Preconditions**: User has `config.crm` permission.
* **Inputs**:
  * `code` (Unique alphanumeric code, mandatory)
  * `labelEn` (String, max 100, English display name, mandatory)
  * `labelAr` (String, max 100, Arabic Cairo font, mandatory)
  * `displayOrder` (Integer, sort order, mandatory)
  * `status` (Enum: Active, Inactive, default Active)
* **Processing Steps**:
  1. Validates that the `code` is unique in lookup tables.
  2. Saves the source configuration.
  3. Updates lookup catalogs cached by API routers.
* **Outputs & Postconditions**:
  * New entry in global lookup values.
* **Priority (MoSCoW)**: **Must Have**

---

### FR-LEAD-004: Configurable Lead Stages
* **Description & Actors**: Allows Super Admins to manage pipeline stages and active sequence rules of the state machine.
* **Preconditions**: User has `config.crm` permission.
* **Inputs**:
  * `stageCode` (Unique string code, mandatory)
  * `labelEn` (String, English display, mandatory)
  * `labelAr` (String, Arabic Cairo display, mandatory)
  * `displayOrder` (Integer, column sort order, mandatory)
* **Processing Steps**:
  1. Inserts the pipeline stage.
  2. Rebuilds the column routing order for the Kanban board rendering views.
* **Outputs & Postconditions**:
  * Pipeline stage structure updated in master configuration.
* **Priority (MoSCoW)**: **Must Have**

---

### FR-LEAD-005: Duplicate Verification Engine
* **Description & Actors**: Validates that a new inquiry or lead does not conflict with an active record in the CRM or Student Master database.
* **Preconditions**: System receives contact payload during manual creation, edit, or API ingestion.
* **Inputs**:
  * `email` (String, optional)
  * `phone` (String, mandatory)
  * `nationalId` (String, optional)
* **Processing Steps**:
  1. Cleanses phone inputs using normalization logic to strip spaces, hyphens, and handle country prefix overrides.
  2. Executes queries checking if a matching `Person` or `Lead` exists.
  3. If a match is found:
     * Manual Flow: Returns validation warning with matching ID, prompting "Do you want to proceed with duplicate creation?"
     * API Flow: Inserts Inquiry, flags `isDuplicate = true`, and links `duplicateRefId`.
     * **Duplicate Override Invariant**: If a duplicate lead creation is forced and approved (`bypassDuplicateBlock = true`), the system MUST reuse the existing `Person` record by linking the new `Lead` to the existing `Person.id` (via `personId`), rather than inserting a duplicate `Person` record, preventing unique index violations.
* **Outputs & Postconditions**:
  * Conflict warning warnings or flagged record.
* **Priority (MoSCoW)**: **Must Have**

---

### FR-LEAD-006: Inquiry Qualification (Convert to Lead)
* **Description & Actors**: Counselor or Branch Admin reviews a raw Inquiry and promotes it to a managed Lead upon confirming interest.
* **Preconditions**: Inquiry record status is `Captured`. User has `inquiry.qualify` permission.
* **Inputs**:
  * `inquiryId` (UUID, mandatory)
  * `counselorId` (UUID, optional)
  * `interestedCourseId` (UUID, mandatory)
  * `notes` (String, optional)
* **Processing Steps**:
  1. Verifies the user's branch access matches the inquiry's `branchId`.
  2. Reuses existing `Person` if duplicate mobile matches; otherwise creates a new `Person` record (first name, last name, mobile, email).
  3. Creates a new `Lead` record referencing the `personId`.
  4. Auto-generates a Lead Number using pattern `LD-{YYYY}-{BRANCH_CODE}-{5_DIGIT_SERIAL}`.
  5. Links the source inquiry to the new lead (`inquiryId` reference).
  6. Transitions inquiry status to `Qualified`.
  7. Emits `InquiryQualified` and `LeadCreated` domain events.
* **Outputs & Postconditions**:
  * Inquiry status updated to `Qualified` (read-only).
  * New Lead record generated in active stage `New`.
* **Priority (MoSCoW)**: **Must Have**

---

### FR-LEAD-007: Manual Lead Creation
* **Description & Actors**: Enables counselors to bypass the raw inquiry stage and directly register a hot prospect.
* **Preconditions**: Counselor has `lead.create` permission.
* **Inputs**:
  * `branchId` (UUID, mandatory)
  * `firstName` (String, mandatory)
  * `lastName` (String, mandatory)
  * `phone` (String, mandatory)
  * `email` (String, optional)
  * `interestedCourseId` (UUID, mandatory)
  * `leadSource` (Enum lookup, mandatory)
  * `leadStage` (Enum lookup, defaults to first active stage e.g. `New`)
  * `counselorId` (UUID, optional)
* **Processing Steps**:
  1. Validates that the selected `branchId` is within the counselor's assigned branches.
  2. Runs duplicate detection. If duplicate is overridden, links to existing `Person`.
  3. Creates `Person` (if new) and `Lead` records in a single transaction.
  4. Emits `LeadCreated` event.
* **Outputs & Postconditions**:
  * Active Lead record created.
* **Priority (MoSCoW)**: **Must Have**

---

### FR-LEAD-008: Lead Counselor Assignment
* **Description & Actors**: Allocation of leads to counselors manually by Branch Admins.
* **Preconditions**: User has `lead.assign` permission. Target counselor must be `Active` within IAM.
* **Inputs**:
  * `leadId` (UUID, mandatory)
  * `counselorId` (UUID, mandatory)
* **Processing Steps**:
  1. Verifies that the counselor is authorized to work in the lead's assigned branch.
  2. Updates `counselorId` in the `Lead` record.
  3. Appends an assignment log to `FollowUp` (Type: `SystemAssignment`, Notes: "Lead reassigned").
  4. Emits `LeadAssigned` event.
  5. Sends email/web notification to the newly assigned counselor.
* **Outputs & Postconditions**:
  * Lead assignment updated in DB.
  * Audit event `LeadAssigned` created.
* **Priority (MoSCoW)**: **Must Have**

---

### FR-LEAD-009: Counselor Auto-Assignment
* **Description & Actors**: Automatically allocates incoming inquiries and web leads to branch counselors using workload-based logic.
* **Preconditions**: Automated assignment settings are active for the target branch.
* **Inputs**:
  * `leadId` (UUID, mandatory)
* **Processing Steps**:
  1. Counts the number of active, non-terminal leads assigned to each active counselor in the target branch.
  2. Selects the counselor with the lowest active lead workload.
  3. Updates the `counselorId` in the lead record.
  4. Publishes a `LeadAssigned` outbox event to send immediate WhatsApp and Push alerts.
* **Outputs & Postconditions**:
  * Lead record updated with counselor assignment.
* **Priority (MoSCoW)**: **Should Have**

---

### FR-LEAD-010: Follow-up Scheduling
* **Description & Actors**: Counselors schedule future communication points to prevent lead neglect.
* **Preconditions**: User is the assigned counselor or branch admin.
* **Inputs**:
  * `leadId` (UUID, mandatory)
  * `followUpDate` (DateTime, mandatory)
  * `followUpType` (Enum: Call, Email, WhatsApp, Visit, mandatory)
  * `notes` (String, text, optional)
* **Processing Steps**:
  1. Validates that `followUpDate` is in the future.
  2. Inserts a new row in the `lead_follow_ups` table with status `Scheduled`.
  3. Emits `FollowUpScheduled` event.
* **Outputs & Postconditions**:
  * Scheduled follow-up added to the database.
  * Timeline updated.
* **Priority (MoSCoW)**: **Must Have**

---

### FR-LEAD-011: Follow-up Outcome Logging
* **Description & Actors**: Counselors log the actual results of a completed follow-up.
* **Preconditions**: Scheduled follow-up exists with status `Scheduled`.
* **Inputs**:
  * `followUpId` (UUID, mandatory)
  * `outcome` (Enum: Answered, Busy, SwitchedOff, NoResponse, NotInterested, Interested, VisitScheduled, mandatory)
  * `notes` (String, text, mandatory)
  * `scheduleNext` (Boolean, mandatory)
  * `nextFollowUpDate` (DateTime, required if scheduleNext is true)
  * `nextFollowUpType` (Enum, required if scheduleNext is true)
* **Processing Steps**:
  1. Validates that notes are provided.
  2. Updates follow-up record status to `Completed`, appending outcome and notes.
  3. If `scheduleNext` is true:
     * Validates that `nextFollowUpDate` is after the current timestamp (future date check +5 min).
     * Inserts a new `Scheduled` follow-up record.
  4. Emits `FollowUpCompleted` event.
* **Outputs & Postconditions**:
  * Old follow-up completed.
  * New follow-up scheduled (if requested).
* **Priority (MoSCoW)**: **Must Have**

---

### FR-LEAD-012: Overdue Follow-up Notification
* **Description & Actors**: Evaluates open scheduled follow-up tasks and flags negligent entries.
* **Preconditions**: Background cron worker runs hourly.
* **Processing Steps**:
  1. Queries the database for `lead_follow_ups` records with status `Scheduled` where `followUpDate` is older than `current_time - 60 minutes`.
  2. Flags the lead record and sets notification flags.
  3. Emits `FollowUpOverdue` event to push real-time alerts to the counselor and branch manager.
* **Outputs & Postconditions**:
  * Alert notification logged in database and pushed to UI channels.
* **Priority (MoSCoW)**: **Must Have**

---

### FR-LEAD-013: Lost Outcome Mandate
* **Description & Actors**: Counselor marks the lead as lost when the prospect rejects enrollment.
* **Preconditions**: Lead is in an active stage. User has `lead.lost` permission.
* **Inputs**:
  * `leadId` (UUID, mandatory)
  * `lostReasonCode` (Enum lookup, mandatory)
  * `lostReasonNotes` (String, text, mandatory)
* **Processing Steps**:
  1. Validates that `lostReasonCode` corresponds to an active lookup item.
  2. Validates that `lostReasonNotes` contains at least 15 characters of explanatory text.
  3. Updates lead stage to `Lost`.
  4. Writes reason and notes to the Lead record.
  5. Cancels any outstanding `Scheduled` follow-up tasks for this lead automatically.
  6. Emits `LeadLost` event.
* **Outputs & Postconditions**:
  * Lead record stage set to `Lost`.
  * Open follow-ups cancelled.
* **Priority (MoSCoW)**: **Must Have**

---

### FR-LEAD-014: Won Outcome Mandate
* **Description & Actors**: Counselor marks the lead as won, signaling readiness for admission.
* **Preconditions**: User has `lead.won` permission. Lead stage must be `Qualified` or `Negotiation`.
* **Inputs**:
  * `leadId` (UUID, mandatory)
  * `notes` (String, optional)
* **Processing Steps**:
  1. Validates that the lead profile contains mandatory elements required for admissions:
     * Full Mobile Number
     * Full Email (required for student portal creation)
     * Valid Course interest
     * Document Upload (National ID copy / Passport scan)
     * Valid birthdate on linked `Person` record (`dateOfBirth` is not null)
  2. Updates lead stage to `Won`.
  3. Logs transition to the timeline.
  4. Emits `LeadWon` event.
* **Outputs & Postconditions**:
  * Lead stage is marked `Won` in database.
* **Priority (MoSCoW)**: **Must Have**

---

### FR-LEAD-015: Decoupled Admissions Handoff
* **Description & Actors**: Automatically executed when a lead stage changes to `Won`. Securely transfers CRM prospect data to initiate student registration inside the Admissions context.
* **Preconditions**: Lead stage is `Won`.
* **Processing Steps**:
  1. The Lead CRM service reads the `Lead` and linked `Person` data.
  2. Calls the Admission context's Application Service API (`AdmissionsService.createAdmissionFromLead(leadId)`).
  3. The Admissions context processes the transaction independently:
     * Seeds the `Student` profile (resolving unique Student Numbers).
     * Creates the `Admission` record.
     * Triggers the enrollment and course assignment workflows.
  4. Upon receiving successful confirmation from the Admissions service, the CRM service transitions the Lead stage from `Won` to `Converted` (terminal stage).
  5. Emits `LeadConvertedToAdmission` domain event.
* **Outputs & Postconditions**:
  * Lead stage updated to `Converted` in the database.
  * Core admissions creation delegated to Admissions context.
* **Priority (MoSCoW)**: **Must Have**

---

### FR-LEAD-016: Lead Activity Timeline
* **Description & Actors**: Compiles a vertical chronological history of stage updates (retrieved from a dedicated `LeadStageHistory` log table) and follow-up activities. Shows the last 2 stage events by default with a collapse toggle.
* **Preconditions**: User has `lead.read` permission.
* **Inputs**:
  * `leadId` (UUID, mandatory)
* **Processing Steps**:
  1. Queries chronological records of stage transitions from the `LeadStageHistory` table.
  2. Formats and renders a collapsible vertical stepper representing the last 2 changes by default.
* **Outputs & Postconditions**:
  * Vertical stage history timeline shown.
* **Priority (MoSCoW)**: **Must Have**

---

### FR-LEAD-017: Immutable Timeline Notes
* **Description & Actors**: Allows counselors to post chronological text notes in the lead timeline context.
* **Preconditions**: User has `lead.update` permission.
* **Inputs**:
  * `leadId` (UUID, mandatory)
  * `content` (String, mandatory)
* **Processing Steps**:
  1. Inserts the note details in the dedicated `LeadNote` table, binding the author's user ID and timestamp.
  2. Renders the notes in a paginated grid list (5 records per page, client-side pagination).
  3. Once created, notes are immutable and cannot be updated, edited, or deleted.
* **Outputs & Postconditions**:
  * Timeline note recorded and appended.
* **Priority (MoSCoW)**: **Must Have**

---

## 3. Business Rules

| Rule ID | Reference Name | Description / Validation Logic | Expected Exception / Error Code |
| :--- | :--- | :--- | :--- |
| **BR-LEAD-001** | Branch Scope Mandate | Every inquiry and lead must have a valid `branchId`. Direct modifications by counselors are strictly isolated to their assigned branches. | `ERR_CRM_BRANCH_SCOPE_VIOLATION` |
| **BR-LEAD-002** | Source Attributed Status | Leads and inquiries must map to an active lookup value of type `LeadSource`. Inactive sources are rejected. | `ERR_CRM_SOURCE_INACTIVE` |
| **BR-LEAD-003** | Stage Validity Constraint | Leads must only reside in stages registered under configuration tables. Stage displays must follow designated Sort Orders. | `ERR_CRM_STAGE_INVALID` |
| **BR-LEAD-004** | Stage Transition Limits | Leads cannot transition backward from `Converted` or `Lost` back to active status (New, Contacted, Follow-Up). | `ERR_CRM_INVALID_STAGE_TRANSITION` |
| **BR-LEAD-005** | Duplicate Prevention Policy | Users must confirm duplicate warnings when creating mobile/email collisions. Super Admin configuration determines if duplicates are blocked or warned. | `ERR_CRM_DUPLICATE_LEAD_DETECTED` |
| **BR-LEAD-006** | Counselor Assignment Rules | Counselor assigned to lead must have an active `UserRole` mapping to the Counselor permission schema in that branch. | `ERR_CRM_INVALID_COUNSELOR` |
| **BR-LEAD-007** | Won Prerequisites | To transition to `Won`, lead email, phone, interested course, and Civil ID scan file link must not be null. | `ERR_CRM_WON_PRECONDITIONS_MISSED` |
| **BR-LEAD-008** | Lost Reason Mandate | Leads cannot transition to `Lost` without a valid `lostReasonCode` and descriptive notes. | `ERR_CRM_LOST_REASON_REQUIRED` |
| **BR-LEAD-009** | Forward Scheduling Only | Follow-up schedules must define a future date-time (current system time + 5 minutes). | `ERR_CRM_PAST_FOLLOWUP_DATE` |
| **BR-LEAD-010** | Lead Soft Delete Constraint | Deleting a lead is a soft-delete logical update. System sets `isDeleted = true` and logs `deletedAt` and `deletedBy`. | `ERR_CRM_LEAD_ALREADY_DELETED` |

---

## 4. Stage Transition Matrix

This matrix governs the validation rules of the state machine. Transitions not explicitly marked "Allowed" will be blocked.

| From Stage | To Stage | Allowed? | Required Conditions / Permissions |
| :--- | :--- | :---: | :--- |
| **New** | Contacted | Yes | Requires `lead.update` permission. |
| **New** | Lost | Yes | Requires `lead.lost` and a valid lost reason code. |
| **Contacted** | Follow-Up | Yes | Requires `lead.update` and at least one follow-up record scheduled. |
| **Contacted** | Lost | Yes | Requires `lead.lost` and lost reason code. |
| **Follow-Up** | Qualified | Yes | Requires `lead.update`. |
| **Follow-Up** | Lost | Yes | Requires `lead.lost` and lost reason code. |
| **Qualified** | Won | Yes | Requires `lead.won`, interested course, validated phone, email, and ID documents. |
| **Qualified** | Lost | Yes | Requires `lead.lost` and lost reason code. |
| **Won** | Converted | Yes | Automated transition triggered by Admissions Ingestion Engine only. |
| **Won** | Lost | No | Prohibited transition. |
| **Converted** | *Any Stage* | No | Prohibited transition. Terminal state. |
| **Lost** | New / Follow-Up| Yes | Requires Academic Coordinator approval and `lead.update` override permission. |

---

## 5. Cross-Module Dependencies

```text
┌─────────────────────────────────┐
│   Identity & Access Management  │ <── Enforces Counselor Role verification and
└─────────────────────────────────┘     branch security scopes.
                │
                v
┌─────────────────────────────────┐
│     Organization Management     │ <── Resolves active Branch IDs and
└─────────────────────────────────┘     Branch Code hierarchies.
                │
                v
┌─────────────────────────────────┐
│    Lead & Inquiry Management    │ (Module 03 Context)
└─────────────────────────────────┘
                │
                ├─────── [Marks Won] ───────> Emits LeadConvertedToAdmission
                │                             event downstream
                v
┌─────────────────────────────────┐
│     Admission & Enrollment      │ <── Instantiates Student and Admission records;
└─────────────────────────────────┘     assigns Batch and Course Enrollment.
```

1. **Identity & Access Management**: Enforces permissions at route level (`lead.create`, `lead.won`, `lead.lost`) and isolates queries based on the user's `UserBranchAccess` scopes.
2. **Organization Management**: Validates that raw inputs (e.g. website forms) provide codes matching active branches (`branches` table).
3. **Course Catalog Management**: Verifies that the lead's `interestedCourseId` refers to a published and active course in the catalog.
4. **Admission & Enrollment Management**: Receives the payload after lead conversion, invoking the enrollment aggregate to seed student profiles.
5. **Document Management**: Handles file storage and returns signed URLs for civil ID uploads associated with the prospect.
