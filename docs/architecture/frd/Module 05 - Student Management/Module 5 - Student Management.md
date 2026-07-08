# Functional Requirement Document

## Module 05: Student Management

**Document Version:** 3.0
**Module Code:** STU  
**Phase:** Phase 1  
**Status:** Approved  
**Owned Bounded Context:** Admission & Enrollment Management

---

## 1. Purpose and Objective

The purpose of **Module 05: Student Management** is to maintain the authoritative learner profile used across ASTI's enrollment lifecycle. It governs the `StudentProfile` record, profile search and retrieval, masked PII handling, identity card status, document compliance visibility, and branch-scoped access to student records.

This module does not create a separate learner lifecycle. It works as the student-profile subdomain inside the enrollment-centric model, where `Admission` establishes the administrative record and `Enrollment` remains the central business transaction for training delivery.

### Core Objectives

- Maintain a single student identity linked to a single `Person` record.
- Support student identity attributes such as civil ID, passport number, and visa number for duplicate prevention and compliance checks.
- Keep student access strictly branch-scoped unless consolidated reporting access is granted.
- Support English and Arabic search and display for names and profile labels.
- Protect sensitive personal information through masking, justification-based reveal, and audit logging.
- Track identity card issue status and compliance visibility for student records.
- Provide operational visibility into student status, document compliance, and profile history without hard deletes.

## 2. Business Goals

| Goal ID        | Business Goal                                 | Success Measure                                                                           |
| :------------- | :-------------------------------------------- | :---------------------------------------------------------------------------------------- |
| **BO-STU-001** | Eliminate duplicate student identities.       | Every student profile links to one unique `Person` record.                                |
| **BO-STU-002** | Enforce branch isolation for student records. | 100% of read and write actions honor server-side branch scope.                            |
| **BO-STU-003** | Protect sensitive student data.               | 100% of PII reveal actions are justification-based and audited.                           |
| **BO-STU-004** | Improve student record accuracy.              | Student profile updates are reflected immediately in operational search and detail views. |
| **BO-STU-005** | Improve compliance readiness.                 | Student identity card and document status are traceable for audits.                       |

## 3. Scope

### In Scope

- Student profile search and retrieval.
- Student profile creation from an existing `Person` record.
- Student profile update for name, contact, and identity attributes stored in `Person`.
- Masked PII display and controlled reveal.
- Student status management: `Pending`, `Active`, `Suspended`, `Archived`.
- Student identity card issue tracking and reissue logging.
- Student document compliance visibility using the `Document`, `DocumentOwner`, and `DocumentVerification` models.
- Audit logging for sensitive profile operations.
- Branch-scoped visibility using linked admission and enrollment history.
- Read-only student portal self-view for linked student accounts.

### Excluded

- Admission intake creation and approval.
- Enrollment creation, approval, confirmation, and cancellation.
- Batch scheduling and classroom allocation.
- Fee collection, invoice issuance, refund processing, and receivables.
- Certificate eligibility, certificate generation, and certificate verification.
- Student self-service edits or change requests.
- HR, payroll, biometric attendance, and external brokers.

## 4. Stakeholders & Actors

### Human Actors

- **Super Admin:** Global access for administration, audit review, and exceptional overrides.
- **Branch Manager:** Branch-scoped oversight of student records, status changes, and identity card approvals.
- **Registrar:** Maintains student profiles, identity cards, and document compliance records.
- **Counselor:** Searches student records for duplicate-prevention and admission support.
- **Academic Coordinator:** Reviews student status and compliance history for academic operations.
- **Finance Officer:** Reviews student visibility for billing or clearance checks without owning the student profile.

### System Actors

- **Identity & Access Management:** Supplies authenticated user context, branch access, and permissions.
- **Audit & Compliance:** Persists immutable audit records for sensitive operations.
- **Document Management:** Owns file storage, owner links, and document verification records.
- **Notification Engine:** Raises document-expiry reminders and administrative alerts.
- **Enrollment Context:** Supplies branch and lifecycle references for student visibility rules.

## 5. Functional Overview

```text
Module 05: Student Management (STU)
  ├── 1. Student Directory and Lookup
  │    ├── Branch-Scoped Student Search
  │    ├── Global Duplicate Preflight Search
  │    └── Masked PII Display
  ├── 2. Student Profile Administration
  │    ├── Create Student Profile
  │    ├── Update Profile Details
  │    └── Maintain Student Status
  ├── 3. Identity Card Control
  │    ├── Issue ID Card
  │    ├── Reissue ID Card
  │    └── Maintain Card History
  ├── 4. Document Compliance Visibility
  │    ├── Attach Student Documents
  │    ├── Verify Document Status
  │    └── Track Compliance Status
  └── 5. Audit and History
       ├── Profile Change Audit Trail
       ├── PII Reveal Audit Trail
       └── Status Change History
```

## 6. Business Capabilities & User Types

### Internal User Capabilities

