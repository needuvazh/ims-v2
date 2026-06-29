# ASTI IMS Solution Design Specification (SDS)

# Module 01 – Identity & Access Management (IAM)

# Part 7

# Validation Rules

# Error Catalogue

# Notifications

# Localization

# BDD Acceptance Criteria

# Test Scenarios

**Version:** 3.0

---

# 1. Validation Strategy

Validation is performed at **four layers**:

```text
Client (UI)
        ↓
API Request Validation
        ↓
Business Rule Validation
        ↓
Database Constraint Validation
```

Validation should **fail fast**, returning clear, localized, and actionable messages.

---

# 2. Field Validation Catalogue

## 2.1 User

| Field              | Validation                             |
| ------------------ | -------------------------------------- |
| First Name         | Required, 2–100 characters             |
| Last Name          | Required, 2–100 characters             |
| Email              | Required, RFC-compliant format, unique |
| Mobile             | Required, E.164 format, unique         |
| Employee Code      | Optional, unique if provided           |
| Username           | Auto-generated (configurable), unique  |
| Preferred Language | Must exist in Language Master          |
| Default Branch     | Required                               |
| Roles              | At least one active role               |

---

## 2.2 Password

Default policy (configurable):

| Rule               | Value                    |
| ------------------ | ------------------------ |
| Minimum length     | 12                       |
| Maximum length     | 128                      |
| Uppercase          | Required                 |
| Lowercase          | Required                 |
| Numeric            | Required                 |
| Special Character  | Required                 |
| Whitespace Only    | Not allowed              |
| Previous Passwords | Last 10 cannot be reused |
| Expiry             | 90 days                  |

Example valid password:

```text
Asti@2026Secure
```

---

## 2.3 Role

| Field       | Validation                  |
| ----------- | --------------------------- |
| Code        | Required, uppercase, unique |
| Name        | Required                    |
| Status      | Active/Inactive/Archived    |
| Description | Optional (1000 chars max)   |

---

## 2.4 Permission

```text
module.resource.action
```

Examples

```text
student.read

student.update

finance.invoice.create
```

Validation

* lowercase
* no spaces
* unique
* maximum 200 characters

---

# 3. Business Validation Rules

## User Creation

| Rule               | Error  |
| ------------------ | ------ |
| Duplicate email    | Reject |
| Duplicate mobile   | Reject |
| No role assigned   | Reject |
| No branch assigned | Reject |
| Inactive branch    | Reject |
| Archived role      | Reject |

---

## Login

| Rule             | Result       |
| ---------------- | ------------ |
| Wrong password   | Failed login |
| Locked account   | Reject       |
| Archived account | Reject       |
| Expired password | Force change |
| No active role   | Reject       |
| No branch        | Reject       |

---

## Branch Switching

Reject if

* branch inactive
* user not assigned
* branch archived

---

# 4. Cross-Field Validation

## Password

```text
Password

Confirm Password

Must Match
```

---

## Default Branch

Default Branch

↓

Must exist in Assigned Branches

---

## Role Assignment

Cannot assign:

```text
Archived Role

Inactive Role
```

---

# 5. Error Catalogue

All errors follow the format:

```text
MODULE-CATEGORY-NUMBER
```

Example

```text
IAM-VAL-001
```

---

## Validation Errors

| Code        | Description             |
| ----------- | ----------------------- |
| IAM-VAL-001 | Email already exists    |
| IAM-VAL-002 | Mobile already exists   |
| IAM-VAL-003 | Username already exists |
| IAM-VAL-004 | Invalid email           |
| IAM-VAL-005 | Invalid password format |
| IAM-VAL-006 | Passwords do not match  |
| IAM-VAL-007 | Branch required         |
| IAM-VAL-008 | Role required           |

---

## Authentication Errors

| Code         | Description           |
| ------------ | --------------------- |
| IAM-AUTH-001 | Invalid credentials   |
| IAM-AUTH-002 | Account locked        |
| IAM-AUTH-003 | Account suspended     |
| IAM-AUTH-004 | Password expired      |
| IAM-AUTH-005 | Session expired       |
| IAM-AUTH-006 | Invalid refresh token |
| IAM-AUTH-007 | Access token expired  |

---

## Authorization Errors

| Code          | Description             |
| ------------- | ----------------------- |
| IAM-AUTHZ-001 | Permission denied       |
| IAM-AUTHZ-002 | Branch access denied    |
| IAM-AUTHZ-003 | Dashboard access denied |
| IAM-AUTHZ-004 | Report access denied    |

---

## System Errors

| Code        | Description               |
| ----------- | ------------------------- |
| IAM-SYS-001 | Unexpected server error   |
| IAM-SYS-002 | Email service unavailable |
| IAM-SYS-003 | Database unavailable      |
| IAM-SYS-004 | Audit service unavailable |

---

# 6. Notification Catalogue

## Notification Channels

| Channel  | Phase   |
| -------- | ------- |
| In-App   | Phase 1 |
| Email    | Phase 1 |
| SMS      | Future  |
| WhatsApp | Future  |
| Push     | Future  |

