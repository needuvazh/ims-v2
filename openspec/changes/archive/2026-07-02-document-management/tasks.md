## 1. Database and Package Setup

- [x] 1.1 Add `Document`, `DocumentOwner`, and `DocumentVerification` models, along with their related enums (`DocumentType`, `DocumentStatus`, `OwnerType`, `VerificationOutcome`), to `packages/database/prisma/schema.prisma`.
- [x] 1.2 Run Prisma migration command to apply changes and create tables in PostgreSQL.
- [x] 1.3 Create the `packages/documents` package stub and define public contract interfaces:
  - `IDocumentsService` for document registration, status queries, and verification management.
  - `IDocumentRepository` for querying and mutating documents.

## 2. Lead-Conversion Input Redesign & Handoff Idempotency

- [x] 2.1 Update `ConvertLeadSchema` in `packages/crm-leads/src/domain/lead.ts` and the convert route handler (`apps/admin-portal/app/api/v1/crm/leads/[id]/convert/route.ts`) to validate the new structured document DTO (containing fileName, fileKey, fileType, documentType) instead of raw URL strings.
- [x] 2.2 Refactor `LeadService.convertLead` to invoke the Documents context to register uploaded documents against the lead's `personId` (as `OwnerType.Person` and with the Lead's `branchId`) within the interactive database transaction.
- [x] 2.3 Refactor `AdmissionRepository.createStudentProfileAndAdmission` and `AdmissionService.createStudentAdmission` to implement idempotent creation: if a `Person` and `StudentProfile` already exist for the given contact identity (email or mobile), reuse those existing records and link them to the new `Admission` record instead of throwing duplicate profile errors.

## 3. Branch Scoping and Verification Gate Implementation

- [x] 3.1 Implement branch-scoped authorization checks in the Documents context by validating the user's `UserBranchAccess` against the `branchId` persisted on the `Document` record.
- [x] 3.2 Implement `RequirementsResolver` inside the admissions package to determine the required document types for an enrollment (Course Catalog rules override Branch default requirements).
- [x] 3.3 Add the document verification gate in `AdmissionService` (for Admission Approval) and `EnrollmentService` (for Enrollment Confirmation) that checks the resolved requirements and ensures that matching documents have status `Active` and verification outcome `Verified`.

## 4. Tests and Verification

- [x] 4.1 Update CRM lead conversion tests in `lead-service.test.ts` to mock and assert structured document registration.
- [x] 4.2 Update lead conversion orchestrator tests in `lead-conversion-orchestrator.test.ts` to verify idempotency when a `StudentProfile` and `Person` already exist.
- [x] 4.3 Add unit tests for `RequirementsResolver` and the verification gates, asserting correct resolution precedence (Course vs Branch) and blocking/permitting behaviors.
- [x] 4.4 Add integration tests for branch-scoped document retrieval and upload.
- [x] 4.5 Run typechecks, relevant test suites, and lint rules to verify correctness.
