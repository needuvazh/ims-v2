## Why

The current Exam and Completion management flows suffer from high friction and lack consistent UX alignment:
- The Exam List view is inconsistent with other module layouts, missing standard search/filtering, pagination, and layout styles.
- Creating an exam allows scheduling on past dates and displays inactive/deleted/draft batches, causing data-entry errors.
- The exam result roster is isolated in a separate, multi-step page sequence (Draft -> Schedule -> Open for Results -> Manage Results -> Close). This introduces excessive clicks for trainers and coordinators.
- The Course Completion list view lacks batch, course, and student search filters, making it hard to find students eligible for certificate generation.
- The completion status of "EvidenceIncomplete" does not explain which requirements are unmet, leaving administrators in the dark.
- The multi-level manual approval flow (Trainer Recommendation -> Coordinator Review -> Final Approval) is unnecessarily long and complex. A collapsed single-step approval process is required.

## What Changes

### 1. Exam List & Creation Alignment
- **Exams List**: Redesign the page layout to use `@ims/shared-ui`'s `ResponsiveDataTable` and standard filtering/search blocks (Course, Batch, Status). Implement server-side pagination with the `@ims/shared-ui` `Pagination` component.
- **Batch Selection Filter**: Restrict the batch dropdown on the create exam screen to only display batches with status `InProgress` or `Completed`.
- **Exam Date Validation**: Restrict exam scheduling by validating that the exam date is in the future.

### 2. Unified Exam Detail & Results Roster
- **Merge View**: Integrate the results roster directly into the bottom of the Exam Detail page, eliminating the separate results roster page.
- **Chained Activation**: Replace the intermediate "Schedule" and "Open for Results" buttons for Draft exams with a single "Open for Results" action that schedules and activates the exam in one click.
- **Embedded Editing**: Render editable inputs (marks and grade) directly inside the roster table on the detail page when the exam status is `OpenForResultEntry`. Add a "Save Roster Marks" button at the bottom.
- **Locking Entry**: Provide a "Complete Exam" button that locks results and closes the exam, changing the roster to a read-only table.

### 3. Course Completion Checklist & Flow Collapsing
- **Completions Filtering**: Add filters (Course, Batch, Search) to the Course Completions index view.
- **Incomplete Reasons Checklist**: Expose evidence validation outcome fields (`attendanceOutcome`, `examOutcome`, `paymentOutcome`) and display a clear checklist detailing exactly why a completion is `EvidenceIncomplete`.
- **Collapsed Workflow**: Transition eligible course completions straight to `AwaitingFinalApproval` when automated checks pass. Enable a single approval action for any authorized actor (Coordinator or Branch Manager), bypassing the previous multi-step sequential recommendation/review phases.

## Capabilities

### New Capabilities
- `exam-completion-optimization`: Unified, low-friction scheduling and result roster entry combined with a collapsed course completion evaluation and single-step approval flow.

### Modified Capabilities
- None

## Impact

- **Bounded Context**: Exam & Completion Bounded Context (`packages/exam-result-completion`).
- **Affected UI Modules**:
  - `apps/admin-portal/app/(protected)/exam-completion/exams/...`
  - `apps/admin-portal/app/(protected)/exam-completion/completions/...`
- **Affected Backend Packages**:
  - `packages/exam-result-completion/src/domain/aggregates/...`
  - `packages/exam-result-completion/src/application/commands/...`
  - `packages/exam-result-completion/src/application/queries/...`
- **Database & Outbox Impact**:
  - Maintains schema backward compatibility by reusing existing DB models and statuses.
  - Re-evaluating completion status correctly publishes outbox domain events to trigger certificate generation.
- **Authorization**:
  - Exam operations require `exam.*` permissions.
  - Results operations require `result.*` permissions.
  - Unified completion approval requires `completion.coordinator-review` or `completion.final-approve` permissions.
- **Testing**:
  - Update unit and application service tests for the modified completion evaluation rules and collapsed approval transition workflows.
