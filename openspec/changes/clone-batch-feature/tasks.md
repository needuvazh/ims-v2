## 1. Server Action Implementation

- [x] 1.1 In `apps/admin-portal/app/(protected)/batches/actions.ts`, implement `cloneBatchAction` accepting general batch fields, the new primary trainer ID, and a list of session creation inputs.
- [x] 1.2 Assert authentication and verify permissions: require both `batch.delivery.create` and `schedule.manage`.
- [x] 1.3 Validate branch access bounds: assert the session user is allowed to access the target `branchId`.
- [x] 1.4 Execute the core operations within a database transaction (`prisma.$transaction`):
  - [x] 1.4.1 Retrieve the parent `Course` record; verify status is `Published` and date ranges match.
  - [x] 1.4.2 Generate the new `batchCode` using the sequence suffix counter (e.g. `PY-101-003`).
  - [x] 1.4.3 Create the new `Batch` record in `Draft` state.
  - [x] 1.4.4 Create the primary `BatchTrainer` record linking the selected trainer to the new batch, spanning the start and end dates.
  - [x] 1.4.5 For each session in the payload, validate scheduling conflicts via the Scheduling Calendar service. Overlaps are returned as warnings and do not block saving.
  - [x] 1.4.6 Create the `Session` records linked to the new batch.
  - [x] 1.4.7 Log a `BATCH_CLONED` audit log entry detailing the source batch ID, the new batch ID, and the performer.
- [x] 1.5 Call `revalidatePath('/batches')` and return a success object containing the new batch details.

## 2. Next.js Page Route Creation

- [x] 2.1 Create the route file `apps/admin-portal/app/(protected)/batches/[id]/clone/page.tsx`.
- [x] 2.2 Define the page metadata title: `Clone Batch - Admin Portal | ASTI IMS`.
- [x] 2.3 Add permission guard: assert permission `batch.delivery.create`.
- [x] 2.4 Query database to fetch:
  - [x] 2.4.1 The source batch by ID, including course name. Throw `notFound()` if deleted or missing.
  - [x] 2.4.2 The source batch's active sessions (ordered by `sessionNumber` ascending).
  - [x] 2.4.3 The source batch's active primary trainer ID from `BatchTrainer` table.
- [x] 2.5 Query master data for selection lists: active Published courses, active branches, active classrooms, and active trainers (with person names).
- [x] 2.6 Render `CloneBatchForm` passing the source batch data, sessions list, master datasets, and the submission action.

## 3. Clone Batch React Form Component

- [x] 3.1 Create the client component `apps/admin-portal/app/(protected)/batches/_components/clone-batch-form.tsx`.
- [x] 3.2 Initialize form state with the source batch's parameters (Course, Branch, Name + " (Clone)", Capacity, Corporate, Walk-In).
- [x] 3.3 Add date state variables for `newStartDate` and `newEndDate`, and `primaryTrainerId` (pre-populated with original primary trainer).
- [x] 3.4 Implement the client-side auto-shift logic:
  - [x] 3.4.1 Calculate the day difference between the original start date and the newly selected start date.
  - [x] 3.4.2 Shift each session's date by that number of days and update the sessions table state.
- [x] 3.5 Render a "Sessions Planner" interactive grid listing all sessions:
  - [x] 3.5.1 Allow manual edits to session dates, start/end times, and classroom selectors.
  - [x] 3.5.2 Allow overriding the trainer on specific sessions. If no override is specified, default to the chosen primary trainer.
- [x] 3.6 Handle form submit: disable buttons and show spinner during submission, trigger `toast.success` on completion, and redirect to the new batch detail page.

## 4. UI Trigger Button integration

- [x] 4.1 Edit `apps/admin-portal/app/(protected)/batches/[id]/page.tsx`.
- [x] 4.2 Import the `Copy` icon from `lucide-react`.
- [x] 4.3 Add a button labeled "Clone Batch" next to the "Edit Batch" button:
  - [x] 4.3.1 Wrap it in a `<Link href={`/batches/${batch.id}/clone`}>`.
  - [x] 4.3.2 Enforce same visibility check: user must have `schedule.manage` permission and the batch must not be completed or cancelled.
  - [x] 4.3.3 Set `id="batch-clone-btn"` for testing purposes.

## 5. Verification

- [x] 5.1 Run TypeScript typechecks: `pnpm tsc --noEmit` inside `apps/admin-portal` and verify no compiler errors.
- [x] 5.2 Run linting check: `pnpm lint`.
- [x] 5.3 Verify that database writes rollback correctly if one of the sessions fails validation (e.g. classroom not active).
- [x] 5.4 Manual UI Check:
  - [x] 5.4.1 Open a batch with multiple sessions.
  - [x] 5.4.2 Click "Clone Batch".
  - [x] 5.4.3 Set a new start date (verify session dates shift automatically).
  - [x] 5.4.4 Select a new trainer.
  - [x] 5.4.5 Click "Save Clone" and verify creation of the new draft batch and all sessions.
