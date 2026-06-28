# ASTI IMS Solution Design Specification (SDS)

# Module 01 – Identity & Access Management (IAM)

# Part 9

# BDD Acceptance Criteria and Test Scenarios

**Version:** 3.0
**Status:** Draft

---

# 1. Purpose

This section defines the acceptance criteria and test scenarios for the IAM module using Behavior-Driven Development style.

The goal is to make the module testable by:

* Product owners
* Business analysts
* QA engineers
* Automation testers
* Backend developers
* Frontend developers

Each scenario follows:

```gherkin
Given
When
Then
```

---

# 2. Test Scope

## In Scope

* User creation
* User update
* User activation
* User suspension
* User archive
* Login
* Logout
* Password reset
* Password change
* Account lockout
* Role management
* Permission management
* Branch assignment
* Branch switching
* Session management
* Audit logging
* Report access
* Dashboard access

## Out of Scope

* HR employee lifecycle
* Student portal login
* Corporate portal login
* SSO / OAuth
* MFA / OTP
* Biometric login
* External identity providers

These are future-phase test areas.

---

# 3. Test Actors

| Actor                  | Description                      |
| ---------------------- | -------------------------------- |
| System Administrator   | Full IAM access                  |
| Branch Administrator   | Branch-level user administration |
| Security Administrator | Audit and policy management      |
| Receptionist           | Limited operational user         |
| Trainer                | Limited training user            |
| Finance Officer        | Finance access user              |
| Executive User         | Dashboard access                 |
| Locked User            | User with locked account         |
| Suspended User         | User suspended by admin          |
| Archived User          | User archived from system        |

---

# 4. BDD Features

---

# Feature IAM-001: User Creation

## Scenario IAM-001-01: Create user successfully

```gherkin
Given I am logged in as a System Administrator
And I have permission "iam.user.create"
And the email "john.smith@asti.om" does not already exist
And the mobile number "+96890000000" does not already exist
When I create a user with valid personal details
And I assign at least one active role
And I assign at least one active branch
Then the user account should be created successfully
And a linked Person record should be created
And the user status should be "PendingActivation"
And an activation email should be sent
And an audit log should be recorded with action "UserCreated"
```

---

## Scenario IAM-001-02: Reject duplicate email

```gherkin
Given I am logged in as a System Administrator
And I have permission "iam.user.create"
And the email "john.smith@asti.om" already exists
When I create another user with the same email
Then the user should not be created
And the system should return error code "IAM-VAL-001"
And the message should be "Email already exists"
And an audit log should be recorded with action "UserCreateFailed"
```

---

## Scenario IAM-001-03: Reject user creation without role

```gherkin
Given I am logged in as a System Administrator
And I have permission "iam.user.create"
When I create a user without assigning any role
Then the user should not be created
And the system should return error code "IAM-VAL-008"
And the message should be "At least one role is required"
```

---

## Scenario IAM-001-04: Reject user creation without branch

```gherkin
Given I am logged in as a System Administrator
And I have permission "iam.user.create"
When I create a user without assigning any branch
Then the user should not be created
And the system should return error code "IAM-VAL-007"
And the message should be "At least one branch is required"
```

---

# Feature IAM-002: User Update

## Scenario IAM-002-01: Update user successfully

```gherkin
Given I am logged in as a System Administrator
And I have permission "iam.user.update"
And the target user exists
When I update the user's mobile number and preferred language
Then the user profile should be updated
And the previous values should be stored in audit log
And the audit action should be "UserUpdated"
```

---

## Scenario IAM-002-02: Prevent update without permission

```gherkin
Given I am logged in as a Receptionist
And I do not have permission "iam.user.update"
When I try to update another user's profile
Then the system should deny the request
And the system should return error code "IAM-AUTHZ-001"
And no data should be updated
```

---

# Feature IAM-003: User Suspension and Archive

## Scenario IAM-003-01: Suspend active user

```gherkin
Given I am logged in as a System Administrator
And I have permission "iam.user.suspend"
And the target user is active
When I suspend the user
Then the user status should become "Suspended"
And all active sessions for the user should be terminated
And the user should not be able to log in
And an audit log should be recorded with action "UserSuspended"
```

---

## Scenario IAM-003-02: Archive user

