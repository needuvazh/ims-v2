# Module 07: Scheduling, Calendar & Holiday Management

## Document Control

| Field | Value |
|---|---|
| Product | Al Saud Training Institute Integrated Institute Management System |
| Module | Module 07 – Scheduling, Calendar & Holiday Management |
| Module Code | SCH |
| Architecture Style | Next.js modular monolith, single admin portal first |
| Primary Owning Context | Scheduling, Calendar & Holiday Management |
| Supporting Context Type | Supporting Domain |
| Version | 1.0 |
| Timezone Default | Oman GST, UTC+04:00 |
| Localization | English and Arabic labels for calendar names, holiday names, venue block reasons, UI messages, and report labels |
| Data Protection Baseline | Branch-scoped access, soft delete, audit logging, optimistic locking |

## 1. Purpose and Objective

The Scheduling, Calendar & Holiday Management module governs how ASTI plans and protects training time, classroom usage, trainer availability, branch calendars, public holidays, and operational blocking periods. It ensures that sessions are scheduled only when the selected batch, trainer, classroom, and branch calendar are compatible.

This module does not own enrollment, attendance, course catalog, trainer master data, or classroom master data. It coordinates with those modules and owns the timetable-level scheduling decisions, conflict checks, business calendars, holiday definitions, and venue blocking rules.

The primary objective is to provide a reliable scheduling engine for the admin portal that prevents operational conflicts before they affect learners, trainers, finance, certificates, or reporting.

### Core Objectives

1. Maintain branch-level business calendars for Oman and ASTI-specific operating days.
2. Maintain official holidays, special holidays, non-training days, and branch closure days.
3. Allow authorized users to create, update, publish, cancel, and reschedule training sessions.
4. Prevent trainer double booking, classroom double booking, batch time overlap, holiday conflicts, and venue block conflicts.
5. Enforce branch isolation during all schedule reads, writes, exports, dashboards, and conflict checks.
6. Support manual scheduling in Phase 1 without external calendar synchronization.
7. Provide an auditable trail of all schedule changes, cancellations, holiday updates, and venue block changes.
8. Produce schedule data consumed by Attendance, Training Delivery, Reporting, Communication, and future portal views.

## 2. Business Goals

| Goal ID | Business Goal | Success Measure |
|---|---|---|
| BO-SCH-001 | Prevent scheduling conflicts before sessions are confirmed. | 100% of published sessions pass trainer, classroom, batch, holiday, and venue block validation. |
| BO-SCH-002 | Improve operational visibility across branches. | Branch coordinators can view daily, weekly, and monthly schedules filtered by branch, course, batch, trainer, classroom, and status. |
| BO-SCH-003 | Reduce manual coordination effort for batch planning. | Coordinators can generate and validate recurring session schedules for a batch from a single scheduling flow. |
| BO-SCH-004 | Protect non-working days and ASTI closure periods. | Published sessions cannot be created on active holidays, business calendar closures, or active venue blocks unless an authorized override is captured with reason and audit. |
| BO-SCH-005 | Support multi-branch scheduling with strict data isolation. | Users can access only schedules, calendars, holidays, and venue blocks for assigned branches unless consolidated reporting permission is granted. |
| BO-SCH-006 | Enable downstream attendance readiness. | Attendance sessions can be derived from published schedule sessions without re-entering timetable details. |
| BO-SCH-007 | Support bilingual operations. | Calendar, holiday, venue block, and schedule-facing labels support English and Arabic display where required. |
| BO-SCH-008 | Maintain a complete compliance trail. | All create, update, cancel, override, delete, publish, and conflict-bypass attempts are recorded in AuditLog. |
| BO-SCH-009 | Improve classroom utilization planning. | Authorized users can view utilization by classroom, branch, date range, and time slot. |
| BO-SCH-010 | Improve trainer utilization planning. | Authorized users can view trainer schedule load by trainer, branch, date range, course, and batch. |

## 3. Scope

### 3.1 Included Scope

