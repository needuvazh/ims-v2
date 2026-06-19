# Functional Requirement Document

## Module 4: Admission & Enrollment Management

**Version:** 1.1
**Module Code:** ADM
**Phase:** Phase 1
**Owned Bounded Context:** Admission & Enrollment Management

**Dependencies:**

* Identity & Access Management
* Organization Management
* Lead & Inquiry Management
* Course & Batch Management
* Fee & Finance Management

**Provides Data To:**

* Student Management
* Scheduling & Timetable Management
* Attendance Management
* Exam, Result & Completion Management
* Certificate Management
* Reporting & Dashboards
* Audit & Compliance

---

# 1. Business Purpose

Admission & Enrollment Management controls the transition from inquiry or direct registration into a confirmed student enrollment.

This context owns the pre-enrollment approval record, the enrollment lifecycle, and the handoff into downstream operational modules.

Enrollment is the central lifecycle object for learning delivery, finance linkage, attendance readiness, completion readiness, and certificate eligibility.

---

# 2. Scope

## 2.1 In Scope

* Admission creation
* Admission approval
* Admission rejection
* Admission cancellation
* Direct admission
* Student registration
* Enrollment creation
* Enrollment confirmation
* Enrollment activation
* Enrollment update before activation
* Enrollment drop and cancellation
* Batch assignment
* Waiting list handling
* Fee account creation trigger
* Walk-in enrollment orchestration
* Lead-to-admission conversion handoff
* Enrollment activity timeline

## 2.2 Out of Scope for Phase 1

* Corporate contract ownership
* Payment gateway automation
* Attendance marking
* Completion approval
* Certificate issuance

---

# 3. Business Principles

* Admission and Enrollment are separate concepts.
* Admission is a pre-enrollment approval record.
* Enrollment is the active lifecycle record used by downstream modules.
* A student may have multiple enrollments over time.
* A lead may be converted into an admission before enrollment.
* Direct admission is allowed when no lead exists.
* Walk-in is not a separate learner lifecycle. It is an orchestration path over admission, enrollment, finance, and completion rules.
* Batch capacity must be validated before enrollment confirmation.
* Waiting list must be used when the batch is full and waiting list is enabled.
* Fee account creation must be triggered when enrollment is created.
* Inactive courses and inactive branches cannot be used for new admissions or enrollments.
* Enrollment data must be available to scheduling, attendance, completion, and certificate modules only after the required lifecycle state is reached.

---

# 4. Owned Concepts

The Admission & Enrollment context owns:

* Admission
* Enrollment
* Student
* StudentIdentity
* StudentIDCard
* EnrollmentFeeAccount
* WaitingListEntry

Notes:

* Student is the registration and learner record used by enrollment and downstream read models.
* Other contexts may project student data, but they must not own admission or enrollment lifecycle rules.
* Fee account creation is a lifecycle trigger, not a separate ownership boundary.

---

# 5. Business Model

## 5.1 Admission Lifecycle

```text
Draft
  ↓
Pending Documents
  ↓
Pending Approval
  ↓
Approved
```

Alternative:

```text
Pending Approval
  ↓
Rejected
```

Alternative:

```text
Draft
  ↓
Cancelled
```

Rules:

* Approved admissions become eligible for enrollment.
* Rejected admissions require a reason.
* Cancelled admissions remain in history.

## 5.2 Enrollment Lifecycle

```text
Draft
  ↓
Pending Fee
  ↓
Confirmed
  ↓
Active
  ↓
Completed
```

Alternative paths:

```text
Draft
  ↓
Dropped
```

```text
Draft
  ↓
Cancelled
```

```text
Completed
  ↓
Certificate Issued
```

Rules:

* Draft and Pending Fee enrollments may be edited with authorized action.
* Confirmed enrollments may be activated.
* Active enrollments are the source of truth for attendance and timetable visibility.
* Completed enrollments become the source of truth for completion and certificate workflows.

## 5.3 Enrollment Types

The system shall support:

```text
Regular
Corporate
Walk-In
```

Rules:

* Regular enrollment is used for individual learners.
* Corporate enrollment is used when the learner participates under a corporate training arrangement.
* Walk-In enrollment is used for same-day or short-duration completion flows.

---

# 6. Screens

## ADM-UI-001 Admission List Screen

### Purpose

View and manage admissions.

### Columns

```text
Admission Number
Student Name
Phone
Course
Branch
Admission Date
Admission Status
Created By
Actions
```

### Filters

```text
Branch
Course
Admission Status
Admission Date
Created By
Search
```

### Actions

