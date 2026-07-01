# Entity Relationship Model / Domain Data Model v3

## ASTI Integrated Institute Management System

**Version:** 3.0
**Aligned With:** DDD Context Map v3.0
**Scope:** Single-client ASTI implementation
**Application Strategy:** Single admin portal first
**Master Data Source:** ASTI IMS Configuration Workbook
**Future Contexts:** HRMS, ESS, Payroll, Tally, Biometric, AI

---

# 1. Purpose

This document defines the initial Entity Relationship Model and Domain Data Model for ASTI IMS.

It supports:

* Database schema design
* Prisma schema design
* API boundary design
* Master data import planning
* Migration planning
* Report and dashboard planning

---

# 2. Modeling Principles

## 2.1 Enrollment-Centric Model

Enrollment is the central business transaction.

Every learning journey must become an enrollment.

Sources may include:

* CRM lead
* Walk-in registration
* Website registration
* Corporate nomination

But the final training record must be:

```text
Student / Participant → Enrollment → Course → Batch
```

---

## 2.2 Course and Batch Are Mandatory

Every enrollment must link to:

```text
Course
Batch
```

This supports:

* Attendance
* Scheduling
* Trainer assignment
* Finance
* Completion
* Certificate generation

---

## 2.3 Person / Party Model

The system should avoid duplicate identity data.

```text
Party
   ├── Person
   └── Organization
```

A person may later become:

* Student
* Trainer
* Employee
* User
* Corporate contact
* Corporate participant

An organization may represent:

* ASTI
* Branch
* Corporate client

---

## 2.4 Single Source of Truth

Each entity has one owning context.

Examples:

| Data             | Owner             |
| ---------------- | ----------------- |
| Course           | Course Catalog    |
| Batch            | Training Delivery |
| Invoice          | Finance           |
| Attendance       | Attendance        |
| Certificate      | Certificate       |
| User permissions | Identity & Access |

---

## 2.5 Bilingual Data

For bilingual values, use localized JSON fields.

Example:

```json
{
  "en": "Health and Safety Training",
  "ar": "تدريب الصحة والسلامة"
}
```

Use this for:

* Course names
* Course descriptions
* Website content
* Categories
* Certificate text
* Notification templates

---

# 3. High-Level ER Overview

```text
Party
 ├── Person
 │    ├── User
 │    ├── StudentProfile
 │    ├── TrainerProfile
 │    └── EmployeeProfile future
 │
 └── Organization
      ├── Institute
      ├── Branch
      └── CorporateAccount

Branch
 ├── Department
 ├── Classroom
 └── Batch

Course
 ├── CoursePricing
 ├── CourseDiscount
 ├── CourseCompletionRule
 └── Batch

Lead
 └── Admission
      └── StudentProfile
           └── Enrollment
                ├── Course
                ├── Batch
                ├── Invoice
                ├── Attendance
                ├── Completion
                └── Certificate

CorporateAccount
 ├── CorporateContact
 ├── CorporateContract
 ├── CorporateParticipant
 ├── Quotation
 ├── SalesOrder
 └── CorporateEnrollment

Invoice
 ├── InvoiceLineItem
 ├── Installment
 ├── Payment
 ├── Receipt
 ├── Refund
 └── Receivable

AuditLog
 └── Tracks sensitive changes across all contexts
```

---

# 4. Common Base Fields

Most operational tables should include:

```text
id
createdAt
createdBy
updatedAt
updatedBy
deletedAt
isActive
version
```

Recommended:

```text
id = UUID / CUID
deletedAt = soft delete
version = optimistic locking
```

---

# 5. Identity & Access Model

## 5.1 User

Represents login access.

| Field             | Type        |
| ----------------- | ----------- |
| id                | UUID        |
| personId          | FK → Person |
| email             | string      |
| passwordHash      | string      |
| status            | enum        |
| preferredLanguage | enum        |
| defaultBranchId   | FK → Branch |
| lastLoginAt       | datetime    |

Relationships:

```text
User 1 → 1 Person
User M → M Role via UserRole
User M → M Branch via UserBranchAccess
```

---

## 5.2 Role

