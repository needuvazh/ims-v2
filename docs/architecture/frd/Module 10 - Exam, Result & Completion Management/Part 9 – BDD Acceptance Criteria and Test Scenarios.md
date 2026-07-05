# Part 9 – BDD Acceptance Criteria and Test Scenarios

## Module 10 – Exam, Result & Completion Management

## 1. Purpose

This document defines comprehensive BDD acceptance criteria and test scenarios for Module 10 – Exam, Result & Completion Management.

The scenarios cover:

```text
Positive paths
Negative paths
Field validation
Cross-field validation
Boundary values
State transitions
Authorization guards
Branch data isolation
Own-assignment scope
Consolidated read-only scope
Optimistic concurrency
Cross-context dependency failures
Notification triggering
Audit behavior
Read-model consistency
DDD ownership boundaries
```

The module owns:

```text
Exam
Result
CourseCompletion
CompletionApproval
```

The module references but does not own:

```text
Course
CourseCompletionRule
Batch
Enrollment
Attendance evidence
Payment validation
TrainerProfile
User
UserBranchAccess
Certificate
AuditLog
CommunicationTemplate
NotificationRequest
```

The key architectural acceptance principle is:

```text
Module 10 may evaluate and persist academic outcomes
for its own aggregates,
but it must not mutate another bounded context's aggregate
or duplicate another context's source of truth.
```

---

# 2. BDD Test Conventions

## 2.1 Common Actors

```text
Academic Administrator
Academic Coordinator
Trainer
Branch Manager
Auditor
Read-Only Academic User
Executive Viewer
System Workflow
Unauthorized User
```

## 2.2 Common Branches

```text
BR-MCT    Muscat
BR-SHR    Sohar
BR-SLL    Salalah
```

## 2.3 Common Courses and Batches

```text
CRS-HSE-101
BAT-HSE-MCT-001
BAT-HSE-SHR-001
```

## 2.4 Common Enrollment References

```text
ENR-MCT-001
ENR-MCT-002
ENR-SHR-001
```

## 2.5 Error Assertion Pattern

Unless a scenario explicitly states otherwise, a rejected mutation must satisfy:

```text
Then the response status shall match the documented contract
And the response shall include a stable error code
And no partial domain mutation shall be committed
And no unauthorized data shall be disclosed
```

## 2.6 Audit Assertion Pattern

For sensitive successful actions:

```text
Then an audit event shall contain actor, entity, action, timestamp
And old/new values where applicable
And business reason where required
```

---

# 3. Feature: Create Exam

```gherkin
Feature: Create Exam

  Background:
    Given an authenticated Academic Coordinator exists
    And the user has permission "exam.create"
    And the user has mutation access to branch "BR-MCT"
    And course "CRS-HSE-101" exists
    And batch "BAT-HSE-MCT-001" exists
    And batch "BAT-HSE-MCT-001" belongs to course "CRS-HSE-101"
    And batch "BAT-HSE-MCT-001" belongs to branch "BR-MCT"

  Scenario: Create a valid Exam
    When the user creates an Exam with:
      | examName  | Final Assessment |
      | examDate  | 2026-08-20       |
      | maxMarks  | 100.00           |
      | passMarks | 50.00            |
    Then the Exam shall be created
    And the Exam shall reference course "CRS-HSE-101"
    And the Exam shall reference batch "BAT-HSE-MCT-001"
    And the initial Exam state shall be mapped to the implementation's non-final initial state
    And the Exam version shall be 1
    And creation audit evidence shall exist

  Scenario: Reject Exam creation without permission
    Given the user does not have permission "exam.create"
    When the user submits a valid Exam creation request
    Then the request shall be rejected with 403
    And the error code shall be "FORBIDDEN"
    And no Exam shall be created

  Scenario: Reject Exam creation outside branch mutation scope
    Given the user can read branch "BR-SHR"
    But the user cannot mutate branch "BR-SHR"
    And batch "BAT-HSE-SHR-001" belongs to branch "BR-SHR"
    When the user attempts to create an Exam for batch "BAT-HSE-SHR-001"
    Then the request shall be rejected
    And no Exam shall be created
    And consolidated or read-only access shall not be treated as mutation authority

  Scenario Outline: Reject invalid marks configuration
    When the user creates an Exam with maxMarks "<maxMarks>" and passMarks "<passMarks>"
    Then the request shall be rejected with validation error "<errorCode>"

    Examples:
      | maxMarks | passMarks | errorCode                 |
      | 0        | 0         | MAX_MARKS_INVALID         |
      | -1       | 0         | MAX_MARKS_INVALID         |
      | 100      | -1        | PASS_MARKS_INVALID        |
      | 100      | 101       | PASS_MARKS_EXCEED_MAX     |
      | 0.00     | 1.00      | MAX_MARKS_INVALID         |

  Scenario: Accept pass marks equal to maximum marks
    When the user creates an Exam with maxMarks "100.00" and passMarks "100.00"
    Then the Exam shall be created successfully

  Scenario: Accept zero pass marks when policy allows
    When the user creates an Exam with maxMarks "100.00" and passMarks "0.00"
    Then the Exam shall be created successfully

  Scenario: Reject blank Exam name after trimming
    When the user submits examName "   "
    Then the request shall be rejected
    And the error code shall be "EXAM_NAME_REQUIRED"

  Scenario: Reject mismatched Course and Batch
    Given batch "BAT-HSE-MCT-001" belongs to course "CRS-HSE-101"
    And course "CRS-OTHER-001" exists
    When the user creates an Exam for course "CRS-OTHER-001" and batch "BAT-HSE-MCT-001"
    Then the request shall be rejected
    And the error code shall be "COURSE_BATCH_MISMATCH"
    And no Exam shall be created

  Scenario: Reject duplicate semantic Exam
    Given an active Exam already exists for:
      | batchId  | BAT-HSE-MCT-001 |
      | examName | Final Assessment |
      | examDate | 2026-08-20 |
    When the user submits the same semantic Exam
    Then the request shall be rejected with 409
    And the error code shall be "DUPLICATE_EXAM"

  Scenario: Reject invalid date format
    When the user submits examDate "20-08-2026"
    Then the request shall be rejected with 400
    And the error code shall be "VALIDATION_ERROR"
```

