# Part 3 – Screen Specifications and UI Components

## Module 13 - Document Management

## 1. Purpose and Scope of This Part

This document defines the screen inventory, page-level specifications, reusable UI components, dynamic UI states, bilingual rendering rules, accessibility expectations, permission-driven behavior, and Domain-Driven Design (DDD) fit for Module 13 - Document Management.

This part is constrained by the approved Module 13 overview, Part 1 functional requirements and business rules, Part 2 user stories/use cases/workflows/state machines, the DDD Context Map v3.0, and ER Model v3.0.

The UI is a client of application services. It must never become the authority for document lifecycle state, branch access, owner validity, verification eligibility, or cross-context business decisions. Client-side validation exists for usability only; all authoritative checks are repeated server-side.

### 1.1 Channel status

The DDD baseline establishes a single Admin Portal for the current implementation and identifies Student and Trainer portals as future application channels. Therefore:

- **Admin Portal screens are current-scope transactional screens.**
- **Student Portal screens are conditional/future-channel specifications** that may be activated only when the Student Portal application exists and IAM exposes appropriate self-service permissions.
- **Trainer Portal screens are conditional/future-channel specifications** that may be activated only when the Trainer Portal application exists and IAM exposes appropriate self-service permissions.
- The Student and Trainer portal specifications do not create new aggregates, owner types, workflow states, or permissions outside the Document Management, IAM, and owner-context boundaries.

### 1.2 Source traceability principles

Every screen below maps to one or more application use cases from Part 2 and one or more `FR-DOC-*` requirements from Part 1.

The screens use the ER-aligned core entities:

- `Document`
- `DocumentVerification`

The UI may resolve read-only display data from owner contexts such as:

- `Person`
- `StudentProfile`
- `TrainerProfile`
- `CorporateAccount`

Such display data is not edited through Document Management screens.

---

# 2. Screen Inventory

## 2.1 Admin Portal Screen Inventory

| Screen ID | Screen | Route Pattern | Purpose | Primary Use Case(s) | Main FR Traceability | Scope |
|---|---|---|---|---|---|---|
| SCR-DOC-ADM-001 | Document Registry | `/documents` | Search, filter, sort, and inspect accessible documents | UC-DOC-002, UC-DOC-003 | FR-DOC-007, 008, 009, 018, 019, 031 | Current |
| SCR-DOC-ADM-002 | Upload Document | `/documents/new` | Register document metadata and upload binary | UC-DOC-001 | FR-DOC-001 to 006, 018, 019, 022, 023, 029, 030, 033, 035 | Current |
| SCR-DOC-ADM-003 | Document Detail | `/documents/{documentId}` | View metadata, owner summary, current state, file access, and history | UC-DOC-003 | FR-DOC-009, 010, 014, 018, 019, 021, 031 | Current |
| SCR-DOC-ADM-004 | Edit Document Metadata | `/documents/{documentId}/edit` | Correct permitted metadata while preserving history | UC-DOC-008 | FR-DOC-005, 006, 018, 019, 021, 028, 032, 033 | Current |
| SCR-DOC-ADM-005 | Verification Queue | `/documents/verification` | Review branch-scoped pending verification work | UC-DOC-005, UC-DOC-006 | FR-DOC-024, 018, 019 | Current |
| SCR-DOC-ADM-006 | Verification Review | `/documents/{documentId}/verify` | Inspect evidence and approve/reject an eligible pending document | UC-DOC-005, UC-DOC-006 | FR-DOC-012, 013, 014, 017, 018, 019, 021, 032 | Current |
| SCR-DOC-ADM-007 | Expiry Workbench | `/documents/expiry` | Find expired and expiring-soon documents | UC-DOC-007 | FR-DOC-015, 016, 018, 019, 025, 027, 033 | Current |
| SCR-DOC-ADM-008 | Document Audit and Verification History | `/documents/{documentId}/history` | Review immutable verification decisions and linked audit facts | UC-DOC-003 | FR-DOC-014, 021, 028 | Current |
| SCR-DOC-ADM-009 | Blob Reconciliation Operations | `/documents/operations/reconciliation` | Operationally inspect unresolved Blob/database inconsistencies | UC-DOC-010 | FR-DOC-022, 023 | Restricted operations screen |
| SCR-DOC-ADM-010 | Owner Document Drawer/Tab | Embedded under owner-detail screens | View documents belonging to a Student, Trainer, Corporate, or Person owner | UC-DOC-002, UC-DOC-001 | FR-DOC-001, 003, 007, 008, 018, 019, 031 | Cross-context composition |

## 2.2 Student Portal Screen Inventory

> These screens are **future/conditional channel specifications**. They must not be treated as part of the currently committed single Admin Portal unless the Student Portal phase is activated.

| Screen ID | Screen | Route Pattern | Purpose | Use Case Mapping | Scope |
|---|---|---|---|---|---|
| SCR-DOC-STU-001 | My Documents | `/my/documents` | List only documents linked to the authenticated student's permitted owner identity | UC-DOC-002, UC-DOC-003 | Future/conditional |
| SCR-DOC-STU-002 | Upload My Document | `/my/documents/new` | Upload permitted self-service document types | UC-DOC-001 | Future/conditional |
| SCR-DOC-STU-003 | My Document Detail | `/my/documents/{documentId}` | View own document metadata, status, permitted remarks, and file | UC-DOC-003 | Future/conditional |

## 2.3 Trainer Portal Screen Inventory

> These screens are **future/conditional channel specifications**. Trainer Management remains the owner of TrainerProfile and qualification/business authorization data.

| Screen ID | Screen | Route Pattern | Purpose | Use Case Mapping | Scope |
|---|---|---|---|---|---|
| SCR-DOC-TRN-001 | My Documents | `/trainer/documents` | List documents associated with the authenticated trainer's owner identity | UC-DOC-002, UC-DOC-003 | Future/conditional |
| SCR-DOC-TRN-002 | Upload Trainer Document | `/trainer/documents/new` | Upload self-service evidence types allowed for trainers | UC-DOC-001 | Future/conditional |
| SCR-DOC-TRN-003 | Trainer Document Detail | `/trainer/documents/{documentId}` | View own document details and lifecycle status | UC-DOC-003 | Future/conditional |

## 2.4 Deliberately Excluded Screens

The following screens must not be introduced under Document Management:

- Certificate generation designer or certificate verification page.
- Student profile editor.
- Trainer profile or compensation editor.
- Corporate account or contract editor.
- Admission approval screen.
- Course completion approval screen.
- Invoice, receipt, refund, or finance document editor.
- Employee document portal before HRMS ownership is implemented.
- Generic public document browser.
- CMS-style content editor.
- OCR review or AI extraction workspace.

---

# 3. Global Information Architecture and Navigation

## 3.1 Admin Navigation Tree

```text
Documents
├── Document Registry
├── Upload Document                 [document.create]
├── Verification Queue              [document.verify.read]
├── Expiry Workbench                [document.expiry.read]
└── Operations                      [restricted]
    └── Blob Reconciliation         [document.operations.reconcile]
```

### Navigation rules

1. The `Documents` menu is shown only when the user has at least one Document Management navigation/read capability.
2. `Upload Document` is hidden when the user lacks create capability.
3. `Verification Queue` is hidden when the user lacks verification queue read capability.
4. Approval and rejection capability differences are enforced inside the review screen as separate actions.
5. `Expiry Workbench` is hidden without expiry/read capability.
6. `Operations` is hidden for ordinary business users.
7. Hiding navigation does not replace server-side authorization.
8. Branch scope is never selected by trusting a browser-supplied branch ID alone; the server intersects requested branch filters with IAM-authorized branch scope.

