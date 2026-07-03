# Module 10: Faculty / Trainer Management – Main Index & Overview

## 1. Document Control
* **Version:** 1.0
* **Module Code:** TRN
* **System Component:** packages/trainer-management
* **Status:** Draft
* **Effective Date:** 2026-07-01
* **Author:** Principal Solutions Architect & Senior Staff Engineer

---

## 2. Purpose & Objectives
The purpose of the **Faculty / Trainer Management (Module 10)** is to serve as the single, authoritative system of record for all trainers, faculty members, and external consultants delivering courses at the Al Saud Training Institute (ASTI). 

The key objectives are:
1. **Centralized Identity Registry:** Map trainers directly to the shared `Person` model, preventing duplicate data entries for trainers who also act as students, administrative staff, or coordinators.
2. **Delivery Competency & Authorization Guarding:** Maintain a rigid matrix of which courses each trainer is authorized to teach, ensuring only certified personnel are assigned to batches.
3. **Branch-Scoped Availability Mapping:** Define weekly availability windows (by day and branch) that act as strict scheduling boundaries for the Scheduling context.
4. **Compensation Terms Standardization:** Standardize trainer payment terms (fixed, hourly, per session, or per student) on a per-batch basis to ensure clean upstream metrics for the Finance context.
5. **Document & Certification Compliance:** Track visas, civil IDs, and academic certificates, triggering notifications prior to expiration to avoid compliance breaches.

---

## 3. Business Goals
The implementation of Module 10 targets the following business goals:

| Goal ID | Goal Title | Business Objective / KPI | Target Metric |
| :--- | :--- | :--- | :--- |
| **BO-TRN-001** | Zero Identity Redundancy | Link 100% of Trainer Profiles to a central `Person` record. | 0 duplicate trainer/student contact entries. |
| **BO-TRN-002** | Zero Scheduling Collisions | Prevent scheduling assignments outside predefined branch-availability blocks. | 0 timetable conflicts due to trainer availability. |
| **BO-TRN-003** | Course Authorization Enforce | Restrict batch trainer assignment to authorized courses. | 100% compliance with course authorizations. |
| **BO-TRN-004** | Document Expiry Prevention | Provide email/portal alerts for expiring visas, licenses, and IDs. | 0 active trainers delivering sessions with expired docs. |
| **BO-TRN-005** | Standardized Compensation Handoff | Provide explicit payment terms parameters for every active batch. | 100% consistency in payment terms handed to Finance. |

---

## 4. Scope

### 4.1 In Scope
1. **Trainer Profile Management:** Registration and updates of trainer profiles containing specialization, joined date, and status, linked to the `Person` database entity.
2. **Academic & Professional Qualifications:** Cataloging degrees, certificates, and transcripts, including file links to Document Management.
3. **Course Authorization Matrix:** Setting valid course-trainer delivery linkages with effective start/end dates.
4. **Branch-Scoped Availabilities:** Creating recurring weekly availability slots (Monday-Sunday, Start Time - End Time) mapped to specific branches, and documenting temporary exceptions.
5. **Batch Trainer Assignments:** Recording trainer-to-batch links, specifying if they are the primary, assistant, or guest trainer.
6. **Payment Terms Definition:** Storing trainer payment base rules per batch (PerHour, PerSession, PerStudent, Fixed) to guide invoicing/receivables.
7. **Document Expiry Tracking:** Setting alerts for critical trainer documents (Visa, Passport, Trainer License, Civil ID).

### 4.2 Out of Scope
1. **HR Employee Master Management:** Standard HR functions such as benefits administration, payroll deductions, organizational charts, and full employee records.
2. **Payroll Run Execution:** The actual disbursement of salaries, generation of payslips, and tax withholding computations.
3. **Timesheet Approvals Workflow:** Timesheet logging and approval cycles (handled in Attendance/Scheduling).
4. **Offline Payment Gateways:** Direct electronic bank transfers and payment integrations (handled in Finance).

---

## 5. Stakeholders & Actors

### 5.1 Human Actors
* **Super Admin:** Has global read/write access across all branches. Can override system blocks (e.g. assigning a trainer with expired documentation).
* **Branch Admin:** Manages trainers and availabilities within their active branch context.
* **Academic Coordinator:** Assigns trainers to batches and checks course authorizations.
* **Trainer:** Accesses the Trainer Portal read-only view to check timetables, assigned batches, and document statuses.

### 5.2 System Actors
* **Trainer Portal:** Read-only interface rendering schedule, authorized courses, and profile info for the trainer.
* **Scheduling Engine:** Consumes trainer availability boundaries and outputs timetable slots without collisions.
* **Expiry Alert Worker:** Background scheduler checking document expiry dates and sending system notification alerts.

---

