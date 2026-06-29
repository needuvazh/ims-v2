Before we proceed, I want to point out one architectural observation.

## Should Campus Management exist?

After reviewing:

* ASTI Proposal
* DDD v3
* ER Model v3
* Oman training institutes
* Global training ERP systems (SAP, Oracle, Microsoft Dynamics, Salesforce Education Cloud)

I **would not make Campus a mandatory entity**.

Instead, I would make it an **optional hierarchy**.

Reason:

Many institutes operate like this:

```text
ASTI
 ├── Muscat Branch
 ├── Sohar Branch
 └── Salalah Branch
```

There is **no campus**.

Some large universities operate like:

```text
University
    │
    ├── Muscat Campus
    │      ├── Building A
    │      ├── Building B
    │      └── Building C
    │
    └── Salalah Campus
           ├── Building A
           └── Building B
```

Likewise, some training companies operate:

```text
Branch
   ├── Training Center A
   ├── Training Center B
   └── Training Center C
```

which is effectively a "Campus".

So I recommend:

```text
Organization
      │
      ▼
Branch
      │
      ├── Campus (Optional)
      │       │
      │       ▼
      │   Building
      │
      ▼
Department
```

This keeps the model flexible for future expansion without forcing unnecessary data entry.

---

# Module 02.3 — Campus Management

**Module Code:** `ORG-CAMP`

**Version:** 3.0

**Bounded Context:** Organization Management

**Priority:** Medium (Optional Foundation Module)

**Dependencies**

* Organization Management (2.1)
* Branch Management (2.2)

**Dependent Modules**

* Building Management
* Classroom Management
* Scheduling
* Attendance
* Reporting
* Website (optional)

---

# 1. Purpose

Campus Management allows a branch to organize one or more physical training locations.

A campus groups:

* Buildings
* Classrooms
* Facilities
* Training resources

For ASTI Phase 1, campuses are **optional**.

Branches without multiple physical locations can operate without creating a campus.

---

# 2. Business Objectives

The system shall enable administrators to:

* Create campuses
* Associate campuses with branches
* Manage campus information
* Configure operational status
* Organize buildings
* Support campus-level reporting
* Support future expansion

---

# 3. Scope

### Included

* Campus Master
* Campus Profile
* Campus Address
* Campus Contacts
* Campus Status
* Campus Facilities
* Campus Reporting

### Excluded

* Buildings
* Floors
* Classrooms
* Scheduling

---

# 4. Stakeholders

| Role                       | Responsibility                  |
| -------------------------- | ------------------------------- |
| Super Administrator        | Full control                    |
| Organization Administrator | Manage campuses                 |
| Branch Manager             | Manage assigned branch campuses |
| Scheduler                  | Read campus information         |
| Reporting Engine           | Campus reporting                |

---

# 5. Business Capabilities

1. Campus Registration
2. Campus Profile Management
3. Campus Address Management
4. Campus Contact Management
5. Facility Assignment
6. Operational Status Management
7. Campus Reporting
8. Campus Audit

---

# 6. Aggregate Design

## Aggregate Root

```text
Campus
```

### Child Entities

```text
CampusAddress

CampusContact

CampusFacility

CampusSettings

CampusAudit
```

---

# 7. Entity Model

```text
Branch
    │
    ▼
Campus
    │
    ├── Address
    ├── Contacts
    ├── Facilities
    ├── Settings
    └── Audit
```

---

# 8. Campus Lifecycle

```text
Draft
   │
   ▼
Configured
   │
   ▼
Active
   │
   ├──► Under Maintenance
   │
   ├──► Suspended
   │
   ▼
Closed
   │
   ▼
Archived
```

---

# 9. Functional Requirements

---

## ORG-CAMP-001

### Create Campus

Allow administrators to create a campus under a branch.

Fields:

* Campus Code
* Campus Name (English)
* Campus Name (Arabic)
* Branch
* Description
* Status

Business Rules:

* Campus Code must be unique within a branch.
* Branch is mandatory.

---

## ORG-CAMP-002

### Configure Campus Profile

Store:

* Campus Description
* Public Information
* Contact Information
* Website
* Notes

---

## ORG-CAMP-003

### Configure Campus Address

Store:

* Building Number
* Street
* Area
* City
* Governorate
* Country
* Postal Code
* Latitude
* Longitude
* Google Map URL

---

## ORG-CAMP-004

### Configure Campus Contacts

Support:

* Reception
* Administration
* Security
* Emergency

One contact must be marked as Primary.

---

## ORG-CAMP-005

### Configure Campus Facilities

Examples:

* Parking
* Cafeteria
* Prayer Hall
* Library
* Student Lounge
* Computer Center
* Wi-Fi
* Wheelchair Access

Facilities should come from configurable master data.

---

## ORG-CAMP-006

### Activate Campus

