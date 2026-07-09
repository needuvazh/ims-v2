## Why

Currently, the batch create and edit forms use a multi-step stepper wizard that splits form fields across two tabs ("Details & Dates" and "Capacity & Controls"). This interaction pattern:
1. Adds unnecessary clicks and navigation friction for administrative staff creating or editing batches.
2. Generates random suffixes for batch codes on the client side (`setBatchCode`), which does not follow a strict sequential business rule.
3. Exposes the batch code field in the edit and create forms, which is prone to manual editing errors or confusion since it should be an immutable system-managed reference.

We need to:
*   Merge all batch form fields into a single, unified view on a single page, eliminating the stepper.
*   Move batch code generation to the backend server, calculating the code sequentially (e.g. `COURSECODE-001`, `COURSECODE-002`) based on existing counts.
*   Remove the Batch Code field completely from the Create and Edit forms.

## What Changes

1. **Client Form Refactor**:
   *   Remove stepper state (`step`) and step-swapping handlers in `batch-form.tsx`.
   *   Remove the Batch Code input field from both create and edit forms.
   *   Place all remaining fields in a clean, side-by-side 2-column card layout:
     *   **Left Column (Parameters)**: Parent Course, Select Branch, Batch Name (English), and Capacity Limit.
     *   **Right Column (Timeline & Controls)**: Start Date, End Date, Corporate Client Account ID, and Walk-in Program Configuration.
2. **Backend Sequential Generation**:
   *   Refactor the `createBatch` method in `batch-service.ts` to automatically resolve the parent course code and count existing course cohorts to generate a sequence number (e.g., `PY-101-001`) if `batchCode` is not explicitly passed.
   *   Make `batchCode` parameter optional in the creation payload sent by client.

## Capabilities

### Modified Capabilities
- `batch-delivery`: Restructure the batch creation and editing requirements to eliminate form steppers, hide the batch code input, and generate sequential batch codes on the backend.

## Impact

* **Bounded Context**: Course, Batch & Training Delivery (owns Batch).
* **Delivery Tier**: Next.js route actions (`actions.ts`) and client-side page forms.
* **Security & Authorization**: Preservation of existing create/update permission scopes (`batch.delivery.create` and `batch.delivery.update`).
* **Database & ORM**: No schema modifications. Count query inside batch creation transaction.
* **NFR & Performance**: Negligible load impact. Single transactional sequence lookup ensures consistency.
* **Test Impact**: Requires refactoring tests to support optional client-side batchCode and verify backend generation logic.
