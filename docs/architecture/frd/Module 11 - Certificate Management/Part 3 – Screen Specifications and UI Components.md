# Part 3 – Screen Specifications and UI Components

## Module 11 – Certificate Management

## 1. Purpose and UI Architecture Principles

This document specifies the user-interface requirements for Certificate Management across the ASTI Admin Portal, Student Portal, Trainer Portal, and public certificate-verification experience where applicable. It extends the requirements and behavior defined in:

- `Module 11 - Certificate Management.md`
- `Part 1 – Business Overview, Functional Requirements, Business Rules.md`
- `Part 2 – User Stories, Use Cases, Workflows, State Machines.md`

The UI is a presentation and interaction layer over application services. It must not become the authority for completion eligibility, payment truth, enrollment ownership, branch scope, certificate lifecycle transitions, or approval decisions.

The governing rule is:

```text
UI
  submits intent and displays authoritative projections
        ↓
Certificate Management application services
  enforce Certificate aggregate rules and lifecycle transitions
        ↓
Upstream context contracts/read models
  Completion owns eligibility
  Finance owns payment truth
  Enrollment owns learner-course-batch journey
        ↓
Certificate Management
  owns generation, issue, verification, reissue, replacement lineage, and revocation
```

### 1.1 Mandatory UI Principles

1. All branch scope is derived and enforced server-side; branch selectors only narrow the effective scope and never expand it.
2. Permission-based hiding is a usability measure only. Every command and query must still be authorized server-side.
3. The browser must never independently calculate completion eligibility from marks, attendance, or approval data.
4. The browser must never independently calculate whether payment is complete from invoice totals, receipts, or balances.
5. The browser must never construct certificate numbers or verification codes.
6. Certificate status changes occur only through explicit application commands such as Generate, Issue, Approve Reissue, Reject Reissue, Generate Replacement, and Revoke.
7. UI previews are non-authoritative. Command-time validation must re-read authoritative source state before lifecycle mutation.
8. No hard-delete action is exposed for Certificate, CertificateVerification, or CertificateReissueRequest records.
9. Bilingual rendering must support English LTR and Arabic RTL without changing identifiers, numbers, codes, dates, or domain behavior.
10. Current scope uses the approved single hardcoded certificate template. The UI must not expose a certificate-template builder or template-selection workflow.

---

# 2. Portal Applicability and Screen Inventory

## 2.1 Portal Applicability Summary

| Surface | Applicability | Purpose |
|---|---:|---|
| Admin Portal | Required | Operational generation, issuance, registry access, reissue processing, revocation, and lifecycle visibility |
| Student Portal | Applicable when Student Portal is delivered | Learner access to own issued certificates, download, verification link, and reissue submission/status |
| Trainer Portal | Applicable when Trainer Portal is delivered | Read-only completion-to-certificate visibility and trainer recommendation handoff; no certificate issuance authority |
| Public Verification | Required independently of authentication | Verify certificate authenticity/status using verification code or QR link |

The current DDD application structure identifies the Admin Portal as the initial application and Student/Trainer portals as future application surfaces. Therefore, Admin and Public Verification screens are implementation-critical for the current module, while Student and Trainer screens are contract-ready specifications that must reuse the same application services and ownership boundaries when those portals are introduced.

## 2.2 Complete Screen Inventory

### 2.2.1 Admin Portal Screens

| Screen ID | Screen Name | Primary Purpose | Primary Use Case / Service |
|---|---|---|---|
| SCR-CERT-A01 | Certificate Management Dashboard | Operational summary and work queues | CertificateDashboardQuery / reporting projections |
| SCR-CERT-A02 | Certificate-Ready Enrollments | Review candidates and blockers | UC-CERT-001 / ListCertificateReadyEnrollmentsQuery |
| SCR-CERT-A03 | Certificate Readiness Detail | Inspect source context and gates | UC-CERT-001 / GetCertificateReadinessQuery |
| SCR-CERT-A04 | Generate Certificate | Submit language and generation intent | UC-CERT-002 / GenerateCertificateCommand |
| SCR-CERT-A05 | Certificate Generation Result | Confirm generated record/artifact and next action | GetCertificateDetailQuery |
| SCR-CERT-A06 | Certificate Registry | Search and operate on certificates | CertificateRegistryQuery |
| SCR-CERT-A07 | Certificate Detail | View certificate lifecycle, artifact, lineage, and audit summary | GetCertificateDetailQuery |
| SCR-CERT-A08 | Certificate Preview / Download Viewer | Preview artifact and request authorized download | GetCertificateArtifactQuery |
| SCR-CERT-A09 | Issue Certificate Confirmation | Confirm controlled issue command | UC-CERT-003 / IssueCertificateCommand |
| SCR-CERT-A10 | Reissue Request Queue | Review branch-scoped reissue requests | ListReissueRequestsQuery |
| SCR-CERT-A11 | Reissue Request Detail | Decide reissue request | UC-CERT-006 / ApproveReissueRequestCommand / RejectReissueRequestCommand |
| SCR-CERT-A12 | Generate Replacement Certificate | Generate from approved reissue | UC-CERT-007 / GenerateReplacementCertificateCommand |
| SCR-CERT-A13 | Revoke Certificate | Capture reason and submit revocation | UC-CERT-008 / RevokeCertificateCommand |
| SCR-CERT-A14 | Verification Activity | View verification history and status outcomes | ListCertificateVerificationActivityQuery |
| SCR-CERT-A15 | Certificate Lifecycle / Audit View | Read lifecycle transitions and audit references | CertificateLifecycleQuery + Audit read projection |

### 2.2.2 Student Portal Screens

| Screen ID | Screen Name | Primary Purpose | Application Service / Use Case |
|---|---|---|---|
| SCR-CERT-S01 | My Certificates | List certificates belonging to authenticated learner | ListMyCertificatesQuery |
| SCR-CERT-S02 | My Certificate Detail | View/download own certificate and verification link | GetMyCertificateDetailQuery |
| SCR-CERT-S03 | Request Certificate Reissue | Submit reason for own eligible certificate | UC-CERT-005 / SubmitReissueRequestCommand |
| SCR-CERT-S04 | My Reissue Requests | View own request status and replacement result | ListMyReissueRequestsQuery |

### 2.2.3 Trainer Portal Screens

| Screen ID | Screen Name | Primary Purpose | Application Service / Use Case |
|---|---|---|---|
| SCR-CERT-T01 | Completion-to-Certificate Status | Show certificate outcome for enrollments the trainer is authorized to view | TrainerCertificateStatusQuery |
| SCR-CERT-T02 | Completion Recommendation Handoff | Submit recommendation in Completion context and view downstream status | Completion-context application service, not Certificate command |

### 2.2.4 Public Screen

| Screen ID | Screen Name | Primary Purpose | Application Service / Use Case |
|---|---|---|---|
| SCR-CERT-P01 | Public Certificate Verification | Verify by opaque verification code or QR URL | UC-CERT-004 / VerifyCertificateQuery |

---

# 3. Shared UI Components

The following components shall be reusable across Certificate Management screens. Components are presentation constructs and must not own domain rules.

