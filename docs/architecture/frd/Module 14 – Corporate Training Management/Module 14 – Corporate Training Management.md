# Module 14 – Corporate Training Management

## Document Control

| Field | Value |
|---|---|
| Module | Module 14 – Corporate Training Management |
| Module Code | CTM |
| Business Domain Classification | Core Domain |
| Owning Bounded Context | Corporate Training Management |
| Architecture Style | Next.js monorepo, modular monolith |
| Primary Aggregate | `CorporateAccount` |
| Central Downstream Aggregate | `Enrollment` owned by Admission & Enrollment Management |
| Source Baselines | DDD Context Map v3.0; ER Model v3.0; ASTI ERP Registration & Training Management Process |
| Phase | Phase 2 |
| Application Scope | Single ASTI admin portal first; external corporate portal capability is domain scope but requires separate application/experience planning |
| Development Readiness | Core CTM capability set is ready for implementation; deferred model gaps remain explicitly out of scope until approved |

---

# 1. Purpose and Objective

Module 14 – Corporate Training Management provides the business capability for managing ASTI's corporate customers and the operational training lifecycle that follows an approved corporate commercial engagement.

The module owns the corporate customer relationship records that are operationally required for training delivery: corporate accounts, contacts, contracts, participants, and corporate-to-enrollment linkage. It coordinates, but does not own, quotation and sales pipeline processing, course definitions, batch and session delivery, scheduling, enrollment, finance, attendance, completion, certificates, documents, communication delivery, reporting definitions, or audit records.

The primary objective is to ensure that a corporate customer can move from an approved commercial commitment into a controlled training operation in which:

1. the customer account and authorized contacts are known;
2. contract and billing terms are captured and effective;
3. participants are nominated without duplicating Person identities;
4. each nominated participant becomes or is linked to a `StudentProfile` when training enrollment is created;
5. every training journey flows through the central `Enrollment` aggregate and is linked to a valid `Course` and `Batch`;
6. corporate linkage remains traceable after enrollment for billing, reporting, certificate access, and training status;
7. branch access and authorization are enforced on the server;
8. sensitive state changes are auditable; and
9. cross-context business actions are performed through explicit application boundaries rather than by directly mutating another context's data.

This module implements the DDD rule that Corporate Training owns the corporate account, corporate contract, corporate contact, corporate participant, and corporate enrollment linkage, while the Admission & Enrollment context owns the actual learning enrollment.

---

# 2. Business Goals

| ID | Business Goal |
|---|---|
| BO-CTM-001 | Establish a single, authoritative corporate account record for every corporate customer engaged in ASTI training delivery. |
| BO-CTM-002 | Maintain reusable corporate contacts and participant rosters without duplicating Person identity records. |
| BO-CTM-003 | Preserve contract terms, validity, billing model, and payment terms as the operational basis for corporate training. |
| BO-CTM-004 | Support controlled participant nomination and bulk enrollment into valid course and batch combinations. |
| BO-CTM-005 | Ensure every corporate learner lifecycle passes through the central `Enrollment` aggregate. |
| BO-CTM-006 | Retain corporate linkage after student-profile creation for billing, reporting, training-status visibility, and certificate access. |
| BO-CTM-007 | Prevent duplicate participant identities by resolving persons through the shared Person/Party model before creating new records. |
| BO-CTM-008 | Enforce corporate credit restrictions before enrollment confirmation when blocking credit rules are configured. |
| BO-CTM-009 | Provide operational visibility of corporate participant training status without duplicating data owned by Batch, Attendance, Completion, Finance, or Certificate contexts. |
| BO-CTM-010 | Support corporate training operations across authorized ASTI branches with server-side branch scoping and controlled consolidated visibility. |
| BO-CTM-011 | Maintain traceability from approved quotation or sales order to contract, corporate delivery, participant enrollment, invoice, payment status, completion, and certificate. |
| BO-CTM-012 | Reduce manual registration effort by supporting validated participant import and controlled bulk enrollment. |
| BO-CTM-013 | Provide reliable corporate training reporting dimensions including corporate account, contract, participant, course, batch, branch, billing status, completion status, and certificate status. |
| BO-CTM-014 | Ensure all sensitive corporate account, contract, participant, and bulk-enrollment changes are traceable through audit records. |
| BO-CTM-015 | Keep the modular monolith boundary clean by using context-owned application services and read models rather than cross-package direct writes. |

---

# 3. Scope

## 3.1 Included Scope

The following capabilities are included where they map cleanly to the DDD context map and ER model:

### Corporate Account Management

- create a corporate account against an `Organization` Party record;
- view, search, filter, activate, suspend, and soft-delete corporate accounts subject to lifecycle rules;
- maintain account code, account name, industry, credit parameters, billing cycle, and status;
- prevent unauthorized cross-branch access in operational views;
- provide a corporate account 360-degree view using owned data and read-only cross-context projections.

### Corporate Contact Management

- add and maintain contacts linked to shared `Person` records;
- maintain designation, department, email, phone, primary-contact flag, and portal-access eligibility flag;
- prevent duplicate Person identity creation;
- designate one or more business contacts while enforcing at most one primary contact per configured contact purpose if such purpose rules are introduced through Configuration.

### Corporate Contract Management

- create and maintain contract records for a corporate account;
- capture contract number, value, start date, end date, billing model, payment terms, and status;
- validate effective dates and active status before using a contract for new corporate enrollments;
- support billing models defined by the ER baseline: Per Student, Per Batch, Per Hour, and Fixed Contract;
- preserve contract linkage on corporate enrollment records.

