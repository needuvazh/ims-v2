# ASTI Integrated Institute Management System (IMS) - Project Status Document (PSD)

**Version:** 3.7.0  
**Last Updated:** 2026-07-02  
**Document Owner:** ASTI Technical Program Manager & Enterprise Architect  
**Project Scope:** Single-client implementation for Al Saud Training Institute (ASTI)

---

## 1. Executive Summary

This Project Status Document (PSD) serves as the **single source of truth** for the 
Al Saud Training Institute (ASTI) Integrated Institute Management System (IMS) 
modular monolith project. It consolidates all requirements, design specifications, 
architecture decision records, OpenSpec change proposals, and codebase milestones 
into a unified tracking index.

* **Project Name:** ASTI Integrated Institute Management System (IMS)
* **Current Version:** v3.7.0 (Core Foundation, Course & Batch Management, Trainer Assignment & Waitlists)
* **Last Updated:** 2026-07-02
* **Document Owner:** ASTI Technical Program Manager & Enterprise Architect
* **Current Phase:** Core Workflow Implementation & Testing
* **Overall Progress (%):** **40%** (90 completed FRD requirements out of the total 226)
* **Overall Health:** **Green** (Core foundation of IAM and Organization completed. CRM core flows, follow-up scheduling workflows, worker auto-assignments, Admissions conversion handoffs, CRM Dashboards, Course Catalog, Batch Management, Trainer Assignment, and FIFO Batch Waitlists with concurrency protection implemented and verified.)

---

## 2. Project Timeline

| Phase | Status | Planned Start | Planned End | Actual Progress | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Discovery** | Completed | 2026-05-01 | 2026-05-15 | 100% | Business Analyst |
| **Analysis** | Completed | 2026-05-16 | 2026-05-31 | 100% | Business Analyst |
| **Architecture** | Completed | 2026-06-01 | 2026-06-15 | 100% | Solution Architect |
| **Design** | Completed | 2026-06-16 | 2026-06-25 | 100% | UI/UX & DB Leads |
| **Implementation** | In Progress | 2026-06-20 | 2026-08-15 | 42% | Tech Lead |
| **Testing** | In Progress | 2026-06-22 | 2026-08-20 | 38% | QA Lead |
| **UAT** | Planned | 2026-08-21 | 2026-09-05 | 0% | Business Analyst |
| **Production** | Planned | 2026-09-06 | 2026-09-15 | 0% | DevOps Lead |

---

## 3. Documentation Status

| Document | Version | Status | Owner | Last Updated | Review Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Business Requirement Document (BRD)** | v3.0 | Approved | Product Owner | 2026-06-15 | Completed |
| **DDD Context Map** | v3.0 | Approved | Solution Architect | 2026-06-30 | Completed |
| **ER Model** | v3.0 | Approved | Lead DB Engineer | 2026-06-30 | Completed |
| **Database Dictionary** | v1.0 | Draft | Lead DB Engineer | 2026-06-30 | In Review |
| **API Specification** | v1.1 | Approved | Solution Architect | 2026-07-01 | Completed |
| **UI Specification** | v1.1 | Approved | UI/UX Lead | 2026-07-01 | Completed |
| **Solution Design Specification (SDS)** | v1.1 | Approved | Solution Architect | 2026-07-01 | Completed |
| **Functional Requirement Documents (FRDs)** | v3.0 | Approved / Draft | Business Analyst | 2026-07-01 | Completed (M1-M3, M6) / In Review (M4-M5, M7-M19) |
| **Architecture Decision Records (ADRs)** | v1.0 | Approved | Solution Architect | 2026-06-30 | Completed |
| **Deployment Guide** | v1.0 | Draft | DevOps Lead | 2026-06-22 | In Review |
| **User Manual** | v1.0 | Not Started | Technical Writer | - | Not Started |

---

## 4. Module Status Dashboard

