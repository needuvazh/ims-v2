# Prompts for Module 04: Admission & Enrollment Management

This file contains the complete, customized, step-by-step prompt sequence to generate the 12-part Functional Requirement Document (FRD) for **Module 04: Admission & Enrollment Management**, strictly aligned with:
- The Bounded Context rules (`docs/architecture/ddd/ddd-context-map.md` Section 8.6)
- The Entity Relationship Model (`docs/architecture/ddd/ER Model.md` Section 11)
- The legacy DB schemas in `packages/database/prisma/schema.prisma` (requiring refactoring to link `Student` to `Person` via `personId`).

---

## Part-by-Part Prompt Sequence

### 1. Initial Setup: The Master System Prompt
**Prompt to run first:**
```markdown
You are a Principal Solutions Architect and Senior Staff Engineer specializing in clean architecture, Domain-Driven Design (DDD), and TypeScript/Next.js monorepos. Your task is to help me generate a production-grade, highly detailed Functional Requirement Document (FRD) divided into 12 distinct parts for "Module 04: Admission & Enrollment Management" of the Al Saud Training Institute (ASTI) Integrated Institute Management System (IMS).

### Bounded Context Context Rules for Module 04:
1. **Core Domain Focus:** This module owns the learner identity lifecycle. It manages student profiles, legal admissions to the institute, and the central `Enrollment` aggregate.
2. **Central Enrollment Aggregate:** Enrollment connects Student, Course, Batch, Branch, and Finance. Regular, Corporate, and Walk-In training journeys must share this single `Enrollment` aggregate lifecycle instead of creating separate models.
3. **Admission vs. Enrollment:**
   - **Admission** means registering the person as a customer/student of ASTI (creates a global student profile).
   - **Enrollment** means registering that student into a specific `Course` and `Batch` for training.
4. **Mandatory Relations:** Every Enrollment must link to a valid `Student`, `Course`, and `Batch`.
5. **Soft Deletes & Active Dating:** No hard deletes. Every model (Student, Admission, Enrollment) must support soft delete attributes (`isDeleted`, `deletedAt`) and transition auditability.
6. **Branch Isolation:** Enforce server-side branch scoping. All enrollments and admissions must belong to a `branchId` context.
7. **Person/Party Model:** Link `Student` directly to `Person` (via `personId`) to avoid identity duplication across students, trainers, or employees.

### Database Context & Existing Schema:
* The current schema in `packages/database/prisma/schema.prisma` has a legacy `Student` model that directly stores `firstName`, `lastName`, `email`, and `phone`. 
* As part of Module 04, we must refactor this to align with the DDD ER Model: `Student` must have a foreign key `personId` referencing the `Person` model, and inherit name/contact information from the `Person` table.
* The `Admission` table is defined as: `id`, `studentId`, `branchId`, `admissionDate`, `status`, and `leadId`.
* The `Enrollment` table is currently pending and must be added with the following structure:
  - `id` (UUID PK)
  - `enrollmentNumber` (Unique String)
  - `studentId` (UUID FK to `Student`)
  - `corporateParticipantId` (UUID FK to `CorporateParticipant`, Nullable)
  - `admissionId` (UUID FK to `Admission`)
  - `courseId` (UUID FK to `Course`)
  - `batchId` (UUID FK to `Batch`)
  - `branchId` (UUID FK to `Branch`)
  - `enrollmentType` (Enum: Regular, Corporate, WalkIn, Online)
  - `enrollmentStatus` (Enum: Draft, Submitted, Approved, Confirmed, Active, Completed, Cancelled, Dropped, CertificateIssued)
  - `pricingSource` (Enum: BatchLevel, BranchLevel, GlobalDefault)
  - `resolvedPrice` (Decimal)
  - `resolvedDiscount` (Decimal)
  - `finalAmount` (Decimal)
  - `paymentValidationRequired` (Boolean)
  - `completionStatus` (String)
  - `certificateStatus` (String)
  - `confirmedAt` (DateTime)
  - `completedAt` (DateTime)

We will generate this FRD systematically, one part at a time. Please confirm you understand these rules, schemas, and target models.
```

---