```gherkin
Given I am logged in as a System Administrator
And I have permission "iam.user.archive"
And the target user exists
When I archive the user
Then the user status should become "Archived"
And the user should be hidden from default operational views
And historical audit logs should remain available
And the user should not be physically deleted
```

---

# Feature IAM-004: Login

## Scenario IAM-004-01: Login successfully

```gherkin
Given the user account is active
And the user has at least one active role
And the user has at least one active branch
When the user enters valid email and password
Then authentication should succeed
And an access token should be issued
And a refresh token should be issued
And a session should be created
And the login success should be recorded
```

---

## Scenario IAM-004-02: Reject invalid credentials

```gherkin
Given the user account exists
When the user enters an invalid password
Then authentication should fail
And the system should return error code "IAM-AUTH-001"
And the failed login count should increase by 1
And the failed login attempt should be recorded
```

---

## Scenario IAM-004-03: Lock account after failed attempts

```gherkin
Given the maximum failed login attempts is configured as 5
And the user account is active
When the user enters an invalid password 5 consecutive times
Then the account should be locked
And the system should return error code "IAM-AUTH-002"
And an account locked notification should be generated
And an audit log should be recorded with action "AccountLocked"
```

---

## Scenario IAM-004-04: Reject suspended user login

```gherkin
Given the user account status is "Suspended"
When the user attempts to log in
Then authentication should fail
And the system should return error code "IAM-AUTH-003"
And no session should be created
```

---

# Feature IAM-005: Logout and Session Management

## Scenario IAM-005-01: Logout successfully

```gherkin
Given I am logged in
And I have an active session
When I click logout
Then my session should be closed
And my refresh token should be invalidated
And I should be redirected to the login page
And the logout event should be recorded
```

---

## Scenario IAM-005-02: Terminate another user's session

```gherkin
Given I am logged in as a System Administrator
And I have permission "iam.session.terminate"
And another user has an active session
When I terminate that session
Then the target session should be closed
And the target user should be forced to log in again
And an audit log should be recorded with action "SessionTerminated"
```

---

# Feature IAM-006: Password Management

## Scenario IAM-006-01: Forgot password request

```gherkin
Given the user account exists
When the user requests password reset
Then a password reset token should be generated
And the reset link should be sent by email
And the token should expire after 15 minutes
```

---

## Scenario IAM-006-02: Reset password successfully

```gherkin
Given the password reset token is valid
When the user submits a new password that satisfies the password policy
Then the password should be updated
And all previous sessions should be invalidated
And the password reset token should be marked as used
And an audit log should be recorded with action "PasswordResetCompleted"
```

---

## Scenario IAM-006-03: Reject weak password

```gherkin
Given the password policy requires 12 characters, uppercase, lowercase, number, and special character
When the user submits password "password"
Then the password should be rejected
And the system should return error code "IAM-VAL-005"
```

---

## Scenario IAM-006-04: Reject reused password

```gherkin
Given password history stores the last 10 passwords
When the user submits a password used recently
Then the password should be rejected
And the system should return error code "IAM-VAL-009"
```

---

# Feature IAM-007: Role Management

## Scenario IAM-007-01: Create role successfully

```gherkin
Given I am logged in as a System Administrator
And I have permission "iam.role.create"
When I create a role with a unique role code and name
Then the role should be created
And the role status should be "Active"
And an audit log should be recorded with action "RoleCreated"
```

---

## Scenario IAM-007-02: Assign permission to role

```gherkin
Given I am logged in as a System Administrator
And I have permission "iam.role.permission.assign"
And the role exists
And the permission exists
When I assign the permission to the role
Then the role should contain the permission
And effective permissions for affected users should be recalculated
And an audit log should be recorded with action "PermissionAssignedToRole"
```

---

## Scenario IAM-007-03: Archive system role is blocked

```gherkin
Given the role is marked as system role
When I attempt to archive the role
Then the request should be rejected
And the system should return error code "IAM-VAL-010"
```

---

# Feature IAM-008: Branch Access

## Scenario IAM-008-01: Assign branch access to user

