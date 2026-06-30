# Module 06 — Course Catalog & Training Delivery (Batch) Management

## Part 1 — Business Overview, Functional Requirements, Business Rules

**Version:** 3.0  
**Status:** Draft  
**Domain:** Course Catalog & Training Delivery  
**Module Code:** CRS  

---

# Document Information

| Item        | Value                                                     |
| ----------- | --------------------------------------------------------- |
| Module      | Course Catalog & Training Delivery (Batch) Management     |
| Module Code | CRS                                                       |
| Version     | 3.0                                                       |
| Owner       | Architecture Team / Academic Division                     |
| Domain      | Course Catalog & Training Delivery                        |
| Priority    | Critical                                                  |
| Depends On  | Organization Management, IAM                              |
| Used By     | Admission & Enrollment, Scheduling, Finance, Certificates |

---

# 1. Introduction

## 1.1 Purpose
The Course Catalog & Training Delivery (Batch) Management module establishes the structural foundation of the ASTI Integrated Institute Management System (IMS). It acts as the core administrative ledger defining what courses exist, their financial valuations, and academic benchmarks, alongside the physical batch instances that deliver those courses to students. 

Every learner journey—whether individual, walk-in, or corporate—is initiated against a predefined, published course catalog and executed inside a structured batch. By decoupling course catalog definitions (the template) from batches (the execution), this module provides a highly standardized, scalable monolith structure that guarantees organizational consistency across all ASTI branches.

## 1.2 Business Benefits
*   **Administrative Consistency:** Eradicates duplicate or misaligned course codes and name variants by enforcing a single, bilingual catalog repository.
*   **Revenue Protection:** Restricts billing inconsistencies via strict pricing hierarchy rules (Batch -> Branch -> Global default) that resolve dynamically and prevent unauthorized manual modifications.
*   **Academic Quality Control:** Automates compliance checks by locking course graduation behind standardized completion rules (minimum attendance % and exam verification) defined at the catalog level.
*   **Optimal Operations Planning:** Maximizes branch seating capabilities through active waitlists and capacity tracking, minimizing under-enrolled batches.
*   **Trainer Optimization:** Restricts duplicate faculty bookings and enforces schedule compliance, protecting trainer bandwidth.
*   **Legal Compliance:** Automates VAT calculation (Oman tax norms) and retains permanent audit trails for curriculum and financial changes to satisfy ministerial audits.

---

# 2. Detailed Functional Requirements

---

## 2.1 Course Catalog Administration

### FR-CRS-001: Create Course Profile
*   **Description & Actors:** Allows the Academic Director to define and seed a new training course in the catalog database.
*   **Preconditions:**
    1.  User is authenticated.
    2.  User has permission: `course.catalog.create`.
    3.  The target branch and department exist and are active.
*   **Inputs:**
    *   `courseCode` (String, alphanumeric, unique, 3-20 chars)
    *   `nameEnglish` (String, 1-150 chars)
    *   `nameArabic` (String, 1-150 chars, Arabic script)
    *   `descriptionEnglish` (Text, optional)
    *   `descriptionArabic` (Text, optional, Arabic script)
    *   `departmentId` (UUID, reference to Department)
    *   `branchId` (UUID, reference to Branch)
    *   `courseClassification` (Enum: Individual, Corporate, WalkIn, Online)
    *   `durationType` (Enum: FixedDays, HoursBased, SessionsBased)
    *   `durationValue` (Integer, > 0)
    *   `effectiveStartDate` (Date)
    *   `effectiveEndDate` (Date, optional)
*   **Processing Steps:**
    1.  **Validation:** Check that all mandatory fields are populated.
    2.  **Unique Code Verification:** Query database to verify `courseCode` does not exist (case-insensitive check). If exists, abort and throw `ERR_CRS_DUPLICATE_CODE`.
    3.  **Unique Name Verification:** Verify course name is unique within the assigned branch and department. If duplicate, throw `ERR_CRS_DUPLICATE_NAME`.
    4.  **Bilingual Integrity Check:** Verify that Arabic fields (`nameArabic`, `descriptionArabic`) contain valid Arabic characters if populated.
    5.  **Effective Dates Check:** Verify `effectiveStartDate >= current_date` and `effectiveEndDate > effectiveStartDate` (if provided).
    6.  **Persist:** Insert records into `Course` and link to `Branch` and `Department`. Set status to `Draft`.
    7.  **Audit Trail:** Log "COURSE_CREATED" event in `AuditLog` containing input attributes as the new value.
