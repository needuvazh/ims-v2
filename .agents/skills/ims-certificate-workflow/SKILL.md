---
name: ims-certificate-workflow
description: Design IMS certificate eligibility, generation, issuance, verification, template, and audit behavior. Use for course completion, walk-in completion, and public certificate verification flows.
---

# IMS Certificate Workflow

Use this skill when a change affects certificate eligibility or issuance.

## What to decide

1. How eligibility is computed.
2. Which completion, attendance, exam, payment, or manual-approval inputs matter.
3. Whether the flow is regular, corporate, or walk-in.
4. How the certificate number, template, storage, and verification log are handled.

## Rules

- Certificate issuance requires eligibility validation.
- Walk-in certificates must use the shared Enrollment lifecycle.
- Public verification should rely on a stable certificate identifier and verification log.
- Keep certificate generation behind an application service.
- Treat certificate changes as auditable and test-heavy.

## Output

Return:

- eligibility rule
- generation step
- verification behavior
- storage/file handling note
- audit event
- tests for eligible, ineligible, and already-issued cases

