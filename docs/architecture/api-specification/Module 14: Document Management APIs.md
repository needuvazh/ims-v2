# Detailed API Contract Specification

## Module 14: Document Management APIs

**Version:** 1.0
**Base URL:** `/api/v1`
**Module Code:** `DOC`

---

# 1. Module Purpose

Document Management APIs manage files, document metadata, document types, verification workflows, approval workflows, document versioning, expiry tracking, and document access.

This module supports:

* Document type configuration
* Document upload
* Document metadata storage
* Entity-linked documents
* Student documents
* Trainer documents
* Corporate documents
* Contract attachments
* Certificate template files
* Document verification
* Document approval/rejection
* Document replacement/versioning
* Expiry alerts
* Missing document tracking
* Secure downloads

---

# 2. Security Requirements

All Document APIs require authentication except explicitly public file access if ever enabled.

Protected APIs must enforce:

```text
Permission
Entity Scope
Branch Scope
Student Self Scope
Trainer Self Scope
Corporate Data Scope
Document Access Policy
Audit Logging
```

Document download and sensitive document view must always be audited.

---

# 3. Document Type APIs

## 3.1 Get Document Types

```http
GET /api/v1/document-types
```

### Permission

```text
DOCUMENT_TYPE_VIEW
```

### Query Parameters

```text
page
limit
entityType
category
status
required
verificationRequired
expiryTrackingEnabled
search
sortBy
sortOrder
```

### Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "doctype_001",
        "documentTypeCode": "PASSPORT",
        "documentTypeName": "Passport",
        "category": "IdentityDocuments",
        "entityType": "Student",
        "required": true,
        "verificationRequired": true,
        "expiryTrackingEnabled": true,
        "status": "Active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

## 3.2 Create Document Type

```http
POST /api/v1/document-types
```

### Permission

```text
DOCUMENT_TYPE_CREATE
```

### Request

```json
{
  "documentTypeCode": "PASSPORT",
  "documentTypeName": "Passport",
  "category": "IdentityDocuments",
  "entityType": "Student",
  "required": true,
  "verificationRequired": true,
  "expiryTrackingEnabled": true,
  "allowedFileTypes": ["PDF", "JPG", "JPEG", "PNG"],
  "maxFileSizeMb": 10,
  "status": "Active",
  "displayOrder": 1
}
```

### Success Response

```json
{
  "success": true,
  "message": "Document type created successfully",
  "data": {
    "documentTypeId": "doctype_001",
    "documentTypeCode": "PASSPORT",
    "documentTypeName": "Passport",
    "status": "Active"
  }
}
```

### Validations

```text
Document type code is required
Document type name is required
Category is required
Entity type is required
Allowed file types are required
Max file size must be greater than zero
Document type code must be unique per entity type
```

### Business Rules

```text
New document types are configurable
Required documents are calculated by entity type
Verification rules are driven by document type configuration
Inactive document types must not appear for new uploads
Existing documents remain historically available
```

### Audit

```text
DocumentTypeCreated
```

---

## 3.3 Get Document Type Details

```http
GET /api/v1/document-types/{documentTypeId}
```

### Permission

```text
DOCUMENT_TYPE_VIEW
```

---

## 3.4 Update Document Type

```http
PATCH /api/v1/document-types/{documentTypeId}
```

### Permission

```text
DOCUMENT_TYPE_EDIT
```

### Request

```json
{
  "documentTypeName": "Passport Copy",
  "required": true,
  "verificationRequired": true,
  "expiryTrackingEnabled": true,
  "allowedFileTypes": ["PDF", "JPG", "JPEG", "PNG"],
  "maxFileSizeMb": 10,
  "status": "Active",
  "displayOrder": 1
}
```

### Business Rules

```text
Document type code should not be changed after creation
Changing required flag affects future missing document checks
Changes must be audited
```

---

## 3.5 Activate Document Type

```http
POST /api/v1/document-types/{documentTypeId}/activate
```

### Permission

```text
DOCUMENT_TYPE_ACTIVATE
```

---

## 3.6 Deactivate Document Type

```http
POST /api/v1/document-types/{documentTypeId}/deactivate
```

### Permission

```text
DOCUMENT_TYPE_DEACTIVATE
```

### Request

```json
{
  "reason": "Document type no longer required"
}
```

### Validations

```text
Reason is required
```

---

# 4. File Upload APIs

## 4.1 Upload File

```http
POST /api/v1/files/upload
```

### Permission

```text
FILE_UPLOAD
```

### Content Type

```text
multipart/form-data
```

### Form Data

```text
file
purpose
```

### Example Purpose

```text
StudentDocument
TrainerDocument
CorporateDocument
CertificateTemplate
ContractAttachment
```

