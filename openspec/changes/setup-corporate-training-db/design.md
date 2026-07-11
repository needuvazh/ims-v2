## Context

The Module 14 Corporate Training Management (CTM) FRD specifies 5 database entities:
1. `CorporateAccount` (already exists in `schema.prisma` but lacks relations/indexes).
2. `CorporateContact` (missing).
3. `CorporateContract` (missing).
4. `CorporateParticipant` (missing).
5. `CorporateEnrollment` (missing).

Currently, `packages/database/prisma/schema.prisma` does not define the four missing tables or the back-relations to existing tables. Also, pre-enrollment corporate customer records cannot be branch-scoped because `CorporateAccount` does not associate with a branch.

This design outlines adding these database tables, defining the relations, adding the `branchId` column to `CorporateAccount`, and executing database migrations safely.

## Goals / Non-Goals

**Goals:**
- Update `packages/database/prisma/schema.prisma` with CTM models (`CorporateContact`, `CorporateContract`, `CorporateParticipant`, and `CorporateEnrollment`).
- Map all necessary back-relations on `CorporateAccount`, `Person`, `StudentProfile`, and `Enrollment` models.
- Add `branchId String? @db.Uuid` to `CorporateAccount` to enable branch scoping.
- Run a safe migration dev command to update local PostgreSQL.

**Non-Goals:**
- Implementing application services, routes, or UI components for CTM.
- Implementing costing sheets, travel/accommodation costing, or equipment tables.

## Decisions

### 1. Database Relations
To align with Part 4 database specs, we map:
- `CorporateAccount` 1 ── M `CorporateContact`
- `CorporateAccount` 1 ── M `CorporateContract`
- `CorporateAccount` 1 ── M `CorporateParticipant`
- `CorporateAccount` 1 ── M `CorporateEnrollment`
- `CorporateContact` N ── 1 `Person`
- `CorporateParticipant` N ── 1 `Person`
- `CorporateParticipant` N ── 1 `StudentProfile` (optional, populated when enrolled)
- `CorporateEnrollment` 1 ── 1 `Enrollment` (enforces unique enrollment link)
- `CorporateEnrollment` N ── 1 `CorporateContract`

### 2. Branch Isolation on CorporateAccount
We resolve the branch scoping gap by adding `branchId String? @db.Uuid` to the `CorporateAccount` model, with a relation to the existing `Branch` model:
```prisma
branchId       String?           @db.Uuid
branch         Branch?           @relation(fields: [branchId], references: [id], onDelete: Restrict)
```
*Note*: The field is marked optional (`String?`) to prevent breaking existing migrated database data, but application validations will require a valid branch for all new accounts.

### 3. Concurrency and Soft Deletes
All four new entities will include standard metadata fields:
- `version Int @default(1)` (for optimistic locking concurrency checks).
- `isDeleted Boolean @default(false)`, `deletedAt DateTime? @db.Timestamptz(6)`, and `deletedBy String? @db.Uuid` (for soft deletes).
- Standard audit timestamps and creator attributes.

## Risks / Trade-offs

- **Existing Data Compatibility**: Since `branchId` is introduced, it must be nullable in the database definition to allow existing rows to migrate without constraint violations. The application service boundary will enforce that all new records have `branchId` provided.
- **Transactional integrity**: The delete behavior uses `onDelete: Restrict` to prevent cascade deletes. Deactivating or closing contracts and accounts is handled using lifecycle statuses.
