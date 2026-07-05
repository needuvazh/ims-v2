# Module 09: Faculty / Trainer Management

## 1. Purpose and Objective

Module 09 provides the authoritative operational capability for managing trainers who deliver ASTI courses. It manages trainer profiles, trainer classifications, qualifications, course authorizations, branch-aware availability, and delivery compensation rate structures while reusing the shared Party/Person identity model.

The module shall support FullTime, PartTime, and Freelance trainers without assuming that every trainer is an employee. It shall expose validated trainer eligibility and availability to Course Catalog, Training Delivery, Scheduling, Exam & Completion, Reporting, Document Management, Communication, IAM, Organization Management, and Audit & Compliance contexts.

The module shall not own batches, sessions, payroll, attendance records, course definitions, user authentication, or employee lifecycle records. It shall provide reliable trainer data to the contexts that own those transactions.

### 1.1 Objectives

1. Maintain one trainer profile per Person while preventing duplicate identity records.
2. Maintain branch-scoped trainer operational affiliation and effective-dated trainer status.
3. Record qualifications and link qualification evidence to Document Management.
4. Authorize trainers only for courses they are approved to deliver.
5. Record weekly recurring availability by branch and effective period.
6. Configure effective-dated compensation rates using supported payment bases.
7. Allow Training Delivery and Scheduling to determine whether a trainer is operationally eligible for a proposed assignment.
8. Preserve complete audit evidence for sensitive profile, authorization, availability, status, and compensation changes.
9. Enforce branch isolation on every server-side read and write operation.
10. Support English and Arabic presentation of shared Person data where localized values exist.

---

## 2. Business Goals

| ID | Business Goal | Success Intent |
|---|---|---|
| BO-FTM-001 | Establish a single authoritative trainer registry. | Every trainer is represented through a shared Person and exactly one active TrainerProfile. |
| BO-FTM-002 | Prevent unqualified or unauthorized course delivery. | Batch and session assignment workflows can validate active TrainerCourseAuthorization before confirmation. |
| BO-FTM-003 | Improve scheduling reliability. | Scheduling can query effective trainer availability and reject unavailable trainer-time combinations. |
| BO-FTM-004 | Support flexible workforce models. | FullTime, PartTime, and Freelance trainer types are supported without forcing trainer-to-employee equivalence. |
| BO-FTM-005 | Improve qualification compliance. | Qualifications are structured, traceable, and optionally backed by verified documents. |
| BO-FTM-006 | Standardize trainer remuneration inputs. | Effective-dated compensation rate structures are maintained for Per Hour, Per Session, Per Student, and Fixed bases. |
| BO-FTM-007 | Protect branch-confidential operational data. | Trainer data is filtered and mutated only within authorized branch context unless consolidated access is explicitly granted. |
| BO-FTM-008 | Provide audit-ready trainer administration. | Critical status, authorization, availability, qualification, and compensation actions are immutably auditable. |
| BO-FTM-009 | Enable reliable management reporting. | Reporting consumes governed trainer master data for utilization, authorization coverage, availability, and delivery analysis. |
| BO-FTM-010 | Preserve architectural boundaries. | Trainer Management owns trainer master capability while Batch, Session, Course, Document, Payroll, and IAM ownership remains in their bounded contexts. |

---

## 3. Scope

### 3.1 Included Scope

- Search, list, view, create, and update TrainerProfile records.
- Link TrainerProfile to an existing Person or create the required Person through the shared Party/Person capability without duplicating identity.
- Generate and enforce unique trainer codes using configured numbering rules where available.
- Manage trainer type: FullTime, PartTime, Freelance.
- Manage specialization and qualification summary.
- Manage trainer operational statuses and effective periods.
- Manage structured TrainerQualification records.
- Link qualifications to Document Management evidence records.
- Manage weekly recurring TrainerAvailability windows by branch.
- Validate availability time ranges and effective periods.
- Manage TrainerCourseAuthorization by course and effective period.
- Manage TrainerCompensationRate by trainer with optional batch or session specificity.
- Support compensation bases: Per Hour, Per Session, Per Student, Fixed.
- Provide trainer eligibility checks to Training Delivery and Scheduling.
- Provide trainer reference data to Exam & Completion for trainer recommendation workflows.
- Provide reporting read models and exportable datasets within authorized branch scope.
- Soft delete or deactivate records without physical deletion.
- Audit sensitive trainer data changes.

### 3.2 Excluded Scope

