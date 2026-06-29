# Module 02.13 — Organization Settings & Configuration

**Module Code:** `ORG-CONFIG`
**Version:** 3.0
**Bounded Context:** Organization Management / Configuration
**Priority:** Critical Foundation
**Dependencies:** Organization, Branch, IAM, Branding
**Dependent Modules:** All modules

---

# 1. Purpose

Organization Settings & Configuration defines global system defaults used across ASTI IMS.

This module controls:

* Numbering formats
* Default currency
* Default language
* Date/time formats
* Approval behavior
* Branch inheritance rules
* Operational policies
* Feature availability
* Master configuration values

It prevents hardcoding and allows business rules to be changed without code changes.

---

# 2. Business Objectives

The system shall allow administrators to:

* Configure organization-wide defaults
* Configure module-level settings
* Configure branch override rules
* Configure numbering series
* Configure localization defaults
* Configure operational policies
* Control feature availability
* Maintain auditable configuration history

---

# 3. Scope

## Included

* Global organization settings
* Branch override support
* Numbering series
* Localization settings
* Date/time/currency formats
* Module configuration
* Feature flags
* Approval settings
* Audit history

## Excluded

* User permissions
* Course pricing
* Fee transactions
* Communication templates
* Certificate layout design

---

# 4. Actors

| Actor                | Responsibility                     |
| -------------------- | ---------------------------------- |
| Super Admin          | Full configuration control         |
| Organization Admin   | Manage business configuration      |
| Branch Manager       | View / request branch overrides    |
| Finance Manager      | Configure finance-related settings |
| Academic Coordinator | Configure academic settings        |
| System               | Resolve effective configuration    |

---

# 5. Business Capabilities

1. Global Settings Management
2. Branch Override Management
3. Numbering Series Management
4. Localization Configuration
5. Module Feature Control
6. Approval Policy Configuration
7. Default Value Management
8. Configuration Versioning
9. Configuration Audit

---

# 6. Aggregate Design

## Aggregate Root

```text
ConfigurationProfile
```

## Child Entities

```text
ConfigurationItem
ConfigurationOverride
NumberingSeries
FeatureFlag
PolicySetting
ConfigurationAudit
```

---

# 7. Entity Model

```text
Organization
      │
      ▼
Configuration Profile
      │
      ├── Global Settings
      ├── Branch Overrides
      ├── Numbering Series
      ├── Feature Flags
      ├── Policy Settings
      └── Audit History
```

---

# 8. Configuration Lifecycle

```text
Draft
   ↓
Active
   ├── Scheduled
   ├── Deprecated
   ↓
Archived
```

---

# 9. Functional Requirements

## ORG-CONFIG-001 — Create Configuration Profile

The system shall allow creation of a configuration profile.

Fields:

* Profile Name
* Scope: Organization / Branch
* Branch optional
* Effective From
* Effective To
* Status

Rules:

* Only one active configuration profile per scope and period.
* Branch configuration inherits organization defaults unless overridden.

---

## ORG-CONFIG-002 — Configure Global Defaults

Global defaults include:

* Default Currency
* Default Language
* Timezone
* Date Format
* Time Format
* Number Format
* Fiscal Year Start Month
* Week Start Day
* Default Country
* Default VAT Applicability

---

## ORG-CONFIG-003 — Configure Branch Overrides

Branches may override selected organization defaults.

Examples:

* Working hours
* Calendar
* Default language
* Fiscal year
* Numbering prefix
* Approval rules

Rules:

* Not all settings are overrideable.
* Each setting must define whether branch override is allowed.

---

## ORG-CONFIG-004 — Configure Numbering Series

The system shall support configurable numbering for:

* Student Number
* Enrollment Number
* Lead Number
* Invoice Number
* Receipt Number
* Certificate Number
* Quotation Number
* Sales Order Number

Example:

```text
ASTI-STU-2026-0001
ASTI-ENR-2026-0001
ASTI-INV-2026-0001
```

Rules:

* Prefix configurable.
* Year format configurable.
* Padding length configurable.
* Branch prefix optional.
* Numbering must be unique per entity type.

---

## ORG-CONFIG-005 — Configure Feature Flags

Feature flags control module availability.

Examples:

```text
enableWebsiteRegistration
enableCorporateTraining
enableWalkInFastTrack
enableOnlinePayment
enableCertificateVerification
enableWhatsAppNotifications
enableSMSNotifications
enableTallySync
enableBiometricAttendance
```

Rules:

* Disabled feature should hide related UI.
* Disabled feature should block related API access.
* Feature state must be auditable.

---

## ORG-CONFIG-006 — Configure Approval Policies

Approval policies include:

