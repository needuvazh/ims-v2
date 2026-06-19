# Detailed API Contract Specification

## Module 15: Communication Management APIs

**Version:** 1.0
**Base URL:** `/api/v1`
**Module Code:** `COM`

---

# 1. Module Purpose

Communication Management APIs centralize all system communication.

This module supports:

* Notification center
* Communication templates
* Placeholder-based template rendering
* Email communication
* SMS communication
* WhatsApp communication
* Bulk communication
* Campaign communication
* Automated communication rules
* Communication history
* Delivery tracking
* Channel usage tracking

---

# 2. Security Requirements

All Communication APIs require authentication.

Protected APIs must enforce:

```text
Permission
Branch Scope
Recipient Data Scope
Channel Access
Audit Logging
```

Marketing or bulk communication APIs must require higher-level permissions.

---

# 3. Communication Template APIs

## 3.1 Get Communication Templates

```http
GET /api/v1/communication/templates
```

### Permission

```text
COMM_TEMPLATE_VIEW
```

### Query Parameters

```text
page
limit
search
channel
messageType
language
status
sortBy
sortOrder
```

---

## 3.2 Create Communication Template

```http
POST /api/v1/communication/templates
```

### Permission

```text
COMM_TEMPLATE_CREATE
```

### Request

```json
{
  "templateCode": "FEE_DUE_SMS_EN",
  "templateName": "Fee Due SMS English",
  "channel": "SMS",
  "messageType": "Reminder",
  "language": "English",
  "subject": null,
  "templateContent": "Dear {{StudentName}}, your fee of {{DueAmount}} is due on {{DueDate}}.",
  "allowedPlaceholders": [
    "StudentName",
    "DueAmount",
    "DueDate"
  ],
  "status": "Draft"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Communication template created successfully",
  "data": {
    "templateId": "ctpl_001",
    "templateCode": "FEE_DUE_SMS_EN",
    "templateName": "Fee Due SMS English",
    "status": "Draft"
  }
}
```

### Supported Channels

```text
Notification
Email
SMS
WhatsApp
```

### Supported Languages

```text
English
Arabic
```

### Validations

```text
Template code is required
Template name is required
Channel is required
Message type is required
Language is required
Template content is required
Template code must be unique
Template placeholders must be valid
```

### Business Rules

```text
Template changes must be versioned
Inactive templates cannot be used for sending
Arabic templates must support RTL content
SMS templates should calculate character count
WhatsApp templates may require provider approval in future
```

### Audit

```text
CommunicationTemplateCreated
```

---

## 3.3 Get Template Details

```http
GET /api/v1/communication/templates/{templateId}
```

### Permission

```text
COMM_TEMPLATE_VIEW
```

---

## 3.4 Update Template

```http
PATCH /api/v1/communication/templates/{templateId}
```

### Permission

```text
COMM_TEMPLATE_EDIT
```

### Request

```json
{
  "templateName": "Fee Due SMS English Updated",
  "templateContent": "Dear {{StudentName}}, fee {{DueAmount}} is due on {{DueDate}}.",
  "allowedPlaceholders": [
    "StudentName",
    "DueAmount",
    "DueDate"
  ],
  "status": "Draft"
}
```

### Business Rules

```text
Updating active template should create a new version or require authorized override
Previously sent messages must retain rendered content history
```

---

## 3.5 Activate Template

```http
POST /api/v1/communication/templates/{templateId}/activate
```

### Permission

```text
COMM_TEMPLATE_ACTIVATE
```

---

## 3.6 Deactivate Template

```http
POST /api/v1/communication/templates/{templateId}/deactivate
```

### Permission

```text
COMM_TEMPLATE_DEACTIVATE
```

### Request

```json
{
  "reason": "Template replaced"
}
```

---

## 3.7 Preview Template

```http
POST /api/v1/communication/templates/{templateId}/preview
```

### Permission

```text
COMM_TEMPLATE_VIEW
```

### Request

