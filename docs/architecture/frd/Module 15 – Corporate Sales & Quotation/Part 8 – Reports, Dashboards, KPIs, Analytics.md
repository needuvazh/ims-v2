# Part 8 – Reports, Dashboards, KPIs, Analytics

## Module 15 – Corporate Sales & Quotation

---

# 1. Module Key Performance Indicators (KPIs)

The system computes the following B2B sales metrics in real-time, isolated by the user's active branch:

1.  **Lead Conversion Rate (%)**:
    $$\text{Conversion Rate} = \left( \frac{\text{Total Confirmed Leads}}{\text{Total Registered Leads}} \right) \times 100$$
2.  **Average Gross Profit Margin (%)**:
    $$\text{Avg Margin} = \frac{\sum \text{profitPercentage}}{\text{Total Costing Sheets}}$$
3.  **B2B Pipeline Value (OMR)**: The sum of `expectedValue` for all active leads in `New`, `VisitPlanned`, `VisitCompleted`, `QuotationSent`, or `UnderDiscussion` stages.
4.  **Average Opportunity Cycle Time (Days)**: The average duration between `Lead.createdAt` and `SalesOrder.orderDate` for won deals.
5.  **Lead-to-Visit Velocity (Days)**: Average days from lead creation to the first logged `CorporateMarketingVisit`.

---

# 2. Marketing Dashboard Layout

The **Marketing Dashboard** acts as the primary B2B operational view for representatives and managers. It displays:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        B2B Marketing Dashboard                         │
├────────────────────────────────────────────────────────────────────────┤
│  [ KPI: Logged Visits ]   [ KPI: Leads Value ]   [ KPI: Avg Margin ]   │
│  Count: 42 (Muscat)       OMR 85,400.000         31.50%                │
├───────────────────────────┬────────────────────────────────────────────┤
│  Pipeline Funnel          │  Follow-Up Reminders Due Today             │
│  - New: [ 10 ]            │  1. OQ Group - Call (Ahmed Al-Riyami)      │
│  - Visit Complete: [ 15 ] │  2. PDO Muscat - Email (Fatima Al-Mamari)  │
│  - Quotation Sent: [ 8 ]  │  3. Sohar Port - Visit (Ahmed Al-Riyami)   │
│  - Confirmed: [ 9 ]       │                                            │
└───────────────────────────┴────────────────────────────────────────────┘
```

---

# 3. Operational B2B Reports

All reports support export to CSV, Excel, or print-ready PDF formats, and enforce strict server-side `branchId` scoping.

## 3.1 Meeting & Visit Report
- **Purpose**: Tracks marketing executive visits and outcomes.
- **Filters**: Meeting Date Range, Executive Owner, Corporate Account.
- **Table Columns**: Visit Date, Account Name, Contact Person, Contact Phone, Discussion Notes Summary, Courses Discussed, Expected Candidates, Sales Lead Code.

## 3.2 Quotation Report
- **Purpose**: Lists sent and pending proposals.
- **Filters**: Quotation Date Range, Status, Total Value Range.
- **Table Columns**: Quote Number, Quote Date, Validity Date, Account Name, Total Amount (OMR), Margin %, Version, Status, Approver Name.

## 3.3 Quotation Revision & Approval History
- **Purpose**: Audits quotation edits and manager approval margins.
- **Filters**: Approver User, Margin % Range, Date Range.
- **Table Columns**: Quote Number, Version, Revising User, Revision Reason, Margin %, Value, Approver Name, Remarks, Approval Date.

## 3.4 Costing & Profitability Margin Analysis Report
- **Purpose**: Audits B2B margins to prevent loss-making bids.
- **Filters**: Profit % Range, Course Name, Total Cost Range.
- **Table Columns**: Quote Number, Course Code, Course Name, Net Selling Price, Direct Costs, Indirect Costs, Total Cost, Profit Amount, Profit Margin %.

## 3.5 Lost Opportunity Report
- **Purpose**: Identifies blockages in the commercial sales funnel.
- **Filters**: Loss Reason, Sales Owner, Value Range.
- **Table Columns**: Lead Code, Account Name, Expected Value, Date Lost, Primary Reason, Remarks, Sales Owner.

---

# 4. Read Models & Analytics Projections

To prevent complex SQL joins across transactional tables during dashboard loads, the module exposes a read-only projection view:

### `CorporateSalesPerformanceProjection`
- `branchId`: `UUID`
- `salesOwnerId`: `UUID`
- `totalVisitsLogged`: `INTEGER`
- `activeLeadsCount`: `INTEGER`
- `pipelineValue`: `DECIMAL(18,3)`
- `averageMargin`: `DECIMAL(5,2)`
- `confirmedDealsCount`: `INTEGER`
- `lostDealsCount`: `INTEGER`
- `lastUpdated`: `TIMESTAMPTZ(6)`
