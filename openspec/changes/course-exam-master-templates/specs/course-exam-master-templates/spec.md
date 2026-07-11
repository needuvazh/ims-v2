## ADDED Requirements

### Requirement: Course Exam Master CRUD Validation
The system MUST allow administrators with `course.catalog.update` permissions to create, read, update, and soft-delete exam templates at the Course Catalog level. Max marks must be positive and passing marks must be less than or equal to max marks.

#### Scenario: Creating a course exam template with invalid marks
- **WHEN** an administrator attempts to create a template with `maxMarks: 100` and `passMarks: 120`.
- **THEN** the system MUST reject the creation with a validation error indicating that passing marks cannot exceed maximum marks.

#### Scenario: Creating a course exam template with valid marks
- **WHEN** an administrator attempts to create a template with `examName: "Theory Mid-term"`, `maxMarks: 50`, and `passMarks: 20`.
- **THEN** the system MUST save the template in the database with status `Active` and log an audit trail entry.

### Requirement: Published Course Template Lock
Course Exam templates belonging to a course in `Published` status MUST NOT be editable if there are active batch cohorts in progress for that course, unless the catalog is reverted to `Draft` or updated via an authorized administrative override.

#### Scenario: Attempting to edit a template on a published course
- **WHEN** a user attempts to update a `CourseExamTemplate` on a course whose status is `Published` and has active batches.
- **THEN** the system MUST reject the request with a configuration lock error.
