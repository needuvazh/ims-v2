# Functional Requirement Document (Part 7)
## Module 04: Admission & Enrollment Management – Validations, Errors, & Notifications

---

## 1. Custom Business Validation Rules

The Admission and Enrollment module executes validation logic prior to database state persistence. These validation schemas are written in Zod and verified inside domain aggregate services.

### 1.1 Age Verification Rule
*   **Rule:** A learner must be at least 12 years old on the date of admission registration.
*   **Validation Logic:**
    The student's age is calculated based on their date of birth:
    $$\text{Age} = \text{admissionDate} - \text{dateOfBirth} \ge 12\text{ years}$$
    This rule is checked programmatically inside the student registration aggregate validation layer during profile creation.

### 1.2 Overlapping Enrollment Rule
*   **Rule:** A student cannot be enrolled in two active batches that overlap in their scheduled session timings.
*   **Validation Logic:**
    When checking a proposed `batchId` for an active student, conflict checking is delegated to the Scheduling context:
    1. The Enrollment application service calls the public `SchedulingQueryService` (or equivalent timetable validation API) passing the proposed `batchId` and the `studentId`.
    2. The Scheduling context retrieves existing schedules and validates that:
       $$\forall \text{ session } S_1 \in \text{Proposed Batch}, \forall \text{ session } S_2 \in \text{Existing Batches}, \text{Interval}(S_1) \cap \text{Interval}(S_2) = \emptyset$$
    3. If an overlap timing intersection is detected, the Scheduling query returns a validation failure, and the Enrollment context blocks the action with `ERR_ENR_OVERLAPPING_SCHEDULE`.

### 1.3 Batch Capacity Validation Rule
*   **Rule:** Cannot confirm student enrollment if the batch seat count is exhausted.
*   **Validation Logic:**
    During the transition to `Approved` or `Confirmed` status:
    1. The Application Service queries the Training Delivery Bounded Context's public service interface (e.g. `BatchQueryService`) to fetch active batch occupancy metrics.
    2. Alternatively, a logical seat reservation request is dispatched via the Application Service.
    3. The validation asserts that the batch is active and that the capacity is not fully allocated.
    4. If capacity is exhausted, the application layer throws the `ERR_ENR_BATCH_FULL` domain error.

---

## 2. Structured Error Code Catalog

Custom exceptions thrown by this context carry distinct application codes and translate to standard HTTP response bodies.

| Error Code | HTTP Status | User-Facing Message (English) | Custom Details & Diagnostics |
| :--- | :---: | :--- | :--- |
| **`ERR_ADM_DUPLICATE_ID`** | `409` | "A student with this Civil ID or Passport is already registered." | Occurs during student creation. Contains conflicting ID string in diagnostic logs. |
| **`ERR_ADM_AGE_LIMIT`** | `400` | "Learner must be at least 12 years old." | Triggered if date of birth fails the 12-year boundary check. |
| **`ERR_ENR_BATCH_FULL`** | `422` | "The selected batch is full. Student has been placed on the waitlist." | Returned on enrollment approval requests if capacity is fully allocated. |
| **`ERR_ENR_CREDIT_EXCEEDED`**| `422` | "The corporate account credit limit has been exceeded." | Triggered for B2B nominations if outstanding invoices exceed allowed boundaries. |
| **`ERR_ENR_OVERLAPPING`** | `400` | "This student is already enrolled in a batch with conflicting schedules." | Thrown if timetable overlaps are detected. |
| **`ERR_ENR_INVOICE_REQUIRED`**| `402` | "Payment verification is required before confirming this enrollment." | Occurs if attempting to confirm enrollment without associated payment invoice clearance. |
| **`ERR_STUDENT_HAS_ACTIVE_ENROLLMENTS`**| `400` | "Cannot delete student with active or confirmed enrollments." | Occurs during student profile deletion if they have unresolved learning history. |
| **`ERR_AUTH_BRANCH_DENIED`**| `403` | "You are not authorized to access records in this branch." | Occurs if active user attempt to request data or execute mutation outside their branch access list. |

---

## 3. System Notification Events & Messaging Triggers

State transitions in the Admission and Enrollment aggregates publish messages to communication adapters.

### 3.1 `AdmissionApproved` Notification
*   **Trigger Event:** `AdmissionApproved`
*   **Channels:** Email & SMS
*   **Template Variables:**
    *   `{{studentName}}` - Full name of the student.
    *   `{{studentNumber}}` - Generated unique identifier.
    *   `{{branchName}}` - Target admission branch.
    *   `{{idCardDownloadUrl}}` - Signed URL to download the generated PDF ID card.
*   **Email Content Summary:**
    > "Dear {{studentName}}, welcome to ASTI! Your admission application at our {{branchName}} branch has been approved. Your Student ID number is {{studentNumber}}. You can download your official student ID card here: {{idCardDownloadUrl}}."

---

### 3.2 `EnrollmentConfirmed` Notification
*   **Trigger Event:** `EnrollmentConfirmed`
*   **Channels:** Email, SMS, WhatsApp
*   **Template Variables:**
    *   `{{studentName}}` - Student name.
    *   `{{courseName}}` - Enrolled course title.
    *   `{{batchCode}}` - Enrolled batch identifier.
    *   `{{startDate}}` - First day of classes.
    *   `{{timetableDetails}}` - Weekly class schedule.
*   **WhatsApp Content Summary:**
    > "Hello {{studentName}}, your enrollment in {{courseName}} (Batch: {{batchCode}}) is confirmed! Classes start on {{startDate}}. Schedule: {{timetableDetails}}. We look forward to seeing you at Al Saud Training Institute."

---

### 3.3 `StudentAddedToWaitingList` Notification
*   **Trigger Event:** `StudentAddedToWaitingList`
*   **Channels:** SMS & WhatsApp
*   **Template Variables:**
    *   `{{studentName}}` - Student name.
    *   `{{courseName}}` - Course title.
    *   `{{batchCode}}` - Full batch code.
    *   `{{waitlistPosition}}` - Current queue index number.
*   **SMS Content Summary:**
    > "Dear {{studentName}}, batch {{batchCode}} for {{courseName}} is currently full. You have been placed on the waiting list at position #{{waitlistPosition}}. We will notify you as soon as a seat becomes available."
