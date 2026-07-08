## ADDED Requirements

### Requirement: Lead to Admission Handoff

The system SHALL allow CRM to hand off an existing qualified lead into the Admission & Enrollment workflow without creating a separate learner lifecycle.

#### Scenario: Convert qualified lead into admission

- **WHEN** a qualified lead is converted from the CRM screen
- **THEN** the system SHALL create or reuse the linked person record, create the student profile, create the admission record, and return the admission reference.

#### Scenario: Prevent duplicate learner creation during handoff

- **WHEN** a lead conversion request finds an existing person and student profile for the same contact identity
- **THEN** the system SHALL reuse the existing records instead of creating duplicates.

#### Scenario: Reject conversion if active admission exists

- **WHEN** a lead conversion is initiated for a student who already has an active admission in the target branch
- **THEN** the system SHALL reject the conversion and throw an "ERR_ADM_ACTIVE_ADMISSION_EXISTS" error.

---

### Requirement: Lead Handoff Side Effects

The system SHALL cancel outstanding follow-ups and publish lifecycle events when the lead handoff succeeds.

#### Scenario: Cancel outstanding follow-ups on success

- **WHEN** the lead handoff completes successfully
- **THEN** the system SHALL cancel remaining scheduled follow-ups for that lead.

#### Scenario: Publish admission handoff events

- **WHEN** the handoff creates the admission and student profile successfully
- **THEN** the system SHALL publish the following events to the transactional outbox:
  | Event Type | Aggregate Type | Required Payload Fields |
  | --- | --- | --- |
  | LeadWon | Lead | leadId, leadNumber |
  | LeadConverted | Lead | leadId, leadNumber, studentEmail |
  | AdmissionCreated | Admission | admissionId, admissionNumber, studentProfileId, personId, branchId, leadId, courseId |
  | StudentProfileCreated | StudentProfile | studentProfileId, studentNumber, personId, status, joinedAt |

#### Scenario: Preserve transaction atomicity

- **WHEN** the handoff succeeds or fails
- **THEN** the system SHALL commit or rollback lead conversion, document registration, follow-up cancellation, admission creation, and outbox writes in a single transaction.
