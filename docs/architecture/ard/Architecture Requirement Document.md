# Architecture Requirement Document (ARD)

## Institute Management System (IMS)

**Version:** 1.0
**Architecture Style:** TypeScript Modular Monolith
**Architecture Direction:** Next.js Monorepo Modular Architecture
**Scope:** Single-client implementation
**Excluded for now:** Tenant Setup, SaaS Subscription Management, CMS / Website Builder
**Primary Domain Pattern:** Domain-Driven Design with bounded-context packages

---

# 1. Purpose

This Architecture Requirement Document defines the technical architecture requirements for the IMS platform based on the approved DDD Context Map and Domain Data Model.

The ARD explains:

* Architecture principles
* Monorepo structure
* Application boundaries
* Domain package boundaries
* Backend architecture
* Frontend architecture
* Database architecture
* Security architecture
* Integration architecture
* Event architecture
* Audit architecture
* Deployment architecture
* Future scalability path

---

# 2. Architecture Goals

The architecture shall support:

1. Single-client implementation first
2. Modular monolith development
3. Strong DDD bounded-context separation
4. Central Enrollment aggregate protection
5. Dynamic RBAC
6. Branch-scoped data access
7. Audit-first design
8. Manual payment workflow in Phase 1
9. Future payment gateway support
10. Future SaaS/Tenant support without full redesign
11. Future CMS support without impacting core domains
12. Future AI analytics readiness

---

# 3. Recommended Architecture Style

## 3.1 Architecture Pattern

The IMS shall use:

```text
TypeScript Modular Monolith
```

with:

```text
Next.js Monorepo
Domain-Oriented Packages
PostgreSQL
Prisma
Zod
Internal Domain Events
Transactional Outbox
Background Worker
Object Storage
```

---

## 3.2 Why Modular Monolith

A modular monolith is recommended because:

* Current scope is single-client.
* Phase 1 has many tightly connected modules.
* Enrollment is a central aggregate used by many domains.
* Microservices would add unnecessary operational complexity.
* The business domain is still evolving.
* Shared TypeScript contracts improve development speed.
* Future extraction is still possible if package boundaries are respected.

---

# 4. High-Level Architecture

```text
Users
  ↓
Next.js Portals
  ↓
Route Handlers / Server Actions
  ↓
Application Services
  ↓
Domain Services / Aggregates
  ↓
Repositories
  ↓
PostgreSQL
```

Supporting layers:

```text
Domain Events
Background Worker
Audit Service
Notification Service
Object Storage
Reporting Snapshots
```

---

# 5. Application Portals

The system shall support multiple frontend applications inside the monorepo.

```text
apps/
  admin-portal/
  student-portal/
  trainer-portal/
  public-verification/
```

---

## 5.1 Admin Portal

Used by:

```text
Owner
Admin
Branch Manager
Counselor
Accountant
Academic Coordinator
Corporate Coordinator
Document Verifier
Management
```

Primary modules:

```text
CRM
Admissions
Students
Courses
Batches
Scheduling
Attendance
Finance
Trainer Management
Corporate Training
Completion
Certificates
Documents
Reports
Audit
RBAC
```

---

## 5.2 Student Portal

Used by students to view:

```text
Profile
Enrollments
Timetable
Attendance
Fees
Receipts
Certificates
Documents
Notifications
```

Students must have read-only access to most data.

---

## 5.3 Trainer Portal

Used by trainers to view:

```text
Assigned Batches
Assigned Sessions
Timetable
Attendance Pending
Completion Pending
```

Phase 1 trainer portal may be read-only except attendance marking.

---

## 5.4 Public Verification Portal

Used by employers or external users to verify certificates.

Features:

```text
Certificate Number Search
QR Verification
Certificate Status Display
```

No login required.

---

# 6. Recommended Monorepo Structure

