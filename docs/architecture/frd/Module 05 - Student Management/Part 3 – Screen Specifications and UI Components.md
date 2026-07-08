# Part 3 – Screen Specifications and UI Components

## Module 5 – Student Management

## 1. Purpose

This document defines the screen inventory, layout rules, data grids, form controls, input validations, UI states, and bilingual rendering behavior for **Module 5 – Student Management**. It is aligned to the student master ownership boundary established in Module 5 and assumes:

- Student Management owns `StudentProfile` administration and identity resolution.
- Shared `Party` / `Person` data is reused; it is not duplicated.
- All learning journeys eventually link to the central `Enrollment` aggregate.
- Server-side branch scoping is mandatory.
- Soft delete, effective dating, and audit visibility apply to sensitive actions.
- The UI must support English (LTR) and Arabic (RTL).

The UI style for this module is a **dense, data-rich admin portal** optimized for operations teams, with compact filters, high-information tables, side drawers for quick actions, and detail pages for full lifecycle review.

---

## 2. Portal Applicability Summary

| Portal         | Applicability       | Scope in Current Module                                                                                                |
| -------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Admin Portal   | In scope            | Full CRUD, search, duplicate resolution, status changes, ID card control, archive/restore, merge, audit review, export |
| Student Portal | In scope, read-only | Read-only self-profile and enrollment-linked identity visibility; no master-data edit ownership in current phase       |
| Trainer Portal | Limited             | Read-only student roster and student quick profile context during delivery workflows; no student master maintenance    |

---

## 3. Screen Inventory

## 3.1 Admin Portal Screen Inventory

| Screen Code | Screen Name                                                 | Type                       | Primary Actors                                                                                              | Required |
| ----------- | ----------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- | -------- |
| SM-ADM-001  | Student Search & List                                       | List page                  | Admission Counselor, Front Desk Executive, Student Administration Officer, Finance Officer, Reporting User  | Yes      |
| SM-ADM-002  | Student Create – Direct Registration                        | Form page                  | Front Desk Executive, Student Administration Officer                                                        | Yes      |
| SM-ADM-003  | Student Create – From Approved Admission                    | Wizard / confirmation page | Admission Counselor, Student Administration Officer                                                         | Yes      |
| SM-ADM-004  | Student Create – From Corporate Participant                 | Wizard / confirmation page | Corporate Coordinator, Student Administration Officer                                                       | Yes      |
| SM-ADM-005  | Student Detail – Overview                                   | Detail page                | All authorized internal users                                                                               | Yes      |
| SM-ADM-006  | Student Detail – Personal & Contact Information             | Form tab                   | Student Administration Officer                                                                              | Yes      |
| SM-ADM-007  | Student Detail – Identity Documents & Deduplication Signals | Detail / form tab          | Student Administration Officer, Compliance Officer                                                          | Yes      |
| SM-ADM-008  | Student Detail – Admissions & Enrollments Summary           | Detail tab                 | Admission Counselor, Student Administration Officer, Finance Officer, Trainer read-only via contextual view | Yes      |
| SM-ADM-009  | Student Detail – ID Card Management                         | Form tab                   | Student Administration Officer                                                                              | Yes      |
| SM-ADM-010  | Student Detail – Documents Summary                          | Related-record tab         | Student Administration Officer, Compliance Officer                                                          | Yes      |
| SM-ADM-011  | Student Detail – Audit Trail                                | History tab                | Compliance Officer, Branch Manager, Student Administration Officer read-only                                | Yes      |
| SM-ADM-012  | Student Status Change Modal                                 | Modal                      | Student Administration Officer, Branch Manager                                                              | Yes      |
| SM-ADM-013  | Duplicate Check & Resolution Workbench                      | Workbench page             | Student Administration Officer, Compliance Officer                                                          | Yes      |
| SM-ADM-014  | Merge Students Wizard                                       | Wizard page                | Student Administration Officer, Compliance Officer, Branch Manager if approval required                     | Yes      |
| SM-ADM-015  | Archive Student Confirmation                                | Modal                      | Student Administration Officer, Branch Manager                                                              | Yes      |
| SM-ADM-016  | Restore Student Confirmation                                | Modal                      | Student Administration Officer, Branch Manager                                                              | Yes      |
| SM-ADM-017  | Student Export Dialog                                       | Modal                      | Reporting User, Student Administration Officer                                                              | Yes      |
| SM-ADM-018  | Branch-Scoped Student Lookup Drawer                         | Side drawer                | Finance Officer, Admission Counselor, Front Desk Executive                                                  | Yes      |
| SM-ADM-019  | Student ID Card Reissue Modal                               | Modal                      | Student Administration Officer                                                                              | Yes      |
| SM-ADM-020  | Student Timeline View                                       | Detail tab / full page     | Student Administration Officer, Branch Manager, Compliance Officer                                          | Yes      |

## 3.2 Student Portal Screen Inventory

| Screen Code | Screen Name                            | Type                  | Applicability                                                         | Required             |
| ----------- | -------------------------------------- | --------------------- | --------------------------------------------------------------------- | -------------------- |
| SM-STU-001  | My Student Profile                     | Read-only detail page | Only when student portal is enabled                                   | Yes                  |
| SM-STU-002  | My Personal Information Change Request | Request form          | Only if controlled self-service change request workflow is introduced | Future / conditional |
| SM-STU-003  | My Identity & Documents Summary        | Read-only detail page | When document module exposure is enabled                              | Yes                  |

## 3.3 Trainer Portal Screen Inventory

