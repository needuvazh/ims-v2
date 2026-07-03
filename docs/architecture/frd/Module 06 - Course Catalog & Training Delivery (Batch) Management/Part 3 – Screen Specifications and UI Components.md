# Module 06 — Course Catalog & Training Delivery (Batch) Management

## Part 3 — Screen Specifications and UI Components

**Version:** 3.0  
**Status:** Draft  
**Domain:** Course Catalog & Training Delivery  
**Module Code:** CRS  

---

# 1. Screen Inventory

The following screens compose the UI system for managing courses and batches across the Admin, Trainer, and Student portals.

| Screen ID | Portal | Screen Name | Access Level / Permission Required |
| --- | --- | --- | --- |
| **CRS-SCR-001** | Admin | Course Catalog List & Dashboard | `course.catalog.view` |
| **CRS-SCR-002** | Admin | Create/Edit Course Form | `course.catalog.create` / `course.catalog.update` |
| **CRS-SCR-003** | Admin | Course Configuration Panel (Pricing & Rules) | `course.catalog.create` / `course.pricing.override` |
| **CRS-SCR-004** | Admin | Batch Management Listing Dashboard | `batch.delivery.view` |
| **CRS-SCR-005** | Admin | Create/Edit Batch Form | `batch.delivery.create` / `batch.delivery.update` |
| **CRS-SCR-006** | Admin | Batch Details, Roster & Waitlist Manager | `batch.delivery.view` / `batch.waitlist.manage` |
| **CRS-SCR-007** | Admin | Trainer Assignment & Conflict Validator | `batch.delivery.assign` |
| **CRS-SCR-008** | Trainer | My Batches & Rosters Panel | `Trainer Role` |
| **CRS-SCR-009** | Student | Course Catalog & Batches Lookup | `Student Role` |

---

# 2. Detailed Screen Specifications

---

## CRS-SCR-001: Course Catalog List & Dashboard
*   **Layout & Grid Structure:** 
    *   Dense, data-rich dashboard styling.
    *   Top section features 4 metric cards in a `grid-cols-4` layout displaying active course count, draft course count, global course count, and total departments.
    *   Main layout utilizes a sidebar filter panel (`col-span-3`) and a table grid (`col-span-9`) within a 12-column responsive layout.
*   **Interactive Elements:**
    *   **"Create New Course" Button:** Redirects to `CRS-SCR-002`. Hidden if the user lacks `course.catalog.create`.
    *   **"Export Catalog" Dropdown:** Options for CSV, XLSX, and PDF.
    *   **Table Row Action Menu:** Inline buttons for View, Edit, Configure (Pricing/Rules), and Archive.
*   **Filters & Search:**
    *   Search input (filters by `courseCode` and bilingual `name`).
    *   Dropdowns for Department (multiselect), Branch (multiselect), and Status (Draft, Active, Inactive, Archived).
*   **Table Columns & Behaviors:**
    *   `Course Code` (width: 10%, Sortable, default sort: ascending)
    *   `Course Title (English/Arabic)` (width: 25%, Sortable)
    *   `Branch Context` (width: 15%, Sortable)
    *   `Department` (width: 15%, Sortable)
    *   `Duration` (width: 10%, displays as e.g., "40 Hours" or "30 Days")
    *   `Status Badge` (width: 10%, color-coded: Green for Active, Grey for Draft, Amber for Inactive, Red for Archived)
    *   `Actions` (width: 15%, static alignment)
    *   *Paging:* 25, 50, 100 rows per page. Standard cursor-based paging controls.

---

## CRS-SCR-002: Create/Edit Course Form
*   **Layout & Grid Structure:**
    *   Centered, dense two-column form container (`max-w-5xl`).
    *   Visual separation using segmented card components: Basic Information (full-width), Localization details (two columns), and Duration Settings (half-width).
*   **Interactive Elements:**
    *   **"Save Draft" Button:** Submits the form and leaves the course in `Draft` state.
    *   **"Publish Course" Button:** Transitions course to `Active` (runs validations).
    *   **"Cancel" Button:** Discards edits with confirmation alert and returns to `CRS-SCR-001`.
*   **Input Form Fields & Validations:**

