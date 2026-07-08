# Part 5 – API Contracts

## Module 07 – Scheduling, Calendar & Holiday Management

## 1. Document Control

| Field          | Value                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product        | Al Saud Training Institute Integrated Institute Management System                                                                                                   |
| Module         | Module 07 – Scheduling, Calendar & Holiday Management                                                                                                               |
| Module Code    | SCH                                                                                                                                                                 |
| API Style      | Next.js App Router Route Handlers and Server Actions inside a modular monolith                                                                                      |
| Authentication | Required for every admin, trainer, and student portal endpoint except public read endpoints explicitly marked public                                                |
| Authorization  | Dynamic RBAC permission codes; no role-name hardcoding in code paths                                                                                                |
| Branch Scope   | Mandatory server-side branch scoping on every read and mutation                                                                                                     |
| Timezone       | Store timestamps in UTC; accept and render operational schedule dates/times in `Asia/Muscat` unless caller explicitly requests a display timezone allowed by policy |
| Data Format    | JSON request and response bodies; ISO-8601 dates; `HH:mm` 24-hour local time strings for time-of-day fields                                                         |
| Validation     | Zod schemas at the route/server-action boundary plus domain validation inside use cases                                                                             |
| Audit          | Mutations and sensitive reads create `AuditLog` and/or scheduling-specific history rows                                                                             |

---

## 2. API Design Principles

1. All endpoints must resolve the authenticated user before accessing scheduling data.
2. All endpoints must resolve `allowedBranchIds` using `UserBranchAccess` from Identity & Access Management.
3. A request-supplied `branchId` is never trusted by itself. It must be checked against the user's assigned branch context.
4. All read queries must include `isDeleted = false` unless the user has an explicit audit or recovery permission.
5. All mutation commands must include `version` when updating or deleting existing records.
6. All mutation commands must write a generic `AuditLog` entry and, for sessions, a `ScheduleChangeHistory` entry.
7. Conflict checks are deterministic and must return structured conflict details before a publish or reschedule is accepted.
8. Public website consumers may only read published schedule data for published courses and active branches through a separate read-only contract.
9. Server Actions may wrap the same application use cases as REST route handlers; validation and permissions remain identical.
10. No API may bypass branch isolation for convenience. Consolidated views require `scheduling.report.consolidated.read`.

---

## 3. Common Request Context

Every authenticated request has the following server-side context after auth middleware succeeds:

```ts
type AuthenticatedRequestContext = {
  userId: string;
  personId: string;
  defaultBranchId: string;
  activeBranchId: string;
  allowedBranchIds: string[];
  permissions: string[];
  preferredLanguage: 'en' | 'ar';
  timezone: 'Asia/Muscat';
  ipAddress: string;
  userAgent: string;
};
```

### 3.1 Branch Scope Resolution Algorithm

```text
1. Load active UserBranchAccess rows for authenticated user.
2. Remove inactive, soft-deleted, and expired branch access rows.
3. If route receives branchId:
      a. Reject if branchId is not in directly assigned branches.
      b. If canViewChildBranches is true, expand to permitted child branches for read-only reports.
      c. For mutations, require the exact target branch to be directly assignable unless user has scheduling.admin.cross_branch.manage.
4. If route receives branchIds:
      a. Reject if any requested branch is outside allowed scope.
      b. Reject multi-branch mutation requests unless explicitly supported.
5. If route does not receive branchId:
      a. Use activeBranchId from the authenticated session.
6. Add WHERE branch_id IN resolvedScope AND is_deleted = false to every owned scheduling table query.
```

---

## 4. Common DTO Standards

### 4.1 Localized Text DTO

```json
{
  "en": "Muscat Calendar 2026",
  "ar": "تقويم مسقط 2026"
}
```

Zod structure:

```ts
const LocalizedTextSchema = z
  .object({
    en: z.string().trim().min(1).max(200),
    ar: z.string().trim().min(1).max(200),
  })
  .strict();
```

### 4.2 API Success Envelope

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_01JZ7K1VW8Z7D8T0TT71CEYH3R",
    "servedAt": "2026-07-03T07:30:00.000Z",
    "timezone": "Asia/Muscat"
  }
}
```

### 4.3 API Error Envelope

```json
{
  "success": false,
  "error": {
    "code": "ERR_SCH_TRAINER_OVERLAP",
    "message": "Trainer is already assigned to another published session during the selected time range.",
    "field": "trainerId",
    "details": {
      "conflictingSessionId": "9df1e7ad-2ac4-4fb2-a9d7-6f306ebfbdf5",
      "conflictingBatchCode": "HSE-MCT-2026-04"
    }
  },
  "meta": {
    "requestId": "req_01JZ7K1VW8Z7D8T0TT71CEYH3R",
    "servedAt": "2026-07-03T07:30:00.000Z"
  }
}
```

### 4.4 Pagination Query Schema

```ts
const PaginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(10).max(100).default(25),
    sortBy: z.string().trim().max(60).optional(),
    sortDirection: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();