### Corporate Participant Management

- register or link corporate participants using the shared `Person` identity model;
- capture company-specific employee code, department, designation, and participant status;
- link a participant to the `StudentProfile` created or resolved when enrollment occurs;
- preserve the corporate relationship even if the same Person participates under another company in the future;
- validate duplicate candidates using identity-resolution rules before creating Person or participant records.

### Corporate Enrollment Coordination

- select eligible corporate participants;
- select a published/eligible course from Course Catalog read data;
- select a valid batch from Training Delivery read data;
- validate batch capacity through the owning context;
- validate contract applicability;
- request corporate credit validation when configured;
- invoke Admission & Enrollment application services to create or link `StudentProfile` and create the central `Enrollment`;
- create the owned `CorporateEnrollment` linkage only after the Enrollment is successfully created;
- support idempotent bulk-enrollment requests and per-row result reporting.

### Explicitly Deferred from Development

The following workflow items are not part of the development-ready CTM core and remain deferred until a separate architecture decision is approved:

- Corporate Nomination persistence;
- CorporateTrainingProgram / Project lifecycle;
- Equipment allocation;
- Travel and accommodation costing;
- Costing and profitability ownership;
- Project closure lifecycle;
- GIVT-specific module separation.

### Development Readiness Matrix

| Capability | Status | Notes |
|---|---|---|
| Corporate Account Management | Ready Now | Core CRUD, search, lifecycle, audit, and soft-delete behavior are defined. |
| Corporate Contact Management | Ready Now | Shared Person linkage, primary contact, and portal eligibility behavior are defined. |
| Corporate Contract Management | Ready Now | Contract lifecycle, billing model, and enrollment applicability are defined. |
| Corporate Participant Management | Ready Now | Person reuse, employer context, and duplicate prevention are defined. |
| Participant Import | Ready Now | Validation, commit, idempotency, and audit behavior are defined. |
| Corporate Enrollment Orchestration | Ready Now | Orchestrates owner-context calls and creates only the CTM linkage after Enrollment succeeds. |
| Operational Corporate Training Views | Ready Now | Read-only projections only; no foreign transactional writes. |
| Reporting Inputs and Exports | Ready Now | Scoped reporting feeds and exports are defined as read-only outputs. |
| Reconciliation and Repair | Ready Now | Deterministic repair of CTM linkage only; Enrollment remains owner-controlled. |
| Account-to-Branch Ownership | ADR Required | Final persistence/scoping relation for pre-enrollment corporate accounts is still governed by architecture decision. |
| Credit Field Write Ownership | ADR Required | CTM and Finance overlap on credit fields; write authority must be finalized. |
| Corporate Portal Authentication / Scope | ADR Required | External portal capability is domain-scoped but not part of initial implementation scope. |
| Consolidated Dashboard Permission Catalog | ADR Required | Executive consolidated permissions require IAM governance approval. |
| Corporate Contact Lifecycle Status Schema | ADR Required | Contact lifecycle is defined in the FRD, but schema approval is still required before migration. |
| Corporate Nomination Persistence | Deferred | Not implemented in the CTM core until DDD/ER approval. |
| CorporateTrainingProgram / Project Lifecycle | Deferred | Not implemented in the CTM core until DDD/ER approval. |
| Equipment Allocation | Deferred | Not implemented in the CTM core until DDD/ER approval. |
| Travel and Accommodation | Deferred | Not implemented in the CTM core until DDD/ER approval. |
| Costing and Profitability | Deferred | Not implemented in the CTM core until DDD/ER approval. |
| Project Closure | Deferred | Not implemented in the CTM core until DDD/ER approval. |
| GIVT Module Separation | Deferred | Not implemented in the CTM core until DDD/ER approval. |

### Operational Corporate Training Views

- view participant roster by account, contract, course, batch, branch, and status;
- view training delivery status from Batch and Session read models;
- view attendance status and percentage from Attendance read models;
- view completion status from Exam & Completion read models;
- view certificate status and certificate access metadata from Certificate read models;
- view invoice and receivable status from Finance read models, subject to finance permissions;
- view document verification status from Document Management read models.

### Corporate Portal Domain Support

The DDD baseline states that the corporate portal should support nominations, invoices, certificates, and training status. This FRD treats those as required domain capabilities and access-controlled APIs/read models. The current application strategy is a single admin portal first; therefore a dedicated external corporate portal application and its authentication/onboarding UX are not specified as implementation scope in this module until application scope is approved.

### Corporate Training Reporting Inputs

- provide corporate-owned dimensions and linkage data for Reporting & Dashboards;
- support corporate account, contact, contract, participant, and corporate enrollment data feeds/read models;
- do not own dashboard definitions or metric snapshots.

## 3.2 Excluded Scope

The following are explicitly outside Corporate Training ownership:

