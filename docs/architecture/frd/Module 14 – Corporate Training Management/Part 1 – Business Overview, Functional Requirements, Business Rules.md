# Part 1 – Business Overview, Functional Requirements, Business Rules

## Module 14 – Corporate Training Management

---

# 1. Introduction

Corporate Training Management is a core ASTI business capability that converts an approved corporate commercial relationship into controlled participant registration, training enrollment, delivery visibility, billing traceability, completion visibility, and certificate access.

The module is deliberately separated from Corporate Sales & Quotation. Sales owns B2B opportunity progression, quotations, quotation approval and sales orders. Corporate Training begins operational responsibility at the point where a corporate account, approved commercial basis and training commitment are available for delivery preparation.

The module is also deliberately separated from Admission & Enrollment. Corporate Training owns the corporate customer, corporate contacts, contracts, participants and corporate-to-enrollment linkage. The central `Enrollment` aggregate is owned by Admission & Enrollment and remains mandatory for every learning journey. A corporate participant must therefore be linked to or converted into a `StudentProfile` and enrolled into a valid Course and Batch before the participant becomes part of ASTI's learning lifecycle.

The design follows the shared Person/Party model. A corporate customer is represented through `Organization` and `CorporateAccount`; a human is represented once as a `Person`, then may carry contextual relationships such as `CorporateContact`, `CorporateParticipant`, `StudentProfile`, `TrainerProfile` or `User`. The module must never create a second Person merely because the person changes employer or returns for another course.

Corporate Training is an orchestration-heavy business capability, but it is not allowed to become a data-owner-of-everything module. It coordinates with Course Catalog, Training Delivery, Scheduling, Trainer Management, Enrollment, Finance, Documents, Attendance, Completion, Certificate, Communication, Reporting and Audit through explicit modular boundaries.

---

# 2. Business Context and Benefits

## 2.1 Current Operational Need

The ASTI workflow requires corporate training operations to manage company contacts, follow-ups and commercial handoff, collect confirmations such as email confirmation, LPO and nomination list, register candidates, validate duplicates, allocate suitable batches, verify trainer and venue availability, deliver training, track attendance and completion, issue certificates, generate invoices and monitor outstanding payments.

The DDD baseline separates these responsibilities into owning contexts. Module 14 provides the corporate operational backbone and preserves end-to-end traceability without breaking those boundaries.

## 2.2 Expected Business Benefits

### Single Corporate Customer View

ASTI gains a reliable CorporateAccount record connected to the underlying Organization Party and reusable across contracts, participants, enrollments, invoices and reports.

### Reduced Duplicate Identity Data

Corporate contacts and participants resolve through Person identity before contextual records are created. The same human can move between employers or attend multiple courses while retaining one Person identity and distinct contextual relationships.

### Faster Corporate Participant Onboarding

Validated participant import and bulk enrollment reduce repetitive manual data entry while still enforcing course, batch, contract, credit and identity rules.

### Enrollment-Centric Traceability

Every corporate learner is represented in the same Enrollment lifecycle as other learners. Attendance, results, completion and certificate processing therefore operate on one consistent central model.

### Controlled Credit and Contract Compliance

Corporate enrollment can be blocked when Finance reports a configured blocking credit failure. Contract validity and terms are checked before participant enrollment proceeds.

### Better Corporate Service Visibility

Authorized users can see participant roster, training status, attendance, completion, certificate and finance status through read models, without copying source-of-truth transactions into CTM tables.

### Branch Governance

Branch data isolation is enforced on the server and consolidated views are available only with explicit IAM scope and reporting permissions.

### Auditability

Sensitive account, contract, participant and enrollment-linkage actions are traceable and correlated across context boundaries.

---

# 3. Functional Requirement Specifications

## FR-CTM-001 – Create Corporate Account

**Description & Actors**  
Allows an authorized Corporate Training Administrator or Account Manager to create a `CorporateAccount` linked to an existing or newly resolved `Organization` Party record.

**Actors:** Corporate Training Administrator, Corporate Account Manager; Organization/Party resolution service; IAM authorization service.

**Preconditions**

1. User is authenticated.
2. User has `corporate-training.account.create` permission.
3. User is operating within an authorized organizational/branch scope.
4. Organization identity resolution has been completed using legal name, registration number and other approved identifiers.
5. No conflicting active corporate account already exists for the same Organization relationship, subject to approved uniqueness rules.

**Inputs**

- organizationId or organization resolution payload;
- accountCode;
- accountName;
- industry;
- creditLimit reference/value where permitted by ownership policy;
- blockOnCreditLimit flag where permitted by ownership policy;
- billingCycle;
- status.

**Processing Steps**

1. Authenticate user and resolve permissions.
2. Resolve server-side scope.
3. Validate Organization existence and type suitability.
4. Check account code uniqueness.
5. Check conflicting CorporateAccount linkage.
6. Validate billing cycle and status against configured values.
7. Create CorporateAccount with audit/base fields and version.
8. Record audit event.
9. Return created account summary.

**Outputs & Postconditions**

- CorporateAccount exists and references a valid Organization.
- Audit trail exists.
- No Person or Organization identity is duplicated.

**Priority:** Must

---

## FR-CTM-002 – Search and View Corporate Accounts

**Description & Actors**  
Provides paginated corporate account discovery and detail views.

**Actors:** CTM Admin, Account Manager, Branch Manager, authorized management viewers.

**Preconditions**

1. User is authenticated.
2. User has corporate account read permission.
3. Server-side branch/data scope is resolved.

**Inputs**

- search text;
- account code;
- account name;
- industry;
- status;
- billing cycle;
- branch/reporting dimension where applicable;
- page, page size;
- allowlisted sort field and direction.

**Processing Steps**

1. Authorize read action.
2. Apply server-side scope filter.
3. Apply soft-delete exclusion by default.
4. Apply validated filters and full-text/prefix search according to implementation design.
5. Execute paginated query.
6. Return stable paging metadata.

**Outputs & Postconditions**

- Paginated account list or account detail.
- Unauthorized account records are never included.

**Priority:** Must

---

## FR-CTM-003 – Update Corporate Account

**Description & Actors**  
Updates mutable corporate operational attributes while protecting concurrent edits.

**Actors:** CTM Admin, Account Manager.

**Preconditions**

- authenticated and authorized;
- account exists and is in scope;
- submitted version matches current version.

**Inputs**

- accountName;
- industry;
- billingCycle;
- permitted credit-control fields subject to ownership resolution;
- expected version;
- change reason when sensitive fields change.

**Processing Steps**

1. Load scoped account.
2. Validate version.
3. Validate fields and cross-field rules.
4. Reject direct changes to immutable identity keys where policy prohibits them.
5. Persist update and increment version.
6. Audit old and new values for sensitive fields.

**Outputs & Postconditions**

- Updated CorporateAccount.
- Concurrent stale writes fail with a conflict response.

**Priority:** Must

---

## FR-CTM-004 – Change Corporate Account Status and Soft Delete

**Description & Actors**  
Controls active, suspended/blocked, closed and soft-deleted lifecycle behavior.

**Actors:** CTM Admin, Branch Manager or designated approver according to permission design.

**Preconditions**

- account exists and is in scope;
- user has status-change or delete permission;
- lifecycle dependency checks are complete.

**Inputs**

- target status/action;
- reason;
- expected version.

**Processing Steps**

1. Validate authorization.
2. Check active contract and enrollment dependencies.
3. Reject destructive delete.
4. For soft delete, mark repository-standard `deletedAt`/soft-delete fields and audit action.
5. For status transition, validate allowed transition and update version.
6. Prevent new participant/enrollment operations for statuses that disallow them.

**Outputs & Postconditions**

- status updated or record soft-deleted;
- historical relationships preserved;
- audit trail created.

**Priority:** Must

---

## FR-CTM-005 – Corporate Account 360 View

**Description & Actors**  
Provides an aggregated read-only view of corporate account operational status.

**Actors:** Account Manager, CTM Admin, Branch Manager, Management Viewer.

**Preconditions**

- account read permission;
- permission for each sensitive cross-context data category;
- account within authorized scope.

**Inputs**