```

---

## 5. Endpoint Summary

| API ID      | Route / Server Action                                   |        Method | Purpose                                                   | Required Permission                                           |
| ----------- | ------------------------------------------------------- | ------------: | --------------------------------------------------------- | ------------------------------------------------------------- |
| API-SCH-001 | `/api/scheduling/calendars`                             |           GET | Search business calendars and branch overrides            | `scheduling.calendar.read`                                    |
| API-SCH-002 | `/api/scheduling/calendars`                             |          POST | Create institute business calendar                        | `scheduling.calendar.create`                                  |
| API-SCH-003 | `/api/scheduling/calendars/{calendarId}`                |           GET | Read calendar detail                                      | `scheduling.calendar.read`                                    |
| API-SCH-004 | `/api/scheduling/calendars/{calendarId}`                |         PATCH | Update calendar header and effective dates                | `scheduling.calendar.update`                                  |
| API-SCH-005 | `/api/scheduling/calendars/{calendarId}/operating-days` |           PUT | Replace operating days and working hours                  | `scheduling.calendar.update`                                  |
| API-SCH-006 | `/api/scheduling/calendars/{calendarId}/status`         |         PATCH | Activate, close, or archive calendar                      | `scheduling.calendar.update` or `scheduling.calendar.archive` |
| API-SCH-007 | `/api/scheduling/calendars/{calendarId}`                |        DELETE | Soft delete draft calendar                                | `scheduling.calendar.delete`                                  |
| API-SCH-008 | `/api/scheduling/holidays`                              |           GET | Search holidays                                           | `scheduling.holiday.read`                                     |
| API-SCH-009 | `/api/scheduling/holidays`                              |          POST | Create holiday                                            | `scheduling.holiday.create`                                   |
| API-SCH-010 | `/api/scheduling/holidays/{holidayId}`                  |           GET | Read holiday detail                                       | `scheduling.holiday.read`                                     |
| API-SCH-011 | `/api/scheduling/holidays/{holidayId}`                  |         PATCH | Update holiday                                            | `scheduling.holiday.update`                                   |
| API-SCH-012 | `/api/scheduling/holidays/{holidayId}/status`           |         PATCH | Activate, deactivate, cancel, or archive holiday          | `scheduling.holiday.update`                                   |
| API-SCH-013 | `/api/scheduling/holidays/{holidayId}`                  |        DELETE | Soft delete holiday                                       | `scheduling.holiday.delete`                                   |
| API-SCH-014 | `/api/scheduling/venue-blocks`                          |           GET | Search branch/classroom venue blocks                      | `scheduling.venue_block.read`                                 |
| API-SCH-015 | `/api/scheduling/venue-blocks`                          |          POST | Create venue block                                        | `scheduling.venue_block.create`                               |
| API-SCH-016 | `/api/scheduling/venue-blocks/{venueBlockId}`           |           GET | Read venue block detail                                   | `scheduling.venue_block.read`                                 |
| API-SCH-017 | `/api/scheduling/venue-blocks/{venueBlockId}`           |         PATCH | Update venue block                                        | `scheduling.venue_block.update`                               |
| API-SCH-018 | `/api/scheduling/venue-blocks/{venueBlockId}/status`    |         PATCH | Activate, cancel, expire, or archive venue block          | `scheduling.venue_block.update`                               |
| API-SCH-019 | `/api/scheduling/venue-blocks/{venueBlockId}`           |        DELETE | Soft delete draft venue block                             | `scheduling.venue_block.delete`                               |
| API-SCH-020 | `/api/scheduling/sessions`                              |           GET | Search schedule sessions                                  | `scheduling.session.read`                                     |
| API-SCH-021 | `/api/scheduling/sessions`                              |          POST | Create draft or published schedule session                | `scheduling.session.create`                                   |
| API-SCH-022 | `/api/scheduling/sessions/{sessionId}`                  |           GET | Read schedule session detail                              | `scheduling.session.read`                                     |
| API-SCH-023 | `/api/scheduling/sessions/{sessionId}`                  |         PATCH | Update draft schedule session                             | `scheduling.session.update`                                   |
| API-SCH-024 | `/api/scheduling/sessions/{sessionId}/publish`          |          POST | Publish schedule session                                  | `scheduling.session.publish`                                  |
| API-SCH-025 | `/api/scheduling/sessions/{sessionId}/cancel`           |          POST | Cancel published session                                  | `scheduling.session.cancel`                                   |
| API-SCH-026 | `/api/scheduling/sessions/{sessionId}/reschedule`       |          POST | Reschedule published session                              | `scheduling.session.reschedule`                               |
| API-SCH-027 | `/api/scheduling/sessions/{sessionId}`                  |        DELETE | Soft delete draft session                                 | `scheduling.session.delete`                                   |
| API-SCH-028 | `/api/scheduling/conflicts/check`                       |          POST | Run conflict validation without saving                    | `scheduling.conflict.read`                                    |
| API-SCH-029 | `/api/scheduling/recurrence-patterns`                   |          POST | Create recurring pattern and optionally generate sessions | `scheduling.session.bulk_create`                              |
| API-SCH-030 | `/api/scheduling/generation-runs/{runId}`               |           GET | Read schedule generation result                           | `scheduling.session.read`                                     |
| API-SCH-031 | `/api/scheduling/views/daily`                           |           GET | Daily timetable view                                      | `scheduling.view.daily.read`                                  |
| API-SCH-032 | `/api/scheduling/views/weekly`                          |           GET | Weekly timetable view                                     | `scheduling.view.weekly.read`                                 |
| API-SCH-033 | `/api/scheduling/views/monthly`                         |           GET | Monthly timetable view                                    | `scheduling.view.monthly.read`                                |
| API-SCH-034 | `/api/scheduling/views/trainer/{trainerId}`             |           GET | Trainer schedule view                                     | `scheduling.view.trainer.read`                                |
| API-SCH-035 | `/api/scheduling/views/classroom/{classroomId}`         |           GET | Classroom schedule view                                   | `scheduling.view.classroom.read`                              |
| API-SCH-036 | `/api/scheduling/views/batch/{batchId}`                 |           GET | Batch schedule view                                       | `scheduling.view.batch.read`                                  |
| API-SCH-037 | `/api/scheduling/exports`                               |          POST | Export schedule data                                      | `scheduling.export.create`                                    |
| API-SCH-038 | `/api/scheduling/reports/utilization`                   |           GET | Utilization report                                        | `scheduling.report.utilization.read`                          |
| API-SCH-039 | `/api/scheduling/reports/conflicts`                     |           GET | Conflict report                                           | `scheduling.report.conflict.read`                             |
| API-SCH-040 | `createScheduleSessionAction`                           | Server Action | Admin form submission for session create                  | Same as API-SCH-021                                           |
| API-SCH-041 | `rescheduleSessionAction`                               | Server Action | Admin form submission for reschedule                      | Same as API-SCH-026                                           |
| API-SCH-042 | `createVenueBlockAction`                                | Server Action | Admin form submission for venue block                     | Same as API-SCH-015                                           |
| API-SCH-043 | `createHolidayAction`                                   | Server Action | Admin form submission for holiday                         | Same as API-SCH-009                                           |

---

## 6. Detailed API Contracts

## API-SCH-001 – Search Business Calendars

| Field               | Specification                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Route               | `GET /api/scheduling/calendars`                                                                                                                        |
| Purpose             | Returns institute business calendars and branch-year overrides with filters for year, status, branch, and text search.                                 |
| Authentication      | Required                                                                                                                                               |
| Required Permission | `scheduling.calendar.read`                                                                                                                             |
| Branch Scoping      | `branchId` query must be inside `allowedBranchIds`. If omitted, use active branch. Multi-branch read requires `scheduling.calendar.consolidated.read`. |

Zod query schema:

```ts
const SearchCalendarsQuerySchema = PaginationQuerySchema.extend({
  branchId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED']).optional(),
  q: z.string().trim().min(1).max(80).optional(),
}).strict();
```

Success response DTO:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "2dc9ef8a-0b77-4a64-b7d3-2cc6953f7569",
        "branchId": "0c7fc62f-8a54-4c86-a930-c29894e817ef",
        "code": "MCT-2026",
        "name": "Muscat Calendar 2026",
        "nameLocalized": {
          "en": "Muscat Calendar 2026",
          "ar": "تقويم مسقط 2026"
        },
        "year": 2026,
        "countryCode": "OM",
        "timezone": "Asia/Muscat",
        "effectiveStartDate": "2026-01-01",
        "effectiveEndDate": "2026-12-31",
        "status": "ACTIVE",
        "isActive": true,
        "version": 4
      }
    ],
    "page": 1,
    "pageSize": 25,
    "totalCount": 1
  }
}
```

Error catalog:

| HTTP | Code                          | Condition                                      |
| ---: | ----------------------------- | ---------------------------------------------- |
|  401 | `ERR_AUTH_REQUIRED`           | User is not authenticated.                     |
|  403 | `ERR_IAM_PERMISSION_DENIED`   | User lacks `scheduling.calendar.read`.         |
|  403 | `ERR_ORG_BRANCH_SCOPE_DENIED` | Requested branch is outside user branch scope. |
|  422 | `ERR_VALIDATION_FAILED`       | Query parameter fails schema validation.       |

## API-SCH-002 – Create Business Calendar

| Field               | Specification                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| Route               | `POST /api/scheduling/calendars`                                                                          |
| Purpose             | Creates a draft institute business calendar with operating timezone, effective dates, and localized name. |
| Authentication      | Required                                                                                                  |
| Required Permission | `scheduling.calendar.create`                                                                              |
| Branch Scoping      | `branchId` must be directly assigned to user or user must have `scheduling.admin.cross_branch.manage`.    |

Zod request schema:

```ts
const CreateBusinessCalendarSchema = z
  .object({
    branchId: z.string().uuid(),
    code: z
      .string()
      .trim()
      .min(3)
      .max(40)
      .regex(/^[A-Z0-9][A-Z0-9_-]{2,39}$/),
    name: z.string().trim().min(3).max(160),
    nameLocalized: LocalizedTextSchema,
    year: z.number().int().min(2000).max(2100),
    countryCode: z
      .string()
      .trim()
      .length(2)
      .regex(/^[A-Z]{2}$/)
      .default('OM'),
    timezone: z.literal('Asia/Muscat').default('Asia/Muscat'),
    effectiveStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    effectiveEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();
```

Success response DTO:

```json
{
  "success": true,
  "data": {
    "id": "2dc9ef8a-0b77-4a64-b7d3-2cc6953f7569",
    "code": "MCT-2026",
    "status": "DRAFT",
    "version": 1,
    "createdAt": "2026-07-03T07:30:00.000Z"
  }
}
```

Error catalog:

| HTTP | Code                                   | Condition                                                                                                              |
| ---: | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
|  400 | `ERR_SCH_INVALID_EFFECTIVE_DATE_RANGE` | End date is before start date.                                                                                         |
|  401 | `ERR_AUTH_REQUIRED`                    | User is not authenticated.                                                                                             |
|  403 | `ERR_IAM_PERMISSION_DENIED`            | User lacks create permission.                                                                                          |
|  403 | `ERR_ORG_BRANCH_SCOPE_DENIED`          | Branch is outside allowed scope.                                                                                       |
|  409 | `ERR_SCH_CALENDAR_CODE_DUPLICATE`      | Code already exists for active non-deleted calendar in the branch.                                                     |
|  409 | `ERR_SCH_ACTIVE_CALENDAR_YEAR_EXISTS`  | Another active calendar already exists for the same branch/year when creating active calendar through privileged path. |
|  422 | `ERR_VALIDATION_FAILED`                | Request payload fails Zod validation.                                                                                  |

## API-SCH-003 – Read Business Calendar Detail