```gherkin
Given I am logged in as a System Administrator
And I have permission "iam.user.assign-branch"
And the target user exists
And the branch is active
When I assign the branch to the user
Then the user should gain access to that branch
And the branch assignment should be visible in the user profile
And an audit log should be recorded with action "BranchAssigned"
```

---

## Scenario IAM-008-02: Switch active branch

```gherkin
Given I am assigned to multiple active branches
When I switch my active branch to "Muscat"
Then my active branch context should be updated
And all subsequent data access should be scoped to "Muscat"
And a branch switch audit log should be recorded
```

---

## Scenario IAM-008-03: Reject unauthorized branch switch

```gherkin
Given I am not assigned to branch "Salalah"
When I try to switch to branch "Salalah"
Then the request should be denied
And the system should return error code "IAM-AUTHZ-002"
```

---

# Feature IAM-009: Dashboard and Report Access

## Scenario IAM-009-01: Allow dashboard access with permission

```gherkin
Given I am logged in as an Executive User
And I have permission "dashboard.ceo"
When I open the CEO dashboard
Then the dashboard should be displayed
```

---

## Scenario IAM-009-02: Deny dashboard access without permission

```gherkin
Given I am logged in as a Receptionist
And I do not have permission "dashboard.ceo"
When I open the CEO dashboard
Then access should be denied
And the system should return error code "IAM-AUTHZ-003"
```

---

## Scenario IAM-009-03: Report respects branch scope

```gherkin
Given I am a Branch Manager assigned only to branch "Muscat"
And I have permission "report.iam.user"
When I open the User Directory Report
Then I should see only users assigned to branch "Muscat"
And I should not see users from other branches
```

---

# Feature IAM-010: Audit Logging

## Scenario IAM-010-01: Record security-sensitive action

```gherkin
Given I am logged in as a System Administrator
When I assign a role to a user
Then an audit log should be created
And the audit log should contain performedBy, performedAt, entityType, entityId, oldValue, and newValue
```

---

## Scenario IAM-010-02: Audit log cannot be modified

```gherkin
Given an audit log exists
When any user attempts to update the audit log
Then the request should be rejected
And the audit log should remain unchanged
```

---

# 5. Test Scenario Matrix

| Test ID    | Feature       | Scenario                           | Priority | Automation |
| ---------- | ------------- | ---------------------------------- | -------- | ---------- |
| IAM-TC-001 | User Creation | Create user successfully           | Critical | Yes        |
| IAM-TC-002 | User Creation | Duplicate email rejected           | Critical | Yes        |
| IAM-TC-003 | User Creation | Missing role rejected              | Critical | Yes        |
| IAM-TC-004 | User Creation | Missing branch rejected            | Critical | Yes        |
| IAM-TC-005 | User Update   | Update user successfully           | High     | Yes        |
| IAM-TC-006 | User Update   | Update without permission rejected | Critical | Yes        |
| IAM-TC-007 | Login         | Login success                      | Critical | Yes        |
| IAM-TC-008 | Login         | Invalid password                   | Critical | Yes        |
| IAM-TC-009 | Login         | Account lock after 5 failures      | Critical | Yes        |
| IAM-TC-010 | Login         | Suspended user rejected            | Critical | Yes        |
| IAM-TC-011 | Session       | Logout                             | High     | Yes        |
| IAM-TC-012 | Session       | Admin terminates session           | High     | Yes        |
| IAM-TC-013 | Password      | Forgot password                    | High     | Yes        |
| IAM-TC-014 | Password      | Reset password                     | Critical | Yes        |
| IAM-TC-015 | Password      | Weak password rejected             | Critical | Yes        |
| IAM-TC-016 | Role          | Create role                        | High     | Yes        |
| IAM-TC-017 | Role          | Assign permission to role          | Critical | Yes        |
| IAM-TC-018 | Branch        | Assign branch                      | Critical | Yes        |
| IAM-TC-019 | Branch        | Switch branch                      | Critical | Yes        |
| IAM-TC-020 | Reports       | Report respects branch scope       | Critical | Yes        |
| IAM-TC-021 | Audit         | Audit log created                  | Critical | Yes        |
| IAM-TC-022 | Audit         | Audit log immutable                | Critical | Yes        |

---

# 6. Negative Test Scenarios

