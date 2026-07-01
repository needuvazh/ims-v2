# Agent Instructions for Institute Management System (IMS)

## 1. Role and Mission

You are Codex working on the Institute Management System (IMS), a single-client training institute platform. Your mission is to implement production-quality features while preserving the Domain-Driven Design boundaries described in the IMS DDD Context Map v3.0, Entity Relationship Model v3.0, and Technology Stack Recommendation.

Build the system as a TypeScript modular monolith in a monorepo. Treat Next.js route handlers as thin delivery adapters. Put business behavior in domain-oriented packages with application services, aggregate methods, repository interfaces, validation rules, authorization checks, events, tests, and clear infrastructure adapters.

## 2. Project Context

IMS supports coaching centers, skill training institutes, individual training, corporate training, walk-in fast track programs, admissions, fee collection, attendance, course completion, and certificate issuance.

The current scope is a single-client implementation for Al Saud Training Institute (ASTI). Tenant setup, SaaS subscription management, CMS or website builder capabilities, full payroll, online payment gateway automation, and AI intelligence are out of the initial phase unless explicitly requested. The website is static content with dynamic course data; CMS editing is excluded.

The central business concept is Enrollment. Enrollment connects Student, Course, Batch, Branch, Finance, Attendance, Completion, and Certificate. Regular, Corporate, and Walk-In learning journeys must share one Enrollment lifecycle instead of duplicating separate models.

## 3. Domain-Driven Design Summary

Core domains:

- Lead, Enquiry & CRM Management
- Admission & Enrollment Management
- Walk-In Fast Track Enrollment
- Course, Batch & Training Delivery
- Corporate Training Management
- Corporate Sales & Quotation
- Finance & Receivables
- Certificate Management
- Website & Digital Experience

Supporting domains:

- Organization Management
- Scheduling, Calendar & Holiday Management
- Attendance Management
- Faculty / Trainer Management
- Exam, Result & Completion Management
- Communication Management
- Document Management

Generic domains:

- Identity & Access Management
- Reporting & Executive Dashboards
- Audit & Compliance
- Configuration / Master Data
- Integration Management

Bounded contexts:

- **Identity & Access Management** owns User, Role, Permission, Menu, UserRole, RolePermission, AccessPolicy, and BranchAccess.
- **Organization Management** owns Institute, Branch, Department, and Classroom.
- **Configuration / Master Data** owns ConfigurationItem, LookupType, LookupValue, NumberingSeries, BusinessCalendar, LocalizedText, BranchHierarchy, PricingRule, and DiscountRule.
- **Website & Digital Experience** owns PublicCoursePage, WebsiteInquiry, OnlineRegistration, CorporateInquiry, WebsiteContent, SEOPageMetadata, and CampaignTrackingCode.
- **Lead, Enquiry & CRM Management** owns Lead, Enquiry, LeadSource, LeadStage, FollowUp, CounselorAssignment, LeadScore, and Campaign.
- **Admission & Enrollment Management** owns Admission, Student, Enrollment, StudentIdentity, StudentIDCard, and EnrollmentStatus.
- **Walk-In Fast Track Enrollment** owns WalkInEnrollment, WalkInPayment, WalkInCompletion, and WalkInConfirmation.
- **Corporate Training Management** owns CorporateAccount, CorporateContact, CorporateContract, CorporateDepartment, CorporateCoordinator, CorporateParticipant, CorporateTrainingProgram, and CorporateEnrollment.
- **Corporate Sales & Quotation** owns CorporateSalesLead, Quotation, QuotationLineItem, SalesOrder, SalesPipeline, CommercialTerms, and CreditLimit.
- **Course Catalog Management** owns Course, CourseCategory, CourseType, CoursePricing, CourseDiscount, CourseCompletionRule, CourseApproval, and CourseCatalogOption.
- **Training Delivery Management** owns Batch, Session, BatchTrainer, BatchCapacity, WaitingList, and TrainingDeliveryStatus.
- **Scheduling, Calendar & Holiday Management** owns Timetable, ScheduleSession, ClassroomBooking, Holiday, and VenueBlock.
- **Attendance Management** owns AttendanceSession, AttendanceRecord, AttendanceStatus, AttendanceCorrection, and AttendanceAlert.
- **Fee, Billing & Receivables Management** owns FeePlan, Invoice, InvoiceLineItem, InstallmentPlan, Payment, Receipt, Discount, Refund, CreditNote, Receivable, AgingBucket, and CorporateCreditRule.
- **Faculty / Trainer Management** owns TrainerProfile, TrainerQualification, TrainerAvailability, TrainerCourseAuthorization, and TrainerCompensationRate.
- **Exam, Result & Completion Management** owns Exam, Assessment, Result, Grade, CompletionRuleEvaluation, CourseCompletion, and CompletionApproval.
- **Certificate Management** owns Certificate, CertificateIssueLog, CertificateQRCode, CertificateVerification, and CertificateReissueRequest.
- **Communication & Notification Management** owns CommunicationTemplate, TemplatePlaceholder, NotificationRequest, NotificationLog, CommunicationChannel, and MessageDeliveryStatus.
- **Document Management** owns Document, DocumentType, DocumentOwner, DocumentVerification, DocumentStatus, and DocumentExpiry.
- **Reporting & Executive Dashboards** owns ReportDefinition, DashboardWidget, KPI snapshots, and dashboards (Chairman, CEO, MD, Sales, Finance, Training).
- **Audit & Compliance** owns AuditLog, ApprovalRequest, ApprovalStatus, ApprovalHistory, UserActionLog, and ComplianceEvent.

