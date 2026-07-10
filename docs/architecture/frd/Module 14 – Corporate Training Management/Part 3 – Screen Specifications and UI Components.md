# Part 3 – Screen Specifications and UI Components

## Module 14 – Corporate Training Management

## Document Control

| Field | Value |
|---|---|
| Module | Module 14 – Corporate Training Management |
| Module Code | CTM |
| Owning Bounded Context | Corporate Training Management |
| Architecture Style | Next.js monorepo modular monolith |
| Primary Portal | Admin Portal |
| External Portal Applicability | Corporate portal capabilities are domain-supported but separate app UX is future/subject to application-scope approval |
| Student Portal Applicability | Read-only learner views where corporate linkage adds context; no CTM transaction ownership |
| Trainer Portal Applicability | Read-only assigned corporate-training context; delivery actions remain in owning contexts |
| Source Alignment | Module 14 overview; Part 1; Part 2; DDD Context Map v3.0; ER Model v3.0; ASTI ERP workflow |

---

# 1. Purpose

This document defines the screen inventory, screen-level behavior, reusable UI components, validation behavior, dynamic UI states, bilingual rendering rules, and DDD application-boundary fit for Module 14 – Corporate Training Management.

The UI is designed around the following principles:

1. **The UI never owns business rules.** Screens collect intent, display validation results, and invoke context-owned application services.
2. **Corporate Training owns only its own transactional data.** Corporate accounts, contacts, contracts, participants, and `CorporateEnrollment` linkage are CTM-owned.
3. **Enrollment remains central.** All learner training journeys must be created through Admission & Enrollment application services and must link to a valid Course and Batch.
4. **Cross-context information is read-only in CTM screens.** Batch, scheduling, attendance, results, completion, certificates, finance, documents, and reporting data are consumed through approved queries/read models.
5. **Branch isolation is enforced server-side.** Client-side filters and hidden controls are usability aids only and are not security boundaries.
6. **Person identity is resolved before creation.** Corporate contact and participant screens cannot directly create duplicate identity records without passing through the shared Person/Party resolution flow.
7. **Unapproved model gaps are not converted into CRUD screens.** Nomination persistence, training project closure, equipment, travel/accommodation, costing/profitability, and GIVT-specific aggregate screens remain gated until DDD/ER ownership is approved.

---

# 2. Portal Applicability Summary

| Portal | Applicability | CTM UI Scope |
|---|---|---|
| Admin Portal | Primary | Full CTM operational management, orchestration, read views, exports, and reconciliation tools |
| Student Portal | Limited | Corporate sponsorship/employer context and training-status read views only where access policy permits |
| Trainer Portal | Limited | Assigned corporate batch/customer context and participant roster read views; no CTM-owned attendance/result actions |
| Corporate Portal | Domain-supported, application scope pending | Nomination, training status, invoices, and certificates require separate portal UX design; this document does not pretend it is part of the current single-admin-portal implementation |

---

# 3. Screen Inventory

## 3.1 Admin Portal Screens

| ID | Screen | Route Pattern | Primary Use Case / Service | Ownership |
|---|---|---|---|---|
| SCR-CTM-A001 | Corporate Accounts List | `/corporate-training/accounts` | SearchCorporateAccountsQuery | CTM |
| SCR-CTM-A002 | Create Corporate Account | `/corporate-training/accounts/new` | CreateCorporateAccountCommand | CTM |
| SCR-CTM-A003 | Corporate Account 360 | `/corporate-training/accounts/[accountId]` | GetCorporateAccount360Query | CTM composition read screen |
| SCR-CTM-A004 | Edit Corporate Account | `/corporate-training/accounts/[accountId]/edit` | UpdateCorporateAccountCommand | CTM |
| SCR-CTM-A005 | Corporate Contacts | `/corporate-training/accounts/[accountId]/contacts` | ManageCorporateContact use cases | CTM + Person resolution |
| SCR-CTM-A006 | Corporate Contracts | `/corporate-training/accounts/[accountId]/contracts` | Contract lifecycle use cases | CTM |
| SCR-CTM-A007 | Contract Create/Edit | `/corporate-training/accounts/[accountId]/contracts/new` and `/contracts/[contractId]/edit` | Create/UpdateCorporateContractCommand | CTM |
| SCR-CTM-A008 | Corporate Participants | `/corporate-training/accounts/[accountId]/participants` | Participant roster queries and participant commands | CTM |
| SCR-CTM-A009 | Register Corporate Participant | `/corporate-training/accounts/[accountId]/participants/new` | RegisterCorporateParticipantCommand | CTM + Person resolution |
| SCR-CTM-A010 | Bulk Participant Import | `/corporate-training/accounts/[accountId]/participants/import` | Validate/CommitParticipantImport | CTM |
| SCR-CTM-A011 | Single Corporate Enrollment | `/corporate-training/accounts/[accountId]/enrollments/new` | CreateCorporateEnrollment orchestration | CTM orchestration across contexts |
| SCR-CTM-A012 | Bulk Corporate Enrollment | `/corporate-training/accounts/[accountId]/enrollments/bulk` | BulkCorporateEnrollment orchestration | CTM orchestration across contexts |
| SCR-CTM-A013 | Corporate Enrollment Operations | `/corporate-training/enrollments` | CorporateEnrollmentRosterQuery | CTM-owned linkage + cross-context projections |
| SCR-CTM-A014 | Corporate Enrollment Detail | `/corporate-training/enrollments/[corporateEnrollmentId]` | GetCorporateEnrollmentDetailQuery | Composite read model |
| SCR-CTM-A015 | Corporate Training Reports | `/corporate-training/reports` | CorporateTrainingReportQuery / export request | Reporting-consumer boundary |
| SCR-CTM-A016 | Enrollment Linkage Reconciliation | `/corporate-training/reconciliation/enrollment-links` | ReconcileCorporateEnrollmentLinkCommand | CTM administrative recovery use case |

## 3.2 Student Portal Screens – Applicable Read-Only Surfaces

| ID | Screen | Route Pattern | Purpose | Ownership Boundary |
|---|---|---|---|---|
| SCR-CTM-S001 | My Corporate Training Details | `/student/corporate-training/[enrollmentId]` | Show employer/corporate sponsorship context tied to the learner's own enrollment | CTM linkage plus read-only projections |
| SCR-CTM-S002 | My Corporate Training Status | `/student/corporate-training/[enrollmentId]/status` | Show batch, attendance, completion, certificate, and permitted finance status | Read models only; no CTM mutation |

## 3.3 Trainer Portal Screens – Applicable Read-Only Surfaces

| ID | Screen | Route Pattern | Purpose | Ownership Boundary |
|---|---|---|---|---|
| SCR-CTM-T001 | Assigned Corporate Trainings | `/trainer/corporate-training` | Show assigned corporate batches and customer context | Training Delivery assignment + CTM account projection |
| SCR-CTM-T002 | Corporate Batch Roster | `/trainer/corporate-training/[batchId]/participants` | Show authorized participant roster for an assigned batch | CTM roster read + Training Delivery authorization |

