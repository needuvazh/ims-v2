# ASTI IMS: FRD Generation Guide

This guide provides a structured, repeatable methodology for generating high-quality, comprehensive Functional Requirement Documents (FRDs) for the ASTI Integrated Institute Management System (IMS) modules.

The goal is not only to generate FRDs, but to keep them aligned with the authoritative DDD and ER sources already in the repo.

---

## 1. Why FRD Generation Needs Guardrails

Generating a full enterprise FRD in one prompt is usually low quality because:
1. Context windows force omissions or placeholders.
2. Long outputs drift across module boundaries.
3. Requirements, entities, APIs, permissions, and workflows can diverge from the DDD context map.

### The solution
Generate the FRD part by part, then compare each part against:
- `docs/architecture/ddd/ddd-context-map.md`
- `docs/architecture/ddd/ER Model.md`
- `packages/database/prisma/schema.prisma`
- Earlier FRD parts for the same module

If the FRD introduces a concept that is not present in the DDD or ER sources, mark it as a gap, dependency, or future-phase item instead of silently inventing it.

---

## 2. Target Directory and File Structure

For any module, create a dedicated folder under `docs/architecture/frd/Module 03 - Lead & Inquiry Management/` style naming and generate the following files:

```text
Module 03 - Lead & Inquiry Management/
├── Module 03 - Lead & Inquiry Management.md (Main Index & Summary)
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

Optional but recommended for larger modules:
- `ASTI IMS <Module> FRD Validation Against DDD, ER Model, and Implementation Architecture.md`

---

## 3. Master System Prompt Template

Copy and paste this prompt before generating any module FRD:

```markdown
You are a Principal Solutions Architect and Senior Staff Engineer specializing in clean architecture, Domain-Driven Design (DDD), and TypeScript/Next.js monorepos. Your task is to help me generate a production-grade, highly detailed Functional Requirement Document (FRD) divided into 12 distinct parts for a specific module of the Al Saud Training Institute (ASTI) Integrated Institute Management System (IMS).

### Project Principles & Context Rules:
1. Modular monolith first: Do not propose microservices, external brokers, or CQRS/Event Sourcing unless explicitly asked.
2. Enrollment-centric model: All learning lifecycles must flow into the central `Enrollment` aggregate.
3. Person/Party model: Follow the shared party pattern to avoid identity duplication.
4. Soft deletes & auditing: No hard deletes. Sensitive actions must be auditable and use the repo's audit/soft-delete conventions.
5. Branch isolation: Enforce server-side branch scoping.
6. No placeholders: Write full, concrete schemas, rules, fields, and contracts.
7. Oman localization: Respect Oman tax invoice / receipt norms and GST timezone defaults.
8. DDD alignment first: Every requirement, entity, API, screen, permission, validation rule, report, and test case must map back to an owning bounded context, aggregate, or read model from the DDD context map or ER model. If it does not map cleanly, flag it as a gap instead of inventing a new model.

### Inputs Provided:
- DDD Context Map (`docs/architecture/ddd/ddd-context-map.md`)
- ER Model Specification (`docs/architecture/ddd/ER Model.md`)
- Prisma Database Schema (`packages/database/prisma/schema.prisma`)
- Existing brief module description or target checklist

We will generate this FRD systematically, one part at a time. Do not jump ahead. Wait for my confirmation after each part. After each part is drafted, compare it against the DDD context map, ER model, and earlier FRD parts for conflicts before moving on.
```

---

## 4. Part-by-Part Prompt Sequence

Use the following sequence step by step. Replace `[Module Name]` and `[Module Number]` with the target module.

### Step 1: Main Index and Part 1

```markdown
Generate the following two files for Module [Module Number] - [Module Name] based on our inputs:

1. `Module [Module Number] - [Module Name].md`
   - Purpose and Objective
   - Business Goals (BO-xxx format)
   - Scope (Included / Excluded)
   - Stakeholders & Actors (Human & System)
   - Functional Overview (tree diagram of submodules)
   - Business Capabilities & User Types (Internal / External)
   - Functional Requirements Checklist (FR-[Module Code]-xxx)
   - Permission Model Overview
   - Security & Audit Requirements Summary
   - Non-Functional Requirements Summary
   - DDD ownership notes and known cross-context dependencies

