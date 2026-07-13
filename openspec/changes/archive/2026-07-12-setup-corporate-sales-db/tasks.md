## 1. Update Prisma Schema

- [x] 1.1 Add relations from `CorporateAccount`, `Branch`, and `Course` to the new models in `packages/database/prisma/schema.prisma`.
- [x] 1.2 Add the `CorporateSalesLead` model with indexes, keys, audit headers, and soft delete fields.
- [x] 1.3 Add the `CorporateMarketingVisit` model.
- [x] 1.4 Add the `CorporateSalesFollowUp` model.
- [x] 1.5 Add the `Quotation` model.
- [x] 1.6 Add the `QuotationLineItem` model.
- [x] 1.7 Add the `QuotationRevision` model.
- [x] 1.8 Add the `QuotationCostingSheet` model.
- [x] 1.9 Add the `SalesOrder` model.

## 2. DB Migrations and Validations

- [x] 2.1 Run schema validation via `npx prisma validate --schema packages/database/prisma/schema.prisma` to confirm correct syntax and field resolution.
- [x] 2.2 Execute `npx prisma migrate dev --schema packages/database/prisma/schema.prisma --name add_corporate_sales_entities` to generate and apply migrations.
- [x] 2.3 Verify migration SQL to ensure constraints, unique rules, indexes, map names, and relations are correctly formatted.

## 3. Monolith Compilation & Verification

- [x] 3.1 Run `pnpm typecheck` to verify that typescript compilation succeeds across all packages.
- [x] 3.2 Run admissions tests `pnpm --filter @ims/admissions-enrollment test` to verify no regressions in enrollment domain operations.
- [x] 3.3 Run database tests `pnpm --filter @ims/database test` to verify security policies remain active.
