## 1. Database Persistence Layer

- [x] 1.1 Update `packages/database/prisma/schema.prisma` to include auditing columns (`deletedAt`, `deletedBy`, `isDeleted`) on the `LeadFollowUp` model.
- [x] 1.2 Update the `Lead` model to include `status RecordStatus @default(Active)` field.
- [x] 1.3 Add performance indexes on:
  - `leads`: index on `branchId`, `counselorId`, `stage`, `personId`.
  - `lead_follow_ups`: index on `leadId`, `counselorId`, `status`.
- [x] 1.4 Generate and apply the Prisma migration:
  ```bash
  npx prisma migrate dev --name init_crm_models
  ```
- [x] 1.5 Regenerate Prisma client.

## 2. Core CRM Domain & Repositories

- [x] 2.1 Update Zod models, DTOs, and request validation contracts in `packages/crm-leads/src/domain/lead.ts` (including `lostReasonCode` validation refine check for Lost leads).
- [x] 2.2 Define repository interfaces in `packages/crm-leads/src/domain/repositories.ts` for `IInquiryRepository`, `ILeadRepository`, and `IFollowUpRepository`.
- [x] 2.3 Implement Prisma repositories under `packages/database/src/repositories/` or `packages/crm-leads/src/infrastructure/`:
  - `PrismaInquiryRepository`
  - `PrismaLeadRepository`
  - `PrismaFollowUpRepository`
- [x] 2.4 Export new repositories from the `@ims/database` package index.

## 3. CRM Application Services
- [x] 3.1 Implement `InquiryApplicationService` inside `packages/crm-leads/src/application/inquiry-service.ts` with `captureInquiry` (including duplicate checks), `promoteToLead` (handling `Person` creation), and `rejectInquiry`.
- [x] 3.2 Implement `LeadApplicationService` inside `packages/crm-leads/src/application/lead-service.ts` with `createLead`, `updateLead`, `assignCounselor`, `updateStage`, and `deleteLead`.
- [x] 3.3 Implement `FollowUpApplicationService` inside `packages/crm-leads/src/application/followup-service.ts` with `scheduleFollowUp`, `recordOutcome`, and `cancelFollowUp`.
- [x] 3.4 Ensure transactional boundaries are preserved using database transactions, and register domain events in `OutboxEvent` table along with audit logging.
- [x] 3.5 Export all service classes and interfaces from `packages/crm-leads/src/index.ts`.

## 4. Delivery Layer (Next.js APIs)

- [x] 4.1 Register repositories and application services in `apps/admin-portal/app/lib/runtime.ts`.
- [x] 4.2 Create Next.js API route handlers under the versioned `apps/admin-portal/app/api/v1/crm/...` directory structure:
  - `/api/v1/crm/inquiries/route.ts` (POST and GET with branch/counselor filtering, applying PII masking).
  - `/api/v1/crm/inquiries/[id]/qualify/route.ts` (POST to qualify/promote inquiry).
  - `/api/v1/crm/leads/route.ts` (POST and GET with branch/counselor filtering, applying PII masking).
  - `/api/v1/crm/leads/[id]/route.ts` (GET detail with PII masking, PATCH update, DELETE soft-delete).
  - `/api/v1/crm/leads/[id]/stage/route.ts` (PATCH to change lead stage with concurrency version).
  - `/api/v1/crm/leads/[id]/assign/route.ts` (PATCH to assign counselor).
  - `/api/v1/crm/leads/[id]/lost/route.ts` (POST to mark lost and cancel open follow-ups).
  - `/api/v1/crm/leads/[id]/convert/route.ts` (POST to trigger admissions handoff).
  - `/api/v1/crm/leads/[id]/reveal-pii/route.ts` (POST audited reveal request, checking permissions and writing zero-PII metadata to `AuditLog`).
  - `/api/v1/crm/leads/[id]/follow-ups/route.ts` (POST to schedule follow-up).
  - `/api/v1/crm/leads/follow-ups/[id]/route.ts` (PATCH to log outcomes and schedule next).

## 5. Testing & Verification

- [x] 5.1 Write unit tests in `packages/crm-leads` for phone number normalization, duplicate Person reuse logic, optimistic locking concurrency, and Won/Lost stage invariants.
- [x] 5.2 Write integration tests for API handlers checking branch scoping logic, default PII masking in responses, and reveal-PII audit trail updates.
- [x] 5.3 Verify types, format, and lint across the monorepo:
  ```bash
  pnpm run build && pnpm run typecheck && pnpm run lint
  ```
