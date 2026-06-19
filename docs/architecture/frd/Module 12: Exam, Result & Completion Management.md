# Functional Requirement Document (FRD)

## Module 12: Exam, Result & Completion Management

**Version:** 1.0
**Module Code:** CMP

**Dependencies:**

* Student Management
* Enrollment Management
* Attendance Management
* Course & Batch Management
* Fee & Finance Management

**Provides Data To:**

* Certificate Management
* Reporting
* Student Portal
* Corporate Reporting

---

# 1. Business Purpose

Exam, Result & Completion Management is responsible for evaluating student eligibility, recording assessments, publishing results, approving completion, and preparing students for certificate issuance.

The module shall support:

* Course Completion Tracking
* Completion Eligibility Evaluation
* Exam Management
* Assessment Results
* Completion Approval Workflow
* Corporate Completion Reporting
* Student Progress Tracking

---

# 2. Completion Architecture

```text id="v0p6km"
Course
    ↓
Enrollment
    ↓
Attendance
    ↓
Exam (Optional)
    ↓
Completion Evaluation
    ↓
Completion Approval
    ↓
Certificate Eligibility
```

---

# 3. Completion Models

The system shall support:

```text id="gzwcc6"
Completion Only
Attendance Based
Exam Based
Exam + Attendance
Manual Approval
Walk-In Completion
```

Configured at Course level.

---

# 4. Completion Lifecycle

```text id="5dbm8e"
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

```text id="mfjlwm"
Pending Approval
       ↓
Rejected
```

---

# 5. Exam Lifecycle

```text id="u6ybz8"
Draft
   ↓
Scheduled
   ↓
Conducted
   ↓
Results Published
```

Alternative:

```text id="q0of6x"
Scheduled
   ↓
Cancelled
```

---

# 6. Screens

## CMP-UI-001 Completion Dashboard

### Purpose

Provide completion overview.

### Widgets

```text id="4r7byv"
Pending Evaluations
Eligible Students
Pending Approvals
Completed Students
Rejected Students
```

### Filters

```text id="e8mg3w"
Branch
Course
Batch
Completion Status
Date Range
```

---

# 7. Completion Evaluation

## CMP-UI-002 Completion Evaluation Screen

### Purpose

Evaluate completion eligibility.

### Student Information

```text id="9fjlwm"
Student
Enrollment
Course
Batch
```

---

### Eligibility Criteria

Display:

```text id="mhvnqf"
Attendance %
Attendance Eligibility

Exam Score
Exam Eligibility

Fee Clearance

Completion Approval Required
```

---

### Evaluation Result

```text id="iy76sd"
Eligible
Not Eligible
```

---

### Actions

```text id="3v4z8r"
Evaluate
Approve Completion
Reject Completion
```

---

### Business Rules

Eligibility evaluation must use course configuration.

---

# 8. Completion Approval

## CMP-UI-003 Completion Approval Screen

### Fields

```text id="vlm8jw"
Completion Decision
Remarks
```

### Decisions

```text id="i5fprk"
Approve
Reject
```

---

### Business Rules

* Remarks mandatory when rejected.
* Approval must be audited.
* Completed status cannot be edited directly.

---

# 9. Exam Management

## CMP-UI-004 Exam List

### Columns

```text id="a4xw9t"
Exam Code
Exam Name
Course
Batch
Exam Date
Status
Actions
```

### Actions

```text id="7d3xtc"
Create Exam
Edit Exam
Schedule Exam
Cancel Exam
Publish Results
```

---

### Permissions

```text id="sykq1l"
EXAM_VIEW
EXAM_CREATE
EXAM_EDIT
EXAM_PUBLISH
```

---

# 10. Create Exam

## CMP-UI-005 Exam Screen

### Fields

```text id="x7jclm"
Exam Code
Exam Name
Course
Batch
Exam Date
Pass Mark
Maximum Mark
Status
```

---

### Examples

```text id="0q6rvk"
Pass Mark = 70

