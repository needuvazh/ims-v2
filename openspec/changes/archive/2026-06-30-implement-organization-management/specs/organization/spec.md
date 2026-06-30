## Requirements

### 1. Institute (Organization) Management

#### Requirement: Institute Registration & Profile
The system SHALL support creating a top-level legal entity representing the training institute, containing legal, registration, contact, address, localization, and fiscal settings.

##### Scenario: Create institute with valid data
- **GIVEN** an authenticated Super Administrator
- **WHEN** they submit a valid institute payload with a unique code, legal name, country, timezone, currency, and language
- **THEN** the system SHALL create the institute in `Draft` status and record an audit log

##### Scenario: Create institute fails on duplicate code
- **GIVEN** an institute with code `ASTI` already exists
- **WHEN** the administrator submits a new institute with code `ASTI`
- **THEN** the system SHALL reject the request with a duplicate code domain error

#### Requirement: Institute Lifecycle Management
The system SHALL control institute status transitions: `Draft` -> `Configured` -> `Active` -> `Suspended` -> `Archived`. 

##### Scenario: Activate institute
- **GIVEN** the institute profile, registered address, primary contact, localization, and fiscal settings are fully defined
- **WHEN** the administrator activates the institute
- **THEN** the status SHALL change to `Active` and record an audit log

##### Scenario: Suspend institute
- **GIVEN** an institute is in `Active` status
- **WHEN** the administrator suspends the institute
- **THEN** the status SHALL change to `Suspended`, blocking new admissions, enrollments, and invoicing, but preserving read access

---

### 2. Branch Management

#### Requirement: Branch Configuration & Manager Assignment
The system SHALL support multiple branches under the institute, with branch-scoped configs, local address, multi-contact directory, calendar settings, and working hours. It SHALL support assigning an active user as the primary branch manager.

##### Scenario: Create branch with parent and dates
- **GIVEN** an active institute exists and the parent branch `HQ` exists
- **WHEN** the administrator creates a branch with unique code `BR-MUSCAT`, parent branch `HQ`, and effective start date <= end date
- **THEN** the system SHALL create the branch in `Draft` status under `HQ` and record an audit log

##### Scenario: Create branch fails on invalid dates
- **GIVEN** an administrator inputs effective start date `2026-07-01` and end date `2026-06-30`
- **WHEN** they submit the form
- **THEN** the system SHALL block submission with an invalid date range validation error

##### Scenario: Assign branch manager
- **GIVEN** a user `USR-101` is active in the IAM module
- **AND** `USR-101` has authorized access to the branch `BR-MUSCAT`
- **WHEN** the administrator updates the branch manager for `BR-MUSCAT` to `USR-101`
- **THEN** the system SHALL persist the manager assignment and log a `branch_manager_assigned` audit entry

##### Scenario: Assign branch manager fails on inactive user
- **GIVEN** a user `USR-202` is inactive
- **WHEN** the administrator assigns `USR-202` as the branch manager
- **THEN** the system SHALL reject the assignment with a domain validation error

##### Scenario: Assign branch manager fails on cross-branch violation
- **GIVEN** a user `USR-505` is active in IAM but does NOT have branch access to `BR-MUSCAT`
- **WHEN** the administrator assigns `USR-505` as the manager of `BR-MUSCAT`
- **THEN** the system SHALL reject the assignment with a branch-scope validation error

#### Requirement: Branch Status & Dynamic Check
The system SHALL manage branch lifecycle: `Draft` -> `Configured` -> `Active` -> `UnderMaintenance` -> `Suspended` -> `Closed` -> `Archived` using a dedicated `BranchStatus` enum. The active status of child departments and classrooms SHALL be computed dynamically based on parent branch status.

##### Scenario: Suspended branch dynamically blocks classroom scheduling
- **GIVEN** a branch `BR-MUSCAT` has status `Suspended`
- **AND** a classroom `Room 101` under `BR-MUSCAT` has status `Active`
- **WHEN** a scheduler checks if `Room 101` is available for scheduling a new session
- **THEN** the system SHALL return `false`, blocking the schedule request due to the parent branch being suspended

##### Scenario: Close branch validation checks
- **GIVEN** a branch `BR-MUSCAT` has ongoing active course batches
- **WHEN** the administrator attempts to transition status to `Closed`
- **THEN** the system SHALL block the status change and display dependency validation failures (e.g., active batches must complete first)

---

### 3. Department Management

#### Requirement: Branch-Scoped Department setup
The system SHALL support creating branch-scoped departments (operational/academic divisions) with a unique code within the branch context.

##### Scenario: Create department
- **GIVEN** a branch `BR-MUSCAT` is in `Active` status
- **WHEN** the branch administrator creates a department with code `DEPT-IT` and name `IT Studies`
- **THEN** the system SHALL create the department and verify its uniqueness under `BR-MUSCAT`

##### Scenario: Create department fails under suspended branch
- **GIVEN** a branch `BR-SOHAR` is in `Suspended` status
- **WHEN** the administrator attempts to create a department under `BR-SOHAR`
- **THEN** the system SHALL reject the action with a branch inactive domain error

##### Scenario: Assign department head
- **GIVEN** an active user `USR-303` is selected
- **AND** `USR-303` is assigned to branch `BR-MUSCAT`
- **WHEN** the administrator updates the department head of an IT department under `BR-MUSCAT` to `USR-303`
- **THEN** the department head is assigned and a `department_head_assigned` audit entry is logged

---

### 4. Classroom Management

#### Requirement: Classroom Configuration & Seating Capacity
The system SHALL support registering classroom spaces under a branch, with seating capacity limits to prevent scheduling overload.

##### Scenario: Create classroom
- **GIVEN** an active branch `BR-MUSCAT`
- **WHEN** the administrator registers classroom `Room 101` with capacity `30` and location text `Building B, Floor 1`
- **THEN** the system SHALL create the classroom and verify name uniqueness within `BR-MUSCAT`

##### Scenario: Create classroom fails on non-positive capacity
- **GIVEN** an administrator enters a seating capacity of `0` or `-5`
- **WHEN** they submit the form
- **THEN** the system SHALL reject the submission with a validation error

##### Scenario: Decrease classroom capacity warning
- **GIVEN** `Room 101` has capacity `30` and a batch with size `25` is scheduled
- **WHEN** the administrator updates capacity to `20`
- **THEN** the system SHALL issue a capacity warning or prevent the update because the active enrollment exceeds the new capacity

---

### 5. Integration REST APIs

#### Requirement: Public and External Integration Endpoints
The system SHALL provide REST Route Handlers under `/api/organization/...` to support lead collection, course catalogs, and classroom availability lookups.

##### Scenario: Retrieve active classrooms via REST API
- **GIVEN** active classrooms exist under active branch `BR-MUSCAT`
- **WHEN** an external system issues a `GET /api/organization/classrooms?branchId={muscatId}&status=Active` request
- **THEN** the system SHALL return a `200 OK` response with a JSON array of active classrooms and matching schema contracts

