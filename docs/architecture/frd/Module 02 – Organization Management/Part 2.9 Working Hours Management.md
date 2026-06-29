# Module 02.9 — Working Hours Management

**Module Code:** `ORG-WH`
**Version:** 3.0
**Bounded Context:** Organization Management
**Priority:** High for Scheduling & Operations
**Dependencies:** Organization, Branch Management
**Dependent Modules:** Scheduling, Batch Management, Attendance, Website Course Calendar, HRMS future

---

# 1. Purpose

Working Hours Management defines when ASTI branches, classrooms, departments, and operational teams are available for business and training activities.

It supports:

* Branch operating hours
* Training session scheduling
* Reception/admission availability
* Weekend training
* Ramadan working hours
* Special working day exceptions
* Future trainer/employee working calendars

---

# 2. Business Objectives

The system shall allow administrators to:

* Configure standard working hours
* Configure branch-specific working hours
* Define weekend and non-working days
* Define special working hours
* Support Ramadan or seasonal schedules
* Validate batch/session schedules against working hours
* Support public website training calendar availability

---

# 3. Scope

## Included

* Organization working hours
* Branch working hours
* Day-wise open/close configuration
* Break time configuration
* Special working hours
* Seasonal working hours
* Effective date-based rules
* Scheduling validation

## Excluded

* Staff shift roster
* Payroll attendance calculation
* Trainer-specific availability
* Biometric attendance

---

# 4. Actors

| Actor              | Responsibility                         |
| ------------------ | -------------------------------------- |
| Super Admin        | Full control                           |
| Organization Admin | Manage organization-wide working hours |
| Branch Manager     | Manage own branch hours                |
| Scheduler          | View working hours for scheduling      |
| Receptionist       | View operating hours                   |
| Website            | Display branch/course calendar         |
| HRMS future        | Consume working hour rules             |

---

# 5. Business Capabilities

1. Working Hours Template Management
2. Organization Default Working Hours
3. Branch Working Hours Override
4. Day-wise Availability
5. Break Time Definition
6. Seasonal Schedule Definition
7. Special Day Override
8. Scheduling Validation
9. Working Hours Audit

---

# 6. Aggregate Design

## Aggregate Root

```text
WorkingHoursProfile
```

## Child Entities

```text
WorkingDayRule
BreakTimeRule
SpecialWorkingDay
SeasonalWorkingHours
WorkingHoursAudit
```

---

# 7. Entity Model

```text
Organization
      │
      ├── Default Working Hours
      │
      ▼
Branch
      │
      ├── Inherited Working Hours
      ├── Branch Override
      ├── Seasonal Schedule
      └── Special Day Override
```

---

# 8. Working Hours Lifecycle

```text
Draft
   ↓
Active
   ├── Scheduled
   ├── Inactive
   ↓
Archived
```

---

# 9. Functional Requirements

## ORG-WH-001 — Create Working Hours Profile

The system shall allow creation of a working hours profile.

### Fields

* Profile Name
* Scope Type: Organization / Branch
* Organization
* Branch optional
* Effective From
* Effective To optional
* Timezone
* Status

### Business Rules

* Profile name is mandatory.
* Effective From is mandatory.
* Timezone is mandatory.
* Only one active default working hours profile per scope is allowed for the same effective period.

---

## ORG-WH-002 — Configure Day-wise Working Hours

For each weekday, configure:

* Is Working Day
* Opening Time
* Closing Time
* Session Start Allowed
* Session End Allowed
* Notes

Example:

```text
Sunday    08:00 AM - 05:00 PM
Monday    08:00 AM - 05:00 PM
Tuesday   08:00 AM - 05:00 PM
Wednesday 08:00 AM - 05:00 PM
Thursday  08:00 AM - 05:00 PM
Friday    Closed
Saturday  Weekend Batch Only
```

---

## ORG-WH-003 — Configure Break Times

The system shall allow one or more break periods per working day.

Examples:

* Lunch break
* Prayer break
* Staff break

Business Rules:

* Break start must be after opening time.
* Break end must be before closing time.
* Break periods must not overlap.

---

## ORG-WH-004 — Branch Working Hours Override

The system shall allow branches to override organization working hours.

Rules:

* If branch has active working hours profile, use branch profile.
* If not, inherit organization default profile.
* Override must be effective date-based.

---

## ORG-WH-005 — Configure Seasonal Working Hours

Support temporary schedules such as:

* Ramadan hours
* Summer schedule
* Exam season schedule
* Special training season

Fields:

* Season Name
* Start Date
* End Date
* Day-wise hours
* Notes

---

## ORG-WH-006 — Configure Special Working Day

The system shall allow one-time exceptions.

Examples:

* Extra working Saturday
* Half-day operation
* Late evening corporate session
* Emergency closure

Fields:

* Date
* Is Working Day
* Opening Time
* Closing Time
* Reason
* Approval Reference

---

## ORG-WH-007 — Validate Session Scheduling

When a batch session is scheduled, the system shall validate:

* Branch working hours
* Seasonal working hours
* Special day overrides
* Holiday calendar
* Venue block
* Classroom availability
* Trainer availability

If session is outside allowed working hours, the system shall block or require override approval.

---

## ORG-WH-008 — Public Display Rules

Working hours may be displayed on:

* Website contact page
* Branch page
* Course schedule page

Only active public working hour profiles should be displayed.

---

## ORG-WH-009 — Deactivate Working Hours Profile

The system shall allow deactivation only when:

* No future schedules depend exclusively on it, or
* Replacement profile exists.

---

## ORG-WH-010 — Working Hours Search

Search/filter by:

* Scope type
* Branch
* Status
* Effective date
* Timezone

---

# 10. Business Rules

| ID        | Rule                                                                                  |
| --------- | ------------------------------------------------------------------------------------- |
| BR-WH-001 | Organization must have one default working hours profile.                             |
| BR-WH-002 | Branch may override organization working hours.                                       |
| BR-WH-003 | Effective date ranges must not overlap for same scope.                                |
| BR-WH-004 | Opening time must be before closing time.                                             |
| BR-WH-005 | Break times must fall within working hours.                                           |
| BR-WH-006 | Break times must not overlap.                                                         |
| BR-WH-007 | Special day override has highest priority.                                            |
| BR-WH-008 | Seasonal working hours override standard profile.                                     |
| BR-WH-009 | Holiday calendar overrides working hours unless explicitly marked as working holiday. |
| BR-WH-010 | Scheduling must validate against the final resolved working-hour rule.                |

---

# 11. Resolution Priority

```text
Special Day Override
      ↓ if not available
Holiday Calendar
      ↓ if not holiday
Seasonal Working Hours
      ↓ if not available
Branch Working Hours
      ↓ if not available
Organization Default Working Hours
```

The system must resolve working hours using this hierarchy.

---

# 12. Workflow

```text
Create Working Hours Profile
      ↓
Configure Day-wise Hours
      ↓
Configure Breaks
      ↓
Set Effective Period
      ↓
Activate Profile
      ↓
Use for Scheduling Validation
```

---

# 13. Screen Specifications

## Working Hours List

Columns:

* Profile Name
* Scope
* Branch
* Effective From
* Effective To
* Status
* Timezone

Filters:

* Scope
* Branch
* Status
* Effective Date

Actions:

* View
* Edit
* Activate
* Deactivate
* Clone
* Archive

---

## Working Hours Details

Tabs:

1. General Information
2. Weekly Schedule
3. Break Times
4. Seasonal Rules
5. Special Days
6. Audit History

---

## Weekly Schedule Editor

Grid:

| Day | Working? | Open | Close | Breaks | Notes |
| --- | -------- | ---- | ----- | ------ | ----- |

---

# 14. Validation Rules

* Profile name is mandatory.
* Scope type is mandatory.
* Branch is mandatory if scope is Branch.
* Opening time must be before closing time.
* Break start/end must be inside working hours.
* Effective From must be before Effective To.
* Duplicate active profiles for same scope and same period are not allowed.
* Special day date must be unique per branch/profile.

---

# 15. Permissions Matrix