| Component ID | Component | Purpose | Behavior |
|---|---|---|---|
| CMP-CERT-001 | `CertificateStatusBadge` | Render certificate lifecycle status | Uses server-returned status; no status derivation in UI |
| CMP-CERT-002 | `ReadinessGatePanel` | Display completion and payment gate outcomes | Shows authoritative gate result and blocker text; no calculation |
| CMP-CERT-003 | `CertificateIdentityCard` | Show certificate number, learner, course, batch, branch | Read-only projection |
| CMP-CERT-004 | `LanguageBadge` | Show EN/AR certificate language | Localized label; stable enum value |
| CMP-CERT-005 | `ArtifactPreviewFrame` | Preview generated certificate artifact | Access controlled; fallback when preview unsupported |
| CMP-CERT-006 | `QrVerificationBlock` | Display QR code and verification link | Displays server-generated QR/URL; does not create verification code |
| CMP-CERT-007 | `ReissueLineagePanel` | Show original and replacement linkage | Based on `certificateId` and `newCertificateId` projections |
| CMP-CERT-008 | `AuditTimeline` | Show lifecycle audit events | Read-only Audit projection |
| CMP-CERT-009 | `BranchScopeFilter` | Narrow results within effective branches | Options come from effective access; cannot broaden server scope |
| CMP-CERT-010 | `PermissionGuardedAction` | Hide/disable actions based on effective UI capability set | UI convenience only; server remains authoritative |
| CMP-CERT-011 | `ReasonInput` | Capture reissue/revocation/decision reason | Required where business rule demands; length and whitespace validation |
| CMP-CERT-012 | `AsyncCommandDialog` | Confirm sensitive commands | Displays impact, command progress, success, stale-state and concurrency errors |
| CMP-CERT-013 | `PaginatedDataTable` | Registry/work queue tables | Server-side pagination, sorting and filtering |
| CMP-CERT-014 | `VerificationResultCard` | Show public result with minimal disclosure | Valid, revoked, replaced, or not-found-safe outcome |
| CMP-CERT-015 | `SourceContextSummary` | Show Enrollment/Student/Course/Batch source references | Read-only authoritative projection |

---

# 4. Admin Portal Screen Specifications

## 4.1 SCR-CERT-A01 – Certificate Management Dashboard

### Purpose

Provide certificate operations staff with a branch-scoped operational overview and direct navigation to work queues. This screen consumes Certificate-owned queries and reporting projections. It must not become a new transaction owner or recompute KPIs from raw cross-context tables in the browser.

### Layout

```text
Page Header
├── Title: Certificate Management
├── Effective Branch Scope indicator
├── Date Range filter
└── Refresh action

Metric Row
├── Ready for Generation
├── Generated Awaiting Issue
├── Issued in Period
├── Pending Reissue Requests
└── Revoked in Period

Operational Work Queues
├── Recently Ready Enrollments
├── Generated Awaiting Issue
├── Pending Reissue Requests
└── Recent Lifecycle Exceptions

Quick Navigation
├── Certificate-Ready Enrollments
├── Certificate Registry
├── Reissue Queue
└── Verification Activity
```

### Interactive Elements

- Branch filter constrained to effective branch scope.
- Date-range picker with explicit `from` and `to` values.
- Metric cards clickable only when the user has permission to access the destination screen.
- Refresh button reissues queries; it must not trigger domain commands.
- Work-queue row links navigate to readiness, certificate, or reissue detail.

### Input Validation

- `fromDate <= toDate`.
- Date range must comply with configured reporting-query maximum range.
- Selected branch must exist in server-returned effective scope.
- Invalid query-string filters are ignored or rejected consistently by the query contract; they never expand access.

### Dynamic UI States

- **Loading:** metric card skeletons and 5-row table skeletons.
- **Empty:** “No certificate activity is available for the selected scope and period.”
- **Partial error:** each widget can show an isolated retry state without hiding other successful widgets.
- **Permission hiding:** cards and links for registry, reissue, or verification activity are hidden when corresponding read permissions are absent.
- **Stale indicator:** show “Updated at <timestamp>” for cached dashboard projections.

### DDD Fit Check

- Maps to reporting/read services only.
- Does not generate, issue, revoke, or approve.
- Completion and payment readiness counts must come from a server-side composition/read model, not browser-side rule evaluation.

---

## 4.2 SCR-CERT-A02 – Certificate-Ready Enrollments

### Purpose

List enrollments that may proceed to certificate generation or show explicit blockers. Maps to FR-CERT-001 to FR-CERT-005 and UC-CERT-001.

### Layout

```text
Header
├── Title
├── Scope Indicator
└── Help text: readiness is authoritative at query time and revalidated on command

Filter Bar
├── Branch
├── Course
├── Batch
├── Completion Approval Date Range
├── Learner / Enrollment Search
├── Readiness Status
└── Clear Filters

Server-Side Paginated Table
└── Row Action: Review Readiness
```

### Table Columns

1. Enrollment Number
2. Learner Name
3. Course
4. Batch
5. Branch
6. Completion Approval Status
7. Payment Gate Status
8. Existing Certificate State
9. Readiness Status
10. Last Evaluated At
11. Actions

### Table Behaviors

- Server-side pagination; default page size 25.
- Allowed page sizes: 25, 50, 100.
- Deterministic default sort: completion approval timestamp descending, then enrollment number ascending.
- Sortable: Enrollment Number, Learner Name, Course, Batch, Completion Approval Date, Readiness Status.
- Filters persist in URL query state for shareable internal navigation, excluding sensitive data.
- Search uses debounced submission but server query remains authoritative.
- Row selection is not required because generation is per enrollment and must be command-validated individually unless a future batch-generation requirement is explicitly approved.

### Interactive Elements

- `Review Readiness` row action.
- `Generate` shortcut only when query result says ready **and** user has `certificate.generate`; command submission still revalidates.
- Blocker tooltip or drawer for non-ready items.

### Validation and Error States

- Search term trimmed; blank term becomes no search filter.
- Invalid date range produces inline date error and prevents query submission.
- Unknown course/batch filter values are rejected by server contract.
- A `403` does not render an empty list; show access denied.

### Empty States

- No filters: “No enrollments are currently ready for certificate processing.”
- With filters: “No enrollments match the selected filters.” with `Clear filters` action.

### DDD Fit Check

- Query reads Enrollment, Completion, Finance gate outcomes, and Certificate existence through application contracts/read models.
- UI must not infer eligibility from attendance percentage or exam marks.
- UI must not infer payment completion from displayed balances.

---

## 4.3 SCR-CERT-A03 – Certificate Readiness Detail

### Purpose

Display the authoritative source context and current gates before generation.

### Layout

```text
Breadcrumbs
Certificate Identity Context
├── Enrollment
├── Learner
├── Course
├── Batch
└── Branch

Readiness Gates
├── Enrollment Integrity
├── Completion Approval
├── Payment Validation Requirement
├── Payment Validation Outcome
├── Existing Active Certificate Check
└── Numbering Configuration Availability

Source References
├── Completion reference/status
├── Payment gate result summary
└── Existing certificate reference, if any

Actions
├── Back
└── Generate Certificate
```

### Interactive Elements

- Refresh readiness query.
- Navigate to existing certificate when duplicate active certificate is present and user has read permission.
- Generate action opens SCR-CERT-A04.

### UI Rules

- Display authoritative gate outcomes as `Satisfied`, `Blocked`, or `Unavailable`.
- Do not display a green “ready” state if any mandatory gate is unavailable.
- Finance details are limited to gate outcome and safe explanatory text; this screen does not expose invoice transaction details unless separately authorized through Finance UI.
- Completion details are summarized as approved/not approved/pending/unavailable; the Certificate screen does not provide controls to edit completion.

