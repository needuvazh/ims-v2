# Module 06 — Course Catalog & Training Delivery (Batch) Management

## Part 8 — Reports, Dashboards, KPIs, Analytics

**Version:** 3.0  
**Status:** Draft  
**Domain:** Course Catalog & Training Delivery  
**Module Code:** CRS  

---

# 1. Module-Specific Key Performance Indicators (KPIs)

The following metrics are tracked by the system to evaluate the performance and efficiency of ASTI's curriculum catalog and training operations.

---

### 1.1 Batch Seat Utilization (%)
*   **Definition:** Measures how effectively classroom and online seats are filled relative to defined batch capacity limits.
*   **Calculation Formula:**
    $$\text{Seat Utilization} = \left( \frac{\sum \text{Batch.currentEnrollmentCount}}{\sum \text{Batch.capacity}} \right) \times 100$$
*   **Target Threshold:** $> 85\%$ average across all active branch batches.

---

### 1.2 Waitlist Promotion Conversion Rate (%)
*   **Definition:** Evaluates the percentage of waitlisted students who are successfully promoted to active, paid enrollments.
*   **Calculation Formula:**
    $$\text{Waitlist Promotion Rate} = \left( \frac{\text{Count of Promoted Waitlist Entries}}{\text{Total Waitlist Entries Created}} \right) \times 100$$
*   **Target Threshold:** $> 40\%$ conversion.

---

### 1.3 Faculty Utilization Load (Hours/Week)
*   **Definition:** Tracks the teaching hours allocated to each trainer per week to optimize faculty load.
*   **Calculation Formula:** Sum of duration hours of all timetabled sessions mapped to a `trainerId` within a 7-day period.
*   **Target Threshold:** 20 to 30 lecturing hours per week per trainer (prevents burnout).

---

### 1.4 Average Waitlist Queue Duration (Days)
*   **Definition:** Measures the average time a student spends on the waiting list before being promoted or removed.
*   **Calculation Formula:** Average of `(WaitingList.updatedAt - WaitingList.createdAt)` for all records with status `Promoted` or `Removed`.

---

# 2. Portal Dashboard Widgets

---

## 2.1 Admin Dashboard Widgets

### 2.1.1 Widget: Overall Seat Utilization (Metric Summary Widget)
*   **Visual Style:** Big numeric value display with a circular radial progress ring.
*   **Data Source:** Aggregated sum of `currentEnrollmentCount` divided by total `capacity` for all batches in `InProgress` status.
*   **Permission Scope:** `report.batch.utilization`.
*   **Interactive Controls:** Click triggers drill-down navigation to the Batch Listing screen (`CRS-SCR-004`) pre-filtered by utilization `< 50%`.

### 2.1.2 Widget: Course Enrollment Share (Pie Chart)
*   **Visual Style:** Interactive donut chart displaying share distribution.
*   **Data Source:** Counts active student enrollments grouped by Course Category.
*   **Interactive Controls:** Hover displays count and percentage share; click on slice isolates category records.
*   **Permission Scope:** `report.catalog.summary`.

### 2.1.3 Widget: High-Demand Waiting List Queue (Table Widget)
*   **Visual Style:** Dense tabular list detailing top 5 full batches.
*   **Data Source:**
    ```sql
    SELECT batch_code, batch_name, capacity, 
           (SELECT COUNT(*) FROM waiting_list WHERE batch_id = batches.id AND status = 'Waiting') as wait_count
    FROM batches
    WHERE status = 'OpenForEnrollment'
    ORDER BY wait_count DESC
    LIMIT 5;
    ```
*   **Permission Scope:** `batch.waitlist.manage`.

---

## 2.2 Trainer Portal Dashboard Widgets

### 2.2.1 Widget: Weekly Lecture Load (Metric Count Card)
*   **Visual Style:** High-density counter showing remaining lecture hours for the current week.
*   **Data Source:** Sums timetabled sessions for active user's `trainerId`.
*   **Permission Scope:** Trainer role session context.

---

# 3. Operational Reports Specification

---

## 3.1 Course Performance Report
*   **Purpose:** Evaluates academic enrollment volumes and gross pricing performance.
*   **Filters:** Department ID, Date Range (Start/End), Branch ID context.
*   **Columns:**
    *   Course Code, Course Name (Bilingual), Department, Classification
    *   Total Batches Created, Average Seat Utilization (%)
    *   Active Enrollments Count, Gross Revenue (Resolved pricing OMR, formatted 3 decimals)
