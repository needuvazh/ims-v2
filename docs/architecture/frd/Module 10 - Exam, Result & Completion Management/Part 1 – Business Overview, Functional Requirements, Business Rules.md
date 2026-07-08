# Part 1 – Business Overview, Functional Requirements, Business Rules

## 1. Introduction

Exam, Result & Completion Management is the academic decision context that converts training participation and assessment evidence into a controlled completion outcome. Its primary responsibility is not merely storing marks. It determines whether a specific `Enrollment` has satisfied the completion policy defined by the owning Course Catalog context and whether the resulting decision has passed the required approval workflow.

The design is intentionally enrollment-centric. An exam belongs to a course and batch; a result belongs to an exam and enrollment; a course completion belongs to an enrollment; and completion approvals belong to the course-completion record. This prevents creation of disconnected student-course completion records and preserves traceability from student profile through enrollment, course, batch, result, completion decision, and downstream certificate.

The module contributes the following business benefits:

- consistent pass/fail and completion evaluation across branches;
- explicit evidence-based completion instead of informal batch-end completion;
- reduced risk of certificate issuance for academically or financially ineligible learners;
- measurable approval turnaround and backlog visibility;
- complete traceability of result corrections and completion decisions;
- branch-level accountability with centralized policy control;
- separation of ownership between academic policy, evidence sources, completion decision, and certificate issuance;
- auditable exception handling without destructive data updates.

## 2. Detailed Functional Requirements

### FR-EXC-001 — Create Exam

**Description & Actors:** Authorized Academic Coordinator or Academic Administrator creates an exam for a valid course and batch.

**Preconditions:**

- User is authenticated.
- User has `exam.create`.
- User has mutation access to the batch branch.
- Course and batch exist, are active for academic operations, and the batch belongs to the selected course.
- Exam date is a valid date and can be associated with the target batch.

**Inputs:** courseId, batchId, examName, examDate, maxMarks, passMarks, initial status.

**Processing Steps:**

1. Resolve course and batch through authorized application boundaries/read contracts.
2. Verify batch.courseId equals courseId.
3. Resolve batch branch and enforce branch scope.
4. Validate `maxMarks > 0`.
5. Validate `passMarks >= 0` and `passMarks <= maxMarks`.
6. Validate exam date according to configured scheduling policy and batch date constraints.
7. Check for semantically duplicate exam identity in the same batch according to repository uniqueness policy.
8. Create `Exam` in a non-final operational state.
9. Write audit evidence for creation.

**Outputs & Postconditions:**

- Exam is persisted with course, batch, name, date, marks limits, and status.
- Exam appears in authorized branch-scoped queries.
- No result is created automatically.

**Priority:** Must.

---

### FR-EXC-002 — Manage Exam Lifecycle

**Description & Actors:** Authorized academic users update, reschedule, activate, cancel, or close an exam.

**Preconditions:**

- User has the specific permission for the requested action.
- User has branch mutation access.
- Exam exists and is not soft-deleted.
- Requested transition is valid for current exam status.

**Inputs:** examId, requested action, changed exam fields where applicable, version, reason for cancellation or sensitive reschedule when policy requires.

**Processing Steps:**

1. Load exam and current version.
2. Enforce branch scope through exam.batch.branch.
3. Check action-specific permission.
4. Validate state transition.
5. Prevent incompatible structural edits after finalized results exist unless an explicitly supported correction workflow is invoked.
6. Validate rescheduled date and mark thresholds.
7. Apply change atomically with optimistic concurrency check.
8. Audit old and new values and reason where applicable.

**Outputs & Postconditions:**

- Exam reflects the new valid state or schedule.
- Stale writes are rejected.
- Result and completion evidence is not silently invalidated.

**Priority:** Must.

---

### FR-EXC-003 — Search and View Exams

**Description & Actors:** Trainers, academic users, branch managers, and auditors with read permission search exams available within their scope.

**Preconditions:** authenticated user with `exam.read` and at least one accessible branch.

**Inputs:** branch filter, courseId, batchId, date range, status, search text, pagination, sort.

**Processing Steps:**

1. Derive allowed branch set from IAM context.
2. Intersect requested branch filter with allowed set.
3. Apply search filters and pagination.
4. Return only authorized rows and safe student-independent exam metadata.

**Outputs & Postconditions:** paginated exam list and detail view; no state mutation.

**Priority:** Must.

---

### FR-EXC-004 — Load Eligible Exam Roster

**Description & Actors:** Authorized result-entry user loads enrollment roster for the exam batch.

**Preconditions:** exam exists; user has `result.read` or `result.record`; user can access exam branch.

**Inputs:** examId, optional result-status filter, pagination/search.

**Processing Steps:**

