## ADDED Requirements

### Requirement: Batch Workspace Exam Requirement Checklist
The batch details workspace MUST display all exam templates defined at the course level. The interface must distinguish between scheduled and unscheduled templates.

#### Scenario: Rendering the batch details screen with pending exams
- **WHEN** a coordinator views a batch detail page for a course that has 2 exam templates defined.
- **THEN** the system MUST display both templates in the "Exams" tab, listing their names, max marks, and pass marks, and show scheduling status for each.

### Requirement: Template Default Auto-Population
When scheduling an exam for a batch using a template, the system MUST prefill the `examName`, `maxMarks`, and `passMarks` automatically from the template definition.

#### Scenario: Instantiating a batch exam from a template
- **WHEN** a coordinator clicks "Schedule Exam" for a template and selects `examDate: "2026-08-20"`.
- **THEN** the system MUST invoke the `CreateExamCommandHandler` passing the template's details, save the `Exam` instance, and link it via `courseExamTemplateId`.

### Requirement: Inline Rescheduling
The batch details workspace MUST allow a coordinator with `exam.update` permissions to change the scheduled date of a batch exam inline.

#### Scenario: Updating an exam date from the batch details view
- **WHEN** a coordinator edits the exam date field to a new future date and saves.
- **THEN** the system MUST call the `UpdateExamCommandHandler` to reschedule the exam date and refresh the view.