### Success Response

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "fileId": "file_001",
    "fileName": "passport.pdf",
    "mimeType": "application/pdf",
    "fileSizeBytes": 250000,
    "storageKey": "documents/2026/06/passport.pdf"
  }
}
```

### Validations

```text
File is required
File type must be allowed
File size must be within configured limit
Purpose is required
```

### Business Rules

```text
File upload stores file in object storage
File metadata stored in database
File upload alone does not create business document unless linked
Uploaded files should be virus-scanned if scanning integration is enabled
```

---

# 5. Document APIs

## 5.1 Get Documents

```http
GET /api/v1/documents
```

### Permission

```text
DOCUMENT_VIEW
```

### Query Parameters

```text
page
limit
entityType
entityId
documentTypeId
category
status
verificationStatus
expiryStatus
uploadedFrom
uploadedTo
search
sortBy
sortOrder
```

---

## 5.2 Create Document Metadata

```http
POST /api/v1/documents
```

### Permission

```text
DOCUMENT_UPLOAD
```

### Request

```json
{
  "entityType": "Student",
  "entityId": "std_001",
  "documentTypeId": "doctype_001",
  "fileId": "file_001",
  "documentNumber": "A1234567",
  "issueDate": "2025-01-01",
  "expiryDate": "2030-01-01",
  "remarks": "Passport uploaded"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Document created successfully",
  "data": {
    "documentId": "doc_001",
    "documentNumber": "A1234567",
    "documentStatus": "Uploaded",
    "verificationStatus": "PendingVerification"
  }
}
```

### Supported Entity Types

```text
Student
Trainer
CorporateCustomer
CorporateParticipant
Contract
Certificate
Admission
```

### Validations

```text
Entity type is required
Entity ID is required
Document type is required
File ID is required
Expiry date is required if expiry tracking is enabled
Issue date cannot be after expiry date
```

### Business Rules

```text
Document type must be active
Document type entity type must match document entity type
If verification required, status becomes PendingVerification
If verification not required, status may become Approved
Document creation must be audited
```

### Audit

```text
DocumentCreated
```

---

## 5.3 Upload and Create Document

```http
POST /api/v1/documents/upload
```

### Permission

```text
DOCUMENT_UPLOAD
```

### Content Type

```text
multipart/form-data
```

### Form Data

```text
file
entityType
entityId
documentTypeId
documentNumber
issueDate
expiryDate
remarks
```

### Business Rules

```text
This API uploads file and creates document metadata in one transaction-like workflow
If file upload succeeds but metadata fails, orphan file cleanup job should handle cleanup
```

---

## 5.4 Get Document Details

```http
GET /api/v1/documents/{documentId}
```

### Permission

```text
DOCUMENT_VIEW
```

### Response

```json
{
  "success": true,
  "data": {
    "documentId": "doc_001",
    "entityType": "Student",
    "entityId": "std_001",
    "documentType": {
      "id": "doctype_001",
      "name": "Passport"
    },
    "documentNumber": "A1234567",
    "issueDate": "2025-01-01",
    "expiryDate": "2030-01-01",
    "documentStatus": "Uploaded",
    "verificationStatus": "PendingVerification",
    "file": {
      "fileId": "file_001",
      "fileName": "passport.pdf",
      "mimeType": "application/pdf"
    },
    "uploadedAt": "2026-06-19T10:00:00Z"
  }
}
```

---

## 5.5 Update Document Metadata

```http
PATCH /api/v1/documents/{documentId}
```

### Permission

```text
DOCUMENT_EDIT
```

### Request

```json
{
  "documentNumber": "A1234567",
  "issueDate": "2025-01-01",
  "expiryDate": "2030-01-01",
  "remarks": "Updated expiry date"
}
```

### Business Rules

```text
Approved documents cannot be edited without special permission
Changing metadata may reset verification status based on configuration
Changes must be audited
```

---

# 6. Document Download APIs

## 6.1 Download Document

```http
GET /api/v1/documents/{documentId}/download
```

### Permission

```text
DOCUMENT_DOWNLOAD
```

### Response

```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://signed-url/document.pdf",
    "expiresInSeconds": 300
  }
}
```

### Business Rules

```text
Download must enforce permission and entity scope
Signed URL should expire
Document download must be audited
Student portal users can download only their own documents
Trainer portal users can download only their own documents
```

---

## 6.2 Preview Document

```http
GET /api/v1/documents/{documentId}/preview
```

### Permission

```text
DOCUMENT_VIEW
```

---

# 7. Document Verification APIs

## 7.1 Verify Document

```http
POST /api/v1/documents/{documentId}/verify
```

### Permission

```text
DOCUMENT_VERIFY
```

### Request

```json
{
  "verificationStatus": "Approved",
  "remarks": "Document verified"
}
```

### Supported Verification Statuses

```text
Approved
Rejected
```

### Validations

```text
Verification status is required
Remarks are required for rejection
```

### Business Rules

```text
Only pending verification documents can be verified
Approval moves document to Approved status
Rejection moves document to Rejected status
Verification action must be audited
Verification history must be preserved
```

### Events

```text
DocumentVerified
DocumentApproved
DocumentRejected
```

---

## 7.2 Approve Document

```http
POST /api/v1/documents/{documentId}/approve
```

### Permission

```text
DOCUMENT_APPROVE
```

### Request

```json
{
  "remarks": "Approved"
}
```

---

## 7.3 Reject Document

```http
POST /api/v1/documents/{documentId}/reject
```

### Permission

```text
DOCUMENT_REJECT
```

### Request

```json
{
  "reason": "Document image is not clear"
}
```

### Validations

```text
Reason is required
```

---

# 8. Document Replacement / Version APIs

## 8.1 Replace Document

```http
POST /api/v1/documents/{documentId}/replace
```

### Permission

```text
DOCUMENT_REPLACE
```

### Content Type

```text
multipart/form-data
```

### Form Data

```text
file
documentNumber
issueDate
expiryDate
reason
```

### Validations

```text
File is required
Reason is required
```

### Business Rules

```text
Old version must be retained
New version becomes active
Verification status resets if verification required
Replacement must be audited
```

---

## 8.2 Get Document Version History

```http
GET /api/v1/documents/{documentId}/versions
```

### Permission

```text
DOCUMENT_VIEW
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "versionNumber": 1,
      "fileName": "passport-v1.pdf",
      "status": "Archived",
      "uploadedAt": "2026-06-19T10:00:00Z"
    },
    {
      "versionNumber": 2,
      "fileName": "passport-v2.pdf",
      "status": "Active",
      "uploadedAt": "2026-07-19T10:00:00Z"
    }
  ]
}
```

---

# 9. Entity Document APIs

## 9.1 Get Student Documents

```http
GET /api/v1/students/{studentId}/documents
```

### Permission

```text
STUDENT_DOCUMENT_VIEW
```

---

## 9.2 Get Trainer Documents

```http
GET /api/v1/trainers/{trainerId}/documents
```

### Permission

```text
TRAINER_DOCUMENT_VIEW
```

---

## 9.3 Get Corporate Customer Documents

```http
GET /api/v1/corporate/customers/{customerId}/documents
```

### Permission

```text
CORPORATE_DOCUMENT_VIEW
```

---

## 9.4 Get Contract Documents

```http
GET /api/v1/corporate/contracts/{contractId}/documents
```

### Permission

```text
CONTRACT_DOCUMENT_VIEW
```

---

# 10. Missing Document APIs

## 10.1 Get Missing Documents

```http
GET /api/v1/documents/missing
```

### Permission

```text
DOCUMENT_COMPLIANCE_VIEW
```

### Query Parameters

```text
entityType
entityId
branchId
status
```

### Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "entityType": "Student",
        "entityId": "std_001",
        "entityName": "Ahmed Ali",
        "requiredDocumentTypeId": "doctype_001",
        "requiredDocumentTypeName": "Passport",
        "status": "Missing"
      }
    ]
  }
}
```

