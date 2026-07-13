## Why

ASTI's B2B corporate operations require a robust, database-backed commercial pipeline. Before training execution begins in Module 14, sales representatives must track prospective accounts, log visits, schedule follow-ups, estimate profitability margins via costing sheets, route quotations for management approval, and confirm sales orders with uploaded LPOs. 

Currently, the Prisma database schema lacks these commercial models (`CorporateSalesLead`, `CorporateMarketingVisit`, `CorporateSalesFollowUp`, `Quotation`, `QuotationLineItem`, `QuotationRevision`, `QuotationCostingSheet`, and `SalesOrder`). This change adds these entities to `schema.prisma` and runs dev migrations to initialize the tables in PostgreSQL, providing the persistence layer for all corporate sales features.

## What Changes

1. **Database Schema**: Adds 8 new B2B sales models to `packages/database/prisma/schema.prisma` mapping to PostgreSQL physical tables.
2. **Relational Graph**: Integrates relations on existing models (`CorporateAccount`, `Branch`, and `Course`) to link B2B pipelines, branches, and catalog courses cleanly.
3. **Database Migrations**: Runs local PostgreSQL migrations to generate the tables and indices.
4. **TypeScript Types**: Regenerates Prisma Client types inside the monorepo workspace.

## Capabilities

### New Capabilities
- `corporate-sales-db`: Adds core B2B sales entities (`CorporateSalesLead`, `CorporateMarketingVisit`, `CorporateSalesFollowUp`, `Quotation`, `QuotationLineItem`, `QuotationRevision`, `QuotationCostingSheet`, and `SalesOrder`) with indexes, constraints, audit headers, and soft delete fields.

### Modified Capabilities
- `corporate-training-db`: Links `CorporateAccount` to B2B quotations, visits, leads, and confirmed orders to support commercial traceability.

## Impact

- **Affected Files**: `packages/database/prisma/schema.prisma`
- **Database Schema**: 8 new tables generated in PostgreSQL.
- **TypeScript**: Monorepo packages importing `@ims/database` will resolve the new types automatically.