| Screen Code | Screen Name                              | Type                    | Applicability                                                             | Required                        |
| ----------- | ---------------------------------------- | ----------------------- | ------------------------------------------------------------------------- | ------------------------------- |
| SM-TRN-001  | Batch Roster – Student Quick View Drawer | Read-only drawer        | Required where trainer portal shows batch roster                          | Yes where trainer portal exists |
| SM-TRN-002  | Batch Roster – Student Identity Alerts   | Inline badges / tooltip | Required where attendance/completion workflows need learner identity cues | Yes where trainer portal exists |

---

## 4. Shared Layout and UI Design Rules

## 4.1 Global Admin Layout

- **Shell layout:** top app bar + left navigation + content region.
- **Content width:** full-width responsive container with 24 px desktop page padding, 16 px tablet padding, 12 px small laptop padding.
- **Grid baseline:** 12-column CSS grid.
- **Card spacing:** 16 px vertical rhythm.
- **Data density:** compact tables, 40 px standard row height, 32 px compact header filter controls.
- **Detail pages:** split into
  - header summary band,
  - sticky action bar,
  - left summary rail on wide screens,
  - right primary content tabs on wide screens,
  - stacked layout on small screens.

## 4.2 Form Layout Rules

- **Desktop:** 12-column grid.
- **Tablet:** 8-column grid.
- **Mobile / narrow viewport:** 4-column stacked form.
- **Default field span:**
  - short field: 3 columns,
  - medium field: 4 columns,
  - long field: 6 columns,
  - multiline field: 12 columns.
- **Sectioning:** cards with visible section titles, section help text, and optional status badge.

## 4.3 Table Behavior Rules

All primary tables in this module support:

- server-side paging,
- server-side sorting,
- server-side filtering,
- column resize,
- sticky header,
- sticky first column for dense admin lists,
- export of current filtered dataset when permission allows,
- row click to detail page,
- checkbox bulk selection only for export, not for destructive bulk actions.

Default paging:

- page sizes: 25, 50, 100.
- default page size: 25.
- total record count shown in header.

---

## 5. Shared Field Validation Standards

The following standards apply wherever the field appears in this module.

| Field                       | Type    |                                                    Mandatory | Length                    | Regex / Rule                                                                     | Notes                                               |
| --------------------------- | ------- | -----------------------------------------------------------: | ------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------- |
| firstNameEnglish            | string  |                                   Yes for English entry path | 1–100                     | `^[A-Za-z][A-Za-z '.-]{0,98}[A-Za-z.]$`                                          | Trim spaces; single internal spaces preserved       |
| middleNameEnglish           | string  |                                                           No | 0–100                     | `^$                                                                              | ^[A-Za-z][A-Za-z '.-]{0,98}[A-Za-z.]$`              | Optional                               |
| lastNameEnglish             | string  |                                   Yes for English entry path | 1–100                     | `^[A-Za-z][A-Za-z '.-]{0,98}[A-Za-z.]$`                                          | Trim spaces                                         |
| fullNameArabic              | string  |                         Required when Arabic name maintained | 1–200                     | `^[\u0600-\u06FF][\u0600-\u06FF\s'.-]{0,198}[\u0600-\u06FF]$`                    | RTL text input                                      |
| gender                      | enum    |                                                           No | n/a                       | One of `Male`, `Female`, `Other`, `PreferNotToSay`                               | Display labels localizable                          |
| dateOfBirth                 | date    |                                                           No | n/a                       | Must be <= current date; age cannot exceed 120 years                             | Oman timezone business date                         |
| nationality                 | lookup  |                                                          Yes | n/a                       | Must exist in active nationality lookup                                          | Server-side lookup validation                       |
| civilId                     | string  |                                                  Conditional | 5–30                      | `^$                                                                              | ^[A-Za-z0-9-]{5,30}$`                               | Unique when provided, case-insensitive |
| passportNumber              | string  |                                                  Conditional | 3–20                      | `^$                                                                              | ^[A-Za-z0-9]{3,20}$`                                | Unique when provided, case-insensitive |
| visaNumber                  | string  |                                                  Conditional | 3–30                      | `^$                                                                              | ^[A-Za-z0-9/-]{3,30}$`                              | Unique when provided, case-insensitive |
| primaryEmail                | string  |                                                  Conditional | 5–254                     | `^$                                                                              | ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$` | Stored lowercased                      |
| primaryPhone                | string  |                                                          Yes | 8–15 digits excluding `+` | `^\+?[1-9]\d{7,14}$`                                                             | Stored in canonical E.164-like format               |
| studentNumber               | string  |                                             System-generated | 1–50                      | `^[A-Za-z0-9/_-]{1,50}$`                                                         | Read-only after creation                            |
| idCardIssued                | boolean |                                                          Yes | n/a                       | true / false                                                                     | Defaults false                                      |
| idCardNumber                | string  |                                      Conditional when issued | 1–50                      | `^$                                                                              | ^[A-Za-z0-9/_-]{1,50}$`                             | Unique when provided                   |
| joinedAt                    | date    |                                                          Yes | n/a                       | Must be <= current date; must be >= institute effective start date if configured | Oman timezone business date                         |
| remarks                     | string  |                                                  Conditional | 0–1000                    | free text; strip control chars                                                   | Stored as plain text                                |
| archiveReason               | string  |                                           Yes when archiving | 10–500                    | not blank after trim                                                             | Audit required                                      |
| statusChangeReason          | string  | Yes for status changes other than Pending→Active on creation | 10–500                    | not blank after trim                                                             | Audit required                                      |
| mergeReason                 | string  |                                                          Yes | 20–1000                   | not blank after trim                                                             | Audit required                                      |
| duplicateResolutionDecision | enum    |                                                          Yes | n/a                       | `KeepExisting`, `CreateNew`, `Merge`, `Cancel`                                   | Action controlled by permission                     |

Cross-field validation:

