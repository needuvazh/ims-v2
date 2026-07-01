## Context

Al Saud Training Institute (ASTI) needs to track student inquiries, leads, and follow-ups. The current implementation of CRM in `packages/crm-leads` is only a stub. We need a production-grade database schema, robust domain application services, Zod contracts, and Next.js REST API routes. 

## Goals / Non-Goals

**Goals:**
* Define the database schema for `Inquiry`, `Lead`, and `LeadFollowUp` (mapped to `lead_follow_ups` in DB) with standard IMS auditing columns and performance indexes.
* Build application services for Inquiry capture, Lead lifecycle mutations, stage transitions (governed by pipeline state matrix), counselor assignments, and follow-up tracking.
* Implement optimistic concurrency controls using `version` on `Lead` to prevent overwrite conflicts.
* Enforce duplicate verification rules and reuse existing `Person` aggregates when duplicates are bypassed.
* Implement default PII data masking (for email, phone/mobile, and national ID) with an audited unmasking request endpoint.
* Set up thin Next.js route handlers under the versioned `/api/v1/crm/...` namespace that perform Zod validation and enforce authorization/branch scoping.
* Establish synchronous Admissions handoff within a database transaction boundary when a lead is qualified as `Won`.

**Non-Goals:**
* Automated lead assignment engines (rules-based routing).
* Third-party integrations (SMS, WhatsApp, Email) - these will run as outbox subscribers or background jobs in a subsequent phase.
* SaaS tenancy isolation (ASTI is a single-client institute).

## Decisions

### 1. Database Schema Additions & Changes
We will modify `packages/database/prisma/schema.prisma` to refine the models:
* Add `status RecordStatus @default(Active)` field to the `Lead` model to align with IMS auditing standard fields (distinct from business `stage: LeadStage`).
* Expand the `LeadFollowUp` model to include auditing fields: `deletedAt`, `deletedBy`, `isDeleted`.
* Ensure appropriate indexes are placed on foreign key and query criteria columns:
  * `inquiries`: index on `branchId`, `counselorId`, `status`.
  * `leads`: index on `branchId`, `counselorId`, `stage`, `personId`.
  * `lead_follow_ups`: index on `leadId`, `counselorId`, `status`.

#### Migration Rollback / Mitigation Notes
* **Migration:** Run `prisma migrate dev` to generate a migration.
* **Mitigation:** Since this is a new database setup or only introducing new tables/fields, the risk is minimal. If a rollback is needed, run a migration that drops the `inquiries`, `leads`, and `lead_follow_ups` tables and removes the added fields.

### 2. Architecture & Bounded Context Boundaries
We will structure the code inside the `packages/crm-leads` package using Clean Architecture guidelines:
* **Domain Layer (`src/domain`):** Contains interface models, Zod validation schemas, phone normalization rules, and PII masking helpers.
* **Application Services (`src/application`):** Implements orchestrators that execute within a database transaction boundary where mutations are needed (injecting a `tx` TransactionClient).
* **Infrastructure Layer (`src/infrastructure`):** Implements repository classes using Prisma Client.
* **Delivery Layer (`apps/admin-portal/app/api/v1/crm`):** Next.js route handlers acting as thin adapters under the `/api/v1/...` versioned folder hierarchy.

#### Cross-Context Boundaries
* **Identity & Access Management (Person Reusability):** Under the Party-based identity model, when a lead is created or promoted from an inquiry, we check for an existing `Person` record by email or mobile. If a match is found, we reuse the existing `Person` ID to prevent database unique constraint violations on `Person.mobile`.
* **Admissions Handoff:** When a lead transitions to the `Won` stage, it meets strict preconditions (email/phone valid, course interest valid, birthdate on `Person` not null, and identity document uploaded). The `LeadApplicationService` calls `AdmissionsApplicationService.createAdmissionFromLead(leadId, tx)` inside a shared Prisma transaction. If successful, the lead stage transitions to `Converted`.

### 3. Service Signatures & Transactions
All mutations in the application services will be wrapped in a Prisma transactional client:
1. Perform business validation (check duplicate inquiries, confirm counselor status, validate stage transition rules).
2. Perform optimistic concurrency checks by matching the entity `version` on update mutations, incrementing it on success.
3. Save the primary entity state.
4. Call downstream contexts synchronously (e.g. Admissions) where required in the transaction.
5. Write to the `OutboxEvent` table using the domain event payload.
6. Record audit details in `AuditLog` (including reveal-PII metadata under zero-PII logging rules).

### 4. Security, PII Masking & Scoping
We will enforce branch-level, counselor-level, and data-privacy constraints:
* **PII Masking by Default:** To comply with Omani Personal Data Protection Law (PDPL), all list and details API responses will return masked emails (`s******i@gmail.com`), phones (`+968 91***567`), and national IDs by default for counselors.
* **PII Reveal Endpoint:** Unmasking requires calling `POST /api/v1/crm/leads/[id]/reveal-pii` with a valid reason. This endpoint checks the `lead.reveal_pii` permission and logs the access event to the `AuditLog` with zero-PII storage (logging metadata only, never the unmasked value).
* **Branch Scoping:** Resolve the branches the user has access to by invoking the `BranchScopeResolver` with `userId` and `activeBranchId`.
* **Counselor Scoping:** If the user lacks the global read permission (`crm.leads.read.all`), restrict queries by filtering on `counselorId = userId`.
* **API Middleware:** Route handlers will use `withPermission` and `withBranchScope` to enforce baseline authentication and branch routing.

---

## Risks / Trade-offs

* **Duplication during Inquiry Promoted to Lead:**
  * *Mitigation:* The `Person` resolution logic queries by exact email or phone number match before inserting a new `Person` record, avoiding duplicate profiles.
* **Optimistic Locking Failures under High Concurrency:**
  * *Mitigation:* Updates verify the `version` column. If a concurrency clash is detected, the transaction rolls back and returns `ERR_CRM_CONCURRENCY_VIOLATION` (HTTP 409), prompting the user to refresh their view.
* **Performance of Scoped Queries:**
  * *Mitigation:* Heavy indexes are created on `branchId`, `counselorId`, `stage`, `status`, and `isDeleted` to ensure efficient query execution.
