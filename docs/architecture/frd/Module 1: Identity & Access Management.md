# 5. Module 1: Identity & Access Management

## 5.1 Business Purpose

Identity & Access Management controls user login, role management, permissions, menu visibility, and action-level access.

The system must not depend on hardcoded roles for authorization.

---

## 5.2 Users Covered

The system should support the following user classifications:

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

User classification is only for grouping. Actual access must be controlled through dynamic roles and permissions.

---

## 5.3 Screens

### IAM-UI-001 Login Screen

Purpose: Allow authorized users to access the system.

Fields:

```text
Email
Password
Remember Me
```

Actions:

```text
Login
Forgot Password
```

Validations:

* Email is required.
* Password is required.
* Invalid credentials should show generic error.
* Inactive users must not login.

Acceptance Criteria:

```text
Given a valid active user
When the user enters correct email and password
Then the system logs in the user and redirects to dashboard

Given an inactive user
When the user tries to login
Then the system denies access
```

---

### IAM-UI-002 User List Screen

Purpose: View and manage system users.

Columns:

```text
User Name
Email
Phone
User Type
Branch
Status
Last Login
Actions
```

Actions:

```text
Create User
View User
Edit User
Activate
Deactivate
Assign Role
Reset Password
```

Filters:

```text
Branch
User Type
Status
Role
```

Permissions:

```text
USER_VIEW
USER_CREATE
USER_EDIT
USER_DEACTIVATE
USER_ASSIGN_ROLE
USER_RESET_PASSWORD
```

---

### IAM-UI-003 Create / Edit User Screen

Fields:

```text
Full Name
Email
Phone
Branch
User Type
Status
Effective Start Date
Effective End Date
```

Business Rules:

* Email must be unique.
* User must be assigned to at least one branch where applicable.
* User can have one or more roles.
* Deactivated users cannot login.
* Student login users may be created from Student Management.

Validations:

* Full Name is required.
* Email is required.
* Email format must be valid.
* User Type is required.
* Branch is required except for Owner / Management-level users.

---

### IAM-UI-004 Role List Screen

Columns:

```text
Role Name
Description
Status
Effective Start Date
Effective End Date
Actions
```

Actions:

```text
Create Role
Edit Role
View Permissions
Activate
Deactivate
```

Permissions:

```text
ROLE_VIEW
ROLE_CREATE
ROLE_EDIT
ROLE_DEACTIVATE
```

---

### IAM-UI-005 Create / Edit Role Screen

Fields:

```text
Role Name
Description
Status
Effective Start Date
Effective End Date
```

Business Rules:

* Role name must be unique.
* Role cannot be deleted if assigned to active users.
* Role can be deactivated.
* Deactivated role should not be assignable to new users.

---

### IAM-UI-006 Permission Assignment Screen

Purpose: Assign permissions to roles.

Sections:

```text
Module Permissions
Menu Permissions
Action Permissions
Report Permissions
```

Example Permissions:

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
```

Actions:

```text
Add Permission
Remove Permission
Save Permission Set
```

Business Rules:

* Only active permissions can be assigned.
* Permission changes should apply after next login or session refresh.
* Permission updates must be audited.

---

## 5.4 Functional Requirements

### FR-IAM-001 User Login

The system shall allow users to login using email and password.

### FR-IAM-002 User Management

The system shall allow authorized users to create, update, activate, and deactivate users.

### FR-IAM-003 Dynamic Role Management

The system shall allow authorized users to create and manage roles dynamically.

### FR-IAM-004 Permission Management

The system shall allow permissions to be assigned to roles.

### FR-IAM-005 User Role Assignment

The system shall allow one or more roles to be assigned to a user.

### FR-IAM-006 Access Enforcement

The system shall enforce access based on assigned permissions.

### FR-IAM-007 Branch Data Scope

Branch managers shall only access data for assigned branches unless granted broader permission.

### FR-IAM-008 Counselor Data Scope

Counselors shall primarily access assigned leads unless granted broader branch lead access.

---