# Functional Requirement Document

## Module 17: Identity, Access Control & Security Management (RBAC)

**Version:** 1.1
**Module Code:** IAM
**Phase:** Phase 1
**Owned Bounded Context:** Identity & Access Management

**Dependencies:**

* Organization Management

**Provides Data To:**

* All Business Modules
* Audit & Compliance
* Reporting & Dashboard Management
* Future SSO Integration

---

# 1. Business Purpose

Identity & Access Management authenticates users, assigns access, enforces branch scope, and records security activity.

The context owns user accounts, roles, permissions, role assignments, access policies, sessions, and password policy. Business modules must call this context for permission checks instead of duplicating authorization logic.

---

# 2. Scope

## 2.1 In Scope

* User management
* Dynamic role management
* Permission management
* Menu, action, and report access
* Branch-scoped authorization
* Session management
* Password policy enforcement
* Login history tracking
* Approval authorization

## 2.2 Out of Scope for Phase 1

* Hardcoded roles
* External SSO federation
* Workforce HR master data
* Public self-registration

---

# 3. Owned Concepts

The IAM context owns:

* User
* Role
* Permission
* UserRole
* RolePermission
* AccessPolicy
* Session
* PasswordPolicy
* LoginHistory

---

# 4. Business Principles

* Roles must be configurable at runtime.
* Permissions must support action-level, menu-level, and report-level access.
* UI visibility is not authorization.
* Branch-scoped access must be enforced server-side.
* Counselor access is limited to assigned leads by default.
* Branch manager access is limited to assigned branch data unless an explicit permission extends it.
* Approval permissions must be explicit and auditable.
* Password and session policies must be configurable without code changes.

---

# 5. Business Model

## 5.1 Authentication Methods

Phase 1:

```text
Email + Password
```

Future:

```text
Mobile OTP
Google SSO
Microsoft SSO
LDAP
MFA
```

## 5.2 User Lifecycle

```text
Draft
  ↓
Invited
  ↓
Active
  ↓
Locked
  ↓
Inactive
  ↓
Archived
```

## 5.3 Role Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
```

## 5.4 Session Lifecycle

```text
Created
  ↓
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

# 6. Screens

## IAM-UI-001 User List

### Columns

```text
User ID
Full Name
Email
Branch
Role Count
Status
Last Login
Actions
```

### Actions

```text
Create User
Edit User
Assign Roles
Reset Password
Lock User
Deactivate User
Revoke Sessions
```

## IAM-UI-002 User Form

### Fields

```text
First Name
Last Name
Email
Mobile Number
Username
Branch
Department
Designation
Status
```

## IAM-UI-003 Role Builder

### Fields

```text
Role Code
Role Name
Description
Status
```

### Actions

```text
Create Role
Clone Role
Edit Role
Deactivate Role
```

## IAM-UI-004 Permission Matrix

### Areas

```text
Menu Permissions
Action Permissions
Report Permissions
Approval Permissions
Branch Scope Rules
```

## IAM-UI-005 Session Monitor

### Columns

```text
User
Device
IP Address
Created At
Last Activity
Status
Actions
```

---

# 7. Functional Requirements

* The system shall create and manage users with unique email and username values.
* The system shall allow administrators to assign multiple roles to a user.
* The system shall enforce branch scope on every protected action.
* The system shall support configurable access policies for menu, action, report, and approval access.
* The system shall record login attempts, successful logins, failed logins, and password resets.
* The system shall allow session revocation from the admin console.
* The system shall support password policy configuration without code changes.
* The system shall support future MFA and SSO integrations through adapters.

---

# 8. Audit Events

The module shall emit audit events for:

```text
UserCreated
UserUpdated
UserLocked
UserDeactivated
RoleCreated
RoleUpdated
RoleDeactivated
PermissionGranted
PermissionRevoked
LoginSucceeded
LoginFailed
PasswordResetRequested
PasswordResetCompleted
SessionRevoked
```

---

# 9. Domain Errors

```text
USER_NOT_FOUND
USER_ALREADY_EXISTS
USER_LOCKED
ROLE_NOT_FOUND
PERMISSION_DENIED
PASSWORD_POLICY_VIOLATION
SESSION_NOT_FOUND
BRANCH_SCOPE_VIOLATION
```

---

# 10. Reporting Views

```text
Users by Role
Users by Branch
Failed Login Summary
Permission Change History
Session Activity
Approval Access Summary
```

