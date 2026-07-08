## Context

The current ASTI IMS codebase contains a minimal document model, but it is not integrated with the core verification workflows, scheduled expiration jobs, or detailed branch scoping. Additionally, the existing physical database schema lacks business-critical fields (`issueDate`, `expiryDate`, and optimistic locking `version`) and uses a decoupled relation model (`DocumentOwner` join table) which requires clean application-layer abstraction.

This design outlines the architecture, database migrations, application services, error handling, security constraints, and cross-context integrations to build a robust Document Management module.

## Goals / Non-Goals

**Goals:**

- Add missing date and version columns to `schema.prisma` and execute the migration.
- Implement complete document lifecycle commands: upload intent, metadata registration, approval/rejection with remarks, and soft retirement.
- Enforce server-side branch scope isolation on all list, retrieve, and mutation operations.
- Map owner validation dynamically using a generic port interface to prevent cross-context joins in the write path.
- Implement a daily cron job to transition expired documents to `status = Expired`.
- Record audit logs for all verification decisions and retirement events.

**Non-Goals:**

- Creating dynamic document types (enum `DocumentType` remains hardcoded for Phase 1).
- Automating payment verification or third-party digital signing (out of scope).
- Storing raw binary files in PostgreSQL (all binaries are stored in Vercel Blob).

## Decisions

### 1. Database Schema Migration

We will add the following columns to the `Document` model in `schema.prisma`:

```prisma
model Document {
  // ... existing fields ...
  issueDate  DateTime?       @db.Date
  expiryDate DateTime?       @db.Date
  version    Int             @default(1)
}
```

- **Rollback Strategy:** The migration is purely additive. Rollback involves applying a migration that drops these three columns.

### 2. Bounded Context Isolation (Owner Resolvers)

To prevent `packages/documents` from importing internal repository/service files of other contexts (which would violate DDD monorepo rules), we introduce an `OwnerResolver` port:

```typescript
export interface OwnerResolver {
  resolveOwnerBranch(ownerId: string, ownerType: OwnerType): Promise<string>;
  validateOwnerExists(ownerId: string, ownerType: OwnerType): Promise<boolean>;
}
```

Infrastructure adapters in the respective contexts (`crm-leads`, `admission-enrollment`, etc.) will implement these, or `documents` will resolve them via shared query services.

### 3. Verification State Machine & Field Mapping

We map the conceptual lifecycle states to Prisma's database representation:

- **Upload Intent / Registered:** `Document.status = Active`, `DocumentVerification.outcome = Pending`
- **Approved:** `Document.status = Active`, `DocumentVerification.outcome = Verified`
- **Rejected:** `Document.status = Active`, `DocumentVerification.outcome = Rejected` (remarks populated)
- **Expired:** `Document.status = Expired`
- **Retired/Deleted:** `Document.status = Deleted`, `Document.isDeleted = true`

### 4. Branch Isolation & Security

All delivery route handlers (Next.js APIs/Actions) must:

1. Verify user authentication and extract the user's branch access list (`UserBranchAccess`).
2. Authorize action-level permission (e.g. `document.verify.approve`).
3. Assert that the `Document.branchId` matches one of the user's allowed branches.

### 5. Vendor Anti-Corruption Layer (Vercel Blob)

Rather than invoking Vercel Blob APIs directly in our application services, we define a generic storage port:

```typescript
export interface StorageProvider {
  generateUploadUrl(
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; fileKey: string }>;
  generateSignedDownloadUrl(
    fileKey: string,
    expirySeconds: number,
  ): Promise<string>;
  deleteFile(fileKey: string): Promise<void>;
}
```

### 6. Audit & Domain Events

Transactions for verification and retirement will emit events to the outbox:

- `DocumentVerified` / `DocumentRejected` / `DocumentExpired` / `DocumentRetired`
- Crucial audit details (such as verifier user ID, timestamp, changes, and ipAddress) are persisted in the transaction.

## Risks / Trade-offs

- **Risk:** Blob files might be orphaned if database transactions fail after successful upload.
  - **Mitigation:** Implement a daily reconciliation worker to compare keys in Vercel Blob against active database records, garbage collecting orphan keys older than 24 hours.
- **Risk:** Background scheduler load during expiration evaluations.
  - **Mitigation:** Scope the cron query to only select active, non-expired documents with `expiryDate < CURRENT_DATE`. Add a database index on `expiryDate` for optimization.