1. Business calendar setup per branch and year.
2. Holiday creation, update, activation, deactivation, and soft deletion.
3. Venue block creation, update, activation, deactivation, and soft deletion.
4. Classroom time blocking through venue blocks.
5. Branch-wide blocking through venue blocks without classroom assignment.
6. Schedule session creation for batches.
7. Single-session scheduling.
8. Bulk recurring session scheduling for a batch.
9. Session rescheduling.
10. Session cancellation.
11. Schedule publishing.
12. Conflict checking before draft save, publish, and reschedule.
13. Trainer double-booking prevention.
14. Classroom double-booking prevention.
15. Batch overlap prevention.
16. Holiday and non-working day validation.
17. Venue blocked-date and blocked-time validation.
18. Trainer availability validation using Trainer Management data.
19. Classroom status and capacity reference checks using Organization Management data.
20. Branch calendar read-only visibility for authorized users.
21. Daily, weekly, monthly, trainer, classroom, and batch schedule views.
22. Conflict report view.
23. Schedule export for permitted users.
24. Audit logging for sensitive scheduling actions.
25. Branch-scoped access enforcement for all reads and writes.
26. Bilingual labels for calendars, holidays, and UI messages.
27. Oman timezone default for all calendar and schedule operations.
28. Soft deletion and effective dating for calendars, holidays, and venue blocks.
29. Optimistic locking on schedule sessions, calendars, holidays, and venue blocks.
30. Cross-module data contracts for Training Delivery, Attendance, Trainer Management, Organization Management, Communication, Reporting, and Audit.

### 3.2 Excluded Scope

1. External Google Calendar, Outlook Calendar, Apple Calendar, or iCal synchronization.
2. Public student self-service schedule booking.
3. Trainer self-service availability submission from a trainer portal.
4. Automated AI timetable optimization.
5. Biometric attendance integration.
6. Payroll shift scheduling.
7. HR staff roster scheduling.
8. Lab management and lab equipment reservation.
9. Transport scheduling.
10. Hostel or accommodation scheduling.
11. Online meeting provider provisioning.
12. Payment collection, invoice generation, or refund processing.
13. Course creation, course pricing, and completion rule configuration.
14. Enrollment creation or batch capacity enforcement ownership.
15. Certificate generation.
16. CMS editing of public website schedule pages.
17. Event broker, external message queue, CQRS, event sourcing, or microservice architecture.

## 4. Stakeholders and Actors

### 4.1 Human Actors

| Actor | Type | Responsibilities |
|---|---|---|
| Super Admin | Internal | Configure global permissions, view all branches where assigned, resolve escalated scheduling issues. |
| Branch Manager | Internal | Approve branch schedule exceptions, view branch timetable, approve holiday/venue override where policy allows. |
| Academic Coordinator | Internal | Create batch schedules, assign timetable sessions, reschedule sessions, publish schedules, review conflicts. |
| Training Coordinator | Internal | Manage daily timetable, coordinate trainers and classrooms, cancel or reschedule sessions with reason. |
| Trainer | Internal/External | View assigned session schedule, receive schedule changes, participate in attendance workflow. |
| Counselor | Internal | View batch schedule availability during enrollment guidance. |
| Finance Officer | Internal | View schedule references related to invoiced enrollments and training delivery dates. |
| Reception / Front Desk User | Internal | View today's schedule and classroom occupancy for walk-in coordination. |
| Reporting User | Internal | View branch schedule reports, classroom utilization, and trainer utilization based on permission. |
| Corporate Coordinator | External/Future Portal | View corporate training schedule for nominated participants in future corporate portal phase. |
| Student / Participant | External/Future Portal | View enrolled batch schedule in future student portal phase. |

### 4.2 System Actors

| System Actor | Responsibility |
|---|---|
| Identity & Access Module | Authenticates users, resolves permissions, resolves assigned branch context, and enforces branch access. |
| Organization Management Module | Provides branch, classroom, and department references. |
| Training Delivery Module | Provides batch, course, session ownership context, batch status, batch date range, and enrolled batch references. |
| Trainer Management Module | Provides trainer profile, branch association, course authorization, and availability records. |
| Attendance Module | Consumes published schedule sessions to create attendance sessions and attendance marking screens. |
| Communication & Notification Module | Sends schedule created, updated, cancelled, and reminder notifications when enabled. |
| Reporting & Dashboards Module | Consumes schedule snapshots, utilization metrics, conflict data, and status summaries. |
| Audit & Compliance Module | Records sensitive schedule, holiday, calendar, and venue block changes. |
| Configuration / Master Data Module | Provides lookup values for schedule status, holiday type, block reason, cancellation reason, and operating day rules. |

