## ADDED Requirements

### Requirement: Course Catalog Navigation and Menu Scope
The Course Catalog pages and menu items SHALL be protected by the `course.catalog.menu.view` permission code.

#### Scenario: Display Course Catalog in sidebar to authorized users
- **WHEN** the portal shell resolves navigation for a user
- **THEN** the system MUST display the "Course Catalog" menu and its items (including the list and dashboard link) only if the user has the `course.catalog.menu.view` permission.
