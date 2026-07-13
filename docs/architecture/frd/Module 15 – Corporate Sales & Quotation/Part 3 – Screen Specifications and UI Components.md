# Part 3 – Screen Specifications and UI Components

## Module 15 – Corporate Sales & Quotation

---

# 1. Overview & UI Guidelines

All screens in Module 15 – Corporate Sales & Quotation must conform to the ASTI Admin Portal design guidelines:
- **Responsive Layout**: Sidebar-driven layouts collapsing to burger menus on mobile screens.
- **RTL & LTR Bilingual Support**: Complete toggle support for Arabic/English with swapped alignment for labels, text containers, and action panels.
- **Branch Scope Indicator**: A persistent header dropdown listing the active authorized branch context (e.g. Muscat, Salalah, Sohar).
- **Access Guard**: Screens must display a loading spinner until JWT-based session and permission flags are parsed. If unauthorized, they must redirect to a `403 Forbidden` screen.

---

# 2. Detailed Admin Portal Screen Specifications

## 2.1 Corporate Sales Dashboard
- **Purpose**: High-level overview of the sales funnel, visits, follow-up calendar alerts, and pending quotes.
- **Route**: `/admin/corporate-sales/dashboard`
- **Permission**: `corporateSales.lead.read`
- **UI Widgets**:
  - **KPI Cards**: Daily visits count, active leads count, pending quotations value (OMR), lost opportunities percentage.
  - **Funnel Component**: Graphical representation of pipeline stages: `New` -> `VisitPlanned` -> `VisitCompleted` -> `QuotationSent` -> `Confirmed`.
  - **Follow-up Panel**: Mini list of tasks overdue or due today.
- **Branch Scope Control**: Restricts chart metrics to the selected branch. Consolidated views require the `corporateSales.report.read` permission.
- **Empty State**: Displays "No active sales pipeline data found for this branch." with a CTA button: "Log New Visit".

---

## 2.2 Corporate Sales Lead List
- **Purpose**: Lists all active and inactive corporate sales leads.
- **Route**: `/admin/corporate-sales/leads`
- **Permission**: `corporateSales.lead.read`
- **UI Components**:
  - **Search & Filter Bar**: Free-text search (Account Name, Industry), Dropdowns (Stage, Owner, Date Range).
  - **Table Columns**: Lead Code, Account Name, Expected Value (OMR), Stage, Sales Owner, Last Activity Date, Actions (View Detail, Log Visit, Create Quote).
- **Branch Scope**: Enforces row-level filtering based on user's authorized branch list.
- **Loading State**: Shimmer blocks covering the table body.

---

## 2.3 Corporate Sales Lead Create/Edit
- **Purpose**: Allows logging a new lead or editing details of an existing prospect.
- **Route**: `/admin/corporate-sales/leads/new` or `/admin/corporate-sales/leads/[id]/edit`
- **Permission**: `corporateSales.lead.create` (create) or `corporateSales.lead.update` (edit)
- **UI Fields**:
  - `corporateAccountId` (Select dropdown pointing to prospective organizations)
  - `salesOwnerId` (Select dropdown of authorized marketing executives)
  - `expectedValue` (Numeric field, OMR)
  - `expectedCloseDate` (Datepicker field)
  - `stage` (Select dropdown, defaulted to `New`)
- **Validation**:
  - Expected value must be positive. Expected close date must be in the future.
- **Bilingual**: Labels swap directions dynamically under Arabic/English locale toggles.

---

## 2.4 Corporate Sales Lead Detail
- **Purpose**: 360-degree view of a B2B sales lead, showing visit logs, history, and active quotes.
- **Route**: `/admin/corporate-sales/leads/[id]`
- **Permission**: `corporateSales.lead.read`
- **Tab Layout**:
  - **Overview Tab**: Key metadata (Owner, Stage, Expected Value, Target Dates).
  - **Visit History Tab**: List of logged visits with discussion notes.
  - **Follow-Up Tab**: Calendar tasks and scheduling histories.
  - **Quotations Tab**: All related drafts, approvals, and revision versions.

---

## 2.5 Marketing Visit Log Modal / Panel
- **Purpose**: Log execution and discussion details of a marketing visit.
- **Route**: Opened as drawer/modal from lead list or detail page.
- **Permission**: `corporateSales.visit.create`
- **UI Fields**:
  - `contactPersonName` (Bilingual text fields)
  - `contactNumber` (Numeric text field with default international suffix validation)
  - `email` (Standard email input)
  - `meetingDate` (Datepicker, defaulted to today)
  - `discussionNotes` (TextArea)
  - `coursesDiscussed` (Multi-select dropdown from Course Catalog)
  - `expectedCandidates` (Integer)
- **Validation**: Reject empty contact person or invalid email. Meeting date must not be in the future.

---

## 2.6 Follow-up Calendar / List
- **Purpose**: Tracks follow-up reminders.
- **Route**: `/admin/corporate-sales/follow-ups`
- **Permission**: `corporateSales.followUp.create`
- **UI Views**: Toggle between Month Calendar view and list view of follow-ups.
- **Action buttons**: Mark Complete, Reschedule.

---

