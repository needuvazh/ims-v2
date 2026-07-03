## 1. Domain Modeling

- [ ] 1.1 Define the Scheduling-owned business calendar aggregate and branch/year override model.
- [ ] 1.2 Add calendar resolution rules for institute default, branch override, and system fallback precedence.
- [ ] 1.3 Add domain validation for timezone immutability, override scope, and effective-date bounds.

## 2. Persistence and Migration

- [ ] 2.1 Add Prisma schema changes for institute calendar and branch override records.
- [ ] 2.2 Add repository adapters and queries for calendar create, update, read, and override resolution.
- [ ] 2.3 Add a migration path for any legacy `BranchSettings.workingCalendar` values that can be translated.

## 3. Application Services and APIs

- [ ] 3.1 Implement calendar create, update, activate, close, archive, and override application services.
- [ ] 3.2 Add API routes and Zod schemas for calendar and branch override operations.
- [ ] 3.3 Wire branch-scoped authorization and audit logging into calendar mutations.

## 4. UI and Read Flows

- [ ] 4.1 Add admin portal screens for institute calendar setup and branch/year override editing.
- [ ] 4.2 Show resolved calendar provenance in calendar detail and scheduling validation responses.
- [ ] 4.3 Ensure UI copy distinguishes institute defaults from branch overrides.

## 5. Tests and Verification

- [ ] 5.1 Add domain tests for precedence, override restriction, and lifecycle transitions.
- [ ] 5.2 Add application tests for branch scope, permission checks, audit logging, and error mapping.
- [ ] 5.3 Add API tests for create, update, override, and validation endpoints.
- [ ] 5.4 Add schedule validation tests proving resolved calendar behavior for holidays and working hours.
- [ ] 5.5 Run typecheck, lint, unit tests, API tests, and affected builds for the scheduling area.
