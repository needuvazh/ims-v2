## ADDED Requirements

### Requirement: Module 04 Reports Index

The system SHALL provide a Module 04 reports index page that links to the student, enrollment, batch roster, and ID card report pages.

#### Scenario: Open the Module 04 reports index

- **WHEN** an authorized user opens the Module 04 reports area
- **THEN** the system SHALL display navigation cards for the available Module 04 report pages.

#### Scenario: Respect permission and branch scope

- **WHEN** a branch-scoped user opens the reports index
- **THEN** the system SHALL only show reports for the accessible branch scope.

---

### Requirement: Student Report Page

The system SHALL provide a dedicated student report page for tracking student profile health and identity readiness.

#### Scenario: Show student report KPIs

- **WHEN** the student report page loads
- **THEN** the system SHALL show active, suspended, and inactive student profile counts.

#### Scenario: Show student identity readiness

- **WHEN** the student report page loads
- **THEN** the system SHALL show profile completion, ID-card-issued, and pending-verification indicators.

---

### Requirement: Enrollment Report Page

The system SHALL provide a dedicated enrollment report page for tracking enrollment lifecycle status.

#### Scenario: Show enrollment lifecycle counts

- **WHEN** the enrollment report page loads
- **THEN** the system SHALL show draft, submitted, approved, confirmed, active, completed, cancelled, and dropped counts.

#### Scenario: Show pricing and payment readiness

- **WHEN** the enrollment report page loads
- **THEN** the system SHALL expose pricing source and payment-validation indicators relevant to enrollment operations.

---

### Requirement: Batch Roster and Fill-Rate Report Page

The system SHALL provide a batch roster report page that focuses on capacity and waitlist utilization.

#### Scenario: Show batch fill rate

- **WHEN** the batch roster report loads
- **THEN** the system SHALL display each batch's capacity, current enrollment count, and fill rate.

#### Scenario: Show waitlist pressure

- **WHEN** the batch roster report loads
- **THEN** the system SHALL show waiting and promoted waitlist counts for each batch.

---

### Requirement: ID Card Report Page

The system SHALL provide an ID card report page that tracks student identity card issuance readiness.

#### Scenario: Show ID card issuance metrics

- **WHEN** the ID card report loads
- **THEN** the system SHALL show issued, pending, expired, and reissued student ID card counts.

#### Scenario: Show ID card exceptions

- **WHEN** the ID card report loads
- **THEN** the system SHALL surface students with active profiles but missing ID card numbers.
