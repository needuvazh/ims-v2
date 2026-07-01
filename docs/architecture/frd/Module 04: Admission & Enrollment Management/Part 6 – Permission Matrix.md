# Functional Requirement Document (Part 6)
## Module 04: Admission & Enrollment Management – Fine-Grained Permission Matrix

This document maps Role-Based Access Control (RBAC) permissions across the Admission & Enrollment Bounded Context. All check operations must combine the required permission key with the user's active branch access list to enforce server-side isolation.

---

## 1. Action-Level Permissions (Write & Mutate Operations)

| Permission Name | Super Admin | Branch Manager | Registrar | Counselor | Accountant | Student | Description / Scope |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `admission.create` | **Yes** | **Yes** | **Yes** | **Yes** | No | No | Register student profile and save draft admissions. |
| `admission.approve` | **Yes** | **Yes** | No | No | No | No | Approve pending admission applications at local branch. |
| `admission.reject` | **Yes** | **Yes** | No | No | No | No | Reject admissions and enter refusal reason codes. |
| `admission.cancel` | **Yes** | **Yes** | **Yes** | No | No | No | Cancel an active or pending admission. |
| `enrollment.create` | **Yes** | **Yes** | **Yes** | **Yes** | No | No | Initialize new course enrollment drafts. |
| `enrollment.approve` | **Yes** | **Yes** | No | No | No | No | Approve enrollment, perform credit checks, lock batch seats. |
| `enrollment.confirm` | **Yes** | **Yes** | No | No | **Yes** | No | Confirm enrollment after validation of financial dues. |
| `enrollment.drop` | **Yes** | **Yes** | No | No | No | No | Withdraw active student from course, release batch seat. |
| `enrollment.cancel` | **Yes** | **Yes** | **Yes** | No | No | No | Void unpaid or draft enrollments. |
| `enrollment.override` | **Yes** | No | No | No | No | No | Bypass batch capacity constraints and pricing limits. |
| `waitinglist.manage` | **Yes** | **Yes** | **Yes** | No | No | No | Manually promote or remove students from waitlists. |
| `idcard.reissue` | **Yes** | **Yes** | **Yes** | No | No | No | Trigger manual background compilation of ID Card. |

---

## 2. Menu-Level Permissions (UI Navigation & Page View Guards)

These permissions dictate menu options shown on client-side routing panels. (Note: UI visibility is not authorization; the server API routes must validate corresponding actions).

| Menu Permission Name | Super Admin | Branch Manager | Registrar | Counselor | Accountant | Student | Associated UI Route |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `menu.student_directory` | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | No | `/admin/students` |
| `menu.admission_ops` | **Yes** | **Yes** | **Yes** | **Yes** | No | No | `/admin/admissions` |
| `menu.enrollment_ops` | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | No | `/admin/enrollments` |
| `menu.waitlists` | **Yes** | **Yes** | **Yes** | No | No | No | `/admin/enrollments/waitlists` |
| `menu.student_dashboard` | No | No | No | No | No | **Yes**| `/portal/dashboard` (Self only) |

---

## 3. Report-Level & Export Permissions (Data Access & Analysis)

| Report Permission Name | Super Admin | Branch Manager | Registrar | Counselor | Accountant | Student | Description / Scope |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `report.admission_trends` | **Yes** | **Yes** | No | No | No | No | View statistics on lead-to-student conversions. |
| `report.branch_enrollments` | **Yes** | **Yes** | No | No | No | No | Export enrollment lists to CSV/Excel (local branch only). |
| `report.finance_receivables` | **Yes** | No | No | No | **Yes** | No | Generate outstanding balance audits per enrollment. |
| `report.audit_logs` | **Yes** | No | No | No | No | No | View system audit tracking metrics (global search). |
| `report.idcard.export` | **Yes** | **Yes** | **Yes** | **Yes** | No | No | Download batches of student ID cards. |
