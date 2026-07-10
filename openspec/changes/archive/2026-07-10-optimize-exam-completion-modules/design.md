## Context

The current ASTI Institute Management System (IMS) has a functional Exam & Completion module, but it suffers from high friction:
1. The Exams List page has inconsistencies in layout, lacking standard filtering and correct pagination.
2. Draft exams can be created for past dates and for inactive batches, introducing data entry errors.
3. Managing exam results requires navigating through multiple screens and state transitions (Draft -> Schedule -> Activate -> Manage results -> Close).
4. The Course Completion module lacks robust filtering and does not specify why a course completion is marked as `EvidenceIncomplete`.
5. The manual approval flow for completions is excessively long (Trainer Recommendation -> Coordinator Review -> Final Approval).

## Goals / Non-Goals

**Goals:**
- Align the Exam list view with the rest of the application's clean design system (headers, standard filters, pagination).
- Restrict batch selection to `InProgress` and `Completed` status, and validate that exam dates must be in the future.
- Merge the Results Roster directly into the Exam Details page, introducing direct inline marks/grade entry and a single-click transition to open results.
- Add Batch, Course, and Student Name search filters to the Course Completions index view.
- Expose the exact criteria failure reasons (`attendanceOutcome`, `examOutcome`, `paymentOutcome`) on the completion detail checklist view.
- Collapse the multi-stage manual approval workflow to a single-step sign-off process.

**Non-Goals:**
- Modifying the core relational schema or introducing a migration (we will reuse existing database fields and status columns).
- Altering the rules of third-party certificate issuance or online payment integrations.

## Decisions

### 1. Unified Exam View & Action Chaining
- We will consolidate `/exam-completion/exams/[id]` and `/exam-completion/results` pages.
- The results roster will load directly inside `exams/[id]/page.tsx` by querying all batch enrollments and merging them with any recorded results.
- In `ExamDetailClient`:
  - When the exam is `Draft`, clicking **"Open for Results"** will execute two sequential API calls (`/api/v1/exams/[id]/schedule` then `/api/v1/exams/[id]/activate`), transitioning the exam state instantly to `OpenForResultEntry`.
  - When the status is `OpenForResultEntry`, the results list will render text input boxes for marks and grade. Clicking **"Save Roster Marks"** submits bulk data to `/api/v1/results/bulk/submit`.
  - A **"Complete Exam"** action button calls `/api/v1/exams/[id]/close` to transition the status to `Closed` and switch the inputs back to read-only labels.

### 2. Collapsing Course Completion Approval Workflow
- In `EvaluateCompletionCommandHandler`, if all automated evidence checks (attendance, exam pass, fee clearance) pass and `manualApprovalRequired` is true, we will set the state to `AwaitingFinalApproval` directly.
- Bypassing the `AwaitingTrainerRecommendation` and `AwaitingCoordinatorReview` states collapses the workflow to a single approval step.
- In the UI (`CompletionDetailClient`), we will show a single **"Approve Course Completion"** card that directly executes the `/final-approve` action, bypassing recommendation and coordinator review actions.

### 3. Exposing Completion Evidence Statuses
- We will modify the `GetCompletionDetailQueryHandler` to select and return `attendanceOutcome`, `examOutcome`, and `paymentOutcome` from the database.
- In `CompletionDetailClient`, we will display a checklist panel listing these outcome statuses so the admin can instantly identify why a completion is marked `EvidenceIncomplete`.

## Risks / Trade-offs

- **Workflow Simplification**: By collapsing the 3-step approval sequence to 1 step, any historical records currently stuck in intermediate statuses (`AwaitingTrainerRecommendation`, `AwaitingCoordinatorReview`) will need to be reevaluated (which resets them to the new single-step flow) or manual actions will need to bypass checks. This is a minor trade-off that dramatically simplifies the operational workload.
