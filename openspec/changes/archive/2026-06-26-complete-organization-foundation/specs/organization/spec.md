## ADDED Requirements

### Requirement: Classroom Lifecycle Management
The system SHALL support creating, updating, retrieving, and soft-deleting classrooms under branches, enforcing capacity rules.

#### Scenario: Classroom creation with valid parameters
- **WHEN** a classroom creation is requested with unique name within a branch, capacity > 0, and valid branch ID
- **THEN** the system SHALL persist the classroom record, set status to `Active` (or `Draft` if specified), record a `ClassroomCreated` audit log, and return the created classroom details

#### Scenario: Classroom creation fails due to duplicate name
- **WHEN** a classroom creation is requested with a name that already exists within the same branch
- **THEN** the system SHALL reject the creation and throw a `ClassroomNameAlreadyExists` DomainError

#### Scenario: Classroom creation fails due to invalid capacity
- **WHEN** a classroom creation is requested with capacity <= 0
- **THEN** the system SHALL reject the creation and throw field validation errors

### Requirement: Organization Effective Dating Bounds
The system SHALL enforce start and end dates for branches, departments, and classrooms, restricting operations on expired structures.

#### Scenario: Creation validation enforces chronological dates
- **WHEN** an organization entity (branch, department, classroom) is created or updated with an `effectiveEndDate` earlier than `effectiveStartDate`
- **THEN** the system SHALL reject the operation and throw an `InvalidEffectiveDateRange` DomainError (or validation error)

#### Scenario: Inactive or expired structure rejects new operations
- **WHEN** an operational workflow (admissions, enrollments, schedule creation) checks structural status
- **THEN** the system SHALL reject the transaction if the target branch, department, or classroom status is `Inactive`, `Archived`, or the current date is outside the effective date range

### Requirement: Branch Manager and Department Head Assignment
The system SHALL support reference assignments of branch managers and department heads to active IAM users, auditing changes.

#### Scenario: Assign manager to branch
- **WHEN** a branch manager assignment is updated with a valid, active user ID
- **THEN** the system SHALL save the reference, record a `BranchManagerAssigned` audit event, and audit changes

#### Scenario: Assign department head to department
- **WHEN** a department head assignment is updated with a valid, active user ID
- **THEN** the system SHALL save the reference, record a `DepartmentHeadAssigned` audit event (under event action `organization.department_head_assigned`), and audit changes

#### Scenario: Assign inactive or invalid manager/head fails
- **WHEN** a branch manager or department head assignment is attempted with a user ID that does not exist or is inactive in IAM
- **THEN** the system SHALL reject the assignment and throw a `PreconditionFailed` DomainError (or equivalent validation error)

### Requirement: Status Management and No-Deletion Policy
The system SHALL prohibit deleting structural units and manage their availability through status transitions (Draft -> Active -> Inactive -> Archived).

#### Scenario: Deletion requests are rejected
- **WHEN** a deletion is requested for a branch, department, or classroom
- **THEN** the system SHALL reject the operation and throw a `BranchCannotBeDeleted` or `ReferencedOrganizationCannotBeDeleted` DomainError

#### Scenario: Deactivating a branch cascades status update to child entities
- **WHEN** a branch's status is changed to `Inactive` or `Archived`
- **THEN** the system SHALL update all child departments and classrooms of that branch to the same status in the database inside the same transaction


### Requirement: Security Scoping and Active Resolution
The system SHALL restrict read lists and enforce status constraints at the runtime boundaries.

#### Scenario: Branch manager accesses assigned branch data only
- **WHEN** list queries for branches, departments, classrooms, or the hierarchy are executed by a non-global user
- **THEN** the system SHALL restrict the results to only include nodes within the user's active data scopes

#### Scenario: Guard rejects action under inactive branch
- **WHEN** a server action is executed under a branch that is deactivated or outside its effective date range
- **THEN** the system SHALL reject the action and throw an `InactiveBranchCannotBeUsed` DomainError