| Field               | Specification                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| Route               | `GET /api/scheduling/calendars/{calendarId}`                                                                 |
| Purpose             | Reads calendar header, operating days, working hours, holidays count, and future session dependency summary. |
| Authentication      | Required                                                                                                     |
| Required Permission | `scheduling.calendar.read`                                                                                   |
| Branch Scoping      | Load by `calendarId`, then verify `calendar.branchId` is in allowed scope.                                   |

Success response DTO:

```json
{
  "success": true,
  "data": {
    "id": "2dc9ef8a-0b77-4a64-b7d3-2cc6953f7569",
    "instituteId": "0c7fc62f-8a54-4c86-a930-c29894e817ef",
    "code": "MCT-2026",
    "name": "Muscat Calendar 2026",
    "nameLocalized": { "en": "Muscat Calendar 2026", "ar": "تقويم مسقط 2026" },
    "year": 2026,
    "timezone": "Asia/Muscat",
    "status": "ACTIVE",
    "operatingDays": [
      {
        "dayOfWeek": "MONDAY",
        "isOpen": true,
        "workingHours": [
          { "startTime": "08:00", "endTime": "13:00" },
          { "startTime": "14:00", "endTime": "18:00" }
        ]
      }
    ],
    "usageSummary": {
      "activeHolidayCount": 12,
      "futurePublishedSessionCount": 183,
      "futureDraftSessionCount": 17
    },
    "version": 4
  }
}
```

Error catalog: `ERR_AUTH_REQUIRED`, `ERR_IAM_PERMISSION_DENIED`, `ERR_ORG_BRANCH_SCOPE_DENIED`, `ERR_SCH_CALENDAR_NOT_FOUND`.

## API-SCH-004 – Update Business Calendar Header

| Field               | Specification                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Route               | `PATCH /api/scheduling/calendars/{calendarId}`                                                 |
| Purpose             | Updates calendar name, localized name, effective dates, notes, and country code where allowed. |
| Authentication      | Required                                                                                       |
| Required Permission | `scheduling.calendar.update`                                                                   |
| Branch Scoping      | Calendar branch must be in allowed mutation scope.                                             |

Zod request schema:

```ts
const UpdateBusinessCalendarSchema = z
  .object({
    name: z.string().trim().min(3).max(160).optional(),
    nameLocalized: LocalizedTextSchema.optional(),
    effectiveStartDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    effectiveEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    version: z.number().int().min(1),
    changeReason: z.string().trim().min(10).max(500),
  })
  .strict();
```

Success response DTO:

```json
{
  "success": true,
  "data": {
    "id": "2dc9ef8a-0b77-4a64-b7d3-2cc6953f7569",
    "status": "ACTIVE",
    "version": 5,
    "updatedAt": "2026-07-03T07:45:00.000Z"
  }
}
```

Error catalog:

| HTTP | Code                                   | Condition                                                         |
| ---: | -------------------------------------- | ----------------------------------------------------------------- |
|  400 | `ERR_SCH_INVALID_EFFECTIVE_DATE_RANGE` | Effective date range is invalid.                                  |
|  403 | `ERR_IAM_PERMISSION_DENIED`            | Missing update permission.                                        |
|  404 | `ERR_SCH_CALENDAR_NOT_FOUND`           | Calendar does not exist inside allowed scope.                     |
|  409 | `ERR_CONCURRENCY_VERSION_MISMATCH`     | Supplied version is stale.                                        |
|  409 | `ERR_SCH_CALENDAR_DEPENDENCY_CONFLICT` | Effective date change would invalidate future published sessions. |
|  422 | `ERR_VALIDATION_FAILED`                | Payload validation failed.                                        |

## API-SCH-005 – Replace Operating Days and Working Hours

| Field               | Specification                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Route               | `PUT /api/scheduling/calendars/{calendarId}/operating-days`                                      |
| Purpose             | Replaces all seven operating-day definitions and associated working-hour windows for a calendar. |
| Authentication      | Required                                                                                         |
| Required Permission | `scheduling.calendar.update`                                                                     |
| Branch Scoping      | Calendar branch must be in allowed mutation scope.                                               |

Zod request schema:

```ts
const TimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const OperatingDaySchema = z
  .object({
    dayOfWeek: z.enum([
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY',
    ]),
    isOpen: z.boolean(),
    workingHours: z
      .array(
        z
          .object({
            startTime: TimeSchema,
            endTime: TimeSchema,
          })
          .strict(),
      )
      .max(4),
  })
  .strict();

const ReplaceOperatingDaysSchema = z
  .object({
    operatingDays: z.array(OperatingDaySchema).length(7),
    version: z.number().int().min(1),
    changeReason: z.string().trim().min(10).max(500),
    allowImpactOnDraftSessions: z.boolean().default(false),
  })
  .strict();
```

Success response DTO:

```json
{
  "success": true,
  "data": {
    "calendarId": "2dc9ef8a-0b77-4a64-b7d3-2cc6953f7569",
    "updatedOperatingDayCount": 7,
    "updatedWorkingHourWindowCount": 11,
    "affectedDraftSessionCount": 2,
    "affectedPublishedSessionCount": 0,
    "version": 6
  }
}
```

Error catalog includes `ERR_SCH_OPERATING_DAYS_INCOMPLETE`, `ERR_SCH_WORKING_HOURS_REQUIRED`, `ERR_SCH_WORKING_HOURS_OVERLAP`, `ERR_SCH_WORKING_HOURS_CROSS_MIDNIGHT`, `ERR_SCH_PUBLISHED_SESSION_OUTSIDE_NEW_HOURS`, `ERR_CONCURRENCY_VERSION_MISMATCH`.

## API-SCH-006 – Change Calendar Status

| Field               | Specification                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Route               | `PATCH /api/scheduling/calendars/{calendarId}/status`                                      |
| Purpose             | Changes calendar lifecycle status to Active, Closed, or Archived.                          |
| Authentication      | Required                                                                                   |
| Required Permission | `scheduling.calendar.update` for activate/close; `scheduling.calendar.archive` for archive |
| Branch Scoping      | Calendar branch must be in allowed mutation scope.                                         |

Zod request schema:

```ts
const ChangeCalendarStatusSchema = z
  .object({
    targetStatus: z.enum(['ACTIVE', 'CLOSED', 'ARCHIVED']),
    version: z.number().int().min(1),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
```

Success response DTO:

```json
{
  "success": true,
  "data": {
    "calendarId": "2dc9ef8a-0b77-4a64-b7d3-2cc6953f7569",
    "previousStatus": "DRAFT",
    "currentStatus": "ACTIVE",
    "version": 2
  }
}
```

Error catalog includes `ERR_SCH_INVALID_CALENDAR_STATUS_TRANSITION`, `ERR_SCH_ACTIVE_CALENDAR_YEAR_EXISTS`, `ERR_SCH_CALENDAR_OPERATING_DAYS_MISSING`, `ERR_SCH_CALENDAR_HAS_FUTURE_SESSIONS`, `ERR_IAM_PERMISSION_DENIED`.

## API-SCH-007 – Soft Delete Calendar

| Field               | Specification                                                  |
| ------------------- | -------------------------------------------------------------- |
| Route               | `DELETE /api/scheduling/calendars/{calendarId}`                |
| Purpose             | Soft deletes a draft calendar that has no active dependencies. |
| Authentication      | Required                                                       |
| Required Permission | `scheduling.calendar.delete`                                   |
| Branch Scoping      | Calendar branch must be in allowed mutation scope.             |

Zod request schema:

```ts
const SoftDeleteSchema = z
  .object({
    version: z.number().int().min(1),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
```

Success response DTO:

```json
{
  "success": true,
  "data": {
    "calendarId": "2dc9ef8a-0b77-4a64-b7d3-2cc6953f7569",
    "isDeleted": true,
    "deletedAt": "2026-07-03T07:50:00.000Z"
  }
}
```

Error catalog includes `ERR_SCH_CALENDAR_DELETE_NOT_ALLOWED`, `ERR_SCH_CALENDAR_DEPENDENCY_CONFLICT`, `ERR_CONCURRENCY_VERSION_MISMATCH`.

## API-SCH-008 – Search Holidays

| Field               | Specification                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------- |
| Route               | `GET /api/scheduling/holidays`                                                            |
| Purpose             | Searches holidays, branch closure days, and non-training days.                            |
| Authentication      | Required                                                                                  |
| Required Permission | `scheduling.holiday.read`                                                                 |
| Branch Scoping      | Branch-scoped; consolidated holiday view requires `scheduling.holiday.consolidated.read`. |

Zod query schema:

```ts
const SearchHolidaysQuerySchema = PaginationQuerySchema.extend({
  branchId: z.string().uuid().optional(),
  calendarId: z.string().uuid().optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  holidayType: z
    .enum([
      'PUBLIC_HOLIDAY',
      'ASTI_HOLIDAY',
      'BRANCH_CLOSURE',
      'NON_TRAINING_DAY',
      'SPECIAL_EVENT',
    ])
    .optional(),
  status: z
    .enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'CANCELLED', 'ARCHIVED'])
    .optional(),
  q: z.string().trim().min(1).max(80).optional(),
}).strict();
```

Success response DTO:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "681c0cc7-8a3c-4e7b-9263-99fd0749c4cf",
        "branchId": "0c7fc62f-8a54-4c86-a930-c29894e817ef",
        "calendarId": "2dc9ef8a-0b77-4a64-b7d3-2cc6953f7569",
        "holidayDate": "2026-07-23",
        "name": "Renaissance Day",
        "nameLocalized": { "en": "Renaissance Day", "ar": "يوم النهضة" },
        "holidayType": "PUBLIC_HOLIDAY",
        "affectsScheduling": true,
        "status": "ACTIVE",
        "version": 2
      }
    ],
    "page": 1,
    "pageSize": 25,
    "totalCount": 1
  }
}
```

Error catalog: `ERR_AUTH_REQUIRED`, `ERR_IAM_PERMISSION_DENIED`, `ERR_ORG_BRANCH_SCOPE_DENIED`, `ERR_VALIDATION_FAILED`.

## API-SCH-009 – Create Holiday

| Field               | Specification                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| Route               | `POST /api/scheduling/holidays`                                                                     |
| Purpose             | Creates an active or draft holiday for the institute calendar or a branch-scoped override calendar. |
| Authentication      | Required                                                                                            |
| Required Permission | `scheduling.holiday.create`                                                                         |
| Branch Scoping      | `branchId` and calendar branch must match and be inside mutation scope.                             |

Zod request schema:

```ts
const CreateHolidaySchema = z
  .object({
    branchId: z.string().uuid(),
    calendarId: z.string().uuid(),
    holidayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    name: z.string().trim().min(2).max(160),
    nameLocalized: LocalizedTextSchema,
    holidayType: z.enum([
      'PUBLIC_HOLIDAY',
      'ASTI_HOLIDAY',
      'BRANCH_CLOSURE',
      'NON_TRAINING_DAY',
      'SPECIAL_EVENT',
    ]),
    affectsScheduling: z.boolean().default(true),
    status: z.enum(['DRAFT', 'ACTIVE']).default('DRAFT'),
    description: z.string().trim().max(1000).optional(),
    overridePolicy: z
      .enum(['NOT_ALLOWED', 'MANAGER_APPROVAL_ALLOWED', 'SUPER_ADMIN_ONLY'])
      .default('MANAGER_APPROVAL_ALLOWED'),
  })
  .strict();
```

Success response DTO:

```json
{
  "success": true,
  "data": {
    "holidayId": "681c0cc7-8a3c-4e7b-9263-99fd0749c4cf",
    "status": "ACTIVE",
    "affectedPublishedSessionCount": 0,
    "version": 1
  }
}
```

Error catalog includes `ERR_SCH_HOLIDAY_DUPLICATE_DATE`, `ERR_SCH_HOLIDAY_OUTSIDE_CALENDAR_RANGE`, `ERR_SCH_HOLIDAY_BRANCH_MISMATCH`, `ERR_SCH_HOLIDAY_PUBLISHED_SESSION_CONFLICT`.

## API-SCH-010 to API-SCH-013 – Holiday Detail, Update, Status, Delete

These endpoints follow the same envelope, branch scoping, versioning, and audit model as calendar APIs.

| API ID      | Route                                         | Method | Request Schema                                                                                                       | Key Error Codes                                                                  |
| ----------- | --------------------------------------------- | -----: | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------- | ------------------------------ | ------------------------------------------- |
| API-SCH-010 | `/api/scheduling/holidays/{holidayId}`        |    GET | Path UUID only                                                                                                       | `ERR_SCH_HOLIDAY_NOT_FOUND`, `ERR_ORG_BRANCH_SCOPE_DENIED`                       |
| API-SCH-011 | `/api/scheduling/holidays/{holidayId}`        |  PATCH | `name`, `nameLocalized`, `holidayDate`, `holidayType`, `affectsScheduling`, `description`, `version`, `changeReason` | `ERR_SCH_HOLIDAY_PUBLISHED_SESSION_CONFLICT`, `ERR_CONCURRENCY_VERSION_MISMATCH` |
| API-SCH-012 | `/api/scheduling/holidays/{holidayId}/status` |  PATCH | `targetStatus: ACTIVE                                                                                                | INACTIVE                                                                         | CANCELLED | ARCHIVED`, `version`, `reason` | `ERR_SCH_INVALID_HOLIDAY_STATUS_TRANSITION` |
| API-SCH-013 | `/api/scheduling/holidays/{holidayId}`        | DELETE | `version`, `reason`                                                                                                  | `ERR_SCH_HOLIDAY_DELETE_NOT_ALLOWED`, `ERR_SCH_HOLIDAY_DEPENDENCY_CONFLICT`      |

Representative success response:

```json
{
  "success": true,
  "data": {
    "holidayId": "681c0cc7-8a3c-4e7b-9263-99fd0749c4cf",
    "previousStatus": "ACTIVE",
    "currentStatus": "CANCELLED",
    "version": 3
  }
}
```

## API-SCH-014 – Search Venue Blocks

| Field               | Specification                                        |
| ------------------- | ---------------------------------------------------- |
| Route               | `GET /api/scheduling/venue-blocks`                   |
| Purpose             | Searches branch-level and classroom-level blocks.    |
| Authentication      | Required                                             |
| Required Permission | `scheduling.venue_block.read`                        |
| Branch Scoping      | Branch-scoped; classroom must belong to same branch. |

Zod query schema:

```ts
const SearchVenueBlocksQuerySchema = PaginationQuerySchema.extend({
  branchId: z.string().uuid().optional(),
  classroomId: z.string().uuid().optional(),
  blockScope: z.enum(['BRANCH', 'CLASSROOM']).optional(),
  blockDateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  blockDateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z
    .enum(['DRAFT', 'ACTIVE', 'CANCELLED', 'EXPIRED', 'ARCHIVED'])
    .optional(),
  q: z.string().trim().min(1).max(80).optional(),
}).strict();
```

Success response DTO includes block `id`, `branchId`, `classroomId`, `blockScope`, `blockDate`, `startTime`, `endTime`, `reason`, `reasonLocalized`, `status`, `version`.

## API-SCH-015 – Create Venue Block

| Field               | Specification                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Route               | `POST /api/scheduling/venue-blocks`                                                              |
| Purpose             | Creates a branch or classroom block used by conflict validation.                                 |
| Authentication      | Required                                                                                         |
| Required Permission | `scheduling.venue_block.create`                                                                  |
| Branch Scoping      | `branchId` must be inside mutation scope; `classroomId` must belong to `branchId` when provided. |

Zod request schema:

```ts
const CreateVenueBlockSchema = z
  .object({
    branchId: z.string().uuid(),
    blockScope: z.enum(['BRANCH', 'CLASSROOM']),
    classroomId: z.string().uuid().nullable().optional(),
    blockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: TimeSchema,
    endTime: TimeSchema,
    reason: z.string().trim().min(3).max(200),
    reasonLocalized: LocalizedTextSchema,
    status: z.enum(['DRAFT', 'ACTIVE']).default('DRAFT'),
    overridePolicy: z
      .enum(['NOT_ALLOWED', 'MANAGER_APPROVAL_ALLOWED', 'SUPER_ADMIN_ONLY'])
      .default('MANAGER_APPROVAL_ALLOWED'),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.blockScope === 'CLASSROOM' && !value.classroomId) {
      ctx.addIssue({
        code: 'custom',
        path: ['classroomId'],
        message: 'classroomId is required for CLASSROOM block scope',
      });
    }
    if (value.blockScope === 'BRANCH' && value.classroomId) {
      ctx.addIssue({
        code: 'custom',
        path: ['classroomId'],
        message: 'classroomId must be empty for BRANCH block scope',
      });
    }
  });
