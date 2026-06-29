Excellent. **Branch Management** is one of the most critical modules in the entire system. In an enterprise IMS, almost every operational entity—students, trainers, classrooms, batches, invoices, attendance, documents, and reports—is scoped to a branch. Because of this, this module must be much more than a simple "Branch Master."

For ASTI, I recommend treating **Branch** as an **Aggregate Root** with its own policies, configuration, operational status, reporting, and security boundaries.

---

# Module 02.2 — Branch Management

**Module Code:** `ORG-BR`

**Version:** 3.0

**Bounded Context:** Organization Management

**Priority:** Critical (Foundation Module)

**Dependencies**

* Organization Management (2.1)
* Identity & Access Management

**Dependent Modules**

* CRM
* Student Management
* Admissions
* Course Management
* Batch Management
* Scheduling
* Attendance
* Finance
* HR
* Reporting
* Website

---

# 1. Purpose

The Branch Management module manages the operational locations of the institute.

A branch represents an independently operating training location with its own:

* Management
* Students
* Trainers
* Courses
* Batches
* Timetables
* Finance
* Reports
* Operational policies

Every operational transaction in ASTI must belong to a branch.

---

# 2. Business Objectives

The system shall enable administrators to:

* Create branches
* Configure operational settings
* Configure branch contacts
* Configure branch hierarchy
* Configure branch working hours
* Configure reporting hierarchy
* Assign branch managers
* Control branch lifecycle
* Support branch-level reporting
* Support branch-level security

---

# 3. Scope

### Included

* Branch Master
* Branch Contacts
* Branch Configuration
* Branch Status
* Branch Hierarchy
* Branch Manager Assignment
* Branch Policies
* Branch Calendar Association
* Branch Working Hours Association

### Excluded

* Buildings
* Departments
* Classrooms
* Users
* Students
* Finance

Handled by other modules.

---

# 4. Stakeholders

| Role                       | Responsibility             |
| -------------------------- | -------------------------- |
| Super Administrator        | Complete control           |
| Organization Administrator | Manage branches            |
| Branch Manager             | Manage own branch          |
| Finance                    | Financial reporting        |
| HR                         | Staff assignment           |
| Scheduler                  | Scheduling                 |
| Reporting Engine           | Analytics                  |
| Website                    | Display branch information |

---

# 5. Business Capabilities

The Branch module provides:

1. Branch Registration
2. Branch Configuration
3. Branch Hierarchy
4. Branch Contacts
5. Branch Operations
6. Branch Policy Configuration
7. Branch Manager Assignment
8. Branch Activation
9. Branch Reporting
10. Branch Audit

---

# 6. Aggregate Design

## Aggregate Root

```text
Branch
```

### Child Entities

```text
BranchContact

BranchAddress

BranchSettings

BranchPolicy

BranchManager

BranchCalendar

BranchWorkingHours

BranchAudit
```

---

# 7. Entity Model

```text
Organization
      │
      ▼
Branch
      │
      ├── Address
      ├── Contacts
      ├── Settings
      ├── Policies
      ├── Calendar
      ├── Working Hours
      ├── Branch Manager
      └── Audit
```

---

# 8. Branch Lifecycle

```text
Draft
      │
      ▼
Configured
      │
      ▼
Active
      │
      ├────► Under Maintenance
      │
      ├────► Suspended
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

## ORG-BR-001

### Create Branch

The system shall allow an authorized administrator to create a branch.

### Fields

* Branch Code
* Branch Name (English)
* Branch Name (Arabic)
* Short Name
* Organization
* Parent Branch (optional)
* Branch Type
* Phone
* Email
* Website
* Status

### Business Rules

* Branch Code must be unique within the organization.
* Branch Name is mandatory.
* Organization is mandatory.

### Acceptance Criteria

* Branch created successfully.
* Status = Draft.
* Audit log generated.

---

## ORG-BR-002

### Configure Branch Profile

Allow administrators to configure:

* Description
* Logo
* Branch Banner
* Public Information
* Branch Services
* Contact Details

---

## ORG-BR-003

### Configure Branch Address

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

## ORG-BR-004

### Configure Branch Contacts

Support multiple contacts.

Types:

* Reception
* Admissions
* Finance
* HR
* Emergency
* Corporate Training
* General Inquiry

One contact must be marked as Primary.

---

## ORG-BR-005

### Assign Branch Manager

The system shall allow assigning one active Branch Manager.

Business Rules:

* Manager must be an active employee.
* Only one Primary Branch Manager.
* Historical manager assignments must be retained.

---

## ORG-BR-006

### Configure Branch Hierarchy

Support parent-child relationships.

Example:

```text
Head Office
      │
      ├── Muscat Branch
      │
      ├── Sohar Branch
      │
      └── Salalah Branch
