# delta-spec: Attendance UI/UX and Reporting Enhancements

This delta spec modifies the behavior of the `attendance-management` spec.

## ADDED Requirements

### Requirement: Interactive Attendance Dashboard Metrics and Widgets

The system SHALL render a dynamic, branch-scoped operational dashboard to replace the static cards of the attendance landing page.

#### Scenario: Display dynamic stats on the dashboard
- **WHEN** an authorized user views the attendance dashboard page
- **THEN** the system SHALL compute and display:
  - **Active Sessions Today**: Count of `AttendanceSession` rows for the user's active branch where `attendanceDate` is equal to today's date.
  - **Marking Completion Rate**: Percentage of today's sessions that have been transitioned to `Submitted` or `Locked` status.
  - **Pending Corrections**: Count of pending correction requests for that branch.
  - **At-Risk Students**: Count of students in the branch with overall attendance percentage below 75%.

#### Scenario: Render interactive widgets for immediate actions
- **WHEN** the dashboard is loaded
- **THEN** the system SHALL display:
  - **Today's Schedule**: List of sessions scheduled for today with a link to mark attendance directly.
  - **Recent Pending Corrections**: List of pending correction requests with Approve/Reject actions (for authorized roles).
  - **Operational Shortcuts**: Quick links to Sessions, Review Corrections, and Reports.

---

### Requirement: Grouped Sessions and Consolidated Roster Marking

The system SHALL organize delivery sessions into distinct timeframes and merge the roster editor directly into the sessions path, eliminating the separate flat records list.

#### Scenario: Display grouped sessions in tabs
- **WHEN** the user views the sessions list screen (without selecting a session)
- **THEN** the system SHALL render tabs to filter sessions by time:
  - **Active (Today)**: Sessions where `attendanceDate` equals the local business date.
  - **Past Sessions**: Sessions where `attendanceDate` is before the local business date.
  - **Future Sessions**: Sessions where `attendanceDate` is after the local business date.
  - **All Sessions**: Complete list.
- **AND** the system SHALL display count badges next to each tab title.

#### Scenario: In-place roster editor rendering
- **WHEN** the user selects a session from the list or navigates to `/attendance/sessions?sessionId={id}`
- **THEN** the system SHALL display the `AttendanceRosterEditor` directly on `/attendance/sessions`
- **AND** the page header SHALL include a back-arrow button returning the user to `/attendance/sessions` (without the query parameter).

#### Scenario: Remove redundant records menu item
- **WHEN** resolving the admin portal sidebar navigation
- **THEN** the system SHALL exclude the `/attendance/records` link from the sidebar menu to prevent redundant list views.

---

### Requirement: Structured Review Queue for Corrections

The system SHALL partition correction requests into status-based queues to optimize administrative workflows.

#### Scenario: Review queue tabs
- **WHEN** an authorized reviewer loads the corrections page
- **THEN** the system SHALL display a list filtered by status tabs:
  - **Pending Reviews** (default view, displaying corrections with status `Pending`)
  - **Approved History** (corrections with status `Approved`)
  - **Rejected History** (corrections with status `Rejected`)
  - **All History** (chronological list of all correction requests)

---

### Requirement: Readable and Filterable Reporting Dashboard

The system SHALL display human-readable labels instead of raw database UUIDs and support interactive batch filtering with attendance roster analytics.

#### Scenario: Resolve database entity identifiers to human-readable names
- **WHEN** rendering attendance reports and tables
- **THEN** the system SHALL join records with other tables to display:
  - **Student Name** and **Student Number** (from `StudentProfile` and `Person` tables) instead of `studentProfileId` UUID.
  - **Batch Code** (from `Batch` table) instead of `batchId` UUID.
  - **Course Name** (from `Course` table) instead of `courseId` UUID.

#### Scenario: Filter reports by batch and view student roster matrix
- **WHEN** a user selects a Batch filter on the reports screen
- **THEN** the system SHALL display a detailed roster report table of all enrolled students in the batch with their counts (Present, Late, Excused, Absent) and overall attendance percentage
- **AND** the system SHALL render a visual session-by-session grid showing status codes (P/A/L/E) for the latest delivery sessions in that batch.
