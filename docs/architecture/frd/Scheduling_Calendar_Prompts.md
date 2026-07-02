# Prompts for Module 07: Scheduling, Calendar & Holiday Management

This file contains the complete, customized, step-by-step prompt sequence to generate the 12-part Functional Requirement Document (FRD) for **Module 07: Scheduling, Calendar & Holiday Management**, strictly aligned with:
- The Bounded Context rules (`docs/architecture/ddd/ddd-context-map.md` Section 8.12)
- The Entity Relationship Model (`docs/architecture/ddd/ER Model.md` Section 15 and Section 8.4/8.5)
- The existing database tables in `packages/database/prisma/schema.prisma`.

---

## Part-by-Part Prompt Sequence

### 1. Initial Setup: The Master System Prompt
**Prompt to run first:**
```markdown
You are a Principal Solutions Architect and Senior Staff Engineer specializing in clean architecture, Domain-Driven Design (DDD), and TypeScript/Next.js monorepos. Your task is to help me generate a production-grade, highly detailed Functional Requirement Document (FRD) divided into 12 distinct parts for "Module 07: Scheduling, Calendar & Holiday Management" of the Al Saud Training Institute (ASTI) Integrated Institute Management System (IMS).

### Bounded Context Context Rules for Module 07:
1. **Core Domain Focus:** This module governs timetable session planning, calendar setups, public holiday calendars, classroom bookings, and venue blocking exceptions.
2. **Conflict Prevention Engine (Crucial):** The core business logic must prevent:
   - **Trainer Double Booking:** A trainer cannot be assigned to overlapping sessions in different batches, classrooms, or branches at the same time.
   - **Classroom Double Booking:** A classroom cannot host overlapping sessions.
   - **Batch Overlap:** A single student cohort/batch cannot have overlapping sessions.
   - **Holiday & Blocked Date Conflicts:** Timetable scheduling must automatically detect and warn/block sessions falling on registered holidays or classroom blocked-date ranges.
3. **Availability Checking:** Validates trainer availability against the constraints registered in Module 10 (`TrainerAvailability`).
4. **Soft Deletes & Active Dating:** No hard deletes. Every session, calendar, holiday, and venue block record must support soft delete attributes (`isDeleted`, `deletedAt`) and modifications auditability.
5. **Branch Isolation:** Enforce server-side branch scoping. All timetables, sessions, calendar blocks, and venue blocks must belong to a `branchId` context.

### Database Context & Target Models:
* No scheduling or holiday models currently exist in `packages/database/prisma/schema.prisma`. 
* We need to introduce the following model structures:
  - `BusinessCalendar` (Fields: `id`, `branchId` [FK to Branch], `name`, `year` [Int], `countryCode` [String], `status` [Enum: Active, Inactive, Archived], audit columns)
  - `Holiday` (Fields: `id`, `calendarId` [FK to BusinessCalendar], `date` [Date], `name` [String], `nameLocalized` [String, Arabic name], `holidayType` [Enum: National, Local, Ramadan, Eid, Emergency], audit columns)
  - `ScheduleSession` (Fields: `id`, `batchId` [FK to Batch], `trainerId` [FK to TrainerProfile], `classroomId` [FK to Classroom], `scheduledDate` [Date], `startTime` [Time/String], `endTime` [Time/String], `status` [Enum: Scheduled, InProgress, Completed, Cancelled, Postponed], `conflictChecked` [Boolean], audit columns)
  - `VenueBlock` (Fields: `id`, `branchId` [FK to Branch], `classroomId` [FK to Classroom], `blockDate` [Date], `startTime` [Time/String], `endTime` [Time/String], `reason` [Text], `status` [Enum: Active, Cancelled], audit columns)

We will generate this FRD systematically, one part at a time. Please confirm you understand these rules, conflict check constraints, and target models.
```

---