```

Business Rules:

* No circular hierarchy.
* Child branch cannot have multiple parents.

---

## ORG-BR-007

### Configure Operational Settings

Settings include:

* Default Currency
* Default Language
* Time Zone
* Fiscal Year
* Academic Year
* Week Start Day
* Attendance Policy
* Working Calendar

---

## ORG-BR-008

### Configure Branch Policies

Examples:

* Admission Policy
* Attendance Policy
* Certificate Policy
* Refund Policy
* Discount Approval Policy
* Late Fee Policy

Policies should be configurable and inherited from the organization by default, with branch-level overrides where permitted.

---

## ORG-BR-009

### Activate Branch

Activation requires:

* Valid address
* Primary contact
* Branch manager assigned
* Working hours configured
* Holiday calendar assigned

---

## ORG-BR-010

### Suspend Branch

Effects:

* No new admissions.
* No new enrollments.
* No new batches.
* Existing operations remain accessible in read-only mode where appropriate.

---

## ORG-BR-011

### Close Branch

Closing a branch requires:

* No running batches.
* No active classroom schedules.
* No pending admissions.
* No unpaid critical financial transactions.
* No active trainer assignments.

The system should present dependency validation before closure.

---

## ORG-BR-012

### Archive Branch

Archiving is allowed only after successful closure.

Archived branches:

* Are excluded from operational screens.
* Remain available for historical reporting.
* Cannot be modified.

---

## ORG-BR-013

### Branch Search

Support search by:

* Branch Code
* Branch Name
* City
* Manager
* Status
* Type

---

## ORG-BR-014

### Branch Dashboard

Display:

* Active Students
* Running Batches
* Today's Attendance
* Active Trainers
* Revenue Summary
* Outstanding Fees
* Upcoming Classes
* Pending Approvals

---

# 10. Business Rules

| ID        | Rule                                                             |
| --------- | ---------------------------------------------------------------- |
| BR-BR-001 | Branch Code must be unique within an organization.               |
| BR-BR-002 | Branch belongs to exactly one organization.                      |
| BR-BR-003 | Branch must have one primary contact.                            |
| BR-BR-004 | Branch must have one active primary manager.                     |
| BR-BR-005 | Closed branches cannot create new operational records.           |
| BR-BR-006 | Archived branches are read-only.                                 |
| BR-BR-007 | Branch hierarchy cannot contain circular references.             |
| BR-BR-008 | Branch settings inherit organization defaults unless overridden. |
| BR-BR-009 | Branch cannot be deleted; only archived.                         |
| BR-BR-010 | Every operational entity must reference a valid branch.          |

---

# 11. Workflow

```text
Create Branch
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
Assign Manager
      │
      ▼
Assign Calendar
      │
      ▼
Configure Working Hours
      │
      ▼
Activate Branch
      │
      ▼