*   **Sorting:** Default sort by Active Enrollments count (descending).
*   **Export Formats:** CSV, PDF, XLSX.

---

## 3.2 Batch Roster & Utilization Log
*   **Purpose:** Tracks seat allocations and current batch statuses per branch.
*   **Filters:** Branch ID (Multiple), Course ID, Batch Status (Multiple), Date Range.
*   **Columns:**
    *   Batch Code, Batch Name, Course Code, Start Date, End Date
    *   Assigned Primary Trainer Name, Classroom Name
    *   Capacity, Current Enrollments, Open Seats, Waitlist Queue Count
    *   Status Badge
*   **Sorting:** Default sort by Start Date (ascending).
*   **Export Formats:** CSV, XLSX.

---

## 3.3 Trainer Scheduling Report
*   **Purpose:** Operational report to audit trainer loads and scheduling conflicts.
*   **Filters:** Trainer ID, Date Range.
*   **Columns:**
    *   Trainer Name, Employee Code, Assigned Batches (Count)
    *   Total Scheduled Hours, Overlapping Hours (Flagged in Red if > 0)
    *   Next Scheduled Session Date, Active Branch Context
*   **Sorting:** Default sort by Total Scheduled Hours (descending).
*   **Export Formats:** CSV, PDF, XLSX.

---

# 4. Reporting Database Read Models / Views

To prevent slow aggregations on live transactional tables, the following materialized views are defined in the PostgreSQL database and updated asynchronously via Prisma scheduler tasks.

---

## 4.1 View: `mv_batch_utilization_stats`
*   **Purpose:** Speeds up dashboard card queries and batch searches.
*   **SQL Definition:**
    ```sql
    CREATE MATERIALIZED VIEW mv_batch_utilization_stats AS
    SELECT 
        b.id AS batch_id,
        b.batch_code,
        b.branch_id,
        b.course_id,
        c.course_code,
        b.status,
        b.capacity,
        b.current_enrollment_count AS enrolled,
        (b.capacity - b.current_enrollment_count) AS vacant_seats,
        ROUND((b.current_enrollment_count::numeric / b.capacity::numeric) * 100, 2) AS utilization_percent,
        (SELECT COUNT(*) FROM waiting_list w WHERE w.batch_id = b.id AND w.status = 'Waiting') AS waiting_count
    FROM batches b
    JOIN courses c ON b.course_id = c.id
    WHERE b.is_deleted = false;

    CREATE UNIQUE INDEX idx_mv_batch_util_id ON mv_batch_utilization_stats(batch_id);
    CREATE INDEX idx_mv_batch_util_branch ON mv_batch_utilization_stats(branch_id);
    ```

---

## 4.2 View: `mv_course_revenue_summary`
*   **Purpose:** Powers global course financial dashboards.
*   **SQL Definition:**
    ```sql
    CREATE MATERIALIZED VIEW mv_course_revenue_summary AS
    SELECT 
        c.id AS course_id,
        c.course_code,
        c.name_english,
        c.department_id,
        COUNT(DISTINCT b.id) AS total_batches,
        COALESCE(SUM(b.current_enrollment_count), 0) AS total_enrollments,
        -- Gross revenue resolved from invoices linked to batch enrollments
        COALESCE(SUM(i.total_amount_omr), 0.000) AS gross_revenue_omr
    FROM courses c
    LEFT JOIN batches b ON b.course_id = c.id AND b.is_deleted = false
    -- Simulated cross-context link to invoices in Finance context
    LEFT JOIN enrollments e ON e.batch_id = b.id AND e.is_deleted = false
    LEFT JOIN invoices i ON i.enrollment_id = e.id AND i.status != 'Cancelled'
    WHERE c.is_deleted = false
    GROUP BY c.id, c.course_code, c.name_english, c.department_id;

    CREATE UNIQUE INDEX idx_mv_course_rev_id ON mv_course_revenue_summary(course_id);
    ```
*   **Refresh Strategy:** Rebuild concurrently every 3 hours during off-peak hours (Oman timezone GST: 02:00, 05:00, 08:00, 11:00, 14:00, 17:00, 20:00, 23:00).
