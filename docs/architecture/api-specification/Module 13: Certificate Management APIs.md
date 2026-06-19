# Detailed API Contract Specification

## Module 13: Certificate Management APIs

**Version:** 1.0
**Base URL:** `/api/v1`
**Module Code:** `CERT`

---

# 1. Module Purpose

Certificate Management APIs manage certificate templates, certificate generation, approval, issuance, QR verification, public verification, reissue, revocation, and certificate downloads.

This module supports:

* Certificate template management
* English and Arabic certificate templates
* Certificate eligibility validation
* Certificate generation
* Certificate approval
* Certificate issuance
* Certificate PDF generation
* QR verification
* Public verification
* Certificate reissue
* Certificate revocation
* Student certificate view
* Corporate certificate view

---

# 2. Security Requirements

All Certificate APIs require authentication except public verification APIs.

Protected APIs must enforce:

```text
Permission
Branch Scope
Course Scope
Student Data Scope
Corporate Data Scope
Audit Logging
```

Public verification APIs must expose only safe certificate verification data.

---

# 3. Certificate Template APIs

## 3.1 Get Certificate Templates

```http
GET /api/v1/certificate-templates
```

### Permission

```text
CERT_TEMPLATE_VIEW
```

### Query Parameters

```text
page
limit
search
certificateType
language
courseId
status
sortBy
sortOrder
```

---

## 3.2 Create Certificate Template

```http
POST /api/v1/certificate-templates
```

### Permission

```text
CERT_TEMPLATE_CREATE
```

### Request

```json
{
  "templateCode": "CERT-TPL-IOSH-EN",
  "templateName": "IOSH English Certificate Template",
  "certificateType": "CourseCompletionCertificate",
  "language": "English",
  "courseId": "crs_001",
  "templateFileId": "file_001",
  "placeholderConfig": [
    "StudentName",
    "CourseName",
    "CertificateNumber",
    "IssueDate",
    "CompletionDate",
    "TrainerName",
    "CorporateCustomer"
  ],
  "status": "Draft"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Certificate template created successfully",
  "data": {
    "templateId": "ctpl_001",
    "templateCode": "CERT-TPL-IOSH-EN",
    "templateName": "IOSH English Certificate Template",
    "status": "Draft"
  }
}
```

### Supported Certificate Types

```text
CourseCompletionCertificate
AttendanceCertificate
ExamPassCertificate
CorporateTrainingCertificate
WalkInTrainingCertificate
CustomCertificate
```

### Supported Languages

```text
English
Arabic
```

### Validations

```text
Template code is required
Template name is required
Certificate type is required
Language is required
Template file is required
Template code must be unique
```

### Business Rules

```text
One active template per certificate type, language, and course where course-specific template is configured
Template changes must not affect previously issued certificates
Arabic templates must support RTL rendering
Template creation must be audited
```

### Audit

```text
CertificateTemplateCreated
```

---

## 3.3 Get Certificate Template Details

```http
GET /api/v1/certificate-templates/{templateId}
```

### Permission

```text
CERT_TEMPLATE_VIEW
```

---

## 3.4 Update Certificate Template

```http
PATCH /api/v1/certificate-templates/{templateId}
```

### Permission

```text
CERT_TEMPLATE_EDIT
```

### Request

```json
{
  "templateName": "IOSH English Certificate Template Updated",
  "templateFileId": "file_002",
  "placeholderConfig": [
    "StudentName",
    "CourseName",
    "CertificateNumber",
    "IssueDate",
    "CompletionDate"
  ],
  "status": "Draft"
}
```

### Business Rules

```text
Updating template must not modify issued certificate PDFs
If template is active and used, update should create a new version or require authorized override
```

---

## 3.5 Activate Certificate Template

```http
POST /api/v1/certificate-templates/{templateId}/activate
```

### Permission

```text
CERT_TEMPLATE_ACTIVATE
```

### Business Rules

```text
Only valid templates can be activated
Activating one template may deactivate another active template for same certificate type/language/course combination
```

---

## 3.6 Deactivate Certificate Template

```http
POST /api/v1/certificate-templates/{templateId}/deactivate
```

