## 1. Database Schema & Persistence

- [x] 1.1 Add `Certificate`, `CertificateVerification`, and `CertificateReissueRequest` models to `packages/database/prisma/schema.prisma`.
- [x] 1.2 Add the `certificates Certificate[]` relation to the `Enrollment` model in `schema.prisma`.
- [x] 1.3 Add relation mappings for `issuedCertificates`, `reissueRequestsRequested`, and `reissueRequestsApproved` to the `User` model in `schema.prisma`.
- [x] 1.4 Generate the Prisma migration via `pnpm --filter database prisma migrate dev --name add_certificate_models --create-only`.
- [x] 1.5 Add a custom SQL statement in the generated migration file to create the partial unique index:
      `CREATE UNIQUE INDEX certificates_active_enrollment_idx ON certificates (enrollment_id) WHERE certificate_status IN ('Generated', 'Issued');`.
- [x] 1.6 Run the migration via `pnpm --filter database prisma migrate dev` and verify that client generation succeeds.

## 2. Scaffolding Domain Package

- [x] 2.1 Create the package structure under `packages/certificates/` (src/domain, src/application, src/ports, src/infrastructure).
- [x] 2.2 Define Zod validation schemas for all requests, commands, and public inputs in `src/domain/validators.ts`.
- [x] 2.3 Declare domain error types and status code mappings in `src/domain/errors.ts`.
- [x] 2.4 Declare repository interfaces and service port contracts in `src/ports/`.

## 3. Application Services & Business Logic

- [x] 3.1 Implement `GenerateCertificateService` (verifies completion & payment gates, allocates certificate number, renders PDF, commits to database).
- [x] 3.2 Implement `IssueCertificateService` (moves status to Issued, sets issuedDate and issuedBy, triggers notification and audit logs).
- [x] 3.3 Implement `ReissueService` (submits reissue request, reviews/approves requests, generates replacement certificate with lineage).
- [x] 3.4 Implement `RevocationService` (updates status to Revoked, records revokedAt/revokedBy/revocationReason, audits transition).
- [x] 3.5 Implement `VerificationService` (executes rate-limited unauthenticated verify checks by code or QR, logs verification attempts).

## 4. API Route Handlers & Server Actions

- [x] 4.1 Build internal routes under `apps/admin-portal/app/api/v1/certificates/` with dynamic permissions and server-side branch scope.
- [x] 4.2 Build public verification routes under `apps/admin-portal/app/api/public/v1/certificates/` with rate-limiting.
- [x] 4.3 Implement Next.js Server Actions for operations (generate, issue, reissue, revoke) invoking the same application service invariants.

## 5. Admin UI Screens

- [x] 5.1 Add operational metrics to the Certificate Dashboard (`SCR-CERT-A01`).
- [x] 5.2 Build the Certificate Readiness Queue (`SCR-CERT-A02`) with filter tools and blocker tags.
- [x] 5.3 Implement the Certificate Registry (`SCR-CERT-A06`) with search, filter, and download buttons.
- [x] 5.4 Build the Reissue Request worklist (`SCR-CERT-A10`) and approval details dialog.
- [x] 5.5 Create the Revocation dialog (`SCR-CERT-A13`) with mandatory reason input.

## 6. Automated Testing

- [x] 6.1 Write domain unit tests verifying invariants (duplicate blocks, status transitions).
- [x] 6.2 Write integration tests checking transactional outbox emissions and numbering allocation.
- [x] 6.3 Write API contract tests verifying permission guards, branch scope enforcement, and input validations.
- [x] 6.4 Write BDD/E2E Playwright tests verifying the end-to-end flow from completion to certificate download, and validating public verification privacy controls.

## 7. Observability, Documentation, and Rollout

- [x] 7.1 Set up structured logs capturing Request ID, user ID, and certificate operations.
- [x] 7.2 Update the project status document at `docs/project-status.md` to reflect Module 11 completion.