Activation requires:

* Valid branch
* Address
* Primary contact

---

## ORG-CAMP-007

### Suspend Campus

Effects:

* No new classroom scheduling.
* Existing historical data remains accessible.

---

## ORG-CAMP-008

### Close Campus

Closing requires:

* No active buildings.
* No active classrooms.
* No active schedules.

---

## ORG-CAMP-009

### Archive Campus

Archived campuses remain available for reporting but cannot be edited.

---

## ORG-CAMP-010

### Campus Search

Search by:

* Code
* Name
* Branch
* City
* Status

---

# 10. Business Rules

| ID          | Rule                                                 |
| ----------- | ---------------------------------------------------- |
| BR-CAMP-001 | Campus belongs to exactly one branch.                |
| BR-CAMP-002 | Campus code must be unique within a branch.          |
| BR-CAMP-003 | Campus cannot be deleted.                            |
| BR-CAMP-004 | One primary contact is required.                     |
| BR-CAMP-005 | Campus must be Active before buildings can be added. |
| BR-CAMP-006 | Archived campuses are read-only.                     |
| BR-CAMP-007 | Campus is optional in the organization hierarchy.    |

---

# 11. Workflow

```text
Create Campus
      │
      ▼
Configure Profile
      │
      ▼
Configure Address
      │
      ▼
Configure Contacts
      │
      ▼
Configure Facilities
      │
      ▼
Activate Campus
```

---

# 12. Screen Specifications

### Campus List

Columns:

* Code
* Name
* Branch
* City
* Status
* Buildings
* Classrooms

Actions:

* View
* Edit
* Activate
* Suspend
* Archive

---

### Campus Details

Tabs:

1. General
2. Address
3. Contacts
4. Facilities
5. Buildings
6. Audit History

---

# 13. Validation Rules

* Campus Code must be unique within the branch.
* Campus Name is mandatory.
* Branch is mandatory.
* Coordinates must be valid.
* Email and website must follow valid formats.

---

# 14. Permissions Matrix

| Permission      | Super Admin | Organization Admin | Branch Manager      |
| --------------- | ----------- | ------------------ | ------------------- |
| View Campus     | ✓           | ✓                  | ✓                   |
| Create Campus   | ✓           | ✓                  | ✓                   |
| Edit Campus     | ✓           | ✓                  | ✓ (Assigned Branch) |
| Activate Campus | ✓           | ✓                  | ✓                   |
| Suspend Campus  | ✓           | ✓                  | ✗                   |
| Archive Campus  | ✓           | ✗                  | ✗                   |

---

# 15. Notifications

Generate in-app notifications for:

* Campus Created
* Campus Activated
* Campus Suspended
* Campus Closed
* Campus Archived

---

# 16. Audit Requirements

Audit all changes to:

* Profile
* Address
* Contacts
* Facilities
* Status

Audit records include:

* User
* Timestamp
* Previous Value
* New Value
* IP Address
* Branch
* Campus

---

# 17. Reports

* Campus Directory
* Campus Facility Report
* Campus Utilization Summary
* Campus Operational Status

---

# 18. Dashboard Widgets

* Total Campuses
* Active Campuses
* Campuses Under Maintenance
* Buildings per Campus
* Classrooms per Campus

---

# 19. Domain Events

* `CampusCreated`
* `CampusUpdated`
* `CampusActivated`
* `CampusSuspended`
* `CampusClosed`
* `CampusArchived`

---

# 20. Database Mapping

### Aggregate Root

* Campus

### Child Entities

* Campus
* CampusAddress
* CampusContact
* CampusFacility
* CampusSettings
* CampusAudit

---

# 21. API Summary

* `POST /campuses`
* `GET /campuses`
* `GET /campuses/{campusId}`
* `PUT /campuses/{campusId}`
* `PATCH /campuses/{campusId}/activate`
* `PATCH /campuses/{campusId}/suspend`
* `PATCH /campuses/{campusId}/close`
* `PATCH /campuses/{campusId}/archive`

---

# 22. Acceptance Criteria (BDD)

### Scenario: Create Campus

**Given** an authenticated administrator with campus management permission
**When** they create a campus under an existing branch with valid details
**Then** the system creates the campus in **Draft** status and records an audit entry.

### Scenario: Activate Campus

**Given** a campus has a valid address and primary contact configured
**When** the administrator activates the campus
**Then** the campus becomes **Active** and can be used by Building Management and Scheduling modules.

---

## Recommendation

For **ASTI Phase 1**, I would implement the Campus module in a way that it is **feature-flagged**:

* If a branch has only one physical location, the system can automatically associate buildings directly with the branch and hide Campus screens.
* If a branch enables multi-campus operations in the future, the Campus module becomes visible without requiring database redesign.

This approach keeps the current implementation simple while preserving a scalable enterprise architecture for future growth.
