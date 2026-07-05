# Part 3 – Screen Specifications and UI Components

## Module 10 – Exam, Result & Completion Management

## 1. Purpose

This document defines the screen inventory, screen-level interaction specifications, reusable UI components, dynamic UI states, bilingual rendering requirements, and DDD fit for Module 10 – Exam, Result & Completion Management.

The UI must remain an orchestration layer over application services. It must not:

- calculate completion eligibility in the browser;
- derive authoritative pass/fail state independently of the server;
- recompute attendance percentage from copied attendance rows;
- recompute payment completion from invoice/payment data;
- create certificate records;
- bypass approval sequencing;
- infer authorization only from hidden buttons;
- trust a client-supplied branch identifier without server-side branch enforcement.

The module UI is built around these principal use cases:

```text
UC-EXC-001 Create Exam
UC-EXC-002 Manage Exam Lifecycle
UC-EXC-003 Record Results
UC-EXC-004 Finalize Result Set
UC-EXC-005 Correct Finalized Result
UC-EXC-006 Evaluate Completion
UC-EXC-007 Execute Manual Completion Approval
UC-EXC-008 Re-evaluate Completion After Evidence Change
UC-EXC-009 View Pending Work Queue
UC-EXC-010 Export Exam, Result, or Completion Data
```

---

# 2. Portal Applicability

## 2.1 Current Application Strategy

The architectural baseline states:

```text
Current application:
- Admin Portal

Future application structure may include:
- Student Portal
- Trainer Portal
- Corporate Portal
- Employee Portal
- Public Website
- Certificate Verification
```

Accordingly:

- Admin Portal screens are current primary implementation scope.
- Trainer Portal screens are specified where the trainer-facing workflow is materially different and may later be exposed through a dedicated portal.
- Student Portal screens are read-only and future-facing unless the implementation roadmap explicitly activates the Student Portal.
- No Student or Trainer portal screen may introduce a separate domain model.
- The same application services and authorization policies must be reused regardless of portal.

---

# 3. Screen Inventory

## 3.1 Admin Portal Screen Inventory

| ID | Screen | Primary Users | Main Use Case |
|---|---|---|---|
| SCR-EXC-ADM-001 | Module Dashboard / Work Queue | Academic Coordinator, Academic Administrator, Branch Manager | UC-EXC-009 |
| SCR-EXC-ADM-002 | Exam List | Academic Coordinator, Academic Administrator | UC-EXC-001, UC-EXC-002 |
| SCR-EXC-ADM-003 | Create Exam | Academic Coordinator | UC-EXC-001 |
| SCR-EXC-ADM-004 | Exam Detail | Academic Coordinator, Academic Administrator | UC-EXC-002 |
| SCR-EXC-ADM-005 | Edit / Reschedule Exam | Academic Coordinator, Academic Administrator | UC-EXC-002 |
| SCR-EXC-ADM-006 | Result Entry Roster | Trainer via Admin Portal, Academic Coordinator | UC-EXC-003 |
| SCR-EXC-ADM-007 | Bulk Result Entry | Trainer via Admin Portal, Academic Coordinator | UC-EXC-003 |
| SCR-EXC-ADM-008 | Result Review and Finalization | Academic Coordinator, Academic Administrator | UC-EXC-004 |
| SCR-EXC-ADM-009 | Finalized Result Detail | Academic Coordinator, Academic Administrator, Auditor | UC-EXC-004, UC-EXC-005 |
| SCR-EXC-ADM-010 | Correct Finalized Result Dialog | Restricted Academic Authority | UC-EXC-005 |
| SCR-EXC-ADM-011 | Completion Evaluation Queue | Academic Coordinator, Academic Administrator | UC-EXC-006, UC-EXC-009 |
| SCR-EXC-ADM-012 | Completion Evaluation Detail | Academic Coordinator, Academic Administrator | UC-EXC-006 |
| SCR-EXC-ADM-013 | Trainer Recommendation Queue | Trainer via Admin Portal | UC-EXC-007, UC-EXC-009 |
| SCR-EXC-ADM-014 | Trainer Recommendation Detail | Assigned Trainer | UC-EXC-007 |
| SCR-EXC-ADM-015 | Coordinator Review Queue | Academic Coordinator | UC-EXC-007, UC-EXC-009 |
| SCR-EXC-ADM-016 | Coordinator Review Detail | Academic Coordinator | UC-EXC-007 |
| SCR-EXC-ADM-017 | Final Approval Queue | Branch Manager | UC-EXC-007, UC-EXC-009 |
| SCR-EXC-ADM-018 | Final Approval Detail | Branch Manager | UC-EXC-007 |
| SCR-EXC-ADM-019 | Re-evaluation / Exception Queue | Academic Administrator | UC-EXC-008, UC-EXC-009 |
| SCR-EXC-ADM-020 | Re-evaluation Detail | Academic Administrator | UC-EXC-008 |
| SCR-EXC-ADM-021 | Academic Outcome Search | Academic Users, Auditor | Read use case |
| SCR-EXC-ADM-022 | Export Center | Academic Administrator, Auditor | UC-EXC-010 |
| SCR-EXC-ADM-023 | Audit Timeline Drawer | Academic Administrator, Auditor | UC-EXC-005, UC-EXC-010 |

---

## 3.2 Trainer Portal Screen Inventory

These screens reuse the same application services and permissions as the Admin Portal.

| ID | Screen | Applicability | Main Use Case |
|---|---|---|---|
| SCR-EXC-TRN-001 | My Exam Tasks | Applicable when Trainer Portal is enabled | UC-EXC-009 |
| SCR-EXC-TRN-002 | Exam Result Entry | Applicable when Trainer Portal is enabled | UC-EXC-003 |
| SCR-EXC-TRN-003 | My Completion Recommendations | Applicable when Trainer Portal is enabled | UC-EXC-007 |
| SCR-EXC-TRN-004 | Completion Recommendation Detail | Applicable when Trainer Portal is enabled | UC-EXC-007 |
| SCR-EXC-TRN-005 | My Submitted Academic Actions | Optional read-only history | Audit/read |

---

## 3.3 Student Portal Screen Inventory

Student Portal screens are read-only and future-facing.

| ID | Screen | Applicability | Main Use Case |
|---|---|---|---|
| SCR-EXC-STU-001 | My Exams | Applicable when Student Portal is enabled | Read-only exam schedule |
| SCR-EXC-STU-002 | My Results | Applicable when Student Portal is enabled | Read-only result outcome |
| SCR-EXC-STU-003 | My Completion Status | Applicable when Student Portal is enabled | Read-only completion progress |
| SCR-EXC-STU-004 | Completion Evidence Detail | Optional read-only evidence summary | Read-only completion evidence |

Student screens must never:

- expose other enrollment records;
- allow result editing;
- allow approval actions;
- calculate eligibility client-side;
- expose internal approval remarks that are not approved for student visibility;
- imply certificate issuance unless Certificate Management confirms issuance.

---

# 4. Global Layout and Navigation Rules

## 4.1 Admin Navigation

Recommended navigation hierarchy:

