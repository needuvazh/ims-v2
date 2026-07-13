# Part 10 – Security Architecture and NFR

## Module 15 – Corporate Sales & Quotation

---

# 1. Security Architecture

This section details the security controls, data classification models, and compliance limits governing Module 15.

## 1.1 Data Classification & Classification Levels
B2B sales details are categorized under three risk profiles:

| Data Field / Asset | Classification Level | Description | Security Requirement |
| :--- | :--- | :--- | :--- |
| **Contact Names, Phone Numbers, Emails** | `PII (Restricted)` | Identifiers of corporate representatives. | Masked on dashboard lists. Decrypted only on authorized detail reads. |
| **Uploaded LPO Files** | `Confidential` | Legal procurement records signed by B2B clients. | Encrypted at rest in object storage. Accessed only via signed URLs valid for 5 minutes. |
| **Quotation & Costing sheets** | `Internal Sensitive` | Commercial margin sheets, discounts, and pricing. | Isolated to authorized branch sales roles. Prevent export without management flags. |

## 1.2 Access & Mutation Controls
- **Bilingual Sanitization**: All text areas (discussion notes, remarks) are sanitized server-side before db writes to prevent cross-site scripting (XSS) or SQL injections.
- **Optimistic Concurrency Control (OCC)**: The `Quotation` and `CorporateSalesLead` entities include a `version` column. All writes check if the current DB version matches the payload version. If a conflict is resolved (e.g., two managers approving a quote concurrently), the transaction throws `409 Conflict` (`ERR_CSQ_CONCURRENCY_ERROR`).
- **Export Control**: CSV/Excel downloads trigger an explicit audit log entry detailing the number of rows exported and the IP address of the requester.

---

# 2. Audit Logging Requirements

The following actions must write an audit record containing the actor, timestamp, branch scope, action type, entity, and old/new value snapshots:

1.  **Quotation Costing Modification**: Logs changes to estimated trainer, venue, or direct logistics costs.
2.  **Low-Margin Submission**: Audits quotations routed to approval queues due to margins below 25.00%.
3.  **Manager Overrides**: Audits decisions to approve low-margin quotes, including mandatory remarks.
4.  **Order Confirmation**: Audits won sales orders, capturing the linked LPO document ID and total order value.
5.  **Quotation Revisions**: Audits quotation version increments, logging the JSON snapshot of the previous version.

---

# 3. Non-Functional Requirements (NFR)

## 3.1 Performance & Latency Targets
- **Margin Sheet Formulation**: Calculating profitability from direct and indirect inputs must execute sub-50ms (p95).
- **PDF Document Generation**: Compilation of quotation print-ready sheets must complete under 1.5 seconds.
- **Lead List Querying**: Branch-scoped search queries must return records in less than 200ms for up to 100,000 lead rows.

## 3.2 Reliability, Availability, Scalability (RAS)
- **High Availability**: Target 99.9% uptime for the sales module APIs.
- **Job Recovery**: If the follow-up reminder background task fails during cron runs, it must auto-resume from the last recorded state without missing alert dispatches.

## 3.3 Usability & Localization
- **Bilingual Interface**: Seamless hot-swapping between English (LTR) and Arabic (RTL).
- **Timezone**: Dates must default to Gulf Standard Time (GST, UTC+4) or Oman Time (GST/GST, UTC+4).

## 3.4 Compliance Targets
- **Privacy Compliance**: Align with Oman's Personal Data Protection Law (PDPL). Customers can request soft-deletion of contact histories.
- **Tax Enforcement**: Apply Omani 5% VAT rate defaults to all subtotal calculations.
