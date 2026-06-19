# Functional Requirement Document

## Module 13: Certificate Management

**Version:** 1.1
**Module Code:** CERT
**Phase:** Phase 1
**Owned Bounded Context:** Certificate Management

**Dependencies:**

* Exam, Result & Completion Management
* Admission & Enrollment Management
* Course & Batch Management
* Corporate Training Management
* Identity & Access Management
* Document Management

**Provides Data To:**

* Student Portal
* Public Verification Portal
* Corporate Reporting
* Audit & Compliance

---

# 1. Business Purpose

Certificate Management generates, issues, verifies, reissues, and revokes certificates for learners and corporate participants.

The context owns certificate templates, certificate numbers, certificate issuance, public verification, reissue, and revocation history.

Certificate issuance is allowed only after approved completion eligibility is available from the completion context.

---

# 2. Scope

## 2.1 In Scope

* Certificate template management
* Certificate generation
* Certificate approval
* Certificate issuance
* QR verification
* Public verification portal data
* Certificate reissue
* Certificate revocation
* Arabic and English certificate support
* Corporate certificate branding metadata
* Certificate audit tracking

## 2.2 Out of Scope for Phase 1

* Certificate design marketplace
* Dynamic CMS-based template authoring
* Student-uploaded certificate generation

---

# 3. Business Principles

* Certificate issuance must be based on approved completion eligibility.
* Certificates are immutable after issuance.
* Issued certificate PDFs must be preserved.
* Template changes must not affect already issued certificates.
* Certificate numbers must be unique and never reused.
* Public verification must expose only safe verification data.
* Reissue creates a new issued artifact while preserving the original certificate history.
* Revocation must retain history and verification trail.
* Arabic certificates must support RTL rendering.

---

# 4. Owned Concepts

The Certificate context owns:

* CertificateTemplate
* CertificateTemplateVersion
* Certificate
* CertificateVerificationLog
* CertificateReissueRequest
* CertificateRevocationLog
* CertificateNumberPolicy

Notes:

* Completion eligibility is consumed from Exam, Result & Completion Management.
* Student and Corporate Participant are referenced from upstream contexts.
* Certificate storage and PDF snapshot generation may use document storage infrastructure, but certificate ownership remains here.

---

# 5. Business Model

## 5.1 Certificate Types

The system shall support:

```text
Course Completion Certificate
Attendance Certificate
Exam Pass Certificate
Corporate Training Certificate
Walk-In Training Certificate
Custom Certificate
```

Rules:

* Certificate type determines required issuance data and template binding.
* Course completion and corporate certificate issuance must respect completion approval state.

## 5.2 Certificate Lifecycle

```text
Draft
  ↓
Generated
  ↓
Pending Approval
  ↓
Issued
```

Alternative:

```text
Generated
  ↓
Rejected
```

Alternative:

```text
Issued
  ↓
Revoked
```

## 5.3 Reissue Lifecycle

```text
Issued
  ↓
Reissue Requested
  ↓
Approved
  ↓
Reissued
```

Alternative:

```text
Reissue Requested
  ↓
Rejected
```

Rules:

* Reissue must keep the original certificate record.
* Reissue must assign a new unique certificate number.
* Reissue must retain reason and approval trail.

## 5.4 Template Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
  ↓
