# Non-Functional Requirement Document (NFR)

## Institute Management System (IMS)

**Version:** 1.0

**Project:** Institute Management System (IMS)

**Scope:**

* Coaching Centers
* Training Institutes
* Corporate Training Providers

**Market:**

* Oman (Primary)
* GCC Countries (Future)
* India (Future)

---

# 1. Purpose

This document defines the non-functional requirements of the IMS platform.

The NFR specifies:

* Performance
* Scalability
* Availability
* Reliability
* Security
* Auditability
* Localization
* Accessibility
* Backup & Recovery
* Monitoring
* Maintainability

requirements that apply across all modules.

---

# 2. NFR Classification

The system shall satisfy the following categories:

```text
Performance
Scalability
Availability
Reliability
Security
Auditability
Localization
Accessibility
Backup & Recovery
Maintainability
Observability
Compliance
```

---

# 3. Performance Requirements

## NFR-PERF-001 Response Time

### Standard Transactions

Examples:

```text
Create Lead
Create Student
Create Enrollment
Record Attendance
Record Payment
```

Response time:

```text
≤ 2 Seconds
```

for 95% of requests.

---

## NFR-PERF-002 Search Operations

Examples:

```text
Student Search
Lead Search
Course Search
Certificate Search
```

Response time:

```text
≤ 3 Seconds
```

for 95% of requests.

---

## NFR-PERF-003 Dashboard Loading

Examples:

```text
Management Dashboard
Branch Dashboard
Finance Dashboard
```

Response time:

```text
≤ 5 Seconds
```

---

## NFR-PERF-004 Report Generation

Standard reports:

```text
≤ 10 Seconds
```

Large reports:

```text
Asynchronous Processing
```

---

## NFR-PERF-005 Bulk Upload

Examples:

```text
Students
Leads
Corporate Participants
Documents
```

Expected volume:

```text
5,000 records
```

within:

```text
5 Minutes
```

---

# 4. Scalability Requirements

## NFR-SCL-001 Initial Capacity

The system shall support:

```text
20 Branches
1000+ Students
200+ Staff
10+ Courses
100+ Active Batches
```

without degradation.

---

## NFR-SCL-002 Growth Capacity

Architecture shall support future scaling to:

```text
100 Branches
50,000 Students
2,000 Staff
```

without redesign.

---

## NFR-SCL-003 Concurrent Users

The system shall support:

```text
500 Concurrent Users
```

during peak hours.

---

## NFR-SCL-004 Horizontal Scaling

Application architecture shall support:

```text
Multiple Application Instances
```

without code changes.

---

# 5. Availability Requirements

## NFR-AVL-001 System Availability

Target availability:

```text
99.5%
```

excluding planned maintenance.

---

## NFR-AVL-002 Planned Maintenance

Maintenance windows:

```text
Outside Business Hours
```

where possible.

---

## NFR-AVL-003 Certificate Verification

Public verification portal availability:

```text
99.9%
```

target.

---

# 6. Reliability Requirements

## NFR-REL-001 Transaction Integrity

Critical operations shall be atomic.

Examples:

```text
Enrollment Creation
Payment Recording
Certificate Issuance
Refund Processing
```

---

## NFR-REL-002 Data Consistency

The system shall prevent:

```text
Duplicate Student IDs
Duplicate Receipt Numbers
Duplicate Certificate Numbers
```

---

## NFR-REL-003 Event Reliability

Domain events shall be delivered reliably using:

```text
Transactional Outbox Pattern
```

---

# 7. Security Requirements

## NFR-SEC-001 Authentication

Phase 1:

```text
Email + Password
```

Future:

```text
SSO
OTP
MFA
```

---

## NFR-SEC-002 Password Security

Passwords shall:

```text
Never Be Stored In Plain Text
```

Use:

```text
bcrypt / Argon2
```

---

## NFR-SEC-003 Authorization

Authorization shall be enforced:

```text
Server Side
```

for every protected operation.

---

## NFR-SEC-004 Dynamic RBAC

The system shall support:

```text
Role Based Access
Permission Based Access
Data Scope Access
```

---

## NFR-SEC-005 Sensitive Data Protection

