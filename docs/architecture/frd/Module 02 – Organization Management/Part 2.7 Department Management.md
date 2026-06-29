This is another place where I'd recommend improving the original design.

## Architectural Recommendation

In many training institutes, a **Department** is often treated as just a lookup table. I don't think that's sufficient for ASTI.

A Department should be the **academic owner** of courses and trainers, not merely a grouping mechanism.

Instead of:

```text
Branch
   └── Department
```

I recommend:

```text
Organization
        │
        ▼
Department
        │
        ├── Courses
        ├── Trainers
        ├── Academic Coordinators
        ├── Course Categories
        └── Reports
```

A department can operate across multiple branches.

Example:

```text
Safety Training Department

      ├── Muscat Branch
      ├── Sohar Branch
      └── Salalah Branch
```

instead of creating three separate "Safety" departments.

This significantly reduces duplicate master data.

---

# Module 02.7 — Department Management

**Module Code:** `ORG-DEPT`

**Version:** 3.0

**Bounded Context:** Organization Management

**Priority:** High (Foundation Module)

**Dependencies**

* Organization Management
* Branch Management

**Dependent Modules**

* Course Management
* Trainer Management
* Student Management
* Reporting
* Website

---

# 1. Purpose

Department Management defines the academic and operational divisions responsible for delivering training programs.

Departments provide ownership of:

* Courses
* Trainers
* Academic Coordinators
* Learning Programs
* Academic Reports

Unlike branches, departments represent **business functions**, not physical locations.

---

# 2. Business Objectives

The system shall allow administrators to:

* Create departments
* Assign departments to one or more branches
* Organize courses
* Assign trainers
* Assign department coordinators
* Track department performance
* Configure department visibility

---

# 3. Scope

## Included

* Department master
* Department hierarchy
* Branch assignment
* Department coordinators
* Department status
* Department reporting

## Excluded

* Course creation
* Trainer creation
* Batch management
* Scheduling

---

# 4. Actors

| Actor                | Responsibility               |
| -------------------- | ---------------------------- |
| Super Admin          | Full control                 |
| Organization Admin   | Manage departments           |
| Branch Manager       | View assigned departments    |
| Academic Coordinator | Manage department operations |
| Trainer              | View department information  |
| Reporting User       | Department reports           |

---

# 5. Business Capabilities

1. Department Registration
2. Multi-Branch Assignment
3. Academic Ownership
4. Coordinator Assignment
5. Department Status Management
6. Department Search
7. Department Performance Reporting
8. Department Audit

---

# 6. Aggregate Design

## Aggregate Root

```text
Department
```

## Child Entities

```text
DepartmentBranch
DepartmentCoordinator
DepartmentAudit
```

---

# 7. Entity Model

```text
Organization
        │
        ▼
Department
        │
        ├── Branch Assignment
        ├── Coordinator
        ├── Courses
        ├── Trainers
        └── Audit
```

---

# 8. Department Lifecycle

```text
Draft
   ↓
Active
   ├── Inactive
   ↓
Archived
```

---

# 9. Functional Requirements

## ORG-DEPT-001 — Create Department

The system shall allow administrators to create a department.

### Fields

* Department Code
* Department Name (English)
* Department Name (Arabic)
* Description
* Parent Department (optional)
* Status

### Business Rules

* Department Code must be unique.
* Department Name is mandatory.
* Parent Department is optional.

---

## ORG-DEPT-002 — Assign Branches

A department may be assigned to one or more branches.

Example:

```text
Safety Training

✓ Muscat

✓ Sohar

✓ Salalah
```

Business Rules

* Branches must belong to the same organization.
* Duplicate assignments are not allowed.

---

## ORG-DEPT-003 — Assign Academic Coordinator

Assign one or more coordinators.

Coordinator responsibilities:

* Course planning
* Trainer allocation
* Academic monitoring
* Completion approval

One coordinator may be marked as Primary.

---

## ORG-DEPT-004 — Configure Department Profile

Allow updating:

* Description
* Public description
* Vision
* Objectives
* Contact information

---

## ORG-DEPT-005 — Activate Department

Activation requires:

* At least one assigned branch.
* At least one coordinator.
* Complete profile.

---

## ORG-DEPT-006 — Deactivate Department

Effects:

* No new courses may be created.
* Existing courses remain operational.
* Historical data is preserved.

---

## ORG-DEPT-007 — Archive Department

Allowed only when:

* No active courses exist.
* No active trainers are assigned.
* No pending approvals exist.

---

## ORG-DEPT-008 — Search Departments

Search by:

* Code
* Name
* Branch
* Coordinator
* Status

---

## ORG-DEPT-009 — Department Dashboard

Display:

* Total Courses
* Active Trainers
* Active Batches
* Student Count
* Completion Rate
* Revenue
* Trainer Utilization

---

# 10. Business Rules

| ID          | Rule                                                                   |
| ----------- | ---------------------------------------------------------------------- |
| BR-DEPT-001 | Department Code must be unique.                                        |
| BR-DEPT-002 | Department belongs to one organization.                                |
| BR-DEPT-003 | Department may be assigned to multiple branches.                       |
| BR-DEPT-004 | Department must have at least one branch before activation.            |
| BR-DEPT-005 | One Primary Academic Coordinator is required for an active department. |
| BR-DEPT-006 | Department cannot be deleted; only archived.                           |
| BR-DEPT-007 | Archived departments are read-only.                                    |
| BR-DEPT-008 | Courses belong to one department.                                      |
| BR-DEPT-009 | Trainers may belong to multiple departments.                           |
| BR-DEPT-010 | Parent department cannot create circular hierarchies.                  |