* Discount approval
* Refund approval
* Course completion approval
* Certificate reissue approval
* Corporate credit override approval
* Special working holiday approval

Rules:

* Approval type must define approver level.
* Approval can be single-level or multi-level.
* Approval rules may be organization-wide or branch-specific.

---

## ORG-CONFIG-007 — Configure Academic Defaults

Academic defaults include:

* Minimum attendance percentage
* Exam required default
* Completion approval required default
* Certificate payment validation required
* Batch capacity override allowed
* Waiting list enabled

---

## ORG-CONFIG-008 — Configure Finance Defaults

Finance defaults include:

* Default tax applicability
* Default VAT rate
* Default payment methods
* Default invoice due days
* Receipt numbering format
* Refund approval required
* Corporate credit blocking default

---

## ORG-CONFIG-009 — Configure Communication Defaults

Communication defaults include:

* Default sender email
* Default SMS sender ID
* Default WhatsApp number
* Notification language
* Enable/disable notification types
* In-app reminder behavior

Actual templates are managed in Communication module.

---

## ORG-CONFIG-010 — Configure Localization Settings

Localization settings include:

* English enabled
* Arabic enabled
* RTL enabled
* Default language
* Fallback language
* Localized labels required or optional

---

## ORG-CONFIG-011 — Resolve Effective Configuration

The system shall resolve configuration using hierarchy:

```text
Branch Override
      ↓ if not available
Organization Default
      ↓ if not available
System Default
```

---

## ORG-CONFIG-012 — Schedule Configuration Change

The system shall allow configuration changes to be scheduled for a future effective date.

Example:

* New VAT rate from next month
* New numbering prefix from next year
* New approval workflow from next quarter

---

## ORG-CONFIG-013 — Archive Configuration Profile

Configuration profile can be archived only when:

* It is not active.
* No future effective rules depend on it.
* Historical references are preserved.

---

# 10. Business Rules

| ID            | Rule                                                                       |
| ------------- | -------------------------------------------------------------------------- |
| BR-CONFIG-001 | One active configuration profile per scope and effective period.           |
| BR-CONFIG-002 | Branch settings inherit organization settings by default.                  |
| BR-CONFIG-003 | Branch overrides apply only to overrideable settings.                      |
| BR-CONFIG-004 | Numbering series must be unique per entity type.                           |
| BR-CONFIG-005 | Feature flag changes must be audited.                                      |
| BR-CONFIG-006 | Disabled features must be blocked at UI and API level.                     |
| BR-CONFIG-007 | Future effective configurations must not overlap.                          |
| BR-CONFIG-008 | Historical records must retain the configuration used at transaction time. |
| BR-CONFIG-009 | System defaults should be used only when no organization setting exists.   |

---

# 11. Configuration Resolution Priority

```text
Request Context
      ↓
Branch Configuration
      ↓ if missing
Organization Configuration
      ↓ if missing
System Default
```

Example:

```text
Invoice Number Format
      ↓
Branch-specific format if configured
      ↓
Organization invoice format
      ↓
System default
```

---

# 12. Workflow

```text
Create Configuration Profile
      ↓
Configure Defaults
      ↓
Configure Numbering
      ↓
Configure Feature Flags
      ↓
Configure Approval Policies
      ↓
Preview Impact
      ↓
Activate
      ↓
System Uses Effective Configuration
```

---

# 13. Screen Specifications

## Configuration Dashboard

Shows:

* Active configuration profile
* Enabled modules
* Numbering series status
* Approval policies
* Branch overrides
* Recent configuration changes

---

## Configuration Profile List

Columns:

* Profile Name
* Scope
* Branch
* Effective From
* Effective To
* Status

Actions:

* View
* Edit
* Clone
* Activate
* Schedule
* Archive

---

## Configuration Details

Tabs:

1. General Defaults
2. Numbering Series
3. Feature Flags
4. Academic Settings
5. Finance Settings
6. Communication Settings
7. Localization
8. Approval Policies
9. Branch Overrides
10. Audit History

---

# 14. Validation Rules

* Profile name is mandatory.
* Scope is mandatory.
* Branch is mandatory if scope is Branch.
* Effective From must be before Effective To.
* Date format must be valid.
* Currency must exist in master data.
* Default language must be enabled.
* Numbering prefix cannot contain invalid characters.
* Padding length must be greater than zero.
* Duplicate active numbering series is not allowed.

---

# 15. Permissions Matrix

