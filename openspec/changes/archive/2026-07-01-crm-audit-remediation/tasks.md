## 1. Event Naming Synchronization

- [x] 1.1 In `packages/crm-leads/src/application/lead-service.ts`, find the event emission for lead conversion (currently `LeadConvertedToAdmission`) and rename the `eventType` payload to `LeadConverted`.
- [x] 1.2 In `packages/admissions-enrollment/src/application/lead-conversion-orchestrator.ts`, update the event subscription logic to match and consume the `LeadConverted` event instead of `LeadConvertedToAdmission`.
- [x] 1.3 Run unit tests in `crm-leads` and `admissions-enrollment` to verify that the event name change didn't break any test mocks.

## 2. Overdue Follow-ups Background Scheduler

- [x] 2.1 In `packages/crm-leads/src/application/`, create a new file `followup-scheduler-service.ts`.
- [x] 2.2 Implement a class `FollowUpSchedulerService` that injects the `FollowUpRepository`.
- [x] 2.3 Add a method `processOverdueFollowUps(actorId: string)` that calls `findAllScheduledOverdue(new Date())`.
- [x] 2.4 For each overdue record, transition its status to `Overdue` (if supported) or generate a `LeadNote` entity stating "System: Follow-up is overdue" and save it.
- [x] 2.5 Update the `LeadNote` generation to run transactionally with the status update using the unit of work/transaction client.
- [x] 2.6 Write unit tests for `FollowUpSchedulerService` to ensure it successfully identifies overdue records and generates notes/updates without bypassing branch scopes (or operating safely under a system scope).

## 3. Verification

- [x] 3.1 Run `pnpm run typecheck` across the monorepo to ensure no typing regressions from the event rename.
- [x] 3.2 Run `pnpm run test` in `packages/crm-leads` and `packages/admissions-enrollment` to ensure all tests pass.
