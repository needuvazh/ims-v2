# Module 10 - Exam, Result & Completion Management

## 1. Purpose and Objective

Module 10 governs the post-delivery academic evaluation lifecycle for ASTI IMS: exam definition and scheduling, result recording, pass/fail determination, completion-rule evaluation, trainer recommendation, multi-level completion approval, and publication of completion eligibility for downstream certificate issuance.

The module exists to ensure that an enrollment is not marked complete merely because a batch ended. Completion must be derived from the approved course completion rule, evidence owned by authoritative contexts, recorded assessment outcomes, and the required approval workflow. The module preserves the enrollment-centric architecture: every result and completion record is anchored to an `Enrollment`, and no parallel learner-course completion record is introduced.

The module is bounded by the following ownership rules:

- Course Catalog owns `CourseCompletionRule` and its configuration.
- Training Delivery owns batches and sessions.
- Attendance owns attendance records and attendance calculation inputs.
- Finance owns invoice/payment truth and exposes payment-validation status.
- Exam, Result & Completion owns exams, results, completion evaluation outcome, course completion records, and completion approvals.
- Admission & Enrollment owns the `Enrollment` aggregate and lifecycle status.
- Certificate Management owns certificate generation, issue, verification, reissue, and revocation; it must not recompute completion eligibility.
- Identity & Access owns users, permissions, and branch access; branch scope must be enforced server-side.
- Audit & Compliance owns immutable audit evidence for sensitive changes and approvals.

## 2. Business Goals

| ID         | Business Goal                            | Success Intent                                                                                                                                                    |
| ---------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BO-EXC-001 | Standardize academic evaluation          | Every exam and result follows consistent validation, ownership, and audit rules.                                                                                  |
| BO-EXC-002 | Protect completion integrity             | No enrollment reaches approved completion until applicable attendance, exam, payment, and manual approval rules are satisfied.                                    |
| BO-EXC-003 | Maintain enrollment-centric traceability | Every result and completion decision is traceable to one valid enrollment, course, and batch.                                                                     |
| BO-EXC-004 | Reduce manual ambiguity                  | Completion decisions are produced from explicit course rules and authoritative evidence instead of undocumented judgment.                                         |
| BO-EXC-005 | Enforce segregation of duties            | Trainer recommendation, coordinator review, and branch manager approval remain distinct approval stages when manual approval is required.                         |
| BO-EXC-006 | Enable certificate readiness             | Publish a reliable completion-approved outcome that Certificate Management can consume without recalculating academic eligibility.                                |
| BO-EXC-007 | Preserve evidence and accountability     | Result changes, completion decisions, approval actions, and exceptional overrides are auditable with actor, time, old value, new value, and reason.               |
| BO-EXC-008 | Enforce branch isolation                 | Users can view or act only within branches granted by IAM branch access policy.                                                                                   |
| BO-EXC-009 | Support bilingual operations             | User-facing exam names, status labels, validation messages, and exports support English and Arabic presentation where required, without duplicating core records. |
| BO-EXC-010 | Provide operational visibility           | Authorized academic users can identify pending results, failed learners, completion bottlenecks, and approvals awaiting action.                                   |

## 3. Scope

### 3.1 Included

1. Create, update, schedule, activate, cancel, and close exams for a course and batch.
2. Validate exam dates against the target batch period and branch scope.
3. Record individual enrollment results for an exam.
4. Bulk-enter results for eligible enrollments in the exam batch.
5. Validate marks against exam maximum marks and derive pass/fail from pass marks.
6. Preserve result author and recorded timestamp.
7. Correct results through controlled, permission-protected, audited changes.
8. Evaluate completion eligibility for one enrollment or a branch-scoped batch population.
9. Consume the active `CourseCompletionRule` owned by Course Catalog.
10. Consume attendance evidence from Attendance Management.
11. Consume exam result evidence owned by this module.
12. Consume payment-validation evidence from Finance when payment is required.
13. Create and maintain one `CourseCompletion` record per enrollment.
14. Record trainer recommendation.
15. Execute coordinator review and branch manager approval when manual approval is required.
16. Record rejection with mandatory remarks and preserve approval history.
17. Update completion outcome exposed to Enrollment without taking ownership of the Enrollment aggregate itself.
18. Emit/produce certificate-eligibility outcome for Certificate Management after completion approval and required payment validation.
19. Provide operational search, filtering, pending-work queues, and branch-scoped read models for exams, results, and completion approvals.
20. Audit sensitive academic and approval actions.
21. Soft-delete or deactivate records only according to repository conventions; no hard delete behavior is permitted.

