# Functional Requirement Document

## Module 1: Identity & Access Management

**Version:** 1.1
**Module Code:** IAM
**Phase:** Phase 1
**Owned Bounded Context:** Identity & Access Management

**Dependencies:**

* Organization Management

**Provides Data To:**

* All Business Modules
* Audit & Compliance
* Approval Workflows
* Reporting & Dashboards

---

# 1. Business Purpose

Identity & Access Management controls authentication, authorization, user lifecycle, role management, permission assignment, menu access, report access, and branch-scoped data access.

The module shall use dynamic RBAC. Roles must not be hardcoded in application logic.

This module is the security foundation of IMS and shall be the only place where system users, roles, permissions, and access policies are managed.

---

# 2. Scope

## 2.1 In Scope

* User login and logout
* User lifecycle management
* Password reset initiation and password policy enforcement
* Role management
* Permission management
* Role-permission mapping
* User-role assignment
* Menu permissions
* Action permissions
* Report permissions
* Branch-scoped data access
* Counselor assigned-data access
* Session status handling
* Login audit
* Security audit

## 2.2 Out of Scope for Phase 1

* SSO / external identity providers
* OTP authentication
* MFA
* LDAP
* Federation
* Public self-service user registration

---

# 3. Business Principles

* Authorization must be enforced server-side.
* UI visibility is not authorization.
* Access evaluation must consider role, permission, user status, session status, and data scope.
* A user may hold multiple roles.
* Permission assignment must be auditable.
* Data scope must be evaluated on every protected request.
* Branch managers access only assigned branch data unless an explicit broader permission is granted.
* Counselors access assigned leads by default unless an explicit broader branch lead permission is granted.
* Student, trainer, accountant, counselor, branch manager, and management access must remain separated by policy.

---

# 4. Owned Concepts

The IAM context owns:

* User
* Role
* Permission
* Menu
* UserRole
* RolePermission
* AccessPolicy
* LoginHistory
* Session
* PasswordPolicy

Notes:

* `UserType` is a grouping label only. It must not replace role-based authorization.
* `AccessPolicy` represents explicit scope rules such as branch-only, assigned-only, or self-only access.

---

# 5. User Classifications

The system shall support the following user classifications for grouping and UI filtering:

```text
Owner
Admin
Branch Manager
Counselor
Trainer
Accountant
Student
Corporate Focal
Academic Coordinator
Management
```

Rules:

* User classification is not authorization.
* Access must always come from roles and permissions.
* A user classification may map to one or more default role templates during setup, but the template remains editable.

---

# 6. Security Model

## 6.1 Permission Types

The system shall support:

```text
Module Permissions
Menu Permissions
Action Permissions
Report Permissions
Data Scope Rules
```

## 6.2 Scope Types

```text
All Data
Branch Data
Department Data
Self Data
Assigned Data
```

## 6.3 Access Evaluation Order

Protected requests shall evaluate in this order:

```text
Authentication
Session Status
User Status
Permission Check
Data Scope Check
Business Rule Check
```

## 6.4 Mandatory Security Rules

* Inactive users cannot login.
* Locked users cannot login.
* Deactivated roles cannot be assigned to new users.
* Only active permissions can be assigned to roles.
* Permission changes take effect after the next login or session refresh.
* Sensitive access-control changes must be audited.

---

# 7. Lifecycle Rules

## 7.1 User Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
```

Alternative:

```text
Active
  ↓
Locked
```

## 7.2 Role Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
```

## 7.3 Permission Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
```

## 7.4 Session Lifecycle

```text
Active
  ↓
Expired
```

Alternative:

```text
Active
  ↓
Revoked
```

---

# 8. Screens

## IAM-UI-001 Login Screen

### Purpose

Allow authorized users to access the system.

### Fields

```text
Email
Password
Remember Me
```

### Actions

```text
Login
Forgot Password
```

### Validations

* Email is required.
* Password is required.
* Email format must be valid.
* Invalid credentials must return a generic error.
* Inactive users must not login.
* Locked users must not login.

### Business Rules

* Successful login creates a login audit record.
* Failed login attempts must be tracked.
* Session tokens must be issued only after authentication succeeds.

### Acceptance Criteria

```text
Given a valid active user
When the user enters correct email and password
Then the system logs in the user and redirects to the dashboard

Given an inactive user
When the user tries to login
Then the system denies access

