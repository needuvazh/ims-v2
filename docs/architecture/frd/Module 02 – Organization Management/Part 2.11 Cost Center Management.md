Before writing this module, I want to challenge whether **Cost Center** belongs under **Organization Management**.

## My Recommendation

From an enterprise ERP perspective (SAP, Oracle ERP, Microsoft Dynamics 365, Odoo), **Cost Center** is actually part of the **Finance domain**, not the Organization domain.

### Why?

A cost center is **not** an organizational structure; it is a **financial accounting structure** used to allocate costs and analyze profitability.

For example:

```text
Organization
    ├── Branch
    ├── Department
    └── Employees
```

versus

```text
Finance
    ├── Cost Centers
    ├── General Ledger
    ├── Chart of Accounts
    ├── Budgets
    └── Expenses
```

### However, for ASTI

Many training institutes think of branches as cost centers, but that's often too simplistic.

A better model is:

```text
Organization
     │
     ├── Branch
     ├── Department
     └── Classroom

Finance
     │
     └── Cost Center
             │
             ├── Branch (optional)
             ├── Department (optional)
             ├── Corporate Project (future)
             ├── Training Program
             └── Expenses
```

Examples:

| Cost Center               | Linked To          |
| ------------------------- | ------------------ |
| Muscat Branch             | Branch             |
| Safety Training           | Department         |
| Corporate Project PDO     | Corporate Contract |
| IELTS Premium             | Course             |
| Corporate Oil & Gas Batch | Batch (future)     |

This provides much richer financial reporting.

---

# Module 02.11 — Cost Center Management

**Module Code:** `ORG-CC` *(Logically belongs to the Finance domain, but documented here as part of the organizational foundation.)*

**Version:** 3.0

**Bounded Context:** Finance (Referenced by Organization)

**Priority:** Medium

**Dependencies**

* Organization Management
* Branch Management
* Department Management

**Dependent Modules**

* Fee Management
* Expense Management
* Corporate Training
* Payroll (Future)
* Tally Integration
* Reporting & Analytics

---

# 1. Purpose

Cost Center Management enables the institute to classify revenues and expenses for financial analysis.

A cost center can represent:

* Branch
* Department
* Training Division
* Corporate Project
* Training Program
* Shared Services (Administration, Marketing)

It provides the foundation for profitability analysis and accounting integrations.

---

# 2. Business Objectives

The system shall allow administrators to:

* Create cost centers
* Associate cost centers with organizational entities
* Categorize operational costs
* Track active/inactive cost centers
* Support financial reporting
* Export cost center information to Tally in future phases

---

# 3. Scope

## Included

* Cost center master
* Cost center hierarchy
* Branch/Department linkage
* Cost center status
* Financial reporting reference
* Audit history

## Excluded

* Expense entry
* Ledger posting
* Budget management
* Accounting journal entries

These belong to the Finance module.

---

# 4. Actors

| Actor              | Responsibility                   |
| ------------------ | -------------------------------- |
| Super Admin        | Full control                     |
| Finance Manager    | Manage cost centers              |
| Organization Admin | View and map cost centers        |
| Accountant         | Use cost centers in transactions |
| Reporting User     | Analyze financial reports        |

---

# 5. Business Capabilities

1. Cost Center Registration
2. Organizational Mapping
3. Hierarchical Cost Centers
4. Financial Classification
5. Cost Center Activation
6. Reporting & Analytics
7. Audit Trail

---

# 6. Aggregate Design

## Aggregate Root

```text
CostCenter
```

## Child Entities

```text
CostCenterMapping
CostCenterHierarchy
CostCenterAudit
```

---

# 7. Entity Model

```text
CostCenter
      │
      ├── Branch (Optional)
      ├── Department (Optional)
      ├── Training Division (Optional)
      ├── Corporate Project (Future)
      └── Financial Transactions
```

---

# 8. Cost Center Lifecycle

```text
Draft
   ↓
Active
   ├── Inactive
   ↓
Archived
```

---

# 9. Functional Requirements

## ORG-CC-001 — Create Cost Center

Fields:

* Cost Center Code
* Cost Center Name (English)
* Cost Center Name (Arabic)
* Parent Cost Center (optional)
* Description
* Status

Business Rules:

* Cost Center Code must be unique.
* Name is mandatory.
* Parent Cost Center is optional.

---

## ORG-CC-002 — Associate Organizational Units

Allow linking a cost center to:

* Branch (optional)
* Department (optional)
* Training Division (optional)
* Corporate Customer (future)
* Course (future)

A cost center may be shared across multiple entities if business policy allows.

---

## ORG-CC-003 — Configure Financial Attributes

Store:

* Cost Center Type
* Financial Category
* Currency (inherits organization default unless overridden)
* Effective From
* Effective To

Example Cost Center Types:

* Branch
* Department
* Administration
* Marketing
* Corporate Project
* Training Program

---

## ORG-CC-004 — Activate Cost Center

Activation requires:

* Complete profile
* Valid organizational mapping where applicable

---

## ORG-CC-005 — Deactivate Cost Center

Effects:

* Cannot be selected for new financial transactions.
* Existing historical transactions remain linked.

---

## ORG-CC-006 — Archive Cost Center

