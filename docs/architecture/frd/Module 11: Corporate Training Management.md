# Functional Requirement Document

## Module 11: Corporate Training Management

**Version:** 1.1
**Module Code:** COR
**Phase:** Phase 2
**Owned Bounded Context:** Corporate Training Management

**Dependencies:**

* Lead & Inquiry Management
* Admission & Enrollment Management
* Course & Batch Management
* Scheduling & Timetable Management
* Faculty / Trainer Management
* Fee & Finance Management
* Identity & Access Management

**Provides Data To:**

* Admission & Enrollment Management
* Fee & Finance Management
* Scheduling & Timetable Management
* Attendance Management
* Exam, Result & Completion Management
* Certificate Management
* Reporting & Dashboards
* Audit & Compliance

---

# 1. Business Purpose

Corporate Training Management manages corporate customer accounts, contracts, training programs, corporate participants, delivery arrangements, and corporate billing references.

The context owns the corporate business relationship and the corporate training engagement model.

Learner execution still uses the shared Enrollment lifecycle. This module does not own a separate learner lifecycle.

---

# 2. Scope

## 2.1 In Scope

* Corporate account management
* Corporate contact management
* Corporate contract management
* Corporate training program management
* Corporate participant management
* Corporate participant import
* Corporate delivery location tracking
* Corporate batch reference tracking
* Corporate billing reference tracking
* Corporate attendance and completion reporting views
* Corporate certificate branding metadata

## 2.2 Out of Scope for Phase 1

* Corporate portal
* External customer self-service portal
* Payroll
* Separate corporate learner lifecycle
* Marketing automation

---

# 3. Business Principles

* Corporate customer is the account owner for the engagement.
* A corporate contract may have one or more programs.
* A program may have one or more batches.
* Corporate participants are not automatically students.
* A corporate participant is linked to a Student profile only when individual lifecycle tracking, login access, certificates, or future enrollments are required.
* Corporate participants may be imported in bulk.
* Corporate batches may not appear in public enrollment.
* Corporate delivery uses the shared Enrollment and Attendance flows.
* Corporate billing follows contract-driven rules.
* Corporate reporting must preserve contract, program, and participant lineage.
* Corporate credit exposure must be validated before confirming a corporate program, cohort, or sponsored participant enrollment.
* Credit exposure includes unpaid invoiced balance plus active committed uninvoiced value.

## 3.1 Credit Limit Invariant

Corporate Training shall coordinate with Finance to evaluate:

```text
availableCredit = creditLimit - (unpaidBalance + committedUninvoicedValue)
estimatedEnrollmentCost <= availableCredit
```

If the invariant fails, the system shall return `CreditLimitExceeded` or route the request to an approved override workflow when ASTI confirms that policy.

---

# 4. Owned Concepts

The Corporate Training context owns:

* CorporateAccount
* CorporateContactPerson
* CorporateContract
* CorporateProgram
* CorporateParticipant
* CorporateBatchReference
* CorporateBillingProfile
* CorporateDeliveryLocation

Notes:

* Enrollment is still owned by Admission & Enrollment Management.
* Attendance is still owned by Attendance Management.
* Completion is still owned by Exam, Result & Completion Management.
* Certificates are still owned by Certificate Management.

---

# 5. Business Model

## 5.1 Corporate Account Lifecycle

```text
Lead
  ↓
Prospect
  ↓
Customer
  ↓
Inactive
```

Rules:

* Lead-to-customer conversion may be supported through qualified lead handoff.
* Inactive customers remain available historically.

## 5.2 Corporate Contract Lifecycle

```text
Draft
  ↓
Active
  ↓
Completed
  ↓
Closed
```

Alternative:

```text
Active
  ↓
Cancelled
```

Rules:

* Contract number must be unique.
* One customer may have multiple contracts.
* Contract expiry should generate alerts.
* Contract cannot be deleted after activation.

## 5.3 Program Lifecycle

