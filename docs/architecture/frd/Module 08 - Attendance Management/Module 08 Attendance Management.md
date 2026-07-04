# Module 08: Attendance Management

## Document Control

| Attribute | Value |
|---|---|
| Product | ASTI Integrated Institute Management System (IMS) |
| Module | Module 08 – Attendance Management |
| Module Code | M08-ATT |
| Bounded Context | Attendance Management |
| Architecture Style | Next.js TypeScript modular monolith |
| Primary Application | Admin Portal |
| Timezone Default | Oman GST, UTC+4 |
| Data Ownership | Attendance Management owns AttendanceSession, AttendanceRecord, AttendanceCorrection, AttendanceStatus, attendance alerts and attendance-derived reports. Enrollment, Batch, Session, Trainer, Course, Finance, Completion, Certificate, IAM, Audit and Reporting remain owned by their respective bounded contexts. |
| Version | 1.0 |

---

## 1. Purpose and Objective

The Attendance Management module enables ASTI staff and authorized trainers to create attendance sessions, mark learner participation, review attendance records, process controlled attendance corrections, calculate attendance percentages, and provide attendance evidence to Course Completion, Certificate Management, Reporting, and Audit contexts.

The module must support ASTI’s enrollment-centric operating model. Attendance is not recorded directly against a free-form learner name. Every attendance record must resolve to a valid `Enrollment`, `StudentProfile`, `Batch`, and scheduled or delivered `Session`. This guarantees that attendance contributes to the correct learning journey and does not create duplicate student or learner lifecycle records.

The objective is to provide a secure, auditable, branch-scoped, bilingual-ready, operationally efficient attendance capability for regular, walk-in, online-originated, and corporate enrollments.

---

## 2. Business Goals

| Goal ID | Business Goal | Success Measure |
|---|---|---|
| BO-M08-001 | Ensure attendance is captured consistently for every delivered training session. | 100% of completed sessions have either submitted attendance or an approved reason for no attendance. |
| BO-M08-002 | Maintain enrollment-centric attendance records. | Every `AttendanceRecord` links to exactly one active `Enrollment` and one `StudentProfile`. |
| BO-M08-003 | Enforce branch isolation and prevent unauthorized cross-branch attendance access. | Users can only view or modify attendance for sessions in assigned branches unless they have consolidated reporting permission. |
| BO-M08-004 | Reduce manual errors during attendance marking. | System blocks attendance for inactive, cancelled, dropped, transferred out, or non-batch enrollments. |
| BO-M08-005 | Provide reliable attendance percentages for completion and certificate eligibility. | Completion module receives attendance percentage calculated from submitted attendance sessions only. |
| BO-M08-006 | Support auditable attendance correction workflows. | 100% of submitted attendance changes after submission create `AttendanceCorrection` and `AuditLog` records. |
| BO-M08-007 | Improve operational visibility for coordinators and branch managers. | Dashboard reports show pending attendance, low-attendance students, and correction requests by branch, batch, trainer, and course. |
| BO-M08-008 | Support bilingual user-facing attendance labels and reports. | Attendance status labels, reason labels, and exported report headings support English and Arabic where configured. |
| BO-M08-009 | Preserve sensitive action traceability. | Attendance submission, correction request, approval, rejection, and reversal actions capture actor, timestamp, reason, old value, new value, IP address, and branch context. |
| BO-M08-010 | Keep Phase 1 implementation practical. | Manual attendance marking is supported first; biometric attendance is excluded from current scope and retained as future integration. |

---

## 3. Scope

### 3.1 Included Scope

