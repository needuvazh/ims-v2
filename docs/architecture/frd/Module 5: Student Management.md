# Functional Requirement Document

## Module 5: Student Management

**Version:** 1.1
**Module Code:** STD
**Phase:** Phase 1
**Owned Bounded Context:** Admission & Enrollment Management

**Dependencies:**

* Identity & Access Management
* Organization Management
* Admission & Enrollment Management
* Document Management

**Provides Data To:**

* Admission & Enrollment Management
* Scheduling & Timetable Management
* Attendance Management
* Exam, Result & Completion Management
* Certificate Management
* Communication Management
* Reporting & Dashboards
* Audit & Compliance
* Student Portal

---

# 1. Business Purpose

Student Management maintains the master learner profile used across IMS.

The module owns the student profile, identity configuration, emergency contacts, portal access, and student-facing history summaries.

The Student entity is the single source of truth for learner profile information, but it does not own admission, enrollment, attendance, completion, or certificate lifecycle behavior.

---

# 2. Scope

## 2.1 In Scope

* Student profile management
* Student number generation
* Configurable identity fields
* Identity value capture
* Emergency contact management
* Student portal access
* Student status management
* Student history views
* Read-only enrollment summary
* Read-only attendance summary
* Read-only completion summary
* Read-only certificate summary

## 2.2 Out of Scope for Phase 1

* Parent portal
* AI enrichment
* Full CRM profile management
* Admission approval
* Enrollment lifecycle control

---

# 3. Business Principles

* Student is a master profile, not a duplicate lifecycle of admission or enrollment.
* A student may exist without enrollment.
* A student may have multiple enrollments over time.
* Student numbers must be unique and never reused.
* Duplicate detection must evaluate configured identity fields in addition to phone and email.
* Student portal access is optional and must be explicitly enabled.
* Student summaries displayed in this module are projections from other owned contexts.
* Student status changes must be auditable.

---

# 4. Owned Concepts

The Student context owns:

* Student
* StudentIdentityField
* StudentIdentityValue
* StudentEmergencyContact
* StudentPortalAccess
* StudentNumberPolicy

Notes:

* `EnrollmentSummary`, `AttendanceSummary`, `CompletionSummary`, and `CertificateSummary` are read models.
* `Admission` and `Enrollment` remain owned by Admission & Enrollment Management.
* `Document` remains owned by Document Management, although the student module may surface document views.

---

# 5. Student Model

## 5.1 Student Number

The system shall support configurable student number generation.

Examples:

```text
STD-2026-00001
ALS-00001
BR01-00001
```

Rules:

* Student number must be auto-generated.
* Student number must be unique.
* Student number cannot be edited after creation.
* Historical student numbers must never be reused.

## 5.2 Student Status Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
```

Alternative:

```text
Active
  ↓
Suspended
```

Alternative:

```text
Active
  ↓
