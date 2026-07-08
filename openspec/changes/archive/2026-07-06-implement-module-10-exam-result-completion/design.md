## Context

Module 10 – Exam, Result & Completion Management is defined in the IMS DDD Context Map as the "Exam, Result & Completion Management" bounded context. The ER Model specifies four persisted entities: Exam, Result, CourseCompletion, and CompletionApproval. The FRD (Parts 1–11) provides comprehensive functional requirements, API contracts, permission matrices, validation rules, BDD scenarios, security architecture, NFRs, and operational runbooks.

However, `schema.prisma` currently contains zero models for these aggregates. No domain package, application services, API routes, or UI components exist. This blocks the academic completion workflow entirely.

The module must integrate with five existing bounded contexts via read-only boundaries:

- **Course Catalog**: CourseCompletionRule resolution
- **Admission & Enrollment**: Enrollment context validation
- **Attendance**: Attendance percentage/outcome evidence
- **Finance & Receivables**: Payment validation status
- **Faculty/Trainer Management**: Trainer assignment verification

The module must emit events to three downstream contexts:

- **Certificate Management**: Certificate eligibility handoff
- **Admission & Enrollment**: Enrollment completion sync
- **Communication & Notification**: Notification event emission

## Goals / Non-Goals

**Goals:**

- Implement all 4 aggregate roots with complete state machines, invariants, and domain events
- Provide 19 API endpoints with Zod validation, server-side authorization, and branch scoping
- Support individual and bulk Result entry with server-derived pass/fail status
- Implement 3-stage approval workflow (Trainer → Coordinator → Branch Manager) with evidence staleness checks
- Enable automated completion evaluation against CourseCompletionRule with fail-safe dependency handling
- Emit domain events to transactional outbox for downstream context integration
- Provide admin portal UI for all operational workflows
- Achieve 142+ BDD test scenarios covering positive/negative paths, authorization, and DDD boundaries

**Non-Goals:**

- Student portal read access (deferred to future phase)
- Trainer portal Result entry UI (deferred to future phase)
- Certificate generation/issuance (owned by Certificate Management context)
- Grade master data/scale configuration (free-text field for now, future master data)
- Exam retake/attempt number tracking (future scope)
- External message brokers, Redis queues, or microservices (modular monolith only)
- Online payment gateway automation (manual payment recording only in Phase 1)

## Decisions

### 1. Package Structure: Single Domain Package with Layered Internals

**Decision:** Create `packages/exam-result-completion/` with internal layering:

```
packages/exam-result-completion/
  domain/          # Aggregates, entities, value objects, domain events, repository interfaces
  application/     # Application services, command/query handlers, DTOs, authorization
  infrastructure/  # Prisma repository implementations, cross-context readers, outbox publisher
  contracts/       # Zod schemas, API DTOs, error codes
  tests/           # Unit, integration, and BDD tests
```

**Rationale:** Keeps all Module 10 code co-located while preserving Clean Architecture boundaries. Repository interfaces in `domain/`, Prisma implementations in `infrastructure/`. Cross-context readers are infrastructure concerns that implement domain-defined interfaces.

**Alternatives Considered:**

- Separate packages per aggregate (exam, result, completion) → Too granular for Phase 1, adds import complexity
- Shared package with all modules → Violates bounded context isolation

### 2. State Machine Persistence: Dedicated Status Fields per Aggregate

**Decision:** Each aggregate gets a dedicated status enum field:

- `Exam.status`: `ExamStatus` enum (Draft, Scheduled, OpenForResultEntry, Closed, Cancelled, Archived)
- `Result.resultStatus`: `ResultStatus` enum (Pending, Recorded, Finalized, Corrected)
- `CourseCompletion.completionStatus`: `CompletionStatus` enum (Pending, EvidenceIncomplete, AwaitingTrainerRecommendation, AwaitingCoordinatorReview, AwaitingFinalApproval, Approved, Rejected, ReevaluationRequired, ExceptionReview)
- `CompletionApproval.approvalLevel`: `ApprovalLevel` enum (TrainerRecommendation, CoordinatorReview, FinalApproval)
- `CompletionApproval.status`: `ApprovalStatus` enum (Pending, Approved, Rejected)

**Rationale:** FRD Part 2 defines explicit state machines for each aggregate. Dedicated enums enable database-level constraints, clear API contracts, and type-safe state transitions. Avoids overloading a single status field with ambiguous semantics.

**Alternatives Considered:**

- Single string field with application-level validation → Loses database constraint benefits, harder to query
- Separate lifecycle state + academic status fields → Added complexity without clear benefit for Phase 1

### 3. Result Finalization: Dedicated `finalizedAt`/`finalizedBy` Fields

**Decision:** Add `finalizedAt` (DateTime?) and `finalizedBy` (String?) fields to Result model, separate from `resultStatus`.

**Rationale:** FRD Part 7 and Part 10 require audit evidence for who/when a Result was finalized. Overloading `resultStatus` with finalization timestamp loses provenance. Separate fields enable queries like "find all Results finalized by user X in date range Y".

### 4. Completion Evaluation: Server-Derived Evidence, No Client-Supplied Flags

