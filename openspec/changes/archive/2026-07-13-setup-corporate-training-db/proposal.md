## Why

Currently, the Prisma database schema (`packages/database/prisma/schema.prisma`) is missing four of the five core database entities required for Module 14 – Corporate Training Management: `CorporateContact`, `CorporateContract`, `CorporateParticipant`, and `CorporateEnrollment`. The logical ER Model v3.0 and the FRD assume these entities exist. Furthermore, there is no `branchId` column on corporate entities, which blocks the requirement for branch-scoped isolation of pre-enrollment records.

Implementing these database changes now provides the necessary physical tables, indexes, and relations for the application logic of Module 14.

## What Changes

1. **Prisma Schema Update**:
   - Add new models `CorporateContact`, `CorporateContract`, `CorporateParticipant`, and `CorporateEnrollment` to `schema.prisma`.
   - Update `CorporateAccount`, `Person`, `StudentProfile`, and `Enrollment` models to define the corresponding back-relations.
2. **Branch Scoping**:
   - Add a `branchId` attribute to the `CorporateAccount` model to resolve the pre-enrollment scoping gap (Gap A).
3. **Database Migration**:
   - Run Prisma migration to push these changes to the local PostgreSQL database.

## Capabilities

### New Capabilities
- `corporate-training-db`: Establishes the database models, relations, and branch scoping fields for Module 14 Corporate Training Management.

### Modified Capabilities
*None*

## Impact

- **Database Schema**: `packages/database/prisma/schema.prisma` will be expanded.
- **Foreign Relations**: Upstream aggregates `Person` (Identity), `StudentProfile` (Admissions), and `Enrollment` (Admissions) will receive back-references to corporate entities.
- **Migration**: a new PostgreSQL migration file will be generated.