---

# 4. Feature: Manage Exam Lifecycle

```gherkin
Feature: Manage Exam Lifecycle

  Background:
    Given an Exam exists in branch "BR-MCT"
    And the user has mutation access to branch "BR-MCT"

  Scenario: Schedule a Draft Exam
    Given the Exam is in "Draft"
    And the user has permission "exam.schedule"
    When the user schedules the Exam for "2026-08-20"
    Then the Exam shall enter "Scheduled"
    And the version shall increment by 1

  Scenario: Activate a Scheduled Exam
    Given the Exam is in "Scheduled"
    And the user has permission "exam.activate"
    When the user activates the Exam
    Then the Exam shall enter "OpenForResultEntry"

  Scenario: Close an open Exam
    Given the Exam is in "OpenForResultEntry"
    And the server-side close policy is satisfied
    And the user has permission "exam.close"
    When the user closes the Exam
    Then the Exam shall enter "Closed"

  Scenario: Reject invalid state transition
    Given the Exam is in "Draft"
    And the user has permission "exam.close"
    When the user attempts to close the Exam
    Then the request shall be rejected with 409
    And the error code shall be "EXAM_INVALID_STATE_TRANSITION"

  Scenario: Reject stale version update
    Given the Exam version is 5
    When the user submits expectedVersion 4
    Then the request shall be rejected with 409
    And the error code shall be "CONCURRENCY_CONFLICT"
    And the Exam shall remain unchanged

  Scenario: Cancel a Scheduled Exam with reason
    Given the Exam is in "Scheduled"
    And the user has permission "exam.cancel"
    When the user cancels with reason "Batch delivery postponed"
    Then the Exam shall enter "Cancelled"
    And cancellation audit evidence shall include the reason

  Scenario: Reject cancellation without reason
    Given the Exam is in "Scheduled"
    And the user has permission "exam.cancel"
    When the user submits an empty cancellation reason
    Then the request shall be rejected
    And the error code shall be "CANCELLATION_REASON_REQUIRED"

  Scenario: Prevent standard structural edit after finalized Results exist
    Given the Exam has finalized Results
    And the user has permission "exam.update"
    When the user attempts to change maxMarks from 100 to 80
    Then the request shall be rejected
    And the error code shall be "RESULT_EVIDENCE_WOULD_BE_INVALIDATED"
```

---

# 5. Feature: Record Individual Result

```gherkin
Feature: Record Individual Result

  Background:
    Given Exam "EX-MCT-001" belongs to course "CRS-HSE-101"
    And Exam "EX-MCT-001" belongs to batch "BAT-HSE-MCT-001"
    And the Exam is open for Result entry
    And the user has permission "result.record"
    And the user has mutation access to branch "BR-MCT"

  Scenario: Record passing Result
    Given enrollment "ENR-MCT-001" belongs to course "CRS-HSE-101"
    And enrollment "ENR-MCT-001" belongs to batch "BAT-HSE-MCT-001"
    And Exam maxMarks is 100
    And Exam passMarks is 50
    When the user records marks "78.00"
    Then one Result shall exist for Exam "EX-MCT-001" and Enrollment "ENR-MCT-001"
    And resultStatus shall be "PASSED"
    And recordedBy shall equal the authenticated user
    And recordedAt shall be populated

  Scenario: Record failing Result
    Given Exam passMarks is 50
    When the user records marks "49.99"
    Then resultStatus shall be "FAILED"

  Scenario: Passing boundary equals pass mark
    Given Exam passMarks is 50
    When the user records marks "50.00"
    Then resultStatus shall be "PASSED"

  Scenario: Reject marks above maximum
    Given Exam maxMarks is 100
    When the user records marks "100.01"
    Then the request shall be rejected
    And the error code shall be "MARKS_EXCEED_MAXIMUM"

  Scenario: Reject negative marks
    When the user records marks "-0.01"
    Then the request shall be rejected
    And the error code shall be "MARKS_NEGATIVE"

  Scenario: Reject Enrollment from another Batch
    Given enrollment "ENR-SHR-001" belongs to batch "BAT-HSE-SHR-001"
    When the user records Result for enrollment "ENR-SHR-001"
    Then the request shall be rejected
    And the error code shall be "ENROLLMENT_NOT_ELIGIBLE_FOR_EXAM"

  Scenario: Reject Enrollment from another Course
    Given enrollment "ENR-MCT-002" belongs to another Course
    When the user records Result for enrollment "ENR-MCT-002"
    Then the request shall be rejected
    And no Result shall be created

  Scenario: Derive Result status on server
    Given Exam passMarks is 50
    When the client submits marks "70.00"
    And the client also attempts to submit resultStatus "FAILED"
    Then the server shall ignore or reject client-supplied Result status
    And the persisted resultStatus shall be "PASSED"

  Scenario: Enforce one active Result per Exam and Enrollment
    Given an active Result already exists for Exam "EX-MCT-001" and Enrollment "ENR-MCT-001"
    When the user attempts to create a second active Result for the same pair
    Then the request shall be rejected with 409
    And the error code shall be "RESULT_DUPLICATE"
```

---

# 6. Feature: Bulk Result Entry

