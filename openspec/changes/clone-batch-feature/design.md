## Context

Currently, setting up a new batch for an existing course requires the Academic Coordinator to:
1. Create a `Batch` (in `Draft` state) specifying general details.
2. Go to the Batch Details Page, select the Faculty tab, and assign the Primary Trainer.
3. Select the Sessions tab and schedule each session manually one-by-one, or run the recurring generator.

When multiple similar batches need to be scheduled (e.g. OSHA Safety - Batch 01, OSHA Safety - Batch 02, etc.) for different dates or trainers, this manual setup is repetitive. 

This design introduces a **Batch Cloning** flow. It allows a coordinator to copy all batch configuration and session arrangements from a source batch, select a new batch date range and primary trainer, automatically shift all session dates, review and edit them in a single form, and save the entire configuration in one transactional database save.

---

## Goals / Non-Goals

**Goals:**
- Add a "Clone Batch" button to the Batch Details UI.
- Implement `/batches/[id]/clone` route and page.
- Implement `CloneBatchForm` to support copying batch parameters, entering a new timeline and primary trainer, and editing the auto-shifted session list.
- Automatically calculate session date offsets on `newStartDate` change.
- Implement `cloneBatchAction` which validates and creates the Batch, BatchTrainer, and Sessions within a single database transaction.
- Log a `BATCH_CLONED` audit event.

**Non-Goals:**
- Does **not** clone student enrollments or waitlist entries.
- Does **not** bypass existing validation rules (uniqueness, parent course dates, active classrooms/trainers).
- Does **not** block cloning for non-blocking session conflicts (warnings are displayed, but saving is allowed).

---

## Decisions

### D1 — Route Structure: `/batches/[id]/clone`
We will introduce a dedicated clone page rather than overloading `/batches/new` with query parameters. This keeps the client page code clean and isolated.
- The route expects the source batch ID.
- The page fetches the original batch, its primary trainer assignment, and its scheduled sessions.

### D2 — Client-side Auto-Date Shift Logic
When the user edits the "New Start Date" on the clone form, the form component will compute the date difference (offset) in days between the source batch's start date and the new start date:
```typescript
const originalStart = new Date(sourceBatch.startDate);
const newStart = new Date(newStartDateValue);
const diffMs = newStart.getTime() - originalStart.getTime();
const offsetDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
```
It will then iterate through the sessions state array and update each session's date:
```typescript
const updatedSessions = sessions.map(session => {
  const originalSessionDate = new Date(session.originalDate);
  const newSessionDate = new Date(originalSessionDate.getTime() + (offsetDays * 24 * 60 * 60 * 1000));
  return {
    ...session,
    sessionDate: newSessionDate.toISOString().split('T')[0]
  };
});
```
This calculation runs instantly in the browser and updates the session date inputs in the UI table, enabling direct edits.

### D3 — Single Database Transaction
To guarantee consistency, `cloneBatchAction` will wrap all operations in a Prisma transaction (`$transaction`). The steps inside the transaction are:
1. Auto-generate the new unique `batchCode` (based on course code and count suffix) if not explicitly provided.
2. Verify that the new batch dates fall within the parent course's effective dates.
3. Verify user's branch access scoping.
4. Create the new `Batch` record in `Draft` state.
5. Create the primary `BatchTrainer` assignment for the chosen trainer.
6. Validate each session using `schedulingService.validateSession`.
7. Create all `Session` records linked to the new batch.
8. Create a `BATCH_CLONED` audit log.

### D4 — Dynamic Faculty Auto-assignment for Sessions
When a new Primary Trainer is selected on the clone form, all sessions in the list that do not have a trainer override will automatically default to using the new Primary Trainer. The coordinator can still specify a different trainer for specific sessions.

---

## Architecture Sketch

```
Browser (Staff) clicks "Clone Batch" on /batches/[id]
         │
         │ GET /batches/[id]/clone
         ▼
┌──────────────────────────────────────────────────────────┐
│ CloneBatchPage (Server Component)                        │
│ 1. assertPermission('batch.delivery.create')             │
│ 2. Fetch original batch + sessions + primary trainer    │
│ 3. Fetch courses, branch, classrooms, active trainers   │
│ 4. Render CloneBatchForm (Client Component)             │
└──────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│ CloneBatchForm (Client Component)                        │
│ - Prefills inputs with original batch data               │
│ - On NewStartDate change -> recalculates session dates   │
│ - Submits payload to Server Action                       │
└──────────────────────────────────────────────────────────┘
         │
         │ cloneBatchAction(payload)
         ▼
┌──────────────────────────────────────────────────────────┐
│ Server Action (Prisma Transaction)                       │
│ 1. Validate branch permission and access bounds          │
│ 2. Create Batch in 'Draft'                               │
│ 3. Create primary BatchTrainer assignment                │
│ 4. Run conflict check on sessions                        │
│ 5. Create Session records                                │
│ 6. Log BATCH_CLONED audit event                          │
└──────────────────────────────────────────────────────────┘
```