## 5. Functional Overview

```text
Module 07 – Scheduling, Calendar & Holiday Management
│
├── 07.01 Business Calendar Management
│   ├── Create branch calendar
│   ├── Configure operating days
│   ├── Configure working hours
│   ├── Configure yearly calendar status
│   └── Maintain localized calendar names
│
├── 07.02 Holiday Management
│   ├── Create holiday
│   ├── Update holiday
│   ├── Activate / deactivate holiday
│   ├── Soft delete holiday
│   ├── Branch holiday view
│   └── Holiday conflict validation
│
├── 07.03 Venue Block Management
│   ├── Branch-wide block
│   ├── Classroom-specific block
│   ├── Partial-day block
│   ├── Full-day block
│   ├── Update block
│   ├── Cancel block
│   └── Block conflict validation
│
├── 07.04 Schedule Session Management
│   ├── Create single schedule session
│   ├── Create recurring batch schedule
│   ├── Save draft schedule
│   ├── Publish schedule
│   ├── Reschedule session
│   ├── Cancel session
│   ├── Soft delete draft session
│   └── View session details
│
├── 07.05 Conflict Detection Engine
│   ├── Trainer double booking check
│   ├── Classroom double booking check
│   ├── Batch overlap check
│   ├── Holiday conflict check
│   ├── Venue block conflict check
│   ├── Trainer availability check
│   └── Branch scope validation
│
├── 07.06 Schedule Views and Search
│   ├── Daily view
│   ├── Weekly view
│   ├── Monthly view
│   ├── Trainer timetable view
│   ├── Classroom timetable view
│   ├── Batch timetable view
│   └── Conflict report view
│
├── 07.07 Schedule Export and Reports
│   ├── Export branch timetable
│   ├── Export trainer timetable
│   ├── Export classroom timetable
│   ├── Export batch timetable
│   ├── Classroom utilization summary
│   └── Trainer utilization summary
│
└── 07.08 Audit, Security and Compliance
    ├── Branch access enforcement
    ├── Permission enforcement
    ├── Schedule change audit
    ├── Holiday change audit
    ├── Venue block audit
    ├── Override reason capture
    └── Soft delete audit
```

## 6. Business Capabilities and User Types

| Capability ID | Capability | Primary Users | Internal / External |
|---|---|---|---|
| CAP-SCH-001 | Maintain branch business calendars | Super Admin, Branch Manager | Internal |
| CAP-SCH-002 | Maintain holiday calendar | Super Admin, Branch Manager, Academic Coordinator | Internal |
| CAP-SCH-003 | Block venue or classroom availability | Branch Manager, Academic Coordinator, Training Coordinator | Internal |
| CAP-SCH-004 | Create draft schedule session | Academic Coordinator, Training Coordinator | Internal |
| CAP-SCH-005 | Bulk-generate recurring sessions | Academic Coordinator | Internal |
| CAP-SCH-006 | Validate schedule conflicts | Academic Coordinator, Training Coordinator, System | Internal/System |
| CAP-SCH-007 | Publish schedule | Academic Coordinator, Branch Manager | Internal |
| CAP-SCH-008 | Reschedule published session | Academic Coordinator, Training Coordinator, Branch Manager | Internal |
| CAP-SCH-009 | Cancel published session | Academic Coordinator, Branch Manager | Internal |
| CAP-SCH-010 | View daily operations timetable | Reception, Training Coordinator, Branch Manager | Internal |
| CAP-SCH-011 | View trainer timetable | Trainer, Academic Coordinator, Branch Manager | Internal/Internal-External Trainer |
| CAP-SCH-012 | View classroom timetable | Training Coordinator, Branch Manager | Internal |
| CAP-SCH-013 | Export schedules | Branch Manager, Reporting User | Internal |
| CAP-SCH-014 | Review utilization reports | Branch Manager, Reporting User, Executive User | Internal |
| CAP-SCH-015 | Receive schedule notifications | Trainer, Student, Corporate Coordinator | External-facing via Communication/Future Portals |

## 7. Functional Requirements Checklist

