# Functional Requirement Document

## Module 10: Faculty / Trainer Management

**Version:** 1.1
**Module Code:** TRN
**Phase:** Phase 1
**Owned Bounded Context:** Faculty / Trainer Management

**Dependencies:**

* Organization Management
* Identity & Access Management
* Document Management
* Course & Batch Management
* Scheduling & Timetable Management

**Provides Data To:**

* Scheduling & Timetable Management
* Attendance Management
* Exam, Result & Completion Management
* Corporate Training Management
* Reporting & Dashboards
* Audit & Compliance

---

# 1. Business Purpose

Faculty / Trainer Management maintains trainer master data and delivery authorization.

The context owns trainer profiles, classifications, qualifications, documents, availability, course authorization, assignment history, utilization reporting inputs, and trainer portal read views.

This module does not own scheduling or payroll. It provides trainer capabilities and constraints to downstream modules.

---

# 2. Scope

## 2.1 In Scope

* Trainer profile management
* Trainer classification
* Trainer qualification tracking
* Trainer document tracking
* Trainer availability management
* Trainer-course authorization
* Trainer assignment tracking
* Trainer utilization summaries
* Corporate trainer assignment tracking
* Trainer portal read access
* Expiry monitoring

## 2.2 Out of Scope for Phase 1

* Payroll processing
* Salary calculation
* Timesheet-to-payroll automation
* Employee master management

---

# 3. Business Principles

* Trainer is a domain entity, not an employee proxy.
* Trainers may be full-time, part-time, freelance, guest, or corporate delivery resources.
* A trainer may belong to one or more branches.
* A trainer may be authorized for one or more courses.
* Trainer availability must be validated before scheduling assigns sessions.
* Trainer assignments must not overlap in time.
* Trainer document and certification expiry must generate alerts.
* Expired authorization must block new assignments.
* Corporate delivery assignments are still trainer assignments and remain within this context.

---

# 4. Owned Concepts

The Trainer context owns:

* Trainer
* TrainerQualification
* TrainerDocument
* TrainerAvailability
* TrainerCourseAuthorization
* TrainerAssignment
* TrainerUtilizationSnapshot
* TrainerPortalAccess

Notes:

* Schedule sessions are owned by Scheduling & Timetable Management.
* Trainers are referenced by scheduling, attendance, and completion contexts.
* Payroll is intentionally excluded from this context.

---

# 5. Business Model

## 5.1 Trainer Types

The system shall support:

```text
Full-Time Trainer
Part-Time Trainer
Freelance Trainer
Guest Trainer
Corporate Trainer
```

Rules:

* Trainer type is a classification and not a payroll indicator.
* A trainer may change type through authorized update.

## 5.2 Trainer Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
  ↓
Archived
```

Alternative:

```text
Active
  ↓
Suspended
```

Rules:

* Draft may be used for incomplete trainer profiles.
* Active trainers may be assigned to courses, batches, or sessions.
* Inactive or suspended trainers cannot be assigned to new delivery work.
* Archived trainers remain available for history and reporting.

## 5.3 Qualification Lifecycle

```text
Uploaded
  ↓
Pending Verification
  ↓
Approved
```

Alternative:

```text
Pending Verification
  ↓
Rejected
```

Alternative:

```text
Approved
  ↓
Expired
```

## 5.4 Document Lifecycle

```text
Uploaded
  ↓
Pending Verification
  ↓
Approved
```

Alternative:

```text
Pending Verification
  ↓
Rejected
```

Alternative:

```text
Approved
  ↓
Expired
```

## 5.5 Availability Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
```

Rules:

* Availability defines when a trainer may be scheduled.
* Unavailable dates override recurring availability.

---

# 6. Screens

## TRN-UI-001 Trainer List Screen

### Purpose

View and manage trainers.

### Columns

```text
Trainer Code
Trainer Name
Trainer Type
Branch
Email
Phone
Status
Active Assignments
Actions
```

### Filters

```text
Branch
Trainer Type
Status
Course
Availability
Search
```

### Actions

```text
Create Trainer
View Trainer
Edit Trainer
Activate
Deactivate
Suspend
Assign Course
Assign Batch
View Utilization
```

### Permissions

```text
TRAINER_VIEW
TRAINER_CREATE
TRAINER_EDIT
TRAINER_ACTIVATE
TRAINER_DEACTIVATE
TRAINER_SUSPEND
TRAINER_ASSIGN
```

---

## TRN-UI-002 Trainer Profile Screen

### Sections

#### Personal Information

```text
Trainer Code
First Name
Middle Name
Last Name
Gender
Date Of Birth
Nationality
Photo
```

#### Contact Information

```text
Mobile Number
Alternate Number
Email
Address
Country
City
```

#### Professional Information

```text
Trainer Type
Primary Specialization
Years Of Experience
Joining Date
Branch
Status
```

#### Certifications

```text
Certification Name
Issuing Authority
Issue Date
Expiry Date
```

### Business Rules

* Trainer code must be auto-generated.
* Trainer code must be unique.
* Email must be unique if provided.
* Trainer may belong to multiple branches.
* Trainer profile changes must be audited.

### Validations

* First Name is required.
* Mobile Number is required.
* Trainer Type is required.
* Primary Specialization is required.
* At least one branch is required.
* Years Of Experience cannot be negative.

---

## TRN-UI-003 Qualifications Screen

### Purpose

Track trainer qualifications.

### Fields

```text
Qualification
Institution
Year Completed
Grade
Certificate Attachment
Status
```

### Business Rules

* Multiple qualifications are allowed.
* Qualification certificates may be uploaded.
* Qualification history must be retained.
* Qualification expiry must generate alerts when applicable.

---

## TRN-UI-004 Trainer Documents

### Supported Documents

