## 1. Workflow

- [x] 1.1 Implement the lead conversion handoff service.
- [x] 1.2 Reuse or create person and student profile records safely.
- [x] 1.3 Validate minimum age invariant (at least 12 years) and throw `ERR_ADM_AGE_LIMIT` on failure.

## 2. UI and API

- [x] 2.1 Update the CRM conversion route and response contract.
- [x] 2.2 Preserve outbox publication for all required events (LeadWon, LeadConverted, AdmissionCreated, StudentProfileCreated).
- [x] 2.3 Enforce counselor branch scoping check in `convertLeadAction` Server Action using `assertBranchScope(lead.branchId)`.

## 3. Tests

- [x] 3.1 Add tests for duplicate reuse, active admission conflicts, and conversion success.
- [x] 3.2 Add API tests and run verification commands.
- [x] 3.3 Add unit and integration tests for the age limit checks (under 12 vs equal/over 12) and branch scope authorization violations.

