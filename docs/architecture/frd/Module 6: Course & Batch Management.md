# Functional Requirement Document (FRD)

## Module 6: Course & Batch Management

**Version:** 1.0
**Module Code:** CRS
**Dependencies:**

* Organization Management
* Student Management
* Admission & Enrollment
* Faculty Management
* Scheduling Management
* Finance Management
* Completion Management

---

# 1. Business Purpose

Course & Batch Management is responsible for defining the institute's training offerings and organizing students into executable training batches.

The module shall support:

* Course Catalog Management
* Course Pricing Management
* Course Duration Management
* Course Completion Rules
* Batch Management
* Trainer Assignment
* Capacity Management
* Waiting List Management
* Corporate Training Programs
* Walk-In Training Programs

---

# 2. Business Hierarchy

```text
Branch
    ↓
Department
    ↓
Course
    ↓
Batch
    ↓
Enrollment
```

Example:

```text
Muscat Branch
    ↓
Safety Training
    ↓
IOSH Managing Safely
    ↓
IOSH-JAN-2026-MORNING
```

---

# 3. Course Types

The system shall support:

```text
Individual Training
Corporate Training
Weekend Batch
Fast Track Batch
One-to-One Training
Online Live Training
Walk-In Training
```

---

# 4. Course Duration Types

The system shall support:

```text
Fixed Duration
Hours Based
Sessions Based
```

Examples:

```text
30 Days
40 Hours
20 Sessions
```

---

# 5. Course Lifecycle

```text
Draft
↓
Active
↓
Inactive
↓
Archived
```

---

# 6. Batch Lifecycle

```text
Draft
↓
Open For Enrollment
↓
In Progress
↓
Completed
↓
Cancelled
```

---

# 7. Screens

## CRS-UI-001 Course List Screen

### Purpose

View and manage courses.

### Columns

```text
Course Code
Course Name
Department
Course Type
Duration Type
Duration
Status
Actions
```

### Filters

```text
Branch
Department
Course Type
Status
```

### Actions

```text
Create Course
Edit Course
Activate Course
Deactivate Course
Archive Course
View Pricing
View Batches
```

### Permissions

```text
COURSE_VIEW
COURSE_CREATE
COURSE_EDIT
COURSE_ACTIVATE
COURSE_DEACTIVATE
COURSE_ARCHIVE
```

---

## CRS-UI-002 Create / Edit Course Screen

### Section 1: Basic Information

Fields:

```text
Course Code
Course Name
Department
Description
Course Type
Status
```

### Section 2: Duration

Fields:

```text
Duration Type
Duration Value
```

Examples:

```text
Hours → 40
Sessions → 20
Days → 30
```

### Section 3: Enrollment Rules

Fields:

```text
Allow Direct Enrollment
Allow Waiting List
Allow Walk-In Completion
Allow Corporate Enrollment
```

### Section 4: Completion Rules

Fields:

```text
Completion Type
Minimum Attendance %
Exam Required
Manual Approval Required
Certificate Eligible
```

---

### Business Rules

* Course Code must be unique.
* Course Name must be unique within department.
* Inactive courses cannot accept new enrollments.
* Archived courses remain available for reporting.
* Existing enrollments remain valid even if course becomes inactive.

---

### Validations

Required:

```text
Course Code
Course Name
Department
Course Type
Duration Type
Duration Value
```

---

## CRS-UI-003 Course Pricing Screen

### Purpose

Configure pricing.

### Pricing Dimensions

```text
Branch
Customer Type
Batch Type
Currency
```

### Customer Types

```text
Individual
Corporate
Walk-In
```

### Fields

```text
Base Price
Tax Applicable
Tax Percentage
Effective Date
Expiry Date
Status
```

---

### Examples

```text
IOSH

Individual = 100 OMR

Corporate = 80 OMR

Weekend Batch = 120 OMR

Fast Track = 150 OMR
```

---

### Business Rules

* Multiple pricing versions may exist.
* Only one active pricing record per combination.
* Pricing changes should not affect existing enrollments.

---

## CRS-UI-004 Course Completion Rules Screen

### Completion Types

```text
Completion Only
Attendance Based
Exam Based
Exam + Attendance
Manual Approval
Walk-In Completion
```

### Fields

```text
Minimum Attendance %
Exam Required
Manual Approval Required
Fee Clearance Required
Certificate Eligible
```

---

### Business Rules

Certificate eligibility must evaluate:

```text
Attendance
Exam
Completion Approval
Fee Clearance
```

Based on configured rules.

---

# 8. Batch Management

## CRS-UI-005 Batch List Screen

### Columns

```text
Batch Code
Batch Name
Course
Branch
Start Date
End Date
Capacity
Current Enrollment
Status
Actions
```

### Filters

```text
Branch
Course
Status
Trainer
Date Range
```

### Actions

```text
Create Batch
Edit Batch
Open Enrollment
Close Enrollment
Assign Trainer
View Students
View Waiting List
Complete Batch
Cancel Batch
```

---

### Permissions

```text
BATCH_VIEW
BATCH_CREATE
BATCH_EDIT
BATCH_ASSIGN_TRAINER
BATCH_COMPLETE
BATCH_CANCEL
```

---

## CRS-UI-006 Create / Edit Batch Screen

### Section 1: Batch Information

Fields:

```text
Batch Code
Batch Name
Course
Branch
Start Date
End Date
Status
```

### Section 2: Capacity