```text
ims-monorepo/
  apps/
    admin-portal/
    student-portal/
    trainer-portal/
    public-verification/

  packages/
    shared-kernel/
    shared-ui/
    shared-auth/
    identity-access/
    organization/
    crm-leads/
    admissions-enrollment/
    corporate-training/
    courses-batches/
    walkin-enrollment/
    scheduling/
    attendance/
    finance/
    trainer-management/
    exams-completion/
    certificates/
    communication/
    documents/
    reporting/
    audit/
    integrations/
    database/

  infrastructure/
    migrations/
    scripts/
    observability/
    deployment/
```

---

# 7. Backend Architecture Requirements

## 7.1 Thin Route Handler Rule

Next.js API route handlers and server actions shall only:

```text
Authenticate request
Authorize request
Validate request payload
Call application service
Return response
```

They must not contain business rules.

---

## 7.2 Business Logic Location

Business rules shall live inside domain packages.

Example:

```text
packages/admissions-enrollment/
  application/
  domain/
  repositories/
  validators/
  events/
```

---

## 7.3 Application Service Responsibilities

Application services shall handle use cases such as:

```text
createLead()
convertLeadToAdmission()
createEnrollment()
confirmEnrollment()
recordPayment()
markAttendance()
approveCompletion()
generateCertificate()
```

---

## 7.4 Domain Service Responsibilities

Domain services shall handle business rules such as:

```text
Batch capacity validation
Trainer conflict validation
Fee clearance validation
Certificate eligibility validation
Refund approval rule
Completion eligibility rule
```

---

# 8. Frontend Architecture Requirements

## 8.1 Recommended Frontend Stack

```text
Next.js
React
TypeScript
Tailwind CSS
Shadcn/ui or accessible component primitives
React Hook Form
Zod
TanStack Query where needed
```

---

## 8.2 Frontend Principles

Frontend shall:

* Use reusable shared UI components.
* Avoid duplicate form validation logic.
* Use Zod schemas shared with backend where practical.
* Enforce UI-level visibility based on permissions.
* Never rely only on UI hiding for security.
* Use server-side authorization for all protected actions.

---

# 9. Domain Package Structure

Each domain package should follow this internal structure:

```text
packages/<domain>/
  application/
    commands/
    queries/
    services/

  domain/
    entities/
    value-objects/
    events/
    rules/

  infrastructure/
    repositories/
    mappers/

  validation/
    schemas/

  index.ts
```

---

# 10. Core Domain Packages

The following packages are core business domains:

```text
crm-leads
admissions-enrollment
courses-batches
finance
certificates
corporate-training
walkin-enrollment
```

These packages require stronger review and stricter boundary enforcement.

---

# 11. Supporting Domain Packages

```text
organization
trainer-management
scheduling
attendance
exams-completion
communication
documents
```

---

# 12. Generic / Platform Packages

```text
identity-access
reporting
audit
shared-kernel
shared-auth
shared-ui
database
integrations
```

---

# 13. Central Enrollment Aggregate Requirement

Enrollment shall be protected as the central aggregate.

Other modules must not directly update Enrollment tables.

Allowed pattern:

```text
Other Module
   ↓
Enrollment Application Service
   ↓
Enrollment Aggregate
   ↓
Repository
```

---

## 13.1 Enrollment-Owned Commands

The admissions-enrollment package shall expose commands such as:

```text
createEnrollment
confirmEnrollment
cancelEnrollment
dropEnrollment
completeEnrollment
markCertificateIssued
```

---

## 13.2 Enrollment Domain Events

The Enrollment package shall publish events such as:

```text
EnrollmentCreated
EnrollmentConfirmed
EnrollmentCancelled
EnrollmentDropped
EnrollmentCompleted
CertificateEligibilityApproved
```

---

# 14. Shared Kernel Requirements

The shared-kernel package shall contain only stable shared concepts.

Allowed:

```text
EntityId
DateRange
Money
Status
EffectiveDateRange
BranchScope
AuditMetadata
Pagination
Result
DomainError
```

Not allowed:

```text
Enrollment business logic
Payment calculation logic
Certificate eligibility logic
Course completion rules
```

---

# 15. Database Architecture Requirements

## 15.1 Database

The system shall use:

```text
PostgreSQL
```

as the primary system of record.

---

## 15.2 ORM