```text
Academics
└── Exams & Completion
    ├── Dashboard
    ├── Exams
    ├── Results
    ├── Completion Evaluation
    ├── Approval Queues
    ├── Re-evaluation Exceptions
    └── Exports
```

Navigation visibility is permission-based.

Example capability checks:

```text
exam.read
exam.create
exam.update
exam.schedule
exam.activate
exam.close
exam.cancel

result.read
result.record
result.bulk-record
result.finalize
result.correct

completion.read
completion.evaluate
completion.reevaluate
completion.recommend
completion.coordinator-review
completion.final-approve
completion.reject
completion.export
completion.audit.read
```

The UI may hide unavailable menu items for usability, but the server must independently authorize every route and action.

---

## 4.2 Shared Page Layout

All list and detail pages should use:

```text
Page Header
├── Breadcrumb
├── Page Title
├── Context Subtitle
├── Branch Context Indicator
└── Primary Action Area

Filter / Summary Section
├── Quick Filters
├── Search
├── Date Range
├── Course
├── Batch
├── Status
└── Reset / Apply

Main Content
├── KPI Cards or Status Summary
├── Data Table / Detail Panels
└── Pagination

Secondary UI
├── Drawer
├── Dialog
├── Audit Timeline
└── Export Action
```

---

# 5. Admin Portal Screen Specifications

# 5.1 SCR-EXC-ADM-001 — Module Dashboard / Work Queue

## Purpose

Provide a branch-scoped operational overview of pending work across exams, results, completion evaluation, approvals, and re-evaluation exceptions.

## Application Service / Use Case Mapping

```text
UC-EXC-009 View Pending Work Queue
```

Suggested application query contracts:

```text
GetExamCompletionDashboardQuery
GetPendingAcademicWorkQueueQuery
```

## Layout

```text
Header
├── Title: Exam, Result & Completion
├── Branch Scope Indicator
└── Last Refreshed Timestamp

Summary Cards
├── Exams Awaiting Activation
├── Missing Results
├── Results Awaiting Finalization
├── Completion Evaluations Pending
├── Trainer Recommendations Pending
├── Coordinator Reviews Pending
├── Final Approvals Pending
└── Re-evaluation Exceptions

Work Queue Tabs
├── Exams
├── Results
├── Completion
├── Approvals
└── Exceptions

Queue Table
```

## Interactive Elements

- Branch scope selector, limited to authorized branches.
- Date range selector.
- Course filter.
- Batch filter.
- Queue type tabs.
- Search by enrollment number, exam name, student display name, or batch code.
- Row action button mapped to current state and permission.
- Refresh button.
- Saved local view preference may be used for column arrangement only; no domain data is stored in the browser.

## Table Behavior

Columns vary by queue.

Common columns:

```text
Reference
Learner / Exam
Course
Batch
Branch
Current State
Pending Action
Age
Assigned Actor / Stage
Last Updated
Actions
```

Rules:

- Server-side pagination.
- Server-side filtering.
- Server-side sorting.
- Default sort: oldest pending action first.
- Stable secondary sort by record ID/reference.
- Page size: 25 default; allowed values 25, 50, 100.
- Do not fetch all rows for client-side filtering.
- Row actions require server re-authorization.

## Empty States

Examples:

```text
No pending results
All currently required exam results have been recorded for this scope.

No completion evaluations pending
There are no enrollments waiting for completion evaluation in the selected filters.
```

## Loading State

- 8 summary-card skeletons.
- Table header visible.
- 8–10 row skeleton placeholders.
- Preserve filter bar position to avoid layout shift.

## Permission-Based UI

- Users without approval permissions must not see approval action buttons.
- Users with read-only consolidated scope may see counts/rows but not mutation controls.
- Audit tab hidden without `completion.audit.read`.
- Export action hidden without `completion.export`.

## DDD Fit Check

This screen is a read-only projection over Module 10 work items. It may consume read models but must not own:

- Enrollment;
- Attendance;
- Finance;
- Course completion rules;
- Certificate status calculation.

---

# 5.2 SCR-EXC-ADM-002 — Exam List

## Purpose

Search, filter, review, and navigate Exams.

## Application Service Mapping

```text
SearchExamsQuery
GetExamSummaryQuery
```

## Layout

```text
Header
├── Title: Exams
└── Create Exam button

Filter Bar
├── Search
├── Course
├── Batch
├── Branch
├── Exam Date Range
├── Status
└── Reset

Table
```

## Table Columns

```text
Exam Name
Course
Batch
Exam Date
Max Marks
Pass Marks
Status
Result Progress
Branch
Last Updated
Actions
```

`Result Progress` is a read projection such as:

```text
34 / 40 recorded
34 / 40 finalized
```

It must be calculated by the server/read model.

## Table Behaviors

- Server pagination and sort.
- Sortable: Exam Date, Name, Status, Last Updated.
- Course and Batch display localized names where available.
- Status badge must use semantic label and not rely on color alone.
- Row click opens Exam Detail.
- Overflow menu may include:
  - View;
  - Edit/Reschedule;
  - Open for Result Entry;
  - Close;
  - Cancel.

Actions appear only when transition and permission allow them, but server validation remains authoritative.

## Validation

Filter validation:

- dateFrom <= dateTo;
- Batch filter must be valid for selected Course if both supplied;
- Branch filter must be inside read scope.

## DDD Fit Check

List query reads `Exam` plus display facts from Course, Batch, and Branch through approved read composition. It must not mutate Course or Batch.

---

# 5.3 SCR-EXC-ADM-003 — Create Exam

## Purpose

Create a valid Exam for a Course and Batch.

## Application Service Mapping

```text
CreateExamCommand
GetExamCreationOptionsQuery
```

## Layout

```text
Page Header
├── Title: Create Exam
└── Back to Exams

Form Card: Exam Context
├── Branch
├── Course
└── Batch

Form Card: Exam Definition
├── Exam Name
├── Exam Date
├── Maximum Marks
└── Pass Marks

Footer Actions
├── Cancel
└── Create Exam
```

## Inputs

### Branch

- Select.
- Required when user has multiple mutation branches.
- Default to user's allowed default branch where configured.
- Disabled for users with exactly one mutation branch.

### Course

- Searchable select.
- Required.
- Options only from valid authorized context.
- Display code + localized course name.

### Batch

- Searchable dependent select.
- Required.
- Only Batches belonging to selected Course and Branch.
- Reset Batch selection when Course changes.

### Exam Name

- Required.
- Trim leading/trailing whitespace.
- Must not be blank after trim.
- Length limit must follow schema/API contract.
- No client-only uniqueness guarantee.

### Exam Date

- Required.
- Date picker.
- Must use institute/branch timezone semantics.
- Server validates operational constraints.

### Maximum Marks

- Required numeric input.
- `> 0`.
- Decimal/integer support must match domain contract.

### Pass Marks

- Required numeric input.
- `>= 0`.
- `<= maxMarks`.

## Client Validation

The client may provide immediate feedback for:

```text
required fields
numeric format
maxMarks > 0
passMarks >= 0
passMarks <= maxMarks
```

