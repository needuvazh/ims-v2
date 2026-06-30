# Module 02 – Organization Management

For Organization Management, the module is structured into the following specifications:

```
Module 02 – Organization Management
│
├── Part 2.1 Organization (Institute) Management
├── Part 2.2 Branch Management
├── Part 2.3 Department Management
└── Part 2.4 Classroom Management
```

---


# Module 02.1 — Organization (Institute) Management

**Module Code:** `ORG-001`

**Version:** 3.0

**Bounded Context:** Organization Management

**Priority:** Critical (Foundation Module)

---

# 1. Purpose

The Organization Management module is the root of the ASTI IMS business hierarchy.

It defines the institute's legal identity, business profile, operational defaults, and global settings that are inherited by all downstream modules.

Every business transaction in the system ultimately belongs to an Organization.

This module serves as the single source of truth for institute-level information.

---

# 2. Business Objectives

The system shall enable administrators to:

* Register the institute
* Configure institute profile
* Configure legal information
* Configure operational defaults
* Configure localization settings
* Configure fiscal information
* Configure contact information
* Configure institute-wide policies

---

# 3. Scope

### Included

* Institute profile
* Legal information
* Contact information
* Address information
* Operational settings
* Localization
* Fiscal settings
* Status management

### Excluded

* Branches
* Departments
* Buildings
* Users
* Courses
* Students
* Finance

These are managed by separate modules.

---

# 4. Stakeholders

| Role                       | Responsibility                       |
| -------------------------- | ------------------------------------ |
| Super Administrator        | Full control                         |
| Organization Administrator | Manage institute                     |
| Branch Manager             | Read-only                            |
| Finance                    | Read organization profile            |
| HR                         | Read organization profile            |
| Reporting Engine           | Consume organization metadata        |
| Website                    | Display public institute information |

---

# 5. Business Capabilities

The Organization module provides the following capabilities:

1. Institute Registration
2. Institute Profile Management
3. Legal Entity Management
4. Contact Management
5. Address Management
6. Operational Configuration
7. Localization Configuration
8. Status Management
9. Organization Audit History

---

# 6. Aggregate

## Aggregate Root

```
Organization
```

### Child Entities

```
OrganizationProfile

OrganizationContact

OrganizationAddress

OrganizationLocalization

OrganizationSettings

OrganizationAudit
```

---

# 7. Entity Model

```
Organization
│
├── Profile
├── Contact
├── Address
├── Localization
├── Settings
└── Audit History
```

---

# 8. Organization Lifecycle

```
Draft
      │
      ▼
Configured
      │
      ▼
Active
      │
      ├────► Suspended
      │
      ▼
Archived
```

---

# 9. Functional Requirements

---

## ORG-ORG-001

### Create Organization

The system shall allow an authorized administrator to create a new organization.

#### Input Fields

* Organization Code
* Legal Name (English)
* Legal Name (Arabic)
* Trade Name
* Short Name
* Registration Number
* Registration Date
* Tax Registration Number
* Country
* Time Zone
* Default Currency
* Default Language

#### Business Rules

* Organization Code must be unique.
* Legal Name is mandatory.
* Country is mandatory.
* Time Zone is mandatory.
* Default Currency is mandatory.
* Default Language is mandatory.

#### Acceptance Criteria

* Organization is successfully created.
* Audit log is generated.
* Status becomes **Draft**.

---

## ORG-ORG-002

### Update Organization Profile

The system shall allow administrators to update organization information.

Editable fields include:

* Trade Name
* Contact Information
* Address
* Website
* Description
* Operational Settings

Legal registration fields may be locked after activation unless the user has elevated permissions.

---

## ORG-ORG-003

### Activate Organization

The organization can only be activated when mandatory information is completed.

#### Validation Checklist

* Legal profile completed
* Address completed
* Primary contact defined
* Localization configured
* Fiscal year configured

If any required information is missing, activation is blocked with validation messages.

---

## ORG-ORG-004

### Suspend Organization

The system shall allow suspension of an organization.

Effects:

* No new admissions
* No new enrollments
* No new invoices
* Existing data remains accessible
* Read-only access for operational users

---

## ORG-ORG-005

