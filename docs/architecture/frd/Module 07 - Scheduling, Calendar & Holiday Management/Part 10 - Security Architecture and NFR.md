# Part 10 - Security Architecture and NFR

## Module 07 – Scheduling, Calendar & Holiday Management

**System:** Al Saud Training Institute Integrated Institute Management System  
**Module Code:** SCH  
**Bounded Context:** Scheduling, Calendar & Holiday Management  
**Architecture Style:** Next.js modular monolith, PostgreSQL, Prisma, server-side authorization  
**Timezone Default:** Oman GST, UTC+04:00  
**Document Purpose:** This document defines the module-specific security architecture, access-control enforcement, audit expectations, compliance controls, and non-functional requirements for scheduling, calendar, timetable, holiday, venue-blocking, and trainer/classroom availability operations.

---

## 1. Security Architecture Overview

Scheduling controls operational time, trainer workload, classroom allocation, institute calendars, branch-year overrides, student-facing timetable visibility, and downstream attendance creation. Incorrect or unauthorized schedule changes can affect training delivery, attendance eligibility, certificate eligibility, trainer utilization, and branch operations. Therefore, all scheduling operations must be protected through server-side branch scoping, fine-grained permission checks, conflict validation, immutable audit logs for sensitive changes, and controlled publication workflows.

The module must enforce security at the application service layer, route handler layer, Prisma query construction layer, and reporting/read-model layer. UI hiding is allowed only as a convenience and must never be the only access-control mechanism.

---

## 2. Security Scope

### 2.1 In Scope

| Security Area          | Requirement                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication         | All admin and trainer portal scheduling APIs require authenticated user sessions. Public anonymous access is not allowed for operational scheduling APIs.                                                           |
| Authorization          | Every create, update, publish, cancel, reschedule, venue block, holiday, import, export, and report action requires a fine-grained permission code.                                                                 |
| Branch isolation       | All timetable, schedule session, holiday calendar, venue block, trainer availability, and classroom booking data must be scoped by the active branch context unless the user has consolidated reporting permission. |
| Sensitive action audit | Create, update, cancel, publish, unpublish, reschedule, conflict override, holiday change, venue block change, and bulk import actions must write audit records.                                                    |
| Data integrity         | Conflict detection must prevent trainer double-booking, classroom double-booking, batch overlap, holiday conflicts, and venue-block conflicts before committing schedule changes.                                   |
| Reporting access       | Operational and executive schedule reports must apply branch-scoped filtering and permission-based field visibility.                                                                                                |
| Export security        | CSV, XLSX, and PDF exports require explicit export permissions and must include branch scope metadata.                                                                                                              |
| Bilingual UI security  | English and Arabic text fields must be sanitized to prevent script injection and stored as safe localized JSON values.                                                                                              |

### 2.2 Out of Scope

| Area                      | Reason                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Payment auditing          | Owned by Fee, Billing & Receivables. Scheduling may expose payment-related enrollment status only through authorized cross-module read access.                     |
| Certificate signing       | Owned by Certificate Management. Scheduling may influence attendance/completion timelines but must not sign or issue certificates.                                 |
| PII encryption ownership  | Person-level PII is owned by Party/Person and Identity contexts. Scheduling must avoid duplicating PII and must only reference identifiers and display-safe names. |
| Biometric device security | Future Biometric Integration context.                                                                                                                              |
| External broker security  | Not applicable. The platform follows modular monolith first.                                                                                                       |

---

## 3. Data Classification