Sensitive information:

```text
Passwords
Tokens
OTP
API Keys
```

must never be exposed.

---

## NFR-SEC-006 Secure File Access

Documents shall be accessed using:

```text
Signed URLs
```

and permission checks.

---

## NFR-SEC-007 Session Security

Support:

```text
Session Timeout
Session Revocation
Account Locking
```

---

## NFR-SEC-008 OWASP Compliance

Application shall follow:

```text
OWASP Top 10
```

security guidelines.

---

# 8. Audit Requirements

## NFR-AUD-001 Audit Logging

Critical actions shall be audited.

Examples:

```text
Payment
Refund
Attendance Correction
Completion Approval
Certificate Issuance
```

---

## NFR-AUD-002 Immutable Audit

Audit records shall be:

```text
Append Only
```

---

## NFR-AUD-003 Audit Retention

Retention:

```text
7 Years
```

minimum.

---

## NFR-AUD-004 Audit Searchability

Audit logs shall be searchable by:

```text
User
Entity
Date
Action
```

---

# 9. Backup & Recovery Requirements

## NFR-BKP-001 Database Backup

Frequency:

```text
Daily Full Backup
```

---

## NFR-BKP-002 Transaction Log Backup

Frequency:

```text
Every 15 Minutes
```

---

## NFR-BKP-003 Document Backup

Documents and certificates shall be backed up daily.

---

## NFR-BKP-004 Recovery Point Objective (RPO)

Maximum data loss:

```text
15 Minutes
```

---

## NFR-BKP-005 Recovery Time Objective (RTO)

Target recovery:

```text
4 Hours
```

---

# 10. Localization Requirements

## NFR-LNG-001 Language Support

Mandatory:

```text
English
Arabic
```

---

## NFR-LNG-002 RTL Support

Arabic UI shall support:

```text
Right-To-Left Layout
```

---

## NFR-LNG-003 Certificate Localization

Support:

```text
English Certificates
Arabic Certificates
```

---

## NFR-LNG-004 Date Formatting

Date formats shall be configurable.

---

## NFR-LNG-005 Currency Formatting

Support:

```text
OMR
INR
Future Currencies
```

---

# 11. Accessibility Requirements

## NFR-ACC-001 Accessibility Standard

Target:

```text
WCAG 2.1 AA
```

---

## NFR-ACC-002 Keyboard Navigation

All core workflows shall support keyboard access.

---

## NFR-ACC-003 Screen Reader Support

Forms and controls shall be accessible.

---

## NFR-ACC-004 Color Contrast

UI shall meet accessibility contrast requirements.

---

# 12. Maintainability Requirements

## NFR-MNT-001 Architecture Style

Use:

```text
DDD Modular Monolith
```

---

## NFR-MNT-002 Code Quality

Mandatory:

```text
TypeScript
Linting
Formatting
Code Reviews
```

---

## NFR-MNT-003 Test Coverage

Target:

```text
80%+
```

for domain logic.

---

## NFR-MNT-004 Dependency Management

Domain boundaries shall be enforced.

---

# 13. Observability Requirements

## NFR-OBS-001 Structured Logging

All applications shall produce:

```text
Structured Logs
```

---

## NFR-OBS-002 Error Tracking

All production errors shall be captured.

---

## NFR-OBS-003 Distributed Tracing

Future-ready support for:

```text
OpenTelemetry
```

---

## NFR-OBS-004 Business Metrics

Track:

```text
Lead Conversion
Admissions
Collections
Attendance
Certificates
```

---

# 14. Compliance Requirements

## NFR-CMP-001 Data Retention

Retention rules shall be configurable.

---

## NFR-CMP-002 Certificate Verification

Certificates shall remain verifiable after issuance.

---

## NFR-CMP-003 Approval Traceability

Every approval action shall be traceable.

---

## NFR-CMP-004 Compliance Reporting

Support:

```text
Audit Reports
Document Compliance
Certificate Compliance
```

---

# 15. Usability Requirements

## NFR-USB-001 Learning Curve

New users should become productive within:

```text
1 Day
```

with standard training.

---

## NFR-USB-002 Navigation

