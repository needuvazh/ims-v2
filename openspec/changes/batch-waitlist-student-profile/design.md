## Context

The batch waitlist already exists, but the candidate identity changed from the old student model to `StudentProfile`. This design document addresses critical security, concurrency, and naming alignment gaps identified during architectural reviews of waitlist promotion and enrollment integration.

## Goals / Non-Goals

**Goals:**
- Update waitlist queuing and scoping to `StudentProfile`.
- Refactor the logical reference field on the `WaitingList` model from `studentId` to `studentProfileId` to resolve naming drift across the entire boundary (including DB schema, repository mappers, domain models, outbox payloads, API routes, and tests).
- Enforce candidate validation rules (active profile status, valid lead stages, and branch scope matching) prior to waitlisting.
- Standardize the waitlist management permission to `waitinglist.manage` to align with the authoritative Module 04 specification.
- Resolve the promotion concurrency race condition (seat-stealing) by counting waitlist reservations during capacity checks and explicitly implementing a bypass check for promoted candidates.
- Secure the worker handoff by tracking `enrollmentId` on waitlist entries and enforcing database-level enrollment uniqueness invariants.

**Non-Goals:**
- Redesigning batch delivery statuses, sessions, or scheduling logic.

## Decisions

### 1. Permission Name Standardization
*   We will standardize on **`waitinglist.manage`** as the canonical permission name, replacing `batch.waitlist.manage`.
*   The scope of the rename covers:
    *   The database seed data (`seed.ts`).
    *   API route guards in `/api/v1/batches/[id]/waitlist/**/*`.
    *   Protected server actions in `apps/admin-portal/app/(protected)/batches/actions.ts` (e.g. `assertPermission('waitinglist.manage')`).
    *   Permission check utilities, components, and all integration/unit tests.

### 2. State Model and Terminal Promotion State
*   We will **keep `Promoted` as the terminal reservation state** in the waitlist status state machine. We will *not* introduce a new `'Resolved'` status to the database.
*   Once a candidate's enrollment is successfully approved in `EnrollmentService.approveEnrollment`, the corresponding waitlist entry status will transition to **`Removed`** (or soft-deleted by setting `isDeleted = true`) and the `promotionCorrelationId` will be cleared.
*   This status change is owned by the Training Delivery context. `EnrollmentService` will invoke **`BatchService.resolveWaitlistEntry(studentProfileId, batchId, tx)`** inside its active transaction client to perform this status update.

### 3. Capacity Bypass Logic in Enrollment Approval
*   In `EnrollmentService.approveEnrollment`, before the capacity validation block:
    1.  The system checks if there is an active `WaitingList` record for the candidate (`studentProfileId` and `batchId`) with status `Promoted`.
    2.  If such a record exists, this candidate holds a valid promotion reservation. The system **bypasses the capacity check completely** and proceeds directly to approval.
    3.  If no reservation is found, the system calculates `ReservedSeats = ActiveCount + PromotedCount` (where `PromotedCount` is the number of other waitlist entries for that batch currently in `Promoted` status). If `ReservedSeats >= capacity`, the enrollment is redirected to waitlist or rejected.
*   This lookup is done inside the same serializable transaction as the approval to prevent race conditions.

### 4. Complete Scope of `studentId -> studentProfileId` Rename
To prevent contract drift, we will rename `studentId` to `studentProfileId` across all layers:
- **Database Schema:** Rename column `studentId` to `studentProfileId` on `waiting_lists` table.
- **API DTOs:** Zod schemas in `POST /api/v1/batches/[id]/waitlist` will expect `studentProfileId` in the body.
- **Repository Interface & Implementation:** Refactor `BatchRepository` methods (`addWaitlistEntry`, `findActiveWaitlist`, `findWaitlist`, `updateWaitlistEntry`) and DTOs in `packages/training-delivery`.
- **Domain Model:** Refactor `WaitingList` model type and mappers.
- **Outbox Payloads:** The `WaitlistEntryPromoted` and `EnrollmentCreationFailed` outbox event payloads will carry `studentProfileId` and the safety key `promotionCorrelationId`.
- **Worker & Handlers:** Update worker indexing and event parsing in `apps/worker/src`.
- **Tests:** Refactor vitest mock files, route tests, and E2E integration tests.

### 5. Candidate Validation & Branch-Scoping Constraints
*   We codify that **an approved or submitted Admission record must exist for the student profile in the target branch** to allow waitlisting.
*   We will enforce this using `StudentQueryService.verifyBranchScope(studentProfileId, batch.branchId)`. If the student profile is active but has no admission in that branch, enqueuing is rejected with `ERR_AUTH_BRANCH_DENIED` (HTTP 403).
*   For CRM Leads, enqueuing requires `lead.branchId === batch.branchId`. Additionally, we check that `lead.stage !== 'Converted'` and `lead.stage !== 'Lost'`.

### 6. Public vs Internal Waitlist Contracts
*   To preserve boundary safety, the public request DTO `/api/v1/batches/[id]/waitlist` (POST) will **not** accept `enrollmentId`. The public contract only accepts `studentProfileId` or `leadId`.
*   The `enrollmentId` field is reserved for internal command models and is injected strictly by the internal application flows (such as when `EnrollmentService.approveEnrollment` invokes `BatchService.enqueueWaitlist`).

### 7. Concrete Database-Level Uniqueness Strategy
To guarantee safety against concurrent race conditions, we will define partial unique indexes in the PostgreSQL database:
1.  **Enrollment Uniqueness Index:** A partial unique index on the `enrollments` table for `studentProfileId` + `batchId` where `enrollmentStatus` is in `('Draft', 'Submitted', 'Approved', 'Confirmed', 'Active')` and `isDeleted = false`. This guarantees a student profile can have at most one active or pending enrollment for a given batch.
2.  **Waitlist Active Queue Index:** A partial unique index on `waiting_lists` for `studentProfileId` + `batchId` where `status = 'Waiting'` and `isDeleted = false`. A similar partial unique index will be added for `leadId` + `batchId`. This guarantees that duplicate active waitlist entries are blocked at the database level.

### 8. Worker Handoff and Failure Compensation
*   During auto-promotion, the system emits a `WaitlistEntryPromoted` event. The payload carries the candidate's `studentProfileId` (or `leadId`), `enrollmentId` (if waitlisted via the enrollment flow), and a generated `promotionCorrelationId`.
*   **Success Path:** The worker processes `WaitlistEntryPromoted` by calling `EnrollmentService.approveEnrollment(payload.enrollmentId)` (or lookup by student/batch if manual). Once approved, `BatchService.resolveWaitlistEntry` is called to transition the status to `Removed` and clear `promotionCorrelationId`.
*   **Failure Compensation Path:** If the downstream approval step fails (e.g. due to credit limit blocks or document validation failures), the worker handles the failure by publishing an `EnrollmentCreationFailed` outbox event carrying the `promotionCorrelationId`. The worker handles this event by calling:
    `BatchService.revertPromotion(batchId, studentProfileId, leadId, promotionCorrelationId, reason)`
    This transitions the waitlist entry from `Promoted` back to `Held` or `Suspended`, clears `promotionCorrelationId`, decrements the batch count, and triggers a new auto-promotion check.