- corporateAccountId;
- optional date range and status filters.

**Processing Steps**

1. Load CTM-owned account, contacts, contracts and participant counts.
2. Query approved read models for sales, enrollment, training, attendance, completion, certificate and finance summaries.
3. Suppress sections for which user lacks permission.
4. Return a composed DTO without persisting duplicate transactional data.

**Outputs & Postconditions**

- Corporate 360 read DTO.
- No cross-context data ownership transfer occurs.

**Priority:** Should

---

## FR-CTM-006 – Add Corporate Contact Using Person Resolution

**Description & Actors**  
Adds a corporate contact while reusing the shared Person identity.

**Actors:** Account Manager, CTM Admin.

**Preconditions**

- account exists, active and in scope;
- actor has contact create permission.

**Inputs**

- corporateAccountId;
- existing personId or person identity fields;
- designation;
- department;
- email;
- phone;
- isPrimary;
- portalAccessEnabled.

**Processing Steps**

1. Authorize action and scope.
2. Resolve Person using approved identity matching.
3. Create Person only when no existing identity matches and actor is permitted to invoke Party creation flow.
4. Check duplicate active CorporateContact relationship.
5. Validate contact channels.
6. If `isPrimary=true`, validate primary contact constraint.
7. Create CorporateContact.
8. Audit creation and sensitive flags.

**Outputs & Postconditions**

- CorporateContact references a valid Person and CorporateAccount.
- No duplicate Person is created for a known identity.

**Priority:** Must

---

## FR-CTM-007 – Update Corporate Contact

**Description & Actors**  
Maintains corporate-context contact attributes.

**Actors:** Account Manager, CTM Admin.

**Preconditions:** Contact exists, belongs to in-scope account, and user has update permission.

**Inputs:** designation, department, email, phone, expected version where versioned.

**Processing Steps**

1. Scope and permission check.
2. Validate input formats.
3. Distinguish Person-owned identity data from CorporateContact contextual fields.
4. Update only CTM-owned contact fields.
5. Route Person master changes through the Person owner boundary if supported.
6. Audit changes.

**Outputs & Postconditions:** Updated contact; ownership boundary preserved.

**Priority:** Must

---

## FR-CTM-008 – Manage Primary Corporate Contact

**Description & Actors**  
Marks a CorporateContact as the primary operational contact.

**Actors:** Account Manager, CTM Admin.

**Preconditions:** Target contact is active and belongs to account.

**Inputs:** corporateAccountId, contactId, `isPrimary`, expected version.

**Processing Steps**

1. Authorize and scope.
2. Lock or transactionally validate current primary relationship.
3. If making target primary, unset conflicting primary designation according to approved rule.
4. Update target.
5. Audit old/new primary contact references.

**Outputs & Postconditions:** Deterministic primary-contact state.

**Priority:** Should

---

## FR-CTM-009 – Manage Portal Access Eligibility Flag

**Description & Actors**  
Controls whether a corporate contact is eligible for future/external corporate portal provisioning. This does not create IAM credentials directly.

**Actors:** CTM Admin, authorized Account Manager.

**Preconditions:** Contact is active; actor has update permission; portal feature policy is enabled.

**Inputs:** contactId, portalAccessEnabled, reason.

**Processing Steps**

1. Authorize.
2. Validate contact status and email/identity readiness.
3. Update eligibility flag.
4. Audit change.
5. When portal provisioning is in scope, invoke IAM onboarding workflow through explicit boundary; do not write User directly.

**Outputs & Postconditions:** Contact eligibility updated; IAM ownership preserved.

**Priority:** Could for initial admin-portal phase; Must for corporate-portal phase.

---

## FR-CTM-010 – Deactivate Corporate Contact

**Description & Actors**  
Removes a contact from active use without deleting history.

**Actors:** CTM Admin, Account Manager.

**Preconditions:** Contact exists and is in scope.

**Inputs:** contactId, reason, expected version.

**Processing Steps**

1. Check whether contact is primary.
2. Require replacement primary contact if business process requires one.
3. Deactivate or soft-delete according to repository convention.
4. Preserve historical links and audit.

**Outputs & Postconditions:** Contact cannot be selected for new operational communication; history remains.

**Priority:** Must

---

## FR-CTM-011 – Create Corporate Contract

**Description & Actors**  
Creates the operational contract that determines corporate billing terms for training delivery.

**Actors:** CTM Admin, Account Manager.

**Preconditions**

- CorporateAccount active;
- user has contract create permission;
- commercial handoff is available where required.

**Inputs**

- corporateAccountId;
- contractNumber;
- contractValue;
- startDate;
- endDate;
- billingModel: Per Student, Per Batch, Per Hour, or Fixed Contract;
- paymentTerms;
- status.

**Processing Steps**

1. Authorize and scope.
2. Validate account state.
3. Validate contract number uniqueness.
4. Validate date range.
5. Validate amount/currency policy where applicable.
6. Validate billing model.
7. Create contract.
8. Audit creation.

**Outputs & Postconditions:** Active/draft contract exists under account.

**Priority:** Must

---

## FR-CTM-012 – Validate Contract Number Uniqueness

**Description & Actors**  
Prevents duplicate contract identifiers within the approved uniqueness scope.

**Actors:** System during contract create/update.

**Preconditions:** Account and contract payload provided.

**Inputs:** contractNumber, account/institute scope.

**Processing Steps**

1. Normalize contract number according to business policy.
2. Query active and historical non-hard-deleted records.
3. Reject conflicting number.

**Outputs & Postconditions:** Unique contract identity is preserved.

**Priority:** Must

---

## FR-CTM-013 – Update Corporate Contract Terms

**Description & Actors**  
Maintains contract value, dates, billing model, payment terms and status with audit protection.

**Actors:** CTM Admin, Account Manager, authorized approver as applicable.

**Preconditions:** Contract in scope; actor authorized; version current.

**Inputs:** mutable contract fields, reason, expected version.

**Processing Steps**

1. Load and validate contract.
2. Check whether change would invalidate existing CorporateEnrollment references.
3. Prevent silent retrospective changes that alter already-invoiced historical transactions.
4. Persist permitted future/prospective changes.
5. Audit old/new values.

**Outputs & Postconditions:** Contract updated without rewriting historical finance truth.

**Priority:** Must

---

## FR-CTM-014 – Validate Contract Applicability for Enrollment

**Description & Actors**  
Determines whether a selected contract may be used for a new corporate enrollment.

**Actors:** CTM enrollment coordinator, system validation service.

**Preconditions:** CorporateAccount, participant, course/batch intent and contract selected.

**Inputs:** contractId, corporateAccountId, effective enrollment date, optional billing context.

**Processing Steps**

1. Verify contract belongs to account.
2. Verify contract status allows new enrollment.
3. Verify effective date is within start/end dates.
4. Verify billing model can support the intended delivery arrangement where model-specific validation is defined.
5. Return validation result.

**Outputs & Postconditions:** Valid/invalid result with error code; invalid contract blocks enrollment initiation.

**Priority:** Must

---

## FR-CTM-015 – Preserve Contract History

**Description & Actors**  
Ensures contract records are not hard-deleted and material changes are auditable.

**Actors:** System, Auditor.

**Preconditions:** Contract mutation or deactivation occurs.

**Inputs:** old state, new state, actor, reason.

**Processing Steps:** record audit event; apply soft delete/status transition; preserve references.

**Outputs & Postconditions:** Historical reconstruction remains possible.

**Priority:** Must

---

## FR-CTM-016 – Register Corporate Participant

**Description & Actors**  
Creates a CorporateParticipant under a CorporateAccount while resolving Person identity.

**Actors:** CTM Admin, Training Coordinator.

**Preconditions**

- account active and in scope;
- actor has participant create permission.

**Inputs**

- corporateAccountId;
- personId or identity data;
- employeeCode;
- department;
- designation;
- status.

**Processing Steps**

1. Authorize and scope.
2. Resolve Person identity.
3. Reject or merge workflow-route suspected duplicates; never silently create a duplicate Person.
4. Check duplicate active CorporateParticipant relationship under same account.
5. Create CorporateParticipant.
6. Audit creation.

