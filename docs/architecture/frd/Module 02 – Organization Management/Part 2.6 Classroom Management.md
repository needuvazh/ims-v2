# Module 02.6 — Classroom Management

**Module Code:** `ORG-CLS`
**Version:** 3.0
**Bounded Context:** Organization Management
**Priority:** Critical for Training Delivery
**Dependencies:** Branch Management, Building Management, Floor Management
**Dependent Modules:** Batch Management, Scheduling, Attendance, Reports

---

# 1. Purpose

Classroom Management defines the physical rooms where training sessions are conducted.

A classroom is not just a location master. It directly affects:

* Batch capacity
* Timetable scheduling
* Trainer allocation
* Attendance sessions
* Resource utilization
* Classroom conflict prevention

---

# 2. Business Objectives

The system shall allow administrators to:

* Create classrooms
* Assign classrooms to branch/building/floor
* Define seating capacity
* Define classroom type
* Track classroom status
* Prevent scheduling conflicts
* Support classroom utilization reports

---

# 3. Scope

## Included

* Classroom master
* Classroom capacity
* Classroom type
* Classroom status
* Classroom availability
* Classroom scheduling eligibility
* Classroom audit history

## Excluded

* Lab management
* Equipment inventory
* Maintenance ticketing

---

# 4. Actors

| Actor              | Responsibility             |
| ------------------ | -------------------------- |
| Super Admin        | Full control               |
| Organization Admin | Manage classrooms          |
| Branch Manager     | Manage branch classrooms   |
| Scheduler          | View and assign classrooms |
| Trainer            | View assigned classroom    |
| Reporting User     | View utilization reports   |

---

# 5. Business Capabilities

1. Classroom Registration
2. Classroom Capacity Management
3. Classroom Status Management
4. Classroom Availability Control
5. Classroom Search
6. Classroom Utilization Reporting
7. Classroom Audit

---

# 6. Aggregate Design

## Aggregate Root

```text
Classroom
```

## Child Entities

```text
ClassroomStatusHistory
ClassroomAvailabilityBlock
ClassroomAudit
```

---

# 7. Entity Model

```text
Branch
   └── Building
          └── Floor
                 └── Classroom
                        ├── Capacity
                        ├── Availability
                        ├── Sessions
                        └── Audit
```

---

# 8. Classroom Lifecycle

```text
Draft
   ↓
Active
   ├── UnderMaintenance
   ├── TemporarilyUnavailable
   ├── Inactive
   ↓
Archived
```

---

# 9. Functional Requirements

## ORG-CLS-001 — Create Classroom

The system shall allow authorized users to create a classroom.

### Fields

* Classroom Code
* Classroom Name
* Classroom Name Arabic
* Branch
* Building
* Floor
* Classroom Type
* Seating Capacity
* Exam Capacity
* Description
* Status

### Business Rules

* Classroom code must be unique within the branch.
* Branch is mandatory.
* Building is mandatory.
* Floor is mandatory if Floor Management is enabled.
* Capacity must be greater than zero.
* Classroom starts in Draft status.

---

## ORG-CLS-002 — Update Classroom

Allow updating:

* Name
* Arabic name
* Classroom type
* Capacity
* Exam capacity
* Description
* Public notes

Capacity changes must not invalidate active batch assignments.

---

## ORG-CLS-003 — Activate Classroom

A classroom can be activated only when:

* Branch is Active
* Building is Active
* Floor is Active, if applicable
* Capacity is configured
* Classroom profile is complete

---

## ORG-CLS-004 — Mark Classroom Under Maintenance

The system shall allow marking a classroom as **Under Maintenance**.

Effects:

* New schedules cannot be created for that classroom.
* Existing future schedules should show conflict warning.
* Scheduler and Branch Manager should be notified.

---

## ORG-CLS-005 — Temporarily Block Classroom

The system shall allow blocking a classroom for a specific date/time range.

Fields:

* Start Date
* End Date
* Start Time
* End Time
* Reason
* Approved By

Effects:

* Scheduling is blocked during the selected period.

---

## ORG-CLS-006 — Deactivate Classroom

Inactive classrooms:

* Cannot be used for new batches or sessions.
* Remain available for historical reports.

---

## ORG-CLS-007 — Archive Classroom

Classroom can be archived only when:

* No future sessions exist.
* No active batch is assigned.
* No active maintenance/block exists.

Archived classrooms are read-only.

---

## ORG-CLS-008 — Search Classrooms

Search/filter by:

* Branch
* Building
* Floor
* Classroom Type
* Capacity Range
* Status
* Availability

---

## ORG-CLS-009 — Classroom Availability Lookup

The system shall allow schedulers to check classroom availability by:

* Date
* Time
* Branch
* Capacity requirement
* Classroom type

---

## ORG-CLS-010 — Classroom Utilization Summary

The system shall calculate:

* Total scheduled hours
* Available hours
* Utilization percentage
* Number of sessions hosted
* Number of enrollments served

---

# 10. Business Rules

| ID         | Rule                                                                                |
| ---------- | ----------------------------------------------------------------------------------- |
| BR-CLS-001 | Classroom belongs to exactly one branch.                                            |
| BR-CLS-002 | Classroom belongs to one building.                                                  |
| BR-CLS-003 | Classroom belongs to one floor if Floor Management is enabled.                      |
| BR-CLS-004 | Classroom code must be unique within branch.                                        |
| BR-CLS-005 | Seating capacity must be greater than zero.                                         |
| BR-CLS-006 | Batch enrollment count cannot exceed classroom capacity unless override is allowed. |
| BR-CLS-007 | Under-maintenance classrooms cannot be scheduled.                                   |
| BR-CLS-008 | Archived classrooms are read-only.                                                  |
| BR-CLS-009 | Classroom cannot be deleted; only archived.                                         |
| BR-CLS-010 | Historical sessions must remain linked to archived classrooms.                      |