```text
Create Admission
View Admission
Edit Admission
Approve Admission
Reject Admission
Cancel Admission
Convert to Enrollment
Export
```

### Permissions

```text
ADMISSION_VIEW
ADMISSION_CREATE
ADMISSION_EDIT
ADMISSION_APPROVE
ADMISSION_REJECT
ADMISSION_CANCEL
ADMISSION_EXPORT
```

---

## ADM-UI-002 Create Admission Screen

### Purpose

Create a new admission record.

### Sections

#### Section 1: Student Information

```text
First Name
Last Name
Gender
Date Of Birth
Phone
Email
Nationality
Address
Identity Document Reference
```

#### Section 2: Admission Information

```text
Branch
Admission Date
Admission Type
Referral Source
Lead Reference
Remarks
```

#### Section 3: Course Selection

```text
Department
Course
Preferred Batch
Enrollment Type
```

#### Section 4: Documents

```text
Passport
Civil ID
Visa
Qualification Certificates
Photo
```

### Business Rules

* Admission number must be auto-generated.
* Admission date defaults to the current date.
* Duplicate student warning should appear for matching phone, email, or configured identity fields.
* Lead reference is optional for direct admission.
* Admission can be saved as Draft.
* Admission may proceed even if optional documents are missing.
* Mandatory documents depend on configured document rules.
* Admission must not be approved if required documents are missing.

### Validations

* First Name is required.
* Phone is required.
* Branch is required.
* Course is required.
* Admission Date is required.
* Email must be valid if provided.

---

## ADM-UI-003 Admission Details Screen

### Sections

```text
Admission Summary
Student Information
Course Selection
Documents
Notes
Audit History
```

### Actions

```text
Edit
Approve
Reject
Cancel
Create Enrollment
View Timeline
```

---

## ADM-UI-004 Admission Approval Screen

### Purpose

Approve or reject admission before enrollment.

### Fields

```text
Approval Remarks
Rejection Reason
```

### Actions

```text
Approve
Reject
```

### Business Rules

* Only pending admissions can be approved.
* Rejected admission requires a reason.
* Approval action must be audited.
* Approved admission becomes eligible for enrollment creation.

---

## ADM-UI-005 Enrollment List Screen

### Purpose

View and manage enrollments.

### Columns

```text
Enrollment Number
Student Number
Student Name
Course
Batch
Enrollment Type
Enrollment Status
Enrollment Date
Actions
```

### Filters

```text
Branch
Course
Batch
Enrollment Status
Enrollment Type
Date Range
Search
```

### Actions

```text
Create Enrollment
View Enrollment
Edit Enrollment
Confirm Enrollment
Activate Enrollment
Drop Enrollment
Cancel Enrollment
Export
```

### Permissions

```text
ENROLLMENT_VIEW
ENROLLMENT_CREATE
ENROLLMENT_EDIT
ENROLLMENT_CONFIRM
ENROLLMENT_ACTIVATE
ENROLLMENT_DROP
ENROLLMENT_CANCEL
ENROLLMENT_EXPORT
```

---

## ADM-UI-006 Create Enrollment Screen

### Purpose

Enroll a student into a course and batch.

### Sections

#### Section 1: Student

```text
Student Number
Student Name
Admission Reference
```

#### Section 2: Course

```text
Department
Course
```

#### Section 3: Batch

```text
Batch
Waiting List Option
```

#### Section 4: Enrollment Details

```text
Enrollment Type
Enrollment Date
Expected Completion Date
Remarks
```

### Business Rules

* Enrollment number must be auto-generated.
* Student must exist.
* Course must be active.
* Branch must be active.
* Batch must be active and open for enrollment.
* Batch capacity validation is required.
* Waiting list option should appear when the batch is full and waiting list is enabled.
* Enrollment creation must trigger fee account creation.
* Enrollment must become available for downstream scheduling, attendance, completion, and certificate modules based on lifecycle state.

### Validations

* Student is required.
* Branch is required.
* Course is required.
* Batch is required.
* Enrollment Type is required.
* Enrollment Date is required.

---

## ADM-UI-007 Enrollment Details Screen

### Sections

```text
Enrollment Summary
Student Information
Course Information
Batch Information
Fee Summary
Attendance Summary
Completion Status
Certificate Status
Audit History
```

### Actions

```text
Edit
Confirm
Activate
Drop
Cancel
View Fee Account
View Timeline
```

---

## ADM-UI-008 Waiting List Screen

### Purpose

Manage waiting list entries for full batches.

### Columns

```text
Waiting List Number
Course
Batch
Student
Requested Date
Status
Actions
```

### Actions