| Module | FRD | SDS | ER | API | UI | OpenSpec | Development | Testing | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IAM** | Approved | Approved | Approved | Approved | Approved | Implemented | Completed | Completed | Complete |
| **Organization** | Approved | Approved | Approved | Approved | Approved | Implemented | Completed | Completed | Complete |
| **CRM** | Approved | Approved | Approved | Approved | Completed | Implemented | Completed | Completed | Complete (Core & Dashboards) |
| **Admissions** | Approved | Draft | Approved | Approved | Draft | In Progress | In Progress (Stub) | Completed (BE) | In Progress |
| **Student Management** | Approved | Not Started | Draft | Not Started | Draft (Shell) | Planned | Not Started | Not Started | Under Review |
| **Course Management** | Approved | Approved | Approved | Approved | Approved | Implemented | Completed | Completed | Complete (Course Catalog) |
| **Batch Management** | Approved | Approved | Approved | Approved | Completed | Implemented | Completed | Completed | Complete (Waitlists & Trainer Assignment) |
| **Attendance** | Approved | Not Started | Not Started | Not Started | Draft (Shell) | Planned | Not Started | Not Started | Under Review |
| **Finance** | Approved | Not Started | Not Started | Not Started | Draft (Shell) | Planned | Not Started | Not Started | Under Review |
| **Corporate Training** | Approved | Not Started | Not Started | Not Started | Not Started | Planned | Not Started | Not Started | Under Review |
| **Communication** | Approved | Not Started | Not Started | Not Started | Not Started | Planned | Not Started | Not Started | Under Review |
| **Reporting** | Approved | Not Started | Not Started | Not Started | Draft (Shell) | Planned | Not Started | Not Started | Under Review |
| **Certificates** | Approved | Not Started | Not Started | Not Started | Draft (Shell) | Planned | Not Started | Not Started | Under Review |
| **Website** | Approved | Not Started | Not Started | Not Started | Not Started | Planned | Not Started | Not Started | Under Review |
| **Document Management**| Approved | Not Started | Not Started | Not Started | Not Started | Planned | Not Started | Not Started | Under Review |
| **Audit** | Approved | Draft | Approved | Draft | Draft (Shell) | Planned | In Progress (Fdtn)| In Progress | Under Review |
| **HRMS (Future)** | Not Started| Not Started | Not Started | Not Started | Not Started | Deferred | Not Started | Not Started | Planned (Future) |

---

## 5. DDD Status

The modular monolith maps bounded contexts to internal TypeScript packages (`packages/*`) 
to enforce strict domain isolation and clean dependency cycles.

### Approved Bounded Contexts
* **Identity & Access Management:** Controls logins, session state, dynamic RBAC mappings, 
  password complexity/policies, activation workflows, and user-branch scoping.
* **Organization Management:** Configures ASTI's core operating model containing the 
  `Institute` legal records, hierarchical physical `Branch` nodes, `Department` business divisions, 
  and teaching `Classroom` records.
* **Lead, Enquiry & CRM Management:** Manages marketing `Campaign` tracking, incoming 
  `Inquiry` validation, `Lead` tracking, counselor assignments, timeline `LeadNote` comments, 
  and chronological `LeadStageHistory` logs.
* **Admission & Enrollment Management:** Tracks individual `Student` details, emergency contacts, 
  registration history, core `Admission` files, and `LeadConversionOrchestrator` boundaries.
* **Audit & Compliance:** Handles security auditing and transactional asynchronous side effects.

### Pending Changes
* **Central Enrollment Integration:** Introducing the `Enrollment` aggregate to connect student 
  admission status directly with scheduling, training batches, payment schedules, and certificate eligibility.

### Contexts Under Review
* **Course Catalog & Training Delivery:** Refining course pricing hierarchy mappings to support 
  override sequences: `Batch Level Override` -> `Branch Level Override` -> `Global Course Default`.

### Aggregate Changes
* **Enrollment:** Will act as the single transaction coordinator linking students to course versions, 
  specific active training batches, installment fee profiles, and attendance/exam records.

### Domain Event Changes
* **`UserCreated` / `AccountLocked`:** Dispatched immediately upon user configuration changes or 
  security lockout triggers.
* **`LeadConverted`:** Fired by the Lead Conversion Orchestrator upon successfully verifying 
  and mapping a Lead to a new Student and Admission profile.
* **`BranchCreated` / `ClassroomCreated`:** Broadcasted to trigger synchronization with calendar boundaries.
* **`WebsiteInquirySubmitted` / `InquiryQualified`:** Dispatched during initial prospect capturing or CRM qualification flows.

### Repository Changes
* **`IUserRepository` / `IBranchRepository`:** Implemented as clean abstractions in domain layers, 
  using Prisma Client database adapters in the infrastructure layer.
* **`ILeadRepository` / `IAdmissionRepository`:** Exposed as small public APIs in the respective 
  domain packages.

### Value Object Changes
* **`DateRange` / `Money` / `Percentage`:** Implemented to enforce strict verification invariants 
  (e.g., preventing negative budgets, validating effective start dates occur before end dates).

---

## 6. OpenSpec Change Log

All project changes are structured through OpenSpec change proposals and archived upon 
complete implementation and code-review sync.