The system shall use:

```text
Prisma
```

for schema management and database access.

---

## 15.3 Database Design Principles

Database design shall support:

* Relational integrity
* Transactions
* Audit fields
* Soft delete where applicable
* Effective dating for master/configuration records
* Status fields
* Branch scoping
* Unique business numbers
* Historical record preservation

---

## 15.4 Common Fields

Most entities shall include:

```text
id
status
createdAt
createdBy
updatedAt
updatedBy
deletedAt
deletedBy
isDeleted
```

Master/configuration entities shall additionally include:

```text
effectiveStartDate
effectiveEndDate
```

---

# 16. Database Ownership Rules

Each table shall have one owning domain package.

Examples:

| Data                                | Owning Package        |
| ----------------------------------- | --------------------- |
| Users, Roles, Permissions           | identity-access       |
| Branches, Departments, Classrooms   | organization          |
| Leads, Follow-ups, Campaigns        | crm-leads             |
| Students, Admissions, Enrollments   | admissions-enrollment |
| Courses, Pricing, Completion Rules  | courses-batches       |
| Payments, Receipts, Refunds         | finance               |
| Trainers, Availability, Assignments | trainer-management    |
| Sessions                            | scheduling            |
| Attendance Records                  | attendance            |
| Exams, Results, Completion          | exams-completion      |
| Certificates, Templates             | certificates          |
| Documents, Verification             | documents             |
| Audit Logs                          | audit                 |

---

# 17. Event Architecture Requirements

## 17.1 Internal Domain Events

The system shall support internal domain events.

Examples:

```text
LeadConvertedToAdmission
EnrollmentCreated
ManualPaymentRecorded
AttendanceMarked
CourseCompleted
CertificateGenerated
DocumentApproved
RefundApproved
```

---

## 17.2 Event Handling Phase 1

Phase 1 shall support:

```text
In-process domain events
Transactional outbox table
Background worker for side effects
```

---

## 17.3 Event Handling Future

Future scaling may introduce:

```text
Redis queue
RabbitMQ
Cloud queue
Kafka
```

only when operational needs justify it.

---

# 18. Transactional Outbox Requirement

Critical business events shall be stored in an outbox table before asynchronous processing.

Use cases:

```text
Notifications
Report snapshots
Certificate PDF generation
Communication delivery
Integration events
```

---

# 19. Background Worker Requirements

The architecture shall support a background worker for:

```text
Follow-up reminders
Installment due reminders
Certificate PDF generation
Document expiry reminders
Scheduled reports
Communication queue processing
Audit/report snapshots
```

Recommended future tools:

```text
BullMQ + Redis
Cloud-native queues
```

---

# 20. Integration Architecture Requirements

## 20.1 Integration Adapter Pattern

External integrations must be isolated under:

```text
packages/integrations/
```

---

## 20.2 Anti-Corruption Layer

Vendor-specific payloads must not leak into core domains.

Use adapters for:

```text
Payment Gateway
SMS Provider
WhatsApp Provider
Email Provider
Tally Integration
AI Services
Object Storage
```

---

## 20.3 Phase 1 Integration Scope

Phase 1 shall support only architecture readiness for integrations.

Actual external integrations may be deferred.

---

# 21. Security Architecture Requirements

## 21.1 Authentication

Phase 1 authentication:

```text
Email + Password
```

Future-ready:

```text
OTP
Google SSO
Microsoft SSO
LDAP
MFA
```

---

## 21.2 Authorization

The system shall use:

```text
Dynamic RBAC
+
Data Scope Security
```

---

## 21.3 Permission Evaluation

Permission checks must happen:

```text
Server-side
Application service level
```

UI hiding is not enough.

---

## 21.4 Data Scope

Supported data scopes:

```text
All Data
Branch Data
Department Data
Assigned Data
Self Data
```

Examples:

```text
Branch Manager → Assigned Branch Only
Counselor → Assigned Leads Only
Trainer → Assigned Sessions Only
Student → Own Records Only
```

---

# 22. Audit Architecture Requirements

## 22.1 Audit Store

