## 1. Database & Persistence Layer

- [x] 1.1 Add `admissionNumber String? @db.VarChar(50)` to the `Lead` model in `packages/database/prisma/schema.prisma`.
- [x] 1.2 Generate Prisma migration named `add_admission_number_to_lead` and run prisma client generation.
- [x] 1.3 Verify database migration was applied successfully.

## 2. CRM Bounded Context Updates

- [x] 2.1 Update Zod `LeadSchema` in `packages/crm-leads/src/domain/lead.ts` to include `admissionNumber: z.string().nullable().optional()`.
- [x] 2.2 Update `LeadRepository` in `packages/crm-leads/src/infrastructure/lead-repository.ts` to select and handle the new `admissionNumber` field in CRUD queries where appropriate.
- [x] 2.3 Verify `crm-leads` tests pass.

## 3. Admissions & Enrollment Bounded Context Updates

- [x] 3.1 Update `LeadConversionOrchestrator` in `packages/admissions-enrollment/src/application/lead-conversion-orchestrator.ts` to save `admissionResult.admissionNumber` to the `Lead` record in the database during the interactive transaction.
- [x] 3.2 Add test cases in `packages/admissions-enrollment/src/application/lead-conversion-orchestrator.test.ts` to assert that the converted lead's `admissionNumber` is populated for both new and existing students.
- [x] 3.3 Verify `admissions-enrollment` tests pass.

## 4. UI & Portal Updates

- [x] 4.1 Update [page.tsx](file:///Users/praveenkumar/Documents/Project/Freelance/ims-v2/apps/admin-portal/app/(protected)/leads/[id]/page.tsx) to query the converted `Admission` by `admissionNumber: lead.admissionNumber` rather than `leadId: leadId`.
- [x] 4.2 Verify waitlist mode (no batch selection) in `convert-lead-wizard.tsx` to ensure pricing options are bypassed and hidden when a batch is not selected.

## 5. FRD Documentation Updates

- [x] 5.1 Update `docs/architecture/frd/Module 03 - Lead & Inquiry Management/Part 4 – Database Entities and CRUD Matrix.md` to list `admission_number` as a nullable varchar field on the `leads` table.
- [x] 5.2 Update `docs/architecture/frd/Module 03 - Lead & Inquiry Management/Part 5 – API Contracts.md` to include `admissionNumber` property in lead schema contracts.

## 6. Verification & System Checks

- [x] 6.1 Run full project typecheck.
- [x] 6.2 Run workspace linter.
- [x] 6.3 Verify all affected unit and integration tests pass.

