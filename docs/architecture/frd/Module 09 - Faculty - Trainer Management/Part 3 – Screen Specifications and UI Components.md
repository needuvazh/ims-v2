# Part 3 – Screen Specifications and UI Components

## Module 09 – Faculty / Trainer Management

## 1. Purpose

This document defines the implementation-ready screen inventory, detailed screen behavior, UI components, validation rules, dynamic states, access-control behavior, and bilingual English/Arabic rendering rules for Module 09 – Faculty / Trainer Management.

The current ASTI IMS application strategy is a single dense, data-rich Admin Portal. Trainer self-service and Student Portal trainer-management functions are outside the current implementation scope. The Admin Portal consumes Trainer Management capabilities while preserving bounded-context ownership: Person identity is sourced from the shared Party/Person capability; Course references come from Course Catalog; Batch and Session assignment references are read from Training Delivery; schedule conflict decisions remain owned by Scheduling; qualification evidence status is read from Document Management; audit history is read from Audit & Compliance.

All user-visible operational dates and times use Oman GST (UTC+4) by default. Branch isolation and permission checks are enforced on the server; UI hiding is an additional usability measure and is never the security boundary.

---

# 2. UX Architecture Principles

## 2.1 Dense Data-Rich Admin Layout

All Module 09 Admin Portal screens shall use the following visual structure unless a screen-specific exception is stated:

```text
+----------------------------------------------------------------------------------+
| Global Header: App Switcher | Branch Context | Search | Language | User Menu      |
+----------------------+-----------------------------------------------------------+
| Left Navigation      | Page Header                                               |
| Faculty / Trainers   | Title | Breadcrumb | Status Context | Primary Actions     |
|                      +-----------------------------------------------------------+
|                      | KPI / Context Strip or Filter Toolbar                     |
|                      +-----------------------------------------------------------+
|                      | Main 12-column Content Grid                               |
|                      | Tables / Detail Panels / Forms / Side Drawers             |
|                      +-----------------------------------------------------------+
|                      | Pagination / Sticky Action Footer where applicable         |
+----------------------+-----------------------------------------------------------+
```

### Grid Rules

- Desktop width at or above 1440 px: 12-column content grid, 24 px page gutter, 16 px grid gap.
- Desktop width 1024–1439 px: 12-column grid, 20 px page gutter, 12 px grid gap.
- Tablet width 768–1023 px: 8-column grid; secondary panels stack below primary content.
- Width below 768 px: 4-column layout; dense tables use horizontal scroll with sticky first column and action menu.
- Forms use a maximum content width of 1120 px in a 12-column page grid.
- Standard form fields span 6 columns on desktop; long text fields span 12 columns; short enumerations may span 3 or 4 columns.
- Detail pages use an 8-column main region and 4-column context sidebar on wide desktop.
- Data tables use compact row density by default: 40–44 px body rows and 44–48 px header rows.
- Primary page actions remain visible at the right side of the page header in English and the left side in Arabic.

## 2.2 Shared Interaction Conventions

- Primary actions use explicit verbs: `Create Trainer`, `Save Changes`, `Activate`, `Suspend`, `Add Qualification`, `Add Availability`, `Authorize Course`, `Add Rate`.
- Destructive or history-altering actions require confirmation and reason capture where specified by business rules.
- Row actions appear in a kebab menu unless the action is the table's primary workflow action.
- Filter state is represented in the URL query string to support refresh, bookmarking, and browser navigation.
- Table sort state uses one active primary sort and optional server-supported secondary stable sort by `trainerCode` or record ID.
- Default page size is 25; allowed page sizes are 25, 50, and 100. Page size shall never exceed 100.
- Dates are displayed in `DD MMM YYYY` format in English and locale-appropriate Arabic digits/labels according to the user's locale configuration; persisted and exchanged timestamps remain ISO 8601.
- Times are displayed in the user's selected 12-hour or 24-hour application preference, while availability validation uses normalized local Oman time values.

---

# 3. Screen Inventory

## 3.1 Admin Portal Screens

| Screen ID  | Screen Name                             | Route Pattern                                      | Primary Permission                    | Purpose                                                                                             |
| ---------- | --------------------------------------- | -------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| FTM-UI-001 | Trainer Directory                       | `/faculty/trainers`                                | `trainer.read`                        | Search, filter, sort, and inspect branch-scoped trainers.                                           |
| FTM-UI-002 | Create Trainer Profile                  | `/faculty/trainers/new`                            | `trainer.create`                      | Link an existing Person or create/link canonical Person data and create TrainerProfile.             |
| FTM-UI-003 | Trainer Profile Overview                | `/faculty/trainers/{trainerId}`                    | `trainer.read`                        | Consolidated trainer operational summary and navigation hub.                                        |
| FTM-UI-004 | Edit Trainer Profile                    | `/faculty/trainers/{trainerId}/edit`               | `trainer.update`                      | Edit TrainerProfile-owned attributes with optimistic concurrency.                                   |
| FTM-UI-005 | Trainer Status Management               | Modal/drawer from profile                          | `trainer.status.manage`               | Perform controlled status transitions with reason and impact awareness.                             |
| FTM-UI-006 | Qualifications Tab                      | `/faculty/trainers/{trainerId}?tab=qualifications` | `trainer.qualification.read`          | View and manage structured qualifications and document evidence references.                         |
| FTM-UI-007 | Qualification Create/Edit Drawer        | Context drawer                                     | `trainer.qualification.manage`        | Add or update qualification details and link evidence document.                                     |
| FTM-UI-008 | Availability Tab                        | `/faculty/trainers/{trainerId}?tab=availability`   | `trainer.availability.read`           | View recurring branch-aware availability and effective periods.                                     |
| FTM-UI-009 | Availability Create/Edit Drawer         | Context drawer                                     | `trainer.availability.manage`         | Add or update an availability window with overlap validation.                                       |
| FTM-UI-010 | Course Authorizations Tab               | `/faculty/trainers/{trainerId}?tab=authorizations` | `trainer.authorization.read`          | View and manage trainer-course authorization periods and statuses.                                  |
| FTM-UI-011 | Course Authorization Create/Edit Drawer | Context drawer                                     | `trainer.authorization.manage`        | Create authorization and perform valid lifecycle changes.                                           |
| FTM-UI-012 | Compensation Rates Tab                  | `/faculty/trainers/{trainerId}?tab=compensation`   | `trainer.compensation.read`           | View sensitive compensation rate structures.                                                        |
| FTM-UI-013 | Compensation Rate Create/Edit Drawer    | Context drawer                                     | `trainer.compensation.manage`         | Configure effective-dated rate structures and specificity.                                          |
| FTM-UI-014 | Eligible Trainer Finder                 | `/faculty/eligible-trainers`                       | `trainer.eligibility.read`            | Find eligible trainers by course, branch, date, and time window.                                    |
| FTM-UI-015 | Assignment References Tab               | `/faculty/trainers/{trainerId}?tab=assignments`    | `trainer.read`                        | Read-only batch/session assignment references from Training Delivery.                               |
| FTM-UI-016 | Trainer Reports                         | `/faculty/reports`                                 | `trainer.report.view`                 | Operational trainer reports for authorized branch scope.                                            |
| FTM-UI-017 | Trainer Audit History                   | `/faculty/trainers/{trainerId}?tab=audit`          | `trainer.audit.read`                  | Review immutable sensitive change history.                                                          |
| FTM-UI-018 | Admin Portal Dashboard                  | `/faculty/dashboard`                               | `menu.faculty`, `trainer.report.view` | Trainer operational KPI landing page with drill-down access to directory, reports, and diagnostics. |