| Requirement ID | Requirement Name | Priority |
|---|---|---|
| FR-SCH-001 | Create branch business calendar | Must |
| FR-SCH-002 | Update branch business calendar | Must |
| FR-SCH-003 | Configure calendar operating days and working hours | Must |
| FR-SCH-004 | Activate, close, and archive business calendar | Must |
| FR-SCH-005 | Create holiday | Must |
| FR-SCH-006 | Update holiday | Must |
| FR-SCH-007 | Activate, deactivate, and soft delete holiday | Must |
| FR-SCH-008 | Validate holiday conflicts before scheduling | Must |
| FR-SCH-009 | Create venue block | Must |
| FR-SCH-010 | Update venue block | Must |
| FR-SCH-011 | Cancel, deactivate, and soft delete venue block | Must |
| FR-SCH-012 | Validate venue block conflicts before scheduling | Must |
| FR-SCH-013 | Create draft single schedule session | Must |
| FR-SCH-014 | Publish schedule session after successful validations | Must |
| FR-SCH-015 | Create recurring batch schedule sessions | Must |
| FR-SCH-016 | Reschedule draft or published session | Must |
| FR-SCH-017 | Cancel published session with reason | Must |
| FR-SCH-018 | Soft delete draft session | Should |
| FR-SCH-019 | Prevent trainer double booking | Must |
| FR-SCH-020 | Prevent classroom double booking | Must |
| FR-SCH-021 | Prevent batch session overlap | Must |
| FR-SCH-022 | Validate trainer availability | Must |
| FR-SCH-023 | Validate classroom status and branch ownership | Must |
| FR-SCH-024 | Validate batch, course, and branch alignment | Must |
| FR-SCH-025 | Daily schedule view | Must |
| FR-SCH-026 | Weekly schedule view | Must |
| FR-SCH-027 | Monthly schedule view | Should |
| FR-SCH-028 | Trainer timetable view | Must |
| FR-SCH-029 | Classroom timetable view | Must |
| FR-SCH-030 | Batch timetable view | Must |
| FR-SCH-031 | Conflict report view | Should |
| FR-SCH-032 | Export schedule data | Should |
| FR-SCH-033 | Generate classroom utilization summary | Should |
| FR-SCH-034 | Generate trainer utilization summary | Should |
| FR-SCH-035 | Trigger schedule notifications through Communication module | Could |
| FR-SCH-036 | Branch-scoped schedule access enforcement | Must |
| FR-SCH-037 | Audit schedule, holiday, calendar, and venue block changes | Must |
| FR-SCH-038 | Bilingual labels and localized display | Must |
| FR-SCH-039 | Oman timezone normalization | Must |
| FR-SCH-040 | Optimistic locking for concurrent schedule updates | Must |

## 8. Permission Model Overview

Permissions must be dynamic and assigned through the Identity & Access Management module. Role names must not be hardcoded into application logic. All permission checks must be server-side.

| Permission Code | Purpose | Typical Roles |
|---|---|---|
| scheduling.calendar.read | View business calendars | Super Admin, Branch Manager, Academic Coordinator |
| scheduling.calendar.create | Create branch business calendar | Super Admin |
| scheduling.calendar.update | Update business calendar | Super Admin, Branch Manager |
| scheduling.calendar.archive | Archive closed business calendar | Super Admin |
| scheduling.holiday.read | View holidays | Super Admin, Branch Manager, Academic Coordinator, Trainer |
| scheduling.holiday.create | Create holiday | Super Admin, Branch Manager |
| scheduling.holiday.update | Update holiday | Super Admin, Branch Manager |
| scheduling.holiday.delete | Soft delete holiday | Super Admin |
| scheduling.venueBlock.read | View venue blocks | Super Admin, Branch Manager, Academic Coordinator, Training Coordinator |
| scheduling.venueBlock.create | Create venue block | Branch Manager, Academic Coordinator |
| scheduling.venueBlock.update | Update venue block | Branch Manager, Academic Coordinator |
| scheduling.venueBlock.cancel | Cancel venue block | Branch Manager, Academic Coordinator |
| scheduling.session.read | View schedule sessions | Super Admin, Branch Manager, Academic Coordinator, Training Coordinator, Trainer, Reception |
| scheduling.session.create | Create draft schedule session | Academic Coordinator, Training Coordinator |
| scheduling.session.publish | Publish schedule session | Academic Coordinator, Branch Manager |
| scheduling.session.update | Update draft schedule session | Academic Coordinator, Training Coordinator |
| scheduling.session.reschedule | Reschedule published session | Academic Coordinator, Branch Manager |
| scheduling.session.cancel | Cancel published session | Academic Coordinator, Branch Manager |
| scheduling.session.deleteDraft | Soft delete draft schedule session | Academic Coordinator |
| scheduling.conflict.read | View conflict details | Academic Coordinator, Branch Manager |
| scheduling.override.holiday | Override holiday conflict where allowed | Branch Manager |
| scheduling.override.venueBlock | Override venue block conflict where allowed | Branch Manager |
| scheduling.report.read | View schedule reports | Branch Manager, Reporting User |
| scheduling.export | Export schedule data | Branch Manager, Reporting User |
| scheduling.consolidated.read | View schedules across assigned branches | Executive User, Authorized Reporting User |

