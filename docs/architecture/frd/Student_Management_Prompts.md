# Prompts for Module 05: Student Management

This file contains the complete, customized, step-by-step prompt sequence to generate the 12-part Functional Requirement Document (FRD) for **Module 05: Student Management**, strictly aligned with:
- The Bounded Context rules (`docs/architecture/ddd/ddd-context-map.md` Section 8.6)
- The Entity Relationship Model (`docs/architecture/ddd/ER Model.md` Section 6.2 for Person, Section 11.2 for StudentProfile)
- The existing database tables in `packages/database/prisma/schema.prisma` (requiring refactoring to link `Student` to `Person` via `personId` to inherit profile photo, national/civil ID, passport, and visa details).

---

## Part-by-Part Prompt Sequence

### 1. Initial Setup: The Master System Prompt
**Prompt to run first:**
```markdown
You are a Principal Solutions Architect and Senior Staff Engineer specializing in clean architecture, Domain-Driven Design (DDD), and TypeScript/Next.js monorepos. Your task is to help me generate a production-grade, highly detailed Functional Requirement Document (FRD) divided into 12 distinct parts for "Module 05: Student Management" of the Al Saud Training Institute (ASTI) Integrated Institute Management System (IMS).

### Bounded Context Context Rules for Module 05:
1. **Core Domain Scope:** This module is responsible for the complete lifecycle of a student's profile *after* admission. It governs student demographic data, emergency contacts, parent/guardian details, profile photo collection, document storage attachments (ID copies, visas, certifications), and digital Student ID card management.
2. **Person/Party Model Alignment:** In compliance with DDD principles, personal identity fields (e.g., first/middle/last name, email, mobile phone, gender, date of birth, nationality, civil ID, passport number, visa number, and profile photo URL) belong to the `Person` model. The `Student` record links 1:1 to `Person` via `personId`.
3. **Emergency Contacts & Parent Details:** Provide structured support for emergency contacts (Full name, mobile number, relation to student) and parent/guardian profiles for minor students.
4. **Integration with Document Management:** Manage student file uploads (passport scans, civil ID cards, educational certificates) by mapping them to the generic `Document` bounded context.
5. **ID Card Issuance:** Detail the management and renewal of the `StudentIDCard` (containing student number, barcode/QR verification, and validity dates).
6. **Soft Deletes & Branch Scoping:** Hard deletes are prohibited. All profiles, contacts, and card records must use soft delete fields (`isDeleted`, `deletedAt`) and scope access to the active `branchId` context.

### Database Context & Existing Schema:
* The current schema in `packages/database/prisma/schema.prisma` has a legacy `Student` model with direct name/email/phone columns. 
* As part of the implementation, we refactor this: `Student` must link to `Person` via `personId`, removing direct PII columns from the `Student` table.
* We must define the following target database models:
  - `Student` (Fields: `id`, `personId` [FK to Person], `studentNumber` [Unique], `idCardIssued` [Boolean], `idCardNumber` [String, Nullable], `joinedAt` [Date], `status` [Enum: Active, Suspended, Inactive], audit and soft-delete columns)
  - `StudentEmergencyContact` (Fields: `id`, `studentId` [FK to Student], `contactName`, `mobilePhone`, `relationship`, audit columns)
  - `StudentDocument` (Fields: `id`, `studentId` [FK to Student], `documentId` [UUID referencing generic Document], `verificationStatus` [Enum: Pending, Verified, Rejected])
  - `StudentIDCard` (Fields: `id`, `studentId` [FK to Student], `cardNumber` [Unique], `barcodeUrl`, `issuedAt`, `expiresAt`, `status` [Enum: Active, Expired, Terminated])

We will generate this FRD systematically, one part at a time. Please confirm you understand these rules, schemas, and target models.
```

---

### Step 2: Main Index & Part 1
**Prompt to run second:**
```markdown
Generate the following two files for Module 05 – Student Management:

1. `Module 5: Student Management.md`
   - Purpose and Objective (managing student profiles, collecting demographic data, emergency contacts, profile pictures, identity cards, and portal access preferences)
   - Business Goals (BO-STU-xxx format)
   - Scope (Included: student profile details, profile picture collection, emergency contact directory, student document uploads, ID card management. Excluded: lead intakes, academic grading, course scheduling, billing payments)
   - Stakeholders & Actors (Human: Super Admin, Branch Manager, Registrar, Student. System: Document Upload Service, ID Card Generator, Notification Dispatcher)
   - Functional Overview (Tree diagram of submodules)
   - Business Capabilities & User Types (Internal: Registrars, managers. External: Students)
   - Functional Requirements Checklist (FR-STU-xxx format)
   - Permission Model Overview
   - Security & Audit Requirements Summary
   - Non-Functional Requirements Summary

2. `Part 1 – Business Overview, Functional Requirements, Business Rules.md`
   - Comprehensive introduction and business benefits.
   - Detailed functional requirements specifications. For each requirement (e.g., FR-STU-001 Configure Student Profile, FR-STU-002 Collect Profile Photo, FR-STU-003 Manage Emergency Contacts, FR-STU-004 Upload Student Documents, FR-STU-005 Issue Student ID Card, FR-STU-006 Suspended Student Status Handoff), specify:
     * Description & Actors
     * Preconditions
     * Inputs (e.g., photo file upload size/type limits)
     * Processing Steps (validation, linking to Person table, generating barcode URL, document encryption)
     * Outputs & Postconditions
     * Priority (MoSCoW)
   - Comprehensive Business Rules table (BR-STU-xxx) detailing states, document validation requirements, ID card expiration limits, and PII access logs.
   - Cross-module dependencies mapping (Document management storage, CRM handoffs, ID card verification triggers).

Be exhaustive, concrete, and write out all requirements in full. No placeholders.
```