```

Success response DTO:

```json
{
  "success": true,
  "data": {
    "venueBlockId": "a5f6ec07-5512-4928-83e0-d65dfebf9754",
    "status": "ACTIVE",
    "conflictingPublishedSessionCount": 0,
    "version": 1
  }
}
```

Error catalog includes `ERR_SCH_VENUE_BLOCK_TIME_INVALID`, `ERR_SCH_VENUE_BLOCK_SCOPE_INVALID`, `ERR_SCH_CLASSROOM_BRANCH_MISMATCH`, `ERR_SCH_VENUE_BLOCK_OVERLAP`, `ERR_SCH_VENUE_BLOCK_PUBLISHED_SESSION_CONFLICT`.

## API-SCH-016 to API-SCH-019 – Venue Block Detail, Update, Status, Delete

| API ID      | Route                                                | Method | Request Schema                                                                                                         | Key Error Codes                                                                      |
| ----------- | ---------------------------------------------------- | -----: | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------- | ------------------------------ | ----------------------------------------------- |
| API-SCH-016 | `/api/scheduling/venue-blocks/{venueBlockId}`        |    GET | Path UUID only                                                                                                         | `ERR_SCH_VENUE_BLOCK_NOT_FOUND`                                                      |
| API-SCH-017 | `/api/scheduling/venue-blocks/{venueBlockId}`        |  PATCH | `blockDate`, `startTime`, `endTime`, `reason`, `reasonLocalized`, `overridePolicy`, `notes`, `version`, `changeReason` | `ERR_SCH_VENUE_BLOCK_PUBLISHED_SESSION_CONFLICT`, `ERR_CONCURRENCY_VERSION_MISMATCH` |
| API-SCH-018 | `/api/scheduling/venue-blocks/{venueBlockId}/status` |  PATCH | `targetStatus: ACTIVE                                                                                                  | CANCELLED                                                                            | EXPIRED | ARCHIVED`, `version`, `reason` | `ERR_SCH_INVALID_VENUE_BLOCK_STATUS_TRANSITION` |
| API-SCH-019 | `/api/scheduling/venue-blocks/{venueBlockId}`        | DELETE | `version`, `reason`                                                                                                    | `ERR_SCH_VENUE_BLOCK_DELETE_NOT_ALLOWED`                                             |

## API-SCH-020 – Search Schedule Sessions

| Field               | Specification                                                                           |
| ------------------- | --------------------------------------------------------------------------------------- |
| Route               | `GET /api/scheduling/sessions`                                                          |
| Purpose             | Searches schedule sessions for admin grids and timetable views.                         |
| Authentication      | Required                                                                                |
| Required Permission | `scheduling.session.read`                                                               |
| Branch Scoping      | Branch-scoped. Multi-branch reads require consolidated schedule read/report permission. |

Zod query schema:

```ts
const SearchScheduleSessionsQuerySchema = PaginationQuerySchema.extend({
  branchId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional(),
  trainerId: z.string().uuid().optional(),
  classroomId: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z
    .enum([
      'DRAFT',
      'CONFLICT',
      'PUBLISHED',
      'RESCHEDULED',
      'CANCELLED',
      'COMPLETED',
    ])
    .optional(),
  includeCancelled: z.coerce.boolean().default(false),
  q: z.string().trim().min(1).max(80).optional(),
}).strict();
```

Success response DTO:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "9df1e7ad-2ac4-4fb2-a9d7-6f306ebfbdf5",
        "branchId": "0c7fc62f-8a54-4c86-a930-c29894e817ef",
        "batchId": "66a5b159-fc49-47b9-b95d-8d8b662ae9cc",
        "batchCode": "HSE-MCT-2026-04",
        "courseId": "0ec3b89d-28ad-4324-a947-e4e8494d3d41",
        "courseName": {
          "en": "Health and Safety Training",
          "ar": "تدريب الصحة والسلامة"
        },
        "sessionNumber": 3,
        "title": "Session 3 - Fire Safety Basics",
        "scheduledDate": "2026-08-10",
        "startTime": "09:00",
        "endTime": "11:00",
        "trainerId": "79c5a8d6-73ca-44de-b897-6074560cc12f",
        "trainerName": "Ahmed Al Balushi",
        "classroomId": "37647cb6-2d82-4758-92f8-ef4e51b65de6",
        "classroomName": "Room 201",
        "status": "PUBLISHED",
        "hasOverride": false,
        "version": 2
      }
    ],
    "page": 1,
    "pageSize": 25,
    "totalCount": 1
  }
}
```

## API-SCH-021 – Create Schedule Session

| Field               | Specification                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Route               | `POST /api/scheduling/sessions`                                                                                                 |
| Purpose             | Creates a single schedule session in Draft, Conflict, or Published state based on validation and requested action.              |
| Authentication      | Required                                                                                                                        |
| Required Permission | `scheduling.session.create`; publishing at creation additionally requires `scheduling.session.publish`                          |
| Branch Scoping      | `branchId`, `batch.branchId`, `classroom.branchId`, and trainer authorized branch must be compatible and inside mutation scope. |

Zod request schema:

```ts
const CreateScheduleSessionSchema = z
  .object({
    branchId: z.string().uuid(),
    batchId: z.string().uuid(),
    courseId: z.string().uuid(),
    sessionNumber: z.number().int().min(1).max(999),
    title: z.string().trim().min(3).max(180),
    titleLocalized: LocalizedTextSchema.optional(),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: TimeSchema,
    endTime: TimeSchema,
    trainerId: z.string().uuid(),
    classroomId: z.string().uuid(),
    deliveryMode: z
      .enum(['CLASSROOM', 'ONLINE', 'BLENDED'])
      .default('CLASSROOM'),
    requestedStatus: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
    conflictHandling: z
      .enum(['REJECT_ON_ERROR', 'SAVE_AS_CONFLICT_DRAFT'])
      .default('REJECT_ON_ERROR'),
    overrideRequests: z
      .array(
        z
          .object({
            overrideType: z.enum([
              'HOLIDAY_OVERRIDE',
              'VENUE_BLOCK_OVERRIDE',
              'WORKING_HOURS_OVERRIDE',
              'BATCH_DATE_OVERRIDE',
              'TRAINER_AVAILABILITY_OVERRIDE',
              'CLASSROOM_CAPACITY_OVERRIDE',
              'CONFLICT_DRAFT_ACCEPTANCE',
            ]),
            reason: z.string().trim().min(20).max(500),
          })
          .strict(),
      )
      .max(5)
      .default([]),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();
```

Processing checks:

```text
1. Verify permission and branch scope.
2. Verify batch exists, is active/schedulable, and belongs to branch.
3. Verify courseId equals batch.courseId.
4. Verify classroom exists, active, not soft deleted, and belongs to branch.
5. Verify trainer exists, active, branch-compatible, and authorized for course when authorization rules are enabled.
6. Verify scheduledDate is inside batch date range unless authorized override exists.
7. Verify startTime < endTime and duration is between 15 and 480 minutes.
8. Verify business calendar exists and is active for date.
9. Verify operating day is open and time range is inside one working-hour window unless override exists.
10. Verify active holidays affecting scheduling do not exist for date unless override exists.
11. Verify active venue block does not overlap branch/classroom/date/time unless override exists.
12. Verify no overlapping PUBLISHED or RESCHEDULED session for trainer.
13. Verify no overlapping PUBLISHED or RESCHEDULED session for classroom.
14. Verify no overlapping PUBLISHED or RESCHEDULED session for batch.
15. Persist as DRAFT, CONFLICT, or PUBLISHED according to requested status and validation result.
16. Store conflict log and schedule change history.
```

Success response DTO:

```json
{
  "success": true,
  "data": {
    "sessionId": "9df1e7ad-2ac4-4fb2-a9d7-6f306ebfbdf5",
    "status": "PUBLISHED",
    "conflictSummary": {
      "hasBlockingErrors": false,
      "errorCount": 0,
      "warningCount": 0,
      "infoCount": 1
    },
    "attendanceRequestEligible": true,
    "version": 1
  }
}
```

Error catalog includes `ERR_SCH_BATCH_NOT_SCHEDULABLE`, `ERR_SCH_COURSE_BATCH_MISMATCH`, `ERR_SCH_CLASSROOM_NOT_AVAILABLE`, `ERR_SCH_TRAINER_NOT_AVAILABLE`, `ERR_SCH_TRAINER_OVERLAP`, `ERR_SCH_CLASSROOM_OVERLAP`, `ERR_SCH_BATCH_OVERLAP`, `ERR_SCH_HOLIDAY_CONFLICT`, `ERR_SCH_VENUE_BLOCK_CONFLICT`, `ERR_SCH_OUTSIDE_WORKING_HOURS`, `ERR_SCH_BATCH_DATE_RANGE_VIOLATION`, `ERR_SCH_OVERRIDE_PERMISSION_REQUIRED`.

