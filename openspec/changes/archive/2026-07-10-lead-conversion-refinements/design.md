## Context

Currently, when a Lead is converted to a Student via `LeadConversionOrchestrator`, it:
1. Marks the Lead stage as `Won` then `Converted`.
2. Creates or reuses a Student Profile and Admission record.
3. Creates a Draft Enrollment.

However, the parent Lead details page (`page.tsx`) queries the `Admission` record directly using `where: { leadId }` to show the converted admission details. This means:
* For existing students whose profiles/admissions are reused, the existing `Admission.leadId` remains set to their original lead (or null).
* Therefore, the lead details page for subsequent inquiry conversions fails to show any linked admission details, showing: *"No admission record has been initialized for this lead."*

To resolve this without altering the historical attribution stored in `Admission.leadId` (which points to the student's *original* lead), we will store `admissionNumber` directly on the converted `Lead` model.

## Goals / Non-Goals

**Goals:**
* Ensure converted leads for both new and existing students link accurately to their resulting student admission registry.
* Maintain the single-transaction rollback safety of the lead conversion flow.
* Keep batch selection optional for waitlist mode and ensure pricing overrides/discounts are dynamically handled.

**Non-Goals:**
* Modifying the `leadId` column on existing `Admission` records.
* Capturing payments or invoices during the conversion wizard itself.

## Decisions

1. **Schema Change:** Add a nullable `admissionNumber String? @db.VarChar(50)` field on the `Lead` model in `schema.prisma`.
2. **Orchestrator Update:** In `LeadConversionOrchestrator.convertLeadToAdmission`, inside the interactive transaction, write `admissionResult.admissionNumber` to the converted Lead.
3. **Domain Schema & Model Sync:**
   - Update `LeadSchema` in `packages/crm-leads/src/domain/lead.ts` to include `admissionNumber: z.string().nullable().optional()`.
   - Update `lead-repository.ts` to retrieve and write `admissionNumber` where relevant (e.g. mapping fields, select query blocks).
4. **UI Query Modification:** In `apps/admin-portal/app/(protected)/leads/[id]/page.tsx`, retrieve admission details using the explicit `lead.admissionNumber` field:
   ```typescript
   const dbAdmission = lead.admissionNumber ? await prisma.admission.findUnique({
     where: { admissionNumber: lead.admissionNumber },
   }) : null;
   ```
   This is extremely clean and matches exactly.
5. **FRD Documentation Updates:**
   - Update `docs/architecture/frd/Module 03 - Lead & Inquiry Management/Part 4 – Database Entities and CRUD Matrix.md` to document the new `admission_number` nullable field on the `leads` table.
   - Update `docs/architecture/frd/Module 03 - Lead & Inquiry Management/Part 5 – API Contracts.md` to include `admissionNumber` in the Lead DTO schema payloads.


## Risks / Trade-offs

* **Redundancy:** Storing `admissionNumber` on both tables. However, this is a read-only reference copy that maps the terminal conversion outcome. Since `admissionNumber` is immutable once generated, there is no risk of sync drift.
* **Migration required:** We will create a Prisma migration to add the `admissionNumber` column to the `leads` table.