## 3.4 Screens Explicitly Not Defined in This Part

The following screens are intentionally not specified because the current DDD/ER baseline does not provide a confirmed owning aggregate or because another bounded context owns the transaction:

| Candidate Screen | Reason Not Included |
|---|---|
| Corporate Nomination CRUD | Nomination persistence is a known architecture gap; file import can be supported as an input process without inventing a durable Nomination aggregate |
| Corporate Training Project Closure | Project aggregate and closure state are not approved in the DDD/ER baseline |
| Travel & Accommodation Management | Ownership/model gap |
| Equipment Allocation | Ownership/model gap |
| Costing & Profitability Transaction Entry | Ownership/model gap; reporting may display approved calculations later but CTM must not invent source transactions |
| GIVT Project Management | Separate business scope requested by workflow but absent from approved DDD/ER ownership |
| Attendance Entry | Attendance context owns marking and correction |
| Result Entry | Exam & Completion context owns result recording |
| Completion Approval | Exam & Completion context owns approval |
| Certificate Generation | Certificate context owns generation, reissue, revoke, and verification |
| Invoice/Payment Entry | Finance context owns invoices, payments, receipts, refunds, and receivables |
| Session Scheduling | Scheduling/Training Delivery owns schedule and session mutations |

---

# 4. Shared CTM UI Components

The following components may be implemented as reusable UI building blocks. They must remain presentation components or thin application adapters and must not encode domain invariants independently from the server.

| Component | Purpose | Key Behavior |
|---|---|---|
| `CorporateAccountSelector` | Select an in-scope corporate account | Server-filtered options; no unauthorized account IDs accepted |
| `PersonIdentityResolver` | Search and resolve an existing Person before contact/participant creation | Displays candidate matches and conflict reason; creation proceeds only through approved application command |
| `CorporateContractSelector` | Select applicable contract | Server returns applicability status; disabled/ineligible items include reason |
| `CourseReadSelector` | Select published/eligible course | Data from Course Catalog query; read-only consumption |
| `BatchReadSelector` | Select eligible batch for selected course | Data from Training Delivery; displays capacity/branch/date without modifying batch |
| `CreditValidationPanel` | Display Finance credit-validation outcome | Read-only result from Finance application boundary |
| `EnrollmentOutcomeGrid` | Show per-participant bulk enrollment outcomes | Supports success, blocked, validation error, idempotent replay, and reconciliation-required states |
| `LifecycleStatusBadge` | Consistent display of CTM state values | Localized label; no transition logic embedded |
| `PermissionGate` | Hide/disable action controls based on granted permission claims | UX only; server still authorizes every command |
| `BranchScopeIndicator` | Show current operational branch or consolidated scope | Prevents user confusion; cannot be used as sole access control |
| `AuditMetadataPanel` | Show created/updated actor/time and sensitive change references | Read-only; shown only with audit-view permission |
| `CrossContextStatusCard` | Display attendance, completion, certificate, finance, or document status | Must show data owner and freshness timestamp where appropriate |
| `BilingualTextDisplay` | Render bilingual names/labels | LTR/RTL aware; falls back according to localization policy |
| `ConfirmStateTransitionDialog` | Capture reason and confirmation for sensitive status changes | Actual transition guards enforced server-side |

---

# 5. Detailed Screen Specifications – Admin Portal

## SCR-CTM-A001 – Corporate Accounts List

### Purpose

Provide authorized internal users with a searchable, branch-scoped list of corporate accounts and a controlled entry point to account management.

### Application Mapping

- `SearchCorporateAccountsQuery`
- `GetCorporateAccountSummaryProjection`
- `UC-CTM-001`, `UC-CTM-008`, `UC-CTM-009`
- FR-CTM-001 through FR-CTM-005

### Layout

1. Page header: title, branch-scope indicator, create-account action.
2. KPI summary strip: total visible accounts, active, suspended, inactive. These are query-derived counts, not independent transactional state.
3. Filter toolbar.
4. Paginated data table.
5. Optional saved-view selector if a generic platform capability already exists; CTM does not own saved-filter persistence.

### Interactive Elements

- Search by account code, account name, legal/trade organization name.
- Status filter.
- Industry filter.
- Billing-cycle filter.
- Branch-scope filter only for users with multi-branch/consolidated access.
- Sort selector.
- Create account button.
- Row actions: View, Edit, Change Status, Soft Delete where permission and lifecycle guards permit.

### Table Columns

| Column | Behavior |
|---|---|
| Account Code | Sortable; exact-search capable |
| Account Name | Sortable; localized display where available |
| Organization | Read-only Party/Organization reference |
| Industry | Filterable |
| Billing Cycle | Filterable |
| Credit Limit | Visible only with authorized commercial/finance visibility permission |
| Current Outstanding | Finance projection; permission-gated |
| Status | Filterable status badge |
| Updated At | Sortable |
| Actions | Permission- and lifecycle-aware |

### Input Validations

- Search string trimmed; maximum 100 characters.
- Page size restricted to approved values, e.g. 20/50/100.
- Invalid sort field rejected server-side.
- Branch IDs are never trusted from client input; server intersects requested scope with user branch access.

### Table Behaviors

- Server-side pagination, filtering, and sorting.
- Stable secondary sort by ID or account code to prevent row movement between pages.
- Preserve filters in URL query parameters.
- Export is not performed directly from the table unless routed through the approved report/export use case.
- Sensitive finance columns hidden when permission is absent; server projection must also omit them.

### Dynamic States

- Loading: table row skeletons plus header count skeletons.
- Empty global state: “No corporate accounts are available in your authorized scope.”
- Empty filtered state: “No accounts match the selected filters.”
- Error state: retry action using the same query parameters.
- Permission state: Create button absent without `corporate.account.create`; row mutation actions absent without corresponding permission.

---

## SCR-CTM-A002 – Create Corporate Account

### Purpose

Create a CTM `CorporateAccount` linked to a valid shared `Organization` record without duplicating Party/Organization identity.

### Application Mapping

- `CreateCorporateAccountCommand`
- Organization lookup/resolution query boundary
- UC-CTM-001
- FR-CTM-001

### Layout

Two-column desktop form; single-column mobile/tablet fallback:

**Section A – Organization Identity**
- Search existing Organization.
- Resolve existing organization or invoke approved Organization-context creation workflow through a separate boundary if the user's permissions and application policy allow it.

**Section B – Corporate Account Details**
- Account Code
- Account Name
- Industry
- Billing Cycle
- Credit Limit
- Block on Credit Limit
- Status initial value according to lifecycle policy

**Footer**
- Cancel
- Save Draft/Save only if supported by approved state model
- Create Account

### Interactive Elements

