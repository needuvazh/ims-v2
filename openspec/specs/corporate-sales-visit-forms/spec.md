# corporate-sales-visit-forms Specification

## Purpose
TBD - created by archiving change add-corporate-sales-visit-forms. Update Purpose after archive.
## Requirements
### Requirement: corporate-sales-visit-forms-ui
- The lead details page MUST provide modal forms to log visits and follow-ups.
- Form submissions MUST invoke the respective server actions and revalidate the page.

#### Scenario: Submitting a valid visit log from UI
- GIVEN the user is on the lead details screen
- WHEN they enter valid visit details and click Submit
- THEN the modal MUST close, the server action is triggered, and the page reloads with the new log displayed.

