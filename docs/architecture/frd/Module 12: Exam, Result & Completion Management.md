# Functional Requirement Document

## Module 12: Exam, Result & Completion Management

**Version:** 1.1
**Module Code:** CMP
**Phase:** Phase 1
**Owned Bounded Context:** Exam, Result & Completion Management

**Dependencies:**

* Admission & Enrollment Management
* Attendance Management
* Course & Batch Management
* Fee & Finance Management
* Faculty / Trainer Management

**Provides Data To:**

* Certificate Management
* Student Management
* Corporate Training Management
* Reporting & Dashboards
* Audit & Compliance

---

# 1. Business Purpose

Exam, Result & Completion Management evaluates learner completion eligibility, manages exam definition and result publication, and controls completion approval and rejection workflows.

The context owns completion evaluation, exam setup, result recording, and completion approvals.

Completion status is the gate that feeds certificate eligibility and downstream reporting.

---

# 2. Scope

## 2.1 In Scope

* Completion eligibility evaluation
* Completion approval workflow
* Completion rejection workflow
* Exam creation
* Exam scheduling
* Result entry
* Result publication
* Student progress view
* Walk-in completion processing
* Corporate completion tracking

## 2.2 Out of Scope for Phase 1

* Certificate issuance
* Attendance marking
* Fee collection
* Payment capture

---

# 3. Business Principles

* Completion eligibility is rule-driven and consumes attendance, exam, and fee clearance data.
* Completion approval is an auditable decision and cannot be bypassed where required by course policy.
* Exam results become read-only after publication unless authorized override exists.
* Walk-in completion is a specialized completion orchestration path.
* Corporate completion reporting is derived from the same completion model.
* Completed status cannot be edited directly.
* Rejected completion must retain a reason.

---

# 4. Owned Concepts

The Completion context owns:

* CourseExam
* ExamResult
* CompletionEvaluation
* CourseCompletion
* CompletionApproval
* CompletionApprovalLog
* ResultPublicationBatch

Notes:

* Enrollment, Student, Course, Batch, and Attendance are referenced from other contexts.
* Completion is the final academic decision before certificate eligibility.
* Exams are configured against course and optional batch scope.

---

# 5. Business Model

## 5.1 Completion Models

The system shall support:

```text
Completion Only
Attendance Based
Exam Based
Exam + Attendance
Manual Approval
Walk-In Completion
```

Rules:

* Completion model is configured at course level.
* Completion requirements are inherited by batches.
* Walk-in completion must be explicitly allowed by course configuration.

## 5.2 Completion Lifecycle

```text
Not Started
  ↓
In Progress
  ↓
Eligible
  ↓
Pending Approval
  ↓
Completed
```

Alternative:

```text
Pending Approval
  ↓
Rejected
```

Rules:

* Eligibility must be evaluated before approval.
* Completed completions are historical records.
* Rejected completions must preserve the reason.

## 5.3 Exam Lifecycle

```text
Draft
  ↓
Scheduled
  ↓
Conducted
  ↓
Results Published
```

Alternative:

```text
Scheduled
  ↓
Cancelled
```

Rules:

* Exam belongs to a course.
* Exam may optionally belong to a batch.
* Published results are read-only.

## 5.4 Result Lifecycle

```text
Draft
  ↓
Published
```

Rules:

* Result entries may be saved as draft before publication.
* Published results require authorized override for changes.
* Result publication generates notifications.

---

# 6. Screens

## CMP-UI-001 Completion Dashboard

### Purpose

Provide completion overview.

### Widgets

```text
Pending Evaluations
Eligible Learners
Pending Approvals
Completed Learners
Rejected Learners
```

### Filters

```text
Branch
Course
Batch
Completion Status
Date Range
Search
```

---

## CMP-UI-002 Completion Evaluation Screen

### Purpose

Evaluate completion eligibility.

### Student Information

```text
Student
Enrollment
Course
Batch
```

### Eligibility Criteria

```text
Attendance %
Attendance Eligibility
Exam Score
Exam Eligibility
Fee Clearance
Completion Approval Required
```

### Evaluation Result

```text
Eligible
Not Eligible
```

### Actions

```text
Evaluate
Approve Completion
Reject Completion
```

### Business Rules

* Eligibility evaluation must use configured course rules.
* Fee clearance must be consumed from Finance.
* Attendance eligibility must be consumed from Attendance.
* Exam eligibility must be consumed from exam results.

---

## CMP-UI-003 Completion Approval Screen

### Fields

```text
Completion Decision
Remarks
```

### Decisions

```text
Approve
Reject
```

### Business Rules

* Remarks are mandatory when rejected.
* Approval must be audited.
* Completed status cannot be edited directly.

---

