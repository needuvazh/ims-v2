## 1. Database & Persistence Migration

- [x] 1.1 Add `issueDate` (DateTime, nullable), `expiryDate` (DateTime, nullable), and `version` (Int, default 1) to the `Document` model in `packages/database/prisma/schema.prisma`.
- [x] 1.2 Generate and apply the database migration locally:
  ```bash
  npx prisma migrate dev --name add_document_dates_and_version
  ```
- [x] 1.3 Verify the generated Prisma Client type definitions are updated.

## 2. Core Domain & Business Logic

- [x] 2.1 Create the ports interfaces in `packages/documents/src/domain/ports.ts` (e.g. `StorageProvider` for Vercel Blob abstraction, `OwnerResolver` for resolving cross-context owner existence/branch).
- [x] 2.2 Update Zod schemas in `packages/documents/src/domain/document.ts` to validate:
  - `issueDate` and `expiryDate` (asserting `expiryDate >= issueDate`).
  - `DocumentStatus` and `VerificationOutcome` values.
  - Correct `DocumentOwner` properties mapping.
- [x] 2.3 Update `packages/documents/src/application/documents-service.ts`:
  - Implement the upload intent capability mapping to `StorageProvider.generateUploadUrl`.
  - Update `registerDocument` usecase to transactionally write to `Document` and `DocumentOwner` join tables while resolving `branchId` using `OwnerResolver`.
  - Implement verification decision usecase transactionally writing to `DocumentVerification` and updating verifier summary fields.
  - Implement the soft delete usecase (`retireDocument`) updating `isDeleted = true` and `status = Deleted`.

## 3. Delivery Layer & API Endpoints

- [x] 3.1 Create Next.js route handlers under `apps/admin-portal/src/app/api/documents/route.ts` and `apps/admin-portal/src/app/api/documents/[id]/route.ts` to expose the metadata CRUD actions.
- [x] 3.2 Create Next.js route handlers/Server Actions under `apps/admin-portal/src/app/api/documents/[id]/verify/route.ts` to handle approval/rejection submissions.
- [x] 3.3 Apply backend branch containment checks: assert that `Document.branchId` is within the user's `UserBranchAccess` list before allowing details, preview, or updates.
- [x] 3.4 Apply RBAC guards checking permissions: `document.create` for uploads, `document.verify.submit` for verification request, `document.verify.approve` for verification decisions, and `document.retire` for retirement/soft-deletion.

## 4. Background Expiry Scheduler

- [x] 4.1 Create an evaluation script that queries active documents where `expiryDate < CURRENT_DATE` and updates their `status` to `Expired`.
- [x] 4.2 Register the script in the system background runner.

## 5. Telemetry & Auditing

- [x] 5.1 Insert outbox entries for domain lifecycle events: `DocumentUploaded`, `DocumentVerified`, `DocumentRejected`, `DocumentExpired`, and `DocumentRetired`.
- [x] 5.2 Integrate the Audit service call on all mutations (approval, rejection, soft-retirement).

## 6. Verification & Quality Gates

- [x] 6.1 Write unit tests for `DocumentsService` validating:
  - Overlapping branch verification failures.
  - Rejection remarks mandatory check.
  - Soft-delete state mapping.
- [x] 6.2 Execute integration tests for the API endpoints verifying RBAC constraints.
- [x] 6.3 Run full workspace typecheck and lint checks:
  ```bash
  pnpm run typecheck
  pnpm run lint
  ```
