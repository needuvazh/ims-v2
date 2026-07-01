# Domain-Driven Design Context Map + Business Domains

## ASTI Integrated Institute Management System (IMS)

**Version:** 3.0
**Scope:** Single-client implementation for Al Saud Training Institute (ASTI)
**Primary Business Focus:** Coaching center, skill training institute, individual training, corporate training, walk-in enrollment, finance & receivables, certificate verification, and digital experience
**Architecture Style:** Next.js monorepo modular architecture
**Current Decision:** Single-client first. SaaS tenant setup is excluded. Initial implementation will focus on a single admin portal application.
**Website Decision:** Website is static content with dynamic course data. No CMS editing is required in the current version.
**Future Phase:** HRMS, ESS, Payroll, Tally Integration, Biometric Attendance, and AI Intelligence are retained as future-phase contexts.

---

# 1. Purpose

This document defines the Domain-Driven Design structure for the ASTI IMS platform.

It identifies:

* Business domains
* Bounded contexts
* Context relationships
* Aggregate ownership
* Domain events
* Data ownership
* Phase alignment
* Integration boundaries
* Key domain rules

This document is intended to guide:

* Database design
* API design
* UI module planning
* Next.js monorepo modular architecture
* Development sequencing
* Future architecture refinement

---

# 2. Proposal-Aligned Business Scope

The ASTI IMS is a unified institute management platform covering:

1. Website & Digital Experience
2. Dashboard & Analytics
3. Enquiry / CRM
4. Walk-In Fast Track
5. Corporate Client Management
6. Enrollment Management
7. Course Management
8. Course Pricing & Discount Hierarchy
9. Batch Management
10. Calendar & Holiday Management
11. Identity & Access Management
12. Corporate CRM & Quotation
13. Finance & Receivables
14. Certificate Verification
15. Communication & Notifications
16. Reporting & Executive Dashboards
17. Audit & Compliance

Future phase contexts:

1. HRMS
2. Employee Self Service
3. Payroll
4. Tally Integration
5. Biometric Attendance Integration
6. AI Intelligence

Although the proposal uses a module-based structure, this DDD document groups the system by business capability and domain ownership.

---

# 3. Domain Classification

## 3.1 Core Domains

These domains directly drive ASTI’s business value and competitive differentiation.

1. Lead, Enquiry & CRM Management
2. Admission & Enrollment Management
3. Walk-In Fast Track Enrollment
4. Course, Batch & Training Delivery
5. Corporate Training Management
6. Corporate Sales & Quotation
7. Finance & Receivables
8. Certificate Management
9. Website & Digital Experience

---

## 3.2 Supporting Domains

These domains support daily operational execution.

1. Organization Management
2. Scheduling, Calendar & Holiday Management
3. Attendance Management
4. Faculty / Trainer Management
5. Exam, Result & Completion Management
6. Communication Management
7. Document Management

Future supporting domains:

1. HRMS
2. Employee Self Service
3. Payroll
4. Biometric Attendance Integration

---

## 3.3 Generic Domains

These domains provide platform-level capabilities.

1. Identity & Access Management
2. Reporting & Executive Dashboards
3. Audit & Compliance
4. Configuration / Master Data
5. Integration Management

Future generic domain:

1. AI Intelligence

---

# 4. High-Level Bounded Contexts

## 4.1 Current Scope Contexts

1. Identity & Access Management
2. Organization Management
3. Configuration / Master Data
4. Website & Digital Experience
5. Lead, Enquiry & CRM Management
6. Admission & Enrollment Management
7. Walk-In Fast Track Enrollment
8. Corporate Training Management
9. Corporate Sales & Quotation
10. Course Catalog Management
11. Training Delivery Management
12. Scheduling, Calendar & Holiday Management
13. Attendance Management
14. Fee, Billing & Receivables Management
15. Faculty / Trainer Management
16. Exam, Result & Completion Management
17. Certificate Management
18. Communication & Notification Management
19. Document Management
20. Reporting & Executive Dashboards
21. Audit & Compliance

---

## 4.2 Future Phase Contexts

1. HRMS
2. Employee Self Service
3. Payroll Management
4. Tally Integration
5. Biometric Attendance Integration
6. AI Intelligence

---

# 5. DDD Context Map Overview

```text
Website
Static Content + Dynamic Course Data
        |
        v
Lead, Enquiry & CRM
        |
        v
Admission & Enrollment
        |
        +------------------+-------------------+
        |                  |                   |
        v                  v                   v
Regular Enrollment   Walk-In Fast Track   Corporate Enrollment
        |                  |                   |
        +------------------+-------------------+
                           |
                           v
                    Enrollment Aggregate
                           |
                           v
                    Training Delivery
                           |
        +------------------+-------------------+
        |                  |                   |
        v                  v                   v
Scheduling          Attendance           Exam / Completion
        |                                      |
        v                                      v
Calendar & Holiday                    Certificate Eligibility
                                               |
                                               v
                                      Certificate Management


Corporate Sales & Quotation
        |
        v
Corporate Training
        |
        v
Enrollment
        |
        v
Finance & Receivables


Finance & Receivables
        |
        v
Future: Async Real-Time Tally Integration
        |
        v
Daily Reconciliation for Failures


Reporting & Dashboards
        |
        v
Consumes data from all contexts


Audit & Compliance
        |
        v
Tracks critical actions from all contexts
```

---

# 6. Phase-Based Context Planning