Server remains authoritative for:

```text
permission
branch scope
Course-Batch relationship
duplicate policy
date constraints
state initialization
```

## Error Presentation

- Field-level messages for local validation.
- Form-level alert for cross-field or business errors.
- Preserve entered values after recoverable error.
- Never expose internal IDs or stack traces.

## Submission State

- Disable submit while command in flight.
- Show inline spinner in primary action.
- Prevent accidental duplicate submission.
- On success navigate to Exam Detail.

## DDD Fit Check

The screen sends a command. It does not:

- create a Batch;
- modify CourseCompletionRule;
- calculate result rows;
- calculate completion eligibility.

---

# 5.4 SCR-EXC-ADM-004 — Exam Detail

## Purpose

Provide complete operational view of an Exam and state-appropriate actions.

## Application Service Mapping

```text
GetExamDetailQuery
ActivateExamCommand
CloseExamCommand
CancelExamCommand
```

## Layout

```text
Header
├── Exam Name
├── Status Badge
├── Course / Batch Context
└── Action Menu

Summary Grid
├── Exam Date
├── Max Marks
├── Pass Marks
├── Branch
├── Result Count
└── Finalized Count

Tabs
├── Overview
├── Results
├── Completion Impact
└── Audit
```

## Interactive Elements

- Edit/Reschedule.
- Open for Result Entry.
- Close Exam.
- Cancel Exam.
- Navigate to Result Entry.
- Navigate to Result Finalization.
- Open audit drawer.

## Action Confirmation

### Cancel Exam Dialog

Inputs:

```text
Reason
```

Validation:

- reason required;
- trimmed non-empty text.

Warning must describe consequences without claiming logic the server has not confirmed.

### Close Exam Dialog

Display:

```text
Recorded results count
Missing results count
Finalized results count
```

The server decides whether closing is permitted.

## DDD Fit Check

Completion Impact tab may show downstream affected CourseCompletion records, but the Exam screen must not directly modify them.

---

# 5.5 SCR-EXC-ADM-005 — Edit / Reschedule Exam

## Purpose

Update permitted Exam fields before protected academic evidence makes an ordinary edit unsafe.

## Application Service Mapping

```text
UpdateExamCommand
RescheduleExamCommand
```

## Layout

Same core form structure as Create Exam, with current values preloaded.

## Editable Fields

Depending on state and server policy:

```text
Exam Name
Exam Date
Max Marks
Pass Marks
```

Course and Batch should generally be immutable after academic evidence exists. UI must respect the server's editable-field metadata.

## Dynamic Rules

- Fields returned as immutable must render read-only.
- If finalized results exist, structural fields that would invalidate evidence must be disabled.
- A tooltip or helper text should explain:
  - “This value cannot be changed through the standard edit flow because finalized result evidence exists.”

## Concurrency Handling

On stale version:

```text
This exam was updated by another user.
Reload the latest values before trying again.
```

Provide:

- Reload Latest;
- Cancel.

Do not silently overwrite.

---

# 5.6 SCR-EXC-ADM-006 — Result Entry Roster

## Purpose

Record or update non-finalized Results for eligible enrollments.

## Application Service Mapping

```text
GetExamResultRosterQuery
RecordResultCommand
```

## Layout

```text
Header
├── Exam Name
├── Course
├── Batch
├── Exam Date
├── Max Marks
└── Pass Marks

Progress Strip
├── Total Enrollments
├── Results Recorded
├── Missing Results
└── Finalized Results

Filter Bar
├── Search Student
├── Result State
└── Show Missing Only

Result Table
```

## Table Columns

```text
Enrollment Number
Student Name
Student Number
Enrollment Status
Marks Obtained
Derived Result Status
Grade
Result Lifecycle
Recorded By
Recorded At
Action
```

## Interactive Behavior

- Inline mark entry only where Result is editable.
- Derived result status displayed after server save.
- Client may preview pass/fail, but must label it as preview only if shown before save.
- Finalized rows render read-only.
- Correct action shown only with `result.correct`.
- Bulk Entry button shown with `result.bulk-record`.

## Validation

Per row:

```text
marks required for save
marks >= 0
marks <= exam.maxMarks
valid numeric precision
row version must match current server version
```

Server validates:

```text
Exam open for result entry
Enrollment belongs to Exam Course
Enrollment belongs to Exam Batch
Branch scope
Result lifecycle
Duplicate Result invariant
```

## Save Patterns

Supported interaction options:

1. explicit row Save;
2. explicit Save Changed Rows.

Autosave is not recommended for academic marks because accidental edits are high impact.

## Row Error Behavior

- Highlight invalid cell.
- Keep row visible.
- Show accessible message.
- For concurrency conflict, lock row until refreshed.
- Do not clear valid unsaved rows because one row failed.

---

# 5.7 SCR-EXC-ADM-007 — Bulk Result Entry

## Purpose

Efficiently enter results for a complete exam roster.

## Application Service Mapping

```text
GetExamResultRosterQuery
ValidateBulkResultsCommand
SubmitBulkResultsCommand
```

## Layout

```text
Header: Exam Context

Bulk Entry Toolbar
├── Paste from Spreadsheet
├── Download Entry Template
├── Validate
└── Submit

Editable Grid

Validation Summary Panel
├── Valid Rows
├── Invalid Rows
├── Duplicate Rows
└── Unauthorized/Invalid Rows
```

## Grid Columns

```text
Row Number
Enrollment Number
Student Name
Marks Obtained
Derived Status Preview
Grade Preview
Validation Status
Error Message
```

## Paste Behavior

- Accept tabular clipboard input.
- Never map by student name alone.
- Map using stable enrollment reference.
- Reject duplicate enrollment references within one payload.
- Preserve pasted row order for error reconciliation.

## Validation Flow

```text
Paste / Enter
    ↓
Client Format Validation
    ↓
Server Validation
    ↓
Row-Level Validation Summary
    ↓
User Confirmation
    ↓
Submission
    ↓
Transaction Result Summary
```

## Error States

Possible row messages:

```text
Marks are required.
Marks cannot be negative.
Marks exceed maximum marks of 100.
Enrollment is not valid for this exam.
Duplicate enrollment appears in the submission.
This result is already finalized.
This row changed after you loaded it. Refresh and try again.
```

Cross-branch rows must use safe language and not reveal unrelated learner details.

## DDD Fit Check

The grid does not define roster truth. Roster eligibility comes from server-side Enrollment and Batch relationships.

---

# 5.8 SCR-EXC-ADM-008 — Result Review and Finalization

## Purpose

Review result completeness and finalize valid results.

## Application Service Mapping

```text
GetResultFinalizationSummaryQuery
FinalizeResultsCommand
```

## Layout

```text
Header: Exam Context

Summary Cards
├── Eligible Roster
├── Recorded
├── Missing
├── Validation Errors
└── Already Finalized

Result Table

Sticky Footer
├── Selected Count
├── Validation Summary
└── Finalize Selected / Finalize Allowed Set
```

## Table Behaviors

Columns:

```text
Select
Enrollment Number
Student
Marks
Derived Result
Grade
Validation State
Lifecycle State
Last Modified
```