| Data Element                      |                        Classification | Storage Rule                | Display Rule                                                    | Export Rule                                            |
| --------------------------------- | ------------------------------------: | --------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| ScheduleSession.id                |                              Internal | UUID/CUID                   | Hidden from normal users                                        | Allowed in admin technical export only                 |
| ScheduleSession.sessionTitle      |                  Internal operational | Plain text sanitized        | Visible to authorized branch users                              | Export allowed                                         |
| ScheduleSession.scheduledDate     |                  Internal operational | Date                        | Visible to authorized branch users, trainers, enrolled students | Export allowed                                         |
| ScheduleSession.startTime/endTime |                  Internal operational | Time                        | Visible to authorized branch users, trainers, enrolled students | Export allowed                                         |
| branchId                          |        Security-sensitive operational | FK                          | Display branch name only                                        | Export allowed only with report permission             |
| trainerId                         |                    Internal reference | FK                          | Display trainer name only                                       | Export allowed only with trainer report permission     |
| classroomId                       |                    Internal reference | FK                          | Display classroom code/name                                     | Export allowed                                         |
| conflictReason                    |                 Sensitive operational | Text/JSON                   | Admin/Coordinator only                                          | Export allowed only with audit/report permission       |
| overrideReason                    |                 Sensitive operational | Required text for overrides | Admin/Coordinator only                                          | Export allowed only with audit/report permission       |
| createdBy/updatedBy               |                       Audit-sensitive | User FK                     | Admin/audit users only                                          | Export allowed only with audit permission              |
| deletedAt/isDeleted               |                       Audit-sensitive | Soft-delete metadata        | Admin/audit users only                                          | Export allowed only with audit permission              |
| holiday nameLocalized             | Public/internal depending on calendar | JSON sanitized              | Visible by resolved calendar scope                              | Export allowed                                         |
| venue block reason                |                  Internal operational | Text sanitized              | Admin/Coordinator/Branch Admin only                             | Export allowed only with operational report permission |
| trainer availability remarks      |      Internal HR-adjacent operational | Text sanitized              | Trainer owner, coordinator, branch admin                        | Export controlled                                      |

---

## 4. Authentication Requirements

| User Type              | Authentication Requirement                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| Super Admin            | Authenticated admin portal session with active user status.                                                  |
| Branch Admin           | Authenticated admin portal session with assigned branch access.                                              |
| Scheduling Coordinator | Authenticated admin portal session with scheduling permissions and assigned branch access.                   |
| Academic Coordinator   | Authenticated admin portal session with batch/session permissions.                                           |
| Trainer                | Authenticated trainer portal or admin portal session linked to TrainerProfile.                               |
| Student                | Authenticated student portal session linked to StudentProfile and enrollment.                                |
| Accountant             | Authenticated admin portal session with finance/report permissions where schedule finance impact is visible. |
| Auditor                | Authenticated admin portal session with read/audit/report permissions.                                       |
| System Job             | Internal service principal or scheduled job identity with limited system permissions.                        |

Authentication must verify:

1. User account exists and is not deleted.
2. User status is `ACTIVE`.
3. Session is valid and not expired.
4. User has active branch assignment for the requested branch unless a consolidated permission applies.
5. User has the exact permission code required by the endpoint or server action.

---

## 5. Authorization Model

### 5.1 Permission Enforcement Points

| Layer                     | Enforcement Requirement                                                   |
| ------------------------- | ------------------------------------------------------------------------- |
| UI navigation             | Hide menu items when menu permission is absent.                           |
| UI action controls        | Hide or disable buttons when action permission is absent.                 |
| Server action / API route | Must verify permission before executing business logic.                   |
| Application service       | Must verify branch scope, entity ownership, and allowed state transition. |
| Repository / Prisma query | Must inject branch filters for branch-owned entities.                     |
| Report query              | Must restrict rows by branch scope and report permission.                 |
| Export operation          | Must verify export permission and record audit log.                       |

### 5.2 Core Permission Codes

| Permission Code                         | Purpose                                                                           |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `scheduling.menu.view`                  | Access Scheduling menu.                                                           |
| `scheduling.dashboard.view`             | View scheduling dashboard.                                                        |
| `scheduling.session.read`               | Read schedule sessions.                                                           |
| `scheduling.session.create`             | Create schedule sessions.                                                         |
| `scheduling.session.update`             | Update draft or scheduled sessions.                                               |
| `scheduling.session.publish`            | Publish sessions to trainer/student portals.                                      |
| `scheduling.session.reschedule`         | Change date/time/trainer/classroom of an existing scheduled or published session. |
| `scheduling.session.cancel`             | Cancel a scheduled or published session.                                          |
| `scheduling.session.delete`             | Soft-delete draft schedule sessions.                                              |
| `scheduling.session.overrideConflict`   | Override eligible soft conflicts with mandatory reason.                           |
| `scheduling.calendar.read`              | Read business calendars and holidays.                                             |
| `scheduling.calendar.manage`            | Create and update institute calendars and branch overrides.                       |
| `scheduling.holiday.manage`             | Create, update, deactivate, and soft-delete holidays.                             |
| `scheduling.venueBlock.read`            | Read venue blocks.                                                                |
| `scheduling.venueBlock.manage`          | Create, update, cancel, and soft-delete venue blocks.                             |
| `scheduling.trainerAvailability.read`   | Read trainer availability.                                                        |
| `scheduling.trainerAvailability.manage` | Manage trainer availability.                                                      |
| `scheduling.bulkImport`                 | Import schedules, holidays, or venue blocks from templates.                       |
| `scheduling.export`                     | Export schedule data.                                                             |
| `scheduling.report.view`                | View operational schedule reports.                                                |
| `scheduling.report.consolidated`        | View cross-branch consolidated scheduling reports.                                |
| `scheduling.audit.view`                 | View scheduling audit trail.                                                      |

