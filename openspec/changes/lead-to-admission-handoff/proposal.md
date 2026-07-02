## Why

CRM lead conversion is a separate business step from admission and must stay clearly bounded. A dedicated change makes the lead handoff into admissions easier to validate and keeps CRM from owning the learner lifecycle.

## What Changes

- Define the CRM-to-admissions handoff behavior.
- Reuse or create the person and student profile during conversion.
- Preserve downstream follow-up cancellation and outbox events.

## Capabilities

### New Capabilities

- `lead-to-admission-handoff`: convert a qualified lead into the admissions pipeline.

### Modified Capabilities

- `crm-core-models-apis`: lead conversion requirements now point to the new admissions handoff behavior.

## Impact

Affected areas include CRM conversion routes, admissions application services, outbox events, and tests.