| Area | Included Capability |
|---|---|
| Attendance session creation | Create or initialize an `AttendanceSession` for a scheduled/delivered training `Session`. |
| Manual attendance marking | Mark enrolled students as `Present`, `Absent`, `Late`, or `Excused`. |
| Draft and submit workflow | Save attendance as draft and submit final attendance for a session. |
| Attendance roster generation | Generate roster from active enrollments in the target batch and session branch. |
| Attendance percentage calculation | Calculate attendance percentage per enrollment, batch, course, and date range. |
| Late and excused handling | Capture late minutes and excused absence reason where applicable. |
| Attendance correction | Request, review, approve, reject, and apply correction to submitted attendance. |
| Low attendance alerts | Identify enrollments below configured attendance thresholds and expose them to coordinators, trainers, and reporting. |
| Branch-scoped access | Enforce branch scoping server-side for all queries, mutations, exports, and reports. |
| Audit logging | Record critical actions in Audit & Compliance context. |
| Reporting feed | Provide attendance metrics to Reporting & Executive Dashboards. |
| Completion feed | Provide attendance percentage and evidence to Exam, Result & Completion Management. |
| Bilingual support | Support localized labels for statuses, correction reasons, report headings, and notification-ready messages. |
| Soft delete support | Use soft-delete for operational records where removal is required due to error or compliance request. |

### 3.2 Excluded Scope

| Area | Exclusion Reason |
|---|---|
| Biometric attendance integration | Future phase. Attendance context remains source of truth; biometric context may later provide input logs. |
| Student self-mark attendance | Not permitted in Phase 1 to prevent misuse. |
| GPS/geofenced attendance | Not required for ASTI Phase 1. |
| QR-code student check-in | Future enhancement; manual trainer/coordinator marking remains current scope. |
| Payroll staff attendance | Future HRMS/Payroll scope. This module covers student training attendance only. |
| Certificate issuance | Certificate module owns certificate issuance; Attendance only supplies eligibility evidence. |
| Completion approval workflow | Exam, Result & Completion Management owns completion approval; Attendance provides attendance metrics. |
| Session scheduling | Scheduling/Calendar owns timetable and conflicts; Attendance consumes scheduled sessions. |
| Batch creation and capacity management | Training Delivery owns batch and enrollment list. |
| Finance payment validation | Finance owns payment validation. Attendance does not decide certificate payment eligibility. |
| External SMS/WhatsApp delivery | Communication module owns notification sending; Attendance only raises notification requests or reportable alerts. |

---

## 4. Stakeholders and Actors

### 4.1 Human Stakeholders

| Stakeholder | Role in Attendance Management |
|---|---|
| Trainer / Instructor | Marks attendance for assigned sessions and provides correction reasons. |
| Academic Coordinator | Monitors pending attendance, reviews rosters, requests or approves corrections where delegated. |
| Branch Manager | Oversees attendance compliance, approves sensitive corrections, reviews low-attendance cases. |
| Registrar / Admin Staff | Supports attendance administration, roster validation, exports, and exception follow-up. |
| Student | Attendance subject; may view attendance summary in future portal but cannot modify records. |
| Corporate Coordinator | External stakeholder who may receive corporate participant attendance reports through approved reports. |
| Finance Officer | Consumes attendance reports only when required for billing evidence; cannot modify attendance. |
| Certificate Officer | Consumes attendance status as eligibility evidence; cannot modify attendance. |
| System Administrator | Configures permissions, status labels, thresholds, and branch access. |
| Auditor / Compliance Officer | Reviews audit logs, correction history, and attendance evidence. |

### 4.2 System Actors

| System Actor | Responsibility |
|---|---|
| Training Delivery Module | Provides Batch, Session, BatchTrainer, and WaitingList data. |
| Admission & Enrollment Module | Provides active enrollment roster and enrollment lifecycle status. |
| Scheduling, Calendar & Holiday Module | Provides scheduled sessions, classroom, trainer schedule, and holiday conflict status. |
| Faculty / Trainer Management Module | Provides trainer profile, trainer assignment, and trainer status. |
| Course Catalog Module | Provides course completion attendance threshold from course completion rules. |
| Exam, Result & Completion Module | Consumes attendance percentage and attendance evidence for completion evaluation. |
| Certificate Management Module | Consumes completion-approved status indirectly and may view attendance evidence. |
| Identity & Access Management Module | Provides authenticated user, permissions, and branch access. |
| Audit & Compliance Module | Stores audit logs and approval history for sensitive actions. |
| Reporting & Dashboards Module | Consumes attendance KPIs, snapshots, and report datasets. |
| Communication & Notification Module | Sends low-attendance, pending-attendance, and correction workflow notifications when configured. |