- Organization search with debounced server query.
- Existing organization preview card.
- Clear/reselect organization.
- Billing-cycle selector.
- Credit-limit amount input.
- Block-on-credit checkbox/switch.
- Submit.

### Input Validations

| Field | Validation |
|---|---|
| Organization | Required; must resolve to an authorized valid Organization reference |
| Account Code | Required; trimmed; normalized according to code policy; uniqueness validated server-side |
| Account Name | Required; 2–200 characters |
| Industry | Optional/configured lookup; invalid codes rejected |
| Credit Limit | Decimal >= 0; currency precision governed by Finance/configuration conventions |
| Billing Cycle | Must be a configured supported value |
| Block on Credit | Boolean; cannot bypass Finance-owned actual credit validation |

### Dynamic States

- Organization lookup loading spinner within resolver.
- Duplicate account-code inline error plus top-level validation summary.
- Organization conflict state with “View existing organization” link if permitted.
- Submission button enters pending state and becomes idempotency-protected against double click.
- Server authorization error shown as non-field page alert.

### DDD Boundary Note

This screen may select or request creation of an Organization through Organization Management, but the CTM form itself must not directly write Organization-owned tables.

---

## SCR-CTM-A003 – Corporate Account 360

### Purpose

Provide a consolidated operational view of one corporate account without transferring ownership of downstream data into CTM.

### Application Mapping

- `GetCorporateAccount360Query`
- UC-CTM-008
- FR-CTM-005 and FR-CTM-042 through FR-CTM-049

### Layout

Header:
- Account name and code
- Status badge
- Current branch/consolidated scope indicator
- permitted actions

Tabs:
1. Overview
2. Contacts
3. Contracts
4. Participants
5. Enrollments
6. Training Delivery
7. Attendance
8. Completion
9. Certificates
10. Finance
11. Documents
12. Audit Summary, permission-gated

### Interactive Elements

- Tab navigation.
- Date and status filters within read-only tabs.
- Deep links to owning-context screens when user has permission.
- Refresh individual cross-context cards.
- Status transition action invoking CTM command.

### Cross-Context Card Rules

Each projection card must show:
- source context label;
- last refreshed/read timestamp where caching may affect freshness;
- permission-sensitive masking;
- no edit controls for non-CTM-owned data.

### Dynamic States

- Shell skeleton first, then tab-level skeletons.
- Partial failure isolation: a Finance projection failure must not hide CTM account details; show unavailable status for the affected card.
- Empty tabs use domain-specific messages, e.g. “No corporate participants are registered for this account.”
- Permission-hidden tabs are not rendered at all when the user lacks data-view permission.

### Table Behaviors

All embedded tables use server pagination when result size can grow. Row actions are routed to owning application services or owning screens, never implemented as direct local updates.

---

## SCR-CTM-A004 – Edit Corporate Account

### Purpose

Modify allowed CTM-owned account attributes while preserving lifecycle, audit, and optimistic concurrency controls.

### Application Mapping

- `UpdateCorporateAccountCommand`
- `ChangeCorporateAccountStatusCommand`
- UC-CTM-009
- FR-CTM-003 and FR-CTM-004

### Layout

- Account identity summary, read-only.
- Editable business fields.
- Credit-policy section with explanatory ownership note.
- Separate lifecycle action panel.
- Audit metadata panel when permitted.

### Validation and Concurrency

- Same field validation as create.
- Version/ETag included in update command.
- Stale update returns conflict UI with reload/review options.
- Status transitions are not submitted through a generic status dropdown; use explicit transition actions with reason where required.

### Dynamic States

- Initial form skeleton.
- Dirty-form navigation warning.
- Conflict state preserving user-entered values for comparison.
- Sensitive field hiding where the user can edit profile data but not credit terms.

---

## SCR-CTM-A005 – Corporate Contacts

### Purpose

Manage corporate contacts while reusing shared Person identity and maintaining CTM contact relationship data.

### Application Mapping

- `AddCorporateContactCommand`
- `UpdateCorporateContactCommand`
- `SetPrimaryCorporateContactCommand`
- `DeactivateCorporateContactCommand`
- UC-CTM-002
- FR-CTM-006 through FR-CTM-010

### Layout

- Account context header.
- Contact filter/search toolbar.
- Contacts table.
- Add Contact drawer/dialog using `PersonIdentityResolver`.
- Edit relationship drawer.

### Contact Table Columns

- Person name
- Designation
- Department
- Email
- Phone
- Primary flag
- Portal access eligible flag
- Status
- Actions

### Validation

- Person resolution required before CTM relationship creation.
- Duplicate active relationship rejected.
- Email syntax and phone normalization validated, while source-of-truth contact ownership is respected.
- Primary-contact changes performed transactionally by server command.
- Portal access eligibility flag does not create a User account; IAM onboarding remains separate.

### Dynamic States

- Resolver loading and no-match state.
- Multiple-match conflict state requiring explicit selection or escalation according to identity-resolution policy.
- Duplicate-relationship inline error.
- Primary-contact transition confirmation.
- Add/Edit/Deactivate actions permission-hidden.

---

## SCR-CTM-A006 – Corporate Contracts

### Purpose

List and control contracts belonging to a corporate account.

### Application Mapping

- `ListCorporateContractsQuery`
- Contract lifecycle commands
- UC-CTM-003
- FR-CTM-011 through FR-CTM-015

### Layout

- Account header.
- Status/effective-date filters.
- Contract table.
- Create Contract action.

### Table Columns

- Contract Number
- Start Date
- End Date
- Contract Value
- Billing Model
- Payment Terms summary
- Lifecycle Status
- Applicability indicator
- Updated At
- Actions

### Behaviors

- Server-side status/date filtering.
- Applicability is calculated server-side and shown as explanatory badge; UI must not infer eligibility solely from date comparison.
- Expired or terminated contracts remain visible for authorized historical reporting.
- Delete action is soft-delete/lifecycle controlled and unavailable when prohibited by history rules.

---

## SCR-CTM-A007 – Contract Create/Edit

### Purpose

Create or update a CorporateContract with clear commercial terms and lifecycle validity.

### Application Mapping

- `CreateCorporateContractCommand`
- `UpdateCorporateContractCommand`
- `ActivateCorporateContractCommand`
- UC-CTM-003

### Layout

Sections:
1. Contract Identification
2. Effective Period
3. Commercial Value
4. Billing Model
5. Payment Terms
6. Lifecycle Action

### Inputs and Validation

| Field | Validation |
|---|---|
| Contract Number | Required and unique within approved business scope |
| Contract Value | Decimal >= 0; configured currency precision |
| Start Date | Required |
| End Date | Required and >= Start Date |
| Billing Model | One of Per Student, Per Batch, Per Hour, Fixed Contract |
| Payment Terms | Required structured or validated text according to implementation model |
| Status | Not a free-edit dropdown; transition commands only |

### Dynamic States

- Duplicate-number server validation.
- Invalid date-range inline error.
- Transition guard failure with reason, e.g. unresolved prerequisites.
- Optimistic-lock conflict handling on update.