### Branch Access Rules

1. Every schedule, calendar, holiday, and venue block read must filter by assigned branch context.
2. Every create, update, cancel, publish, delete, or export action must validate user branch access server-side.
3. Users with multiple branches can switch active branch context only among assigned branches.
4. Parent branch access can include child branches only when `canViewChildBranches = true`.
5. Consolidated schedule reporting requires both assigned branch access and `scheduling.consolidated.read` and `reporting.dashboard.consolidated.read` permission.
6. A user cannot create a schedule in one branch using a trainer, classroom, or batch owned by another branch unless the underlying business rule explicitly allows cross-branch trainer assignment and the user has access to both branches.

## 9. Security and Audit Requirements Summary

| Area | Requirement |
|---|---|
| Authentication | All module functions require authenticated admin portal users except future public read-only views explicitly exposed by other modules. |
| Authorization | All actions require permission codes. Role names must not be used directly in business logic. |
| Branch Isolation | Server-side branch filtering is mandatory for schedule sessions, calendars, holidays, venue blocks, trainer views, classroom views, exports, and reports. |
| Sensitive Actions | Publishing, rescheduling, cancellation, override, holiday deletion, venue block cancellation, and calendar archival must be audited. |
| Audit Content | AuditLog must capture entity type, entity ID, action, old value, new value, performed by, performed at, IP address, and reason where required. |
| Soft Delete | Calendar, holiday, venue block, and draft schedule soft deletes must set `isDeleted = true`, `deletedAt`, and `deletedBy`; no hard delete is allowed. |
| Optimistic Locking | Concurrent updates must validate the `version` field and reject stale writes. |
| Input Validation | Date, time, branch, batch, trainer, classroom, status, language, and recurrence inputs must be validated server-side. |
| Data Leakage Prevention | Schedule search must not reveal trainer names, classroom names, batch names, or conflict details from unauthorized branches. |
| Override Governance | Holiday or venue block override requires explicit permission, reason, and audit record. |
| Export Control | Export must be permission-controlled, branch-scoped, and audited. |
| Local Time Handling | All entered schedule times are interpreted in Oman GST unless branch-specific timezone is configured. Persisted timestamps must be normalized consistently. |

## 10. Non-Functional Requirements Summary

