## Why

Currently, the Institute Management System (IMS) lacks unified core models, database structures, and base APIs for capturing inquiries, qualifying leads, and coordinating outreach follow-ups. Establishing a robust **Lead, Enquiry & CRM Management** bounded context is essential to support the coaching and skill training operations of Al Saud Training Institute (ASTI). Implementing this foundation enables tracking of prospects from initial contact to admission, enforces branch-scoped data isolation, allows counselor-specific lead routing, and provides a transactional outbox framework for domain events.

## What Changes

This change introduces the foundational database schema additions, core domain application services, Zod API request validations, and thin API route handlers for the CRM module. Specifically:
1. **Prisma Models:** Defines and seeds `Inquiry`, `Lead`, and `LeadFollowUp` (stored in DB as `lead_follow_ups`) database structures, complete with IMS audit columns (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`, `isDeleted`, `status`). Enforces `status RecordStatus @default(Active)` on `Lead` to track record states distinctly from pipeline stages.
2. **CRM Application Services:** Implement isolated domain logic within `packages/crm-leads` for capturing/promoting/rejecting inquiries, managing lead stages, assignments, and follow-ups. Integrates optimistic concurrency locking on leads.
3. **API Controllers:** Set up Next.js route handlers in `apps/admin-portal` under the correct versioned `/api/v1/crm/...` namespace. Enforces default PII data masking (for email, phone, and national ID) and provides an audited `/reveal-pii` endpoint.
4. **Outbox Events:** Publish transactional domain events including `WebsiteInquirySubmitted`, `InquiryCreated`, `InquiryQualified`, `LeadCreated`, `LeadAssigned`, `FollowUpScheduled`, `FollowUpCompleted`, `LeadWon`, and `LeadConvertedToAdmission`.
5. **Decoupled Admissions Handoff:** Synchronously call the Admissions context inside a shared database transaction when a lead is marked `Won` to perform registration validation and stage conversion.

## Capabilities

### New Capabilities
- `crm-core-models-apis`: Versioned database schemas, domain services, Zod validators, domain events, and CRUD API endpoints under `/api/v1/crm/...` for managing Inquiries, Leads, and Follow-ups with branch-scoped/counselor-scoped isolation, default PII masking, and transactional admissions handoff.

### Modified Capabilities
*(None. This is the initial foundation of the CRM module).*

## Impact

* **Bounded Context:** Core owner is **Lead, Enquiry & CRM Management**. Under the Party-based identity model, it checks for existing email or phone numbers to reuse the `Person` aggregate when creating leads or promoting inquiries to prevent unique mobile key collisions.
* **Database & Migrations:** Creates `inquiries`, `leads`, and `lead_follow_ups` tables. Adds indexes on `branchId`, `counselorId`, `stage`, `status`, `personId` (on leads), and composite index `(counselorId, status)` (on follow-ups).
* **Authorization & Branch Scope:**
  * Endpoint protection via `withPermission` and `withBranchScope` middleware.
  * Counselor access scoping: default read/write access is restricted to leads assigned to the active counselor. Users with the `crm.leads.read.all` permission can access all branch-wide leads.
  * PII Reveal endpoint requires the explicit `lead.reveal_pii` permission and logs the access reason.
* **Audit Impact:** Transactional changes register structured logs in the `AuditLog` table. Unmasking requests log metadata (without printing raw PII values) for Omani compliance (PDPL).
* **Outbox / Event Impact:** Writes to the `OutboxEvent` table inside database transactions, to be picked up by the asynchronous worker process.
* **Non-Goals:** Automated lead distribution rules, online payment gateways, SaaS tenancy configurations, CMS integrations, and AI-based lead scoring are excluded.
