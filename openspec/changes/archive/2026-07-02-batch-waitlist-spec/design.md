## Context

Managing full batches requires queues for learners. This design introduces the `WaitingList` entity, implements aggregate queue mechanisms, reordering API endpoints, branch-scoping authorization guards, and event-driven promotion, reversion, and capacity-increase handlers.

## Goals / Non-Goals

**Goals:**
- Implement `WaitingList` database model with support for failed enrollment reversion states (`Held`, `Suspended`) and a reason field (`statusReason`) to avoid conflation of manual skips and downstream failures.
- Specify a consistent pessimistic locking transaction model for all waitlist write operations to prevent queue position concurrency issues.
- Enforce strict branch scoping and authorization checks (permission `batch.waitlist.manage`) on all waitlist actions.
- Integrate promotion listeners on seat release events and manual capacity increases, publishing standardized `WaitlistEntryPromoted` domain events.
- Integrate reversion listeners on downstream enrollment failure events (`EnrollmentCreationFailed`), reverting promotion state.
- Expose a reactivation endpoint to provide a recovery path for blocked waitlist candidates.
- Resolve waitlist UUIDs to human-readable student/lead names in the UI.

**Non-Goals:**
- Creating student enrollment records directly inside the Batch context (handled asynchronously by Admissions).
- Attendance monitoring, tracking, or completion highlights (which are explicitly scoped to the Attendance/Completion contexts and must not leak into the waitlist changes).

## Decisions

### 1. Database Schema & State Lifecycle
We will add `WaitingList` to `packages/database/prisma/schema.prisma` with the following structure:
*   `WaitingList`: fields `id`, `courseId` (FK), `batchId` (FK), `studentId` (logical reference, NULL if leadId is set), `leadId` (logical reference, NULL if studentId is set), `queuePosition` (Int), `status` (Waiting/Promoted/Removed/Held/Suspended), `statusReason` (String, NULL allowed, records reason for manual skip or downstream enrollment failure), `promotionCorrelationId` (String, NULL allowed, tracks outbox event/cancellation correlations to prevent duplicate accounting drift), and standard audit fields.
*   Indexes: `@@index([courseId])`, `@@index([batchId])`, `@@index([studentId])`, `@@index([leadId])`
*   Constraints: To prevent duplicate active waitlist entries while preserving historical queue records, standard unique constraints will not be used in the DB. Instead, a custom migration will implement PostgreSQL **filtered unique indexes** where `status = 'Waiting'` and `isDeleted = false`:
    ```sql
    CREATE UNIQUE INDEX waiting_lists_student_batch_waiting_idx 
      ON waiting_lists (student_id, batch_id) 
      WHERE status = 'Waiting' AND is_deleted = false;
      
    CREATE UNIQUE INDEX waiting_lists_lead_batch_waiting_idx 
      ON waiting_lists (lead_id, batch_id) 
      WHERE status = 'Waiting' AND is_deleted = false;
    ```

#### Waitlist State Definitions
*   **`Waiting`**: Active status representing a candidate chronologically queued in the FIFO pipeline.
*   **`Promoted`**: Candidate is selected to occupy a seat. Emits a `WaitlistEntryPromoted` event.
*   **`Removed`**: Candidate is manually cancelled or removed from the queue.
*   **`Held`**: Temporary blocker state applied when a promoted candidate's downstream enrollment fails (e.g. temporary doc validation delay, payment delay). The candidate is kept in place but skipped during automated promotions until resolved.
*   **`Suspended`**: Semi-permanent blocker state applied via manual administrative action (e.g. academic pause, disciplinary hold). Excluded from automated promotion checks completely.

#### State Transition Matrix
| Source Status | Target Status | Trigger | Validation / Invariant Checks |
| --- | --- | --- | --- |
| `None` | `Waiting` | Enqueue API | Batch capacity full; candidate not already active in batch roster or waitlist. |
| `Waiting` | `Promoted` | Auto/Manual Promote | Batch has seat capacity available. |
| `Promoted` | `Held` | Downstream Fail | Triggered by `EnrollmentCreationFailed` subscriber. Decrements count by 1. |
| `Waiting` | `Held` | Manual Skip API | Marks candidate as held, populates `statusReason` ("Manual Skip"), shifts rest. |
| `Waiting` / `Held` | `Suspended` | Admin Action | Excludes candidate from promotion check, shifts subsequent positions. |
| `Held` / `Suspended` | `Waiting` | Reactivate API | Re-inserts candidate back into active queue at next sequence position. |
| Any state | `Removed` | Cancel API | Updates status, sets `queuePosition = 0`, shifts remaining active entries. |

### 2. Concurrency Control (Uniform Locking Model)
To prevent race conditions, duplicate queue positions, or gaps during concurrent mutations (enqueue, reorder, promote, skip, remove, reactivate):
*   **Batch Row Lock:** *All* waitlist database transactions must execute a pessimistic write-lock (`SELECT FOR UPDATE`) on the parent `Batch` aggregate row at the very start of the transaction block before reading or modifying any `WaitingList` rows.
*   This serializes all operations on the batch's queue, ensuring that active queue position calculations (such as `active.length + 1` during enqueuing or reactivation, or position shifts during removal) are atomic and consistent.

