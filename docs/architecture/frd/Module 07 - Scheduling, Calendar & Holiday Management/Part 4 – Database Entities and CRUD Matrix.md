# Part 4 – Database Entities and CRUD Matrix

## Module 07 – Scheduling, Calendar & Holiday Management

## 1. Document Control

| Field | Value |
|---|---|
| Product | Al Saud Training Institute Integrated Institute Management System |
| Module | Module 07 – Scheduling, Calendar & Holiday Management |
| Module Code | SCH |
| Owning Bounded Context | Scheduling, Calendar & Holiday Management |
| Architecture Style | Next.js modular monolith, Prisma, PostgreSQL, shared relational database |
| Data Access Rule | Server-side branch scoping is mandatory for every query and mutation |
| Deletion Policy | Soft delete only; no hard delete for operational scheduling data |
| Timezone Storage | Persist timestamps in UTC; render and validate operational dates/times in Oman timezone `Asia/Muscat`, UTC+04:00 |
| Localization | English and Arabic localized JSON for calendar names, holiday names, venue block reasons, and user-facing schedule labels |
| Audit Policy | Create, update, publish, reschedule, cancel, override, soft delete, export, and permission-sensitive reads must be auditable |

---

## 2. Database Design Overview

This part defines the database models owned by Module 07 – Scheduling, Calendar & Holiday Management. The design follows a modular monolith approach. The Scheduling context owns planning-time records and references master data from other contexts without duplicating ownership.

The context owns these persistent entities:

| Entity | Ownership Type | Purpose |
|---|---|---|
| `BusinessCalendar` | Owned | Defines the institute operating calendar for a year or effective period. |
| `BranchCalendarOverride` | Owned | Defines branch-specific deviations from the institute calendar for a year. |
| `CalendarOperatingDay` | Owned | Defines whether each weekday is open or closed for a calendar source. |
| `CalendarWorkingHour` | Owned | Defines one or more working time windows for each operating day. |
| `Holiday` | Owned | Defines public holidays, ASTI holidays, branch closures, and non-training days. |
| `VenueBlock` | Owned | Blocks a full branch or a specific classroom for a date/time range. |
| `ScheduleSession` | Owned | Stores official planned, published, cancelled, rescheduled, or completed timetable sessions. |
| `ScheduleRecurrencePattern` | Owned | Stores reusable recurring session generation rules for a batch. |
| `ScheduleGenerationRun` | Owned | Stores the audit-friendly result of bulk schedule generation. |
| `ScheduleConflictLog` | Owned | Stores deterministic conflict checks and results for saved draft, publish, and reschedule attempts. |
| `ScheduleOverride` | Owned | Stores approved bypasses for holiday, venue block, working-hours, trainer, classroom, or batch constraints. |
| `ScheduleChangeHistory` | Owned | Stores domain-level before/after snapshots for schedule lifecycle changes in addition to generic `AuditLog`. |
| `ScheduleExportLog` | Owned | Stores export metadata for compliance and data-access auditing. |

The context references these external entities:

| External Entity | Owning Context | Usage in Scheduling |
|---|---|---|
| `Branch` | Organization Management | Branch ownership, branch scoping, branch override association. |
| `Classroom` | Organization Management | Classroom booking and venue blocking. |
| `Course` | Course Catalog Management | Course consistency with batch and schedule display. |
| `Batch` | Training Delivery Management | Schedule sessions are planned for batches. |
| `TrainerProfile` | Faculty / Trainer Management | Trainer assignment and availability validation. |
| `User` | Identity & Access Management | Actor references and audit actor references. |
| `AttendanceSession` | Attendance Management | Downstream consumer once a schedule session is published. |
| `AuditLog` | Audit & Compliance | Generic cross-context audit sink. |

### 2.1 Physical Naming Convention

| Layer | Convention | Example |
|---|---|---|
| PostgreSQL table | snake_case plural or domain-specific singular collection name | `schedule_sessions` |
| PostgreSQL column | snake_case | `scheduled_date` |
| Prisma model | PascalCase singular | `ScheduleSession` |
| Prisma field | camelCase | `scheduledDate` |
| Enum value | SCREAMING_SNAKE_CASE in DB, PascalCase or string enum in TypeScript boundary | `PUBLISHED`, `Published` |
| Permission code | lower dot notation | `scheduling.session.publish` |

### 2.2 Common Base Columns

All owned operational tables use these columns unless specifically stated otherwise.

| Field | PostgreSQL Type | Prisma Type | Null | Key | Default | Notes |
|---|---:|---:|---:|---|---|---|
| id | uuid | String @db.Uuid | No | PK | gen_random_uuid() / uuid() | Immutable technical identifier. |
| createdAt | timestamptz | DateTime | No |  | now() | Stored in UTC; rendered in Oman GST. |
| createdBy | uuid | String @db.Uuid | No | FK → User.id |  | User or system user that created the row. |
| updatedAt | timestamptz | DateTime | No |  | now() | Updated on every mutation. |
| updatedBy | uuid | String @db.Uuid | No | FK → User.id |  | User or system user that last modified the row. |
| deletedAt | timestamptz | DateTime? | Yes |  | null | Set only for soft delete. |
| deletedBy | uuid | String? @db.Uuid | Yes | FK → User.id | null | Required when `isDeleted = true`. |
| isDeleted | boolean | Boolean | No |  | false | All read queries must filter `isDeleted = false` unless audit/recovery permission is used. |
| version | integer | Int | No |  | 1 | Incremented on every update for optimistic locking. |

### 2.3 Effective Dating Standard

Effective dating is required for records that control future scheduling eligibility or validity.

| Field | PostgreSQL Type | Prisma Type | Null | Notes |
|---|---:|---:|---:|---|
| effectiveStartDate | date | DateTime | No | Date from which rule is valid in branch local calendar. Stored as date-only semantic. |
| effectiveEndDate | date | DateTime? | Yes | Null means open-ended. Must be greater than or equal to `effectiveStartDate` when present. |
| status | enum/text | Enum | No | Entity-specific state. Status does not replace soft delete. |
| isActive | boolean | Boolean | No | Query optimization flag derived from status where useful. |

### 2.4 Branch Scoping Standard

Every owned table must be branch-resolvable. The preferred implementation is a direct `branchId` column for owned scheduling tables. If a child entity belongs to a parent calendar or session, it still carries `branchId` where it improves query safety and reporting performance.

Server-side queries must apply this logic:

```text
AllowedBranchIds = UserBranchAccess.assignedBranchIds

If user has consolidated scheduling/reporting permission:
    Allow selected branch scope from assigned branches and permitted child branches.
Else:
    Allow only active branch context or explicitly assigned branch.

Every read and write WHERE clause must include:
    branchId IN AllowedBranchIds
    isDeleted = false
```

---

## 3. Enumerations

### 3.1 CalendarStatus

| Value | Meaning | Terminal |
|---|---|---|
| `DRAFT` | Calendar is being prepared and cannot be used for published scheduling unless explicitly selected for simulation. | No |
| `ACTIVE` | Calendar is valid for scheduling validations. | No |
| `CLOSED` | Calendar is no longer used for new scheduling but remains readable and reportable. | No |
| `ARCHIVED` | Calendar is locked for historical retention. | Yes |

### 3.2 WeekdayCode

| Value | Meaning |
|---|---|
| `MONDAY` | Monday |
| `TUESDAY` | Tuesday |
| `WEDNESDAY` | Wednesday |
| `THURSDAY` | Thursday |
| `FRIDAY` | Friday |
| `SATURDAY` | Saturday |
| `SUNDAY` | Sunday |

### 3.3 HolidayStatus

| Value | Meaning |
|---|---|
| `DRAFT` | Holiday is captured but not enforced. |
| `ACTIVE` | Holiday participates in conflict validation. |
| `INACTIVE` | Holiday remains retained but does not block scheduling. |
| `ARCHIVED` | Holiday is locked for history. |

### 3.4 HolidayType

| Value | Meaning |
|---|---|
| `OMAN_PUBLIC_HOLIDAY` | Oman public holiday. |
| `ASTI_INSTITUTE_HOLIDAY` | ASTI-wide holiday. |
| `BRANCH_CLOSURE` | Branch-specific closure day. |
| `NON_TRAINING_DAY` | Operational non-training day. |
| `SPECIAL_EVENT_DAY` | Day reserved for official institute event. |
| `EMERGENCY_CLOSURE` | Emergency closure caused by operational or safety reason. |

### 3.5 VenueBlockStatus

| Value | Meaning |
|---|---|
| `DRAFT` | Block is prepared but not enforced. |
| `ACTIVE` | Block participates in conflict validation. |
| `CANCELLED` | Block was cancelled and no longer participates in validation. |
| `EXPIRED` | Block is in the past and no longer active. |
| `ARCHIVED` | Block is locked for historical retention. |

### 3.6 VenueBlockScope

| Value | Meaning |
|---|---|
| `BRANCH` | Applies to all classrooms and all sessions in the branch. |
| `CLASSROOM` | Applies only to the selected classroom. |

### 3.7 ScheduleSessionStatus

| Value | Meaning | Terminal |
|---|---|---|
| `DRAFT` | Session is saved but not official. | No |
| `CONFLICT` | Session is saved as draft with unresolved conflicts, if allowed by policy. | No |
| `PUBLISHED` | Session is official and visible to downstream consumers. | No |
| `RESCHEDULED` | Original published session has been replaced by another session. | No |
| `CANCELLED` | Session is cancelled with reason. | Yes for normal workflow |
| `COMPLETED` | Delivery/attendance process marked session completed. | Yes for normal scheduling workflow |

### 3.8 ScheduleConflictType

| Value | Meaning |
|---|---|
| `TRAINER_OVERLAP` | Trainer already has an overlapping published or rescheduled session. |
| `CLASSROOM_OVERLAP` | Classroom already has an overlapping published or rescheduled session. |
| `BATCH_OVERLAP` | Batch already has an overlapping published or rescheduled session. |
| `HOLIDAY_CONFLICT` | Date is an active holiday, closure day, or non-training day. |
| `VENUE_BLOCK_CONFLICT` | Date/time overlaps an active branch or classroom block. |
| `TRAINER_UNAVAILABLE` | Trainer availability does not cover the session. |
| `OUTSIDE_WORKING_DAY` | Calendar weekday is closed. |
| `OUTSIDE_WORKING_HOURS` | Session is outside configured working-hour windows. |
| `BATCH_DATE_RANGE_VIOLATION` | Session date is outside batch start/end date. |
| `BRANCH_MISMATCH` | Course, batch, classroom, or trainer branch is incompatible. |
| `COURSE_AUTHORIZATION_MISSING` | Trainer is not authorized for the course when authorization is configured. |

### 3.9 ScheduleConflictSeverity

| Value | Meaning |
|---|---|
| `ERROR` | Must block publishing unless an explicit override permission exists. |
| `WARNING` | Can save draft but must be reviewed before publishing. |
| `INFO` | Informational validation result. |

### 3.10 OverrideType

| Value | Meaning |
|---|---|
| `HOLIDAY_OVERRIDE` | Authorized scheduling on an active holiday. |
| `VENUE_BLOCK_OVERRIDE` | Authorized scheduling during an active block. |
| `WORKING_HOURS_OVERRIDE` | Authorized scheduling outside operating hours. |
| `BATCH_DATE_OVERRIDE` | Authorized scheduling outside batch date range. |
| `TRAINER_AVAILABILITY_OVERRIDE` | Authorized scheduling outside configured trainer availability. |
| `CLASSROOM_CAPACITY_OVERRIDE` | Authorized use of a classroom warning condition. |
| `CONFLICT_DRAFT_ACCEPTANCE` | Authorized saving of a conflict draft. |

### 3.11 GenerationRunStatus

| Value | Meaning |
|---|---|
| `REQUESTED` | Generation request was submitted. |
| `VALIDATING` | Rule and conflict checks are running in-process. |
| `PARTIALLY_CREATED` | Some sessions were created and some were rejected. |
| `CREATED` | All requested sessions were created. |
| `FAILED` | No sessions were created due to validation failure or unexpected error. |
| `CANCELLED` | User cancelled before persisting sessions. |

---

## 4. Entity Specifications

## 4.1 BusinessCalendar

### Purpose

`BusinessCalendar` defines the effective operating calendar for one branch, normally for a calendar year. It is the parent record for operating days, working hours, and holidays.

### Table Definition

| Field | PostgreSQL Type | Prisma Type | Nullability | Keys | Indexes / Constraints | Description |
|---|---:|---:|---:|---|---|---|
| id | uuid | String @id @default(uuid()) @db.Uuid | No | PK | `business_calendars_pkey` | Calendar identifier. |
| branch_id | uuid | String @db.Uuid | No | FK → branches.id | `idx_business_calendars_branch_year`, `idx_business_calendars_branch_status` | Branch owning the calendar. |
| code | varchar(40) | String @db.VarChar(40) | No | Unique per branch | `uq_business_calendar_branch_code_active` where not deleted | Human-friendly code such as `MCT-2026`. |
| name | varchar(160) | String @db.VarChar(160) | No |  |  | Default display name. |
| name_localized | jsonb | Json | No |  | `chk_business_calendar_name_localized_required` | Required shape: `{"en":"Muscat Calendar 2026","ar":"تقويم مسقط 2026"}`. |
| year | smallint | Int @db.SmallInt | No |  | `chk_business_calendar_year_range` | Four-digit year from 2000 to 2100. |
| country_code | char(2) | String @db.Char(2) | No |  | default `OM`, regex `^[A-Z]{2}$` | Country code for holiday alignment. |
| timezone | varchar(64) | String @db.VarChar(64) | No |  | default `Asia/Muscat` | Operational timezone. |
| effective_start_date | date | DateTime @db.Date | No |  | `chk_business_calendar_effective_dates` | First valid date. |
| effective_end_date | date | DateTime? @db.Date | Yes |  | `chk_business_calendar_effective_dates` | Last valid date. Null not recommended for yearly calendars but allowed for transition calendars. |
| status | calendar_status | CalendarStatus | No |  | `idx_business_calendars_branch_status` | Draft, Active, Closed, Archived. |
| is_active | boolean | Boolean | No |  | default false | True only when status is Active. |
| notes | text | String? | Yes |  |  | Internal notes. |
| created_at | timestamptz | DateTime | No |  | default now() | Base audit. |
| created_by | uuid | String @db.Uuid | No | FK → users.id |  | Base audit. |
| updated_at | timestamptz | DateTime | No |  | default now() | Base audit. |
| updated_by | uuid | String @db.Uuid | No | FK → users.id |  | Base audit. |
| deleted_at | timestamptz | DateTime? | Yes |  |  | Soft delete timestamp. |
| deleted_by | uuid | String? @db.Uuid | Yes | FK → users.id |  | Soft delete actor. |
| is_deleted | boolean | Boolean | No |  | default false | Soft delete flag. |
| version | integer | Int | No |  | default 1, `chk_business_calendar_version_positive` | Optimistic locking. |