1. Load exam and batch.
2. Enforce branch scope.
3. Query Enrollment-owned read contract for enrollments linked to the exam batch and course.
4. Exclude records not eligible for result entry under lifecycle policy, such as cancelled enrollment, while retaining existing historical results for read-only traceability.
5. Join or map existing Result records for the exam.
6. Return enrollmentNumber, student display identity, enrollment status, current result, and editability flags.

**Outputs & Postconditions:** authorized roster suitable for individual or bulk result entry.

**Priority:** Must.

---

### FR-EXC-005 — Record Individual Result

**Description & Actors:** Trainer or authorized academic user records marks for one enrollment in an exam.

**Preconditions:**

- User has `result.record`.
- Exam is open for result entry.
- Enrollment belongs to the exam course and batch.
- Enrollment is branch-authorized.
- No finalized immutable result exists unless correction flow is used.

**Inputs:** examId, enrollmentId, marksObtained, optional grade representation, optional result note if supported by repository conventions.

**Processing Steps:**

1. Validate exam and enrollment relationship.
2. Validate branch and actor eligibility.
3. Validate marks: `0 <= marksObtained <= exam.maxMarks`.
4. Derive resultStatus from marks and passMarks; user cannot contradict the derived status.
5. Store grade in `Result.grade` only according to approved grade-mapping policy; absence of a configured grade scale must not cause invention of a separate grade entity.
6. Store recordedBy and recordedAt.
7. Audit creation.

**Outputs & Postconditions:** one result exists for the exam/enrollment combination; pass/fail status is consistent with thresholds.

**Priority:** Must.

---

### FR-EXC-006 — Bulk Record Results

**Description & Actors:** Trainer or authorized academic user records marks for multiple eligible enrollments in one controlled operation.

**Preconditions:** `result.bulk-record`; exam open; user branch authorized; roster resolved from authoritative enrollment data.

**Inputs:** examId and a collection of enrollmentId + marksObtained (+ grade when policy permits).

**Processing Steps:**

1. Validate exam state and branch once.
2. Validate each enrollment belongs to exam course and batch.
3. Reject unauthorized or cross-branch IDs without leaking unrelated record details.
4. Validate marks per row.
5. Derive result status per row.
6. Detect duplicate enrollment rows.
7. Present row-level validation failures.
8. On confirmed valid submission, write according to the repository transaction policy; the preferred behavior is atomic submission for the confirmed set so users do not assume failed rows were saved.
9. Store actor and timestamp for each result.
10. Write summarized audit evidence plus per-entity audit records where required by audit conventions.

**Outputs & Postconditions:** valid confirmed results are persisted with clear success/failure outcome; no silent partial update.

**Priority:** Must.

---

### FR-EXC-007 — Finalize Results

**Description & Actors:** Authorized academic user finalizes an exam's result set or an individual result according to operational policy.

**Preconditions:** `result.finalize`; exam/result in finalizable state; branch access; required result data valid.

**Inputs:** examId and/or resultIds, version data, optional confirmation comment.

**Processing Steps:** validate completeness policy; revalidate marks; lock/finalize through supported status mechanism; audit action; make standard result-entry path read-only.

**Outputs & Postconditions:** finalized results cannot be silently edited; corrections require FR-EXC-008.

**Priority:** Must.

---

### FR-EXC-008 — Correct Finalized Result

**Description & Actors:** Restricted academic authority corrects a finalized result when legitimate evidence supports a change.

**Preconditions:** `result.correct`; branch access; finalized result exists; mandatory reason supplied; expected version supplied.

**Inputs:** resultId, corrected marks, grade if applicable, mandatory reason, version.

**Processing Steps:**

1. Load result and exam.
2. Enforce branch scope.
3. Validate separate correction permission.
4. Validate marks and derive resultStatus again.
5. Compare version and reject stale correction.
6. Persist corrected result without deleting historical audit evidence.
7. Create audit record with old value, new value, actor, timestamp, reason.
8. Identify impacted CourseCompletion and mark/schedule it for controlled re-evaluation through FR-EXC-015.

**Outputs & Postconditions:** corrected result is current; history remains reconstructable; affected completion is re-evaluated before downstream eligibility remains trusted.

**Priority:** Must.

---

### FR-EXC-009 — Monitor Missing Results

**Description & Actors:** Academic Coordinator and Academic Administrator identify exam-required enrollments with missing result evidence.

**Preconditions:** user has result/completion read permission and branch access.

**Inputs:** branch, course, batch, exam, status, date range.

**Processing Steps:** resolve active completion rule; identify courses where examRequired is true; compare eligible enrollments against required exam/result evidence; surface missing or non-final evidence without changing completion.

**Outputs & Postconditions:** branch-scoped missing-result queue and counts.

