# ASTI IMS: Functional Requirement Document
## Module 03: Lead & Inquiry Management
### Part 8 – Reports, Dashboards, KPIs, Analytics

---

## 1. Module-Specific Key Performance Indicators (KPIs)

These metrics evaluate the efficiency of the intake pipeline and counselor performance. The calculation formulas are executed against the database read-replica.

### 1.1 Lead-to-Admission Conversion Rate
* **Objective**: Measure the percentage of qualified leads successfully converted into registered students.
* **Formula**:
  $$\text{Conversion Rate (\%)} = \left( \frac{\text{Count of Leads with stage = 'Converted'}}{\text{Total Count of Leads created in period} - \text{Active leads in pipeline}} \right) \times 100$$
* **Update Frequency**: Real-time on dashboard, batched daily for executive snapshots.

### 1.2 Average Lead Response Time
* **Objective**: Track counselor speed in acknowledging raw web inquiries.
* **Formula**:
  $$\text{Avg Response Time} = \frac{\sum \left( \text{Timestamp of First Follow-up log} - \text{Timestamp of Web Inquiry ingestion} \right)}{\text{Total Count of qualified leads originating from Web}}$$
* **Target KPI**: $< 4.0$ hours.

### 1.3 Counselor Follow-up Adherence Rate
* **Objective**: Evaluate counselor compliance with scheduled follow-up targets.
* **Formula**:
  $$\text{Adherence Rate (\%)} = \left( \frac{\text{Follow-ups completed within } \pm 60 \text{ minutes of scheduled time}}{\text{Total Count of scheduled follow-ups}} \right) \times 100$$
* **Target KPI**: $> 95.0\%$.

### 1.4 Cost Per Lead (CPL) by Source & Campaign
* **Objective**: Track marketing spend efficiency.
* **Formula**:
  $$\text{CPL} = \frac{\text{Total Budget allocated to Campaign (OMR)}}{\text{Count of Leads generated with campaignId = Campaign.id}}$$
* **Currency Formatting**: Formatted in Omani Rials (`OMR 0.000`) with 3 decimals.

### 1.5 Lead Leakage Rate
* **Objective**: Monitor prospects neglected due to missing future touchpoints.
* **Formula**:
  $$\text{Leakage Rate (\%)} = \left( \frac{\text{Active Leads with no 'Scheduled' follow-up AND overdue follow-up} > 48\text{ hours}}{\text{Total Active Leads (New, Contacted, Follow-Up, Qualified)}} \right) \times 100$$
* **Target KPI**: $0.0\%$.

---

## 2. Dashboard Widgets & Portal Components

These widgets render in the Admin Portal based on role-based permission scopes.

### 2.1 Funnel Analytics Summary (Conversion Funnel)
* **Visual Component**: Vertical/Horizontal conversion pipeline bar chart showing:
  * Inquiries Ingested $\rightarrow$ Qualified Leads $\rightarrow$ Follow-up Active $\rightarrow$ Lead Won $\rightarrow$ Converted Student.
* **Permission Scope**: `report.crm.funnel` (typically Super Admin and Branch Admin).
* **Drill-down behavior**: Clicking any stage filters the active workspace list to show matching leads.

### 2.2 Counselor Performance Matrix
* **Visual Component**: Data table listing:
  * Counselor Name | Active Leads Count | Overdue Follow-ups | Won Count | Lost Count | Avg Response Time (Hours) | Conversion %
* **Permission Scope**: `report.crm.counselor` (restricted to Branch Admin and Super Admin; Counselors see a single-row widget showing only their personal stats).

### 2.3 Lead Source Attribution Chart
* **Visual Component**: Doughnut chart splitting lead volume by source (Walk-in, Web, WhatsApp, Referrals, Google Ads).
* **Permission Scope**: `report.crm.funnel`.

### 2.4 Overdue Task Counter
* **Visual Component**: Red metric badge displaying count of overdue follow-up logs.
* **Permission Scope**: `lead.read`. Clicking the badge loads the Lead List workspace with filter `overdue = true` active.

---

## 3. Operational Reports