### 5.3 Branch Scope Rules

| Scenario                                             | Required Behavior                                                                                           |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| User assigned to one branch                          | All queries must be limited to that branch.                                                                 |
| User assigned to multiple branches                   | User must select active branch; CRUD actions apply only to selected branch.                                 |
| User has parent branch access with child access flag | Read/report access may include child branches if `canViewChildBranches = true`.                             |
| User has consolidated reporting permission           | Reports may include multiple branches, but mutation operations still require a concrete branch context.     |
| Trainer portal                                       | Trainer can view sessions assigned to their TrainerProfile and branch access must match the session branch. |
| Student portal                                       | Student can view only sessions for batches linked to their active enrollments.                              |
| Export                                               | Export must include only rows within authorized branch scope.                                               |

---

## 6. Sensitive Action Audit Requirements

### 6.1 Actions Requiring Audit Log

| Action                           | Audit Required |                            Reason Required |                    Old/New Values Required |
| -------------------------------- | -------------: | -----------------------------------------: | -----------------------------------------: |
| Create schedule session          |            Yes |                                         No |                                  New value |
| Update draft session             |            Yes |                                         No |                         Old and new values |
| Publish session                  |            Yes |                                         No |                         Old and new status |
| Reschedule session               |            Yes |                                        Yes | Old and new date, time, trainer, classroom |
| Cancel session                   |            Yes |                                        Yes |                         Old and new status |
| Soft-delete session              |            Yes |                                        Yes |             Old and new soft-delete fields |
| Override conflict                |            Yes |                                        Yes |       Conflict details and override reason |
| Create/update holiday            |            Yes |    No for create, Yes for update after use |                         Old and new values |
| Deactivate holiday               |            Yes |                                        Yes |                         Old and new status |
| Create/update/cancel venue block |            Yes |                      Yes for update/cancel |                         Old and new values |
| Bulk import schedule             |            Yes |                        Import batch reason |  File metadata, counts, validation results |
| Export report                    |            Yes |                                         No |         Export parameters and branch scope |
| Trainer availability update      |            Yes | Yes when change affects published sessions |                   Old and new availability |

### 6.2 Audit Log Payload Standard

```json
{
  "entityType": "ScheduleSession",
  "entityId": "clxschsession0001",
  "action": "RESCHEDULED",
  "moduleCode": "SCH",
  "oldValue": {
    "scheduledDate": "2026-08-10",
    "startTime": "09:00",
    "endTime": "11:00",
    "trainerId": "clxtrainer001",
    "classroomId": "clxroom001",
    "status": "PUBLISHED"
  },
  "newValue": {
    "scheduledDate": "2026-08-11",
    "startTime": "10:00",
    "endTime": "12:00",
    "trainerId": "clxtrainer001",
    "classroomId": "clxroom002",
    "status": "RESCHEDULED"
  },
  "performedBy": "clxuser001",
  "performedAt": "2026-07-03T10:30:00+04:00",
  "branchId": "clxbranch001",
  "ipAddress": "192.0.2.10",
  "userAgent": "Mozilla/5.0",
  "reason": "Classroom maintenance in original classroom",
  "correlationId": "req_01JZ_SCH_000001"
}
```

---

## 7. Data Protection Requirements

### 7.1 PII Minimization

Scheduling must not duplicate PII. It must reference external aggregates by ID:

