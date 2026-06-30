# Module 02 – Organization Management

**Version:** 3.0

**Bounded Context:** Organization Management

**Priority:** Critical (Foundation Module)

**Dependencies**
* Module 01 – Identity & Access Management
* Audit & Compliance Module

**Dependent Modules**
* Lead, Enquiry & CRM Management
* Admission & Enrollment Management
* Course Catalog Management
* Training Delivery Management
* Scheduling, Calendar & Holiday Management
* Attendance Management
* Fee, Billing & Receivables Management
* Faculty / Trainer Management
* Reporting & Executive Dashboards

---

# 1. Purpose

Organization Management provides the foundational operational hierarchy for ASTI. It defines the organizational units within which all training operations, security scopes, billing transactions, and identity associations operate. 

The module scopes operations to a strict hierarchy:
```text
Institute (Organization)
   └── Branch
          ├── Department
          └── Classroom
```
Every student, trainer, batch, enrollment, and invoice in the system belongs directly or indirectly to a **Branch** context, which allows ASTI to enforce branch-based data isolation.

---

# 2. Objectives

The module shall enable administrators to:
* Set up the core Institute registration profile.
* Create and manage multiple physical training Branches.
* Configure branch contacts, addresses, and managers.
* Register branch-scoped Departments (business and training divisions).
* Register branch-scoped Classrooms with seating capacities.
* Enforce start and end dates (active dating bounds) for branches, departments, and classrooms.
* Support soft deletes and cascading status transitions (e.g., closing a branch restricts student admissions).

---

# 3. Scope

### Included
* **Institute Management:** Profile, registration numbers, tax numbers, and contact details.
* **Branch Management:** Branch names, contact emails/phones, local addresses, manager assignments, status transitions, and active dating bounds.
* **Department Management:** Division codes, names, descriptions, and department head assignments.
* **Classroom Management:** Classroom codes/names, seating capacities, and text location descriptions.

### Excluded
* Campus, Building, and Floor entities (modeled as simple text location strings on Classrooms).
* Custom branding configurations and cost centers (unnecessary for Phase 1).
* Shared multi-branch departments (departments belong strictly to one branch).

---

# 4. Actors

| Actor | Description |
| ----- | ----------- |
| Super Administrator | Full configuration and complete platform operations control |
| Institute Administrator | Manage global settings, register new branches |
| Branch Manager | Manage departments, classrooms, and staff within their assigned branch |
| Receptionist / Counselor | View branch contacts and classroom list for query handling |

---

# 5. Domain Model

```text
Institute (Organization)
   └── Branch
          ├── Department (Branch-scoped)
          └── Classroom (Branch-scoped)
```

---

# 6. Aggregate Roots & Owned Entities

### Institute
* Represents the top-level corporate entity.
* Has one-to-many relationship with `Branch`.

### Branch
* Scopes all business transactions (students, trainers, courses, batches).
* Owns local departments, classrooms, and branch managers.

### Department
* Represents a functional academic or operational division within a branch.
* Linked to a department head user account.

### Classroom
* Defines a physical room or teaching space.
* Controls maximum student capacity for batches scheduled inside the room.

---

# 7. Functional Requirements

### Institute Management
* **ORG-001 Create Institute:** Set up the root legal identity, tax registration, and primary country settings.
* **ORG-002 Update Institute:** Edit registration, address, and global contact parameters.

### Branch Management
* **ORG-003 Create Branch:** Add a physical branch location with a unique code under the institute.
* **ORG-004 Branch Status Transitions:** Transition branches across statuses (`Draft`, `Active`, `Inactive`, `Archived`).
* **ORG-005 Branch Manager Assignment:** Assign a registered user as the manager of a branch.
* **ORG-006 Branch Active Dating:** Restrict branch operations to specified effective start and end dates.

### Department Management
* **ORG-007 Create Department:** Create a department with a unique code within a branch context.
* **ORG-008 Assign Department Head:** Assign an employee user to manage the department.
* **ORG-009 Department Active Dating:** Set effective dates for the department.

### Classroom Management
* **ORG-010 Create Classroom:** Register a physical room with unique name and capacity under a branch.
* **ORG-011 Classroom Capacity Control:** Set capacity limits to prevent batch scheduling overload.

---

# 8. Business Rules

* **BR-ORG-001:** Every branch must belong to the registered institute.
* **BR-ORG-002:** Branch codes must be globally unique.
* **BR-ORG-003:** Department codes must be unique within their parent branch.
* **BR-ORG-004:** Classroom names must be unique within their parent branch.
* **BR-ORG-005:** Seating capacity must be a positive integer greater than zero.
* **BR-ORG-006:** Inactive or archived branches, departments, or classrooms cannot be selected for scheduling or new enrollments.
* **BR-ORG-007:** No hard deletions. Deactivated records are logically soft-deleted (`isDeleted = true`) to maintain historical references.

---

# 9. State Machines

### Branch / Department / Classroom Status Lifecycle
```text
Draft (Initial config)
   │
   ▼
Active (Operational) ◄───► Inactive (Temporarily suspended)
   │
   ▼
Archived (Logically soft-deleted, read-only)
```

---

# 10. Specifications Inventory

This module is detailed across the following four parts:
1. **[Part 2.1 – Institute Management](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2002%20%E2%80%93%20Organization%20Management/Part%202.1%20Organization%20(Institute)%20Management.md)**
2. **[Part 2.2 – Branch Management](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2002%20%E2%80%93%20Organization%20Management/Part%202.2%20Branch%20Management.md)**
3. **[Part 2.3 – Department Management](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2002%20%E2%80%93%20Organization%20Management/Part%202.3%20Department%20Management.md)**
4. **[Part 2.4 – Classroom Management](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/docs/architecture/frd/Module%2002%20%E2%80%93%20Organization%20Management/Part%202.4%20Classroom%20Management.md)**

---

# 11. Database Model Matrix

The PostgreSQL database (managed via Prisma) maps this context to the following tables:
* `institutes` - Top-level organization record.
* `branches` - Branch records, foreign key to `institutes`.
* `departments` - Department records, foreign key to `branches`.
* `classrooms` - Room records, foreign key to `branches`.
