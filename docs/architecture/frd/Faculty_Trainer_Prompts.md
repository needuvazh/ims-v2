# Prompts for Module 10: Faculty / Trainer Management

This file contains the complete, customized, step-by-step prompt sequence to generate the 12-part Functional Requirement Document (FRD) for **Module 10: Faculty / Trainer Management**, strictly aligned with:
- The Bounded Context rules (`docs/architecture/ddd/ddd-context-map.md` Section 8.15)
- The Entity Relationship Model (`docs/architecture/ddd/ER Model.md` Section 20)
- The legacy DB schemas in `packages/database/prisma/schema.prisma` (where `TrainerProfile` must link to `Person` via `personId`).

---

## Part-by-Part Prompt Sequence

### 1. Initial Setup: The Master System Prompt
**Prompt to run first:**
```markdown
You are a Principal Solutions Architect and Senior Staff Engineer specializing in clean architecture, Domain-Driven Design (DDD), and TypeScript/Next.js monorepos. Your task is to help me generate a production-grade, highly detailed Functional Requirement Document (FRD) divided into 12 distinct parts for "Module 10: Faculty / Trainer Management" of the Al Saud Training Institute (ASTI) Integrated Institute Management System (IMS).

### Bounded Context Context Rules for Module 10:
1. **Core Domain Focus:** This module manages trainer master profiles, academic qualifications, availability schedules, course delivery authorization, and basic payment terms tracking.
2. **Person/Party Model:** Follow the shared party pattern. Link `TrainerProfile` directly to the `Person` model (via `personId`) to avoid duplicating contact details (such as first name, last name, email, phone) across students, employees, or trainers.
3. **Trainer Classifications:**
   - **Trainer Types:** FullTime, PartTime, Freelance.
   - **Payment Basis:** Hour-based, Session-based, Student-count based, or Fixed.
4. **Availability & Scheduling Constraints:** Trainer availabilities must be mapped by branch and day-of-week, serving as availability boundaries for the downstream Scheduling context.
5. **Soft Deletes & Audits:** No hard deletes. Every profile, qualification, and availability record must support soft delete attributes (`isDeleted`, `deletedAt`) and modifications auditability.
6. **Branch Isolation:** Enforce server-side branch scoping. A trainer may be assigned or authorized to teach in multiple branches, but data access and edits are scoped strictly to the user's active branch context.
7. **Document Expiry Tracking:** Support document verification status and expiration triggers (e.g. visa expiration, certifications, passport tracking) in coordination with Document Management.

### Database Context & Target Models:
* No trainer models currently exist in `packages/database/prisma/schema.prisma`. 
* We need to introduce the following model structures:
  - `TrainerProfile` (Fields: `id`, `personId` [FK to Person], `trainerCode` [Unique], `trainerType` [Enum: FullTime, PartTime, Freelance], `specialization`, `qualificationSummary`, `status`, `effectiveStartDate` [Date], `effectiveEndDate` [Date, Nullable], audit columns)
  - `TrainerQualification` (Fields: `id`, `trainerId` [FK to TrainerProfile], `qualificationName`, `institution`, `yearCompleted`, `documentId` [FK to Document, Nullable], audit columns)
  - `TrainerAvailability` (Fields: `id`, `trainerId` [FK to TrainerProfile], `dayOfWeek` [Int/Enum], `startTime` [String/Time], `endTime` [String/Time], `branchId` [FK to Branch], `status`, `effectiveStartDate` [Date], `effectiveEndDate` [Date, Nullable], audit columns)
  - `BatchTrainer` (Fields: `id`, `batchId` [FK to Batch], `trainerId` [FK to TrainerProfile], `isPrimary` [Boolean], `effectiveStartDate` [Date], `effectiveEndDate` [Date, Nullable], audit columns - maps assignments of trainers to batches)
  - `TrainerPayment` (Fields: `id`, `trainerId` [FK to TrainerProfile], `batchId` [UUID FK], `sessionId` [UUID FK, Nullable], `paymentBasis` [Enum: PerHour, PerSession, PerStudent, Fixed], `amount` [Decimal], `paymentStatus` [Enum: Pending, Disbursed, Cancelled], `remarks`)

We will generate this FRD systematically, one part at a time. Please confirm you understand these rules, active dating specifications, and target models.
```

