# Functional Requirement Document

## Module 3: Lead & Inquiry Management

**Version:** 1.1
**Module Code:** LEAD
**Phase:** Phase 1
**Owned Bounded Context:** Lead & Inquiry Management

**Dependencies:**

* Identity & Access Management
* Organization Management

**Provides Data To:**

* Admission & Enrollment Management
* Reporting & Dashboards
* Audit & Compliance
* Communication Management

---

# 1. Business Purpose

Lead & Inquiry Management captures inquiries, qualifies prospects, manages lead stages and follow-ups, supports counselor assignment, and prepares qualified prospects for conversion into admissions.

The context owns the intake and qualification lifecycle before a prospect becomes an admission.

This module shall support both student and corporate prospect flows.

---

# 2. Scope

## 2.1 In Scope

* Inquiry capture
* Lead capture
* Lead qualification
* Lead source management
* Lead stage management
* Counselor assignment
* Follow-up planning and tracking
* Lead won / lost handling
* Duplicate detection warning
* Campaign association
* Lead conversion handoff to Admissions
* Lead activity timeline

## 2.2 Out of Scope for Phase 1

* Full CRM marketing automation
* AI lead scoring
* External lead portal
* Social media ad platform integration

---

# 3. Business Principles

* Branch is mandatory for every lead and inquiry.
* Lead sources must be configurable.
* Lead stages must be configurable.
* A lead may be assigned to a counselor or remain unassigned.
* Counselors access assigned leads by default.
* Branch-scoped access must be enforced through IAM.
* Duplicate warnings must not block creation unless the user chooses to block it by policy.
* A lead may only be converted to admission after qualification and authorized action.
* Lost reasons must be captured before a lead can be closed as lost.
* Follow-up reminders must be visible in operational views.

---

# 4. Owned Concepts

The Lead & Inquiry context owns:

* Inquiry
* Lead
* LeadSource
* LeadStage
* FollowUp
* Campaign

Notes:

* Inquiry is the intake record captured before or during qualification.
* Lead is the managed sales/prospect record used for follow-up and conversion.
* `Admission` is not owned here. Conversion only hands data to the Admission & Enrollment context.

---

# 5. Business Model

## 5.1 Lead Types

The system shall support:

```text
Student
Corporate
```

Rules:

* Walk-in shall be treated as a lead source or intake channel, not a lead type.
* Corporate leads may carry company-level contact data.
* Student leads may carry personal contact data.

## 5.2 Lead Sources

Default sources:

```text
Walk-in
Phone
Website
WhatsApp
Facebook
Instagram
Google Ads
Referral
Corporate Referral
```

Rules:

* Lead sources must be configurable.
* Lead sources may be active or inactive.
* Inactive lead sources cannot be used for new records.

## 5.3 Lead Stages

Default stages:

```text
New
Contacted
Follow-up
Qualified
Demo Scheduled
Negotiation
Won
Lost
Converted
```

Rules:

* Lead stages must be configurable.
* Stage display order must be preserved.
* Won and Lost stages must be explicitly marked.
* Converted indicates the lead has been handed off to Admission & Enrollment.

## 5.4 Inquiry Lifecycle

```text
Captured
  ↓
Qualified
  ↓
Converted to Lead
  ↓
Closed
```

## 5.5 Lead Lifecycle

```text
New
  ↓
Contacted
  ↓
Follow-up
  ↓
Qualified
  ↓
Won
  ↓
Converted
```

Alternative:

```text
Qualified
  ↓
Lost
```

Rules:

* A lead may move backward between active stages if authorized.
* Lost and Converted are terminal outcomes.

---

# 6. Screens

## LEAD-UI-001 Inquiry List Screen

### Purpose

View and manage captured inquiries before qualification.

### Columns

```text
Inquiry Number
Name
Phone
Email
Lead Type
Source
Branch
Status
Created Date
Actions
```

### Filters

```text
Branch
Lead Type
Source
Status
Created Date Range
Search
```

### Actions

```text
Create Inquiry
View Inquiry
Edit Inquiry
Qualify Inquiry
Convert to Lead
Export
```

### Permissions

```text
INQUIRY_VIEW
INQUIRY_CREATE
INQUIRY_EDIT
INQUIRY_QUALIFY
INQUIRY_CONVERT
INQUIRY_EXPORT
```

---

## LEAD-UI-002 Lead List Screen

### Purpose

View and manage qualified leads.

### Columns

```text
Lead Number
Name
Phone
Email
Lead Type
Interested Course
Lead Source
Stage
Assigned Counselor
Next Follow-up Date
Status
Actions
```

### Filters

```text
Branch
Lead Type
Lead Source
Lead Stage
Assigned Counselor
Interested Course
Created Date Range
Follow-up Date
Status
Search
```

### Actions

```text
Create Lead
View Lead
Edit Lead
Assign Counselor
Schedule Follow-up
Mark Won
Mark Lost
Convert to Admission
Export Leads
```

### Permissions

```text
LEAD_VIEW
LEAD_CREATE
LEAD_EDIT
LEAD_ASSIGN
LEAD_FOLLOWUP_CREATE
LEAD_MARK_WON
LEAD_MARK_LOST
LEAD_CONVERT
LEAD_EXPORT
```

---

## LEAD-UI-003 Create / Edit Inquiry Screen

### Fields

```text
Branch
Lead Type
Full Name
Phone
Email
Source
Interested Course
Campaign
Assigned Counselor
Priority
Notes
Status
```

### Validations

* Branch is required.
* Lead Type is required.
* Full Name is required.
* Phone or Email is required.
* Source is required.
* Phone format must be valid if provided.
* Email format must be valid if provided.

