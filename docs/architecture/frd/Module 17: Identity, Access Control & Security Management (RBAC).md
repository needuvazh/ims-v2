# Functional Requirement Document (FRD)

## Module 17: Identity, Access Control & Security Management (RBAC)

**Version:** 1.0
**Module Code:** IAM

**Dependencies:**

* Organization Management
* Branch Management

**Provides Data To:**

* All Business Modules
* Audit Management
* Approval Workflows
* Future SSO Integration

---

# 1. Business Purpose

Identity & Access Management (IAM) is responsible for authentication, authorization, role management, user lifecycle management, permission enforcement, security auditing, and approval authorization.

The module shall support:

* User Management
* Dynamic Role Builder
* Permission Builder
* Menu Security
* Action Security
* Data Security
* Authentication
* Password Policies
* Session Management
* Audit Logging
* Approval Authorization

---

# 2. Security Architecture

```text
User
   ↓
Authentication
   ↓
Role Assignment
   ↓
Permission Evaluation
   ↓
Data Access Validation
   ↓
Business Action
```

---

# 3. Identity Architecture

```text
User
   ↓
Role
   ↓
Permission
   ↓
Menu Access
   ↓
Action Access
```

---

# 4. Authentication Methods

Phase 1

```text
Email + Password
```

Future

```text
Mobile OTP
Google SSO
Microsoft SSO
LDAP
```

---

# 5. User Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
```

Alternative

```text
Active
   ↓
Locked
```

---

### Password Reset Flow

```text
User
  ↓
Forgot Password
  ↓
Email Link
  ↓
Reset Password
```

---

# 6. User Management

## IAM-UI-001 User List

### Columns

```text
User ID
Full Name
Email
Role Count
Status
Last Login
Actions
```

### Filters

```text
Branch
Department
Role
Status
```

### Actions

```text
Create User
Edit User
Assign Roles
Reset Password
Lock User
Deactivate User
```

### Permissions

```text
USER_VIEW
USER_CREATE
USER_EDIT
USER_LOCK
USER_RESET_PASSWORD
```

---

# 7. Create User

## IAM-UI-002 User Screen

### Personal Information

Fields

```text
First Name
Last Name
Email
Mobile Number
```

---

### Organization Information

Fields

```text
Branch
Department
Designation
```

---

### Security Information

Fields

```text
Username
Password
Status
```

---

### Business Rules

* Email must be unique.
* Username must be unique.
* User may belong to multiple roles.
* User may belong to multiple branches.

---

# 8. Dynamic Role Builder

## IAM-UI-003 Role List

### Columns

```text
Role Code
Role Name
Status
User Count
Actions
```

### Actions

```text
Create Role
Edit Role
Clone Role
Deactivate Role
```

---

### Examples

```text
Branch Manager
Counselor
Trainer
Accountant
Academic Coordinator
Corporate Coordinator
```

No hard-coded roles.

---

# 9. Create Role

## IAM-UI-004 Role Builder

### Fields

```text
Role Code
Role Name
Description
Status
```

---

### Actions

```text
Assign Menus
Assign Permissions
Assign Data Scope
Save
```

---

### Business Rules

* Roles fully configurable.
* Roles reusable.
* Roles may be cloned.

---

# 10. Permission Builder

## IAM-UI-005 Permission Assignment

### Permission Structure

```text
Module
    ↓
Feature
    ↓
Action
```

---

### Example

```text
Student Management
      ↓
Student
      ↓
