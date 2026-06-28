# Module 01 — Identity & Access Management (IAM)

## Part 1

### Business Overview

### Functional Requirements

### Business Rules

**Version:** 3.0

**Status:** Draft

---

# Document Information

| Item        | Value                        |
| ----------- | ---------------------------- |
| Module      | Identity & Access Management |
| Module Code | IAM                          |
| Version     | 3.0                          |
| Owner       | Architecture Team            |
| Domain      | Identity & Security          |
| Priority    | Critical                     |
| Depends On  | None                         |
| Used By     | Every Module                 |

---

# 1. Introduction

## 1.1 Purpose

The Identity & Access Management (IAM) module is the foundational security layer of the ASTI Integrated Institute Management System (IMS).

Every authenticated user, whether an administrator, counselor, trainer, accountant, student, executive, or corporate coordinator, must pass through the IAM module before accessing any business functionality.

This module provides centralized services for:

* Authentication
* Authorization
* Identity lifecycle management
* Role-Based Access Control (RBAC)
* Permission management
* Branch-level access control
* Session management
* Password management
* Audit logging
* Security policy enforcement

The module is designed to support both the current single-institute deployment and future SaaS multi-tenant evolution without redesign.

---

# 1.2 Business Objectives

The IAM module aims to achieve the following business objectives:

### BO-001

Provide secure authentication for all users.

---

### BO-002

Ensure users only access information they are authorized to view or modify.

---

### BO-003

Support dynamic role and permission management without requiring software changes.

---

### BO-004

Enforce branch-based data isolation to prevent unauthorized access between organizational units.

---

### BO-005

Provide a complete audit trail for security-sensitive actions.

---

### BO-006

Reduce operational overhead through centralized identity management.

---

### BO-007

Support future enterprise integrations such as Microsoft Entra ID, Google Workspace, and SSO providers.

---

### BO-008

Comply with security best practices and regulatory requirements applicable to Oman and future GCC deployments.

---

# 1.3 Scope

## In Scope

The following capabilities are included in the IAM module:

### Identity Management

* User account creation
* User account modification
* User activation
* User deactivation
* User archival

---

### Authentication

* Email and password login
* Password reset
* Password change
* Account lockout
* Session creation
* Logout
* Remember Me (Future)

---

### Authorization

* Dynamic role management
* Permission management
* Branch access
* Dashboard permissions
* Report permissions
* Menu permissions
* API permissions

---

### Security

* Password policy
* Session timeout
* Login history
* Failed login tracking
* Security audit logs

---

### Administration

* Role administration
* Permission administration
* Branch assignment
* User assignment
* Security policy configuration

---

## Out of Scope

The following belong to other modules:

| Function             | Owner Module           |
| -------------------- | ---------------------- |
| Student Profile      | Student Management     |
| Trainer Details      | Trainer Management     |
| Employee Records     | HRMS                   |
| Course Access Logic  | Course Management      |
| Financial Approval   | Finance                |
| Certificate Approval | Certificate Management |

---

# 1.4 Stakeholders

| Stakeholder             | Responsibility                   |
| ----------------------- | -------------------------------- |
| Super Administrator     | Full platform administration     |
| Institute Administrator | Organization-wide administration |
| Branch Administrator    | Branch-level administration      |
| HR Manager              | Employee account requests        |
| Department Manager      | Access approval                  |
| Receptionist            | Admission access                 |
| Counselor               | CRM access                       |
| Trainer                 | Training access                  |
| Accountant              | Finance access                   |
| Corporate Coordinator   | Corporate portal access          |
| Student                 | Student portal access            |
| Executive               | Dashboard access                 |
| IT Administrator        | Security administration          |

---

# 1.5 Business Capabilities

The IAM module provides the following business capabilities.

| Capability                | Description                                |
| ------------------------- | ------------------------------------------ |
| User Lifecycle Management | Create, update, activate, deactivate users |
| Authentication            | Validate identity                          |
| Authorization             | Evaluate permissions                       |
| Branch Security           | Restrict organizational data               |
| Role Management           | Configure business roles                   |
| Permission Management     | Fine-grained authorization                 |
| Security Policies         | Password, sessions, login controls         |
| Audit Logging             | Security event recording                   |
| API Security              | Secure backend APIs                        |
| Session Management        | Manage active sessions                     |

