## Context

ASTI requires a structured database layer to persist B2B commercial pipelines (Module 15) before operational handoff to Module 14. This change introduces the required Prisma schema models for corporate sales leads, visits, follow-up calendar reminders, quotations, costing sheets, and sales orders.

## Goals / Non-Goals

**Goals:**
- Add 8 core models (`CorporateSalesLead`, `CorporateMarketingVisit`, `CorporateSalesFollowUp`, `Quotation`, `QuotationLineItem`, `QuotationRevision`, `QuotationCostingSheet`, and `SalesOrder`) directly to `packages/database/prisma/schema.prisma`.
- Add back-relations on `CorporateAccount`, `Branch`, and `Course` models.
- Run local migrations via `npx prisma migrate dev` to instantiate these tables in the PostgreSQL database.
- Verify that TypeScript compilation compiles without any relational resolution issues.

**Non-Goals:**
- Implementing Next.js API routes, UI screens, form handlers, or background worker jobs. (These will be implemented in subsequent functional changes).

## Decisions

- **Pre-enrollment Branch Scope**: Include `branchId` directly on the primary sales lead, marketing visit, follow-up, quotation, and sales order tables. This enforces strict row-level access control on the database level.
- **Relational Integrity Rules**: All relations use `onDelete: Restrict` mapping to prevent deleting parent organization, branch, or course records when active sales opportunities depend on them.
- **Outbox Event Triggers**: Outbox tables will be utilized asynchronously via the background worker to dispatch reminders and handle confirmed sales orders, avoiding blocking RPC calls.
- **Version Auditing**: Optimistic lock version counters (`version` field) and standard soft delete columns (`isDeleted`, `deletedAt`) are integrated across all tables.

## Risks / Trade-offs

- **Risk: Monolith Relations compilation**: Modifying the central `Branch` and `CorporateAccount` models modifies the types generated for Prisma Client across all 24 monorepo packages.
- **Mitigation**: We will execute a full workspace typecheck (`pnpm typecheck`) and run Admissions/Database unit test suites immediately after migration generation to guarantee compilation.
