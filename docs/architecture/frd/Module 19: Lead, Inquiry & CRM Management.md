# Functional Requirement Document

## Module 19: Lead, Inquiry & CRM Management

**Version:** 1.1
**Module Code:** CRM
**Phase:** Phase 1
**Owned Bounded Context:** Lead & Inquiry Management

**Dependencies:**

* Communication Management
* Identity & Access Management
* Organization Management
* Course & Batch Management
* Corporate Training Management
* Admission & Enrollment Management

**Provides Data To:**

* Admissions & Enrollment Management
* Corporate Training Management
* Reporting & Dashboard Management
* Audit & Compliance

---

# 1. Business Purpose

Lead & Inquiry Management captures prospects, manages follow-ups, routes assignments, and tracks conversion through the sales funnel.

The context owns inquiries, leads, lead sources, lead stages, follow-ups, and campaigns. It creates handoff records for admission or corporate processes, but it does not own enrollment or contract execution.

---

# 2. Scope

## 2.1 In Scope

* Inquiry intake
* Lead capture
* Counselor assignment
* Follow-up tracking
* Lead stage management
* Campaign tagging
* Lead conversion handoff
* Lead analytics support

## 2.2 Out of Scope for Phase 1

* Admission lifecycle ownership
* Enrollment lifecycle ownership
* Corporate contract ownership
* Payment receipt ownership

---

# 3. Owned Concepts

The CRM context owns:

* Inquiry
* Lead
* LeadSource
* LeadStage
* FollowUp
* Campaign

---

# 4. Business Principles

* Inquiry is a lighter intake record than a qualified lead.
* One inquiry may convert into one lead, and one lead may generate one admission or corporate handoff.
* Walk-in is a lead source, not a separate lifecycle.
* Counselor assignment must respect branch scope and workload rules.
* Lost leads must remain available for reporting and reactivation.
* Communication history should be linked to the lead without owning the message delivery layer.
* Conversion handoff must not mutate downstream admission or corporate records directly.

---

# 5. Business Model

## 5.1 Lead Sources

```text
Walk-In
Phone Call
Website
WhatsApp
Facebook
Instagram
Google Ads
Referral
Corporate Referral
Campaign
```

## 5.2 Lead Types

```text
Student Lead
Corporate Lead
```

## 5.3 Inquiry Lifecycle

```text
New
  ↓
Contacted
  ↓
Qualified
  ↓
Converted
```

Alternative:

```text
Qualified
  ↓
Closed
```

## 5.4 Lead Lifecycle

```text
New
  ↓
Contacted
  ↓
Follow-Up
  ↓
Interested
  ↓
Won
```

Alternative:

```text
Interested
  ↓
Lost
```

```text
Won
  ↓
Handoff Completed
```

## 5.5 Follow-Up Lifecycle

```text
Planned
  ↓
Due
  ↓
Completed
```

Alternative:

```text
Due
  ↓
Missed
```

## 5.6 Campaign Lifecycle

```text
Draft
  ↓
Scheduled
  ↓
Running
  ↓
Completed
```

---

# 6. Screens

## CRM-UI-001 CRM Dashboard

### Widgets

```text
New Leads
Today's Follow-Ups
Interested Leads
Won Leads
Lost Leads
Conversion Rate
```

### Filters

```text
Branch
Counselor
Course
Source
Lead Type
Date Range
```

## CRM-UI-002 Inquiry List

### Columns

```text
Inquiry Number
Name
Mobile Number
Source
Interested Course
Branch
Status
Created Date
Actions
```

## CRM-UI-003 Lead List

### Columns

```text
Lead Number
Lead Name
Lead Type
Source
Counselor
Stage
Status
Created Date
Actions
```

### Actions

```text
Create Lead
Assign Counselor
Add Follow-Up
Convert
Mark Lost
Reactivate
```

## CRM-UI-004 Follow-Up Queue

### Columns

```text
Lead Number
Lead Name
Counselor
Due Date
Status
Priority
Actions
```

## CRM-UI-005 Campaign List

### Columns

```text
Campaign Code
Campaign Name
Channel
Status
Start Date
End Date
Actions
```

---

# 7. Functional Requirements

* The system shall allow capture of inquiries from web, phone, walk-in, and campaign sources.
* The system shall allow conversion from inquiry to lead without losing original source data.
* The system shall allow counselors to be assigned by branch and workload.
* The system shall allow follow-up scheduling, completion, and overdue tracking.
* The system shall allow lead stage configuration and lead status progression.
* The system shall allow lead conversion handoff to downstream admission or corporate workflows.
* The system shall preserve lead history after loss, conversion, or reactivation.
* The system shall link communication history to leads without owning delivery infrastructure.

---

# 8. Audit Events

The module shall emit audit events for:

```text
InquiryCreated
InquiryUpdated
LeadCreated
LeadUpdated
CounselorAssigned
FollowUpScheduled
FollowUpCompleted
LeadConverted
LeadMarkedLost
CampaignCreated
CampaignUpdated
```

---

# 9. Domain Errors

```text
INQUIRY_ALREADY_CONVERTED
LEAD_ALREADY_WON
LEAD_ALREADY_LOST
COUNSELOR_NOT_ASSIGNED
BRANCH_SCOPE_VIOLATION
FOLLOW_UP_OVERDUE
CAMPAIGN_INACTIVE
SOURCE_INACTIVE
```

---

# 10. Reporting Views

```text
Lead Funnel
Inquiry Conversion Rate
Follow-Up Due List
Counselor Performance
Source Performance
Branch Conversion Summary
Campaign Response Summary
```
