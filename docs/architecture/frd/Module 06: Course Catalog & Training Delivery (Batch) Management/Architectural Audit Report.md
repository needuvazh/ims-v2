# Architectural Audit Report: Module 06 — Course Catalog & Training Delivery (Batch) Management

**Prepared By:** Principal Solutions Architect & Senior Staff Engineer  
**Date:** June 30, 2026  
**Status:** Audit Completed  
**Subject:** Rigorous architectural review of the Module 06 Functional Requirement Document (FRD) suite, comparing Bounded Context Map, ER Model, and current Prisma Schema models.

---

## 1. Executive Summary

| Audit Item | Value / Grade |
| --- | --- |
| **Module Reviewed** | Module 06 — Course Catalog & Training Delivery (Batch) Management |
| **Document Version** | 3.0 (Draft) |
| **Primary Codebase Target** | `packages/database/prisma/schema.prisma` |
| **Overall Alignment Grade** | **Pass with Gaps** |

### Review Summary
The Module 06 Functional Requirement Documents (FRDs) establish a highly detailed, localized, and domain-driven design structure for Course Catalog and Batch Delivery services at ASTI. Omani VAT defaults (5.000%), Omani Rial pricing models (3 decimal places, `OMR`), bilingual user interfaces (LTR/RTL with Cairo font), and GST (UTC+4) timestamps are accurately prioritized.

However, several critical structural gaps, database-level coupling leaks, and API validation omissions must be remediated to preserve modular monolith boundaries and prevent duplicate identity structures in accordance with ASTI architectural guidelines.

---

## 2. Critical Architectural Misalignments

