Before writing this module, I want to make an architectural recommendation.

## Should Floor be a separate module?

For **ASTI**, I **recommend keeping Floor as a separate entity**, but **not** as a complex business module.

### Why?

In most training institutes:

```text
Building
    ├── Ground Floor
    │      ├── Room G01
    │      ├── Room G02
    │
    ├── First Floor
    │      ├── Room 101
    │      ├── Room 102
    │
    └── Second Floor
           ├── Room 201
```

Floor itself has very little business logic.

It mainly acts as a **location grouping** for classrooms.

Unlike Building or Classroom, Floor does **not** have workflows like:

* scheduling
* attendance
* finance
* reporting
* trainer assignment

Therefore, I recommend treating Floor as a **lightweight aggregate**.

---

# Module 02.5 — Floor Management

**Module Code:** `ORG-FLR`

**Version:** 3.0

**Bounded Context:** Organization Management

**Priority:** Low (Foundation Master Data)

**Dependencies**

* Organization Management (2.1)
* Branch Management (2.2)
* Campus Management (Optional)
* Building Management (2.4)

**Dependent Modules**

* Classroom Management
* Scheduling
* Reporting

---

# 1. Purpose

The Floor Management module organizes classrooms within a building by defining physical floors.

A floor is a structural grouping entity that improves:

* Classroom organization
* Navigation
* Scheduling
* Facility reporting
* Capacity planning

It does not contain business transactions.

---

# 2. Business Objectives

The system shall allow administrators to:

* Create floors within a building
* Configure floor sequence
* Configure floor descriptions
* Activate or deactivate floors
* View classrooms grouped by floor

---

# 3. Scope

### Included

* Floor master
* Floor sequence
* Floor profile
* Floor status
* Floor search
* Floor audit

### Excluded

* Classroom management
* Equipment
* Scheduling
* Maintenance

---

# 4. Actors

| Actor              | Responsibility                    |
| ------------------ | --------------------------------- |
| Super Admin        | Full control                      |
| Organization Admin | Manage floors                     |
| Branch Manager     | Manage floors for assigned branch |
| Scheduler          | View floors                       |
| Reporting User     | View floor statistics             |

---

# 5. Business Capabilities

1. Floor Registration
2. Floor Sequencing
3. Floor Activation
4. Floor Search
5. Floor Audit
6. Classroom Grouping

---

# 6. Aggregate Design

## Aggregate Root

```text
Floor
```

### Child Entities

```text
FloorAudit
```

---

# 7. Entity Model

```text
Branch
      │
      ▼
Building
      │
      ▼
Floor
      │
      ▼
Classroom
```

---

# 8. Floor Lifecycle

```text
Draft
   │
   ▼
Active
   │
   ├──► Inactive
   │
   ▼
Archived
```

---

# 9. Functional Requirements

---

## ORG-FLR-001

### Create Floor

The system shall allow administrators to create a floor under a building.

### Fields

* Floor Code
* Floor Name
* Floor Name (Arabic)
* Building
* Floor Number
* Display Order
* Description
* Status

### Business Rules

* Building is mandatory.
* Floor Code must be unique within a building.
* Floor Number must be unique within a building.

---

## ORG-FLR-002

### Update Floor

Editable fields:

* Name
* Arabic Name
* Description
* Display Order

---

## ORG-FLR-003

### Activate Floor

A floor can be activated only if:

* Building is Active.
* Branch is Active.

---

## ORG-FLR-004

### Deactivate Floor

When a floor becomes inactive:

* No new classrooms can be created.
* Existing classrooms remain available.
* Existing schedules continue.

---

## ORG-FLR-005

### Archive Floor

Archive only when:

* No active classrooms exist.
* No future schedules reference classrooms on the floor.

---

## ORG-FLR-006

### Search Floors

Search by:

* Branch
* Building
* Floor Name
* Floor Number
* Status

---

## ORG-FLR-007

### Display Classrooms by Floor

The system shall display classrooms grouped by floor.

Example:

```text
Building A

Ground Floor
   Room G01
   Room G02

First Floor
   Room 101
   Room 102

Second Floor
   Room 201
```

---

# 10. Business Rules

