# Architectural Audit Report: Module 06 — Course Catalog & Training Delivery (Batch) Management

**Prepared By:** Principal Enterprise Architect & Domain-Driven Design (DDD) Expert  
**Date:** July 1, 2026  
**Status:** Audit Completed (Approved)  
**Subject:** Rigorous architectural review of the Module 06 Functional Requirement Document (FRD) suite, comparing Bounded Context Map, ER Model, and current Prisma Schema models.

---

## 1. Executive Summary

| Audit Item | Value / Grade |
| --- | --- |
| **Module Reviewed** | Module 06 — Course Catalog & Training Delivery (Batch) Management |
| **Document Version** | 3.0 (Approved) |
| **Primary Codebase Target** | [schema.prisma](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/database/prisma/schema.prisma) |
| **Overall Alignment Grade** | **PASS** |

### Review Summary
The Module 06 Functional Requirement Documents (FRDs) have been fully audited and are verified to be in compliance with Domain-Driven Design (DDD) boundaries and modular monolith guidelines. All critical boundary violations, database-level coupling leaks, and API validation omissions have been resolved in the FRD specifications. 

The remaining gap is a physical codebase discrepancy: the database schema in [schema.prisma](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/database/prisma/schema.prisma) is currently bare-bones and must be expanded to include all Module 06 database entities, index optimization configurations, and programmatic soft-delete cascades.

---

## 2. Critical Architectural Misalignments

*No outstanding architectural misalignments exist in the FRD document.* 

All previously identified boundary violations have been successfully corrected:
*   **Decoupled Scheduling Queries:** The trainer assignment overlap check validation (`FR-CRS-012`) now queries timetabled sessions strictly through an injected application service interface (`ISchedulingService`), rather than querying scheduling database tables directly.
*   **Logical Cross-Context Constraints:** Relational constraints linking `WaitingList` to `StudentProfile` and `Lead`, as well as `corporateAccountId` and `classroomId` on `Batch`, are correctly defined as logical key references rather than physical database foreign keys.
*   **Encapsulated Aggregate Mutations:** Waitlist promotion utilizes asynchronous domain events (`WaitlistStudentPromoted` published to the outbox) to trigger enrollment creation. Roster capacity changes are encapsulated within the Batch aggregate root rather than being directly mutated by external contexts.
*   **Asynchronous Event-Driven Workflows:** Batch cancellation and completion trigger downstream reactions asynchronously via the transactional outbox (`BatchCancelled` and `BatchCompleted` events) rather than using direct cross-context service orchestration.
*   **Immutability of Active Configurations:** Active pricing, discount, and completion rules are specified as immutable. Modifications require versioning increments (by setting effective date ranges), and the CRUD matrix restricts updates strictly to drafts (`Draft Only`).

---

## 3. Database & Schema Gaps

### 3.1 Massive Schema Discrepancy (Codebase vs. FRD)
The current [schema.prisma](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/database/prisma/schema.prisma) has a bare-bones `Course` model and is completely missing the following tables required by the Module 06 specification:
1.  `CourseCategory` (`course_categories`)
2.  `CoursePricing` (`course_pricings`)
3.  `CourseDiscount` (`course_discounts`)
4.  `CourseCompletionRule` (`course_completion_rules`)
5.  `Batch` (`batches`)
6.  `BatchTrainer` (`batch_trainers`)
7.  `WaitingList` (`waiting_list`)
8.  `Session` (`sessions`)

Furthermore, the existing `Course` model has relationships to `Lead` and `Inquiry` that must be preserved when extending the model fields (`categoryId`, `departmentId`, and bilingual strings).