---

## 10.2 Get Entity Document Checklist

```http
GET /api/v1/documents/checklist
```

### Permission

```text
DOCUMENT_VIEW
```

### Query Parameters

```text
entityType
entityId
```

---

# 11. Expiry Tracking APIs

## 11.1 Get Expiring Documents

```http
GET /api/v1/documents/expiring
```

### Permission

```text
DOCUMENT_COMPLIANCE_VIEW
```

### Query Parameters

```text
entityType
branchId
days
```

### Example

```http
GET /api/v1/documents/expiring?days=30
```

---

## 11.2 Get Expired Documents

```http
GET /api/v1/documents/expired
```

### Permission

```text
DOCUMENT_COMPLIANCE_VIEW
```

---

# 12. Student Portal Document APIs

## 12.1 Get My Documents

```http
GET /api/v1/student-portal/me/documents
```

### Permission

```text
Authenticated Student
```

### Business Rules

```text
Student can access only own documents
Read-only access unless upload is enabled
```

---

## 12.2 Upload My Document

```http
POST /api/v1/student-portal/me/documents/upload
```

### Permission

```text
Authenticated Student
```

### Business Rules

```text
Student upload creates PendingVerification document
Student cannot approve or verify own document
```

---

# 13. Business Error Examples

## Invalid Document Type

```json
{
  "success": false,
  "error": {
    "code": "INVALID_DOCUMENT_TYPE",
    "message": "Document type is not valid for this entity type"
  }
}
```

## File Too Large

```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Uploaded file exceeds maximum allowed size"
  }
}
```

## Document Already Approved

```json
{
  "success": false,
  "error": {
    "code": "DOCUMENT_ALREADY_APPROVED",
    "message": "Approved document cannot be modified without special permission"
  }
}
```

---

# 14. Events Published

```text
FileUploaded
DocumentTypeCreated
DocumentTypeUpdated
DocumentCreated
DocumentUpdated
DocumentDownloaded
DocumentVerified
DocumentApproved
DocumentRejected
DocumentReplaced
DocumentExpired
DocumentExpiringSoon
MissingDocumentDetected
```

---

# 15. Audit Requirements

Audit must capture:

```text
Document type create/update/activate/deactivate
File upload
Document create/update
Document download
Document preview
Document verification
Document approval/rejection
Document replacement
Version history access
Sensitive document access
```

---

# 16. Integration Points

Consumes:

```text
Student Management
Trainer Management
Corporate Training
Admission
Certificate Management
Identity & Access
Object Storage
```

Provides data to:

```text
Compliance Reports
Admission Validation
Trainer Compliance
Corporate Compliance
Certificate Templates
Audit
Student Portal
Trainer Portal
```

---