Important domain events:

- WebsiteInquirySubmitted
- OnlineRegistrationSubmitted
- CorporateInquirySubmitted
- LeadCreated
- LeadAssigned
- FollowUpScheduled
- ProposalIssued
- LeadConverted
- LeadLost
- AdmissionCreated
- StudentProfileCreated
- EnrollmentCreated
- EnrollmentApproved
- EnrollmentConfirmed
- EnrollmentCancelled
- EnrollmentCompleted
- WalkInEnrollmentCreated
- WalkInPaymentRecorded
- WalkInTrainingCompleted
- WalkInCertificateEligible
- CorporateAccountCreated
- CorporateContractCreated
- CorporateParticipantNominated
- CorporateParticipantConvertedToStudent
- CorporateBulkEnrollmentCreated
- CorporateInvoiceRequested
- CorporateCreditLimitExceeded
- CorporateSalesLeadCreated
- QuotationCreated
- QuotationApproved
- QuotationRejected
- SalesOrderCreated
- CorporateDealClosed
- CourseCreated
- CourseApproved
- CoursePublished
- CoursePricingUpdated
- CourseDiscountUpdated
- BatchCreated
- BatchPricingOverridden
- BatchDiscountOverridden
- BatchCapacityReached
- StudentAddedToWaitingList
- TrainerAssignedToBatch
- SessionScheduled
- AttendanceSessionCreated
- AttendanceMarked
- AttendanceUpdated
- LowAttendanceDetected
- InvoiceGenerated
- PaymentRecorded
- ReceiptGenerated
- InstallmentDue
- InvoiceOverdue
- DiscountApplied
- RefundRequested
- RefundApproved
- CreditNoteIssued
- CorporateCreditValidationPassed
- CorporateCreditValidationFailed
- ExamScheduled
- ResultRecorded
- CompletionEvaluationRequested
- CourseCompletionApproved
- CertificateEligible
- CertificateGenerated
- CertificateReissued
- CertificateVerified
- NotificationRequested
- MessageSent
- MessageFailed
- CommunicationLogged
- UserActionPerformed
- ApprovalRequested
- ApprovalApproved
- ApprovalRejected
- CriticalDataChanged

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
asti-ims/
  apps/
    admin-portal/

  packages/
    identity-access/
    organization/
    configuration/
    website-digital/
    crm-leads/
    admission-enrollment/
    walkin-fast-track/
    corporate-training/
    corporate-sales-quotation/
    course-catalog/
    training-delivery/
    scheduling-calendar/
    attendance/
    finance-receivables/
    trainer-management/
    exams-completion/
    certificates/
    communication-notifications/
    documents/
    reporting-dashboards/
    audit-compliance/
    shared/

  infrastructure/
    database/
    auth/
    storage/
    jobs/
    deployment/
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