Allowed only when:

* No pending financial transactions reference it.
* No active mappings require it.

---

## ORG-CC-007 — Search Cost Centers

Search by:

* Code
* Name
* Type
* Branch
* Department
* Status

---

## ORG-CC-008 — Cost Center Dashboard

Display:

* Revenue
* Expenses
* Profit/Loss (future)
* Number of linked transactions
* Active mappings

---

# 10. Business Rules

| ID        | Rule                                                      |
| --------- | --------------------------------------------------------- |
| BR-CC-001 | Cost Center Code must be unique.                          |
| BR-CC-002 | Cost Center belongs to one organization.                  |
| BR-CC-003 | Historical transactions retain original cost center.      |
| BR-CC-004 | Archived cost centers are read-only.                      |
| BR-CC-005 | Cost Center cannot be deleted; only archived.             |
| BR-CC-006 | Organizational mapping is optional but recommended.       |
| BR-CC-007 | Financial transactions must validate active cost centers. |

---

# 11. Workflow

```text
Create Cost Center
        ↓
Configure Profile
        ↓
Associate Organization Units
        ↓
Activate Cost Center
        ↓
Available for Finance Transactions
```

---

# 12. Screen Specifications

## Cost Center List

Columns:

* Code
* Name
* Type
* Linked Branch
* Linked Department
* Status

Filters:

* Type
* Branch
* Department
* Status

Actions:

* View
* Edit
* Activate
* Deactivate
* Archive

---

## Cost Center Details

Tabs:

1. General Information
2. Organizational Mapping
3. Financial Attributes
4. Usage Summary
5. Audit History

---

# 13. Validation Rules

* Cost Center Code is mandatory.
* Cost Center Name is mandatory.
* Parent Cost Center cannot create circular hierarchy.
* Effective From must be before Effective To.
* Archived cost centers cannot be edited.

---

# 14. Permissions Matrix

| Permission           | Super Admin | Finance Manager | Accountant |
| -------------------- | ----------- | --------------- | ---------- |
| View Cost Center     | ✓           | ✓               | ✓          |
| Create Cost Center   | ✓           | ✓               | ✗          |
| Edit Cost Center     | ✓           | ✓               | ✗          |
| Activate Cost Center | ✓           | ✓               | ✗          |
| Archive Cost Center  | ✓           | ✓               | ✗          |

---

# 15. Notifications

Generate in-app notifications for:

* Cost Center Created
* Cost Center Activated
* Cost Center Deactivated
* Organizational Mapping Updated
* Cost Center Archived

---

# 16. Audit Requirements

Audit:

* Profile changes
* Organizational mappings
* Financial attribute changes
* Status changes

Capture:

* User
* Timestamp
* Old value
* New value
* Reason
* Organization context

---

# 17. Reports

* Cost Center Directory
* Revenue by Cost Center
* Expenses by Cost Center
* Cost Center Mapping Report
* Inactive Cost Centers

---

# 18. Dashboard Widgets

* Active Cost Centers
* Revenue by Cost Center
* Expense Distribution
* Top Performing Cost Centers

---

# 19. Domain Events

```text
CostCenterCreated
CostCenterUpdated
CostCenterActivated
CostCenterDeactivated
CostCenterArchived
CostCenterMapped
```

---

# 20. Database Mapping

### Aggregate Root

```text
CostCenter
```

### Suggested Tables

```text
cost_centers
cost_center_mappings
cost_center_audit_logs
```

### Key Fields: `cost_centers`

```text
id
organizationId
costCenterCode
name
nameLocalized
parentCostCenterId
costCenterType
description
status
effectiveFrom
effectiveTo
createdAt
createdBy
updatedAt
updatedBy
deletedAt
version
```

---

# 21. API Summary

```text
POST   /cost-centers
GET    /cost-centers
GET    /cost-centers/{costCenterId}
PUT    /cost-centers/{costCenterId}
PATCH  /cost-centers/{costCenterId}/activate
PATCH  /cost-centers/{costCenterId}/deactivate
PATCH  /cost-centers/{costCenterId}/archive

POST   /cost-centers/{costCenterId}/mappings
DELETE /cost-centers/{costCenterId}/mappings/{mappingId}

GET    /cost-centers/{costCenterId}/dashboard
```

---

# 22. Acceptance Criteria

### Scenario: Create Cost Center

**Given** a Finance Manager has the required permission
**When** they create a cost center with a unique code and valid details
**Then** the system creates the cost center in **Draft** status and records an audit entry.

### Scenario: Prevent Use of Inactive Cost Center

**Given** a cost center is marked **Inactive**
**When** an accountant attempts to use it in a new financial transaction
**Then** the system rejects the transaction and prompts the user to select an active cost center.

---

## Architectural Recommendation

For **ASTI Phase 1**, I recommend **keeping Cost Center as a finance foundation**, not an operational module. It should primarily act as a reusable financial reference for fees, expenses, corporate billing, and future Tally integration.

When we reach the **Finance & Receivables** bounded context, this module should be **moved logically under Finance** and expanded with budgeting, ledger mapping, and profitability reporting. This keeps the DDD aligned with enterprise ERP practices while still allowing organizational modules to reference cost centers where appropriate.