**Outputs & Postconditions:** Participant exists under corporate account and points to one Person.

**Priority:** Must

---

## FR-CTM-017 – Detect Duplicate Participant Identity

**Description & Actors**  
Validates candidate identity before Person or CorporateParticipant creation.

**Actors:** System, CTM Admin resolving exceptions.

**Preconditions:** Candidate identity input exists.

**Inputs:** Civil ID where available; passport number; email; phone; name/date-of-birth combination according to approved matching policy.

**Processing Steps**

1. Normalize identifiers.
2. Perform exact lookup on strong identifiers.
3. Perform controlled secondary matching only according to approved identity policy.
4. Return exact match, possible match requiring review, or no match.
5. Prevent automatic creation on unresolved high-confidence conflicts.

**Outputs & Postconditions:** Identity resolution decision recorded; duplicates prevented.

**Priority:** Must

---

## FR-CTM-018 – Maintain Corporate Participant Contextual Data

**Description & Actors**  
Updates company-specific participant attributes without changing Person-owned master data directly.

**Actors:** CTM Admin, Training Coordinator.

**Preconditions:** Participant active/in scope.

**Inputs:** employeeCode, department, designation, participant status, expected version.

**Processing Steps**

1. Authorize and scope.
2. Validate employee code uniqueness per account if configured.
3. Update CTM-owned contextual fields.
4. Route Person identity changes through owner boundary.
5. Audit sensitive changes.

**Outputs & Postconditions:** Participant contextual data updated.

**Priority:** Must

---

## FR-CTM-019 – Preserve Person Across Employer Changes

**Description & Actors**  
Supports the business rule that the same Person may participate under different employers while retaining one identity.

**Actors:** CTM Admin, identity resolution service.

**Preconditions:** Person match found; new corporate relationship requested.

**Inputs:** personId, new corporateAccountId, corporate employment attributes.

**Processing Steps**

1. Reuse existing Person.
2. Create separate CorporateParticipant relationship for the new account when no active relationship exists.
3. Preserve old relationships and enrollments.
4. Do not move historical CorporateEnrollment records to the new employer.

**Outputs & Postconditions:** One Person, separate employer relationships, preserved history.

**Priority:** Must

---

## FR-CTM-020 – Deactivate Participant With History Protection

**Description & Actors**  
Deactivates a participant relationship without deleting historical corporate enrollment records.

**Actors:** CTM Admin.

**Preconditions:** Participant exists; actor authorized.

**Inputs:** participantId, reason, expected version.

**Processing Steps**

1. Check active future enrollment operations.
2. Apply status transition or soft delete.
3. Preserve Person and StudentProfile relationships.
4. Audit action.

**Outputs & Postconditions:** Participant excluded from new selection but historical records remain.

**Priority:** Must

---

## FR-CTM-021 – Bulk Participant Import

**Description & Actors**  
Validates and imports multiple corporate participant rows with deterministic outcomes.

**Actors:** CTM Admin, Training Coordinator.

**Preconditions**

- account active;
- import permission;
- input follows approved template/schema.

**Inputs**

For each row: participant name, Civil ID, passport number where required, nationality, email, phone, employee code, department, designation and any approved supporting references.

**Processing Steps**

1. Authenticate, authorize and scope.
2. Validate file/request structure and row limit.
3. Normalize each row.
4. Validate required fields.
5. Resolve Person identity.
6. Detect within-file duplicates and database duplicates.
7. Validate account relationship conflicts.
8. Produce pre-commit validation result.
9. Commit only valid rows under the selected processing policy.
10. Return per-row status and created/reused identifiers.
11. Audit batch summary without logging PII payloads.

**Outputs & Postconditions**

- row-level success/reuse/failure result;
- no silent data loss;
- retries do not create duplicates.

**Priority:** Must

---

## FR-CTM-022 – Accept Corporate Nomination List

**Description & Actors**  
Captures the business action of receiving a company nomination list containing one or more participants.

**Actors:** CTM Admin, Corporate Coordinator when portal capability is enabled.

**Preconditions:** CorporateAccount active; actor authorized; source document accepted through Document Management.

**Inputs:** account, contract/reference, nomination source document reference, participant rows, preferred course/date information where available.

**Processing Steps**

1. Validate actor scope.
2. Validate source document reference.
3. Validate nomination rows.
4. Resolve Person/participant matches.
5. Produce validation state.
6. Preserve traceability to resulting participant/enrollment commands.

**Outputs & Postconditions:** Nomination validation result and traceability reference.

**Priority:** Must

**Alignment Gap:** The DDD makes nominations a CTM responsibility, but ER v3 has no nomination entity. Functional behavior is required; persistence must be resolved before database/API finalization.

---

## FR-CTM-023 – Validate Nomination Rows

**Description & Actors:** Validates completeness, identity, account and training intent data for each nominated participant.

**Actors:** System, CTM Admin.

**Preconditions:** Nomination rows submitted.

**Inputs:** participant identity, employee context, requested course/date/batch preference as available.

**Processing Steps**

1. Validate mandatory identity fields.
2. Check duplicate rows.
3. Resolve existing Person and CorporateParticipant.
4. Check account consistency.
5. Validate course reference where supplied.
6. Return field-level errors.

**Outputs & Postconditions:** Every row is marked valid, warning/review, or invalid.

**Priority:** Must

---

## FR-CTM-024 – Resolve Nomination to Existing Identities

**Description & Actors:** Reuses existing Person and CorporateParticipant records for nomination rows.

**Actors:** System, CTM Admin for ambiguous matches.

**Preconditions:** Valid identity input.

**Inputs:** normalized identity keys and account.

**Processing Steps:** identity lookup; participant relationship lookup; ambiguity handling; create/link decision.

**Outputs & Postconditions:** Resolution result used by participant/enrollment workflow.

**Priority:** Must

---

## FR-CTM-025 – Correct Nomination Validation Failures

**Description & Actors:** Allows authorized correction and revalidation of invalid nomination data.

**Actors:** CTM Admin; Corporate Coordinator in future portal scope.

**Preconditions:** Validation errors exist.

**Inputs:** corrected row values and expected version/revision.

**Processing Steps:** authorize; apply correction; re-run validation; retain prior validation audit/history if nomination aggregate is approved.

**Outputs & Postconditions:** Revised validation outcome.

**Priority:** Should

---

## FR-CTM-026 – Preserve Nomination Source Traceability

**Description & Actors:** Ensures source nomination can be traced to participants and enrollments.

**Actors:** CTM Admin, Auditor.

**Preconditions:** Nomination and subsequent participant/enrollment activity exists.

**Inputs:** source document reference, operation correlation ID, participant/enrollment IDs.

**Processing Steps:** persist/reference traceability according to approved nomination model; include correlation IDs in audit.

**Outputs & Postconditions:** Auditable source-to-enrollment chain.

**Priority:** Must

**Alignment Gap:** Requires nomination persistence model approval.

---

## FR-CTM-027 – Create Single Corporate Enrollment

**Description & Actors**  
Coordinates creation of one corporate participant's central Enrollment and CTM linkage.

**Actors:** CTM Admin, Enrollment Officer; Admission & Enrollment context; Course Catalog; Training Delivery; Finance.

**Preconditions**

1. CorporateAccount active.
2. CorporateParticipant active and belongs to account.
3. Contract valid if required.
4. Course and Batch selected.
5. User authorized for CTM enrollment and target branch.

**Inputs**

- corporateAccountId;
- corporateParticipantId;
- contractId;
- courseId;
- batchId;
- branchId;
- enrollment effective/request date;
- idempotency key.

**Processing Steps**

1. Authorize permission and target branch.
2. Validate account and participant relationship.
3. Validate contract applicability.
4. Query Course Catalog for valid course and pricing-resolution inputs.
5. Query Training Delivery for batch-course relationship, status and capacity.
6. Request Finance credit validation if configured.
7. Stop if blocking credit validation fails.
8. Request StudentProfile create/link and Enrollment creation through Admission & Enrollment application boundary.
9. On successful Enrollment result, create CorporateEnrollment linkage.
10. Update participant `linkedStudentProfileId` if not already linked and result is valid.
11. Record audit/correlation details.
12. Return composed result.