| Change ID | Title | Status | Affected Modules | Decision | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `build-observability` | Observability Foundation Setup | Implemented | Observability, All | Approved | Implemented health check, correlation IDs, and structured logging. |
| `rbac-branch-auth-foundation`| Dynamic RBAC & Branch Security | Implemented | IAM, Organization | Approved | Configured initial server-side permission checks and session checks. |
| `iam-database-refactor` | IAM Prisma Schema Alignment | Implemented | IAM, Database | Approved | Refactored security tables, activation states, and lockout metrics. |
| `implement-forgot-password` | Self-Service Password Reset | Implemented | IAM | Approved | Added 15-minute reset token logic, history tracking, and emails. |
| `complete-organization-foundation`| Organization CRUD & Dating | Implemented | Organization | Approved | Built branches, departments, and classrooms with strict status rules. |
| `implement-iam-module-01` | IAM Backend & API Suite | Implemented | IAM, Audit | Approved | Added complete security controllers, streams-based reports, and APIs. |
| `implement-iam-ui-phase-01` | IAM Portal Interface | Implemented | IAM, Shared UI | Approved | Formed dynamic layout headers, user lists, roles, and session UI. |
| `iam-branch-scoping-fixes` | Dynamic Scoping Enforcements | Implemented | IAM, Organization | Approved | Removed role-based hardcoding; resolved hierarchical child scopes. |
| `implement-organization-management`| Organization Portal & Tree View| Implemented | Organization, UI | Approved | Added visual hierarchy tree view, forms, and manager validation. |
| `crm-core-models-apis` | CRM Core Database Models & APIs | Implemented | CRM, Admissions, Database | Approved | Set up Inquiry, Lead, LeadFollowUp schemas, PII masking, domain services, events, and transactional handoff. |
| `crm-portal-ui-scoped-filtering` | CRM Portal UI & Scoped Filtering | Implemented | CRM, Portal UI | Approved | Interactive page views for `/leads` and `/inquiries`, Counselor-scoped filtering, form validations, timeline stepper, notes, duplicate bypass modal. |
| `crm-workflows-followup-scheduling` | Workflows & Follow-up Scheduling | Implemented | CRM, Worker, Database, Portal UI | Approved | Dynamic follow-up scheduling, automatic counselor workload-based assignment, hourly sweeping job, and concurrency protection. |
| `trainer-assignment` | Trainer Assignment & Conflict Validator | Implemented | Course Management, Portal UI, Database | Approved | Implemented trainer assignment APIs, server actions, schedule conflict validator UI steps & modals. |
| `batch-waitlist-spec` | Course Batch Waitlist Management | Implemented | Batch Management, Database | Approved | Pessimistic locking, auto-promotions, failed enrollment reversion, reactivations, reordering UI. |

### Details for Recently Completed Changes (2026-07-02)

#### `batch-waitlist-spec`
* **Business Reason:** Enable fair, automated FIFO waitlisting for full batches, allowing seamless seat release promotions and transaction-safe manual overrides.
* **Technical Impact:** Configured filtered unique PostgreSQL indexes to prevent double active queuing; implemented parent-level pessimistic row-locking (`FOR UPDATE`) in all waitlist write paths; wired up `EnrollmentCreationFailed` outbox listeners to revert failed enrollments and auto-promote next candidates; added reorder, skip reason, reactivate, and delete endpoints and server actions; resolved raw waitlist UUID labels in UI using database-driven name lookups.
* **Required Document Updates:** FRD Module 06, API Specs, and Database Dictionary updated.
* **Required Implementation Tasks:** Waitlist service methods, Next.js API endpoints, revalidate server actions, list reordering UI handles, Vitest integration tests, Playwright E2E tests.

#### `crm-core-models-apis`
* **Business Reason:** Establish a comprehensive, secure system entry point to ensure raw customer inquiries, 
  marketing leads, and outreach follow-ups are qualified and tracked.
* **Technical Impact:** Defined and seeded `Inquiry`, `Lead`, and `LeadFollowUp` database structures; 
  implemented isolated domain services inside `@ims/crm-leads` for stage progressions, assignments, and concurrency locking; 
  integrated default PII masking (email/phone) in DTOs and audit trail logging on reveal; synchronously handoff qualified leads to the Admissions module in single transactions.
* **Required Document Updates:** FRD Module 03, API Specs, and Database Dictionary updated.
* **Required Implementation Tasks:** Setup CRM route controllers, entity outbox event publishers, PII unmasking endpoint `/reveal-pii`, and CRM unit test suite.

#### `crm-portal-ui-scoped-filtering`
* **Business Reason:** Deliver front-end leads portal interfaces with strict branch context and assigned counselor boundaries.
* **Technical Impact:** Dynamic client-side forms mapped with React Hook Form and Zod schemas; counselor assignment bounds restricted server-side with custom `ERR_CRM_ASSIGNED_LEAD_SCOPE_VIOLATION` codes; duplicate checking checks bypass alerts; terminal stage blocks requiring identity document submissions; profile synchronization logic for Person emails and birthdates.
* **Required Document Updates:** UI Specification, ER Model updated.
* **Required Implementation Tasks:** Interactive leads grid, timeline stepper, audit paginate tables, stage histories, and upload file components.

#### `crm-workflows-followup-scheduling`
* **Business Reason:** Route incoming inquiries automatically to balance workload and enforce disciplined, timely follow-up schedules.
* **Technical Impact:** Transactional outbox handlers for `WebsiteInquirySubmitted` events; lowest-workload auto-assignment using random tie-breakers; transactional composite APIs for outcome logging + next follow-up scheduling with optimistic concurrency check; hourly database sweeping cron for missed/overdue follow-ups.
* **Required Document Updates:** FRD Module 03, SDS, Database Dictionary.
* **Required Implementation Tasks:** Background worker consumer, scheduler dialog modal, hourly sweep function, outbox event generation.