**Priority:** Must.

---

### FR-EXC-010 — Evaluate Completion Eligibility

**Description & Actors:** Academic Coordinator or Academic Administrator runs completion evaluation for an enrollment or a batch-scoped set.

**Preconditions:**

- `completion.evaluate`.
- Enrollment exists with courseId and batchId.
- Enrollment is in a lifecycle state eligible for completion evaluation.
- Active course completion rule can be resolved.
- User has branch access.

**Inputs:** enrollmentId or batch-scoped evaluation request.

**Processing Steps:**

1. Resolve Enrollment and verify course, batch, branch.
2. Resolve active `CourseCompletionRule` from Course Catalog.
3. Obtain attendance percentage from Attendance Management if minimum attendance or attendance evidence is applicable.
4. Obtain required exam result evidence from this context when `examRequired = true`.
5. Obtain payment-validation outcome from Finance when `paymentRequired = true` or Enrollment paymentValidationRequired indicates required validation consistent with domain policy.
6. Evaluate each required criterion independently.
7. Populate/update `CourseCompletion` fields: enrollmentId, completionStatus, attendancePercentage, examPassed, paymentCompleted, recommendation/approval fields as workflow advances, and remarks.
8. If manualApprovalRequired = false and all mandatory evidence passes, set the completion decision to the non-manual approved/complete state defined by implementation enum mapping.
9. If manualApprovalRequired = true, keep the record pending recommendation/approval until workflow stages complete.
10. If any required criterion fails or evidence is missing, do not mark completion approved.
11. Audit evaluation outcome and evidence status without copying ownership of source records.

**Outputs & Postconditions:** exactly one current `CourseCompletion` outcome exists per enrollment; unmet criteria are explicit; no certificate is issued.

**Priority:** Must.

---

### FR-EXC-011 — Maintain One Course Completion per Enrollment

**Description & Actors:** System invariant applied to all evaluation and approval commands.

**Preconditions:** valid enrollment.

**Inputs:** enrollmentId.

**Processing Steps:** query existing CourseCompletion; create only when absent; otherwise update/re-evaluate existing record with concurrency check; reject attempts to create duplicate active completion records.

**Outputs & Postconditions:** Enrollment 1 → 0..1 CourseCompletion invariant is preserved.

**Priority:** Must.

---

### FR-EXC-012 — Trainer Recommendation

**Description & Actors:** Assigned Trainer recommends a completion-ready enrollment for approval when manual approval is required.

**Preconditions:**

- `completion.recommend`.
- Trainer identity is linked to authenticated user/person according to IAM and Person/Party model.
- Trainer is assigned to the batch or otherwise explicitly authorized.
- Completion evaluation exists.
- Required evidence is passing or recommendation policy explicitly allows recommendation with visible exceptions.
- Current workflow stage permits recommendation.

**Inputs:** courseCompletionId, recommendation decision, remarks where required, version.

**Processing Steps:** validate actor assignment, branch, state, evidence, and version; store recommendedByTrainerId; create first-level approval evidence/state; audit action.

**Outputs & Postconditions:** completion advances to coordinator review when recommended; rejected/not-recommended outcome remains visible and traceable.

**Priority:** Must.

---

### FR-EXC-013 — Academic Coordinator Review

**Description & Actors:** Authorized Academic Coordinator reviews trainer recommendation and supporting evidence.

**Preconditions:** `completion.coordinator-review`; branch access; trainer recommendation completed; current stage is coordinator review.

**Inputs:** courseCompletionId, approve/reject action, remarks, version.

**Processing Steps:** load evidence summary; prevent self-bypass of missing prior stage; validate state/version; create/update `CompletionApproval` for coordinator level; require remarks on rejection; audit action; advance to branch manager only on approval.

**Outputs & Postconditions:** approved item enters final approval queue; rejected item stops workflow and retains reason/history.

**Priority:** Must.

---

### FR-EXC-014 — Branch Manager Final Approval

**Description & Actors:** Branch Manager or explicitly delegated permission holder makes final completion decision.

**Preconditions:** `completion.final-approve` for approval or `completion.reject` for rejection; branch access; coordinator stage approved; evidence still valid; current stage is final approval.

**Inputs:** courseCompletionId, approve/reject action, remarks, version.

**Processing Steps:** reload current completion and evidence status; enforce branch and stage; validate version; require rejection reason; record final `CompletionApproval`; on approval update CourseCompletion approvedBy/approvedAt/completionStatus; publish approved outcome to Enrollment boundary; evaluate certificate eligibility rule but do not issue certificate; audit decision.

**Outputs & Postconditions:** final approved or rejected completion outcome is persisted and traceable.

**Priority:** Must.

---

### FR-EXC-015 — Re-evaluate Completion After Evidence Change