## 3.2 Owner-Context Composition Pattern

Student, Trainer, Corporate, and Person owner pages may embed a read-only `Documents` tab or drawer. This is a UI composition pattern, not a transfer of aggregate ownership.

Example:

```text
Student Detail (Admission & Enrollment-owned page)
├── Overview
├── Enrollments
├── Finance Summary (read composition)
└── Documents  ──> calls Document Management query service
```

Rules:

- Owner pages pass only the canonical owner reference to Document Management queries.
- Document Management validates owner reference and current user's branch scope server-side.
- The host page must not directly update `Document` tables.
- `Upload Document` from the owner tab may preselect owner type and owner ID, but the server still validates both.

---

# 4. Shared UI Components

## 4.1 `DocumentStatusBadge`

Displays the ER-aligned document verification status.

Supported labels:

- Uploaded
- Pending Verification
- Approved
- Rejected
- Expired

Behavior:

- Status values come from server-owned state.
- UI must not infer approval from the existence of a historical verification record.
- If expiry is implemented as a derived condition rather than persisted state, the component must distinguish `verificationStatus` from `expiryCondition` rather than mutating status in the browser.
- Tooltip may explain the status meaning.

## 4.2 `DocumentOwnerSummary`

Read-only presentation of owner data resolved from owning context/read model.

Fields vary by owner type, for example:

| Owner Type | Typical Display Fields |
|---|---|
| Student | Student number, full name, branch, status summary |
| Trainer | Trainer code, full name, branch, trainer status summary |
| Corporate | Account code, account name, primary branch/relationship summary when available |
| Person | Full name, masked identity/contact summary where allowed |

Rules:

- No inline owner editing.
- No copied identity fields are persisted back to `Document`.
- Sensitive fields are masked according to applicable policy.

## 4.3 `DocumentTypeSelect`

Searchable controlled selection backed by Configuration/Master Data or the actual approved schema mapping.

Behavior:

- Load only active document types valid for the current operation/owner policy.
- Do not allow arbitrary free text if the configured type is controlled.
- Show localized label according to active language.
- Server revalidates code/type on submission.

## 4.4 `OwnerSelector`

A composite owner search control used in Admin Portal upload.

Required fields:

- Owner Type
- Owner Search
- Selected Owner Summary

Rules:

- Current choices: Student, Trainer, Corporate, Person.
- Employee is not selectable until HRMS ownership is available.
- Owner search results are branch scoped server-side.
- Search result labels are resolved from owner context/read model.
- A selected owner cannot be submitted only from display text; canonical owner ID is required.

## 4.5 `SecureFileViewer`

Provides preview where browser/file type support permits and controlled download/open behavior otherwise.

Behavior:

- File access request goes through an authorized server-side access flow.
- No assumption that possession of `fileUrl` equals authorization.
- Loading, access denied, unavailable object, unsupported preview, and retry states are explicit.
- The component must never display storage credentials or persistent privileged tokens.

## 4.6 `VerificationHistoryTimeline`

Chronological display of immutable `DocumentVerification` decisions.

Each item shows:

- Decision status/action.
- Verifier display name, subject to permission.
- Decision date/time in Oman display timezone.
- Remarks, where allowed.

Rules:

- Existing decisions are never editable.
- Sorting defaults to newest first, with optional chronological toggle if needed.
- Rejected decision remarks are displayed only to audiences authorized for those remarks.

## 4.7 `ExpiryIndicator`

Displays:

- No expiry.
- Valid until date.
- Expiring in N days.
- Expires today.
- Expired N days ago.

Date-only values must render without unintended timezone date shifting.

## 4.8 `PermissionGuardedActionBar`

Renders only actions that the current user may potentially perform, based on permission claims returned by the server/session layer.

Examples:

- Edit metadata.
- Submit for verification.
- Approve.
- Reject.
- Retire.
- Preview/download.

Important: action hiding is usability behavior only. The called application service must authorize again.

## 4.9 `BranchScopeFilter`

Used only when IAM permits selection among multiple accessible branches.

Behavior:

- Single-branch user: hidden or read-only context display.
- Multi-branch user: show only assigned/authorized branches.
- Consolidated access: available only when IAM permits consolidated view.
- Requested values are revalidated server-side.

## 4.10 `DocumentUploadDropzone`

Capabilities:

- Drag and drop.
- File picker.
- File name display.
- File size display.
- Remove before submit.
- Upload progress only when supported by the approved upload flow.
- Clear retry behavior.

Validation must use approved application configuration for size and media type. This FRD does not invent file-size limits or MIME allowlists absent from DDD/ER/approved architecture configuration.

---

# 5. Detailed Admin Portal Screen Specifications

## 5.1 SCR-DOC-ADM-001 - Document Registry

### Purpose

Provide a branch-scoped operational registry for finding and inspecting documents without exposing records outside the user's authorized owner scope.

### Application service/use case mapping

- UC-DOC-002 - Search and List Documents
- UC-DOC-003 - View Document Detail and File
- FR-DOC-007, FR-DOC-008, FR-DOC-018, FR-DOC-019, FR-DOC-031

### Layout

```text
+--------------------------------------------------------------+
| Breadcrumbs: Documents                                       |
| Title: Document Registry                 [Upload Document]    |
+--------------------------------------------------------------+
| Filter Bar                                                   |
| Search | Owner Type | Document Type | Status | Expiry | Branch|
| Issue Date From/To | Expiry Date From/To | [Reset] [Apply]    |
+--------------------------------------------------------------+
| Result Summary: 128 documents                                |
| Saved query state in URL                                     |
+--------------------------------------------------------------+
| Data Table                                                   |
| Type | Owner | Owner Ref | Status | Issue | Expiry | Uploaded |
| ...                                                          |
+--------------------------------------------------------------+
| Pagination / page-size control                               |
+--------------------------------------------------------------+
```

### Interactive elements

- Free-text search for supported indexed/display fields exposed by query model.
- Owner Type filter.
- Document Type filter.
- Verification Status filter.
- Expiry condition filter: All, Expiring Soon, Expired, No Expiry.
- Issue date range.
- Expiry date range.
- Branch scope filter where IAM permits.
- Sortable column headers.
- Pagination.
- Row click or View action.
- Upload button, permission gated.
- Clear/reset filters.

### Table columns

| Column | Behavior |
|---|---|
| Document Type | Localized display label; sortable where query service supports it |
| Owner | Read-model display name; link only if user may access owner page |
| Owner Reference | Student number, trainer code, account code, or safe person reference as applicable |
| Owner Type | Localized enum label |
| Verification Status | Status badge |
| Issue Date | Date-only localized display |
| Expiry Date | Date-only display plus expiry indicator |
| Uploaded At | Oman timezone date/time |
| Uploaded By | Display name when authorized |
| Actions | View, secure preview/download where authorized; no unauthorized menu placeholders |

### Table behaviors

- Server-side pagination is mandatory for production lists.
- Server-side filtering and sorting are authoritative.
- Default sort: newest `createdAt` first unless Part 1/read model defines otherwise.
- Query parameters must be URL-addressable so reload/back navigation retains filters.
- Soft-deleted records are excluded from normal registry queries.
- Zero results preserve filters and show a contextual empty-result state.
- Row selection for bulk mutation is not included because no bulk lifecycle mutation requirement exists.

### Validation and query rules

- `fromDate <= toDate` for date ranges.
- Invalid enum/filter values result in a controlled validation response, not broad unfiltered data.
- Branch filter must intersect with IAM scope.
- Employee owner type is not offered in current scope.

### Dynamic states

