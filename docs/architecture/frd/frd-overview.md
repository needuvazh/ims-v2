# Functional Requirement Document

## Institute Management System (IMS)

**Version:** 3.0
**Part:** 1
**Scope:** Single-client implementation
**Excluded:** Tenant Setup, SaaS Subscription Management, CMS / Website Builder
**Based On:** BRD, DDD Context Map v3.0, Domain Data Model v2.0

---

# 1. FRD Purpose

This Functional Requirement Document defines detailed functional behavior for the IMS platform.

It explains:

* Modules
* Screens
* Fields
* User actions
* Business rules
* Permissions
* Validations
* Notifications
* Reports
* Acceptance criteria

This document will guide:

* UI design
* API design
* Database schema
* User story creation
* QA test case preparation
* Sprint planning

---

# 2. FRD Standards

## 2.1 Canonical Terminology

Use these terms consistently across FRD, APIs, UI, and schema discussions:

* `Lead` for a managed prospect record
* `Inquiry` for the intake record before qualification
* `Admission` for the pre-enrollment approval record
* `Enrollment` for the central learning lifecycle record
* `Student` for the learner profile master record
* `Corporate Participant` for a corporate learner before linked student profile creation
* `Walk-In` for the special short-duration orchestration path, not a separate lifecycle
* `Course` for the training offering definition
* `Batch` for the deliverable training group
* `Branch` for the operational partition boundary
* `Completion` for the eligibility and approval outcome before certificate issuance
* `Certificate` for the issued proof of completion

## 2.2 Writing Rules

Every module FRD shall include:

* Business purpose
* Owned bounded context
* Scope
* Owned concepts
* Lifecycle rules
* Screens
* Functional requirements
* Audit events
* Domain errors
* Reporting views
* FRD improvement notes

Every screen section shall include:

* Purpose
* Fields or columns
* Actions
* Permissions
* Business rules
* Validations where relevant

Every stateful requirement shall specify:

* Allowed transitions
* Disallowed transitions
* Audit expectation
* Error conditions

## 2.3 Module Ownership Rules

* One module owns one bounded context.
* Other modules may reference the owner by ID, but they must not mutate that lifecycle directly.
* Read models are not ownership boundaries.
* UI visibility is not authorization.
* Branch scope must be enforced server-side where relevant.

## 2.4 Standard Module Template

Use the following template for every module:

```text
1. Module header
2. Business purpose
3. Scope
4. Business principles
5. Owned concepts
6. Business model / lifecycle rules
7. Screens
8. Functional requirements
9. Audit events
10. Domain errors
11. Reporting and operational views
12. FRD improvement notes
```

## 2.5 Traceability Matrix

| FRD Module | DDD Bounded Context | Primary Data Ownership |
| --- | --- | --- |
| Module 1: Identity & Access Management | Identity & Access Management | User, Role, Permission, Menu, AccessPolicy |
| Module 2: Organization Management | Organization Management | Institute, Branch, Department, Classroom |
| Module 3: Lead & Inquiry Management | Lead, Enquiry & CRM Management | Inquiry, Lead, LeadSource, LeadStage, FollowUp, Campaign |
| Module 4: Admission & Enrollment Management | Admission & Enrollment Management | Admission, Enrollment, Student, StudentIdentity, StudentIDCard |
| Module 5: Student Management | Admission & Enrollment Management | Student profile, identity fields, portal access, emergency contact |
| Module 6: Course & Batch Management | Course Catalog Management & Training Delivery Management | Course, CoursePricing, CourseCompletionRule, Batch, BatchTrainer, WaitingList |
| Module 7: Scheduling & Timetable Management | Scheduling, Calendar & Holiday Management | Schedule, ScheduleSession, TrainerAvailability, Holiday, VenueBlock |
| Module 8: Attendance Management | Attendance Management | AttendanceSession, AttendanceRecord, AttendanceCorrection, AttendanceAlert |
| Module 9: Fee & Finance Management | Fee, Billing & Receivables Management | FeePlan, Invoice, InstallmentPlan, Payment, Receipt, Discount, Refund |
| Module 10: Faculty / Trainer Management | Faculty / Trainer Management | Trainer, TrainerQualification, TrainerDocument, TrainerAvailability, TrainerAssignment |
| Module 11: Corporate Training Management | Corporate Training Management & Corporate Sales & Quotation | CorporateAccount, CorporateContact, CorporateContract, CorporateProgram, CorporateParticipant, Quotation, SalesOrder |
| Module 12: Exam, Result & Completion Management | Exam, Result & Completion Management | CourseExam, ExamResult, CompletionEvaluation, CourseCompletion, CompletionApproval |
| Module 13: Certificate Management | Certificate Management | Certificate, CertificateIssueLog, CertificateVerification |
| Module 14: Document Management | Document Management | DocumentType, Document, DocumentOwner, DocumentVerification |
| Module 15: Communication Management | Communication & Notification Management | CommunicationTemplate, CommunicationLog, NotificationRequest |
| Module 16: Reports & Dashboard Management | Reporting & Executive Dashboards | ReportDefinition, DashboardWidget, MetricSnapshot |
| Module 17: Identity, Access Control & Security Management (RBAC) | Identity & Access Management | User, Role, Permission, UserRole, RolePermission, AccessPolicy |
| Module 18: Audit, Compliance & Activity Tracking | Audit & Compliance | AuditLog, ApprovalRequest, ComplianceEvent |
| Module 19: Lead, Inquiry & CRM Management | Lead, Enquiry & CRM Management | Inquiry, Lead, LeadSource, LeadStage, FollowUp, Campaign |
| - | Configuration / Master Data | ConfigurationItem, LookupType, NumberingSeries, BusinessCalendar |
| - | Website & Digital Experience | PublicCoursePage, WebsiteInquiry, OnlineRegistration, SEOPageMetadata |
| - | Walk-In Fast Track Enrollment | WalkInEnrollment, WalkInPayment, WalkInCompletion, WalkInConfirmation |

