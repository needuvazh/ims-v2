# Detailed API Contract Specification

## Module 17: Audit, Compliance & Activity Tracking APIs

**Version:** 1.0
**Base URL:** `/api/v1`
**Module Code:** `AUD`

---

# 1. Module Purpose

Audit, Compliance & Activity Tracking APIs provide centralized visibility into user activity, business changes, approval actions, security events, compliance status, sensitive data access, and investigation timelines.

This module supports:

* Audit log search
* Entity audit history
* User activity history
* Field-level data change tracking
* Approval history
* Security event monitoring
* Compliance dashboard
* Sensitive data access tracking
* Export and download audit
* Investigation search
* Audit reports

---

# 2. Security Requirements

All Audit APIs require authentication.

Audit APIs must enforce strict access control:

```text
Audit Permission
Security Permission
Compliance Permission
Branch Scope
Sensitive Data Scope
Export Permission
```

Audit records must be:

```text
Append-only
Immutable
Non-editable
Non-deletable
```

---

# 3. Audit Log APIs

## 3.1 Get Audit Logs

```http
GET /api/v1/audit/logs
```

### Permission

```text
AUDIT_LOG_VIEW
```

### Query Parameters

```text
page
limit
module
entityType
entityId
userId
action
severity
dateFrom
dateTo
ipAddress
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
        "auditLogId": "aud_001",
        "timestamp": "2026-06-19T10:00:00Z",
        "module": "Finance",
        "entityType": "Payment",
        "entityId": "pay_001",
        "action": "PaymentRecorded",
        "severity": "Critical",
        "performedBy": {
          "userId": "usr_001",
          "fullName": "Admin User"
        },
        "ipAddress": "192.168.1.10",
        "status": "Success"
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

## 3.2 Get Audit Log Details

```http
GET /api/v1/audit/logs/{auditLogId}
```

### Permission

```text
AUDIT_LOG_VIEW
```

### Response

```json
{
  "success": true,
  "data": {
    "auditLogId": "aud_001",
    "timestamp": "2026-06-19T10:00:00Z",
    "module": "Finance",
    "entityType": "Payment",
    "entityId": "pay_001",
    "action": "PaymentRecorded",
    "severity": "Critical",
    "status": "Success",
    "performedBy": {
      "userId": "usr_001",
      "fullName": "Admin User"
    },
    "ipAddress": "192.168.1.10",
    "userAgent": "Mozilla/5.0",
    "reason": null,
    "remarks": "Payment recorded",
    "oldValue": null,
    "newValue": {
      "amount": 100,
      "currency": "OMR",
      "paymentMode": "Cash"
    },
    "referenceNumber": "PAY-2026-00001"
  }
}
```

### Business Rules

```text
Sensitive values must be masked
Passwords, OTPs, tokens, and secrets must never appear in audit details
Audit detail access must itself be audited
```

---

# 4. Entity Audit APIs

## 4.1 Get Entity Audit History

```http
GET /api/v1/audit/entity/{entityType}/{entityId}
```

### Permission

```text
AUDIT_ENTITY_VIEW
```

### Query Parameters

```text
dateFrom
dateTo
action
severity
```

### Example

```http
GET /api/v1/audit/entity/Student/std_001
```

### Response

```json
{
  "success": true,
  "data": {
    "entityType": "Student",
    "entityId": "std_001",
    "timeline": [
      {
        "timestamp": "2026-06-19T10:00:00Z",
        "action": "StudentCreated",
        "performedBy": "Admin User",
        "summary": "Student profile created"
      },
      {
        "timestamp": "2026-06-20T10:00:00Z",
        "action": "StudentUpdated",
        "performedBy": "Counselor User",
        "summary": "Mobile number updated"
      }
    ]
  }
}
```

---

## 4.2 Get Entity Change History

```http
GET /api/v1/audit/entity/{entityType}/{entityId}/changes
```

### Permission

```text
AUDIT_CHANGE_VIEW
```

### Response

```json
{
  "success": true,
  "data": {
    "entityType": "Student",
    "entityId": "std_001",
    "changes": [
      {
        "fieldName": "mobileNumber",
        "oldValue": "+96890000000",
        "newValue": "+96891111111",
        "changedBy": "Admin User",
        "changedAt": "2026-06-20T10:00:00Z"
      }
    ]
  }
}
```

---

# 5. User Activity APIs

## 5.1 Get User Activity

```http
GET /api/v1/audit/users/{userId}/activity
```

### Permission

```text
AUDIT_USER_ACTIVITY_VIEW
```

### Query Parameters

```text
module
action
dateFrom
dateTo
severity
```

---

## 5.2 Get My Activity

```http
GET /api/v1/audit/me/activity
```

### Permission

```text
Authenticated User
```

### Business Rules

```text
User can view own activity where enabled
Sensitive audit details may be hidden
```

---

# 6. Approval Audit APIs

## 6.1 Get Approval History

```http
GET /api/v1/audit/approvals
```

### Permission

```text
AUDIT_APPROVAL_VIEW
```

### Query Parameters

```text
approvalType
entityType
entityId
approverId
decision
dateFrom
dateTo
```

### Supported Approval Types

```text
RefundApproval
DiscountApproval
CompletionApproval
CertificateApproval
DocumentApproval
PayrollApproval
AttendanceCorrectionApproval
```

---

## 6.2 Get Entity Approval History

```http
GET /api/v1/audit/entity/{entityType}/{entityId}/approvals
```

### Permission

```text
AUDIT_APPROVAL_VIEW
```

---

# 7. Security Event APIs

## 7.1 Get Security Events

```http
GET /api/v1/audit/security-events
```

### Permission

```text
SECURITY_EVENT_VIEW
```

### Query Parameters

```text
eventType
userId
severity
dateFrom
dateTo
ipAddress
status
```

### Supported Event Types

```text
LoginSuccess
LoginFailed
AccountLocked
PasswordReset
RoleChanged
PermissionChanged
SessionTerminated
UnauthorizedAccessAttempt
```

---

## 7.2 Get Failed Login Events

```http
GET /api/v1/audit/security-events/failed-logins
```

### Permission

```text
SECURITY_EVENT_VIEW
```

---

## 7.3 Get Unauthorized Access Attempts

```http
GET /api/v1/audit/security-events/unauthorized-access
```

### Permission

```text
SECURITY_EVENT_VIEW
```

---

# 8. Compliance APIs

## 8.1 Get Compliance Dashboard

```http
GET /api/v1/compliance/dashboard
```

### Permission

```text
COMPLIANCE_DASHBOARD_VIEW
```

### Query Parameters

```text
branchId
dateFrom
dateTo
```

### Response

```json
{
  "success": true,
  "data": {
    "expiredDocuments": 10,
    "expiringDocuments": 25,
    "missingDocuments": 18,
    "pendingDocumentApprovals": 12,
    "revokedCertificates": 2,
    "expiredTrainerLicenses": 3,
    "pendingRefundApprovals": 4,
    "pendingCompletionApprovals": 8
  }
}
```

---

## 8.2 Get Compliance Issues

```http
GET /api/v1/compliance/issues
```

### Permission

```text
COMPLIANCE_ISSUE_VIEW
```

### Query Parameters

```text
issueType
branchId
entityType
severity
status
dateFrom
dateTo
```

### Supported Issue Types

```text
MissingDocument
ExpiredDocument
ExpiringDocument
RevokedCertificate
PendingApproval
ExpiredTrainerLicense
ContractExpiry
SecurityAlert
```

---

## 8.3 Resolve Compliance Issue

```http
POST /api/v1/compliance/issues/{issueId}/resolve
```

### Permission

```text
COMPLIANCE_ISSUE_RESOLVE
```

### Request

```json
{
  "resolutionRemarks": "Updated document uploaded and verified"
}
```

### Business Rules

```text
Resolution must be audited
Issue resolution should not delete original compliance record
```

---

# 9. Sensitive Data Access APIs

## 9.1 Get Sensitive Data Access Logs

```http
GET /api/v1/audit/sensitive-access
```

### Permission

```text
SENSITIVE_ACCESS_LOG_VIEW
```

### Query Parameters

```text
entityType
entityId
userId
accessType
dateFrom
dateTo
```

### Access Types

```text
View
Download
Export
Print
PublicVerify
```

---

## 9.2 Get Export Activity

```http
GET /api/v1/audit/export-activity
```

### Permission

```text
EXPORT_AUDIT_VIEW
```

### Query Parameters

```text
reportCode
userId
format
dateFrom
dateTo
```

---

## 9.3 Get Download Activity

```http
GET /api/v1/audit/download-activity
```

### Permission

```text
DOWNLOAD_AUDIT_VIEW
```

---

# 10. Investigation APIs

## 10.1 Investigation Search

```http
POST /api/v1/audit/investigation/search
```

### Permission

```text
AUDIT_INVESTIGATION_VIEW
```

### Request

```json
{
  "entityType": "Student",
  "entityId": "std_001",
  "userId": null,
  "actions": ["StudentUpdated", "PaymentRecorded"],
  "dateFrom": "2026-06-01",
  "dateTo": "2026-06-30",
  "includeFieldChanges": true,
  "includeApprovals": true,
  "includeDownloads": true
}
```

### Response

```json
{
  "success": true,
  "data": {
    "resultCount": 5,
    "timeline": [
      {
        "timestamp": "2026-06-19T10:00:00Z",
        "eventType": "StudentUpdated",
        "module": "Student",
        "summary": "Student mobile number updated",
        "performedBy": "Admin User"
      }
    ]
  }
}
```

---

## 10.2 Generate Investigation Report

```http
POST /api/v1/audit/investigation/report
```

### Permission

```text
AUDIT_INVESTIGATION_EXPORT
```

### Request

```json
{
  "title": "Student Profile Investigation",
  "filters": {
    "entityType": "Student",
    "entityId": "std_001",
    "dateFrom": "2026-06-01",
    "dateTo": "2026-06-30"
  },
  "format": "PDF"
}
```

---

# 11. Audit Retention APIs

## 11.1 Get Retention Policy

```http
GET /api/v1/audit/retention-policy
```

### Permission

```text
AUDIT_RETENTION_VIEW
```

---

## 11.2 Update Retention Policy

```http
PATCH /api/v1/audit/retention-policy
```

### Permission

```text
AUDIT_RETENTION_EDIT
```

### Request

```json
{
  "auditLogRetentionYears": 7,
  "securityLogRetentionYears": 7,
  "approvalLogRetention": "Permanent",
  "certificateAuditRetention": "Permanent"
}
```

### Business Rules

```text
Retention policy changes must be audited
Reducing retention below minimum compliance threshold should be blocked unless authorized
```

---

# 12. Audit Export APIs

## 12.1 Export Audit Logs

```http
POST /api/v1/audit/export
```

### Permission

```text
AUDIT_EXPORT
```

### Request

```json
{
  "format": "Excel",
  "filters": {
    "module": "Finance",
    "dateFrom": "2026-06-01",
    "dateTo": "2026-06-30",
    "severity": "Critical"
  }
}
```

### Supported Formats

```text
PDF
Excel
CSV
```

### Business Rules

```text
Audit export must be audited
Export must enforce data scope and audit permissions
Large exports should run asynchronously
```

---

# 13. Business Error Examples

## Audit Access Denied

```json
{
  "success": false,
  "error": {
    "code": "AUDIT_ACCESS_DENIED",
    "message": "You do not have permission to access audit records"
  }
}
```

## Sensitive Data Masked

```json
{
  "success": false,
  "error": {
    "code": "SENSITIVE_DATA_MASKED",
    "message": "Some audit fields are masked due to security policy"
  }
}
```

## Invalid Retention Policy

```json
{
  "success": false,
  "error": {
    "code": "INVALID_RETENTION_POLICY",
    "message": "Audit retention cannot be less than the minimum required period"
  }
}
```

---

# 14. Events Published

```text
AuditLogViewed
AuditLogExported
EntityAuditViewed
UserActivityViewed
ApprovalHistoryViewed
SecurityEventDetected
ComplianceIssueDetected
ComplianceIssueResolved
SensitiveDataAccessed
InvestigationSearchPerformed
InvestigationReportGenerated
RetentionPolicyUpdated
```

---

# 15. Audit Requirements

Audit module must audit itself.

Audit must capture:

```text
Audit log search
Audit detail view
Entity audit view
User activity view
Approval history view
Security event access
Compliance dashboard access
Sensitive access log view
Investigation search
Audit export
Retention policy update
```

---

# 16. Integration Points

Consumes:

```text
All Business Modules
Identity & Access
Reports
Documents
Certificates
Finance
Communication
```

Provides data to:

```text
Compliance Dashboard
Security Monitoring
Management Dashboard
Investigation Reports
Audit Reports
Future AI Analytics
```

---
