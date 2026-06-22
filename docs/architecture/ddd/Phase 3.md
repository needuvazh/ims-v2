# Phase 3 Scope Addition

## Proposal-Aligned Missing DDD Domains

## Phase 3 Name

```text
Business Expansion & Enterprise Operations Phase
```

## Phase 3 Objective

Phase 3 expands IMS from core training operations into a complete business management platform for ASTI.

This phase adds:

```text
Website & Digital Experience
Corporate Sales & Quotation
Finance & Receivables Expansion
HRMS
Employee Self-Service
Payroll
Calendar & Holiday Management
Walk-In Fast Track
Executive MIS Dashboards
```

---

# 1. Digital Experience / Website Context

## Purpose

Manage ASTI public digital presence and convert website visitors into leads, registrations, and corporate enquiries.

## Key Capabilities

```text
Public website
Bilingual EN/AR pages
RTL support
Course catalog
Training calendar
Online registration
Corporate inquiry forms
Trainer profiles
Certificate verification page
SEO metadata
Google Analytics
Meta Pixel
LinkedIn tracking
CMS content management
Academy subdomain
```

## Upstream Dependencies

```text
Course Management
Batch Management
Certificate Management
CRM
```

## Downstream Consumers

```text
CRM
Admission
Corporate Sales
Reports
```

---

# 2. Corporate Sales & Quotation Context

## Purpose

Manage B2B sales lifecycle before corporate training delivery.

## Key Capabilities

```text
Corporate sales enquiry
Opportunity tracking
Lead assignment
Follow-up reminders
Quotation creation
Multi-course quotation
Corporate pricing tiers
Quotation approval
Quotation revision history
Quotation PDF generation
Email quotation
Convert quotation to sales order
Sales order confirmation
Win/loss closure
Reason for loss tracking
Revenue forecast
Sales funnel dashboard
```

## Upstream Dependencies

```text
Corporate Customer
Course Pricing
CRM
User Access
```

## Downstream Consumers

```text
Corporate Training
Finance & Receivables
Reports
Communication
Audit
```

---

# 3. Finance, Invoicing & Receivables Context

## Purpose

Expand finance beyond student fee collection into full accounts receivable control.

## Key Capabilities

```text
Customer invoices
Corporate invoices
Receipt allocation
Partial payments
Advance payments
Credit notes
Debit notes
Refunds
Credit limits
Customer statements
Outstanding tracking
Due collection tracking
30/60/90/120 aging
Receivables dashboard
Revenue by course
Revenue by customer
Revenue by month
Revenue by corporate account
Tally synchronization
```

## Upstream Dependencies

```text
Enrollment
Corporate Sales
Corporate Training
Payment Gateway
```

## Downstream Consumers

```text
Reports
Executive MIS
Tally Integration
Audit
```

---

# 4. HRMS Context

## Purpose

Manage employee lifecycle and HR compliance.

## Key Capabilities

```text
Employee master
Employee profile
Contract management
Department assignment
Role and grade
Emergency contacts
Employment history
Employee document repository
Leave management
Leave balances
Shift management
Biometric attendance
Daily attendance register
Absence management
Late arrival tracking
Overtime tracking
Recruitment pipeline
Interview scheduling
Performance management
KPI tracking
Employee training records
Document expiry alerts
```

## Upstream Dependencies

```text
Organization
IAM
Document Management
Biometric Integration
```

## Downstream Consumers

```text
ESS
Payroll
Reports
Audit
Compliance
```

---

# 5. Employee Self-Service Context

## Purpose

Allow employees to self-manage HR requests and personal information.

## Key Capabilities

```text
Employee portal
Leave request
Leave cancellation
Payslip access
Attendance view
Salary certificate request
NOC request
Experience letter request
Asset request
IT support request
Document upload
Training records view
Performance self-assessment
Payroll query submission
HR announcements
Manager approvals
```

## Upstream Dependencies

```text
HRMS
Payroll
Document Management
IAM
```

