# ASTI IMS Solution Design Specification (SDS)

# Module 01 – Identity & Access Management (IAM)

# Part 2

## User Stories

## Use Cases

## Business Workflows

## State Machines

**Version:** 3.0

---

# 1. User Stories

The following user stories are organized by business capability and prioritized using the MoSCoW method.

## Epic 1 – User Management

### US-IAM-001 Create User

**As a** System Administrator

**I want** to create a new user account

**So that** authorized personnel can access the system.

**Priority**

Must Have

**Acceptance Criteria**

```text
Given I have "iam.user.create" permission

When I create a new user

Then

• User record is created
• Person record is linked
• Branch assignment is saved
• Role assignment is saved
• Temporary password generated
• Activation email sent
• Audit record created
```

---

### US-IAM-002 Update User

As a Branch Administrator

I want to update user information

So that employee information remains current.

---

### US-IAM-003 Suspend User

As a System Administrator

I want to suspend a user

So that they cannot access the system while preserving historical records.

---

### US-IAM-004 Unlock User

As an Administrator

I want to unlock a locked account

So the employee can continue working.

---

## Epic 2 – Authentication

### US-IAM-005 Login

As a User

I want to securely log into IMS

So that I can access authorized features.

---

### US-IAM-006 Logout

As a User

I want to log out

So my session cannot be reused.

---

### US-IAM-007 Forgot Password

As a User

I want to reset my password

So I can regain access.

---

### US-IAM-008 Change Password

As a User

I want to change my password

So my account remains secure.

---

## Epic 3 – Authorization

### US-IAM-009 Create Role

As a System Administrator

I want to create business roles

So permissions can be managed without software changes.

---

### US-IAM-010 Assign Role

As an Administrator

I want to assign multiple roles

So users receive appropriate access.

---

### US-IAM-011 Assign Branch

As an Administrator

I want to assign users to branches

So branch-level security is enforced.

---

### US-IAM-012 Switch Branch

As a Regional Manager

I want to switch between branches

So I can manage multiple locations.

---

## Epic 4 – Security

### US-IAM-013 View Login History

As a Security Administrator

I want to review login history

So suspicious activity can be detected.

---

### US-IAM-014 View Audit Logs

As an Auditor

I want to view security events

So compliance requirements are met.

---

# 2. Business Use Cases

---

## UC-IAM-001 Create User

### Goal

Create a new system user.

### Primary Actor

System Administrator

### Supporting Actors

Notification Service

Audit Service

---

### Preconditions

Administrator authenticated.

Permission:

```text
iam.user.create
```

---

### Trigger

Administrator clicks

```text
New User
```

---

### Main Success Scenario

1. Administrator opens User Management.
2. Clicks Create User.
3. Enters user details.
4. Assigns branch.
5. Assigns role.
6. Clicks Save.
7. System validates data.
8. Creates Person.
9. Creates User.
10. Creates UserRole.
11. Creates UserBranch.
12. Generates temporary password.
13. Sends activation email.
14. Records audit event.
15. Displays success message.

---

### Alternate Flow

Duplicate Email

System displays:

```text
Email already exists.
```

---

Duplicate Mobile

```text
Mobile already exists.
```

---

No Branch

```text
At least one branch is required.
```

---

No Role

```text
Assign at least one role.
```

---

### Post Conditions

User exists.

Status:

```text
Pending Activation
```

---

## UC-IAM-002 Login

### Primary Actor

User

---

### Preconditions

Account active.

---

### Main Flow

```text
Open Login Page

↓

Enter Email

↓

Enter Password

↓

Validate User

↓

Validate Password

↓

Validate Branch

↓

Create Session

↓

Generate JWT

↓

Generate Refresh Token

↓

Audit Login

↓

Redirect Dashboard
```

---

### Failure Flow

Wrong password

↓

Increment failed count

↓

Lock account if threshold reached

↓

Audit failure

---

## UC-IAM-003 Reset Password

### Trigger

Forgot Password

### Main Flow

```text
Enter Email

↓

Validate Email

↓

Generate Reset Token

↓

Send Email

↓

Open Reset Link

↓

Enter New Password

↓

Validate Policy

↓

Update Password

↓

Audit

↓

Redirect Login
```

---

## UC-IAM-004 Switch Branch

Applicable only when user has multiple branch assignments.

Main Flow

```text
Click Active Branch

↓

Select Branch

↓

Validate Assignment

↓

Update Session

↓

Refresh Navigation

↓

Reload Dashboard

↓

Audit Branch Switch
```

---

# 3. Business Workflows

---

## Workflow 1 – User Provisioning

```text
Administrator

↓

Create User

↓

Person Created

↓

User Created

↓

Assign Branch

↓

Assign Role

↓

Generate Password

↓

Send Activation Email

↓

User Activates Account

↓

Account Active
```

