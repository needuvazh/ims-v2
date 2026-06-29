Before continuing, I'd like to make one architectural correction to the DDD.

## My Recommendation: Rename "Academic Division" to "Training Division"

For a **training institute/coaching center**, the term **Academic Division** is more appropriate for universities and colleges.

Examples:

* University → Faculty → Academic Division → Department
* School → Academic Division

But ASTI is a **commercial training institute** where the business is centered around training services rather than academic faculties.

A more suitable model would be:

```text
Organization
      │
      ▼
Training Division
      │
      ▼
Department
      │
      ▼
Course
```

Examples:

```text
Training Division
    ├── Technical Training
    ├── Safety Training
    ├── Language Training
    ├── Corporate Training
    ├── Professional Certification
    └── Management Development
```

Then departments become:

```text
Technical Training
    ├── Electrical
    ├── Mechanical
    ├── Civil
    ├── Instrumentation
```

or

```text
Safety Training
    ├── NEBOSH
    ├── IOSH
    ├── Fire & Safety
```

This hierarchy scales much better and aligns with how global training providers organize their catalogs.

---

# Module 02.8 — Training Division Management (Recommended)

> **(If you prefer to keep the original naming, simply replace "Training Division" with "Academic Division". The design remains the same.)**

**Module Code:** `ORG-DIV`

**Version:** 3.0

**Bounded Context:** Organization Management

**Priority:** Medium (Strategic Classification Layer)

**Dependencies**

* Organization Management
* Branch Management

**Dependent Modules**

* Department Management
* Course Management
* Trainer Management
* Reporting
* Website

---

# 1. Purpose

Training Division Management provides the highest level of academic and business classification for training programs.

A Training Division groups multiple departments with similar business objectives.

It enables:

* Strategic course organization
* Executive reporting
* Revenue analysis
* Trainer specialization
* Website categorization
* Future AI recommendations

---

# 2. Business Objectives

The system shall allow administrators to:

* Create training divisions
* Organize departments
* Classify courses
* Configure division coordinators
* Track division performance
* Support public course catalogs
* Support executive reporting

---

# 3. Scope

## Included

* Division master
* Division hierarchy
* Department assignment
* Division coordinators
* Division reporting
* Public visibility

## Excluded

* Course creation
* Batch creation
* Scheduling
* Finance

---

# 4. Actors

| Actor                  | Responsibility           |
| ---------------------- | ------------------------ |
| Super Admin            | Full control             |
| Organization Admin     | Manage divisions         |
| Academic Director      | Manage division strategy |
| Department Coordinator | View assigned division   |
| Reporting User         | View division analytics  |
| Website                | Display training catalog |

---

# 5. Business Capabilities

1. Division Registration
2. Department Grouping
3. Coordinator Assignment
4. Public Catalog Classification
5. Performance Analytics
6. Revenue Analysis
7. Audit Trail

---

# 6. Aggregate Design

## Aggregate Root

```text
TrainingDivision
```

## Child Entities

```text
DivisionCoordinator
DivisionDepartment
DivisionAudit
```

---

# 7. Entity Model

```text
Organization
      │
      ▼
Training Division
      │
      ├── Departments
      │       ├── Courses
      │       └── Trainers
      │
      ├── Coordinator
      └── Audit
```

---

# 8. Division Lifecycle

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

## ORG-DIV-001 — Create Division

Create a training division.

### Fields

* Division Code
* Division Name (English)
* Division Name (Arabic)
* Description
* Display Order
* Public Visibility
* Status

Business Rules:

* Division Code must be unique.
* Division Name is mandatory.

---

## ORG-DIV-002 — Assign Departments

A division can contain multiple departments.

Example:

```text
Technical Training
    ├── Electrical
    ├── Mechanical
    ├── Civil
```

Rules:

* A department belongs to one primary division.
* Department reassignment retains history.

---

## ORG-DIV-003 — Assign Division Coordinator

Assign one or more coordinators.

Responsibilities:

* Strategic planning
* Curriculum oversight
* Department monitoring
* KPI review

One coordinator is marked as Primary.

---

## ORG-DIV-004 — Configure Public Visibility

Determine whether the division appears on the public website.

Options:

* Visible
* Hidden
* Featured

---

## ORG-DIV-005 — Activate Division

Activation requires:

* Complete profile
* At least one department
* Primary coordinator assigned

---

## ORG-DIV-006 — Deactivate Division

Effects:

* New departments cannot be assigned.
* Existing courses remain operational.
* Historical reports remain available.

---

## ORG-DIV-007 — Archive Division

Allowed only when:

* No active departments remain.
* No pending approvals exist.

---

## ORG-DIV-008 — Search Divisions

Search by:

* Code
* Name
* Coordinator
* Status
* Public Visibility

---

## ORG-DIV-009 — Division Dashboard

Display:

