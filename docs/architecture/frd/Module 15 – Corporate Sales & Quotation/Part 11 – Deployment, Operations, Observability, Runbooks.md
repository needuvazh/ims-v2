# Part 11 – Deployment, Operations, Observability, Runbooks

## Module 15 – Corporate Sales & Quotation

---

# 1. Observability Specifications

Module 15 utilizes structured JSON logging, distributed tracing contexts (W3C Trace Context standard), and system health telemetry to monitor commercial pipelines.

## 1.1 Structured Log Schemas
All business mutations write to standard console stdout in structured JSON format.

### Log Event: B2B Costing Sheet Updated
```json
{
  "timestamp": "2026-07-12T10:30:15.123Z",
  "level": "INFO",
  "context": "corporate-sales",
  "action": "COSTING_SHEET_UPDATED",
  "operatorId": "33333333-4444-5555-6666-777777777777",
  "branchId": "11111111-2222-3333-4444-555555555555",
  "traceId": "trace-1234567890abcdef1234567890abcdef",
  "metadata": {
    "quotationId": "00000000-4444-5555-6666-777777777777",
    "subtotal": 2500.000,
    "totalCost": 1800.000,
    "profitAmount": 700.000,
    "margin": 28.00
  }
}
```

### Log Event: Low-Margin Quotation Approval Override
```json
{
  "timestamp": "2026-07-12T10:45:00.000Z",
  "level": "WARN",
  "context": "corporate-sales",
  "action": "QUOTATION_MARGIN_OVERRIDDEN",
  "operatorId": "44444444-5555-6666-7777-888888888888",
  "branchId": "11111111-2222-3333-4444-555555555555",
  "traceId": "trace-9876543210fedcba9876543210fedcba",
  "metadata": {
    "quotationId": "00000000-4444-5555-6666-777777777777",
    "profitPercentage": 18.50,
    "remarks": "Approved override to secure strategically important B2B contract with OQ."
  }
}
```

## 1.2 Performance Metrics (Prometheus Telemetry)
The module exposes standard HTTP metrics on `/metrics`:
- `corporate_sales_lead_stage_transition_total`: Counter tracking pipeline transitions.
- `corporate_sales_quotation_profit_margin_ratio`: Gauge of overall average gross margins.
- `corporate_sales_outbox_lag_seconds`: Gauge tracking latency between outbox write and listener dispatch.

---

# 2. System Health Checks

The `/api/health` endpoint incorporates tests specific to corporate sales:
1.  **Database Connection Check**: Verifies that Prisma can perform reads on `corporate_sales_leads`.
2.  **Outbox Table Lag Check**: Returns a warning status if there are pending events in `OutboxEvent` older than 5 minutes.
    - Query: `SELECT COUNT(*) FROM outbox_events WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '5 minutes';`

---

# 3. Operational Troubleshooting Runbooks

## 3.1 Runbook: Outbox Event Propagation Failure
- **Symptom**: Sales Order is confirmed in the portal, but no Project or Corporate Account is instantiated in CTM (Module 14).
- **Diagnosis Steps**:
  1. Check `OutboxEvent` database table for records matching `action = 'SalesOrderConfirmed'`.
  2. If the status is `FAILED`:
     - Inspect the error column in the database and check application worker logs.
     - Verify database locks or network issues between modules.
  3. If status is `PENDING` but creation date is older than 2 minutes:
     - Check if the background worker daemon is active.
- **Remediation**:
  - Restart the worker process: `pnpm --filter @ims/worker start`.
  - Re-process failed events manually using the administrative API: `POST /api/admin/system/outbox/retry`.

## 3.2 Runbook: Concurrency Lock Error on Revision
- **Symptom**: User receives `409 Conflict` (`ERR_CSQ_CONCURRENCY_ERROR`) when attempting to submit costing updates or request revisions.
- **Diagnosis**:
  - This occurs when another manager has updated the quote status or version concurrently, causing the optimistic lock version comparison to fail.
- **Remediation**:
  - Request the client page to reload. This will fetch the latest `version` ID from the database.
  - The UI must display the updated values and warn that changes have been merged. Re-apply the modifications.

## 3.3 Runbook: Margin Calculation Discrepancy
- **Symptom**: User complains that the Profit % calculation on the screen does not match their spreadsheet total.
- **Diagnosis**:
  - Check if the quotation subtotal value includes Omani VAT. Costing sheets **must calculate profit based on the net value (excluding VAT)**.
- **Remediation**:
  - Verify that the calculation logic correctly subtracts VAT from the total selling price before division:
    $$\text{Margin \%} = \left( \frac{\text{TotalAmount} - \text{taxAmount} - \text{TotalCost}}{\text{TotalAmount} - \text{taxAmount}} \right) \times 100$$

## 3.4 Runbook: LPO Document Storage Upload Failure
- **Symptom**: Creating a sales order fails when trying to link the LPO PDF document.
- **Diagnosis**:
  - Check Document Management logs for Vercel Blob or object storage connection failures.
- **Remediation**:
  - Verify storage credentials are active in environmental files.
  - Inform the user to retry the upload. If storage remains down, fallback to confirmation email snapshot reference text inputs while storage is repaired.
