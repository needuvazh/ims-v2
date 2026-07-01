## Context

Managing full batches requires queues for learners. This design introduces the `WaitingList` entity and implements aggregate queue mechanisms, reordering API endpoints, and event promotion handlers.

## Goals / Non-Goals

**Goals:**
- Implement `WaitingList` database model.
- Configure queue management commands inside the Batch aggregate root.
- Expose reordering endpoints for manual reprioritization.
- Integrate promotion listeners on seat release events, publishing `WaitlistStudentPromoted` domain events.

**Non-Goals:**
- Creating student enrollment records directly inside the Batch context (handled asynchronously by Admissions).

## Decisions

### 1. Database Schema
We will add `WaitingList` to `packages/database/prisma/schema.prisma`:
*   `WaitingList`: fields `id`, `courseId` (FK), `batchId` (FK), `studentId` (logical reference, NULL if leadId is set), `leadId` (logical reference, NULL if studentId is set), `queuePosition` (Int), `status` (Waiting/Promoted/Removed), and standard audit fields.
*   Indexes: `@@index([courseId])`, `@@index([batchId])`, `@@index([studentId])`, `@@index([leadId])`
*   Constraints: Filtered unique constraints `@@unique([studentId, batchId, status])` and `@@unique([leadId, batchId, status])` where status is `Waiting` to prevent double-booking on queue.

### 2. Promotion Integration & Scoping
*   We will implement an event subscriber for `EnrollmentCancelled` (published by Admissions). When triggered, it loads the `Batch` aggregate root using a pessimistic write-lock, evaluates the queue, promotes the first entry, and publishes `WaitlistStudentPromoted`.
*   **Cross-Context Attendance Scoping:** To display attendance warning highlights on screen `CRS-SCR-006` without direct context leakage, the UI queries the active `CourseCompletionRule` (owned by Course Catalog) to extract the `minimumAttendancePercent` threshold, comparing it directly to the student's attendance summary on load.

### 3. API Handlers
*   `POST /api/v1/batches/:id/waitlist` adds an entry.
*   `PUT /api/v1/batches/:id/waitlist/reorder` accepts an array of IDs and updates their sequence indices.

## Risks / Trade-offs

- **Concurrency during Auto-Promotion:** Parallel cancellation events could create race conditions. We manage this using pessimistic lock transactions (`SELECT FOR UPDATE`) on the batch row.
