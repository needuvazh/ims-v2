Excellent. Since this is a **greenfield product** and we have completed most of the discovery, the BRD should be written at the **business level**, not at the database or API level.

---

# Business Requirements Document (BRD)

## Institute Management System (IMS)

### Version 1.0

### Status: Draft

### Client: Al Saud International (Initial Implementation)

### Prepared By: Product Discovery Phase

### Target Market: Oman Training & Coaching Institutes

---

# 1. Document Purpose

The purpose of this document is to define the business requirements for a centralized Institute Management System (IMS) that will replace manual and spreadsheet-based operations currently used by training institutes.

The system will provide a unified platform to manage:

* Lead Management
* Student Admissions
* Student Lifecycle
* Corporate Training
* Course Management
* Batch Scheduling
* Attendance
* Fees & Finance
* Communication
* Certificates
* Reporting

---

# 2. Business Problem Statement

Currently training institutes rely on:

* Excel Sheets
* Google Sheets
* WhatsApp
* Paper Registers
* Manual Fee Tracking
* Manual Attendance

This causes:

### Operational Issues

* Duplicate student records
* Missed follow-ups
* Lost leads
* Manual attendance errors
* Fee collection tracking issues
* Lack of corporate training visibility
* Difficulty generating reports

### Management Issues

* No centralized dashboard
* Limited branch visibility
* Poor counselor performance tracking
* No lead conversion insights
* No auditability

---

# 3. Business Objectives

The system shall:

### BO-001

Centralize institute operations in a single platform.

### BO-002

Improve lead conversion rates.

### BO-003

Reduce manual administration effort.

### BO-004

Provide complete student lifecycle management.

### BO-005

Support both Individual and Corporate Training models.

### BO-006

Provide management visibility through dashboards and reports.

### BO-007

Support future AI-driven decision making.

---

# 4. Project Scope

## In Scope

### Administration

* User Management
* Dynamic Role Management
* Permission Management

### Organization

* Branch Management
* Department Management

### CRM

* Inquiry Management
* Lead Tracking
* Follow-up Management

### Students

* Admissions
* Student Management
* Student Documents

### Corporate

* Corporate Customer Management
* Corporate Employee Management
* Corporate Contracts

### Academics

* Courses
* Batches
* Timetables
* Attendance

### Finance

* Fees
* Discounts
* Installments
* Refunds
* Receipts

### Communication

* Email
* SMS
* WhatsApp

### Certificates

* Certificate Generation
* QR Verification

### Reporting

* Operational Reports
* Executive Dashboards

---

## Out of Scope (Current Release)

### SaaS Features

* Tenant Management
* Subscription Management
* Multi-Tenant Billing

### CMS Features

* Website Builder
* Landing Page Management
* Public CMS

### Future Features

* Mobile Apps
* AI Features
* QR Attendance beyond the approved biometric/RFID integration design

### In Scope for Architecture, Phased for Delivery

* Biometric/RFID attendance synchronization is in architectural scope because attendance reliability affects operational records, absence alerts, and completion eligibility. Delivery may be phased, but the design must include offline buffering, idempotent sync, and auditability.
* Tally ERP synchronization is in architectural scope because financial reconciliation affects receipts, refunds, corporate invoices, and audit readiness. Delivery may be phased, but finance events must be captured through an outbox-ready integration design.

---

# 5. Stakeholders

| Stakeholder           | Responsibility        |
| --------------------- | --------------------- |
| Institute Owner       | Business Owner        |
| Branch Manager        | Branch Operations     |
| Counselor             | Lead Management       |
| Faculty               | Training Delivery     |
| Accountant            | Financial Operations  |
| Corporate Coordinator | Corporate Training    |
| Student               | Training Participant  |
| Management Team       | Reporting & Analytics |

---

# 6. User Roles

## Owner

Can access:

* Entire System
* Reports
* Financial Data

---

## Branch Manager

Can access:

* Branch Operations
* Students
* Attendance
* Reports

---

## Counselor

Can access:

* Leads
* Admissions
* Follow-ups

---

## Faculty

Can access:

* Assigned Batches
* Attendance
* Timetable

---

## Accountant

Can access:

* Fees
* Discounts
* Refunds
* Receipts

---

## Student

Can access:

* Profile
* Attendance
* Certificates
* Fees
* Timetable

---

# 7. Functional Requirements

---

# FR-01 User Management

The system shall allow administrators to:

* Create users
* Edit users
* Disable users
* Reset passwords

---

# FR-02 Dynamic Role Management

The system shall allow:

* Role creation
* Permission assignment
* Menu assignment
* Report assignment

No hardcoded roles shall exist.

---

# FR-03 Branch Management

The system shall allow:

* Create Branch
* Update Branch
* Deactivate Branch

---

# FR-04 Department Management

The system shall allow grouping of courses under departments.

Examples:

* IT
* Safety
* Language
* Corporate Training

---

# FR-05 Lead Management

The system shall support:

### Lead Sources

* Walk-in
* Website
* WhatsApp
* Phone
* Referral
* Corporate

### Lead Stages

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

### Follow-up Management

* Next Follow-up Date
* Notes
* Reminders

---

# FR-06 Admission Management

The system shall support:

* Student Registration
* Document Collection
* Admission Approval
* Enrollment

---

# FR-07 Student Management

