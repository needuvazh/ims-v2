## Why

The ASTI Integrated Institute Management System (IMS) requires a secure, auditable, and verifiable credentialing process at the end of the learner's journey. Currently, the database schema and application lack the entities and logic to generate, issue, verify, reissue, or revoke certificates. Implementing Module 11 – Certificate Management will eliminate manual certificate processing, guarantee certificate uniqueness, enable third-party verifiers to check credential authenticity dynamically, and maintain complete lifecycle auditability, all while strictly adhering to Domain-Driven Design (DDD) boundaries and server-side branch isolation.

## What Changes

We will implement the complete Certificate Management module:

1. **Prisma Schema Update**: Add new database entities `Certificate`, `CertificateVerification`, and `CertificateReissueRequest` with their associated relations and indexes. Update `Enrollment` to have a `1:N` relation to `Certificate`, and edit `User` to track certificate operations.
2. **Domain Package**: Build `packages/certificates` to encapsulate the business logic, validators (Zod), DTOs, repository interfaces, and application services (`GenerateCertificate`, `IssueCertificate`, `VerifyCertificate`, `ApproveReissue`, `RevokeCertificate`).
3. **Admin Portal UI**: Add dashboard widgets, a certificate readiness queue, a certificate registry search and detail viewer, a reissue request queue, and a revocation interface.
4. **Public Verification**: Build public routes for verifying certificates by opaque verification code or QR code target without requiring authentication and without leaking student PII.
5. **Cross-Context Integrations**: Invoke Audit & Compliance for sensitive operations, request notifications from Communication & Notification, and fetch configuration pricing/numbering constraints.

## Capabilities

### New Capabilities

- `certificate-issuance`: View eligible enrollments, generate, and issue certificates using the single hardcoded ASTI template.
- `certificate-reissue`: Request, review, approve/reject, and generate replacement certificates with parent-child linkage.
- `certificate-verification`: Publicly verify certificate authenticity using an opaque code or QR scan with rate-limiting and privacy minimization.
- `certificate-revocation`: Revoke certificates with a mandatory reason, updating the status and preserving history.

### Modified Capabilities

- `admission-enrollment`: Enrollment aggregate will include references to the newly created certificates, and its summary status will react to certificate issuance.

## Impact

- **Database**: Add `certificates`, `certificate_verifications`, and `certificate_reissue_requests` tables to PostgreSQL via Prisma.
- **Backend API**: Implement `/api/v1/certificates/*` (internal) and `/api/public/v1/certificates/*` (public) endpoints.
- **Frontend UI**: Create Admin Portal views for certificate operators and public verifiers.
- **Audit**: Log all generation, issuance, reissue decisions, and revocations.
- **Communications**: Dispatch templates for newly issued or reissued certificates.
