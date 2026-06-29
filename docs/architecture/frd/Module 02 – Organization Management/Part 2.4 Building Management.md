# Module 02.4 — Building Management

**Module Code:** `ORG-BLDG`
**Version:** 3.0
**Bounded Context:** Organization Management
**Priority:** Medium
**Dependency:** Branch Management; Campus Management is optional

---

# 1. Purpose

Building Management allows ASTI to manage physical buildings used for training operations.

A building can belong directly to a **Branch**, or optionally to a **Campus** if the branch has multiple physical sites.

```text
Branch
   └── Building

OR

Branch
   └── Campus
          └── Building
```

Buildings are used by:

* Floor Management
* Classroom Management
* Scheduling
* Attendance
* Reports

---

# 2. Business Objectives

The system shall allow administrators to:

* Create buildings
* Associate buildings with branch or campus
* Track building address/location
* Track operational status
* Manage floor count
* Support scheduling and classroom planning
* Support future facility expansion

---

# 3. Scope

## Included

* Building master
* Building profile
* Building location
* Building status
* Building contact person
* Building capacity summary
* Building audit history

## Excluded

* Floor-level room setup
* Classroom creation
* Equipment inventory
* Facility maintenance

Handled by separate modules or future phases.

---

# 4. Actors

| Actor              | Responsibility                         |
| ------------------ | -------------------------------------- |
| Super Admin        | Full control                           |
| Organization Admin | Manage buildings                       |
| Branch Manager     | Manage buildings under assigned branch |
| Scheduler          | View building/classroom availability   |
| Reporting User     | View building reports                  |

---

# 5. Business Capabilities

1. Building Registration
2. Building Profile Management
3. Building Location Management
4. Building Status Management
5. Building Capacity Summary
6. Building Search
7. Building Audit

---

# 6. Aggregate Design

## Aggregate Root

```text
Building
```

## Child Entities

```text
BuildingAddress
BuildingContact
BuildingStatusHistory
BuildingAudit
```

---

# 7. Entity Model

```text
Branch
   │
   ├── Campus optional
   │       │
   │       └── Building
   │
   └── Building
          │
          ├── Address
          ├── Contact
          ├── Floors
          ├── Classrooms
          └── Audit
```

---

# 8. Building Lifecycle

```text
Draft
   ↓
Configured
   ↓
Active
   ├── Under Maintenance
   ├── Temporarily Closed
   ↓
Closed
   ↓
Archived
```

---

# 9. Functional Requirements

## ORG-BLDG-001 — Create Building

The system shall allow authorized users to create a building.

### Fields

* Building Code
* Building Name English
* Building Name Arabic
* Branch
* Campus optional
* Building Type
* Description
* Status

### Business Rules

* Building Code must be unique within the branch.
* Branch is mandatory.
* Campus is optional.
* Building name is mandatory.
* Building starts in Draft status.

### Acceptance Criteria

* Building is created successfully.
* Audit log is generated.
* Building appears in Building List.

---

## ORG-BLDG-002 — Update Building Profile

The system shall allow updating:

* Name
* Arabic name
* Description
* Building type
* Notes
* Public visibility flag

---

## ORG-BLDG-003 — Configure Building Location

The system shall store:

* Address line
* Area
* City
* Governorate
* Country
* Postal code
* Latitude
* Longitude
* Google Maps URL

If campus address exists, the building may inherit campus address by default.

---

## ORG-BLDG-004 — Configure Building Contact

The system shall allow one or more contacts:

* Building in-charge
* Security contact
* Emergency contact
* Maintenance contact

One contact can be marked as primary.

---

## ORG-BLDG-005 — Activate Building

A building can be activated only when:

* Branch is active
* Campus is active, if linked
* Building profile is complete
* Location is configured

---

## ORG-BLDG-006 — Set Building Under Maintenance

The system shall allow authorized users to mark a building as **Under Maintenance**.

Effects:

* New scheduling in the building is blocked.
* Existing future schedules should trigger warning.
* Historical data remains visible.

---

## ORG-BLDG-007 — Temporarily Close Building

The system shall allow temporary closure for a date range.

Fields:

* Closure start date
* Closure end date
* Reason
* Approved by

Effects:

* Classroom scheduling is blocked during closure period.

---

## ORG-BLDG-008 — Close Building Permanently

Closing a building requires:

* No active classrooms
* No running schedules
* No active batches assigned
* No future sessions scheduled

---

## ORG-BLDG-009 — Archive Building

Archived buildings:

* Are hidden from operational screens
* Remain available in historical records
* Cannot be edited

---

## ORG-BLDG-010 — Search Buildings

Search/filter by:

* Branch
* Campus
* Building code
* Building name
* City
* Status
* Type

---

## ORG-BLDG-011 — Building Capacity Summary

The system shall calculate:

* Total floors
* Total classrooms
* Total classroom capacity
* Active classrooms
* Classrooms under maintenance

---

# 10. Business Rules

| ID          | Rule                                                                             |
| ----------- | -------------------------------------------------------------------------------- |
| BR-BLDG-001 | Building belongs to exactly one branch.                                          |
| BR-BLDG-002 | Campus is optional.                                                              |
| BR-BLDG-003 | Building code must be unique within branch.                                      |
| BR-BLDG-004 | Building cannot be deleted; only archived.                                       |
| BR-BLDG-005 | Building cannot be active if parent branch is inactive.                          |
| BR-BLDG-006 | Building cannot be active if linked campus is inactive.                          |
| BR-BLDG-007 | Under-maintenance building cannot accept new schedules.                          |
| BR-BLDG-008 | Archived building is read-only.                                                  |
| BR-BLDG-009 | Closing requires no active operational dependency.                               |
| BR-BLDG-010 | Historical schedule and attendance data must remain linked to archived building. |

