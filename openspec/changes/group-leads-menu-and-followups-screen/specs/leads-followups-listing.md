## ADDED Requirements

### Requirement: crm.followups_listing.fetch_by_group
The system MUST provide dedicated, separate paginated endpoints to fetch lead follow-ups grouped into Today, Future, and Past categories.

#### Scenario: Fetch Today's Follow-ups
- **WHEN** A request is made to GET `/api/v1/crm/leads/follow-ups/today` with pagination query parameters.
- **THEN** The system MUST query `LeadFollowUp` records with status in `['Scheduled', 'Overdue']`, where `followUpDate` falls between the local day start (00:00:00) and local day end (23:59:59) of the current date.
- **AND** The query MUST be scoped to the counselor's assigned leads and active branch, unless the counselor has the global read all permission `crm.leads.read.all`.
- **AND** The results MUST be sorted by `followUpDate` ascending.

#### Scenario: Fetch Future Follow-ups
- **WHEN** A request is made to GET `/api/v1/crm/leads/follow-ups/future` with pagination query parameters.
- **THEN** The system MUST query `LeadFollowUp` records with status in `['Scheduled', 'Overdue']`, where `followUpDate` is after today's local day end (23:59:59).
- **AND** The query MUST be scoped to the counselor's assigned leads and active branch, unless the counselor has the global read all permission `crm.leads.read.all`.
- **AND** The results MUST be sorted by `followUpDate` ascending.

#### Scenario: Fetch Past Follow-ups
- **WHEN** A request is made to GET `/api/v1/crm/leads/follow-ups/past` with pagination query parameters.
- **THEN** The system MUST query `LeadFollowUp` records with status in `['Scheduled', 'Overdue']`, where `followUpDate` is before today's local day start (00:00:00).
- **AND** The query MUST be scoped to the counselor's assigned leads and active branch, unless the counselor has the global read all permission `crm.leads.read.all`.
- **AND** The results MUST be sorted by `followUpDate` descending.

### Requirement: crm.followups_listing.card_view_actions
The client-side follow-ups list screen MUST present follow-up tasks as cards and offer actions to view lead details and log outcomes.

#### Scenario: Click Card Action View Lead
- **WHEN** A user clicks the "View Lead" option on a follow-up card.
- **THEN** The application MUST redirect the user to the corresponding Lead Details screen at `/leads/{leadId}`.

#### Scenario: Click Card Action Log Outcome
- **WHEN** A user clicks the "Log Outcome" option on a follow-up card.
- **THEN** The application MUST display the `LogFollowUpModal` populated with the current follow-up ID and the parent lead's current version.