| NFR ID | Category | Requirement |
|---|---|---|
| NFR-SCH-001 | Performance | Schedule search for a single branch and 31-day range must return within 2 seconds for normal operating data volumes. |
| NFR-SCH-002 | Performance | Conflict validation for a single session must complete within 1 second under normal operating conditions. |
| NFR-SCH-003 | Performance | Bulk recurring schedule generation for up to 120 sessions must complete validation within 10 seconds, or return structured per-session validation results. |
| NFR-SCH-004 | Scalability | Data model must support multiple ASTI branches without introducing SaaS tenant concepts. |
| NFR-SCH-005 | Availability | Read-only schedule views must remain available when downstream Communication or Reporting modules are unavailable. |
| NFR-SCH-006 | Reliability | Conflict validation must be deterministic and must not depend on client-side checks. |
| NFR-SCH-007 | Security | All write operations must enforce permission and branch access server-side. |
| NFR-SCH-008 | Auditability | Sensitive action audit records must be created within the same database transaction as the business change. |
| NFR-SCH-009 | Localization | UI labels, holiday names, block reasons, validation messages, and report labels must support English and Arabic. |
| NFR-SCH-010 | Timezone | Oman GST UTC+04:00 is the default timezone for schedule display, recurrence generation, and validation. |
| NFR-SCH-011 | Maintainability | Scheduling logic must be implemented within the scheduling-calendar package and exposed through clear application services. |
| NFR-SCH-012 | Modularity | Scheduling must integrate through in-process module boundaries within the modular monolith, not through external brokers. |
| NFR-SCH-013 | Data Integrity | Published schedule sessions must have valid `batchId`, `trainerId`, `classroomId`, `branchId`, `scheduledDate`, `startTime`, and `endTime`. |
| NFR-SCH-014 | Concurrency | Stale updates must be rejected using optimistic locking and clear user-facing conflict messages. |
| NFR-SCH-015 | Observability | Failed scheduling validations and rejected overrides must be logged with safe diagnostic metadata. |

## 11. Module Data Ownership Summary

| Entity | Ownership | Notes |
|---|---|---|
| BusinessCalendar | Scheduling / Configuration collaboration | Branch calendar owned by scheduling for timetable validation; seeded/configured through master data. |
| Holiday | Scheduling / Configuration collaboration | Used to prevent scheduling on holidays and closures. |
| ScheduleSession | Scheduling | Owns planned timetable entries. May align to Training Delivery `Session` where implementation chooses shared table. |
| VenueBlock | Scheduling | Owns classroom or branch unavailability windows. |
| AuditLog | Audit & Compliance | Created by Scheduling through audit service. |
| Branch | Organization | Referenced, not owned. |
| Classroom | Organization | Referenced, not owned. |
| Batch | Training Delivery | Referenced, not owned. |
| TrainerProfile | Trainer Management | Referenced, not owned. |
| AttendanceSession | Attendance | Consumes published schedule sessions; not owned by Scheduling. |

## 12. Baseline Data Fields

### 12.1 BusinessCalendar

| Field | Type | Required | Rule |
|---|---|---|---|
| id | UUID/CUID | Yes | System generated. |
| branchId | UUID/CUID | Yes | Must reference active branch accessible to current user. |
| name | string | Yes | English display name. |
| nameLocalized | JSON | Yes | Must include `en` and `ar`. |
| year | integer | Yes | Four-digit year between 2000 and 2100. |
| countryCode | string | Yes | Default `OM`. |
| timezone | string | Yes | Default `Asia/Muscat` using the IANA timezone `Asia/Muscat`. |
| operatingDays | JSON | Yes | Day-of-week map for open/closed state. |
| workingHours | JSON | Yes | Per-day opening and closing times. |
| status | enum | Yes | Draft, Active, Closed, Archived. |
| effectiveStartDate | date | Yes | Must be within configured year unless cross-year calendar is explicitly allowed. |
| effectiveEndDate | date | Yes | Must be on or after effectiveStartDate. |
| isActive | boolean | Yes | Derived from status for filtering. |
| isDeleted | boolean | Yes | Soft delete flag. |
| deletedAt | datetime | No | Required when isDeleted is true. |
| createdAt | datetime | Yes | System generated. |
| createdBy | UUID/CUID | Yes | Authenticated user. |
| updatedAt | datetime | Yes | System generated. |
| updatedBy | UUID/CUID | Yes | Authenticated user. |
| version | integer | Yes | Incremented on each update. |

### 12.2 Holiday

