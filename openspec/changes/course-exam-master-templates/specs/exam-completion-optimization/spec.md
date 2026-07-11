## ADDED Requirements

### Requirement: Template Pre-population in Create Exam Form
The generic Create Exam form MUST dynamically fetch and expose course exam templates when a course is selected, letting the user prefill the exam details automatically.

#### Scenario: Selecting a course with template definitions
- **WHEN** an administrator selects a course in the Create Exam form.
- **THEN** the system MUST fetch the templates for that course, render a "Select Template" dropdown, and auto-populate `examName`, `maxMarks`, and `passMarks` once selected.

### Requirement: Linking Exam to Template
The backend command handler for exam creation MUST support recording the associated `courseExamTemplateId` to maintain traceability.

#### Scenario: Creating a batch exam with template association
- **WHEN** a batch exam is created with a `courseExamTemplateId`.
- **THEN** the system MUST save the `courseExamTemplateId` in the database record.