| Field        | Type    |
| ------------ | ------- |
| id           | UUID    |
| code         | string  |
| name         | string  |
| description  | text    |
| isSystemRole | boolean |
| status       | enum    |

---

## 5.3 Permission

| Field          | Type   |
| -------------- | ------ |
| id             | UUID   |
| code           | string |
| name           | string |
| moduleCode     | string |
| permissionType | enum   |

Example permission codes:

```text
student.read
student.create
finance.invoice.create
dashboard.ceo
dashboard.finance
course.publish
```

---

## 5.4 UserRole

```text
id
userId
roleId
assignedAt
assignedBy
```

---

## 5.5 RolePermission

```text
id
roleId
permissionId
```

---

## 5.6 UserBranchAccess

```text
id
userId
branchId
canViewConsolidated
canViewChildBranches
isDefault
```

Rules:

* User can switch between assigned branches.
* Parent branch user can view child branch data if allowed.
* Child branch user cannot view parent branch data unless explicitly assigned.

---

# 6. Party, Person & Organization Model

## 6.1 Party

| Field                | Type                  |
| -------------------- | --------------------- |
| id                   | UUID                  |
| partyType            | PERSON / ORGANIZATION |
| displayName          | string                |
| displayNameLocalized | json                  |
| primaryEmail         | string                |
| primaryPhone         | string                |
| status               | enum                  |

---

## 6.2 Person

| Field             | Type       |
| ----------------- | ---------- |
| id                | UUID       |
| partyId           | FK → Party |
| firstName         | string     |
| middleName        | string     |
| lastName          | string     |
| fullName          | string     |
| fullNameLocalized | json       |
| gender            | enum       |
| dateOfBirth       | date       |
| nationality       | string     |
| civilId           | string     |
| passportNumber    | string     |
| visaNumber        | string     |
| primaryEmail      | string     |
| primaryPhone      | string     |
| photoUrl          | string     |

Relationships:

```text
Person 1 → 0..1 StudentProfile
Person 1 → 0..1 TrainerProfile
Person 1 → 0..1 User
Person 1 → 0..1 EmployeeProfile future
```

---

## 6.3 Organization

| Field                 | Type                           |
| --------------------- | ------------------------------ |
| id                    | UUID                           |
| partyId               | FK → Party                     |
| organizationType      | INSTITUTE / BRANCH / CORPORATE |
| legalName             | string                         |
| tradeName             | string                         |
| registrationNumber    | string                         |
| taxRegistrationNumber | string                         |
| primaryEmail          | string                         |
| primaryPhone          | string                         |
| address               | text                           |
| status                | enum                           |

---

# 7. Organization Management Model

## 7.1 Institute

```text
id
organizationId
code
name
legalName
logoUrl
defaultCurrency
defaultLanguage
timezone
effectiveStartDate
effectiveEndDate
```

Relationship:

```text
Institute 1 → M Branch
```

---

## 7.2 Branch

```text
id
instituteId
parentBranchId
code
name
nameLocalized
isHeadOffice
branchManagerId
effectiveStartDate
effectiveEndDate
status
```

Relationships:

```text
Branch M → 1 Institute
Branch 1 → M Department
Branch 1 → M Classroom
Branch 1 → M Batch
```

---

## 7.3 Department

```text
id
branchId
code
name
nameLocalized
description
departmentHeadId
effectiveStartDate
effectiveEndDate
status
```

Relationship:

```text
Department 1 → M Course
```

---

## 7.4 Classroom

```text
id
branchId
code
name
capacity
location
effectiveStartDate
effectiveEndDate
status
```

Relationship:

```text
Classroom 1 → M ScheduleSession
```

Note:

```text
Lab management is excluded from current scope.
```

---

# 8. Configuration / Master Data Model

## 8.1 LookupType

```text
id
code
name
description
```

---

## 8.2 LookupValue

```text
id
lookupTypeId
code
label
labelLocalized
sortOrder
isActive
```

Examples:

```text
Lead Source
Payment Method
Discount Type
Document Type
Course Type
Nationality
Student Status
Enrollment Status
```

---

## 8.3 NumberingSeries