- Employee recruitment, employment contracts, leave, performance, EOSB, or employee lifecycle management.
- Payroll calculation, payslip generation, statutory payroll processing, or bank transfer files.
- Batch ownership, batch lifecycle, waiting lists, or enrollment capacity.
- Session ownership or timetable ownership.
- Classroom booking, holiday calendar ownership, or venue blocking.
- Attendance marking or attendance correction ownership.
- Course creation, pricing, discount configuration, completion rule ownership, or course publication.
- Certificate generation, issuance, verification, reissue, or revocation.
- Authentication credentials, role management, or permission definition ownership.
- Document binary storage and document verification workflow ownership.
- Biometric device integration.

---

## 4. Stakeholders and Actors

### 4.1 Human Actors

| Actor | Responsibility |
|---|---|
| Trainer Administrator | Creates and maintains trainer profiles, qualifications, availability, authorizations, and compensation structures subject to permission. |
| Academic Coordinator | Reviews trainer suitability, course authorization, availability, and active assignments. |
| Training Coordinator | Searches eligible trainers and uses eligibility information during batch and session planning. |
| Branch Manager | Oversees branch trainer capacity, status changes, exceptions, and branch-level reporting. |
| Finance Authorized User | Views or manages compensation rates where specifically permitted; does not run payroll in this module. |
| Compliance / Auditor | Reviews trainer qualification evidence, status history, authorization history, and audit logs. |
| Reporting User | Views trainer utilization and operational metrics within branch/reporting permission scope. |
| Trainer | External business actor whose profile, qualifications, availability, and authorizations are managed; direct self-service is outside current admin-portal scope. |

### 4.2 System Actors

| System Actor | Interaction |
|---|---|
| Identity & Access Management | Authenticates users, evaluates permissions, and supplies authorized branch context. |
| Party / Person Capability | Supplies canonical Person identity and localized personal data. |
| Organization Management | Supplies Branch references and branch hierarchy. |
| Course Catalog Management | Supplies Course references used by TrainerCourseAuthorization. |
| Training Delivery Management | Consumes trainer eligibility and authorization when assigning BatchTrainer or Session trainer references. |
| Scheduling, Calendar & Holiday Management | Consumes availability and validates proposed timetable assignments. |
| Document Management | Owns qualification evidence documents and verification state. |
| Exam, Result & Completion Management | References trainers for recommendation and completion workflow participation. |
| Communication & Notification Management | May consume trainer contact reference and event triggers for authorized communications. |
| Reporting & Executive Dashboards | Consumes trainer data for utilization, coverage, availability, and branch analysis. |
| Audit & Compliance | Records critical changes and security-relevant actions. |

---

## 5. Functional Overview

```text
Faculty / Trainer Management
|
+-- Trainer Registry
|   +-- Search and list trainers
|   +-- Create trainer profile
|   +-- View trainer profile
|   +-- Update trainer profile
|   +-- Change trainer status
|   +-- View trainer history
|
+-- Qualification Management
|   +-- Add qualification
|   +-- Update qualification
|   +-- Link evidence document
|   +-- View verification status
|   +-- Soft delete qualification
|
+-- Availability Management
|   +-- Create weekly availability window
|   +-- Update availability window
|   +-- Effective-date availability
|   +-- Validate time-window overlap
|   +-- Query availability for proposed assignment
|
+-- Course Authorization
|   +-- Authorize trainer for course
|   +-- Update authorization period
|   +-- Suspend or expire authorization
|   +-- Query authorized trainers for course
|
+-- Compensation Rate Management
|   +-- Configure payment basis
|   +-- Configure amount
|   +-- Apply optional batch specificity
|   +-- Apply optional session specificity
|   +-- Effective-date compensation rate
|   +-- Resolve applicable rate
|
+-- Eligibility and Integration Services
|   +-- Validate trainer active status
|   +-- Validate branch compatibility
|   +-- Validate course authorization
|   +-- Validate effective availability
|   +-- Return structured eligibility result
|
+-- Reporting and Audit
    +-- Trainer roster
    +-- Authorization coverage
    +-- Qualification coverage
    +-- Availability coverage
    +-- Compensation configuration coverage
    +-- Audit history
```

---

## 6. Business Capabilities and User Types

### 6.1 Internal User Capabilities