### 2.1 Boundary Violation: Direct Database Queries Across Contexts
The FRD suite introduces direct queries and constraints on tables owned by external bounded contexts, violating modular monolith boundaries:
*   **Scheduling Database Query Leak:** In [Part 7 (Section 1.4)](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2006:%20Course%20Catalog%20&%20Training%20Delivery%20(Batch)%20Management/Part%207%20%E2%80%93%20Validation%20Rules,%20Error%20Catalog,%20Notifications.md#L97), the trainer scheduling overlap check algorithm directly queries `prisma.timetableSession` (owned by the `Scheduling, Calendar & Holiday Management` context). Instead, it must invoke a public application service or API query exposed by the Scheduling package.
*   **Coupled Relational Constraints:** In [Part 4 (Section 2)](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2006:%20Course%20Catalog%20&%20Training%20Delivery%20(Batch)%20Management/Part%204%20%E2%80%93%20Database%20Entities%20and%20CRUD%20Matrix.md#L244), the ER spec defines a hard database-level foreign key constraint between `WaitingList.studentId` and the `students` table, declaring a physical `ON DELETE RESTRICT` constraint across contexts. In a modular monolith, physical database foreign keys across boundary lines should be avoided (using logical UUID references instead) to keep database schemas independently deployable.
*   **Corporate and Classroom FK Coupling:** In [Part 4 (Section 1.6)](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2006:%20Course%20Catalog%20&%20Training%20Delivery%20(Batch)%20Management/Part%204%20%E2%80%93%20Database%20Entities%20and%20CRUD%20Matrix.md#L150), `corporateAccountId` (owned by Corporate Training) and `classroomId` (owned by Organization Management) are configured as standard relational foreign keys. These must be replaced with logical key identifiers.

### 2.2 Boundary Violation: Enrollment State Mutation Leak
The Admission & Enrollment context is the sole owner of enrollment transitions. Module 06 incorrectly performs or triggers mutations directly on this state:
*   **Enrollment Creation inside Promotion API:** The waitlist promotion route `POST /api/v1/batches/:id/waitlist/promote` ([Part 5, Section 2.2.5](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2006:%20Course%20Catalog%20&%20Training%20Delivery%20(Batch)%20Management/Part%205%20%E2%80%93%20API%20Contracts.md#L324)) directly returns an `enrollmentId` and states that it creates the enrollment record. Instead, the promotion API must only update the waitlist queue state and emit a `WaitlistStudentPromoted` domain event. The Enrollment context must consume this event to create the enrollment.
*   **Cross-Context Status Transitions:** In `FR-CRS-007` ([Part 1, Section 2.3](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2006:%20Course%20Catalog%20&%20Training%20Delivery%20(Batch)%20Management/Part%201%20%E2%80%93%20Business%20Overview,%20Functional%20Requirements,%20Business%20Rules.md#L212)), transitioning a batch to `Cancelled` directly cancels enrollments and triggers refund processes. Under DDD, the Batch context must publish a `BatchCancelled` event. Admission/Enrollment and Finance contexts must subscribe to this event to perform cancellations and refunds asynchronously.
*   **Direct Completion Rule Evaluation:** In `FR-CRS-007`, completing a batch directly executes participant validation using the `CompletionEvaluator`. The `CompletionEvaluator` belongs to the `Exam, Result & Completion Management` context. The Batch service should instead publish a `BatchCompleted` event, which downstream contexts consume to evaluate completions.
*   **Direct Incrementing of Capacity Roster:** In `FR-CRS-008` (Enforce Capacity Limits) and the [Part 2 Sequence Diagram](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2006:%20Course%20Catalog%20&%20Training%20Delivery%20(Batch)%20Management/Part%202%20%E2%80%93%20User%20Stories,%20Use%20Cases,%20Workflows,%20State%20Machines.md#L345), the Enrollment Service directly increments `currentEnrollmentCount` on the `Batch` table. Capacity modification must be encapsulated inside Batch context services (e.g. exposing a `reserveSeat(batchId)` command).

### 2.3 Boundary Violation: Duplicate Identity Structures
*   **Trainer & Student Parallel Tables:** The FRD specifies references to `trainers.id` and `students.id`. However, the current Prisma schema contains a `Student` model with duplicate identity fields (`firstName`, `lastName`, `email`, `phone`) that do not reference the central `Person` table.
*   **Architectural Standard Alignment:** In accordance with the Bounded Context Map, `Student` and `Trainer` must be defined as role extension tables (`StudentProfile` and `TrainerProfile`) that reference a central `Person` table. The FRD must explicitly enforce that name, phone, civil ID, and email reside in the `Person` model, while the profiles only hold context-specific details (e.g., student number or trainer qualification).

### 2.4 Audit Violation: Direct Updates Allowed on Active Pricing/Rules
*   **Rule Immutability:** In [Part 4 (Section 3 CRUD Matrix)](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2006:%20Course%20Catalog%20&%20Training%20Delivery%20(Batch)%20Management/Part%204%20%E2%80%93%20Database%20Entities%20and%20CRUD%20Matrix.md#L260), `CoursePricing` and `CourseCompletionRule` list `U = Yes` (Update = true) for Academic Directors and Branch Managers. 
*   **Risk:** This allows direct updates of active pricing and completion benchmarks in-place, which bypasses versioning, compromises audit history, and invalidates historical invoice and certificate verification. Updates on active pricing and rule records must be restricted strictly to drafts (`U = Draft Only`), requiring new version creation with effective dates for any active record modifications.

---

## 3. Database & Prisma Gaps

### 3.1 Massive Schema Discrepancy (Codebase vs. FRD)
The current [schema.prisma](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/database/prisma/schema.prisma) has a bare-bones `Course` model and is completely missing the following tables required by the Module 06 specification:
1.  `CourseCategory` (`course_categories`)
2.  `CoursePricing` (`course_pricings`)
3.  `CourseDiscount` (`course_discounts`)
4.  `CourseCompletionRule` (`course_completion_rules`)
5.  `Batch` (`batches`)
6.  `BatchTrainer` (`batch_trainers`)
7.  `WaitingList` (`waiting_list`)

Furthermore, the existing `Course` model has relationships to `Lead` and `Inquiry` that must be preserved when extending the model fields (`categoryId`, `departmentId`, and bilingual strings).

### 3.2 Missing Core Indexes
Because Module 06 relies heavily on branch-scoped filtering context and date overlap checks on almost every operation, the following indexes are completely missing from the Part 4 entity specifications:
*   **`Course`:** Needs `@@index([categoryId])`, `@@index([departmentId])`
*   **`CoursePricing`:** Needs a composite index `@@index([courseId, branchId, customerType, batchType, status])` to accelerate pricing resolution, and indices on foreign keys `@@index([branchId])`, `@@index([batchId])`.
*   **`CourseDiscount`:** Needs `@@index([courseId])`, `@@index([branchId])`, `@@index([batchId])`
*   **`CourseCompletionRule`:** Needs `@@index([courseId])`
*   **`Batch`:** Needs `@@index([courseId])`, `@@index([branchId])`, `@@index([classroomId])`
*   **`BatchTrainer`:** Needs `@@index([batchId])`, `@@index([trainerId])`
*   **`WaitingList`:** Needs `@@index([batchId])`, `@@index([studentId])` and a composite unique constraint index `@@unique([studentId, batchId, status])` for queue duplicates validation.

### 3.3 Logical Soft-Delete Cascades Technical Gap
*   **Prisma Native Limitation:** The FRD describes `ON DELETE CASCADE (logical soft-delete cascade)` for `Batch ── BatchTrainer` and `Batch ── WaitingList`.
*   **Remediation:** Prisma does not natively cascade soft-deletes (`isDeleted = true`). The application service layer must handle logical cascades programmatically inside a transaction block, or database triggers must be configured. The FRD must explicitly clarify this implementation detail to avoid developer confusion.

---

## 4. API & Validation Anomalies

### 4.1 Missing Zod Script Validation
*   **Discrepancy:** In [Part 3 (CRS-SCR-002)](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2006:%20Course%20Catalog%20&%20Training%20Delivery%20(Batch)%20Management/Part%203%20%E2%80%93%20Screen%20Specifications%20and%20UI%20Components.md#L72), the field validation rule for **Arabic Name** requires "Arabic characters only" (`"Arabic Name is required and must be in Arabic script."`). 
*   **Gap:** The API contract in [Part 5 (Section 2.1.1)](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2006:%20Course%20Catalog%20&%20Training%20Delivery%20(Batch)%20Management/Part%205%20%E2%80%93%20API%20Contracts.md#L48) defines `nameArabic: z.string().min(3).max(150)` but fails to enforce this restriction via regex. The API schema must include regex script checking (e.g., `z.string().regex(/^[\u0600-\u06FF\s]+$/)`) to prevent English inputs from bypassing validation at the boundary.

### 4.2 Omission: Missing Course Category API
*   **Gap:** The CRUD matrix defines access roles for `CourseCategory`, but the API Index in [Part 5](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2006:%20Course%20Catalog%20&%20Training%20Delivery%20(Batch)%20Management/Part%205%20%E2%80%93%20API%20Contracts.md#L12) fails to define any endpoint contracts for managing course categories (e.g., `POST /api/v1/courses/categories`, `GET /api/v1/courses/categories`, etc.).

### 4.3 Arabic Layout OMR Formatting Omission
*   **Gap:** [Part 3](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2006:%20Course%20Catalog%20&%20Training%20Delivery%20(Batch)%20Management/Part%203%20%E2%80%93%20Screen%20Specifications%20and%20UI%20Components.md#L213) defines dynamic LTR/RTL layout switching, Cairo font fallback, and CSS reversals, but fails to define formatting rules for pricing displays in Arabic mode (e.g. suffixing "OMR" to "ر.ع." and localized numeric formatting).

### 4.4 Monolinguism of Batch Names
*   **Gap:** `Batch.batchName` is declared as a single monolingual string (`VARCHAR(150)`). Since batch lists are visible on student-facing portals (`CRS-SCR-009`), having batch names exclusively in English breaks localized RTL Arabic views. Batch names must either support bilingual formatting (e.g., `batchNameEnglish` and `batchNameArabic`) or fallback to auto-generated localized strings.

---

## 5. Actionable Remediation Checklist

To align Module 06 with the monorepo architecture and Omani localization guidelines, implement the following changes:

- [ ] **Decouple Scheduling Queries:** Modify the trainer assignment conflict check (`validateTrainerAssignment` in `Part 7`) to query scheduling conflicts via an application service client interface rather than querying `prisma.timetableSession` directly.
- [ ] **Decouple Cross-Context Operations via Events:**
  - [ ] Rewrite `POST /api/v1/batches/:id/waitlist/promote` to only update waitlist status to `Promoted` and publish `WaitlistStudentPromoted` (do not directly create or return `enrollmentId`).
  - [ ] Modify `FR-CRS-007` to publish `BatchCompleted` and `BatchCancelled` events, removing direct calls to the `CompletionEvaluator`, Enrollment cancellation queries, and Finance refund services.
- [ ] **Fix Waitlist/Student coupling:** Remove physical database foreign key constraints between `WaitingList.studentId` and the `students` table. Use logical UUID keys instead.
- [ ] **Encapsulate Batch Capacity Operations:** Implement a public API service command `BatchApplicationService.reserveSeat(batchId)` or `allocateSeat(batchId)` within the Batch context, rather than allowing the Enrollment Service to directly write/lock `currentEnrollmentCount`.
- [ ] **Align Student and Trainer Identity Models:**
  - [ ] Add a `StudentProfile` database model in Prisma that has a `personId` referencing `Person` 1-to-1, deprecating duplicate firstName, lastName, email, phone fields.
  - [ ] Define the `TrainerProfile` database model in Prisma referencing `Person` 1-to-1.
  - [ ] Update `BatchTrainer.trainerId` to reference `TrainerProfile.id` and `WaitingList.studentId` to reference `StudentProfile.id`.
- [ ] **Enforce Immutability of Pricing & Rules:**
  - [ ] Change the CRUD Matrix in `Part 4` to set `U = Draft Only` (or `No` for active records) on `CoursePricing`, `CourseDiscount`, and `CourseCompletionRule`.
  - [ ] Explicitly state in `Part 1` and `Part 7` that modifying active configurations requires versioning increments.
- [ ] **Resolve Schema Gaps in Prisma:** Update `packages/database/prisma/schema.prisma` to include the models `CourseCategory`, `CoursePricing`, `CourseDiscount`, `CourseCompletionRule`, `Batch`, `BatchTrainer`, and `WaitingList`, preserving existing `leads` and `inquiries` relations on `Course`.
- [ ] **Implement Database Indexes:** Add indexes for all foreign keys and branch-scoping conditions in `Part 4` specs, including unique indexes for Waitlist constraints.
- [ ] **Define Missing API Contracts:** Add API endpoint specs for `CourseCategory` in `Part 5` (REST index, payloads, response shapes).
- [ ] **Enforce Arabic Regex Script Check:** Update Zod schemas in `Part 5` for `nameArabic` using regex rules that mandate the Arabic script block (`z.string().regex(/^[\u0600-\u06FF\s]+$/)`).
- [ ] **Add OMR Currency Layout for RTL layouts:** Specify suffix conversion to "ر.ع." for pricing input fields in Arabic views in `Part 3`.
- [ ] **Bilingualize Batch Profiles:** Add bilingual name support to `Batch` schema (`batchNameEnglish`, `batchNameArabic`) and adjust creation form steps accordingly.