## API-SCH-022 to API-SCH-027 – Schedule Session Detail, Update, Publish, Cancel, Reschedule, Delete

| API ID      | Route                                             | Method | Required Permission             | Request Schema Summary                                                                      | Key Error Codes                                                          |
| ----------- | ------------------------------------------------- | -----: | ------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| API-SCH-022 | `/api/scheduling/sessions/{sessionId}`            |    GET | `scheduling.session.read`       | Path UUID only                                                                              | `ERR_SCH_SESSION_NOT_FOUND`                                              |
| API-SCH-023 | `/api/scheduling/sessions/{sessionId}`            |  PATCH | `scheduling.session.update`     | Editable draft fields plus `version`, `changeReason`                                        | `ERR_SCH_SESSION_UPDATE_NOT_ALLOWED`, `ERR_CONCURRENCY_VERSION_MISMATCH` |
| API-SCH-024 | `/api/scheduling/sessions/{sessionId}/publish`    |   POST | `scheduling.session.publish`    | `version`, `conflictHandling`, `overrideRequests`, `reason`                                 | `ERR_SCH_SESSION_PUBLISH_BLOCKED`, `ERR_SCH_UNRESOLVED_CONFLICTS`        |
| API-SCH-025 | `/api/scheduling/sessions/{sessionId}/cancel`     |   POST | `scheduling.session.cancel`     | `version`, `cancellationReasonCode`, `cancellationNotes`, `notifyTrainer`, `notifyStudents` | `ERR_SCH_SESSION_CANCEL_NOT_ALLOWED`                                     |
| API-SCH-026 | `/api/scheduling/sessions/{sessionId}/reschedule` |   POST | `scheduling.session.reschedule` | New date/time/trainer/classroom plus `version`, `reason`, `notifyTrainer`, `notifyStudents` | `ERR_SCH_SESSION_RESCHEDULE_NOT_ALLOWED`, conflict codes                 |
| API-SCH-027 | `/api/scheduling/sessions/{sessionId}`            | DELETE | `scheduling.session.delete`     | `version`, `reason`                                                                         | `ERR_SCH_SESSION_DELETE_NOT_ALLOWED`                                     |

Reschedule request schema:

```ts
const RescheduleSessionSchema = z
  .object({
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: TimeSchema,
    endTime: TimeSchema,
    trainerId: z.string().uuid(),
    classroomId: z.string().uuid(),
    version: z.number().int().min(1),
    reason: z.string().trim().min(20).max(700),
    conflictHandling: z
      .enum(['REJECT_ON_ERROR', 'SAVE_AS_CONFLICT_DRAFT'])
      .default('REJECT_ON_ERROR'),
    overrideRequests: z
      .array(
        z
          .object({
            overrideType: z.enum([
              'HOLIDAY_OVERRIDE',
              'VENUE_BLOCK_OVERRIDE',
              'WORKING_HOURS_OVERRIDE',
              'BATCH_DATE_OVERRIDE',
              'TRAINER_AVAILABILITY_OVERRIDE',
            ]),
            reason: z.string().trim().min(20).max(500),
          })
          .strict(),
      )
      .max(5)
      .default([]),
    notifyTrainer: z.boolean().default(true),
    notifyStudents: z.boolean().default(true),
  })
  .strict();
```

Reschedule success response:

```json
{
  "success": true,
  "data": {
    "originalSessionId": "9df1e7ad-2ac4-4fb2-a9d7-6f306ebfbdf5",
    "newSessionId": "762e02a0-9ef9-4f2a-80d9-b7c426f70261",
    "originalStatus": "RESCHEDULED",
    "newStatus": "PUBLISHED",
    "notificationRequestsCreated": 42,
    "version": 1
  }
}
```

## API-SCH-028 – Check Conflicts Without Saving

| Field               | Specification                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route               | `POST /api/scheduling/conflicts/check`                                                                                                                |
| Purpose             | Validates a proposed session or block and returns conflicts without mutating scheduling records except optional audit of permission-sensitive checks. |
| Authentication      | Required                                                                                                                                              |
| Required Permission | `scheduling.conflict.read`                                                                                                                            |
| Branch Scoping      | Proposed branch must be inside read scope; mutation scope is not required because no save occurs.                                                     |

Zod request schema:

```ts
const CheckScheduleConflictSchema = z
  .object({
    branchId: z.string().uuid(),
    batchId: z.string().uuid(),
    courseId: z.string().uuid(),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: TimeSchema,
    endTime: TimeSchema,
    trainerId: z.string().uuid(),
    classroomId: z.string().uuid(),
    excludeSessionId: z.string().uuid().optional(),
    purpose: z
      .enum(['DRAFT_SAVE', 'PUBLISH', 'RESCHEDULE', 'SIMULATION'])
      .default('SIMULATION'),
  })
  .strict();
```

Success response DTO:

```json
{
  "success": true,
  "data": {
    "hasBlockingErrors": true,
    "conflicts": [
      {
        "type": "TRAINER_OVERLAP",
        "severity": "ERROR",
        "message": "Trainer already has a published session from 09:30 to 11:30.",
        "conflictingEntityType": "ScheduleSession",
        "conflictingEntityId": "111a1eac-5666-4ed9-a09d-e41f6fa6eec2",
        "canOverride": false,
        "requiredPermission": null
      },
      {
        "type": "HOLIDAY_CONFLICT",
        "severity": "ERROR",
        "message": "The selected date is configured as a public holiday.",
        "conflictingEntityType": "Holiday",
        "conflictingEntityId": "681c0cc7-8a3c-4e7b-9263-99fd0749c4cf",
        "canOverride": true,
        "requiredPermission": "scheduling.override.holiday"
      }
    ]
  }
}
```

## API-SCH-029 – Create Recurrence Pattern and Generate Sessions

| Field               | Specification                                                                       |
| ------------------- | ----------------------------------------------------------------------------------- |
| Route               | `POST /api/scheduling/recurrence-patterns`                                          |
| Purpose             | Creates a recurrence pattern for a batch and generates sessions in one request.     |
| Authentication      | Required                                                                            |
| Required Permission | `scheduling.session.bulk_create`                                                    |
| Branch Scoping      | Branch, batch, trainer, and classroom must be inside mutation scope and compatible. |

Zod request schema:

```ts
const CreateRecurrencePatternSchema = z
  .object({
    branchId: z.string().uuid(),
    batchId: z.string().uuid(),
    courseId: z.string().uuid(),
    patternName: z.string().trim().min(3).max(120),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    daysOfWeek: z
      .array(
        z.enum([
          'MONDAY',
          'TUESDAY',
          'WEDNESDAY',
          'THURSDAY',
          'FRIDAY',
          'SATURDAY',
          'SUNDAY',
        ]),
      )
      .min(1)
      .max(7),
    startTime: TimeSchema,
    endTime: TimeSchema,
    trainerId: z.string().uuid(),
    classroomId: z.string().uuid(),
    sessionTitlePrefix: z.string().trim().min(2).max(100),
    startingSessionNumber: z.number().int().min(1).max(999).default(1),
    maxSessions: z.number().int().min(1).max(120),
    skipHolidays: z.boolean().default(true),
    requestedStatus: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
    conflictHandling: z
      .enum([
        'STOP_ON_FIRST_ERROR',
        'CREATE_VALID_ONLY',
        'SAVE_CONFLICT_DRAFTS',
      ])
      .default('STOP_ON_FIRST_ERROR'),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();
```

Success response DTO:

```json
{
  "success": true,
  "data": {
    "recurrencePatternId": "ea36d1df-cee7-4523-8c24-873f9e1087d7",
    "generationRunId": "d69af66a-f9fe-45a5-88ae-5951b9ff1b5a",
    "status": "PARTIALLY_CREATED",
    "createdSessionCount": 18,
    "skippedHolidayCount": 2,
    "conflictSessionCount": 1,
    "failedSessionCount": 0
  }
}
```

Error catalog includes `ERR_SCH_RECURRENCE_RANGE_INVALID`, `ERR_SCH_RECURRENCE_MAX_SESSION_LIMIT_EXCEEDED`, `ERR_SCH_GENERATION_NO_VALID_DATES`, `ERR_SCH_GENERATION_CONFLICTS_FOUND`.

## API-SCH-030 – Read Schedule Generation Run

