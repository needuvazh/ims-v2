# Module 11 - Certificate Management

## 1. Document Purpose

This document defines the functional scope and baseline requirements for **Module 11 – Certificate Management** in the ASTI Integrated Institute Management System (IMS).

The module manages the controlled lifecycle of training certificates after a learner has satisfied completion eligibility and, where configured, payment validation. It provides certificate generation, issuance, bilingual output selection, unique certificate numbering, QR-based public verification, controlled reissue, revocation, auditability, and downstream reporting/notification integration.

This module is intentionally bounded by DDD ownership rules:

- **Certificate Management owns** `Certificate`, certificate issuance lifecycle, verification code, certificate artifact reference, verification history, reissue request lifecycle, and revocation state.
- **Exam, Result & Completion Management owns** completion evaluation and approval. Certificate Management must consume approved eligibility and must not recompute attendance, examination, or approval rules.
- **Fee, Billing & Receivables Management owns** invoice/payment truth. Certificate Management may require a positive payment validation decision but must not calculate balances or mutate finance records.
- **Admission & Enrollment Management owns** `Enrollment` and learner-course-batch association. Every certificate must resolve to one valid enrollment.
- **Configuration / Master Data owns** certificate numbering series configuration.
- **Identity & Access Management owns** users, permissions, and branch access.
- **Audit & Compliance owns** cross-domain audit records and approval history.
- **Communication & Notification Management owns** certificate delivery notifications and message history.
- **Reporting & Executive Dashboards owns** reporting read models, dashboards, and KPI presentation.

---

## 2. Purpose and Objective

### 2.1 Purpose

Provide a secure, traceable, branch-isolated, and verifiable certificate lifecycle for ASTI learners without duplicating enrollment, completion, finance, person, or authorization data.

### 2.2 Objectives

1. Issue a certificate only for a valid enrollment that has approved completion eligibility and any required payment validation.
2. Prevent duplicate active certificate issuance for the same enrollment.
3. Generate a unique certificate number using the configured numbering series.
4. Generate a unique public verification code and QR code reference for each certificate.
5. Produce certificate artifacts using the single approved hardcoded template in the current version.
6. Support English or Arabic certificate language selection where required by business policy.
7. Allow public verification without exposing unnecessary learner PII.
8. Support controlled certificate reissue with management approval and traceability from old certificate to replacement certificate.
9. Support certificate revocation without deleting historical records.
10. Enforce dynamic permissions and server-side branch isolation for all internal operations.
11. Record sensitive lifecycle actions in immutable audit records.
12. Provide stable integration points for completion, finance validation, notification, reporting, and audit contexts inside the modular monolith.

---

## 3. Business Goals

| ID | Business Goal | Success Intent |
|---|---|---|
| BO-CERT-001 | Eliminate unauthorized certificate issuance | Every issued certificate must be backed by approved completion eligibility and payment validation where required. |
| BO-CERT-002 | Guarantee certificate uniqueness | Certificate number and verification code must be unique; one enrollment must not have more than one active issued certificate. |
| BO-CERT-003 | Enable trustworthy public verification | External verifiers can validate certificate status using the verification code or QR entry point without authentication. |
| BO-CERT-004 | Reduce manual certificate handling | Authorized users can generate and issue certificates from approved eligible enrollments using controlled system workflows. |
| BO-CERT-005 | Maintain complete lifecycle traceability | Issue, reissue, revoke, verify, and status-change actions remain traceable through certificate records, reissue records, verification records, and audit logs. |
| BO-CERT-006 | Preserve DDD ownership boundaries | Certificate Management consumes enrollment, completion, finance, IAM, and numbering data without taking ownership of those records. |
| BO-CERT-007 | Support bilingual institute operations | Certificates can be generated in English or Arabic where required, using the approved current template strategy. |
| BO-CERT-008 | Protect branch-confidential operational data | Internal certificate searches and actions are restricted to the user's effective branch access scope. |
| BO-CERT-009 | Standardize replacement handling | Reissue requests require a reason, management approval, and linkage from the original certificate to the replacement. |
| BO-CERT-010 | Preserve historical integrity | Certificate records are never hard-deleted; invalidation is represented by controlled status changes and audit history. |
| BO-CERT-011 | Improve service responsiveness | Certificate retrieval and public verification are designed for predictable interactive response times. |
| BO-CERT-012 | Enable operational visibility | Certificate issuance, reissue, verification, and revocation data can be consumed by reporting read models without transferring transaction ownership. |