## 3.2 Trainer Portal Screens

Current scope: **No Trainer Portal screen is required for Module 09.**

The DDD and application scope define the Trainer as the subject of the managed record, not a current self-service user of this module. Future Trainer Portal capabilities such as self-maintained availability, qualification submission, or profile review shall require a separately approved FRD and must not be inferred from these Admin Portal specifications.

## 3.3 Student Portal Screens

Current scope: **No Student Portal screen is required for Module 09.**

Students do not create, update, authorize, schedule, or financially configure trainers. Any future student-facing display of instructor information belongs to the relevant course, enrollment, timetable, or learning experience capability and shall consume a safe public projection rather than expose TrainerProfile administration screens.

---

# 4. Shared UI Components

| Component ID | Component                  | Behavior                                                                                                                                    |
| ------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| FTM-CMP-001  | `TrainerStatusBadge`       | Displays Inactive, Active, Suspended using localized labels and semantic icons.                                                             |
| FTM-CMP-002  | `TrainerTypeBadge`         | Displays FullTime, PartTime, Freelance with localized labels.                                                                               |
| FTM-CMP-003  | `BranchScopeSelector`      | Shows only server-authorized branch choices; consolidated option appears only with valid visibility and `trainer.report.consolidated.view`. |
| FTM-CMP-004  | `EffectiveDateRangeFields` | Start/end date pair with cross-field validation and open-ended end date support.                                                            |
| FTM-CMP-005  | `PersonSearchSelector`     | Server search against canonical Person data; does not copy protected identity fields into TrainerProfile payload.                           |
| FTM-CMP-006  | `CourseSearchSelector`     | Server-side searchable Course Catalog reference selector.                                                                                   |
| FTM-CMP-007  | `AvailabilityWeekGrid`     | Seven-row weekday grid showing effective recurring windows; supports compact edit actions.                                                  |
| FTM-CMP-008  | `PermissionGuard`          | Hides or disables controls for usability; server still independently enforces authorization.                                                |
| FTM-CMP-009  | `SensitiveValueGuard`      | Prevents compensation content render and request when `trainer.compensation.read` is absent.                                                |
| FTM-CMP-010  | `AuditDiffViewer`          | Displays old/new values field-by-field without exposing protected Person values not present in trainer-owned records.                       |
| FTM-CMP-011  | `AssignmentImpactPanel`    | Read-only future batch/session reference summary before sensitive status or deletion actions.                                               |
| FTM-CMP-012  | `EligibilityResultPanel`   | Displays eligibility outcome, decision codes, matched availability, authorization state, and non-sensitive trainer summary.                 |
| FTM-CMP-013  | `DataTableToolbar`         | Search, filters, active filter chips, reset, column visibility, and export when allowed.                                                    |
| FTM-CMP-014  | `VersionConflictDialog`    | Handles optimistic concurrency conflict by offering reload and comparison; never overwrites silently.                                       |

---

# 5. Detailed Screen Specifications

## 5.1 FTM-UI-001 – Trainer Directory

### Purpose

Provide a branch-scoped, high-density operational register of trainers and the primary navigation point into trainer management.

### Layout and Grid Structure

```text
Row 1: Page title (8 cols) | Create Trainer action (4 cols)
Row 2: KPI strip: Total | Active | Suspended | Authorization Gaps
Row 3: Filter toolbar across 12 cols
Row 4: Trainer data table across 12 cols
Row 5: Pagination and result count
```

The KPI strip may be omitted for users without report permission; the table remains primary content.

### Interactive Elements

- `Create Trainer` button: visible only with `trainer.create`.
- Free-text search field.
- Branch selector.
- Trainer Type multi-select.
- Status multi-select.
- Course Authorization course selector.
- Effective-on date selector.
- `Apply Filters` and `Reset` buttons.
- Active filter chips with individual removal.
- Column visibility selector.
- Row click opens Trainer Profile Overview.
- Row kebab actions: View, Edit, Change Status, subject to permissions.

### Search and Filter Inputs

| Field        | Type          | Required | Validation                                                                                                                |
| ------------ | ------------- | -------: | ------------------------------------------------------------------------------------------------------------------------- |
| Search       | string        |       No | Trim whitespace; 2–100 characters when provided; search trainer code and allowed Person display name/contact projections. |
| Branch       | UUID selector |       No | Must be within server-authorized branch scope; client value cannot expand scope.                                          |
| Trainer Type | enum[]        |       No | Values limited to `FullTime`, `PartTime`, `Freelance`.                                                                    |
| Status       | enum[]        |       No | Values limited to `Inactive`, `Active`, `Suspended`.                                                                      |
| Course       | UUID selector |       No | Must resolve to an existing non-deleted Course reference.                                                                 |
| Effective On | date          |       No | ISO date input; interpreted using Oman business calendar.                                                                 |

### Table Columns

| Column              | Sortable |    Filterable | Notes                                                                        |
| ------------------- | -------: | ------------: | ---------------------------------------------------------------------------- |
| Trainer Code        |      Yes |        Search | Sticky first data column on narrow widths.                                   |
| Trainer Name        |      Yes |        Search | Localized Person display name; English/Arabic based on locale with fallback. |
| Trainer Type        |      Yes |           Yes | Badge.                                                                       |
| Primary Branch      |      Yes |           Yes | Display name from Organization context.                                      |
| Specialization      |      Yes |        Search | Truncated to two lines with tooltip.                                         |
| Status              |      Yes |           Yes | Status badge.                                                                |
| Effective Start     |      Yes |          Date | `DD MMM YYYY`.                                                               |
| Effective End       |      Yes |          Date | Blank rendered as `Open-ended` / localized equivalent.                       |
| Authorization Count |      Yes | Course filter | Count of currently effective active course authorizations.                   |
| Next Assignment     |      Yes |            No | Read-only nearest future assignment reference when available.                |
| Actions             |       No |            No | Permission-filtered row menu.                                                |