### Dynamic States

- Full-page skeleton for first load.
- Gate-level retry for transient upstream read failure.
- Stale-state warning if server response includes an evaluation timestamp older than the configured freshness threshold.
- Permission-based hiding of Generate action.

### DDD Fit Check

Maps to `GetCertificateReadinessQuery`. It is a composition/read use case. No cross-context mutation is permitted.

---

## 4.4 SCR-CERT-A04 – Generate Certificate

### Purpose

Capture only the user choices legitimately owned by the generation use case and submit a generation command.

### Layout

```text
Header: Generate Certificate
Read-Only Source Summary
├── Learner
├── Enrollment Number
├── Course
├── Batch
└── Branch

Readiness Summary
├── Completion Gate
├── Payment Gate
└── Existing Certificate Check

Generation Form
└── Certificate Language: English / Arabic

Preview Note
└── Approved current template will be used

Actions
├── Cancel
└── Generate Certificate
```

### Inputs

| Field | Required | Validation |
|---|---:|---|
| `language` | Yes | Must be a server-supported certificate language enum; current UI supports English and Arabic |
| `enrollmentId` | Yes, route/context | Must be valid, branch-authorized, and command-time eligible |
| Concurrency/idempotency token | System | Generated by client/app framework and validated server-side according to command contract |

### Processing UI

1. User selects language.
2. UI displays source summary and non-authoritative readiness summary.
3. User selects Generate.
4. Submit button becomes busy and duplicate clicks are blocked at UI level.
5. Server revalidates eligibility, payment gate, duplicate certificate condition, source integrity, numbering, and permissions.
6. On success navigate to SCR-CERT-A05 or SCR-CERT-A07.

### Error Handling

- `ELIGIBILITY_CHANGED`: show “Completion eligibility is no longer approved. Refresh readiness.”
- `PAYMENT_GATE_FAILED`: show authoritative blocker message without exposing unauthorized Finance data.
- `DUPLICATE_ACTIVE_CERTIFICATE`: provide link to existing certificate when readable.
- `NUMBERING_SERIES_UNAVAILABLE`: display configuration failure and no retry loop that invents local numbering.
- `CONCURRENCY_CONFLICT`: require refresh before retry.
- `SOURCE_REFERENCE_INCONSISTENT`: block generation and show support-safe correlation ID.

### DDD Fit Check

The screen sends `GenerateCertificateCommand`. It never creates certificate number, QR code, verification code, or artifact locally.

---

## 4.5 SCR-CERT-A05 – Certificate Generation Result

### Purpose

Confirm successful generation and guide the next authorized action.

### Layout

- Success banner.
- Certificate Identity Card.
- Generated artifact preview.
- Verification QR preview.
- Lifecycle status.
- Actions: `View Detail`, `Download` if permitted, `Issue Certificate` if permitted and state allows.

### Dynamic States

- Artifact processing state: show `Artifact is being finalized` only when the application contract supports a processing state; do not invent client-side status.
- Artifact unavailable: show safe error and retry query, not regenerate command.
- Issue action hidden when user lacks `certificate.issue`.

### DDD Fit Check

Read-only after generation except navigation to explicit Issue command flow.

---

## 4.6 SCR-CERT-A06 – Certificate Registry

### Purpose

Provide the authoritative operational search surface for branch-scoped Certificate records. Maps to FR-CERT-014 and US-CERT-004.

### Filters

- Branch
- Course
- Batch
- Certificate Status
- Certificate Language
- Issue Date From / To
- Certificate Number exact/prefix search
- Learner name or student number
- Enrollment number

### Table Columns

1. Certificate Number
2. Learner
3. Course
4. Batch
5. Branch
6. Language
7. Certificate Status
8. Issued Date
9. Issued By display name
10. Replacement/Reissue Indicator
11. Actions

### Table Behaviors

- Server-side filtering, sorting, and pagination.
- Default sort: `issuedDate DESC NULLS LAST`, then `certificateNumber ASC`.
- Status values shown exactly from server vocabulary with localized display labels.
- A null issue date displays `Not issued` only when compatible with actual lifecycle status.
- Column visibility may be saved as user preference, but permission-controlled data cannot be made visible by preference.
- No inline status editing.
- No bulk delete.
- No inline editing of certificate number, verification code, issue date, or issuer.

### Row Actions

Depending on server-returned effective capabilities and current state:

- View Detail
- Preview
- Download
- Issue
- Request/Review Reissue navigation
- Revoke
- View Verification Activity
- View Lifecycle/Audit

### Empty and Error States

- Empty registry: “No certificates exist in your effective branch scope.”
- Filtered empty: “No certificates match the selected filters.”
- Access denied: explicit access-denied page; never masquerade as no data.

### DDD Fit Check

Registry actions are command links only. The table does not implement state transitions through editable cells.

---

## 4.7 SCR-CERT-A07 – Certificate Detail

### Purpose

Provide a single authoritative view of Certificate aggregate lifecycle data and safe related projections.

### Layout

```text
Header
├── Certificate Number
├── Status Badge
├── Language
└── Authorized Actions

Summary Tab
├── Learner
├── Enrollment
├── Course
├── Batch
├── Branch
├── Issued Date
└── Issued By

Artifact Tab
├── Preview
├── Download
└── QR verification block

Lifecycle Tab
├── Generated / Issued / Replaced / Revoked timeline
└── State-transition facts

Reissue Tab
├── Requests
└── Original/Replacement lineage

Verification Activity Tab
└── Branch-safe certificate verification history

Audit Tab
└── Audit read projection, permission controlled
```

### Interaction Rules

- Tabs lazy-load queries where appropriate.
- `Issue` opens SCR-CERT-A09.
- `Revoke` opens SCR-CERT-A13.
- Reissue actions navigate to queue/detail or replacement generation.
- QR link copies the public verification URL, not the raw internal certificate ID.
- Verification code should not be made editable.

### Permission Hiding

- Download hidden without `certificate.download`.
- Issue hidden without `certificate.issue`.
- Revoke hidden without `certificate.revoke`.
- Audit tab hidden without audit-read permission.
- Verification activity hidden without internal verification-read permission.

### DDD Fit Check

The page can compose read models but must not directly update Enrollment, Completion, Finance, Audit, or Communication data.

---

## 4.8 SCR-CERT-A08 – Certificate Preview / Download Viewer

### Purpose

Securely preview and download a certificate artifact.

### Layout

- Minimal viewer header with certificate number and status.
- Embedded artifact preview where browser support permits.
- Download action.
- Close/back action.
- Optional verification QR side panel.

### Security and Interaction Requirements

- Artifact access must be authorized server-side on every request.
- Direct storage URLs must not be assumed public.
- UI must handle expired signed URLs by requesting a new authorized access reference rather than exposing storage internals.
- Browser caching behavior must follow artifact sensitivity policy.
- Revoked certificate preview may display a prominent revoked status banner; original artifact history is preserved.

### DDD Fit Check

Read-only artifact delivery. Download does not change lifecycle status.

---

## 4.9 SCR-CERT-A09 – Issue Certificate Confirmation

### Purpose

Confirm the sensitive Generated → Issued transition.

### Layout

