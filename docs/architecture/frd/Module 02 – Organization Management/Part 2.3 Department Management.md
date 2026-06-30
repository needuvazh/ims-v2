# Module 02.3 — Department Management

**Module Code:** `ORG-DEPT`

**Version:** 3.0

**Bounded Context:** Organization Management

**Priority:** High (Foundation Module)

**Dependencies**
* Organization Management (Part 2.1)
* Branch Management (Part 2.2)

**Dependent Modules**
* Course Catalog Management
* Trainer Management
* Student & Enrollment Management
* Reporting & Dashboards

---

# 1. Purpose

Department Management defines the academic and operational divisions responsible for delivering training programs within a specific branch.

A department represents a business function (e.g., Safety Training, IT Training, Management, Language Studies) and operates strictly within the scope of a single branch. It provides local ownership of:
* Department courses
* Assigned trainers
* Department heads / academic managers
* Departmental reports

---

# 2. Business Objectives

The system shall enable branch and institute administrators to:
* Create and configure branch-level departments
* Assign department heads / managers
* Enforce local operational status and active dating bounds
* Support department-level analytics and reporting
* Prevent duplicate department codes within the same branch

---

# 3. Scope

### Included
* Department master record (code, name, description)
* Association to a parent branch (`branchId`)
* Assignment of a department head (`departmentHeadId`)
* Active dating boundaries (`effectiveStartDate`, `effectiveEndDate`)
* Status management (`Draft`, `Active`, `Inactive`, `Archived`)
* Soft delete state (`isDeleted`)

### Excluded
* Course catalog management (managed by Course Catalog module)
* Trainer management and assignments (managed by Trainer Management module)
* Multi-branch shared department aggregates (departments are branch-specific)

---

# 4. Actors

| Actor              | Responsibility |
| ------------------ | -------------- |
| Super Admin        | Complete platform access, global configurations |
| Branch Admin       | Create and manage departments within their assigned branch |
| Department Head    | Monitor department operations, view student completion |
| Receptionist / CRM | View departments and courses for lead inquiries |
| Reporting User     | Access department-scoped reports |

---

# 5. Business Capabilities

1. **Department Registration:** Create branch-scoped departments with unique codes.
2. **Department Head Assignment:** Map a user account to lead the department.
3. **Active Dating Control:** Enforce start and end dates of the department.
4. **Local Status Management:** Activate, deactivate, or archive departments locally.
5. **Branch Isolation:** Restrict user access to department data based on active branch context.

---

# 6. Aggregate Design

## Aggregate Root
* `Department`

## Child Entities
* `DepartmentStatusHistory`
* `DepartmentAudit`

---

# 7. Entity Model

```text
Branch
  └── Department
         ├── Courses (References)
         ├── Trainers (References)
         ├── Department Head
         └── Audit Trail
```

---

# 8. Department Lifecycle

```text
Draft (Optional setup state)
   │
   ▼
Active (Operational and course-owning)
   │
   ├──► Inactive (Suspended, no new courses)
   │
   ▼
Archived (Historical records only, read-only)
```

---

# 9. Functional Requirements

### FR-DEPT-001 Create Department
* **Description:** Branch Administrators can create a new department within their active branch context.
* **Preconditions:** Administrator is authenticated and has branch write permission (`organization.department.create`).
* **Inputs:** `branchId`, `departmentCode`, `departmentName` (English), `description` (optional), `departmentHeadId` (optional), `effectiveStartDate` (optional), `effectiveEndDate` (optional).
* **Processing:**
  1. Verify the user has access to `branchId`.
  2. Validate that `departmentCode` is unique within the target `branchId`.
  3. If effective dates are provided, ensure `effectiveEndDate` is after or equal to `effectiveStartDate`.
  4. Create the `Department` record with status set to `Active` (or `Draft`).
  5. Log the audit entry.
* **Outputs:** Department created successfully.
* **Postconditions:** A new branch-scoped department exists.
* **Priority:** Critical