View
Create
Edit
Delete
Approve
Export
```

---

### Supported Actions

```text
View
Create
Edit
Delete
Approve
Reject
Print
Export
Upload
Download
```

---

# 11. Menu Security

## IAM-UI-006 Menu Access

### Example

```text
Student Management
Finance
Attendance
Corporate Training
Reports
```

---

### Permissions

```text
Menu Visible
Menu Hidden
```

---

### Business Rules

* Menu hidden if user lacks permission.
* Menu hierarchy supported.

---

# 12. Data Scope Security

## IAM-UI-007 Data Access Rules

### Scope Types

```text
All Data
Branch Data
Department Data
Self Data
Assigned Data
```

---

### Examples

Branch Manager

```text
Own Branch Only
```

---

Counselor

```text
Assigned Leads Only
```

---

Trainer

```text
Assigned Batches Only
```

---

### Business Rules

* Data scope evaluated on every query.
* Scope independent from menu permissions.

---

# 13. Multi-Role Support

## User Role Assignment

A user may have:

```text
Role A
Role B
Role C
```

---

### Example

```text
Trainer
+
Academic Coordinator
```

---

### Business Rules

Effective permissions:

```text
Union Of Permissions
```

---

# 14. Approval Authorization

## IAM-UI-008 Approval Matrix

### Approval Types

```text
Refund Approval
Completion Approval
Certificate Approval
Payroll Approval
```

---

### Configuration

```text
Approval Type
Approver Role
Escalation Role
```

---

### Business Rules

* Approval rights permission-based.
* Approval history retained.

---

# 15. Password Policy

## IAM-UI-009 Password Policy

### Configurable Rules

```text
Minimum Length
Uppercase Required
Lowercase Required
Numeric Required
Special Character Required
Expiry Days
```

---

### Example

```text
Minimum Length = 8
```

---

### Business Rules

* Passwords encrypted.
* Password history retained.

---

# 16. Session Management

## IAM-UI-010 Active Sessions

### Columns

```text
User
Login Time
Last Activity
IP Address
Device
```

---

### Actions

```text
Terminate Session
Terminate All Sessions
```

---

### Business Rules

* Session timeout configurable.
* Concurrent sessions configurable.

---

# 17. Login Audit

## IAM-UI-011 Login History

### Columns

```text
User
Login Time
Logout Time
IP Address
Status
```

---

### Status

```text
Success
Failed
Locked
```

---

### Business Rules

* Failed login tracking required.
* Suspicious activity reporting supported.

---

# 18. Security Dashboard

## IAM-UI-012 Security Dashboard

### KPIs

```text
Active Users
Locked Users
Failed Logins
Active Sessions
Role Count
Permission Count
```

---

### Alerts

```text
Multiple Failed Logins
Password Expiry
Inactive Accounts
```

---

# 19. Functional Requirements

## FR-IAM-001 User Management

The system shall support user lifecycle management.

---

## FR-IAM-002 Dynamic Role Builder

The system shall support configurable roles.

---

## FR-IAM-003 Permission Builder

The system shall support configurable permissions.

---

## FR-IAM-004 Menu Authorization

The system shall support menu-level security.

---

## FR-IAM-005 Data Scope Security

The system shall support row-level access control.

---

## FR-IAM-006 Multi-Role Assignment

The system shall support multiple roles per user.

---

## FR-IAM-007 Approval Authorization

The system shall support configurable approval authority.

---

## FR-IAM-008 Password Policies

The system shall support configurable password policies.

---

## FR-IAM-009 Session Management

The system shall support session tracking and termination.

---

## FR-IAM-010 Login Audit

The system shall maintain login history.

---

## FR-IAM-011 Security Dashboard

The system shall provide security monitoring.

---

## FR-IAM-012 Audit Trail

The system shall maintain complete security audit history.

---

# 20. Notifications

### Password Expiry

Notify:

```text
User
```

---

### Account Locked

Notify:

```text
User
Administrator
```

---

### Multiple Failed Logins

Notify:

```text
Administrator
```

---

### Role Changed

Notify:

```text
Affected User
```

---

# 21. Reports

## Security Reports

```text
User Report
Role Report
Permission Report
Login History Report
Failed Login Report
```

---

## Audit Reports

```text
User Activity Report
Role Change Report
Permission Change Report
Approval Activity Report
```

---

## Compliance Reports

```text
Inactive Users
Locked Accounts
Password Expiry Report
```

---

# 22. Audit Requirements

Audit:

```text
User Created
User Updated
Role Created
Role Modified
Permission Changed
Password Reset
User Locked
User Unlocked
Session Terminated
```

Capture:

```text
User
Timestamp
Action
Old Value
New Value
IP Address
```

---

# 23. Critical Design Decisions

### Dynamic RBAC

Recommended:

```text
Role
   ↓
Permission
   ↓
Action
```

Never hard-code permissions.

---

### Permission Granularity

Recommended:

```text
Module
Feature
Action
```

instead of simple role checks.

---

### Data Security Layer

Recommended:

```text
Role Permission
       +
Data Scope
```

for every query.

---

### Approval Security

Approval authority should come from:

```text
Permission
```

not role names.

---

### Future SSO Readiness

Authentication architecture should support:

```text
Local Authentication
SSO Authentication
```

through pluggable providers.

---

# 24. Integration Points

### Consumes

```text
Organization Management
Branch Management
```

### Provides Data To

```text
All Business Modules
Audit Framework
Approval Workflows
Reporting
Future SSO Integration
```