### 3.2 Missing Core Indexes in Codebase Schema
While the FRD now specifies correct index design, the codebase schema is missing:
*   **`Course`:** Needs `@@index([categoryId])`, `@@index([departmentId])`
*   **`CoursePricing`:** Needs a composite index `@@index([courseId, branchId, customerType, batchType, status])` to accelerate pricing resolution, and indices on foreign keys `@@index([branchId])`, `@@index([batchId])`.
*   **`CourseDiscount`:** Needs `@@index([courseId])`, `@@index([branchId])`, `@@index([batchId])`
*   **`CourseCompletionRule`:** Needs `@@index([courseId])`
*   **`Batch`:** Needs `@@index([courseId])`, `@@index([branchId])`, `@@index([classroomId])`, `@@index([corporateAccountId])`
*   **`BatchTrainer`:** Needs `@@index([batchId])`, `@@index([trainerId])`
*   **`WaitingList`:** Needs `@@index([courseId])`, `@@index([batchId])`, `@@index([studentId])`, `@@index([leadId])` and a composite unique constraint index `@@unique([studentId, batchId, status])` and `@@unique([leadId, batchId, status])` for queue duplicates validation.
*   **`Session`:** Needs `@@index([batchId])`, `@@index([trainerId])`, `@@index([classroomId])`, `@@index([sessionDate])`

### 3.3 Logical Soft-Delete Cascades Technical Gap
*   **Prisma Native Limitation:** The FRD describes `ON DELETE CASCADE (logical soft-delete cascade)` for `Batch ── BatchTrainer` and `Batch ── WaitingList`.
*   **Remediation:** Prisma does not natively cascade soft-deletes (`isDeleted = true`). The application service layer must handle logical cascades programmatically inside a transaction block, or database triggers must be configured. The FRD explicitly clarifies this implementation detail to avoid developer confusion.

---

## 4. API & Validation Compliance
*No outstanding API or validation anomalies remain in the FRD document.* 

*   **Zod Script Validation:** The creation schemas in [Part 5 (Section 2.1.1)](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2006:%20Course%20Catalog%20&%20Training%20Delivery%20(Batch)%20Management/Part%205%20%E2%80%93%20API%20Contracts.md#L50) validate that the Arabic course names match the Arabic script block block using the correct regular expression checks (`z.string().regex(/^[\u0600-\u06FF\s]+$/)`).
*   **Course Category APIs:** Endpoint specifications for managing course categories (`POST/GET /api/v1/courses/categories`) are fully defined in the API contracts list.
*   **Arabic Layout OMR Suffix Formatting:** Financial layout and prefix/suffix formatting for RTL mode (e.g. suffixing `"ر.ع."` after the price value) are fully specified in the screen layout guidelines of Part 3.
*   **Bilingual Batch Names:** The Batch schema has been updated to include `batchNameEnglish` and `batchNameArabic` to support localized student-facing portals.

---

## 5. Actionable Remediation Checklist

This checklist tracks the implementation steps required to align the codebase with the approved FRD models:

- [x] **Decouple Scheduling Queries:** Modified `validateTrainerAssignment` in `Part 7` to utilize application service interfaces.
- [x] **Decouple Cross-Context Operations via Events:**
  - [x] Refactored `POST /api/v1/batches/:id/waitlist/promote` to publish `WaitlistStudentPromoted` instead of returning `enrollmentId`.
  - [x] Modified `FR-CRS-007` to publish `BatchCompleted` and `BatchCancelled` events.
- [x] **Fix Waitlist/Student coupling:** Removed physical database foreign key constraints between cross-context tables in the ER model.
- [x] **Encapsulate Batch Capacity Operations:** Enforced Batch aggregate seat reservation boundaries.
- [x] **Align Student and Trainer Identity Models:** Refactored relations to link only to `StudentProfile` and `TrainerProfile` logical extensions.
- [x] **Enforce Immutability of Pricing & Rules:** Restricted CRUD matrix to `Draft Only` updates for active configurations.
- [x] **Define Missing API Contracts:** Standardized Course Category endpoints.
- [x] **Enforce Arabic Regex Script Check:** Integrated regex requirements on boundary contracts.
- [x] **Add OMR Currency Layout for RTL layouts:** Standardized `"ر.ع."` suffix presentation rules.
- [x] **Bilingualize Batch Profiles:** Refactored `Batch` naming schema to support dual-language attributes.
- [ ] **Resolve Schema Gaps in Prisma:** Update `packages/database/prisma/schema.prisma` to include the models `CourseCategory`, `CoursePricing`, `CourseDiscount`, `CourseCompletionRule`, `Batch`, `BatchTrainer`, and `WaitingList`, preserving existing `leads` and `inquiries` relations on `Course`.
- [ ] **Implement Database Indexes:** Create index migrations for all foreign keys and branch-scoping conditions defined in the Part 4 entity design specifications.
