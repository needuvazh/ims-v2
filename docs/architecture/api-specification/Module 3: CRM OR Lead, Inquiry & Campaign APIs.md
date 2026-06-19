# Detailed API Contract Specification

## Module 3: CRM / Lead, Inquiry & Campaign APIs

**Version:** 1.0
**Base URL:** `/api/v1`
**Module Code:** `CRM`

---

# 1. Module Purpose

CRM APIs manage the lead lifecycle for both individual student leads and corporate leads.

This module supports:

* Lead creation
* Lead search
* Lead assignment
* Lead follow-ups
* Lead stage movement
* Lead conversion
* Lost lead tracking
* Campaign management
* CRM activity timeline
* AI-ready lead history

---

# 2. Security Requirements

All CRM APIs require authentication.

Protected APIs must enforce:

```text
Permission
Branch Scope
Assigned Lead Scope
Data Scope
```

---

# 3. Lead APIs

## 3.1 Get Leads

```http
GET /api/v1/leads
```

### Permission

```text
LEAD_VIEW
```

### Query Parameters

```text
page
limit
search
branchId
leadType
leadSourceId
leadStageId
assignedCounselorId
interestedCourseId
campaignId
status
createdFrom
createdTo
followUpFrom
followUpTo
sortBy
sortOrder
```

### Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "lead_001",
        "leadNumber": "LD-2026-00001",
        "fullName": "Ahmed Ali",
        "phone": "+96890000000",
        "email": "ahmed@example.com",
        "leadType": "Student",
        "leadSource": "WhatsApp",
        "leadStage": "New",
        "interestedCourse": "IOSH Managing Safely",
        "assignedCounselor": "Fatima",
        "nextFollowUpDate": "2026-06-20",
        "status": "Active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

## 3.2 Create Lead

```http
POST /api/v1/leads
```

### Permission

```text
LEAD_CREATE
```

### Request

```json
{
  "branchId": "br_001",
  "leadType": "Student",
  "fullName": "Ahmed Ali",
  "phone": "+96890000000",
  "email": "ahmed@example.com",
  "leadSourceId": "src_001",
  "interestedCourseId": "crs_001",
  "campaignId": "cmp_001",
  "assignedCounselorId": "usr_010",
  "priority": "Medium",
  "remarks": "Interested in weekend batch"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    "id": "lead_001",
    "leadNumber": "LD-2026-00001",
    "leadStage": "New",
    "status": "Active"
  }
}
```

### Validations

```text
Branch is required
Lead type is required
Full name is required
Phone or email is required
Lead source is required
Phone format must be valid if provided
Email format must be valid if provided
```

### Business Rules

```text
Lead number must be auto-generated
New lead defaults to New stage
Duplicate warning required for same phone or email
Lead source must be active
Interested course must be active if provided
Counselor must be active if assigned
```

### Audit

```text
LeadCreated
```

---

## 3.3 Get Lead Details

```http
GET /api/v1/leads/{leadId}
```

### Permission

```text
LEAD_VIEW
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "lead_001",
    "leadNumber": "LD-2026-00001",
    "fullName": "Ahmed Ali",
    "phone": "+96890000000",
    "email": "ahmed@example.com",
    "leadType": "Student",
    "branch": {
      "id": "br_001",
      "name": "Muscat Branch"
    },
    "leadSource": {
      "id": "src_001",
      "name": "WhatsApp"
    },
    "leadStage": {
      "id": "stage_001",
      "name": "New"
    },
    "interestedCourse": {
      "id": "crs_001",
      "name": "IOSH Managing Safely"
    },
    "assignedCounselor": {
      "id": "usr_010",
      "name": "Fatima"
    },
    "status": "Active",
    "createdAt": "2026-06-19T10:00:00Z"
  }
}
```

---

## 3.4 Update Lead

```http
PATCH /api/v1/leads/{leadId}
```

### Permission

```text
LEAD_EDIT
```

### Request

```json
{
  "fullName": "Ahmed Ali",
  "phone": "+96891111111",
  "email": "ahmed@example.com",
  "leadSourceId": "src_001",
  "interestedCourseId": "crs_002",
  "priority": "High",
  "remarks": "Updated course interest"
}
```

### Business Rules

```text
Converted leads cannot be edited except remarks by authorized users
Lost leads cannot be edited unless reopened
Changes must be audited
```

### Audit