```json
{
  "sampleData": {
    "StudentName": "Ahmed Ali",
    "DueAmount": "100 OMR",
    "DueDate": "2026-07-01"
  }
}
```

### Response

```json
{
  "success": true,
  "data": {
    "renderedSubject": null,
    "renderedContent": "Dear Ahmed Ali, your fee of 100 OMR is due on 2026-07-01.",
    "characterCount": 62
  }
}
```

---

# 4. Notification APIs

## 4.1 Get My Notifications

```http
GET /api/v1/notifications
```

### Permission

```text
Authenticated User
```

### Query Parameters

```text
page
limit
status
category
dateFrom
dateTo
```

---

## 4.2 Mark Notification Read

```http
POST /api/v1/notifications/{notificationId}/mark-read
```

### Permission

```text
Authenticated User
```

### Business Rules

```text
User can mark only own notification as read
```

---

## 4.3 Mark Notification Unread

```http
POST /api/v1/notifications/{notificationId}/mark-unread
```

### Permission

```text
Authenticated User
```

---

## 4.4 Archive Notification

```http
POST /api/v1/notifications/{notificationId}/archive
```

### Permission

```text
Authenticated User
```

---

## 4.5 Create System Notification

```http
POST /api/v1/notifications
```

### Permission

```text
NOTIFICATION_CREATE
```

### Request

```json
{
  "recipientUserIds": ["usr_001", "usr_002"],
  "category": "Finance",
  "title": "Fee Payment Due",
  "message": "Fee payment is due tomorrow",
  "referenceType": "Enrollment",
  "referenceId": "enr_001"
}
```

---

# 5. Email APIs

## 5.1 Send Email

```http
POST /api/v1/communication/send-email
```

### Permission

```text
EMAIL_SEND
```

### Request

```json
{
  "recipients": [
    {
      "recipientType": "Student",
      "recipientId": "std_001",
      "email": "student@example.com"
    }
  ],
  "cc": [],
  "bcc": [],
  "templateId": "ctpl_001",
  "subject": "Fee Due Reminder",
  "message": "Dear Ahmed, your fee is due.",
  "attachments": [],
  "referenceType": "Enrollment",
  "referenceId": "enr_001"
}
```

### Business Rules

```text
Email address must be valid
Template or message is required
Rendered message must be stored in communication history
Delivery status must be tracked
```

---

# 6. SMS APIs

## 6.1 Send SMS

```http
POST /api/v1/communication/send-sms
```

### Permission

```text
SMS_SEND
```

### Request

```json
{
  "recipients": [
    {
      "recipientType": "Student",
      "recipientId": "std_001",
      "mobileNumber": "+96890000000"
    }
  ],
  "templateId": "ctpl_001",
  "message": "Dear Ahmed, your fee is due.",
  "referenceType": "Enrollment",
  "referenceId": "enr_001"
}
```

### Validations

```text
At least one recipient is required
Mobile number is required
Template or message is required
```

### Business Rules

```text
SMS consumption must be tracked
Rendered message must be stored
Delivery status must be tracked
```

---

# 7. WhatsApp APIs

## 7.1 Send WhatsApp Message

```http
POST /api/v1/communication/send-whatsapp
```

### Permission

```text
WHATSAPP_SEND
```

### Request

```json
{
  "recipients": [
    {
      "recipientType": "Lead",
      "recipientId": "lead_001",
      "mobileNumber": "+96890000000"
    }
  ],
  "templateId": "ctpl_001",
  "message": "Dear Ahmed, thank you for your inquiry.",
  "attachments": [],
  "referenceType": "Lead",
  "referenceId": "lead_001"
}
```

### Business Rules

```text
WhatsApp sending depends on channel configuration
Provider-specific details must remain inside integration adapter
Delivery status must be tracked
Rendered message must be stored
```

---

# 8. Bulk Communication APIs

## 8.1 Preview Bulk Recipients

```http
POST /api/v1/communication/bulk/preview
```

### Permission

```text
BULK_COMMUNICATION_VIEW
```

### Request

