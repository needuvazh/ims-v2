# Functional Requirement Document
## Module 05: Student Management
**Document Version:** 1.0  
**Module Code:** STU  
**Phase:** Phase 1  
**Status:** Approved  
**Owned Bounded Contexts:** Student Management Context

---

## 1. Purpose and Objective

The primary purpose of **Module 05: Student Management** is to manage the long-term lifecycle, profile integrity, document compliance, and branch scope of admitted learners at the Al Saud Training Institute (ASTI). While Module 04 governs the initial admission and course-batch enrollment transitions, Module 05 acts as the single source of truth for the student's profile details, emergency contact mappings, PII accessibility auditing, branch transfers, identity card issuance history, and document compliance checks.

### Core Objectives:
*   **Physical Identity Maintenance:** Maintain link integrity between `StudentProfile` and the master `Person` record, enforcing zero-duplication policies across the platform.
*   **Bilingual Detail Support:** Support bilingual text entries (English/Arabic) for student names, nationalities, and descriptions to comply with Omani government training records.
*   **Audited PII Protection:** Encrypt and mask sensitive PII (Civil ID, Mobile, Email) by default, forcing users to submit a logged justification before revealing data.
*   **Strict Scoped Directory:** Provide branch-isolated directories that restrict branch administrators and registrars to viewing student profiles registered within their physical branch hierarchy.
*   **Logical Branch Transfers:** Manage the workflow of moving student profile access and records safely between different ASTI branches.
*   **Compliance & Document Controls:** Track mandatory compliance documents (Passport scans, Civil ID copies, Sponsorship letters) and their expiry dates with proactive notifications.

---

## 2. Business Goals

| Goal ID | Business Goal | Metric / Target |
| :--- | :--- | :--- |
| **BO-STU-001** | Eliminate duplicate profile histories for returning learners. | 0% duplicate records across different branches using unified `Person` linkage. |
| **BO-STU-002** | Ensure complete compliance with Omani data privacy regulations. | 100% of PII access requests logged in `AuditLog` with explicit justifications. |
| **BO-STU-003** | Prevent unauthorized data visibility across ASTI branches. | 100% of search queries filtered by user’s branch scope unless reporting role is active. |
| **BO-STU-004** | Automate student status monitoring and audit trails. | 100% of status transitions (Active, Suspended, Inactive) audited with reason logs. |
| **BO-STU-005** | Reduce compliance overhead for document validation. | System-flagged alerts for expiring Civil IDs and passports $\ge 30$ days before expiry. |

---

## 3. Scope

### 3.1 In Scope
*   **Student Profile Maintenance:** Comprehensive updating of learner contact information, emergency contacts, relative relationships, and billing tags.
*   **Global & Local Directory Search:** Bilingual search operations matching name, phone, civil ID, or student number.
*   **PII Masking & Reveal Auditing:** Masking of sensitive fields at the API boundary, with audited decrypt/reveal workflows.
*   **Branch-to-Branch Transfers:** Formally requesting, reviewing, and executing student profile transfers across different branches.
*   **Student Status Lifecycles:** Transitions between `Active`, `Suspended` (due to disciplinary or financial blocks), and `Inactive`.
*   **Document Verification Repository:** Tracking validity status, file references, and expiry dates of mandatory files.
*   **Student ID Card Generation Logs:** Logging card printing occurrences, issue dates, and replacement fees.

### 3.2 Out of Scope (Phase 1)
*   **Admission Workflow & Intake:** Handled by [Module 04: Admission & Enrollment Management](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2004:%20Admission%20&%20Enrollment%20Management/Module%204:%20Admission%20&%20Enrollment%20Management.md).
*   **Academic Progression & Attendance:** Monitored by [Module 08: Attendance Management](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2008:%20Attendance%20Management.md) and Module 12 (Exams & Completion).
*   **Financial Ledgers & Payment Collections:** Handled by Finance, though this module reads invoice balances to enforce financial blocks.
*   **Biometric Enrollment:** Integration with local fingerprint scanners is deferred to Phase 2.

---

## 4. Stakeholders & Actors

### Human Actors:
*   **Super Admin:** Global read/write access. Can reveal PII without restriction (but still audited), override branch scopes, and approve branch transfers.
*   **Branch Manager:** Reviews and approves/rejects branch-to-branch transfer requests for students entering or leaving their branch.
*   **Registrar:** Responsible for updating profile details, uploading verified documents, requesting branch transfers, and issuing replacement ID cards.
*   **Academic Coordinator:** Accesses student records to view academic compliance, emergency contacts, and status logs.
*   **Counselor:** Searches the directory to check for duplicate profiles before registering new admission files.

### System Actors:
*   **Student Profile Service:** Backend module service enforcing status validation invariants, scoping, and data mapping.
*   **Notification Engine:** Asynchronous trigger dispatched when document expiration dates approach.
*   **Audit Logger:** System logger that writes immutable audit records to PostgreSQL for sensitive operations (PII reveals, branch transfers, status suspensions).

---

## 5. Functional Overview