| Field Label | HTML Input Type | Validation Rules | Error Messaging |
| --- | --- | --- | --- |
| **Course Code** | Text | Required; uppercase alphanumeric; regex: `^[A-Z0-9-]{3,20}$`; length 3-20. | "Course code must be 3-20 uppercase characters and hyphens only." |
| **English Name** | Text | Required; ASCII characters only; length 3-150. | "English Name is required and must not exceed 150 characters." |
| **Arabic Name** | Text | Required; Arabic characters only; length 3-150. | "Arabic Name is required and must be in Arabic script." |
| **Department** | Select | Required; UUID format validation. | "Please select a valid academic department." |
| **Branch Scope** | Select | Required; UUID format validation. | "Please select a valid branch scope." |
| **Classification** | Select | Required; value must be within `Individual`, `Corporate`, `WalkIn`, `Online`. | "Please select a valid course classification." |
| **Duration Type** | Select | Required; value must be within `FixedDays`, `HoursBased`, `SessionsBased`. | "Please select a valid duration type." |
| **Duration Value**| Number | Required; integer; minimum value: 1. | "Duration must be a positive integer greater than zero." |
| **Start Date** | Date | Required; format `YYYY-MM-DD`. Must be `>= current_date`. | "Start Date cannot be in the past." |
| **End Date** | Date | Optional; format `YYYY-MM-DD`. Must be `> Start Date`. | "End Date must be after the Start Date." |

---

## CRS-SCR-003: Course Configuration Panel (Pricing & Rules)
*   **Layout & Grid Structure:**
    *   Split-screen layout with sticky left navigation tabs: `Pricing Configurations` and `Completion Rules`.
    *   Right side displays a dual dynamic list grid detailing current versions and history logs.
*   **Tab 1: Pricing Configurations:**
    *   **"Add Pricing Override" Button:** Displays modal form to configure pricing variables.
    *   *Form Fields in Modal:*
        *   `BranchContext` (Select: Global or Branch UUID)
        *   `CustomerType` (Select: Individual, Corporate, Walk-In)
        *   `BatchType` (Select: Regular, FastTrack, Weekend)
        *   `Base Price` (Number, currency layout OMR, decimal precision `0.000`, minimum `0.001`, mandatory)
        *   `Tax Percentage` (Number, default `5.000`, minimum `0.000`)
        *   `Effective Start Date` (Date, mandatory)
    *   *Grid List Columns:* Branch Scope, Customer Type, Price, Tax, Start Date, End Date, Status.
*   **Tab 2: Completion Rules:**
    *   *Form Fields:*
        *   `Minimum Attendance %` (Slider/Number, 0-100, default `80`, mandatory)
        *   `Exam Prerequisite` (Checkbox/Toggle, default `false`)
        *   `Finance Clearance Flag` (Checkbox/Toggle, default `true`)
        *   `Academic Approval Required` (Checkbox/Toggle, default `false`)
        *   `Effective Start Date` (Date, mandatory)
    *   *History List:* Timeline tracker detailing old rules and dates deactivated.

---

## CRS-SCR-004: Batch Management Listing Dashboard
*   **Layout & Grid Structure:**
    *   Grid-based dashboard featuring 4 header KPIs: Active Batches, Total Enrolled Seats, Seat Utilization Rate (%), and Open Waitlist Count.
    *   12-column layout hosting a filter toolbar on top and a dense batch card grid/list toggler below.
*   **Interactive Elements:**
    *   **"Create Batch" Button:** Prompts modal or redirects to `CRS-SCR-005`.
    *   **Roster Toggle:** Switches view between cards (grid) and tabular tracking.
*   **Filters & Search:**
    *   Free text search on `batchCode`, `batchNameEnglish`, `batchNameArabic`, and trainer name.
    *   Filter dropdowns: Branch context, Course Category, Trainer assigned, Status (Draft, Open, InProgress, Completed, Cancelled).
*   **Card / Row Elements:**
    *   Displays Batch Code, Name (English & Arabic), Start Date, End Date, Capacity Bar (e.g., `18 / 25 seats` with colored bar representing full status), Primary Trainer, and Action buttons (Open Enrollment, Edit, View Roster, Complete Batch).

