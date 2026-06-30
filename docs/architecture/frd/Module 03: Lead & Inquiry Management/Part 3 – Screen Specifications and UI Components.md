# ASTI IMS: Functional Requirement Document
## Module 03: Lead & Inquiry Management
### Part 3 – Screen Specifications and UI Components

---

## 1. Screen Inventory

All user interfaces within the Lead & Inquiry Management module are internal-facing and resides within the Admin Portal (used by Super Admins, Branch Admins, and Counselors). External students and trainers do not have access to these screens.

| Screen ID | Screen Name | Target Portal | Primary Actors |
| :--- | :--- | :--- | :--- |
| **LEAD-UI-001** | Inquiry List Workspace | Admin Portal | Branch Admin, Counselor, Receptionist |
| **LEAD-UI-002** | Create/Edit Inquiry Form | Admin Portal | Counselor, Receptionist |
| **LEAD-UI-003** | Lead Pipeline Board (Kanban) | Admin Portal | Branch Admin, Counselor |
| **LEAD-UI-004** | Lead List Workspace | Admin Portal | Branch Admin, Counselor |
| **LEAD-UI-005** | Lead Detail Workspace | Admin Portal | Branch Admin, Counselor |
| **LEAD-UI-006** | Schedule Follow-up Dialog | Admin Portal | Counselor |
| **LEAD-UI-007** | Log Follow-up Outcome Dialog | Admin Portal | Counselor |
| **LEAD-UI-008** | Lead Settings Configuration | Admin Portal | Super Admin, Branch Admin |

---

## 2. Detailed Screen Specifications

### LEAD-UI-001: Inquiry List Workspace
* **Layout & Grid Structure**: 
  * 3-column top filter bar (Grid-cols-1 md:grid-cols-3 gap-4).
  * Main dense data table occupying 100% width with sticky header.
  * Right-hand collapsible slide-out drawer (350px width) for quick inquiry previews.
* **Interactive Elements**:
  * "Add Inquiry" Button (Primary action - calls **LEAD-UI-002**).
  * "Export CSV" Button (Action-level permission `lead.export` guarded).
  * "Filter Options" Collapsible toggle.
