## Context

Admission intake is decoupled from the enrollment lifecycle. This change separates admission drafting, submission, and review into a dedicated branch-scoped workflow, enforcing validation rules, branch isolation, and duplicate prevention.

## Decisions

### 1. Branch and Identity Resolution
- **Branch Scope:** The request payload must not accept `branchId`. The active branch ID MUST be resolved server-side from the authenticated session context (e.g., `session.activeBranchId` or branch access checks).
- **Identity Reference:** The admission draft creation method accepts `studentProfileId` (canonical identity reference) rather than raw contact details.
- **Duplicate Check Invariant:** Before creating a draft, search for any non-deleted admission record (`isDeleted = false`) matching `studentProfileId` and the resolved `branchId` that has a status of `Draft`, `Submitted`, or `Approved`. If found, throw a `DomainError` with error code `ERR_ADM_ACTIVE_ADMISSION_EXISTS`.

### 2. State Machine and Workflow Controls
- **Block Draft Approval:** Update the `approveAdmission` command to enforce that the admission must be in the `Submitted` state. Direct transition from `Draft` to `Approved` is prohibited.
- **New States / Actions:**
  - `submitAdmission`: transitions `Draft` $\rightarrow$ `Submitted`, setting `submittedAt = now()`.
  - `rejectAdmission`: transitions `Submitted` $\rightarrow$ `Rejected`, requiring a mandatory `remarks` (rejection reason) input and setting `rejectedAt = now()`, `rejectedBy = actorId`.
  - `cancelAdmission`: transitions `Draft` or `Submitted` $\rightarrow$ `Cancelled`, setting `cancelledAt = now()`, `cancelledBy = actorId`.

### 3. CRM Lead Conversion Route Integration
- Update the API route handler `apps/admin-portal/app/api/v1/crm/leads/[id]/convert/route.ts` to explicitly map the `ERR_ADM_ACTIVE_ADMISSION_EXISTS` error.
- Translate it to HTTP 409 Conflict with a clear English/Arabic error response, preventing generic HTTP 500 responses.

### 4. Transaction-Safe Outbox Event Semantics
- Ensure the creation of the admission draft, database audit log entries, and outbox events occur in a single database transaction.
- **Payload shapes:**
  - `AdmissionCreated`:
    ```json
    {
      "admissionId": "uuid",
      "admissionNumber": "string",
      "studentProfileId": "uuid",
      "personId": "uuid",
      "branchId": "uuid",
      "leadId": "uuid|null"
    }
    ```
  - `StudentProfileCreated` (conditional only if a new student profile was created in that transaction):
    ```json
    {
      "studentProfileId": "uuid",
      "studentNumber": "string",
      "personId": "uuid",
      "status": "Active",
      "joinedAt": "ISOString"
    }
    ```

### 5. Collision-Free Numbering Series
- Replace `Date.now().slice(-6)` slicing with a transaction-safe incremental numbering sequence or database reservation pattern (e.g. database sequence or locking configuration counter) to guarantee unique values for `studentNumber` and `admissionNumber` under high concurrency.

### 6. Prisma Schema Enhancements
Modify the `Admission` model to capture rejection and cancellation details:
```prisma
model Admission {
  // Existing fields...
  admissionStatus  AdmissionStatus @default(Draft)
  submittedAt      DateTime?       @db.Timestamptz(6)
  approvedAt       DateTime?       @db.Timestamptz(6)
  approvedBy       String?         @db.Uuid
  rejectedAt       DateTime?       @db.Timestamptz(6)
  rejectedBy       String?         @db.Uuid
  cancelledAt      DateTime?       @db.Timestamptz(6)
  cancelledBy      String?         @db.Uuid
  remarks          String?         @db.Text
  // Existing relations and metadata...
}
```

## Risks / Trade-offs

- [Risk] Restricting `approveAdmission` to `Submitted` state breaks integration flows that auto-approve drafts. $\rightarrow$ Mitigation: Ensure all test cases are updated to execute the full sequence (`Draft` $\rightarrow$ `Submit` $\rightarrow$ `Approve`).
