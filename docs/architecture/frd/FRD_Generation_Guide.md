# ASTI IMS: FRD Generation Guide

This guide provides a structured, repeatable methodology for generating high-quality, comprehensive **Functional Requirement Documents (FRDs)** for the ASTI Integrated Institute Management System (IMS) modules. It uses the **Module 01: Identity & Access Management (IAM)** directory structure as the golden template.

---

## 1. The Challenge of Large-Scale FRD Generation

Generating a full, enterprise-grade FRD spanning 12 detailed parts in a single LLM prompt is practically impossible due to:
1. **Context Window & Output Token Limits:** The LLM will truncate details, skip crucial fields, or hallucinate placeholders.
2. **Quality Degradation:** High-level summaries replace granular requirements, API contracts, screen specifications, and test cases.
3. **Loss of Bounded Context Alignment:** The model will forget the strict boundaries defined in the DDD context map.

### The Solution: Sequential, Context-Aware Generation
To achieve the depth of Module 01, you must generate the FRD **part-by-part** using a shared session context. The LLM must be primed with:
- `docs/architecture/ddd/ddd-context-map.md` (Domain Boundaries, Rules, and Events)
- `docs/architecture/ddd/ER Model.md` (Data Model and Entities)
- `packages/database/prisma/schema.prisma` (Active Schema State)
- The target module's existing brief description or checklist (e.g., `docs/architecture/frd/Module 03: Lead & Inquiry Management.md`).

---

## 2. Target Directory & File Structure

For any module (e.g., Module 03: Lead & Inquiry Management), create a dedicated folder under `docs/architecture/frd/Module 03: Lead & Inquiry Management/` and generate the following files:

```text
Module 03: Lead & Inquiry Management/
├── Module 3: Lead & Inquiry Management.md (Main Index & Summary)
├── Part 1 – Business Overview, Functional Requirements, Business Rules.md
├── Part 2 – User Stories, Use Cases, Workflows, State Machines.md
├── Part 3 – Screen Specifications and UI Components.md
├── Part 4 – Database Entities and CRUD Matrix.md
├── Part 5 – API Contracts.md
├── Part 6 – Permission Matrix.md
├── Part 7 – Validation Rules, Error Catalog, Notifications.md
├── Part 8 - Reports, Dashboards, KPIs, Analytics.md
├── Part 9 – BDD Acceptance Criteria and Test Scenarios.md
├── Part 10 - Security Architecture and NFR.md
└── Part 11 - Deployment, Operations, Observability, Runbooks.md
```

---

## 3. Master System Prompt Template

Copy and paste this prompt to prime your AI assistant before generating any module's FRD.

```markdown
You are a Principal Solutions Architect and Senior Staff Engineer specializing in clean architecture, Domain-Driven Design (DDD), and TypeScript/Next.js monorepos. Your task is to help me generate a production-grade, highly detailed Functional Requirement Document (FRD) divided into 12 distinct parts for a specific module of the Al Saud Training Institute (ASTI) Integrated Institute Management System (IMS).

### Project Principles & Context Rules:
1. **Modular Monolith first:** Do not propose microservices, external brokers (like RabbitMQ), or CQRS/Event Sourcing unless explicitly asked.
2. **Enrollment-Centric Model:** All learning lifecycles (Regular, Corporate, Walk-In) must flow into the central `Enrollment` aggregate. Do not duplicate learner lifecycles.
3. **Person/Party Model:** Follow the shared party pattern to avoid identity duplication.
4. **Soft Deletes & Auditing:** No hard deletes. Every sensitive action (Finance, RBAC, Certificate, Attendance, Completion) must be audited and support `effectiveStartDate/EndDate` and soft delete fields (`isDeleted`, `deletedAt`).
5. **Branch Isolation:** Enforce server-side branch scoping. Users can only access data within their assigned branch context unless granted a consolidated reporting permission.
6. **No Placeholders:** Write full, concrete schemas, rules, fields, and contracts. Avoid using "...", "etc.", or generic placeholders.
7. **Oman Localization:** Adhere to Oman tax invoice / receipt norms, bilingual (English/Arabic) UI support where required, and Oman timezone defaults (GST - UTC+4).

### Inputs Provided:
- DDD Context Map (`docs/architecture/ddd/ddd-context-map.md`)
- ER Model Specification (`docs/architecture/ddd/ER Model.md`)
- Prisma Database Schema (`packages/database/prisma/schema.prisma`)
- Existing brief module description or target checklist.

We will generate this FRD systematically, one part at a time. Do not jump ahead. Wait for my confirmation after each part. Let's begin by confirming you understand the principles and inputs.
```