```gherkin
Feature: Bulk Result Entry

  Background:
    Given the user has permission "result.bulk-record"
    And the Exam is open for Result entry
    And the Exam belongs to branch "BR-MCT"
    And the user has mutation access to branch "BR-MCT"

  Scenario: Validate fully valid bulk payload
    When the user validates:
      | row | enrollmentId | marks |
      | 1   | ENR-MCT-001 | 80.00 |
      | 2   | ENR-MCT-002 | 65.00 |
    Then validation shall succeed
    And both rows shall be marked "VALID"

  Scenario: Detect duplicate Enrollment rows
    When the user validates:
      | row | enrollmentId | marks |
      | 1   | ENR-MCT-001 | 80.00 |
      | 2   | ENR-MCT-001 | 70.00 |
    Then validation shall fail
    And the duplicate row shall be identified
    And the error code shall be "BULK_RESULT_DUPLICATE_ENROLLMENT"

  Scenario: Return row-level validation errors
    When the user validates:
      | row | enrollmentId | marks  |
      | 1   | ENR-MCT-001 | 80.00  |
      | 2   | ENR-MCT-002 | 110.00 |
    Then row 1 shall be "VALID"
    And row 2 shall be "INVALID"
    And row 2 error code shall be "MARKS_EXCEED_MAXIMUM"

  Scenario: Reject payload larger than configured maximum
    Given the maximum bulk size is 1000 rows
    When the user submits 1001 rows
    Then the request shall be rejected with validation error

  Scenario: Prevent silent partial save
    Given one row becomes stale after validation
    When the user submits the confirmed bulk payload
    Then the transaction shall follow the documented atomic or deterministic chunk policy
    And the API shall not return generic full success while silently omitting failed rows

  Scenario: Reject cross-branch row without disclosing student details
    Given the bulk payload includes Enrollment "ENR-SHR-001"
    And the user lacks mutation access to "BR-SHR"
    When the payload is validated
    Then the row shall be rejected as unauthorized or invalid
    And the response shall not expose the other branch student's personal details
```

---

# 7. Feature: Result Finalization

```gherkin
Feature: Result Finalization

  Background:
    Given a Result exists in branch "BR-MCT"
    And the user has permission "result.finalize"
    And the user has mutation access to branch "BR-MCT"

  Scenario: Finalize a valid Result
    Given the Result is in "Recorded"
    And the Result version is 3
    When the user finalizes with expectedVersion 3
    Then the Result shall become finalized according to persistence mapping
    And standard Result edit shall become unavailable
    And finalization audit evidence shall exist

  Scenario: Reject finalization of invalid Result state
    Given the Result is already finalized
    When the user attempts finalization again
    Then the request shall be rejected with 409
    And the error code shall be "RESULT_INVALID_STATE_TRANSITION"

  Scenario: Reject finalization without permission
    Given the user lacks permission "result.finalize"
    When the user submits the finalization command
    Then the request shall be rejected with 403

  Scenario: Reject finalization outside branch scope
    Given the Result belongs to branch "BR-SHR"
    And the user can only mutate "BR-MCT"
    When the user attempts finalization
    Then the request shall be rejected
    And the Result shall remain unchanged
```

---

# 8. Feature: Correct Finalized Result

```gherkin
Feature: Correct Finalized Result

  Background:
    Given Result "RES-001" is finalized
    And Result "RES-001" belongs to branch "BR-MCT"
    And the user has permission "result.correct"
    And the user has mutation access to branch "BR-MCT"

  Scenario: Correct finalized Result successfully
    Given the current marks are "45.00"
    And the current status is "FAILED"
    And Exam passMarks is "50.00"
    When the user corrects marks to "65.00"
    And provides reason "Verified transcription error"
    Then marksObtained shall become "65.00"
    And resultStatus shall become "PASSED"
    And old and new values shall be auditable
    And completion reevaluation shall be marked or triggered if impacted

  Scenario: Reject correction without reason
    When the user submits corrected marks "65.00" without reason
    Then the request shall be rejected
    And the error code shall be "CORRECTION_REASON_REQUIRED"

  Scenario: Reject unchanged corrected marks
    Given current marks are "65.00"
    When the user submits corrected marks "65.00"
    Then the request shall be rejected
    And the error code shall be "CORRECTED_MARKS_UNCHANGED"

  Scenario: Reject correction above maximum marks
    Given Exam maxMarks is "100.00"
    When the user submits corrected marks "101.00"
    Then the request shall be rejected
    And the error code shall be "MARKS_EXCEED_MAXIMUM"

  Scenario: Reject correction without restricted permission
    Given the user has "result.record"
    But the user does not have "result.correct"
    When the user attempts to correct the finalized Result
    Then the request shall be rejected with 403

  Scenario: Preserve Result correction audit atomically
    When the correction succeeds
    Then the Result update and required audit evidence shall both be committed consistently
    And the system shall not expose a state where the Result changed without audit evidence
```

---

# 9. Feature: Completion Evaluation