```text
LeadUpdated
```

---

# 4. Lead Assignment APIs

## 4.1 Assign Counselor

```http
POST /api/v1/leads/{leadId}/assign
```

### Permission

```text
LEAD_ASSIGN
```

### Request

```json
{
  "assignedCounselorId": "usr_010",
  "remarks": "Assigned based on course specialization"
}
```

### Validations

```text
Assigned counselor is required
Counselor must be active
Lead must be active
```

### Business Rules

```text
Assignment history must be retained
Reassignment must be audited
Assigned counselor should receive notification
```

### Events

```text
LeadAssigned
```

---

## 4.2 Bulk Assign Leads

```http
POST /api/v1/leads/bulk-assign
```

### Permission

```text
LEAD_ASSIGN
```

### Request

```json
{
  "leadIds": ["lead_001", "lead_002"],
  "assignedCounselorId": "usr_010",
  "remarks": "Bulk assignment"
}
```

---

# 5. Lead Stage APIs

## 5.1 Change Lead Stage

```http
POST /api/v1/leads/{leadId}/change-stage
```

### Permission

```text
LEAD_EDIT
```

### Request

```json
{
  "leadStageId": "stage_003",
  "remarks": "Customer interested after phone discussion"
}
```

### Business Rules

```text
Stage change must be audited
Stage history must be retained
Won stage should allow conversion
Lost stage requires lost reason through mark-lost API
```

---

## 5.2 Mark Lead Won

```http
POST /api/v1/leads/{leadId}/mark-won
```

### Permission

```text
LEAD_MARK_WON
```

### Request

```json
{
  "remarks": "Student confirmed admission"
}
```

### Business Rules

```text
Won lead can be converted to admission
Won action must be audited
```

---

## 5.3 Mark Lead Lost

```http
POST /api/v1/leads/{leadId}/mark-lost
```

### Permission

```text
LEAD_MARK_LOST
```

### Request

```json
{
  "lostReasonId": "reason_001",
  "remarks": "Price too high"
}
```

### Validations

```text
Lost reason is required
```

### Business Rules

```text
Lost lead cannot be converted unless reopened
Lost reason must be captured for reporting
```

---

## 5.4 Reopen Lost Lead

```http
POST /api/v1/leads/{leadId}/reopen
```

### Permission

```text
LEAD_REOPEN
```

### Request

```json
{
  "remarks": "Customer contacted again"
}
```

---

# 6. Follow-Up APIs

## 6.1 Get Lead Follow-Ups

```http
GET /api/v1/leads/{leadId}/follow-ups
```

### Permission

```text
LEAD_FOLLOWUP_VIEW
```

---

## 6.2 Create Follow-Up

```http
POST /api/v1/leads/{leadId}/follow-ups
```

### Permission

```text
LEAD_FOLLOWUP_CREATE
```

### Request

```json
{
  "followUpDate": "2026-06-20",
  "followUpTime": "10:30",
  "followUpType": "Call",
  "notes": "Call to confirm course timing",
  "nextAction": "Send fee details"
}
```

### Validations

```text
Follow-up date is required
Follow-up type is required
Follow-up date cannot be in the past
```

### Business Rules

```text
Follow-up reminder must appear in counselor notification center
Follow-up must be attached to lead timeline
```

---

## 6.3 Complete Follow-Up

```http
POST /api/v1/follow-ups/{followUpId}/complete
```

### Permission

```text
LEAD_FOLLOWUP_COMPLETE
```

### Request

```json
{
  "outcome": "Interested",
  "remarks": "Student requested batch options",
  "nextFollowUpDate": "2026-06-22",
  "nextFollowUpTime": "11:00"
}
```

### Business Rules

```text
Completed follow-up cannot be edited without special permission
Outcome must be stored for AI-readiness
```

---

## 6.4 Update Follow-Up

```http
PATCH /api/v1/follow-ups/{followUpId}
```

### Permission

```text
LEAD_FOLLOWUP_EDIT
```

---

# 7. Lead Conversion APIs

## 7.1 Convert Student Lead to Admission

```http
POST /api/v1/leads/{leadId}/convert-to-admission
```

### Permission

```text
LEAD_CONVERT
```

### Request

```json
{
  "admissionDate": "2026-06-19",
  "courseId": "crs_001",
  "branchId": "br_001",
  "linkExistingStudentId": null
}
```