---

## 5. Functional Overview

```text
Module 08 – Attendance Management
├── 08.01 Attendance Session Setup
│   ├── scheduled session lookup
│   ├── attendance session creation
│   ├── trainer/session/batch validation
│   └── branch-scoped session access
├── 08.02 Attendance Roster Management
│   ├── active enrollment roster generation
│   ├── corporate participant visibility
│   ├── late joiner inclusion rules
│   └── transferred/dropped/cancelled exclusion rules
├── 08.03 Manual Attendance Marking
│   ├── mark present
│   ├── mark absent
│   ├── mark late with late minutes
│   ├── mark excused with reason
│   └── bulk mark present/absent
├── 08.04 Attendance Draft and Submission
│   ├── save draft
│   ├── validate completeness
│   ├── submit final attendance
│   └── lock submitted attendance
├── 08.05 Attendance Correction Workflow
│   ├── correction request
│   ├── correction review
│   ├── correction approval
│   ├── correction rejection
│   └── immutable correction history
├── 08.06 Attendance Calculations
│   ├── attended session count
│   ├── eligible session count
│   ├── attendance percentage
│   ├── late treatment rules
│   └── excused treatment rules
├── 08.07 Attendance Alerts and Exceptions
│   ├── pending attendance sessions
│   ├── low attendance students
│   ├── missing roster exceptions
│   └── unresolved correction requests
├── 08.08 Attendance Reports and Export
│   ├── batch attendance register
│   ├── student attendance transcript
│   ├── trainer session attendance summary
│   ├── corporate participant attendance report
│   └── branch attendance compliance report
└── 08.09 Security, Audit and Administration
    ├── permission checks
    ├── branch isolation
    ├── audit logging
    ├── soft delete controls
    └── localized status configuration
```

---

## 6. Business Capabilities and User Types

### 6.1 Internal User Capabilities

| User Type | Capabilities |
|---|---|
| Trainer | View assigned sessions, open roster, mark draft attendance, submit attendance where assigned, request correction for own submitted records. |
| Academic Coordinator | View attendance by branch, create attendance sessions, monitor pending attendance, mark attendance on behalf of trainer when permitted, review correction requests, export reports. |
| Branch Manager | View branch-level attendance compliance, approve high-impact corrections, override correction deadlines where permitted, view audit history. |
| Registrar / Admin Staff | Validate rosters, support exception handling, export registers, view attendance history. |
| Certificate Officer | Read-only access to attendance evidence for certificate eligibility checks. |
| Finance Officer | Read-only access to attendance reports for corporate billing evidence if permission is granted. |
| Auditor | Read-only access to attendance audit trail, correction history, and compliance reports. |
| System Administrator | Configure permissions and master data labels; cannot bypass branch access unless assigned consolidated permission. |

### 6.2 External User Capabilities

| User Type | Capabilities |
|---|---|
| Student | Future portal read-only attendance summary. No create/update/delete in Phase 1 Admin Portal. |
| Corporate Coordinator | Future corporate portal or approved exported report access for participant attendance summaries. No direct modification rights. |
| Public User | No attendance access. |

---

## 7. Functional Requirements Checklist