**Description & Actors:** Authorized user or system workflow re-evaluates a completion when authoritative evidence changes, such as corrected result, approved attendance correction, or changed payment validation.

**Preconditions:** existing CourseCompletion; permitted trigger; source change is authoritative and auditable.

**Inputs:** enrollmentId, trigger type/reference, current version.

**Processing Steps:** reload active rule and current evidence from owners; recompute criteria; compare previous outcome; if an already approved completion becomes invalid, do not silently delete approval history; move through an explicitly controlled exception/review process supported by implementation status mapping and notify downstream Certificate context if eligibility changed; audit old/new outcome.

**Outputs & Postconditions:** completion truth reflects current authoritative evidence while preserving prior decision history.

**Priority:** Must.

---

### FR-EXC-016 — Expose Certificate Eligibility Outcome

**Description & Actors:** System exposes a certificate-ready outcome to Certificate Management after completion approval.

**Preconditions:** CourseCompletion approved; certificateAllowed true in CourseCompletionRule; required payment validation passed; Enrollment exists; no assumption of certificate issuance.

**Inputs:** enrollmentId, completion decision reference, eligibility status.

**Processing Steps:** verify final approval and rule; verify payment condition; produce idempotent eligibility contract/event or queryable application service; include enrollment reference only and necessary decision metadata; do not generate certificate number, QR code, or certificate file.

**Outputs & Postconditions:** Certificate Management can independently initiate issue workflow; Module 10 remains owner only of completion eligibility.

**Priority:** Must.

---

### FR-EXC-017 — Synchronize Completion Outcome with Enrollment Boundary

**Description & Actors:** System updates or publishes completion outcome to Admission & Enrollment through an explicit application boundary.

**Preconditions:** completion decision is valid and authorized.

**Inputs:** enrollmentId, completionStatus, completedAt when applicable, decision reference.

**Processing Steps:** call defined Enrollment application service or process a documented in-process domain event; enforce idempotency; avoid direct repository/table mutation across bounded-context package boundaries; record integration failure for operational recovery.

**Outputs & Postconditions:** Enrollment reflects the completion lifecycle outcome consistently without transferring ownership of CourseCompletion.

**Priority:** Must.

---

### FR-EXC-018 — Enforce Branch Isolation

**Description & Actors:** System enforces branch authorization on every module query and command.

**Preconditions:** authenticated user and IAM branch policy available.

**Inputs:** user context, requested resource identifiers, requested branch filter.

**Processing Steps:** derive allowed branch set; resolve resource branch from trusted relationships; intersect query scope; reject mutation outside permitted branch; apply child/consolidated semantics only as IAM allows; audit suspicious repeated denied attempts according to security policy.

**Outputs & Postconditions:** no unauthorized cross-branch data disclosure or mutation.

**Priority:** Must.

---

### FR-EXC-019 — Enforce Permission-Based Authorization

**Description & Actors:** System applies action permissions independent of role names.

**Preconditions:** authenticated user.

**Inputs:** required permission code, user grants, resource branch and domain eligibility.

**Processing Steps:** verify permission; verify branch; verify actor-specific eligibility; reject unauthorized request consistently; do not rely on UI control visibility.

**Outputs & Postconditions:** only explicitly authorized capabilities execute.

**Priority:** Must.

---

### FR-EXC-020 — Pending Work Queues

**Description & Actors:** Trainers, Academic Coordinators, Branch Managers, and Academic Administrators view actionable queues relevant to their permissions.

**Preconditions:** read permission and branch access.

**Inputs:** queue type, branch scope, date range, course, batch, assignee/stage, pagination.

**Processing Steps:** calculate branch-scoped queries for missing results, evaluations awaiting action, trainer recommendations pending, coordinator reviews pending, and final approvals pending; return counts and paginated records.

**Outputs & Postconditions:** operational backlog visibility; no transaction ownership transferred to Reporting context.

**Priority:** Should.

---

### FR-EXC-021 — Export Academic Outcome Data

**Description & Actors:** Authorized academic or audit user exports branch-scoped exam, result, or completion data.

**Preconditions:** `completion.export` or equivalent specific export permission; branch access.

**Inputs:** export type, filters, language, requested format supported by platform.

**Processing Steps:** reapply server-side filters and branch policy; select approved export columns; localize headers/status labels; generate export; audit sensitive export action where repository policy requires.

**Outputs & Postconditions:** downloadable branch-scoped export without unrelated PII.

**Priority:** Should.

---

### FR-EXC-022 — Audit Sensitive Actions

**Description & Actors:** System records audit evidence for sensitive academic actions.

**Preconditions:** sensitive command accepted for processing.

**Inputs:** entity type/id, action, old value, new value, actor, time, reason, request context.

