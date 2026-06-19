# Functional Requirement Document (FRD)

## Module 5: Student Management

**Version:** 1.0
**Module Code:** STD
**Dependencies:**

* Identity & Access
* Organization Management
* Admission & Enrollment Management
* Document Management

---

# 1. Business Purpose

Student Management is responsible for maintaining the master student record throughout the student's lifecycle.

The module shall support:

* Student Profile Management
* Student Identity Information
* Student Lifecycle Tracking
* Student Documents
* Emergency Contacts
* Student Portal Access
* Student History
* Student Status Management

The Student entity shall be considered the single source of truth for all learner information.

---

# 2. Student Lifecycle

The system shall support the following student lifecycle:

```text
Inquiry
   ↓
Applied
   ↓
Admitted
   ↓
Active
   ↓
Completed
   ↓
Alumni
```

Alternative paths:

```text
Active
   ↓
Suspended

Active
   ↓
Dropped
```

---

# 3. Student Number Generation

### Configuration

Student Number shall be configurable.

Examples:

```text
STD-2026-00001
ALS-00001
BR01-00001
```

### Business Rules

* Student Number must be unique.
* Student Number generated automatically.
* Student Number cannot be edited after creation.
* Historical Student Numbers must never be reused.

---

# 4. Student Profile Structure

Student Profile consists of:

```text
Personal Information
Contact Information
Identity Information
Address Information
Emergency Contacts
Enrollment Summary
Documents
Portal Access
Audit History
```

---

# 5. Screens

## STD-UI-001 Student List Screen

### Purpose

View all students.

### Columns

```text
Student Number
Student Name
Phone
Email
Nationality
Branch
Current Status
Active Enrollments
Created Date
Actions
```

### Filters

```text
Branch
Status
Course
Batch
Nationality
Enrollment Type
Created Date Range
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
```

---

## STD-UI-002 Student Create Screen

### Purpose

Create student manually without admission flow.

Used for:

```text
Walk-In Training
Corporate Participants
Data Migration
Direct Registration
```

### Section 1: Personal Information

Fields:

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

Fields:

```text
Mobile Number
Alternate Number
Email
Preferred Contact Method
```

### Section 3: Address Information

Fields:

```text
Country
City
Area
Street Address
Postal Code
```

### Section 4: Identity Information

Fields are configurable.

Examples:

```text
Civil ID
Passport Number
Visa Number
Employer
```

### Section 5: Emergency Contact

Fields:

```text
Contact Name
Relationship
Phone Number
Email
```

---

### Validations

Required:

```text
First Name
Mobile Number
Nationality
```

### Business Rules

* Duplicate detection should check:

  * Mobile Number
  * Email
  * Passport Number (if configured)

* Student profile can be created without enrollment.

* Student status defaults to Admitted.

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

#### Financial Summary

```text
Total Fees
Paid Amount
Outstanding Amount
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

---

### Actions

```text
Edit Profile
Change Status
Upload Document
Generate Login
View Enrollments
View Certificates
```

---

## STD-UI-004 Student Status Change Screen

### Purpose

Manage student lifecycle.

### Fields

```text
Current Status
New Status
Reason
Remarks
```

### Allowed Status Changes

```text
Applied → Admitted
Admitted → Active
Active → Completed
Active → Suspended
Active → Dropped
Completed → Alumni
```

---

### Business Rules

* Status changes must be audited.
* Suspended students cannot enroll in new courses.
* Dropped students cannot be activated without authorization.
* Completed students remain visible historically.

---

## STD-UI-005 Student Portal Access Screen

### Purpose

Generate student portal credentials.

### Fields

```text
Student Number
Portal Username
Portal Email
Status
```

### Actions

```text
Generate Access
Reset Password
Deactivate Access
```

### Business Rules

* One portal account per student.
* Portal account should use Identity & Access module.
* Portal activation should be audited.

---

# 6. Student Identity Management

## Configurable Identity Fields

The system shall support configurable identity fields.

Examples:

```text
Civil ID
Passport Number
Visa Number
Nationality
Employer
Driving License
National ID
```

### Configuration Properties

Each field shall support:

```text
Field Name
Field Type
Required
Unique
Visible
Display Order
```

---

### Business Rules

* Identity fields must be configurable.
* Certain fields may be unique.
* Validation rules depend on configuration.

---

# 7. Student Documents

Student documents are managed by Document Management module.

### Supported Examples

```text
Passport
Civil ID
Visa
Photo
Qualification Certificate
Employment Letter
Other Attachments
```

### Document Status

```text
Uploaded
Pending Verification
Approved
Rejected
```

### Business Rules

* Required documents depend on configuration.
* Student profile should display document status summary.
* Rejected documents should capture rejection reason.

---

# 8. Student Portal Features

Phase 1 Student Portal shall allow students to view:

```text
Profile
Enrollments
Attendance
Fee Summary
Receipts
Certificates
Notifications
Documents
Timetable
```

### Phase 1 Restrictions

Students cannot:

```text
Modify Attendance
Modify Fees
Generate Certificates
Approve Documents
```

---

# 9. Functional Requirements

## FR-STD-001 Student Creation

The system shall allow authorized users to create student profiles.

---

## FR-STD-002 Student Update

The system shall allow authorized users to update student profiles.

---

## FR-STD-003 Student Duplicate Detection

The system shall warn users when duplicate students are detected.

---

## FR-STD-004 Student Number Generation

The system shall generate unique student numbers.

---

## FR-STD-005 Student Status Management

The system shall support configurable student lifecycle management.

---

## FR-STD-006 Identity Field Configuration

The system shall support configurable student identity fields.

---

## FR-STD-007 Student Enrollment Visibility

The system shall display all enrollments associated with a student.

---

## FR-STD-008 Student Document Visibility

The system shall display all student documents and verification statuses.

---

## FR-STD-009 Student Financial Summary

The system shall display fee and payment summaries for each student.

---

## FR-STD-010 Student Certificate Visibility

The system shall display certificates issued to the student.

---

## FR-STD-011 Student Portal Access

The system shall support portal access for students.

---

## FR-STD-012 Student Audit Tracking

The system shall audit all profile updates and status changes.

---

# 10. Notifications

### Student Portal Created

Notify:

```text
Student
Admission Creator
```

---

### Student Status Changed

Notify:

```text
Branch Manager
Relevant Counselor
```

---

### Document Rejected

Notify:

```text
Student
Document Verifier
```

---

# 11. Reports

## Operational Reports

```text
Student List Report
Student Status Report
Student Nationality Report
Student Enrollment Summary
```

## Management Reports

```text
Active Students
Completed Students
Dropped Students
Suspended Students
Alumni Report
```

## Compliance Reports

```text
Missing Documents Report
Expired Identity Document Report
Student Verification Report
```

---

# 12. Audit Requirements

Audit the following:

```text
Student Created
Student Updated
Student Status Changed
Identity Field Updated
Portal Access Created
Portal Access Disabled
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

---

# 13. Open Design Decisions

### Student Merge

Future enhancement:

```text
Merge Duplicate Student Records
```

Not included in Phase 1.

### Student Transfer

Future enhancement:

```text
Transfer Between Branches
Transfer Between Courses
Transfer Between Batches
```

Not included in Phase 1.

### Parent Portal

Excluded from current roadmap.

---

# 14. Integration Points

### Consumes

```text
Admission Module
Identity & Access
Document Management
```

### Provides Data To

```text
Enrollment
Attendance
Finance
Communication
Completion
Certificate
Reporting
Student Portal
```