| Context                                         | Phase                 |
| ----------------------------------------------- | --------------------- |
| Core Platform: IAM, Organization, Configuration | Phase 1               |
| Website: Static Content + Dynamic Course Data   | Phase 1               |
| Lead, Enquiry & CRM Management                  | Phase 1               |
| Admission & Enrollment Management               | Phase 1               |
| Walk-In Fast Track Enrollment                   | Phase 1               |
| Course Catalog Management                       | Phase 1               |
| Training Delivery / Batch Management            | Phase 1               |
| Scheduling, Calendar & Holiday Management       | Phase 1               |
| Attendance Management - Manual                  | Phase 1               |
| Finance - Manual Payments                       | Phase 1               |
| Certificate Management                          | Phase 1               |
| Document Management                             | Phase 1               |
| Basic Reporting & Dashboard                     | Phase 1               |
| Communication & Notifications                   | Phase 2               |
| Corporate Training Management                   | Phase 2               |
| Corporate Sales & Quotation                     | Phase 2               |
| Advanced Finance & Receivables                  | Phase 2               |
| Online Payment Gateway                          | Phase 2 / Final Phase |
| Advanced Reporting & Executive Dashboards       | Phase 2               |
| HRMS                                            | Phase 3               |
| Employee Self Service                           | Phase 3               |
| Payroll Management                              | Phase 3               |
| Tally Integration                               | Phase 3               |
| Biometric Attendance Integration                | Phase 3               |
| AI Intelligence                                 | Future Phase          |

---

# 7. Central Business Concepts

## 7.1 Person / Party Concept

ASTI deals with many types of people and organizations:

* Students
* Walk-in learners
* Corporate participants
* Trainers
* Employees
* Corporate contacts
* Counselors
* Admin users
* Corporate customers

To avoid duplicated identity data, the system should use a shared Person / Party concept.

```text
Party
   ├── Person
   └── Organization
```

Examples:

```text
Person
   ├── Student
   ├── Trainer
   ├── Employee
   ├── Corporate Contact
   └── Corporate Participant

Organization
   ├── ASTI
   ├── Branch
   └── Corporate Customer
```

Important rule:

* Corporate participant becomes a student automatically when enrolled into a course or batch.
* Corporate participant may still retain corporate linkage for billing and reporting.

---

## 7.2 Enrollment as Central Aggregate

Enrollment is the central business transaction in the IMS.

A learner may enter through:

* Regular admission
* Website registration
* Walk-in fast track
* Corporate nomination

But all training journeys must become an enrollment.

### Aggregate Root

```text
Enrollment
```

### Enrollment Types

```text
Regular
Corporate
WalkIn
Online
```

### Enrollment Statuses

```text
Draft
Submitted
Approved
Confirmed
Active
Completed
Cancelled
Dropped
CertificateIssued
```

### Key Invariants

* Enrollment must be linked to a course.
* Enrollment must be linked to a batch.
* Enrollment must have valid pricing.
* Enrollment must respect pricing and discount hierarchy.
* Corporate enrollment must validate corporate credit rules.
* Certificate requires completion validation.
* Certificate requires payment validation where configured.

---

# 8. Bounded Contexts

---

## 8.1 Identity & Access Management Context

### Business Purpose

Controls authentication, authorization, roles, permissions, and secure access.

### Key Responsibilities

* User login
* Password management
* Dynamic role creation
* Permission assignment
* Menu access
* Action access
* Dashboard access
* Branch-level access control

### Core Entities

* User
* Role
* Permission
* Menu
* UserRole
* RolePermission
* AccessPolicy
* BranchAccess

### Important Rules

* Roles must not be hardcoded.
* Permissions must control access.
* Dashboard access must be permission-based, not role-name based.
* Example permission: `dashboard.ceo`.
* Users may be assigned to one or more branches.
* Users can switch between assigned branches.
* If user has access to multiple branches, consolidated reporting may be allowed.
* Parent branch user can view child branch data.
* Child branch user cannot view parent branch data.

---

## 8.2 Organization Management Context

### Business Purpose

Defines ASTI’s operational structure.

### Key Responsibilities

* Institute profile
* Branch management
* Department management
* Classroom management

### Excluded

* Lab management is not required in the current scope.

### Core Entities

* Institute
* Branch
* Department
* Classroom

### Business Hierarchy

```text
Institute
   └── Branch
          └── Department
                 └── Classroom
```

---

## 8.3 Configuration / Master Data Context

### Business Purpose

Provides configurable reference data used across the IMS.

### Key Responsibilities

* Lead source configuration
* Course category configuration
* Document type configuration
* Payment method configuration
* Discount type configuration
* Student ID format configuration
* Holiday calendar configuration
* Nationality / country / language references
* Localized labels and bilingual metadata
* Branch hierarchy configuration
* Course pricing rule configuration
* Discount hierarchy configuration

### Core Entities

* ConfigurationItem
* LookupType
* LookupValue
* NumberingSeries
* BusinessCalendar
* LocalizedText
* BranchHierarchy
* PricingRule
* DiscountRule

### Important Rules

* Business-critical configurable values should not be hardcoded.
* English and Arabic display values should be supported where required.
* Configuration changes should be auditable.

---

## 8.4 Website & Digital Experience Context

### Business Purpose

Manages ASTI’s public-facing website, digital presence, lead generation, and course discovery experience.

### Key Responsibilities

* Static website pages
* Dynamic course catalog display
* Online registration
* Corporate inquiry forms
* Training calendar display
* SEO metadata
* Bilingual website content
* Campaign tracking
* Website lead attribution

### Core Entities

* PublicCoursePage
* WebsiteInquiry
* OnlineRegistration
* CorporateInquiry
* WebsiteContent
* SEOPageMetadata
* CampaignTrackingCode