### Archive Organization

An organization may be archived only when:

* No active branches exist
* No active students exist
* No active batches exist
* No pending financial transactions exist

Physical deletion is not permitted.

---

# 10. Business Rules

| ID         | Rule                                                                 |
| ---------- | -------------------------------------------------------------------- |
| BR-ORG-001 | Organization Code must be globally unique.                           |
| BR-ORG-002 | One active organization only (current single-client implementation). |
| BR-ORG-003 | Organization cannot be deleted.                                      |
| BR-ORG-004 | Organization must have one primary contact.                          |
| BR-ORG-005 | Organization must have one registered address.                       |
| BR-ORG-006 | Default currency is mandatory.                                       |
| BR-ORG-007 | Default timezone is mandatory.                                       |
| BR-ORG-008 | English legal name is mandatory.                                     |
| BR-ORG-009 | Arabic legal name is optional but recommended.                       |
| BR-ORG-010 | Organization status controls downstream operations.                  |

---

# 11. Screen Specifications

## Organization List

### Purpose

Display all organizations.

(Current implementation will show only one.)

### Columns

* Code
* Legal Name
* Country
* Currency
* Time Zone
* Status
* Last Updated

### Actions

* View
* Edit
* Activate
* Suspend
* Archive

---

## Organization Details

Sections:

* General Information
* Legal Information
* Address
* Contacts
* Localization
* Operational Settings
* Audit History

---

# 12. Validation Rules

* Organization Code must be unique.
* Registration Number must be unique.
* Email must be valid.
* Website must be a valid URL.
* Phone number must follow country format.
* Currency must exist in master data.
* Time Zone must exist in master data.

---

# 13. Permissions

| Permission            | Super Admin | Organization Admin | Branch Manager |
| --------------------- | ----------- | ------------------ | -------------- |
| View Organization     | ✓           | ✓                  | ✓              |
| Create Organization   | ✓           | ✗                  | ✗              |
| Edit Organization     | ✓           | ✓                  | ✗              |
| Activate Organization | ✓           | ✓                  | ✗              |
| Suspend Organization  | ✓           | ✓                  | ✗              |
| Archive Organization  | ✓           | ✗                  | ✗              |

---

# 14. Audit Requirements

The system shall record:

* Organization created
* Organization updated
* Organization activated
* Organization suspended
* Organization archived

Each audit record shall include:

* User
* Date & Time
* Previous Value
* New Value
* IP Address
* Device Information
* Reason (where applicable)

---

# 15. Domain Events

* `OrganizationCreated`
* `OrganizationUpdated`
* `OrganizationActivated`
* `OrganizationSuspended`
* `OrganizationArchived`

---

# 16. Database Mapping

### Aggregate Root

* Organization

### Entities

* Organization
* OrganizationProfile
* OrganizationContact
* OrganizationAddress
* OrganizationLocalization
* OrganizationSettings
* OrganizationAudit

---

# 17. API Summary

* `POST /organizations`
* `GET /organizations`
* `GET /organizations/{id}`
* `PUT /organizations/{id}`
* `PATCH /organizations/{id}/activate`
* `PATCH /organizations/{id}/suspend`
* `PATCH /organizations/{id}/archive`

---

# 18. Reports

* Organization Profile Report
* Organization Configuration Report
* Organization Audit Report

---

# 19. Acceptance Criteria (BDD)

### Scenario: Create Organization

**Given** a Super Administrator is authenticated
**When** they submit valid organization details
**Then** the system creates the organization in **Draft** status and records an audit entry.

### Scenario: Activate Organization

**Given** the organization is in **Configured** status and all mandatory information is complete
**When** the administrator selects **Activate**
**Then** the organization status changes to **Active**, and the system records the activation event and audit log.

---

## Recommendation for v3.1

Although the current project is **single-client**, I recommend designing this module with **future SaaS compatibility** in mind. The public API and domain model should not assume a single organization, even if only one record exists initially. This avoids future redesign if ASTI evolves into a multi-institute platform. The UI can enforce a single organization today while the underlying model remains extensible. This approach keeps the implementation aligned with your long-term roadmap without adding unnecessary complexity to the current release.