---

## CRS-SCR-005: Create/Edit Batch Form
*   **Layout & Grid Structure:**
    *   Structured multi-step wizard form format divided into three tabs: `1. Schedule & Details`, `2. Capacity Settings`, and `3. Faculty Assignment`.
*   **Interactive Elements:**
    *   **"Save Draft" and "Open for Enrollment" Actions:** Save draft leaves batch in `Draft`. Open for Enrollment runs validation checks and changes status.
*   **Step 1 Form Fields:**
    *   `Batch Code` (Text, uppercase alphanumeric, regex: `^[A-Z0-9-]{3,30}$`, unique)
    *   `Batch Name (English)` (Text, length 3-150, mandatory)
    *   `Batch Name (Arabic)` (Text, length 3-150, regex: Arabic script characters only, mandatory)
    *   `Course ID` (Search Select, dropdown of active courses, mandatory)
    *   `Branch ID` (Select, defaults to user branch, mandatory)
    *   `Start Date` (Date, must be `>= current_date` and within course validity, mandatory)
    *   `End Date` (Date, must be `> Start Date` and within course validity, mandatory)
*   **Step 2 Form Fields:**
    *   `Seat Capacity` (Number, integer, minimum 1, mandatory)
    *   `Enable Waiting List` (Toggle, default `true`)
    *   `Allow Overbooking` (Toggle, default `false`)
*   **Step 3 Form Fields:**
    *   `Primary Trainer` (Search select, dynamic list of active qualified trainers, mandatory)
    *   `Assistant Trainer` (Search select, optional)

---

## CRS-SCR-006: Batch Details, Roster & Waitlist Manager
*   **Layout & Grid Structure:**
    *   Header displaying Batch status, Code, and progress timeline.
    *   Three columns layout below header:
        *   *Left column (col-span-8):* Tabs for Active Students Roster, Timetable Schedule, and Attendance Summaries.
        *   *Right column (col-span-4):* Waitlist Queue Manager widget and Trainer allocation card.
*   ** Roster Table Columns:**
    *   `Student ID` (width: 15%, Sortable)
    *   `Student Name (Bilingual)` (width: 30%, Sortable)
    *   `Enrollment Date` (width: 15%, Sortable)
    *   `Attendance Record %` (width: 15%, Displays e.g., "92%" with warning highlights if under completion rule threshold)
    *   `Finance Status` (width: 15%, displays Paid, Partial, Dues badge)
    *   `Actions` (Drop student, Transfer batch)
*   **Waitlist Queue Manager Widget:**
    *   Displays waitlist count, list of queued students in position order (1, 2, 3...).
    *   **"Promote" Action:** Promotes the selected waitlist student to the batch roster (checks capacity).
    *   **"Reprioritize" drag handle:** Reorders waitlist position (updates `queuePosition`).

---

## CRS-SCR-007: Trainer Assignment & Conflict Validator Modal
*   **Layout & Grid Structure:**
    *   Popup/Modal layout (`max-w-3xl`) overlaying the parent batch editing page.
    *   Dual pane: left pane contains assignment form inputs; right pane displays a dynamic scheduling conflict calendar check.
*   **Interactive Elements:**
    *   **"Run Conflict Check" Button:** Triggers backend validation query.
    *   **"Confirm Assignment" Button:** Saves trainer mapping. Disabled if conflict check fails and bypass is not authorized.
*   **Conflict Calendar Pane:**
    *   Renders a calendar grid highlighting overlapping class sessions from other batches assigned to the selected trainer. Overlaps are highlighted in red.

---

# 3. Dynamic UI States

```text
                                Dynamic UI States
                                        │
     ┌──────────────────────┬───────────┴───────────┬──────────────────────┐
     ▼                      ▼                       ▼                      ▼
Validation Errors    Loading Skeletons        Empty States        Permission Restrictions
 - Input error glow   - Pulse animate card    - "No Active Courses" - Hides "Create Batch"
 - Contextual helper  - Data table loading     illustration          - Disables "Pricing
 - Error alert top    - Shimmer charts        - "Waitlist Empty"     Override" fields
                                               CTA button
```

