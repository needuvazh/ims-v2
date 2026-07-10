## MODIFIED Requirements

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
