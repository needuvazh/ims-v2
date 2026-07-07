# Module 13 - Document Management

## 1. Document Control

| Item | Value |
|---|---|
| Module | Module 13 - Document Management |
| Module Code | DOC |
| Bounded Context | Document Management |
| Domain Classification | Supporting Domain |
| Delivery Phase | Phase 1 |
| Primary Application | ASTI IMS Admin Portal |
| Architecture Style | Modular monolith in Next.js monorepo |
| Storage Mechanism | Vercel Blob for file binaries; IMS database for document metadata and lifecycle state |
| Source Baselines | DDD Context Map v3.0; ER Model / Domain Data Model v3.0 |

---

## 2. Purpose and Objective

The Document Management module provides a controlled, auditable, permission-aware capability for storing, classifying, retrieving, verifying, rejecting, expiring, and reviewing documents associated with supported ASTI business owners.

The module exists to centralize document lifecycle management without duplicating the source-of-truth records owned by other bounded contexts. A student remains owned by Admission & Enrollment, a trainer remains owned by Faculty / Trainer Management, a corporate account remains owned by Corporate Training, and a person remains part of the shared Party / Person model. Document Management stores document metadata, file references, verification history, and expiry state for documents attached to those owners.

The module shall support the current ER owner types:

- `Student`
- `Trainer`
- `Corporate`
- `Person`
- `Employee` only as a future-facing owner type; employee lifecycle functionality remains outside current phase until HRMS is implemented.

File binaries shall be stored in Vercel Blob. The domain model shall retain only the file reference required to retrieve the object and shall not treat the storage provider as the owner of business state. Upload, replacement, deletion/retirement, and access behavior must follow the IMS soft-delete, audit, RBAC, and branch-isolation rules.

### Objectives

1. Provide one controlled document repository for operational documents linked to valid domain owners.
2. Prevent duplication of Person, StudentProfile, TrainerProfile, or CorporateAccount identity data inside document records.
3. Enforce document classification and lifecycle states.
4. Support human verification with immutable verification history.
5. Track issue and expiry dates and make expired documents operationally visible.
6. Support permission-based upload, read, verify, reject, and expiry-management actions.
7. Ensure all sensitive actions are auditable.
8. Enforce server-side branch isolation based on the document owner's branch-access semantics.
9. Use Vercel Blob only as file storage infrastructure while preserving domain ownership in the Document Management bounded context.
10. Support future compliance alerts through Communication & Notification without transferring document ownership to that context.

---

## 3. Business Goals

| ID | Business Goal | Success Intent |
|---|---|---|
| BO-DOC-001 | Centralize business document records | All supported student, trainer, corporate, and person documents are discoverable through one controlled module without copying owner master data. |
| BO-DOC-002 | Improve compliance visibility | Users can identify pending, rejected, approved, and expired documents through explicit lifecycle states and filters. |
| BO-DOC-003 | Strengthen verification governance | Verification and rejection decisions identify the verifier, decision time, remarks, and resulting status. |
| BO-DOC-004 | Reduce expired-document risk | Documents with expiry dates can be detected as expired and surfaced for operational follow-up. |
| BO-DOC-005 | Protect confidential files | Every upload, view, verification decision, and soft-delete action is permission checked and branch scoped on the server. |
| BO-DOC-006 | Preserve auditability | Sensitive lifecycle changes are recorded through the Audit & Compliance conventions with actor, timestamp, old value, new value, and reason where applicable. |
| BO-DOC-007 | Avoid identity duplication | Document records reference source owners and never become a replacement source for StudentProfile, TrainerProfile, Person, or CorporateAccount data. |
| BO-DOC-008 | Decouple storage from domain logic | Vercel Blob stores binaries while the IMS database stores metadata and lifecycle state. Storage operations do not redefine domain ownership. |
| BO-DOC-009 | Support operational search | Authorized staff can search and filter documents by owner, document type, verification status, issue date, and expiry criteria. |
| BO-DOC-010 | Support phased expansion | The design permits future HRMS-owned employee documents and notification-driven expiry alerts without implementing HRMS in the current module. |