---

### Step 2: Main Index & Part 1
**Prompt to run second:**
```markdown
Generate the following two files for Module 10 – Faculty / Trainer Management:

1. `Module 10: Faculty / Trainer Management.md`
   - Purpose and Objective (managing trainer master profiles, mapping qualifications, availability constraints, payment terms)
   - Business Goals (BO-TRN-xxx format)
   - Scope (Included: trainer profile setup, branch-scoped availabilities, course delivery authorization, document expiry alerts. Excluded: HR employee master details, payroll runs, timesheet approvals)
   - Stakeholders & Actors (Human: Super Admin, Branch Admin, Academic Coordinator, Trainer. System: Trainer Portal, Scheduling Engine, Expiry Alert Worker)
   - Functional Overview (Tree diagram of submodules)
   - Business Capabilities & User Types (Internal: Branch managers, schedulers. External: Trainers)
   - Functional Requirements Checklist (FR-TRN-xxx format)
   - Permission Model Overview
   - Security & Audit Requirements Summary
   - Non-Functional Requirements Summary

2. `Part 1 – Business Overview, Functional Requirements, Business Rules.md`
   - Comprehensive introduction and business benefits.
   - Detailed functional requirements specifications. For each requirement (e.g., FR-TRN-001 Create Trainer Profile with Person Link, FR-TRN-002 Add Qualification & Verification Documents, FR-TRN-003 Define Availability Windows, FR-TRN-004 Map Authorized Courses, FR-TRN-005 Track Delivery Payment Basis, FR-TRN-006 Expiry Notification Alerts), specify:
     * Description & Actors
     * Preconditions
     * Inputs
     * Processing Steps (validations, check for availability collisions, document expiry check schedules)
     * Outputs & Postconditions
     * Priority (MoSCoW)
   - Comprehensive Business Rules table (BR-TRN-xxx) detailing states, overlapping availability limits, expired document rules, and status transition restrictions.
   - Cross-module dependencies mapping (Scheduling availability checks, Course catalog catalog option maps, Document verification approvals, Finance payments tracking).

Be exhaustive, concrete, and write out all requirements in full. No placeholders.
```

---

### Step 3: Part 2 – User Stories, Use Cases, & Workflows
**Prompt to run third:**
```markdown
Generate `Part 2 – User Stories, Use Cases, Workflows, State Machines.md` for Module 10 – Faculty / Trainer Management.

Requirements:
1. **User Stories:** Write at least 8 detailed User Stories in the "As a... I want to... So that..." format. Prioritize them using MoSCoW and provide a BDD-style Gherkin acceptance criteria block (Given/When/Then) for each. Include stories for:
   - Branch Admin registering a new Trainer profile and linking to a Person record.
   - Scheduler lookup of trainer availability slots before scheduling.
   - Academic Coordinator reviewing trainer qualifications and authorizing course delivery.
   - System alerting manager of upcoming certification expiry.
2. **Use Cases:** Document the primary use cases (e.g., Register Trainer, Update Availability, Authorize Course, Record Delivery Payment) with:
   - Primary Actor
   - Preconditions
   - Main Success Scenario (Numbered steps)
   - Alternative Flows (e.g., conflicting availability slots, expired documents blocking course assignment)
   - Postconditions
3. **Business Workflows:** Describe the core operational workflows (Trainer onboarding $\rightarrow$ Qualification/Document upload $\rightarrow$ Profile verification $\rightarrow$ Course authorization $\rightarrow$ Availability mapping $\rightarrow$ Eligible for Scheduling) in structured text or ASCII/Mermaid sequence diagrams.
4. **State Machines:** Identify the entity state machines:
   - **Trainer Profile Status Lifecycle:** `Draft` $\rightarrow$ `PendingVerification` $\rightarrow$ `Active` $\rightarrow$ `Suspended` $\rightarrow$ `Inactive` $\rightarrow$ `Archived`.
   - Include a Mermaid state transition diagram and a transition rules matrix mapping allowed from/to statuses and required permissions.
```

---