---

## 7. OpenSpec Implementation Tracker

| Module / Component | Database | Backend | Frontend | API | Security | Tests | Documentation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IAM** | Completed | Completed | Completed | Completed | Completed | Completed | Completed | **Completed** |
| **Organization** | Completed | Completed | Completed | Completed | Completed | Completed | Completed | **Completed** |
| **CRM** | Completed | Completed | In Progress | Completed | Completed | Completed | Completed | **In Progress** |
| **Admissions** | Completed | Completed | Not Started | Completed | Completed | Completed | Completed | **In Progress** |
| **Student Mgmt** | Completed | Not Started | Not Started | Not Started | Not Started | Not Started | Completed | **Planned** |
| **Course Mgmt** | Completed | Completed | Completed | Completed | Completed | Completed | Completed | **Completed** |
| **Batch Mgmt** | Draft | Not Started | Not Started | Not Started | Not Started | Not Started | Completed | **Planned** |
| **Attendance** | Not Started | Not Started | Not Started | Not Started | Not Started | Not Started | Completed | **Planned** |
| **Finance** | Not Started | Not Started | Not Started | Not Started | Not Started | Not Started | Completed | **Planned** |
| **Corporate Training**| Not Started | Not Started | Not Started | Not Started | Not Started | Not Started | Completed | **Planned** |
| **Completion & Cert**| Not Started | Not Started | Not Started | Not Started | Not Started | Not Started | Completed | **Planned** |
| **Document Mgmt** | Not Started | Not Started | Not Started | Not Started | Not Started | Not Started | Completed | **Planned** |
| **Communication** | Not Started | Not Started | Not Started | Not Started | Not Started | Not Started | Completed | **Planned** |
| **Reporting** | Completed | Not Started | Not Started | Not Started | Not Started | Not Started | Completed | **Planned** |
| **Audit** | Completed | In Progress | Not Started | Not Started | In Progress | In Progress | Completed | **In Progress** |

---

## 8. Requirements Traceability Matrix

The matrix traces requirements from high-level Business Requirements (BRD) down to code symbols, 
database structures, and automated tests.

