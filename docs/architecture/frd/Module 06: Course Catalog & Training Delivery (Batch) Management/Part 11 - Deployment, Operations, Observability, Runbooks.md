# Module 06 — Course Catalog & Training Delivery (Batch) Management

## Part 11 — Deployment, Operations, Observability, Runbooks

**Version:** 3.0  
**Status:** Draft  
**Domain:** Course Catalog & Training Delivery  
**Module Code:** CRS  

---

# 1. Observability Setup

This section defines the structured logging schemas, OpenTelemetry tracing boundaries, and Prometheus instrumentation metrics required to monitor training operations.

---

### 1.1 Structured Logs Format
All application log output from Module 06 must be emitted as single-line JSON streams to stdout.

#### JSON Log Schema:
```json
{
  "timestamp": "2026-06-30T17:16:00.000Z",
  "level": "INFO",
  "module": "CRS",
  "correlationId": "tx-12345-67890",
  "userId": "987a46b8-adfb-0af496bd58cd",
  "branchId": "35428da6-c66d-4ea1-bb85-74c203bfd11f",
  "action": "BATCH_TRAINER_ASSIGNED",
  "details": {
    "batchId": "e41b810d-c586-413f-952b-665dfcb90f14",
    "trainerId": "278caa48-d2cb-4e49-a51a-658272a4c1d1",
    "role": "Primary"
  },
  "elapsedMs": 34
}
```

---

### 1.2 OpenTelemetry Tracing Spans
Distributed tracing must wrap the following operation blocks:
*   `Span: CRS.CreateBatch` — Measures duration of input validations, date boundary checks, and batch code uniqueness verification.
*   `Span: CRS.AssignTrainer` — Wraps trainer qualification checks and the scheduling conflict calendar scan algorithm.
*   `Span: CRS.PromoteWaitlist` — Measures the database lock transaction promoting a waitlisted student and launching enrollment hooks.

---

### 1.3 Metrics Instrumentation
Prometheus exports the following custom metrics:
*   `batch_utilization_ratio` (Gauge): Tracks seat occupancy rate per batch. Labels: `branchId`, `courseId`, `batchCode`.
*   `waitlist_promotions_total` (Counter): Cumulative count of waitlist promotions. Labels: `batchCode`, `status` ("Success", "Failed").
*   `trainer_scheduling_conflicts_total` (Counter): Tracks conflict detection triggers. Labels: `trainerId`, `branchId`.

---

# 2. Operations & Health Checks

---

## 2.1 Health Check Rules
The server status system runs periodic checks. For Module 06, the following checkpoints must evaluate successfully:
1.  **Database Connection Check:** Evaluates raw database latency (`SELECT 1;`). If latency is $> 500\text{ms}$ or fails, set status to `DEGRADED`.
2.  **Roster Lock Check:** Attempts a safe database transaction lock on a dummy test batch. If lock fails or times out, set status to `DEGRADED` (indicates high transaction blocks).
3.  **Outbox Processor Liveness:** Queries the `outbox_events` table for entries in `Pending` status with `createdAt` older than 5 minutes. If count is $> 10$, alert: `Outbox processing delay detected`.

---

## 2.2 Backup & Recovery Procedures

### 2.2.1 Tables to Back Up
The Course Catalog and Batch Delivery database tables are critical for academic audits.
*   Backup targets: `course_categories`, `courses`, `course_pricings`, `course_completion_rules`, `batches`, `batch_trainers`, `waiting_list`.

### 2.2.2 Automated Backup Command (Daily Cron)
```bash
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -t course_categories -t courses -t course_pricings -t course_completion_rules \
  -t batches -t batch_trainers -t waiting_list \
  -F c -b -v -f /backups/asti_ims_crs_$(date +%F).dump
```

### 2.2.3 Disaster Recovery Verification Steps
To restore files following database corruption:
1.  Verify the backup file signature.
2.  Confirm that target tables in the production schema are cleared of active lock processes.
3.  Restore tables using the `pg_restore` utility:
    ```bash
    pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME --clean --if-exists /backups/asti_ims_crs_target_date.dump
    ```
4.  **Verification Check:** Run a row-count check on `courses` and `batches` tables. Match row counts against backup logs.

---

# 3. Troubleshooting Runbooks

---

## Runbook 1: Resolve Trainer Double-Booking Errors
*   **Problem:** The coordinator receives `ERR_CRS_TRAINER_SCHEDULE_CONFLICT` when attempting to map a trainer to a batch, but the trainer claims availability.
*   **Resolution Steps:**
    1.  Execute query to identify active assignments for the trainer:
        ```sql
        SELECT bt.batch_id, b.batch_code, bt.assigned_from, bt.assigned_to 
        FROM batch_trainers bt
        JOIN batches b ON bt.batch_id = b.id
        WHERE bt.trainer_id = 'TRAINER_UUID' AND bt.status = 'Active' AND bt.is_deleted = false;
        ```
    2.  Check for date overlaps. If the date ranges overlap, identify the specific conflicting timetabled sessions in the Scheduling context:
        ```sql
        SELECT session_date, start_time, end_time, batch_id 
        FROM timetable_sessions 
        WHERE trainer_id = 'TRAINER_UUID' AND session_date BETWEEN 'START_DATE' AND 'END_DATE';
        ```
    3.  Coordinate with the branch manager of the conflicting batch. If the trainer was replaced but the database mapping was not updated, change the old assignment status to `Inactive` or update its `assignedTo` end date.
    4.  Retry the assignment.

---

## Runbook 2: Recover from Failed Waitlist Promotion Transactions
*   **Problem:** A confirmed seat is cancelled in a full batch, but the waiting list does not auto-promote the candidate at position 1.
*   **Resolution Steps:**
    1.  Inspect application logs searching by `correlationId` or `batchId` to locate waitlist promotion failure trace logs.
    2.  Check if the candidate at position 1 has a lock flag on their student profile (e.g. holds, suspension, or missing civil ID docs).
    3.  If the student profile has blockages, execute a manual skip command via the Admin API:
        ```bash
        curl -X POST -H "Authorization: Bearer $TOKEN" \
          https://api.asti-ims.com/api/v1/batches/BATCH_UUID/waitlist/skip \
          -d '{"studentId": "FAILED_STUDENT_UUID"}'
        ```
        *This updates the student's status to "Held" and triggers promotion for the next candidate.*
    4.  If the failure was caused by a database timeout lock, execute a manual promotion action to clear the queue position.

---

## Runbook 3: Resync Course Catalog Import Files
*   **Problem:** Batch upload of new courses from the Ministry-approved catalog spreadsheet fails, leaving courses half-imported.
*   **Resolution Steps:**
    1.  Retrieve the import log file using the `correlationId` from the import job page.
    2.  Identify the row number where the conflict occurred (commonly `ERR_CRS_DUPLICATE_CODE` or `ERR_CRS_INVALID_DURATION`).
    3.  **Data Isolation:** Do not re-run the entire file. Re-running the full file will cause duplicate key errors.
    4.  Isolate the failed course rows. Fix validation issues (e.g., ensure course codes are uppercase and duration values are integers $> 0$).
    5.  Prepare a delta spreadsheet containing only the failed rows, and re-import the delta file.
    6.  Verify catalog count matches target expectations.