| External Data | Allowed in Scheduling Tables       | Not Allowed in Scheduling Tables                            |
| ------------- | ---------------------------------- | ----------------------------------------------------------- |
| Trainer       | `trainerId`                        | Civil ID, passport number, visa number, personal email copy |
| Student       | Enrollment-derived visibility only | Civil ID, passport number, date of birth copy               |
| User          | `createdBy`, `updatedBy`           | Password hash, MFA secrets                                  |
| Branch        | `branchId`                         | Full legal/tax profile duplication                          |

Trainer and student display names must be resolved through authorized read services or reporting views with field-level access controls.

### 7.2 Encryption

| Data Type         | Encryption Requirement                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Transport         | HTTPS/TLS required for all portal traffic.                                                    |
| Database storage  | Rely on platform database encryption at rest.                                                 |
| Audit logs        | Protected from update/delete through application permissions.                                 |
| Export files      | Stored temporarily with signed URL access and automatic expiry.                               |
| Bulk import files | Stored in temporary controlled storage and deleted or archived according to retention policy. |

### 7.3 Input Sanitization

All user-supplied text fields must be sanitized before storage:

| Field              | Sanitization                                                                       |
| ------------------ | ---------------------------------------------------------------------------------- |
| session title      | Trim, collapse excessive whitespace, reject HTML/script tags.                      |
| holiday name       | Trim, localized JSON validation, reject script tags.                               |
| venue block reason | Trim, allow punctuation, reject script tags and control characters.                |
| reschedule reason  | Mandatory plain text, reject HTML/script tags.                                     |
| import notes       | Reject embedded HTML, macros, and formula-injection prefixes in exported CSV/XLSX. |

CSV and XLSX export must prefix dangerous spreadsheet formula values beginning with `=`, `+`, `-`, or `@` with a safe apostrophe.

---

## 8. API Security Requirements

| API Concern           | Requirement                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Authentication        | Reject unauthenticated requests with `401 ERR_AUTH_REQUIRED`.                              |
| Permission failure    | Reject with `403 ERR_AUTH_PERMISSION_DENIED`.                                              |
| Branch access failure | Reject with `403 ERR_SCH_BRANCH_SCOPE_DENIED`.                                             |
| Entity not found      | Return `404 ERR_SCH_NOT_FOUND` only after branch scope filtering.                          |
| Optimistic locking    | Mutations must require `version` or `updatedAt` concurrency token for existing records.    |
| Idempotency           | Bulk import and schedule generation APIs must support idempotency key or import batch key. |
| Rate limiting         | Apply stricter throttling to bulk import, export, and conflict-check endpoints.            |
| Error leakage         | Error responses must not reveal records from unauthorized branches.                        |
| Request size          | Bulk import payload size must be capped and validated before parsing.                      |

---

## 9. Conflict Validation Security

Conflict validation is a security and integrity control. It must be enforced server-side even when the UI performs client-side checks.

### 9.1 Hard Conflicts

Hard conflicts must block creation, update, publishing, and rescheduling unless the business rule explicitly allows an override. In the current module, the following are non-overridable by default:

| Conflict Type            | Blocking Rule                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Trainer double booking   | Same trainer cannot be assigned to overlapping active sessions in the same time window.                                   |
| Classroom double booking | Same classroom cannot be assigned to overlapping active sessions in the same branch.                                      |
| Batch overlap            | Same batch cannot have overlapping active sessions.                                                                       |
| Venue block conflict     | Active venue block covering classroom/date/time blocks session scheduling.                                                |
| Holiday conflict         | Active full-day holiday blocks sessions unless the user has holiday override permission and the branch policy permits it. |
| Invalid branch relation  | Batch, classroom, trainer availability branch, and session branch must be compatible.                                     |

### 9.2 Soft Conflicts

Soft conflicts may be overridden only with permission `scheduling.session.overrideConflict` and a mandatory reason.

| Soft Conflict                                                   | Override Requirement                     |
| --------------------------------------------------------------- | ---------------------------------------- |
| Trainer availability missing but trainer is otherwise active    | Requires override permission and reason. |
| Classroom capacity lower than expected enrollment count         | Requires override permission and reason. |
| Session scheduled outside normal branch operating hours         | Requires override permission and reason. |
| Session scheduled near another session with insufficient buffer | Requires override permission and reason. |

---

## 10. Non-Functional Requirements Summary

