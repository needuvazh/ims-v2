## Why

Currently, when assigning faculty (trainers) to a batch in the Admin Portal, the system evaluates eligibility by checking for:
1. Course authorization.
2. Branch scope matching.
3. Overlapping leaves during the batch schedule.
4. Overlapping session conflicts (schedule conflicts with other batches).

However, in practice:
* **Session conflicts** should not act as a hard blocker for assigning a trainer to a batch. Instead, they should be treated as warnings, allowing administrators to make manual overrides or adjustments while retaining the visibility of conflict details.
* **Trainer availability on Target Assessment Date** must be explicitly validated. If a trainer has approved leaves on the selected Target Assessment Date, they must be marked ineligible for assignment.

This change aims to optimize the assignment workflow by turning session conflicts into non-blocking warnings while introducing a strict availability check (leave check) on the Target Assessment Date.

## What Changes

* **Domain & Application Logic**: 
  - Enhance `getFacultyEligibilityForBatch` in `packages/training-delivery/src/application/batch-service.ts` to check if the trainer has an approved leave request on the specified `targetDate` (passed as `options.targetDate`). If so, flag the new reason code `LEAVE_ON_TARGET_DATE`.
  - Modify `getFacultyEligibilityForBatch` to return a structured array of conflicts (`sessionConflicts`) containing the date, time, conflicting batch, and session number.
  - Relax eligibility criteria: treat `SESSION_OVERLAP` as a non-blocking reason code. A trainer with session conflicts but no other blocking constraints is now marked `eligible: true` and `isAssignable: true`.
  - Relax assignment constraints: in `assignTrainer`, remove or disable the schedule conflict blocker (`TrainerScheduleConflict` exception) to permit assignments despite conflicts.
* **API Route**:
  - Map `targetDate` parameter from the GET query string `/api/v1/batches/[id]/trainers/eligibility?targetDate=...` properly in the route handler.
* **Frontend Portal (Admin Portal)**:
  - Separate conflict indicators in the trainer card into "Course Authorization", "Leaves Overlap", and "Session Conflicts".
  - Render a "View Conflicts" button when `SESSION_OVERLAP` is present. Clicking this button opens a modal displaying detailed information for all conflicting sessions.
  - Enable the "Assign Faculty" button for trainers with only session conflicts.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `batch-delivery`: Update trainer eligibility rules during batch faculty assignment. Treat session conflicts as non-blocking warnings and check approved leaves on the Target Assessment Date.

## Impact

* **Owning Bounded Context**: Course, Batch & Training Delivery (Training Delivery Management).
* **Affected Contexts**: 
  - Scheduling, Calendar & Holiday Management (checking session overlaps).
  - Attendance & Leave Management (checking approved trainer leave requests).
* **Business Value**: Improved operational flexibility. Administrators can assign the preferred trainer to a batch and resolve schedule conflicts separately (e.g., rescheduling overlapping sessions), rather than being blocked entirely.
* **Authorization & Branch Scope**:
  - The check honors existing permissions (`batch.delivery.assign` for faculty assignment).
  - Branch scope matching between the trainer profile and the batch branch is preserved as a strict blocker.
* **Data Ownership & Persistence**:
  - Reads from `TrainerProfile`, `LeaveRequest`, `Session`, and `BatchTrainer` models.
  - Writes to `BatchTrainer` model during assignment.
  - No database schema migrations are required.
* **Outbox / Domain Events**:
  - Existing `TrainerAssignedToBatch` event will still fire as usual.
* **Audit Impact**:
  - Assignment actions are recorded in existing audit logs.
* **Portal Impact**:
  - Affects the Admin Portal (`apps/admin-portal`) batch faculty assignment UI only. Student and Trainer dashboards remain unaffected.
* **NFR & Performance Impact**:
  - Negligible performance overhead; additional leave checks reuse already-loaded database collections.
* **Testing Impact**:
  - Backend unit and integration tests must verify the updated eligibility rules (e.g., verifying that a trainer with a session conflict is eligible, but a trainer with a leave on the target assessment date is not).
