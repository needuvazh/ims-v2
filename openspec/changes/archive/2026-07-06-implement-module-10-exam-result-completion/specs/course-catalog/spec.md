## MODIFIED Requirements

### Requirement: CourseCompletionRule Cross-Context Read (FR-CRS-009)

The Course Catalog SHALL expose a read-only interface for CourseCompletionRule that Module 10 (Exam, Result & Completion Management) consumes during completion evaluation. Module 10 SHALL NOT mutate CourseCompletionRule.

#### Scenario: Module 10 reads CourseCompletionRule

- **WHEN** Module 10 evaluates completion for an Enrollment
- **THEN** Module 10 SHALL read the active CourseCompletionRule via the Course Catalog's read interface
- **AND** Module 10 SHALL NOT update CourseCompletionRule
- **AND** Module 10 SHALL use the rule to determine attendance, exam, payment, and manual approval requirements