### Indexes and Constraints

| Name | Type | Definition |
|---|---|---|
| `business_calendars_pkey` | Primary Key | `(id)` |
| `uq_business_calendar_branch_code_active` | Partial Unique | `(branch_id, lower(code)) WHERE is_deleted = false` |
| `uq_business_calendar_active_branch_year` | Partial Unique | `(branch_id, year) WHERE status = 'ACTIVE' AND is_deleted = false` |
| `idx_business_calendars_branch_year` | B-tree | `(branch_id, year)` |
| `idx_business_calendars_branch_status` | B-tree | `(branch_id, status, is_deleted)` |
| `chk_business_calendar_year_range` | Check | `year BETWEEN 2000 AND 2100` |
| `chk_business_calendar_effective_dates` | Check | `effective_end_date IS NULL OR effective_start_date <= effective_end_date` |
| `chk_business_calendar_name_localized_required` | Check | `name_localized ? 'en' AND name_localized ? 'ar'` |

### Prisma Model

```prisma
enum CalendarStatus {
  DRAFT
  ACTIVE
  CLOSED
  ARCHIVED
}

model BusinessCalendar {
  id                 String                 @id @default(uuid()) @db.Uuid
  branchId           String                 @map("branch_id") @db.Uuid
  code               String                 @db.VarChar(40)
  name               String                 @db.VarChar(160)
  nameLocalized      Json                   @map("name_localized")
  year               Int                    @db.SmallInt
  countryCode        String                 @default("OM") @map("country_code") @db.Char(2)
  timezone           String                 @default("Asia/Muscat") @db.VarChar(64)
  effectiveStartDate DateTime               @map("effective_start_date") @db.Date
  effectiveEndDate   DateTime?              @map("effective_end_date") @db.Date
  status             CalendarStatus
  isActive           Boolean                @default(false) @map("is_active")
  notes              String?
  createdAt          DateTime               @default(now()) @map("created_at")
  createdBy          String                 @map("created_by") @db.Uuid
  updatedAt          DateTime               @updatedAt @map("updated_at")
  updatedBy          String                 @map("updated_by") @db.Uuid
  deletedAt          DateTime?              @map("deleted_at")
  deletedBy          String?                @map("deleted_by") @db.Uuid
  isDeleted          Boolean                @default(false) @map("is_deleted")
  version            Int                    @default(1)

  operatingDays      CalendarOperatingDay[]
  holidays           Holiday[]

  @@index([branchId, year], map: "idx_business_calendars_branch_year")
  @@index([branchId, status, isDeleted], map: "idx_business_calendars_branch_status")
  @@map("business_calendars")
}
```

---

## 4.2 CalendarOperatingDay

### Purpose

`CalendarOperatingDay` stores one row per weekday per calendar source. It avoids opaque JSON rules and enables deterministic conflict checks, reporting, and validation.

### Table Definition

| Field | PostgreSQL Type | Prisma Type | Nullability | Keys | Indexes / Constraints | Description |
|---|---:|---:|---:|---|---|---|
| id | uuid | String @id @default(uuid()) @db.Uuid | No | PK |  | Operating day identifier. |
| business_calendar_id | uuid | String @db.Uuid | No | FK → business_calendars.id | `idx_calendar_operating_days_calendar` | Parent calendar. |
| branch_id | uuid | String @db.Uuid | No | FK → branches.id | `idx_calendar_operating_days_branch_weekday` | Denormalized branch for safe scoped queries. |
| weekday | weekday_code | WeekdayCode | No |  | `uq_calendar_operating_day_weekday` | Weekday code. |
| is_open | boolean | Boolean | No |  | default true | Whether scheduling can occur on this weekday. |
| sort_order | smallint | Int @db.SmallInt | No |  | `chk_operating_day_sort_order` | Monday = 1 through Sunday = 7. |
| reason_closed | varchar(240) | String? @db.VarChar(240) | Yes |  |  | Required in UI when closing a normally open day. |
| reason_closed_localized | jsonb | Json? | Yes |  |  | Optional localized reason. |
| effective_start_date | date | DateTime @db.Date | No |  |  | Usually inherited from calendar. |
| effective_end_date | date | DateTime? @db.Date | Yes |  |  | Usually inherited from calendar. |
| status | varchar(20) | String @db.VarChar(20) | No |  | allowed `ACTIVE`, `INACTIVE` | Lifecycle for rule row. |
| is_active | boolean | Boolean | No |  | default true | Derived active flag. |
| audit/base fields | see common fields | see common fields | No/Yes | FK → users.id |  | Standard audit, soft delete, version. |

### Indexes and Constraints

| Name | Type | Definition |
|---|---|---|
| `uq_calendar_operating_day_weekday` | Partial Unique | `(business_calendar_id, weekday) WHERE is_deleted = false` |
| `idx_calendar_operating_days_calendar` | B-tree | `(business_calendar_id, is_open, is_deleted)` |
| `idx_calendar_operating_days_branch_weekday` | B-tree | `(branch_id, weekday, status, is_deleted)` |
| `chk_operating_day_sort_order` | Check | `sort_order BETWEEN 1 AND 7` |
| `chk_operating_day_effective_dates` | Check | `effective_end_date IS NULL OR effective_start_date <= effective_end_date` |

### Prisma Model

```prisma
enum WeekdayCode {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}

model CalendarOperatingDay {
  id                    String                @id @default(uuid()) @db.Uuid
  businessCalendarId    String                @map("business_calendar_id") @db.Uuid
  branchId              String                @map("branch_id") @db.Uuid
  weekday               WeekdayCode
  isOpen                Boolean               @default(true) @map("is_open")
  sortOrder             Int                   @map("sort_order") @db.SmallInt
  reasonClosed          String?               @map("reason_closed") @db.VarChar(240)
  reasonClosedLocalized Json?                 @map("reason_closed_localized")
  effectiveStartDate    DateTime              @map("effective_start_date") @db.Date
  effectiveEndDate      DateTime?             @map("effective_end_date") @db.Date
  status                String                @default("ACTIVE") @db.VarChar(20)
  isActive              Boolean               @default(true) @map("is_active")
  createdAt             DateTime              @default(now()) @map("created_at")
  createdBy             String                @map("created_by") @db.Uuid
  updatedAt             DateTime              @updatedAt @map("updated_at")
  updatedBy             String                @map("updated_by") @db.Uuid
  deletedAt             DateTime?             @map("deleted_at")
  deletedBy             String?               @map("deleted_by") @db.Uuid
  isDeleted             Boolean               @default(false) @map("is_deleted")
  version               Int                   @default(1)

  businessCalendar      BusinessCalendar      @relation(fields: [businessCalendarId], references: [id], onDelete: Restrict)
  workingHours          CalendarWorkingHour[]

  @@index([businessCalendarId, isOpen, isDeleted], map: "idx_calendar_operating_days_calendar")
  @@index([branchId, weekday, status, isDeleted], map: "idx_calendar_operating_days_branch_weekday")
  @@map("calendar_operating_days")
}
```

---

## 4.3 CalendarWorkingHour

### Purpose

`CalendarWorkingHour` defines one or more non-overlapping time windows for an open weekday. Scheduling validations use this table to reject sessions outside branch working hours.

### Table Definition

| Field | PostgreSQL Type | Prisma Type | Nullability | Keys | Indexes / Constraints | Description |
|---|---:|---:|---:|---|---|---|
| id | uuid | String @id @default(uuid()) @db.Uuid | No | PK |  | Working hour identifier. |
| calendar_operating_day_id | uuid | String @db.Uuid | No | FK → calendar_operating_days.id | `idx_calendar_working_hours_day` | Parent weekday rule. |
| business_calendar_id | uuid | String @db.Uuid | No | FK → business_calendars.id | `idx_calendar_working_hours_calendar` | Denormalized parent calendar for validation speed. |
| branch_id | uuid | String @db.Uuid | No | FK → branches.id | `idx_calendar_working_hours_branch` | Branch scope. |
| window_label | varchar(80) | String? @db.VarChar(80) | Yes |  |  | Label such as `Morning`, `Evening`. |
| start_time | time | DateTime @db.Time(0) | No |  | `chk_working_hour_time_order` | Window start in branch local time. |
| end_time | time | DateTime @db.Time(0) | No |  | `chk_working_hour_time_order` | Window end in branch local time. |
| sort_order | smallint | Int @db.SmallInt | No |  | default 1 | Display and validation order. |
| effective_start_date | date | DateTime @db.Date | No |  |  | Effective start date. |
| effective_end_date | date | DateTime? @db.Date | Yes |  |  | Effective end date. |
| status | varchar(20) | String @db.VarChar(20) | No |  | allowed `ACTIVE`, `INACTIVE` | Rule state. |
| is_active | boolean | Boolean | No |  | default true | Derived active flag. |
| audit/base fields | see common fields | see common fields | No/Yes | FK → users.id |  | Standard audit, soft delete, version. |

### Indexes and Constraints

| Name | Type | Definition |
|---|---|---|
| `idx_calendar_working_hours_day` | B-tree | `(calendar_operating_day_id, start_time, end_time, is_deleted)` |
| `idx_calendar_working_hours_calendar` | B-tree | `(business_calendar_id, status, is_deleted)` |
| `idx_calendar_working_hours_branch` | B-tree | `(branch_id, status, is_deleted)` |
| `chk_working_hour_time_order` | Check | `start_time < end_time` |
| `chk_working_hour_effective_dates` | Check | `effective_end_date IS NULL OR effective_start_date <= effective_end_date` |
| `ex_calendar_working_hours_no_overlap` | Exclusion Constraint | For the same `calendar_operating_day_id`, active non-deleted time ranges must not overlap. Implement using `btree_gist` and `tsrange` equivalent from fixed date + time, or enforce in application when time-only range exclusion is unavailable. |

### Prisma Model

```prisma
model CalendarWorkingHour {
  id                     String               @id @default(uuid()) @db.Uuid
  calendarOperatingDayId String               @map("calendar_operating_day_id") @db.Uuid
  businessCalendarId     String               @map("business_calendar_id") @db.Uuid
  branchId               String               @map("branch_id") @db.Uuid
  windowLabel            String?              @map("window_label") @db.VarChar(80)
  startTime              DateTime             @map("start_time") @db.Time(0)
  endTime                DateTime             @map("end_time") @db.Time(0)
  sortOrder              Int                  @default(1) @map("sort_order") @db.SmallInt
  effectiveStartDate     DateTime             @map("effective_start_date") @db.Date
  effectiveEndDate       DateTime?            @map("effective_end_date") @db.Date
  status                 String               @default("ACTIVE") @db.VarChar(20)
  isActive               Boolean              @default(true) @map("is_active")
  createdAt              DateTime             @default(now()) @map("created_at")
  createdBy              String               @map("created_by") @db.Uuid
  updatedAt              DateTime             @updatedAt @map("updated_at")
  updatedBy              String               @map("updated_by") @db.Uuid
  deletedAt              DateTime?            @map("deleted_at")
  deletedBy              String?              @map("deleted_by") @db.Uuid
  isDeleted              Boolean              @default(false) @map("is_deleted")
  version                Int                  @default(1)

  operatingDay           CalendarOperatingDay @relation(fields: [calendarOperatingDayId], references: [id], onDelete: Restrict)

  @@index([calendarOperatingDayId, startTime, endTime, isDeleted], map: "idx_calendar_working_hours_day")
  @@index([businessCalendarId, status, isDeleted], map: "idx_calendar_working_hours_calendar")
  @@index([branchId, status, isDeleted], map: "idx_calendar_working_hours_branch")
  @@map("calendar_working_hours")
}
```

---

## 4.4 Holiday

### Purpose

`Holiday` stores date-specific scheduling restrictions for Oman public holidays, ASTI holidays, branch closures, non-training days, special event days, and emergency closures.

### Table Definition

| Field | PostgreSQL Type | Prisma Type | Nullability | Keys | Indexes / Constraints | Description |
|---|---:|---:|---:|---|---|---|
| id | uuid | String @id @default(uuid()) @db.Uuid | No | PK |  | Holiday identifier. |
| business_calendar_id | uuid | String @db.Uuid | No | FK → business_calendars.id | `idx_holidays_calendar_date` | Parent calendar. |
| branch_id | uuid | String @db.Uuid | No | FK → branches.id | `idx_holidays_branch_date_status` | Branch owning the holiday. |
| date | date | DateTime @db.Date | No |  | `idx_holidays_branch_date_status` | Holiday date in branch local calendar. |
| name | varchar(160) | String @db.VarChar(160) | No |  |  | Default name. |
| name_localized | jsonb | Json | No |  | `chk_holiday_name_localized_required` | Required English and Arabic holiday names. |
| holiday_type | holiday_type | HolidayType | No |  | `idx_holidays_type` | Holiday classification. |
| is_recurring_annual | boolean | Boolean | No |  | default false | Indicates date recurs annually. |
| blocks_scheduling | boolean | Boolean | No |  | default true | If false, informational holiday only. |
| requires_override_permission | boolean | Boolean | No |  | default true | Whether publishing on this holiday requires override. |
| status | holiday_status | HolidayStatus | No |  | `idx_holidays_branch_date_status` | Draft, Active, Inactive, Archived. |
| effective_start_date | date | DateTime @db.Date | No |  |  | Valid-from date. |
| effective_end_date | date | DateTime? @db.Date | Yes |  |  | Valid-to date. |
| notes | text | String? | Yes |  |  | Internal notes. |
| audit/base fields | see common fields | see common fields | No/Yes | FK → users.id |  | Standard audit, soft delete, version. |

