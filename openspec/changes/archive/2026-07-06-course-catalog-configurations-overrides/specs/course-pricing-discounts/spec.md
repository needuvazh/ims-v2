## ADDED Requirements

### Requirement: Course Overrides Branch Selection (FR-PRC-003)

Pricing overrides and discount segments SHALL support selecting multiple target branches during creation while removing individual batch select configurations.

#### Scenario: Bulk create pricing overrides for multiple branches

- **WHEN** a coordinator creates a pricing override selecting multiple target branches
- **THEN** the system SHALL create individual pricing override records for each selected branch and set `batchId` to `null`.
