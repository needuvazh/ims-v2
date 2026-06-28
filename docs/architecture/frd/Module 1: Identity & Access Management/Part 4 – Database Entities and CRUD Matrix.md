# ASTI IMS Solution Design Specification (SDS)

# Module 01 – Identity & Access Management (IAM)

# Part 4

## Database Model

## Entity Specifications

## CRUD Matrix

## Constraints

## Indexing Strategy

## Data Lifecycle

**Version:** 3.0

---

# 1. Database Design Principles

The IAM module follows these principles:

* **Single Source of Truth**: Identity data is owned exclusively by IAM.
* **Normalized Design**: Avoid redundant identity and permission data.
* **Soft Delete**: Operational records are archived, not physically deleted.
* **Optimistic Locking**: Prevent concurrent update conflicts.
* **Auditability**: Every change is traceable.
* **Future Multi-Tenant Ready**: Although Phase 1 is single-client, the schema should accommodate future tenant isolation without redesign.

---

# 2. Entity Relationship Overview

```text
                 Person
                    │
                    │ 1 : 1
                    ▼
                  User
                    │
      ┌─────────────┼──────────────┐
      │             │              │
      ▼             ▼              ▼
 UserRole     UserBranchAccess   UserSession
      │
      ▼
     Role
      │
      ▼
RolePermission
      │
      ▼
 Permission

User
 │
 ▼
PasswordHistory

User
 │
 ▼
LoginHistory

User
 │
 ▼
AuditLog
```

---

# 3. Entity Specifications

---

# 3.1 User

## Purpose

Represents a system login account.

---

### Primary Key

```text
id UUID
```

---

### Foreign Keys

```text
personId
defaultBranchId
```

---

### Attributes

| Field             | Type         | Required | Unique |
| ----------------- | ------------ | -------- | ------ |
| id                | UUID         | Yes      | Yes    |
| personId          | UUID         | Yes      | Yes    |
| email             | VARCHAR(255) | Yes      | Yes    |
| username          | VARCHAR(100) | Yes      | Yes    |
| passwordHash      | TEXT         | Yes      | No     |
| status            | ENUM         | Yes      | No     |
| defaultBranchId   | UUID         | Yes      | No     |
| preferredLanguage | VARCHAR(5)   | Yes      | No     |
| lastLoginAt       | TIMESTAMP    | No       | No     |
| failedLoginCount  | INTEGER      | Yes      | No     |
| lockedUntil       | TIMESTAMP    | No       | No     |
| passwordChangedAt | TIMESTAMP    | No       | No     |
| isArchived        | BOOLEAN      | Yes      | No     |
| createdAt         | TIMESTAMP    | Yes      | No     |
| updatedAt         | TIMESTAMP    | Yes      | No     |
| deletedAt         | TIMESTAMP    | No       | No     |
| version           | INTEGER      | Yes      | No     |

---

### Indexes

```text
PK_User

UK_User_Email

UK_User_Username

IDX_User_Status

IDX_User_LastLogin

IDX_User_DefaultBranch
```

---

### Business Constraints

* Email must be unique.
* Username must be unique.
* One person can have only one active user account.
* Archived users cannot authenticate.

---

# 3.2 Role

---

## Purpose

Represents a business role.

---

### Attributes

| Field        | Type         |
| ------------ | ------------ |
| id           | UUID         |
| code         | VARCHAR(50)  |
| name         | VARCHAR(150) |
| description  | TEXT         |
| isSystemRole | BOOLEAN      |
| status       | ENUM         |
| createdAt    | TIMESTAMP    |
| updatedAt    | TIMESTAMP    |
| version      | INTEGER      |

---

### Indexes

```text
UK_Role_Code

IDX_Role_Status
```

---

### Constraints

* Role code must be unique.
* System roles cannot be deleted.
* Archived roles cannot be assigned.

---

# 3.3 Permission

---

### Attributes

| Field       | Type         |
| ----------- | ------------ |
| id          | UUID         |
| code        | VARCHAR(200) |
| moduleCode  | VARCHAR(100) |
| resource    | VARCHAR(100) |
| action      | VARCHAR(100) |
| description | TEXT         |
| status      | ENUM         |

---

### Examples

```text
student.read

student.create

student.update

finance.invoice.create

course.publish
```

---

### Indexes

```text
UK_Permission_Code

IDX_Module

IDX_Action
```

---

# 3.4 UserRole

Purpose

Many-to-many relationship.

---

Fields

```text
id

userId

roleId

assignedBy

assignedAt

isPrimaryRole
```

---

Constraints

One user may have multiple roles.

One role may belong to multiple users.

---

# 3.5 RolePermission

Purpose

Many-to-many relationship.

---

Fields

```text
id

roleId

permissionId
```

---

Constraints

Duplicate assignments prohibited.

---

# 3.6 UserBranchAccess

Purpose

Defines organizational visibility.

---

Fields

```text
id

userId

branchId

isDefault

canViewChildBranches

canViewConsolidated

status
```

---

Business Rules

User must have at least one branch.

Only one default branch.

---

# 3.7 UserSession

Purpose

Tracks active login sessions.

---

Fields

```text
id

userId

accessTokenId

refreshTokenId

deviceName

browser

os

ipAddress

loginAt

lastActivityAt

expiresAt

status
```

---

Indexes

```text
IDX_User

IDX_Status

IDX_Expiry
```

---

# 3.8 LoginHistory

Purpose

Permanent login history.

---

Fields

```text
id

userId

loginTime

logoutTime

browser

device

os

ipAddress

result

failureReason
```

---

Results

```text
Success

Failure

Locked

Expired
```

---

# 3.9 PasswordHistory

Purpose

Prevent password reuse.

---

Fields

```text
id

userId

passwordHash

changedAt
```