*   **Outputs & Postconditions:**
    *   New Course record initialized in `Draft` state.
    *   Audit log entry appended.
*   **Priority:** Must Have

---

### FR-CRS-002: Update Course Details
*   **Description & Actors:** Allows the Academic Director to modify existing course attributes (excluding immutable identifiers).
*   **Preconditions:**
    1.  User has permission: `course.catalog.update`.
    2.  Course exists, and status is NOT `Archived`.
*   **Inputs:**
    *   `courseId` (UUID)
    *   `nameEnglish` (String)
    *   `nameArabic` (String)
    *   `descriptionEnglish` (Text)
    *   `descriptionArabic` (Text)
    *   `courseClassification` (Enum)
    *   `durationValue` (Integer)
    *   `effectiveEndDate` (Date, optional)
*   **Processing Steps:**
    1.  **Immutability Enforcement:** Verify that `courseCode` is not modified.
    2.  **State Check:** If course is `Active` and has in-progress batches, block changing the `durationValue` or `courseClassification`. Throw `ERR_CRS_ACTIVE_COURSE_LOCKED`.
    3.  **Name Uniqueness:** If names are modified, rerun unique check within department.
    4.  **Update Database:** Apply changes to the `Course` table, updating `updatedAt` and `updatedBy`.
    5.  **Audit Log:** Record `COURSE_UPDATED` event with JSON diff.
*   **Outputs & Postconditions:**
    *   Course details updated in database.
*   **Priority:** Should Have

---

### FR-CRS-003: Course State Transition
*   **Description & Actors:** Allows the Academic Director to change a course status.
*   **Preconditions:**
    1.  User has permission: `course.catalog.publish` (for activation) or `course.catalog.archive` (for deactivation).
*   **Inputs:**
    *   `courseId` (UUID)
    *   `targetStatus` (Enum: Draft, Active, Inactive, Archived)
*   **Processing Steps:**
    1.  **Draft to Active:** Verify course pricing and completion rules exist and are active. If missing, block transition. Throw `ERR_CRS_MISSING_PRICING_OR_RULES`.
    2.  **Active to Inactive:** Check if there are active batches in `Open For Enrollment` or `In Progress` status. If yes, block transition. Throw `ERR_CRS_ACTIVE_BATCHES_EXIST`.
    3.  **Active/Inactive to Archived:** Mark the course as logically deleted (`isDeleted = true`, `deletedAt = now()`, `status = Archived`). Ensure all associated batches are completed or cancelled.
    4.  **Save & Audit:** Save status and write audit entry `COURSE_STATUS_CHANGED`.
*   **Outputs & Postconditions:**
    *   Course status updated. If archived, the course is excluded from active search results.
*   **Priority:** Must Have

---

## 2.2 Pricing and Completion Rules

### FR-CRS-004: Configure Course Pricing
*   **Description & Actors:** Allows the Academic Director or authorized Branch Managers to establish pricing rules.
*   **Preconditions:**
    1.  User has permission: `course.catalog.create` or `course.pricing.override`.
    2.  Course exists and status is `Draft` or `Active`.
*   **Inputs:**
    *   `courseId` (UUID)
    *   `branchId` (UUID, or NULL for Global default)
    *   `customerType` (Enum: Individual, Corporate, WalkIn)
    *   `batchType` (Enum: Regular, FastTrack, Weekend)
    *   `currency` (String, strictly "OMR")
    *   `basePrice` (Decimal, 12, 3 format)
    *   `taxPercentage` (Decimal, e.g., 5.000)
    *   `effectiveStartDate` (Date)
    *   `effectiveEndDate` (Date, optional)
