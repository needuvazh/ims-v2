# Functional Requirement Document (Part 8)
## Module 04: Admission & Enrollment Management – Reports, Dashboards, & Analytics

This document defines the metrics, analytics, dashboards, and reporting views owned by the Admission & Enrollment Bounded Context.

---

## 1. Key Performance Indicators (KPIs)

The system must compute the following performance and operational metrics. These metrics are compiled into snapshots by a background reporting worker and cached for dashboard reads.

### 1.1 Lead-to-Enrollment Conversion Rate ($CR_{\text{enroll}}$)
*   **Purpose:** Measures the efficiency of CRM counselors in converting leads to confirmed, paid students.
*   **Formula:**
    $$CR_{\text{enroll}} = \left( \frac{N_{\text{Confirmed Enrollments within Period}}}{N_{\text{Leads Created within Period}}} \right) \times 100$$
*   **Target SLA:** $\ge 25\%$ branch-wide.

### 1.2 Enrollment Drop-Out Rate ($DR$)
*   **Purpose:** Monitors student dropouts to assess training quality and student retention.
*   **Formula:**
    $$DR = \left( \frac{N_{\text{Dropped Enrollments within Period}}}{N_{\text{Total Active Enrollments within Period}}} \right) \times 100$$
*   **Target SLA:** $\le 5\%$.

### 1.3 Branch-Wise Student Distribution
*   **Purpose:** Tracks geographical capacity utilization across ASTI campuses (Muscat, Sohar, Salalah, etc.).
*   **Metric:** Count of active, confirmed enrollments grouped by `branchId` and `courseId`.

### 1.4 Batch Fill Rate ($FR_{\text{batch}}$)
*   **Purpose:** Evaluates batch scheduling efficiency.
*   **Formula:**
    $$FR_{\text{batch}} = \left( \frac{\text{seats\_filled}}{\text{max\_capacity}} \right) \times 100$$
*   **Target SLA:** Average $80\%$ seat occupancy.

---

## 2. Dashboard Widgets & Portal Layouts

Dashboard layouts are customized based on the active role and are filtered by branch permissions.

### 2.1 Admin & Chairman Dashboard Widgets
*   **Widget 1: Total Branch Registration Summary (Metric Grid)**
    *   *Visual:* Large numbers showing total students, new admissions this month, and active class participants.
    *   *Permissions:* `report.admission_trends` (Global view).
*   **Widget 2: Intake Trends & Channel Split (Donut Chart)**
    *   *Visual:* Split of enrollments by intake type: Regular vs. Corporate vs. Walk-In.
    *   *Permissions:* `report.admission_trends` (Global view).
*   **Widget 3: Branch Enrollment Performance (Stacked Bar Chart)**
    *   *Visual:* Side-by-side comparison of active registrations across branches.

### 2.2 Branch Manager & Registrar Dashboard Widgets
*   **Widget 4: Pending Admission Approvals (Alert List Table)**
    *   *Columns:* Student Name, Course, Submission Time, Document Status.
    *   *Permissions:* `admission.approve`. Scoped strictly to user home branch.
*   **Widget 5: Batch Capacity Alerts (Table Widget)**
    *   *Columns:* Batch Code, Course, Available Seats, Waitlist Count.
    *   *Visual:* Red indicator if available seats $\le 2$ or waitlist $\ge 5$.
    *   *Permissions:* `waitinglist.manage` (Branch scoped).

---

## 3. Operational Reports Specification

Users can filter, sort, and export the following raw reports. All outputs enforce branch isolation rules.

### 3.1 Active Enrollment List Report
*   **Filters:** Branch Selector (multi-select), Course (multi-select), Date Range, Status (Active, Confirmed).
*   **Columns:**
    *   `Enrollment Number` (Unique string)
    *   `Student Number`
    *   `Student Name`
    *   `Course Title`
    *   `Batch Code`
    *   `Enrollment Date`
    *   `Payment Status` (Paid, Installment Due, Overdue)
*   **Sorting:** Default by `Enrollment Date` descending.
*   **Export Options:** CSV, Excel, PDF (requires `report.branch_enrollments` permission).

### 3.2 Daily Admissions Summary Report
*   **Filters:** Specific Date, Branch.
*   **Columns:**
    *   `Admission ID`
    *   `Student Name`
    *   `Civil ID / Passport`
    *   `Counselor Name`
    *   `Admission Status` (Approved, Rejected, Pending)
    *   `Verification Remarks`
*   **Sorting:** Default by `Student Name` alphabetical.
*   **Export Options:** Excel.

---

## 4. Reporting Database Views & Read Models

To maintain clean DDD boundaries and prevent slow queries running cross-context SQL joins (`JOIN` across Student, Person, Course, Batch, Invoice), the system uses read-only database views.

### 4.1 `vw_enrollment_reporting_summary`
This view flattens relationships into a denormalized database table optimized for rapid rendering:

```sql
CREATE OR REPLACE VIEW vw_enrollment_reporting_summary AS
SELECT 
  e.id AS enrollment_id,
  e.enrollment_number,
  e.enrollment_status,
  e.enrollment_type,
  e.final_amount,
  e.confirmed_at,
  e.branch_id,
  b.name AS branch_name,
  s.student_number,
  p.first_name || ' ' || p.last_name AS student_full_name,
  p.mobile AS student_phone,
  p.email AS student_email,
  c.id AS course_id,
  c.title AS course_title,
  ba.id AS batch_id,
  ba.code AS batch_code,
  ba.start_date AS batch_start_date,
  e.completion_status,
  e.certificate_status,
  e.is_deleted
FROM enrollments e
JOIN students s ON e.student_id = s.id
JOIN persons p ON s.person_id = p.id
JOIN branches b ON e.branch_id = b.id
JOIN courses c ON e.course_id = c.id
JOIN batches ba ON e.batch_id = ba.id
WHERE e.is_deleted = FALSE;
```

### 4.2 Benefits of Reporting Views:
1.  **Index Optimization:** View runs over primary keys. Database engine caches query execution plans.
2.  **DTO Mapping Alignment:** Next.js route handlers can fetch from this view using Prisma raw queries or dedicated read models, bypassing complex ORM relation nesting.
3.  **Read-Write Separation:** Views can be directed to read-replicas in later phases without affecting writes to core transactional tables.