```text
Planned
  ↓
Active
  ↓
Completed
  ↓
Cancelled
```

Rules:

* Program belongs to a contract.
* Multiple programs per contract are allowed.
* A program references the course and delivery pattern used for the engagement.

## 5.4 Corporate Participant Lifecycle

```text
Imported
  ↓
Active
  ↓
Inactive
```

Rules:

* Participants may be linked to Student profiles.
* Student creation is optional and only happens when required.
* Bulk import is supported.
* Duplicate detection is required on import and create.

---

# 6. Screens

## COR-UI-001 Corporate Customer List

### Purpose

View and manage corporate customers.

### Columns

```text
Customer Code
Company Name
Industry
Primary Contact
Phone
Email
Status
Active Contracts
Actions
```

### Filters

```text
Industry
Status
Country
Contract Status
Search
```

### Actions

```text
Create Customer
View Customer
Edit Customer
Deactivate
View Contracts
```

### Permissions

```text
CORPORATE_VIEW
CORPORATE_CREATE
CORPORATE_EDIT
CORPORATE_DEACTIVATE
```

---

## COR-UI-002 Corporate Customer Screen

### Fields

```text
Customer Code
Company Name
Trade License Number
Industry
Website
Phone
Email
Address
Country
City
Tax Registration Number
Preferred Currency
Notes
Status
```

### Business Rules

* Customer code must be auto-generated.
* Company name must be unique.
* Multiple contracts are allowed.
* Multiple contacts are allowed.

---

## COR-UI-003 Contact Person Screen

### Fields

```text
Full Name
Designation
Department
Email
Phone
Mobile
Primary Contact
Status
```

### Business Rules

* One primary contact is mandatory.
* Multiple contacts are supported.

---

## COR-UI-004 Contract List

### Columns

```text
Contract Number
Customer
Contract Value
Start Date
End Date
Status
Actions
```

### Actions

```text
Create Contract
View Contract
Edit Contract
Renew Contract
Close Contract
```

---

## COR-UI-005 Contract Screen

### Contract Information

```text
Contract Number
Corporate Customer
Contract Value
Currency
Start Date
End Date
Renewal Date
Status
```

### Billing Model

```text
Per Student
Per Batch
Per Hour
Fixed Contract Value
```

### SLA Information

```text
Response SLA
Delivery SLA
Special Conditions
```

### Business Rules

* Contract number must be unique.
* One customer may have multiple contracts.
* Contract cannot be deleted after activation.
* Contract expiry should trigger alerts.

---

## COR-UI-006 Program Management

### Purpose

Represents a training engagement under a contract.

### Fields

```text
Program Name
Contract
Course
Delivery Location
Start Date
End Date
Status
```

### Business Rules

* Program belongs to contract.
* Multiple programs per contract are allowed.
* Program must reference the course and branch/corporate delivery location used for execution.

---

## COR-UI-007 Corporate Batch Reference

### Additional Fields

```text
Corporate Customer
Contract Reference
Program Reference
Delivery Location
Branch
Batch Reference
```

### Business Rules

* Corporate batches may not appear in public enrollment.
* Corporate participants may bypass lead workflow.
* Batch references must point to batches managed by Course & Batch Management.

---

## COR-UI-008 Participant List

### Columns

```text
Employee Code
Employee Name
Department
Designation
Email
Phone
Status
Actions
```

### Actions

```text
Add Participant
Import Participants
Link Student Profile
Remove Participant
```

### Permissions

```text
CORPORATE_PARTICIPANT_CREATE
CORPORATE_PARTICIPANT_EDIT
CORPORATE_PARTICIPANT_IMPORT
CORPORATE_PARTICIPANT_LINK_STUDENT
```

---

## COR-UI-009 Participant Screen

### Fields

```text
Employee Code
Employee Name
Email
Phone
Department
Designation
Status
Linked Student
```

### Business Rules

* Participant may be linked to a Student profile.
* Student creation is optional.
* Participant linkage must preserve history.

---

