## Context

FR-SCH-001 currently describes a branch-owned business calendar, but the new product direction is an institute-owned calendar with branch/year overrides for exceptions. The codebase already has a branch setting placeholder (`workingCalendar`), but it does not model the calendar lifecycle, holidays, or scheduling resolution rules needed by Scheduling.

This change sits in the Scheduling bounded context and affects Organization only at the boundary where branch metadata is stored. Scheduling remains the owner of calendar rules, conflict validation, and holiday resolution.

## Goals / Non-Goals

**Goals:**
- Establish one canonical institute business calendar as the default scheduling source.
- Support sparse branch/year overrides without duplicating the full calendar.
- Preserve branch-scoped authorization, auditability, and optimistic locking.
- Make session validation resolve calendar rules deterministically.
- Keep timezone normalization fixed to `Asia/Muscat`.

**Non-Goals:**
- Rebuilding organization branch management.
- Adding external calendar providers, brokers, CQRS, or event sourcing.
- Supporting arbitrary timezone overrides at branch level.
- Introducing a separate calendar per branch as the main model.

## Decisions

### 1. Calendar ownership stays in Scheduling
The institute business calendar and branch overrides are owned by the Scheduling context, not Organization.

Why:
- The calendar controls session validation, holiday blocking, and timetable behavior.
- Keeping ownership in Scheduling prevents Organization from becoming a dumping ground for workflow rules.

Alternatives considered:
- Put the calendar under Organization as branch metadata. Rejected because it mixes structural branch data with scheduling policy and makes validation rules harder to evolve.
- Keep branch-owned calendars. Rejected because it duplicates calendars per branch/year and creates drift.

### 2. Use a base calendar plus sparse override records
Model the calendar as:
- a canonical institute calendar
- a branch/year override record containing only changed fields

Why:
- Minimal duplication.
- Easy to explain precedence.
- Branch exceptions stay local while the institute default remains authoritative.

Alternatives considered:
- Full branch/year snapshot copy. Rejected because it multiplies update burden and audit noise.
- Pure inheritance without stored overrides. Rejected because scheduling needs explicit auditable exceptions.

### 3. Resolve calendar rules in application services, not in route handlers
Add a calendar resolution service in Scheduling that returns a resolved view for a given institute, branch, and year.

Why:
- Route handlers should stay thin.
- The resolution rule is domain behavior and must be testable independently.
- Session validation, holiday checks, and reporting should use the same resolved view.

Alternatives considered:
- Recompute precedence inline in each API. Rejected because it would scatter business rules.

### 4. Keep branch/year overrides narrow
Allow overrides for operating days, working hours, and branch-specific closure/holiday entries. Do not allow branch-level timezone changes.

Why:
- Timezone is an institute-level normalization rule for the whole product.
- Narrow overrides reduce the risk of accidental policy divergence across branches.

Alternatives considered:
- Allow any field override. Rejected because it weakens guarantees and complicates validation.

### 5. Migrate the existing `workingCalendar` branch setting into the new model
Treat the current Organization `workingCalendar` string as a legacy placeholder, not the long-term source of truth.

Why:
- The current field cannot express lifecycle, holidays, or per-year override behavior.
- Leaving it as the primary driver would preserve the wrong abstraction.

Alternatives considered:
- Keep the field and add more branch settings around it. Rejected because it would still be opaque and insufficient for validation.

## Risks / Trade-offs

- [Risk] Existing branch-setting consumers may still read `workingCalendar` as authoritative. → Mitigation: introduce a migration path and clearly document the new Scheduling-owned source of truth.
- [Risk] Override precedence bugs could make sessions appear valid in one place and invalid in another. → Mitigation: centralize resolution in one service and add unit tests around precedence order.
- [Risk] Calendar data can become hard to reason about if overrides are too expressive. → Mitigation: keep the override shape sparse and enforce field-level restrictions.
- [Risk] Migrating legacy calendar references may temporarily create confusion for admins. → Mitigation: surface resolved calendar provenance in reads so users can see inherited versus overridden values.

## Migration Plan

1. Introduce the Scheduling-owned calendar model alongside the existing branch setting placeholder.
2. Create a one-time migration path that maps any legacy `workingCalendar` references into the new canonical institute calendar where possible.
3. Update validation services to read from the new resolved calendar view.
4. Keep the legacy branch setting as a non-authoritative compatibility field until all reads are moved.
5. Once scheduling reads are fully migrated, deprecate and remove any UI or service dependency on the legacy placeholder.

Rollback strategy:
- If the new model creates issues, revert validation reads to the legacy placeholder temporarily while preserving the new tables and audit history.
- Do not delete migrated calendar records unless the migration is proven safe.

## Open Questions

Resolved decisions:

- Institute calendars SHALL be effective-date-scoped at the persistence layer, with `year` kept as a derived/indexed lookup field.
- Branch overrides SHALL be allowed to add branch-specific holidays/closures as additive exceptions, but they SHALL NOT remove or rewrite institute-wide holidays.
- The admin UI SHOULD show a merged resolved calendar by default, with provenance markers for inherited versus overridden values.
- Any existing `BranchSettings.workingCalendar` value that cannot be mapped cleanly SHALL be treated as deprecated non-authoritative metadata and kept only for manual review.