*   **Processing Steps:**
    1.  **Exclusivity Check:** Query the `CoursePricing` table to check if there is an overlapping active record for the same `courseId`, `branchId`, `customerType`, `batchType`, and `currency` combination.
    2.  **Overlap Prevention:** If an overlap exists, calculate the intersection. Adjust the `effectiveEndDate` of the existing record to `effectiveStartDate - 1 day` to deactivate it, or reject the request if the new start date is invalid.
    3.  **VAT Defaulting:** Validate that `taxPercentage` defaults to 5.000 (Oman Standard VAT) unless tax-exemption metadata is explicitly provided.
    4.  **OMR Precision:** Round `basePrice` strictly to three decimal places.
    5.  **Persist:** Insert the pricing record. Write audit log `COURSE_PRICING_CREATED`.
*   **Outputs & Postconditions:**
    *   New pricing rule version registered and active from `effectiveStartDate`.
*   **Priority:** Must Have

---

### FR-CRS-005: Configure Completion Rules
*   **Description & Actors:** Allows the Academic Director to define graduation benchmarks for a course.
*   **Preconditions:**
    1.  User has permission: `course.catalog.create`.
    2.  Course exists.
*   **Inputs:**
    *   `courseId` (UUID)
    *   `minimumAttendancePercent` (Integer, 0 to 100)
    *   `examRequired` (Boolean)
    *   `manualApprovalRequired` (Boolean)
    *   `feeClearanceRequired` (Boolean)
    *   `effectiveStartDate` (Date)
    *   `effectiveEndDate` (Date, optional)
*   **Processing Steps:**
    1.  **Validation:** Ensure `minimumAttendancePercent` is between 0 and 100.
    2.  **Exclusivity check:** Ensure no other active completion rule exists for this course with overlapping dates.
    3.  **Overwrite/Version:** If there is a current rule, set its `effectiveEndDate = effectiveStartDate - 1 day`.
    4.  **Save:** Persist to `CourseCompletionRule` table. Log `COURSE_COMPLETION_RULE_CREATED` to audit.
*   **Outputs & Postconditions:**
    *   Versioned completion rules set for the course.
*   **Priority:** Must Have

---

## 2.3 Training Delivery (Batch) Management

### FR-CRS-006: Create Delivery Batch
*   **Description & Actors:** Allows Branch Managers to instantiate a new batch for delivery.
*   **Preconditions:**
    1.  User has permission: `batch.delivery.create`.
    2.  Course exists and status is `Active`.
    3.  Branch exists and is active.
*   **Inputs:**
    *   `batchCode` (String, unique, alphanumeric, e.g., BATCH-2026-001)
    *   `batchName` (String, 1-150 chars)
    *   `courseId` (UUID)
    *   `branchId` (UUID)
    *   `startDate` (Date)
    *   `endDate` (Date)
    *   `capacity` (Integer, > 0)
    *   `waitingListEnabled` (Boolean)
    *   `allowOverbooking` (Boolean)
*   **Processing Steps:**
    1.  **Unique Code Verification:** Check that `batchCode` is globally unique. If duplicate, throw `ERR_CRS_DUPLICATE_BATCH_CODE`.
    2.  **Effective Range Check:** Verify that batch `startDate` and `endDate` fall within the parent Course's effective date range.
    3.  **Date Validity Check:** Enforce `startDate >= current_date` and `endDate > startDate`.
    4.  **Branch Matching:** Verify the batch's `branchId` matches the course's `branchId` context or is a valid descendant branch hierarchy node.
    5.  **Initialize Counters:** Set current enrollment counter `currentEnrollmentCount = 0`.
    6.  **Persist:** Write to `Batch` table. Set status to `Draft`. Write audit entry `BATCH_CREATED`.
*   **Outputs & Postconditions:**
    *   Batch created in `Draft` state.