---

## SCR-CTM-A008 – Corporate Participants

### Purpose

Provide the operational roster of people associated with a corporate account and their enrollment linkage status.

### Application Mapping

- `SearchCorporateParticipantsQuery`
- participant lifecycle commands
- UC-CTM-004, UC-CTM-010
- FR-CTM-016 through FR-CTM-020 and FR-CTM-042

### Layout

- Account context header.
- Summary counts: active, inactive, linked-to-student, not-yet-enrolled.
- Filters.
- Participant table.
- Register Participant and Import actions.

### Table Columns

- Person Name
- Civil ID masked according to privacy policy
- Employee Code
- Department
- Designation
- Student Profile linkage status
- Enrollment count
- Participant Status
- Actions

### Table Behaviors

- Server-side pagination/filtering.
- Civil ID never sent unmasked unless explicit permission and business need authorize it.
- Row detail can display historical employer linkage without merging employer-specific participant records.
- Deactivate action invokes lifecycle command and preserves history.

### Dynamic States

- No participants empty state with Register and Import actions when permitted.
- Identity data restricted state with masked fields.
- Partial cross-context count failure represented separately from CTM participant row data.

---

## SCR-CTM-A009 – Register Corporate Participant

### Purpose

Register a corporate participant by resolving Person identity first and then creating the employer-specific participant relationship.

### Application Mapping

- `ResolvePersonIdentityQuery`
- `RegisterCorporateParticipantCommand`
- UC-CTM-004
- FR-CTM-016 through FR-CTM-019

### Layout

Step 1: Identity Search
- Civil ID/Oman ID where policy permits
- passport number where applicable
- name, mobile, email secondary matching fields

Step 2: Candidate Resolution
- exact match card
- possible matches list
- no-match path

Step 3: Corporate Participant Details
- employee code
- department
- designation
- participant status

Step 4: Review and Submit

### Validation

- Required identity fields follow approved Person resolution policy.
- Oman ID/Civil ID uniqueness handled by Person/Party service, not browser-only validation.
- Duplicate participant relationship for same account rejected.
- Same Person under a different company is allowed as a separate CorporateParticipant relationship.
- Corporate account must be active/eligible for participant registration according to business rules.

### Dynamic States

- Resolution search skeleton/spinner.
- Exact match confirmation.
- Ambiguous-match state with selection disabled until policy conditions are met.
- No-match state may launch approved Person creation flow; CTM does not directly persist Person fields.
- Submission result links to participant detail/list.

---

## SCR-CTM-A010 – Bulk Participant Import

### Purpose

Upload, validate, correct, and commit a corporate participant roster with deterministic row-level outcomes.

### Application Mapping

- `ValidateCorporateParticipantImportCommand`
- `CommitCorporateParticipantImportCommand`
- UC-CTM-005
- FR-CTM-021 and related workflow-derived requirements FR-CTM-022 through FR-CTM-026, subject to nomination-model gap constraints

### Layout

Wizard:
1. Download template/instructions
2. Upload file
3. Validation summary
4. Row-level correction/review
5. Commit valid rows
6. Import outcome

### Interactive Elements

- File picker and drag/drop.
- Template download.
- Validation start.
- Error-only filter.
- Duplicate-only filter.
- Row detail drawer.
- Commit valid rows action.
- Download validation-result file.

### Validation

- Allowed MIME type and extension are both validated server-side.
- Maximum file size and maximum row count are enforced server-side.
- Required columns explicitly validated.
- Duplicate rows inside the same file detected.
- Existing Person matches distinguished from identity conflicts.
- Existing active participant relationships distinguished from new participant candidates.
- No silent row skipping.
- File content is treated as untrusted input.

### Validation Grid Columns

- Row Number
- Name
- Identity Key masked
- Employee Code
- Department
- Designation
- Person Resolution Result
- Participant Relationship Result
- Validation Status
- Error Code/Message

### Dynamic States

- Upload progress.
- Parsing/validation progress with non-deceptive status.
- Large-grid virtualization for high row counts.
- Empty file error.
- Schema mismatch error.
- Validation complete summary counts.
- Partial commit outcome with created, linked, duplicate, rejected, and retry/reconciliation counts.

### DDD Boundary Note

The uploaded list may serve as a business nomination input, but the UI must not imply a durable `CorporateNomination` aggregate until that gap is resolved.

---

## SCR-CTM-A011 – Single Corporate Enrollment

### Purpose

Coordinate creation of a standard Enrollment for one corporate participant while preserving corporate linkage and context ownership.

### Application Mapping

- `CreateCorporateEnrollmentCommand` orchestration
- UC-CTM-006
- FR-CTM-027 through FR-CTM-039

### Layout

Step 1: Participant
- selected account fixed
- participant selector
- person/student linkage preview

Step 2: Contract
- contract selector with applicability explanation

Step 3: Course and Batch
- course read selector
- batch read selector
- capacity/branch/date/trainer availability summary where exposed by owning read models

Step 4: Validation Summary
- participant-account relationship
- contract applicability
- course eligibility
- batch capacity
- scheduling feasibility
- credit validation

Step 5: Review and Confirm

### Interactive Elements

- Participant search.
- Applicable contract selection.
- Course selection.
- Batch selection dependent on course.
- Explicit “Validate” or automatically triggered server validation.
- Confirm enrollment button available only after current validation snapshot passes required guards.

### Input Validations

- Participant must belong to selected corporate account.
- Contract ID optional/required according to approved policy, but if supplied must be applicable.
- Course must be valid and eligible from Course Catalog.
- Batch must belong to selected course and pass Training Delivery checks.
- Branch scope validated server-side.
- Finance credit result consumed, not calculated by UI.
- Enrollment command uses idempotency key.

### Dynamic States

- Dependency loading states per selector.
- Stale validation state if participant/contract/course/batch changes after validation.
- Blocking credit failure panel.
- Non-blocking credit warning state where `blockOnCreditLimit = false`.
- Capacity conflict state.
- Enrollment service failure state where no CTM linkage is shown as created.
- Success state shows Enrollment number and CorporateEnrollment linkage confirmation.
- Reconciliation-required state shown only when a central Enrollment exists but CTM linkage completion needs recovery.

### DDD Boundary Note

The screen orchestrates application services. It must not directly create `StudentProfile`, `Enrollment`, Course, Batch, Schedule, Invoice, or Attendance records.

---

## SCR-CTM-A012 – Bulk Corporate Enrollment

### Purpose

Enroll multiple selected corporate participants into an approved course/batch combination with per-participant outcomes and idempotent retry.

### Application Mapping

- `BulkCorporateEnrollmentCommand`
- UC-CTM-007
- FR-CTM-028 through FR-CTM-041

### Layout

Wizard:
1. Select Account and Participants
2. Select Contract
3. Select Course and Batch
4. Pre-validation
5. Review Eligible/Blocked/Invalid participants
6. Submit bulk command
7. Outcome grid