| Excluded Capability | Owning Context / Disposition |
|---|---|
| B2B sales lead management | Corporate Sales & Quotation |
| Marketing visit and sales follow-up lifecycle | Corporate Sales & Quotation or CRM, depending approved boundary |
| Quotation creation, approval, revision history, sales order | Corporate Sales & Quotation |
| Course master, pricing, discounts, completion rules | Course Catalog |
| Batch, session, waiting list, delivery status | Training Delivery |
| Timetable, room booking, holiday and conflict management | Scheduling, Calendar & Holiday |
| Trainer profile, qualification and availability ownership | Faculty / Trainer Management |
| StudentProfile and Enrollment ownership | Admission & Enrollment |
| Attendance records and corrections | Attendance |
| Exams, results, completion evaluation and approval | Exam, Result & Completion |
| Certificate generation, verification, reissue, revocation | Certificate Management |
| Invoice, receipt, payment, refund, receivable, credit rule computation | Fee, Billing & Receivables |
| File storage metadata, document verification, expiry | Document Management |
| Message templates, notification requests and delivery logs | Communication & Notification |
| Dashboard/report definitions and metric snapshots | Reporting & Executive Dashboards |
| AuditLog and approval history ownership | Audit & Compliance |
| Travel and accommodation management | **DDD/ER gap: workflow requests a separate Travel Module; no current bounded context or ER model exists** |
| Equipment availability/allocation | **DDD/ER gap: workflow requires equipment availability but current DDD/ER model has no equipment aggregate/context** |
| Automated costing sheet with direct/indirect costs and profitability | **DDD/ER gap: workflow requires costing and profitability but no current owning aggregate/model is defined** |
| Corporate training project closure aggregate/state machine | **DDD/ER gap: workflow describes project closure but no `CorporateTrainingProject`/`Project` entity is defined in ER v3** |
| GIVT as a completely separate module | **Requires architecture decision; current DDD does not define a GIVT bounded context** |
| HRMS, ESS, Payroll, Tally, Biometric, AI | Future phases |

---

# 4. Stakeholders and Actors

## 4.1 Human Actors

| Actor | Type | Responsibilities in Module | Access Characteristic |
|---|---|---|---|
| Corporate Training Administrator | Internal | Manage account operational data, contracts, participants, nominations, bulk enrollment, roster and training status | Branch-scoped unless consolidated permission is granted |
| Corporate Account Manager | Internal | Maintain corporate customer relationship data, contacts, contracts, participant coordination | Assigned branches/accounts; no implicit finance privileges |
| Marketing Executive / Corporate Sales User | Internal | Hands off approved quotation/order/contract references to Corporate Training; views delivery status | Primarily Corporate Sales permissions; limited read access in CTM |
| Admission / Enrollment Officer | Internal | Resolves StudentProfile and creates Enrollment through Admission & Enrollment workflows | Branch-scoped enrollment permission |
| Training Coordinator | Internal | Coordinates participant allocation with courses, batches, trainers, rooms, dates | Read/use permissions across CTM, Training Delivery and Scheduling |
| Branch Manager | Internal | Reviews branch corporate training operations and exceptional decisions | Branch or child-branch scope according to IAM access |
| Finance User | Internal | Views contract/enrollment linkage and performs invoicing/receivables work in Finance context | Finance permissions; CTM read-only where needed |
| Trainer | Internal/Contracted | Views assigned batch and candidate list through Trainer/Training Delivery capability | Only assigned delivery data; does not maintain corporate account master |
| Academic Coordinator | Internal | Reviews completion workflow in Exam & Completion | Read corporate linkage where required |
| Certificate Administrator | Internal | Issues certificates after eligibility and payment validation | Certificate permissions; CTM linkage read-only |
| Compliance / Document Verifier | Internal | Verifies participant or corporate documents in Document Management | Document permission and branch/account scope |
| Auditor / Compliance Reviewer | Internal | Reviews sensitive actions and cross-context traceability | Read-only audit access; no mutation rights |
| Executive / Management Viewer | Internal | Views consolidated corporate training KPIs and reports | Explicit dashboard/report permission plus consolidated scope |
| Corporate Coordinator | External business actor | Submits or manages participant nominations and views organization training status where portal capability is enabled | Organization-scoped, not ASTI branch-admin access |
| Corporate Primary Contact | External business actor | Receives official communication and may view permitted contract/training information | Organization-scoped and explicitly provisioned |
| Corporate Participant | External business actor | Participates in training and may later access personal status/certificate through future portal channels | Person-specific access; external portal not part of initial admin portal |

## 4.2 System Actors / Collaborating Contexts

| System Actor | Role in Corporate Training Workflow |
|---|---|
| Identity & Access Management | Authentication, permission evaluation, branch assignment and consolidated-access determination |
| Organization Management | Provides ASTI Branch and organization structure references |
| Shared Person/Party Model | Resolves Organization and Person identities without duplication |
| Corporate Sales & Quotation | Supplies approved quotation, sales order, and commercial handoff references |
| Course Catalog | Supplies published courses and completion-rule references |
| Training Delivery | Supplies batches, capacity, session and delivery status |
| Scheduling & Calendar | Supplies schedule, classroom, venue and conflict outcomes |
| Faculty / Trainer Management | Supplies trainer availability/authorization read information |
| Admission & Enrollment | Creates/owns StudentProfile and Enrollment |
| Finance & Receivables | Validates credit rule and owns invoices, payments, receipts, receivables and refunds |
| Attendance | Owns attendance records and attendance percentage |
| Exam & Completion | Owns result and completion evaluation/approval |
| Certificate | Owns certificate issue, status and verification |
| Document Management | Owns uploaded document metadata and verification status |
| Communication & Notification | Sends reminders and notifications and preserves delivery history |
| Reporting & Dashboards | Consumes CTM and other context data for reports/KPIs |
| Audit & Compliance | Stores audit and approval records for sensitive actions |

---