- **Initial loading:** table header plus 8-10 row skeletons; filters may remain interactive only after reference data loads.
- **Filter loading:** preserve current rows with a subtle pending state or table skeleton; avoid blank page flash.
- **No documents:** “No documents are available in your accessible scope.” Upload CTA shown only with create permission.
- **No matching results:** “No documents match the current filters.” Show Reset Filters.
- **Authorization failure:** no partial rows; show access-denied page/state.
- **Reference lookup failure:** show retryable error without falling back to unscoped values.

### Permission behavior

- Without document read permission: route denied.
- Without create permission: Upload button hidden.
- Without file-access permission: preview/download action omitted.
- Without owner-context read permission: owner link omitted; safe display summary may still come from approved Document read model.

### DDD fit check

The registry calls Document Management query services. It may compose owner labels from read models but does not edit StudentProfile, TrainerProfile, CorporateAccount, or Person. Filter logic does not define document state transitions.

---

## 5.2 SCR-DOC-ADM-002 - Upload Document

### Purpose

Register a `Document` for exactly one valid supported owner and store its file binary through the approved Vercel Blob infrastructure adapter.

### Application service/use case mapping

- UC-DOC-001 - Register and Upload a Document
- FR-DOC-001 to FR-DOC-006
- FR-DOC-018, 019, 022, 023, 029, 030, 033, 035

### Layout

```text
+----------------------------------------------------------+
| Breadcrumbs: Documents > Upload                          |
| Title: Upload Document                                   |
+----------------------------------------------------------+
| Section 1: Owner                                         |
| Owner Type * | Owner Search * | Selected Owner Summary   |
+----------------------------------------------------------+
| Section 2: Classification                                |
| Document Type *                                          |
+----------------------------------------------------------+
| Section 3: Dates                                         |
| Issue Date | Expiry Date                                 |
+----------------------------------------------------------+
| Section 4: File                                          |
| Dropzone / Select File *                                 |
| File name / size / type summary                          |
+----------------------------------------------------------+
| [Cancel]                              [Upload Document]   |
+----------------------------------------------------------+
```

### Inputs

| Field | Required | UI Control | Validation |
|---|---:|---|---|
| Owner Type | Yes | Select/cards | Student, Trainer, Corporate, Person only in current phase |
| Owner | Yes | Async searchable selector | Canonical owner ID required; server validates existence, active state, and branch access |
| Document Type | Yes | Searchable select | Must be active/valid in Configuration or approved schema relation |
| Issue Date | Conditional/Optional | Date picker | Date-only semantics; policy-defined optionality by type may be applied from configuration |
| Expiry Date | Conditional/Optional | Date picker | Cannot be earlier than issue date when both present |
| File | Yes | Dropzone/file picker | Size/type rules from approved configuration/architecture; no invented values |

### Processing interaction

1. User selects owner type.
2. UI clears any previously selected owner when owner type changes.
3. UI requests branch-scoped owner search results.
4. User selects one canonical owner.
5. UI loads permitted/active document type options as required.
6. User enters dates and selects a file.
7. Client performs usability validation.
8. Submit is disabled while identical submission is in progress.
9. Application service authorizes create action and branch scope.
10. Application service validates owner, type, metadata, and file policy.
11. Storage orchestration uses the Vercel Blob infrastructure boundary.
12. Metadata persistence completes according to the Part 1 dual-write consistency rules.
13. Success navigates to Document Detail with a success notification.

### Validation error presentation

- Inline field error beneath each invalid field.
- Summary banner at top when server returns multiple validation errors.
- Owner access failure must not reveal hidden owner details.
- Blob failure message: upload unsuccessful; no claim that a business document exists.
- Database failure after Blob success: show controlled failure/correlation reference; reconciliation is an operations concern and not exposed as a user-editable recovery workflow.

### Loading states

- Owner search: inline spinner/skeleton dropdown.
- Document type options: select skeleton.
- Submit: button pending state and form protected from duplicate submit.
- Upload progress: only if supported by approved storage upload design.

### Permission behavior

- Route requires create capability.
- Owner search results remain branch scoped.
- User cannot override `uploadedBy`.
- Unauthorized owner types are not rendered.

### DDD fit check

The form creates Document Management metadata and invokes storage infrastructure. It validates an external owner reference but does not create or modify that owner. Vercel Blob is not called directly from domain logic; provider-specific behavior remains behind infrastructure/application boundaries.

---

## 5.3 SCR-DOC-ADM-003 - Document Detail

### Purpose

Provide the authoritative operational view of one accessible Document, its current lifecycle status, owner summary, secure file access entry point, and immutable verification history.

### Application service/use case mapping

- UC-DOC-003
- UC-DOC-004 as action entry point
- UC-DOC-008 as edit navigation
- UC-DOC-009 as retire action entry point

### Layout

```text
+----------------------------------------------------------+
| Breadcrumbs: Documents > {Document Type}                 |
| Title + Status Badge                                     |
| [Preview] [Download] [Edit] [Submit] [Retire]            |
+----------------------------------------------------------+
| Owner Summary Card                                       |
+----------------------------------------------------------+
| Document Metadata                                        |
| Type | File Name | Issue Date | Expiry Date | Uploaded By |
| Created At | Updated At                                  |
+----------------------------------------------------------+
| Secure Preview Panel / Preview Placeholder               |
+----------------------------------------------------------+
| Verification History Timeline                            |
+----------------------------------------------------------+
```

### Interactive elements

- Preview/open secure file.
- Download file where allowed.
- Edit metadata.
- Submit for verification when current state and permission permit.
- Navigate to Verification Review when pending and verifier has queue/review permission.
- Retire document.
- Open full history page if history volume requires pagination.

### Action-state rules

| Current State | Submit | Approve/Reject | Edit Metadata | Retire |
|---|---|---|---|---|
| Uploaded | Eligible with permission | No | Yes, subject to policy | Yes |
| PendingVerification | No | Via Verification Review for authorized verifier | Limited/policy controlled | Yes, subject to policy |
| Approved | No | No | Allowed metadata only; file evidence replacement cannot silently preserve approval | Yes |
| Rejected | Resubmission action only if approved policy exists; otherwise absent | No | Metadata correction may be allowed | Yes |
| Expired | No automatic verification action inferred | No | Metadata correction subject to policy | Yes |

### Dynamic states

- Detail skeleton with separate owner, metadata, preview, and history placeholders.
- File preview loading independent of metadata loading.
- Preview unsupported: show file information and permitted Download/Open action.
- Blob unavailable: controlled “File currently unavailable” state; metadata remains visible.
- History empty: “No verification decisions recorded yet.”
- Concurrent state change: show stale-state warning and Reload action.
- Soft-deleted record: excluded from normal route unless dedicated privileged recovery policy is later approved.

### Permission behavior

- Detail route requires read access and owner branch scope.
- File actions require file-access permission.
- Edit hidden without update permission.
- Submit hidden without submit permission or invalid state.
- Retire hidden without retire permission.
- Verification history actor details may be masked based on audit/history permission.

### DDD fit check

The page displays Document and DocumentVerification data. Owner information is composed read-only. It must not infer certificate eligibility, enrollment completion, trainer qualification validity, or corporate compliance acceptance beyond the Document Management state itself.

---

## 5.4 SCR-DOC-ADM-004 - Edit Document Metadata

### Purpose

Correct permitted Document metadata without mutating immutable verification history or silently carrying approval to changed file evidence.

### Application service/use case mapping

- UC-DOC-008
- FR-DOC-005, 006, 021, 028, 032, 033

### Layout

Same visual structure as upload, but owner identity is displayed read-only unless a separately approved reassignment rule exists. Current source requirements do not define owner reassignment, so the screen must not permit it.

### Editable fields

- Document Type, where policy allows correction.
- Issue Date.
- Expiry Date.
- Other ER-approved metadata only.