### Interactive Elements

- Select-all-across-filter behavior only when server-supported; never infer all IDs from current page.
- Participant filters.
- Exclude invalid participants action.
- Revalidate action.
- Submit selected eligible participants.
- Download outcome report.
- Retry recoverable failures using original idempotency/correlation semantics.

### Outcome Grid

| Outcome | UI Behavior |
|---|---|
| Success | Enrollment number and corporate linkage link |
| Validation Failed | Error code, localized reason, corrective navigation where possible |
| Credit Blocked | Finance result summary, no bypass button unless a separately approved override workflow exists |
| Capacity Blocked | Batch/capacity message from owner context |
| Idempotent Replay | Existing outcome displayed without duplicate creation |
| Reconciliation Required | Administrative recovery link visible only with reconciliation permission |

### Dynamic States

- Pre-validation progress.
- Results arrive as one completed command response or supported job status if architecture provides internal jobs; UI must not invent a broker dependency.
- Partial outcome summary.
- Safe retry messaging.
- User navigation warning while submission is in progress.

---

## SCR-CTM-A013 – Corporate Enrollment Operations

### Purpose

Provide a searchable operational roster of corporate enrollment linkages with downstream training status projections.

### Application Mapping

- `CorporateEnrollmentRosterQuery`
- US-CTM-008
- FR-CTM-042 through FR-CTM-049

### Layout

- KPI strip: total visible, active training, completed, certificate pending, finance attention required, according to approved read model.
- Filters.
- Server-paginated table.

### Filters

- Corporate account
- Contract
- Participant
- Course
- Batch
- Branch
- Enrollment status
- CTM billing coordination status
- Completion status
- Certificate status
- Date range

### Table Columns

- Corporate Account
- Participant
- Employee Code
- Enrollment Number
- Course
- Batch
- Branch
- Enrollment Status
- Attendance %
- Completion Status
- Certificate Status
- Billing Coordination Status
- Finance Outstanding indicator, permission-gated
- Actions

### Behavior

- Cross-context statuses are projections, not editable cells.
- Sorting on derived fields only when supported by the backing read model.
- Column visibility personalization may be generic UI preference only; it does not alter permission rules.
- Export goes through report authorization.

---

## SCR-CTM-A014 – Corporate Enrollment Detail

### Purpose

Show one CTM linkage and its correlated central Enrollment and downstream status timeline.

### Application Mapping

- `GetCorporateEnrollmentDetailQuery`
- `GetEnrollmentOperationalProjectionQuery`
- UC-CTM-008 and UC-CTM-012

### Layout

1. Identity and corporate account summary
2. Contract and billing linkage summary
3. Enrollment summary
4. Course and Batch summary
5. Training timeline
6. Attendance summary
7. Exam/Completion summary
8. Certificate summary
9. Finance summary
10. Documents summary
11. Correlation/Audit metadata where permitted

### Actions

- Open central Enrollment detail in owning module.
- Open Batch detail.
- Open Finance records if permitted.
- Open Certificate detail if permitted.
- Reconciliation action only when the system detects a valid recovery condition and user has permission.

### Dynamic States

- Individual cards independently load and fail.
- Missing linkage diagnostic state distinguishes unauthorized, not found, and reconciliation-required conditions without leaking cross-branch data.

---

## SCR-CTM-A015 – Corporate Training Reports

### Purpose

Allow authorized users to run CTM-related operational reports and request exports without making Reporting a transactional owner.

### Application Mapping

- `CorporateTrainingReportQuery`
- `RequestCorporateTrainingExportCommand` or approved reporting export service
- UC-CTM-011
- FR-CTM-051 and FR-CTM-052

### Report Families

- Corporate Account Summary
- Corporate Participant Roster
- Corporate Enrollment Status
- Corporate Training Delivery Status
- Attendance Summary by Corporate Account
- Completion and Certificate Status
- Corporate Billing/Receivable Summary, permission-gated
- Branch-wise Corporate Training
- Course-wise Corporate Training
- Contract Utilization summary where derivable from approved data

### Layout

- Report selector.
- Filter panel.
- Results table/chart area according to report definition.
- Export action menu: CSV, XLSX, PDF where supported by reporting requirements.

### Behaviors

- Filters validated server-side.
- Consolidated reports require explicit permission and branch-access capability.
- Finance-derived reports require finance visibility permission.
- Export request uses same authorization and scope as on-screen query.
- No client-side export of hidden unauthorized columns.

### Dynamic States

- Report skeleton.
- No-data state preserving applied filters.
- Long-running export state may use existing internal job infrastructure, but this FRD does not require an external queue/broker.
- Export failure provides retry capability without broadening scope.

---

## SCR-CTM-A016 – Enrollment Linkage Reconciliation

### Purpose

Provide tightly controlled recovery for cases where central Enrollment creation succeeded but the CTM `CorporateEnrollment` linkage is missing or inconsistent.

### Application Mapping

- `FindCorporateEnrollmentLinkageAnomaliesQuery`
- `ReconcileCorporateEnrollmentLinkCommand`
- UC-CTM-012

### Layout

- Security warning banner.
- Anomaly filters.
- Results table.
- Detail comparison drawer.
- Reconcile action dialog requiring reason.

### Table Columns

- Correlation ID
- Corporate Account
- Participant
- Enrollment Number
- Detected Condition
- Detected At
- Last Retry/Attempt
- Recommended Action
- Status

### Validation and Security

- Access restricted to explicit reconciliation permission.
- Server verifies Enrollment, Person/StudentProfile relation, CorporateParticipant relation, account scope, and absence of conflicting linkage before repair.
- Reconciliation cannot mutate Enrollment-owned business fields.
- Every repair attempt is audited, including rejected attempts.

### Dynamic States

- No anomalies healthy-state message.
- Conflict state preventing automated reconciliation.
- Successful repair confirmation with audit reference.
- Concurrent resolution conflict handled idempotently.

---

# 6. Detailed Screen Specifications – Student Portal

## SCR-CTM-S001 – My Corporate Training Details

### Purpose

Allow a learner to view their own corporate sponsorship/employer context for an Enrollment when such visibility is permitted.

### Application Mapping

- `GetMyCorporateTrainingContextQuery`
- read-only CTM projection scoped to authenticated Person/StudentProfile

### Layout

- Corporate Account name
- Employee Code where appropriate
- Department/Designation
- Contract display name/number only if policy permits learner visibility
- Course
- Batch
- Enrollment number/status

### Rules

- User can see only records linked to their own authenticated StudentProfile/Person identity.
- No participant edit controls.
- Credit limits, corporate outstanding balances, contract values, and internal payment terms are not shown.
- Employer-specific historical relations not tied to the current user's enrollment are not exposed.

### Dynamic States

- Loading skeleton.
- No corporate linkage state: “This enrollment is not linked to a corporate training account.”
- Access-denied state uses generic wording without exposing record existence.