### Important Rules

* Website is static content with dynamic course data.
* No CMS editing is required in the current version.
* Website only displays approved and published courses.
* Course data comes from Course Catalog.
* Website inquiries flow into CRM.
* Online registrations flow into Admission & Enrollment.
* Corporate inquiries flow into CRM or Corporate Sales depending on inquiry type.

---

## 8.5 Lead, Enquiry & CRM Management Context

### Business Purpose

Manages leads from multiple channels and converts them into admissions or enrollments.

### Key Responsibilities

* Capture enquiries
* Track lead source
* Assign counselor
* Manage follow-ups
* Track lead status
* Generate fee summary
* Convert lead to admission/enrollment
* Track lead scoring

### Core Entities

* Lead
* Enquiry
* LeadSource
* LeadStage
* FollowUp
* CounselorAssignment
* LeadScore
* Campaign
* LeadNote
* LeadStageHistory

### Lead Lifecycle

```text
New
UnderReview
CounselorAssigned
ProposalIssued
Approved
Converted
Archived
Lost
```

### Important Rules

* Every enquiry must have a source.
* Lead interaction history must be preserved, logging stage changes directly to a dedicated history table.
* Lead notes are logged chronologically and are immutable once created.
* Converted leads should initiate admission or enrollment.
* Lost leads must capture lost reason.
* Follow-up reminders should be generated for counselors.

---

## 8.6 Admission & Enrollment Management Context

### Business Purpose

Manages registration, admissions, learner profiles, and enrollment lifecycle.

### Key Responsibilities

* Register learner
* Create admission record
* Create or link student profile
* Create enrollment
* Assign course
* Assign batch
* Track enrollment status
* Generate student ID
* Generate ID card

### Core Entities

* Admission
* Student
* Enrollment
* StudentIdentity
* StudentIDCard
* EnrollmentStatus

### Important Rules

* Admission means the person is registered with ASTI.
* Enrollment means the person joined a course and batch.
* Enrollment must always link to course and batch.
* One student may have multiple enrollments.
* Corporate participant becomes student once enrolled.
* Enrollment is the central aggregate for the learning lifecycle.

---

## 8.7 Walk-In Fast Track Enrollment Context

### Business Purpose

Supports same-day enrollment, payment, batch assignment, training confirmation, completion, and certificate generation.

### Key Responsibilities

* Walk-in enquiry
* Instant registration
* Same-day payment
* Batch assignment
* Completion validation
* Certificate eligibility
* Training confirmation issuance

### Core Entities

* WalkInEnrollment
* WalkInPayment
* WalkInCompletion
* WalkInConfirmation

### Important Rules

* Walk-in is not a separate student type.
* Walk-in is an enrollment strategy.
* Walk-in enrollment must still link to course and batch.
* Walk-in completion must follow course completion rules.
* Certificate can be issued only after completion and payment validation.

---

## 8.8 Corporate Training Management Context

### Business Purpose

Manages corporate customers, contracts, corporate participants, nominations, bulk enrollment, and corporate training delivery.

### Key Responsibilities

* Corporate account management
* Corporate contact management
* Corporate contract management
* Department / coordinator setup
* Participant nominations
* Bulk enrollment
* Corporate portal
* Corporate training reports

### Core Entities

* CorporateAccount
* CorporateContact
* CorporateContract
* CorporateDepartment
* CorporateCoordinator
* CorporateParticipant
* CorporateTrainingProgram
* CorporateEnrollment

### Important Rules

* Corporate participant becomes student when enrolled into course and batch.
* Corporate linkage must remain available for billing and reporting.
* Corporate portal should support nominations, invoices, certificates, and training status.
* Corporate contract determines billing terms.

---

## 8.9 Corporate Sales & Quotation Context

### Business Purpose

Manages B2B sales lifecycle from enquiry to quotation, sales order, and closure.

### Key Responsibilities

* Corporate sales enquiry
* Quotation creation
* Quotation approval
* Sales order creation
* Pipeline tracking
* Closure management
* Credit terms tracking
* Commercial terms tracking

### Core Entities

* CorporateSalesLead
* Quotation
* QuotationLineItem
* SalesOrder
* SalesPipeline
* CommercialTerms
* CreditLimit

### Important Rules

* Corporate quotation should link to corporate account or prospect.
* Approved quotation may create corporate contract or sales order.
* Quotation-to-invoice relationship must be traceable.
* Credit limit and outstanding balance must be considered before bulk enrollment where configured.

---

## 8.10 Course Catalog Management Context

### Business Purpose

Manages courses, course categories, course options, fee structures, pricing hierarchy, discount hierarchy, publishing, and completion rules.

### Key Responsibilities

* Course creation
* Course classification
* Course category management
* Course type management
* Fee structure definition
* Pricing hierarchy
* Discount hierarchy
* Completion rule definition
* Course approval
* Course publishing

### Core Entities

* Course
* CourseCategory
* CourseType
* CoursePricing
* CourseDiscount
* CourseCompletionRule
* CourseApproval
* CourseCatalogOption

### Course Lifecycle

```text
Draft
InReview
Approved
Published
Archived
```

### Pricing & Discount Hierarchy

```text
Batch Level Pricing & Discount
        ↓ if not available
Branch Level Pricing & Discount
        ↓ if not available
Global Course Pricing & Discount
```

### Important Rules

* Course completion rules belong to Course Catalog.
* Course may have global, branch-level, and batch-level pricing.
* Course may have global, branch-level, and batch-level discounts.
* Batch override has highest priority.
* Branch override has second priority.
* Global course pricing is fallback.
* Discount must follow hierarchy strictly.
* Published courses may appear on website and enrollment screens.

