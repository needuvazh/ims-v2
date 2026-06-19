# Functional Requirement Document

## Module 2: Organization Management

**Version:** 1.1
**Module Code:** ORG
**Phase:** Phase 1
**Owned Bounded Context:** Organization Management

**Dependencies:**

* Identity & Access Management

**Provides Data To:**

* Lead & Inquiry Management
* Admission & Enrollment Management
* Course & Batch Management
* Scheduling & Timetable Management
* Attendance Management
* Fee & Finance Management
* Faculty / Trainer Management
* Exam, Result & Completion Management
* Certificate Management
* Document Management
* Reporting & Dashboards
* Audit & Compliance
* Identity & Access Management

---

# 1. Business Purpose

Organization Management defines the institute structure and operational partitioning used by all other domains.

The context owns the institute hierarchy and the reference integrity for branch-based operational data.

The module shall support:

* Single institute profile management
* Branch management
* Department management
* Classroom management
* Organization hierarchy visualization
* Effective dating for master records
* Historical reporting support

---

# 2. Scope

## 2.1 In Scope

* Institute profile
* Branch lifecycle management
* Department lifecycle management
* Classroom lifecycle management
* Branch manager reference assignment
* Organization hierarchy view
* Effective dating
* Historical reference preservation
* Reference integrity for operational modules

## 2.2 Out of Scope for Phase 1

* Multi-institute support
* Tenant administration
* Franchise or SaaS hierarchy
* Campus-level monetization rules

---

# 3. Business Principles

* Phase 1 shall have a single institute record.
* A branch may have many departments and classrooms.
* A department belongs to exactly one branch.
* A classroom belongs to exactly one branch.
* Operational records from other modules must reference a branch.
* Historical references must remain available after deactivation.
* Inactive organizational records must not be used for new operational transactions.
* Organization data is master data and must not be hard deleted if referenced by other modules.

---

# 4. Owned Concepts

The Organization context owns:

* Institute
* Branch
* Department
* Classroom

Notes:

* `BranchManagerId` is only a reference to an IAM user.
* The branch-manager access policy is owned by IAM, not by this context.
* Other contexts may store `BranchId` as a foreign reference, but they must not own branch lifecycle rules.

---

# 5. Organization Structure

The system shall support the following hierarchy:

```text
Institute
 └── Branch
      ├── Department
      └── Classroom
```

Operational modules may reference the branch directly and may reference the department when departmental ownership matters.

---

# 6. Lifecycle Rules

## 6.1 Institute Lifecycle

```text
Active
  ↓
Inactive
```

## 6.2 Branch Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
```

## 6.3 Department Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
```

## 6.4 Classroom Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
```

Rules:

* Inactive organizational records remain searchable for history and audit.
* Inactive branches must not accept new admissions, enrollments, batches, schedules, or other new operational work.
* Inactive departments must not be used to create new course ownership records where department ownership is required.
* Inactive classrooms must not be used in new schedule creation.

---

# 7. Screens

## ORG-UI-001 Institute Profile Screen

### Purpose

Maintain institute-level information.

### Fields

```text
Institute Name
Institute Code
Registration Number
Tax Number
Primary Email
Primary Phone
Website
Address
Country
Status
```

### Actions

```text
View
Edit
Save
```

### Permissions

```text
INSTITUTE_VIEW
INSTITUTE_EDIT
```

### Business Rules

* Phase 1 shall maintain a single institute profile.
* Institute code must be unique.
* Institute cannot be deleted.
* Institute profile changes must be audited.

---

## ORG-UI-002 Branch List Screen

### Purpose

View and manage branches.

### Columns

```text
Branch Code
Branch Name
City
Phone
Email
Status
Actions
```

### Filters

```text
Status
City
Search
```

### Actions

```text
Create Branch
View Branch
Edit Branch
Activate
Deactivate
```

### Permissions

```text
BRANCH_VIEW
BRANCH_CREATE
BRANCH_EDIT
BRANCH_DEACTIVATE
```

---

## ORG-UI-003 Create / Edit Branch Screen

### Fields

```text
Institute
Branch Name
Branch Code
Address
City
Country
Phone
Email
Branch Manager
Status
Effective Start Date
Effective End Date
```

### Business Rules

* Branch belongs to the institute.
* Branch code must be unique within the institute.
* Branch manager may be assigned as a reference to an IAM user.
* Inactive branches should not be available for new admissions, batches, schedules, or enrollments.
* Historical records must remain available for reporting and audit.
* Branch changes must be audited.

### Validations

* Branch Name is required.
* Branch Code is required.
* Country is required.
* Email must be valid if provided.
* Effective End Date cannot be earlier than Effective Start Date.

---

## ORG-UI-004 Department List Screen

### Purpose

View and manage departments.

### Columns

```text
Department Code
Department Name
Branch
Department Head
Status
Actions
```

### Filters

```text
Branch
Status
Search
```

### Actions

```text
Create Department
View Department
Edit Department
Activate
Deactivate
```

### Permissions

```text
DEPARTMENT_VIEW
DEPARTMENT_CREATE
DEPARTMENT_EDIT
DEPARTMENT_DEACTIVATE
```

---

## ORG-UI-005 Create / Edit Department Screen

### Fields

```text
Branch
Department Name
Department Code
Department Head
Description
Status
Effective Start Date
Effective End Date
```

### Business Rules

* Department belongs to a branch.
* Department code must be unique within a branch.
* Department head may be assigned as a reference to an IAM user.
* Inactive departments should not allow new course ownership where department ownership is required.
* Department changes must be audited.

### Validations

* Branch is required.
* Department Name is required.
* Department Code is required.
* Effective End Date cannot be earlier than Effective Start Date.

---

## ORG-UI-006 Classroom List Screen

### Purpose

View and manage classrooms.

### Columns

```text
Classroom Name
Branch
Capacity
Location
Status
Actions
```

### Filters

```text
Branch
Status
Search
```

### Actions

```text
Create Classroom
View Classroom
Edit Classroom
Activate
Deactivate
```

### Permissions

```text
CLASSROOM_VIEW
CLASSROOM_CREATE
CLASSROOM_EDIT
CLASSROOM_DEACTIVATE
```

---

## ORG-UI-007 Create / Edit Classroom Screen

### Fields

```text
Branch
Classroom Name
Capacity
Location
Status
Effective Start Date
Effective End Date
```

### Business Rules

* Classroom belongs to a branch.
* Classroom capacity shall be used by scheduling conflict and room allocation rules.
* Inactive classrooms should not be available for new sessions.
* Classroom changes must be audited.

### Validations

* Branch is required.
* Classroom Name is required.
* Capacity must be greater than zero.
* Effective End Date cannot be earlier than Effective Start Date.

---

## ORG-UI-008 Organization Hierarchy View

### Purpose

Provide a visual representation of the institute structure.

### Display

```text
Institute
 └── Branches
      ├── Departments
      └── Classrooms