- Search by student number, name, mobile, email, or national ID with branch filtering.
- Create or update student profiles only within authorized branch scope.
- Reveal masked PII with a mandatory business justification.
- Change student status with recorded reason and audit metadata.
- Issue and reissue student identity cards.
- Review document verification and compliance status information.

### External User Types

- **Student:** Receives identity card and compliance outcomes through staff-operated workflows.
- **Corporate Participant:** Becomes visible as a student once linked through enrollment workflows.
- **Parent or Guardian:** May be represented in documents or contact information where captured elsewhere in the platform, but does not directly operate this module in Phase 1.

## 7. Functional Requirements Checklist

### Search and Access

- **FR-STU-001:** Search student profiles within branch scope.
- **FR-STU-002:** Search global `Person` records for duplicate-prevention checks.
- **FR-STU-003:** View student profile details and enrollment-linked visibility markers.
- **FR-STU-004:** Reveal masked PII with justification logging.

### Profile Administration

- **FR-STU-005:** Create a student profile from a valid `Person` record.
- **FR-STU-006:** Update student-linked identity data stored on `Person`.
- **FR-STU-007:** Change student status and preserve the reason for the change.

### Identity Card and Compliance

- **FR-STU-008:** Issue or reissue student identity cards.
- **FR-STU-009:** Attach and verify student documents for compliance review.
- **FR-STU-010:** Monitor and surface document-expiry compliance status.

### Audit and Administration

- **FR-STU-011:** Record audit entries for every sensitive profile action.
- **FR-STU-012:** Provide student history and operational timeline views.

## 8. Permission Model Overview

| Permission Code                   | Typical Roles                                                           | Scope Rule                                                         |
| :-------------------------------- | :---------------------------------------------------------------------- | :----------------------------------------------------------------- |
| `student.read`                    | Registrar, Counselor, Academic Coordinator, Branch Manager, Super Admin | Branch-scoped unless consolidated reporting permission is present. |
| `student.create`                  | Registrar, Super Admin                                                  | Branch-scoped create only.                                         |
| `student.update`                  | Registrar, Super Admin                                                  | Branch-scoped update only.                                         |
| `student.status.change`           | Branch Manager, Super Admin                                             | Requires reason code and audit trail.                              |
| `student.archive`                 | Branch Manager, Super Admin                                             | Soft-delete archival only.                                         |
| `student.restore`                 | Branch Manager, Super Admin                                             | Restore archived records only.                                     |
| `student.idcard.manage`           | Registrar, Branch Manager, Super Admin                                  | Branch-scoped issue, update, revoke, or reissue.                   |
| `student.duplicate.read`          | Registrar, Compliance Officer, Super Admin                              | Read duplicate cases and candidate details.                        |
| `student.duplicate.resolve`       | Registrar, Compliance Officer, Super Admin                              | Resolve duplicate cases without merge.                             |
| `student.merge`                   | Registrar, Compliance Officer, Super Admin                              | Merge confirmed duplicates with survivor selection.                |
| `student.export`                  | Reporting User, Registrar, Super Admin                                  | Export with branch and field restrictions.                         |
| `student.audit.read`              | Branch Manager, Super Admin                                             | Read access to action history and reveal logs.                     |
| `student.identity.unmasked.read`  | Branch Manager, Super Admin                                             | Unmasked identity visibility only where policy allows.             |
| `student.portal.self.read`        | Student                                                                 | Read-only linked self profile.                                     |
| `student.trainer.roster.read`     | Trainer                                                                 | Read-only roster-context quick view.                               |
| `student.related.admission.read`  | Registrar, Branch Manager, Super Admin                                  | Read linked admission summary.                                     |
| `student.related.enrollment.read` | Registrar, Branch Manager, Super Admin                                  | Read linked enrollment summary.                                    |
| `student.related.document.read`   | Registrar, Branch Manager, Super Admin                                  | Read linked document summary.                                      |

## 9. Security & Audit Requirements Summary

1.  All student searches and reads must be enforced server-side by branch scope.
2.  Student PII must be masked by default in all UI and API responses.
3.  PII reveal requires justification text and creates an `AuditLog` entry.
4.  Student status changes, ID card issuance, and document verification changes must be audited.
5.  Soft delete must be used for profile-related operational records; no hard deletes are permitted for sensitive student data.
6.  Audit records must include actor, branch, entity type, entity ID, action, pre-state, post-state, and reason when applicable.

## 10. Non-Functional Requirements Summary

- **Branch Search Performance:** Student directory search should return within 150 ms for the common branch-scoped case under normal production load.
- **Audit Write Reliability:** Sensitive write actions must persist audit data in the same transaction as the business update.
- **Localization:** UI labels and search inputs must support English and Arabic where profile display requires bilingual rendering.
- **Timezone:** All timestamps are stored in UTC and displayed in Oman local time (UTC+4) for operational users.
- **Availability:** Student profile lookups should remain available during normal admin portal operating hours with graceful degradation if document preview is unavailable.
- **Data Retention:** Profile and audit history must remain queryable after soft delete.
