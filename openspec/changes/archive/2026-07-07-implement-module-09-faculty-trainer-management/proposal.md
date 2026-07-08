## Why

ASTI IMS needs Module 09 to manage trainer master data, qualifications, availability, course authorization, and operational reporting as a first-class bounded context. The repo already has reusable IAM, Person, Document, Scheduling, Audit, and Reporting patterns, but no trainer-specific capability exists yet, so trainer administration is currently fragmented across adjacent workflows.

## What Changes

- Add a dedicated Faculty / Trainer Management capability for the admin portal first, covering trainer directory, trainer profile lifecycle, controlled status transitions, qualifications, availability, course authorization, compensation-rate configuration, eligibility lookup, assignment references, reports, dashboard widgets, and audit history.
- Reuse the canonical Person/Party model for trainer identity linkage. Trainer records must not duplicate editable Person-owned data.
- Add trainer-owned persistence and service boundaries for `TrainerProfile`, `TrainerQualification`, `TrainerAvailability`, `TrainerCourseAuthorization`, and `TrainerCompensationRate`.
- Add branch-scoped search, read, and mutation behavior for trainer operations, with server-side permission checks and audit logging on sensitive changes.
- Add restricted compensation visibility and export handling so compensation data is never exposed through generic trainer views.
- Add admin portal surfaces under `/faculty/*` only. Trainer portal, student portal, and public verification changes are out of scope for this change and remain future work.
- Integrate trainer eligibility checks with existing Scheduling and Training Delivery read paths without moving assignment ownership out of those contexts.
- Align trainer reporting and dashboard behavior with the operational trainer KPIs defined in the FRD, while keeping enterprise analytics ownership in Reporting & Executive Dashboards.

## Capabilities

### New Capabilities

- `faculty-trainer-management`: End-to-end admin-portal trainer management covering directory, profile, status, qualifications, availability, authorization, compensation, eligibility, assignment references, reports, dashboard, and audit workflows.

### Modified Capabilities

- `identity-access`: Add trainer-specific permissions, menu visibility, and server-side authorization hooks needed to protect Module 09 routes and actions.
- `permissions-and-branch-scope`: Extend branch-scope rules to trainer-owned records, branch-restricted trainer search, and compensation confidentiality checks.
- `reports-dashboards`: Add trainer operational dashboards, report read models, export behavior, and branch-scoped KPI surfaces.

## Impact

- Owning bounded context: Faculty / Trainer Management.
- Affected upstream/downstream contexts: Identity & Access, Organization, Course Catalog, Training Delivery, Scheduling, Document Management, Reporting & Executive Dashboards, Audit & Compliance.
- Affected code: new trainer domain/application/infrastructure package, new admin portal `/faculty/*` routes and components, shared permission constants, branch-scope checks, audit logging, and export/report wiring.
- Database impact: Prisma schema changes and migrations are required for trainer entities, soft delete, effective dating, versioning, indexes, uniqueness rules, and overlap-prevention constraints.
- Authorization impact: all trainer reads and writes require permission-based authorization and branch-scoped server checks; role names must not be used as business logic.
- Audit impact: sensitive trainer status, qualification, authorization, compensation, and deletion workflows must write immutable audit records.
- Event/outbox impact: trainer lifecycle and configuration changes should emit in-process domain events and outbox records where downstream consumers require reliable side effects.
- NFR impact: the change must preserve multilingual UI behavior, desktop-dense admin layouts, compensation confidentiality, report/export safety, observability, and branch isolation.
- Test impact: add domain, repository, API, UI, branch-isolation, audit, export, compensation-redaction, and scheduling-integration tests for the new module.
