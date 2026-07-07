# Part 1 – Business Overview, Functional Requirements, Business Rules

## Module 13 - Document Management

## 1. Introduction

The ASTI IMS Document Management module is the supporting-domain capability responsible for operational document metadata, file linkage, verification workflow, and expiry visibility across supported business owners.

ASTI maintains identity, qualification, licensing, contractual, and compliance evidence for learners, trainers, people, and corporate accounts. These documents must be managed without duplicating the master records owned by Admission & Enrollment, Faculty / Trainer Management, Corporate Training, or the shared Party / Person model.

The module therefore follows a reference-based ownership pattern:

```text
Owning Business Context
        |
        | canonical owner reference
        v
Document Management
        |
        +-- Document metadata
        +-- Vercel Blob file reference
        +-- Verification current status
        +-- Verification history
        +-- Issue / expiry dates
        +-- Expiry visibility
```

The file binary is stored in Vercel Blob. The Document Management bounded context owns document business metadata and lifecycle state. The storage provider does not own verification state, expiry state, owner relationships, or authorization policy.

The module is designed for the Phase 1 single admin portal and modular-monolith architecture. No microservice, external broker, CQRS, or Event Sourcing requirement is introduced.

---

## 2. Business Benefits

### 2.1 Centralized Compliance Evidence

Authorized staff can locate required documents without searching disconnected local drives or duplicating owner information.

### 2.2 Controlled Verification

Documents progress through explicit states. Approval and rejection actions are attributable and reviewable.

### 2.3 Expiry Risk Reduction

Issue and expiry dates support expiring-soon and expired-document work queues. This allows operations to follow up before compliance evidence becomes invalid.

### 2.4 Reduced Data Duplication

A document references a source owner. It does not recreate StudentProfile, TrainerProfile, CorporateAccount, or Person records.

### 2.5 Stronger Security

Metadata and binary access are permission checked and branch scoped on the server. Possession of a file URL must not be treated as authorization.

### 2.6 Auditability

Document lifecycle actions can be reconstructed from current state, verification history, and AuditLog records.

### 2.7 Infrastructure Separation

Vercel Blob handles file storage while the IMS database remains the source of truth for lifecycle metadata. This avoids coupling domain rules to a storage vendor API.

---

## 3. Functional Requirements Specifications

### FR-DOC-001 - Create Document Record for a Supported Owner

**Description & Actors**  
Authorized operational users shall create a Document record linked to exactly one supported business owner. Actors: Document Administrator, Admission Officer, Trainer Coordinator, Corporate Account Coordinator.

**Preconditions**

1. User is authenticated.
2. User has `document.create` permission.
3. Owner type is supported.
4. Owner exists in its owning context.
5. User has branch access to the owner.
6. A valid document type is selected.
7. File upload validation has passed.

**Inputs**

- ownerType
- ownerId
- documentType
- fileName
- file content/upload reference
- issueDate, optional where business document does not have one
- expiryDate, optional where document does not expire

**Processing Steps**

1. Validate request schema.
2. Validate permission.
3. Validate owner type.
4. Resolve owner from the owning context/read boundary.
5. Derive and enforce branch scope.
6. Validate document type through Configuration/Master Data.
7. Validate date rules.
8. Upload the file to Vercel Blob through the infrastructure adapter.
9. Receive a valid storage reference.
10. Create Document metadata with current verification status `Uploaded` unless a repository-approved workflow explicitly creates it as `PendingVerification`.
11. Set `uploadedBy` to the authenticated user.
12. Record audit evidence for creation.

**Outputs & Postconditions**

- New Document exists.
- Document references exactly one owner.
- Blob reference is stored in the ER-aligned `fileUrl` field.
- Current verification status is valid.
- Creation is auditable.

**Priority:** Must Have

---

### FR-DOC-002 - Upload File to Vercel Blob

**Description & Actors**  
The system shall store document binaries in Vercel Blob through a server-controlled storage adapter. Actors: authorized uploader; Vercel Blob as system actor.

**Preconditions**

1. User is authenticated and authorized to create/update the target document.
2. Owner access is valid.
3. File passes configured size and type checks.

**Inputs**

- binary file stream or approved upload mechanism
- file name
- content type
- owner correlation context

**Processing Steps**

1. Validate authorization before issuing or performing an upload operation.
2. Generate a collision-safe storage identity independent of the untrusted original file name.
3. Upload using server-side credentials or an approved secure client-upload pattern.
4. Validate storage success response.
5. Persist only the required domain reference in Document metadata.
6. Do not expose Blob credentials or service tokens to application logs or unauthorized clients.

**Outputs & Postconditions**

- Blob object exists.
- Valid file reference is available for Document metadata.
- Failed upload does not create an active valid Document pointing to a nonexistent file.

**Priority:** Must Have

---

### FR-DOC-003 - Validate Document Owner

**Description & Actors**  
The system shall validate that every Document references one existing, supported owner and that the actor may access that owner. Actors: all document-writing users; owner bounded contexts as system actors.

**Preconditions**

- Authenticated request.
- Owner type and owner id supplied.

**Inputs**

- ownerType
- ownerId
- actor branch-access context

**Processing Steps**

