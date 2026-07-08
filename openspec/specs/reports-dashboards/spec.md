# reports-dashboards Specification

## Purpose

TBD - created by syncing change module-04-admission-enrollment. Update Purpose after archive.

## Requirements

## ADDED Requirements

### Requirement: Attendance reporting and dashboards

The system SHALL expose attendance dashboards and reports for session completion, marking compliance, attendance percentage, low-attendance risk, correction aging, and trainer submission timeliness with branch-scoped filtering.

#### Scenario: Attendance dashboard opens with branch scope

- **WHEN** an authorized user opens the attendance dashboard
- **THEN** the system SHALL display only metrics for the user's permitted branch scope

#### Scenario: Attendance report export preserves branch scope

- **WHEN** an authorized user exports an attendance report
- **THEN** the export SHALL include the branch scope and report filters used to generate it

### Requirement: Module 04 Reporting Dashboard Overview

The system SHALL provide a Module 04 reporting and dashboard surface that summarizes student, admission, enrollment, batch, and ID card activity.

#### Scenario: Open the Module 04 dashboard

- **WHEN** an authorized user opens the admissions and enrollment reporting area
- **THEN** the system SHALL display dashboard widgets for admissions created, enrollments approved/confirmed, batch fill rate, waitlist counts, and ID card status.

#### Scenario: Restrict dashboard data by branch scope

- **WHEN** a branch-scoped user opens the dashboard
- **THEN** the system SHALL limit data to the active branch unless the user has explicit global reporting permission.

---

### Requirement: Student, Admission, and Enrollment KPI Reporting

The system SHALL expose KPI views for the core lifecycle objects so operations teams can track the learner pipeline.

#### Scenario: Show student lifecycle KPIs

- **WHEN** the student reporting view loads
- **THEN** the system SHALL show active profiles, suspended profiles, pending verification count, and profile completion indicators.

#### Scenario: Show admission lifecycle KPIs

- **WHEN** the admission reporting view loads
- **THEN** the system SHALL show draft, submitted, approved, and rejected admission counts.

#### Scenario: Show enrollment lifecycle KPIs

- **WHEN** the enrollment reporting view loads
- **THEN** the system SHALL show draft, submitted, approved, confirmed, active, cancelled, dropped, and certificate-issued counts.

---

### Requirement: Batch Roster and Capacity Reporting

The system SHALL expose batch roster and capacity views for training operations and registrar review.

#### Scenario: Show batch roster counts

- **WHEN** a batch reporting view loads
- **THEN** the system SHALL show roster counts, batch fill rate, and linked student counts by batch.

#### Scenario: Show waitlist and promotion status

- **WHEN** the batch report is opened for a batch with waitlist activity
- **THEN** the system SHALL show the waitlist queue count, promotion count, and promoted reservation status.

---

### Requirement: ID Card and Identity Provisioning Reporting

The system SHALL expose ID card generation and issuance status as part of the Module 04 reporting surface.

#### Scenario: Show ID card generation metrics

- **WHEN** the ID card report loads
- **THEN** the system SHALL show pending, generated, issued, expired, and reissued card counts plus generation latency.

#### Scenario: Show dashboard links to ID card actions

- **WHEN** the user has permission to manage identity provisioning
- **THEN** the system SHALL provide navigation to student profile and ID card management screens.

### Requirement: Module 09 trainer operational reporting

The system SHALL expose trainer operational dashboards and reports for trainer roster, authorization coverage, availability coverage, utilization reference, qualification compliance, and compensation configuration coverage within authorized branch scope.

#### Scenario: Open trainer dashboard in branch scope

- **WHEN** an authorized user opens the trainer dashboard
- **THEN** the system SHALL display metrics only for the user's permitted branch scope

#### Scenario: Trainer report includes operational KPIs

- **WHEN** an authorized user opens a trainer operational report
- **THEN** the report SHALL include the documented trainer KPI set for the selected date range

### Requirement: Module 09 report export safety

The system SHALL export trainer report data only within authorized branch scope and SHALL redact compensation fields unless compensation permission is present.

#### Scenario: Export preserves filters and branch scope

- **WHEN** an authorized user exports a trainer report
- **THEN** the export SHALL preserve the branch scope and report filters used to generate it

#### Scenario: Compensation data is redacted from unauthorized exports

- **WHEN** a user exports trainer data without compensation permission
- **THEN** the export SHALL omit compensation amounts and rate details

### Requirement: Module 09 bilingual report presentation

The system SHALL render user-facing trainer dashboards and reports in English and Arabic labels where localized values exist.

#### Scenario: Report renders localized labels

- **WHEN** a user switches report language between English and Arabic
- **THEN** the trainer report SHALL render supported labels in the selected language