Archived
```

Rules:

* One active template per certificate type, language, and course-specific combination is allowed where configured.
* Template updates must create a new version or use authorized override rules.

---

# 6. Screens

## CERT-UI-001 Certificate Dashboard

### Purpose

Provide certificate overview.

### Widgets

```text
Certificates Generated
Certificates Issued
Pending Approval
Pending Reissue
Rejected Certificates
Revoked Certificates
```

### Filters

```text
Branch
Course
Batch
Certificate Type
Status
Date Range
Search
```

---

## CERT-UI-002 Certificate Template List

### Columns

```text
Template Code
Template Name
Certificate Type
Language
Status
Actions
```

### Actions

```text
Create Template
Edit Template
Preview Template
Activate
Deactivate
Archive
```

### Permissions

```text
CERT_TEMPLATE_VIEW
CERT_TEMPLATE_CREATE
CERT_TEMPLATE_EDIT
CERT_TEMPLATE_ACTIVATE
CERT_TEMPLATE_DEACTIVATE
CERT_TEMPLATE_ARCHIVE
```

---

## CERT-UI-003 Certificate Template Screen

### Fields

```text
Template Code
Template Name
Certificate Type
Language
Course
Status
Template File
Placeholder Configuration
Effective Start Date
Effective End Date
```

### Supported Languages

```text
English
Arabic
```

### Template Placeholders

```text
StudentName
CourseName
BatchName
CertificateNumber
IssueDate
CompletionDate
TrainerName
CorporateCustomer
```

### Business Rules

* Multiple templates are allowed.
* One active template per certificate type and language is allowed.
* Template changes must not affect previously issued certificates.
* Arabic templates must support RTL rendering.

---

## CERT-UI-004 Generate Certificate

### Purpose

Generate certificates for eligible learners.

### Filters

```text
Branch
Course
Batch
Completion Status
Certificate Type
Search
```

### Actions

```text
Generate Certificate
Preview Certificate
Bulk Generate
```

### Business Rules

* Certificate generation is allowed only when completion eligibility is approved.
* Generated certificate data must be immutable after issuance.
* Bulk generation must validate each target record independently.

---

## CERT-UI-005 Certificate Approval

### Fields

```text
Approval Decision
Remarks
```

### Decisions

```text
Approve
Reject
```

### Business Rules

* Approval is required only if enabled by policy.
* Rejection requires remarks.
* Approval action must be audited.

---

## CERT-UI-006 Certificate Issue Screen

### Certificate Information

```text
Certificate Number
Student
Course
Issue Date
Status
```

### Actions

```text
Issue Certificate
Download PDF
Print Certificate
Email Certificate
```

### Business Rules

* Certificate number must be unique.
* Certificate must be immutable after issuance.
* PDF snapshot must be preserved permanently.

---

## CERT-UI-007 QR Verification

### Purpose

Generate verification QR code.

### QR Content

```text
Certificate Verification URL
```

### Business Rules

* QR code is automatically generated.
* QR code must be embedded on the certificate PDF.
* QR verification must resolve to safe public data only.

---

## CERT-UI-008 Public Verification

### Access

Public users can:

```text
Enter Certificate Number
OR
Scan QR Code
```

### Display

```text
Certificate Number
Certificate Type
Issued To
Course
Issue Date
Status
Verification Result
```

### Business Rules

* Public verification must not expose private learner data.
* Revoked and reissued states must be visible.

---

## CERT-UI-009 Reissue Request

### Fields

```text
Certificate
Reason
Remarks
```

### Actions

```text
Submit
Cancel
```

### Business Rules

* Reissue requires a reason.
* Reissue must preserve original certificate history.
* Reissued certificate must get a new certificate number.

---

## CERT-UI-010 Corporate Certificate Settings

### Additional Fields

```text
Corporate Customer
Branding Name
Logo
Footer Text
Signature Configuration
```

### Business Rules

* Corporate branding settings are applied only when configured.
* Corporate branding must not alter core verification data.

---

## CERT-UI-011 Revoke Certificate

### Fields

```text
Certificate
Reason
Remarks
```

### Actions

```text
Revoke
Cancel
```

### Business Rules

* Revoke requires reason and audit trail.
* Revoked certificates remain verifiable as revoked.

---

# 7. Functional Requirements

## FR-CERT-001 Manage Templates

The system shall support certificate template management.

## FR-CERT-002 Generate Certificates

The system shall generate certificates for eligible completion records.

## FR-CERT-003 Validate Eligibility

The system shall validate certificate eligibility before issuance.

## FR-CERT-004 Approve Certificates

The system shall support certificate approval when enabled.

## FR-CERT-005 Issue Certificates

The system shall issue certificates after approval.

## FR-CERT-006 Number Certificates

The system shall generate unique certificate numbers.

## FR-CERT-007 Generate QR Verification

The system shall generate QR verification for issued certificates.

## FR-CERT-008 Public Verification Portal

The system shall provide a public verification view for safe certificate verification.

## FR-CERT-009 Reissue Certificates

The system shall support certificate reissue.

## FR-CERT-010 Corporate Certificates

The system shall support corporate certificate branding.

## FR-CERT-011 Arabic Certificates

The system shall support Arabic certificate templates.

## FR-CERT-012 Revoke Certificates

The system shall support certificate revocation.

## FR-CERT-013 Audit Certificate History

The system shall maintain certificate audit trails.

---

# 8. Audit Events

The following audit events shall be supported:

```text
CertificateTemplateCreated
CertificateTemplateUpdated
CertificateTemplateActivated
CertificateTemplateDeactivated
CertificateGenerated
CertificateApproved
CertificateIssued
CertificateQRCodeGenerated
CertificateVerificationViewed
CertificateReissueRequested
CertificateReissued
CertificateRevoked
CertificatePdfSnapshotCreated
CertificateNumberGenerated
```

Rules:

* Certificate generation, approval, issuance, reissue, and revocation must be auditable.
* Public verification access must be logged.
* PDF snapshot creation must be preserved.

---

# 9. Domain Errors

The module shall distinguish between validation and business-rule errors such as:

```text
CertificateEligibilityNotMet
CertificateAlreadyIssued
CertificateAlreadyRevoked
CertificateAlreadyReissued
CertificateApprovalRequired
TemplateInactive
TemplateNotFound
TemplateLanguageNotSupported
TemplateVersionConflict
CertificateNumberAlreadyExists
InvalidCertificateStateTransition
ReissueReasonRequired
RevocationReasonRequired
PublicVerificationNotFound
CorporateBrandingNotConfigured
CompletionApprovalMissing
StudentInactive
CorporateParticipantInactive
```

---

# 10. Reporting and Operational Views

The Certificate context shall support the following read views:

```text
Certificate Dashboard
Template List
Issued Certificate List
Pending Approval List
Reissue Queue
Revoked Certificate List
Public Verification Lookup
Corporate Certificate Report
Audit History
```

These are read models and operational views, not separate owned entities.

---

# 11. FRD Improvement Notes

This module should remain the single source of truth for:

* certificate templates
* certificate numbering
* issuance and immutability
* verification and QR traceability
* reissue and revocation

It should not own completion eligibility or attendance calculation.