1. Match ownerType to the permitted set: Student, Trainer, Corporate, Person; Employee remains disabled until HRMS ownership exists.
2. Query the appropriate owning context or its internal read boundary.
3. Reject nonexistent or soft-deleted owners.
4. Determine owner branch visibility.
5. Reject cross-branch access.
6. Avoid copying owner master fields into Document.

**Outputs & Postconditions**

- Owner reference is validated.
- Document creation/update can continue only for an accessible owner.

**Priority:** Must Have

---

### FR-DOC-004 - Validate and Assign Document Type

**Description & Actors**  
Authorized users shall assign a configured document type. Actors: uploader, document administrator; Configuration/Master Data as system actor.

**Preconditions**

- Valid owner.
- User authorized to create/update document.

**Inputs**

- documentType code

**Processing Steps**

1. Resolve the code from configured document types/lookups.
2. Reject unknown or inactive types.
3. Store the ER-aligned documentType value/reference according to the actual Prisma mapping.
4. Display localized labels where configuration provides them.

**Outputs & Postconditions**

- Document has a valid type.

**Priority:** Must Have

---

### FR-DOC-005 - Record Document Metadata

**Description & Actors**  
The module shall record the ER-defined metadata required for document lifecycle management. Actors: uploader and document administrator.

**Preconditions**

- File storage reference exists.
- Owner and type validation passed.

**Inputs**

- fileName
- fileUrl
- issueDate
- expiryDate
- uploadedBy

**Processing Steps**

1. Normalize safe display metadata.
2. Store fileName and fileUrl.
3. Store issueDate and expiryDate when provided.
4. Set uploadedBy from authenticated actor, never trusted request input.
5. Initialize verification status.

**Outputs & Postconditions**

- Complete Document metadata record.

**Priority:** Must Have

---

### FR-DOC-006 - Validate Issue and Expiry Dates

**Description & Actors**  
The system shall enforce consistent date rules. Actors: uploader, document administrator.

**Preconditions**

- Metadata request submitted.

**Inputs**

- issueDate
- expiryDate

**Processing Steps**

1. Parse dates using platform date standards.
2. Reject invalid date values.
3. Where both dates exist, require `expiryDate >= issueDate`.
4. Permit no expiry date for non-expiring documents.
5. Determine expired state from the business date/time policy using Oman display/business timezone defaults.

**Outputs & Postconditions**

- Dates are internally consistent.
- Invalid ranges are rejected.

**Priority:** Must Have

---

### FR-DOC-007 - List Documents

**Description & Actors**  
Authorized users shall list accessible documents using pagination and filters. Actors: operational users, branch managers, auditors.

**Preconditions**

- Authenticated user.
- `document.read` permission.

**Inputs**

- page/cursor parameters
- ownerType
- ownerId
- documentType
- verificationStatus
- issue-date range
- expiry-date range
- expiring-soon window
- sort criteria

**Processing Steps**

1. Build server-side scope from IAM branch access.
2. Apply owner-derived branch filters.
3. Apply requested filters.
4. Exclude soft-deleted records unless a specifically authorized administrative view exists.
5. Apply stable sorting and pagination.
6. Return metadata only; file access remains separately authorized.

**Outputs & Postconditions**

- Paginated, scoped result set.
- No inaccessible document is disclosed.

**Priority:** Must Have

---

### FR-DOC-008 - Search by Owner

**Description & Actors**  
Authorized users shall find documents associated with a known supported owner. Actors: admission, trainer, corporate, and document operations users.

**Preconditions**

- User can access the owner.

**Inputs**

- ownerType
- ownerId
- optional type/status filters

**Processing Steps**

1. Validate owner access.
2. Query Document by ownerType and ownerId.
3. Apply soft-delete and branch rules.
4. Return current document metadata.

**Outputs & Postconditions**

- Owner-specific document list.

**Priority:** Must Have

---

### FR-DOC-009 - View Document Detail and Verification History

**Description & Actors**  
Authorized users shall view a document's metadata and its ordered verification history. Actors: operational users, verifiers, auditors.

**Preconditions**

- `document.read` permission.
- Branch access to owner.

**Inputs**

- documentId

**Processing Steps**

1. Load document with server-side scope.
2. Load ordered DocumentVerification records.
3. Resolve display-only owner identity from owning context/read model.
4. Present current verification status and historical decisions separately.

**Outputs & Postconditions**

- Document detail view.
- Chronological verification history.

**Priority:** Must Have

---

### FR-DOC-010 - Secure File Preview or Download

**Description & Actors**  
Authorized users shall retrieve document content only after permission and branch checks. Actors: authorized readers; Vercel Blob.

**Preconditions**

- `document.read` permission.
- Metadata record is accessible.
- Document is not soft deleted.

**Inputs**

- documentId

**Processing Steps**

1. Load and authorize the Document record.
2. Revalidate owner-derived branch access.
3. Resolve the file storage reference.
4. Generate or proxy access using the approved private-access pattern.
5. Do not rely solely on possession of a URL as access authorization.
6. Record access audit if repository policy marks the class of document as sensitive.

**Outputs & Postconditions**

- Authorized file access.
- Unauthorized requests reveal no file content.

**Priority:** Must Have

---

### FR-DOC-011 - Submit Document for Verification

**Description & Actors**  
An authorized user shall submit an eligible Uploaded or corrected Rejected document for verification according to lifecycle policy. Actors: uploader/document administrator.

**Preconditions**