### Sorting, Filtering, and Paging

- Default sort: Trainer Name ascending, stable secondary sort by Trainer Code ascending.
- All sorting and filtering are server-side.
- Pagination uses page number and page size.
- Default page size: 25; options 25, 50, 100.
- Filter changes reset the page to 1.
- Result count shall show `Showing X–Y of Z` using localized ordering.

### Dynamic States

- Loading: table header remains visible; render 10 skeleton rows matching visible column structure.
- Empty initial state: `No trainers have been created in your branch scope.` Show Create Trainer action only when permitted.
- Empty filtered state: `No trainers match the selected filters.` Show `Reset Filters`.
- Error state: inline retry panel above table; retain filter values.
- Permission state: page returns access-denied view when `trainer.read` is absent; never render partial trainer data.

---

## 5.2 FTM-UI-002 – Create Trainer Profile

### Purpose

Create a TrainerProfile linked to one canonical Person without duplicating Person-owned identity fields.

### Layout and Grid Structure

```text
Page Header
12-column Form Card
  Section A: Person Linkage
  Section B: Trainer Classification
  Section C: Operational Affiliation
  Section D: Effective Period and Initial Status
Sticky Footer: Cancel | Save as Inactive | Create and Activate
```

### Interactive Elements

- Person mode segmented selector: `Link Existing Person` or `Create/Link Person` when the user is authorized to invoke the shared Person creation flow.
- Searchable Person selector.
- Trainer type selector.
- Primary branch selector.
- Effective date fields.
- Initial status selector.
- Save actions.

### Form Fields and Exact Validations

| Field                 | Type            |           Required | Validation                                                                                                                                                                              |
| --------------------- | --------------- | -----------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Person                | UUID reference  |                Yes | Must exist, be accessible through shared capability, not be soft-deleted, and not already be linked to a non-deleted TrainerProfile.                                                    |
| Trainer Code          | string          | System/conditional | When manually allowed: `^[A-Z0-9][A-Z0-9\-]{2,19}$`; 3–20 chars; uppercase normalization; unique among non-deleted trainer profiles. Prefer NumberingSeries generation when configured. |
| Trainer Type          | enum            |                Yes | `FullTime`, `PartTime`, `Freelance`.                                                                                                                                                    |
| Primary Branch        | UUID reference  |                Yes | Must be in actor's authorized write scope and resolve to active branch.                                                                                                                 |
| Specialization        | string          |                Yes | Trimmed; 2–500 chars; must contain at least one letter in English or Arabic; reject control characters.                                                                                 |
| Qualification Summary | textarea string |                 No | Maximum 1000 chars; trim leading/trailing whitespace; preserve internal line breaks; reject HTML markup.                                                                                |
| Effective Start Date  | date            |                Yes | Valid ISO calendar date.                                                                                                                                                                |
| Effective End Date    | date            |                 No | Must be greater than or equal to Effective Start Date.                                                                                                                                  |
| Initial Status        | enum            |                Yes | Only `Inactive` or `Active`; `Suspended` is forbidden as initial state.                                                                                                                 |

### Processing UI Behavior

- Person selection immediately checks duplicate trainer linkage.
- Active initial status shows an informational validation checklist for effective period validity.
- Submit sends the current form once; submit controls disable until response resolves.
- A server duplicate conflict maps to Person and Trainer Code fields as appropriate.

### Dynamic States

- Person search loading: dropdown skeleton rows.
- No Person results: show shared Person flow link only when authorized; otherwise explain that a Person record must first be created by an authorized user.
- Duplicate Person error: `This person is already linked to trainer profile {trainerCode}.`
- Numbering service failure: creation is blocked when automatic numbering is mandatory; show retryable form-level error.
- Permission hiding: no screen access without `trainer.create`.

---

## 5.3 FTM-UI-003 – Trainer Profile Overview

### Purpose

Provide the primary operational summary of one trainer and navigation to all authorized trainer subdomains.

### Layout and Grid Structure

```text
Header: Name + Trainer Code + Status Badge | Edit | Change Status
Main Grid:
  Left 8 cols: Summary cards and tab content
  Right 4 cols: Profile metadata, effective dates, assignment impact summary
Tabs:
  Overview | Qualifications | Availability | Authorizations | Compensation* |
  Assignments | Audit*
* permission controlled
```

### Overview Content

- Person display name and safe contact projection where actor is permitted by the Person boundary.
- Trainer Code.
- Trainer Type.
- Primary Branch.
- Specialization.
- Qualification Summary.
- Effective Start/End.
- Status.
- Current active authorization count.
- Current availability coverage summary.
- Next assignment references.

### Interactive Elements

- Edit Profile.
- Change Status.
- Tab navigation.
- `Find Eligibility` deep link with trainer preselected when permitted.
- Contextual `Add` actions inside tabs.

### Dynamic States

- Page skeleton preserves header, tab strip, main/detail column structure.
- 404 state for unknown or soft-deleted trainer.
- Branch-scope denial renders access-denied page indistinguishable in detail from unauthorized object access; do not reveal trainer existence.
- Compensation tab is not mounted, fetched, or shown without `trainer.compensation.read`.
- Audit tab is hidden without `trainer.audit.read`.

---

## 5.4 FTM-UI-004 – Edit Trainer Profile

### Purpose

Update TrainerProfile-owned fields while protecting Person ownership and concurrent updates.

### Fields

Editable fields:

| Field                 | Validation                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Trainer Type          | Enum: FullTime, PartTime, Freelance.                                                       |
| Primary Branch        | Active branch within actor write scope.                                                    |
| Specialization        | Required, trimmed, 2–500 chars, at least one English/Arabic letter, no control characters. |
| Qualification Summary | Optional, maximum 1000 chars, plain text only.                                             |
| Effective Start Date  | Required valid date.                                                                       |
| Effective End Date    | Optional; on or after start.                                                               |
| Version               | Hidden integer concurrency token; must equal current server version on update.             |

Person-owned name, Civil ID, passport, visa, email, phone, nationality, and date-of-birth fields are not editable here. Provide a contextual link to the Person-owning workflow when the user has appropriate access.

### Dynamic States

- Unsaved changes navigation guard.
- Version conflict opens `VersionConflictDialog` with options `Reload Latest` and `Cancel`; no force overwrite action is provided by default.
- Server validation errors map to fields and include business rule code.

---

## 5.5 FTM-UI-005 – Trainer Status Management

### Purpose

Perform valid operational status transitions with reason capture and assignment impact visibility.