### 3.2 Excluded

1. Course completion rule creation or maintenance; owned by Course Catalog.
2. Attendance marking or attendance correction; owned by Attendance Management.
3. Invoice, payment, receipt, refund, or receivable processing; owned by Finance & Receivables.
4. Enrollment creation, course assignment, batch assignment, transfer, cancellation, or student-profile ownership; owned by Admission & Enrollment.
5. Batch/session delivery planning; owned by Training Delivery and Scheduling.
6. Certificate generation, numbering, QR generation, issue, reissue, revocation, and public verification; owned by Certificate Management.
7. Trainer profile and qualification maintenance; owned by Faculty / Trainer Management.
8. Generic approval-engine ownership; approval records/history remain governed by Audit & Compliance conventions while this module owns the completion business decision.
9. Online proctoring, question banks, computer-based testing engines, plagiarism detection, and external LMS integration; not defined in the current DDD or ER model.
10. Separate persisted `Assessment`, `Grade`, or `CompletionRuleEvaluation` tables unless the DDD/ER model is formally amended; these appear conceptually in DDD but not as concrete ER entities.

## 4. Stakeholders and Actors

### 4.1 Human Actors

| Actor                     | Responsibilities in Module 10                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Trainer / Instructor      | View assigned batch exams, record permitted results, recommend learner completion, review own submitted work.                          |
| Academic Coordinator      | Plan exams where authorized, monitor missing results, review completion recommendations, approve/reject the coordinator stage.         |
| Branch Manager            | Final branch-level completion approval or rejection where manual approval applies; monitor branch completion backlog.                  |
| Academic Administrator    | Create and manage exam definitions, perform authorized result corrections, run completion evaluations, resolve operational exceptions. |
| Finance User              | No academic mutation rights; provides authoritative payment status through Finance-owned data or contracts.                            |
| Auditor / Compliance User | Read audit history and approval evidence subject to permission and branch policy; no academic mutation by default.                     |
| System Administrator      | Assigns IAM permissions and branch access but does not receive academic rights merely by role name.                                    |

### 4.2 System Actors

| System Context                    | Interaction                                                                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Course Catalog Management         | Supplies active course completion rule: minimum attendance, exam requirement, payment requirement, manual approval requirement, and certificate allowance. |
| Admission & Enrollment Management | Supplies Enrollment identity, student, course, batch, branch, type, and lifecycle state; receives completion outcome through defined boundary.             |
| Training Delivery Management      | Supplies batch and session identity and batch-course relationship.                                                                                         |
| Attendance Management             | Supplies authoritative attendance percentage/evidence for the enrollment.                                                                                  |
| Finance & Receivables             | Supplies authoritative payment-validation outcome when required.                                                                                           |
| Faculty / Trainer Management      | Supplies trainer identity and assignment/authorization reference used for recommendation eligibility.                                                      |
| Certificate Management            | Consumes completion-approved/certificate-eligible outcome and performs certificate issuance independently.                                                 |
| Identity & Access Management      | Supplies authentication, permissions, and branch-access scope.                                                                                             |
| Audit & Compliance                | Records critical changes, approval actions, and reasons.                                                                                                   |
| Reporting & Dashboards            | Consumes read-only academic outcomes and aggregates; does not mutate exam/result/completion transactions.                                                  |
| Communication & Notification      | May notify actors about scheduled exams, pending results, approval tasks, or final outcomes; delivery ownership remains outside this module.               |

## 5. Functional Overview