```text
id
entityType
prefix
suffix
yearFormat
nextNumber
paddingLength
branchId
isActive
```

Used for:

```text
Student ID
Enrollment Number
Invoice Number
Receipt Number
Certificate Number
Quotation Number
```

---

## 8.4 BusinessCalendar

```text
id
branchId
name
year
countryCode
status
```

---

## 8.5 Holiday

```text
id
calendarId
date
name
nameLocalized
holidayType
```

---

# 9. Website & Digital Experience Model

## 9.1 WebsitePage

```text
id
slug
title
titleLocalized
pageType
content
contentLocalized
seoTitle
seoDescription
status
publishedAt
```

---

## 9.2 PublicCoursePage

```text
id
courseId
slug
isVisible
seoTitle
seoDescription
publishedAt
```

Relationship:

```text
PublicCoursePage M → 1 Course
```

---

## 9.3 WebsiteInquiry

```text
id
inquiryType
fullName
email
phone
companyName
courseInterest
message
source
utmSource
utmMedium
utmCampaign
leadId
createdAt
```

Relationship:

```text
WebsiteInquiry 0..1 → 1 Lead
```

---

## 9.4 OnlineRegistration

```text
id
personId
courseId
preferredBatchId
registrationStatus
leadId
admissionId
submittedAt
```

Relationships:

```text
OnlineRegistration M → 1 Course
OnlineRegistration 0..1 → Lead
OnlineRegistration 0..1 → Admission
```

---

# 10. Lead, Enquiry & CRM Model

## 10.1 Lead

```text
id
leadNumber
personId
organizationId
leadType
source
stage
priority
score
assignedCounselorId
interestedCourseId
status
lostReason
createdAt
convertedAt
```

Relationships:

```text
Lead M → 1 Person
Lead M → 0..1 Organization
Lead M → 0..1 Course
Lead M → 1 User as Counselor
Lead 1 → M FollowUp
Lead 1 → 0..1 Admission
```

---

## 10.2 FollowUp

```text
id
leadId
assignedToUserId
followUpDate
followUpType
notes
outcome
nextFollowUpDate
status
```

---

## 10.3 LeadInteraction

```text
id
leadId
interactionType
channel
summary
interactionAt
createdBy
```

Channels:

```text
Phone
WhatsApp
Email
WalkIn
Website
```

---

## 10.4 Campaign

```text
id
name
channel
startDate
endDate
budget
utmSource
utmMedium
utmCampaign
status
```

## 10.5 LeadNote

```text
id
leadId
content
createdAt
createdBy
```

Relationships:

```text
LeadNote M → 1 Lead
LeadNote M → 0..1 User as Author
```

---

## 10.6 LeadStageHistory

```text
id
leadId
oldStage
newStage
lostReasonCode
lostReasonNotes
performedBy
performedAt
```

Relationships:

```text
LeadStageHistory M → 1 Lead
LeadStageHistory M → 1 User as Performer
```

---

# 11. Admission & Enrollment Model

## 11.1 Admission

```text
id
admissionNumber
leadId
personId
studentProfileId
admissionStatus
submittedAt
approvedAt
approvedBy
remarks
```

Relationships:

```text
Admission 0..1 → Lead
Admission M → 1 Person
Admission 1 → 0..1 StudentProfile
Admission 1 → M Enrollment
```

---

## 11.2 StudentProfile

```text
id
personId
studentNumber
studentStatus
idCardIssued
idCardNumber
joinedAt
status
```

Relationships:

```text
StudentProfile 1 → 1 Person
StudentProfile 1 → M Enrollment
```

---

## 11.3 Enrollment

Central aggregate.

```text
id
enrollmentNumber
studentProfileId
corporateParticipantId
admissionId
courseId
batchId
branchId
enrollmentType
enrollmentStatus
pricingSource
resolvedPrice
resolvedDiscount
finalAmount
paymentValidationRequired
completionStatus
certificateStatus
confirmedAt
completedAt
```

Relationships:

```text
Enrollment M → 1 StudentProfile
Enrollment M → 1 Course
Enrollment M → 1 Batch
Enrollment M → 1 Branch
Enrollment 0..1 → CorporateParticipant
Enrollment 1 → M InvoiceLineItem
Enrollment 1 → M AttendanceRecord
Enrollment 1 → 0..1 CourseCompletion
Enrollment 1 → 0..1 Certificate
```

