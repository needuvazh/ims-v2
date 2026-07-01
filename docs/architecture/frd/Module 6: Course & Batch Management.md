# Functional Requirement Document

## Module 6: Course & Batch Management

**Version:** 1.2
**Module Code:** CRS
**Phase:** Phase 1
**Owned Bounded Context:** Course & Batch Management

**Dependencies:**

* Organization Management
* Admission & Enrollment Management
* Faculty / Trainer Management
* Scheduling & Timetable Management
* Fee & Finance Management

**Provides Data To:**

* Admission & Enrollment Management
* Scheduling & Timetable Management
* Attendance Management
* Fee & Finance Management
* Exam, Result & Completion Management
* Certificate Management
* Corporate Training Management
* Walk-In Enrollment & Completion Flow
* Reporting & Dashboards
* Audit & Compliance

---

# 1. Business Purpose

Course & Batch Management defines the training catalog and the executable delivery structure used across IMS.

The context owns course definitions, pricing versions, course completion rules, batches, trainer assignment rules, capacity rules, and waiting list behavior.

Course & Batch rules are consumed by enrollment, scheduling, attendance, completion, and certificate workflows, but they are not owned by those modules.

---

# 2. Scope

## 2.1 In Scope

* Course catalog management
* Course effective dating
* Course activation and archival
* Course pricing management
* Course completion rule management
* Batch creation and lifecycle management
* Batch capacity management
* Batch enrollment opening and closing
* Waiting list management
* Trainer assignment to batches
* Course and batch lookup views
* Corporate-specific and walk-in-specific batch configuration support

## 2.2 Out of Scope for Phase 1

* Corporate contract ownership
* Enrollment ownership
* Attendance ownership
* Completion approval ownership
* Certificate ownership

---

# 3. Business Principles

* A course defines what is taught.
* A batch defines how, when, and where a course is delivered.
* A batch belongs to exactly one course and one branch.
* A course belongs to exactly one department and is defined globally.
* Pricing may vary by branch, customer type, batch type, and currency.
* Completion rules are defined at course level and inherited by batches.
* Historical pricing and historical completion rules must remain preserved.
* Existing enrollments must not be retroactively changed by pricing or course updates.
* Inactive courses cannot accept new batches or enrollments.
* Inactive batches cannot be used for new enrollment actions.
* Waiting list is used only when capacity is reached and waiting list is enabled.
* Trainer assignment must prevent overlapping batch assignments.
* Walk-in completion is allowed only when the course explicitly permits it.
* Corporate and walk-in delivery can use the same course and batch structures, but they do not own separate lifecycles here.

---

# 4. Owned Concepts

The Course & Batch context owns:

* Course
* CoursePricing
* CourseCompletionRule
* Batch
* BatchTrainer
* WaitingListEntry

Notes:

* Pricing is versioned by effective dates.
* Completion rule changes must not retroactively alter completed enrollments.
* Other contexts may reference `CourseId` and `BatchId`, but they must not own course or batch lifecycle rules.

---

# 5. Business Model

## 5.1 Course Classification

The system shall support configurable course classifications and delivery patterns.

Examples:

```text
Individual Training
Corporate Training
Weekend Batch
Fast Track Batch
One-to-One Training
Online Live Training
Walk-In Training
```

Rules:

* Course classification is a planning and pricing attribute.
* Course classification must not create separate lifecycle models.
* Batch type and customer type may be used as pricing dimensions.

## 5.2 Course Duration Types

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

## 5.3 Course Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
  ↓
Archived
```

Rules:

* Draft courses are not available for new enrollments.
* Active courses may accept new batches and enrollments.
* Inactive courses remain searchable for history.
* Archived courses remain available for reporting only.
* A course can be offered only when the current date is within the effective date range or effective end date is null.

## 5.4 Course Pricing Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
```

Rules:

* Only one active pricing record is allowed per course, branch, customer type, batch type, and currency combination.
* Pricing changes must not affect existing enrollments.
* Historical pricing must be preserved.

## 5.5 Course Completion Rule Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
```

Rules:

* Only one active completion rule per course is allowed.
* Completion rules must be evaluated by downstream completion and certificate modules.
* Completion rule changes must not retroactively affect completed enrollments.

## 5.6 Batch Lifecycle

```text
Draft
  ↓
Open For Enrollment
  ↓
In Progress
  ↓
Completed
```

Alternative:

```text
Draft
  ↓