### Step 2: Main Index & Part 1
**Prompt to run second:**
```markdown
Generate the following two files for Module 07 – Scheduling, Calendar & Holiday Management:

1. `Module 7: Scheduling & Timetable Management.md`
   - Purpose and Objective (creating timetables, scheduling sessions, preventing scheduling conflicts, managing holiday exceptions)
   - Business Goals (BO-SCH-xxx format)
   - Scope (Included: session scheduling, holiday calendars, venue blocks, trainer conflict checks. Excluded: marking student attendance, trainer payroll/compensation run, student admissions)
   - Stakeholders & Actors (Human: Super Admin, Branch Manager, Academic Coordinator/Scheduler, Trainer. System: Timetable Engine, Notification Dispatcher, Conflict Validator)
   - Functional Overview (Tree diagram of submodules)
   - Business Capabilities & User Types (Internal: Schedulers, coordinators. External: Trainers, Students viewing calendars)
   - Functional Requirements Checklist (FR-SCH-xxx format for scheduling; FR-HOL-xxx for holidays/calendars)
   - Permission Model Overview
   - Security & Audit Requirements Summary
   - Non-Functional Requirements Summary

2. `Part 1 – Business Overview, Functional Requirements, Business Rules.md`
   - Comprehensive introduction and business benefits.
   - Detailed functional requirements specifications. For each requirement (e.g., FR-SCH-001 Create Timetable Template, FR-SCH-002 Schedule Batch Session, FR-SCH-003 Detect Resource Conflict, FR-SCH-004 Create Venue Block, FR-HOL-001 Configure Business Calendar, FR-HOL-002 Create Holiday Exception), specify:
     * Description & Actors
     * Preconditions
     * Inputs
     * Processing Steps (validations, check for overlapping trainer/room slots, holiday calendar overrides, Ramadan hours adjustments)
     * Outputs & Postconditions
     * Priority (MoSCoW)
   - Comprehensive Business Rules table (BR-SCH-xxx) detailing states, strict calendar bounds, overlap buffer minutes, and conflict override permission bypasses.
   - Cross-module dependencies mapping (Course catalog duration rules, Classroom capacity checks, Trainer availability matching, Attendance session generation).

Be exhaustive, concrete, and write out all requirements in full. No placeholders.
```

---

### Step 3: Part 2 – User Stories, Use Cases, & Workflows
**Prompt to run third:**
```markdown
Generate `Part 2 – User Stories, Use Cases, Workflows, State Machines.md` for Module 07 – Scheduling, Calendar & Holiday Management.

Requirements:
1. **User Stories:** Write at least 8 detailed User Stories in the "As a... I want to... So that..." format. Prioritize them using MoSCoW and provide a BDD-style Gherkin acceptance criteria block (Given/When/Then) for each. Include stories for:
   - Scheduler scheduling weekly sessions for a batch.
   - Scheduler getting blocked when trainer has a double-booking collision.
   - Scheduler booking a classroom and checking seating capacities.
   - Branch manager registering national Eid holidays (clearing affected sessions).
2. **Use Cases:** Document the primary use cases (e.g., Generate Timetable Schedule, Resolve Scheduling Collision, Create Emergency Holiday) with:
   - Primary Actor
   - Preconditions
   - Main Success Scenario (Numbered steps)
   - Alternative Flows (e.g., trainer unavailable, classroom under maintenance, holiday overlap warning/auto-postpone)
   - Postconditions
3. **Business Workflows:** Describe the core operational workflows (Batch creation $\rightarrow$ Timetable template mapping $\rightarrow$ Room/Trainer assignment checks $\rightarrow$ Conflict Validation $\rightarrow$ Publish Calendar $\rightarrow$ Generate Attendance Sessions) in structured text or ASCII/Mermaid sequence diagrams.
4. **State Machines:** Identify the entity state machines:
   - **ScheduleSession Status Lifecycle:** `Scheduled` $\rightarrow$ `InProgress` $\rightarrow$ `Completed` $\rightarrow$ `Postponed` $\rightarrow$ `Cancelled`.
   - Include a Mermaid state transition diagram and a transition rules matrix mapping allowed from/to statuses and required permissions.
```