---

# 11. Workflow

```text
Create Department
        ↓
Configure Profile
        ↓
Assign Branches
        ↓
Assign Coordinator
        ↓
Activate Department
        ↓
Create Courses
        ↓
Assign Trainers
```

---

# 12. Screen Specifications

## Department List

### Columns

* Department Code
* Department Name
* Assigned Branches
* Primary Coordinator
* Total Courses
* Total Trainers
* Status

### Filters

* Branch
* Status
* Coordinator

### Actions

* View
* Edit
* Activate
* Deactivate
* Archive

---

## Department Details

Tabs:

1. General Information
2. Branch Assignments
3. Coordinators
4. Courses
5. Trainers
6. Performance Dashboard
7. Audit History

---

## Department Dashboard

Displays:

* Course portfolio
* Student enrollment
* Batch statistics
* Revenue summary
* Completion rate
* Trainer utilization

---

# 13. Validation Rules

* Department Code is mandatory.
* Department Name is mandatory.
* At least one branch must be assigned before activation.
* Primary coordinator is required for active departments.
* Circular parent-child relationships are not allowed.

---

# 14. Permissions Matrix

| Permission          | Super Admin | Org Admin | Branch Manager | Academic Coordinator    |
| ------------------- | ----------- | --------- | -------------- | ----------------------- |
| View Department     | ✓           | ✓         | ✓              | ✓                       |
| Create Department   | ✓           | ✓         | ✗              | ✗                       |
| Edit Department     | ✓           | ✓         | ✗              | ✓ (assigned department) |
| Assign Branches     | ✓           | ✓         | ✗              | ✗                       |
| Assign Coordinator  | ✓           | ✓         | ✗              | ✗                       |
| Activate Department | ✓           | ✓         | ✗              | ✗                       |
| Archive Department  | ✓           | ✗         | ✗              | ✗                       |

---

# 15. Notifications

Generate in-app notifications for:

* Department created
* Department activated
* Coordinator assigned
* Branch assignment changed
* Department archived

Notify assigned coordinators when:

* They are assigned or removed.
* A department is activated.
* A new course is assigned to their department.

---

# 16. Audit Requirements

Audit changes to:

* Department profile
* Branch assignments
* Coordinator assignments
* Status changes
* Archive actions

Each audit record must include:

* User
* Timestamp
* Previous value
* New value
* Reason
* Organization context

---

# 17. Reports

* Department Directory
* Department Performance Report
* Department Course Portfolio
* Department Trainer Allocation
* Student Distribution by Department
* Revenue by Department

---

# 18. Dashboard Widgets

* Total Departments
* Active Departments
* Courses per Department
* Trainers per Department
* Students per Department
* Department Revenue
* Department Completion Rate

---

# 19. Domain Events

```text
DepartmentCreated
DepartmentUpdated
DepartmentActivated
DepartmentDeactivated
DepartmentArchived
DepartmentBranchAssigned
DepartmentCoordinatorAssigned
DepartmentCoordinatorRemoved
```

---

# 20. Database Mapping

## Aggregate Root

```text
Department
```

## Suggested Tables

```text
departments
department_branches
department_coordinators
department_audit_logs
```

### Key Fields: `departments`

```text
id
organizationId
departmentCode
name
nameLocalized
parentDepartmentId
description
status
createdAt
createdBy
updatedAt
updatedBy
deletedAt
version
```

### Key Fields: `department_branches`

```text
id
departmentId
branchId
isPrimaryBranch
effectiveFrom
effectiveTo
```

### Key Fields: `department_coordinators`

```text
id
departmentId
employeeId
isPrimaryCoordinator
assignedFrom
assignedTo
```

---

# 21. API Summary

```text
POST   /departments
GET    /departments
GET    /departments/{departmentId}
PUT    /departments/{departmentId}
PATCH  /departments/{departmentId}/activate
PATCH  /departments/{departmentId}/deactivate
PATCH  /departments/{departmentId}/archive

POST   /departments/{departmentId}/branches
DELETE /departments/{departmentId}/branches/{branchId}

POST   /departments/{departmentId}/coordinators
DELETE /departments/{departmentId}/coordinators/{employeeId}

GET    /departments/{departmentId}/dashboard
```

---

# 22. Acceptance Criteria

### Scenario: Create Department

**Given** an Organization Administrator has the required permission
**When** they create a department with a unique code and valid name
**Then** the system creates the department in **Draft** status and records an audit entry.

### Scenario: Activate Department

**Given** the department has at least one assigned branch and one primary coordinator
**When** the administrator activates the department
**Then** the department becomes **Active** and can own courses and trainers.

### Scenario: Prevent Archiving

**Given** a department still has active courses
**When** the administrator attempts to archive it
**Then** the system prevents the action and displays the dependent courses that must be resolved first.

---

# Enterprise Design Recommendation

I recommend making **Department** an **organization-level academic entity**, not a branch-level entity.

This provides several advantages:

* A single department (e.g., **Safety Training**) can operate across multiple branches without duplicating master data.
* Department-level KPIs (students, revenue, trainer utilization, completion rates) become organization-wide and comparable.
* Trainers and coordinators can collaborate across branches while remaining under one academic department.
* Future features such as curriculum management, accreditation, and AI-based departmental analytics can be added without restructuring the data model.

This approach aligns well with enterprise training organizations and keeps the ASTI architecture scalable for future multi-branch expansion.