| ID         | Rule                                                   |
| ---------- | ------------------------------------------------------ |
| BR-FLR-001 | Floor belongs to exactly one building.                 |
| BR-FLR-002 | Building must be Active before a floor can be Active.  |
| BR-FLR-003 | Floor Code must be unique within a building.           |
| BR-FLR-004 | Floor Number must be unique within a building.         |
| BR-FLR-005 | Floor cannot be deleted; only archived.                |
| BR-FLR-006 | Archived floors are read-only.                         |
| BR-FLR-007 | Classrooms inherit building and branch from the floor. |

---

# 11. Workflow

```text
Create Floor
      │
      ▼
Configure Profile
      │
      ▼
Activate Floor
      │
      ▼
Create Classrooms
```

---

# 12. Screen Specifications

## Floor List

### Columns

* Floor Code
* Floor Name
* Building
* Floor Number
* Total Classrooms
* Status

### Filters

* Branch
* Building
* Status

### Actions

* View
* Edit
* Activate
* Deactivate
* Archive

---

## Floor Details

Tabs:

1. General
2. Classrooms
3. Audit History

---

## Building Layout View

Example:

```text
Building A

Second Floor
   Room 201
   Room 202

First Floor
   Room 101
   Room 102

Ground Floor
   Room G01
   Room G02
```

---

# 13. Validation Rules

* Floor Code is mandatory.
* Floor Name is mandatory.
* Building is mandatory.
* Floor Number must be numeric.
* Duplicate Floor Number within the same building is not allowed.

---

# 14. Permissions Matrix

| Permission       | Super Admin | Org Admin | Branch Manager |
| ---------------- | ----------- | --------- | -------------- |
| View Floor       | ✓           | ✓         | ✓              |
| Create Floor     | ✓           | ✓         | ✓              |
| Edit Floor       | ✓           | ✓         | ✓              |
| Activate Floor   | ✓           | ✓         | ✓              |
| Deactivate Floor | ✓           | ✓         | ✓              |
| Archive Floor    | ✓           | ✗         | ✗              |

---

# 15. Notifications

Generate in-app notifications for:

* Floor Created
* Floor Activated
* Floor Deactivated
* Floor Archived

---

# 16. Audit Requirements

Audit changes to:

* Floor profile
* Display order
* Status
* Archive action

Each audit record must include:

* User
* Timestamp
* Previous Value
* New Value
* Branch
* Building
* Floor

---

# 17. Reports

* Floor Directory
* Floor Classroom Summary
* Building Layout Report
* Classroom Count by Floor

---

# 18. Dashboard Widgets

* Total Floors
* Active Floors
* Total Classrooms by Floor
* Average Classrooms per Floor

---

# 19. Domain Events

* `FloorCreated`
* `FloorUpdated`
* `FloorActivated`
* `FloorDeactivated`
* `FloorArchived`

---

# 20. Database Mapping

## Aggregate Root

```text
Floor
```

## Suggested Tables

```text
floors
floor_audit_logs
```

### Key Fields

```text
id
buildingId
floorCode
name
nameLocalized
floorNumber
displayOrder
description
status
createdAt
createdBy
updatedAt
updatedBy
deletedAt
version
```

---

# 21. API Summary

```text
POST   /floors
GET    /floors
GET    /floors/{floorId}
PUT    /floors/{floorId}
PATCH  /floors/{floorId}/activate
PATCH  /floors/{floorId}/deactivate
PATCH  /floors/{floorId}/archive
GET    /buildings/{buildingId}/floors
```

---

# 22. Acceptance Criteria

### Scenario: Create Floor

**Given** an active building exists
**When** an administrator creates a floor with a unique code and floor number
**Then** the floor is created successfully and is available for classroom assignment.

### Scenario: Prevent Duplicate Floor Number

**Given** Building A already has Floor Number **1**
**When** an administrator attempts to create another floor with Floor Number **1** in the same building
**Then** the system rejects the request with a validation message indicating that floor numbers must be unique within a building.

---

# 23. Enterprise Design Recommendations

For ASTI, I recommend **keeping Floor Management intentionally lightweight**. It should function primarily as a **physical location hierarchy** rather than an operational module.

A good hierarchy for the entire Organization Management domain is:

```text
Organization
    │
    └── Branch
            │
            ├── Campus (Optional)
            │       │
            │       └── Building
            │               │
            │               └── Floor
            │                       │
            │                       └── Classroom
            │
            └── Building
                    │
                    └── Floor
                            │
                            └── Classroom
```

This keeps the model simple for ASTI today while remaining flexible enough to support large multi-campus institutions in the future without redesign.
