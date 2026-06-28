# Detailed API Contract Specification

## Module 2: Organization Management APIs

**Version:** 1.0
**Base URL:** `/api/v1`
**Module Code:** `ORG`

---

# 1. Module Purpose

Organization Management APIs manage the institute structure used by all operational modules.

This includes:

* Institute Profile
* Branches
* Departments
* Classrooms
* Organization hierarchy

---

# 2. Security Requirements

All Organization APIs require authentication.

Authorization must enforce:

```text
Permission
Branch Scope
Data Scope
```

Branch-scoped Organization APIs must resolve the user's allowed branch scope server-side. Client-side branch filters and hidden menus are not authorization controls.

---

# 3. Institute APIs

## 3.1 Get Institute Profile

```http
GET /api/v1/institute
```

### Permission

```text
INSTITUTE_VIEW
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "ins_001",
    "instituteName": "Al Saud International",
    "instituteCode": "ALS",
    "registrationNumber": "REG-001",
    "taxNumber": "TAX-001",
    "primaryEmail": "info@example.com",
    "primaryPhone": "+96890000000",
    "website": "https://example.com",
    "address": "Muscat, Oman",
    "country": "Oman",
    "status": "Active"
  }
}
```

---

## 3.2 Update Institute Profile

```http
PATCH /api/v1/institute
```

### Permission

```text
INSTITUTE_EDIT
```

### Request

```json
{
  "instituteName": "Al Saud International",
  "primaryEmail": "info@example.com",
  "primaryPhone": "+96890000000",
  "website": "https://example.com",
  "address": "Muscat, Oman",
  "country": "Oman",
  "status": "Active"
}
```

### Validations

```text
Institute name is required
Primary email must be valid
Primary phone is required
Country is required
```

### Audit

```text
InstituteUpdated
```

---

# 4. Branch APIs

## 4.1 Get Branches

```http
GET /api/v1/branches
```

### Permission

```text
BRANCH_VIEW
```

### Query Parameters

```text
page
limit
search
city
country
status
sortBy
sortOrder
```

### Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "br_001",
        "branchCode": "MCT",
        "branchName": "Muscat Branch",
        "city": "Muscat",
        "country": "Oman",
        "phone": "+96890000000",
        "email": "muscat@example.com",
        "status": "Active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

## 4.2 Create Branch

```http
POST /api/v1/branches
```

### Permission

```text
BRANCH_CREATE
```

### Request

```json
{
  "branchName": "Muscat Branch",
  "branchCode": "MCT",
  "address": "Muscat, Oman",
  "city": "Muscat",
  "country": "Oman",
  "phone": "+96890000000",
  "email": "muscat@example.com",
  "branchManagerId": "usr_001",
  "status": "Active",
  "effectiveStartDate": "2026-06-19",
  "effectiveEndDate": null
}
```

### Success Response

```json
{
  "success": true,
  "message": "Branch created successfully",
  "data": {
    "id": "br_001",
    "branchCode": "MCT",
    "branchName": "Muscat Branch",
    "status": "Active"
  }
}
```

### Validations

```text
Branch name is required
Branch code is required
Branch code must be unique
Country is required
Email must be valid if provided
Effective start date is required
Effective end date cannot be before effective start date
```

### Business Rules

```text
Branch code cannot be changed after creation unless authorized
Inactive branches cannot be used for new admissions, batches, schedules, or enrollments
Historical records must remain linked to inactive branches
```

### Audit

```text
BranchCreated
```

---

## 4.3 Get Branch Details

```http
GET /api/v1/branches/{branchId}
```

### Permission

```text
BRANCH_VIEW
```

---

## 4.4 Update Branch

```http
PATCH /api/v1/branches/{branchId}
```

### Permission

```text
BRANCH_EDIT
```

### Request

