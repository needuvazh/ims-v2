# Functional Requirement Document (Part 8)
## Module 04: Admission & Enrollment Management - Reports, Dashboards, & Analytics

Reports are read-only projections. They must respect branch access and use the refactored student profile and enrollment model.

---

## 1. KPIs

| KPI | Definition | Scope |
| --- | --- | --- |
| Lead-to-Enrollment Conversion Rate | Confirmed enrollments / leads created in period | Branch or global |
| Enrollment Drop Rate | Dropped enrollments / active enrollments in period | Branch or global |
| Branch Enrollment Distribution | Count of confirmed/active enrollments by branch and course | Branch or global |
| Batch Fill Rate | Enrolled seats / batch capacity | Branch scoped |

---

## 2. Dashboard Widgets

### Branch Manager Dashboard
* Pending admission approvals
* Batch capacity alerts
* Recent enrollment transitions

### Super Admin Dashboard
* Branch enrollment summary
* Conversion trends
* Waitlist pressure by batch

---

## 3. Operational Reports

### Active Enrollment List
* Filters: branch, course, batch, date range, enrollment status.
* Columns: enrollment number, student number, student name, course, batch, status, final amount, payment status.

### Daily Admissions Summary
* Filters: branch, date.
* Columns: admission number, student name, national ID, counselor, status, remarks.

### Student Profile Directory
* Filters: branch, status, search.
* Columns: student number, full name, mobile, email, active enrollments, ID card status.

---

## 4. Read Model Requirement

The module must expose a reporting read model built from `persons`, `student_profiles`, `admissions`, `enrollments`, `branches`, `courses`, and `batches`. Cross-context joins are allowed only in read models and reporting views.
