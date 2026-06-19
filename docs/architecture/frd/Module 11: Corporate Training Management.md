# Functional Requirement Document (FRD)

## Module 11: Corporate Training Management

**Version:** 1.0
**Module Code:** COR

**Dependencies:**

* Lead Management
* Student Management
* Course & Batch Management
* Scheduling Management
* Trainer Management
* Fee & Finance Management

**Provides Data To:**

* Corporate Billing
* Attendance
* Completion
* Certificate Management
* Reporting
* Future Corporate Portal

---

# 1. Business Purpose

Corporate Training Management is responsible for managing corporate customers, contracts, training programs, participants, billing, training delivery, and reporting.

The module shall support:

* Corporate Customer Management
* Corporate Contact Management
* Corporate Contracts
* Corporate Training Programs
* Corporate Participants
* Corporate Batch Management
* Corporate Billing
* Corporate Attendance Tracking
* Corporate Completion Reporting
* Corporate Portal Support

---

# 2. Corporate Training Architecture

```text
Corporate Customer
         ↓
Contact Person
         ↓
Contract
         ↓
Training Program
         ↓
Corporate Batch
         ↓
Participants
         ↓
Attendance
         ↓
Completion
         ↓
Certificate
         ↓
Invoice
```

---

# 3. Corporate Customer Lifecycle

```text
Lead
  ↓
Prospect
  ↓
Customer
  ↓
Active Contract
  ↓
Completed Contract
```

Alternative:

```text
Customer
   ↓
Inactive
```

---

# 4. Corporate Customer Management

## COR-UI-001 Corporate Customer List

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

# 5. Create Corporate Customer

## COR-UI-002 Corporate Customer Screen

### Company Information

Fields:

```text
Customer Code
Company Name
Trade License Number
Industry
Website
```

---

### Contact Information

Fields:

```text
Phone
Email
Address
Country
City
```

---

### Additional Information

Fields:

```text
Tax Registration Number
Preferred Currency
Notes
Status
```

---

### Business Rules

* Customer Code auto-generated.
* Company Name unique.
* Multiple contracts allowed.
* Multiple contacts allowed.

---