### 10.1 Performance Targets

| Operation                         |                                     Target | Measurement                                               |
| --------------------------------- | -----------------------------------------: | --------------------------------------------------------- |
| Calendar month view load          | P95 ≤ 1.5 seconds for 1 branch and 1 month | API + DB time excluding client rendering                  |
| Weekly timetable load             |  P95 ≤ 1.2 seconds for 1 branch and 1 week | API + DB time                                             |
| Conflict check for single session |                               P95 ≤ 500 ms | Server-side validation query                              |
| Create single schedule session    |                               P95 ≤ 800 ms | Request receipt to response                               |
| Reschedule single session         |                               P95 ≤ 900 ms | Includes conflict validation and audit write              |
| Publish up to 100 sessions        |                            P95 ≤ 5 seconds | Bulk transaction/chunked operation                        |
| Import 1,000 schedule rows        |           Complete validation ≤ 60 seconds | As synchronous import preview or controlled server action |
| Export 10,000 report rows         |               File generation ≤ 30 seconds | Async file preparation if threshold exceeded              |
| Dashboard widget refresh query    |                  P95 ≤ 1 second per widget | Read model/view preferred                                 |
| Audit trail page query            |     P95 ≤ 1.5 seconds with indexed filters | Last 90 days default                                      |

### 10.2 Concurrency Targets

| Area                                                 |                                                  Target |
| ---------------------------------------------------- | ------------------------------------------------------: |
| Concurrent admin users scheduling within same branch |                                         25 active users |
| Concurrent timetable viewers per branch              |                        500 student/trainer portal users |
| Concurrent conflict checks                           |                       50 requests per minute per branch |
| Bulk imports                                         |              1 active import per branch per import type |
| Exports                                              | 3 active exports per user, 10 active exports per branch |
| Session mutation lock                                |              One successful mutation per entity version |

### 10.3 Availability Targets

| Component                       |                                           Target |
| ------------------------------- | -----------------------------------------------: |
| Scheduling APIs                 | 99.5% monthly availability during business hours |
| Calendar read views             | 99.7% monthly availability during business hours |
| Admin mutation actions          | 99.5% monthly availability during business hours |
| Student/trainer timetable views | 99.7% monthly availability during business hours |
| Export generation               |                       99.0% monthly success rate |

### 10.4 Scalability Targets

| Dimension            |                                                                           Target |
| -------------------- | -------------------------------------------------------------------------------: |
| Branches             |                        Support at least 25 active branches without schema change |
| Batches              |                            Support at least 10,000 active and historical batches |
| Schedule sessions    |                            Support at least 2,000,000 historical session records |
| Holidays             |                                           Support 20 years of resolved calendars |
| Venue blocks         |                          Support at least 100,000 historical venue block records |
| Audit records        |     Support at least 5,000,000 scheduling-related audit rows with indexed access |
| Calendar query range | Default max 12 months per request for admin; 3 months for student/trainer portal |

### 10.5 Usability Targets

| UX Area              | Requirement                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| Dense admin layout   | Admin screens must support data-rich grids, filters, calendar views, and inline conflict badges.          |
| Bilingual usability  | English LTR and Arabic RTL layouts must be supported without clipping or broken alignment.                |
| Keyboard support     | Date, time, classroom, trainer, and branch selectors must support keyboard navigation.                    |
| Error clarity        | Conflict messages must identify conflict type, affected entity, date, and time.                           |
| Confirmation dialogs | Destructive or sensitive actions must use confirmation dialogs with reason capture where required.        |
| Empty states         | Empty calendar, no availability, no classroom, and no sessions states must provide next permitted action. |

### 10.6 Compliance Targets

| Compliance Area       | Requirement                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Oman timezone         | All scheduling defaults use Oman GST UTC+04:00.                                                                                      |
| Audit retention       | Sensitive scheduling audit records retained for at least 7 years unless ASTI policy defines longer.                                  |
| Soft delete           | No hard delete through application flows. Soft-deleted records remain queryable by audit users.                                      |
| Effective dating      | Business calendars, trainer availability, venue blocks, and branch operating policies must support effective dates where applicable. |
| Data privacy          | Do not duplicate person PII in scheduling tables.                                                                                    |
| Export accountability | Every export must record user, branch scope, filters, row count, timestamp, and file type.                                           |