```

### Actions

```text
Expand
Collapse
View Details
Navigate to Entity
```

### Permissions

```text
ORGANIZATION_VIEW
```

---

# 8. Functional Requirements

## FR-ORG-001 Institute Management

The system shall maintain a single institute profile for Phase 1.

## FR-ORG-002 Branch Management

The system shall allow authorized users to create, update, activate, and deactivate branches.

## FR-ORG-003 Department Management

The system shall allow authorized users to manage departments under branches.

## FR-ORG-004 Classroom Management

The system shall allow authorized users to manage classrooms under branches.

## FR-ORG-005 Organization Hierarchy

The system shall maintain the hierarchy of Institute → Branch → Department → Classroom.

## FR-ORG-006 Effective Dating

The system shall support effective start date and effective end date for branches, departments, and classrooms.

## FR-ORG-007 Historical Reporting

The system shall preserve historical records even if organizational entities become inactive.

## FR-ORG-008 Branch Ownership

The system shall require operational records to be associated with a branch.

## FR-ORG-009 Organizational Reference Integrity

The system shall prevent deletion of organizational entities that are referenced by operational records.

## FR-ORG-010 Organizational Structure View

The system shall provide a hierarchical view of the organization structure.

## FR-ORG-011 Branch Manager Reference

The system shall allow branches to reference a branch manager user from IAM.

---

# 9. Audit Events

The following audit events shall be supported:

```text
InstituteUpdated
BranchCreated
BranchUpdated
BranchActivated
BranchDeactivated
DepartmentCreated
DepartmentUpdated
DepartmentActivated
DepartmentDeactivated
ClassroomCreated
ClassroomUpdated
ClassroomActivated
ClassroomDeactivated
BranchManagerAssigned
```

Rules:

* All institute and hierarchy changes must be auditable.
* Audit records must retain the actor, timestamp, and change reason where applicable.

---

# 10. Domain Errors

The module shall distinguish between validation and business-rule errors such as:

```text
InstituteAlreadyExists
BranchCodeAlreadyExists
DepartmentCodeAlreadyExists
ClassroomNameAlreadyExists
BranchCannotBeDeleted
ReferencedOrganizationCannotBeDeleted
InactiveBranchCannotBeUsed
InactiveDepartmentCannotBeUsed
InactiveClassroomCannotBeUsed
InvalidEffectiveDateRange
```

---

# 11. Reporting and Operational Views

The Organization context shall support the following read views:

```text
Institute Profile
Branch List
Department List
Classroom List
Organization Hierarchy
```

These are read models and operational views, not separate owned entities.

---

# 12. FRD Improvement Notes

This module should remain the single source of truth for:

* institute structure
* branch ownership
* department ownership
* classroom ownership
* effective dating
* branch reference integrity

It should not contain user authorization rules, lead ownership rules, or course-specific scheduling logic.