---

# 3. Phase 1 Functional Scope

Phase 1 focuses on core institute operations.

## Phase 1 Modules

1. Identity & Access Management
2. Organization Management
3. Configuration / Master Data
4. Website & Digital Experience
5. Lead, Enquiry & CRM Management
6. Admission & Enrollment Management
7. Walk-In Fast Track Enrollment
8. Course Catalog Management
9. Training Delivery / Batch Management
10. Scheduling, Calendar & Holiday Management
11. Attendance Management (Manual)
12. Fee, Billing & Receivables Management (Manual Payments)
13. Certificate Management
14. Document Management
15. Basic Reporting & Dashboard
16. Audit & Compliance

---

# 4. Phase 2 Functional Scope

Phase 2 extends the platform with supporting operational and analytical capabilities.

## Phase 2 Modules

1. Communication & Notification Management
2. Corporate Training Management
3. Corporate Sales & Quotation
4. Advanced Finance & Receivables
5. Advanced Reporting & Executive Dashboards

---

# 5. Out of Scope for Phase 1

The following are excluded from Phase 1:

* Tenant Setup
* SaaS Subscription Management
* CMS / Website Builder (Content Editing)
* Online Payment Gateway (Phase 2 / Final Phase)
* WhatsApp API Integration
* SMS API Integration
* Email Campaign Automation
* Full Payroll Processing (Phase 3)
* HRMS & Employee Self Service (Phase 3)
* AI Features (Future Phase)
* Mobile App
* Tally Integration (Phase 3)
* Biometric / QR / RFID Attendance (Phase 3)

---

# 6. Common Functional Standards

## 6.1 Common List Screen Features

Most list screens should support:

* Search
* Filter
* Sort
* Pagination
* Export if permitted
* View details
* Create
* Edit
* Activate / Deactivate
* Audit history where applicable

---

## 6.2 Common Form Features

Most forms should support:

* Required field validation
* Duplicate validation
* Field length validation
* Status selection
* Save as draft where applicable
* Submit / Confirm action where applicable
* Cancel action
* Error messages
* Success messages

---

## 6.3 Common Audit Rules

The system shall record audit logs for:

* Create
* Update
* Delete / Soft delete
* Status change
* Approval
* Rejection
* Payment action
* Attendance modification
* Certificate generation

Audit log should capture:

```text
User
Action
Entity
Old Value
New Value
Timestamp
Reason if applicable
```

---

# 5. Module 1: Identity & Access Management

## 5.1 Business Purpose

Identity & Access Management controls user login, role management, permissions, menu visibility, and action-level access.

The system must not depend on hardcoded roles for authorization.

---

## 5.2 Users Covered

The system should support the following user classifications:

```text
Owner
Admin
Branch Manager
Counselor
Trainer
Accountant
Student
Corporate Focal
Academic Coordinator
Management
```

User classification is only for grouping. Actual access must be controlled through dynamic roles and permissions.

---

## 5.3 Screens

### IAM-UI-001 Login Screen

Purpose: Allow authorized users to access the system.

Fields:

```text
Email
Password
Remember Me
```

Actions:

```text
Login
Forgot Password
```

Validations:

* Email is required.
* Password is required.
* Invalid credentials should show generic error.
* Inactive users must not login.

Acceptance Criteria:

```text
Given a valid active user
When the user enters correct email and password
Then the system logs in the user and redirects to dashboard

Given an inactive user
When the user tries to login
Then the system denies access
```

---

### IAM-UI-002 User List Screen

Purpose: View and manage system users.

Columns:

```text
User Name
Email
Phone
User Type
Branch
Status
Last Login
Actions
```

Actions:

```text
Create User
View User
Edit User
Activate
Deactivate
Assign Role
Reset Password
```

Filters:

```text
Branch
User Type
Status
Role
```

Permissions:

```text
USER_VIEW
USER_CREATE
USER_EDIT
USER_DEACTIVATE
USER_ASSIGN_ROLE
USER_RESET_PASSWORD
```

---

### IAM-UI-003 Create / Edit User Screen

Fields:

```text
Full Name
Email
Phone
Branch
User Type
Status
Effective Start Date
Effective End Date
```

Business Rules:

* Email must be unique.
* User must be assigned to at least one branch where applicable.
* User can have one or more roles.
* Deactivated users cannot login.
* Student login users may be created from Student Management.

Validations:

* Full Name is required.
* Email is required.
* Email format must be valid.
* User Type is required.
* Branch is required except for Owner / Management-level users.

---

### IAM-UI-004 Role List Screen

Columns:

```text
Role Name
Description
Status
Effective Start Date
Effective End Date
Actions
```

Actions:

```text
Create Role
Edit Role
View Permissions
Activate
Deactivate
```

Permissions:

```text
ROLE_VIEW
ROLE_CREATE
ROLE_EDIT
ROLE_DEACTIVATE
```

---

### IAM-UI-005 Create / Edit Role Screen

Fields:

```text
Role Name
Description
Status
Effective Start Date
Effective End Date
```

Business Rules:

* Role name must be unique.
* Role cannot be deleted if assigned to active users.
* Role can be deactivated.
* Deactivated role should not be assignable to new users.

---

### IAM-UI-006 Permission Assignment Screen

Purpose: Assign permissions to roles.

Sections:

```text
Module Permissions
Menu Permissions
Action Permissions
Report Permissions
```

Example Permissions:

```text
LEAD_VIEW
LEAD_CREATE
LEAD_EDIT
LEAD_CONVERT
STUDENT_VIEW
STUDENT_CREATE
ENROLLMENT_CREATE
PAYMENT_CREATE
REFUND_REQUEST
REFUND_APPROVE
CERTIFICATE_GENERATE
```

Actions:

```text
Add Permission
Remove Permission
Save Permission Set
```

Business Rules:

* Only active permissions can be assigned.
* Permission changes should apply after next login or session refresh.
* Permission updates must be audited.

---

## 5.4 Functional Requirements

### FR-IAM-001 User Login

The system shall allow users to login using email and password.

### FR-IAM-002 User Management

The system shall allow authorized users to create, update, activate, and deactivate users.

### FR-IAM-003 Dynamic Role Management

The system shall allow authorized users to create and manage roles dynamically.

### FR-IAM-004 Permission Management

The system shall allow permissions to be assigned to roles.

### FR-IAM-005 User Role Assignment

The system shall allow one or more roles to be assigned to a user.

### FR-IAM-006 Access Enforcement

The system shall enforce access based on assigned permissions.

### FR-IAM-007 Branch Data Scope

Branch managers shall only access data for assigned branches unless granted broader permission.

### FR-IAM-008 Counselor Data Scope

Counselors shall primarily access assigned leads unless granted broader branch lead access.

---

# 6. Module 2: Organization Management

## 6.1 Business Purpose

Based on the DDD model, Organization Management is the master domain responsible for defining the institute hierarchy and operational structure used by all other domains.

The organization hierarchy provides the ownership and data-partitioning structure for:

* Users
* Leads
* Admissions
* Students
* Courses
* Batches
* Schedules
* Attendance
* Finance
* Faculty
* Reports

The hierarchy shall support:

```text
Institute
 └── Branch
      └── Department
           └── Classroom
```

All operational records must belong to a branch and may optionally belong to a department depending on the business process.

---

## 6.2 Organization Hierarchy

### Organization Structure

The system shall support the following hierarchy:

```text
Institute
 ├── Branch A
 │    ├── Academic Department
 │    ├── Finance Department
 │    ├── Sales Department
 │    └── Classrooms
 │
 ├── Branch B
 │    ├── Academic Department
 │    ├── Finance Department
 │    └── Classrooms
 │
 └── Branch C
```

### Hierarchy Rules

* One Institute can have multiple Branches.
* One Branch can have multiple Departments.
* One Branch can have multiple Classrooms.
* Departments belong to a single Branch.
* Classrooms belong to a single Branch.
* Courses, Batches, Faculty, Students, Leads, and Enrollments must reference a Branch.
* Branch deactivation must not affect historical records.
* Historical hierarchy references must remain available for reporting and auditing.

