# enrollment-lifecycle Specification

## Purpose

TBD - created by archiving change enrollment-lifecycle. Update Purpose after archive.
## Requirements
### Requirement: Enrollment Creation & pricingResolution snapshotting

The system SHALL support creating regular and corporate enrollments, resolving and snapshotting pricing to prevent pricing drift.

#### Scenario: Resolve and snapshot pricing during draft creation

- **GIVEN** an approved Admission exists for a student
- **WHEN** the Registrar or the lead conversion pipeline initiates an enrollment draft with `courseId`, `batchId`, `branchId`, `enrollmentType`, `customerType`, and optionally a `leadId`
- **THEN** the system SHALL resolve pricing by calling the Course Catalog's `CoursePricingService` passing:
  - `courseId`, `customerType` ('Individual' or 'Corporate'), `branchId`, `batchId`, and the current timestamp as `asOfDate`
- **AND** snapshot the following immutable pricing fields on the `Enrollment` record:
  - `pricingSource` (BatchLevel, BranchLevel, or GlobalDefault)
  - `resolvedPrice` (Decimal)
  - `resolvedDiscount` (Decimal)
  - `finalAmount` (totalPrice - resolvedDiscount, minimum 0, where totalPrice is course pricing basePrice plus tax)
  - `paymentValidationRequired` (true if finalAmount > 0, else false)
  - `priceEvaluationTimestamp` (DateTime set to current timestamp)
- **AND** save the optional `leadId` to link the enrollment back to its CRM lead source
- **AND** initialize the enrollment status to "Draft".

#### Scenario: Reject enrollment draft from unapproved admission

- **WHEN** a regular enrollment creation is initiated
- **AND** the linked admission status is not "Approved"
- **THEN** the system SHALL reject the request with error code "ERR_ENR_MISSING_ADMISSION".

#### Scenario: Walk-in fast-track registration bypass

- **WHEN** a Walk-In enrollment is initialized for a course allowing walk-ins
- **THEN** the system SHALL bypass the approved admission check, create the profile, and initialize the enrollment draft in a single decoupled transaction.

#### Scenario: Corporate Participant enrollment and automatic profile conversion

- **GIVEN** a corporate participant identified by `corporateParticipantId`
- **WHEN** a corporate enrollment draft is created
- **THEN** if no `StudentProfile` exists for the participant, the system SHALL automatically create a `StudentProfile` and Admission in the same database transaction.
- **AND** create the `Enrollment` draft linked to the corporate participant, student profile, and admission.

#### Scenario: Course waitlist queue enrollment

- **WHEN** an enrollment draft is created for a course that does not have an active batch or pricing configured
- **THEN** the system SHALL allow the draft enrollment to be created with `batchId: null`
- **AND** skip resolving pricing fields (marking `resolvedPrice`, `resolvedDiscount`, `finalAmount` as 0), designating the enrollment as part of the course waiting list queue.

#### Scenario: Assign or change enrollment batch

- **WHEN** the Registrar or Coordinator assigns or changes the batch of an enrollment that has no payments recorded
- **THEN** the system SHALL validate the new batch's capacity
- **AND** update the enrollment's `batchId` to the new batch
- **AND** update the batch's `currentEnrollmentCount` capacity metric
- **AND** if capacity is exceeded and waitlist is enabled, automatically enqueue the student into the batch waitlist.

### Requirement: Enrollment Status Transitions & Validation Matrix

The system SHALL strictly enforce the allowed state transitions and execute capacity, waitlist, credit, and document verification guards.

#### Transition Matrix:

The system SHALL only permit status transitions that follow this transition table. Any invalid transition SHALL throw `ERR_ENR_INVALID_STATE`:

- `Draft` -> `Submitted` (via submit command)
- `Draft` -> `Cancelled` (via cancel command)
- `Submitted` -> `Approved` (via approve command)
- `Submitted` -> `Cancelled` (via reject/cancel command)
- `Approved` -> `Confirmed` (via event-driven payment receipt + document check)
- `Approved` -> `Cancelled` (via cancel unpaid command)
- `Confirmed` -> `Active` (via BatchStarted event)
- `Confirmed` -> `Dropped` (via drop command)
- `Active` -> `Dropped` (via drop command)

#### Scenario: Approve enrollment and check capacity limits

- **GIVEN** the enrollment is in "Submitted" status
- **WHEN** the Branch Manager approves the enrollment
- **THEN** the system SHALL execute a serializable transaction to verify batch capacity
- **AND** if capacity is available, transition status to "Approved"
- **AND** publish the "EnrollmentApproved" outbox event to generate an invoice.

#### Scenario: Route full batch to waitlist during approval

