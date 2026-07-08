## Context

Module 09 - Faculty / Trainer Management is documented in the ASTI FRD as the authoritative operational capability for trainer master data, qualifications, availability, course authorization, compensation rates, eligibility checks, and trainer reporting. The repo currently has trainer-facing portal stubs under `/trainer/*` and batch assignment behavior in Training Delivery, but it does not yet have trainer-owned persistence, a dedicated trainer management package, or the admin-portal `/faculty/*` surfaces required by the FRD.

This change is cross-cutting. It affects Identity & Access, branch-scoped authorization, training delivery assignment flows, scheduling availability checks, reporting/export behavior, audit logging, and Prisma persistence. It also introduces sensitive compensation data that must be redacted unless explicit permission is present.

## Goals / Non-Goals

**Goals:**

- Introduce a dedicated Trainer Management domain package with trainer-owned application services, repositories, and persistence.
- Expose Module 09 operational screens and routes under `/faculty/*` in the admin portal.
- Enforce permission-based and branch-scoped authorization for trainer data, including compensation redaction.
- Provide eligibility, availability, authorization, and compensation resolution services to Training Delivery and Scheduling without transferring ownership of those contexts.
- Add trainer operational reports, dashboards, exports, and audit history with the required scope and confidentiality rules.

**Non-Goals:**

- Trainer self-service portal behavior.
- Payroll processing, payslip generation, or payment execution.
- Course creation, batch ownership, scheduling ownership, attendance ownership, or document verification ownership.
- Introducing a broker, Redis queue, microservice split, or event sourcing.

## Decisions

### 1. Create a dedicated `packages/trainer-management` module

Trainer master data needs its own bounded context and public API surface. A dedicated package keeps domain logic, application services, repository interfaces, and infrastructure adapters together without leaking into Training Delivery or IAM.

**Alternatives considered:** Extending Training Delivery or reusing batch assignment tables as the primary trainer model. Rejected because the FRD treats trainer master data as its own operational capability and because assignment ownership must stay in Training Delivery.

### 2. Use `/faculty/*` as the admin portal surface

The FRD and permission matrix define a Faculty menu and `/faculty/*` routes. This keeps trainer administration distinct from the future trainer self-service portal and avoids mixing admin and learner experiences.

**Alternatives considered:** Reusing the existing `/trainer/*` routes. Rejected because the current trainer portal is explicitly out of scope for this change and does not satisfy the Module 09 admin-portal contract.

### 3. Keep Person identity canonical and trainer-owned fields separate

Trainer records must reference shared Person data rather than duplicate editable identity fields. Trainer-owned data should only contain operational trainer attributes such as type, status, specialization, qualifications, availability, authorizations, and compensation rates.

**Alternatives considered:** Copying name, phone, or identity fields into trainer tables. Rejected because it creates drift and violates ownership boundaries.

### 4. Model trainer master data with effective dating, soft delete, and optimistic concurrency

Trainer status, availability, authorizations, and compensation all depend on historical correctness. Effective dates, soft delete, and version checks make those workflows auditable and safe under concurrent updates.

**Alternatives considered:** Hard deletes and last-write-wins updates. Rejected because they would break auditability and create hidden history loss.

### 5. Expose eligibility and rate resolution as internal service contracts

Scheduling and Training Delivery need deterministic read-side decisions, not ownership of trainer master data. Internal contracts let those contexts validate assignments without mutating trainer records.

**Alternatives considered:** Direct cross-context table joins in write paths. Rejected because they break bounded-context ownership and make branch scoping harder to enforce.

### 6. Redact compensation data by default

Compensation is sensitive and must not flow through generic trainer views, exports, or dashboard cards without explicit permission. The default read model should omit compensation fields unless the caller has both the permission and scope required by the FRD.

**Alternatives considered:** Returning compensation fields and hiding them in the UI only. Rejected because UI hiding is not authorization.

### 7. Use audit records and outbox events for sensitive trainer changes

Status changes, qualifications, authorizations, availability, and compensation mutations must be auditable. Outbox emission supports downstream reporting and notifications without coupling those side effects to the write path.

**Alternatives considered:** Inline notification delivery from route handlers. Rejected because side effects need transactional reliability and clear ownership.

## Risks / Trade-offs

- [Risk] The new module may overlap with existing `/trainer/*` portal stubs and create route confusion. -> [Mitigation] Keep this change focused on `/faculty/*` admin surfaces and treat `/trainer/*` as separate future work.
- [Risk] Trainer compensation leakage through reports or exports. -> [Mitigation] Enforce field-level redaction in the application layer and verify export tests for unauthorized users.
- [Risk] Cross-context reads may become fragile if implemented with ad hoc joins. -> [Mitigation] Use explicit service contracts and read models for eligibility, assignment references, and reporting projections.
- [Risk] Persistence changes may require several coordinated migrations. -> [Mitigation] Add trainer tables and indexes in one migration set, keep compatibility fields isolated, and document rollback steps for each new table.
- [Risk] Availability and authorization overlap rules are easy to implement inconsistently. -> [Mitigation] Centralize the validation rules in domain/application services and reuse them from API routes and internal contracts.

## Migration Plan

1. Add Prisma models and migrations for trainer-owned tables and indexes.
2. Introduce the `packages/trainer-management` package with repository interfaces, domain entities, and application services.
3. Seed new `trainer.*` and `menu.faculty*` permissions in IAM and wire them into navigation and route guards.
4. Add `/faculty/*` admin-portal routes and replace trainer-management entry points with the new module screens.
5. Add internal eligibility and rate-resolution contracts for Scheduling and Training Delivery.
6. Add report projections, exports, audit logging, and outbox publication for sensitive trainer changes.
7. Backfill only compatibility data needed for read paths; do not migrate ownership away from existing contexts.

Rollback strategy:

- Disable the new faculty routes and permission entries if deployment issues appear.
- Keep the new trainer tables additive so they can be left unused if a rollback is needed.
- Revert the package and route wiring before removing compatibility data or existing batch assignment references.

## Open Questions

- Should the existing `/trainer/*` portal be redirected, hidden, or left untouched until a future trainer self-service change is delivered?
- What numbering format should be used for trainer codes in the first production migration?
- Do any existing batch or session references need a one-time compatibility backfill to point at the new trainer profile identity?
- Which reports, if any, must be enabled on day one for non-superadmin roles beyond the FRD defaults?