```text
Exam, Result & Completion Management
├── Exam Management
│   ├── Create Exam
│   ├── Schedule / Reschedule Exam
│   ├── Activate Exam
│   ├── Cancel Exam
│   ├── Close Exam
│   └── Search and View Exams
├── Result Management
│   ├── Individual Result Entry
│   ├── Bulk Result Entry
│   ├── Marks Validation
│   ├── Pass / Fail Determination
│   ├── Result Publication / Finalization
│   ├── Controlled Correction
│   └── Missing Result Monitoring
├── Completion Evaluation
│   ├── Load Course Completion Rule
│   ├── Validate Attendance Evidence
│   ├── Validate Exam Evidence
│   ├── Validate Payment Evidence
│   ├── Determine Completion Status
│   ├── Record Evaluation Snapshot
│   └── Re-evaluate After Authoritative Change
├── Completion Approval
│   ├── Trainer Recommendation
│   ├── Academic Coordinator Review
│   ├── Branch Manager Approval
│   ├── Rejection with Reason
│   └── Approval History
├── Completion Outcome Integration
│   ├── Update Enrollment Completion Outcome
│   ├── Publish Certificate Eligibility
│   └── Reporting Read Models
└── Governance
    ├── Permission Enforcement
    ├── Branch Isolation
    ├── Audit Trail
    ├── Soft Delete / Deactivation
    └── Optimistic Concurrency
```

## 6. Business Capabilities and User Types

### 6.1 Internal User Capabilities

| Capability                |                      Trainer |            Academic Coordinator |         Branch Manager |                         Academic Admin |   Auditor |
| ------------------------- | ---------------------------: | ------------------------------: | ---------------------: | -------------------------------------: | --------: |
| View branch-scoped exams  |               Assigned scope |                             Yes |                    Yes |                                    Yes | Read-only |
| Create/manage exam        |                No by default |                       Permitted | Optional by permission |                              Permitted |        No |
| Record result             | Assigned batch by permission |                   By permission |          No by default |                          By permission |        No |
| Bulk result entry         | Assigned batch by permission |                   By permission |          No by default |                          By permission |        No |
| Correct finalized result  |                No by default |                      Restricted |             Restricted |                  Restricted permission |        No |
| Run completion evaluation |             Limited/assigned |                             Yes |                   View |                                    Yes |        No |
| Recommend completion      |          Yes, assigned batch | Optional fallback by permission |                     No |                             Restricted |        No |
| Coordinator review        |                           No |                             Yes |                     No | Delegated only if explicitly permitted |        No |
| Final branch approval     |                           No |                              No |                    Yes | Delegated only if explicitly permitted |        No |
| View approval history     |                 Own/assigned |                             Yes |                    Yes |                                    Yes |       Yes |
| View audit history        |                No by default |                      Restricted |             Restricted |                             Restricted |       Yes |

### 6.2 External User Capabilities

No external actor directly mutates Module 10 in the current single-admin-portal scope. Student, trainer portal, corporate portal, and public exam experiences are future application surfaces unless separately approved. Reporting or status exposure to future portals must consume read models and must not bypass module authorization.

## 7. Functional Requirements Checklist