Rules:

```text
Enrollment must have courseId.
Enrollment must have batchId.
Enrollment must have valid resolved pricing.
Corporate enrollment must validate credit rule.
Certificate requires completion + payment validation.
```

---

# 12. Walk-In Fast Track Model

## 12.1 WalkInEnrollment

```text
id
enrollmentId
walkInDate
counterUserId
paymentCollected
confirmationIssued
remarks
```

Relationship:

```text
WalkInEnrollment 1 → 1 Enrollment
```

---

## 12.2 WalkInConfirmation

```text
id
walkInEnrollmentId
confirmationNumber
issuedAt
issuedBy
documentUrl
```

---

# 13. Course Catalog Model

## 13.1 CourseCategory

```text
id
code
name
nameLocalized
description
parentCategoryId
status
```

Relationship:

```text
CourseCategory 1 → M Course
```

---

## 13.2 Course

```text
id
departmentId
categoryId
code
name
nameLocalized
description
descriptionLocalized
courseType
durationType
durationValue
defaultLanguage
isWalkInEnabled
requiresExam
requiresAttendance
minAttendancePercentage
requiresCompletionApproval
status
publishedAt
```

Relationships:

```text
Course M → 1 Department
Course M → 1 CourseCategory
Course 1 → M CoursePricing
Course 1 → M CourseDiscount
Course 1 → M CourseCompletionRule
Course 1 → M Batch
```

---

## 13.3 CoursePricing

```text
id
courseId
branchId
batchId
customerType
currency
amount
effectiveFrom
effectiveTo
priorityLevel
status
```

Pricing hierarchy:

```text
Batch pricing
↓ if missing
Branch pricing
↓ if missing
Global course pricing
```

---

## 13.4 CourseDiscount

```text
id
courseId
branchId
batchId
discountType
discountMode
discountValue
effectiveFrom
effectiveTo
priorityLevel
requiresApproval
status
```

Discount hierarchy:

```text
Batch discount
↓ if missing
Branch discount
↓ if missing
Global course discount
```

---

## 13.5 CourseCompletionRule

```text
id
courseId
ruleType
minAttendancePercentage
examRequired
paymentRequired
manualApprovalRequired
certificateAllowed
status
```

---

# 14. Training Delivery / Batch Model

## 14.1 Batch

```text
id
courseId
branchId
classroomId
batchCode
name
startDate
endDate
status
maxCapacity
currentEnrollmentCount
allowOverCapacity
```

Relationships:

```text
Batch M → 1 Course
Batch M → 1 Branch
Batch M → 1 Classroom
Batch 1 → M Session
Batch 1 → M BatchTrainer
Batch 1 → M Enrollment
```

---

## 14.2 BatchTrainer

```text
id
batchId
trainerId
role
assignedFrom
assignedTo
status
```

Relationship:

```text
BatchTrainer M → 1 Batch
BatchTrainer M → 1 TrainerProfile
```

---

## 14.3 Session

```text
id
batchId
sessionNumber
title
sessionDate
startTime
endTime
trainerId
classroomId
status
```

Relationships:

```text
Session M → 1 Batch
Session M → 1 TrainerProfile
Session M → 1 Classroom
Session 1 → M AttendanceRecord
```

---

## 14.4 WaitingList

```text
id
courseId
batchId
personId
leadId
requestedAt
priority
status
```

---

# 15. Scheduling, Calendar & Holiday Model

## 15.1 ScheduleSession

Can reuse Session or be implemented as a separate scheduling table.

```text
id
batchId
trainerId
classroomId
scheduledDate
startTime
endTime
scheduleStatus
conflictChecked
```

Rule:

```text
No trainer double booking.
No classroom double booking.
No batch overlap.
No holiday or blocked date conflict.
```

---

## 15.2 VenueBlock

```text
id
branchId
classroomId
blockDate
startTime
endTime
reason
status
```

---

# 16. Attendance Model

## 16.1 AttendanceSession