| Requirement ID | Requirement Name | Priority | Summary |
|---|---|---|---|
| FR-M08-ATT-001 | Attendance session initialization | Must | Create one attendance session per training session/date/batch combination. |
| FR-M08-ATT-002 | Branch-scoped session listing | Must | List only sessions accessible to the logged-in user’s branch context. |
| FR-M08-ATT-003 | Attendance roster generation | Must | Generate roster from active enrollments for the batch and session date. |
| FR-M08-ATT-004 | Manual individual attendance marking | Must | Mark each roster student as Present, Absent, Late, or Excused. |
| FR-M08-ATT-005 | Bulk attendance marking | Should | Support bulk mark present/absent with review before submit. |
| FR-M08-ATT-006 | Draft attendance save | Must | Save incomplete attendance as draft without affecting completion calculations. |
| FR-M08-ATT-007 | Final attendance submission | Must | Validate and lock submitted attendance for completion/reporting. |
| FR-M08-ATT-008 | Attendance lock and edit restriction | Must | Prevent direct edits after submission; corrections must use workflow. |
| FR-M08-ATT-009 | Attendance correction request | Must | Request changes to submitted attendance with mandatory reason. |
| FR-M08-ATT-010 | Attendance correction approval/rejection | Must | Approve/reject corrections based on permission and branch scope. |
| FR-M08-ATT-011 | Attendance percentage calculation | Must | Calculate attendance percentage per enrollment using submitted sessions. |
| FR-M08-ATT-012 | Low attendance detection | Should | Identify learners below course/batch configured threshold. |
| FR-M08-ATT-013 | Pending attendance monitoring | Must | Track sessions where attendance is not submitted by expected deadline. |
| FR-M08-ATT-014 | Attendance reports and exports | Must | Provide branch-scoped attendance reports and exports. |
| FR-M08-ATT-015 | Corporate attendance reporting | Should | Report participant attendance by corporate account, course, batch, and period. |
| FR-M08-ATT-016 | Completion evidence API | Must | Provide attendance summary and evidence to Completion module. |
| FR-M08-ATT-017 | Audit logging | Must | Audit all sensitive attendance actions. |
| FR-M08-ATT-018 | Soft delete and restore controls | Should | Allow authorized soft deletion and restoration with reason and audit. |
| FR-M08-ATT-019 | Bilingual status labels | Should | Display attendance labels in English and Arabic where configured. |
| FR-M08-ATT-020 | Attendance exception handling | Should | Identify roster mismatch, cancelled session, duplicate session, and inactive enrollment exceptions. |

---

## 8. Permission Model Overview

### 8.1 Permission Codes

| Permission Code | Description | Typical Roles |
|---|---|---|
| attendance.session.read | View attendance sessions in assigned branch context. | Trainer, Academic Coordinator, Branch Manager, Registrar |
| attendance.session.create | Create or initialize attendance session. | Academic Coordinator, Registrar |
| attendance.session.submit | Submit attendance for a session. | Trainer, Academic Coordinator |
| attendance.record.read | View attendance records. | Trainer, Academic Coordinator, Branch Manager, Registrar, Auditor |
| attendance.record.mark | Mark draft attendance records. | Trainer, Academic Coordinator |
| attendance.record.bulkMark | Use bulk marking actions. | Trainer, Academic Coordinator |
| attendance.record.export | Export attendance registers and reports. | Academic Coordinator, Branch Manager, Registrar, Auditor |
| attendance.correction.request | Request attendance correction after submission. | Trainer, Academic Coordinator |
| attendance.correction.review | View correction requests awaiting review. | Academic Coordinator, Branch Manager |
| attendance.correction.approve | Approve correction requests. | Academic Coordinator, Branch Manager |
| attendance.correction.reject | Reject correction requests. | Academic Coordinator, Branch Manager |
| attendance.correction.overrideDeadline | Allow correction after correction deadline. | Branch Manager, System Administrator with explicit permission |
| attendance.audit.read | View attendance audit trail. | Branch Manager, Auditor, System Administrator |
| attendance.report.consolidated | View attendance reports across assigned/consolidated branches. | CEO Dashboard User, Auditor, Authorized Management |
| attendance.admin.softDelete | Soft-delete attendance sessions or records with reason. | System Administrator, Branch Manager with explicit permission |
| attendance.admin.restore | Restore soft-deleted attendance records with reason. | System Administrator with explicit permission |
| attendance.config.manage | Manage attendance status labels, thresholds, and correction reason lookup values. | System Administrator, Configuration Admin |

