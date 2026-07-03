## 1. Domain Modeling

- [x] 1.1 Define the Scheduling-owned business calendar aggregate and branch/year override model.
- [x] 1.2 Add calendar resolution rules for institute default, branch override, and system fallback precedence.
- [x] 1.3 Add domain validation for timezone immutability, override scope, and effective-date bounds.

## 2. Persistence and Migration

- [x] 2.1 Add Prisma schema changes for institute calendar and branch override records.
- [x] 2.2 Add repository adapters and queries for calendar create, update, read, and override resolution.
- [x] 2.3 Add a migration path for any legacy `BranchSettings.workingCalendar` values that can be translated.

## 3. Application Services and APIs

- [x] 3.1 Implement calendar create, update, activate, close, archive, and override application services.
- [x] 3.2 Add API routes and Zod schemas for calendar and branch override operations.
- [x] 3.3 Wire branch-scoped authorization and audit logging into calendar mutations.

## 4. UI and Read Flows

- [x] 4.1 Add admin portal screens for institute calendar setup and branch/year override editing.
- [x] 4.2 Show resolved calendar provenance in calendar detail and scheduling validation responses.
- [x] 4.3 Ensure UI copy distinguishes institute defaults from branch overrides.

## 5. Tests and Verification

- [x] 5.1 Add domain tests for precedence, override restriction, and lifecycle transitions.
- [x] 5.2 Add application tests for branch scope, permission checks, audit logging, and error mapping.
- [x] 5.3 Add API tests for create, update, override, and validation endpoints.
- [x] 5.4 Add schedule validation tests proving resolved calendar behavior for holidays and working hours.
- [x] 5.5 Run typecheck, lint, unit tests, API tests, and affected builds for the scheduling area.
