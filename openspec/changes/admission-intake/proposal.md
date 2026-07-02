## Why

Admission intake needs its own validation surface so users can review and submit admissions without mixing the flow with later enrollment actions. Splitting it keeps the admin UI easier to validate and keeps the admission boundary visible.

## What Changes

- **Identity and Branch Scoping:** Center the admission workflow on `studentProfileId` (canonical identity). Enforce branch scoping server-side from the authenticated session context (do not accept `branchId` in the client request body).
- **Draft and Approval Flow:** Restrict `approveAdmission` to ONLY permit transitions from `Submitted` state (direct `Draft` -> `Approved` transitions are blocked). Add explicit `submitAdmission`, `rejectAdmission`, and `cancelAdmission` endpoints.
- **Duplicate Prevention:** Validate duplicate active admissions against `studentProfileId` + resolved `branchId` (rejecting if an active admission exists with status `Draft`, `Submitted`, or `Approved`).
- **Error Mapping:** Map the new duplicate-admission error code `ERR_ADM_ACTIVE_ADMISSION_EXISTS` explicitly in the CRM Lead Conversion API route to avoid surfacing generic 500 errors during lead handoff.
- **Conditional Outbox Events:** Publish `AdmissionCreated` on all draft creations, and `StudentProfileCreated` conditionally only if a new profile is created. Perform all DB operations and outbox event writes inside a single database transaction.
- **Collision-Free Numbering:** Implement a collision-free sequential generation or database reservation pattern for generating unique `studentNumber` and `admissionNumber` values (deprecate date timestamp slicing).
- **Prisma Schema Enhancements:** Add `rejectedAt`, `rejectedBy`, `cancelledAt`, and `cancelledBy` fields to the `Admission` model.

## Capabilities

### New Capabilities

- `admission-intake`: sequential admission draft, review, submit, approve, reject, and cancel workflow.

### Modified Capabilities

- None

## Impact

Affected areas include:
- Prisma database schema (`Admission` model).
- `AdmissionService` application service.
- `AdmissionRepository` database adapters.
- CRM Lead Conversion API route handler (`/api/v1/crm/leads/[id]/convert`).
- Audit logging, Transactional Outbox, and E2E/integration tests.