---

## 4. Scope

### 4.1 Included

1. Upload a document for a supported owner.
2. Validate owner existence and access before upload.
3. Classify a document using configured document type values.
4. Persist document metadata and the Vercel Blob file reference.
5. View document lists with server-side filters and branch scoping.
6. View document details and verification history.
7. Securely retrieve or preview authorized documents.
8. Submit uploaded documents for verification where applicable.
9. Approve a pending document verification.
10. Reject a pending document verification with mandatory remarks.
11. Record immutable verification history.
12. Store issue date and expiry date.
13. Detect and expose expired documents.
14. Filter for documents expiring within a specified date range.
15. Soft-delete or retire document metadata subject to authorization and audit requirements.
16. Audit sensitive changes and access-relevant actions according to repository conventions.
17. Use Vercel Blob for the file object and the IMS database for business metadata.
18. Support Student, Trainer, Corporate, and Person owners in current scope.
19. Integrate with Configuration / Master Data for document type definitions where configured.
20. Expose owned data to Reporting & Dashboards through read-only reporting projections or queries.
21. Provide event/command boundaries for future expiry alerts through Communication & Notification.

### 4.2 Excluded

1. HRMS employee lifecycle management.
2. Employee onboarding workflows.
3. ESS document self-service.
4. Payroll documents and payslips.
5. Electronic signatures or digital signing workflows.
6. OCR extraction, AI classification, document summarization, or automated identity matching.
7. Virus-scanning product selection or an external malware scanning service unless separately approved in architecture.
8. Configurable multi-step document approval workflow not defined by the DDD/ER baseline.
9. Certificate generation or certificate verification; these belong to Certificate Management.
10. Invoice, receipt, refund, and finance document lifecycle; Finance owns those business records even if a generated file URL exists.
11. Course completion approval documents as a new aggregate; Exam & Completion owns completion decisions.
12. Public anonymous access to general documents.
13. Public certificate verification, which remains Certificate Management responsibility.
14. Hard deletion of document records.
15. SaaS tenant isolation; the current platform is single-client ASTI.
16. External document broker, document microservice, CQRS, or event-sourcing architecture.
17. CMS-style content editing.
18. New owner types not mapped to the DDD Context Map or ER Model.

---

## 5. Stakeholders and Actors

### 5.1 Human Actors

| Actor | Role in Module | Typical Capabilities |
|---|---|---|
| System Administrator | Controls permissions and access configuration | Assign permissions, investigate access issues; does not bypass branch isolation by default. |
| Document Administrator | Operational owner for document maintenance | Upload, classify, view, manage metadata, submit for verification, retire documents. |
| Document Verifier / Compliance Officer | Reviews documentary evidence | View eligible pending documents, approve, reject with remarks, inspect verification history. |
| Admission Officer | Works with student/person documents | Upload and view documents for owners within allowed branch scope. |
| Trainer Coordinator | Works with trainer documents | Upload and view trainer qualifications, licenses, and identity documents within allowed branch scope. |
| Corporate Account Coordinator | Works with corporate documents | Upload and view corporate contracts, registration documents, and licenses for accessible corporate accounts. |
| Branch Manager | Branch-level oversight | View branch-scoped document status and exception lists subject to permissions. |
| Auditor / Compliance Reviewer | Read-only governance review | View document metadata, lifecycle history, and audit evidence where granted. |
| Reporting User | Consumes summaries | View reporting outputs only; no transaction ownership. |

> Role names are descriptive actors, not hardcoded authorization roles. Actual access is determined by dynamic permissions and branch access.

### 5.2 System Actors

| System Actor | Responsibility |
|---|---|
| Identity & Access Management | Authenticates users and evaluates permission plus branch access. |
| Configuration / Master Data | Supplies valid document types and related configurable reference data. |
| Admission & Enrollment | Owns StudentProfile and enrollment-linked learner identity references. |
| Faculty / Trainer Management | Owns TrainerProfile references. |
| Corporate Training | Owns CorporateAccount references. |
| Party / Person Model | Supplies canonical Person references. |
| Vercel Blob | Stores file binary objects and returns a storage reference/URL according to infrastructure design. |
| Audit & Compliance | Records sensitive lifecycle and access-relevant audit events. |
| Communication & Notification | Future/current-phase integration target for expiry alerts; does not own expiry state. |
| Reporting & Executive Dashboards | Consumes document read data; does not mutate Document or DocumentVerification. |
| Scheduled Job Infrastructure | Evaluates expiry conditions and updates/surfaces expiry state according to implementation design; remains infrastructure, not a new bounded context. |