---

Rule

Store last:

```text
10 passwords
```

(Configurable.)

---

# 3.10 SecurityPolicy

Purpose

Stores configurable authentication rules.

---

Fields

```text
minimumPasswordLength

maximumPasswordLength

uppercaseRequired

lowercaseRequired

numberRequired

specialCharacterRequired

passwordHistory

passwordExpiryDays

failedLoginAttempts

lockDurationMinutes

sessionTimeoutMinutes

maximumConcurrentSessions
```

One active policy governs the entire deployment. Future versions may support branch-specific overrides if business requirements emerge.

---

# 3.11 AuditLog

Purpose

Immutable record of security-sensitive operations.

---

Fields

```text
id

entityType

entityId

action

performedBy

performedAt

ipAddress

oldValue

newValue

reason
```

---

Retention

Minimum:

```text
7 years
```

(Configurable based on compliance.)

---

# 4. CRUD Matrix

| Entity           | Create     | Read | Update | Archive       | Delete |
| ---------------- | ---------- | ---- | ------ | ------------- | ------ |
| User             | ✔          | ✔    | ✔      | ✔             | ✖      |
| Role             | ✔          | ✔    | ✔      | ✔             | ✖*     |
| Permission       | ✔          | ✔    | ✔      | ✔             | ✖*     |
| UserRole         | ✔          | ✔    | ✔      | ✔             | ✖      |
| RolePermission   | ✔          | ✔    | ✔      | ✔             | ✖      |
| UserBranchAccess | ✔          | ✔    | ✔      | ✔             | ✖      |
| UserSession      | ✔          | ✔    | ✖      | ✔ (Terminate) | ✖      |
| LoginHistory     | ✔ (System) | ✔    | ✖      | ✖             | ✖      |
| PasswordHistory  | ✔ (System) | ✔    | ✖      | ✖             | ✖      |
| SecurityPolicy   | ✔          | ✔    | ✔      | ✖             | ✖      |
| AuditLog         | ✔ (System) | ✔    | ✖      | ✖             | ✖      |

* Only non-system records may be archived. Physical deletion is prohibited.

---

# 5. Referential Integrity Rules

| Parent | Child            | Rule                         |
| ------ | ---------------- | ---------------------------- |
| Person | User             | One-to-one                   |
| User   | UserRole         | Cascade archive              |
| Role   | UserRole         | Restrict archive if assigned |
| Role   | RolePermission   | Cascade archive              |
| User   | UserBranchAccess | Cascade archive              |
| User   | UserSession      | Cascade terminate            |
| User   | LoginHistory     | Preserve forever             |
| User   | PasswordHistory  | Preserve configured history  |
| User   | AuditLog         | Preserve forever             |

---

# 6. Soft Delete Strategy

Entities use:

```text
deletedAt
isArchived
status
```

No operational table is physically deleted except transient security tokens.

Benefits:

* Audit compliance
* Historical reporting
* Recovery support
* Referential integrity

---

# 7. Versioning Strategy

All mutable entities include:

```text
version INTEGER
```

Updated using optimistic locking.

Example:

```sql
UPDATE user
SET version = version + 1
WHERE id = :id
AND version = :currentVersion;
```

If no rows are updated, a concurrency conflict is returned.

---

# 8. Indexing Strategy

## Primary Indexes

* Primary Key (UUID)

## Unique Indexes

* Email
* Username
* Role Code
* Permission Code

## Lookup Indexes

* User Status
* Branch
* Role
* Permission Module
* Session Status
* Login Time

## Composite Indexes

```text
(userId, status)

(roleId, permissionId)

(userId, branchId)

(userId, loginTime DESC)

(entityType, entityId)

(performedAt, action)
```

---

# 9. Data Retention Policy

| Entity          | Retention                        |
| --------------- | -------------------------------- |
| User            | Permanent (archive only)         |
| Role            | Permanent                        |
| Permission      | Permanent                        |
| LoginHistory    | 7 years                          |
| PasswordHistory | Last N passwords (default 10)    |
| UserSession     | 90 days after expiration         |
| AuditLog        | 7 years minimum                  |
| SecurityPolicy  | All historical versions retained |

---

# 10. Data Ownership

| Entity           | Owner | Consumed By              |
| ---------------- | ----- | ------------------------ |
| User             | IAM   | All modules              |
| Role             | IAM   | All modules              |
| Permission       | IAM   | All modules              |
| UserRole         | IAM   | Authorization            |
| UserBranchAccess | IAM   | Authorization, Reporting |
| UserSession      | IAM   | Security                 |
| LoginHistory     | IAM   | Audit                    |
| PasswordHistory  | IAM   | Authentication           |
| SecurityPolicy   | IAM   | Authentication           |
| AuditLog         | IAM   | Compliance               |

---

# 11. Concurrency Rules

* Email uniqueness enforced at the database level.
* Username uniqueness enforced at the database level.
* Role assignment uses optimistic locking.
* Branch assignment updates are version checked.
* Password changes invalidate existing refresh tokens.
* Concurrent password reset requests invalidate previous reset tokens.

---

# 12. Future Extensions

The data model is designed to accommodate future enhancements without schema redesign:

* Multi-Factor Authentication (MFA) tables
* OAuth/OpenID Connect identity providers
* SAML federation
* API client credentials
* Device trust management
* Security risk scoring
* Tenant-specific security policies (for SaaS)

---

## Deliverables of Part 4

At this stage, the IAM specification now contains:

* Complete logical database model
* Entity specifications
* Field definitions
* Primary and foreign key relationships
* CRUD ownership matrix
* Referential integrity rules
* Soft delete strategy
* Optimistic locking strategy
* Indexing recommendations
* Data retention policies
* Data ownership matrix
* Future extensibility guidance
