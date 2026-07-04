# attendance-management Specification

## Purpose
Manual attendance management for ASTI training sessions, including roster generation from enrollments, attendance marking, submission, lock/reopen controls, corrections, low-attendance detection, and branch-scoped reporting.

## Requirements

## ADDED Requirements

### Requirement: Attendance session lifecycle
The system SHALL allow authorized users to create or open an attendance session from an existing delivery session and SHALL persist branch-scoped session metadata, status, timestamps, and audit fields.

#### Scenario: Open attendance session from delivery session
- **WHEN** an authorized user opens attendance for a published delivery session in their assigned branch
- **THEN** the system SHALL create or return a single attendance session for that source session
- **AND** the attendance session SHALL store the batch reference, branch reference, attendance date, session reference, creator, and initial status

#### Scenario: Reject cross-branch attendance session creation
- **WHEN** a user attempts to open attendance for a session outside their authorized branch scope
- **THEN** the system SHALL reject the request with a branch access error

### Requirement: Attendance roster generation from enrollment
The system SHALL generate one attendance record per eligible active enrollment in the session batch and SHALL prevent duplicate records for the same attendance session and enrollment pair.

#### Scenario: Generate roster from eligible enrollments
- **WHEN** a trainer or coordinator generates the attendance roster for an attendance session
- **THEN** the system SHALL create one unmarked attendance record for each active enrollment in the batch
- **AND** the system SHALL populate the student profile reference, enrollment reference, branch reference, and default attendance status

#### Scenario: Prevent duplicate roster rows
- **WHEN** roster generation is executed more than once for the same attendance session
- **THEN** the system SHALL not create duplicate attendance records for any enrollment already present in that session

### Requirement: Manual attendance marking and draft save
The system SHALL allow authorized users to mark attendance manually for eligible records and save intermediate draft changes before final submission.

#### Scenario: Save draft attendance changes
- **WHEN** an authorized trainer updates multiple attendance records and saves the changes as draft
- **THEN** the system SHALL persist the updated record statuses and remarks
- **AND** the session SHALL remain editable while it is not locked

#### Scenario: Reject invalid attendance status input
- **WHEN** a record is submitted with a status outside the allowed attendance status set
- **THEN** the system SHALL reject the change with a validation error

### Requirement: Attendance submission, lock, and reopen
The system SHALL support attendance submission, lock, and reopen workflows with server-side authorization, reason capture, and audit logging.

#### Scenario: Submit completed attendance session
- **WHEN** the user submits an attendance session with no remaining unmarked mandatory records
- **THEN** the system SHALL mark the attendance session as submitted
- **AND** the system SHALL record the submission timestamp and audit entry

#### Scenario: Block direct edits to locked attendance session
- **WHEN** a user attempts to edit a locked attendance session directly
- **THEN** the system SHALL reject the request and require the correction workflow or reopen permission

#### Scenario: Reopen locked attendance session
- **WHEN** an authorized user reopens a locked attendance session with a reason
- **THEN** the system SHALL unlock the session, persist the reopen reason, and record the audit trail

### Requirement: Attendance correction workflow
The system SHALL support correction requests, approvals, and rejections against submitted or locked attendance records while preserving the prior official value in audit history.

#### Scenario: Request correction for a submitted record
- **WHEN** an authorized user requests a correction for an attendance record and provides the old and new statuses with a reason
- **THEN** the system SHALL create a pending correction request linked to the attendance record
- **AND** the system SHALL keep the official attendance value unchanged until approval

#### Scenario: Approve a pending correction
- **WHEN** an authorized approver approves a pending correction
- **THEN** the system SHALL apply the new attendance status to the record
- **AND** the system SHALL write the old value, new value, approver, and timestamp to audit history

#### Scenario: Reject a pending correction
- **WHEN** an authorized approver rejects a pending correction
- **THEN** the system SHALL preserve the original attendance record status
- **AND** the correction SHALL transition to rejected status with a rejection reason

### Requirement: Attendance percentage evidence and low attendance detection
The system SHALL calculate attendance percentage evidence from official attendance records and SHALL detect low-attendance risk based on configured thresholds.

#### Scenario: Calculate official attendance percentage
- **WHEN** the system calculates attendance evidence for an enrollment
- **THEN** it SHALL use submitted, approved, or otherwise official attendance records only
- **AND** it SHALL exclude draft, deleted, and cancelled session data

#### Scenario: Detect low attendance risk
- **WHEN** an attendance percentage falls below the configured threshold for the course or rule scope
- **THEN** the system SHALL create or update a low-attendance alert
- **AND** the alert SHALL be branch-scoped and auditable

### Requirement: Attendance reporting and export
The system SHALL provide branch-scoped attendance reports and exports for sessions, batches, students, trainers, low-attendance cases, and correction aging.

#### Scenario: Generate branch-scoped attendance report
- **WHEN** an authorized user requests an attendance report for their branch
- **THEN** the system SHALL return only records within the allowed branch scope
- **AND** the report SHALL include attendance counts, status breakdowns, and generated-at metadata

#### Scenario: Export attendance data with audit trail
- **WHEN** a user exports attendance data
- **THEN** the system SHALL create an export audit entry that records the actor, branch scope, report type, filters, and row count

### Requirement: Attendance audit, soft delete, and localization
The system SHALL soft-delete attendance-owned operational records and SHALL audit sensitive actions while rendering attendance dates in Oman GST and supporting English and Arabic display.

#### Scenario: Soft delete preserves history
- **WHEN** an authorized user deletes an attendance-owned operational record
- **THEN** the system SHALL mark the record as deleted rather than physically removing it
- **AND** the system SHALL preserve audit history for the record

#### Scenario: Render attendance date in Oman time
- **WHEN** attendance data is displayed in the UI or exported for operational users
- **THEN** the system SHALL render business dates using Oman GST / UTC+4 conventions
- **AND** Arabic views SHALL support RTL layout