### Step 2: Main Index & Part 1
**Prompt to run second:**
```markdown
Generate the following two files for Module 04 – Admission & Enrollment Management based on our target schemas:

1. `Module 4: Admission & Enrollment Management.md`
   - Purpose and Objective (registering learners, tracking student profiles, managing enrollment lifecycle)
   - Business Goals (BO-ADM-xxx format)
   - Scope (Included: student registration, admissions, enrollment lifecycle, ID card generation. Excluded: course creation, batch scheduling, finance payment processing)
   - Stakeholders & Actors (Human: Super Admin, Branch Admin, Counselor, Student, Registrar. System: Admission Service, ID Card Generator, Outbox Publisher)
   - Functional Overview (Tree diagram of submodules)
   - Business Capabilities & User Types (Internal: Registrars, Admins, Counselors. External: Students)
   - Functional Requirements Checklist (FR-ADM-xxx format for admissions; FR-ENR-xxx for enrollments)
   - Permission Model Overview
   - Security & Audit Requirements Summary
   - Non-Functional Requirements Summary

2. `Part 1 – Business Overview, Functional Requirements, Business Rules.md`
   - Comprehensive introduction and business benefits.
   - Detailed functional requirements specifications. For each requirement (e.g., FR-ADM-001 Create Student with Person Link, FR-ADM-002 Create Admission, FR-ENR-001 Create Enrollment Draft, FR-ENR-002 Resolve Pricing and Apply Discounts, FR-ENR-003 Approve Enrollment, FR-ENR-004 Confirm Enrollment, FR-ENR-005 Drop/Cancel Enrollment), specify:
     * Description & Actors
     * Preconditions
     * Inputs
     * Processing Steps (validations, resolved price calculation checks, outbox event generation, status updating)
     * Outputs & Postconditions
     * Priority (MoSCoW)
   - Comprehensive Business Rules table (BR-ADM-xxx / BR-ENR-xxx) detailing states, date validation rules, limit checks (e.g., batch capacity check), and status transition restrictions. Highlight the following core rules:
     * Enrollment must have courseId and batchId.
     * Enrollment must have valid resolved pricing based on the hierarchy (Batch override -> Branch override -> Global Default).
     * Corporate enrollment must validate B2B credit limit rules.
     * Certificate eligibility requires completion + payment validation.
   - Cross-module dependencies mapping (CRM conversions, Course catalog lookup, Finance invoice triggering, Batch capacity decrementing).

Be exhaustive, concrete, and write out all requirements in full. No placeholders.
```

---

### Step 3: Part 2 – User Stories, Use Cases, & State Machines
**Prompt to run third:**
```markdown
Generate `Part 2 – User Stories, Use Cases, Workflows, State Machines.md` for Module 04 – Admission & Enrollment Management.

Requirements:
1. **User Stories:** Write at least 8 detailed User Stories in the "As a... I want to... So that..." format. Prioritize them using MoSCoW and provide a BDD-style Gherkin acceptance criteria block (Given/When/Then) for each. Ensure to cover:
   - Registrar registering a new student profile and linking it to a Person record.
   - Counselor converting a converted Lead to an active Admission.
   - Registrar enrolling a student in a Course and Batch.
   - Corporate Coordinator nominating participants (creating corporate enrollments).
   - System validating batch capacity during enrollment.
2. **Use Cases:** Document the primary use cases (e.g., Convert Lead to Student, Register Walk-In Enrollment, Drop Course Enrollment) with:
   - Primary Actor
   - Preconditions
   - Main Success Scenario (Numbered steps)
   - Alternative Flows (e.g., duplicate checks, batch capacity reached, age restrictions)
   - Postconditions
3. **Business Workflows:** Describe the core operational workflows (Lead conversion handoff to Registrar $\rightarrow$ Admission profile check $\rightarrow$ Batch assignment $\rightarrow$ Enrollment draft status $\rightarrow$ Finance trigger) in structured text or ASCII/Mermaid sequence diagrams.
4. **State Machines:** Identify the entity state machines:
   - **Enrollment Status Lifecycle:** `Draft` $\rightarrow$ `Submitted` $\rightarrow$ `Approved` $\rightarrow$ `Confirmed` $\rightarrow$ `Active` $\rightarrow$ `Completed` $\rightarrow$ `Cancelled` $\rightarrow$ `Dropped` $\rightarrow$ `CertificateIssued`.
   - Include a Mermaid state transition diagram and a transition rules matrix mapping allowed from/to statuses and required permissions.
```

