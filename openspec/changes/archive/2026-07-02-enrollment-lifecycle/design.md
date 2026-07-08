## Context

Enrollment is the shared lifecycle for regular, corporate, and walk-in learners. This capability isolates the lifecycle transitions so they can be validated separately from intake and walk-in entry points.

## Goals / Non-Goals

**Goals:**

- Implement state transitions: Draft -> Submitted -> Approved -> Confirmed -> Active -> Dropped / Cancelled.
- Enforce that completion validation remains owned by Exam, Result & Completion, and certificate issuance is owned by Certificate Management. Enrollment lifecycle context emits events to hand off control and does not govern those downstream states directly.
- Preserve document verification gates during event-driven confirmation.
- Implement idempotent event subscription for Finance receipt events based on matching `enrollmentId`.
- Call Training Delivery waitlist flows for full batches when waitlisting is enabled, keeping the enrollment pending in Submitted status.
- Integrate Course Catalog's `CoursePricingService` to resolve and snapshot pricing overrides at draft creation time, introducing `priceEvaluationTimestamp` to lock data against future drift.
- Enforce branch-scoped access and complete audit logging coverage across all lifecycle mutations (create, submit, approve, confirm, waitlist, activate, drop/cancel).
- Handle B2B corporate enrollment automatic profile conversion (creating `StudentProfile` and `Admission` atomically in one transaction) and B2B corporate credit limit validation.

**Non-Goals:**

- Redesigning course catalog pricing logic.
- Redesigning Finance billing or credit card gateway transactions.
- Owning completed/certificate transitions within this module.

## Decisions

- Keep enrollment as the authoritative state machine for Module 04 boundaries (ending at Active / Dropped / Cancelled).
- Use `CoursePricingService` from Course Catalog to resolve pricing during enrollment draft creation, persisting the resolved pricing fields and `priceEvaluationTimestamp` on the enrollment record.
- Confirm enrollments reactively and idempotently upon receiving `ReceiptGenerated` events, ensuring we run document gate verification before marking an enrollment confirmed.
- Avoid allowing active enrollments to transition to `Cancelled` (they must be `Dropped` instead).
- Use `SERIALIZABLE` transaction isolation level for batch capacity checks during approval.
- Add `priceEvaluationTimestamp` field to the Prisma schema `Enrollment` model and run database migration to support pricing drift tracking.
- Driven activation (`Confirmed` -> `Active`) reactively by listening to a `BatchStarted` event from Training Delivery context.

## Risks / Trade-offs

- [Risk] Transition rules depend on other contexts (Finance, Training Delivery, Course Catalog). → Mitigation: use public services for queries, outbox events for reactions, and transaction isolation boundaries to guarantee invariants.
- [Risk] Refactoring the state transitions will break the legacy direct `Draft -> Confirmed` tests. → Mitigation: update the tests to set up the correct pre-conditions (Draft -> Submitted -> Approved -> Confirmed).