---

## 6. Functional Overview

```text
Module 13 - Document Management
|
+-- Document Registry
|   +-- Create document metadata
|   +-- Link document to owner
|   +-- Classify document type
|   +-- Record issue and expiry dates
|   +-- View document details
|   +-- Soft delete / retire document
|
+-- File Storage Integration
|   +-- Upload file to Vercel Blob
|   +-- Persist storage reference in Document.fileUrl
|   +-- Authorized retrieval / preview
|   +-- Storage failure compensation
|
+-- Verification Lifecycle
|   +-- Uploaded
|   +-- PendingVerification
|   +-- Approved
|   +-- Rejected
|   +-- Expired
|   +-- Verification remarks
|   +-- Verification history
|
+-- Search and Work Queues
|   +-- Owner filters
|   +-- Document type filters
|   +-- Status filters
|   +-- Expiring-soon filters
|   +-- Expired documents
|   +-- Pending verification queue
|
+-- Security and Branch Isolation
|   +-- Permission guards
|   +-- Owner-derived branch scope
|   +-- Sensitive file access controls
|   +-- Audit trail
|
+-- Cross-Context Integration
    +-- IAM permissions and branch access
    +-- Configuration document types
    +-- Student / Trainer / Corporate / Person owner validation
    +-- Audit events
    +-- Reporting read access
    +-- Communication expiry alerts
```

---

## 7. Business Capabilities and User Types

### 7.1 Internal User Capabilities

| Capability | Internal Users | Notes |
|---|---|---|
| Upload document | Authorized operational staff | Must have owner access and create permission. |
| View document list | Authorized staff | Server-side branch scoping mandatory. |
| View/preview document | Authorized staff | File access requires same authorization as metadata access. |
| Update metadata | Document administrators and designated operational users | Cannot silently overwrite verification history. |
| Submit for verification | Authorized uploader/administrator | Only valid from an allowed current state. |
| Verify document | Verifier/compliance staff | Requires fine-grained permission. |
| Reject document | Verifier/compliance staff | Rejection remarks mandatory. |
| Review expiry exceptions | Branch manager/compliance users | Scope limited by branch and permission. |
| Retire document | Restricted administrators | Soft delete only; audit mandatory. |
| Review audit evidence | Auditor/compliance users | Read-only unless separately granted. |

### 7.2 External User Capabilities

Current DDD application strategy is a single admin portal. Therefore, there is no current self-service external actor for uploading or managing general documents.

Potential future external use cases such as student portal upload, corporate portal upload, or employee self-service upload are excluded until their owning application/context boundaries are explicitly defined.

---

## 8. Functional Requirements Checklist