**Processing Steps:** create audit event/record according to Audit & Compliance conventions; ensure the business transaction does not expose an unaudited alternate path; preserve approval history.

**Outputs & Postconditions:** sensitive change is reconstructable.

**Priority:** Must.

---

### FR-EXC-023 — Soft Delete and Concurrency Protection

**Description & Actors:** System applies repository-standard lifecycle controls to mutable operational records.

**Preconditions:** action supported by policy and user authorized.

**Inputs:** entity ID, version, action/reason.

**Processing Steps:** prohibit hard delete; use cancellation, archival, deactivation, or `deletedAt` convention as appropriate; reject stale version; audit lifecycle action.

**Outputs & Postconditions:** referential evidence remains intact and concurrent changes are protected.

**Priority:** Must.

---

### FR-EXC-024 — Bilingual Presentation

**Description & Actors:** Academic users view localized labels and outputs in English or Arabic where required.

**Preconditions:** language preference available.

**Inputs:** preferred language and localized source labels.

**Processing Steps:** render localized labels/status text; use authoritative localized course/student display sources rather than duplicating domain data; fall back according to platform localization rules.

**Outputs & Postconditions:** consistent bilingual UI/export presentation.

**Priority:** Should.

## 3. Comprehensive Business Rules

| Rule ID    | Business Rule                                                                                                                                                                                | Enforcement / Notes                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| BR-EXC-001 | Every Exam must reference one valid Course and one valid Batch.                                                                                                                              | Exam.courseId and Exam.batchId are mandatory domain references.      |
| BR-EXC-002 | The selected Batch must belong to the selected Course.                                                                                                                                       | Reject mismatched course/batch pair.                                 |
| BR-EXC-003 | Exam maximum marks must be greater than zero.                                                                                                                                                | `maxMarks > 0`.                                                      |
| BR-EXC-004 | Pass marks must be between zero and maximum marks inclusive.                                                                                                                                 | `0 <= passMarks <= maxMarks`.                                        |
| BR-EXC-005 | An enrollment result may be recorded only when the Enrollment belongs to the exam Course and Batch.                                                                                          | Prevent cross-course/cross-batch result attachment.                  |
| BR-EXC-006 | A marks value must be between zero and exam maximum marks inclusive.                                                                                                                         | Reject negative and over-maximum marks.                              |
| BR-EXC-007 | Result pass/fail must be derived consistently from marks and pass marks.                                                                                                                     | A user cannot manually store contradictory status.                   |
| BR-EXC-008 | One current Result is permitted per Exam and Enrollment combination unless the model is formally extended for attempts.                                                                      | Current ER has no attempt entity; multiple attempts are a model gap. |
| BR-EXC-009 | Result actor and timestamp must be preserved.                                                                                                                                                | Use `recordedBy`, `recordedAt`.                                      |
| BR-EXC-010 | Finalized results cannot be silently edited.                                                                                                                                                 | Use restricted correction workflow.                                  |
| BR-EXC-011 | Result correction requires separate permission and mandatory reason.                                                                                                                         | Audit old/new values.                                                |
| BR-EXC-012 | A result correction that affects completion evidence must trigger controlled completion re-evaluation.                                                                                       | Prevent stale eligibility.                                           |
| BR-EXC-013 | Course Catalog is the sole owner of CourseCompletionRule.                                                                                                                                    | Module 10 reads/evaluates; it does not configure rule ownership.     |
| BR-EXC-014 | Completion evaluation must use the applicable active CourseCompletionRule for the enrollment course.                                                                                         | Rule resolution is required before approval.                         |
| BR-EXC-015 | Minimum attendance must be evaluated against authoritative Attendance-owned evidence when configured.                                                                                        | Do not own AttendanceRecord.                                         |
| BR-EXC-016 | When `examRequired = true`, passing exam evidence is required for completion.                                                                                                                | Missing/failed required result blocks approval.                      |
| BR-EXC-017 | When `examRequired = false`, absence of an exam result must not by itself block completion.                                                                                                  | Other criteria still apply.                                          |
| BR-EXC-018 | When `paymentRequired = true`, authoritative payment validation must pass before completion/certificate eligibility as defined by domain policy.                                             | Finance owns payment truth.                                          |
| BR-EXC-019 | When `manualApprovalRequired = true`, Trainer Recommendation → Coordinator Review → Branch Manager Approval is mandatory.                                                                    | No stage skipping.                                                   |
| BR-EXC-020 | When `manualApprovalRequired = false`, the system may complete evaluation without the three-level approval workflow after all mandatory evidence passes.                                     | Exact enum mapping must follow implementation schema.                |
| BR-EXC-021 | One CourseCompletion record is allowed per Enrollment.                                                                                                                                       | ER cardinality 1 → 0..1.                                             |
| BR-EXC-022 | CourseCompletion must reference a valid Enrollment.                                                                                                                                          | Enrollment-centric invariant.                                        |
| BR-EXC-023 | Enrollment must already reference Course and Batch before completion evaluation.                                                                                                             | Required by central Enrollment invariant.                            |
| BR-EXC-024 | Trainer recommendation actor must be the assigned/authorized trainer for the batch unless explicit delegated permission policy exists.                                                       | Validate against Trainer/Batch assignment data.                      |
| BR-EXC-025 | Coordinator approval is valid only after trainer recommendation when manual approval applies.                                                                                                | Enforce stage ordering.                                              |
| BR-EXC-026 | Branch manager final approval is valid only after coordinator approval when manual approval applies.                                                                                         | Enforce stage ordering.                                              |
| BR-EXC-027 | Rejection at any approval stage requires remarks.                                                                                                                                            | Supports auditability and remediation.                               |
| BR-EXC-028 | Approval history must preserve approver, stage, status/action, remarks, and approval timestamp.                                                                                              | Map to CompletionApproval and audit conventions.                     |
| BR-EXC-029 | Completion approval must not issue a Certificate.                                                                                                                                            | Certificate context owns issuance.                                   |
| BR-EXC-030 | Certificate eligibility requires completion approval, certificateAllowed rule, and required payment validation.                                                                              | Module exposes eligibility only.                                     |
| BR-EXC-031 | Certificate context must not recompute completion rules.                                                                                                                                     | Consume approved eligibility.                                        |
| BR-EXC-032 | Completion changes must synchronize with Enrollment through a defined boundary, not direct cross-context repository mutation.                                                                | Modular monolith boundary protection.                                |
| BR-EXC-033 | All queries and commands must be server-side branch scoped.                                                                                                                                  | Derive branch from trusted resource relationship.                    |
| BR-EXC-034 | Parent/child and consolidated branch visibility follows IAM BranchAccess policy only.                                                                                                        | No local branch hierarchy invention.                                 |
| BR-EXC-035 | Permissions are capability based; role names are not authorization rules.                                                                                                                    | Dynamic RBAC.                                                        |
| BR-EXC-036 | Hard deletes are prohibited.                                                                                                                                                                 | Use soft-delete/deactivation/cancellation conventions.               |
| BR-EXC-037 | Sensitive result and completion mutations must be auditable.                                                                                                                                 | Who, what, when, old, new, reason where applicable.                  |
| BR-EXC-038 | Stale updates must be rejected where version-based optimistic locking applies.                                                                                                               | Protect concurrent exam/result/completion changes.                   |
| BR-EXC-039 | Bulk result entry must not leak existence of unauthorized enrollment IDs.                                                                                                                    | Return generic unauthorized/invalid row handling.                    |
| BR-EXC-040 | Bulk result processing must provide deterministic row-level validation feedback and must not silently partially save.                                                                        | Atomic confirmed set preferred.                                      |
| BR-EXC-041 | Result and completion records must use Person/Party-derived student/trainer references through owned profiles; no duplicate identity entity is created here.                                 | Avoid identity duplication.                                          |
| BR-EXC-042 | Reporting consumes Module 10 outcomes read-only and must not own or mutate completion transactions.                                                                                          | DDD ownership.                                                       |
| BR-EXC-043 | Communication may notify pending actions or decisions but does not own workflow state.                                                                                                       | Notification is downstream/supporting.                               |
| BR-EXC-044 | `Grade` remains the Result.grade field in the current ER model; a separate grade-scale entity must not be invented without model amendment.                                                  | DDD/ER gap control.                                                  |
| BR-EXC-045 | `Assessment` is conceptual in DDD but absent from ER; current persisted assessment behavior is limited to Exam unless model is amended.                                                      | Prevent unsupported schema invention.                                |
| BR-EXC-046 | `CompletionRuleEvaluation` is conceptual behavior in DDD; current ER persists final evaluation output in CourseCompletion.                                                                   | Do not invent table silently.                                        |
| BR-EXC-047 | Multiple exam attempts, weighted components, retakes, moderation, and grade-scale master data are not supported by the current ER model unless explicitly added through architecture change. | Known model limitation.                                              |
| BR-EXC-048 | Completion re-evaluation after evidence correction must preserve prior decision and approval history.                                                                                        | No destructive overwrite of history.                                 |
| BR-EXC-049 | An already issued certificate affected by later completion invalidation requires an explicit cross-context exception process; Module 10 must not directly revoke it.                         | Certificate owns revocation.                                         |
| BR-EXC-050 | User-facing bilingual labels should use localization sources and must not duplicate core English/Arabic person/course identities in this context.                                            | Presentation concern only.                                           |