### Layout

Right-side drawer, 480–560 px on desktop; full-screen sheet on mobile.

### Fields

| Field           | Type          |    Required | Validation                                                                                     |
| --------------- | ------------- | ----------: | ---------------------------------------------------------------------------------------------- |
| Current Status  | readonly enum |         Yes | Server value.                                                                                  |
| Target Status   | enum selector |         Yes | Options derived from allowed transition matrix only.                                           |
| Effective Date  | date          |         Yes | Valid date; must respect profile effective period.                                             |
| Reason          | textarea      | Conditional | Required for Active→Inactive, Active→Suspended, Suspended→Inactive; 10–1000 chars; plain text. |
| Acknowledgement | checkbox      | Conditional | Required when active/future assignment references are detected.                                |

### Allowed UI Transitions

| From      | Visible Target Options |
| --------- | ---------------------- |
| Inactive  | Active                 |
| Active    | Inactive, Suspended    |
| Suspended | Active, Inactive       |

### Dynamic States

- Assignment impact loading uses compact card skeletons.
- Blocking integrity issue disables confirmation and lists actionable resolution references.
- Same-state request is not offered as a transition action.
- Confirmation requires `trainer.status.manage`; without permission, status is read-only.

---

## 5.6 FTM-UI-006 – Qualifications Tab

### Layout

- 12-column tab region.
- Toolbar: title, evidence status filter, year range, Add Qualification.
- Compact table.

### Table Columns

| Column              | Sortable |                      Filterable |
| ------------------- | -------: | ------------------------------: |
| Qualification Name  |      Yes |                          Search |
| Institution         |      Yes |                          Search |
| Year Completed      |      Yes |                           Range |
| Evidence Document   |       No |                 Present/Missing |
| Verification Status |      Yes | Status from Document Management |
| Updated At          |      Yes |                            Date |
| Actions             |       No |                              No |

### Behaviors

- Default sort: Year Completed descending, then Qualification Name ascending.
- `Add Qualification` visible with `trainer.qualification.manage`.
- Edit and Soft Delete row actions visible with manage permission.
- Evidence verification status is read-only and must never be editable from this module.

---

## 5.7 FTM-UI-007 – Qualification Create/Edit Drawer

### Fields and Validation

| Field              | Type          | Required | Validation                                                                                                                      |
| ------------------ | ------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------- |
| Qualification Name | string        |      Yes | 2–200 chars; trimmed; at least one English or Arabic letter; no HTML.                                                           |
| Institution        | string        |      Yes | 2–200 chars; trimmed; no control characters.                                                                                    |
| Year Completed     | integer       |      Yes | Four-digit year; minimum 1900; maximum current Oman business calendar year. Regex for raw text input: `^(19\d{2}                | 20\d{2} | 21\d{2})$`, followed by business maximum-year check. |
| Evidence Document  | UUID selector |       No | Must reference an accessible Document record linked appropriately to the trainer/person according to Document Management rules. |

### Validation States

- Future year: `BR-FTM-011: Year completed cannot be later than the current Oman business year.`
- Invalid document link: field error with retry/reselect action.
- Soft delete confirmation: show qualification name and evidence link status; deletion is soft only.

---

## 5.8 FTM-UI-008 – Availability Tab

### Layout

```text
Toolbar: Effective-on Date | Branch Filter | Add Availability
Weekly Grid: Monday through Sunday rows
Below: Historical/Future availability table with date-range records
```

### Weekly Grid Columns

- Weekday.
- Branch.
- Start Time.
- End Time.
- Effective Start.
- Effective End.
- Effectiveness indicator.
- Actions.

### Interactive Elements

- Effective-on date control defaults to today's Oman date.
- Branch filter constrained to authorized scope.
- Add Availability button.
- Edit, Deactivate/End-Date, Soft Delete actions when permitted.

### Dynamic States

- Empty state: `No availability has been configured for this trainer.`
- Partial state: weekdays without windows show `Not configured` rather than `Unavailable`, because absence of configuration and explicit unavailability are not equivalent unless business policy defines them.
- Current-effective windows are visually emphasized by badge and icon, not color alone.

---

## 5.9 FTM-UI-009 – Availability Create/Edit Drawer

### Fields and Exact Validation

| Field                   | Type            | Required | Validation                                                        |
| ----------------------- | --------------- | -------: | ----------------------------------------------------------------- |
| Branch                  | UUID selector   |      Yes | Active branch in authorized write scope.                          |
| Day of Week             | enum            |      Yes | Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.   |
| Start Time              | time            |      Yes | `HH:mm`, 24-hour normalized input; must be earlier than End Time. |
| End Time                | time            |      Yes | `HH:mm`; must be later than Start Time.                           |
| Effective Start Date    | date            |      Yes | Valid date.                                                       |
| Effective End Date      | date            |       No | Must be on or after Effective Start Date.                         |
| Status / Active Control | boolean or enum |      Yes | Active/Inactive control according to persistence model.           |

### UI Algorithm Before Submit

1. Normalize day and time values in Oman timezone context.
2. Reject `startTime >= endTime`.
3. Explain that cross-midnight windows must be entered as two records.
4. Check date range validity.
5. Perform server overlap validation against same trainer, branch, weekday, effective-date intersection, and active status.
6. On overlap, display conflicting window details and do not save.

### Error Example

`BR-FTM-015: This availability window overlaps 09:00–13:00, effective 01 Sep 2026–31 Dec 2026, for Muscat branch.`

---

## 5.10 FTM-UI-010 – Course Authorizations Tab

### Layout

Toolbar with Course search, Status multi-select, Effective-on date, and `Authorize Course` action followed by compact table.

### Table Columns

| Column          | Sortable | Filterable |
| --------------- | -------: | ---------: |
| Course Code     |      Yes |     Search |
| Course Name     |      Yes |     Search |
| Status          |      Yes |        Yes |
| Effective Start |      Yes |       Date |
| Effective End   |      Yes |       Date |
| Effective Now   |      Yes |        Yes |
| Last Changed By |      Yes |         No |
| Last Changed At |      Yes |       Date |
| Actions         |       No |         No |

### State-Aware Actions

- Inactive: Activate.
- Active: Suspend, Deactivate, Expire where valid.
- Suspended: Reactivate, Deactivate, Expire where valid.
- Expired: View only; no Reactivate. New authorization action creates a new period.

---

## 5.11 FTM-UI-011 – Course Authorization Create/Edit Drawer

### Fields and Validation