```json
{
  "branchName": "Muscat Main Branch",
  "address": "Muscat, Oman",
  "city": "Muscat",
  "country": "Oman",
  "phone": "+96891111111",
  "email": "main-muscat@example.com",
  "branchManagerId": "usr_002",
  "status": "Active",
  "effectiveStartDate": "2026-06-19",
  "effectiveEndDate": null
}
```

### Business Rules

```text
Branch code should not be changed through normal update API
Changing branch manager must be audited
Branch cannot be deleted if referenced by operational records
```

### Audit

```text
BranchUpdated
```

---

## 4.5 Activate Branch

```http
POST /api/v1/branches/{branchId}/activate
```

### Permission

```text
BRANCH_ACTIVATE
```

### Response

```json
{
  "success": true,
  "message": "Branch activated successfully"
}
```

### Audit

```text
BranchActivated
```

---

## 4.6 Deactivate Branch

```http
POST /api/v1/branches/{branchId}/deactivate
```

### Permission

```text
BRANCH_DEACTIVATE
```

### Request

```json
{
  "reason": "Branch temporarily closed"
}
```

### Validations

```text
Reason is required
```

### Business Rules

```text
Inactive branch must not be available for new operational records
Existing records remain visible in reports
```

### Audit

```text
BranchDeactivated
```

---

# 5. Department APIs

## 5.1 Get Departments

```http
GET /api/v1/departments
```

### Permission

```text
DEPARTMENT_VIEW
```

### Query Parameters

```text
page
limit
branchId
status
search
sortBy
sortOrder
```

---

## 5.2 Create Department

```http
POST /api/v1/departments
```

### Permission

```text
DEPARTMENT_CREATE
```

### Request

```json
{
  "branchId": "br_001",
  "departmentName": "Safety Training",
  "departmentCode": "SAFETY",
  "departmentHeadId": "usr_003",
  "description": "Safety and HSE training department",
  "status": "Active",
  "effectiveStartDate": "2026-06-19",
  "effectiveEndDate": null
}
```

### Validations

```text
Branch is required
Department name is required
Department code is required
Department code must be unique within branch
Effective start date is required
```

### Business Rules

```text
Department must belong to an active branch
Inactive departments cannot be selected for new course creation
Historical records remain available
```

### Audit

```text
DepartmentCreated
```

---

## 5.3 Get Department Details

```http
GET /api/v1/departments/{departmentId}
```

### Permission

```text
DEPARTMENT_VIEW
```

---

## 5.4 Update Department

```http
PATCH /api/v1/departments/{departmentId}
```

### Permission

```text
DEPARTMENT_EDIT
```

### Request

```json
{
  "departmentName": "HSE Training",
  "departmentHeadId": "usr_004",
  "description": "Health, Safety and Environment training",
  "status": "Active",
  "effectiveStartDate": "2026-06-19",
  "effectiveEndDate": null
}
```

### Audit

```text
DepartmentUpdated
```

---

## 5.5 Activate Department

```http
POST /api/v1/departments/{departmentId}/activate
```

### Permission

```text
DEPARTMENT_ACTIVATE
```

---

## 5.6 Deactivate Department

```http
POST /api/v1/departments/{departmentId}/deactivate
```

### Permission

```text
DEPARTMENT_DEACTIVATE
```

### Request

```json
{
  "reason": "Department no longer used"
}
```

### Validations

```text
Reason is required
```

---

# 6. Classroom APIs

## 6.1 Get Classrooms

```http
GET /api/v1/classrooms
```

### Permission

```text
CLASSROOM_VIEW
```

### Query Parameters

```text
page
limit
branchId
status
search
capacityMin
capacityMax
sortBy
sortOrder
```

---

## 6.2 Create Classroom

```http
POST /api/v1/classrooms
```

### Permission

```text
CLASSROOM_CREATE
```

### Request

```json
{
  "branchId": "br_001",
  "classroomName": "Room 101",
  "capacity": 25,
  "location": "First Floor",
  "status": "Active",
  "effectiveStartDate": "2026-06-19",
  "effectiveEndDate": null
}
```