### Business Rules

```text
Only Won leads can be converted
Conversion creates admission record
Existing student may be linked if duplicate exists
Lead conversion must be audited
Lead remains available for reporting
```

### Response

```json
{
  "success": true,
  "message": "Lead converted to admission successfully",
  "data": {
    "leadId": "lead_001",
    "admissionId": "adm_001"
  }
}
```

---

## 7.2 Convert Corporate Lead to Corporate Customer

```http
POST /api/v1/leads/{leadId}/convert-to-corporate-customer
```

### Permission

```text
LEAD_CONVERT_CORPORATE
```

### Request

```json
{
  "companyName": "ABC Oil & Gas LLC",
  "primaryContactName": "Omar Khalid",
  "primaryContactEmail": "omar@example.com",
  "primaryContactPhone": "+96890000000"
}
```

---

# 8. Corporate Lead APIs

## 8.1 Create Corporate Lead

```http
POST /api/v1/leads/corporate
```

### Permission

```text
LEAD_CREATE
```

### Request

```json
{
  "branchId": "br_001",
  "companyName": "ABC Oil & Gas LLC",
  "industry": "Oil & Gas",
  "website": "https://example.com",
  "contactName": "Omar Khalid",
  "designation": "HR Manager",
  "phone": "+96890000000",
  "email": "omar@example.com",
  "trainingRequirement": "HSE training for employees",
  "expectedParticipants": 25,
  "expectedBudget": 2500,
  "expectedStartDate": "2026-07-01",
  "leadSourceId": "src_009",
  "assignedCounselorId": "usr_010"
}
```

### Business Rules

```text
Corporate lead may convert to corporate customer
Corporate opportunity details must be retained
```

---

# 9. Meeting APIs

## 9.1 Create Meeting

```http
POST /api/v1/leads/{leadId}/meetings
```

### Permission

```text
LEAD_MEETING_CREATE
```

### Request

```json
{
  "meetingDate": "2026-06-21",
  "meetingTime": "14:00",
  "meetingType": "OfficeMeeting",
  "location": "Muscat Branch",
  "agenda": "Discuss corporate training requirement"
}
```

---

## 9.2 Complete Meeting

```http
POST /api/v1/meetings/{meetingId}/complete
```

### Permission

```text
LEAD_MEETING_EDIT
```

### Request

```json
{
  "outcome": "ProposalRequested",
  "remarks": "Client requested commercial proposal"
}
```

---

# 10. Proposal APIs

## 10.1 Create Proposal

```http
POST /api/v1/leads/{leadId}/proposals
```

### Permission

```text
PROPOSAL_CREATE
```

### Request

```json
{
  "proposalNumber": "PROP-2026-00001",
  "proposalDate": "2026-06-19",
  "proposalValue": 2500,
  "currency": "OMR",
  "remarks": "Corporate HSE training proposal"
}
```

---

## 10.2 Update Proposal Status

```http
POST /api/v1/proposals/{proposalId}/status
```

### Permission

```text
PROPOSAL_EDIT
```

### Request

```json
{
  "status": "Accepted",
  "remarks": "Client approved proposal"
}
```

### Supported Status

```text
Draft
Submitted
Accepted
Rejected
```

---

# 11. Campaign APIs

## 11.1 Get Campaigns

```http
GET /api/v1/campaigns
```

### Permission

```text
CAMPAIGN_VIEW
```

### Query Parameters

```text
page
limit
campaignType
status
dateFrom
dateTo
search
```

---

## 11.2 Create Campaign

```http
POST /api/v1/campaigns
```

### Permission

```text
CAMPAIGN_CREATE
```

### Request

```json
{
  "campaignName": "July IOSH Campaign",
  "campaignType": "WhatsApp",
  "startDate": "2026-07-01",
  "endDate": "2026-07-31",
  "budget": 500,
  "currency": "OMR",
  "description": "Campaign for IOSH weekend batch",
  "status": "Active"
}
```

### Validations

```text
Campaign name is required
Campaign type is required
Start date is required
End date cannot be before start date
Budget cannot be negative
```

---

## 11.3 Update Campaign

```http
PATCH /api/v1/campaigns/{campaignId}
```

### Permission

```text
CAMPAIGN_EDIT
```

---

## 11.4 Get Campaign Performance

```http
GET /api/v1/campaigns/{campaignId}/performance
```

