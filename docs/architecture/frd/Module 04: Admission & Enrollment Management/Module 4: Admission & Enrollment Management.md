# Functional Requirement Document
## Module 04: Admission & Enrollment Management
**Document Version:** 1.0  
**Module Code:** ADM / ENR  
**Phase:** Phase 1  
**Status:** Approved  
**Owned Bounded Contexts:** Admission & Enrollment Management

---

## 1. Purpose and Objective

The primary purpose of **Module 04: Admission & Enrollment Management** is to manage the legal, organizational, and operational lifecycle of learners at the Al Saud Training Institute (ASTI). It governs the transition of individuals from prospects (Leads/Inquiries) into officially admitted students and subsequently registers them into scheduled batches.

### Core Objectives:
*   **Shared Person Linkage:** Maintain a unified single-person registry to prevent duplicate student profiles, connecting the `StudentProfile` entity to a shared `Person` record.
*   **Structured Admissions:** Manage the legal and administrative approval of a student to study at ASTI under a specific branch context.
*   **Unified Enrollment Aggregate:** Provide a single state-machine engine for all learner pathways (Regular, Corporate, Walk-In, Online) linking a student to a course, branch, and batch.
*   **Branch Scoping and Security:** Ensure strict data isolation so branch-level operations cannot view, edit, or manipulate student data outside their authorized branch scope.
*   **Automatic Identity Provisioning:** Generate digital Student ID Cards asynchronously upon successful admission approval.

---

## 2. Business Goals

| Goal ID | Business Goal | Metric / Target |
| :--- | :--- | :--- |
| **BO-ADM-001** | Eliminate duplicate student identity profiles in the system. | 0% identity duplication rate (enforced by `personId` constraint). |
| **BO-ADM-002** | Ensure complete compliance with branch isolation security rules. | 100% of data reads/writes scoped to authorized `branchId`. |
| **BO-ADM-003** | Reduce batch over-allocation and scheduling conflicts. | 0 over-allocation incidents (enforced by atomic batch capacity checks). |
| **BO-ADM-004** | Streamline fast-track registration for walk-in learners. | Single-session workflow to complete registration, payment, and training handoff. |
| **BO-ADM-005** | Automate student credentials and ID card issuing. | ID card generated within 5 seconds of Admission Approval. |

---

## 3. Scope

### 3.1 In Scope
*   **Person Record Integration:** Search, validation, and linking of individuals to avoid redundant contact records.
*   **Admission Lifecycle:** Creation (draft), document verification, manager review, approval, rejection (with reasons), and cancellation.
*   **Enrollment Lifecycle:** Draft initialization, automated pricing resolution, coordinator approval, payment validation checks, confirmation, activation, dropping, and completion status.
*   **Pricing & Discount Engine integration:** Resolving course pricing hierarchy (Batch Override $\rightarrow$ Branch Override $\rightarrow$ Global Default) and validating authorization limits for discounts.
*   **Corporate Limit Guard:** Real-time checking of corporate credit limits, outstanding balances, and coordinator approval flags during corporate enrollments.
*   **Walk-In Orchestration:** Direct single-step path bypasses standard document validation and triggers instant enrollment status changes.
*   **Student ID Card Generation:** Automatic generation of digital identity files (PDF/Image) containing unique student numbers, barcode/QR codes, and validity dates.

### 3.2 Out of Scope (Phase 1)
*   **Course Catalog & Batch Creation:** Managed strictly by [Module 06: Course Catalog & Training Delivery Management](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2006:%20Course%20Catalog%20&%20Training%20Delivery%20(Batch)%20Management).
*   **Classroom & Timetable Scheduling:** Managed by [Module 07: Scheduling & Timetable Management](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%207:%20Scheduling%20&%20Timetable%20Management.md).
*   **Payment Collection & Invoicing:** Managed by [Module 09: Fee & Finance Management](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%209:%20Fee%20&%20Finance%20Management.md) (this module only triggers invoice creation and queries payment clearance status).
*   **Attendance Tracking:** Managed by [Module 08: Attendance Management](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%208:%20Attendance%20Management.md).
*   **Certificate QR Signatures & Issuance:** Managed by [Module 13: Certificate Management](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2013:%20Certificate%20Management.md).

---

## 4. Stakeholders & Actors

### Human Actors:
*   **Super Admin:** Has global read/write access across all branches. Can override hard blocks, approve exceptional discounts, and view system-wide enrollment metrics.
*   **Branch Admin / Manager:** Manages admissions and enrollments specific to their branch. Approves/rejects admissions and reviews local waitlists.
*   **Registrar:** Administrative staff responsible for checking student documents, registering new profiles, entering data, and initiating enrollments.
*   **Counselor:** Sales/CRM user who converts leads into admissions and coordinates initial document collection.

### System Actors:
*   **Admission Service:** Backend aggregate root manager that handles validation invariants and state persistence.
*   **ID Card Generator:** Background worker that compiles student photos and registration data into dynamic card PDF layouts.
*   **Outbox Publisher:** Transactional outbox engine that publishes lifecycle events to other bounded contexts.

---

## 5. Functional Overview

```text
Module 04: Admission & Enrollment Management
 ├── 1. Student Profile & Person Manager
 │    ├── Person Deduplication & Search
 │    ├── Student Profile Generation
 │    └── Student ID Card Rendering
 ├── 2. Admission Workflow Engine
 │    ├── Lead Conversion Handoff
 │    ├── Document Submission & Verification
 │    └── Approval/Rejection Processing
 ├── 3. Enrollment Lifecycle Engine
 │    ├── Multi-Channel Intake (Regular, Corporate, Walk-In, Online)
 │    ├── Capacity & Over-Allocation Guard (Waitlists)
 │    ├── Pricing Resolution & Discount Audits
 │    └── Payment Validation Interface
 └── 4. State History & Activity Timeline
      ├── Transition Audit Logger
      └── Outbox Event Dispatches
```

