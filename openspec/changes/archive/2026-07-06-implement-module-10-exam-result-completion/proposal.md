## Why

Module 10 – Exam, Result & Completion Management is a core bounded context defined in the IMS DDD Context Map and ER Model, but its four aggregate roots (Exam, Result, CourseCompletion, CompletionApproval) are missing from the Prisma schema and have no domain, application, or API implementation. This blocks the academic completion workflow: trainers cannot record results, coordinators cannot evaluate completion, and certificates cannot be issued. The FRD (Parts 1–11) provides comprehensive requirements, but implementation has not begun.

## What Changes

- Add 4 Prisma models (Exam, Result, CourseCompletion, CompletionApproval) with enums, relations, constraints, and indexes
- Implement domain aggregates with state machines, invariants, and domain events for all 4 aggregates
- Implement application services for Exam lifecycle, Result recording/finalization/correction, Completion evaluation, and 3-stage approval workflow (Trainer → Coordinator → Branch Manager)
- Implement API route handlers with Zod validation, server-side authorization, branch scoping, and error mapping
- Implement admin portal UI for Exam management, Result entry (individual + bulk), Completion evaluation, and approval queues
- Add cross-context readers for Course Catalog, Enrollment, Attendance, Finance, and Trainer contexts
- Implement audit logging for all sensitive mutations and notification event emission for lifecycle transitions
- Add BDD test coverage for 142+ scenarios covering positive/negative paths, authorization, branch isolation, and DDD boundaries

## Capabilities

### New Capabilities

- `exam-management`: Exam creation, scheduling, activation, closure, cancellation, and archival with state machine enforcement
- `result-recording`: Individual and bulk Result entry, marks validation, server-derived pass/fail status, and finalization
- `result-correction`: Post-finalization Result correction with mandatory reason, audit trail, and completion reevaluation trigger
- `completion-evaluation`: Automated completion evaluation against CourseCompletionRule using Attendance, Exam, and Payment evidence with fail-safe dependency handling
- `completion-approval`: Three-stage approval workflow (Trainer Recommendation → Coordinator Review → Branch Manager Final Approval) with stage-specific permissions and evidence staleness checks
- `completion-reevaluation`: Controlled reevaluation when authoritative evidence changes after approval, with exception handling and approval history preservation
- `exam-result-reporting`: Operational dashboards, reports, and exports for Exam register, Result register, missing results, completion evaluation, and approval queues
- `exam-result-notifications`: Domain event emission for Exam scheduling, Result recording/finalization/correction, Completion evaluation, approval stage transitions, and certificate eligibility handoff

### Modified Capabilities

- `enrollment-lifecycle`: Enrollment status transitions now reference CourseCompletion outcome for completion gating (adds downstream dependency)
- `batch-delivery`: Batch completion event triggers async completion evaluation for all enrolled students (adds event consumer)
- `course-catalog`: CourseCompletionRule is now consumed by Module 10 for completion evaluation (adds cross-context read boundary)
- `walkin-enrollment`: Walk-In completion checks now route through Module 10's completion evaluation instead of inline logic

## Impact

**Affected Packages:**
- New: `packages/exam-result-completion/` (domain, application, infrastructure, contracts, tests)
- Modified: `packages/database/prisma/schema.prisma` (4 new models, 5 new enums, relations, constraints)
- Modified: `apps/admin-portal/` (new routes, UI components, API integration)
- Modified: `packages/shared/` (audit integration, notification event contracts)

**Affected APIs:**
- 19 new API endpoints under `/api/exams/*`, `/api/results/*`, `/api/completions/*`
- All endpoints require authentication, permission checks, and branch scope validation

**Database Impact:**
- 4 new tables: `exam`, `result`, `course_completion`, `completion_approval`
- 5 new enums: `ExamStatus`, `ResultStatus`, `CompletionStatus`, `ApprovalLevel`, `ApprovalStatus`
- Migration required with backward-compatible expand-and-contract pattern

**Authorization Impact:**
- 20+ new permissions (exam.*, result.*, completion.*, report.*)
- Permission seeds required for default role bundles
- Branch scoping enforced via entity-derived branch chains

**Audit Impact:**
- All sensitive mutations (Result correction, approval decisions, Exam cancellation) require mandatory audit entries
- Audit writes must be transactionally consistent with business state changes

**Event/Outbox Impact:**
- 15+ new domain events emitted to transactional outbox
- Events trigger downstream: Certificate eligibility handoff, Enrollment sync, Notification requests

**NFR Impact:**
- Performance targets: P95 < 1s for single writes, < 3s for completion evaluation, < 5s for bulk validation (1000 rows)
- Availability: 99.9% monthly target with graceful degradation for Attendance/Finance dependency failures

**Test Impact:**
- 142+ BDD scenarios across 20 features
- Unit tests for domain invariants and state machines
- Integration tests for cross-context readers and audit integration
- API contract tests for all 19 endpoints
- Security tests for IDOR, branch isolation, permission escalation, and forged fields

**Portal Impact:**
- Admin portal: Full operational surface for Exam, Result, Completion workflows
- Student portal: Future read-only result/certificate visibility (deferred)
- Trainer portal: Future Result entry and recommendation queue (deferred)
- Public certificate verification: No direct impact (consumes Certificate context, not Module 10)
