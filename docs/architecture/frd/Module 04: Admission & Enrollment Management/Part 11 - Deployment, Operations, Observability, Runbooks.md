# Functional Requirement Document (Part 11)
## Module 04: Admission & Enrollment Management – Operations & Runbooks

This document outlines the observability configurations, system health check rules, backup procedures, and troubleshooting runbooks for the Admission & Enrollment Bounded Context.

---

## 1. Observability Setup

### 1.1 Structured Logs Format
All services must emit structured logs in JSON format to stdout. Standard properties are mandatory:

```json
{
  "timestamp": "2026-07-01T14:54:00.102Z",
  "level": "INFO",
  "correlationId": "tx-88127-muscat-992a",
  "context": "AdmissionService",
  "action": "ApproveAdmission",
  "userId": "usr-3342-a29d",
  "branchId": "br-9092-23c2",
  "details": {
    "admissionId": "adm-1029-33b2",
    "studentNumber": "STU-2026-00912",
    "statusTransition": {
      "from": "Submitted",
      "to": "Approved"
    }
  }
}
```

### 1.2 Tracing Boundaries
Distributed tracing spans (OpenTelemetry) must be initialized for:
1.  **`POST /api/admissions`**: Span encompasses validation checks, duplicate search queries, and database write transactions.
2.  **`POST /api/enrollments/{id}/approve`**: Encompasses batch capacity fetch, serialization lock execution, outbox table record write, and confirmation checks.

### 1.3 Metrics Instrumentation
The module exposes Prometheus counters and gauges:
*   `enrollments_total_count`: Counter incremented when a new enrollment is confirmed. Labels: `branchId`, `enrollmentType`, `courseId`.
*   `batch_capacity_percentage`: Gauge representing capacity filled. Labels: `batchId`, `branchId`.
*   `lead_conversion_failures_total`: Counter incremented when lead conversion fails due to validation errors.

---

## 2. Operations and Health Checks

### 2.1 System Health Check Rules
The server endpoint `/api/health/admissions` validates:
1.  **Database Connection:** Query `SELECT 1;` on the PostgreSQL client.
2.  **ID Card Generator Service availability:** Verify response from the worker queue.
3.  **Outbox Queue Check:** Alerts if records in the transactional outbox table remain unprocessed for $\ge 5\text{ minutes}$.

### 2.2 Backup and Recovery Procedures
*   **Target Tables:** `persons`, `students`, `admissions`, `enrollments`.
*   **Policy:** 
    *   Daily automated snapshots with transactional consistency (PostgreSQL WAL streaming).
    *   Retention period of 7 years in compliance with local academic record auditing rules.
*   **Recovery Validation:** Restoring target tables to a staging database cluster must execute weekly, verifying integrity of `personId` foreign key mappings.

---

## 3. Troubleshooting Runbooks

### 3.1 Runbook 1: Rollback of Stuck Enrollment Transactions
*   **Problem:** An enrollment is stuck in `Approved` or `Confirmed` status, but the batch seat was not decremented, or the transaction crashed mid-write.
*   **Symptoms:** User dashboard displays "Confirmed" but the class roster is missing the student name, or database seats available count is out of sync.
*   **Resolution Steps:**
    1.  Trace the session ID using the `correlationId` from structured logs.
    2.  Check the outbox table for failed publishing attempts matching the target `enrollmentId`.
    3.  If the outbox message failed, execute the recovery script to manually reconcile capacity:
        ```sql
        BEGIN;
        -- Recalculate and update batch capacity based on actual confirmed enrollments
        UPDATE batches 
        SET seats_filled = (
          SELECT COUNT(*) FROM enrollments 
          WHERE batch_id = 'target-batch-uuid' AND enrollment_status IN ('Confirmed', 'Active')
        )
        WHERE id = 'target-batch-uuid';
        COMMIT;
        ```
    4.  Trigger a manual sync event to update the student roster in downstream modules.

### 3.2 Runbook 2: Resolving Duplicate Student Profiles
*   **Problem:** Due to manual entry bypass or input errors (e.g., mismatched mobile country codes), duplicate student records are created linking to different person records for the same physical individual.
*   **Resolution Steps:**
    1.  Identify the target duplicate records: `STU-A` and `STU-B`.
    2.  Check the active enrollments for both profiles.
    3.  If one profile is in `Draft` and has no payments, delete the draft enrollment.
    4.  To merge profiles, execute the merge utility tool:
        *   Re-map all active/completed `admissions` and `enrollments` from `STU-B` to `STU-A`.
        *   Soft-delete `STU-B` and mark the associated `Person` record as deleted.
        *   Log the merge action to the system audit database table containing the supervisor authorization user ID.