| ID          | Scenario                           | Expected Result         |
| ----------- | ---------------------------------- | ----------------------- |
| IAM-NEG-001 | Create user with invalid email     | Validation error        |
| IAM-NEG-002 | Create user with duplicate mobile  | Validation error        |
| IAM-NEG-003 | Login archived user                | Authentication rejected |
| IAM-NEG-004 | Use expired access token           | Token rejected          |
| IAM-NEG-005 | Use invalid refresh token          | Token rejected          |
| IAM-NEG-006 | Access role API without permission | 403 forbidden           |
| IAM-NEG-007 | Switch to unauthorized branch      | 403 forbidden           |
| IAM-NEG-008 | Archive system role                | Rejected                |
| IAM-NEG-009 | Reuse old password                 | Rejected                |
| IAM-NEG-010 | Modify audit record                | Rejected                |

---

# 7. Security Test Scenarios

| ID          | Scenario                           | Expected Result            |
| ----------- | ---------------------------------- | -------------------------- |
| IAM-SEC-001 | SQL injection in login email field | Request sanitized/rejected |
| IAM-SEC-002 | XSS payload in user name           | Payload escaped            |
| IAM-SEC-003 | JWT token tampering                | Token rejected             |
| IAM-SEC-004 | Replay old refresh token           | Token rejected             |
| IAM-SEC-005 | Brute force login                  | Account lock/rate limit    |
| IAM-SEC-006 | Privilege escalation attempt       | Access denied              |
| IAM-SEC-007 | Branch data bypass attempt         | Access denied              |
| IAM-SEC-008 | Direct API call without token      | 401 unauthorized           |
| IAM-SEC-009 | Direct API call without permission | 403 forbidden              |
| IAM-SEC-010 | Session fixation attempt           | New session ID generated   |

---

# 8. UI Test Scenarios

| ID         | Scenario                             | Expected Result                |
| ---------- | ------------------------------------ | ------------------------------ |
| IAM-UI-001 | Login form empty submit              | Required validation shown      |
| IAM-UI-002 | Invalid email format                 | Inline validation shown        |
| IAM-UI-003 | Create user form with missing fields | Validation summary shown       |
| IAM-UI-004 | User list search                     | Matching users displayed       |
| IAM-UI-005 | User list filter by branch           | Branch users displayed         |
| IAM-UI-006 | Role permission tree search          | Matching permissions displayed |
| IAM-UI-007 | Branch switcher                      | Active branch changes          |
| IAM-UI-008 | Arabic UI                            | RTL layout displayed correctly |
| IAM-UI-009 | Keyboard navigation                  | All fields accessible          |
| IAM-UI-010 | Screen reader labels                 | Controls announced correctly   |

---

# 9. API Test Scenarios

| ID          | API                      | Scenario            | Expected Result |
| ----------- | ------------------------ | ------------------- | --------------- |
| IAM-API-001 | POST /auth/login         | Valid login         | 200             |
| IAM-API-002 | POST /auth/login         | Invalid password    | 401             |
| IAM-API-003 | POST /users              | Create user         | 201             |
| IAM-API-004 | POST /users              | Duplicate email     | 400             |
| IAM-API-005 | PUT /users/{id}          | Update user         | 200             |
| IAM-API-006 | DELETE /users/{id}       | Archive user        | 204             |
| IAM-API-007 | POST /auth/switch-branch | Valid branch        | 200             |
| IAM-API-008 | POST /auth/switch-branch | Unauthorized branch | 403             |
| IAM-API-009 | GET /audit               | With permission     | 200             |
| IAM-API-010 | GET /audit               | Without permission  | 403             |

---

# 10. Acceptance Exit Criteria

The IAM module can be considered functionally accepted only when:

* All critical scenarios pass.
* All role and permission tests pass.
* Branch access rules are verified.
* Audit logs are created for sensitive actions.
* Login, logout, password reset, and session management pass.
* Negative tests pass.
* Security tests pass.
* Arabic RTL UI tests pass.
* API contract tests pass.
* Regression test suite is automated for critical flows.

---

# Deliverables of Part 9

This part defines:

* BDD acceptance criteria
* Functional test scenarios
* Negative test scenarios
* Security test scenarios
* UI test scenarios
* API test scenarios
* Acceptance exit criteria