## 2.7 Follow-up Detail / Outcome Modal
- **Purpose**: Records the outcome of a completed follow-up task.
- **Route**: Triggered from calendar or task list.
- **Permission**: `corporateSales.followUp.complete`
- **UI Fields**:
  - `outcome` (Select: Quotation Requested, Meet Again, No Interest/Lost)
  - `notes` (TextArea for conversation feedback)
  - `nextFollowUpDate` (DatePicker, visible if outcome is "Meet Again")
- **Validation**: Next date must be in the future if set.

---

## 2.8 Quotation List
- **Purpose**: Lists B2B quotations.
- **Route**: `/admin/corporate-sales/quotations`
- **Permission**: `corporateSales.quotation.read`
- **Columns**: Quote Number, Company Name, Version, Total Amount (OMR), Profit %, Status (Draft, Approved, Sent, Accepted), Action (Edit, Costing, Print PDF).

---

## 2.9 Quotation Create/Edit
- **Purpose**: Creates or modifies quotation items.
- **Route**: `/admin/corporate-sales/quotations/new` or `/admin/corporate-sales/quotations/[id]/edit`
- **Permission**: `corporateSales.quotation.create`
- **Lock Rules**: Rejects modifications if status is not `DRAFT` or `Rejected`.

---

## 2.10 Quotation Line Item Editor
- **Purpose**: Embedded component to manage itemized rows.
- **UI Layout**: Dynamic table with add/remove row handlers.
- **Inputs per row**:
  - `courseId` (Dropdown searching active courses)
  - `quantity` (Nominated candidates count)
  - `unitPrice` (OMR)
  - `discountAmount` (OMR, default `0.00`)
- **Calculations**: Auto-updates subtotal, applies 5% VAT default, and outputs final totals dynamically on change.

---

## 2.11 Costing Sheet Screen
- **Purpose**: Input estimates and view margins.
- **Route**: `/admin/corporate-sales/quotations/[id]/costing`
- **Permission**: `corporateSales.costing.read`
- **UI Structure**: Split pane layout:
  - **Left Pane (Inputs)**: Text inputs for direct costs (trainer, travel, accommodation, materials) and indirect costs (admin overhead, marketing).
  - **Right Pane (Calculations)**: KPI cards showing calculated Total Cost, Profit Amount (OMR), and Gross Profit Margin %.
  - **Alert Banner**: Highlights red if Profit % is below the 25% threshold, warning that submission will trigger an approval queue.

---

## 2.12 Quotation Preview / PDF
- **Purpose**: Generates and previews client-ready quote PDF documents.
- **Route**: `/admin/corporate-sales/quotations/[id]/preview`
- **Permission**: `corporateSales.quotation.read`
- **Features**: Print layout rendering, download PDF action button.

---

## 2.13 Quotation Approval Queue
- **Purpose**: Displays pending approvals for branch managers.
- **Route**: `/admin/corporate-sales/approvals`
- **Permission**: `corporateSales.quotation.approve`
- **Layout**: Queue table showing submitter name, quote number, margin %, and value.
- **Actions**: Approve (input remarks), Return for Revision (input feedback).

---

## 2.14 Quotation Revision History
- **Purpose**: View changes across quotation negotiations.
- **Route**: Drawer on the quotation detail screen.
- **Permission**: `corporateSales.quotation.read`
- **Details**: Vertical timeline showing version increments (v1, v2, v3), name of revising manager, and click-to-expand JSON differences.

---

## 2.15 Confirmation / LPO Upload Modal
- **Purpose**: Commercially close a deal by logging the official LPO.
- **Permission**: `corporateSales.salesOrder.confirm`
- **UI Fields**:
  - `LpoFile` (Drag & drop file upload, PDF/PNG limits)
  - `receivedDate` (DatePicker)
  - `remarks` (Text)
- **Validation**: Rejects submit if no file is selected.

---

## 2.16 Sales Order Create / View
- **Purpose**: Displays standard sales order parameters.
- **Route**: `/admin/corporate-sales/orders/[id]`
- **Permission**: `corporateSales.salesOrder.create`
- **Details**: Displays LPO link, contract values, billing models, and line items.

---

## 2.17 Training Handoff Screen
- **Purpose**: Displays delivery handoff progress.
- **Route**: `/admin/corporate-sales/orders/[id]/handoff`
- **Permission**: `corporateSales.training.handoff`
- **Metrics**: Highlights downstream project code, batch links, and nomination statuses loaded from Module 14.

---

## 2.18 Lost Opportunity Modal
- **Purpose**: Logs lost deal reasons.
- **UI Fields**:
  - `lostReason` (Select: Price, Competitor, No Budget, Postponed)
  - `additionalRemarks` (TextArea)

---

## 2.19 Marketing Performance Reports
- **Purpose**: Branch-scoped analytics.
- **Route**: `/admin/corporate-sales/reports/marketing`
- **Permission**: `corporateSales.report.read`
- **Charts**: Visits-to-lead conversion ratios, monthly sales quotas.

---

## 2.20 Audit Trail View
- **Purpose**: Detailed security logs.
- **Route**: Tab on lead and quotation detail screens.
- **Permission**: `corporateSales.audit.read`
- **Columns**: Timestamp, User, Action, Version, Margin change, Details.