### Step 4: Part 3 – Screen Specifications & UI Components
**Prompt to run fourth:**
```markdown
Generate `Part 3 – Screen Specifications and UI Components.md` for Module 10 – Faculty / Trainer Management.

Requirements:
1. **Screen Inventory:** List all screens required for the Admin/Staff portal and the Trainer portal (read-only views/availabilities profile).
2. **Screen Details:** For each screen (e.g., Trainer Directory, Trainer Profile details form, Availability Scheduler grid, Course Authorization matrix, Qualifications tab), define:
   - Layout & Grid Structure (dense, data-rich style)
   - Interactive Elements (buttons, tabs, selectors)
   - Input Form Fields with exact validations (e.g., trainer code format, specialization tags, qualifications name, day-of-week slots, time format)
   - Table columns with sorting, filtering, and paging behaviors
3. **Dynamic UI States:** Document form validation error states, loading skeletons, empty states, and permission-based element hiding (such as payment tracking metrics visible to admins only).
4. **Bilingual Layout Rules:** Specify English (LTR) and Arabic (RTL) rendering differences.
```

---

### Step 5: Part 4 – Database Entities & CRUD Matrix
**Prompt to run fifth:**
```markdown
Generate `Part 4 – Database Entities and CRUD Matrix.md` for Module 10 – Faculty / Trainer Management.

Requirements:
1. **Entity Specifications:** Define all database models owned by this context. Ensure that it links to the `Person` model using a foreign key `personId`. For each table:
   - `TrainerProfile` (Fields: `id`, `personId`, `trainerCode`, `trainerType`, `specialization`, `qualificationSummary`, `status`, `effectiveStartDate`, `effectiveEndDate`, audit columns)
   - `TrainerQualification` (Fields: `id`, `trainerId`, `qualificationName`, `institution`, `yearCompleted`, `documentId`, audit columns)
   - `TrainerAvailability` (Fields: `id`, `trainerId`, `dayOfWeek`, `startTime`, `endTime`, `branchId`, `status`, `effectiveStartDate`, `effectiveEndDate`, audit columns)
   - `BatchTrainer` (Fields: `id`, `batchId`, `trainerId`, `isPrimary`, `effectiveStartDate`, `effectiveEndDate`, audit columns)
   - `TrainerPayment` (Fields: `id`, `trainerId`, `batchId`, `sessionId`, `paymentBasis`, `amount`, `paymentStatus`, `remarks`, audit columns)
   Provide exact PostgreSQL & Prisma equivalent data types, nullability, keys, unique constraints, and indexes.
2. **Relationships:** Detail 1:1, 1:N, and N:M relationships with cascading/restrict rules. Ensure TrainerProfile links to `Person` (1:1), TrainerAvailability scopes to `Branch` (M:1), and BatchTrainer bridges `Batch` (M:1) and `TrainerProfile` (M:1).
3. **CRUD Matrix:** Provide a Markdown table mapping Human/System Actors against entities, specifying allowed actions (Create, Read, Update, Delete, Audit) and the required branch-scoping logic.
```

---

### Step 6: Parts 5, 6, & 7 – API, Permissions, and Validations
**Prompt to run sixth:**
```markdown
Generate the following three files for Module 10 – Faculty / Trainer Management:

1. `Part 5 – API Contracts.md`
   - List all REST endpoints/Server Actions (Route, Method, Purpose).
   - For each endpoint (e.g., `POST /api/trainers`, `GET /api/trainers`, `PUT /api/trainers/{id}/availabilities`, `POST /api/trainers/{id}/authorizations`), detail:
     * Authentication & Required Permission
     * Branch-scoping behavior
     * Request payload schema (Zod specification structure)
     * Success Response DTO (JSON format)
     * Error Response Catalog (HTTP status codes & custom application error codes)

2. `Part 6 – Permission Matrix.md`
   - Tabular mapping of all business roles (Super Admin, Branch Admin, Academic Coordinator, Trainer, etc.) against fine-grained permissions (e.g., `trainer.create`, `trainer.avail.manage`, `trainer.payment.read`).
   - Separate permissions by: Action-level, Menu-level, and Report-level.

3. `Part 7 – Validation Rules, Error Catalog, Notifications.md`
   - Custom business validation schemas (e.g., time slot overlaps, invalid years, document format checks).
   - Structured error code catalog (e.g., `ERR_TRN_OVERLAP_AVAILABILITY`, `ERR_TRN_EXPIRED_CERTIFICATE`).
   - System notification events (Email, SMS, WhatsApp) triggered by domain events in this module (e.g., `TrainerDocumentExpiring` triggers alert to administrator), including exact template variables.
```