# 5. Functional Overview

```text
Corporate Training Management (CTM)
|
+-- 1. Corporate Account Management
|   +-- Account registration and Organization linkage
|   +-- Account profile and status lifecycle
|   +-- Credit/billing reference visibility
|   +-- Corporate account 360 read view
|
+-- 2. Corporate Contact Management
|   +-- Person identity resolution
|   +-- Contact role and designation maintenance
|   +-- Primary contact management
|   +-- Portal-access eligibility flag
|
+-- 3. Corporate Contract Management
|   +-- Contract creation and amendment
|   +-- Validity and status control
|   +-- Billing model and payment terms
|   +-- Enrollment applicability validation
|
+-- 4. Corporate Participant Management
|   +-- Person identity resolution
|   +-- Corporate-specific participant profile
|   +-- Duplicate detection
|   +-- StudentProfile linkage after enrollment
|   +-- Participant status lifecycle
|
+-- 5. Nomination Intake Capability
|   +-- Nomination list intake
|   +-- Row-level validation
|   +-- Participant resolution/create-link workflow
|   +-- Validation result and correction cycle
|   `-- GAP: nomination aggregate/persistence not defined in ER v3
|
+-- 6. Corporate Enrollment Coordination
|   +-- Contract validation
|   +-- Course selection
|   +-- Batch selection and capacity validation
|   +-- Corporate credit validation
|   +-- StudentProfile create/link request
|   +-- Enrollment creation request
|   +-- CorporateEnrollment linkage
|   +-- Bulk enrollment and row-level outcomes
|   `-- Idempotency and rollback/compensation at application boundary
|
+-- 7. Corporate Training Operational View
|   +-- Participant roster
|   +-- Batch/session status
|   +-- Attendance status
|   +-- Completion status
|   +-- Certificate status
|   +-- Invoice/receivable status
|   `-- Document verification status
|
+-- 8. Corporate Portal Capability Boundary
|   +-- Nominations
|   +-- Training status
|   +-- Invoice visibility
|   `-- Certificate visibility
|       Note: dedicated portal application deferred pending application-scope approval
|
+-- 9. Reporting Integration
    +-- Corporate account dimensions
    +-- Contract dimensions
    +-- Participant/enrollment linkage
    +-- Delivery and completion linkage
    `-- Finance and profitability read integration
        GAP: costing model not defined in DDD/ER v3