# 6. Corporate Contact Management

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
```

---

### Examples

```text
HR Manager
Training Manager
Operations Manager
HSE Manager
```

---

### Business Rules

* One primary contact mandatory.
* Multiple contacts supported.

---

# 7. Contract Management

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

# 8. Create Contract

## COR-UI-005 Contract Screen

### Contract Information

Fields:

```text
Contract Number
Corporate Customer
Contract Value
Currency
Start Date
End Date
Renewal Date
```

---

### Billing Model

Options:

```text
Per Student
Per Batch
Per Hour
Fixed Contract Value
```

---

### SLA Information

Fields:

```text
Response SLA
Delivery SLA
Special Conditions
```

---

### Business Rules

* Contract Number unique.
* One customer may have multiple contracts.
* Contract cannot be deleted after activation.
* Contract expiry should trigger alerts.

---

# 9. Corporate Training Program

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

---

### Status

```text
Planned
Active
Completed
Cancelled
```

---

### Business Rules

* Program belongs to contract.
* Multiple programs per contract allowed.

---

# 10. Corporate Batch Management

## COR-UI-007 Corporate Batch

### Additional Fields

```text
Corporate Customer
Contract Reference
Program Reference
Delivery Location
```

---

### Delivery Locations

```text
Institute Branch
Customer Site
Virtual
```

---

### Business Rules

* Corporate batches may not appear in public enrollment.
* Corporate participants may bypass lead workflow.

---

# 11. Corporate Participant Management

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

---

### Actions

```text
Add Participant
Import Participants
Enroll Participant
Remove Participant
```

---

### Permissions

```text
CORPORATE_PARTICIPANT_CREATE
CORPORATE_PARTICIPANT_EDIT
CORPORATE_PARTICIPANT_IMPORT
```

---

# 12. Add Participant

## COR-UI-009 Participant Screen

### Fields

```text
Employee Code
Employee Name
Email
Phone
Department
Designation
```

---

### Business Rules

* Participant may be linked to Student Profile.
* Student creation optional.
* Bulk import supported.

---

# 13. Participant Import

## COR-UI-010 Import Participants

### Supported Formats

```text
Excel
CSV
```

---

### Import Fields

```text
Employee Code
Employee Name
Email
Phone
Department
Designation
```

---

### Business Rules

* Validation before import.
* Duplicate detection required.
* Error report downloadable.

---

# 14. Corporate Attendance Tracking

Corporate programs require dedicated reporting.

### Attendance Metrics

```text
Attendance %
Present Sessions
Absent Sessions
Completion Status
```

---

### Business Rules

* Attendance sourced from Attendance Module.
* Attendance available by:

  * Contract
  * Program
  * Customer

---

# 15. Corporate Completion Tracking

## COR-UI-011 Completion Dashboard

### Metrics

```text
Participants
Completed
Pending
Failed
Dropped
```

---

### Business Rules

Completion follows course rules.

---

# 16. Corporate Certificate Management

Certificates should support:

```text
Corporate Branding
Customer Name
Program Name
```

---

### Business Rules

* Certificate generated from Completion Module.
* Corporate customer visible on certificate if configured.

---

# 17. Corporate Billing

## COR-UI-012 Invoice Management

### Invoice Types

```text
Advance Invoice
Milestone Invoice
Final Invoice
```

---

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

---

### Business Rules

* Multiple invoices per contract.
* Invoice linked to contract.
* Outstanding tracked separately.

---

# 18. Corporate Portal Support

Future-ready architecture required.

Corporate Focal should eventually access:

```text
Employees
Attendance
Completion
Certificates
Invoices
Reports
```

---

### Phase 1

Internal access only.

Portal excluded.

---

# 19. Functional Requirements

## FR-COR-001 Corporate Customer Creation

The system shall support corporate customer management.

---

## FR-COR-002 Contact Management

The system shall support multiple corporate contacts.

---

## FR-COR-003 Contract Management

The system shall support contract lifecycle management.

---

## FR-COR-004 Contract Billing Models

The system shall support configurable billing models.

---

## FR-COR-005 Program Management

The system shall support corporate training programs.

---

## FR-COR-006 Corporate Batch Support

The system shall support corporate-specific batches.

---

## FR-COR-007 Participant Management

The system shall support participant management.

---

## FR-COR-008 Participant Import

The system shall support participant bulk import.

---

## FR-COR-009 Attendance Tracking

The system shall support corporate attendance tracking.

---

## FR-COR-010 Completion Tracking

The system shall support completion tracking.

---

## FR-COR-011 Corporate Certificate Support

The system shall support corporate certificate generation.

---

## FR-COR-012 Corporate Billing

The system shall support corporate invoicing.

---

## FR-COR-013 Contract Renewal Tracking

The system shall support renewal monitoring.

---

# 20. Notifications

### Contract Expiry

Notify:

```text
Sales Team
Corporate Coordinator
Management
```

90 / 60 / 30 days before expiry.

---

### Program Started

Notify:

```text
Trainer
Coordinator
Corporate Contact
```

---

### Program Completed

Notify:

```text
Corporate Contact
Coordinator
Management
```

---

### Invoice Due

Notify:

```text
Finance Team
Corporate Contact
```

---

# 21. Reports

## Customer Reports

```text
Corporate Customer List
Corporate Customer Revenue
Corporate Customer Growth
```

---

## Contract Reports

```text
Active Contracts
Expiring Contracts
Contract Revenue
Contract Utilization
```

---

## Program Reports

```text
Program Status Report
Program Completion Report
Program Attendance Report
```

---

## Participant Reports

```text
Participant Attendance
Participant Completion
Participant Certification
```

---

## Revenue Reports

```text
Revenue By Customer
Revenue By Contract
Revenue By Program
```

---

# 22. Audit Requirements

Audit:

```text
Corporate Customer Created
Corporate Customer Updated
Contract Created
Contract Updated
Contract Renewed
Participant Imported
Participant Enrolled
Invoice Generated
```

Capture:

```text
User
Action
Timestamp
Old Value
New Value
Reason
```

---

# 23. Critical Design Decisions

### Corporate Participant vs Student

Recommended:

```text
Corporate Participant
```

separate entity.

Optional:

```text
Link To Student
```

when needed.

Reason:

Not all corporate trainees require full student profiles.

---

### Contract-Driven Billing

Billing should originate from:

```text
Contract
      ↓
Program
      ↓
Invoice
```

Not directly from participant.

---

### Corporate Reporting

Reports should always support:

```text
Customer
Contract
Program
Participant
```

drill-down hierarchy.

---

# 24. Integration Points

### Consumes

```text
Lead Management
Course & Batch
Scheduling
Attendance
Finance
Trainer Management
```

### Provides Data To

```text
Billing
Completion
Certificates
Reporting
Future Corporate Portal
```