| Field                | Type          |    Required | Validation                                                                            |
| -------------------- | ------------- | ----------: | ------------------------------------------------------------------------------------- |
| Course               | UUID selector |         Yes | Must resolve to existing Course Catalog course.                                       |
| Effective Start Date | date          |         Yes | Valid date.                                                                           |
| Effective End Date   | date          |          No | On or after start.                                                                    |
| Initial Status       | enum          |         Yes | Inactive or Active for new authorization; transition actions govern existing records. |
| Transition Reason    | textarea      | Conditional | Required for suspension and other rule-governed transitions; 10–1000 chars.           |

### Processing Behavior

- Server checks overlapping active effective periods for same trainer/course.
- Expired authorization is immutable for reactivation purposes; UI directs user to `Create New Authorization Period`.
- Course selector excludes archived/unavailable courses when Course Catalog policy marks them non-authorizable.

---

## 5.12 FTM-UI-012 – Compensation Rates Tab

### Security Requirement

This tab is absent from navigation and no compensation API request is made unless the actor has `trainer.compensation.read`.

### Layout

- Sensitive-data banner indicating permission-restricted configuration.
- Filters: Payment Basis, Effective-on Date, Specificity.
- Add Rate action with `trainer.compensation.manage`.
- Dense table.

### Table Columns

| Column            | Sortable | Filterable | Notes                                                                       |
| ----------------- | -------: | ---------: | --------------------------------------------------------------------------- |
| Payment Basis     |      Yes |        Yes | Per Hour, Per Session, Per Student, Fixed.                                  |
| Amount            |      Yes |      Range | Currency formatting; currency sourced from institute/finance configuration. |
| Specificity       |      Yes |        Yes | Session, Batch, Trainer.                                                    |
| Batch Reference   |      Yes |     Search | Optional.                                                                   |
| Session Reference |      Yes |     Search | Optional.                                                                   |
| Effective Start   |      Yes |       Date | Required.                                                                   |
| Effective End     |      Yes |       Date | Optional.                                                                   |
| Status            |      Yes |        Yes | Effective/Inactive indicator.                                               |
| Actions           |       No |         No | Manage permission required.                                                 |

### Dynamic States

- Unauthorized: tab hidden; direct route returns access denied.
- Empty: `No compensation rate structures are configured for this trainer.`
- Sensitive values shall not appear in generic trainer list exports or browser logs.

---

## 5.13 FTM-UI-013 – Compensation Rate Create/Edit Drawer

### Fields and Exact Validation

| Field                | Type           |    Required | Validation                                                                                                                                                      |
| -------------------- | -------------- | ----------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Payment Basis        | enum           |         Yes | `PerHour`, `PerSession`, `PerStudent`, `Fixed`.                                                                                                                 |
| Amount               | decimal        |         Yes | Greater than 0; maximum 999999999.999; precision and display rounding follow configured financial precision; reject scientific notation. Regex precheck: `^(?:0 | [1-9]\d{0,8})(?:\.\d{1,3})?$`, followed by `amount > 0`. |
| Specificity          | enum           |         Yes | Trainer, Batch, Session.                                                                                                                                        |
| Batch                | UUID reference | Conditional | Required for Batch specificity; must reference a valid relevant batch.                                                                                          |
| Session              | UUID reference | Conditional | Required for Session specificity; must reference valid session; session's batch context must be consistent.                                                     |
| Effective Start Date | date           |         Yes | Valid date.                                                                                                                                                     |
| Effective End Date   | date           |          No | On or after start.                                                                                                                                              |
| Remarks              | textarea       |          No | Maximum 1000 chars; plain text.                                                                                                                                 |

### Specificity UI Rules

- Trainer specificity: hide and clear Batch and Session fields.
- Batch specificity: require Batch; hide and clear Session.
- Session specificity: require Session and display read-only parent Batch reference after session selection.
- Server prevents ambiguous overlapping applicable rates at the same specificity, trainer, payment basis, and intersecting effective range.

### Error State

`BR-FTM-027: Another Per Hour Batch-specific rate is already effective for this trainer and batch during the selected period.`

---

## 5.14 FTM-UI-014 – Eligible Trainer Finder

### Purpose

Allow Training Coordinators and Academic Coordinators to find trainers satisfying trainer-owned eligibility conditions for a proposed delivery slot.

### Layout and Grid

```text
Search Criteria Card: 12 cols
  Course 4 | Branch 4 | Date 4
  Start Time 3 | End Time 3 | Search 3 | Reset 3
Results Summary Strip
Eligible Trainer Table
Optional Eligibility Detail Drawer
```

### Inputs and Exact Validation

| Field      | Type          | Required | Validation                                     |
| ---------- | ------------- | -------: | ---------------------------------------------- |
| Course     | UUID selector |      Yes | Existing Course reference.                     |
| Branch     | UUID selector |      Yes | Within authorized operational branch scope.    |
| Date       | date          |      Yes | Valid date.                                    |
| Start Time | time          |      Yes | Earlier than End Time.                         |
| End Time   | time          |      Yes | Later than Start Time; same-day interval only. |

### Eligibility Result Columns

- Trainer Code.
- Trainer Name.
- Trainer Type.
- Primary Branch.
- Authorization Status.
- Availability Match.
- Effective Profile Status.
- Next Assignment indicator/reference where available.
- `View Details` action.

### Processing Display

The UI shall present trainer eligibility checks in this order:

1. Trainer profile is non-deleted.
2. Trainer profile status is Active.
3. Profile effective period covers target date.
4. Branch compatibility passes according to configured assignment policy.
5. Active effective TrainerCourseAuthorization covers course/date.
6. Requested interval is fully contained inside an effective availability window.
7. Scheduling double-booking is not claimed as a Trainer Management result; where Scheduling integration is invoked, show its result as a separately labeled `Schedule Conflict Check`.

### Dynamic States

- Criteria incomplete: search disabled with field hints.
- Search loading: result table skeleton.
- No eligible trainers: explain filters and show counts of rejection categories only when the API contract safely provides aggregate decision counts.
- Partial downstream failure: if Schedule conflict service is unavailable but trainer-owned eligibility succeeded, clearly label results `Trainer eligibility evaluated; schedule conflict status unavailable` and prevent assignment confirmation in the owning Training Delivery flow when required.

---

## 5.15 FTM-UI-015 – Assignment References Tab

### Purpose

Display read-only BatchTrainer and Session references without duplicating assignment ownership.

### Layout

Two subtabs:

- Batch Assignments.
- Session Assignments.

### Batch Assignment Table

| Column        | Sort | Filter |
| ------------- | ---: | -----: |
| Batch Code    |  Yes | Search |
| Course        |  Yes | Search |
| Branch        |  Yes |    Yes |
| Role          |  Yes |    Yes |
| Assigned From |  Yes |   Date |
| Assigned To   |  Yes |   Date |
| Status        |  Yes |    Yes |

