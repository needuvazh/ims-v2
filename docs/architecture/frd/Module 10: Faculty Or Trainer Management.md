# Functional Requirement Document (FRD)

## Module 10: Faculty Or Trainer Management

**Version:** 1.0
**Module Code:** TRN

**Dependencies:**

* Organization Management
* Identity & Access
* Document Management

**Provides Data To:**

* Scheduling & Timetable
* Attendance Management
* Course Completion
* Corporate Training
* Future Payroll Module

---

# 1. Business Purpose

Trainer Management is responsible for managing trainers, qualifications, documents, availability, assignments, utilization, and training delivery.

The module shall support:

* Trainer Profile Management
* Trainer Classification
* Trainer Qualifications
* Trainer Documents
* Trainer Availability
* Trainer Assignment
* Trainer Utilization Tracking
* Corporate Trainer Assignment
* Trainer Performance Metrics

---

# 2. Trainer Types

The system shall support:

```text
Full-Time Trainer
Part-Time Trainer
Freelance Trainer
Guest Trainer
Corporate Trainer
```

---

# 3. Trainer Lifecycle

```text
Draft
   ↓
Active
   ↓
Inactive
   ↓
Archived
```

Alternative Flow

```text
Active
   ↓
Suspended
```

---

# 4. Trainer Profile Structure

```text
Personal Information
Contact Information
Professional Information
Qualifications
Documents
Availability
Assignments
Performance Metrics
Audit History
```

---

# 5. Screens

## TRN-UI-001 Trainer List Screen

### Purpose

View all trainers.

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
```

### Permissions

```text
TRAINER_VIEW
TRAINER_CREATE
TRAINER_EDIT
TRAINER_ACTIVATE
TRAINER_DEACTIVATE
TRAINER_ASSIGN
```

---

# 6. Create / Edit Trainer

## TRN-UI-002 Trainer Profile Screen

### Section 1: Personal Information

Fields:

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

---

### Section 2: Contact Information

Fields:

```text
Mobile Number
Alternate Number
Email
Address
Country
City
```

---

### Section 3: Professional Information

Fields:

```text
Trainer Type
Primary Specialization
Years Of Experience
Joining Date
Branch
Status
```

---

### Section 4: Certifications

Fields:

```text
Certification Name
Issuing Authority
Issue Date
Expiry Date
```

---

### Business Rules

* Trainer Code auto-generated.
* Trainer Code unique.
* Email unique.
* Trainer may belong to multiple courses.
* Trainer may serve multiple branches.

---

### Validations

Required:

```text
Trainer Name
Trainer Type
Mobile Number
Primary Specialization
```

---

# 7. Trainer Qualification Management

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
```

### Examples

```text
B.Tech
MBA
NEBOSH
IOSH
PMP
OSHA
Cisco
Microsoft
AWS
```

---

### Business Rules

* Multiple qualifications allowed.
* Qualification certificates may be uploaded.
* Qualification history retained.

---

# 8. Trainer Document Management

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

---

### Document Status

```text
Uploaded
Pending Verification
Approved
Rejected
Expired
```

---

### Business Rules

* Expiry dates supported.
* Expired documents should generate alerts.
* Verification history retained.

---

# 9. Trainer Availability Management

## TRN-UI-005 Availability Screen

### Purpose

Define trainer working availability.

### Fields

```text
Available Days
Available From Time
Available To Time
Unavailable Dates
```

---

### Example

```text
Monday-Friday

09:00 AM
to
05:00 PM
```

---

### Business Rules

* Availability used by Scheduling Engine.
* Scheduling outside availability requires override permission.
* Unavailable dates block assignments.

---

# 10. Trainer Assignment Management

## TRN-UI-006 Assignment Screen

### Purpose

Assign trainers to courses and batches.

### Fields

```text
Trainer
Course
Batch
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
```

---

### Business Rules

* Multiple trainers per batch allowed.
* Trainer overlap validation required.
* Trainer availability validation required.

---

# 11. Trainer Course Mapping

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

---

### Business Rules

* Trainer should only be assigned to approved courses.
* Expired authorization should prevent assignment.

