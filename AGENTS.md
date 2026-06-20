# Agent Instructions for Institute Management System (IMS)

## 1. Role and Mission

You are Codex working on the Institute Management System (IMS), a single-client training institute platform. Your mission is to implement production-quality features while preserving the Domain-Driven Design boundaries described in the IMS DDD Context Map v1.2, Entity Relationship Model v1.1, and Technology Stack Recommendation.

Build the system as a TypeScript modular monolith in a monorepo. Treat Next.js route handlers as thin delivery adapters. Put business behavior in domain-oriented packages with application services, aggregate methods, repository interfaces, validation rules, authorization checks, events, tests, and clear infrastructure adapters.

## 2. Project Context

IMS supports coaching centers, skill training institutes, individual training, corporate training, walk-in completion programs, admissions, fee collection, attendance, course completion, and certificate issuance.

The current scope is a single-client implementation. Tenant setup, SaaS subscription management, CMS or website builder capabilities, full payroll, online payment gateway automation, and AI intelligence are out of the initial phase unless explicitly requested.

The central business concept is Enrollment. Enrollment connects Student, Course, Batch, Branch, Finance, Attendance, Completion, and Certificate. Regular, Corporate, and Walk-In learning journeys must share one Enrollment lifecycle instead of duplicating separate models.

## 3. Domain-Driven Design Summary

Core domains:

- Lead & Inquiry Management
- Admission & Enrollment Management
- Course, Batch & Completion Rule Management
- Fee & Finance Management
- Certificate Management
- Corporate Training Management
- Walk-In Enrollment & Completion Flow

Supporting domains:

- Organization Management
- Faculty / Trainer Management
- Scheduling & Timetable Management
- Attendance Management
- Exam, Result & Completion Management
- Communication Management
- Document Management

Generic domains:

- Identity & Access Management
- Reporting & Analytics
- Audit & Compliance
- Notification Infrastructure
- AI Intelligence, final phase only

Bounded contexts:

- Identity & Access Management owns User, Role, Permission, UserRole, RolePermission, AccessPolicy, and secure access behavior.
- Organization Management owns Institute, Branch, Department, and Classroom.
- Lead & Inquiry Management owns Lead, LeadSource, LeadStage, FollowUp, and Campaign.
- Admission & Enrollment Management owns Student, Admission, Enrollment, StudentIdentity, and StudentIDCard.
- Corporate Training Management owns CorporateAccount, CorporateContactPerson, CorporateContract, CorporateProgram, and CorporateParticipant.
- Course & Batch Management owns Course, CoursePricing, CourseCompletionRule, Batch, BatchTrainer, and WaitingList.
- Walk-In Enrollment & Completion Flow is an application flow over Enrollment, Finance, Completion, and Certificate. It does not own a separate learner lifecycle.
- Scheduling & Timetable Management owns ScheduleSession and scheduling conflict rules.
- Attendance Management owns AttendanceRecord and attendance calculations.
- Fee & Finance Management owns FeePlan, InstallmentPlan, EnrollmentFeeAccount, Payment, Receipt, Discount, and Refund.
- Faculty / Trainer Management owns Trainer, TrainerQualification, TrainerDocument, TrainerAvailability, TrainerAssignment, and TrainerPayment.
- Exam, Result & Completion Management owns Exam, Result, CourseCompletion, and completion approval behavior.
- Certificate Management owns CertificateTemplate, Certificate, and CertificateVerificationLog.
- Communication Management owns CommunicationTemplate, CommunicationLog, and SystemNotification.
- Document Management owns DocumentType, Document, and DocumentVerification.
- Reporting & Analytics owns ReportDefinition, DashboardWidget, MetricSnapshot, read models, and dashboards.
- Audit & Compliance owns AuditLog and ApprovalLog.

Important domain events:

- EnrollmentCreated
- EnrollmentConfirmed
- ManualPaymentRecorded
- CourseCompleted
- CertificateEligibilityApproved
- CertificateGenerated
- CorporateParticipantRegistered
- WalkInCompletionApproved
- TrainerPaymentRecorded