| Field               | Specification                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Route               | `GET /api/scheduling/generation-runs/{runId}`                                               |
| Purpose             | Reads recurrence generation summary, created sessions, skipped dates, and conflict details. |
| Authentication      | Required                                                                                    |
| Required Permission | `scheduling.session.read`                                                                   |
| Branch Scoping      | Generation run branch must be inside allowed read scope.                                    |

Success response includes `runId`, `patternId`, `status`, counts, created session references, skipped dates with reasons, and conflict details.

## API-SCH-031 to API-SCH-036 – Timetable Views

| API ID      | Route                                               | Purpose                           | Required Permission              | Branch Scope                                                       |
| ----------- | --------------------------------------------------- | --------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| API-SCH-031 | `GET /api/scheduling/views/daily`                   | Day grid by branch                | `scheduling.view.daily.read`     | Branch-scoped                                                      |
| API-SCH-032 | `GET /api/scheduling/views/weekly`                  | Week grid by branch               | `scheduling.view.weekly.read`    | Branch-scoped                                                      |
| API-SCH-033 | `GET /api/scheduling/views/monthly`                 | Month calendar by branch          | `scheduling.view.monthly.read`   | Branch-scoped                                                      |
| API-SCH-034 | `GET /api/scheduling/views/trainer/{trainerId}`     | Trainer personal/manager schedule | `scheduling.view.trainer.read`   | Trainer can read own schedule; manager read requires branch scope  |
| API-SCH-035 | `GET /api/scheduling/views/classroom/{classroomId}` | Classroom occupancy calendar      | `scheduling.view.classroom.read` | Classroom branch-scoped                                            |
| API-SCH-036 | `GET /api/scheduling/views/batch/{batchId}`         | Batch timetable                   | `scheduling.view.batch.read`     | Batch branch-scoped; student can read only enrolled batch schedule |

Common query schema:

```ts
const TimetableViewQuerySchema = z
  .object({
    branchId: z.string().uuid().optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    status: z
      .array(
        z.enum([
          'DRAFT',
          'CONFLICT',
          'PUBLISHED',
          'RESCHEDULED',
          'CANCELLED',
          'COMPLETED',
        ]),
      )
      .max(6)
      .optional(),
    includeHolidays: z.coerce.boolean().default(true),
    includeVenueBlocks: z.coerce.boolean().default(true),
    language: z.enum(['en', 'ar']).optional(),
  })
  .strict();
```

Success response DTO:

```json
{
  "success": true,
  "data": {
    "viewType": "WEEKLY",
    "branchId": "0c7fc62f-8a54-4c86-a930-c29894e817ef",
    "dateFrom": "2026-08-09",
    "dateTo": "2026-08-15",
    "timezone": "Asia/Muscat",
    "days": [
      {
        "date": "2026-08-10",
        "isHoliday": false,
        "sessions": [
          {
            "sessionId": "9df1e7ad-2ac4-4fb2-a9d7-6f306ebfbdf5",
            "timeRange": "09:00-11:00",
            "batchCode": "HSE-MCT-2026-04",
            "courseName": "Health and Safety Training",
            "trainerName": "Ahmed Al Balushi",
            "classroomName": "Room 201",
            "status": "PUBLISHED"
          }
        ],
        "venueBlocks": []
      }
    ]
  }
}
```

## API-SCH-037 – Export Schedule Data

| Field               | Specification                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Route               | `POST /api/scheduling/exports`                                                                                    |
| Purpose             | Creates an auditable export of sessions, holidays, venue blocks, or utilization data.                             |
| Authentication      | Required                                                                                                          |
| Required Permission | `scheduling.export.create`                                                                                        |
| Branch Scoping      | Export filter must be inside allowed branch scope; consolidated export requires `scheduling.export.consolidated`. |

Zod request schema:

```ts
const CreateScheduleExportSchema = z
  .object({
    exportType: z.enum([
      'SESSION_LIST',
      'DAILY_TIMETABLE',
      'WEEKLY_TIMETABLE',
      'HOLIDAY_LIST',
      'VENUE_BLOCK_LIST',
      'UTILIZATION_REPORT',
      'CONFLICT_REPORT',
    ]),
    branchIds: z.array(z.string().uuid()).min(1).max(25),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    format: z.enum(['CSV', 'XLSX', 'PDF']),
    language: z.enum(['en', 'ar']).default('en'),
    includeCancelled: z.boolean().default(false),
    exportReason: z.string().trim().min(10).max(500),
  })
  .strict();
```

Success response DTO:

```json
{
  "success": true,
  "data": {
    "exportLogId": "df44fa52-a7d1-474a-8769-c9a5b8cd45c1",
    "fileName": "weekly-timetable-MCT-2026-08-09.xlsx",
    "fileUrl": "/api/scheduling/exports/df44fa52-a7d1-474a-8769-c9a5b8cd45c1/download",
    "expiresAt": "2026-07-10T07:30:00.000Z",
    "rowCount": 84
  }
}
```

## API-SCH-038 – Utilization Report

| Field               | Specification                                                                         |
| ------------------- | ------------------------------------------------------------------------------------- |
| Route               | `GET /api/scheduling/reports/utilization`                                             |
| Purpose             | Returns classroom and trainer utilization percentages by date range.                  |
| Authentication      | Required                                                                              |
| Required Permission | `scheduling.report.utilization.read`                                                  |
| Branch Scoping      | Branch-scoped; consolidated reporting requires `scheduling.report.consolidated.read`. |

Zod query schema:

```ts
const UtilizationReportQuerySchema = z
  .object({
    branchIds: z.array(z.string().uuid()).min(1).max(25),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    groupBy: z.enum(['BRANCH', 'CLASSROOM', 'TRAINER', 'COURSE', 'BATCH']),
    includeDraft: z.coerce.boolean().default(false),
  })
  .strict();
```

Success response DTO:

```json
{
  "success": true,
  "data": {
    "period": { "dateFrom": "2026-08-01", "dateTo": "2026-08-31" },
    "groupBy": "CLASSROOM",
    "items": [
      {
        "branchId": "0c7fc62f-8a54-4c86-a930-c29894e817ef",
        "classroomId": "37647cb6-2d82-4758-92f8-ef4e51b65de6",
        "classroomName": "Room 201",
        "availableMinutes": 9600,
        "scheduledMinutes": 4260,
        "utilizationPercentage": 44.38
      }
    ]
  }
}
```

## API-SCH-039 – Conflict Report

| Field               | Specification                                                           |
| ------------------- | ----------------------------------------------------------------------- |
| Route               | `GET /api/scheduling/reports/conflicts`                                 |
| Purpose             | Returns saved and attempted conflict checks for operational governance. |
| Authentication      | Required                                                                |
| Required Permission | `scheduling.report.conflict.read`                                       |
| Branch Scoping      | Conflict logs are branch-scoped.                                        |

Zod query schema:

```ts
const ConflictReportQuerySchema = PaginationQuerySchema.extend({
  branchIds: z.array(z.string().uuid()).min(1).max(25),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  conflictType: z
    .enum([
      'TRAINER_OVERLAP',
      'CLASSROOM_OVERLAP',
      'BATCH_OVERLAP',
      'HOLIDAY_CONFLICT',
      'VENUE_BLOCK_CONFLICT',
      'TRAINER_UNAVAILABLE',
      'OUTSIDE_WORKING_DAY',
      'OUTSIDE_WORKING_HOURS',
      'BATCH_DATE_RANGE_VIOLATION',
      'BRANCH_MISMATCH',
      'COURSE_AUTHORIZATION_MISSING',
    ])
    .optional(),
  severity: z.enum(['ERROR', 'WARNING', 'INFO']).optional(),
  resolved: z.coerce.boolean().optional(),
}).strict();
```

## 7. Server Action Contracts

Server Actions are used by Next.js form submissions and must delegate to the same application services as REST route handlers.

