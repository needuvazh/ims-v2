# Detailed API Contract Specification

## Module 1: Identity, Access Control & Security Management (RBAC)

**Version:** 1.0
**Base URL:** `/api/v1`
**Module Code:** `IAM`

---

# 1. Module Purpose

This API module manages:

* Authentication
* User management
* Role management
* Permission management
* Role-permission mapping
* User-role assignment
* Session management
* Password reset
* Login audit

---

# 2. Common Security Requirements

All IAM APIs except login and password reset request must require authentication.

Protected APIs must validate:

```text
Access Token
Permission
Data Scope
User Status
Session Status
```

---

# 3. Authentication APIs

## 3.1 Login

```http
POST /api/v1/auth/login
```

### Permission

```text
Public
```

### Request

```json
{
  "email": "admin@example.com",
  "password": "Password@123"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 3600,
    "user": {
      "id": "usr_001",
      "fullName": "Admin User",
      "email": "admin@example.com",
      "status": "Active"
    }
  }
}
```

### Validations

```text
Email is required
Password is required
Email format must be valid
```

### Business Rules

```text
Inactive users cannot login
Locked users cannot login
Failed login count must be tracked
Successful login must create login audit
```

---

## 3.2 Logout

```http
POST /api/v1/auth/logout
```

### Permission

```text
Authenticated User
```

### Response

```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## 3.3 Refresh Token

```http
POST /api/v1/auth/refresh
```

### Request

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

---

# 4. User APIs

## 4.1 Get Users

```http
GET /api/v1/users
```

### Permission

```text
USER_VIEW
```

### Query Parameters

```text
page
limit
sortBy
sortOrder
branchId
roleId
status
search
```

### Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "usr_001",
        "fullName": "Admin User",
        "email": "admin@example.com",
        "phone": "+96890000000",
        "userType": "Admin",
        "branchName": "Muscat Branch",
        "status": "Active",
        "lastLoginAt": "2026-06-19T10:00:00Z"
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

## 4.2 Create User

```http
POST /api/v1/users
```

### Permission

```text
USER_CREATE
```

### Request

```json
{
  "fullName": "Ahmed Ali",
  "email": "ahmed@example.com",
  "phone": "+96890000000",
  "userType": "Counselor",
  "branchIds": ["br_001"],
  "roleIds": ["role_001"],
  "status": "Active",
  "effectiveStartDate": "2026-06-19",
  "effectiveEndDate": null
}
```

### Success Response

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "usr_002",
    "fullName": "Ahmed Ali",
    "email": "ahmed@example.com",
    "status": "Active"
  }
}
```

### Validations

```text
Full name is required
Email is required
Email must be unique
User type is required
At least one branch is required unless management-level user
At least one role is required
```

### Audit

```text
UserCreated
```

---

## 4.3 Get User Details

```http
GET /api/v1/users/{userId}
```

### Permission

```text
USER_VIEW
```

---

## 4.4 Update User

```http
PATCH /api/v1/users/{userId}
```

### Permission

```text
USER_EDIT
```

### Request

```json
{
  "fullName": "Ahmed Ali Updated",
  "phone": "+96891111111",
  "userType": "Counselor",
  "branchIds": ["br_001"],
  "status": "Active",
  "effectiveStartDate": "2026-06-19",
  "effectiveEndDate": null
}
```

### Business Rules

```text
Email cannot be changed without special permission
Inactive users cannot perform system actions
Changes must be audited
```

---

## 4.5 Activate User

```http
POST /api/v1/users/{userId}/activate
```

### Permission

```text
USER_ACTIVATE
```

---

## 4.6 Deactivate User

```http
POST /api/v1/users/{userId}/deactivate
```

### Permission

```text
USER_DEACTIVATE
```

### Request

```json
{
  "reason": "User left organization"
}
```

### Validations

```text
Reason is required
```

---

## 4.7 Reset User Password

```http
POST /api/v1/users/{userId}/reset-password
```

### Permission

```text
USER_RESET_PASSWORD
```

### Response

```json
{
  "success": true,
  "message": "Password reset link sent successfully"
}
```

---

# 5. Role APIs

## 5.1 Get Roles

```http
GET /api/v1/roles
```

### Permission

```text
ROLE_VIEW
```

### Query Parameters

```text
page
limit
status
search
```

---

## 5.2 Create Role

```http
POST /api/v1/roles
```

### Permission

```text
ROLE_CREATE
```

### Request

```json
{
  "roleCode": "COUNSELOR",
  "roleName": "Counselor",
  "description": "Handles leads and admissions",
  "status": "Active",
  "effectiveStartDate": "2026-06-19",
  "effectiveEndDate": null
}
```