```

---

# 6. Business Capabilities and User Types

## 6.1 Internal User Capabilities

| Capability | Primary Internal Users | Description |
|---|---|---|
| Corporate account administration | Corporate Training Admin, Account Manager | Manage account master and status under Corporate Training ownership |
| Contact administration | Account Manager, CTM Admin | Resolve Person and maintain corporate contact linkage |
| Contract administration | CTM Admin, Account Manager | Create and maintain operational corporate contracts |
| Participant administration | CTM Admin, Training Coordinator | Resolve Person, maintain company-specific participant profile |
| Nomination validation | CTM Admin, Training Coordinator | Validate nomination input and participant readiness; persistence gap flagged |
| Bulk enrollment coordination | CTM Admin, Enrollment Officer | Request StudentProfile/Enrollment creation and then persist CorporateEnrollment linkage |
| Training roster monitoring | CTM Admin, Training Coordinator | View cross-context delivery status through read models |
| Corporate account 360 view | Account Manager, Branch Manager | Consolidated read view across sales, training, finance, completion and certificates |
| Compliance verification view | CTM Admin, Compliance User | View document verification state; document ownership stays in Document Management |
| Operational reporting | CTM Admin, Branch Manager, Management | Filter/export corporate training operational data through Reporting context |

## 6.2 External User Capabilities

| Capability | External User | Scope Rule |
|---|---|---|
| Submit/manage nominations | Corporate Coordinator | Only own CorporateAccount; subject to portal enablement and authentication design |
| View participant training status | Corporate Coordinator / Primary Contact | Own CorporateAccount only; no access to other corporate customers |
| View invoices and outstanding status | Authorized Corporate Contact | Read-only Finance projection for own account; finance authorization rules apply |
| View/download certificates | Authorized Corporate Contact or Participant | Only certificates linked to permitted participants/enrollments |

**Implementation note:** The DDD includes corporate portal responsibilities, but the current application strategy is a single admin portal first. External capabilities therefore require API and authorization boundary readiness, while dedicated portal screens remain outside this module until approved.

---

# 7. Functional Requirements Checklist

## 7.1 Corporate Account Requirements

- [ ] **FR-CTM-001** Create a CorporateAccount linked to an Organization Party record.
- [ ] **FR-CTM-002** Search, filter, sort, and view corporate accounts within authorized data scope.
- [ ] **FR-CTM-003** Update corporate account operational attributes with optimistic concurrency control.
- [ ] **FR-CTM-004** Activate, suspend, close, or soft-delete a corporate account according to lifecycle constraints.
- [ ] **FR-CTM-005** Present a corporate account 360 read view without duplicating cross-context source data.

## 7.2 Corporate Contact Requirements

- [ ] **FR-CTM-006** Add a corporate contact by resolving or creating a shared Person record.
- [ ] **FR-CTM-007** Update contact designation, department and contact-channel details.
- [ ] **FR-CTM-008** Manage primary-contact designation with conflict validation.
- [ ] **FR-CTM-009** Manage the contact's `portalAccessEnabled` eligibility flag without directly provisioning IAM credentials.
- [ ] **FR-CTM-010** Deactivate or soft-delete a corporate contact while preserving historical references.

## 7.3 Contract Requirements

- [ ] **FR-CTM-011** Create a CorporateContract for a CorporateAccount.
- [ ] **FR-CTM-012** Validate contract number uniqueness in the approved business scope.
- [ ] **FR-CTM-013** Maintain contract value, validity period, billing model, payment terms, and status.
- [ ] **FR-CTM-014** Prevent use of expired, inactive, future-not-effective, or incompatible contracts for new enrollment linkage.
- [ ] **FR-CTM-015** Preserve contract history through audit records and prohibit destructive deletion.

## 7.4 Participant Requirements

- [ ] **FR-CTM-016** Register a CorporateParticipant linked to a CorporateAccount and Person.
- [ ] **FR-CTM-017** Detect duplicate Person identities using configured identity keys such as Civil ID, then controlled fallback identifiers.
- [ ] **FR-CTM-018** Maintain employee code, department, designation, status and StudentProfile linkage.
- [ ] **FR-CTM-019** Allow the same Person to have separate corporate participation relationships over time or across employers without duplicating the Person record.
- [ ] **FR-CTM-020** Prevent deletion of a participant with historical corporate enrollment linkage; allow controlled deactivation/soft delete.
- [ ] **FR-CTM-021** Import participant rows in bulk with row-level validation outcomes and no silent partial corruption.

## 7.5 Nomination Intake Requirements

- [ ] **FR-CTM-022** Accept a corporate nomination list containing one or more participant records and supporting document references.
- [ ] **FR-CTM-023** Validate nomination rows for mandatory identity, account, course-intent and duplicate data.
- [ ] **FR-CTM-024** Resolve nomination rows to existing Person and CorporateParticipant records where possible.
- [ ] **FR-CTM-025** Present validation failures with row number, field, error code and corrective action.
- [ ] **FR-CTM-026** Keep nomination source traceability to the resulting participant/enrollment operations.

**Gap note for FR-CTM-022 through FR-CTM-026:** DDD lists participant nominations as a key responsibility but ER v3 does not define a CorporateNomination/NominationList entity. These requirements are functionally valid but persistence design must be resolved before Part 4 database specification.

## 7.6 Corporate Enrollment Requirements

- [ ] **FR-CTM-027** Initiate corporate enrollment for one participant against a valid course and batch.
- [ ] **FR-CTM-028** Initiate bulk corporate enrollment for multiple validated participants.
- [ ] **FR-CTM-029** Validate that each participant belongs to the selected CorporateAccount.
- [ ] **FR-CTM-030** Validate applicable CorporateContract status and validity.
- [ ] **FR-CTM-031** Obtain course eligibility and pricing references from Course Catalog without copying ownership.
- [ ] **FR-CTM-032** Obtain batch validity and capacity result from Training Delivery.
- [ ] **FR-CTM-033** Obtain schedule feasibility information from Scheduling where date allocation is part of the workflow.
- [ ] **FR-CTM-034** Request corporate credit validation from Finance before enrollment confirmation when configured.
- [ ] **FR-CTM-035** Request StudentProfile creation/linking and Enrollment creation from Admission & Enrollment.
- [ ] **FR-CTM-036** Create CorporateEnrollment linkage only after a valid Enrollment identifier exists.
- [ ] **FR-CTM-037** Preserve `corporateAccountId`, `corporateParticipantId`, `enrollmentId`, `contractId`, and billing status linkage.
- [ ] **FR-CTM-038** Update `CorporateParticipant.linkedStudentProfileId` after successful StudentProfile resolution while preserving Person identity.
- [ ] **FR-CTM-039** Enforce idempotency for retried single and bulk enrollment commands.
- [ ] **FR-CTM-040** Return per-participant success and failure outcomes for bulk enrollment.
- [ ] **FR-CTM-041** Prevent cross-branch enrollment creation outside the user's assigned branch scope.

## 7.7 Operational Tracking Requirements

- [ ] **FR-CTM-042** Display corporate training participant roster by account, contract, course, batch and branch.
- [ ] **FR-CTM-043** Display batch and session delivery status from Training Delivery/Scheduling read models.
- [ ] **FR-CTM-044** Display attendance status and attendance percentage from Attendance read models.
- [ ] **FR-CTM-045** Display exam/result/completion status from Exam & Completion read models.
- [ ] **FR-CTM-046** Display certificate issue status and authorized access metadata from Certificate read models.
- [ ] **FR-CTM-047** Display invoice, payment and outstanding status from Finance read models subject to finance visibility permissions.
- [ ] **FR-CTM-048** Display corporate and participant document verification status from Document Management read models.
- [ ] **FR-CTM-049** Provide branch-scoped operational filters and consolidated views only when the user has explicit consolidated permission.

## 7.8 Notifications and Reporting Requirements

- [ ] **FR-CTM-050** Request notifications for significant corporate training actions through Communication & Notification Management.
- [ ] **FR-CTM-051** Provide CTM-owned data to Reporting & Dashboards for corporate client, participant, contract and enrollment reporting.
- [ ] **FR-CTM-052** Support exportable corporate training reports through Reporting context without making CTM the owner of report definitions.
- [ ] **FR-CTM-053** Record audit events for sensitive account, contract, participant and bulk-enrollment changes.

## 7.9 Requirements Requiring Architecture/Model Resolution

- [ ] **FR-CTM-054** Support training equipment availability during allocation. **Gap: no Equipment model/context.**
- [ ] **FR-CTM-055** Record trainer travel and accommodation costs. **Gap: workflow specifies separate Travel Module; absent from DDD/ER current scope.**
- [ ] **FR-CTM-056** Calculate direct cost, indirect cost, total cost, selling price, profit and profit percentage. **Gap: no costing aggregate or authoritative cost-source ownership defined.**
- [ ] **FR-CTM-057** Close a corporate training project only after training, attendance, feedback, certificates, invoice and payment/approval conditions. **Gap: no Project/CorporateTrainingProgram lifecycle entity in ER v3.**
- [ ] **FR-CTM-058** Support GIVT as an independently reportable training category or context. **Gap: DDD does not define a GIVT bounded context or discriminator model.**

---

# 8. Permission Model Overview

## 8.1 Permission Principles

1. Roles are dynamic and must not be hardcoded in application logic.
2. Permissions are evaluated by IAM.
3. UI visibility is not a substitute for server-side authorization.
4. Every command and query must enforce permission plus data scope.
5. Branch assignment is derived from IAM `UserBranchAccess`; request payload branch IDs are never trusted as authorization evidence.
6. Consolidated reporting requires explicit capability and branch hierarchy authorization.
7. External corporate users, when enabled, must be restricted by CorporateAccount scope rather than ASTI internal branch-role semantics.
8. Cross-context read access requires the permission of the surfaced data class, particularly finance and document data.

## 8.2 Proposed Fine-Grained Permission Families

The exact permission records belong to IAM, but Corporate Training requires the following capability set:

```text
corporate-training.menu.view
corporate-training.account.read
corporate-training.account.create
corporate-training.account.update
corporate-training.account.status-change
corporate-training.account.delete

