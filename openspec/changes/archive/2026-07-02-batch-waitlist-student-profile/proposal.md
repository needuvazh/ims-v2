## Why

Batch waitlist behavior now depends on `StudentProfile` instead of the legacy student model. To ensure domain naming consistency, secure data boundaries, and prevent severe concurrency regressions (such as waitlist promotion seat-stealing, cross-branch leaks, and event-driven lockups), the waitlist requirements and downstream enrollment integration must be updated. Splitting this into its own delta keeps the waitlist and capacity rules easy to review.

## What Changes

- **Database Schema Refactoring:** Rename column `studentId` to `studentProfileId` and add column `enrollmentId` on the `WaitingList` table. Create partial unique indexes for active waitlist entries and pending enrollments.
- **Contract Renaming:** Refactor all route DTOs, repository mappers, domain models, outbox payloads, and tests to use `studentProfileId` instead of `studentId`.
- **Permission Alignment:** Rename permission checks from `batch.waitlist.manage` to `waitinglist.manage` across seeds, routes, protected server actions (`batches/actions.ts`), and tests.
- **API Boundary Separation:** Split the public waitlist request DTO (which accepts only `studentProfileId` or `leadId`) from the internal waitlist command model (which includes `enrollmentId`).
- **Capacity Bypass Guard:** Calculate capacity using $\text{ReservedSeats} = \text{Active} + \text{Promoted}$. Check if candidate holds a promotion reservation by `studentProfileId` + `batchId` before the capacity check branch in `EnrollmentService.approveEnrollment`, bypassing the capacity lock if found.
- **Terminal State Resolution & Ownership:** Keep `Promoted` as the terminal reservation state. `EnrollmentService` invokes `BatchService.resolveWaitlistEntry(studentProfileId, batchId, tx)` inside its active transaction client to transition the waitlist status to `Removed` and clear `promotionCorrelationId`.
- **Correlation ID Safety & Failure Compensation:** Explicitly carry `promotionCorrelationId` in both promotion and failure outbox events (`WaitlistEntryPromoted`, `EnrollmentCreationFailed`). If downstream enrollment approval fails, trigger failure compensation in `BatchService.revertPromotion` to revert `Promoted` entries to `Held`/`Suspended`, clear correlation IDs, decrement batch counts, and trigger next auto-promotion.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `batch-waitlist`: Waitlist membership, database schema, candidate validation, and branch scoping now use StudentProfile identifiers, branch isolation checks, and updated `waitinglist.manage` permission.
- `enrollment-lifecycle`: Capacity checks now calculate active reservations (active enrollments + promoted waitlist entries), check promotion bypasses, and resolve waitlist reservations on approval.

## Impact

Affected areas include the `WaitingList` Prisma model, database seed configurations, route handlers (`/api/v1/batches/[id]/waitlist/*`), protected batch server actions (`batches/actions.ts`), `batch-service.ts` (enqueuing, promotion, failure reversion, and reordering methods), `enrollment-service.ts` (capacity checking and approval logic), worker outbox event handlers (`apps/worker/src`), and integration tests.