```json
{
  "audienceType": "Students",
  "filters": {
    "branchId": "br_001",
    "courseId": "crs_001",
    "batchId": "bat_001",
    "status": "Active"
  }
}
```

### Response

```json
{
  "success": true,
  "data": {
    "recipientCount": 120,
    "sampleRecipients": [
      {
        "recipientId": "std_001",
        "name": "Ahmed Ali",
        "mobileNumber": "+96890000000",
        "email": "ahmed@example.com"
      }
    ]
  }
}
```

---

## 8.2 Send Bulk Message

```http
POST /api/v1/communication/bulk/send
```

### Permission

```text
BULK_COMMUNICATION_SEND
```

### Request

```json
{
  "channel": "SMS",
  "audienceType": "Students",
  "filters": {
    "branchId": "br_001",
    "courseId": "crs_001",
    "batchId": "bat_001",
    "status": "Active"
  },
  "templateId": "ctpl_001",
  "message": null,
  "referenceType": "Campaign",
  "referenceId": "camp_001"
}
```

### Business Rules

```text
Recipient preview should be available before sending
Large bulk messages should be queued
Duplicate recipients should be removed
Bulk sending must be audited
```

---

# 9. Campaign Communication APIs

## 9.1 Get Communication Campaigns

```http
GET /api/v1/communication/campaigns
```

### Permission

```text
COMM_CAMPAIGN_VIEW
```

---

## 9.2 Create Communication Campaign

```http
POST /api/v1/communication/campaigns
```

### Permission

```text
COMM_CAMPAIGN_CREATE
```

### Request

```json
{
  "campaignName": "July IOSH Campaign",
  "campaignType": "CoursePromotion",
  "channel": "WhatsApp",
  "audienceType": "Leads",
  "templateId": "ctpl_001",
  "scheduledAt": "2026-07-01T10:00:00Z",
  "filters": {
    "leadSourceId": "src_001",
    "interestedCourseId": "crs_001"
  },
  "status": "Draft"
}
```

---

## 9.3 Schedule Campaign

```http
POST /api/v1/communication/campaigns/{campaignId}/schedule
```

### Permission

```text
COMM_CAMPAIGN_SCHEDULE
```

---

## 9.4 Start Campaign

```http
POST /api/v1/communication/campaigns/{campaignId}/start
```

### Permission

```text
COMM_CAMPAIGN_START
```

---

## 9.5 Stop Campaign

```http
POST /api/v1/communication/campaigns/{campaignId}/stop
```

### Permission

```text
COMM_CAMPAIGN_STOP
```

### Request

```json
{
  "reason": "Campaign stopped by admin"
}
```

---

## 9.6 Get Campaign Delivery Summary

```http
GET /api/v1/communication/campaigns/{campaignId}/delivery-summary
```

### Permission

```text
COMM_CAMPAIGN_VIEW
```

---

# 10. Automated Communication Rule APIs

## 10.1 Get Automation Rules

```http
GET /api/v1/communication/automation-rules
```

### Permission

```text
COMM_RULE_VIEW
```

---

## 10.2 Create Automation Rule

```http
POST /api/v1/communication/automation-rules
```

### Permission

```text
COMM_RULE_CREATE
```

### Request

```json
{
  "ruleName": "Installment Due Reminder",
  "triggerEvent": "InstallmentDue",
  "channels": ["Notification", "SMS"],
  "templateIds": {
    "Notification": "ctpl_001",
    "SMS": "ctpl_002"
  },
  "enabled": true,
  "offsetDays": -1
}
```

### Business Rules

```text
Rule trigger event must be supported
Each selected channel must have active template
Automation execution must create communication logs
```

---

## 10.3 Update Automation Rule

```http
PATCH /api/v1/communication/automation-rules/{ruleId}
```

### Permission

```text
COMM_RULE_EDIT
```

---

## 10.4 Enable Automation Rule

```http
POST /api/v1/communication/automation-rules/{ruleId}/enable
```

### Permission

```text
COMM_RULE_EDIT
```

---

## 10.5 Disable Automation Rule

