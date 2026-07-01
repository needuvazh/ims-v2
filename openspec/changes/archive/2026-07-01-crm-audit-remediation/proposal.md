## Why

An architectural audit of the CRM module against the DDD and FRD documentation revealed two critical gaps that must be addressed before the module can be considered 100% complete and compliant:
1. **Event Name Mismatch**: The implementation uses `LeadConvertedToAdmission` instead of the `LeadConverted` name defined in the overarching DDD Context Map.
2. **Missing Overdue Follow-ups Background Job**: The `followup-repository.ts` has the capability to query overdue follow-ups (`findAllScheduledOverdue`), but there is no application service or background worker actively invoking this to satisfy FR-LEAD-012.

Auto-assignment (FR-LEAD-009) is being explicitly deferred to Phase 2.

## What Changes

1. **Rename Event**: The `LeadConvertedToAdmission` domain event will be renamed to `LeadConverted` across the `crm-leads` and `admissions-enrollment` packages to strictly enforce Ubiquitous Language.
2. **Overdue Follow-up Worker**: A background worker (or scheduled application service method) will be introduced in `crm-leads` to query `findAllScheduledOverdue` daily and generate appropriate notifications/updates.

## Capabilities

### New Capabilities
- `crm-audit-remediation`: Remediation of CRM architectural audit findings, specifically the Domain Event name sync and Overdue Follow-ups background worker.

### Modified Capabilities

## Impact

- **Bounded Contexts**: `crm-leads` and `admissions-enrollment`.
- **Event Catalog**: Modifies `LeadConvertedToAdmission` -> `LeadConverted`.
- **Infrastructure**: Requires scheduling a daily background job for follow-ups.
- **Audit Impact**: Background job actions must run as system-level execution, properly handling branch scopes or running globally.