## 4. Cross-Module Dependencies Mapping

| Dependency                   | Direction              | Data / Capability Used                                                    | Trigger / Timing                                 | Failure Handling Expectation                                                                      | Ownership Constraint                   |
| ---------------------------- | ---------------------- | ------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Identity & Access            | Inbound dependency     | User identity, permissions, branch access                                 | Every request                                    | Deny safely if authorization context unavailable                                                  | IAM owns access truth.                 |
| Organization                 | Inbound/read           | Branch identity/hierarchy references                                      | Query and command authorization                  | Fail closed for mutation; do not infer hierarchy                                                  | Organization owns branch structure.    |
| Course Catalog               | Inbound/read           | Course and CourseCompletionRule                                           | Exam setup and completion evaluation             | Evaluation remains pending/blocked if rule unavailable                                            | Course Catalog owns rule definition.   |
| Training Delivery            | Inbound/read           | Batch, course-batch relation, trainer assignments/sessions as applicable  | Exam setup, roster, trainer validation           | Reject invalid relation; surface operational dependency error                                     | Training Delivery owns Batch/Session.  |
| Admission & Enrollment       | Bidirectional boundary | Enrollment identity/course/batch/branch/status; completion outcome update | Result validation, evaluation, final completion  | Record recoverable integration failure; idempotent retry where event boundary is used             | Enrollment owns lifecycle aggregate.   |
| Attendance                   | Inbound/read           | Attendance percentage/evidence                                            | Completion evaluation and re-evaluation          | Keep completion not approved when required evidence unavailable                                   | Attendance owns records/corrections.   |
| Finance & Receivables        | Inbound/read           | Payment-validation outcome                                                | Completion/certificate eligibility when required | Do not infer payment state; block eligibility until authoritative status available                | Finance owns payment truth.            |
| Faculty / Trainer            | Inbound/read           | Trainer identity/profile status                                           | Recommendation and actor validation              | Reject recommendation if trainer not valid/authorized                                             | Trainer context owns profile.          |
| Certificate Management       | Outbound               | Completion approved / certificate eligibility                             | After final completion decision                  | Idempotent eligibility exposure; no certificate side effects here                                 | Certificate owns issue/revoke/reissue. |
| Audit & Compliance           | Outbound/supporting    | Audit action and approval evidence                                        | Sensitive mutations                              | No unaudited bypass; operational alert on audit failure according to platform policy              | Audit context owns audit records.      |
| Reporting & Dashboards       | Outbound/read-only     | Exam/result/completion metrics                                            | Read model refresh/query                         | Reporting delay must not block transaction path                                                   | Reporting does not own transactions.   |
| Communication & Notification | Outbound/optional      | Exam notice, pending result, approval task, decision notice               | After business state change                      | Notification failure must not roll back committed academic transaction unless explicitly required | Communication owns delivery history.   |

