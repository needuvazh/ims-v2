# Part 8 - Reports, Dashboards, KPIs, Analytics

## 1. Module-Specific Key Performance Indicators (KPIs)

The following business metrics are calculated dynamically to evaluate trainer utilization, compliance, and compensation metrics:

### 1.1 Trainer Utilization Percentage ($U_{\text{trn}}$)
Measures the percentage of authorized teaching hours consumed by scheduling sessions against the trainer's defined availability blocks.

$$U_{\text{trn}} = \left( \frac{\sum \text{Scheduled Session Hours within Range}}{\sum \text{Available Hours in Availability Grid within Range}} \right) \times 100$$

* **Target Range:** 70% to 85% for full-time trainers.
* **Update Frequency:** Daily batch run at 01:00 GST.

### 1.2 Average Session Hours per Week ($H_{\text{avg}}$)
Tracks the workload distribution of active faculty members to avoid burnout.

$$H_{\text{avg}} = \frac{\text{Total Session Hours Delivered in Month}}{\text{Number of Weeks in Month}}$$

* **Target Range:** Max 24 hours per week for full-time, max 12 hours for part-time.

### 1.3 Upcoming Certification Expiry Count ($C_{\text{exp}}$)
Measures compliance exposure.
* **Logic:** Count of active trainers whose Visa, Civil ID, Passport, or Ministry License has `expiryDate` within 30 days.
* **Target:** 0.

### 1.4 Trainer Batch Pay Totals ($P_{\text{tot}}$)
Tracks overall financial liability for delivery payouts.
* **Calculation:** Mapped by payment statuses (`Pending`, `Disbursed`, `Cancelled`) aggregated over selected branches and date intervals.

---

## 2. Dashboard Widgets & Portal Components

### 2.1 Widget: Trainer Availability Status Today
* **Visual Representation:** Pie Chart / Grid Cards.
* **Data Sources:** Matches daily calendar entries. Shows counts of trainers categorized as: `Available & Unassigned`, `Assigned (Teaching)`, `Off-Duty / Exception Day`, `Suspended / Blocked`.
* **Required Permission:** `report:trainer-utilization`
* **Scoping:** Filtered by active branch selection.

### 2.2 Widget: Monthly Utilization Trend Chart
* **Visual Representation:** Area Chart showing monthly percentages over the past 6 months.
* **Data Sources:** Derived from the daily pre-calculated read model table `trainer_utilization_snapshots`.
* **Required Permission:** `report:trainer-utilization`

### 2.3 Widget: Pending Trainer Payments Summary
* **Visual Representation:** Metric Summary cards showing: Total Pending OMR, Total Disbursed OMR, and counts of outstanding batch log audits.
* **Required Permission:** `trainer:payment-read`
* **Scoping:** Branch managers and accountants only. Hidden from coordinators and trainers.

---

## 3. Operational Reports Specification

### 3.1 Report: Trainer Utilization Sheet
* **Description:** Detailed summary of teaching logs against available hours for a given date range.
* **Filters:** Date Range, Branch, Trainer Type, Trainer Code, Min Utilization %.
* **Columns:**
  * `Trainer Code` (Mono)
  * `Trainer Name`
  * `Trainer Type`
  * `Total Available Hours` (Decimal, e.g., `160.00`)
  * `Total Scheduled Hours` (Decimal, e.g., `120.00`)
  * `Utilization Rate` (Percentage, e.g., `75.00%`)
  * `Variance Hours` (Decimal, e.g., `40.00`)
* **Sorting:** Default descending by `Utilization Rate`.
* **Export Options:** `CSV`, `XLSX`, `PDF`.

### 3.2 Report: Expiry Alerts List
* **Description:** Logs upcoming document expirations to prevent scheduling blocks.
* **Filters:** Expiry Window (Within 30d, 15d, Already Expired), Document Type, Branch.
* **Columns:**
  * `Trainer Code`
  * `Trainer Name`
  * `Document Type` (Visa, Civil ID, Passport, Ministry License)
  * `Document ID Reference`
  * `Expiry Date` (YYYY-MM-DD)
  * `Days to Expiry` (Int, signed negative if expired)
  * `Status` (Warning, Critical, Blocked)
* **Sorting:** Ascending by `Expiry Date` (closest expiry first).
* **Export Options:** `CSV`, `PDF`.

### 3.3 Report: Trainer Pay Ledger
* **Description:** Accountant ledger tracking batch delivery liabilities.
* **Filters:** Batch Code, Payment Status, Payment Basis, Branch.
* **Columns:**
  * `Trainer Code`
  * `Trainer Name`
  * `Batch Code`
  * `Payment Basis` (PerHour, PerSession, PerStudent, Fixed)
  * `Units Delivered` (Int/Decimal: e.g., Hours or Sessions)
  * `Unit Rate` (Decimal, e.g., `OMR 25.000`)
  * `Total Calculated Amount` (Decimal, e.g., `OMR 300.000`)
  * `Payment Status` (Pending, Disbursed, Cancelled)
* **Sorting:** Descending by `Total Calculated Amount`.
* **Export Options:** `XLSX` (includes formula references), `PDF`.

---

## 4. Analytical Read Models & Context Isolation

To maintain strict Bounded Context isolation and avoid executing physical cross-context SQL joins (joining `trainer_profiles` directly with `persons` in Identity, `sessions` in Scheduling, and `batch_trainers` in Training Delivery) at query time, the system uses a localized query read-model table updated asynchronously via Domain Events.

### 4.1 Read Model: `TrainerUtilizationSnapshot`
* **Purpose:** Stores pre-calculated, branch-scoped utilization stats to serve dashboard widgets and reports without coupling databases.
* **Prisma Schema Definition:**
```prisma
model TrainerUtilizationSnapshot {
  id                   String        @id @default(uuid()) @db.Uuid
  trainerProfileId     String        @db.Uuid
  trainerCode          String        @db.VarChar(50)
  firstName            String        @db.VarChar(100)
  lastName             String        @db.VarChar(100)
  trainerType          TrainerType
  branchId             String        @db.Uuid
  totalAvailableHours  Decimal       @db.Decimal(10, 2)
  totalScheduledHours  Decimal       @db.Decimal(10, 2)
  utilizationRate      Decimal       @db.Decimal(5, 2) // (totalScheduledHours / totalAvailableHours) * 100
  updatedAt            DateTime      @updatedAt @db.Timestamptz(6)

  @@unique([trainerProfileId, branchId])
  @@index([branchId])
  @@map("trainer_utilization_snapshots")
}
```
* **Event-Driven Reconciliation Logic:**
  1. **Trainer Availability Changes:** When `TrainerAvailabilityUpdated` is received, query local availability records and re-calculate `totalAvailableHours`.
  2. **Timetable / Schedule Changes:** The Trainer context subscribes to `SessionScheduled` and `SessionCancelled` events published by the **Scheduling & Timetable Bounded Context**. Upon reception, the event handlers recalculate `totalScheduledHours` and `utilizationRate` for the affected trainer and branch, updating the snapshot.
  3. **Person Metadata Updates:** Subscribes to `PersonUpdated` events (from Identity Bounded Context) to keep names current.

---

### 4.2 Read Model: `TrainerCompensationRateSummary`
* **Purpose:** Pre-aggregates batch compensation metrics, serving financial reports.
* **Update Strategy:** Updated asynchronously by subscribing to `TrainerCompensationRateConfigured` and session completion logs, rather than using direct database joins.