---

## SCR-CTM-S002 – My Corporate Training Status

### Purpose

Display the student's permitted downstream training status in one read-only view.

### Application Mapping

- `GetMyCorporateTrainingStatusProjectionQuery`

### Layout

Status cards:
- Batch and schedule summary
- Attendance percentage/status
- Completion status
- Certificate status and permitted download/view action
- Payment status only if learner-level policy allows it; corporate receivable details remain hidden

### DDD Boundary

All displayed values come from owning context read models. CTM does not calculate attendance percentage, completion eligibility, certificate eligibility, or finance balances in the browser.

---

# 7. Detailed Screen Specifications – Trainer Portal

## SCR-CTM-T001 – Assigned Corporate Trainings

### Purpose

Show trainers the corporate-training context for batches to which they are assigned.

### Application Mapping

- Training Delivery assignment query
- CTM corporate account summary projection

### Layout

Cards/table:
- Date/time
- Course
- Batch
- Corporate Account
- Venue/Classroom
- Participant count
- Delivery status

### Rules

- Trainer sees only batches assigned through Training Delivery authorization.
- CTM account information is minimal and operationally necessary.
- No contract value, credit limit, receivable, or commercial term disclosure.

### Dynamic States

- Today's training and upcoming sections may be separate.
- Empty state: no assigned corporate training.
- Cross-context CTM account projection failure does not remove the underlying batch assignment; show generic corporate-training label where safe.

---

## SCR-CTM-T002 – Corporate Batch Roster

### Purpose

Show the authorized roster for a corporate batch to support training delivery context.

### Application Mapping

- `GetCorporateBatchRosterQuery`
- authorization derived from Training Delivery assignment and branch scope

### Layout

- Batch summary
- Corporate account summary
- Participant roster table

### Table Columns

- Participant Name
- Employee Code
- Department
- Designation
- Enrollment Status
- ID verification status only if a permitted Document read model exposes it

### Rules

- Attendance marking control is not part of this CTM screen; deep-link to Attendance module if trainer has permission.
- Assessment result entry is not part of this screen; deep-link to Exam & Completion.
- Participant personal identifiers are minimized and masked.

---

# 8. Dynamic UI State Standards

## 8.1 Validation Error Model

All forms must support both field-level and command-level errors.

### Field-Level Errors

Examples:
- required field missing;
- invalid decimal precision;
- invalid date range;
- invalid configured lookup value;
- malformed email/phone input;
- file schema mismatch.

Field errors are displayed:
- adjacent to the field;
- included in an accessible error summary at the top of the form after failed submission;
- linked to the field using accessible `aria-describedby` semantics.

### Business Rule Errors

Examples:
- duplicate account code;
- duplicate contract number;
- inactive corporate account;
- inapplicable contract;
- duplicate participant relationship;
- participant does not belong to account;
- batch at capacity;
- schedule infeasible;
- corporate credit blocked;
- stale lifecycle state;
- optimistic concurrency conflict.

These must use deterministic application error codes and localized messages. The UI must not infer business failures from generic HTTP status alone.

### Cross-Context Failure Presentation

Where a downstream owner rejects a request, CTM displays the owner-provided normalized business outcome. Examples:
- `BATCH_CAPACITY_EXCEEDED`
- `SCHEDULE_CONFLICT`
- `CORPORATE_CREDIT_BLOCKED`
- `ENROLLMENT_DUPLICATE`

The UI must not retry non-retryable validation errors automatically.

---

## 8.2 Loading Skeleton Standards

- Initial route load: page shell + major content block skeletons.
- Tables: 8–10 skeleton rows while initial query is pending.
- Cards: maintain approximate final dimensions to avoid layout shift.
- Dependent selectors: loading state scoped to selector, not whole page.
- Composite 360/detail screens: independent section loading to avoid all-or-nothing rendering.
- Do not show fake numeric values in KPI skeletons.

---

## 8.3 Empty State Standards

Empty states must distinguish:

1. **True empty state** – no records exist in authorized scope.
2. **Filtered empty state** – records may exist but none match filters.
3. **Permission-limited state** – do not falsely claim no data exists; use an authorization-appropriate message or hide section.
4. **Cross-context unavailable state** – source service/query failed; do not represent as zero.
5. **Not applicable state** – e.g. no corporate linkage for a retail enrollment.

Each empty state should provide at most the next valid action the user is authorized to take.

---

## 8.4 Permission-Based Hiding and Disabling

### Principles

- Hide actions the user cannot ever perform.
- Disable actions only when the user has permission but a visible business prerequisite is currently unmet.
- Never rely on hidden controls for security.
- Server commands always enforce permission, branch scope, entity scope, and lifecycle guards.

### Examples

| Situation | UI Behavior |
|---|---|
| No `corporate.account.create` | Hide Create Account action |
| Has contract update permission, contract terminated | Show edit read-only or disable prohibited transition with explanation |
| No finance visibility | Hide Finance tab/columns; backend omits data |
| Multi-branch user without consolidated permission | Show branch switcher limited to assigned branches; hide consolidated option |
| Has enrollment permission but credit validation blocked | Keep review visible; disable confirm and show Finance-provided reason |
| No reconciliation permission | Hide reconciliation route/action entirely |

---

## 8.5 Optimistic Concurrency UI

For mutable CTM aggregates:

1. Client submits entity version or ETag.
2. Server rejects stale update with conflict outcome.
3. UI shows:
   - current server values;
   - user's unsaved values;
   - reload/reapply guidance.
4. UI must not silently overwrite newer changes.

---

## 8.6 Soft Delete UI

- Do not label destructive CTM actions as permanent delete.
- Use “Archive”, “Deactivate”, or context-approved wording according to lifecycle semantics.
- Confirmation dialog explains historical data retention.
- Hard-delete controls are not rendered.

---

# 9. Bilingual Layout Rules – English LTR and Arabic RTL

## 9.1 Global Direction Rules

| Aspect | English | Arabic |
|---|---|---|
| Root direction | `dir="ltr"` | `dir="rtl"` |
| Text alignment | Start resolves left | Start resolves right |
| Navigation/sidebar | Standard LTR placement | Mirrored placement where application shell supports RTL |
| Form label alignment | Start/left | Start/right |
| Drawer opening side | End/right by default | End/left after logical mirroring |
| Breadcrumb direction | LTR | RTL visual flow |
| Stepper progression | Left to right | Right to left |
| Table horizontal start | Left | Right |

Use CSS logical properties such as `margin-inline-start`, `padding-inline-end`, `inset-inline-start`, and `text-align: start`; avoid hard-coded left/right except where the content itself has fixed direction semantics.

## 9.2 Data That Must Not Be Directionally Reversed

The following should preserve semantic direction as appropriate even within Arabic UI:

- email addresses;
- URLs;
- UUID/CUID values;
- account codes;
- enrollment numbers;
- contract numbers;
- certificate numbers;
- currency values with standardized formatting;
- phone numbers;
- file names where mixed script rendering requires isolation.