---

## 6. Business Capabilities & User Types

### Internal User Capabilities (ASTI Staff):
*   **Lead-to-Admission Handoff:** Instantly pull lead details from Module 03 to prepopulate admission forms.
*   **Global Person Lookup:** Enter National ID / Phone / Email to check whether a person already exists in the shared identity registry.
*   **Discount Approval Request:** Submit price overrides for manager authorization if a discount exceeds the branch default rule threshold.
*   **Branch-Scoped Enrollment Management:** Approve, cancel, or drop enrollments within the authenticated branch context.

### Future Portal Capabilities (Not Phase 1):
*   No external student portal capability is included in Phase 1.

---

## 7. Functional Requirements Checklist

### 7.1 Admission Management (ADM)
*   **FR-ADM-001:** Search and link existing `Person` record during `StudentProfile` creation.
*   **FR-ADM-002:** Create `StudentProfile` with auto-generated unique `studentNumber`.
*   **FR-ADM-003:** Create Admission record scoped to a `branchId` (logical reference) and optional `leadId`.
*   **FR-ADM-004:** Request upload and verification of mandatory identity documents (Passport, Civil ID, Certificates) through the Document Management context, storing only document references in this module.
*   **FR-ADM-005:** Submit Admission for review.
*   **FR-ADM-006:** Approve Admission, triggering asynchronous student ID card compilation.
*   **FR-ADM-007:** Reject Admission with mandatory reason text input.
*   **FR-ADM-008:** Soft-delete StudentProfile or Admission record, archiving metadata with `isDeleted = true`.
*   **FR-ADM-009:** Download generated Student ID Card.

### 7.2 Enrollment Management (ENR)
*   **FR-ENR-001:** Initialize Enrollment in `Draft` state linking to `studentProfileId`, `courseId`, and `batchId` (logical UUIDs).
*   **FR-ENR-002:** Resolve course pricing using the hierarchy: Batch Level Override $\rightarrow$ Branch Level Override $\rightarrow$ Global Catalog Default.
*   **FR-ENR-003:** Validate batch capacity and route to a Training Delivery waitlist entry if the capacity limit is reached.
*   **FR-ENR-004:** Execute B2B Corporate Credit Limit validation rules during Corporate enrollments.
*   **FR-ENR-005:** Submit Enrollment for review, transitioning state to `Submitted`.
*   **FR-ENR-006:** Approve Enrollment, transitioning state to `Approved` and dispatching a billing trigger.
*   **FR-ENR-007:** Confirm Enrollment reactively upon receiving the `ReceiptGenerated` event from Finance.
*   **FR-ENR-008:** Activate Enrollment (`Active` status) on batch start date, making the student visible in the timetable and attendance register.
*   **FR-ENR-009:** Cancel Enrollment (pre-active states) or Drop Enrollment (active state), publishing outbox events to trigger capacity releases and asynchronous refund calculations in Finance.
*   **FR-ENR-010:** Consume completion and payment-clearance projections to flag certificate eligibility when downstream completion and finance events indicate eligibility.
*   **FR-ENR-011:** Execute Walk-In fast-track bypass to auto-approve and confirm enrollment in a decoupled transactional workflow.

---

## 8. Permission Model Overview

The module uses Role-Based Access Control (RBAC) enforced server-side. Permissions are always checked against the context branch:

| Permission Name | Authorized Roles | Scope / Constraints |
| :--- | :--- | :--- |
| `admission.create` | Registrar, Counselor, Super Admin | Write scoped to user's active branch. |
| `admission.approve` | Branch Manager, Super Admin | Write scoped to user's assigned branch. |
| `admission.read` | Registrar, Counselor, Branch Manager, Super Admin | Read scoped to user's active branch. |
| `enrollment.create` | Registrar, Counselor, Super Admin | Write scoped to user's active branch. |
| `enrollment.approve` | Branch Manager, Super Admin | Write scoped to user's assigned branch. |
| `enrollment.confirm` | System / Finance integration | Event-driven only. |
| `enrollment.override` | Super Admin | Allows bypassing capacity and discount limits. |
| `student.read` | Registrar, Counselor, Trainer, Branch Manager, Super Admin | Scoped to branch (unless Super Admin). |

---

## 9. Security & Audit Requirements

1.  **Branch Isolation Guard:** All database read queries must apply a WHERE condition on `branchId` based on the authenticated branch context. Cross-branch operations are blocked unless executed by a Super Admin.
2.  **PII Encryption:** Sensitive identity fields in the `Person` record (e.g., National ID) must be encrypted at rest.
3.  **Critical State Audit:** Any transition in `enrollmentStatus` or `admissionStatus` must write a record to the `AuditLog` table containing:
    *   Target record ID.
    *   Pre-transition state and post-transition state.
    *   Timestamp and executing User ID.
    *   Reason code (especially for rejections, drops, or cancellations).

---

## 10. Non-Functional Requirements (NFR)

*   **Concurrency Handling:** Batch capacity check and decrement must run inside a database transaction with `ISOLATION LEVEL SERIALIZABLE` to prevent double-booking.
*   **Response Time:** API endpoints for search and lookup must respond within $\le 200\text{ms}$ under a standard load of 50 concurrent requests.
*   **Document Storage Integrity:** Identity document uploads must be stored in object storage with signed URL access expiring after 15 minutes.
*   **Availability:** The module must have a $99.9\%$ availability SLA, ensuring students can register and enroll during peak admission cycles.