### Indexes and Constraints

| Name | Type | Definition |
|---|---|---|
| `uq_holiday_calendar_date_type_active` | Partial Unique | `(business_calendar_id, date, holiday_type) WHERE is_deleted = false AND status = 'ACTIVE'` |
| `idx_holidays_calendar_date` | B-tree | `(business_calendar_id, date, is_deleted)` |
| `idx_holidays_branch_date_status` | B-tree | `(branch_id, date, status, is_deleted)` |
| `idx_holidays_type` | B-tree | `(holiday_type, status, is_deleted)` |
| `chk_holiday_effective_dates` | Check | `effective_end_date IS NULL OR effective_start_date <= effective_end_date` |
| `chk_holiday_name_localized_required` | Check | `name_localized ? 'en' AND name_localized ? 'ar'` |
| `chk_holiday_date_in_effective_range` | Check/Application | `date >= effective_start_date AND (effective_end_date IS NULL OR date <= effective_end_date)` |

### Prisma Model

```prisma
enum HolidayStatus {
  DRAFT
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum HolidayType {
  OMAN_PUBLIC_HOLIDAY
  ASTI_INSTITUTE_HOLIDAY
  BRANCH_CLOSURE
  NON_TRAINING_DAY
  SPECIAL_EVENT_DAY
  EMERGENCY_CLOSURE
}

model Holiday {
  id                         String          @id @default(uuid()) @db.Uuid
  businessCalendarId         String          @map("business_calendar_id") @db.Uuid
  branchId                   String          @map("branch_id") @db.Uuid
  date                       DateTime        @db.Date
  name                       String          @db.VarChar(160)
  nameLocalized              Json            @map("name_localized")
  holidayType                HolidayType     @map("holiday_type")
  isRecurringAnnual          Boolean         @default(false) @map("is_recurring_annual")
  blocksScheduling           Boolean         @default(true) @map("blocks_scheduling")
  requiresOverridePermission Boolean         @default(true) @map("requires_override_permission")
  status                     HolidayStatus
  effectiveStartDate         DateTime        @map("effective_start_date") @db.Date
  effectiveEndDate           DateTime?       @map("effective_end_date") @db.Date
  notes                      String?
  createdAt                  DateTime        @default(now()) @map("created_at")
  createdBy                  String          @map("created_by") @db.Uuid
  updatedAt                  DateTime        @updatedAt @map("updated_at")
  updatedBy                  String          @map("updated_by") @db.Uuid
  deletedAt                  DateTime?       @map("deleted_at")
  deletedBy                  String?         @map("deleted_by") @db.Uuid
  isDeleted                  Boolean         @default(false) @map("is_deleted")
  version                    Int             @default(1)

  businessCalendar           BusinessCalendar @relation(fields: [businessCalendarId], references: [id], onDelete: Restrict)

  @@index([businessCalendarId, date, isDeleted], map: "idx_holidays_calendar_date")
  @@index([branchId, date, status, isDeleted], map: "idx_holidays_branch_date_status")
  @@index([holidayType, status, isDeleted], map: "idx_holidays_type")
  @@map("holidays")
}
```

---

## 4.5 VenueBlock

### Purpose

`VenueBlock` prevents scheduling for a full branch or a specific classroom. It supports maintenance, exams, public events, emergency closures, classroom repairs, and management-reserved time.

### Table Definition

| Field | PostgreSQL Type | Prisma Type | Nullability | Keys | Indexes / Constraints | Description |
|---|---:|---:|---:|---|---|---|
| id | uuid | String @id @default(uuid()) @db.Uuid | No | PK |  | Venue block identifier. |
| branch_id | uuid | String @db.Uuid | No | FK → branches.id | `idx_venue_blocks_branch_date_status` | Branch affected. |
| classroom_id | uuid | String? @db.Uuid | Yes | FK → classrooms.id | `idx_venue_blocks_classroom_date_status` | Null means entire branch. |
| scope | venue_block_scope | VenueBlockScope | No |  | `chk_venue_block_scope_classroom` | Branch or classroom scope. |
| block_date | date | DateTime @db.Date | No |  | `idx_venue_blocks_branch_date_status` | Date being blocked. |
| is_full_day | boolean | Boolean | No |  | default false | True means whole branch day or classroom day. |
| start_time | time | DateTime? @db.Time(0) | Yes |  | `chk_venue_block_time_required` | Required for partial-day blocks. |
| end_time | time | DateTime? @db.Time(0) | Yes |  | `chk_venue_block_time_order` | Required for partial-day blocks. |
| reason_code | varchar(40) | String @db.VarChar(40) | No |  |  | Controlled reason code such as `MAINTENANCE`, `EXAM`, `EVENT`, `EMERGENCY`. |
| reason | varchar(500) | String @db.VarChar(500) | No |  |  | Default reason. |
| reason_localized | jsonb | Json? | Yes |  |  | Optional English/Arabic reason. |
| status | venue_block_status | VenueBlockStatus | No |  | `idx_venue_blocks_branch_date_status` | Draft, Active, Cancelled, Expired, Archived. |
| cancellation_reason | varchar(500) | String? @db.VarChar(500) | Yes |  |  | Required when status becomes Cancelled. |
| cancelled_at | timestamptz | DateTime? | Yes |  |  | Cancellation timestamp. |
| cancelled_by | uuid | String? @db.Uuid | Yes | FK → users.id |  | Cancellation actor. |
| effective_start_date | date | DateTime @db.Date | No |  |  | Usually same as block date unless longer policy introduced. |
| effective_end_date | date | DateTime? @db.Date | Yes |  |  | Usually same as block date. |
| audit/base fields | see common fields | see common fields | No/Yes | FK → users.id |  | Standard audit, soft delete, version. |

### Indexes and Constraints

| Name | Type | Definition |
|---|---|---|
| `idx_venue_blocks_branch_date_status` | B-tree | `(branch_id, block_date, status, is_deleted)` |
| `idx_venue_blocks_classroom_date_status` | B-tree | `(classroom_id, block_date, status, is_deleted)` |
| `idx_venue_blocks_scope` | B-tree | `(scope, status, is_deleted)` |
| `chk_venue_block_scope_classroom` | Check | `(scope = 'BRANCH' AND classroom_id IS NULL) OR (scope = 'CLASSROOM' AND classroom_id IS NOT NULL)` |
| `chk_venue_block_time_required` | Check | `(is_full_day = true AND start_time IS NULL AND end_time IS NULL) OR (is_full_day = false AND start_time IS NOT NULL AND end_time IS NOT NULL)` |
| `chk_venue_block_time_order` | Check | `is_full_day = true OR start_time < end_time` |
| `chk_venue_block_effective_dates` | Check | `effective_end_date IS NULL OR effective_start_date <= effective_end_date` |
| `ex_venue_blocks_no_overlap` | Exclusion/Application | Active non-deleted blocks must not overlap for same branch/scope/classroom/date unless previous block is Cancelled or Expired. |

### Prisma Model

```prisma
enum VenueBlockScope {
  BRANCH
  CLASSROOM
}

enum VenueBlockStatus {
  DRAFT
  ACTIVE
  CANCELLED
  EXPIRED
  ARCHIVED
}

model VenueBlock {
  id                 String           @id @default(uuid()) @db.Uuid
  branchId           String           @map("branch_id") @db.Uuid
  classroomId        String?          @map("classroom_id") @db.Uuid
  scope              VenueBlockScope
  blockDate          DateTime         @map("block_date") @db.Date
  isFullDay          Boolean          @default(false) @map("is_full_day")
  startTime          DateTime?        @map("start_time") @db.Time(0)
  endTime            DateTime?        @map("end_time") @db.Time(0)
  reasonCode         String           @map("reason_code") @db.VarChar(40)
  reason             String           @db.VarChar(500)
  reasonLocalized    Json?            @map("reason_localized")
  status             VenueBlockStatus
  cancellationReason String?          @map("cancellation_reason") @db.VarChar(500)
  cancelledAt        DateTime?        @map("cancelled_at")
  cancelledBy        String?          @map("cancelled_by") @db.Uuid
  effectiveStartDate DateTime         @map("effective_start_date") @db.Date
  effectiveEndDate   DateTime?        @map("effective_end_date") @db.Date
  createdAt          DateTime         @default(now()) @map("created_at")
  createdBy          String           @map("created_by") @db.Uuid
  updatedAt          DateTime         @updatedAt @map("updated_at")
  updatedBy          String           @map("updated_by") @db.Uuid
  deletedAt          DateTime?        @map("deleted_at")
  deletedBy          String?          @map("deleted_by") @db.Uuid
  isDeleted          Boolean          @default(false) @map("is_deleted")
  version            Int              @default(1)

  @@index([branchId, blockDate, status, isDeleted], map: "idx_venue_blocks_branch_date_status")
  @@index([classroomId, blockDate, status, isDeleted], map: "idx_venue_blocks_classroom_date_status")
  @@index([scope, status, isDeleted], map: "idx_venue_blocks_scope")
  @@map("venue_blocks")
}
```

---

## 4.6 ScheduleSession

### Purpose

`ScheduleSession` is the central timetable entity owned by this context. It represents a planned or official session for a batch, trainer, classroom, date, and time.

### Table Definition

| Field | PostgreSQL Type | Prisma Type | Nullability | Keys | Indexes / Constraints | Description |
|---|---:|---:|---:|---|---|---|
| id | uuid | String @id @default(uuid()) @db.Uuid | No | PK |  | Schedule session identifier. |
| branch_id | uuid | String @db.Uuid | No | FK → branches.id | `idx_schedule_sessions_branch_date_status` | Branch where session occurs. |
| course_id | uuid | String @db.Uuid | No | FK → courses.id | `idx_schedule_sessions_course` | Course from batch. |
| batch_id | uuid | String @db.Uuid | No | FK → batches.id | `idx_schedule_sessions_batch_date`, `uq_schedule_session_batch_number_active` | Batch being scheduled. |
| trainer_id | uuid | String @db.Uuid | No | FK → trainer_profiles.id | `idx_schedule_sessions_trainer_time` | Assigned trainer. |
| classroom_id | uuid | String @db.Uuid | No | FK → classrooms.id | `idx_schedule_sessions_classroom_time` | Assigned classroom. |
| business_calendar_id | uuid | String @db.Uuid | No | FK → business_calendars.id | `idx_schedule_sessions_calendar` | Calendar used for validation. |
| session_number | integer | Int | No |  | `uq_schedule_session_batch_number_active`, `chk_schedule_session_number_positive` | Positive number unique within batch among non-deleted sessions. |
| title | varchar(180) | String @db.VarChar(180) | No |  |  | Session title. |
| title_localized | jsonb | Json? | Yes |  |  | Optional English/Arabic title. |
| scheduled_date | date | DateTime @db.Date | No |  | multiple date indexes | Session date in Oman/resolved calendar. |
| start_time | time | DateTime @db.Time(0) | No |  | `chk_schedule_session_time_order` | Session start local time. |
| end_time | time | DateTime @db.Time(0) | No |  | `chk_schedule_session_time_order` | Session end local time. |
| start_at_utc | timestamptz | DateTime | No |  | `idx_schedule_sessions_trainer_time`, `idx_schedule_sessions_classroom_time` | Computed timestamp for overlap checks. |
| end_at_utc | timestamptz | DateTime | No |  | overlap indexes | Computed timestamp for overlap checks. |
| duration_minutes | integer | Int | No |  | `chk_schedule_session_duration` | Calculated as end minus start. Min 15, max 480 unless override. |
| status | schedule_session_status | ScheduleSessionStatus | No |  | `idx_schedule_sessions_branch_date_status` | Draft, Conflict, Published, Rescheduled, Cancelled, Completed. |
| conflict_status | varchar(20) | String @db.VarChar(20) | No |  | default `NOT_CHECKED` | `NOT_CHECKED`, `PASSED`, `FAILED`, `OVERRIDDEN`. |
| validation_fingerprint | varchar(128) | String? @db.VarChar(128) | Yes |  |  | Hash of input used for last conflict validation. |
| source_type | varchar(30) | String @db.VarChar(30) | No |  | default `MANUAL` | `MANUAL`, `RECURRING_GENERATION`, `RESCHEDULE_REPLACEMENT`. |
| recurrence_pattern_id | uuid | String? @db.Uuid | Yes | FK → schedule_recurrence_patterns.id | `idx_schedule_sessions_recurrence` | Parent recurring rule if generated. |
| generation_run_id | uuid | String? @db.Uuid | Yes | FK → schedule_generation_runs.id | `idx_schedule_sessions_generation_run` | Bulk generation run reference. |
| original_schedule_session_id | uuid | String? @db.Uuid | Yes | Self FK → schedule_sessions.id | `idx_schedule_sessions_original` | Original session when this session is a replacement. |
| rescheduled_to_session_id | uuid | String? @db.Uuid | Yes | Self FK → schedule_sessions.id |  | Replacement session when original is rescheduled. |
| cancellation_reason_code | varchar(40) | String? @db.VarChar(40) | Yes |  |  | Required when Cancelled. |
| cancellation_reason_notes | varchar(1000) | String? @db.VarChar(1000) | Yes |  |  | Required when Cancelled. |
| cancelled_at | timestamptz | DateTime? | Yes |  |  | Cancellation timestamp. |
| cancelled_by | uuid | String? @db.Uuid | Yes | FK → users.id |  | Cancellation actor. |
| published_at | timestamptz | DateTime? | Yes |  |  | Publish timestamp. |
| published_by | uuid | String? @db.Uuid | Yes | FK → users.id |  | Publishing actor. |
| completed_at | timestamptz | DateTime? | Yes |  |  | Set by delivery/attendance flow. |
| completed_by | uuid | String? @db.Uuid | Yes | FK → users.id |  | Completing actor/system. |
| notes | text | String? | Yes |  |  | Internal scheduling notes. |
| effective_start_date | date | DateTime @db.Date | No |  |  | Usually same as scheduled date. |
| effective_end_date | date | DateTime? @db.Date | Yes |  |  | Usually same as scheduled date. |
| audit/base fields | see common fields | see common fields | No/Yes | FK → users.id |  | Standard audit, soft delete, version. |

