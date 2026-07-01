# Part 10 - Security Architecture and NFR

## 1. Security Architecture & Threat Mitigation

### 1.1 Personally Identifiable Information (PII) Data Masking
Trainers' personal details (such as passport numbers, civil ID values, date of birth, personal email, and mobile phone numbers) reside in the shared `Person` record. Access is controlled by the following security parameters:
* **Dynamic Masking at API Boundary:** The delivery layer route handler dynamically masks details returned to non-admin actors. 
  * Mobile numbers are masked: `+968 XXXX 5678`.
  * Civil ID numbers are masked: `XXXX-XXXX-1234`.
* **Field-Level Encryption:** If required by compliance rules, civil ID and passport numbers are encrypted at rest using AES-256-GCM. Decryption keys are stored securely in environment variables and are only visible to authorized HR profiles.

### 1.2 Audit Trails for Payment and Status Mutations
* **Immutable Logs:** Any write or edit to the `TrainerCompensationRate` table (e.g. rate changes) and status transitions of `TrainerProfile` must publish domain events to the transactional outbox for the Audit & Compliance context to record asynchronously.
* **Payload Capture:** The system records the complete old and new states in JSON format.
* **Correlational ID:** All operations include a correlation ID linked to the HTTP request tracing context, enabling audit investigators to map API requests directly to database operations.

### 1.3 Branch-Isolation Enforcement (Server-Side)
* **RBAC Controls:** The system validates the active branch context of the user session against the branch constraints of the target record.
* **Filter Injection:** DB queries automatically inject a branch filter:
  `WHERE branch_id = :session.activeBranchId AND is_deleted = false`.
* **Super Admin Exception:** Users holding the `report:consolidated` permission bypass this filter during execution.

---

## 2. Non-Functional Requirements (NFR)

### 2.1 Performance Targets

| Operation / Query | Metric Type | Target Threshold | Conditions / Scale |
| :--- | :--- | :--- | :--- |
| `GET /api/trainers` | Response Time | $\le 200\text{ ms}$ | With page size of 25 records and 3 active filters. |
| Availability Query | Execution Time | $\le 150\text{ ms}$ | Triggered by Scheduling Engine for up to 10 trainers simultaneously. |

---

### 2.2 Uptime & Reliability
* **Service Uptime:** $\ge 99.9\%$ monthly availability.
* **Transaction Reliability:** 100% durability on database operations. Outbox events must be written within the same transaction block as the profile changes to prevent system state mismatches.

---

### 2.3 Scalability & Concurrency
* **Concurrent Lookups:** The availability check queries must support up to **100 concurrent requests** without deadlocking database transactions.
* **Database Connections:** Read queries run against read replicas where configured, leaving the primary database instance available for mutations.

---

### 2.4 Usability & Accessibility
* **Bilingual Switch Latency:** Transition between LTR (English) and RTL (Arabic) layouts must occur instantaneously (client-side render update) without page reloads.
* **Bilingual Precision:** All system error messages must contain localized error translation blocks mapping to both English and Arabic language contexts.

---

### 2.5 Regulatory Compliance
* **Ministry Certification Audit:** Trainer profiles must maintain files confirming Ministry of Higher Education & Scientific Research teaching authorizations (where required in Oman).
* **Tax Audit Compliance:** Financial entries logged in `TrainerCompensationRate` must store numbers formatted to **3 decimal places** to prevent rounding differences under Omani tax law.
