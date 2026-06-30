# Module 06: Course Catalog & Training Delivery (Batch) Management

## Document Information

| Item        | Value                                                     |
| ----------- | --------------------------------------------------------- |
| Module      | Course Catalog & Training Delivery (Batch) Management     |
| Module Code | CRS                                                       |
| Version     | 3.0                                                       |
| Owner       | Architecture Team / Academic Division                     |
| Domain      | Course Catalog & Training Delivery (Core Domain)          |
| Priority    | Critical                                                  |
| Depends On  | Organization Management, IAM                              |
| Used By     | Admission & Enrollment, Scheduling, Attendance, Finance, Exams & Completion, Certificates, Corporate Training |

---

## 1. Purpose and Objective

The Course Catalog & Training Delivery (Batch) Management module serves as the central definition and scheduling core of the ASTI Integrated Institute Management System (IMS). 

The primary purpose of this module is to model **what** training is offered by ASTI (Courses, pricing structures, and academic completion rules) and **how** it is executed (Batches, capacities, trainer assignments, and waiting lists). 

This module ensures that all enrollment actions, timetable sessions, attendance tracking, invoice generations, and certificate verifications are backed by a single source of truth for course specifications and batch contexts. It enforces structural invariants, prevents scheduling conflicts, manages capacity constraints, and maintains the historical integrity of versioned rules.

---

## 2. Business Goals

The implementation of this module is designed to achieve the following specific business objectives:

*   **BO-CRS-001 (Centralized Standardization):** Standardize the course taxonomy, categorization, and course codes across all ASTI branches, preventing administrative divergence.
*   **BO-CRS-002 (Flexible Billing Configurations):** Support branch-specific, customer-type (Individual, Corporate, Walk-In), batch-type, and currency-specific pricing matrices while maintaining audit trail.
*   **BO-CRS-003 (Strict Academic Invariants):** Define formal course completion rules (attendance minimums, mandatory exams, and approvals) at the catalog level that can be programmatically verified before graduation.
*   **BO-CRS-004 (Optimized Seat Utilization):** Track real-time batch capacity, enforce limits, and manage waitlists to maximize classroom and online session seating.
*   **BO-CRS-005 (Conflict-Free Faculty Scheduling):** Validate trainer schedules across batches to prevent double-booking, over-allocation, or scheduling on public holidays.
*   **BO-CRS-006 (Compliance & Historical Auditing):** Support versioned effective dating (`effectiveStartDate` / `effectiveEndDate`) for pricing and completion rules to ensure historical enrollments remain unchanged during pricing updates.

---

## 3. Scope

### 3.1 Included in Scope
The following functional capabilities are owned and managed by the Course Catalog & Training Delivery (Batch) Management module:

1.  **Course Taxonomy & Profile Management:** Creation, editing, activation, suspension, and logical archiving of course definitions, codes, categories, and descriptions (with bilingual English/Arabic support).
2.  **Bilingual Dynamic Content:** Support for dual-language metadata fields to feed both the admin portal and the static public course pages.
3.  **Pricing Hierarchy Resolution:** Definition of course pricing and discount hierarchies (Batch override -> Branch override -> Global catalog default).
4.  **Completion Rule Modeling:** Configuration of academic rules per course, including attendance thresholds (%), exam requirements, fee clearance flags, and manual verification steps.
5.  **Batch Lifecycle Management:** State transition handling for batches from Draft, Open for Enrollment, In Progress, to Completed or Cancelled.
6.  **Capacity and Waitlist Constraints:** Real-time seat counters, overbooking permission controls, and ordered waitlists with automated or manual promotion flows.
7.  **Faculty Allocation:** Trainer-to-batch assignments, specifying primary/assistant roles and verifying scheduling overlap invariants.
8.  **Audit Event Logging:** Generation of transactional audit logs for all mutations to courses, pricing versions, completion rules, batches, and trainer mappings.

### 3.2 Excluded from Scope
The following operational capabilities are associated with training delivery but are owned by external contexts:

1.  **Enrollment Transactions:** The actual enrollment of a student (represented by the `Enrollment` aggregate) is owned by **Admission & Enrollment Management**.
2.  **Daily Attendance Logging:** The actual daily marking of attendance records is owned by **Attendance Management**.
3.  **Timetable Session Execution:** The exact date-time-venue calendar slots for class sessions are owned by **Scheduling & Timetable Management**.
4.  **Grade Book & Exam Execution:** Recording marks, managing exam papers, and determining individual student scores are owned by **Exam, Result & Completion Management**.
5.  **Invoice Generation and Receipting:** Financial transactions, payment processing, tax invoice formatting (Oman VAT), and payment logs are owned by **Fee, Billing & Receivables Management**.
6.  **Certificate Issuance & Verification:** PDF compilation, QR code generation, and certificate verification are owned by **Certificate Management**.

---

## 4. Stakeholders & Actors