The system shall maintain:

### Student Profile

* Personal Information
* Contact Information
* Emergency Contacts

### Student Status

```text
Inquiry
Applied
Admitted
Active
Completed
Dropped
Transferred
Suspended
Alumni
```

---

# FR-08 Corporate Customer Management

The system shall support:

### Corporate Profiles

* Company Details
* Contact Persons

### Corporate Contracts

* Contract Value
* Start Date
* End Date
* Renewal Date

### Corporate Employees

* Employee Enrollment
* Attendance Tracking

---

# FR-09 Course Management

The system shall support:

### Course Types

* Individual
* Corporate
* Weekend
* Fast Track
* One-to-One

### Duration Types

* Fixed Duration
* Hour Based
* Session Based

---

# FR-10 Batch Management

The system shall support:

### Batch Features

* Batch Capacity
* Waiting List
* Multiple Trainers

---

# FR-11 Timetable Management

The system shall support:

* Batch Scheduling
* Classroom Allocation
* Lab Allocation

### Conflict Detection

Prevent:

* Trainer Overlap
* Classroom Overlap
* Batch Overlap

---

# FR-12 Attendance Management

The system shall allow faculty to:

* Mark Attendance
* Update Attendance

Attendance reports shall be generated.

---

# FR-13 Fee Management

The system shall support:

### Fee Models

* One-Time
* Installments

### Discounts

* Fixed Amount
* Percentage
* Scholarship
* Referral
* Corporate
* Early Bird

### Refunds

* Full Refund
* Partial Refund

---

# FR-14 Communication Module

The system shall support:

### Channels

* Email
* SMS
* WhatsApp

### Features

* Templates
* Placeholders
* Notifications
* Campaigns

---

# FR-15 Certificate Management

The system shall support:

### Auto Certificate Generation

Based on configurable rules.

### Eligibility Rules

* Attendance
* Completion
* Exam Pass
* Approval

### Verification

* QR Verification
* Public Verification Page

---

# FR-16 Document Management

The system shall support:

### Student Documents

Tenant-configurable document types.

### Approval Workflow

```text
Uploaded
Pending Verification
Approved
Rejected
```

---

# FR-17 Reporting & Dashboard

The system shall provide:

### Operational Reports

* Student Strength
* Attendance
* Fee Collection
* Outstanding Fees

### Business Reports

* Lead Conversion
* Corporate Revenue
* Branch Performance
* Counselor Performance
* Faculty Utilization

---

# 8. Non-Functional Requirements

## Performance

System shall support:

* 1000+ Students
* 200+ Staff
* 20 Branches

---

## Security

System shall provide:

* Password Encryption
* Role-Based Access
* Audit Logs

---

## Auditability

Track:

* Fee Changes
* Attendance Changes
* Student Updates
* Refund Approvals

---

## Localization

Support:

* English
* Arabic
* RTL Layout

---

## Availability

Target uptime:

```text
99.5%
```

---

# 9. Success Metrics

The project will be considered successful if:

### Lead Management

* 100% leads captured

### Admissions

* Admission processing time reduced by 70%

### Attendance

* Manual register elimination

### Finance

* Fee collection visibility increased to 100%

### Reporting

* Real-time management dashboards available

---

# 10. Future Roadmap

## Phase 2

* Payroll
* Corporate Portal
* Advanced Reports
* Document Workflows

## Phase 3

* Payment Gateway
* WhatsApp Integration
* SMS Integration
* Biometric Integration implementation over the approved offline gateway design
* Tally Integration implementation over the approved outbox and reconciliation design

## Phase 4

* AI Counselor Assistant
* AI Lead Scoring
* AI Training Analytics
* AI Business Forecasting

---

# 11. Review Alignment Addendum

This addendum incorporates the architecture evaluation findings for the ASTI IMS documentation set.

## B2B Corporate Training Requirements

Corporate training is not a generic student enrollment extension. The business requires a dedicated Corporate Training bounded context for corporate accounts, contacts, contracts, programs, participants, negotiated pricing, credit limits, and consolidated billing.

The system shall enforce the following invariant before confirming a corporate cohort or participant group:

```text
availableCredit = creditLimit - (unpaidBalance + committedUninvoicedValue)
estimatedEnrollmentCost <= availableCredit
```

If the invariant fails, the system shall block confirmation or route the request to an explicit approval workflow once ASTI confirms the preferred policy.

## Compliance and Document Expiry Requirements

The system shall track expiry dates for critical documents such as Civil ID, visa, passport, staff contract, trainer credential, student identity document, and certificate-related documents where applicable.

The system shall support proactive reminders at configurable intervals such as 90, 60, and 30 days before expiry. Critical expired documents may place the relevant student, trainer, or staff account into compliance hold when configured by policy.

## Bilingual Data Requirements

Bilingual English and Arabic support applies to UI labels, notification templates, certificate templates, course/catalog metadata, and public verification text. Domain records that need localized names or descriptions shall use a structured localization strategy such as JSON fields with `en` and `ar` keys or translation tables where search/indexing requires it.

## Offline Attendance and Tally Reliability

Biometric attendance integrations shall use a local campus gateway with durable buffering and idempotent event IDs. Financial integrations such as Tally ERP shall use transactional outbox records and retry/reconciliation logs. Direct dual writes from business transactions to external systems are prohibited.