1. At least one of `civilId`, `passportNumber`, `visaNumber`, `primaryEmail`, or `primaryPhone` must be present for direct registration.
2. If `idCardIssued = true`, `idCardNumber` is mandatory.
3. If `idCardIssued = false`, `idCardNumber` must be null on save.
4. `joinedAt` cannot be after today.
5. `dateOfBirth` cannot be after `joinedAt`.
6. Person-level duplicate identifiers cannot exist across active non-deleted records unless a merge workflow is in progress.
7. User cannot assign or mutate records outside authorized branch scope.

---

## 6. Admin Portal Screen Specifications

## 6.1 SM-ADM-001 — Student Search & List

### Purpose

Primary operational screen for discovering, filtering, and navigating student records within authorized branch scope.

### Layout & Grid Structure

- 12-column page grid.
- Header row:
  - col 1–8: page title, count badge, branch badge
  - col 9–12: actions (`Create Student`, `Export`, `Advanced Filters`)
- Filter band card:
  - row 1 compact quick filters
  - row 2 expandable advanced filters
- Results grid below full width.
- Right-side sticky summary panel appears when a row is selected in split-view mode on extra-wide screens.

### Interactive Elements

- Buttons: `Create Student`, `Export`, `Reset Filters`
- Selectors: branch selector, status multiselect, archived toggle
- Tabs: `All`, `Active`, `Suspended`, `Archived`, `Duplicate Review`
- Search bar with debounced search
- Advanced filter accordion
- Table row click
- Inline action menu per row: `View`, `Open Lookup Drawer`, `Archive`, `Restore`, `Merge Candidate`

### Filter Fields and Validations

| Field            | Control          | Validation                                                                            |
| ---------------- | ---------------- | ------------------------------------------------------------------------------------- |
| globalSearch     | text             | 0–150 chars; searches student number, name, phone, email, identity numbers            |
| branchId         | single select    | Required unless user only has one accessible branch; options restricted to user scope |
| consolidatedView | toggle           | Visible only with consolidated permission                                             |
| studentStatus    | multiselect      | values from active lookup only                                                        |
| studentNumber    | text             | `^[A-Za-z0-9/_-]{0,50}$`                                                              |
| primaryPhone     | text             | `^\+?[1-9]\d{0,14}$` while typing; strict `^\+?[1-9]\d{7,14}$` on submit              |
| primaryEmail     | text             | max 254; email regex on submit                                                        |
| civilId          | text             | `^[A-Za-z0-9-]{0,30}$`                                                                |
| passportNumber   | text             | `^[A-Za-z0-9]{0,20}$`                                                                 |
| visaNumber       | text             | `^[A-Za-z0-9/-]{0,30}$`                                                               |
| joinedAtFrom     | date             | must be <= joinedAtTo when both present                                               |
| joinedAtTo       | date             | must be >= joinedAtFrom when both present                                             |
| hasIdCard        | tri-state select | All / Yes / No                                                                        |
| hasAdmissionLink | tri-state select | All / Yes / No                                                                        |
| hasEnrollment    | tri-state select | All / Yes / No                                                                        |
| isArchived       | tri-state select | All / Active only / Archived only                                                     |

### Table Columns

Default visible columns:

1. Student Number
2. Full Name (localized according to UI language)
3. Primary Phone
4. Primary Email
5. Nationality
6. Current Branch
7. Student Status
8. Joined At
9. ID Card Issued
10. Active Enrollments Count
11. Admission Number
12. Last Updated At
13. Actions

Column behaviors:

- sortable: Student Number, Full Name, Joined At, Current Branch, Student Status, Last Updated At
- filterable inline: Student Status, Current Branch, ID Card Issued
- paging: 25 / 50 / 100
- row selection persistent within page only
- hidden-by-default columns available in column chooser:
  - Civil ID masked
  - Passport Number masked
  - Visa Number masked
  - Created At
  - Updated By

### Dynamic UI States

- **Loading:** 12-row skeleton grid with header skeleton and filter placeholders.
- **Empty with no filters:** illustration + text “No students found in your current branch scope.” + `Create Student` CTA if permitted.
- **Empty with filters:** text “No students match the selected filters.” + `Reset Filters`.
- **Permission-hidden actions:** `Create Student`, `Export`, `Archive`, `Restore`, and `Merge Candidate` hidden entirely if missing permission.
- **Inline warnings:** badge on rows with suspected duplicates or archived state.

---

## 6.2 SM-ADM-002 — Student Create – Direct Registration

### Purpose

Authorized direct creation of a student master record when initiated outside the approved-admission flow.

### Layout & Grid Structure

- 12-column form page.
- Header summary row with breadcrumb and branch badge.
- Sections:
  1. Registration Context
  2. Personal Information
  3. Contact Information
  4. Identity Information
  5. Student Profile Initialization
  6. Duplicate Check Result Panel
- Sticky footer action bar.

### Interactive Elements

- Buttons: `Check Duplicates`, `Save as Student`, `Save and Open Profile`, `Cancel`
- Read-only system labels: `Target Branch`, `Creation Source`
- Inline duplicate result drawer
- Date pickers
- Lookup dropdowns
- Toggle for Arabic-name entry panel

### Input Form Fields