### Non-editable fields

- `id`
- `ownerType`
- `ownerId`
- `uploadedBy`
- Verification history
- Historical verifier identity/timestamps

### File replacement rule

Part 1 explicitly requires an approved resubmission policy before changed evidence can silently retain approval. Therefore:

- This edit screen does **not** casually replace the binary of an Approved document.
- Where file replacement is later approved, it must invoke an explicit application use case that resets/re-enters lifecycle state according to approved policy and creates appropriate audit evidence.
- The UI must not implement this rule locally.

### Validation

- Expiry date cannot precede issue date.
- Date-only values retain calendar date semantics.
- Document type must remain valid for the operation.
- Version/concurrency token is supplied if repository convention supports optimistic locking.

### Dynamic states

- Loading skeleton for form values.
- Server validation errors mapped to fields.
- Stale version: non-destructive conflict message with Reload Latest action.
- Save pending: disable duplicate submit.
- Success: navigate back to detail with confirmation.

### DDD fit check

This page updates Document metadata only. It cannot edit owner-context data and cannot rewrite `DocumentVerification` history.

---

## 5.5 SCR-DOC-ADM-005 - Verification Queue

### Purpose

Provide a work queue of only eligible `PendingVerification` documents within the verifier's authorized branch scope.

### Application service/use case mapping

- UC-DOC-005
- UC-DOC-006
- FR-DOC-024, 018, 019

### Layout

```text
+----------------------------------------------------------+
| Title: Verification Queue                                |
+----------------------------------------------------------+
| Search | Owner Type | Document Type | Branch | Age       |
+----------------------------------------------------------+
| Pending Count                                            |
+----------------------------------------------------------+
| Table: Type | Owner | Submitted/Updated | Expiry | Action |
+----------------------------------------------------------+
```

### Filters

- Owner type.
- Document type.
- Branch when permitted.
- Search.
- Expiry risk.
- Pending age/date range, if supported by available timestamps/query model.

### Table behaviors

- Only `PendingVerification` items.
- Server pagination.
- Default oldest actionable item first is recommended for operational fairness, but implementation should confirm available submission timestamp semantics. If no explicit submitted timestamp exists, use a documented query field such as `updatedAt` only after schema review.
- Each row has Review action.
- No inline approve/reject from table: verifier should inspect evidence and context on Review screen.
- No client-side status mutation.

### Dynamic states

- Queue skeleton.
- Empty state: “No documents are waiting for verification in your accessible scope.”
- Item taken by another decision-maker before review: navigating to review returns latest state and disables decisions.

### Permission behavior

- Route requires verification queue read capability.
- Review action requires ability to view that document.
- Approve/reject buttons are not shown on this screen.

### DDD fit check

The queue is a Document Management query/read model. It does not create a new workflow aggregate or approval engine.

---

## 5.6 SCR-DOC-ADM-006 - Verification Review

### Purpose

Allow an authorized verifier to inspect one PendingVerification document and commit exactly one valid approve or reject decision.

### Application service/use case mapping

- UC-DOC-005 - Approve Pending Document
- UC-DOC-006 - Reject Pending Document
- FR-DOC-012, 013, 014, 017, 018, 019, 021, 032

### Layout

```text
+----------------------------------------------------------+
| Document Type | Pending Verification Badge               |
+-------------------------------+--------------------------+
| Secure File Preview           | Owner Summary            |
|                               | Metadata                 |
|                               | Issue / Expiry           |
|                               | Previous History         |
+-------------------------------+--------------------------+
| Decision Panel                                           |
| Remarks                                                   |
| [Reject]                                      [Approve]   |
+----------------------------------------------------------+
```

### Interactive elements

- Secure preview/download.
- Expand/collapse owner summary.
- View previous immutable verification decisions.
- Approve.
- Reject with mandatory remarks.
- Cancel/back to queue.

### Validation

- Current server state must still be `PendingVerification` at decision time.
- Reject requires non-whitespace meaningful remarks.
- Approve remarks are optional unless future policy defines otherwise.
- Version/concurrency check should reject stale decisions according to repository conventions.

### Decision confirmation

- Approve: confirmation dialog summarizing document and owner.
- Reject: confirmation dialog includes rejection remarks and warns that the reason will be retained in history.
- Confirmation dialog is not the business guard; the server command is authoritative.

### Dynamic states

- Preview skeleton independent of decision panel.
- Decision submit pending state disables both decision buttons.
- Stale state/conflict: “This document was already changed. Reload the latest state.”
- Blob unavailable: approval/rejection actions should follow approved operational policy. The UI must not invent whether verification is allowed without viewing evidence; absent an approved rule, the safe UI behavior is to disable decision controls and surface the file-access failure for investigation.
- Access revoked between load and submit: server rejects; screen shows access denied without committing a decision.

### Permission behavior

- Approve button requires approve capability.
- Reject button requires reject capability.
- A verifier with only one capability sees only that action.
- No role-name checks.

### DDD fit check

The screen sends commands to Document Management application services. Audit facts are emitted/recorded through Audit & Compliance integration. The UI does not write AuditLog or DocumentVerification rows directly.

---

## 5.7 SCR-DOC-ADM-007 - Expiry Workbench

### Purpose

Provide operational visibility into expired and expiring documents without transferring document expiry ownership to Communication or Reporting.

### Application service/use case mapping

- UC-DOC-007 - Monitor Expiry
- FR-DOC-015, 016, 025, 027, 033

### Layout

```text
+----------------------------------------------------------+
| Title: Expiry Workbench                                  |
+----------------------------------------------------------+
| Summary Cards                                            |
| Expired | Expiring within selected window | No Expiry    |
+----------------------------------------------------------+
| Tabs: Expired | Expiring Soon                            |
+----------------------------------------------------------+
| Filters: Window | Owner Type | Document Type | Branch    |
+----------------------------------------------------------+
| Table                                                    |
+----------------------------------------------------------+
```

### Interactive elements

- Expiry view tabs.
- Configured/selectable date window.
- Owner and document type filters.
- Branch filter when authorized.
- Open Document Detail.
- No direct notification-delivery controls unless a separately defined Communication use case is approved.

### Table columns

- Document Type.
- Owner.
- Owner Type.
- Verification Status/current state.
- Expiry Date.
- Days Until Expiry or Days Expired.
- Branch display.
- View action.

### Dynamic states

- Summary-card skeletons plus table skeleton.
- Empty “No expired documents” success-oriented state.
- Empty “No documents expire in the selected window.”
- Time/date display uses Oman business timezone defaults and date-only safety.

### Permission behavior

- Route requires expiry queue/read permission.
- Branch scope enforced server-side.
- Consolidated view requires both relevant permission and IAM consolidated access.

### DDD fit check

Expiry facts remain owned by Document Management. Communication may be requested to deliver alerts; delivery state is not edited here. Reporting may consume projections but cannot mutate document expiry state.

---

## 5.8 SCR-DOC-ADM-008 - Document Audit and Verification History

### Purpose

Present immutable verification decisions and permitted linked audit evidence for governance review.

### Application service/use case mapping

- UC-DOC-003
- FR-DOC-014, 021, 028

### Layout

```text
+----------------------------------------------------------+
| Title: Document History                                  |
| Document summary                                         |
+----------------------------------------------------------+
| Tabs: Verification Decisions | Audit Activity            |
+----------------------------------------------------------+
| Timeline/Table                                            |
+----------------------------------------------------------+
```

### Verification Decisions tab

Columns/items:

- Decision status.
- Verifier.
- Decision date/time.
- Remarks.

### Audit Activity tab

Read-only composition from Audit & Compliance where permission allows:

- Action.
- Performed By.
- Performed At.
- Reason.
- Old/new values, subject to redaction rules.

