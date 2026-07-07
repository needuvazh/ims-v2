# faculty-trainer-management Specification

## Purpose
This specification defines Module 09 - Faculty / Trainer Management. It covers trainer master data, qualifications, availability, course authorization, compensation rates, assignment eligibility, and permission-sensitive trainer operations for the ASTI admin portal.

## Requirements

### Requirement: Trainer profile lifecycle
The system SHALL create, view, update, and status-manage trainer profiles linked to canonical Person data, and it SHALL prevent duplicate active trainer profiles for the same Person.

#### Scenario: Create a trainer profile linked to a Person
- **WHEN** an authorized user creates a trainer profile with a valid Person reference and branch
- **THEN** the system SHALL create exactly one trainer profile for that Person
- **AND** the trainer profile SHALL store only trainer-owned fields

#### Scenario: Reject duplicate trainer profile
- **WHEN** a second non-deleted trainer profile is created for the same Person
- **THEN** the system SHALL reject the request with a duplicate profile error

#### Scenario: Reject Person-owned field mutation
- **WHEN** a trainer profile request includes Person-owned identity fields
- **THEN** the system SHALL reject the request as a field-ownership violation

### Requirement: Trainer qualification records
The system SHALL allow trainer qualifications to be created, updated, listed, and soft-deleted, and it SHALL allow qualifications to reference Document Management evidence without mutating document verification state.

#### Scenario: Add a qualification with evidence
- **WHEN** an authorized user creates a qualification with a valid document reference
- **THEN** the system SHALL store the qualification and the evidence reference
- **AND** the system SHALL NOT change the document verification status

#### Scenario: Reject future qualification year
- **WHEN** a qualification is submitted with a completion year after the current Oman business year
- **THEN** the system SHALL reject the request with a validation error

#### Scenario: Soft delete qualification
- **WHEN** an authorized user soft-deletes a qualification
- **THEN** the system SHALL exclude it from normal reads while preserving audit history

### Requirement: Trainer availability windows
The system SHALL manage branch-scoped recurring trainer availability windows with effective dating and overlap validation.

#### Scenario: Create a valid availability window
- **WHEN** an authorized user creates a recurring availability window with valid time order and no overlap
- **THEN** the system SHALL persist the availability window

#### Scenario: Reject overlapping availability
- **WHEN** a new availability window overlaps an active effective window for the same trainer and day
- **THEN** the system SHALL reject the request with an overlap error

#### Scenario: Validate availability for scheduling
- **WHEN** a trusted scheduling caller validates a proposed time interval
- **THEN** the system SHALL return whether the trainer is available without mutating availability records

### Requirement: Trainer course authorization lifecycle
The system SHALL create and transition effective-dated trainer-course authorizations, and it SHALL prevent overlapping active authorizations for the same trainer and course.

#### Scenario: Create a course authorization
- **WHEN** an authorized user creates a course authorization for an existing course
- **THEN** the system SHALL persist the authorization without mutating the Course record

#### Scenario: Reject overlapping authorization
- **WHEN** a second active authorization overlaps the existing effective period for the same trainer and course
- **THEN** the system SHALL reject the request with an overlap error

#### Scenario: Expired authorization is not effective
- **WHEN** trainer eligibility is evaluated after the authorization end date
- **THEN** the system SHALL treat the authorization as ineffective

### Requirement: Trainer eligibility and assignment validation
The system SHALL evaluate trainer eligibility for course, branch, and time-based assignment requests using trainer status, effective dates, authorization, and availability, while leaving assignment ownership in Scheduling and Training Delivery.

#### Scenario: Eligible trainer is returned
- **WHEN** a trainer is active, effective, authorized for the course, and available for the requested interval
- **THEN** the system SHALL return the trainer as eligible

#### Scenario: Ineligible trainer is excluded
- **WHEN** a trainer fails any eligibility condition
- **THEN** the system SHALL exclude the trainer from eligibility results

#### Scenario: Assignment validation reports a business reason
- **WHEN** Training Delivery validates a trainer assignment and the trainer is unavailable
- **THEN** the system SHALL return an ineligibility result without creating the assignment

### Requirement: Trainer compensation rate configuration
The system SHALL allow effective-dated trainer compensation rates to be created, updated, resolved, and redacted according to explicit compensation permissions.

#### Scenario: Create a supported compensation rate
- **WHEN** an authorized user creates a rate using a supported payment basis and positive amount
- **THEN** the system SHALL persist the rate

#### Scenario: Resolve the most specific rate
- **WHEN** the system resolves compensation for a trainer with session, batch, and trainer-level candidate rates
- **THEN** the system SHALL return the most specific effective rate

#### Scenario: Hide compensation data without permission
- **WHEN** a user reads trainer data without compensation permission
- **THEN** the system SHALL omit compensation amounts and rate details from the response

### Requirement: Assignment references and audit history
The system SHALL expose read-only assignment references and immutable audit history for trainer-owned records subject to explicit permissions.

#### Scenario: Read assignment references
- **WHEN** an authorized user views a trainer profile
- **THEN** the system SHALL display read-only batch and session assignment references

#### Scenario: Read audit history
- **WHEN** an authorized user opens trainer audit history
- **THEN** the system SHALL show immutable sensitive change entries for trainer-owned records
