# Part 3 – Screen Specifications and UI Components

## 1. Screen Inventory

### 1.1 Admin / Staff Portal Screens
* **TRN-SCR-001 (Trainer Directory):** Grid listing all active, draft, and suspended trainers with advanced filter controls.
* **TRN-SCR-002 (Trainer Workspace & Profile Form):** Detailed card layout showing trainer personal, professional, and audit details.
* **TRN-SCR-003 (Qualifications Registry Tab):** Section to add, view, and link certificates/documents to specific qualification records.
* **TRN-SCR-004 (Branch Availability Grid):** Visual calendar-based weekly time-block grid to edit and view availability.
* **TRN-SCR-005 (Course Authorization Matrix):** Tab mapping courses to the trainer's list with effective start/end validation triggers.
* **TRN-SCR-006 (Batch Allocation & Compensation Card):** Section inside batch details mapping trainer role (Primary/Assistant) and defining payment rates.

### 1.2 Trainer Self-Service Portal (Read-Only) Screens
* **TRN-PORTAL-001 (My Dashboard & Timetable):** Summary of upcoming sessions, active batches, and monthly calendar schedule.
* **TRN-PORTAL-002 (My Profile & Compliance Tab):** View-only profile, qualified courses, and status of visa/teaching licenses.

---

## 2. Screen Details & Layout Specifications

### TRN-SCR-001: Trainer Directory
* **Layout & Grid Structure:** 
  * Three-column dense dashboard. Left column (25% width) holds collapsible filter facets. Right column (75% width) displays the data table.
  * Header contains Page Title ("Faculty Registry"), a statistics bar (Total Active, On Duty, Expiring Documents, Suspended), and action buttons.
* **Interactive Elements:**
  * **[Add Trainer]** button: Launches registration flow modal (navigates to TRN-SCR-002).
  * **[Export]** dropdown: Triggers export jobs (`CSV`, `XLSX`, `PDF`).
  * **Filters Panel:** Search input, branch selector, status checkboxes, specialization multiselect, document warning flags.
* **Table Columns:**
  * `Trainer Code` (10% width) - Monospace font, sortable, links to profile.
  * `Name` (20% width) - Links to profile.
  * `Type` (10% width) - Badge indicator (Blue for `FullTime`, Purple for `PartTime`, Teal for `Freelance`).
  * `Active Branch(es)` (15% width) - Comma-separated list.
  * `Authorized Courses` (15% width) - Count badge with hover tooltip showing names.
  * `Compliance Status` (15% width) - Green check for Approved, Orange for Warning (Expires <30d), Red for Blocked (Expired).
  * `Actions` (15% width) - Quick edit availability, suspend, edit profile.
* **Paging & Sorting:** Default 25 records per page, server-side paginated. Column headers support sorting toggle.

---

### TRN-SCR-002: Trainer Workspace & Profile Form
* **Layout & Grid Structure:**
  * Two-column grid. Left side: Photo card and key statuses (Draft/Active/Suspended) and audit logs. Right side: Tabbed container (Tabs: `Personal Info`, `Qualifications`, `Availability`, `Course Authorization`, `Compensation Terms`).
* **Input Form Fields & Validations:**
  * **Personal Section (Delegated to Person Record):**
    * *Person Selector* (Dropdown with search, Mandatory): Validates selected Person is not already registered as a trainer.
    * *Personal Details (First Name, Last Name, Email, Mobile)*: Populated from and updated in the central `Person` table. These fields are not persisted inside the `TrainerProfile` table.
  * **Professional Section (Trainer Specific):**
    * *Trainer Type* (Select input, Mandatory): Options: `FullTime`, `PartTime`, `Freelance`.
    * *Specialization* (Text area, Mandatory): Max 1000 characters.
    * *Joined Date* (Date Picker, Mandatory): Must be within past 5 years.
  * **Active Dating Section:**
    * *Effective Start Date* (Date Picker, Mandatory): Cannot be prior to the Person's birth date.
    * *Effective End Date* (Date Picker, Optional): Must be after `effectiveStartDate`.
* **Interactive Elements:**
  * **[Save Profile]** button (Primary action).
  * **[Change Status]** dropdown (Visible to Branch Admins).
  * **[Audit History]** sidebar toggle (Opens log of all edits).

---

### TRN-SCR-003: Qualifications Registry Tab
* **Layout & Grid Structure:**
  * Responsive list layout inside the workspace tab. Contains an "Add Qualification" form at the top, and a table of saved qualifications below.
* **Input Form Fields & Validations:**
  * *Qualification Name* (TextInput, Mandatory): Max 150 chars. E.g., "M.Sc. in Computer Science".
  * *Institution* (TextInput, Mandatory): Max 150 chars.
  * *Year Completed* (Select dropdown, Mandatory): 4-digit integers from 1950 to the current year.
  * *Document Reference* (File Upload field, Optional): Integrates with Document Management. Restricts extensions to `.pdf`, `.jpg`, `.png`, max size 5MB.
* **Interactive Elements:**
  * **[Upload & Save]** button.
  * **[Download Attachment]** icon link next to verified qualifications.
  * **[Delete]** icon: Triggers logical deletion verification dialog.

---

