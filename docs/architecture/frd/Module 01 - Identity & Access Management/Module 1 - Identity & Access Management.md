# Module 01 – Identity & Access Management (IAM)

**Document Version:** 3.0

**Module Code:** IAM

**Priority:** Critical

**Bounded Context:** Identity & Security

**Status:** Draft

---

# 1. Purpose

## Objective

The Identity & Access Management (IAM) module provides centralized authentication, authorization, user lifecycle management, role-based access control (RBAC), branch-level security, session management, password policies, audit logging, and security governance across the ASTI Integrated Institute Management System.

This module ensures that only authorized users can access the system and that every operation is performed according to the user's assigned role, permissions, branch, and organizational policies.

---

# 2. Business Goals

The IAM module aims to:

* Provide secure authentication for all portals.
* Enforce Role-Based Access Control (RBAC).
* Support multi-branch organizational security.
* Enable delegated administration.
* Maintain complete audit trails.
* Protect sensitive student, financial, HR, and corporate data.
* Support future Single Sign-On (SSO) integration.
* Comply with Omani data protection requirements.
* Minimize unauthorized access.
* Enable enterprise-grade security governance.

---

# 3. Scope

## Included

* User Management
* Authentication
* Authorization
* RBAC
* Permission Management
* User Groups
* Branch Access
* Password Policies
* Multi-factor Authentication (Future)
* Session Management
* Device Management
* Login History
* Account Locking
* Security Policies
* Audit Logging
* Token Management
* API Authentication
* Refresh Tokens
* Password Reset
* Email Verification
* Invitation Management

## Excluded

* HR employee information
* Student profile management
* Trainer profile management
* Attendance
* Finance
* CRM

Those modules consume IAM services but do not own identity data.

---

# 4. Stakeholders

| Stakeholder            | Responsibilities                    |
| ---------------------- | ----------------------------------- |
| System Administrator   | Complete platform administration    |
| Branch Administrator   | Manage branch users                 |
| HR Manager             | Request employee accounts           |
| Department Manager     | Approve user access                 |
| Trainer                | Login and access assigned resources |
| Student                | Login to student portal             |
| Finance Officer        | Access finance features             |
| Receptionist           | Admissions and CRM access           |
| Corporate Coordinator  | Corporate portal access             |
| IT Administrator       | Security administration             |
| Executive Management   | Dashboard access                    |
| External API Consumers | Authenticated API access            |

---

# 5. Actors

### Human Actors

* Super Administrator
* System Administrator
* Branch Administrator
* HR Manager
* Trainer
* Student
* Receptionist
* Finance Officer
* Corporate Coordinator
* Executive

### System Actors

* Authentication Service
* Authorization Service
* Email Service
* SMS Service
* Notification Service
* Audit Service
* JWT Provider
* OAuth Provider (Future)

---

# 6. Functional Overview

The IAM module consists of the following submodules:

```
Identity Management

├── Authentication
├── Authorization
├── User Management
├── Roles
├── Permissions
├── Branch Access
├── Sessions
├── Password Management
├── Security Policies
├── Audit Logs
├── Device Management
├── Login History
├── API Security
└── Token Management
```

---

# 7. Business Capabilities

| Capability            | Description                                    |
| --------------------- | ---------------------------------------------- |
| User Provisioning     | Create and manage user accounts                |
| Authentication        | Verify user identity                           |
| Authorization         | Determine allowed actions                      |
| Branch Isolation      | Restrict data to authorized branches           |
| Permission Assignment | Assign fine-grained permissions                |
| Session Management    | Control active user sessions                   |
| Security Monitoring   | Track login attempts and suspicious activities |
| Password Management   | Enforce password policies                      |
| Audit Trail           | Record all security-related actions            |
| API Security          | Secure REST APIs using JWT                     |

---

# 8. User Types

## Internal Users

* Super Admin
* Branch Admin
* HR
* Finance
* Reception
* Marketing
* Trainer
* Coordinator
* Sales
* Accountant

## External Users

* Student
* Parent (Future)
* Corporate Client
* Auditor (Read Only)

---

# 9. Functional Requirements

## User Management

### FR-IAM-001 Create User

**Description**

Authorized administrators shall be able to create a new user account.

**Business Rules**

* Username must be unique.
* Email must be unique.
* Mobile number must be unique.
* User must belong to at least one branch.
* User must have at least one role.
* Account is inactive until activation.
* Activation email is sent automatically.

**Priority**

Critical