```gherkin
Feature: Completion Evaluation

  Background:
    Given enrollment "ENR-MCT-001" exists
    And it belongs to course "CRS-HSE-101"
    And it belongs to batch "BAT-HSE-MCT-001"
    And it belongs to branch "BR-MCT"
    And the user has permission "completion.evaluate"
    And the user has mutation access to branch "BR-MCT"

  Scenario: Evaluate completion when all mandatory evidence passes
    Given the active CourseCompletionRule requires:
      | minAttendancePercentage | 75.00 |
      | examRequired            | true  |
      | paymentRequired         | true  |
      | manualApprovalRequired  | true  |
      | certificateAllowed      | true  |
    And Attendance reports "90.00"
    And Module 10 Result evidence reports Exam passed
    And Finance reports payment validation passed
    When completion is evaluated
    Then one CourseCompletion shall exist for the Enrollment
    And attendancePercentage shall be "90.00"
    And examPassed shall be true
    And paymentCompleted shall be true
    And the functional state shall become "AwaitingTrainerRecommendation"

  Scenario: Approve automatically when manual approval is not required
    Given all mandatory evidence passes
    And manualApprovalRequired is false
    When completion is evaluated
    Then CourseCompletion shall move to the implementation-mapped approved/completed outcome
    And no manual approval stage shall be created unnecessarily

  Scenario: Block completion when required Attendance fails
    Given minimum attendance is "75.00"
    And Attendance reports "70.00"
    When completion is evaluated
    Then completion shall not be approved
    And the attendance criterion outcome shall be failed

  Scenario: Block completion when required Exam evidence is missing
    Given examRequired is true
    And no valid Result evidence exists
    When completion is evaluated
    Then completion shall not be approved
    And the error or functional outcome shall indicate missing Exam evidence

  Scenario: Allow no Exam evidence when Exam is not required
    Given examRequired is false
    And all other mandatory criteria pass
    When completion is evaluated
    Then missing Result evidence alone shall not block completion

  Scenario: Block completion when required payment validation fails
    Given paymentRequired is true
    And Finance reports payment validation failed
    When completion is evaluated
    Then completion shall not be approved

  Scenario: Fail safe when Attendance dependency is unavailable
    Given Attendance evidence is required
    And Attendance dependency is unavailable
    When completion is evaluated
    Then completion shall not be approved
    And the response shall indicate "ATTENDANCE_DEPENDENCY_UNAVAILABLE"

  Scenario: Fail safe when Finance dependency is unavailable
    Given payment validation is required
    And Finance dependency is unavailable
    When completion is evaluated
    Then completion shall not be approved
    And the response shall indicate "FINANCE_DEPENDENCY_UNAVAILABLE"

  Scenario: Enforce one CourseCompletion per Enrollment
    Given a CourseCompletion already exists for "ENR-MCT-001"
    When completion is evaluated again
    Then the existing CourseCompletion shall be updated or reevaluated
    And no duplicate active CourseCompletion shall be created

  Scenario: Reject stale completion version
    Given CourseCompletion version is 5
    When the user submits expectedVersion 4
    Then the request shall be rejected with "CONCURRENCY_CONFLICT"
```

---

# 10. Feature: Trainer Recommendation

```gherkin
Feature: Trainer Recommendation

  Background:
    Given CourseCompletion "CC-001" is in "AwaitingTrainerRecommendation"
    And it belongs to branch "BR-MCT"
    And the authenticated user maps to TrainerProfile "TR-001"
    And the user has permission "completion.recommend"

  Scenario: Assigned Trainer recommends completion
    Given Trainer "TR-001" is assigned to the Enrollment Batch
    And evidence is current
    When the Trainer recommends completion
    Then the Trainer Recommendation stage shall be approved
    And CourseCompletion shall move to "AwaitingCoordinatorReview"

  Scenario: Trainer rejects recommendation with reason
    Given Trainer "TR-001" is assigned to the Batch
    When the Trainer rejects with reason "Practical competency incomplete"
    Then the Trainer Recommendation stage shall be rejected
    And CourseCompletion shall enter the configured rejected outcome
    And the reason shall be auditable

  Scenario: Reject Trainer recommendation from unassigned Trainer
    Given Trainer "TR-001" is not assigned or authorized for the Batch
    When the Trainer attempts to recommend completion
    Then the request shall be rejected with 403
    And the error code shall be "TRAINER_NOT_AUTHORIZED_FOR_BATCH"

  Scenario: Reject recommendation from invalid workflow stage
    Given CourseCompletion is in "AwaitingFinalApproval"
    When the Trainer attempts to recommend
    Then the request shall be rejected with 409
    And the error code shall be "INVALID_APPROVAL_STAGE"

  Scenario: Reject recommendation when evidence is stale
    Given completion evidence changed after the last evaluation
    When the Trainer attempts to recommend
    Then the request shall be rejected
    And the error code shall be "COMPLETION_EVIDENCE_STALE"
```

---

# 11. Feature: Coordinator Review

```gherkin
Feature: Coordinator Review

  Background:
    Given CourseCompletion "CC-001" belongs to branch "BR-MCT"
    And the user has permission "completion.coordinator-review"
    And the user has mutation access to branch "BR-MCT"

  Scenario: Approve after Trainer Recommendation
    Given Trainer Recommendation is approved
    And CourseCompletion is in "AwaitingCoordinatorReview"
    When the Coordinator approves
    Then Coordinator Review shall be approved
    And CourseCompletion shall move to "AwaitingFinalApproval"

  Scenario: Reject Coordinator Review with reason
    Given CourseCompletion is in "AwaitingCoordinatorReview"
    When the Coordinator rejects with reason "Attendance correction requires verification"
    Then Coordinator Review shall be rejected
    And the rejection reason shall be stored and auditable

  Scenario: Reject approval before Trainer Recommendation
    Given Trainer Recommendation is not approved
    When the Coordinator attempts to approve
    Then the request shall be rejected
    And the error code shall be "TRAINER_RECOMMENDATION_REQUIRED"

  Scenario: Reject Coordinator action outside branch scope
    Given CourseCompletion belongs to branch "BR-SHR"
    And the Coordinator only has mutation access to "BR-MCT"
    When the Coordinator attempts approval
    Then the request shall be rejected
```

---

# 12. Feature: Final Completion Approval