## 5. DDD and ER Model Alignment Comparison

### 5.1 Directly Aligned Requirements

| FRD Requirement Area       | DDD Alignment                                                                          | ER Alignment                                                                                                               | Conclusion                                                       |
| -------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Exam scheduling            | Exam & Completion context responsibility includes exam scheduling.                     | `Exam` has courseId, batchId, examName, examDate, maxMarks, passMarks, status.                                             | Aligned.                                                         |
| Result recording           | Context responsibility includes result recording and pass/fail tracking.               | `Result` links examId and enrollmentId and stores marksObtained, grade, resultStatus, recordedBy, recordedAt.              | Aligned.                                                         |
| Completion validation      | DDD states Completion context evaluates Course Catalog rules.                          | `CourseCompletion` stores attendancePercentage, examPassed, paymentCompleted, completionStatus.                            | Aligned.                                                         |
| Completion approval        | DDD defines trainer → coordinator → branch manager workflow.                           | `CompletionApproval` stores courseCompletionId, approvalLevel, approverUserId, status, remarks, approvedAt.                | Aligned.                                                         |
| Enrollment-centric linkage | DDD declares Enrollment central aggregate.                                             | Result links enrollmentId and CourseCompletion links enrollmentId; Enrollment has courseId/batchId.                        | Aligned.                                                         |
| Certificate boundary       | DDD says Certificate context issues after eligibility and must not compute completion. | Certificate has enrollment linkage; CourseCompletion contains approval evidence.                                           | Aligned, with integration contract needed.                       |
| Attendance dependency      | DDD says attendance contributes to completion.                                         | CourseCompletion has attendancePercentage; AttendanceRecord is owned separately.                                           | Aligned.                                                         |
| Payment dependency         | DDD requires payment validation where configured.                                      | CourseCompletion has paymentCompleted; CourseCompletionRule has paymentRequired; Enrollment has paymentValidationRequired. | Aligned, but authoritative validation contract must be designed. |