---

### Step 3: Part 2 – User Stories, Use Cases, & Workflows
**Prompt to run third:**
```markdown
Generate `Part 2 – User Stories, Use Cases, Workflows, State Machines.md` for Module 05 – Student Management.

Requirements:
1. **User Stories:** Write at least 8 detailed User Stories in the "As a... I want to... So that..." format. Prioritize them using MoSCoW and provide a BDD-style Gherkin acceptance criteria block (Given/When/Then) for each. Include stories for:
   - Registrar updating student emergency contacts.
   - Student uploading a passport-sized profile photo.
   - Registrar uploading and verifying national ID document copies.
   - System generating and emailing a digital ID card barcode.
2. **Use Cases:** Document the primary use cases (e.g., Update Student Profile details, Verify Student Documents, Renew Student ID Card) with:
   - Primary Actor
   - Preconditions
   - Main Success Scenario (Numbered steps)
   - Alternative Flows (e.g., photo upload fails sizing check, invalid ID document verification, student profile suspended)
   - Postconditions
3. **Business Workflows:** Describe the core operational workflows (Profile created $\rightarrow$ Photo upload & check $\rightarrow$ Document submission $\rightarrow$ Registrar verification $\rightarrow$ ID Card generated $\rightarrow$ Active Learner Profile) in structured text or ASCII/Mermaid sequence diagrams.
4. **State Machines:** Identify the entity state machines:
   - **StudentProfile Status Lifecycle:** `Active` $\rightarrow$ `Suspended` $\rightarrow$ `Inactive`.
   - **StudentIDCard Status Lifecycle:** `Active` $\rightarrow$ `Expired` $\rightarrow$ `Terminated`.
   - Include Mermaid state transition diagrams and a transition rules matrix mapping allowed from/to statuses and required permissions.
```

---

### Step 4: Part 3 – Screen Specifications & UI Components
**Prompt to run fourth:**
```markdown
Generate `Part 3 – Screen Specifications and UI Components.md` for Module 05 – Student Management.

Requirements:
1. **Screen Inventory:** List all screens required for the Registrar/Staff portal and the Student portal.
2. **Screen Details:** For each screen (e.g., Student Profile Dashboard, Contact & Demographic Form, Document Upload interface, ID Card preview window), define:
   - Layout & Grid Structure (dense profile cards, side-panel directories)
   - Interactive Elements (file upload dropzones, crop sliders for profile photos, toggle buttons)
   - Input Form Fields with exact validations (e.g., emergency phone validation, relationship dropdowns, text location inputs)
   - Table columns with sorting, filtering, and paging behaviors
3. **Dynamic UI States:** Document form validation error states, loading skeletons, empty states, and permission-based element hiding (PII obscuring for unauthorized staff).
4. **Bilingual Layout Rules:** Specify English (LTR) and Arabic (RTL) rendering differences.
```

---

### Step 5: Part 4 – Database Entities & CRUD Matrix
**Prompt to run fifth:**
```markdown
Generate `Part 4 – Database Entities and CRUD Matrix.md` for Module 05 – Student Management.

Requirements:
1. **Entity Specifications:** Define all database models owned by this context. Detail how `Student` relates to the `Person` model (1:1) to avoid duplication. For each table:
   - `Student` (Fields: `id`, `personId`, `studentNumber`, `idCardIssued`, `idCardNumber`, `joinedAt`, `status`, audit columns)
   - `StudentEmergencyContact` (Fields: `id`, `studentId`, `contactName`, `mobilePhone`, `relationship`, audit columns)
   - `StudentDocument` (Fields: `id`, `studentId`, `documentId`, `verificationStatus`, audit columns)
   - `StudentIDCard` (Fields: `id`, `studentId`, `cardNumber`, `barcodeUrl`, `issuedAt`, `expiresAt`, `status`, audit columns)
   Provide exact PostgreSQL & Prisma equivalent data types, nullability, keys, unique constraints, and indexes.
2. **Relationships:** Detail 1:1, 1:N, and N:M relationships with cascading/restrict rules. Ensure Student links to `Person` (1:1) and StudentDocument references `Document` (M:1).
3. **CRUD Matrix:** Provide a Markdown table mapping Human/System Actors against entities, specifying allowed actions (Create, Read, Update, Delete, Audit) and the required branch-scoping logic.
```

---