### Session Assignment Table

| Column         | Sort | Filter |
| -------------- | ---: | -----: |
| Session Number |  Yes | Search |
| Batch Code     |  Yes | Search |
| Course         |  Yes | Search |
| Session Date   |  Yes |   Date |
| Start Time     |  Yes |     No |
| End Time       |  Yes |     No |
| Classroom      |  Yes | Search |
| Status         |  Yes |    Yes |

No create, edit, reassignment, or delete control is available in this tab. Deep links to owning Training Delivery/Scheduling screens may be shown only when the actor has access to those modules.

---

## 5.16 FTM-UI-016 – Trainer Reports

### Purpose

Provide permission-controlled operational reports and exports within authorized branch scope.

### Report Sections

- Trainer Roster.
- Authorization Coverage.
- Qualification Coverage.
- Availability Coverage.
- Compensation Configuration Coverage, only when compensation read permission is granted.

### Layout

```text
Page Header | Export button
Filter Bar: Branch | Date/Effective Date | Trainer Type | Status | Course
Report Tabs
KPI Summary Row
Dense Report Table
Pagination
```

### Filters

- Branch: authorized set only.
- Consolidated scope: shown only with `trainer.report.consolidated.view` and allowed branch visibility.
- Effective-on date.
- Trainer Type.
- Status.
- Course where applicable.

### Export Behavior

- Export action requires `trainer.report.export`.
- Export request uses current server-side filters and sort, not only current page rows.
- Export must honor the same branch and sensitive-field permissions as interactive views.
- Compensation columns are excluded unless `trainer.compensation.read` is also granted.
- Export generation failure presents retry action; no silent background promise is shown in UI specification.

---

## 5.17 FTM-UI-017 – Trainer Audit History

### Purpose

Provide immutable audit visibility for authorized auditors and administrators.

### Layout

- Filter toolbar.
- Chronological table, newest first.
- Side drawer diff viewer.

### Filters

| Field       | Type                    | Validation                                                                                                      |
| ----------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Action      | enum/multi-select       | Values supplied by audit projection.                                                                            |
| Entity Type | enum                    | TrainerProfile, TrainerQualification, TrainerAvailability, TrainerCourseAuthorization, TrainerCompensationRate. |
| Actor       | user reference selector | Accessible IAM user projection.                                                                                 |
| Date From   | datetime/date           | Must be on or before Date To.                                                                                   |
| Date To     | datetime/date           | Must be on or after Date From.                                                                                  |

### Table Columns

- Performed At.
- Actor.
- Action.
- Entity Type.
- Entity Reference.
- Reason indicator.
- IP availability indicator.
- View Changes.

### Diff Drawer

Displays:

- Field name.
- Previous value.
- New value.
- Actor.
- Timestamp.
- Reason.
- Correlation reference where available.

Protected Person identity values shall not be reconstructed or exposed through trainer audit views.

---

## 5.18 FTM-UI-018 – Admin Portal Dashboard

### Purpose

Provide the trainer management landing page for operational oversight, KPI monitoring, and drill-down navigation into the trainer directory and report surfaces.

### Layout and Grid Structure

```text
Page Header | Branch and date filters
12-column dashboard grid
  Metric summary cards
  Trend and coverage charts
  Attention tables and diagnostics
Sticky filter bar below the header
```

### Global Filters

- Branch selector: active branch by default; consolidated mode only with `trainer.report.consolidated.view`.
- Effective date: Oman business date default.
- Date range: capped at 366 days unless privileged reporting access allows a wider range.
- Trainer type: FullTime, PartTime, Freelance.
- Status.
- Course.
- Specialization.

### Primary Widgets

- Active Trainers.
- Availability Coverage.
- Courses Without Authorized Trainer.
- Qualification Exceptions.
- Compensation Coverage, only when compensation read access exists.
- Eligibility Rejection Rate.
- Trainer Mix by Type.
- Active Trainer Trend.
- Utilization Distribution.
- Authorization Coverage by Course.
- Qualification Evidence Status.
- Eligibility Rejection Reasons.
- Trainers Requiring Attention.
- Upcoming Authorization Expiry.
- High Utilization Reference.

### Interactive Elements

- Clicking KPI cards opens the matching filtered directory or report surface.
- Charts support drill-down to the relevant report or list view when permission allows it.
- Attention tables open the trainer directory, trainer profile, or report detail as appropriate.

### Dynamic States

- Loading: preserve header, filters, and widget geometry while rendering skeletons.
- Empty: show no-data messaging per widget family rather than a blank canvas.
- Permission state: hide widgets and drill-downs when the associated permission is absent.
- Downstream unavailable: show dependency-specific unavailable messaging and prevent misleading zero-value aggregation.

---

# 6. Dynamic UI State Specification

## 6.1 Form Validation Error States

### Validation Timing

1. Required-field validation occurs on blur and submit.
2. Format validation occurs on blur and submit.
3. Cross-field date/time validation runs when either dependent field changes after both are populated.
4. Domain uniqueness and overlap validation runs server-side on submit and may also run as a debounced advisory precheck.
5. The submit result is authoritative; advisory prechecks never guarantee acceptance.

### Error Presentation

Each invalid field shall show:

- error icon;
- localized human-readable message;
- business rule code when domain validation applies;
- `aria-describedby` relationship between input and error text;
- invalid state announced to screen readers.

Example:

```text
Effective End Date
[ 15 Aug 2026 ]
! BR-FTM-009: End date must be on or after 20 Aug 2026.
```

### Form-Level Error Summary

For forms with more than one invalid field, show a top summary:

```text
We could not save this record. Correct 3 fields below.
- Effective End Date
- Start Time
- End Time
```

Each summary entry focuses the failing control.

## 6.2 Loading Skeletons

| UI Type                | Skeleton Requirement                                                      |
| ---------------------- | ------------------------------------------------------------------------- |
| Directory/Report Table | Preserve header and render 10 skeleton rows.                              |
| Profile Overview       | Preserve profile header, 3 summary blocks, sidebar blocks, and tab strip. |
| Drawer Form            | Preserve label and input geometry; do not show fake values.               |
| Search Selector        | 5 option-row skeletons with consistent dropdown height.                   |
| Audit Diff             | 6 field comparison rows.                                                  |
| Eligibility Results    | Criteria card remains interactive-disabled; 8 result rows.                |

Skeletons shall not animate indefinitely after an error. Transition to explicit retry/error state.

## 6.3 Empty States

Empty states shall distinguish:

1. **No records exist** – offer create action when permitted.
2. **No filter matches** – offer Reset Filters.
3. **No permission** – do not present as an empty dataset; show access denial or hide the capability.
4. **Not configured** – for availability or compensation, explicitly use configuration language rather than implying zero/unavailable.
5. **Downstream unavailable** – show dependency-specific unavailable state, not `No data`.

