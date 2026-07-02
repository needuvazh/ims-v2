# Useful Prompts for ASTI IMS Development

This document maintains reusable prompts for pairing with AI assistants during the implementation, review, and tracking phases of the ASTI Integrated Institute Management System.

---

## 1. Code Review & Gap Analysis Prompts

### Reviewing OpenSpec Change Proposals
```text
Can you assume the role of senior staff engineer and perform a review on the current OpenSpec proposal (under openspec/changes/)? Evaluate if there are any gaps in the proposed design specs and verify if any of the existing business logic (especially RBAC, branch isolation, or effective dating) will be broken by this change. Highlight design discrepancies and suggest clear technical remedies.
```


Can you assume the role of senior staff engineer and perform a review on the current OpenSpec proposal for Change 3 for the Lead & CRM Workflows module: "Workflows & Follow-up Scheduling" (under openspec/changes/)? Evaluate if there are any gaps in the proposed design specs and verify if any of the existing business logic  will be broken by this change. Highlight design discrepancies and suggest clear technical remedies.  Use DDD and FRD document for references


Can you assume the role of senior staff engineer and perform a review on the current OpenSpec proposal for admission-intake (under openspec/changes/)? Evaluate if there are any gaps in the proposed design specs and verify if any of the existing business logic  will be broken by this change. Highlight design discrepancies and suggest clear technical remedies.  Use DDD and module-04-admission-enrollment document for references and source of truth, don't check other FRD document and don't get confused, if you have any question and needs clarification plese feel free to ask me?


/opsx-verify admission-intake

Can you assume the role of senior staff engineer and perform a review on the code changes for openspec admission-intake, evaluate if there is any gaps in the code changes and suggested me how to fix it.


review on the current OpenSpec proposal for Core Data Models & Base APIs of the Lead & CRM Workflows module (under openspec/changes/)? Evaluate if there are any gaps in the proposed design specs and verify if any of the existing business logic  will be broken by this change. Highlight design discrepancies and suggest clear technical remedies.  Use DDD and FRD document for references




### Reviewing Database Schemas & Migrations
```text
Read the Module FRD document (docs/architecture/frd/) and assume the role of a senior database engineer. Review the current database schema in packages/database/prisma/schema.prisma and seed files under packages/database/prisma/seed.ts for any architectural gaps. Highlight issues with relationships, cascading status rules, soft-delete flags, and active-dating bounds, and provide the exact schema changes to resolve them.
```

---

## 2. Project Status Document (PSD) Update Prompt

Use the following prompt when instructing a coding assistant to synchronize the Project Status Document (PSD) with the codebase after completing milestones or archiving OpenSpec changes.

---

### Prompt Template: Synchronize PSD to Latest Codebase State
```text
Assume the role of the ASTI IMS Technical Program Manager and Enterprise Architect. Perform a thorough review of the current project status document at docs/project-status.md and update all sections to align with the latest state of our codebase, migrations, and documentation suite.

Follow these instructions during the update:
1. Scan Completed Work: Scan git changes, recent package commits (packages/*), and the recently archived OpenSpec directories (openspec/changes/archive/) to list completed actions.
2. Check Database Health: Check packages/database/prisma/migrations/ for the latest migration directory and ensure it is documented in Section 20.
3. Recalculate Completeness: Recalculate the overall progress percentage (based on completed FRD requirements out of the total 226).
4. Update All Tracking Tables:
   - Section 1: Update overall completion, date, and overall health status.
   - Section 3 & 4: Review and adjust documentation and module dashboards (e.g., transitioning CRM, Admissions, or Finance status).
   - Section 6 & 7: Append recently archived OpenSpec changes to the log and tracking grid. Detail the business reasons, technical impacts, and document edits.
   - Section 8: Trace newly implemented features from BRD down to the database models, API contracts, route views, and unit tests in the Traceability Matrix.
   - Section 10: Re-prioritize and estimate effort for the next three recommended OpenSpec proposals.
   - Section 18: Update the Omani Compliance Checklist (Vat 5%, AR/EN fields, Asia/Muscat timezone, tax breakdown).
   - Section 19: Sync integration adapters status (Tally ERP sync, biometric webhook sync, mock services).
   - Section 22: Update quality metrics (passing linter, type-checks, Vitest unit/integration count, Playwright tests count).
   - Section 23: Rewrite the machine-readable AI Assistant Context JSON block to accurately reflect current pending tasks, constraints, and priorities.
5. Guidelines: Keep lines short. Maintain all historical architecture decision records (ADRs) intact. Mark superseded info rather than deleting it. Ensure all code links are clickable.
```