```text
Confirmation Dialog/Page
├── Certificate Number
├── Learner
├── Course
├── Batch
├── Language
├── Current Status
├── Completion Gate Summary
├── Payment Gate Summary
└── Impact Notice

Actions
├── Cancel
└── Issue Certificate
```

### Rules

- No editable issue date or issuer in normal flow; server records current authoritative date/time and authenticated user according to application rules.
- UI must not permit issue from an invalid state.
- Server still revalidates state, permission, branch, source references, completion gate, and payment gate.
- On success show issued timestamp and issuer returned by server.

### Error States

- Already issued retry: show current issued state and treat deterministic duplicate outcome safely.
- Gate changed: block and offer Refresh.
- Concurrency conflict: reload certificate detail.
- Notification failure must not falsely roll back a successful issue transition if notification is a separate side effect; show domain success plus communication-side-effect status according to application contract.

### DDD Fit Check

Maps only to `IssueCertificateCommand`. Communication request is an application-side cross-context effect, not a UI call chain.

---

## 4.10 SCR-CERT-A10 – Reissue Request Queue

### Purpose

Review branch-scoped CertificateReissueRequest work items.

### Filters

- Branch
- Request Status
- Request Date Range
- Certificate Number
- Learner
- Course
- Requested By

### Table Columns

1. Request Reference
2. Certificate Number
3. Learner
4. Course
5. Branch
6. Reason Summary
7. Requested By
8. Requested At, from projection/audit where available
9. Status
10. Approved By
11. Approved At
12. Actions

### Table Behaviors

- Server pagination and sorting.
- Default pending-first ordering, then oldest actionable request first.
- Reason text truncated in table with accessible detail tooltip/drawer.
- Decision actions are not inline one-click buttons; open detail to prevent accidental approval/rejection.
- Exact availability of request timestamp must follow source model/read projection; the ER `CertificateReissueRequest` itself does not define a dedicated request timestamp.

### DDD Fit Check

Queue owns no approval history. Decision commands update Certificate reissue transaction state while Audit & Compliance owns approval history records.

---

## 4.11 SCR-CERT-A11 – Reissue Request Detail

### Purpose

Allow an authorized reviewer to assess and decide a reissue request.

### Layout

```text
Request Summary
├── Status
├── Requester
├── Reason
└── Requested certificate reference

Original Certificate Summary
├── Certificate Number
├── Learner
├── Course
├── Batch
├── Branch
├── Status
└── Artifact/verification link as authorized

Decision History
└── Audit/approval projection

Decision Panel
├── Approval Remarks / Rejection Remarks
├── Approve
└── Reject
```

### Input Validation

- Decision remarks:
  - rejection reason is required;
  - approval remarks are optional unless policy/configuration requires them;
  - trim leading/trailing whitespace;
  - reject whitespace-only value;
  - enforce configured maximum length;
  - display remaining-character count when near limit.
- Decision cannot be submitted if request is no longer Pending/Reviewable.

### Dynamic States

- Pending: decision panel visible for authorized reviewer.
- Approved: decision panel replaced with status and Generate Replacement action for authorized generator.
- Rejected: show rejection outcome; no replacement action.
- Completed: show `newCertificateId` lineage link.
- Concurrent decision conflict: reload and show “This request was already decided by another user.”

### DDD Fit Check

The screen decides only the Certificate reissue transaction through application commands. It does not write Audit tables directly.

---

## 4.12 SCR-CERT-A12 – Generate Replacement Certificate

### Purpose

Generate a replacement certificate from an approved reissue request while preserving original/replacement lineage.

### Layout

- Approved Reissue Request summary.
- Original Certificate summary.
- Replacement language selection, defaulting to original certificate language unless the approved use case permits a different supported language.
- Readiness/current validity summary where command contract requires revalidation.
- Generate Replacement action.

### Validation

- Request must be Approved and not already completed.
- Original certificate must be branch-authorized.
- Language must be supported.
- Duplicate command retry must not create multiple replacement certificates.
- Server sets `newCertificateId` linkage; UI cannot submit arbitrary new certificate ID.

### Post-Success UI

Show:

- original certificate number;
- replacement certificate number;
- request status;
- lineage link;
- available issue action if replacement generation and issuance are separate lifecycle transitions.

### DDD Fit Check

Maps to `GenerateReplacementCertificateCommand`. Replacement lineage remains Certificate-owned.

---

## 4.13 SCR-CERT-A13 – Revoke Certificate

### Purpose

Capture revocation intent and required reason for an authorized certificate.

### Layout

```text
Danger Action Page/Dialog
├── Certificate Identity
├── Current Status
├── Learner / Course / Batch
├── Revocation impact warning
├── Required reason field
└── Confirmation acknowledgement

Actions
├── Cancel
└── Revoke Certificate
```

### Input Validation

- Reason required.
- Reason trimmed and must contain non-whitespace content.
- Enforce maximum length from API contract.
- Confirmation acknowledgement required in UI.
- Certificate must be in a revocable state according to server state-transition rules.

### Dynamic States

- Permission absent: action hidden; direct route returns access denied.
- Already revoked: show current status; no second revoke command.
- Replaced/non-revocable: show why transition is not allowed.
- Concurrency conflict: force refresh.

### DDD Fit Check

Maps to `RevokeCertificateCommand`. Current ER lacks dedicated revocation metadata fields; the UI must not invent persistence fields. Reason and actor/timestamp must be preserved through the audit convention until the source model is extended.

---

## 4.14 SCR-CERT-A14 – Verification Activity

### Purpose

Provide authorized internal visibility into `CertificateVerification` history.

### Filters

- Certificate Number
- Verification Status
- Verified Date Range
- Branch, derived by joining certificate ownership projection

### Table Columns

1. Certificate Number
2. Certificate Status at current read time
3. Verification Status
4. Verified At
5. Source IP display according to security/privacy policy
6. Verification Code masked representation if internal policy permits display

### Behaviors

- IP addresses are sensitive operational data and require permission-controlled display.
- No edit or delete action.
- Public verification activity is not used to change certificate status.
- Server-side pagination and date filtering.

### DDD Fit Check

Reads Certificate-owned `CertificateVerification` records. Audit and security monitoring may consume facts but do not transfer ownership.

---

## 4.15 SCR-CERT-A15 – Certificate Lifecycle / Audit View

### Purpose

Display certificate lifecycle transitions and related audit facts for authorized operational or compliance users.

### Layout

- Certificate summary.
- Chronological lifecycle timeline.
- Transition entries: action, old state, new state, actor, timestamp, reason where applicable.
- Reissue lineage entries.
- Links to reissue request detail and replacement certificate.

### Rules

- Read-only.
- Audit data comes from Audit & Compliance read contract/projection.
- Certificate UI must not manufacture missing historical events by comparing current row fields in the browser.
- Sensitive old/new payload detail must respect audit permissions and data-minimization rules.

### DDD Fit Check

This screen composes Certificate facts with Audit-owned history. Certificate module does not own AuditLog mutation.

---

# 5. Student Portal Screen Specifications

## 5.1 SCR-CERT-S01 – My Certificates

### Purpose

Allow the authenticated learner to see only certificates linked to their own StudentProfile/Person identity through authoritative identity mapping.

### Layout

- Page title: My Certificates.
- Status filters: Issued, Replaced, Revoked where policy allows showing historical records.
- Course search.
- Certificate cards on narrow screens; table/list on wide screens.