- `document.verify.submit` permission.
- User can access owner.
- File reference is valid.
- Current status allows submission.

**Inputs**

- documentId
- optional submission remarks if repository supports them

**Processing Steps**

1. Load document with version/concurrency guard where available.
2. Validate current state.
3. Transition current verification status to `PendingVerification`.
4. Record audit log old/new state.

**Outputs & Postconditions**

- Document appears in pending verification queue.

**Priority:** Must Have

---

### FR-DOC-012 - Approve Document Verification

**Description & Actors**  
A verifier shall approve a pending document. Actors: Document Verifier / Compliance Officer.

**Preconditions**

- `document.verify.approve` permission.
- Branch access to owner.
- Current status `PendingVerification`.

**Inputs**

- documentId
- optional remarks

**Processing Steps**

1. Load and authorize document.
2. Enforce pending state.
3. Create DocumentVerification history record with status `Approved`, remarks, verifier, and timestamp.
4. Update Document current verificationStatus to `Approved`.
5. Set `verifiedBy` and `verifiedAt` on Document according to ER model.
6. Record audit event.
7. Commit database changes transactionally.

**Outputs & Postconditions**

- Current status is Approved.
- Immutable verification history exists.
- Actor and time are attributable.

**Priority:** Must Have

---

### FR-DOC-013 - Reject Document Verification

**Description & Actors**  
A verifier shall reject a pending document with a reason. Actors: Document Verifier / Compliance Officer.

**Preconditions**

- `document.verify.reject` permission.
- Accessible owner.
- Status `PendingVerification`.

**Inputs**

- documentId
- remarks, mandatory

**Processing Steps**

1. Validate non-empty meaningful remarks.
2. Load and authorize document.
3. Enforce pending state.
4. Create DocumentVerification record with status `Rejected`.
5. Update Document.verificationStatus to `Rejected`.
6. Record verifiedBy/verifiedAt according to ER representation of the decision.
7. Record audit old/new state and reason.

**Outputs & Postconditions**

- Document status Rejected.
- Rejection reason preserved.

**Priority:** Must Have

---

### FR-DOC-014 - Preserve Verification History

**Description & Actors**  
The system shall preserve chronological verification decisions. Actors: system; auditors as readers.

**Preconditions**

- A verification decision occurs.

**Inputs**

- documentId
- status
- remarks
- verifier
- verification time

**Processing Steps**

1. Insert a new DocumentVerification record.
2. Never overwrite prior verification records to represent a new decision.
3. Return history ordered by verification time and stable identifier.

**Outputs & Postconditions**

- Complete decision history remains available.

**Priority:** Must Have

---

### FR-DOC-015 - Detect Expired Documents

**Description & Actors**  
The system shall identify documents with expiry dates earlier than the effective business date/time. Actors: scheduled infrastructure, compliance users.

**Preconditions**

- Document has expiryDate.
- Document is active/not soft deleted.

**Inputs**

- current business date/time
- expiryDate

**Processing Steps**

1. Evaluate expiry by configured platform time policy and Oman business display defaults.
2. Surface the document as expired.
3. Where the implementation persists `Expired` as current verificationStatus, update it consistently and audit the transition.
4. Preserve prior verification history.

**Outputs & Postconditions**

- Expired document appears in expiry queues/reports.

**Priority:** Must Have

---

### FR-DOC-016 - List Expiring-Soon Documents

**Description & Actors**  
Authorized users shall query documents expiring within a requested supported window. Actors: compliance officer, branch manager, operational users.

**Preconditions**

- `document.expiry.read` permission.

**Inputs**

- startDate
- endDate
- optional owner type/document type/status filters

**Processing Steps**

1. Validate range.
2. Apply branch scope.
3. Query active documents with expiryDate in range.
4. Sort by nearest expiry by default.

**Outputs & Postconditions**

- Scoped expiring-soon list.

**Priority:** Must Have

---

### FR-DOC-017 - Enforce Verification State Transitions

**Description & Actors**  
The system shall reject invalid lifecycle transitions. Actors: all users performing lifecycle actions.

**Preconditions**

- Existing document.

**Inputs**

- current status
- requested action

**Processing Steps**

1. Resolve current persisted status.
2. Validate transition against business rules.
3. Reject invalid transitions with a business validation error.
4. Use optimistic concurrency where supported to prevent stale double decisions.

**Outputs & Postconditions**

- Only legal lifecycle changes occur.

**Priority:** Must Have

---

### FR-DOC-018 - Enforce Branch Isolation

**Description & Actors**  
Every document operation shall enforce server-side branch scoping. Actors: all users and APIs.

**Preconditions**

- Authenticated user.
- Owner can be resolved.

**Inputs**

- user branch assignments
- parent/child access capability
- consolidated access capability
- owner branch relationship

**Processing Steps**

1. Resolve user branch access from IAM.
2. Resolve owner branch relationship from owner context.
3. Compute permitted scope.
4. Add scope predicate to data query before returning or mutating data.
5. Reject attempts to access out-of-scope records even when documentId is known.

**Outputs & Postconditions**

- No cross-branch leakage.

**Priority:** Must Have

---

### FR-DOC-019 - Enforce Fine-Grained Permissions

**Description & Actors**  
All actions shall use dynamic permissions. Actors: all users; IAM.

**Preconditions**

- Authenticated request.

**Inputs**

