## 1. Update Prisma Schema

- [x] 1.1 Add `branchId String? @db.Uuid` and the corresponding relation to the `Branch` model in `CorporateAccount`.
- [x] 1.2 Add the `CorporateContact` model with columns (`id`, `corporateAccountId`, `personId`, `designation`, `department`, `email`, `phone`, `isPrimary`, `portalAccessEnabled`, `status`, `version`, audit columns, soft-delete columns), keys, relations, and index mapping in `packages/database/prisma/schema.prisma`.
- [x] 1.3 Add the `CorporateContract` model with columns (`id`, `corporateAccountId`, `contractNumber`, `contractValue`, `startDate`, `endDate`, `billingModel`, `paymentTerms`, `status`, `version`, audit columns, soft-delete columns), keys, relations, and index mapping in `schema.prisma`.
- [x] 1.4 Add the `CorporateParticipant` model with columns (`id`, `corporateAccountId`, `personId`, `employeeCode`, `department`, `designation`, `linkedStudentProfileId`, `status`, `version`, audit columns, soft-delete columns), keys, relations, and index mapping in `schema.prisma`.
- [x] 1.5 Add the `CorporateEnrollment` model with columns (`id`, `corporateAccountId`, `corporateParticipantId`, `enrollmentId`, `contractId`, `billingStatus`, `version`, audit columns, soft-delete columns), keys, relations, and index mapping in `schema.prisma`.
- [x] 1.6 Add back-relation array fields on `Person`, `StudentProfile`, `Enrollment`, and `Branch` models to compile relational graph successfully.

## 2. DB Migrations and Validations

- [x] 2.1 Run schema validation via `npx prisma validate` to confirm correct syntax and field resolution.
- [x] 2.2 Execute `npx prisma migrate dev --name add_corporate_training_entities` to generate and apply migrations.
- [x] 2.3 Verify migration SQL to ensure constraints, unique rules, indexes, map names, and relations are correctly formatted.