* **Filter Panel Controls**:
  * *Search Bar*: Searches name, email, phone (with Debounce of 300ms).
  * *Branch Selector*: Dropdown populated with user’s authorized branches (Default: user's default branch).
  * *Status Selector*: Multi-select dropdown (Values: Captured, Qualified, Closed).
* **Table Columns & Behaviors**:
  * `Inquiry Number`: Text (Sortable, links to detail drawer).
  * `Prospect Name`: Text (Combined First & Last name, sortable).
  * `Mobile Number`: Text (LTR aligned, un-sortable).
  * `Interested Course`: Badge (Course Code, e.g. `HSE-01`, sortable).
  * `Lead Source`: Badge (Source label, sortable).
  * `Created Date`: DateTime format (Sortable, default sort: descending).
  * `Status`: Colored Badge (`Captured` = Blue, `Qualified` = Green, `Closed` = Gray).
  * `Actions`: Menu button with options (View, Edit, Qualify, Close).
* **Pagination**: Fixed footer with items-per-page selector (25, 50, 100) and page navigation buttons.

---

### LEAD-UI-002: Create/Edit Inquiry Form
* **Layout & Grid Structure**:
  * Two-column form layout inside a modal container (width: max-w-2xl).
  * Spaced using dense styling rules (py-2 px-3) to fit maximum fields above the fold.
* **Input Form Fields & Validation Rules**:
  1. **Branch** (Dropdown Select):
     * *Validation*: Mandatory. Value must reference a valid UUID from the user's branch access list.
     * *Error Message*: "Please select an authorized branch."
  2. **First Name** (Text Input):
     * *Validation*: Mandatory. Minimum length 2, maximum 100 characters. Pattern: Alphabetical characters and spaces only.
     * *Error Message*: "First name must contain 2-100 alphabetic characters."
  3. **Last Name** (Text Input):
     * *Validation*: Mandatory. Minimum length 2, maximum 100 characters. Pattern: Alphabetical characters and spaces only.
     * *Error Message*: "Last name must contain 2-100 alphabetic characters."
  4. **Mobile Number** (Text Input):
     * *Validation*: Mandatory. Pattern: Omani number syntax `^(?:\+968)?[79]\d{7}$` (starts with optional +968 followed by 7 or 9 and 7 digits).
     * *Error Message*: "Please enter a valid Omani mobile number (e.g. +968 91234567)."
  5. **Email Address** (Text Input):
     * *Validation*: Optional. Must match standard email pattern `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`.
     * *Error Message*: "Invalid email address format."
  6. **Lead Source** (Select Dropdown):
     * *Validation*: Mandatory. Value must reference an active `LookupValue` configuration.
     * *Error Message*: "Select a valid intake channel."
  7. **Interested Course** (Select Dropdown):
     * *Validation*: Optional. References active `Course` catalog items.
     * *Error Message*: "Select a valid course."
  8. **Priority** (Radio Group Select):
     * *Values*: Low, Medium, High, Critical. Default: Medium.
  9. **Notes** (Text Area):
     * *Validation*: Optional. Maximum 500 characters.
* **Form Action Buttons**:
  * "Cancel": Closes dialog, discards changes.
  * "Save & Close": Submits form, redirects to list screen.
  * "Save & Qualify": Submits form, opens qualification modal directly.

---

### LEAD-UI-003: Lead Pipeline Board (Kanban)
* **Layout & Grid Structure**:
  * Horizontal scrolling viewport with columns corresponding to active Lead Stages (New, Contacted, FollowUp, Qualified, Negotiation).
  * Column containers have independent vertical scrollbars to prevent page-level scrolling.
* **Interactive Elements**:
  * Drag-and-Drop Card handle: Moving card from one column to another triggers a state transition request.
  * "Add Lead" floating action button.
* **Card Details**:
  * Dense card layout containing: Lead Number, Prospect Name, Interested Course badge, Days in Stage counter, Priority indicator flag (colored border: Red = High/Critical, Gray = Low), and Next Follow-up calendar icon.
* **Drag-and-Drop Invariant checks**:
  * Dropping card in a forbidden column based on the Stage Transition Matrix (**BR-LEAD-004**) returns the card to its source column and displays a validation alert toast.
  * Dropping a card in the `Won` column triggers a pop-up redirecting to the document upload validation panel.

---

### LEAD-UI-004: Lead List Workspace
* **Layout & Grid Structure**:
  * Multi-column filter bar at top (Search, Branch, Counselor, Course, Lead Source, Date range).
  * Dense tabular layout occupying full screen width.
* **Table Columns & Behaviors**:
  * `Lead Number`: Text (Sortable, clickable link to workspace).
  * `Prospect Name`: Text (Sortable).
  * `Mobile`: LTR aligned.
  * `Stage`: Colored Badge (Stage-specific themes, e.g. `Negotiation` = Orange, `Lost` = Red).
  * `Counselor`: Text (Sortable).
  * `Next Follow-up`: DateTime text. If follow-up is overdue (past current time), text color changes to red with warning icon.
  * `Last Contact Date`: Date format (Sortable).
  * `Actions`: Context menu button.
* **Mass Actions Panel**:
  * Displays checkbox list on rows. Selecting multiple rows displays action bar at footer with options: "Bulk Assign Counselor" and "Bulk Update Stage" (guarded by permission checks).

---

### LEAD-UI-005: Lead Detail Workspace
* **Layout & Grid Structure**:
  * Split screen layout:
    * Left Panel (1/3 width): Fixed profile card containing name, contact details, assigned counselor, current stage, and action shortcuts (Log Call, Schedule Follow-up, Convert, Mark Lost).
    * Right Panel (2/3 width): Tabbed container displaying detail sections.
* **Tabs Inventory**:
  1. **Profile details**: Extensible personal data (National ID, Date of birth, Address).
  2. **Follow-up Logs**: Table of historical interactions and outcomes.
  3. **Activity Timeline**: Chronological vertical feed of system events (Lead created, status changed, documents updated).
  4. **Documents**: List of uploaded files (Civil ID copy, Passport scan) with status verification tags.
* **Permission-based Controls Visibility**:
  * "Assign Counselor" button visible only if user roles include `lead.assign` permission.
  * "Convert to Admission" action button active only if lead stage is `Won` or `Qualified` and user has `lead.won` permission.

---

### LEAD-UI-006: Schedule Follow-up Dialog
* **Layout & Grid Structure**: Modal popup window (max-w-md).
* **Input Fields & Validations**:
  1. **Follow-up Date & Time** (DateTime Selector):
     * *Validation*: Mandatory. Must be equal to or greater than `Current Date & Time + 5 minutes`.
     * *Error Message*: "Follow-up schedule must be in the future."
  2. **Follow-up Type** (Dropdown Select):
     * *Values*: Call, WhatsApp, Email, Visit. Mandatory.
  3. **Agenda / Details** (Text Area):
     * *Validation*: Mandatory. Minimum length 5 characters, maximum 250 characters.
     * *Error Message*: "Provide a short agenda for the scheduled contact."

---

### LEAD-UI-007: Log Follow-up Outcome Dialog
* **Layout & Grid Structure**: Modal popup window (max-w-lg).
* **Input Fields & Validations**:
  1. **Outcome Type** (Dropdown Select):
     * *Values*: Answered, Busy, SwitchedOff, NoResponse, NotInterested, Interested, VisitScheduled. Mandatory.
  2. **Outcome Details & Conversation Notes** (Text Area):
     * *Validation*: Mandatory. Minimum length 15 characters, maximum 1000 characters.
     * *Error Message*: "Enter detailed outcome notes (minimum 15 characters)."
  3. **Schedule Next Interaction** (Checkbox Toggle):
     * Default: False. Toggling to True dynamically displays date-time selectors matching **LEAD-UI-006** parameters.

---

### LEAD-UI-008: Lead Settings Configuration Panel
* **Layout & Grid Structure**: Dense tabular view with sections for "Sources" and "Stages".
* **Interactive Elements**:
  * "Add New Source" button.
  * "Reorder Stages" drag-and-drop handles.
* **Configuration Form fields**:
  * `Name`: Unique string (lowercase converted code stored in database).
  * `Label (EN)`: String (mandatory).
  * `Label (AR)`: String (mandatory, Arabic font القاهرة default).
  * `Display Order`: Numeric (mandatory).
  * `Effective Start Date`: Date (mandatory).
  * `Effective End Date`: Date (optional).

---

## 3. Dynamic UI States

### 3.1 Form Validation Error States
* Inputs failing validation must highlight in solid red borders (`border-destructive`).
* Dynamic error messages must render directly beneath the input field in red text size `xs` (`text-destructive`).
* Focus is automatically shifted to the first invalid field upon clicking the submit button.

### 3.2 Loading Skeletons
* Tabular screens must display a multi-row skeleton grid with pulsing loading animation (`animate-pulse`) for up to 800ms before rendering data rows.
* Detail panels must use rounded gray block skeletons matching the grid footprint.

### 3.3 Empty States
* If search filters return zero results, tables must hide the header and render a centered vector placeholder containing the text: "No prospects match your search criteria. Try modifying your filters or add a new record."

### 3.4 Permission-Based UI Hiding
* Elements like "Reassign Counselor", "Add New Source", and "Mass Action Bar" must be removed from the DOM if the server-returned user token scope does not evaluate to `true` for the corresponding permission key (e.g. `lead.assign`, `lead.config`). UI hiding is backed by server-side endpoint guards.

---

## 4. Bilingual Layout Rules (English LTR / Arabic RTL)

The application supports bilingual toggling (English/Arabic). The layout must adapt to the selected locale using Tailwind's `dir="rtl"` standard.

| UI Element | English (LTR) Layout | Arabic (RTL) Layout |
| :--- | :--- | :--- |
| **Reading Direction** | Left-to-Right | Right-to-Left |
| **Primary Sidebar Navigation**| Anchored to left viewport margin | Anchored to right viewport margin |
| **Alignment of Labels** | Left aligned | Right aligned |
| **Grid Column Ordering** | 1, 2, 3 (Left-to-Right) | 3, 2, 1 (Right-to-Left) |
| **Icon Rotations** | Standard chevron pointing right (`>`) for forward steps | Chevron mirrored pointing left (`<`) for forward steps |
| **Typography Family** | Inter, sans-serif | Cairo, sans-serif |
| **Table Action Buttons** | Aligned to extreme right column | Aligned to extreme left column |
| **Numerical/Phone Fields** | Left-aligned, LTR format | Left-aligned, LTR format (preserves digit order) |