Given repeated invalid login attempts
When the threshold is exceeded
Then the system locks or throttles the account according to policy
```

---

## IAM-UI-002 User List Screen

### Purpose

View and manage system users.

### Columns

```text
User Name
Email
Phone
User Classification
Branch
Status
Last Login
Actions
```

### Filters

```text
Branch
User Classification
Status
Role
Search
```

### Actions

```text
Create User
View User
Edit User
Activate
Deactivate
Lock
Unlock
Assign Role
Reset Password
```

### Permissions

```text
USER_VIEW
USER_CREATE
USER_EDIT
USER_DEACTIVATE
USER_LOCK
USER_UNLOCK
USER_ASSIGN_ROLE
USER_RESET_PASSWORD
```

---

## IAM-UI-003 Create / Edit User Screen

### Fields

```text
Full Name
Email
Phone
Branch
User Classification
Status
Effective Start Date
Effective End Date
```

### Business Rules

* Email must be unique.
* A user may be assigned one or more branches only where applicable.
* A user may have one or more roles.
* Deactivated users cannot login.
* Student login users may be created from Student Management when portal access is enabled.
* Owner and Management-level users may be branch-less if the policy allows global scope.

### Validations

* Full Name is required.
* Email is required.
* Email format must be valid.
* User Classification is required.
* Branch is required except for Owner / Management-level users with global scope.

---

## IAM-UI-004 Role List Screen

### Columns

```text
Role Name
Description
Status
Effective Start Date
Effective End Date
Actions
```

### Actions

```text
Create Role
Edit Role
View Permissions
Activate
Deactivate
```

### Permissions

```text
ROLE_VIEW
ROLE_CREATE
ROLE_EDIT
ROLE_DEACTIVATE
```

---

## IAM-UI-005 Create / Edit Role Screen

### Fields

```text
Role Name
Description
Status
Effective Start Date
Effective End Date
```

### Business Rules

* Role name must be unique.
* Role cannot be deleted if assigned to active users.
* Role can be deactivated.
* Deactivated role should not be assignable to new users.
* Role changes must be audited.

---

## IAM-UI-006 Permission Assignment Screen

### Purpose

Assign permissions to roles.

### Sections

```text
Module Permissions
Menu Permissions
Action Permissions
Report Permissions
Data Scope Rules
```

### Example Permissions

```text
LEAD_VIEW
LEAD_CREATE
LEAD_EDIT
LEAD_CONVERT
STUDENT_VIEW
STUDENT_CREATE
ENROLLMENT_CREATE
PAYMENT_CREATE
REFUND_REQUEST
REFUND_APPROVE
CERTIFICATE_GENERATE
AUDIT_VIEW
REPORT_EXPORT
```

### Actions

```text
Add Permission
Remove Permission
Save Permission Set
```

### Business Rules

* Only active permissions can be assigned.
* Permission changes should apply after next login or session refresh.
* Permission updates must be audited.
* Menu and report access must never be treated as a substitute for action permissions.

---

# 9. Functional Requirements

## FR-IAM-001 User Login

The system shall allow users to login using email and password.

## FR-IAM-002 User Logout

The system shall allow authenticated users to logout and invalidate active session state.

## FR-IAM-003 User Management

The system shall allow authorized users to create, update, activate, deactivate, lock, and unlock users.

## FR-IAM-004 Dynamic Role Management

The system shall allow authorized users to create, update, activate, and deactivate roles dynamically.

## FR-IAM-005 Permission Management

The system shall allow permissions to be created, activated, deactivated, and assigned to roles.

## FR-IAM-006 Role Permission Assignment

The system shall allow permissions to be assigned and removed from roles.

## FR-IAM-007 User Role Assignment

The system shall allow one or more roles to be assigned to a user.

## FR-IAM-008 Access Enforcement

The system shall enforce access based on assigned permissions and current session state.

## FR-IAM-009 Branch Data Scope

Branch managers shall only access data for assigned branches unless granted broader permission.

## FR-IAM-010 Counselor Data Scope

Counselors shall primarily access assigned leads unless granted broader branch lead access.

## FR-IAM-011 Menu Authorization

The system shall enforce menu visibility based on permissions while keeping server-side authorization authoritative.

## FR-IAM-012 Report Authorization

The system shall enforce report access based on report permissions and scope rules.

## FR-IAM-013 Password Policy Enforcement

The system shall enforce password policy rules during password creation and reset.

## FR-IAM-014 Login Audit

The system shall record successful and failed login events.

## FR-IAM-015 Security Audit

The system shall record security-sensitive changes such as role changes, permission changes, lock actions, unlock actions, and password resets.

---

# 10. Audit Events

The following domain events or audit events shall be supported:

```text
UserCreated
UserUpdated
UserActivated
UserDeactivated
UserLocked
UserUnlocked
RoleCreated
RoleUpdated
RoleDeactivated
PermissionAssignedToRole
PermissionRemovedFromRole
UserRoleAssigned
UserRoleRemoved
LoginSucceeded
LoginFailed
PasswordResetRequested
PasswordResetCompleted
SessionRevoked
```

Rules:

* Login success and failure must both be auditable.
* Permission and role changes must include actor, timestamp, and reason where applicable.
* Password values must never appear in audit records.

---

# 11. Acceptance and Error Rules

## 11.1 Validation Failures

Validation failures shall return clear field-level errors for:

```text
Required fields
Invalid email format
Duplicate email
Invalid role status
Invalid permission status
Invalid branch scope
Invalid password policy
```

## 11.2 Domain Errors

The module shall distinguish between validation errors and business-rule errors such as:

```text
InactiveUserCannotLogin
LockedUserCannotLogin
RoleAssignedToActiveUsers
PermissionNotActive
BranchScopeViolation
CounselorScopeViolation
SessionExpired
SessionRevoked
```

---

# 12. Reporting and Operational Views

The IAM context shall support the following operational views:

```text
User List
Role List
Permission Matrix
Login History
Active Sessions
Security Events
```

These views are read models. They must not be treated as separate domain owners.

---

# 13. FRD Improvement Notes

This module should remain the single source of truth for:

* Authentication rules
* Authorization rules
* Role and permission lifecycle
* Data scope policy
* Security audit expectations

It should not contain business rules that belong to Admission, Finance, Attendance, Completion, or Certificate modules.