```text
Add to Waiting List
Promote to Enrollment
Remove
Export
```

### Business Rules

* Waiting list is used only when the batch is full and waiting list is enabled.
* Waiting list entries must preserve request order unless authorized prioritization is allowed.
* Promotion from waiting list to enrollment must revalidate capacity.

---

## ADM-UI-009 Walk-In Enrollment Screen

### Purpose

Support same-day or short-duration enrollment and completion orchestration.

### Fields

```text
Student
Course
Branch
Batch
Enrollment Date
Trainer
Fee Status
Completion Eligibility
Remarks
```

### Business Rules

* Course must explicitly allow walk-in completion.
* Walk-in enrollment uses the same enrollment lifecycle.
* Same-day completion may be allowed only through the walk-in flow.
* Walk-in completion must be auditable.

---

# 7. Functional Requirements

## FR-ADM-001 Create Admission

The system shall allow authorized users to create admissions.

## FR-ADM-002 Approve Admission

The system shall allow authorized users to approve admissions.

## FR-ADM-003 Reject Admission

The system shall allow authorized users to reject admissions with a mandatory reason.

## FR-ADM-004 Cancel Admission

The system shall allow authorized users to cancel admissions.

## FR-ADM-005 Direct Admission

The system shall allow direct admission without a lead reference.

## FR-ADM-006 Register Student

The system shall create or register the learner record required for enrollment.

## FR-ADM-007 Create Enrollment

The system shall allow authorized users to create enrollments.

## FR-ADM-008 Confirm Enrollment

The system shall allow authorized users to confirm enrollments after validation.

## FR-ADM-009 Activate Enrollment

The system shall allow authorized users to activate confirmed enrollments.

## FR-ADM-010 Update Enrollment Before Activation

The system shall allow authorized users to update draft and pending-fee enrollments.

## FR-ADM-011 Drop Enrollment

The system shall allow authorized users to drop enrollments.

## FR-ADM-012 Cancel Enrollment

The system shall allow authorized users to cancel enrollments.

## FR-ADM-013 Batch Capacity Validation

The system shall prevent enrollment beyond batch capacity.

## FR-ADM-014 Waiting List Management

The system shall support waiting list entry, promotion, and removal.

## FR-ADM-015 Fee Account Trigger

The system shall create an enrollment fee account when a new enrollment is created.

## FR-ADM-016 Lead Conversion Handoff

The system shall allow qualified leads to be handed off from Lead & Inquiry Management into Admission creation.

## FR-ADM-017 Walk-In Orchestration

The system shall support walk-in enrollment and same-day completion orchestration.

---

# 8. Audit Events

The following audit events shall be supported:

```text
AdmissionCreated
AdmissionUpdated
AdmissionApproved
AdmissionRejected
AdmissionCancelled
StudentRegistered
EnrollmentCreated
EnrollmentUpdated
EnrollmentConfirmed
EnrollmentActivated
EnrollmentDropped
EnrollmentCancelled
WaitingListEntryCreated
WaitingListEntryPromoted
WalkInEnrollmentCreated
WalkInCompletionApproved
FeeAccountCreatedFromEnrollment
LeadConvertedToAdmission
```

Rules:

* Admission approval, rejection, cancellation, enrollment confirmation, activation, and walk-in completion must be auditable.
* Lost or rejected states must retain reasons.
* Fee account creation triggered by enrollment must be auditable.

---

# 9. Domain Errors

The module shall distinguish between validation and business-rule errors such as:

```text
AdmissionAlreadyApproved
AdmissionAlreadyRejected
AdmissionNotEligibleForEnrollment
EnrollmentAlreadyConfirmed
EnrollmentAlreadyActive
EnrollmentNotEditable
EnrollmentCapacityExceeded
WaitingListNotEnabled
CourseInactive
BranchInactive
BatchInactive
BatchNotOpenForEnrollment
StudentInactive
WalkInCompletionNotAllowed
LeadConversionInvalid
DuplicateStudentDetected
InvalidEnrollmentType
```

---

# 10. Reporting and Operational Views

The Admission & Enrollment context shall support the following read views:

```text
Admission List
Enrollment List
Waiting List
Admission Status Summary
Enrollment Status Summary
Enrollment Timeline
Branch Enrollment Summary
Walk-In Completion Summary
```

These are read models and operational views, not separate owned entities.

---

# 11. FRD Improvement Notes

This module should remain the single source of truth for:

* admission approval
* direct admission
* enrollment lifecycle
* waiting list behavior
* fee account creation trigger
* walk-in orchestration
* lead-to-admission handoff

It should not own attendance marking, completion approval, or certificate issuance.