**Outputs & Postconditions**

- valid central Enrollment exists;
- CorporateEnrollment references that Enrollment;
- corporate linkage preserved;
- no duplicate enrollment for retry.

**Priority:** Must

---

## FR-CTM-028 – Bulk Corporate Enrollment

**Description & Actors**  
Coordinates enrollment for multiple validated participants.

**Actors:** CTM Admin, Enrollment Officer.

**Preconditions:** All common prerequisites from FR-CTM-027; bulk permission; validated participant set.

**Inputs:** common account/contract/course/batch/branch selection, participant IDs, idempotency key, optional source nomination reference.

**Processing Steps**

1. Validate common scope and references once.
2. Validate every participant belongs to account.
3. Obtain common course and batch validation.
4. Obtain credit validation at the correct aggregate/business level from Finance.
5. For each row, invoke idempotent enrollment creation orchestration.
6. Persist CorporateEnrollment link only for successful Enrollment results.
7. Capture per-row result and correlation.
8. Return summary counts.

**Outputs & Postconditions:** success/failure result per participant; safe retry capability.

**Priority:** Must

---

## FR-CTM-029 – Validate Participant-to-Account Relationship

**Description & Actors:** Prevents enrollment of a participant under the wrong corporate account.

**Actors:** System.

**Preconditions:** Corporate enrollment request exists.

**Inputs:** corporateAccountId, corporateParticipantId.

**Processing Steps:** load participant in scope; compare account; reject mismatch.

**Outputs & Postconditions:** only correctly linked participant can continue.

**Priority:** Must

---

## FR-CTM-030 – Validate Contract Before Enrollment

**Description & Actors:** Applies FR-CTM-014 as a mandatory enrollment guard where contract is required.

**Actors:** System.

**Preconditions:** Enrollment request.

**Inputs:** account, participant, contract, effective date.

**Processing Steps:** ownership, status, date and applicability checks.

**Outputs & Postconditions:** validation outcome; failure blocks flow.

**Priority:** Must

---

## FR-CTM-031 – Resolve Course and Pricing References Through Course Catalog

**Description & Actors**  
Obtains authoritative course and pricing/discount resolution inputs without CTM owning them.

**Actors:** CTM orchestration service, Course Catalog.

**Preconditions:** Course selected.

**Inputs:** courseId, batchId, branchId, customer type Corporate, effective date.

**Processing Steps**

1. Validate course exists and is eligible for enrollment.
2. Resolve pricing hierarchy through owner-defined service: batch, then branch, then global.
3. Resolve discount hierarchy through owner-defined service.
4. Return immutable pricing result/reference for Enrollment/Finance flow.

**Outputs & Postconditions:** authoritative pricing result available; CTM does not persist a competing pricing rule.

**Priority:** Must

---

## FR-CTM-032 – Validate Batch and Capacity Through Training Delivery

**Description & Actors:** Confirms target batch is valid for course, open for enrollment, and has capacity or approved over-capacity behavior.

**Actors:** CTM orchestration, Training Delivery.

**Preconditions:** Course and batch selected.

**Inputs:** batchId, courseId, participant count.

**Processing Steps:** validate course relation; batch status; available capacity; waiting-list/override rule outcome.

**Outputs & Postconditions:** valid allocation outcome or blocking error.

**Priority:** Must

---

## FR-CTM-033 – Obtain Schedule Feasibility

**Description & Actors:** Provides schedule and venue feasibility for corporate training planning.

**Actors:** Training Coordinator, Scheduling context.

**Preconditions:** Batch/schedule planning exists.

**Inputs:** preferred dates, branch, classroom/venue preference, trainer where applicable.

**Processing Steps:** request scheduling availability/conflict result; present available options; CTM does not directly write timetable tables.

**Outputs & Postconditions:** schedule feasibility read outcome.

**Priority:** Should

---

## FR-CTM-034 – Request Corporate Credit Validation

**Description & Actors**  
Requests authoritative Finance decision before corporate enrollment when credit rules apply.

**Actors:** CTM orchestration, Finance & Receivables.

**Preconditions:** Corporate account has applicable credit rule/configuration.

**Inputs:** corporateAccountId, new enrollment value/commitment basis, contract/order reference.

**Processing Steps**

1. Request Finance validation.
2. Finance evaluates current outstanding + committed/new value against credit limit and block flag.
3. Receive pass, warning-allow, or fail-block result.
4. Persist only reference/outcome necessary for audit; do not recompute Finance balances in CTM.

**Outputs & Postconditions:** blocking failure prevents enrollment; non-blocking exceedance may proceed with recorded outcome.

**Priority:** Must

---

## FR-CTM-035 – Request StudentProfile and Enrollment Creation

**Description & Actors:** Invokes Admission & Enrollment owner to create/link the learner profile and central Enrollment.

**Actors:** CTM orchestration, Admission & Enrollment.

**Preconditions:** CTM guards passed.

**Inputs:** person/participant reference, course, batch, branch, enrollment type Corporate, resolved pricing, admission/source linkage as required.

**Processing Steps**

1. Resolve or create StudentProfile through owner.
2. Validate Enrollment invariants.
3. Create Enrollment.
4. Return enrollmentId and studentProfileId.

**Outputs & Postconditions:** Central Enrollment exists and is owner-managed.

**Priority:** Must

---

## FR-CTM-036 – Create CorporateEnrollment Linkage

**Description & Actors:** Creates CTM-owned linkage after successful Enrollment creation.

**Actors:** CTM application service.

**Preconditions:** valid enrollmentId returned; participant/account/contract validated.

**Inputs:** corporateAccountId, corporateParticipantId, enrollmentId, contractId, billingStatus.

**Processing Steps**

1. Verify no existing linkage for same corporate participant/enrollment combination.
2. Create CorporateEnrollment.
3. Audit linkage creation.

**Outputs & Postconditions:** Corporate linkage can be used for billing and reporting.

**Priority:** Must

---

## FR-CTM-037 – Preserve Corporate Enrollment Linkage Fields

**Description & Actors:** Ensures CorporateEnrollment contains authoritative relationship references defined by ER v3.

**Actors:** System.

**Preconditions:** CorporateEnrollment creation/update.

**Inputs:** account, participant, enrollment, contract, billing status.

**Processing Steps:** foreign/reference validation through application boundary; create/update CTM-owned linkage.

**Outputs & Postconditions:** relationship integrity preserved.

**Priority:** Must

---

## FR-CTM-038 – Link Participant to StudentProfile After Enrollment

**Description & Actors:** Updates the corporate participant's learner linkage after Admission & Enrollment resolves StudentProfile.

**Actors:** CTM application service.

**Preconditions:** valid studentProfileId returned for same Person.

**Inputs:** corporateParticipantId, studentProfileId, expected version.

**Processing Steps**

1. Verify Person identity consistency between participant and StudentProfile through approved read contract.
2. If no existing linkage, set `linkedStudentProfileId`.
3. If conflicting linkage exists, stop and raise integrity error for investigation.
4. Audit linkage change.

**Outputs & Postconditions:** participant is linked to correct learner profile.

**Priority:** Must

---

## FR-CTM-039 – Enforce Idempotency for Enrollment Commands

**Description & Actors:** Prevents duplicate records on retry.

**Actors:** System.

**Preconditions:** Mutation request includes idempotency key.

**Inputs:** actor/account scope, operation type, idempotency key, canonical request fingerprint.

**Processing Steps:** detect prior completed/in-progress operation; return prior result or safe conflict; never re-create duplicate Enrollment/CorporateEnrollment.

**Outputs & Postconditions:** deterministic retry behavior.

**Priority:** Must

---

## FR-CTM-040 – Return Per-Participant Bulk Outcomes

**Description & Actors:** Gives deterministic results for bulk enrollment.

**Actors:** CTM Admin, Enrollment Officer.

**Preconditions:** Bulk operation executed.

**Inputs:** operation ID.

**Processing Steps:** correlate every input row to result; classify success, reused/idempotent, validation failed, credit blocked, capacity failed, owner-context failed.