*   **Priority:** Must Have### FR-CRS-007: Batch State Transition
*   **Description & Actors:** Allows Branch Managers or Academic Coordinators to transition the operational status of a batch.
*   **Preconditions:**
1.  User has permission: `batch.delivery.transition`.
2.  Batch exists.
*   **Inputs:**
    *   `batchId` (UUID)
    *   `targetStatus` (Enum: Draft, OpenForEnrollment, InProgress, Completed, Cancelled)
*   **Processing Steps:**
1.  **Draft to OpenForEnrollment:** Verify a Primary Trainer is assigned to the batch. If no trainer is assigned, block transition. Throw `ERR_CRS_BATCH_NO_TRAINER`.
2.  **OpenForEnrollment to InProgress:** Verify current date is `>= startDate`. Transition state to block new standard registrations unless `allowOverbooking` is true.
3.  **InProgress to Completed:** Verify all scheduled timetabled sessions have passed. Publish the `BatchCompleted` domain event to the transactional outbox. Downstream, the `Exam, Result & Completion Management` context subscribes to this event to run completion evaluation rules asynchronously on all participants.
4.  **Any state to Cancelled:** Publish the `BatchCancelled` domain event to the transactional outbox. Downstream, the `Admission & Enrollment` context subscribes to this event to cancel active student enrollments, and the `Fee, Billing & Receivables Management` context subscribes to trigger refund evaluations asynchronously. No direct cross-context database mutations are performed.
5.  **Save & Audit:** Update `status` in the `Batch` table. Write audit log `BATCH_STATUS_CHANGED`.
*   **Outputs & Postconditions:**
    *   Batch status transitioned. Domain events published to Outbox.
*   **Priority:** Must Have

---

### FR-CRS-008: Enforce Capacity Limits
*   **Description & Actors:** Exposes API methods for the Admission & Enrollment context to query and reserve/release seat allocations, preventing classroom or online overfill.
*   **Preconditions:**
1.  Admission & Enrollment context calls the Batch capacity allocation service during student enrollment attempts.
*   **Inputs:**
    *   `batchId` (UUID)
    *   `requestedSeats` (Integer, default 1)
*   **Processing Steps:**
1.  **Fetch Capacities:** Query `capacity`, `currentEnrollmentCount`, `allowOverbooking`, and `waitingListEnabled` from the `Batch` table using a pessimistic write-lock (`SELECT FOR UPDATE`).
2.  **Evaluate Capacity:**
    *   If `currentEnrollmentCount + requestedSeats <= capacity`, proceed. Increment `currentEnrollmentCount` by `requestedSeats`. Return `SUCCESS`.
    *   If `currentEnrollmentCount + requestedSeats > capacity`:
        *   If `allowOverbooking` is `true`, proceed, increment count, and return `SUCCESS_OVERBOOKED`.
        *   If `allowOverbooking` is `false` and `waitingListEnabled` is `true`, return `WAITLIST_REDIRECT`.
        *   If `allowOverbooking` is `false` and `waitingListEnabled` is `false`, block registration and throw `ERR_CRS_BATCH_FULL`.
3.  **Persist & Log:** Commit the incremented count. Write audit trace.
*   **Outputs & Postconditions:**
    *   Seat allocated, or user redirected to waitlist, or blocked.
*   **Priority:** Must Have

---

## 2.4 Waiting List Management

### FR-CRS-009: Manage Waiting List
*   **Description & Actors:** Allows Counselors or Registrars to queue a learner on a full batch.
*   **Preconditions:**
1.  User has permission: `batch.waitlist.manage`.
2.  Batch exists, is full, and has `waitingListEnabled = true`.
*   **Inputs:**
    *   `batchId` (UUID)
    *   `studentId` (UUID, optional)
    *   `leadId` (UUID, optional)
*   **Processing Steps:**
1.  **Duplicate Check:** Verify the student (or lead) is not already active on the waitlist or enrolled in this batch. If they are, throw `ERR_CRS_DUPLICATE_WAITLIST_ENTRY`.
2.  **Determine Position:** Query the maximum `queuePosition` for the batch. Set the new entry's `queuePosition = maxPosition + 1`.
3.  **Persist:** Insert a new record in the `WaitingList` table with status `Waiting` (mapping `studentId` or `leadId` accordingly).
4.  **Audit Trail:** Log `WAITLIST_ENTRY_CREATED`.
*   **Outputs & Postconditions:**
    *   Student/Lead queued on waitlist with a sequential position number.
