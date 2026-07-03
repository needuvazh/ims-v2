## Context

Module 07 (Scheduling) is a supporting domain that coordinates training time and venue availability. The current codebase has a basic `SchedulingService` and `PrismaSchedulingRepository` in `packages/scheduling`, primarily focusing on Business Calendars and Holidays. However, Venue Blocking, comprehensive conflict detection, and the "Conflict Dashboard" workflow are missing. Additionally, the `Session` model currently resides in the `training-delivery` context, which creates a boundary ambiguity regarding who "owns" the timetable state.

## Goals / Non-Goals

**Goals:**
- Implement the `VenueBlock` model and service for hard classroom/branch blocking.
- Create a centralized `ConflictEngine` that validates sessions against 5+ constraints (Holiday, Venue, Trainer, Room, Operating Hours).
- Establish the "Conflict Dashboard" workflow for post-facto resolution of invalidated sessions.
- Provide a robust `ISchedulingService` for the `Batch` module to use during session generation and trainer assignment.
- Ensure strict branch-scoped isolation for all timetable operations.

**Non-Goals:**
- Automated AI-based timetable optimization.
- Integration with external calendars (Google/Outlook).
- Real-time notification delivery (handled by Communication context).

## Decisions

### 1. Timetable State Ownership
**Decision:** The Scheduling context will provide validation and conflict tracking, but the `Session` entity remains the source of truth for "Batch Execution" in the `training-delivery` context.
**Rationale:** A session is a part of a Batch's lifecycle. However, to track conflicts centrally, Scheduling will maintain a "Conflict Index" or query the `Session` table through a shared interface.
**Alternative:** Moving `Session` entirely to Scheduling. Rejected because `Session` is too tightly coupled with `Attendance` and `Completion` (Batch execution).

### 2. Conflict Detection Strategy: Sync vs Async
**Decision:** Use **Synchronous Validation** during Save/Publish actions, and **Asynchronous Re-validation** (via Outbox Events) when a Holiday or Venue Block is created.
**Rationale:** Immediate feedback is needed during manual scheduling. Background processing is necessary when a single holiday creation might affect hundreds of existing sessions.

### 3. "Hard" Venue Blocks vs "Soft" Holidays
**Decision:** Venue Blocks for specific rooms are "Hard Blocks" (strict rejection). Holidays are "Soft Blocks" that can be ignored by authorized Branch Managers with a reason.
**Rationale:** You can't teach in a room under maintenance (physical impossibility), but you *can* choose to teach on a holiday if the business case requires it.

### 4. The Conflict Dashboard Data Model
**Decision:** Add `scheduleStatus` (Draft, Published, Conflict) and `conflictType` (HOLIDAY, VENUE, OVERLAP) fields directly to the `Session` model.
**Rationale:** This allows simple, high-performance querying for the Conflict Dashboard without complex cross-context joins.

## Risks / Trade-offs

- **[Risk] Performance Bottleneck during Bulk Generation** → **Mitigation**: Batch-process conflict checks using set-based logic rather than individual room/trainer queries for every session.
- **[Risk] Concurrent Overlap** → **Mitigation**: Use Prisma's `$queryRaw` with `FOR UPDATE` on trainer/room assignment records during the transaction window to prevent race conditions.
- **[Risk] State Desync** → **Mitigation**: Every session update must pass through the `ConflictEngine` validation before being saved.
