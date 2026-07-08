## Context

Walk-in enrollment is a distinct administrative intake method designed for counter-based, immediate learner registration. Since the database schema mandates a non-nullable relation between `Enrollment` and `Admission` (linked via `admissionId`), the application service must orchestrate the creation of all supporting aggregates in a single transaction, while separating the intake from the payment confirmation command to preserve the state machine.

## Goals / Non-Goals

**Goals:**

- Provide a dedicated, isolated API namespace `/api/v1/enrollments/walk-in` and block walk-in creations on the generic route.
- Implement the intake process as a multi-step sequence (`Draft` $\rightarrow$ `Submitted` $\rightarrow$ `Approved`) completed inside a single transaction.
- Define a clear cutover point for waitlist routing during the approval step.
- Implement a dedicated `recordWalkInPayment` command to transition the enrollment to `Confirmed` and generate printable confirmation records.
- Ensure 100% database model fields parity with the ER Model.

**Non-Goals:**

- External student portal self-service walk-in registrations.

## Detailed Design & State Machine Flow

```text
1. Intake Flow (POST /api/v1/enrollments/walk-in)
   Create Person/StudentProfile -> Create Admission (Draft) -> Create Enrollment (Draft)
                                      |
                              submitEnrollment()
                                      |
                              (State = Submitted)
                                      |
                              approveEnrollment() (Acquires FOR UPDATE Lock on Batch)
                                     / \
             If Batch has Capacity  /   \  If Batch is Full
                                   /     \
                       Move to Approved   Create Waitlist Entry
                        (State = Approved)   (State Remains Submitted)
                               |                  |
                       Commit Transaction   Commit Transaction (End Flow)
                               |
                       (UI shows Pay Form)
                               |
2. Payment Flow (POST /api/v1/enrollments/{id}/walk-in-payment)
                               |
                      recordWalkInPayment()
                               |
                     Set paymentCollected
                     Set confirmationIssued = true
                     Set paymentValidationRequired = false
                     Set confirmedAt = now()
                     Transition to Confirmed
                     Generate WalkInConfirmation
                     Write WalkInEnrollmentCreated Outbox Event
```

### 1. Waitlist Cutover Point

- The check for batch capacity occurs during the auto-approve step (`approveEnrollment`) under a database `FOR UPDATE` pessimistic lock on the batch.
- If capacity is exceeded and waitlisting is enabled, the system enqueues a waitlist record in the `Training Delivery` context. The transaction commits, leaving the enrollment in `Submitted` status. The UI is notified of the waitlist status, and **all payment buttons are blocked** (preventing payment recording for waitlisted students).
- If capacity is exceeded and waitlisting is disabled, the transaction throws `ERR_ENR_BATCH_FULL` and rolls back all draft entities (avoiding orphan drafts or duplicate seat accounting).

### 2. Dedicated Endpoints

- **Intake Route:** `POST /api/v1/enrollments/walk-in`
  - Required permission: `enrollment.create`
  - Rules: Scoped to registrar's authorized branch.
- **Payment Route:** `POST /api/v1/enrollments/{id}/walk-in-payment`
  - Required permission: `enrollment.record_payment`
  - Rules: Validates that enrollment state is `Approved`. Exposes reason remarks and cash/card collection.

### 3. Model Fields Parity

- **`WalkInEnrollment` model:**
  - `id` (UUID, primary key)
  - `enrollmentId` (UUID, unique, foreign key to Enrollment)
  - `walkInDate` (DateTime, defaults to now)
  - `counterUserId` (UUID, tracking registrar who created it)
  - `paymentCollected` (Decimal, cash/card amount)
  - `confirmationIssued` (Boolean, defaults to false, set to true upon successful `recordWalkInPayment`)
  - `remarks` (Text, optional)
- **`WalkInConfirmation` model:**
  - `id` (UUID, primary key)
  - `walkInEnrollmentId` (UUID, unique, foreign key to WalkInEnrollment)
  - `confirmationNumber` (String, unique confirmation sequence number `WIC-YYYY-XXXXX`)
  - `issuedAt` (DateTime, defaults to now)
  - `issuedBy` (UUID, tracking user who recorded payment)
  - `documentUrl` (String, URL path for the printable PDF receipt)

## Risks / Trade-offs

- **[Risk] Generic API Leakage:** If the generic `POST /api/v1/enrollments` endpoint accepts walk-ins, it bypasses the orchestrator and causes relation crashes.
  - _Mitigation:_ Explicitly throw a validation error in the generic route handler if `enrollmentType === 'WalkIn'`.