Fields:

```text
Maximum Capacity
Waiting List Enabled
```

### Section 3: Trainer Assignment

Fields:

```text
Primary Trainer
Additional Trainers
```

### Section 4: Enrollment Configuration

Fields:

```text
Open Enrollment Date
Close Enrollment Date
Allow Overbooking
```

---

### Business Rules

* Batch Code must be unique.
* Batch must belong to a course.
* Batch must belong to a branch.
* Capacity must be greater than zero.
* Enrollment should stop when capacity is reached.
* Waiting list should be available if enabled.

---

# 9. Waiting List Management

## CRS-UI-007 Waiting List Screen

### Columns

```text
Student Name
Lead Name
Requested Date
Priority
Status
Actions
```

### Actions

```text
Move To Enrollment
Remove From Waiting List
```

---

### Business Rules

When a seat becomes available:

```text
First Waiting Student
       ↓
Offer Enrollment
```

Priority ordering:

```text
Requested Date
Priority
```

---

# 10. Trainer Assignment

## CRS-UI-008 Trainer Assignment Screen

### Fields

```text
Trainer
Role
Assigned From
Assigned To
```

### Trainer Roles

```text
Primary Trainer
Assistant Trainer
Guest Trainer
```

---

### Business Rules

* Multiple trainers allowed.
* Trainer availability validation required.
* Trainer cannot be assigned to overlapping batches.

---

# 11. Walk-In Training Support

The system shall support training where:

```text
Student walks in
Completes training
Receives certificate
```

without joining regular batch.

---

### Walk-In Enrollment Flow

```text
Student
   ↓
Walk-In Enrollment
   ↓
Walk-In Completion
   ↓
Certificate
```

---

### Business Rules

* Course must allow walk-in completion.
* Walk-in completion requires trainer approval.
* Walk-in completion must be auditable.

---

# 12. Corporate Training Support

The system shall support:

```text
Corporate Contract
        ↓
Corporate Program
        ↓
Corporate Batch
        ↓
Corporate Participants
```

### Additional Batch Fields

```text
Corporate Customer
Contract Reference
Delivery Location
```

---

### Business Rules

* Corporate batch may not have public enrollment.
* Corporate pricing should come from contract when available.
* Corporate participants may bypass standard lead flow.

---

# 13. Functional Requirements

## FR-CRS-001 Course Creation

The system shall allow authorized users to create courses.

---

## FR-CRS-002 Course Pricing

The system shall support multiple pricing models.

---

## FR-CRS-003 Course Completion Rules

The system shall support configurable completion rules.

---

## FR-CRS-004 Course Activation

The system shall allow courses to be activated and deactivated.

---

## FR-CRS-005 Batch Creation

The system shall allow authorized users to create batches.

---

## FR-CRS-006 Capacity Validation

The system shall prevent enrollment beyond capacity unless overbooking is allowed.

---

## FR-CRS-007 Waiting List Management

The system shall support waiting list management.

---

## FR-CRS-008 Trainer Assignment

The system shall support assigning one or more trainers.

---

## FR-CRS-009 Trainer Conflict Validation

The system shall prevent trainer scheduling conflicts.

---

## FR-CRS-010 Walk-In Training

The system shall support walk-in training completion.

---

## FR-CRS-011 Corporate Batch Support

The system shall support corporate-specific batches.

---

## FR-CRS-012 Pricing Versioning

The system shall preserve historical pricing.

---

## FR-CRS-013 Completion Rule Evaluation

The system shall evaluate completion eligibility using configured rules.

---

# 14. Notifications

### Batch Created

Notify:

```text
Branch Manager
Academic Coordinator
```

---

### Trainer Assigned

Notify:

```text
Assigned Trainer
Branch Manager
```

---

### Capacity Reached

Notify:

```text
Admissions Team
Branch Manager
```

---

### Waiting List Available

Notify:

```text
Admissions Team
```

---

# 15. Reports

## Course Reports

```text
Course Catalog Report
Course Pricing Report
Course Popularity Report
Course Profitability Report
```

---

## Batch Reports

```text
Batch Capacity Report
Batch Utilization Report
Batch Completion Report
Batch Trainer Report
```

---

## Waiting List Reports

```text
Waiting List Summary
Course Demand Report
```

---

## Corporate Reports

```text
Corporate Program Report
Corporate Batch Report
Corporate Enrollment Report
```

---

# 16. Audit Requirements

Audit:

```text
Course Created
Course Updated
Pricing Changed
Completion Rule Changed
Batch Created
Batch Updated
Trainer Assigned
Trainer Removed
Batch Completed
Batch Cancelled
Walk-In Completion Approved
```

Each audit record shall capture:

```text
User
Action
Timestamp
Old Value
New Value
Reason
```

---

# 17. Critical Design Decisions

### Course Versioning

Future support:

```text
IOSH v1
IOSH v2
```

Not required in Phase 1.

---

### Batch Cloning

Future support:

```text
Clone Existing Batch
```

Not required in Phase 1.

---

### Dynamic Batch Naming

Recommended for Phase 1:

```text
<CourseCode>-<Month>-<Year>-<Shift>

Example:

IOSH-JAN-2026-MORNING
```

---

# 18. Integration Points

### Consumes

```text
Organization Management
Trainer Management
Corporate Training
```

### Provides Data To

```text
Enrollment
Scheduling
Attendance
Finance
Completion
Certificates
Reporting
```
