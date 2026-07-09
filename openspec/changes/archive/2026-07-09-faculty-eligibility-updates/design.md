## Context

Currently, the faculty assignment system evaluates trainer eligibility strictly, blocking assignments when trainers have approved leaves or when session overlaps (conflicts) occur. The user wants to adjust this so that:
1. Approved leaves on the selected **Target Assessment Date** strictly block trainer assignment.
2. **Session conflicts** (overlaps) are treated as warnings and do not block batch assignment.
3. The UI allows administrators to view the list of overlapping sessions for any trainer, irrespective of their assignment eligibility.

## Goals / Non-Goals

**Goals:**
* Check trainer leaves on the Target Assessment Date if specified. Mark trainers as ineligible (`eligible = false`) if an approved leave overlaps with that date.
* Treat session conflicts as non-blocking warnings. Mark trainers with only session conflicts as eligible (`eligible = true`).
* Provide an interactive UI in the Admin Portal that displays detailed session conflict information (dates, times, conflicting batch codes, and session numbers) through a modal dialog when a "View Conflicts" button is clicked.
* Relax server-side checks in `assignTrainer` so that session overlaps do not throw a blocking exception (`TrainerScheduleConflict`).

**Non-Goals:**
* Modifying how leave requests themselves are requested, approved, or deleted.
* Re-routing scheduling validation engine constraints for venues, classrooms, or holidays (only trainer session conflicts are relaxed).
* Introducing separate user models for regular, corporate, and walk-in flows.

## Decisions

### 1. Backend Contract & Model Design
We will extend the `FacultyEligibilityResult` interface to return detailed, structured conflict information to the client instead of serializing conflicts purely as free-form string reasons.
```typescript
export interface SessionConflict {
  sessionDate: string; // ISO String
  startTime: string;
  endTime: string;
  batchCode: string;
  sessionNumber?: number;
}

export interface FacultyEligibilityResult {
  trainerId: string;
  trainerCode: string;
  displayName: {
    en: string;
    ar?: string | null;
  };
  trainerType: string;
  branchName?: string;
  status: string;
  eligible: boolean;
  isAssignable: boolean;
  alreadyAssigned: boolean;
  reasonCodes: string[];
  reasons: string[];
  sessionConflicts?: SessionConflict[]; // NEW
  assignment?: {
    role: string;
    assignedFrom: string;
    assignedTo: string;
  } | null;
}
```

### 2. Eligibility Resolution & Leaves Check
* **Target Date Leave Check**:
  In `packages/training-delivery/src/application/batch-service.ts`, if `options.targetDate` is provided, we fetch leaves for the trainer and evaluate if an approved leave overlaps with the `targetDate`. If so, we append `LEAVE_ON_TARGET_DATE` to `reasonCodes` and write a descriptive reason.
* **Non-Blocking Session Overlaps**:
  We evaluate session conflicts as before (adding `SESSION_OVERLAP` to `reasonCodes` and compiling reasons). However, we calculate `isAssignable` (which maps to `eligible` in the UI) by ignoring `SESSION_OVERLAP` in the blocking check:
  ```typescript
  const blockingReasonCodes = uniqueReasonCodes.filter(
    (code) => code !== 'SESSION_OVERLAP'
  );
  const isAssignable = blockingReasonCodes.length === 0;
  ```

### 3. Server-Side Assignment Logic
In `assignTrainer`, we bypass throwing `TrainerScheduleConflict`. This ensures that even if an API consumer bypasses the UI and requests a trainer assignment that has conflicts, the backend writes the assignment to the database successfully.

### 4. Admin Portal UI Design
* We will update `faculty-assignment-client.tsx` to display separate checklist items for **Leaves Overlap** and **Session Conflicts**.
* A new button **View Conflicts** will be rendered inside the trainer's card if `SESSION_OVERLAP` is present.
* The button will open a custom dialog modal containing a list of conflicting sessions, displaying the date, time range, conflicting batch code, and session number for each conflict.

## Risks / Trade-offs

* **Risk**: Multiple trainers could be assigned to overlapping sessions.
  - **Mitigation**: While the system does not strictly block the assignment, the UI displays clear visual markers (`Session Conflicts (Non-blocking)`) and provides full session details, ensuring administrators have complete information before confirming assignment.
* **Risk**: Timezone issues when evaluating `options.targetDate`.
  - **Mitigation**: We split dates by timezone-safe string dates (e.g. `.toISOString().split('T')[0]`) to make comparisons timezone-agnostic.
