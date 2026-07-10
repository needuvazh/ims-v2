## Why

During lead-to-student conversion, we identified several gaps and areas of improvement:
1. **Rollback Verification:** We need to ensure that the entire multi-context lead conversion flow (CRM, Student Profile, Admission, Documents, Enrollment) runs within a single transaction so that database integrity is preserved on any failure.
2. **Optional Batch Selection & Payment Display:** Handoff (lead conversion) does not require selecting a batch (waitlist mode is supported). If no batch is selected, billing/invoice setup and manual discount options are irrelevant during conversion and should be hidden.
3. **Attribution & Admission Linking:** 
   * Currently, the page queries the converted student's `Admission` record by searching `where: { leadId: lead.id }`.
   * For new students, this works since a new `Admission` record is spawned with `leadId`.
   * For existing students, the orchestrator reuses their existing student profile and active admission, leaving the original admission's `leadId` pointing to their original acquisition lead. The query returns null, resulting in the message: *"No admission record has been initialized for this lead."*
   * Storing the `admissionNumber` directly on the `Lead` model upon conversion maps any lead to its resulting student record without breaking original attribution mappings on the `Admission.leadId` side.

## What Changes

1. **Prisma Schema Update:** Add a nullable `admissionNumber` field to the `Lead` model in `schema.prisma`.
2. **CRM Domain Update:** Add `admissionNumber` to `LeadSchema` in `crm-leads` package.
3. **Application Orchestration Update:** Update `LeadConversionOrchestrator` to populate the `admissionNumber` field on the converted lead when conversion succeeds.
4. **UI Query updates:** Adjust the Lead Details client page to fetch admission details using the explicit `lead.admissionNumber` field instead of searching `where: { leadId }` on the `Admission` table.
5. **Handoff Batch Selection:** Re-verify that waitlist mode correctly renders without billing/pricing overrides.

## Capabilities

### Modified Capabilities
- `lead-to-admission-handoff`: Enhance handoff to persist the converted student's admission number on the lead, and ensure waitlist mode defaults are correctly handled in the wizard UI.
- `crm-core-models-apis`: Modify Lead model schema to include the nullable `admissionNumber` field.

## Impact

* **Bounded Contexts:** CRM & Leads (owning context for Lead), Admission & Enrollment (owning context for Admission/Enrollment).
* **Database:** Migration to add `admissionNumber` to `leads` table.
* **APIs:** The GET lead endpoints will return `admissionNumber`.
* **UI:** Converted leads for existing students will now correctly show their reused admission number.
* **Documentation (FRD):** Update the CRM Bounded Context FRD files to document the new `admissionNumber` field in lead schemas and databases, and clarify waitlist-mode behavior.