---

### Step 4: Part 3 – Screen Specifications & UI Components
**Prompt to run fourth:**
```markdown
Generate `Part 3 – Screen Specifications and UI Components.md` for Module 07 – Scheduling, Calendar & Holiday Management.

Requirements:
1. **Screen Inventory:** List all screens required for the Admin/Staff portal (Calendar view, Schedule forms) and read-only views for Student/Trainer dashboards.
2. **Screen Details:** For each screen (e.g., Weekly Training Calendar Grid, Session Booking Form, Holiday List, Venue Blocking interface), define:
   - Layout & Grid Structure (dense calendar grid, day/week/month toggle layout)
   - Interactive Elements (drag-and-drop session rescheduling, quick edit drawers)
   - Input Form Fields with exact validations (e.g., batch selector, room list, trainer list, dates, start/end time validation)
   - Table/Grid behaviors with sorting, filtering, and paging.
3. **Dynamic UI States:** Document form validation error states (e.g., red conflict banners), loading skeletons, empty states, and permission-based element hiding.
4. **Bilingual Layout Rules:** Specify English (LTR) and Arabic (RTL) rendering differences.
```

---

### Step 5: Part 4 – Database Entities & CRUD Matrix
**Prompt to run fifth:**
```markdown
Generate `Part 4 – Database Entities and CRUD Matrix.md` for Module 07 – Scheduling, Calendar & Holiday Management.

Requirements:
1. **Entity Specifications:** Define all database models owned by this context. For each table:
   - `BusinessCalendar` (Fields: `id`, `branchId`, `name`, `year`, `countryCode`, `status`, audit columns)
   - `Holiday` (Fields: `id`, `calendarId`, `date`, `name`, `nameLocalized`, `holidayType`, audit columns)
   - `ScheduleSession` (Fields: `id`, `batchId`, `trainerId`, `classroomId`, `scheduledDate`, `startTime`, `endTime`, `status`, `conflictChecked`, audit columns)
   - `VenueBlock` (Fields: `id`, `branchId`, `classroomId`, `blockDate`, `startTime`, `endTime`, `reason`, `status`, audit columns)
   Provide exact PostgreSQL & Prisma equivalent data types, nullability, keys, unique constraints, and indexes (especially index on `scheduledDate` and composite indexes to optimize collision queries).
2. **Relationships:** Detail 1:1, 1:N, and N:M relationships with cascading/restrict rules. Ensure ScheduleSession links to `Batch`, `TrainerProfile`, and `Classroom`.
3. **CRUD Matrix:** Provide a Markdown table mapping Human/System Actors against entities, specifying allowed actions (Create, Read, Update, Delete, Audit) and the required branch-scoping logic.
```

---

### Step 6: Parts 5, 6, & 7 – API, Permissions, and Validations
**Prompt to run sixth:**
```markdown
Generate the following three files for Module 07 – Scheduling, Calendar & Holiday Management:

1. `Part 5 – API Contracts.md`
   - List all REST endpoints/Server Actions (Route, Method, Purpose).
   - For each endpoint (e.g., `POST /api/scheduling/sessions`, `GET /api/scheduling/calendar`, `PUT /api/scheduling/sessions/{id}`, `POST /api/scheduling/venue-blocks`), detail:
     * Authentication & Required Permission
     * Branch-scoping behavior
     * Request payload schema (Zod specification structure)
     * Success Response DTO (JSON format)
     * Error Response Catalog (HTTP status codes & custom application error codes)

2. `Part 6 – Permission Matrix.md`
   - Tabular mapping of all business roles (Super Admin, Branch Admin, Academic Coordinator, Scheduler, Trainer, Student) against fine-grained permissions (e.g., `session.create`, `session.override.conflict`, `holiday.manage`).
   - Separate permissions by: Action-level, Menu-level, and Report-level.

3. `Part 7 – Validation Rules, Error Catalog, Notifications.md`
   - Custom conflict detection algorithms (overlapping time check formula).
   - Structured error code catalog (e.g., `ERR_SCH_TRAINER_DOUBLE_BOOKED`, `ERR_SCH_CLASSROOM_UNAVAILABLE`, `ERR_SCH_HOLIDAY_CONFLICT`).
   - System notification events (Email, SMS, WhatsApp) triggered by scheduling changes (e.g., `SessionRescheduled` alerts affected trainers and students), including exact template variables.
```