---

## 4. Part-by-Part Prompt Sequence

Once the AI confirms, execute the following prompt sequence step-by-step. Replace `[Module Name]` and `[Module Number]` with your target module (e.g., "Lead & Inquiry Management", "03").

### Step 1: The Main Index & Part 1
**Prompt:**
```markdown
Generate the following two files for Module [Module Number] – [Module Name] based on our inputs:

1. `Module [Module Number]: [Module Name].md`
   - Purpose and Objective
   - Business Goals (BO-xxx format)
   - Scope (Included / Excluded)
   - Stakeholders & Actors (Human & System)
   - Functional Overview (Tree diagram of submodules)
   - Business Capabilities & User Types (Internal / External)
   - Functional Requirements Checklist (FR-[Module Code]-xxx)
   - Permission Model Overview
   - Security & Audit Requirements Summary
   - Non-Functional Requirements Summary

2. `Part 1 – Business Overview, Functional Requirements, Business Rules.md`
   - Comprehensive introduction and business benefits.
   - Detailed functional requirements specifications. For each requirement (e.g., FR-[Module Code]-001), specify:
     * Description & Actors
     * Preconditions
     * Inputs
     * Processing Steps (Detailed algorithms, calculations, or checks)
     * Outputs & Postconditions
     * Priority (MoSCoW)
   - Comprehensive Business Rules table (BR-[Module Code]-xxx) detailing state transitions, limits, validations, and bounds.
   - Cross-module dependencies mapping.

Be exhaustive, concrete, and write out all requirements in full. No placeholders.
```

### Step 2: Part 2 – User Stories & Use Cases
**Prompt:**
```markdown
Now generate `Part 2 – User Stories, Use Cases, Workflows, State Machines.md` for Module [Module Number] – [Module Name].

Requirements:
1. **User Stories:** Write at least 8 detailed User Stories in the "As a... I want to... So that..." format. Prioritize them using MoSCoW and provide a BDD-style Gherkin acceptance criteria block (Given/When/Then) for each.
2. **Use Cases:** Document the primary use cases with:
   - Primary Actor
   - Preconditions
   - Main Success Scenario (Numbered steps)
   - Alternative Flows (e.g., validation failures, exceptions)
   - Postconditions
3. **Business Workflows:** Describe the core operational workflows in structured text or ASCII/Mermaid sequence diagrams.
4. **State Machines:** Identify any entity that undergoes state transitions (e.g., Lead Status, Enrollment Status, Invoice Status). Include a Mermaid state diagram and a transition rules matrix mapping allowed from/to statuses and the permissions required.
```

### Step 3: Part 3 – Screen Specifications & UI Components
**Prompt:**
```markdown
Generate `Part 3 – Screen Specifications and UI Components.md` for Module [Module Number] – [Module Name].

Requirements:
1. **Screen Inventory:** List all screens required for the Admin, Student, and Trainer portals where applicable.
2. **Screen Details:** For each screen, define:
   - Layout & Grid Structure (dense, data-rich dashboard style)
   - Interactive Elements (buttons, tabs, selectors)
   - Input Form Fields with exact validations (e.g., type, regex, length, mandatory)
   - Table columns with sorting, filtering, and paging behaviors
3. **Dynamic UI States:** Document form validation error states, loading skeletons, empty states, and permission-based element hiding.
4. **Bilingual Layout Rules:** Specify English (LTR) and Arabic (RTL) rendering differences.
```

