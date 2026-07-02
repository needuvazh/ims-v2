## Why

Admission and enrollment flows depend on document evidence, but those checks need to stay visible and testable on their own. Separating document management makes it possible to validate upload, verification, and approval gating without mixing them into the rest of Module 04.

## What Changes

- Define the Prisma schema for the Documents context to store document metadata, verification status, and history.
- Update the Lead Conversion Handoff workflow to persist document links provided during lead capture to the Documents context.
- Define document capture, visibility, and verification gating for admissions and enrollment workflows.
- Keep the Documents context as the owner of document entities and verification state.
- Add explicit admin-portal review behavior for document-dependent admission and enrollment actions.
- Preserve branch-scoped authorization and audit logging for document-related actions.

## Capabilities

### New Capabilities

- `document-management`: database models, document upload, verification workflows, and gating rules for admission and enrollment.

### Modified Capabilities

- `crm-core-models-apis`: lead conversion preconditions now hand off and persist document links into the Documents context.

## Impact

Affected areas include the database schema (Prisma migrations), the admin portal admission and enrollment screens, crm-leads conversion orchestrator, document-linked workflow checks, Documents context integration, audit logging, and tests for document gating behavior.