| ID         | Requirement                                                                                                                        | Priority |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-EXC-001 | Create a branch-scoped exam linked to a valid course and batch.                                                                    | Must     |
| FR-EXC-002 | Update, reschedule, activate, cancel, and close an exam under state and permission controls.                                       | Must     |
| FR-EXC-003 | Search, filter, and view exams by branch, course, batch, date, and status.                                                         | Must     |
| FR-EXC-004 | Load eligible enrollment roster for an exam from the exam batch.                                                                   | Must     |
| FR-EXC-005 | Record an individual result with marks, derived grade representation where configured, and pass/fail status.                       | Must     |
| FR-EXC-006 | Record results in bulk with per-row validation and atomicity policy clearly surfaced to the user.                                  | Must     |
| FR-EXC-007 | Finalize results and prevent unauthorized silent modification.                                                                     | Must     |
| FR-EXC-008 | Correct a finalized result through restricted permission, mandatory reason, concurrency protection, and audit trail.               | Must     |
| FR-EXC-009 | Identify missing results for exam-required completion evaluation.                                                                  | Must     |
| FR-EXC-010 | Evaluate completion eligibility using the active course completion rule and authoritative evidence.                                | Must     |
| FR-EXC-011 | Persist one course-completion outcome per enrollment.                                                                              | Must     |
| FR-EXC-012 | Support trainer recommendation for completion.                                                                                     | Must     |
| FR-EXC-013 | Support academic coordinator review and decision.                                                                                  | Must     |
| FR-EXC-014 | Support branch manager final approval and rejection with remarks.                                                                  | Must     |
| FR-EXC-015 | Re-evaluate completion after authorized evidence changes while preserving audit history.                                           | Must     |
| FR-EXC-016 | Expose completion-approved and certificate-eligible outcome to Certificate Management without issuing certificates.                | Must     |
| FR-EXC-017 | Synchronize completion outcome with Enrollment through a defined application boundary without direct cross-context table mutation. | Must     |
| FR-EXC-018 | Enforce server-side branch scope on all commands and queries.                                                                      | Must     |
| FR-EXC-019 | Enforce permission-based authorization independent of hardcoded role names.                                                        | Must     |
| FR-EXC-020 | Provide pending-result, pending-evaluation, and pending-approval work queues.                                                      | Should   |
| FR-EXC-021 | Provide branch-scoped exports for exams, results, and completion decisions.                                                        | Should   |
| FR-EXC-022 | Produce audit evidence for result corrections, completion decisions, and approval actions.                                         | Must     |
| FR-EXC-023 | Use soft-delete/deactivation conventions and optimistic concurrency for mutable operational records.                               | Must     |
| FR-EXC-024 | Support English/Arabic display labels and localized operational output where required.                                             | Should   |

## 8. Permission Model Overview

Permissions are capability-based and must be checked server-side. Role names must not be used as authorization logic.

Recommended permission codes for this module:

```text
exam.read
exam.create
exam.update
exam.schedule
exam.activate
exam.cancel
exam.close
result.read
result.record
result.bulk-record
result.finalize
result.correct
completion.read
completion.evaluate
completion.recommend
completion.coordinator-review
completion.final-approve
completion.reject
completion.reevaluate
completion.export
completion.audit.read
```

Authorization must combine:

```text
Authenticated User
    AND Required Permission
    AND Branch Access to target resource branch
    AND Domain eligibility (for example assigned trainer where required)
    AND Valid entity state transition
    AND Optimistic concurrency/version check for mutable records
```

Consolidated views are allowed only where IAM branch policy permits `canViewConsolidated` or applicable child-branch visibility. A consolidated read permission never implies mutation rights across those branches.

## 9. Security and Audit Requirements Summary

1. All commands and sensitive queries require authenticated identity.
2. Authorization is server-side; client-side hiding is only a usability measure.
3. Branch scope must be derived from trusted session/IAM context and target entity relationships, never accepted solely from client-supplied branch IDs.
4. Marks, result status, completion decision, approval actor, and approval remarks are sensitive academic records and changes must be auditable.
5. Finalized result correction requires a separate permission and mandatory business reason.
6. Approval actions must capture approver, stage, action, remarks where required, and action timestamp.
7. Rejected completion decisions require a reason.
8. Hard deletion is prohibited. Cancellation, archival, or repository-standard soft delete must be used.
9. Mutating commands should use version-based optimistic locking where supported by the repository base model.
10. Bulk result imports/entries must validate every row, reject cross-branch enrollment references, and return row-level error details without exposing unauthorized records.
11. Audit records must include who, what, when, old value, new value, and reason when applicable.
12. Logs must avoid unnecessary exposure of Civil ID, passport number, or unrelated person PII; this module should operate primarily on enrollment and student display references.

## 10. Non-Functional Requirements Summary