### 3.1 Validation Error States
*   **Field-Level Error:** Input borders glow in red (`border-red-500`). A contextual error message appears directly beneath the field in red text (`text-red-600`, 11px font size).
*   **Form-Level Alert:** If form submission fails validation, a top sticky alert banner displays: "Please resolve the marked validation errors before saving."
*   **Conflict Warnings:** If a scheduling or pricing conflict is returned asynchronously, the conflicted fields are flagged, and a modal displays the overlap data (e.g., conflicting batch code and session times).

### 3.2 Loading Skeletons
*   **Table Loading:** During API data fetching, table rows render with animated horizontal shimmer pulses (`animate-pulse`). Exact structures: 5 rows with rounded grey placeholder block spans representing cells.
*   **Dashboard Cards:** KPI values are replaced by rounded grey blocks of size `w-24 h-8` with dynamic pulse animation.
*   **Form Skeletons:** Form containers render loading block shapes in place of inputs during detail loading.

### 3.3 Empty States
*   **Course Catalog Table Empty:** If no courses match filters, the table renders a centered layout displaying a search illustration, a header "No Courses Found", and a button "Clear Filters".
*   **Waitlist Widget Empty:** Displays text "The waiting list is empty for this batch. All registered students are allocated seats." in italicized grey text.
*   ** Roster Empty:** Displays "No students enrolled in this batch yet. Share batch code or register students via CRM."

### 3.4 Permission-Based Hiding & Disabling
*   If user lacks `course.catalog.create`, the "Create New Course" button is completely removed from the DOM, and direct routing to `/courses/new` returns a 403 Forbidden Error screen.
*   If user lacks `course.pricing.override`, the override pricing inputs on the Pricing Panel are greyed out (`disabled` attribute applied) with a tooltip stating: "Pricing overrides require supervisor credentials."
*   Waitlist modification widgets are disabled if the user's IAM policies do not include `batch.waitlist.manage`.

---

# 4. Bilingual Layout Rules

To ensure a seamless experience for both English (Left-to-Right) and Arabic (Right-to-Left) users, the following layout rules must be enforced programmatically:

*   **Directionality (`dir` Attribute):** The main HTML wrapper toggles `dir="ltr"` for English and `dir="rtl"` for Arabic dynamically based on the user's active language preference (`user.preferredLanguage`).
*   **CSS Class Reversals:** Avoid hardcoded directional utilities. Use Tailwind CSS logical properties (e.g., `ms-4` for margin-start, `pe-6` for padding-end) or standard flex direction reversals (`flex-row` reverses to `flex-row-reverse`).
*   **Text Alignments:**
    *   English: Left-aligned text (`text-left`) for labels, table headers, and paragraph fields.
    *   Arabic: Right-aligned text (`text-right`) for all equivalent fields.
*   **Bilingual Input Synchronization:**
    *   In the Course Creation Screen, English Name and Arabic Name fields are placed side-by-side on wide screens.
    *   English text inputs default to LTR writing direction (`text-left`) even inside an RTL layout, while Arabic text inputs enforce RTL writing direction (`text-right`) to prevent typing cursor jumps.
*   **OMR Localized Suffix Presentation:**
    *   In English (LTR) mode, currency values are displayed with the prefix "OMR" followed by a space and the formatted decimal amount (e.g., `OMR 150.000`).
    *   In Arabic (RTL) mode, currency values must render using the Omani Rial suffix `"ر.ع."` placed after the amount (e.g., `150.000 ر.ع.`), ensuring clean alignment across RTL financial reports and input screens.
*   **UI Icons and Arrows:**
    *   Action icons (e.g., forward arrows on wizard steps, search icons inside input starts) must flip direction:
        *   English next step button displays `→`.
        *   Arabic next step button displays `←`.
    *   Symmetrical icons (e.g., edit pencil, user avatars, download buttons) do not rotate.
*   **Bilingual Font Weights & Line Heights:**
    *   English default font: `Inter` or `Outfit` (optimized for readability in data grids).
    *   Arabic default font: `Cairo` or `Tajawal` ( Cairo provides optimal readability for Arabic numerals and letters in dense UI tables, using slightly larger line heights to prevent characters from clipping).