### Permission

```text
CAMPAIGN_VIEW
```

### Response

```json
{
  "success": true,
  "data": {
    "campaignId": "cmp_001",
    "leadCount": 120,
    "wonLeadCount": 30,
    "lostLeadCount": 20,
    "conversionRate": 25,
    "estimatedRevenue": 3000
  }
}
```

---

# 12. Lead Source APIs

## 12.1 Get Lead Sources

```http
GET /api/v1/lead-sources
```

### Permission

```text
LEAD_SOURCE_VIEW
```

---

## 12.2 Create Lead Source

```http
POST /api/v1/lead-sources
```

### Permission

```text
LEAD_SOURCE_CREATE
```

### Request

```json
{
  "sourceName": "Instagram",
  "description": "Instagram campaign leads",
  "status": "Active",
  "effectiveStartDate": "2026-06-19",
  "effectiveEndDate": null
}
```

---

# 13. Lead Stage APIs

## 13.1 Get Lead Stages

```http
GET /api/v1/lead-stages
```

### Permission

```text
LEAD_STAGE_VIEW
```

---

## 13.2 Create Lead Stage

```http
POST /api/v1/lead-stages
```

### Permission

```text
LEAD_STAGE_CREATE
```

### Request

```json
{
  "stageName": "Interested",
  "displayOrder": 4,
  "isWonStage": false,
  "isLostStage": false,
  "status": "Active"
}
```

---

# 14. Lost Reason APIs

## 14.1 Get Lost Reasons

```http
GET /api/v1/lost-reasons
```

### Permission

```text
LEAD_VIEW
```

---

## 14.2 Create Lost Reason

```http
POST /api/v1/lost-reasons
```

### Permission

```text
LEAD_CONFIG_EDIT
```

### Request

```json
{
  "reasonName": "Price",
  "description": "Lead lost due to price concern",
  "status": "Active"
}
```

---

# 15. Lead Timeline APIs

## 15.1 Get Lead Timeline

```http
GET /api/v1/leads/{leadId}/timeline
```

### Permission

```text
LEAD_VIEW
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2026-06-19T10:00:00Z",
      "activityType": "LeadCreated",
      "description": "Lead created by Admin User",
      "createdBy": "Admin User"
    },
    {
      "timestamp": "2026-06-19T12:00:00Z",
      "activityType": "FollowUpCreated",
      "description": "Follow-up scheduled for 2026-06-20",
      "createdBy": "Fatima"
    }
  ]
}
```

---

# 16. CRM Dashboard APIs

## 16.1 Get CRM Dashboard

```http
GET /api/v1/crm/dashboard
```

### Permission

```text
CRM_DASHBOARD_VIEW
```

### Query Parameters

```text
branchId
counselorId
dateFrom
dateTo
```

### Response

```json
{
  "success": true,
  "data": {
    "newLeads": 25,
    "todayFollowUps": 12,
    "wonLeads": 8,
    "lostLeads": 5,
    "conversionRate": 32
  }
}
```

---

# 17. Standard Business Errors

## Duplicate Lead Warning

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_LEAD_WARNING",
    "message": "A lead already exists with the same phone or email",
    "details": {
      "matchingLeadIds": ["lead_001"]
    }
  }
}
```

---

## Lead Cannot Convert

```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Only Won leads can be converted"
  }
}
```

---

## Lost Reason Required

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Lost reason is required"
  }
}
```

---

# 18. Events Published

```text
LeadCreated
LeadUpdated
LeadAssigned
LeadStageChanged
LeadMarkedWon
LeadMarkedLost
LeadReopened
FollowUpCreated
FollowUpCompleted
LeadConvertedToAdmission
CorporateLeadConvertedToCustomer
CampaignCreated
ProposalAccepted
```

---

# 19. Audit Requirements

Audit must capture:

```text
Lead create/update
Counselor assignment/reassignment
Stage change
Mark won/lost
Lead reopen
Follow-up create/complete/update
Lead conversion
Campaign create/update
Proposal create/status change
```

---

# 20. AI-Ready Data Requirements

The API layer must preserve:

```text
Lead source
Campaign reference
Follow-up history
Meeting history
Communication history
Lost reason
Conversion time
Counselor assignment history
Course interest history
```

This data will support future:

```text
AI Lead Scoring
AI Counselor Assistant
AI Course Recommendation
```

---