| Capability | Trainer Admin | Academic Coordinator | Training Coordinator | Branch Manager | Finance Authorized | Auditor | Reporting User |
|---|---:|---:|---:|---:|---:|---:|---:|
| View trainer list/profile | Yes | Yes | Yes | Yes | Restricted | Yes | Read-only |
| Create trainer profile | Yes | Optional | No | Optional | No | No | No |
| Update trainer profile | Yes | Optional | No | Optional | No | No | No |
| Change trainer status | Restricted | Optional | No | Yes | No | No | No |
| Manage qualifications | Yes | Optional | No | Optional | No | Read-only | No |
| Manage availability | Yes | Optional | Operational | Optional | No | Read-only | No |
| Manage course authorization | Restricted | Yes | Read-only | Optional | No | Read-only | No |
| Manage compensation rates | No by default | No | No | Restricted | Yes | Read-only | No |
| View compensation rates | No by default | No | No | Restricted | Yes | Read-only | No |
| View audit history | Restricted | Restricted | No | Restricted | Restricted | Yes | No |
| View reports | Optional | Yes | Yes | Yes | Restricted | Read-only | Yes |

Actual access is permission-based and shall not be inferred from role names.

### 6.2 External User Types

| External Type | Current Capability |
|---|---|
| Trainer | Subject of the trainer record. No direct self-service portal is included in current scope. |
| Qualification Institution | Reference value only; no direct system access. |
| External Document Verifier | Not directly integrated; document verification remains within Document Management workflow. |

---

## 7. Functional Requirements Checklist

| Requirement ID | Requirement | Priority |
|---|---|---|
| FR-FTM-001 | Search and list trainers with branch-scoped filtering, pagination, sorting, and status/type filters. | Must |
| FR-FTM-002 | Create a trainer profile linked to canonical Person data. | Must |
| FR-FTM-003 | View a complete trainer profile with qualifications, availability, authorizations, rate metadata, and assignment references. | Must |
| FR-FTM-004 | Update trainer profile attributes with optimistic concurrency protection. | Must |
| FR-FTM-005 | Change trainer operational status using controlled transition rules and effective dates. | Must |
| FR-FTM-006 | Manage trainer qualifications and link evidence documents. | Must |
| FR-FTM-007 | Manage branch-specific recurring trainer availability windows with effective dating. | Must |
| FR-FTM-008 | Validate availability window overlaps and time bounds. | Must |
| FR-FTM-009 | Manage trainer-course authorization with effective periods and status. | Must |
| FR-FTM-010 | Query trainers eligible for a course, branch, and target date/time. | Must |
| FR-FTM-011 | Configure trainer compensation rates with supported payment bases and effective dates. | Must |
| FR-FTM-012 | Resolve applicable compensation rate by session, batch, trainer, and effective date specificity. | Should |
| FR-FTM-013 | Provide assignment eligibility validation to Training Delivery. | Must |
| FR-FTM-014 | Provide availability validation to Scheduling. | Must |
| FR-FTM-015 | Show trainer batch and session assignment references without owning assignment lifecycle. | Should |
| FR-FTM-016 | Support soft deletion and deactivation while protecting referenced records. | Must |
| FR-FTM-017 | Provide trainer operational reports and export within permission and branch scope. | Should |
| FR-FTM-018 | Record immutable audit evidence for sensitive trainer actions. | Must |
| FR-FTM-019 | Enforce server-side branch isolation and consolidated reporting rules. | Must |
| FR-FTM-020 | Emit in-process domain events for trainer lifecycle and configuration changes. | Should |

---

## 8. Permission Model Overview

### 8.1 Permission Codes

| Permission Code | Purpose |
|---|---|
| `trainer.read` | View trainer list and base profile within branch scope. |
| `trainer.create` | Create trainer profiles. |
| `trainer.update` | Update trainer profile data. |
| `trainer.status.manage` | Activate, deactivate, or suspend trainer profile subject to transition rules. |
| `trainer.qualification.read` | View qualification records. |
| `trainer.qualification.manage` | Create, update, or soft delete qualification records. |
| `trainer.availability.read` | View availability windows. |
| `trainer.availability.manage` | Create, update, deactivate, and soft delete availability windows. |
| `trainer.authorization.read` | View course authorizations. |
| `trainer.authorization.manage` | Create, update, suspend, expire, or deactivate course authorization. |
| `trainer.compensation.read` | View compensation rate structures. |
| `trainer.compensation.manage` | Create and update compensation rate structures. |
| `trainer.eligibility.read` | Query trainer eligibility for course/branch/time. |
| `trainer.report.view` | View trainer operational reports. |
| `trainer.report.export` | Export authorized report datasets. |
| `trainer.audit.read` | View trainer-related audit history. |
| `trainer.report.consolidated.view` | Permit consolidated cross-branch reporting where branch access also allows it. |

