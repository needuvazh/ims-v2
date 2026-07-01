## 1. Database Setup

- [ ] 1.1 Add `WaitingList` model to `schema.prisma`.
- [ ] 1.2 Add indexes and filtered unique constraints on `WaitingList`.
- [ ] 1.3 Generate and apply migrations.

## 2. Domain & Application Logic (packages/training-delivery)

- [ ] 2.1 Implement `batch.addWaitlistEntry()` aggregate methods computing FIFO sequence order.
- [ ] 2.2 Implement `batch.promoteWaitlist()` aggregate methods updating sequence and emitting `WaitlistStudentPromoted`.
- [ ] 2.3 Implement the Application Service command to reorder waitlist positions.
- [ ] 2.4 Create the event listener subscribing to `EnrollmentCancelled` that triggers aggregate promotion inside pessimistic lock boundaries.

## 3. API Handlers

- [ ] 3.1 Expose route `POST /api/v1/batches/:id/waitlist` to enqueue.
- [ ] 3.2 Expose route `PUT /api/v1/batches/:id/waitlist/reorder` for reordering.
- [ ] 3.3 Expose route `POST /api/v1/batches/:id/waitlist/promote` for manual promotion override trigger.

## 4. UI Waitlist Widget

- [ ] 4.1 Implement roster Details columns, Transfer buttons, and low attendance warnings on screen `CRS-SCR-006`.
- [ ] 4.2 Build **Waitlist Queue Manager Widget** on screen `CRS-SCR-006` with position numbers and promote action buttons.
- [ ] 4.3 Implement Drag-and-drop sortable lists UI handlers for waitlist reordering.
- [ ] 4.4 Configure empty states representation.

## 5. Automated Tests

- [ ] 5.1 Write unit tests for aggregate promotion FIFO shifts.
- [ ] 5.2 Write integration tests checking auto-promotion logic on `EnrollmentCancelled` events.
- [ ] 5.3 Write Playwright reordering tests validating drag handles.

## 6. Project Status Updates

- [ ] 6.1 Update `docs/project-status.md` details.
