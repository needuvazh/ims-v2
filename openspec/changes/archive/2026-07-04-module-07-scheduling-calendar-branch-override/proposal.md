## Why

ASTI needs one canonical business calendar for the institute, but some branches will need year-specific deviations without duplicating the full calendar model. The current FRD assumes branch-owned calendars per year; this change resolves that mismatch by introducing an institute-level calendar with branch/year overrides for exceptions.

## What Changes

- Introduce an institute-owned business calendar as the default source of working days, working hours, and holiday rules.
- Add branch/year override capability for branch-specific calendar deviations.
- Preserve branch scope and audit requirements for all calendar changes.
- Update scheduling validation to resolve calendar rules through institute default first, then branch/year override.
- Keep timezone normalization fixed to `Asia/Muscat`.
- **BREAKING** Replace the branch-calendar-per-year assumption in the scheduling calendar model.

## Capabilities

### New Capabilities

- `business-calendar`: Institute calendar management with branch/year override rules, lifecycle, and scheduling resolution behavior.

### Modified Capabilities

- None.

## Impact

- Scheduling domain and APIs need a new calendar aggregate and override resolution path.
- Organization data model may need to demote or replace the existing `workingCalendar` branch setting.
- Admin portal flows for calendar setup, holiday management, and branch override editing need to reflect institute-default plus branch override behavior.
- Scheduling conflict validation, holiday checks, and working-hour checks must use the resolved calendar view.
- Audit logging is required for institute calendar changes and branch override changes.
- Reporting and timetable reads must surface whether a rule came from the institute default or a branch/year override.