```text
Passport
Visa
Civil ID
Qualification Certificate
Trainer License
Employment Contract
Photo
Other Attachments
```

### Document Status

```text
Uploaded
Pending Verification
Approved
Rejected
Expired
```

### Business Rules

* Expiry dates are supported.
* Expired documents should generate alerts.
* Verification history must be retained.
* Document approval status must be visible to scheduling and audit views.

---

## TRN-UI-005 Availability Screen

### Purpose

Define trainer working availability.

### Fields

```text
Available Days
Available From Time
Available To Time
Unavailable Dates
Status
```

### Example

```text
Monday-Friday
09:00 AM to 05:00 PM
```

### Business Rules

* Availability is used by Scheduling & Timetable Management.
* Scheduling outside availability requires override permission.
* Unavailable dates block assignments.

---

## TRN-UI-006 Assignment Screen

### Purpose

Assign trainers to courses, batches, or corporate delivery work.

### Fields

```text
Trainer
Course
Batch
Corporate Customer
Corporate Contract
Delivery Location
Assignment Type
Assigned From
Assigned To
```

### Assignment Types

```text
Primary Trainer
Assistant Trainer
Guest Trainer
Evaluator
Corporate Trainer
```

### Business Rules

* Multiple trainers per batch are allowed.
* Trainer overlap validation is required.
* Trainer availability validation is required.
* Trainer must be authorized for the course where configured.
* Corporate assignments are tracked separately as assignment records, not as a separate trainer type.

---

## TRN-UI-007 Trainer Course Matrix

### Purpose

Define which courses a trainer can deliver.

### Columns

```text
Course
Authorized
Valid From
Valid To
```

### Business Rules

* Trainer should only be assigned to approved courses.
* Expired authorization should prevent assignment.
* Course authorization changes must be auditable.

---

## TRN-UI-008 Trainer Dashboard

### Purpose

Show trainer delivery performance.

### Metrics

```text
Assigned Batches
Completed Batches
Attendance Submission Rate
Student Attendance %
Completion Rate
Certificates Issued
```

### Future Metrics

```text
Student Feedback
Trainer Rating
```

Not in Phase 1.

---

## TRN-UI-009 Utilization Report

### Metrics

```text
Available Hours
Assigned Hours
Utilization %
```

### Formula

```text
Assigned Hours
÷
Available Hours
×
100
```

### Example

```text
Available = 160 Hours
Assigned = 120 Hours
Utilization = 75%
```

---

## TRN-UI-010 Trainer Portal View

### Purpose

Provide read-only trainer self-service access.

### Views

```text
Assigned Courses
Assigned Batches
Timetable
Attendance Pending
Upcoming Sessions
Document Expiry
```

### Business Rules

* Phase 1 portal view is read-only.
* Trainer may access only own data.
* Sensitive profile fields must remain protected.

---

# 7. Functional Requirements

## FR-TRN-001 Create Trainer

The system shall allow authorized users to create trainers.

## FR-TRN-002 Update Trainer

The system shall allow authorized users to update trainers.

## FR-TRN-003 Classify Trainers

The system shall support multiple trainer types.

## FR-TRN-004 Track Qualifications

The system shall track trainer qualifications.

## FR-TRN-005 Track Documents

The system shall track trainer documents.

## FR-TRN-006 Manage Availability

The system shall support trainer availability management.

## FR-TRN-007 Authorize Courses

The system shall support trainer-course authorization mapping.

## FR-TRN-008 Assign Trainers

The system shall support trainer assignments to courses, batches, and corporate delivery work.

## FR-TRN-009 Monitor Expiry

The system shall monitor document and certification expiry.

## FR-TRN-010 View Utilization

The system shall support trainer utilization reporting.

## FR-TRN-011 Trainer Portal Access

The system shall provide read-only trainer portal access.

## FR-TRN-012 Audit Trainer Changes

The system shall maintain trainer audit history.

---

# 8. Audit Events

The following audit events shall be supported:

```text
TrainerCreated
TrainerUpdated
TrainerActivated
TrainerDeactivated
TrainerSuspended
TrainerQualificationAdded
TrainerQualificationUpdated
TrainerDocumentUploaded
TrainerDocumentVerified
TrainerDocumentRejected
TrainerAvailabilityUpdated
TrainerCourseAuthorized
TrainerCourseAuthorizationExpired
TrainerAssigned
TrainerRemoved
TrainerPortalAccessCreated
TrainerStatusChanged
```

Rules:

* Trainer profile, authorization, document, and availability changes must be audited.
* Audit records must capture actor, timestamp, and reason where applicable.

---

# 9. Domain Errors

The module shall distinguish between validation and business-rule errors such as:

```text
TrainerCodeAlreadyExists
TrainerEmailAlreadyExists
TrainerInactive
TrainerSuspended
TrainerArchived
TrainerAssignmentConflict
TrainerAvailabilityConflict
TrainerCourseNotAuthorized
DocumentExpired
DocumentVerificationRequired
QualificationExpired
BranchInactive
CourseInactive
CorporateContractInactive
InvalidAvailabilityRange
InvalidAssignmentRange
```

---

# 10. Reporting and Operational Views

The Trainer context shall support the following read views:

```text
Trainer List Report
Trainer Assignment Report
Trainer Availability Report
Trainer Utilization Report
Trainer Workload Report
Trainer Activity Report
Expired Certifications
Expiring Certifications
Expired Documents
Expiring Documents
Corporate Trainer Allocation Report
Corporate Delivery Report
```

These are read models and operational views, not separate owned entities.

---

# 11. FRD Improvement Notes

This module should remain the single source of truth for:

* trainer profiles
* qualifications
* documents
* availability
* course authorization
* trainer assignments
* utilization summaries

It should not own scheduling sessions or payroll.