---

## 4. Scope

### 4.1 Included Scope

- View certificate eligibility supplied by the Exam, Result & Completion context.
- Request payment validation from Finance when the enrollment requires it.
- Generate a certificate for an eligible enrollment.
- Generate certificate number through the configured numbering series.
- Persist certificate language selection.
- Generate and persist a globally unique public verification code.
- Generate a QR code target/reference for public verification.
- Produce and store the certificate artifact URL/reference.
- Issue the certificate and record issuer and issue date.
- Search, filter, view, and download certificates within branch authorization scope.
- Public certificate verification by verification code or QR entry point.
- Persist verification attempts as `CertificateVerification` records in accordance with retention policy.
- Submit certificate reissue requests with mandatory reason.
- Review, approve, or reject reissue requests according to permission and approval rules.
- Generate replacement certificate after approved reissue request.
- Link original reissue request to `newCertificateId`.
- Revoke certificates through a controlled permission-protected status transition.
- Prevent issuance or reissue when invariants are violated.
- Soft-delete conventions for administrative retirement where supported by the repository; no business-history hard delete.
- Audit sensitive actions and state transitions.
- Integrate with Communication for certificate notification requests.
- Expose certificate data to Reporting through read-only reporting contracts/read models.

### 4.2 Excluded Scope

- Completion rule definition; owned by Course Catalog Management.
- Attendance percentage calculation; owned by Attendance Management and consumed by Completion.
- Exam marking, grading, result recording, and pass/fail evaluation; owned by Exam, Result & Completion Management.
- Completion approval workflow execution; owned by Exam, Result & Completion Management and Audit & Compliance for approval history.
- Invoice generation, payment posting, receivable calculation, refunding, and payment allocation; owned by Finance & Receivables.
- Student/person master data mutation; owned by Admission & Enrollment and shared Party/Person model owners.
- Course, batch, and branch master maintenance.
- User, role, permission, or branch-access administration.
- Configurable certificate template designer or multi-template template management in the current version.
- Certificate template authoring from the configuration workbook; future capability only.
- Physical printing logistics, courier tracking, or inventory of stationery.
- Digital-signature PKI or qualified electronic signature service unless introduced by a separate approved architecture decision.
- Blockchain credentialing.
- Microservice extraction, external broker, CQRS, or event sourcing.

---

## 5. Stakeholders and Actors

### 5.1 Human Actors

| Actor | Type | Responsibilities in This Module |
|---|---|---|
| Certificate Administrator | Internal | Review eligible enrollments, generate certificates, issue, search, view, and download. |
| Academic Coordinator | Internal | Operational review of completion outcome in upstream context; may view certificate readiness and certificate state if permitted. |
| Branch Manager | Internal | Final upstream completion approval; may approve reissue or revoke certificates when granted explicit permissions. |
| Institute Administrator | Internal | Cross-branch certificate operations when consolidated/branch access permits. |
| Audit/Compliance Officer | Internal | Review audit trail, lifecycle events, reissue approvals, and revocations. |
| Finance Officer | Internal | Owns payment records and validation decisions; may inspect certificate blockers but cannot issue certificates unless separately authorized. |
| Student / Learner | External | Receives certificate artifact or link and can present verification code/QR to third parties. |
| Corporate Coordinator / Client Contact | External | May receive or consume certificate status through future/existing corporate portal integrations; no ownership of certificate transaction. |
| Public Verifier | External | Verifies authenticity/status through public verification using verification code or QR. |

### 5.2 System Actors