* Departments
* Courses
* Trainers
* Students
* Active Batches
* Revenue
* Completion Rate
* Lead Conversion

---

# 10. Business Rules

| ID         | Rule                                              |
| ---------- | ------------------------------------------------- |
| BR-DIV-001 | Division Code must be unique.                     |
| BR-DIV-002 | Division belongs to one organization.             |
| BR-DIV-003 | Department belongs to one primary division.       |
| BR-DIV-004 | Active division requires at least one department. |
| BR-DIV-005 | Active division requires one primary coordinator. |
| BR-DIV-006 | Division cannot be deleted; only archived.        |
| BR-DIV-007 | Archived divisions are read-only.                 |
| BR-DIV-008 | Public website displays only visible divisions.   |

---

# 11. Workflow

```text
Create Division
        ↓
Configure Profile
        ↓
Assign Coordinator
        ↓
Assign Departments
        ↓
Activate Division
        ↓
Publish to Website (Optional)
```

---

# 12. Screen Specifications

## Division List

Columns:

* Code
* Name
* Departments
* Coordinator
* Courses
* Revenue
* Status

Actions:

* View
* Edit
* Activate
* Archive

---

## Division Details

Tabs:

1. General
2. Departments
3. Coordinators
4. Performance Dashboard
5. Public Website
6. Audit History

---

## Division Dashboard

Displays:

* Department count
* Course count
* Student count
* Revenue
* Completion %
* Trainer utilization
* Lead conversion

---

# 13. Validation Rules

* Division Code is mandatory.
* Division Name is mandatory.
* At least one department before activation.
* Primary coordinator required for active divisions.
* Display order must be unique if configured.

---

# 14. Permissions Matrix

| Permission         | Super Admin | Org Admin | Academic Director | Coordinator |
| ------------------ | ----------- | --------- | ----------------- | ----------- |
| View Division      | ✓           | ✓         | ✓                 | ✓           |
| Create Division    | ✓           | ✓         | ✗                 | ✗           |
| Edit Division      | ✓           | ✓         | ✓                 | ✗           |
| Assign Departments | ✓           | ✓         | ✓                 | ✗           |
| Activate Division  | ✓           | ✓         | ✓                 | ✗           |
| Archive Division   | ✓           | ✗         | ✗                 | ✗           |

---

# 15. Notifications

Generate notifications for:

* Division created
* Coordinator assigned
* Department added
* Division activated
* Division archived

---

# 16. Audit Requirements

Audit:

* Profile updates
* Department assignments
* Coordinator assignments
* Status changes
* Website visibility changes

---

# 17. Reports

* Division Performance Report
* Revenue by Division
* Student Distribution
* Course Portfolio
* Trainer Allocation
* Lead Conversion by Division

---

# 18. Dashboard Widgets

* Total Divisions
* Active Divisions
* Courses by Division
* Revenue by Division
* Students by Division
* Completion Rate

---

# 19. Domain Events

```text
DivisionCreated
DivisionUpdated
DivisionActivated
DivisionArchived
DivisionCoordinatorAssigned
DepartmentAssignedToDivision
```

---

# 20. Database Mapping

### Aggregate Root

```text
TrainingDivision
```

### Suggested Tables

```text
training_divisions
division_departments
division_coordinators
division_audit_logs
```

### Key Fields

```text
id
organizationId
divisionCode
name
nameLocalized
description
displayOrder
publicVisibility
status
createdAt
updatedAt
deletedAt
version
```

---

# 21. API Summary

```text
POST   /training-divisions
GET    /training-divisions
GET    /training-divisions/{divisionId}
PUT    /training-divisions/{divisionId}
PATCH  /training-divisions/{divisionId}/activate
PATCH  /training-divisions/{divisionId}/archive

POST   /training-divisions/{divisionId}/departments
DELETE /training-divisions/{divisionId}/departments/{departmentId}

GET    /training-divisions/{divisionId}/dashboard
```

---

# 22. Acceptance Criteria

### Scenario: Create Training Division

**Given** an Organization Administrator has the required permission
**When** they create a training division with a unique code and valid details
**Then** the system creates the division in **Draft** status and records an audit entry.

### Scenario: Activate Training Division

**Given** the division has a complete profile, at least one department, and a primary coordinator
**When** the administrator activates the division
**Then** the division becomes **Active** and can be used for department organization and public catalog presentation.

---

# Recommendation for ASTI

I would actually make **Training Division optional** for the first release.

The initial hierarchy can remain:

```text
Organization
    │
    ├── Branch
    │
    └── Department
            │
            └── Course
```

Then enable **Training Division** only when ASTI grows to hundreds of courses across multiple business areas.

This keeps Phase 1 simpler while allowing the data model to support future expansion without redesign. From a DDD perspective, `TrainingDivision` is a **supporting domain**, whereas **Department** and **Course** remain part of the **core business domain**.