| ID | Requirement | Priority |
|---|---|---|
| FR-DOC-001 | Create a document record linked to a valid supported owner | Must |
| FR-DOC-002 | Upload file binary to Vercel Blob and persist the returned file reference | Must |
| FR-DOC-003 | Validate owner type and owner existence using the owning context | Must |
| FR-DOC-004 | Validate document type against configured allowed values | Must |
| FR-DOC-005 | Record file name, issue date, expiry date, uploader, and verification status | Must |
| FR-DOC-006 | Enforce issue-date and expiry-date validation | Must |
| FR-DOC-007 | List documents with pagination and server-side filters | Must |
| FR-DOC-008 | Search documents by owner and supported metadata criteria | Must |
| FR-DOC-009 | View document details including verification history | Must |
| FR-DOC-010 | Authorize document file preview/download using metadata authorization rules | Must |
| FR-DOC-011 | Submit an uploaded document for verification | Must |
| FR-DOC-012 | Approve a pending document | Must |
| FR-DOC-013 | Reject a pending document with mandatory remarks | Must |
| FR-DOC-014 | Record immutable verification decision history | Must |
| FR-DOC-015 | Detect documents whose expiry date has passed | Must |
| FR-DOC-016 | List documents expiring within a requested date window | Must |
| FR-DOC-017 | Prevent verification action from invalid lifecycle states | Must |
| FR-DOC-018 | Prevent cross-branch document access | Must |
| FR-DOC-019 | Enforce permission checks on create, read, update, verify, reject, retire, and report actions | Must |
| FR-DOC-020 | Soft-delete or retire a document without hard deletion | Must |
| FR-DOC-021 | Audit sensitive document state changes | Must |
| FR-DOC-022 | Handle Blob upload failure without creating a valid active document record pointing to a missing file | Must |
| FR-DOC-023 | Handle database persistence failure after Blob upload through safe compensation/reconciliation | Must |
| FR-DOC-024 | Expose pending-verification work queue | Should |
| FR-DOC-025 | Expose expired and expiring-soon work queues | Should |
| FR-DOC-026 | Produce module-level operational report data through read-only reporting access | Should |
| FR-DOC-027 | Support future notification request integration for expiry alerts | Should |
| FR-DOC-028 | Preserve original verification records when document metadata is updated | Must |
| FR-DOC-029 | Prevent one document record from referencing multiple business owners | Must |
| FR-DOC-030 | Prevent unsupported owner types | Must |
| FR-DOC-031 | Display owner identity using owning-context read data without copying owner master attributes into Document | Must |
| FR-DOC-032 | Apply optimistic concurrency/version checks where repository conventions support them | Should |
| FR-DOC-033 | Record all timestamps using platform standard timezone handling; display to Oman business timezone by default | Must |
| FR-DOC-034 | Restrict employee document workflows until HRMS ownership is introduced | Must |
| FR-DOC-035 | Keep certificate, finance, attendance, and completion business records in their owning contexts | Must |

---

## 9. Permission Model Overview

The module uses dynamic RBAC from Identity & Access Management. Permissions shall not be inferred from hardcoded role names.

### 9.1 Proposed Fine-Grained Permission Codes

| Permission Code | Scope | Purpose |
|---|---|---|
| `document.menu.view` | Branch-scoped | Show Document Management navigation entry. |
| `document.read` | Branch-scoped | Read document metadata and authorized file content. |
| `document.create` | Branch-scoped | Upload and register new documents. |
| `document.update` | Branch-scoped | Update allowed metadata. |
| `document.verify.submit` | Branch-scoped | Move eligible document to pending verification. |
| `document.verify.approve` | Branch-scoped or expanded scope by branch assignment | Approve pending documents. |
| `document.verify.reject` | Branch-scoped or expanded scope by branch assignment | Reject pending documents. |
| `document.retire` | Branch-scoped, restricted | Soft-delete/retire documents. |
| `document.expiry.read` | Branch-scoped | View expiring and expired queues. |
| `document.report.view` | Branch-scoped | View document operational reports. |
| `document.report.consolidated` | Consolidated only | View consolidated multi-branch report where IAM grants consolidated access. |
| `document.audit.read` | Permission plus audit-access policy | View relevant audit evidence. |

### 9.2 Permission Evaluation Principles

1. Menu visibility is not sufficient authorization.
2. Every server action and API endpoint must re-evaluate permission.
3. File retrieval must perform the same owner and branch checks as metadata retrieval.
4. Consolidated access requires both report permission and IAM `canViewConsolidated` capability.
5. Parent-child branch access follows IAM `canViewChildBranches` behavior.
6. Child branch users cannot access parent or sibling branch documents unless explicitly assigned.
7. System administrators do not automatically bypass business branch scoping unless IAM policy explicitly grants access.

---

## 10. Security and Audit Requirements Summary