- **GIVEN** the batch has reached its max capacity limit
- **AND** waitlisting is enabled for the batch
- **WHEN** the Branch Manager approves the enrollment
- **THEN** the system SHALL keep the enrollment in "Submitted" status (pending review)
- **AND** trigger the Training Delivery waitlist flow to register a waitlist entry
- **AND** publish the "StudentAddedToWaitingList" outbox event.

#### Scenario: Block approval if batch is full and waitlist is disabled

- **GIVEN** the batch has reached its max capacity limit
- **AND** waitlisting is disabled for the batch
- **WHEN** the Branch Manager approves the enrollment
- **THEN** the system SHALL reject the approval with error code "ERR_ENR_BATCH_FULL".

#### Scenario: Validate corporate credit limit during approval

- **GIVEN** a corporate enrollment is in "Submitted" status
- **WHEN** the Branch Manager approves the enrollment
- **THEN** the system SHALL call the Corporate Sales context to check outstanding B2B balance + new enrollment cost against the corporate credit limit
- **AND** if the limit is exceeded and `blockEnrollment` is true, the system SHALL reject the approval with error code "ERR_ENR_CREDIT_EXCEEDED"
- **AND** if `blockEnrollment` is false, proceed with approval and log a credit warning.

#### Scenario: Idempotent event-driven confirmation with document gate

- **GIVEN** an enrollment is in "Approved" status and has `paymentValidationRequired` as true
- **WHEN** the Finance context publishes a `ReceiptGenerated` event with payload:
  ```json
  {
    "enrollmentId": "uuid",
    "invoiceId": "uuid",
    "amountPaid": "decimal",
    "receiptNumber": "string"
  }
  ```
- **THEN** the system SHALL correlate the event via `enrollmentId`
- **AND** check if the enrollment is already in "Confirmed" or later status (if so, ignore the event for idempotency)
- **AND** execute the `verifyEnrollmentDocumentsGate` to ensure mandatory documents are active and verified
- **AND** if document check passes, transition status to "Confirmed", set `confirmedAt` to the current timestamp, and publish the "EnrollmentConfirmed" event.
- **AND** if document check fails, log a verification failure, keep the enrollment status as "Approved", and raise an administrative alert.

#### Scenario: Reactive batch start activation

- **WHEN** the Training Delivery context publishes a `BatchStarted` event containing `batchId`
- **THEN** the system SHALL query all enrollments for that `batchId` that are in "Confirmed" status
- **AND** transition their status to "Active".

#### Scenario: Drop active enrollment and release seat

- **GIVEN** the enrollment is in "Confirmed" or "Active" status
- **WHEN** the Branch Manager processes a drop request with a mandatory reason code
- **THEN** the system SHALL transition status to "Dropped"
- **AND** publish the "EnrollmentCancelled" outbox event to trigger seat release and refund calculations.

---

### Requirement: Critical Actions Audit Coverage

The system SHALL automatically log all lifecycle mutations in the `AuditLog` table, capturing target entity, transition details, performer, timestamp, and optional remarks.

#### Scenario: Audit log requirements for mutations

- **WHEN** any of the following lifecycle mutations are executed:
  - Create Enrollment Draft (Draft)
  - Submit Enrollment (Submitted)
  - Approve Enrollment (Approved)
  - Waitlist Route (Submitted + Waitlist log)
  - Confirm Enrollment (Confirmed)
  - Activate Enrollment (Active)
  - Drop/Cancel Enrollment (Dropped/Cancelled)
- **THEN** the system SHALL write a record to `AuditLog` containing:
  - `entityId` and `entityType` (Enrollment)
  - `action` (e.g. "EnrollmentCreated", "EnrollmentSubmitted", "EnrollmentApproved", "EnrollmentConfirmed", "EnrollmentActivated", "EnrollmentDropped")
  - `oldValue` and `newValue` (representing the status and fields changed)
  - `performedBy` (User ID or 'System')
  - `performedAt` (timestamp)
  - `branchId` (branch scope context).

---

### Requirement: Enrollment Screen Visibility & Branch Scoping

The system SHALL show enrollment status, pricing snapshot fields, and enforce branch scoping server-side.

#### Scenario: Render enrollment detail screen

- **GIVEN** the user has "enrollment.read" permission
- **WHEN** the user requests the details page of an enrollment in their active branch
- **THEN** the system SHALL render the enrollment number, status, pricing snapshot summary (including resolvedPrice, resolvedDiscount, finalAmount, and priceEvaluationTimestamp), and linked references.

#### Scenario: Reject unauthorized cross-branch enrollment access

- **WHEN** a user requests details for an enrollment belonging to another branch
- **AND** the user does not possess global Super Admin rights
- **THEN** the system SHALL block the request with "ERR_AUTH_BRANCH_DENIED" (403 Forbidden).