## CMP-UI-004 Exam List

### Columns

```text
Exam Code
Exam Name
Course
Batch
Exam Date
Status
Actions
```

### Actions

```text
Create Exam
Edit Exam
Schedule Exam
Cancel Exam
Publish Results
```

### Permissions

```text
EXAM_VIEW
EXAM_CREATE
EXAM_EDIT
EXAM_PUBLISH
```

---

## CMP-UI-005 Exam Screen

### Fields

```text
Exam Code
Exam Name
Course
Batch
Exam Date
Pass Mark
Maximum Mark
Status
```

### Business Rules

* Exam belongs to a course.
* Exam may belong to a batch.
* Course may have multiple exams.
* Pass Mark must be less than Maximum Mark.

---

## CMP-UI-006 Result Entry Screen

### Columns

```text
Student
Marks Obtained
Result
Remarks
```

### Result Calculation

```text
Marks >= Pass Mark
```

Result:

```text
Pass
```

Else:

```text
Fail
```

### Actions

```text
Save Draft
Publish Results
```

### Business Rules

* Marks cannot exceed maximum marks.
* Published results become read-only.
* Changes require authorized override.

---

## CMP-UI-007 Publish Results

### Actions

```text
Publish
Cancel
```

### Business Rules

* Students may view results after publication.
* Result publication generates notifications.

---

## CMP-UI-008 Walk-In Completion Screen

### Fields

```text
Student
Course
Trainer Approval
Remarks
```

### Business Rules

* Course must support walk-in completion.
* Trainer approval is mandatory.
* Completion must be auditable.

---

## CMP-UI-009 Corporate Completion Dashboard

### Metrics

```text
Participants
Completed
Pending
Failed
Rejected
```

### Filters

```text
Customer
Contract
Program
Course
Search
```

### Business Rules

* Completion statistics must be available to corporate reports.
* Completion must be grouped by customer, contract, and program.

---

## CMP-UI-010 Progress Dashboard

### Student View

```text
Attendance %
Exam Score
Completion Status
Certificate Eligibility
```

### Business Rules

* Read-only access.
* Visible only for the relevant learner.

---

# 7. Functional Requirements

## FR-CMP-001 Evaluate Completion Eligibility

The system shall evaluate learner completion eligibility.

## FR-CMP-002 Approve Completion

The system shall support completion approval workflow.

## FR-CMP-003 Reject Completion

The system shall support completion rejection workflow.

## FR-CMP-004 Create Exam

The system shall support exam creation.

## FR-CMP-005 Schedule Exam

The system shall support exam scheduling.

## FR-CMP-006 Enter Results

The system shall support result entry.

## FR-CMP-007 Publish Results

The system shall support result publication.

## FR-CMP-008 Support Walk-In Completion

The system shall support walk-in completion processing.

## FR-CMP-009 Track Corporate Completion

The system shall support corporate completion tracking.

## FR-CMP-010 View Student Progress

The system shall support read-only student progress views.

## FR-CMP-011 Audit Completion Decisions

The system shall audit completion evaluation, approval, and rejection.

---

# 8. Audit Events

The following audit events shall be supported:

```text
CompletionEvaluated
CompletionApproved
CompletionRejected
CompletionApprovalLogged
ExamCreated
ExamScheduled
ExamCancelled
ResultDraftSaved
ResultPublished
ResultPublicationRevised
WalkInCompletionApproved
CorporateCompletionEvaluated
StudentProgressViewed
```

Rules:

* Completion decisions must be auditable.
* Rejection must store the reason.
* Published results must remain historically visible.

---

# 9. Domain Errors

The module shall distinguish between validation and business-rule errors such as:

```text
CompletionNotEligible
CompletionAlreadyApproved
CompletionAlreadyRejected
CompletionAlreadyCompleted
CompletionDecisionRequired
RejectedReasonRequired
ExamAlreadyPublished
ExamCancelled
ResultAlreadyPublished
MarksExceedMaximum
PassMarkInvalid
WalkInCompletionNotAllowed
FeeClearanceNotMet
AttendanceNotMet
ExamNotPassed
ApprovalRequired
CorporateCompletionContextInvalid
InvalidCompletionStateTransition
```

---

# 10. Reporting and Operational Views

The Completion context shall support the following read views:

```text
Completion Dashboard
Exam List
Result List
Student Progress View
Corporate Completion Dashboard
Completion Eligibility Report
Exam Report
Result Publication Report
Walk-In Completion Summary
```

These are read models and operational views, not separate owned entities.

---

# 11. FRD Improvement Notes

This module should remain the single source of truth for:

* exam definition
* result entry and publication
* completion eligibility
* completion approval and rejection
* walk-in completion approval

It should not own attendance marking or certificate issuance.
