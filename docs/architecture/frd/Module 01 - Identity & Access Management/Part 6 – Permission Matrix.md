# ASTI IMS Solution Design Specification (SDS)

# Module 01 – Identity & Access Management (IAM)

# Part 6

# Enterprise Authorization Model

# Roles, Permissions & Security Matrix

**Version:** 3.0

---

# 1. Authorization Philosophy

Authorization in ASTI IMS follows this hierarchy:

```text
Authenticated User
        │
        ▼
Active Session
        │
        ▼
Assigned Roles
        │
        ▼
Granted Permissions
        │
        ▼
Branch Scope
        │
        ▼
Business Rules
        │
        ▼
Entity Ownership
        │
        ▼
Final Authorization Decision
```

A request is authorized **only if every layer passes**.

---

# 2. Security Architecture

```text
                 JWT Token
                     │
                     ▼
          Authentication Middleware
                     │
                     ▼
            Session Validation
                     │
                     ▼
           User Status Validation
                     │
                     ▼
            Branch Validation
                     │
                     ▼
         Permission Validation
                     │
                     ▼
        Business Rule Validation
                     │
                     ▼
         Entity Ownership Validation
                     │
                     ▼
              Execute Request
```

---

# 3. Permission Naming Convention

Every permission follows the format:

```text
module.resource.action
```

Examples:

```text
student.read

student.create

student.update

student.archive

finance.invoice.create

attendance.mark

certificate.generate

role.permission.assign
```

Never use role names inside business code.

❌ Bad

```java
if(user.isAdmin())
```

✅ Good

```java
@PreAuthorize("hasPermission('student.create')")
```

---

# 4. Permission Categories

| Category      | Description       |
| ------------- | ----------------- |
| Menu          | Can access menu   |
| Screen        | Can open screen   |
| Action        | Button level      |
| Data          | Row level         |
| Report        | Report access     |
| Dashboard     | Dashboard widgets |
| API           | REST API          |
| Configuration | Settings          |

---

# 5. Permission Levels

Every business entity supports:

```text
Read

Create

Update

Archive

Approve

Reject

Export

Import

Print

Assign

Cancel

Restore
```

---

# 6. Permission Catalogue

---

# IAM Permissions

## User

```text
iam.user.read

iam.user.create

iam.user.update

iam.user.archive

iam.user.activate

iam.user.suspend

iam.user.unlock

iam.user.reset-password

iam.user.export

iam.user.import

iam.user.assign-role

iam.user.assign-branch

iam.user.view-login-history

iam.user.view-sessions
```

---

## Roles

```text
iam.role.read

iam.role.create

iam.role.update

iam.role.archive

iam.role.assign

iam.role.clone

iam.role.compare

iam.role.export
```

---

## Permissions

```text
iam.permission.read

iam.permission.create

iam.permission.update

iam.permission.archive

iam.permission.assign
```

---

## Audit

```text
iam.audit.read

iam.audit.export

iam.audit.security-events
```

---

## Security Policies

```text
iam.security.password-policy

iam.security.session-policy

iam.security.login-policy

iam.security.device-policy
```

---

# CRM Module Permissions

```text
crm.lead.read

crm.lead.create

crm.lead.update

crm.lead.archive

crm.lead.assign

crm.lead.convert

crm.lead.export

crm.lead.import

crm.enquiry.read

crm.enquiry.create

crm.enquiry.update

crm.enquiry.convert
```

---

# Student Module

```text
student.read

student.create

student.update

student.archive

student.transfer

student.documents

student.fees

student.attendance

student.certificates

student.export

student.import

student.print-id-card
```

---

# Course Module

```text
course.read

course.create

course.update

course.publish

course.archive

course.price.update

course.discount.update
```

---

# Batch Module

```text
batch.read

batch.create

batch.update

batch.cancel

batch.close

batch.reopen

batch.assign-trainer

batch.waiting-list
```

---

# Attendance

```text
attendance.read

attendance.mark

attendance.edit

attendance.approve

attendance.export
```

---

# Finance

```text
finance.invoice.read

finance.invoice.create

finance.invoice.cancel

finance.payment.receive

finance.payment.refund

finance.discount.approve

finance.receipt.print

finance.export
```

---

# Certificate

```text
certificate.read

certificate.generate

certificate.revoke

certificate.print

certificate.verify
```

---

# Corporate

```text
corporate.read

corporate.create

corporate.contract.create

corporate.invoice.create

corporate.employee.import
```

---

# Reports

```text
reports.read

reports.export

reports.schedule

reports.branch

reports.executive

reports.finance
```

---

# Dashboard

```text
dashboard.ceo

dashboard.branch

dashboard.finance

dashboard.training

dashboard.crm
```

---

By the time all modules are completed, the system will have approximately:

| Module         | Estimated Permissions |
| -------------- | --------------------: |
| IAM            |                    45 |
| CRM            |                    40 |
| Student        |                    35 |
| Admission      |                    40 |
| Course         |                    25 |
| Batch          |                    30 |
| Attendance     |                    25 |
| Finance        |                    60 |
| Corporate      |                    45 |
| Trainer        |                    30 |
| Certificate    |                    25 |
| Reports        |                    40 |
| Communication  |                    35 |
| Website        |                    20 |
| Document       |                    30 |
| Administration |                    40 |
| **Total**      |              **~565** |

