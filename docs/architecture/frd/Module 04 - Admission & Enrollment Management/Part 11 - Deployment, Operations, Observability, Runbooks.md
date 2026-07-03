# Functional Requirement Document (Part 11)
## Module 04: Admission & Enrollment Management - Operations & Runbooks

---

## 1. Observability

* Structured JSON logs must include `correlationId`, `userId`, `branchId`, `action`, and `entityId`.
* Tracing is required for admission create/approve and enrollment create/approve/confirm transitions.
* Metrics should track admissions created, enrollments confirmed, batch fill rate, waitlist entries, and ID card generation latency.

---

## 2. Health Checks and Backups

* Health check must verify database connectivity, outbox backlog, and background job worker availability.
* Backup scope includes `persons`, `student_profiles`, `admissions`, `enrollments`, `walk_in_enrollments`, and `walk_in_confirmations` once the refactor is applied.
* Recovery validation must be exercised on a staging cluster.

---

## 3. Runbooks

### Stuck Enrollment Transition
1. Trace the correlation ID.
2. Check the outbox for failed events.
3. Reconcile batch occupancy using `currentEnrollmentCount`.
4. Reprocess the event or command.

### Duplicate Student Profile Cleanup
1. Identify duplicate `StudentProfile` rows linked to the same `Person`.
2. Confirm active enrollments.
3. Merge into the surviving profile if needed.
4. Soft delete only the duplicate `StudentProfile`.
5. Never delete the shared `Person` record.
6. Write the merge action to `AuditLog`.