**Outputs & Postconditions:** per-row result with stable error codes and summary counts.

**Priority:** Must

---

## FR-CTM-041 – Enforce Branch Isolation on Enrollment

**Description & Actors:** Ensures user cannot create or view target-branch corporate enrollment outside IAM scope.

**Actors:** System/IAM.

**Preconditions:** User submits command/query.

**Inputs:** authenticated user, target branch, server-resolved branch access.

**Processing Steps:** ignore client authorization claims; resolve UserBranchAccess; validate parent/child rights; enforce query/command scope.

**Outputs & Postconditions:** unauthorized cross-branch access fails without data leakage.

**Priority:** Must

---

## FR-CTM-042 – Corporate Training Participant Roster

**Description & Actors:** Displays participant roster with CTM linkage and training dimensions.

**Actors:** CTM Admin, Training Coordinator, authorized Trainer for assigned batch subset.

**Preconditions:** read permission and scope.

**Inputs:** account, contract, course, batch, branch, participant status, enrollment status, date range.

**Processing Steps:** query CTM participant/linkage data plus approved enrollment/batch read models; paginate and sort.

**Outputs & Postconditions:** roster view without duplicating source transactions.

**Priority:** Must

---

## FR-CTM-043 – Display Batch and Session Delivery Status

**Description & Actors:** Surfaces batch/session status from Training Delivery/Scheduling.

**Actors:** CTM Admin, Training Coordinator, Account Manager.

**Preconditions:** view permission.

**Inputs:** account/enrollment/batch filters.

**Processing Steps:** map CorporateEnrollment to Enrollment then batch/session read projection.

**Outputs & Postconditions:** current delivery status displayed; CTM does not own Batch/Session.

**Priority:** Must

---

## FR-CTM-044 – Display Attendance Status

**Description & Actors:** Shows participant attendance data from Attendance context.

**Actors:** CTM Admin, Training Coordinator, authorized corporate external user where enabled.

**Preconditions:** attendance read authorization and account scope.

**Inputs:** account, participant, enrollment, batch, date range.

**Processing Steps:** query Attendance read model keyed by enrollment; aggregate/display according to permission.

**Outputs & Postconditions:** attendance status/percentage visible; Attendance remains owner.

**Priority:** Should

---

## FR-CTM-045 – Display Exam, Result and Completion Status

**Description & Actors:** Shows completion-related status without evaluating rules in CTM.

**Actors:** CTM Admin, Training Coordinator, authorized account viewer.

**Preconditions:** read permission.

**Inputs:** enrollment/account filters.

**Processing Steps:** query Exam & Completion read model; display status and approval state.

**Outputs & Postconditions:** completion status visible; CTM performs no eligibility computation.

**Priority:** Should

---

## FR-CTM-046 – Display Certificate Status

**Description & Actors:** Shows certificate issuance status and authorized access reference.

**Actors:** CTM Admin, Account Manager, authorized corporate contact.

**Preconditions:** certificate read permission/account scope.

**Inputs:** account, participant, enrollment.

**Processing Steps:** query Certificate read model; filter authorization; return status/reference.

**Outputs & Postconditions:** certificate visibility without CTM issuing certificates.

**Priority:** Should

---

## FR-CTM-047 – Display Finance Status

**Description & Actors:** Shows invoice/payment/outstanding summary for authorized users.

**Actors:** Finance User, Account Manager with permitted visibility, authorized corporate contact.

**Preconditions:** finance-status read permission; account scope.

**Inputs:** account, contract, enrollment, invoice status, aging filter.

**Processing Steps:** query Finance read model; enforce data minimization; return summary.

**Outputs & Postconditions:** finance status visible; Finance remains owner.

**Priority:** Should

---

## FR-CTM-048 – Display Document Verification Status

**Description & Actors:** Shows whether required corporate/participant documents are uploaded and verified.

**Actors:** CTM Admin, Compliance User.

**Preconditions:** document-status read permission.

**Inputs:** owner type/id, document type filters.

**Processing Steps:** query Document Management read model; return status, expiry and verification metadata according to permission.

**Outputs & Postconditions:** compliance status visible; file/document records remain Document-owned.

**Priority:** Should

---

## FR-CTM-049 – Branch and Consolidated Operational Views

**Description & Actors:** Supports branch-scoped and explicitly authorized consolidated operational views.

**Actors:** Branch Manager, Management Viewer.

**Preconditions:** read permission; IAM branch access resolved; consolidated flag when applicable.

**Inputs:** branch filters, account, date range.

**Processing Steps:** resolve allowed branch set; intersect requested filters; reject unauthorized branches; query read model.

**Outputs & Postconditions:** correctly scoped operational data.

**Priority:** Must

---

## FR-CTM-050 – Request Corporate Training Notifications

**Description & Actors:** Requests reminders/notifications for significant operations through Communication context.

**Actors:** CTM workflow service, Communication & Notification.

**Preconditions:** triggering business event; recipient/context data available.

**Inputs:** template code, recipient person/contact reference, channel preference, payload, scheduling instruction.

**Processing Steps:** CTM submits notification request through application boundary; Communication resolves template/delivery; CTM stores no provider delivery log.

**Outputs & Postconditions:** NotificationRequest exists in owning context; delivery outcome traceable there.

**Priority:** Should

---

## FR-CTM-051 – Supply Corporate Training Reporting Data

**Description & Actors:** Makes CTM-owned dimensions available to Reporting context.

**Actors:** Reporting & Dashboards read pipeline/service.

**Preconditions:** authorized reporting query/read model refresh.

**Inputs:** account, contract, participant and CorporateEnrollment dimensions.

**Processing Steps:** expose optimized read interface/view; Reporting composes with other context measures.

**Outputs & Postconditions:** reportable corporate dimensions without Reporting owning transactions.

**Priority:** Must

---

## FR-CTM-052 – Corporate Training Reports and Export

**Description & Actors:** Supports operational reports and authorized export through Reporting context.

**Actors:** CTM Admin, Branch Manager, Management Viewer.

**Preconditions:** report/export permission and scope.

**Inputs:** filters, columns, sort, export format.

**Processing Steps:** validate report permission; apply server-side scope; query reporting read model; generate export; audit sensitive export where required.

**Outputs & Postconditions:** scoped report/export.

**Priority:** Should

---

## FR-CTM-053 – Audit Sensitive CTM Actions

**Description & Actors:** Ensures defined sensitive actions are auditable.

**Actors:** CTM application services, Audit & Compliance.

**Preconditions:** Sensitive command accepted or rejected at material business boundary.

**Inputs:** entity, action, old/new values, actor, timestamp, reason, IP, correlation ID.

**Processing Steps:** send/record audit action through owner boundary; ensure business transaction and audit consistency follow architecture standard.

**Outputs & Postconditions:** searchable audit record or correlated auditable outcome.

**Priority:** Must

---

## FR-CTM-054 – Equipment Availability Validation

**Description & Actors:** Workflow requires equipment availability to influence batch allocation.

**Actors:** Training Coordinator.

**Preconditions:** Equipment ownership/model approved.

**Inputs:** equipment requirements, location, dates.

**Processing Steps:** cannot be finalized until source-of-truth context is defined.

**Outputs & Postconditions:** future availability result.

**Priority:** Should

**DDD/ER Gap:** No equipment aggregate or owning context exists. Do not implement a CTM-owned equipment table without DDD revision.

---

## FR-CTM-055 – Travel and Accommodation Cost Capture

**Description & Actors:** Workflow requires flight, taxi, fuel, vehicle, driver, mileage, hotel, nights, meals and allowance data.

**Actors:** Training Coordinator, Finance/Operations users.

**Preconditions:** Travel/expense owning context approved.

**Inputs:** travel/accommodation cost data.

**Processing Steps:** deferred pending domain ownership.

**Outputs & Postconditions:** none in current CTM implementation.

**Priority:** Could / Deferred

**DDD/ER Gap:** Workflow explicitly calls for a separate Travel Module; current DDD/ER does not define it.

---

## FR-CTM-056 – Corporate Training Costing and Profitability

**Description & Actors:** Workflow asks to calculate direct cost, indirect cost, total cost, selling price, profit and profit percentage.