---

# 12. Corporate Trainer Assignment

## TRN-UI-008 Corporate Assignment

### Additional Fields

```text
Corporate Customer
Corporate Contract
Delivery Location
```

---

### Business Rules

* Corporate trainers may deliver training at customer locations.
* Corporate assignments tracked separately.

---

# 13. Trainer Performance Dashboard

## TRN-UI-009 Trainer Dashboard

### Metrics

```text
Assigned Batches
Completed Batches
Attendance Submission Rate
Student Attendance %
Completion Rate
Certificates Issued
```

---

### Future Metrics

```text
Student Feedback
Trainer Rating
```

Not in Phase 1.

---

# 14. Trainer Utilization

## TRN-UI-010 Utilization Report

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

---

### Example

```text
Available = 160 Hours

Assigned = 120 Hours

Utilization = 75%
```

---

# 15. Trainer Portal View

Phase 1 Read-Only.

Trainer may view:

```text
Assigned Courses
Assigned Batches
Timetable
Attendance Pending
Upcoming Sessions
```

---

# 16. Functional Requirements

## FR-TRN-001 Trainer Creation

The system shall allow authorized users to create trainers.

---

## FR-TRN-002 Trainer Update

The system shall allow authorized users to update trainers.

---

## FR-TRN-003 Trainer Classification

The system shall support multiple trainer types.

---

## FR-TRN-004 Qualification Tracking

The system shall track trainer qualifications.

---

## FR-TRN-005 Trainer Document Tracking

The system shall track trainer documents.

---

## FR-TRN-006 Availability Management

The system shall support trainer availability management.

---

## FR-TRN-007 Trainer Assignment

The system shall support trainer assignments.

---

## FR-TRN-008 Course Authorization

The system shall support trainer-course authorization mapping.

---

## FR-TRN-009 Corporate Trainer Assignment

The system shall support corporate trainer assignments.

---

## FR-TRN-010 Utilization Tracking

The system shall support trainer utilization reporting.

---

## FR-TRN-011 Expiry Monitoring

The system shall monitor document and certification expiry.

---

## FR-TRN-012 Trainer Audit Tracking

The system shall maintain trainer audit history.

---

# 17. Notifications

### Trainer Assigned

Notify:

```text
Trainer
Branch Manager
Coordinator
```

---

### Trainer Removed

Notify:

```text
Trainer
Branch Manager
```

---

### Certification Expiring

Notify:

```text
Trainer
Branch Manager
```

30 days before expiry.

---

### Document Expiring

Notify:

```text
Trainer
Admin
```

Configurable reminder period.

---

# 18. Reports

## Operational Reports

```text
Trainer List Report
Trainer Assignment Report
Trainer Availability Report
```

---

## Management Reports

```text
Trainer Utilization Report
Trainer Workload Report
Trainer Activity Report
```

---

## Compliance Reports

```text
Expired Certifications
Expiring Certifications
Expired Documents
Expiring Documents
```

---

## Corporate Reports

```text
Corporate Trainer Allocation Report
Corporate Delivery Report
```

---

# 19. Audit Requirements

Audit:

```text
Trainer Created
Trainer Updated
Trainer Assigned
Trainer Removed
Availability Updated
Qualification Added
Qualification Updated
Document Verified
Status Changed
```

Capture:

```text
User
Action
Timestamp
Old Value
New Value
Reason
```

---

# 20. Critical Design Decisions

### Trainer vs Employee

Recommended:

```text
Trainer
```

as primary entity.

Not:

```text
Employee
```

Reason:

Many trainers are freelance and corporate resources.

---

### Availability-Driven Scheduling

Scheduling engine should always use:

```text
Trainer Availability
```

before assigning sessions.

---

### Qualification-Based Assignment

Trainer assignment should validate:

```text
Trainer
   ↓
Authorized Course
```

before allowing assignment.

---

# 21. Integration Points

### Consumes

```text
Identity & Access
Document Management
Organization Management
```

### Provides Data To

```text
Scheduling
Attendance
Completion
Corporate Training
Reporting
Future Payroll
```