### Indexes and Constraints

| Name | Type | Definition |
|---|---|---|
| `uq_schedule_session_batch_number_active` | Partial Unique | `(batch_id, session_number) WHERE is_deleted = false AND status <> 'CANCELLED'` |
| `idx_schedule_sessions_branch_date_status` | B-tree | `(branch_id, scheduled_date, status, is_deleted)` |
| `idx_schedule_sessions_batch_date` | B-tree | `(batch_id, scheduled_date, start_time, is_deleted)` |
| `idx_schedule_sessions_trainer_time` | B-tree/GiST support | `(trainer_id, start_at_utc, end_at_utc, status, is_deleted)` |
| `idx_schedule_sessions_classroom_time` | B-tree/GiST support | `(classroom_id, start_at_utc, end_at_utc, status, is_deleted)` |
| `idx_schedule_sessions_course` | B-tree | `(course_id, scheduled_date, status, is_deleted)` |
| `idx_schedule_sessions_calendar` | B-tree | `(business_calendar_id, scheduled_date, status, is_deleted)` |
| `idx_schedule_sessions_recurrence` | B-tree | `(recurrence_pattern_id, is_deleted)` |
| `idx_schedule_sessions_generation_run` | B-tree | `(generation_run_id, is_deleted)` |
| `idx_schedule_sessions_original` | B-tree | `(original_schedule_session_id, is_deleted)` |
| `chk_schedule_session_time_order` | Check | `start_time < end_time AND start_at_utc < end_at_utc` |
| `chk_schedule_session_duration` | Check/Application | `duration_minutes BETWEEN 15 AND 480`, override path can allow exceptions through application with audit. |
| `chk_schedule_session_number_positive` | Check | `session_number > 0` |
| `chk_schedule_session_effective_dates` | Check | `effective_end_date IS NULL OR effective_start_date <= effective_end_date` |
| `ex_schedule_trainer_no_overlap` | Exclusion/Application | Published and Rescheduled non-deleted sessions for the same trainer must not overlap unless override is explicitly approved. |
| `ex_schedule_classroom_no_overlap` | Exclusion/Application | Published and Rescheduled non-deleted sessions for the same classroom must not overlap unless override is explicitly approved. |
| `ex_schedule_batch_no_overlap` | Exclusion/Application | Published and Rescheduled non-deleted sessions for the same batch must not overlap unless override is explicitly approved. |

### Prisma Model

```prisma
enum ScheduleSessionStatus {
  DRAFT
  CONFLICT
  PUBLISHED
  RESCHEDULED
  CANCELLED
  COMPLETED
}

model ScheduleSession {
  id                         String                 @id @default(uuid()) @db.Uuid
  branchId                   String                 @map("branch_id") @db.Uuid
  courseId                   String                 @map("course_id") @db.Uuid
  batchId                    String                 @map("batch_id") @db.Uuid
  trainerId                  String                 @map("trainer_id") @db.Uuid
  classroomId                String                 @map("classroom_id") @db.Uuid
  businessCalendarId         String                 @map("business_calendar_id") @db.Uuid
  sessionNumber              Int                    @map("session_number")
  title                      String                 @db.VarChar(180)
  titleLocalized             Json?                  @map("title_localized")
  scheduledDate              DateTime               @map("scheduled_date") @db.Date
  startTime                  DateTime               @map("start_time") @db.Time(0)
  endTime                    DateTime               @map("end_time") @db.Time(0)
  startAtUtc                 DateTime               @map("start_at_utc")
  endAtUtc                   DateTime               @map("end_at_utc")
  durationMinutes            Int                    @map("duration_minutes")
  status                     ScheduleSessionStatus
  conflictStatus             String                 @default("NOT_CHECKED") @map("conflict_status") @db.VarChar(20)
  validationFingerprint      String?                @map("validation_fingerprint") @db.VarChar(128)
  sourceType                 String                 @default("MANUAL") @map("source_type") @db.VarChar(30)
  recurrencePatternId        String?                @map("recurrence_pattern_id") @db.Uuid
  generationRunId            String?                @map("generation_run_id") @db.Uuid
  originalScheduleSessionId  String?                @map("original_schedule_session_id") @db.Uuid
  rescheduledToSessionId     String?                @map("rescheduled_to_session_id") @db.Uuid
  cancellationReasonCode     String?                @map("cancellation_reason_code") @db.VarChar(40)
  cancellationReasonNotes    String?                @map("cancellation_reason_notes") @db.VarChar(1000)
  cancelledAt                DateTime?              @map("cancelled_at")
  cancelledBy                String?                @map("cancelled_by") @db.Uuid
  publishedAt                DateTime?              @map("published_at")
  publishedBy                String?                @map("published_by") @db.Uuid
  completedAt                DateTime?              @map("completed_at")
  completedBy                String?                @map("completed_by") @db.Uuid
  notes                      String?
  effectiveStartDate         DateTime               @map("effective_start_date") @db.Date
  effectiveEndDate           DateTime?              @map("effective_end_date") @db.Date
  createdAt                  DateTime               @default(now()) @map("created_at")
  createdBy                  String                 @map("created_by") @db.Uuid
  updatedAt                  DateTime               @updatedAt @map("updated_at")
  updatedBy                  String                 @map("updated_by") @db.Uuid
  deletedAt                  DateTime?              @map("deleted_at")
  deletedBy                  String?                @map("deleted_by") @db.Uuid
  isDeleted                  Boolean                @default(false) @map("is_deleted")
  version                    Int                    @default(1)

  businessCalendar           BusinessCalendar       @relation(fields: [businessCalendarId], references: [id], onDelete: Restrict)
  recurrencePattern          ScheduleRecurrencePattern? @relation(fields: [recurrencePatternId], references: [id], onDelete: SetNull)
  generationRun              ScheduleGenerationRun? @relation(fields: [generationRunId], references: [id], onDelete: SetNull)
  conflictLogs               ScheduleConflictLog[]
  overrides                  ScheduleOverride[]
  changeHistory              ScheduleChangeHistory[]

  @@index([branchId, scheduledDate, status, isDeleted], map: "idx_schedule_sessions_branch_date_status")
  @@index([batchId, scheduledDate, startTime, isDeleted], map: "idx_schedule_sessions_batch_date")
  @@index([trainerId, startAtUtc, endAtUtc, status, isDeleted], map: "idx_schedule_sessions_trainer_time")
  @@index([classroomId, startAtUtc, endAtUtc, status, isDeleted], map: "idx_schedule_sessions_classroom_time")
  @@index([courseId, scheduledDate, status, isDeleted], map: "idx_schedule_sessions_course")
  @@index([businessCalendarId, scheduledDate, status, isDeleted], map: "idx_schedule_sessions_calendar")
  @@index([recurrencePatternId, isDeleted], map: "idx_schedule_sessions_recurrence")
  @@index([generationRunId, isDeleted], map: "idx_schedule_sessions_generation_run")
  @@index([originalScheduleSessionId, isDeleted], map: "idx_schedule_sessions_original")
  @@map("schedule_sessions")
}
```

---

## 4.7 ScheduleRecurrencePattern

### Purpose

`ScheduleRecurrencePattern` stores a controlled recurring schedule request for a batch. It supports review, regeneration analysis, and auditability for bulk schedule creation.

### Table Definition

| Field | PostgreSQL Type | Prisma Type | Nullability | Keys | Indexes / Constraints | Description |
|---|---:|---:|---:|---|---|---|
| id | uuid | String @id @default(uuid()) @db.Uuid | No | PK |  | Recurrence pattern identifier. |
| branch_id | uuid | String @db.Uuid | No | FK → branches.id | `idx_schedule_recurrence_branch_status` | Branch scope. |
| course_id | uuid | String @db.Uuid | No | FK → courses.id |  | Course inherited from batch. |
| batch_id | uuid | String @db.Uuid | No | FK → batches.id | `idx_schedule_recurrence_batch_status` | Batch for recurrence. |
| trainer_id | uuid | String @db.Uuid | No | FK → trainer_profiles.id |  | Default trainer. |
| classroom_id | uuid | String @db.Uuid | No | FK → classrooms.id |  | Default classroom. |
| pattern_name | varchar(160) | String @db.VarChar(160) | No |  |  | Name shown in UI. |
| recurrence_type | varchar(20) | String @db.VarChar(20) | No |  | allowed `DAILY`, `WEEKLY`, `CUSTOM_WEEKDAYS` | Pattern type. |
| weekdays | jsonb | Json | No |  | `chk_recurrence_weekdays_json` | Array of weekday codes for weekly/custom patterns. |
| start_date | date | DateTime @db.Date | No |  |  | First generated date. |
| end_date | date | DateTime @db.Date | No |  | `chk_recurrence_date_order` | Last generated date. |
| start_time | time | DateTime @db.Time(0) | No |  | `chk_recurrence_time_order` | Default session start. |
| end_time | time | DateTime @db.Time(0) | No |  | `chk_recurrence_time_order` | Default session end. |
| max_sessions | integer | Int | No |  | `chk_recurrence_max_sessions` | Safety cap, maximum 200 sessions per generation request. |
| skip_holidays | boolean | Boolean | No |  | default true | Whether to skip active holidays automatically. |
| skip_venue_blocks | boolean | Boolean | No |  | default true | Whether to skip blocked dates/times automatically. |
| auto_publish | boolean | Boolean | No |  | default false | Publish generated sessions only when all validations pass and user has publish permission. |
| status | varchar(20) | String @db.VarChar(20) | No |  | allowed `DRAFT`, `ACTIVE`, `INACTIVE`, `ARCHIVED` | Pattern lifecycle. |
| effective_start_date | date | DateTime @db.Date | No |  |  | Pattern valid-from date. |
| effective_end_date | date | DateTime? @db.Date | Yes |  |  | Pattern valid-to date. |
| audit/base fields | see common fields | see common fields | No/Yes | FK → users.id |  | Standard audit, soft delete, version. |

### Indexes and Constraints

| Name | Type | Definition |
|---|---|---|
| `idx_schedule_recurrence_branch_status` | B-tree | `(branch_id, status, is_deleted)` |
| `idx_schedule_recurrence_batch_status` | B-tree | `(batch_id, status, is_deleted)` |
| `chk_recurrence_date_order` | Check | `start_date <= end_date` |
| `chk_recurrence_time_order` | Check | `start_time < end_time` |
| `chk_recurrence_max_sessions` | Check | `max_sessions BETWEEN 1 AND 200` |
| `chk_recurrence_effective_dates` | Check | `effective_end_date IS NULL OR effective_start_date <= effective_end_date` |

### Prisma Model

```prisma
model ScheduleRecurrencePattern {
  id                 String              @id @default(uuid()) @db.Uuid
  branchId           String              @map("branch_id") @db.Uuid
  courseId           String              @map("course_id") @db.Uuid
  batchId            String              @map("batch_id") @db.Uuid
  trainerId          String              @map("trainer_id") @db.Uuid
  classroomId        String              @map("classroom_id") @db.Uuid
  patternName        String              @map("pattern_name") @db.VarChar(160)
  recurrenceType     String              @map("recurrence_type") @db.VarChar(20)
  weekdays           Json
  startDate          DateTime            @map("start_date") @db.Date
  endDate            DateTime            @map("end_date") @db.Date
  startTime          DateTime            @map("start_time") @db.Time(0)
  endTime            DateTime            @map("end_time") @db.Time(0)
  maxSessions        Int                 @map("max_sessions")
  skipHolidays       Boolean             @default(true) @map("skip_holidays")
  skipVenueBlocks    Boolean             @default(true) @map("skip_venue_blocks")
  autoPublish        Boolean             @default(false) @map("auto_publish")
  status             String              @default("DRAFT") @db.VarChar(20)
  effectiveStartDate DateTime            @map("effective_start_date") @db.Date
  effectiveEndDate   DateTime?           @map("effective_end_date") @db.Date
  createdAt          DateTime            @default(now()) @map("created_at")
  createdBy          String              @map("created_by") @db.Uuid
  updatedAt          DateTime            @updatedAt @map("updated_at")
  updatedBy          String              @map("updated_by") @db.Uuid
  deletedAt          DateTime?           @map("deleted_at")
  deletedBy          String?             @map("deleted_by") @db.Uuid
  isDeleted          Boolean             @default(false) @map("is_deleted")
  version            Int                 @default(1)

  sessions           ScheduleSession[]
  generationRuns     ScheduleGenerationRun[]

  @@index([branchId, status, isDeleted], map: "idx_schedule_recurrence_branch_status")
  @@index([batchId, status, isDeleted], map: "idx_schedule_recurrence_batch_status")
  @@map("schedule_recurrence_patterns")
}
```

---

## 4.8 ScheduleGenerationRun

### Purpose

`ScheduleGenerationRun` records each bulk schedule generation attempt, including requested count, created count, rejected count, validation summary, and actor. This supports auditability without introducing external jobs or brokers.

### Table Definition