**Actors:** Management, Finance, Corporate Sales, CTM users.

**Preconditions:** Cost sources and ownership approved.

**Inputs:** trainer, venue, equipment, printing, certificates, travel, accommodation, food, vehicle, administration, marketing and miscellaneous costs; selling price.

**Processing Steps:** cannot be finalized until cost-source ownership, allocation rules and authoritative selling-price source are defined.

**Outputs & Postconditions:** future costing/profitability result.

**Priority:** Should / Blocked by model gap

**DDD/ER Gap:** No costing aggregate or authoritative direct/indirect cost model exists.

---

## FR-CTM-057 – Corporate Training Project Closure

**Description & Actors:** Workflow requires closure only after training completion, attendance submission, feedback upload, certificate issue, invoice issue and payment receipt or management approval.

**Actors:** CTM Admin, Branch Manager, Finance, Administration.

**Preconditions:** Project aggregate/lifecycle is approved.

**Inputs:** project identifier and cross-context completion evidence.

**Processing Steps:** cannot be implemented transactionally until `CorporateTrainingProgram`/Project persistence and owner are reconciled between DDD and ER.

**Outputs & Postconditions:** future Closed state.

**Priority:** Should / Blocked by model gap

**DDD/ER Gap:** DDD mentions CorporateTrainingProgram but ER v3 has no corresponding entity or state machine.

---

## FR-CTM-058 – GIVT Training Separation

**Description & Actors:** Workflow asks for a separate GIVT module with enquiry-to-project-closure flow and separate reporting.

**Actors:** Management, GIVT operations users.

**Preconditions:** Architecture decision on whether GIVT is a bounded context, corporate program type, funding scheme, or reporting dimension.

**Inputs/Processing/Outputs:** Deferred until domain decision.

**Priority:** Could / Deferred

**DDD/ER Gap:** No GIVT context or model is defined.

---

# 4. Comprehensive Business Rules

| Rule ID | Business Rule | Enforcement Point | DDD/ER Alignment |
|---|---|---|---|
| BR-CTM-001 | Corporate Training owns CorporateAccount, CorporateContact, CorporateContract, CorporateParticipant and CorporateEnrollment linkage data. | Package boundary and repositories | Directly aligned with DDD Data Ownership and ER Section 17 |
| BR-CTM-002 | Corporate Training must not own or directly mutate Quotation, SalesOrder or CorporateSalesLead. | Application architecture | Corporate Sales & Quotation owns these entities |
| BR-CTM-003 | A CorporateAccount must reference a valid Organization Party record. | Account creation | ER `CorporateAccount.organizationId`; Person/Party model |
| BR-CTM-004 | A human identity must be represented by one Person record and reused across contact, participant, student, trainer or user roles. | Identity resolution | DDD Person/Party and ER Person relationships |
| BR-CTM-005 | A CorporateContact must belong to exactly one CorporateAccount and reference one Person. | Contact create/update | ER CorporateContact fields |
| BR-CTM-006 | A CorporateParticipant must belong to one CorporateAccount and reference one Person. | Participant create/update | DDD Corporate Account invariant; ER model |
| BR-CTM-007 | The same Person may have distinct CorporateParticipant relationships for different employers without duplicating Person identity. | Participant resolution | Derived from Party model and corporate linkage preservation |
| BR-CTM-008 | Historical corporate participation and enrollment linkage must not be reassigned to a new employer when a Person changes company. | Participant/account change workflow | Preserves corporate billing/reporting linkage |
| BR-CTM-009 | Duplicate Person creation must be prevented using approved identity resolution, with Civil ID as a strong identifier where available. | Person resolution/import | Aligns shared Person identity principle; exact uniqueness implementation requires schema confirmation |
| BR-CTM-010 | CorporateAccount and participant records must not be hard-deleted. | Repository layer | Common ER soft-delete conventions and project principle |
| BR-CTM-011 | Contract end date must not precede start date. | Contract validation | Basic integrity rule consistent with ER fields |
| BR-CTM-012 | A contract used for enrollment must belong to the same CorporateAccount as the participant. | Enrollment guard | Corporate aggregate invariant |
| BR-CTM-013 | A contract that is expired, inactive, not yet effective, or otherwise ineligible must not be used for a new corporate enrollment. | Enrollment guard | DDD: corporate enrollment follows contract terms |
| BR-CTM-014 | Supported billing models are Per Student, Per Batch, Per Hour and Fixed Contract unless Configuration expands the approved enumeration. | Contract validation | ER Section 17.3 |
| BR-CTM-015 | Contract amendments must not silently rewrite historical invoice/payment truth. | Contract update | Finance ownership and audit principle |
| BR-CTM-016 | Every corporate learning journey must become a central Enrollment. | Enrollment orchestration | Core DDD/ER enrollment-centric rule |
| BR-CTM-017 | Every Enrollment must link to a Course and a Batch. | Admission & Enrollment owner validation | DDD Enrollment invariant; ER key constraints |
| BR-CTM-018 | CorporateParticipant is not an alternative to StudentProfile; the participant becomes/links to a student when enrolled. | Enrollment orchestration | Explicit DDD/ER rule |
| BR-CTM-019 | Corporate linkage must remain after StudentProfile creation for billing and reporting. | CorporateEnrollment and participant linkage | Explicit DDD/ER rule |
| BR-CTM-020 | CorporateEnrollment may be created only after a valid Enrollment exists. | CTM transaction/orchestration | Prevents dangling linkage; aligns ownership |
| BR-CTM-021 | `CorporateParticipant.linkedStudentProfileId` must reference the StudentProfile belonging to the same Person identity. | Link operation | Derived integrity rule from Party model |
| BR-CTM-022 | A CorporateEnrollment must reference a participant belonging to its CorporateAccount. | CTM domain validation | Corporate aggregate invariant |
| BR-CTM-023 | Course definitions, prices, discounts and completion rules are read from Course Catalog; CTM must not duplicate them as authoritative data. | Integration boundary | DDD ownership rule |
| BR-CTM-024 | Pricing resolution follows Batch, then Branch, then Global Course fallback. | Course Catalog service / Enrollment flow | Explicit DDD/ER pricing hierarchy |
| BR-CTM-025 | Discount resolution follows Batch, then Branch, then Global Course fallback. | Course Catalog service / Enrollment flow | Explicit DDD/ER discount hierarchy |
| BR-CTM-026 | Batch validity, course relationship and capacity must be validated by Training Delivery before enrollment proceeds. | Enrollment guard | Batch owner and capacity invariant |
| BR-CTM-027 | Trainer availability is read/validated through Faculty / Trainer Management and Scheduling; CTM does not maintain authoritative availability. | Planning workflow | DDD ownership |
| BR-CTM-028 | Classroom and schedule conflicts are controlled by Scheduling & Calendar; CTM must not bypass conflict validation. | Planning workflow | DDD Scheduling rules |
| BR-CTM-029 | Corporate credit validation must be obtained from Finance where configured. | Enrollment guard | DDD Finance and corporate credit integration |
| BR-CTM-030 | If credit limit is exceeded and blockOnCreditLimit is true, enrollment must be blocked. | Finance validation result handling | Explicit DDD/ER corporate credit rule |
| BR-CTM-031 | If credit limit is exceeded and blockOnCreditLimit is false, enrollment may proceed with the validation outcome recorded. | Finance validation result handling | Explicit DDD rule |
| BR-CTM-032 | CTM must not compute currentOutstanding or authoritative available credit independently of Finance. | Package boundary | Resolves overlap risk in DDD/ER ownership |
| BR-CTM-033 | Invoice, Payment, Receipt, Refund and Receivable records are owned by Finance. | Architecture/repository boundary | DDD Data Ownership |
| BR-CTM-034 | Attendance status is owned by Attendance and may only be read by CTM through authorized projections. | Operational view | DDD ownership |
| BR-CTM-035 | Completion eligibility is evaluated by Exam & Completion, not CTM. | Operational/closure views | DDD completion ownership |
| BR-CTM-036 | Certificate generation and issue are owned by Certificate Management; CTM only reads status/access references. | Operational view | DDD Certificate rule |
| BR-CTM-037 | Document file metadata and verification status are owned by Document Management. | Document interaction | DDD Data Ownership |
| BR-CTM-038 | Notifications are sent and logged by Communication & Notification; CTM submits requests only. | Notification boundary | DDD ownership |
| BR-CTM-039 | Dashboard and report definitions are owned by Reporting & Dashboards; CTM provides source dimensions/read interfaces. | Reporting integration | DDD reporting rule |
| BR-CTM-040 | AuditLog is owned by Audit & Compliance; CTM must produce auditable action data for sensitive changes. | Audit integration | DDD ownership |
| BR-CTM-041 | All CTM commands require authentication and action-level permission. | API/application guard | IAM rules |
| BR-CTM-042 | All CTM queries and commands must enforce server-side branch or account scope; client-supplied scope is not trusted. | Query/command layer | DDD branch access rules and project principle |
| BR-CTM-043 | Parent-branch access to child branches is allowed only when IAM grants it; child branch users do not automatically access parent data. | Authorization scope | ER UserBranchAccess rules |
| BR-CTM-044 | Consolidated corporate training reports require both report permission and consolidated branch access. | Reporting guard | IAM dashboard/report access principles |
| BR-CTM-045 | External corporate access, when implemented, must be restricted to explicitly linked CorporateAccount data. | External authorization | DDD corporate portal requirement; implementation boundary |
| BR-CTM-046 | Bulk participant import must return row-level validation and must not silently discard invalid rows. | Import application service | Reliability/business integrity rule |
| BR-CTM-047 | Duplicate rows inside one import/nomination set must be detected before commit. | Import validation | Prevents duplicate participant creation |
| BR-CTM-048 | Bulk enrollment must return one deterministic result per requested participant. | Enrollment orchestration | Reliability and auditability |
| BR-CTM-049 | Retrying an enrollment request with the same idempotency key must not create duplicate Enrollment or CorporateEnrollment records. | Command boundary | Production reliability requirement consistent with aggregate integrity |
| BR-CTM-050 | Participant import, contract changes, participant identity linkage, account status changes and bulk enrollment are sensitive auditable actions. | Audit integration | Audit & Compliance requirements |
| BR-CTM-051 | PII such as Civil ID, passport data and participant contact data must not be emitted in plain-text application logs. | Logging/observability | Security principle |
| BR-CTM-052 | Exports must apply the same server-side authorization and scope as interactive queries. | Export endpoint | Security rule |
| BR-CTM-053 | Portal access eligibility on CorporateContact does not itself create a User or grant IAM permission. | Contact workflow | IAM ownership boundary |
| BR-CTM-054 | Nomination is a valid CTM responsibility, but persistence must not be invented until a nomination aggregate/entity decision is approved. | Architecture gate | DDD responsibility vs ER gap |
| BR-CTM-055 | `CorporateDepartment`, `CorporateCoordinator` and `CorporateTrainingProgram` are mentioned in DDD but must not be persisted ad hoc because ER v3 omits them. | Architecture gate | Explicit DDD/ER mismatch |
| BR-CTM-056 | Equipment allocation must not be implemented as CTM-owned data until an Equipment owner/model is approved. | Architecture gate | Workflow-only requirement gap |
| BR-CTM-057 | Travel and accommodation transactions must not be added to CTM tables; workflow asks for a separate Travel Module and current DDD has no owner. | Architecture gate | Workflow vs DDD/ER gap |
| BR-CTM-058 | Costing/profitability calculations must not become authoritative until source cost ownership and allocation rules are defined. | Architecture gate | Workflow vs model gap |
| BR-CTM-059 | Project closure state must not be introduced on CorporateAccount, Contract or Enrollment as a substitute for a missing project/program aggregate. | Architecture gate | Prevents semantic corruption |
| BR-CTM-060 | GIVT must not be modeled as a new bounded context or duplicate corporate lifecycle until architecture decides whether it is a context, program type or reporting dimension. | Architecture gate | Workflow vs DDD gap |
| BR-CTM-061 | Soft-deleted accounts/contacts/participants are excluded from normal selection but retained for historical reporting according to policy. | Query layer | Soft-delete convention |
| BR-CTM-062 | Mutable aggregate updates should enforce optimistic concurrency using repository version conventions. | Repository/application layer | ER common base field recommendation |
| BR-CTM-063 | Cross-context operations must preserve correlation identifiers for audit and troubleshooting. | Application orchestration | Audit/observability requirement |
| BR-CTM-064 | Failure of notification delivery must not roll back a successfully committed CorporateAccount, Contract or Participant mutation. | Application boundary | Communication side effect isolation |
| BR-CTM-065 | Failure to create the central Enrollment must prevent creation of CorporateEnrollment linkage. | Enrollment orchestration | Referential and ownership integrity |
| BR-CTM-066 | If Enrollment succeeds but CTM linkage creation fails, the operation must be surfaced as a recoverable reconciliation condition; retry must be idempotent. | Operations/application design | Cross-context consistency rule |
| BR-CTM-067 | Corporate training status views are projections and must not be used to mutate owner-context records through CTM repositories. | Read model boundary | DDD ownership |
| BR-CTM-068 | Business dates and scheduled times must be interpreted using ASTI's configured timezone; localized display should support English/Arabic where fields are localized. | UI/API/date handling | ER localization and institute timezone model |
| BR-CTM-069 | Corporate contract billing terms control corporate training billing behavior, but invoice issuance remains a Finance action. | CTM/Finance boundary | DDD Corporate Training and Finance rules |
| BR-CTM-070 | Quotation-to-invoice traceability is required, but CTM must preserve only approved references/linkages and not duplicate quotation or invoice ownership. | Cross-context traceability | DDD Corporate Sales and Finance rules |

