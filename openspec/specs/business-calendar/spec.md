# business-calendar Specification

## Purpose

TBD - created by archiving change implement-module-07-scheduling. Update Purpose after archive.

## Requirements

### Requirement: Institute Business Calendar Setup

The system SHALL allow Super Admins to create and maintain a global institute business calendar defining standard operating days and working hours.

#### Scenario: Successful global calendar creation

- **WHEN** a Super Admin provides a valid year, name, operating days map, and working hours
- **THEN** the system SHALL persist the BusinessCalendar record in Draft status with version 1

### Requirement: Branch Calendar Override

The system SHALL allow Branch Managers to create branch-specific overrides for a business calendar to account for local operating differences.

#### Scenario: Branch-specific weekend override

- **WHEN** a Branch Manager modifies the operating days for their assigned branch for the year 2026
- **THEN** the system SHALL create a BranchCalendarOverride record linked to the institute calendar for that branch and year

### Requirement: Calendar Operating Window Validation

The system SHALL prevent scheduling sessions on dates or times that fall outside the resolved operating window (Institute Calendar + Branch Override).

#### Scenario: Scheduling on a closed day

- **WHEN** a coordinator attempts to schedule a session on a Friday for a branch where Friday is marked as "Closed" in the override
- **THEN** the system SHALL reject the request with a `CALENDAR_CLOSED` domain error