| Field | PostgreSQL Type | Prisma Type | Nullability | Keys | Indexes / Constraints | Description |
|---|---:|---:|---:|---|---|---|
| id | uuid | String @id @default(uuid()) @db.Uuid | No | PK |  | Generation run identifier. |
| branch_id | uuid | String @db.Uuid | No | FK → branches.id | `idx_schedule_generation_branch_status` | Branch scope. |
| recurrence_pattern_id | uuid | String? @db.Uuid | Yes | FK → schedule_recurrence_patterns.id | `idx_schedule_generation_pattern` | Optional recurrence pattern reference. |
| batch_id | uuid | String @db.Uuid | No | FK → batches.id | `idx_schedule_generation_batch` | Batch generated for. |
| requested_session_count | integer | Int | No |  | `chk_generation_requested_count` | Number of candidate sessions requested. |
| created_session_count | integer | Int | No |  | default 0 | Number inserted. |
| rejected_session_count | integer | Int | No |  | default 0 | Number rejected. |
| conflict_count | integer | Int | No |  | default 0 | Number with conflict. |
| request_payload | jsonb | Json | No |  |  | Exact validated generation request. |
| result_summary | jsonb | Json | No |  |  | Result rows with date, status, reason, created session ID when applicable. |
| status | generation_run_status | GenerationRunStatus | No |  | `idx_schedule_generation_branch_status` | Run state. |
| started_at | timestamptz | DateTime | No |  | default now() | Start timestamp. |
| completed_at | timestamptz | DateTime? | Yes |  |  | Completion timestamp. |
| error_code | varchar(80) | String? @db.VarChar(80) | Yes |  |  | Failure code. |
| error_message | varchar(1000) | String? @db.VarChar(1000) | Yes |  |  | Failure message safe for admins. |
| audit/base fields | see common fields | see common fields | No/Yes | FK → users.id |  | Standard audit, soft delete, version. |

### Indexes and Constraints

| Name | Type | Definition |
|---|---|---|
| `idx_schedule_generation_branch_status` | B-tree | `(branch_id, status, started_at DESC, is_deleted)` |
| `idx_schedule_generation_pattern` | B-tree | `(recurrence_pattern_id, started_at DESC, is_deleted)` |
| `idx_schedule_generation_batch` | B-tree | `(batch_id, started_at DESC, is_deleted)` |
| `chk_generation_requested_count` | Check | `requested_session_count BETWEEN 1 AND 200` |
| `chk_generation_counts_non_negative` | Check | `created_session_count >= 0 AND rejected_session_count >= 0 AND conflict_count >= 0` |

### Prisma Model

```prisma
enum GenerationRunStatus {
  REQUESTED
  VALIDATING
  PARTIALLY_CREATED
  CREATED
  FAILED
  CANCELLED
}

model ScheduleGenerationRun {
  id                    String                  @id @default(uuid()) @db.Uuid
  branchId              String                  @map("branch_id") @db.Uuid
  recurrencePatternId   String?                 @map("recurrence_pattern_id") @db.Uuid
  batchId               String                  @map("batch_id") @db.Uuid
  requestedSessionCount Int                     @map("requested_session_count")
  createdSessionCount   Int                     @default(0) @map("created_session_count")
  rejectedSessionCount  Int                     @default(0) @map("rejected_session_count")
  conflictCount         Int                     @default(0) @map("conflict_count")
  requestPayload        Json                    @map("request_payload")
  resultSummary         Json                    @map("result_summary")
  status                GenerationRunStatus
  startedAt             DateTime                @default(now()) @map("started_at")
  completedAt           DateTime?               @map("completed_at")
  errorCode             String?                 @map("error_code") @db.VarChar(80)
  errorMessage          String?                 @map("error_message") @db.VarChar(1000)
  createdAt             DateTime                @default(now()) @map("created_at")
  createdBy             String                  @map("created_by") @db.Uuid
  updatedAt             DateTime                @updatedAt @map("updated_at")
  updatedBy             String                  @map("updated_by") @db.Uuid
  deletedAt             DateTime?               @map("deleted_at")
  deletedBy             String?                 @map("deleted_by") @db.Uuid
  isDeleted             Boolean                 @default(false) @map("is_deleted")
  version               Int                     @default(1)

  recurrencePattern     ScheduleRecurrencePattern? @relation(fields: [recurrencePatternId], references: [id], onDelete: SetNull)
  sessions              ScheduleSession[]

  @@index([branchId, status, startedAt, isDeleted], map: "idx_schedule_generation_branch_status")
  @@index([recurrencePatternId, startedAt, isDeleted], map: "idx_schedule_generation_pattern")
  @@index([batchId, startedAt, isDeleted], map: "idx_schedule_generation_batch")
  @@map("schedule_generation_runs")
}
```

---

## 4.9 ScheduleConflictLog

### Purpose

`ScheduleConflictLog` records each conflict validation result. It is intentionally append-oriented so coordinators and auditors can see why a session was rejected, saved as conflict, or published after override.

### Table Definition

| Field | PostgreSQL Type | Prisma Type | Nullability | Keys | Indexes / Constraints | Description |
|---|---:|---:|---:|---|---|---|
| id | uuid | String @id @default(uuid()) @db.Uuid | No | PK |  | Conflict log identifier. |
| branch_id | uuid | String @db.Uuid | No | FK → branches.id | `idx_schedule_conflicts_branch_created` | Branch scope. |
| schedule_session_id | uuid | String? @db.Uuid | Yes | FK → schedule_sessions.id | `idx_schedule_conflicts_session` | Session if saved. Null for pre-save validation. |
| generation_run_id | uuid | String? @db.Uuid | Yes | FK → schedule_generation_runs.id | `idx_schedule_conflicts_generation` | Bulk generation reference. |
| conflict_type | schedule_conflict_type | ScheduleConflictType | No |  | `idx_schedule_conflicts_type` | Conflict category. |
| severity | schedule_conflict_severity | ScheduleConflictSeverity | No |  |  | Error, warning, info. |
| detected_for_date | date | DateTime @db.Date | No |  | `idx_schedule_conflicts_branch_date` | Date being validated. |
| detected_start_time | time | DateTime @db.Time(0) | No |  |  | Requested start time. |
| detected_end_time | time | DateTime @db.Time(0) | No |  |  | Requested end time. |
| conflicting_entity_type | varchar(80) | String? @db.VarChar(80) | Yes |  |  | Example: `ScheduleSession`, `Holiday`, `VenueBlock`. |
| conflicting_entity_id | uuid | String? @db.Uuid | Yes |  |  | Conflicting row ID when available. |
| message_code | varchar(120) | String @db.VarChar(120) | No |  |  | Localizable message key. |
| message_params | jsonb | Json | No |  | default `{}` | Parameters for localized UI messages. |
| validation_input | jsonb | Json | No |  |  | Request details used for validation. |
| is_blocking | boolean | Boolean | No |  | default true | True means publish must stop unless override exists. |
| resolved_by_override_id | uuid | String? @db.Uuid | Yes | FK → schedule_overrides.id |  | Override that resolved this conflict. |
| resolved_at | timestamptz | DateTime? | Yes |  |  | Resolution timestamp. |
| resolved_by | uuid | String? @db.Uuid | Yes | FK → users.id |  | Resolution actor. |
| created_at | timestamptz | DateTime | No |  | default now() | Created timestamp. |
| created_by | uuid | String @db.Uuid | No | FK → users.id |  | Validator actor/system. |
| is_deleted | boolean | Boolean | No |  | default false | Conflict logs are not normally deleted. |

### Indexes and Constraints

| Name | Type | Definition |
|---|---|---|
| `idx_schedule_conflicts_session` | B-tree | `(schedule_session_id, created_at DESC, is_deleted)` |
| `idx_schedule_conflicts_generation` | B-tree | `(generation_run_id, created_at DESC, is_deleted)` |
| `idx_schedule_conflicts_branch_created` | B-tree | `(branch_id, created_at DESC, is_deleted)` |
| `idx_schedule_conflicts_branch_date` | B-tree | `(branch_id, detected_for_date, severity, is_deleted)` |
| `idx_schedule_conflicts_type` | B-tree | `(conflict_type, severity, is_deleted)` |
| `chk_conflict_time_order` | Check | `detected_start_time < detected_end_time` |

### Prisma Model

```prisma
enum ScheduleConflictType {
  TRAINER_OVERLAP
  CLASSROOM_OVERLAP
  BATCH_OVERLAP
  HOLIDAY_CONFLICT
  VENUE_BLOCK_CONFLICT
  TRAINER_UNAVAILABLE
  OUTSIDE_WORKING_DAY
  OUTSIDE_WORKING_HOURS
  BATCH_DATE_RANGE_VIOLATION
  BRANCH_MISMATCH
  COURSE_AUTHORIZATION_MISSING
}

enum ScheduleConflictSeverity {
  ERROR
  WARNING
  INFO
}

model ScheduleConflictLog {
  id                      String                   @id @default(uuid()) @db.Uuid
  branchId                String                   @map("branch_id") @db.Uuid
  scheduleSessionId       String?                  @map("schedule_session_id") @db.Uuid
  generationRunId         String?                  @map("generation_run_id") @db.Uuid
  conflictType            ScheduleConflictType     @map("conflict_type")
  severity                ScheduleConflictSeverity
  detectedForDate         DateTime                 @map("detected_for_date") @db.Date
  detectedStartTime       DateTime                 @map("detected_start_time") @db.Time(0)
  detectedEndTime         DateTime                 @map("detected_end_time") @db.Time(0)
  conflictingEntityType   String?                  @map("conflicting_entity_type") @db.VarChar(80)
  conflictingEntityId     String?                  @map("conflicting_entity_id") @db.Uuid
  messageCode             String                   @map("message_code") @db.VarChar(120)
  messageParams           Json                     @default("{}") @map("message_params")
  validationInput         Json                     @map("validation_input")
  isBlocking              Boolean                  @default(true) @map("is_blocking")
  resolvedByOverrideId    String?                  @map("resolved_by_override_id") @db.Uuid
  resolvedAt              DateTime?                @map("resolved_at")
  resolvedBy              String?                  @map("resolved_by") @db.Uuid
  createdAt               DateTime                 @default(now()) @map("created_at")
  createdBy               String                   @map("created_by") @db.Uuid
  isDeleted               Boolean                  @default(false) @map("is_deleted")

  scheduleSession         ScheduleSession?         @relation(fields: [scheduleSessionId], references: [id], onDelete: SetNull)

  @@index([scheduleSessionId, createdAt, isDeleted], map: "idx_schedule_conflicts_session")
  @@index([generationRunId, createdAt, isDeleted], map: "idx_schedule_conflicts_generation")
  @@index([branchId, createdAt, isDeleted], map: "idx_schedule_conflicts_branch_created")
  @@index([branchId, detectedForDate, severity, isDeleted], map: "idx_schedule_conflicts_branch_date")
  @@index([conflictType, severity, isDeleted], map: "idx_schedule_conflicts_type")
  @@map("schedule_conflict_logs")
}
```

---

## 4.10 ScheduleOverride

### Purpose

`ScheduleOverride` stores explicit approvals that allow exceptional scheduling. Overrides are sensitive and must always include actor, permission, reason, and affected conflict details.

### Table Definition

| Field | PostgreSQL Type | Prisma Type | Nullability | Keys | Indexes / Constraints | Description |
|---|---:|---:|---:|---|---|---|
| id | uuid | String @id @default(uuid()) @db.Uuid | No | PK |  | Override identifier. |
| branch_id | uuid | String @db.Uuid | No | FK → branches.id | `idx_schedule_overrides_branch_created` | Branch scope. |
| schedule_session_id | uuid | String @db.Uuid | No | FK → schedule_sessions.id | `idx_schedule_overrides_session` | Session affected. |
| override_type | override_type | OverrideType | No |  | `idx_schedule_overrides_type` | Override category. |
| permission_code_used | varchar(120) | String @db.VarChar(120) | No |  |  | Permission that allowed override, such as `scheduling.override.holiday`. |
| reason_code | varchar(40) | String @db.VarChar(40) | No |  |  | Controlled reason code. |
| reason_notes | varchar(1000) | String @db.VarChar(1000) | No |  | `chk_override_reason_length` | Human explanation, 10–1000 characters. |
| approved_by | uuid | String @db.Uuid | No | FK → users.id | `idx_schedule_overrides_approved_by` | Approver. |
| approved_at | timestamptz | DateTime | No |  | default now() | Approval timestamp. |
| approval_reference_type | varchar(80) | String? @db.VarChar(80) | Yes |  |  | Optional reference to ApprovalRequest if workflow is introduced. |
| approval_reference_id | uuid | String? @db.Uuid | Yes |  |  | Optional external approval row. |
| expires_at | timestamptz | DateTime? | Yes |  |  | Optional expiry for temporary override. |
| conflict_snapshot | jsonb | Json | No |  |  | Conflicts that were overridden. |
| status | varchar(20) | String @db.VarChar(20) | No |  | allowed `ACTIVE`, `REVOKED`, `EXPIRED` | Override lifecycle. |
| revoked_at | timestamptz | DateTime? | Yes |  |  | Revocation timestamp. |
| revoked_by | uuid | String? @db.Uuid | Yes | FK → users.id |  | Revoking actor. |
| revoke_reason | varchar(500) | String? @db.VarChar(500) | Yes |  |  | Required when status becomes Revoked. |
| audit/base fields | see common fields | see common fields | No/Yes | FK → users.id |  | Standard audit, soft delete, version. |

### Indexes and Constraints

| Name | Type | Definition |
|---|---|---|
| `idx_schedule_overrides_session` | B-tree | `(schedule_session_id, status, is_deleted)` |
| `idx_schedule_overrides_branch_created` | B-tree | `(branch_id, created_at DESC, is_deleted)` |
| `idx_schedule_overrides_type` | B-tree | `(override_type, status, is_deleted)` |
| `idx_schedule_overrides_approved_by` | B-tree | `(approved_by, approved_at DESC)` |
| `chk_override_reason_length` | Check | `char_length(reason_notes) BETWEEN 10 AND 1000` |
| `chk_override_expiry` | Check | `expires_at IS NULL OR expires_at > approved_at` |
| `chk_override_revoke_reason` | Check/Application | If `status = 'REVOKED'`, `revoked_at`, `revoked_by`, and `revoke_reason` are required. |

### Prisma Model