- authenticated user
- requested action
- permission code

**Processing Steps**

1. Determine required action permission.
2. Evaluate using IAM.
3. Apply branch scope separately.
4. Reject denied actions.

**Outputs & Postconditions**

- Access is action-level and not role-name hardcoded.

**Priority:** Must Have

---

### FR-DOC-020 - Soft Delete or Retire Document

**Description & Actors**  
Restricted users shall retire a Document without hard deletion. Actors: Document Administrator with restricted permission.

**Preconditions**

- `document.retire` permission.
- Owner in scope.
- Document exists and is active.

**Inputs**

- documentId
- reason, mandatory for sensitive retirement

**Processing Steps**

1. Load and authorize document.
2. Apply repository soft-delete convention (`deletedAt` and related active semantics as defined by schema conventions).
3. Preserve verification history.
4. Record AuditLog with reason.
5. Handle Blob lifecycle according to retention policy; do not hard-delete business evidence automatically merely because metadata is soft deleted.

**Outputs & Postconditions**

- Document no longer appears in normal operational queries.
- Historical auditability remains.

**Priority:** Must Have

---

### FR-DOC-021 - Audit Sensitive Document Actions

**Description & Actors**  
The module shall emit/record audit evidence through Audit & Compliance ownership. Actors: system; Audit & Compliance.

**Preconditions**

- Sensitive action occurs.

**Inputs**

- entity type/id
- action
- old value
- new value
- actor
- timestamp
- IP address when available
- reason when applicable

**Processing Steps**

1. Complete the authorized domain action.
2. Record audit information according to repository conventions and transaction boundaries.
3. Do not place file binary content in logs.
4. Preserve correlation id for troubleshooting.

**Outputs & Postconditions**

- Audit evidence exists for required actions.

**Priority:** Must Have

---

### FR-DOC-022 - Prevent Valid Metadata on Blob Upload Failure

**Description & Actors**  
The system shall avoid creating a usable Document when Blob upload fails. Actors: storage adapter, Document Management.

**Preconditions**

- Upload initiated.

**Inputs**

- file
- storage response

**Processing Steps**

1. Attempt upload.
2. Detect timeout, rejection, or invalid response.
3. Do not create active Document metadata with a broken fileUrl.
4. Return a safe failure response.
5. Log operational failure without secrets.

**Outputs & Postconditions**

- No active broken Document record.

**Priority:** Must Have

---

### FR-DOC-023 - Reconcile Database Failure After Successful Blob Upload

**Description & Actors**  
The system shall handle dual-write failure where Blob upload succeeds but database creation fails. Actors: storage adapter, database, operations.

**Preconditions**

- Blob object successfully created.
- Document persistence fails.

**Inputs**

- storage operation reference
- request correlation id
- database error

**Processing Steps**

1. Detect database failure.
2. Attempt safe compensation according to storage retention rules, or record sufficient operational evidence for reconciliation.
3. Do not report the document as successfully registered.
4. Emit structured error log/metric.
5. Make orphan detection possible through reconciliation tooling.

**Outputs & Postconditions**

- No false success.
- Orphan object is either compensated or identifiable for remediation.

**Priority:** Must Have

---

### FR-DOC-024 - Pending Verification Queue

**Description & Actors**  
Verifiers shall have a branch-scoped list of pending documents. Actors: verifier/compliance officer.

**Preconditions**

- verification read/approve/reject permissions as applicable.

**Inputs**

- owner type
- document type
- age/date filters
- pagination

**Processing Steps**

1. Query PendingVerification records in scope.
2. Sort oldest pending first by default.
3. Provide detail link and permitted actions.

**Outputs & Postconditions**

- Actionable work queue.

**Priority:** Should Have

---

### FR-DOC-025 - Expiry Work Queues

**Description & Actors**  
Authorized users shall view expired and expiring-soon queues. Actors: compliance officer, branch manager.

**Preconditions**

- expiry-read permission.

**Inputs**

- expiry window
- owner/document type filters

**Processing Steps**

1. Apply branch scope.
2. Separate expired from upcoming expiry.
3. Sort by urgency.

**Outputs & Postconditions**

- Scoped exception lists.

**Priority:** Should Have

---

### FR-DOC-026 - Reporting Read Integration

**Description & Actors**  
Reporting & Dashboards shall consume document status and expiry data without mutating document aggregates. Actors: reporting context.

**Preconditions**

- Authorized reporting query.

**Inputs**

- date range
- branch scope
- owner type
- document type
- status

**Processing Steps**

1. Query Document Management owned data through approved read boundary/view.
2. Apply reporting permission and branch scope.
3. Aggregate counts and trends without updating transactional records.

**Outputs & Postconditions**

- Reporting dataset/read model.

**Priority:** Should Have

---

### FR-DOC-027 - Expiry Alert Integration

**Description & Actors**  
Document Management shall provide expiry facts to Communication & Notification when alerting is enabled. Actors: Document Management, Communication & Notification.

**Preconditions**

- Document has expiryDate.
- Alert policy exists outside the core Document aggregate.

**Inputs**

- document reference
- owner/recipient reference as allowed
- expiry date
- alert classification

**Processing Steps**

1. Detect due alert condition according to architecture scheduling rules.
2. Create/request notification through Communication boundary.
3. Communication owns send status and delivery history.
4. Document Management retains ownership of expiry facts.