---
## Prompt for FRD document review


# Role and Objective
You are a Principal Enterprise Architect and Domain-Driven Design (DDD) Expert. Your objective is to conduct a rigorous architectural audit of the provided Functional Requirement Document (FRD) suite. You will validate the FRD against strict DDD principles and our modular monolith architecture guidelines.

# Context
We are building a large-scale Institute Management System (IMS). The system is designed as a TypeScript modular monolith using React, Next.js, and Prisma. The architecture enforces strict Bounded Contexts. Modules must not directly mutate each other's data, share physical database constraints, or bypass Application Services.

# Audit Checklist
Please analyze the provided FRD text and evaluate it against the following DDD rules. Flag any violations and provide an actionable remediation step for each.

## 1. Bounded Context Isolation & Data Ownership
- **Rule:** A bounded context must exclusively own its tables. No external context is allowed to write to or directly query another context's tables.
- **Check:** Does the FRD describe any workflows, validations, or API endpoints that directly query or mutate tables owned by a different bounded context? (e.g., The *Batch* context directly modifying *Enrollment* tables).
- **Check:** Does the ER Model or CRUD Matrix enforce physical database-level foreign keys (`ON DELETE RESTRICT` / `CASCADE`) across different bounded contexts? (They must use logical UUID references instead).

## 2. Aggregate Root Encapsulation
- **Rule:** State changes must only happen through the Aggregate Root's methods or Application Services.
- **Check:** Are there instances where an API directly modifies a child entity's state while bypassing the Aggregate Root?
- **Check:** Are external processes directly updating counters, statuses, or nested arrays inside an aggregate instead of invoking a domain command (e.g., directly incrementing a `currentEnrollmentCount` instead of calling `allocateSeat()`)?

## 3. Event-Driven Architecture (Cross-Context Communication)
- **Rule:** When an action in one bounded context needs to trigger side effects in another context, it must do so by publishing a Domain Event, not via direct synchronous orchestration.
- **Check:** Are there workflows that directly orchestrate cross-module logic? (e.g., Cancelling a Batch directly triggers an API to process Finance Refunds). 
- **Check:** Ensure the FRD explicitly mentions the emission of Domain Events (e.g., `BatchCancelled`, `StudentPromoted`) and describes how downstream contexts subscribe to them.

## 4. Identity & Duplication (Shared Kernel vs Profiles)
- **Rule:** Core identity data (like Name, Email, Phone, Civil ID) should live in a central `Person` or `Party` model. Other contexts must use "Profile" extensions (e.g., `StudentProfile`, `TrainerProfile`) that reference the central `Person` ID.
- **Check:** Does the FRD redefine or duplicate core identity fields (Name, Phone, Email) inside context-specific models (like Student, Trainer, or Corporate Contact)?

## 5. Immutability and Auditability
- **Rule:** Active master data, pricing rules, completion rules, and configurations must be immutable to protect historical integrity.
- **Check:** Does the CRUD Matrix allow standard users to Update (`U`) active pricing, discounts, or evaluation rules? (Modifications to active records should require creating a new draft/version with effective dates, not in-place overwrites).

## 6. Infrastructure Leaks
- **Rule:** Business rules must not leak into delivery mechanisms (Next.js route handlers) or infrastructure (Prisma hooks).
- **Check:** Are there UI Screen specs or API Contracts that dictate executing complex domain business rules directly in the controller/route logic rather than deferring to a Domain or Application Service?

# Output Format
Present your findings in a structured **Architectural Audit Report** format. Use the following sections:
1. **Executive Summary:** Pass/Fail grade with a brief overview.
2. **Critical Architectural Misalignments:** Detailed explanations of boundary violations, coupling leaks, and aggregate root bypasses.
3. **Database & Schema Gaps:** Missing logical indexes, incorrect physical foreign keys, or duplicated identity fields.
4. **Actionable Remediation Checklist:** A clear, bulleted list of fixes required to bring the FRD into compliance.

Please execute the audit on the following FRD text:
Module 10: Faculty 