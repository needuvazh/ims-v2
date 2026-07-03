# ASTI IMS: Functional Requirement Document
## Module 03: Lead & Inquiry Management
### Part 10 – Security Architecture and NFR

---

## 1. Security Architecture & Data Protection

The Al Saud Training Institute (ASTI) Lead & Inquiry Management module holds prospective students' Personally Identifiable Information (PII) and corporate contact details. The system enforces cryptographic, access-level, and operational controls to secure this database.

### 1.1 Personally Identifiable Information (PII) Security & Masking
* **Sensitive PII Fields**: Mobile phone numbers, email addresses, and uploaded Civil ID/Passport scans.
* **Storage Encryption**: All PDF/Image attachments containing Civil IDs or Passports are stored in private S3-compatible buckets. The system exposes these files only via short-lived pre-signed URLs (expiration set to **300 seconds**).
* **Screen Masking Policies**:
  * In general listing views (`LEAD-UI-001`, `LEAD-UI-004`), telephone numbers, email addresses, and Civil IDs (`nationalId` on the linked `Person` model) are masked for users lacking explicit export permission (`lead.export`).
  * **Phone Masking Format**: `+968 91234567` renders on screen as `+968 91***567`.
  * **Email Masking Format**: `prospect@gmail.com` renders on screen as `p******t@gmail.com` (retains first and last character of the local mailbox name, plus the domain suffix).
  * **Civil ID Masking Format**: `12-345678` (stored as `nationalId` in the `Person` model) renders as `**-**5678`.
  * **Detail Workspace Access (`LEAD-UI-005`)**: PII is masked by default on detail screens. Authorized users can click a "View" toggle icon next to any masked field. This action triggers a secure request to the reveal endpoint `POST /api/v1/crm/leads/{id}/reveal-pii` which temporarily returns the raw value to display for 10 seconds and automatically generates an immutable audit record in the database:
    * Action: `PIIViewed`
    * Module: `LeadCRM`
    * Details: `{"field": "email", "leadId": "UUID", "reason": "Counselor requested view"}`
    * Enforces Oman Personal Data Protection Law (PDPL) access auditing guidelines.

### 1.2 Audit Trail Integrity
* **Immutable Logs**: Every modification of a Lead Stage or counselor assignment writes to the `audit_logs` table.
* **Audit Record Schema constraints**:
  * Logs must capture `oldValue` and `newValue` as queryable PostgreSQL JSONB fields.
  * Attempting to modify or soft-delete any row in the `audit_logs` table triggers an immediate database exception (enforced via DB triggers).

### 1.3 Web Ingestion Rate Limiting
* To protect the public-facing `/api/v1/crm/inquiries` endpoint from web form spam or Denial of Service (DoS) attempts:
  * **Rate Limit Policy**: Maximum **10 API requests per sliding window of 60 seconds** per unique IP address.
  * **Exceeded Behavior**: Returns HTTP Status `429 Too Many Requests` with payload `{"errorCode": "ERR_SECURITY_RATE_LIMIT_EXCEEDED", "retryAfterSeconds": 45}`.
  * Enforced using an in-process memory cache sliding-window algorithm.

---

## 2. Non-Functional Requirements (NFRs)

### 2.1 Performance & Response Thresholds
* **Read Endpoint Latency ($P_{95}$)**: The main Lead Workspace table (`GET /api/v1/crm/leads`) must load in under **300ms** under a simulated workload of 100 concurrent requests.
* **Write Mutation Latency ($P_{95}$)**: Stage transitions and follow-up logging (`PATCH /api/v1/crm/leads/{id}/stage`) must complete execution in under **500ms**.
* **Database Query Performance**: Queries targeting `leads` must leverage index scans. Seq scans are prohibited for queries filtering by `branchId`, `counselorId`, or `stage`.

### 2.2 Availability & Reliability
* **System Uptime**: The Lead CRM module services must maintain an availability metric of **99.9%** ($3\text{ nines}$) on a monthly trailing window.
* **Failover Threshold**: In the event of a primary PostgreSQL instance failure, read-only dashboard traffic must failover to replica nodes within **30 seconds**.

### 2.3 Scalability & Concurrent Load Limits
* **Concurrencies**: Support a minimum of **500 concurrent connections** to the Admin Portal during peak enrollment periods without thread exhaustion.
* **Database Connection Pooling**: Enforces connection limits of max 50 active pool connections per node runner via Prisma Accelerate or PgBouncer.

### 2.4 Usability & Accessibility
* **WCAG 2.1 AA Compliance**: All Admin Portal screens must be navigable using keyboard tab controls, have a minimum color contrast ratio of **4.5:1** for standard text elements, and include `aria-label` tags on all icon-only action buttons.
* **Dynamic Layout Engine**: Full bidi mirroring transitions when toggling from English (LTR, font family `Inter`) to Arabic (RTL, font family `Cairo`) within **100ms** of user click.

### 2.5 Compliance & Regulatory Targets
* **Oman PDPL (Royal Decree No. 6/2022)**: Storage of Omani citizens' national IDs and contact details must align with national personal data protection regulations:
  * Prospect PII must reside on databases hosted physically within Oman or in GCC-compliant regional cloud regions.
  * Inactive leads (stages `Lost` or `Converted` older than 5 years) must be automatically pruned or fully anonymized (removing names, exact phones, and civil IDs) to respect the "right to be forgotten" mandate.