---

## 8.11 Training Delivery Management Context

### Business Purpose

Manages actual course delivery through batches, sessions, trainers, capacity, and waiting lists.

### Key Responsibilities

* Batch creation
* Trainer assignment
* Capacity control
* Waiting list
* Session planning
* Training delivery status

### Core Entities

* Batch
* Session
* BatchTrainer
* BatchCapacity
* WaitingList
* TrainingDeliveryStatus

### Important Rules

* Batch belongs to a course.
* Batch inherits course completion rules.
* Batch may override course pricing and discount.
* Batch capacity must be validated.
* Multiple trainers may be assigned to one batch.
* Waiting list must be maintained when capacity is reached.

---

## 8.12 Scheduling, Calendar & Holiday Management Context

### Business Purpose

Manages timetable, training calendar, classroom booking, holidays, and venue blocking.

### Key Responsibilities

* Timetable creation
* Session scheduling
* Classroom booking
* Holiday calendar management
* Venue blocking
* Trainer availability checking

### Core Entities

* Timetable
* ScheduleSession
* ClassroomBooking
* Holiday
* VenueBlock
* TrainerAvailability

### Important Rules

System must prevent:

```text
Trainer double booking
Classroom double booking
Batch overlap
Holiday conflicts
Venue blocked-date conflicts
```

---

## 8.13 Attendance Management Context

### Business Purpose

Tracks student attendance and training participation.

### Key Responsibilities

* Manual attendance
* Session attendance
* Attendance correction
* Attendance percentage
* Low attendance alerts
* Attendance reports

### Core Entities

* AttendanceSession
* AttendanceRecord
* AttendanceStatus
* AttendanceCorrection
* AttendanceAlert

### Important Rules

* Instructor marks attendance in Phase 1.
* Attendance may contribute to completion and certificate eligibility.
* Low attendance alerts should be generated where configured.

---

## 8.14 Fee, Billing & Receivables Management Context

### Business Purpose

Manages invoices, payments, installments, discounts, refunds, receipts, corporate credit validation, and receivables aging.

### Key Responsibilities

* Fee structure application
* Invoice generation
* Installment planning
* Payment recording
* Receipt generation
* Discount application
* Refund workflow
* Corporate credit validation
* Receivables tracking
* Aging analysis
* Revenue analytics

### Core Entities

* FeePlan
* Invoice
* InvoiceLineItem
* InstallmentPlan
* Payment
* Receipt
* Discount
* Refund
* CreditNote
* Receivable
* AgingBucket
* CorporateCreditRule

### Important Rules

* Finance should be invoice-centric.
* Payment must be linked to invoice, installment, or advance receipt.
* Corporate billing must support consolidated invoicing.
* Receivables aging should support 30/60/90/120+ buckets.
* Refunds require approval.
* Manual payments are supported in Phase 1.
* Payment gateway integration is deferred.
* Corporate credit rules must be validated during corporate enrollment.

### Corporate Credit Rule

```text
If corporate credit limit is exceeded AND block flag = true
        → Block enrollment

If corporate credit limit is exceeded AND block flag = false
        → Allow enrollment
```

---

## 8.15 Faculty / Trainer Management Context

### Business Purpose

Manages trainer profiles, qualifications, availability, assignments, documents, and trainer payment tracking.

### Key Responsibilities

* Trainer profile management
* Qualification tracking
* Document tracking
* Availability management
* Assignment to batches/sessions
* Trainer payment tracking

### Core Entities

* Trainer
* TrainerQualification
* TrainerDocument
* TrainerAvailability
* TrainerAssignment
* TrainerPayment

### Important Rules

* Trainer is not the same as employee in every case.
* Trainers may be full-time, part-time, or freelance.
* Trainer assignment must respect availability.
* Full payroll is handled in the future Payroll Management context.
* HRMS and Trainer Management should avoid duplicate person data by using Person / Party concept.

---

## 8.16 Exam, Result & Completion Management Context

### Business Purpose

Manages assessments, results, course completion validation, and completion approvals.

### Key Responsibilities

* Exam scheduling
* Result recording
* Pass/fail tracking
* Completion validation
* Completion approval
* Re-issue eligibility support

### Core Entities

* Exam
* Assessment
* Result
* Grade
* CompletionRuleEvaluation
* CourseCompletion
* CompletionApproval

### Important Rules

* Course Catalog defines completion rules.
* Completion context evaluates completion rules.
* Certificate context issues certificates after eligibility approval.

### Completion Approval Workflow

```text
Trainer Recommendation
      ↓
Academic Coordinator Review
      ↓
Branch Manager Approval
      ↓
Completion Approved
```

---

## 8.17 Certificate Management Context

### Business Purpose

Manages certificate generation, issue, re-issue, revocation, and verification.

### Key Responsibilities

* Certificate generation
* QR code generation
* Public verification
* Re-issue workflow
* Certificate revocation

### Core Entities

* Certificate
* CertificateIssueLog
* CertificateQRCode
* CertificateVerification
* CertificateReissueRequest

### Important Rules

* Single hardcoded certificate template is used for now.
* Future versions may support configurable certificate templates.
* Certificate context should not compute completion eligibility.
* Certificate issuance must be triggered by completion eligibility.
* QR verification must be unique.
* Certificate re-issue requires management approval.
* Certificates should support English and Arabic where required.

---

## 8.18 Communication & Notification Management Context

### Business Purpose