*   **Priority:** Should Have

---

### FR-CRS-010: Waitlist Promotion
*   **Description & Actors:** System or Registrar promotes a queued student when a seat becomes available.
*   **Preconditions:**
1.  An active enrollment is cancelled or batch capacity is expanded.
*   **Inputs:**
    *   `batchId` (UUID)
*   **Processing Steps:**
1.  **Retrieve Candidate:** Query the waitlist for the batch to fetch the entry with `queuePosition = 1` and status `Waiting` using a transaction lock.
2.  **Verify Space:** Check if a seat is now free (`currentEnrollmentCount < capacity`).
3.  **Promote:**
    *   Change waitlist status to `Promoted`.
    *   Publish `WaitlistStudentPromoted` domain event (containing `studentId`, `leadId`, and `batchId`). Downstream, the `Admission & Enrollment` context subscribes to this to create the enrollment. No enrollment records are created directly by the Batch context promotion service.
    *   Increment batch `currentEnrollmentCount` by 1.
4.  **Reorder Queue:** Query all remaining `Waiting` entries for this batch, sort by `queuePosition`, and decrement their position by 1.
5.  **Notifications:** Trigger notification event to alert the promoted student via email/SMS.
6.  **Audit:** Record `WAITLIST_ENTRY_PROMOTED`.
*   **Outputs & Postconditions:**
    *   First student promoted and waitlist status updated; subsequent queue positions shifted.
*   **Priority:** Should Have

---

## 2.5 Faculty Allocation & Conflict Checks

### FR-CRS-011: Assign Trainer to Batch
*   **Description & Actors:** Allows Branch Managers or Academic Coordinators to allocate faculty to a batch delivery.
*   **Preconditions:**
    1.  User has permission: `batch.delivery.assign`.
    2.  Trainer exists in the Trainer database and is in `Active` status.
    3.  Batch exists and is not `Completed` or `Cancelled`.
*   **Inputs:**
    *   `batchId` (UUID)
    *   `trainerId` (UUID)
    *   `role` (Enum: Primary, Assistant, Observer)
    *   `assignmentStartDate` (Date)
    *   `assignmentEndDate` (Date)
*   **Processing Steps:**
    1.  **Date Validation:** Verify that `assignmentStartDate` and `assignmentEndDate` align with the batch start/end dates.
    2.  **Overlap Check:** Run `FR-CRS-012` to check for scheduling conflicts.
    3.  **Primary Trainer Invariant:** If `role = Primary`, check if a Primary trainer is already assigned for the overlapping dates. If yes, block assignment or require explicit role demotion. Throw `ERR_CRS_PRIMARY_TRAINER_ALREADY_ASSIGNED`.
    4.  **Persist:** Write mapping to `BatchTrainer` table. Write audit log `TRAINER_ASSIGNED_TO_BATCH`.
*   **Outputs & Postconditions:**
    *   Trainer assigned to batch.
*   **Priority:** Must Have

---

### FR-CRS-012: Validate Trainer Conflicts
*   **Description & Actors:** System validator to intercept trainer schedule double-booking.
*   **Preconditions:**
    1.  Triggered automatically during `FR-CRS-011`.
*   **Inputs:**
    *   `trainerId` (UUID)
    *   `startDate` (Date)
    *   `endDate` (Date)
    *   `batchId` (UUID)