| System Actor | Owning Context | Interaction |
|---|---|---|
| Enrollment Aggregate | Admission & Enrollment | Supplies enrollment identity, learner linkage, course, batch, branch, payment-validation-required flag, completion/certificate summary states. |
| CourseCompletion | Exam, Result & Completion | Supplies approved completion eligibility; certificate context must not recompute it. |
| Finance Validation Service/Application Contract | Finance & Receivables | Supplies payment validation result where required. |
| NumberingSeries | Configuration / Master Data | Allocates the next certificate number according to configured series and branch rules. |
| IAM Authorization Guard | Identity & Access | Enforces permission and server-side branch scope. |
| Audit Recorder | Audit & Compliance | Records critical lifecycle actions and changes. |
| Notification Request Handler | Communication & Notification | Receives certificate-notification requests and owns delivery history. |
| Reporting Read Model Builder | Reporting & Dashboards | Consumes certificate facts for reports and KPIs without mutating certificate transactions. |
| Storage Adapter | Infrastructure | Stores generated certificate artifacts and returns durable references/URLs. |

---

## 6. Functional Overview

```text
Certificate Management
├── Eligibility Intake
│   ├── Consume approved completion eligibility
│   ├── Resolve enrollment context
│   ├── Check payment-validation requirement
│   └── Obtain payment validation result when required
├── Certificate Generation
│   ├── Validate single-certificate invariant
│   ├── Allocate certificate number
│   ├── Select language (English / Arabic)
│   ├── Render approved hardcoded template
│   ├── Generate verification code
│   ├── Generate QR verification target
│   └── Persist certificate artifact reference
├── Certificate Issuance
│   ├── Issue certificate
│   ├── Record issuer and issue date
│   ├── Update certificate status
│   ├── Emit internal domain event
│   ├── Record audit event
│   └── Request notification
├── Certificate Registry
│   ├── Search certificates
│   ├── Filter by branch/course/batch/status/date/language
│   ├── View certificate details
│   └── Download certificate artifact
├── Public Verification
│   ├── Verify by verification code
│   ├── Verify by QR target
│   ├── Return minimal verification result
│   └── Record verification attempt
├── Reissue Management
│   ├── Submit reissue request
│   ├── Review request
│   ├── Approve / reject
│   ├── Generate replacement certificate
│   ├── Link replacement to request
│   └── Audit all actions
└── Revocation Management
    ├── Validate revoke permission
    ├── Require reason
    ├── Change certificate status
    ├── Preserve artifact/history
    ├── Publicly expose revoked status
    └── Audit state change
```

---

## 7. Business Capabilities and User Types

| Capability | Internal Users | External Users | Notes |
|---|---|---|---|
| View certificate-ready enrollments | Certificate Admin, Branch Manager, Academic Coordinator | None | Source eligibility remains owned by Completion. |
| Generate certificate | Certificate Admin | None | Permission and branch guarded. |
| Issue certificate | Certificate Admin, authorized manager | None | Separate permission from generation recommended. |
| Search certificate registry | Authorized operational users | None | Branch scoped. |
| View/download certificate | Authorized internal users | Student/authorized corporate consumer through separate portal contract | Public verifier receives only minimal verification data. |
| Verify certificate | Internal users | Public verifier, student, employer, corporate client | Authentication not required for public endpoint; rate limiting required. |
| Request reissue | Authorized internal user; future portal user if introduced | Student through assisted/future workflow | Current ER model stores `requestedBy`; actor must map to authorized identity/application contract. |
| Approve/reject reissue | Management approver | None | Approval permission required. |
| Revoke certificate | Explicitly authorized management user | None | Sensitive action with mandatory audit. |
| View audit trail | Audit/Compliance, authorized management | None | Audit data owned by Audit & Compliance. |
| Certificate reporting | Authorized reporting users | None | Reporting owns report definitions/read models. |

---

## 8. Functional Requirements Checklist

Module code: **CERT**