### 3. Authorization, Scoping & Permission Guard
*   **Canonical Gate:** The permission `batch.waitlist.manage` is the canonical authorization check for all waitlist operations (read, enqueue, manual promote, skip, remove, reactivate, and reorder). The incorrect route wiring to `enrollment.create` must be corrected.
*   **Branch-Scoping Guard:** Every API handler must enforce branch access controls. When a waitlist request is received, the handler must load the Batch row, check if the batch's `branchId` is within the authenticated user's `UserBranchAccess` permission scopes, and throw a `403 Forbidden` response (`ERR_IAM_INSUFFICIENT_PERMISSIONS`) if access is unauthorized.

### 4. Promotion, Reversion & Capacity Increase Accounting (Idempotency)
*   **Event Standardization:** The outbound notification and domain event is standardized to `WaitlistEntryPromoted` (replacing `WaitlistStudentPromoted` to cover both student profiles and CRM leads).
*   **Symmetric Accounting:**
    *   *Auto-Promotion:* When a cancellation occurs (`EnrollmentCancelled`), the system uses a pessimistic write-lock (`SELECT FOR UPDATE`), evaluates the queue, transitions the top waitlist entry to `Promoted`, assigns a unique `promotionCorrelationId` (correlation uuid), and emits `WaitlistEntryPromoted` (carrying the correlation ID). The seat count `currentEnrollmentCount` remains unchanged as the promoted student takes the vacated seat.
    *   *Capacity Increase:* Inside the batch `update` method, if the new capacity is increased beyond the previous capacity, the transaction acquires a write-lock on the Batch row. If active waitlisted entries exist, the system triggers the FIFO waitlist promotion flow for each newly available seat within the same database transaction.
    *   *Reversion:* When downstream enrollment fails (`EnrollmentCreationFailed`), the listener loads the Batch aggregate using a pessimistic lock. It checks if the candidate is in `Promoted` status and if their `promotionCorrelationId` matches the failed transaction. If valid, it transitions the status to `Held` or `Suspended` (populating `statusReason` e.g., "Downstream Enrollment Failed"), decrements `currentEnrollmentCount` by 1, clears the correlation ID, and triggers a new promotion check on the batch. This prevents race conditions and double-decrement/over-promotion drift.

### 5. API Handlers & Guard Rules
*   `POST /api/v1/batches/:id/waitlist`: Enqueues a student or lead on the batch waitlist. Payload accepts optional `studentId` and `leadId` (validates exactly one is set). Enforces parent batch locking.
*   `POST /api/v1/batches/:id/waitlist/promote`: Manually forces promotion of a candidate.
    *   *Identifier:* Uses `waitlistId` in request payload.
    *   *Guard Check:* Enforces capacity check. If `batch.currentEnrollmentCount >= batch.capacity` and `batch.allowOverbooking` is `false`, the handler must reject the request with `409 Conflict` (or `400 Bad Request`) and error code `ERR_CRS_BATCH_FULL`.
*   `POST /api/v1/batches/:id/waitlist/skip`: Manually marks a candidate as `Held` (with reason e.g. "Manual Skip"), and promotes the next candidate. Uses `waitlistId`. Enforces parent batch locking.
*   `DELETE /api/v1/batches/:id/waitlist/:waitlistId`: Cancels/removes a waitlist request, transitioning status to `Removed` and decrementing remaining positions. Enforces parent batch locking.
*   `POST /api/v1/batches/:id/waitlist/reactivate`: Reactivates a held/suspended candidate. Accepts `{ waitlistId: string }`. Moves status back to `Waiting`, assigns next sequence position (`active.length + 1`), and shifts other positions if needed. Enforces parent batch locking.
*   `PUT /api/v1/batches/:id/waitlist/reorder`: Accepts an array of waitlist IDs and updates sequence indices. Enforces parent batch locking.

### 6. Event Name Migration Plan
To transition smoothly from `WaitlistStudentPromoted` to the standardized `WaitlistEntryPromoted` event name:
*   **Event Emitter Refactoring:** Replace all occurrences of `WaitlistStudentPromoted` in `packages/training-delivery` (`batch-service.ts`) and `apps/admin-portal` route handlers to write outbox records with `eventType: 'WaitlistEntryPromoted'`.
*   **Notification Engine Mapping:** Update the Notification template listener configurations and placeholder mappings in the communication context to bind to the new event identifier `WaitlistEntryPromoted`.
*   **Backward Compatibility:** Since downstream handlers are not yet implemented (status "Not Started"), no multi-version mapping or fallback alias is needed. The codebase will standardize strictly on `WaitlistEntryPromoted` as a clean breaking change. All event emissions, outbox records, and consumer listeners will be updated in lockstep.

### 7. UI/UX Refinement
*   **Roster Table UUID Resolution:** In the waitlist table on screen `CRS-SCR-006` (`batch-details-tabs.tsx`), map the raw `studentId` and `leadId` fields to human-readable names using the page's existing `studentsList` and `leadsList` metadata.
*   **Out-of-Scope Cleanups:** Remove all proposed attendance warning highlights and indicators from screen `CRS-SCR-006` roster columns.