This is normal for enterprise systems.

---

# 7. Default Role Templates

These are **starter templates**, not hardcoded roles. Administrators can modify or replace them.

| Role                    | Description          |
| ----------------------- | -------------------- |
| System Administrator    | Full access          |
| Institute Administrator | Institute operations |
| Branch Manager          | Branch operations    |
| Counselor               | CRM & Admissions     |
| Receptionist            | Enquiry & Walk-ins   |
| Trainer                 | Training delivery    |
| Accountant              | Finance              |
| Corporate Coordinator   | Corporate customers  |
| Student                 | Student portal       |
| Executive               | Dashboards & Reports |

---

# 8. Menu Permission Mapping

| Menu            | Permission           |
| --------------- | -------------------- |
| User Management | iam.user.read        |
| Role Management | iam.role.read        |
| CRM             | crm.lead.read        |
| Admissions      | admission.read       |
| Students        | student.read         |
| Courses         | course.read          |
| Batches         | batch.read           |
| Attendance      | attendance.read      |
| Finance         | finance.invoice.read |
| Certificates    | certificate.read     |
| Reports         | reports.read         |
| Audit           | iam.audit.read       |

If a user lacks the permission, the menu is not displayed.

---

# 9. Button-Level Authorization

| Button   | Permission        |
| -------- | ----------------- |
| New User | iam.user.create   |
| Edit     | iam.user.update   |
| Archive  | iam.user.archive  |
| Activate | iam.user.activate |
| Unlock   | iam.user.unlock   |
| Export   | iam.user.export   |

Buttons should be hidden (or disabled with an explanatory tooltip, based on UX policy) when the required permission is missing.

---

# 10. Data-Level Security

Authorization doesn't stop at menus.

Every query is filtered.

Example:

```text
Branch Manager

↓

Muscat Branch

↓

Only Muscat Students
```

---

Example SQL

```sql
SELECT *
FROM student
WHERE branch_id IN (:allowedBranches)
```

---

# 11. Branch Visibility Rules

| User Type        | Access                    |
| ---------------- | ------------------------- |
| Receptionist     | Assigned branch           |
| Trainer          | Assigned batches          |
| Branch Manager   | Assigned branch           |
| Regional Manager | Assigned + child branches |
| Institute Admin  | All branches              |
| Student          | Own records only          |

---

# 12. Permission Inheritance

```text
Role

↓

Permissions

↓

User

↓

Additional User Permissions

↓

Final Permission Set
```

Algorithm:

```
Effective Permissions =
(Role Permissions)
+ (Direct User Grants)
- (Direct User Denials, if supported)
```

For Phase 1, **avoid explicit deny rules** to keep authorization simple and predictable. Introduce deny rules only if a future business requirement justifies the added complexity.

---

# 13. Resource Ownership Rules

Some operations require ownership in addition to permissions.

Examples:

| Resource           | Rule                                                  |
| ------------------ | ----------------------------------------------------- |
| Student Profile    | Student can view only own profile                     |
| Attendance         | Trainer can mark only assigned batches                |
| Certificate        | Student can download only own certificates            |
| Corporate Contract | Corporate coordinator must belong to assigned account |

---

# 14. Authorization Decision Flow

```text
Request
   │
   ▼
Authenticated?
   │
No ─────► 401 Unauthorized

Yes
   │
   ▼
User Active?
   │
No ─────► 403 Forbidden

Yes
   │
   ▼
Permission Present?
   │
No ─────► 403 Forbidden

Yes
   │
   ▼
Branch Allowed?
   │
No ─────► 403 Forbidden

Yes
   │
   ▼
Business Rule Valid?
   │
No ─────► 422 Unprocessable Entity

Yes
   │
   ▼
Ownership Valid?
   │
No ─────► 403 Forbidden

Yes
   │
   ▼
Execute
```

---

# 15. Permission Cache Strategy

To improve performance:

* Cache effective permissions per user.
* Invalidate cache immediately when:

  * Roles change
  * Direct permissions change
  * Branch assignments change
  * User is suspended or archived

Cache key example:

```text
user:{userId}:permissions
```

---

# 16. Audit Requirements

Every authorization change must generate an audit event.

Examples:

* Role created
* Role updated
* Permission added to role
* Permission removed from role
* User assigned role
* User removed from role
* Branch assignment changed
* Security policy modified

Each event should capture:

* Who performed the change
* Timestamp
* Before/after values
* IP address
* Correlation ID

---

# 17. Future Enhancements

The authorization model is designed to evolve without redesign:

* Attribute-Based Access Control (ABAC) conditions (e.g., course, department, contract)
* Time-based permissions
* Delegated administration
* Temporary access grants
* Approval workflows for privileged access
* External Identity Providers (OIDC/SAML)
* Fine-grained API scopes
* Policy-as-Code integration (e.g., Open Policy Agent)

---

## Deliverables of Part 6

The IAM specification now defines:

* Enterprise authorization architecture
* Permission naming standards
* Permission catalogue
* Role templates
* Menu, screen, and button authorization
* Data-level security
* Branch visibility rules
* Permission inheritance model
* Resource ownership rules
* Authorization decision flow
* Permission caching strategy
* Audit requirements for security changes
* Roadmap for future authorization capabilities
