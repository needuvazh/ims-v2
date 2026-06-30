
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

----

Generate the following two files for Module 06 – Course Catalog & Training Delivery (Batch) Management based on our inputs:

1. `Module 06: Course Catalog & Training Delivery (Batch) Management.md`
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

----
Now generate `Part 2 – User Stories, Use Cases, Workflows, State Machines.md` for Module 06 – Course Catalog & Training Delivery (Batch) Management.

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

----
Generate `Part 3 – Screen Specifications and UI Components.md` for Module 06 – Course Catalog & Training Delivery (Batch) Management.

Requirements:
1. **Screen Inventory:** List all screens required for the Admin, Student, and Trainer portals where applicable.
2. **Screen Details:** For each screen, define:
   - Layout & Grid Structure (dense, data-rich dashboard style)
   - Interactive Elements (buttons, tabs, selectors)
   - Input Form Fields with exact validations (e.g., type, regex, length, mandatory)
   - Table columns with sorting, filtering, and paging behaviors
3. **Dynamic UI States:** Document form validation error states, loading skeletons, empty states, and permission-based element hiding.
4. **Bilingual Layout Rules:** Specify English (LTR) and Arabic (RTL) rendering differences.

----
Generate `Part 4 – Database Entities and CRUD Matrix.md` for Module 06 – Course Catalog & Training Delivery (Batch) Management.

Requirements:
1. **Entity Specifications:** Define all database models owned by this context. For each table, provide:
   - Field name, Data Type (PostgreSQL & Prisma equivalent)
   - Nullability, Keys (PK, FK, Unique)
   - Indexes and constraints
   - Audit columns (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `isDeleted`)
   - Effective dating columns where rules/pricing apply (`effectiveStartDate`, `effectiveEndDate`, `status`)
2. **Relationships:** Detail 1:1, 1:N, and N:M relationships with cascading/restrict rules.
3. **CRUD Matrix:** Provide a Markdown table mapping Human/System Actors against entities, specifying allowed actions (Create, Read, Update, Delete, Audit) and the required branch-scoping logic.
----
Generate the following three files for Module 06 – Course Catalog & Training Delivery (Batch) Management:

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

   Generate the following two files for Module 06 – Course Catalog & Training Delivery (Batch) Management:

1. `Part 8 - Reports, Dashboards, KPIs, Analytics.md`
   - Define module-specific KPIs (e.g., conversion rate, collection efficiency, seat utilization).
   - Detail Admin & Portal Dashboard widgets (Metric summaries, charts, table widgets) with permission scopes.
   - List operational reports with filters, columns, sorting, export options (CSV, PDF, XLSX).
   - Explain read models or reporting database views to support fast reporting queries.

2. `Part 9 – BDD Acceptance Criteria and Test Scenarios.md`
   - Write out comprehensive Gherkin (Feature, Scenario Outline, Scenario) test scenarios covering all positive, negative, validation, and boundary conditions.
   - Provide test cases for authorization guards and branch data isolation.
----
   Generate the final two files for Module 06 – Course Catalog & Training Delivery (Batch) Management:

1. `Part 10 - Security Architecture and NFR.md`
   - Detail security measures specific to this module (e.g., PII encryption, payment auditing, certificate signing).
   - Specify Non-Functional performance, availability, scalability, usability, and compliance targets (e.g., API response thresholds, concurrent limits).

2. `Part 11 - Deployment, Operations, Observability, Runbooks.md`
   - Observability setup: Structured logs format, tracing boundaries, metrics instrumentation.
   - Operations: System healthcheck rules, backup/recovery instructions for owned tables.
   - Troubleshooting Runbooks: Step-by-step guides for operational failures (e.g., transaction failure recovery, bulk import sync issues).

----
