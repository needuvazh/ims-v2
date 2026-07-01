# Functional Requirement Document (Part 3)
## Module 04: Admission & Enrollment Management – UI Screen Specifications & Components

---

## 1. Screen Inventory

### Admin & Registrar Portal Screens:
1.  **ADM-UI-SCR-001: Student Directory (Admission List & Student Directory)** – Roster of all admitted students and search index.
2.  **ADM-UI-SCR-002: Create Admission Form** – Registration form for personal details, document uploads, and branch selection.
3.  **ADM-UI-SCR-003: Student Profile Dashboard** – 360-degree card-based view of a student's personal details, documents, active enrollments, and ledger status.
4.  **ADM-UI-SCR-004: Create Enrollment Form** – Form to assign a student to a Course and specific Batch with automated pricing resolution.
5.  **ADM-UI-SCR-005: Enrollment Operations Console** – Branch-level view to approve, confirm, drop, and cancel enrollments.
6.  **ADM-UI-SCR-006: Batch Waitlist Manager** – Management tool to promote waitlisted students when seats open.

### Student Portal Screens:
7.  **STU-UI-SCR-001: Student Self-Registration Portal** – Online portal for students to submit details and upload documents.
8.  **STU-UI-SCR-002: Student Academic Dashboard** – Student view of active classes, schedules, and digital Student ID Card download.

---

## 2. Detailed Screen Specifications

### ADM-UI-SCR-001: Student Directory & Search Portal
*   **Layout & Grid Structure:**
    *   Dense, data-rich list layout designed for staff running wide desktop screens.
    *   Top section: Page header with page stats (Total Admitted, Active Enrollments, Pending Approvals) and "Register Student" quick-action button.
    *   Middle section: 4-column filter card (Branch selector, Course selector, Admission Status dropdown, Global Search bar).
    *   Bottom section: Full-width data table showing student records.
*   **Table Columns & Behaviors:**
    *   **Student ID** (`studentNumber`) – Link to Dashboard; sortable.
    *   **Full Name** (Resolved from linked `Person` record) – Sortable.
    *   **National / Civil ID** (`nationalId` from Person) – Text search match.
    *   **Primary Branch** – Filterable.
    *   **Admission Date** – Sortable; default descending order.
    *   **Active Enrollments** (Count badge) – Displays count of active courses.
    *   **Status Badge** (`Active`, `Suspended`, `Completed`).
    *   **Actions Menu** – Inline actions: View Details, Create Enrollment, Download ID Card.
    *   *Paging:* Fixed footer with page-size selector (10, 25, 50, 100) and page navigation.