| Requirement ID | BRD Ref | DDD Context | FRD Ref | SDS Spec | API Endpoint | DB Table / Model | UI Routing | Automated Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IAM-001** (Auth) | Sec 1.1 | IAM Context | Part 1.1 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/specs/identity-access/spec.md) | `POST /api/v1/auth/login` | `User`, `UserSession` | `/login` | [auth-service.test.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/identity-access/src/application/auth-service.test.ts) | **Completed** |
| **IAM-002** (Lockout)| Sec 1.2 | IAM Context | Part 1.4 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/specs/identity-access/spec.md) | `POST /api/v1/auth/login` | `User` | `/login` | [security-policy-service.test.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/identity-access/src/application/security-policy-service.test.ts) | **Completed** |
| **IAM-003** (Reset) | Sec 1.3 | IAM Context | Part 1.7 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/specs/identity-access/spec.md) | `POST /api/v1/auth/forgot-password` | `PasswordResetToken` | `/forgot-password` | [auth-service.test.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/identity-access/src/application/auth-service.test.ts) | **Completed** |
| **ORG-001** (Inst) | Sec 2.1 | Organization| Part 2.1 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/specs/organization/spec.md) | `PUT /api/organization/institute` | `Institute` | `/organization` | [organization-service.test.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/organization/src/application/organization-service.test.ts) | **Completed** |
| **ORG-003** (Branch)| Sec 2.2 | Organization| Part 2.2 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/specs/organization/spec.md) | `POST /api/organization/branches` | `Branch` | `/organization/branches`| [organization-service.test.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/organization/src/application/organization-service.test.ts) | **Completed** |
| **ORG-007** (Dept) | Sec 2.3 | Organization| Part 2.3 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/specs/organization/spec.md) | `POST /api/organization/departments`| `Department` | `/organization/depts` | [organization-service.test.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/organization/src/application/organization-service.test.ts) | **Completed** |
| **ORG-010** (Room) | Sec 2.4 | Organization| Part 2.4 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/specs/organization/spec.md) | `POST /api/organization/classrooms` | `Classroom` | `/organization/rooms` | [organization-service.test.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/organization/src/application/organization-service.test.ts) | **Completed** |
| **CRM-001** (Inquiry) | Sec 3.1 | CRM Context | Part 19.1 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/changes/archive/2026-07-01-crm-core-models-apis/specs/crm-core-models-apis/spec.md) | `POST /api/v1/crm/inquiries` | `Inquiry` | `/inquiries` | [inquiry-service-query.spec.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/crm-leads/tests/inquiry-service-query.spec.ts) | **Completed** |
| **CRM-002** (Promote) | Sec 3.2 | CRM Context | Part 19.1 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/changes/archive/2026-07-01-crm-core-models-apis/specs/crm-core-models-apis/spec.md) | `POST /api/v1/crm/inquiries/[id]/promote` | `Lead`, `Person` | `/inquiries` | [lead-service.test.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/crm-leads/src/application/lead-service.test.ts) | **Completed** |
| **CRM-003** (Lifecycle)| Sec 3.3 | CRM Context | Part 19.2 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/changes/archive/2026-07-01-crm-core-models-apis/specs/crm-core-models-apis/spec.md) | `PUT /api/v1/crm/leads/[id]/stage` | `Lead`, `LeadStageHistory` | `/leads/[id]/edit` | [lead-service.test.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/crm-leads/src/application/lead-service.test.ts) | **Completed** |
| **CRM-004** (Followup) | Sec 3.4 | CRM Context | Part 19.3 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/changes/archive/2026-07-01-crm-core-models-apis/specs/crm-core-models-apis/spec.md) | `POST /api/v1/crm/leads/[id]/follow-ups` | `LeadFollowUp` | `/leads/[id]` | [lead-service.test.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/crm-leads/src/application/lead-service.test.ts) | **Completed** |
| **CRM-005** (Masking) | Sec 3.5 | CRM Context | Part 19.4 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/changes/archive/2026-07-01-crm-core-models-apis/specs/crm-core-models-apis/spec.md) | `POST /api/v1/crm/leads/[id]/reveal-pii` | `Lead`, `AuditLog` | `/leads/[id]` | [route.test.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/apps/admin-portal/app/api/v1/crm/leads/[id]/route.test.ts) | **Completed** |
| **CRM-006** (Scope) | Sec 3.6 | CRM Context | Part 19.5 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/changes/archive/2026-07-01-crm-portal-ui-scoped-filtering/specs/crm-portal-ui-scoped-filtering/spec.md) | `GET /api/v1/crm/leads` | `Lead` | `/leads` | [lead-service-query.spec.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/crm-leads/tests/lead-service-query.spec.ts) | **Completed** |
| **CRM-007** (Bypass) | Sec 3.7 | CRM Context | Part 19.7 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/changes/archive/2026-07-01-crm-portal-ui-scoped-filtering/specs/crm-portal-ui-scoped-filtering/spec.md) | `POST /api/v1/crm/leads` | `Lead` | `/leads/create` | [lead-service.test.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/crm-leads/src/application/lead-service.test.ts) | **Completed** |
| **CRM-008** (Auto) | Sec 3.8 | CRM / Worker | Part 19.8 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/changes/crm-workflows-followup-scheduling/specs/crm-followup-workflows/spec.md) | N/A (Outbox Handler) | `Inquiry`, `Lead` | N/A | [followup-workflows.spec.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/crm-leads/tests/followup-workflows.spec.ts) | **Completed** |
| **CRM-009** (Composite)| Sec 3.9 | CRM Context | Part 19.9 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/changes/crm-workflows-followup-scheduling/specs/crm-followup-workflows/spec.md) | `POST /api/v1/crm/leads/follow-ups/[id]` | `LeadFollowUp`, `Lead` | `/leads/[id]` | [followup-workflows.spec.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/crm-leads/tests/followup-workflows.spec.ts) | **Completed** |
| **CRM-010** (Overdue) | Sec 3.10| CRM / Worker | Part 19.10| [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/changes/crm-workflows-followup-scheduling/specs/crm-followup-workflows/spec.md) | N/A (Hourly Cron) | `LeadFollowUp` | N/A | [followup-workflows.spec.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/crm-leads/tests/followup-workflows.spec.ts) | **Completed** |
| **ADM-001** (Convert) | Sec 4.1 | Admissions | Part 4.1 | [spec.md](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/openspec/changes/archive/2026-07-01-crm-portal-ui-scoped-filtering/specs/crm-portal-ui-scoped-filtering/spec.md) | `POST /api/v1/crm/leads/[id]/convert` | `Student`, `Admission` | `/leads/[id]` | [lead-conversion-orchestrator.test.ts](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/admissions-enrollment/src/application/lead-conversion-orchestrator.test.ts) | **Completed** |

> [!NOTE]
> The full matrix maps all 226 requirements. Only core implemented/in-progress elements 
> are listed above for readability.

---

## 9. Current Sprint / Milestone

**Current Milestone:** Foundation, CRM & Basic Admissions Handoff (Milestone 1)

* **Completed:**
  * Foundations for Turborepo, pnpm workspaces, and Next.js portal routing.
  * Shared observability layer (correlation logging, trace propagation, headers).
  * Prisma models for Core Domains (Identity, Org, CRM, Admissions, Audit, Outbox) in [schema.prisma](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/database/prisma/schema.prisma).
  * 100% IAM backend & frontend (activation flow, database session tracking, lockouts, resets, RBAC).
  * 100% Organization backend & frontend (Google Maps link formats, manager presence checks, cascade archiving, hierarchy tree visualization).
  * Scoping fixes preventing cross-branch data exposure and removing role-based scoping checks.
  * Core CRM workflows implemented (Inquiries, Leads, Follow-ups, timeline note streams, stage changes history tables, PII masking, bypass duplication alert boxes, terminal stage conversion modals).
  * Auto-assignment of website inquiries to counselors using lowest active workload with random tie-breakers.
  * Composite outcome logging and scheduled next follow-ups with concurrency protection.
  * Hourly background cron sweeping for overdue follow-up alerts.
  * 100% conversion orchestrator executing Admissions creation inside cross-context database transactions.