### Permission

```text
CERT_TEMPLATE_DEACTIVATE
```

### Request

```json
{
  "reason": "Template replaced"
}
```

### Validations

```text
Reason is required
```

---

## 3.7 Preview Certificate Template

```http
POST /api/v1/certificate-templates/{templateId}/preview
```

### Permission

```text
CERT_TEMPLATE_VIEW
```

### Request

```json
{
  "sampleData": {
    "StudentName": "Ahmed Ali",
    "CourseName": "IOSH Managing Safely",
    "CertificateNumber": "CERT-2026-00001",
    "IssueDate": "2026-07-30",
    "CompletionDate": "2026-07-25",
    "TrainerName": "Ahmed Trainer",
    "CorporateCustomer": "ABC Oil & Gas LLC"
  }
}
```

### Response

```json
{
  "success": true,
  "data": {
    "previewFileUrl": "https://signed-url/certificate-preview.pdf"
  }
}
```

---

# 4. Certificate Generation APIs

## 4.1 Get Certificates

```http
GET /api/v1/certificates
```

### Permission

```text
CERTIFICATE_VIEW
```

### Query Parameters

```text
page
limit
search
studentId
enrollmentId
courseId
batchId
branchId
certificateType
certificateStatus
issuedFrom
issuedTo
sortBy
sortOrder
```

---

## 4.2 Generate Certificate

```http
POST /api/v1/certificates/generate
```

### Permission

```text
CERTIFICATE_GENERATE
```

### Request

```json
{
  "enrollmentId": "enr_001",
  "certificateType": "CourseCompletionCertificate",
  "language": "English",
  "templateId": "ctpl_001",
  "remarks": "Certificate generated after completion approval"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Certificate generated successfully",
  "data": {
    "certificateId": "cert_001",
    "certificateNumber": "CERT-2026-00001",
    "certificateStatus": "Generated",
    "verificationUrl": "https://verify.example.com/certificate/CERT-2026-00001"
  }
}
```

### Validations

```text
Enrollment is required
Certificate type is required
Language is required
Template is required
```

### Business Rules

```text
Enrollment must be completed or certificate eligible
Completion approval must exist
Attendance eligibility must pass if required
Exam pass must exist if required
Fee clearance must pass if required
Duplicate active certificate for same enrollment and certificate type should be prevented unless reissue flow is used
Certificate number must be auto-generated and unique
QR verification URL must be generated
Certificate PDF generation may be synchronous or background job
Generation must be audited
```

### Events

```text
CertificateGenerated
CertificatePdfGenerationRequested
```

---

## 4.3 Bulk Generate Certificates

```http
POST /api/v1/certificates/bulk-generate
```

### Permission

```text
CERTIFICATE_GENERATE
```

### Request

```json
{
  "batchId": "bat_001",
  "certificateType": "CourseCompletionCertificate",
  "language": "English",
  "templateId": "ctpl_001",
  "onlyEligible": true,
  "remarks": "Bulk certificate generation"
}
```

### Business Rules

```text
Only eligible enrollments should be processed when onlyEligible is true
Failures must be reported per enrollment
Bulk generation should run as background job for large batches
```

---

## 4.4 Preview Certificate Before Generation

```http
POST /api/v1/certificates/preview
```

### Permission

```text
CERTIFICATE_GENERATE
```

### Request

```json
{
  "enrollmentId": "enr_001",
  "certificateType": "CourseCompletionCertificate",
  "language": "English",
  "templateId": "ctpl_001"
}
```

---

# 5. Certificate Details APIs

## 5.1 Get Certificate Details

```http
GET /api/v1/certificates/{certificateId}
```

### Permission

```text
CERTIFICATE_VIEW
```

### Response

```json
{
  "success": true,
  "data": {
    "certificateId": "cert_001",
    "certificateNumber": "CERT-2026-00001",
    "certificateType": "CourseCompletionCertificate",
    "certificateStatus": "Issued",
    "language": "English",
    "student": {
      "id": "std_001",
      "studentNumber": "STD-2026-00001",
      "fullName": "Ahmed Ali"
    },
    "course": {
      "id": "crs_001",
      "courseName": "IOSH Managing Safely"
    },
    "enrollmentId": "enr_001",
    "issuedDate": "2026-07-30",
    "verificationUrl": "https://verify.example.com/certificate/CERT-2026-00001",
    "pdfAvailable": true
  }
}
```

