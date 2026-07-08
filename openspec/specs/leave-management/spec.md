# Leave & Time-Off Management Specification

## Purpose

The system SHALL support tracking leaves and temporary unavailability for all personnel (trainers, coordinators, branch managers, accountants, and other staff members) to ensure correct scheduling, task allocation, and operational visibility.

---

## Requirements

### Requirement: Leave Request Submission

Any staff member (represented by a `Person`) SHALL be able to submit a leave request for single-day, multi-day, or partial-day (hourly) time-off.

#### Scenario: Full-day vacation request
- **WHEN** a staff member submits a leave request from `2026-08-01` to `2026-08-10` marked as `isFullDay`
- **THEN** the system SHALL create a `LeaveRequest` record with status `Pending`

#### Scenario: Partial-day (hourly) sick leave request
- **WHEN** a staff member submits a leave request for `2026-07-08` from `09:00` to `12:00` with `isFullDay` set to `false`
- **THEN** the system SHALL validate that `startTime` is before `endTime` and create a `LeaveRequest` record with status `Pending`

---

### Requirement: Leave Request Approval Workflow

A manager or authorized user SHALL be able to approve or reject a pending leave request.

#### Scenario: Approved leave request
- **WHEN** an administrator approves a `Pending` leave request
- **THEN** the system SHALL update the request status to `Approved` and record the approver's `personId` and timestamp

---

### Requirement: Integration with Trainer Eligibility

The system SHALL prevent trainers on approved leave from being resolved as eligible during training slot searches.

#### Scenario: Trainer searching during approved leave
- **GIVEN** Trainer A has an `Approved` leave request for `2026-07-08` from `09:00` to `12:00`
- **WHEN** a coordinator searches for eligible trainers on `2026-07-08` for a session starting at `10:00` and ending at `11:30`
- **THEN** the system SHALL mark Trainer A as ineligible with the reason code `TRAINER_NOT_AVAILABLE`

---

### Requirement: Integration with Scheduling Conflict Engine

The system SHALL flag conflict warnings when scheduling or modifying sessions for trainers during their approved leave periods.

#### Scenario: Scheduling session during trainer leave
- **GIVEN** Trainer B has an `Approved` leave request for `2026-07-08` (full day)
- **WHEN** a scheduler attempts to schedule a session for Trainer B on `2026-07-08`
- **THEN** the Conflict Engine SHALL raise a conflict of type `TRAINER_UNAVAILABLE` with severity `CRITICAL`
