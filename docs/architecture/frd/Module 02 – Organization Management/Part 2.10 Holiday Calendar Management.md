# Module 02.10 — Holiday Calendar Management

**Module Code:** `ORG-HOL`
**Version:** 3.0
**Bounded Context:** Organization Management
**Priority:** High for Scheduling & Operations
**Dependencies:** Organization Management, Branch Management, Working Hours Management
**Dependent Modules:** Scheduling, Batch Management, Attendance, Website Course Calendar, HRMS future

---

# 1. Purpose

Holiday Calendar Management defines non-working days, public holidays, branch closures, and special calendar exceptions that affect training operations.

It ensures that ASTI does not accidentally schedule:

* Classes on public holidays
* Exams on closed days
* Training sessions during branch closures
* Corporate batches during unavailable dates

---

# 2. Business Objectives

The system shall allow administrators to:

* Configure organization-level holiday calendars
* Configure branch-specific holiday calendars
* Import Oman public holidays
* Add custom holidays
* Add emergency closures
* Support Ramadan / Eid calendar exceptions
* Validate schedules against holidays
* Display upcoming holidays to staff and students

---

# 3. Scope

## Included

* Organization holiday calendar
* Branch holiday calendar
* Public holiday setup
* Custom holiday setup
* Emergency closure
* Recurring holiday support
* Holiday calendar import
* Scheduling validation
* Holiday notifications

## Excluded

* Employee leave management
* Payroll holiday calculation
* Staff shift planning

These are HRMS / Payroll future-phase items.

---

# 4. Actors

| Actor              | Responsibility                         |
| ------------------ | -------------------------------------- |
| Super Admin        | Full control                           |
| Organization Admin | Manage organization holiday calendars  |
| Branch Manager     | Manage branch-level holiday exceptions |
| Scheduler          | View holidays and schedule accordingly |
| Trainer            | View holiday calendar                  |
| Student            | View public training holidays          |
| Website            | Display public course calendar         |
| HRMS future        | Consume holiday data                   |

---

# 5. Business Capabilities

1. Holiday Calendar Creation
2. Oman Public Holiday Management
3. Branch Holiday Override
4. Emergency Closure Management
5. Recurring Holiday Management
6. Schedule Validation
7. Holiday Display
8. Holiday Audit

---

# 6. Aggregate Design

## Aggregate Root

```text
HolidayCalendar
```

## Child Entities

```text
HolidayDate
HolidayOverride
HolidayImportBatch
HolidayAudit
```

---

# 7. Entity Model

```text
Organization
      │
      ├── Default Holiday Calendar
      │
      ▼
Branch
      │
      ├── Inherited Calendar
      ├── Branch Holiday Override
      ├── Emergency Closure
      └── Special Working Holiday
```

---

# 8. Holiday Calendar Lifecycle

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

## ORG-HOL-001 — Create Holiday Calendar

The system shall allow creation of a holiday calendar.

### Fields

* Calendar Name
* Calendar Year
* Country
* Scope Type: Organization / Branch
* Branch optional
* Status

### Business Rules

* Calendar year is mandatory.
* Country is mandatory.
* Scope type is mandatory.
* Branch is mandatory if scope type is Branch.
* Only one active default calendar per scope and year is allowed.

---

## ORG-HOL-002 — Add Holiday Date

The system shall allow users to add a holiday date.

### Fields

* Holiday Name English
* Holiday Name Arabic
* Holiday Date
* Holiday Type
* Is Full Day
* Start Time optional
* End Time optional
* Is Recurring
* Is Public Visible
* Notes

Holiday Types:

```text
Public Holiday
Religious Holiday
National Holiday
Branch Holiday
Emergency Closure
Maintenance Closure
Special Non-Working Day
```

---

## ORG-HOL-003 — Import Oman Public Holidays

The system shall allow importing Oman public holidays for a selected year.

### Business Rules

* Imported holidays should be marked as `Public Holiday`.
* Admin must review before activation.
* Duplicate dates should be detected.
* Holidays can be edited after import.

---

## ORG-HOL-004 — Branch Holiday Override

Branches may override organization holidays.

Examples:

* Branch closed for maintenance
* Branch open on a normal holiday for corporate training
* Branch-specific local closure

Override Types:

```text
Add Holiday
Remove Holiday
Mark As Working Day
Change Working Hours
```

---

## ORG-HOL-005 — Emergency Closure

The system shall allow emergency closures.

Examples:

* Weather closure
* Government instruction
* Utility outage
* Building maintenance
* Safety incident

Effects:

* New sessions cannot be scheduled.
* Existing future sessions should be flagged.
* Scheduler and Branch Manager notified.

---

## ORG-HOL-006 — Special Working Holiday

The system shall support marking a public holiday as a working day for specific situations.

Examples:

* Corporate training requested on a holiday
* Weekend special batch
* Urgent certification program

Business Rule:

* Special working holiday requires approval.

---

## ORG-HOL-007 — Validate Scheduling Against Holidays

When scheduling a session, the system shall check:

1. Branch-specific calendar
2. Organization default calendar
3. Special working holiday override
4. Working hours profile
5. Venue block
6. Classroom availability

If the selected date is a non-working holiday, the system shall block scheduling unless approved override exists.

---

## ORG-HOL-008 — Holiday Visibility

Holiday calendar should be visible to:

* Administrators
* Branch Managers
* Trainers
* Schedulers
* Students where public
* Website where public

---

## ORG-HOL-009 — Duplicate Holiday Detection

The system shall detect duplicate holidays by:

* Date
* Calendar
* Branch scope
* Holiday type

Duplicates should trigger warning or block based on configuration.

---

## ORG-HOL-010 — Archive Holiday Calendar

A calendar may be archived only when:

* It is not active.
* It is not used for future scheduling validation.
* Replacement active calendar exists if the year is current or future.

---

# 10. Business Rules

| ID         | Rule                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| BR-HOL-001 | One active default holiday calendar per organization per year.          |
| BR-HOL-002 | Branch may inherit organization holiday calendar.                       |
| BR-HOL-003 | Branch override takes priority over organization calendar.              |
| BR-HOL-004 | Emergency closure has highest priority.                                 |
| BR-HOL-005 | Public holiday can be marked as working day only with approval.         |
| BR-HOL-006 | Scheduling must validate against final resolved holiday state.          |
| BR-HOL-007 | Holiday dates cannot be physically deleted after use; only deactivated. |
| BR-HOL-008 | Calendar archive requires replacement calendar for current/future year. |
| BR-HOL-009 | Public visible holidays may be shown on website and student portal.     |
| BR-HOL-010 | Emergency closure must generate notifications.                          |

---

# 11. Holiday Resolution Priority

```text
Emergency Closure
      ↓ if not present
Branch Holiday Override
      ↓ if not present
Special Working Holiday Approval
      ↓ if not present
Organization Holiday Calendar
      ↓ if not present
Working Hours Profile
```

The system must resolve the final calendar state using this hierarchy.

---

# 12. Workflow

```text
Create Holiday Calendar
      ↓
Import / Add Holidays
      ↓
Review Calendar
      ↓
Activate Calendar
      ↓
Apply to Branches
      ↓
Validate Scheduling
      ↓
Display Public Holidays
```

---

# 13. Screen Specifications

## Holiday Calendar List

Columns:

* Calendar Name
* Year
* Country
* Scope
* Branch
* Total Holidays
* Status
* Last Updated

Filters:

* Year
* Country
* Branch
* Status
* Holiday Type

Actions:

* View
* Edit
* Import
* Activate
* Deactivate
* Archive

---

## Holiday Calendar Details

Tabs:

1. General Information
2. Holiday Dates
3. Branch Overrides
4. Emergency Closures
5. Public Visibility
6. Audit History

---

## Holiday Date Editor

Fields:

* Holiday Name English
* Holiday Name Arabic
* Date
* Type
* Full Day / Partial Day
* Public Visible
* Recurring
* Notes

---

## Calendar View

Monthly calendar view with:

* Public holidays
* Branch holidays
* Closures
* Working holiday overrides
* Emergency closures

---

# 14. Validation Rules

* Calendar name is mandatory.
* Year is mandatory.
* Country is mandatory.
* Holiday date is mandatory.
* Holiday name is mandatory.
* Branch is mandatory for branch calendar.
* Partial-day holiday must have start and end time.
* End time must be after start time.
* Duplicate active holiday date in same scope should be blocked or warned.
* Cannot archive active calendar.
* Cannot deactivate current-year calendar without replacement.

---

# 15. Permissions Matrix

| Permission             | Super Admin | Org Admin | Branch Manager | Scheduler |
| ---------------------- | ----------- | --------- | -------------- | --------- |
| View Calendar          | ✓           | ✓         | ✓              | ✓         |
| Create Calendar        | ✓           | ✓         | ✗              | ✗         |
| Add Holiday            | ✓           | ✓         | ✓              | ✗         |
| Import Public Holidays | ✓           | ✓         | ✗              | ✗         |
| Add Emergency Closure  | ✓           | ✓         | ✓              | ✗         |
| Mark Working Holiday   | ✓           | ✓         | ✗              | ✗         |
| Activate Calendar      | ✓           | ✓         | ✗              | ✗         |
| Archive Calendar       | ✓           | ✗         | ✗              | ✗         |