---

## 5.2 Download Certificate PDF

```http
GET /api/v1/certificates/{certificateId}/download
```

### Permission

```text
CERTIFICATE_DOWNLOAD
```

### Business Rules

```text
Certificate download must be audited
Student portal users can download only their own certificates
Download should use signed URL or stream after permission check
```

---

# 6. Certificate Approval APIs

## 6.1 Approve Certificate

```http
POST /api/v1/certificates/{certificateId}/approve
```

### Permission

```text
CERTIFICATE_APPROVE
```

### Request

```json
{
  "remarks": "Certificate verified and approved"
}
```

### Business Rules

```text
Approval required only if certificate approval workflow is enabled
Only Generated certificates can be approved
Approval must be audited
```

---

## 6.2 Reject Certificate

```http
POST /api/v1/certificates/{certificateId}/reject
```

### Permission

```text
CERTIFICATE_REJECT
```

### Request

```json
{
  "reason": "Name mismatch"
}
```

### Validations

```text
Reason is required
```

---

# 7. Certificate Issuance APIs

## 7.1 Issue Certificate

```http
POST /api/v1/certificates/{certificateId}/issue
```

### Permission

```text
CERTIFICATE_ISSUE
```

### Request

```json
{
  "issueDate": "2026-07-30",
  "remarks": "Issued to student"
}
```

### Business Rules

```text
Certificate must be generated
If approval workflow enabled, certificate must be approved before issuance
Issued certificate becomes immutable
Issued certificate PDF snapshot must be preserved
Certificate verification status becomes Valid
Issuance must be audited
```

### Events

```text
CertificateIssued
```

---

# 8. Certificate Reissue APIs

## 8.1 Request Certificate Reissue

```http
POST /api/v1/certificates/{certificateId}/reissue-request
```

### Permission

```text
CERTIFICATE_REISSUE_REQUEST
```

### Request

```json
{
  "reason": "Name correction",
  "requestedChanges": {
    "studentDisplayName": "Ahmed Mohammed Ali"
  }
}
```

### Supported Reasons

```text
LostCertificate
DamagedCertificate
NameCorrection
FormatUpdate
Other
```

### Business Rules

```text
Only issued certificates can be reissued
Original certificate must remain in history
Reissue request must be audited
```

---

## 8.2 Approve Certificate Reissue

```http
POST /api/v1/certificates/{certificateId}/reissue-approve
```

### Permission

```text
CERTIFICATE_REISSUE_APPROVE
```

### Request

```json
{
  "remarks": "Reissue approved"
}
```

### Business Rules

```text
Approved reissue creates a new certificate version
New certificate references original certificate
Old certificate remains traceable
```

---

## 8.3 Reject Certificate Reissue

```http
POST /api/v1/certificates/{certificateId}/reissue-reject
```

### Permission

```text
CERTIFICATE_REISSUE_REJECT
```

### Request

```json
{
  "reason": "Correction not supported"
}
```

---

# 9. Certificate Revocation APIs

## 9.1 Revoke Certificate

```http
POST /api/v1/certificates/{certificateId}/revoke
```

### Permission

```text
CERTIFICATE_REVOKE
```

### Request

```json
{
  "reason": "Issued in error"
}
```

### Supported Reasons

```text
IssuedInError
FraudulentRecord
DuplicateCertificate
ComplianceIssue
Other
```

### Business Rules

```text
Only issued certificates can be revoked
Revoked certificates remain in history
Verification portal must show Revoked status
Revocation must be audited
```

### Events

```text
CertificateRevoked
```

---

# 10. Certificate Verification APIs

## 10.1 Public Verify Certificate

```http
GET /api/v1/public/certificates/verify/{certificateNumber}
```

### Permission

```text
Public
```

### Response