---

## 6.3 Screens

### ORG-UI-001 Institute Profile Screen

Purpose: Maintain institute-level information.

Fields:

```text
Institute Name
Institute Code
Registration Number
Tax Number
Primary Email
Primary Phone
Website
Address
Country
Status
```

Actions:

```text
View
Edit
Save
```

Permissions:

```text
INSTITUTE_VIEW
INSTITUTE_EDIT
```

Business Rules:

* Single institute record for Phase 1.
* Institute code must be unique.
* Institute cannot be deleted.

---

### ORG-UI-002 Branch List Screen

Columns:

```text
Branch Code
Branch Name
City
Phone
Email
Status
Actions
```

Actions:

```text
Create Branch
View Branch
Edit Branch
Activate
Deactivate
```

Filters:

```text
Status
City
```

Permissions:

```text
BRANCH_VIEW
BRANCH_CREATE
BRANCH_EDIT
BRANCH_DEACTIVATE
```

---

### ORG-UI-003 Create / Edit Branch Screen

Fields:

```text
Institute
Branch Name
Branch Code
Address
City
Country
Phone
Email
Branch Manager
Status
Effective Start Date
Effective End Date
```

Business Rules:

* Branch belongs to the Institute.
* Branch code must be unique.
* Branch manager may be assigned.
* Inactive branches should not be available for new admissions, batches, schedules, or enrollments.
* Existing historical records must remain available for reporting.

Validations:

* Branch Name is required.
* Branch Code is required.
* Country is required.
* Email must be valid if provided.

---

### ORG-UI-004 Department List Screen

Columns:

```text
Department Code
Department Name
Branch
Department Head
Status
Actions
```

Actions:

```text
Create Department
View Department
Edit Department
Activate
Deactivate
```

Filters:

```text
Branch
Status
```

Permissions:

```text
DEPARTMENT_VIEW
DEPARTMENT_CREATE
DEPARTMENT_EDIT
DEPARTMENT_DEACTIVATE
```

---

### ORG-UI-005 Create / Edit Department Screen

Fields:

```text
Branch
Department Name
Department Code
Department Head
Description
Status
Effective Start Date
Effective End Date
```

Business Rules:

* Department belongs to a branch.
* Department code must be unique within a branch.
* Department head may be assigned.
* Inactive departments should not allow new course creation where department ownership is required.

---

### ORG-UI-006 Classroom List Screen

Columns:

```text
Classroom Name
Branch
Capacity
Location
Status
Actions
```

Actions:

```text
Create Classroom
Edit Classroom
Activate
Deactivate
```

Filters:

```text
Branch
Status
```

Permissions:

```text
CLASSROOM_VIEW
CLASSROOM_CREATE
CLASSROOM_EDIT
CLASSROOM_DEACTIVATE
```

---

### ORG-UI-007 Create / Edit Classroom Screen

Fields:

```text
Branch
Classroom Name
Capacity
Location
Status
Effective Start Date
Effective End Date
```

Business Rules:

* Classroom belongs to a branch.
* Classroom capacity should be used during schedule planning.
* Inactive classrooms should not be available for new sessions.

---

### ORG-UI-008 Organization Hierarchy View

Purpose: Visual representation of the institute structure.

Display:

```text
Institute
 └── Branches
      └── Departments
           └── Classrooms
```

Actions:

```text
Expand
Collapse
View Details
Navigate to Entity
```

Permissions:

```text
ORGANIZATION_VIEW
```

---

## 6.4 Functional Requirements

### FR-ORG-001 Institute Management

The system shall maintain a single institute profile for the implementation.

### FR-ORG-002 Branch Management

The system shall allow authorized users to create, update, activate, and deactivate branches.

### FR-ORG-003 Department Management

The system shall allow authorized users to manage departments under branches.

### FR-ORG-004 Classroom Management

The system shall allow authorized users to manage classrooms under branches.

### FR-ORG-005 Organization Hierarchy

The system shall maintain the hierarchy of Institute → Branch → Department → Classroom.

### FR-ORG-006 Effective Dating

The system shall support effective start date and effective end date for branches, departments, and classrooms.

### FR-ORG-007 Historical Reporting

The system shall preserve historical records even if institute entities become inactive.

### FR-ORG-008 Branch Ownership

The system shall require operational records to be associated with a branch.

### FR-ORG-009 Organizational Reference Integrity

The system shall prevent deletion of organizational entities that are referenced by operational records.

### FR-ORG-010 Organizational Structure View

The system shall provide a hierarchical view of the organization structure.

---

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