**Outputs & Postconditions**

- Notification request may be created.
- No notification delivery fields are stored in Document.

**Priority:** Should Have

---

### FR-DOC-028 - Preserve Verification History During Metadata Updates

**Description & Actors**  
Metadata updates shall not erase prior verification records. Actors: document administrator.

**Preconditions**

- Existing document.
- `document.update` permission.

**Inputs**

- permitted metadata changes

**Processing Steps**

1. Authorize and scope record.
2. Apply only mutable fields.
3. Preserve DocumentVerification rows.
4. Determine whether changed evidence requires resubmission according to transition rules.
5. Audit old/new metadata.

**Outputs & Postconditions**

- Metadata updated.
- Historical verification remains intact.

**Priority:** Must Have

---

### FR-DOC-029 - Enforce Single Owner per Document

**Description & Actors**  
Each Document record shall reference exactly one logical owner through ownerType and ownerId. Actors: all writers.

**Preconditions**

- Creation/update request.

**Inputs**

- ownerType
- ownerId

**Processing Steps**

1. Require both fields.
2. Validate supported pair.
3. Reject missing, ambiguous, or multi-owner payloads.

**Outputs & Postconditions**

- One document record, one owner reference.

**Priority:** Must Have

---

### FR-DOC-030 - Reject Unsupported Owner Types

**Description & Actors**  
The module shall reject owner types outside the DDD/ER-supported model. Actors: all writers.

**Preconditions**

- Request contains ownerType.

**Inputs**

- ownerType

**Processing Steps**

1. Compare with enabled supported set.
2. Reject unknown type.
3. Reject Employee until HRMS-owned reference is implemented.

**Outputs & Postconditions**

- No invented owner model enters Document data.

**Priority:** Must Have

---

### FR-DOC-031 - Resolve Owner Display Data Without Duplication

**Description & Actors**  
The UI shall display owner identity using source context data while Document stores only the reference. Actors: document readers; owner contexts.

**Preconditions**

- Accessible document.

**Inputs**

- ownerType
- ownerId

**Processing Steps**

1. Resolve display data through approved internal read boundary/read model.
2. Do not persist copied owner name, phone, or identity attributes solely for Document ownership display.
3. Respect owner data access rules.

**Outputs & Postconditions**

- Current owner display information is shown without creating another source of truth.

**Priority:** Must Have

---

### FR-DOC-032 - Optimistic Concurrency for Sensitive Updates

**Description & Actors**  
Where repository conventions and schema version fields apply, the system shall prevent stale concurrent verification or metadata updates. Actors: document administrators and verifiers.

**Preconditions**

- Existing record with version support.

**Inputs**

- documentId
- expected version
- requested mutation

**Processing Steps**

1. Compare expected and current version.
2. Reject stale write.
3. Require caller to reload current state.

**Outputs & Postconditions**

- No silent last-write-wins corruption for sensitive state changes.

**Priority:** Should Have

---

### FR-DOC-033 - Oman Timezone Display and Date Handling

**Description & Actors**  
The module shall use platform-standard timestamp storage and Oman business timezone defaults for user-facing dates/times. Actors: all users.

**Preconditions**

- Timestamp/date displayed or expiry evaluated.

**Inputs**

- stored timestamp/date
- platform timezone configuration

**Processing Steps**

1. Store timestamps according to shared platform convention.
2. Display operational times using configured ASTI/Oman timezone defaults.
3. Treat date-only issueDate/expiryDate fields as business dates and avoid accidental UTC date shifting.

**Outputs & Postconditions**

- Consistent business-date display and expiry behavior.

**Priority:** Must Have

---

### FR-DOC-034 - Defer Employee Document Workflow Until HRMS

**Description & Actors**  
The current module shall not invent an Employee aggregate or employee workflow. Actors: administrators and developers.

**Preconditions**

- Request to use ownerType Employee.

**Inputs**

- Employee owner reference

**Processing Steps**

1. Check whether HRMS employee ownership is active in deployed phase.
2. If not active, reject the transactional workflow.
3. Do not create local substitute employee records in Document Management.

**Outputs & Postconditions**

- DDD future-phase boundary preserved.

**Priority:** Must Have

---

### FR-DOC-035 - Preserve Other Context Ownership

**Description & Actors**  
Document Management shall not assume ownership of certificates, invoices, receipts, attendance, or completion outcomes. Actors: all system integrations.

**Preconditions**

- A file-like artifact is referenced.

**Inputs**

- artifact business type

**Processing Steps**

1. Determine owning context from DDD data ownership.
2. Keep business lifecycle in owner context.
3. Use Document Management only where the DDD/ER supports a document attachment/evidence relationship.
4. Do not migrate Certificate, Receipt, or similar aggregate status into Document verification status.

**Outputs & Postconditions**

- Cross-context boundaries remain intact.

**Priority:** Must Have

---

## 4. Business Rules