*   **Processing Steps:**
    1.  **Query Existing Assignments:** Retrieve all active assignments for the trainer from the `BatchTrainer` table where the assignment date range overlaps the input `startDate` and `endDate` range.
    2.  **Timetable Session Validation:**
        *   For each overlapping assignment, fetch the associated batch's timetabled sessions (weekly days, start times, and end times) from the Scheduling database.
        *   Compare the proposed session times of the target `batchId` against existing assigned sessions.
        *   If there is a day-and-time intersection (even partial overlap), return conflict details: `Conflict found with Batch Code [XYZ] on [Day] at [Time]`.
    3.  **Resolve:** If conflict list is not empty, block assignment and throw `ERR_CRS_TRAINER_SCHEDULE_CONFLICT`.
    4.  **Success:** If no overlaps, return `SUCCESS`.
*   **Outputs & Postconditions:**
    *   Conflict report returned or validation passed.
*   **Priority:** Must Have

---

## 2.6 Custom Delivery Configurations

### FR-CRS-013: Support Corporate Config
*   **Description & Actors:** Allows Branch Managers to configure a batch specifically for B2B corporate groups.
*   **Preconditions:**
    1.  User has permission: `batch.delivery.update`.
    2.  Corporate client account exists and is active.
*   **Inputs:**
    *   `batchId` (UUID)
    *   `corporateAccountId` (UUID)
    *   `pricingAgreementOverride` (Decimal, 12, 3 format, optional)
*   **Processing Steps:**
    1.  **Link Corporate Context:** Update the `Batch` record with `corporateAccountId`.
    2.  **Override Resolution:** If `pricingAgreementOverride` is set, write a batch-specific pricing record linked to this batch ID, overriding global course corporate defaults.
    3.  **Enforce Limits:** Set capacity constraints to match corporate nominated limits.
    4.  **Persist & Log:** Save configurations. Write audit log `BATCH_CORPORATE_CONFIGURED`.
*   **Outputs & Postconditions:**
    *   Batch flagged as Corporate training. Pricing resolves to corporate rates.
*   **Priority:** Should Have

---

### FR-CRS-014: Support Walk-In Config
*   **Description & Actors:** Enables same-day training delivery and rapid evaluation.
*   **Preconditions:**
    1.  User has permission: `batch.delivery.update`.
    2.  The parent course has `allowWalkInCompletion = true`.
*   **Inputs:**
    *   `batchId` (UUID)
*   **Processing Steps:**
    1.  **Set Walk-in Flag:** Toggle the `isWalkIn` configuration flag on the `Batch` model.
    2.  **Bypass Timetable Invariant:** Allow scheduling configuration to compress into a single day.
    3.  **Auto-Enable Completion Evaluator:** Flag the batch to emit `BatchCompleted` domain events immediately upon same-day session completions, triggering async downstream completion evaluations.
    4.  **Save:** Commit changes. Write audit log `BATCH_WALKIN_CONFIGURED`.
*   **Outputs & Postconditions:**
    *   Batch configured for fast-track walk-in completion.
*   **Priority:** Must Have

---

# 3. Business Rules