```gherkin
Feature: Final Completion Approval

  Background:
    Given CourseCompletion "CC-001" belongs to branch "BR-MCT"
    And the user has permission "completion.final-approve"
    And the user has mutation access to branch "BR-MCT"

  Scenario: Final approve valid completion
    Given Trainer Recommendation is approved
    And Coordinator Review is approved
    And CourseCompletion is in "AwaitingFinalApproval"
    And completion evidence is current
    When the user approves
    Then CourseCompletion shall become "Approved"
    And approvedBy shall equal the current user
    And approvedAt shall be populated
    And final CompletionApproval shall be approved
    And Enrollment completion outcome shall be synchronized through the defined application boundary

  Scenario: Reject final approval before Coordinator approval
    Given Coordinator Review is not approved
    When the user attempts final approval
    Then the request shall be rejected
    And the error code shall be "COORDINATOR_APPROVAL_REQUIRED"

  Scenario: Reject final approval with stale evidence
    Given CourseCompletion is awaiting final approval
    And Attendance evidence changed after evaluation
    When the user attempts final approval
    Then the request shall be rejected
    And the error code shall be "COMPLETION_EVIDENCE_STALE"

  Scenario: Final reject with reason
    Given CourseCompletion is in "AwaitingFinalApproval"
    When the user rejects with reason "Required evidence remains incomplete"
    Then the final approval stage shall be rejected
    And CourseCompletion shall become "Rejected"
    And no certificate-eligible outcome shall be emitted

  Scenario: Reject final rejection without reason
    When the user submits final rejection without remarks
    Then the request shall be rejected
    And the error code shall be "REJECTION_REASON_REQUIRED"
```

---

# 13. Feature: Completion Reevaluation

```gherkin
Feature: Completion Reevaluation

  Background:
    Given CourseCompletion "CC-001" exists
    And the user has permission "completion.reevaluate"
    And the user has mutation access to its branch

  Scenario: Reevaluate after Result correction
    Given triggerType is "RESULT_CORRECTED"
    And triggerReference is "RES-001"
    And the corrected Result is authoritative
    When reevaluation runs
    Then the active CourseCompletionRule shall be reloaded
    And current Attendance evidence shall be reloaded when required
    And current Result evidence shall be reloaded
    And current Finance validation shall be reloaded when required
    And CourseCompletion shall be recomputed from current authoritative evidence

  Scenario: Reject untraceable Result correction trigger
    Given triggerType is "RESULT_CORRECTED"
    And triggerReference is missing
    When reevaluation is requested
    Then the request shall be rejected
    And the error code shall be "INVALID_REEVALUATION_TRIGGER"

  Scenario: Preserve prior approval history
    Given CourseCompletion was previously approved
    And reevaluation changes the outcome
    When reevaluation completes
    Then previous CompletionApproval records shall remain preserved
    And prior audit history shall remain preserved

  Scenario: Enter exception path when approved outcome becomes invalid
    Given CourseCompletion was approved
    And current authoritative evidence now fails a mandatory criterion
    When reevaluation runs
    Then CourseCompletion shall enter a controlled exception or re-review state
    And prior approval history shall not be deleted
```

---

# 14. Feature: Authorization Guards

```gherkin
Feature: Authorization Guards

  Scenario Outline: Reject action without required permission
    Given an authenticated user lacks permission "<permission>"
    When the user invokes action "<action>"
    Then the request shall be rejected with 403
    And the error code shall be "FORBIDDEN"

    Examples:
      | action                     | permission                     |
      | Create Exam                | exam.create                    |
      | Update Exam                | exam.update                    |
      | Record Result              | result.record                  |
      | Bulk Record Result         | result.bulk-record             |
      | Finalize Result            | result.finalize                |
      | Correct Result             | result.correct                 |
      | Evaluate Completion        | completion.evaluate            |
      | Reevaluate Completion      | completion.reevaluate          |
      | Trainer Recommend          | completion.recommend           |
      | Coordinator Approve        | completion.coordinator-review  |
      | Final Approve              | completion.final-approve       |
      | Export Completion Report   | completion.export              |

  Scenario: Menu permission alone does not authorize mutation
    Given the user has "menu.exam-completion.exams"
    But the user does not have "exam.create"
    When the user invokes the Create Exam API directly
    Then the request shall be rejected with 403

  Scenario: Report permission does not authorize transactional update
    Given the user has "report.result-register.read"
    But the user lacks "result.correct"
    When the user attempts Result correction
    Then the request shall be rejected with 403

  Scenario: IAM administrator has no implicit academic access
    Given the user can manage IAM roles and permissions
    But the user does not have "exam.read"
    When the user requests Exam data
    Then the request shall be rejected
```

---

# 15. Feature: Branch Data Isolation

```gherkin
Feature: Branch Data Isolation

  Background:
    Given user "USR-MCT" is assigned to branch "BR-MCT"
    And user "USR-MCT" is not assigned mutation access to branch "BR-SHR"

  Scenario: Exam list excludes unauthorized branch data
    Given Exams exist in "BR-MCT" and "BR-SHR"
    When "USR-MCT" searches Exams
    Then only Exams from authorized read scope shall be returned

  Scenario: Direct Result lookup does not leak unauthorized branch data
    Given Result "RES-SHR-001" belongs to "BR-SHR"
    When "USR-MCT" requests "RES-SHR-001"
    Then the response shall be 404 or 403 according to platform policy
    And the response shall not reveal student identity or Result values

  Scenario: Cross-branch completion approval is denied
    Given CourseCompletion "CC-SHR-001" belongs to "BR-SHR"
    When "USR-MCT" attempts final approval
    Then the request shall be rejected
    And no CompletionApproval shall be created or updated

  Scenario: Consolidated read does not grant mutation
    Given the user can view consolidated data across "BR-MCT" and "BR-SHR"
    But the user may mutate only "BR-MCT"
    When the user views the Final Approval queue
    Then items from both permitted read branches may be visible
    But mutation actions for "BR-SHR" shall be absent or disabled in UI
    And direct API mutation for "BR-SHR" shall still be rejected

  Scenario: Result branch consistency is enforced
    Given Exam "EX-MCT-001" belongs to "BR-MCT"
    And Enrollment "ENR-SHR-001" belongs to "BR-SHR"
    When a Result is submitted linking them
    Then the request shall be rejected
    And no cross-branch Result shall be created
```

---

# 16. Feature: Own-Assignment Scope