| Rule ID | Business Rule |
|---|---|
| BR-DOC-001 | Every Document must reference exactly one owner using `ownerType` and `ownerId`. |
| BR-DOC-002 | Supported current owner types are Student, Trainer, Corporate, and Person. Employee is enabled only after HRMS provides an owned employee reference. |
| BR-DOC-003 | A Document must not duplicate source owner identity fields as a new source of truth. |
| BR-DOC-004 | A document owner must exist and must not be soft deleted at the time a new document is registered. |
| BR-DOC-005 | User must have permission for the requested document action. |
| BR-DOC-006 | User must have branch access to the document owner; knowing documentId is not sufficient access. |
| BR-DOC-007 | Parent/child/consolidated branch access follows IAM rules; Document Management must not implement separate branch-role logic. |
| BR-DOC-008 | Document type must be valid and active according to Configuration/Master Data or the actual schema relation. |
| BR-DOC-009 | File binary is stored in Vercel Blob; document lifecycle metadata remains in the IMS database. |
| BR-DOC-010 | A successful Blob upload must not be treated as a successfully registered business Document until metadata persistence succeeds. |
| BR-DOC-011 | A failed Blob upload must not create an active Document with a broken file reference. |
| BR-DOC-012 | Blob/database dual-write inconsistencies must be compensatable or reconcilable. |
| BR-DOC-013 | `uploadedBy` is derived from the authenticated user, not accepted as trusted client input. |
| BR-DOC-014 | Where issueDate and expiryDate are both present, expiryDate must not be earlier than issueDate. |
| BR-DOC-015 | Documents without a natural expiry may have null expiryDate. |
| BR-DOC-016 | Current ER-aligned verification statuses are Uploaded, PendingVerification, Approved, Rejected, and Expired. |
| BR-DOC-017 | A newly registered document starts as Uploaded unless an explicitly approved workflow rule says otherwise. |
| BR-DOC-018 | Only an allowed state may be submitted to PendingVerification. |
| BR-DOC-019 | Only PendingVerification documents may be approved. |
| BR-DOC-020 | Only PendingVerification documents may be rejected. |
| BR-DOC-021 | Rejection remarks are mandatory and must be preserved. |
| BR-DOC-022 | Every approve/reject decision creates a new DocumentVerification history record. |
| BR-DOC-023 | Existing DocumentVerification history must not be overwritten to represent later decisions. |
| BR-DOC-024 | Document.verificationStatus represents current lifecycle state; DocumentVerification represents decision history. Both must be synchronized transactionally. |
| BR-DOC-025 | Verification decisions must capture verifier and verification time. |
| BR-DOC-026 | Expired documents are those with a non-null expiryDate before the effective business date according to platform time policy. |
| BR-DOC-027 | Expiry detection must not delete or overwrite prior verification history. |
| BR-DOC-028 | Expiry alert delivery state belongs to Communication & Notification, not Document. |
| BR-DOC-029 | Reporting may read document data but may not mutate Document or DocumentVerification state. |
| BR-DOC-030 | Audit & Compliance owns AuditLog; Document Management supplies critical action facts. |
| BR-DOC-031 | Critical actions include create, metadata update, submit for verification, approve, reject, expiry state change when persisted, and retirement/soft delete. |
| BR-DOC-032 | Hard deletion of Document metadata is prohibited. |
| BR-DOC-033 | Soft-deleted documents are excluded from normal operational queries. |
| BR-DOC-034 | Retirement of metadata must not automatically destroy Blob evidence unless retention policy explicitly permits it. |
| BR-DOC-035 | File retrieval requires authentication, permission, and branch-scope validation. |
| BR-DOC-036 | Possession of a Blob URL is not sufficient authorization to access a private business document. |
| BR-DOC-037 | Storage credentials and tokens must remain server-side or follow an approved secure client-upload mechanism. |
| BR-DOC-038 | User-provided file names must not be used as trusted globally unique storage keys. |
| BR-DOC-039 | File binary content, credentials, and access tokens must not be written to application logs. |
| BR-DOC-040 | The module must not create a local Student, Trainer, CorporateAccount, Person, or Employee substitute aggregate. |
| BR-DOC-041 | Certificate generation and public QR verification remain Certificate Management responsibilities. |
| BR-DOC-042 | Invoice, payment, receipt, refund, and receivable lifecycle remain Finance responsibilities. |
| BR-DOC-043 | Course completion approval remains Exam, Result & Completion responsibility. |
| BR-DOC-044 | Permission names are capability based and role names must not be hardcoded into business rules. |
| BR-DOC-045 | Menu visibility does not replace API/server-action authorization. |
| BR-DOC-046 | Consolidated reporting requires both the relevant report permission and IAM consolidated access capability. |
| BR-DOC-047 | Owner display data must be resolved from the owning context or approved read model rather than copied into Document. |
| BR-DOC-048 | Document metadata changes must preserve verification history. |
| BR-DOC-049 | A change to file evidence after rejection/approval must follow an explicit resubmission policy and may not silently preserve an approval for different evidence. |
| BR-DOC-050 | Business timestamps are stored according to shared platform convention and displayed using Oman business timezone defaults. |
| BR-DOC-051 | Date-only issue and expiry values must not shift calendar date through timezone conversion. |
| BR-DOC-052 | Employee document workflows remain disabled until HRMS ownership is available. |
| BR-DOC-053 | Unknown owner types are rejected rather than mapped to a generic unowned record. |
| BR-DOC-054 | Document type semantics must follow Configuration/Master Data unless a dedicated schema relation is already present. |
| BR-DOC-055 | Expiry scheduling cadence and retry behavior are architecture/NFR concerns and must not be invented as Document aggregate rules. |
| BR-DOC-056 | No microservice, external broker, CQRS, or Event Sourcing architecture is required for this module. |
| BR-DOC-057 | Blob integration must be encapsulated behind infrastructure/service boundaries so domain rules do not depend directly on provider-specific APIs. |
| BR-DOC-058 | Any provider-specific fields beyond the ER-defined fileUrl/fileName require schema review and explicit approval. |
| BR-DOC-059 | Sensitive concurrent decisions should use version/concurrency checks where supported by repository conventions. |
| BR-DOC-060 | Any requirement that cannot map to DDD ownership or ER entities must be reported as a gap, not implemented by inventing a new aggregate. |