Manages email, SMS, WhatsApp, notifications, templates, reminders, and communication history.

### Key Responsibilities

* Notification templates
* Placeholder engine
* Email sending
* SMS sending
* WhatsApp sending
* Follow-up reminders
* Fee reminders
* Attendance alerts
* Certificate notifications
* Communication history

### Core Entities

* CommunicationTemplate
* TemplatePlaceholder
* NotificationRequest
* NotificationLog
* CommunicationChannel
* MessageDeliveryStatus

### Important Rules

* Templates should support English and Arabic where required.
* Communication history must be preserved.
* Notification should be event-driven where possible.

---

## 8.19 Document Management Context

### Business Purpose

Manages student, trainer, employee, and corporate documents.

### Key Responsibilities

* Document upload
* Document type configuration
* Document verification
* Approval / rejection
* Expiry date tracking
* Compliance alerts

### Core Entities

* Document
* DocumentType
* DocumentOwner
* DocumentVerification
* DocumentStatus
* DocumentExpiry

### Document Workflow

```text
Uploaded
PendingVerification
Approved
Rejected
Expired
```

### Important Rules

* Documents may belong to students, trainers, employees, or corporate accounts.
* Expiry tracking is required for documents such as Civil ID, Passport, Visa, contracts, and licenses.
* Expiry alert scheduling details belong in Architecture / NFR design.

---

## 8.20 Reporting & Executive Dashboards Context

### Business Purpose

Provides operational, financial, sales, and executive visibility.

### Key Responsibilities

* Dashboard widgets
* KPI snapshots
* Report generation
* Permission-based dashboard access
* Export reports
* Executive MIS

### Core Dashboards

```text
Chairman Dashboard
CEO Dashboard
MD Dashboard
Sales Dashboard
Finance Dashboard
Training Dashboard
```

Future:

```text
HR Dashboard
```

### Mandatory Report Areas

```text
Enrollment Trends
Enquiry Trends
Lead Conversion
Running Batches
Certificates Issued
Overdue Invoices
Payment Trends
Sales Pipeline
Receivables Summary
Faculty Utilization
Corporate Revenue
Branch Performance
Course Profitability
Counselor Performance
```

Future:

```text
HR Summary
Payroll Summary
```

### Important Rules

* Reporting consumes data from other contexts.
* Reporting should not own core business transactions.
* Executive dashboards must be permission-based.
* Dashboard access should use permissions such as `dashboard.ceo`, not hardcoded roles.

---

## 8.21 Audit & Compliance Context

### Business Purpose

Tracks critical actions, approvals, changes, and compliance events.

### Key Responsibilities

* User action logging
* Sensitive data change tracking
* Approval history
* Finance audit
* Attendance audit
* Permission change audit
* Document compliance tracking

### Core Entities

* AuditLog
* ApprovalRequest
* ApprovalStatus
* ApprovalHistory
* UserActionLog
* ComplianceEvent

### Approval Workflows

```text
Refund Approval
Course Completion Approval
Certificate Reissue Approval
Discount Approval
```

Future:

```text
Payroll Approval
```

### Important Rules

Audit must capture:

```text
Who changed data
What changed
When it changed
Old value
New value
Reason, if applicable
```

---

# 9. Future Phase Contexts

---

## 9.1 HRMS Context

### Business Purpose

Manages employee lifecycle and HR records.

### Future Responsibilities

* Employee master
* Employee onboarding
* HR document tracking
* Leave management
* Staff attendance
* Expiry alerts
* Performance management

### Important Rule

HRMS should reuse Person / Party data to avoid duplication with Trainer Management.

---

## 9.2 Employee Self Service Context

### Business Purpose

Provides employee-facing self-service features.

### Future Responsibilities

* Leave request submission
* Payslip download
* Salary certificate request
* Employee profile view
* HR request submission

---

## 9.3 Payroll Management Context

### Business Purpose

Manages payroll calculation, salary processing, payslips, EOSB, bank transfer files, and payroll approvals.

### Future Responsibilities

* Payroll rule configuration
* Salary calculation
* Deductions
* Allowances
* Payslip generation
* EOSB calculation
* Bank file generation
* Payroll approval

---

## 9.4 Tally Integration Context

### Business Purpose

Synchronizes financial transactions between IMS and Tally.

### Future Responsibilities

* Export invoices
* Export receipts
* Export payments
* Export credit notes
* Track sync status
* Reconcile failed syncs

### Important Rules

* Finance owns source financial data.
* Tally Integration only synchronizes.
* Sync must be real-time but asynchronous.
* Tally sync must not affect API response time.
* Daily reconciliation should handle failures.
* Retry, queue, and outbox patterns belong in Architecture / Integration design.

---

## 9.5 Biometric Attendance Integration Context

### Business Purpose

Integrates biometric devices for staff and/or student attendance.

### Future Responsibilities

* Receive biometric logs
* Map biometric user to system user/person
* Prevent duplicate sync
* Track sync status
* Report sync failures

### Important Rules

* Biometric integration is an integration context, not the source of attendance truth.
* Attendance context owns attendance records.
* Biometric sync should be idempotent.
* Offline buffering and local gateway design belong in Architecture / Integration document.

---

## 9.6 AI Intelligence Context

### Business Purpose

Uses operational data to generate predictions and recommendations.

### Future AI Capabilities

* Suggest next counselor follow-up
* Recommend courses to students
* Predict batch demand
* Predict faculty utilization
* Predict fee collection
* Predict student dropout risk
* Suggest new batches
* Suggest marketing campaigns

### AI-Ready Data to Capture from Day 1