* **In Progress:**
  * UI screens for Admissions files list and counselor dashboard.
  * Remaining CRM items (Campaigns Management, configurable Stages/Sources admin panels, and CRM dashboard analytics).
* **Pending:**
  * Building the central Enrollment aggregate package.
* **Deferred:**
  * Online credit gateways, Biometric sync pipelines, and Tally ERP integrations.

---

## 10. Next OpenSpec Action Items

### Priority 1: `build-enrollment-aggregate-foundation`
* **Owner:** Solution Architect
* **Dependencies:** Organization Management, Identity & Access Management, CRM Workflows
* **Estimated Effort:** 4 Days (Planned Start: 2026-07-01)
* **Expected Output:** Creation of `packages/admissions-enrollment` domain package with `Enrollment` aggregate root, 
  validation rules, repository definitions, database mappings, and 100% unit test coverage.

### Priority 2: `implement-course-batch-management`
* **Owner:** Tech Lead
* **Dependencies:** Enrollment Aggregate Foundation
* **Estimated Effort:** 5 Days (Planned Start: 2026-07-05)
* **Expected Output:** Database schemas, backend domain services, and UI screens to manage course catalogs, active batches, pricing override workflows, trainer assignments, and scheduling limits.

### Priority 3: `implement-finance-receivables-foundation`
* **Owner:** Finance Lead
* **Dependencies:** Course & Batch Management, Enrollment
* **Estimated Effort:** 6 Days (Planned Start: 2026-07-10)
* **Expected Output:** Database setups for invoices, installments, receipts, and refund requests, along with backend logic for billing calculation rules and Omani tax breakdown calculations.

---

## 11. Risks

| Risk ID | Description | Impact | Probability | Mitigation | Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R-001** | Biometric Offline Gateway Syncing delays due to connectivity interruptions. | High | Medium | scanner-side caching; transaction outbox sync on restore. | Integrations Lead | Active |
| **R-002** | Tally ERP outbox/reconciliation transaction failures. | High | Medium | Double-entry logging to `OutboxEvent` table; exponential backoff retries. | Finance Lead | Active |
| **R-003** | Scope creep on student and trainer portals (e.g. demanding complex CMS controls). | Medium | Low | Maintain static course catalogues; enforce strict client approval limits. | Product Owner | Active |

---

## 12. Open Questions

| Question | Related Document | Raised By | Required Decision | Due Date | Current Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Q-001** Should admin mutations continue using server actions, or should route handlers be created for all documented API contracts? | Solution Design Specification | Tech Lead | Standardize delivery mechanisms for admin mutations. | 2026-07-05 | **Open** |
| **Q-002** What exact Oman receipt, tax invoice, certificate, and student ID templates should be implemented? | Functional Requirements Document | Business Analyst | Visual ASTI client layouts. | 2026-07-10 | **Open** |
| **Q-003** Will ASTI provide local biometric gateway hardware/software, or should the project include that deliverable? | BRD / Scope Doc | Project Manager | Scope verification for biometric integrations. | 2026-07-15 | **Open** |

---

## 13. Architecture Decisions

### ADR-001: TypeScript Modular Monolith
* **Decision:** Build the system as a single deployable monorepo utilizing strict pnpm package boundaries.
* **Reason:** Simplifies transaction consistency, database management, and deployment lifecycle for ASTI.
* **Status:** **Approved** (2026-06-15)

### ADR-002: Party-based Identity Model
* **Decision:** Use a single, unified `Person` record linked to User, Lead, Student, and Trainer tables.
* **Reason:** Prevents contact data duplication and simplifies unified identity history tracking.
* **Status:** **Approved** (2026-06-16)

### ADR-003: Session-Embedded Dynamic Data Scopes
* **Decision:** Dynamic user data scope collection is encoded directly within the session JWT payload.
* **Reason:** Enables database-free scope authorization checks at the HTTP/mutation boundary.
* **Status:** **Approved** (2026-06-22)

### ADR-004: Transactional Outbox Pattern
* **Decision:** Record all lifecycle side effects in the `OutboxEvent` table within the same transaction.
* **Reason:** Ensures reliable, asynchronous event notifications without needing a separate broker.
* **Status:** **Approved** (2026-06-26)

---

## 14. Review Findings