| Field             | Type     |         Mandatory | Validation                                                                                                  |
| ----------------- | -------- | ----------------: | ----------------------------------------------------------------------------------------------------------- |
| branchId          | select   |               Yes | must be within user write scope                                                                             |
| creationSource    | select   |               Yes | values: `DirectRegistration`, `WalkInBackOffice`, `AdminExceptional`, `OnlineHandoff`; immutable after save |
| firstNameEnglish  | text     |               Yes | English name regex, 1–100                                                                                   |
| middleNameEnglish | text     |                No | optional English name regex, 0–100                                                                          |
| lastNameEnglish   | text     |               Yes | English name regex, 1–100                                                                                   |
| fullNameArabic    | text     |                No | Arabic regex, 1–200 when entered                                                                            |
| gender            | select   |                No | enum                                                                                                        |
| dateOfBirth       | date     |                No | <= today, age <= 120                                                                                        |
| nationality       | select   |               Yes | active nationality                                                                                          |
| civilId           | text     | Conditional group | 5–30, alphanumeric/hyphen                                                                                   |
| passportNumber    | text     | Conditional group | 3–20, alphanumeric                                                                                          |
| visaNumber        | text     | Conditional group | 3–30, alphanumeric slash hyphen                                                                             |
| primaryEmail      | email    | Conditional group | email regex, <= 254                                                                                         |
| primaryPhone      | tel      |               Yes | phone regex                                                                                                 |
| joinedAt          | date     |               Yes | <= today                                                                                                    |
| remarks           | textarea |                No | <= 1000                                                                                                     |
| idCardIssued      | switch   |                No | default false                                                                                               |
| idCardNumber      | text     |       Conditional | required only if issued true                                                                                |

Group validation:

- at least one unique identifier/contact field must be present from: civilId, passportNumber, visaNumber, primaryEmail, primaryPhone
- duplicate check must complete successfully before save
- save blocked if duplicate confidence is `Blocking`

### Processing-Aware UI

- `Check Duplicates` runs before final save.
- Duplicate results categorized:
  - exact student match,
  - exact person match without student,
  - probable duplicate,
  - clear to create.
- `Save` button disabled until no blocking duplicate remains.

### Dynamic UI States

- field-level errors under inputs,
- top summary error banner listing invalid sections,
- loading overlay during duplicate check,
- disabled state after first submit until response,
- server conflict state:
  - “A student with the same identifier was created moments ago. Reload matching record.”

---

## 6.3 SM-ADM-003 — Student Create – From Approved Admission

### Purpose

Controlled creation or linking of student profile from approved admission.

### Layout & Grid Structure

- 2-step wizard in 12-column layout.
- Left side: admission summary card.
- Right side: action panel and resulting student decision.

### Steps

1. Validate Admission and Resolve Person
2. Create Student or Reuse Existing

### Interactive Elements

- Buttons: `Reuse Existing Student`, `Create New Student`, `Open Existing Profile`, `Cancel`
- Read-only cards: admission summary, person summary, duplicate signals
- Alert panel for conflicts

### Fields

Mostly read-only. Editable only:

- joinedAt (mandatory, date <= today)
- remarks (optional <= 1000)
- idCardIssued / idCardNumber only if policy allows immediate issuance during creation

### Dynamic UI States

- loading skeleton for admission summary
- hard-stop conflict state if admission not approved
- branch access denial state
- reuse path success state

---

## 6.4 SM-ADM-004 — Student Create – From Corporate Participant

### Purpose

Convert or link corporate participant to student profile while retaining corporate linkage.

### Layout & Grid Structure

- 12-column wizard.
- Top summary cards:
  - corporate account,
  - participant identity,
  - target enrollment branch.
- Bottom split:
  - left duplicate resolution panel,
  - right student creation form (limited fields).

### Input Fields

| Field                  | Type          |                  Mandatory | Validation                            |
| ---------------------- | ------------- | -------------------------: | ------------------------------------- |
| corporateParticipantId | hidden/system |                        Yes | must exist and be active              |
| targetBranchId         | select        |                        Yes | within user write scope               |
| joinedAt               | date          |                        Yes | <= today                              |
| primaryPhone           | text          |                Conditional | phone regex if editable override used |
| primaryEmail           | text          |                Conditional | email regex if editable override used |
| nationality            | select        | Yes if missing source data | active lookup                         |
| remarks                | textarea      |                         No | <= 1000                               |

Rules:

- if participant already linked to student, screen becomes read-only result state with `Open Student`.
- corporate link cannot be removed from this screen.

---

## 6.5 SM-ADM-005 — Student Detail – Overview

### Purpose

Single authoritative read view for student identity, status, branch, and related summaries.

### Layout & Grid Structure

- Header band:
  - left 8 cols: name, student number, status badges, branch
  - right 4 cols: action buttons
- Body:
  - left summary rail 3 cols
  - right content tabs 9 cols
- On tablet and smaller: summary rail collapses above tabs.

### Header Actions

Visible by permission:

- `Edit`
- `Change Status`
- `Issue / Update ID Card`
- `Archive`
- `Restore`
- `Open Duplicate Workbench`
- `Export PDF Snapshot` optional if enabled
- `View Audit`

### Summary Tiles

- Student Number
- Student Status
- Joined At
- Current Branch
- ID Card Status
- Linked Admission Count
- Enrollment Count
- Active Enrollment Count
- Duplicate Risk Flag

### Dynamic UI States

- badge colors for Active, Suspended, Archived
- audit warning badge on merged record
- identity alert badge if document fields missing
- archived ribbon across page when archived

---

## 6.6 SM-ADM-006 — Student Detail – Personal & Contact Information

### Purpose

Edit person-linked personal and contact data allowed within student maintenance boundary.

### Layout & Grid Structure

- 12-column form tab.
- Section 1: names (6 + 6)
- Section 2: demographic fields (4 + 4 + 4)
- Section 3: contact fields (6 + 6)
- Section 4: remarks (12)

### Editable Fields

