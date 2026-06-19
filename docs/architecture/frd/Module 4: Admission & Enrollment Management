# Functional Requirement Document (FRD)

## Module 4: Admission & Enrollment Management

**Version:** 1.0
**Module Code:** ADM
**Dependencies:**

* Identity & Access
* Organization Management
* Lead & Inquiry Management

---

# 1. Business Purpose

Admission & Enrollment Management is responsible for converting prospective students into registered students and enrolling them into courses and batches.

This module acts as the bridge between:

```text
Lead Management
        ↓
Admission
        ↓
Student
        ↓
Enrollment
        ↓
Course / Batch
        ↓
Finance / Attendance / Completion
```

The Enrollment entity is the central business aggregate of the IMS platform.

---

# 2. Business Process Flow

## Standard Admission Flow

```text
Lead Created
      ↓
Lead Qualified
      ↓
Lead Won
      ↓
Admission Created
      ↓
Student Created
      ↓
Enrollment Created
      ↓
Course Assigned
      ↓
Batch Assigned
      ↓
Fee Plan Assigned
      ↓
Enrollment Activated
```

---

## Direct Admission Flow

Used when student walks directly into institute.

```text
Direct Admission
      ↓
Student Created
      ↓
Enrollment Created
      ↓
Course Assigned
      ↓
Batch Assigned
```

Lead creation is optional.

---

# 3. Admission Status Lifecycle

The system shall support:

```text
Draft
Pending Documents
Pending Approval
Approved
Rejected
Cancelled
Completed
```

---

# 4. Enrollment Status Lifecycle

The system shall support:

```text
Draft
Pending Fee
Confirmed
Active
Completed
Dropped
Cancelled
Certificate Issued
```

---

# 5. Screens

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

Create new admission.

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
```

#### Section 2: Admission Information

```text
Branch
Admission Date
Admission Type
Referral Source
Lead Reference
```

#### Section 3: Course Selection

```text
Department
Course
Preferred Batch
```

#### Section 4: Documents

```text
Passport
Civil ID
Visa
Qualification Certificates
Photo
```

Document types are configurable.

---

### Business Rules

* Admission Number must be auto-generated.
* Admission Date defaults to current date.
* Student phone number should be checked for duplicates.
* Existing student warning should be shown.
* Admission can be saved as Draft.
* Admission can proceed even if optional documents are missing.
* Mandatory documents depend on configured document rules.

---

### Validations

Required:

```text
Student Name
Phone
Branch
Course
Admission Date
```

---

## ADM-UI-003 Admission Details Screen

### Sections

#### Admission Summary

```text
Admission Number
Status
Branch
Created By
Created Date
```

#### Student Information

#### Course Selection

#### Documents

#### Notes

#### Audit History

---

### Actions

```text
Edit
Approve
Reject
Cancel
Create Enrollment
```

---

## ADM-UI-004 Admission Approval Screen

### Purpose

Approve admission before enrollment.

### Fields

```text
Approval Remarks
```

### Actions

```text
Approve
Reject
```

---

### Business Rules

* Only authorized users may approve.
* Rejected admission requires remarks.
* Approval action must be audited.

---

# 6. Enrollment Screens

## ADM-UI-005 Enrollment List Screen

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
```

### Actions

```text
Create Enrollment
View Enrollment
Edit Enrollment
Activate Enrollment
Drop Enrollment
Cancel Enrollment
Export
```

---

## ADM-UI-006 Create Enrollment Screen

### Purpose

Enroll student into a course and batch.

### Section 1: Student

```text
Student Number
Student Name
```

### Section 2: Course

```text
Department
Course
```

### Section 3: Batch

```text
Batch
```

### Section 4: Enrollment Details

```text
Enrollment Type
Enrollment Date
Expected Completion Date
Remarks
```

---

### Enrollment Types

```text
Regular
Corporate
Walk-In
```

---

### Business Rules

* Enrollment Number must be auto-generated.
* Student must exist.
* Course must be active.
* Batch must be active.
* Batch capacity validation required.
* Waiting list option should appear when batch is full.
* Enrollment automatically creates Enrollment Fee Account.
* Enrollment automatically becomes available for attendance tracking.

---

### Validations

Required:

```text
Student
Course
Batch
Enrollment Type
Enrollment Date
```

---

## ADM-UI-007 Enrollment Details Screen

### Sections

#### Enrollment Summary

```text
Enrollment Number
Status
Enrollment Date
```

#### Student Information

#### Course Information

#### Batch Information

#### Fee Summary

#### Attendance Summary

#### Completion Status

#### Certificate Status

#### Audit History

---

### Actions

```text
Edit
Activate
Drop
Cancel
View Fee Account
View Attendance
View Completion
View Certificate
```

---

# 7. Functional Requirements

## FR-ADM-001 Admission Creation

The system shall allow authorized users to create admissions.

---

## FR-ADM-002 Admission Approval

The system shall support admission approval workflow.

---

## FR-ADM-003 Admission Rejection

The system shall support admission rejection with mandatory remarks.

---

## FR-ADM-004 Student Creation

The system shall create a student profile as part of admission processing.

---

## FR-ADM-005 Enrollment Creation

The system shall allow students to be enrolled into courses and batches.

---

## FR-ADM-006 Batch Capacity Validation

The system shall prevent enrollment when batch capacity is reached unless waiting list process is used.

---

## FR-ADM-007 Waiting List Support

The system shall allow students to be added to waiting list when batch is full.

---

## FR-ADM-008 Enrollment Activation

The system shall activate enrollment after successful creation.

---

## FR-ADM-009 Enrollment Drop

The system shall allow authorized users to drop enrollments.

---

## FR-ADM-010 Enrollment Cancellation

The system shall support enrollment cancellation.

---

## FR-ADM-011 Fee Account Creation

The system shall automatically create Enrollment Fee Account upon enrollment.

---

## FR-ADM-012 Attendance Integration

The system shall make enrolled students available to attendance module.

---

## FR-ADM-013 Completion Integration

The system shall make enrolled students available to completion module.

---

## FR-ADM-014 Certificate Eligibility Integration

The system shall make enrollment data available to certificate eligibility engine.

---

# 8. Notifications

## Admission Approved

Notify:

```text
Counselor
Admission Creator
Branch Manager
```

---

## Enrollment Created

Notify:

```text
Student
Counselor
Branch Manager
```

Phase 1 uses system notifications only.

---

# 9. Reports

## Admission Reports

```text
Admission Count By Branch
Admission Count By Course
Admission Conversion Report
Admission Rejection Report
```

## Enrollment Reports

```text
Enrollment Count By Course
Enrollment Count By Batch
Enrollment Status Report
Waiting List Report
```

---

# 10. Audit Requirements

Audit the following actions:

```text
Admission Created
Admission Updated
Admission Approved
Admission Rejected
Enrollment Created
Enrollment Updated
Enrollment Dropped
Enrollment Cancelled
```

Each audit record must capture:

```text
User
Action
Timestamp
Old Value
New Value
Reason
```