---

### Step 4: Part 3 – Screen Specifications & UI Components
**Prompt to run fourth:**
```markdown
Generate `Part 3 – Screen Specifications and UI Components.md` for Module 04 – Admission & Enrollment Management.

Requirements:
1. **Screen Inventory:** List all screens required for the Admin/Registrar portal and the Student portal.
2. **Screen Details:** For each screen (e.g., Student Directory, Admission Form, Enrollment Form, Student Profile Dashboard), define:
   - Layout & Grid Structure (dense, data-rich style)
   - Interactive Elements (buttons, tabs, selectors)
   - Input Form Fields with exact validations (e.g., Student Name, Omani National ID / Passport Number validation, phone pattern, email pattern, emergency contact)
   - Table columns with sorting, filtering, and paging behaviors
3. **Dynamic UI States:** Document form validation error states, loading skeletons, empty states, and permission-based element hiding.
4. **Bilingual Layout Rules:** Specify English (LTR) and Arabic (RTL) rendering differences.
```

---

### Step 5: Part 4 – Database Entities & CRUD Matrix
**Prompt to run fifth:**
```markdown
Generate `Part 4 – Database Entities and CRUD Matrix.md` for Module 04 – Admission & Enrollment Management.

Requirements:
1. **Entity Specifications:** Define all database models owned by this context. Ensure it refactors the legacy Prisma schema for `Student` (replacing direct name/contact fields with `personId` FK to `Person`) and introduces the new `Enrollment` model and associated tables. For each table:
   - `Person` (Reference fields: `id`, `firstName`, `lastName`, `mobile`, `email`, `nationalId`, `nationality`, `dateOfBirth`, `gender`)
   - `Student` (Fields: `id`, `personId`, `studentNumber`, `status`, audit columns)
   - `Admission` (Fields: `id`, `studentId`, `branchId`, `admissionDate`, `status`, `leadId`, `submittedAt`, `approvedAt`, `approvedBy`, `remarks`, audit columns)
   - `Enrollment` (Fields: `id`, `enrollmentNumber`, `studentId`, `corporateParticipantId`, `admissionId`, `courseId`, `batchId`, `branchId`, `enrollmentType`, `enrollmentStatus`, `pricingSource`, `resolvedPrice`, `resolvedDiscount`, `finalAmount`, `paymentValidationRequired`, `completionStatus`, `certificateStatus`, `confirmedAt`, `completedAt`, audit columns)
   Provide exact PostgreSQL & Prisma equivalent data types, nullability, keys, unique constraints, and indexes.
2. **Relationships:** Detail 1:1, 1:N, and N:M relationships with cascading/restrict rules. Ensure Enrollment links to `Student`, `Course`, `Batch`, `Branch`, and optionally `CorporateParticipant`.
3. **CRUD Matrix:** Provide a Markdown table mapping Human/System Actors against entities, specifying allowed actions (Create, Read, Update, Delete, Audit) and the required branch-scoping logic.
```

---

### Step 6: Parts 5, 6, & 7 – API, Permissions, and Validations
**Prompt to run sixth:**
```markdown
Generate the following three files for Module 04 – Admission & Enrollment Management:

1. `Part 5 – API Contracts.md`
   - List all REST endpoints/Server Actions (Route, Method, Purpose).
   - For each endpoint (e.g., `POST /api/admissions`, `POST /api/enrollments`, `POST /api/enrollments/{id}/approve`, `POST /api/enrollments/{id}/confirm`, `POST /api/enrollments/{id}/drop`), detail:
     * Authentication & Required Permission
     * Branch-scoping behavior
     * Request payload schema (Zod specification structure)
     * Success Response DTO (JSON format)
     * Error Response Catalog (HTTP status codes & custom application error codes like `ERR_ENR_BATCH_FULL`)

2. `Part 6 – Permission Matrix.md`
   - Tabular mapping of all business roles (Super Admin, Branch Admin, Counselor, Registrar, Accountant, Student, etc.) against fine-grained permissions (e.g., `enrollment.create`, `enrollment.approve`, `student.read`).
   - Separate permissions by: Action-level, Menu-level, and Report-level.

3. `Part 7 – Validation Rules, Error Catalog, Notifications.md`
   - Custom business validation schemas (e.g., batch capacity checks, age limits, overlapping enrollment checks).
   - Structured error code catalog (e.g., `ERR_ENR_BATCH_FULL`, `ERR_ADM_DUPLICATE_ID`).
   - System notification events (Email, SMS, WhatsApp) triggered by domain events in this module (e.g., `EnrollmentConfirmed` triggers welcome email with batch schedule details), including exact template variables.
```