```text
id
sessionId
batchId
attendanceDate
markedByTrainerId
status
markedAt
```

---

## 16.2 AttendanceRecord

```text
id
attendanceSessionId
enrollmentId
studentProfileId
status
remarks
markedAt
markedBy
```

Statuses:

```text
Present
Absent
Late
Excused
```

---

## 16.3 AttendanceCorrection

```text
id
attendanceRecordId
oldStatus
newStatus
reason
requestedBy
approvedBy
status
```

---

# 17. Corporate Training Model

## 17.1 CorporateAccount

```text
id
organizationId
accountCode
accountName
industry
creditLimit
currentOutstanding
blockOnCreditLimit
billingCycle
status
```

Relationships:

```text
CorporateAccount 1 → M CorporateContact
CorporateAccount 1 → M CorporateContract
CorporateAccount 1 → M CorporateParticipant
CorporateAccount 1 → M Quotation
CorporateAccount 1 → M Invoice
```

---

## 17.2 CorporateContact

```text
id
corporateAccountId
personId
designation
department
email
phone
isPrimary
portalAccessEnabled
```

---

## 17.3 CorporateContract

```text
id
corporateAccountId
contractNumber
contractValue
startDate
endDate
billingModel
paymentTerms
status
```

Billing models:

```text
Per Student
Per Batch
Per Hour
Fixed Contract
```

---

## 17.4 CorporateParticipant

```text
id
corporateAccountId
personId
employeeCode
department
designation
linkedStudentProfileId
status
```

Rule:

```text
Corporate participant becomes student when enrolled.
Corporate linkage must remain for billing and reporting.
```

---

## 17.5 CorporateEnrollment

```text
id
corporateAccountId
corporateParticipantId
enrollmentId
contractId
billingStatus
```

---

# 18. Corporate Sales & Quotation Model

## 18.1 CorporateSalesLead

```text
id
corporateAccountId
leadId
salesOwnerId
stage
expectedValue
expectedCloseDate
status
```

---

## 18.2 Quotation

```text
id
quotationNumber
corporateAccountId
corporateSalesLeadId
quotationDate
validUntil
subtotal
discountAmount
taxAmount
totalAmount
status
approvedBy
approvedAt
```

---

## 18.3 QuotationLineItem

```text
id
quotationId
courseId
quantity
unitPrice
discountAmount
taxAmount
lineTotal
```

---

## 18.4 SalesOrder

```text
id
salesOrderNumber
quotationId
corporateAccountId
orderDate
totalAmount
status
```

---

# 19. Finance & Receivables Model

## 19.1 Invoice

```text
id
invoiceNumber
invoiceType
studentProfileId
corporateAccountId
enrollmentId
invoiceDate
dueDate
currency
subtotal
discountAmount
taxAmount
totalAmount
paidAmount
outstandingAmount
status
```

Invoice types:

```text
StudentInvoice
CorporateInvoice
AdvanceInvoice
MilestoneInvoice
FinalInvoice
RefundInvoice
```

---

## 19.2 InvoiceLineItem

```text
id
invoiceId
enrollmentId
courseId
description
quantity
unitPrice
discountAmount
taxAmount
lineTotal
```

---

## 19.3 InstallmentPlan

```text
id
enrollmentId
invoiceId
planName
totalAmount
numberOfInstallments
status
```

---

## 19.4 Installment

```text
id
installmentPlanId
sequenceNumber
dueDate
amount
paidAmount
status
```

---

## 19.5 Payment

```text
id
paymentNumber
invoiceId
studentProfileId
corporateAccountId
paymentDate
paymentMethod
amount
referenceNumber
remarks
receivedBy
status
```

Payment methods:

```text
Cash
Bank Transfer
Card
Online
Cheque
Corporate Billing
```

---

## 19.6 Receipt

```text
id
receiptNumber
paymentId
receiptDate
amount
receiptUrl
issuedBy
```

---

## 19.7 Refund

```text
id
refundNumber
invoiceId
paymentId
refundType
amount
reason
requestedBy
approvedBy
status
```

Refund types:

```text
Full
Partial
```

---

## 19.8 Receivable

