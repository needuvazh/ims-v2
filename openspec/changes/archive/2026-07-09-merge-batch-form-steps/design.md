## Context

Currently, the batch create/edit forms inside `apps/admin-portal` are structured as a two-step wizard stepper component (`BatchForm`). The first step collects names, course, branch, and dates, while the second step collects capacity limit, walk-in configs, and corporate client details. The batch code is generated in the client using a random suffix.

We need to:
1. Merge the stepper into a single unified form layout displaying all parameters at once.
2. Remove the batch code field from the form.
3. Automatically allocate the batch code on the backend inside `batchService.createBatch` based on a sequence suffix.

## Goals / Non-Goals

**Goals:**
*   Refactor the `BatchForm` layout to display all fields together in a two-column card view.
*   Remove the `step` state tracking and next/back buttons.
*   Implement backend sequence batch code generation inside `createBatch` in `batch-service.ts`.
*   Maintain backward compatibility so that existing test cases passing an explicit `batchCode` continue to work.

**Non-Goals:**
*   Modifying the database schema.
*   Altering status transition rules or waitlist logic.

## Decisions

### 1. Backend Sequential Generation
In `packages/training-delivery/src/application/batch-service.ts`:
*   Make `batchCode` optional in `CreateBatchInput`:
    ```typescript
    export interface CreateBatchInput extends Omit<Prisma.BatchUncheckedCreateInput, 'batchCode'> {
      batchCode?: string;
      primaryTrainerId?: string | null;
    }
    ```
*   In `createBatch` execution block, check if `input.batchCode` is empty/missing:
    *   Query the database to get the course's `courseCode`.
    *   Count the existing batches for that `courseId` to calculate the next sequence serial:
        ```typescript
        const count = await client.batch.count({ where: { courseId: input.courseId } });
        const serial = (count + 1).toString().padStart(3, '0');
        const finalBatchCode = `${courseCode}-${serial}`;
        ```
    *   Validate the generated `finalBatchCode` using `CODE_REGEX`.

### 2. Client Payload Cleanup
In `apps/admin-portal/app/(protected)/batches/_components/batch-form.tsx`:
*   Remove the `step` state.
*   Combine step 1 and step 2 inputs into a single `grid grid-cols-1 lg:grid-cols-2 gap-6`.
*   Do not render the `Batch Code` display field or input.
*   In `handleSubmit`, call `onSubmitAction` without sending a client-side generated batch code (pass empty string or omit it).
*   Combine validations:
    ```typescript
    const isFormValid =
      batchNameEnglish.trim().length >= 3 &&
      courseId &&
      branchId &&
      startDate &&
      endDate &&
      capacity &&
      parseInt(capacity, 10) > 0;
    ```

## Risks / Trade-offs

*   **Risk**: Potential concurrency collision during sequence number generation.
    *   **Mitigation**: The code generation runs inside the transaction (`client.batch.count` and creation). Under high concurrency, the unique constraint on `batchCode` database index will throw `DuplicateBatchCode`, which rolls back the transaction safely, preventing double allocation.