---

## User Created

Recipient

New User

Subject

```text
Welcome to ASTI IMS
```

Body

```text
Hello {{FirstName}}

Your account has been created.

Username:
{{Email}}

Please activate your account using the link below.

{{ActivationLink}}

Regards,

ASTI IMS
```

---

## Password Reset

Subject

```text
Password Reset Request
```

---

Body

```text
Hello {{FirstName}}

We received a password reset request.

Click below.

{{ResetLink}}

Link expires in 15 minutes.
```

---

## Account Locked

Recipient

Administrator

Subject

```text
User Account Locked
```

Body

```text
User:

{{DisplayName}}

has been locked after

{{FailedAttempts}}

failed login attempts.
```

---

## Role Assigned

Recipient

User

Body

```text
Your access permissions have been updated.

Please logout and login again.
```

---

## Branch Assignment

```text
You have been granted access to

{{BranchName}}
```

---

# 7. Localization Strategy

Phase 1 supports:

| Language | Supported |
| -------- | --------- |
| English  | Yes       |
| Arabic   | Yes       |

All UI text, validation messages, notifications, and error messages must be externalized into localization resource bundles. Business data (e.g., user names) remains language-neutral.

Example

English

```text
Save
```

Arabic

```text
حفظ
```

---

# 8. Business Messages

Success

```text
User created successfully.
```

Failure

```text
Unable to create user.
```

Validation

```text
Please assign at least one role.
```

Warning

```text
Password expires in 5 days.
```

Information

```text
Your session will expire in 2 minutes.
```

---

# 9. BDD Acceptance Criteria

---

## Feature

Create User

### Scenario

Successful User Creation

```gherkin
Given I am logged in as a System Administrator

And I have permission "iam.user.create"

When I create a new user

Then the user account is created

And a temporary password is generated

And an activation email is sent

And an audit log is created
```

---

### Scenario

Duplicate Email

```gherkin
Given email john@asti.om already exists

When administrator creates another user

Then creation fails

And error IAM-VAL-001 is returned
```

---

## Feature

Login

### Scenario

Successful Login

```gherkin
Given the account is active

When valid credentials are entered

Then JWT token is generated

And refresh token is generated

And dashboard is displayed
```

---

### Scenario

Locked Account

```gherkin
Given account is locked

When login is attempted

Then authentication fails

And IAM-AUTH-002 is returned
```

---

## Feature

Assign Role

```gherkin
Given Role Finance exists

When Administrator assigns it

Then effective permissions are recalculated

And audit log is created
```

---

# 10. QA Test Catalogue

## Functional Tests

| ID        | Test              |
| --------- | ----------------- |
| IAM-F-001 | Create User       |
| IAM-F-002 | Update User       |
| IAM-F-003 | Archive User      |
| IAM-F-004 | Login             |
| IAM-F-005 | Logout            |
| IAM-F-006 | Password Reset    |
| IAM-F-007 | Role Assignment   |
| IAM-F-008 | Branch Assignment |

---

## Security Tests

| ID        | Test                                      |
| --------- | ----------------------------------------- |
| IAM-S-001 | SQL Injection                             |
| IAM-S-002 | XSS                                       |
| IAM-S-003 | JWT Tampering                             |
| IAM-S-004 | Session Fixation                          |
| IAM-S-005 | CSRF (if cookie-based auth is introduced) |
| IAM-S-006 | Privilege Escalation                      |
| IAM-S-007 | Brute Force Protection                    |

---

## Performance Tests

| ID        | Test                          |
| --------- | ----------------------------- |
| IAM-P-001 | Login 500 concurrent users    |
| IAM-P-002 | Search 100K users             |
| IAM-P-003 | Role assignment under load    |
| IAM-P-004 | Permission evaluation latency |

---

## Accessibility Tests

* Keyboard navigation
* Screen reader compatibility
* Color contrast
* Focus management
* Responsive layout
* RTL layout verification (Arabic)

---

## Integration Tests

* Email service
* Audit service
* Notification service
* JWT generation
* Refresh token flow

---

# 11. Operational Considerations

## Monitoring

Track:

* Login success rate
* Login failure rate
* Password reset requests
* Account lockouts
* Active sessions
* Authorization failures
* Average authentication latency

## Alerting

Generate alerts for:

* Multiple failed logins from the same IP
* Excessive account lockouts
* Unusual login locations (future)
* High authentication error rates
* Audit logging failures

---

# 12. Completion Checklist

Before the IAM module is considered production-ready:

* All validation rules implemented
* Error codes documented
* Notifications localized
* English and Arabic translations complete
* BDD scenarios automated
* Security tests passed
* Accessibility validated
* Performance targets achieved
* Audit logging verified
* Monitoring dashboards configured

---

# Deliverables of Part 7

The IAM specification now includes:

* Comprehensive validation catalogue
* Business validation rules
* Standardized error catalogue
* Notification templates
* Localization strategy
* Business message catalogue
* BDD acceptance scenarios
* QA test catalogue
* Operational monitoring requirements
* Production readiness checklist

---
