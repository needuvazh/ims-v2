# Functional Requirement Document (FRD)

## Module 13: Certificate Management

**Version:** 1.0
**Module Code:** CERT

**Dependencies:**

* Student Management
* Enrollment Management
* Course & Batch Management
* Completion Management
* Corporate Training Management

**Provides Data To:**

* Student Portal
* Public Verification Portal
* Corporate Reporting
* Audit & Compliance

---

# 1. Business Purpose

Certificate Management is responsible for generating, issuing, verifying, reissuing, and tracking certificates awarded to students and corporate participants.

The module shall support:

* Certificate Templates
* Certificate Generation
* Certificate Approval
* Certificate Issuance
* QR Verification
* Public Verification Portal
* Corporate Certificates
* Arabic & English Certificates
* Certificate Reissue
* Certificate Audit Tracking

---

# 2. Certificate Architecture

```text
Course
    ↓
Enrollment
    ↓
Completion Approved
    ↓
Certificate Eligibility
    ↓
Certificate Generated
    ↓
Certificate Issued
    ↓
Certificate Verification
```

---

# 3. Certificate Types

The system shall support:

```text
Course Completion Certificate
Attendance Certificate
Exam Pass Certificate
Corporate Training Certificate
Walk-In Training Certificate
Custom Certificate
```

---

# 4. Certificate Lifecycle

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

---

### Reissue Flow

```text
Issued
   ↓
Reissue Requested
   ↓
Approved
   ↓
Reissued
```

---

# 5. Screens

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
```

### Filters

```text
Branch
Course
Batch
Certificate Type
Status
Date Range
```

---

# 6. Certificate Template Management

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
```

### Permissions

```text
CERT_TEMPLATE_VIEW
CERT_TEMPLATE_CREATE
CERT_TEMPLATE_EDIT
CERT_TEMPLATE_ACTIVATE
```

---

## CERT-UI-003 Certificate Template Screen

### Template Information

Fields:

```text
Template Code
Template Name
Certificate Type
Language
Status
```

---

### Supported Languages

```text
English
Arabic
```

---

### Template Placeholders

Supported Variables:

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

Example:

```text
This is to certify that {{StudentName}}
has successfully completed
{{CourseName}}
```

---

### Business Rules

* Multiple templates allowed.
* One active template per certificate type and language.
* Template changes should not affect previously issued certificates.

---

# 7. Certificate Generation

## CERT-UI-004 Generate Certificate

### Purpose

Generate certificates for eligible students.

### Filters

```text
Branch
Course
Batch
Completion Status
```

---

### Actions

```text
Generate Certificate
Preview Certificate
Bulk Generate
```

---

### Business Rules

Certificate generation allowed only if:

```text
Completion Approved
AND
Attendance Eligible
AND
Exam Passed (if required)
AND
Fee Cleared (if required)
```

---

# 8. Certificate Approval

## CERT-UI-005 Certificate Approval Screen

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

---

### Business Rules

* Approval required only if enabled.
* Rejection requires remarks.
* Approval action audited.

---

# 9. Certificate Issuance

## CERT-UI-006 Certificate Issue Screen

### Certificate Information

```text
Certificate Number
Student
Course
Issue Date
Status
```

---

### Actions

```text
Issue Certificate
Download PDF
Print Certificate
Email Certificate
```

---

### Business Rules

* Certificate Number unique.
* Certificate immutable after issuance.
* PDF snapshot preserved permanently.

---

# 10. Certificate Numbering

### Format

Tenant configurable.

Examples:

```text
CERT-2026-00001

IOSH-2026-00001

ALS-000001
```

---

### Business Rules

* Certificate Number unique globally.
* Number cannot be modified after issuance.
* Numbers never reused.

---

# 11. QR Verification

## CERT-UI-007 QR Generation

### Purpose

Generate verification QR code.

### QR Content

Contains:

```text
Certificate Verification URL
```

Example:

```text
https://verify.company.com/certificate/CERT-2026-00001
```

---

### Business Rules

* QR automatically generated.
* QR embedded on certificate PDF.
* QR remains valid after issuance.

---

# 12. Public Verification Portal

## CERT-UI-008 Public Verification

### Access

Public users can:

```text
Enter Certificate Number
OR
Scan QR Code
```

---

### Display

```text
Certificate Number
Student Name
Course Name
Issue Date
Certificate Status
```

---

### Verification Status

```text
Valid
Invalid
Revoked
Expired
```

---

### Business Rules

* No login required.
* Verification available 24/7.
* Revoked certificates must display status.

---

# 13. Certificate Reissue

## CERT-UI-009 Reissue Request

### Fields