```gherkin
Feature: Trainer Own-Assignment Scope

  Scenario: Trainer sees own Result tasks
    Given Trainer "TR-001" is assigned to Batch "BAT-HSE-MCT-001"
    And the Trainer has "result.record"
    When the Trainer opens Result tasks
    Then only assigned or explicitly authorized Exam tasks shall be returned

  Scenario: Trainer cannot record Result for unassigned Batch
    Given Trainer "TR-001" is not assigned to "BAT-HSE-SHR-001"
    When the Trainer attempts to record a Result for that Batch
    Then the request shall be rejected

  Scenario: Trainer sees own recommendation queue only
    Given recommendations exist for multiple Trainers
    When Trainer "TR-001" opens Trainer Recommendation queue
    Then only recommendations matching assignment/authorization scope shall be returned
```

---

# 17. Feature: DDD Ownership Boundary

```gherkin
Feature: DDD Ownership Boundary

  Scenario: Completion evaluation reads authoritative evidence but mutates only Module 10-owned aggregate
    Given Course Catalog owns CourseCompletionRule
    And Attendance Management owns Attendance evidence
    And Finance owns payment validation
    And Admission & Enrollment owns Enrollment
    And Module 10 owns CourseCompletion
    When Module 10 evaluates completion for an Enrollment
    Then Module 10 shall read the active CourseCompletionRule through the approved boundary
    And Module 10 shall read Attendance evidence through the Attendance boundary
    And Module 10 shall read payment validation through the Finance boundary
    And Module 10 shall read Enrollment context through the Enrollment boundary
    And Module 10 may create or update CourseCompletion
    But Module 10 shall not update CourseCompletionRule
    And Module 10 shall not update AttendanceRecord
    And Module 10 shall not update Payment or Invoice
    And Module 10 shall not update Enrollment through direct repository mutation

  Scenario: Final approval does not create Certificate
    Given CourseCompletion is approved
    And certificateAllowed is true
    And payment validation passed
    When final completion approval succeeds
    Then Module 10 may emit or expose certificate eligibility
    But no Certificate record shall be created by Module 10
    And Certificate creation remains the responsibility of Certificate Management

  Scenario: Result recording does not create parallel Enrollment or Student entity
    Given a valid Enrollment already exists
    When a Result is recorded
    Then Module 10 shall reference the existing Enrollment
    And shall not create a duplicate student-course relationship
    And shall not create a parallel StudentProfile
```

---

# 18. Feature: Notification Events

```gherkin
Feature: Notification Events

  Scenario: Exam scheduling emits notification event
    Given an Exam moves from Draft to Scheduled
    When the transaction commits
    Then domain event "ExamScheduled" shall be emitted
    And Communication Management may create NotificationRequests from the event
    And Module 10 shall not persist NotificationLog as its own entity

  Scenario: Result correction emits sensitive change notification event
    Given a finalized Result is corrected successfully
    When the transaction commits
    Then event "ResultCorrected" shall contain:
      | resultId |
      | examId |
      | enrollmentId |
      | previousMarks |
      | correctedMarks |
      | previousResultStatus |
      | currentResultStatus |
      | reason |
      | actorUserId |

  Scenario: Certificate eligibility does not send issuance confirmation
    Given Module 10 emits "CertificateEligible"
    When Communication processing occurs
    Then no "certificate issued" notification shall be sent from that event
    And only Certificate Management's issued event may trigger issue confirmation
```

---

# 19. Feature: Reporting and Read Model Safety

```gherkin
Feature: Reporting Read Model Safety

  Scenario: Dashboard reads projection only
    Given a read model contains Exam progress counts
    When the dashboard loads
    Then the dashboard may read the projection
    But no transactional state shall be updated

  Scenario: Command reloads authoritative state
    Given a read model says CourseCompletion is awaiting final approval
    But authoritative transactional state changed afterward
    When a final approval command is submitted
    Then the command shall validate current authoritative CourseCompletion state
    And shall not trust the stale read model

  Scenario: Read model mismatch does not override source of truth
    Given a reporting view differs from the transactional Result
    When reconciliation detects the mismatch
    Then the transactional Result shall remain authoritative
    And the read model shall be repaired or rebuilt
```

---

# 20. Feature: Audit Behavior

```gherkin
Feature: Audit Behavior

  Scenario: Result correction captures full audit evidence
    Given Result marks change from 45 to 65
    When correction succeeds
    Then audit history shall contain:
      | actor |
      | action |
      | performedAt |
      | old marks |
      | new marks |
      | old result status |
      | new result status |
      | reason |

  Scenario: Completion rejection captures reason
    When a Coordinator rejects completion
    Then rejection reason shall be recorded
    And audit history shall preserve actor and timestamp

  Scenario: Approval history cannot be deleted through normal operation
    Given CompletionApproval history exists
    When reevaluation restarts workflow
    Then prior approval records shall remain preserved
```

---

# 21. Feature: Search and Export Authorization

```gherkin
Feature: Search and Export Authorization

  Scenario: Search returns only authorized branch data
    Given the user can read only "BR-MCT"
    When the user searches academic outcomes
    Then only "BR-MCT" records shall be returned

  Scenario: Export branch filter only narrows access
    Given the user can export "BR-MCT" only
    When the user submits export filters containing "BR-MCT" and "BR-SHR"
    Then "BR-SHR" shall not expand the user's scope
    And the request shall be denied or narrowed according to platform policy

  Scenario: Export rejects unsupported column
    When the user requests column "passportNumber"
    And that column is not in the report allowlist
    Then the request shall be rejected
    And the error code shall be "UNSUPPORTED_EXPORT_COLUMN"

  Scenario: Arabic export uses localized headers
    Given the user requests language "ar"
    When the export is generated
    Then supported headers shall be rendered in Arabic
    And underlying domain codes shall remain unchanged
```

---