### Certificate Card/List Fields

- Certificate Number
- Course Name
- Batch reference
- Issued Date
- Language
- Status
- Actions: View, Download, Verify, Request Reissue where allowed

### Security Rules

- Student identity ownership is resolved server-side.
- No `studentProfileId` supplied by the browser may expand access.
- Branch filters are unnecessary for self-service and must not expose other learners.
- Revoked/replaced historical certificates remain visible when policy requires traceability but must show a prominent state label.

### Empty State

“You do not have any issued certificates yet.”

### DDD Fit Check

Maps to `ListMyCertificatesQuery`; does not infer completion or payment state.

---

## 5.2 SCR-CERT-S02 – My Certificate Detail

### Purpose

Allow learner access to own certificate details and authorized artifact.

### Layout

- Certificate status and number.
- Course and batch information.
- Issued date.
- Language.
- Artifact preview/download.
- Public verification link/QR.
- Replacement lineage banner when applicable.
- Reissue action when lifecycle permits.

### Dynamic States

- Issued: download and verify available.
- Revoked: strong revoked warning; verification remains possible and reports revoked status.
- Replaced: show replacement relationship if learner is authorized to view replacement.
- Artifact unavailable: safe retry/support guidance.

### DDD Fit Check

Read-only Certificate query plus explicit navigation to reissue submission.

---

## 5.3 SCR-CERT-S03 – Request Certificate Reissue

### Purpose

Submit a reissue request for a certificate owned by the authenticated learner.

### Layout

- Read-only certificate identity.
- Current status.
- Explanation of reissue process.
- Required reason textarea.
- Submit action.

### Validation

- Certificate ownership verified server-side.
- Reason required, trimmed, non-empty, and within API maximum length.
- Prevent UI duplicate click; server enforces duplicate/open-request invariant if defined by business rule.
- Certificate lifecycle must permit a reissue request.

### Success State

- Show request status and reference.
- Link to My Reissue Requests.

### DDD Fit Check

Maps to `SubmitReissueRequestCommand`; no direct certificate generation follows learner submission.

---

## 5.4 SCR-CERT-S04 – My Reissue Requests

### Purpose

Allow learners to track their own reissue requests.

### Layout

List/table fields:

- Certificate Number
- Course
- Reason summary
- Request Status
- Decision outcome summary
- Replacement Certificate link when completed

### Rules

- Only authenticated learner-owned requests are returned.
- Approval actor/internal remarks may be minimized according to privacy policy.
- No student-side approve/reject/cancel action unless a later requirement explicitly defines cancellation.

### DDD Fit Check

Read-only CertificateReissueRequest projection.

---

# 6. Trainer Portal Screen Specifications

## 6.1 SCR-CERT-T01 – Completion-to-Certificate Status

### Purpose

Allow trainers to see downstream certificate status for enrollments in batches/sessions they are authorized to access, without giving certificate issuance authority.

### Layout

Filters:

- Batch
- Course
- Learner search
- Completion status summary
- Certificate status

Table:

1. Enrollment Number
2. Learner
3. Completion Recommendation Status
4. Completion Approval Status
5. Certificate Readiness Summary
6. Certificate Status
7. Issued Date
8. View action when permitted

### Rules

- Trainer scope is resolved from TrainerProfile and training assignment authorization.
- Trainer may not generate, issue, revoke, or approve a reissue from this screen.
- Completion and certificate statuses are server-returned facts.
- Payment details are not exposed; at most a safe gate outcome such as `Payment validation pending` may be displayed when permitted.

### DDD Fit Check

Read-only cross-context projection. Certificate context does not own trainer assignment; Trainer/Training Delivery contexts define trainer scope.

---

## 6.2 SCR-CERT-T02 – Completion Recommendation Handoff

### Purpose

Provide navigation or embedded handoff for the trainer recommendation step of the Completion Approval workflow while keeping ownership in Exam, Result & Completion Management.

### Layout

- Enrollment/course/batch summary.
- Completion evidence summary returned by Completion context.
- Recommendation action owned by Completion context.
- Downstream certificate status read-only panel.

### Critical Boundary Rule

The `Recommend Completion` button must call the Completion-context application service. Certificate Management must not expose a `recommend completion` command. The downstream Certificate status is displayed only after Completion context updates its authoritative state and Certificate readiness queries reflect that outcome.

### DDD Fit Check

This screen is a cross-module composition/handoff, not a Certificate-owned transaction screen.

---

# 7. Public Verification Screen Specification

## 7.1 SCR-CERT-P01 – Public Certificate Verification

### Purpose

Allow an unauthenticated verifier to validate a certificate using an opaque verification code supplied directly or through a QR verification URL.

### URL and Input Model

Two supported entry modes:

1. `verificationCode` submitted through the verification form.
2. Opaque verification reference embedded in the QR URL and resolved by the server.

The public URL must not require exposing an internal sequential certificate database ID.

### Layout

```text
ASTI Verification Header
Verification Form
├── Verification Code input
└── Verify button

Result Region
├── Result Status
├── Minimal Certificate Facts
├── Certificate Number
├── Learner Display Name according to approved privacy policy
├── Course Name
├── Issue Date
└── Certificate lifecycle outcome

Privacy / Authenticity Notice
```

### Input Validation

- Verification code required.
- Trim surrounding whitespace.
- Reject empty/whitespace-only submissions.
- Enforce server contract maximum length.
- Client validation must not reveal whether a code format maps to internal generation algorithms.
- Rate limiting, abuse controls, and bot defenses are enforced server-side/infrastructure-side; UI presents generic retry messages.

### Verification Result States

| Result | UI Presentation | Disclosure Rule |
|---|---|---|
| Valid / Issued | Positive authenticity result | Minimal approved certificate facts only |
| Revoked | Clear revoked result | Do not present as valid; show minimal identity facts as policy permits |
| Replaced | Show that certificate was replaced | Do not expose replacement internals unless public policy permits verification of replacement reference |
| Not Found / Invalid | Generic unable-to-verify result | Avoid account, learner, or enrollment enumeration |
| Temporarily Unavailable | Neutral service-unavailable message | Do not misclassify as invalid |

### Loading and Error States

- Verify button busy state and result skeleton.
- Network/service error: “Verification is temporarily unavailable. Please try again.”
- Validation error: inline required-field error.
- Result area announced with accessible live region for screen readers.

### Bilingual Behavior

- Language toggle can switch UI labels between English and Arabic.
- Certificate facts use localized values from authoritative projections where available.
- Code, certificate number, and QR reference remain directionally isolated using LTR formatting inside RTL layout.

### DDD Fit Check

Maps to `VerifyCertificateQuery` and CertificateVerification recording behavior. Public UI does not change Certificate status.

---

# 8. Dynamic UI State Standards

## 8.1 Validation Errors

### Field-Level Errors

- Display directly below the relevant field.
- Use localized, action-oriented text.
- Preserve valid user inputs after server validation failure.
- Move focus to the first invalid field on submit.
- Associate error text with field through accessible ARIA attributes.

### Form-Level Errors

Use a form summary for:

- stale authoritative state;
- lifecycle transition no longer valid;
- concurrency conflict;
- upstream dependency unavailable;
- duplicate command conflict;
- source-reference inconsistency.

Do not expose stack traces, database identifiers, storage credentials, or internal exception text.