---

# 1.6 Business Benefits

Implementation of the IAM module provides the following measurable benefits:

| Benefit                   | Expected Outcome              |
| ------------------------- | ----------------------------- |
| Reduced security risks    | Prevent unauthorized access   |
| Faster onboarding         | User creation in minutes      |
| Simplified administration | Dynamic role assignment       |
| Better compliance         | Complete audit history        |
| Improved scalability      | No hardcoded permissions      |
| Lower maintenance         | Configuration-driven security |

---

# 2. Functional Requirements

---

## 2.1 User Lifecycle Management

### FR-IAM-001 Create User

### Description

The system shall allow authorized administrators to create a new user account.

### Actors

* Super Administrator
* Institute Administrator
* Branch Administrator

### Preconditions

Administrator is authenticated.

Administrator has permission:

```text
iam.user.create
```

### Inputs

* First Name
* Last Name
* Email
* Mobile
* Employee ID (optional)
* Branch Assignment
* Department
* Roles
* Preferred Language
* Status

### Processing

1. Validate input.
2. Check duplicate email.
3. Check duplicate mobile.
4. Create Person record.
5. Create User record.
6. Assign branches.
7. Assign roles.
8. Generate temporary password.
9. Send activation email.
10. Create audit log.

### Outputs

* User created
* Activation email sent
* Audit recorded

### Post Conditions

User exists.

Account inactive until activation.

### Priority

Critical

---

### FR-IAM-002 Update User

The system shall allow administrators to update user details.

Editable fields include:

* Name
* Mobile
* Branches
* Department
* Preferred Language
* Roles

Email cannot be modified once verified unless approved by a Super Administrator.

---

### FR-IAM-003 Activate User

The system shall activate a pending user account after email verification or administrator approval.

---

### FR-IAM-004 Suspend User

The system shall suspend a user without deleting historical records.

Suspended users:

* Cannot authenticate.
* Retain historical ownership.
* Remain visible in audit logs.

---

### FR-IAM-005 Archive User

Archived users are removed from operational views but retained for compliance and reporting.

---

### FR-IAM-006 Delete User

Hard deletion is prohibited.

Only logical deletion (archive) is supported.

---

## 2.2 Authentication

### FR-IAM-010 User Login

The system shall authenticate users using:

* Email
* Password

Validation steps:

1. User exists.
2. Account active.
3. Password valid.
4. Account not locked.
5. Branch active.
6. Roles assigned.
7. Session created.
8. JWT issued.
9. Refresh token issued.
10. Login audit recorded.

---

### FR-IAM-011 Logout

The system shall invalidate:

* Access Token
* Refresh Token
* Active Session

---

### FR-IAM-012 Forgot Password

Generate a secure password reset token.

Token expiration:

```text
15 minutes
```

---

### FR-IAM-013 Change Password

Authenticated users may change passwords after validating the current password.

---

### FR-IAM-014 Reset Password

Administrators may reset user passwords.

---

### FR-IAM-015 Account Lock

Accounts are automatically locked after:

```text
5 consecutive failed login attempts
```

(Configurable.)

---

### FR-IAM-016 Unlock Account

Authorized administrators may unlock user accounts.

---

## 2.3 Authorization

### FR-IAM-020 Role Management

The system shall allow dynamic creation of business roles.

Examples:

```text
Trainer

Reception

Finance Manager

Marketing

Corporate Coordinator
```

Roles are configuration entities and must not be hardcoded.

---

### FR-IAM-021 Permission Management

Permissions shall be assigned to roles.

Permissions represent atomic actions, for example:

```text
student.read

student.update

finance.invoice.create

finance.refund.approve
```

---

### FR-IAM-022 Direct Permission Assignment

The system may allow exceptions by assigning permissions directly to individual users.

---

### FR-IAM-023 Branch Assignment

Users may belong to one or more branches.

---

### FR-IAM-024 Branch Switching

Users assigned to multiple branches may switch their active branch context without logging out.

---