### Validations

```text
Role code is required
Role name is required
Role code must be unique
Role name must be unique
```

---

## 5.3 Update Role

```http
PATCH /api/v1/roles/{roleId}
```

### Permission

```text
ROLE_EDIT
```

---

## 5.4 Clone Role

```http
POST /api/v1/roles/{roleId}/clone
```

### Permission

```text
ROLE_CREATE
```

### Request

```json
{
  "roleCode": "SENIOR_COUNSELOR",
  "roleName": "Senior Counselor"
}
```

---

## 5.5 Deactivate Role

```http
POST /api/v1/roles/{roleId}/deactivate
```

### Permission

```text
ROLE_DEACTIVATE
```

### Business Rules

```text
Role cannot be deactivated if assigned to active users unless force flag is allowed
Deactivated role cannot be assigned to new users
```

---

# 6. Permission APIs

## 6.1 Get Permissions

```http
GET /api/v1/permissions
```

### Permission

```text
PERMISSION_VIEW
```

### Query Parameters

```text
module
feature
action
status
```

---

## 6.2 Get Permission Modules

```http
GET /api/v1/permissions/modules
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "module": "Student Management",
      "features": [
        {
          "feature": "Student",
          "actions": ["View", "Create", "Edit", "Export"]
        }
      ]
    }
  ]
}
```

---

# 7. Role Permission APIs

## 7.1 Assign Permissions to Role

```http
POST /api/v1/roles/{roleId}/permissions
```

### Permission

```text
ROLE_PERMISSION_EDIT
```

### Request

```json
{
  "permissionIds": [
    "perm_001",
    "perm_002",
    "perm_003"
  ]
}
```

### Business Rules

```text
Only active permissions can be assigned
Old permission mapping should be replaced with new mapping
Permission changes must be audited
Affected users should refresh session to receive new permissions
```

---

## 7.2 Get Role Permissions

```http
GET /api/v1/roles/{roleId}/permissions
```

### Permission

```text
ROLE_PERMISSION_VIEW
```

---

# 8. User Role APIs

## 8.1 Assign Roles to User

```http
POST /api/v1/users/{userId}/assign-roles
```

### Permission

```text
USER_ASSIGN_ROLE
```

### Request

```json
{
  "roleIds": ["role_001", "role_002"]
}
```

### Business Rules

```text
Only active roles can be assigned
User can have multiple roles
Effective permission is union of assigned role permissions
Role assignment must be audited
```

---

## 8.2 Get User Roles

```http
GET /api/v1/users/{userId}/roles
```

### Permission

```text
USER_VIEW
```

---

# 9. Data Scope APIs

## 9.1 Update User Data Scope

```http
POST /api/v1/users/{userId}/data-scope
```

### Permission

```text
USER_DATA_SCOPE_EDIT
```

### Request

```json
{
  "scopeType": "BranchData",
  "branchIds": ["br_001"],
  "departmentIds": [],
  "assignedOnly": false
}
```

### Supported Scope Types

```text
AllData
BranchData
DepartmentData
AssignedData
SelfData
```

---

## 9.2 Get User Data Scope

```http
GET /api/v1/users/{userId}/data-scope
```

### Permission

```text
USER_VIEW
```

---

# 10. Session APIs

## 10.1 Get Active Sessions

```http
GET /api/v1/security/sessions
```

### Permission

```text
SESSION_VIEW
```

---

## 10.2 Terminate Session

```http
POST /api/v1/security/sessions/{sessionId}/terminate
```

### Permission

```text
SESSION_TERMINATE
```

---

# 11. Login Audit APIs

## 11.1 Get Login History

```http
GET /api/v1/security/login-history
```

### Permission

```text
LOGIN_HISTORY_VIEW
```

### Query Parameters

```text
userId
status
dateFrom
dateTo
ipAddress
```

---

# 12. Standard Business Errors

## Duplicate Email

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_RECORD",
    "message": "A user already exists with this email"
  }
}
```

## Forbidden

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action"
  }
}
```

## Invalid Login

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

# 13. Events Published

```text
UserCreated
UserUpdated
UserActivated
UserDeactivated
UserRoleAssigned
RoleCreated
RoleUpdated
RolePermissionUpdated
LoginSuccessful
LoginFailed
SessionTerminated
```

---

# 14. Audit Requirements

Audit must capture:

```text
User creation
User update
User activation/deactivation
Role creation
Role update
Permission changes
User role assignment
Login success/failure
Session termination
Password reset
```

---
