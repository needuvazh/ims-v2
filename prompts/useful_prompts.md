# Useful Prompts for ASTI IMS Development

This document maintains reusable prompts for pairing with AI assistants during the implementation, review, and tracking phases of the ASTI Integrated Institute Management System.

---

## 1. Code Review & Gap Analysis Prompts

### Reviewing OpenSpec Change Proposals
```text
Can you assume the role of senior staff engineer and perform a review on the current OpenSpec proposal (under openspec/changes/)? Evaluate if there are any gaps in the proposed design specs and verify if any of the existing business logic (especially RBAC, branch isolation, or effective dating) will be broken by this change. Highlight design discrepancies and suggest clear technical remedies.
```

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