### FR-DEPT-002 Update Department
* **Description:** Update department details, description, head, or status.
* **Inputs:** `departmentId`, `departmentName`, `description`, `departmentHeadId`, `effectiveStartDate`, `effectiveEndDate`, `status`.
* **Processing:**
  1. Validate effective date ranges.
  2. Log modifications in the Audit Log, preserving previous and new values.
* **Priority:** High

### FR-DEPT-003 Archive Department
* **Description:** Set status to `Archived` to logically delete a department while preserving historical reports and records.
* **Processing:**
  1. Validate that no active batches or courses are currently assigned to the department.
  2. Update `status` to `Archived`.
* **Priority:** Medium

---

# 10. Business Rules

| ID | Rule |
| -- | ---- |
| BR-DEPT-001 | Department Code must be unique within a single branch. |
| BR-DEPT-002 | Every department must belong to exactly one branch. |
| BR-DEPT-003 | The effective end date must be after or equal to the effective start date. |
| BR-DEPT-004 | A department cannot be permanently deleted; only logical archival is permitted. |
| BR-DEPT-005 | Inactive or Archived departments cannot have new courses associated with them. |
| BR-DEPT-006 | Users can only view or manage departments associated with their authorized branches. |

---

# 11. Workflow

```text
Select Active Branch
        │
        ▼
Create Department (Code, Name)
        │
        ▼
Assign Department Head / Head User
        │
        ▼
Set Effective Dates (Optional)
        │
        ▼
Department Ready to Own Courses
```

---

# 12. Screen Specifications

## Department List
* **Layout:** Dense table displaying local branch departments.
* **Columns:** Code, Department Name, Department Head, Status, Effective Date Range, Created Date.
* **Filters:** Status, Search by Name/Code.
* **Actions:** View Details, Edit, Archive.

## Department Form (Create/Edit)
* **Fields:**
  * Branch Selector (Pre-selected based on active branch context, read-only on edit)
  * Code (Input, alphanumeric, unique, max 50 chars)
  * Name (Input, text, max 200 chars)
  * Description (Text area)
  * Department Head (Dropdown list of branch employees/users)
  * Effective Start Date (Date picker)
  * Effective End Date (Date picker)
  * Status Selector (`Draft`, `Active`, `Inactive`, `Archived`)

---

# 13. Validation Rules

* Department Code: Alphanumeric, unique within branch, mandatory.
* Department Name: Mandatory, max 200 chars.
* Dates: Effective end date >= effective start date.
* Status: Must be one of `Draft`, `Active`, `Inactive`, `Archived`.

---

# 14. Permissions Matrix

| Permission | Super Admin | Branch Admin | Branch Manager | Staff / Trainer |
| ---------- | ----------- | ------------ | -------------- | --------------- |
| `department.read` | ✓ | ✓ | ✓ (Own Branch) | ✓ (Own Branch) |
| `department.create` | ✓ | ✓ | ✓ (Own Branch) | ✗ |
| `department.update` | ✓ | ✓ | ✓ (Own Branch) | ✗ |
| `department.delete` | ✓ | ✗ | ✗ | ✗ |

---

# 15. Audit Requirements

Audit logs are mandatory for:
* Department creation
* Department head changes
* Status transitions
* Effective date overrides
* Soft deletes / archival

---

# 16. Database Mapping

## Primary Table: `departments`
* `id`: UUID (Primary Key)
* `branchId`: UUID (Foreign Key to `branches`)
* `departmentCode`: String (Unique constraint with `branchId`)
* `departmentName`: String
* `departmentHeadId`: UUID (Nullable, Foreign Key to `users`)
* `description`: Text (Nullable)
* `status`: RecordStatus (`Active`, `Inactive`, `Draft`, `Archived`)
* `effectiveStartDate`: Date (Nullable)
* `effectiveEndDate`: Date (Nullable)
* `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`, `isDeleted`

---

# 17. API Summary

* `POST   /api/organization/departments` - Create department
* `GET    /api/organization/departments` - List departments (branch-scoped)
* `GET    /api/organization/departments/{id}` - Get department details
* `PUT    /api/organization/departments/{id}` - Update department
* `DELETE /api/organization/departments/{id}` - Soft-delete/archive department