Rules:

- finalized rows cannot be selected;
- invalid rows cannot be selected;
- select-all applies only to current filtered eligible rows according to backend-supported command semantics;
- user must review a confirmation dialog.

## Finalization Dialog

Display:

```text
Number of results to finalize
Number excluded
Warning that standard editing will become unavailable
```

Confirmation control:

- explicit Confirm Finalization button;
- optional typed confirmation is not necessary unless required by UX policy.

## DDD Fit Check

Finalization is a Module 10 command. It must not trigger certificate issuance directly.

---

# 5.9 SCR-EXC-ADM-009 — Finalized Result Detail

## Purpose

Display immutable academic evidence and controlled correction entry point.

## Application Service Mapping

```text
GetResultDetailQuery
GetResultAuditTimelineQuery
```

## Layout

```text
Header
├── Student
├── Enrollment Number
├── Exam
└── Finalized Badge

Result Summary
├── Marks Obtained
├── Maximum Marks
├── Pass Marks
├── Result Status
├── Grade
├── Recorded By
├── Recorded At
└── Version / Last Updated metadata as appropriate

Actions
└── Correct Result

Audit Timeline
```

## Permission Rules

- `Correct Result` hidden without `result.correct`.
- Audit timeline hidden without `completion.audit.read` or equivalent audit read capability.
- Read access still branch-scoped.

---

# 5.10 SCR-EXC-ADM-010 — Correct Finalized Result Dialog

## Purpose

Perform a restricted, auditable correction of finalized academic evidence.

## Application Service Mapping

```text
CorrectFinalizedResultCommand
```

## Layout

```text
Current Value Panel
├── Current Marks
├── Current Result Status
└── Current Grade

Correction Form
├── Corrected Marks
├── Derived Result Preview
└── Correction Reason

Impact Warning
├── Completion may be re-evaluated
└── Certificate eligibility may be affected

Actions
├── Cancel
└── Submit Correction
```

## Validation

Client:

```text
corrected marks required
corrected marks >= 0
corrected marks <= maxMarks
reason required
reason non-empty after trim
new value must differ from current value
```

Server:

```text
result.correct permission
branch mutation scope
Result is in correctable lifecycle
version match
marks validity
audit capture
completion re-evaluation requirement
```

## Success State

Display:

```text
Result corrected successfully.
Completion re-evaluation status: Pending / Completed / Exception Review.
```

Do not promise certificate revocation or issuance from this UI.

---

# 5.11 SCR-EXC-ADM-011 — Completion Evaluation Queue

## Purpose

List Enrollments that require completion evaluation or re-evaluation.

## Application Service Mapping

```text
GetCompletionEvaluationQueueQuery
```

## Layout

```text
Header
Filter Bar
Summary Counts
Queue Table
```

## Table Columns

```text
Enrollment Number
Student
Course
Batch
Attendance Evidence
Exam Evidence
Payment Evidence
Current Completion State
Last Evaluated
Reason Pending
Action
```

Evidence display must use server-provided outcome labels:

```text
Passed
Failed
Missing
Not Required
Unavailable
```

The UI must not infer status from raw foreign-context data.

## Actions

- Evaluate.
- Re-evaluate, with `completion.reevaluate`.
- View Detail.

## Empty State

```text
No completion evaluations pending
All enrollments in the selected scope have a current completion evaluation outcome.
```

---

# 5.12 SCR-EXC-ADM-012 — Completion Evaluation Detail

## Purpose

Display the evidence used for completion evaluation and allow authorized evaluation.

## Application Service Mapping

```text
GetCompletionEvaluationDetailQuery
EvaluateCompletionCommand
```

## Layout

```text
Enrollment Header
├── Student
├── Enrollment Number
├── Course
├── Batch
├── Branch
└── Enrollment Status

Completion Rule Card
├── Minimum Attendance %
├── Exam Required
├── Payment Required
├── Manual Approval Required
└── Certificate Allowed

Evidence Cards
├── Attendance Evidence
├── Exam Evidence
└── Payment Validation Evidence

Evaluation Outcome
├── Criterion-by-Criterion Result
├── Overall Outcome
├── Last Evaluated At
└── Evaluation Remarks

Actions
├── Evaluate
└── Re-evaluate
```

## Evidence UI

### Attendance Card

Display only server-provided authoritative summary:

```text
Attendance Percentage
Required Minimum
Outcome
Source Last Updated
```

Do not edit attendance from this screen.

Link to Attendance module may be shown when user has permission.

### Exam Card

Display:

```text
Exam Name
Marks
Pass Marks
Result Status
Lifecycle State
```

Correction must be initiated through the Result correction use case.

### Payment Card

Display:

```text
Payment Validation Required
Validation Outcome
Validation Timestamp
```

Do not display or calculate invoice balance unless Finance exposes an approved read projection.

## Evaluation Action

Button label:

```text
Evaluate Completion
```

or:

```text
Re-evaluate Completion
```

The client sends enrollment identity and expected version/context. The server loads authoritative rule and evidence.

The UI must never send:

```text
attendancePassed = true
examPassed = true
paymentCompleted = true
```

as trusted user decisions.

---

# 5.13 SCR-EXC-ADM-013 — Trainer Recommendation Queue

## Purpose

Show completion cases awaiting Trainer Recommendation.

## Application Service Mapping

```text
GetTrainerRecommendationQueueQuery
```

## Table Columns

```text
Enrollment Number
Student
Course
Batch
Attendance Outcome
Exam Outcome
Payment Outcome
Evaluated At
Pending Age
Action
```

## Scope Rules

The server returns only:

- authorized branch cases;
- cases in the correct functional state;
- cases for which the Trainer is assigned or explicitly authorized.

The UI must not filter a broad unscoped dataset on the client.

---

# 5.14 SCR-EXC-ADM-014 — Trainer Recommendation Detail

## Purpose

Allow an assigned Trainer to recommend or not recommend completion.

## Application Service Mapping

```text
GetCompletionApprovalDetailQuery
RecommendCompletionCommand
DeclineCompletionRecommendationCommand
```

## Layout

```text
Learner and Enrollment Header

Evidence Summary
├── Attendance
├── Exam
├── Payment
└── Rule Summary

Trainer Decision Card
├── Recommendation Choice
└── Remarks

Actions
├── Recommend Completion
└── Do Not Recommend
```

## Validation

For recommendation:

- optional remarks unless policy requires them.

For non-recommendation:

- reason/remarks required.

Server validates:

```text
completion.recommend
trainer identity
trainer assignment / authorization
branch scope
current workflow stage
evidence currency
version
```

---

# 5.15 SCR-EXC-ADM-015 — Coordinator Review Queue

## Purpose

Show completion cases ready for Academic Coordinator review.

## Application Service Mapping

```text
GetCoordinatorReviewQueueQuery
```

## Table Columns

```text
Enrollment Number
Student
Course
Batch
Trainer
Trainer Recommendation Date
Evidence Summary
Pending Age
Action
```

The queue must only contain cases whose Trainer Recommendation stage is complete and current.

