---
name: ims-workflow-test-generator
description: Generate IMS unit, application, API, integration, and Playwright end-to-end tests for enrollment, payment, attendance, completion, certificate, walk-in, and RBAC workflows.
---

# IMS Workflow Test Generator

Use this skill when a change needs tests or when you are adding a new IMS workflow.

## Test layers

- Domain tests for invariants and state transitions
- Application tests for authorization, transactions, repository interaction, and event publication
- API tests for validation, auth, and response contracts
- Integration tests for repositories, migrations, and outbox behavior
- E2E tests for the main user flow

## Priorities

Always include tests when the change touches:

- Enrollment
- Finance
- Completion
- Certificate issuance
- RBAC
- Walk-in same-day completion

## Output

Return a compact test plan with:

- scenario name
- setup
- action
- expected result
- failure cases

Prefer the smallest set of tests that still proves the business rule.

