# Functional Requirement Document (Part 10)
## Module 04: Admission & Enrollment Management – Security Architecture & NFRs

This document details the security constraints, data protection mechanisms, and Non-Functional Requirements (NFRs) for the Admission & Enrollment Bounded Context.

---

## 1. Security Architecture & Data Protection

### 1.1 Personally Identifiable Information (PII) Encryption
To comply with Omani data protection laws and general compliance guidelines:
*   **Encrypted Fields:** The `nationalId` (Civil ID / Passport Number) field in the `Person` model must be encrypted at the database application layer before write operations.
*   **Algorithm:** `AES-256-GCM` with a unique key initialization vector (IV) stored in the environment configuration (`ENCRYPTION_SECRET`).
*   **Key Rotation:** The encryption keys must support rotation without system downtime. The database service layers must handle dual decryption checks during rotation cycles.

### 1.2 Document Access Control & Object Storage Security
Admissions document uploads (Passports, Civil IDs, academic certificate files) are stored in private object storage:
*   **No Public Access:** The storage buckets must block all direct public reads/writes.
*   **Signed URLs:** Access to files in the browser is granted exclusively via ephemeral, pre-signed URLs generated on the server:
    ```typescript
    const presignedUrl = await storageClient.getPresignedUrl({
      bucket: "asti-student-documents",
      key: `admissions/${admissionId}/${documentId}.pdf`,
      expiresIn: 900 // Valid for 15 minutes (900 seconds)
    });
    ```
*   **Permission Checks:** The pre-signed URL generator API endpoint must verify the user holds `admission.read` and shares the same `branchId` context as the document owner before returning the link.

### 1.3 Row-Level Security (RLS) & Tenant Scoping
*   **Scoping:** Every database query affecting admissions, students, and enrollments must apply a predicate filter `WHERE branch_id = :userBranchId` unless executed by a Super Admin.
*   **Prisma Middleware Guard:** To prevent developers from forgetting this filter, a Prisma client extension enforces row-level security on select queries for the `Admission` and `Enrollment` models.

---

## 2. Non-Functional Requirements (NFR) Targets

| Category | Metric / Target | Specification & Threshold |
| :--- | :--- | :--- |
| **Performance** | API Response Time (95th percentile) | $\le 200\text{ms}$ for student directory searches and registration lookups under typical load. |
| **Performance** | API Response Time (Write Operations) | $\le 500\text{ms}$ for admission approval and enrollment state transitions (including PDF ID Card generation trigger). |
| **Performance** | PDF Card Generation | Digital ID Card PDF compilation must run asynchronously via background worker in $\le 5\text{ seconds}$ from approval. |
| **Availability** | System Uptime | $99.9\%$ core module availability, measured monthly. |
| **Scalability** | Concurrent Requests | Support $\ge 100$ concurrent registration requests without database deadlock. |
| **Usability** | Form Processing | Standard forms must be fully keyboard navigable and support accessibility ARIA labels. |
| **Compliance** | Audit Logs | All status changes on `Admission` and `Enrollment` must be written to read-only audit log tables within the same transactional scope. |
| **Concurrency** | Race Condition Guard | Batch seat allocation checks must use `SELECT FOR UPDATE` or serializable transactions to prevent double-booking. |