| Permission             | Super Admin | Org Admin | Branch Manager | Scheduler |
| ---------------------- | ----------- | --------- | -------------- | --------- |
| View Working Hours     | ✓           | ✓         | ✓              | ✓         |
| Create Org Default     | ✓           | ✓         | ✗              | ✗         |
| Create Branch Override | ✓           | ✓         | ✓              | ✗         |
| Edit Working Hours     | ✓           | ✓         | ✓              | ✗         |
| Activate Working Hours | ✓           | ✓         | ✓              | ✗         |
| Add Special Day        | ✓           | ✓         | ✓              | ✗         |
| View Resolved Hours    | ✓           | ✓         | ✓              | ✓         |
| Archive Profile        | ✓           | ✗         | ✗              | ✗         |

---

# 16. Notifications

Generate notifications for:

* Working hours profile created
* Working hours profile activated
* Branch working hours changed
* Seasonal schedule activated
* Special day override added
* Working hours deactivated

Notify Scheduler and Branch Manager when changes affect future sessions.

---

# 17. Audit Requirements

Audit:

* Working hours profile changes
* Weekly schedule changes
* Break changes
* Seasonal schedule changes
* Special day overrides
* Activation/deactivation

Each audit record must include:

* User
* Timestamp
* Old value
* New value
* Scope
* Branch
* Reason

---

# 18. Reports

* Organization Working Hours Report
* Branch Working Hours Report
* Seasonal Schedule Report
* Special Day Override Report
* Schedule Outside Working Hours Report

---

# 19. Dashboard Widgets

* Active Working Hour Profiles
* Branches with Custom Hours
* Upcoming Special Working Days
* Seasonal Schedule Active
* Scheduling Exceptions

---

# 20. Domain Events

```text
WorkingHoursProfileCreated
WorkingHoursProfileActivated
WorkingHoursProfileUpdated
WorkingHoursProfileDeactivated
BranchWorkingHoursOverridden
SeasonalWorkingHoursConfigured
SpecialWorkingDayAdded
WorkingHoursResolved
```

---

# 21. Database Mapping

## Aggregate Root

```text
WorkingHoursProfile
```

## Suggested Tables

```text
working_hours_profiles
working_day_rules
break_time_rules
seasonal_working_hours
special_working_days
working_hours_audit_logs
```

### Key Fields: `working_hours_profiles`

```text
id
scopeType
organizationId
branchId
profileName
timezone
effectiveFrom
effectiveTo
status
isPublicVisible
createdAt
createdBy
updatedAt
updatedBy
deletedAt
version
```

### Key Fields: `working_day_rules`

```text
id
profileId
dayOfWeek
isWorkingDay
openingTime
closingTime
sessionStartAllowed
sessionEndAllowed
notes
```

### Key Fields: `break_time_rules`

```text
id
workingDayRuleId
breakName
startTime
endTime
isSchedulingBlocked
```

---

# 22. API Summary

```text
POST   /working-hours
GET    /working-hours
GET    /working-hours/{profileId}
PUT    /working-hours/{profileId}
PATCH  /working-hours/{profileId}/activate
PATCH  /working-hours/{profileId}/deactivate
PATCH  /working-hours/{profileId}/archive

POST   /working-hours/{profileId}/weekly-rules
POST   /working-hours/{profileId}/breaks
POST   /working-hours/{profileId}/seasonal-rules
POST   /working-hours/{profileId}/special-days

GET    /branches/{branchId}/working-hours/resolved
POST   /working-hours/validate-session
```

---

# 23. Acceptance Criteria

## Scenario: Resolve Branch Working Hours

**Given** a branch has its own active working hours profile
**When** a session is scheduled for that branch
**Then** the system uses the branch profile instead of organization defaults.

## Scenario: Apply Ramadan Working Hours

**Given** Ramadan seasonal working hours are active
**When** a class is scheduled during Ramadan
**Then** the system validates the schedule against Ramadan hours.

## Scenario: Block Session Outside Working Hours

**Given** branch working hours end at 5:00 PM
**When** a scheduler tries to create a class from 6:00 PM to 8:00 PM
**Then** the system blocks the session or requires override approval.

---

# 24. Design Recommendation

Working Hours Management should be implemented before Scheduling and Batch Management.

For ASTI Phase 1, implement:

```text
Organization default working hours
Branch override
Weekly schedule
Special day override
Holiday calendar integration
```

Keep trainer-specific shifts and payroll working-hour calculations for HRMS/Payroll future phase.
