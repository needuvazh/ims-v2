## 1. Institute Domain and Validation

- [ ] 1.1 Align the institute aggregate, status model, and Zod schemas with FRD Module 2.1.
- [ ] 1.2 Enforce mandatory institute fields, unique institute code, and validation for contact and localization data.
- [ ] 1.3 Preserve archive-only retirement behavior and block physical deletion of institute records.

## 2. Application and Delivery

- [ ] 2.1 Implement or align institute create, update, activate, suspend, archive, and read flows in the organization service layer.
- [ ] 2.2 Add or update server-side authorization checks for institute actions and read-only branch-manager visibility.
- [ ] 2.3 Wire the admin portal institute pages and actions to the approved organization service contracts.

## 3. Audit and Persistence

- [ ] 3.1 Record immutable audit entries for institute creation, updates, activation, suspension, and archive events.
- [ ] 3.2 Update persistence mappings or migrations only if required by missing institute fields or status handling.

## 4. Tests and Verification

- [ ] 4.1 Add unit tests for institute validation, uniqueness, and lifecycle transitions.
- [ ] 4.2 Add service/API tests for authorization, audit logging, and error mapping.
- [ ] 4.3 Run targeted verification: typecheck, lint, and the organization/admin-portal test suites.