corporate-training.contact.read
corporate-training.contact.create
corporate-training.contact.update
corporate-training.contact.status-change

corporate-training.contract.read
corporate-training.contract.create
corporate-training.contract.update
corporate-training.contract.status-change

corporate-training.participant.read
corporate-training.participant.create
corporate-training.participant.update
corporate-training.participant.import
corporate-training.participant.status-change

corporate-training.nomination.read
corporate-training.nomination.submit
corporate-training.nomination.validate
corporate-training.nomination.correct

corporate-training.enrollment.read
corporate-training.enrollment.create
corporate-training.enrollment.bulk-create
corporate-training.enrollment.retry

corporate-training.training-status.read
corporate-training.finance-status.read
corporate-training.certificate-status.read
corporate-training.document-status.read

corporate-training.report.operational
corporate-training.report.consolidated
corporate-training.export
```

These are FRD-level required capabilities; final permission codes must be reconciled with the IAM permission catalog before implementation.

## 8.3 Data Scope Modes

| Scope | Behavior |
|---|---|
| Branch | User can act only on operations associated with assigned branch(es) |
| Parent + Child | User can view/manage child branch data only when IAM explicitly grants child-branch visibility |
| Consolidated Read | User may view cross-branch reports when `canViewConsolidated` and report permission are both true |
| Global Administration | Reserved for explicitly authorized master-data/account administration; not inferred from role name |
| Corporate Account External Scope | External principal can access only explicitly linked CorporateAccount and permitted resources |

---

# 9. Security and Audit Requirements Summary

## 9.1 Security Requirements

- All module routes, server actions, API handlers, and application services must enforce authentication.
- Every mutation must enforce explicit action permission.
- Every query must apply authorized branch/account scope on the server.
- Corporate user external access, when implemented, must enforce CorporateAccount ownership scope and object-level authorization.
- Civil ID, passport references, contact details and participant identity data must be treated as sensitive personal information.
- Sensitive values must not be written to structured application logs in plain form.
- File content must not be stored in CTM-owned tables; Document Management owns document metadata and storage references.
- Bulk imports must validate file type, size, schema, row count and content before processing; malware scanning/storage policies belong to Document/Storage architecture.
- State-changing commands must support CSRF protection where cookie-based sessions are used.
- Optimistic concurrency must be applied to mutable aggregate records using the repository `version` convention.
- Soft deletion must be used; hard delete is prohibited for operational data.
- Database queries must be parameterized through Prisma/repository abstractions; dynamic filtering must use allowlisted fields.
- Export endpoints must re-run authorization and data-scope enforcement rather than exporting client-side cached data.
- Rate limiting and idempotency protection are required for bulk enrollment and external nomination submission endpoints.

## 9.2 Mandatory Audit Events

At minimum, audit records must capture actor, action, entity type, entity identifier, old value, new value, timestamp, IP address where available, and reason where applicable for:

- CorporateAccount creation and sensitive profile changes;
- account status transitions;
- credit-limit/block flag changes if maintained through CTM UI, while Finance remains owner of computed credit validation;
- CorporateContact creation, update, deactivation and primary-contact changes;
- portal-access eligibility flag changes;
- CorporateContract creation, amendment, status change and effective-date change;
- CorporateParticipant creation, identity-link change, company relationship change, status change and deactivation;
- participant bulk import execution summary;
- nomination submission, validation outcome and correction where nomination persistence is approved;
- single and bulk corporate enrollment requests;
- credit-validation outcome reference used for enrollment;
- CorporateEnrollment linkage creation/status change;
- privileged export of sensitive participant data;
- cross-context side-effect requests and outcome/correlation identifiers.

AuditLog ownership remains with Audit & Compliance; CTM emits/records audit information through the approved in-process integration boundary.

---

# 10. Non-Functional Requirements Summary

| ID | Area | Requirement Summary |
|---|---|---|
| NFR-CTM-001 | Performance | Standard account, contact, contract and participant list queries should complete within 2 seconds at the 95th percentile under normal operating load, excluding large exports. |
| NFR-CTM-002 | Performance | Single-record commands should complete within 2 seconds at the 95th percentile when no external provider call is involved. |
| NFR-CTM-003 | Bulk Processing | Bulk participant validation/enrollment must support at least 500 rows per submitted job/request batch with row-level outcomes; implementation may chunk internally within the modular monolith. |
| NFR-CTM-004 | Availability | CTM availability target follows the admin portal production SLO; failures of reporting or notification side effects must not corrupt committed corporate aggregate data. |
| NFR-CTM-005 | Consistency | CorporateEnrollment must never reference a nonexistent Enrollment. Linkage creation occurs only after successful enrollment creation result. |
| NFR-CTM-006 | Idempotency | Retrying a bulk or single enrollment command with the same idempotency key must not create duplicate Enrollment or CorporateEnrollment records. |
| NFR-CTM-007 | Scalability | Queries must be index-supported on corporate account, participant, contract, enrollment linkage, status and commonly used date dimensions. |
| NFR-CTM-008 | Security | 100% of commands and queries enforce authentication, permission and server-side scope. |
| NFR-CTM-009 | Auditability | 100% of defined sensitive actions produce audit records or auditable correlated outcomes. |
| NFR-CTM-010 | Privacy | PII must be minimized in logs, exports and read models and exposed only to authorized users. |
| NFR-CTM-011 | Localization | User-facing localized text must support English and Arabic where the domain field is defined as localized; business date/time display uses configured ASTI timezone. |
| NFR-CTM-012 | Reliability | Bulk operations must expose deterministic per-row status and support safe retry of failed rows. |
| NFR-CTM-013 | Observability | Structured logs must include correlation ID, actor/user ID, branch scope, corporateAccountId where applicable, operation name and outcome, without sensitive identity payloads. |
| NFR-CTM-014 | Accessibility | Admin UI screens should meet WCAG 2.1 AA interaction and keyboard-access expectations where applicable. |
| NFR-CTM-015 | Maintainability | CTM package may not import another bounded context's persistence repository for mutation; integration is through application contracts/read interfaces. |
| NFR-CTM-016 | Data Retention | Soft-deleted records remain recoverable/traceable according to ASTI retention policy; exact retention duration requires compliance confirmation. |

---

# 11. DDD Ownership Notes and Cross-Context Dependencies

## 11.1 Ownership Matrix

| Concept | Owner | CTM Access Pattern |
|---|---|---|
| CorporateAccount | Corporate Training | Own read/write |
| CorporateContact | Corporate Training | Own read/write |
| CorporateContract | Corporate Training | Own read/write |
| CorporateParticipant | Corporate Training | Own read/write |
| CorporateEnrollment | Corporate Training | Own read/write linkage |
| Organization / Person | Shared Party model / relevant owner | Resolve/reference; no duplicated identity |
| CorporateSalesLead | Corporate Sales & Quotation | Read/reference handoff only |
| Quotation / SalesOrder | Corporate Sales & Quotation | Read/reference only |
| Course / pricing / discount / completion rule | Course Catalog | Read/validate through interface |
| Batch / Session / capacity | Training Delivery | Read/validate through interface |
| Timetable / venue block / schedule conflict | Scheduling & Calendar | Read/validate through interface |
| Trainer profile and availability | Faculty / Trainer Management | Read/validate through interface |
| StudentProfile / Enrollment | Admission & Enrollment | Command request + reference result; no direct write |
| Corporate credit validation | Finance & Receivables | Request validation outcome |
| Invoice / Payment / Receivable | Finance & Receivables | Read projection only |
| AttendanceRecord | Attendance | Read projection only |
| CourseCompletion / Result | Exam & Completion | Read projection only |
| Certificate | Certificate Management | Read projection only |
| Document / Verification | Document Management | Reference/read status only |
| NotificationRequest / Log | Communication & Notification | Request send; read delivery status as needed |
| AuditLog | Audit & Compliance | Submit auditable action; no direct CTM ownership |
| Dashboard / Report Definition | Reporting & Dashboards | CTM supplies source data; reporting owns output definition |

## 11.2 Required Context Relationships

### Corporate Sales & Quotation → Corporate Training

Approved quotation or sales order provides commercial handoff context. Corporate Sales owns quotation and pipeline; CTM owns corporate delivery preparation. CTM must not mutate quotation state.

### Corporate Training → Admission & Enrollment

CTM requests StudentProfile create/link and Enrollment creation. Enrollment remains the central learning aggregate and must contain valid student, course, batch, branch and resolved pricing data.

### Corporate Training → Finance

Corporate enrollment initiation requests credit validation where configured. Finance owns invoice, payment, receipt, refund, receivable and credit computation. CTM may persist only its own `billingStatus` linkage field as defined by ER v3 and should not duplicate receivable state.

### Corporate Training → Training Delivery and Scheduling

CTM selects/coordinates delivery from read models and validation services. Batch capacity, session, trainer assignment, classroom and schedule conflict ownership remain in their own contexts.

### Corporate Training → Attendance → Completion → Certificate

CTM provides corporate reporting linkage but does not update attendance, compute completion eligibility, or issue certificates.

## 11.3 Known DDD/ER Alignment Gaps

| Gap ID | Gap | Source of Need | Impact |
|---|---|---|---|
| GAP-CTM-001 | `CorporateDepartment` listed in DDD but absent in ER v3 | DDD Corporate Training entities | Part 4 cannot define persistence without architecture decision |
| GAP-CTM-002 | `CorporateCoordinator` listed in DDD but absent in ER v3 | DDD Corporate Training entities | External coordinator relationship/authorization is under-specified |
| GAP-CTM-003 | `CorporateTrainingProgram` listed in DDD but absent in ER v3 | DDD Corporate Training entities | Program/project-level delivery grouping and closure are under-specified |
| GAP-CTM-004 | Participant nomination responsibility exists but no nomination entity in ER v3 | DDD + workflow nomination list | Cannot guarantee source-level nomination audit/idempotency without model decision |
| GAP-CTM-005 | Marketing Visit workflow has no clearly defined entity in Corporate Sales ER model | Workflow | Sales activity ownership/model needs Corporate Sales FRD decision |
| GAP-CTM-006 | Equipment availability is required by workflow but no Equipment context/entity exists | Workflow | Batch allocation cannot validate equipment through a source of truth |
| GAP-CTM-007 | Travel & Accommodation separate module requested but absent in DDD/ER current scope | Workflow | Travel-cost capture cannot be assigned safely |
| GAP-CTM-008 | Costing/profitability calculation lacks aggregate and authoritative source ownership | Workflow | Do not implement transactional costing in CTM until model is approved |
| GAP-CTM-009 | Project closure workflow has no Project aggregate/state in DDD/ER | Workflow | Closure rule cannot be persisted as a CTM state machine without model change |
| GAP-CTM-010 | GIVT separate module not represented in DDD | Workflow | Requires bounded-context vs training-type architecture decision |
| GAP-CTM-011 | CorporateAccount ER carries credit fields while DDD assigns CorporateCreditRule to Finance and Corporate Account aggregate lists CreditLimit | DDD/ER overlap | Must define authoritative write owner; recommended Finance owns computed/current exposure and CTM consumes validation result |
| GAP-CTM-012 | DDD says corporate portal supports nominations/invoices/certificates/training status, while current application scope is single admin portal first | DDD application scope | Domain APIs can be prepared, but dedicated portal UI/auth scope requires separate approval |

---

# 12. Module-Level Alignment Conclusion

Module 14 is valid as a core bounded context and is strongly supported by the DDD context map and ER model for the following owned entities:

```text
CorporateAccount
CorporateContact
CorporateContract
CorporateParticipant
CorporateEnrollment
```

The module must remain enrollment-centric. A corporate participant is not an alternative learner aggregate. The correct lifecycle is:

```text
Organization/CorporateAccount
        ↓