Maximum clicks to reach any major module:

```text
≤ 3 Clicks
```

---

## NFR-USB-003 Searchability

Global search shall be available for key entities.

---

# 16. Mobile Responsiveness

## NFR-MOB-001 Responsive Design

Admin portal shall support:

```text
Desktop
Tablet
Mobile Browser
```

---

## NFR-MOB-002 Student Portal

Student portal shall be fully responsive.

---

# 17. Data Quality Requirements

## NFR-DQ-001 Unique Business Numbers

Must enforce uniqueness for:

```text
Student Number
Enrollment Number
Receipt Number
Certificate Number
```

---

## NFR-DQ-002 Validation Rules

Business validations shall be enforced server-side.

---

## NFR-DQ-003 Referential Integrity

Orphan records shall not be allowed.

---

# 18. Capacity Planning

## Phase 1

```text
20 Branches
1000 Students
200 Staff
500 Concurrent Users
```

---

## Future

```text
100 Branches
50,000 Students
2,000 Staff
```

---

# 19. Acceptance Criteria Summary

| Category               | Target            |
| ---------------------- | ----------------- |
| Availability           | 99.5%             |
| Concurrent Users       | 500               |
| Standard Response Time | ≤ 2 sec           |
| Search Response Time   | ≤ 3 sec           |
| Dashboard Load         | ≤ 5 sec           |
| Report Generation      | ≤ 10 sec          |
| RPO                    | 15 min            |
| RTO                    | 4 hrs             |
| Audit Retention        | 7 years           |
| Accessibility          | WCAG 2.1 AA       |
| Languages              | English + Arabic  |
| Test Coverage          | 80%+ Domain Logic |

---

# 20. Future NFR Enhancements

Future versions may introduce:

```text
Multi-Tenant Isolation SLAs
Geo-Redundant Disaster Recovery
MFA Enforcement
AI Model Governance
Mobile App SLAs
Regional Data Residency Controls
```

These requirements are excluded from Phase 1 but the architecture should remain ready for them.

---

# 21. Review Alignment NFR Addendum

## NFR-REL-004 Offline Biometric Reliability

Biometric attendance capture shall tolerate campus internet outages by buffering events locally before cloud sync.

Targets:

| Requirement | Target |
| --- | --- |
| Local buffering duration | Minimum 7 days of attendance events per branch gateway |
| Cloud sync idempotency | Required using terminal or gateway event ID |
| Duplicate prevention | No duplicate AttendanceRecord creation for repeated event pushes |
| Sync visibility | Gateway sync status and last error must be observable by administrators |

## NFR-REL-005 External Finance Sync Reliability

Tally ERP and future payment gateway integrations shall use outbox-backed delivery, retry, and reconciliation logs.

Targets:

| Requirement | Target |
| --- | --- |
| Finance transaction integrity | Payment/receipt/refund state persists independently of Tally availability |
| Retry strategy | Exponential backoff with dead-letter or manual intervention state |
| Reconciliation evidence | Sync attempts, external references, and failures retained for audit |
| Dual-write protection | Direct writes to Finance and Tally in the same request are prohibited |

## NFR-LNG-006 Localized Data Storage

Business fields requiring bilingual display shall use a consistent localized text structure with English and Arabic values. Arabic RTL rendering is required for Arabic UI, certificates, public verification, and notification templates.

Where Arabic fields require search or uniqueness, the implementation shall use indexed translation tables or database-supported generated/search columns instead of relying only on opaque JSON.

## NFR-CMP-005 Document Expiry Compliance

Critical documents shall support expiry alerts and compliance issue tracking.

Targets:

| Requirement | Target |
| --- | --- |
| Reminder intervals | Configurable, default 90/60/30/7 days before expiry |
| Critical expiry action | Compliance issue creation; account hold only through owning context policy |
| Auditability | Verification, rejection, expiry, and hold actions must be audit logged |
| Dashboard visibility | Branch-scoped compliance dashboard for expiring and expired documents |

## NFR-SEC-009 Branch Scope Enforcement

Branch scoping shall be enforced server-side in application services or route policy guards. UI menu hiding and client-side filters are not authorization controls.
