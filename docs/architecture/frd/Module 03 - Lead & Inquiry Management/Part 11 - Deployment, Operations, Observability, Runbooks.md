# ASTI IMS: Functional Requirement Document
## Module 03: Lead & Inquiry Management
### Part 11 - Deployment, Operations, Observability, Runbooks

---

## 1. Observability Setup

To support operational monitoring, the Lead & Inquiry Management context publishes structured logs, transaction traces, and Prometheus metrics.

### 1.1 Structured Logs Format
All backend services emit logs in JSON format to stdout. The logs are indexed in a central system (e.g. OpenSearch or Datadog).

```json
{
  "timestamp": "2026-06-30T16:25:00.123Z",
  "logLevel": "INFO",
  "requestId": "req-mct-7c98b671-12ef-42f0",
  "userId": "9b48b671-12ef-42f0-9b48-12cd34ef56ab",
  "branchId": "e382d640-a192-498c-8be9-e0921bd2cf31",
  "actionCode": "CRM_LEAD_CONVERT_INITIATED",
  "message": "Lead conversion sequence triggered for LD-2026-MCT-00099",
  "metadata": {
    "leadId": "7c98b671-12ef-42f0-9b48-12cd34ef56ab",
    "courseId": "c182b740-12ef-4cb3-912b-40ab12f00101"
  }
}
```

### 1.2 Tracing Spans & Boundaries
Distributed tracing spans are defined around key asynchronous and transactional boundaries:
1. `crm.inquiry.ingest`: Starts at the API gateway router, wraps duplicate check routines, and ends with the DB insert confirmation.
2. `crm.lead.qualify`: Measures duration to generate person records, create lead records, and update inquiry records.
3. `crm.lead.convert`: Wraps the multi-context cross-aggregate transaction that seeds the `students` and `admissions` tables downstream.

### 1.3 Metrics Instrumentation

| Metric Name | Type | Description | Labels |
| :--- | :--- | :--- | :--- |
| `asti_crm_leads_created_total` | Counter | Total count of leads registered in the system. | `branch_id`, `source`, `type` |
| `asti_crm_lead_stage_transitions_total` | Counter | Count of lead stage shifts. | `from_stage`, `to_stage`, `branch_id` |
| `asti_crm_lead_conversion_seconds` | Histogram | Time elapsed from lead creation to conversion. | `branch_id`, `course_id` |
| `asti_crm_followups_overdue_total` | Gauge | Count of active follow-ups exceeding schedule time. | `branch_id`, `counselor_id` |

---

## 2. Operations & Maintenance

### 2.1 System Healthcheck Rules
An internal route `/api/health/crm` is queried by the container orchestrator. It returns HTTP 200 OK only if the following dependencies pass:
* **PostgreSQL Connection**: `SELECT 1` executes successfully.
* **Sequence Pool Check**: Evaluates if the `NumberingSeries` next serial cache is not exhausted.
* **Storage Check**: Connection to private document bucket is active.

### 2.2 Backup & Recovery Instructions
* **Target Tables**: `inquiries`, `leads`, `lead_follow_ups`, `campaigns`.
* **Backup Schedule**: Every **6 hours** viapg_dump cron task.
* **pg_dump Execution Syntax**:
```bash
pg_dump -h asti-postgres-primary.internal -U db_admin -d asti_ims \
  -t inquiries -t leads -t lead_follow_ups -t campaigns \
  -F c -b -v -f /backups/asti_crm_backup_$(date +%F_%H%M%S).dump
```
* **Recovery Sequence**:
  1. Halt application server nodes (to prevent concurrent writes).
  2. Restore tables from dump file using `pg_restore`:
```bash
pg_restore -h asti-postgres-primary.internal -U db_admin -d asti_ims --clean --if-exists /backups/asti_crm_backup_target.dump
```
  3. Run type check queries and restart application nodes.

---

## 3. Troubleshooting Runbooks

### Runbook 1: Recovery from Transaction Failures during Handoff
* **Problem**: Lead is marked "Won" but the Admissions engine fails to create the corresponding student profile (e.g. database pool time-out), leaving the lead in a stale "Won" state without a corresponding student record.
* **Step-by-step Triage**:
  1. Query the database to find leads in stage `Won` that lack an admission record:
```sql
SELECT id, "leadNumber", "firstName", "lastName", "branchId" 
FROM leads 
WHERE stage = 'Won' 
  AND id NOT IN (SELECT DISTINCT "leadId" FROM admissions WHERE "leadId" IS NOT NULL);
```
  2. Examine the logs using `requestId` to identify the failure exception (e.g., duplicate constraint on Student Number).
  3. **Resolution**: If the failure was due to a transient database lock, execute the recovery script to manually force handoff conversion:
```typescript
import { crmHandoffService } from "@/packages/admission-enrollment/services/crmHandoff";

async function forceRecovery(leadId: string) {
  console.log(`Starting forced conversion recovery for Lead: ${leadId}`);
  await crmHandoffService.convertLeadToAdmission(leadId);
  console.log("Forced conversion completed successfully.");
}
forceRecovery("7c98b671-12ef-42f0-9b48-12cd34ef56ab");
```

---

### Runbook 2: Web Ingestion Rate-Limit Block Alert
* **Problem**: A counselor reports that online registrations from the public website have stopped appearing, and log systems indicate multiple `429 Too Many Requests` errors from the website hosting IP.
* **Step-by-step Triage**:
  1. Verify the current request rate of the website server IP from the telemetry logs.
  2. Check if the website public token has been compromised, causing spam submissions.
  3. **Resolution**: If the IP block was triggered by a legitimate traffic surge (e.g., summer campaign launch), execute the command to whitelist the website server IP temporarily in the rate limiter module:
```bash
# Execute CLI tool in the admin node container
npm run crm:whitelist-ip -- --ip=192.168.4.15 --duration=24h
```
  4. If the traffic is spam, rotate the public API token in the `SecurityPolicy` configuration and update the website server configuration.

---

### Runbook 3: Outbox Event Processing Lag
* **Problem**: In-process domain events (e.g. notifying counselors of new leads) are lagging, and records are accumulating in the `outbox_events` table with status `Pending`.
* **Step-by-step Triage**:
  1. Check the count of pending outbox events:
```sql
SELECT status, COUNT(*) 
FROM outbox_events 
WHERE status = 'Pending' AND "availableAt" < NOW() 
GROUP BY status;
```
  2. If the count is $> 100$ and growing, check the background worker process logs for memory exhaustion or thread blocking.
  3. **Resolution**:
     * Restart the background worker service container.
     * If an event payload has corrupted data causing the worker to crash repeatedly, identify the event ID from the logs and update its status to `Failed` to allow the queue to progress:
```sql
UPDATE outbox_events 
SET status = 'Failed', "lastError" = 'Forced skip due to payload corruption' 
WHERE id = 'uuid-of-corrupted-event';
```
