## 1. Database and Domain Model Setup

- [ ] 1.1 Ensure `schema.prisma` has `WalkInEnrollment` and `WalkInConfirmation` definitions (Verified).
- [ ] 1.2 Run database migrations if any model changes are needed.

## 2. Application Logic

- [ ] 2.1 Implement `createWalkInEnrollment` (Intake Orchestrator) in `EnrollmentService`:
  - Validate course is designated for walk-in (`Course.allowWalkInCompletion = true`).
  - Search and reuse `Person`/`StudentProfile` (prevent duplicates).
  - Create draft `Admission` and draft `Enrollment`.
  - Trigger auto-submit (`submitEnrollment`).
  - Trigger auto-approve (`approveEnrollment`). Under `FOR UPDATE` lock, verify batch capacity.
    - If has capacity: transition state to `Approved`, create linked `WalkInEnrollment` with `paymentCollected = 0.0` and commit transaction.
    - If full and waitlisting is enabled: route to waitlist, keep state at `Submitted`, and commit.
    - If full and waitlisting is disabled: throw `ERR_ENR_BATCH_FULL` and rollback.
- [ ] 2.2 Implement `recordWalkInPayment` (Payment Command) in `EnrollmentService`:
  - Verify enrollment state is `Approved`.
  - Persist `paymentCollected`, set `confirmationIssued = true` and `paymentValidationRequired = false`.
  - Transition enrollment state to `Confirmed` and set `confirmedAt = now()`.
  - Create a `WalkInConfirmation` record (generate `confirmationNumber` using series prefix `WIC-YYYY-XXXXX`, set `issuedBy = actorId`, `documentUrl = ...`).
  - Publish standard lifecycle events (`StudentProfileCreated` if new, `AdmissionCreated`, `EnrollmentConfirmed`) and the specialized outbox event `WalkInEnrollmentCreated` containing payment details.
- [ ] 2.3 Reject `enrollmentType = 'WalkIn'` in the generic `createEnrollment` flow.

## 3. API & Controller Routing

- [ ] 3.1 Expose `POST /api/v1/enrollments/walk-in` (Intake endpoint).
  - Enforce permission `enrollment.create`.
  - Enforce branch scoping (user's active branch).
- [ ] 3.2 Expose `POST /api/v1/enrollments/{id}/walk-in-payment` (Payment recording endpoint).
  - Enforce permission `enrollment.record_payment`.
  - Enforce branch scoping (user's active branch).
- [ ] 3.3 Reject requests with `enrollmentType = 'WalkIn'` in the generic route `POST /api/v1/enrollments`, returning `400 Bad Request` (`ERR_ENR_GENERIC_WALKIN_BLOCKED`).

## 4. Tests

- [ ] 4.1 Write integration tests in `packages/admissions-enrollment/src/application/enrollment-lifecycle.test.ts` for `createWalkInEnrollment` and `recordWalkInPayment`:
  - Intake success and auto-approval.
  - Generic route rejection.
  - Upfront payment recording command (transitions to Confirmed, creates confirmation receipt, emits all lifecycle and outbox events).
  - Batch capacity limits and waitlisting short-circuiting (blocking payment).
  - Person deduplication checks.
- [ ] 4.2 Verify the application compiles and passes all checks.