## COR-UI-010 Import Participants

### Supported Formats

```text
Excel
CSV
```

### Import Fields

```text
Employee Code
Employee Name
Email
Phone
Department
Designation
```

### Business Rules

* Validation must run before import.
* Duplicate detection is required.
* Error report must be downloadable.

---

## COR-UI-011 Completion Dashboard

### Metrics

```text
Participants
Completed
Pending
Failed
Dropped
```

### Business Rules

* Completion data is consumed from the completion module.
* Completion rules follow the course rules for the underlying enrollment.

---

## COR-UI-012 Invoice Management

### Invoice Types

```text
Advance Invoice
Milestone Invoice
Final Invoice
```

### Fields

```text
Invoice Number
Customer
Contract
Program
Amount
Tax
Due Date
Status
```

### Business Rules

* Multiple invoices per contract are allowed.
* Invoice is linked to contract.
* Outstanding balances are tracked separately in Finance.

---

# 7. Functional Requirements

## FR-COR-001 Corporate Customer Creation

The system shall support corporate customer management.

## FR-COR-002 Contact Management

The system shall support multiple corporate contacts.

## FR-COR-003 Contract Management

The system shall support contract lifecycle management.

## FR-COR-004 Billing Models

The system shall support configurable contract billing models.

## FR-COR-005 Program Management

The system shall support corporate training programs.

## FR-COR-006 Corporate Batch Reference

The system shall support corporate batch references.

## FR-COR-007 Participant Management

The system shall support participant management.

## FR-COR-008 Participant Import

The system shall support participant bulk import.

## FR-COR-009 Link Student Profile

The system shall allow participant linkage to a Student profile when required.

## FR-COR-010 Reporting Summary

The system shall support corporate attendance, completion, and billing summaries.

## FR-COR-011 Corporate Certificate Support

The system shall support corporate certificate branding metadata.

## FR-COR-012 Corporate Billing

The system shall support corporate invoicing references.

## FR-COR-013 Contract Renewal Tracking

The system shall support renewal monitoring.

---

# 8. Audit Events

The following audit events shall be supported:

```text
CorporateCustomerCreated
CorporateCustomerUpdated
CorporateCustomerDeactivated
CorporateContactAdded
CorporateContactUpdated
CorporateContractCreated
CorporateContractUpdated
CorporateContractRenewed
CorporateContractClosed
CorporateProgramCreated
CorporateProgramUpdated
CorporateParticipantAdded
CorporateParticipantImported
CorporateParticipantLinkedToStudent
CorporateBatchReferenceCreated
CorporateInvoiceCreated
CorporateInvoiceUpdated
CorporateCertificateMetadataUpdated
```

Rules:

* Corporate account, contract, program, and participant changes must be audited.
* Participant linkage to Student must be auditable.

---

# 9. Domain Errors

The module shall distinguish between validation and business-rule errors such as:

```text
CorporateCustomerAlreadyExists
CorporateContactMissing
CorporateContractInactive
CorporateContractAlreadyClosed
CorporateProgramInactive
CorporateParticipantAlreadyExists
CorporateParticipantImportFailed
CorporateParticipantLinkNotAllowed
CorporateBatchReferenceInvalid
CorporateInvoiceAlreadyExists
DuplicateCorporateContactDetected
BranchInactive
CourseInactive
StudentLinkRequired
StudentProfileInactive
InvalidDeliveryLocation
```

---

# 10. Reporting and Operational Views

The Corporate Training context shall support the following read views:

```text
Customer Report
Contract Report
Program Report
Participant Report
Attendance Summary
Completion Summary
Invoice Report
Revenue Report
Renewal Report
```

These are read models and reporting views, not separate owned entities.

---

# 11. FRD Improvement Notes

This module should remain the single source of truth for:

* corporate customer accounts
* contracts
* training programs
* participant records
* participant-to-student linkage
* corporate billing references

It should not own attendance marking, completion approval, certificate issuance, or a separate learner lifecycle.
