## 1. Persistence & Schema

- [x] 1.1 Add `scheduleStatus` and `conflictType` to `Session` model in `schema.prisma`
- [x] 1.2 Implement `VenueBlock` model in `schema.prisma` with branch and classroom relations
- [x] 1.3 Add `overrideReason` and `isConflictIgnored` to `Session` model
- [x] 1.4 Generate and apply Prisma migrations (Validated and Generated Client)

## 2. Domain & Application Logic (Scheduling Context)

- [x] 2.1 Implement `VenueBlock` repository and domain service in `packages/scheduling`
- [x] 2.2 Implement `ConflictEngine` service to perform multi-constraint validation
- [x] 2.3 Add `validateSession` to `SchedulingService` for synchronous interception
- [x] 2.4 Implement `resolveConflict` use case in `SchedulingService` (Reschedule/Venue Change/Cancel)
- [x] 2.5 Add `ignoreConflict` use case with high-severity audit logging and permission check

## 3. Cross-Context Integration

- [x] 3.1 Implement Outbox subscriber for `HolidayCreated` to asynchronously flag session conflicts
- [x] 3.2 Implement Outbox subscriber for `VenueBlockCreated` to asynchronously flag session conflicts
- [x] 3.3 Enhance `BatchService.assignTrainer` to call the new `ConflictEngine`
- [x] 3.4 Update `BatchService.generateSessions` (via `createSessionAction`) to skip holidays and closed days using `SchedulingService`

## 4. API & Authorization

- [x] 4.1 Implement `VenueBlock` CRUD endpoints with branch-scoping and permissions
- [x] 4.2 Implement `Conflict Dashboard` query endpoint (filtering by status/branch)
- [x] 4.3 Implement `Resolve Conflict` API route calling application services
- [x] 4.4 Implement `Ignore Conflict` API route (Restricted to Branch Managers)

## 5. UI & Portal (Admin Portal)

- [x] 5.1 Create `Venue Management` page for managing classroom blocks
- [x] 5.2 Implement the `Conflict Dashboard` list view
- [x] 5.3 Build the `Conflict Resolution Wizard` (Side panel for quick rescheduling/venue change)
- [x] 5.4 Update `Batch Schedule` view to highlight sessions with `Conflict` or `Warning` status

## 6. Verification & Standards

- [x] 6.1 Write unit tests for `ConflictEngine` logic (Holiday/Venue/Overlap/Operating Hours)
- [x] 6.2 Write integration tests for Async Conflict flagging (Holiday creation → Session status update)
- [x] 6.3 Verify all branch-scoping rules for scheduling reads/writes
- [x] 6.4 Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` across the monorepo (Core packages stable)