Use a shared Person / Party concept (`Party` can be `Person` or `Organization`) to reduce duplicate identity data across students, trainers, employees, corporate contacts, and coordinators.

Admission and Enrollment are separate concepts:

- Admission means becoming a registered student or customer of the institute.
- Enrollment means joining a Course, Batch, Corporate Program, or Walk-In session.
- A Student may have multiple Enrollments over time.

Enrollment is the central aggregate root for learning lifecycle behavior. Other contexts may reference Enrollment by ID, but they must not directly mutate Enrollment tables or bypass Enrollment application services.

- Enrollment must link to a course and a batch.
- Regular, Corporate, Online, and Walk-In training journeys must share one Enrollment lifecycle instead of duplicating separate models.
- Corporate employees begin as Corporate Participants. Link them to Student only when login access, individual lifecycle tracking, certificate history, future enrollments, or individual payments are required. A Corporate Participant becomes a student once enrolled.
- Walk-In is a specialized enrollment strategy, not a separate student type. It must reuse Course rules, Enrollment lifecycle, Finance payment validation, Completion validation, and Certificate eligibility.

Put invariants inside aggregate methods or domain services. Examples:

- **Course Rules**: A Course can be offered only when the current date is inside its effective date range. Published courses must have valid pricing and completion rules (owned by Course Catalog).
- **Pricing Resolution**: Pricing and discounts follow a strict hierarchy: Batch level override -> Branch level override -> Global course catalog default pricing. Course Catalog owns the pricing rules; Finance applies resolved pricing during invoice generation.
- **Corporate Credit**: Corporate credit limit validation applies during corporate enrollment. If the corporate credit limit is exceeded and the block flag is true, block the enrollment. If the block flag is false, allow the enrollment.
- **Scheduling Conflicts**: Scheduling must prevent trainer double booking, classroom double booking, batch overlap, holiday conflicts, and venue blocked-date conflicts.
- **Completion & Approval**: Course completion rules are evaluated in the Exam/Completion context. Completion approval follows a workflow: Trainer Recommendation -> Academic Coordinator Review -> Branch Manager Approval.
- **Certificate Issuance**: Certificate context issues, verifies, reissues, and revokes certificates, but does not compute eligibility. QR code verification must be unique. Certificate re-issue requires management approval. A single hardcoded template is used for now.
- **Refund Approval**: Refund approval follows Finance, Branch Manager, and Management approval.

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

- The current project is single-client for ASTI, not SaaS.
- The implementation target is a TypeScript monorepo with Next.js portals.
- PostgreSQL and Prisma are the preferred persistence stack.
- Manual payments and manual attendance are Phase 1.
- Online payment gateway automation, HRMS, ESS, Payroll, Tally Integration, and Biometric Integration are deferred/future phases.
- AI Intelligence is final phase and should not drive early architecture.
- Oman-standard tax invoice and receipt formats are required, but detailed legal formatting rules are generic for now.
- Website is static content with dynamic course data; CMS editing is excluded.

Open questions:

- Biometric device details are unknown.
- Certificate templates are hardcoded now; future configurability is required.
- Invoice format is generic for now.
- HRMS and Trainer Management should avoid duplicate person profiles (reusing Person / Party data).
- Online payment gateway phase needs final confirmation.
- Exact Oman tax invoice format needs validation.
- Exact branch hierarchy model needs confirmation.
- Exact corporate credit limit defaults need confirmation.
- Exact dashboard permissions need to be defined.
- Exact student ID and enrollment numbering formats need confirmation.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