Audit logs shall be append-only.

Audit records must not be updated or deleted.

---

## 22.2 Audit Events

Audit shall capture:

```text
Who
What
When
Where
Old Value
New Value
Reason
IP Address
User Agent
```

---

## 22.3 Mandatory Audit Areas

Audit is mandatory for:

```text
Finance
Refunds
Discounts
Receipts
Attendance Corrections
Completion Approvals
Certificate Generation
Certificate Revocation
Document Verification
Role Changes
Permission Changes
Login Events
Exports
```

---

# 23. File Storage Requirements

## 23.1 Storage Strategy

Use:

```text
Database → metadata
Object Storage → files
```

Supported future storage options:

```text
AWS S3
Azure Blob
MinIO
```

---

## 23.2 File Types

Supported files:

```text
PDF
JPG
JPEG
PNG
DOCX
XLSX
```

---

## 23.3 Secure Access

Files shall be accessed using:

```text
Signed URLs
Permission checks
Audit tracking for downloads
```

---

# 24. Certificate Generation Architecture

Certificate generation shall:

* Use approved certificate templates.
* Generate immutable PDF snapshots.
* Store PDF in object storage.
* Store metadata in PostgreSQL.
* Generate QR verification URL.
* Publish CertificateGenerated event.

---

# 25. Reporting Architecture Requirements

## 25.1 Phase 1 Reporting

Phase 1 reporting shall use:

```text
Operational database
Reporting views
Metric snapshots
```

---

## 25.2 Heavy Reports

Heavy reports shall not slow operational transactions.

Use:

```text
Read models
Scheduled snapshots
Background jobs
```

---

## 25.3 Future Reporting

Future architecture may include:

```text
Data warehouse
BI layer
AI analytics store
```

---

# 26. Observability Requirements

The system shall support:

```text
Structured logging
Error tracking
Request tracing
Business metrics
Audit logs
Background job monitoring
```

Recommended:

```text
OpenTelemetry-compatible tracing
Pino-style structured logs
```

---

# 27. Testing Architecture Requirements

The system shall include:

## 27.1 Unit Tests

For:

```text
Domain rules
Value objects
Eligibility engines
Pricing calculations
Permission rules
```

---

## 27.2 Integration Tests

For:

```text
Application services
Repositories
Database transactions
Domain events
```

---

## 27.3 API Tests

For:

```text
Authentication
Authorization
Validation
Error handling
Response contracts
```

---

## 27.4 End-to-End Tests

Critical flows:

```text
Lead to Admission
Admission to Enrollment
Enrollment to Fee Account
Manual Payment to Receipt
Session to Attendance
Attendance to Completion
Completion to Certificate
Walk-In Enrollment to Certificate
Refund Approval
Branch-scoped Access Control
```

---

# 28. Deployment Architecture Requirements

## 28.1 Recommended Initial Deployment

Use one deployable application plus worker process if needed.

```text
IMS Web App
IMS Worker
PostgreSQL
Object Storage
```

---

## 28.2 Container Readiness

The system shall be container-ready.

Required:

```text
Dockerfile
Environment configuration
Migration scripts
Health checks
Worker process support
```

---

## 28.3 Environment Strategy

Supported environments:

```text
Development
Staging
Production
```

---

# 29. CI/CD Requirements

Pipeline shall include:

```text
Install dependencies
Lint
Type check
Unit tests
Integration tests
Build
Prisma migration validation
Security scan
Deploy
```

---

# 30. Configuration Management

The system shall support configuration for:

```text
Student number format
Enrollment number format
Certificate number format
Receipt number format
Password policy
Branch access rules
Document types
Certificate templates
Communication templates
Fee plans
Completion rules
Approval workflows
```

---

# 31. Performance Requirements

Initial expected operational scale:

```text
Branches: 20
Students: 1000+
Staff: 200+
Courses: 7 to 10
Batches: Multiple per branch/course/day
```

The architecture shall support this scale with PostgreSQL and modular monolith design.

---

# 32. Scalability Strategy

## Phase 1

```text
Single application
PostgreSQL
Object storage
Background worker
```