### Recommended Error Mapping

| Error Category | UI Behavior |
|---|---|
| Validation | Inline field error; no command submitted or server returns safe validation problem |
| Unauthorized unauthenticated | Redirect to sign-in where appropriate |
| Forbidden | Access-denied view; do not convert to empty state |
| Not found within authorized scope | Safe not-found view; avoid leaking existence outside scope |
| Conflict / stale state | Show refresh-required banner |
| Concurrency conflict | Reload current resource before retry |
| Dependency unavailable | Preserve form state and allow safe retry where idempotent |
| Duplicate deterministic command | Navigate/display existing result when contract permits |

## 8.2 Loading Skeletons

- List screens: header/filter skeleton plus 5–10 table rows.
- Detail screens: identity-card skeleton plus section block skeletons.
- Dashboard: metric-card and queue skeletons.
- Dialog command submission: keep existing content visible, lock destructive/duplicate actions, and show progress indicator on submitted action.
- Public verification: result-card skeleton only after a query is submitted.

A loading skeleton must not display fabricated statuses or fake certificate numbers.

## 8.3 Empty States

Empty states must distinguish:

1. genuinely no data;
2. no data matching current filters;
3. no permission;
4. upstream data unavailable;
5. loading.

These states must never be visually conflated.

## 8.4 Permission-Based Hiding and Disabling

### Hide

Hide navigation and actions the user cannot ever perform in the current effective capability set, for example:

- Issue without `certificate.issue`.
- Revoke without `certificate.revoke`.
- Reissue decision without the required approval permission.
- Audit tab without audit-read permission.

### Disable with Explanation

Disable an otherwise permitted action when current resource state prevents it, for example:

- Generate when readiness is blocked.
- Issue when status is not Generated.
- Generate Replacement when request is not Approved.
- Revoke when status is not revocable.

The disabled state must explain the blocker. Server validation remains mandatory.

## 8.5 Optimistic UI Prohibition for Sensitive Lifecycle Changes

Do not optimistically display successful Generate, Issue, Approve, Reject, Generate Replacement, or Revoke transitions before the server confirms success. These commands may fail due to:

- authorization;
- branch scope;
- stale completion/payment gates;
- duplicate certificate detection;
- numbering failure;
- lifecycle conflict;
- optimistic-concurrency conflict.

---

# 9. Responsive and Table Behavior Standards

## 9.1 Desktop

- Full data tables with sticky headers.
- Filter bar can collapse into advanced filter drawer when more than six controls are present.
- Row actions use a consistent overflow menu with the primary action exposed directly where appropriate.

## 9.2 Tablet

- Reduce visible columns to essential identity/status fields.
- Secondary fields available in expandable row detail.
- Destructive actions remain inside explicit confirmation flow.

## 9.3 Mobile

- Convert wide tables into cards or compact rows.
- Certificate Number, Learner/Course, Status, and primary action remain visible.
- Filters open in full-height drawer.
- Do not horizontally compress Arabic or English text to unreadable widths.

## 9.4 Pagination and Sorting

- Pagination is server-side for operational registries and work queues.
- Sorting must use stable server-supported fields.
- A unique tie-breaker must be used server-side for deterministic pages.
- UI must not load an unrestricted full certificate registry into browser memory for local filtering.

---

# 10. Bilingual Layout and Localization Rules

## 10.1 Directionality

| Aspect | English | Arabic |
|---|---|---|
| Page direction | `ltr` | `rtl` |
| Primary navigation flow | Left to right | Right to left |
| Breadcrumb order | LTR | Mirrored RTL |
| Form label alignment | Start/left according to design system | Start/right according to design system |
| Drawer origin | Default LTR side | Mirrored RTL side |
| Table action alignment | End/right | End/left |
| Stepper progression | Left → Right | Right → Left |
| Chevron/navigation icons | Standard | Mirrored when directional |

## 10.2 Values That Must Not Be Mirrored Semantically

The following remain logically stable even inside RTL pages:

- certificate number;
- enrollment number;
- verification code;
- QR code;
- email addresses;
- URLs;
- ISO-like identifiers;
- numeric marks or percentages shown in cross-context summaries;
- timestamps rendered according to locale but not digit-order reversed.

Use directional isolation (`bdi` or equivalent design-system support) for mixed Arabic/Latin identifier content.

## 10.3 Localized Content Rules

- UI labels, validation errors, empty states, dialog text, and status display labels must be localized.
- Domain enum values remain stable in API contracts; the UI maps them to localized labels.
- Course and learner display names should use authoritative localized projections where available.
- Certificate language is the language of the generated artifact and is independent from current UI language.
- An Arabic UI user may generate an English certificate and an English UI user may generate an Arabic certificate if authorized and source data supports rendering.

## 10.4 Table Rules in RTL

- Column order may be mirrored according to design system, but identity/status relationships must remain understandable.
- Numeric/date/identifier cells use appropriate directional isolation.
- Sort icons appear adjacent to the localized header label and mirror only when the icon is directional.
- Pagination previous/next controls must reverse visual direction while retaining semantic action labels.

## 10.5 Certificate Preview Rules

- Artifact preview displays the artifact exactly as generated; the surrounding UI direction must not alter PDF/image rendering.
- English certificate preview remains LTR inside an Arabic UI shell.
- Arabic certificate preview remains RTL as generated inside an English UI shell.

---

# 11. Permission Model Applied to Screens

The exact permission codes must remain aligned with the project's dynamic IAM configuration. The following is the FRD-level capability mapping.

| Capability | Screens / Actions |
|---|---|
| `certificate.read` | Dashboard summaries, readiness list/detail, registry, certificate detail |
| `certificate.generate` | Generate Certificate, Generate Replacement where additionally authorized by reissue state |
| `certificate.issue` | Issue Certificate confirmation/action |
| `certificate.download` | Artifact preview/download |
| `certificate.verify.read` | Internal verification activity |
| `certificate.reissue.submit` | Submit reissue request |
| `certificate.reissue.read` | Reissue queue/detail |
| `certificate.reissue.approve` | Approve reissue request |
| `certificate.reissue.reject` | Reject reissue request |
| `certificate.revoke` | Revoke Certificate |
| `audit.read` or equivalent | Lifecycle/Audit detail tab |

### Mandatory Authorization Behavior

1. Navigation may be hidden for unavailable capabilities.
2. Direct route access must still be server-authorized.
3. Query results must be branch-scoped server-side.
4. A supplied `branchId` is a narrowing filter only.
5. Parent/child branch behavior follows IAM `UserBranchAccess`; UI must not reconstruct hierarchy permissions independently.
6. Student self-service ownership is identity-scoped server-side.
7. Trainer visibility derives from authorized trainer assignment/read contract, not a client-supplied trainer ID.

---

# 12. Screen-to-Use-Case and Application-Service Traceability Matrix