*   **Filters:**
    *   `branchId` (defaults to user's assigned branch; disabled for branch-restricted staff).
    *   `status` (Active, Draft, Soft-Deleted).

---

### ADM-UI-SCR-002: Create Admission Form
*   **Layout & Grid Structure:**
    *   Two-column split grid with sticky right-side navigation sidebar.
    *   **Left Column:** Sectioned scrolling form.
    *   **Right Column:** Document upload queue and duplicate warnings display panel.
*   **Form Input Fields & Validations:**
    *   **Section 1: Identity & Linking**
        *   `Civil ID / National ID`: Text field. Required. Validation: Regex `^[0-9]{8,9}$` (for Omani Civil IDs) or Passport validation `^[A-Z0-9]{6,15}$`.
        *   `Nationality`: Dropdown. Required.
        *   `Date of Birth`: Date picker. Required. Invariant: Date of Birth must ensure age $\ge 12$ years.
        *   `Gender`: Dropdown select (Male, Female). Required.
    *   **Section 2: Contact Details**
        *   `First Name`: Text field. Required. Max length 100 characters.
        *   `Last Name`: Text field. Required. Max length 100 characters.
        *   `Mobile Number`: Text input with country code picker. Required. Validation: Regex `^\+968[79][0-9]{7}$` (for Omani numbers starting with 7 or 9).
        *   `Email`: Text input. Required. Validation: RFC 5322 regex validation.
        *   `Emergency Contact Name`: Text field. Required. Max length 150.
        *   `Emergency Contact Mobile`: Text field. Required. Same mobile regex validation.
    *   **Section 3: Admission Meta**
        *   `Admission Branch`: Dropdown. Defaults to user's home branch. Required.
        *   `Lead Source ID`: Dropdown (Inquiry, Social Media, Agent, Walk-In). Optional.
*   **Interactive Elements:**
    *   **"Search Existing Person" Button:** Floating action next to Civil ID input. Triggers an AJAX check of the database. If a record is matched, the system auto-fills name, date of birth, and email, disabling those inputs.
    *   **"Save Draft" / "Submit for Approval" buttons:** Located in the footer control bar.

---

### ADM-UI-SCR-004: Create Enrollment Form
*   **Layout & Grid Structure:**
    *   Dense, card-based layout divided into three columns:
        *   **Col 1 (Left, 30%):** Student profile summary card (non-editable).
        *   **Col 2 (Middle, 45%):** Program allocation form.
        *   **Col 3 (Right, 25%):** Real-time pricing panel displaying cost breakdowns.
*   **Form Input Fields & Validations:**
    *   `Course ID`: Searchable dropdown. Required. Filters to active courses.
    *   `Batch ID`: Searchable dropdown. Required. Filters to batches corresponding to `Course ID` with start date $\ge \text{today}$.
    *   `Enrollment Type`: Radio selector (`Regular`, `Corporate`, `WalkIn`, `Online`). Required.
    *   `Corporate Participant ID`: Searchable select list. Visible/Required only when `Enrollment Type` = `Corporate`.
    *   `Manual Discount Amount`: Decimal number input. Validated against user's discount limit permissions.
    *   `Discount Code / Promo`: Text input with "Apply" verification button.
*   **Real-Time Pricing Panel (Dynamic Component):**
    *   Reacts immediately to changes in `Course`, `Batch`, `Enrollment Type`, or discounts.
    *   **Displays:**
        *   *Course Default Price:* OMR $X$
        *   *Batch Override Price:* OMR $Y$ (if applicable, highlighted in green)
        *   *Applied Discount:* OMR $-Z$
        *   *Final Net Price:* OMR $A$
        *   *Batch Capacity Count:* Displays "Seats remaining: $N$ of $Max$". If $N \le 2$, displays warning badge.

---

## 3. Dynamic UI States

### Form Validation Error States:
*   **Inline Field Errors:** Under-performing inputs are styled with a solid border (`border-red-500`) and a clear error label below the input box (e.g. *"Please enter a valid Omani Civil ID (8 or 9 digits only)"*).
*   **Form-Level Banner:** If validation fails on submit, a red banner displays at the top of the form: *"Registration failed. Please check the highlighted fields below."*
*   **Dirty State Warning:** If a user edits fields and clicks "Back" or "Cancel" without saving, the system blocks navigation and prompts: *"You have unsaved changes. Are you sure you want to discard them?"*

### Loading Skeletons:
*   To keep layouts responsive, table views and forms utilize pulse animation card layouts (`animate-pulse`) representing lines and input components while fetching data from the API:
    ```text
    |=========================================|
    |  [=======]   [==============]   [===]   |  <-- Table Header Skeletons
    |-----------------------------------------|
    |  (   )   | ================== | ( ) |   |  <-- Data row skeleton blocks
    |  (   )   | ================== | ( ) |   |
    |=========================================|
    ```

### Empty States:
*   When a search or filter yields no results, display a centered illustration card with a clean action:
    *   **Visual:** Grayscale magnifying glass icon.
    *   **Heading:** *"No Students Found"*
    *   **Helper Text:** *"Try adjusting your filter options or register a new student profile."*
    *   **Action Button:** *"Create New Admission"* (if user holds `ADMISSION_CREATE` permission).

### Permission-Based Visibility Guard (Server & Client Rendered):
*   Elements are conditionally hidden in the UI according to roles:
    *   `Delete` buttons are visible only to `Super Admin`.
    *   `Approve` and `Reject` action buttons on the Admission Detail view are visible only to roles possessing `ADMISSION_APPROVE` (e.g., Branch Manager).
    *   `Manual Discount` inputs are locked and read-only if the user does not possess `ENROLLMENT_OVERRIDE` or local override credentials.

---

## 4. Bilingual Layout Rules (English & Arabic)

ASTI IMS serves native English and Arabic speakers. The UI must swap directions seamlessly based on the active language token.

```text
English (LTR)                               Arabic (RTL)
+------------------------------------+      +------------------------------------+
| Sidebar | Header                   |      |                   Header | Sidebar |
|---------+--------------------------|      |--------------------------+---------|
|         | Name: [ Ahmed Al-Omani ] |      | [ أحمد العماني ] :الاسم  |         |
|         | Phone: [ +96899123456 ]  |      |  [ +٩٦٨٩٩١٢٣٤٥٦ ] :الهاتف|         |
|         |                          |      |                            |         |
|         |              [ Submit ]  |      |  [ إرسال ]                 |         |
+------------------------------------+      +------------------------------------+
```

### Layout Rules:
1.  **Direction Attribute:** Swaps the HTML element between `dir="ltr"` and `dir="rtl"`.
2.  **Flex/Grid Reordering:** Tailwind/CSS classes must utilize logical layouts (e.g., `start` instead of `left`, `end` instead of `right`) to ensure components align properly.
3.  **Typography Scale:** 
    *   English: Fonts default to `Inter` or `Outfit` with standard line-heights.
    *   Arabic: Fonts fall back to `Cairo` or `Tajawal` with a line-height multiplier ($+15\%$) to prevent diacritics and Arabic letters from clipping.
4.  **Form Alignments:** Labels align to the top-left in English and top-right in Arabic. Input values align dynamically to the start margin.
5.  **Icon Mirroring:** Arrow icons, chevron links, and navigation page keys are mirrored horizontally for RTL view. Brand logos, checks, and lock icons remain unmirrored.