CorporateParticipant → Person
        ↓
StudentProfile create/link
        ↓
Enrollment (Course + Batch + Branch)
        ↓
CorporateEnrollment linkage retained
        ↓
Training Delivery → Attendance → Completion → Certificate
        ↓
Finance / Reporting consume corporate linkage as authorized
```

The workflow's nomination, project closure, equipment, travel, accommodation, costing, profitability, and GIVT requirements are not discarded, but they must remain explicitly flagged until DDD and ER ownership are resolved. This FRD does not invent new persistence models for those concepts.

---

# 13. Appendix – Architecture Validation Status & Critical Gaps

This module has undergone a formal architecture validation against the source documents in the codebase. Below is the summary of the validation status and required conditions before implementation can be marked fully ready.

## 13.1 Validation Readiness Ratings

* **DDD Alignment**: 90/100 (Logical service and context boundaries are well-defined)
* **ER Model Alignment**: 95/100 (Perfect entity attribute mappings)
* **Prisma Alignment**: 20/100 (Critical gap: missing database models)
* **Branch Isolation Readiness**: 60/100 (Logic defined, but missing database branch fields)
* **Database Readiness**: 20/100 (Missing tables in schema.prisma)
* **Overall Implementation Readiness Score**: **69 / 100**

## 13.2 Final Go / No-Go Decision: **GO WITH CONDITIONS**

Development on the **frontend screens** and **application services** may proceed. However, database pushes and deployments are blocked until the following conditions are met.

## 13.3 Critical Implementation Gaps & Conditions

| Gap / Condition | Detail | Required Fix | Status |
|---|---|---|---|
| **Prisma Schema Table Mismatches** | The `schema.prisma` file is completely missing `CorporateContact`, `CorporateContract`, `CorporateParticipant`, and `CorporateEnrollment` tables. | Generate Prisma migrations to add the concrete tables detailed in Part 4, Section 21. | **Blocker** |
| **Branch Scoping Gap** | No `branchId` column exists on `CorporateAccount` or related entities. | Approve an ADR to add `branchId` to `CorporateAccount` for row scoping. | **Blocker** |
| **Credit Control Overlaps** | `CorporateAccount` and `CorporateCreditRule` (Finance) have overlapping fields. | CTM must only read credit limits/outstanding amounts from Finance projections; manual mutations from CTM UI are prohibited. | **Critical** |
| **Deferred Workflows** | Client requested costing sheets, travel, equipment checks, and GIVT module. | These must remain deferred in Phase 1 as they lack DDD context owners. GIVT will be modeled as a reporting type dimension. | **Gap** |