```text
id
invoiceId
corporateAccountId
studentProfileId
dueDate
outstandingAmount
agingBucket
status
```

Aging buckets:

```text
Current
30 Days
60 Days
90 Days
120+ Days
```

---

## 19.9 CorporateCreditRule

```text
id
corporateAccountId
creditLimit
blockOnCreditLimit
currentOutstanding
committedAmount
availableCredit
lastCalculatedAt
```

Rule:

```text
If credit limit exceeded and blockOnCreditLimit = true,
block enrollment.
```

---

# 20. Faculty / Trainer Model

## 20.1 TrainerProfile

```text
id
personId
branchId
trainerCode
trainerType
specialization
qualificationSummary
status
effectiveStartDate
effectiveEndDate
```

Trainer types:

```text
FullTime
PartTime
Freelance
```

---

## 20.2 TrainerQualification

```text
id
trainerId
qualificationName
institution
yearCompleted
documentId
```

---

## 20.3 TrainerAvailability

```text
id
trainerId
dayOfWeek
startTime
endTime
branchId
status
effectiveStartDate
effectiveEndDate
```

---

## 20.4 TrainerCompensationRate

```text
id
trainerId
batchId
sessionId
paymentBasis
amount
status
remarks
effectiveStartDate
effectiveEndDate
```

---

## 20.5 TrainerCourseAuthorization

```text
id
trainerId
courseId
status
effectiveStartDate
effectiveEndDate
```

Payment basis:

```text
Per Hour
Per Session
Per Student
Fixed
```

---

# 21. Exam, Result & Completion Model

## 21.1 Exam

```text
id
courseId
batchId
examName
examDate
maxMarks
passMarks
status
```

---

## 21.2 Result

```text
id
examId
enrollmentId
marksObtained
grade
resultStatus
recordedBy
recordedAt
```

---

## 21.3 CourseCompletion

```text
id
enrollmentId
completionStatus
attendancePercentage
examPassed
paymentCompleted
recommendedByTrainerId
approvedBy
approvedAt
remarks
```

---

## 21.4 CompletionApproval

```text
id
courseCompletionId
approvalLevel
approverUserId
status
remarks
approvedAt
```

Workflow:

```text
Trainer Recommendation
↓
Academic Coordinator Review
↓
Branch Manager Approval
```

---

# 22. Certificate Model

## 22.1 Certificate

```text
id
certificateNumber
enrollmentId
studentProfileId
courseId
batchId
issuedDate
issuedBy
certificateStatus
certificateUrl
verificationCode
qrCodeUrl
language
```

Rules:

```text
Single hardcoded certificate template for now.
Certificate requires completion eligibility.
Certificate requires payment validation where configured.
```

---

## 22.2 CertificateVerification

```text
id
certificateId
verificationCode
verifiedAt
verifiedByIp
verificationStatus
```

---

## 22.3 CertificateReissueRequest

```text
id
certificateId
requestedBy
reason
status
approvedBy
approvedAt
newCertificateId
```

---

# 23. Communication & Notification Model

## 23.1 CommunicationTemplate

```text
id
templateCode
channel
language
subject
body
bodyLocalized
status
```

Channels:

```text
Email
SMS
WhatsApp
SystemNotification
```

---

## 23.2 NotificationRequest

```text
id
templateId
recipientPersonId
recipientContact
channel
payload
status
scheduledAt
sentAt
```

---

## 23.3 NotificationLog

```text
id
notificationRequestId
deliveryStatus
providerMessageId
errorMessage
loggedAt
```

---

# 24. Document Management Model

## 24.1 Document

```text
id
ownerType
ownerId
documentType
fileName
fileUrl
issueDate
expiryDate
verificationStatus
uploadedBy
verifiedBy
verifiedAt
```

Owner types:

```text
Student
Trainer
Employee
Corporate
Person
```

---

## 24.2 DocumentVerification

```text
id
documentId
status
remarks
verifiedBy
verifiedAt
```

Statuses:

```text
Uploaded
PendingVerification
Approved
Rejected
Expired
```

---

# 25. Reporting & Dashboard Model

## 25.1 DashboardDefinition