---

### Step 7: Parts 8 & 9 – Reports, KPIs, and BDD Tests
**Prompt to run seventh:**
```markdown
Generate the following two files for Module 04 – Admission & Enrollment Management:

1. `Part 8 - Reports, Dashboards, KPIs, Analytics.md`
   - Define module-specific KPIs (e.g., enrollment conversion rate, drop-out rate, branch-wise student distribution).
   - Detail Admin & Portal Dashboard widgets (Metric summaries, charts, table widgets) with permission scopes.
   - List operational reports (e.g., Active Enrollment List, Daily Admissions Summary) with filters, columns, sorting, export options.
   - Explain read models or reporting database views to support fast reporting queries.

2. `Part 9 – BDD Acceptance Criteria and Test Scenarios.md`
   - Write out comprehensive Gherkin (Feature, Scenario Outline, Scenario) test scenarios covering all positive, negative, validation, and boundary conditions for admissions and enrollments (such as duplicate checks, active dating limits, capacity blocks, and branch data isolation).
```

---

### Step 8: Parts 10 & 11 – Non-Functional Requirements & Runbooks
**Prompt to run eighth:**
```markdown
Generate the final two files for Module 04 – Admission & Enrollment Management:

1. `Part 10 - Security Architecture and NFR.md`
   - Detail security measures specific to this module (e.g., encryption of sensitive student national IDs/passports, document access control).
   - Specify Non-Functional performance, availability, scalability, usability, and compliance targets (e.g., API response thresholds, concurrent limits).

2. `Part 11 - Deployment, Operations, Observability, Runbooks.md`
   - Observability setup: Structured logs format, tracing boundaries, metrics instrumentation.
   - Operations: System healthcheck rules, backup/recovery instructions for owned tables.
   - Troubleshooting Runbooks: Step-by-step guides for operational failures (e.g., rollback of enrollment transactions, bulk import sync issues).
```

---

## 2. Validation & Review Prompt
**Prompt to run after generating the FRD to validate it against DDD & ER guidelines:**
```markdown
You are a Principal Solutions Architect and Senior staff DDD Reviewer. I have generated a Functional Requirement Document (FRD) for "Module 04: Admission & Enrollment Management". 

Please review all the generated parts against the ASTI Bounded Context Map (docs/architecture/ddd/ddd-context-map.md) and ER Model (docs/architecture/ddd/ER Model.md) to evaluate alignment and flag any gaps, design errors, or scope creep.

Specifically check and report on the following checklist:
1. **Enrollment Aggregate Scope:** 
   - Does the FRD ensure that regular, corporate, and walk-in learners share the *same* central `Enrollment` model and lifecycle instead of introducing separate tables/lifecycles?
   - Is it clear that Walk-In is treated as a fast-track enrollment/completion strategy rather than a different student type?
2. **Refactoring of Student Model:**
   - Does the database section correctly refactor the legacy `Student` model to link to the central `Person` table via `personId`?
   - Does the design avoid duplicate name and contact fields (such as phone and email) directly on `Student`?
3. **Fields & Pricing Rules Alignment:**
   - Does the `Enrollment` model include the resolved pricing fields: `resolvedPrice`, `resolvedDiscount`, `finalAmount`, and `pricingSource`?
   - Are the course pricing rules (Batch level override -> Branch level override -> Global course catalog) respected?
4. **Mandatory Relations:**
   - Are all enrollments strictly required to link to `courseId` and `batchId`?
5. **Credit Control Validation:**
   - Does corporate participant enrollment require credit limit rules validation (blocking or warning) before confirmation?
6. **Soft Deletes & Audits:**
   - Are hard deletes strictly prohibited, with logical archival and status changes mapped to audit logs?
7. **Branch Isolation:**
   - Are all API endpoints and screen queries scoped using a `branchId` context to ensure data isolation?

For any gaps identified, please write out the exact Gaps list and suggest the precise markdown replacements to make the FRD 100% compliant.
```