---

## Phase 2

```text
Read models
Job queues
Caching where needed
More worker processes
```

---

## Future

Potential extraction candidates:

```text
Communication
Certificate Generation
Reporting
Payment Integration
Public Verification
AI Intelligence
```

---

# 33. Non-Functional Requirements

## Availability

Target:

```text
99.5% initial availability
```

---

## Security

Must support:

```text
Password hashing
Server-side authorization
Signed file URLs
Audit logs
Branch-scoped access
Sensitive data masking
```

---

## Maintainability

Must support:

```text
Domain package boundaries
Typed contracts
Shared validation
Reusable UI components
Automated tests
```

---

## Localization

Must support:

```text
English UI
Arabic UI
RTL support
English certificates
Arabic certificates
```

---

# 34. Architecture Risks & Mitigations

| Risk                                            | Impact    | Mitigation                                                       |
| ----------------------------------------------- | --------- | ---------------------------------------------------------------- |
| Business logic leaks into API routes            | High      | Keep route handlers thin                                         |
| Domain packages become tightly coupled          | High      | Enforce dependency rules                                         |
| Enrollment modified from many places            | Very High | Protect Enrollment aggregate                                     |
| Reporting slows operations                      | Medium    | Use read models and snapshots                                    |
| Audit is skipped in critical flows              | High      | Central audit service                                            |
| Permissions become inconsistent                 | High      | Central permission engine                                        |
| Certificate PDFs change after template update   | High      | Store immutable PDF snapshots                                    |
| Payment gateway added later without abstraction | Medium    | Define payment adapter interface early                           |
| Document storage becomes insecure               | High      | Use object storage and signed URLs                               |
| Walk-in flow duplicates logic                   | High      | Orchestrate through Enrollment, Finance, Completion, Certificate |

---

# 35. Key Architecture Decisions

## ADR-001

Use TypeScript modular monolith.

## ADR-002

Use Next.js monorepo with multiple portals.

## ADR-003

Use PostgreSQL as system of record.

## ADR-004

Use Prisma for ORM and migrations.

## ADR-005

Use Zod for validation.

## ADR-006

Keep Next.js route handlers thin.

## ADR-007

Use domain packages for business logic.

## ADR-008

Use Enrollment as protected central aggregate.

## ADR-009

Use dynamic RBAC and data-scope authorization.

## ADR-010

Use append-only audit logs.

## ADR-011

Use object storage for documents and generated certificates.

## ADR-012

Use internal domain events and transactional outbox.

## ADR-013

Use background worker for asynchronous processing.

## ADR-014

Keep microservices as future option, not Phase 1 architecture.

---

# 36. Implementation Roadmap

## Architecture Foundation

1. Create monorepo
2. Create shared-kernel package
3. Create shared-ui package
4. Create database package
5. Create auth package
6. Create audit package
7. Create identity-access package

---

## Core Domain Implementation

1. Organization
2. CRM Leads
3. Admissions & Enrollment
4. Courses & Batches
5. Finance
6. Scheduling
7. Attendance
8. Completion
9. Certificates
10. Documents

---

## Supporting Domain Implementation

1. Trainer Management
2. Corporate Training
3. Communication
4. Reporting
5. Audit & Compliance

---

# 37. Next Recommended Documents

After this ARD, create:

1. Architecture Decision Records
2. Physical Database Design / Prisma Schema
3. API Contract Specification
4. Security & Permission Matrix
5. UI Screen Inventory
6. Development Sprint Plan
7. Test Strategy Document

---

# 38. Final Architecture Recommendation

The IMS should be built as a:

```text
TypeScript Modular Monolith
```

using:

```text
Next.js Monorepo
Domain Packages
PostgreSQL
Prisma
Zod
Internal Domain Events
Transactional Outbox
Background Worker
Object Storage
Dynamic RBAC
Append-only Audit Logs
```

This architecture gives the fastest path to a production-ready single-client IMS while preserving clean DDD boundaries and allowing future growth into SaaS, CMS, AI, mobile apps, and service extraction when needed.