```http
POST /api/v1/communication/automation-rules/{ruleId}/disable
```

### Permission

```text
COMM_RULE_EDIT
```

---

# 11. Communication Logs APIs

## 11.1 Get Communication Logs

```http
GET /api/v1/communication/logs
```

### Permission

```text
COMM_LOG_VIEW
```

### Query Parameters

```text
page
limit
channel
recipientType
recipientId
referenceType
referenceId
status
dateFrom
dateTo
sortBy
sortOrder
```

---

## 11.2 Get Communication Log Details

```http
GET /api/v1/communication/logs/{logId}
```

### Permission

```text
COMM_LOG_VIEW
```

---

## 11.3 Resend Communication

```http
POST /api/v1/communication/logs/{logId}/resend
```

### Permission

```text
COMMUNICATION_RESEND
```

### Request

```json
{
  "reason": "Previous delivery failed"
}
```

---

# 12. Delivery Webhook APIs

## 12.1 SMS Delivery Webhook

```http
POST /api/v1/webhooks/sms/delivery-status
```

### Permission

```text
Provider Signed Webhook
```

---

## 12.2 WhatsApp Delivery Webhook

```http
POST /api/v1/webhooks/whatsapp/delivery-status
```

### Permission

```text
Provider Signed Webhook
```

---

## 12.3 Email Delivery Webhook

```http
POST /api/v1/webhooks/email/delivery-status
```

### Permission

```text
Provider Signed Webhook
```

### Business Rules

```text
Webhook signatures must be verified
Provider payload must be converted through integration adapter
Communication log status must be updated
```

---

# 13. Usage Dashboard APIs

## 13.1 Get Communication Usage

```http
GET /api/v1/communication/usage
```

### Permission

```text
COMM_USAGE_VIEW
```

### Query Parameters

```text
channel
dateFrom
dateTo
groupBy
```

### Response

```json
{
  "success": true,
  "data": {
    "smsSent": 1000,
    "whatsappSent": 800,
    "emailsSent": 500,
    "failedDeliveries": 25
  }
}
```

---

# 14. Student Portal Communication APIs

## 14.1 Get My Notifications

```http
GET /api/v1/student-portal/me/notifications
```

### Permission

```text
Authenticated Student
```

---

## 14.2 Get My Communication History

```http
GET /api/v1/student-portal/me/communication-history
```

### Permission

```text
Authenticated Student
```

---

# 15. Business Error Examples

## Invalid Placeholder

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PLACEHOLDER",
    "message": "Template contains unsupported placeholder"
  }
}
```

## Channel Not Enabled

```json
{
  "success": false,
  "error": {
    "code": "CHANNEL_NOT_ENABLED",
    "message": "SMS channel is not enabled"
  }
}
```

## No Recipients Found

```json
{
  "success": false,
  "error": {
    "code": "NO_RECIPIENTS_FOUND",
    "message": "No recipients matched the selected filters"
  }
}
```

---

# 16. Events Published

```text
CommunicationTemplateCreated
CommunicationTemplateUpdated
CommunicationTemplateActivated
NotificationCreated
EmailQueued
SmsQueued
WhatsAppQueued
CommunicationSent
CommunicationDelivered
CommunicationFailed
BulkCommunicationQueued
CampaignCreated
CampaignScheduled
CampaignStarted
CampaignStopped
AutomationRuleCreated
AutomationRuleTriggered
CommunicationResent
```

---

# 17. Audit Requirements

Audit must capture:

```text
Template create/update/activate/deactivate
Manual email/SMS/WhatsApp send
Bulk communication send
Campaign create/schedule/start/stop
Automation rule create/update/enable/disable
Communication resend
Delivery webhook processing failures
```

---

# 18. Integration Points

Consumes:

```text
CRM
Admissions
Enrollment
Finance
Attendance
Completion
Certificates
Documents
Corporate Training
Identity & Access
```

Provides data to:

```text
Notification Center
Communication Reports
Campaign Reports
Audit
Future AI Counselor Assistant
```

---
