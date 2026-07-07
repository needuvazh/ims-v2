## Why

ASTI requires a secure, permission-aware, and branch-isolated document management module (Module 13) to store, verify, and track expiry for compliance evidence (such as Civil ID, Passport, academic transcripts, and sponsorship letters) associated with Student, Trainer, Corporate, and Person owners. 

Vercel Blob will serve as the storage infrastructure for file binaries, while the PostgreSQL database retains the authoritative metadata, ownership mappings, and immutable verification history. 

Currently, there is a minimal implementation in `packages/documents`, but it lacks support for the core verification workflow (approval, rejection with remarks, soft-retirement) and background expiry evaluation. More critically, the actual `schema.prisma` is missing key database fields required by the business (`issueDate`, `expiryDate`, and optimistic locking `version`) and uses a many-to-many `DocumentOwner` relationship table and a direct `branchId` column which must be reconciled in the API and application service layers.

## What Changes

1. **Database Schema & Migration:**
   * Apply a database migration to add `issueDate` (DateTime, nullable), `expiryDate` (DateTime, nullable), and `version` (Int, default 1) to the `Document` model in `schema.prisma`.
   * Reconcile model relationships to write and read owner associations via `DocumentOwner` and query scoping directly via `branchId`.

2. **Backend Application Services (`packages/documents`):**
   * Extend `DocumentsService` with use cases for:
     * Controlled upload intent validation.
     * Document registration after Vercel Blob confirmation.
     * Verification submission (`status = Active`, outcome remains `Pending`).
     * Verification approval/rejection (atomic transaction writing an immutable `DocumentVerification` row and updating the `Document`).
     * Soft delete/retirement (marking `isDeleted = true` and `status = Deleted`).
     * Search and list queries with pagination, metadata filters, and server-side branch scope.
     * Controlled file access URL generation (short-lived signed Vercel Blob URLs).

3. **API & Server Action Delivery Boundary (`apps/admin-portal`):**
   * Create Next.js Route Handlers / Server Actions implementing `/api/documents/*` endpoints.
   * Enforce dynamic RBAC permission checks (e.g. `document.verify.approve`) and server-side branch scope isolation.

4. **Background Expiry Job:**
   * Implement a cron job within the scheduled job runner to query active documents whose `expiryDate` has passed and transition their `status` to `Expired`.

5. **Cross-Context Integrations:**
   * Integrate with **Audit & Compliance** to record critical lifecycle actions.
   * Integrate with **Communication & Notification** to emit `DocumentExpiringSoon` events for future alerts.

## Capabilities

### New Capabilities
- `document-management`: Controlled document upload, verification lifecycle queues, secure short-lived preview generation, soft-retirement, and cron-based expiry tracking.

### Modified Capabilities
<!-- None -->

## Impact

* **Packages:**
  * `packages/database`: Schema updates and migration.
  * `packages/documents`: Business logic services and domain unit tests.
  * `packages/shared-kernel`: Reusable Zod validation primitives (UUID, dates).
* **Applications:**
  * `apps/admin-portal`: New API routes/Server Actions under `/api/documents`.
* **Infrastructure:**
  * Vercel Blob: Interfaced via server-side storage credentials.
  * Cron Scheduler: Execute daily expiry evaluation.
* **Telemetry & Audit:**
  * Audit log entries for creation, metadata update, verification, and retirement.
  * Structured log logging with requestId, correlationId, and actorId.
