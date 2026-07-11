## Why

Currently, training coordinators at Al Saud Training Institute (ASTI) have to manually recreate batches for the same course when setting up a new batch schedule, even if the general configuration (capacity, course, branch, walk-in status, session structures) remains unchanged. Recreating all sessions manually is highly error-prone, tedious, and time-consuming. 

Coordinators need a quick way to clone an existing batch to a new date range and assign a new primary trainer/faculty in a single, unified view, with all the original sessions duplicated and shifted in dates automatically.

This feature will improve operational efficiency, reduce data entry errors, and simplify schedule management.

## What Changes

1. **Clone Batch Trigger UI**: Add a "Clone Batch" button to the Batch Details Page (`/batches/[id]`), visible only to authorized users.
2. **Clone Batch Interface**: Create a new route `/batches/[id]/clone` displaying a single-page form pre-populated with the source batch details (Course, Branch, Batch Name, Capacity Limit, Corporate configurations, and Walk-in options).
3. **Session Date Auto-shifting**: Display a list of the original batch's sessions. When the user sets the new batch start date, the system automatically calculates the date offset relative to the original start date and shifts all session dates by that offset. The user can then manually tweak individual session dates, times, trainers, and classrooms on the same screen.
4. **Clone Server Action**: Create `cloneBatchAction` in `apps/admin-portal/app/(protected)/batches/actions.ts` that runs a transactional creation of the new batch, creates `BatchTrainer` mappings, and creates all duplicate `Session` records.
5. **Conflict Engine Integration**: Each session created during the clone will be validated using the Scheduling Context's conflict engine. If warnings or conflicts (e.g. trainer overlap or holidays) are found, they will be reported back or stored appropriately as per scheduling policies.

## Capabilities

### New Capabilities
- `batch-cloning`: Capability to clone a batch along with all session mappings and trainer assignments, automatically shifting session dates by a date offset and validating schedule conflicts.

### Modified Capabilities
- `batch-detail-ui`: Adds a "Clone Batch" action button to the batch detail page.

## Impact

**Bounded Context:** Training Delivery Management, Scheduling  
**Affected Contexts (downstream read):** Course Catalog (course details), Organization (branch & classrooms), Identity & Access Management (permissions & branch scoping)

**New Client Page:** `/batches/[id]/clone`  
- Permission required: `batch.delivery.create` and `schedule.manage`  
- Branch-scoped: yes — verifies session user has access to the batch's branch

**New API/Action:** `cloneBatchAction` in `apps/admin-portal/app/(protected)/batches/actions.ts`  
- Executes inside a database transaction (`$transaction`).
- Logs a `BATCH_CLONED` audit event.

**No database schema migrations are required.** This change utilizes existing `Batch`, `BatchTrainer`, and `Session` database models.