### 8.2 Permission Rules

1. Permissions are not role-name hardcoded. UI and API must check permission codes.
2. Every attendance query and mutation must enforce branch scoping server-side.
3. Trainer can only mark sessions where they are assigned as session trainer or batch trainer unless `attendance.record.mark.anyTrainerSession` is granted.
4. A user with `attendance.report.consolidated` may view consolidated attendance only for branches allowed by `UserBranchAccess.canViewConsolidated` or `UserBranchAccess.canViewChildBranches`.
5. Read-only roles cannot trigger draft save, submit, correction, soft delete, or restore.
6. Export permissions are separate from read permissions.
7. Audit read permissions are separate from operational attendance read permissions.

---

## 9. Security and Audit Requirements Summary

| Area | Requirement Summary |
|---|---|
| Authentication | All attendance screens and APIs require authenticated user session. |
| Authorization | Every API route must validate permission code and branch access. |
| Branch Isolation | `branchId` must be derived from the session/batch/enrollment relationship and validated against current user branch context. Client-provided branch IDs cannot be trusted. |
| Audit Logging | Attendance session creation, draft save, submission, correction request, approval, rejection, soft delete, restore, export, and configuration changes must be audited. |
| Sensitive Field Protection | Correction reasons, remarks, and audit details must be visible only to authorized users. |
| Soft Deletes | No hard delete for attendance operational records. Use `isDeleted`, `deletedAt`, `deletedBy`, and deletion reason. |
| Optimistic Locking | Use `version` on attendance session and record updates to prevent lost updates. |
| Data Integrity | Attendance record uniqueness must prevent duplicate `attendanceSessionId + enrollmentId` active records. |
| Privacy | Attendance reports must show only necessary student identifiers: student number, full name, enrollment number, course, batch, and attendance status. Civil ID/passport must not appear unless explicitly required and permitted. |
| Export Audit | Export action must log filter criteria, branch scope, actor, timestamp, and export type. |
| Timezone | All date/time calculations use Oman timezone UTC+4 for operational views; database stores timestamps consistently in UTC with timezone-safe conversion. |

---

## 10. Non-Functional Requirements Summary

| Category | Requirement |
|---|---|
| Performance | Attendance roster for a batch of up to 100 learners must load within 2 seconds at p95 under normal operating load. |
| Performance | Draft save and final submit for up to 100 learners must complete within 3 seconds at p95. |
| Scalability | Module must support at least 25 branches, 500 active batches, 5,000 active enrollments, and 100 concurrent attendance users in Phase 1. |
| Availability | Attendance marking APIs must target 99.5% monthly availability during training operating hours. |
| Reliability | Submitted attendance must be transactionally consistent: session status and records commit together or roll back together. |
| Usability | Trainer marking screen must support keyboard-friendly status selection and mobile/tablet-friendly layout. |
| Accessibility | UI must follow WCAG 2.1 AA practical guidelines for contrast, labels, keyboard navigation, and screen reader labels. |
| Localization | English and Arabic labels must be supported for attendance statuses, correction reasons, and report headings. |
| Observability | APIs must emit structured logs with request ID, actor ID, branch ID, session ID, batch ID, action, outcome, and latency. |
| Security | No attendance mutation API may depend only on client-side permission checks. |
| Auditability | Audit entries must be immutable from the application layer. |
| Maintainability | Attendance code should reside in `packages/attendance` and expose clear application services to the Admin Portal. |
| Data Retention | Attendance records must be retained for the institute-defined legal and operational retention period; deletion is soft-delete only. |

---

## 11. Summary

Module 08 – Attendance Management is a supporting but business-critical IMS module. It records student participation against the central Enrollment aggregate, provides evidence for completion and certification, improves trainer and coordinator operational control, and maintains auditability for attendance-sensitive actions. The module must be built as part of the modular monolith, with strict DDD ownership boundaries and secure branch-scoped access from the beginning.