---

## 5. Verification State Rules

### 5.1 Baseline State Model

```text
Uploaded
   |
   | submit for verification
   v
PendingVerification
   |                |
   | approve        | reject
   v                v
Approved          Rejected
                      |
                      | corrected evidence + resubmit policy
                      v
               PendingVerification

Any active document with an expiryDate that passes the effective business date
is surfaced as Expired according to the chosen persisted/derived-state implementation.
```

### 5.2 Transition Matrix

| From | Action | To | Required Permission | Notes |
|---|---|---|---|---|
| Uploaded | Submit | PendingVerification | `document.verify.submit` | File and metadata must be valid. |
| PendingVerification | Approve | Approved | `document.verify.approve` | Creates history and audit. |
| PendingVerification | Reject | Rejected | `document.verify.reject` | Remarks mandatory. |
| Rejected | Resubmit after permitted correction | PendingVerification | `document.verify.submit` | Historical rejection remains. Exact file-replacement behavior must be finalized in later parts/schema design. |
| Uploaded / PendingVerification / Approved / Rejected | Expiry evaluation | Expired or derived-expired visibility | System operation | ER includes Expired status; persistence semantics must remain consistent with verification history. |
| Any active state | Retire | Soft deleted | `document.retire` | Not a verification status; uses repo soft-delete convention. |

---

## 6. Cross-Module Dependency Mapping

| Source Context | Target Context | Dependency | Direction and Ownership Rule |
|---|---|---|---|
| Document Management | Identity & Access | Authentication, permissions, branch scope | DOC consumes IAM; IAM owns User/Role/Permission/BranchAccess. |
| Document Management | Configuration / Master Data | Document type validation and display labels | DOC consumes config; Configuration owns lookup values. |
| Document Management | Admission & Enrollment | Student owner validation/display | Admission & Enrollment owns StudentProfile and Enrollment. |
| Document Management | Faculty / Trainer Management | Trainer owner validation/display | Trainer Management owns TrainerProfile. |
| Document Management | Corporate Training | Corporate owner validation/display | Corporate Training owns CorporateAccount and related business identity. |
| Document Management | Party / Person | Person owner validation/display | Shared Party/Person remains canonical identity source. |
| Document Management | Vercel Blob | Binary storage/retrieval | Infrastructure only; DOC owns metadata and lifecycle. |
| Document Management | Audit & Compliance | Critical action audit | Audit owns AuditLog and approval history. |
| Document Management | Communication & Notification | Expiry alert request | Communication owns send/delivery history; DOC owns expiry facts. |
| Reporting & Dashboards | Document Management | Read status/expiry summaries | Reporting consumes read data and does not own transactions. |
| Future HRMS | Document Management | Employee owner references | HRMS owns employee lifecycle; DOC may reference only after HRMS exists. |
| Certificate Management | Document Management | No ownership transfer | Certificate remains its own aggregate; DOC must not replace certificate lifecycle. |
| Finance & Receivables | Document Management | No ownership transfer | Finance-generated artifacts remain finance business records. |
| Exam & Completion | Document Management | No ownership transfer | Completion evidence does not move completion decision ownership. |

---

## 7. DDD Context Map Alignment Notes

### Alignment A - Supporting Domain and Phase

The DDD Context Map identifies Document Management as a Supporting Domain and lists it in Phase 1. This FRD keeps the module focused on document upload, type, verification, approval/rejection, expiry tracking, and compliance visibility.

### Alignment B - Ownership

DDD data ownership explicitly assigns `Document, verification, expiry` to Document Management. This FRD therefore makes Document Management the owner of Document and DocumentVerification business state, while treating AuditLog, NotificationLog, StudentProfile, TrainerProfile, CorporateAccount, and Person as externally owned references.

### Alignment C - Owner Types

DDD says documents may belong to students, trainers, employees, or corporate accounts. ER additionally includes Person. This FRD supports Student, Trainer, Corporate, and Person now and treats Employee as future-gated because HRMS is explicitly a future phase.

### Alignment D - Workflow

DDD defines the workflow statuses:

```text
Uploaded
PendingVerification
Approved
Rejected
Expired
```

The FRD uses exactly these values and does not invent additional verification states.

### Alignment E - Expiry Tracking

DDD specifically requires expiry tracking for Civil ID, Passport, Visa, contracts, and licenses. The FRD supports issue/expiry dates and expiry work queues without hardcoding document types as domain enums; type definitions remain configurable.

### Alignment F - Scheduling Boundary

DDD says expiry alert scheduling details belong in Architecture/NFR. This FRD therefore specifies the business requirement to detect and surface expiry and the integration boundary for notifications, but not a fixed cron cadence or queue architecture.

### Alignment G - Audit Boundary