| Screen | Use Case / Requirement | Application Service / Query | Owning Context | Cross-Context Reads | Forbidden UI Logic |
|---|---|---|---|---|---|
| SCR-CERT-A01 | FR-CERT-032, FR-CERT-036 | CertificateDashboardQuery | Certificate / Reporting projection | Reporting projections | Browser KPI computation from raw transactions |
| SCR-CERT-A02 | UC-CERT-001 | ListCertificateReadyEnrollmentsQuery | Certificate application read layer | Enrollment, Completion, Finance gate | Recalculate eligibility/payment |
| SCR-CERT-A03 | UC-CERT-001 | GetCertificateReadinessQuery | Certificate application read layer | Enrollment, Completion, Finance | Mutate upstream records |
| SCR-CERT-A04 | UC-CERT-002 | GenerateCertificateCommand | Certificate | Completion/payment gates, NumberingSeries | Allocate numbers/codes locally |
| SCR-CERT-A05 | UC-CERT-002 | GetCertificateDetailQuery | Certificate | None required beyond projection | Treat preview as authoritative lifecycle change |
| SCR-CERT-A06 | FR-CERT-014 | CertificateRegistryQuery | Certificate | Display references | Inline status edits |
| SCR-CERT-A07 | FR-CERT-015 | GetCertificateDetailQuery | Certificate | Audit read projection | Direct Audit mutation |
| SCR-CERT-A08 | FR-CERT-016 | GetCertificateArtifactQuery | Certificate | Storage infrastructure through application boundary | Public storage bypass |
| SCR-CERT-A09 | UC-CERT-003 | IssueCertificateCommand | Certificate | Completion/payment gates | UI-set issue date/issuer |
| SCR-CERT-A10 | FR-CERT-022 | ListReissueRequestsQuery | Certificate | Identity display refs | Approve from table without controlled use case |
| SCR-CERT-A11 | UC-CERT-006 | Approve/RejectReissueRequestCommand | Certificate | Audit approval projection | Write approval history directly |
| SCR-CERT-A12 | UC-CERT-007 | GenerateReplacementCertificateCommand | Certificate | Numbering/config source | Client-supplied replacement ID |
| SCR-CERT-A13 | UC-CERT-008 | RevokeCertificateCommand | Certificate | Audit side effect | Hard delete or local status edit |
| SCR-CERT-A14 | FR-CERT-020 | ListCertificateVerificationActivityQuery | Certificate | Certificate branch projection | Change lifecycle from verification activity |
| SCR-CERT-A15 | FR-CERT-030 | CertificateLifecycleQuery | Certificate + Audit read composition | Audit | Manufacture history in browser |
| SCR-CERT-S01 | Self-service extension of FR-CERT-014 | ListMyCertificatesQuery | Certificate | Identity ownership mapping | Client-selected student scope |
| SCR-CERT-S02 | FR-CERT-015/016 | GetMyCertificateDetailQuery | Certificate | Identity ownership mapping | Cross-user access |
| SCR-CERT-S03 | UC-CERT-005 | SubmitReissueRequestCommand | Certificate | Identity ownership mapping | Auto-approve or auto-generate |
| SCR-CERT-S04 | UC-CERT-005/006/007 read side | ListMyReissueRequestsQuery | Certificate | Identity ownership mapping | Expose internal decision data unnecessarily |
| SCR-CERT-T01 | Read composition | TrainerCertificateStatusQuery | Read composition; Certificate data owned by Certificate | Trainer, Training Delivery, Completion | Issue/revoke controls |
| SCR-CERT-T02 | Completion workflow | Completion-context recommendation service | Exam, Result & Completion | Certificate status read-only | Certificate-owned completion recommendation |
| SCR-CERT-P01 | UC-CERT-004 | VerifyCertificateQuery | Certificate | None beyond certificate projection | Expose internal IDs or mutate status |

---

# 13. DDD Fit Check by Domain Boundary

## 13.1 Certificate Management Ownership

The following UI actions are valid Certificate Management responsibilities:

- list certificate-ready projections;
- inspect readiness projection;
- generate certificate;
- issue certificate;
- search/view/download certificate;
- public verification;
- record verification attempt through application service;
- submit/review/decide reissue requests;
- generate replacement certificate;
- preserve original/replacement lineage;
- revoke certificate;
- expose certificate facts to reporting;
- show Certificate lifecycle data.

## 13.2 Exam, Result & Completion Boundary

Certificate UI may display:

- approved completion status;
- completion approval summary;
- safe blocker reason.

Certificate UI must not:

- edit exam marks;
- calculate grades;
- mark exam pass/fail;
- calculate attendance percentage;
- evaluate CourseCompletionRule;
- approve course completion;
- submit trainer recommendation through a Certificate command.

Any trainer recommendation UI belongs to the Completion context even when visually linked from the Certificate journey.

## 13.3 Finance & Receivables Boundary

Certificate UI may display:

- payment validation required/not required;
- payment gate satisfied/blocked/unavailable;
- safe blocker text.

Certificate UI must not:

- calculate outstanding balance;
- allocate payments;
- create receipts;
- edit invoice status;
- waive debt;
- mark an invoice paid;
- override payment validation locally.

## 13.4 Admission & Enrollment Boundary

Certificate UI may display authoritative enrollment/student/course/batch/branch references. It must not edit:

- learner identity;
- Enrollment course assignment;
- Enrollment batch assignment;
- Enrollment branch;
- Enrollment type;
- Enrollment status.

Corrections must be routed to the owning context workflow.

## 13.5 IAM Boundary

Certificate UI consumes authenticated user identity, effective permissions, and effective branch access. It does not create roles, permissions, or branch assignments.

## 13.6 Audit & Compliance Boundary

Certificate commands must cause auditable sensitive transitions according to application architecture. The UI can read permitted audit projections but must not directly create `AuditLog`, `ApprovalRequest`, or `ApprovalHistory` rows.

## 13.7 Communication Boundary

After issuance or other configured events, Certificate application services may request notifications. The UI must not independently send email, SMS, or WhatsApp as part of the Certificate command flow. Communication Management owns templates, delivery requests, and delivery history.

## 13.8 Reporting Boundary

Dashboard and reports consume Certificate facts. Reporting does not own Certificate transactions, and dashboard widgets cannot transition certificate state.

---

# 14. ER Model Fit Check

## 14.1 Direct Screen-to-Entity Mapping

| ER Entity | UI Usage |
|---|---|
| `Certificate` | Registry, detail, preview, issue, revoke, student certificate views, trainer status projection, public verification result |
| `CertificateVerification` | Verification attempt recording and internal verification activity screen |
| `CertificateReissueRequest` | Reissue submission, queue, detail, approval/rejection outcome, replacement linkage |
| `Enrollment` | Source context and branch relationship; read only from Certificate UI |
| `StudentProfile` / `Person` | Learner display data; read only |
| `Course` | Course display/localized content; read only |
| `Batch` | Batch display reference; read only |
| `CourseCompletion` / `CompletionApproval` | Eligibility/approval projection; read only |
| `NumberingSeries` | Generation dependency; no direct Certificate UI editing |
| `UserBranchAccess` | Effective scope input from IAM; no Certificate UI editing |
| `AuditLog`, `ApprovalRequest`, `ApprovalHistory` | Read-only audit/approval projections where authorized |

## 14.2 Known Source-Model Gaps Affecting UI

### Gap 1 – Certificate Status Enum Not Explicitly Defined

The ER model defines `Certificate.certificateStatus` but does not enumerate the allowed values. Part 2 defines FRD-level lifecycle semantics. UI status filters and badges must use the implementation enum once validated against the approved schema; they must not hardcode a conflicting vocabulary independently.

### Gap 2 – Reissue Status Enum Not Explicitly Defined

`CertificateReissueRequest.status` exists, but its exact enum vocabulary is not specified in the ER source. UI workflow states must remain aligned with the approved application state machine and final Prisma enum.