Cancelled
```

Rules:

* Open For Enrollment is required before new enrollments may be accepted.
* In Progress indicates delivery has started.
* Completed batches are historical records.
* Cancelled batches remain visible historically.
* Batch capacity must be enforced before enrollment confirmation.

## 5.7 Waiting List Lifecycle

```text
Requested
  ↓
Waiting
  ↓
Promoted
  ↓
Closed
```

Rules:

* Waiting list entries preserve request order unless authorized prioritization is allowed.
* Promotion to enrollment must revalidate batch capacity.

---

# 6. Screens

## CRS-UI-001 Course List Screen

### Purpose

View and manage courses.

### Columns

```text
Course Code
Course Name
Department
Branch
Course Classification
Duration Type
Duration
Status
Actions
```

### Filters

```text
Branch
Department
Course Classification
Status
Search
```

### Actions

```text
Create Course
View Course
Edit Course
Activate Course
Deactivate Course
Archive Course
View Pricing
View Completion Rules
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

### Sections

#### Section 1: Basic Information

```text
Course Code
Course Name
Department
Branch
Description
Course Classification
Status
```

#### Section 2: Duration

```text
Duration Type
Duration Value
```

#### Section 3: Enrollment Rules

```text
Allow Direct Enrollment
Allow Waiting List
Allow Walk-In Completion
Allow Corporate Enrollment
```

#### Section 4: Completion Rules

```text
Completion Type
Minimum Attendance %
Exam Required
Manual Approval Required
Certificate Eligible
```

### Business Rules

* Course code must be unique.
* Course name must be unique within branch and department scope.
* Course must belong to an active branch and active department.
* Inactive courses cannot accept new enrollments.
* Archived courses remain available for reports.
* Existing enrollments remain valid if course becomes inactive.
* Course changes must not alter completed enrollments.

### Validations

* Course Code is required.
* Course Name is required.
* Department is required.
* Branch is required.
* Course Classification is required.
* Duration Type is required.
* Duration Value is required.
* Duration Value must be greater than zero.

---

## CRS-UI-003 Course Pricing Screen

### Purpose

Configure versioned pricing for a course.

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
Effective Start Date
Effective End Date
Status
```

### Business Rules

* Multiple pricing versions may exist.
* Only one active pricing record is allowed per pricing combination.
* Pricing changes must not affect existing enrollments.
* Historical pricing must be preserved.

---

## CRS-UI-004 Course Completion Rules Screen

### Purpose

Configure completion rules for a course.

### Fields

```text
Completion Type
Minimum Attendance %
Exam Required
Manual Approval Required
Fee Clearance Required
Certificate Eligible
Status
Effective Start Date
Effective End Date
```

### Business Rules

* Only one active completion rule per course is allowed.
* Completion rule changes must not retroactively affect completed enrollments.
* Completion rules are consumed by completion and certificate modules.

---

## CRS-UI-005 Batch List Screen

### Purpose

View and manage batches.

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
Search
```

### Actions

```text
Create Batch
View Batch
Edit Batch
Open Enrollment
Close Enrollment
Assign Trainer
View Students
View Waiting List
Complete Batch
Cancel Batch
```

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

### Sections

#### Section 1: Batch Information

```text
Batch Code
Batch Name
Course
Branch
Start Date
End Date
Status
```

#### Section 2: Capacity

```text
Maximum Capacity
Waiting List Enabled
```

#### Section 3: Trainer Assignment

```text
Primary Trainer
Additional Trainers
```

#### Section 4: Enrollment Configuration

```text
Open Enrollment Date
Close Enrollment Date
Allow Overbooking
```

### Business Rules

* Batch code must be unique.
* Batch must belong to an active course.
* Batch must belong to an active branch.
* Capacity must be greater than zero.
* Enrollment should stop when capacity is reached unless overbooking is explicitly allowed.
* Waiting list should be available if enabled.
* Batch changes must not invalidate historical attendance or completion records.

### Validations

* Batch Code is required.
* Batch Name is required.
* Course is required.
* Branch is required.
* Start Date is required.
* End Date is required.
* Capacity is required.

---

## CRS-UI-007 Waiting List Screen

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

## CRS-UI-008 Trainer Assignment Screen

### Purpose

Assign trainers to batches.

### Fields

```text
Batch
Trainer
Role
Assigned From
Assigned To
Assignment Type
```

### Trainer Roles

