Based on the ASTI proposal, DDD review, and enterprise architecture, **Module 02 – Organization Management** should become the **foundation bounded context** for every other module. Every aggregate in the system (Student, Employee, Batch, Invoice, Attendance, etc.) should belong to an Organization hierarchy to support multi-branch operations, branch-level security, and future scalability. The project documentation explicitly identifies Organization Management as a core bounded context responsible for branches, departments, and classrooms, with branch-based data isolation enforced throughout the platform. 

---

# Module 02 – Organization Management

**Version:** 3.0

**Bounded Context:** Organization

**Priority:** Critical (Foundation Module)

**Dependencies**

* Module 01 – Identity & Access Management
* Notification Module
* Audit Module

**Dependent Modules**

* CRM
* Admissions
* Student Management
* Course Management
* Batch Management
* Attendance
* HR
* Finance
* Reports
* Website
* Document Management

---

# 1. Purpose

Organization Management provides the master organizational hierarchy for ASTI.

It defines:

* Company
* Branches
* Campuses
* Buildings
* Floors
* Classrooms
* Departments
* Academic Divisions
* Cost Centers
* Working Hours
* Holiday Calendars

Every business transaction belongs to an organization.

Without Organization Management, no other module can function.

---

# 2. Objectives

The module shall enable ASTI administrators to:

* Configure institute structure
* Support multiple branches
* Manage classrooms
* Manage departments
* Configure operating hours
* Configure academic divisions
* Configure holiday calendars
* Configure timezone
* Configure language defaults
* Configure branch branding
* Configure branch contacts

The project information also identifies organization details such as institute legal name, branches, departments, working hours, and public holiday calendars as required master data collected during implementation. 

---

# 3. Scope

Included

* Institute
* Branches
* Campuses
* Buildings
* Rooms
* Departments
* Academic Divisions
* Branch Contacts
* Working Hours
* Holidays
* Branch Settings
* Branch Branding

Excluded

* Users
* Students
* Courses
* Finance

---

# 4. Actors

| Actor                      | Description              |
| -------------------------- | ------------------------ |
| Super Administrator        | Complete access          |
| Organization Administrator | Institute administration |
| Branch Manager             | Branch management        |
| Receptionist               | Read-only branch info    |
| HR                         | Department management    |
| Finance                    | Cost center reference    |
| Scheduler                  | Classroom allocation     |
| API                        | Read organization        |

---

# 5. Domain Model

```
Organization
│
├── Branch
│     │
│     ├── Campus
│     │      │
│     │      ├── Building
│     │      │      │
│     │      │      ├── Floor
│     │      │      │      │
│     │      │      │      └── Classroom
│     │      │
│     │      └── Facilities
│     │
│     ├── Department
│     │
│     ├── Academic Division
│     │
│     ├── Working Hours
│     │
│     ├── Holiday Calendar
│     │
│     └── Branch Contacts
```

---

# 6. Aggregate Roots

## Organization

Owns

* Branches
* Policies
* Branding

---

## Branch

Owns

* Departments
* Classrooms
* Calendar
* Contacts

---

## Classroom

Owns

* Capacity
* Equipment
* Availability

---

## Department

Owns

* Staff
* Courses

---

# 7. Functional Requirements

---

## ORG-001 Create Organization

**Description**

System shall allow Super Administrator to create an organization.

Fields

* Legal Name
* Trade Name
* Arabic Name
* Registration Number
* VAT Number
* Country
* Currency
* Timezone
* Default Language
* RTL Enabled

Priority

Critical

Acceptance

Organization successfully created.

---

## ORG-002 Edit Organization

Administrator may update

* Logo
* Address
* Contact
* Email
* Website
* Branding

---

## ORG-003 Configure Branch

Each organization can contain multiple branches.

Fields

* Branch Code
* Branch Name
* Arabic Name
* Phone
* Email
* Manager
* Status

---

## ORG-004 Branch Status

Supported statuses

```
Draft

Active

Inactive

Under Maintenance

Closed

Archived
```

---

## ORG-005 Branch Address

Store

* Country
* State
* Governorate
* City
* Postal Code
* Latitude
* Longitude
* Google Map URL

---

## ORG-006 Departments

Allow creation of

* Training
* Finance
* HR
* Sales
* Administration
* Marketing

Custom departments supported.

---

## ORG-007 Academic Divisions

Examples

```
IT

Mechanical

Electrical

Safety

Management

Language

Corporate Training
```

---

## ORG-008 Working Hours

Configure

Sunday

Monday

Tuesday

Wednesday

Thursday

Friday

Saturday

Each day

Open

Close

Break

Overtime

---

## ORG-009 Holiday Calendar

Support

National holidays

Branch holidays

Emergency closure

Weather closure

Ramadan schedule

Eid holidays

---

## ORG-010 Buildings

Create buildings.

Attributes

* Code
* Name
* Floors

---

## ORG-011 Floors

Each building contains multiple floors.

---

## ORG-012 Classrooms

Fields

* Room Number
* Capacity
* Type
* Projector
* Whiteboard
* Smart TV
* Lab
* Computer Count

---

## ORG-013 Classroom Availability

Track

Available

Occupied

Maintenance

Reserved

---

## ORG-014 Facilities

Examples

* Library
* Lab
* Cafeteria
* Parking
* Prayer Hall

---

## ORG-015 Cost Centers

Configure cost centers for Finance integration.

---

## ORG-016 Organization Branding

Store

* Logo
* Favicon
* Theme
* Primary Color
* Secondary Color
* Email Template
* Certificate Theme

