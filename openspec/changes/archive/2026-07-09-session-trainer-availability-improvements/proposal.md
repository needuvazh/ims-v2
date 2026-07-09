## Why

During session scheduling or updating in the Admin Portal, the Trainer Availability View checks if trainers are eligible. However:
1. Approved leaves, weekly availability slots, and session overlaps are all grouped under a generic `TRAINER_NOT_AVAILABLE` reason code. This makes it difficult for administrators to understand exactly why a trainer is unavailable.
2. In edit session workflows, the current session is not excluded from conflict checks. Consequently, the trainer will appear as conflicting with their own session.
3. Detailed information about overlapping sessions is not returned by the API or rendered in the UI, making it impossible to see which conflicting batches/sessions exist.

This change will:
* Differentiate between leaves and session conflicts with specific reason codes.
* Exclude the current session from conflict evaluation by introducing a `sessionId` query parameter.
* Exclude batch trainer assignment overlaps from availability checks (relying only on active leaves and session scheduling overlaps).
* Exclude weekly availability slots from blocking checks if requested, or present detailed conflicts dynamically in a modal dialog.

## What Changes

* **Domain & Application Logic (Trainer Management)**:
  - Update `TrainerEligibilityResult` to include `TRAINER_ON_LEAVE` and `SESSION_OVERLAP` in `reasonCodes` union type in `packages/trainer-management/src/domain/trainer.ts`.
  - Add `conflicts?: SessionConflict[]` to return detailed overlapping session data in `TrainerEligibilityResult`.
  - Update `findEligibleTrainers` repository method in `prisma-trainer-management-repository.ts` to accept `sessionId?: string` and exclude it from the database query.
  - Return distinct status codes (`TRAINER_ON_LEAVE`, `SESSION_OVERLAP`, `TRAINER_NOT_AVAILABLE`) and include conflict lists in results.
* **API Delivery**:
  - Update `apps/admin-portal/app/api/v1/faculty/[...segments]/route.ts` to retrieve and pass `sessionId` query parameter to the application service.
* **Frontend Portal (Admin Portal)**:
  - Add dialog modal state `selectedTrainerForDetails` in `SessionScheduleForm` to show detailed conflicts.
  - Show a clear warning badge like `Leave` or `Overlap` directly on the trainer card.
  - Provide a dialog box detailing course authorization, leaves overlap, and full conflicting session details when the administrator clicks "Show details".

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `faculty-trainer-management`: Differentiate trainer availability checks, exclude target session ID from overlap query, and return structured session conflicts to be displayed in a dialog box.

## Impact

* **Owning Bounded Context**: Faculty / Trainer Management.
* **Affected Contexts**: 
  - Course, Batch & Training Delivery (session scheduling).
* **Business Value**: Enhanced visibility for scheduling managers. Administrators can resolve conflicts efficiently.
* **Authorization & Branch Scope**:
  - Existing branch scope checking is preserved.
* **Persistence & Database**:
  - Queries `TrainerProfile`, `LeaveRequest`, and `Session` tables.
* **Audit & Events**:
  - No new events or audit requirements.
* **Testing Impact**:
  - Add unit tests in `trainer-management-service.test.ts` to verify the new reason codes and `sessionId` exclusion.