## 6.4 Permission-Based Element Hiding

| Permission                         | UI Behavior When Missing                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `trainer.read`                     | Trainer directory and profile routes inaccessible.                                         |
| `trainer.create`                   | Create Trainer button and route hidden/inaccessible.                                       |
| `trainer.update`                   | Edit Profile button hidden; fields remain read-only.                                       |
| `trainer.status.manage`            | Change Status action hidden.                                                               |
| `trainer.qualification.read`       | Qualifications tab hidden.                                                                 |
| `trainer.qualification.manage`     | Add/Edit/Delete qualification controls hidden; read-only tab remains with read permission. |
| `trainer.availability.read`        | Availability tab hidden.                                                                   |
| `trainer.availability.manage`      | Availability mutation controls hidden.                                                     |
| `trainer.authorization.read`       | Authorizations tab hidden.                                                                 |
| `trainer.authorization.manage`     | Authorization mutation controls hidden.                                                    |
| `trainer.compensation.read`        | Compensation tab, amounts, filters, and network requests omitted.                          |
| `trainer.compensation.manage`      | Rate mutation controls hidden while read remains available.                                |
| `trainer.eligibility.read`         | Eligible Trainer Finder navigation and route inaccessible.                                 |
| `trainer.report.view`              | Reports and dashboard navigation hidden.                                                   |
| `trainer.report.export`            | Export controls hidden.                                                                    |
| `trainer.audit.read`               | Audit tab hidden and route inaccessible.                                                   |
| `trainer.report.consolidated.view` | Consolidated scope option hidden; branch-level reporting remains constrained.              |

### Security Note

Permission-based hiding is for usability. Every route handler, server action, service method, and query must independently enforce permission and branch scope.

## 6.5 Save, Success, and Failure States

- While saving: disable duplicate submit, show progress indicator inside primary action, retain form data.
- Success: show localized toast and navigate or refresh according to workflow.
- Validation failure: stay on form; focus summary or first invalid field.
- Authorization failure: show access-denied response; do not keep retrying automatically.
- Concurrency failure: show Version Conflict dialog.
- Referential/domain failure: show business-rule error and affected reference.
- Unknown server failure: show correlation reference when safe and a Retry action.

## 6.6 Soft Delete Confirmation State

For supported trainer-owned child records:

```text
Title: Remove qualification record?
Body: This removes the record from normal trainer views and eligibility-related queries where applicable. The record remains retained for audit history.
Record: NEBOSH International General Certificate
Action: Cancel | Remove Record
```

For TrainerProfile deletion attempts with active/future assignments, deletion is blocked and assignment references are shown. Hard-delete language shall never be used.

---

# 7. Bilingual English/Arabic Layout Rules

## 7.1 Direction and Mirroring

### English

- Document direction: `ltr`.
- Left navigation is anchored to left side.
- Breadcrumb starts left.
- Primary page actions align right.
- Drawer opens from right by default.
- Table sticky first identifier column anchors left.
- Chevron progression points right for forward navigation.

### Arabic

- Document direction: `rtl` at the application content root.
- Primary navigation mirrors to the right side.
- Breadcrumb starts right.
- Primary page actions align left.
- Context drawers mirror and open from left.
- Sticky first logical identifier column anchors right.
- Directional chevrons mirror.
- Icon-only controls whose meaning is directional must mirror; semantic icons such as edit, delete, calendar, search, status, and download do not mirror.

## 7.2 Text Alignment Rules

- Labels, headings, descriptive text, validation messages, and empty-state text follow locale direction.
- Trainer codes, course codes, email addresses, URLs, UUID fragments, currency codes, and technical identifiers render in LTR isolation even inside Arabic layouts.
- Mixed English/Arabic Person names use Unicode bidi isolation around each data value.
- Numbers inside tables use locale formatting according to product locale policy, but underlying sorting remains numeric/date-based rather than lexical.

## 7.3 Field Ordering

For paired fields in English:

```text
Effective Start Date | Effective End Date
Start Time           | End Time
```

For Arabic, the logical reading order is mirrored while field semantics remain unchanged:

```text
Effective Start Date <logical first at right> | Effective End Date <left>
Start Time <right>                             | End Time <left>
```

DOM/tab order shall follow the locale's logical reading order and remain keyboard predictable.

## 7.4 Tables in RTL

- Table column order is mirrored for presentation when the design system supports logical column ordering.
- The logical primary identifier remains the first reading column.
- Numeric amount columns remain end-aligned using CSS logical alignment.
- Row action menus appear at the logical end of the row.
- Horizontal scroll starts at the logical beginning.
- Sort icons appear adjacent to localized header text on the logical end side.

## 7.5 Forms and Drawers in RTL

- Required markers remain adjacent to labels on the logical end side.
- Validation icons and text follow Arabic flow.
- Input prefixes/suffixes use CSS logical properties rather than fixed left/right positioning.
- Time and code inputs may use `dir="ltr"` while labels and supporting text remain RTL.
- Currency amount input keeps numeric entry direction LTR for reliable decimal entry, while currency label placement follows locale layout.

## 7.6 Localized Values and Fallback

- Shared Person display name uses Arabic localized value in Arabic UI when available.
- If Arabic localized value is absent, English value is displayed with proper LTR isolation; do not create duplicate TrainerProfile name fields.
- Branch and Course names use their owning context's localized projection.
- Enum labels shall be localized, while API/domain enum values remain stable and language-neutral.
- Status badges use localized text plus icon/shape; color alone is insufficient.

## 7.7 Date, Time, and Timezone

- Operational dates and times default to Oman GST (UTC+4).
- UI labels shall make timezone context explicit on scheduling-sensitive screens: `Oman Time (GST, UTC+4)` and localized Arabic equivalent.
- Availability weekday evaluation is based on Oman local weekday.
- Cross-midnight availability remains represented as two records, regardless of UI locale.
- Date parsing must not infer month/day order from ambiguous free text; use controlled date picker/input.

---

# 8. Responsive and Accessibility Requirements

## 8.1 Keyboard Access

- All actions must be keyboard reachable.
- Focus order follows visual/logical reading order for current locale.
- Drawers trap focus while open and return focus to invoking control on close.
- Table row menus are keyboard operable.
- Escape closes non-destructive overlays after unsaved-change checks.

## 8.2 Screen Reader Semantics

- Tables use proper headers and announced sort state.
- Tabs use `tablist`, `tab`, and `tabpanel` semantics.
- Status changes are announced through polite live region.
- Validation summary uses focusable alert region.
- Skeletons are hidden from accessibility tree and loading region exposes textual loading status.

