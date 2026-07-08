# walkin-enrollment Specification

## Purpose

This specification defines the functional requirements and scenarios for Walk-In Fast Track enrollment, payment recording, and completion routing in ASTI IMS.

## Requirements

### Requirement: Walk-In Enrollment Intake

The system SHALL support walk-in intake via a dedicated route `POST /api/v1/enrollments/walk-in`, verifying course eligibility, checking person deduplication, and executing immediate auto-submission and auto-approval as part of the shared Enrollment lifecycle.

#### Scenario: Create walk-in enrollment draft and auto-approve

- **GIVEN** the target course has `allowWalkInCompletion` set to `true`
- **AND** the target batch has available capacity
- **WHEN** an authorized user submits a same-day walk-in intake request with person details (first name, last name, phone, email, national ID), course, batch, branch, and payment context
- **THEN** the system SHALL search the person registry by email, phone, or national ID to check for duplicates
- **AND** the system SHALL link the existing `Person`/`StudentProfile` or create a new `Person` and `StudentProfile` record
- **AND** the system SHALL create an `Admission` record in the `Draft` status
- **AND** the system SHALL create the `Enrollment` in the `Draft` status
- **AND** the system SHALL transition the enrollment to `Submitted` status
- **AND** the system SHALL check batch capacity under a `FOR UPDATE` lock and transition the enrollment to `Approved` status
- **AND** the system SHALL create a `WalkInEnrollment` record linked to the enrollment with `paymentCollected = 0.0` and `confirmationIssued = false`
- **AND** the system SHALL commit the transaction and return the approved enrollment details.

#### Scenario: Route walk-in enrollment to waitlist when batch is full

- **GIVEN** the target course has `allowWalkInCompletion` set to `true`
- **AND** the target batch has no available capacity
- **AND** the batch has waitlisting enabled
- **WHEN** an authorized user submits a walk-in intake request
- **THEN** the system SHALL create the `Person`/`StudentProfile`, draft `Admission`, and draft `Enrollment`
- **AND** the system SHALL transition the enrollment to `Submitted` status
- **AND** the system SHALL create a waitlist entry in the `Training Delivery` context
- **AND** the system SHALL commit the transaction, leaving the enrollment in `Submitted` status, and SHALL block payment recording.

#### Scenario: Reject walk-in enrollment when batch is full and waitlist disabled

- **GIVEN** the target course has `allowWalkInCompletion` set to `true`
- **AND** the target batch has no available capacity
- **AND** the batch has waitlisting disabled
- **WHEN** an authorized user submits a walk-in intake request
- **THEN** the system SHALL reject the request with error code `ERR_ENR_BATCH_FULL` and roll back all changes.

#### Scenario: Reject walk-in enrollment for normal course

- **GIVEN** the target course has `allowWalkInCompletion` set to `false`
- **WHEN** an authorized user attempts a walk-in intake request
- **THEN** the system SHALL reject the request with error code `ERR_COURSE_NOT_WALKIN_ENABLED`.

#### Scenario: Reject walk-in enrollment outside branch scope

- **WHEN** a user attempts to create a walk-in enrollment for a branch they cannot access
- **THEN** the system SHALL reject the request with `403 Forbidden` (`ERR_AUTH_BRANCH_DENIED`).

#### Scenario: Block walk-in from generic enrollment API

- **WHEN** a user submits a request to `POST /api/v1/enrollments` with `enrollmentType` set to `'WalkIn'`
- **THEN** the system SHALL reject the request with `400 Bad Request` (`ERR_ENR_GENERIC_WALKIN_BLOCKED`).

---

### Requirement: Walk-In Payment Recording Command

The system SHALL expose a dedicated endpoint `POST /api/v1/enrollments/{id}/walk-in-payment` to record payments for approved walk-in enrollments and confirm the enrollment.

#### Scenario: Record walk-in payment successfully

- **GIVEN** a walk-in enrollment has status `Approved`
- **WHEN** an authorized user records the payment amount with `counterUserId` and `remarks`
- **THEN** the system SHALL persist the amount on `WalkInEnrollment.paymentCollected`
- **AND** the system SHALL set `WalkInEnrollment.confirmationIssued = true`
- **AND** the system SHALL set `Enrollment.paymentValidationRequired = false`
- **AND** the system SHALL transition `Enrollment.enrollmentStatus` to `Confirmed` and set `confirmedAt = now()`
- **AND** the system SHALL generate a `WalkInConfirmation` record containing a unique `confirmationNumber`, `issuedAt`, `issuedBy`, and a printable `documentUrl`
- **AND** the system SHALL write a `WalkInEnrollmentCreated` event to the local transactional outbox.

#### Scenario: Block payment for waitlisted walk-in enrollment

- **GIVEN** a walk-in enrollment has status `Submitted` (Waitlisted)
- **WHEN** a user attempts to record payment for this enrollment
- **THEN** the system SHALL reject the request with error code `ERR_ENR_PAYMENT_BLOCKED_WAITLIST`.

---

### Requirement: Walk-In Completion and Certificate Gating

The system SHALL support walk-in completion checks and evaluate certificate eligibility based on the upfront payment and passing grades.

#### Scenario: Mark walk-in completion eligible

- **GIVEN** a walk-in enrollment has `completionStatus` set to `Passed`
- **AND** the walk-in enrollment has `paymentValidationRequired` set to `false`
- **WHEN** a user or background job evaluates certificate eligibility
- **THEN** the system SHALL transition the enrollment state to `Completed` and mark the student as eligible for certificate generation.

---

### Requirement: Walk-In Admin-Only Phase 1 Access

The system SHALL expose walk-in enrollment entry points only in the admin portal during Phase 1 and reserve future student portal entry points without enabling them.

#### Scenario: Hide walk-in entry from future student portal

- **WHEN** a future student portal requests walk-in enrollment navigation
- **THEN** the system SHALL not expose the action in Phase 1 and SHALL keep the workflow admin-only.

#### Scenario: Show walk-in entry in admin portal

- **WHEN** an authorized admin user opens the admissions and enrollment area
- **THEN** the system SHALL expose the walk-in enrollment entry point.