2. `Part 1 – Business Overview, Functional Requirements, Business Rules.md`
   - Comprehensive introduction and business benefits
   - Detailed functional requirements specifications
   - For each requirement, specify:
     * Description & Actors
     * Preconditions
     * Inputs
     * Processing Steps
     * Outputs & Postconditions
     * Priority (MoSCoW)
   - Comprehensive Business Rules table (BR-[Module Code]-xxx)
   - Cross-module dependencies mapping
   - Explicit comparison notes showing how the rules align with the DDD context map and ER model

Be exhaustive, concrete, and write out all requirements in full. No placeholders.
```

### Step 2: Part 2 - User Stories and Use Cases

```markdown
Now generate `Part 2 – User Stories, Use Cases, Workflows, State Machines.md` for Module [Module Number] - [Module Name].

Requirements:
1. User stories: Write at least 8 detailed user stories in the "As a... I want to... So that..." format. Prioritize them using MoSCoW and provide Gherkin acceptance criteria for each.
2. Use cases: Document the primary use cases with primary actor, preconditions, main success scenario, alternative flows, and postconditions.
3. Business workflows: Describe the core operational workflows in structured text or ASCII/Mermaid sequence diagrams.
4. State machines: Identify any entity that undergoes state transitions. Include a Mermaid state diagram and a transition rules matrix mapping allowed from/to statuses and permissions.
```

### Step 3: Part 3 - Screen Specifications and UI Components

```markdown
Generate `Part 3 – Screen Specifications and UI Components.md` for Module [Module Number] - [Module Name].

Requirements:
1. Screen inventory: List all screens required for the Admin, Student, and Trainer portals where applicable.
2. Screen details: For each screen, define layout, interactive elements, input validations, and table behaviors.
3. Dynamic UI states: Document validation errors, loading skeletons, empty states, and permission-based hiding.
4. Bilingual layout rules: Specify English (LTR) and Arabic (RTL) rendering differences.
5. DDD fit check: Each screen must map to an application service or use case and must not imply UI-driven business logic that belongs in another context.
```

### Step 4: Part 4 - Database Entities and CRUD Matrix

```markdown
Generate `Part 4 – Database Entities and CRUD Matrix.md` for Module [Module Number] - [Module Name].

Requirements:
1. Entity specifications: Define all database models owned by this context. For each table, provide field names, data types, nullability, keys, indexes, constraints, audit columns, and effective dating columns where relevant.
2. Relationships: Detail 1:1, 1:N, and N:M relationships with cascading/restrict rules.
3. CRUD matrix: Provide a table mapping Human/System Actors against entities and allowed actions, including branch-scoping logic.
4. Ownership check: Mark whether each entity is owned by the module, referenced from another bounded context, or should not exist because the DDD model owns it elsewhere.
```

### Step 5: Part 5 - API Contracts

```markdown
Generate `Part 5 – API Contracts.md` for Module [Module Number] - [Module Name].

Requirements:
- List all REST endpoints/Server Actions (Route, Method, Purpose)
- For each endpoint, detail authentication, required permission, branch-scoping behavior, request schema, success DTO, and error responses
```

### Step 6: Part 6 - Permission Matrix

```markdown
Generate `Part 6 – Permission Matrix.md` for Module [Module Number] - [Module Name].

Requirements:
- Tabular mapping of all business roles against fine-grained permissions
- Separate permissions by action-level, menu-level, and report-level
- Highlight permissions that are branch-scoped, global, or consolidated-report only
```

### Step 7: Part 7 - Validation Rules, Error Catalog, Notifications

```markdown
Generate `Part 7 – Validation Rules, Error Catalog, Notifications.md` for Module [Module Number] - [Module Name].

