## Why

CRM lead conversion requirements changed because the admission handoff now creates or reuses `StudentProfile` and `Admission` instead of the legacy student flow. Keeping that change separate prevents CRM requirements from drifting back to the old model.

## What Changes

- Update lead conversion requirements to reference the admissions handoff.
- Remove legacy student creation language from the CRM spec.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `crm-core-models-apis`: lead conversion behavior now references the decoupled Admissions handoff flow (creating/reusing `StudentProfile` and `Admission` without direct upstream package dependencies).

## Impact

Affected areas include CRM requirements, conversion routes, admissions handoff behavior, and tests.