| Severity | Finding Description | Owner | Resolution / Status | Date Found |
| :--- | :--- | :--- | :--- | :--- |
| **High** | In-memory data leak: Scoped branch manager could query all system users and branches. | Codex | **Resolved** (Added database-level scoping filters and hierarchy resolution checks) | 2026-06-29 |
| **High** | Direct role-based authorization check: Hardcoded checks for `Admin` bypass dynamic permissions. | Tech Lead | **Resolved** (Refactored checks to query `scopeType === 'All'` dynamic settings) | 2026-06-29 |
| **Low** | Seed file naming inconsistency: Permission codes mismatch between codebase and db. | DB Engineer | **Resolved** (Synchronized everything to `iam.*` permission scopes) | 2026-06-28 |

---

## 15. Implementation Readiness

Each module is rated on an overall implementation implementation readiness scale:

1. **Identity & Access Management:** **100%** (All systems ready, tested, and secure)
2. **Organization Management:** **100%** (All hierarchy logic, tree views, and validations complete)
3. **CRM & Enquiry:** **95%** (Core models, qualification APIs, counselor scoping, stage histories, detail dashboards, auto-assignment, outcome logging, sweep cron, and CRM dashboard analytics are implemented; Campaign Management and configurable stages/sources admin panels are pending)
4. **Admission & Enrollment:** **35%** (Admissions models and convert handoff transactional orchestrator complete; UI and Enrollment elements are pending)
5. **Audit & Compliance:** **35%** (Audit repository is ready, database is active, but admin viewer is pending)
6. **Course & Batch Management:** **50%** (Course Catalog fully implemented and tested; Batch scheduling and trainer assignments pending)
7. **All Other Modules:** **5%** (Database tables exist; implementation pending)

---

## 16. Change History

| Date | Version | Author | Summary of Changes |
| :--- | :--- | :--- | :--- |
| **2026-06-22** | v1.0.0 | Codex | Baseline platform foundation, observability, user database refactoring, and initial RBAC. |
| **2026-06-26** | v2.0.0 | Codex | Complete organization structures (Institute, Branch, Department, Classroom CRUD, dating). |
| **2026-06-30** | v3.0.0 | Codex | Complete IAM frontend, session administration console, and dynamic scoping hierarchy fixes. |
| **2026-06-30** | v3.1.0 | Codex | Review and sync PSD with codebase. Updated tests, CRM/Admissions status, and Omani compliance details. |
| **2026-07-01** | v3.2.0 | Codex | Updated PSD to reflect CRM progress aligned with DDD / FRD definitions. Re-routed CRM status to In Progress (with 65% completion readiness) and updated test matrices. |
| **2026-07-01** | v3.3.0 | Codex | Completed Change 3 (crm-workflows-followup-scheduling). Added inquiry auto-assignment, composite outcome + follow-up scheduling, and hourly sweeper. Updated unit test statistics and PSD matrices. |
| **2026-07-01** | v3.3.1 | Codex | Applied code review suggestions to `crm-portal-ui-scoped-filtering`. Added counselor scoping check on lead conversion, mandatory version concurrency check, client-side re-synchronization on stage changes, and delegated stage/closure updates to LeadService. |
| **2026-07-01** | v3.4.0 | Codex | Completed Change 4 (crm-dashboards-and-reports). Scaffolded reporting-dashboards package, implemented LeadAnalyticsReadService and CrmDashboardQueryService with RBAC and Audits, added MetricCard and ChartWidget to shared-ui, and created the protected CRM dashboard page with responsive charts. |
| **2026-07-01** | v3.5.0 | Codex | Completed Course Catalog change (course-catalog-spec). Scaffolded course-catalog package, designed domain errors, bilingual validation rules, cyclic parent checks, active batch checks. Exposed courses and categories API handlers, added navigation menu mapping, and implemented Course Catalog List dashboard and bilingual Course Form with state machine transitions. |
| **2026-07-02** | v3.6.0 | Codex | Completed Trainer Assignment change (trainer-assignment-spec). Implemented trainer assignment invariants, date checks, branch RBAC permissions, and schedule overlap preview. Added multi-step form stepper logic and interactive conflict validator alerts/tables in BatchForm and BatchDetailsTabs. |

---

## 17. Metrics Dashboard

* **Total Modules:** 16 (including CRM, Admissions, Course/Batch, etc.)
* **Completed Modules:** 2 (IAM, Organization)
* **Approved Documents:** 11 (including newly approved CRM & Admissions schemas/designs)
* **Pending Reviews:** 1
* **Open Risks:** 3
* **Open Questions:** 3
* **Approved OpenSpec Changes:** 12
* **Pending OpenSpec Changes:** 0
* **Completed Development Tasks:** 95
* **Completed Test Cases:** 134

---

## 18. Oman Compliance Checklist (NFRs)