| Permission             | Super Admin | Org Admin | Branch Manager | Finance Manager |
| ---------------------- | ----------- | --------- | -------------- | --------------- |
| View Configuration     | ✓           | ✓         | ✓              | ✓               |
| Create Configuration   | ✓           | ✓         | ✗              | ✗               |
| Edit Global Defaults   | ✓           | ✓         | ✗              | ✗               |
| Edit Finance Settings  | ✓           | ✓         | ✗              | ✓               |
| Edit Branch Override   | ✓           | ✓         | ✓ limited      | ✗               |
| Activate Configuration | ✓           | ✓         | ✗              | ✗               |
| Archive Configuration  | ✓           | ✗         | ✗              | ✗               |
| View Audit             | ✓           | ✓         | ✗              | ✓               |

---

# 16. Notifications

Generate notifications for:

* Configuration profile created
* Configuration activated
* Feature flag changed
* Numbering series changed
* Approval policy changed
* Branch override added
* Scheduled configuration activated

Notify impacted module owners when critical settings change.

---

# 17. Audit Requirements

Audit all changes to:

* Global defaults
* Branch overrides
* Numbering series
* Feature flags
* Approval policies
* Finance settings
* Localization settings

Each audit record must include:

* User
* Timestamp
* Old value
* New value
* Scope
* Effective date
* Reason
* IP address

---

# 18. Reports

* Configuration Summary Report
* Feature Flag Report
* Numbering Series Report
* Branch Override Report
* Approval Policy Report
* Configuration Audit Report

---

# 19. Dashboard Widgets

* Active Configuration Profile
* Enabled Features
* Branch Overrides Count
* Pending Scheduled Changes
* Numbering Series Health
* Recent Configuration Changes

---

# 20. Domain Events

```text
ConfigurationProfileCreated
ConfigurationProfileActivated
ConfigurationProfileScheduled
ConfigurationProfileArchived
ConfigurationItemUpdated
BranchOverrideConfigured
FeatureFlagChanged
NumberingSeriesUpdated
ApprovalPolicyUpdated
LocalizationSettingsUpdated
```

---

# 21. Database Mapping

## Aggregate Root

```text
ConfigurationProfile
```

## Suggested Tables

```text
configuration_profiles
configuration_items
configuration_overrides
numbering_series
feature_flags
approval_policy_settings
configuration_audit_logs
```

### Key Fields: `configuration_profiles`

```text
id
scopeType
organizationId
branchId
profileName
effectiveFrom
effectiveTo
status
createdAt
createdBy
updatedAt
updatedBy
deletedAt
version
```

### Key Fields: `configuration_items`

```text
id
profileId
configKey
configValue
valueType
isOverrideAllowed
moduleCode
description
```

### Key Fields: `numbering_series`

```text
id
scopeType
organizationId
branchId
entityType
prefix
yearFormat
nextNumber
paddingLength
resetFrequency
status
```

### Key Fields: `feature_flags`

```text
id
scopeType
organizationId
branchId
featureCode
isEnabled
effectiveFrom
effectiveTo
```

---

# 22. API Summary

```text
POST   /configuration-profiles
GET    /configuration-profiles
GET    /configuration-profiles/{profileId}
PUT    /configuration-profiles/{profileId}
PATCH  /configuration-profiles/{profileId}/activate
PATCH  /configuration-profiles/{profileId}/archive

GET    /configuration/effective
PUT    /configuration-items/{configKey}
PUT    /configuration-overrides/{branchId}/{configKey}

POST   /numbering-series
PUT    /numbering-series/{seriesId}
GET    /numbering-series/{entityType}/next

POST   /feature-flags
PUT    /feature-flags/{featureCode}

POST   /approval-policies
PUT    /approval-policies/{policyId}
```

---

# 23. Acceptance Criteria

## Scenario: Resolve Branch Override

**Given** organization default currency is OMR
**And** Muscat branch has currency override set to OMR
**When** a finance transaction is created for Muscat branch
**Then** the system uses the branch effective configuration.

## Scenario: Generate Enrollment Number

**Given** enrollment numbering format is `ASTI-ENR-YYYY-0000`
**When** a new enrollment is confirmed
**Then** the system generates the next unique enrollment number using the active numbering series.

## Scenario: Disable Feature

**Given** WhatsApp notification feature is disabled
**When** a user tries to send WhatsApp notification
**Then** the UI hides the action and API rejects the request with feature-disabled response.

---

# 24. Design Recommendation

This module should be implemented early because it prevents hardcoding across the system.

For ASTI Phase 1, implement:

```text
Global defaults
Branch overrides
Numbering series
Feature flags
Approval policy settings
Localization settings
```

Keep advanced configuration like workflow builder and full policy engine for later.

This module acts as the **control center** for the IMS platform and will reduce future rework across CRM, Enrollment, Finance, Certificates, and Communication.