| Field             | Type                      |   Mandatory | Validation                                   |
| ----------------- | ------------------------- | ----------: | -------------------------------------------- |
| firstNameEnglish  | text                      |         Yes | regex, 1–100                                 |
| middleNameEnglish | text                      |          No | regex, 0–100                                 |
| lastNameEnglish   | text                      |         Yes | regex, 1–100                                 |
| fullNameArabic    | text                      |          No | Arabic regex, 1–200                          |
| gender            | select                    |          No | enum                                         |
| dateOfBirth       | date                      |          No | <= today, age <= 120                         |
| nationality       | select                    |         Yes | active lookup                                |
| primaryEmail      | email                     | Conditional | regex, <= 254                                |
| primaryPhone      | tel                       |         Yes | regex                                        |
| photoUrl          | url text / file reference |          No | absolute URL or approved storage key, <= 500 |
| remarks           | textarea                  |          No | <= 1000                                      |

Dynamic rules:

- if save changes unique identifiers/contact fields, duplicate check reruns server-side
- if profile is archived, all fields read-only except users with restore permission can only restore, not edit archived content

---

## 6.7 SM-ADM-007 — Student Detail – Identity Documents & Deduplication Signals

### Purpose

Show identity fields and duplicate indicators used to assess potential record collision.

### Layout & Grid Structure

- 12-column, two-card row on desktop.
- Left card: identity values.
- Right card: duplicate analysis and related possible matches.

### Fields

| Field          | Type | Mandatory | Validation  |
| -------------- | ---- | --------: | ----------- |
| civilId        | text |        No | 5–30, regex |
| passportNumber | text |        No | 3–20, regex |
| visaNumber     | text |        No | 3–30, regex |

### Table: Possible Matching Records

Columns:

1. Match Score
2. Student Number
3. Full Name
4. Phone
5. Email
6. Identity Match Reason
7. Branch
8. Status
9. Action

Sorting:

- default by match score desc
- secondary by updatedAt desc

Filtering:

- score band
- branch
- status

Actions:

- `Open`
- `Compare`
- `Merge`

---

## 6.8 SM-ADM-008 — Student Detail – Admissions & Enrollments Summary

### Purpose

Read-only summary of related admission and enrollment references.

### Layout & Grid Structure

- stacked cards:
  1. Admission summary grid
  2. Enrollment summary grid
- each grid full width with compact rows.

### Admissions Table Columns

1. Admission Number
2. Admission Status
3. Admission Date
4. Branch
5. Approved At
6. Approved By
7. Action (`Open Admission`)

### Enrollments Table Columns

1. Enrollment Number
2. Course
3. Batch
4. Enrollment Type
5. Enrollment Status
6. Confirmed At
7. Completion Status
8. Certificate Status
9. Action (`Open Enrollment`)

Behaviors:

- sort server-side by date columns
- filter by status and branch
- page size fixed 10 with independent pager per table

---

## 6.9 SM-ADM-009 — Student Detail – ID Card Management

### Purpose

Manage ID card issuance and reissue identifiers.

### Layout & Grid Structure

- 8-column centered form card on desktop; full width on smaller screens.
- below form: ID card history table.

### Input Fields

| Field         | Type     |                                             Mandatory | Validation          |
| ------------- | -------- | ----------------------------------------------------: | ------------------- |
| idCardIssued  | switch   |                                                   Yes | boolean             |
| idCardNumber  | text     |                                           Conditional | 1–50, regex, unique |
| issueDate     | date     |                               Conditional when issued | <= today            |
| issueRemarks  | textarea |                    Conditional when issuing/reissuing | 10–500              |
| reissueReason | textarea | Conditional when changing existing issued card number | 10–500              |

Rules:

- once `idCardIssued` flips from false to true, audit is mandatory.
- changing `idCardNumber` on an already-issued card creates a reissue history entry.
- setting issued false after true requires elevated permission and reason.

### ID Card History Table Columns

1. Event Type
2. Old Card Number
3. New Card Number
4. Event Date
5. Performed By
6. Reason

---

## 6.10 SM-ADM-010 — Student Detail – Documents Summary

### Purpose

Read-only summary of related student documents owned by Document Management.

### Layout & Grid Structure

- full-width table plus right-side summary chips for counts.

### Table Columns

1. Document Type
2. File Name
3. Issue Date
4. Expiry Date
5. Verification Status
6. Uploaded At
7. Uploaded By
8. Action (`Open Document` if permission)

Sort:

- Expiry Date, Uploaded At

Filter:

- Document Type
- Verification Status
- Expiring in 30 / 60 / 90 days

Empty state:

- “No documents linked to this student.”

---

## 6.11 SM-ADM-011 — Student Detail – Audit Trail

### Purpose

Review immutable audit entries for sensitive student actions.

### Layout & Grid Structure

- filter strip + full-width audit table.

### Filters

- date range
- action type
- performed by
- changed field
- source module

### Audit Table Columns

1. Event Timestamp
2. Action
3. Entity Type
4. Entity ID / Student Number
5. Performed By
6. Source Module
7. Change Summary
8. Reason
9. Action (`View Diff`)

`View Diff` opens side drawer showing old/new values in two-column comparison.

---

## 6.12 SM-ADM-012 — Student Status Change Modal

### Purpose

Controlled transition of student lifecycle status.

### Layout

- modal width 720 px desktop, full screen on small devices.
- sections:
  1. current state
  2. target state
  3. reason
  4. impact warning

### Fields

| Field              | Type      |   Mandatory | Validation                                          |
| ------------------ | --------- | ----------: | --------------------------------------------------- |
| currentStatus      | read-only |         Yes | system                                              |
| targetStatus       | select    |         Yes | allowed transitions only                            |
| effectiveStartDate | date      |         Yes | >= joinedAt and <= today for immediate changes      |
| effectiveEndDate   | date      | Conditional | required for temporary suspension if policy demands |
| statusChangeReason | textarea  |         Yes | 10–500                                              |
| notifyRelatedUsers | checkbox  |          No | default false                                       |

Allowed target statuses:

- `Active`
- `Suspended`
- `Archived`

