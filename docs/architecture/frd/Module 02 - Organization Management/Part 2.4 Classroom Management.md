# Module 02.4 — Classroom Management

**Module Code:** `ORG-CLS`

**Version:** 3.0

**Bounded Context:** Organization Management

**Priority:** Critical for Training Delivery

**Dependencies**
* Organization Management (Part 2.1)
* Branch Management (Part 2.2)

**Dependent Modules**
* Course Catalog Management
* Batch Management (Training Delivery)
* Scheduling & Timetable Management
* Attendance Management
* Reporting & Dashboards

---

# 1. Purpose

Classroom Management defines the physical training rooms or spaces where courses and batches are taught.

A classroom is scoped strictly to a single branch. Beyond simple record keeping, classroom capacity acts as a constraint in scheduling, preventing resource double-booking, and validating batch enrollment size limits.

---

# 2. Business Objectives

The system shall allow administrators to:
* Create classrooms under a branch
* Configure classroom names and capacity
* Define physical location descriptions (e.g., room numbers, building/floor identifiers as text)
* Track classroom operational status
* Support classroom availability lookup for scheduling

---

# 3. Scope

### Included
* Classroom master records (name, capacity, location)
* Branch ownership (`branchId`)
* Active dating bounds (`effectiveStartDate`, `effectiveEndDate`)
* Seating capacity constraints
* Status management (`Active`, `Inactive`, `Draft`, `Archived`)

### Excluded
* Complex building/floor relational hierarchies (modeled as simple text locations)
* Equipment inventory or maintenance ticket tracking
* Room booking systems outside of course batch scheduling

---

# 4. Actors

| Actor              | Responsibility |
| ------------------ | -------------- |
| Super Admin        | Global configuration and complete room access |
| Branch Admin       | Create and manage classrooms within their assigned branch |
| Scheduler          | Lookup classroom availability and assign sessions |
| Trainer            | View assigned classrooms for scheduled sessions |

---

# 5. Business Capabilities

1. **Classroom Registration:** Define a room code/name, branch, and capacity.
2. **Location Tracking:** Record a text location description (e.g., "Building B, Floor 2, Room 204") instead of deep relational structures.
3. **Availability Management:** Track active dating and block classrooms during maintenance.
4. **Capacity Validation:** Ensure batch sizes respect classroom seating limits.

---

# 6. Aggregate Design

## Aggregate Root
* `Classroom`

## Child Entities
* `ClassroomStatusHistory`
* `ClassroomAudit`

---

# 7. Entity Model

```text
Branch
  └── Classroom
         ├── Seating Capacity
         ├── Location (Text)
         └── Audit Trail
```

---

# 8. Classroom Lifecycle

```text
Draft (Setup state)
   │
   ▼
Active (Available for scheduling)
   │
   ├──► Inactive (Suspended, no new sessions)
   │
   ▼
Archived (Historical records only, read-only)
```

---

# 9. Functional Requirements

### FR-CLS-001 Create Classroom
* **Description:** Branch Administrators can register a classroom.
* **Preconditions:** User is authenticated and has permission `organization.classroom.create`.
* **Inputs:** `branchId`, `classroomName`, `capacity`, `location` (optional), `effectiveStartDate` (optional), `effectiveEndDate` (optional).
* **Processing:**
  1. Ensure the administrator is authorized to write to `branchId`.
  2. Verify that `classroomName` is unique within the selected `branchId`.
  3. Ensure `capacity` is a positive integer greater than zero.
  4. Ensure effective dates do not violate date boundaries (end date >= start date).
  5. Create the classroom in `Active` (or `Draft`) status.
* **Outputs:** Classroom created successfully.
* **Priority:** Critical

### FR-CLS-002 Update Classroom
* **Description:** Modify classroom details (name, capacity, location, status).
* **Processing:**
  1. Audit any change to capacity, status, or location.
  2. If capacity is reduced, verify that it does not fall below the student enrollment count of active batches scheduled in this classroom (or raise a warning).
* **Priority:** High

### FR-CLS-003 Archive Classroom
* **Description:** Logically archive a classroom when it is no longer in service.
* **Precondition:** No active or future scheduled batches are assigned to this classroom.
* **Priority:** Medium

---

# 10. Business Rules

| ID | Rule |
| -- | ---- |
| BR-CLS-001 | Classroom name must be unique within the same branch. |
| BR-CLS-002 | Classroom capacity must be a positive integer greater than zero. |
| BR-CLS-003 | A classroom belongs to exactly one branch. |
| BR-CLS-004 | Inactive or Archived classrooms cannot be selected for new scheduling sessions. |
| BR-CLS-005 | Classrooms cannot be permanently deleted; only logical soft delete / archival is supported. |

---

# 11. Workflow

```text
Select Active Branch
        │
        ▼
Create Classroom (Name, Capacity, Location Text)
        │
        ▼
Set Status to Active
        │
        ▼
Select Classroom during Batch Timetable scheduling
```

---

# 12. Screen Specifications

## Classroom List
* **Layout:** Dense table grid.
* **Columns:** Name, Location (Text), Capacity, Status, Effective Dates.
* **Filters:** Status, Branch Context.

## Classroom Form (Create/Edit)
* **Fields:**
  * Branch (Selector, pre-filled)
  * Classroom Name (Input, max 150 chars)
  * Capacity (Input, integer, min 1)
  * Location (Input, text, max 255 chars, e.g., "Building A, Floor 1")
  * Effective Start Date (Date picker)
  * Effective End Date (Date picker)
  * Status Selector (`Draft`, `Active`, `Inactive`, `Archived`)

---

# 13. Validation Rules

* Classroom Name: Mandatory, unique within branch, max 150 chars.
* Capacity: Mandatory, integer > 0.
* Location: Optional, max 255 chars.
* Dates: Effective end date >= effective start date.

---

# 14. Permissions Matrix

| Permission | Super Admin | Branch Admin | Branch Manager | Scheduler |
| ---------- | ----------- | ------------ | -------------- | --------- |
| `classroom.read` | ✓ | ✓ | ✓ (Own Branch) | ✓ (Own Branch) |
| `classroom.create` | ✓ | ✓ | ✓ (Own Branch) | ✗ |
| `classroom.update` | ✓ | ✓ | ✓ (Own Branch) | ✗ |
| `classroom.delete` | ✓ | ✗ | ✗ | ✗ |

---

# 15. Database Mapping

## Primary Table: `classrooms`
* `id`: UUID (Primary Key)
* `branchId`: UUID (Foreign Key to `branches`)
* `classroomName`: String (Unique constraint with `branchId`)
* `capacity`: Integer
* `location`: String (Nullable, stores location details)
* `status`: RecordStatus (`Active`, `Inactive`, `Draft`, `Archived`)
* `effectiveStartDate`: Date (Nullable)
* `effectiveEndDate`: Date (Nullable)
* `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`, `isDeleted`

---

# 16. API Summary

* `POST   /api/organization/classrooms` - Register a classroom
* `GET    /api/organization/classrooms` - List classrooms (branch-scoped filter)
* `GET    /api/organization/classrooms/{id}` - Get details of a classroom
* `PUT    /api/organization/classrooms/{id}` - Update a classroom
* `DELETE /api/organization/classrooms/{id}` - Archive a classroom (soft-delete)