```text
Primary
Assistant
Observer
Corporate Trainer
Walk-In Trainer
```

### Business Rules

* Trainer assignment must respect trainer availability.
* Trainer assignment must prevent overlapping batch assignments.
* Trainer assignment changes must be auditable.

---

## CRS-UI-009 Course and Batch Lookup

### Purpose

Provide lookup views for downstream modules.

### Lookups

```text
Active Courses
Open Batches
Course Pricing
Completion Rules
Waiting List Availability
```

---

# 7. Functional Requirements

## FR-CRS-001 Create Course

The system shall allow authorized users to create courses.

## FR-CRS-002 Update Course

The system shall allow authorized users to update courses.

## FR-CRS-003 Activate or Deactivate Course

The system shall allow authorized users to activate or deactivate courses.

## FR-CRS-004 Archive Course

The system shall allow authorized users to archive courses.

## FR-CRS-005 Manage Course Pricing

The system shall allow authorized users to manage versioned course pricing.

## FR-CRS-006 Manage Completion Rules

The system shall allow authorized users to manage course completion rules.

## FR-CRS-007 Create Batch

The system shall allow authorized users to create batches.

## FR-CRS-008 Update Batch

The system shall allow authorized users to update batches.

## FR-CRS-009 Open Batch for Enrollment

The system shall allow authorized users to open batches for enrollment.

## FR-CRS-010 Close Batch Enrollment

The system shall allow authorized users to close batch enrollment.

## FR-CRS-011 Complete Batch

The system shall allow authorized users to mark batches as completed.

## FR-CRS-012 Cancel Batch

The system shall allow authorized users to cancel batches.

## FR-CRS-013 Validate Capacity

The system shall prevent enrollment beyond batch capacity unless overbooking is explicitly allowed.

## FR-CRS-014 Manage Waiting List

The system shall support waiting list entry, promotion, and removal.

## FR-CRS-015 Assign Trainers

The system shall allow authorized users to assign trainers to batches.

## FR-CRS-016 Validate Trainer Conflicts

The system shall prevent overlapping trainer assignments.

## FR-CRS-017 Support Walk-In Completion

The system shall allow courses to explicitly permit walk-in completion.

## FR-CRS-018 Support Corporate Batch Configuration

The system shall support corporate-specific batch configuration without creating a separate lifecycle model.

## FR-CRS-019 Preserve Historical Pricing

The system shall preserve historical pricing records.

## FR-CRS-020 Preserve Historical Completion Rules

The system shall preserve historical completion rule records.

---

# 8. Audit Events

The following audit events shall be supported:

```text
CourseCreated
CourseUpdated
CourseActivated
CourseDeactivated
CourseArchived
CoursePricingCreated
CoursePricingUpdated
CourseCompletionRuleCreated
CourseCompletionRuleUpdated
BatchCreated
BatchUpdated
BatchOpenedForEnrollment
BatchClosedForEnrollment
BatchCompleted
BatchCancelled
TrainerAssignedToBatch
TrainerRemovedFromBatch
WaitingListEntryCreated
WaitingListEntryPromoted
```

Rules:

* Course, pricing, rule, batch, trainer assignment, and waiting list changes must be auditable.
* Historical pricing and completion rules must retain the actor and effective date changes.

---

# 9. Domain Errors

The module shall distinguish between validation and business-rule errors such as:

```text
CourseCodeAlreadyExists
CourseNameAlreadyExists
CourseInactive
CourseArchived
BatchCodeAlreadyExists
BatchInactive
BatchNotOpenForEnrollment
BatchCapacityExceeded
WaitingListNotEnabled
TrainerConflictDetected
TrainerAvailabilityViolation
InvalidPricingCombination
MultipleActivePricingRecords
MultipleActiveCompletionRules
InvalidEffectiveDateRange
WalkInCompletionNotAllowed
```

---

# 10. Reporting and Operational Views

The Course & Batch context shall support the following read views:

```text
Course List
Batch List
Batch Capacity Summary
Waiting List Summary
Trainer Assignment Summary
Course Pricing History
Completion Rule History
```

These are read models and operational views, not separate owned entities.

---

# 11. FRD Improvement Notes

This module should remain the single source of truth for:

* course catalog
* versioned pricing
* completion rules
* batch lifecycle
* waiting list behavior
* trainer assignment rules
* walk-in completion enablement

It should not own admissions, enrollments, attendance, completion approval, or certificates.