```text
id
dashboardCode
name
description
requiredPermissionCode
status
```

Examples:

```text
dashboard.ceo
dashboard.finance
dashboard.sales
dashboard.training
```

---

## 25.2 DashboardWidget

```text
id
dashboardId
widgetCode
title
metricType
dataSource
refreshInterval
sortOrder
status
```

---

## 25.3 MetricSnapshot

```text
id
metricCode
branchId
periodType
periodStart
periodEnd
metricValue
metadata
createdAt
```

---

# 26. Audit & Compliance Model

## 26.1 AuditLog

```text
id
entityType
entityId
action
oldValue
newValue
performedBy
performedAt
ipAddress
reason
```

---

## 26.2 ApprovalRequest

```text
id
approvalType
entityType
entityId
requestedBy
currentApproverId
status
requestedAt
completedAt
```

Approval types:

```text
Refund
Discount
CourseCompletion
CertificateReissue
```

Future:

```text
Payroll
```

---

## 26.3 ApprovalHistory

```text
id
approvalRequestId
approverUserId
action
remarks
actionAt
```

---

# 27. Future Phase Models

## 27.1 HRMS

Future entities:

```text
EmployeeProfile
EmploymentContract
LeaveRequest
LeaveBalance
StaffAttendance
PerformanceRecord
HRDocument
```

---

## 27.2 Employee Self Service

Future entities:

```text
ESSRequest
LeaveApplication
PayslipAccess
SalaryCertificateRequest
EmployeeNotification
```

---

## 27.3 Payroll

Future entities:

```text
PayrollCycle
SalaryStructure
PayrollItem
Allowance
Deduction
Payslip
EOSBCalculation
BankTransferFile
PayrollApproval
```

---

## 27.4 Tally Integration

Future entities:

```text
TallySyncEvent
TallyVoucherMapping
TallySyncStatus
TallyReconciliationLog
```

Rules:

```text
Sync is real-time but asynchronous.
Sync must not affect API response time.
Failures handled through daily reconciliation.
```

---

## 27.5 Biometric Integration

Future entities:

```text
BiometricDevice
BiometricUserMapping
BiometricAttendanceLog
BiometricSyncBatch
BiometricSyncError
```

---

## 27.6 AI Intelligence

Future entities:

```text
LeadPrediction
CourseRecommendation
DropoutRiskPrediction
BatchDemandForecast
FeeCollectionForecast
FacultyUtilizationInsight
```

---

# 28. Master Data Workbook Mapping

The uploaded ASTI IMS Configuration Workbook should be mapped as follows.

| Workbook Sheet              | Target Entity / Context                    |
| --------------------------- | ------------------------------------------ |
| 01_Project_Information      | Institute                                  |
| 02_Branches                 | Branch                                     |
| 03_Departments              | Department                                 |
| 04_Users                    | User, Person                               |
| 05_Roles                    | Role, Permission Mapping                   |
| 06_Courses                  | Course                                     |
| 07_Course_Categories        | CourseCategory                             |
| 08_Trainers                 | Person, TrainerProfile                     |
| 09_Batches                  | Batch                                      |
| 10_Classrooms               | Classroom                                  |
| 11_Corporate_Clients        | Organization, CorporateAccount             |
| 12_Students                 | Person, StudentProfile                     |
| 13_Fee_Structure            | CoursePricing, FeePlan                     |
| 14_Discounts                | CourseDiscount                             |
| 15_Payment_Gateway          | Future Payment Integration Config          |
| 16_Email_Server             | Communication Provider Config              |
| 17_SMS_Gateway              | Communication Provider Config              |
| 18_WhatsApp_Business        | Communication Provider Config              |
| 19_Tally_Integration        | Future Tally Integration Config            |
| 20_Biometric                | Future Biometric Integration Config        |
| 21_Website_Content          | WebsitePage, WebsiteContent                |
| 22_Certificate_Templates    | Certificate Template Future                |
| 23_ID_Cards                 | StudentIDCard Config                       |
| 24_Notification_Preferences | CommunicationTemplate / Notification Rules |
| 25_User_Access_Matrix       | RolePermission, UserBranchAccess           |
| 26_Approval_Matrix          | ApprovalRequest Rules                      |
| 27_Project_Checklist        | Project Delivery Tracking                  |