# 22. Feature: API Validation Boundaries

```gherkin
Feature: API Validation Boundaries

  Scenario: Client cannot force completion status
    When the client submits completionStatus "APPROVED" in evaluation request
    Then the server shall ignore or reject unsupported field
    And authoritative completion evaluation shall determine outcome

  Scenario: Client cannot force payment validation
    When the client submits paymentCompleted true
    Then the server shall not trust the value
    And Finance-owned validation shall be used

  Scenario: Client cannot force Attendance pass
    When the client submits attendancePassed true
    Then the server shall not trust the value
    And Attendance-owned evidence shall be used

  Scenario: Client cannot force branch authorization
    Given the user cannot mutate "BR-SHR"
    When the request body contains branchId "BR-SHR"
    Then the server shall still derive entity branch authoritatively
    And mutation shall be denied
```

---

# 23. Scenario Outline: Result Marks Boundary Conditions

```gherkin
Feature: Result Marks Boundary Conditions

  Scenario Outline: Validate marks against Exam thresholds
    Given Exam maxMarks is 100
    And Exam passMarks is 50
    When marksObtained is "<marks>"
    Then the outcome shall be "<outcome>"

    Examples:
      | marks  | outcome                         |
      | -0.01  | REJECT_MARKS_NEGATIVE           |
      | 0.00   | FAILED                          |
      | 49.99  | FAILED                          |
      | 50.00  | PASSED                          |
      | 99.99  | PASSED                          |
      | 100.00 | PASSED                          |
      | 100.01 | REJECT_MARKS_EXCEED_MAXIMUM     |
```

---

# 24. Scenario Outline: Completion Evidence Matrix

```gherkin
Feature: Completion Evidence Matrix

  Scenario Outline: Evaluate mandatory evidence combinations
    Given attendance requirement outcome is "<attendance>"
    And exam requirement outcome is "<exam>"
    And payment requirement outcome is "<payment>"
    And manual approval is "<manualApproval>"
    When completion is evaluated
    Then functional outcome shall be "<outcome>"

    Examples:
      | attendance | exam         | payment      | manualApproval | outcome                         |
      | PASSED     | PASSED       | PASSED       | true           | AWAITING_TRAINER_RECOMMENDATION |
      | PASSED     | PASSED       | PASSED       | false          | APPROVED_OR_COMPLETED           |
      | FAILED     | PASSED       | PASSED       | true           | NOT_ELIGIBLE                    |
      | PASSED     | FAILED       | PASSED       | true           | NOT_ELIGIBLE                    |
      | PASSED     | PASSED       | FAILED       | true           | NOT_ELIGIBLE                    |
      | MISSING    | PASSED       | PASSED       | true           | EVIDENCE_INCOMPLETE             |
      | PASSED     | MISSING      | PASSED       | true           | EVIDENCE_INCOMPLETE             |
      | PASSED     | PASSED       | UNAVAILABLE  | true           | PENDING_OR_ERROR                |
```

---

# 25. Scenario Outline: Approval Stage Guards

```gherkin
Feature: Approval Stage Guards

  Scenario Outline: Enforce approval order
    Given CourseCompletion is in "<currentState>"
    When actor attempts "<action>"
    Then result shall be "<result>"

    Examples:
      | currentState                    | action               | result                         |
      | AwaitingTrainerRecommendation   | TrainerRecommend     | ALLOW                          |
      | AwaitingTrainerRecommendation   | CoordinatorApprove   | REJECT_INVALID_APPROVAL_STAGE  |
      | AwaitingCoordinatorReview       | CoordinatorApprove   | ALLOW                          |
      | AwaitingCoordinatorReview       | FinalApprove         | REJECT_COORDINATOR_REQUIRED    |
      | AwaitingFinalApproval           | FinalApprove         | ALLOW                          |
      | Approved                        | FinalApprove         | REJECT_ALREADY_APPROVED        |
```

---

# 26. Test Cases for Branch Isolation

## TC-BR-EXC-001 — Exam Search Isolation

**Precondition**

```text
User scope: BR-MCT
Data exists: BR-MCT and BR-SHR
```

**Action**

```text
GET Exam search
```

**Expected**

```text
Only BR-MCT Exam rows returned
No BR-SHR count leakage
No BR-SHR pagination influence if platform count policy avoids leakage
```

## TC-BR-EXC-002 — Direct Result Lookup Isolation

Expected:

```text
Unauthorized branch Result returns 404/403
No Student name
No marks
No Exam details
```

## TC-BR-EXC-003 — Completion Mutation Isolation

Expected:

```text
Cross-branch final approval denied
No CourseCompletion update
No CompletionApproval insert/update
No notification event emitted
```

## TC-BR-EXC-004 — Consolidated Read-Only Scope

Expected:

```text
Cross-branch rows visible where consolidated read allows
Mutation denied outside mutation branch set
```

## TC-BR-EXC-005 — Trainer Assignment + Branch Intersection

Expected:

```text
Trainer assignment alone is insufficient
Branch scope and assignment must both pass
```

---

# 27. Test Cases for Authorization Guards

## TC-AUTH-EXC-001 — No Session

Expected:

```text
401 UNAUTHENTICATED
```

## TC-AUTH-EXC-002 — Missing Menu Permission but Direct Action Permission Present

Expected:

```text
Action API may succeed if action permission and scope are valid
Menu visibility does not determine API authorization
```

## TC-AUTH-EXC-003 — Menu Permission Without Action Permission

Expected:

```text
API mutation denied
```

## TC-AUTH-EXC-004 — Report Permission Without Transaction Permission

Expected:

```text
Report succeeds
Mutation denied
```

## TC-AUTH-EXC-005 — Global Viewer Without Mutation Capability

Expected:

```text
Global/consolidated reads allowed
Mutations denied
```

---

# 28. Test Cases for Concurrency

