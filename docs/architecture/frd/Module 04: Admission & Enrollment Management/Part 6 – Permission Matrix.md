# Functional Requirement Document (Part 6)
## Module 04: Admission & Enrollment Management - Fine-Grained Permission Matrix

All permissions are server-enforced and branch-scoped. UI visibility is not authorization.

---

## 1. Action-Level Permissions

| Permission | Super Admin | Branch Manager | Registrar | Counselor | Accountant | Student | Description |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | --- |
| `admission.create` | Yes | Yes | Yes | Yes | No | No | Create admission and link person |
| `admission.read` | Yes | Yes | Yes | Yes | No | No | Read admission records |
| `admission.submit` | Yes | Yes | Yes | Yes | No | No | Submit admission for review |
| `admission.approve` | Yes | Yes | No | No | No | No | Approve admission |
| `admission.reject` | Yes | Yes | No | No | No | No | Reject admission |
| `admission.delete` | Yes | No | No | No | No | No | Soft delete admission |
| `student.read` | Yes | Yes | Yes | Yes | No | No | Read student profiles |
| `student.delete` | Yes | No | No | No | No | No | Soft delete student profile |
| `enrollment.create` | Yes | Yes | Yes | Yes | No | No | Create enrollment draft |
| `enrollment.read` | Yes | Yes | Yes | Yes | Yes | No | Read enrollment records |
| `enrollment.submit` | Yes | Yes | Yes | Yes | No | No | Submit enrollment for approval |
| `enrollment.approve` | Yes | Yes | No | No | No | No | Approve enrollment |
| `enrollment.cancel` | Yes | Yes | Yes | No | No | No | Cancel pre-active enrollment |
| `enrollment.drop` | Yes | Yes | No | No | No | No | Drop active enrollment |
| `enrollment.override` | Yes | No | No | No | No | No | Override capacity or discount rules |
| `waitinglist.manage` | Yes | Yes | Yes | No | No | No | Manage waitlist entries in Training Delivery |
| `idcard.reissue` | Yes | Yes | Yes | No | No | No | Reissue student ID card |

---

## 2. Menu-Level Permissions

| Permission | Route | Notes |
| --- | --- | --- |
| `menu.student_directory` | `/admin/students` | Admin portal only |
| `menu.admission_ops` | `/admin/admissions` | Admin portal only |
| `menu.enrollment_ops` | `/admin/enrollments` | Admin portal only |
| `menu.waitlists` | `/admin/enrollments/waitlists` | Training Delivery read model |

---

## 3. Report-Level Permissions

| Permission | Scope |
| --- | --- |
| `report.admission_trends` | Branch or global depending on user scope |
| `report.branch_enrollments` | Branch-scoped export |
| `report.audit_logs` | Super Admin only |
| `report.idcard.export` | Branch-scoped if permitted |