| Rule ID | Context / Entity | Rule Description | State Transitions / Limits / Bounds |
| --- | --- | --- | --- |
| **BR-CRS-001** | Course Profile | Course Code must be unique. | Global uniqueness check (case-insensitive) on insert. |
| **BR-CRS-002** | Course Profile | Course Name must be unique within branch and department scope. | Enforce uniqueness constraint: `BranchId` + `DepartmentId` + `Name`. |
| **BR-CRS-003** | Course Profile | Active Course must possess at least one active pricing and completion rule. | Checked during transition from `Draft` to `Active` status. |
| **BR-CRS-004** | Course Profile | Inactive course cannot accept new batches or enrollments. | Block `Batch.create` and `Enrollment.create` if `Course.status = Inactive`. |
| **BR-CRS-005** | Course Profile | Deactivation of course requires active batch closure. | Prevent course status transition to `Inactive` if batches are `Open` or `InProgress`. |
| **BR-CRS-006** | Course Profile | Logical archival is permanent. | Hard deletes are blocked. Transitioning to `Archived` flags `isDeleted = true`. |
| **BR-CRS-007** | Course Pricing | Active course pricing is immutable. Base pricing must be versioned with non-overlapping effective dates. | Checked on pricing insert. Active pricing records cannot be updated. Any modifications require creating a new pricing version with updated effective date ranges (`effectiveStartDate < effectiveEndDate`). |
| **BR-CRS-008** | Course Pricing | Pricing decimals must match Omani Rial norms. | Enforce `Decimal(12, 3)` precision (three decimal places). |
| **BR-CRS-009** | Course Pricing | Oman VAT default is standard 5.000%. | Defaults `taxPercentage = 5.000` unless explicitly flagged as exempt. |
| **BR-CRS-010** | Completion Rules | Active completion rules are immutable. Only one active completion rule model is allowed per course at a time. | Checked during insert. Active completion rules cannot be updated. New rules require creating a new rule version; old rules are truncated: `effectiveEndDate = newStart - 1 day`. |
| **BR-CRS-011** | Batch Profile | Batch Code must be unique. | Global check on insert. |nsert. |
| **BR-CRS-012** | Batch Profile | Batch execution dates must fit Course effective dates. | Enforce `Batch.startDate >= Course.effectiveStartDate` and `Batch.endDate <= Course.effectiveEndDate`. |
| **BR-CRS-013** | Batch Profile | Batch capacity must be greater than zero. | Enforce `capacity > 0` validation on insert and update. |
| **BR-CRS-014** | Batch Profile | Batch transition to Open For Enrollment requires trainer. | Prevent transition to `OpenForEnrollment` if trainer assignment list is empty. |
| **BR-CRS-015** | Batch Profile | Overbooking bypass is restricted. | `allowOverbooking` defaults to `false`. Can only be updated by authorized roles. |
| **BR-CRS-016** | Batch Trainer | Trainer cannot have overlapping session assignments. | Checked on trainer assign. Day/Time overlap across timetables triggers block. |
| **BR-CRS-017** | Batch Trainer | Trainer assignment dates must align with batch start and end dates. | Enforce `assignmentStartDate >= batch.startDate` and `assignmentEndDate <= batch.endDate`. |
| **BR-CRS-018** | Waiting List | Waitlist entries must follow FIFO promotion queue order. | Queued entries sorted strictly by ascending `queuePosition` values. |
| **BR-CRS-019** | Waiting List | Waitlist duplicates blocked. | Unique constraint: `StudentId` + `BatchId` + status `Waiting`. |
| **BR-CRS-020** | Walk-In Batch | Walk-In batches require course-level walk-in authorization. | Checked on batch setup. Blocks toggle if `Course.allowWalkInCompletion = false`. |
| **BR-CRS-021** | Auditing | Audit logs are immutable. | Write actions only. Update and Delete operations are blocked on the `AuditLog` table. |

---

# 4. Cross-Module Dependencies Mapping

| Dependent Module | Dependency Details | Impact on Course & Batch Module |
| --- | --- | --- |
| **Identity & Access Management (IAM)** | Authentication & Permissions | Intercepts all administrative mutations. Restricts branch data access context. |
| **Organization Management** | Branch & Department Contexts | Courses must link to active Branches and Departments. Batches isolate by Branch context. |
| **Admission & Enrollment** | Student Enrollments | Listens to batch status changes. Increments `currentEnrollmentCount` on seat confirmation. |
| **Scheduling & Timetable** | Session and venue calendars | Batches provide date boundaries. Trainer allocation checks overlap against timetabled sessions. |
| **Attendance Management** | Attendance session verification | Evaluates batch students roster. Feeds attendance % logs to completion evaluator. |
| **Fee & Finance Management** | Invoice generation & tax billing | Consumes dynamically resolved pricing hierarchies (Base -> Overrides -> VAT calculation). |
| **Exam, Result & Completion** | Scoring & Graduation verification | Consumes completion rules (attendance %, exam checks) to approve student graduation. |
| **Certificate Management** | Certificate issuance verification | Queries batch status and student completion rules before authorizing PDF compile. |
| **Trainer Management** | Trainer profile status | Verification that trainers assigned to batches are active and qualified. |
| **Audit & Compliance** | Security audit logging | Receives detailed JSON diffs of all mutations. |