Blocking conditions:

- cannot archive if unresolved active enrollment policy blocks archival
- cannot restore if branch access missing
- cannot suspend archived record

---

## 6.13 SM-ADM-013 — Duplicate Check & Resolution Workbench

### Purpose

Operational workbench for resolving suspected duplicates.

### Layout & Grid Structure

- 12-column workbench.
- left 4 cols: candidate list.
- center 4 cols: primary record snapshot.
- right 4 cols: comparison target snapshot.
- bottom full-width action panel.

### Interactive Elements

- compare selector
- field-level survivor highlight chips
- buttons: `Mark Not Duplicate`, `Merge`, `Open Existing`, `Create Exception Note`

### Candidate List Table Columns

1. Match Score
2. Student Number
3. Name
4. Match Drivers
5. Branch
6. Status

### Action Rules

- `Merge` visible only with `student.merge`
- `Mark Not Duplicate` visible with `student.duplicate.resolve`
- result requires reason 10–500 chars

---

## 6.14 SM-ADM-014 — Merge Students Wizard

### Purpose

Merge duplicate students into a single survivor record while preserving audit and referential integrity.

### Layout & Grid Structure

- Stepper wizard:
  1. Select Survivor and Source
  2. Compare Fields
  3. Confirm Related Record Reassignment
  4. Final Confirmation
- comparison matrix full width.

### Interactive Elements

- radio buttons for survivor field choice
- auto-select best non-null option
- danger confirmation checkbox
- final typed confirmation requiring survivor student number

### Fields

| Field                  | Type     | Mandatory | Validation                                 |
| ---------------------- | -------- | --------: | ------------------------------------------ |
| survivorStudentId      | select   |       Yes | must not equal source                      |
| sourceStudentId        | select   |       Yes | must not equal survivor                    |
| mergeReason            | textarea |       Yes | 20–1000                                    |
| confirmationText       | text     |       Yes | must exactly equal survivor student number |
| retainSourceAsArchived | checkbox |       Yes | always true and disabled                   |
| transferIdCardHistory  | checkbox |       Yes | default true; disabled true                |
| transferDocumentLinks  | checkbox |       Yes | default true; disabled true                |

Processing warnings shown:

- linked admissions,
- enrollments,
- invoices,
- attendance,
- completion,
- certificate references.

No hard delete path is exposed.

---

## 6.15 SM-ADM-015 — Archive Student Confirmation

### Purpose

Soft-delete style archival.

### Layout

Simple confirmation modal with impact checklist.

### Fields

| Field          | Type     | Mandatory | Validation      |
| -------------- | -------- | --------: | --------------- |
| archiveReason  | textarea |       Yes | 10–500          |
| confirmArchive | checkbox |       Yes | must be checked |

Warnings:

- archived students remain in audit and historical reports
- archival may be blocked by open policy conditions

---

## 6.16 SM-ADM-016 — Restore Student Confirmation

### Purpose

Restore archived student to active use.

### Layout

Modal with branch and status summary.

### Fields

| Field               | Type     | Mandatory | Validation                   |
| ------------------- | -------- | --------: | ---------------------------- |
| restoreTargetStatus | select   |       Yes | `Active` or `Suspended` only |
| restoreReason       | textarea |       Yes | 10–500                       |
| effectiveStartDate  | date     |       Yes | <= today                     |

---

## 6.17 SM-ADM-017 — Student Export Dialog

### Purpose

Controlled export of filtered student list.

### Layout

Modal with export options.

### Fields

| Field                 | Type     |   Mandatory | Validation                                      |
| --------------------- | -------- | ----------: | ----------------------------------------------- |
| exportScope           | radio    |         Yes | `CurrentPage`, `AllFiltered`, `SelectedRows`    |
| format                | select   |         Yes | `XLSX`, `CSV`                                   |
| includeMaskedIdentity | checkbox |          No | visible only with elevated permission           |
| includeArchived       | checkbox |          No | default follows current filters                 |
| reason                | textarea | Conditional | required when including masked identity, 10–500 |

---

## 6.18 SM-ADM-018 — Branch-Scoped Student Lookup Drawer

### Purpose

Fast lookup control reused from enrollment, finance, and walk-in workflows.

### Layout

Right drawer width 560 px desktop, full screen mobile.

### Controls

- search bar
- recent results
- compact filter chips
- result list cards

Fields:

- same search validations as list page, but minimal:
  - globalSearch
  - studentNumber
  - phone
  - email

Result card fields:

- student number
- name
- phone
- status
- branch
- active enrollment count

Actions:

- `Select Student`
- `Open Full Profile`

---

## 6.19 SM-ADM-019 — Student ID Card Reissue Modal

### Purpose

Controlled reissue of an existing ID card.

### Fields

| Field               | Type      | Mandatory | Validation          |
| ------------------- | --------- | --------: | ------------------- |
| currentIdCardNumber | read-only |       Yes | system              |
| newIdCardNumber     | text      |       Yes | 1–50, regex, unique |
| reissueDate         | date      |       Yes | <= today            |
| reissueReason       | textarea  |       Yes | 10–500              |

---

## 6.20 SM-ADM-020 — Student Timeline View

### Purpose

Chronological view combining key student events.

### Layout

Full-width timeline with left date rail and right event cards.

### Event Types

- Student created
- Student updated
- Status changed
- ID card issued/reissued
- Duplicate flagged
- Merge completed
- Archived
- Restored
- Admission linked
- Enrollment linked (reference only)

Filtering:

- event type
- date range
- actor

---

## 7. Student Portal Screen Specifications

## 7.1 SM-STU-001 — My Student Profile

### Applicability

Only when student portal is enabled.

### Layout

- summary header
- tabs: `Profile`, `Identity`, `Documents Summary`, `Admissions & Enrollments`
- entirely read-only in current module scope

