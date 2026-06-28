# Functional Requirement Document

## Module 18: Audit, Compliance & Activity Tracking

**Version:** 1.1
**Module Code:** AUD
**Phase:** Phase 1
**Owned Bounded Context:** Audit & Compliance

**Dependencies:**

* Identity & Access Management
* All Business Modules

**Provides Data To:**

* Management
* Security Monitoring
* Compliance Review
* Reporting & Dashboard Management

---

# 1. Business Purpose

Audit & Compliance records significant business and system events, preserves immutable history, and supports investigations and compliance reviews.

The context owns audit logs, approval logs, and compliance issue tracking. It consumes events from other domains, but it does not make the original business decision.

---

# 2. Scope

## 2.1 In Scope

* Immutable audit logging
* Approval trail tracking
* Security event tracking
* User activity tracking
* Data change history
* Export for investigation
* Retention configuration
* Compliance summary views
* Compliance issue lifecycle for document expiry and sensitive operational risks

## 2.2 Out of Scope for Phase 1

* Automated legal case management
* External GRC platform integration
* Manual spreadsheet-based audit correction

---

# 3. Owned Concepts

The Audit context owns:

* AuditLog
* ApprovalLog
* ComplianceIssue

Supporting configuration may include retention and export policy settings.

---

# 4. Business Principles

* Audit records must be append-only.
* Audit records must not be editable after capture.
* Sensitive payloads must be redacted before storage where required.
* Approval history must preserve each approval step and actor.
* Every finance, certificate, completion, attendance, and RBAC change must be auditable.
* Failed and denied access attempts must be captured.
* Audit exports must be permission-controlled and themselves logged.
* Document expiry, document verification, finance sync failures, certificate revocation, attendance correction, and RBAC changes must be visible in compliance and audit views.

---

# 5. Audit Model

## 5.1 Audit Categories

```text
Authentication
Authorization
User Management
Lead Management
Enrollment
Finance
Attendance
Completion
Certificate
Document
Communication
System
Approval
```

## 5.2 Severity Levels

```text
Info
Warning
Critical
Security
Compliance
```

## 5.3 Audit Lifecycle

```text
Captured
  ↓
Stored
  ↓
Indexed
  ↓
Reported
  ↓
Archived
```

## 5.4 Approval Lifecycle

```text
Requested
  ↓
Under Review
  ↓
Approved
```

Alternative:

```text
Under Review
  ↓
Rejected
```

---

# 6. Screens

## AUD-UI-001 Audit Dashboard

### Widgets

```text
Activities Today
Critical Activities
Pending Approvals
Security Alerts
Compliance Alerts
Export Requests
```

### Filters

```text
Module
User
Branch
Severity
Category
Date Range
```

## AUD-UI-002 Audit Log Viewer

### Columns

```text
Timestamp
User
Branch
Module
Entity
Action
Severity
Status
Actions
```

### Actions

```text
View Details
Search
Filter
Export
```

## AUD-UI-003 Audit Detail

### Sections

```text
Event Metadata
Business Context
Old Value
New Value
Approval Trail
Additional Notes
```

## AUD-UI-004 Approval Log Viewer

### Columns

```text
Reference Number
Requested By
Reviewed By
Decision
Decision Date
Module
Actions
```

---

# 7. Functional Requirements

* The system shall capture significant events from all business modules.
* The system shall capture old and new values where a change is recorded.
* The system shall record the actor, branch, IP address, and timestamp when available.
* The system shall support searching and filtering by module, entity, user, severity, and date range.
* The system shall support export of audit records by authorized users.
* The system shall retain approval steps for finance, completion, certificate, and access-control actions.
* The system shall keep audit storage append-only.
* The system shall support retention and archival policy configuration.

---

# 8. Audit Events

The module shall ingest and normalize audit events for:

```text
BusinessChangeCaptured
ApprovalActionCaptured
AccessDeniedCaptured
SecurityEventCaptured
ExportRequested
ExportCompleted
```

---

# 9. Domain Errors

```text
AUDIT_EVENT_INVALID
AUDIT_EVENT_DUPLICATE
AUDIT_RECORD_NOT_FOUND
AUDIT_ACCESS_DENIED
EXPORT_NOT_ALLOWED
RETENTION_POLICY_INVALID
```

---

# 10. Reporting Views

```text
Critical Events Summary
Approval Trail Summary
Security Alert Summary
Branch Activity Summary
Module Activity Summary
Export History
```