## 6. Functional Overview (Submodules)
```text
ASTI IMS: Faculty / Trainer Management (TRN)
├── 1. Trainer Profile Registry
│   ├── Create Trainer (Linked to Person ID)
│   ├── Update Trainer Metadata
│   └── Change Lifecycle Status (Active, Inactive, Suspended)
├── 2. Competency & Qualification Manager
│   ├── Add Academic Qualification Details
│   ├── Link Verification Documents
│   └── Map Authorized Courses (Course-Trainer Matrix)
├── 3. Branch Availability Scheduler
│   ├── Define Weekly Branch Availability Slots
│   ├── Log Off-Duty / Exception Dates
│   └── Validate Scheduling Boundary Violations
├── 4. Batch Allocation & Payment Mapping
│   ├── Assign Trainer to Batch (Primary / Assistant / Guest)
│   ├── Track Batch Effective Dates
│   └── Define Payment Terms (PerHour, PerSession, PerStudent, Fixed)
└── 5. Compliance & Audit Engine
    ├── Expiry Alerts Generation (Visas, Civil IDs, Licenses)
    ├── Server-Side Active Branch Isolation Filter
    └── Entity Change Logging (Audit Log)
```

---

## 7. Business Capabilities & User Types

### 7.1 Internal Users (ASTI Staff)
* **Capabilities:** Create, modify, suspend trainer profiles; manage qualifications; verify documents; establish availability windows; override scheduling warnings; map compensation rates.
* **Access Scope:** Strictly filtered by active branch context (Branch-scoping) unless granted cross-branch reporting permissions.

### 7.2 External Users (Trainers)
* **Capabilities:** Access read-only views of their own profile, assigned batches, timetable, course authorizations, document validation statuses, and upcoming expiration warnings.
* **Access Scope:** Read-only access restricted strictly to their own record.

---

## 8. Functional Requirements Checklist

| Requirement ID | Title | Description | Priority |
| :--- | :--- | :--- | :--- |
| **FR-TRN-001** | Create Trainer Profile with Person Link | Create a trainer profile linked to a shared `Person` record. Auto-generate a unique `TrainerCode`. | Must Have |
| **FR-TRN-002** | Add Qualification & Verification Documents | Capture degrees and certificates, linking them to file IDs from Document Management. | Must Have |
| **FR-TRN-003** | Define Availability Windows | Set branch-specific weekly availability schedules with active dating bounds. | Must Have |
| **FR-TRN-004** | Map Authorized Courses | Define the list of courses a trainer is authorized to deliver. | Must Have |
| **FR-TRN-005** | Track Delivery Payment Basis | Define the compensation model (Hourly, Session, Student, Fixed) for each batch. | Must Have |
| **FR-TRN-006** | Expiry Notification Alerts | Daily background search for expiring documents, triggering email/system notifications. | Must Have |
| **FR-TRN-007** | Branch Isolation Scoping | Restrict all queries and mutations to the user's active branch selection context. | Must Have |
| **FR-TRN-008** | Audit Log Maintenance | Record old and new JSON payloads for any modification to trainer profiles or availability. | Must Have |
| **FR-TRN-009** | Soft Delete Enforcement | Replace hard deletion with logical delete flags (`isDeleted`, `deletedAt`) across all models. | Must Have |

---

## 10. Permission Model Overview
The module utilizes a Role-Based Access Control (RBAC) model. Permissions are divided into three scoping levels: Action, Menu, and Report.

* **Menu Access:** Control visibility of "Trainer Master," "Qualifications View," "Availability Settings," and "Reports Dashboard" on the sidebar.
* **Action Access:**
  * `trainer:create` - Registers trainer and links Person.
  * `trainer:write` - Edits profile details, qualifications, and payment terms.
  * `trainer:suspend` - Sets trainer status to Suspended/Inactive.
  * `trainer:availability-manage` - Creates and alters availability windows.
  * `trainer:override-schedule` - Allows assigning a trainer outside their availability bounds or with expired documents.
* **Report Access:** Mapped to branch managers and coordinators for cross-trainer utilization and allocation lists.

---

## 11. Security & Audit Requirements Summary
* **PII Protection:** Email, mobile, and national identification documents (linked through `Person` or documents table) must be restricted. Only authorized administrative personnel can view complete numbers.
* **Audit Trail Integration:** Every modification to `TrainerProfile`, `TrainerAvailability`, and `BatchTrainer` must emit an entry to the `AuditLog` table capturing:
  * ID of user performing the change
  * Target entity type and ID
  * JSON representation of changed fields (`oldValue` vs `newValue`)
  * Correlation identifier and IP address
* **Relational Integrity Protection:** If a trainer profile is soft-deleted, active assignments (`BatchTrainer`) must be audited. No cascading deletes are permitted to prevent historical schedule reporting gaps.

---

## 12. Non-Functional Requirements Summary
* **Performance:** Availability validation queries triggered by the Scheduling Engine must return results in under **150ms** for search limits of up to 10 trainers simultaneously.
* **Concurrency:** The system must handle up to **100 concurrent schedule lookups** during high-intensity term planning without deadlocking database transactions.
* **Localization:**
  * Dates must be formatted as UTC in the database, rendering in local time GST (Gulf Standard Time - UTC+4) in UI/API.
  * Support bilingual English/Arabic views for trainer certificates and portal read views.
  * Numeric compensation figures must format with exactly **3 decimals** in compliance with the Omani Rial standard (OMR).