**Decision:** The `EvaluateCompletionSchema` intentionally excludes `attendancePassed`, `examPassed`, `paymentCompleted`, `completionStatus`, and `certificateEligible`. All values are server-derived from authoritative sources.

**Rationale:** FRD Part 7 explicitly prohibits trusting client-supplied academic decisions. Server must reload CourseCompletionRule, Attendance evidence, Result evidence, and Finance validation at evaluation time. This prevents forged completion approvals.

### 5. Branch Scoping: Entity-Derived Branch Chains, Not Client-Supplied

**Decision:** Branch authorization derives from entity relationships, not request body:

- Exam → Batch → Branch
- Result → Exam → Batch → Branch
- CourseCompletion → Enrollment → Branch
- CompletionApproval → CourseCompletion → Enrollment → Branch

**Rationale:** FRD Part 6 and Part 10 mandate server-side branch derivation. Client-supplied `branchId` is never the sole authorization input. This prevents cross-branch data leakage via forged request parameters.

### 6. Bulk Result Entry: Two-Phase Validate-Then-Submit with Validation Token

**Decision:** Bulk Result uses a two-phase approach:

1. `POST /api/results/bulk/validate` → Returns validation results per row + validationToken
2. `POST /api/results/bulk/submit` → Submits with validationToken, commits atomically

**Rationale:** FRD Part 5 and Part 7 require row-level validation feedback before commit. Validation token prevents stale payload submission. Atomic commit ensures no silent partial saves. Maximum 1000 rows per request per NFR.

### 7. Cross-Context Reads: Repository Interfaces with Infrastructure Adapters

**Decision:** Define read-only interfaces in `domain/` for cross-context dependencies:

```typescript
interface CourseCompletionRuleReader {
  getActiveRule(courseId: string): Promise<CourseCompletionRule | null>;
}

interface AttendanceEvidenceReader {
  getCompletionEvidence(enrollmentId: string): Promise<AttendanceEvidence>;
}

interface FinanceValidationReader {
  getPaymentValidation(enrollmentId: string): Promise<PaymentValidation>;
}

interface TrainerAssignmentReader {
  isTrainerAssignedToBatch(
    trainerPersonId: string,
    batchId: string,
  ): Promise<boolean>;
}
```

Implement in `infrastructure/` using Prisma queries to other context tables.

**Rationale:** Preserves bounded context isolation. Module 10 depends on abstractions, not concrete implementations. Enables mocking in tests. Infrastructure adapters can be replaced if context ownership changes.

**Alternatives Considered:**

- Direct Prisma imports from other context packages → Violates bounded context boundaries
- Event-driven eventual consistency for reads → Overkill for Phase 1, adds complexity

### 8. Domain Events: Transactional Outbox Pattern

**Decision:** All domain events persist to `OutboxEvent` table in the same database transaction as the state change. A background worker polls for unprocessed events and publishes to in-process subscribers.

**Rationale:** FRD Part 11 and AGENTS.md mandate transactional outbox for Phase 1. Guarantees at-least-once delivery without external brokers. Events include: ExamScheduled, ResultRecorded, ResultFinalized, ResultCorrected, CompletionEvaluationCompleted, CourseCompletionApproved, CertificateEligible, etc.

### 9. Audit Integration: Shared Convention via `packages/shared/audit`

**Decision:** Use existing `packages/shared/audit` module for audit log writes. Sensitive mutations (Result correction, approval decisions, Exam cancellation) require mandatory audit entries written in the same transaction.

**Rationale:** AGENTS.md mandates audit for Finance, Completion, Certificate, and RBAC changes. Shared audit module provides consistent schema and query interface. Fail-closed policy: if audit write fails, business transaction rolls back.

### 10. API Error Mapping: Stable Error Codes with HTTP Status Mapping

**Decision:** Domain errors map to stable error codes and HTTP responses:

- `EXAM_INVALID_STATE_TRANSITION` → 409 Conflict
- `RESULT_ALREADY_FINALIZED` → 409 Conflict
- `COMPLETION_EVIDENCE_STALE` → 409 Conflict
- `TRAINER_NOT_AUTHORIZED_FOR_BATCH` → 403 Forbidden
- `BRANCH_MUTATION_FORBIDDEN` → 403 Forbidden
- `COURSE_COMPLETION_RULE_NOT_CONFIGURED` → 424 Failed Dependency
- `ATTENDANCE_DEPENDENCY_UNAVAILABLE` → 503 Service Unavailable

**Rationale:** FRD Part 7 defines 40+ error codes. Stable codes enable programmatic client handling and localization. HTTP status mapping follows REST conventions.

### 11. Prisma Migration: Expand-and-Contract Pattern

**Decision:** Migration adds new tables/columns as nullable first, deploys application code, then adds non-null constraints in a follow-up migration if needed.

**Rationale:** Enables zero-downtime deployment. Backward-compatible schema changes allow rollback without data loss. Follows AGENTS.md expand-and-contract rule.

### 12. Evidence Staleness Detection: `sourceUpdatedAt` Timestamps