1. Authentication is mandatory for all current Document Management screens and APIs.
2. Authorization must be enforced server-side.
3. Branch scope must be derived from the authenticated user's branch access and the document owner's owning-context branch relationship.
4. Direct Blob URL exposure must not be treated as authorization. Retrieval strategy must prevent unauthorized access to private documents.
5. Uploaded file metadata must be validated before the document becomes active.
6. File type, size, and content-type limits must be defined in architecture/configuration before production deployment; the DDD/ER baseline does not currently define these values.
7. Rejection requires remarks.
8. Verification decisions must identify `verifiedBy` and `verifiedAt`.
9. Verification history must be preserved in `DocumentVerification` records.
10. Sensitive actions must be auditable: create, metadata change, submission for verification, approve, reject, expiry state change, and retirement/soft delete.
11. Audit records must capture entity type, entity id, action, old value, new value, performer, time, IP address where available, and reason where applicable.
12. No hard delete is permitted.
13. File access should be logged where repository audit policy classifies document access as sensitive.
14. Database and Blob state inconsistencies must be detectable and recoverable through operational reconciliation.
15. Vercel Blob credentials/tokens must remain server-side and never be exposed in browser source or client logs.
16. Storage object names must not rely on user-provided file names as trusted unique identifiers.
17. Owner identifiers from requests must be authorized, not merely syntactically validated.

---

## 11. Non-Functional Requirements Summary

| Category | Requirement Summary |
|---|---|
| Performance | Document list and detail metadata endpoints should meet normal admin-portal latency targets; file upload/download latency is separately dependent on file size and Blob network conditions. |
| Availability | Metadata operations must degrade safely when Blob is unavailable; failed uploads must not create valid file references. |
| Consistency | Document lifecycle changes and verification history must remain transactionally consistent in the database. Blob/database dual-write cases require compensation or reconciliation because they are not one distributed transaction. |
| Scalability | Use paginated queries, indexed filter columns, and direct/object-storage transfer patterns appropriate to Vercel Blob. Do not stream large files through application memory unless architecture requires it. |
| Security | RBAC, branch scoping, secure Blob access, server-side token handling, input validation, and audit logging are mandatory. |
| Usability | Users must see clear status labels, rejection reasons, expiry indicators, owner identity, document type, issue date, and expiry date. |
| Observability | Structured logs must correlate document operation, actor, owner type/id, document id, and storage operation outcome without logging secrets or file content. |
| Recoverability | Owned database tables must follow repository backup/restore policies; orphan Blob objects and broken file references must be reconcilable. |
| Localization | Business dates/times display using Oman defaults; localized document-type labels may come from Configuration/Master Data. |
| Accessibility | Admin screens should meet the project accessibility baseline for keyboard access, labels, status semantics, and non-color-only indicators. |
| Auditability | Verification and lifecycle changes must be reconstructable from domain state, DocumentVerification history, and AuditLog evidence. |

---

## 12. DDD Ownership Notes

### 12.1 Document Management Owns

- `Document`
- `DocumentVerification`
- document verification status
- document issue/expiry metadata
- document file reference metadata
- verification lifecycle
- document expiry visibility

The DDD context map also names `DocumentType`, `DocumentOwner`, `DocumentStatus`, and `DocumentExpiry` as core concepts. The ER model, however, represents some of these as fields rather than separate tables. The FRD shall not introduce new persistence aggregates merely because the DDD uses conceptual names.

### 12.2 Document Management Does Not Own

- Person identity
- StudentProfile
- Enrollment
- TrainerProfile
- CorporateAccount
- Certificate
- Invoice or Receipt business state
- AttendanceRecord
- CourseCompletion
- User, Role, Permission, or BranchAccess
- AuditLog
- NotificationLog
- reporting definitions/widgets

### 12.3 Storage Ownership

Vercel Blob is an infrastructure dependency. It owns storage mechanics, not business lifecycle state. The domain's `Document.fileUrl` is the current ER-aligned file reference. Any additional provider-specific persistence fields require schema review before introduction.

---

## 13. Known Cross-Context Dependencies