Use Unicode bidi isolation or dedicated `dir="ltr"` spans for these values where needed.

## 9.3 Localized Names and Labels

- Display localized organization/course/category labels when approved localized values exist.
- Do not invent Arabic translations at runtime for persisted business names.
- Fallback order follows application localization policy, typically current locale then English.
- Status labels and validation messages must use translation keys, not raw enum names.

## 9.4 Tables in RTL

- Column order may be mirrored for natural reading, but identity/action relationships must remain consistent.
- Action menu icon position uses inline-end.
- Numeric columns may remain end-aligned according to numeric readability conventions.
- Horizontal scrolling begins from logical start appropriate to locale.
- Sticky columns must use logical inset properties.

## 9.5 Forms in RTL

- Date pickers must use locale-aware labels while preserving Gregorian business date semantics unless an approved calendar requirement says otherwise.
- Decimal and currency parsing must not depend on visual direction.
- Error icon placement and helper-text alignment mirror using logical properties.
- Mixed Arabic/English fields such as email, codes, and IDs use direction isolation.

## 9.6 Mermaid/Diagram Rendering in Product UI

Operational product screens are not required to render FRD Mermaid diagrams. If workflow diagrams are later exposed in help content, diagram direction should be explicitly authored per locale instead of relying on CSS mirroring of text nodes.

---

# 10. Permission Model at Screen Level

The following permission names are capability-oriented examples consistent with dynamic RBAC. Final permission codes must align with the IAM permission catalog and must not be role-name checks.

| Screen | View Permission | Create/Update Permission | Sensitive Additional Permission |
|---|---|---|---|
| Accounts List/360 | `corporate.account.read` | `corporate.account.create`, `corporate.account.update`, `corporate.account.status.change` | `corporate.account.credit.read` |
| Contacts | `corporate.contact.read` | `corporate.contact.create`, `corporate.contact.update`, `corporate.contact.deactivate` | `corporate.contact.portal-eligibility.manage` |
| Contracts | `corporate.contract.read` | `corporate.contract.create`, `corporate.contract.update`, `corporate.contract.status.change` | `corporate.contract.commercial.read` |
| Participants | `corporate.participant.read` | `corporate.participant.create`, `corporate.participant.update`, `corporate.participant.deactivate` | `corporate.participant.identity.read` |
| Import | `corporate.participant.import` | same command permission | file/export permissions where separated |
| Enrollment | `corporate.enrollment.read` | `corporate.enrollment.create`, `corporate.enrollment.bulk-create` | `corporate.enrollment.credit-result.read` |
| Reports | `corporate.report.read` | N/A | `corporate.report.export`, consolidated-report permission, finance-report permission |
| Reconciliation | `corporate.reconciliation.read` | `corporate.reconciliation.execute` | audit-view permission |

### Scope Dimensions

Authorization must evaluate more than permission code alone:

- assigned branch scope;
- parent/child branch policy;
- consolidated-view permission;
- corporate-account visibility model where implemented;
- self-only learner scope;
- assigned-batch trainer scope;
- finance-sensitive data permission;
- audit-sensitive data permission.

---

# 11. DDD Fit Check – Screen to Application Service Mapping

| Screen | Application Service / Use Case | Owning Context | Cross-Context Reads/Commands | UI Logic Prohibited |
|---|---|---|---|---|
| SCR-CTM-A001 Accounts List | SearchCorporateAccountsQuery | CTM | Organization display projection; optional Finance summary | Client-side branch authorization |
| SCR-CTM-A002 Create Account | CreateCorporateAccountCommand | CTM | Organization resolution | Direct Organization table write |
| SCR-CTM-A003 Account 360 | GetCorporateAccount360Query | CTM composition | Training Delivery, Attendance, Completion, Certificate, Finance, Documents | Recomputing downstream status |
| SCR-CTM-A004 Edit Account | Update/ChangeStatus commands | CTM | Finance validation only where required | Free status dropdown bypassing transition guards |
| SCR-CTM-A005 Contacts | Contact commands | CTM | Person resolution | Duplicate Person creation logic in browser |
| SCR-CTM-A006/A007 Contracts | Contract commands/queries | CTM | Sales-order trace read if available | Quotation approval or invoice generation |
| SCR-CTM-A008/A009 Participants | Participant queries/commands | CTM | Person resolution, StudentProfile linkage read | Creating StudentProfile directly |
| SCR-CTM-A010 Import | Validate/Commit import use cases | CTM | Person resolution | Inventing durable Nomination aggregate |
| SCR-CTM-A011 Single Enrollment | Corporate enrollment orchestration | CTM coordinator | Course Catalog, Training Delivery, Scheduling, Finance, Admission & Enrollment | Browser-calculated eligibility, price, credit, capacity |
| SCR-CTM-A012 Bulk Enrollment | Bulk orchestration | CTM coordinator | same as single enrollment | Direct cross-context writes or client-side partial transaction |
| SCR-CTM-A013 Operations | CorporateEnrollmentRosterQuery | CTM read model | downstream projections | Editable downstream status cells |
| SCR-CTM-A014 Detail | Composite operational query | CTM composition | all relevant downstream owners | Attendance/result/certificate/finance mutations |
| SCR-CTM-A015 Reports | Reporting query/export | Reporting & CTM data provider | multi-context read data | UI-owned KPI formula as source of truth |
| SCR-CTM-A016 Reconciliation | Reconciliation use case | CTM | Admission & Enrollment verification reads | Editing Enrollment business data |
| SCR-CTM-S001/S002 | self-scoped status queries | CTM read composition | downstream status projections | learner changing corporate linkage or completion state |
| SCR-CTM-T001/T002 | assigned-training queries | Training Delivery authorization + CTM projection | roster and account projection | attendance/result entry inside CTM |

---

# 12. Cross-Context Navigation Rules

CTM screens may deep-link to owning modules, but only when the user has the target module permission.

| From CTM | Target Context | Allowed Navigation | Not Allowed in CTM |
|---|---|---|---|
| Enrollment Detail | Admission & Enrollment | Open Enrollment detail | Editing enrollment status locally |
| Account 360 | Corporate Sales & Quotation | View linked quotation/order trace if projection exists | Approving quotation |
| Enrollment Wizard | Course Catalog | Select eligible course | Editing pricing/completion rules |
| Enrollment Wizard | Training Delivery | Select eligible batch | Changing capacity or trainer assignment |
| Training Status | Scheduling | View schedule | Rescheduling session |
| Participant Status | Attendance | View attendance | Mark/correct attendance |
| Completion Tab | Exam & Completion | View result/completion | Record marks or approve completion |
| Certificate Tab | Certificate | View/download certificate | Generate/reissue/revoke certificate |
| Finance Tab | Finance | View authorized invoice/receivable data | Record payment/refund |
| Document Tab | Document Management | View verification status | Approve/reject document unless navigating to owner screen |