### Visible Data

- student number
- full name
- nationality
- primary phone
- primary email
- joined date
- ID card issued flag
- linked admissions and enrollments summary

### Hidden / not allowed

- no direct edit of master record
- no merge, archive, restore, status change

### Empty / blocked state

- “Your student profile is not yet linked to this portal account.”

---

## 7.2 SM-STU-002 — My Personal Information Change Request

### Applicability

Future only if controlled request workflow is introduced.

### Layout

Simple request form with current-value preview and proposed-value input.

### Inputs

Same validation as personal/contact fields, but submits change request rather than direct update.

---

## 7.3 SM-STU-003 — My Identity & Documents Summary

Read-only list of identity fields and linked documents. No ownership of upload workflow in this module.

---

## 8. Trainer Portal Screen Specifications

## 8.1 SM-TRN-001 — Batch Roster – Student Quick View Drawer

### Purpose

Provide trainers with read-only student identity context while taking attendance or reviewing completion data.

### Layout

Right drawer width 480 px.
Sections:

1. Student header
2. Contact summary
3. Enrollment context
4. identity alert badges

### Visible Data

- student number
- localized name
- phone if allowed by privacy policy
- nationality
- active batch and enrollment status
- document/identity missing badges if surfaced by policy

### Hidden Actions

- no edit
- no status change
- no archive/restore
- no duplicate resolution
- no ID card issuance

---

## 8.2 SM-TRN-002 — Batch Roster – Student Identity Alerts

### UI Component

Inline badges and tooltips on roster rows.

### Badge Types

- `Missing Identity Info`
- `Duplicate Review Pending`
- `Suspended`
- `Archived Record Reference`
- `Corporate Participant Origin`

Tooltips are read-only and permission-aware.

---

## 9. Reusable UI Components

| Component Code | Component Name               | Usage                                      |
| -------------- | ---------------------------- | ------------------------------------------ |
| UI-SM-001      | Student Status Badge         | List rows, detail headers, roster drawer   |
| UI-SM-002      | Branch Scope Pill            | List and detail pages                      |
| UI-SM-003      | Duplicate Risk Banner        | Create, detail, workbench                  |
| UI-SM-004      | Identity Field Masker        | Civil ID / passport / visa partial masking |
| UI-SM-005      | Audit Diff Viewer            | Audit trail drawer                         |
| UI-SM-006      | Related Record Count Chip    | Overview tiles                             |
| UI-SM-007      | Empty State Panel            | List and tab empty states                  |
| UI-SM-008      | Permission Guard Wrapper     | Hides or disables controls by permission   |
| UI-SM-009      | Localized Name Renderer      | English/Arabic display with fallback       |
| UI-SM-010      | Compact Filter Bar           | Search/list pages                          |
| UI-SM-011      | Reason Capture Modal Section | Status, archive, restore, merge, reissue   |
| UI-SM-012      | Skeleton Grid                | Dense table and form loading states        |

---

## 10. Dynamic UI States

## 10.1 Validation Error States

### Field-level

- red border on invalid field
- inline helper text replaced by error text
- error text appears in current UI language
- first invalid field focused after submit attempt

### Section-level

- section header badge shows error count
- collapsed accordion auto-expands when it contains invalid fields

### Page-level

- persistent error banner at top:
  - “Please correct the highlighted fields before saving.”
- duplicate-blocking error banner:
  - “A matching student or person record already exists. Resolve the duplicate warning before continuing.”

## 10.2 Loading States

### List Pages

- skeleton filter controls
- 12-row table skeleton
- disabled actions until branch scope resolves

### Detail Pages

- header skeleton
- summary tile skeletons
- tab content skeletons
- side rail placeholder blocks

### Modals / Drawers

- inline spinner in submit button
- overlay for duplicate resolution fetch or merge preview

## 10.3 Empty States

| Context                             | Empty State                                   |
| ----------------------------------- | --------------------------------------------- |
| Student list no records             | Show create CTA if permitted                  |
| Student list filtered none          | Show reset filters CTA                        |
| No admissions                       | “No admissions linked to this student.”       |
| No enrollments                      | “No enrollments linked to this student.”      |
| No documents                        | “No documents linked to this student.”        |
| No audit entries in selected filter | “No audit events match the selected filters.” |
| No duplicate candidates             | “No potential duplicates detected.”           |

## 10.4 Permission-Based Hiding and Disabling

Rules:

1. If user lacks view permission for a screen, route blocked server-side and client-side navigation item hidden.
2. If user can view but not edit, all edit controls hidden, not merely disabled.
3. If user lacks branch access, row-level actions and record details are not fetched.
4. If user lacks consolidated permission, branch selector only shows assigned active branch context and consolidated toggle is hidden.
5. Identity-sensitive columns are masked unless elevated permission exists.
6. Export action hidden if `student.export` missing.
7. Merge and duplicate resolution hidden unless specific permissions exist.
8. Audit tab hidden unless `audit.read` or module-specific audit permission exists.
9. ID card actions hidden without `student.idcard.manage`.
10. Archive/restore/status change actions hidden without dedicated permissions.

## 10.5 Conflict and Concurrency States

- stale update response:
  - “This profile was updated by another user. Reload the latest version and try again.”
- numbering collision fallback:
  - silent retry server-side; if unrecoverable, show blocking error and keep form draft
- merge conflict:
  - “One of the records changed during merge preparation. Reopen merge wizard.”

---

## 11. Table Sorting, Filtering, Paging Standards

