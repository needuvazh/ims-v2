# B2B Corporate Sales UI Alignment Design Specification

## UI Architecture & Layout Structure

All B2B corporate sales screens will adopt the Organic & Earthy / Old Money Tech aesthetic defined in [design_guidelines.json](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/design_guidelines.json). Specifically, components will use:
- Deep navy typography (`text-slate-900`/`text-indigo-950`) for headers.
- Warm gray borders (`border-slate-200`) and clean white backgrounds.
- High-contrast, interactive elements with hover elevation (`hover-lift` class, `transition-all duration-300`).
- Consistent page wrappers: `AdminFormPageLayout` for creations/updates and `AdminListPageLayout` for search grids and lists.

---

## 1. Create B2B Quotation Form
- **Path**: `apps/admin-portal/app/(protected)/corporate-sales/quotations/create/page.tsx`
- **Route Parameters**: Accepts `?leadId={uuid}`.
- **Server Data Fetch**:
  - Resolves lead information if `leadId` is provided. If `leadId` is missing, fetches list of active B2B leads via Prisma to display a dropdown selector.
  - Fetches list of published courses for line item selection.
- **Interactive Form Schema (`createB2BQuotationSchema`)**:
  ```typescript
  const createB2BQuotationSchema = z.object({
    corporateAccountId: z.string().uuid("Please select a Corporate Account"),
    corporateSalesLeadId: z.string().uuid("Please select a Lead ID"),
    quotationDate: z.string().min(1, "Quotation date is required"),
    validUntil: z.string().min(1, "Validity date is required"),
    branchId: z.string().uuid("Please select a Branch"),
    lineItems: z.array(z.object({
      courseId: z.string().uuid("Select course"),
      quantity: z.number().int().positive("Quantity must be at least 1"),
      unitPrice: z.number().positive("Unit price must be positive"),
    })).min(1, "At least one course line item must be added"),
  });
  ```
- **Real-Time Price Telemetry**:
  - Automatically calculates line item totals: `quantity * unitPrice`.
  - Calculates subtotal = `sum(line item totals)`.
  - Calculates 5% VAT = `subtotal * 0.05`.
  - Calculates totalAmount = `subtotal * 1.05`.
- **UI Mockup Layout**:
  - Single column with full width layout.
  - Left panel: Lead, dates, and dynamic table of line items with "Add Course", "Remove Item" dynamic triggers.
  - Right panel: Subtotal, VAT, and Estimated Grand Total with a sticky "Generate Quotation Proposal" primary CTA.

---

## 2. Quotation Details Screen
- **Path**: `apps/admin-portal/app/(protected)/corporate-sales/quotations/[id]/page.tsx`
- **Data Fetching**:
  - Fetches the quotation details including line items, costing sheet, corporate account profile, and linked sales lead.
- **UI Design Layout**:
  - Standard `PageHeader` showing Quotation Number, Date, Status badge, and "Back to Quotations" button.
  - Two-column grid (Bento layout):
    - **Main panel (Left - col-span-8)**:
      - Client Info Card (Name, Code, Contact details, Credit limits).
      - Proposal details Card (Validity, Date of issue).
      - Line Items Table: Lists all courses, quantities, unit prices, and subtotal.
    - **Sidebar panel (Right - col-span-4)**:
      - Financial Summary: Detailed breakdown (Subtotal, VAT, Grand Total).
      - Costing telemetry: Displays profit margin percentage and gross profit amount if the costing sheet is configured.
      - Action Bar:
        - If status is `Draft`: Shows "Configure Costing Sheet" (redirecting to `/costing`) and "Submit for Manager Review".
        - If status is `SubmittedForApproval`: Displays warning banner: "Locked. Pending Manager Review."
        - If status is `Approved` or `Sent`: Shows "Confirm Win & Generate Sales Order".

---

## 3. B2B Sales Orders Alignment
- **Path**: `apps/admin-portal/app/(protected)/corporate-sales/orders/page.tsx`
- **Current Issue**: The page is split into a create form on the left (occupying 1/3) and active list on the right (occupying 2/3), causing cramming.
- **Alignment Solution**:
  - Render a clean, full-width `ResponsiveDataTable` of active sales orders.
  - Replace the static create card with a "Confirm Won Sales Order" Button at the page header.
  - Clicking the button launches a standard slide-over `Dialog` containing the order confirmation inputs (Quotation Reference selector, Order Date, LPO document ID / Reference Text input).
  - Validation ensures order date is in the correct format and LPO reference is supplied.

---

## 4. Manager Approvals Queue Layout
- **Path**: `apps/admin-portal/app/(protected)/corporate-sales/approvals/page.tsx`
- **Alignment Solution**:
  - Present pending approvals in a clean list table showing Quotation Number, Client Account Name, Selling Price, Direct Costs, and Margin percentage.
  - Add a "Review & Decide" action button to the table row.
  - Clicking this button opens a right-hand slide-over sheet (Drawer component) showing the costing sheet details (itemized costs for trainer, travel, lodging, venue, admin, etc.).
  - Bottom of the slide-over contains a Remarks textarea input field, a red "Reject Proposal" button, and an emerald "Approve (Manual Override)" button.