| Requirement ID | Requirement | Priority |
|---|---|---|
| FR-CERT-001 | List certificate-ready enrollments from approved completion outcomes. | Must |
| FR-CERT-002 | Resolve enrollment, student, course, batch, and branch display data without taking ownership of those records. | Must |
| FR-CERT-003 | Validate approved completion eligibility before certificate generation. | Must |
| FR-CERT-004 | Validate payment completion when the enrollment/course configuration requires payment validation. | Must |
| FR-CERT-005 | Prevent duplicate active certificate issuance for the same enrollment. | Must |
| FR-CERT-006 | Allocate a unique certificate number using `NumberingSeries`. | Must |
| FR-CERT-007 | Generate a unique certificate verification code. | Must |
| FR-CERT-008 | Generate a QR code reference/target linked to the public verification route. | Must |
| FR-CERT-009 | Render certificate using the single approved hardcoded template. | Must |
| FR-CERT-010 | Generate certificate in selected supported language, English or Arabic. | Must |
| FR-CERT-011 | Persist certificate metadata and artifact URL/reference. | Must |
| FR-CERT-012 | Issue a generated certificate and record issue date and issuing user. | Must |
| FR-CERT-013 | Maintain certificate lifecycle status without hard deletion. | Must |
| FR-CERT-014 | Search and filter the internal certificate registry. | Must |
| FR-CERT-015 | View certificate details with source enrollment and eligibility references. | Must |
| FR-CERT-016 | Download/view the generated certificate artifact subject to authorization. | Must |
| FR-CERT-017 | Verify a certificate publicly using verification code. | Must |
| FR-CERT-018 | Verify a certificate publicly through QR-target lookup. | Must |
| FR-CERT-019 | Return minimal, non-sensitive public verification results. | Must |
| FR-CERT-020 | Record public verification attempts in `CertificateVerification`. | Should |
| FR-CERT-021 | Submit a certificate reissue request with mandatory reason. | Must |
| FR-CERT-022 | List and review reissue requests within authorized scope. | Must |
| FR-CERT-023 | Approve a certificate reissue request through management authorization. | Must |
| FR-CERT-024 | Reject a certificate reissue request with remarks/reason. | Must |
| FR-CERT-025 | Generate a replacement certificate only from an approved reissue request. | Must |
| FR-CERT-026 | Link the reissue request to the replacement certificate through `newCertificateId`. | Must |
| FR-CERT-027 | Preserve the original certificate and replacement traceability. | Must |
| FR-CERT-028 | Revoke a certificate using a protected state transition and mandatory reason. | Must |
| FR-CERT-029 | Expose revoked status through public verification. | Must |
| FR-CERT-030 | Record sensitive actions and state changes in the audit subsystem. | Must |
| FR-CERT-031 | Enforce server-side permission checks for every internal action. | Must |
| FR-CERT-032 | Enforce server-side branch scope on all internal certificate queries and commands. | Must |
| FR-CERT-033 | Support parent/child branch visibility only as allowed by IAM branch-access rules. | Must |
| FR-CERT-034 | Request certificate-issued communication through Communication context rather than storing delivery history locally. | Should |
| FR-CERT-035 | Publish/raise in-process domain events for issuance, reissue, verification, and other modeled lifecycle actions. | Should |
| FR-CERT-036 | Expose certificate facts to reporting read models without allowing reporting to mutate certificate transactions. | Should |
| FR-CERT-037 | Use optimistic concurrency/version checks for conflicting lifecycle mutations where repository conventions support versioning. | Should |
| FR-CERT-038 | Provide idempotent protection for repeated generate/issue commands. | Must |
| FR-CERT-039 | Validate referenced certificate, enrollment, and source decision state at command execution time. | Must |
| FR-CERT-040 | Retain certificate and reissue records according to soft-delete/audit conventions. | Must |

---

## 9. Permission Model Overview

Permissions must be dynamically assigned through IAM. Role names must not be hardcoded in domain logic.

Recommended permission codes for the module:

| Permission Code | Purpose | Branch Scope Required |
|---|---|---|
| `certificate.read` | View internal certificate registry and details. | Yes |
| `certificate.generate` | Generate certificate from eligible enrollment. | Yes |
| `certificate.issue` | Issue generated certificate. | Yes |
| `certificate.download` | Download internal certificate artifact. | Yes |
| `certificate.verify.internal` | Use internal verification/detail view. | Yes |
| `certificate.reissue.request` | Submit reissue request. | Yes |
| `certificate.reissue.read` | View reissue requests. | Yes |
| `certificate.reissue.approve` | Approve/reject reissue request. | Yes |
| `certificate.reissue.generate` | Generate replacement from approved request. | Yes |
| `certificate.revoke` | Revoke an issued certificate. | Yes |
| `certificate.audit.read` | View certificate-related audit timeline. | Yes or consolidated as configured |
| `certificate.report.read` | Access certificate operational reports. | Yes |
| `certificate.report.export` | Export permitted certificate reports. | Yes |

