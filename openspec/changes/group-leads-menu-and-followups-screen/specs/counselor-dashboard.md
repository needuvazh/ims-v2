## ADDED Requirements

### Requirement: crm.counselor_dashboard.view_metrics
The system MUST retrieve counselor-specific metrics for the active logged-in counselor. These metrics are: my active leads, my conversions, my conversion rate, my today's follow-ups, and my overdue follow-ups.

#### Scenario: Fetch Counselor Dashboard Metrics
- **WHEN** A logged-in counselor requests the Counselor Dashboard page at `/leads/counselor-dashboard`.
- **THEN** The system MUST retrieve metrics filtered by the user's `counselorId` and current session `activeBranchId`.
- **AND** The active leads metric MUST count all assigned leads where the stage is `New` or `FollowUp` and `isDeleted` is false.
- **AND** The conversions metric MUST count all assigned leads where the stage is `Converted` and `isDeleted` is false.
- **AND** The today's follow-ups metric MUST count all scheduled/overdue follow-ups assigned to the counselor for today.
- **AND** The overdue follow-ups metric MUST count all scheduled/overdue follow-ups assigned to the counselor with a date prior to today.

### Requirement: crm.counselor_dashboard.personal_funnel_charts
The system MUST generate charts showcasing the counselor's personal stage distribution (pipeline funnel) and lead acquisition source distribution.

#### Scenario: Display Personal Funnel and Source Charts
- **WHEN** The Counselor Dashboard renders on the client.
- **THEN** It MUST display a `LeadsByStageChart` displaying the counselor's leads grouped by stage.
- **AND** It MUST display a `LeadsBySourceChart` grouping the counselor's leads by acquisition source.
- **AND** All data MUST be scoped to the active user's counselor ID and active branch.