## 8.3 Color and Status

- Status is communicated by text and icon in addition to color.
- Focus rings must remain visible in both LTR and RTL layouts.
- Disabled actions must provide explanatory tooltip only when the user has permission but a business condition blocks the action. Actions hidden by lack of permission should not advertise inaccessible capabilities.

---

# 9. Screen-to-Requirement Traceability

| Screen                              | Functional Requirements Covered                            |
| ----------------------------------- | ---------------------------------------------------------- |
| FTM-UI-001 Trainer Directory        | FR-FTM-001, FR-FTM-019                                     |
| FTM-UI-002 Create Trainer Profile   | FR-FTM-002, FR-FTM-018, FR-FTM-019, FR-FTM-020             |
| FTM-UI-003 Trainer Profile Overview | FR-FTM-003, FR-FTM-015, FR-FTM-019                         |
| FTM-UI-004 Edit Trainer Profile     | FR-FTM-004, FR-FTM-018, FR-FTM-020                         |
| FTM-UI-005 Status Management        | FR-FTM-005, FR-FTM-015, FR-FTM-018, FR-FTM-020             |
| FTM-UI-006/007 Qualifications       | FR-FTM-006, FR-FTM-016, FR-FTM-018                         |
| FTM-UI-008/009 Availability         | FR-FTM-007, FR-FTM-008, FR-FTM-014, FR-FTM-016, FR-FTM-018 |
| FTM-UI-010/011 Authorizations       | FR-FTM-009, FR-FTM-016, FR-FTM-018, FR-FTM-020             |
| FTM-UI-012/013 Compensation         | FR-FTM-011, FR-FTM-012, FR-FTM-016, FR-FTM-018             |
| FTM-UI-014 Eligible Trainer Finder  | FR-FTM-010, FR-FTM-013, FR-FTM-014, FR-FTM-019             |
| FTM-UI-015 Assignment References    | FR-FTM-015, FR-FTM-019                                     |
| FTM-UI-016 Trainer Reports          | FR-FTM-017, FR-FTM-019                                     |
| FTM-UI-017 Audit History            | FR-FTM-018, FR-FTM-019                                     |
| FTM-UI-018 Admin Portal Dashboard   | FR-FTM-017, FR-FTM-019                                     |

---

# 10. UI Business Rule Enforcement Matrix

| Rule       | UI Enforcement                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------- |
| BR-FTM-001 | Person selector flags already-linked Person; server remains authoritative.                        |
| BR-FTM-003 | Trainer Code format and duplicate conflict are surfaced during creation.                          |
| BR-FTM-004 | Trainer Type selectors expose only supported values.                                              |
| BR-FTM-006 | Status drawer exposes only allowed target states.                                                 |
| BR-FTM-007 | Create form excludes Suspended initial state.                                                     |
| BR-FTM-009 | Shared effective date component validates end ≥ start.                                            |
| BR-FTM-011 | Qualification year maximum follows current Oman business year.                                    |
| BR-FTM-014 | Availability drawer rejects same-time, reverse-time, and cross-midnight single records.           |
| BR-FTM-015 | Overlap conflict displays conflicting availability record.                                        |
| BR-FTM-020 | Authorization create/edit displays overlapping effective authorization error.                     |
| BR-FTM-021 | Expired authorization is shown ineffective and cannot be reactivated.                             |
| BR-FTM-024 | Compensation basis exposes exactly four supported values.                                         |
| BR-FTM-025 | Amount requires positive configured-precision decimal value.                                      |
| BR-FTM-026 | Compensation tab and API access are separately permission guarded.                                |
| BR-FTM-027 | Ambiguous same-specificity rate overlap is blocked with conflict message.                         |
| BR-FTM-028 | Rate resolution detail, when shown, labels selected specificity order: Session → Batch → Trainer. |
| BR-FTM-030 | Trainer deletion attempt with active/future references is blocked with impact panel.              |
| BR-FTM-031 | UI uses soft remove/deactivate language and provides no hard-delete path.                         |
| BR-FTM-034 | Branch selector options are authorization-scoped and server queries remain scoped.                |
| BR-FTM-035 | Manually altered branch parameters do not grant access; server denial is rendered safely.         |
| BR-FTM-036 | Consolidated reporting option appears only with combined permission and branch visibility.        |
| BR-FTM-037 | Edit screen carries version token and handles conflict explicitly.                                |
| BR-FTM-038 | Person-owned fields are read-only in TrainerProfile edit UI.                                      |
| BR-FTM-039 | Assignment tab is read-only with links to owning context.                                         |
| BR-FTM-041 | Document verification status is read-only in qualification UI.                                    |
| BR-FTM-044 | Person localized display values come from shared Person projection.                               |
| BR-FTM-045 | Dates and times display in Oman GST by default.                                                   |

---

# 11. Implementation Acceptance Checklist

The Module 09 UI implementation is acceptable only when all of the following are true:

1. Every screen listed for the Admin Portal has an implemented access policy and branch-scoping behavior.
2. No Student or Trainer Portal self-service screen is introduced under this module without separate approved scope.
3. TrainerProfile screens do not duplicate editable Person-owned identity fields.
4. Compensation content is neither rendered nor requested without explicit compensation read permission.
5. All tables use server-side filtering, sorting, and pagination with a maximum page size of 100.
6. Forms implement exact field constraints in this document and display domain business-rule codes for server domain validation failures.
7. Status and authorization actions expose only valid transitions.
8. Availability UI prevents invalid time bounds and clearly surfaces server-detected overlap conflicts.
9. Effective date ranges are validated consistently across profile, availability, authorization, and compensation workflows.
10. Optimistic concurrency conflicts never silently overwrite newer values.
11. Soft-delete workflows never expose hard-delete behavior.
12. Assignment references remain read-only and visibly owned by Training Delivery/Scheduling flows.
13. Document verification state remains read-only in Trainer Management.
14. English LTR and Arabic RTL layouts mirror correctly using logical CSS properties, while codes and technical values remain directionally isolated.
15. Oman GST (UTC+4) is used for scheduling-sensitive date/time presentation and weekday evaluation.
16. Loading, empty, filtered-empty, error, access-denied, and downstream-unavailable states are visually and semantically distinct.
17. UI permission hiding is complemented by server-side authorization for every read and write.
18. Audit history is visible only to explicit audit readers and does not reconstruct protected Person identity data.
19. All core actions are keyboard accessible and form errors are screen-reader associated.
20. Screen implementation remains aligned with FR-FTM-001 through FR-FTM-020 and BR-FTM-001 through BR-FTM-045 without crossing bounded-context ownership.