```text
Certificate Number
Reason
```

### Reasons

```text
Lost Certificate
Damaged Certificate
Name Correction
Format Update
```

---

### Actions

```text
Submit Request
Approve
Reject
```

---

### Business Rules

* Original certificate remains in history.
* Reissued certificate references original certificate.
* Reissue action audited.

---

# 14. Corporate Certificates

## CERT-UI-010 Corporate Certificate Settings

### Additional Fields

```text
Corporate Customer Name
Corporate Logo
Program Name
Contract Reference
```

---

### Business Rules

* Corporate branding optional.
* Corporate certificates linked to training programs.

---

# 15. Arabic Certificate Support

### Supported Templates

```text
English
Arabic
```

---

### Business Rules

* Separate template per language.
* RTL rendering supported.
* Arabic certificates printable.

---

# 16. Student Portal Certificate View

Students may view:

```text
Issued Certificates
Certificate Status
Download PDF
Verification QR
```

Read-only.

---

# 17. Corporate Certificate Reports

Corporate users may view:

```text
Participants
Completion Status
Certificates Issued
Certificates Pending
```

Future portal feature.

---

# 18. Certificate Revocation

## CERT-UI-011 Revoke Certificate

### Fields

```text
Certificate Number
Reason
```

---

### Actions

```text
Revoke
Cancel
```

---

### Reasons

```text
Issued In Error
Fraudulent Record
Duplicate Certificate
Compliance Issue
```

---

### Business Rules

* Revocation requires authorization.
* Revoked certificates remain in history.
* Verification portal displays Revoked status.

---

# 19. Functional Requirements

## FR-CERT-001 Template Management

The system shall support certificate template management.

---

## FR-CERT-002 Certificate Generation

The system shall generate certificates automatically.

---

## FR-CERT-003 Eligibility Validation

The system shall validate certificate eligibility.

---

## FR-CERT-004 Certificate Approval

The system shall support approval workflow.

---

## FR-CERT-005 Certificate Issuance

The system shall support certificate issuance.

---

## FR-CERT-006 Certificate Numbering

The system shall support configurable certificate numbering.

---

## FR-CERT-007 QR Verification

The system shall generate QR-based verification.

---

## FR-CERT-008 Public Verification Portal

The system shall provide public certificate verification.

---

## FR-CERT-009 Certificate Reissue

The system shall support certificate reissue.

---

## FR-CERT-010 Corporate Certificates

The system shall support corporate-branded certificates.

---

## FR-CERT-011 Arabic Certificates

The system shall support Arabic certificate templates.

---

## FR-CERT-012 Certificate Revocation

The system shall support certificate revocation.

---

## FR-CERT-013 Certificate Audit Trail

The system shall maintain certificate history.

---

# 20. Notifications

### Certificate Generated

Notify:

```text
Student
Coordinator
```

---

### Certificate Approved

Notify:

```text
Student
Counselor
```

---

### Certificate Issued

Notify:

```text
Student
Branch Manager
```

---

### Reissue Requested

Notify:

```text
Admin
Coordinator
```

---

### Certificate Revoked

Notify:

```text
Management
Coordinator
```

---

# 21. Reports

## Operational Reports

```text
Certificate Generation Report
Certificate Issue Report
Pending Certificate Report
```

---

## Compliance Reports

```text
Certificate Verification Report
Revoked Certificate Report
Reissued Certificate Report
```

---

## Corporate Reports

```text
Corporate Certificate Report
Corporate Completion Certificate Report
```

---

## Management Reports

```text
Certificates By Course
Certificates By Branch
Certificates By Trainer
```

---

# 22. Audit Requirements

Audit:

```text
Template Created
Template Updated
Certificate Generated
Certificate Approved
Certificate Rejected
Certificate Issued
Certificate Reissued
Certificate Revoked
```

Capture:

```text
User
Action
Timestamp
Old Value
New Value
Reason
```

---

# 23. Critical Design Decisions

### Certificate Snapshot Strategy

Recommended:

```text
Generate PDF Snapshot
Store Snapshot
```

Reason:

Future template changes must not affect historical certificates.

---

### Verification Source

Verification should use:

```text
Certificate Number
```

as primary key.

Not student name.

---

### Immutable Issued Certificates

Issued certificates should never be edited.

Use:

```text
Reissue
```

instead of update.

---

### QR Verification

QR should point to:

```text
Public Verification Endpoint
```

rather than embedding raw student data.

---

# 24. Integration Points

### Consumes

```text
Completion Management
Student Management
Corporate Training
Course Rules
```

### Provides Data To

```text
Student Portal
Verification Portal
Reporting
Compliance
```