| Area            | Requirement Summary                                                                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance     | Standard list/detail reads should target p95 under 2 seconds under normal production load; single-record commands should target p95 under 2 seconds excluding external integration latency.                            |
| Bulk Processing | A branch-scoped result batch should support at least the configured batch capacity without requiring per-student page submissions. Validation feedback must identify row-level failures.                               |
| Availability    | Academic records and completion decisions must remain available during normal institute operating hours with graceful failure when a dependency is unavailable.                                                        |
| Consistency     | Result finalization and completion approval require transactional integrity within this bounded context. Cross-context updates must use explicit application boundaries and idempotent handling where events are used. |
| Concurrency     | Mutable exam, result, and completion records must reject stale writes rather than silently overwrite newer data.                                                                                                       |
| Scalability     | Queries must be branch-filterable and indexed by common dimensions such as batch, course, enrollment, exam date, and status.                                                                                           |
| Usability       | Result entry supports keyboard-efficient bulk workflows, clear validation, unsaved-change warning, and bilingual labels where required.                                                                                |
| Accessibility   | Admin UI controls should meet WCAG 2.1 AA expectations for keyboard access, labels, error association, and status presentation.                                                                                        |
| Auditability    | Sensitive mutations are reconstructable from audit evidence and approval history.                                                                                                                                      |
| Recoverability  | Owned transactional tables are included in repository backup and recovery procedures; restored data must preserve relational consistency among Exam, Result, CourseCompletion, and CompletionApproval.                 |
| Observability   | Commands must produce structured logs and metrics for failures, pending queues, evaluation failures, correction frequency, and approval latency without logging sensitive PII.                                         |

## 11. DDD Ownership Notes and Known Cross-Context Dependencies

| Concern                           | Owner                          | Module 10 Responsibility                                          | Boundary Rule                                                                        |
| --------------------------------- | ------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Course completion rule            | Course Catalog                 | Read and evaluate                                                 | Do not duplicate rule ownership in completion records.                               |
| Enrollment identity and lifecycle | Admission & Enrollment         | Anchor result/completion to Enrollment and publish outcome        | Do not create a parallel learner-course lifecycle.                                   |
| Batch and session delivery        | Training Delivery              | Validate exam course/batch relationship and roster scope          | Do not mutate Batch or Session directly.                                             |
| Attendance                        | Attendance                     | Consume attendance percentage/evidence                            | Do not calculate from direct attendance table ownership assumptions in domain layer. |
| Payment truth                     | Finance & Receivables          | Consume payment validation only when rule requires it             | Do not derive payment truth from copied invoice/payment data.                        |
| Trainer identity/assignment       | Faculty / Trainer              | Validate recommendation actor eligibility                         | Do not duplicate trainer profiles.                                                   |
| Certificate                       | Certificate Management         | Produce eligibility outcome                                       | Never generate, number, or issue certificate here.                                   |
| User/permission/branch access     | IAM                            | Enforce permission and branch policy                              | No hardcoded role checks.                                                            |
| Audit/approval history            | Audit & Compliance conventions | Produce auditable business actions and preserve approval evidence | No unaudited override path.                                                          |
| Reporting                         | Reporting & Dashboards         | Expose read models / data contracts                               | Reporting remains read-only consumer.                                                |

### Known Model Alignment Notes

1. DDD identifies `Exam`, `Assessment`, `Result`, `Grade`, `CompletionRuleEvaluation`, `CourseCompletion`, and `CompletionApproval` as core concepts of the context.
2. ER Model concretely defines `Exam`, `Result`, `CourseCompletion`, and `CompletionApproval`.
3. `Assessment`, `Grade`, and `CompletionRuleEvaluation` are not concrete ER entities. This FRD therefore treats:
   - assessment behavior as represented by `Exam` in the current persisted model;
   - grade as a field on `Result`, not a separate master aggregate;
   - completion-rule evaluation as domain/application behavior whose final materialized outcome is stored in `CourseCompletion`.
4. If ASTI later requires multiple assessment components, weighted assessment structures, grade scales, or persisted evaluation evidence snapshots, the DDD and ER model should be amended before implementation.
5. The ER model supports only one `CourseCompletion` per `Enrollment`; the module must enforce this invariant.
6. The completion approval workflow is explicitly Trainer Recommendation → Academic Coordinator Review → Branch Manager Approval. The module must not silently collapse these stages when `manualApprovalRequired = true`.
