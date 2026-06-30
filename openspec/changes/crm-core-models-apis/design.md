## Context

Al Saud Training Institute (ASTI) needs to track student inquiries, leads, and follow-ups. The current implementation of CRM in `packages/crm-leads` is only a stub. We need a production-grade database schema, robust domain application services, Zod contracts, and Next.js REST API routes. 

## Goals / Non-Goals

**Goals:**
* Define the database schema for `Inquiry`, `Lead`, and `LeadFollowUp` (mapped to `lead_follow_ups` in DB) with standard IMS auditing columns.
* Build application services for Inquiry capture, Lead lifecycle mutations, stage transitions, counselor assignments, and follow-up tracking.
* Set up thin Next.js route handlers that perform authentication, authorization check, Zod payload validation, and call the application services.
* Enforce branch-scoped access and counselor-scoped filters.
* Support reliable domain event publishing via Transactional Outbox pattern.

**Non-Goals:**
* Automated lead assignment engines (rules-based routing).
* Third-party integrations (SMS, WhatsApp, Email) - these will run as outbox subscribers or background jobs in a subsequent phase.
* SaaS tenancy isolation (ASTI is a single-client institute).

## Decisions

### 1. Database Schema Additions & Changes
We will modify `packages/database/prisma/schema.prisma` to refine the models:
* Add `status` field to the `Lead` model to align with IMS auditing standard fields.
* Expand the `LeadFollowUp` model to include auditing fields: `deletedAt`, `deletedBy`, `isDeleted`.
* Ensure appropriate indexes are placed on foreign key and query criteria columns:
  * `inquiries`: index on `branchId`, `counselorId`, `status`.
  * `leads`: index on `branchId`, `counselorId`, `stage`, `personId`.
  * `lead_follow_ups`: index on `leadId`, `counselorId`, `status`.

#### Migration Rollback / Mitigation Notes
* **Migration:** Run `prisma migrate dev` to generate a migration.
* **Mitigation:** Since this is a new database setup or only introducing new tables/fields (none of which are destructive to existing tables), the risk is minimal. If a rollback is needed, run a migration that drops the `inquiries`, `leads`, and `lead_follow_ups` tables and removes the added fields.

### 2. Architecture & Bounded Context Boundaries
We will structure the code inside the `packages/crm-leads` package using Clean Architecture guidelines:
* **Domain Layer (`src/domain`):** Contains interface models, Zod validation schemas, and types.
* **Application Services (`src/application`):** Implements orchestrators that execute within a database transaction boundary where mutations are needed (injecting a `tx` TransactionClient).
* **Infrastructure Layer (`src/infrastructure`):** Implements repository classes using Prisma Client.
* **Delivery Layer (`apps/admin-portal/app/api/crm`):** Next.js route handlers acting as thin adapters.

#### Cross-Context Boundaries
* **Identity & Access Management:** When a lead is created or promoted from an inquiry, we resolve the standard `Person` aggregate (creating a new `Person` record in the database if the email/mobile doesn't match an existing one). We do NOT execute database joins across contexts. The `LeadApplicationService` will call a public `PersonService` or mutate `Person` directly using the database repository inside a transaction.

### 3. Service Signatures & Transactions
All mutations in the application services will be wrapped in a Prisma transactional client:
1. Perform business validation (e.g. check duplicate inquiries, confirm counselor status, validate stage transition).
2. Save the primary entity state.
3. Write to the `OutboxEvent` table using the domain event payload.
4. Record audit details in `AuditLog`.

### 4. Authorization & Security Scoping
We will enforce branch-level and counselor-level access control in the query services:
* **Branch Scoping:** Resolve the branches the user has access to by invoking the `BranchScopeResolver` with `userId` and `activeBranchId`.
* **Counselor Scoping:** If the user lacks the global read permission (`crm.leads.read.all`), restrict queries by filtering on `counselorId = userId`.
* **API Middleware:** Route handlers will use `withPermission` and `withBranchScope` to enforce baseline authentication and branch routing.

---

## Risks / Trade-offs

* **Duplication during Inquiry Promoted to Lead:** There is a risk that a customer creates an inquiry, and the counselor creates a lead manually, resulting in a duplicate `Person` record.
  * *Mitigation:* The `Person` resolution logic must query by exact email or phone number match before creating a new `Person` record.
* **Performance of Scoped Queries:** Enforcing counselor-scoped and branch-scoped queries on large tables could lead to slow list scans.
  * *Mitigation:* Heavy indexes are created on `branchId`, `counselorId`, `status`, and `isDeleted` to ensure efficient query execution.