## 4. Architecture Principles

Use a modular monolith first. Do not introduce microservices unless independently deployed teams, scale, or operational requirements clearly justify the extra complexity.

Use Clean Architecture and Hexagonal Architecture principles where useful:

- Keep domain models independent of Next.js, Prisma, HTTP, UI, vendors, and job runners.
- Define use cases in application services.
- Keep infrastructure adapters behind interfaces owned by the domain or application layer.
- Use dependency direction from delivery/infrastructure inward toward application and domain code.
- Keep transaction boundaries in application services, not controllers or UI code.

Do not implement CQRS unless read and write concerns are materially different. Do not implement event sourcing unless audit-grade replay or temporal reconstruction becomes a documented requirement.

## 5. Tech Stack

Use the recommended stack unless the repository already contains an approved alternative:

- Monorepo for apps, packages, infrastructure, and shared tooling.
- Next.js for admin, student, trainer, and public certificate verification portals.
- React and TypeScript for frontend code.
- Tailwind CSS with a disciplined shared UI package.
- Next.js route handlers and server actions as delivery adapters only.
- TypeScript domain packages for backend application and domain logic.
- Zod for API boundary validation and typed contracts.
- React Hook Form plus Zod for complex forms.
- TanStack Query or an equivalent server-state tool where client-side server state is needed.
- PostgreSQL as the primary database.
- Prisma for ORM and migrations unless the repository has chosen another migration tool.
- Transactional outbox table for reliable domain-event side effects.
- Background worker for follow-up reminders, notifications, certificate generation tasks, reporting snapshots, and other async work.
- Object storage for documents, certificate templates, and generated files.
- Structured logs, tracing, error tracking, audit logs, and business metrics.

## 6. Repository Structure

Prefer this structure unless the repository already has an equivalent pattern:

```text
ims-monorepo/
  apps/
    admin-portal/
      app/student/
      app/trainer/
      app/verify/

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
```

Each domain package should expose a small public API. Do not import another context's internal files. Use public application service contracts, events, or query interfaces.

## 7. Coding Standards

Use TypeScript strict mode. Avoid `any` unless the boundary is genuinely untyped and the value is immediately validated.

Use clear IMS domain naming:

- Use `Enrollment`, not generic names like `RegistrationRecord`.
- Use `CorporateParticipant`, not `CorporateStudent`, unless the participant is explicitly linked to a Student profile.
- Use `ManualPaymentRecorded`, not vendor-specific or UI-specific event names.
- Use `BranchScopedPermission` or similarly explicit names for authorization behavior.

Keep code organized by feature and bounded context. Do not create a generic `services` dump.

Keep business rules in aggregate methods, domain services, or application services. Route handlers, React components, Prisma models, and UI form code must not decide certificate eligibility, refund approvals, trainer double booking, fee due calculation, enrollment status transitions, or completion approval.

Use structured errors with stable error codes. Avoid throwing raw strings.

Add comments only where they clarify non-obvious domain behavior, invariants, or integration constraints.

## 8. Domain Modeling Rules

Enrollment is the central aggregate root for learning lifecycle behavior. Other contexts may reference Enrollment by ID, but they must not directly mutate Enrollment tables or bypass Enrollment application services.

Admission and Enrollment are separate concepts:

- Admission means becoming a registered student or customer of the institute.
- Enrollment means joining a Course, Batch, Corporate Program, or Walk-In session.
- A Student may have multiple Enrollments over time.

Corporate employees begin as Corporate Participants. Link them to Student only when login access, individual lifecycle tracking, certificate history, future enrollments, or individual payments are required.

Walk-In is a specialized enrollment and completion flow. It must reuse Course rules, Enrollment lifecycle, Finance payment validation, Completion validation, and Certificate eligibility.

Put invariants inside aggregate methods or domain services. Examples:

- A Course can be offered only when the current date is inside its effective date range.
- A Course must explicitly allow walk-in completion before a Walk-In Enrollment can be completed through the walk-in flow.
- Same-day walk-in completion is allowed only through the Walk-In orchestration flow.
- Certificate issuance requires certificate eligibility validation.
- Certificate eligibility may depend on attendance, completion, exam pass, manual approval, walk-in completion, and payment completion.
- Scheduling must prevent trainer double booking, classroom double booking, and batch overlap.
- Completion approval follows Trainer Recommendation, Academic Coordinator Review, and Branch Manager Approval.
- Refund approval follows Finance, Branch Manager, and Management.

Use value objects for Money, DateRange, EffectiveDateRange, Percentage, BranchId, CourseId, EnrollmentId, CertificateNumber, and other concepts where validation matters.

Keep shared-kernel small. It may contain stable IDs, Money, DateRange, effective dating helpers, status primitives, audit metadata, branch scoping primitives, and document references. It must not contain workflow logic.

## 9. API Design Rules

API routes must:

- Authenticate the request.
- Authorize the action server-side.
- Validate request shape with Zod or the approved validation library.
- Call one application service.
- Return a stable DTO response.
- Map domain errors to documented HTTP responses.

API routes must not contain business rules, direct Prisma workflow mutations, or cross-context orchestration logic.

Do not leak Prisma models into API contracts. Do not leak DTOs into domain models.

Use command-style application service names for mutations, such as `createEnrollment`, `confirmEnrollment`, `recordManualPayment`, `approveCourseCompletion`, and `generateCertificate`.

Use query services or read models for dashboards, reports, lists, and search.

Document each API with:

- Endpoint name and route.
- Request DTO schema.
- Response DTO schema.
- Required permission.
- Branch-scoping behavior.
- Validation failures.
- Domain errors.
- Audit behavior when applicable.

## 10. Database and Persistence Rules

Use PostgreSQL as the system of record. Model ownership by bounded context. A table must have one owning context.

Use Prisma migrations or the repository-approved migration tool. Do not edit generated migration history casually after it has been applied.

Prefer relational constraints for data that must always be true. Use application services for business workflows and cross-aggregate policies.

Most transactional entities should include:

- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`
- `deletedAt`
- `deletedBy`
- `isDeleted`
- `status`

Master, configuration, pricing, rule, template, organization, contract, and assignment entities should include:

- `status`
- `effectiveStartDate`
- `effectiveEndDate`

Use `NULL` effective end date to mean valid indefinitely.

Use soft delete only where history must be preserved and deletion must not destroy auditability. Do not soft-delete records to hide domain errors.

Use one repository interface per aggregate root where appropriate. Repository interfaces belong near the application/domain package. Prisma implementations belong in infrastructure/database adapters.

Avoid cross-context joins in write paths. Reporting may use read models, snapshots, or carefully designed read-only queries.

## 11. Event and Messaging Rules

Use in-process domain events and a transactional outbox for Phase 1. Do not add RabbitMQ, Redis queues, or external brokers until scale, independent deployment, webhooks, or operational needs justify them.

Publish domain events only after the related state change succeeds. Persist outbox records in the same transaction as the state change where reliability matters.

Events form a published language inside the monorepo. Keep event names domain-oriented and stable.

Use event subscribers for side effects such as notifications, audit projections, reporting snapshots, certificate generation jobs, and integration calls. Do not let event subscribers mutate the original aggregate outside explicit application-service workflows.

Payment gateway integrations, SMS, WhatsApp, email, storage, and future AI integrations must be hidden behind anti-corruption adapters in `packages/integrations` or equivalent infrastructure packages.

## 12. Security Rules

Use dynamic RBAC. Roles must not be hardcoded.

Permissions must support action-level, menu-level, and report-level access. Permission checks must happen server-side in application services or route-level policy guards.

UI menu hiding is not authorization.

Enforce branch-scoped access:

- Branch managers access assigned branch data only.
- Counselors access assigned leads by default.
- Optional counselor access to all branch leads requires an explicit permission.
- Student, trainer, accountant, counselor, and branch manager access must be separated.

Use secure password hashing with a modern algorithm. Keep the identity model MFA-ready.

Use signed URLs or equivalent controlled access for documents and certificates.

Validate configurable student identity fields at the boundary and in the relevant domain rules.

Audit access-control changes and all sensitive state changes.

## 13. Observability Rules

Use structured logs with request IDs, user IDs when available, branch IDs when relevant, and domain action names.

Do not log passwords, tokens, identity document contents, payment secrets, signed URL secrets, or excessive personally identifiable information.

Use tracing for API requests, application services, database calls, background jobs, and external integrations.

Track business metrics for:

- Lead conversion
- Enrollment status distribution
- Payment dues
- Receipt generation
- Refunds and discounts
- Attendance
- Completion approvals
- Certificate issuance
- Trainer utilization
- Branch-scoped activity

Audit logs are mandatory for Finance, Attendance changes, Completion approvals, Certificate issuance, document verification, and access-control changes.

## 14. Testing Rules

Write domain unit tests for invariants and status transitions.

Write application service tests for authorization, transactions, repository interaction, domain events, and error mapping.

Write API tests for authentication, authorization, validation, and response contracts.

Write integration tests for repositories, migrations, outbox behavior, and background workers.

Write end-to-end tests for core workflows:

- Lead to admission
- Admission to enrollment
- Manual payment to receipt
- Attendance to completion
- Completion to certificate
- Walk-in enrollment to same-day certificate
- Branch-scoped access control

For UI, test important forms, empty states, loading states, validation failures, permission-based visibility, and successful submissions.

Do not merge changes that alter Finance, Certificate, Completion, Enrollment, or RBAC behavior without targeted tests.

## 15. CI/CD Rules

CI must run:

- Type checks
- Linting
- Unit tests
- Integration tests where available
- API contract tests where available
- Prisma schema validation and migration checks
- Build checks for affected apps and packages

Deployment should be container-ready. Use one deployable application initially, plus a worker process when background jobs are required.

Keep environment configuration explicit. Do not commit secrets.

Run database migrations through the approved pipeline. Include rollback or mitigation notes for risky schema changes.

## 16. Documentation Rules

Document each bounded context with:

- Purpose
- Owned entities
- Aggregate roots
- Application services
- Repository interfaces
- Commands
- Queries
- Events
- Permissions
- Important invariants

Maintain an API inventory by module. The recommended initial order is:

1. Identity & Access APIs
2. Organization APIs
3. Lead APIs
4. Student & Enrollment APIs
5. Course & Batch APIs
6. Finance APIs
7. Attendance APIs
8. Certificate APIs

Update architecture decision records for major choices such as adding a broker, extracting a service, changing persistence strategy, adding payment gateway automation, or introducing AI features.

## 17. Agent Workflow

Before editing code:

1. Read the relevant package, tests, schema, and existing patterns.
2. Identify the bounded context that owns the change.
3. Check whether the change affects Enrollment, Finance, Completion, Certificate, RBAC, or Audit.
4. Confirm data ownership before writing to tables or adding dependencies.
5. Make the smallest coherent change that preserves domain boundaries.

While implementing:

- Put business behavior in domain/application code.
- Keep route handlers thin.
- Use typed DTOs and Zod schemas at boundaries.
- Add or update tests in proportion to risk.
- Add audit events for sensitive domain actions.
- Use domain events for lifecycle notifications.

Before finishing:

- Run relevant checks.
- Summarize changed files and behavior.
- State any tests not run.
- Call out assumptions or open questions.

## 18. What the Agent Must Never Do

Never put business rules directly in Next.js route handlers, React components, Prisma hooks, or database triggers unless explicitly approved for a narrow technical reason.

Never bypass Enrollment application services to mutate enrollment lifecycle state.

Never create separate lifecycle models for Regular, Corporate, and Walk-In flows when the shared Enrollment aggregate should apply.

Never hardcode roles or permissions.

Never rely on UI hiding for authorization.

Never leak Prisma models into API responses or domain models.

Never let vendor payloads from payment gateways, SMS, WhatsApp, email, storage, or future AI providers enter the domain model directly.

Never introduce microservices, CQRS, event sourcing, Redis, a message broker, or a separate backend framework without documented justification.

Never remove auditability from Finance, Attendance, Completion, Certificate, Document Verification, or RBAC changes.

Never fabricate business rules where the documents are ambiguous. Mark assumptions and ask only when ambiguity changes behavior, architecture, or security.

## 19. Recommended Skills

- `frontend-skill`: Mandatory when building IMS portals, dashboards, operational forms, and public verification UI. Use it to keep interfaces usable, dense, accessible, and aligned with workflow-heavy IMS operations.
- `Spreadsheets`: Optional but useful for reporting exports, import templates, reconciliation sheets, finance summaries, and operational dashboards delivered as `.xlsx`.
- `documents`: Optional for user-facing `.docx` documents such as implementation plans, API inventories, policy documents, or formal business documentation.
- `pdfs`: Optional for certificate PDFs, receipt/invoice PDFs, printable student ID cards, document verification packets, and PDF inspection.
- `openai-docs`: Optional for the final-phase AI Intelligence work or OpenAI API integration decisions. Use official OpenAI sources only.
- `skill-creator`: Optional when creating IMS-specific skills listed below.

## 20. Custom Skills to Create

- `ims-ddd-domain-modeling`: Use to translate IMS DDD contexts into aggregates, entities, value objects, invariants, domain services, and events.
- `ims-api-contract-planner`: Use to create module-wise API inventories with DTOs, permissions, validation rules, errors, and audit requirements.
- `ims-prisma-schema-designer`: Use to convert the ER model into Prisma/PostgreSQL schema while preserving context ownership, effective dating, soft delete, and audit fields.
- `ims-rbac-branch-authorization`: Use to design and test dynamic RBAC, branch scoping, counselor visibility, and report/menu/action permissions.
- `ims-workflow-test-generator`: Use to generate domain, application, API, and E2E tests for lead-to-admission, enrollment, manual payment, completion, certificate, walk-in, and branch-scoped access workflows.
- `ims-finance-audit-rules`: Use to enforce manual payment, receipt, discount, refund, approval hierarchy, due tracking, and audit requirements.
- `ims-certificate-workflow`: Use to implement certificate eligibility, generation, issuance, public verification, templates, and certificate audit trails.
- `ims-document-verification`: Use to implement document types, uploads, signed access, verification workflow, and required document rules.

## 21. Definition of Done

A change is done only when:

- The owning bounded context is clear.
- Domain logic is in the domain or application layer.
- API routes are thin adapters.
- Validation exists at the API boundary.
- Authorization is enforced server-side.
- Branch scoping is applied where required.
- Persistence changes have migrations and respect data ownership.
- Sensitive actions produce audit logs.
- Domain events or outbox records are published where lifecycle side effects are required.
- Tests cover the changed business behavior.
- Relevant CI checks pass or any skipped checks are clearly reported.
- Documentation or API inventory is updated when contracts change.

## 22. Open Questions and Assumptions

Assumptions from the uploaded documents:

- The current project is single-client, not SaaS.
- The implementation target is a TypeScript monorepo with Next.js portals.
- PostgreSQL and Prisma are the preferred persistence stack.
- Manual payments are Phase 1; online payment gateway automation is final phase.
- Communication Management and Corporate Training are Phase 2 unless reprioritized.
- AI Intelligence is final phase and should not drive early architecture.
- Oman-standard tax invoice and receipt formats are required, but detailed legal formatting rules are not provided in the uploaded material.

Open questions:

- Which package manager and monorepo tool should be used: npm workspaces, pnpm, Turborepo, Nx, or another tool?
- Which authentication provider or library should be used?
- Which UI component primitives should be standardized?
- Which deployment platform is selected for the first production release?
- Which object storage provider should be used?
- What exact audit retention, privacy, and compliance requirements apply?
- What are the exact student identity fields for Oman and future supported countries?
- What are the exact receipt, tax invoice, certificate, and student ID card templates?
- What test framework and E2E framework should be standardized?