### TRN-SCR-004: Branch Availability Grid
* **Layout & Grid Structure:**
  * Calendar schedule grid (Sunday to Saturday rows, times slots columns in hourly blocks from 07:00 to 22:00 GST).
  * Displays color-coded blocks of defined availability. Blue blocks represent recurring weekly availability; green blocks represent overrides or custom dates.
* **Interactive Elements:**
  * Drag-to-select time ranges on the calendar layout to add slots.
  * **[Add Slot]** action modal.
* **Modal Form Fields & Validations:**
  * *Branch* (Select, Mandatory): Defaults to active branch context.
  * *Day of Week* (Select, Mandatory): Sunday to Saturday.
  * *Start Time* (Time Input, Mandatory): 24-hour block formats (HH:MM). E.g. "09:00".
  * *End Time* (Time Input, Mandatory): 24-hour format. Must be after `StartTime` and within the same calendar day.
  * *Overlap Protection Warning:* Real-time check highlights overlaps.

---

### TRN-SCR-005: Course Authorization Matrix
* **Layout & Grid Structure:**
  * Simple two-column listing. Left: Selected courses. Right: Authorization date ranges.
* **Interactive Elements:**
  * **[Authorize Course]** button.
* **Input Form Fields & Validations:**
  * *Course Selection* (Searchable Dropdown, Mandatory): Queries active courses from Course Catalog.
  * *Authorized From* (Date Picker, Mandatory): Date when delivery authorization begins.
  * *Authorized To* (Date Picker, Optional): Must be after `Authorized From`.
  * *Super Admin Override Checkbox:* Visible only if verification documents are missing.

---

### TRN-SCR-006: Batch Allocation & Compensation Card
* **Layout & Grid Structure:**
  * Integrated card component on the Batch details screen under the Academics portal context.
* **Input Form Fields & Validations:**
  * *Trainer Selection* (Dropdown, Mandatory): Lists trainers authorized for this batch's course.
  * *Assignment Role* (Select, Mandatory): `Primary` (maps to `isPrimary` = true), `Assistant` (maps to `isPrimary` = false).
  * *Payment Basis* (Select, Mandatory): `PerHour`, `PerSession`, `PerStudent`, `Fixed`.
  * *Amount* (Number input, Mandatory): Numeric value with exactly 3 decimals. Must be greater than 0.000.
* **Interactive Elements:**
  * **[Assign Trainer]** button.
  * **[Remove Assignment]** icon: Triggers soft deletion flow.

---

## 3. Dynamic UI States

### 3.1 Form Validation Error States
* **Inline Indicators:** Form inputs display with a red border (`border-red-500`) and a micro-animation shake effect when focus leaves an invalid field.
* **System Code Callouts:** System error messages display directly below the invalid input, detailing the specific validator triggered. For example: "Time overlap detected with Muscat branch slot (10:00 - 12:00)."
* **Submission Block:** The "Save" button is disabled if form fields contain validation errors.

### 3.2 Loading Skeletons
* **Table Skeleton:** While resolving queries, the directory displays a multi-row shimmer effect styling placeholder cells.
* **Profile Skeleton:** Forms display grey layout blocks replicating input fields.

### 3.3 Empty States
* **No Trainers Found:** The registry table displays a centered card: "No trainers found matching the selected filters. Click 'Add Trainer' to register a new profile."
* **No Availability Defined:** The availability calendar displays: "No availability blocks configured for this branch. Schedulers will not be able to assign this trainer to batches."

### 3.4 Permission-Based UI Component Hiding
* **Financial Metrics Scoping:** The `Compensation Terms` card and payment metrics are hidden entirely from the screen for users without the `trainer:payment-read` permission, and edit capabilities are restricted to users holding `trainer:payment-write`.
* **Management Override Option:** The Super Admin override button for expired documents only appears if the logged-in user possesses `trainer:override-schedule`.
* **Branch Action Lockout:** If a trainer is registered in "Muscat" branch and a Branch Admin from "Salalah" views the profile, edit icons are replaced with lock icons.

---

## 4. Bilingual Layout Rules (LTR vs. RTL)

ASTI operates in Oman and requires bilingual support (English/Arabic). The UI must handle layout switches seamlessly.

| Element | English Layout (LTR) | Arabic Layout (RTL) |
| :--- | :--- | :--- |
| **Reading Direction** | Left-to-Right (`dir="ltr"`) | Right-to-Left (`dir="rtl"`) |
| **Sidebar Navigation** | Fixed on the left edge. | Fixed on the right edge. |
| **Grid Column Order** | Table columns read from left to right. | Columns mirror from right to left. |
| **Trainer Profile Photo** | Positioned in top-left of the workspace. | Positioned in top-right of the workspace. |
| **Input Labels & Icons** | Left-aligned labels; prefix icons on left. | Right-aligned labels; prefix icons on right. |
| **Numeric Precision (OMR)** | Formatted as `OMR 15.000` (Left symbol). | Formatted as `١٥٫٠٠٠ ر.ع.` (Right symbol). |
| **Calendar Timeline** | Hours progress left to right. | Hours progress right to left. |
| **Tab Controls** | Tabs align starting from the left. | Tabs align starting from the right. |
