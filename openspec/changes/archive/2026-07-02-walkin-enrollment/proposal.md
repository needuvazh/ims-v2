## Why

Walk-in enrollment is a distinct administrative intake method designed for short-duration seminar courses. To ensure business logic safety, this workflow must be completely isolated from the generic enrollment creation path, use a dedicated endpoint namespace, and follow the standard state-machine lifecycle (Draft $\rightarrow$ Submitted $\rightarrow$ Approved $\rightarrow$ Confirmed) while offering a fast-track sequence for counter staff.

## What Changes

- **API Isolation:** Block `enrollmentType = 'WalkIn'` in the generic `POST /api/v1/enrollments` endpoint. Walk-ins must flow exclusively through the dedicated route `POST /api/v1/enrollments/walk-in`.
- **Two-Step State-Machine Flow:**
  1. **Intake Step:** The registrar submits the walk-in form. The system checks for an existing `Person` record (deduplication check), creates a `StudentProfile`, generates an `Admission` in `Draft` state, and creates the `Enrollment` in `Draft` state. The orchestrator then immediately auto-submits (`Submitted`) and auto-approves (`Approved`) the enrollment. If the batch has no capacity, the flow halts at `Submitted` (waitlisted) and blocks payment.
  2. **Payment Step:** For approved walk-in enrollments, the registrar records the payment via `POST /api/v1/enrollments/{id}/walk-in-payment`. This command persists the payment details on `WalkInEnrollment`, updates `paymentValidationRequired = false`, transitions the `Enrollment` to `Confirmed` (`confirmedAt = now()`), generates the `WalkInConfirmation` receipt, and writes outbox events.
- **Model Fields Parity:** Ensure all persisted fields required by the ER model (`counterUserId`, `remarks`, `paymentCollected`, `confirmationIssued` on `WalkInEnrollment`, plus `issuedBy`, `issuedAt`, `documentUrl`, `confirmationNumber` on `WalkInConfirmation`) are fully captured.

## Capabilities

### New Capabilities

- `walkin-enrollment`: Dedicated walk-in intake, generic route blocking, explicit walk-in payment recording command, capacity-based waitlisting checks, and confirmation receipt generation.

### Modified Capabilities

- None

## Impact

Affected areas include `POST /api/v1/enrollments` route validation, the new `/api/v1/enrollments/walk-in` and `/api/v1/enrollments/{id}/walk-in-payment` endpoints, the `EnrollmentService` domain orchestrator, transactional outbox publishing, and E2E integration tests.