```text
Module 05: Student Management
  ├── 1. Profile Directory & Identity Lookup
  │    ├── Global Duplicate Preflight (person-lookup)
  │    ├── Branch-Scoped Directory (student-profile-lookup)
  │    └── Audited Data Decryptor (student-pii-reveal)
  ├── 2. Profile Lifecycle Maintenance
  │    ├── Bilingual Name & Profile Editors
  │    ├── Emergency Contact & Family Mapping
  │    └── Status Management (Active, Suspended, Inactive)
  ├── 3. Branch Transfer Engine
  │    ├── Transfer Request Submission
  │    ├── Outgoing & Incoming Approvals
  │    └── Scoping Context Migration
  ├── 4. ID Card & Document Compliance
  │    ├── ID Card Issuance & Fee Audits
  │    ├── Mandatory Document Tracking
  │    └── Document Expiry Monitoring
  └── 5. Audit & History Timeline
       ├── Profile Modification Log
       └── PII Disclosure Audit Trails
```

---

## 6. Business Capabilities & User Types

### Internal User Capabilities (ASTI Staff):
*   **Branch-Scoped Search:** Instantly lookup student directories filtered automatically by the staff member's active branch permissions.
*   **Bilingual Search Engine:** Query records using English characters or Arabic script.
*   **Audited PII Reveal Request:** Access unmasked student mobile/email by providing a business justification reason.
*   **Compliance Document Validation:** Review uploaded ID scans, toggle verification flags, and set expiration dates.
*   **Suspension Management:** Suspend student profiles with clear classification reasons (e.g., academic, financial, disciplinary).

### Future Portal Capabilities (Not Phase 1):
*   No self-service student profile editing is supported in Phase 1; all edits must go through the Admin Portal.

---

## 7. Functional Requirements Checklist

### 7.1 Profile Directory & Identity Lookup (DIR)
*   **FR-STU-001:** Search global `Person` directory via phone, email, or National Civil ID (`person-lookup`).
*   **FR-STU-002:** Retrieve local branch-scoped directory of students (`student-profile-lookup`).
*   **FR-STU-003:** Reveal masked PII fields (mobile, email, national ID) with mandatory justification log (`student-pii-reveal`).

### 7.2 Profile Lifecycle Maintenance (LIF)
*   **FR-STU-004:** Create and update student profile fields supporting English/Arabic bilingual fields.
*   **FR-STU-005:** Map emergency contact information (Name, Relationship, Contact Number) linked to the profile.
*   **FR-STU-006:** Transition student status to `Suspended` or revert to `Active` with mandatory audit entries.

### 7.3 Branch Transfer Engine (TRN)
*   **FR-STU-007:** Initiate a student transfer request from Branch A to Branch B.
*   **FR-STU-008:** Approve or reject outgoing transfers by Branch A Manager.
*   **FR-STU-009:** Approve or reject incoming transfers by Branch B Manager.

### 7.4 ID Card & Document Compliance (DOC)
*   **FR-STU-010:** Log student ID card print commands, track issue sequence, and flag paid replacements.
*   **FR-STU-011:** Track mandatory identity documents (Passport, Civil ID, Certificates) with verification tags.
*   **FR-STU-012:** Scan and flag expiring student documents, routing automated alerts to task panels.

---

## 8. Permission Model Overview

Permissions are checked server-side within the user's active branch scope.

| Permission Name | Authorized Roles | Scope / Constraints |
| :--- | :--- | :--- |
| `student.read` | Registrar, Counselor, Coordinator, Manager, Super Admin | Read scoped to user's active branch context. |
| `student.write` | Registrar, Super Admin | Write scoped to user's active branch context. |
| `student.reveal_pii` | Branch Manager, Super Admin | Must provide justification text; logs to audit trail. |
| `student.suspend` | Branch Manager, Super Admin | Change status to Suspended. Scoped to branch. |
| `student.transfer_initiate` | Registrar, Super Admin | Initiate transfer. Scoped to source branch. |
| `student.transfer_approve` | Branch Manager, Super Admin | Approve outgoing or incoming transfer. |
| `student.document_verify` | Registrar, Branch Manager, Super Admin | Toggle document verification flags. |

---

## 9. Security & Audit Requirements Summary

1.  **Strict Branch Scoping:** Every query returning student profiles must join the `Admission` or `Enrollment` records to ensure the student has historical or active presence in the user's `branchId` context.
2.  **PII Encryption at Rest:** Fields `Person.nationalId`, `Person.mobile`, and `Person.email` must be encrypted using AES-256-GCM before writing to PostgreSQL.
3.  **Audited Reveals:** Any API call triggering a reveal must write to the `AuditLog` table containing the user ID, timestamp, target student profile ID, and the string justification. No decrypted PII values are saved in the log.
4.  **Disciplinary Action Audit:** Status changes to `Suspended` must preserve pre-state, post-state, and the suspension reason code for compliance.

---

## 10. Non-Functional Requirements Summary

*   **Concurrency Handling:** Profile status updates and branch transfer transactions must lock the target `StudentProfile` row (`SELECT FOR UPDATE`) to prevent concurrent updates from corrupting states.
*   **API Latency:** Scoped directory queries matching on partial names must execute within $\le 150\text{ms}$ under a load of 100 concurrent queries.
*   **Alert Automation:** The document monitoring cron sweep must execute daily at 00:05 GST (UTC+4), processing records within 5 minutes.
*   **Data Auditability:** Soft deletes ensure that student profiles, transfer histories, and document verifications are never hard-deleted.
