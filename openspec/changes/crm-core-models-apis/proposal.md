## Why

Currently, the Institute Management System (IMS) lacks unified core models, database structures, and base APIs for capturing inquiries, qualifying leads, and coordinating outreach follow-ups. Establishing a robust **Lead, Enquiry & CRM Management** bounded context is essential to support the coaching and skill training operations of Al Saud Training Institute (ASTI). Implementing this foundation enables tracking of prospects from initial contact to admission, enforces branch-scoped data isolation, allows counselor-specific lead routing, and provides a transactional outbox framework for domain events.

## What Changes

This change introduces the foundational database schema additions, core domain application services, Zod API request validations, and thin API route handlers for the CRM module. Specifically:
1. **Prisma Models:** Defines and seeds `Inquiry`, `Lead`, and `LeadFollowUp` (stored in DB as `lead_follow_ups`) database structures, complete with IMS audit columns (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`, `isDeleted`, `status`).
2. **CRM Application Services:** Implement isolated domain logic within `packages/crm-leads` for capturing/promoting/rejecting inquiries, managing lead stages and assignments, scheduling follow-ups, and recording outreach outcomes.
3. **API Controllers:** Set up Next.js route handlers in `apps/admin-portal` that perform strict Zod validation, enforce branch-scoped and counselor-scoped authorization constraints, and delegate to the core services.
4. **Outbox Events:** Publish transactional domain events like `WebsiteInquirySubmitted`, `LeadCreated`, `LeadAssigned`, `FollowUpScheduled`, `LeadConverted`, and `LeadLost`.

## Capabilities

### New Capabilities
- `crm-core-models-apis`: Core database schemas, domain services, Zod validators, domain events, and CRUD API endpoints for managing Inquiries, Leads, and Follow-ups with branch-scoped and counselor-scoped isolation.

### Modified Capabilities
*(None. This is the initial foundation of the CRM module).*

## Impact

* **Bounded Context:** Core owner is **Lead, Enquiry & CRM Management**. Under the Party-based identity model, it creates/resolves a `Person` profile under the generic **Identity & Access Management** / shared kernels when qualifying leads.
* **Database & Migrations:** Creates `inquiries`, `leads`, and `lead_follow_ups` tables. Sets up foreign keys to `branches` and `users` (acting as Counselors). Adds appropriate performance indexes on `branchId`, `counselorId`, `stage`, and `status`.
* **Authorization & Branch Scope:**
  * Endpoint protection via `withPermission` and `withBranchScope` middleware.
  * Counselor access scoping: default read/write access is restricted to leads assigned to the active counselor. Users with the `crm.leads.read.all` permission can access all branch-wide leads.
* **Audit Impact:** Transactional changes register structured logs via `AuditLogRepository` in the `AuditLog` table.
* **Outbox / Event Impact:** Writes to the `OutboxEvent` table inside database transactions, to be picked up by the asynchronous worker process.
* **Non-Goals:** Full automated lead distribution rules, online payment gateways, SaaS tenancy configurations, CMS integrations, and AI-based lead scoring are excluded.