```prisma
enum OverrideType {
  HOLIDAY_OVERRIDE
  VENUE_BLOCK_OVERRIDE
  WORKING_HOURS_OVERRIDE
  BATCH_DATE_OVERRIDE
  TRAINER_AVAILABILITY_OVERRIDE
  CLASSROOM_CAPACITY_OVERRIDE
  CONFLICT_DRAFT_ACCEPTANCE
}

model ScheduleOverride {
  id                    String          @id @default(uuid()) @db.Uuid
  branchId              String          @map("branch_id") @db.Uuid
  scheduleSessionId     String          @map("schedule_session_id") @db.Uuid
  overrideType          OverrideType    @map("override_type")
  permissionCodeUsed    String          @map("permission_code_used") @db.VarChar(120)
  reasonCode            String          @map("reason_code") @db.VarChar(40)
  reasonNotes           String          @map("reason_notes") @db.VarChar(1000)
  approvedBy            String          @map("approved_by") @db.Uuid
  approvedAt            DateTime        @default(now()) @map("approved_at")
  approvalReferenceType String?         @map("approval_reference_type") @db.VarChar(80)
  approvalReferenceId   String?         @map("approval_reference_id") @db.Uuid
  expiresAt             DateTime?       @map("expires_at")
  conflictSnapshot      Json            @map("conflict_snapshot")
  status                String          @default("ACTIVE") @db.VarChar(20)
  revokedAt             DateTime?       @map("revoked_at")
  revokedBy             String?         @map("revoked_by") @db.Uuid
  revokeReason          String?         @map("revoke_reason") @db.VarChar(500)
  createdAt             DateTime        @default(now()) @map("created_at")
  createdBy             String          @map("created_by") @db.Uuid
  updatedAt             DateTime        @updatedAt @map("updated_at")
  updatedBy             String          @map("updated_by") @db.Uuid
  deletedAt             DateTime?       @map("deleted_at")
  deletedBy             String?         @map("deleted_by") @db.Uuid
  isDeleted             Boolean         @default(false) @map("is_deleted")
  version               Int             @default(1)

  scheduleSession       ScheduleSession @relation(fields: [scheduleSessionId], references: [id], onDelete: Restrict)

  @@index([scheduleSessionId, status, isDeleted], map: "idx_schedule_overrides_session")
  @@index([branchId, createdAt, isDeleted], map: "idx_schedule_overrides_branch_created")
  @@index([overrideType, status, isDeleted], map: "idx_schedule_overrides_type")
  @@index([approvedBy, approvedAt], map: "idx_schedule_overrides_approved_by")
  @@map("schedule_overrides")
}
```

---

## 4.11 ScheduleChangeHistory

### Purpose

`ScheduleChangeHistory` stores domain-readable schedule lifecycle history. It complements generic `AuditLog` by making schedule timelines fast to query and easy to display on the schedule detail screen.

### Table Definition

| Field | PostgreSQL Type | Prisma Type | Nullability | Keys | Indexes / Constraints | Description |
|---|---:|---:|---:|---|---|---|
| id | uuid | String @id @default(uuid()) @db.Uuid | No | PK |  | Change history identifier. |
| branch_id | uuid | String @db.Uuid | No | FK → branches.id | `idx_schedule_change_history_branch_created` | Branch scope. |
| schedule_session_id | uuid | String @db.Uuid | No | FK → schedule_sessions.id | `idx_schedule_change_history_session` | Session affected. |
| action | varchar(40) | String @db.VarChar(40) | No |  | `idx_schedule_change_history_action` | `CREATED`, `VALIDATED`, `PUBLISHED`, `RESCHEDULED`, `CANCELLED`, `COMPLETED`, `SOFT_DELETED`, `OVERRIDDEN`. |
| old_status | schedule_session_status | ScheduleSessionStatus? | Yes |  |  | Status before action. |
| new_status | schedule_session_status | ScheduleSessionStatus? | Yes |  |  | Status after action. |
| old_value | jsonb | Json? | Yes |  |  | Previous relevant values. |
| new_value | jsonb | Json? | Yes |  |  | New relevant values. |
| reason_code | varchar(40) | String? @db.VarChar(40) | Yes |  |  | Controlled reason code. |
| reason_notes | varchar(1000) | String? @db.VarChar(1000) | Yes |  |  | Human reason. |
| performed_by | uuid | String @db.Uuid | No | FK → users.id | `idx_schedule_change_history_performer` | Actor or system user. |
| performed_at | timestamptz | DateTime | No |  | default now() | Action timestamp. |
| ip_address | inet | String? | Yes |  |  | Captured for user actions where available. |
| user_agent | varchar(500) | String? @db.VarChar(500) | Yes |  |  | Captured for user actions. |
| audit_log_id | uuid | String? @db.Uuid | Yes | FK → audit_logs.id |  | Generic audit row reference. |
| is_deleted | boolean | Boolean | No |  | default false | History rows are not normally deleted. |

### Indexes and Constraints

| Name | Type | Definition |
|---|---|---|
| `idx_schedule_change_history_session` | B-tree | `(schedule_session_id, performed_at DESC, is_deleted)` |
| `idx_schedule_change_history_branch_created` | B-tree | `(branch_id, performed_at DESC, is_deleted)` |
| `idx_schedule_change_history_action` | B-tree | `(action, performed_at DESC, is_deleted)` |
| `idx_schedule_change_history_performer` | B-tree | `(performed_by, performed_at DESC)` |
| `chk_schedule_history_action` | Check | Action must be one of the controlled values listed above. |

### Prisma Model

```prisma
model ScheduleChangeHistory {
  id                String                 @id @default(uuid()) @db.Uuid
  branchId          String                 @map("branch_id") @db.Uuid
  scheduleSessionId String                 @map("schedule_session_id") @db.Uuid
  action            String                 @db.VarChar(40)
  oldStatus         ScheduleSessionStatus? @map("old_status")
  newStatus         ScheduleSessionStatus? @map("new_status")
  oldValue          Json?                  @map("old_value")
  newValue          Json?                  @map("new_value")
  reasonCode        String?                @map("reason_code") @db.VarChar(40)
  reasonNotes       String?                @map("reason_notes") @db.VarChar(1000)
  performedBy       String                 @map("performed_by") @db.Uuid
  performedAt       DateTime               @default(now()) @map("performed_at")
  ipAddress         String?                @map("ip_address")
  userAgent         String?                @map("user_agent") @db.VarChar(500)
  auditLogId        String?                @map("audit_log_id") @db.Uuid
  isDeleted         Boolean                @default(false) @map("is_deleted")

  scheduleSession   ScheduleSession        @relation(fields: [scheduleSessionId], references: [id], onDelete: Restrict)

  @@index([scheduleSessionId, performedAt, isDeleted], map: "idx_schedule_change_history_session")
  @@index([branchId, performedAt, isDeleted], map: "idx_schedule_change_history_branch_created")
  @@index([action, performedAt, isDeleted], map: "idx_schedule_change_history_action")
  @@index([performedBy, performedAt], map: "idx_schedule_change_history_performer")
  @@map("schedule_change_history")
}
```

---

## 4.12 ScheduleExportLog

### Purpose

`ScheduleExportLog` records schedule exports because timetable data can expose trainer allocation, learner delivery timing, and branch operations. Export logging supports compliance review and suspicious access analysis.

### Table Definition

| Field | PostgreSQL Type | Prisma Type | Nullability | Keys | Indexes / Constraints | Description |
|---|---:|---:|---:|---|---|---|
| id | uuid | String @id @default(uuid()) @db.Uuid | No | PK |  | Export log identifier. |
| branch_id | uuid | String? @db.Uuid | Yes | FK → branches.id | `idx_schedule_export_branch_created` | Null only when consolidated export across allowed branches. |
| exported_by | uuid | String @db.Uuid | No | FK → users.id | `idx_schedule_export_user_created` | User who exported. |
| exported_at | timestamptz | DateTime | No |  | default now() | Export timestamp. |
| export_type | varchar(40) | String @db.VarChar(40) | No |  |  | `DAILY`, `WEEKLY`, `MONTHLY`, `TRAINER`, `CLASSROOM`, `BATCH`, `CONFLICT`, `UTILIZATION`. |
| file_format | varchar(20) | String @db.VarChar(20) | No |  | allowed `CSV`, `XLSX`, `PDF` | Export format. |
| filter_snapshot | jsonb | Json | No |  |  | Exact filters used. |
| row_count | integer | Int | No |  | `chk_export_row_count` | Number of rows exported. |
| consolidated_export | boolean | Boolean | No |  | default false | True when multiple branches included. |
| permission_code_used | varchar(120) | String @db.VarChar(120) | No |  |  | Permission that allowed export. |
| file_name | varchar(240) | String @db.VarChar(240) | No |  |  | Generated file name. |
| storage_key | varchar(500) | String? @db.VarChar(500) | Yes |  |  | Optional temporary storage key. |
| expires_at | timestamptz | DateTime? | Yes |  |  | Optional file expiry. |
| ip_address | inet | String? | Yes |  |  | IP address for compliance. |
| user_agent | varchar(500) | String? @db.VarChar(500) | Yes |  |  | Browser user agent. |
| is_deleted | boolean | Boolean | No |  | default false | Retained unless compliance cleanup soft deletes. |

### Indexes and Constraints

| Name | Type | Definition |
|---|---|---|
| `idx_schedule_export_branch_created` | B-tree | `(branch_id, exported_at DESC, is_deleted)` |
| `idx_schedule_export_user_created` | B-tree | `(exported_by, exported_at DESC, is_deleted)` |
| `idx_schedule_export_type_created` | B-tree | `(export_type, exported_at DESC, is_deleted)` |
| `chk_export_row_count` | Check | `row_count >= 0` |
| `chk_export_branch_scope` | Check/Application | `branch_id IS NOT NULL OR consolidated_export = true` |

### Prisma Model

```prisma
model ScheduleExportLog {
  id                 String   @id @default(uuid()) @db.Uuid
  branchId           String?  @map("branch_id") @db.Uuid
  exportedBy         String   @map("exported_by") @db.Uuid
  exportedAt         DateTime @default(now()) @map("exported_at")
  exportType         String   @map("export_type") @db.VarChar(40)
  fileFormat         String   @map("file_format") @db.VarChar(20)
  filterSnapshot     Json     @map("filter_snapshot")
  rowCount           Int      @map("row_count")
  consolidatedExport Boolean  @default(false) @map("consolidated_export")
  permissionCodeUsed String   @map("permission_code_used") @db.VarChar(120)
  fileName           String   @map("file_name") @db.VarChar(240)
  storageKey         String?  @map("storage_key") @db.VarChar(500)
  expiresAt          DateTime? @map("expires_at")
  ipAddress          String?  @map("ip_address")
  userAgent          String?  @map("user_agent") @db.VarChar(500)
  isDeleted          Boolean  @default(false) @map("is_deleted")

  @@index([branchId, exportedAt, isDeleted], map: "idx_schedule_export_branch_created")
  @@index([exportedBy, exportedAt, isDeleted], map: "idx_schedule_export_user_created")
  @@index([exportType, exportedAt, isDeleted], map: "idx_schedule_export_type_created")
  @@map("schedule_export_logs")
}
```

---

## 5. Relationship Model

### 5.1 Owned Entity Relationships

| Relationship | Cardinality | Required? | Delete / Cascade Rule | Business Rule |
|---|---:|---:|---|---|
| BusinessCalendar → CalendarOperatingDay | 1:N | Yes | Restrict delete; soft delete parent only after children are inactive/archived or soft deleted in same transaction. | A calendar must define all seven weekdays before activation. |
| BranchCalendarOverride → CalendarOperatingDay | 1:N | Conditional | Restrict delete; child soft delete allowed while parent remains. | Open day requires at least one active working-hour window. Closed day must have no active working-hour windows. |
| BusinessCalendar → Holiday | 1:N | Yes for Holiday | Restrict delete. | Holiday must belong to the institute calendar. |
| BusinessCalendar → ScheduleSession | 1:N | Yes for ScheduleSession | Restrict delete. | Published sessions require an active resolved calendar used at validation time. |
| ScheduleRecurrencePattern → ScheduleGenerationRun | 1:N | Optional | Set null on recurrence soft delete only at application level; physical FK uses Restrict or SetNull based on implementation preference. | Generation history must remain even if pattern is archived. |
| ScheduleRecurrencePattern → ScheduleSession | 1:N | Optional | Set null on archived recurrence pattern only if required; recommended Restrict for auditability. | Generated sessions preserve generation source. |
| ScheduleGenerationRun → ScheduleSession | 1:N | Optional | Restrict while sessions exist. | Bulk generation result must remain traceable. |
| ScheduleGenerationRun → ScheduleConflictLog | 1:N | Optional | Restrict. | Rejected/generated conflict records remain traceable. |
| ScheduleSession → ScheduleConflictLog | 1:N | Optional | Set null only for pre-save validation; restrict for saved sessions. | Conflict history remains available. |
| ScheduleSession → ScheduleOverride | 1:N | Optional | Restrict. | Overrides are sensitive compliance records. |
| ScheduleSession → ScheduleChangeHistory | 1:N | Yes after first change | Restrict. | Schedule timeline must remain available. |
| ScheduleSession → ScheduleSession original/replacement | 1:0..1 self-reference | Optional | Restrict. | Rescheduled original points to replacement; replacement points to original. |

### 5.2 External Context Relationships

| Scheduling Entity | External Entity | Cardinality | FK Rule | Ownership Boundary |
|---|---|---:|---|---|
| BusinessCalendar | Branch | N:1 | Restrict | Organization owns Branch; Scheduling cannot create or delete Branch. |
| CalendarOperatingDay | Branch | N:1 | Restrict | Denormalized for scoping; must match parent calendar branch. |
| CalendarWorkingHour | Branch | N:1 | Restrict | Denormalized for scoping; must match parent operating day branch. |
| Holiday | Branch | N:1 | Restrict | Must match parent calendar branch. |
| VenueBlock | Branch | N:1 | Restrict | Scheduling owns block; Organization owns branch status. |
| VenueBlock | Classroom | N:0..1 | Restrict | Classroom block must reference active classroom from same branch. |
| ScheduleSession | Branch | N:1 | Restrict | Must match batch branch and classroom branch. |
| ScheduleSession | Course | N:1 | Restrict | Course comes from batch; Scheduling cannot alter course catalog. |
| ScheduleSession | Batch | N:1 | Restrict | Training Delivery owns batch; Scheduling owns session timetable. |
| ScheduleSession | TrainerProfile | N:1 | Restrict | Trainer Management owns trainer profile and availability. |
| ScheduleSession | Classroom | N:1 | Restrict | Organization owns classroom. |
| All audit actor fields | User | N:1 | Restrict | IAM owns user. Actor references cannot be physically cascaded. |
| ScheduleChangeHistory.auditLogId | AuditLog | N:0..1 | Set Null or Restrict | Audit context owns generic audit row. |