Authorization principles:

1. Permission checks are enforced server-side on commands and queries.
2. UI visibility is convenience only and never substitutes for server authorization.
3. Branch access is derived from `UserBranchAccess`, not request payload trust.
4. Users with multiple branches may query only the union of branches explicitly allowed by IAM rules.
5. Parent-to-child visibility is permitted only when `canViewChildBranches` applies.
6. Consolidated views require `canViewConsolidated` plus the relevant functional permission.
7. Public verification endpoints do not require internal permissions but must return a reduced response and be protected by abuse controls.

---

## 10. Security and Audit Requirements Summary

### 10.1 Security

- Enforce authenticated sessions for all internal certificate functions.
- Enforce dynamic RBAC permissions on every command/query.
- Enforce branch scope in repository/application query predicates.
- Never trust client-supplied `branchId` as authorization evidence.
- Prevent direct object reference attacks by checking both permission and branch scope for certificate IDs and reissue IDs.
- Use cryptographically strong, non-sequential verification codes with uniqueness constraints.
- QR code must encode an opaque verification route/code and not embed civil ID, passport number, phone, email, or unnecessary PII.
- Public verification must reveal only the minimum approved data set: certificate validity/status, certificate number, learner display name according to public-verification policy, course name, issue date, and optionally batch/reference data approved for public display.
- Apply rate limiting and abuse monitoring to public verification.
- Protect certificate artifact storage through repository-approved access controls; public verification must not automatically expose unrestricted storage paths unless explicitly intended.
- Validate artifact generation inputs and escape localized text to prevent template injection.
- Use transactional consistency for certificate row creation plus uniqueness-sensitive number/code allocation according to repository/database capabilities.
- Treat reissue approval and revocation as sensitive operations requiring reason and audit.

### 10.2 Audit

Audit records must be produced for at least:

- Certificate generation request accepted/rejected for business-rule reason.
- Certificate generated.
- Certificate issued.
- Certificate status changed.
- Reissue request created.
- Reissue request approved.
- Reissue request rejected.
- Replacement certificate generated/issued.
- Certificate revoked.
- Privileged download when required by compliance policy.
- Permission/branch-related denied operations should be security logged without leaking protected details.

Audit data must capture actor, entity type, entity ID, action, old value, new value, timestamp, IP address where available, and reason where applicable, consistent with `AuditLog` ownership.

---

## 11. Non-Functional Requirements Summary

| NFR Area | Target / Requirement |
|---|---|
| Availability | Internal certificate operations target 99.9% monthly service availability excluding approved maintenance; public verification should meet or exceed the same application availability objective. |
| Internal Read Performance | P95 certificate list/detail API response <= 500 ms for normal indexed branch-scoped queries, excluding artifact download time. |
| Command Performance | P95 metadata command processing <= 1 second excluding document-rendering/storage latency; synchronous render target P95 <= 5 seconds under normal load. |
| Public Verification | P95 verification lookup <= 750 ms under normal load. |
| Scalability | Indexed lookup by certificate number, verification code, enrollment, branch-derived joins, status, and issue date; pagination required for registry lists. |
| Concurrency | Duplicate issuance and duplicate verification-code creation must remain impossible under concurrent requests through database uniqueness plus transaction/idempotency controls. |
| Data Integrity | Certificate must always reference valid enrollment; source identifiers for student, course, and batch must remain consistent with the enrollment snapshot/reference policy. |
| Durability | Certificate metadata and reissue history must be backed up under the application's database backup policy; certificate artifacts must follow infrastructure storage durability and recovery policy. |
| Localization | English and Arabic certificate generation supported where required; dates/numbers rendered according to approved ASTI/Oman presentation policy. |
| Timezone | Business timestamps displayed using Oman default timezone `Asia/Muscat` unless a documented branch-specific policy supersedes it. |
| Security | OWASP-aligned validation, authorization, IDOR protection, rate limiting for public verification, secure storage references, and no sensitive PII in QR payload. |
| Auditability | Sensitive state changes are attributable and immutable through Audit & Compliance records. |
| Usability | Certificate blockers must present actionable reason categories: completion not approved, payment validation failed/pending, certificate already issued, source record unavailable, unauthorized scope. |
| Accessibility | Administrative screens should target WCAG 2.1 AA interaction and labeling conventions. |
| Observability | Structured logs, trace correlation across in-process context boundaries, issuance/reissue/revocation counters, error rates, render latency, and verification latency. |