---

## ORG-017 Branch Branding

Each branch may override

* Logo
* Contact
* Banner
* Email Footer

---

## ORG-018 Organization Contacts

Support

* Primary Contact
* Emergency Contact
* Finance Contact
* HR Contact

---

## ORG-019 Branch Settings

Settings include

* Default Currency
* Timezone
* Date Format
* Number Format
* Fiscal Year
* Attendance Policy
* Default Language

---

## ORG-020 Archive Branch

Cannot archive when

* Active batches exist
* Active students exist
* Employees assigned
* Pending invoices exist

---

# 8. Business Rules

| ID     | Rule                                              |
| ------ | ------------------------------------------------- |
| BR-001 | Organization code must be unique                  |
| BR-002 | Branch code unique within organization            |
| BR-003 | Classroom number unique within building           |
| BR-004 | Capacity must be greater than zero                |
| BR-005 | Closed branches cannot accept admissions          |
| BR-006 | Inactive branches cannot schedule classes         |
| BR-007 | Branch cannot be deleted if referenced            |
| BR-008 | Default branch cannot be archived                 |
| BR-009 | Every branch must have at least one administrator |
| BR-010 | Every classroom belongs to exactly one branch     |

---

# 9. Workflow

```text
Create Organization
        │
        ▼
Create Branch
        │
        ▼
Configure Departments
        │
        ▼
Create Buildings
        │
        ▼
Create Classrooms
        │
        ▼
Assign Working Hours
        │
        ▼
Configure Holidays
        │
        ▼
Organization Ready
```

---

# 10. State Machine

## Branch

```text
Draft
   │
   ▼
Active
   │
   ├──► Maintenance
   │
   ├──► Inactive
   │
   ▼
Closed
   │
   ▼
Archived
```

---

# 11. Screens

* Organization Dashboard
* Organization Profile
* Branch List
* Branch Details
* Department Management
* Academic Divisions
* Building Management
* Floor Management
* Classroom Management
* Working Hours
* Holiday Calendar
* Organization Branding
* Branch Branding
* Cost Centers
* Organization Settings

---

# 12. Permissions Matrix

| Permission         | Super Admin | Org Admin | Branch Manager | HR |
| ------------------ | ----------- | --------- | -------------- | -- |
| View Organization  | ✓           | ✓         | ✓              | ✓  |
| Edit Organization  | ✓           | ✓         | ✗              | ✗  |
| Create Branch      | ✓           | ✓         | ✗              | ✗  |
| Edit Branch        | ✓           | ✓         | ✓ (Own Branch) | ✗  |
| Archive Branch     | ✓           | ✗         | ✗              | ✗  |
| Manage Departments | ✓           | ✓         | ✓              | ✓  |
| Manage Classrooms  | ✓           | ✓         | ✓              | ✗  |
| Manage Holidays    | ✓           | ✓         | ✓              | ✗  |

---

# 13. Reports

* Branch Summary
* Organization Hierarchy
* Department Directory
* Classroom Utilization
* Classroom Capacity Report
* Branch Contact Directory
* Holiday Calendar
* Working Hours Report

---

# 14. Dashboard Widgets

* Total Branches
* Active Branches
* Departments
* Buildings
* Classrooms
* Available Classrooms
* Classroom Occupancy
* Holiday Count
* Upcoming Holidays

---

# 15. Integrations

* Identity & RBAC
* Course Management
* Batch Scheduling
* Attendance
* HRMS
* Finance
* Website CMS
* Reporting Engine

---

# 16. Domain Events

* `OrganizationCreated`
* `OrganizationUpdated`
* `BranchCreated`
* `BranchActivated`
* `BranchDeactivated`
* `BranchArchived`
* `DepartmentCreated`
* `DepartmentUpdated`
* `BuildingCreated`
* `ClassroomCreated`
* `ClassroomUpdated`
* `HolidayCalendarUpdated`
* `WorkingHoursUpdated`

---

# 17. Database Design (High-Level)

### Aggregates

* Organization
* Branch
* Department
* AcademicDivision
* Building
* Floor
* Classroom
* WorkingHours
* HolidayCalendar

### Suggested Tables

* `organizations`
* `organization_settings`
* `organization_branding`
* `branches`
* `branch_contacts`
* `branch_settings`
* `departments`
* `academic_divisions`
* `buildings`
* `floors`
* `classrooms`
* `working_hours`
* `holiday_calendars`
* `holiday_calendar_dates`

---

## Enterprise Design Recommendations (v3 Enhancements)

To make this module enterprise-grade and future-proof, I recommend adding the following capabilities beyond the initial proposal:

* **Multi-branch logical isolation** using `branch_id` on all operational entities with automatic query scoping, ensuring users only access data for authorized branches. 
* **Bilingual organization metadata**, storing English and Arabic values (organization names, branch names, department names, classroom names) using localized JSON structures rather than separate language-specific columns. 
* **Immutable audit logging** for organization and branch configuration changes, capturing the user, timestamp, previous value, new value, IP address, and branch context to support compliance and operational traceability. 
* **Soft-delete and archival policies** to preserve historical references from admissions, finance, and HR instead of permanently deleting organization records.
* **Branch-specific configuration overrides**, allowing each branch to define branding, working hours, holidays, contact details, and operational policies while inheriting organization defaults where applicable.

This module establishes the organizational backbone for the entire ASTI IMS platform and should be completed before implementing Student, Finance, Scheduling, Attendance, or HR bounded contexts.