```text
Lead interaction history
Counselor notes
Campaign source
Enrollment conversion data
Attendance patterns
Student progression
Payment behavior
Batch demand
Trainer workload
Corporate inquiry history
Website lead attribution
```

---

# 10. Aggregate Design

---

## 10.1 Lead Aggregate

### Aggregate Root

```text
Lead
```

### Child Entities / Value Objects

```text
LeadSource
LeadStage
FollowUp
CounselorAssignment
LeadScore
CampaignReference
LeadNote
LeadStageHistory
```

### Key Invariants

* Lead must have a source.
* Lead must have a current status.
* Converted lead must link to admission or enrollment.
* Lost lead must capture lost reason.
* Lead stage transitions must be recorded chronologically inside LeadStageHistory.
* Lead notes must be immutable once created.

---

## 10.2 Enrollment Aggregate

### Aggregate Root

```text
Enrollment
```

### Child Entities / Value Objects

```text
EnrollmentType
EnrollmentStatus
EnrollmentCourse
EnrollmentBatch
EnrollmentPricing
EnrollmentFeeReference
EnrollmentCompletionStatus
CorporateCreditValidation
```

### Key Invariants

* Enrollment must link to course.
* Enrollment must link to batch.
* Enrollment must have valid learner or participant.
* Enrollment must respect pricing hierarchy.
* Enrollment must validate corporate credit rules when corporate linked.
* Enrollment cannot be completed before required completion rules are satisfied.
* Certificate cannot be issued before eligibility approval and payment validation.

---

## 10.3 Corporate Account Aggregate

### Aggregate Root

```text
CorporateAccount
```

### Child Entities / Value Objects

```text
CorporateContact
CorporateContract
CorporateDepartment
CorporateParticipant
CreditTerms
CreditLimit
```

### Key Invariants

* Corporate participant must belong to corporate account.
* Corporate enrollment must follow contract terms.
* Corporate billing must follow agreed billing cycle.
* Credit limit validation applies where configured.

---

## 10.4 Course Aggregate

### Aggregate Root

```text
Course
```

### Child Entities / Value Objects

```text
CourseCategory
CourseType
CoursePricing
CourseDiscount
CourseCompletionRule
CourseApproval
```

### Key Invariants

* Course must belong to department or category.
* Published course must have valid pricing.
* Published course must have completion rule.
* Completion rules are defined at course level.
* Pricing and discounts follow global → branch → batch override hierarchy.

---

## 10.5 Batch Aggregate

### Aggregate Root

```text
Batch
```

### Child Entities / Value Objects

```text
Session
BatchTrainer
BatchCapacity
WaitingList
BatchPricingOverride
BatchDiscountOverride
```

### Key Invariants

* Batch must link to course.
* Batch may override course pricing and discount.
* Batch capacity must not exceed configured limit unless override is allowed.
* Trainer conflicts must be prevented.
* Classroom conflicts must be prevented.

---

## 10.6 Invoice Aggregate

### Aggregate Root

```text
Invoice
```

### Child Entities / Value Objects

```text
InvoiceLineItem
Installment
PaymentAllocation
TaxBreakdown
Receivable
CorporateCreditRule
```

### Key Invariants

* Invoice must have valid customer or student reference.
* Payment must be allocated to invoice or advance.
* Receivables aging must be calculated from invoice due date.
* Refund must refer to valid payment or invoice.
* Corporate credit rules must be checked where configured.

---

## 10.7 Certificate Aggregate

### Aggregate Root

```text
Certificate
```

### Child Entities / Value Objects

```text
CertificateQRCode
CertificateIssueLog
CertificateVerification
CertificateReissueRequest
```

### Key Invariants

* Certificate must link to enrollment.
* Certificate must have unique verification code.
* Certificate cannot be issued without completion eligibility.
* Certificate cannot be issued without payment validation where required.
* Certificate uses a single hardcoded template in current version.

---

# 11. Domain Events

## 11.1 Website & CRM Events

```text
WebsiteInquirySubmitted
OnlineRegistrationSubmitted
CorporateInquirySubmitted
LeadCreated
LeadAssigned
FollowUpScheduled
ProposalIssued
LeadConverted
LeadLost
```

---

## 11.2 Admission & Enrollment Events

```text
AdmissionCreated
StudentProfileCreated
EnrollmentCreated
EnrollmentApproved
EnrollmentConfirmed
EnrollmentCancelled
EnrollmentCompleted
```

---

## 11.3 Walk-In Events

```text
WalkInEnrollmentCreated
WalkInPaymentRecorded
WalkInTrainingCompleted
WalkInCertificateEligible
```

---

## 11.4 Corporate Events

```text
CorporateAccountCreated
CorporateContractCreated
CorporateParticipantNominated
CorporateParticipantConvertedToStudent
CorporateBulkEnrollmentCreated
CorporateInvoiceRequested
CorporateCreditLimitExceeded
```

---

## 11.5 Corporate Sales Events

```text
CorporateSalesLeadCreated
QuotationCreated
QuotationApproved
QuotationRejected
SalesOrderCreated
CorporateDealClosed
```

---

## 11.6 Course & Training Delivery Events

```text
CourseCreated
CourseApproved
CoursePublished
CoursePricingUpdated
CourseDiscountUpdated
BatchCreated
BatchPricingOverridden
BatchDiscountOverridden
BatchCapacityReached
StudentAddedToWaitingList
TrainerAssignedToBatch
SessionScheduled
```

---

## 11.7 Attendance Events

