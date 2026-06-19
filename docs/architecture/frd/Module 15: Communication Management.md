# Functional Requirement Document

## Module 15: Communication Management

**Version:** 1.1
**Module Code:** COM
**Phase:** Phase 2
**Owned Bounded Context:** Communication Management

**Dependencies:**

* Identity & Access Management
* Lead, Inquiry & CRM Management
* Admission & Enrollment Management
* Fee & Finance Management
* Certificate Management
* Audit & Compliance
* External Messaging Adapters

**Provides Data To:**

* All Business Modules
* Student Portal
* Trainer Portal
* Corporate Portal
* Reporting & Dashboard Management

---

# 1. Business Purpose

Communication Management creates, schedules, sends, tracks, and audits messages that originate from institute business events.

The context owns templates, notification logs, and system notifications. Channel delivery is executed through external adapters, but communication intent and history remain owned here.

---

# 2. Scope

## 2.1 In Scope

* Template management
* System notifications
* Operational messaging
* Transactional messaging
* Reminder messaging
* Delivery tracking
* Message history
* Communication audit trail

## 2.2 Out of Scope for Phase 1

* Full marketing automation
* AI-generated content
* Two-way conversational chatbot
* Campaign attribution engine

---

# 3. Owned Concepts

The Communication context owns:

* CommunicationTemplate
* CommunicationLog
* SystemNotification

Optional supporting records may include delivery attempts and recipient preferences, but the owning message state remains inside this context.

---

# 4. Business Principles

* Communication must be triggered by a business event or an explicit approved action.
* A template must be active for its channel before it can be used for dispatch.
* Message history must retain the original payload and delivery outcome.
* User preferences and branch rules must be respected where applicable.
* External delivery failures must not delete the original communication record.
* Sensitive content must be minimized in logs.
* Notification visibility in the UI does not replace channel delivery history.

---

# 5. Business Model

## 5.1 Communication Types

```text
Transactional
Operational
Reminder
Alert
Notification
Approval Request
```

## 5.2 Communication Channels

Phase 1:

```text
System Notification
Email
SMS
WhatsApp
```

Future:

```text
Push Notification
Voice Call
Chatbot
```

## 5.3 Template Lifecycle

```text
Draft
  ↓
Active
  ↓
Inactive
  ↓
Archived
```

## 5.4 Communication Lifecycle

```text
Draft
  ↓
Queued
  ↓
Sent
```

Alternative:

```text
Queued
  ↓
Failed
```

```text
Sent
  ↓
Delivered
```

```text
Delivered
  ↓
Read
```

## 5.5 System Notification Lifecycle

```text
Created
  ↓
Visible
  ↓
Read
  ↓
Dismissed
```

---

# 6. Screens

## COM-UI-001 Communication Dashboard

### Widgets

```text
Messages Sent Today
Failed Messages
Pending Queue
Unread Notifications
Template Usage
Channel Usage
```

### Filters

```text
Channel
Type
Status
Date Range
Branch
Module
```

## COM-UI-002 Template List

### Columns

```text
Template Code
Template Name
Channel
Message Type
Language
Status
Actions
```

### Actions

```text
Create Template
Edit Template
Preview
Activate
Deactivate
Archive
```

## COM-UI-003 Template Editor

### Fields

```text
Template Code
Template Name
Channel
Language
Message Type
Subject
Body
Status
```

## COM-UI-004 Communication Log

### Columns

```text
Communication Number
Recipient
Channel
Type
Status
Created At
Sent At
Actions
```

### Actions

```text
View
Resend
Mark Read
Export
```

---

# 7. Functional Requirements

* The system shall allow authorized users to configure templates by channel, language, and type.
* The system shall allow business events to enqueue communications through the communication service.
* The system shall record send, delivery, read, and failure outcomes.
* The system shall support system notifications inside the application.
* The system shall support Arabic and English templates where required.
* The system shall respect opt-in, opt-out, and branch visibility rules where configured.
* The system shall allow retry only through controlled application flow.
* The system shall keep the original template snapshot used for each communication.

---

# 8. Audit Events

The module shall emit audit events for:

```text
CommunicationTemplateCreated
CommunicationTemplateUpdated
CommunicationQueued
CommunicationSent
CommunicationDelivered
CommunicationFailed
SystemNotificationCreated
SystemNotificationRead
SystemNotificationDismissed
```

---

# 9. Domain Errors

```text
TEMPLATE_INACTIVE
TEMPLATE_NOT_FOUND
CHANNEL_NOT_AVAILABLE
RECIPIENT_OPTED_OUT
COMMUNICATION_ALREADY_SENT
COMMUNICATION_RETRY_NOT_ALLOWED
COMMUNICATION_PAYLOAD_INVALID
```

---

# 10. Reporting Views

```text
Channel Usage
Message Delivery Success Rate
Failed Delivery Queue
Template Effectiveness
Unread Notification Count
Branch Communication Summary
```