| Field | Type | Required | Rule |
|---|---|---|---|
| id | UUID/CUID | Yes | System generated. |
| calendarId | UUID/CUID | Yes | Must reference active calendar in user-accessible branch. |
| branchId | UUID/CUID | Yes | Denormalized for branch filtering and conflict checks. |
| date | date | Yes | Holiday date in Oman local calendar. |
| name | string | Yes | English holiday name. |
| nameLocalized | JSON | Yes | Must include `en` and `ar`. |
| holidayType | enum | Yes | PublicHoliday, BranchClosure, ExamBlackout, Maintenance, SpecialEvent, Other. |
| isRecurringAnnual | boolean | Yes | Indicates whether holiday repeats annually. |
| status | enum | Yes | Draft, Active, Inactive, Cancelled. |
| effectiveStartDate | date | Yes | Start of applicability. |
| effectiveEndDate | date | No | End of applicability when temporary. |
| isDeleted | boolean | Yes | Soft delete flag. |
| deletedAt | datetime | No | Required when soft deleted. |
| createdAt | datetime | Yes | System generated. |
| createdBy | UUID/CUID | Yes | Authenticated user. |
| updatedAt | datetime | Yes | System generated. |
| updatedBy | UUID/CUID | Yes | Authenticated user. |
| version | integer | Yes | Optimistic locking. |

### 12.3 ScheduleSession

| Field | Type | Required | Rule |
|---|---|---|---|
| id | UUID/CUID | Yes | System generated. |
| branchId | UUID/CUID | Yes | Must equal batch branch unless approved cross-branch rule exists. |
| batchId | UUID/CUID | Yes | Must reference active or planned batch. |
| courseId | UUID/CUID | Yes | Must match batch course. |
| trainerId | UUID/CUID | Yes | Must reference active trainer profile. |
| classroomId | UUID/CUID | Yes | Must reference active classroom in branch. |
| sessionNumber | integer | Yes | Positive integer unique within batch for non-deleted sessions. |
| title | string | Yes | English session title. |
| titleLocalized | JSON | No | Optional bilingual session title. |
| scheduledDate | date | Yes | Date in Oman local calendar. |
| startTime | time | Yes | Local start time. |
| endTime | time | Yes | Local end time and must be after startTime. |
| durationMinutes | integer | Yes | Calculated as endTime minus startTime. |
| scheduleStatus | enum | Yes | Draft, Conflict, Published, Rescheduled, Cancelled, Completed. |
| conflictChecked | boolean | Yes | True only after latest successful validation. |
| conflictCheckedAt | datetime | No | Set after validation. |
| cancellationReasonCode | string | No | Required when status is Cancelled. |
| cancellationNotes | text | No | Required for free-text explanation when cancelled. |
| rescheduledFromSessionId | UUID/CUID | No | Set when created as replacement for another session. |
| overrideReason | text | No | Required when authorized override is applied. |
| effectiveStartDate | date | Yes | Defaults to scheduledDate. |
| effectiveEndDate | date | No | Used for lifecycle closure. |
| isDeleted | boolean | Yes | Soft delete flag for drafts only unless administrator policy allows archived deletion. |
| deletedAt | datetime | No | Required when soft deleted. |
| createdAt | datetime | Yes | System generated. |
| createdBy | UUID/CUID | Yes | Authenticated user. |
| updatedAt | datetime | Yes | System generated. |
| updatedBy | UUID/CUID | Yes | Authenticated user. |
| version | integer | Yes | Optimistic locking. |

### 12.4 VenueBlock

| Field | Type | Required | Rule |
|---|---|---|---|
| id | UUID/CUID | Yes | System generated. |
| branchId | UUID/CUID | Yes | Branch where block applies. |
| classroomId | UUID/CUID | No | Null means branch-wide block. |
| blockDate | date | Yes | Date in Oman local calendar. |
| startTime | time | No | Required for partial-day block. |
| endTime | time | No | Required for partial-day block and must be after startTime. |
| isFullDay | boolean | Yes | When true, startTime and endTime are not required. |
| reasonCode | string | Yes | Maintenance, Event, Inspection, EmergencyClosure, PrivateBooking, Other. |
| reason | text | Yes | Human-readable explanation. |
| reasonLocalized | JSON | No | Optional bilingual explanation. |
| status | enum | Yes | Draft, Active, Cancelled, Expired. |
| effectiveStartDate | date | Yes | Start of applicability. |
| effectiveEndDate | date | No | End of applicability. |
| isDeleted | boolean | Yes | Soft delete flag. |
| deletedAt | datetime | No | Required when soft deleted. |
| createdAt | datetime | Yes | System generated. |
| createdBy | UUID/CUID | Yes | Authenticated user. |
| updatedAt | datetime | Yes | System generated. |
| updatedBy | UUID/CUID | Yes | Authenticated user. |
| version | integer | Yes | Optimistic locking. |