Requirements:
- Custom business validation schemas
- Structured error code catalog
- System notification events triggered by domain events in this module
- Comparison table showing whether each validation rule belongs in the module, is delegated to another bounded context, or is shared-kernel only
```

### Step 8: Part 8 - Reports, Dashboards, KPIs, Analytics

```markdown
Generate `Part 8 - Reports, Dashboards, KPIs, Analytics.md` for Module [Module Number] - [Module Name].

Requirements:
- Define module-specific KPIs
- Detail dashboard widgets with permission scopes
- List operational reports with filters, columns, sorting, and export options
- Explain read models or reporting database views
- Confirm that any read model is explicitly read-only and does not replace authoritative transactional tables
```

### Step 9: Part 9 - BDD Acceptance Criteria and Test Scenarios

```markdown
Generate `Part 9 – BDD Acceptance Criteria and Test Scenarios.md` for Module [Module Number] - [Module Name].

Requirements:
- Write comprehensive Gherkin scenarios covering positive, negative, validation, and boundary conditions
- Provide test cases for authorization guards and branch data isolation
- Include at least one scenario proving behavior matches the DDD ownership rule for the module's core aggregate
```

### Step 10: Part 10 - Security Architecture and NFR

```markdown
Generate `Part 10 - Security Architecture and NFR.md` for Module [Module Number] - [Module Name].

Requirements:
- Detail security measures specific to this module
- Specify non-functional performance, availability, scalability, usability, and compliance targets
- Confirm audit requirements for sensitive state changes and cross-context side effects
```

### Step 11: Part 11 - Deployment, Operations, Observability, Runbooks

```markdown
Generate `Part 11 - Deployment, Operations, Observability, Runbooks.md` for Module [Module Number] - [Module Name].

Requirements:
- Observability setup: structured logs, tracing boundaries, metrics instrumentation
- Operations: system health checks, backup/recovery instructions for owned tables
- Troubleshooting runbooks for operational failures
- Final consistency check confirming the module still matches the DDD and ER source documents after all parts are written
```

---

## 5. DDD / ER Model Validation Workflow

Before a generated FRD is considered complete, compare the entire module against the source documents in this order:
1. `docs/architecture/ddd/ddd-context-map.md`
2. `docs/architecture/ddd/ER Model.md`
3. `packages/database/prisma/schema.prisma`
4. The FRD main index and all 11 part files

Use this comparison table while reviewing each part:

| Check Area | Question |
| --- | --- |
| Bounded context ownership | Does the requirement belong to the module's owning context, or is it owned elsewhere? |
| Aggregate boundaries | Does the FRD avoid direct mutation of aggregates owned by another context? |
| Entity alignment | Does every owned entity match the ER model and Prisma schema intent? |
| Domain events | Are only documented events used, and are side effects routed through the correct context? |
| Permissions and branch scope | Are action, menu, and report permissions explicit and server-enforced? |
| Workflow and state machine | Do the states and transitions match the DDD model and related module documents? |
| API contracts | Are endpoints thin adapters over application services with no hidden business rules? |
| Reporting | Are dashboard and report requirements clearly read-only? |
| Audit and NFRs | Are sensitive actions, financial actions, and state transitions auditable and testable? |

If a section introduces a new concept that is not in the DDD or ER model, label it as one of the following:
1. A required gap in the architecture source documents.
2. A referenced concept owned by another bounded context.
3. A future-phase item that should not be implemented in Phase 1.

---

## 6. Verification Checklist

Before archiving a generated FRD module folder, verify that:
1. Aggregate root integrity is preserved and no aggregate is mutated outside its owning application service.
2. Branch scoping is defined for every user interface page, endpoint, query, and report.
3. Oman tax and receipting rules are respected for finance/billing modules.
4. No Prisma `delete` operations are used where soft delete is required.
5. Part 6 permission matrices align with the permissions seeded in the database.
6. The final FRD set does not contradict the DDD context map, ER model, or Prisma schema.
7. Part 1 through Part 11 agree on ownership, names, statuses, permissions, and cross-context dependencies.
