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
* **Database Connection Status:** Verify database client connectivity using a generic query check (e.g. `SELECT 1`).
* **Outbox Event Backlog:** Verify that outbox messages containing the `TRN` module prefix are processed in under 5 minutes.
* **Worker Execution State:** Check that the document expiry cron runner has checked records within the last 24 hours.

---

### 2.2 Backup & Recovery Scenarios
* **Target Backups:** Materialized views and reports are excluded. Only the source transactional tables owned by the Trainer context must be backed up:
  `trainer_profiles`, `trainer_qualifications`, `trainer_availabilities`, and `trainer_compensation_rates`.
* **Snapshot Interval:** Daily differential snapshots, weekly full backups.
* **Recovery Verification:** Verify transactional referential integrity between `Person` and `TrainerProfile` (logical checks) during monthly recovery tests.

---

## 3. Troubleshooting Runbooks

### Runbook A: Resolving Trainer Scheduling Status Mismatch
* **Symptom:** Schedulers cannot assign a trainer to a batch. The trainer's UI profile shows status is "Active", but the search input lists them as unavailable or disabled.
* **Root Cause Diagnostics:**
  1. The trainer has expired mandatory identification documents (Civil ID or Visa), causing backend filters to flag them as inactive.
  2. A status sync failure occurred between the `Document` status and the `TrainerProfile` cache.
* **Step-by-Step Resolution Guide:**
  1. Verify the trainer's local profile status and person mapping in the Trainer Bounded Context database:
     ```sql
     SELECT id, "personId", status, "isDeleted"
     FROM trainer_profiles 
     WHERE "trainerCode" = 'TRN-2026-0045';
     ```
  2. Query the user status via the Identity Bounded Context administrative CLI tool:
     ```bash
     pnpm --filter @asti-ims/identity-access run find-user --personId 'retrieved-person-uuid'
     ```
  3. Query the compliance documents via the Document Bounded Context CLI utility:
     ```bash
     pnpm --filter @asti-ims/document-management run find-docs --ownerId 'retrieved-trainer-uuid' --ownerType 'Trainer'
     ```
  4. If any mandatory document shows `Expired` or `PendingVerification`, the scheduler block is expected behavior. The trainer must upload a valid document, or a coordinator must review and approve it.
  5. If all documents are active but the trainer is still blocked, run the status sync script using the administrative CLI command to reload the profile state:
     ```bash
     pnpm --filter @asti-ims/trainer-management run sync-status --code TRN-2026-0045
     ```
  6. Verify the updated status in the Admin UI.

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
  2. If duplicate active slots exist (due to race conditions), do NOT execute direct SQL writes. You must invoke the soft delete method through the Trainer Bounded Context Application Service (via CLI command or Admin API) to preserve the transactional outbox and emit the required `TrainerAvailabilityUpdated` audit event:
     ```bash
     pnpm --filter @asti-ims/trainer-management run delete-availability --id 'duplicate-id-to-remove' --user 'system-recovery'
     ```
  3. Re-execute the check query in Step 1 to confirm that only one slot remains active for that time block.