---

# 16. Notifications

Generate notifications for:

* Holiday calendar activated
* New holiday added
* Emergency closure created
* Branch override added
* Special working holiday approved
* Calendar archived

Notify affected users when future sessions overlap a new holiday or closure:

* Scheduler
* Branch Manager
* Trainers
* Students where applicable

---

# 17. Audit Requirements

Audit all changes to:

* Calendar profile
* Holiday dates
* Branch overrides
* Emergency closures
* Public visibility
* Activation/deactivation
* Archive action

Audit must capture:

* User
* Timestamp
* Old value
* New value
* Reason
* Scope
* Branch
* IP address

---

# 18. Reports

* Holiday Calendar Report
* Branch Holiday Report
* Emergency Closure Report
* Public Holiday Report
* Schedule Conflict Due to Holiday Report
* Holiday Override Report

---

# 19. Dashboard Widgets

* Upcoming Holidays
* Active Holiday Calendars
* Branch Closures This Month
* Emergency Closures
* Sessions Affected by Holidays
* Special Working Holidays

---

# 20. Domain Events

```text
HolidayCalendarCreated
HolidayCalendarActivated
HolidayDateAdded
HolidayDateUpdated
HolidayDateDeactivated
PublicHolidaysImported
BranchHolidayOverrideAdded
EmergencyClosureCreated
SpecialWorkingHolidayApproved
HolidayCalendarArchived
```

---

# 21. Database Mapping

## Aggregate Root

```text
HolidayCalendar
```

## Suggested Tables

```text
holiday_calendars
holiday_dates
holiday_overrides
holiday_import_batches
holiday_audit_logs
```

### Key Fields: `holiday_calendars`

```text
id
scopeType
organizationId
branchId
calendarName
calendarYear
countryCode
status
isDefault
createdAt
createdBy
updatedAt
updatedBy
deletedAt
version
```

### Key Fields: `holiday_dates`

```text
id
calendarId
holidayName
holidayNameLocalized
holidayDate
holidayType
isFullDay
startTime
endTime
isRecurring
isPublicVisible
status
notes
```

### Key Fields: `holiday_overrides`

```text
id
calendarId
branchId
holidayDate
overrideType
isWorkingDay
workingStartTime
workingEndTime
reason
approvalRequestId
status
```

---

# 22. API Summary

```text
POST   /holiday-calendars
GET    /holiday-calendars
GET    /holiday-calendars/{calendarId}
PUT    /holiday-calendars/{calendarId}
PATCH  /holiday-calendars/{calendarId}/activate
PATCH  /holiday-calendars/{calendarId}/deactivate
PATCH  /holiday-calendars/{calendarId}/archive

POST   /holiday-calendars/{calendarId}/dates
PUT    /holiday-calendars/{calendarId}/dates/{holidayDateId}
PATCH  /holiday-calendars/{calendarId}/dates/{holidayDateId}/deactivate

POST   /holiday-calendars/{calendarId}/import/oman-public-holidays
POST   /holiday-calendars/{calendarId}/overrides
POST   /holiday-calendars/{calendarId}/emergency-closures

GET    /branches/{branchId}/holiday-calendar/resolved
POST   /holiday-calendars/validate-session-date
```

---

# 23. Acceptance Criteria

## Scenario: Create Holiday Calendar

**Given** an authorized Organization Administrator is logged in
**When** they create a calendar for Oman, year 2026
**Then** the system creates the calendar in Draft status and records an audit entry.

## Scenario: Block Schedule on Holiday

**Given** a branch has an active public holiday on a selected date
**When** a scheduler tries to create a training session on that date
**Then** the system blocks scheduling unless a valid special working holiday approval exists.

## Scenario: Emergency Closure

**Given** an active branch has scheduled sessions tomorrow
**When** the Branch Manager creates an emergency closure for tomorrow
**Then** the system flags affected sessions and notifies scheduler, trainers, and branch manager.

---

# 24. Design Recommendation

For ASTI Phase 1, implement:

```text
Organization holiday calendar
Branch overrides
Manual holiday entry
Emergency closure
Scheduling validation
```

Oman public holiday auto-import can be added later or maintained manually in the master-data workbook.

Keep holiday logic integrated with **Working Hours Management** and **Scheduling** from the start, because this is essential for avoiding invalid batch/session planning.