---

# 5.16 SCR-EXC-ADM-016 — Coordinator Review Detail

## Purpose

Review evidence and Trainer Recommendation before final approval stage.

## Application Service Mapping

```text
GetCompletionApprovalDetailQuery
ApproveCoordinatorReviewCommand
RejectCoordinatorReviewCommand
```

## Layout

```text
Enrollment Summary
Evidence Summary
Trainer Recommendation Panel
Coordinator Decision Panel
Approval Timeline
```

## Actions

```text
Approve and Send to Final Approval
Reject
```

## Reject Dialog

Input:

```text
Rejection Reason
```

Validation:

- required;
- trimmed non-empty;
- length according to API contract.

## Dynamic State

If evidence changed since page load:

```text
The underlying completion evidence has changed.
Reload the latest evaluation before making a decision.
```

Decision buttons disabled until refresh.

---

# 5.17 SCR-EXC-ADM-017 — Final Approval Queue

## Purpose

Provide Branch Manager with branch-scoped completion cases awaiting final decision.

## Application Service Mapping

```text
GetFinalCompletionApprovalQueueQuery
```

## Table Columns

```text
Enrollment Number
Student
Course
Batch
Trainer Recommendation
Coordinator Decision
Evidence Summary
Pending Since
Action
```

## Permission and Scope

- `completion.final-approve` for approval.
- `completion.reject` for rejection.
- Branch mutation scope mandatory.
- Consolidated read access does not imply final approval authority across all visible branches.

---

# 5.18 SCR-EXC-ADM-018 — Final Approval Detail

## Purpose

Make the final completion decision.

## Application Service Mapping

```text
GetCompletionApprovalDetailQuery
ApproveCompletionCommand
RejectCompletionCommand
```

## Layout

```text
Enrollment Header

Completion Rule Summary

Evidence Snapshot
├── Attendance
├── Exam
└── Payment

Approval History
├── Trainer Recommendation
├── Coordinator Review
└── Current Final Approval Stage

Decision Panel
├── Optional Approval Remarks
└── Required Rejection Reason

Actions
├── Final Approve
└── Reject
```

## Approval Confirmation

Show:

```text
This action records the final completion approval.
Certificate issuance, when applicable, is handled separately by Certificate Management.
```

Do not show:

```text
Approve and Generate Certificate
```

because that would merge bounded-context responsibilities.

---

# 5.19 SCR-EXC-ADM-019 — Re-evaluation / Exception Queue

## Purpose

Surface completion records whose authoritative evidence changed or whose prior approval basis requires controlled review.

## Application Service Mapping

```text
GetCompletionReevaluationQueueQuery
```

## Table Columns

```text
Enrollment Number
Student
Previous Outcome
Current Trigger
Changed Evidence Type
Trigger Timestamp
Certificate Status Summary if exposed by Certificate context
Current Exception State
Action
```

## Trigger Types

Examples:

```text
Result Corrected
Attendance Corrected
Payment Validation Changed
Completion Rule Context Changed, if policy allows re-evaluation
Manual Exception
```

These labels must be server-provided.

## DDD Fit Check

This screen does not directly change Attendance, Finance, or Certificate records.

---

# 5.20 SCR-EXC-ADM-020 — Re-evaluation Detail

## Purpose

Review old and current evidence and perform controlled re-evaluation.

## Application Service Mapping

```text
GetCompletionReevaluationDetailQuery
ReevaluateCompletionCommand
```

## Layout

```text
Enrollment Summary

Change Trigger Card
├── Trigger Type
├── Trigger Reference
├── Triggered At
└── Triggered By / System

Previous Evaluation Snapshot
Current Authoritative Evidence
Comparison Panel

Previous Approval Timeline

Actions
└── Re-evaluate Completion
```

## Comparison Behavior

Show differences such as:

```text
Exam Result: Failed → Passed
Attendance: 72% → 80%
Payment Validation: Passed → Failed
```

Values must come from the server. UI comparison logic may format data, but must not decide final eligibility.

## Exception Outcome

Possible server outcomes:

```text
No Change
Still Approved
Not Eligible
Manual Workflow Restart Required
Exception Review Required
```

Exact labels depend on implementation enum mapping.

---

# 5.21 SCR-EXC-ADM-021 — Academic Outcome Search

## Purpose

Provide read-only search across Exams, Results, and Completion outcomes.

## Application Service Mapping

```text
SearchAcademicOutcomesQuery
```

## Layout

```text
Search Header
Advanced Filters
Result Tabs
├── Exams
├── Results
└── Completions
```

## Search Fields

```text
Enrollment Number
Student Number
Student Name
Exam Name
Course
Batch
Branch
Date Range
Result Outcome
Completion Outcome
```

## Privacy Rules

- Search by full or partial personal name must remain branch-scoped.
- Do not include Civil ID, passport number, or visa number by default.
- Search results must minimize Person data.

---

# 5.22 SCR-EXC-ADM-022 — Export Center

## Purpose

Generate authorized branch-scoped exports.

## Application Service Mapping

```text
CreateAcademicOutcomeExportCommand
GetAcademicExportOptionsQuery
```

## Layout

```text
Export Type
├── Exam Register
├── Result Register
├── Missing Result Report
├── Completion Evaluation Report
├── Completion Approval Report
└── Re-evaluation Exception Report

Filters
Format
Language
Column Selection
Generate Export
```

## Formats

Where supported by the broader platform:

```text
CSV
XLSX
PDF
```

## Validation

- Export type required.
- Date range valid.
- Requested branches within read/export scope.
- Format supported.
- Language valid.
- Column set from approved allowlist.

## Dynamic States

### Generating

Show:

```text
Preparing export...
```

For large exports, handling must follow architecture/NFR design. The UI must not claim background processing unless the application architecture actually supports it.

### No Data

```text
No records match the selected export filters.
```

---

# 5.23 SCR-EXC-ADM-023 — Audit Timeline Drawer

## Purpose

Display audit history for an Exam, Result, CourseCompletion, or approval sequence.

## Application Service Mapping

```text
GetAcademicEntityAuditTimelineQuery
```

## Layout

```text
Drawer Header
Entity Summary

Timeline Items
├── Timestamp
├── Actor
├── Action
├── Old Value Summary
├── New Value Summary
├── Reason
└── Source Context
```

## Rules

- Permission required.
- Branch scope required.
- Sensitive values masked according to security policy.
- Timeline read-only.
- Do not allow audit records to be edited or deleted.

---

# 6. Trainer Portal Screen Specifications

# 6.1 SCR-EXC-TRN-001 — My Exam Tasks

## Purpose

Provide Trainer-specific operational tasks.

## Application Service Mapping

```text
GetMyTrainerAcademicTasksQuery
```

## Sections

```text
Results to Record
Results Requiring Attention
Completion Recommendations Pending
Recently Submitted Actions
```

## Rules

- Data scope based on authenticated TrainerProfile and assignments.
- No branch selector unless Trainer has legitimate multi-branch assignments.
- No general administrative exam creation controls.

---

# 6.2 SCR-EXC-TRN-002 — Exam Result Entry