---

### Step 7: Parts 8 & 9 – Reports, KPIs, and BDD Tests
**Prompt to run seventh:**
```markdown
Generate the following two files for Module 10 – Faculty / Trainer Management:

1. `Part 8 - Reports, Dashboards, KPIs, Analytics.md`
   - Define module-specific KPIs (e.g., trainer utilization percentage, average session hours, upcoming certification expiry count, total delivery pay totals).
   - Detail Admin & Portal Dashboard widgets (Trainer availability status today, utilization charts, pending payments summaries) with permission scopes.
   - List operational reports (e.g., Trainer Utilization Sheet, Expiry Alerts List, trainer pay ledger) with filters, columns, sorting, export options.
   - Explain read models or reporting database views to support fast reporting queries.

2. `Part 9 – BDD Acceptance Criteria and Test Scenarios.md`
   - Write out comprehensive Gherkin (Feature, Scenario Outline, Scenario) test scenarios covering all positive, negative, validation, and boundary conditions (such as scheduling conflict validations, document verification overrides, and branch data isolation).
```

---

### Step 8: Parts 10 & 11 – Non-Functional Requirements & Runbooks
**Prompt to run eighth:**
```markdown
Generate the final two files for Module 10 – Faculty / Trainer Management:

1. `Part 10 - Security Architecture and NFR.md`
   - Detail security measures specific to this module (e.g., PII access protection, sensitive trainer contract and payment auditing).
   - Specify Non-Functional performance, availability, scalability, usability, and compliance targets (e.g., API response thresholds, concurrent availability check queries).

2. `Part 11 - Deployment, Operations, Observability, Runbooks.md`
   - Observability setup: Structured logs format, tracing boundaries, metrics instrumentation.
   - Operations: System healthcheck rules, backup/recovery instructions for owned tables.
   - Troubleshooting Runbooks: Step-by-step guides for operational failures (e.g., recovery of trainer scheduling status mismatch, resolving conflicting availability records).
```

---

## 2. Validation & Review Prompt
**Prompt to run after generating the FRD to validate it against DDD & ER guidelines:**
```markdown
You are a Principal Solutions Architect and Senior staff DDD Reviewer. I have generated a Functional Requirement Document (FRD) for "Module 10: Faculty / Trainer Management". 

Please review all the generated parts against the ASTI Bounded Context Map (docs/architecture/ddd/ddd-context-map.md) and ER Model (docs/architecture/ddd/ER Model.md) to evaluate alignment and flag any gaps, design errors, or scope creep.

Specifically check and report on the following checklist:
1. **Shared Person/Party Model Compliance:**
   - Does the FRD ensure that `TrainerProfile` links to the central `Person` table via `personId` rather than duplicating name, email, or phone directly on the trainer record?
2. **Classifications & Enums:**
   - Are the trainer types strictly mapped to `FullTime`, `PartTime`, and `Freelance`?
   - Are the payment bases mapped to `Per Hour`, `Per Session`, `Per Student`, and `Fixed`?
3. **Availability & Branch Scoping:**
   - Are availabilities mapped by `branchId` and `dayOfWeek`, with `startTime` and `endTime` fields?
   - Are all queries and mutations scoped strictly to the active branch context?
4. **Scope Boundaries:**
   - Does the FRD exclude full payroll calculations and disbursements, keeping it restricted to delivery payment *tracking* only?
5. **Document Verification Integration:**
   - Does it integrate qualification documents (`documentId`) with the document management system, detailing verification states and alerts for upcoming expiration?
6. **Soft Deletes:**
   - Are hard deletes strictly prohibited, with logical archival and status changes mapped to audit logs?

For any gaps identified, please write out the exact Gaps list and suggest the precise markdown replacements to make the FRD 100% compliant.
```
