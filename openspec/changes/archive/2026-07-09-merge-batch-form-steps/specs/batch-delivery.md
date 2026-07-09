## MODIFIED Requirements

### Requirement: Unified Form Entry Layout for Batches
The batch creation and update forms MUST present all configuration fields in a single, unified view, completely eliminating multi-step wizard stepper navigation.
The forms MUST NOT display a Batch Code entry or lookup field in either create or edit flows.

#### Scenario: Submitting Create Form without Manual Batch Code
- **WHEN** an administrator fills in Course, Branch, Name, Dates, and Capacity Limit on the unified page, and clicks "Create Batch"
- **THEN** the client payload MUST NOT contain a pre-generated `batchCode`.
- **AND** the system MUST successfully submit the form to the backend to auto-allocate the batch code.

### Requirement: Backend Sequential Batch Code Allocation
The training delivery context MUST generate sequential batch codes on the backend during creation when the batch code is not supplied.
The code format MUST be `[Parent Course Code]-[Three Digit Sequential Suffix]` (e.g. `PY-101-001`).

#### Scenario: Resolving Next Sequence Suffix
- **WHEN** a batch is created for a course with code `PY-101`
- **AND** there are currently 2 existing batches registered for `PY-101` in the database
- **THEN** the system MUST automatically allocate `PY-101-003` as the new batch's code.
- **AND** the validation MUST ensure the code passes format checks (`/^[A-Z0-9-]{3,20}$/`) and uniqueness checks before saving.
