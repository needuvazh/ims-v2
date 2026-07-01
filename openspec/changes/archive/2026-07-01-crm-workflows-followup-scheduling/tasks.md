## 1. Database & Persistence Layer

- [x] 1.1 Update `schema.prisma` to add `nextFollowUpDate DateTime?` to the `Lead` model.
- [x] 1.2 Generate Prisma client and create database migration file.

## 2. CRM Core Models & Application Services

- [x] 2.1 Update `scheduleFollowUp` application service to synchronously set `Lead.nextFollowUpDate`.
- [x] 2.2 Update `scheduleFollowUp` application service to transition `Lead.stage` from `New`/`Contacted` to `FollowUp`.
- [x] 2.3 Block scheduling follow-ups on `Converted`, `Won`, or `Lost` leads (throw `ERR_CRM_INVALID_STAGE_TRANSITION`).
- [x] 2.4 Ensure `LeadStageHistory` is inserted and `LeadStageChanged` event is emitted on automatic stage transitions.
- [x] 2.5 Update `logFollowUpOutcome` application service to handle composite operations inside a Prisma `$transaction`.
- [x] 2.6 Add optimistic concurrency check (`Lead.version`) inside `logFollowUpOutcome` to prevent race conditions.
- [x] 2.7 Update `logFollowUpOutcome` to recalculate `Lead.nextFollowUpDate` to the next earliest scheduled follow-up (or nullify if none exist) when completing a task.
- [x] 2.8 Update `deleteLead`, `markLeadLost`, `markLeadWon`, and `convertLead` inside the Lead application service to synchronously invoke `cancelAllScheduled` follow-ups.

## 3. CRM Workflows & Event Subscribers (Background Worker)

- [x] 3.1 Create background worker / event subscriber for the `WebsiteInquirySubmitted` domain event.
- [x] 3.2 Implement auto-assignment workload query: Fetch active counselors via public `IamQueryService`, then count their non-terminal CRM leads.
- [x] 3.3 Implement random tie-breaker logic if workloads are equal across counselors.
- [x] 3.4 Emit `LeadAssigned` event upon successful auto-assignment.
- [x] 3.5 Implement the hourly background sweeping cron job for overdue follow-ups.
- [x] 3.6 Sweep open follow-ups older than `current_time - 60 minutes`, update their status to `Missed`, and write a `FollowUpOverdue` event to the outbox.

## 4. REST API Endpoints & Validation

- [x] 4.1 Update POST `/api/v1/crm/leads/{id}/follow-ups` Zod validation to ensure `nextFollowUpDate` is in the future.
- [x] 4.2 Update PATCH `/api/v1/crm/leads/follow-ups/{id}` to accept the `version` field from the client payload.

## 5. UI & End-to-End Updates

- [x] 5.1 Ensure the CRM portal handles `ERR_CRM_CONCURRENCY_VIOLATION` globally or inside the follow-up log modal.
- [x] 5.2 Implement Playwright E2E tests for the auto-assignment workflow.
- [x] 5.3 Write unit and integration tests for `scheduleFollowUp` stage transitions (including blocking terminal leads) and the robust denormalization recalculation logic.

## 6. Verification & Finalization

- [x] 6.1 Run typecheck, lint, and Prisma validation (`npx prisma validate`).
- [x] 6.2 Execute unit and integration tests (`npm run test`).
- [x] 6.3 Update `docs/project-status.md` to reflect completion of Follow-up Scheduling, Workload Distribution, and Overdue Notifications.
