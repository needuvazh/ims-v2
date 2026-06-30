# Module 06 — Course Catalog & Training Delivery (Batch) Management

## Part 10 — Security Architecture and NFR

**Version:** 3.0  
**Status:** Draft  
**Domain:** Course Catalog & Training Delivery  
**Module Code:** CRS  

---

# 1. Security Architecture & Data Protection

This section details the security mitigations, encryption keys, and isolation techniques protecting course definitions and batch rosters.

---

### 1.1 Data Classification and Encryption
To secure sensitive personal and curriculum records, the database layer must enforce the following encryption protocols:
*   **Curriculum Intellectual Property (IP):** Exam question formats and completion rules are stored at rest with standard AES-256 database encryption.
*   **Bilingual PII Protection:** Student names, contact numbers, and trainer civil IDs mapped to rosters are classified as **PII (Personally Identifiable Information)**. In transit, all API connections are restricted to TLS 1.3. At rest, database columns containing PII are encrypted using application-level AES-256-GCM.
*   **Bilingual UI Escaping:** To protect the admin catalog and public course lookup screens from Cross-Site Scripting (XSS), the front-end components must escape and sanitize all localized Arabic and English description text inputs using DOMPurify before rendering.

---

### 1.2 Multi-Branch Data Isolation
*   **Query Interceptor Isolation:** All Prisma client queries targeting `batches`, `batch_trainers`, `waiting_list`, and branch-level `course_pricings` tables must pass through a middleware wrapper.
*   **Logic Rule:** The middleware dynamically appends a `WHERE branchId = user.activeBranchId` filter based on the active JWT claims, unless the user holds `consolidatedVisibility` or a `Super Admin` role context.
*   **Route Guards:** Direct URLs requesting batch IDs (e.g. `/batches/:id/roster`) must perform a backend authorization check. If the requested batch's branch context does not match the active session branch context, the endpoint returns a `403 Forbidden` response and logs a security alert.

---

### 1.3 Hardening of Audit Controls
*   **Immutable Write-Only Ledger:** The `AuditLog` table does not support UPDATE or DELETE permissions. The PostgreSQL schema enforces this through a database trigger block:
    ```sql
    CREATE RULE no_update_audit AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
    CREATE RULE no_delete_audit AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
    ```
*   **Differential Logging:** Every course pricing change or waitlist promotion bypass must write an audit record capturing the precise JSON diff (`oldValue` vs. `newValue`) and the UUID of the authorizing actor.

---

# 2. Non-Functional Requirements (NFRs)

The following metrics are defined as service level agreements (SLAs) for the production deployment of Module 06.

---

## 2.1 Performance Targets

### 2.1.1 Latency
*   **GET `/api/v1/courses` (Catalog Search):** Must return response in $< 200\text{ms}$ (95th percentile) under a baseline load of 100 concurrent read requests.
*   **POST `/api/v1/batches/:id/trainers` (Conflict validation check):** Overlap checks must process in $< 50\text{ms}$.
*   **Roster Loading Screen:** Grid layout loading page must display skeleton layouts in $< 500\text{ms}$ and populate data in $< 1.2\text{s}$ under standard network latency.

### 2.1.2 Throughput
*   The system must support at least 150 read transactions per second (TPS) on catalog description pages and 30 write transactions per second (TPS) for waitlist/enrollment actions.

---

## 2.2 Availability & Scalability

### 2.2.1 Uptime SLA
*   The course catalog and batch delivery lookup services must maintain a **99.95% uptime** annualized ($< 4.38\text{ hours}$ of unscheduled downtime per year).

### 2.2.2 Scalability
*   **Roster Limits:** The database and UI must comfortably support batches with up to 500 students (for corporate online live seminars) without screen lag.
*   **Active Batch Load:** The system must handle up to 2,000 active, in-progress training batches simultaneously across all ASTI branches.
*   **Concurrency Guard:** Seat allocation lock transaction checks (`SELECT FOR UPDATE` on `batches.currentEnrollmentCount`) must prevent race conditions and overbooking failures under a spike load of 100 concurrent registration attempts on a single batch.

---

## 2.3 Usability Targets
*   **Bilingual Fluidity:** The user interface must transition LTR/RTL layouts dynamically in $< 100\text{ms}$ when the user switches language preference, maintaining layout boundaries and input focuses.
*   **Bilingual Validation:** The forms must check character inputs in real-time, providing immediate visual warnings (red outlines) within 50ms of invalid script entry (e.g. typing English in the Arabic Name input).

---

## 2.4 Compliance & Retention Policies
*   **Ministry of Higher Education (Oman) Auditing:** Course definitions, batch codes, schedules, and final student completion scores must be retained in the active system for **10 years** from the date of batch completion.
*   **Financial Records Audits:** Versioned pricing tables and tax receipts must be retained in accordance with Oman tax law guidelines (**7 years**).
*   **Trainer Scheduling logs:** Historical faculty assignments must be kept in the database for **3 years** for internal staff load audits.
*   **Data Purge:** After compliance periods expire, archived data is moved to secure long-term cold storage. Hard deletion from production tables is managed via automated cron clean-up scripts.