### Business Rules

* Inquiry number must be auto-generated.
* Inquiry defaults to Captured status.
* Duplicate warning should appear for matching phone or email.
* Authorized users may proceed after acknowledging a duplicate warning.

---

## LEAD-UI-004 Create / Edit Lead Screen

### Fields

```text
Branch
Lead Type
Full Name
Phone
Email
Interested Course
Source
Campaign
Assigned Counselor
Priority
Notes
Stage
Status
```

### Validations

* Branch is required.
* Lead Type is required.
* Full Name is required.
* Phone or Email is required.
* Source is required.
* Stage is required.

### Business Rules

* Lead number must be auto-generated.
* New lead should default to the first configured active stage.
* Duplicate warning should appear for same phone or email.
* Authorized users may proceed after acknowledging a duplicate warning.
* Inactive sources and inactive stages cannot be selected.

---

## LEAD-UI-005 Lead Details Screen

### Sections

```text
Lead Summary
Contact Information
Inquiry History
Follow-up Timeline
Campaign Link
Assignment Details
Conversion History
Audit History
```

### Actions

```text
Edit
Assign Counselor
Create Follow-up
Mark Won
Mark Lost
Convert to Admission
View Timeline
```

---

## LEAD-UI-006 Lead Source Management

### Fields

```text
Source Name
Description
Status
Effective Start Date
Effective End Date
```

### Business Rules

* Lead sources are configurable master data.
* One source name must be unique within active records.
* Inactive sources cannot be assigned to new inquiries or leads.

---

## LEAD-UI-007 Lead Stage Management

### Fields

```text
Stage Name
Display Order
Is Won Stage
Is Lost Stage
Status
Effective Start Date
Effective End Date
```

### Business Rules

* Lead stages are configurable master data.
* Exactly one active Won stage and one active Lost stage should be allowed per branch policy.
* Stage order must be preserved for pipeline views.

---

## LEAD-UI-008 Follow-up Screen

### Fields

```text
Lead
Counselor
Follow-up Date
Follow-up Type
Outcome
Notes
Next Follow-up Date
Status
```

### Business Rules

* Follow-up records belong to a lead.
* Follow-up reminders should surface in the notification area.
* Completed follow-ups must retain historical notes.

---

## LEAD-UI-009 Campaign Management

### Fields

```text
Campaign Name
Campaign Type
Start Date
End Date
Budget
Status
Notes
```

### Business Rules

* Campaigns are optional and may be linked to leads and inquiries.
* Campaigns are configurable operational records.
* Campaign association must be retained for reporting.

---

# 7. Functional Requirements

## FR-LEAD-001 Capture Inquiry

The system shall allow authorized users to capture inquiries.

## FR-LEAD-002 Create Lead

The system shall allow authorized users to create leads.

## FR-LEAD-003 Manage Lead Sources

The system shall support configurable lead sources.

## FR-LEAD-004 Manage Lead Stages

The system shall support configurable lead stages.

## FR-LEAD-005 Assign Counselor

The system shall allow leads to be assigned to counselors.

## FR-LEAD-006 Manage Follow-ups

The system shall allow counselors to create and manage follow-ups for leads.

## FR-LEAD-007 Follow-up Reminder

The system shall surface pending follow-up reminders in the notification area.

## FR-LEAD-008 Mark Lead Won

The system shall allow authorized users to mark leads as Won.

## FR-LEAD-009 Mark Lead Lost

The system shall require a lost reason before a lead can be marked as Lost.

## FR-LEAD-010 Duplicate Lead Warning

The system shall warn users if another inquiry or lead exists with the same phone or email.

## FR-LEAD-011 Campaign Association

The system shall allow inquiries and leads to be linked to campaigns.

## FR-LEAD-012 Lead Qualification

The system shall allow inquiries to be qualified into leads.

## FR-LEAD-013 Convert Lead to Admission

The system shall allow qualified leads to be handed off to Admission & Enrollment.

## FR-LEAD-014 Activity Timeline

The system shall maintain a timeline of lead and inquiry activities.

---

# 8. Audit Events

The following audit events shall be supported:

```text
InquiryCreated
InquiryUpdated
InquiryQualified
LeadCreated
LeadUpdated
LeadAssigned
LeadStageChanged
LeadWon
LeadLost
FollowUpCreated
FollowUpCompleted
CampaignCreated
CampaignUpdated
LeadConvertedToAdmission
```

Rules:

* Assignment, stage changes, win, loss, qualification, and conversion must be audited.
* Lost actions must record a reason.
* Conversion must record the target admission reference once created downstream.

---

# 9. Domain Errors

The module shall distinguish between validation and business-rule errors such as:

```text
DuplicateInquiryDetected
DuplicateLeadDetected
LeadSourceInactive
LeadStageInactive
CounselorInactive
LeadNotQualifiedForConversion
LostReasonRequired
BranchScopeViolation
AssignedLeadScopeViolation
InvalidStageTransition
```

---

# 10. Reporting and Operational Views

The Lead & Inquiry context shall support the following read views:

```text
Lead Count by Stage
Lead Count by Source
Counselor Follow-up Pending
Lead Conversion Report
Lost Lead Reason Report
Campaign Lead Report
Activity Timeline
```

These are read models and reporting views, not separate owned entities.

---

# 11. FRD Improvement Notes

This module should remain the single source of truth for:

* inquiry intake
* lead qualification
* lead stage policy
* counselor assignment
* follow-up tracking
* campaign linkage
* conversion handoff to admissions

It should not own admissions, enrollments, or student master data.