### FR-IAM-025 Dashboard Permissions

Dashboard visibility shall be controlled by permissions rather than role names.

Example:

```text
dashboard.ceo

dashboard.finance

dashboard.training
```

---

## 2.4 Session Management

### FR-IAM-030 Session Creation

A session shall be created after successful authentication.

---

### FR-IAM-031 Session Timeout

Default timeout:

```text
30 minutes
```

(Configurable.)

---

### FR-IAM-032 Concurrent Sessions

System shall support configurable concurrent session limits.

Example:

```text
Maximum 3 active sessions.
```

---

### FR-IAM-033 Force Logout

Administrators may terminate user sessions remotely.

---

## 2.5 Security Policies

### FR-IAM-040 Password Policy

System shall enforce configurable password policies.

Default:

* Minimum 12 characters
* Uppercase
* Lowercase
* Number
* Special character

---

### FR-IAM-041 Password Expiration

Default:

```text
90 days
```

(Configurable.)

---

### FR-IAM-042 Login History

Every login attempt shall be recorded.

---

### FR-IAM-043 Failed Login Tracking

The system shall retain failed login history for security analysis.

---

### FR-IAM-044 Device Tracking

Record:

* Browser
* OS
* Device
* IP
* Login location (future)

---

# 3. Business Rules

## User Management

| Rule ID    | Description                                    |
| ---------- | ---------------------------------------------- |
| BR-IAM-001 | Email must be unique.                          |
| BR-IAM-002 | Mobile number must be unique.                  |
| BR-IAM-003 | Every user must belong to at least one branch. |
| BR-IAM-004 | Every user must have at least one active role. |
| BR-IAM-005 | A user cannot be permanently deleted.          |
| BR-IAM-006 | Archived users cannot log in.                  |

---

## Authentication

| Rule ID    | Description                                            |
| ---------- | ------------------------------------------------------ |
| BR-IAM-007 | Only active users may authenticate.                    |
| BR-IAM-008 | Passwords must never be stored in plain text.          |
| BR-IAM-009 | Failed login attempts are counted consecutively.       |
| BR-IAM-010 | Lock account after configured threshold.               |
| BR-IAM-011 | Password reset links expire after configured duration. |
| BR-IAM-012 | Logout invalidates all associated security tokens.     |

---

## Authorization

| Rule ID    | Description                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------- |
| BR-IAM-013 | Permissions are evaluated before business logic execution.                                    |
| BR-IAM-014 | Dashboard access is permission-based, not role-name based.                                    |
| BR-IAM-015 | Users only access assigned branches unless granted consolidated access.                       |
| BR-IAM-016 | Direct user permissions override inherited role permissions only where explicitly configured. |
| BR-IAM-017 | Permission changes take effect immediately for new requests.                                  |

---

## Security

| Rule ID    | Description                                                          |
| ---------- | -------------------------------------------------------------------- |
| BR-IAM-018 | Every security-sensitive action must generate an audit record.       |
| BR-IAM-019 | Password policy is configurable by administrators.                   |
| BR-IAM-020 | Session timeout is configurable.                                     |
| BR-IAM-021 | All authentication traffic must use HTTPS/TLS.                       |
| BR-IAM-022 | Access and refresh tokens must have independent expiration policies. |

---

# 4. Cross-Module Dependencies

| Dependent Module      | IAM Dependency                            |
| --------------------- | ----------------------------------------- |
| CRM & Lead Management | Counselor authentication and permissions  |
| Admission Management  | Receptionist and admission officer access |
| Student Management    | Student portal authentication             |
| Course Management     | Course administration permissions         |
| Batch Management      | Trainer and coordinator permissions       |
| Attendance            | Trainer authentication                    |
| Finance               | Accountant roles and approval permissions |
| Corporate Training    | Corporate coordinator access              |
| Reports & Dashboards  | Permission-based dashboard visibility     |
| Audit & Compliance    | Security event logging                    |

---

## Deliverables of Part 1

At the end of Part 1, the IAM module has:

* Business context and objectives
* Scope and stakeholders
* Business capabilities
* 20+ detailed functional requirements
* Foundational business rules
* Cross-module dependency mapping