| Dependency | Direction | Contract Intent |
|---|---|---|
| Identity & Access | DOC -> IAM | Authenticate actor, check permission, resolve assigned branches and consolidated/child access. |
| Configuration / Master Data | DOC -> Configuration | Validate document type codes and localized labels. |
| Admission & Enrollment | DOC -> Admission/Enrollment | Resolve and authorize Student owner references. |
| Faculty / Trainer Management | DOC -> Trainer | Resolve and authorize Trainer owner references. |
| Corporate Training | DOC -> Corporate Training | Resolve and authorize Corporate owner references. |
| Party / Person | DOC -> shared owner data | Resolve canonical Person owner references. |
| Audit & Compliance | DOC -> Audit | Record critical document actions; Audit owns AuditLog. |
| Communication & Notification | DOC -> Communication | Request expiry alerts when enabled; Communication owns delivery state/log. |
| Reporting & Dashboards | Reporting -> DOC | Read document status/expiry data without taking transaction ownership. |
| Vercel Blob | DOC infrastructure adapter -> Blob | Store/retrieve file binary and return storage reference. |

---

## 14. Known Gaps and Architecture Decisions Required

### GAP-DOC-001 - Branch Scope Is Not Explicit in ER Document
**Status: Resolved in Prisma.** The actual database schema contains a direct `branchId` column on `Document`. Branch isolation checks will directly utilize this column. At upload time, `branchId` is derived from the owner and persisted on the `Document` record.

### GAP-DOC-002 - Blob Metadata Is Not Fully Modeled
The ER model provides `fileName` and `fileUrl` but does not define provider key/path, content type, size, checksum, ETag, or storage provider. In Prisma, the binary reference maps to `fileKey` (VarChar 255), and `fileType` (VarChar 100) has been added. If operational reconciliation requires ETags or sizes, schema changes will be needed.

### GAP-DOC-003 - Document Type Representation Differs Between DDD and ER
DDD treats document type configuration as a dynamic configuration capability; the schema implements `documentType` as a static `DocumentType` enum. Restricting inputs to enum values is required until a migration introduces a configuration lookups relation.

### GAP-DOC-004 - Verification State Duplication
`Document.verificationStatus` (conceptual status) is separated in the actual Prisma schema into `Document.status` (`Draft`, `Active`, `Expired`, `Replaced`, `Deleted`) and `DocumentVerification.outcome` (`Pending`, `Verified`, `Rejected`). Transactions must map conceptual status transitions cleanly across these fields.

### GAP-DOC-005 - Expiry Alert Scheduling
DDD explicitly places scheduling details in Architecture/NFR. Expiry evaluation is done via a scheduled background cron job, but alert template resolution and messaging delivery are delegated to Communication & Notification.

### GAP-DOC-006 - Employee Owner Type Is Future Phase
ER lists `Employee`, while HRMS is future phase. Current implementation must not create a new Employee aggregate in Document Management. Employee document support activates only when an HRMS-owned identity/reference exists.

### GAP-DOC-007 - Prisma Schema Validation
**Status: Resolved.** The codebase's actual `packages/database/prisma/schema.prisma` has been validated. Polymorphic owner mapping is resolved via a separate `DocumentOwner` table, and branch scoping uses direct `branchId`.

### GAP-DOC-008 - Missing Date and Version fields in Prisma (CRITICAL IMPLEMENTATION GAP)
**Status: Open.** The actual `Document` model in `schema.prisma` is currently missing the `issueDate`, `expiryDate`, and `version` (optimistic locking) fields. These must be added via a database migration before implementation.


---

## 15. Source Alignment Summary

- DDD classifies Document Management as a supporting domain and Phase 1 context.
- DDD assigns Document, verification, and expiry ownership to Document Management.
- ER defines `Document` and `DocumentVerification` as the concrete current data model.
- ER owner types are Student, Trainer, Employee, Corporate, and Person.
- ER verification statuses are Uploaded, PendingVerification, Approved, Rejected, and Expired.
- DDD requires expiry tracking for Civil ID, Passport, Visa, contracts, and licenses.
- DDD requires Document Management to integrate with other contexts without taking ownership of their master data.
- The shared platform conventions require soft deletion and auditability.
- Vercel Blob is treated as the selected storage mechanism, while metadata remains domain-owned in the IMS database.