### 5.3 Cascading and Restrict Rules

| Scenario | Required Rule |
|---|---|
| Branch is deactivated | Scheduling records remain. New scheduling is blocked by application validation. No DB cascade. |
| Classroom is deactivated | Historical sessions remain. New Published sessions cannot use inactive classroom. No DB cascade. |
| Trainer is deactivated | Historical sessions remain. New Published sessions cannot use inactive trainer. No DB cascade. |
| Batch is cancelled or completed | Historical sessions remain. New scheduling follows Training Delivery state rules. No DB cascade. |
| Calendar is archived | Children remain readable. New scheduling cannot use Archived calendar. No DB cascade. |
| ScheduleSession is soft deleted | Conflict logs, overrides, and change history remain. All timetable queries exclude soft-deleted sessions by default. |
| User is deactivated | Actor references remain. No cascade to audit fields. |

---

## 6. Referential Integrity and Validation Rules

### 6.1 Branch Consistency Rules

| Rule ID | Rule | Enforced By |
|---|---|---|
| DB-SCH-RI-001 | `BusinessCalendar.branchId` must reference an active, non-deleted Branch at create time. | Application service and FK. |
| DB-SCH-RI-002 | `Holiday.branchId` must match `BusinessCalendar.branchId`. | Application service; optional database trigger. |
| DB-SCH-RI-003 | `CalendarOperatingDay.branchId` must match parent `BusinessCalendar.branchId`. | Application service; optional database trigger. |
| DB-SCH-RI-004 | `CalendarWorkingHour.branchId` must match parent `CalendarOperatingDay.branchId`. | Application service; optional database trigger. |
| DB-SCH-RI-005 | `VenueBlock.classroomId`, when present, must belong to the same `branchId`. | Application service; optional database trigger. |
| DB-SCH-RI-006 | `ScheduleSession.branchId` must match Batch branch, Classroom branch, and selected BusinessCalendar branch. | Application service before insert/update. |
| DB-SCH-RI-007 | `ScheduleSession.courseId` must match Batch course. | Application service before insert/update. |

### 6.2 Time and Date Rules

| Rule ID | Rule | Enforced By |
|---|---|---|
| DB-SCH-TIME-001 | `startTime` must be earlier than `endTime` for all time-window tables. | Database check and application validation. |
| DB-SCH-TIME-002 | `ScheduleSession.durationMinutes` must equal the difference between `endTime` and `startTime`. | Application calculation; database check ensures positive range. |
| DB-SCH-TIME-003 | Date-only business values are evaluated in `Asia/Muscat`. | Application service. |
| DB-SCH-TIME-004 | `startAtUtc` and `endAtUtc` are computed from `scheduledDate`, `startTime`, `endTime`, and branch timezone. | Application service. |
| DB-SCH-TIME-005 | Overlap checks use UTC timestamps to avoid ambiguity even though Oman has no daylight saving time. | Application service and indexes. |

### 6.3 Optimistic Locking Rules

| Rule ID | Rule | Enforced By |
|---|---|---|
| DB-SCH-LOCK-001 | Every update request must include current `version`. | Application service. |
| DB-SCH-LOCK-002 | Update query must include `WHERE id = ? AND version = ? AND isDeleted = false`. | Repository implementation. |
| DB-SCH-LOCK-003 | Successful update increments `version` by 1. | Repository implementation. |
| DB-SCH-LOCK-004 | Version mismatch returns conflict error and does not retry automatically. | Application service. |

---

## 7. CRUD Matrix

### 7.1 Actor Legend

| Actor Code | Actor | Type | Branch Scope |
|---|---|---|---|
| SA | Super Admin | Human | All configured branches if assigned or explicitly granted consolidated scope. |
| BM | Branch Manager | Human | Own branch and permitted child branches. |
| AC | Academic Coordinator / Training Coordinator | Human | Assigned branch only unless extra branch access is granted. |
| REC | Receptionist / Front Desk | Human | Assigned branch read access; limited operational view. |
| TRN | Trainer | Human | Own assigned sessions and approved trainer timetable. |
| STU | Student / Participant | Human | Own enrolled session timetable only through student portal when available. |
| AUD | Auditor / Compliance Officer | Human | Read/audit scope based on assigned branch or consolidated audit permission. |
| CEO | Executive / Consolidated Reporter | Human | Read/report only across permitted branches when `scheduling.report.consolidated` is granted. |
| SYS-SCH | Scheduling Validation Service | System | Same branch as request; cannot bypass permission-sensitive workflow without service policy. |
| SYS-ATT | Attendance Module | System | Reads published sessions in branch scope to create attendance sessions. |
| SYS-COMM | Communication Module | System | Reads published/rescheduled/cancelled sessions for notification requests. |
| SYS-RPT | Reporting Module | System | Reads schedule data according to requesting user/report permission. |

### 7.2 CRUD Action Legend

| Symbol | Meaning |
|---|---|
| C | Create |
| R | Read/list/detail |
| U | Update non-terminal data |
| D | Soft delete only |
| A | Audit/history/export access |
| P | Publish/activate/status transition |
| O | Override conflicts |
| X | Not allowed |

### 7.3 Entity CRUD Matrix

| Entity | SA | BM | AC | REC | TRN | STU | AUD | CEO | SYS-SCH | SYS-ATT | SYS-COMM | SYS-RPT | Required Permissions | Branch Scoping Logic |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BusinessCalendar | C,R,U,D,A,P | C,R,U,D,A,P within institute scope | R within branch; U only if granted | R limited | X | X | R,A | R summary | R validation | X | X | R summary | `scheduling.calendar.create`, `scheduling.calendar.read`, `scheduling.calendar.update`, `scheduling.calendar.archive`, `scheduling.audit.read` | Direct `instituteId`; consolidated read requires `scheduling.calendar.consolidated.read`. |
| BranchCalendarOverride | C,R,U,D,A,P | C,R,U,D,A,P within branch | R,U if granted | R limited | X | X | R,A | R summary | R validation | X | X | R summary | `scheduling.calendar.update`, `scheduling.calendar.read` | Direct `branchId`; must match parent institute calendar and override year. |
| CalendarOperatingDay | C,R,U,D,A | C,R,U,D,A within institute/branch scope | R,U if granted | R limited | X | X | R,A | R summary | R validation | X | X | R summary | `scheduling.calendar.update`, `scheduling.calendar.read` | Direct `calendarId`; must match parent BusinessCalendar or BranchCalendarOverride. |
| CalendarWorkingHour | C,R,U,D,A | C,R,U,D,A within institute/branch scope | R,U if granted | R limited | X | X | R,A | R summary | R validation | X | X | R summary | `scheduling.calendar.update`, `scheduling.calendar.read` | Direct `calendarId`; must match parent CalendarOperatingDay. |
| Holiday | C,R,U,D,A,P | C,R,U,D,A,P within branch | C,R,U within branch if granted | R | R own branch holiday calendar | R public/own timetable impact | R,A | R summary | R validation | X | R for notification context | R summary | `scheduling.holiday.create`, `scheduling.holiday.read`, `scheduling.holiday.update`, `scheduling.holiday.delete`, `scheduling.holiday.activate` | Direct `branchId`; consolidated holiday calendar requires reporting permission. |
| VenueBlock | C,R,U,D,A,P | C,R,U,D,A,P within branch | C,R,U within branch if granted | R | R own affected timetable | R own affected timetable | R,A | R summary | R validation | X | R for notification context | R summary | `scheduling.venueBlock.create`, `scheduling.venueBlock.read`, `scheduling.venueBlock.update`, `scheduling.venueBlock.delete`, `scheduling.venueBlock.activate` | Direct `branchId`; classroom block additionally validates classroom branch. |
| ScheduleSession | C,R,U,D,A,P,O | C,R,U,D,A,P,O within branch | C,R,U,D,P within branch; O only if granted | R daily view | R own assigned sessions | R own enrolled sessions | R,A | R summary | C/R/U validation support | R published sessions | R published/rescheduled/cancelled events | R summary | `scheduling.session.create`, `scheduling.session.read`, `scheduling.session.update`, `scheduling.session.delete`, `scheduling.session.publish`, `scheduling.session.cancel`, `scheduling.session.reschedule`, `scheduling.override.*` | Direct `branchId`; trainer/student portal additionally filters by trainerId or enrollment membership through Training Delivery/Enrollment. |
| ScheduleRecurrencePattern | C,R,U,D,A,P | C,R,U,D,A,P within branch | C,R,U,D within branch if granted | X | X | X | R,A | R summary | R for generation | X | X | R summary | `scheduling.recurrence.create`, `scheduling.recurrence.read`, `scheduling.recurrence.update`, `scheduling.recurrence.delete` | Direct `branchId`; batch must belong to same branch. |
| ScheduleGenerationRun | C,R,A | C,R,A within branch | C,R,A within branch | X | X | X | R,A | R summary | C,R,U system-owned status | X | X | R summary | `scheduling.session.bulkCreate`, `scheduling.generation.read`, `scheduling.audit.read` | Direct `branchId`; result rows must not expose outside-branch entity IDs. |
| ScheduleConflictLog | C,R,A | R,A within branch | R within branch | X | X | X | R,A | R summary | C,R,U resolution metadata | X | X | R summary | `scheduling.conflict.read`, `scheduling.audit.read` | Direct `branchId`; pre-save validation logs inherit request branch. |
| ScheduleOverride | C,R,U,A,O | C,R,U,A,O within branch if permission granted | R only; C only if explicit override permission | X | X | X | R,A | R summary | R validation | X | X | R summary | `scheduling.override.holiday`, `scheduling.override.venueBlock`, `scheduling.override.workingHours`, `scheduling.override.trainerAvailability`, `scheduling.override.batchDate`, `scheduling.override.read` | Direct `branchId`; override creation requires branch permission plus specific override permission. |
| ScheduleChangeHistory | C,R,A | R,A within branch | R within branch | X | R own session history limited | R own session changes limited | R,A | R summary | C system entries | X | X | R summary | `scheduling.audit.read`, `scheduling.session.read` | Direct `branchId`; student/trainer views must expose only safe change reasons. |
| ScheduleExportLog | C,R,A | C,R,A within branch | C,R own exports | X | X | X | R,A | R,A summary | X | X | X | C/R summary | `scheduling.export`, `scheduling.export.consolidated`, `scheduling.audit.read` | `branchId` for branch export; consolidated export requires `consolidatedExport=true` and permission. |

### 7.4 CRUD Permission Notes

| Permission Code | Description |
|---|---|
| `scheduling.calendar.create` | Create institute business calendar. |
| `scheduling.calendar.read` | Read institute calendar details and branch overrides. |
| `scheduling.calendar.update` | Update calendar, operating days, and working hours. |
| `scheduling.calendar.archive` | Archive calendar after closure. |
| `scheduling.holiday.create` | Create holiday. |
| `scheduling.holiday.read` | Read holiday list/detail. |
| `scheduling.holiday.update` | Update holiday. |
| `scheduling.holiday.delete` | Soft delete holiday. |
| `scheduling.holiday.activate` | Activate/deactivate holiday. |
| `scheduling.venueBlock.create` | Create venue block. |
| `scheduling.venueBlock.read` | Read venue blocks. |
| `scheduling.venueBlock.update` | Update venue block. |
| `scheduling.venueBlock.delete` | Soft delete venue block. |
| `scheduling.venueBlock.activate` | Activate/deactivate venue block. |
| `scheduling.session.create` | Create draft schedule session. |
| `scheduling.session.read` | Read schedule views. |
| `scheduling.session.update` | Update draft session details. |
| `scheduling.session.publish` | Publish validated session. |
| `scheduling.session.cancel` | Cancel published session. |
| `scheduling.session.reschedule` | Reschedule published session. |
| `scheduling.session.delete` | Soft delete draft/conflict session. |
| `scheduling.session.bulkCreate` | Generate recurring sessions. |
| `scheduling.conflict.read` | View conflict reports. |
| `scheduling.override.holiday` | Approve holiday override. |
| `scheduling.override.venueBlock` | Approve venue block override. |
| `scheduling.override.workingHours` | Approve outside working day/hour override. |
| `scheduling.override.trainerAvailability` | Approve trainer availability override. |
| `scheduling.override.batchDate` | Approve batch date range override. |
| `scheduling.override.read` | Read override records. |
| `scheduling.export` | Export branch-scoped schedule data. |
| `scheduling.export.consolidated` | Export multi-branch schedule data. |
| `scheduling.audit.read` | Read audit and change history. |
| `scheduling.report.consolidated` | View consolidated scheduling reports. |

---

## 8. Data Access Patterns

### 8.1 Daily Schedule Query

```sql
SELECT ss.*
FROM schedule_sessions ss
WHERE ss.branch_id = ANY(:allowed_branch_ids)
  AND ss.scheduled_date = :selected_date
  AND ss.status IN ('PUBLISHED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED')
  AND ss.is_deleted = false
ORDER BY ss.start_time ASC, ss.classroom_id ASC, ss.session_number ASC;
```

### 8.2 Trainer Overlap Validation

```sql
SELECT ss.id, ss.batch_id, ss.scheduled_date, ss.start_time, ss.end_time
FROM schedule_sessions ss
WHERE ss.branch_id = :branch_id
  AND ss.trainer_id = :trainer_id
  AND ss.status IN ('PUBLISHED', 'RESCHEDULED')
  AND ss.is_deleted = false
  AND ss.id <> COALESCE(:exclude_schedule_session_id, '00000000-0000-0000-0000-000000000000')::uuid
  AND ss.start_at_utc < :candidate_end_at_utc
  AND ss.end_at_utc > :candidate_start_at_utc;
```