### Rules

- No edit/delete actions.
- Audit context remains owner of AuditLog.
- Document Management supplies entity references/action facts but does not duplicate audit ownership.

### Dynamic states

- Timeline skeleton.
- Empty verification history.
- Audit integration unavailable: verification history remains usable; show retryable audit-tab error.

### Permission behavior

Verification history and audit detail may have separate permissions. A user may see document metadata without full audit payload.

### DDD fit check

The screen is a read composition across Document Management and Audit & Compliance. No cross-context mutation occurs.

---

## 5.9 SCR-DOC-ADM-009 - Blob Reconciliation Operations

### Purpose

Provide restricted operational visibility for Blob/database inconsistency cases identified by approved reconciliation logic.

### Application service/use case mapping

- UC-DOC-010
- FR-DOC-022, FR-DOC-023

### Important scope constraint

The ER model does not define a reconciliation aggregate/table or provider-specific Blob operational metadata. Therefore this screen is valid only as an **operations projection/view over approved infrastructure reconciliation data**. It must not cause a new business aggregate to be invented without architecture/schema approval.

### Layout

```text
+----------------------------------------------------------+
| Title: Storage Reconciliation                            |
| Restricted Operations                                    |
+----------------------------------------------------------+
| Status Filter | Failure Type | Date Range | Search       |
+----------------------------------------------------------+
| Table: Correlation | Failure Type | Detected At | Status |
|        Safe Reference | Last Attempt | Action            |
+----------------------------------------------------------+
```

### Interactive elements

- Inspect safe operational details.
- Retry/compensate only if such operations are exposed by approved application/infrastructure service.
- Copy correlation reference.

### Security rules

- Never show storage credentials, secrets, or privileged tokens.
- Avoid logging or presenting file binary content.
- Provider-specific identifiers beyond approved schema must be treated as operational metadata, not domain fields.

### Dynamic states

- Operations list skeleton.
- No unresolved inconsistencies state.
- Retry pending and retry failed states.
- Partial infrastructure outage state.

### DDD fit check

This is an operational/infrastructure concern exposed through a restricted application service. It does not alter Document business lifecycle rules.

---

## 5.10 SCR-DOC-ADM-010 - Owner Document Drawer/Tab

### Purpose

Allow users working in owner-context screens to see related documents without leaving the operational context.

### Host contexts

- Admission & Enrollment: Student detail.
- Faculty / Trainer Management: Trainer detail.
- Corporate Training: Corporate Account detail.
- Shared Person views where an approved host screen exists.

### Layout

Compact embedded list:

```text
Documents (6)                                      [Upload]
------------------------------------------------------------
Passport          Approved          Expires 12 Oct 2027 [View]
Civil ID          Expiring Soon     Expires 02 Sep 2026 [View]
...
[View All Documents]
```

### Rules

- Host provides canonical owner reference only.
- Document query service authorizes the current user independently.
- Upload CTA preselects owner and locks the owner selector.
- Owner data is not persisted in Document beyond approved reference fields.
- Host context cannot update verification state directly.

### DDD fit check

This is cross-context UI composition using an application/query boundary, not direct database coupling.

---

# 6. Student Portal Screen Specifications (Future/Conditional)

## 6.1 Self-Service Ownership Principle

The authenticated user must not be permitted to supply arbitrary `ownerId` values to access another student's documents. The server resolves the authenticated identity to the authorized Person/StudentProfile relationship using IAM and Admission & Enrollment-owned identity linkage.

The Document Management module then queries only documents for the resolved permitted owner reference(s).

## 6.2 SCR-DOC-STU-001 - My Documents

### Purpose

Let an authenticated student view permitted documents associated with their own student/person identity.

### Layout

- Page title: My Documents.
- Status summary strip.
- Filters: Document Type, Status, Expiry condition.
- Card list on small screens; responsive table on larger screens.
- Upload CTA only if self-service upload is enabled by policy and permission.

### Card/table fields

- Document Type.
- Status.
- Issue Date.
- Expiry Date/indicator.
- Last Updated.
- View action.

### Behaviors

- No owner selector.
- No branch selector.
- No verification actions.
- No audit actor details.
- Rejection remarks displayed only where policy permits and only for the student's own document.

### Dynamic states

- Skeleton cards/rows.
- Empty state: “You do not have any documents yet.”
- Upload CTA conditional on permission.
- Access mismatch: generic not-found/access-denied response without exposing another owner's existence.

### DDD fit check

Self-service identity mapping is resolved through IAM and Admission & Enrollment. The page does not edit StudentProfile.

---

## 6.3 SCR-DOC-STU-002 - Upload My Document

### Purpose

Allow a student to upload only self-service document types approved for the student channel.

### Layout

- Owner is implicit and not editable.
- Document Type.
- Issue Date.
- Expiry Date.
- File upload.
- Submit.

### Validation

Same metadata/date/file validations as Admin upload, plus:

- Owner identity resolved server-side from authenticated principal.
- Only document types allowed for student self-service are offered and accepted.
- `uploadedBy` derived from authenticated user.

### Dynamic states

Same as Admin upload, with simplified owner step.

### DDD fit check

The screen creates a Document record for an existing owner. It does not create admission, enrollment, or student identity.

---

## 6.4 SCR-DOC-STU-003 - My Document Detail

### Purpose

Show a student's own accessible document details and secure file access.

### Components

- Status badge.
- Metadata.
- Expiry indicator.
- Secure file preview/download.
- Simplified decision history or latest rejection reason where policy permits.

### Excluded actions

- Approve.
- Reject.
- Edit verifier identity.
- View internal audit payload.
- View other owners.

### DDD fit check

Read-only lifecycle presentation plus approved self-service actions. No UI-driven state transition is invented.

---

# 7. Trainer Portal Screen Specifications (Future/Conditional)

## 7.1 Self-Service Ownership Principle

The server resolves the authenticated user to Person/TrainerProfile through IAM and Faculty / Trainer Management. Client-supplied arbitrary trainer IDs are not trusted.

## 7.2 SCR-DOC-TRN-001 - My Documents

### Purpose

Allow trainers to see their accessible documents, statuses, and expiry risk.

### Layout and behavior

- Summary: Total, Pending Verification, Approved, Expiring Soon/Expired.
- Filters: Document Type, Status, Expiry.
- Responsive table/card list.
- Upload CTA if self-service permission exists.
- No branch or trainer selector.

### DDD fit check

The page does not determine trainer availability, course authorization, compensation, or qualification business validity. Those remain Trainer Management responsibilities even when a supporting document is attached.

---

## 7.3 SCR-DOC-TRN-002 - Upload Trainer Document

### Purpose

Upload evidence documents against the authenticated trainer's permitted owner identity.

### Inputs

- Document Type.
- Issue Date.
- Expiry Date.
- File.

### Rules

- Trainer identity is server resolved.
- Document type must be allowed for trainer self-service.
- Upload does not automatically create/update `TrainerQualification` or `TrainerCourseAuthorization`.
- Such cross-context actions require explicit Trainer Management application services and are outside this screen.

### DDD fit check

The screen creates document evidence only.

---

## 7.4 SCR-DOC-TRN-003 - Trainer Document Detail

### Purpose

Show a trainer's own document status, expiry, permitted remarks, and secure file access.

### Excluded actions

- Verification approval/rejection.
- Trainer qualification editing.
- Compensation changes.
- Course authorization changes.

### DDD fit check

Read-only Document Management view with secure file access.

---

# 8. Dynamic UI State Specification

## 8.1 Validation Error Taxonomy

