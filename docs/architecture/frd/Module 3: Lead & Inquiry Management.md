# 7. Module 3: Lead & Inquiry Management

## 7.1 Business Purpose

Lead & Inquiry Management captures potential students and corporate inquiries, tracks follow-ups, manages counselor activities, and converts successful leads into admissions.

---

## 7.2 Lead Types

The system shall support:

```text
Individual
Corporate
WalkIn
```

---

## 7.3 Lead Sources

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
Corporate
```

Lead sources must be configurable.

---

## 7.4 Lead Stages

Default stages:

```text
New
Contacted
Follow-up
Interested
Demo Scheduled
Negotiation
Won
Lost
```

---

## 7.5 Screens

### LEAD-UI-001 Lead List Screen

Columns:

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

Filters:

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
```

Actions:

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

Permissions:

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

### LEAD-UI-002 Create / Edit Lead Screen

Fields:

```text
Branch
Lead Type
Full Name
Phone
Email
Interested Course
Lead Source
Campaign
Assigned Counselor
Priority
Notes
Status
```

Validations:

* Full Name is required.
* Phone or Email is required.
* Lead Source is required.
* Lead Stage is required.
* Interested Course is optional but recommended.
* Assigned Counselor is required if lead assignment is manual.

Business Rules:

* Lead number must be auto-generated.
* New lead should default to stage New.
* Duplicate lead warning should appear for same phone or email.
* User may still proceed if duplicate is confirmed by authorized user.

---

## 7.6 Functional Requirements

### FR-LEAD-001 Create Lead

The system shall allow authorized users to create leads.

### FR-LEAD-002 Lead Source Management

The system shall support configurable lead sources.

### FR-LEAD-003 Lead Stage Management

The system shall track lead progress using defined lead stages.

### FR-LEAD-004 Counselor Assignment

The system shall allow leads to be assigned to counselors.

### FR-LEAD-005 Follow-up Management

The system shall allow counselors to create and manage follow-ups.

### FR-LEAD-006 Follow-up Notification

The system shall show pending follow-up reminders in notification area.

### FR-LEAD-007 Mark Lead Won

The system shall allow authorized users to mark leads as Won.

### FR-LEAD-008 Mark Lead Lost

The system shall require lost reason when marking a lead as Lost.

### FR-LEAD-009 Convert Lead to Admission

The system shall allow Won leads to be converted into Admission.

### FR-LEAD-010 Duplicate Lead Warning

The system shall warn users if another lead exists with the same phone or email.

### FR-LEAD-011 Campaign Tracking

The system shall allow leads to be linked to campaigns.

---

## 7.7 Lead Management Reports

Phase 1 basic reports:

```text
Lead Count by Stage
Lead Count by Source
Counselor Follow-up Pending Report
Lead Conversion Report
Lost Lead Reason Report
Campaign Lead Report
```