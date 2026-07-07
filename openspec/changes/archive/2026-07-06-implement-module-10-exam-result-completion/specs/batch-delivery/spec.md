## MODIFIED Requirements

### Requirement: Batch Completion Triggers Async Evaluation (FR-CRS-007)
When a batch is transitioned to Completed status, the system SHALL publish a BatchCompleted domain event to the outbox. Module 10 (Exam, Result & Completion Management) SHALL consume this event to trigger asynchronous completion evaluation for all enrolled students in that batch.

#### Scenario: Batch completion triggers completion evaluation
- **WHEN** a batch is transitioned to Completed status
- **AND** BatchCompleted event is published to outbox
- **THEN** Module 10 SHALL consume the event
- **AND** trigger completion evaluation for all active Enrollments in the batch
- **AND** create CourseCompletion records where not already present