Maximum Mark = 100
```

---

### Business Rules

* Exam belongs to Course.
* Exam may belong to Batch.
* Course may have multiple exams.
* Pass Mark < Maximum Mark.

---

# 11. Result Entry

## CMP-UI-006 Result Entry Screen

### Columns

```text id="y6xwdr"
Student
Marks Obtained
Result
Remarks
```

---

### Result Calculation

```text id="pw8w68"
Marks >= Pass Mark
```

Result:

```text id="s30xkq"
Pass
```

Else:

```text id="xwptiu"
Fail
```

---

### Actions

```text id="yapxou"
Save Draft
Publish Results
```

---

### Business Rules

* Marks cannot exceed maximum marks.
* Published results become read-only.
* Changes require authorized override.

---

# 12. Result Publication

## CMP-UI-007 Publish Results

### Actions

```text id="n6hy5k"
Publish
Cancel
```

---

### Business Rules

After publication:

```text id="4j41k8"
Students may view results.
```

---

### Notifications

Generated automatically.

---

# 13. Walk-In Completion

## CMP-UI-008 Walk-In Completion Screen

### Fields

```text id="gtg7q9"
Student
Course
Trainer Approval
Remarks
```

---

### Business Rules

* Course must support Walk-In Completion.
* Trainer approval mandatory.
* Completion must be auditable.

---

# 14. Corporate Completion

## CMP-UI-009 Corporate Completion Dashboard

### Metrics

```text id="q2m0cg"
Participants
Completed
Pending
Failed
Rejected
```

---

### Filters

```text id="9zpw6g"
Customer
Contract
Program
Course
```

---

### Business Rules

* Completion statistics available to Corporate Reports.
* Completion grouped by:

  * Customer
  * Contract
  * Program

---

# 15. Completion Eligibility Engine

This is the most critical component.

---

## Attendance Rule

Example:

```text id="muvpsn"
Minimum Attendance = 80%
```

Student:

```text id="bl4jqn"
Attendance = 85%
```

Result:

```text id="9vjlwm"
Pass
```

---

## Exam Rule

Example:

```text id="yw89fk"
Pass Mark = 70
```

Student:

```text id="s6yt8g"
Score = 75
```

Result:

```text id="6xdtlo"
Pass
```

---

## Fee Clearance Rule

Example:

```text id="vmlgzn"
Outstanding = 0
```

Result:

```text id="x1d9wu"
Eligible
```

---

## Combined Rule

```text id="ygvow8"
Attendance Passed
AND
Exam Passed
AND
Fee Cleared
```

Result:

```text id="6ks1gh"
Completion Eligible
```

---

# 16. Student Progress View

## CMP-UI-010 Progress Dashboard

### Student View

Display:

```text id="mjvnmb"
Attendance %
Exam Score
Completion Status
Certificate Eligibility
```

Read-only.

---

# 17. Functional Requirements

## FR-CMP-001 Completion Evaluation

The system shall evaluate student completion eligibility.

---

## FR-CMP-002 Completion Approval

The system shall support completion approval workflow.

---

## FR-CMP-003 Completion Rejection

The system shall support completion rejection workflow.

---

## FR-CMP-004 Exam Creation

The system shall support exam creation.

---

## FR-CMP-005 Exam Scheduling

The system shall support exam scheduling.

---

## FR-CMP-006 Result Entry

The system shall support result entry.

---

## FR-CMP-007 Result Publication

The system shall support result publication.

---

## FR-CMP-008 Walk-In Completion

The system shall support walk-in completion processing.

---

## FR-CMP-009 Corporate Completion

The system shall support corporate completion tracking.

---

## FR-CMP-010 Eligibility Evaluation

The system shall support configurable eligibility rules.

---

## FR-CMP-011 Student Progress Tracking

The system shall support progress tracking.

---

## FR-CMP-012 Completion Audit Trail

The system shall maintain complete completion history.

---

# 18. Notifications

### Completion Approved

Notify:

```text id="vcw3sb"
Student
Counselor
Branch Manager
```

---

### Completion Rejected

Notify:

```text id="vl8wz7"
Student
Counselor
```

---

### Exam Scheduled

Notify:

```text id="e6ukru"
Trainer
Students
Coordinator
```

---

### Results Published

Notify:

```text id="2ng6hv"
Students
Trainer
Coordinator
```

---

# 19. Reports

## Completion Reports

```text id="t2vjlwm"
Completion Report
Pending Completion Report
Rejected Completion Report
```

---

## Exam Reports

```text id="64e9pw"
Exam Results Report
Pass Percentage Report
Fail Percentage Report
```

---

## Student Reports

```text id="2v3opm"
Student Progress Report
Completion Eligibility Report
```

---

## Corporate Reports

```text id="42cm4l"
Corporate Completion Report
Corporate Result Report
```

---

# 20. Audit Requirements

Audit:

```text id="dxxzsk"
Completion Evaluated
Completion Approved
Completion Rejected
Exam Created
Exam Updated
Result Entered
Results Published
```

Capture:

```text id="7nqjlwm"
User
Action
Timestamp
Old Value
New Value
Reason
```

---

# 21. Critical Design Decisions

### Completion First Architecture

Recommended:

```text id="3oz3ks"
Completion
      ↓
Certificate
```

Not:

```text id="i0s7xj"
Exam
      ↓
Certificate
```

Reason:

Many courses have no exams.

---

### Immutable Published Results

Published results should be:

```text id="9x1jtl"
Read Only
```

Any changes require:

```text id="jlyi2d"
Authorized Override
```

with audit.

---

### Eligibility Engine

Implement as:

```text id="pwjlwm"
Rule Evaluation Service
```

so future AI recommendations can use the same rules.

---

# 22. Integration Points

### Consumes

```text id="8lqf5n"
Attendance
Finance
Enrollment
Course Rules
```

### Provides Data To

```text id="7um4pc"
Certificate Management
Reporting
Student Portal
Corporate Reporting
```