```text
AttendanceSessionCreated
AttendanceMarked
AttendanceUpdated
LowAttendanceDetected
```

Future:

```text
BiometricLogReceived
BiometricLogSynced
```

---

## 11.8 Finance Events

```text
InvoiceGenerated
PaymentRecorded
ReceiptGenerated
InstallmentDue
InvoiceOverdue
DiscountApplied
RefundRequested
RefundApproved
CreditNoteIssued
CorporateCreditValidationPassed
CorporateCreditValidationFailed
```

Future:

```text
TallySyncRequested
TallySyncCompleted
TallySyncFailed
```

---

## 11.9 Completion & Certificate Events

```text
ExamScheduled
ResultRecorded
CompletionEvaluationRequested
CourseCompletionApproved
CertificateEligible
CertificateGenerated
CertificateReissued
CertificateVerified
```

---

## 11.10 Communication & Audit Events

```text
NotificationRequested
MessageSent
MessageFailed
CommunicationLogged
UserActionPerformed
ApprovalRequested
ApprovalApproved
ApprovalRejected
CriticalDataChanged
```

---

## 11.11 Future HRMS / ESS / Payroll Events

```text
EmployeeCreated
LeaveRequested
LeaveApproved
LeaveRejected
HRDocumentExpiring
PayrollCycleCreated
PayrollApproved
PayslipGenerated
BankTransferFileGenerated
```

---

# 12. Context Integration Rules

## 12.1 Website to CRM

```text
Website Inquiry
      ↓
Lead Created
      ↓
Counselor Follow-up
```

Website does not own leads. CRM owns leads.

---

## 12.2 Website to Course Catalog

```text
Published Course
      ↓
Public Course Display
```

Website displays course data but does not own course data.

---

## 12.3 CRM to Admission

```text
Qualified Lead
      ↓
Admission Created
```

CRM should not directly create active students without admission/enrollment validation.

---

## 12.4 Admission to Enrollment

```text
Admission Approved
      ↓
Enrollment Created
      ↓
Course + Batch Assigned
```

Admission and enrollment are separate business concepts.

---

## 12.5 Walk-In Flow

```text
Walk-In Request
      ↓
Enrollment Created
      ↓
Course + Batch Assigned
      ↓
Payment Recorded
      ↓
Training Completed
      ↓
Certificate Eligibility
      ↓
Certificate Generated
```

Walk-in is a specialized enrollment flow.

---

## 12.6 Corporate Sales to Corporate Training

```text
Corporate Sales Lead
      ↓
Quotation
      ↓
Sales Order / Contract
      ↓
Corporate Program
      ↓
Corporate Participant Enrollment
```

Corporate sales owns quotation and pipeline. Corporate training owns delivery.

---

## 12.7 Corporate Participant to Student

```text
Corporate Participant
      ↓
Course + Batch Enrollment
      ↓
Student Profile Created / Linked
```

Corporate participant becomes a student when enrolled.

---

## 12.8 Enrollment to Finance

```text
Enrollment Confirmed
      ↓
Pricing Hierarchy Resolved
      ↓
Invoice / Fee Assigned
      ↓
Payment / Receivable Tracking
```

Finance owns invoice, payment, receivable, refund, and receipt.

---

## 12.9 Pricing Resolution

```text
Batch Pricing / Discount
      ↓ if missing
Branch Pricing / Discount
      ↓ if missing
Global Course Pricing / Discount
```

Course Catalog owns pricing rules. Finance applies resolved pricing during invoice generation.

---

## 12.10 Finance to Tally - Future

```text
Finance Event
      ↓
Async Real-Time Sync Trigger
      ↓
Tally Sync
      ↓
Failure
      ↓
Daily Reconciliation
```

Tally integration synchronizes finance events. It does not own finance records.

---

## 12.11 Scheduling to Attendance

```text
Session Scheduled
      ↓
Attendance Session Created
      ↓
Attendance Marked
```

Scheduling owns timetable. Attendance owns participation records.

---

## 12.12 Completion to Certificate

```text
Completion Approved
      ↓
Payment Validation
      ↓
Certificate Eligible
      ↓
Certificate Generated
```

Certificate context should not compute completion rules.

---

## 12.13 All Contexts to Audit

```text
Critical Business Action
      ↓
Audit Event Recorded
```

Audit must capture important changes across domains.

---

# 13. Data Ownership Rules

| Data                                                        | Owning Context               |
| ----------------------------------------------------------- | ---------------------------- |
| User, Role, Permission, BranchAccess                        | Identity & Access            |
| Branch, Department, Classroom                               | Organization                 |
| Lookup values, numbering series, calendars, pricing rules   | Configuration / Master Data  |
| Static website content, public course page, website inquiry | Website & Digital Experience |
| Lead, follow-up, counselor assignment                       | Lead, Enquiry & CRM          |
| Admission, student, enrollment                              | Admission & Enrollment       |
| Walk-in enrollment flow                                     | Walk-In Fast Track           |
| Corporate account, contract, participant                    | Corporate Training           |
| Corporate quotation, sales order, pipeline                  | Corporate Sales & Quotation  |
| Course, course pricing, discount, completion rule           | Course Catalog               |
| Batch, session, waiting list, batch override                | Training Delivery            |
| Timetable, holiday, venue block                             | Scheduling & Calendar        |
| Attendance record                                           | Attendance                   |
| Invoice, payment, receipt, refund, receivable               | Finance & Receivables        |
| Trainer profile, qualification, availability                | Trainer Management           |
| Exam, result, completion evaluation                         | Exam & Completion            |
| Certificate, QR verification                                | Certificate                  |
| Message template, notification log                          | Communication                |
| Document, verification, expiry                              | Document Management          |
| Report definition, dashboard widget                         | Reporting & Dashboards       |
| Audit log, approval history                                 | Audit & Compliance           |