### Validations

```text
Branch is required
Classroom name is required
Capacity is required
Capacity must be greater than zero
Effective start date is required
```

### Business Rules

```text
Classroom belongs to one branch
Classroom name should be unique within branch
Inactive classrooms cannot be assigned to new sessions
Capacity used by scheduling and batch planning
```

### Audit

```text
ClassroomCreated
```

---

## 6.3 Get Classroom Details

```http
GET /api/v1/classrooms/{classroomId}
```

### Permission

```text
CLASSROOM_VIEW
```

---

## 6.4 Update Classroom

```http
PATCH /api/v1/classrooms/{classroomId}
```

### Permission

```text
CLASSROOM_EDIT
```

### Request

```json
{
  "classroomName": "Room 101A",
  "capacity": 30,
  "location": "First Floor",
  "status": "Active",
  "effectiveStartDate": "2026-06-19",
  "effectiveEndDate": null
}
```

### Business Rules

```text
Capacity changes must not modify historical session data
Capacity change may affect future scheduling warnings
```

### Audit

```text
ClassroomUpdated
```

---

## 6.5 Activate Classroom

```http
POST /api/v1/classrooms/{classroomId}/activate
```

### Permission

```text
CLASSROOM_ACTIVATE
```

---

## 6.6 Deactivate Classroom

```http
POST /api/v1/classrooms/{classroomId}/deactivate
```

### Permission

```text
CLASSROOM_DEACTIVATE
```

### Request

```json
{
  "reason": "Room under maintenance"
}
```

---

# 7. Organization Hierarchy APIs

## 7.1 Get Organization Hierarchy

```http
GET /api/v1/organization/hierarchy
```

### Permission

```text
ORGANIZATION_VIEW
```

### Response

```json
{
  "success": true,
  "data": {
    "institute": {
      "id": "ins_001",
      "name": "Al Saud International",
      "branches": [
        {
          "id": "br_001",
          "name": "Muscat Branch",
          "departments": [
            {
              "id": "dep_001",
              "name": "Safety Training"
            }
          ],
          "classrooms": [
            {
              "id": "cls_001",
              "name": "Room 101"
            }
          ]
        }
      ]
    }
  }
}
```

---

# 8. Master Lookup APIs

## 8.1 Get Active Branches Lookup

```http
GET /api/v1/lookups/branches
```

### Permission

```text
Authenticated User
```

### Business Rules

```text
Only active branches visible
Apply user data scope
```

---

## 8.2 Get Active Departments Lookup

```http
GET /api/v1/lookups/departments?branchId=br_001
```

---

## 8.3 Get Active Classrooms Lookup

```http
GET /api/v1/lookups/classrooms?branchId=br_001
```

---

# 9. Business Error Examples

## Duplicate Branch Code

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_RECORD",
    "message": "Branch code already exists"
  }
}
```

## Inactive Branch

```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Cannot create department under inactive branch"
  }
}
```

## Invalid Effective Date

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Effective end date cannot be earlier than effective start date"
  }
}
```

---

# 10. Events Published

```text
InstituteUpdated
BranchCreated
BranchUpdated
BranchActivated
BranchDeactivated
DepartmentCreated
DepartmentUpdated
DepartmentActivated
DepartmentDeactivated
ClassroomCreated
ClassroomUpdated
ClassroomActivated
ClassroomDeactivated
```

---

# 11. Audit Requirements

Audit must capture:

```text
Institute update
Branch create/update/activate/deactivate
Department create/update/activate/deactivate
Classroom create/update/activate/deactivate
Hierarchy changes
```

---

# 12. Data Scope Rules

```text
Owner / Management → All branches
Branch Manager → Assigned branches only
Counselor → Assigned branch data
Trainer → Assigned branch/session data
Student → Own student-facing data only
```

---