### 8.2 Enforcement Rules

1. Every server action, route handler, service method, and repository query shall validate authorization before data access.
2. Branch context shall be derived from authenticated session context and validated against UserBranchAccess.
3. A client-supplied branchId shall never expand access beyond the authenticated user’s authorized branch set.
4. Compensation permissions shall be evaluated independently from general trainer read permissions.
5. Audit-log access shall require explicit permission.
6. Consolidated reporting shall require both authorized branch scope and `trainer.report.consolidated.view` permission.

---

## 9. Security and Audit Requirements Summary

1. All writes require authenticated users and explicit action permissions.
2. All reads are branch-scoped on the server.
3. Sensitive personal data comes from the Party/Person source and shall not be redundantly copied into trainer tables.
4. Compensation amounts are sensitive financial configuration and require separate read/manage permissions.
5. Trainer status changes, course authorization changes, compensation rate changes, qualification changes, and availability changes shall be audited.
6. Audit entries shall record entity type, entity ID, action, old value, new value, performedBy, performedAt, IP address when available, and reason where required.
7. No physical delete operation is permitted through the module.
8. Records shall use soft-delete semantics with `isDeleted` and `deletedAt` where implemented in the operational schema.
9. Effective-dated records shall validate `effectiveEndDate >= effectiveStartDate` when an end date exists.
10. Concurrent updates shall use a `version` field or equivalent optimistic concurrency check for mutable aggregate records.
11. API responses shall not expose compensation data unless `trainer.compensation.read` is granted.
12. Logs shall avoid raw Civil ID, passport number, visa number, and other protected identity values.

---

## 10. Non-Functional Requirements Summary

| Category | Requirement |
|---|---|
| Performance | Trainer list queries should return within 500 ms at p95 under normal operating load, excluding network latency. |
| Performance | Trainer eligibility validation should complete within 300 ms at p95 for a single trainer/course/branch/time request under normal operating load. |
| Performance | Standard create/update operations should complete within 700 ms at p95 excluding external document-storage latency. |
| Availability | Module functionality shall follow the admin portal availability target and degrade safely if a non-owning downstream reporting consumer is unavailable. |
| Scalability | List APIs shall use server-side pagination with a maximum page size of 100 records. |
| Consistency | Trainer profile, status, qualification, availability, authorization, and compensation writes shall be transactionally consistent within the modular-monolith database boundary. |
| Security | Authorization and branch filters shall be enforced before repository execution wherever feasible and before returning any data. |
| Auditability | Critical write actions shall generate audit records in the same business transaction or through reliable in-process transactional integration. |
| Localization | User-visible dates/times default to Oman GST (UTC+4); English and Arabic shared Person display values shall be supported where available. |
| Usability | Validation errors shall identify the failing field, business rule code, and actionable correction message. |
| Data Integrity | Duplicate TrainerProfile per Person, duplicate active trainer code, invalid effective periods, overlapping conflicting availability windows, and conflicting active authorization periods shall be prevented. |
| Maintainability | Domain logic shall remain inside the trainer-management package/application/domain layers and not inside UI components. |
| Observability | Structured logs, metrics, and traces shall include module, operation, actor ID, branch context, result status, and correlation ID without leaking protected identity values. |

---

## 11. Domain Ownership Summary

| Data / Behavior | Owner | Module 09 Role |
|---|---|---|
| Person identity | Party / Person shared capability | Reference and reuse |
| TrainerProfile | Faculty / Trainer Management | Own |
| TrainerQualification | Faculty / Trainer Management | Own |
| TrainerAvailability | Faculty / Trainer Management | Own |
| TrainerCourseAuthorization | Faculty / Trainer Management | Own |
| TrainerCompensationRate | Faculty / Trainer Management | Own |
| Course | Course Catalog | Reference |
| Batch / BatchTrainer | Training Delivery | Validate eligibility and expose trainer data |
| Session | Training Delivery / Scheduling boundary | Validate availability and eligibility |
| Document | Document Management | Reference qualification evidence |
| Completion recommendation | Exam & Completion | Supply trainer reference only |
| Payroll | Future Payroll Management | Provide rate inputs only when integration is defined |
| AuditLog | Audit & Compliance | Produce auditable actions |