---

## 11. Reliability and Data Integrity Requirements

### 11.1 Transaction Boundaries

| Operation          | Transaction Requirement                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Create session     | Validate branch, validate references, check conflicts, create session, write audit in one transaction.           |
| Reschedule session | Lock/read current version, validate transition, check conflicts, update session, write audit in one transaction. |
| Publish sessions   | Validate all selected sessions, update statuses, write audit records in controlled chunks.                       |
| Cancel session     | Validate status and permission, update status, write audit, optionally trigger notification request.             |
| Create venue block | Validate classroom/branch, check active sessions, create block, write audit.                                     |
| Update holiday     | Validate date uniqueness, evaluate affected sessions, update calendar/holiday, write audit.                      |
| Bulk import        | Store import batch, validate rows, commit accepted rows, record rejected rows, write import audit.               |

### 11.2 Optimistic Locking

All mutable owned entities must have `version Int` or equivalent concurrency token. Update requests must include the expected version.

If the stored version does not match the request version:

```json
{
  "success": false,
  "error": {
    "code": "ERR_SCH_CONCURRENT_MODIFICATION",
    "message": "The record was modified by another user. Reload and try again.",
    "details": {
      "entityType": "ScheduleSession",
      "entityId": "clxschsession0001"
    }
  }
}
```

### 11.3 Soft Delete Rules

| Entity                | Delete Behavior                                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ScheduleSession       | Draft sessions may be soft-deleted. Published, completed, cancelled, and attendance-linked sessions cannot be deleted; they can be cancelled where allowed. |
| BusinessCalendar      | Cannot be deleted if holidays or sessions reference it; can be deactivated with effective end date.                                                         |
| Holiday               | Can be soft-deleted only if no active published sessions are affected, or must use deactivation with audit reason.                                          |
| VenueBlock            | Can be cancelled or soft-deleted before effective time if no active sessions depend on it.                                                                  |
| TrainerAvailability   | Can be ended using effectiveEndDate; historical records must remain.                                                                                        |
| SchedulingImportBatch | Cannot be deleted through business UI; can be archived by system retention job.                                                                             |

---

## 12. Privacy and Field-Level Display Controls

| Role                   |                          Trainer Name |                        Student Count |                                    Student Names |       Audit Actor | Conflict Details |                          Export |
| ---------------------- | ------------------------------------: | -----------------------------------: | -----------------------------------------------: | ----------------: | ---------------: | ------------------------------: |
| Super Admin            |                                   Yes |                                  Yes |            Yes if cross-module permission exists |               Yes |              Yes |                             Yes |
| Branch Admin           |                     Yes within branch |                                  Yes |   Yes if enrolled-student read permission exists | Yes within branch |              Yes |               Yes within branch |
| Scheduling Coordinator |                     Yes within branch |                                  Yes |                                    No by default |           Limited |              Yes | Yes if export permission exists |
| Trainer                | Own name and assigned session details | Enrolled count for assigned sessions | Student names only through attendance permission |                No |          Limited |                   No by default |
| Student                |         Assigned trainer display name |                                   No |                                               No |                No |               No |                              No |
| Auditor                |                                   Yes |                                  Yes |              Masked unless PII permission exists |               Yes |              Yes |           Yes audit export only |

---

## 13. Rate Limiting and Abuse Protection

| Endpoint Group         |                               Limit |
| ---------------------- | ----------------------------------: |
| Calendar read APIs     | 120 requests per user per 5 minutes |
| Conflict check APIs    |  60 requests per user per 5 minutes |
| Session mutation APIs  |  30 requests per user per 5 minutes |
| Bulk import APIs       |        5 requests per user per hour |
| Export APIs            |       10 requests per user per hour |
| Audit trail APIs       |  60 requests per user per 5 minutes |
| Student timetable APIs | 120 requests per user per 5 minutes |
| Trainer timetable APIs | 120 requests per user per 5 minutes |

Rate limit failures must return `429 ERR_RATE_LIMIT_EXCEEDED` with retry metadata.

---

## 14. Secure Error Handling

