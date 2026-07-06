## MODIFIED Requirements

### Requirement: Enrollment Completion Status Sync (FR-ENR-008)
The system SHALL update Enrollment completion outcome when Module 10's CourseCompletion is approved. The sync SHALL be event-driven via the transactional outbox. Module 10 SHALL NOT directly mutate Enrollment repository.

#### Scenario: Event-driven enrollment completion sync
- **WHEN** CourseCompletion is approved for an Enrollment
- **AND** Module 10 emits EnrollmentCompletionSynced event to outbox
- **THEN** the Admission & Enrollment context SHALL process the event
- **AND** update the Enrollment completion outcome
- **AND** Module 10 SHALL NOT directly update Enrollment table
