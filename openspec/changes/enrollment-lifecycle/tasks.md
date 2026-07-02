## 1. Schema and Migration

- [ ] 1.1 Add `priceEvaluationTimestamp` (`DateTime? @db.Timestamptz(6)`) to the `Enrollment` model in `packages/database/prisma/schema.prisma`.
- [ ] 1.2 Generate and run a database migration to apply the schema change.

## 2. Workflow and Integration

- [ ] 2.1 Integrate `@ims/course-catalog`'s `CoursePricingService` to resolve and snapshot pricing override details (pricingSource, resolvedDiscount, finalAmount, priceEvaluationTimestamp) during draft enrollment creation.
- [ ] 2.2 Implement enrollment status transition methods in the service following the strict transition table (`submitEnrollment`, `approveEnrollment`, `dropEnrollment`, `cancelEnrollment`).
- [ ] 2.3 Implement B2B corporate participant automatic profile setup (creating `StudentProfile` and `Admission` in one transaction if missing) during corporate draft creation.
- [ ] 2.4 Implement B2B corporate credit limit validation during corporate enrollment approval (block/warning handling).
- [ ] 2.5 Implement the idempotent event handler for the `ReceiptGenerated` event to confirm enrollments, verifying the document gate before confirming.
- [ ] 2.6 Implement batch capacity check with `SERIALIZABLE` transaction isolation during approval, routing to waitlist when full and waitlisting is enabled (keeping enrollment in Submitted status), or rejecting with `ERR_ENR_BATCH_FULL` when waitlisting is disabled.
- [ ] 2.7 Implement the `BatchStarted` event listener to transition matching confirmed enrollments to `Active` status.
- [ ] 2.8 Implement walk-in fast-track bypass logic.

## 3. UI and API

- [ ] 3.1 Update admin enrollment screens to show pricing override source, details, and correct action transitions.
- [ ] 3.2 Add branch-scoped authorization and target state transition audit logging covering all lifecycle mutations (create, submit, approve, confirm, waitlist, activate, drop/cancel).
- [ ] 3.3 Refactor the Next.js API route handlers to enforce RBAC permissions and session-derived branch scoping.

## 4. Tests

- [ ] 4.1 Refactor existing tests (e.g., `document-management-gates.test.ts`) that expect direct `Draft -> Confirmed` transitions to go through `submitEnrollment` and `approveEnrollment` first.
- [ ] 4.2 Add targeted unit and integration tests verifying all lifecycle status transitions, corporate participant profile creation, waitlist creation, idempotency, audit logs, invariant guards, and outbox event publishing.