| Error Type | Example | UI Behavior |
|---|---|---|
| Required field | No Document Type | Inline error and focus summary |
| Invalid owner | Owner deleted/not found | Clear selected owner; generic validation error without leaked details |
| Unauthorized owner | Owner outside branch scope | Access/validation error; do not reveal owner details |
| Invalid date range | Expiry before issue date | Inline expiry-date error |
| Invalid document type | Inactive or unsupported type | Inline type error; refresh options |
| Invalid state transition | Approve Uploaded document | State error and reload latest state |
| Missing rejection reason | Empty rejection remarks | Inline textarea error |
| Concurrency conflict | Another verifier already decided | Conflict banner, disable stale actions, Reload |
| File policy violation | Unsupported type/size | Inline file error based on approved configuration |
| Blob upload failure | Storage operation fails | Retain recoverable form metadata locally where safe; show retry |
| Metadata persistence failure | Blob success/database failure | Controlled error with correlation reference; no false success message |
| Session/auth failure | Session expired | Redirect/re-auth according to IAM pattern; do not continue upload silently |

## 8.2 Loading Skeleton Standards

### List screens

- Render filter-bar shell.
- Render table header.
- Render 8-10 row skeletons.
- Avoid fake readable values that resemble real data.

### Detail screens

Independent skeleton zones:

1. Header/status.
2. Owner summary.
3. Metadata card.
4. File preview.
5. History.

This permits partial rendering without blocking all content on slow file preview.

### Forms

- Reference-data selects show disabled skeleton controls.
- Existing-value edit forms remain non-editable until authoritative values load.
- Never initialize missing loaded state as empty values that users may accidentally overwrite.

## 8.3 Empty State Catalogue

| Screen | Empty State | CTA Rule |
|---|---|---|
| Registry | No accessible documents | Upload shown only with create permission |
| Registry filtered | No matching results | Reset Filters |
| Verification Queue | No pending documents | No create CTA |
| Expiry Workbench | No expired/expiring documents | Informational; no mutation CTA |
| Verification History | No decisions yet | No CTA unless current status allows submit and user has permission |
| Student My Documents | No documents yet | Upload only if self-service create is enabled |
| Trainer My Documents | No documents yet | Upload only if trainer self-service create is enabled |
| Reconciliation | No unresolved inconsistencies | Operational success state |

## 8.4 Error States

- Page-level retry for query failure.
- Component-level retry for preview or audit-tab failure.
- No fallback to unscoped or cached unauthorized data.
- File access errors do not remove the metadata record from view.
- Error messages should include correlation references where operationally useful, but not secret provider identifiers.

## 8.5 Permission-Based Hiding and Disabling

### Hide rather than disable when

- User fundamentally lacks the capability.
- Action should not be discoverable to unauthorized users.

Examples:

- No Approve permission: hide Approve.
- No Reject permission: hide Reject.
- No Create permission: hide Upload CTA.

### Disable with explanation when

- User has the capability but the current document state makes the action invalid.
- An in-progress request temporarily prevents duplicate action.
- A prerequisite resource is temporarily unavailable and approved safe behavior requires waiting.

Examples:

- Submit disabled while request is pending.
- Decision controls disabled after stale-state detection.

### Mandatory server rule

A hidden or disabled action must never be considered an authorization control. The application service rechecks:

- Authentication.
- Permission.
- Branch scope.
- Owner validity.
- Current document state.
- Concurrency/version constraints.

---

# 9. Table, Search, Sorting, and Pagination Standards

## 9.1 Server-Side Data Operations

For operational tables:

- Pagination: server-side.
- Filtering: server-side.
- Sorting: server-side.
- Branch restriction: server-side before result return.
- Soft-delete exclusion: server-side.

## 9.2 URL State

List filters should be represented in query parameters where compatible with application conventions.

Example conceptual form:

```text
/documents?ownerType=Student&status=PendingVerification&expiry=expiring-soon&page=2
```

This is a UI routing example, not an API contract.

## 9.3 Sorting Rules

Allowed sort fields should be explicitly allowlisted in the query service. Browser-provided arbitrary database column names must not be passed directly to persistence queries.

Typical sortable fields:

- Created/Uploaded time.
- Updated time.
- Issue date.
- Expiry date.
- Document type display field when supported by query model.

## 9.4 Pagination Rules

- Page size choices follow shared product standards.
- Total count should be shown only if query performance supports it.
- Changing filters resets to first page.
- Page access beyond final page returns controlled empty/reset behavior.

---

# 10. Form Validation Rules

## 10.1 Owner Validation

1. Exactly one owner reference is required.
2. `ownerType` and `ownerId` are treated as a pair.
3. Current supported owner types: Student, Trainer, Corporate, Person.
4. Employee is unavailable until HRMS ownership exists.
5. Owner must exist and not be soft deleted for new document registration.
6. User must have branch scope to the owner.
7. Client owner search is not authoritative.

## 10.2 Document Type Validation

1. Type must come from active configured values or approved schema relation.
2. Localized label is presentation; canonical code/ID is submitted.
3. Inactive types cannot be newly assigned.
4. Historical display of an inactive type must remain readable where required for old records.

## 10.3 Date Validation

1. `expiryDate >= issueDate` when both exist.
2. Null expiry is permitted for non-expiring documents.
3. Date-only values do not shift due to timezone conversion.
4. Date/time audit fields display in Oman business timezone defaults.

## 10.4 File Validation

1. File is required for new upload.
2. Approved type/size checks are driven by configuration/architecture policy.
3. User-visible file name is not trusted as a globally unique storage key.
4. Binary content is never logged.
5. Storage credentials/tokens are never displayed.

## 10.5 Verification Validation

1. Only PendingVerification can be approved.
2. Only PendingVerification can be rejected.
3. Rejection remarks are mandatory.
4. Every decision creates immutable history.
5. Current state and decision history are updated consistently.
6. Stale concurrent decisions are rejected according to repository convention.

---

# 11. Bilingual Layout and Localization Rules

## 11.1 General Direction Rules

| Concern | English | Arabic |
|---|---|---|
| Page direction | `ltr` | `rtl` |
| Primary navigation flow | Left-to-right | Right-to-left |
| Breadcrumb progression | Left to right | Right to left |
| Form label alignment | Product design standard for LTR | Mirrored/aligned for RTL readability |
| Leading icons | Left of label | Right of label where icon is directional/leading |
| Drawer origin | Product LTR standard | Mirrored for RTL where appropriate |
| Table reading order | First key column on left | First key column on right |
| Pagination arrows | Normal LTR semantic direction | Mirrored semantic direction |

## 11.2 Text and Data Direction

- Arabic content uses RTL layout.
- English file names, codes, IDs, email addresses, URLs, and technical references should preserve LTR/bidirectional isolation even inside Arabic pages.
- Mixed strings must use proper Unicode bidi isolation or direction-aware components to avoid reordered identifiers.
- Numbers should follow the shared ASTI locale decision; identifiers must remain stable and unambiguous.

## 11.3 Forms in RTL

Arabic upload form visual order:

```text
[عنوان الصفحة من اليمين]

نوع المالك     البحث عن المالك
نوع المستند
تاريخ الإصدار   تاريخ الانتهاء
رفع الملف

[إلغاء]                         [رفع المستند]
```

Rules:

- Required markers remain adjacent to their labels.
- Calendar popovers open in a non-clipping direction suitable for RTL.
- Date values preserve date semantics.
- Validation icon placement mirrors while error semantics remain equivalent.

## 11.4 Tables in RTL

- Column order may mirror to preserve scanning flow.
- Action menu appears on the trailing side appropriate to RTL.
- Sort indicators align with localized header direction.
- Numeric/code cells may remain LTR within RTL table cells.
- Horizontal scroll starts at the logical beginning for the active direction where framework support permits.

