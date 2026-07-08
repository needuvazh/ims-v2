# Scheduling Dashboard & Navigation Specification

## Purpose

Provides a dedicated top-level Scheduling menu and submenus in the administration portal navigation structure, and a unified, branch-scoped Scheduling Dashboard displaying stats, calendars, active venue blocks, unresolved conflicts, and quick actions.

## Requirements

### Requirement: Dedicated Navigation Menu

The system SHALL provide a dedicated top-level "Scheduling" menu under the "Operations" category in the admin portal sidebar navigation, separating scheduling from training delivery.

#### Scenario: Displaying scheduling submenus

- **WHEN** an administrator logs in with the appropriate scheduling permissions
- **THEN** the system SHALL display a "Scheduling" navigation group containing:
  - Scheduling Dashboard (`/scheduling`)
  - Calendar (`/scheduling/calendars`)
  - Venue Management (`/scheduling/venues`)
  - Conflict Dashboard (`/scheduling/conflicts`)

---

### Requirement: Unified Scheduling Dashboard

The system SHALL display a unified scheduling overview page at `/scheduling` that presents real-time data summaries and recent records to authorized users.

#### Scenario: Viewing dashboard statistics and records

- **WHEN** an authorized user opens the Scheduling Dashboard
- **THEN** the system SHALL load and display:
  - Metric cards showing the counts of Total Calendars, Active Calendars, Active Venue Blocks, and Unresolved Conflicts (highlighted with alert styling if > 0).
  - A list of up to 5 recently updated Baseline Calendars.
  - A list of up to 5 active or upcoming Venue Blocks.
  - A list of up to 5 unresolved Scheduling Conflicts.
  - Quick action links for creating calendars, managing venues, and resolving conflicts.

---

### Requirement: Permission-based Section Display

The system SHALL dynamically show or hide dashboard sections and action items based on the user's specific permissions.

#### Scenario: User lacks venue block permissions

- **WHEN** a user with `scheduling.calendar.read` but without `scheduling.venueBlock.read` or `schedule.manage` views the dashboard
- **THEN** the system SHALL display the calendars section and stats but SHALL NOT display the venue blocks list or quick action link.
