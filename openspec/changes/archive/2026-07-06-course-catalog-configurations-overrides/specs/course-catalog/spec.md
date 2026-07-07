## ADDED Requirements

### Requirement: Course Configurations Pagination & Search (FR-CRS-006)
The system SHALL support server-side pagination, sorting, status filtering, and query-based searching for course fee structure overrides, discount segments, and graduation completion rules.

#### Scenario: Successfully query paginated list of configs overrides
- **WHEN** a client requests a list of course overrides with `page`, `limit`, `status`, and `sortBy` sorting attributes
- **THEN** the system SHALL return the matching page segment along with the total count metadata in the response.

---

### Requirement: Rules Override Status Deactivation (FR-CRS-007)
The system SHALL support disabling active course fee structure overrides, discount segments, and graduation completion rules, shifting their status to `Inactive` and logging the action.

#### Scenario: Disable completion rules version
- **WHEN** an administrator requests to deactivate a graduation completion rules version
- **THEN** the system SHALL mark the rule status as `Inactive` in the database and write an audit event with old and new values.