| Server Action                  | Input                         | Output                                        | Permission                      | Notes                                           |
| ------------------------------ | ----------------------------- | --------------------------------------------- | ------------------------------- | ----------------------------------------------- |
| `createScheduleSessionAction`  | `CreateScheduleSessionSchema` | `ActionResult<CreateScheduleSessionResponse>` | `scheduling.session.create`     | Used by Admin schedule create drawer.           |
| `rescheduleSessionAction`      | `RescheduleSessionSchema`     | `ActionResult<RescheduleSessionResponse>`     | `scheduling.session.reschedule` | Used by Admin reschedule modal.                 |
| `createVenueBlockAction`       | `CreateVenueBlockSchema`      | `ActionResult<CreateVenueBlockResponse>`      | `scheduling.venue_block.create` | Used by venue block form.                       |
| `createHolidayAction`          | `CreateHolidaySchema`         | `ActionResult<CreateHolidayResponse>`         | `scheduling.holiday.create`     | Used by holiday form.                           |
| `publishScheduleSessionAction` | `PublishSessionSchema`        | `ActionResult<PublishSessionResponse>`        | `scheduling.session.publish`    | Must re-run conflict validation before publish. |
| `cancelScheduleSessionAction`  | `CancelSessionSchema`         | `ActionResult<CancelSessionResponse>`         | `scheduling.session.cancel`     | Must optionally trigger notifications.          |

Server Action result shape:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        field?: string;
        details?: unknown;
      };
    };
```

---

## 8. Error Response Catalog

| HTTP Status | Application Error Code                          | Meaning                                                       | Typical Resolution                               |
| ----------: | ----------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------ |
|         400 | `ERR_SCH_INVALID_DATE_RANGE`                    | Date range is invalid.                                        | Provide `dateFrom <= dateTo`.                    |
|         400 | `ERR_SCH_INVALID_TIME_RANGE`                    | Start time is not before end time or duration exceeds limits. | Use valid `HH:mm` time range.                    |
|         400 | `ERR_SCH_INVALID_EFFECTIVE_DATE_RANGE`          | Effective start/end dates are invalid.                        | Correct effective dating.                        |
|         401 | `ERR_AUTH_REQUIRED`                             | User is not authenticated.                                    | Sign in again.                                   |
|         403 | `ERR_IAM_PERMISSION_DENIED`                     | User lacks required permission.                               | Request permission through IAM.                  |
|         403 | `ERR_ORG_BRANCH_SCOPE_DENIED`                   | User cannot access requested branch.                          | Switch to assigned branch or request access.     |
|         403 | `ERR_SCH_OVERRIDE_PERMISSION_REQUIRED`          | User attempted restricted override.                           | Branch Manager or Super Admin approval required. |
|         404 | `ERR_SCH_CALENDAR_NOT_FOUND`                    | Calendar not found in branch scope.                           | Verify calendar and branch.                      |
|         404 | `ERR_SCH_HOLIDAY_NOT_FOUND`                     | Holiday not found in branch scope.                            | Verify holiday.                                  |
|         404 | `ERR_SCH_VENUE_BLOCK_NOT_FOUND`                 | Venue block not found in branch scope.                        | Verify block.                                    |
|         404 | `ERR_SCH_SESSION_NOT_FOUND`                     | Schedule session not found in branch scope.                   | Verify session.                                  |
|         409 | `ERR_CONCURRENCY_VERSION_MISMATCH`              | Record was updated by another user.                           | Reload latest version and retry.                 |
|         409 | `ERR_SCH_CALENDAR_CODE_DUPLICATE`               | Calendar code exists for branch.                              | Use a unique code.                               |
|         409 | `ERR_SCH_ACTIVE_CALENDAR_YEAR_EXISTS`           | Active calendar already exists for branch/year.               | Close old calendar before activation.            |
|         409 | `ERR_SCH_HOLIDAY_DUPLICATE_DATE`                | Duplicate active holiday exists for same calendar/date/type.  | Update existing holiday.                         |
|         409 | `ERR_SCH_VENUE_BLOCK_OVERLAP`                   | Venue block overlaps another active block.                    | Adjust date/time or cancel existing block.       |
|         409 | `ERR_SCH_TRAINER_OVERLAP`                       | Trainer is double booked.                                     | Pick another trainer or time.                    |
|         409 | `ERR_SCH_CLASSROOM_OVERLAP`                     | Classroom is double booked.                                   | Pick another classroom or time.                  |
|         409 | `ERR_SCH_BATCH_OVERLAP`                         | Batch already has overlapping session.                        | Pick another time.                               |
|         409 | `ERR_SCH_HOLIDAY_CONFLICT`                      | Session falls on active holiday.                              | Pick another date or approved override.          |
|         409 | `ERR_SCH_VENUE_BLOCK_CONFLICT`                  | Session overlaps venue block.                                 | Pick another time/room or approved override.     |
|         409 | `ERR_SCH_TRAINER_UNAVAILABLE`                   | Trainer availability does not cover session.                  | Pick another trainer/time or approved override.  |
|         409 | `ERR_SCH_OUTSIDE_WORKING_DAY`                   | Calendar weekday is closed.                                   | Pick open day or approved override.              |
|         409 | `ERR_SCH_OUTSIDE_WORKING_HOURS`                 | Session outside working hours.                                | Pick valid time or approved override.            |
|         409 | `ERR_SCH_BATCH_DATE_RANGE_VIOLATION`            | Session outside batch start/end dates.                        | Adjust date or batch dates.                      |
|         409 | `ERR_SCH_COURSE_BATCH_MISMATCH`                 | Request course does not match batch course.                   | Use batch course.                                |
|         409 | `ERR_SCH_CLASSROOM_BRANCH_MISMATCH`             | Classroom does not belong to branch.                          | Select classroom from target branch.             |
|         409 | `ERR_SCH_TRAINER_BRANCH_MISMATCH`               | Trainer is not valid for branch.                              | Select branch-compatible trainer.                |
|         409 | `ERR_SCH_COURSE_AUTHORIZATION_MISSING`          | Trainer is not authorized to teach course.                    | Configure trainer authorization.                 |
|         409 | `ERR_SCH_SESSION_PUBLISH_BLOCKED`               | Session has blocking conflicts.                               | Resolve conflicts.                               |
|         409 | `ERR_SCH_SESSION_CANCEL_NOT_ALLOWED`            | Session cannot be cancelled due to state.                     | Verify status.                                   |
|         409 | `ERR_SCH_SESSION_RESCHEDULE_NOT_ALLOWED`        | Session cannot be rescheduled due to state.                   | Verify status and attendance dependency.         |
|         409 | `ERR_SCH_RECURRENCE_MAX_SESSION_LIMIT_EXCEEDED` | Recurrence would generate too many sessions.                  | Reduce range or max sessions.                    |
|         422 | `ERR_VALIDATION_FAILED`                         | Request payload failed Zod validation.                        | Correct field values.                            |
|         500 | `ERR_INTERNAL_SERVER_ERROR`                     | Unexpected server error.                                      | Retry or contact administrator.                  |

---

## 9. API-to-Audit Mapping

| API Group                               | Audit Required | Audit Action                                                                       |
| --------------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| Calendar create/update/status/delete    | Yes            | `SCHEDULING_CALENDAR_CHANGED`                                                      |
| Operating days/working hours replace    | Yes            | `SCHEDULING_OPERATING_HOURS_CHANGED`                                               |
| Holiday create/update/status/delete     | Yes            | `SCHEDULING_HOLIDAY_CHANGED`                                                       |
| Venue block create/update/status/delete | Yes            | `SCHEDULING_VENUE_BLOCK_CHANGED`                                                   |
| Schedule session create/update/publish  | Yes            | `SCHEDULING_SESSION_CHANGED`                                                       |
| Schedule session cancel/reschedule      | Yes            | `SCHEDULING_SESSION_LIFECYCLE_CHANGED`                                             |
| Conflict check                          | Conditional    | Audit only when saved as conflict, override requested, or run by consolidated user |
| Export                                  | Yes            | `SCHEDULING_EXPORT_CREATED`                                                        |
| Reports                                 | Conditional    | Audit consolidated report reads and exports                                        |

---

## 10. Public and Portal Read Contracts

### Student Portal Schedule Read

Route: `GET /api/student/schedule`

Permission: implicit authenticated student access. The student can read only sessions linked to active enrollments through `Enrollment.batchId`.

Query schema:

```ts
const StudentScheduleQuerySchema = z
  .object({
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    enrollmentId: z.string().uuid().optional(),
    language: z.enum(['en', 'ar']).optional(),
  })
  .strict();
```

### Trainer Portal Schedule Read

Route: `GET /api/trainer/schedule`

Permission: implicit authenticated trainer access. The trainer can read only sessions where `ScheduleSession.trainerId` maps to the trainer's own `TrainerProfile.id`, unless the user also has admin scheduling permissions.

### Public Website Course Schedule Read

Route: `GET /api/public/courses/{courseSlug}/schedule`

Authentication: not required.

Scope: only published course pages, active branches, published future sessions, no trainer personal details beyond public display name, no conflict or audit data.