### 5.2 Partial Alignment and Gaps

| Topic                                           | DDD                                                                                   | ER Model                                                                                                  | FRD Treatment                                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Assessment                                      | DDD lists `Assessment` as a core entity.                                              | No Assessment entity.                                                                                     | Do not invent a table. Current scope uses Exam as persisted assessment mechanism. Flag model amendment for richer assessment types.    |
| Grade                                           | DDD lists `Grade` concept.                                                            | `grade` is a scalar field on Result.                                                                      | Treat grade as a result attribute until a grade-scale model is approved.                                                               |
| CompletionRuleEvaluation                        | DDD lists conceptual entity.                                                          | No concrete entity/table.                                                                                 | Implement evaluation behavior in domain/application services; persist final outcome in CourseCompletion.                               |
| Exam attempts / retakes                         | Not explicitly defined.                                                               | No attempt number or attempt entity.                                                                      | Excluded from current FRD; adding it requires model decision.                                                                          |
| Result uniqueness                               | Implied by business use but not explicitly shown as unique constraint in ER document. | Result has examId + enrollmentId but no documented unique key.                                            | FRD requires one current result per exam/enrollment; Prisma/database constraint must be validated before implementation.               |
| CourseCompletion uniqueness                     | DDD treats completion as enrollment outcome.                                          | Cardinality explicitly Enrollment 1 → 0..1 CourseCompletion.                                              | FRD enforces one record per enrollment.                                                                                                |
| Approval stage actor semantics                  | DDD gives named three-stage workflow.                                                 | CompletionApproval has generic approvalLevel.                                                             | FRD maps levels to trainer recommendation, coordinator review, branch manager approval.                                                |
| Evidence snapshots                              | DDD mentions CompletionRuleEvaluation.                                                | CourseCompletion stores summarized booleans/percentage but no rule version or evaluation snapshot fields. | FRD avoids inventing fields; implementation should flag traceability limitation if historical rule-version reconstruction is required. |
| Completion invalidation after certificate issue | DDD separates contexts but does not specify rollback process.                         | ER supports certificate status but no explicit cross-context invalidation relation.                       | FRD flags explicit exception flow requirement; Module 10 must not revoke certificate directly.                                         |

### 5.3 Rule-to-Model Traceability Notes

1. **Enrollment centrality:** BR-EXC-005, BR-EXC-021, BR-EXC-022, and BR-EXC-023 directly preserve the DDD rule that every learning lifecycle flows through Enrollment.
2. **Course Catalog ownership:** BR-EXC-013 and BR-EXC-014 preserve ownership of `CourseCompletionRule` and prevent Module 10 from becoming a second policy source.
3. **Evidence ownership:** BR-EXC-015 and BR-EXC-018 consume Attendance and Finance evidence without taking ownership of those transactions.
4. **Approval workflow:** BR-EXC-019, BR-EXC-024, BR-EXC-025, BR-EXC-026, BR-EXC-027, and BR-EXC-028 map the DDD workflow into enforceable state and actor rules using `CourseCompletion` and `CompletionApproval`.
5. **Certificate separation:** BR-EXC-029 through BR-EXC-031 preserve the DDD context boundary: completion determines eligibility; certificate context issues certificates.
6. **Branch isolation and RBAC:** BR-EXC-033 through BR-EXC-035 apply the generic IAM rules to every command/query in this bounded context.
7. **Audit and soft deletion:** BR-EXC-036 through BR-EXC-038 align with the ER common base fields and AuditLog expectations.
8. **Known DDD/ER mismatches:** BR-EXC-044 through BR-EXC-047 explicitly prevent the FRD from silently adding persistence models absent from the ER specification.

## 6. Implementation Readiness Notes for Subsequent FRD Parts

The following items must be resolved or validated in later design parts without changing the ownership decisions in this document:

- concrete enum values for `Exam.status`, `Result.resultStatus`, `CourseCompletion.completionStatus`, and `CompletionApproval.status` are not fully specified in the ER document;
- database uniqueness constraints for Result(examId, enrollmentId) and CourseCompletion(enrollmentId) must be verified in Prisma schema before implementation review;
- the exact application contract for Attendance percentage retrieval must be defined;
- the exact payment-validation contract from Finance must be defined;
- the exact in-process event/application service contract for updating Enrollment completion outcome must be defined;
- the certificate-eligibility contract must be idempotent and must not perform certificate issuance in this module;
- historical completion-rule version traceability is limited by the current ER model because CourseCompletion does not explicitly store rule version/reference;
- retake and multiple-attempt behavior is not defined and must remain out of scope unless DDD and ER are amended.
