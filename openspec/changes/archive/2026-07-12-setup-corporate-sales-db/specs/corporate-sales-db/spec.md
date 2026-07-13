## ADDED Requirements

### Requirement: corporate-sales-db-schema
The database schema MUST include standard tables for logging B2B marketing visits, sales leads, follow-up calendar alerts, quotations, itemized quote line items, quotation revision snapshots, estimated costing sheets, and sales orders.
- The schemas MUST enforce server-side `branchId` scoping for Muscat vs Salalah vs Sohar location isolation.
- Relations to parent entities (`Branch`, `CorporateAccount`, and `Course`) MUST utilize RESTRICT deletion behaviors to protect audit validity.
- Concurrency version control columns (`version` field) MUST be included to resolve write conflicts.

#### Scenario: Validate database tables generation
- **WHEN** the schema update is validated via Prisma CLI
- **THEN** the schema validates successfully without syntax or type conflicts.

#### Scenario: Verify database migration run
- **WHEN** the database migration dev command executes
- **THEN** the PostgreSQL tables, indexes, maps, and foreign key relations are created in the active development database schema.
