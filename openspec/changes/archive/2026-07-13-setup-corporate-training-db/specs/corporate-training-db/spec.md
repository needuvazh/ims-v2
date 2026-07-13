## ADDED Requirements

### Requirement: Database Schema Definitions
The database schema must persist the four missing entities defined in Module 14 FRD Part 4:
- `CorporateContact`
- `CorporateContract`
- `CorporateParticipant`
- `CorporateEnrollment`

These entities must support optimistic locking with a `version` integer column, soft-deletes via `isDeleted`/`deletedAt`/`deletedBy`, standard audit columns, and referential constraints to existing models (`Person`, `Organization`, `StudentProfile`, `Enrollment`).

#### Scenario: Migrate database successfully
- **WHEN** the schema is updated and `npx prisma migrate dev` is executed
- **THEN** the PostgreSQL database successfully creates tables `corporate_contacts`, `corporate_contracts`, `corporate_participants`, and `corporate_enrollments` with all fields and indexes.

---

### Requirement: CorporateAccount Branch Scoping
To enforce branch isolation for B2B accounts, the `CorporateAccount` entity must be updated to contain a `branchId` UUID field.

#### Scenario: Verify branchId field mapping
- **WHEN** a CorporateAccount is queried from the database
- **THEN** the active branch association is resolved from `branchId`.