Equivalent core behavior to SCR-EXC-ADM-006 and SCR-EXC-ADM-007, with reduced administrative controls.

## Differences

- Only assigned/authorized Exams.
- No exam lifecycle management.
- No result finalization unless explicitly granted.
- No cross-branch consolidated search.
- Mobile/tablet responsive layout emphasized for classroom use.

## Responsive Layout

Desktop:

```text
Full editable grid
```

Tablet:

```text
Sticky student identifier columns
Horizontal scroll for result fields
```

Mobile:

```text
Card-per-student result entry
Student Name
Enrollment Number
Marks Input
Derived Preview
Save
```

---

# 6.3 SCR-EXC-TRN-003 — My Completion Recommendations

Equivalent to Trainer Recommendation Queue, scoped to current trainer.

## Table / Card Fields

```text
Student
Course
Batch
Evidence Summary
Evaluation Date
Pending Age
Action
```

---

# 6.4 SCR-EXC-TRN-004 — Completion Recommendation Detail

Equivalent to SCR-EXC-ADM-014.

Trainer Portal must reuse:

```text
GetCompletionApprovalDetailQuery
RecommendCompletionCommand
DeclineCompletionRecommendationCommand
```

No duplicate trainer-specific business logic may be introduced.

---

# 6.5 SCR-EXC-TRN-005 — My Submitted Academic Actions

## Purpose

Read-only history of the Trainer's result submissions and completion recommendations.

## Application Service Mapping

```text
GetMyAcademicActionHistoryQuery
```

## Filters

```text
Date Range
Action Type
Course
Batch
Status
```

## DDD Fit

This is a read projection over module audit/action data. It must not become a second source of result or completion truth.

---

# 7. Student Portal Screen Specifications

# 7.1 SCR-EXC-STU-001 — My Exams

## Purpose

Show the authenticated student's upcoming and historical Exams for their Enrollments.

## Application Service Mapping

```text
GetMyEnrollmentExamsQuery
```

## Layout

```text
Upcoming Exams
Past Exams
```

## Card Fields

```text
Exam Name
Course
Batch
Exam Date
Status visible to student
```

Do not expose internal exam management states if not intended for student communication.

---

# 7.2 SCR-EXC-STU-002 — My Results

## Purpose

Show result outcomes that are approved for student visibility.

## Application Service Mapping

```text
GetMyPublishedResultsQuery
```

## Fields

```text
Course
Exam
Marks, when publication policy allows
Maximum Marks
Grade
Result Outcome
Published/Available Date
```

## Rules

- Only authenticated student's own Enrollment results.
- Do not expose draft/unfinalized Result.
- Publication visibility policy must be server-driven.
- Do not expose correction audit details.

---

# 7.3 SCR-EXC-STU-003 — My Completion Status

## Purpose

Show student-facing progress toward completion.

## Application Service Mapping

```text
GetMyCompletionStatusQuery
```

## Layout

```text
Course / Enrollment Header

Completion Progress
├── Attendance Requirement
├── Exam Requirement
├── Payment Requirement
├── Approval Requirement
└── Overall Completion Status
```

## Evidence Labels

Student-facing labels may be:

```text
Completed
Pending
Action Required
Not Required
Under Review
```

Internal approval stage names should only be shown if product policy explicitly allows them.

## Critical Rule

The screen receives a server-provided summary. It must not compute:

```text
attendance % >= min attendance
marks >= pass marks
invoice outstanding == 0
```

on the client.

---

# 7.4 SCR-EXC-STU-004 — Completion Evidence Detail

## Purpose

Provide a student-readable explanation of completion requirements.

## Layout

```text
Requirement
Current Outcome
Required Threshold
Last Updated
```

Possible items:

```text
Attendance
Exam
Payment Validation
Management Approval
```

The screen must avoid exposing internal Finance details beyond the approved student-facing payment validation status.

---

# 8. Reusable UI Components

## 8.1 `ExamStatusBadge`

Props conceptually:

```text
status
localizedLabel
```

Responsibilities:

- semantic label;
- icon;
- accessible text.

Must not:

- determine allowed transitions;
- derive status from dates.

---

## 8.2 `ResultOutcomeBadge`

Displays:

```text
Passed
Failed
Not Recorded
```

or implementation-approved localized equivalents.

Outcome comes from server.

---

## 8.3 `CompletionEvidenceCard`

Fields:

```text
criterion
required
currentValue
threshold
outcome
sourceUpdatedAt
```

Supported outcomes:

```text
Passed
Failed
Missing
Not Required
Unavailable
```

Must not calculate criterion result in UI.

---

## 8.4 `ApprovalTimeline`

Displays ordered stages:

```text
Trainer Recommendation
Academic Coordinator Review
Branch Manager Approval
```

Each stage:

```text
status
actor
timestamp
remarks
```

The UI does not decide next stage. Server returns allowed actions.

---

## 8.5 `BranchScopeIndicator`

Shows:

```text
Current Branch
Consolidated View
Read-only scope warning
```

Useful warning:

```text
You are viewing consolidated data. Some actions may only be available within branches where you have mutation access.
```

---

## 8.6 `PermissionGuard`

Client-side usability component only.

It may:

- hide buttons;
- disable menu entries;
- prevent accidental navigation.

It must not replace server authorization.

---

## 8.7 `AcademicAuditTimeline`

Reusable for:

```text
Exam
Result
CourseCompletion
CompletionApproval
```

Displays immutable history.

---

## 8.8 `EvidenceFreshnessIndicator`

Shows server-provided:

```text
Last evaluated
Evidence updated after evaluation
Re-evaluation required
```

It must not determine staleness solely from local timestamps unless the backend explicitly provides that contract.

---

## 8.9 `DataTable`

Required behaviors:

- server pagination;
- server sorting;
- server filtering;
- accessible keyboard navigation;
- column visibility preference;
- stable row keys;
- no domain mutation embedded in optimistic client-only state.

---

# 9. Dynamic UI States

# 9.1 Validation Error States

## Field-Level Errors

Examples:

```text
Exam name is required.
Maximum marks must be greater than zero.
Pass marks cannot exceed maximum marks.
Marks cannot be negative.
Marks exceed the maximum marks for this exam.
Correction reason is required.
Rejection reason is required.
```

Behavior:

- associate error with field using accessible description;
- move focus to first invalid field on failed submit;
- preserve other valid values;
- do not use color alone.

## Business Rule Errors

Examples:

```text
The selected batch does not belong to the selected course.
This result has already been finalized.
This completion case is no longer awaiting coordinator review.
The underlying evidence changed after you opened this page.
You do not have permission to modify records for this branch.
```

Business errors appear in a page-level alert and, where appropriate, near the affected action.

---

# 9.2 Loading Skeletons

## List Pages

Show:

- header immediately;
- filter bar placeholder only if options are loading;
- table skeleton rows;
- pagination placeholder.

## Detail Pages

Show:

```text
Header skeleton
Summary card skeletons
Section skeletons
Action area skeleton
```

Avoid showing fake domain values such as:

```text
Passed
Approved
100%
```

during loading.