### Step 4: Part 4 – Database Entities & CRUD Matrix
**Prompt:**
```markdown
Generate `Part 4 – Database Entities and CRUD Matrix.md` for Module [Module Number] – [Module Name].

Requirements:
1. **Entity Specifications:** Define all database models owned by this context. For each table, provide:
   - Field name, Data Type (PostgreSQL & Prisma equivalent)
   - Nullability, Keys (PK, FK, Unique)
   - Indexes and constraints
   - Audit columns (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `isDeleted`)
   - Effective dating columns where rules/pricing apply (`effectiveStartDate`, `effectiveEndDate`, `status`)
2. **Relationships:** Detail 1:1, 1:N, and N:M relationships with cascading/restrict rules.
3. **CRUD Matrix:** Provide a Markdown table mapping Human/System Actors against entities, specifying allowed actions (Create, Read, Update, Delete, Audit) and the required branch-scoping logic.
```

### Step 5: Parts 5, 6, & 7 – API, Permissions, and Validations
**Prompt:**
```markdown
Generate the following three files for Module [Module Number] – [Module Name]:

1. `Part 5 – API Contracts.md`
   - List all REST endpoints/Server Actions (Route, Method, Purpose).
   - For each endpoint, detail:
     * Authentication & Required Permission
     * Branch-scoping behavior
     * Request payload schema (Zod specification structure)
     * Success Response DTO (JSON format)
     * Error Response Catalog (HTTP status codes & custom application error codes)

2. `Part 6 – Permission Matrix.md`
   - tabular mapping of all business roles (Super Admin, Branch Admin, Counselor, Accountant, Trainer, Student, etc.) against fine-grained permissions.
   - Separate permissions by: Action-level, Menu-level, and Report-level.

3. `Part 7 – Validation Rules, Error Catalog, Notifications.md`
   - Custom business validation schemas (e.g., age limits, date overlaps, payment rules).
   - Structured error code catalog (e.g., `ERR_FIN_INSUFFICIENT_FUNDS`, `ERR_CRM_DUPLICATE_LEAD`).
   - System notification events (Email, SMS, WhatsApp) triggered by domain events in this module, including exact template variables.
```

### Step 6: Parts 8 & 9 – Reports, KPIs, and BDD Tests
**Prompt:**
```markdown
Generate the following two files for Module [Module Number] – [Module Name]:

1. `Part 8 - Reports, Dashboards, KPIs, Analytics.md`
   - Define module-specific KPIs (e.g., conversion rate, collection efficiency, seat utilization).
   - Detail Admin & Portal Dashboard widgets (Metric summaries, charts, table widgets) with permission scopes.
   - List operational reports with filters, columns, sorting, export options (CSV, PDF, XLSX).
   - Explain read models or reporting database views to support fast reporting queries.

2. `Part 9 – BDD Acceptance Criteria and Test Scenarios.md`
   - Write out comprehensive Gherkin (Feature, Scenario Outline, Scenario) test scenarios covering all positive, negative, validation, and boundary conditions.
   - Provide test cases for authorization guards and branch data isolation.
```

### Step 7: Parts 10 & 11 – Non-Functional Requirements & Runbooks
**Prompt:**
```markdown
Generate the final two files for Module [Module Number] – [Module Name]:

1. `Part 10 - Security Architecture and NFR.md`
   - Detail security measures specific to this module (e.g., PII encryption, payment auditing, certificate signing).
   - Specify Non-Functional performance, availability, scalability, usability, and compliance targets (e.g., API response thresholds, concurrent limits).

2. `Part 11 - Deployment, Operations, Observability, Runbooks.md`
   - Observability setup: Structured logs format, tracing boundaries, metrics instrumentation.
   - Operations: System healthcheck rules, backup/recovery instructions for owned tables.
   - Troubleshooting Runbooks: Step-by-step guides for operational failures (e.g., transaction failure recovery, bulk import sync issues).
```

---

## 5. Verification Checklist

Before archiving a generated FRD module folder, verify that:
1. **Aggregate Root Integrity:** No aggregate root modifications bypass the owner's application services.
2. **Branch Scoping:** Every user interface page, endpoint, and query specifies branch data isolation behavior.
3. **Oman Tax & Receipting Compliant:** (For Finance/Billing) Oman tax laws and standard Omani Rial decimal formatting (3 decimals, e.g., `OMR 12.500`) are respected.
4. **Soft Deletes:** No Prisma `delete` operations are allowed; logical updates only.
5. **Seeding:** Part 6's permission matrix perfectly aligns with the permissions list to be seeded in the database.