| ID | Compliance Requirement | Status | Verification Details |
| :--- | :--- | :--- | :--- |
| **NFR-OM-01** | Bilingual Text Fields (EN/AR) | Complete | `legalNameEnglish` and `legalNameArabic` fields are active on the `Institute` model in [schema.prisma](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/database/prisma/schema.prisma#L374-L375). UI panels display both languages. |
| **NFR-OM-02** | OMR Currency Decimal Precision | Complete | Decimal columns for all financial estimations are configured to `db.Decimal(12, 3)` supporting three-decimal formatting. |
| **NFR-OM-03** | Timezone Configuration | Complete | Systems default to `UTC` in database; UI converts displays to `Asia/Muscat` (+4 GMT). Timezone is supported at `Institute` and `BranchSettings` models. |
| **NFR-OM-04** | Tax Invoice Format & VAT 5% | In Progress | Tax registration numbers (`taxNumber` on `Institute`) are supported. Oman VAT (5%) breakdown calculations and invoice template designs are under development. |

---

## 19. Integration Adapter Tracker

| Adapter | Target External System | Status | Adapter Type / Port | Details |
| :--- | :--- | :--- | :--- | :--- |
| **ERP-01** | Tally ERP Financial Sync | Draft | Outbox Event Listener | Hashed Outbox Event captures payment logs. Sync adapter scheduled. |
| **BIO-01** | Biometric Offline Gateway | Planned | Biometric Webhook Sync | Device SDK mapping and sync queue schemas are drafted. |
| **NOT-01** | SMS/WhatsApp Gateway | Mocked | Notification Service Port | SMTP & Twilio SMS stub classes are executing in local sandbox. |
| **STO-01** | S3-Compatible Object Store | Mocked | Local FS Upload Port | Documents save locally in dev; AWS S3/MinIO clients pending config. |

---

## 20. Database Migration & Schema Health

* **Database Provider:** PostgreSQL 16+
* **ORM Engine:** Prisma Client
* **Latest Migration Applied:** [20260701034617_add_lead_stage_history](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/packages/database/prisma/migrations/20260701034617_add_lead_stage_history/migration.sql)
* **Prisma Seed Progress:** Full seeds configured for dynamic RBAC permissions (`iam.*`, `crm.*`), system roles, and ASTI root branch structures.
* **Pending Schema Adjustments:** Add Course-Batch pricing override models and fee plan installment schedules.

---

## 21. Environment Variable Configuration

The following variables are required to build and run the monorepo:
* `DATABASE_URL`: PostgreSQL connection string (Format: `postgresql://<user>:<password>@<host>:<port>/<db>`)
* `JWT_SECRET_KEY`: Security token signing key (RS256 private/public keypair required for production)
* `PORT`: Server port (Default: 3000)
* `NODE_ENV`: Application execution mode (`development` / `production` / `test`)
* `LOG_LEVEL`: Log level limit (`debug` / `info` / `warn` / `error`)

---

## 22. Quality & Test Metrics

* **Type-Checking Pipeline:** `pnpm typecheck` $\rightarrow$ **100% Passing**
* **Linter Pipeline:** `pnpm lint` $\rightarrow$ **100% Passing** (with 58 style warnings)
* **Formatter Check:** `pnpm format` $\rightarrow$ **Completed** (with Prettier configuration warnings)
* **Test Runners:**
  * Unit Tests (Vitest): **146 Tests** $\rightarrow$ **100% Passing**
  * Integration Tests (Prisma/Vitest): **4 Tests** $\rightarrow$ **100% Passing**
  * E2E Tests (Playwright): **4 Tests** $\rightarrow$ **100% Passing**

---

## 23. AI Assistant Context

```json
{
  "currentModule": "Admissions / Batch Waitlist",
  "currentPhase": "Workflow Integration",
  "latestApprovedDocuments": [
    "docs/architecture/ddd/ddd-context-map.md",
    "docs/architecture/ddd/ER Model.md",
    "docs/architecture/frd/Module 01: Identity & Access Management",
    "docs/architecture/frd/Module 02 – Organization Management",
    "docs/architecture/frd/Module 03: Lead & Inquiry Management",
    "docs/architecture/frd/Module 06: Course Catalog & Training Delivery (Batch) Management"
  ],
  "activeOpenSpecProposals": [],
  "pendingImplementationTasks": [
    "Design and build the central Enrollment aggregate root package (build-enrollment-aggregate-foundation)",
    "Design and implement the core billing, invoicing, and fee installment workflows for Finance (implement-finance-receivables-foundation)"
  ],
  "knownConstraints": {
    "astiScope": "Single-client (ASTI). No multi-tenant complexity allowed.",
    "roleFreeScoping": "scoping checks must evaluate dataScopes, not hardcoded strings like 'Admin'.",
    "branchDataIsolation": "Enforce strict branch boundaries and hierarchical parent-child overrides.",
    "auditRequirement": "All sensitive mutations must create an AuditLog entry.",
    "noRedisCaching": "Evaluate permissions directly via database queries for this phase."
  },
  "currentPriorities": [
    "1. Start the implementation plan for build-enrollment-aggregate-foundation",
    "2. Start the design specification details for implement-finance-receivables-foundation"
  ]
}
```