| Condition                | HTTP Status | Error Code                         | Security Behavior                                                    |
| ------------------------ | ----------: | ---------------------------------- | -------------------------------------------------------------------- |
| Missing session          |         401 | `ERR_AUTH_REQUIRED`                | Do not reveal endpoint internals.                                    |
| Missing permission       |         403 | `ERR_AUTH_PERMISSION_DENIED`       | Include missing permission only in admin/debug logs, not student UI. |
| Branch denied            |         403 | `ERR_SCH_BRANCH_SCOPE_DENIED`      | Do not reveal whether entity exists in another branch.               |
| Entity not found         |         404 | `ERR_SCH_NOT_FOUND`                | Apply branch filter before lookup.                                   |
| Conflict detected        |         409 | `ERR_SCH_CONFLICT_DETECTED`        | Return sanitized conflict summary.                                   |
| Concurrent update        |         409 | `ERR_SCH_CONCURRENT_MODIFICATION`  | Return reload instruction.                                           |
| Invalid state transition |         422 | `ERR_SCH_INVALID_STATE_TRANSITION` | Return allowed transitions for current user only.                    |
| Invalid input            |         422 | `ERR_VALIDATION_FAILED`            | Return field-level validation messages.                              |
| Import rejected          |         422 | `ERR_SCH_IMPORT_VALIDATION_FAILED` | Return row-level error catalog.                                      |

---

## 15. Module-Specific NFR Acceptance Criteria

```gherkin
Feature: Scheduling non-functional and security requirements

  Scenario: Calendar month view responds within target threshold
    Given an authenticated scheduling coordinator has access to branch "MCT"
    And the branch has 500 schedule sessions in the selected month
    When the coordinator opens the monthly calendar view
    Then the server response should complete within 1.5 seconds at P95
    And the result should include only sessions for authorized branches

  Scenario: Unauthorized branch access is blocked
    Given a branch admin is assigned only to branch "MCT"
    When the admin requests schedule sessions for branch "SLH"
    Then the request should be rejected with HTTP 403
    And the error code should be "ERR_SCH_BRANCH_SCOPE_DENIED"
    And no schedule data from branch "SLH" should be returned

  Scenario: Concurrent session update is rejected
    Given two scheduling coordinators open the same schedule session with version 4
    And the first coordinator successfully reschedules the session
    When the second coordinator submits an update using version 4
    Then the system should reject the update with "ERR_SCH_CONCURRENT_MODIFICATION"
    And the second coordinator should be instructed to reload the session

  Scenario: Sensitive action writes audit log
    Given a published session exists
    When a scheduling coordinator cancels the session with reason "Trainer unavailable"
    Then the session status should become "CANCELLED"
    And an audit log must record old status, new status, user, timestamp, branch, IP address, and reason
```

---

## 16. Security Architecture Decisions

| Decision                                      | Rationale                                                                                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Enforce authorization server-side             | UI hiding alone is insufficient and can be bypassed.                                                                 |
| Use branch scope in every query               | Branch isolation is a core project rule.                                                                             |
| Avoid storing person PII in scheduling tables | Person/Party is the source of truth for identity data.                                                               |
| Use soft delete only                          | Historical schedule data affects attendance, completion, and audit.                                                  |
| Require reason for reschedule/cancel/override | Operationally sensitive changes need accountability.                                                                 |
| Use optimistic locking                        | Prevents lost updates during concurrent schedule editing.                                                            |
| Use read models/views for dashboards          | Supports fast reporting without moving to microservices or CQRS.                                                     |
| No external broker dependency                 | Modular monolith first rule. Internal domain events may be recorded and processed in-process or via controlled jobs. |

---

## 17. Implementation Checklist

| Item                                                           | Required |
| -------------------------------------------------------------- | -------: |
| Permission checks implemented for every endpoint/server action |      Yes |
| Branch scope helper applied to all owned entity queries        |      Yes |
| Audit log written for every sensitive mutation                 |      Yes |
| Conflict validation covered by automated tests                 |      Yes |
| Optimistic locking implemented on mutable entities             |      Yes |
| Export audit implemented                                       |      Yes |
| Bulk import validation implemented before commit               |      Yes |
| English/Arabic text sanitization implemented                   |      Yes |
| Rate limits configured for import/export/conflict APIs         |      Yes |
| Dashboard/report queries use branch-aware views                |      Yes |
| Soft delete enforced for all owned tables                      |      Yes |
| NFR performance tests included for critical views              |      Yes |