---

# 13. Responsive and Accessibility Requirements

## 13.1 Responsive Behavior

- Desktop: full tables and multi-column forms.
- Tablet: collapsible filter panels, reduced visible table columns, row-detail drawer.
- Mobile: card list for complex tables where horizontal scrolling would impair usability; bulk import and high-density reconciliation screens may declare desktop/tablet minimum usability if approved by product UX.
- Wizard state must survive responsive layout changes.

## 13.2 Accessibility

- WCAG-aligned keyboard navigation for all forms, tables, dialogs, and menus.
- Visible focus indicators.
- Screen-reader labels for icons and status badges.
- Status cannot be conveyed by color alone.
- Validation summary links to invalid inputs.
- Dialog focus trap and focus return to invoking control.
- Tables expose header associations.
- Loading states announce progress using non-disruptive live regions where appropriate.
- Arabic screen-reader order must follow logical DOM order, not visual CSS hacks.

---

# 14. Screen-Level Validation Summary

| Validation Area | Server Authority | UI Responsibility |
|---|---|---|
| Branch access | IAM/authorization boundary | Show current scope and permitted options |
| Person uniqueness/resolution | Person/Party application service | Collect search keys and present outcomes |
| Account code uniqueness | CTM application service/repository | Show deterministic error |
| Contract applicability | CTM domain/application service | Display status and reason |
| Course eligibility | Course Catalog | Present returned eligible choices |
| Batch/course match and capacity | Training Delivery | Present returned validation |
| Schedule feasibility | Scheduling/Training Delivery | Present result, never calculate locally |
| Corporate credit | Finance | Present pass/block/non-blocking warning |
| StudentProfile/Enrollment creation | Admission & Enrollment | Display orchestration outcome |
| Attendance percentage | Attendance | Display projection only |
| Completion status | Exam & Completion | Display projection only |
| Certificate status | Certificate | Display projection only |
| Finance outstanding | Finance | Display permission-filtered projection |
| Document verification | Document Management | Display projection only |

---

# 15. Known UI Gaps and Architecture Decisions Required

## GAP-CTM-UI-001 – Durable Corporate Nomination UX

The operational workflow expects nomination-list handling. Current FRD supports participant-list import and validation, but a durable Nomination list/detail/status UI must not be created until the DDD/ER model defines ownership and persistence.

## GAP-CTM-UI-002 – Corporate Training Program/Project Workspace

The workflow refers to confirmed projects and project closure. No approved `CorporateTrainingProject` aggregate currently exists. Therefore no project dashboard, closure checklist, or closure transition screen is defined.

## GAP-CTM-UI-003 – Equipment Availability

The workflow requires equipment availability during allocation, but no owner/model exists. Enrollment screens may show a future feasibility result from an approved owner, but CTM will not provide equipment CRUD or allocation logic now.

## GAP-CTM-UI-004 – Travel and Accommodation

No transactional travel/accommodation screen is defined until ownership and entities are approved.

## GAP-CTM-UI-005 – Costing and Profitability

The workflow requests direct/indirect cost and profit calculations. This UI is withheld until source entities, formula ownership, and audit rules are approved. Reports may later consume approved cost projections.

## GAP-CTM-UI-006 – GIVT-Specific Screens

GIVT is described as a separate workflow/module in the operational document but lacks bounded-context and ER ownership. It must not be implemented as a CTM status flag or hidden variant without an explicit architecture decision.

## GAP-CTM-UI-007 – Corporate Portal Application Scope

DDD expects corporate portal capabilities, but the current application strategy is single admin portal first. External corporate screens for nomination, invoice access, certificate access, and training status require a separate portal security and UX specification.

---

# 16. DDD and ER Model Alignment Notes

## 16.1 Cleanly Aligned Screens

The following UI groups map directly to approved CTM entities and ownership:

- Corporate Accounts → `CorporateAccount`
- Contacts → `CorporateContact` linked to `Person`
- Contracts → `CorporateContract`
- Participants → `CorporateParticipant` linked to `Person` and optionally `StudentProfile`
- Corporate enrollment linkage views → `CorporateEnrollment`

## 16.2 Enrollment-Centric Compliance

The Single and Bulk Corporate Enrollment screens comply with the central lifecycle rule by:

1. validating the corporate participant relationship in CTM;
2. obtaining course information from Course Catalog;
3. obtaining batch/capacity information from Training Delivery;
4. obtaining schedule feasibility from the appropriate owner;
5. obtaining credit validation from Finance;
6. invoking Admission & Enrollment to create/link `StudentProfile` and create `Enrollment`;
7. creating CTM `CorporateEnrollment` linkage only after the central Enrollment exists.

The browser does not implement a multi-context transaction and does not write foreign-context tables directly.

## 16.3 Person/Party Compliance

Contact and participant screens begin with identity resolution. The UI does not model a corporate participant as a standalone duplicate person. Employer changes create a new employer-specific participant relationship while preserving the shared Person identity.

## 16.4 Read Model Compliance

Account 360, Enrollment Operations, Student Status, and Trainer Roster screens consume projections from owner contexts. They do not imply CTM ownership of:

- Course or pricing rules;
- Batch or Session;
- Schedule;
- Attendance;
- Exam Result or CourseCompletion;
- Certificate;
- Invoice, Payment, Receipt, Refund, Receivable;
- Document verification;
- Dashboard definitions or metric snapshots.

## 16.5 Branch Isolation Compliance

Every list, detail, selector, export, and command must receive an authorization context derived server-side. Query parameters such as `branchId` are filters within the user's permitted scope and are never authorization grants.

---

# 17. Final Consistency Check

This Part 3 is consistent with the Module 14 overview, Part 1 requirements, and Part 2 use cases/state modeling in the following ways:

1. Every transactional CTM screen maps to a CTM command or query use case.
2. Cross-context actions are represented as orchestration or navigation, not direct ownership transfer.
3. The central Enrollment aggregate remains the only learning-lifecycle transaction created for corporate learners.
4. CorporateParticipant remains an employer-specific relationship over a shared Person identity.
5. Student and Trainer portal surfaces are read-only where CTM ownership does not justify mutation.
6. No UI screen has been invented for unresolved Nomination, Project Closure, Equipment, Travel, Costing, or GIVT models.
7. Permission hiding is treated as UX behavior only; server authorization and branch scoping remain mandatory.
8. English LTR and Arabic RTL behavior is explicitly defined using logical-layout rules and bidi isolation for codes and identifiers.
9. Composite screens tolerate partial cross-context read failures without representing unavailable data as zero or false.
10. Sensitive finance, identity, audit, and reconciliation data is permission-gated and minimized.

This document is therefore suitable as the screen-level functional baseline for subsequent database mapping, API contract design, permission matrix design, validation/error catalog design, and BDD testing, subject to explicit resolution of the listed architecture gaps before those gaps are implemented as persistent business functionality.