---

# 9.3 Empty States

Empty state must distinguish:

1. no data exists;
2. no data matches filters;
3. user has no assigned tasks;
4. user lacks permission.

Examples:

### No Exams

```text
No exams found
No exams exist for the selected scope.
```

With create permission:

```text
Create Exam
```

Without create permission:

No create button.

### No Filter Match

```text
No results match your filters.
Clear filters or change the search criteria.
```

### No Trainer Tasks

```text
You have no pending academic tasks.
```

### No Access

Use dedicated authorization state rather than an empty table:

```text
You do not have access to this section.
```

---

# 9.4 Permission-Based Hiding and Disabling

## Hide

Use hide when the user never has the capability in the current context.

Example:

- hide `Correct Result` if user lacks `result.correct`.

## Disable

Use disabled state when the user has capability but the entity state currently blocks action.

Example:

```text
Close Exam
Disabled: Results must satisfy the server finalization policy before this exam can be closed.
```

## Read-Only

Use read-only when the user can view but not mutate.

Example:

- consolidated branch view.

## Server Authority

Every action must still be checked server-side for:

```text
permission
branch
domain eligibility
entity state
version
```

---

# 9.5 Concurrency Conflict State

Pattern:

```text
This record changed after you opened it.
Review the latest version before applying your changes.
```

Actions:

```text
Reload Latest
Cancel
```

For result-entry grids:

- mark conflicted row;
- prevent overwrite;
- allow unaffected rows according to command transaction policy.

---

# 9.6 Dependency Unavailable State

Example:

```text
Payment validation is temporarily unavailable.
Completion cannot be approved until authoritative payment validation is available.
```

Do not:

- assume pass;
- let user manually toggle pass;
- calculate from cached copied financial data.

---

# 9.7 Evidence Changed State

Display when backend reports stale evaluation:

```text
Completion evidence has changed since the last evaluation.
Re-evaluation is required before approval can continue.
```

Disable approval buttons until current evaluation is restored.

---

# 10. Bilingual Layout Rules

# 10.1 General Rules

Supported presentation modes:

```text
English: LTR
Arabic: RTL
```

The same domain records and identifiers are used in both modes.

Do not create:

```text
separate English Exam entity
separate Arabic Exam entity
```

Localization affects presentation only.

---

# 10.2 Document Direction

English:

```html
<html dir="ltr" lang="en">
```

Arabic:

```html
<html dir="rtl" lang="ar">
```

Direction must be set at application/page shell level.

---

# 10.3 Layout Mirroring

## English LTR

```text
[Back] Page Title                          [Primary Action]

Label: Value
```

## Arabic RTL

Visual order mirrors naturally:

```text
[Primary Action]                          Page Title [Back]

Value :Label
```

Use logical CSS properties:

```text
margin-inline-start
margin-inline-end
padding-inline-start
padding-inline-end
inset-inline-start
inset-inline-end
text-align: start
```

Avoid hardcoded directional CSS:

```text
margin-left
margin-right
left
right
```

unless the element is intentionally non-directional.

---

# 10.4 Tables in RTL

Rules:

- table flow should follow RTL page direction;
- first logical business column appears at the inline start;
- numeric values remain readable with locale-aware formatting;
- codes such as `ENR-2026-0001` and `EX-001` should use bidi isolation;
- action menus remain aligned to logical inline end;
- sort icons mirror placement but not semantic meaning.

Recommended rendering for codes:

```html
<bdi>ENR-2026-0001</bdi>
```

---

# 10.5 Forms in RTL

- Labels align to start.
- Required indicator remains adjacent to label.
- Validation icon placement uses inline-end.
- Date picker follows locale display conventions while API values remain canonical.
- Numeric fields must preserve unambiguous numeric entry.
- Course/Batch search should support Arabic and English display values where available.

---

# 10.6 Mixed Language Content

Examples include:

```text
Course code + Arabic course name
Batch code + localized title
Enrollment number + Arabic student name
```

Use isolated spans/bidi isolation.

Example conceptual layout:

```text
<bdi>CRS-101</bdi> — دورة السلامة والصحة المهنية
```

---

# 10.7 Status Localization

Status labels must come from approved localization mapping.

Example:

```text
Approved
معتمد
```

The application must not persist localized display strings as domain status truth.

Persist:

```text
APPROVED
```

Display localized label according to language.

Exact enum values must match implementation schema.

---

# 10.8 Dates and Timezone

- Institute timezone defaults must follow configured Oman deployment timezone.
- API date/time contracts should remain canonical.
- UI displays localized dates.
- Switching language must not change the underlying Exam date.
- Avoid timezone conversion that changes a date-only exam date unintentionally.

---

# 10.9 Icons

Directional icons must mirror:

```text
Back arrow
Next/Previous chevrons
Breadcrumb separators
Drawer direction
```

Non-directional icons must not mirror:

```text
Calendar
Search
Download
Warning
Check
Close
```

---

# 10.10 Charts and Progress Indicators

When used:

- labels localized;
- legends follow direction;
- numeric semantics unchanged;
- do not reverse progress meaning simply because page is RTL.

---

# 11. Accessibility Requirements

All Module 10 screens must support:

- keyboard navigation;
- visible focus indicator;
- screen-reader labels;
- error summaries linked to fields;
- status text in addition to color;
- accessible dialogs with focus trap;
- accessible table headers;
- localized `aria-label` text;
- logical reading order in both LTR and RTL.

Result entry grids must support keyboard-efficient entry without sacrificing validation clarity.

---

# 12. Responsive Behavior

## 12.1 Desktop

Primary mode for:

- bulk result entry;
- large approval queues;
- exports;
- audit review.

## 12.2 Tablet

Must support:

- Trainer result entry;
- recommendation review;
- approval actions;
- queue search.

Use:

- sticky key columns;
- horizontal table scroll where unavoidable;
- bottom action bar for primary action.

## 12.3 Mobile

Mobile is acceptable for:

- read-only detail;
- Trainer recommendation;
- single-result entry;
- simple approval decision.

Bulk entry should not force a dense spreadsheet grid on narrow devices. Use responsive card flow or recommend desktop/tablet for bulk operations without blocking access unnecessarily.

---

# 13. Route Structure Recommendation

Conceptual route structure:

```text
/admin/academics/exams-completion
/admin/academics/exams-completion/exams
/admin/academics/exams-completion/exams/new
/admin/academics/exams-completion/exams/[examId]
/admin/academics/exams-completion/exams/[examId]/edit
/admin/academics/exams-completion/exams/[examId]/results
/admin/academics/exams-completion/exams/[examId]/results/bulk
/admin/academics/exams-completion/exams/[examId]/finalize

/admin/academics/exams-completion/completion
/admin/academics/exams-completion/completion/[courseCompletionId]
/admin/academics/exams-completion/approvals/trainer
/admin/academics/exams-completion/approvals/coordinator
/admin/academics/exams-completion/approvals/final
/admin/academics/exams-completion/reevaluation
/admin/academics/exams-completion/reevaluation/[courseCompletionId]
/admin/academics/exams-completion/exports
```