---

# 5. Cross-Module Dependencies Mapping

| Dependent Context | Direction | Data/Capability Used | CTM Responsibility | Owning Context Responsibility |
|---|---|---|---|---|
| Identity & Access | CTM → IAM | user identity, permissions, branch access, consolidated access | request/evaluate authorization context; enforce scope | own User/Role/Permission/UserBranchAccess |
| Organization Management | CTM → Organization | ASTI branch and organization references | reference valid organization/branch IDs | own Branch/Department/Classroom/organization structure |
| Person/Party Model | CTM ↔ Party | Organization and Person identities | resolve/reuse identities; create contextual links | own/maintain canonical identity data through approved boundary |
| Corporate Sales & Quotation | Sales → CTM | approved quotation, order, commercial handoff | accept reference and begin delivery preparation | own sales lead, quotation, line items, sales order and pipeline |
| Course Catalog | CTM → Course | course eligibility, pricing, discounts, completion-rule reference | request validation/resolution | own course and pricing/discount/completion rules |
| Training Delivery | CTM → Delivery | batch, capacity, session and delivery status | select and validate; read status | own Batch, Session, WaitingList, BatchTrainer |
| Scheduling & Calendar | CTM → Scheduling | timetable, classroom availability, conflict result | request feasibility/read status | own scheduling, holiday and venue blocks |
| Faculty / Trainer | CTM → Trainer | trainer availability/authorization | read/validate during planning | own trainer profile, qualifications, availability and authorization |
| Admission & Enrollment | CTM → Enrollment | StudentProfile and Enrollment creation | request create/link; store CorporateEnrollment linkage | own StudentProfile and Enrollment aggregate |
| Finance & Receivables | CTM ↔ Finance | credit validation, invoice/payment/outstanding summary | request validation and consume read views | own credit computation, Invoice, Payment, Receipt, Refund, Receivable |
| Attendance | CTM → Attendance | attendance status/percentage | consume read view | own AttendanceSession/Record/Correction |
| Exam & Completion | CTM → Completion | exam/result/completion state | consume read view | evaluate and approve completion |
| Certificate | CTM → Certificate | certificate status/access | consume read view | generate, issue, verify, reissue, revoke |
| Document Management | CTM → Documents | LPO/nomination/participant document references and verification status | reference/read; initiate upload flow if permitted | own Document and DocumentVerification |
| Communication & Notification | CTM → Communication | notification requests and delivery result | submit request | own templates, request and log |
| Reporting & Dashboards | CTM → Reporting | account/contract/participant/enrollment dimensions | expose source read model | own report/dashboard definitions and KPI composition |
| Audit & Compliance | CTM → Audit | sensitive action records | submit auditable event/action context | own AuditLog/ApprovalHistory |