---

## 12. DDD Ownership Notes and Known Cross-Context Dependencies

### 12.1 Ownership Matrix

| Data / Decision | Owner | Certificate Module Usage |
|---|---|---|
| `Certificate` | Certificate Management | Create and manage lifecycle. |
| `CertificateVerification` | Certificate Management | Persist verification attempt/result. |
| `CertificateReissueRequest` | Certificate Management | Create and manage request lifecycle; approval audit also integrates with Audit & Compliance. |
| Completion eligibility | Exam, Result & Completion | Read/consume approved decision only. |
| Completion rules | Course Catalog | Never evaluated directly by Certificate Management. |
| Payment, invoice, receivable truth | Finance & Receivables | Consume payment-validation decision where required. |
| `Enrollment` | Admission & Enrollment | Required source of learner-course-batch-branch relationship. |
| Student/Person identity | Admission & Enrollment + shared Party/Person model | Read display data; do not create duplicate identity. |
| Course | Course Catalog | Read display/reference data only. |
| Batch | Training Delivery | Read display/reference data only. |
| Branch access | IAM | Authorize internal operations. |
| Certificate numbering configuration | Configuration / Master Data | Allocate certificate number through approved series. |
| Audit history | Audit & Compliance | Write audit events through context contract; read for audit views. |
| Notification delivery/history | Communication & Notification | Request message delivery; do not own send status. |
| Dashboards/reports | Reporting & Dashboards | Publish/read certificate facts for reporting; no transaction mutation. |

### 12.2 Cross-Context Dependency Flow

```text
Course Catalog
  └─ owns CourseCompletionRule
          ↓
Exam, Result & Completion
  └─ evaluates rule + records approved completion
          ↓
Admission & Enrollment
  └─ provides Enrollment identity and learning-journey linkage
          ↓
Finance & Receivables
  └─ provides payment validation when required
          ↓
Certificate Management
  ├─ validates supplied decisions
  ├─ generates Certificate
  ├─ issues/reissues/revokes
  └─ verifies authenticity
          ├────────→ Audit & Compliance
          ├────────→ Communication & Notification
          └────────→ Reporting & Dashboards
```

### 12.3 Known Alignment Gaps / Decisions Requiring Confirmation

1. **CertificateIssueLog is present in DDD but absent from the ER model.** Until the ER model is updated, issuance history must be represented by `Certificate` lifecycle fields plus `AuditLog`; a new persistence table must not be invented inside this FRD.
2. **CertificateQRCode is modeled as a DDD child concept but the ER model stores `qrCodeUrl` directly on `Certificate`.** This FRD follows the ER structure and treats QR information as certificate-owned metadata unless the ER model is revised.
3. **Revocation is a DDD responsibility, but the ER model provides only `certificateStatus` and no dedicated revocation reason/date/by fields.** Status transition can be represented, but durable revocation-specific metadata should use AuditLog until the ER model is formally extended. This is an ER detail gap, not permission to invent new certificate columns.
4. **CertificateReissueRequest approval overlaps Certificate context workflow and Audit & Compliance approval ownership.** The ER model includes local request status/approved fields and global `ApprovalRequest` supports `CertificateReissue`. Implementation should keep the reissue request as Certificate-owned transaction while Audit & Compliance owns approval history.
5. **Prisma schema validation is not completed** because `packages/database/prisma/schema.prisma` was not provided in the current uploaded inputs. No claim is made that the physical schema currently implements these requirements.

---

## 13. Traceability Summary

The module definition is aligned to the DDD Certificate Management context, Certificate aggregate invariants, Completion-to-Certificate integration rule, data ownership matrix, and ER entities `Certificate`, `CertificateVerification`, and `CertificateReissueRequest`.

No requirement in this document authorizes Certificate Management to compute completion eligibility, mutate finance records, create student identity, change course/batch data, own permissions, or own reporting transactions.
