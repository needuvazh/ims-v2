# Part 11 - Deployment, Operations, Observability, Runbooks

## 1. Observability Setup

### 1.1 Structured Logs Format (JSON)
All logs emitted by the Faculty / Trainer Management package must write standard structured JSON lines.

#### Example Log Output:
```json
{
  "timestamp": "2026-07-01T15:21:00.000Z",
  "level": "INFO",
  "module": "TRN",
  "action": "TrainerAvailabilityUpdated",
  "userId": "99b2512f-981c-4b68-80f4-5553e1a0b943",
  "branchId": "88a123f1-44bb-4e4b-9e4a-b9c2a3819ccf",
  "trainerCode": "TRN-2026-0012",
  "correlationId": "req-9c8d-7a6b-5c4d-3e2f",
  "payload": {
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "13:00",
    "status": "Active"
  }
}
```

---

### 1.2 Tracing Boundaries & Span Markers
APM systems (e.g. OpenTelemetry) must trace the following code path boundaries:
* `trn.profile.create` - Measures execution latency for registry write transactions.
* `trn.availability.check` - Tracks execution metrics for scheduling availability checks.
* `trn.payment.resolve` - Tracks calculations during pay ledger generations.

---

### 1.3 Operational Metrics Instrumentation (Prometheus / Grafana)
* `trn_active_trainers_count`: Gauge tracking number of trainers with status `Active`.
* `trn_suspended_trainers_count`: Gauge tracking compliance blocks.
* `trn_availability_overlap_violations_total`: Counter tracking frequency of rejected time overlap submissions.
* `trn_document_expiry_alerts_sent`: Counter tracking expiration warning emails sent.

---

## 2. Operations & Maintenance

### 2.1 System Healthcheck Rules
The standard backend health endpoint `/api/health` must check:
* **Database Connection Status:** Ping owned tables (`trainer_profiles`).
* **Outbox Event Backlog:** Verify that outbox messages containing the `TRN` module prefix are processed in under 5 minutes.
* **Worker Execution State:** Check that the document expiry cron runner has checked records within the last 24 hours.

---

### 2.2 Backup & Recovery Scenarios
* **Target Backups:** Materialized views and reports are excluded. Only the source transactional tables must be backed up:
  `trainer_profiles`, `trainer_qualifications`, `trainer_availabilities`, `batch_trainers`, and `trainer_payments`.
* **Snapshot Interval:** Daily differential snapshots, weekly full backups.
* **Recovery Verification:** Verify transactional referential integrity between `Person` and `TrainerProfile` during monthly recovery tests.

---

## 3. Troubleshooting Runbooks

### Runbook A: Resolving Trainer Scheduling Status Mismatch
* **Symptom:** Schedulers cannot assign a trainer to a batch. The trainer's UI profile shows status is "Active", but the search input lists them as unavailable or disabled.
* **Root Cause Diagnostics:**
  1. The trainer has expired mandatory identification documents (Civil ID or Visa), causing backend filters to flag them as inactive.
  2. A status sync failure occurred between the `Document` status and the `TrainerProfile` cache.
* **Step-by-Step Resolution Guide:**
  1. Execute a database query to check the compliance status of the trainer's documentation:
     ```sql
     SELECT d.id, d.status, d."expiryDate" 
     FROM trainer_profiles tp
     JOIN persons p ON tp."personId" = p.id
     JOIN documents d ON d."ownerId" = tp.id
     WHERE tp."trainerCode" = 'TRN-2026-0045';
     ```
  2. If any mandatory document shows `Expired` or `PendingVerification`, the scheduler block is expected behavior. The trainer must upload a valid document, or a coordinator must review and approve it.
  3. If all documents are active but the trainer is still blocked, check the status cache in the database. Run the status sync script:
     ```bash
     pnpm --filter @asti-ims/trainer-management run sync-status --code TRN-2026-0045
     ```
  4. Verify the updated status in the Admin UI.

---

### Runbook B: Resolving Conflicting Availability Records
* **Symptom:** Schedulers receive `ERR_TRN_AVAILABILITY_OVERLAP` when trying to save a slot, but the calendar grid appears empty. Or, the database returns duplicate slots for a trainer on the same day.
* **Root Cause Diagnostics:**
  1. Soft-deleted availability records (`isDeleted = true`) still exist in the database, but are incorrectly bypassed in the overlap check query.
  2. Concurrent database writes bypassed the validation check because of race conditions.
* **Step-by-Step Resolution Guide:**
  1. Query the database to identify overlapping slots, including soft-deleted ones:
     ```sql
     SELECT id, "startTime", "endTime", "isDeleted", status 
     FROM trainer_availabilities 
     WHERE "trainerId" = (SELECT id FROM trainer_profiles WHERE "trainerCode" = 'TRN-2026-0012')
       AND "dayOfWeek" = 1;
     ```
  2. If duplicate active slots exist (due to race conditions), manually archive the incorrect record by updating its soft delete status:
     ```sql
     UPDATE trainer_availabilities 
     SET "isDeleted" = true, "deletedAt" = NOW(), "deletedBy" = 'system-recovery'
     WHERE id = 'duplicate-id-to-remove';
     ```
  3. Re-execute the check query to confirm that only one slot remains active for that time block.