---

# 6. DDD and ER Model Explicit Alignment Comparison

## 6.1 Strongly Aligned Areas

### Corporate Account Ownership

The DDD explicitly assigns corporate account, contract and participant data to Corporate Training. ER v3 provides `CorporateAccount`, `CorporateContact`, `CorporateContract`, `CorporateParticipant` and `CorporateEnrollment`. Part 1 therefore treats these as CTM-owned transactional entities.

### Enrollment-Centric Lifecycle

Both source documents state that every learning journey becomes an Enrollment. The corporate path is therefore modeled as:

```text
CorporateAccount
    ↓
CorporateParticipant → Person
    ↓
StudentProfile create/link
    ↓
Enrollment → Course + Batch + Branch
    ↓
CorporateEnrollment linkage
```

No independent corporate learner lifecycle is introduced.

### Person/Party Reuse

The DDD and ER both require shared Person/Party identity. Participant and contact functions therefore create contextual relationships and do not duplicate identity.

### Corporate Participant to Student Conversion

Both sources explicitly state that a corporate participant becomes or is linked as a student when enrolled and that corporate linkage remains for billing and reporting. FR-CTM-035, FR-CTM-036 and FR-CTM-038 implement that boundary.

### Contract Terms

The DDD states that the corporate contract determines billing terms. ER v3 supplies contract number, value, dates, billing model, payment terms and status. Contract validation is therefore a mandatory enrollment guard.

### Corporate Credit Validation

Both DDD and ER define the blocking rule. CTM requests the decision from Finance and applies the outcome; CTM does not own invoices or authoritative receivables.

### Cross-Context Training Lifecycle

The DDD ownership table clearly separates Batch, Scheduling, Attendance, Completion, Certificate and Finance. The FRD therefore uses read/validation interfaces and avoids direct repository writes across boundaries.

### Branch Access

IAM/ER branch access rules require server-side scope. FR-CTM-041 and BR-CTM-041 through BR-CTM-045 enforce permission plus data scope rather than trusting UI filters.

---

## 6.2 Areas Where Workflow Is Mapped to Existing Owners

| Workflow Requirement | Mapped Owner | CTM Role |
|---|---|---|
| Proposal and quotation | Corporate Sales & Quotation | Receive approved commercial handoff/reference |
| Email confirmation/LPO/nomination files | Document Management for file records; CTM for business association | reference verification/source document; nomination model gap remains |
| Candidate duplicate validation | Person/Party resolution + CTM participant relationship | resolve identity and prevent duplicate contextual relation |
| Batch allocation | Training Delivery + Scheduling | coordinate selection and request validation |
| Trainer availability | Faculty / Trainer + Scheduling | consume availability/conflict outcome |
| Training hall/classroom availability | Scheduling/Organization | consume availability |
| Attendance | Attendance | read status; do not own |
| Assessment and completion | Exam & Completion | read status; do not compute |
| Certificate | Certificate | read status/access only |
| Tax invoice, receipt, credit note | Finance | provide corporate/enrollment references; Finance owns transaction |
| Outstanding payment buckets | Finance/Reporting | consume authorized read view |
| Corporate client reporting | Reporting & Dashboards | provide CTM dimensions |

---

## 6.3 Explicit DDD/ER Gaps Requiring Resolution Before Later FRD Parts

### GAP-CTM-001 – Corporate Nomination Persistence

The DDD lists participant nominations and bulk enrollment as CTM responsibilities. The workflow requires nomination lists. ER v3 contains CorporateParticipant and CorporateEnrollment but no CorporateNomination or NominationList entity.

**Required decision before Part 4:** either define a CTM-owned nomination aggregate/entity in the DDD/ER or explicitly treat nomination as an ephemeral import process with Document + audit correlation. The latter has weaker business traceability and should be consciously approved.

### GAP-CTM-002 – CorporateDepartment

DDD lists `CorporateDepartment`; ER v3 stores department as a string on CorporateParticipant and CorporateContact but has no CorporateDepartment entity.

**Required decision:** keep department as descriptive text or add an owned corporate department model. This FRD does not invent one.

### GAP-CTM-003 – CorporateCoordinator

DDD lists `CorporateCoordinator`; ER v3 has CorporateContact with `portalAccessEnabled` but no coordinator entity/role relation.

**Required decision:** represent coordinator as a CorporateContact role/attribute, Configuration-based contact role, or separate entity. Part 1 avoids inventing storage.

### GAP-CTM-004 – CorporateTrainingProgram / Project

DDD lists `CorporateTrainingProgram`, and the workflow includes project closure. ER v3 contains no corresponding entity.

**Required decision:** define whether a corporate program/project aggregate is required to group contracts, batches, participants, costs, documents and closure status. Do not overload CorporateAccount, CorporateContract or Enrollment with project-closure state.

### GAP-CTM-005 – Equipment

Workflow requires equipment availability and equipment cost. No DDD owner or ER entity exists.

**Required decision:** define Equipment/Asset/Resource capability or remove the requirement from current phase.

### GAP-CTM-006 – Travel and Accommodation

Workflow explicitly requests a separate Travel Module. DDD/ER current scope contains none.

**Required decision:** add a bounded context/module in a later architecture revision or defer.

### GAP-CTM-007 – Costing and Profitability

Workflow requires direct/indirect cost calculation and profit percentage. Current DDD/ER does not define source-of-truth models for trainer cost consumption, travel, venue/equipment cost, printing, food, vehicles, administrative allocation or marketing allocation.

**Required decision:** establish costing ownership and allocation methodology before a transactional costing sheet is designed.

### GAP-CTM-008 – GIVT

Workflow asks for GIVT as a completely separate module, but DDD v3 does not define that context.

**Required decision:** determine whether GIVT is a separate bounded context, a corporate training program type, a funding/customer segment, or a reporting discriminator.

### GAP-CTM-009 – Corporate Portal Application Scope

DDD says Corporate Training should support a corporate portal for nominations, invoices, certificates and training status. The current application strategy says single admin portal first.

**Required decision:** retain API/domain readiness now and schedule a dedicated external portal application later, or expand the current phase explicitly.

### GAP-CTM-010 – Corporate Credit Field Ownership Overlap

ER v3 places creditLimit/currentOutstanding/blockOnCreditLimit on CorporateAccount and also defines Finance-owned CorporateCreditRule. DDD assigns corporate account to CTM but financial transactions and credit validation to Finance.

**Required decision:** define authoritative write ownership. This FRD's safe rule is that Finance owns computed outstanding/available credit and validation, while CTM consumes the result. Any duplicated account summary fields should be derived/read-only synchronization fields, not independently editable competing truth.

---

# 7. Part 1 Consistency Conclusion

This Part 1 is consistent with the DDD Context Map v3.0 and ER Model v3.0 in the following critical ways:

1. Corporate Training owns the corporate customer operational aggregate and related participant/contract relationships.
2. Corporate Sales remains owner of quotation and sales order.
3. Admission & Enrollment remains owner of StudentProfile and the central Enrollment aggregate.
4. Course and Batch remain mandatory for every corporate learning journey.
5. Person identity is reused rather than copied.
6. Corporate linkage is retained after participant-to-student conversion.
7. Finance remains invoice-centric and authoritative for credit validation and receivables.
8. Training Delivery, Scheduling, Attendance, Completion and Certificate responsibilities remain separated.
9. Branch isolation and permissions are enforced server-side.
10. Sensitive mutations and cross-context orchestration outcomes are auditable.
11. Workflow requirements that do not map cleanly to DDD/ER ownership are explicitly flagged rather than modeled by invention.

The database/entity design for nomination, CorporateDepartment, CorporateCoordinator, CorporateTrainingProgram/Project, equipment, travel, costing and GIVT must not be finalized in later FRD parts until the corresponding architecture gaps are resolved or explicitly deferred.