---

# 29. Core Cardinality Summary

| Relationship                            | Cardinality  |
| --------------------------------------- | ------------ |
| Institute → Branch                      | 1 to many    |
| Branch → Department                     | 1 to many    |
| Department → Course                     | 1 to many    |
| Course → Batch                          | 1 to many    |
| Batch → Enrollment                      | 1 to many    |
| StudentProfile → Enrollment             | 1 to many    |
| Enrollment → InvoiceLineItem            | 1 to many    |
| Invoice → Payment                       | 1 to many    |
| Payment → Receipt                       | 1 to 1       |
| Enrollment → AttendanceRecord           | 1 to many    |
| Enrollment → CourseCompletion           | 1 to 1       |
| Enrollment → Certificate                | 1 to 1       |
| CorporateAccount → CorporateParticipant | 1 to many    |
| CorporateParticipant → StudentProfile   | 0 or 1       |
| CorporateAccount → Invoice              | 1 to many    |
| User → Role                             | many to many |
| Role → Permission                       | many to many |
| User → Branch                           | many to many |

---

# 30. Key Constraints

## 30.1 Enrollment Constraints

```text
courseId required
batchId required
studentProfileId required
resolvedPrice required
```

---

## 30.2 Pricing Resolution

```text
Batch Price
↓ if missing
Branch Price
↓ if missing
Global Course Price
```

---

## 30.3 Discount Resolution

```text
Batch Discount
↓ if missing
Branch Discount
↓ if missing
Global Course Discount
```

---

## 30.4 Corporate Credit Validation

```text
If blockOnCreditLimit = true
AND currentOutstanding + newEnrollmentValue > creditLimit
THEN block enrollment
```

---

## 30.5 Certificate Validation

```text
Completion approved = true
Payment validation passed = true
Certificate not already issued
```

---

## 30.6 Branch Access

```text
User can access only assigned branches.
Parent branch access can include child branches.
Dashboard access is permission-based.
```

---

# 31. Recommended Implementation Order

## Step 1: Foundation Tables

```text
Party
Person
Organization
Institute
Branch
Department
Classroom
User
Role
Permission
UserRole
RolePermission
UserBranchAccess
LookupType
LookupValue
NumberingSeries
```

---

## Step 2: Course & Training Tables

```text
CourseCategory
Course
CoursePricing
CourseDiscount
CourseCompletionRule
Batch
BatchTrainer
Session
WaitingList
```

---

## Step 3: CRM & Enrollment Tables

```text
Lead
FollowUp
LeadInteraction
Admission
StudentProfile
Enrollment
WalkInEnrollment
```

---

## Step 4: Finance Tables

```text
Invoice
InvoiceLineItem
InstallmentPlan
Installment
Payment
Receipt
Refund
Receivable
CorporateCreditRule
```

---

## Step 5: Corporate Tables

```text
CorporateAccount
CorporateContact
CorporateContract
CorporateParticipant
CorporateEnrollment
CorporateSalesLead
Quotation
QuotationLineItem
SalesOrder
```

---

## Step 6: Completion & Certificate Tables

```text
Exam
Result
CourseCompletion
CompletionApproval
Certificate
CertificateVerification
CertificateReissueRequest
```

---

## Step 7: Supporting Tables

```text
Document
DocumentVerification
CommunicationTemplate
NotificationRequest
NotificationLog
DashboardDefinition
DashboardWidget
MetricSnapshot
AuditLog
ApprovalRequest
ApprovalHistory
```

---

# 32. Final Recommendation

This ER Model v3 should be used as the baseline for:

1. Prisma schema design
2. Database migration planning
3. API contract planning
4. Master data import mapping
5. UI screen-level data mapping

The most important design decisions are:

* Enrollment is central.
* Course and batch are mandatory for enrollment.
* Finance is invoice-centric.
* Corporate participant becomes student when enrolled.
* Pricing and discount hierarchy must be enforced.
* Branch-level access must be enforced from the start.
* Master data workbook should directly map to configuration and seed data tables.