## TC-CONC-EXC-001 — Exam Update Conflict

```text
Version loaded: 4
Current version: 5
Expected: 409 CONCURRENCY_CONFLICT
```

## TC-CONC-EXC-002 — Result Correction Conflict

```text
Correction based on stale version
Expected:
no overwrite
no duplicate audit event
409 CONCURRENCY_CONFLICT
```

## TC-CONC-EXC-003 — Approval Conflict

```text
Two approvers submit same stage action concurrently
Expected:
one succeeds
one receives conflict or already-recorded error
single final state transition
```

## TC-CONC-EXC-004 — Reevaluation Conflict

```text
Evidence trigger and manual reevaluation race
Expected:
version guard prevents lost update
history preserved
```

---

# 29. Test Cases for Dependency Failures

## TC-DEP-EXC-001 — Course Rule Missing

Expected:

```text
No false approval
COURSE_COMPLETION_RULE_NOT_CONFIGURED
```

## TC-DEP-EXC-002 — Attendance Unavailable

Expected:

```text
No false approval
ATTENDANCE_DEPENDENCY_UNAVAILABLE
```

## TC-DEP-EXC-003 — Finance Unavailable

Expected:

```text
No false approval
FINANCE_DEPENDENCY_UNAVAILABLE
```

## TC-DEP-EXC-004 — Trainer Assignment Reader Unavailable

Expected:

```text
Recommendation action blocked safely
No implicit Trainer authorization
```

---

# 30. Test Cases for Soft Delete and Archival

## TC-DEL-EXC-001 — Exam with Results

Expected:

```text
No hard delete
Archive/cancel behavior only
Results preserved
```

## TC-DEL-EXC-002 — CourseCompletion with Approval History

Expected:

```text
No cascade delete
CompletionApproval history preserved
```

## TC-DEL-EXC-003 — User Deactivation

Expected:

```text
Historical actor references remain resolvable or safely displayable
Academic evidence not deleted
```

---

# 31. Test Cases for Notification Deduplication

## TC-NOTIF-EXC-001 — Duplicate Domain Event Delivery

Given:

```text
same eventId
same template
same recipient
same channel
```

Expected:

```text
one NotificationRequest
no duplicate outbound message
```

## TC-NOTIF-EXC-002 — Result Finalization Student Publication Disabled

Expected:

```text
No Student notification
Internal notification may still occur
```

## TC-NOTIF-EXC-003 — Certificate Eligible But Not Issued

Expected:

```text
No issuance notification
Internal eligibility handoff only
```

---

# 32. Test Cases for Read Models

## TC-RM-EXC-001 — Projection Rebuild

Expected:

```text
Read model can be deleted/rebuilt
Transactional tables unchanged
```

## TC-RM-EXC-002 — Stale Approval Queue Projection

Expected:

```text
Command handler reloads authoritative CourseCompletion
Stale projection cannot force invalid approval
```

## TC-RM-EXC-003 — KPI Snapshot Difference

Expected:

```text
Snapshot remains historical/derived
Current transaction truth remains authoritative
```

---

# 33. Traceability Matrix

| Requirement Area | Scenario Coverage |
|---|---|
| Exam Creation | Sections 3, 23 |
| Exam Lifecycle | Section 4 |
| Result Entry | Sections 5, 6, 23 |
| Result Finalization | Section 7 |
| Result Correction | Section 8 |
| Completion Evaluation | Sections 9, 24 |
| Trainer Recommendation | Section 10 |
| Coordinator Review | Section 11 |
| Final Approval | Sections 12, 25 |
| Reevaluation | Section 13 |
| Authorization | Sections 14, 27 |
| Branch Isolation | Sections 15, 26 |
| Own Assignment | Section 16 |
| DDD Ownership | Section 17 |
| Notifications | Section 18 |
| Reporting Safety | Section 19 |
| Audit | Section 20 |
| Search/Export | Section 21 |
| API Trust Boundary | Section 22 |
| Concurrency | Section 28 |
| Dependency Failure | Section 29 |
| Soft Delete | Section 30 |
| Notification Deduplication | Section 31 |
| Read Models | Section 32 |

---

# 34. Minimum Test Execution Categories

Each release must include:

```text
Unit Tests
- marks validation
- result status derivation
- exam state transitions
- completion decision logic
- approval stage transitions
- reevaluation trigger validation

Integration Tests
- Course-Batch validation
- Enrollment matching
- branch authorization
- Attendance evidence integration
- Finance validation integration
- Trainer assignment integration
- audit write behavior

API Tests
- request validation
- permission guards
- error envelopes
- version conflicts
- pagination and filtering
- export allowlists

End-to-End Tests
- Exam creation to Result finalization
- Completion evaluation to final approval
- Result correction to reevaluation
- branch isolation
- Trainer own-assignment flow

Security Tests
- IDOR
- cross-branch lookup
- forged branchId
- forged resultStatus
- forged completionStatus
- permission escalation
```

---

# 35. Exit Criteria for Part 9

Module 10 behavior is acceptance-ready when:

1. all core positive flows pass;
2. invalid marks boundaries are enforced;
3. Exam and Completion state transitions are enforced;
4. Result finalization blocks ordinary edit;
5. correction requires restricted permission and reason;
6. completion evaluation uses authoritative external evidence;
7. dependency failure never causes false approval;
8. approval stages cannot be skipped;
9. branch isolation is proven by list, lookup, and mutation tests;
10. Trainer own-assignment scope is enforced;
11. consolidated reporting access does not grant mutation;
12. DDD ownership tests prove Module 10 mutates only its owned aggregate state;
13. certificate issuance remains outside Module 10;
14. read models are proven non-authoritative and read-only;
15. concurrency conflicts prevent lost updates;
16. sensitive actions produce audit evidence;
17. notification events are deduplicated and do not cross ownership boundaries.