1. Sorting is single-column by default; multi-column sort optional for admin advanced mode.
2. Server-side sort keys must align to persisted fields or indexed projections.
3. Filters are applied server-side only.
4. Paging resets to first page when filters change.
5. Current sort/filter/page state persists in URL query parameters on admin list pages.
6. Column visibility preferences persist per user.
7. Export respects active filters and branch scope.
8. Archived rows display subdued styling and archived badge.
9. Suspended rows display warning tone badge.
10. When total result count exceeds 10,000, export requires asynchronous job pattern in architecture; UI shows export request acknowledgment instead of direct browser generation.

---

## 12. Bilingual Layout Rules

## 12.1 Shared Rendering Principles

- The module supports both **English (LTR)** and **Arabic (RTL)**.
- All text labels, validation messages, table headers, empty states, and button captions must be localized.
- Date/time are displayed in Oman timezone context.
- Numeric identifiers such as student number, admission number, enrollment number, ID card number, phone, Civil ID, passport number, and visa number remain **left-to-right logical strings** even in Arabic UI to preserve readability and copy accuracy.

## 12.2 English (LTR) Rules

1. Page flow is left to right.
2. Left navigation appears on left edge.
3. Form labels are left-aligned.
4. Tables pin first column on the left.
5. Breadcrumb arrows point rightward.
6. Search icon appears at input left.
7. Drawer opens from right by default for lookup and details unless action semantics dictate otherwise.

## 12.3 Arabic (RTL) Rules

1. Full page shell mirrors to right-to-left.
2. Primary navigation moves to the right edge if portal supports full mirroring.
3. Form labels right-align.
4. Cards and summary rails reverse order.
5. Tables pin first logical column on the right.
6. Pagination control order mirrors.
7. Breadcrumb arrows reverse direction.
8. Search icon appears at input right.
9. Side drawers open from left when used as secondary overlay in mirrored layout unless global shell preserves right-side drawers for product consistency; whichever rule is chosen must remain consistent across the suite.
10. Arabic text inputs default to RTL text direction, but fields containing email, phone, student number, Civil ID, passport number, visa number, and ID card number remain forced LTR inside the input even in Arabic UI.

## 12.4 Localized Name Rendering

1. If Arabic UI and Arabic full name exists, render Arabic full name as primary and English name as secondary muted text.
2. If Arabic UI and Arabic full name is missing, render English name and show `English Only` muted hint only for internal staff screens, not student-facing screens.
3. If English UI, render English full name as primary and Arabic full name as optional secondary line when available.
4. Search indexes must support both English and Arabic names.
5. Sort order in Arabic UI still follows backend configured collation; if Arabic collation is unavailable, show deterministic fallback and do not fake client-only sort order.

## 12.5 Bilingual Validation Messages

Examples:

- English: “Primary phone number is required.”
- Arabic: localized equivalent, right-aligned.
- For code-like fields, validation examples remain LTR:
  - student number,
  - email,
  - phone,
  - identity numbers.

---

## 13. Accessibility and Usability Rules

1. All actions available by keyboard.
2. Tab order follows visual order in both LTR and RTL.
3. Error messages use aria-describedby bindings.
4. Required fields include visible marker and accessible announcement.
5. Status badges require icon + text, not color alone.
6. Table rows support keyboard selection and opening.
7. Dialog focus trap mandatory.
8. Drawer close controls available at top logical corner for current direction.
9. Minimum touch target 40 px.
10. Dense mode must still preserve readable contrast and focus indicators.

---

## 14. Screen-to-Requirement Traceability

| Screen Code | Primary Requirements Supported             |
| ----------- | ------------------------------------------ |
| SM-ADM-001  | FR-SM-005, FR-SM-006, FR-SM-014, FR-SM-015 |
| SM-ADM-002  | FR-SM-002, FR-SM-004, FR-SM-007            |
| SM-ADM-003  | FR-SM-001, FR-SM-004, FR-SM-007            |
| SM-ADM-004  | FR-SM-003, FR-SM-004, FR-SM-007            |
| SM-ADM-005  | FR-SM-006, FR-SM-008, FR-SM-016            |
| SM-ADM-006  | FR-SM-006, FR-SM-007                       |
| SM-ADM-007  | FR-SM-007, FR-SM-010                       |
| SM-ADM-008  | FR-SM-009, FR-SM-016                       |
| SM-ADM-009  | FR-SM-011                                  |
| SM-ADM-010  | FR-SM-009                                  |
| SM-ADM-011  | FR-SM-016                                  |
| SM-ADM-012  | FR-SM-008                                  |
| SM-ADM-013  | FR-SM-007, FR-SM-010                       |
| SM-ADM-014  | FR-SM-010                                  |
| SM-ADM-015  | FR-SM-012                                  |
| SM-ADM-016  | FR-SM-013                                  |
| SM-ADM-017  | FR-SM-015                                  |
| SM-ADM-018  | FR-SM-005                                  |
| SM-ADM-019  | FR-SM-011                                  |
| SM-ADM-020  | FR-SM-016                                  |
| SM-STU-001  | FR-SM-006, FR-SM-009                       |
| SM-TRN-001  | FR-SM-009                                  |
| SM-TRN-002  | FR-SM-007, FR-SM-008                       |

---

## 15. Final UI Design Constraints

1. No screen in this module may bypass server-side branch filtering.
2. No screen may expose hard delete.
3. Sensitive actions must capture reason text and create audit entries.
4. Student number is system-generated and read-only after creation.
5. Fields that drive deduplication require normalized server-side validation, not client-only checks.
6. Identity-sensitive columns must support masking.
7. Student and trainer portal views are read-only within this module unless a separate controlled request workflow is explicitly implemented.
8. Bilingual support must be native to layout and not a late overlay.
9. Dense data grids must remain usable on 1366 px wide screens without horizontal scrolling for default column set.
10. All destructive or state-changing actions must use confirmatory modal patterns with explicit post-action success messages.