**Acceptance Criteria**

* User created successfully.
* Audit log generated.
* Activation email sent.
* Temporary password generated.

---

### FR-IAM-002 Update User

The system shall allow authorized users to update user information.

---

### FR-IAM-003 Disable User

The system shall allow administrators to disable users without deleting historical records.

---

### FR-IAM-004 Unlock User

Administrators can unlock locked accounts.

---

### FR-IAM-005 Archive User

Users leaving the organization shall be archived while preserving audit history.

---

## Authentication

### FR-IAM-006 Login

The system shall authenticate users using:

* Username
* Email
* Employee ID (configurable)

Authentication requires:

* Password verification
* Active account
* Active role
* Active branch
* Not locked
* Not expired

---

### FR-IAM-007 Logout

The system shall invalidate the current session and refresh token.

---

### FR-IAM-008 Password Reset

Support:

* Email reset
* Admin reset
* First login password change

---

### FR-IAM-009 Change Password

Users can change passwords after validating the current password.

---

### FR-IAM-010 Forgot Password

Generate a time-limited secure reset link.

---

## Authorization

### FR-IAM-011 Role Assignment

Users may have multiple roles.

Example:

```
John

Trainer

Coordinator
```

---

### FR-IAM-012 Permission Assignment

Permissions may be assigned:

* Directly
* Via roles

Example:

```
READ_STUDENT

CREATE_STUDENT

EDIT_STUDENT

DELETE_STUDENT
```

---

### FR-IAM-013 Branch Assignment

Users may belong to one or more branches.

Example:

```
Muscat

Salalah

Sohar
```

---

### FR-IAM-014 Active Branch Switching

Authorized users with multiple branch assignments can switch their active branch context without re-authenticating. All subsequent data access must be scoped to the selected branch.

---

### FR-IAM-015 Session Timeout

Sessions expire after configurable inactivity.

Default:

```
30 minutes
```

---

# 10. Business Rules

| Rule ID    | Rule                                          |
| ---------- | --------------------------------------------- |
| BR-IAM-001 | Email must be unique                          |
| BR-IAM-002 | Username must be unique                       |
| BR-IAM-003 | Password minimum length 12 characters         |
| BR-IAM-004 | Password complexity required                  |
| BR-IAM-005 | Lock account after 5 failed attempts          |
| BR-IAM-006 | Password expires every 90 days (configurable) |
| BR-IAM-007 | Users must have at least one role             |
| BR-IAM-008 | Users must have at least one branch           |
| BR-IAM-009 | Disabled users cannot authenticate            |
| BR-IAM-010 | Every security event must be audited          |

---

# 11. Permission Model

Permissions follow a resource-action model.

```
Students
├── Read
├── Create
├── Update
├── Delete
├── Import
└── Export

Courses
├── Read
├── Create
├── Update
├── Delete
└── Publish

Finance
├── View
├── Invoice
├── Refund
├── Payment
└── Reports
```

Permissions are grouped into roles, and roles are assigned to users. Direct permission assignment should be used only for exceptional cases to simplify governance.

---

# 12. Security Model

Authentication uses JWT access tokens with refresh tokens for web and mobile clients. API requests must include a valid bearer token. Every request is authorized using:

1. Authentication (Who is the user?)
2. Role validation
3. Permission validation
4. Branch scope validation
5. Business rule validation

This aligns with the architecture recommendation to enforce RBAC and branch-level data isolation across all modules. 

---

# 13. Audit Requirements

The system shall audit:

* User creation
* User updates
* User deletion/archive
* Login success
* Login failure
* Password reset
* Password change
* Role changes
* Permission changes
* Branch assignments
* Session termination
* Account lock/unlock

Each audit record must capture:

* Timestamp
* User
* IP address
* Device
* Action
* Entity
* Previous value
* New value

---

# 14. Non-Functional Requirements

* Authentication response time: < 2 seconds (95th percentile)
* JWT validation: < 100 ms
* Passwords hashed using Argon2id (preferred) or bcrypt with strong work factors
* TLS 1.2+ for all communications
* High availability for authentication services
* Immutable audit logs
* Horizontal scalability for authentication APIs

---

# 15. Future Enhancements

* Multi-Factor Authentication (MFA)
* Single Sign-On (SAML/OIDC)
* Google/Microsoft Entra ID integration
* Passwordless authentication
* Adaptive risk-based authentication
* Hardware security keys (FIDO2/WebAuthn)
* Self-service access requests and approvals

---