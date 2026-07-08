## Why

The Institute currently lacks a centralized scheduling engine to prevent operational conflicts. This results in manual coordination for classroom and trainer allocation, leading to double-booking risks, scheduling on public holidays, and wasted venue capacity. Establishing this module now is critical to unlock automated attendance tracking and reliable training delivery planning across branches.

## What Changes

- **Business Calendar & Overrides**: Implement institute-level business calendars with branch-year overrides for operating days and working hours.
- **Holiday Management**: Centralized management of public holidays and branch closures to block scheduling.
- **Venue Block Management**: Introduce "Hard Blocks" for classrooms (e.g., maintenance, external events) to prevent bookings while allowing the session to be moved to an alternative venue.
- **Conflict Detection Engine**: A centralized service to validate sessions against holidays, venue blocks, trainer availability, classroom occupancy, and branch operating hours.
- **Conflict Dashboard**: A dedicated view for Academic Coordinators to resolve "Post-Facto" conflicts (e.g., a holiday declared after sessions were already scheduled) through a Reschedule/Change Venue/Cancel workflow.
- **Smart Recurrence Logic**: Bulk session generation for batches will automatically skip holidays and non-working days during initial creation.
- **Branch-Scoped Isolation**: Strict server-side isolation ensuring coordinators only see and manage schedules for their assigned branches.

## Capabilities

### New Capabilities

- `business-calendar`: Management of institute operating days, working hours, and branch-specific yearly overrides.
- `holiday-management`: Definition and lifecycle of public and special holidays that block training activity.
- `venue-blocking`: Operational time-blocking for specific classrooms or entire branches (Maintenance, Private Bookings).
- `timetable-scheduling`: Single and bulk recurring session scheduling with real-time conflict interception.
- `conflict-dashboard`: Orchestration of conflict resolution for sessions invalidated by external calendar changes.

### Modified Capabilities

- `batch-delivery`: Integrate with the Scheduling Service to replace local trainer overlap checks with a comprehensive multi-constraint validation.

## Impact

- **Packages**: New `scheduling` package logic; enhancements to `training-delivery` (Batch/Session) to consume scheduling validations.
- **Database**: New tables for `VenueBlock`, `ScheduleSession` (or extension of `Session`), and `BusinessCalendar` overrides.
- **API**: New route handlers in `admin-portal` for calendar configuration and the Conflict Dashboard.
- **Downstream**: Attendance sessions will now be reliably derived from `Published` schedule sessions only.