### Step 6: Parts 5, 6, & 7 – API, Permissions, and Validations
**Prompt to run sixth:**
```markdown
Generate the following three files for Module 05 – Student Management:

1. `Part 5 – API Contracts.md`
   - List all REST endpoints/Server Actions (Route, Method, Purpose).
   - For each endpoint (e.g., `PUT /api/students/{id}/profile`, `POST /api/students/{id}/photo`, `POST /api/students/{id}/emergency-contacts`, `POST /api/students/{id}/id-card/issue`), detail:
     * Authentication & Required Permission
     * Branch-scoping behavior
     * Request payload schema (Zod specification structure)
     * Success Response DTO (JSON format)
     * Error Response Catalog (HTTP status codes & custom application error codes)

2. `Part 6 – Permission Matrix.md`
   - Tabular mapping of all business roles (Super Admin, Branch Admin, Registrar, Student) against fine-grained permissions (e.g., `student.profile.update`, `student.pii.read`, `student.idcard.renew`).
   - Separate permissions by: Action-level, Menu-level, and Report-level.

3. `Part 7 – Validation Rules, Error Catalog, Notifications.md`
   - Custom profile validation rules (e.g., file extension types for photos, mandatory document categories).
   - Structured error code catalog (e.g., `ERR_STU_INVALID_PHOTO_FORMAT`, `ERR_STU_DOCUMENT_EXPIRED`).
   - System notification events (Email, SMS, WhatsApp) triggered by profile changes (e.g., `IDCardExpired` sends renewal notice), including exact template variables.
```

---

### Step 7: Parts 8 & 9 – Reports, KPIs, and BDD Tests
**Prompt to run seventh:**
```markdown
Generate the following two files for Module 05 – Student Management:

1. `Part 8 - Reports, Dashboards, KPIs, Analytics.md`
   - Define module-specific KPIs (e.g., total active profiles, pending document verification count, expiring ID cards, profile completion percentage).
   - Detail Dashboard widgets (e.g., expiring documents warning box, document status metrics) with permission scopes.
   - List operational reports (e.g., Student Directory Export, Missing Documents Audit List, Expired ID Cards Ledger) with filters, columns, sorting, export options.
   - Explain read models or reporting database views to support fast student queries.

2. `Part 9 – BDD Acceptance Criteria and Test Scenarios.md`
   - Write out comprehensive Gherkin (Feature, Scenario Outline, Scenario) test scenarios covering student demographic updates, profile photo upload validations, emergency contact changes, document verification states, and branch isolation scopes.
```

---

### Step 8: Parts 10 & 11 – Non-Functional Requirements & Runbooks
**Prompt to run eighth:**
```markdown
Generate the final two files for Module 05 – Student Management:

1. `Part 10 - Security Architecture and NFR.md`
   - Detail security measures specific to this module (e.g., PII access masking/logging, secure signed URLs for student documents and profile photo access).
   - Specify Non-Functional performance, availability, scalability targets (e.g., photo crop response < 200ms, secure document access resolution time).

2. `Part 11 - Deployment, Operations, Observability, Runbooks.md`
   - Observability setup: Structured logs format, tracing boundaries, metrics instrumentation.
   - Operations: System healthcheck rules, backup/recovery instructions for owned tables.
   - Troubleshooting Runbooks: Step-by-step guides for operational failures (e.g., recovering broken photo upload paths, resolving card generation errors).
```

---

## 2. Validation & Review Prompt
**Prompt to run after generating the FRD to validate it against DDD & ER guidelines:**
```markdown
You are a Principal Solutions Architect and Senior staff DDD Reviewer. I have generated a Functional Requirement Document (FRD) for "Module 05: Student Management".

Please review all the generated parts against the ASTI Bounded Context Map (docs/architecture/ddd/ddd-context-map.md) and ER Model (docs/architecture/ddd/ER Model.md) to evaluate alignment and flag any gaps, design errors, or scope creep.

Specifically check and report on the following checklist:
1. **Shared Person Model Integration:**
   - Does the FRD ensure that `Student` links directly to the central `Person` table via `personId` rather than duplicating demographic data (names, email, phone, gender, date of birth, nationality, civil ID, passport, visa) directly on the student record?
   - Is `photoUrl` explicitly stored on the `Person` table, ensuring other modules (like user accounts or portal headers) can fetch it?
2. **Emergency Contacts & Guardians:**
   - Are emergency contacts defined as child entities of `Student` with clear relationships and validations?
3. **Document Integration:**
   - Does it integrate student documents (ID copy, visa, passport copy) with the generic `Document` bounded context, specifying verification statuses?
4. **ID Card Lifecycle:**
   - Does it specify the `StudentIDCard` aggregate fields and lifecycle statuses (`Active`, `Expired`, `Terminated`) aligning with Bounded Context 8.6?
5. **Soft Deletes:**
   - Are hard deletes strictly prohibited, with logical soft deletes mapped to audit logs?
6. **Branch Scoping & Isolation:**
   - Are all endpoints, directories, and profile views scoped strictly using a `branchId` context to ensure data isolation?

For any gaps identified, please write out the exact Gaps list and suggest the precise markdown replacements to make the FRD 100% compliant.
```
