# 6. Module 2: Organization Management

## 6.1 Business Purpose

Based on the DDD model, Organization Management is the master domain responsible for defining the institute hierarchy and operational structure used by all other domains.

The organization hierarchy provides the ownership and data-partitioning structure for:

* Users
* Leads
* Admissions
* Students
* Courses
* Batches
* Schedules
* Attendance
* Finance
* Faculty
* Reports

The hierarchy shall support:

```text
Institute
 └── Branch
      └── Department
           └── Classroom
```

All operational records must belong to a branch and may optionally belong to a department depending on the business process.

---

## 6.2 Organization Hierarchy

### Organization Structure

The system shall support the following hierarchy:

```text
Institute
 ├── Branch A
 │    ├── Academic Department
 │    ├── Finance Department
 │    ├── Sales Department
 │    └── Classrooms
 │
 ├── Branch B
 │    ├── Academic Department
 │    ├── Finance Department
 │    └── Classrooms
 │
 └── Branch C
```

### Hierarchy Rules

* One Institute can have multiple Branches.
* One Branch can have multiple Departments.
* One Branch can have multiple Classrooms.
* Departments belong to a single Branch.
* Classrooms belong to a single Branch.
* Courses, Batches, Faculty, Students, Leads, and Enrollments must reference a Branch.
* Branch deactivation must not affect historical records.
* Historical hierarchy references must remain available for reporting and auditing.

---

## 6.3 Screens

### ORG-UI-001 Institute Profile Screen

Purpose: Maintain institute-level information.

Fields:

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

Actions:

```text
View
Edit
Save
```

Permissions:

```text
INSTITUTE_VIEW
INSTITUTE_EDIT
```

Business Rules:

* Single institute record for Phase 1.
* Institute code must be unique.
* Institute cannot be deleted.

---

### ORG-UI-002 Branch List Screen

Columns:

```text
Branch Code
Branch Name
City
Phone
Email
Status
Actions
```

Actions:

```text
Create Branch
View Branch
Edit Branch
Activate
Deactivate
```

Filters:

```text
Status
City
```

Permissions:

```text
BRANCH_VIEW
BRANCH_CREATE
BRANCH_EDIT
BRANCH_DEACTIVATE
```

---

### ORG-UI-003 Create / Edit Branch Screen

Fields:

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

Business Rules:

* Branch belongs to the Institute.
* Branch code must be unique.
* Branch manager may be assigned.
* Inactive branches should not be available for new admissions, batches, schedules, or enrollments.
* Existing historical records must remain available for reporting.

Validations:

* Branch Name is required.
* Branch Code is required.
* Country is required.
* Email must be valid if provided.

---

### ORG-UI-004 Department List Screen

Columns:

```text
Department Code
Department Name
Branch
Department Head
Status
Actions
```

Actions:

```text
Create Department
View Department
Edit Department
Activate
Deactivate
```

Filters:

```text
Branch
Status
```

Permissions:

```text
DEPARTMENT_VIEW
DEPARTMENT_CREATE
DEPARTMENT_EDIT
DEPARTMENT_DEACTIVATE
```

---

### ORG-UI-005 Create / Edit Department Screen

Fields:

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

Business Rules:

* Department belongs to a branch.
* Department code must be unique within a branch.
* Department head may be assigned.
* Inactive departments should not allow new course creation where department ownership is required.

---

### ORG-UI-006 Classroom List Screen

Columns:

```text
Classroom Name
Branch
Capacity
Location
Status
Actions
```

Actions:

```text
Create Classroom
Edit Classroom
Activate
Deactivate
```

Filters:

```text
Branch
Status
```

Permissions:

```text
CLASSROOM_VIEW
CLASSROOM_CREATE
CLASSROOM_EDIT
CLASSROOM_DEACTIVATE
```

---

### ORG-UI-007 Create / Edit Classroom Screen

Fields:

```text
Branch
Classroom Name
Capacity
Location
Status
Effective Start Date
Effective End Date
```

Business Rules:

* Classroom belongs to a branch.
* Classroom capacity should be used during schedule planning.
* Inactive classrooms should not be available for new sessions.

---

### ORG-UI-008 Organization Hierarchy View

Purpose: Visual representation of the institute structure.

Display:

```text
Institute
 └── Branches
      └── Departments
           └── Classrooms
```

Actions:

```text
Expand
Collapse
View Details
Navigate to Entity
```

Permissions:

```text
ORGANIZATION_VIEW
```

---

## 6.4 Functional Requirements

### FR-ORG-001 Institute Management

The system shall maintain a single institute profile for the implementation.

### FR-ORG-002 Branch Management

The system shall allow authorized users to create, update, activate, and deactivate branches.

### FR-ORG-003 Department Management

The system shall allow authorized users to manage departments under branches.

### FR-ORG-004 Classroom Management

The system shall allow authorized users to manage classrooms under branches.

### FR-ORG-005 Organization Hierarchy

The system shall maintain the hierarchy of Institute → Branch → Department → Classroom.

### FR-ORG-006 Effective Dating

The system shall support effective start date and effective end date for branches, departments, and classrooms.

### FR-ORG-007 Historical Reporting

The system shall preserve historical records even if institute entities become inactive.

### FR-ORG-008 Branch Ownership

The system shall require operational records to be associated with a branch.

### FR-ORG-009 Organizational Reference Integrity

The system shall prevent deletion of organizational entities that are referenced by operational records.

### FR-ORG-010 Organizational Structure View

The system shall provide a hierarchical view of the organization structure.

---
