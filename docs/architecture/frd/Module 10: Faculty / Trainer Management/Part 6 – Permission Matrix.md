# Part 6 – Permission Matrix

This document maps ASTI system roles to fine-grained access control permissions for the Faculty / Trainer Management module.

---

## 1. Permission Catalog Definitions

### 1.1 Menu-Level Permissions
* `menu:trainer-master`: Access visibility of the "Trainer Registry" entry in the sidebar.
* `menu:trainer-availability`: Access to the "Branch Availability Grid" planner.
* `menu:trainer-payments`: Access to view trainer compensation profiles and batch rate listings.
* `menu:trainer-reports`: Access to the utilization and compliance dashboard view.

### 1.2 Action-Level Permissions
* `trainer:create`: Allows initial trainer profile setup and linking to a Person record.
* `trainer:write`: Allows updating profile fields, academic qualifications, and authorization mappings.
* `trainer:avail-manage`: Allows adding, updating, or soft-deleting weekly availability slots.
* `trainer:suspend`: Allows toggling trainer state to Suspended or Inactive.
* `trainer:payment-write`: Allows setting or updating compensation rates on batch/session assignments.
* `trainer:payment-read`: Allows viewing the batch compensation terms.
* `trainer:override-schedule`: Allows overriding scheduling warnings (e.g., expired documents or availability blocks).

### 1.3 Report-Level Permissions
* `report:trainer-utilization`: Allows running and downloading the Trainer Utilization Report.
* `report:trainer-expiry`: Allows querying list of expiring or expired document warnings across trainers.
* `report:consolidated`: Bypasses branch isolation scoping filters, allowing cross-branch data aggregation.

---

## 2. Role-Permission Mapping Matrix

| Permission Code | Super Admin | Branch Admin | Academic Coordinator | Accountant | Trainer (Self) | Registrar |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Menu-Level** | | | | | | |
| `menu:trainer-master` | **X** | **X** | **X** | **X** | **X** | **X** |
| `menu:trainer-availability` | **X** | **X** | **X** | — | **X** | — |
| `menu:trainer-payments` | **X** | **X** | — | **X** | — | — |
| `menu:trainer-reports` | **X** | **X** | **X** | — | — | — |
| **Action-Level** | | | | | | |
| `trainer:create` | **X** | **X** | — | — | — | — |
| `trainer:write` | **X** | **X** | **X** | — | **X** (1) | — |
| `trainer:avail-manage` | **X** | **X** | **X** | — | — | — |
| `trainer:suspend` | **X** | **X** | — | — | — | — |
| `trainer:payment-write` | **X** | **X** | — | **X** | — | — |
| `trainer:payment-read` | **X** | **X** | — | **X** | — | — |
| `trainer:override-schedule` | **X** | — | — | — | — | — |
| **Report-Level** | | | | | | |
| `report:trainer-utilization`| **X** | **X** | **X** | — | — | — |
| `report:trainer-expiry` | **X** | **X** | **X** | — | — | **X** |
| `report:consolidated` | **X** | — | — | — | — | — |

---

## 3. Explanatory Notes & Access Constraints
1. **Trainer Self-Write Constraint (1):** Trainers logged into the Trainer Self-Service Portal hold the `trainer:write` permission, but it is restricted by a database row-level security policy where `TrainerProfile.id == session.userId`. Furthermore, their write access is limited to adding new qualifications and documents in a `PendingVerification` state. They cannot alter their own `status`, `TrainerType`, or `effectiveEndDate`.
2. **Branch Scoping Rule:** While Branch Admins and Academic Coordinators possess broad operational permissions (like `trainer:write` or `trainer:avail-manage`), all database actions execute filters restricting mutations to records matching `session.activeBranchId`.
3. **Consolidated Bypassing:** Only the `Super Admin` holding `report:consolidated` can run queries across all branches to compile institutional KPIs.