---

## Workflow 2 – Login

```text
User

↓

Email

↓

Password

↓

Authentication

↓

Authorization

↓

Session Creation

↓

Dashboard
```

---

## Workflow 3 – Failed Login

```text
Login Attempt

↓

Password Incorrect

↓

Increment Counter

↓

Counter >= Threshold ?

↓

No

↓

Allow Retry

----------------------

Yes

↓

Lock Account

↓

Notify Administrator

↓

Audit Event
```

---

## Workflow 4 – Password Reset

```text
Forgot Password

↓

Generate Token

↓

Send Email

↓

Validate Token

↓

Change Password

↓

Logout All Sessions

↓

Audit
```

---

## Workflow 5 – Branch Switching

```text
User

↓

Assigned Branches

↓

Select Branch

↓

Update Session

↓

Update Permission Context

↓

Reload UI
```

---

# 4. State Machines

---

## User Lifecycle

```text
                +----------------+
                |    Created     |
                +----------------+
                        |
                        v
              +------------------+
              | PendingActivation|
              +------------------+
                        |
                        v
                 +-------------+
                 |   Active    |
                 +-------------+
                 /      |      \
                /       |       \
               v        v        v
         +---------+ +--------+ +---------+
         | Locked  | |Suspended| |Archived|
         +---------+ +--------+ +---------+
               |         |           |
               | Unlock  | Activate  |
               +---------+-----------+
                         |
                         v
                    +-------------+
                    |   Active    |
                    +-------------+
```

### State Descriptions

| State             | Description                                           |
| ----------------- | ----------------------------------------------------- |
| Created           | User record created, credentials not issued           |
| PendingActivation | Waiting for first activation or email verification    |
| Active            | User can authenticate and access authorized resources |
| Locked            | Automatically locked after repeated failed logins     |
| Suspended         | Temporarily disabled by administrator                 |
| Archived          | Inactive user retained for compliance and audit       |

---

## Login Session Lifecycle

```text
Created

↓

Authenticated

↓

Active

↓

Idle

↓

Expired

↓

Closed
```

---

## Password Reset Lifecycle

```text
Requested

↓

Email Sent

↓

Token Verified

↓

Password Updated

↓

Completed
```

Failure states:

```text
Expired

Invalid Token

Cancelled
```

---

## Role Lifecycle

```text
Draft

↓

Active

↓

Inactive

↓

Archived
```

Only **Active** roles can be assigned to users.

---

## Permission Lifecycle

```text
Created

↓

Active

↓

Deprecated

↓

Archived
```

Deprecated permissions remain for backward compatibility but should not be assigned to new roles.

---

## Branch Assignment Lifecycle

```text
Assigned

↓

Active

↓

Revoked
```

A revoked branch assignment immediately removes access to that branch.

---

# 5. Sequence Diagrams

## SD-IAM-001 User Login

```text
User
 |
 | Enter Credentials
 v
Login UI
 |
 | Authenticate
 v
Authentication Service
 |
 | Validate User
 v
Database
 |
 | User Found
 |
 | Validate Password
 |
 | Validate Account Status
 |
 | Load Roles
 |
 | Load Permissions
 |
 | Load Branch Access
 |
 | Create Session
 |
 | Generate JWT
 |
 | Generate Refresh Token
 |
 | Record Audit
 v
Audit Service
 |
 | Success
 v
Login UI
 |
 | Redirect Dashboard
```

---

## SD-IAM-002 Create User

```text
Administrator
 |
 | Save User
 v
User Service
 |
 | Validate
 |
 | Create Person
 |
 | Create User
 |
 | Assign Roles
 |
 | Assign Branches
 |
 | Generate Password
 |
 | Send Email
 |
 | Record Audit
 |
 v
Success
```

---

## SD-IAM-003 Password Reset

```text
User

↓

Forgot Password

↓

IAM Service

↓

Generate Reset Token

↓

Email Service

↓

User Opens Link

↓

Validate Token

↓

Update Password

↓

Invalidate Sessions

↓

Audit

↓

Success
```

---

# 6. Cross-Module Interaction

```text
                    IAM
                     |
  +------------------+-------------------+
  |                  |                   |
  v                  v                   v
CRM           Admission          Student
  |                  |                   |
  +------------------+-------------------+
                     |
                     v
                Finance
                     |
                     v
              Reports & Dashboards
```

Every module consumes IAM services for authentication, authorization, permission evaluation, branch scoping, and audit context rather than implementing its own security model.

---

## Deliverables of Part 2

At the completion of Part 2, the IAM specification now includes:

* Detailed user stories
* Enterprise use cases
* End-to-end business workflows
* Lifecycle state machines
* Sequence diagrams
* Cross-module interaction model