## Downstream Consumers

```text
HRMS
Payroll
Communication
Audit
```

---

# 6. Payroll Context

## Purpose

Manage salary processing and employee compensation.

## Key Capabilities

```text
Monthly payroll run
Basic salary
Allowances
Deductions
Overtime calculation
Absence deduction
Loan deduction
Advance deduction
End of Service Benefits
EOSB accrual tracking
Social insurance contribution
Payroll audit trail
Payslip generation
Bank transfer file
Payroll register
Department cost analysis
Executive payroll dashboard
```

## Upstream Dependencies

```text
HRMS
Employee Attendance
ESS
Finance
```

## Downstream Consumers

```text
ESS
Finance
Reports
Audit
Executive MIS
```

---

# 7. Calendar & Holiday Management Context

## Purpose

Provide central calendar governance for batches, venues, holidays, and corporate training planning.

## Key Capabilities

```text
Multi-year calendar
Holiday register
Venue blocking
Branch calendar
Training calendar
Prevent scheduling on blocked dates
Prevent batch creation on holiday
Corporate annual training calendar
Calendar conflict validation
```

## Upstream Dependencies

```text
Organization
Branch
Classroom
Scheduling
```

## Downstream Consumers

```text
Batch Management
Scheduling
Corporate Training
Website Training Calendar
Reports
```

---

# 8. Walk-In Fast Track Context

## Purpose

Support same-day learner onboarding from walk-in to training confirmation.

## Key Capabilities

```text
Walk-in registration
Instant student profile
Course selection
Batch availability check
Fee summary
Discount or waiver support
Payment collection
Receipt generation
Batch assignment
Training confirmation
SMS/email confirmation
```

## Upstream Dependencies

```text
Student Management
Course Management
Batch Management
Finance
Communication
```

## Downstream Consumers

```text
Enrollment
Attendance
Finance
Reports
Audit
```

---

# 9. Executive MIS Context

## Purpose

Provide board-level visibility across ASTI operations.

## Key Capabilities

```text
Chairman dashboard
CEO dashboard
MD dashboard
Sales dashboard
Finance dashboard
HR dashboard
Training and Operations dashboard
Dashboard drill-down
PDF export
Excel export
Scheduled email delivery
KPI trends
Revenue trends
Enrollment trends
Receivables summary
Certificate summary
HR summary
```

## Upstream Dependencies

```text
CRM
Enrollment
Finance
Corporate Sales
Corporate Training
HRMS
Payroll
Attendance
Certificate
```

## Downstream Consumers

```text
Management
Board
Scheduled Reports
Audit
```

---

# Phase 3 Updated Context Map

```text
Website & Digital Experience
        ↓
CRM / Enquiry
        ↓
Walk-In Fast Track
        ↓
Admission & Enrollment
        ↓
Course / Batch / Scheduling / Attendance
        ↓
Completion / Certificate

Corporate Sales & Quotation
        ↓
Corporate Training
        ↓
Finance & Receivables
        ↓
Tally Integration

HRMS
        ↓
ESS
        ↓
Payroll
        ↓
Executive MIS

Calendar & Holiday
        ↓
Batch Scheduling
        ↓
Attendance

All Contexts
        ↓
Audit & Compliance
        ↓
Reports & Executive MIS
```

---

# Phase 3 Deliverables

```text
Updated DDD Context Map
Updated Business Domains Document
Updated API Specification scope
Updated Database Design scope
Updated Prisma Schema scope
Updated Implementation Plan
```

---

# Phase 3 Priority Order

```text
1. Walk-In Fast Track
2. Calendar & Holiday Management
3. Corporate Sales & Quotation
4. Finance & Receivables Expansion
5. Executive MIS
6. Website & Digital Experience
7. HRMS
8. ESS
9. Payroll
```

---

# Important Scope Note

Data Migration remains excluded from product APIs as per decision.

It may be handled only as a one-time implementation support activity if required.