---

# 11. Workflow

```text
Create Building
      ↓
Configure Profile
      ↓
Configure Location
      ↓
Configure Contacts
      ↓
Activate Building
      ↓
Use in Floor/Classroom/Scheduling
```

---

# 12. Screen Specifications

## Building List

### Columns

* Building Code
* Building Name
* Branch
* Campus
* City
* Total Floors
* Total Classrooms
* Status
* Last Updated

### Filters

* Branch
* Campus
* Status
* City
* Building Type

### Actions

* View
* Edit
* Activate
* Maintenance
* Temporary Close
* Close
* Archive

---

## Building Details

Tabs:

1. General Information
2. Location
3. Contacts
4. Floors
5. Classrooms
6. Closure / Maintenance History
7. Audit History

---

## Building Capacity View

Displays:

* Floor-wise classroom count
* Capacity by classroom type
* Available classrooms
* Maintenance rooms
* Scheduled utilization summary

---

# 13. Validation Rules

* Building code is mandatory.
* Building name is mandatory.
* Branch is mandatory.
* Campus must belong to selected branch.
* Latitude/longitude must be valid if entered.
* Closure end date must be after closure start date.
* Building cannot be archived unless closed.
* Building cannot be closed if active schedules exist.

---

# 14. Permissions Matrix

| Permission        | Super Admin | Org Admin | Branch Manager | Scheduler |
| ----------------- | ----------- | --------- | -------------- | --------- |
| View Building     | ✓           | ✓         | ✓              | ✓         |
| Create Building   | ✓           | ✓         | ✓              | ✗         |
| Edit Building     | ✓           | ✓         | ✓              | ✗         |
| Activate Building | ✓           | ✓         | ✓              | ✗         |
| Mark Maintenance  | ✓           | ✓         | ✓              | ✗         |
| Temporary Close   | ✓           | ✓         | ✓              | ✗         |
| Close Building    | ✓           | ✓         | ✗              | ✗         |
| Archive Building  | ✓           | ✗         | ✗              | ✗         |

---

# 15. Notifications

Generate in-app notifications for:

* Building created
* Building activated
* Building marked under maintenance
* Building temporarily closed
* Building closed
* Building archived

For future scheduled sessions affected by closure/maintenance, notify:

* Scheduler
* Branch Manager
* Assigned trainers

---

# 16. Audit Requirements

Audit changes to:

* Building profile
* Location
* Contacts
* Status
* Maintenance state
* Closure periods
* Archive action

Audit data must include:

* User
* Timestamp
* Old value
* New value
* IP address
* Branch context
* Reason where applicable

---

# 17. Reports

* Building Directory
* Building Status Report
* Building Capacity Report
* Building Utilization Report
* Building Maintenance Report
* Building Closure History

---

# 18. Dashboard Widgets

* Total Buildings
* Active Buildings
* Buildings Under Maintenance
* Total Classroom Capacity
* Active Classroom Count
* Building Utilization %

---

# 19. Domain Events

* `BuildingCreated`
* `BuildingUpdated`
* `BuildingActivated`
* `BuildingMarkedUnderMaintenance`
* `BuildingTemporarilyClosed`
* `BuildingClosed`
* `BuildingArchived`
* `BuildingCapacityChanged`

---

# 20. Database Mapping

## Aggregate Root

```text
Building
```

## Suggested Tables

```text
buildings
building_addresses
building_contacts
building_status_history
building_closure_periods
building_audit_logs
```

## Key Fields: buildings

```text
id
branchId
campusId nullable
buildingCode
name
nameLocalized
buildingType
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
POST   /buildings
GET    /buildings
GET    /buildings/{buildingId}
PUT    /buildings/{buildingId}
PATCH  /buildings/{buildingId}/activate
PATCH  /buildings/{buildingId}/maintenance
PATCH  /buildings/{buildingId}/temporary-close
PATCH  /buildings/{buildingId}/close
PATCH  /buildings/{buildingId}/archive
GET    /buildings/{buildingId}/capacity-summary
GET    /branches/{branchId}/buildings
GET    /campuses/{campusId}/buildings
```

---

# 22. Acceptance Criteria

## Scenario: Create Building

**Given** an authorized administrator is logged in
**When** they create a building with valid branch and building details
**Then** the system creates the building in Draft status and records an audit log.

## Scenario: Activate Building

**Given** a building has complete profile and location details
**When** the administrator activates the building
**Then** the building becomes Active and can be used for floors, classrooms, and scheduling.

## Scenario: Prevent Scheduling During Maintenance

**Given** a building is marked Under Maintenance
**When** a scheduler tries to create a classroom session inside that building
**Then** the system blocks the schedule and shows the maintenance reason.

---

# 23. Design Recommendation

For ASTI Phase 1, keep Building Management simple:

```text
Branch → Building → Classroom
```

Campus should remain optional.

Do not overbuild facility maintenance, equipment inventory, or asset tracking yet. The main purpose of this module is to support **classroom planning, scheduling conflict prevention, and branch-level operational reporting**.