### 8.3 Classroom Overlap Validation

```sql
SELECT ss.id, ss.batch_id, ss.scheduled_date, ss.start_time, ss.end_time
FROM schedule_sessions ss
WHERE ss.branch_id = :branch_id
  AND ss.classroom_id = :classroom_id
  AND ss.status IN ('PUBLISHED', 'RESCHEDULED')
  AND ss.is_deleted = false
  AND ss.id <> COALESCE(:exclude_schedule_session_id, '00000000-0000-0000-0000-000000000000')::uuid
  AND ss.start_at_utc < :candidate_end_at_utc
  AND ss.end_at_utc > :candidate_start_at_utc;
```

### 8.4 Active Holiday Validation

```sql
SELECT h.id, h.name, h.holiday_type, h.requires_override_permission
FROM holidays h
WHERE h.branch_id = :branch_id
  AND h.date = :scheduled_date
  AND h.status = 'ACTIVE'
  AND h.blocks_scheduling = true
  AND h.is_deleted = false
  AND h.effective_start_date <= :scheduled_date
  AND (h.effective_end_date IS NULL OR h.effective_end_date >= :scheduled_date);
```

### 8.5 Venue Block Validation

```sql
SELECT vb.id, vb.scope, vb.classroom_id, vb.reason_code, vb.reason
FROM venue_blocks vb
WHERE vb.branch_id = :branch_id
  AND vb.block_date = :scheduled_date
  AND vb.status = 'ACTIVE'
  AND vb.is_deleted = false
  AND (
        vb.scope = 'BRANCH'
        OR (vb.scope = 'CLASSROOM' AND vb.classroom_id = :classroom_id)
      )
  AND (
        vb.is_full_day = true
        OR (vb.start_time < :candidate_end_time AND vb.end_time > :candidate_start_time)
      );
```

### 8.6 Working Hours Validation

```sql
SELECT cwh.id
FROM calendar_working_hours cwh
JOIN calendar_operating_days cod ON cod.id = cwh.calendar_operating_day_id
WHERE cwh.business_calendar_id = :business_calendar_id
  AND cwh.branch_id = :branch_id
  AND cod.weekday = :weekday_code
  AND cod.is_open = true
  AND cod.is_deleted = false
  AND cwh.status = 'ACTIVE'
  AND cwh.is_deleted = false
  AND cwh.start_time <= :candidate_start_time
  AND cwh.end_time >= :candidate_end_time
  AND cwh.effective_start_date <= :scheduled_date
  AND (cwh.effective_end_date IS NULL OR cwh.effective_end_date >= :scheduled_date);
```

---

## 9. Prisma Repository Requirements

### 9.1 Repository Boundary

Scheduling repositories must not expose unscoped low-level query methods to application services. Every repository method must accept a `BranchScope` object.

```ts
type BranchScope = {
  activeBranchId: string;
  allowedBranchIds: string[];
  canViewConsolidated: boolean;
  permissionCodes: string[];
};
```

### 9.2 Required Repository Methods

| Repository | Required Methods |
|---|---|
| `BusinessCalendarRepository` | `create`, `findByIdScoped`, `findActiveByBranchAndDate`, `updateWithVersion`, `activate`, `close`, `archive`, `softDelete`, `listByBranchYear` |
| `HolidayRepository` | `create`, `findByIdScoped`, `listByCalendar`, `listActiveByDate`, `updateWithVersion`, `activate`, `deactivate`, `archive`, `softDelete` |
| `VenueBlockRepository` | `create`, `findByIdScoped`, `findActiveBlocksForCandidate`, `updateWithVersion`, `activate`, `cancel`, `expirePastBlocks`, `softDelete` |
| `ScheduleSessionRepository` | `createDraft`, `findByIdScoped`, `listDaily`, `listWeekly`, `listMonthly`, `listByTrainer`, `listByClassroom`, `listByBatch`, `findTrainerOverlaps`, `findClassroomOverlaps`, `findBatchOverlaps`, `publishWithVersion`, `rescheduleWithVersion`, `cancelWithVersion`, `completeFromAttendance`, `softDeleteDraft` |
| `ScheduleConflictLogRepository` | `appendValidationResult`, `listBySession`, `listByGenerationRun`, `markResolvedByOverride` |
| `ScheduleOverrideRepository` | `create`, `findActiveBySession`, `revokeWithVersion`, `listByBranch` |
| `ScheduleChangeHistoryRepository` | `append`, `listTimelineBySession`, `listByBranchDateRange` |
| `ScheduleExportLogRepository` | `create`, `listByUser`, `listByBranch`, `listConsolidatedExports` |

### 9.3 Transaction Requirements

| Transaction | Required Atomic Operations |
|---|---|
| Publish schedule session | Reload session with version, run conflict validations, create conflict logs, create overrides if approved, update session status, append change history, write AuditLog. |
| Reschedule session | Reload original session with version, validate attendance finalization, create replacement session, mark original as Rescheduled, link both sessions, append change history for both, write AuditLog. |
| Cancel session | Reload session with version, validate cancellable status, update status and cancellation fields, append change history, write AuditLog, trigger communication request inside modular boundary if enabled. |
| Bulk generation | Create generation run, generate candidates, validate each candidate, insert valid sessions, insert conflict logs for rejected candidates, update generation counts and status, write AuditLog. |
| Calendar activation | Reload calendar with version, validate uniqueness, validate seven operating days and working hours, set active, close conflicting active calendar only when explicitly requested and audited, write AuditLog. |
| Venue block activation | Reload block with version, detect impacted published sessions, reject or require override workflow, update block status, write AuditLog. |

---

## 10. Migration and Seed Requirements

### 10.1 Required PostgreSQL Extensions

| Extension | Purpose |
|---|---|
| `pgcrypto` | UUID generation using `gen_random_uuid()` when database-side UUIDs are used. |
| `btree_gist` | Optional exclusion constraints for overlap protection. Application validation remains mandatory. |

### 10.2 Seed Data

| Seed Group | Required Values |
|---|---|
| Calendar statuses | Draft, Active, Closed, Archived. |
| Holiday statuses | Draft, Active, Inactive, Archived. |
| Holiday types | Oman Public Holiday, ASTI Institute Holiday, Branch Closure, Non-Training Day, Special Event Day, Emergency Closure. |
| Venue block statuses | Draft, Active, Cancelled, Expired, Archived. |
| Venue block reason codes | Maintenance, Exam, Institute Event, Emergency, Cleaning, Management Reserved, Classroom Repair, Branch Closure. |
| Schedule statuses | Draft, Conflict, Published, Rescheduled, Cancelled, Completed. |
| Conflict types | Trainer Overlap, Classroom Overlap, Batch Overlap, Holiday Conflict, Venue Block Conflict, Trainer Unavailable, Outside Working Day, Outside Working Hours, Batch Date Range Violation, Branch Mismatch, Course Authorization Missing. |
| Override types | Holiday Override, Venue Block Override, Working Hours Override, Batch Date Override, Trainer Availability Override, Classroom Capacity Override, Conflict Draft Acceptance. |
| Permissions | All permission codes listed in Section 7.4. |

### 10.3 Initial Data Quality Rules

| Rule | Requirement |
|---|---|
| Active calendar readiness | A branch cannot schedule published sessions until it has one Active calendar covering the selected date. |
| Weekday completeness | Calendar activation requires exactly seven non-deleted `CalendarOperatingDay` rows. |
| Working hours completeness | Every open weekday requires at least one active non-deleted `CalendarWorkingHour` row. |
| Branch consistency | Every imported holiday and venue block must map to a valid branch code from Organization Management. |
| Time format | Imported times must be normalized to `HH:mm:ss` with seconds set to `00`. |
| Arabic localization | Calendar names and holiday names require both English and Arabic values. |

---

## 11. Data Retention, Soft Delete, and Audit Requirements

| Area | Requirement |
|---|---|
| Soft delete | All operational entities must support `isDeleted`, `deletedAt`, and `deletedBy`. |
| Hard delete | Hard delete is prohibited through application code. Database maintenance scripts may purge only non-production test data with explicit approval. |
| Audit | Sensitive operations must write to `AuditLog` and, for schedule sessions, to `ScheduleChangeHistory`. |
| Export logging | Schedule exports must write `ScheduleExportLog` with filter snapshot, branch scope, row count, and permission used. |
| Retention | Business calendars, holidays, venue blocks, schedule sessions, conflicts, overrides, and change history must be retained for at least the operational compliance period defined by ASTI policy. |
| Recovery | Soft-deleted Draft records may be restored only by privileged admin workflow if no newer conflicting active record exists. Published, Cancelled, Rescheduled, and Completed sessions are not restored by normal workflow. |
| PII minimization | Scheduling tables store actor IDs and operational references. They must not duplicate student personal details, trainer personal details, or branch address data. |

---

## 12. Cross-Module Data Ownership Boundaries

| Data / Operation | Owner | Scheduling Behavior |
|---|---|---|
| Branch, classroom master data | Organization Management | Scheduling references IDs and validates status, branch, capacity, and effective dates. |
| Course master data and course completion rule | Course Catalog | Scheduling displays course details through references; it does not own course names or completion rules. |
| Batch lifecycle and capacity | Training Delivery | Scheduling validates batch date range and status; it does not change enrollment capacity. |
| Trainer profile, availability, authorization | Faculty / Trainer Management | Scheduling validates trainer status, availability, and course authorization. |
| Enrollment | Admission & Enrollment | Scheduling does not create enrollment and does not duplicate learner lifecycle. |
| AttendanceSession and AttendanceRecord | Attendance Management | Scheduling provides published timetable; Attendance owns attendance records. |
| Notification templates and delivery logs | Communication & Notification | Scheduling can request notification; Communication owns template and delivery. |
| Dashboard widgets and metric snapshots | Reporting & Dashboards | Scheduling provides queryable data; Reporting owns dashboard definitions and snapshots. |
| Generic AuditLog and ApprovalRequest | Audit & Compliance | Scheduling writes audit events and may reference approvals; Audit owns approval lifecycle. |

---

## 13. Implementation Notes for Next.js Monorepo

### 13.1 Suggested Package Boundary

```text
packages/scheduling-calendar
├── src
│   ├── application
│   │   ├── commands
│   │   ├── queries
│   │   ├── validators
│   │   └── services
│   ├── domain
│   │   ├── entities
│   │   ├── enums
│   │   ├── policies
│   │   └── value-objects
│   ├── infrastructure
│   │   ├── prisma
│   │   └── repositories
│   └── api
│       ├── schemas
│       └── route-handlers
```

### 13.2 Required Domain Policies

| Policy | Responsibility |
|---|---|
| `BranchScopePolicy` | Ensures user can access branch before repository query. |
| `CalendarActivationPolicy` | Validates active calendar uniqueness and operating day completeness. |
| `WorkingHoursPolicy` | Validates open day and time-window coverage. |
| `HolidayConflictPolicy` | Detects active holiday conflicts. |
| `VenueBlockConflictPolicy` | Detects branch and classroom block conflicts. |
| `TrainerOverlapPolicy` | Detects trainer double booking. |
| `ClassroomOverlapPolicy` | Detects classroom double booking. |
| `BatchOverlapPolicy` | Detects batch overlap. |
| `ScheduleStatePolicy` | Validates allowed state transitions. |
| `ScheduleOverridePolicy` | Validates override permission, reason, and audit requirements. |

---

## 14. Acceptance Checklist for Database Design

| Check ID | Acceptance Criterion |
|---|---|
| DB-SCH-AC-001 | Every owned entity has `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `isDeleted`, `deletedAt`, `deletedBy`, and `version`, except append-only logs where explicitly reduced fields are justified. |
| DB-SCH-AC-002 | Every operational owned entity is branch-scoped through direct `branchId`. |
| DB-SCH-AC-003 | No scheduling table duplicates student, trainer, branch, course, or batch master data beyond stable FK references and display-safe optional titles. |
| DB-SCH-AC-004 | BusinessCalendar activation prevents duplicate active calendars for the same branch and year. |
| DB-SCH-AC-005 | Calendar activation requires exactly seven weekdays. |
| DB-SCH-AC-006 | Open weekdays require valid non-overlapping working-hour windows. |
| DB-SCH-AC-007 | Holiday creation prevents duplicate active holiday rows for the same calendar/date/type. |
| DB-SCH-AC-008 | Venue blocks support both branch-wide and classroom-specific blocking. |
| DB-SCH-AC-009 | ScheduleSession stores local date/time and computed UTC timestamps for reliable overlap checks. |
| DB-SCH-AC-010 | Published and Rescheduled sessions participate in trainer, classroom, and batch overlap detection. |
| DB-SCH-AC-011 | Draft and Conflict sessions do not block official timetable unless policy explicitly says otherwise. |
| DB-SCH-AC-012 | Overrides capture permission code, reason code, notes, approver, approval timestamp, and conflict snapshot. |
| DB-SCH-AC-013 | Export operations are logged with filter snapshot and branch scope. |
| DB-SCH-AC-014 | All update operations support optimistic locking through `version`. |
| DB-SCH-AC-015 | Hard delete is not exposed through repositories or admin UI. |

---

## 15. Summary

The Module 07 database design establishes Scheduling, Calendar & Holiday Management as a branch-scoped, auditable planning context. It owns calendars, operating days, working hours, holidays, venue blocks, schedule sessions, recurrence generation records, conflict logs, overrides, change history, and export logs. It references Organization, Course Catalog, Training Delivery, Trainer Management, IAM, Attendance, Reporting, Communication, and Audit contexts without duplicating their domain ownership.

The design supports production-grade scheduling requirements for ASTI IMS: preventing double bookings, protecting holidays and closure periods, enforcing branch isolation, preserving a full change trail, supporting bilingual operational data, and maintaining clean DDD boundaries inside a Next.js modular monolith.
