## Context

Currently, the scheduling UI fetches trainer eligibility status via the eligible-trainers API. When a conflict exists, the backend returns a flat `eligible: false` flag and flags `TRAINER_NOT_AVAILABLE` regardless of whether the conflict is a leave overlap, a scheduled session overlap, or a lack of weekly availability slots. 
Furthermore, when editing a session, the current session is not excluded, causing self-overlaps.

## Goals / Non-Goals

**Goals:**
* Add `sessionId` query parameter to the eligible-trainers API and exclude it from the session conflicts check.
* Differentiate conflict reasons into `TRAINER_ON_LEAVE`, `SESSION_OVERLAP`, and `TRAINER_NOT_AVAILABLE` reason codes.
* Return structured overlapping session details in a `conflicts` array on the trainer object.
* Implement a dialog modal in `SessionScheduleForm` to show detailed conflicts, replacing the collapsible checklist.

**Non-Goals:**
* Bypassing course authorization checks (these remain strict blocks).
* Modifying venue or classroom validation algorithms.

## Decisions

### 1. Backend API & DTOs
* Pass `sessionId?: string` inside `findEligibleTrainers` input options.
* Update `prisma.session.findMany` inside `prisma-trainer-management-repository.ts` to exclude the target session:
  ```typescript
  ...(input.sessionId ? { id: { not: input.sessionId } } : {})
  ```
* Include `batch` relation inside the session query to retrieve the `batchCode` for conflicts.
* Update `TrainerEligibilityResult` reason codes union type in `trainer.ts`:
  ```typescript
  reasonCodes: Array<
    | 'TRAINER_NOT_FOUND'
    | 'PROFILE_INACTIVE'
    | 'PROFILE_OUTSIDE_EFFECTIVE_PERIOD'
    | 'COURSE_NOT_AUTHORIZED'
    | 'TRAINER_NOT_AVAILABLE'
    | 'BRANCH_SCOPE_DENIED'
    | 'TRAINER_ON_LEAVE'
    | 'SESSION_OVERLAP'
  >;
  ```

### 2. UI Layout for Trainer Details Dialog
Instead of inline expansion, clicking "Show details" on a trainer card will open a dialog box with:
```
┌──────────────────────────────────────────────┐
│ Trainer Availability & Details               │
├──────────────────────────────────────────────┤
│ Name: John Doe                               │
│ Email: john@example.com                      │
│                                              │
│ [Check] Profile Active & Branch Scope        │
│ [Check] Course Authorized                    │
│ [X] Leave Status: Trainer on Leave           │
│                                              │
│ Overlapping Sessions:                        │
│ 12 Oct 2026, 09:00-11:00   [ Batch: B123 ]   │
│                                   [ Close ]  │
└──────────────────────────────────────────────┘
```

## Risks / Trade-offs

* **Risk**: Increasing the API query size by including batch relations.
  - **Mitigation**: The search is scoped to the target date only, so the number of overlapping sessions is extremely small (typically 0 to 2 records per trainer). Performance impact will be negligible.
