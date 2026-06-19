# Functional Requirement Document (FRD)

## Module 19: Lead, Inquiry & CRM Management

**Version:** 1.0
**Module Code:** CRM

**Dependencies:**

* Communication Management
* Identity & Access Management
* Course Management
* Corporate Training Management

**Provides Data To:**

* Student Admissions
* Corporate Customer Management
* Reporting & Analytics
* Future AI Lead Scoring
* Future AI Counselor Assistant

---

# 1. Business Purpose

Lead, Inquiry & CRM Management is responsible for managing prospective students and corporate customers throughout the sales lifecycle.

The module shall support:

* Lead Management
* Inquiry Management
* Follow-Up Tracking
* Counselor Assignment
* Lead Pipeline
* Campaign Tracking
* Corporate Lead Management
* Lead Conversion
* CRM Activities
* Lead Analytics

---

# 2. CRM Architecture

## Student Lead Flow

```text
Lead
 ↓
Inquiry
 ↓
Follow-Up
 ↓
Interested
 ↓
Admission
 ↓
Student
```

---

## Corporate Lead Flow

```text
Corporate Lead
      ↓
Prospect
      ↓
Meeting
      ↓
Proposal
      ↓
Negotiation
      ↓
Won
      ↓
Corporate Customer
```

---

# 3. Lead Sources

The system shall support:

```text
Walk-In
Phone Call
Website
WhatsApp
Facebook
Instagram
Google Ads
Referral
Corporate Lead
```

---

### Business Rules

* Sources configurable.
* New sources may be added.

---

# 4. Lead Lifecycle

## Student Lead

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

Alternative

```text
Interested
 ↓
Lost
```

---

## Corporate Lead

```text
New
 ↓
Meeting Scheduled
 ↓
Proposal Submitted
 ↓
Negotiation
 ↓
Won
```

---

# 5. Screens

## CRM-UI-001 Lead Dashboard

### Purpose