Future ownership:

| Data                                    | Future Owning Context |
| --------------------------------------- | --------------------- |
| Employee, leave, HR document            | HRMS                  |
| ESS request, payslip access request     | Employee Self Service |
| Payroll cycle, payslip, EOSB, bank file | Payroll               |
| Tally sync status and mapping           | Tally Integration     |
| Biometric device log and sync status    | Biometric Integration |
| AI predictions and recommendations      | AI Intelligence       |

---

# 14. Application Structure

## 14.1 Current Application Structure

```text
asti-ims
│
├── apps
│   └── admin-portal
│
├── packages
│   ├── identity-access
│   ├── organization
│   ├── configuration
│   ├── website-digital
│   ├── crm-leads
│   ├── admission-enrollment
│   ├── walkin-fast-track
│   ├── corporate-training
│   ├── corporate-sales-quotation
│   ├── course-catalog
│   ├── training-delivery
│   ├── scheduling-calendar
│   ├── attendance
│   ├── finance-receivables
│   ├── trainer-management
│   ├── exams-completion
│   ├── certificates
│   ├── communication-notifications
│   ├── documents
│   ├── reporting-dashboards
│   ├── audit-compliance
│   └── shared
│
└── infrastructure
    ├── database
    ├── auth
    ├── storage
    ├── jobs
    └── deployment
```

---

## 14.2 Future Application Structure

```text
asti-ims
│
├── apps
│   ├── admin-portal
│   ├── student-portal
│   ├── trainer-portal
│   ├── corporate-portal
│   ├── employee-portal
│   ├── public-website
│   └── certificate-verification
│
├── packages
│   ├── hrms
│   ├── employee-self-service
│   ├── payroll
│   ├── tally-integration
│   ├── biometric-integration
│   └── ai-intelligence
```

---

# 15. Key Design Decisions

1. Single admin portal first.
2. SaaS tenant setup is excluded.
3. Website is static content with dynamic course data.
4. No CMS editing is required in the current version.
5. Use Dynamic RBAC instead of hardcoded roles.
6. Dashboard access is permission-based, not role-name based.
7. Use DDD bounded contexts to organize business capability, not UI menus.
8. Introduce Configuration / Master Data as a separate context.
9. Introduce Person / Party concept to reduce duplication across students, trainers, employees, and corporate contacts.
10. Separate Admission from Enrollment.
11. Use Enrollment as the central aggregate for regular, corporate, online, and walk-in training journeys.
12. Enrollment must link to both course and batch.
13. Corporate participant becomes student when enrolled.
14. Treat Walk-In as an enrollment strategy, not a separate student type.
15. Separate Corporate Sales & Quotation from Corporate Training Delivery.
16. Make Finance invoice-centric.
17. Enforce pricing and discount hierarchy: batch → branch → global course.
18. Corporate credit can block enrollment based on block flag.
19. Course Catalog owns pricing, discounts, and completion rules.
20. Finance applies resolved pricing during invoice generation.
21. Certificate context issues, verifies, reissues, and revokes certificates. It does not compute eligibility.
22. Use a single hardcoded certificate template for now.
23. Future certificate templates can be configurable.
24. No lab management in the current version.
25. Manual attendance in Phase 1.
26. Tally sync is future phase and must be async real-time.
27. Tally sync must not impact API response time.
28. Daily reconciliation handles Tally sync failures.
29. HRMS, ESS, Payroll, Biometric, and AI are future-phase contexts.
30. Architecture patterns such as outbox, retries, queues, local biometric gateway, PITR, failover, and backup strategy belong in Architecture / NFR / Integration documents, not in DDD.

---

# 16. Open Questions

1. Biometric device details are unknown.
2. Certificate templates are hardcoded now; future configurability is required.
3. Invoice format is generic for now.
4. HRMS and Trainer Management should avoid duplicate person profiles.
5. Online payment gateway phase needs final confirmation.
6. Exact Oman tax invoice format needs validation.
7. Exact branch hierarchy model needs confirmation.
8. Exact corporate credit limit defaults need confirmation.
9. Exact dashboard permissions need to be defined.
10. Exact student ID and enrollment numbering formats need confirmation.

---

# 17. Recommended Next Documents

The following documents should be created after this DDD v3.0:

1. Entity Relationship Model / Domain Data Model v3
2. Architecture Requirement Document
3. Non-Functional Requirement Document
4. Integration Architecture Document
5. API Boundary Specification
6. Module-wise Functional Requirement Document
7. UI / UX Screen Inventory
8. Data Migration Template
9. Master Data Configuration Workbook
10. Phase-wise Delivery Roadmap

---

# 18. Final Recommendation

This DDD v3.0 should be used as the current baseline for ASTI IMS.

It consolidates:

* Proposal-aligned scope
* Single admin portal strategy
* Static website with dynamic course data
* Admission vs enrollment separation
* Enrollment as central aggregate
* Course + batch mandatory enrollment
* Corporate participant to student conversion
* Pricing and discount hierarchy
* Invoice-centric finance
* Corporate credit enforcement
* Certificate issuance rules
* Permission-based dashboards
* Branch-level access rules
* Future phase separation for HRMS, ESS, Payroll, Tally, Biometric, and AI

The next recommended step is to create the **Entity Relationship Model / Domain Data Model v3** aligned with these bounded contexts and aggregate ownership rules.
