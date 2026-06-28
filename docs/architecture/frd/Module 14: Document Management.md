# Functional Requirement Document

## Module 14: Document Management

**Version:** 1.1
**Module Code:** DOC
**Phase:** Phase 1
**Owned Bounded Context:** Document Management

**Dependencies:**

* Identity & Access Management
* Admission & Enrollment Management
* Faculty / Trainer Management
* Corporate Training Management
* Certificate Management
* Organization Management

**Provides Data To:**

* Admissions & Enrollment
* Student Portal
* Trainer Portal
* Corporate Training
* Certificate Management
* Audit & Compliance
* Reporting & Dashboard Management

---

# 1. Business Purpose

Document Management stores, verifies, organizes, and audits documents used across the institute.

The context owns the document metadata, verification state, version history, and access log. The owning business context remains responsible for deciding whether a document is required and whether it satisfies a business rule.

Document Management also owns expiry metadata for compliance-sensitive files such as Civil ID, visa, passport, staff contract, trainer credential, and certificate-supporting documents. It raises expiry and verification events; account holds or business status changes must be performed by the owning context.

---

# 2. Scope

## 2.1 In Scope

* Document type configuration
* Secure document upload and storage metadata
* Document version history
* Document verification and approval
* Expiry tracking
* Replacement and re-upload
* Access logging and audit support
* Role-based document visibility
* Critical document expiry alerts at configured intervals

## 2.2 Out of Scope for Phase 1

* Full ECM / DMS workflow automation
* Optical character recognition pipeline
* eSignature workflow
* Public document self-service portal

---

# 3. Owned Concepts

The Document context owns:

* DocumentType
* Document
* DocumentVersion
* DocumentVerification

Notes:

* Student, Trainer, Corporate Account, Corporate Participant, Admission, Enrollment, and Certificate are referenced from upstream contexts.
* File storage may use object storage, but document ownership and verification state remain in this context.

---

# 4. Business Principles

* Document metadata and file version are separate concerns.
* Verification decisions must be traceable to a user, role, and timestamp.
* A document replacement must preserve the historical record.
* Expiry state must be derived from the document dates and policy.
* Sensitive documents must be protected by access control and audit logging.
* A document type may be mandatory for one entity type and optional for another.
* Verification status must not be changed by the owning business module directly.

---

# 5. Business Model

## 5.1 Document Categories

```text
Identity Documents
Academic Documents
Training Documents
Employment Documents
Compliance Documents
Contract Documents
Certificate Attachments
Other Documents
```

## 5.2 Supported Entity Types

```text
Student
Trainer
Corporate Account
Corporate Participant
Admission
Enrollment
Contract
Certificate
Branch
```

## 5.3 Document Lifecycle

```text
Draft
  ↓
Uploaded
  ↓
Pending Verification
  ↓
Approved
```

Alternative flows:

```text
Pending Verification
  ↓
Rejected
```

```text
Approved
  ↓
Superseded
```

```text
Approved
  ↓
Expired
```

---

# 6. Screens

## DOC-UI-001 Document Dashboard

### Purpose

Provide document operational overview.

### Widgets

```text
Uploaded Today
Pending Verification
Approved Today
Rejected Today
Expiring Soon
Missing Mandatory Documents
```

### Filters

```text
Entity Type
Document Type
Status
Branch
Expiry Status
Date Range
```

## DOC-UI-002 Document Type Configuration

### Fields

```text
Document Type Code
Document Type Name
Category
Entity Type
Required
Verification Required
Expiry Tracking Enabled
Status
```

### Actions

```text
Create
Edit
Activate
Deactivate
Archive
```

## DOC-UI-003 Document Repository

### Columns

```text
Document Number
Document Type
Entity Type
Entity Name
Uploaded Date
Expiry Date
Status
Actions
```

### Actions

```text
View
Download
Verify
Approve
Reject
Replace
View History
```

## DOC-UI-004 Upload or Replace Document

### Fields

```text
Entity Type
Entity Reference
Document Type
Document Number
Issue Date
Expiry Date
File
Remarks
```

---

# 7. Functional Requirements

* The system shall allow authorized users to configure document types by entity type and category.
* The system shall allow uploading a new document version against an existing document reference.
* The system shall allow verification, approval, and rejection with a recorded reason.
* The system shall show expiry warnings before a document becomes expired.
* The system shall preserve older versions when a document is replaced.
* The system shall enforce branch and role-based visibility for sensitive documents.
* The system shall support document requirement checks from upstream business contexts.
* The system shall record every view, download, upload, verification, and replacement action.

---

# 8. Audit Events

The module shall emit audit events for:

```text
DocumentTypeCreated
DocumentTypeUpdated
DocumentUploaded
DocumentVerified
DocumentApproved
DocumentRejected
DocumentReplaced
DocumentExpired
DocumentAccessed
```

---

# 9. Domain Errors

```text
DOCUMENT_TYPE_INACTIVE
DOCUMENT_ALREADY_VERIFIED
DOCUMENT_VERIFICATION_REQUIRED
DOCUMENT_EXPIRED
DOCUMENT_VERSION_LOCKED
DOCUMENT_ACCESS_DENIED
DOCUMENT_ENTITY_NOT_ALLOWED
```

---

# 10. Reporting Views

```text
Mandatory Document Completion
Pending Verification Queue
Expiry Risk List
Rejected Documents
Document Activity Summary
Branch Document Coverage
```
