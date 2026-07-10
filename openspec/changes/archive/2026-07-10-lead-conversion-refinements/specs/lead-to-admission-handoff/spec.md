## ADDED Requirements

### Requirement: Persist Converted Admission Reference on Lead
The lead-to-student handoff conversion process MUST store the admission number of the resulting student profile directly on the converted Lead record.

#### Scenario: Verify Admission Linkage for Existing Student
- **WHEN** a counselor converts a lead for a student who already has an active student profile and admission record
- **THEN** the orchestrator MUST reuse the existing Student Profile and Admission, and update the Lead record's `admissionNumber` field with the reused student's admission number.
- **AND** the Lead details view MUST query and display the reused student's admission details.

### Requirement: Skip Billing / Pricing on Waitlist Mode
When a lead is converted without selecting a class batch, the system enters waitlist mode. The UI MUST skip billing setup and show OMR 0.000 for pricing.

#### Scenario: Converted Without Batch
- **WHEN** a lead is converted without selecting a batch
- **THEN** the system MUST create the draft enrollment with no batch assigned.
- **AND** the UI MUST hide discounts and manual pricing input controls.