## 11.5 Status and Enum Localization

Status labels require localized display values while preserving canonical server values.

Example:

| Canonical Value | English Display | Arabic Display Requirement |
|---|---|---|
| Uploaded | Uploaded | Localized configured Arabic label |
| PendingVerification | Pending Verification | Localized configured Arabic label |
| Approved | Approved | Localized configured Arabic label |
| Rejected | Rejected | Localized configured Arabic label |
| Expired | Expired | Localized configured Arabic label |

This document does not invent Arabic translations as domain data unless approved localization values are supplied by Configuration/Master Data.

## 11.6 File Names and Preview

- Preserve original file name characters where safely supported.
- Do not reverse file extensions in RTL.
- Preview toolbar icons with direction semantics must mirror appropriately.
- PDF/image content itself is not mirrored by UI direction.

## 11.7 Responsive Rules

- Desktop admin tables may remain tables with horizontal overflow.
- Student/Trainer portal lists should adapt to cards on narrow screens.
- RTL responsive order must be tested independently rather than assumed from CSS mirroring.

---

# 12. Accessibility Requirements

1. All interactive controls must be keyboard reachable.
2. Focus order follows visual/logical reading order in both LTR and RTL.
3. Dialogs trap focus and return focus to the invoking action on close.
4. Status is not conveyed by color alone.
5. File dropzone has a keyboard-operable Select File action.
6. Upload progress, decision success, and validation failures use appropriate live-region announcements.
7. Table sort state is programmatically exposed.
8. Icon-only actions require accessible names.
9. Error summary links should move focus to the affected field.
10. Preview failure must have text explanation and alternative permitted action.
11. Skeletons should not create excessive screen-reader noise.
12. Arabic labels and control names must be fully localized where the Arabic UI is enabled.

---

# 13. Permission-to-UI Mapping Overview

> Permission codes below are capability-oriented conceptual mappings consistent with Part 1 and Part 2. Final exact permission catalog must match the IAM Permission records and Part 6 Permission Matrix when generated.

| UI Capability | Conceptual Permission | UI Effect |
|---|---|---|
| Open Document Registry | `document.read` | Show Documents menu and registry route |
| Create/Upload | `document.create` | Show Upload CTA and route |
| Edit Metadata | `document.update` | Show Edit action |
| Submit for Verification | `document.verify.submit` | Show Submit action only in eligible state |
| Read Verification Queue | `document.verify.read` | Show queue menu/route |
| Approve | `document.verify.approve` | Show Approve action |
| Reject | `document.verify.reject` | Show Reject action |
| Secure File Access | `document.file.read` | Show preview/download actions |
| Expiry Queue | `document.expiry.read` | Show Expiry Workbench |
| Retire | `document.retire` | Show Retire action |
| Read History | `document.history.read` | Show detailed history view |
| Reconciliation Ops | `document.operations.reconcile` | Show restricted operations route |

Rules:

- Role names are never checked in UI business logic.
- Menu access does not grant action access.
- Branch scope is independently enforced.
- Consolidated branch results require IAM consolidated access plus applicable document permission.

---

# 14. Screen-to-Use-Case and Application-Service Traceability

| Screen | Use Case | Application Service Responsibility | DDD Owner |
|---|---|---|---|
| Document Registry | UC-DOC-002 | Query accessible documents with filters/sort/paging | Document Management |
| Upload Document | UC-DOC-001 | Validate owner reference, metadata, permission, scope; orchestrate Blob + metadata persistence | Document Management + infrastructure adapter |
| Document Detail | UC-DOC-003 | Fetch accessible document detail/history and authorize file access entry | Document Management |
| Edit Metadata | UC-DOC-008 | Validate permitted changes, dates, concurrency, audit fact | Document Management |
| Verification Queue | UC-DOC-005/006 | Query PendingVerification work | Document Management |
| Verification Review | UC-DOC-005/006 | Authorize and execute approve/reject transition | Document Management |
| Expiry Workbench | UC-DOC-007 | Evaluate/query expiry condition | Document Management |
| History Screen | UC-DOC-003 | Read verification history; compose permitted audit data | Document Management + Audit read integration |
| Reconciliation Ops | UC-DOC-010 | Inspect/retry approved reconciliation operations | Infrastructure/Application Operations |
| Owner Document Tab | UC-DOC-002/001 | Query documents by canonical owner reference | Document Management |
| Student My Documents | UC-DOC-002/003 | Resolve self identity, query own docs | IAM + Admission/Enrollment identity mapping + Document query |
| Student Upload | UC-DOC-001 | Resolve self owner and create document | Document Management |
| Trainer My Documents | UC-DOC-002/003 | Resolve trainer identity and query own docs | IAM + Trainer Management identity mapping + Document query |
| Trainer Upload | UC-DOC-001 | Resolve trainer owner and create document | Document Management |

---

# 15. DDD Fit Check by Screen Family

## 15.1 Registry and Search Screens

**Allowed:** Query Document data and approved owner read models.

**Not allowed:** Update owner aggregates, calculate enrollment eligibility, infer trainer authorization, or manage corporate contracts.

## 15.2 Upload Screens

**Allowed:** Create Document metadata linked to an existing canonical owner and orchestrate binary storage.

**Not allowed:** Create StudentProfile, TrainerProfile, CorporateAccount, Person, or Employee substitute records.

## 15.3 Verification Screens

**Allowed:** Execute Document verification transitions and append immutable DocumentVerification history.

**Not allowed:** Act as a generic cross-module approval framework or write AuditLog directly from the browser.

## 15.4 Expiry Screens

**Allowed:** Show Document expiry facts/conditions and invoke approved alert request boundaries.

**Not allowed:** Own notification delivery status or edit Communication logs.

## 15.5 Owner-Embedded Document Components

**Allowed:** Compose Document query results inside owner-context pages.

**Not allowed:** Direct cross-package table writes or duplicate owner master data in Document.

## 15.6 Student/Trainer Self-Service Screens

**Allowed:** Securely resolve authenticated user to own permitted owner reference and expose Document use cases.

**Not allowed:** Accept arbitrary owner IDs, edit StudentProfile/TrainerProfile, or bypass branch/self ownership checks.

---

# 16. Cross-Context UI Dependency Mapping

| Dependency Context | UI Need | Allowed Interaction | Prohibited UI Assumption |
|---|---|---|---|
| IAM | Permissions, branch scope, self identity | Session/access service, server guards | Hardcoded role names or client-only access control |
| Configuration / Master Data | Document type labels/options | Read active localized values | Free-text type ownership in UI |
| Admission & Enrollment | Student owner identity/display | Owner search/read model and self identity resolution | Editing StudentProfile from Document screen |
| Trainer Management | Trainer owner identity/display | Owner search/read model and self identity resolution | Changing qualification/course authorization from Document screen |
| Corporate Training | Corporate owner identity/display | Owner search/read model | Editing corporate account/contract from Document screen |
| Party / Person | Person owner identity/display | Read canonical person summary | Creating duplicate person data |
| Audit & Compliance | Audit activity display | Read composition; application integration for audit facts | Browser writes AuditLog |
| Communication | Future expiry alert delivery | Display alert-request outcome only if API contract exists | Treating notification delivery as Document lifecycle state |
| Reporting | Aggregated document metrics | Navigate/read reports where authorized | Reporting mutations of Document state |
| Certificate | Separate certificate files/status | Navigation only if authorized | Managing certificates as generic Document records |
| Finance | Separate receipt/invoice file concerns | Navigation/read composition only if defined | Mutating Invoice/Receipt lifecycle from Document UI |

---

# 17. Screen-Level Security Requirements