Provide lead overview.

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
Course
Counselor
Source
Date Range
```

---

# 6. Lead Management

## CRM-UI-002 Lead List

### Columns

```text
Lead Number
Lead Name
Lead Type
Source
Course
Counselor
Status
Created Date
Actions
```

### Lead Types

```text
Student Lead
Corporate Lead
```

### Actions

```text
Create Lead
View Lead
Edit Lead
Assign Counselor
Convert
Mark Lost
```

### Permissions

```text
LEAD_VIEW
LEAD_CREATE
LEAD_EDIT
LEAD_ASSIGN
LEAD_CONVERT
```

---

# 7. Create Lead

## CRM-UI-003 Lead Screen

### Personal Information

Fields

```text
Lead Number
First Name
Last Name
Mobile Number
Email
Nationality
```

---

### Inquiry Information

Fields

```text
Interested Course
Preferred Branch
Lead Source
Lead Status
```

---

### Additional Information

Fields

```text
Budget
Expected Start Date
Remarks
```

---

### Business Rules

* Lead Number auto-generated.
* Duplicate detection enabled.
* Mobile Number preferred unique identifier.

---

# 8. Corporate Lead Management

## CRM-UI-004 Corporate Lead Screen

### Company Information

Fields

```text
Company Name
Industry
Website
```

---

### Contact Person

Fields

```text
Contact Name
Designation
Mobile
Email
```

---

### Opportunity Information

Fields

```text
Training Requirement
Expected Participants
Expected Budget
Expected Start Date
```

---

### Business Rules

* Corporate lead may become corporate customer.
* Multiple opportunities supported.

---

# 9. Counselor Assignment

## CRM-UI-005 Assignment Screen

### Assignment Rules

Supported:

```text
Manual Assignment
Branch Based
Course Based
Round Robin
```

---

### Fields

```text
Counselor
Assignment Date
Remarks
```

---

### Business Rules

* Reassignment tracked.
* Assignment history retained.

---

# 10. Follow-Up Management

## CRM-UI-006 Follow-Up Screen

### Fields

```text
Lead
Follow-Up Date
Follow-Up Time
Activity Type
Remarks
Outcome
```

---

### Activity Types

```text
Call
Meeting
WhatsApp
SMS
Email
Walk-In Visit
```

---

### Outcomes

```text
Interested
Not Interested
Follow-Up Required
Proposal Requested
```

---

### Business Rules

* Follow-up date mandatory.
* History retained.
* Notifications generated.

---

# 11. Lead Activity Timeline

## CRM-UI-007 Lead Timeline

### Activities

```text
Lead Created
Call Logged
Meeting Conducted
WhatsApp Sent
Email Sent
Status Changed
```

---

### Business Rules

* Timeline immutable.
* Activities ordered chronologically.

---

# 12. Lead Conversion

## CRM-UI-008 Convert Lead

### Student Lead

Convert to:

```text
Student Admission
```

---

### Corporate Lead

Convert to:

```text
Corporate Customer
```

---

### Business Rules

* Conversion creates related entity.
* Conversion history retained.
* Lead remains available for reporting.

---

# 13. Lost Lead Management

## CRM-UI-009 Lost Lead Screen

### Fields

```text
Lost Reason
Remarks
```

---

### Reasons

```text
Price
Competitor
No Response
Course Not Available
Timing Issue
Other
```

---

### Business Rules

* Lost reason mandatory.
* Lost analysis available in reports.

---

# 14. Meeting Management

## CRM-UI-010 Meeting Tracker

### Fields

```text
Lead
Meeting Date
Meeting Type
Location
Outcome
```

---

### Meeting Types

```text
Phone Meeting
Office Meeting
Customer Site Visit
Online Meeting
```

---

### Business Rules

* Meeting history retained.
* Meeting outcomes tracked.

---

# 15. Proposal Tracking

## CRM-UI-011 Proposal Tracker

### Applicable To

```text
Corporate Leads
```

---

### Fields

```text
Proposal Number
Proposal Date
Proposal Value
Status
```

---

### Status

```text
Draft
Submitted
Accepted
Rejected
```

---

### Business Rules

* Multiple proposals supported.
* Proposal history retained.

---

# 16. Campaign Tracking

## CRM-UI-012 Campaign Management

### Fields

```text
Campaign Name
Campaign Type
Start Date
End Date
Budget
Status
```

---

### Campaign Types

```text
Facebook
Google Ads
WhatsApp
Email
Referral
Events
```

---

### Business Rules

* Leads linked to campaigns.
* Campaign performance measurable.

---

# 17. Lead Analytics Dashboard

## CRM-UI-013 Analytics

### KPIs

```text
Total Leads
Won Leads
Lost Leads
Conversion Rate
Average Conversion Time
```

---

### Charts

```text
Lead Source Distribution
Conversion Funnel
Counselor Performance
Campaign Performance
```

---

# 18. Counselor Dashboard

## CRM-UI-014 Counselor View

### KPIs

```text
Assigned Leads
Pending Follow-Ups
Today's Follow-Ups
Won Leads
Conversion Rate
```

---

### Future AI Widget

```text
Suggested Next Follow-Up
```

---

# 19. AI Readiness Requirements

Store:

```text
Lead History
Follow-Up History
Communication History
Meeting Outcomes
Lost Reasons
Conversion Time
```

---

### Future AI Features

```text
Lead Scoring
Conversion Prediction
Course Recommendation
Counselor Assistant
```

---

# 20. Functional Requirements

## FR-CRM-001 Lead Management

The system shall support lead management.

---

## FR-CRM-002 Corporate Lead Management

The system shall support corporate lead management.

---

## FR-CRM-003 Lead Assignment

The system shall support counselor assignment.

---

## FR-CRM-004 Follow-Up Tracking

The system shall support follow-up management.

---

## FR-CRM-005 Activity Tracking

The system shall support lead activity tracking.

---

## FR-CRM-006 Lead Conversion

The system shall support lead conversion.

---

## FR-CRM-007 Lost Lead Analysis

The system shall support lost lead tracking.

---

## FR-CRM-008 Meeting Tracking

The system shall support meeting management.

---

## FR-CRM-009 Proposal Tracking

The system shall support proposal management.

---

## FR-CRM-010 Campaign Tracking

The system shall support campaign tracking.

---

## FR-CRM-011 Lead Analytics

The system shall provide CRM analytics.

---

## FR-CRM-012 AI Data Collection

The system shall store AI-ready CRM data.

---

# 21. Notifications

### Follow-Up Due

Notify:

```text
Assigned Counselor
```

---

### Lead Assigned

Notify:

```text
Assigned Counselor
```

---

### Lead Converted

Notify:

```text
Branch Manager
Counselor
```

---

### Proposal Accepted

Notify:

```text
Sales Manager
Corporate Coordinator
```

---

# 22. Reports

## Lead Reports

```text
Lead Source Report
Lead Conversion Report
Lead Funnel Report
Lost Lead Report
```

---

## Counselor Reports

```text
Counselor Performance
Follow-Up Report
Conversion Report
```

---

## Campaign Reports

```text
Campaign Performance
Lead Acquisition Report
Lead Source ROI
```

---

## Corporate Reports

```text
Corporate Lead Report
Proposal Report
Corporate Conversion Report
```

---

# 23. Audit Requirements

Audit:

```text
Lead Created
Lead Updated
Lead Assigned
Follow-Up Added
Status Changed
Lead Converted
Proposal Submitted
Proposal Accepted
```

Capture:

```text
User
Timestamp
Action
Old Value
New Value
Remarks
```

---

# 24. Critical Design Decisions

### Lead As Aggregate Root

Recommended:

```text
Lead
 ↓
Activities
 ↓
Follow-Ups
 ↓
Meetings
 ↓
Communications
```

---

### Lead Conversion

Never delete leads.

Use:

```text
Lead
 ↓
Converted Entity
```

relationship.

---

### Activity Timeline

Recommended:

```text
Immutable Timeline
```

for complete sales history.

---

### AI-Ready CRM

Capture every interaction.

Reason:

Future AI features depend on historical lead behavior.

---

# 25. Integration Points

### Consumes

```text
Communication Management
Course Management
Identity Management
```

### Provides Data To

```text
Admissions
Corporate Training
Reporting
AI Lead Scoring
AI Counselor Assistant
```