### 4.1 Human Actors
*   **Academic Director / Curriculum Manager (Internal):** Creates courses, defines completion rules, categorizes courses, and publishes the course catalog.
*   **Branch Manager (Internal):** Manages branch-level pricing overrides, configures branch batches, overrides batch pricing, and reviews waitlists.
*   **Counselor / Registrar (Internal):** Views active courses and open batches, queries batch capacity, and adds students to waiting lists.
*   **Trainer / Faculty Member (Internal):** Views assigned batches, checks batch participant lists, and recommends batch completion.
*   **Accountant / Finance Officer (Internal):** Views pricing structures, resolves pricing overrides, and validates batch financial parameters.
*   **Student / Learner (External):** Queries open batches, views course descriptions, and requests waitlist placements.
*   **Corporate Client Coordinator (External):** Nominates corporate employees into corporate-specific batches and reviews batch timelines.

### 4.2 System Actors
*   **Billing Engine:** Consumes resolved pricing rules to calculate invoice line items and tax amounts.
*   **Completion Evaluator:** Evaluates course completion rules against student attendance and exam marks to confirm certificate eligibility.
*   **Timetable Scheduler:** Fetches batch durations and trainer allocations to build session calendar grids.
*   **Notification Engine:** Listens to batch and course events (e.g., `BatchCapacityReached`, `BatchOpenedForEnrollment`) to trigger alerts.

---

## 5. Functional Overview

The following tree diagram represents the submodules and functional areas owned by this context:

```text
Module 06: Course Catalog & Training Delivery (Batch) Management
├── Course Catalog Submodule
│   ├── Course Profile Definition (Bilingual Name, Code, Description)
│   ├── Taxonomy & Categorization (Categories, Subjects, Stream mapping)
│   └── Lifecycle States (Draft, InReview, Approved, Published, Archived)
├── Pricing & Discount Configuration Submodule
│   ├── Global Course Pricing Matrix
│   ├── Branch-Specific Pricing Rules
│   ├── Customer-Type & Batch-Type Pricing Dimensions
│   └── Effective Dating & Version History (Base Price, OMR currency, VAT)
├── Academic Completion Rules Submodule
│   ├── Minimum Attendance Thresholds
│   ├── Exam & Assessment Prerequisites
│   ├── Fee Clearance Validation Flags
│   └── Manual Verification Approval Workflows
├── Batch Execution Submodule
│   ├── Batch Identification & Configuration (Dates, Branch context)
│   ├── Lifecycle Transitions (Draft -> Open -> In Progress -> Completed/Cancelled)
│   └── Classroom & Venue Capacity Controls
├── Faculty Allocation Submodule
│   ├── Trainer Search & Assignment (Primary / Assistant / Observer roles)
│   ├── Overlap & Double-booking Validation Engine
│   └── Trainer Availability Checks
└── Capacity & Waiting List Submodule
    ├── Seat Counter & Capacity Enforcement
    ├── Waitlist Positioning & Order Preservation
    └── Waitlist Promotion & Notification Triggering
```

---

## 6. Business Capabilities & User Types

The following table maps business capabilities to user portals and access classifications (Internal vs. External):

| Business Capability | Description | Primary Actor | Portal Access | Classification |
| --- | --- | --- | --- | --- |
| **Catalog Management** | Create, edit, and publish course profiles and categories. | Academic Director | Admin Portal | Internal |
| **Pricing Setup** | Manage base pricing, branch overrides, and VAT settings. | Academic Director, Branch Manager | Admin Portal | Internal |
| **Completion Rule Config** | Define requirements for attendance, exams, and approvals. | Academic Director | Admin Portal | Internal |
| **Batch Allocation** | Create batches, configure capacities, and schedule ranges. | Branch Manager | Admin Portal | Internal |
| **Faculty Assignment** | Map trainers to batches and validate schedules. | Branch Manager, Academic Coordinator | Admin Portal | Internal |
| **Waitlist Processing** | Manage full batch queue, prioritize, and promote. | Registrar, Counselor | Admin Portal | Internal |
| **Course Lookup** | Read published courses, descriptions, and structures. | Student, Counselor | Admin Portal, Public Web | External / Internal |
| **Batch Roster View** | View active student list, trainer schedules, and status. | Trainer, Branch Manager | Admin Portal, Trainer Portal | Internal |

---

## 7. Functional Requirements Checklist

The following table summarizes the functional requirements detailed in Part 1 of the FRD:

| Req ID | Title | Summary Description | Priority |
| --- | --- | --- | --- |
| **FR-CRS-001** | Create Course Profile | Define course codes, bilingual names, descriptions, and taxonomy. | Must Have |
| **FR-CRS-002** | Update Course Details | Modify descriptions, tags, and classification settings. | Should Have |
| **FR-CRS-003** | Course State Transition | Transition courses between Draft, InReview, Approved, Published, and Archived. | Must Have |
| **FR-CRS-004** | Configure Course Pricing | Define versioned base pricing with branch, currency, and type. | Must Have |
| **FR-CRS-005** | Configure Completion Rules | Define versioned criteria for attendance, assessments, and approvals. | Must Have |
| **FR-CRS-006** | Create Delivery Batch | Instantiate a course delivery context with date ranges and branch. | Must Have |
| **FR-CRS-007** | Batch State Transition | Transition batches between Draft, Open, In Progress, Completed, Cancelled. | Must Have |
| **FR-CRS-008** | Enforce Capacity Limits | Verify seat availability and block enrollments if capacity is full. | Must Have |
| **FR-CRS-009** | Manage Waiting List | Queue learners on a full batch and preserve chronological order. | Should Have |
| **FR-CRS-010** | Waitlist Promotion | Promote a waitlist entry to an active enrollment upon seat release. | Should Have |
| **FR-CRS-011** | Assign Trainer to Batch | Map trainers to batch schedules with defined roles (Primary/Assistant). | Must Have |
| **FR-CRS-012** | Validate Trainer Conflicts | Intercept trainer double-bookings and schedule overlaps. | Must Have |
| **FR-CRS-013** | Support Corporate Config | Set corporate batch context, link to client ID, and set billing rules. | Should Have |
| **FR-CRS-014** | Support Walk-In Config | Enable rapid batch assignment and same-day completion tags. | Must Have |

---

## 8. Permission Model Overview

The module enforces authorization controls using the following modular permissions, which must be seeded in the IAM database:

*   **`course.catalog.view`:** Allowed to read courses, categories, pricing, and completion rules.
*   **`course.catalog.create`:** Allowed to create new courses, pricing versions, and completion rules.
*   **`course.catalog.update`:** Allowed to modify course profiles and pricing details.
*   **`course.catalog.publish`:** Allowed to transition courses to `Published`.
*   **`course.catalog.archive`:** Allowed to soft-delete or archive courses.
*   **`batch.delivery.view`:** Allowed to view batch details, trainer assignments, and waiting lists.
*   **`batch.delivery.create`:** Allowed to instantiate new batches.
*   **`batch.delivery.update`:** Allowed to modify batch configurations, capacity, and dates.
*   **`batch.delivery.assign`:** Allowed to assign and remove trainers from a batch.
*   **`batch.delivery.transition`:** Allowed to transition batch status (e.g., to In Progress or Completed).
*   **`batch.waitlist.manage`:** Allowed to add, prioritize, and manually promote waitlist entries.
*   **`course.pricing.override`:** Special permission allowing branch managers to override base pricing.

---

## 9. Security & Audit Requirements Summary

1.  **Branch-Scoped Isolation:** All write and read operations on `Batch` and branch-scoped `CoursePricing` records must check the active branch context of the authenticated user. A user with `BranchAccess` to Branch A cannot create, update, or view batches for Branch B unless they possess the consolidated view permission.
2.  **Immutability of History:** Modifying an active pricing structure or completion rule is prohibited. Instead, the user must update the `effectiveEndDate` of the current record and create a new version with an aligned `effectiveStartDate`.
3.  **Soft-Deletes Mandatory:** Hard database deletions are prohibited for courses, batches, and trainer assignments. The system must update `isDeleted = true` and `deletedAt = now()`.
4.  **Detailed Audit Trails:** Every modification must write a record to the `AuditLog` table capturing:
    *   `entityType`: (e.g., "Course", "CoursePricing", "Batch", "BatchTrainer")
    *   `entityId`: The identifier of the mutated record
    *   `action`: (e.g., "CREATED", "UPDATED", "STATUS_CHANGED", "TRAINER_ASSIGNED")
    *   `oldValue` and `newValue`: JSON snapshots representing changed attributes
    *   `branchId`: The branch context under which the edit occurred
    *   `performedBy`: The UUID of the authenticated User.

---

## 10. Non-Functional Requirements Summary

*   **Performance (Latency):** Catalog search and batch capacity lookup APIs must return responses in less than 200ms under a load of 100 concurrent requests.
*   **Trainer Overlap Calculation:** The trainer conflict validation check must execute in less than 50ms upon batch assignment request.
*   **Concurrency:** Optimistic locking must be enforced on batch enrollment counts. The system must handle up to 20 concurrent enrollment attempts on the same batch without double-allocating a single seat.
*   **Localization:**
    *   Database must store course names, description fields, and categories in bilingual JSON structures supporting English (`en`) and Arabic (`ar`) keys.
    *   Timezone configuration default for all scheduling date-times must reside in UTC+4 (Gulf Standard Time).
    *   Currency default is OMR (Omani Rial), formatting financial decimals strictly to three decimal places (e.g., `OMR 120.000`).
*   **Compliance:** Maintain data history in compliance with the Omani Ministry of Higher Education, Research and Innovation training regulations.