**Decision:** CourseCompletion stores `attendanceUpdatedAt`, `resultUpdatedAt`, and `paymentUpdatedAt` timestamps from source contexts. Approval actions compare these against `lastEvaluatedAt` to detect stale evidence.

**Rationale:** FRD Part 7 and Part 10 require staleness detection. Timestamps are simpler than version numbers for cross-context integration. Source contexts update timestamps when evidence changes.

**Open Question:** Exact contract for timestamp updates needs confirmation with Attendance/Finance context owners.

## Risks / Trade-offs

### [Risk] Cross-Context Contract Gaps

**Impact:** Attendance/Finance may not provide `sourceUpdatedAt` timestamps initially.
**Mitigation:** Use `updatedAt` from source tables as proxy. Define explicit contracts in follow-up sprint.

### [Risk] Result Finalization Ambiguity

**Impact:** ER model doesn't explicitly define `finalizedAt`/`finalizedBy` fields.
**Mitigation:** Add fields to Prisma schema with documentation. Align with ER model in next revision.

### [Risk] Grade Semantics Unclear

**Impact:** `Result.grade` field exists but no Grade master or scale rules defined.
**Mitigation:** Start as free-text field. Add grade scale configuration in future phase if needed.

### [Risk] Bulk Result Performance

**Impact:** 1000-row atomic commit may exceed database timeout under load.
**Mitigation:** NFR allows chunked transaction policy as fallback. Monitor P95 latency and adjust chunk size.

### [Risk] Completion Evaluation Dependency Failures

**Impact:** Attendance/Finance unavailability blocks completion evaluation.
**Mitigation:** Fail-safe design: return `DEPENDENCY_UNAVAILABLE` error, do not false-approve. Retry via reevaluation endpoint when dependency recovers.

### [Risk] Approval Race Conditions

**Impact:** Two approvers may attempt same stage concurrently.
**Mitigation:** Optimistic locking via `version` field. One succeeds, one receives 409 CONCURRENCY_CONFLICT.

### [Trade-off] No Dedicated ResultRevision Table

**Impact:** Result correction history stored in AuditLog, not separate table.
**Mitigation:** AuditLog provides sufficient provenance for Phase 1. Add ResultRevision table if audit query performance becomes an issue.

### [Trade-off] Free-Text Grade Field

**Impact:** No grade scale validation or reporting consistency.
**Mitigation:** Acceptable for Phase 1. Add Grade master data in future phase when reporting requirements mature.

## Migration Plan

### Phase 1: Schema Foundation (Week 1)

1. Add 4 Prisma models with enums, relations, constraints, indexes
2. Generate migration: `prisma migrate dev --name add-module-10-aggregates`
3. Review migration SQL for backward compatibility
4. Apply migration to development database
5. Run reconciliation queries to verify constraints

### Phase 2: Domain Layer (Week 2-3)

1. Implement aggregate roots with state machines
2. Implement validation rules and invariants
3. Implement domain events and outbox integration
4. Write unit tests for all state transitions

### Phase 3: Application Services (Week 3-4)

1. Implement command/query handlers
2. Implement authorization and branch scoping
3. Implement cross-context readers
4. Write application service tests

### Phase 4: API Layer (Week 4-5)

1. Implement 19 route handlers with Zod validation
2. Implement error mapping and HTTP responses
3. Write API contract tests
4. Integration test with admin portal

### Phase 5: Admin Portal UI (Week 5-6)

1. Implement Exam management screens
2. Implement Result entry (individual + bulk)
3. Implement Completion evaluation and approval queues
4. Implement dashboards and reports
5. Write E2E tests with Playwright

### Phase 6: Testing & Hardening (Week 6-7)

1. Run 142+ BDD scenarios
2. Run security/IDOR tests
3. Performance testing against NFR targets
4. Operational runbook review

### Rollback Strategy

- If migration fails: Revert migration, no data loss (new tables are empty)
- If application bugs found: Disable feature flags, rollback deployment
- If data corruption: Restore from backup, run reconciliation queries

## Open Questions

1. **Evidence Versioning Contracts**: Should Attendance/Finance contexts provide explicit `sourceVersion` or `sourceUpdatedAt` fields, or should Module 10 poll `updatedAt` timestamps?
   - **Recommendation**: Start with `updatedAt` proxy, define explicit contracts in follow-up sprint.

2. **Grade Semantics**: Should `Result.grade` be free-text, enum, or reference a future Grade master table?
   - **Recommendation**: Free-text for Phase 1. Add Grade master in future phase.

3. **Student Result Publication Policy**: When can students view their results? Immediately after finalization? After coordinator approval?
   - **Recommendation**: Defer student portal visibility to future phase. Admin-only for Phase 1.

4. **Retake/Attempt Number Tracking**: Should the system support multiple exam attempts per enrollment?
   - **Recommendation**: Out of scope for Phase 1. Document as future enhancement.

5. **Permission Seed Data**: Should default role bundles (Academic Administrator, Coordinator, Trainer, Branch Manager) be seeded automatically or documented for manual setup?
   - **Recommendation**: Seed default bundles automatically, allow customization via IAM admin portal.