Archived
```

Rules:

* Draft may be used for incomplete manually created profiles.
* Active is the normal operational status.
* Inactive students cannot be used for new enrollments.
* Suspended students require authorization before new enrollment actions.
* Archived students remain visible for historical reporting.

## 5.3 Identity Configuration

The system shall support configurable identity fields.

Examples:

```text
Civil ID
Passport Number
Visa Number
Employer
National ID
Resident Card Number
```

Rules:

* Identity fields must be configurable by branch or institute policy if required.
* Required identity fields must be enforced at the boundary.
* Unique identity fields must not duplicate existing active values.

---

# 6. Screens

## STD-UI-001 Student List Screen

### Purpose

View and manage student profiles.

### Columns

```text
Student Number
Student Name
Phone
Email
Nationality
Branch
Status
Enrollment Count
Created Date
Actions
```

### Filters

```text
Branch
Status
Nationality
Enrollment Type
Created Date Range
Search
```

### Actions

```text
Create Student
View Student
Edit Student
Change Status
Generate Portal Login
Export
```

### Permissions

```text
STUDENT_VIEW
STUDENT_CREATE
STUDENT_EDIT
STUDENT_STATUS_CHANGE
STUDENT_EXPORT
STUDENT_PORTAL_CREATE
```

---

## STD-UI-002 Student Create Screen

### Purpose

Create a student manually without admission flow.

Used for:

```text
Walk-In Training
Corporate Participant Linked Profile
Data Migration
Direct Registration
```

### Section 1: Personal Information

```text
First Name
Middle Name
Last Name
Gender
Date Of Birth
Nationality
Photo
```

### Section 2: Contact Information

```text
Mobile Number
Alternate Number
Email
Preferred Contact Method
```

### Section 3: Address Information

```text
Country
City
Area
Street Address
Postal Code
```

### Section 4: Identity Information

```text
Identity Field
Identity Value
```

### Section 5: Emergency Contact

```text
Contact Name
Relationship
Phone Number
Email
```

### Validations

* First Name is required.
* Mobile Number is required.
* Nationality is required.
* Email must be valid if provided.
* Required identity fields must be provided.

### Business Rules

* Duplicate detection should check mobile number, email, and configured identity fields.
* Student profile can be created without enrollment.
* Student status defaults to Draft for manual creation unless a policy says otherwise.
* Student creation must be audited.

---

## STD-UI-003 Student Details Screen

### Tabs

#### Profile

```text
Personal Information
Contact Information
Identity Information
```

#### Enrollments

```text
Enrollment Number
Course
Batch
Status
```

#### Documents

```text
Uploaded Documents
Verification Status
```

#### Attendance Summary

```text
Attendance %
Present Days
Absent Days
```

#### Completion Summary

```text
Completion Status
Eligibility Status
Approval Status
```

#### Certificates

```text
Certificate Number
Issue Date
Verification Status
```

#### Communication History

```text
Notifications
SMS
WhatsApp
Email
```

#### Audit History

```text
Profile Changes
Status Changes
```

### Actions

```text
Edit Profile
Change Status
Upload Document
Generate Portal Login
View Enrollments
View Certificates
```

---

## STD-UI-004 Student Status Change Screen

### Purpose

Manage student profile status.

### Fields

```text
Current Status
New Status
Reason
Remarks
```

### Allowed Status Changes

```text
Draft → Active
Active → Suspended
Active → Inactive
Active → Archived
Suspended → Active
Inactive → Archived
```

### Business Rules

* Status changes must be audited.
* Suspended students cannot enroll in new courses without authorization.
* Inactive or archived students remain visible historically.

---

## STD-UI-005 Student Portal Access Screen

### Purpose

Enable or disable student portal access.

### Fields

```text
Student
Login Email
Temporary Password
Status
Last Login At
```

### Actions

```text
Generate Login
Reset Password
Deactivate Access
Activate Access
```

### Business Rules

* Portal access is optional.
* Portal access must be explicitly granted.
* Login credentials must be managed by IAM.
* Student profile data must not expose password values.

---

## STD-UI-006 Identity Field Configuration

### Purpose

Configure student identity fields.

### Fields

```text
Field Name
Field Code
Field Type
Required
Unique
Display Order
Status
Effective Start Date
Effective End Date
```

### Business Rules

* Identity fields are configurable master data.
* Required and unique flags must be enforced at student creation and update.
* Deactivated fields cannot be used for new values.

---

# 7. Functional Requirements

## FR-STD-001 Create Student

The system shall allow authorized users to create student profiles.

## FR-STD-002 Update Student

The system shall allow authorized users to update student profiles.

## FR-STD-003 Detect Duplicate Student

The system shall warn on duplicate mobile number, email, or configured identity fields.

## FR-STD-004 Generate Student Number

The system shall generate unique student numbers automatically.

## FR-STD-005 Manage Student Status

The system shall allow authorized users to change student status.

## FR-STD-006 Configure Identity Fields

The system shall allow authorized users to configure student identity fields.

## FR-STD-007 Student Enrollment Visibility

The system shall show student enrollment summaries as read-only projections.

## FR-STD-008 Student Document Visibility

The system shall show student document summaries as read-only projections.

## FR-STD-009 Student Financial Summary

The system shall show student financial summaries as read-only projections.

## FR-STD-010 Student Certificate Visibility

The system shall show student certificate summaries as read-only projections.

## FR-STD-011 Student Portal Access

The system shall allow authorized users to create and manage student portal access.

## FR-STD-012 Student Audit Tracking

The system shall audit student profile changes and status changes.

---

# 8. Audit Events

The following audit events shall be supported:

```text
StudentCreated
StudentUpdated
StudentStatusChanged
StudentNumberGenerated
StudentPortalAccessCreated
StudentPortalAccessUpdated
IdentityFieldCreated
IdentityFieldUpdated
IdentityFieldDeactivated
EmergencyContactUpdated
```

Rules:

* Profile changes and status changes must be auditable.
* Password values must never appear in student audit records.
* Identity value changes should include the reason where applicable.

---

# 9. Domain Errors

The module shall distinguish between validation and business-rule errors such as:

```text
DuplicateStudentDetected
StudentNumberAlreadyExists
IdentityFieldRequired
IdentityFieldDuplicate
StudentStatusChangeNotAllowed
StudentPortalAlreadyExists
StudentInactive
StudentArchived
InvalidIdentityFieldConfiguration
BranchScopeViolation
```

---

# 10. Reporting and Operational Views

The Student context shall support the following read views:

```text
Student List
Student Profile
Enrollment Summary
Attendance Summary
Completion Summary
Certificate Summary
Student History
```

These are read models and operational views, not separate owned entities.

---

# 11. FRD Improvement Notes

This module should remain the single source of truth for:

* student profile data
* student number policy
* identity field policy
* portal access
* student-facing summaries

It should not own admission, enrollment, attendance, completion, or certificate lifecycle rules.