Operational
```

---

# 12. Screen Specifications

## Branch List

### Columns

* Code
* Branch Name
* City
* Manager
* Status
* Active Students
* Running Batches
* Last Updated

### Filters

* Status
* City
* Branch Type
* Manager
* Organization

### Actions

* View
* Edit
* Activate
* Suspend
* Close
* Archive

---

## Branch Details

Tabs:

1. General Information
2. Address
3. Contacts
4. Operational Settings
5. Policies
6. Calendar
7. Working Hours
8. Assigned Manager
9. Audit History

---

## Branch Hierarchy

Tree view showing parent and child branches.

---

## Branch Dashboard

Operational KPI dashboard for a single branch.

---

# 13. Validation Rules

* Branch Code must be unique.
* Branch Name is mandatory.
* Email must be valid.
* Phone must match country format.
* Latitude and Longitude must be valid.
* Parent branch cannot reference itself.
* Duplicate branch names within the same city should generate a warning (not necessarily block creation).

---

# 14. Permissions Matrix

| Permission            | Super Admin | Organization Admin | Branch Manager                        |
| --------------------- | ----------- | ------------------ | ------------------------------------- |
| View Branch           | ✓           | ✓                  | ✓ (Assigned Branch)                   |
| Create Branch         | ✓           | ✓                  | ✗                                     |
| Edit Branch           | ✓           | ✓                  | ✓ (Assigned Branch, limited settings) |
| Activate Branch       | ✓           | ✓                  | ✗                                     |
| Suspend Branch        | ✓           | ✓                  | ✗                                     |
| Close Branch          | ✓           | ✗                  | ✗                                     |
| Archive Branch        | ✓           | ✗                  | ✗                                     |
| View Branch Dashboard | ✓           | ✓                  | ✓                                     |

---

# 15. Notifications

Generate in-app notifications for:

* Branch Created
* Branch Activated
* Branch Suspended
* Branch Closed
* Branch Archived
* Branch Manager Assigned
* Operational Settings Changed

Email notifications may be enabled later based on communication module configuration.

---

# 16. Audit Requirements

Audit every change to:

* Profile
* Address
* Contacts
* Manager assignment
* Policies
* Operational settings
* Status changes

Audit records must include:

* User
* Date & Time
* Previous Value
* New Value
* IP Address
* Device Information
* Branch Context

---

# 17. Reports

* Branch Directory
* Branch Performance Summary
* Branch Contact Directory
* Branch Status Report
* Branch Manager Report
* Branch Configuration Report
* Branch Operational Readiness Report

---

# 18. Dashboard Widgets

* Total Branches
* Active Branches
* Branches Under Maintenance
* Suspended Branches
* Active Students by Branch
* Running Batches by Branch
* Revenue by Branch
* Outstanding Fees by Branch

---

# 19. Domain Events

* `BranchCreated`
* `BranchUpdated`
* `BranchManagerAssigned`
* `BranchActivated`
* `BranchSuspended`
* `BranchClosed`
* `BranchArchived`
* `BranchSettingsUpdated`
* `BranchPolicyUpdated`

---

# 20. Database Mapping

### Aggregate Root

* Branch

### Child Entities

* Branch
* BranchAddress
* BranchContact
* BranchManager
* BranchSettings
* BranchPolicy
* BranchCalendar
* BranchWorkingHours
* BranchAudit

---

# 21. API Summary

* `POST /branches`
* `GET /branches`
* `GET /branches/{branchId}`
* `PUT /branches/{branchId}`
* `PATCH /branches/{branchId}/activate`
* `PATCH /branches/{branchId}/suspend`
* `PATCH /branches/{branchId}/close`
* `PATCH /branches/{branchId}/archive`
* `GET /branches/{branchId}/dashboard`
* `GET /branches/hierarchy`

---

# 22. Acceptance Criteria (BDD)

### Scenario: Create Branch

**Given** an authenticated Organization Administrator with branch creation permission
**When** they provide valid branch details and submit the form
**Then** the system creates the branch in **Draft** status and records an audit entry.

### Scenario: Activate Branch

**Given** a branch has completed its mandatory configuration (address, primary contact, manager, calendar, and working hours)
**When** the administrator selects **Activate**
**Then** the branch status changes to **Active**, becomes available for operational modules, and a `BranchActivated` domain event is published.

---

## Design Recommendations (v3.1)

To make Branch Management enterprise-ready, I recommend:

* **Branch capability flags** (e.g., `supportsCorporateTraining`, `supportsWalkInAdmissions`, `supportsOnlineRegistration`, `supportsCertification`) so future business expansion can be enabled without code changes.
* **Branch operational metrics** (maximum students, maximum concurrent batches, classroom utilization targets) to support dashboards and future AI forecasting.
* **Branch-level feature toggles** for gradual rollout of modules such as Finance, Corporate Training, or AI capabilities.
* **Effective-date configuration** so policy and settings changes can be scheduled instead of taking effect immediately.
* **Complete inheritance model**, where organization defaults cascade to branches unless an explicit branch override exists, ensuring consistent configuration with minimal duplication.