### Gap 3 – DDD `CertificateIssueLog` Has No ER Entity

The DDD conceptual aggregate includes issue logging, but the ER model has no `CertificateIssueLog`. The UI shall use lifecycle/audit projections and must not introduce a new IssueLog table from screen requirements alone.

### Gap 4 – QR Modeling Difference

DDD references `CertificateQRCode`; ER stores `qrCodeUrl` on `Certificate`. UI treats QR as a Certificate presentation element and does not require a new QR entity.

### Gap 5 – Revocation Metadata

DDD requires revocation capability, but ER exposes only `certificateStatus` and lacks explicit `revokedAt`, `revokedBy`, and `revocationReason`. SCR-CERT-A13 captures required revocation reason at use-case level; persistence must use existing audit conventions until the model gap is formally resolved.

### Gap 6 – Reissue Request Timestamp

The ER definition of `CertificateReissueRequest` does not list a dedicated requested timestamp. Queue UI must use a valid base/audit projection timestamp only if available from actual schema conventions; it must not invent a field contract.

### Gap 7 – Prisma Validation Pending

The provided FRD inputs referenced `packages/database/prisma/schema.prisma`, but that schema is not available in the supplied source set. Exact enum values, relation names, indexes, nullable constraints, and field availability remain subject to Prisma-level validation.

---

# 15. Accessibility and Usability Requirements

1. All functionality must be keyboard accessible.
2. Focus order must follow visual reading order in both LTR and RTL modes.
3. Dialogs must trap focus while open and restore focus on close.
4. Status must not be communicated by color alone; include text/icon semantics.
5. Validation errors must be programmatically associated with inputs.
6. Public verification results must be announced through an accessible live region.
7. QR code must be accompanied by a textual verification option.
8. Tables must expose headers and sortable-state semantics.
9. Loading states must use appropriate busy semantics and avoid layout jumps where possible.
10. Destructive actions such as revocation require explicit confirmation and clear consequence text.
11. Certificate artifact preview must provide a download fallback if embedded preview is inaccessible.
12. Arabic content must use fonts and line-height suitable for Arabic glyph readability without truncation.

---

# 16. Navigation Model

## 16.1 Admin Navigation

```text
Certificate Management
├── Dashboard
├── Ready for Generation
├── Certificate Registry
├── Reissue Requests
└── Verification Activity
```

Visibility is permission-driven. The menu does not imply separate bounded contexts; all items above are Certificate-owned application surfaces except Dashboard metrics that may use Reporting projections and Audit views that remain Audit-owned read dependencies.

## 16.2 Student Navigation

```text
My Learning
└── My Certificates
    ├── Certificate Detail
    └── Reissue Requests
```

## 16.3 Trainer Navigation

```text
Training Delivery / Completion
└── Completion & Certificate Status
```

The trainer navigation placement should avoid implying that trainers own Certificate issuance.

---

# 17. Route-Level Behavioral Requirements

Illustrative route names are implementation guidance and must follow repository routing conventions.

| Screen | Suggested Route Shape | Route Guard |
|---|---|---|
| A01 | `/certificates` | certificate dashboard/read capability |
| A02 | `/certificates/ready` | certificate.read |
| A03 | `/certificates/ready/[enrollmentId]` | certificate.read + branch scope |
| A04 | `/certificates/ready/[enrollmentId]/generate` | certificate.generate + branch scope |
| A06 | `/certificates/registry` | certificate.read |
| A07 | `/certificates/[certificateId]` | certificate.read + branch scope |
| A10 | `/certificates/reissues` | certificate.reissue.read |
| A11 | `/certificates/reissues/[requestId]` | reissue read/decision capability + branch scope |
| A14 | `/certificates/verifications` | certificate verification activity read permission |
| S01 | `/student/certificates` | authenticated learner identity ownership |
| S02 | `/student/certificates/[certificateId]` | self-ownership guard |
| P01 | `/verify-certificate` or opaque QR route | public rate-limited query |

Route guards are not substitutes for application-layer authorization.

---

# 18. UI Event and Command Boundary Summary

| UI Event | Application Operation | Mutation Owner |
|---|---|---|
| Open Ready List | Query ready projection | None |
| Refresh Readiness | Query authoritative readiness projection | None |
| Generate | GenerateCertificateCommand | Certificate |
| Issue | IssueCertificateCommand | Certificate |
| Download | Authorized artifact query | None |
| Verify | VerifyCertificateQuery + verification-attempt recording | Certificate |
| Submit Reissue | SubmitReissueRequestCommand | Certificate |
| Approve Reissue | ApproveReissueRequestCommand | Certificate transaction; Audit owns approval history |
| Reject Reissue | RejectReissueRequestCommand | Certificate transaction; Audit owns approval history |
| Generate Replacement | GenerateReplacementCertificateCommand | Certificate |
| Revoke | RevokeCertificateCommand | Certificate; Audit owns sensitive action history |
| Send Certificate Notification | Triggered by application workflow, not direct UI provider call | Communication owns delivery transaction |
| Recommend Completion | Completion-context command | Exam, Result & Completion |
| Mark Payment Complete | Not available in Certificate UI | Finance |

---

# 19. Final DDD Fit Confirmation

The screen model in this Part 3 remains aligned with the module architecture under the following conditions:

1. `Certificate` remains the lifecycle aggregate root for generation, issuance, replacement lineage, revocation, and verification behavior.
2. Certificate screens consume completion approval as an authoritative upstream outcome; they do not evaluate completion rules.
3. Certificate screens consume Finance payment-validation truth where required; they do not calculate payment completion.
4. Every certificate remains tied to an Enrollment-centered learning journey and reads learner/course/batch/branch context from authoritative sources.
5. Branch access is resolved server-side from IAM rules.
6. Student self-service is identity-scoped server-side.
7. Trainer views remain read-only for Certificate lifecycle and route completion recommendation commands to Exam, Result & Completion.
8. Reissue UI manages Certificate reissue transaction state while Audit & Compliance owns approval history.
9. Notifications are requested through Communication Management rather than sent directly by Certificate UI code.
10. Reporting screens consume read models and never own Certificate transactions.
11. No screen introduces hard delete, template builder, configurable certificate template entity, completion calculator, payment calculator, or client-owned state machine.
12. Known ER/DDD mismatches are documented as gaps and are not silently resolved through invented UI-backed persistence models.

---

# 20. Part 3 Validation Checklist

| Check | Result |
|---|---|
| Admin screens cover generation, issue, registry, reissue, revocation, verification activity, and lifecycle visibility | Pass |
| Student screens are self-service and identity-scoped | Pass |
| Trainer screens do not grant Certificate lifecycle mutation authority | Pass |
| Public verification exposes minimal data | Pass |
| All lifecycle actions map to explicit application commands | Pass |
| Completion evaluation remains outside Certificate UI | Pass |
| Finance payment calculation remains outside Certificate UI | Pass |
| Branch filtering does not broaden effective scope | Pass |
| Permission hiding is not treated as security enforcement | Pass |
| Loading, empty, validation, stale-state, conflict, and dependency-error states are defined | Pass |
| English LTR and Arabic RTL behavior is specified | Pass |
| ER gaps are explicitly documented rather than patched through UI assumptions | Pass |
| Prisma-level validation | Pending – schema not supplied in current source set |

