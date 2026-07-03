# Module 06 — Course Catalog & Training Delivery (Batch) Management

## Part 6 — Permission Matrix

**Version:** 3.0  
**Status:** Draft  
**Domain:** Course Catalog & Training Delivery  
**Module Code:** CRS  

---

# 1. Permission Inventory

The following fine-grained permissions control visibility and execution authorization for all Course Catalog and Batch Delivery features.

### 1.1 Action-Level Permissions
*   **`course.catalog.create`:** Authorizes creation of courses, base pricing rules, and academic completion rules.
*   **`course.catalog.update`:** Authorizes modifications to course profiles and pricing details.
*   **`course.catalog.publish`:** Authorizes publishing course catalogs to active state and managing version states.
*   **`course.catalog.archive`:** Authorizes logical archiving (soft-deleting) of courses.
*   **`course.pricing.override`:** Special credential to configure branch overrides and special discounts.
*   **`batch.delivery.create`:** Authorizes instantiation of physical batch delivery entities.
*   **`batch.delivery.update`:** Authorizes modification to batch settings, dates, capacities, and settings.
*   **`batch.delivery.assign`:** Authorizes mapping and removing trainers to/from batch class sessions.
*   **`batch.delivery.transition`:** Authorizes changing the execution state of a batch (e.g. In Progress, Completed).
*   **`batch.waitlist.manage`:** Authorizes waitlist registrations, queue position modifications, and manual promotions.

### 1.2 Menu-Level Permissions
*   **`menu.course.catalog`:** Authorizes visibility of the Course Catalog menu item in navigation panels.
*   **`menu.batch.delivery`:** Authorizes visibility of the Batch Management sections in navigation panels.
*   **`menu.waitlist`:** Authorizes visibility of the Waiting List queue panels.

### 1.3 Report-Level Permissions
*   **`report.catalog.summary`:** Access to the published curriculum catalog spreadsheet and course audit exports.
*   **`report.batch.utilization`:** Access to the batch utilization KPI metrics, enrollment trends, and seat allocations.
*   **`report.trainer.load`:** Access to trainer scheduling reports and training hour records.

---

# 2. Role-Permission Mapping

The matrix below maps corporate roles against action-level, menu-level, and report-level permissions.

| Permission Code | Super Admin | Academic Director | Branch Manager | Counselor / Registrar | Accountant | Trainer | Student | Corporate Coordinator |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Action-Level** | | | | | | | | |
| `course.catalog.create` | Yes | Yes | No | No | No | No | No | No |
| `course.catalog.update` | Yes | Yes | No | No | No | No | No | No |
| `course.catalog.publish` | Yes | Yes | No | No | No | No | No | No |
| `course.catalog.archive` | Yes | Yes | No | No | No | No | No | No |
| `course.pricing.override` | Yes | Yes | Yes | No | No | No | No | No |
| `batch.delivery.create` | Yes | No | Yes | No | No | No | No | No |
| `batch.delivery.update` | Yes | No | Yes | No | No | No | No | No |
| `batch.delivery.assign` | Yes | Yes | Yes | No | No | No | No | No |
| `batch.delivery.transition` | Yes | Yes | Yes | No | No | No | No | No |
| `batch.waitlist.manage` | Yes | No | Yes | Yes | No | No | No | No |
| **Menu-Level** | | | | | | | | |
| `menu.course.catalog` | Yes | Yes | Yes | Yes | Yes | No | No | No |
| `menu.batch.delivery` | Yes | Yes | Yes | Yes | Yes | Yes | No | No |
| `menu.waitlist` | Yes | No | Yes | Yes | No | No | No | No |
| **Report-Level** | | | | | | | | |
| `report.catalog.summary` | Yes | Yes | Yes | Yes | Yes | No | No | No |
| `report.batch.utilization` | Yes | Yes | Yes | Yes | Yes | No | No | Yes |
| `report.trainer.load` | Yes | Yes | Yes | No | No | Yes | No | No |

---

# 3. Security Scope Rules & Access Guards

Every request directed to the API gateway or resolved in Next.js Server Actions must pass through an access policy guard executing the following validation rules:

1.  **Direct Permission Check:** Verify that the authenticated user possesses the specific action permission. If the permission evaluates to `false` in their IAM user session list, return a `403 Forbidden` response and log an access violation event.
2.  **Branch-Scope Validation:**
    *   If the permission check passes, retrieve the user's `UserBranchAccess` mapping.
    *   Compare the target branch ID of the entity request (e.g., `Batch.branchId` or `CoursePricing.branchId`) against the user's active session branch ID.
    *   *Permissive Exceptions:*
        *   If the user has `consolidatedVisibility = true`, bypass the active branch matching rule.
        *   If the user is a `Super Admin`, bypass all branch scoping filters.
3.  **Soft-Delete Validation:**
    *   All select queries performed by the database layer must automatically append the condition `isDeleted = false`.
    *   Any update request on a record marked `isDeleted = true` must return an `ERR_ENTITY_ARCHIVED` exception.