Route structure is an application concern and must not be interpreted as aggregate ownership.

---

# 14. Screen-to-Use-Case Mapping

| Screen | Use Case / Application Service |
|---|---|
| SCR-EXC-ADM-001 | UC-EXC-009 |
| SCR-EXC-ADM-002 | SearchExamsQuery |
| SCR-EXC-ADM-003 | UC-EXC-001 |
| SCR-EXC-ADM-004 | UC-EXC-002 |
| SCR-EXC-ADM-005 | UC-EXC-002 |
| SCR-EXC-ADM-006 | UC-EXC-003 |
| SCR-EXC-ADM-007 | UC-EXC-003 |
| SCR-EXC-ADM-008 | UC-EXC-004 |
| SCR-EXC-ADM-009 | UC-EXC-004 / UC-EXC-005 |
| SCR-EXC-ADM-010 | UC-EXC-005 |
| SCR-EXC-ADM-011 | UC-EXC-006 / UC-EXC-009 |
| SCR-EXC-ADM-012 | UC-EXC-006 |
| SCR-EXC-ADM-013 | UC-EXC-007 / UC-EXC-009 |
| SCR-EXC-ADM-014 | UC-EXC-007 |
| SCR-EXC-ADM-015 | UC-EXC-007 / UC-EXC-009 |
| SCR-EXC-ADM-016 | UC-EXC-007 |
| SCR-EXC-ADM-017 | UC-EXC-007 / UC-EXC-009 |
| SCR-EXC-ADM-018 | UC-EXC-007 |
| SCR-EXC-ADM-019 | UC-EXC-008 / UC-EXC-009 |
| SCR-EXC-ADM-020 | UC-EXC-008 |
| SCR-EXC-ADM-021 | SearchAcademicOutcomesQuery |
| SCR-EXC-ADM-022 | UC-EXC-010 |
| SCR-EXC-ADM-023 | Audit read use case |
| SCR-EXC-TRN-001 | UC-EXC-009 |
| SCR-EXC-TRN-002 | UC-EXC-003 |
| SCR-EXC-TRN-003 | UC-EXC-007 |
| SCR-EXC-TRN-004 | UC-EXC-007 |
| SCR-EXC-TRN-005 | Trainer action-history read query |
| SCR-EXC-STU-001 | Student-owned exam visibility query |
| SCR-EXC-STU-002 | Student-published result query |
| SCR-EXC-STU-003 | Student completion-summary query |
| SCR-EXC-STU-004 | Student completion-evidence summary query |

---

# 15. DDD Fit Check Matrix

| Screen / Group | Owning Context | Consumed Contexts | UI Boundary Rule |
|---|---|---|---|
| Exam screens | Exam & Completion | Course Catalog, Training Delivery, IAM, Organization | UI sends exam commands only |
| Result entry | Exam & Completion | Enrollment, Training Delivery, Person/Party, IAM | Roster comes from server; UI does not create learner-course relationships |
| Completion evaluation | Exam & Completion | Course Catalog, Attendance, Finance, Enrollment | UI displays evidence; server evaluates |
| Trainer recommendation | Exam & Completion | Trainer Management, Training Delivery, IAM | Server validates trainer assignment |
| Coordinator review | Exam & Completion | IAM, Audit | Ordered workflow enforced server-side |
| Final approval | Exam & Completion | IAM, Enrollment, Certificate downstream boundary | UI does not create Certificate |
| Re-evaluation | Exam & Completion | Attendance, Finance, Enrollment, Certificate downstream notification | UI cannot mutate source evidence |
| Export | Exam & Completion read model | IAM, Audit | Export remains branch-scoped |
| Student result view | Exam & Completion query | Enrollment identity scope | Read-only own data |
| Student completion view | Exam & Completion query | Attendance/Finance summarized through server | No client evaluation |
| Audit timeline | Audit & Compliance / module audit query | Module entities | Read-only immutable history |

---

# 16. Explicit UI Anti-Patterns

The following are prohibited:

## 16.1 Client-Side Completion Decision

Prohibited:

```ts
const completed =
  attendancePercentage >= minimumAttendance &&
  examPassed &&
  outstandingAmount === 0;
```

Required:

```text
UI requests completion evaluation.
Server loads authoritative rule and evidence.
Server returns evaluation outcome.
UI renders outcome.
```

---

## 16.2 Role Name Authorization

Prohibited:

```ts
if (user.role === "Branch Manager") {
  showApproveButton();
}
```

Required:

```text
Use permission capability + branch scope + server state.
```

---

## 16.3 Client-Trusted Branch

Prohibited:

```text
POST /completion/approve
{
  "branchId": "BR-001",
  "approved": true
}
```

with branch authorization based only on submitted `branchId`.

Required:

- server loads entity branch;
- server intersects with user branch authority;
- server validates permission and state.

---

## 16.4 Certificate Generation from Final Approval Screen

Prohibited button:

```text
Approve Completion & Generate Certificate
```

Required:

```text
Approve Completion
```

Certificate Management later consumes eligible outcome through defined boundary.

---

## 16.5 Attendance Editing from Completion Screen

Prohibited:

- inline attendance override;
- manually toggling attendance pass/fail.

Required:

- link to Attendance context if user is authorized;
- return to completion evaluation after authoritative correction.

---

## 16.6 Payment Override from Completion Screen

Prohibited:

- “Mark payment completed” checkbox;
- manually overriding invoice balance.

Required:

- show Finance-provided validation outcome;
- route Finance corrections through Finance module.

---

# 17. Screen-Level Acceptance Summary

A screen is acceptable only when:

1. every mutation maps to a Module 10 application command;
2. every query maps to an approved query/read model;
3. branch scope is enforced server-side;
4. client-side permission hiding is not the only authorization mechanism;
5. completion criteria are not evaluated in the browser;
6. result status is not accepted as arbitrary client truth;
7. certificate generation is not embedded in completion approval UI;
8. Attendance and Finance data are displayed as authoritative summaries, not copied ownership;
9. loading, empty, validation, permission, and concurrency states are explicitly handled;
10. English and Arabic layouts remain semantically equivalent;
11. Student and Trainer portal screens reuse the same bounded-context services;
12. any status or field absent from the actual Prisma schema is treated as a model-mapping gap, not silently persisted.

---

# 18. Implementation Readiness Notes

Before development begins, the implementation team must validate the following against `schema.prisma` and existing application conventions:

```text
1. Exact Exam.status enum values.
2. Exact Result.resultStatus enum values.
3. Whether result finalization has dedicated persistence fields.
4. Whether correction history is represented only in AuditLog or additionally elsewhere.
5. Exact CourseCompletion.completionStatus enum values.
6. Exact CompletionApproval.status values.
7. Whether CompletionApproval can represent superseded/re-evaluation history.
8. Existing permission catalog naming conventions.
9. Existing branch-scoping middleware/policy helpers.
10. Existing localized text component conventions.
11. Existing table/grid component capabilities.
12. Existing export infrastructure and supported formats.
```

No screen should force a persistence design that contradicts the DDD context map, ER model, or actual Prisma schema.