1. Every route is protected server-side.
2. Every data query is branch scoped before serialization.
3. Document IDs in URLs are treated as untrusted identifiers.
4. Owner search endpoints return only permitted results.
5. File access is authorized independently from metadata page rendering when capability rules require it.
6. Blob URL possession is not treated as authorization.
7. No storage secrets/tokens are rendered into HTML, client logs, or analytics payloads beyond an approved short-lived access mechanism.
8. Rejection remarks and audit old/new values are shown only to authorized audiences.
9. Soft-deleted documents are omitted from standard lists and direct detail routes according to policy.
10. Mutation forms use CSRF/session protections consistent with the repository's Next.js/auth conventions.
11. User-entered values are safely encoded when rendered.
12. File names are treated as display data, not trusted HTML.
13. Search and sort parameters are allowlisted and validated server-side.
14. UI analytics must not capture sensitive document metadata or file content without explicit approval.
15. Sensitive lifecycle action confirmations include the target document context but avoid excessive PII.

---

# 18. Responsive Behavior

## 18.1 Admin Desktop

- Primary operational tables optimized for desktop widths.
- Filter bars may use multi-row responsive grids.
- Verification Review may use two-column preview/context layout.

## 18.2 Tablet

- Filter panel collapses into drawer/sheet.
- Verification Review stacks preview above decision panel if horizontal space is insufficient.
- Action bar remains visible without covering content.

## 18.3 Mobile

For future Student/Trainer portals:

- Use cards instead of dense tables.
- Keep upload form single-column.
- File preview may open in dedicated route/full-screen viewer.
- Decision workflows are not expected for student/trainer self-service.

Admin verification decisions on small screens require careful review usability. The UI should not compress evidence preview and decision controls into an unsafe layout.

---

# 19. Confirmation, Notification, and Feedback Patterns

## 19.1 Success Feedback

- Upload: “Document uploaded successfully.”
- Metadata update: “Document details updated.”
- Submission: “Document submitted for verification.”
- Approval: “Document approved.”
- Rejection: “Document rejected and reason recorded.”
- Retirement: “Document retired.”

Messages must be localized through the application's i18n mechanism.

## 19.2 Destructive/Sensitive Confirmation

Require confirmation for:

- Approve.
- Reject.
- Retire.

Retire confirmation must state that the record is removed from normal operational views but not claim that the Blob file is permanently destroyed.

## 19.3 Idempotency and Duplicate Click Protection

- Disable the submitted mutation action while pending.
- Use server-side idempotency/concurrency strategy where repository conventions support it.
- A browser refresh after success must not duplicate a verification decision.

---

# 20. Known UI and Data-Model Gaps Carried Forward

## GAP-DOC-UI-001 - Document Branch Scope Derivation

The ER `Document` model does not define `branchId`, while DDD requires branch isolation. UI filters and queries must use owner-derived branch scope or an approved read model. No screen may assume an unapproved `Document.branchId` field.

## GAP-DOC-UI-002 - Document Type Representation

DDD conceptually includes configurable `DocumentType`, while the ER model represents `documentType` on Document and does not define a dedicated DocumentType entity in the Document section. UI option source must follow the actual approved Configuration/schema implementation.

## GAP-DOC-UI-003 - Blob Operational Metadata

The ER model defines `fileName` and `fileUrl` but does not define provider key, size, media type, checksum, upload state, or reconciliation state. The UI must not require such domain fields until schema/architecture approval. Operational reconciliation UI can only display approved infrastructure projection data.

## GAP-DOC-UI-004 - Expired as Persisted Status vs Derived Condition

The ER lists `Expired` as a status, while Part 1 identifies ambiguity around whether expiry is persisted or derived. UI must support presentation of expiry without making browser-side lifecycle mutations. Final component semantics should follow the approved implementation decision.

## GAP-DOC-UI-005 - Rejected Document Resubmission

The baseline does not define a complete `Rejected -> Uploaded/PendingVerification` resubmission policy. Therefore no resubmit button is mandated until a policy is approved. The UI may allow metadata correction only within approved update rules.

## GAP-DOC-UI-006 - Approved Evidence Replacement

Replacing file evidence after approval requires an explicit lifecycle policy. Edit Metadata must not silently replace an approved file and preserve approval.

## GAP-DOC-UI-007 - Student and Trainer Portal Activation

DDD v3 identifies Student and Trainer portals as future application structure. Their screen specifications in this document are ready as future-channel requirements but are not a commitment to implement those apps in the current single-admin-portal phase.

## GAP-DOC-UI-008 - Prisma Schema Validation

The Prisma schema was listed as an input but was not available in the supplied project files used for this part. Exact field names, enum names, relations, indexes, and versioning implementation must be validated against `packages/database/prisma/schema.prisma` before development.

---

# 21. Final DDD and ER Consistency Check

## 21.1 Alignment Summary

| Area | Alignment Result |
|---|---|
| Document ownership | Aligned: screens mutate only Document Management-owned lifecycle data |
| Person/Party reuse | Aligned: owner summaries are referenced/resolved, not duplicated |
| Supported owners | Aligned: Student, Trainer, Corporate, Person current; Employee deferred |
| Verification lifecycle | Aligned: Uploaded, PendingVerification, Approved, Rejected, Expired presentation supported |
| Verification history | Aligned: immutable decision timeline; no edit/delete UI |
| Soft delete | Aligned: Retire action, no hard-delete UI |
| Branch isolation | Aligned conceptually through server-side owner-derived scope; data-model gap retained |
| IAM | Aligned: dynamic capability permissions, no hardcoded roles |
| Vercel Blob | Aligned: storage infrastructure only; business metadata remains IMS-owned |
| Audit | Aligned: read composition/application integration, no browser-owned AuditLog writes |
| Communication | Aligned: delivery remains Communication-owned |
| Reporting | Aligned: reporting/read-only dependency, no state mutation |
| Certificate | Aligned: certificate operations excluded from generic Document UI |
| Finance | Aligned: invoice/receipt/refund lifecycle excluded |
| Completion | Aligned: no completion approval logic in Document screens |
| Portal phase | Aligned: Admin current, Student/Trainer future/conditional |

## 21.2 Part 1 Consistency

This screen specification preserves:

- `FR-DOC-001` through `FR-DOC-035` boundaries.
- Business rules `BR-DOC-001` through `BR-DOC-060` relevant to UI and application-service interaction.
- No hard delete.
- No unsupported owner types.
- No trusted client `uploadedBy`.
- No client-authoritative lifecycle transition.
- No branch-scope bypass.
- No direct provider dependency in domain logic.

## 21.3 Part 2 Consistency

The screens map to the Part 2 use cases as follows:

- Upload: UC-DOC-001.
- Registry/search: UC-DOC-002.
- Detail/file/history: UC-DOC-003.
- Submit for verification: UC-DOC-004.
- Approve: UC-DOC-005.
- Reject: UC-DOC-006.
- Expiry: UC-DOC-007.
- Metadata correction: UC-DOC-008.
- Retirement: UC-DOC-009.
- Reconciliation operations: UC-DOC-010.

No screen introduces a lifecycle transition beyond the Part 2 state machine.

---

# 22. Part 3 Conclusion

The Document Management UI is organized around controlled document registration, secure retrieval, verification work, expiry visibility, metadata maintenance, and auditability. The Admin Portal is the current transactional channel. Student and Trainer portal screens are specified as future/conditional self-service channels and reuse the same Document Management application services without changing domain ownership.

The UI remains deliberately thin in business-rule authority: owner existence, branch scope, permissions, state transitions, expiry evaluation policy, concurrency, and Blob/database consistency are enforced by application/domain services. This preserves clean architecture and DDD boundaries while providing a complete operational interface for Module 13.