DDD states all contexts send critical actions to Audit & Compliance. The FRD preserves this by making Audit & Compliance the owner of AuditLog while Document Management supplies document action facts.

### Alignment H - Modular Monolith

DDD specifies a Next.js monorepo modular structure with a `documents` package and shared infrastructure. The FRD assumes an in-process modular boundary and an infrastructure storage adapter, not a separate document microservice.

---

## 8. ER Model Alignment Notes

### Alignment A - Document Fields

The ER model defines:

```text
id
ownerType
ownerId
documentType
fileName
fileUrl
issueDate
expiryDate
verificationStatus
uploadedBy
verifiedBy
verifiedAt
```

All core functional requirements map to these fields. The FRD intentionally does not declare new provider-specific persistence fields as facts.

### Alignment B - DocumentVerification Fields

The ER model defines:

```text
id
documentId
status
remarks
verifiedBy
verifiedAt
```

The FRD uses this entity as immutable verification decision history.

### Alignment C - Status Values

The FRD uses only ER-listed values: Uploaded, PendingVerification, Approved, Rejected, Expired.

### Alignment D - Soft Delete and Auditing

The ER model recommends common operational fields including `deletedAt`, audit metadata, and `version`. The FRD requires soft deletion and recommends optimistic concurrency where the actual schema follows those conventions.

### Alignment E - AuditLog

The ER AuditLog model includes entityType, entityId, action, oldValue, newValue, performedBy, performedAt, ipAddress, and reason. The FRD audit requirement maps directly to those attributes.

---

## 9. Identified Gaps and Conflict Analysis

### GAP-DOC-001 - No Explicit `branchId` on Document
**Status: Resolved in Prisma.** The database schema contains a direct `branchId` column on `Document`. Branch isolation checks will directly utilize this column. At upload time, `branchId` is derived from the owner and persisted on the `Document` record.

---

### GAP-DOC-002 - DDD Conceptual DocumentType vs ER Scalar Field
**Status: Align Gap.** Prisma hardcodes document types as the enum `DocumentType`. Restricting inputs to enum values is required until a database migration introduces a Configuration lookups relation.

---

### GAP-DOC-003 - Blob Operational Metadata Not Defined
**Status: Align Gap.** Prisma uses `fileKey` (VarChar 255) for the Blob path and has added `fileType` (VarChar 100) for the MIME type. If size, checksum, or ETag reconciliation is needed later, additional fields must be migrated.

---

### GAP-DOC-004 - Current Status vs History Synchronization
**Status: Align Gap.** Conceptual lifecycle states are separated in Prisma into `Document.status` (`Draft`, `Active`, `Expired`, `Replaced`, `Deleted`) and `DocumentVerification.outcome` (`Pending`, `Verified`, `Rejected`). Transactions must map transitions across these fields consistently.

---

### GAP-DOC-005 - Employee Owner Is Future Phase
**Status: Open.** Keep Employee owner type disabled until an HRMS-owned identity is implemented; do not create employee records locally.

---

### GAP-DOC-006 - Expired as Verification Status
**Status: Align Gap.** Prisma includes `Expired` in `DocumentStatus`. A background cron job must be scheduled to evaluate document expiration dates and transition `status` to `Expired`.

---

### GAP-DOC-007 - Prisma Validation
**Status: Resolved.** The codebase's actual `packages/database/prisma/schema.prisma` has been validated. Polymorphic owner mapping is resolved via a separate `DocumentOwner` table, and branch scoping uses direct `branchId`.

---

### GAP-DOC-008 - Missing Date and Version fields in Prisma (CRITICAL IMPLEMENTATION GAP)
**Status: Open.** The actual `Document` model in `schema.prisma` is currently missing the `issueDate`, `expiryDate`, and `version` (optimistic locking) fields. These must be added via a database migration before implementation.

---

## 10. Part 1 Consistency Check

| Check | Result |
|---|---|
| Document Management ownership preserved | Pass |
| Enrollment aggregate ownership affected | No; no learning lifecycle is moved into Document Management |
| Person/Party duplication introduced | No |
| Student ownership duplicated | No |
| Trainer ownership duplicated | No |
| CorporateAccount ownership duplicated | No |
| Certificate ownership duplicated | No |
| Finance ownership duplicated | No |
| AuditLog ownership preserved | Pass |
| Communication ownership preserved | Pass |
| Branch isolation addressed | Pass (using direct `branchId` column on `Document`) |
| Soft-delete convention respected | Pass |
| Vercel Blob treated as infrastructure | Pass |
| Unsupported microservice/broker/CQRS introduced | No |
| DDD workflow statuses preserved | Pass |
| ER entities mapped | Pass |
| Prisma alignment completed | Pass (schema validated and mismatches reconciled) |

---

## 11. Part 1 Conclusion

Module 13 is defined as a focused Document Management bounded context responsible for document metadata, owner references (via `DocumentOwner` table), Blob file linkage, verification workflow, verification history, expiry facts, and compliance-oriented operational visibility.

The module does not own the people or organizations whose documents it stores. It does not absorb Certificate, Finance, Completion, IAM, Audit, Notification, or Reporting transaction ownership. Vercel Blob is used for binary storage only, with secure access and failure reconciliation requirements separated from domain state.

The most significant design items requiring resolution are applying database migrations to add the missing date and version columns, and setting up the background scheduler for expiry evaluations.