```json
{
  "success": true,
  "data": {
    "certificateNumber": "CERT-2026-00001",
    "studentName": "Ahmed Ali",
    "courseName": "IOSH Managing Safely",
    "issueDate": "2026-07-30",
    "certificateStatus": "Valid"
  }
}
```

### Business Rules

```text
No authentication required
Only safe verification fields should be exposed
Sensitive student information must not be exposed
Verification attempt must be logged
Revoked certificates must show Revoked status
Invalid certificate number must return invalid status
```

---

## 10.2 Verify Certificate by QR Token

```http
GET /api/v1/public/certificates/verify-token/{verificationToken}
```

### Permission

```text
Public
```

---

# 11. Student Portal Certificate APIs

## 11.1 Get My Certificates

```http
GET /api/v1/student-portal/me/certificates
```

### Permission

```text
Authenticated Student
```

### Business Rules

```text
Student can access only own certificates
```

---

## 11.2 Download My Certificate

```http
GET /api/v1/student-portal/me/certificates/{certificateId}/download
```

### Permission

```text
Authenticated Student
```

---

# 12. Corporate Certificate APIs

## 12.1 Get Corporate Program Certificates

```http
GET /api/v1/corporate/programs/{programId}/certificates
```

### Permission

```text
CORPORATE_CERTIFICATE_VIEW
```

---

## 12.2 Bulk Generate Corporate Certificates

```http
POST /api/v1/corporate/programs/{programId}/certificates/bulk-generate
```

### Permission

```text
CERTIFICATE_GENERATE
```

### Request

```json
{
  "certificateType": "CorporateTrainingCertificate",
  "language": "English",
  "templateId": "ctpl_001",
  "onlyEligible": true,
  "remarks": "Corporate program certificate generation"
}
```

---

# 13. Certificate Numbering APIs

## 13.1 Get Certificate Number Format

```http
GET /api/v1/certificates/number-format
```

### Permission

```text
CERTIFICATE_CONFIG_VIEW
```

---

## 13.2 Update Certificate Number Format

```http
PATCH /api/v1/certificates/number-format
```

### Permission

```text
CERTIFICATE_CONFIG_EDIT
```

### Request

```json
{
  "format": "CERT-{YYYY}-{SEQUENCE}",
  "sequencePadding": 5,
  "resetFrequency": "Yearly"
}
```

### Business Rules

```text
Changes apply only to future certificates
Existing certificate numbers remain unchanged
```

---

# 14. Business Error Examples

## Certificate Not Eligible

```json
{
  "success": false,
  "error": {
    "code": "CERTIFICATE_NOT_ELIGIBLE",
    "message": "Enrollment is not eligible for certificate generation",
    "details": {
      "completionApproved": true,
      "attendanceEligible": true,
      "examPassed": false,
      "feeCleared": true
    }
  }
}
```

## Duplicate Certificate

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_CERTIFICATE",
    "message": "A certificate already exists for this enrollment and certificate type"
  }
}
```

## Certificate Immutable

```json
{
  "success": false,
  "error": {
    "code": "CERTIFICATE_IMMUTABLE",
    "message": "Issued certificates cannot be edited. Use reissue workflow."
  }
}
```

---

# 15. Events Published

```text
CertificateTemplateCreated
CertificateTemplateUpdated
CertificateTemplateActivated
CertificateGenerated
CertificatePdfGenerationRequested
CertificatePdfGenerated
CertificateApproved
CertificateRejected
CertificateIssued
CertificateReissueRequested
CertificateReissueApproved
CertificateReissueRejected
CertificateReissued
CertificateRevoked
CertificateVerified
CertificateDownloadRequested
```

---

# 16. Audit Requirements

Audit must capture:

```text
Template create/update/activate/deactivate
Certificate generation
Certificate approval/rejection
Certificate issuance
Certificate download
Certificate reissue request/approval/rejection
Certificate revocation
Public verification attempts
Certificate number format changes
```

---

# 17. Integration Points

Consumes:

```text
Completion Management
Enrollment
Student Management
Course & Batch
Corporate Training
Finance Fee Clearance
Document/File Storage
Identity & Access
```

Provides data to:

```text
Student Portal
Public Verification Portal
Corporate Reports
Compliance Reports
Audit
Communication
```

---