### 3.1 Lead Conversion Detailed Log
* **Purpose**: List individual lead lifecycles to audit qualification details.
* **Default Sort**: `Date Won` (Descending).
* **Filters**: Branch, Counselor, Course, Date Range, Source.
* **Columns**:
  * `Lead Number` (Clickable URL to workspace)
  * `Prospect Name`
  * `Source`
  * `Course Name` (Attributed Course Code)
  * `Assigned Counselor`
  * `Date Qualified`
  * `Date Converted`
  * `Days to Convert` (Numeric: Date Converted - Date Qualified)
* **Export Options**: CSV, PDF, XLSX.

### 3.2 Lost Lead Reasons Analysis
* **Purpose**: Aggregate reasons for dropouts to adjust sales strategies or course pricing.
* **Filters**: Branch, Course, Lost Reason Code, Date Range.
* **Columns**:
  * `Lost Reason Code` (e.g. `PriceTooHigh`, `CompetitorChose`, `TimingConflict`)
  * `Total Leads Lost`
  * `Percentage of Total Lost`
  * `Sample Outcome Notes` (Aggregated text block list)
* **Export Options**: CSV, PDF.

### 3.3 Campaign Performance Report
* **Purpose**: Summarize lead acquisition costs against marketing campaign budgets.
* **Filters**: Active/Inactive status, Date Range.
* **Columns**:
  * `Campaign Name`
  * `UTM Campaign Code`
  * `Allocated Budget (OMR)` (3 decimals)
  * `Leads Generated`
  * `Converted Admissions`
  * `Cost Per Lead (CPL) (OMR)`
  * `Cost Per Won Admission (OMR)`
* **Export Options**: CSV, XLSX.

---

## 4. Reporting Database Views & Read Models

To ensure high-performance rendering on dashboards without placing lock-contention on write tables (`leads`, `lead_follow_ups`), the system implements indexed read models.

### 4.1 View: `vw_crm_lead_pipeline_summary`
* **Definition**: Aggregates live lead counts grouped by branch, stage, and counselor.
* **PostgreSQL Schema DDL**:
```sql
CREATE OR REPLACE VIEW vw_crm_lead_pipeline_summary AS
SELECT 
    "branchId",
    "counselorId",
    stage,
    COUNT(id) AS total_leads,
    COUNT(CASE WHEN priority = 'Critical' OR priority = 'High' THEN 1 END) AS high_priority_leads,
    SUM(CASE WHEN "deletedAt" IS NULL AND "isDeleted" = false THEN 1 ELSE 0 END) AS active_non_deleted_leads
FROM leads
WHERE "deletedAt" IS NULL
GROUP BY "branchId", "counselorId", stage;
```
* **Query Usage**: Used by the Kanban Pipeline screen (`LEAD-UI-003`) to display card totals at the header of each stage column.

### 4.2 View: `vw_crm_counselor_performance_metrics`
* **Definition**: Materialized view calculating historical KPI metrics for counselors.
* **PostgreSQL Schema DDL**:
```sql
CREATE MATERIALIZED VIEW vw_crm_counselor_performance_metrics AS
SELECT
    l."counselorId",
    u.username,
    COUNT(l.id) AS total_assigned_leads,
    COUNT(CASE WHEN l.stage = 'Converted' THEN 1 END) AS total_converted_leads,
    ROUND((COUNT(CASE WHEN l.stage = 'Converted' THEN 1 END)::numeric / NULLIF(COUNT(l.id), 0)) * 100, 2) AS conversion_rate,
    AVG(EXTRACT(EPOCH FROM (f.completed_at - l."createdAt"))/3600)::numeric(10,2) AS avg_response_hours
FROM leads l
JOIN users u ON l."counselorId" = u.id
LEFT JOIN (
    SELECT "leadId", MIN("createdAt") AS completed_at 
    FROM lead_follow_ups 
    WHERE status = 'Completed'
    GROUP BY "leadId"
) f ON l.id = f."leadId"
WHERE l."deletedAt" IS NULL
GROUP BY l."counselorId", u.username;

CREATE UNIQUE INDEX idx_v_counselor_perf_id ON vw_crm_counselor_performance_metrics("counselorId");
```
* **Refresh Strategy**: Refreshed asynchronously hourly via a background worker cron job (`cron: "0 * * * *"`), preventing live transactional performance degradation.