---

# 11. Workflow

```text
Create Classroom
      ↓
Configure Capacity
      ↓
Activate Classroom
      ↓
Available for Scheduling
      ↓
Used by Batch / Session
      ↓
Utilization Reported
```

---

# 12. Screen Specifications

## Classroom List

### Columns

* Classroom Code
* Classroom Name
* Branch
* Building
* Floor
* Type
* Capacity
* Status
* Availability

### Filters

* Branch
* Building
* Floor
* Type
* Status
* Capacity Range

### Actions

* View
* Edit
* Activate
* Maintenance
* Block Availability
* Deactivate
* Archive

---

## Classroom Details

Tabs:

1. General Information
2. Capacity
3. Availability Blocks
4. Scheduled Sessions
5. Utilization
6. Audit History

---

## Classroom Availability View

Displays available classrooms for selected date/time and capacity requirement.

---

# 13. Validation Rules

* Classroom code is mandatory.
* Classroom name is mandatory.
* Branch is mandatory.
* Building is mandatory.
* Capacity must be greater than zero.
* Exam capacity cannot exceed seating capacity unless allowed by policy.
* Block end date/time must be after start date/time.
* Classroom cannot be archived if future sessions exist.

---

# 14. Permissions Matrix

| Permission           | Super Admin | Org Admin | Branch Manager | Scheduler |
| -------------------- | ----------- | --------- | -------------- | --------- |
| View Classroom       | ✓           | ✓         | ✓              | ✓         |
| Create Classroom     | ✓           | ✓         | ✓              | ✗         |
| Edit Classroom       | ✓           | ✓         | ✓              | ✗         |
| Activate Classroom   | ✓           | ✓         | ✓              | ✗         |
| Mark Maintenance     | ✓           | ✓         | ✓              | ✗         |
| Block Availability   | ✓           | ✓         | ✓              | ✓         |
| Deactivate Classroom | ✓           | ✓         | ✓              | ✗         |
| Archive Classroom    | ✓           | ✗         | ✗              | ✗         |

---

# 15. Notifications

Generate notifications for:

* Classroom created
* Classroom activated
* Classroom marked under maintenance
* Classroom temporarily blocked
* Classroom deactivated
* Classroom archived
* Future session affected by classroom status change

---

# 16. Audit Requirements

Audit changes to:

* Classroom profile
* Capacity
* Status
* Availability blocks
* Maintenance state
* Archive action

Audit must capture:

* User
* Timestamp
* Old value
* New value
* Reason
* Branch context
* IP address

---

# 17. Reports

* Classroom Directory
* Classroom Capacity Report
* Classroom Utilization Report
* Classroom Availability Report
* Classroom Maintenance Report
* Classroom Scheduling Conflict Report

---

# 18. Dashboard Widgets

* Total Classrooms
* Active Classrooms
* Classrooms Under Maintenance
* Available Classrooms Today
* Classroom Utilization %
* Capacity by Branch

---

# 19. Domain Events

```text
ClassroomCreated
ClassroomUpdated
ClassroomActivated
ClassroomMarkedUnderMaintenance
ClassroomBlocked
ClassroomDeactivated
ClassroomArchived
ClassroomCapacityChanged
```

---

# 20. Database Mapping

## Aggregate Root

```text
Classroom
```

## Suggested Tables

```text
classrooms
classroom_availability_blocks
classroom_status_history
classroom_audit_logs
```

## Key Fields: classrooms

```text
id
branchId
buildingId
floorId
classroomCode
name
nameLocalized
classroomType
seatingCapacity
examCapacity
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
POST   /classrooms
GET    /classrooms
GET    /classrooms/{classroomId}
PUT    /classrooms/{classroomId}
PATCH  /classrooms/{classroomId}/activate
PATCH  /classrooms/{classroomId}/maintenance
PATCH  /classrooms/{classroomId}/block
PATCH  /classrooms/{classroomId}/deactivate
PATCH  /classrooms/{classroomId}/archive
GET    /classrooms/availability
GET    /branches/{branchId}/classrooms
GET    /buildings/{buildingId}/classrooms
GET    /floors/{floorId}/classrooms
```

---

# 22. Acceptance Criteria

## Scenario: Create Classroom

**Given** an active branch and building exist
**When** an authorized administrator creates a classroom with valid capacity
**Then** the classroom is created in Draft status and an audit record is created.

## Scenario: Prevent Scheduling in Maintenance Classroom

**Given** a classroom is under maintenance
**When** a scheduler tries to assign a session to it
**Then** the system blocks the assignment and displays the maintenance reason.

## Scenario: Prevent Capacity Violation

**Given** a classroom capacity is 25
**When** a batch with 30 students is assigned
**Then** the system blocks assignment unless over-capacity override is enabled.

---

# 23. Design Recommendation

Classroom Management should be implemented in **Phase 1** because Batch Management and Scheduling depend on it.

For ASTI, do **not** overbuild equipment or asset inventory now. Keep it focused on:

```text
Classroom
Capacity
Availability
Scheduling eligibility
Utilization reporting
```

