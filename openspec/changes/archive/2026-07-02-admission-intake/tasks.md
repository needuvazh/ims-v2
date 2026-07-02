## 1. Database and Persistence Schema

- [x] 1.1 Create a Prisma migration to add `rejectedAt`, `rejectedBy`, `cancelledAt`, and `cancelledBy` to the `Admission` model in `schema.prisma`.
- [x] 1.2 Implement a collision-free sequential numbering-series pattern or database locking reservation service for generating unique `studentNumber` and `admissionNumber` values.

## 2. Core Service Logic and Invariants

- [x] 2.1 Refactor duplicate validation check in `createStudentAdmission` (within `packages/admissions-enrollment/src/application/admission-service.ts`) to validate against `studentProfileId` + resolved `branchId`. Throw `DomainError` with code `ERR_ADM_ACTIVE_ADMISSION_EXISTS` if active.
- [x] 2.2 Add `submitAdmission`, `rejectAdmission` (requires remarks), and `cancelAdmission` methods to `AdmissionService`.
- [x] 2.3 Refactor `approveAdmission` in `AdmissionService` to only accept admissions in the `Submitted` state.
- [x] 2.4 Update transaction scopes to save `AdmissionCreated` (and conditional `StudentProfileCreated`) events in the transactional outbox inside the same database transaction.
- [x] 2.5 Ensure audit log records are written for every status transition (creation, submission, approval, rejection, cancellation).

## 3. API, Routing, and Integration

- [x] 3.1 Update route handler `apps/admin-portal/app/api/v1/crm/leads/[id]/convert/route.ts` to map `ERR_ADM_ACTIVE_ADMISSION_EXISTS` domain error to a structured HTTP 409 response.
- [x] 3.2 Add Next.js API route handlers to expose `/submit`, `/approve`, `/reject`, and `/cancel` actions. Enforce server-side branch scope context on all requests.
- [x] 3.3 Create a query read service for returning detailed admission status, student references, and historical transition timeline.

## 4. UI and Verification

- [x] 4.1 Update admin admissions screen to support submission, rejection (with remarks pop-up), and cancellation.
- [x] 4.2 Update E2E/integration tests to match the sequential workflow (`Draft` -> `Submit` -> `Approve`) and verify duplicate prevention.