---

### Step 7: Parts 8 & 9 – Reports, KPIs, and BDD Tests
**Prompt to run seventh:**
```markdown
Generate the following two files for Module 07 – Scheduling, Calendar & Holiday Management:

1. `Part 8 - Reports, Dashboards, KPIs, Analytics.md`
   - Define module-specific KPIs (e.g., classroom utilization rates, trainer hours delivery, reschedule rate, holiday count).
   - Detail Dashboard widgets (e.g., active classrooms today count, trainer hours delivered chart) with permission scopes.
   - List operational reports (e.g., Batch Timetable Export, Classroom Booking Ledger, Holiday List) with filters, columns, sorting, export options.
   - Explain read models or reporting database views to support fast training calendar queries.

2. `Part 9 – BDD Acceptance Criteria and Test Scenarios.md`
   - Write out comprehensive Gherkin (Feature, Scenario Outline, Scenario) test scenarios covering positive scheduling, trainer availability validation, double-booking blocks, emergency holiday cancellations, and branch isolation scopes.
```

---

### Step 8: Parts 10 & 11 – Non-Functional Requirements & Runbooks
**Prompt to run eighth:**
```markdown
Generate the final two files for Module 07 – Scheduling, Calendar & Holiday Management:

1. `Part 10 - Security Architecture and NFR.md`
   - Detail security measures (e.g., preventing unauthorized session modification, locking calendar states).
   - Specify Non-Functional performance, availability, scalability targets (e.g., conflict checking queries resolving in < 150ms).

2. `Part 11 - Deployment, Operations, Observability, Runbooks.md`
   - Observability setup: Structured logs format, tracing boundaries, metrics instrumentation.
   - Operations: System healthcheck rules, backup/recovery instructions for owned tables.
   - Troubleshooting Runbooks: Step-by-step guides for operational failures (e.g., calendar sync issues, resolving duplicate booking entries).
```

---

## 2. Validation & Review Prompt
**Prompt to run after generating the FRD to validate it against DDD & ER guidelines:**
```markdown
You are a Principal Solutions Architect and Senior staff DDD Reviewer. I have generated a Functional Requirement Document (FRD) for "Module 07: Scheduling, Calendar & Holiday Management".

Please review all the generated parts against the ASTI Bounded Context Map (docs/architecture/ddd/ddd-context-map.md) and ER Model (docs/architecture/ddd/ER Model.md) to evaluate alignment and flag any gaps, design errors, or scope creep.

Specifically check and report on the following checklist:
1. **Conflict Validation Engine:**
   - Does the FRD define clear algorithms to detect and prevent: Trainer double booking, Classroom double booking, Batch overlap, and Holiday date conflicts?
2. **Entity Consistency:**
   - Are the models `BusinessCalendar`, `Holiday`, `ScheduleSession`, and `VenueBlock` defined with fields aligning with Section 15 of the ER Model?
3. **Availability Check Integration:**
   - Does it explicitly integrate with the Faculty / Trainer module availability records (`TrainerAvailability`) during session creation?
4. **Soft Deletes:**
   - Are hard deletes strictly prohibited, with logical archival and status changes mapped to audit logs?
5. **Branch Isolation:**
   - Are all endpoints, timetables, and calendar views scoped strictly using a `branchId` context to ensure data isolation?

For any gaps identified, please write out the exact Gaps list and suggest the precise markdown replacements to make the FRD 100% compliant.
```
